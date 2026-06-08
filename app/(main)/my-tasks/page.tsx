'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useMyTasks, type MyTask, type MyTasksOrg } from '@/hooks/dashboard/useMyTasks';
import { useDebounce } from '@/hooks/useDebounce';
import { AddTaskFlow } from '@/components/tasks/AddTaskFlow';
import { EditTaskDialog } from '@/components/tasks/EditTaskDialog';
import { QuickAddSubtaskModal } from '@/components/tasks/QuickAddSubtaskModal';
import { usePriorityTaskList } from '@/hooks/usePriorityTaskList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loading } from '@/components/ui/loading';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/axios';
import {
  Plus,
  Pencil,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Building2,
  FolderKanban,
  AlertCircle,
  Star,
  Grid3x3,
  List,
  Play,
  Pause,
  Square,
  Clock,
  GitBranch,
} from 'lucide-react';
import type { Task } from '@/hooks/tasks/useTasks';
import { useActiveWorkSession, useStartWorkSession, usePauseWorkSession, useResumeWorkSession, useStopWorkSession } from '@/hooks/work-logs/useWorkSessions';
import { useTaskWorkLogs } from '@/hooks/work-logs/useTaskWorkLogs';

// ─── constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'BACKLOG',     label: 'Backlog' },
  { value: 'TODO',        label: 'To Do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'BLOCKED',     label: 'Blocked' },
  { value: 'REVIEW',      label: 'Review' },
  { value: 'DONE',        label: 'Done' },
  { value: 'ARCHIVED',    label: 'Archived' },
];

const PRIORITY_OPTIONS = [
  { value: 'P0', label: 'P0 – Critical' },
  { value: 'P1', label: 'P1 – High' },
  { value: 'P2', label: 'P2 – Medium' },
  { value: 'P3', label: 'P3 – Low' },
  { value: 'P4', label: 'P4 – Lowest' },
];

const STATUS_ORDER: Record<string, number> = {
  IN_PROGRESS: 0, REVIEW: 1, BLOCKED: 2, TODO: 3, BACKLOG: 4, DONE: 5, ARCHIVED: 6,
};

const STATUS_COLOR: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  IN_PROGRESS: 'secondary', REVIEW: 'default', BLOCKED: 'destructive',
  TODO: 'outline', BACKLOG: 'outline', DONE: 'outline', ARCHIVED: 'outline',
};

const PRIORITY_COLOR: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  P0: 'destructive', P1: 'default', P2: 'secondary', P3: 'outline', P4: 'outline',
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function getTaskRoute(task: MyTask, orgId: string, role: string): string {
  const base = role === 'ADMIN' || role === 'MAINTAINER'
    ? `/orgs/${orgId}/projects/${task.projectId}/tasks/${task.id}`
    : `/orgs/${orgId}/my-work/${task.projectId}/tasks/${task.id}`;
  return `${base}?from=/my-tasks`;
}

function isOverdue(deadline?: string | null) {
  if (!deadline) return false;
  return new Date(deadline) < new Date();
}

function getTaskDaysInStatus(task: MyTask): number {
  if (!task.updatedAt) return 0;
  const now = new Date();
  const updated = new Date(task.updatedAt);
  return Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24));
}

