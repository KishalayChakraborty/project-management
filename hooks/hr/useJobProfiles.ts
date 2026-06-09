'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

interface PaginationParams {
  page?: number;
  limit?: number;
}

export function useJobProfiles(orgId: string, params?: PaginationParams) {
  return useQuery({
    queryKey: ['job-profiles', orgId, params],
    queryFn: async () => {
      const { data } = await api.get(`/orgs/${orgId}/hr/job-profiles`, { params });
      return data;
    },
    enabled: !!orgId,
  });
}

export function useCreateJobProfile(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post(`/orgs/${orgId}/hr/job-profiles`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-profiles', orgId] });
    },
  });
}

export function useUpdateJobProfile(orgId: string, jobProfileId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.patch(`/orgs/${orgId}/hr/job-profiles/${jobProfileId}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-profiles', orgId] });
    },
  });
}

export function useDeleteJobProfile(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (jobProfileId: string) => {
      await api.delete(`/orgs/${orgId}/hr/job-profiles/${jobProfileId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-profiles', orgId] });
    },
  });
}
