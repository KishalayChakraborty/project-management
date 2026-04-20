'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useMyWorkLogs, useCreateMyWorkLog } from '@/hooks/work-logs/useWorkLogs';
import { useTasks } from '@/hooks/tasks/useTasks';
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

export default function MemberWorkLogsPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const projectId = params.projectId as string;
  const { data: session } = useSession();
  const userId = session?.user?.id ?? '';

  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'duration'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [logMinutes, setLogMinutes] = useState<string>('');
  const [logTaskId, setLogTaskId] = useState<string>('none');

  const { data: myTasksData } = useTasks(orgId, projectId, { assigneeId: userId ?? undefined });
  const createWorkLog = useCreateMyWorkLog(orgId, projectId);

  const { data: workLogsData, isLoading } = useMyWorkLogs(
    orgId,
    projectId,
    userId || undefined,
    page,
    sortBy,
    sortOrder,
    startDate || undefined,
    endDate || undefined
  );

  useEffect(() => {
    setPage(1);
  }, [startDate, endDate]);

  const handleSort = (field: 'date' | 'duration') => {
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
    <div className="space-y-4">
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

      <Card>
        <CardHeader>
          <CardTitle>My Work Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2 items-center flex-wrap">
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
              <Select
                value={`${sortBy}-${sortOrder}`}
                onValueChange={(v) => {
                  const [s, o] = v.split('-') as ['date' | 'duration', 'asc' | 'desc'];
                  setSortBy(s);
                  setSortOrder(o);
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Date (newest)</SelectItem>
                  <SelectItem value="date-asc">Date (oldest)</SelectItem>
                  <SelectItem value="duration-desc">Duration (highest)</SelectItem>
                  <SelectItem value="duration-asc">Duration (lowest)</SelectItem>
                </SelectContent>
              </Select>
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
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {log.segments.length} segment
                              {log.segments.length !== 1 ? 's' : ''}
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
