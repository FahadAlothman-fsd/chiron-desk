import { describe, expect, it } from "vitest";

import { buildSidebarSections } from "./sidebar-sections";

describe("buildSidebarSections", () => {
  it("returns approved static IA with route-correct enabled entries", () => {
    const sections = buildSidebarSections("/projects/abc");

    expect(sections.map((section) => section.title)).toEqual([
      "Workspace",
      "Methodology Authoring",
      "Project Operations",
      "Planned",
    ]);

    const workspace = sections[0];
    const methodologyAuthoring = sections[1];
    const projectOperations = sections[2];

    expect(workspace?.items[0]).toEqual(
      expect.objectContaining({ label: "Home", to: "/", isActive: false }),
    );
    expect(workspace?.items[1]).toEqual(
      expect.objectContaining({ label: "Dashboard", to: "/dashboard", isActive: false }),
    );
    expect(methodologyAuthoring?.items[0]).toEqual(
      expect.objectContaining({ label: "Methodologies", to: "/methodologies", isActive: false }),
    );
    expect(projectOperations?.items[0]).toEqual(
      expect.objectContaining({ label: "Projects", to: "/projects", isActive: true }),
    );
  });

  it("marks planned items as disabled with Epic 3+ badges and no routes", () => {
    const sections = buildSidebarSections("/dashboard");
    const planned = sections.find((section) => section.title === "Planned");

    expect(planned?.items).toEqual([
      expect.objectContaining({
        label: "Runtime Execution",
        disabled: true,
        badge: "Epic 3+",
      }),
      expect.objectContaining({
        label: "Setup Workflow",
        disabled: true,
        badge: "Epic 3+",
      }),
      expect.objectContaining({
        label: "Transition Runs",
        disabled: true,
        badge: "Epic 3+",
      }),
    ]);
  });
});
