'use client';

import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import type { CommentAttachment } from './useTaskComments';

export function useCommentUpload(
  orgId: string,
  projectId: string,
  taskId: string
) {
  return useMutation({
    mutationFn: async ({
      files,
      commentId,
    }: {
      files: File[];
      commentId: string;
    }) => {
      const uploadedAttachments: CommentAttachment[] = [];

      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('commentId', commentId);

        const response = await axios.post(
          `/api/orgs/${orgId}/projects/${projectId}/tasks/${taskId}/comments/upload`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );

        uploadedAttachments.push(response.data.attachment);
      }

      return uploadedAttachments;
    },
  });
}
