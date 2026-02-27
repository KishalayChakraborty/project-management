'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
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
} from '@/components/ui/sidebar';
import { LayoutDashboard, Building2, ListTodo } from 'lucide-react';

const homeNavItems = [
  { title: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { title: 'Organizations', icon: Building2, href: '/organizations' },
  { title: 'Pending Tasks', icon: ListTodo, href: '/pending-tasks' },
];

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const isOrgRoute = pathname?.includes('/orgs/');
  const isHomeSidebarRoute =
    pathname === '/dashboard' ||
    pathname === '/organizations' ||
    pathname === '/pending-tasks';

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (status === 'unauthenticated') {
    router.push('/signin');
    return null;
  }

  // Org-level routes have their own sidebars
  if (isOrgRoute) {
    return (
      <div className="min-h-screen">
        <main>{children}</main>
      </div>
    );
  }

  // Home-level routes get the home sidebar
  if (isHomeSidebarRoute) {
    return (
      <SidebarProvider>
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <div className="flex items-center gap-2 px-2 py-2">
                  <Link href="/dashboard" className="flex-1 block">
                    <div className="font-semibold text-sm truncate">Project Management</div>
                  </Link>
                  <SidebarTrigger className="-ml-1" />
                </div>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {homeNavItems.map((item) => {
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
            <div className="flex items-center gap-4 flex-1">
              <Link href="/dashboard" className="text-sm font-medium hover:underline">
                Home
              </Link>
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

  // Fallback: routes without sidebar (e.g., the root `/` before redirect)
  return (
    <div className="min-h-screen">
      <nav className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-xl font-bold">
              Project Management
            </Link>
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
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}
