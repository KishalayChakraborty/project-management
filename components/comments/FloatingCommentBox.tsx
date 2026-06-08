'use client';

import { useState, useRef, useEffect } from 'react';
import { useTaskComments, useAddTaskComment, useDeleteTaskComment } from '@/hooks/tasks/useTaskComments';
import { useFloatingComments } from '@/hooks/useFloatingComments';
import { useCommentUpload } from '@/hooks/tasks/useCommentUpload';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, GripVertical, Minimize2, Maximize2, Loader2 } from 'lucide-react';
import { MessageComposer } from './MessageComposer';
import { Message } from './Message';

function getColorClass(text: string) {
  const colors = [
    'bg-red-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
  ];
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(nameOrEmail: string) {
  if (!nameOrEmail) return '?';
  if (nameOrEmail.includes('@')) {
    return nameOrEmail.substring(0, 2).toUpperCase();
  }
  const parts = nameOrEmail.split(' ').filter((p) => p.length > 0);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return nameOrEmail.substring(0, 2).toUpperCase();
}

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

  const [chatSearch, setChatSearch] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isUploading, setIsUploading] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: commentsData, isLoading: commentsLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useTaskComments(orgId, projectId, taskId);
  const addComment = useAddTaskComment(orgId, projectId, taskId);
  const deleteComment = useDeleteTaskComment(orgId, projectId, taskId);
  const uploadFiles = useCommentUpload(orgId, projectId, taskId);
  const allComments = commentsData?.pages.flatMap((p) => p.comments) ?? [];

  if (!box) return null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allComments]);

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

  const handleSendMessage = async (text: string, files: File[]) => {
    if (!text.trim() && files.length === 0) return;

    setIsUploading(true);

    addComment.mutate(text, {
      onSuccess: (newComment) => {
        if (files.length > 0 && newComment?.id) {
          uploadFiles.mutate(
            { files, commentId: newComment.id },
            {
              onSuccess: () => {
                setIsUploading(false);
              },
              onError: (error) => {
                console.error('File upload failed:', error);
                setIsUploading(false);
              },
            }
          );
        } else {
          setIsUploading(false);
        }
      },
      onError: () => {
        setIsUploading(false);
      },
    });
  };

  const filteredComments = allComments.filter((c) =>
    c.content.toLowerCase().includes(chatSearch.toLowerCase())
  );

  return (
    <div
      style={{
        position: 'fixed',
        left: `${box.position.x}px`,
        top: `${box.position.y}px`,
        width: box.isMinimized ? '320px' : '450px',
        height: box.isMinimized ? '40px' : '600px',
        zIndex: 50,
      }}
      className="flex flex-col bg-background border border-green-500 rounded-lg shadow-lg"
      ref={dragRef}
    >
      {/* Header */}
      <div
        data-drag-handle
        className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30 hover:bg-muted/50 cursor-move rounded-t-md transition-colors shrink-0"
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
          {box.isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeBox(id)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      {!box.isMinimized && (
        <>
          <CardContent className="flex flex-col gap-0 overflow-hidden flex-1 p-0 min-h-0">
            {/* Search */}
            {allComments.length > 0 && (
              <div className="shrink-0 p-2 border-b">
                <Input
                  placeholder="Search messages..."
                  value={chatSearch}
                  onChange={(e) => setChatSearch(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-2 py-2">
              {commentsLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : filteredComments.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center">No messages yet</p>
              ) : (
                <>
                  {hasNextPage && (
                    <button
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                      className="w-full mb-2 text-[10px] text-blue-600 hover:underline disabled:opacity-50"
                    >
                      {isFetchingNextPage ? 'Loading...' : 'Earlier'}
                    </button>
                  )}

                  {filteredComments.map((comment) => {
                    const name = comment.user.name || comment.user.email;
                    return (
                      <Message
                        key={comment.id}
                        id={comment.id}
                        authorName={name}
                        authorColor={getColorClass(name)}
                        authorInitials={getInitials(name)}
                        text={comment.content}
                        attachments={comment.attachments || []}
                        timestamp={new Date(comment.createdAt)}
                        canDelete={comment.userId === session?.user?.id}
                        onDelete={() => deleteComment.mutate(comment.id)}
                        isDeleting={deleteComment.isPending}
                      />
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Composer */}
            <div className="shrink-0 border-t p-2">
              <MessageComposer
                onSend={handleSendMessage}
                isLoading={isUploading || addComment.isPending}
                placeholder="Message..."
              />
            </div>
          </CardContent>
        </>
      )}
    </div>
  );
}
