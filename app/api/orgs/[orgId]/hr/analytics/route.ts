import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireOrgRole } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const user = await requireAuth();
    await requireOrgRole(orgId, user.id, ['ADMIN', 'MAINTAINER', 'MEMBER']);

    // Count applicants by status
    const statusCounts = await prisma.applicant.groupBy({
      by: ['status'],
      where: { orgId },
      _count: {
        id: true,
      },
    });

    // Count open job ads
    const openAds = await prisma.jobAdvertisement.count({
      where: {
        orgId,
        status: 'ACTIVE',
      },
    });

    // Count scheduled interviews
    const scheduledInterviews = await prisma.interviewRound.count({
      where: {
        orgId,
        status: 'SCHEDULED',
      },
    });

    // Count pending offers
    const pendingOffers = await prisma.employmentOffer.count({
      where: {
        orgId,
        status: 'SENT',
      },
    });

    // Average time to hire (completed hires)
    const hiredApplicants = await prisma.applicant.findMany({
      where: {
        orgId,
        status: 'HIRED',
      },
      select: {
        appliedAt: true,
        updatedAt: true,
      },
    });

    const avgTimeToHire =
      hiredApplicants.length > 0
        ? hiredApplicants.reduce((acc, app) => {
            const days = Math.floor(
              (app.updatedAt.getTime() - app.appliedAt.getTime()) / (1000 * 60 * 60 * 24)
            );
            return acc + days;
          }, 0) / hiredApplicants.length
        : 0;

    // Interview funnel
    const funnel = {
      total: 0,
      screening: statusCounts.find((s) => s.status === 'SCREENING')?._count.id || 0,
      interview: statusCounts.find((s) => s.status === 'INTERVIEW')?._count.id || 0,
      offer: statusCounts.find((s) => s.status === 'OFFER')?._count.id || 0,
      hired: statusCounts.find((s) => s.status === 'HIRED')?._count.id || 0,
    };

    return NextResponse.json({
      data: {
        kpis: {
          openPositions: openAds,
          activeApplicants: statusCounts.reduce((acc, s) => acc + s._count.id, 0),
          scheduledInterviews,
          pendingOffers,
        },
        statusBreakdown: Object.fromEntries(
          statusCounts.map((s) => [s.status, s._count.id])
        ),
        funnel,
        metrics: {
          avgTimeToHireInDays: Math.round(avgTimeToHire),
          conversionRate:
            hiredApplicants.length > 0
              ? ((hiredApplicants.length / funnel.total) * 100).toFixed(2)
              : 0,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
