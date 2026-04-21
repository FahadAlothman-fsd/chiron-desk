import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  Background,
  BaseEdge,
  Controls,
  MarkerType,
  Panel,
  Position,
  ReactFlow,
  getSmoothStepPath,
  Handle,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Link } from "@tanstack/react-router";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  DetailCode,
  DetailLabel,
  DetailPrimary,
  ExecutionBadge,
  getStepTypeTone,
} from "@/features/projects/execution-detail-visuals";
import {
  STEP_TYPE_ICON_CODES,
  STEP_TYPE_LABELS,
  type WorkflowEditorStepType,
} from "@/features/workflow-editor/types";
import { cn } from "@/lib/utils";

type WorkflowStepSurface =
  | {
      state: "entry_pending";
      entryStep: { stepDefinitionId: string; stepType: string; stepKey?: string };
    }
  | {
      state: "active_step";
      activeStep: {
        stepExecutionId: string;
        stepDefinitionId: string;
        stepType: string;
        status: "active" | "completed";
        activatedAt: string;
        completedAt?: string;
        target: { page: "step-execution-detail"; stepExecutionId: string };
      };
    }
  | {
      state: "next_pending";
      afterStep: {
        stepExecutionId: string;
        stepDefinitionId: string;
        stepType: string;
        status: "active" | "completed";
        activatedAt: string;
        completedAt?: string;
        target: { page: "step-execution-detail"; stepExecutionId: string };
      };
      nextStep: { stepDefinitionId: string; stepType: string; stepKey?: string };
    }
  | {
      state: "terminal_no_next_step";
      terminalStep?: {
        stepExecutionId: string;
        stepDefinitionId: string;
        stepType: string;
        status: "active" | "completed";
        activatedAt: string;
        completedAt?: string;
        target: { page: "step-execution-detail"; stepExecutionId: string };
      };
    }
  | {
      state: "invalid_definition";
      reason: "missing_entry_step" | "ambiguous_entry_step";
    };

export type WorkflowStepGraphDefinitionStep = {
  stepDefinitionId: string;
  stepType: WorkflowEditorStepType;
  stepKey: string;
  stepLabel?: string;
  descriptionMarkdown?: string;
};

export type WorkflowStepGraphDefinitionEdge = {
  edgeId: string;
  fromStepDefinitionId: string;
  toStepDefinitionId: string;
  kind: "linear" | "branch_default" | "branch_conditional";
  routeId?: string;
};

export type WorkflowStepGraphRuntimeExecution = {
  stepExecutionId: string;
  stepDefinitionId: string;
  stepType: WorkflowEditorStepType;
  status: "active" | "completed";
  activatedAt: string;
  completedAt?: string;
  previousStepExecutionId?: string;
  target: { page: "step-execution-detail"; stepExecutionId: string };
};

export type WorkflowStepGraphBranchSelection = {
  stepExecutionId: string;
  selectedTargetStepDefinitionId: string | null;
  savedAt?: string;
};

type WorkflowStepNodeState = "completed" | "active" | "future";
type WorkflowStepEdgeState =
  | "completed"
  | "completed_to_current"
  | "completed_to_next"
  | "branch"
  | "branch_selected"
  | "future";

type WorkflowStepGraphNodeData = {
  step: WorkflowStepGraphDefinitionStep;
  nodeState: WorkflowStepNodeState;
  execution?: WorkflowStepGraphRuntimeExecution;
  isEntry: boolean;
  isSelected: boolean;
};

type WorkflowStepGraphEdgeData = {
  edgeState: WorkflowStepEdgeState;
};

type WorkflowStepGraphNode = Node<WorkflowStepGraphNodeData, "workflow-step-runtime">;

type WorkflowStepSurfaceGraphProps = {
  projectId: string;
  stepSurface: WorkflowStepSurface;
  steps: readonly WorkflowStepGraphDefinitionStep[];
  edges: readonly WorkflowStepGraphDefinitionEdge[];
  executions: readonly WorkflowStepGraphRuntimeExecution[];
  branchSelections: readonly WorkflowStepGraphBranchSelection[];
  activateWorkflowStep: () => Promise<void>;
  isActivating: boolean;
  completeWorkflow?: () => void;
  isCompleting: boolean;
};

