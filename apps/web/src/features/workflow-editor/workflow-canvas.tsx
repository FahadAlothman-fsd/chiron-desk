import { useMemo, type CSSProperties } from "react";
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

import {
  STEP_TYPE_COLORS,
  STEP_TYPE_ICON_CODES,
  STEP_TYPE_LABELS,
  type WorkflowEditorEdge,
  type WorkflowEditorSelection,
  type WorkflowEditorStep,
  type WorkflowEditorStepType,
} from "./types";

const STEP_TYPE_BADGE_CLASS_NAMES: Record<WorkflowEditorStepType, string> = {
  form: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-200",
  agent: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-200",
  action: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
  invoke: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200",
  branch: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-200",
  display: "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-200",
};

const STEP_TYPE_ACCENT_CLASS_NAMES: Record<WorkflowEditorStepType, string> = {
  form: "text-sky-400 dark:text-sky-300",
  agent: "text-violet-400 dark:text-violet-300",
  action: "text-emerald-400 dark:text-emerald-300",
  invoke: "text-amber-400 dark:text-amber-300",
  branch: "text-rose-400 dark:text-rose-300",
  display: "text-slate-300 dark:text-slate-200",
};

type WorkflowStepNodeStyle = CSSProperties & {
  "--frame-bg": string;
  "--frame-border": string;
  "--frame-corner": string;
};

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
  onSelectStep,
  onSelectEdge,
  onConnect,
}: WorkflowCanvasProps) {
  const nodes = useMemo<Node[]>(
    () =>
      steps.map((step, index) => ({
        id: step.stepId,
        className: [
          "chiron-cut-frame-heavy",
          "overflow-visible",
          "shadow-none",
          STEP_TYPE_ACCENT_CLASS_NAMES[step.stepType],
        ].join(" "),
        data: {
          label: (
            <div className="relative z-[2] grid gap-3 p-3 text-left text-foreground">
              <div className="flex items-start justify-between gap-3">
                <span
                  className={[
                    "inline-flex w-fit items-center gap-1.5 rounded-full border px-2 py-1 text-[0.62rem] uppercase tracking-[0.12em]",
                    STEP_TYPE_BADGE_CLASS_NAMES[step.stepType],
                  ].join(" ")}
                >
                  <img
                    src={`/visuals/workflow-editor/step-types/asset-${STEP_TYPE_ICON_CODES[step.stepType]}.svg`}
                    alt=""
                    aria-hidden="true"
                    className="size-3.5 shrink-0 object-contain invert brightness-150 contrast-125"
                  />
                  <span>{STEP_TYPE_LABELS[step.stepType]}</span>
                </span>
                <span className="text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground/80">
                  {STEP_TYPE_COLORS[step.stepType]}
                </span>
              </div>

              <div className="grid gap-1.5">
                <span className="font-geist-pixel-square text-sm uppercase tracking-[0.14em] text-foreground">
                  {step.payload.key}
                </span>
                <span className="text-[0.64rem] uppercase tracking-[0.18em] text-muted-foreground">
                  Workflow step
                </span>
              </div>

              {step.payload.label ? (
                <span className="max-w-[22ch] text-xs/relaxed text-muted-foreground">
                  {step.payload.label}
                </span>
              ) : null}
            </div>
          ),
        },
        position: {
          x: 120 + (index % 3) * 260,
          y: 90 + Math.floor(index / 3) * 160,
        },
        style: {
          "--frame-bg": "var(--background)",
          "--frame-border":
            selection?.kind === "step" && selection.stepId === step.stepId
              ? "color-mix(in oklab, currentColor 42%, var(--foreground))"
              : "color-mix(in oklab, currentColor 18%, var(--border))",
          "--frame-corner": "color-mix(in oklab, currentColor 82%, var(--foreground))",
          background: "var(--background)",
          borderRadius: 0,
          width: 236,
          padding: 0,
          boxShadow:
            selection?.kind === "step" && selection.stepId === step.stepId
              ? "0 0 0 1px color-mix(in oklab, currentColor 28%, transparent)"
              : "none",
        } satisfies WorkflowStepNodeStyle,
      })),
    [selection, steps],
  );

  const edgesForCanvas = useMemo<Edge[]>(
    () =>
      edges.flatMap<Edge>((edge) => {
        const sourceNode = steps.find((step) => step.payload.key === edge.fromStepKey);
        const targetNode = steps.find((step) => step.payload.key === edge.toStepKey);

        if (!sourceNode || !targetNode) {
          return [];
        }

        return [
          {
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
          } satisfies Edge,
        ];
      }),
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
    <section className="chiron-frame-flat chiron-tone-canvas h-[calc(100dvh-12rem)] min-h-[42rem] p-2">
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
