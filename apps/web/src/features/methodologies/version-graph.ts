import type { Edge, Node } from "@xyflow/react";

export type CardinalityPolicy = "one_per_project" | "many_per_project";

export type GraphScope =
  | { level: "L1" }
  | { level: "L2"; workUnitTypeKey: string }
  | { level: "L3"; workUnitTypeKey: string; workflowKey: string };

export type GraphWorkUnit = {
  key: string;
  displayName?: string;
  cardinality?: CardinalityPolicy;
  lifecycleStates?: Array<{ key: string }>;
  lifecycleTransitions?: Array<{ transitionKey: string; toState?: string }>;
};

export type GraphWorkflow = {
  key: string;
  displayName?: string;
  workUnitTypeKey?: string;
  inputContract?: unknown;
  outputContract?: unknown;
  steps?: Array<{ key: string; type: string }>;
  edges?: Array<{ fromStepKey?: string | null; toStepKey?: string | null; edgeKey?: string }>;
};

export type GraphProjectionInput = {
  workUnitTypes: readonly GraphWorkUnit[];
  workflows: readonly GraphWorkflow[];
  transitionWorkflowBindings: Readonly<Record<string, readonly string[]>>;
};

export type GraphProjectionOutput = {
  nodes: Node[];
  edges: Edge[];
};

export function cardinalityBadge(cardinality?: string): "ONE" | "MANY" {
  return cardinality === "one_per_project" ? "ONE" : "MANY";
}

function sortByKey<T extends { key: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.key.localeCompare(b.key));
}

function transitionsForWorkUnit(
  workUnit: GraphWorkUnit,
): Array<{ workUnitTypeKey: string; transitionKey: string; toState?: string }> {
  const lifecycleTransitions = Array.isArray(workUnit.lifecycleTransitions)
    ? workUnit.lifecycleTransitions
    : [];

  return lifecycleTransitions
    .filter((transition) => typeof transition.transitionKey === "string")
    .map((transition) => ({
      workUnitTypeKey: workUnit.key,
      transitionKey: transition.transitionKey,
      toState: typeof transition.toState === "string" ? transition.toState : undefined,
    }))
    .sort((a, b) => a.transitionKey.localeCompare(b.transitionKey));
}

function transitionStateLabel(transition: { transitionKey: string; toState?: string }): string {
  const [fromSegment, toSegmentFromKey] = transition.transitionKey.split("__to__");
  const toState = transition.toState ?? toSegmentFromKey;

  if (fromSegment && toState) {
    return `${fromSegment} -> ${toState}`;
  }

  if (toState) {
    return `to ${toState}`;
  }

  return transition.transitionKey;
}

function workflowCatalogForWorkUnit(
  workflows: readonly GraphWorkflow[],
  workUnitTypeKey: string,
): GraphWorkflow[] {
  return sortByKey(workflows.filter((workflow) => workflow.workUnitTypeKey === workUnitTypeKey));
}

export function filterTransitionEligibleWorkflows(input: {
  transitionKey: string;
  workUnitTypeKey: string;
  workflows: readonly GraphWorkflow[];
  transitionWorkflowBindings: Readonly<Record<string, readonly string[]>>;
}): GraphWorkflow[] {
  const catalog = workflowCatalogForWorkUnit(input.workflows, input.workUnitTypeKey);
  const boundKeys = new Set(input.transitionWorkflowBindings[input.transitionKey] ?? []);

  return catalog.filter((workflow) => boundKeys.has(workflow.key));
}