const FIT_VIEW_OPTIONS = { padding: 0.16, maxZoom: 1.15, minZoom: 0.45 } as const;
const NODE_WIDTH = 272;
const NODE_HEIGHT = 154;

const NODE_FRAME_CLASS_NAMES: Record<WorkflowStepNodeState, string> = {
  completed:
    "border-sky-500/45 bg-sky-500/10 text-sky-100 shadow-[0_0_0_1px_rgba(56,189,248,0.14)]",
  active:
    "border-lime-400/70 bg-lime-400/12 text-lime-50 shadow-[0_0_0_1px_rgba(163,230,53,0.28),0_0_24px_rgba(163,230,53,0.16)]",
  future: "border-border/70 bg-background/80 text-foreground",
};

const NODE_STATUS_BADGE_CLASS_NAMES: Record<WorkflowStepNodeState, string> = {
  completed: "border-sky-500/40 bg-sky-500/12 text-sky-200",
  active: "border-lime-500/40 bg-lime-500/12 text-lime-200",
  future: "border-border/70 bg-background/60 text-muted-foreground",
};

function formatTimestamp(value?: string) {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function renderStepSurfaceLabel(state: WorkflowStepSurface["state"]) {
  return state.replaceAll("_", " ");
}

function getGraphStepLabel(step: WorkflowStepGraphDefinitionStep) {
  return step.stepLabel?.trim() || step.stepKey;
}

function getDefaultSelectedStepDefinitionId(params: {
  stepSurface: WorkflowStepSurface;
  steps: readonly WorkflowStepGraphDefinitionStep[];
}) {
  const { stepSurface, steps } = params;

  switch (stepSurface.state) {
    case "entry_pending":
      return stepSurface.entryStep.stepDefinitionId;
    case "active_step":
      return stepSurface.activeStep.stepDefinitionId;
    case "next_pending":
      return stepSurface.nextStep.stepDefinitionId;
    case "terminal_no_next_step":
      return stepSurface.terminalStep?.stepDefinitionId ?? steps[0]?.stepDefinitionId ?? null;
    case "invalid_definition":
      return steps[0]?.stepDefinitionId ?? null;
  }
}

function toOrderedStepIds(
  steps: readonly WorkflowStepGraphDefinitionStep[],
  edges: readonly WorkflowStepGraphDefinitionEdge[],
): string[] {
  const originalIndex = new Map(steps.map((step, index) => [step.stepDefinitionId, index]));
  const outgoing = new Map<string, string[]>();
  const indegree = new Map<string, number>();

  steps.forEach((step) => {
    outgoing.set(step.stepDefinitionId, []);
    indegree.set(step.stepDefinitionId, 0);
  });

  edges.forEach((edge) => {
    if (edge.fromStepDefinitionId === edge.toStepDefinitionId) {
      return;
    }

    outgoing.get(edge.fromStepDefinitionId)?.push(edge.toStepDefinitionId);
    indegree.set(edge.toStepDefinitionId, (indegree.get(edge.toStepDefinitionId) ?? 0) + 1);
  });

  const queue = steps
    .map((step) => step.stepDefinitionId)
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
    .map((step) => step.stepDefinitionId)
    .filter((stepId) => !ordered.includes(stepId))
    .sort((left, right) => (originalIndex.get(left) ?? 0) - (originalIndex.get(right) ?? 0))
    .forEach((stepId) => {
      ordered.push(stepId);
    });

  return ordered;
}

function getLayoutPositions(
  steps: readonly WorkflowStepGraphDefinitionStep[],
  edges: readonly WorkflowStepGraphDefinitionEdge[],
) {
  const orderedStepIds = toOrderedStepIds(steps, edges);
  const originalIndex = new Map(steps.map((step, index) => [step.stepDefinitionId, index]));
  const outgoing = new Map<string, string[]>();
  const levels = new Map<string, number>();

  orderedStepIds.forEach((stepId) => {
    outgoing.set(stepId, []);
    levels.set(stepId, 0);
  });

  edges.forEach((edge) => {
    outgoing.get(edge.fromStepDefinitionId)?.push(edge.toStepDefinitionId);
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
          x: 96 + level * 340,
          y: 80 + rowIndex * 216,
        },
      ]),
    ),
  ) as Record<string, { x: number; y: number }>;
}

