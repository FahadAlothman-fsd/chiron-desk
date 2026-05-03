import * as React from "react";
import { Link, useNavigate } from "@tanstack/react-router";

import { NavUser } from "@/components/nav-user";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { resolvePublicAsset } from "@/lib/public-asset";

type UserItem = React.ComponentProps<typeof NavUser>["user"];

const CHIRON_BRAND_ICON = resolvePublicAsset("visuals/chiron-brand/asset-41.svg");

function SidebarScopeIcon() {
  return (
    <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
      <img src={CHIRON_BRAND_ICON} alt="" aria-hidden="true" className="size-8 object-contain" />
    </div>
  );
}

const CONTEXT_MODES = [
  {
    key: "system",
    label: "System",
    assetSrc: resolvePublicAsset("visuals/context-switcher/system-asset-16.svg"),
    to: "/",
  },
  {
    key: "methodology",
    label: "Methodology",
    assetSrc: resolvePublicAsset("visuals/context-switcher/methodology-asset-08.svg"),
    to: "/methodologies",
  },
  {
    key: "project",
    label: "Project",
    assetSrc: resolvePublicAsset("visuals/context-switcher/project-asset-05.svg"),
    to: "/projects",
  },
] as const;

export type SidebarNavItem = {
  label: string;
  icon?: React.ReactNode;
  to?: string;
  disabled?: boolean;
  badge?: string;
  isActive?: boolean;
};

export type SidebarNavSection = {
  title: string;
  items: SidebarNavItem[];
};

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  title?: string;
  subtitle?: string;
  scope?: "system" | "project" | "methodology";
  sections: SidebarNavSection[];
  user?: UserItem;
  onOpenCommands?: () => void;
  projectSwitcher?: {
    currentProjectId?: string | null;
    currentProjectName?: string | null;
    projects: ReadonlyArray<{
      id: string;
      displayName: string;
    }>;
  };
  methodologySwitcher?: {
    currentMethodologyId?: string | null;
    currentMethodologyName?: string | null;
    methodologies: ReadonlyArray<{
      methodologyKey: string;
      displayName: string;
    }>;
  };
  methodologyVersionSwitcher?: {
    currentVersionId?: string | null;
    currentVersionLabel?: string | null;
    methodologyId?: string | null;
    versions: ReadonlyArray<{
      id: string;
      displayName: string;
    }>;
  };
};