export function reduceTopologyScope(
  current: GraphScope,
  event:
    | { type: "drill-in-work-unit"; workUnitTypeKey: string }
    | { type: "drill-in-workflow"; workflowKey: string }
    | { type: "drill-up" }
    | { type: "jump"; scope: GraphScope },
): GraphScope {
  if (event.type === "jump") {
    return event.scope;
  }

  if (event.type === "drill-up") {
    if (current.level === "L3") {
      return { level: "L2", workUnitTypeKey: current.workUnitTypeKey };
    }
    if (current.level === "L2") {
      return { level: "L1" };
    }
    return current;
  }

  if (event.type === "drill-in-work-unit") {
    return { level: "L2", workUnitTypeKey: event.workUnitTypeKey };
  }

  if (event.type === "drill-in-workflow") {
    if (current.level !== "L2") {
      return current;
    }
    return {
      level: "L3",
      workUnitTypeKey: current.workUnitTypeKey,
      workflowKey: event.workflowKey,
    };
  }

  return current;
}

export function breadcrumbScopes(scope: GraphScope): GraphScope[] {
  if (scope.level === "L1") {
    return [{ level: "L1" }];
  }

  if (scope.level === "L2") {
    return [{ level: "L1" }, scope];
  }

  return [{ level: "L1" }, { level: "L2", workUnitTypeKey: scope.workUnitTypeKey }, scope];
}

