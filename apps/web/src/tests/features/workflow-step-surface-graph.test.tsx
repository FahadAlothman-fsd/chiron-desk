import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: Array<string | null | undefined | false>) => classes.filter(Boolean).join(" "),
}));

vi.mock("@xyflow/react", () => ({
  Background: () => <div data-testid="reactflow-background" />,
  BaseEdge: () => <div data-testid="reactflow-base-edge" />,
  Controls: () => <div data-testid="reactflow-controls" />,
  Panel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Handle: () => <span data-testid="reactflow-handle" />,
  ReactFlow: ({
    nodes,
    edges,
    children,
  }: {
    nodes?: Array<{ id: string; data?: { step?: { stepKey?: string }; nodeState?: string } }>;
    edges?: Array<{ id: string; source: string; target: string; data?: { edgeState?: string } }>;
    children?: ReactNode;
  }) => (
    <div data-testid="mock-react-flow">
      {nodes?.map((node) => (
        <div key={node.id} data-node-id={node.id} data-node-state={node.data?.nodeState}>
          {node.data?.step?.stepKey ?? node.id}
        </div>
      ))}
      {edges?.map((edge) => (
        <div key={edge.id} data-edge-id={edge.id} data-edge-state={edge.data?.edgeState}>
          {edge.source}-{">"}
          {edge.target}
        </div>
      ))}
      {children}
    </div>
  ),
  MarkerType: { ArrowClosed: "arrow-closed" },
  Position: { Left: "left", Right: "right" },
  getSmoothStepPath: () => ["M0,0 L1,1"],
}));

import { WorkflowStepSurfaceGraph } from "@/features/projects/workflow-step-surface-graph";

describe("WorkflowStepSurfaceGraph", () => {
  it("renders completed, active, future, and selected branch edges", () => {
    const markup = renderToStaticMarkup(
      <WorkflowStepSurfaceGraph
        projectId="project-1"
        stepSurface={{
          state: "next_pending",
          afterStep: {
            stepExecutionId: "step-exec-branch",
            stepDefinitionId: "step-branch",
            stepType: "branch",
            status: "completed",
            activatedAt: "2026-03-28T12:03:10.000Z",
            completedAt: "2026-03-28T12:03:40.000Z",
            target: { page: "step-execution-detail", stepExecutionId: "step-exec-branch" },
          },
          nextStep: {
            stepDefinitionId: "step-next",
            stepType: "display",
            stepKey: "show_summary",
          },
        }}
        steps={[
          { stepDefinitionId: "step-entry", stepType: "form", stepKey: "capture_setup" },
          { stepDefinitionId: "step-branch", stepType: "branch", stepKey: "route_story" },
          { stepDefinitionId: "step-next", stepType: "display", stepKey: "show_summary" },
          { stepDefinitionId: "step-alt", stepType: "agent", stepKey: "agent_review" },
        ]}
        edges={[
          {
            edgeId: "edge-1",
            fromStepDefinitionId: "step-entry",
            toStepDefinitionId: "step-branch",
            kind: "linear",
          },
          {
            edgeId: "edge-2",
            fromStepDefinitionId: "step-branch",
            toStepDefinitionId: "step-next",
            kind: "branch_default",
          },
          {
            edgeId: "edge-3",
            fromStepDefinitionId: "step-branch",
            toStepDefinitionId: "step-alt",
            kind: "branch_conditional",
            routeId: "route-review",
          },
        ]}
        executions={[
          {
            stepExecutionId: "step-exec-entry",
            stepDefinitionId: "step-entry",
            stepType: "form",
            status: "completed",
            activatedAt: "2026-03-28T12:02:00.000Z",
            completedAt: "2026-03-28T12:03:00.000Z",
            target: { page: "step-execution-detail", stepExecutionId: "step-exec-entry" },
          },
          {
            stepExecutionId: "step-exec-branch",
            stepDefinitionId: "step-branch",
            stepType: "branch",
            status: "completed",
            activatedAt: "2026-03-28T12:03:10.000Z",
            completedAt: "2026-03-28T12:03:40.000Z",
            previousStepExecutionId: "step-exec-entry",
            target: { page: "step-execution-detail", stepExecutionId: "step-exec-branch" },
          },
        ]}
        branchSelections={[
          {
            stepExecutionId: "step-exec-branch",
            selectedTargetStepDefinitionId: "step-next",
            savedAt: "2026-03-28T12:03:35.000Z",
          },
        ]}
        activateWorkflowStep={async () => {}}
        isActivating={false}
        isCompleting={false}
      />,
    );

    expect(markup).toContain("workflow-step-surface-graph");
    expect(markup).toContain('data-node-id="step-entry"');
    expect(markup).toContain('data-node-state="completed"');
    expect(markup).toContain('data-node-id="step-next"');
    expect(markup).toContain('data-node-state="future"');
    expect(markup).toContain('data-edge-id="edge-2"');
    expect(markup).toContain('data-edge-state="branch_selected"');
    expect(markup).toContain('data-edge-state="branch"');
    expect(markup).toContain("Activate next step");
    expect(markup).toContain("Selected step");
  });
});
