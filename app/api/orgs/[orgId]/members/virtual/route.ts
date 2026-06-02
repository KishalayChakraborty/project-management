import { NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import prisma from '@/lib/prisma';
import { requireAuth, requireOrgRole } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

const schema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional().or(z.literal('')),
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
    const data = schema.parse(body);

    // Resolve email: use supplied one or generate a placeholder
    const email = data.email?.trim() || `virtual-${randomUUID()}@placeholder.local`;

    // Ensure email is not already taken
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      return NextResponse.json(
        { error: 'A user with this email already exists. Use Invite Member instead.' },
        { status: 409 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const virtualUser = await tx.user.create({
        data: {
          email,
          name: data.name,
          password: '*VIRTUAL*',
          isVirtual: true,
          status: 'ACTIVE',
          createdByUserId: actor.id,
        },
      });

      const member = await tx.orgMember.create({
        data: { orgId, userId: virtualUser.id, role: data.role },
        include: {
          user: { select: { id: true, email: true, name: true, isVirtual: true } },
        },
      });

      return { virtualUser, member };
    });

    await createAuditLog({
      orgId,
      actorUserId: actor.id,
      entityType: 'OrgMember',
      entityId: result.virtualUser.id,
      action: 'VIRTUAL_MEMBER_CREATED',
      diffJson: { name: data.name, email, role: data.role },
    });

    return NextResponse.json({ member: result.member }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    if (error instanceof Error && (error.message === 'Access denied' || error.message === 'Insufficient permissions')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to create virtual member' }, { status: 500 });
  }
}
