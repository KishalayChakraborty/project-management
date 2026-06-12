'use client';

import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { useOrganization } from '@/hooks/organization';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { LayoutDashboard, FileText, Briefcase, Users, Clock, DollarSign, PieChart, ChevronRight, Home, Building2, ListTodo, ClipboardList } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const hrNavItems = [
  { title: 'Dashboard', icon: LayoutDashboard, segment: 'dashboard' },
  { title: 'Job Profiles', icon: FileText, segment: 'job-profiles' },
  { title: 'Job Ads', icon: Briefcase, segment: 'job-ads' },
  { title: 'Applicants', icon: Users, segment: 'applicants' },
  { title: 'Interviews', icon: Clock, segment: 'interviews' },
  { title: 'Salary & Offers', icon: DollarSign, segment: 'salary' },
  { title: 'Budget', icon: PieChart, segment: 'budget' },
  { title: 'Analytics', icon: PieChart, segment: 'analytics' },
];

const globalNavItems = [
  { title: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { title: 'Organizations', icon: Building2, href: '/organizations' },
  { title: 'My Tasks', icon: ClipboardList, href: '/my-tasks' },
  { title: 'All Tasks', icon: ListTodo, href: '/all-tasks' },
  { title: 'My Work Logs', icon: Clock, href: '/my-worklog' },
  { title: 'All Work Logs', icon: Clock, href: '/all-worklog' },
];

export default function HRLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const orgId = params.orgId as string;
  const { data: session } = useSession();
  const { data: organization, isLoading: orgLoading } = useOrganization(orgId);

  const basePath = `/orgs/${orgId}/hr`;

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex items-center gap-2 px-2 py-2">
                <Link href={basePath} className="flex-1 block">
                  <div className="font-semibold text-sm truncate">HR Module</div>
                </Link>
                <SidebarTrigger className="-ml-1" />
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
          {organization && (
            <div className="px-2 py-2 border-t">
              <div className="text-xs text-muted-foreground mb-2">Selected Organization</div>
              <Link
                href={`/orgs/${orgId}/overview`}
                className="text-sm font-medium text-foreground hover:text-primary hover:underline truncate block"
              >
                {organization.name}
              </Link>
            </div>
          )}
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>HR Management</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {hrNavItems.map((item) => {
                  const Icon = item.icon;
                  const href = `${basePath}/${item.segment}`;
                  const isActive = pathname === href || pathname?.startsWith(href + '/');
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
          <Separator className="my-2" />
          <SidebarGroup>
            <SidebarGroupLabel>Global Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {globalNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link href={item.href}>
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
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
              <Home className="h-4 w-4" />
            </Link>
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
            <Link
              href={`/orgs/${orgId}/overview`}
              className="text-sm text-muted-foreground hover:underline"
            >
              Organization
            </Link>
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm text-foreground font-medium">HR Management</span>
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
        <div className="flex-1 overflow-auto">
          <div className="flex flex-col gap-4 p-4">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
