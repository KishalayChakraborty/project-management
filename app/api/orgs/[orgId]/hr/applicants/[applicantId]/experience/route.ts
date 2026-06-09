import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireOrgRole } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

const experienceSchema = z.object({
  company: z.string().min(1),
  title: z.string().min(1),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isCurrent: z.boolean().default(false),
  description: z.string().optional(),
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

    const experience = await prisma.applicantExperience.findMany({
      where: { applicantId },
    });

    return NextResponse.json({ data: experience });
  } catch (error) {
    console.error('Error fetching experience:', error);
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
    const data = experienceSchema.parse(body);

    const experience = await prisma.applicantExperience.create({
      data: {
        ...data,
        applicantId,
      },
    });

    await createAuditLog({
      orgId,
      actorUserId: user.id,
      entityType: 'ApplicantExperience',
      entityId: experience.id,
      action: 'CREATE',
    });

    return NextResponse.json({ data: experience }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Error creating experience:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
