'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useWorkLogs, useCreateMyWorkLog } from '@/hooks/work-logs/useWorkLogs';
import { useOrganizationMembers } from '@/hooks/organization';
import { useTasks } from '@/hooks/tasks/useTasks';
import { useDebounce } from '@/hooks/useDebounce';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { ArrowUpDown, ArrowUp, ArrowDown, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Loading } from '@/components/ui/loading';

export default function ProjectWorkLogsPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const projectId = params.projectId as string;
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [userIdFilter, setUserIdFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'duration' | 'user'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Log time state
  const [logMinutes, setLogMinutes] = useState<string>('');
  const [logTaskId, setLogTaskId] = useState<string>('none');

  const { data: workLogsData, isLoading } = useWorkLogs(
    orgId,
    projectId,
    page,
    debouncedSearch || undefined,
    sortBy,
    sortOrder,
    userIdFilter !== 'all' ? userIdFilter : undefined,
    startDate || undefined,
    endDate || undefined
  );

  const { data: orgMembersData } = useOrganizationMembers(orgId, 1);
  const { data: myTasksData } = useTasks(orgId, projectId, { assigneeId: userId ?? undefined });
  const createWorkLog = useCreateMyWorkLog(orgId, projectId);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, userIdFilter, startDate, endDate]);

  const handleSort = (field: 'date' | 'duration' | 'user') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const SortIcon = ({ field }: { field: typeof sortBy }) => {
    if (sortBy !== field) return <ArrowUpDown className="h-4 w-4 ml-1" />;
    return sortOrder === 'asc' ? (
      <ArrowUp className="h-4 w-4 ml-1" />
    ) : (
      <ArrowDown className="h-4 w-4 ml-1" />
    );
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const handleLogTime = () => {
    const minutes = parseInt(logMinutes, 10);
    if (Number.isNaN(minutes) || minutes < 1) return;
    createWorkLog.mutate(
      {
        totalDurationMin: minutes,
        taskId: logTaskId === 'none' ? null : logTaskId,
      },
      {
        onSuccess: () => {
          setLogMinutes('');
          setLogTaskId('none');
        },
      }
    );
  };

  const myTasks = myTasksData?.tasks ?? [];

  return (
    <div className="container mx-auto py-8 space-y-4">
      {/* Log time card */}
      <Card>
        <CardHeader>
          <CardTitle>Log time</CardTitle>
          <CardDescription>Record time spent on this project</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end flex-wrap">
            <div className="space-y-2">
              <Label htmlFor="log-minutes">Duration (minutes)</Label>
              <Input
                id="log-minutes"
                type="number"
                min={1}
                placeholder="e.g. 60"
                value={logMinutes}
                onChange={(e) => setLogMinutes(e.target.value)}
                className="w-[120px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="log-task">Task (optional)</Label>
              <Select value={logTaskId} onValueChange={setLogTaskId}>
                <SelectTrigger id="log-task" className="w-[220px]">
                  <SelectValue placeholder="No task" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No task</SelectItem>
                  {myTasks.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleLogTime}
              disabled={createWorkLog.isPending || !logMinutes.trim()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Log time
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* All work logs card */}
      <Card>
        <CardHeader>
          <CardTitle>Work Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2 items-center flex-wrap">
              <Input
                placeholder="Search by user name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 min-w-[200px]"
              />
              <div className="flex gap-2 items-center">
                <Label htmlFor="user-filter" className="whitespace-nowrap">
                  User:
                </Label>
                <Select value={userIdFilter} onValueChange={setUserIdFilter}>
                  <SelectTrigger id="user-filter" className="w-[150px]">
                    <SelectValue placeholder="All Users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {orgMembersData?.members.map((member: any) => (
                      <SelectItem key={member.user.id} value={member.user.id}>
                        {member.user.name || member.user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 items-center">
                <Label htmlFor="start-date" className="whitespace-nowrap">
                  From:
                </Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-[150px]"
                />
              </div>
              <div className="flex gap-2 items-center">
                <Label htmlFor="end-date" className="whitespace-nowrap">
                  To:
                </Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-[150px]"
                />
              </div>
            </div>

            {isLoading ? (
              <Loading text="Loading work logs..." />
            ) : !workLogsData || workLogsData.workLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No work logs found
              </div>
            ) : (
              <>
                <div className="rounded-md border max-h-[60vh] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => handleSort('date')}
                          >
                            Date
                            <SortIcon field="date" />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => handleSort('duration')}
                          >
                            Duration
                            <SortIcon field="duration" />
                          </Button>
                        </TableHead>
                        <TableHead>Task</TableHead>
                        <TableHead>Segments</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workLogsData.workLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            {log.user.name || log.user.email}
                          </TableCell>
                          <TableCell>
                            {new Date(log.createdAt).toLocaleDateString()}
                            <div className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(log.createdAt), {
                                addSuffix: true,
                              })}
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatDuration(log.totalDurationMin)}
                          </TableCell>
                          <TableCell>
                            {log.task ? (
                              <span className="font-medium">{log.task.title}</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {log.segments.length} segment{log.segments.length !== 1 ? 's' : ''}
                            </div>
                            {log.segments.length > 0 && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {log.segments
                                  .map(
                                    (seg) =>
                                      `${new Date(seg.startDt).toLocaleTimeString()} - ${new Date(seg.endDt).toLocaleTimeString()}`
                                  )
                                  .join(', ')}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    {workLogsData.pagination.hasPrev && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Page {workLogsData.pagination.page} of {workLogsData.pagination.totalPages}
                  </div>
                  <div>
                    {workLogsData.pagination.hasNext && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

