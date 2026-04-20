import { describe, expect, it } from "vitest";

import { buildSidebarSections } from "../../components/sidebar-sections";

describe("buildSidebarSections", () => {
  it("returns system sidebar sections for system scope", () => {
    const sections = buildSidebarSections("/", "system");

    expect(sections).toEqual([
      {
        title: "System",
        items: [
          expect.objectContaining({ label: "Home", to: "/", isActive: true }),
          expect.objectContaining({
            label: "Methodologies",
            to: "/methodologies",
            isActive: false,
          }),
          expect.objectContaining({ label: "Projects", to: "/projects", isActive: false }),
          expect.objectContaining({ label: "Harnesses", disabled: true }),
          expect.objectContaining({ label: "Settings", disabled: true }),
        ],
      },
    ]);
  });

  it("returns methodology sidebar sections for methodology scope", () => {
    const sections = buildSidebarSections(
      "/methodologies/bmad.v1/versions/mver_bmad_project_context_only_draft",
      "methodology",
      {
        methodologyId: "bmad.v1",
        methodologyVersionId: "mver_bmad_project_context_only_draft",
        methodologyVersionLabel: "BMAD V1",
      },
    );

    expect(sections).toEqual([
      {
        title: "Overview",
        items: [
          expect.objectContaining({
            label: "Dashboard",
            to: "/methodologies/bmad.v1",
            isActive: false,
          }),
          expect.objectContaining({
            label: "Versions",
            to: "/methodologies/bmad.v1/versions",
            isActive: true,
          }),
        ],
      },
      {
        title: "BMAD V1",
        items: [
          expect.objectContaining({
            label: "Workspace",
            to: "/methodologies/bmad.v1/versions/mver_bmad_project_context_only_draft",
            isActive: true,
          }),
          expect.objectContaining({
            label: "Facts",
            to: "/methodologies/bmad.v1/versions/mver_bmad_project_context_only_draft/facts",
            isActive: false,
          }),
          expect.objectContaining({
            label: "Work Units",
            to: "/methodologies/bmad.v1/versions/mver_bmad_project_context_only_draft/work-units",
            isActive: false,
          }),
          expect.objectContaining({
            label: "Dependency Definitions",
            to: "/methodologies/bmad.v1/versions/mver_bmad_project_context_only_draft/dependency-definitions",
            isActive: false,
          }),
        ],
      },
    ]);
  });

  it("returns project sidebar sections for project scope", () => {
    const sections = buildSidebarSections("/projects/abc", "project", { projectId: "abc" });

    expect(sections).toEqual([
      {
        title: "Project",
        items: [
          expect.objectContaining({ label: "Dashboard", to: "/projects/abc", isActive: true }),
          expect.objectContaining({
            label: "Project Facts",
            to: "/projects/abc/facts",
            isActive: false,
          }),
          expect.objectContaining({
            label: "Work Units",
            to: "/projects/abc/work-units",
            isActive: false,
          }),
          expect.objectContaining({
            label: "Guidance",
            to: "/projects/abc/transitions",
            isActive: false,
          }),
          expect.objectContaining({
            label: "Active Workflows",
            to: "/projects/abc/workflows",
            isActive: false,
          }),
          expect.objectContaining({ label: "Artifacts", disabled: true }),
          expect.objectContaining({
            label: "Pin / Methodology",
            to: "/projects/abc/pinning",
            isActive: false,
          }),
        ],
      },
    ]);
  });
});
