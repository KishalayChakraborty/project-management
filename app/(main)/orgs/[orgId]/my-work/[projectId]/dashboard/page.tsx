'use client';

import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useProject } from '@/hooks/projects';
import { useTasks, useUpdateTask, type Task } from '@/hooks/tasks/useTasks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { CheckSquare, Clock, ListTodo } from 'lucide-react';

function isOverdue(task: Task): boolean {
  if (!task.deadlineDt) return false;
  return new Date(task.deadlineDt) < new Date() && task.status !== 'DONE' && task.status !== 'ARCHIVED';
}

function MarkDoneButton({
  orgId,
  projectId,
  taskId,
}: {
  orgId: string;
  projectId: string;
  taskId: string;
}) {
  const updateTask = useUpdateTask(orgId, projectId, taskId);
  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={() => updateTask.mutate({ status: 'DONE' })}
      disabled={updateTask.isPending}
    >
      <CheckSquare className="h-4 w-4 mr-1" />
      Mark done
    </Button>
  );
}

export default function MemberDashboardPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const projectId = params.projectId as string;
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const { data: project, isLoading: projectLoading } = useProject(orgId, projectId);
  const { data: tasks, isLoading: tasksLoading } = useTasks(orgId, projectId, {
    assigneeId: userId ?? undefined,
  });

  const myTasks = tasks ?? [];
  const todoCount = myTasks.filter((t) => t.status === 'TODO' || t.status === 'BACKLOG').length;
  const inProgressCount = myTasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const doneCount = myTasks.filter((t) => t.status === 'DONE').length;
  const overdueCount = myTasks.filter(isOverdue).length;

  if (projectLoading) {
    return (
      <div className="space-y-4">
        <div>Loading...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="space-y-4">
        <div>Project not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>To Do</CardDescription>
            <CardTitle className="text-2xl">{todoCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>In Progress</CardDescription>
            <CardTitle className="text-2xl">{inProgressCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Done</CardDescription>
            <CardTitle className="text-2xl">{doneCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Overdue</CardDescription>
            <CardTitle className="text-2xl">{overdueCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick links</CardTitle>
            <CardDescription>Navigate to your work</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button asChild variant="outline">
              <Link href={`/orgs/${orgId}/my-work/${projectId}/tasks`}>
                <ListTodo className="mr-2 h-4 w-4" />
                My Tasks
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/orgs/${orgId}/my-work/${projectId}/work-logs`}>
                <Clock className="mr-2 h-4 w-4" />
                Work Logs
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My tasks</CardTitle>
          <CardDescription>Tasks assigned to you — mark complete or open full list</CardDescription>
        </CardHeader>
        <CardContent>
          {tasksLoading ? (
            <div>Loading tasks...</div>
          ) : myTasks.length === 0 ? (
            <p className="text-muted-foreground">No tasks assigned to you in this project</p>
          ) : (
            <ul className="space-y-2">
              {myTasks.slice(0, 10).map((task) => (
                <li
                  key={task.id}
                  className="flex items-center justify-between p-3 border rounded hover:bg-accent/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{task.title}</p>
                    <p className="text-sm text-muted-foreground">{task.status}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {task.status !== 'DONE' && task.status !== 'ARCHIVED' && (
                      <MarkDoneButton orgId={orgId} projectId={projectId} taskId={task.id} />
                    )}
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/orgs/${orgId}/my-work/${projectId}/tasks`}>View all</Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {myTasks.length > 10 && (
            <Button asChild variant="link" className="mt-2">
              <Link href={`/orgs/${orgId}/my-work/${projectId}/tasks`}>
                View all {myTasks.length} tasks
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
