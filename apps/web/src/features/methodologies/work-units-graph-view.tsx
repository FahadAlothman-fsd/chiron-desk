import { useMemo, useState } from "react";
import {
  Background,
  Controls,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
} from "@xyflow/react";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { GraphProjectionOutput } from "./version-graph";
import type { WorkUnitsPageRow } from "./work-units-page-selectors";

type WorkUnitsGraphViewProps = {
  rows: readonly WorkUnitsPageRow[];
  graph: GraphProjectionOutput;
  activeWorkUnitKey: string | null;
  onSelect: (workUnitKey: string) => void;
};

type GraphNodeTab = "summary" | "guidance";

type WorkUnitNodeData = {
  row: WorkUnitsPageRow;
  isExpanded: boolean;
  activeTab: GraphNodeTab;
  onToggleExpand: () => void;
  onTabChange: (tab: GraphNodeTab) => void;
};

function keyFromNodeId(nodeId: string): string | null {
  return nodeId.startsWith("wu:") ? nodeId.slice(3) : null;
}

function WorkUnitGraphCardNode({ data }: { data: WorkUnitNodeData }) {
  const row = data.row;
  const isSummaryTab = data.activeTab === "summary";
  const cardinality =
    row.cardinality === "one_per_project"
      ? "One per project"
      : row.cardinality === "many_per_project"
        ? "Many per project"
        : row.cardinality;
  const description = row.description.trim().length > 0 ? row.description : "No description yet.";
  const humanGuidance =
    row.humanGuidance.trim().length > 0 ? row.humanGuidance : "No human guidance yet.";
  const agentGuidance =
    row.agentGuidance.trim().length > 0 ? row.agentGuidance : "No agent guidance yet.";

  return (
    <div className="flex w-[320px] flex-col gap-2 text-left">
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

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 rounded-none px-2 text-[0.68rem] uppercase tracking-[0.16em]"
        onClick={(event) => {
          event.stopPropagation();
          data.onToggleExpand();
        }}
      >
        {data.isExpanded ? (
          <ChevronUpIcon className="mr-1 size-3" aria-hidden="true" />
        ) : (
          <ChevronDownIcon className="mr-1 size-3" aria-hidden="true" />
        )}
        {data.isExpanded ? "Collapse" : "Expand"}
      </Button>

      {data.isExpanded ? (
        <div className="space-y-2 border border-border/70 bg-background/70 p-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={isSummaryTab ? "default" : "outline"}
              className="h-7 rounded-none px-2 text-[0.64rem] uppercase tracking-[0.14em]"
              onClick={(event) => {
                event.stopPropagation();
                data.onTabChange("summary");
              }}
            >
              Summary
            </Button>
            <Button
              type="button"
              size="sm"
              variant={!isSummaryTab ? "default" : "outline"}
              className="h-7 rounded-none px-2 text-[0.64rem] uppercase tracking-[0.14em]"
              onClick={(event) => {
                event.stopPropagation();
                data.onTabChange("guidance");
              }}
            >
              Guidance
            </Button>
          </div>

          {isSummaryTab ? (
            <div className="grid gap-2 border border-border/60 bg-background/60 p-2 text-xs">
              <div>
                <p className="text-[0.64rem] uppercase tracking-[0.14em] text-muted-foreground">
                  Cardinality
                </p>
                <p className="mt-1">{cardinality}</p>
              </div>
              <div>
                <p className="text-[0.64rem] uppercase tracking-[0.14em] text-muted-foreground">
                  Description
                </p>
                <p className="mt-1 whitespace-pre-wrap">{description}</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-2 border border-border/60 bg-background/60 p-2 text-xs">
              <div>
                <p className="text-[0.64rem] uppercase tracking-[0.14em] text-muted-foreground">
                  Human Guidance
                </p>
                <p className="mt-1 whitespace-pre-wrap">{humanGuidance}</p>
              </div>
              <div>
                <p className="text-[0.64rem] uppercase tracking-[0.14em] text-muted-foreground">
                  Agent Guidance
                </p>
                <p className="mt-1 whitespace-pre-wrap">{agentGuidance}</p>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function WorkUnitsGraphView(props: WorkUnitsGraphViewProps) {
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [nodeTabs, setNodeTabs] = useState<Record<string, GraphNodeTab>>({});

  const rowByKey = useMemo(() => new Map(props.rows.map((row) => [row.key, row])), [props.rows]);
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
        data: {
          row,
          isExpanded: expandedNodes[row.key] ?? false,
          activeTab: nodeTabs[row.key] ?? "summary",
          onToggleExpand: () => {
            setExpandedNodes((previous) => ({
              ...previous,
              [row.key]: !previous[row.key],
            }));
          },
          onTabChange: (tab: GraphNodeTab) => {
            setNodeTabs((previous) => ({
              ...previous,
              [row.key]: tab,
            }));
          },
        },
        style: {
          width: 320,
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
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        type: "workUnitCard",
      })),
    [expandedNodes, graphNodes, nodeTabs, props.activeWorkUnitKey],
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
            workUnitCard: ({ data }: { data: WorkUnitNodeData }) => (
              <WorkUnitGraphCardNode data={data} />
            ),
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
