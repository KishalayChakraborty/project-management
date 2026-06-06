'use client';

import { useState, useRef, useEffect } from 'react';
import { useTaskComments, useAddTaskComment, useDeleteTaskComment } from '@/hooks/tasks/useTaskComments';
import { useFloatingComments } from '@/hooks/useFloatingComments';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Send, GripVertical, Minimize2, Maximize2, Trash2, Loader2 } from 'lucide-react';

function getInitials(nameOrEmail: string) {
  if (!nameOrEmail) return "?";
  if (nameOrEmail.includes("@")) {
    return nameOrEmail.substring(0, 2).toUpperCase();
  }
  const parts = nameOrEmail.split(" ").filter((p) => p.length > 0);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return nameOrEmail.substring(0, 2).toUpperCase();
}

function getColorClass(text: string) {
  const colors = [
    "bg-red-500",
    "bg-blue-500",
    "bg-green-500",
    "bg-yellow-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-teal-500",
  ];
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

const Linkify = ({ text }: { text: string }) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return (
    <span className="whitespace-pre-wrap flex-1 break-words">
      {parts.map((part, i) => {
        if (part.match(urlRegex)) {
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              {part}
            </a>
          );
        }
        return part;
      })}
    </span>
  );
};

interface FloatingCommentBoxProps {
  id: string;
  orgId: string;
  projectId: string;
  taskId: string;
  taskTitle: string;
}

export function FloatingCommentBox({
  id,
  orgId,
  projectId,
  taskId,
  taskTitle,
}: FloatingCommentBoxProps) {
  const { data: session } = useSession();
  const { removeBox, updateBox, moveBox, boxes } = useFloatingComments();
  const box = boxes.find((b) => b.id === id);

  const [commentText, setCommentText] = useState('');
  const [chatSearch, setChatSearch] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<HTMLDivElement>(null);

  const { data: commentsData, isLoading: commentsLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useTaskComments(orgId, projectId, taskId);
  const addComment = useAddTaskComment(orgId, projectId, taskId);
  const deleteComment = useDeleteTaskComment(orgId, projectId, taskId);
  const allComments = commentsData?.pages.flatMap((p) => p.comments) ?? [];

  if (!box) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-drag-handle]')) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - box.position.x,
        y: e.clientY - box.position.y,
      });
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      moveBox(id, {
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, moveBox, id]);

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = commentText.trim();
    if (!trimmed) return;
    addComment.mutate(trimmed, {
      onSuccess: () => setCommentText(''),
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        left: `${box.position.x}px`,
        top: `${box.position.y}px`,
        width: box.isMinimized ? '320px' : '400px',
        height: box.isMinimized ? '40px' : '500px',
        zIndex: 50,
      }}
      className="flex flex-col bg-background border border-green-500 rounded-lg shadow-lg"
      ref={dragRef}
    >
      {/* Header */}
      <div
        data-drag-handle
        className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30 hover:bg-muted/50 cursor-move rounded-t-md transition-colors"
        onMouseDown={handleMouseDown}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground truncate">Task</p>
          <p className="text-sm font-medium truncate">{taskTitle}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={() => updateBox(id, { isMinimized: !box.isMinimized })}
        >
          {box.isMinimized ? (
            <Maximize2 className="h-4 w-4" />
          ) : (
            <Minimize2 className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={() => removeBox(id)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      {!box.isMinimized && (
        <>
          <CardContent className="flex flex-col gap-3 overflow-hidden flex-1 p-3 min-h-0">
            {/* Search */}
            <Input
              placeholder="Search comments..."
              value={chatSearch}
              onChange={(e) => setChatSearch(e.target.value)}
              className="h-8 text-sm"
            />

            {/* Comments List */}
            <div className="overflow-y-auto flex-1 pr-2">
              {commentsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : !allComments || allComments.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No comments yet.</p>
              ) : (
                <ul className="space-y-2">
                  {allComments
                    .filter((c) =>
                      c.content.toLowerCase().includes(chatSearch.toLowerCase()),
                    )
                    .map((c) => {
                      const name = c.user.name || c.user.email;
                      return (
                        <li key={c.id} className="border rounded-md p-2 space-y-1 text-xs hover:bg-muted/30 transition-colors">
                          <div className="flex justify-between items-start gap-1">
                            <div className="flex gap-1.5 flex-1 min-w-0">
                              <div
                                className={`flex items-center justify-center shrink-0 w-5 h-5 rounded-full text-[8px] font-medium text-white ${getColorClass(name)}`}
                                title={name}
                              >
                                {getInitials(name)}
                              </div>
                              <div className="flex flex-col min-w-0 flex-1">
                                <p className="font-medium text-[11px] line-clamp-3">
                                  <Linkify text={c.content} />
                                </p>
                                <p className="text-[9px] text-muted-foreground mt-0.5">
                                  {new Date(c.createdAt).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            {c.userId === session?.user?.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0 shrink-0"
                                onClick={() => deleteComment.mutate(c.id)}
                                disabled={deleteComment.isPending}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                </ul>
              )}
              {hasNextPage && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2 h-7 text-xs"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? 'Loading...' : 'Load more'}
                </Button>
              )}
            </div>

            {/* Comment Input */}
            <form className="flex gap-1 shrink-0" onSubmit={handleAddComment}>
              <Input
                placeholder="Comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                disabled={addComment.isPending}
                className="h-8 text-sm"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!commentText.trim() || addComment.isPending}
                className="h-8 w-8 p-0"
              >
                <Send className="h-3 w-3" />
              </Button>
            </form>
          </CardContent>
        </>
      )}
    </div>
  );
}
