'use client';

import { useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { useProject, useUpdateProject } from '@/hooks/projects';
import { useUserRole } from '@/hooks/organization';
import { useProjectDocs } from '@/hooks/docs/useDocs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from '@/components/ui/use-toast';
import { Loading } from '@/components/ui/loading';
import ProjectDetailesEditor from '@/components/projects/ProjectDetailesEditor';
import type { ProjectDetailesEditorRef } from '@/components/projects/ProjectDetailesEditor';
import { MarkDownViewer } from '@/components/projects/MarkDownViewer';
import {
  Pencil, ExternalLink, Users, Link2, FileText,
  CalendarDays, DollarSign, CheckSquare, AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';

interface TaskItem {
  id: string; title: string; status: string; priority: string;
  deadlineDt?: string | null;
  assignee?: { id: string; name?: string | null; email: string } | null;
}

interface DashStats {
  taskStatusGroups: { status: string; count: number }[];
  recentTasks: TaskItem[];
  teamMembers: { id: string; name?: string | null; email: string; role: string; isVirtual: boolean }[];
  docsCount: number;
  userRole: string;
}

const STATUS_COLORS: Record<string, string> = {
  BACKLOG: 'bg-slate-200', TODO: 'bg-blue-200', IN_PROGRESS: 'bg-yellow-300',
  BLOCKED: 'bg-red-300', REVIEW: 'bg-purple-200', DONE: 'bg-green-300', ARCHIVED: 'bg-gray-100',
};

const STATUS_BADGE: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  IN_PROGRESS: 'secondary', REVIEW: 'default', BLOCKED: 'destructive',
  DONE: 'default', TODO: 'outline', BACKLOG: 'outline', ARCHIVED: 'outline',
};

const PRIORITY_BADGE: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  P0: 'destructive', P1: 'default', P2: 'secondary', P3: 'outline', P4: 'outline',
};

const STATUS_ORDER = ['IN_PROGRESS', 'REVIEW', 'BLOCKED', 'TODO', 'BACKLOG', 'DONE', 'ARCHIVED'];
const STATUS_OPTIONS = ['BACKLOG','TODO','IN_PROGRESS','BLOCKED','REVIEW','DONE','ARCHIVED'];

