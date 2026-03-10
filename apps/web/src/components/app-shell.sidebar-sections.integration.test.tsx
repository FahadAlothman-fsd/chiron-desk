import { describe, expect, it } from "vitest";

import { buildSidebarSections } from "./sidebar-sections";

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
    const sections = buildSidebarSections("/methodologies/bmad.v1", "methodology", {
      methodologyId: "bmad.v1",
    });

    expect(sections).toEqual([
      {
        title: "Methodology",
        items: [
          expect.objectContaining({
            label: "Dashboard",
            to: "/methodologies/bmad.v1",
            isActive: true,
          }),
          expect.objectContaining({
            label: "Versions",
            to: "/methodologies/bmad.v1/versions",
            isActive: false,
          }),
          expect.objectContaining({ label: "Methodology Facts", disabled: true }),
          expect.objectContaining({ label: "Work Units", disabled: true }),
          expect.objectContaining({ label: "Artifact Templates", disabled: true }),
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
          expect.objectContaining({ label: "Artifacts", disabled: true }),
          expect.objectContaining({ label: "Runs / History", disabled: true }),
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
