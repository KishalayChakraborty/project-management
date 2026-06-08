import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    const user = await requireAuth();

    // Fetch all tasks assigned to the user with project + org context
    const tasks = await prisma.task.findMany({
      where: {
        assigneeUserId: user.id,
        project: {
          org: {
            members: { some: { userId: user.id } },
          },
        },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            code: true,
            orgId: true,
            org: { select: { id: true, name: true } },
          },
        },
        reviewer: { select: { id: true, email: true, name: true } },
        parent: { select: { id: true, title: true } },
      },
      orderBy: [{ status: 'asc' }, { deadlineDt: 'asc' }, { createdAt: 'desc' }],
    });

    // Fetch the user's role per org for correct route building on the client
    const memberships = await prisma.orgMember.findMany({
      where: { userId: user.id },
      select: { orgId: true, role: true },
    });
    const roleMap = Object.fromEntries(memberships.map((m) => [m.orgId, m.role]));

    // Group: { [orgId]: { org, role, projects: { [projectId]: { project, tasks[] } } } }
    type ProjectEntry = {
      project: { id: string; name: string; code: string; orgId: string };
      tasks: typeof tasks;
    };
    type OrgEntry = {
      org: { id: string; name: string };
      role: string;
      projects: Record<string, ProjectEntry>;
    };

    const grouped: Record<string, OrgEntry> = {};

    for (const task of tasks) {
      const { org, ...project } = task.project;
      const orgId = org.id;
      const projectId = project.id;

      if (!grouped[orgId]) {
        grouped[orgId] = {
          org,
          role: roleMap[orgId] || 'MEMBER',
          projects: {},
        };
      }
      if (!grouped[orgId].projects[projectId]) {
        grouped[orgId].projects[projectId] = { project, tasks: [] };
      }
      grouped[orgId].projects[projectId].tasks.push(task);
    }

    // Flatten to array for easier consumption
    const result = Object.values(grouped).map((orgEntry) => ({
      org: orgEntry.org,
      role: orgEntry.role,
      projects: Object.values(orgEntry.projects).map((pe) => ({
        project: pe.project,
        tasks: pe.tasks,
      })),
    }));

    return NextResponse.json({ grouped: result, total: tasks.length });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}
