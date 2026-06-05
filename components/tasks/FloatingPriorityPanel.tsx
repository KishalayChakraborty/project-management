'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { usePriorityTaskList } from '@/hooks/usePriorityTaskList';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronDown,
  ChevronUp,
  X,
  Trash2,
  Star,
  GripVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PRIORITY_COLOR: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  P0: 'destructive',
  P1: 'default',
  P2: 'secondary',
  P3: 'outline',
  P4: 'outline',
};

const STATUS_COLOR: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  IN_PROGRESS: 'secondary',
  REVIEW: 'default',
  BLOCKED: 'destructive',
  TODO: 'outline',
  BACKLOG: 'outline',
  DONE: 'outline',
  ARCHIVED: 'outline',
};

export function FloatingPriorityPanel() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { tasks, removeTask, clearAll, scrollToTask, isLoaded } = usePriorityTaskList();
  const [isMinimized, setIsMinimized] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isMounted, setIsMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Wait for hook to be loaded and set initial position to bottom-right
  useEffect(() => {
    if (isLoaded) {
      setIsMounted(true);
      // Set position to bottom-right corner
      const panelWidth = 320;
      const panelHeight = 450;
      const padding = 16;
      setPosition({
        x: typeof window !== 'undefined' ? window.innerWidth - panelWidth - padding : 0,
        y: typeof window !== 'undefined' ? window.innerHeight - panelHeight - padding : 0,
      });
    }
  }, [isLoaded]);

  // Only show on My Tasks or Pending Tasks pages
  const showPanel = pathname === '/my-tasks' || pathname === '/pending-tasks';

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  if (!showPanel || !isMounted) {
    return null;
  }

  // Filter tasks based on current page context
  // In My Tasks: only show tasks assigned to current user
  // In Pending Tasks: show all priority tasks
  const displayTasks = pathname === '/my-tasks'
    ? tasks.filter(task => task.assigneeId === session?.user?.email)
    : tasks;

  // Always show the floating button
  const renderButton = (
    <button
      onClick={() => setIsPanelOpen(!isPanelOpen)}
      title={isPanelOpen ? 'Close priority task list' : 'Open priority task list'}
      className="fixed bottom-4 right-4 z-40 h-12 w-12 rounded-full bg-yellow-500 hover:bg-yellow-600 text-white flex items-center justify-center shadow-lg transition-colors"
    >
      <Star className="h-6 w-6 fill-white" />
    </button>
  );

  // If panel is closed, just show the button
  if (!isPanelOpen) {
    return renderButton;
  }

  const panelContent = (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 40,
        pointerEvents: 'auto',
      }}
      className={cn(
        'bg-background border-2 border-yellow-500 rounded-lg shadow-lg',
        'flex flex-col overflow-hidden',
        isMinimized ? 'w-[280px] h-auto' : 'w-[320px] h-[450px]',
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      )}
    >
      {/* Header - Draggable */}
      <div
        onMouseDown={handleMouseDown}
        className="flex items-center justify-between gap-2 p-3 border-b cursor-grab active:cursor-grabbing bg-muted/30 rounded-t-lg"
      >
        <div className="flex items-center gap-2">
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
          <span className="text-sm font-semibold">Priority Tasks</span>
          {displayTasks.length > 0 && <Badge variant="secondary" className="text-xs">{displayTasks.length}</Badge>}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsPanelOpen(false)}
            title="Hide"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {displayTasks.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-4 text-center text-muted-foreground text-sm">
              No priority tasks yet. Add tasks using the star icon on the list.
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto overflow-x-hidden">
                <div className="space-y-1 p-2">
                  {displayTasks.map((task) => (
                    <div
                      key={task.taskId}
                      className="w-full p-2 rounded-md hover:bg-muted transition-colors text-xs border border-transparent hover:border-muted-foreground/20"
                    >
                      <div className="flex items-start gap-2 mb-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeTask(task.taskId);
                          }}
                          className="text-red-500 hover:text-red-700 transition-colors flex-shrink-0"
                          title="Remove from priority list"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <Badge variant={PRIORITY_COLOR[task.priority] ?? 'outline'} className="text-xs w-8 justify-center shrink-0">
                          {task.priority}
                        </Badge>
                        <Badge variant={STATUS_COLOR[task.status] ?? 'outline'} className="text-xs shrink-0">
                          {task.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <button
                        onDoubleClick={() => {
                          scrollToTask(task.taskId);
                          // Close the panel after navigation
                          setTimeout(() => {
                            setIsPanelOpen(false);
                          }, 500);
                        }}
                        className="w-full text-left hover:underline cursor-pointer pl-6"
                        title="Double-click to go to task"
                      >
                        <p className="font-medium text-xs truncate text-foreground">
                          {task.title}
                        </p>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="border-t p-2 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={clearAll}
                >
                  <Trash2 className="h-3 w-3 mr-1.5" />
                  Clear All
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );

  // Render both button and panel when panel is open
  return (
    <>
      {panelContent}
      {renderButton}
    </>
  );
}
