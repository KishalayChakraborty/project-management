import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAuth, requireOrgRole, requireProjectAccess } from '@/lib/auth';
import { generateMissingOccurrences } from '@/lib/recurring';

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  type: z.enum(['BUG', 'FEATURE', 'TASK', 'CHANGE', 'RESEARCH', 'OTHER']).default('TASK'),
  priority: z.enum(['P0', 'P1', 'P2', 'P3', 'P4']).default('P4'),
  assigneeUserId: z.string().uuid().optional().nullable(),
  reviewerUserId: z.string().uuid().optional().nullable(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'SEMI_ANNUALLY', 'ANNUALLY']),
  startDate: z.string(),
  endDate: z.string().optional().nullable(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgId: string; projectId: string }> }
) {
  try {
    const { orgId, projectId } = await params;
    const user = await requireAuth();
    await requireProjectAccess(orgId, projectId, user.id);

    // Auto-generate missing occurrences for active templates on every load
    const templates = await prisma.recurringTaskTemplate.findMany({
      where: { projectId, orgId, isActive: true },
      include: {
        occurrences: { select: { id: true, periodStart: true, periodEnd: true, taskId: true } },
        assignee: { select: { id: true, name: true, email: true } },
        reviewer: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    await Promise.all(templates.map((t) => generateMissingOccurrences(t)));

    // Re-fetch with fresh occurrence data + task status
    const fresh = await prisma.recurringTaskTemplate.findMany({
      where: { projectId, orgId },
      include: {
        occurrences: {
          include: {
            task: {
              select: { id: true, title: true, status: true, deadlineDt: true, startDt: true, assigneeUserId: true },
            },
          },
          orderBy: { periodStart: 'desc' },
        },
        assignee: { select: { id: true, name: true, email: true } },
        reviewer: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ templates: fresh });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Access denied' || error.message === 'Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch recurring tasks' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string; projectId: string }> }
) {
  try {
    const { orgId, projectId } = await params;
    const user = await requireAuth();
    await requireOrgRole(orgId, user.id, ['ADMIN', 'MAINTAINER']);

    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { orgId: true } });
    if (!project || project.orgId !== orgId) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();
    const data = createSchema.parse(body);

    const template = await prisma.recurringTaskTemplate.create({
      data: {
        projectId,
        orgId,
        title: data.title,
        description: data.description,
        type: data.type,
        priority: data.priority,
        assigneeUserId: data.assigneeUserId ?? null,
        reviewerUserId: data.reviewerUserId ?? null,
        frequency: data.frequency,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        createdBy: user.id,
      },
      include: {
        occurrences: true,
        assignee: { select: { id: true, name: true, email: true } },
        reviewer: { select: { id: true, name: true, email: true } },
      },
    });

    // Generate occurrences immediately for past periods
    const withOccurrences = { ...template, occurrences: [] as { periodStart: Date }[] };
    await generateMissingOccurrences(withOccurrences);

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    if (error instanceof Error && (error.message === 'Access denied' || error.message === 'Insufficient permissions')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to create recurring task' }, { status: 500 });
  }
}
