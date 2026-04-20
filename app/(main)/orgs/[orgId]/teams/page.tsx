'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  useOrganization,
  useOrganizationTeams,
  useUserRole,
} from '@/hooks/organization';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreateTeamDialog } from '@/components/teams/CreateTeamDialog';

export default function TeamsPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const [isCreateTeamDialogOpen, setIsCreateTeamDialogOpen] = useState(false);

  const { data: org, isLoading: orgLoading } = useOrganization(orgId);
  const { data: userRole, isLoading: roleLoading } = useUserRole(orgId);
  const { data: teams, isLoading: teamsLoading } = useOrganizationTeams(orgId);

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
        </CardHeader>
        <CardContent>
          {teamsLoading ? (
            <div>Loading teams...</div>
          ) : teams && teams.length > 0 ? (
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
            <p className="text-muted-foreground">No teams yet</p>
          )}
        </CardContent>
      </Card>

      <CreateTeamDialog
        orgId={orgId}
        open={isCreateTeamDialogOpen}
        onOpenChange={setIsCreateTeamDialogOpen}
      />
    </div>
  );
}