function getBounds(nodes: readonly WorkflowStepGraphNode[]) {
  if (nodes.length === 0) {
    return null;
  }

  const minX = Math.min(...nodes.map((node) => node.position.x));
  const minY = Math.min(...nodes.map((node) => node.position.y));
  const maxX = Math.max(...nodes.map((node) => node.position.x + NODE_WIDTH));
  const maxY = Math.max(...nodes.map((node) => node.position.y + NODE_HEIGHT));

  return {
    x: minX,
    y: minY,
    width: Math.max(maxX - minX, NODE_WIDTH),
    height: Math.max(maxY - minY, NODE_HEIGHT),
  };
}

function WorkflowStepRuntimeNode({ data, selected }: NodeProps<WorkflowStepGraphNode>) {
  const stepTypeLabel = STEP_TYPE_LABELS[data.step.stepType];
  const stepTypeIconCode = STEP_TYPE_ICON_CODES[data.step.stepType];

  return (
    <div
      data-testid={`workflow-step-node-${data.step.stepDefinitionId}`}
      data-node-state={data.nodeState}
      className={cn(
        "relative grid min-h-[154px] w-[272px] gap-3 overflow-hidden border px-4 py-3 text-left transition-colors",
        NODE_FRAME_CLASS_NAMES[data.nodeState],
        data.nodeState === "future" ? "border-dashed" : "border-solid",
        selected ? "ring-1 ring-primary/45" : "ring-0",
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!size-2.5 !rounded-full !border !border-border/80 !bg-background"
      />
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 border border-border/70 bg-background/70 px-2 py-1 text-[0.62rem] uppercase tracking-[0.12em] text-foreground/90">
              <img
                src={`/visuals/workflow-editor/step-types/asset-${stepTypeIconCode}.svg`}
                alt=""
                aria-hidden="true"
                className="size-3.5 shrink-0 object-contain invert brightness-150 contrast-125"
              />
              <span>{stepTypeLabel}</span>
            </span>
            <span
              className={cn(
                "inline-flex items-center border px-2 py-1 text-[0.62rem] uppercase tracking-[0.12em]",
                NODE_STATUS_BADGE_CLASS_NAMES[data.nodeState],
              )}
            >
              {data.nodeState === "completed"
                ? "Done"
                : data.nodeState === "active"
                  ? "Active"
                  : "Future"}
            </span>
            {data.isEntry ? (
              <span className="inline-flex items-center border border-violet-500/40 bg-violet-500/12 px-2 py-1 text-[0.62rem] uppercase tracking-[0.12em] text-violet-200">
                Entry
              </span>
            ) : null}
          </div>
          <div className="min-w-0 space-y-1">
            <p className="truncate font-geist-pixel-square text-[0.72rem] uppercase tracking-[0.08em] text-foreground">
              {getGraphStepLabel(data.step)}
            </p>
            <p className="truncate text-[0.54rem] uppercase tracking-[0.12em] text-muted-foreground">
              {data.step.stepKey}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-1 text-[0.64rem] uppercase tracking-[0.08em] text-muted-foreground">
        <div className="flex items-center justify-between gap-2">
          <span>Activated</span>
          <span className="text-foreground">{formatTimestamp(data.execution?.activatedAt)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span>Completed</span>
          <span className="text-foreground">{formatTimestamp(data.execution?.completedAt)}</span>
        </div>
      </div>

      {data.step.descriptionMarkdown?.trim() ? (
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {data.step.descriptionMarkdown}
        </p>
      ) : null}

      <Handle
        type="source"
        position={Position.Right}
        className="!size-2.5 !rounded-none !border !border-border/80 !bg-background"
      />
    </div>
  );
}

function getEdgeStyle(edgeState: WorkflowStepEdgeState): CSSProperties {
  switch (edgeState) {
    case "completed":
      return { stroke: "rgb(56 189 248 / 0.8)", strokeWidth: 2.4 };
    case "completed_to_current":
      return { stroke: "rgb(163 230 53 / 0.9)", strokeWidth: 2.7 };
    case "completed_to_next":
      return { stroke: "rgb(250 204 21 / 0.88)", strokeWidth: 2.5 };
    case "branch_selected":
      return { stroke: "rgb(251 113 133 / 0.94)", strokeWidth: 2.8, strokeDasharray: "10 4" };
    case "branch":
      return { stroke: "rgb(251 113 133 / 0.52)", strokeWidth: 2, strokeDasharray: "8 5" };
    case "future":
    default:
      return { stroke: "rgb(148 163 184 / 0.34)", strokeWidth: 1.5, strokeDasharray: "6 6" };
  }
}

function WorkflowStepRuntimeEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  data,
}: EdgeProps<Edge<WorkflowStepGraphEdgeData, "workflow-step-runtime-edge">>) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      {...(markerEnd ? { markerEnd } : {})}
      style={getEdgeStyle(data?.edgeState ?? "future")}
    />
  );
}

