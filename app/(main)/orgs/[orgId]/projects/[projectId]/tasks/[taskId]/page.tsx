'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTask, type TaskDetail } from '@/hooks/tasks/useTasks';
import { useUserRole } from '@/hooks/organization';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const projectId = params.projectId as string;
  const taskId = params.taskId as string;

  const { data: task, isLoading } = useTask(orgId, projectId, taskId);
  const { data: userRole, isLoading: roleLoading } = useUserRole(orgId);

  useEffect(() => {
    if (roleLoading || userRole === undefined) return;
    if (userRole === 'MEMBER') {
      router.replace(`/orgs/${orgId}/my-work`);
    }
  }, [userRole, roleLoading, orgId, router]);

  if (roleLoading || !userRole || (userRole !== 'ADMIN' && userRole !== 'MAINTAINER')) {
    return (
      <div className="space-y-4">
        <div className="text-muted-foreground">
          {roleLoading ? 'Loading...' : 'Redirecting...'}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div>Loading task...</div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="space-y-4">
        <div>Task not found</div>
        <Button asChild variant="outline">
          <Link href={`/orgs/${orgId}/projects/${projectId}/tasks`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to tasks
          </Link>
        </Button>
      </div>
    );
  }

  const detail = task as TaskDetail;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/orgs/${orgId}/projects/${projectId}/tasks`}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to tasks
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-2xl">{task.title}</CardTitle>
            <Badge variant="outline">{task.type}</Badge>
            <Badge>{task.status}</Badge>
            <Badge variant="secondary">{task.priority}</Badge>
          </div>
          {task.project && (
            <CardDescription>
              {task.project.name} ({task.project.code})
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {task.description && (
            <div>
              <h3 className="font-medium mb-1">Description</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {task.description}
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Assignee</p>
              <p className="text-sm">
                {task.assignee ? task.assignee.name || task.assignee.email : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Reviewer</p>
              <p className="text-sm">
                {task.reviewer ? task.reviewer.name || task.reviewer.email : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Deadline</p>
              <p className="text-sm">
                {task.deadlineDt
                  ? new Date(task.deadlineDt).toLocaleDateString()
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Created</p>
              <p className="text-sm">{new Date(task.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {task.startDt && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Start</p>
                <p className="text-sm">{new Date(task.startDt).toLocaleString()}</p>
              </div>
            )}
            {task.endDt && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">End</p>
                <p className="text-sm">{new Date(task.endDt).toLocaleString()}</p>
              </div>
            )}
          </div>

          {detail.parent && (
            <div>
              <h3 className="font-medium mb-1">Parent task</h3>
              <Link
                href={`/orgs/${orgId}/projects/${projectId}/tasks/${detail.parent.id}`}
                className="text-sm text-primary hover:underline"
              >
                {detail.parent.title}
              </Link>
            </div>
          )}

          {detail.children && detail.children.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">Sub-tasks</h3>
              <ul className="space-y-1">
                {detail.children.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/orgs/${orgId}/projects/${projectId}/tasks/${c.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {c.title}
                    </Link>
                    <span className="text-xs text-muted-foreground ml-2">
                      {c.status} · {c.priority}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {detail.dependencies && detail.dependencies.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">Blocked by</h3>
              <ul className="space-y-1">
                {detail.dependencies.map((d) => (
                  <li key={d.blockedByTask.id}>
                    <Link
                      href={`/orgs/${orgId}/projects/${projectId}/tasks/${d.blockedByTask.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {d.blockedByTask.title}
                    </Link>
                    <span className="text-xs text-muted-foreground ml-2">
                      {d.blockedByTask.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {detail.workLogs && detail.workLogs.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">Work logs</h3>
              <ul className="space-y-2 border rounded-md divide-y">
                {detail.workLogs.map((log) => (
                  <li key={log.id} className="p-3">
                    <div className="flex justify-between text-sm">
                      <span>
                        {log.user.name || log.user.email} ·{' '}
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                      <span className="font-medium">
                        {formatDuration(log.totalDurationMin)}
                      </span>
                    </div>
                    {log.segments && log.segments.length > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {log.segments
                          .map(
                            (s) =>
                              `${new Date(s.startDt).toLocaleTimeString()} – ${new Date(s.endDt).toLocaleTimeString()} (${s.durationMin}m)`
                          )
                          .join(', ')}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
