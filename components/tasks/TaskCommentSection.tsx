'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import {
  useTaskComments,
  useAddTaskComment,
  useDeleteTaskComment,
} from '@/hooks/tasks/useTaskComments';
import { useCommentUpload } from '@/hooks/tasks/useCommentUpload';
import { MessageComposer } from '@/components/comments/MessageComposer';
import { Message } from '@/components/comments/Message';

interface TaskCommentSectionProps {
  orgId: string;
  projectId: string;
  taskId: string;
  userRole?: 'ADMIN' | 'MAINTAINER' | 'MEMBER';
}

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

export function TaskCommentSection({
  orgId,
  projectId,
  taskId,
  userRole,
}: TaskCommentSectionProps) {
  const { data: session } = useSession();
  const [chatSearch, setChatSearch] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    data: commentsData,
    isLoading: commentsLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useTaskComments(orgId, projectId, taskId);

  const addComment = useAddTaskComment(orgId, projectId, taskId);
  const deleteComment = useDeleteTaskComment(orgId, projectId, taskId);
  const uploadFiles = useCommentUpload(orgId, projectId, taskId);

  const allComments = commentsData?.pages.flatMap((p) => p.comments) ?? [];

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allComments]);

  const handleSendMessage = async (text: string, files: File[]) => {
    if (!text.trim() && files.length === 0) return;

    setIsUploading(true);

    addComment.mutate(text, {
      onSuccess: (newComment) => {
        // Upload files if any
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

  const canDelete = (userId: string) => {
    return (
      userId === session?.user?.id ||
      userRole === 'ADMIN' ||
      userRole === 'MAINTAINER'
    );
  };

  const filteredComments = allComments.filter((c) =>
    c.content.toLowerCase().includes(chatSearch.toLowerCase())
  );

  const reversedComments = [...filteredComments].reverse();

  // Group comments by user and date for rendering
  const groupedComments = reversedComments.map((comment, idx) => {
    const prevComment = idx > 0 ? reversedComments[idx - 1] : null;
    const prevDate = prevComment
      ? new Date(prevComment.createdAt).toDateString()
      : null;
    const currDate = new Date(comment.createdAt).toDateString();

    const isSameUser = prevComment?.userId === comment.userId;
    const isDifferentDate = prevDate !== currDate;

    return {
      comment,
      showAuthor: !isSameUser,
      showDateSeparator: isDifferentDate,
    };
  });

  return (
    <div className="flex flex-col gap-0 h-full overflow-hidden">
      {/* Search Bar */}
      {allComments.length > 0 && (
        <div className="shrink-0 pb-2 px-2">
          <Input
            placeholder="Search messages..."
            value={chatSearch}
            onChange={(e) => setChatSearch(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {commentsLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filteredComments.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            No messages yet. Start the conversation!
          </div>
        ) : (
          <>
            {hasNextPage && (
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="w-full mb-4 text-xs text-blue-600 hover:underline disabled:opacity-50"
              >
                {isFetchingNextPage ? 'Loading...' : 'Load earlier messages'}
              </button>
            )}

            {groupedComments.map(({ comment, showAuthor, showDateSeparator }) => {
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
                  canDelete={canDelete(comment.userId)}
                  onDelete={() => deleteComment.mutate(comment.id)}
                  isDeleting={deleteComment.isPending}
                  showAuthor={showAuthor}
                  showDateSeparator={showDateSeparator}
                />
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Composer */}
      <div className="shrink-0 px-3 bg-background">
        <MessageComposer
          onSend={handleSendMessage}
          isLoading={isUploading || addComment.isPending}
          placeholder="Type a message or share files..."
        />
      </div>
    </div>
  );
}
