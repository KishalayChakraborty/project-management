import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, requireOrgAccess, requireOrgRole } from '@/lib/auth';
import type { Prisma } from '@/app/generated/prisma/client';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string; projectId: string }> }
) {
  try {
    const { orgId, projectId } = await params;
    const user = await requireAuth();
    await requireOrgAccess(orgId, user.id);
    await requireOrgRole(orgId, user.id, ['ADMIN', 'MAINTAINER']);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { orgId: true },
    });
    if (!project || project.orgId !== orgId) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '25', 10)), 100);
    const skip = (page - 1) * limit;
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const userIdParam = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const whereClause: Prisma.WorkLogWhereInput = {
      orgId,
      projectId,
    };
    if (userIdParam) {
      whereClause.userId = userIdParam;
    }
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        (whereClause.createdAt as Prisma.DateTimeFilter<'WorkLog'>).gte = new Date(startDate);
      }
      if (endDate) {
        (whereClause.createdAt as Prisma.DateTimeFilter<'WorkLog'>).lte = new Date(endDate);
      }
    }
    if (search) {
      whereClause.user = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const orderByClause: Record<string, unknown> = {};
    if (sortBy === 'date') {
      orderByClause.createdAt = sortOrder;
    } else if (sortBy === 'duration') {
      orderByClause.totalDurationMin = sortOrder;
    } else if (sortBy === 'user') {
      orderByClause.user = { name: sortOrder };
    } else {
      orderByClause.createdAt = 'desc';
    }

    const [workLogs, total] = await Promise.all([
      prisma.workLog.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              avatar: true,
            },
          },
          task: {
            select: {
              id: true,
              title: true,
            },
          },
          segments: {
            orderBy: { startDt: 'asc' },
          },
        },
        skip,
        take: limit,
        orderBy: orderByClause,
      }),
      prisma.workLog.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      workLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Access denied') {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
      if (error.message === 'Insufficient permissions') {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }
    return NextResponse.json({ error: 'Failed to fetch work logs' }, { status: 500 });
  }
}
