'use client';

import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
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
import { LayoutDashboard, FileText, Briefcase, Users, Clock, DollarSign, PieChart, ChevronRight, Home } from 'lucide-react';
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

export default function HRLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const orgId = params.orgId as string;
  const { data: session } = useSession();

  const basePath = `/orgs/${orgId}/hr`;

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex items-center gap-2 px-2 py-2">
                <div className="flex-1 block">
                  <div className="font-semibold text-sm truncate">HR Management</div>
                </div>
                <SidebarTrigger className="-ml-1" />
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
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
