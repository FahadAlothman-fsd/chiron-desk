import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SurfaceCard } from "@/components/surface-card";

describe("SurfaceCard", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the approved square shell, values, and decorative corners", () => {
    render(
      <SurfaceCard
        tone="work-units"
        eyebrow="Author"
        title="Work Units"
        description="Core structure, relationship map, and unit inventory."
        primaryValue="2 work units"
        secondaryValues={["3 transitions", "2 workflows"]}
        badge="Draft"
        actions={[]}
      />,
    );

    expect(screen.getByText("Work Units")).toBeTruthy();
    expect(screen.getByText("2 work units")).toBeTruthy();
    expect(screen.getByText("3 transitions")).toBeTruthy();
    expect(screen.getByText("2 workflows")).toBeTruthy();
    expect(screen.getByText("Draft")).toBeTruthy();
    expect(screen.getByTestId("surface-card-separator")).toBeTruthy();
    expect(screen.getAllByTestId("surface-card-corner")).toHaveLength(4);
  });

  it("uses a visibly tone-colored diagonal stripe overlay", () => {
    render(
      <SurfaceCard
        tone="work-units"
        eyebrow="Author"
        title="Work Units"
        description="Core structure, relationship map, and unit inventory."
        primaryValue="2 work units"
        secondaryValues={["3 transitions", "2 workflows"]}
        badge="Draft"
        actions={[]}
      />,
    );

    const overlay = screen.getByTestId("surface-card-overlay");

    expect(overlay.getAttribute("style")).toContain("var(--section-accent) 32%");
  });

  it("removes the description width cap at xl so copy can use available card space", () => {
    render(
      <SurfaceCard
        tone="work-units"
        eyebrow="Author"
        title="Work Units"
        description="Open the dedicated work-unit overview page for graph and list navigation."
        primaryValue="2 work units"
        secondaryValues={["3 transitions", "2 workflows"]}
        badge="Draft"
        actions={[]}
      />,
    );

    expect(
      screen.getByText("Open the dedicated work-unit overview page for graph and list navigation.")
        .className,
    ).toContain("xl:max-w-none");
  });

  it("renders compact footer actions with visible shortcut hints", () => {
    render(
      <SurfaceCard
        tone="work-units"
        eyebrow="Author"
        title="Work Units"
        description="Core structure, relationship map, and unit inventory."
        primaryValue="2 work units"
        secondaryValues={["3 transitions", "2 workflows"]}
        badge="Draft"
        actions={[
          {
            label: "Open Work Units",
            shortcut: "G W",
            onTrigger: vi.fn(),
          },
          {
            label: "Add Work Unit",
            shortcut: "C W",
            onTrigger: vi.fn(),
          },
        ]}
      />,
    );

    expect(screen.getByRole("button", { name: "Open Work Units" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add Work Unit" })).toBeTruthy();
    expect(screen.getByText("G W")).toBeTruthy();
    expect(screen.getByText("C W")).toBeTruthy();
    expect(screen.getByTestId("surface-card-footer").className).toContain("flex");
  });

  it("keeps blocked actions visible and shows the disabled rationale", () => {
    render(
      <SurfaceCard
        tone="work-units"
        eyebrow="Author"
        title="Work Units"
        description="Core structure, relationship map, and unit inventory."
        primaryValue="2 work units"
        secondaryValues={["3 transitions", "2 workflows"]}
        badge="Draft"
        actions={[
          {
            label: "Add Work Unit",
            shortcut: "C W",
            disabledReason: "Open a methodology version context first",
            onTrigger: vi.fn(),
          },
        ]}
      />,
    );

    expect(screen.getByRole("button", { name: "Add Work Unit" }).hasAttribute("disabled")).toBe(
      true,
    );
    expect(screen.getByText("Open a methodology version context first")).toBeTruthy();
  });
});
