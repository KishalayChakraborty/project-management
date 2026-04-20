import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { OrgTeam, CreateTeamInput } from './types';

export function useOrganizationTeams(
  orgId: string | null,
  page: number = 1,
  search: string = '',
  sort: 'asc' | 'desc' = 'desc',
  limit: number = 20
) {
  return useQuery({
    queryKey: ['organizations', orgId, 'teams', page, search, sort, limit],
    queryFn: async () => {
      if (!orgId) return null;
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sort,
      });
      if (search) params.set('search', search);
      const { data } = await api.get<{
        teams: OrgTeam[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
          hasNext: boolean;
          hasPrev: boolean;
        };
      }>(`/orgs/${orgId}/teams?${params.toString()}`);
      return data;
    },
    enabled: !!orgId,
  });
}

export function useCreateTeam(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTeamInput) => {
      const { data } = await api.post<{ team: OrgTeam }>(`/orgs/${orgId}/teams`, input);
      return data.team;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', orgId, 'teams'] });
      queryClient.invalidateQueries({ queryKey: ['organizations', orgId] });
    },
  });
}
