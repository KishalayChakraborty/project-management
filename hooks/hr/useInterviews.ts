import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export function useApplicantInterviews(orgId: string, applicantId: string) {
  return useQuery({
    queryKey: ['interviews', applicantId],
    queryFn: async () => {
      const { data } = await api.get(`/orgs/${orgId}/hr/applicants/${applicantId}/interviews`);
      return data;
    },
    enabled: !!applicantId && !!orgId,
  });
}

export function useScheduleInterview(orgId: string, applicantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post(`/orgs/${orgId}/hr/applicants/${applicantId}/interviews`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews', applicantId] });
    },
  });
}

export function useInterviewFeedback(orgId: string, applicantId: string, roundId: string) {
  return useQuery({
    queryKey: ['interviewFeedback', roundId],
    queryFn: async () => {
      const { data } = await api.get(
        `/orgs/${orgId}/hr/applicants/${applicantId}/interviews/${roundId}/feedback`
      );
      return data;
    },
    enabled: !!roundId && !!applicantId && !!orgId,
  });
}

export function useSubmitFeedback(orgId: string, applicantId: string, roundId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      api.post(`/orgs/${orgId}/hr/applicants/${applicantId}/interviews/${roundId}/feedback`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviewFeedback', roundId] });
      queryClient.invalidateQueries({ queryKey: ['interviews', applicantId] });
    },
  });
}
