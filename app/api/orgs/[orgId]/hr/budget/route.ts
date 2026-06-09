import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireOrgRole } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

const budgetSchema = z.object({
  jobProfileId: z.string().optional(),
  fiscalYear: z.preprocess(val => val === '' || val === null ? undefined : val, z.coerce.number()),
  department: z.string().min(1, 'Department is required'),
  budgetedPositions: z.preprocess(val => val === '' || val === null ? 0 : val, z.coerce.number().min(0)),
  allocatedAmount: z.preprocess(val => val === '' || val === null ? 0 : val, z.coerce.number().min(0)),
  currency: z.string().default('INR'),
  notes: z.string().optional(),
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
    const fiscalYear = searchParams.get('fiscalYear');

    const where: any = { orgId };
    if (fiscalYear) where.fiscalYear = parseInt(fiscalYear);

    const budgets = await prisma.hiringBudget.findMany({
      where,
      include: {
        jobProfile: { select: { id: true, title: true } },
        creator: { select: { id: true, name: true } },
      },
      orderBy: { fiscalYear: 'desc' },
    });

    return NextResponse.json({ data: budgets });
  } catch (error) {
    console.error('Error fetching budgets:', error);
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
    const data = budgetSchema.parse(body);

    const budget = await prisma.hiringBudget.create({
      data: {
        ...data,
        orgId,
        filledPositions: 0,
        spentAmount: 0,
        createdBy: user.id,
      },
      include: {
        jobProfile: true,
        creator: { select: { id: true, name: true } },
      },
    });

    await createAuditLog({
      orgId,
      actorUserId: user.id,
      entityType: 'HiringBudget',
      entityId: budget.id,
      action: 'CREATE',
    });

    return NextResponse.json({ data: budget }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error creating budget:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
