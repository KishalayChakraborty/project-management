import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { OrgProject } from './types';

export function useOrganizationProjects(
  orgId: string | null,
  page: number = 1,
  search: string = '',
  sort: 'asc' | 'desc' = 'desc',
  limit: number = 20
) {
  return useQuery({
    queryKey: ['organizations', orgId, 'projects', page, search, sort, limit],
    queryFn: async () => {
      if (!orgId) return null;
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sort,
      });
      if (search) params.set('search', search);
      const { data } = await api.get<{
        projects: OrgProject[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
          hasNext: boolean;
          hasPrev: boolean;
        };
      }>(`/orgs/${orgId}/projects?${params.toString()}`);
      return data;
    },
    enabled: !!orgId,
  });
}
