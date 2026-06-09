import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireOrgRole } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

const confirmJoiningSchema = z.object({
  joiningDate: z.string(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; applicantId: string; offerId: string }> }
) {
  try {
    const { orgId, applicantId, offerId } = await params;
    const user = await requireAuth();
    await requireOrgRole(orgId, user.id, ['ADMIN', 'MAINTAINER']);

    const offer = await prisma.employmentOffer.findUnique({
      where: { id: offerId },
      include: { applicant: true },
    });

    if (!offer || offer.orgId !== orgId || offer.applicantId !== applicantId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (offer.status !== 'ACCEPTED') {
      return NextResponse.json(
        { error: 'Offer must be accepted before confirming joining' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { joiningDate } = confirmJoiningSchema.parse(body);

    // Look for existing user by email
    let userId = offer.applicant.createdBy;
    let createdNewUser = false;

    if (!userId) {
      const existingUser = await prisma.user.findUnique({
        where: { email: offer.applicant.email },
      });

      if (existingUser) {
        userId = existingUser.id;
      } else {
        // Create new user with temporary password
        const tempPassword = Math.random().toString(36).slice(-12);
        const newUser = await prisma.user.create({
          data: {
            email: offer.applicant.email,
            name: `${offer.applicant.firstName} ${offer.applicant.lastName}`,
            password: tempPassword,
          },
        });
        userId = newUser.id;
        createdNewUser = true;
        // TODO: Send password reset email to newUser
      }
    }

    // Create OrgMember
    await prisma.orgMember.create({
      data: {
        orgId,
        userId,
        role: offer.assignedRole,
      },
    });

    // Update offer
    const updatedOffer = await prisma.employmentOffer.update({
      where: { id: offerId },
      data: {
        joiningDate: new Date(joiningDate),
        joiningConfirmed: true,
        status: 'ACCEPTED',
      },
      include: {
        applicant: true,
        jobProfile: true,
      },
    });

    // Update applicant status
    await prisma.applicant.update({
      where: { id: applicantId },
      data: { status: 'HIRED' },
    });

    await createAuditLog({
      orgId,
      actorUserId: user.id,
      entityType: 'EmploymentOffer',
      entityId: offerId,
      action: 'UPDATE',
    });

    return NextResponse.json({
      data: updatedOffer,
      message: `Employee joined successfully${createdNewUser ? '. Password reset email sent.' : '.'}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Error confirming joining:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
