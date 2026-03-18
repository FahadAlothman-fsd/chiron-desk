import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const reactFlowMocks = vi.hoisted(() => ({
  ReactFlow: vi.fn(({ children }: { children?: ReactNode }) => (
    <div data-testid="reactflow-canvas">{children}</div>
  )),
  ReactFlowProvider: vi.fn(({ children }: { children?: ReactNode }) => <>{children}</>),
  Background: vi.fn(() => <div data-testid="reactflow-background" />),
  Controls: vi.fn(() => <div data-testid="reactflow-controls" />),
}));

vi.mock("@xyflow/react", () => reactFlowMocks);

import { WorkUnitsGraphView } from "@/features/methodologies/work-units-graph-view";

describe("WorkUnitsGraphView", () => {
  it("renders a real React Flow canvas for the L1 graph", () => {
    render(
      <WorkUnitsGraphView
        rows={[
          {
            key: "WU.INTAKE",
            displayName: "Intake",
            transitionCount: 2,
            workflowCount: 1,
            factCount: 2,
            relationshipCount: 1,
          },
        ]}
        graph={{
          nodes: [
            {
              id: "wu:WU.INTAKE",
              type: "workUnit",
              position: { x: 80, y: 120 },
              data: { label: "Intake" },
            },
          ],
          edges: [],
        }}
        activeWorkUnitKey="WU.INTAKE"
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByTestId("reactflow-canvas")).toBeTruthy();
    expect(reactFlowMocks.ReactFlow).toHaveBeenCalled();
    expect(screen.getByTestId("reactflow-background")).toBeTruthy();
    expect(screen.getByTestId("reactflow-controls")).toBeTruthy();
  });
});
