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
import { Check, X, AlertCircle } from 'lucide-react';

export default function SalaryPage() {
  const params = useParams();
  const { toast } = useToast();
  const orgId = params.orgId as string;
  const [salaryStructures, setSalaryStructures] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [offerStatusFilter, setOfferStatusFilter] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const applicantsRes = await axios.get(`/api/orgs/${orgId}/hr/applicants?limit=1000`);
        const allApplicants = applicantsRes.data.data || [];

        const allSalaryStructures: any[] = [];
        const allOffers: any[] = [];

        if (allApplicants.length === 0) {
          setLoading(false);
          return;
        }

        for (const applicant of allApplicants) {
          try {
            const [salaryRes, offersRes] = await Promise.all([
              axios.get(`/api/orgs/${orgId}/hr/applicants/${applicant.id}/salary`).catch(() => ({ data: { data: [] } })),
              axios.get(`/api/orgs/${orgId}/hr/applicants/${applicant.id}/offer`).catch(() => ({ data: { data: [] } })),
            ]);

            const salaryData = salaryRes.data.data || [];
            const offerData = offersRes.data.data || [];

            allSalaryStructures.push(
              ...salaryData.map((s: any) => ({
                ...s,
                applicantId: applicant.id,
                applicantName: `${applicant.firstName} ${applicant.lastName}`,
                applicantEmail: applicant.email,
              }))
            );

            allOffers.push(
              ...offerData.map((o: any) => ({
                ...o,
                applicantId: applicant.id,
                applicantName: `${applicant.firstName} ${applicant.lastName}`,
                applicantEmail: applicant.email,
              }))
            );
          } catch (err) {
            console.error(`Error fetching data for applicant ${applicant.id}:`, err);
          }
        }

        setSalaryStructures(allSalaryStructures);
        setOffers(allOffers);
      } catch (error) {
        console.error('Error loading salary data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load salary and offers data',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [orgId, toast]);

  const handleOfferStatusChange = async (offerId: string, applicantId: string, newStatus: string) => {
    try {
      const response = await axios.patch(
        `/api/orgs/${orgId}/hr/applicants/${applicantId}/offer/${offerId}`,
        { status: newStatus }
      );

      setOffers((prev) =>
        prev.map((o) => (o.id === offerId ? response.data.data : o))
      );

      toast({
        title: 'Success',
        description: `Offer marked as ${newStatus.toLowerCase()}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: (error as any).response?.data?.error || 'Failed to update offer',
        variant: 'destructive',
      });
    }
  };

  const filteredSalaries = salaryStructures.filter(
    (s) =>
      s.applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.applicantEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredOffers = offers.filter((o) => {
    const matchesSearch =
      o.applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.applicantEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = offerStatusFilter ? o.status === offerStatusFilter : true;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Salary & Offers Management</h1>
        <p className="text-muted-foreground">View and manage all salary structures and employment offers</p>
      </div>

      {salaryStructures.length === 0 && offers.length === 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-blue-900">No Salary or Offers Yet</h3>
              <p className="text-sm text-blue-700 mt-1">
                To create salary structures and offers:
              </p>
              <ol className="text-sm text-blue-700 mt-2 ml-4 space-y-1 list-decimal">
                <li>Go to Applicants page</li>
                <li>Click on an applicant to view their profile</li>
                <li>In "Salary & Offer" tab, click "Create Salary Structure"</li>
                <li>Then click "Create Offer" and select the salary structure</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      )}

      {(salaryStructures.length > 0 || offers.length > 0) && (
        <Tabs defaultValue="offers" className="w-full">
          <TabsList>
            <TabsTrigger value="offers">
              Employment Offers ({offers.length})
            </TabsTrigger>
            <TabsTrigger value="salary">
              Salary Structures ({salaryStructures.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="offers" className="space-y-4">
            <div className="flex gap-4 flex-col sm:flex-row">
              <Input
                placeholder="Search by applicant name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              <Select value={offerStatusFilter} onValueChange={setOfferStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="SENT">Sent</SelectItem>
                  <SelectItem value="ACCEPTED">Accepted</SelectItem>
                  <SelectItem value="DECLINED">Declined</SelectItem>
                  <SelectItem value="WITHDRAWN">Withdrawn</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filteredOffers.length > 0 ? (
              <div className="grid gap-4">
                {filteredOffers.map((offer) => (
                  <Card key={offer.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            {offer.applicantName}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">{offer.applicantEmail}</p>
                        </div>
                        <Badge variant={
                          offer.status === 'ACCEPTED' ? 'default' :
                          offer.status === 'DECLINED' ? 'destructive' :
                          offer.status === 'SENT' ? 'secondary' :
                          'outline'
                        }>
                          {offer.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Job Profile</label>
                          <p className="font-medium">{offer.jobProfile?.title || '-'}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Base Salary</label>
                          <p className="font-medium">₹ {offer.salaryStructure?.baseSalary?.toLocaleString('en-IN') || '-'}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Role</label>
                          <p className="font-medium">{offer.assignedRole}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Sent Date</label>
                          <p className="text-sm">{offer.sentAt ? new Date(offer.sentAt).toLocaleDateString() : '-'}</p>
                        </div>
                      </div>

                      {offer.joiningDate && (
                        <div className="bg-blue-50 p-3 rounded text-sm">
                          <strong>Joining Date:</strong> {new Date(offer.joiningDate).toLocaleDateString()}
                        </div>
                      )}

                      {offer.status !== 'ACCEPTED' && offer.status !== 'DECLINED' && (
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleOfferStatusChange(offer.id, offer.applicantId, 'ACCEPTED')}
                            className="gap-2"
                          >
                            <Check className="h-4 w-4" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleOfferStatusChange(offer.id, offer.applicantId, 'DECLINED')}
                            className="gap-2"
                          >
                            <X className="h-4 w-4" />
                            Decline
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No employment offers found</p>
            )}
          </TabsContent>

          <TabsContent value="salary" className="space-y-4">
            <Input
              placeholder="Search by applicant name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            {filteredSalaries.length > 0 ? (
              <div className="grid gap-4">
                {filteredSalaries.map((salary) => (
                  <Card key={salary.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">
                            {salary.applicantName}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">{salary.applicantEmail}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Base Salary</label>
                          <p className="font-medium">₹ {salary.baseSalary?.toLocaleString('en-IN')}</p>
                        </div>
                        {salary.variablePay && (
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Variable Pay</label>
                            <p className="font-medium">₹ {salary.variablePay?.toLocaleString('en-IN')}</p>
                          </div>
                        )}
                        {salary.signingBonus && (
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Signing Bonus</label>
                            <p className="font-medium">₹ {salary.signingBonus?.toLocaleString('en-IN')}</p>
                          </div>
                        )}
                        {salary.annualLeave && (
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Annual Leave</label>
                            <p className="font-medium">{salary.annualLeave} days</p>
                          </div>
                        )}
                      </div>

                      {salary.workLocation && (
                        <div className="text-sm">
                          <strong>Work Location:</strong> {salary.workLocation}
                        </div>
                      )}

                      {salary.specialConsiderations && (
                        <div className="text-sm bg-gray-50 p-3 rounded">
                          <strong>Special Considerations:</strong>
                          <p className="mt-1">{salary.specialConsiderations}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No salary structures found</p>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
