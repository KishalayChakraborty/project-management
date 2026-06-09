import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export function useApplicantTasks(orgId: string, applicantId: string) {
  return useQuery({
    queryKey: ['applicantTasks', applicantId],
    queryFn: async () => {
      const { data } = await api.get(`/orgs/${orgId}/hr/applicants/${applicantId}/tasks`);
      return data;
    },
    enabled: !!applicantId && !!orgId,
  });
}

export function useCreateTask(orgId: string, applicantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post(`/orgs/${orgId}/hr/applicants/${applicantId}/tasks`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applicantTasks', applicantId] });
    },
  });
}

export function useUpdateTask(orgId: string, applicantId: string, taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.patch(`/orgs/${orgId}/hr/applicants/${applicantId}/tasks/${taskId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applicantTasks', applicantId] });
    },
  });
}

export function useDeleteTask(orgId: string, applicantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => api.delete(`/orgs/${orgId}/hr/applicants/${applicantId}/tasks/${taskId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applicantTasks', applicantId] });
    },
  });
}
