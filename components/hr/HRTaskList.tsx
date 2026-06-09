'use client';

import { useState } from 'react';
import { useApplicantTasks, useCreateTask, useUpdateTask, useDeleteTask } from '@/hooks/hr/useTasks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, CheckCircle, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';

const taskTypeColors: Record<string, string> = {
  ONBOARDING: 'bg-blue-100 text-blue-800',
  DOCUMENT: 'bg-purple-100 text-purple-800',
  TRAINING: 'bg-green-100 text-green-800',
  SYSTEM_ACCESS: 'bg-orange-100 text-orange-800',
  EQUIPMENT: 'bg-yellow-100 text-yellow-800',
  OTHER: 'bg-gray-100 text-gray-800',
};

const priorityColors: Record<string, string> = {
  LOW: 'text-gray-600',
  MEDIUM: 'text-yellow-600',
  HIGH: 'text-orange-600',
  URGENT: 'text-red-600',
};

const statusIcons: Record<string, any> = {
  COMPLETED: CheckCircle,
  PENDING: Clock,
  IN_PROGRESS: Clock,
  CANCELLED: Clock,
};

interface HRTaskListProps {
  orgId: string;
  applicantId: string;
  applicantName: string;
}

export function HRTaskList({ orgId, applicantId, applicantName }: HRTaskListProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const { toast } = useToast();

  const { data: tasksData } = useApplicantTasks(orgId, applicantId);
  const createMutation = useCreateTask(orgId, applicantId);
  const updateMutation = useUpdateTask(orgId, applicantId, formData.taskId);
  const deleteMutation = useDeleteTask(orgId, applicantId);

  const tasks = tasksData?.data || [];

  const handleCreateTask = async () => {
    try {
      await createMutation.mutateAsync({
        title: formData.title,
        description: formData.description,
        dueDate: formData.dueDate,
        priority: formData.priority || 'MEDIUM',
        taskType: formData.taskType || 'ONBOARDING',
        assignedTo: formData.assignedTo,
      });
      toast({ title: 'Task created', description: 'Onboarding task added' });
      setIsCreateOpen(false);
      setFormData({});
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create task',
        variant: 'destructive',
      });
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await updateMutation.mutateAsync({
        status: 'COMPLETED',
      });
      toast({ title: 'Task completed', description: 'Marked as done' });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update task',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteMutation.mutateAsync(taskId);
      toast({ title: 'Task deleted', description: 'Removed from list' });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete task',
        variant: 'destructive',
      });
    }
  };

  const completedCount = tasks.filter((t: any) => t.status === 'COMPLETED').length;
  const progressPercent = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Onboarding Tasks for {applicantName}</h3>
          <p className="text-sm text-muted-foreground">{completedCount} of {tasks.length} completed</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>

      {tasks.length > 0 && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">No tasks yet</p>
            <Button variant="outline" onClick={() => setIsCreateOpen(true)} className="mt-4">
              Create First Task
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {tasks.map((task: any) => (
            <Card key={task.id} className={task.status === 'COMPLETED' ? 'opacity-60' : ''}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className={`font-medium ${task.status === 'COMPLETED' ? 'line-through' : ''}`}>
                        {task.title}
                      </h4>
                      <Badge className={taskTypeColors[task.taskType] || taskTypeColors.OTHER}>
                        {task.taskType}
                      </Badge>
                    </div>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {task.dueDate && (
                        <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                      )}
                      {task.priority && (
                        <span className={`font-semibold ${priorityColors[task.priority]}`}>
                          {task.priority}
                        </span>
                      )}
                      <span className={`px-2 py-1 rounded ${
                        task.status === 'COMPLETED'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {task.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {task.status !== 'COMPLETED' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCompleteTask(task.id)}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteTask(task.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Onboarding Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Task Title</label>
              <Input
                placeholder="e.g., Prepare office setup"
                value={formData.title || ''}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                placeholder="Details about the task..."
                value={formData.description || ''}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Task Type</label>
              <select
                value={formData.taskType || 'ONBOARDING'}
                onChange={(e) => setFormData({...formData, taskType: e.target.value})}
                className="w-full border rounded px-3 py-2 text-sm mt-1"
              >
                <option value="ONBOARDING">Onboarding</option>
                <option value="DOCUMENT">Document</option>
                <option value="TRAINING">Training</option>
                <option value="SYSTEM_ACCESS">System Access</option>
                <option value="EQUIPMENT">Equipment</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Priority</label>
              <select
                value={formData.priority || 'MEDIUM'}
                onChange={(e) => setFormData({...formData, priority: e.target.value})}
                className="w-full border rounded px-3 py-2 text-sm mt-1"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Due Date</label>
              <Input
                type="date"
                value={formData.dueDate || ''}
                onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                className="mt-1"
              />
            </div>
            <Button
              onClick={handleCreateTask}
              disabled={!formData.title || createMutation.isPending}
              className="w-full"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
