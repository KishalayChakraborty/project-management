'use client';

import { useCreateApplicant } from '@/hooks/hr/useApplicants';
import { ApplicationForm } from './ApplicationForm';

interface CreateApplicantFormProps {
  orgId: string;
  onSuccess?: () => void;
}

export function CreateApplicantForm({ orgId, onSuccess }: CreateApplicantFormProps) {
  const createMutation = useCreateApplicant(orgId);

  const handleSubmit = async (data: any) => {
    const { cvFile, ...formData } = data;

    const submitData = {
      ...formData,
      source: 'HR_ADDED',
    };

    try {
      await createMutation.mutateAsync(submitData);
      onSuccess?.();
    } catch (error) {
      throw error;
    }
  };

  return (
    <ApplicationForm
      isHRForm
      onSuccess={onSuccess}
      submitUrl={`/api/orgs/${orgId}/hr/applicants`}
    />
  );
}
