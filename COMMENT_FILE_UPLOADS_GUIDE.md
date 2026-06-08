# Comment File Uploads - Implementation Guide

## Overview

This project now supports file/image uploads in task comments. Files are stored in MinIO (S3-compatible object storage) with metadata tracked in PostgreSQL.

## Features

✅ Upload images (JPEG, PNG, GIF, WebP) to comments  
✅ Upload documents (PDF, Word, Text) to comments  
✅ File size validation (max 10MB)  
✅ MIME type validation  
✅ Automatic thumbnail/preview for images  
✅ Download links for all file types  
✅ Inline image preview in comments  

## Architecture

### Database Changes

Added two changes to the schema:

1. **TaskComment Model** - Added `updatedAt` timestamp field
2. **CommentAttachment Model** - New model for tracking file attachments

```prisma
model CommentAttachment {
  id           String   @id @default(uuid())
  commentId    String   @map("comment_id")
  fileName     String   @map("file_name")
  fileSize     Int      @map("file_size")
  mimeType     String   @map("mime_type")
  minioPath    String   @map("minio_path")
  publicUrl    String   @map("public_url")
  uploadedAt   DateTime @default(now()) @map("uploaded_at")

  comment      TaskComment @relation(...)

  @@index([commentId])
  @@map("comment_attachments")
}
```

**Migration**: `prisma/migrations/20260607_add_comment_attachments/migration.sql`

### API Endpoints

#### POST `/api/orgs/[orgId]/projects/[projectId]/tasks/[taskId]/comments/upload`

Upload a file attachment to a comment.

**Request:**
```
Method: POST
Content-Type: multipart/form-data

Body:
- file: File (required) - The file to upload
- commentId: string (required) - ID of the comment to attach file to
```

**Response:**
```json
{
  "attachment": {
    "id": "uuid",
    "fileName": "example.png",
    "fileSize": 1024,
    "mimeType": "image/png",
    "publicUrl": "http://localhost:9000/uploads/timestamp-example.png",
    "uploadedAt": "2024-06-07T10:00:00Z"
  }
}
```

**Validation:**
- File size: max 10MB
- MIME types: image/jpeg, image/png, image/gif, image/webp, application/pdf, text/plain, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document
- Comment must exist and belong to the task
- User must have project access

#### GET `/api/orgs/[orgId]/projects/[projectId]/tasks/[taskId]/comments`

Fetch comments with attachments.

**Response includes attachments:**
```json
{
  "comments": [
    {
      "id": "comment-uuid",
      "content": "This is a comment",
      "user": { "id": "...", "name": "...", "email": "..." },
      "attachments": [
        {
          "id": "attachment-uuid",
          "fileName": "screenshot.png",
          "fileSize": 102400,
          "mimeType": "image/png",
          "publicUrl": "http://localhost:9000/uploads/..."
        }
      ],
      "createdAt": "2024-06-07T10:00:00Z"
    }
  ],
  "nextCursor": "..."
}
```

### MinIO Configuration

Set up MinIO credentials in `.env`:

```bash
# MinIO server endpoint
MINIO_ENDPOINT=localhost:9000

# Use HTTP for local development, HTTPS for production
MINIO_USE_SSL=false

# MinIO access credentials
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# Bucket names
MINIO_BUCKET_NAME=project-management
MINIO_UPLOADS_BUCKET=uploads

# Public URL for accessing uploaded files
MINIO_PUBLIC_URL=http://localhost:9000
```

### Components

#### FileUploadInput
Location: `components/comments/FileUploadInput.tsx`

A reusable file input component with validation and UI feedback.

**Props:**
```typescript
interface FileUploadInputProps {
  onFileSelect?: (file: File) => void;
  isLoading?: boolean;
  maxFileSize?: number; // default 10MB
}
```

**Usage:**
```tsx
<FileUploadInput
  onFileSelect={(file) => setSelectedFile(file)}
  isLoading={isUploading}
/>
```

#### CommentAttachments
Location: `components/comments/CommentAttachments.tsx`

Displays attached files in comments with inline previews for images.

**Props:**
```typescript
interface CommentAttachmentsProps {
  attachments: Attachment[];
}
```

**Features:**
- Inline image previews (max-height: 192px)
- Download links for all file types
- File size formatting
- File icons based on type

#### FloatingCommentBox
Updated with file upload support:
- File selection via FileUploadInput
- Display attachments via CommentAttachments
- Disabled submit button if no text and no file

