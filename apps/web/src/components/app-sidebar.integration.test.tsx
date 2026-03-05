import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { forwardRef, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppSidebar, type SidebarNavSection } from "./app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

const navigateMock = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  Link: forwardRef<HTMLAnchorElement, { to: string; children?: ReactNode }>(
    ({ to, children, ...props }, ref) => (
      <a ref={ref} href={to} {...props}>
        {children}
      </a>
    ),
  ),
  useNavigate: () => navigateMock,
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
    navigateMock.mockReset();
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
    Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      writable: true,
      value: vi.fn(),
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

  it("renders searchable project switcher and navigates on selection", () => {
    render(
      <SidebarProvider>
        <AppSidebar
          sections={sections}
          scope="project"
          projectSwitcher={{
            currentProjectId: "proj-1",
            currentProjectName: "Verdant Harbor 349",
            projects: [
              { id: "proj-1", displayName: "Verdant Harbor 349" },
              { id: "proj-2", displayName: "Cinder Summit 886" },
            ],
          }}
        />
      </SidebarProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Verdant Harbor 349/i }));
    expect(screen.getByPlaceholderText("Search projects...")).toBeTruthy();

    fireEvent.click(screen.getByText("Cinder Summit 886"));

    expect(navigateMock).toHaveBeenCalledWith({
      to: "/projects/$projectId",
      params: { projectId: "proj-2" },
    });
  });

  it("renders methodology scope selector and hides operator workspace banner", () => {
    render(
      <SidebarProvider>
        <AppSidebar
          sections={sections}
          scope="methodology"
          methodologySwitcher={{
            currentMethodologyId: "bmad.v1",
            currentMethodologyName: "BMAD",
            methodologies: [
              { methodologyKey: "bmad.v1", displayName: "BMAD" },
              { methodologyKey: "spiral.v1", displayName: "Spiral" },
            ],
          }}
        />
      </SidebarProvider>,
    );

    expect(screen.queryByText("Operator Workspace")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /BMAD/i }));
    expect(screen.getByPlaceholderText("Search methodologies...")).toBeTruthy();
  });
});
