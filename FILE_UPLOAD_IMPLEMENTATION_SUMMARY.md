# File Upload to Comments - Implementation Summary

## ✅ What's Been Done

### 1. **Environment Configuration** 
- Added MinIO credentials to `.env`:
  - `MINIO_ENDPOINT=localhost:9000`
  - `MINIO_ACCESS_KEY=minioadmin`
  - `MINIO_SECRET_KEY=minioadmin`
  - `MINIO_UPLOADS_BUCKET=uploads`
  - `MINIO_PUBLIC_URL=http://localhost:9000`

### 2. **Database Schema**
- **Migration Applied**: `prisma/migrations/20260607_add_comment_attachments/`
  - Added `updatedAt` to `TaskComment` model
  - Created new `CommentAttachment` model
  - Added indexes for performance

**Schema Changes:**
```sql
ALTER TABLE task_comments ADD COLUMN updated_at TIMESTAMP(3);
CREATE TABLE comment_attachments (
  id TEXT PRIMARY KEY,
  comment_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  minio_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  uploaded_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (comment_id) REFERENCES task_comments(id) ON DELETE CASCADE
);
```

### 3. **Backend API**
- **File Upload Endpoint**: `POST /api/orgs/[orgId]/projects/[projectId]/tasks/[taskId]/comments/upload`
  - Validates file size (max 10MB)
  - Validates MIME types
  - Stores file in MinIO
  - Saves metadata in PostgreSQL
  - Returns public URL for accessing file

- **Comment Endpoints Updated**:
  - GET comments now includes attachments data
  - POST creates comment with support for file uploads

### 4. **MinIO Integration**
- **File**: `lib/minio.ts`
- **Functions**:
  - `getMinioClient()` - Singleton client
  - `uploadFile()` - Upload to MinIO
  - `deleteFile()` - Delete from MinIO
  - `getFileUrl()` - Get public URLs
  - `validateBucket()` - Ensure bucket exists

### 5. **React Components**
- **FileUploadInput** (`components/comments/FileUploadInput.tsx`)
  - Reusable file selection component
  - Client-side validation
  - File type and size checking
  - Loading states

- **CommentAttachments** (`components/comments/CommentAttachments.tsx`)
  - Display attached files in comments
  - Inline image previews
  - Download links for all file types
  - File size formatting

- **FloatingCommentBox** (`components/comments/FloatingCommentBox.tsx`)
  - **Updated with:**
    - File upload input UI
    - Attachment display
    - Enhanced submit logic
    - Responsive layout

### 6. **React Hooks**
- **useCommentUpload** (`hooks/tasks/useCommentUpload.ts`)
  - React Query mutation hook
  - Handles file upload to server
  - Provides loading/error states

### 7. **Dependencies**
- Installed: `minio` (v7.x) - S3-compatible SDK
- Already included: axios (for HTTP requests), React Query (for mutations)

---

## 📋 Features Implemented

✅ Upload images (JPEG, PNG, GIF, WebP) to comments  
✅ Upload documents (PDF, Word, Text) to comments  
✅ File size validation (max 10MB)  
✅ MIME type validation  
✅ Automatic file naming with timestamp  
✅ Inline image preview in comments  
✅ Download links for all attachments  
✅ Database persistence with metadata  
✅ Access control (users must have project access)  
✅ Cascading delete (deleting comment removes files)  

---

## 🚀 How to Use

### For Users
1. Open a task detail page
2. Click the floating comment button
3. In the comment box:
   - Click "Add file" to select a file
   - Type optional comment text
   - Click send
4. File appears as attachment below the comment text

### For Developers

**Upload a file:**
```javascript
const uploadMutation = useCommentUpload(orgId, projectId, taskId, commentId);

uploadMutation.mutate(file, {
  onSuccess: (attachment) => console.log('Uploaded:', attachment),
  onError: (error) => console.error('Failed:', error),
});
```

