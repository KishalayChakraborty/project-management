import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export function useSalaryStructures(orgId: string, applicantId: string) {
  return useQuery({
    queryKey: ['salaryStructures', applicantId],
    queryFn: async () => {
      const { data } = await api.get(`/orgs/${orgId}/hr/applicants/${applicantId}/salary`);
      return data;
    },
    enabled: !!applicantId && !!orgId,
  });
}

export function useCreateSalaryStructure(orgId: string, applicantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post(`/orgs/${orgId}/hr/applicants/${applicantId}/salary`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salaryStructures', applicantId] });
    },
  });
}

export function useEmploymentOffers(orgId: string, applicantId: string) {
  return useQuery({
    queryKey: ['offers', applicantId],
    queryFn: async () => {
      const { data } = await api.get(`/orgs/${orgId}/hr/applicants/${applicantId}/offer`);
      return data;
    },
    enabled: !!applicantId && !!orgId,
  });
}

export function useCreateOffer(orgId: string, applicantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post(`/orgs/${orgId}/hr/applicants/${applicantId}/offer`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers', applicantId] });
    },
  });
}

export function useConfirmJoining(orgId: string, applicantId: string, offerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      api.post(`/orgs/${orgId}/hr/applicants/${applicantId}/offer/${offerId}/confirm-joining`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers', applicantId] });
    },
  });
}
