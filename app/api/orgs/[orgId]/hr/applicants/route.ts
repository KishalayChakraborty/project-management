import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireOrgRole } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

const createApplicantSchema = z.object({
  jobProfileId: z.string().optional(),
  advertisementId: z.string().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  alternatePhone: z.string().optional(),
  linkedinUrl: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.string().url().optional()
  ),
  githubUrl: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.string().url().optional()
  ),
  portfolioUrl: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.string().url().optional()
  ),
  city: z.string().optional(),
  country: z.string().optional(),
  address: z.string().optional(),
  currentCompany: z.string().optional(),
  currentTitle: z.string().optional(),
  currentSalary: z.number().optional(),
  currentCurrency: z.string().optional(),
  noticePeriodDays: z.number().optional(),
  expectedSalaryMin: z.number().optional(),
  expectedSalaryMax: z.number().optional(),
  expectedCurrency: z.string().optional(),
  source: z.enum(['PUBLIC_LINK', 'HR_ADDED', 'REFERRAL', 'AGENCY']).optional(),
  referredBy: z.string().optional(),
  internalNotes: z.string().optional(),
});

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
    const status = searchParams.get('status');
    const jobProfileId = searchParams.get('jobProfileId');
    const advertisementId = searchParams.get('advertisementId');

    const where: any = { orgId };
    if (status) where.status = status;
    if (jobProfileId) where.jobProfileId = jobProfileId;
    if (advertisementId) where.advertisementId = advertisementId;

    const [applicants, total] = await Promise.all([
      prisma.applicant.findMany({
        where,
        include: {
          jobProfile: { select: { id: true, title: true } },
          advertisement: { select: { id: true, title: true } },
          _count: { select: { interviewRounds: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { appliedAt: 'desc' },
      }),
      prisma.applicant.count({ where }),
    ]);

    return NextResponse.json({
      data: applicants,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Error fetching applicants:', error);
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

    let body: any;
    const contentType = request.headers.get('content-type');

    if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData();
      const dataStr = formData.get('data');
      body = typeof dataStr === 'string' ? JSON.parse(dataStr) : dataStr;
    } else {
      body = await request.json();
    }

    const data = createApplicantSchema.parse(body);

    const applicant = await prisma.applicant.create({
      data: {
        orgId,
        ...data,
        status: 'NEW',
        appliedAt: new Date(),
        createdBy: user.id,
      },
      include: {
        jobProfile: true,
        advertisement: true,
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    await createAuditLog({
      orgId,
      actorUserId: user.id,
      entityType: 'Applicant',
      entityId: applicant.id,
      action: 'CREATE',
    });

    return NextResponse.json({ data: applicant }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Error creating applicant:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
