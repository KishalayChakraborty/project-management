import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireOrgRole } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

const interviewSchema = z.object({
  type: z.enum(['PHONE_SCREEN', 'VIDEO_CALL', 'IN_PERSON', 'TECHNICAL', 'HR_ROUND', 'PANEL', 'REFERENCE_CHECK']),
  scheduledAt: z.string(),
  durationMin: z.number().optional(),
  location: z.string().optional(),
  meetingLink: z.string().optional(),
  agenda: z.string().optional(),
  interviewerIds: z.array(z.string()).optional(),
  tzOffset: z.number().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; applicantId: string }> }
) {
  try {
    const { orgId, applicantId } = await params;
    const user = await requireAuth();
    await requireOrgRole(orgId, user.id, ['ADMIN', 'MAINTAINER', 'MEMBER']);

    const applicant = await prisma.applicant.findUnique({
      where: { id: applicantId },
    });

    if (!applicant || applicant.orgId !== orgId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const interviews = await prisma.interviewRound.findMany({
      where: { applicantId },
      include: {
        interviewers: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        feedbacks: true,
      },
      orderBy: { roundNumber: 'asc' },
    });

    return NextResponse.json({ data: interviews });
  } catch (error) {
    console.error('Error fetching interviews:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; applicantId: string }> }
) {
  try {
    const { orgId, applicantId } = await params;
    const user = await requireAuth();
    await requireOrgRole(orgId, user.id, ['ADMIN', 'MAINTAINER', 'MEMBER']);

    const applicant = await prisma.applicant.findUnique({
      where: { id: applicantId },
    });

    if (!applicant || applicant.orgId !== orgId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json();
    const { interviewerIds, scheduledAt, tzOffset, ...data } = interviewSchema.parse(body);

    // Convert datetime-local (which is in user's local time) to UTC
    // datetime-local value needs tzOffset adjustment to get UTC time
    const offsetMs = (tzOffset || 0) * 60 * 1000;
    const scheduledDate = new Date(new Date(scheduledAt).getTime() + offsetMs);

    const roundNumber =
      ((await prisma.interviewRound.count({
        where: { applicantId },
      })) + 1) || 1;

    const interview = await prisma.interviewRound.create({
      data: {
        ...data,
        scheduledAt: scheduledDate,
        roundNumber,
        applicantId,
        orgId,
        status: 'SCHEDULED',
        createdBy: user.id,
        interviewers: interviewerIds
          ? {
              createMany: {
                data: interviewerIds.map((userId) => ({ userId })),
              },
            }
          : undefined,
      },
      include: {
        interviewers: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        creator: { select: { id: true, name: true } },
      },
    });

    await createAuditLog({
      orgId,
      actorUserId: user.id,
      entityType: 'InterviewRound',
      entityId: interview.id,
      action: 'CREATE',
    });

    return NextResponse.json({ data: interview }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Error creating interview:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
