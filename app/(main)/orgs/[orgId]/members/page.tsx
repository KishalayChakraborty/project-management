'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  useOrganization,
  useOrganizationMembers,
  useUserRole,
} from '@/hooks/organization';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { InviteMemberDialog } from '@/components/organization/InviteMemberDialog';

export default function MembersPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const [membersPage, setMembersPage] = useState(1);
  const [isInviteMemberDialogOpen, setIsInviteMemberDialogOpen] = useState(false);

  const { data: org, isLoading: orgLoading } = useOrganization(orgId);
  const { data: userRole, isLoading: roleLoading } = useUserRole(orgId);
  const { data: membersData, isLoading: membersLoading } = useOrganizationMembers(orgId, membersPage);

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
        <h1 className="text-3xl font-bold">Members</h1>
        <p className="text-muted-foreground">{org.name}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Members</CardTitle>
            <Button onClick={() => setIsInviteMemberDialogOpen(true)}>
              Invite Member
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {membersLoading ? (
            <div>Loading members...</div>
          ) : membersData && membersData.members.length > 0 ? (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {membersData.members.map((member: any) => (
                    <TableRow key={member.user.id}>
                      <TableCell className="font-medium">
                        {member.user.name || 'N/A'}
                      </TableCell>
                      <TableCell>{member.user.email}</TableCell>
                      <TableCell>{member.role}</TableCell>
                      <TableCell>
                        {new Date(member.joinedAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {membersData.pagination && membersData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Page {membersData.pagination.page} of {membersData.pagination.totalPages}{' '}
                    ({membersData.pagination.total} total)
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMembersPage((p) => Math.max(1, p - 1))}
                      disabled={!membersData.pagination.hasPrev}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMembersPage((p) => p + 1)}
                      disabled={!membersData.pagination.hasNext}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">No members yet</p>
          )}
        </CardContent>
      </Card>

      <InviteMemberDialog
        orgId={orgId}
        open={isInviteMemberDialogOpen}
        onOpenChange={setIsInviteMemberDialogOpen}
      />
    </div>
  );
}