export function AppSidebar({
  title = "Chiron",
  subtitle = "Operator Console",
  scope = "system",
  sections,
  user,
  onOpenCommands,
  projectSwitcher,
  methodologySwitcher,
  methodologyVersionSwitcher,
  ...props
}: AppSidebarProps) {
  const navigate = useNavigate();
  const [isProjectSwitcherOpen, setIsProjectSwitcherOpen] = React.useState(false);
  const [isMethodologySwitcherOpen, setIsMethodologySwitcherOpen] = React.useState(false);
  const [isMethodologyVersionSwitcherOpen, setIsMethodologyVersionSwitcherOpen] =
    React.useState(false);

  const currentProjectLabel =
    projectSwitcher?.currentProjectName ??
    (projectSwitcher?.currentProjectId
      ? `Project ${projectSwitcher.currentProjectId.slice(0, 8)}`
      : "Select project");
  const projectOptions = projectSwitcher?.projects ?? [];
  const currentProjectId = projectSwitcher?.currentProjectId ?? null;
  const currentMethodologyLabel =
    methodologySwitcher?.currentMethodologyName ??
    methodologySwitcher?.currentMethodologyId ??
    "Select methodology";
  const currentMethodologyVersionLabel =
    methodologyVersionSwitcher?.currentVersionLabel ??
    methodologyVersionSwitcher?.currentVersionId ??
    "Select version";

  return (
    <Sidebar variant="sidebar" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="grid grid-cols-3 gap-1 px-2 pb-2">
              {CONTEXT_MODES.map((mode) => {
                const active = scope === mode.key;

                return (
                  <SidebarMenuButton
                    key={mode.key}
                    type="button"
                    isActive={active}
                    tooltip={mode.label}
                    aria-label={`${mode.label} context`}
                    className="h-auto flex-col gap-1 px-1 py-2 opacity-90"
                    onClick={() => {
                      if (!active) {
                        void navigate({ to: mode.to });
                      }
                    }}
                  >
                    <img
                      src={mode.assetSrc}
                      alt=""
                      aria-hidden="true"
                      className="size-7 object-contain"
                    />
                    <span className="text-[0.55rem] uppercase tracking-[0.12em] text-muted-foreground">
                      {mode.label}
                    </span>
                  </SidebarMenuButton>
                );
              })}
            </div>
          </SidebarMenuItem>

          {scope === "system" ? (
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                render={<Link to="/methodologies" aria-label="Open methodology console" />}
              >
                <SidebarScopeIcon />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium uppercase tracking-[0.08em]">{title}</span>
                  <span className="truncate text-xs uppercase tracking-[0.08em]">{subtitle}</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : null}

          {scope === "project" ? (
            <SidebarMenuItem>
              <Popover open={isProjectSwitcherOpen} onOpenChange={setIsProjectSwitcherOpen}>
                <PopoverTrigger
                  render={
                    <SidebarMenuButton size="lg" type="button" className="w-full">
                      <SidebarScopeIcon />
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-medium uppercase tracking-[0.08em]">
                          {currentProjectLabel}
                        </span>
                        <span className="truncate text-xs uppercase tracking-[0.08em] text-muted-foreground">
                          Project scope
                        </span>
                      </div>
                      <ChevronsUpDownIcon className="ml-auto size-4 text-muted-foreground" />
                    </SidebarMenuButton>
                  }
                />
                <PopoverContent
                  side="right"
                  align="start"
                  frame="cut"
                  tone="navigation"
                  className="w-80 p-0"
                >
                  <Command tone="navigation" density="compact" frame="default">
                    <CommandInput density="compact" placeholder="Search projects..." />
                    <CommandList>
                      <CommandEmpty>No projects found.</CommandEmpty>
                      <CommandGroup heading="Projects">
                        {projectOptions.map((project) => {
                          const isCurrent = project.id === currentProjectId;

                          return (
                            <CommandItem
                              key={project.id}
                              value={`${project.displayName} ${project.id}`}
                              density="compact"
                              onSelect={() => {
                                setIsProjectSwitcherOpen(false);
                                if (!isCurrent) {
                                  void navigate({
                                    to: "/projects/$projectId",
                                    params: { projectId: project.id },
                                  });
                                }
                              }}
                            >
                              <div className="grid min-w-0 flex-1 gap-0.5">
                                <span className="truncate font-medium">{project.displayName}</span>
                                <span className="truncate text-[0.68rem] uppercase tracking-[0.08em] text-muted-foreground">
                                  {project.id}
                                </span>
                              </div>
                              {isCurrent ? <CheckIcon className="size-3.5" /> : null}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </SidebarMenuItem>
          ) : null}

          {scope === "methodology" ? (
            <SidebarMenuItem>
              <div className="chiron-frame-cut bg-sidebar-accent/25 p-3.5">
                <div className="flex gap-3">
                  <div className="shrink-0 pt-0.5">
                    <SidebarScopeIcon />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <Popover
                      open={isMethodologySwitcherOpen}
                      onOpenChange={setIsMethodologySwitcherOpen}
                    >
                      <PopoverTrigger
                        render={
                          <SidebarMenuButton
                            size="lg"
                            type="button"
                            className="h-auto w-full justify-between px-0 py-0 hover:bg-transparent data-[active=true]:bg-transparent rounded-none"
                          >
                            <div className="min-w-0 text-left">
                              <div className="truncate text-sm font-medium uppercase tracking-[0.08em]">
                                {currentMethodologyLabel}
                              </div>
                              <div className="truncate text-[0.58rem] uppercase tracking-[0.16em] text-muted-foreground/80">
                                Methodology
                              </div>
                            </div>
                            <ChevronsUpDownIcon className="size-4 shrink-0 text-muted-foreground/80" />
                          </SidebarMenuButton>
                        }
                      />
                      <PopoverContent
                        side="right"
                        align="start"
                        frame="cut-thin"
                        tone="navigation"
                        className="w-80 p-0 border border-border/80 shadow-none overflow-visible"
                      >
                        <Command tone="navigation" density="compact" frame="default">
                          <CommandInput density="compact" placeholder="Search methodologies..." />
                          <CommandList>
                            <CommandEmpty>No methodologies found.</CommandEmpty>
                            <CommandGroup heading="Methodologies">
                              {(methodologySwitcher?.methodologies ?? []).map((methodology) => {
                                const isCurrent =
                                  methodology.methodologyKey ===
                                  methodologySwitcher?.currentMethodologyId;

                                return (
                                  <CommandItem
                                    key={methodology.methodologyKey}
                                    value={`${methodology.displayName} ${methodology.methodologyKey}`}
                                    density="compact"
                                    onSelect={() => {
                                      setIsMethodologySwitcherOpen(false);
                                      if (!isCurrent) {
                                        void navigate({
                                          to: "/methodologies/$methodologyId",
                                          params: { methodologyId: methodology.methodologyKey },
                                        });
                                      }
                                    }}
                                  >
                                    <div className="grid min-w-0 flex-1 gap-0.5">
                                      <span className="truncate font-medium">
                                        {methodology.displayName}
                                      </span>
                                      <span className="truncate text-[0.68rem] uppercase tracking-[0.08em] text-muted-foreground">
                                        {methodology.methodologyKey}
                                      </span>
                                    </div>
                                    {isCurrent ? <CheckIcon className="size-3.5" /> : null}
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>

                    {methodologyVersionSwitcher?.methodologyId ? (
                      <Popover
                        open={isMethodologyVersionSwitcherOpen}
                        onOpenChange={setIsMethodologyVersionSwitcherOpen}
                      >
                        <PopoverTrigger
                          render={
                            <SidebarMenuButton
                              size="sm"
                              type="button"
                              className="h-auto w-full justify-between border border-border/35 px-2 py-1 hover:bg-sidebar-accent/15 data-[active=true]:bg-sidebar-accent/15 rounded-none opacity-80"
                            >
                              <div className="min-w-0 text-left">
                                <div className="truncate text-[0.48rem] uppercase tracking-[0.16em] text-muted-foreground/65">
                                  Version
                                </div>
                                <div className="truncate text-[0.68rem] font-medium uppercase tracking-[0.08em] text-foreground/75">
                                  {currentMethodologyVersionLabel}
                                </div>
                              </div>
                              <ChevronsUpDownIcon className="size-3 shrink-0 text-muted-foreground/65" />
                            </SidebarMenuButton>
                          }
                        />
                        <PopoverContent
                          side="right"
                          align="start"
                          frame="cut-thin"
                          tone="navigation"
                          className="w-72 p-0 border border-border/80 shadow-none overflow-visible"
                        >
                          <Command tone="navigation" density="compact" frame="default">
                            <CommandInput density="compact" placeholder="Search versions..." />
                            <CommandList>
                              <CommandEmpty>No versions found.</CommandEmpty>
                              <CommandGroup heading="Versions">
                                {methodologyVersionSwitcher.versions.map((version) => {
                                  const isCurrent =
                                    version.id === methodologyVersionSwitcher.currentVersionId;
                                  return (
                                    <CommandItem
                                      key={version.id}
                                      value={`${version.displayName} ${version.id}`}
                                      density="compact"
                                      onSelect={() => {
                                        setIsMethodologyVersionSwitcherOpen(false);
                                        if (!isCurrent) {
                                          void navigate({
                                            to: "/methodologies/$methodologyId/versions/$versionId",
                                            params: {
                                              methodologyId:
                                                methodologyVersionSwitcher.methodologyId!,
                                              versionId: version.id,
                                            },
                                          });
                                        }
                                      }}
                                    >
                                      <div className="grid min-w-0 flex-1 gap-0.5">
                                        <span className="truncate font-medium">
                                          {version.displayName}
                                        </span>
                                        <span className="truncate text-[0.68rem] uppercase tracking-[0.08em] text-muted-foreground">
                                          {version.id}
                                        </span>
                                      </div>
                                      {isCurrent ? <CheckIcon className="size-3.5" /> : null}
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    ) : null}
                  </div>
                </div>
              </div>
            </SidebarMenuItem>
          ) : null}
          {onOpenCommands ? (
            <SidebarMenuItem>
              <SidebarMenuButton onClick={onOpenCommands} tooltip="Open command palette">
                <span>Commands</span>
                <span className="ml-auto text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
                  Ctrl/Cmd+K
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : null}
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {sections.map((section) => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={`${section.title}-${item.label}`}>
                    {item.to && !item.disabled ? (
                      <SidebarMenuButton
                        isActive={item.isActive ?? false}
                        render={<Link to={item.to} />}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                        {item.badge ? <SidebarMenuBadge>{item.badge}</SidebarMenuBadge> : null}
                      </SidebarMenuButton>
                    ) : (
                      <SidebarMenuButton aria-disabled="true" disabled={item.disabled}>
                        {item.icon}
                        <span>{item.label}</span>
                        {item.badge ? <SidebarMenuBadge>{item.badge}</SidebarMenuBadge> : null}
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser {...(user ? { user } : {})} />
      </SidebarFooter>
    </Sidebar>
  );
}
