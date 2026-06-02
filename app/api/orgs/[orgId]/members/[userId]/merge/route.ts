import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAuth, requireOrgRole } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

const schema = z.object({
  realUserId: z.string().uuid(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string; userId: string }> }
) {
  try {
    const { orgId, userId: virtualUserId } = await params;
    const actor = await requireAuth();
    await requireOrgRole(orgId, actor.id, ['ADMIN']);

    const body = await request.json();
    const { realUserId } = schema.parse(body);

    if (virtualUserId === realUserId) {
      return NextResponse.json({ error: 'Cannot merge a user into itself' }, { status: 400 });
    }

    // Validate virtual user
    const virtualUser = await prisma.user.findUnique({
      where: { id: virtualUserId },
      select: { id: true, isVirtual: true, mergedIntoId: true, name: true, email: true },
    });
    if (!virtualUser) {
      return NextResponse.json({ error: 'Virtual user not found' }, { status: 404 });
    }
    if (!virtualUser.isVirtual) {
      return NextResponse.json({ error: 'This user is not a virtual account' }, { status: 400 });
    }
    if (virtualUser.mergedIntoId) {
      return NextResponse.json({ error: 'This virtual account has already been merged' }, { status: 400 });
    }

    // Validate real user
    const realUser = await prisma.user.findUnique({
      where: { id: realUserId },
      select: { id: true, isVirtual: true, email: true, name: true },
    });
    if (!realUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }
    if (realUser.isVirtual) {
      return NextResponse.json({ error: 'Target user must be a real account' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      // Reassign task assignments
      await tx.task.updateMany({ where: { assigneeUserId: virtualUserId }, data: { assigneeUserId: realUserId } });
      await tx.task.updateMany({ where: { reviewerUserId: virtualUserId }, data: { reviewerUserId: realUserId } });

      // Reassign work logs
      await tx.workLog.updateMany({ where: { userId: virtualUserId }, data: { userId: realUserId } });
      await tx.workLog.updateMany({ where: { createdBy: virtualUserId }, data: { createdBy: realUserId } });

      // Reassign task comments
      await tx.taskComment.updateMany({ where: { userId: virtualUserId }, data: { userId: realUserId } });

      // Org membership: add real user to org (if not already a member), then remove virtual user
      const existingRealMember = await tx.orgMember.findUnique({
        where: { orgId_userId: { orgId, userId: realUserId } },
      });
      const virtualMember = await tx.orgMember.findUnique({
        where: { orgId_userId: { orgId, userId: virtualUserId } },
      });

      if (!existingRealMember && virtualMember) {
        await tx.orgMember.create({
          data: { orgId, userId: realUserId, role: virtualMember.role },
        });
      }
      if (virtualMember) {
        await tx.orgMember.delete({ where: { orgId_userId: { orgId, userId: virtualUserId } } });
      }

      // Team memberships: move to real user (skip if real user is already on the team)
      const virtualTeams = await tx.teamMember.findMany({ where: { userId: virtualUserId } });
      for (const tm of virtualTeams) {
        const exists = await tx.teamMember.findUnique({
          where: { teamId_userId: { teamId: tm.teamId, userId: realUserId } },
        });
        if (!exists) {
          await tx.teamMember.create({ data: { teamId: tm.teamId, userId: realUserId, role: tm.role } });
        }
        await tx.teamMember.delete({ where: { teamId_userId: { teamId: tm.teamId, userId: virtualUserId } } });
      }

      // Project user links: move to real user
      const virtualLinks = await tx.projectUserLink.findMany({ where: { userId: virtualUserId } });
      for (const link of virtualLinks) {
        const exists = await tx.projectUserLink.findUnique({
          where: { projectId_userId: { projectId: link.projectId, userId: realUserId } },
        });
        if (!exists) {
          await tx.projectUserLink.create({ data: { projectId: link.projectId, userId: realUserId } });
        }
        await tx.projectUserLink.delete({
          where: { projectId_userId: { projectId: link.projectId, userId: virtualUserId } },
        });
      }

      // Mark virtual user as merged + deactivate
      await tx.user.update({
        where: { id: virtualUserId },
        data: { mergedIntoId: realUserId, status: 'INACTIVE' },
      });
    });

    await createAuditLog({
      orgId,
      actorUserId: actor.id,
      entityType: 'User',
      entityId: virtualUserId,
      action: 'VIRTUAL_MEMBER_MERGED',
      diffJson: {
        virtualUserId,
        virtualName: virtualUser.name,
        realUserId,
        realEmail: realUser.email,
      },
    });

    return NextResponse.json({
      message: `Virtual account "${virtualUser.name}" has been merged into ${realUser.email}.`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    if (error instanceof Error && (error.message === 'Access denied' || error.message === 'Insufficient permissions')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to merge accounts' }, { status: 500 });
  }
}
