import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireOrgRole } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

const feedbackSchema = z.object({
  recommendation: z.enum(['STRONG_HIRE', 'HIRE', 'NEUTRAL', 'NO_HIRE', 'STRONG_NO_HIRE']),
  technicalScore: z.number().min(1).max(10).optional(),
  communicationScore: z.number().min(1).max(10).optional(),
  problemSolvingScore: z.number().min(1).max(10).optional(),
  cultureScore: z.number().min(1).max(10).optional(),
  overallScore: z.number().min(1).max(10).optional(),
  strengths: z.string().optional(),
  weaknesses: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; applicantId: string; roundId: string }> }
) {
  try {
    const { orgId, applicantId, roundId } = await params;
    const user = await requireAuth();
    await requireOrgRole(orgId, user.id, ['ADMIN', 'MAINTAINER', 'MEMBER']);

    const round = await prisma.interviewRound.findUnique({
      where: { id: roundId },
    });

    if (!round || round.orgId !== orgId || round.applicantId !== applicantId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const feedbackList = await prisma.interviewFeedback.findMany({
      where: { roundId },
    });

    // Fetch user data separately for feedback
    const userIds = [...new Set(feedbackList.map(f => f.userId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });

    const userMap = Object.fromEntries(users.map(u => [u.id, u]));
    const feedback = feedbackList.map(f => ({
      ...f,
      user: userMap[f.userId],
    }));

    return NextResponse.json({ data: feedback });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; applicantId: string; roundId: string }> }
) {
  try {
    const { orgId, applicantId, roundId } = await params;
    const user = await requireAuth();
    await requireOrgRole(orgId, user.id, ['ADMIN', 'MAINTAINER', 'MEMBER']);

    const round = await prisma.interviewRound.findUnique({
      where: { id: roundId },
    });

    if (!round || round.orgId !== orgId || round.applicantId !== applicantId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json();
    const data = feedbackSchema.parse(body);

    const feedbackData = await prisma.interviewFeedback.create({
      data: {
        ...data,
        roundId,
        userId: user.id,
        isSubmitted: true,
        submittedAt: new Date(),
      },
    });

    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, name: true, email: true },
    });

    const feedback = {
      ...feedbackData,
      user: userData,
    };

    await createAuditLog({
      orgId,
      actorUserId: user.id,
      entityType: 'InterviewFeedback',
      entityId: feedback.id,
      action: 'CREATE',
    });

    return NextResponse.json({ data: feedback }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Error creating feedback:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
