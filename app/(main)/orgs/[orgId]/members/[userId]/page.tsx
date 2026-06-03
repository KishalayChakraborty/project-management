'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { useUserRole } from '@/hooks/organization';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { Loading } from '@/components/ui/loading';
import { toast } from '@/components/ui/use-toast';
import {
  ArrowLeft, User, Mail, Phone, MapPin, Github, Linkedin,
  Briefcase, GraduationCap, ExternalLink, Link2, CheckSquare,
} from 'lucide-react';
import { format } from 'date-fns';

interface VProfile {
  phone?: string | null; whatsapp?: string | null; address?: string | null;
  githubUrl?: string | null; linkedinUrl?: string | null; dob?: string | null;
  parentOrg?: string | null; designation?: string | null; education?: string | null;
  introducedBy?: string | null;
}

interface TaskRow {
  id: string; title: string; status: string; priority: string;
  deadlineDt?: string | null;
  project: { id: string; name: string; code: string };
  assignee?: { id: string; name?: string | null; email: string } | null;
  reviewer?: { id: string; name?: string | null; email: string } | null;
}

interface UserProfile {
  id: string; name?: string | null; email: string; isVirtual: boolean;
  status: string; createdAt: string; lastLogin?: string | null;
  virtualProfile?: VProfile | null;
  orgMemberships: { role: string; joinedAt: string }[];
}

interface UserTasksData {
  user: UserProfile;
  assignedTasks: TaskRow[];
  reviewingTasks: TaskRow[];
}

const STATUS_BADGE: Record<string, 'default'|'secondary'|'destructive'|'outline'> = {
  IN_PROGRESS: 'secondary', REVIEW: 'default', BLOCKED: 'destructive',
  DONE: 'default', TODO: 'outline', BACKLOG: 'outline', ARCHIVED: 'outline',
};
const PRIORITY_BADGE: Record<string, 'default'|'secondary'|'destructive'|'outline'> = {
  P0: 'destructive', P1: 'default', P2: 'secondary', P3: 'outline', P4: 'outline',
};
const STATUS_OPTIONS = ['BACKLOG','TODO','IN_PROGRESS','BLOCKED','REVIEW','DONE','ARCHIVED'];