### Utilities

#### lib/minio.ts

Helper functions for MinIO operations:

```typescript
// Get MinIO client singleton
getMinioClient(): Client

// Upload file to MinIO
uploadFile(
  file: Buffer,
  fileName: string,
  mimeType: string,
  bucketName?: string
): Promise<{ path: string; url: string }>

// Delete file from MinIO
deleteFile(filePath: string): Promise<void>

// Get public URL for a file
getFileUrl(filePath: string): Promise<string>

// Validate/create bucket
validateBucket(bucketName?: string): Promise<boolean>
```

### Hooks

#### useCommentUpload
Location: `hooks/tasks/useCommentUpload.ts`

React Query mutation hook for uploading files to comments.

**Usage:**
```typescript
const uploadMutation = useCommentUpload(orgId, projectId, taskId, commentId);

uploadMutation.mutate(file, {
  onSuccess: (attachment) => console.log('Uploaded:', attachment),
  onError: (error) => console.error('Upload failed:', error),
});
```

## Testing

### Prerequisites

1. **MinIO Running**: Verify MinIO is accessible
   ```bash
   curl -s http://localhost:9000/minio/health/live
   ```

2. **Database Migrated**: Ensure migrations are applied
   ```bash
   npx prisma migrate deploy
   ```

3. **Environment Variables**: Set in `.env`

### Manual Testing

1. **Start the application**
   ```bash
   npm run dev
   ```

2. **Open task details page** and navigate to a task

3. **Open comment box** using the floating comment button

4. **Test file upload:**
   - Click "Add file" button
   - Select an image or document
   - Enter comment text (optional with image)
   - Click send
   - Verify file appears as attachment

5. **Verify in MinIO Console**
   ```
   http://localhost:9001
   ```
   - Login with minioadmin/minioadmin
   - Check the `uploads` bucket for uploaded files

### Automated Testing

Test the upload endpoint directly:

```bash
# Create a comment first
TASK_ID="your-task-id"
ORG_ID="your-org-id"
PROJECT_ID="your-project-id"
COMMENT_ID="your-comment-id"

# Upload a test file
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test-image.png" \
  -F "commentId=$COMMENT_ID" \
  "http://localhost:3000/api/orgs/$ORG_ID/projects/$PROJECT_ID/tasks/$TASK_ID/comments/upload"
```

## File Size Limits

- **Maximum file size**: 10 MB
- **Recommended for images**: < 2 MB (for fast loading)
- **Recommended for documents**: < 5 MB

To change limits:
1. Update `MAX_FILE_SIZE` in `app/api/.../comments/upload/route.ts`
2. Update `maxFileSize` prop in `FileUploadInput` component

## Security Considerations

1. **MIME Type Validation**: Only allowed types can be uploaded
2. **File Size Validation**: Prevents large file uploads
3. **Access Control**: Users must have project access
4. **Unique File Naming**: Files renamed with timestamp prefix to prevent conflicts
5. **Database Constraints**: Foreign key constraints ensure data integrity

## Troubleshooting

### Upload fails with "Access denied"
- Verify user has project access
- Check authentication token
- Confirm task exists

### Upload fails with "File type not allowed"
- Only these types are allowed: images (JPEG, PNG, GIF, WebP), PDFs, Word, Text
- Update `ALLOWED_MIME_TYPES` to support more types

### MinIO connection errors
- Verify MinIO is running: `curl http://localhost:9000/minio/health/live`
- Check `MINIO_ENDPOINT` and `MINIO_PUBLIC_URL` in `.env`
- Verify credentials are correct

### Files not appearing in comments
- Check browser console for upload errors
- Verify Prisma migration was applied
- Check MinIO bucket exists and is accessible

## Future Enhancements

Potential improvements:
- [ ] Drag-and-drop file upload
- [ ] Multiple file uploads per comment
- [ ] File attachment deletion
- [ ] Thumbnail caching
- [ ] Virus scanning for uploads
- [ ] Detailed file metadata (dimensions, duration, etc.)
- [ ] Archive downloads (zip multiple attachments)
- [ ] Cloud storage alternatives (AWS S3, Google Cloud Storage)

## References

- [MinIO Documentation](https://docs.min.io/)
- [MinIO Node.js SDK](https://github.com/minio/minio-js)
- [Prisma Relations](https://www.prisma.io/docs/concepts/relations)
