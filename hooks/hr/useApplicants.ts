import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export function useApplicants(orgId: string, status?: string, jobProfileId?: string) {
  return useQuery({
    queryKey: ['applicants', orgId, status, jobProfileId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (jobProfileId) params.append('jobProfileId', jobProfileId);
      const { data } = await api.get(`/orgs/${orgId}/hr/applicants?${params}`);
      return data;
    },
    enabled: !!orgId,
  });
}

export function useApplicant(orgId: string, applicantId: string) {
  return useQuery({
    queryKey: ['applicant', applicantId],
    queryFn: async () => {
      const { data } = await api.get(`/orgs/${orgId}/hr/applicants/${applicantId}`);
      return data;
    },
    enabled: !!applicantId && !!orgId,
  });
}

export function useCreateApplicant(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post(`/orgs/${orgId}/hr/applicants`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applicants', orgId] });
    },
  });
}

export function useUpdateApplicant(orgId: string, applicantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.patch(`/orgs/${orgId}/hr/applicants/${applicantId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applicant', applicantId] });
      queryClient.invalidateQueries({ queryKey: ['applicants', orgId] });
    },
  });
}

export function useDeleteApplicant(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (applicantId: string) => api.delete(`/orgs/${orgId}/hr/applicants/${applicantId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applicants', orgId] });
    },
  });
}

export function useApplicantEducation(orgId: string, applicantId: string) {
  return useQuery({
    queryKey: ['applicantEducation', applicantId],
    queryFn: async () => {
      const { data } = await api.get(`/orgs/${orgId}/hr/applicants/${applicantId}/education`);
      return data;
    },
    enabled: !!applicantId && !!orgId,
  });
}

export function useAddEducation(orgId: string, applicantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post(`/orgs/${orgId}/hr/applicants/${applicantId}/education`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applicantEducation', applicantId] });
    },
  });
}

export function useApplicantExperience(orgId: string, applicantId: string) {
  return useQuery({
    queryKey: ['applicantExperience', applicantId],
    queryFn: async () => {
      const { data } = await api.get(`/orgs/${orgId}/hr/applicants/${applicantId}/experience`);
      return data;
    },
    enabled: !!applicantId && !!orgId,
  });
}

export function useAddExperience(orgId: string, applicantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post(`/orgs/${orgId}/hr/applicants/${applicantId}/experience`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applicantExperience', applicantId] });
    },
  });
}
