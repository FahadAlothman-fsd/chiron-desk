import * as React from "react";
import { Link } from "@tanstack/react-router";

import { NavUser } from "@/components/nav-user";
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
import { CommandIcon, TerminalIcon } from "lucide-react";

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
  sections: SidebarNavSection[];
  user?: UserItem;
  onOpenCommands?: () => void;
};

export function AppSidebar({
  title = "Chiron",
  subtitle = "Operator Console",
  sections,
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
