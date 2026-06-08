'use client';

import { FileIcon, Download, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';

import type { CommentAttachment } from '@/hooks/tasks/useTaskComments';

interface CommentAttachmentsProps {
  attachments: CommentAttachment[];
}

export function CommentAttachments({ attachments }: CommentAttachmentsProps) {
  if (!attachments || attachments.length === 0) {
    return null;
  }

  const isImage = (mimeType: string) => mimeType.startsWith('image/');
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="mt-2 space-y-2">
      {attachments.map((attachment) => {
        const isImg = isImage(attachment.mimeType);

        return (
          <div key={attachment.id} className="space-y-2">
            {isImg && (
              <div className="max-w-xs">
                <img
                  src={attachment.publicUrl}
                  alt={attachment.fileName}
                  className="max-h-48 rounded border"
                />
              </div>
            )}

            <Link
              href={attachment.publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-2 py-1 rounded bg-muted/30 hover:bg-muted/50 text-xs transition-colors"
            >
              {isImg ? (
                <ImageIcon className="h-3.5 w-3.5" />
              ) : (
                <FileIcon className="h-3.5 w-3.5" />
              )}
              <span className="truncate max-w-xs">{attachment.fileName}</span>
              <span className="text-muted-foreground text-[10px]">
                ({formatFileSize(attachment.fileSize)})
              </span>
              <Download className="h-3 w-3 ml-1" />
            </Link>
          </div>
        );
      })}
    </div>
  );
}
