import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/command", () => ({
  Command: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CommandEmpty: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CommandGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CommandInput: (props: Record<string, unknown>) => <input {...props} />,
  CommandItem: ({ children, onSelect }: { children: ReactNode; onSelect?: () => void }) => (
    <button type="button" onClick={onSelect}>
      {children}
    </button>
  ),
  CommandList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import { RuntimeStartGateDialog } from "@/components/runtime/runtime-start-gate-dialog";

describe("runtime start-gate dialog", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders structured conditions and workflow guidance metadata", async () => {
    render(
      <RuntimeStartGateDialog
        open
        onOpenChange={() => {}}
        detail={{
          transition: {
            transitionId: "tr-1",
            transitionKey: "activation_to_done",
            transitionName: "Activation to Done",
            toStateKey: "done",
          },
          workUnitContext: {
            workUnitTypeId: "wut-1",
            workUnitTypeKey: "setup",
            workUnitTypeName: "Setup",
            currentStateLabel: "Not started",
            source: "future",
          },
          gateSummary: { result: "available" },
          conditionTree: {
            mode: "all",
            conditions: [{ kind: "fact", factKey: "project_ready", operator: "exists" }],
            groups: [
              {
                mode: "any",
                conditions: [{ kind: "artifact", slotKey: "brief_doc", operator: "fresh" }],
                groups: [],
              },
            ],
          },
          evaluationTree: {
            mode: "all",
            met: false,
            conditions: [
              {
                condition: { kind: "fact", factKey: "project_ready", operator: "exists" },
                met: false,
                reason: "project_ready is missing.",
              },
            ],
            groups: [
              {
                mode: "any",
                met: true,
                conditions: [
                  {
                    condition: { kind: "artifact", slotKey: "brief_doc", operator: "fresh" },
                    met: true,
                    reason: "Artifact snapshot is current.",
                  },
                ],
                groups: [],
              },
            ],
          },
          launchability: {
            canLaunch: true,
            availableWorkflows: [
              {
                workflowId: "wf-1",
                workflowKey: "setup_project",
                workflowName: "Setup Project",
                workflowDescription: "Set up the project workspace and baseline runtime context.",
                workflowHumanGuidance: "Review the setup checklist before launching.",
              },
            ],
          },
        }}
        isLoading={false}
        errorMessage={null}
        onLaunch={() => {}}
        isLaunching={false}
        launchLabel="Start transition"
      />,
    );

    expect(await screen.findByText("all gate")).toBeTruthy();
    expect(screen.getByText("Project fact")).toBeTruthy();
    expect(screen.getByText("project_ready must exist")).toBeTruthy();
    expect(screen.getByText("blocked")).toBeTruthy();
    expect(screen.getByText("project_ready is missing.")).toBeTruthy();
    expect(screen.getByText("Artifact")).toBeTruthy();
    expect(screen.getByText(/brief_doc must be fresh/i)).toBeTruthy();
    expect(screen.getByText("passed")).toBeTruthy();
    expect(screen.getByText("This condition currently passes.")).toBeTruthy();
    expect(screen.getAllByText("Setup Project").length).toBeGreaterThan(0);
    expect(screen.getByText("Review the setup checklist before launching.")).toBeTruthy();
  });
});
