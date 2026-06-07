'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateTask } from '@/hooks/tasks/useTasks';
import { useProjectTeamMembers } from '@/hooks/organization';
import { useLastTaskValues } from '@/hooks/tasks/useLastTaskValues';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useToast } from '@/components/ui/use-toast';
import { AlertCircle, CheckCircle, Copy } from 'lucide-react';

const bulkCreateTaskSchema = z.object({
  taskNames: z.string().min(1, 'At least one task name is required'),
  type: z.enum(['BUG', 'FEATURE', 'TASK', 'CHANGE', 'RESEARCH', 'OTHER']),
  priority: z.enum(['P0', 'P1', 'P2', 'P3', 'P4']),
  assigneeUserId: z.string().uuid().optional().nullable(),
});

type BulkCreateTaskForm = z.infer<typeof bulkCreateTaskSchema>;

interface BulkCreateTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  projectId: string;
  lastValues?: Omit<BulkCreateTaskForm, 'taskNames'>;
}

export function BulkCreateTaskModal({
  open,
  onOpenChange,
  orgId,
  projectId,
  lastValues,
}: BulkCreateTaskModalProps) {
  const { data: membersData } = useProjectTeamMembers(orgId, projectId);
  const createTask = useCreateTask(orgId, projectId);
  const { toast } = useToast();
  const { save: saveLastValues } = useLastTaskValues(projectId);
  const [isCreating, setIsCreating] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const form = useForm<BulkCreateTaskForm>({
    resolver: zodResolver(bulkCreateTaskSchema),
    defaultValues: lastValues || {
      type: 'TASK',
      priority: 'P2',
      assigneeUserId: null,
      taskNames: '',
    },
  });

  const { reset, watch } = form;
  const members = membersData?.members ?? [];
  const taskNamesValue = watch('taskNames');

  // Count tasks from textarea
  const taskNames = taskNamesValue
    .split('\n')
    .map((name) => name.trim())
    .filter((name) => name.length > 0);

  useEffect(() => {
    if (open) {
      reset(lastValues || {
        type: 'TASK',
        priority: 'P2',
        assigneeUserId: null,
        taskNames: '',
      });
      setCreatedCount(0);
      setTotalCount(0);
    }
  }, [open, lastValues, reset]);

  const onSubmit = async (data: BulkCreateTaskForm) => {
    const tasksToCreate = taskNames;

    if (tasksToCreate.length === 0) {
      toast({
        title: 'Error',
        description: 'Please enter at least one task name',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    setTotalCount(tasksToCreate.length);
    setCreatedCount(0);

    let successCount = 0;
    const failedTasks: string[] = [];

    for (const taskName of tasksToCreate) {
      try {
        await createTask.mutateAsync({
          title: taskName,
          type: data.type,
          priority: data.priority,
          assigneeUserId: data.assigneeUserId || undefined,
          status: 'BACKLOG',
        });

        successCount++;
        setCreatedCount(successCount);
      } catch (error: any) {
        failedTasks.push(taskName);
        console.error(`Failed to create task: ${taskName}`, error);
      }
    }

    // Save last values for next time
    saveLastValues({
      type: data.type,
      priority: data.priority,
      assigneeUserId: data.assigneeUserId || null,
    });

    setIsCreating(false);

    if (failedTasks.length === 0) {
      toast({
        title: 'Success',
        description: `Created ${successCount} task${successCount !== 1 ? 's' : ''}`,
      });
      onOpenChange(false);
      reset();
    } else {
      toast({
        title: 'Partial Success',
        description: `Created ${successCount} of ${tasksToCreate.length} tasks. Failed: ${failedTasks.join(', ')}`,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>🚀 Bulk Create Tasks</DialogTitle>
          <DialogDescription>
            Paste multiple task names (one per line) and create them all at once
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Task Names Textarea */}
            <FormField
              control={form.control}
              name="taskNames"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Task Names (one per line)
                    {taskNames.length > 0 && (
                      <span className="text-xs ml-2 text-muted-foreground">
                        {taskNames.length} task{taskNames.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={`Bug: Login page not responding\nFeature: Add dark mode\nTask: Update documentation\nBug: Fix typo in header`}
                      rows={8}
                      {...field}
                      disabled={isCreating}
                      className="font-mono text-sm"
                    />
                  </FormControl>
                  <FormMessage />
                  <div className="text-xs text-muted-foreground mt-2">
                    💡 Tip: Paste one task name per line. Empty lines are ignored.
                  </div>
                </FormItem>
              )}
            />

            {/* Configuration Fields */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type (all tasks)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isCreating}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="TASK">Task</SelectItem>
                        <SelectItem value="BUG">Bug</SelectItem>
                        <SelectItem value="FEATURE">Feature</SelectItem>
                        <SelectItem value="CHANGE">Change</SelectItem>
                        <SelectItem value="RESEARCH">Research</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority (all tasks)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isCreating}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="P0">P0 - Critical</SelectItem>
                        <SelectItem value="P1">P1 - High</SelectItem>
                        <SelectItem value="P2">P2 - Medium</SelectItem>
                        <SelectItem value="P3">P3 - Low</SelectItem>
                        <SelectItem value="P4">P4 - Lowest</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="assigneeUserId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assignee (all tasks)</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                    value={field.value || 'none'}
                    disabled={isCreating}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {members.map((member) => (
                        <SelectItem key={member.user.id} value={member.user.id}>
                          {member.user.name || member.user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Progress Display */}
            {isCreating && totalCount > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="animate-spin">⏳</div>
                  <span className="font-medium text-sm">
                    Creating tasks... {createdCount} of {totalCount}
                  </span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${(createdCount / totalCount) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Summary */}
            {taskNames.length > 0 && !isCreating && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm">
                <div className="font-medium mb-2">Summary:</div>
                <ul className="space-y-1 text-xs">
                  <li>📝 <strong>Tasks to create:</strong> {taskNames.length}</li>
                  <li>🏷️ <strong>Type:</strong> {form.getValues('type')}</li>
                  <li>⚡ <strong>Priority:</strong> {form.getValues('priority')}</li>
                  <li>
                    👤 <strong>Assignee:</strong>{' '}
                    {form.getValues('assigneeUserId')
                      ? members.find((m) => m.user.id === form.getValues('assigneeUserId'))?.user.name ||
                        members.find((m) => m.user.id === form.getValues('assigneeUserId'))?.user.email
                      : 'Unassigned'}
                  </li>
                </ul>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isCreating || taskNames.length === 0}
              >
                {isCreating
                  ? `Creating ${createdCount}/${totalCount}...`
                  : `Create ${taskNames.length} Task${taskNames.length !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
