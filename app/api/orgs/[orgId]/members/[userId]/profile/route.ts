import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAuth, requireOrgRole } from '@/lib/auth';
import { PROFILE_FIELDS, MIN_VISIBILITY, DEFAULT_FIELD_VISIBILITY, type FieldVisibility } from '@/lib/field-visibility';
import type { Prisma } from '@/app/generated/prisma/client';

const VISIBILITY_VALUES = ['ALL_MEMBERS', 'TEAM_MEMBERS', 'SELF_ADMIN', 'ADMIN_ONLY'] as const;

const profileSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  phone: z.string().max(30).optional().nullable(),
  whatsapp: z.string().max(30).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  githubUrl: z.string().url().optional().nullable().or(z.literal('')),
  linkedinUrl: z.string().url().optional().nullable().or(z.literal('')),
  dob: z.string().optional().nullable(),
  parentOrg: z.string().max(200).optional().nullable(),
  designation: z.string().max(200).optional().nullable(),
  education: z.string().max(500).optional().nullable(),
  introducedBy: z.string().max(200).optional().nullable(),
  bankAccount: z.string().max(200).optional().nullable(),
  upiId: z.string().max(100).optional().nullable(),
  fieldVisibility: z.record(z.string(), z.enum(VISIBILITY_VALUES)).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgId: string; userId: string }> }
) {
  try {
    const { orgId, userId } = await params;
    const actor = await requireAuth();
    await requireOrgRole(orgId, actor.id, ['ADMIN', 'MAINTAINER']);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        isVirtual: true,
        createdAt: true,
        virtualProfile: true,
      },
    });

    if (!user || !user.isVirtual) {
      return NextResponse.json({ error: 'Virtual user not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Access denied' || error.message === 'Insufficient permissions')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orgId: string; userId: string }> }
) {
  try {
    const { orgId, userId } = await params;
    const actor = await requireAuth();
    await requireOrgRole(orgId, actor.id, ['ADMIN', 'MAINTAINER']);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isVirtual: true },
    });
    if (!user || !user.isVirtual) {
      return NextResponse.json({ error: 'Virtual user not found' }, { status: 404 });
    }

    const body = await request.json();
    const data = profileSchema.parse(body);

    // Update name on User if provided
    if (data.name !== undefined) {
      await prisma.user.update({ where: { id: userId }, data: { name: data.name } });
    }

    // Enforce minimum visibility for sensitive fields
    let resolvedVisibility: Record<string, string> = {};
    if (data.fieldVisibility) {
      resolvedVisibility = { ...data.fieldVisibility };
      const VISIBILITY_RANK: Record<string, number> = {
        ALL_MEMBERS: 0, TEAM_MEMBERS: 1, SELF_ADMIN: 2, ADMIN_ONLY: 3,
      };
      for (const [field, minVis] of Object.entries(MIN_VISIBILITY)) {
        const requested = resolvedVisibility[field] as string | undefined;
        if (requested && VISIBILITY_RANK[requested] < VISIBILITY_RANK[minVis!]) {
          resolvedVisibility[field] = minVis!;
        }
      }
    }

    // Upsert VirtualMemberProfile
    const profileData = {
      phone: data.phone ?? null,
      whatsapp: data.whatsapp ?? null,
      address: data.address ?? null,
      githubUrl: data.githubUrl || null,
      linkedinUrl: data.linkedinUrl || null,
      dob: data.dob ? new Date(data.dob) : null,
      parentOrg: data.parentOrg ?? null,
      designation: data.designation ?? null,
      education: data.education ?? null,
      introducedBy: data.introducedBy ?? null,
      bankAccount: data.bankAccount ?? null,
      upiId: data.upiId ?? null,
      ...(Object.keys(resolvedVisibility).length > 0 && { fieldVisibility: resolvedVisibility as Prisma.InputJsonValue }),
    };

    const profile = await prisma.virtualMemberProfile.upsert({
      where: { userId },
      create: { userId, ...profileData },
      update: profileData,
    });

    return NextResponse.json({ profile });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    if (error instanceof Error && (error.message === 'Access denied' || error.message === 'Insufficient permissions')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
