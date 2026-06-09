import { requireAuth, requireOrgAccess } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function HRDashboard({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const user = await requireAuth();
  await requireOrgAccess(orgId, user.id);

  const [
    openPositions,
    activeApplicants,
    scheduledInterviews,
    pendingOffers,
  ] = await Promise.all([
    prisma.jobAdvertisement.count({
      where: { orgId, status: 'ACTIVE' },
    }),
    prisma.applicant.count({
      where: { orgId, status: { in: ['NEW', 'SCREENING', 'INTERVIEW'] } },
    }),
    prisma.interviewRound.count({
      where: {
        orgId,
        status: 'SCHEDULED',
        scheduledAt: {
          gte: new Date(),
        },
      },
    }),
    prisma.employmentOffer.count({
      where: { orgId, status: 'SENT' },
    }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">HR Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Positions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openPositions}</div>
            <p className="text-xs text-muted-foreground">Active job advertisements</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Applicants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeApplicants}</div>
            <p className="text-xs text-muted-foreground">In pipeline (New, Screening, Interview)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled Interviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scheduledInterviews}</div>
            <p className="text-xs text-muted-foreground">Today & upcoming</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Offers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingOffers}</div>
            <p className="text-xs text-muted-foreground">Awaiting response</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Start</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Navigate using the sidebar to:
          </p>
          <ul className="list-disc list-inside text-sm space-y-1">
            <li>Create <strong>Job Profiles</strong> with requirements and skills</li>
            <li>Post <strong>Job Ads</strong> with AI-generated content (optional)</li>
            <li>Manage <strong>Applicants</strong> through the hiring pipeline</li>
            <li>Schedule <strong>Interviews</strong> and collect feedback</li>
            <li>Configure <strong>Salary & Offers</strong> with negotiation</li>
            <li>Track <strong>Budget</strong> and hiring metrics</li>
            <li>View <strong>Analytics</strong> for recruitment insights</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
