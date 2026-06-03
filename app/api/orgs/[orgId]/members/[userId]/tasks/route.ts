import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, requireOrgAccess } from '@/lib/auth';
import {
  filterProfileFields,
  effectiveVisibility,
  type ViewerAccess,
  type ProfileField,
  type FieldVisibility,
  PROFILE_FIELDS,
} from '@/lib/field-visibility';
import type { Prisma } from '@/app/generated/prisma/client';

async function resolveViewerAccess(
  orgId: string,
  actorId: string,
  targetUserId: string,
  actorRole: string
): Promise<ViewerAccess> {
  if (actorId === targetUserId) return 'SELF';
  if (actorRole === 'ADMIN' || actorRole === 'MAINTAINER') return 'ADMIN';

  // Check if they share a team in this org
  const sharedTeam = await prisma.teamMember.findFirst({
    where: {
      userId: actorId,
      team: {
        orgId,
        members: { some: { userId: targetUserId } },
      },
    },
  });
  return sharedTeam ? 'TEAM' : 'MEMBER';
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgId: string; userId: string }> }
) {
  try {
    const { orgId, userId } = await params;
    const actor = await requireAuth();
    const actorMember = await requireOrgAccess(orgId, actor.id);

    const viewerAccess = await resolveViewerAccess(orgId, actor.id, userId, actorMember.role);

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, email: true, isVirtual: true,
        status: true, createdAt: true, lastLogin: true,
        virtualProfile: true,
        orgMemberships: {
          where: { orgId },
          select: { role: true, joinedAt: true },
        },
      },
    });

    if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Build filtered profile
    const rawProfile = targetUser.virtualProfile as Record<string, unknown> | null;
    const savedVisibility = rawProfile?.fieldVisibility as Partial<Record<ProfileField, FieldVisibility>> | null;

    const filteredProfile = filterProfileFields(rawProfile, savedVisibility, viewerAccess);

    // Decide whether to expose email (it's on the User model, not VirtualMemberProfile)
    const emailVis = effectiveVisibility(savedVisibility, 'email');
    const { canViewField } = await import('@/lib/field-visibility');
    const showEmail = canViewField(emailVis, viewerAccess);

    // Field visibility config — only expose to ADMIN so they can edit it in the dialog
    const fieldVisibilityConfig = viewerAccess === 'ADMIN'
      ? (rawProfile?.fieldVisibility ?? null)
      : null;

    const [assignedTasks, reviewingTasks] = await Promise.all([
      prisma.task.findMany({
        where: { assigneeUserId: userId, project: { orgId } },
        include: {
          project: { select: { id: true, name: true, code: true } },
          reviewer: { select: { id: true, name: true, email: true } },
        },
        orderBy: [{ status: 'asc' }, { deadlineDt: 'asc' }],
        take: 50,
      }),
      prisma.task.findMany({
        where: { reviewerUserId: userId, project: { orgId }, assigneeUserId: { not: userId } },
        include: {
          project: { select: { id: true, name: true, code: true } },
          assignee: { select: { id: true, name: true, email: true } },
        },
        orderBy: [{ status: 'asc' }, { deadlineDt: 'asc' }],
        take: 30,
      }),
    ]);

    return NextResponse.json({
      user: {
        ...targetUser,
        email: showEmail ? targetUser.email : undefined,
        virtualProfile: filteredProfile,
        fieldVisibilityConfig,
      },
      viewerAccess,
      assignedTasks,
      reviewingTasks,
    });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Access denied' || error.message === 'Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch user tasks' }, { status: 500 });
  }
}
