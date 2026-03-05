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
import { CheckIcon, ChevronsUpDownIcon, CommandIcon, FolderIcon, TerminalIcon } from "lucide-react";

type UserItem = React.ComponentProps<typeof NavUser>["user"];

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
  ...props
}: AppSidebarProps) {
  const navigate = useNavigate();
  const [isProjectSwitcherOpen, setIsProjectSwitcherOpen] = React.useState(false);
  const [isMethodologySwitcherOpen, setIsMethodologySwitcherOpen] = React.useState(false);

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

  return (
    <Sidebar variant="sidebar" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          {scope === "system" ? (
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                render={<Link to="/methodologies" aria-label="Open methodology console" />}
              >
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <TerminalIcon className="size-4" />
                </div>
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
                      <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                        <FolderIcon className="size-4" />
                      </div>
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
              <Popover open={isMethodologySwitcherOpen} onOpenChange={setIsMethodologySwitcherOpen}>
                <PopoverTrigger
                  render={
                    <SidebarMenuButton size="lg" type="button" className="w-full">
                      <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                        <TerminalIcon className="size-4" />
                      </div>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-medium uppercase tracking-[0.08em]">
                          {currentMethodologyLabel}
                        </span>
                        <span className="truncate text-xs uppercase tracking-[0.08em] text-muted-foreground">
                          Methodology scope
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
            </SidebarMenuItem>
          ) : null}
          {onOpenCommands ? (
            <SidebarMenuItem>
              <SidebarMenuButton onClick={onOpenCommands} tooltip="Open command palette">
                <CommandIcon className="size-4" />
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
                      <SidebarMenuButton isActive={item.isActive} render={<Link to={item.to} />}>
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
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
