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
import { Plus } from 'lucide-react';

const quickAddSubtaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  type: z.enum(['BUG', 'FEATURE', 'TASK', 'CHANGE', 'RESEARCH', 'OTHER']),
  priority: z.enum(['P0', 'P1', 'P2', 'P3', 'P4']),
  assigneeUserId: z.string().uuid().optional().nullable(),
});

type QuickAddSubtaskForm = z.infer<typeof quickAddSubtaskSchema>;

interface QuickAddSubtaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  projectId: string;
  parentTaskId: string;
  parentTaskTitle: string;
}

export function QuickAddSubtaskModal({
  open,
  onOpenChange,
  orgId,
  projectId,
  parentTaskId,
  parentTaskTitle,
}: QuickAddSubtaskModalProps) {
  const { data: membersData } = useProjectTeamMembers(orgId, projectId);
  const createTask = useCreateTask(orgId, projectId);
  const { toast } = useToast();

  const form = useForm<QuickAddSubtaskForm>({
    resolver: zodResolver(quickAddSubtaskSchema),
    defaultValues: {
      type: 'TASK',
      priority: 'P2',
      assigneeUserId: null,
    },
  });

  const { reset } = form;
  const members = membersData?.members ?? [];

  useEffect(() => {
    if (open) {
      reset({
        type: 'TASK',
        priority: 'P2',
        assigneeUserId: null,
      });
    }
  }, [open, reset]);

  const onSubmit = async (data: QuickAddSubtaskForm) => {
    try {
      await createTask.mutateAsync({
        parentId: parentTaskId,
        title: data.title,
        type: data.type,
        priority: data.priority,
        assigneeUserId: data.assigneeUserId || undefined,
        status: 'TODO',
      });

      toast({
        title: 'Success',
        description: 'Subtask created',
      });

      form.setValue('title', '');
      form.setFocus('title');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to create subtask',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-blue-500" />
            Add Subtask
          </DialogTitle>
          <div className="text-sm text-muted-foreground mt-2">
            For: <span className="font-medium text-foreground">{parentTaskTitle}</span>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subtask Title *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Subtask title..."
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
                {createTask.isPending ? 'Creating...' : 'Add Subtask'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
