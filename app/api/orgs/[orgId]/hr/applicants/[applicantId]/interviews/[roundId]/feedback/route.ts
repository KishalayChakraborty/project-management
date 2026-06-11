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
  overallScore: z.number().min(1).max(10),
  strengths: z.string().optional(),
  weaknesses: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; applicantId: string; roundId: string }> }
) {
  try {
    const { orgId, applicantId, roundId } = await params;
    const user = await requireAuth();
    await requireOrgRole(orgId, user.id, ['ADMIN', 'MAINTAINER', 'MEMBER']);

    const applicant = await prisma.applicant.findUnique({
      where: { id: applicantId },
    });

    if (!applicant || applicant.orgId !== orgId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const interview = await prisma.interviewRound.findUnique({
      where: { id: roundId },
    });

    if (!interview || interview.applicantId !== applicantId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json();
    const data = feedbackSchema.parse(body);

    // Check if feedback already exists for this round by this user
    const existingFeedback = await prisma.interviewFeedback.findFirst({
      where: {
        roundId,
        userId: user.id,
      },
    });

    let feedback;

    if (existingFeedback) {
      // Update existing feedback
      feedback = await prisma.interviewFeedback.update({
        where: { id: existingFeedback.id },
        data: {
          ...data,
          submittedAt: new Date(),
        },
      });

      await createAuditLog({
        orgId,
        actorUserId: user.id,
        entityType: 'InterviewFeedback',
        entityId: feedback.id,
        action: 'UPDATE',
      });
    } else {
      // Create new feedback
      feedback = await prisma.interviewFeedback.create({
        data: {
          ...data,
          roundId,
          userId: user.id,
          isSubmitted: true,
          submittedAt: new Date(),
        },
      });

      await createAuditLog({
        orgId,
        actorUserId: user.id,
        entityType: 'InterviewFeedback',
        entityId: feedback.id,
        action: 'CREATE',
      });
    }

    return NextResponse.json({ data: feedback }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Error submitting feedback:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
