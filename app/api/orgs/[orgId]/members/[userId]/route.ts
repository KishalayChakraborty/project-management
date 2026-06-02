import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, requireOrgRole } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ orgId: string; userId: string }> }
) {
  try {
    const { orgId, userId } = await params;
    const actor = await requireAuth();
    await requireOrgRole(orgId, actor.id, ['ADMIN']);

    if (actor.id === userId) {
      return NextResponse.json({ error: 'You cannot remove yourself from the organisation' }, { status: 400 });
    }

    const member = await prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId, userId } },
      include: { user: { select: { name: true, email: true } } },
    });
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    await prisma.orgMember.delete({ where: { orgId_userId: { orgId, userId } } });

    await createAuditLog({
      orgId,
      actorUserId: actor.id,
      entityType: 'OrgMember',
      entityId: userId,
      action: 'MEMBER_REMOVED',
      diffJson: { name: member.user.name, email: member.user.email },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Access denied' || error.message === 'Insufficient permissions')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }
}
