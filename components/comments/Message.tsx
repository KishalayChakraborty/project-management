'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Trash2, FileIcon } from 'lucide-react';
import { MessageGallery } from './MessageGallery';
import type { CommentAttachment } from '@/hooks/tasks/useTaskComments';

interface MessageProps {
  id: string;
  authorName: string;
  authorColor: string;
  authorInitials: string;
  text: string;
  attachments: CommentAttachment[];
  timestamp: Date;
  canDelete: boolean;
  onDelete?: () => void;
  isDeleting?: boolean;
}

export function Message({
  id,
  authorName,
  authorColor,
  authorInitials,
  text,
  attachments,
  timestamp,
  canDelete,
  onDelete,
  isDeleting = false,
}: MessageProps) {
  const [selectedGalleryIndex, setSelectedGalleryIndex] = useState<number | null>(
    null
  );

  const images = attachments.filter((a) => a.mimeType.startsWith('image/'));
  const files = attachments.filter((a) => !a.mimeType.startsWith('image/'));

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <>
      <div className="flex gap-2 mb-4 group">
        {/* Avatar */}
        <div
          className={`flex items-center justify-center shrink-0 w-8 h-8 rounded-full text-white text-xs font-bold ${authorColor}`}
          title={authorName}
        >
          {authorInitials}
        </div>

        {/* Message content */}
        <div className="flex-1 min-w-0">
          {/* Author and time */}
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-foreground">
              {authorName}
            </span>
            <span className="text-xs text-muted-foreground">
              {timestamp.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          {/* Message text */}
          {text && (
            <p className="text-sm text-foreground mt-1 whitespace-pre-wrap break-words">
              {text}
            </p>
          )}

          {/* Image gallery thumbnail grid */}
          {images.length > 0 && (
            <div
              className={`mt-2 grid gap-1 ${
                images.length === 1
                  ? 'w-48'
                  : images.length === 2
                    ? 'grid-cols-2 w-64'
                    : 'grid-cols-2 w-64'
              }`}
            >
              {images.slice(0, 4).map((img, idx) => (
                <div
                  key={img.id}
                  className="relative w-32 h-32 rounded-lg overflow-hidden cursor-pointer group/image"
                  onClick={() => setSelectedGalleryIndex(idx)}
                >
                  <img
                    src={img.publicUrl}
                    alt={img.fileName}
                    className="w-full h-full object-cover group-hover/image:opacity-75 transition-opacity"
                  />
                  {/* Show count overlay if more than 4 images */}
                  {idx === 3 && images.length > 4 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white font-bold text-lg">
                        +{images.length - 4}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Files list */}
          {files.length > 0 && (
            <div className="mt-2 space-y-1 bg-muted/30 rounded p-2">
              {files.map((file) => (
                <a
                  key={file.id}
                  href={file.publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 transition-colors text-xs"
                >
                  <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate text-blue-600 dark:text-blue-400 hover:underline">
                    {file.fileName}
                  </span>
                  <span className="text-muted-foreground shrink-0">
                    {formatFileSize(file.fileSize)}
                  </span>
                  <Download className="h-3 w-3 shrink-0 text-muted-foreground" />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Delete button (shown on hover) */}
        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            disabled={isDeleting}
            className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 shrink-0"
            title="Delete message"
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        )}
      </div>

      {/* Gallery lightbox */}
      {selectedGalleryIndex !== null && images.length > 0 && (
        <MessageGallery
          images={images}
          onClose={() => setSelectedGalleryIndex(null)}
        />
      )}
    </>
  );
}
