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

  it("surfaces ready-to-start transitions in the active section when nothing is active", () => {
    const markup = renderToStaticMarkup(
      <RuntimeGuidanceSections
        projectId="project-1"
        activeCards={[]}
        activeLoading={false}
        activeErrorMessage={null}
        candidateCards={[
          {
            candidateCardId: "future-card-1",
            source: "future",
            workUnitContext: {
              workUnitTypeId: "seed:wut:brainstorming:mver_bmad_v1_active",
              workUnitTypeKey: "brainstorming",
              workUnitTypeName: "Brainstorming",
              currentStateLabel: "Not started",
            },
            summaries: {
              facts: { currentCount: 0, totalCount: 1 },
              artifactSlots: { currentCount: 0, totalCount: 1 },
            },
            transitions: [
              {
                candidateId: "future-transition-1",
                transitionId: "transition-1",
                transitionKey: "activation_to_done",
                transitionName: "Brainstorming activation to done",
                toStateKey: "done",
                toStateLabel: "Done",
                source: "future",
              },
            ],
          },
          {
            candidateCardId: "future-card-2",
            source: "future",
            workUnitContext: {
              workUnitTypeId: "seed:wut:qa:mver_bmad_v1_active",
              workUnitTypeKey: "qa",
              workUnitTypeName: "QA",
              currentStateLabel: "Not started",
            },
            summaries: {
              facts: { currentCount: 0, totalCount: 1 },
              artifactSlots: { currentCount: 0, totalCount: 1 },
            },
            transitions: [
              {
                candidateId: "future-transition-2",
                transitionId: "transition-2",
                transitionKey: "activation_to_ready",
                transitionName: "QA activation to ready",
                toStateKey: "ready",
                toStateLabel: "Ready",
                source: "future",
              },
            ],
          },
        ]}
        transitionResults={{
          "future-transition-1": { result: "available" },
          "future-transition-2": { result: "blocked", firstReason: "Missing fact" },
        }}
        completedCandidateCards={new Set()}
        streamStatus="done"
        streamErrorMessage={null}
        onOpenStartGate={() => {}}
      />,
    );

    expect(markup).toContain(
      "No transition is active. Showing the next transitions ready to start now.",
    );
    expect(markup).toContain("Available now");
    expect(markup).toContain("Brainstorming activation to done");
    expect(markup).toContain("1 ready");
    expect(markup).not.toContain("No active transition executions.");
  });
});
