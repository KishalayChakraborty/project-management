'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { useUserRole } from '@/hooks/organization';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Building2, Users, FolderKanban, CheckSquare, ExternalLink, ArrowRight, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface OrgStats {
  org: { id: string; name: string; legalName?: string | null; country?: string | null; contactEmail?: string | null; contactPhone?: string | null; status: string; _count: { members: number; teams: number; projects: number } };
  projects: Array<{ id: string; name: string; code: string; status: string; deadline?: string | null; _count: { tasks: number } }>;
  taskStatusGroups: { status: string; count: number }[];
  recentMembers: { id: string; name?: string | null; email: string; role: string; isVirtual: boolean; joinedAt: string }[];
  myPendingCount: number;
  userRole: string;
}

const STATUS_COLORS: Record<string, string> = {
  BACKLOG: 'bg-slate-200', TODO: 'bg-blue-200', IN_PROGRESS: 'bg-yellow-300',
  BLOCKED: 'bg-red-300', REVIEW: 'bg-purple-200', DONE: 'bg-green-300', ARCHIVED: 'bg-gray-100',
};
const STATUS_ORDER = ['IN_PROGRESS','REVIEW','BLOCKED','TODO','BACKLOG','DONE','ARCHIVED'];
const PROJECT_BADGE: Record<string, 'default'|'secondary'|'destructive'|'outline'> = {
  IN_PROGRESS: 'secondary', COMPLETED: 'default', HOLD: 'destructive', PLANNED: 'outline', CANCELLED: 'outline',
};

