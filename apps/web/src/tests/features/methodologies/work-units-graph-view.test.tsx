import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const reactFlowMocks = vi.hoisted(() => ({
  Position: {
    Left: "left",
    Right: "right",
  },
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

  it("uses wider expandable nodes with Summary and Guidance tabs", () => {
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

    const reactFlowProps = reactFlowMocks.ReactFlow.mock.calls.at(-1)?.[0] as {
      nodes: Array<{ style?: { width?: number } }>;
      nodeTypes: {
        workUnitCard: (props: {
          data: {
            row: { key: string; displayName: string };
            isExpanded: boolean;
            activeTab: "summary" | "guidance";
            onToggleExpand: () => void;
            onTabChange: (tab: "summary" | "guidance") => void;
          };
        }) => ReactNode;
      };
    };

    expect(reactFlowProps.nodes[0]?.style?.width).toBe(320);

    const nodeRenderer = reactFlowProps.nodeTypes.workUnitCard;
    render(
      <>
        {nodeRenderer({
          data: {
            row: {
              key: "WU.INTAKE",
              displayName: "Intake",
            },
            isExpanded: true,
            activeTab: "guidance",
            onToggleExpand: vi.fn(),
            onTabChange: vi.fn(),
          },
        })}
      </>,
    );

    expect(screen.getByRole("button", { name: "Collapse node details" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Summary" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Guidance" })).toBeTruthy();
    expect(screen.getByText("No human guidance yet.")).toBeTruthy();
    expect(screen.getByText("No agent guidance yet.")).toBeTruthy();
  });

  it("keeps graph nodes selectable for active work unit routing", () => {
    const onSelect = vi.fn();

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
        activeWorkUnitKey={null}
        onSelect={onSelect}
      />,
    );

    const reactFlowProps = reactFlowMocks.ReactFlow.mock.calls.at(-1)?.[0] as {
      onNodeClick: (_event: unknown, node: { id: string }) => void;
    };
    reactFlowProps.onNodeClick({}, { id: "wu:WU.INTAKE" });

    expect(onSelect).toHaveBeenCalledWith("WU.INTAKE");
  });
});
