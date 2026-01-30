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

    if (teamIds.length === 0) {
      return NextResponse.json({ members: [] });
    }

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

    const seen = new Set<string>();
    const members = teamMembers.filter((m) => {
      if (seen.has(m.userId)) return false;
      seen.add(m.userId);
      return true;
    });

    return NextResponse.json({
      members: members.map((m) => ({
        user: m.user,
      })),
    });
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
