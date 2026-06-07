import { useEffect, useState } from 'react';

export interface TaskTemplate {
  id: string;
  name: string;
  type: 'BUG' | 'FEATURE' | 'TASK' | 'CHANGE' | 'RESEARCH' | 'OTHER';
  priority: 'P0' | 'P1' | 'P2' | 'P3' | 'P4';
  assigneeUserId: string | null;
  createdAt: number;
}

const STORAGE_KEY = 'task-templates';

export function useTaskTemplates(projectId: string) {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(`${STORAGE_KEY}-${projectId}`);
    if (stored) {
      try {
        setTemplates(JSON.parse(stored));
      } catch (error) {
        console.error('Failed to parse templates', error);
      }
    }
    setIsLoaded(true);
  }, [projectId]);

  const saveTemplate = (name: string, template: Omit<TaskTemplate, 'id' | 'createdAt' | 'name'>) => {
    const newTemplate: TaskTemplate = {
      ...template,
      id: Math.random().toString(36).slice(2),
      name,
      createdAt: Date.now(),
    };

    const updated = [...templates, newTemplate];
    setTemplates(updated);
    localStorage.setItem(`${STORAGE_KEY}-${projectId}`, JSON.stringify(updated));
    return newTemplate;
  };

  const deleteTemplate = (id: string) => {
    const updated = templates.filter((t) => t.id !== id);
    setTemplates(updated);
    localStorage.setItem(`${STORAGE_KEY}-${projectId}`, JSON.stringify(updated));
  };

  const updateTemplate = (id: string, name: string, template: Omit<TaskTemplate, 'id' | 'createdAt' | 'name'>) => {
    const updated = templates.map((t) =>
      t.id === id ? { ...t, name, ...template } : t
    );
    setTemplates(updated);
    localStorage.setItem(`${STORAGE_KEY}-${projectId}`, JSON.stringify(updated));
  };

  return {
    templates,
    isLoaded,
    saveTemplate,
    deleteTemplate,
    updateTemplate,
  };
}
