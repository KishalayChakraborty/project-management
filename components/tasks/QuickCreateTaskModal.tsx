'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateTask } from '@/hooks/tasks/useTasks';
import { useProjectTeamMembers } from '@/hooks/organization';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
} from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useToast } from '@/components/ui/use-toast';
import { useLastTaskValues } from '@/hooks/tasks/useLastTaskValues';
import { Zap } from 'lucide-react';

const quickCreateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  type: z.enum(['BUG', 'FEATURE', 'TASK', 'CHANGE', 'RESEARCH', 'OTHER']),
  priority: z.enum(['P0', 'P1', 'P2', 'P3', 'P4']),
  assigneeUserId: z.string().uuid().optional().nullable(),
});

type QuickCreateTaskForm = z.infer<typeof quickCreateTaskSchema>;

interface QuickCreateTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  projectId: string;
  lastValues?: Omit<QuickCreateTaskForm, 'title'>;
}

export function QuickCreateTaskModal({
  open,
  onOpenChange,
  orgId,
  projectId,
  lastValues,
}: QuickCreateTaskModalProps) {
  const { data: membersData } = useProjectTeamMembers(orgId, projectId);
  const createTask = useCreateTask(orgId, projectId);
  const { toast } = useToast();
  const { save: saveLastValues } = useLastTaskValues(projectId);

  const form = useForm<QuickCreateTaskForm>({
    resolver: zodResolver(quickCreateTaskSchema),
    defaultValues: lastValues || {
      type: 'TASK',
      priority: 'P2',
      assigneeUserId: null,
    },
  });

  const { reset } = form;
  const members = membersData?.members ?? [];

  useEffect(() => {
    if (open) {
      reset(lastValues || {
        type: 'TASK',
        priority: 'P2',
        assigneeUserId: null,
      });
    }
  }, [open, lastValues, reset]);

  const onSubmit = async (data: QuickCreateTaskForm) => {
    try {
      await createTask.mutateAsync({
        title: data.title,
        type: data.type,
        priority: data.priority,
        assigneeUserId: data.assigneeUserId || undefined,
        status: 'BACKLOG',
      });

      saveLastValues({
        type: data.type,
        priority: data.priority,
        assigneeUserId: data.assigneeUserId || null,
      });

      toast({
        title: 'Success',
        description: 'Task created',
      });

      form.setValue('title', '');
      form.setFocus('title');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to create task',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Quick Create Task
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Task title..."
                      {...field}
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
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
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="P0">P0</SelectItem>
                        <SelectItem value="P1">P1</SelectItem>
                        <SelectItem value="P2">P2</SelectItem>
                        <SelectItem value="P3">P3</SelectItem>
                        <SelectItem value="P4">P4</SelectItem>
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
                  <FormLabel>Assignee</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                    value={field.value || 'none'}
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

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={createTask.isPending}
              >
                {createTask.isPending ? 'Creating...' : 'Add & Continue'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
