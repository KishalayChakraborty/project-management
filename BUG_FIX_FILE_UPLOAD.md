# 🔧 Bug Fix: File Upload "Comment ID Required" Error

## Problem
When uploading files to comments, users were getting error:
```
{"error":"Comment ID required"}
```

This happened because the `commentId` was not being passed correctly to the upload endpoint.

## Root Cause
The upload hook was initialized with an empty `commentId`:
```typescript
const uploadFiles = useCommentUpload(orgId, projectId, taskId, '');
```

Then when trying to upload files, the hook still used the empty string instead of the actual comment ID from the newly created comment.

## Solution
Changed the upload hook signature to accept `commentId` as a parameter during the `mutate` call, not during hook creation:

### Before:
```typescript
// Hook creation with empty commentId
const uploadFiles = useCommentUpload(orgId, projectId, taskId, '');

// Upload attempt (but commentId is still empty!)
uploadFiles.mutate(files, {
  onSuccess: () => { ... }
});
```

### After:
```typescript
// Hook creation without commentId
const uploadFiles = useCommentUpload(orgId, projectId, taskId);

// Upload with actual commentId from created comment
uploadFiles.mutate(
  { files, commentId: newComment.id },
  {
    onSuccess: () => { ... }
  }
);
```

## Files Changed

1. **`hooks/tasks/useCommentUpload.ts`**
   - Changed mutationFn to accept `{ files, commentId }` object
   - CommentId is now passed at mutation time, not hook creation

2. **`components/tasks/TaskCommentSection.tsx`**
   - Removed empty string parameter from hook creation
   - Updated upload call to pass `{ files, commentId: newComment.id }`

3. **`components/comments/FloatingCommentBox.tsx`**
   - Removed empty string parameter from hook creation
   - Updated upload call to pass `{ files, commentId: newComment.id }`

## How It Works Now

1. **User sends message with files**
   ```
   Message Composer → handleSendMessage(text, files)
   ```

2. **Comment created first**
   ```
   addComment.mutate(text) → creates comment, returns newComment.id
   ```

3. **Files uploaded to comment**
   ```
   uploadFiles.mutate({ files, commentId: newComment.id })
   ```

4. **API endpoint receives commentId**
   ```
   POST /api/.../comments/upload
   Body: { file: File, commentId: "uuid" }
   ✅ commentId is now valid
   ```

## Testing

Try uploading a file:
1. Open any task comment section
2. Click 📎 to attach a file (or drag/paste)
3. Type a message (optional)
4. Click Send

✅ File should upload successfully  
✅ Error should not appear  
✅ File should appear in message

---

## Verification

All TypeScript types are correct:
- `useCommentUpload` accepts object with `{ files: File[], commentId: string }`
- Upload endpoint receives valid commentId
- Files are properly attached to correct comment

Status: ✅ **FIXED**
