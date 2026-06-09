'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ApplicantDetailPage() {
  const params = useParams();
  const { toast } = useToast();
  const orgId = params.orgId as string;
  const applicantId = params.applicantId as string;
  const [applicant, setApplicant] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApplicant = async () => {
      try {
        const response = await axios.get(
          `/api/orgs/${orgId}/hr/applicants/${applicantId}`
        );
        setApplicant(response.data.data);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load applicant details',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchApplicant();
  }, [orgId, applicantId, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p>Loading applicant details...</p>
        </div>
      </div>
    );
  }

  if (!applicant) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Applicant Not Found</h1>
          <p className="text-muted-foreground">This applicant could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {applicant.firstName} {applicant.lastName}
          </h1>
          <p className="text-muted-foreground">{applicant.email}</p>
        </div>
        <Badge>{applicant.status}</Badge>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="education">Education</TabsTrigger>
          <TabsTrigger value="experience">Experience</TabsTrigger>
          <TabsTrigger value="interviews">Interviews</TabsTrigger>
          <TabsTrigger value="salary">Salary & Offer</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <p>{applicant.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <p>{applicant.phone || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">City</label>
                  <p>{applicant.city || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Country</label>
                  <p>{applicant.country || '-'}</p>
                </div>
              </div>
              {applicant.address && (
                <div>
                  <label className="text-sm font-medium">Address</label>
                  <p>{applicant.address}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Professional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Current Company</label>
                  <p>{applicant.currentCompany || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Current Title</label>
                  <p>{applicant.currentTitle || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Current Salary</label>
                  <p>
                    {applicant.currentSalary
                      ? `₹ ${applicant.currentSalary.toLocaleString('en-IN')}`
                      : '-'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Notice Period</label>
                  <p>{applicant.noticePeriodDays ? `${applicant.noticePeriodDays} days` : '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Expected Salary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Min Expected</label>
                  <p>
                    {applicant.expectedSalaryMin
                      ? `₹ ${applicant.expectedSalaryMin.toLocaleString('en-IN')}`
                      : '-'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Max Expected</label>
                  <p>
                    {applicant.expectedSalaryMax
                      ? `₹ ${applicant.expectedSalaryMax.toLocaleString('en-IN')}`
                      : '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {applicant.internalNotes && (
            <Card>
              <CardHeader>
                <CardTitle>Internal Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{applicant.internalNotes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="education" className="space-y-4">
          {applicant.educations && applicant.educations.length > 0 ? (
            applicant.educations.map((edu: any) => (
              <Card key={edu.id}>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="font-medium">{edu.degree}</div>
                    <div className="text-sm text-muted-foreground">{edu.institution}</div>
                    <div className="text-sm">Field: {edu.fieldOfStudy}</div>
                    <div className="text-sm">
                      {edu.startYear} - {edu.isCurrent ? 'Current' : edu.endYear}
                    </div>
                    {edu.grade && <div className="text-sm">Grade: {edu.grade}</div>}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-muted-foreground">No education records</p>
          )}
        </TabsContent>

        <TabsContent value="experience" className="space-y-4">
          {applicant.experiences && applicant.experiences.length > 0 ? (
            applicant.experiences.map((exp: any) => (
              <Card key={exp.id}>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="font-medium">{exp.title}</div>
                    <div className="text-sm text-muted-foreground">{exp.company}</div>
                    <div className="text-sm">
                      {new Date(exp.startDate).toLocaleDateString()} -{' '}
                      {exp.isCurrent ? 'Current' : new Date(exp.endDate).toLocaleDateString()}
                    </div>
                    {exp.description && <div className="text-sm mt-2">{exp.description}</div>}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-muted-foreground">No experience records</p>
          )}
        </TabsContent>

        <TabsContent value="interviews" className="space-y-4">
          {applicant.interviewRounds && applicant.interviewRounds.length > 0 ? (
            applicant.interviewRounds.map((round: any) => (
              <Card key={round.id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    Round {round.roundNumber} - {round.type}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Status</label>
                      <p>{round.status}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Scheduled</label>
                      <p>
                        {round.scheduledAt
                          ? new Date(round.scheduledAt).toLocaleString()
                          : '-'}
                      </p>
                    </div>
                  </div>
                  {round.feedbacks && round.feedbacks.length > 0 && (
                    <div className="mt-4 space-y-3">
                      <label className="text-sm font-medium">Feedback</label>
                      {round.feedbacks.map((feedback: any) => (
                        <div key={feedback.id} className="text-sm border-l-2 pl-3">
                          <div className="font-medium">{feedback.recommendation}</div>
                          <div>Overall Score: {feedback.overallScore}/10</div>
                          {feedback.notes && (
                            <div className="mt-1 text-muted-foreground">{feedback.notes}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-muted-foreground">No interview rounds</p>
          )}
        </TabsContent>

        <TabsContent value="salary" className="space-y-4">
          {applicant.salaryStructures && applicant.salaryStructures.length > 0 ? (
            applicant.salaryStructures.map((salary: any) => (
              <Card key={salary.id}>
                <CardHeader>
                  <CardTitle className="text-base">Salary Structure</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Base Salary</label>
                      <p>₹ {salary.baseSalary.toLocaleString('en-IN')}</p>
                    </div>
                    {salary.variablePay && (
                      <div>
                        <label className="text-sm font-medium">Variable Pay</label>
                        <p>₹ {salary.variablePay.toLocaleString('en-IN')}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-muted-foreground">No salary structures</p>
          )}

          {applicant.offers && applicant.offers.length > 0 ? (
            <div className="space-y-4">
              <h3 className="font-semibold">Offers</h3>
              {applicant.offers.map((offer: any) => (
                <Card key={offer.id}>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="font-medium">Offer #{offer.id.slice(0, 8)}</div>
                        <Badge>{offer.status}</Badge>
                      </div>
                      {offer.joiningDate && (
                        <div className="text-sm">
                          Joining Date: {new Date(offer.joiningDate).toLocaleDateString()}
                        </div>
                      )}
                      {offer.expiresAt && (
                        <div className="text-sm">
                          Expires: {new Date(offer.expiresAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No offers</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
