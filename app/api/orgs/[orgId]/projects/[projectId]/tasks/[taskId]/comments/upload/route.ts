import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, requireProjectAccess } from '@/lib/auth';
import { uploadFile } from '@/lib/minio';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string; projectId: string; taskId: string }> }
) {
  try {
    const { orgId, projectId, taskId } = await params;
    const user = await requireAuth();
    await requireProjectAccess(orgId, projectId, user.id);

    // Validate task exists and belongs to correct project/org
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: { select: { orgId: true } } },
    });

    if (!task || task.project.orgId !== orgId || task.projectId !== projectId) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const commentId = formData.get('commentId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!commentId) {
      return NextResponse.json({ error: 'Comment ID required' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit` },
        { status: 400 }
      );
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not allowed' },
        { status: 400 }
      );
    }

    // Verify comment exists and belongs to this task
    const comment = await prisma.taskComment.findUnique({
      where: { id: commentId },
      select: { taskId: true },
    });

    if (!comment || comment.taskId !== taskId) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to MinIO
    const { path: minioPath, url: publicUrl } = await uploadFile(
      buffer,
      file.name,
      file.type
    );

    // Save attachment metadata to database
    const attachment = await prisma.commentAttachment.create({
      data: {
        commentId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        minioPath,
        publicUrl,
      },
    });

    return NextResponse.json({ attachment }, { status: 201 });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';

    console.error('❌ File upload error details:', {
      message: errorMsg,
      stack: errorStack,
      type: error?.constructor?.name,
    });

    if (error instanceof Error && error.message === 'Access denied') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Return more helpful error message
    return NextResponse.json(
      {
        error: 'File upload failed',
        details: errorMsg,
      },
      { status: 500 }
    );
  }
}
