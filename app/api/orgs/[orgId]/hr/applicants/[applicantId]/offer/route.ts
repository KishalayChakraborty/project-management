import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireOrgRole } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

const offerSchema = z.object({
  jobProfileId: z.string().min(1),
  salaryStructureId: z.string().min(1),
  assignedRole: z.enum(['ADMIN', 'MAINTAINER', 'MEMBER']).default('MEMBER'),
  joiningDate: z.string().optional(),
  expiresAt: z.string().optional(),
});

export async function GET(
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

    const offers = await prisma.employmentOffer.findMany({
      where: { applicantId },
      include: {
        jobProfile: true,
        salaryStructure: true,
        creator: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: offers });
  } catch (error) {
    console.error('Error fetching offers:', error);
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
    await requireOrgRole(orgId, user.id, ['ADMIN', 'MAINTAINER']);

    const applicant = await prisma.applicant.findUnique({
      where: { id: applicantId },
    });

    if (!applicant || applicant.orgId !== orgId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json();
    const data = offerSchema.parse(body);

    const offer = await prisma.employmentOffer.create({
      data: {
        ...data,
        applicantId,
        advertisementId: applicant.advertisementId || undefined,
        orgId,
        status: 'DRAFT',
        sentAt: new Date(),
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdBy: user.id,
      },
      include: {
        jobProfile: true,
        salaryStructure: true,
        applicant: { select: { firstName: true, lastName: true, email: true } },
        creator: { select: { id: true, name: true } },
      },
    });

    // Update applicant status
    await prisma.applicant.update({
      where: { id: applicantId },
      data: { status: 'OFFER' },
    });

    await createAuditLog({
      orgId,
      actorUserId: user.id,
      entityType: 'EmploymentOffer',
      entityId: offer.id,
      action: 'CREATE',
    });

    return NextResponse.json({ data: offer }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Error creating offer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
