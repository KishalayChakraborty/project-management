import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export interface WorkLogSegment {
  id: string;
  workLogId: string;
  startDt: string;
  endDt: string;
  durationMin: number;
  comment?: string | null;
}

export interface WorkLog {
  id: string;
  orgId: string;
  userId: string;
  createdBy: string;
  projectId?: string | null;
  taskId?: string | null;
  totalDurationMin: number;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    avatar: string | null;
  };
  task?: {
    id: string;
    title: string;
  } | null;
  segments: WorkLogSegment[];
}

export interface WorkLogPagination {
  workLogs: WorkLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function useWorkLogs(
  orgId: string | null,
  projectId: string | null,
  page: number = 1,
  search: string = '',
  sortBy: string = 'createdAt',
  sortOrder: 'asc' | 'desc' = 'desc',
  userId?: string,
  startDate?: string,
  endDate?: string
) {
  return useQuery<WorkLogPagination | null>({
    queryKey: ['workLogs', orgId, projectId, page, search, sortBy, sortOrder, userId, startDate, endDate],
    queryFn: async () => {
      if (!orgId || !projectId) return null;
      const params = new URLSearchParams({
        page: page.toString(),
        search,
        sortBy,
        sortOrder,
      });
      if (userId) params.set('userId', userId);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const { data } = await api.get<WorkLogPagination>(
        `/orgs/${orgId}/projects/${projectId}/work-logs?${params.toString()}`
      );
      return data;
    },
    enabled: !!orgId && !!projectId,
  });
}

export function useMyWorkLogs(
  orgId: string | null,
  projectId: string | null,
  userId: string | undefined,
  page: number = 1,
  sortBy: string = 'createdAt',
  sortOrder: 'asc' | 'desc' = 'desc',
  startDate?: string,
  endDate?: string
) {
  return useQuery<WorkLogPagination | null>({
    queryKey: ['workLogs', 'mine', orgId, projectId, userId, page, sortBy, sortOrder, startDate, endDate],
    queryFn: async () => {
      if (!orgId || !projectId) return null;
      const params = new URLSearchParams({
        page: page.toString(),
        sortBy,
        sortOrder,
      });
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const { data } = await api.get<WorkLogPagination>(
        `/orgs/${orgId}/projects/${projectId}/work-logs/mine?${params.toString()}`
      );
      return data;
    },
    enabled: !!orgId && !!projectId && !!userId,
  });
}

export interface CreateMyWorkLogInput {
  totalDurationMin: number;
  taskId?: string | null;
  segments?: {
    startDt: string;
    endDt: string;
    durationMin: number;
    comment?: string;
  }[];
}

export function useCreateMyWorkLog(orgId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateMyWorkLogInput) => {
      const { data } = await api.post<{ workLog: WorkLog }>(
        `/orgs/${orgId}/projects/${projectId}/work-logs/mine`,
        input
      );
      return data.workLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workLogs', 'mine', orgId, projectId] });
    },
  });
}
