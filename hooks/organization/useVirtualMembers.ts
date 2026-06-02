import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export interface VirtualMemberProfile {
  userId: string;
  phone?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  dob?: string | null;
  parentOrg?: string | null;
  designation?: string | null;
  education?: string | null;
  introducedBy?: string | null;
  bankAccount?: string | null;
  upiId?: string | null;
  updatedAt: string;
}

export interface MyVirtualUser {
  id: string;
  name?: string | null;
  email: string;
  isVirtual: boolean;
  createdAt: string;
  virtualProfile?: VirtualMemberProfile | null;
  orgMemberships: Array<{
    orgId: string;
    role: string;
    org: { id: string; name: string };
  }>;
}

export function useMyVirtualMembers(excludeOrgId?: string, search?: string) {
  return useQuery({
    queryKey: ['my-virtual-members', excludeOrgId, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (excludeOrgId) params.set('excludeOrgId', excludeOrgId);
      if (search) params.set('search', search);
      const { data } = await api.get<{ virtualUsers: MyVirtualUser[] }>(
        `/my-virtual-members?${params}`
      );
      return data.virtualUsers;
    },
  });
}

export function useAddExistingVirtualMember(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ virtualUserId, role }: { virtualUserId: string; role: 'MAINTAINER' | 'MEMBER' }) => {
      const { data } = await api.post(`/orgs/${orgId}/members/virtual/add`, { virtualUserId, role });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organizations', orgId, 'members'] });
      qc.invalidateQueries({ queryKey: ['my-virtual-members'] });
    },
  });
}

export function useVirtualMemberProfile(orgId: string, userId: string | null) {
  return useQuery({
    queryKey: ['virtual-profile', orgId, userId],
    queryFn: async () => {
      const { data } = await api.get<{ user: MyVirtualUser & { virtualProfile: VirtualMemberProfile | null } }>(
        `/orgs/${orgId}/members/${userId}/profile`
      );
      return data.user;
    },
    enabled: !!userId,
  });
}

export function useUpdateVirtualMemberProfile(orgId: string, userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<VirtualMemberProfile> & { name?: string }) => {
      const { data } = await api.patch(
        `/orgs/${orgId}/members/${userId}/profile`,
        payload
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['virtual-profile', orgId, userId] });
      qc.invalidateQueries({ queryKey: ['organizations', orgId, 'members'] });
      qc.invalidateQueries({ queryKey: ['my-virtual-members'] });
    },
  });
}
