import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAuth, requireOrgRole, requireProjectAccess } from '@/lib/auth';

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  priority: z.enum(['P0', 'P1', 'P2', 'P3', 'P4']).optional(),
  assigneeUserId: z.string().uuid().optional().nullable(),
  reviewerUserId: z.string().uuid().optional().nullable(),
  endDate: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orgId: string; projectId: string; templateId: string }> }
) {
  try {
    const { orgId, projectId, templateId } = await params;
    const user = await requireAuth();
    await requireOrgRole(orgId, user.id, ['ADMIN', 'MAINTAINER']);

    const tmpl = await prisma.recurringTaskTemplate.findUnique({ where: { id: templateId } });
    if (!tmpl || tmpl.projectId !== projectId || tmpl.orgId !== orgId) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const body = await request.json();
    const data = updateSchema.parse(body);

    const updated = await prisma.recurringTaskTemplate.update({
      where: { id: templateId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.assigneeUserId !== undefined && { assigneeUserId: data.assigneeUserId }),
        ...(data.reviewerUserId !== undefined && { reviewerUserId: data.reviewerUserId }),
        ...(data.endDate !== undefined && { endDate: data.endDate ? new Date(data.endDate) : null }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: {
        occurrences: { include: { task: { select: { id: true, title: true, status: true, deadlineDt: true } } }, orderBy: { periodStart: 'desc' } },
        assignee: { select: { id: true, name: true, email: true } },
        reviewer: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ template: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    if (error instanceof Error && (error.message === 'Access denied' || error.message === 'Insufficient permissions')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ orgId: string; projectId: string; templateId: string }> }
) {
  try {
    const { orgId, projectId, templateId } = await params;
    const user = await requireAuth();
    await requireOrgRole(orgId, user.id, ['ADMIN', 'MAINTAINER']);

    const tmpl = await prisma.recurringTaskTemplate.findUnique({ where: { id: templateId } });
    if (!tmpl || tmpl.projectId !== projectId || tmpl.orgId !== orgId) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    await prisma.recurringTaskTemplate.delete({ where: { id: templateId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Access denied' || error.message === 'Insufficient permissions')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}
