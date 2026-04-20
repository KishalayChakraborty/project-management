'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  useOrganization,
  useOrganizationTeams,
  useUserRole,
} from '@/hooks/organization';
import { useDebounce } from '@/hooks/useDebounce';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { CreateTeamDialog } from '@/components/teams/CreateTeamDialog';
import { Search, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';

export default function TeamsPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;

  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<'asc' | 'desc'>('desc');
  const [isCreateTeamDialogOpen, setIsCreateTeamDialogOpen] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 400);

  const { data: org, isLoading: orgLoading } = useOrganization(orgId);
  const { data: userRole, isLoading: roleLoading } = useUserRole(orgId);
  const { data: teamsData, isLoading: teamsLoading } = useOrganizationTeams(
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

  const teams = teamsData?.teams || [];
  const pagination = teamsData?.pagination;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Teams</h1>
        <p className="text-muted-foreground">{org.name}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Teams</CardTitle>
            <Button onClick={() => setIsCreateTeamDialogOpen(true)}>
              Create Team
            </Button>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search teams..."
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
          {teamsLoading ? (
            <Loading text="Loading teams..." />
          ) : teams.length > 0 ? (
            <div className="space-y-2">
              {teams.map((team: any) => (
                <div
                  key={team.id}
                  className="flex items-center justify-between p-4 border rounded cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => router.push(`/orgs/${orgId}/teams/${team.id}`)}
                >
                  <div>
                    <p className="font-medium">{team.name}</p>
                    {team.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {team.description}
                      </p>
                    )}
                    <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                      <span>Members: {team._count.members}</span>
                      <span>Projects: {team._count.projectLinks}</span>
                    </div>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>Created by {team.creator.name || team.creator.email}</p>
                    <p>{new Date(team.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              {debouncedSearch ? 'No teams match your search' : 'No teams yet'}
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

      <CreateTeamDialog
        orgId={orgId}
        open={isCreateTeamDialogOpen}
        onOpenChange={setIsCreateTeamDialogOpen}
      />
    </div>
  );
}
