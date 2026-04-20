'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  useOrganization,
  useOrganizationProjects,
  useUserRole,
} from '@/hooks/organization';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog';

export default function ProjectsPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const [isCreateProjectDialogOpen, setIsCreateProjectDialogOpen] = useState(false);

  const { data: org, isLoading: orgLoading } = useOrganization(orgId);
  const { data: userRole, isLoading: roleLoading } = useUserRole(orgId);
  const { data: projects, isLoading: projectsLoading } = useOrganizationProjects(orgId);

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
        <h1 className="text-3xl font-bold">Projects</h1>
        <p className="text-muted-foreground">{org.name}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Projects</CardTitle>
            <Button onClick={() => setIsCreateProjectDialogOpen(true)}>
              Create Project
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {projectsLoading ? (
            <div>Loading projects...</div>
          ) : projects && projects.length > 0 ? (
            <div className="space-y-2">
              {projects.map((project: any) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-4 border rounded cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => router.push(`/orgs/${orgId}/projects/${project.id}/dashboard`)}
                >
                  <div>
                    <p className="font-medium">{project.name}</p>
                    <p className="text-sm text-muted-foreground">{project.code}</p>
                    {project.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {project.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-sm">{project.status}</span>
                    <p className="text-xs text-muted-foreground mt-1">
                      Created {new Date(project.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No projects yet</p>
          )}
        </CardContent>
      </Card>

      <CreateProjectDialog
        orgId={orgId}
        open={isCreateProjectDialogOpen}
        onOpenChange={setIsCreateProjectDialogOpen}
      />
    </div>
  );
}
