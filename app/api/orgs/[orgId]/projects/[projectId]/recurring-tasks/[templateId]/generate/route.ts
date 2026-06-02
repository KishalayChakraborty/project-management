import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, requireOrgRole } from '@/lib/auth';
import { generateMissingOccurrences } from '@/lib/recurring';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ orgId: string; projectId: string; templateId: string }> }
) {
  try {
    const { orgId, projectId, templateId } = await params;
    const user = await requireAuth();
    await requireOrgRole(orgId, user.id, ['ADMIN', 'MAINTAINER']);

    const template = await prisma.recurringTaskTemplate.findUnique({
      where: { id: templateId },
      include: { occurrences: { select: { id: true, periodStart: true, taskId: true } } },
    });

    if (!template || template.projectId !== projectId || template.orgId !== orgId) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const count = await generateMissingOccurrences(template);

    return NextResponse.json({ generated: count, message: count === 0 ? 'All occurrences up to date' : `Generated ${count} new occurrence(s)` });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Access denied' || error.message === 'Insufficient permissions')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to generate occurrences' }, { status: 500 });
  }
}