const NODE_TYPES = { "workflow-step-runtime": WorkflowStepRuntimeNode } as const;
const EDGE_TYPES = { "workflow-step-runtime-edge": WorkflowStepRuntimeEdge } as const;

export function WorkflowStepSurfaceGraph({
  projectId,
  stepSurface,
  steps,
  edges,
  executions,
  branchSelections,
  activateWorkflowStep,
  isActivating,
  completeWorkflow,
  isCompleting,
}: WorkflowStepSurfaceGraphProps) {
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const defaultSelectedStepDefinitionId = useMemo(
    () => getDefaultSelectedStepDefinitionId({ stepSurface, steps }),
    [stepSurface, steps],
  );
  const [selectedStepDefinitionId, setSelectedStepDefinitionId] = useState<string | null>(
    defaultSelectedStepDefinitionId,
  );

  useEffect(() => {
    setSelectedStepDefinitionId((current) =>
      current && steps.some((step) => step.stepDefinitionId === current)
        ? current
        : defaultSelectedStepDefinitionId,
    );
  }, [defaultSelectedStepDefinitionId, steps]);

  const executionByStepDefinitionId = useMemo(() => {
    const map = new Map<string, WorkflowStepGraphRuntimeExecution>();
    executions.forEach((execution) => {
      map.set(execution.stepDefinitionId, execution);
    });
    return map;
  }, [executions]);

  const executionById = useMemo(
    () => new Map(executions.map((execution) => [execution.stepExecutionId, execution])),
    [executions],
  );

  const branchSelectionBySourceStepDefinitionId = useMemo(() => {
    const map = new Map<string, WorkflowStepGraphBranchSelection>();
    branchSelections.forEach((selection) => {
      const sourceExecution = executionById.get(selection.stepExecutionId);
      if (sourceExecution) {
        map.set(sourceExecution.stepDefinitionId, selection);
      }
    });
    return map;
  }, [branchSelections, executionById]);

  const nodeStateByStepDefinitionId = useMemo(() => {
    const map = new Map<string, WorkflowStepNodeState>();
    steps.forEach((step) => {
      const execution = executionByStepDefinitionId.get(step.stepDefinitionId);
      map.set(
        step.stepDefinitionId,
        execution?.status === "active" ? "active" : execution ? "completed" : "future",
      );
    });
    return map;
  }, [executionByStepDefinitionId, steps]);

  const layoutPositions = useMemo(() => getLayoutPositions(steps, edges), [edges, steps]);

  const entryStepDefinitionId =
    stepSurface.state === "entry_pending" ? stepSurface.entryStep.stepDefinitionId : null;
  const nextPendingStepDefinitionId =
    stepSurface.state === "next_pending" ? stepSurface.nextStep.stepDefinitionId : null;

  const nodes = useMemo<WorkflowStepGraphNode[]>(
    () =>
      steps.map((step) => ({
        id: step.stepDefinitionId,
        type: "workflow-step-runtime",
        position: layoutPositions[step.stepDefinitionId] ?? { x: 96, y: 80 },
        draggable: false,
        selectable: true,
        data: {
          step,
          nodeState: nodeStateByStepDefinitionId.get(step.stepDefinitionId) ?? "future",
          ...(executionByStepDefinitionId.get(step.stepDefinitionId)
            ? { execution: executionByStepDefinitionId.get(step.stepDefinitionId) }
            : {}),
          isEntry: entryStepDefinitionId === step.stepDefinitionId,
          isSelected: selectedStepDefinitionId === step.stepDefinitionId,
        },
        style: {
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
          background: "transparent",
          border: "none",
          padding: 0,
        },
      })),
    [
      entryStepDefinitionId,
      executionByStepDefinitionId,
      layoutPositions,
      nodeStateByStepDefinitionId,
      selectedStepDefinitionId,
      steps,
    ],
  );

  const edgesForCanvas = useMemo<Edge<WorkflowStepGraphEdgeData, "workflow-step-runtime-edge">[]>(
    () =>
      edges.map((edge) => {
        const sourceState = nodeStateByStepDefinitionId.get(edge.fromStepDefinitionId) ?? "future";
        const targetState = nodeStateByStepDefinitionId.get(edge.toStepDefinitionId) ?? "future";
        const branchSelection = branchSelectionBySourceStepDefinitionId.get(
          edge.fromStepDefinitionId,
        );

        let edgeState: WorkflowStepEdgeState = "future";

        if (
          edge.kind !== "linear" &&
          branchSelection?.selectedTargetStepDefinitionId === edge.toStepDefinitionId
        ) {
          edgeState = "branch_selected";
        } else if (edge.kind !== "linear") {
          edgeState = "branch";
        } else if (sourceState === "completed" && targetState === "completed") {
          edgeState = "completed";
        } else if (sourceState === "completed" && targetState === "active") {
          edgeState = "completed_to_current";
        } else if (
          sourceState === "completed" &&
          targetState === "future" &&
          nextPendingStepDefinitionId === edge.toStepDefinitionId
        ) {
          edgeState = "completed_to_next";
        }

        return {
          id: edge.edgeId,
          source: edge.fromStepDefinitionId,
          target: edge.toStepDefinitionId,
          type: "workflow-step-runtime-edge",
          data: { edgeState },
          selectable: false,
          markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
        } satisfies Edge<WorkflowStepGraphEdgeData, "workflow-step-runtime-edge">;
      }),
    [
      branchSelectionBySourceStepDefinitionId,
      edges,
      nextPendingStepDefinitionId,
      nodeStateByStepDefinitionId,
    ],
  );

  const selectedStep = useMemo(
    () => steps.find((step) => step.stepDefinitionId === selectedStepDefinitionId) ?? null,
    [selectedStepDefinitionId, steps],
  );
  const selectedExecution = selectedStep
    ? (executionByStepDefinitionId.get(selectedStep.stepDefinitionId) ?? null)
    : null;
  const selectedBranchSelection = selectedExecution
    ? (branchSelections.find(
        (selection) => selection.stepExecutionId === selectedExecution.stepExecutionId,
      ) ?? null)
    : null;

  const selectedNextAction = useMemo(() => {
    if (!selectedStep) {
      return null;
    }

    if (
      stepSurface.state === "active_step" &&
      stepSurface.activeStep.stepDefinitionId === selectedStep.stepDefinitionId
    ) {
      return {
        kind: "open_active" as const,
        stepExecutionId: stepSurface.activeStep.stepExecutionId,
      };
    }

    if (
      stepSurface.state === "next_pending" &&
      stepSurface.nextStep.stepDefinitionId === selectedStep.stepDefinitionId
    ) {
      return { kind: "activate_next" as const };
    }

    if (
      stepSurface.state === "terminal_no_next_step" &&
      stepSurface.terminalStep?.stepDefinitionId === selectedStep.stepDefinitionId &&
      completeWorkflow
    ) {
      return {
        kind: "complete_workflow" as const,
        stepExecutionId: stepSurface.terminalStep.stepExecutionId,
      };
    }

    if (
      stepSurface.state === "entry_pending" &&
      stepSurface.entryStep.stepDefinitionId === selectedStep.stepDefinitionId
    ) {
      return { kind: "activate_entry" as const };
    }

    return null;
  }, [completeWorkflow, selectedStep, stepSurface]);

  useEffect(() => {
    if (!reactFlowInstance || nodes.length === 0) {
      return;
    }

    const bounds = getBounds(nodes);
    if (!bounds) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      void reactFlowInstance.fitBounds(bounds, FIT_VIEW_OPTIONS);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [nodes, reactFlowInstance]);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <ExecutionBadge label={renderStepSurfaceLabel(stepSurface.state)} tone="slate" />
          <ExecutionBadge label={`${steps.length} steps`} tone="violet" />
          <ExecutionBadge
            label={`${executions.filter((item) => item.status === "completed").length} completed`}
            tone="sky"
          />
        </div>

        <section
          data-testid="workflow-step-surface-graph"
          className="chiron-frame-flat chiron-tone-canvas relative min-h-[34rem] overflow-hidden border border-border/70 bg-background/40 p-2"
        >
          <div className="relative h-[34rem] overflow-hidden border border-border/70 bg-background/70">
            <ReactFlow
              nodes={nodes}
              edges={edgesForCanvas}
              nodeTypes={NODE_TYPES}
              edgeTypes={EDGE_TYPES}
              onInit={setReactFlowInstance}
              onNodeClick={(_event, node) => setSelectedStepDefinitionId(node.id)}
              defaultViewport={{ x: 0, y: 0, zoom: 1 }}
              minZoom={0.35}
              maxZoom={1.5}
              fitView
              fitViewOptions={FIT_VIEW_OPTIONS}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable
              zoomOnScroll={false}
              panOnScroll
              proOptions={{ hideAttribution: true }}
            >
              <Panel position="top-left">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-none bg-background/90"
                  onClick={() => {
                    const bounds = getBounds(nodes);
                    if (bounds && reactFlowInstance) {
                      void reactFlowInstance.fitBounds(bounds, FIT_VIEW_OPTIONS);
                    }
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

        <div className="flex flex-wrap items-center gap-2 text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <span className="h-px w-8 bg-sky-400" /> completed path
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-px w-8 bg-lime-400" /> current handoff
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-px w-8 border-t border-dashed border-rose-400" /> branch route
          </span>
        </div>
      </div>

      <aside className="space-y-3 border border-border/70 bg-background/40 p-4">
        {selectedStep ? (
          <>
            <div className="space-y-2">
              <DetailLabel>Selected step</DetailLabel>
              <DetailPrimary>{getGraphStepLabel(selectedStep)}</DetailPrimary>
              <DetailCode>{selectedStep.stepKey}</DetailCode>
              <div className="flex flex-wrap gap-2">
                <ExecutionBadge
                  label={STEP_TYPE_LABELS[selectedStep.stepType]}
                  tone={getStepTypeTone(selectedStep.stepType)}
                />
                <ExecutionBadge
                  label={nodeStateByStepDefinitionId.get(selectedStep.stepDefinitionId) ?? "future"}
                  tone={
                    (nodeStateByStepDefinitionId.get(selectedStep.stepDefinitionId) ?? "future") ===
                    "completed"
                      ? "sky"
                      : (nodeStateByStepDefinitionId.get(selectedStep.stepDefinitionId) ??
                            "future") === "active"
                        ? "lime"
                        : "slate"
                  }
                />
              </div>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <span className="text-muted-foreground/70">Activated:</span>{" "}
                <span className="text-foreground">
                  {formatTimestamp(selectedExecution?.activatedAt)}
                </span>
              </p>
              <p>
                <span className="text-muted-foreground/70">Completed:</span>{" "}
                <span className="text-foreground">
                  {formatTimestamp(selectedExecution?.completedAt)}
                </span>
              </p>
              {selectedStep.descriptionMarkdown?.trim() ? (
                <p className="border border-border/70 bg-background/40 p-3 text-xs leading-6">
                  {selectedStep.descriptionMarkdown.trim()}
                </p>
              ) : null}
              {selectedBranchSelection ? (
                <p>
                  <span className="text-muted-foreground/70">Branch route saved:</span>{" "}
                  <span className="text-foreground">
                    {selectedBranchSelection.selectedTargetStepDefinitionId ?? "No route saved"}
                  </span>
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              {selectedExecution ? (
                <Link
                  to="/projects/$projectId/step-executions/$stepExecutionId"
                  params={{ projectId, stepExecutionId: selectedExecution.stepExecutionId }}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-none")}
                >
                  Open step detail
                </Link>
              ) : null}
              {selectedNextAction?.kind === "activate_entry" ? (
                <Button size="sm" onClick={activateWorkflowStep} disabled={isActivating}>
                  Activate entry step
                </Button>
              ) : null}
              {selectedNextAction?.kind === "activate_next" ? (
                <Button size="sm" onClick={activateWorkflowStep} disabled={isActivating}>
                  Activate next step
                </Button>
              ) : null}
              {selectedNextAction?.kind === "complete_workflow" ? (
                <Button size="sm" onClick={completeWorkflow} disabled={isCompleting}>
                  Complete workflow
                </Button>
              ) : null}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Select a step to inspect runtime details.</p>
        )}
      </aside>
    </div>
  );
}