export default function OverviewPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const { data: userRole, isLoading: roleLoading } = useUserRole(orgId);
  const { data: stats, isLoading } = useQuery<OrgStats>({
    queryKey: ['org-overview', orgId],
    queryFn: async () => (await api.get(`/orgs/${orgId}/overview-stats`)).data,
    enabled: !!orgId,
  });

  useEffect(() => {
    if (!roleLoading && userRole === 'MEMBER') router.replace(`/orgs/${orgId}/my-work`);
  }, [userRole, roleLoading, orgId, router]);

  if (roleLoading || isLoading) return <Loading fullPage />;
  if (!stats) return <div className="p-4">Organisation not found</div>;
  if (userRole === 'MEMBER') return <div>Redirecting…</div>;

  const { org, projects, taskStatusGroups, recentMembers, myPendingCount } = stats;
  const groups = taskStatusGroups.sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
  const totalTasks = groups.reduce((s, g) => s + g.count, 0);
  const doneTasks = groups.find(g => g.status === 'DONE')?.count ?? 0;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-3xl font-bold">{org.name}</h1>
            <Badge variant={org.status === 'ACTIVE' ? 'default' : 'outline'}>{org.status}</Badge>
          </div>
          {org.legalName && <p className="text-muted-foreground text-sm">{org.legalName}</p>}
        </div>

        {/* Stat cards */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
          <Card><CardHeader className="pb-1 pt-3 px-4"><CardDescription className="text-xs flex items-center gap-1"><Users className="h-3 w-3"/>Members</CardDescription><CardTitle className="text-2xl">{org._count.members}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-1 pt-3 px-4"><CardDescription className="text-xs flex items-center gap-1"><FolderKanban className="h-3 w-3"/>Projects</CardDescription><CardTitle className="text-2xl">{org._count.projects}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-1 pt-3 px-4"><CardDescription className="text-xs flex items-center gap-1"><CheckSquare className="h-3 w-3"/>Total Tasks</CardDescription><CardTitle className="text-2xl">{totalTasks}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-1 pt-3 px-4"><CardDescription className="text-xs">Done</CardDescription><CardTitle className="text-2xl text-green-600">{doneTasks}</CardTitle></CardHeader></Card>
          {myPendingCount > 0 && (
            <Card className="border-amber-300/60 cursor-pointer" onClick={() => router.push('/my-tasks')}>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardDescription className="text-xs flex items-center gap-1 text-amber-600"><AlertCircle className="h-3 w-3"/>My Pending</CardDescription>
                <CardTitle className="text-2xl text-amber-600">{myPendingCount}</CardTitle>
              </CardHeader>
            </Card>
          )}
        </div>

        {/* Task progress bar */}
        {totalTasks > 0 && (
          <Card>
            <CardHeader className="pb-2 pt-3"><CardTitle className="text-sm font-medium">Task Distribution</CardTitle></CardHeader>
            <CardContent className="pb-4">
              <div className="flex h-3 rounded-full overflow-hidden gap-px">
                {groups.filter(g => g.count > 0).map(g => (
                  <Tooltip key={g.status}>
                    <TooltipTrigger asChild>
                      <div className={`${STATUS_COLORS[g.status]??'bg-gray-200'}`} style={{width:`${(g.count/totalTasks)*100}%`}}/>
                    </TooltipTrigger>
                    <TooltipContent>{g.status.replace('_',' ')}: {g.count}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
              <div className="flex flex-wrap gap-3 mt-2">
                {groups.filter(g => g.count > 0).map(g => (
                  <span key={g.status} className="flex items-center gap-1.5 text-xs">
                    <span className={`h-2.5 w-2.5 rounded-full ${STATUS_COLORS[g.status]}`}/>
                    <span className="text-muted-foreground">{g.status.replace('_',' ')}</span>
                    <span className="font-semibold">{g.count}</span>
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-1.5"><FolderKanban className="h-4 w-4"/>Projects</CardTitle>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={()=>router.push(`/orgs/${orgId}/projects`)}>All <ArrowRight className="h-3 w-3 ml-1"/></Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {projects.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">No projects yet.</p> : (
                <div className="divide-y">
                  {projects.map(p => (
                    <div key={p.id} className="flex items-center gap-3 py-2.5 cursor-pointer group" onClick={()=>router.push(`/orgs/${orgId}/projects/${p.id}/dashboard`)}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2"><span className="font-medium text-sm">{p.name}</span><span className="text-xs text-muted-foreground">{p.code}</span></div>
                        {p.deadline && <p className="text-xs text-muted-foreground">Due {format(new Date(p.deadline),'MMM d, yyyy')}</p>}
                      </div>
                      <Badge variant={PROJECT_BADGE[p.status]??'outline'} className="text-xs shrink-0">{p.status}</Badge>
                      <span className="text-xs text-muted-foreground shrink-0">{p._count.tasks} tasks</span>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0"/>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-1.5"><Users className="h-4 w-4"/>Members</CardTitle>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={()=>router.push(`/orgs/${orgId}/members`)}>All <ArrowRight className="h-3 w-3 ml-1"/></Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-1">
                {recentMembers.map(m => (
                  <button key={m.id} className="flex items-center gap-2 w-full hover:bg-muted/50 rounded px-1 py-1 transition-colors text-left" onClick={()=>router.push(`/orgs/${orgId}/members/${m.id}`)}>
                    <div className="h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center text-xs font-semibold shrink-0">{(m.name||m.email).charAt(0).toUpperCase()}</div>
                    <span className="flex-1 text-sm truncate">{m.name||m.email}</span>
                    {m.isVirtual && <Badge variant="outline" className="text-xs py-0 px-1 border-amber-300 text-amber-700 shrink-0">V</Badge>}
                    <Badge variant="secondary" className="text-xs shrink-0">{m.role}</Badge>
                  </button>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-1.5"><Building2 className="h-4 w-4"/>Details</CardTitle></CardHeader>
              <CardContent className="pt-0 space-y-2 text-sm">
                {org.country && <div className="flex justify-between"><span className="text-muted-foreground">Country</span><span>{org.country}</span></div>}
                {org.contactEmail && <div className="flex justify-between gap-2"><span className="text-muted-foreground shrink-0">Email</span><a href={`mailto:${org.contactEmail}`} className="text-blue-600 hover:underline truncate">{org.contactEmail}</a></div>}
                {org.contactPhone && <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{org.contactPhone}</span></div>}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
