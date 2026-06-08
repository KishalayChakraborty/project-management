-- Add new columns to task_comments table
ALTER TABLE "task_comments" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Create comment_attachments table
CREATE TABLE "comment_attachments" (
    "id" TEXT NOT NULL,
    "comment_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "minio_path" TEXT NOT NULL,
    "public_url" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_attachments_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraint
ALTER TABLE "comment_attachments" ADD CONSTRAINT "comment_attachments_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "task_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create index on comment_id for faster queries
CREATE INDEX "comment_attachments_comment_id_idx" ON "comment_attachments"("comment_id");

-- Create index on task_comments.user_id for consistency
CREATE INDEX "task_comments_user_id_idx" ON "task_comments"("user_id");
