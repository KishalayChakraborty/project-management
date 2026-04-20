import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAuth, requireOrgAccess, requireOrgRole } from '@/lib/auth';

const createProjectSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  description: z.string().optional(),
  parentId: z.string().uuid().optional(),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'HOLD', 'COMPLETED', 'CANCELLED']).optional(),
  startDate: z.string().optional(),
  deadline: z.string().optional(),
  budgetTotal: z.number().optional(),
  currency: z.string().default('USD'),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const user = await requireAuth();
    const member = await requireOrgAccess(orgId, user.id);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search') || '';
    const sort = searchParams.get('sort') === 'asc' ? 'asc' : 'desc';
    const skip = (page - 1) * limit;

    const baseWhere: any =
      member.role === 'MEMBER'
        ? {
            orgId,
            parentId: null,
            OR: [
              {
                teamLinks: {
                  some: {
                    team: {
                      members: {
                        some: { userId: user.id },
                      },
                    },
                  },
                },
              },
              {
                userLinks: {
                  some: { userId: user.id },
                },
              },
            ],
          }
        : { orgId, parentId: null };

    if (search) {
      const searchConditions = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { code: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } },
      ];
      if (baseWhere.OR) {
        // MEMBER role: combine existing OR with search using AND
        baseWhere.AND = [
          { OR: baseWhere.OR },
          { OR: searchConditions },
        ];
        delete baseWhere.OR;
      } else {
        baseWhere.OR = searchConditions;
      }
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where: baseWhere,
        include: {
          creator: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: sort },
      }),
      prisma.project.count({ where: baseWhere }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      projects,
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
    if (error instanceof Error && error.message === 'Access denied') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const user = await requireAuth();
    await requireOrgRole(orgId, user.id, ['ADMIN', 'MAINTAINER']);

    const body = await request.json();
    const data = createProjectSchema.parse(body);

    if (data.parentId) {
      const parent = await prisma.project.findUnique({
        where: { id: data.parentId },
      });

      if (!parent || parent.orgId !== orgId) {
        return NextResponse.json(
          { error: 'Invalid parent project' },
          { status: 400 }
        );
      }
    }

    const existingProject = await prisma.project.findUnique({
      where: {
        orgId_code: {
          orgId,
          code: data.code,
        },
      },
    });

    if (existingProject) {
      return NextResponse.json(
        { error: 'Project code already exists in this organization' },
        { status: 409 }
      );
    }

    const project = await prisma.project.create({
      data: {
        orgId,
        parentId: data.parentId,
        name: data.name,
        code: data.code,
        description: data.description,
        status: data.status || 'PLANNED',
        startDate: data.startDate ? new Date(data.startDate) : null,
        deadline: data.deadline ? new Date(data.deadline) : null,
        budgetTotal: data.budgetTotal,
        currency: data.currency || 'USD',
        createdBy: user.id,
      },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      if (error.message === 'Access denied') {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
      if (error.message === 'Insufficient permissions') {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
