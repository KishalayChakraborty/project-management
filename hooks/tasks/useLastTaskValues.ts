import { useEffect, useState } from 'react';

export interface LastTaskValues {
  type: 'BUG' | 'FEATURE' | 'TASK' | 'CHANGE' | 'RESEARCH' | 'OTHER';
  priority: 'P0' | 'P1' | 'P2' | 'P3' | 'P4';
  assigneeUserId: string | null;
}

const STORAGE_KEY = 'last-task-values';

export function useLastTaskValues(projectId: string) {
  const [lastValues, setLastValues] = useState<LastTaskValues | undefined>();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(`${STORAGE_KEY}-${projectId}`);
    if (stored) {
      try {
        setLastValues(JSON.parse(stored));
      } catch (error) {
        console.error('Failed to parse last task values', error);
      }
    }
    setIsLoaded(true);
  }, [projectId]);

  const save = (values: LastTaskValues) => {
    setLastValues(values);
    localStorage.setItem(`${STORAGE_KEY}-${projectId}`, JSON.stringify(values));
  };

  return {
    lastValues,
    isLoaded,
    save,
  };
}
