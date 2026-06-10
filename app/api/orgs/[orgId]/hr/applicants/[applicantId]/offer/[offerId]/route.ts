import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireOrgRole } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

const updateOfferSchema = z.object({
  status: z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'WITHDRAWN', 'EXPIRED']).optional(),
  declineReason: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; applicantId: string; offerId: string }> }
) {
  try {
    const { orgId, applicantId, offerId } = await params;
    const user = await requireAuth();
    await requireOrgRole(orgId, user.id, ['ADMIN', 'MAINTAINER']);

    const applicant = await prisma.applicant.findUnique({
      where: { id: applicantId },
    });

    if (!applicant || applicant.orgId !== orgId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const offer = await prisma.employmentOffer.findUnique({
      where: { id: offerId },
    });

    if (!offer || offer.applicantId !== applicantId || offer.orgId !== orgId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json();
    const { status, ...data } = updateOfferSchema.parse(body);

    const updateData: any = { ...data };

    if (status === 'ACCEPTED') {
      updateData.status = 'ACCEPTED';
      updateData.acceptedAt = new Date();
      await prisma.applicant.update({
        where: { id: applicantId },
        data: { status: 'HIRED' },
      });
    } else if (status === 'DECLINED') {
      updateData.status = 'DECLINED';
      updateData.declinedAt = new Date();
      await prisma.applicant.update({
        where: { id: applicantId },
        data: { status: 'REJECTED' },
      });
    } else if (status) {
      updateData.status = status;
    }

    const updated = await prisma.employmentOffer.update({
      where: { id: offerId },
      data: updateData,
      include: {
        jobProfile: true,
        salaryStructure: true,
        applicant: { select: { firstName: true, lastName: true, email: true } },
        creator: { select: { id: true, name: true } },
      },
    });

    await createAuditLog({
      orgId,
      actorUserId: user.id,
      entityType: 'EmploymentOffer',
      entityId: offerId,
      action: 'UPDATE',
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Error updating offer:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
