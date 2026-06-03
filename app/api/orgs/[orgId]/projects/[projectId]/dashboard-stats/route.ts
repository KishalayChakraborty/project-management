import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, requireProjectAccess } from '@/lib/auth';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgId: string; projectId: string }> }
) {
  try {
    const { orgId, projectId } = await params;
    const user = await requireAuth();
    const member = await requireProjectAccess(orgId, projectId, user.id);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        creator: { select: { id: true, name: true, email: true } },
        _count: { select: { tasks: true, teamLinks: true, userLinks: true } },
      },
    });
    if (!project || project.orgId !== orgId) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Task counts by status
    const taskStatusGroups = await prisma.task.groupBy({
      by: ['status'],
      where: { projectId },
      _count: { status: true },
    });

    // Recent tasks (last 10, non-done)
    const recentTasks = await prisma.task.findMany({
      where: { projectId, status: { notIn: ['DONE', 'ARCHIVED'] }, parentId: null },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });

    // Team members (unique users on the project)
    const teamMembers = await prisma.orgMember.findMany({
      where: {
        orgId,
        OR: [
          { user: { projectUserLinks: { some: { projectId } } } },
          { user: { teamMemberships: { some: { team: { projectLinks: { some: { projectId } } } } } } },
        ],
      },
      include: { user: { select: { id: true, name: true, email: true, isVirtual: true } } },
      take: 20,
    });

    // Docs count
    const docsCount = await prisma.projectDoc.count({ where: { projectId, orgId } });

    return NextResponse.json({
      project,
      taskStatusGroups: taskStatusGroups.map((g) => ({ status: g.status, count: g._count.status })),
      recentTasks,
      teamMembers: teamMembers.map((m) => ({ ...m.user, role: m.role })),
      docsCount,
      userRole: member.role,
    });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Access denied' || error.message === 'Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
  }
}
