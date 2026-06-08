'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAllTasks, type AllTask } from '@/hooks/dashboard/useAllTasks';
import { useDebounce } from '@/hooks/useDebounce';
import { AddTaskFlow } from '@/components/tasks/AddTaskFlow';
import { EditTaskDialog } from '@/components/tasks/EditTaskDialog';
import { QuickAddSubtaskModal } from '@/components/tasks/QuickAddSubtaskModal';
import { usePriorityTaskList } from '@/hooks/usePriorityTaskList';
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
  ChevronLeft, ChevronRight, ExternalLink, Star, AlertCircle,
  CheckCircle2, Clock, Filter, X, RotateCcw,
  List, LayoutGrid, GripVertical, ChevronDown, GitBranch,
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

const GROUP_BY_OPTIONS: MultiSelectOption[] = [
  { value: 'status', label: 'Status' },
  { value: 'assignee', label: 'Assignee' },
  { value: 'priority', label: 'Priority' },
  { value: 'project', label: 'Project' },
  { value: 'org', label: 'Organization' },
  { value: 'deadline', label: 'Deadline' },
];

const STATUS_COLOR: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  IN_PROGRESS: 'secondary', REVIEW: 'default', BLOCKED: 'destructive',
  TODO: 'outline', BACKLOG: 'outline', DONE: 'outline', ARCHIVED: 'outline',
};

const PRIORITY_COLOR: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  P0: 'destructive', P1: 'default', P2: 'secondary', P3: 'outline', P4: 'outline',
};

type ViewType = 'list' | 'group';
type GroupByField = 'status' | 'assignee' | 'priority' | 'project' | 'org' | 'deadline';

function getTaskRoute(task: AllTask): string {
  const { project, userRole } = task;
  const base = userRole === 'ADMIN' || userRole === 'MAINTAINER'
    ? `/orgs/${project.orgId}/projects/${project.id}/tasks/${task.id}`
    : `/orgs/${project.orgId}/my-work/${project.id}/tasks/${task.id}`;
  return `${base}?from=/all-tasks`;
}

function isCompletedTask(status: string): boolean {
  return status === 'DONE' || status === 'ARCHIVED';
}

function isOverdueTask(task: AllTask): boolean {
  if (!task.deadlineDt || isCompletedTask(task.status)) return false;
  return new Date(task.deadlineDt) < new Date();
}

function getGroupKey(task: AllTask, groupBy: GroupByField): string {
  switch (groupBy) {
    case 'status':
      return task.status;
    case 'assignee':
      return task.assignee?.id || 'unassigned';
    case 'priority':
      return task.priority;
    case 'project':
      return task.project.id;
    case 'org':
      return task.project.orgId;
    case 'deadline':
      return task.deadlineDt ? new Date(task.deadlineDt).toLocaleDateString() : 'no-deadline';
    default:
      return '';
  }
}

function getGroupLabel(groupKey: string, groupBy: GroupByField, tasks: AllTask[]): string {
  if (groupBy === 'status') return groupKey.replace('_', ' ');
  if (groupBy === 'assignee') {
    if (groupKey === 'unassigned') return 'Unassigned';
    const task = tasks.find(t => t.assignee?.id === groupKey);
    return task?.assignee?.name || task?.assignee?.email || 'Unknown';
  }
  if (groupBy === 'priority') return groupKey;
  if (groupBy === 'project') {
    const task = tasks.find(t => t.project.id === groupKey);
    return task?.project.name || 'Unknown';
  }
  if (groupBy === 'org') {
    const task = tasks.find(t => t.project.orgId === groupKey);
    return task?.project.org.name || 'Unknown';
  }
  if (groupBy === 'deadline') {
    return groupKey === 'no-deadline' ? 'No Deadline' : groupKey;
  }
  return groupKey;
}

// ─── inline status select ────────────────────────────────────────────────────

