'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { usePendingTasks, type PendingTask } from '@/hooks/dashboard/usePendingTasks';
import { useDebounce } from '@/hooks/useDebounce';
import { AddTaskFlow } from '@/components/tasks/AddTaskFlow';
import { EditTaskDialog } from '@/components/tasks/EditTaskDialog';
import { MultiSelectFilter, type MultiSelectOption } from '@/components/ui/multi-select-filter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/axios';
import {
  Plus, Pencil, ArrowUpDown, ArrowUp, ArrowDown,
  ChevronLeft, ChevronRight, ExternalLink,
} from 'lucide-react';
import type { Task } from '@/hooks/tasks/useTasks';

// ─── helpers ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: MultiSelectOption[] = [
  { value: 'BACKLOG',     label: 'Backlog' },
  { value: 'TODO',        label: 'To Do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'BLOCKED',     label: 'Blocked' },
  { value: 'REVIEW',      label: 'Review' },
  { value: 'DONE',        label: 'Done' },
  { value: 'ARCHIVED',    label: 'Archived' },
];

const PRIORITY_OPTIONS: MultiSelectOption[] = [
  { value: 'P0', label: 'P0', sublabel: 'Critical' },
  { value: 'P1', label: 'P1', sublabel: 'High' },
  { value: 'P2', label: 'P2', sublabel: 'Medium' },
  { value: 'P3', label: 'P3', sublabel: 'Low' },
  { value: 'P4', label: 'P4', sublabel: 'Lowest' },
];

const STATUS_COLOR: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  IN_PROGRESS: 'secondary', REVIEW: 'default', BLOCKED: 'destructive',
  TODO: 'outline', BACKLOG: 'outline', DONE: 'outline', ARCHIVED: 'outline',
};

const PRIORITY_COLOR: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  P0: 'destructive', P1: 'default', P2: 'secondary', P3: 'outline', P4: 'outline',
};

function getTaskRoute(task: PendingTask): string {
  const { project, userRole } = task;
  const base = userRole === 'ADMIN' || userRole === 'MAINTAINER'
    ? `/orgs/${project.orgId}/projects/${project.id}/tasks/${task.id}`
    : `/orgs/${project.orgId}/my-work/${project.id}/tasks/${task.id}`;
  return `${base}?from=/pending-tasks`;
}

// ─── inline status select ────────────────────────────────────────────────────

