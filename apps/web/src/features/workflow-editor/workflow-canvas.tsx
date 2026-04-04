import { useMemo } from "react";
import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";

import type { WorkflowEditorEdge, WorkflowEditorSelection, WorkflowEditorStep } from "./types";

type WorkflowCanvasProps = {
  steps: readonly WorkflowEditorStep[];
  edges: readonly WorkflowEditorEdge[];
  selection: WorkflowEditorSelection;
  errorMessage: string | null;
  onSelectStep: (stepId: string) => void;
  onSelectEdge: (edgeId: string) => void;
  onConnect: (connection: { sourceStepKey: string; targetStepKey: string }) => void;
};

export function WorkflowCanvas({
  steps,
  edges,
  selection,
  errorMessage,
  onSelectStep,
  onSelectEdge,
  onConnect,
}: WorkflowCanvasProps) {
  const nodes = useMemo<Node[]>(
    () =>
      steps.map((step, index) => ({
        id: step.stepId,
        data: {
          label: (
            <div className="grid gap-0.5 text-left">
              <span className="text-[0.64rem] uppercase tracking-[0.14em] text-muted-foreground">
                form
              </span>
              <span className="font-medium uppercase tracking-[0.1em]">{step.payload.key}</span>
              {step.payload.label ? (
                <span className="text-xs text-muted-foreground">{step.payload.label}</span>
              ) : null}
            </div>
          ),
        },
        position: {
          x: 120 + (index % 3) * 260,
          y: 90 + Math.floor(index / 3) * 160,
        },
        style: {
          borderRadius: 0,
          border:
            selection?.kind === "step" && selection.stepId === step.stepId
              ? "1px solid color-mix(in oklab, var(--primary) 68%, transparent)"
              : "1px solid color-mix(in oklab, var(--border) 74%, transparent)",
          background: "color-mix(in oklab, var(--background) 88%, var(--card))",
          width: 220,
          padding: 8,
        },
      })),
    [selection, steps],
  );

  const edgesForCanvas = useMemo<Edge[]>(
    () =>
      edges
        .map((edge) => {
          const sourceNode = steps.find((step) => step.payload.key === edge.fromStepKey);
          const targetNode = steps.find((step) => step.payload.key === edge.toStepKey);

          if (!sourceNode || !targetNode) {
            return null;
          }

          return {
            id: edge.edgeId,
            source: sourceNode.stepId,
            target: targetNode.stepId,
            type: "smoothstep",
            markerEnd: { type: MarkerType.ArrowClosed },
            label: edge.descriptionMarkdown.length > 0 ? edge.descriptionMarkdown : undefined,
            style: {
              stroke:
                selection?.kind === "edge" && selection.edgeId === edge.edgeId
                  ? "var(--primary)"
                  : "color-mix(in oklab, var(--foreground) 52%, transparent)",
              strokeWidth: 1.5,
            },
            labelStyle: { fill: "var(--muted-foreground)", fontSize: 11 },
          } satisfies Edge;
        })
        .filter((entry): entry is Edge => entry !== null),
    [edges, selection, steps],
  );

  const onConnectRequest = (connection: Connection) => {
    if (!connection.source || !connection.target) {
      return;
    }

    const sourceStep = steps.find((step) => step.stepId === connection.source);
    const targetStep = steps.find((step) => step.stepId === connection.target);
    if (!sourceStep || !targetStep) {
      return;
    }

    onConnect({ sourceStepKey: sourceStep.payload.key, targetStepKey: targetStep.payload.key });
  };

  return (
    <section className="chiron-frame-flat chiron-tone-canvas grid h-[calc(100dvh-12rem)] min-h-[42rem] gap-2 p-2">
      {/* <div className="flex items-center justify-between gap-2 px-1"> */}
      {/*   <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">Workflow Canvas</p> */}
      {/*   {errorMessage ? ( */}
      {/*     <p className="text-xs font-medium text-destructive" role="alert"> */}
      {/*       {errorMessage} */}
      {/*     </p> */}
      {/*   ) : null} */}
      {/* </div> */}

      <div className="chiron-texture-canvas h-full overflow-hidden border border-border/70">
        <ReactFlowProvider>
          <ReactFlow
            fitView
            fitViewOptions={{ padding: 0.2, maxZoom: 1.25 }}
            minZoom={0.4}
            maxZoom={1.8}
            nodes={nodes}
            edges={edgesForCanvas}
            onConnect={onConnectRequest}
            onNodeClick={(_event, node) => onSelectStep(node.id)}
            onEdgeClick={(_event, edge) => onSelectEdge(edge.id)}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              color="color-mix(in oklab, var(--foreground) 20%, transparent)"
              gap={18}
              size={0.9}
            />
            <Controls position="bottom-right" showInteractive={false} />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </section>
  );
}
