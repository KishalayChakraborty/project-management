import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export interface AllTask {
    id: string;
    projectId: string;
    parentId?: string | null;
    title: string;
    description?: string | null;
    type: string;
    status: string;
    priority: string;
    assigneeUserId?: string | null;
    reviewerUserId?: string | null;
    assignmentDt?: string | null;
    startDt?: string | null;
    endDt?: string | null;
    deadlineDt?: string | null;
    estimatedMonths?: number | null;
    estimatedDays?: number | null;
    estimatedHours?: number | null;
    estimatedMinutes?: number | null;
    costOfExecution?: number | null;
    resourceNeeds?: Record<string, unknown> | null;
    createdAt: string;
    updatedAt: string;
    userRole: string;
    project: {
        id: string;
        name: string;
        code: string;
        orgId: string;
        org: {
            id: string;
            name: string;
        };
    };
    assignee?: {
        id: string;
        email: string;
        name?: string | null;
    };
    reviewer?: {
        id: string;
        email: string;
        name?: string | null;
    };
    parent?: {
        id: string;
        title: string;
    } | null;
}

export interface AllTasksResponse {
    tasks: AllTask[];
    total: number;
    page: number;
    totalPages: number;
}

export function useAllTasks(filters?: {
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
}) {
    return useQuery({
        queryKey: ['all-tasks', filters],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters?.sortBy) params.set('sortBy', filters.sortBy);
            if (filters?.sortOrder) params.set('sortOrder', filters.sortOrder);
            if (filters?.page) params.set('page', String(filters.page));
            if (filters?.limit) params.set('limit', String(filters.limit));

            const { data } = await api.get<AllTasksResponse>(
                `/all-tasks?${params.toString()}`
            );
            return data;
        },
    });
}
