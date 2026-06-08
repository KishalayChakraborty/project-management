import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export interface MyTask {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  status: string;
  priority: string;
  parentId?: string | null;
  deadlineDt?: string | null;
  startDt?: string | null;
  endDt?: string | null;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  reviewer?: { id: string; email: string; name?: string | null } | null;
  parent?: { id: string; title: string } | null;
}

export interface MyTasksProject {
  project: { id: string; name: string; code: string; orgId: string };
  tasks: MyTask[];
}

export interface MyTasksOrg {
  org: { id: string; name: string };
  role: string;
  projects: MyTasksProject[];
}

export interface MyTasksResponse {
  grouped: MyTasksOrg[];
  total: number;
}

export function useMyTasks() {
  return useQuery({
    queryKey: ['my-tasks'],
    queryFn: async () => {
      const { data } = await api.get<MyTasksResponse>('/my-tasks');
      return data;
    },
  });
}
