import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, requireOrgAccess } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string; projectId: string }> }
) {
  try {
    const { orgId, projectId } = await params;
    const user = await requireAuth();
    await requireOrgAccess(orgId, user.id);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { orgId: true },
    });

    if (!project || project.orgId !== orgId) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const teamLinks = await prisma.projectTeamLink.findMany({
      where: { projectId },
      select: { teamId: true },
    });
    const teamIds = teamLinks.map((l) => l.teamId);

    const seen = new Set<string>();
    let members: Array<{ user: { id: string; email: string; name: string | null; avatar: string | null } }> = [];

    // Get team-based members
    if (teamIds.length > 0) {
      const teamMembers = await prisma.teamMember.findMany({
        where: { teamId: { in: teamIds } },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              avatar: true,
            },
          },
        },
      });

      members = teamMembers
        .filter((m) => {
          if (seen.has(m.userId)) return false;
          seen.add(m.userId);
          return true;
        })
        .map((m) => ({ user: m.user }));
    }

    // Also include org admins/maintainers so they can assign themselves
    const adminMembers = await prisma.orgMember.findMany({
      where: {
        orgId,
        role: { in: ['ADMIN', 'MAINTAINER'] },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    for (const am of adminMembers) {
      if (!seen.has(am.userId)) {
        seen.add(am.userId);
        members.push({ user: am.user });
      }
    }

    return NextResponse.json({ members });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'Access denied') {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }
    return NextResponse.json(
      { error: 'Failed to fetch project team members' },
      { status: 500 }
    );
  }
}
