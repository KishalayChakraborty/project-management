import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchQuery = req.nextUrl.searchParams.get('q');
    if (!searchQuery || searchQuery.trim().length === 0) {
      return NextResponse.json({ results: [] });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get all organizations the user is a member of
    const userOrgs = await prisma.orgMember.findMany({
      where: { userId: user.id },
      include: { org: true },
    });

    const orgIds = userOrgs.map((m) => m.org.id);

    if (orgIds.length === 0) {
      return NextResponse.json({ results: [] });
    }

    // Search comments in accessible organizations
    const comments = await prisma.taskComment.findMany({
      where: {
        content: {
          contains: searchQuery,
          mode: 'insensitive',
        },
        task: {
          project: {
            orgId: {
              in: orgIds,
            },
          },
        },
      },
      include: {
        task: {
          include: {
            project: {
              include: {
                org: true,
              },
            },
          },
        },
        user: true,
      },
      take: 50,
      orderBy: {
        createdAt: 'desc',
      },
    });

    const results = comments.map((comment) => ({
      id: comment.id,
      taskId: comment.task.id,
      taskTitle: comment.task.title,
      projectId: comment.task.projectId,
      projectName: comment.task.project.name,
      projectCode: comment.task.project.code,
      orgId: comment.task.project.org.id,
      orgName: comment.task.project.org.name,
      content: comment.content,
      userName: comment.user.name,
      userEmail: comment.user.email,
      createdAt: comment.createdAt.toISOString(),
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Comment search error:', error);
    return NextResponse.json(
      { error: 'Failed to search comments' },
      { status: 500 }
    );
  }
}