function InlineStatus({ task, orgId, projectId, onUpdated }: {
  task: TaskItem; orgId: string; projectId: string; onUpdated: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Select value={task.status} disabled={busy} onValueChange={async (s) => {
      if (s === task.status) return;
      setBusy(true);
      try {
        await api.patch(`/orgs/${orgId}/projects/${projectId}/tasks/${task.id}`, { status: s });
        onUpdated();
      } catch { toast({ title: 'Failed to update', variant: 'destructive' }); }
      finally { setBusy(false); }
    }}>
      <SelectTrigger className="h-auto border-0 p-0 shadow-none focus:ring-0 w-auto gap-1">
        <Badge variant={STATUS_BADGE[task.status] ?? 'outline'} className="text-xs cursor-pointer">
          {task.status.replace('_', ' ')}
        </Badge>
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export default function ProjectDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const orgId = params.orgId as string;
  const projectId = params.projectId as string;

  const { data: project, isLoading: projLoading } = useProject(orgId, projectId);
  const { data: userRole } = useUserRole(orgId);
  const { data: docs = [] } = useProjectDocs(orgId, projectId);
  const updateProject = useUpdateProject(orgId, projectId);

  const { data: stats, isLoading: statsLoading } = useQuery<DashStats>({
    queryKey: ['project-dash', orgId, projectId],
    queryFn: async () => (await api.get(`/orgs/${orgId}/projects/${projectId}/dashboard-stats`)).data,
  });

  const [isEditing, setIsEditing] = useState(false);
  const editorRef = useRef<ProjectDetailesEditorRef>(null);
  const canEdit = userRole === 'ADMIN' || userRole === 'MAINTAINER';

  const refreshTasks = () => {
    qc.invalidateQueries({ queryKey: ['project-dash', orgId, projectId] });
    qc.invalidateQueries({ queryKey: ['pending-tasks'] });
    qc.invalidateQueries({ queryKey: ['my-tasks'] });
  };

  if (projLoading || statsLoading) return <Loading fullPage />;
  if (!project) return <div className="p-4">Project not found</div>;

  const groups = (stats?.taskStatusGroups ?? []).sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
  const total = groups.reduce((s, g) => s + g.count, 0);
  const done = groups.find(g => g.status === 'DONE')?.count ?? 0;
  const overdue = (stats?.recentTasks ?? []).filter(t => t.deadlineDt && new Date(t.deadlineDt) < new Date() && t.status !== 'DONE').length;
  const links = docs.filter(d => d.type === 'LINK');

  return (
    <TooltipProvider>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <Badge variant="outline">{project.code}</Badge>
              <Badge variant={project.status === 'IN_PROGRESS' ? 'secondary' : project.status === 'COMPLETED' ? 'default' : 'outline'}>
                {project.status}
              </Badge>
            </div>
            {project.deadline && (
              <p className="text-sm text-muted-foreground mt-1">
                Deadline: {format(new Date(project.deadline), 'MMM d, yyyy')}
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => router.push(`/orgs/${orgId}/projects/${projectId}/tasks`)}>
            <CheckSquare className="h-4 w-4 mr-2" />All Tasks
          </Button>
        </div>

        {/* Stat cards */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
          <Card><CardHeader className="pb-1 pt-3 px-4"><CardDescription className="text-xs">Total Tasks</CardDescription><CardTitle className="text-2xl">{total}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-1 pt-3 px-4"><CardDescription className="text-xs">Done</CardDescription><CardTitle className="text-2xl text-green-600">{done}</CardTitle></CardHeader></Card>
          <Card className={overdue > 0 ? 'border-destructive/50' : ''}>
            <CardHeader className="pb-1 pt-3 px-4">
              <CardDescription className={`text-xs flex items-center gap-1 ${overdue > 0 ? 'text-destructive' : ''}`}>
                {overdue > 0 && <AlertCircle className="h-3 w-3" />}Overdue
              </CardDescription>
              <CardTitle className={`text-2xl ${overdue > 0 ? 'text-destructive' : ''}`}>{overdue}</CardTitle>
            </CardHeader>
          </Card>
          <Card><CardHeader className="pb-1 pt-3 px-4"><CardDescription className="text-xs">Team</CardDescription><CardTitle className="text-2xl">{stats?.teamMembers.length ?? 0}</CardTitle></CardHeader></Card>
          {project.budgetTotal ? (
            <Card><CardHeader className="pb-1 pt-3 px-4"><CardDescription className="text-xs flex items-center gap-1"><DollarSign className="h-3 w-3" />Budget</CardDescription><CardTitle className="text-lg">{project.currency} {Number(project.budgetTotal).toLocaleString()}</CardTitle></CardHeader></Card>
          ) : (
            <Card><CardHeader className="pb-1 pt-3 px-4"><CardDescription className="text-xs">Docs</CardDescription><CardTitle className="text-2xl">{stats?.docsCount ?? 0}</CardTitle></CardHeader></Card>
          )}
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <Card>
            <CardHeader className="pb-2 pt-3"><CardTitle className="text-sm font-medium">Task Progress</CardTitle></CardHeader>
            <CardContent className="pb-4">
              <div className="flex h-3 rounded-full overflow-hidden gap-px">
                {groups.filter(g => g.count > 0).map(g => (
                  <Tooltip key={g.status}>
                    <TooltipTrigger asChild>
                      <div className={`${STATUS_COLORS[g.status] ?? 'bg-gray-200'}`} style={{ width: `${(g.count / total) * 100}%` }} />
                    </TooltipTrigger>
                    <TooltipContent>{g.status.replace('_', ' ')}: {g.count}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
              <div className="flex flex-wrap gap-3 mt-2">
                {groups.filter(g => g.count > 0).map(g => (
                  <span key={g.status} className="flex items-center gap-1.5 text-xs">
                    <span className={`h-2.5 w-2.5 rounded-full ${STATUS_COLORS[g.status]}`} />
                    <span className="text-muted-foreground">{g.status.replace('_', ' ')}</span>
                    <span className="font-semibold">{g.count}</span>
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-5 lg:grid-cols-3">
          {/* Active tasks */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => router.push(`/orgs/${orgId}/projects/${projectId}/tasks`)}>
                  View all <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {(stats?.recentTasks ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No active tasks.</p>
              ) : (
                <div className="divide-y">
                  {(stats?.recentTasks ?? []).map(task => {
                    const taskRoute = canEdit
                      ? `/orgs/${orgId}/projects/${projectId}/tasks/${task.id}`
                      : `/orgs/${orgId}/my-work/${projectId}/tasks/${task.id}`;
                    const isOverdue = task.deadlineDt && new Date(task.deadlineDt) < new Date() && task.status !== 'DONE';
                    return (
                      <div key={task.id} className="flex items-center gap-2 py-2 group">
                        <Badge variant={PRIORITY_BADGE[task.priority] ?? 'outline'} className="text-xs w-7 justify-center shrink-0">{task.priority}</Badge>
                        <button className="flex-1 text-left text-sm truncate hover:underline" onClick={() => router.push(taskRoute)}>
                          {task.title}
                        </button>
                        {task.assignee && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button className="text-xs text-muted-foreground hover:text-foreground shrink-0 hidden sm:block truncate max-w-[80px]"
                                onClick={() => router.push(`/orgs/${orgId}/members/${task.assignee!.id}`)}>
                                {task.assignee.name || task.assignee.email.split('@')[0]}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>View {task.assignee.name || task.assignee.email}</TooltipContent>
                          </Tooltip>
                        )}
                        {task.deadlineDt && (
                          <span className={`text-xs shrink-0 hidden sm:block ${isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                            {format(new Date(task.deadlineDt), 'MMM d')}
                          </span>
                        )}
                        <div onClick={e => e.stopPropagation()}>
                          <InlineStatus task={task} orgId={orgId} projectId={projectId} onUpdated={refreshTasks} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right column */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-1.5"><Users className="h-4 w-4" />Team</CardTitle>
                  {canEdit && <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => router.push(`/orgs/${orgId}/projects/${projectId}/teams`)}>Manage</Button>}
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-1">
                {(stats?.teamMembers ?? []).slice(0, 7).map(m => (
                  <button key={m.id} className="flex items-center gap-2 w-full hover:bg-muted/50 rounded px-1 py-1 transition-colors text-left"
                    onClick={() => router.push(`/orgs/${orgId}/members/${m.id}`)}>
                    <div className="h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center text-xs font-semibold shrink-0">
                      {(m.name || m.email).charAt(0).toUpperCase()}
                    </div>
                    <span className="flex-1 text-sm truncate">{m.name || m.email}</span>
                    {m.isVirtual && <Badge variant="outline" className="text-xs py-0 px-1 border-amber-300 text-amber-700 shrink-0">V</Badge>}
                    <span className="text-xs text-muted-foreground shrink-0">{m.role}</span>
                  </button>
                ))}
                {(stats?.teamMembers.length ?? 0) === 0 && <p className="text-xs text-muted-foreground text-center py-2">No team members yet.</p>}
              </CardContent>
            </Card>

            {links.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-1.5"><Link2 className="h-4 w-4" />Links</CardTitle>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => router.push(`/orgs/${orgId}/projects/${projectId}/docs`)}>All docs</Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-1.5">
                  {links.slice(0, 5).map(l => (
                    <a key={l.id} href={l.url ?? '#'} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline truncate">
                      <ExternalLink className="h-3 w-3 shrink-0" />{l.title}
                    </a>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Description */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-1.5"><FileText className="h-4 w-4" />Description</CardTitle>
              {canEdit && !isEditing && <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}><Pencil className="h-3.5 w-3.5 mr-1" />Edit</Button>}
              {isEditing && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
                  <Button size="sm" onClick={() => {
                    updateProject.mutate({ description: editorRef.current?.getContent() ?? '' }, {
                      onSuccess: () => { toast({ title: 'Saved' }); setIsEditing(false); },
                      onError: () => toast({ title: 'Failed to save', variant: 'destructive' }),
                    });
                  }} disabled={updateProject.isPending}>
                    {updateProject.isPending ? 'Saving…' : 'Save'}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <ProjectDetailesEditor ref={editorRef} initialContent={project.description} />
            ) : (
              <MarkDownViewer content={project.description || '*No description yet.*'} />
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
