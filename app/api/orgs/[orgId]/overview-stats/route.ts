import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, requireOrgAccess } from '@/lib/auth';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const user = await requireAuth();
    const member = await requireOrgAccess(orgId, user.id);

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        _count: { select: { members: true, teams: true, projects: true } },
      },
    });
    if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

    // Projects with task counts
    const projects = await prisma.project.findMany({
      where: { orgId, parentId: null },
      include: {
        _count: { select: { tasks: true } },
        creator: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Task status distribution across all org projects
    const taskStatusGroups = await prisma.task.groupBy({
      by: ['status'],
      where: { project: { orgId } },
      _count: { status: true },
    });

    // Recent members
    const recentMembers = await prisma.orgMember.findMany({
      where: { orgId },
      include: { user: { select: { id: true, name: true, email: true, isVirtual: true } } },
      orderBy: { joinedAt: 'desc' },
      take: 8,
    });

    // My pending tasks count
    const myPendingCount = await prisma.task.count({
      where: {
        project: { orgId },
        assigneeUserId: user.id,
        status: { notIn: ['DONE', 'ARCHIVED'] },
      },
    });

    return NextResponse.json({
      org,
      projects,
      taskStatusGroups: taskStatusGroups.map((g) => ({ status: g.status, count: g._count.status })),
      recentMembers: recentMembers.map((m) => ({ ...m.user, role: m.role, joinedAt: m.joinedAt })),
      myPendingCount,
      userRole: member.role,
    });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Access denied' || error.message === 'Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch org stats' }, { status: 500 });
  }
}
