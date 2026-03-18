import { useMemo } from "react";
import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
} from "@xyflow/react";

import type { GraphProjectionOutput } from "./version-graph";
import type { WorkUnitsPageRow } from "./work-units-page-selectors";

type WorkUnitsGraphViewProps = {
  rows: readonly WorkUnitsPageRow[];
  graph: GraphProjectionOutput;
  activeWorkUnitKey: string | null;
  onSelect: (workUnitKey: string) => void;
};

function keyFromNodeId(nodeId: string): string | null {
  return nodeId.startsWith("wu:") ? nodeId.slice(3) : null;
}

export function WorkUnitsGraphView(props: WorkUnitsGraphViewProps) {
  const rowByKey = new Map(props.rows.map((row) => [row.key, row]));
  const graphNodes = useMemo(
    () =>
      props.graph.nodes
        .map((node) => {
          const workUnitKey = keyFromNodeId(node.id);
          if (!workUnitKey) {
            return null;
          }

          const row = rowByKey.get(workUnitKey);
          if (!row) {
            return null;
          }

          return { node, row };
        })
        .filter(
          (
            entry,
          ): entry is { node: GraphProjectionOutput["nodes"][number]; row: WorkUnitsPageRow } =>
            entry !== null,
        ),
    [props.graph.nodes, rowByKey],
  );

  const flowNodes = useMemo<Node[]>(
    () =>
      graphNodes.map(({ node, row }) => ({
        id: node.id,
        position: node.position,
        draggable: false,
        selectable: true,
        data: { row },
        style: {
          width: 240,
          borderRadius: 0,
          border:
            row.key === props.activeWorkUnitKey
              ? "1px solid color-mix(in oklab, var(--primary) 75%, transparent)"
              : "1px solid color-mix(in oklab, var(--border) 70%, transparent)",
          background:
            row.key === props.activeWorkUnitKey
              ? "color-mix(in oklab, var(--primary) 10%, var(--background))"
              : "color-mix(in oklab, var(--background) 82%, transparent)",
          padding: 12,
        },
        sourcePosition: "right" as Node["sourcePosition"],
        targetPosition: "left" as Node["targetPosition"],
        type: "workUnitCard",
      })),
    [graphNodes, props.activeWorkUnitKey],
  );

  const flowEdges = useMemo<Edge[]>(
    () =>
      props.graph.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: "smoothstep",
        label: edge.label,
        animated: false,
        style: {
          stroke: "color-mix(in oklab, var(--primary) 50%, transparent)",
          strokeWidth: 1.5,
        },
        labelStyle: {
          fill: "var(--muted-foreground)",
          fontSize: 11,
        },
      })),
    [props.graph.edges],
  );

  if (props.rows.length === 0) {
    return (
      <div className="chiron-frame-flat p-4 text-sm text-muted-foreground">
        No work units yet. Add one to start defining design-time structure.
      </div>
    );
  }

  return (
    <div className="chiron-frame-flat h-[32rem] overflow-hidden">
      <ReactFlowProvider>
        <ReactFlow
          fitView
          fitViewOptions={{ padding: 0.18, minZoom: 0.5, maxZoom: 1.25 }}
          minZoom={0.4}
          maxZoom={1.8}
          nodes={flowNodes}
          edges={flowEdges}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
          nodesFocusable
          edgesFocusable
          proOptions={{ hideAttribution: true }}
          onNodeClick={(_event, node) => {
            const workUnitKey = keyFromNodeId(node.id);
            if (workUnitKey) {
              props.onSelect(workUnitKey);
            }
          }}
          nodeTypes={{
            workUnitCard: ({ data }: { data: { row: WorkUnitsPageRow } }) => {
              const row = data.row;
              return (
                <div className="flex w-[240px] flex-col gap-2 text-left">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{row.displayName}</p>
                      <p className="text-xs text-muted-foreground">{row.key}</p>
                    </div>
                    <span className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                      Work Unit
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{row.transitionCount} transitions</span>
                    <span>{row.workflowCount} workflows</span>
                    <span>{row.factCount} facts</span>
                    <span>{row.relationshipCount} relationships</span>
                  </div>
                </div>
              );
            },
          }}
        >
          <Background
            gap={24}
            size={2}
            color="color-mix(in oklab, var(--muted-foreground) 30%, transparent)"
          />
          <Controls />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}
