'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  useOrganization,
  useOrganizationMembers,
  useUserRole,
} from '@/hooks/organization';
import { useDebounce } from '@/hooks/useDebounce';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { InviteMemberDialog } from '@/components/organization/InviteMemberDialog';
import { Search, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Loading } from '@/components/ui/loading';

export default function MembersPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;

  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<'asc' | 'desc'>('desc');
  const [isInviteMemberDialogOpen, setIsInviteMemberDialogOpen] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 400);

  const { data: org, isLoading: orgLoading } = useOrganization(orgId);
  const { data: userRole, isLoading: roleLoading } = useUserRole(orgId);
  const { data: membersData, isLoading: membersLoading } = useOrganizationMembers(
    orgId,
    page,
    debouncedSearch,
    sort,
    20
  );

  // Reset to page 1 when search or sort changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, sort]);

  useEffect(() => {
    if (!roleLoading && userRole) {
      if (userRole === 'MEMBER') {
        router.replace(`/orgs/${orgId}/my-work`);
      }
    }
  }, [userRole, roleLoading, orgId, router]);

  if (orgLoading || roleLoading) {
    return <Loading fullPage />;
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

  const pagination = membersData?.pagination;

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
          <div className="flex items-center gap-2 pt-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSort(sort === 'desc' ? 'asc' : 'desc')}
              className="flex items-center gap-1 shrink-0"
            >
              <ArrowUpDown className="h-4 w-4" />
              {sort === 'desc' ? 'Newest first' : 'Oldest first'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {membersLoading ? (
            <Loading text="Loading members..." />
          ) : membersData && membersData.members.length > 0 ? (
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
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              {debouncedSearch ? 'No members match your search' : 'No members yet'}
            </p>
          )}
        </CardContent>
        {pagination && pagination.totalPages > 1 && (
          <CardFooter className="flex items-center justify-between border-t px-6 py-4">
            {pagination.hasPrev ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
            ) : (
              <div />
            )}
            <span className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </span>
            {pagination.hasNext ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                className="flex items-center gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <div />
            )}
          </CardFooter>
        )}
      </Card>

      <InviteMemberDialog
        orgId={orgId}
        open={isInviteMemberDialogOpen}
        onOpenChange={setIsInviteMemberDialogOpen}
      />
    </div>
  );
}
