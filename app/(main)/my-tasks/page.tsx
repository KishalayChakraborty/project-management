'use client';

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useMyTasks, type MyTask, type MyTasksOrg } from '@/hooks/dashboard/useMyTasks';
import { useDebounce } from '@/hooks/useDebounce';
import { AddTaskFlow } from '@/components/tasks/AddTaskFlow';
import { EditTaskDialog } from '@/components/tasks/EditTaskDialog';
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
} from 'lucide-react';
import type { Task } from '@/hooks/tasks/useTasks';

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

// ─── task row ────────────────────────────────────────────────────────────────

function TaskRow({
  task, orgId, role, onEdit, onOpen, onUpdated, onAddPriority,
}: {
  task: MyTask; orgId: string; role: string;
  onEdit: () => void; onOpen: () => void; onUpdated: () => void; onAddPriority: () => void;
}) {
  const overdue = isOverdue(task.deadlineDt) && !['DONE', 'ARCHIVED'].includes(task.status);
  const { hasTask, isLoaded, applyHighlight } = usePriorityTaskList();

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/40 transition-colors group cursor-pointer"
      id={`task-row-${task.id}`}
      onClick={() => applyHighlight(task.id)}
    >
      {/* Priority inline */}
      <div onClick={(e) => e.stopPropagation()}>
        <PrioritySelect task={task} orgId={orgId} onUpdated={onUpdated} />
      </div>

      {/* Title */}
      <button
        className="flex-1 text-left text-sm font-medium hover:underline truncate"
        onDoubleClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
      >
        {task.title}
      </button>

      {/* Deadline */}
      {task.deadlineDt && (
        <span className={`text-xs shrink-0 flex items-center gap-1 ${overdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
          {overdue && <AlertCircle className="h-3 w-3" />}
          {new Date(task.deadlineDt).toLocaleDateString()}
        </span>
      )}

      {/* Status inline */}
      <div onClick={(e) => e.stopPropagation()}>
        <StatusSelect task={task} orgId={orgId} onUpdated={onUpdated} />
      </div>

      {/* Actions */}
      <div className="flex gap-1 items-center shrink-0">
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
  entry, orgId, role, router, onEdit, onUpdated, searchQ, statusFilter, onAddTask, onAddPriority,
}: {
  entry: MyTasksOrg['projects'][0];
  orgId: string; role: string;
  router: ReturnType<typeof useRouter>;
  onEdit: (task: MyTask, orgId: string) => void;
  onUpdated: () => void;
  searchQ: string; statusFilter: string;
  onAddTask: (orgId: string, projectId: string) => void;
  onAddPriority: (task: MyTask, orgId: string) => void;
}) {
  const [open, setOpen] = useState(true);

  const filtered = entry.tasks
    .filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (searchQ && !t.title.toLowerCase().includes(searchQ)) return false;
      return true;
    })
    .sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9));

  const active = filtered.filter((t) => !['DONE', 'ARCHIVED'].includes(t.status)).length;

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
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-xs text-muted-foreground text-center">
              No matching tasks.{' '}
              <button className="underline" onClick={() => onAddTask(orgId, entry.project.id)}>Add one?</button>
            </div>
          ) : (
            filtered.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                orgId={orgId}
                role={role}
                onEdit={() => onEdit(task, orgId)}
                onOpen={() => router.push(getTaskRoute(task, orgId, role))}
                onUpdated={onUpdated}
                onAddPriority={() => onAddPriority(task, orgId)}
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
  entry, router, searchQ, statusFilter, onEdit, onUpdated, onAddTask, onAddPriority,
}: {
  entry: MyTasksOrg;
  router: ReturnType<typeof useRouter>;
  searchQ: string; statusFilter: string;
  onEdit: (task: MyTask, orgId: string) => void;
  onUpdated: () => void;
  onAddTask: (orgId: string, projectId?: string) => void;
  onAddPriority: (task: MyTask, orgId: string) => void;
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
  const debouncedSearch = useDebounce(search, 300);

  // Dialogs
  const [addTaskOrgId, setAddTaskOrgId] = useState<string | undefined>(undefined);
  const [addTaskProjectId, setAddTaskProjectId] = useState<string | undefined>(undefined);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [editTask, setEditTask] = useState<{ task: MyTask; orgId: string } | null>(null);

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

  const { data: session } = useSession();

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
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">My Tasks</h1>
            <p className="text-muted-foreground">
              All tasks assigned to you across every organisation and project
            </p>
          </div>
          <Button onClick={() => handleAddTask()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap items-center">
          <Input
            placeholder="Search tasks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
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
          {total > 0 && (
            <span className="text-sm text-muted-foreground ml-auto">
              {total} total task{total !== 1 ? 's' : ''}
            </span>
          )}
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
          <Card>
            <CardHeader>
              <CardTitle>Tasks by Organisation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
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
      </div>
    </TooltipProvider>
  );
}
