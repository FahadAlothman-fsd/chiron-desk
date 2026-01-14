"use client";

import { useMatchRoute } from "@tanstack/react-router";
import { Command } from "lucide-react";
import { BorderAccent } from "@/components/ui/border-accent";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import UserMenu from "@/components/user-menu";
import { navItems } from "@/lib/nav-config";

export function AppSidebar() {
  const matchRoute = useMatchRoute();

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/">
                <BorderAccent
                  cornerLength={8}
                  cornerStroke={1}
                  className="flex aspect-square size-8 items-center justify-center"
                >
                  <Command className="size-4 text-sidebar-primary" />
                </BorderAccent>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Chiron</span>
                  <span className="truncate text-xs">AI Workflows</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = matchRoute({ to: item.url, fuzzy: false });
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={!!isActive} tooltip={item.title}>
                      <a href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <UserMenu />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
