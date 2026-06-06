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

    if (session.status !== 'PAUSED') {
      return NextResponse.json(
        { error: 'Can only resume a paused session' },
        { status: 400 }
      );
    }

    const now = new Date();

    // Create a new segment for this resume
    await prisma.workSessionSegment.create({
      data: {
        sessionId,
        startDt: now,
      },
    });

    const updatedSession = await prisma.workSession.update({
      where: { id: sessionId },
      data: {
        status: 'ACTIVE',
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
    return NextResponse.json({ error: 'Failed to resume work session' }, { status: 500 });
  }
}
