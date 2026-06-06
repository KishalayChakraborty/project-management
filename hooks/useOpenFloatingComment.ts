'use client';

import { useFloatingComments } from './useFloatingComments';

export function useOpenFloatingComment() {
  const { addBox, boxes } = useFloatingComments();

  const openComment = (
    orgId: string,
    projectId: string,
    taskId: string,
    taskTitle: string
  ) => {
    // Check if box already exists
    const existing = boxes.find(
      (b) =>
        b.orgId === orgId &&
        b.projectId === projectId &&
        b.taskId === taskId
    );

    if (!existing) {
      const randomX = Math.random() * 200;
      const randomY = 100 + Math.random() * 100;
      addBox({
        orgId,
        projectId,
        taskId,
        taskTitle,
        position: { x: randomX, y: randomY },
        isMinimized: false,
      });
    }
  };

  return { openComment };
}
