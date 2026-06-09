import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireOrgRole } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

const createJobAdSchema = z.object({
  jobProfileId: z.string().min(1, 'Job profile is required'),
  title: z.string().min(1, 'Title is required'),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED']).default('DRAFT'),
  salaryRangeMin: z.preprocess(val => val === '' || val === null ? undefined : val, z.coerce.number().optional()),
  salaryRangeMax: z.preprocess(val => val === '' || val === null ? undefined : val, z.coerce.number().optional()),
  location: z.preprocess(val => val === '' || val === null ? undefined : val, z.string().optional()),
  isRemote: z.boolean().default(false),
  deadline: z.preprocess(val => val === '' || val === null ? undefined : val, z.string().optional()),
});

type CreateJobAdRequest = z.infer<typeof createJobAdSchema>;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const user = await requireAuth();
    await requireOrgRole(orgId, user.id, ['ADMIN', 'MAINTAINER', 'MEMBER']);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const [ads, total] = await Promise.all([
      prisma.jobAdvertisement.findMany({
        where: { orgId },
        include: {
          jobProfile: { select: { id: true, title: true } },
          creator: { select: { id: true, name: true, email: true } },
          _count: { select: { applicants: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.jobAdvertisement.count({ where: { orgId } }),
    ]);

    return NextResponse.json({
      data: ads,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Error fetching job ads:', error);
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
    const data = createJobAdSchema.parse(body);

    const ad = await prisma.jobAdvertisement.create({
      data: {
        ...data,
        orgId,
        publicToken: Math.random().toString(36).substring(2, 15),
        adContent: '',
        createdBy: user.id,
      },
      include: {
        jobProfile: { select: { id: true, title: true } },
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    await createAuditLog({
      orgId,
      actorUserId: user.id,
      entityType: 'JobAdvertisement',
      entityId: ad.id,
      action: 'CREATE',
    });

    return NextResponse.json({ data: ad }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Error creating job ad:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
