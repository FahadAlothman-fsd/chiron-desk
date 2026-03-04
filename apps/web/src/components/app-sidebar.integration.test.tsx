import { cleanup, render, screen } from "@testing-library/react";
import { forwardRef, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppSidebar, type SidebarNavSection } from "./app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

vi.mock("@tanstack/react-router", () => ({
  Link: forwardRef<HTMLAnchorElement, { to: string; children?: ReactNode }>(
    ({ to, children, ...props }, ref) => (
      <a ref={ref} href={to} {...props}>
        {children}
      </a>
    ),
  ),
}));

vi.mock("@/components/nav-user", () => ({
  NavUser: () => <div data-testid="nav-user">User</div>,
}));

const sections: SidebarNavSection[] = [
  {
    title: "Workspace",
    items: [
      { label: "Home", to: "/", isActive: true },
      { label: "Dashboard", to: "/dashboard" },
    ],
  },
  {
    title: "Methodology Authoring",
    items: [{ label: "Methodologies", to: "/methodologies" }],
  },
  {
    title: "Project Operations",
    items: [{ label: "Projects", to: "/projects" }],
  },
  {
    title: "Planned",
    items: [
      { label: "Runtime Execution", disabled: true, badge: "Epic 3+" },
      { label: "Setup Workflow", disabled: true, badge: "Epic 3+" },
      { label: "Transition Runs", disabled: true, badge: "Epic 3+" },
    ],
  },
];

describe("AppSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders static sections and route-correct enabled links", () => {
    render(
      <SidebarProvider>
        <AppSidebar sections={sections} />
      </SidebarProvider>,
    );

    expect(screen.getByText("Workspace")).toBeTruthy();
    expect(screen.getByText("Methodology Authoring")).toBeTruthy();
    expect(screen.getByText("Project Operations")).toBeTruthy();
    expect(screen.getByText("Planned")).toBeTruthy();

    expect(screen.getByRole("link", { name: "Home" }).getAttribute("href")).toBe("/");
    expect(screen.getByRole("link", { name: "Dashboard" }).getAttribute("href")).toBe("/dashboard");
    expect(screen.getByRole("link", { name: "Methodologies" }).getAttribute("href")).toBe(
      "/methodologies",
    );
    expect(screen.getByRole("link", { name: "Projects" }).getAttribute("href")).toBe("/projects");
  });

  it("renders planned items as disabled non-links with Epic 3+ badges", () => {
    render(
      <SidebarProvider>
        <AppSidebar sections={sections} />
      </SidebarProvider>,
    );

    expect(screen.queryByRole("link", { name: "Runtime Execution" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Setup Workflow" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Transition Runs" })).toBeNull();

    const runtimeButton = screen.getByRole("button", {
      name: /Runtime Execution/,
    }) as HTMLButtonElement;
    const setupButton = screen.getByRole("button", { name: /Setup Workflow/ }) as HTMLButtonElement;
    const transitionButton = screen.getByRole("button", {
      name: /Transition Runs/,
    }) as HTMLButtonElement;

    expect(runtimeButton.getAttribute("aria-disabled")).toBe("true");
    expect(setupButton.getAttribute("aria-disabled")).toBe("true");
    expect(transitionButton.getAttribute("aria-disabled")).toBe("true");

    expect(screen.getAllByText("Epic 3+").length).toBe(3);
  });
});
