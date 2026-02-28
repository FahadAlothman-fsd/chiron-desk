import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronsUpDownIcon, LogInIcon, LogOutIcon, UserIcon } from "lucide-react";

import { authClient } from "@/lib/auth-client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

type FallbackUser = {
  name: string;
  email: string;
  avatar: string;
};

export function NavUser({ user }: { user?: FallbackUser }) {
  const { isMobile } = useSidebar();
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex items-center gap-2 px-2 py-2">
            <Skeleton className="size-8 rounded-none" />
            <div className="min-w-0 flex-1 space-y-1">
              <Skeleton className="h-3 w-24 rounded-none" />
              <Skeleton className="h-3 w-32 rounded-none" />
            </div>
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  if (!session) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            render={
              <Link to="/login">
                <LogInIcon className="size-4" />
                <span className="uppercase tracking-[0.08em]">Sign In</span>
              </Link>
            }
          />
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  const effectiveUser = {
    name: session.user.name ?? user?.name ?? "Operator",
    email: session.user.email,
    avatar: session.user.image ?? user?.avatar ?? "",
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              />
            }
          >
            <Avatar className="h-8 w-8 rounded-none">
              <AvatarImage src={effectiveUser.avatar} alt={effectiveUser.name} />
              <AvatarFallback className="rounded-none uppercase">
                {effectiveUser.name.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium uppercase tracking-[0.08em]">
                {effectiveUser.name}
              </span>
              <span className="truncate text-xs">{effectiveUser.email}</span>
            </div>
            <ChevronsUpDownIcon className="ml-auto size-4 opacity-70" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-none"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-none">
                    <AvatarImage src={effectiveUser.avatar} alt={effectiveUser.name} />
                    <AvatarFallback className="rounded-none uppercase">
                      {effectiveUser.name.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium uppercase tracking-[0.08em]">
                      {effectiveUser.name}
                    </span>
                    <span className="truncate text-xs">{effectiveUser.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <UserIcon className="size-4" />
                Account
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => {
                authClient.signOut({
                  fetchOptions: {
                    onSuccess: () => {
                      navigate({ to: "/login" });
                    },
                  },
                });
              }}
            >
              <LogOutIcon className="size-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
