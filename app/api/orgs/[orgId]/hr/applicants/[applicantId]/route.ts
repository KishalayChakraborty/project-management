import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireOrgRole } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

const updateApplicantSchema = z.object({
  status: z.enum(['NEW', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED', 'WITHDRAWN']).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  alternatePhone: z.string().optional(),
  linkedinUrl: z.string().url().optional(),
  githubUrl: z.string().url().optional(),
  portfolioUrl: z.string().url().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  address: z.string().optional(),
  currentCompany: z.string().optional(),
  currentTitle: z.string().optional(),
  currentSalary: z.number().optional(),
  currentCurrency: z.string().optional(),
  noticePeriodDays: z.number().optional(),
  expectedSalaryMin: z.number().optional(),
  expectedSalaryMax: z.number().optional(),
  expectedCurrency: z.string().optional(),
  internalNotes: z.string().optional(),
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
      include: {
        jobProfile: true,
        advertisement: true,
        educations: true,
        experiences: true,
        interviewRounds: {
          include: {
            interviewers: { select: { user: { select: { id: true, name: true } } } },
            feedbacks: true,
          },
        },
        salaryStructures: true,
        offers: true,
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    if (!applicant || applicant.orgId !== orgId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ data: applicant });
  } catch (error) {
    console.error('Error fetching applicant:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; applicantId: string }> }
) {
  try {
    const { orgId, applicantId } = await params;
    const user = await requireAuth();
    await requireOrgRole(orgId, user.id, ['ADMIN', 'MAINTAINER']);

    const applicant = await prisma.applicant.findUnique({
      where: { id: applicantId },
    });

    if (!applicant || applicant.orgId !== orgId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json();
    const data = updateApplicantSchema.parse(body);

    const updated = await prisma.applicant.update({
      where: { id: applicantId },
      data,
      include: {
        jobProfile: true,
        advertisement: true,
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    await createAuditLog({
      orgId,
      actorUserId: user.id,
      entityType: 'Applicant',
      entityId: updated.id,
      action: 'UPDATE',
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Error updating applicant:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; applicantId: string }> }
) {
  try {
    const { orgId, applicantId } = await params;
    const user = await requireAuth();
    await requireOrgRole(orgId, user.id, ['ADMIN', 'MAINTAINER']);

    const applicant = await prisma.applicant.findUnique({
      where: { id: applicantId },
    });

    if (!applicant || applicant.orgId !== orgId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.applicant.delete({
      where: { id: applicantId },
    });

    await createAuditLog({
      orgId,
      actorUserId: user.id,
      entityType: 'Applicant',
      entityId: applicantId,
      action: 'DELETE',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting applicant:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
