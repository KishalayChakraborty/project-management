'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import { useApplicants, useUpdateApplicant } from '@/hooks/hr/useApplicants';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Eye, Plus } from 'lucide-react';
import { CreateApplicantForm } from '@/components/hr/CreateApplicantForm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const statuses = ['NEW', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED', 'WITHDRAWN'];

export default function ApplicantsPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const [selectedApplicant, setSelectedApplicant] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: applicantsData } = useApplicants(orgId);
  const updateMutation = useUpdateApplicant(orgId, selectedApplicant?.id || '');

  const applicants = applicantsData?.data || [];

  const filteredApplicants = useMemo(() => {
    return applicants.filter((app: any) =>
      `${app.firstName} ${app.lastName} ${app.email}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
  }, [applicants, searchTerm]);

  const groupedByStatus = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    statuses.forEach((status) => {
      grouped[status] = filteredApplicants.filter((app: any) => app.status === status);
    });
    return grouped;
  }, [filteredApplicants]);

  const handleStatusChange = async (applicantId: string, newStatus: string) => {
    if (selectedApplicant?.id === applicantId) {
      await updateMutation.mutateAsync({ status: newStatus });
    }
  };

  const handleViewDetail = (applicant: any) => {
    router.push(`/orgs/${orgId}/hr/applicants/${applicant.id}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Applicant Pipeline</h1>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Applicant
        </Button>
      </div>

      <Input
        placeholder="Search applicants..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="max-w-sm"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statuses.map((status) => (
          <div
            key={status}
            className="border rounded-lg p-4 bg-gray-50 min-h-[400px] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">{status}</h3>
              <Badge variant="secondary">{groupedByStatus[status].length}</Badge>
            </div>
            <div className="space-y-3">
              {groupedByStatus[status].map((applicant: any) => (
                <Card
                  key={applicant.id}
                  className="cursor-pointer hover:shadow-md transition"
                  onClick={() => setSelectedApplicant(applicant)}
                >
                  <CardContent className="pt-4 pb-4">
                    <div className="text-sm font-medium">
                      {applicant.firstName} {applicant.lastName}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {applicant.email}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      {applicant.currentTitle || '-'}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetail(applicant);
                        }}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!selectedApplicant} onOpenChange={(open) => !open && setSelectedApplicant(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedApplicant?.firstName} {selectedApplicant?.lastName}
            </DialogTitle>
          </DialogHeader>
          {selectedApplicant && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Email: {selectedApplicant.email}</label>
              </div>
              <select
                defaultValue={selectedApplicant.status}
                onChange={(e) =>
                  handleStatusChange(selectedApplicant.id, e.target.value)
                }
                className="w-full border rounded px-3 py-2 text-sm"
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <Button
                className="w-full"
                onClick={() => handleViewDetail(selectedApplicant)}
              >
                View Full Profile
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Applicant</DialogTitle>
          </DialogHeader>
          <CreateApplicantForm
            orgId={orgId}
            onSuccess={() => {
              setIsCreateOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
