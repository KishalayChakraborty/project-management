import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { OrgMember, SearchUserResult, InviteMemberInput, InviteMemberResult } from './types';

export function useOrganizationMembers(
  orgId: string | null,
  page: number = 1,
  search: string = '',
  sort: 'asc' | 'desc' = 'desc',
  limit: number = 20
) {
  return useQuery({
    queryKey: ['organizations', orgId, 'members', page, search, sort, limit],
    queryFn: async () => {
      if (!orgId) return null;
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sort,
      });
      if (search) params.set('search', search);
      const { data } = await api.get<{
        members: OrgMember[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
          hasNext: boolean;
          hasPrev: boolean;
        };
      }>(`/orgs/${orgId}/members?${params.toString()}`);
      return data;
    },
    enabled: !!orgId,
  });
}

export function useSearchUser(orgId: string) {
  return useMutation({
    mutationFn: async (email: string) => {
      const { data } = await api.post<SearchUserResult>(
        `/orgs/${orgId}/members/search`,
        { email }
      );
      return data;
    },
  });
}

export function useInviteMember(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: InviteMemberInput) => {
      const { data } = await api.post<InviteMemberResult>(
        `/orgs/${orgId}/members/invite`,
        input
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', orgId, 'members'] });
      queryClient.invalidateQueries({ queryKey: ['organizations', orgId] });
    },
  });
}

export function useUserRole(orgId: string | null) {
  return useQuery({
    queryKey: ['organizations', orgId, 'role'],
    queryFn: async () => {
      if (!orgId) return null;
      const { data } = await api.get<{ role: string }>(`/orgs/${orgId}/role`);
      return data.role;
    },
    enabled: !!orgId,
    retry: false,
  });
}
