import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export interface TaskWorkLogsData {
  workLogs: Array<{
    id: string;
    totalDurationMin: number;
    createdAt: string;
  }>;
  totalMinutes: number;
}

export function useTaskWorkLogs(orgId: string | null, projectId: string | null, taskId: string | null) {
  return useQuery<TaskWorkLogsData | null>({
    queryKey: ['task-work-logs', taskId],
    queryFn: async () => {
      if (!orgId || !projectId || !taskId) return null;

      const { data } = await api.get<any>(
        `/orgs/${orgId}/projects/${projectId}/work-logs`
      );

      if (!data || !data.workLogs) return null;

      // Filter work logs for this specific task only
      const taskWorkLogs = data.workLogs.filter((log: any) => log.taskId === taskId);
      const totalMinutes = taskWorkLogs.reduce((sum: number, log: any) => sum + log.totalDurationMin, 0);

      return {
        workLogs: taskWorkLogs,
        totalMinutes,
      };
    },
    enabled: !!orgId && !!projectId && !!taskId,
    staleTime: 0,
    gcTime: 0,
  });
}
