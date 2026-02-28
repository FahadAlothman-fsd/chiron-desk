import * as React from "react";
import { Link } from "@tanstack/react-router";

import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { CommandIcon, TerminalIcon } from "lucide-react";

type NavMainItem = React.ComponentProps<typeof NavMain>["items"][number];
type ProjectItem = React.ComponentProps<typeof NavProjects>["projects"][number];
type SecondaryItem = React.ComponentProps<typeof NavSecondary>["items"][number];
type UserItem = React.ComponentProps<typeof NavUser>["user"];

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  title?: string;
  subtitle?: string;
  navMainItems: NavMainItem[];
  projectItems: ProjectItem[];
  navSecondaryItems: SecondaryItem[];
  user?: UserItem;
  onOpenCommands?: () => void;
};

export function AppSidebar({
  title = "Chiron",
  subtitle = "Operator Console",
  navMainItems,
  projectItems,
  navSecondaryItems,
  user,
  onOpenCommands,
  ...props
}: AppSidebarProps) {
  return (
    <Sidebar variant="sidebar" {...props}>
      <SidebarHeader>
        <SidebarMenu>
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
        <NavMain items={navMainItems} />
        <NavProjects projects={projectItems} />
        <NavSecondary items={navSecondaryItems} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
