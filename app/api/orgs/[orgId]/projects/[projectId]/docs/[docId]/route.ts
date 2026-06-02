import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAuth, requireProjectAccess } from '@/lib/auth';
import type { Prisma } from '@/app/generated/prisma/client';

const updateDocSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  visibility: z.enum(['MEMBERS', 'ADMIN_ONLY']).optional(),
  content: z.string().optional(),
  url: z.string().url().optional().or(z.literal('')),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orgId: string; projectId: string; docId: string }> }
) {
  try {
    const { orgId, projectId, docId } = await params;
    const user = await requireAuth();
    const member = await requireProjectAccess(orgId, projectId, user.id);

    if (member.role === 'MEMBER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const doc = await prisma.projectDoc.findUnique({
      where: { id: docId },
      select: { projectId: true, orgId: true },
    });
    if (!doc || doc.projectId !== projectId || doc.orgId !== orgId) {
      return NextResponse.json({ error: 'Doc not found' }, { status: 404 });
    }

    const body = await request.json();
    const data = updateDocSchema.parse(body);

    const updated = await prisma.projectDoc.update({
      where: { id: docId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.visibility !== undefined && { visibility: data.visibility }),
        ...(data.content !== undefined && { content: data.content }),
        ...(data.url !== undefined && { url: data.url || null }),
        ...(data.metadata !== undefined && { metadata: data.metadata as Prisma.InputJsonValue }),
      },
      include: { creator: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json({ doc: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    if (error instanceof Error && (error.message === 'Access denied' || error.message === 'Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to update doc' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ orgId: string; projectId: string; docId: string }> }
) {
  try {
    const { orgId, projectId, docId } = await params;
    const user = await requireAuth();
    const member = await requireProjectAccess(orgId, projectId, user.id);

    if (member.role === 'MEMBER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const doc = await prisma.projectDoc.findUnique({
      where: { id: docId },
      select: { projectId: true, orgId: true, createdBy: true },
    });
    if (!doc || doc.projectId !== projectId || doc.orgId !== orgId) {
      return NextResponse.json({ error: 'Doc not found' }, { status: 404 });
    }

    await prisma.projectDoc.delete({ where: { id: docId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Access denied' || error.message === 'Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to delete doc' }, { status: 500 });
  }
}
