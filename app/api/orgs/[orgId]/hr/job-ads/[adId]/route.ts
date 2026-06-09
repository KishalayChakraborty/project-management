import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireOrgRole } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

const updateJobAdSchema = z.object({
  title: z.string().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED']).optional(),
  salaryRangeMin: z.number().positive().optional(),
  salaryRangeMax: z.number().positive().optional(),
  location: z.string().optional(),
  isRemote: z.boolean().optional(),
  deadline: z.string().datetime().optional(),
  adContent: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; adId: string }> }
) {
  try {
    const { orgId, adId } = await params;
    const user = await requireAuth();
    await requireOrgRole(orgId, user.id, ['ADMIN', 'MAINTAINER']);

    const ad = await prisma.jobAdvertisement.findUnique({
      where: { id: adId },
      include: {
        jobProfile: true,
        creator: { select: { id: true, name: true, email: true } },
        _count: { select: { applicants: true } },
      },
    });

    if (!ad || ad.orgId !== orgId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ data: ad });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; adId: string }> }
) {
  try {
    const { orgId, adId } = await params;
    const user = await requireAuth();
    await requireOrgRole(orgId, user.id, ['ADMIN', 'MAINTAINER']);

    const ad = await prisma.jobAdvertisement.findUnique({ where: { id: adId } });
    if (!ad || ad.orgId !== orgId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json();
    const data = updateJobAdSchema.parse(body);

    const updated = await prisma.jobAdvertisement.update({
      where: { id: adId },
      data: {
        title: data.title,
        status: data.status,
        salaryRangeMin: data.salaryRangeMin,
        salaryRangeMax: data.salaryRangeMax,
        location: data.location,
        isRemote: data.isRemote,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
        adContent: data.adContent,
      },
      include: {
        jobProfile: true,
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    await createAuditLog({
      orgId,
      actorUserId: user.id,
      entityType: 'JobAdvertisement',
      entityId: updated.id,
      action: 'UPDATE',
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; adId: string }> }
) {
  try {
    const { orgId, adId } = await params;
    const user = await requireAuth();
    await requireOrgRole(orgId, user.id, ['ADMIN', 'MAINTAINER']);

    const ad = await prisma.jobAdvertisement.findUnique({ where: { id: adId } });
    if (!ad || ad.orgId !== orgId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.jobAdvertisement.delete({ where: { id: adId } });

    await createAuditLog({
      orgId,
      actorUserId: user.id,
      entityType: 'JobAdvertisement',
      entityId: adId,
      action: 'DELETE',
    });

    return NextResponse.json({ data: { id: adId } });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
