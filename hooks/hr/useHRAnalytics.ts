import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export function useHRAnalytics(orgId: string) {
  return useQuery({
    queryKey: ['hrAnalytics', orgId],
    queryFn: async () => {
      const { data } = await api.get(`/orgs/${orgId}/hr/analytics`);
      return data;
    },
    enabled: !!orgId,
  });
}