**Fetch comments with attachments:**
```javascript
const response = await fetch(
  `/api/orgs/${orgId}/projects/${projectId}/tasks/${taskId}/comments`
);
const { comments } = await response.json();
comments.forEach(comment => {
  comment.attachments.forEach(attachment => {
    console.log(attachment.publicUrl);
  });
});
```

---

## 📁 Files Created/Modified

### New Files
- `lib/minio.ts` - MinIO client utilities
- `components/comments/FileUploadInput.tsx` - File selection component
- `components/comments/CommentAttachments.tsx` - Attachment display
- `hooks/tasks/useCommentUpload.ts` - Upload mutation hook
- `app/api/orgs/[orgId]/projects/[projectId]/tasks/[taskId]/comments/upload/route.ts` - Upload endpoint
- `prisma/migrations/20260607_add_comment_attachments/migration.sql` - Database migration
- `COMMENT_FILE_UPLOADS_GUIDE.md` - Complete implementation guide

### Modified Files
- `.env` - Added MinIO configuration
- `prisma/schema.prisma` - Added CommentAttachment model
- `components/comments/FloatingCommentBox.tsx` - Added file upload UI
- `app/api/orgs/[orgId]/projects/[projectId]/tasks/[taskId]/comments/route.ts` - Return attachments

---

## 🔒 Security

- ✅ MIME type validation (only safe types allowed)
- ✅ File size validation (max 10MB)
- ✅ Access control (user must have project access)
- ✅ Unique file naming (timestamp + original name)
- ✅ Database constraints (cascading deletes)
- ✅ Sandboxed storage (dedicated MinIO bucket)

---

## 🧪 Testing

### Quick Test
```bash
# 1. Verify MinIO is running
curl http://localhost:9000/minio/health/live

# 2. Start the app
npm run dev

# 3. Open browser to http://localhost:3000
# 4. Navigate to a task
# 5. Open comment box and try uploading a file
```

### Check MinIO Console
- URL: http://localhost:9001
- Username: minioadmin
- Password: minioadmin
- Navigate to `uploads` bucket to verify files

---

## ⚙️ Configuration

All settings are in `.env`:

```bash
# MinIO connection
MINIO_ENDPOINT=localhost:9000          # Server address
MINIO_USE_SSL=false                    # Use HTTPS for production
MINIO_ACCESS_KEY=minioadmin            # Access credentials
MINIO_SECRET_KEY=minioadmin
MINIO_UPLOADS_BUCKET=uploads           # Storage bucket
MINIO_PUBLIC_URL=http://localhost:9000 # Public file access URL
```

---

## 📊 Data Model

### CommentAttachment Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Unique identifier |
| comment_id | UUID | Reference to task_comments |
| file_name | TEXT | Original filename |
| file_size | INT | Size in bytes |
| mime_type | TEXT | Content type (e.g., image/png) |
| minio_path | TEXT | Path in MinIO bucket |
| public_url | TEXT | Public URL for access |
| uploaded_at | TIMESTAMP | Upload timestamp |

---

## 🐛 Troubleshooting

**Files not uploading?**
1. Check MinIO is running: `curl http://localhost:9000/minio/health/live`
2. Verify `.env` configuration
3. Check browser console for errors
4. Verify database migration applied: `npx prisma migrate status`

**Images not showing?**
1. Check `MINIO_PUBLIC_URL` matches MinIO server
2. Verify file exists in MinIO console
3. Check network tab in DevTools

**Permissions error?**
1. Verify user has project access
2. Check authentication token
3. Verify task belongs to correct org/project

---

## 📚 Next Steps (Optional)

Future enhancements could include:
- [ ] Drag-and-drop uploads
- [ ] Multiple files per comment
- [ ] Delete attachment button
- [ ] Image compression
- [ ] Virus scanning
- [ ] CDN integration
- [ ] Archive downloads (zip files)

---

## 📖 Documentation

For complete details, see: `COMMENT_FILE_UPLOADS_GUIDE.md`

This includes:
- Architecture overview
- API documentation
- Component reference
- Hook usage examples
- Testing procedures
- Security considerations
