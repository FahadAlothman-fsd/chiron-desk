import { Link, Navigate, useRouterState } from "@tanstack/react-router";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useQuery } from "@tanstack/react-query";
import { Fragment, useState, type ReactNode } from "react";

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
import { formatMethodologyVersionLabel } from "@/features/methodologies/version-label";
import { buildSidebarSections } from "./sidebar-sections";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { orpc } from "@/utils/orpc";
import { resolvePublicAsset } from "@/lib/public-asset";

const CHIRON_BRAND_ICON = resolvePublicAsset("visuals/chiron-brand/asset-41.svg");

function toLabel(value: string): string {
  return value.replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function readProjectionVersion(
  value: unknown,
  versionId: string,
): { id: string; displayName: string; version: string; status: string } | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  return {
    id: versionId,
    displayName: typeof record.displayName === "string" ? record.displayName : versionId,
    version: typeof record.version === "string" ? record.version : versionId,
    status: typeof record.status === "string" ? record.status : "draft",
  };
}

export default function AppShell({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const pathParts = pathname.split("/").filter(Boolean);
  const methodologyId = pathParts[0] === "methodologies" ? pathParts[1] : undefined;
  const projectId =
    pathParts[0] === "projects" && pathParts[1] && pathParts[1] !== "new" ? pathParts[1] : null;
  const projectsQuery = useQuery({
    ...orpc.project.listProjects.queryOptions(),
    enabled: Boolean(session?.user),
  });
  const projects = projectsQuery.data ?? [];
  const currentProject = projectId ? projects.find((project) => project.id === projectId) : null;
  const methodologiesQuery = useQuery({
    ...orpc.methodology.listMethodologies.queryOptions(),
    enabled: Boolean(session?.user),
  });
  const methodologies = methodologiesQuery.data ?? [];
  const currentMethodology = methodologyId
    ? methodologies.find((item) => item.methodologyKey === methodologyId)
    : null;
  const versionId =
    pathParts[0] === "methodologies" && pathParts[2] === "versions" ? pathParts[3] : null;
  const methodologyDetailsQuery = useQuery({
    ...orpc.methodology.getMethodologyDetails.queryOptions({
      input: { methodologyKey: methodologyId ?? "" },
    }),
    enabled: Boolean(session?.user && methodologyId),
  });
  const methodologyVersionProjectionQuery = useQuery({
    ...orpc.methodology.version.workspace.get.queryOptions({
      input: { versionId: versionId ?? "" },
    }),
    enabled: Boolean(session?.user && methodologyId && versionId),
  });
  const methodologyVersions = methodologyDetailsQuery.data?.versions ?? [];
  const currentVersionFromDetails = versionId
    ? methodologyVersions.find((version) => version.id === versionId)
    : null;
  const currentVersionFromProjection = versionId
    ? readProjectionVersion(methodologyVersionProjectionQuery.data, versionId)
    : null;
  const currentVersion = currentVersionFromProjection ?? currentVersionFromDetails;
  const currentVersionLooksDraft =
    Boolean(versionId && versionId.toLowerCase().includes("draft")) ||
    currentVersion?.status === "draft";
  const currentVersionLabel = currentVersion
    ? formatMethodologyVersionLabel({
        ...currentVersion,
        status: currentVersionLooksDraft ? "draft" : currentVersion.status,
      })
    : null;
  const methodologyVersionOptions = [
    ...(currentVersion && !methodologyVersions.some((version) => version.id === currentVersion.id)
      ? [
          {
            id: currentVersion.id,
            displayName:
              currentVersionLabel ??
              currentVersion.displayName ??
              currentVersion.version ??
              currentVersion.id,
          },
        ]
      : []),
    ...methodologyVersions.map((version) => ({
      id: version.id,
      displayName:
        version.id === currentVersion?.id
          ? (currentVersionLabel ??
            currentVersion.displayName ??
            currentVersion.version ??
            version.displayName)
          : (formatMethodologyVersionLabel(version) ?? version.displayName),
    })),
  ];
  const showMethodologyVersionSelector = Boolean(
    methodologyId && methodologyVersionOptions.length > 0,
  );
  const sidebarScope: "system" | "project" | "methodology" = projectId
    ? "project"
    : methodologyId
      ? "methodology"
      : "system";

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

  const navSections = buildSidebarSections(pathname, sidebarScope, {
    projectId,
    methodologyId: methodologyId ?? null,
    methodologyVersionId: versionId ?? null,
    methodologyVersionLabel: versionId !== null ? currentVersionLabel : null,
  });

  return (
    <SidebarProvider
      defaultOpen
      className="chiron-texture-canvas min-h-svh w-full [&>*]:relative [&>*]:z-10"
    >
      <AppSidebar
        title="Operator Workspace"
        subtitle="Methodology Console"
        scope={sidebarScope}
        sections={navSections}
        projectSwitcher={{
          currentProjectId: projectId,
          currentProjectName: currentProject?.displayName ?? null,
          projects,
        }}
        methodologySwitcher={{
          currentMethodologyId: methodologyId ?? null,
          currentMethodologyName: currentMethodology?.displayName ?? null,
          methodologies,
        }}
        methodologyVersionSwitcher={{
          currentVersionId: showMethodologyVersionSelector ? (versionId ?? null) : null,
          currentVersionLabel: showMethodologyVersionSelector
            ? (currentVersionLabel ?? methodologyVersionOptions[0]?.displayName ?? null)
            : null,
          methodologyId: showMethodologyVersionSelector ? (methodologyId ?? null) : null,
          versions: showMethodologyVersionSelector ? methodologyVersionOptions : [],
        }}
        onOpenCommands={() => setIsCommandPaletteOpen(true)}
        className="border-r border-border/80"
      />

      <SidebarInset className="chiron-texture-canvas min-w-0">
        <header className="chiron-app-shell-header border-b border-border/80">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="rounded-none" />
              <Separator orientation="vertical" className="mr-1 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  {breadcrumbSegments.map((segment, index) => {
                    const isLast = index === breadcrumbSegments.length - 1;
                    return (
                      <Fragment key={`${segment.href}-${index}`}>
                        <BreadcrumbItem>
                          {isLast ? (
                            <BreadcrumbPage>{segment.label}</BreadcrumbPage>
                          ) : (
                            <BreadcrumbLink
                              render={<Link to={segment.href}>{segment.label}</Link>}
                            />
                          )}
                        </BreadcrumbItem>
                        {!isLast ? <BreadcrumbSeparator /> : null}
                      </Fragment>
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
                <img
                  src={CHIRON_BRAND_ICON}
                  alt=""
                  aria-hidden="true"
                  className="size-3.5 object-contain"
                />
                Commands
                <span className="text-[0.62rem] text-muted-foreground">Ctrl/Cmd+K</span>
              </Button>
              <ModeToggle />
            </div>
          </div>
        </header>

        <div className="chiron-app-shell-content relative z-10 space-y-4">{children}</div>
      </SidebarInset>

      <MethodologyCommandPalette
        open={isCommandPaletteOpen}
        onOpenChange={setIsCommandPaletteOpen}
        selectedMethodologyKey={methodologyId ?? null}
        selectedVersionId={versionId ?? null}
      />
    </SidebarProvider>
  );
}
