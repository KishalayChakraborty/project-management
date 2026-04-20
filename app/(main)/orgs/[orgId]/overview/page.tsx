'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  useOrganization,
  useUserRole,
} from '@/hooks/organization';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function OverviewPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;

  const { data: org, isLoading: orgLoading } = useOrganization(orgId);
  const { data: userRole, isLoading: roleLoading } = useUserRole(orgId);

  useEffect(() => {
    if (!roleLoading && userRole) {
      if (userRole === 'MEMBER') {
        router.replace(`/orgs/${orgId}/my-work`);
      }
    }
  }, [userRole, roleLoading, orgId, router]);

  if (orgLoading || roleLoading) {
    return <div>Loading...</div>;
  }

  if (!org) {
    return <div>Organization not found</div>;
  }

  if (userRole === 'MEMBER') {
    return <div>Redirecting...</div>;
  }

  if (userRole !== 'ADMIN' && userRole !== 'MAINTAINER') {
    return <div>Access denied. Insufficient permissions.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{org.name}</h1>
        {org.legalName && (
          <p className="text-muted-foreground">{org.legalName}</p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Members</CardDescription>
            <CardTitle className="text-2xl">
              {org._count?.members || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Teams</CardDescription>
            <CardTitle className="text-2xl">
              {org._count?.teams || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Projects</CardDescription>
            <CardTitle className="text-2xl">
              {org._count?.projects || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Status</CardDescription>
            <CardTitle className="text-2xl">{org.status}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {org.country && <p><strong>Country:</strong> {org.country}</p>}
          {org.address && <p><strong>Address:</strong> {org.address}</p>}
          {org.contactEmail && (
            <p><strong>Contact Email:</strong> {org.contactEmail}</p>
          )}
          {org.contactPhone && (
            <p><strong>Contact Phone:</strong> {org.contactPhone}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
