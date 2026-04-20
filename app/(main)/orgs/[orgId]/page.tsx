'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUserRole } from '@/hooks/organization';
import { Loading } from '@/components/ui/loading';

export default function OrgIndexPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const { data: userRole, isLoading } = useUserRole(orgId);

  useEffect(() => {
    if (!isLoading && userRole) {
      if (userRole === 'MEMBER') {
        router.replace(`/orgs/${orgId}/my-work`);
      } else {
        router.replace(`/orgs/${orgId}/overview`);
      }
    }
  }, [userRole, isLoading, orgId, router]);

  return <Loading fullPage />;
}
