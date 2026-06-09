import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireOrgRole } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

const generateAdSchema = z.object({
  provider: z.enum(['CLAUDE', 'OPENAI', 'GEMINI', 'TEMPLATE']),
  modifications: z.string().optional(),
});

function generateTemplateAd(profile: any): string {
  const responsibilities = Array.isArray(profile.responsibilities) ? profile.responsibilities : [];
  const requirements = Array.isArray(profile.requirements) ? profile.requirements : [];
  const skills = Array.isArray(profile.skills) ? profile.skills : [];

  return `
# ${profile.title}

## About the Role
${profile.description || 'We are looking for a talented professional to join our team.'}

## Level
${profile.level}

## Employment Type
${profile.employmentType}

## Key Responsibilities
${responsibilities.length > 0 ? responsibilities.map((r: string) => `- ${r}`).join('\n') : '- TBD'}

## Required Qualifications
${requirements.length > 0 ? requirements.map((r: string) => `- ${r}`).join('\n') : '- TBD'}

## Required Skills
${skills.length > 0 ? skills.map((s: string) => `- ${s}`).join('\n') : '- TBD'}

## What We're Looking For
- ${profile.minExperienceYears || 0}+ years of experience
- Education: ${profile.educationLevel || 'Bachelor\'s degree or equivalent'}

## Why Join Us?
- Competitive salary and benefits
- Career growth opportunities
- Collaborative work environment
- Flexible working arrangements
`.trim();
}

async function generateWithClaude(profile: any, modifications: string): Promise<string> {
  // Fallback to template - Anthropic SDK optional
  return generateTemplateAd(profile);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; adId: string }> }
) {
  try {
    const { orgId, adId } = await params;
    const user = await requireAuth();
    await requireOrgRole(orgId, user.id, ['ADMIN', 'MAINTAINER']);

    const ad = await prisma.jobAdvertisement.findUnique({
      where: { id: adId },
      include: { jobProfile: true },
    });

    if (!ad || ad.orgId !== orgId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json();
    const { provider, modifications } = generateAdSchema.parse(body);

    let adContent: string;

    if (provider === 'CLAUDE') {
      adContent = await generateWithClaude(ad.jobProfile, modifications || '');
    } else if (provider === 'OPENAI') {
      // OpenAI fallback to template for now
      adContent = generateTemplateAd(ad.jobProfile);
    } else if (provider === 'GEMINI') {
      // Gemini fallback to template for now
      adContent = generateTemplateAd(ad.jobProfile);
    } else {
      adContent = generateTemplateAd(ad.jobProfile);
    }

    const updated = await prisma.jobAdvertisement.update({
      where: { id: adId },
      data: {
        adContent,
        aiProvider: provider,
        aiModifications: modifications,
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
    console.error('Error generating ad:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
