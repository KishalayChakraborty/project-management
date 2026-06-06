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
      select: { userId: true, projectId: true, status: true },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.projectId !== projectId || session.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (session.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Cannot pause a session that is not active' },
        { status: 400 }
      );
    }

    const now = new Date();

    // Update the last segment's endDt and calculate duration
    const lastSegment = await prisma.workSessionSegment.findFirst({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
    });

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

    // Update session status to PAUSED and calculate total duration
    const segments = await prisma.workSessionSegment.findMany({
      where: { sessionId },
    });

    const totalDurationMin = segments.reduce((sum, seg) => sum + seg.durationMin, 0);

    const updatedSession = await prisma.workSession.update({
      where: { id: sessionId },
      data: {
        status: 'PAUSED',
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

    return NextResponse.json({ session: updatedSession });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Access denied') {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }
    return NextResponse.json({ error: 'Failed to pause work session' }, { status: 500 });
  }
}