function getDaysUntilDeadline(deadline?: string | null): number | null {
  if (!deadline) return null;
  const now = new Date();
  const dead = new Date(deadline);
  const days = Math.ceil((dead.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return days;
}

function getTasksByPriority(tasks: MyTask[]) {
  return {
    p0: tasks.filter(t => t.priority === 'P0').length,
    p1: tasks.filter(t => t.priority === 'P1').length,
    p2: tasks.filter(t => t.priority === 'P2').length,
    p3p4: tasks.filter(t => t.priority === 'P3' || t.priority === 'P4').length,
  };
}

// ─── inline status select ────────────────────────────────────────────────────

function StatusSelect({
  task, orgId, onUpdated,
}: { task: MyTask; orgId: string; onUpdated: () => void }) {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const handleChange = async (newStatus: string) => {
    if (newStatus === task.status) return;
    setBusy(true);
    try {
      await api.patch(`/orgs/${orgId}/projects/${task.projectId}/tasks/${task.id}`, { status: newStatus });
      onUpdated();
    } catch {
      toast({ title: 'Failed to update status', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Select value={task.status} onValueChange={handleChange} disabled={busy}>
      <SelectTrigger className="h-auto border-0 p-0 shadow-none focus:ring-0 w-auto gap-1">
        <Badge variant={STATUS_COLOR[task.status] ?? 'outline'} className="cursor-pointer text-xs">
          {task.status.replace('_', ' ')}
        </Badge>
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── inline priority select ──────────────────────────────────────────────────

function PrioritySelect({
  task, orgId, onUpdated,
}: { task: MyTask; orgId: string; onUpdated: () => void }) {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const handleChange = async (newPriority: string) => {
    if (newPriority === task.priority) return;
    setBusy(true);
    try {
      await api.patch(`/orgs/${orgId}/projects/${task.projectId}/tasks/${task.id}`, { priority: newPriority });
      onUpdated();
    } catch {
      toast({ title: 'Failed to update priority', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Select value={task.priority} onValueChange={handleChange} disabled={busy}>
      <SelectTrigger className="h-auto border-0 p-0 shadow-none focus:ring-0 w-auto">
        <Badge variant={PRIORITY_COLOR[task.priority] ?? 'outline'} className="cursor-pointer text-xs w-8 justify-center">
          {task.priority}
        </Badge>
      </SelectTrigger>
      <SelectContent>
        {PRIORITY_OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── task with subtasks ───────────────────────────────────────────────────────

function TaskWithSubtasks({
  task, subtasks, orgId, role, projectId, onEdit, onOpen, onUpdated, onAddPriority, onAddSubtask, compact = false,
}: {
  task: MyTask; subtasks: MyTask[]; orgId: string; role: string; projectId: string;
  onEdit: () => void; onOpen: () => void; onUpdated: () => void; onAddPriority: () => void; onAddSubtask: () => void;
  compact?: boolean;
}) {
  return (
    <>
      <TaskRow
        task={task}
        orgId={orgId}
        role={role}
        projectId={projectId}
        onEdit={onEdit}
        onOpen={onOpen}
        onUpdated={onUpdated}
        onAddPriority={onAddPriority}
        onAddSubtask={onAddSubtask}
        compact={compact}
      />
      {subtasks.map((subtask) => (
        <div key={subtask.id} className="pl-8 border-l-4 border-l-amber-400 bg-amber-50/40 rounded-r-md hover:bg-amber-100/30 transition-colors">
          <TaskRow
            task={subtask}
            orgId={orgId}
            role={role}
            projectId={projectId}
            onEdit={() => onEdit()}
            onOpen={() => onOpen()}
            onUpdated={onUpdated}
            onAddPriority={() => onAddPriority()}
            onAddSubtask={() => onAddSubtask()}
            compact={compact}
            isSubtask
          />
        </div>
      ))}
    </>
  );
}

// ─── task row ────────────────────────────────────────────────────────────────

function TaskRow({
  task, orgId, role, projectId, onEdit, onOpen, onUpdated, onAddPriority, onAddSubtask, compact = false, isSubtask = false,
}: {
  task: MyTask; orgId: string; role: string; projectId: string;
  onEdit: () => void; onOpen: () => void; onUpdated: () => void; onAddPriority: () => void; onAddSubtask: () => void;
  compact?: boolean; isSubtask?: boolean;
}) {
  const overdue = isOverdue(task.deadlineDt) && !['DONE', 'ARCHIVED'].includes(task.status);
  const daysLeft = getDaysUntilDeadline(task.deadlineDt);
  const daysInStatus = getTaskDaysInStatus(task);
  const { hasTask, applyHighlight } = usePriorityTaskList();

  const isUrgent = overdue || (daysLeft !== null && daysLeft < 2);

  const { data: workSessionData } = useActiveWorkSession(orgId, projectId);
  const { data: workLogsData } = useTaskWorkLogs(orgId, projectId, task.id);
  const startSession = useStartWorkSession(orgId, projectId);
  const pauseSession = usePauseWorkSession(orgId, projectId);
  const resumeSession = useResumeWorkSession(orgId, projectId);
  const stopSession = useStopWorkSession(orgId, projectId);

  const [sessionTimer, setSessionTimer] = useState('00:00:00');
  const clientServerOffsetRef = useRef<number | null>(null);

  const hasActiveSession = workSessionData?.session?.taskId === task.id;
  const hasOtherSession = !!(workSessionData?.session && workSessionData.session.taskId !== task.id);
  const totalWorkTime = workLogsData?.totalMinutes || 0;
  const session = hasActiveSession ? workSessionData?.session : null;

  // Calculate client-server time offset when session becomes active
  useEffect(() => {
    if (session && session.status === 'ACTIVE' && clientServerOffsetRef.current === null) {
      const lastSegment = session.segments[session.segments.length - 1];
      if (lastSegment && lastSegment.startDt) {
        const serverTime = new Date(lastSegment.startDt).getTime();
        const clientTime = Date.now();
        // Offset = how much ahead the server is compared to client
        clientServerOffsetRef.current = serverTime - clientTime;
      }
    }
    if (!session) {
      clientServerOffsetRef.current = null;
    }
  }, [session?.id, session?.status]);

  // Timer update effect - runs every 500ms
  useEffect(() => {
    if (!session) return;

    const updateTimer = () => {
      let totalMs = session.totalDurationMin * 60 * 1000;

      if (session.status === 'ACTIVE') {
        const lastSegment = session.segments[session.segments.length - 1];
        if (lastSegment && lastSegment.startDt && clientServerOffsetRef.current !== null) {
          const serverStartTime = new Date(lastSegment.startDt).getTime();
          const clientStartTime = serverStartTime - clientServerOffsetRef.current;
          const msElapsed = Math.max(0, Date.now() - clientStartTime);
          totalMs += msElapsed;
        }
      }

      const totalSeconds = Math.max(0, Math.floor(totalMs / 1000));
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      setSessionTimer(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [session]);

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/40 transition-colors group cursor-pointer ${
        isUrgent ? 'border-l-4 border-destructive bg-destructive/5' : ''
      }`}
      id={`task-row-${task.id}`}
      onClick={() => applyHighlight(task.id)}
    >
      {/* Priority inline */}
      <div onClick={(e) => e.stopPropagation()}>
        <PrioritySelect task={task} orgId={orgId} onUpdated={onUpdated} />
      </div>

      {/* Title */}
      <button
        className={`flex-1 text-left text-sm font-medium hover:underline truncate ${
          task.status === 'DONE' ? 'line-through text-muted-foreground' : ''
        }`}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
      >
        {task.title}
      </button>

      {/* Deadline */}
      {task.deadlineDt && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={`text-xs shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded ${
              overdue ? 'bg-destructive/10 text-destructive font-medium' :
              daysLeft !== null && daysLeft < 3 ? 'bg-yellow-500/10 text-yellow-700' :
              'text-muted-foreground'
            }`}>
              {overdue && <AlertCircle className="h-3 w-3" />}
              {overdue ? `${Math.abs(daysLeft ?? 0)} days overdue` :
               daysLeft !== null ? `${daysLeft}d left` :
               new Date(task.deadlineDt).toLocaleDateString()}
            </span>
          </TooltipTrigger>
          <TooltipContent>{new Date(task.deadlineDt).toLocaleDateString()}</TooltipContent>
        </Tooltip>
      )}

      {/* Status inline */}
      <div onClick={(e) => e.stopPropagation()}>
        <StatusSelect task={task} orgId={orgId} onUpdated={onUpdated} />
      </div>

      {/* Task Duration */}
      {!compact && daysInStatus > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-xs text-muted-foreground shrink-0">{daysInStatus}d</span>
          </TooltipTrigger>
          <TooltipContent>In {task.status.replace('_', ' ').toLowerCase()} for {daysInStatus} days</TooltipContent>
        </Tooltip>
      )}

      {/* Total Work Time */}
      {!compact && totalWorkTime > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-xs shrink-0 px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium">
              ⏱️ {Math.floor(totalWorkTime / 60)}h {totalWorkTime % 60}m
            </span>
          </TooltipTrigger>
          <TooltipContent>Total time logged on this task</TooltipContent>
        </Tooltip>
      )}

      {/* Active Session Timer */}
      {hasActiveSession && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex gap-0.5 items-center shrink-0 bg-green-50 px-2 py-1 rounded border border-green-300 font-mono text-sm font-bold text-green-700">
              {sessionTimer}
            </div>
          </TooltipTrigger>
          <TooltipContent>Current session timer (active)</TooltipContent>
        </Tooltip>
      )}

      {/* Work Session Controls */}
      {hasActiveSession && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex gap-0.5 items-center shrink-0 bg-green-50 px-1.5 py-0.5 rounded border border-green-200">
              <Clock className="h-3.5 w-3.5 text-green-600" />
              {workSessionData?.session?.status === 'ACTIVE' ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1 text-xs"
                    onClick={(e) => { e.stopPropagation(); pauseSession.mutate(workSessionData.session!.id); }}
                    disabled={pauseSession.isPending}
                  >
                    <Pause className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1 text-xs"
                    onClick={(e) => { e.stopPropagation(); stopSession.mutate(workSessionData.session!.id); }}
                    disabled={stopSession.isPending}
                  >
                    <Square className="h-3 w-3" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1 text-xs"
                    onClick={(e) => { e.stopPropagation(); resumeSession.mutate(workSessionData.session!.id); }}
                    disabled={resumeSession.isPending}
                  >
                    <Play className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1 text-xs"
                    onClick={(e) => { e.stopPropagation(); stopSession.mutate(workSessionData.session!.id); }}
                    disabled={stopSession.isPending}
                  >
                    <Square className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>{workSessionData?.session?.status === 'ACTIVE' ? 'Pause or stop session' : 'Resume or stop session'}</TooltipContent>
        </Tooltip>
      )}

      {/* Actions */}
      <div className="flex gap-1 items-center shrink-0">
        {!hasActiveSession && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); startSession.mutate(task.id); }}
                disabled={startSession.isPending || hasOtherSession}
                title={hasOtherSession ? 'You have an active session on another task' : 'Start work session'}
              >
                <Clock className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{hasOtherSession ? 'Stop current session first' : 'Start work session'}</TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAddSubtask(); }}
            >
              <GitBranch className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add subtask</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAddPriority(); }}
            >
              <Star className={`h-3.5 w-3.5 ${hasTask(task.id) ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground hover:text-yellow-500'}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{hasTask(task.id) ? 'Remove from priority list' : 'Add to priority list'}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Edit task</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onOpen}>
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Open task</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

// ─── project group ────────────────────────────────────────────────────────────

function ProjectGroup({
  entry, orgId, role, router, onEdit, onUpdated, searchQ, statusFilter, onAddTask, onAddPriority, onAddSubtask, sortBy, compact,
}: {
  entry: MyTasksOrg['projects'][0];
  orgId: string; role: string;
  router: ReturnType<typeof useRouter>;
  onEdit: (task: MyTask, orgId: string) => void;
  onUpdated: () => void;
  searchQ: string; statusFilter: string;
  onAddTask: (orgId: string, projectId: string) => void;
  onAddPriority: (task: MyTask, orgId: string) => void;
  onAddSubtask: (task: MyTask, orgId: string, projectId: string) => void;
  sortBy: 'deadline' | 'priority' | 'status' | 'created';
  compact?: boolean;
}) {
  const [open, setOpen] = useState(true);

  const getSortValue = (task: MyTask) => {
    switch (sortBy) {
      case 'deadline':
        return task.deadlineDt ? new Date(task.deadlineDt).getTime() : Infinity;
      case 'priority':
        const priorityMap: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3, P4: 4 };
        return priorityMap[task.priority] ?? 5;
      case 'created':
        return task.createdAt ? new Date(task.createdAt).getTime() : 0;
      default: // status
        return (STATUS_ORDER[task.status] ?? 9);
    }
  };

  const allFiltered = entry.tasks
    .filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (searchQ && !t.title.toLowerCase().includes(searchQ)) return false;
      return true;
    });

  // Separate parent and child tasks
  const parentTasks = allFiltered.filter((t) => !t.parentId);
  const childTasksByParent = new Map<string, MyTask[]>();
  allFiltered.filter((t) => t.parentId).forEach((t) => {
    if (!childTasksByParent.has(t.parentId!)) {
      childTasksByParent.set(t.parentId!, []);
    }
    childTasksByParent.get(t.parentId!)!.push(t);
  });

  // Separate active and done parent tasks
  const activeParents = parentTasks.filter((t) => !['DONE', 'ARCHIVED'].includes(t.status));
  const doneParents = parentTasks.filter((t) => ['DONE', 'ARCHIVED'].includes(t.status));

  // Sort each group
  const sortedParents = [
    ...activeParents.sort((a, b) => getSortValue(a) - getSortValue(b)),
    ...doneParents.sort((a, b) => getSortValue(a) - getSortValue(b)),
  ];

  const active = sortedParents.filter((t) => !['DONE', 'ARCHIVED'].includes(t.status)).length;

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium bg-muted/30 hover:bg-muted/50 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        <FolderKanban className="h-4 w-4 text-muted-foreground" />
        <span
          className="flex-1 text-left hover:underline"
          onClick={(e) => { e.stopPropagation(); router.push(`/orgs/${orgId}/projects/${entry.project.id}/dashboard`); }}
        >{entry.project.name}</span>
        <span className="text-xs text-muted-foreground mr-1">{entry.project.code}</span>
        {active > 0 && <Badge variant="secondary" className="text-xs">{active} active</Badge>}
        <span
          role="button"
          onClick={(e) => { e.stopPropagation(); onAddTask(orgId, entry.project.id); }}
          className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded px-1.5 py-0.5 ml-1 transition-colors"
        >
          <Plus className="h-3 w-3" />
          Add
        </span>
      </button>
      {open && (
        <div className="divide-y">
          {sortedParents.length === 0 ? (
            <div className="px-3 py-3 text-xs text-muted-foreground text-center">
              No matching tasks.{' '}
              <button className="underline" onClick={() => onAddTask(orgId, entry.project.id)}>Add one?</button>
            </div>
          ) : (
            sortedParents.map((task) => (
              <TaskWithSubtasks
                key={task.id}
                task={task}
                subtasks={childTasksByParent.get(task.id) || []}
                orgId={orgId}
                projectId={entry.project.id}
                role={role}
                onEdit={() => onEdit(task, orgId)}
                onOpen={() => router.push(getTaskRoute(task, orgId, role))}
                onUpdated={onUpdated}
                onAddPriority={() => onAddPriority(task, orgId)}
                onAddSubtask={() => onAddSubtask(task, orgId, entry.project.id)}
                compact={compact}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── org group ────────────────────────────────────────────────────────────────

function OrgGroup({
  entry, router, searchQ, statusFilter, onEdit, onUpdated, onAddTask, onAddPriority, onAddSubtask, sortBy, compact,
}: {
  entry: MyTasksOrg;
  router: ReturnType<typeof useRouter>;
  searchQ: string; statusFilter: string;
  onEdit: (task: MyTask, orgId: string) => void;
  onUpdated: () => void;
  onAddTask: (orgId: string, projectId?: string) => void;
  onAddPriority: (task: MyTask, orgId: string) => void;
  onAddSubtask: (task: MyTask, orgId: string, projectId: string) => void;
  sortBy: 'deadline' | 'priority' | 'status' | 'created';
  compact?: boolean;
}) {
  const [open, setOpen] = useState(true);

  const visibleProjects = entry.projects.filter((pe) =>
    pe.tasks.some((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (searchQ && !t.title.toLowerCase().includes(searchQ)) return false;
      return true;
    })
  );

  if (visibleProjects.length === 0) return null;

  const total = visibleProjects.reduce((s, pe) => s + pe.tasks.length, 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          className="flex items-center gap-2 flex-1 text-left"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <span
            className="font-semibold text-base hover:underline cursor-pointer"
            onClick={(e) => { e.stopPropagation(); router.push(`/orgs/${entry.org.id}/overview`); }}
          >{entry.org.name}</span>
          <Badge variant="outline" className="text-xs ml-1">{entry.role}</Badge>
          <span className="text-xs text-muted-foreground">
            {total} task{total !== 1 ? 's' : ''}
          </span>
        </button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" className="h-7" onClick={() => onAddTask(entry.org.id)}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Task
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add a task — choose project in {entry.org.name}</TooltipContent>
        </Tooltip>
      </div>
      {open && (
        <div className="pl-7 space-y-2">
          {visibleProjects.map((pe) => (
            <ProjectGroup
              key={pe.project.id}
              entry={pe}
              orgId={entry.org.id}
              role={entry.role}
              router={router}
              onEdit={onEdit}
              onUpdated={onUpdated}
              searchQ={searchQ}
              statusFilter={statusFilter}
              onAddTask={onAddTask}
              onAddPriority={onAddPriority}
              onAddSubtask={onAddSubtask}
              sortBy={sortBy}
              compact={compact}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function MyTasksPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { addTask, removeTask, hasTask, isLoaded, applyHighlight } = usePriorityTaskList();

  const { data, isLoading } = useMyTasks();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'deadline' | 'priority' | 'status' | 'created'>('status');
  const [viewMode, setViewMode] = useState<'list' | 'compact'>('list');
  const debouncedSearch = useDebounce(search, 300);

  // Dialogs
  const [addTaskOrgId, setAddTaskOrgId] = useState<string | undefined>(undefined);
  const [addTaskProjectId, setAddTaskProjectId] = useState<string | undefined>(undefined);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [editTask, setEditTask] = useState<{ task: MyTask; orgId: string } | null>(null);
  const [subtaskData, setSubtaskData] = useState<{ task: MyTask; orgId: string; projectId: string } | null>(null);
  const [subtaskModalOpen, setSubtaskModalOpen] = useState(false);

  const grouped = data?.grouped ?? [];
  const total = data?.total ?? 0;

  const refreshAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['pending-tasks'] });
  }, [queryClient]);

  function handleAddTask(orgId?: string, projectId?: string) {
    setAddTaskOrgId(orgId);
    setAddTaskProjectId(projectId);
    setAddTaskOpen(true);
  }

  function handleAddSubtask(task: MyTask, orgId: string, projectId: string) {
    setSubtaskData({ task, orgId, projectId });
    setSubtaskModalOpen(true);
  }

  const { data: session } = useSession();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder="Search tasks…"]') as HTMLInputElement;
        searchInput?.focus();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        handleAddTask();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleAddToPriorityList = useCallback((task: MyTask, orgId: string) => {
    if (hasTask(task.id)) {
      removeTask(task.id);
      toast({ title: 'Removed from priority list' });
    } else {
      addTask({
        taskId: task.id,
        orgId,
        projectId: task.projectId,
        title: task.title,
        priority: task.priority,
        status: task.status,
        assigneeId: session?.user?.email,
      });
      toast({ title: 'Added to priority list' });
    }
  }, [addTask, removeTask, hasTask, toast, session?.user?.email]);

  return (
    <TooltipProvider>
      <div className="space-y-0">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold">My Tasks</h1>
            <p className="text-muted-foreground">
              All tasks assigned to you across every organisation and project
            </p>
          </div>
          <Button onClick={() => handleAddTask()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Task (Ctrl+N)
          </Button>
        </div>

        {/* Content */}
        {isLoading ? (
          <Loading text="Loading your tasks…" />
        ) : grouped.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No tasks assigned to you</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Tasks assigned to you will appear here, grouped by organisation and project.
              </p>
              <Button onClick={() => handleAddTask()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <CardHeader className="pb-0">
              <CardTitle>Tasks by Organisation</CardTitle>
            </CardHeader>
            <div className="px-6 py-4 border-b sticky top-0 z-10 bg-background space-y-3">
              <div className="flex gap-2 items-center flex-wrap">
                <div className="flex-1">
                  <Input
                    placeholder="Search tasks… (Ctrl+K)"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full max-w-sm"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="status">Sort: Status</SelectItem>
                    <SelectItem value="deadline">Sort: Deadline</SelectItem>
                    <SelectItem value="priority">Sort: Priority</SelectItem>
                    <SelectItem value="created">Sort: Created</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-1 ml-auto">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={viewMode === 'list' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('list')}
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>List view</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={viewMode === 'compact' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('compact')}
                      >
                        <Grid3x3 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Compact view</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* Priority Stats */}
              {total > 0 && (
                <div className="flex gap-3 flex-wrap items-center text-xs">
                  {(() => {
                    const allTasks = grouped.flatMap(org => org.projects.flatMap(p => p.tasks));
                    const stats = getTasksByPriority(allTasks);
                    return (
                      <>
                        {stats.p0 > 0 && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-destructive/10 rounded">
                            <span className="h-2 w-2 rounded-full bg-destructive"></span>
                            <span className="font-medium">{stats.p0} Critical</span>
                          </div>
                        )}
                        {stats.p1 > 0 && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-orange-500/10 rounded">
                            <span className="h-2 w-2 rounded-full bg-orange-500"></span>
                            <span className="font-medium">{stats.p1} High</span>
                          </div>
                        )}
                        {stats.p2 > 0 && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 rounded">
                            <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                            <span className="font-medium">{stats.p2} Medium</span>
                          </div>
                        )}
                        <span className="text-muted-foreground ml-auto">{total} total</span>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
            <CardContent className="space-y-6 pt-6">
              {grouped.map((entry) => (
                <OrgGroup
                  key={entry.org.id}
                  entry={entry}
                  router={router}
                  searchQ={debouncedSearch.toLowerCase()}
                  statusFilter={statusFilter}
                  onEdit={(task, orgId) => setEditTask({ task, orgId })}
                  onUpdated={refreshAll}
                  onAddTask={handleAddTask}
                  onAddPriority={handleAddToPriorityList}
                  onAddSubtask={handleAddSubtask}
                  sortBy={sortBy}
                  compact={viewMode === 'compact'}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Add Task Flow */}
        <AddTaskFlow
          open={addTaskOpen}
          onOpenChange={(o) => {
            setAddTaskOpen(o);
            if (!o) { setAddTaskOrgId(undefined); setAddTaskProjectId(undefined); refreshAll(); }
          }}
          defaultOrgId={addTaskOrgId}
          defaultProjectId={addTaskProjectId}
        />

        {/* Edit Task Dialog */}
        {editTask && (
          <EditTaskDialog
            open={!!editTask}
            onOpenChange={(o) => {
              if (!o) { setEditTask(null); refreshAll(); }
            }}
            orgId={editTask.orgId}
            projectId={editTask.task.projectId}
            task={editTask.task as unknown as Task}
          />
        )}

        {/* Quick Add Subtask Modal */}
        {subtaskData && (
          <QuickAddSubtaskModal
            open={subtaskModalOpen}
            onOpenChange={(o) => {
              if (!o) {
                setSubtaskModalOpen(false);
                setSubtaskData(null);
              } else {
                setSubtaskModalOpen(o);
              }
            }}
            orgId={subtaskData.orgId}
            projectId={subtaskData.projectId}
            parentTaskId={subtaskData.task.id}
            parentTaskTitle={subtaskData.task.title}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
