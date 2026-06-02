import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export interface ProjectDoc {
  id: string;
  projectId: string;
  orgId: string;
  title: string;
  type: 'LINK' | 'CREDENTIAL' | 'NOTE';
  visibility: 'MEMBERS' | 'ADMIN_ONLY';
  content?: string | null;
  url?: string | null;
  metadata?: Record<string, unknown> | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  creator: { id: string; name?: string | null; email: string };
}

function docsKey(orgId: string, projectId: string) {
  return ['project-docs', orgId, projectId];
}

export function useProjectDocs(orgId: string, projectId: string) {
  return useQuery({
    queryKey: docsKey(orgId, projectId),
    queryFn: async () => {
      const { data } = await api.get<{ docs: ProjectDoc[] }>(
        `/orgs/${orgId}/projects/${projectId}/docs`
      );
      return data.docs;
    },
    enabled: !!orgId && !!projectId,
  });
}

export function useCreateDoc(orgId: string, projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      title: string;
      type: 'LINK' | 'CREDENTIAL' | 'NOTE';
      visibility?: 'MEMBERS' | 'ADMIN_ONLY';
      content?: string;
      url?: string;
      metadata?: Record<string, unknown>;
    }) => {
      const { data } = await api.post<{ doc: ProjectDoc }>(
        `/orgs/${orgId}/projects/${projectId}/docs`,
        payload
      );
      return data.doc;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: docsKey(orgId, projectId) }),
  });
}

export function useUpdateDoc(orgId: string, projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ docId, ...payload }: {
      docId: string;
      title?: string;
      visibility?: 'MEMBERS' | 'ADMIN_ONLY';
      content?: string;
      url?: string;
      metadata?: Record<string, unknown>;
    }) => {
      const { data } = await api.patch<{ doc: ProjectDoc }>(
        `/orgs/${orgId}/projects/${projectId}/docs/${docId}`,
        payload
      );
      return data.doc;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: docsKey(orgId, projectId) }),
  });
}

export function useDeleteDoc(orgId: string, projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (docId: string) => {
      await api.delete(`/orgs/${orgId}/projects/${projectId}/docs/${docId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: docsKey(orgId, projectId) }),
  });
}
