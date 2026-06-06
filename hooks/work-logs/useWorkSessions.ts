import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export interface WorkSessionSegment {
  id: string;
  sessionId: string;
  startDt: string;
  endDt: string | null;
  durationMin: number;
  createdAt: string;
}

export interface WorkSession {
  id: string;
  orgId: string;
  projectId: string;
  taskId: string;
  userId: string;
  startDt: string;
  completedDt: string | null;
  totalDurationMin: number;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  createdAt: string;
  task: {
    id: string;
    title: string;
  };
  segments: WorkSessionSegment[];
}

export interface WorkSessionResponse {
  session: WorkSession | null;
}

export function useActiveWorkSession(
  orgId: string | null,
  projectId: string | null
) {
  return useQuery<WorkSessionResponse | null>({
    queryKey: ['workSession', 'active', orgId, projectId],
    queryFn: async () => {
      if (!orgId || !projectId) return null;
      const { data } = await api.get<WorkSessionResponse>(
        `/orgs/${orgId}/projects/${projectId}/work-sessions`
      );
      return data;
    },
    enabled: !!orgId && !!projectId,
    refetchInterval: 2000,
  });
}

export function useStartWorkSession(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      const { data } = await api.post<WorkSessionResponse>(
        `/orgs/${orgId}/projects/${projectId}/work-sessions`,
        { taskId }
      );
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['workSession', 'active', orgId, projectId], data);
    },
  });
}

export function usePauseWorkSession(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data } = await api.post<WorkSessionResponse>(
        `/orgs/${orgId}/projects/${projectId}/work-sessions/${sessionId}/pause`
      );
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['workSession', 'active', orgId, projectId], data);
    },
  });
}

export function useResumeWorkSession(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data } = await api.post<WorkSessionResponse>(
        `/orgs/${orgId}/projects/${projectId}/work-sessions/${sessionId}/resume`
      );
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['workSession', 'active', orgId, projectId], data);
    },
  });
}

export function useStopWorkSession(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data } = await api.post<{
        session: WorkSession;
        workLog: any;
      }>(
        `/orgs/${orgId}/projects/${projectId}/work-sessions/${sessionId}/stop`
      );
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['workSession', 'active', orgId, projectId], { session: null });
      queryClient.invalidateQueries({ queryKey: ['workLogs', 'mine', orgId, projectId] });
      queryClient.invalidateQueries({ queryKey: ['task-work-logs'] });
    },
  });
}
