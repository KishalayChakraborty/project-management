import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireOrgRole } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

const salarySchema = z.object({
  baseSalary: z.number().min(0),
  currency: z.string().default('USD'),
  variablePay: z.number().optional(),
  signingBonus: z.number().optional(),
  stockOptions: z.number().optional(),
  annualLeave: z.number().optional(),
  otherBenefits: z.record(z.string(), z.any()).optional(),
  workingHoursPerWeek: z.number().optional(),
  workLocation: z.string().optional(),
  specialConsiderations: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; applicantId: string }> }
) {
  try {
    const { orgId, applicantId } = await params;
    const user = await requireAuth();
    await requireOrgRole(orgId, user.id, ['ADMIN', 'MAINTAINER', 'MEMBER']);

    const applicant = await prisma.applicant.findUnique({
      where: { id: applicantId },
    });

    if (!applicant || applicant.orgId !== orgId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const structures = await prisma.salaryStructure.findMany({
      where: { applicantId },
      include: {
        creator: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: structures });
  } catch (error) {
    console.error('Error fetching salary structures:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; applicantId: string }> }
) {
  try {
    const { orgId, applicantId } = await params;
    const user = await requireAuth();
    await requireOrgRole(orgId, user.id, ['ADMIN', 'MAINTAINER', 'MEMBER']);

    const applicant = await prisma.applicant.findUnique({
      where: { id: applicantId },
    });

    if (!applicant || applicant.orgId !== orgId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json();
    const data = salarySchema.parse(body);

    const structure = await prisma.salaryStructure.create({
      data: {
        ...data,
        applicantId,
        orgId,
        createdBy: user.id,
      },
      include: {
        creator: { select: { id: true, name: true } },
      },
    });

    await createAuditLog({
      orgId,
      actorUserId: user.id,
      entityType: 'SalaryStructure',
      entityId: structure.id,
      action: 'CREATE',
    });

    return NextResponse.json({ data: structure }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Error creating salary structure:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
