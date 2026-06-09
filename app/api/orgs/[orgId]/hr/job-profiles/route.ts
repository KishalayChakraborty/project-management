import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireOrgRole } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

const createJobProfileSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  code: z.string().min(1, 'Code is required'),
  department: z.string().optional(),
  level: z.enum(['INTERN', 'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'MANAGER', 'DIRECTOR', 'VP', 'C_LEVEL']),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE']),
  description: z.string().optional(),
  responsibilities: z.array(z.string()).optional(),
  requirements: z.array(z.string()).optional(),
  niceToHave: z.array(z.string()).optional(),
  minExperienceYears: z.preprocess(val => val === '' || val === null ? undefined : val, z.coerce.number().int().optional()),
  maxExperienceYears: z.preprocess(val => val === '' || val === null ? undefined : val, z.coerce.number().int().optional()),
  skills: z.array(z.string()).optional(),
  educationLevel: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

type CreateJobProfileRequest = z.infer<typeof createJobProfileSchema>;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const user = await requireAuth();
    await requireOrgRole(orgId, user.id, ['ADMIN', 'MAINTAINER']);

    const page = Math.max(1, parseInt(request.nextUrl.searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(request.nextUrl.searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;

    const [profiles, total] = await Promise.all([
      prisma.jobProfile.findMany({
        where: { orgId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { creator: { select: { id: true, name: true, email: true } } },
      }),
      prisma.jobProfile.count({ where: { orgId } }),
    ]);

    return NextResponse.json({
      data: profiles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    if ((error as any).message?.includes('Access denied')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const user = await requireAuth();
    await requireOrgRole(orgId, user.id, ['ADMIN', 'MAINTAINER']);

    const body = await request.json();
    const data = createJobProfileSchema.parse(body);

    const existing = await prisma.jobProfile.findUnique({
      where: { orgId_code: { orgId, code: data.code } },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Job profile code already exists for this organization' },
        { status: 409 }
      );
    }

    const profile = await prisma.jobProfile.create({
      data: {
        orgId,
        title: data.title,
        code: data.code,
        department: data.department,
        level: data.level,
        employmentType: data.employmentType,
        description: data.description,
        responsibilities: data.responsibilities as any,
        requirements: data.requirements as any,
        niceToHave: data.niceToHave as any,
        minExperienceYears: data.minExperienceYears,
        maxExperienceYears: data.maxExperienceYears,
        skills: data.skills as any,
        educationLevel: data.educationLevel,
        isActive: data.isActive,
        createdBy: user.id,
      },
      include: { creator: { select: { id: true, name: true, email: true } } },
    });

    await createAuditLog({
      orgId,
      actorUserId: user.id,
      entityType: 'JobProfile',
      entityId: profile.id,
      action: 'CREATE',
    });

    return NextResponse.json({ data: profile }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    if ((error as any).message?.includes('Insufficient permissions')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    console.error('Error creating job profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
