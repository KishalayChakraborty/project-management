# File Upload Feature - Quick Start Guide

## 🚀 Getting Started (5 minutes)

### 1. Verify MinIO is Running
```bash
curl http://localhost:9000/minio/health/live
# Should return: OK
```

### 2. Check Environment Variables
Open `.env` and verify these are set:
```bash
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_UPLOADS_BUCKET=uploads
MINIO_PUBLIC_URL=http://localhost:9000
```

### 3. Start the Application
```bash
npm run dev
# App will start on http://localhost:3000
```

### 4. Test the Feature

**Step 1: Open a task**
- Navigate to http://localhost:3000
- Open any project
- Click on a task to view details

**Step 2: Open comment box**
- Look for the floating comment button (💬 icon) in the bottom-right
- Click it to open the comment selector
- Select a project, task from the popup

**Step 3: Upload a file**
- In the comment box, click "Add file"
- Select an image or document
- Enter optional comment text
- Click the send button

**Step 4: Verify upload**
- File should appear as an attachment below comment text
- For images, you'll see an inline preview
- For documents, you'll see a download link

### 5. Verify in MinIO Console (Optional)
```
URL: http://localhost:9001
Username: minioadmin
Password: minioadmin
```
- Navigate to `uploads` bucket
- You should see your uploaded files

---

## 📋 Supported File Types

✅ **Images:**
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)

✅ **Documents:**
- PDF (.pdf)
- Word (.doc, .docx)
- Text (.txt)

❌ **NOT supported:**
- Executable files (.exe, .sh, etc.)
- Archives (.zip, .rar, etc.)
- Scripts (.js, .py, etc.)

---

## 🔍 Troubleshooting

### Issue: "MinIO connection failed"
**Solution:**
```bash
# Check if MinIO is running
curl http://localhost:9000/minio/health/live

# If not, check docker
docker ps | grep minio
```

### Issue: Upload button doesn't appear
**Solution:**
```bash
# Regenerate Prisma client
npx prisma generate

# Check TypeScript errors
npx tsc --noEmit
```

### Issue: File upload fails with "File type not allowed"
**Solution:** Only the supported file types listed above are allowed. Check the file extension.

### Issue: File uploads but doesn't appear
**Solution:**
1. Check browser console for errors (F12)
2. Verify Prisma migration was applied:
   ```bash
   npx prisma migrate status
   ```
3. Check that the migration `20260607_add_comment_attachments` is applied

---

## 💡 Testing Checklist

- [ ] MinIO is running and accessible
- [ ] Environment variables are set in `.env`
- [ ] App starts without errors (`npm run dev`)
- [ ] Can open a task
- [ ] Can open comment box
- [ ] Can select and upload a file
- [ ] File appears as attachment
- [ ] Can see image preview (for image files)
- [ ] Can download file (click attachment link)
- [ ] Can verify file in MinIO console

---

## 📊 Architecture

```
User uploads file
        ↓
React Component (FileUploadInput)
        ↓
API Endpoint (/api/.../comments/upload)
        ↓
MinIO Storage (stores actual file)
PostgreSQL Database (stores metadata)
        ↓
Public URL returned to client
        ↓
Displayed in comment box
```

---

## 🔐 What's Protected

✅ Only authenticated users can upload  
✅ User must have access to the project  
✅ Only safe file types allowed  
✅ File size limited to 10MB  
✅ Files stored with unique names  
✅ Database constraints prevent orphaned files  

---

## 📚 More Information

- **Full documentation**: See `COMMENT_FILE_UPLOADS_GUIDE.md`
- **Implementation details**: See `FILE_UPLOAD_IMPLEMENTATION_SUMMARY.md`

---

## ⚡ Common Tasks

**Change maximum file size:**
1. Edit: `app/api/.../comments/upload/route.ts`
2. Find: `const MAX_FILE_SIZE = 10 * 1024 * 1024`
3. Update value (e.g., 20 MB = `20 * 1024 * 1024`)

**Add more allowed file types:**
1. Edit: `app/api/.../comments/upload/route.ts`
2. Find: `const ALLOWED_MIME_TYPES = [...]`
3. Add MIME type (e.g., `'video/mp4'`)
4. Also update: `components/comments/FileUploadInput.tsx`

**Test API directly:**
```bash
# First, create a comment to get comment ID
# Then upload a file to it

curl -X POST \
  -F "file=@your-image.png" \
  -F "commentId=COMMENT_ID" \
  -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/orgs/ORG_ID/projects/PROJECT_ID/tasks/TASK_ID/comments/upload"
```

---

## 🎯 Next Steps

1. Test the feature with different file types
2. Verify files appear in MinIO console
3. Check the database for attachment records:
   ```bash
   # Connect to database
   psql postgresql://pm_app:password@localhost:5432/project_management
   
   # Query attachments
   SELECT * FROM comment_attachments LIMIT 10;
   ```
4. Explore the code in:
   - `components/comments/` - UI components
   - `app/api/...comments/upload/` - API handler
   - `lib/minio.ts` - MinIO utilities
   - `hooks/tasks/useCommentUpload.ts` - React hook

---

## ❓ Still have questions?

Check the full documentation: `COMMENT_FILE_UPLOADS_GUIDE.md`

Or review the implementation files:
- `FILE_UPLOAD_IMPLEMENTATION_SUMMARY.md` - Overview of all changes
- `prisma/migrations/20260607_add_comment_attachments/` - Database changes
