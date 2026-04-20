"use client";

import { useState, useEffect } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useProject } from "@/hooks/projects";
import {
  useOrganization,
  useOrganizations,
  useOrganizationProjects,
  useUserRole,
} from "@/hooks/organization";
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
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  LayoutDashboard,
  CheckSquare,
  Clock,
  FileText,
  Settings,
  Users,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Check,
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

function ProjectHeader({
  orgId,
  project,
}: {
  orgId: string;
  project: { name: string; code: string };
}) {
  const { state } = useSidebar();

  if (state === "collapsed") {
    return null;
  }

  return (
    <Link href={`/orgs/${orgId}/overview`} className="flex-1 block">
      <div className="font-semibold text-sm truncate">{project.name}</div>
      <div className="text-xs text-muted-foreground truncate">
        {project.code}
      </div>
    </Link>
  );
}

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const orgId = params.orgId as string;
  const projectId = params.projectId as string;

  const [orgPopoverOpen, setOrgPopoverOpen] = useState(false);
  const [projectPopoverOpen, setProjectPopoverOpen] = useState(false);

  const { data: project, isLoading: projectLoading } = useProject(
    orgId,
    projectId,
  );
  const { data: userRole, isLoading: roleLoading } = useUserRole(orgId);
  const { data: org } = useOrganization(orgId);
  const { data: orgs } = useOrganizations();
  const { data: projectsData } = useOrganizationProjects(orgId);

  useEffect(() => {
    if (roleLoading || userRole === undefined) return;
    if (userRole === "MEMBER") {
      router.replace(`/orgs/${orgId}/my-work`);
    }
  }, [userRole, roleLoading, orgId, router]);

  const basePath = `/orgs/${orgId}/projects/${projectId}`;
  const isAdminOrMaintainer = userRole === "ADMIN" || userRole === "MAINTAINER";

  const navItems = [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      href: `${basePath}/dashboard`,
    },
    {
      title: "Tasks",
      icon: CheckSquare,
      href: `${basePath}/tasks`,
    },
    {
      title: "Work Logs",
      icon: Clock,
      href: `${basePath}/work-logs`,
    },
    // {
    //   title: 'Audit',
    //   icon: FileText,
    //   href: `${basePath}/audit`,
    // },
    ...(isAdminOrMaintainer
      ? [
          {
            title: "Teams",
            icon: Users,
            href: `${basePath}/teams`,
          },
          {
            title: "Settings",
            icon: Settings,
            href: `${basePath}/settings`,
          },
        ]
      : []),
  ];

  const { data: session } = useSession();

  if (!roleLoading && userRole === "MEMBER") {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-muted-foreground">Redirecting...</div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex items-center gap-2 px-2 py-2">
                {projectLoading ? (
                  <div className="flex-1">
                    <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                    <div className="h-3 w-16 bg-muted animate-pulse rounded mt-1" />
                  </div>
                ) : project ? (
                  <ProjectHeader orgId={orgId} project={project} />
                ) : null}
                <SidebarTrigger className="-ml-1" />
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => {
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
            {/* Back button */}
            <button
              onClick={() => router.back()}
              className="flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent transition-colors text-muted-foreground mr-1"
              title="Go back"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            {/* Home link */}
            <Link
              href="/dashboard"
              className="text-sm hover:underline text-muted-foreground"
            >
              Home
            </Link>

            {/* Organization dropdown */}
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
            <Popover open={orgPopoverOpen} onOpenChange={setOrgPopoverOpen}>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md px-1.5 py-1 hover:bg-accent">
                  <span className="truncate max-w-[140px]">
                    {org?.name || "Organization"}
                  </span>
                  <ChevronDown className="h-3 w-3 shrink-0" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-0" align="start">
                <div className="px-3 py-2 border-b">
                  <p className="text-xs font-medium text-muted-foreground">
                    Switch Organization
                  </p>
                </div>
                <ScrollArea className="h-[200px]">
                  <div className="p-1">
                    {orgs?.map((o: any) => (
                      <button
                        key={o.id}
                        className={cn(
                          "flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors text-left",
                          o.id === orgId && "bg-accent",
                        )}
                        onClick={() => {
                          setOrgPopoverOpen(false);
                          router.push(`/orgs/${o.id}/overview`);
                        }}
                      >
                        <span className="truncate flex-1">{o.name}</span>
                        {o.id === orgId && (
                          <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                        )}
                      </button>
                    ))}
                    {(!orgs || orgs.length === 0) && (
                      <p className="text-xs text-muted-foreground px-2 py-4 text-center">
                        No organizations found
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>

            {/* Project dropdown */}
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
            <Popover
              open={projectPopoverOpen}
              onOpenChange={setProjectPopoverOpen}
            >
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md px-1.5 py-1 hover:bg-accent">
                  <span className="truncate max-w-[140px]">
                    {project?.name || "Project"}
                  </span>
                  <ChevronDown className="h-3 w-3 shrink-0" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-0" align="start">
                <div className="px-3 py-2 border-b">
                  <p className="text-xs font-medium text-muted-foreground">
                    Switch Project
                  </p>
                </div>
                <ScrollArea className="h-[200px]">
                  <div className="p-1">
                    {projectsData?.projects?.map((p: any) => (
                      <button
                        key={p.id}
                        className={cn(
                          "flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors text-left",
                          p.id === projectId && "bg-accent",
                        )}
                        onClick={() => {
                          setProjectPopoverOpen(false);
                          router.push(
                            `/orgs/${orgId}/projects/${p.id}/dashboard`,
                          );
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <span className="truncate block">{p.name}</span>
                          <span className="text-xs text-muted-foreground truncate block">
                            {p.code}
                          </span>
                        </div>
                        {p.id === projectId && (
                          <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                        )}
                      </button>
                    ))}
                    {(!projectsData?.projects || projectsData.projects.length === 0) && (
                      <p className="text-xs text-muted-foreground px-2 py-4 text-center">
                        No projects found
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {session?.user?.email}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/signin" })}
            >
              Sign Out
            </Button>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
