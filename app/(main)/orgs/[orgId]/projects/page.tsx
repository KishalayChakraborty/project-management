'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  useOrganization,
  useOrganizationProjects,
  useUserRole,
} from '@/hooks/organization';
import { useDebounce } from '@/hooks/useDebounce';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog';
import { Search, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ProjectsPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;

  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<'asc' | 'desc'>('desc');
  const [isCreateProjectDialogOpen, setIsCreateProjectDialogOpen] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 400);

  const { data: org, isLoading: orgLoading } = useOrganization(orgId);
  const { data: userRole, isLoading: roleLoading } = useUserRole(orgId);
  const { data: projectsData, isLoading: projectsLoading } = useOrganizationProjects(
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

  const projects = projectsData?.projects || [];
  const pagination = projectsData?.pagination;

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
          <div className="flex items-center gap-2 pt-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, code, or description..."
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
          {projectsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading projects...</div>
          ) : projects.length > 0 ? (
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
            <p className="text-center py-8 text-muted-foreground">
              {debouncedSearch ? 'No projects match your search' : 'No projects yet'}
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

      <CreateProjectDialog
        orgId={orgId}
        open={isCreateProjectDialogOpen}
        onOpenChange={setIsCreateProjectDialogOpen}
      />
    </div>
  );
}
