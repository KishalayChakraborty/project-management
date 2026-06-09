import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export function useHiringBudgets(orgId: string, fiscalYear?: number) {
  return useQuery({
    queryKey: ['budgets', orgId, fiscalYear],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (fiscalYear) params.append('fiscalYear', fiscalYear.toString());
      const { data } = await api.get(`/orgs/${orgId}/hr/budget?${params}`);
      return data;
    },
    enabled: !!orgId,
  });
}

export function useCreateBudget(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post(`/orgs/${orgId}/hr/budget`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets', orgId] });
    },
  });
}
