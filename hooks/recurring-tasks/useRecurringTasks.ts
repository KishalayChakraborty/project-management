import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export interface RecurringOccurrence {
  id: string;
  taskId: string;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  task: {
    id: string;
    title: string;
    status: string;
    deadlineDt?: string | null;
    startDt?: string | null;
    assigneeUserId?: string | null;
  };
}

export interface RecurringTemplate {
  id: string;
  projectId: string;
  orgId: string;
  title: string;
  description?: string | null;
  type: string;
  priority: string;
  frequency: string;
  startDate: string;
  endDate?: string | null;
  isActive: boolean;
  createdAt: string;
  lastGeneratedAt?: string | null;
  assignee?: { id: string; name?: string | null; email: string } | null;
  reviewer?: { id: string; name?: string | null; email: string } | null;
  creator: { id: string; name?: string | null; email: string };
  occurrences: RecurringOccurrence[];
}

function key(orgId: string, projectId: string) {
  return ['recurring-tasks', orgId, projectId];
}

export function useRecurringTasks(orgId: string, projectId: string) {
  return useQuery({
    queryKey: key(orgId, projectId),
    queryFn: async () => {
      const { data } = await api.get<{ templates: RecurringTemplate[] }>(
        `/orgs/${orgId}/projects/${projectId}/recurring-tasks`
      );
      return data.templates;
    },
    enabled: !!orgId && !!projectId,
  });
}

export function useCreateRecurringTask(orgId: string, projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      title: string; description?: string; type?: string; priority?: string;
      assigneeUserId?: string | null; reviewerUserId?: string | null;
      frequency: string; startDate: string; endDate?: string | null;
    }) => {
      const { data } = await api.post<{ template: RecurringTemplate }>(
        `/orgs/${orgId}/projects/${projectId}/recurring-tasks`, payload
      );
      return data.template;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key(orgId, projectId) }),
  });
}

export function useUpdateRecurringTask(orgId: string, projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ templateId, ...payload }: { templateId: string; title?: string; isActive?: boolean; endDate?: string | null; priority?: string; assigneeUserId?: string | null }) => {
      const { data } = await api.patch<{ template: RecurringTemplate }>(
        `/orgs/${orgId}/projects/${projectId}/recurring-tasks/${templateId}`, payload
      );
      return data.template;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key(orgId, projectId) }),
  });
}

export function useDeleteRecurringTask(orgId: string, projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (templateId: string) => {
      await api.delete(`/orgs/${orgId}/projects/${projectId}/recurring-tasks/${templateId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key(orgId, projectId) }),
  });
}

export function useGenerateOccurrences(orgId: string, projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (templateId: string) => {
      const { data } = await api.post<{ generated: number; message: string }>(
        `/orgs/${orgId}/projects/${projectId}/recurring-tasks/${templateId}/generate`
      );
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key(orgId, projectId) }),
  });
}
