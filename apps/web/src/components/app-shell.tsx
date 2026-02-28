import { Link, Navigate, useRouterState } from "@tanstack/react-router";
import { useHotkey } from "@tanstack/react-hotkeys";
import {
  BookOpenIcon,
  CommandIcon,
  HomeIcon,
  LayoutDashboardIcon,
  LifeBuoyIcon,
  SendIcon,
  WorkflowIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { authClient } from "@/lib/auth-client";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { MethodologyCommandPalette } from "@/features/methodologies/command-palette";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

function toLabel(value: string): string {
  return value.replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

export default function AppShell({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  useHotkey("Mod+K", (event) => {
    event.preventDefault();
    setIsCommandPaletteOpen((open) => !open);
  });

  if (pathname.startsWith("/login")) {
    if (session?.user) {
      return <Navigate to="/methodologies" />;
    }
    return <>{children}</>;
  }

  if (isPending) {
    return (
      <main className="grid min-h-svh place-items-center bg-[#07090b] text-sm">
        Loading session...
      </main>
    );
  }

  if (!session?.user) {
    return <Navigate to="/login" />;
  }

  const pathParts = pathname.split("/").filter(Boolean);
  const methodologyId = pathParts[0] === "methodologies" ? pathParts[1] : undefined;
  const versionId =
    pathParts[0] === "methodologies" && pathParts[2] === "versions" ? pathParts[3] : undefined;

  const breadcrumbSegments =
    pathParts.length === 0
      ? [{ label: "Home", href: "/" }]
      : pathParts.map((segment, index) => {
          const href = `/${pathParts.slice(0, index + 1).join("/")}`;
          return {
            label: toLabel(segment),
            href,
          };
        });

  const navMainItems = [
    {
      title: "Home",
      url: "/",
      icon: <HomeIcon className="size-4" />,
      isActive: pathname === "/",
    },
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <LayoutDashboardIcon className="size-4" />,
      isActive: pathname.startsWith("/dashboard"),
    },
    {
      title: "Methodologies",
      url: "/methodologies",
      icon: <WorkflowIcon className="size-4" />,
      isActive: pathname.startsWith("/methodologies"),
      items: methodologyId
        ? [
            {
              title: "Details",
              url: `/methodologies/${methodologyId}`,
            },
            {
              title: "Versions",
              url: `/methodologies/${methodologyId}/versions`,
            },
            ...(versionId
              ? [
                  {
                    title: "Workspace Entry",
                    url: `/methodologies/${methodologyId}/versions/${versionId}`,
                  },
                ]
              : []),
          ]
        : [],
    },
  ];

  const projectItems = [
    {
      name: "Methodologies",
      url: "/methodologies",
      icon: <WorkflowIcon className="size-4" />,
    },
    {
      name: "Dashboard",
      url: "/dashboard",
      icon: <BookOpenIcon className="size-4" />,
    },
  ];

  return (
    <SidebarProvider defaultOpen className="min-h-svh w-full bg-[#07090b]">
      <AppSidebar
        title="Operator Workspace"
        subtitle="Methodology Console"
        navMainItems={navMainItems}
        projectItems={projectItems}
        onOpenCommands={() => setIsCommandPaletteOpen(true)}
        navSecondaryItems={[
          {
            title: "Support",
            url: "/dashboard",
            icon: <LifeBuoyIcon className="size-4" />,
          },
          {
            title: "Feedback",
            url: "/",
            icon: <SendIcon className="size-4" />,
          },
        ]}
        className="border-r border-border/80"
      />

      <SidebarInset className="min-w-0 bg-[#07090b]">
        <header className="border-b border-border/80 px-3 py-3 md:px-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="rounded-none" />
              <Separator orientation="vertical" className="mr-1 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  {breadcrumbSegments.map((segment, index) => {
                    const isLast = index === breadcrumbSegments.length - 1;
                    return (
                      <BreadcrumbItem key={`${segment.href}-${index}`}>
                        {isLast ? (
                          <BreadcrumbPage>{segment.label}</BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink render={<Link to={segment.href}>{segment.label}</Link>} />
                        )}
                        {!isLast ? <BreadcrumbSeparator /> : null}
                      </BreadcrumbItem>
                    );
                  })}
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-none uppercase tracking-[0.12em]"
                onClick={() => setIsCommandPaletteOpen(true)}
              >
                <CommandIcon className="size-3.5" />
                Commands
                <span className="text-[0.62rem] text-muted-foreground">Ctrl/Cmd+K</span>
              </Button>
              <ModeToggle />
            </div>
          </div>
        </header>

        <div className="space-y-4 p-3 md:p-4">{children}</div>
      </SidebarInset>

      <MethodologyCommandPalette
        open={isCommandPaletteOpen}
        onOpenChange={setIsCommandPaletteOpen}
        selectedMethodologyKey={methodologyId ?? null}
      />
    </SidebarProvider>
  );
}