function InlineStatus({ task, orgId, onUpdated }: { task: TaskRow; orgId: string; onUpdated: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <Select value={task.status} disabled={busy} onValueChange={async (s) => {
      if (s === task.status) return;
      setBusy(true);
      try {
        await api.patch(`/orgs/${orgId}/projects/${task.project.id}/tasks/${task.id}`, { status: s });
        onUpdated();
      } catch { toast({ title: 'Failed to update', variant: 'destructive' }); }
      finally { setBusy(false); }
    }}>
      <SelectTrigger className="h-auto border-0 p-0 shadow-none focus:ring-0 w-auto gap-1">
        <Badge variant={STATUS_BADGE[task.status]??'outline'} className="text-xs cursor-pointer">{task.status.replace('_',' ')}</Badge>
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s.replace('_',' ')}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function TaskList({ tasks, orgId, role, label, onUpdated, router }: {
  tasks: TaskRow[]; orgId: string; role: string; label: string;
  onUpdated: () => void; router: ReturnType<typeof useRouter>;
}) {
  if (tasks.length === 0) return (
    <p className="text-sm text-muted-foreground text-center py-4">No {label.toLowerCase()} tasks.</p>
  );
  return (
    <div className="divide-y">
      {tasks.map(task => {
        const taskRoute = role === 'ADMIN' || role === 'MAINTAINER'
          ? `/orgs/${orgId}/projects/${task.project.id}/tasks/${task.id}`
          : `/orgs/${orgId}/my-work/${task.project.id}/tasks/${task.id}`;
        const isOverdue = task.deadlineDt && new Date(task.deadlineDt) < new Date() && task.status !== 'DONE';
        return (
          <div key={task.id} className="flex items-center gap-2 py-2 group">
            <Badge variant={PRIORITY_BADGE[task.priority]??'outline'} className="text-xs w-7 justify-center shrink-0">{task.priority}</Badge>
            <button className="flex-1 text-left text-sm truncate hover:underline" onClick={() => router.push(taskRoute)}>
              {task.title}
            </button>
            <span className="text-xs text-muted-foreground shrink-0 hidden sm:block truncate max-w-[80px]">{task.project.name}</span>
            {task.deadlineDt && (
              <span className={`text-xs shrink-0 hidden sm:block ${isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                {format(new Date(task.deadlineDt), 'MMM d')}
              </span>
            )}
            <div onClick={e => e.stopPropagation()}>
              <InlineStatus task={task} orgId={orgId} onUpdated={onUpdated} />
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => router.push(taskRoute)}>
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const orgId = params.orgId as string;
  const userId = params.userId as string;

  const { data: viewerRole } = useUserRole(orgId);
  const { data, isLoading } = useQuery<UserTasksData>({
    queryKey: ['user-profile', orgId, userId],
    queryFn: async () => (await api.get(`/orgs/${orgId}/members/${userId}/tasks`)).data,
    enabled: !!orgId && !!userId,
  });

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['user-profile', orgId, userId] });
    qc.invalidateQueries({ queryKey: ['pending-tasks'] });
    qc.invalidateQueries({ queryKey: ['my-tasks'] });
  }, [qc, orgId, userId]);

  if (isLoading) return <Loading fullPage />;
  if (!data) return <div className="p-4">User not found</div>;

  const { user, assignedTasks, reviewingTasks } = data;
  const membership = user.orgMemberships[0];
  const vp = user.virtualProfile;
  const active = [...assignedTasks, ...reviewingTasks].filter(t => !['DONE','ARCHIVED'].includes(t.status)).length;

  return (
    <TooltipProvider>
      <div className="space-y-5">
        {/* Back */}
        <Button variant="ghost" size="sm" className="gap-1" onClick={() => router.push(`/orgs/${orgId}/members`)}>
          <ArrowLeft className="h-4 w-4" /> Members
        </Button>

        {/* Header card */}
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-start gap-4 flex-wrap">
              <div className="h-16 w-16 rounded-full bg-primary/15 flex items-center justify-center text-2xl font-bold shrink-0">
                {(user.name || user.email).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold">{user.name || 'No name'}</h1>
                  {user.isVirtual && <Badge variant="outline" className="border-amber-300 text-amber-700">Virtual</Badge>}
                  {membership && <Badge variant="secondary">{membership.role}</Badge>}
                  <Badge variant={user.status === 'ACTIVE' ? 'default' : 'outline'}>{user.status}</Badge>
                </div>
                <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  {!user.email.includes('@placeholder.local') ? (
                    <a href={`mailto:${user.email}`} className="hover:underline">{user.email}</a>
                  ) : (
                    <span className="italic text-muted-foreground/60">No email set</span>
                  )}
                </div>
                {vp?.designation && <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{vp.designation}</p>}
                {vp?.parentOrg && <p className="text-sm text-muted-foreground flex items-center gap-1"><User className="h-3.5 w-3.5" />{vp.parentOrg}</p>}
                {membership && <p className="text-xs text-muted-foreground mt-1">Joined {format(new Date(membership.joinedAt), 'MMM d, yyyy')}</p>}
              </div>
              <div className="flex flex-col gap-2 items-end shrink-0">
                <div className="text-right">
                  <p className="text-2xl font-bold">{active}</p>
                  <p className="text-xs text-muted-foreground">active tasks</p>
                </div>
                {(viewerRole === 'ADMIN' || viewerRole === 'MAINTAINER') && user.isVirtual && (
                  <Button variant="outline" size="sm" onClick={() => router.push(`/orgs/${orgId}/members`)}>
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>

            {/* Virtual profile details */}
            {vp && (
              <div className="mt-4 pt-4 border-t grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                {vp.phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3.5 w-3.5 shrink-0"/><span>{vp.phone}</span></div>}
                {vp.address && <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-3.5 w-3.5 shrink-0"/><span>{vp.address}</span></div>}
                {vp.dob && <div className="flex items-center gap-2 text-muted-foreground"><span className="text-xs font-medium">DOB:</span><span>{format(new Date(vp.dob), 'MMM d, yyyy')}</span></div>}
                {vp.education && <div className="flex items-center gap-2 text-muted-foreground"><GraduationCap className="h-3.5 w-3.5 shrink-0"/><span>{vp.education}</span></div>}
                {vp.githubUrl && <a href={vp.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline"><Github className="h-3.5 w-3.5 shrink-0"/>GitHub</a>}
                {vp.linkedinUrl && <a href={vp.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline"><Linkedin className="h-3.5 w-3.5 shrink-0"/>LinkedIn</a>}
                {vp.introducedBy && <div className="flex items-center gap-2 text-muted-foreground"><Link2 className="h-3.5 w-3.5 shrink-0"/><span>Referred by: {vp.introducedBy}</span></div>}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Task lists */}
        <div className="grid gap-5 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                <CheckSquare className="h-4 w-4"/>Assigned Tasks
                <Badge variant="secondary" className="text-xs">{assignedTasks.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <TaskList tasks={assignedTasks} orgId={orgId} role={viewerRole ?? 'MEMBER'} label="Assigned" onUpdated={refresh} router={router} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                <CheckSquare className="h-4 w-4"/>Reviewing
                <Badge variant="secondary" className="text-xs">{reviewingTasks.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <TaskList tasks={reviewingTasks} orgId={orgId} role={viewerRole ?? 'MEMBER'} label="Reviewing" onUpdated={refresh} router={router} />
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}
