import { useEffect, useMemo, useState } from "react";
import { Result } from "better-result";
import {
  applyNodeChanges,
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import { Button } from "@/components/ui/button";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

import {
  cardinalityBadge,
  breadcrumbScopes,
  filterTransitionEligibleWorkflows,
  projectMethodologyGraph,
  reduceTopologyScope,
  type GraphScope,
  type GraphWorkUnit,
  type GraphWorkflow,
} from "./version-graph";
import type {
  MethodologyVersionWorkspaceDraft,
  WorkspaceFocusTarget,
  WorkspacePersistencePayload,
} from "./version-workspace";

type VersionWorkspaceGraphProps = {
  draft: MethodologyVersionWorkspaceDraft;
  parsed: WorkspacePersistencePayload;
  onChange: (field: keyof MethodologyVersionWorkspaceDraft, value: string) => void;
  focusTarget?: WorkspaceFocusTarget | null;
  focusTargetSequence?: number;
};

type DraftRecord = Record<string, unknown>;

type ScopeOption = {
  value: string;
  label: string;
};

type QuickAddKind = "work-unit" | "transition" | "workflow";

type ViewMode = "graph" | "list";

type ListSortDirection = "asc" | "desc";

type ListSortConfig = {
  table: string;
  column: string;
  direction: ListSortDirection;
};

type TransitionDraftRow = {
  workUnitTypeKey: string;
  transitionKey: string;
  toState?: string;
  gateClass?: string;
};

type ScopeComboboxProps = {
  label: string;
  placeholder: string;
  emptyMessage: string;
  value: string;
  options: ScopeOption[];
  disabled?: boolean;
  onSelect: (value: string) => void;
};

function ScopeCombobox({
  label,
  placeholder,
  emptyMessage,
  value,
  options,
  disabled,
  onSelect,
}: ScopeComboboxProps) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value) ?? null;

  return (
    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
      <p>{label}</p>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          disabled={disabled}
          render={
            <Button
              type="button"
              variant="outline"
              className="h-8 w-full justify-between rounded-none px-2 text-sm font-normal"
            />
          }
        >
          <span className="truncate text-left">{selectedOption?.label ?? placeholder}</span>
          <ChevronsUpDownIcon className="size-3.5 opacity-70" />
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          sideOffset={4}
          className="min-w-[300px] rounded-none p-0"
        >
          <Command>
            <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup heading={label}>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={(nextValue) => {
                      const normalized = nextValue.trim().toLowerCase();
                      const match = options.find(
                        (candidate) => candidate.value.trim().toLowerCase() === normalized,
                      );
                      if (!match) {
                        return;
                      }
                      onSelect(match.value);
                      setOpen(false);
                    }}
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="truncate">{option.label}</span>
                      <CheckIcon
                        className={cn(
                          "size-3.5",
                          option.value === value ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function nextNumericSuffixKey(prefix: string, existingKeys: readonly string[]): string {
  const used = new Set(existingKeys);
  let index = 1;

  while (used.has(`${prefix}${index}`)) {
    index += 1;
  }

  return `${prefix}${index}`;
}

function WorkUnitNode({ data }: { data: any }) {
  const states = Array.isArray(data.states)
    ? data.states.filter((state: unknown): state is string => typeof state === "string")
    : [];

  return (
    <div className="chiron-frame-flat relative flex w-[300px] flex-col font-mono transition-colors duration-150 hover:border-zinc-300/80">
      <div className="border-b border-zinc-600/70 bg-zinc-900/80 px-4 py-2 flex justify-between items-center">
        <span className="uppercase text-zinc-300 tracking-widest text-[0.62rem] font-bold">
          Work Unit
        </span>
        {data.cardinality && (
          <span className="px-2 py-0.5 border border-zinc-600/70 text-zinc-200 text-[0.62rem] leading-none">
            {data.cardinality}
          </span>
        )}
      </div>
      <div className="p-5 flex flex-col gap-2 bg-[#050505]">
        <span className="text-base font-semibold text-foreground tracking-wide">{data.label}</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {states.length > 0 ? (
            states.map((state: string) => (
              <span
                key={state}
                className="border border-zinc-600/70 px-1.5 py-0.5 text-[0.58rem] uppercase tracking-[0.08em] text-zinc-300"
              >
                {state}
              </span>
            ))
          ) : (
            <span className="border border-zinc-700/70 px-1.5 py-0.5 text-[0.58rem] uppercase tracking-[0.08em] text-zinc-500">
              States deferred
            </span>
          )}
        </div>
      </div>
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-zinc-200 !border-none !rounded-full !top-[-5px]"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-zinc-200 !border-none !rounded-full !bottom-[-5px]"
      />
    </div>
  );
}

function WorkflowNode({ data }: { data: any }) {
  return (
    <div className="chiron-frame-flat relative flex w-[260px] flex-col font-mono transition-colors duration-150 hover:border-zinc-300/80">
      <div className="border-b border-zinc-600/70 bg-zinc-900/80 px-4 py-2 flex justify-between items-center">
        <span className="uppercase text-zinc-300 tracking-widest text-[0.62rem] font-bold">
          Workflow
        </span>
      </div>
      <div className="p-4 flex flex-col gap-2 bg-[#050505]">
        <span className="text-sm font-semibold text-foreground tracking-wide">{data.label}</span>
      </div>
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-cyan-200 !border-none !rounded-full !top-[-5px]"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-cyan-200 !border-none !rounded-full !bottom-[-5px]"
      />
    </div>
  );
}

function StepNode({ data }: { data: any }) {
  return (
    <div className="chiron-frame-flat relative flex w-[220px] flex-col font-mono transition-colors duration-150 hover:border-zinc-300/80">
      <div className="border-b border-zinc-600/70 bg-zinc-900/80 px-4 py-2 flex justify-between items-center">
        <span className="uppercase text-zinc-300 tracking-widest text-[0.62rem] font-bold">
          Step
        </span>
      </div>
      <div className="p-4 flex flex-col gap-2 bg-[#050505]">
        <span className="text-sm font-semibold text-foreground tracking-wide">{data.label}</span>
      </div>
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-emerald-200 !border-none !rounded-full !top-[-5px]"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-emerald-200 !border-none !rounded-full !bottom-[-5px]"
      />
    </div>
  );
}

function TransitionNode({ data }: { data: any }) {
  return (
    <div className="chiron-frame-flat relative flex w-[180px] flex-col font-mono border-amber-500/70 transition-colors duration-150 hover:border-amber-300/90">
      <div className="border-b border-amber-500/40 bg-amber-950/30 px-3 py-1.5 flex justify-between items-center">
        <span className="uppercase text-amber-300 tracking-widest text-[0.62rem] font-bold">
          Transition
        </span>
        <span className="text-[0.6rem] text-amber-100">{data.bindingCount ?? 0}b</span>
      </div>
      <div className="p-3 flex flex-col gap-1 bg-[#050505]">
        <span className="text-xs font-semibold text-foreground tracking-wide">{data.label}</span>
      </div>
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-amber-300 !border-none !rounded-full !top-[-5px]"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-amber-300 !border-none !rounded-full !bottom-[-5px]"
      />
    </div>
  );
}

const nodeTypes = {
  workUnit: WorkUnitNode,
  workflow: WorkflowNode,
  step: StepNode,
  transition: TransitionNode,
};

function asGraphWorkUnits(input: readonly unknown[]): GraphWorkUnit[] {
  return input.filter(
    (entry): entry is GraphWorkUnit =>
      typeof entry === "object" && entry !== null && "key" in entry,
  );
}

function asGraphWorkflows(input: readonly unknown[]): GraphWorkflow[] {
  return input.filter(
    (entry): entry is GraphWorkflow =>
      typeof entry === "object" && entry !== null && "key" in entry,
  );
}

function asRecord(value: unknown): DraftRecord | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  return value as DraftRecord;
}

function parseJsonUnknown(value: string): unknown | null {
  return Result.try(() => JSON.parse(value)).unwrapOr(null);
}

function parseJsonArray(value: string): unknown[] | null {
  const parsed = parseJsonUnknown(value);
  return Array.isArray(parsed) ? parsed : null;
}

function parseJsonRecord(value: string): DraftRecord | null {
  return asRecord(parseJsonUnknown(value));
}

export function VersionWorkspaceGraph({
  draft,
  parsed,
  onChange,
  focusTarget,
  focusTargetSequence,
}: VersionWorkspaceGraphProps) {
  const [scope, setScope] = useState<GraphScope>({ level: "L1" });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const [nodePositionsByScope, setNodePositionsByScope] = useState<
    Record<string, Record<string, { x: number; y: number }>>
  >({});

  const workUnitTypes = useMemo(
    () => asGraphWorkUnits(parsed.lifecycle.workUnitTypes),
    [parsed.lifecycle.workUnitTypes],
  );
  const workflows = useMemo(
    () => asGraphWorkflows(parsed.workflows.workflows),
    [parsed.workflows.workflows],
  );

  const graphProjection = useMemo(
    () =>
      projectMethodologyGraph(
        {
          workUnitTypes,
          workflows,
          transitionWorkflowBindings: parsed.workflows.transitionWorkflowBindings,
        },
        scope,
      ),
    [parsed.workflows.transitionWorkflowBindings, scope, workUnitTypes, workflows],
  );

  const sortedWorkUnitKeys = useMemo(
    () => workUnitTypes.map((workUnitType) => workUnitType.key).sort(),
    [workUnitTypes],
  );

  const currentWorkUnitKey =
    scope.level === "L1" ? (sortedWorkUnitKeys[0] ?? "") : scope.workUnitTypeKey;

  const workflowsForCurrentWorkUnit = useMemo(
    () =>
      workflows
        .filter((workflow) => workflow.workUnitTypeKey === currentWorkUnitKey)
        .map((workflow) => workflow.key)
        .sort(),
    [currentWorkUnitKey, workflows],
  );

  const scopeBreadcrumbs = breadcrumbScopes(scope);

  const resetScopeLayout = () => {
    setNodePositionsByScope((previous) => {
      const next = { ...previous };
      delete next[scopeStorageKey];
      return next;
    });
  };

  const workUnitScopeOptions = useMemo<ScopeOption[]>(
    () => sortedWorkUnitKeys.map((workUnitKey) => ({ value: workUnitKey, label: workUnitKey })),
    [sortedWorkUnitKeys],
  );

  const workflowScopeOptions = useMemo<ScopeOption[]>(
    () =>
      workflowsForCurrentWorkUnit.map((workflowKey) => ({
        value: workflowKey,
        label: workflowKey,
      })),
    [workflowsForCurrentWorkUnit],
  );

  const handleWorkUnitScopeSelect = (nextWorkUnitKey: string) => {
    if (scope.level === "L1") {
      setScope({ level: "L2", workUnitTypeKey: nextWorkUnitKey });
    } else if (scope.level === "L2") {
      setScope({ level: "L2", workUnitTypeKey: nextWorkUnitKey });
    } else {
      const nextWorkflowKey = workflows
        .filter((workflow) => workflow.workUnitTypeKey === nextWorkUnitKey)
        .map((workflow) => workflow.key)
        .sort()[0];
      if (nextWorkflowKey) {
        setScope({
          level: "L3",
          workUnitTypeKey: nextWorkUnitKey,
          workflowKey: nextWorkflowKey,
        });
      }
    }
    setSelectedNodeId(null);
  };

  const handleWorkflowScopeSelect = (nextWorkflowKey: string) => {
    if (scope.level !== "L3") {
      return;
    }
    setScope({
      level: "L3",
      workUnitTypeKey: currentWorkUnitKey,
      workflowKey: nextWorkflowKey,
    });
    setSelectedNodeId(null);
  };

  const scopeStorageKey =
    scope.level === "L1"
      ? "L1"
      : scope.level === "L2"
        ? `L2:${scope.workUnitTypeKey}`
        : `L3:${scope.workUnitTypeKey}:${scope.workflowKey}`;
  const layoutStorageKey = `methodology-graph-layout:v2:${draft.methodologyKey}`;

  const projectedNodesWithPositions = useMemo(() => {
    const positions = nodePositionsByScope[scopeStorageKey] ?? {};
    return graphProjection.nodes.map((node) => ({
      ...node,
      position: positions[node.id] ?? node.position,
      draggable: true,
      selectable: true,
    }));
  }, [graphProjection.nodes, nodePositionsByScope, scopeStorageKey]);

  const [editableNodes, setEditableNodes] = useState<Node[]>(projectedNodesWithPositions);

  useEffect(() => {
    if (isDraggingNode) {
      return;
    }

    setEditableNodes(projectedNodesWithPositions);
  }, [isDraggingNode, projectedNodesWithPositions]);

  useEffect(() => {
    const persisted = localStorage.getItem(layoutStorageKey);
    if (!persisted) {
      return;
    }

    const parsedPositions = parseJsonRecord(persisted);
    if (!parsedPositions) {
      setNodePositionsByScope({});
      return;
    }

    setNodePositionsByScope(
      parsedPositions as Record<string, Record<string, { x: number; y: number }>>,
    );
  }, [layoutStorageKey]);

  useEffect(() => {
    localStorage.setItem(layoutStorageKey, JSON.stringify(nodePositionsByScope));
  }, [layoutStorageKey, nodePositionsByScope]);

  const handleNodesChange = (changes: NodeChange<Node>[]) => {
    setEditableNodes((previous) => applyNodeChanges(changes, previous));
  };

  const persistNodePosition = (nodeId: string, position: { x: number; y: number }) => {
    setNodePositionsByScope((previous) => ({
      ...previous,
      [scopeStorageKey]: {
        ...previous[scopeStorageKey],
        [nodeId]: position,
      },
    }));
  };

  const selectedWorkUnitTransitions =
    scope.level === "L2"
      ? (workUnitTypes.find((workUnitType) => workUnitType.key === scope.workUnitTypeKey)
          ?.lifecycleTransitions ?? [])
      : [];

  const allTransitions = useMemo<TransitionDraftRow[]>(() => {
    const parsedTransitions = parseJsonArray(draft.transitionsJson);
    if (!parsedTransitions) {
      return [];
    }

    return parsedTransitions
      .map((entry) => asRecord(entry))
      .flatMap((entry) => {
        if (!entry) {
          return [];
        }

        const workUnitTypeKey =
          typeof entry.workUnitTypeKey === "string" ? entry.workUnitTypeKey : "";
        const transitionKey =
          typeof entry.transitionKey === "string"
            ? entry.transitionKey
            : typeof entry.key === "string"
              ? entry.key
              : "";

        if (!workUnitTypeKey || !transitionKey) {
          return [];
        }

        return [
          {
            workUnitTypeKey,
            transitionKey,
            toState: typeof entry.toState === "string" ? entry.toState : undefined,
            gateClass: typeof entry.gateClass === "string" ? entry.gateClass : undefined,
          },
        ];
      })
      .sort((a, b) => {
        if (a.workUnitTypeKey === b.workUnitTypeKey) {
          return a.transitionKey.localeCompare(b.transitionKey);
        }
        return a.workUnitTypeKey.localeCompare(b.workUnitTypeKey);
      });
  }, [draft.transitionsJson]);

  const [viewMode, setViewMode] = useState<ViewMode>("graph");
  const [listFilter, setListFilter] = useState("");
  const [listSort, setListSort] = useState<ListSortConfig>({
    table: "l1-work-units",
    column: "workUnit",
    direction: "asc",
  });
  const [selectedTransitionKey, setSelectedTransitionKey] = useState<string | null>(null);
  const [showLegend, setShowLegend] = useState(false);
  const [quickAddKind, setQuickAddKind] = useState<QuickAddKind | null>(null);
  const [quickAddKey, setQuickAddKey] = useState("");
  const [quickAddWorkUnitKey, setQuickAddWorkUnitKey] = useState(currentWorkUnitKey);
  const [quickAddError, setQuickAddError] = useState<string | null>(null);

  const activeTransitionKey =
    selectedTransitionKey ??
    (selectedWorkUnitTransitions[0] &&
    typeof selectedWorkUnitTransitions[0] === "object" &&
    selectedWorkUnitTransitions[0] !== null &&
    "transitionKey" in selectedWorkUnitTransitions[0] &&
    typeof selectedWorkUnitTransitions[0].transitionKey === "string"
      ? selectedWorkUnitTransitions[0].transitionKey
      : null);

  const workflowCatalog =
    scope.level === "L2"
      ? workflows
          .filter((workflow) => workflow.workUnitTypeKey === scope.workUnitTypeKey)
          .sort((a, b) => a.key.localeCompare(b.key))
      : [];

  const transitionEligible =
    scope.level === "L2" && activeTransitionKey
      ? filterTransitionEligibleWorkflows({
          transitionKey: activeTransitionKey,
          workUnitTypeKey: scope.workUnitTypeKey,
          workflows,
          transitionWorkflowBindings: parsed.workflows.transitionWorkflowBindings,
        })
      : [];

  const transitionsForScope = useMemo(
    () =>
      scope.level === "L2"
        ? allTransitions.filter(
            (transition) => transition.workUnitTypeKey === scope.workUnitTypeKey,
          )
        : allTransitions,
    [allTransitions, scope],
  );

  const selectedWorkflowForScope =
    scope.level === "L3"
      ? (workflows.find((workflow) => workflow.key === scope.workflowKey) ?? null)
      : null;

  const workflowStepsForScope = useMemo(
    () =>
      (Array.isArray(selectedWorkflowForScope?.steps) ? selectedWorkflowForScope.steps : [])
        .map((step) => ({
          key: typeof step?.key === "string" ? step.key : "",
          type: typeof step?.type === "string" ? step.type : "",
        }))
        .filter((step) => step.key)
        .sort((a, b) => a.key.localeCompare(b.key)),
    [selectedWorkflowForScope],
  );

  const workflowEdgesForScope = useMemo(
    () =>
      (Array.isArray(selectedWorkflowForScope?.edges) ? selectedWorkflowForScope.edges : [])
        .map((edge) => ({
          fromStepKey: typeof edge?.fromStepKey === "string" ? edge.fromStepKey : null,
          toStepKey: typeof edge?.toStepKey === "string" ? edge.toStepKey : null,
          edgeKey: typeof edge?.edgeKey === "string" ? edge.edgeKey : "",
        }))
        .sort((a, b) => a.edgeKey.localeCompare(b.edgeKey)),
    [selectedWorkflowForScope],
  );

  const normalizedListFilter = listFilter.trim().toLowerCase();

  const toggleListSort = (table: string, column: string) => {
    setListSort((previous) => {
      if (previous.table === table && previous.column === column) {
        return {
          table,
          column,
          direction: previous.direction === "asc" ? "desc" : "asc",
        };
      }

      return {
        table,
        column,
        direction: "asc",
      };
    });
  };

  const listSortIndicator = (table: string, column: string) => {
    if (listSort.table !== table || listSort.column !== column) {
      return "";
    }

    return listSort.direction === "asc" ? " ↑" : " ↓";
  };

  const l1WorkUnitRows = useMemo(() => {
    const rows = workUnitTypes.map((workUnit) => ({
      workUnitKey: workUnit.key,
      cardinality: cardinalityBadge(workUnit.cardinality),
      states: (Array.isArray(workUnit.lifecycleStates) ? workUnit.lifecycleStates : [])
        .map((state) => (typeof state?.key === "string" ? state.key : ""))
        .filter(Boolean)
        .join(", "),
      transitionCount: Array.isArray(workUnit.lifecycleTransitions)
        ? workUnit.lifecycleTransitions.length
        : 0,
    }));

    const filteredRows = rows.filter((row) => {
      if (!normalizedListFilter) {
        return true;
      }

      return [row.workUnitKey, row.cardinality, row.states, String(row.transitionCount)].some(
        (value) => value.toLowerCase().includes(normalizedListFilter),
      );
    });

    const column = listSort.table === "l1-work-units" ? listSort.column : "workUnit";
    const direction = listSort.table === "l1-work-units" && listSort.direction === "desc" ? -1 : 1;

    return filteredRows.sort((a, b) => {
      if (column === "cardinality") {
        return a.cardinality.localeCompare(b.cardinality) * direction;
      }

      if (column === "states") {
        return a.states.localeCompare(b.states) * direction;
      }

      if (column === "transitions") {
        return (a.transitionCount - b.transitionCount) * direction;
      }

      return a.workUnitKey.localeCompare(b.workUnitKey) * direction;
    });
  }, [workUnitTypes, normalizedListFilter, listSort]);

  const l1TransitionRows = useMemo(() => {
    const filtered = allTransitions.filter((transition) => {
      if (!normalizedListFilter) {
        return true;
      }

      return [
        transition.transitionKey,
        transition.workUnitTypeKey,
        transition.toState ?? "",
        transition.gateClass ?? "",
      ].some((value) => value.toLowerCase().includes(normalizedListFilter));
    });

    return filtered.sort((a, b) => {
      if (a.workUnitTypeKey === b.workUnitTypeKey) {
        return a.transitionKey.localeCompare(b.transitionKey);
      }
      return a.workUnitTypeKey.localeCompare(b.workUnitTypeKey);
    });
  }, [allTransitions, normalizedListFilter]);

  const l2WorkflowRows = useMemo(
    () =>
      workflowCatalog.filter((workflow) => {
        if (!normalizedListFilter) {
          return true;
        }

        return [workflow.key, workflow.displayName ?? ""].some((value) =>
          value.toLowerCase().includes(normalizedListFilter),
        );
      }),
    [workflowCatalog, normalizedListFilter],
  );

  const l2TransitionRows = useMemo(
    () =>
      transitionsForScope.filter((transition) => {
        if (!normalizedListFilter) {
          return true;
        }

        return [
          transition.transitionKey,
          transition.toState ?? "",
          transition.gateClass ?? "",
        ].some((value) => value.toLowerCase().includes(normalizedListFilter));
      }),
    [transitionsForScope, normalizedListFilter],
  );

  const l3StepRows = useMemo(
    () =>
      workflowStepsForScope.filter((step) => {
        if (!normalizedListFilter) {
          return true;
        }

        return [step.key, step.type].some((value) =>
          value.toLowerCase().includes(normalizedListFilter),
        );
      }),
    [workflowStepsForScope, normalizedListFilter],
  );

  const l3EdgeRows = useMemo(
    () =>
      workflowEdgesForScope.filter((edge) => {
        if (!normalizedListFilter) {
          return true;
        }

        return [edge.edgeKey, edge.fromStepKey ?? "entry", edge.toStepKey ?? "exit"].some((value) =>
          value.toLowerCase().includes(normalizedListFilter),
        );
      }),
    [workflowEdgesForScope, normalizedListFilter],
  );

  useEffect(() => {
    if (quickAddWorkUnitKey) {
      return;
    }

    const fallback = currentWorkUnitKey || sortedWorkUnitKeys[0] || "";
    if (fallback) {
      setQuickAddWorkUnitKey(fallback);
    }
  }, [currentWorkUnitKey, quickAddWorkUnitKey, sortedWorkUnitKeys]);

  const openQuickAdd = (kind: QuickAddKind) => {
    setQuickAddKind(kind);
    setQuickAddKey("");
    setQuickAddError(null);
    setQuickAddWorkUnitKey(currentWorkUnitKey || sortedWorkUnitKeys[0] || "");
  };

  const closeQuickAdd = () => {
    setQuickAddKind(null);
    setQuickAddKey("");
    setQuickAddError(null);
  };

  const selectedWorkUnit = useMemo(() => {
    if (!selectedNodeId || !selectedNodeId.startsWith("wu:")) {
      return null;
    }

    const key = selectedNodeId.replace("wu:", "");
    return workUnitTypes.find((workUnit) => workUnit.key === key) ?? null;
  }, [selectedNodeId, workUnitTypes]);

  const selectedWorkflow = useMemo(() => {
    if (!selectedNodeId || !selectedNodeId.startsWith("wf:")) {
      return null;
    }

    const key = selectedNodeId.replace("wf:", "");
    return workflows.find((workflow) => workflow.key === key) ?? null;
  }, [selectedNodeId, workflows]);

  const selectedTransition = useMemo(() => {
    if (!selectedNodeId || !selectedNodeId.startsWith("transition:")) {
      return null;
    }

    const [, workUnitTypeKey, ...transitionKeyParts] = selectedNodeId.split(":");
    if (!workUnitTypeKey || transitionKeyParts.length === 0) {
      return null;
    }

    const transitionKey = transitionKeyParts.join(":");
    const boundCount = parsed.workflows.transitionWorkflowBindings[transitionKey]?.length ?? 0;
    let toState: string | undefined;
    let gateClass: string | undefined;

    const transitions = parseJsonArray(draft.transitionsJson);
    if (!transitions) {
      return null;
    }

    const row = transitions
      .map((entry) => asRecord(entry))
      .find(
        (entry) =>
          entry?.workUnitTypeKey === workUnitTypeKey && entry?.transitionKey === transitionKey,
      );
    if (row) {
      toState = typeof row.toState === "string" ? row.toState : undefined;
      gateClass = typeof row.gateClass === "string" ? row.gateClass : undefined;
    }

    return {
      workUnitTypeKey,
      transitionKey,
      boundCount,
      toState,
      gateClass,
    };
  }, [draft.transitionsJson, parsed.workflows.transitionWorkflowBindings, selectedNodeId]);

  const selectedStep = useMemo(() => {
    if (scope.level !== "L3" || !selectedNodeId || !selectedNodeId.startsWith("step:")) {
      return null;
    }

    const stepKey = selectedNodeId.replace("step:", "");
    if (!stepKey || stepKey === "entry" || stepKey === "exit") {
      return null;
    }

    const selectedWorkflowRecord = workflows.find((workflow) => workflow.key === scope.workflowKey);
    const selectedWorkflowSteps = Array.isArray(selectedWorkflowRecord?.steps)
      ? selectedWorkflowRecord.steps
      : [];

    const step = selectedWorkflowSteps.find(
      (entry) => typeof entry?.key === "string" && entry.key === stepKey,
    );
    if (!step) {
      return null;
    }

    return {
      workflowKey: scope.workflowKey,
      stepKey,
      type: typeof step.type === "string" ? step.type : "form",
    };
  }, [scope, selectedNodeId, workflows]);

  const updateWorkUnitDraft = (
    workUnitKey: string,
    updater: (workUnit: DraftRecord) => DraftRecord,
  ) => {
    const parsedWorkUnits = parseJsonArray(draft.workUnitTypesJson);
    if (!parsedWorkUnits) {
      return;
    }

    const nextWorkUnits = parsedWorkUnits.map((entry) => {
      const record = asRecord(entry);
      if (!record || record.key !== workUnitKey) {
        return entry;
      }
      return updater(record);
    });

    onChange("workUnitTypesJson", JSON.stringify(nextWorkUnits, null, 2));
  };

  const updateWorkflowDraft = (
    workflowKey: string,
    updater: (workflow: DraftRecord) => DraftRecord,
  ) => {
    const parsedWorkflows = parseJsonArray(draft.workflowsJson);
    if (!parsedWorkflows) {
      return;
    }

    const nextWorkflows = parsedWorkflows.map((entry) => {
      const record = asRecord(entry);
      if (!record || record.key !== workflowKey) {
        return entry;
      }
      return updater(record);
    });

    onChange("workflowsJson", JSON.stringify(nextWorkflows, null, 2));
  };

  const createWorkUnit = (preferredKey?: string) => {
    const parsedWorkUnits = parseJsonArray(draft.workUnitTypesJson);
    if (!parsedWorkUnits) {
      return false;
    }

    const existingKeys = parsedWorkUnits
      .map((entry) => asRecord(entry)?.key)
      .filter((entry): entry is string => typeof entry === "string");
    const nextPreferredKey = preferredKey?.trim();
    if (nextPreferredKey && existingKeys.includes(nextPreferredKey)) {
      return false;
    }

    const key = nextPreferredKey || nextNumericSuffixKey("WU.NEW_", existingKeys);

    const nextWorkUnits = [
      ...parsedWorkUnits,
      {
        key,
        displayName: key,
        cardinality: "many_per_project",
        lifecycleStates: [{ key: "draft" }],
        lifecycleTransitions: [],
        factSchemas: [],
      },
    ];

    onChange("workUnitTypesJson", JSON.stringify(nextWorkUnits, null, 2));
    setScope({ level: "L2", workUnitTypeKey: key });
    setSelectedNodeId(`wu:${key}`);
    return true;
  };

  const createTransition = (preferredKey?: string, preferredWorkUnitKey?: string) => {
    const targetWorkUnitKey = preferredWorkUnitKey || currentWorkUnitKey;
    if (!targetWorkUnitKey) {
      return false;
    }

    const parsedTransitions = parseJsonArray(draft.transitionsJson);
    if (!parsedTransitions) {
      return false;
    }

    const existingKeys = parsedTransitions
      .filter((entry) => asRecord(entry)?.workUnitTypeKey === targetWorkUnitKey)
      .map((entry) => asRecord(entry)?.transitionKey)
      .filter((entry): entry is string => typeof entry === "string");

    const nextPreferredKey = preferredKey?.trim();
    if (nextPreferredKey && existingKeys.includes(nextPreferredKey)) {
      return false;
    }

    const transitionKey =
      nextPreferredKey ||
      nextNumericSuffixKey(`${targetWorkUnitKey}:draft__to__state_`, existingKeys);
    const nextTransitions = [
      ...parsedTransitions,
      {
        workUnitTypeKey: targetWorkUnitKey,
        transitionKey,
        toState: "done",
        gateClass: "completion_gate",
        requiredLinks: [],
      },
    ];

    onChange("transitionsJson", JSON.stringify(nextTransitions, null, 2));
    setScope({ level: "L1" });
    setSelectedNodeId(`transition:${targetWorkUnitKey}:${transitionKey}`);
    return true;
  };

  const createWorkflow = (preferredKey?: string, preferredWorkUnitKey?: string) => {
    const targetWorkUnitKey = preferredWorkUnitKey || currentWorkUnitKey;
    if (!targetWorkUnitKey) {
      return false;
    }

    const parsedWorkflows = parseJsonArray(draft.workflowsJson);
    const stepsByWorkflow = parseJsonRecord(draft.workflowStepsJson) ?? {};
    if (!parsedWorkflows) {
      return false;
    }

    const existingKeys = parsedWorkflows
      .map((entry) => asRecord(entry)?.key)
      .filter((entry): entry is string => typeof entry === "string");
    const nextPreferredKey = preferredKey?.trim();
    if (nextPreferredKey && existingKeys.includes(nextPreferredKey)) {
      return false;
    }

    const workflowKey = nextPreferredKey || nextNumericSuffixKey("wf.new.", existingKeys);

    const nextWorkflows = [
      ...parsedWorkflows,
      {
        key: workflowKey,
        displayName: workflowKey,
        workUnitTypeKey: targetWorkUnitKey,
        steps: [],
        edges: [],
      },
    ];

    const nextWorkflowSteps = {
      ...stepsByWorkflow,
      [workflowKey]: [],
    };

    onChange("workflowsJson", JSON.stringify(nextWorkflows, null, 2));
    onChange("workflowStepsJson", JSON.stringify(nextWorkflowSteps, null, 2));
    setScope({
      level: "L3",
      workUnitTypeKey: targetWorkUnitKey,
      workflowKey,
    });
    setSelectedNodeId(`wf:${workflowKey}`);
    return true;
  };

  const submitQuickAdd = () => {
    if (!quickAddKind) {
      return;
    }

    setQuickAddError(null);

    if (quickAddKind === "work-unit") {
      const created = createWorkUnit(quickAddKey);
      if (!created) {
        setQuickAddError("Work unit key already exists. Choose a unique key.");
        return;
      }
      closeQuickAdd();
      return;
    }

    if (!quickAddWorkUnitKey) {
      setQuickAddError("Select a work unit first.");
      return;
    }

    if (quickAddKind === "transition") {
      const created = createTransition(quickAddKey, quickAddWorkUnitKey);
      if (!created) {
        setQuickAddError("Transition key already exists for this work unit.");
        return;
      }
      closeQuickAdd();
      return;
    }

    const created = createWorkflow(quickAddKey, quickAddWorkUnitKey);
    if (!created) {
      setQuickAddError("Workflow key already exists. Choose a unique key.");
      return;
    }
    closeQuickAdd();
  };

  const updateTransitionDraft = (
    workUnitTypeKey: string,
    transitionKey: string,
    updater: (transition: DraftRecord) => DraftRecord,
  ) => {
    const parsedTransitions = parseJsonArray(draft.transitionsJson);
    if (!parsedTransitions) {
      return;
    }

    const nextTransitions = parsedTransitions.map((entry) => {
      const record = asRecord(entry);
      if (
        !record ||
        record.workUnitTypeKey !== workUnitTypeKey ||
        record.transitionKey !== transitionKey
      ) {
        return entry;
      }

      return updater(record);
    });

    onChange("transitionsJson", JSON.stringify(nextTransitions, null, 2));
  };

  const addWorkflowStep = (workflowKey: string) => {
    const stepsByWorkflow = parseJsonRecord(draft.workflowStepsJson) ?? {};

    const currentSteps = Array.isArray(stepsByWorkflow[workflowKey])
      ? (stepsByWorkflow[workflowKey] as unknown[])
      : [];
    const existingStepKeys = currentSteps
      .map((step) => asRecord(step)?.key)
      .filter((key): key is string => typeof key === "string");
    const nextStepKey = nextNumericSuffixKey("step_", existingStepKeys);

    const nextSteps = [...currentSteps, { key: nextStepKey, type: "form" }];
    const nextStepsByWorkflow = {
      ...stepsByWorkflow,
      [workflowKey]: nextSteps,
    };

    const parsedWorkflows = parseJsonArray(draft.workflowsJson);
    if (!parsedWorkflows) {
      return;
    }

    const previousStep = existingStepKeys[existingStepKeys.length - 1] ?? null;
    const nextWorkflows = parsedWorkflows.map((entry) => {
      const record = asRecord(entry);
      if (!record || record.key !== workflowKey) {
        return entry;
      }

      const edges = Array.isArray(record.edges) ? (record.edges as unknown[]) : [];
      const nextEdge = {
        fromStepKey: previousStep,
        toStepKey: nextStepKey,
        edgeKey: previousStep ? `${previousStep}__${nextStepKey}` : `entry-${nextStepKey}`,
      };

      return {
        ...record,
        edges: [...edges, nextEdge],
      };
    });

    onChange("workflowStepsJson", JSON.stringify(nextStepsByWorkflow, null, 2));
    onChange("workflowsJson", JSON.stringify(nextWorkflows, null, 2));
  };

  const updateWorkflowStepDraft = (
    workflowKey: string,
    stepKey: string,
    updater: (step: DraftRecord) => DraftRecord,
  ) => {
    const stepsByWorkflow = parseJsonRecord(draft.workflowStepsJson) ?? {};

    const currentSteps = Array.isArray(stepsByWorkflow[workflowKey])
      ? (stepsByWorkflow[workflowKey] as unknown[])
      : [];

    const nextSteps = currentSteps.map((entry) => {
      const record = asRecord(entry);
      if (!record || record.key !== stepKey) {
        return entry;
      }
      return updater(record);
    });

    onChange(
      "workflowStepsJson",
      JSON.stringify(
        {
          ...stepsByWorkflow,
          [workflowKey]: nextSteps,
        },
        null,
        2,
      ),
    );
  };

  const onToggleBinding = (transitionKey: string, workflowKey: string, enabled: boolean) => {
    let currentBindings: Record<string, string[]> = {};

    const parsedBindings = parseJsonRecord(draft.transitionWorkflowBindingsJson);
    if (parsedBindings) {
      currentBindings = Object.fromEntries(
        Object.entries(parsedBindings).map(([key, value]) => [
          key,
          Array.isArray(value)
            ? value.filter((entry): entry is string => typeof entry === "string")
            : [],
        ]),
      );
    }

    const nextSet = new Set(currentBindings[transitionKey] ?? []);
    if (enabled) {
      nextSet.add(workflowKey);
    } else {
      nextSet.delete(workflowKey);
    }

    const nextBindings = {
      ...currentBindings,
      [transitionKey]: [...nextSet].sort(),
    };

    onChange("transitionWorkflowBindingsJson", JSON.stringify(nextBindings, null, 2));
  };

  useEffect(() => {
    const onWindowKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.closest("input, textarea, select, button, a, summary, [contenteditable='true']") ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key === "Escape") {
        setScope((current) => reduceTopologyScope(current, { type: "drill-up" }));
        setSelectedNodeId(null);
        return;
      }

      if (event.key !== "Enter" || !selectedNodeId) {
        return;
      }

      if (scope.level === "L1" && selectedNodeId.startsWith("wu:")) {
        const workUnitTypeKey = selectedNodeId.replace("wu:", "");
        setScope((current) =>
          reduceTopologyScope(current, {
            type: "drill-in-work-unit",
            workUnitTypeKey,
          }),
        );
      }

      if (scope.level === "L2" && selectedNodeId.startsWith("wf:")) {
        const workflowKey = selectedNodeId.replace("wf:", "");
        setScope((current) =>
          reduceTopologyScope(current, {
            type: "drill-in-workflow",
            workflowKey,
          }),
        );
      }
    };

    window.addEventListener("keydown", onWindowKeyDown);
    return () => {
      window.removeEventListener("keydown", onWindowKeyDown);
    };
  }, [scope.level, selectedNodeId, scope]);

  useEffect(() => {
    if (!focusTarget || focusTargetSequence === undefined) {
      return;
    }

    if (focusTarget.level === "L1") {
      setScope({ level: "L1" });
    }

    if (focusTarget.level === "L2" && focusTarget.workUnitTypeKey) {
      setScope({
        level: "L2",
        workUnitTypeKey: focusTarget.workUnitTypeKey,
      });
    }

    if (focusTarget.level === "L3" && focusTarget.workflowKey) {
      const workflow = workflows.find((item) => item.key === focusTarget.workflowKey);
      if (workflow?.workUnitTypeKey) {
        setScope({
          level: "L3",
          workUnitTypeKey: workflow.workUnitTypeKey,
          workflowKey: focusTarget.workflowKey,
        });
      }
    }

    if (focusTarget.transitionKey) {
      setSelectedTransitionKey(focusTarget.transitionKey);
    }

    if (focusTarget.nodeId) {
      setSelectedNodeId(focusTarget.nodeId);
      return;
    }

    setSelectedNodeId(null);
  }, [focusTarget, focusTargetSequence, workflows]);

  return (
    <ReactFlowProvider>
      <section className="chiron-frame-flat space-y-3 p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-2">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
              Methodology Canvas
            </p>

            <div className="inline-flex border border-border/70">
              <Button
                type="button"
                variant={scope.level === "L1" ? "default" : "ghost"}
                className="rounded-none h-8 px-3 text-xs"
                onClick={() => {
                  setScope({ level: "L1" });
                  setSelectedNodeId(null);
                }}
              >
                L1 Topology
              </Button>
              <Button
                type="button"
                variant={scope.level === "L2" ? "default" : "ghost"}
                className="rounded-none h-8 px-3 text-xs border-l border-border/70"
                onClick={() => {
                  if (!currentWorkUnitKey) {
                    return;
                  }
                  setScope({ level: "L2", workUnitTypeKey: currentWorkUnitKey });
                  setSelectedNodeId(null);
                }}
              >
                L2 Work Unit
              </Button>
              <Button
                type="button"
                variant={scope.level === "L3" ? "default" : "ghost"}
                className="rounded-none h-8 px-3 text-xs border-l border-border/70"
                onClick={() => {
                  if (!currentWorkUnitKey || !workflowsForCurrentWorkUnit[0]) {
                    return;
                  }
                  setScope({
                    level: "L3",
                    workUnitTypeKey: currentWorkUnitKey,
                    workflowKey: workflowsForCurrentWorkUnit[0],
                  });
                  setSelectedNodeId(null);
                }}
              >
                L3 Workflow
              </Button>
            </div>

            <div className="inline-flex border border-border/70">
              <Button
                type="button"
                variant={viewMode === "graph" ? "default" : "ghost"}
                className="rounded-none h-8 px-3 text-xs"
                onClick={() => {
                  setViewMode("graph");
                }}
              >
                Graph View
              </Button>
              <Button
                type="button"
                variant={viewMode === "list" ? "default" : "ghost"}
                className="rounded-none h-8 px-3 text-xs border-l border-border/70"
                onClick={() => {
                  setViewMode("list");
                }}
              >
                List View
              </Button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <ScopeCombobox
                label="Work Unit Scope"
                placeholder={currentWorkUnitKey || "Select work unit"}
                emptyMessage="No matching work units."
                value={currentWorkUnitKey}
                options={workUnitScopeOptions}
                onSelect={handleWorkUnitScopeSelect}
              />

              <ScopeCombobox
                label="Workflow Scope"
                placeholder={scope.level === "L3" ? scope.workflowKey : "Select L3 first"}
                emptyMessage="No workflows for selected work unit."
                value={scope.level === "L3" ? scope.workflowKey : ""}
                options={workflowScopeOptions}
                disabled={scope.level !== "L3" || workflowScopeOptions.length === 0}
                onSelect={handleWorkflowScopeSelect}
              />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
              Create
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-none h-8 px-3 text-xs border border-border/70"
                  />
                }
              >
                + Add
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={4}
                className="rounded-none p-1 min-w-[220px] w-auto"
              >
                <p className="px-2 py-1 text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">
                  Quick Create
                </p>
                <DropdownMenuItem
                  onClick={() => {
                    openQuickAdd("work-unit");
                  }}
                >
                  Add Work Unit
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={!currentWorkUnitKey}
                  onClick={() => {
                    openQuickAdd("transition");
                  }}
                >
                  Add Transition
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={!currentWorkUnitKey}
                  onClick={() => {
                    openQuickAdd("workflow");
                  }}
                >
                  Add Workflow
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {quickAddKind ? (
              <div className="chiron-frame-flat w-[340px] p-2 space-y-2">
                <p className="text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">
                  {quickAddKind === "work-unit"
                    ? "Quick Add Work Unit"
                    : quickAddKind === "transition"
                      ? "Quick Add Transition"
                      : "Quick Add Workflow"}
                </p>

                {quickAddKind !== "work-unit" ? (
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    <span>Work Unit</span>
                    <select
                      className="border border-border/70 bg-background px-2 py-1 text-sm"
                      value={quickAddWorkUnitKey}
                      onChange={(event) => {
                        setQuickAddWorkUnitKey(event.target.value);
                      }}
                    >
                      {sortedWorkUnitKeys.map((workUnitKey) => (
                        <option key={workUnitKey} value={workUnitKey}>
                          {workUnitKey}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                  <span>
                    {quickAddKind === "work-unit"
                      ? "Work Unit Key"
                      : quickAddKind === "transition"
                        ? "Transition Key"
                        : "Workflow Key"}
                  </span>
                  <input
                    aria-label={
                      quickAddKind === "work-unit"
                        ? "Work Unit Key"
                        : quickAddKind === "transition"
                          ? "Transition Key"
                          : "Workflow Key"
                    }
                    className="border border-border/70 bg-background px-2 py-1 text-sm"
                    placeholder={
                      quickAddKind === "work-unit"
                        ? "WU.NEW_CUSTOM"
                        : quickAddKind === "transition"
                          ? `${quickAddWorkUnitKey}:draft__to__review`
                          : "wf.custom.flow"
                    }
                    value={quickAddKey}
                    onChange={(event) => {
                      setQuickAddKey(event.target.value);
                    }}
                  />
                </label>

                {quickAddError ? (
                  <p className="text-[0.66rem] text-amber-300">{quickAddError}</p>
                ) : null}

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-none h-8 px-2 text-xs"
                    onClick={submitQuickAdd}
                  >
                    {quickAddKind === "work-unit"
                      ? "Create Work Unit"
                      : quickAddKind === "transition"
                        ? "Create Transition"
                        : "Create Workflow"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-none h-8 px-2 text-xs"
                    onClick={closeQuickAdd}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="inline-flex border border-border/70">
              <Button
                type="button"
                variant="ghost"
                className="rounded-none h-8 px-3 text-xs"
                onClick={() => {
                  setShowLegend((current) => !current);
                }}
              >
                Legend
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="rounded-none h-8 px-3 text-xs border-l border-border/70"
                onClick={resetScopeLayout}
              >
                Reset Layout
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {scopeBreadcrumbs.map((item) => (
            <span
              key={JSON.stringify(item)}
              className="chiron-cut-frame px-2 py-1"
              data-variant="surface"
            >
              {item.level === "L1"
                ? "L1"
                : item.level === "L2"
                  ? `L2:${item.workUnitTypeKey}`
                  : `L3:${item.workflowKey}`}
            </span>
          ))}
        </div>

        <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_280px] 2xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="chiron-frame-flat relative h-[calc(100vh-15rem)] min-h-[720px]">
            {viewMode === "graph" ? (
              <>
                <ReactFlow
                  fitView
                  fitViewOptions={{ padding: 0.14, minZoom: 0.45, maxZoom: 1.25 }}
                  minZoom={0.35}
                  maxZoom={1.8}
                  nodes={editableNodes}
                  edges={graphProjection.edges}
                  nodesDraggable
                  nodesConnectable={false}
                  elementsSelectable
                  onNodesChange={handleNodesChange}
                  onNodeDragStart={() => {
                    setIsDraggingNode(true);
                  }}
                  onNodeDragStop={(_event, node) => {
                    persistNodePosition(node.id, node.position);
                    setIsDraggingNode(false);
                  }}
                  onNodeClick={(_event: unknown, node: Node) => {
                    setSelectedNodeId(node.id);
                  }}
                  nodeTypes={nodeTypes}
                  nodesFocusable
                  edgesFocusable
                  proOptions={{ hideAttribution: true }}
                >
                  <Background
                    gap={24}
                    size={2}
                    color="color-mix(in oklab, var(--muted-foreground) 30%, transparent)"
                  />
                  <Controls />
                </ReactFlow>

                {showLegend ? (
                  <div className="absolute right-3 top-3 w-[250px] chiron-frame-flat bg-background/90 p-2 text-[0.65rem]">
                    <p className="uppercase tracking-[0.14em] text-muted-foreground">
                      Graph Legend
                    </p>
                    <ul className="mt-2 space-y-1 text-muted-foreground">
                      <li>Work Unit = lifecycle container</li>
                      <li>Transition = state change path</li>
                      <li>Workflow = execution bundle</li>
                      <li>Step order runs left to right</li>
                      <li>Edge labels show transition or binding context</li>
                    </ul>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="h-full overflow-auto p-3">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                      List View
                    </p>

                    <label className="flex flex-col gap-1 text-xs text-muted-foreground min-w-[220px]">
                      <span>Filter Rows</span>
                      <input
                        aria-label="Filter Rows"
                        className="border border-border/70 bg-background px-2 py-1 text-sm"
                        placeholder="Search rows by key/state/gate..."
                        value={listFilter}
                        onChange={(event) => {
                          setListFilter(event.target.value);
                        }}
                      />
                    </label>
                  </div>

                  {scope.level === "L1" ? (
                    <>
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                          Work Units
                        </p>
                        <div className="overflow-x-auto border border-border/70">
                          <table className="w-full text-xs">
                            <thead className="bg-background/70 text-muted-foreground">
                              <tr>
                                <th className="px-2 py-1 text-left font-medium">
                                  <button
                                    type="button"
                                    aria-label="Sort Work Unit"
                                    className="underline-offset-2 hover:underline"
                                    onClick={() => {
                                      toggleListSort("l1-work-units", "workUnit");
                                    }}
                                  >
                                    Work Unit{listSortIndicator("l1-work-units", "workUnit")}
                                  </button>
                                </th>
                                <th className="px-2 py-1 text-left font-medium">
                                  <button
                                    type="button"
                                    aria-label="Sort Cardinality"
                                    className="underline-offset-2 hover:underline"
                                    onClick={() => {
                                      toggleListSort("l1-work-units", "cardinality");
                                    }}
                                  >
                                    Cardinality{listSortIndicator("l1-work-units", "cardinality")}
                                  </button>
                                </th>
                                <th className="px-2 py-1 text-left font-medium">
                                  <button
                                    type="button"
                                    aria-label="Sort States"
                                    className="underline-offset-2 hover:underline"
                                    onClick={() => {
                                      toggleListSort("l1-work-units", "states");
                                    }}
                                  >
                                    States{listSortIndicator("l1-work-units", "states")}
                                  </button>
                                </th>
                                <th className="px-2 py-1 text-left font-medium">
                                  <button
                                    type="button"
                                    aria-label="Sort Transitions"
                                    className="underline-offset-2 hover:underline"
                                    onClick={() => {
                                      toggleListSort("l1-work-units", "transitions");
                                    }}
                                  >
                                    Transitions{listSortIndicator("l1-work-units", "transitions")}
                                  </button>
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {l1WorkUnitRows.map((row) => (
                                <tr
                                  key={row.workUnitKey}
                                  className="border-t border-border/60 hover:bg-muted/20"
                                >
                                  <td className="px-2 py-1">
                                    <button
                                      type="button"
                                      aria-label={`Row ${row.workUnitKey}`}
                                      className="text-left underline-offset-2 hover:underline"
                                      onClick={() => {
                                        setSelectedNodeId(`wu:${row.workUnitKey}`);
                                      }}
                                    >
                                      {row.workUnitKey}
                                    </button>
                                  </td>
                                  <td className="px-2 py-1">{row.cardinality}</td>
                                  <td className="px-2 py-1">{row.states || "-"}</td>
                                  <td className="px-2 py-1">{row.transitionCount}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                          Transitions
                        </p>
                        <div className="overflow-x-auto border border-border/70">
                          <table className="w-full text-xs">
                            <thead className="bg-background/70 text-muted-foreground">
                              <tr>
                                <th className="px-2 py-1 text-left font-medium">Transition</th>
                                <th className="px-2 py-1 text-left font-medium">Work Unit</th>
                                <th className="px-2 py-1 text-left font-medium">To State</th>
                                <th className="px-2 py-1 text-left font-medium">Gate</th>
                              </tr>
                            </thead>
                            <tbody>
                              {l1TransitionRows.map((transition) => (
                                <tr
                                  key={`${transition.workUnitTypeKey}:${transition.transitionKey}`}
                                  className="border-t border-border/60 hover:bg-muted/20"
                                >
                                  <td className="px-2 py-1">
                                    <button
                                      type="button"
                                      className="text-left underline-offset-2 hover:underline"
                                      onClick={() => {
                                        setSelectedTransitionKey(transition.transitionKey);
                                        setSelectedNodeId(
                                          `transition:${transition.workUnitTypeKey}:${transition.transitionKey}`,
                                        );
                                      }}
                                    >
                                      {transition.transitionKey}
                                    </button>
                                  </td>
                                  <td className="px-2 py-1">{transition.workUnitTypeKey}</td>
                                  <td className="px-2 py-1">{transition.toState ?? "-"}</td>
                                  <td className="px-2 py-1">{transition.gateClass ?? "-"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  ) : null}

                  {scope.level === "L2" ? (
                    <>
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                          Workflows
                        </p>
                        <div className="overflow-x-auto border border-border/70">
                          <table className="w-full text-xs">
                            <thead className="bg-background/70 text-muted-foreground">
                              <tr>
                                <th className="px-2 py-1 text-left font-medium">Workflow</th>
                                <th className="px-2 py-1 text-left font-medium">Display Name</th>
                              </tr>
                            </thead>
                            <tbody>
                              {l2WorkflowRows.map((workflow) => (
                                <tr
                                  key={workflow.key}
                                  className="border-t border-border/60 hover:bg-muted/20"
                                >
                                  <td className="px-2 py-1">
                                    <button
                                      type="button"
                                      className="text-left underline-offset-2 hover:underline"
                                      onClick={() => {
                                        setSelectedNodeId(`wf:${workflow.key}`);
                                      }}
                                    >
                                      {workflow.key}
                                    </button>
                                  </td>
                                  <td className="px-2 py-1">
                                    {workflow.displayName || workflow.key}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                          Transitions
                        </p>
                        <div className="overflow-x-auto border border-border/70">
                          <table className="w-full text-xs">
                            <thead className="bg-background/70 text-muted-foreground">
                              <tr>
                                <th className="px-2 py-1 text-left font-medium">Transition</th>
                                <th className="px-2 py-1 text-left font-medium">To State</th>
                                <th className="px-2 py-1 text-left font-medium">Gate</th>
                              </tr>
                            </thead>
                            <tbody>
                              {l2TransitionRows.map((transition) => (
                                <tr
                                  key={`${transition.workUnitTypeKey}:${transition.transitionKey}`}
                                  className="border-t border-border/60 hover:bg-muted/20"
                                >
                                  <td className="px-2 py-1">
                                    <button
                                      type="button"
                                      className="text-left underline-offset-2 hover:underline"
                                      onClick={() => {
                                        setSelectedTransitionKey(transition.transitionKey);
                                        setSelectedNodeId(
                                          `transition:${transition.workUnitTypeKey}:${transition.transitionKey}`,
                                        );
                                      }}
                                    >
                                      {transition.transitionKey}
                                    </button>
                                  </td>
                                  <td className="px-2 py-1">{transition.toState ?? "-"}</td>
                                  <td className="px-2 py-1">{transition.gateClass ?? "-"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  ) : null}

                  {scope.level === "L3" ? (
                    <>
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                          Steps
                        </p>
                        <div className="overflow-x-auto border border-border/70">
                          <table className="w-full text-xs">
                            <thead className="bg-background/70 text-muted-foreground">
                              <tr>
                                <th className="px-2 py-1 text-left font-medium">Step</th>
                                <th className="px-2 py-1 text-left font-medium">Type</th>
                              </tr>
                            </thead>
                            <tbody>
                              {l3StepRows.map((step) => (
                                <tr
                                  key={step.key}
                                  className="border-t border-border/60 hover:bg-muted/20"
                                >
                                  <td className="px-2 py-1">
                                    <button
                                      type="button"
                                      className="text-left underline-offset-2 hover:underline"
                                      onClick={() => {
                                        setSelectedNodeId(`step:${step.key}`);
                                      }}
                                    >
                                      {step.key}
                                    </button>
                                  </td>
                                  <td className="px-2 py-1">{step.type || "-"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                          Sequence Edges
                        </p>
                        <div className="overflow-x-auto border border-border/70">
                          <table className="w-full text-xs">
                            <thead className="bg-background/70 text-muted-foreground">
                              <tr>
                                <th className="px-2 py-1 text-left font-medium">Edge</th>
                                <th className="px-2 py-1 text-left font-medium">From</th>
                                <th className="px-2 py-1 text-left font-medium">To</th>
                              </tr>
                            </thead>
                            <tbody>
                              {l3EdgeRows.map((edge) => (
                                <tr
                                  key={`${edge.edgeKey}:${edge.fromStepKey ?? "entry"}:${edge.toStepKey ?? "exit"}`}
                                  className="border-t border-border/60"
                                >
                                  <td className="px-2 py-1">{edge.edgeKey || "-"}</td>
                                  <td className="px-2 py-1">{edge.fromStepKey ?? "ENTRY"}</td>
                                  <td className="px-2 py-1">{edge.toStepKey ?? "EXIT"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          <aside className="chiron-frame-flat p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground">
                Inspector
              </p>
              <Button
                type="button"
                variant="outline"
                className="rounded-none h-8 px-2 text-xs"
                onClick={resetScopeLayout}
              >
                Reset Layout
              </Button>
            </div>

            <p className="text-[0.68rem] text-muted-foreground">
              Facts are deferred in Graph-First MVP. Open Show JSON for schema edits.
            </p>

            {selectedWorkUnit ? (
              <div className="space-y-3 text-xs">
                <p className="uppercase tracking-[0.14em] text-muted-foreground">Work Unit</p>
                <label className="flex flex-col gap-1">
                  <span className="text-muted-foreground">Display Name</span>
                  <input
                    className="border border-border/70 bg-background px-2 py-1 text-sm"
                    value={selectedWorkUnit.displayName ?? selectedWorkUnit.key}
                    onChange={(event) => {
                      updateWorkUnitDraft(selectedWorkUnit.key, (record) => ({
                        ...record,
                        displayName: event.target.value,
                      }));
                    }}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-muted-foreground">Cardinality</span>
                  <select
                    className="border border-border/70 bg-background px-2 py-1 text-sm"
                    value={
                      (selectedWorkUnit.cardinality as string | undefined) ?? "many_per_project"
                    }
                    onChange={(event) => {
                      updateWorkUnitDraft(selectedWorkUnit.key, (record) => ({
                        ...record,
                        cardinality: event.target.value,
                      }));
                    }}
                  >
                    <option value="one_per_project">ONE</option>
                    <option value="many_per_project">MANY</option>
                  </select>
                </label>
              </div>
            ) : null}

            {selectedWorkflow ? (
              <div className="space-y-3 text-xs">
                <p className="uppercase tracking-[0.14em] text-muted-foreground">Workflow</p>
                <label className="flex flex-col gap-1">
                  <span className="text-muted-foreground">Display Name</span>
                  <input
                    className="border border-border/70 bg-background px-2 py-1 text-sm"
                    value={selectedWorkflow.displayName ?? selectedWorkflow.key}
                    onChange={(event) => {
                      updateWorkflowDraft(selectedWorkflow.key, (record) => ({
                        ...record,
                        displayName: event.target.value,
                      }));
                    }}
                  />
                </label>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-none h-8 px-2 text-xs"
                  onClick={() => {
                    addWorkflowStep(selectedWorkflow.key);
                  }}
                >
                  + Step
                </Button>
              </div>
            ) : null}

            {selectedTransition ? (
              <div className="space-y-3 text-xs">
                <p className="uppercase tracking-[0.14em] text-muted-foreground">Transition</p>
                <p className="text-muted-foreground">{selectedTransition.transitionKey}</p>
                <p className="text-muted-foreground">
                  Bound Workflows: {selectedTransition.boundCount}
                </p>

                <label className="flex flex-col gap-1">
                  <span className="text-muted-foreground">To State</span>
                  <input
                    className="border border-border/70 bg-background px-2 py-1 text-sm"
                    value={selectedTransition.toState ?? ""}
                    onChange={(event) => {
                      updateTransitionDraft(
                        selectedTransition.workUnitTypeKey,
                        selectedTransition.transitionKey,
                        (record) => ({
                          ...record,
                          toState: event.target.value,
                        }),
                      );
                    }}
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-muted-foreground">Gate Class</span>
                  <select
                    className="border border-border/70 bg-background px-2 py-1 text-sm"
                    value={selectedTransition.gateClass ?? "completion_gate"}
                    onChange={(event) => {
                      updateTransitionDraft(
                        selectedTransition.workUnitTypeKey,
                        selectedTransition.transitionKey,
                        (record) => ({
                          ...record,
                          gateClass: event.target.value,
                        }),
                      );
                    }}
                  >
                    <option value="start_gate">Start Gate (entry)</option>
                    <option value="completion_gate">Completion Gate (exit)</option>
                  </select>
                </label>
              </div>
            ) : null}

            {selectedStep ? (
              <div className="space-y-3 text-xs">
                <p className="uppercase tracking-[0.14em] text-muted-foreground">Step</p>
                <p className="text-muted-foreground">{selectedStep.stepKey}</p>

                <label className="flex flex-col gap-1">
                  <span className="text-muted-foreground">Type</span>
                  <input
                    className="border border-border/70 bg-background px-2 py-1 text-sm"
                    value={selectedStep.type}
                    onChange={(event) => {
                      updateWorkflowStepDraft(
                        selectedStep.workflowKey,
                        selectedStep.stepKey,
                        (record) => ({
                          ...record,
                          type: event.target.value,
                        }),
                      );
                    }}
                  />
                </label>
              </div>
            ) : null}

            {scope.level === "L2" ? (
              <div className="space-y-3 text-xs border-t border-border/60 pt-3">
                <p className="uppercase tracking-[0.14em] text-muted-foreground">Bindings (L2)</p>

                <label className="flex flex-col gap-1">
                  <span className="text-muted-foreground">Transition</span>
                  <select
                    className="border border-border/70 bg-background px-2 py-1 text-sm"
                    value={activeTransitionKey ?? ""}
                    onChange={(event) => {
                      setSelectedTransitionKey(event.target.value || null);
                      const nextKey = event.target.value;
                      if (nextKey) {
                        setSelectedNodeId(`transition:${scope.workUnitTypeKey}:${nextKey}`);
                      }
                    }}
                  >
                    <option value="">Select transition</option>
                    {selectedWorkUnitTransitions.map((transition) =>
                      typeof transition === "object" &&
                      transition !== null &&
                      "transitionKey" in transition &&
                      typeof transition.transitionKey === "string" ? (
                        <option key={transition.transitionKey} value={transition.transitionKey}>
                          {transition.transitionKey}
                        </option>
                      ) : null,
                    )}
                  </select>
                </label>

                <div className="space-y-2">
                  <p className="text-muted-foreground">Workflow Catalog</p>
                  <ul className="space-y-2">
                    {workflowCatalog.map((workflow) => {
                      const enabled = activeTransitionKey
                        ? (
                            parsed.workflows.transitionWorkflowBindings[activeTransitionKey] ?? []
                          ).includes(workflow.key)
                        : false;

                      return (
                        <li key={workflow.key} className="flex items-center justify-between gap-2">
                          <span>{workflow.key}</span>
                          {activeTransitionKey ? (
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                aria-label={`Bind ${workflow.key} to ${activeTransitionKey}`}
                                checked={enabled}
                                onChange={(event) => {
                                  onToggleBinding(
                                    activeTransitionKey,
                                    workflow.key,
                                    event.target.checked,
                                  );
                                }}
                              />
                              <span>Bind</span>
                            </label>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="space-y-2">
                  <p className="text-muted-foreground">Transition Eligible</p>
                  <ul className="space-y-1">
                    {transitionEligible.map((workflow) => (
                      <li key={workflow.key}>{workflow.key}</li>
                    ))}
                    {activeTransitionKey && transitionEligible.length === 0 ? (
                      <li>No bound workflows for selected transition.</li>
                    ) : null}
                  </ul>
                </div>
              </div>
            ) : null}

            {!selectedWorkUnit && !selectedWorkflow && !selectedTransition && !selectedStep ? (
              <p className="text-xs text-muted-foreground">
                Select a node to edit it directly. Drag nodes to arrange topology and use Reset
                Layout to restore deterministic positions for this scope.
              </p>
            ) : null}
          </aside>
        </section>
      </section>
    </ReactFlowProvider>
  );
}
