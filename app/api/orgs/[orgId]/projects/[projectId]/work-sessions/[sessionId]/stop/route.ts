import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, requireProjectAccess } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string; projectId: string; sessionId: string }> }
) {
  try {
    const { orgId, projectId, sessionId } = await params;
    const user = await requireAuth();
    await requireProjectAccess(orgId, projectId, user.id);

    const session = await prisma.workSession.findUnique({
      where: { id: sessionId },
      include: {
        segments: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.projectId !== projectId || session.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (session.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'This session is already completed' },
        { status: 400 }
      );
    }

    const now = new Date();

    // If session is still active, end the current segment
    let segments = session.segments;
    if (session.status === 'ACTIVE') {
      const lastSegment = segments[segments.length - 1];
      if (lastSegment && !lastSegment.endDt) {
        const durationMin = Math.round(
          (now.getTime() - new Date(lastSegment.startDt).getTime()) / 60000
        );
        await prisma.workSessionSegment.update({
          where: { id: lastSegment.id },
          data: {
            endDt: now,
            durationMin,
          },
        });
      }
    }

    // Calculate total duration
    const updatedSegments = await prisma.workSessionSegment.findMany({
      where: { sessionId },
    });

    const totalDurationMin = updatedSegments.reduce((sum, seg) => sum + seg.durationMin, 0);

    // Create work log from session
    const workLog = await prisma.workLog.create({
      data: {
        orgId,
        projectId,
        taskId: session.taskId,
        userId: session.userId,
        createdBy: user.id,
        totalDurationMin,
        segments: {
          create: updatedSegments.map((seg) => ({
            startDt: new Date(seg.startDt),
            endDt: seg.endDt ? new Date(seg.endDt) : new Date(seg.startDt),
            durationMin: seg.durationMin,
          })),
        },
      },
      include: {
        segments: {
          orderBy: { startDt: 'asc' },
        },
      },
    });

    // Mark session as completed
    const completedSession = await prisma.workSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        completedDt: now,
        totalDurationMin,
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

    return NextResponse.json({
      session: completedSession,
      workLog,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Access denied') {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }
    return NextResponse.json({ error: 'Failed to stop work session' }, { status: 500 });
  }
}
