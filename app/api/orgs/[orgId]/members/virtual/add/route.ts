import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAuth, requireOrgRole } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

const schema = z.object({
  virtualUserId: z.string().uuid(),
  role: z.enum(['MAINTAINER', 'MEMBER']).default('MEMBER'),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const actor = await requireAuth();
    await requireOrgRole(orgId, actor.id, ['ADMIN', 'MAINTAINER']);

    const body = await request.json();
    const { virtualUserId, role } = schema.parse(body);

    // Verify the target is a virtual user created by this actor
    const virtualUser = await prisma.user.findUnique({
      where: { id: virtualUserId },
      select: { id: true, isVirtual: true, createdByUserId: true, name: true, email: true, mergedIntoId: true },
    });

    if (!virtualUser || !virtualUser.isVirtual) {
      return NextResponse.json({ error: 'Virtual user not found' }, { status: 404 });
    }
    if (virtualUser.mergedIntoId) {
      return NextResponse.json({ error: 'This virtual account has already been merged' }, { status: 400 });
    }
    // Verify actor is admin/maintainer in at least one org where this virtual user already belongs
    const sharedOrg = await prisma.orgMember.findFirst({
      where: {
        userId: virtualUserId,
        org: {
          members: { some: { userId: actor.id, role: { in: ['ADMIN', 'MAINTAINER'] } } },
        },
      },
    });
    if (!sharedOrg) {
      return NextResponse.json(
        { error: 'You do not have a shared organisation with this virtual member' },
        { status: 403 }
      );
    }

    // Check not already a member
    const existing = await prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId, userId: virtualUserId } },
    });
    if (existing) {
      return NextResponse.json({ error: 'This virtual member is already in the organisation' }, { status: 409 });
    }

    const member = await prisma.orgMember.create({
      data: { orgId, userId: virtualUserId, role },
      include: {
        user: { select: { id: true, email: true, name: true, isVirtual: true } },
      },
    });

    await createAuditLog({
      orgId,
      actorUserId: actor.id,
      entityType: 'OrgMember',
      entityId: virtualUserId,
      action: 'VIRTUAL_MEMBER_ADDED',
      diffJson: { name: virtualUser.name, role },
    });

    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    if (error instanceof Error && (error.message === 'Access denied' || error.message === 'Insufficient permissions')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to add virtual member' }, { status: 500 });
  }
}
