'use client';

import { useState } from 'react';
import { useDashboardStats } from '@/hooks/dashboard/useDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreateOrganizationDialog } from '@/components/organization/CreateOrganizationDialog';
import Link from 'next/link';
import { Building2, ListTodo, Users, FolderKanban, Plus } from 'lucide-react';
import { Loading } from '@/components/ui/loading';

function getOrgRoute(orgId: string, userRole: string) {
  if (userRole === 'ADMIN' || userRole === 'MAINTAINER') {
    return `/orgs/${orgId}/overview`;
  }
  return `/orgs/${orgId}/my-work`;
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useDashboardStats();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  if (isLoading) {
    return <Loading fullPage text="Loading dashboard..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your organizations and tasks
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Organization
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Organizations
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalOrganizations ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Pending Tasks
            </CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalPendingTasks ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-Organization Breakdown */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Organizations Overview</h2>
        {stats?.organizations && stats.organizations.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stats.organizations.map((org) => (
              <Card key={org.orgId} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{org.orgName}</CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {org.userRole}
                    </Badge>
                  </div>
                  <CardDescription>
                    {org.orgStatus}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{org.memberCount} Members</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FolderKanban className="h-4 w-4" />
                      <span>{org.projectCount} Projects</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <ListTodo className="h-4 w-4" />
                      <span className="font-medium">
                        {org.pendingTaskCount} Pending Tasks
                      </span>
                    </div>
                    <Button asChild className="w-full mt-2" size="sm">
                      <Link href={getOrgRoute(org.orgId, org.userRole)}>
                        View Organization
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>No organizations yet</CardTitle>
              <CardDescription>
                Create your first organization to get started
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                Create Organization
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <CreateOrganizationDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}