function StatusSelect({ task, onUpdated }: { task: AllTask; onUpdated: () => void }) {
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

function PrioritySelect({ task, onUpdated }: { task: AllTask; onUpdated: () => void }) {
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

// ─── task card for group view ────────────────────────────────────────────────

function TaskCard({ task, isDragging, onDragStart, onUpdated }: {
  task: AllTask;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onUpdated: () => void;
}) {
  const router = useRouter();
  const { addTask, removeTask, hasTask } = usePriorityTaskList();
  const { toast } = useToast();
  const isCompleted = isCompletedTask(task.status);
  const isOverdue = isOverdueTask(task);

  const handleTogglePriority = useCallback(() => {
    if (hasTask(task.id)) {
      removeTask(task.id);
    } else {
      addTask({
        taskId: task.id,
        orgId: task.project.orgId,
        projectId: task.project.id,
        title: task.title,
        priority: task.priority,
        status: task.status,
        assigneeId: task.assignee?.email,
      });
    }
  }, [addTask, removeTask, hasTask, task]);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      className={`p-3 border rounded-md cursor-move transition-all hover:shadow-md ${
        isDragging ? 'opacity-50' : ''
      } ${isCompleted ? 'bg-muted/30' : 'bg-card hover:bg-muted/20'}`}
    >
      <div className="flex gap-2 items-start">
        <GripVertical className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h4 className={`font-medium text-sm mb-1 cursor-pointer hover:underline ${
            isCompleted ? 'line-through text-muted-foreground' : ''
          }`} onClick={() => router.push(getTaskRoute(task))}>
            {task.title}
          </h4>
          <div className="flex flex-wrap gap-2 items-center mb-2">
            <Badge variant={STATUS_COLOR[task.status] ?? 'outline'} className="text-xs">
              {task.status.replace('_', ' ')}
            </Badge>
            <Badge variant={PRIORITY_COLOR[task.priority] ?? 'outline'} className="text-xs w-7 justify-center">
              {task.priority}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            {task.assignee && (
              <div className="flex items-center justify-between">
                <span>📌 {task.assignee.name || task.assignee.email}</span>
              </div>
            )}
            {task.deadlineDt && (
              <div className={isOverdue ? 'text-destructive font-medium' : ''}>
                📅 {new Date(task.deadlineDt).toLocaleDateString()}
                {isOverdue && ' ⚠'}
              </div>
            )}
            <div className="text-xs text-muted-foreground/70">
              {task.project.org.name} / {task.project.name}
            </div>
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => { e.stopPropagation(); handleTogglePriority(); }}
              >
                <Star className={`h-3.5 w-3.5 ${hasTask(task.id) ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add to priority list</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

// ─── group view component ────────────────────────────────────────────────────

function GroupView({ tasks, groupBy, onTaskMove, onUpdated }: {
  tasks: AllTask[];
  groupBy: GroupByField;
  onTaskMove: (taskId: string, newGroupKey: string) => Promise<void>;
  onUpdated: () => void;
}) {
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);

  const groupedTasks = useMemo(() => {
    const groups: Record<string, AllTask[]> = {};
    tasks.forEach(task => {
      const key = getGroupKey(task, groupBy);
      if (!groups[key]) groups[key] = [];
      groups[key].push(task);
    });
    return groups;
  }, [tasks, groupBy]);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTask(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetGroupKey: string) => {
    e.preventDefault();
    if (!draggedTask) return;

    const draggedTaskObj = tasks.find(t => t.id === draggedTask);
    if (!draggedTaskObj) return;

    const sourceGroupKey = getGroupKey(draggedTaskObj, groupBy);
    if (sourceGroupKey === targetGroupKey) {
      setDraggedTask(null);
      return;
    }

    setIsMoving(true);
    try {
      await onTaskMove(draggedTask, targetGroupKey);
      onUpdated();
      setDraggedTask(null);
    } finally {
      setIsMoving(false);
    }
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
  };

  return (
    <div className="space-y-4">
      {Object.entries(groupedTasks).map(([groupKey, groupTasks]) => (
        <div key={groupKey} className="border rounded-lg overflow-hidden">
          <div className="bg-muted/50 px-4 py-3 border-b flex items-center justify-between">
            <h3 className="font-semibold text-sm">
              {getGroupLabel(groupKey, groupBy, tasks)}
              <Badge variant="outline" className="ml-2">{groupTasks.length}</Badge>
            </h3>
          </div>
          <div
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, groupKey)}
            onDragEnd={handleDragEnd}
            className="p-4 space-y-3 min-h-[200px] bg-card"
          >
            {groupTasks.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                No tasks in this group
              </div>
            ) : (
              groupTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isDragging={draggedTask === task.id}
                  onDragStart={handleDragStart}
                  onUpdated={onUpdated}
                />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── stats card ──────────────────────────────────────────────────────────────

function StatsCard({ tasks }: { tasks: AllTask[] }) {
  const total = tasks.length;
  const completed = tasks.filter(t => isCompletedTask(t.status)).length;
  const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS').length;
  const overdue = tasks.filter(isOverdueTask).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card className="p-3">
        <div className="text-sm text-muted-foreground">Total Tasks</div>
        <div className="text-2xl font-bold">{total}</div>
      </Card>
      <Card className="p-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-500" />
          <span className="text-sm text-muted-foreground">In Progress</span>
        </div>
        <div className="text-2xl font-bold">{inProgress}</div>
      </Card>
      <Card className="p-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span className="text-sm text-muted-foreground">Completed</span>
        </div>
        <div className="text-2xl font-bold">{completed}</div>
      </Card>
      {overdue > 0 && (
        <Card className="p-3 border-destructive/50 bg-destructive/5">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-muted-foreground">Overdue</span>
          </div>
          <div className="text-2xl font-bold text-destructive">{overdue}</div>
        </Card>
      )}
    </div>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────

export default function AllTasksPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { addTask, removeTask, hasTask, isLoaded, applyHighlight } = usePriorityTaskList();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'priority' | 'deadline' | 'created'>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewType, setViewType] = useState<ViewType>('list');
  const [groupBy, setGroupBy] = useState<GroupByField>('status');

  // Multi-select filter state
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [orgFilter, setOrgFilter] = useState<string[]>([]);
  const [userFilter, setUserFilter] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Dialogs
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [editTask, setEditTask] = useState<AllTask | null>(null);
  const [subtaskData, setSubtaskData] = useState<{ task: AllTask; orgId: string; projectId: string } | null>(null);
  const [subtaskModalOpen, setSubtaskModalOpen] = useState(false);

  const { data: tasksData, isLoading, error } = useAllTasks({ sortBy, sortOrder, page, limit: 100 });

  const tasks = tasksData?.tasks ?? [];
  const totalPages = tasksData?.totalPages ?? 0;
  const currentPage = tasksData?.page ?? 1;

  const refreshAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['all-tasks'] });
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
  const allFilteredTasks = useMemo(() => tasks.filter((task) => {
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

  // Separate parent and child tasks for list view
  const parentTasks = useMemo(() =>
    allFilteredTasks.filter((t) => !t.parentId),
    [allFilteredTasks]
  );

  const childTasksByParent = useMemo(() => {
    const map = new Map<string, AllTask[]>();
    allFilteredTasks.filter((t) => t.parentId).forEach((t) => {
      if (!map.has(t.parentId!)) {
        map.set(t.parentId!, []);
      }
      map.get(t.parentId!)!.push(t);
    });
    return map;
  }, [allFilteredTasks]);

  const filteredTasks = allFilteredTasks;

  const activeFilterCount = orgFilter.length + statusFilter.length + priorityFilter.length + userFilter.length;

  function resetFilters() {
    setOrgFilter([]); setStatusFilter([]); setPriorityFilter([]); setUserFilter([]);
    setSearch('');
    setPage(1);
  }

  const handleTaskMove = async (taskId: string, newGroupKey: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const updates: any = {};

    switch (groupBy) {
      case 'assignee': {
        if (newGroupKey === 'unassigned') {
          updates.assigneeUserId = null;
        } else {
          updates.assigneeUserId = newGroupKey;
        }
        break;
      }
      case 'status': {
        updates.status = newGroupKey;
        break;
      }
      case 'priority': {
        updates.priority = newGroupKey;
        break;
      }
      case 'project': {
        toast({ title: 'Cannot change project via drag & drop', variant: 'destructive' });
        return;
      }
      case 'org': {
        toast({ title: 'Cannot change organization via drag & drop', variant: 'destructive' });
        return;
      }
      case 'deadline': {
        toast({ title: 'Cannot change deadline via drag & drop', variant: 'destructive' });
        return;
      }
    }

    try {
      await api.patch(
        `/orgs/${task.project.orgId}/projects/${task.project.id}/tasks/${task.id}`,
        updates
      );
      toast({ title: 'Task updated successfully' });
    } catch (err) {
      toast({ title: 'Failed to update task', variant: 'destructive' });
    }
  };

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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">All Tasks</h1>
            <p className="text-muted-foreground">Manage all tasks across your organisations</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewType === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    className="gap-2"
                    onClick={() => setViewType('list')}
                  >
                    <List className="h-4 w-4" />
                    List
                  </Button>
                </TooltipTrigger>
                <TooltipContent>List View</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewType === 'group' ? 'default' : 'ghost'}
                    size="sm"
                    className="gap-2"
                    onClick={() => setViewType('group')}
                  >
                    <LayoutGrid className="h-4 w-4" />
                    Group
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Group View</TooltipContent>
              </Tooltip>
            </div>
            <Button onClick={() => setAddTaskOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Task
            </Button>
          </div>
        </div>

        {/* Stats */}
        {!isLoading && tasks.length > 0 && (
          <StatsCard tasks={filteredTasks.length > 0 ? filteredTasks : tasks} />
        )}

        {/* Main Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle>Tasks</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                {viewType === 'group' && (
                  <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupByField)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GROUP_BY_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
                    <button onClick={resetFilters} className="ml-1 hover:opacity-70" title="Clear all filters">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="gap-2"
                >
                  <Filter className="h-4 w-4" />
                  {showFilters ? 'Hide' : 'Show'} Filters
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Search */}
              <div className="flex gap-2">
                <Input
                  placeholder="Search by title or description…"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="flex-1"
                />
                {search && (
                  <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setPage(1); }}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Filters - Collapsible */}
              {showFilters && (
                <div className="border-t pt-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2">
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
                      maxBadges={2}
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
                    {activeFilterCount > 0 && (
                      <Button variant="outline" size="sm" onClick={resetFilters} className="gap-2">
                        <RotateCcw className="h-4 w-4" />
                        Reset
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                  <div>
                    <p className="font-medium text-destructive">Failed to load tasks</p>
                    <p className="text-sm text-muted-foreground">Please try refreshing the page</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={refreshAll} className="ml-auto">
                    Retry
                  </Button>
                </div>
              )}

              {/* Loading State */}
              {isLoading ? (
                <Loading text="Loading tasks…" />
              ) : parentTasks.length === 0 ? (
                <div className="rounded-lg border border-dashed p-12 text-center space-y-3">
                  <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto opacity-50" />
                  <div>
                    <h3 className="font-medium text-muted-foreground">
                      {search || activeFilterCount > 0 ? 'No tasks found' : 'No tasks yet'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {search || activeFilterCount > 0
                        ? 'Try adjusting your search or filters'
                        : 'Create your first task to get started'}
                    </p>
                  </div>
                  {(search || activeFilterCount > 0) && (
                    <Button variant="outline" size="sm" onClick={resetFilters} className="gap-2">
                      <RotateCcw className="h-4 w-4" />
                      Clear Filters
                    </Button>
                  )}
                  {!search && activeFilterCount === 0 && (
                    <Button size="sm" onClick={() => setAddTaskOpen(true)} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add First Task
                    </Button>
                  )}
                </div>
              ) : viewType === 'list' ? (
                // LIST VIEW
                <>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">
                            <Button variant="ghost" size="sm" className="h-7 px-1 -ml-1" onClick={() => handleSort('priority')}>
                              Priority <SortIcon field="priority" />
                            </Button>
                          </TableHead>
                          <TableHead className="min-w-[200px]">Title</TableHead>
                          <TableHead className="w-[140px]">Status</TableHead>
                          <TableHead className="w-[130px]">Assignee</TableHead>
                          <TableHead className="w-[130px]">Org / Project</TableHead>
                          <TableHead className="w-[100px]">
                            <Button variant="ghost" size="sm" className="h-7 px-1 -ml-1" onClick={() => handleSort('deadline')}>
                              Deadline <SortIcon field="deadline" />
                            </Button>
                          </TableHead>
                          <TableHead className="w-[60px] text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parentTasks.map((task, idx) => {
                          const isCompleted = isCompletedTask(task.status);
                          const isOverdue = isOverdueTask(task);
                          const subtasks = childTasksByParent.get(task.id) || [];
                          const hasSubtasks = subtasks.length > 0;

                          return (
                            <>
                            <TableRow
                              key={task.id}
                              id={`task-row-${task.id}`}
                              className={`group cursor-pointer transition-colors font-semibold border-b-2 border-muted ${
                                isCompleted ? 'bg-muted/20 hover:bg-muted/40' : 'bg-card hover:bg-muted/30'
                              } ${hasSubtasks ? 'border-l-4 border-l-primary' : ''}`}
                              onClick={() => applyHighlight(task.id)}
                            >
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <PrioritySelect task={task} onUpdated={refreshAll} />
                              </TableCell>
                              <TableCell
                                className={`font-medium cursor-pointer hover:underline max-w-[240px] ${
                                  isCompleted ? 'line-through text-muted-foreground' : ''
                                }`}
                                onDoubleClick={(e) => {
                                  e.stopPropagation();
                                  router.push(getTaskRoute(task));
                                }}
                              >
                                <div>
                                  <span className="truncate block">{task.title}</span>
                                  {task.reviewer && (
                                    <span className="text-xs text-muted-foreground block">
                                      Rev: {task.reviewer.name || task.reviewer.email}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <StatusSelect task={task} onUpdated={refreshAll} />
                              </TableCell>
                              <TableCell className={`text-sm ${isCompleted ? 'text-muted-foreground' : ''}`}>
                                {task.assignee ? (
                                  <button
                                    className={`text-left hover:underline ${
                                      isCompleted
                                        ? 'text-muted-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                    onClick={(e) => { e.stopPropagation(); router.push(`/orgs/${task.project.orgId}/members/${task.assignee!.id}`); }}
                                  >
                                    {task.assignee.name || task.assignee.email}
                                  </button>
                                ) : <span className="text-muted-foreground">—</span>}
                              </TableCell>
                              <TableCell className={`text-xs ${isCompleted ? 'text-muted-foreground' : ''}`}>
                                <button
                                  className={`block truncate hover:underline text-left w-full ${
                                    isCompleted ? 'text-muted-foreground' : 'text-muted-foreground hover:text-foreground'
                                  }`}
                                  onClick={(e) => { e.stopPropagation(); router.push(`/orgs/${task.project.orgId}/overview`); }}
                                >{task.project.org.name}</button>
                                <button
                                  className={`block truncate hover:underline text-left w-full ${
                                    isCompleted ? 'text-muted-foreground/60' : 'text-muted-foreground/70 hover:text-foreground'
                                  }`}
                                  onClick={(e) => { e.stopPropagation(); router.push(`/orgs/${task.project.orgId}/projects/${task.project.id}/dashboard`); }}
                                >{task.project.name}</button>
                              </TableCell>
                              <TableCell className={`text-sm ${isCompleted ? 'text-muted-foreground' : ''}`}>
                                {task.deadlineDt ? (
                                  <span className={isOverdue ? 'text-destructive font-medium' : ''}>
                                    {new Date(task.deadlineDt).toLocaleDateString()}
                                    {isOverdue && <span className="ml-1 text-xs">⚠</span>}
                                  </span>
                                ) : <span className="text-muted-foreground">—</span>}
                              </TableCell>
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <div className="flex gap-1 items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (hasTask(task.id)) {
                                            removeTask(task.id);
                                          } else {
                                            addTask({
                                              taskId: task.id,
                                              orgId: task.project.orgId,
                                              projectId: task.project.id,
                                              title: task.title,
                                              priority: task.priority,
                                              status: task.status,
                                              assigneeId: task.assignee?.email,
                                            });
                                          }
                                        }}
                                      >
                                        <Star className={`h-3.5 w-3.5 ${hasTask(task.id) ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'}`} />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>{hasTask(task.id) ? 'Remove from priority list' : 'Add to priority list'}</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => {
                                          setSubtaskData({ task, orgId: task.project.orgId, projectId: task.project.id });
                                          setSubtaskModalOpen(true);
                                        }}
                                      >
                                        <GitBranch className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Add subtask</TooltipContent>
                                  </Tooltip>
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
                            {(childTasksByParent.get(task.id) || []).map((subtask) => {
                              const subtaskCompleted = isCompletedTask(subtask.status);
                              const subtaskOverdue = isOverdueTask(subtask);

                              return (
                                <TableRow
                                  key={subtask.id}
                                  id={`task-row-${subtask.id}`}
                                  className={`group cursor-pointer transition-colors bg-amber-50/60 border-l-4 border-l-amber-400 hover:bg-amber-100/40 ${
                                    subtaskCompleted ? 'opacity-60' : ''
                                  }`}
                                  onClick={() => applyHighlight(subtask.id)}
                                >
                                  <TableCell className="pl-16" onClick={(e) => e.stopPropagation()}>
                                    <PrioritySelect task={subtask} onUpdated={refreshAll} />
                                  </TableCell>
                                  <TableCell
                                    className={`font-medium cursor-pointer hover:underline max-w-[240px] ${
                                      subtaskCompleted ? 'line-through text-muted-foreground' : ''
                                    }`}
                                    onDoubleClick={(e) => {
                                      e.stopPropagation();
                                      router.push(getTaskRoute(subtask));
                                    }}
                                  >
                                    <div className="pl-8">
                                      <span className="truncate block">↳ {subtask.title}</span>
                                      {subtask.reviewer && (
                                        <span className="text-xs text-muted-foreground block">
                                          Rev: {subtask.reviewer.name || subtask.reviewer.email}
                                        </span>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell onClick={(e) => e.stopPropagation()}>
                                    <StatusSelect task={subtask} onUpdated={refreshAll} />
                                  </TableCell>
                                  <TableCell className={`text-sm ${subtaskCompleted ? 'text-muted-foreground' : ''}`}>
                                    {subtask.assignee ? (
                                      <button
                                        className={`text-left hover:underline ${
                                          subtaskCompleted
                                            ? 'text-muted-foreground'
                                            : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                        onClick={(e) => { e.stopPropagation(); router.push(`/orgs/${subtask.project.orgId}/members/${subtask.assignee!.id}`); }}
                                      >
                                        {subtask.assignee.name || subtask.assignee.email}
                                      </button>
                                    ) : <span className="text-muted-foreground">—</span>}
                                  </TableCell>
                                  <TableCell className={`text-xs ${subtaskCompleted ? 'text-muted-foreground' : ''}`}>
                                    <button
                                      className={`block truncate hover:underline text-left w-full ${
                                        subtaskCompleted ? 'text-muted-foreground' : 'text-muted-foreground hover:text-foreground'
                                      }`}
                                      onClick={(e) => { e.stopPropagation(); router.push(`/orgs/${subtask.project.orgId}/overview`); }}
                                    >{subtask.project.org.name}</button>
                                    <button
                                      className={`block truncate hover:underline text-left w-full ${
                                        subtaskCompleted ? 'text-muted-foreground/60' : 'text-muted-foreground/70 hover:text-foreground'
                                      }`}
                                      onClick={(e) => { e.stopPropagation(); router.push(`/orgs/${subtask.project.orgId}/projects/${subtask.project.id}/dashboard`); }}
                                    >{subtask.project.name}</button>
                                  </TableCell>
                                  <TableCell className={`text-sm ${subtaskCompleted ? 'text-muted-foreground' : ''}`}>
                                    {subtask.deadlineDt ? (
                                      <span className={subtaskOverdue ? 'text-destructive font-medium' : ''}>
                                        {new Date(subtask.deadlineDt).toLocaleDateString()}
                                        {subtaskOverdue && <span className="ml-1 text-xs">⚠</span>}
                                      </span>
                                    ) : <span className="text-muted-foreground">—</span>}
                                  </TableCell>
                                  <TableCell onClick={(e) => e.stopPropagation()}>
                                    <div className="flex gap-1 items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (hasTask(subtask.id)) {
                                                removeTask(subtask.id);
                                              } else {
                                                addTask({
                                                  taskId: subtask.id,
                                                  orgId: subtask.project.orgId,
                                                  projectId: subtask.project.id,
                                                  title: subtask.title,
                                                  priority: subtask.priority,
                                                  status: subtask.status,
                                                  assigneeId: subtask.assignee?.email,
                                                });
                                              }
                                            }}
                                          >
                                            <Star className={`h-3.5 w-3.5 ${hasTask(subtask.id) ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'}`} />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>{hasTask(subtask.id) ? 'Remove from priority list' : 'Add to priority list'}</TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() => {
                                              setSubtaskData({ task: subtask, orgId: subtask.project.orgId, projectId: subtask.project.id });
                                              setSubtaskModalOpen(true);
                                            }}
                                          >
                                            <GitBranch className="h-3.5 w-3.5" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Add subtask</TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditTask(subtask)}>
                                            <Pencil className="h-3.5 w-3.5" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Edit task</TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => router.push(getTaskRoute(subtask))}>
                                            <ExternalLink className="h-3.5 w-3.5" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Open task</TooltipContent>
                                      </Tooltip>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                            </>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      className="gap-2"
                    >
                      <ChevronLeft className="h-4 w-4" /> Previous
                    </Button>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Page {currentPage} of {totalPages || 1}</span>
                      <span>•</span>
                      <span>{filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''} shown</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={currentPage >= totalPages}
                      className="gap-2"
                    >
                      Next <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              ) : (
                // GROUP VIEW
                <GroupView
                  tasks={filteredTasks}
                  groupBy={groupBy}
                  onTaskMove={handleTaskMove}
                  onUpdated={refreshAll}
                />
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
