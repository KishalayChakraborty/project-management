import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAuth, requireOrgAccess, requireProjectAccess } from '@/lib/auth';
import type { Prisma } from '@/app/generated/prisma/client';

const createDocSchema = z.object({
  title: z.string().min(1).max(200),
  type: z.enum(['LINK', 'CREDENTIAL', 'NOTE']),
  visibility: z.enum(['MEMBERS', 'ADMIN_ONLY']).default('MEMBERS'),
  content: z.string().optional(),
  url: z.string().url().optional().or(z.literal('')),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string; projectId: string }> }
) {
  try {
    const { orgId, projectId } = await params;
    const user = await requireAuth();
    const member = await requireProjectAccess(orgId, projectId, user.id);

    const isPrivileged = member.role === 'ADMIN' || member.role === 'MAINTAINER';

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { orgId: true },
    });
    if (!project || project.orgId !== orgId) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const where: Prisma.ProjectDocWhereInput = {
      projectId,
      orgId,
      ...(isPrivileged ? {} : { visibility: 'MEMBERS' }),
    };

    const docs = await prisma.projectDoc.findMany({
      where,
      include: { creator: { select: { id: true, name: true, email: true } } },
      orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return NextResponse.json({ docs });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Access denied' || error.message === 'Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch docs' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string; projectId: string }> }
) {
  try {
    const { orgId, projectId } = await params;
    const user = await requireAuth();
    const member = await requireProjectAccess(orgId, projectId, user.id);

    if (member.role === 'MEMBER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { orgId: true },
    });
    if (!project || project.orgId !== orgId) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();
    const data = createDocSchema.parse(body);

    const doc = await prisma.projectDoc.create({
      data: {
        projectId,
        orgId,
        title: data.title,
        type: data.type,
        visibility: data.visibility,
        content: data.content,
        url: data.url || null,
        metadata: (data.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        createdBy: user.id,
      },
      include: { creator: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json({ doc }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    if (error instanceof Error && (error.message === 'Access denied' || error.message === 'Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to create doc' }, { status: 500 });
  }
}