function StatusSelect({ task, onUpdated }: { task: PendingTask; onUpdated: () => void }) {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const handleChange = async (s: string) => {
    if (s === task.status) return;
    setBusy(true);
    try {
      await api.patch(`/orgs/${task.project.orgId}/projects/${task.project.id}/tasks/${task.id}`, { status: s });
      onUpdated();
    } catch { toast({ title: 'Failed to update status', variant: 'destructive' }); }
    finally { setBusy(false); }
  };
  return (
    <Select value={task.status} onValueChange={handleChange} disabled={busy}>
      <SelectTrigger className="h-auto border-0 p-0 shadow-none focus:ring-0 w-auto gap-1">
        <Badge variant={STATUS_COLOR[task.status] ?? 'outline'} className="cursor-pointer text-xs">
          {task.status.replace('_', ' ')}
        </Badge>
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

// ─── inline priority select ──────────────────────────────────────────────────

function PrioritySelect({ task, onUpdated }: { task: PendingTask; onUpdated: () => void }) {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const handleChange = async (p: string) => {
    if (p === task.priority) return;
    setBusy(true);
    try {
      await api.patch(`/orgs/${task.project.orgId}/projects/${task.project.id}/tasks/${task.id}`, { priority: p });
      onUpdated();
    } catch { toast({ title: 'Failed to update priority', variant: 'destructive' }); }
    finally { setBusy(false); }
  };
  return (
    <Select value={task.priority} onValueChange={handleChange} disabled={busy}>
      <SelectTrigger className="h-auto border-0 p-0 shadow-none focus:ring-0 w-auto gap-1">
        <Badge variant={PRIORITY_COLOR[task.priority] ?? 'outline'} className="cursor-pointer text-xs w-8 justify-center">
          {task.priority}
        </Badge>
      </SelectTrigger>
      <SelectContent>
        {PRIORITY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label} – {o.sublabel}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

// ─── page ────────────────────────────────────────────────────────────────────

export default function PendingTasksPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'priority' | 'deadline' | 'created'>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Multi-select filter state
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [orgFilter, setOrgFilter] = useState<string[]>([]);
  const [userFilter, setUserFilter] = useState<string[]>([]);

  // Dialogs
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [editTask, setEditTask] = useState<PendingTask | null>(null);

  const { data: tasksData, isLoading } = usePendingTasks({ sortBy, sortOrder, page, limit: 20 });

  const tasks = tasksData?.tasks ?? [];
  const totalPages = tasksData?.totalPages ?? 0;
  const currentPage = tasksData?.page ?? 1;

  const refreshAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['pending-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
  }, [queryClient]);

  // Derive filter options from loaded tasks
  const orgOptions = useMemo<MultiSelectOption[]>(() => {
    const map = new Map<string, string>();
    tasks.forEach((t) => map.set(t.project.orgId, t.project.org.name));
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [tasks]);

  const userOptions = useMemo<MultiSelectOption[]>(() => {
    const map = new Map<string, { name?: string | null; email: string }>();
    tasks.forEach((t) => {
      if (t.assignee) map.set(t.assignee.id, { name: t.assignee.name, email: t.assignee.email });
      if (t.reviewer) map.set(t.reviewer.id, { name: t.reviewer.name, email: t.reviewer.email });
    });
    return Array.from(map.entries()).map(([value, u]) => ({
      value,
      label: u.name || u.email,
      sublabel: u.name ? u.email : undefined,
    }));
  }, [tasks]);

  // Client-side filtering
  const filteredTasks = useMemo(() => tasks.filter((task) => {
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      if (!task.title.toLowerCase().includes(q) && !(task.description?.toLowerCase().includes(q))) return false;
    }
    if (orgFilter.length > 0 && !orgFilter.includes(task.project.orgId)) return false;
    if (statusFilter.length > 0 && !statusFilter.includes(task.status)) return false;
    if (priorityFilter.length > 0 && !priorityFilter.includes(task.priority)) return false;
    if (userFilter.length > 0) {
      const assigneeMatch = task.assignee && userFilter.includes(task.assignee.id);
      const reviewerMatch = task.reviewer && userFilter.includes(task.reviewer.id);
      if (!assigneeMatch && !reviewerMatch) return false;
    }
    return true;
  }), [tasks, debouncedSearch, orgFilter, statusFilter, priorityFilter, userFilter]);

  const activeFilterCount = orgFilter.length + statusFilter.length + priorityFilter.length + userFilter.length;

  function resetFilters() {
    setOrgFilter([]); setStatusFilter([]); setPriorityFilter([]); setUserFilter([]);
  }

  const handleSort = (field: 'priority' | 'deadline' | 'created') => {
    if (sortBy === field) setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(field); setSortOrder('asc'); }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: typeof sortBy }) => {
    if (sortBy !== field) return <ArrowUpDown className="h-3.5 w-3.5 ml-1 opacity-40" />;
    return sortOrder === 'asc' ? <ArrowUp className="h-3.5 w-3.5 ml-1" /> : <ArrowDown className="h-3.5 w-3.5 ml-1" />;
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Pending Tasks</h1>
            <p className="text-muted-foreground">All non-completed tasks across your organisations</p>
          </div>
          <Button onClick={() => setAddTaskOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              Tasks
              {activeFilterCount > 0 && (
                <button onClick={resetFilters} className="text-xs text-muted-foreground hover:text-foreground font-normal underline">
                  Clear {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
                </button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Filters row */}
              <div className="flex gap-2 items-center flex-wrap">
                <Input
                  placeholder="Search tasks…"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="flex-1 min-w-[180px] max-w-xs"
                />
                {orgOptions.length > 1 && (
                  <MultiSelectFilter
                    options={orgOptions}
                    selected={orgFilter}
                    onChange={(v) => { setOrgFilter(v); setPage(1); }}
                    placeholder="All Orgs"
                    searchPlaceholder="Search orgs…"
                  />
                )}
                <MultiSelectFilter
                  options={STATUS_OPTIONS}
                  selected={statusFilter}
                  onChange={(v) => { setStatusFilter(v); setPage(1); }}
                  placeholder="All Statuses"
                  searchPlaceholder="Search status…"
                />
                <MultiSelectFilter
                  options={PRIORITY_OPTIONS}
                  selected={priorityFilter}
                  onChange={(v) => { setPriorityFilter(v); setPage(1); }}
                  placeholder="All Priorities"
                  searchPlaceholder="Search priority…"
                  maxBadges={3}
                />
                {userOptions.length > 0 && (
                  <MultiSelectFilter
                    options={userOptions}
                    selected={userFilter}
                    onChange={(v) => { setUserFilter(v); setPage(1); }}
                    placeholder="All Members"
                    searchPlaceholder="Search member…"
                  />
                )}
              </div>

              {isLoading ? (
                <Loading text="Loading tasks…" />
              ) : filteredTasks.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  No tasks found.{' '}
                  <button className="underline" onClick={() => setAddTaskOpen(true)}>Add one?</button>
                </div>
              ) : (
                <>
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">
                            <Button variant="ghost" size="sm" className="h-7 px-1 -ml-1" onClick={() => handleSort('priority')}>
                              Priority <SortIcon field="priority" />
                            </Button>
                          </TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead className="w-[140px]">Status</TableHead>
                          <TableHead className="w-[130px]">Assignee</TableHead>
                          <TableHead className="w-[130px]">Org / Project</TableHead>
                          <TableHead className="w-[100px]">
                            <Button variant="ghost" size="sm" className="h-7 px-1 -ml-1" onClick={() => handleSort('deadline')}>
                              Deadline <SortIcon field="deadline" />
                            </Button>
                          </TableHead>
                          <TableHead className="w-[50px]" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTasks.map((task) => (
                          <TableRow key={task.id} className="group">
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <PrioritySelect task={task} onUpdated={refreshAll} />
                            </TableCell>
                            <TableCell
                              className="font-medium cursor-pointer hover:underline max-w-[240px]"
                              onClick={() => router.push(getTaskRoute(task))}
                            >
                              <span className="truncate block">{task.title}</span>
                              {task.reviewer && (
                                <span className="text-xs text-muted-foreground block">
                                  Rev: {task.reviewer.name || task.reviewer.email}
                                </span>
                              )}
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <StatusSelect task={task} onUpdated={refreshAll} />
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {task.assignee ? (task.assignee.name || task.assignee.email) : '—'}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              <div className="truncate">{task.project.org.name}</div>
                              <div className="truncate text-muted-foreground/70">{task.project.name}</div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {task.deadlineDt
                                ? <span className={new Date(task.deadlineDt) < new Date() && task.status !== 'DONE' ? 'text-destructive font-medium' : ''}>
                                    {new Date(task.deadlineDt).toLocaleDateString()}
                                  </span>
                                : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditTask(task)}>
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Edit task</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => router.push(getTaskRoute(task))}>
                                      <ExternalLink className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Open task</TooltipContent>
                                </Tooltip>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between">
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1}>
                      <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages || 1}</span>
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={currentPage >= totalPages}>
                      Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <AddTaskFlow
          open={addTaskOpen}
          onOpenChange={(o) => { setAddTaskOpen(o); if (!o) refreshAll(); }}
        />

        {editTask && (
          <EditTaskDialog
            open={!!editTask}
            onOpenChange={(o) => { if (!o) { setEditTask(null); refreshAll(); } }}
            orgId={editTask.project.orgId}
            projectId={editTask.project.id}
            task={editTask as unknown as Task}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
