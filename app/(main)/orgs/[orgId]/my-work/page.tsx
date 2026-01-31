'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useOrganization, useOrganizationProjects, useUserRole } from '@/hooks/organization';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function MyWorkPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;

  const { data: org, isLoading: orgLoading } = useOrganization(orgId);
  const { data: userRole, isLoading: roleLoading } = useUserRole(orgId);
  const { data: projects, isLoading: projectsLoading } = useOrganizationProjects(orgId);

  useEffect(() => {
    if (roleLoading || !userRole) return;
    if (userRole !== 'MEMBER') {
      router.replace(`/orgs/${orgId}/overview`);
    }
  }, [userRole, roleLoading, orgId, router]);

  if (orgLoading || roleLoading) {
    return (
      <div className="container mx-auto py-8">
        <div>Loading...</div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="container mx-auto py-8">
        <div>Organization not found</div>
      </div>
    );
  }

  if (userRole !== 'MEMBER') {
    return (
      <div className="container mx-auto py-8">
        <div>Redirecting...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">My Work</h1>
        <p className="text-muted-foreground">{org.name}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Projects</CardTitle>
          <CardDescription>Projects you are assigned to via a team or direct link</CardDescription>
        </CardHeader>
        <CardContent>
          {projectsLoading ? (
            <div>Loading projects...</div>
          ) : projects && projects.length > 0 ? (
            <div className="space-y-2">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-4 border rounded cursor-pointer hover:bg-accent transition-colors"
                  onClick={() =>
                    router.push(`/orgs/${orgId}/my-work/${project.id}/dashboard`)
                  }
                >
                  <div>
                    <p className="font-medium">{project.name}</p>
                    <p className="text-sm text-muted-foreground">{project.code}</p>
                    {project.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
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
            <p className="text-muted-foreground">No projects assigned to you yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
