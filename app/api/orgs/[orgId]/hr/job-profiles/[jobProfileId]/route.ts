import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireOrgRole } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

const updateJobProfileSchema = z.object({
  title: z.string().min(1).optional(),
  department: z.string().optional(),
  level: z.enum(['INTERN', 'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'MANAGER', 'DIRECTOR', 'VP', 'C_LEVEL']).optional(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE']).optional(),
  description: z.string().optional(),
  responsibilities: z.array(z.string()).optional(),
  requirements: z.array(z.string()).optional(),
  niceToHave: z.array(z.string()).optional(),
  minExperienceYears: z.number().int().optional(),
  maxExperienceYears: z.number().int().optional(),
  skills: z.array(z.string()).optional(),
  educationLevel: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; jobProfileId: string }> }
) {
  try {
    const { orgId, jobProfileId } = await params;
    const user = await requireAuth();
    await requireOrgRole(orgId, user.id, ['ADMIN', 'MAINTAINER']);

    const profile = await prisma.jobProfile.findUnique({
      where: { id: jobProfileId },
      include: { creator: { select: { id: true, name: true, email: true } } },
    });

    if (!profile || profile.orgId !== orgId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ data: profile });
  } catch (error) {
    if ((error as any).message?.includes('Access denied')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; jobProfileId: string }> }
) {
  try {
    const { orgId, jobProfileId } = await params;
    const user = await requireAuth();
    await requireOrgRole(orgId, user.id, ['ADMIN', 'MAINTAINER']);

    const profile = await prisma.jobProfile.findUnique({
      where: { id: jobProfileId },
    });

    if (!profile || profile.orgId !== orgId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json();
    const data = updateJobProfileSchema.parse(body);

    const updated = await prisma.jobProfile.update({
      where: { id: jobProfileId },
      data: {
        title: data.title,
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
      },
      include: { creator: { select: { id: true, name: true, email: true } } },
    });

    await createAuditLog({
      orgId,
      actorUserId: user.id,
      entityType: 'JobProfile',
      entityId: updated.id,
      action: 'UPDATE',
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    if ((error as any).message?.includes('Insufficient permissions')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    console.error('Error updating job profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; jobProfileId: string }> }
) {
  try {
    const { orgId, jobProfileId } = await params;
    const user = await requireAuth();
    await requireOrgRole(orgId, user.id, ['ADMIN', 'MAINTAINER']);

    const profile = await prisma.jobProfile.findUnique({
      where: { id: jobProfileId },
    });

    if (!profile || profile.orgId !== orgId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.jobProfile.delete({
      where: { id: jobProfileId },
    });

    await createAuditLog({
      orgId,
      actorUserId: user.id,
      entityType: 'JobProfile',
      entityId: jobProfileId,
      action: 'DELETE',
    });

    return NextResponse.json({ data: { id: jobProfileId } });
  } catch (error) {
    if ((error as any).message?.includes('Insufficient permissions')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    console.error('Error deleting job profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
