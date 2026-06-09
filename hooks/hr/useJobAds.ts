'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

interface JobAdsListParams {
  page?: number;
  limit?: number;
  status?: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED';
}

export function useJobAds(orgId: string, params?: JobAdsListParams) {
  return useQuery({
    queryKey: ['job-ads', orgId, params],
    queryFn: async () => {
      const { data } = await api.get(`/orgs/${orgId}/hr/job-ads`, { params });
      return data;
    },
    enabled: !!orgId,
  });
}

export function useJobAd(orgId: string, adId: string) {
  return useQuery({
    queryKey: ['job-ads', orgId, adId],
    queryFn: async () => {
      const { data } = await api.get(`/orgs/${orgId}/hr/job-ads/${adId}`);
      return data;
    },
    enabled: !!orgId && !!adId,
  });
}

export function useCreateJobAd(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post(`/orgs/${orgId}/hr/job-ads`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-ads', orgId] });
    },
  });
}

export function useUpdateJobAd(orgId: string, adId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.patch(`/orgs/${orgId}/hr/job-ads/${adId}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-ads', orgId] });
      queryClient.invalidateQueries({ queryKey: ['job-ads', orgId, adId] });
    },
  });
}

export function useGenerateJobAd(orgId: string, adId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { provider: 'CLAUDE' | 'OPENAI' | 'GEMINI' | 'TEMPLATE'; modifications?: string }) => {
      const { data } = await api.post(`/orgs/${orgId}/hr/job-ads/${adId}/generate`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-ads', orgId, adId] });
    },
  });
}

export function useDeleteJobAd(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (adId: string) => {
      await api.delete(`/orgs/${orgId}/hr/job-ads/${adId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-ads', orgId] });
    },
  });
}
