import type { ReactNode } from "react";
import { isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

vi.mock("@/components/ui/button", () => ({
  buttonVariants: () => "",
  Button: ({
    children,
    asChild,
    className,
  }: {
    children: ReactNode;
    asChild?: boolean;
    className?: string;
  }) => {
    if (asChild && isValidElement(children)) {
      return children;
    }

    return (
      <button type="button" className={className}>
        {children}
      </button>
    );
  },
}));

import { RuntimeGuidanceSections } from "@/components/runtime/runtime-guidance-sections";

describe("runtime guidance sections visuals", () => {
  it("renders human-readable labels and activation state chips", () => {
    const markup = renderToStaticMarkup(
      <RuntimeGuidanceSections
        projectId="project-1"
        activeCards={[
          {
            projectWorkUnitId: "wu-setup-1",
            workUnitTypeId: "seed:wut:setup:mver_bmad_v1_active",
            workUnitTypeKey: "setup",
            workUnitTypeName: "seed:wut:setup:mver_bmad_v1_active",
            currentStateKey: "unknown-state",
            currentStateLabel: "unknown-state",
            factSummary: { currentCount: 0, totalCount: 0 },
            artifactSummary: { currentCount: 0, totalCount: 0 },
            activeTransition: {
              transitionExecutionId: "te-1",
              transitionId: "seed:transition:setup:activation-to-done:mver_bmad_v1_active",
              transitionKey: "activation_to_done",
              transitionName: "seed:transition:setup:activation-to-done:mver_bmad_v1_active",
              toStateKey: "done",
              toStateLabel: "Done",
              status: "active",
              readyForCompletion: true,
            },
            activePrimaryWorkflow: {
              workflowExecutionId: "we-1",
              workflowId: "seed:workflow:setup:setup-project:mver_bmad_v1_active",
              workflowKey: "setup_project",
              workflowName: "seed:workflow:setup:setup-project:mver_bmad_v1_active",
              status: "completed",
            },
            actions: {
              primary: { kind: "open_transition", transitionExecutionId: "te-1" },
              openTransitionTarget: { transitionExecutionId: "te-1" },
              openWorkflowTarget: { workflowExecutionId: "we-1" },
            },
          },
        ]}
        activeLoading={false}
        activeErrorMessage={null}
        candidateCards={[
          {
            candidateCardId: "candidate-card-1",
            source: "future",
            workUnitContext: {
              workUnitTypeId: "seed:wut:brainstorming:mver_bmad_v1_active",
              workUnitTypeKey: "brainstorming",
              workUnitTypeName: "seed:wut:brainstorming:mver_bmad_v1_active",
              currentStateLabel: "",
            },
            summaries: {
              facts: { currentCount: 0, totalCount: 1 },
              artifactSlots: { currentCount: 0, totalCount: 1 },
            },
            transitions: [
              {
                candidateId: "candidate-1",
                transitionId: "transition-1",
                transitionKey: "activation_to_done",
                transitionName:
                  "seed:transition:brainstorming:activation-to-done:mver_bmad_v1_active",
                toStateKey: "done",
                toStateLabel: "Done",
                source: "future",
              },
            ],
          },
        ]}
        transitionResults={{
          "candidate-1": {
            result: "blocked",
            firstReason: "Project fact 'setup_work_unit' is missing",
          },
        }}
        completedCandidateCards={new Set(["candidate-card-1"])}
        streamStatus="done"
        streamErrorMessage={null}
        onOpenStartGate={() => {}}
      />,
    );

    expect(markup).toContain("SETUP");
    expect(markup).toContain("Activation");
    expect(markup).toContain("Done");
    expect(markup).toContain("Open transition detail");
    expect(markup).toContain("Open workflow detail");
    expect(markup).toContain("Start-gate drill-in");
    expect(markup).toContain("Blocked");
    expect(markup).not.toContain("mver_bmad_v1_active");
  });
});
