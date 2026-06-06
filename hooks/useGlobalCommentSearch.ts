import { useState, useCallback } from 'react';
import { api } from '@/lib/axios';

export interface CommentSearchResult {
  id: string;
  taskId: string;
  taskTitle: string;
  projectId: string;
  projectName: string;
  projectCode: string;
  orgId: string;
  orgName: string;
  content: string;
  userName: string;
  userEmail: string;
  createdAt: string;
}

export function useGlobalCommentSearch() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<CommentSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data } = await api.get<{ results: CommentSearchResult[] }>(
        `/api/comments/search?q=${encodeURIComponent(query)}`
      );
      setResults(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { search, results, isLoading, error };
}
