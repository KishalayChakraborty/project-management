'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useCreateTask } from '@/hooks/tasks/useTasks';
import { useProjectTeamMembers } from '@/hooks/organization';
import { useToast } from '@/components/ui/use-toast';
import { useLastTaskValues } from '@/hooks/tasks/useLastTaskValues';
import { Plus, X } from 'lucide-react';

interface InlineQuickAddTaskProps {
  orgId: string;
  projectId: string;
  onTaskCreated?: () => void;
}

export function InlineQuickAddTask({
  orgId,
  projectId,
  onTaskCreated,
}: InlineQuickAddTaskProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('TASK');
  const [priority, setPriority] = useState('P2');
  const [assignee, setAssignee] = useState<string | null>(null);

  const { data: membersData } = useProjectTeamMembers(orgId, projectId);
  const createTask = useCreateTask(orgId, projectId);
  const { toast } = useToast();
  const { save: saveLastValues } = useLastTaskValues(projectId);
  const members = membersData?.members ?? [];

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({
        title: 'Error',
        description: 'Task title is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createTask.mutateAsync({
        title: title.trim(),
        type: type as any,
        priority: priority as any,
        assigneeUserId: assignee || undefined,
        status: 'BACKLOG',
      });

      saveLastValues({
        type: type as any,
        priority: priority as any,
        assigneeUserId: assignee,
      });

      toast({
        title: 'Success',
        description: 'Task created',
      });

      setTitle('');
      setType('TASK');
      setPriority('P2');
      setAssignee(null);
      onTaskCreated?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to create task',
        variant: 'destructive',
      });
    }
  };

  if (!isAdding) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsAdding(true)}
        className="w-full justify-start text-muted-foreground"
      >
        <Plus className="h-4 w-4 mr-2" />
        Quick Add Task
      </Button>
    );
  }

  return (
    <div className="p-4 bg-muted/50 rounded-lg border space-y-3">
      <div className="flex gap-2 items-center flex-wrap">
        <Input
          placeholder="Task title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
            if (e.key === 'Escape') setIsAdding(false);
          }}
          className="flex-1 min-w-[200px]"
          autoFocus
        />
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TASK">Task</SelectItem>
            <SelectItem value="BUG">Bug</SelectItem>
            <SelectItem value="FEATURE">Feature</SelectItem>
            <SelectItem value="CHANGE">Change</SelectItem>
            <SelectItem value="RESEARCH">Research</SelectItem>
            <SelectItem value="OTHER">Other</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="P0">P0</SelectItem>
            <SelectItem value="P1">P1</SelectItem>
            <SelectItem value="P2">P2</SelectItem>
            <SelectItem value="P3">P3</SelectItem>
            <SelectItem value="P4">P4</SelectItem>
          </SelectContent>
        </Select>

        <Select value={assignee || 'none'} onValueChange={(v) => setAssignee(v === 'none' ? null : v)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Unassigned</SelectItem>
            {members.map((member) => (
              <SelectItem key={member.user.id} value={member.user.id}>
                {member.user.name || member.user.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={createTask.isPending}
        >
          {createTask.isPending ? 'Adding...' : 'Add'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsAdding(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
