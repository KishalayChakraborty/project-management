import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FloatingCommentBox {
  id: string;
  orgId: string;
  projectId: string;
  taskId: string;
  taskTitle: string;
  position: { x: number; y: number };
  isMinimized: boolean;
}

interface FloatingCommentsStore {
  boxes: FloatingCommentBox[];
  addBox: (box: Omit<FloatingCommentBox, 'id'>) => string;
  removeBox: (id: string) => void;
  updateBox: (id: string, updates: Partial<FloatingCommentBox>) => void;
  moveBox: (id: string, position: { x: number; y: number }) => void;
  toggleMinimize: (id: string) => void;
  closeAll: () => void;
}

export const useFloatingComments = create<FloatingCommentsStore>()(
  persist(
    (set) => ({
      boxes: [],
      addBox: (box) => {
        const id = `comment-box-${Date.now()}-${Math.random()}`;
        set((state) => ({
          boxes: [...state.boxes, { ...box, id }],
        }));
        return id;
      },
      removeBox: (id) => {
        set((state) => ({
          boxes: state.boxes.filter((box) => box.id !== id),
        }));
      },
      updateBox: (id, updates) => {
        set((state) => ({
          boxes: state.boxes.map((box) =>
            box.id === id ? { ...box, ...updates } : box
          ),
        }));
      },
      moveBox: (id, position) => {
        set((state) => ({
          boxes: state.boxes.map((box) =>
            box.id === id ? { ...box, position } : box
          ),
        }));
      },
      toggleMinimize: (id) => {
        set((state) => ({
          boxes: state.boxes.map((box) =>
            box.id === id ? { ...box, isMinimized: !box.isMinimized } : box
          ),
        }));
      },
      closeAll: () => {
        set({ boxes: [] });
      },
    }),
    {
      name: 'floating-comments-storage',
    }
  )
);
