'use client';

import { useParams } from 'next/navigation';
import { useHRAnalytics } from '@/hooks/hr/useHRAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AnalyticsPage() {
  const params = useParams();
  const orgId = params.orgId as string;

  const { data: analyticsData, isLoading } = useHRAnalytics(orgId);
  const analytics = analyticsData?.data;

  if (isLoading) {
    return <div className="p-6 text-center">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">HR Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Open Positions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.kpis.openPositions || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Applicants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.kpis.activeApplicants || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Scheduled Interviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.kpis.scheduledInterviews || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Offers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.kpis.pendingOffers || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recruitment Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between mb-1">
                <span>Screening</span>
                <span>{analytics?.funnel.screening || 0}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-yellow-500 h-2 rounded-full"
                  style={{width: `${((analytics?.funnel.screening || 0) / (analytics?.kpis.activeApplicants || 1)) * 100}%`}}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span>Interview</span>
                <span>{analytics?.funnel.interview || 0}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full"
                  style={{width: `${((analytics?.funnel.interview || 0) / (analytics?.kpis.activeApplicants || 1)) * 100}%`}}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span>Offer</span>
                <span>{analytics?.funnel.offer || 0}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full"
                  style={{width: `${((analytics?.funnel.offer || 0) / (analytics?.kpis.activeApplicants || 1)) * 100}%`}}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span>Hired</span>
                <span>{analytics?.funnel.hired || 0}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-emerald-500 h-2 rounded-full"
                  style={{width: `${((analytics?.funnel.hired || 0) / (analytics?.kpis.activeApplicants || 1)) * 100}%`}}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Key Metrics</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Avg. Time to Hire</div>
            <div className="text-2xl font-bold">{analytics?.metrics.avgTimeToHireInDays || 0} days</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Conversion Rate</div>
            <div className="text-2xl font-bold">{analytics?.metrics.conversionRate || 0}%</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
