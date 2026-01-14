import { Home, type LucideIcon } from "lucide-react";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  {
    title: "Home",
    url: "/",
    icon: Home,
  },
];
