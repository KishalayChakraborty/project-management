'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export interface PriorityTask {
  taskId: string;
  orgId: string;
  projectId: string;
  title: string;
  priority: string;
  status: string;
  addedAt: number;
  assigneeId?: string;
}

const STORAGE_KEY_PREFIX = 'priority-task-list';

function getStorageKey(email: string): string {
  return `${STORAGE_KEY_PREFIX}-${email}`;
}

function loadTasksFromStorage(storageKey: string): PriorityTask[] {
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (error) {
    console.error('Failed to load priority tasks:', error);
  }
  return [];
}

function saveTasksToStorage(storageKey: string, tasks: PriorityTask[]): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(tasks));
  } catch (error) {
    console.error('Failed to save priority tasks:', error);
  }
}

export function usePriorityTaskList() {
  const { data: session, status } = useSession();
  const [tasks, setTasks] = useState<PriorityTask[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const userId = status === 'authenticated' && session?.user?.email ? session.user.email : null;
  const storageKey = userId ? getStorageKey(userId) : null;

  // Load from localStorage on mount
  useEffect(() => {
    if (!storageKey) return;

    const loadedTasks = loadTasksFromStorage(storageKey);
    setTasks(loadedTasks);
    setIsLoaded(true);
  }, [storageKey]);

  // Save to localStorage whenever tasks change
  useEffect(() => {
    if (!isLoaded || !storageKey) return;

    saveTasksToStorage(storageKey, tasks);

    // Dispatch custom event so other hook instances can sync
    window.dispatchEvent(
      new CustomEvent('priorityTasksChanged', {
        detail: { storageKey, tasks },
      })
    );
  }, [tasks, storageKey, isLoaded]);

  // Listen for storage changes from other instances
  useEffect(() => {
    if (!storageKey) return;

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === storageKey && event.newValue) {
        try {
          const newTasks = JSON.parse(event.newValue);
          if (Array.isArray(newTasks)) {
            setTasks(newTasks);
          }
        } catch (error) {
          console.error('Failed to sync tasks:', error);
        }
      }
    };

    const handleCustomEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail.storageKey === storageKey) {
        setTasks(customEvent.detail.tasks);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('priorityTasksChanged', handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('priorityTasksChanged', handleCustomEvent);
    };
  }, [storageKey]);

  const addTask = useCallback(
    (task: Omit<PriorityTask, 'addedAt'>) => {
      setTasks((prev) => {
        if (prev.some((t) => t.taskId === task.taskId)) return prev;
        if (prev.length >= 50) return prev;
        const newTasks = [...prev, { ...task, addedAt: Date.now() }];
        if (storageKey) saveTasksToStorage(storageKey, newTasks);
        return newTasks;
      });
    },
    [storageKey]
  );

  const removeTask = useCallback(
    (taskId: string) => {
      setTasks((prev) => {
        const newTasks = prev.filter((t) => t.taskId !== taskId);
        if (storageKey) saveTasksToStorage(storageKey, newTasks);
        return newTasks;
      });
    },
    [storageKey]
  );

  const clearAll = useCallback(() => {
    setTasks([]);
    if (storageKey) saveTasksToStorage(storageKey, []);
  }, [storageKey]);

  const getTasks = useCallback((): PriorityTask[] => {
    return tasks;
  }, [tasks]);

  const scrollToTask = useCallback((taskId: string) => {
    // Remove highlight from any previously highlighted element
    const previousHighlight = document.querySelector('.highlight-task');
    if (previousHighlight) {
      previousHighlight.classList.remove('highlight-task');
    }

    // Try to find the task row element
    const element = document.getElementById(`task-row-${taskId}`);
    if (element) {
      // Scroll the element into view
      setTimeout(() => {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('highlight-task');
      }, 100);
    } else {
      console.warn(`Task element with ID task-row-${taskId} not found`);
    }
  }, []);

  const hasTask = useCallback((taskId: string) => {
    return tasks.some((t) => t.taskId === taskId);
  }, [tasks]);

  const applyHighlight = useCallback((taskId: string) => {
    // Remove highlight from any previously highlighted element
    const previousHighlight = document.querySelector('.highlight-task');
    if (previousHighlight) {
      previousHighlight.classList.remove('highlight-task');
    }

    // Apply highlight to the selected element
    const element = document.getElementById(`task-row-${taskId}`);
    if (element) {
      element.classList.add('highlight-task');
    }
  }, []);

  return {
    tasks,
    addTask,
    removeTask,
    clearAll,
    getTasks,
    scrollToTask,
    applyHighlight,
    hasTask,
    isLoaded,
  };
}
