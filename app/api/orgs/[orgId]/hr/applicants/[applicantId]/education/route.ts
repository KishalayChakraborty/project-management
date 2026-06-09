import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireOrgRole } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

const educationSchema = z.object({
  degree: z.string().min(1),
  institution: z.string().min(1),
  fieldOfStudy: z.string().optional(),
  startYear: z.number().optional(),
  endYear: z.number().optional(),
  grade: z.string().optional(),
  isCurrent: z.boolean().default(false),
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

    const education = await prisma.applicantEducation.findMany({
      where: { applicantId },
    });

    return NextResponse.json({ data: education });
  } catch (error) {
    console.error('Error fetching education:', error);
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
    const data = educationSchema.parse(body);

    const education = await prisma.applicantEducation.create({
      data: {
        ...data,
        applicantId,
      },
    });

    await createAuditLog({
      orgId,
      actorUserId: user.id,
      entityType: 'ApplicantEducation',
      entityId: education.id,
      action: 'CREATE',
    });

    return NextResponse.json({ data: education }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Error creating education:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
