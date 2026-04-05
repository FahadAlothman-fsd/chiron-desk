import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Panel,
  Position,
  ReactFlow,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
} from "@xyflow/react";

import { Button } from "../../components/ui/button";
import {
  STEP_TYPE_COLORS,
  STEP_TYPE_ICON_CODES,
  STEP_TYPE_LABELS,
  type WorkflowEditorEdge,
  type WorkflowEditorNodePosition,
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

type WorkflowCanvasNodeData = {
  step: WorkflowEditorStep;
  isSelected: boolean;
};

type WorkflowCanvasNode = Node<WorkflowCanvasNodeData, "workflowStep">;

type WorkflowCanvasProps = {
  steps: readonly WorkflowEditorStep[];
  edges: readonly WorkflowEditorEdge[];
  selection: WorkflowEditorSelection;
  errorMessage: string | null;
  onSelectStep: (stepId: string) => void;
  onSelectEdge: (edgeId: string) => void;
  onConnect: (connection: { sourceStepKey: string; targetStepKey: string }) => void;
};

const WORKFLOW_CANVAS_FIT_VIEW_OPTIONS = {
  padding: 0.2,
  maxZoom: 1.25,
  minZoom: 0.5,
} as const;

const WORKFLOW_CANVAS_NODE_WIDTH = 236;
const WORKFLOW_CANVAS_NODE_HEIGHT = 132;

function getGridPosition(index: number): WorkflowEditorNodePosition {
  return {
    x: 120 + (index % 3) * 260,
    y: 90 + Math.floor(index / 3) * 160,
  };
}

function toOrderedStepIds(
  steps: readonly WorkflowEditorStep[],
  edges: readonly WorkflowEditorEdge[],
): string[] {
  const stepIdByKey = new Map(steps.map((step) => [step.payload.key, step.stepId]));
  const originalIndex = new Map(steps.map((step, index) => [step.stepId, index]));
  const outgoing = new Map<string, string[]>();
  const indegree = new Map<string, number>();

  steps.forEach((step) => {
    outgoing.set(step.stepId, []);
    indegree.set(step.stepId, 0);
  });

  edges.forEach((edge) => {
    const sourceId = stepIdByKey.get(edge.fromStepKey);
    const targetId = stepIdByKey.get(edge.toStepKey);

    if (!sourceId || !targetId || sourceId === targetId) {
      return;
    }

    outgoing.get(sourceId)?.push(targetId);
    indegree.set(targetId, (indegree.get(targetId) ?? 0) + 1);
  });

  const queue = steps
    .map((step) => step.stepId)
    .filter((stepId) => (indegree.get(stepId) ?? 0) === 0)
    .sort((left, right) => (originalIndex.get(left) ?? 0) - (originalIndex.get(right) ?? 0));

  const ordered: string[] = [];

  while (queue.length > 0) {
    const stepId = queue.shift();
    if (!stepId) {
      continue;
    }

    ordered.push(stepId);

    const nextStepIds = [...(outgoing.get(stepId) ?? [])].sort(
      (left, right) => (originalIndex.get(left) ?? 0) - (originalIndex.get(right) ?? 0),
    );

    nextStepIds.forEach((nextStepId) => {
      const nextIndegree = (indegree.get(nextStepId) ?? 0) - 1;
      indegree.set(nextStepId, nextIndegree);

      if (nextIndegree === 0) {
        queue.push(nextStepId);
        queue.sort(
          (left, right) => (originalIndex.get(left) ?? 0) - (originalIndex.get(right) ?? 0),
        );
      }
    });
  }

  steps
    .map((step) => step.stepId)
    .filter((stepId) => !ordered.includes(stepId))
    .sort((left, right) => (originalIndex.get(left) ?? 0) - (originalIndex.get(right) ?? 0))
    .forEach((stepId) => {
      ordered.push(stepId);
    });

  return ordered;
}

function getDeterministicLayoutPositions(
  steps: readonly WorkflowEditorStep[],
  edges: readonly WorkflowEditorEdge[],
) {
  const orderedStepIds = toOrderedStepIds(steps, edges);
  const stepIdByKey = new Map(steps.map((step) => [step.payload.key, step.stepId]));
  const originalIndex = new Map(steps.map((step, index) => [step.stepId, index]));
  const outgoing = new Map<string, string[]>();
  const levels = new Map<string, number>();

  orderedStepIds.forEach((stepId) => {
    outgoing.set(stepId, []);
    levels.set(stepId, 0);
  });

  edges.forEach((edge) => {
    const sourceId = stepIdByKey.get(edge.fromStepKey);
    const targetId = stepIdByKey.get(edge.toStepKey);

    if (!sourceId || !targetId || sourceId === targetId) {
      return;
    }

    outgoing.get(sourceId)?.push(targetId);
  });

  orderedStepIds.forEach((stepId) => {
    const nextLevel = levels.get(stepId) ?? 0;

    [...(outgoing.get(stepId) ?? [])]
      .sort((left, right) => (originalIndex.get(left) ?? 0) - (originalIndex.get(right) ?? 0))
      .forEach((targetStepId) => {
        levels.set(targetStepId, Math.max(levels.get(targetStepId) ?? 0, nextLevel + 1));
      });
  });

  const rowsByLevel = new Map<number, string[]>();

  orderedStepIds.forEach((stepId) => {
    const level = levels.get(stepId) ?? 0;
    const rows = rowsByLevel.get(level) ?? [];
    rows.push(stepId);
    rowsByLevel.set(level, rows);
  });

  return Object.fromEntries(
    [...rowsByLevel.entries()].flatMap(([level, stepIds]) =>
      stepIds.map((stepId, rowIndex) => [
        stepId,
        {
          x: 120 + level * 320,
          y: 90 + rowIndex * 200,
        },
      ]),
    ),
  ) as Record<string, WorkflowEditorNodePosition>;
}

function getWorkflowCanvasBounds(nodes: readonly WorkflowCanvasNode[]) {
  if (nodes.length === 0) {
    return null;
  }

  const minX = Math.min(...nodes.map((node) => node.position.x));
  const minY = Math.min(...nodes.map((node) => node.position.y));
  const maxX = Math.max(...nodes.map((node) => node.position.x + WORKFLOW_CANVAS_NODE_WIDTH));
  const maxY = Math.max(...nodes.map((node) => node.position.y + WORKFLOW_CANVAS_NODE_HEIGHT));

  return {
    x: minX,
    y: minY,
    width: Math.max(maxX - minX, WORKFLOW_CANVAS_NODE_WIDTH),
    height: Math.max(maxY - minY, WORKFLOW_CANVAS_NODE_HEIGHT),
  };
}

function WorkflowStepNode({ data }: NodeProps<WorkflowCanvasNode>) {
  const { step, isSelected } = data;

  return (
    <div
      className={[
        "chiron-cut-frame-heavy",
        "overflow-visible",
        "shadow-none",
        STEP_TYPE_ACCENT_CLASS_NAMES[step.stepType],
      ].join(" ")}
      style={
        {
          "--frame-bg": "var(--background)",
          "--frame-border": isSelected
            ? "color-mix(in oklab, currentColor 42%, var(--foreground))"
            : "color-mix(in oklab, currentColor 18%, var(--border))",
          "--frame-corner": "color-mix(in oklab, currentColor 82%, var(--foreground))",
          background: "var(--background)",
          borderRadius: 0,
          width: WORKFLOW_CANVAS_NODE_WIDTH,
          minHeight: WORKFLOW_CANVAS_NODE_HEIGHT,
          padding: 0,
          boxShadow: isSelected
            ? "0 0 0 1px color-mix(in oklab, currentColor 28%, transparent)"
            : "none",
        } as WorkflowStepNodeStyle
      }
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!size-2 !rounded-none !border !border-foreground/60 !bg-background"
      />
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
      <Handle
        type="source"
        position={Position.Right}
        className="!size-2 !rounded-none !border !border-foreground/60 !bg-background"
      />
    </div>
  );
}

const WORKFLOW_CANVAS_NODE_TYPES = {
  workflowStep: WorkflowStepNode,
} as const;

export function WorkflowCanvas({
  steps,
  edges,
  selection,
  onSelectStep,
  onSelectEdge,
  onConnect,
}: WorkflowCanvasProps) {
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance<
    WorkflowCanvasNode,
    Edge
  > | null>(null);

  const layoutPositions = useMemo(
    () =>
      steps.length > 0
        ? getDeterministicLayoutPositions(steps, edges)
        : ({} as Record<string, WorkflowEditorNodePosition>),
    [edges, steps],
  );

  const baseNodes = useMemo<WorkflowCanvasNode[]>(
    () =>
      steps.map((step, index) => ({
        id: step.stepId,
        data: {
          step,
          isSelected: selection?.kind === "step" && selection.stepId === step.stepId,
        },
        type: "workflowStep",
        position: layoutPositions[step.stepId] ?? getGridPosition(index),
        width: WORKFLOW_CANVAS_NODE_WIDTH,
        height: WORKFLOW_CANVAS_NODE_HEIGHT,
        style: {
          background: "transparent",
          border: "none",
          borderRadius: 0,
          width: WORKFLOW_CANVAS_NODE_WIDTH,
          height: WORKFLOW_CANVAS_NODE_HEIGHT,
          padding: 0,
          boxShadow: "none",
        },
      })),
    [layoutPositions, selection, steps],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowCanvasNode>(baseNodes);

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

  const layoutNodePositionsSignature = useMemo(
    () =>
      baseNodes
        .map((node) => {
          const position = node.position;
          return `${node.id}:${position.x}:${position.y}`;
        })
        .join("|"),
    [baseNodes],
  );

  useEffect(() => {
    setNodes((previous) =>
      baseNodes.map((node) => {
        const currentNode = previous.find((entry) => entry.id === node.id);

        return {
          ...node,
          position: currentNode?.position ?? node.position,
          ...(currentNode?.measured ? { measured: currentNode.measured } : {}),
        };
      }),
    );
  }, [baseNodes, setNodes]);

  const layoutBounds = useMemo(() => getWorkflowCanvasBounds(baseNodes), [baseNodes]);

  const focusLayout = useCallback(
    (instance?: ReactFlowInstance<WorkflowCanvasNode, Edge> | null) => {
      const targetInstance = instance ?? reactFlowInstance;
      const bounds = layoutBounds;

      if (!targetInstance || !bounds) {
        return;
      }

      void targetInstance.fitBounds(bounds, WORKFLOW_CANVAS_FIT_VIEW_OPTIONS);
    },
    [layoutBounds, reactFlowInstance],
  );

  const focusCurrentNodes = useCallback(
    (instance?: ReactFlowInstance<WorkflowCanvasNode, Edge> | null) => {
      const targetInstance = instance ?? reactFlowInstance;
      const bounds = getWorkflowCanvasBounds(nodes);

      if (!targetInstance || !bounds) {
        return;
      }

      void targetInstance.fitBounds(bounds, WORKFLOW_CANVAS_FIT_VIEW_OPTIONS);
    },
    [nodes, reactFlowInstance],
  );

  useEffect(() => {
    if (!reactFlowInstance || layoutNodePositionsSignature.length === 0) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      focusLayout(reactFlowInstance);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [focusLayout, layoutNodePositionsSignature, reactFlowInstance]);

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
    <section className="chiron-frame-flat chiron-tone-canvas relative h-[calc(100dvh-12rem)] min-h-[42rem] p-2">
      <div className="chiron-texture-canvas relative h-full overflow-hidden border border-border/70">
        <ReactFlow
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          minZoom={0.4}
          maxZoom={1.8}
          nodes={nodes}
          edges={edgesForCanvas}
          nodeTypes={WORKFLOW_CANVAS_NODE_TYPES}
          nodesDraggable
          preventScrolling={false}
          zoomOnScroll={false}
          onInit={setReactFlowInstance}
          onNodesChange={onNodesChange}
          onConnect={onConnectRequest}
          onNodeClick={(_event, node) => onSelectStep(node.id)}
          onEdgeClick={(_event, edge) => onSelectEdge(edge.id)}
          proOptions={{ hideAttribution: true }}
        >
          <Panel position="top-left">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-none bg-background/90 shadow-[0_0_0_1px_color-mix(in_oklab,var(--foreground)_18%,transparent)]"
              onClick={() => {
                focusCurrentNodes();
              }}
            >
              Fit view
            </Button>
          </Panel>
          <Background
            color="color-mix(in oklab, var(--foreground) 20%, transparent)"
            gap={18}
            size={0.9}
          />
          <Controls position="bottom-right" showInteractive={false} />
        </ReactFlow>
      </div>
    </section>
  );
}