export function projectMethodologyGraph(
  input: GraphProjectionInput,
  scope: GraphScope,
): GraphProjectionOutput {
  const sortedWorkUnits = sortByKey(input.workUnitTypes);

  if (scope.level === "L1") {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const columnCount = sortedWorkUnits.length > 20 ? 6 : sortedWorkUnits.length > 12 ? 5 : 4;
    const workUnitHorizontalGap = 420;
    const workUnitVerticalGap = 260;
    const transitionHorizontalGap = 132;
    const transitionYOffset = 150;

    for (const [index, workUnit] of sortedWorkUnits.entries()) {
      const baseX = (index % columnCount) * workUnitHorizontalGap;
      const baseY = Math.floor(index / columnCount) * workUnitVerticalGap;
      const workUnitNodeId = `wu:${workUnit.key}`;

      nodes.push({
        id: workUnitNodeId,
        type: "workUnit",
        position: { x: baseX, y: baseY },
        data: {
          label: workUnit.displayName ?? workUnit.key,
          cardinality: cardinalityBadge(workUnit.cardinality),
          states: Array.isArray(workUnit.lifecycleStates)
            ? workUnit.lifecycleStates
                .map((state) => state?.key)
                .filter((state): state is string => typeof state === "string")
            : [],
        },
      });

      const transitions = transitionsForWorkUnit(workUnit);
      for (const [transitionIndex, transition] of transitions.entries()) {
        const transitionNodeId = `transition:${transition.workUnitTypeKey}:${transition.transitionKey}`;
        const transitionLabel = transitionStateLabel(transition);
        const boundCount = input.transitionWorkflowBindings[transition.transitionKey]?.length ?? 0;

        nodes.push({
          id: transitionNodeId,
          type: "transition",
          position: {
            x: baseX + transitionIndex * transitionHorizontalGap,
            y: baseY + transitionYOffset,
          },
          data: {
            label: transitionLabel,
            bindingCount: boundCount,
          },
        });

        edges.push({
          id: `wu-to-transition:${transitionNodeId}`,
          source: workUnitNodeId,
          target: transitionNodeId,
          type: "smoothstep",
          animated: boundCount > 0,
          label: boundCount > 0 ? `${boundCount} bound` : "unbound",
          style: {
            stroke: "color-mix(in oklab, var(--primary) 60%, transparent)",
            strokeWidth: 1.5,
          },
        });
      }
    }

    return { nodes, edges };
  }

  if (scope.level === "L2") {
    const workUnit = sortedWorkUnits.find((item) => item.key === scope.workUnitTypeKey);
    const workflows = workflowCatalogForWorkUnit(input.workflows, scope.workUnitTypeKey);
    const nodes: Node[] = [];

    if (workUnit) {
      nodes.push({
        id: `wu:${workUnit.key}`,
        type: "workUnit",
        position: { x: 40, y: 140 },
        data: {
          label: workUnit.displayName ?? workUnit.key,
          cardinality: cardinalityBadge(workUnit.cardinality),
          states: Array.isArray(workUnit.lifecycleStates)
            ? workUnit.lifecycleStates
                .map((state) => state?.key)
                .filter((state): state is string => typeof state === "string")
            : [],
        },
      });
    }

    nodes.push(
      ...workflows.map((workflow, index) => ({
        id: `wf:${workflow.key}`,
        type: "workflow",
        position: { x: 440, y: 60 + index * 140 },
        data: {
          label: workflow.displayName ?? workflow.key,
        },
      })),
    );

    const edges = workflows.map((workflow) => {
      const boundTransitions = Object.entries(input.transitionWorkflowBindings)
        .filter(([, workflowKeys]) => workflowKeys.includes(workflow.key))
        .map(([transitionKey]) => transitionKey)
        .sort();

      return {
        id: `wf-rel:${scope.workUnitTypeKey}:${workflow.key}`,
        source: `wu:${scope.workUnitTypeKey}`,
        target: `wf:${workflow.key}`,
        type: "smoothstep",
        label: boundTransitions.length > 0 ? `bound:${boundTransitions.length}` : "unbound",
        style: {
          stroke:
            boundTransitions.length > 0
              ? "color-mix(in oklab, var(--primary) 60%, transparent)"
              : "color-mix(in oklab, var(--muted-foreground) 40%, transparent)",
          strokeWidth: 1.5,
          strokeDasharray: boundTransitions.length > 0 ? undefined : "4 4",
        },
      } satisfies Edge;
    });

    return { nodes, edges };
  }

  const selectedWorkflow = input.workflows.find((workflow) => workflow.key === scope.workflowKey);
  const workflowSteps = Array.isArray(selectedWorkflow?.steps) ? selectedWorkflow.steps : [];
  const workflowEdges = Array.isArray(selectedWorkflow?.edges) ? selectedWorkflow.edges : [];

  const sortedWorkflowSteps = workflowSteps.slice().sort((a, b) => a.key.localeCompare(b.key));
  const stepKeySet = new Set(sortedWorkflowSteps.map((step) => step.key));

  const normalizedEdges = workflowEdges
    .slice()
    .sort((a, b) => (a.edgeKey ?? "").localeCompare(b.edgeKey ?? ""))
    .map((edge, index) => ({
      edgeKey: edge.edgeKey ?? `edge-${index}`,
      fromStepKey: edge.fromStepKey ?? null,
      toStepKey: edge.toStepKey ?? null,
    }))
    .filter(
      (edge) =>
        (edge.fromStepKey === null || stepKeySet.has(edge.fromStepKey)) &&
        (edge.toStepKey === null || stepKeySet.has(edge.toStepKey)),
    );

  const adjacency = new Map<string, Set<string>>();
  const inboundCount = new Map<string, number>();
  const inferredStarts = new Set<string>();

  for (const step of sortedWorkflowSteps) {
    adjacency.set(step.key, new Set());
    inboundCount.set(step.key, 0);
  }

  for (const edge of normalizedEdges) {
    if (edge.fromStepKey === null && edge.toStepKey !== null) {
      inferredStarts.add(edge.toStepKey);
      continue;
    }

    if (edge.fromStepKey !== null && edge.toStepKey !== null) {
      adjacency.get(edge.fromStepKey)?.add(edge.toStepKey);
      inboundCount.set(edge.toStepKey, (inboundCount.get(edge.toStepKey) ?? 0) + 1);
    }
  }

  const queue = sortedWorkflowSteps
    .map((step) => step.key)
    .filter((stepKey) => (inboundCount.get(stepKey) ?? 0) === 0)
    .sort((a, b) => a.localeCompare(b));

  const topoOrder: string[] = [];
  const stepLevel = new Map<string, number>();
  const markLevel = (stepKey: string, level: number) => {
    stepLevel.set(stepKey, Math.max(stepLevel.get(stepKey) ?? 0, level));
  };

  for (const stepKey of inferredStarts) {
    markLevel(stepKey, 0);
  }

  while (queue.length > 0) {
    const stepKey = queue.shift();
    if (!stepKey) {
      break;
    }

    topoOrder.push(stepKey);
    const currentLevel = stepLevel.get(stepKey) ?? 0;
    const neighbors = [...(adjacency.get(stepKey) ?? new Set())].sort((a, b) => a.localeCompare(b));

    for (const neighbor of neighbors) {
      markLevel(neighbor, currentLevel + 1);
      const nextInbound = (inboundCount.get(neighbor) ?? 0) - 1;
      inboundCount.set(neighbor, nextInbound);
      if (nextInbound === 0) {
        queue.push(neighbor);
        queue.sort((a, b) => a.localeCompare(b));
      }
    }
  }

  if (topoOrder.length < sortedWorkflowSteps.length) {
    const dangling = sortedWorkflowSteps
      .map((step) => step.key)
      .filter((stepKey) => !topoOrder.includes(stepKey));
    for (const stepKey of dangling) {
      if (!stepLevel.has(stepKey)) {
        markLevel(stepKey, 0);
      }
      topoOrder.push(stepKey);
    }
  }

  const topoIndex = new Map<string, number>(
    topoOrder.map((stepKey, index) => [stepKey, index + 1]),
  );
  const columns = new Map<number, string[]>();
  for (const stepKey of topoOrder) {
    const level = stepLevel.get(stepKey) ?? 0;
    const columnSteps = columns.get(level) ?? [];
    columnSteps.push(stepKey);
    columns.set(level, columnSteps);
  }

  const sortedLevels = [...columns.keys()].sort((a, b) => a - b);
  const maxColumnHeight = Math.max(
    ...sortedLevels.map((level) => columns.get(level)?.length ?? 0),
    1,
  );
  const columnGap = 340;
  const rowGap = 190;

  const nodes: Node[] = sortedWorkflowSteps.map((step) => {
    const level = stepLevel.get(step.key) ?? 0;
    const stepsInColumn = (columns.get(level) ?? []).slice().sort((a, b) => {
      return (topoIndex.get(a) ?? 0) - (topoIndex.get(b) ?? 0);
    });
    const row = Math.max(stepsInColumn.indexOf(step.key), 0);
    const verticalOffset = Math.max((maxColumnHeight - stepsInColumn.length) * (rowGap / 2), 0);
    const order = topoIndex.get(step.key) ?? row + 1;

    return {
      id: `step:${step.key}`,
      type: "step",
      position: {
        x: level * columnGap,
        y: verticalOffset + row * rowGap,
      },
      data: {
        label: `#${order} ${step.type.toUpperCase()} · ${step.key}`,
      },
    } satisfies Node;
  });

  const edges: Edge[] = normalizedEdges.map((edge) => ({
    id: `step-edge:${edge.edgeKey}`,
    source: edge.fromStepKey ? `step:${edge.fromStepKey}` : "step:entry",
    target: edge.toStepKey ? `step:${edge.toStepKey}` : "step:exit",
    type: "smoothstep",
    label: edge.edgeKey,
  }));

  const synthesizedNodes: Node[] = [...nodes];
  const maxLevel = sortedLevels.length > 0 ? Math.max(...sortedLevels) : 0;
  const centerY = ((maxColumnHeight - 1) * rowGap) / 2;
  if (edges.some((edge) => edge.source === "step:entry")) {
    synthesizedNodes.push({
      id: "step:entry",
      type: "step",
      position: { x: -280, y: centerY },
      data: { label: "ENTRY" },
    });
  }
  if (edges.some((edge) => edge.target === "step:exit")) {
    synthesizedNodes.push({
      id: "step:exit",
      type: "step",
      position: { x: (maxLevel + 1) * columnGap + 110, y: centerY },
      data: { label: "EXIT" },
    });
  }

  return {
    nodes: synthesizedNodes,
    edges,
  };
}
