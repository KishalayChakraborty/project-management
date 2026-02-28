import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAuth, requireProjectAccess } from '@/lib/auth';
import type { Prisma } from '@/app/generated/prisma/client';

const createWorkLogSchema = z.object({
  totalDurationMin: z.number().int().positive(),
  taskId: z.string().uuid().optional().nullable(),
  segments: z
    .array(
      z.object({
        startDt: z.string().datetime(),
        endDt: z.string().datetime(),
        durationMin: z.number().int().nonnegative(),
        comment: z.string().optional(),
      })
    )
    .optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string; projectId: string }> }
) {
  try {
    const { orgId, projectId } = await params;
    const user = await requireAuth();
    await requireProjectAccess(orgId, projectId, user.id);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '25', 10)), 100);
    const skip = (page - 1) * limit;
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const whereClause: Prisma.WorkLogWhereInput = {
      orgId,
      projectId,
      userId: user.id,
    };
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        (whereClause.createdAt as Prisma.DateTimeFilter<'WorkLog'>).gte = new Date(startDate);
      }
      if (endDate) {
        (whereClause.createdAt as Prisma.DateTimeFilter<'WorkLog'>).lte = new Date(endDate);
      }
    }

    const orderByClause: Record<string, unknown> = {};
    if (sortBy === 'date') {
      orderByClause.createdAt = sortOrder;
    } else if (sortBy === 'duration') {
      orderByClause.totalDurationMin = sortOrder;
    } else {
      orderByClause.createdAt = 'desc';
    }

    const [workLogs, total] = await Promise.all([
      prisma.workLog.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              avatar: true,
            },
          },
          task: {
            select: {
              id: true,
              title: true,
            },
          },
          segments: {
            orderBy: { startDt: 'asc' },
          },
        },
        skip,
        take: limit,
        orderBy: orderByClause,
      }),
      prisma.workLog.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      workLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Access denied') {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
      if (error.message === 'Project not found') {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
    }
    return NextResponse.json({ error: 'Failed to fetch work logs' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string; projectId: string }> }
) {
  try {
    const { orgId, projectId } = await params;
    const user = await requireAuth();
    await requireProjectAccess(orgId, projectId, user.id);

    const body = await request.json();
    const data = createWorkLogSchema.parse(body);

    if (data.taskId) {
      const task = await prisma.task.findUnique({
        where: { id: data.taskId },
        select: { projectId: true },
      });
      if (!task || task.projectId !== projectId) {
        return NextResponse.json({ error: 'Task not found in this project' }, { status: 400 });
      }
    }

    const workLog = await prisma.workLog.create({
      data: {
        orgId,
        userId: user.id,
        createdBy: user.id,
        projectId,
        taskId: data.taskId ?? null,
        totalDurationMin: data.totalDurationMin,
        segments:
          data.segments?.length ?
            {
              create: data.segments.map((s) => ({
                startDt: new Date(s.startDt),
                endDt: new Date(s.endDt),
                durationMin: s.durationMin,
                comment: s.comment ?? null,
              }))
            }
            : undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
          },
        },
        segments: {
          orderBy: { startDt: 'asc' },
        },
      },
    });

    return NextResponse.json({ workLog }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }
    if (error instanceof Error) {
      if (error.message === 'Access denied') {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
      if (error.message === 'Project not found') {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
    }
    return NextResponse.json({ error: 'Failed to create work log' }, { status: 500 });
  }
}
