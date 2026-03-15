import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { forwardRef, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppSidebar, type SidebarNavSection } from "../../components/app-sidebar";
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
    title: "System",
    items: [
      { label: "Home", to: "/", isActive: true },
      { label: "Methodologies", to: "/methodologies" },
      { label: "Projects", to: "/projects" },
      { label: "Harnesses", disabled: true },
      { label: "Settings", disabled: true },
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

  it("renders system navigation items", () => {
    render(
      <SidebarProvider>
        <AppSidebar sections={sections} />
      </SidebarProvider>,
    );

    expect(screen.getAllByText("System").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: /System context/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Methodology context/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Project context/i })).toBeTruthy();

    expect(screen.getByRole("link", { name: "Home" }).getAttribute("href")).toBe("/");
    expect(screen.getByRole("link", { name: "Methodologies" }).getAttribute("href")).toBe(
      "/methodologies",
    );
    expect(screen.getByRole("link", { name: "Projects" }).getAttribute("href")).toBe("/projects");
  });

  it("renders system-only deferred items as disabled non-links", () => {
    render(
      <SidebarProvider>
        <AppSidebar sections={sections} />
      </SidebarProvider>,
    );

    expect(screen.queryByRole("link", { name: "Harnesses" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Settings" })).toBeNull();

    const harnessesButton = screen.getByRole("button", { name: /Harnesses/ }) as HTMLButtonElement;
    const settingsButton = screen.getByRole("button", { name: /Settings/ }) as HTMLButtonElement;

    expect(harnessesButton.getAttribute("aria-disabled")).toBe("true");
    expect(settingsButton.getAttribute("aria-disabled")).toBe("true");
  });

  it("renders project scope selector and navigates on selection", () => {
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

  it("renders methodology scope selector, version-scoped sections, and navigates on version selection", () => {
    const methodologySections: SidebarNavSection[] = [
      {
        title: "Overview",
        items: [
          { label: "Dashboard", to: "/methodologies/bmad.v1" },
          { label: "Versions", to: "/methodologies/bmad.v1/versions", isActive: true },
        ],
      },
      {
        title: "Draft: BMAD V1",
        items: [
          { label: "Workspace", to: "/methodologies/bmad.v1/versions/draft-v2", isActive: true },
          { label: "Facts", to: "/methodologies/bmad.v1/versions/draft-v2/facts" },
        ],
      },
    ];

    render(
      <SidebarProvider>
        <AppSidebar
          sections={methodologySections}
          scope="methodology"
          methodologySwitcher={{
            currentMethodologyId: "bmad.v1",
            currentMethodologyName: "BMAD",
            methodologies: [
              { methodologyKey: "bmad.v1", displayName: "BMAD" },
              { methodologyKey: "spiral.v1", displayName: "Spiral" },
            ],
          }}
          methodologyVersionSwitcher={{
            currentVersionId: "draft-v2",
            currentVersionLabel: "Draft: BMAD V1",
            methodologyId: "bmad.v1",
            versions: [
              { id: "draft-v2", displayName: "Draft: BMAD V1" },
              { id: "draft-v3", displayName: "Draft: BMAD V2" },
            ],
          }}
        />
      </SidebarProvider>,
    );

    expect(screen.queryByText("Operator Workspace")).toBeNull();
    expect(screen.getByText("Overview")).toBeTruthy();
    expect(screen.getAllByText("Draft: BMAD V1").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("link", { name: "Workspace" }).getAttribute("href")).toBe(
      "/methodologies/bmad.v1/versions/draft-v2",
    );
    expect(screen.getByRole("link", { name: "Facts" }).getAttribute("href")).toBe(
      "/methodologies/bmad.v1/versions/draft-v2/facts",
    );
    fireEvent.click(screen.getAllByRole("button", { name: /BMAD/i })[0]!);
    expect(screen.getByPlaceholderText("Search methodologies...")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Draft: BMAD V1/i }));
    expect(screen.getByPlaceholderText("Search versions...")).toBeTruthy();
    fireEvent.click(screen.getByText("Draft: BMAD V2"));

    expect(navigateMock).toHaveBeenCalledWith({
      to: "/methodologies/$methodologyId/versions/$versionId",
      params: { methodologyId: "bmad.v1", versionId: "draft-v3" },
    });
  });

  it("switches app context from the top-level context buttons", () => {
    render(
      <SidebarProvider>
        <AppSidebar sections={sections} scope="system" />
      </SidebarProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Methodology context/i }));
    fireEvent.click(screen.getByRole("button", { name: /Project context/i }));

    expect(navigateMock).toHaveBeenNthCalledWith(1, { to: "/methodologies" });
    expect(navigateMock).toHaveBeenNthCalledWith(2, { to: "/projects" });
  });
});
