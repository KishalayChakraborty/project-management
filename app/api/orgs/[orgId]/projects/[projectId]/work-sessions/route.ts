import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAuth, requireProjectAccess } from '@/lib/auth';
import { WorkSessionStatus } from '@/app/generated/prisma/client';

const startWorkSessionSchema = z.object({
  taskId: z.string().uuid(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string; projectId: string }> }
) {
  try {
    const { orgId, projectId } = await params;
    const user = await requireAuth();
    await requireProjectAccess(orgId, projectId, user.id);

    const activeSession = await prisma.workSession.findFirst({
      where: {
        projectId,
        userId: user.id,
        status: { in: ['ACTIVE', 'PAUSED'] as WorkSessionStatus[] },
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
          },
        },
        segments: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return NextResponse.json({ session: activeSession });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Access denied') {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }
    return NextResponse.json({ error: 'Failed to fetch work session' }, { status: 500 });
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
    const data = startWorkSessionSchema.parse(body);

    const task = await prisma.task.findUnique({
      where: { id: data.taskId },
      select: { projectId: true },
    });
    if (!task || task.projectId !== projectId) {
      return NextResponse.json({ error: 'Task not found in this project' }, { status: 400 });
    }

    // Check if user already has an active session in this project
    const existingSession = await prisma.workSession.findFirst({
      where: {
        projectId,
        userId: user.id,
        status: 'ACTIVE',
      },
    });

    if (existingSession) {
      return NextResponse.json(
        { error: 'You already have an active work session in this project. Please stop it before starting a new one.' },
        { status: 409 }
      );
    }

    const now = new Date();
    const workSession = await prisma.workSession.create({
      data: {
        orgId,
        projectId,
        taskId: data.taskId,
        userId: user.id,
        startDt: now,
        status: 'ACTIVE',
        segments: {
          create: {
            startDt: now,
          },
        },
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
          },
        },
        segments: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return NextResponse.json({ session: workSession }, { status: 201 });
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
      if (error.message.includes('unique constraint')) {
        return NextResponse.json(
          { error: 'You already have an active work session in this project' },
          { status: 409 }
        );
      }
    }
    return NextResponse.json({ error: 'Failed to start work session' }, { status: 500 });
  }
}
