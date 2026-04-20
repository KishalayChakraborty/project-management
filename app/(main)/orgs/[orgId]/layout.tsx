'use client';

import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useOrganization } from '@/hooks/organization';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { LayoutDashboard, Users, Layers, FolderKanban, ChevronRight } from 'lucide-react';

const orgNavItems = [
  { title: 'Overview', icon: LayoutDashboard, segment: 'overview' },
  { title: 'Members', icon: Users, segment: 'members' },
  { title: 'Teams', icon: Layers, segment: 'teams' },
  { title: 'Projects', icon: FolderKanban, segment: 'projects' },
];

function OrgSidebarHeader({ org }: { org: any }) {
  const { state } = useSidebar();

  if (state === 'collapsed') {
    return null;
  }

  return (
    <div className="flex-1 block">
      <div className="font-semibold text-sm truncate">{org?.name || 'Organization'}</div>
      {org?.legalName && (
        <div className="text-xs text-muted-foreground truncate">{org.legalName}</div>
      )}
    </div>
  );
}

export default function OrgLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const orgId = params.orgId as string;
  const { data: session } = useSession();
  const { data: org } = useOrganization(orgId);

  // Routes that have their own layout/sidebar — pass through without wrapping
  const isProjectDetailRoute = /\/projects\/[^/]+/.test(pathname || '');
  const isMyWorkRoute = pathname?.includes('/my-work');

  if (isProjectDetailRoute || isMyWorkRoute) {
    return <>{children}</>;
  }

  const basePath = `/orgs/${orgId}`;

  // Build dynamic breadcrumbs based on current path
  const breadcrumbs: { label: string; href: string }[] = [
    { label: 'Home', href: '/dashboard' },
  ];

  breadcrumbs.push({
    label: org?.name || 'Organization',
    href: `${basePath}/overview`,
  });

  // If on a deeper page (e.g. teams/[teamId]), add the section breadcrumb
  const pathAfterOrg = pathname?.split(`/orgs/${orgId}/`)[1] || '';
  const pathSegments = pathAfterOrg.split('/').filter(Boolean);

  if (pathSegments.length > 1) {
    const section = pathSegments[0];
    const sectionTitle = section.charAt(0).toUpperCase() + section.slice(1);
    breadcrumbs.push({
      label: sectionTitle,
      href: `${basePath}/${section}`,
    });
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex items-center gap-2 px-2 py-2">
                <OrgSidebarHeader org={org} />
                <SidebarTrigger className="-ml-1" />
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {orgNavItems.map((item) => {
                  const Icon = item.icon;
                  const href = `${basePath}/${item.segment}`;
                  const isActive =
                    pathname === href ||
                    (pathname?.startsWith(href + '/') ?? false);
                  return (
                    <SidebarMenuItem key={item.segment}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link href={href}>
                          <Icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <div className="flex items-center gap-2 flex-1">
            {breadcrumbs.map((crumb, index) => (
              <span key={crumb.href} className="flex items-center gap-2">
                {index > 0 && (
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                )}
                <Link
                  href={crumb.href}
                  className="text-sm hover:underline text-muted-foreground"
                >
                  {crumb.label}
                </Link>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {session?.user?.email}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => signOut({ callbackUrl: '/signin' })}
            >
              Sign Out
            </Button>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
