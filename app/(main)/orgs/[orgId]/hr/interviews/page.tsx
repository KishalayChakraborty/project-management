'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function InterviewsPage() {
  const params = useParams();
  const { toast } = useToast();
  const orgId = params.orgId as string;
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const applicantsRes = await axios.get(`/api/orgs/${orgId}/hr/applicants?limit=1000`);
        const allApplicants = applicantsRes.data.data || [];

        const allInterviews: any[] = [];

        for (const applicant of allApplicants) {
          const interviewsRes = await axios.get(
            `/api/orgs/${orgId}/hr/applicants/${applicant.id}/interviews`
          );

          allInterviews.push(
            ...(interviewsRes.data.data || []).map((interview: any) => ({
              ...interview,
              applicantId: applicant.id,
              applicantName: `${applicant.firstName} ${applicant.lastName}`,
              applicantEmail: applicant.email,
            }))
          );
        }

        setInterviews(allInterviews.sort((a, b) =>
          new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
        ));
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load interviews',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [orgId, toast]);

  const filteredInterviews = interviews.filter((interview) => {
    const matchesSearch =
      interview.applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      interview.applicantEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      interview.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter ? interview.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  const upcomingInterviews = filteredInterviews.filter(
    (i) => new Date(i.scheduledAt) > new Date()
  );
  const completedInterviews = filteredInterviews.filter(
    (i) => new Date(i.scheduledAt) <= new Date()
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p>Loading interviews...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Interview Management</h1>
        <p className="text-muted-foreground">Schedule and track all interview rounds</p>
      </div>

      {interviews.length === 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-blue-900">No Interviews Yet</h3>
              <p className="text-sm text-blue-700 mt-1">
                To schedule an interview:
              </p>
              <ol className="text-sm text-blue-700 mt-2 ml-4 space-y-1 list-decimal">
                <li>Go to Applicants page</li>
                <li>Click on an applicant to view their profile</li>
                <li>Click "Schedule Interview" button in the Interviews tab</li>
                <li>Fill in interview details and save</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      )}

      {interviews.length > 0 && (
        <>
          <div className="flex gap-4 flex-col sm:flex-row">
            <Input
              placeholder="Search by applicant, email, or interview type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                
                <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                <SelectItem value="NO_SHOW">No Show</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList>
              <TabsTrigger value="upcoming">
                Upcoming ({upcomingInterviews.length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({completedInterviews.length})
              </TabsTrigger>
              <TabsTrigger value="all">All ({filteredInterviews.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="space-y-4">
              {upcomingInterviews.length > 0 ? (
                <div className="grid gap-4">
                  {upcomingInterviews.map((interview) => (
                    <InterviewCard
                      key={interview.id}
                      interview={interview}
                      orgId={orgId}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No upcoming interviews
                </p>
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {completedInterviews.length > 0 ? (
                <div className="grid gap-4">
                  {completedInterviews.map((interview) => (
                    <InterviewCard
                      key={interview.id}
                      interview={interview}
                      orgId={orgId}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No completed interviews
                </p>
              )}
            </TabsContent>

            <TabsContent value="all" className="space-y-4">
              {filteredInterviews.length > 0 ? (
                <div className="grid gap-4">
                  {filteredInterviews.map((interview) => (
                    <InterviewCard
                      key={interview.id}
                      interview={interview}
                      orgId={orgId}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No interviews found
                </p>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function InterviewCard({ interview, orgId }: { interview: any; orgId: string }) {
  const isUpcoming = new Date(interview.scheduledAt) > new Date();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">
                {interview.applicantName}
              </CardTitle>
              <Badge variant={
                interview.status === 'COMPLETED' ? 'default' :
                interview.status === 'CANCELLED' ? 'destructive' :
                interview.status === 'NO_SHOW' ? 'destructive' :
                isUpcoming ? 'secondary' :
                'outline'
              }>
                {interview.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{interview.applicantEmail}</p>
          </div>
          <Link
            href={`/orgs/${orgId}/hr/applicants/${interview.applicantId}`}
            className="text-sm text-blue-600 hover:underline"
          >
            View Profile
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Type</label>
            <p className="font-medium">{interview.type.replace(/_/g, ' ')}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Round</label>
            <p className="font-medium">Round {interview.roundNumber}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Scheduled</label>
            <p className="text-sm">{new Date(interview.scheduledAt).toLocaleString()}</p>
          </div>
          {interview.durationMin && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Duration</label>
              <p className="font-medium">{interview.durationMin} minutes</p>
            </div>
          )}
        </div>

        {interview.meetingLink && (
          <div>
            <label className="text-xs font-medium text-muted-foreground">Meeting Link</label>
            <a
              href={interview.meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm break-all"
            >
              {interview.meetingLink}
            </a>
          </div>
        )}

        {interview.location && (
          <div>
            <label className="text-xs font-medium text-muted-foreground">Location</label>
            <p className="text-sm">{interview.location}</p>
          </div>
        )}

        {interview.agenda && (
          <div>
            <label className="text-xs font-medium text-muted-foreground">Agenda</label>
            <p className="text-sm">{interview.agenda}</p>
          </div>
        )}

        {interview.feedbacks && interview.feedbacks.length > 0 && (
          <div className="bg-gray-50 p-3 rounded">
            <label className="text-xs font-medium text-muted-foreground block mb-2">
              Feedback ({interview.feedbacks.length})
            </label>
            {interview.feedbacks.map((feedback: any) => (
              <div key={feedback.id} className="text-sm space-y-1 mb-2">
                <div className="font-medium">{feedback.recommendation}</div>
                {feedback.overallScore && (
                  <div>Score: {feedback.overallScore}/10</div>
                )}
                {feedback.notes && (
                  <div className="text-muted-foreground">{feedback.notes}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
