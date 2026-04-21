import { useEffect, useId, useMemo, useState } from "react";

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";

type LifecycleState = {
  key: string;
  displayName?: string;
  description?: string;
};

type TransitionConditionSet = {
  key: string;
  phase: "start" | "completion";
  mode: "all" | "any";
  groups: TransitionConditionGroup[];
};

type TransitionCondition = {
  kind: string;
  required?: boolean;
  config: unknown;
  rationale?: string;
};

type TransitionConditionGroup = {
  key: string;
  mode: "all" | "any";
  conditions: TransitionCondition[];
};

type GatePhase = "start" | "completion";

type GateDraft = {
  key: string;
  mode: "all" | "any";
  groups: TransitionConditionGroup[];
};

type LifecycleTransition = {
  transitionKey: string;
  fromState?: string | null;
  toState: string;
  conditionSets?: TransitionConditionSet[];
  workflowKeys?: string[];
};

type WorkflowOption = {
  key: string;
  displayName?: string;
};

type FactOption = {
  key: string;
  name?: string;
  valueType?: "string" | "number" | "boolean" | "json" | "work_unit";
};

type ArtifactSlotOption = {
  key: string;
  displayName?: string;
};

type StateMachineTabProps = {
  states: readonly LifecycleState[];
  transitions: readonly LifecycleTransition[];
  conditionSets: readonly TransitionConditionSet[];
  workflows?: readonly WorkflowOption[];
  facts?: readonly FactOption[];
  currentWorkUnitFacts?: readonly FactOption[];
  artifactSlots?: readonly ArtifactSlotOption[];
  transitionWorkflowBindings?: Record<string, readonly string[] | undefined>;
  onSaveStates?: (states: LifecycleState[]) => Promise<void>;
  onSaveTransitions?: (transitions: LifecycleTransition[]) => Promise<void>;
  onSaveConditionSets?: (
    transitionKey: string,
    conditionSets: TransitionConditionSet[],
  ) => Promise<void>;
};

type TransitionDraft = {
  transitionKey: string;
  fromState: string;
  toState: string;
  startGate: GateDraft;
  completionGate: GateDraft;
  workflowKeys: string[];
};

type StateEditorMode = "create" | "edit";
type StateEditorTab = "contract" | "guidance";
type AudienceGuidance = {
  human: string;
  agent: string;
};

const emptyStateDraft: LifecycleState = {
  key: "",
  displayName: "",
  description: "",
};

const emptyTransitionDraft: TransitionDraft = {
  transitionKey: "",
  fromState: "",
  toState: "",
  startGate: {
    key: "",
    mode: "all",
    groups: [],
  },
  completionGate: {
    key: "",
    mode: "all",
    groups: [],
  },
  workflowKeys: [],
};

const absentFromStateValue = "__absent__";
const absentFromStateLabel = "Activate Work Unit";
const absentFromStateSubtitle = "For activating a work unit from an absent state.";

type FactConditionOperator = "exists" | "equals";
type WorkUnitFactConditionOperator = "exists" | "equals";
type ArtifactConditionOperator = "exists" | "stale" | "fresh";

type FactConditionConfig = {
  factKey: string;
  operator: FactConditionOperator;
  value?: string;
};

type WorkUnitFactConditionConfig = {
  factKey: string;
  operator: WorkUnitFactConditionOperator;
  value?: string;
};

type ArtifactConditionConfig = {
  slotKey: string;
  operator: ArtifactConditionOperator;
};

const factConditionOperatorOptions: Array<{ value: FactConditionOperator; label: string }> = [
  { value: "exists", label: "exists" },
  { value: "equals", label: "equals" },
];

const workUnitFactConditionOperatorOptions: Array<{
  value: WorkUnitFactConditionOperator;
  label: string;
}> = [
  { value: "exists", label: "exists" },
  { value: "equals", label: "equals" },
];

const artifactConditionOperatorOptions: Array<{
  value: ArtifactConditionOperator;
  label: string;
}> = [
  { value: "exists", label: "exists" },
  { value: "stale", label: "stale" },
  { value: "fresh", label: "fresh" },
];

function normalizeFactConditionConfig(config: unknown): FactConditionConfig {
  if (!config || typeof config !== "object") {
    return { factKey: "", operator: "exists" };
  }

  const value = config as {
    factKey?: unknown;
    operator?: unknown;
    value?: unknown;
  };

  return {
    factKey: typeof value.factKey === "string" ? value.factKey : "",
    operator: value.operator === "equals" ? "equals" : "exists",
    ...(typeof value.value === "string" ? { value: value.value } : {}),
  };
}

function normalizeWorkUnitFactConditionConfig(config: unknown): WorkUnitFactConditionConfig {
  if (!config || typeof config !== "object") {
    return { factKey: "", operator: "exists" };
  }

  const value = config as {
    factKey?: unknown;
    dependencyKey?: unknown;
    operator?: unknown;
    value?: unknown;
  };

  return {
    factKey:
      typeof value.factKey === "string"
        ? value.factKey
        : typeof value.dependencyKey === "string"
          ? value.dependencyKey
          : "",
    operator: value.operator === "equals" ? "equals" : "exists",
    ...(typeof value.value === "string" ? { value: value.value } : {}),
  };
}

function normalizeArtifactConditionConfig(config: unknown): ArtifactConditionConfig {
  if (!config || typeof config !== "object") {
    return { slotKey: "", operator: "exists" };
  }

  const value = config as {
    slotKey?: unknown;
    operator?: unknown;
  };

  return {
    slotKey: typeof value.slotKey === "string" ? value.slotKey : "",
    operator:
      value.operator === "stale" || value.operator === "fresh" || value.operator === "exists"
        ? value.operator
        : "exists",
  };
}

type ConditionComboboxFieldProps = {
  label: string;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  value: string;
  options: Array<{ value: string; label: string; subtitle?: string }>;
  onSelect: (value: string) => void;
};

function ConditionComboboxField({
  label,
  placeholder,
  searchPlaceholder,
  emptyText,
  value,
  options,
  onSelect,
}: ConditionComboboxFieldProps) {
  const [open, setOpen] = useState(false);
  const labelId = useId();
  const selected = options.find((option) => option.value === value);

  return (
    <div className="space-y-2">
      <Label id={labelId}>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-labelledby={labelId}
              aria-expanded={open}
              className="h-8 w-full justify-between rounded-none border-input bg-transparent px-2.5 py-1 font-normal"
            >
              <span className="truncate text-xs">{selected?.label ?? placeholder}</span>
              <ChevronsUpDownIcon className="size-3.5 shrink-0 opacity-70" />
            </Button>
          }
        />
        <PopoverContent
          className="w-[var(--anchor-width)] p-0"
          align="start"
          frame="cut-thin"
          sideOffset={4}
        >
          <Command density="compact" frame="default">
            <CommandInput density="compact" placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup heading={label}>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={`${option.value} ${option.label}`}
                    density="compact"
                    onSelect={() => {
                      onSelect(option.value);
                      setOpen(false);
                    }}
                  >
                    <div className="grid min-w-0 flex-1 gap-0.5">
                      <span className="truncate font-medium">{option.label}</span>
                      {option.subtitle ? (
                        <span className="truncate text-[0.68rem] uppercase tracking-[0.08em] text-muted-foreground">
                          {option.subtitle}
                        </span>
                      ) : null}
                    </div>
                    {value === option.value ? <CheckIcon className="size-3.5" /> : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function StateMachineTab({
  states,
  transitions,
  conditionSets,
  workflows,
  facts = [],
  currentWorkUnitFacts = [],
  artifactSlots = [],
  transitionWorkflowBindings,
  onSaveStates,
  onSaveTransitions,
}: StateMachineTabProps) {
  const [statesDraft, setStatesDraft] = useState<LifecycleState[]>([]);
  const [stateGuidanceByKey, setStateGuidanceByKey] = useState<Record<string, AudienceGuidance>>(
    {},
  );
  const [transitionsDraft, setTransitionsDraft] = useState<LifecycleTransition[]>([]);
  const [stateDialogMode, setStateDialogMode] = useState<StateEditorMode | null>(null);
  const [editingStateKey, setEditingStateKey] = useState<string | null>(null);
  const [stateEditorTab, setStateEditorTab] = useState<StateEditorTab>("contract");
  const [stateDiscardOpen, setStateDiscardOpen] = useState(false);
  const [isCreateContractDirty, setIsCreateContractDirty] = useState(false);
  const [isCreateGuidanceDirty, setIsCreateGuidanceDirty] = useState(false);
  const [isEditContractDirty, setIsEditContractDirty] = useState(false);
  const [isEditGuidanceDirty, setIsEditGuidanceDirty] = useState(false);
  const [stateEditor, setStateEditor] = useState<LifecycleState>(emptyStateDraft);
  const [stateGuidanceHumanValue, setStateGuidanceHumanValue] = useState("");
  const [stateGuidanceAgentValue, setStateGuidanceAgentValue] = useState("");
  const [transitionDialogOpen, setTransitionDialogOpen] = useState(false);
  const [editingTransitionKey, setEditingTransitionKey] = useState<string | null>(null);
  const [transitionEditor, setTransitionEditor] = useState<TransitionDraft>(emptyTransitionDraft);
  const [transitionEditorTab, setTransitionEditorTab] = useState<
    "contract" | "start" | "completion" | "bindings"
  >("contract");
  const [transitionDiscardOpen, setTransitionDiscardOpen] = useState(false);
  const [isContractDirty, setIsContractDirty] = useState(false);
  const [isStartDirty, setIsStartDirty] = useState(false);
  const [isCompletionDirty, setIsCompletionDirty] = useState(false);
  const [isBindingsDirty, setIsBindingsDirty] = useState(false);
  const [isFromStateOpen, setIsFromStateOpen] = useState(false);
  const [isToStateOpen, setIsToStateOpen] = useState(false);
  const [isBindingsOpen, setIsBindingsOpen] = useState(false);
  const [groupEditor, setGroupEditor] = useState<{
    phase: GatePhase;
    groupKey: string | null;
    mode: "all" | "any";
    conditions: TransitionCondition[];
  } | null>(null);

  useEffect(() => {
    setStatesDraft(states.map((state) => ({ ...state })));
  }, [states]);

  useEffect(() => {
    const normalized = transitions.map((transition) => ({
      ...transition,
      conditionSets: transition.conditionSets ?? [],
      workflowKeys:
        transition.workflowKeys ??
        (Array.isArray(transitionWorkflowBindings?.[transition.transitionKey])
          ? [...(transitionWorkflowBindings[transition.transitionKey] ?? [])]
          : []),
    }));

    if (normalized.length > 0 && conditionSets.length > 0) {
      const firstTransition = normalized[0];
      if (firstTransition) {
        normalized[0] = {
          ...firstTransition,
          conditionSets: firstTransition.conditionSets?.length
            ? firstTransition.conditionSets
            : conditionSets.map((conditionSet) => ({ ...conditionSet })),
        };
      }
    }

    setTransitionsDraft(normalized);
  }, [conditionSets, transitionWorkflowBindings, transitions]);

  const transitionByKey = useMemo(
    () => new Map(transitionsDraft.map((transition) => [transition.transitionKey, transition])),
    [transitionsDraft],
  );

  const isCreateStateDirty = isCreateContractDirty || isCreateGuidanceDirty;
  const isEditStateDirty = isEditContractDirty || isEditGuidanceDirty;

  const resetCreateStateDirty = () => {
    setIsCreateContractDirty(false);
    setIsCreateGuidanceDirty(false);
  };

  const resetEditStateDirty = () => {
    setIsEditContractDirty(false);
    setIsEditGuidanceDirty(false);
  };

  const markStateDirtyForActiveTab = (mode: StateEditorMode, tab: StateEditorTab) => {
    if (mode === "create") {
      if (tab === "contract") {
        setIsCreateContractDirty(true);
        return;
      }

      setIsCreateGuidanceDirty(true);
      return;
    }

    if (tab === "contract") {
      setIsEditContractDirty(true);
      return;
    }

    setIsEditGuidanceDirty(true);
  };

  const openCreateStateDialog = () => {
    setStateDialogMode("create");
    setEditingStateKey(null);
    setStateEditor(emptyStateDraft);
    setStateGuidanceHumanValue("");
    setStateGuidanceAgentValue("");
    setStateEditorTab("contract");
    resetCreateStateDirty();
  };

  const openEditStateDialog = (state: LifecycleState) => {
    setStateDialogMode("edit");
    setEditingStateKey(state.key);
    setStateEditor({ ...state });
    const guidance = stateGuidanceByKey[state.key];
    setStateGuidanceHumanValue(guidance?.human ?? "");
    setStateGuidanceAgentValue(guidance?.agent ?? "");
    setStateEditorTab("contract");
    resetEditStateDirty();
  };

  const closeStateDialog = () => {
    setStateDiscardOpen(false);
    setStateDialogMode(null);
    setEditingStateKey(null);
    setStateEditor(emptyStateDraft);
    setStateGuidanceHumanValue("");
    setStateGuidanceAgentValue("");
    setStateEditorTab("contract");
    resetCreateStateDirty();
    resetEditStateDirty();
  };

  const requestCloseStateDialog = () => {
    if (
      (stateDialogMode === "create" && isCreateStateDirty) ||
      (stateDialogMode === "edit" && isEditStateDirty)
    ) {
      setStateDiscardOpen(true);
      return;
    }

    closeStateDialog();
  };

  const saveStateDialog = async () => {
    const key = stateEditor.key.trim();
    if (!key) {
      return;
    }

    const normalizedState: LifecycleState = {
      key,
      ...(stateEditor.displayName?.trim() ? { displayName: stateEditor.displayName.trim() } : {}),
      ...(stateEditor.description?.trim() ? { description: stateEditor.description.trim() } : {}),
    };

    const nextStates =
      stateDialogMode === "edit" && editingStateKey
        ? statesDraft.map((existingState) =>
            existingState.key === editingStateKey ? normalizedState : existingState,
          )
        : [...statesDraft, normalizedState];

    setStatesDraft(nextStates);
    setStateGuidanceByKey((prev) => {
      const next = { ...prev };
      const human = stateGuidanceHumanValue.trim();
      const agent = stateGuidanceAgentValue.trim();
      if (human.length > 0 || agent.length > 0) {
        next[normalizedState.key] = {
          human,
          agent,
        };
      } else {
        delete next[normalizedState.key];
      }

      if (
        stateDialogMode === "edit" &&
        editingStateKey &&
        editingStateKey !== normalizedState.key
      ) {
        delete next[editingStateKey];
      }

      return next;
    });
    await onSaveStates?.(nextStates);
    closeStateDialog();
  };

  const conditionLabel = (transition: LifecycleTransition, phase: "start" | "completion") => {
    const phaseSet = (transition.conditionSets ?? []).find((entry) => entry.phase === phase);
    return phaseSet?.key ?? "—";
  };

  const toGateDraft = (set: TransitionConditionSet | undefined): GateDraft => ({
    key: set?.key ?? "",
    mode: set?.mode ?? "all",
    groups: Array.isArray(set?.groups)
      ? set.groups.map((group) => ({
          key: group.key,
          mode: group.mode,
          conditions: [...group.conditions],
        }))
      : [],
  });

  const toTransitionDraft = (transition: LifecycleTransition): TransitionDraft => {
    const startSet = (transition.conditionSets ?? []).find((entry) => entry.phase === "start");
    const completionSet = (transition.conditionSets ?? []).find(
      (entry) => entry.phase === "completion",
    );
    return {
      transitionKey: transition.transitionKey,
      fromState: transition.fromState ?? absentFromStateValue,
      toState: transition.toState,
      startGate: toGateDraft(startSet),
      completionGate: toGateDraft(completionSet),
      workflowKeys: Array.isArray(transition.workflowKeys) ? [...transition.workflowKeys] : [],
    };
  };

  const resetTransitionDirty = () => {
    setIsContractDirty(false);
    setIsStartDirty(false);
    setIsCompletionDirty(false);
    setIsBindingsDirty(false);
  };

  const openCreateTransitionDialog = () => {
    setEditingTransitionKey(null);
    setTransitionEditor({
      ...emptyTransitionDraft,
      fromState: statesDraft[0]?.key ?? "",
      toState: statesDraft[0]?.key ?? "",
    });
    setTransitionEditorTab("contract");
    setTransitionDiscardOpen(false);
    setGroupEditor(null);
    resetTransitionDirty();
    setTransitionDialogOpen(true);
  };

  const openEditTransitionDialog = (transition: LifecycleTransition) => {
    setEditingTransitionKey(transition.transitionKey);
    setTransitionEditor(toTransitionDraft(transition));
    setTransitionEditorTab("contract");
    setTransitionDiscardOpen(false);
    setGroupEditor(null);
    resetTransitionDirty();
    setTransitionDialogOpen(true);
  };

  const closeTransitionDialog = () => {
    setTransitionDiscardOpen(false);
    setTransitionDialogOpen(false);
    setEditingTransitionKey(null);
    setTransitionEditor(emptyTransitionDraft);
    setTransitionEditorTab("contract");
    setGroupEditor(null);
    setIsFromStateOpen(false);
    setIsToStateOpen(false);
    setIsBindingsOpen(false);
    resetTransitionDirty();
  };

  const requestCloseTransitionDialog = () => {
    if (isContractDirty || isStartDirty || isCompletionDirty || isBindingsDirty) {
      setTransitionDiscardOpen(true);
      return;
    }

    closeTransitionDialog();
  };

  const toConditionSet = (
    phase: GatePhase,
    gate: GateDraft,
    transitionKey: string,
  ): TransitionConditionSet => {
    const fallbackKey = `${phase}.${transitionKey}`;
    return {
      key: gate.key.trim().length > 0 ? gate.key.trim() : fallbackKey,
      phase,
      mode: gate.mode,
      groups: gate.groups.map((group, index) => ({
        key: group.key.trim().length > 0 ? group.key.trim() : `${phase}.group.${index + 1}`,
        mode: group.mode,
        conditions: [...group.conditions],
      })),
    };
  };

  const toConditionSets = (draft: TransitionDraft): TransitionConditionSet[] => [
    toConditionSet("start", draft.startGate, draft.transitionKey.trim()),
    toConditionSet("completion", draft.completionGate, draft.transitionKey.trim()),
  ];

  const saveTransitionDialog = async () => {
    const transitionKey = transitionEditor.transitionKey.trim();
    const toState = transitionEditor.toState.trim();
    if (!transitionKey || !toState) {
      return;
    }

    const normalizedFromState = transitionEditor.fromState.trim();

    const nextTransition: LifecycleTransition = {
      transitionKey,
      fromState:
        normalizedFromState.length === 0 || normalizedFromState === absentFromStateValue
          ? null
          : normalizedFromState,
      toState,
      conditionSets: toConditionSets(transitionEditor),
      workflowKeys: transitionEditor.workflowKeys,
    };

    const nextTransitions = editingTransitionKey
      ? transitionsDraft.map((transition) =>
          transition.transitionKey === editingTransitionKey ? nextTransition : transition,
        )
      : [...transitionsDraft, nextTransition];

    setTransitionsDraft(nextTransitions);
    await onSaveTransitions?.(nextTransitions);
    closeTransitionDialog();
  };

  const updateGate = (phase: GatePhase, updater: (gate: GateDraft) => GateDraft) => {
    setTransitionEditor((previous) => {
      const currentGate = phase === "start" ? previous.startGate : previous.completionGate;
      const nextGate = updater(currentGate);
      return phase === "start"
        ? { ...previous, startGate: nextGate }
        : { ...previous, completionGate: nextGate };
    });
  };

  const factSelectionOptions = useMemo(
    () =>
      facts
        .filter(
          (
            fact,
          ): fact is {
            key: string;
            name?: string;
            valueType?: "string" | "number" | "boolean" | "json" | "work_unit";
          } => typeof fact.key === "string" && fact.key.trim().length > 0,
        )
        .map((fact) => ({
          value: fact.key,
          label: fact.key,
          ...(() => {
            const subtitle =
              (fact.name?.trim().length ?? 0) > 0
                ? `${fact.name} ${fact.valueType ? `(${fact.valueType})` : ""}`
                : fact.valueType;
            return subtitle ? { subtitle } : {};
          })(),
        })),
    [facts],
  );

  const workUnitFactSelectionOptions = useMemo(
    () =>
      currentWorkUnitFacts
        .filter(
          (
            fact,
          ): fact is {
            key: string;
            name?: string;
            valueType?: "string" | "number" | "boolean" | "json" | "work_unit";
          } => typeof fact.key === "string" && fact.key.trim().length > 0,
        )
        .map((fact) => ({
          value: fact.key,
          label: fact.key,
          ...(() => {
            const subtitle =
              (fact.name?.trim().length ?? 0) > 0
                ? `${fact.name} ${fact.valueType ? `(${fact.valueType})` : ""}`
                : fact.valueType;
            return subtitle ? { subtitle } : {};
          })(),
        })),
    [currentWorkUnitFacts],
  );

  const artifactSlotSelectionOptions = useMemo(
    () =>
      artifactSlots
        .filter(
          (entry): entry is { key: string; displayName?: string } =>
            typeof entry.key === "string" && entry.key.trim().length > 0,
        )
        .map((entry) => ({
          value: entry.key,
          label: entry.key,
          ...(entry.displayName ? { subtitle: entry.displayName } : {}),
        })),
    [artifactSlots],
  );

  const updateGroupEditorCondition = (conditionIndex: number, next: TransitionCondition) => {
    setGroupEditor((previous) =>
      previous
        ? {
            ...previous,
            conditions: previous.conditions.map((condition, index) =>
              index === conditionIndex ? next : condition,
            ),
          }
        : previous,
    );
  };

  const addGroupCondition = (kind: "fact" | "work_unit_fact" | "artifact") => {
    setGroupEditor((previous) =>
      previous
        ? {
            ...previous,
            conditions: [
              ...previous.conditions,
              {
                kind,
                required: true,
                config:
                  kind === "fact"
                    ? { factKey: "", operator: "exists" }
                    : kind === "work_unit_fact"
                      ? { factKey: "", operator: "exists" }
                      : { slotKey: "", operator: "exists" },
              },
            ],
          }
        : previous,
    );
  };

  const renderConditionEditor = (
    condition: TransitionCondition,
    onChange: (next: TransitionCondition) => void,
    testId: string,
  ) => {
    if (condition.kind === "fact") {
      const config = normalizeFactConditionConfig(condition.config);
      return (
        <div key={testId} data-testid={testId} className="chiron-frame-flat grid gap-3 p-3">
          <div className="flex items-center justify-between gap-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
            <span>Fact Condition</span>
            <span className="text-[0.68rem] normal-case tracking-normal text-foreground/90">
              {config.factKey || "Select fact"}
              {` ${config.operator}`}
              {config.operator === "equals" && config.value?.trim().length
                ? ` ${config.value}`
                : ""}
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <ConditionComboboxField
              label="Fact"
              placeholder="Select fact"
              searchPlaceholder="Search facts..."
              emptyText="No facts found."
              value={config.factKey}
              options={factSelectionOptions}
              onSelect={(factKey) => {
                onChange({
                  ...condition,
                  kind: "fact",
                  required: condition.required ?? true,
                  config: {
                    ...config,
                    factKey,
                  },
                });
              }}
            />
            <div className="space-y-2">
              <Label htmlFor={`${testId}-operator`}>Operator</Label>
              <select
                id={`${testId}-operator`}
                className="h-9 w-full rounded-none border border-input bg-background px-2 text-xs"
                value={config.operator}
                onChange={(event) => {
                  const operator = event.target.value === "equals" ? "equals" : "exists";
                  onChange({
                    ...condition,
                    kind: "fact",
                    required: condition.required ?? true,
                    config: {
                      ...config,
                      operator,
                    },
                  });
                }}
              >
                {factConditionOperatorOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {config.operator === "equals" ? (
              <div className="space-y-2">
                <Label htmlFor={`${testId}-value`}>Value</Label>
                <Input
                  id={`${testId}-value`}
                  className="rounded-none"
                  value={config.value ?? ""}
                  onChange={(event) => {
                    onChange({
                      ...condition,
                      kind: "fact",
                      required: condition.required ?? true,
                      config: {
                        ...config,
                        value: event.target.value,
                      },
                    });
                  }}
                />
              </div>
            ) : null}
          </div>
        </div>
      );
    }

    if (condition.kind === "work_unit_fact" || condition.kind === "work_unit") {
      const config = normalizeWorkUnitFactConditionConfig(condition.config);
      return (
        <div key={testId} data-testid={testId} className="chiron-frame-flat grid gap-3 p-3">
          <div className="flex items-center justify-between gap-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
            <span>Work Unit Fact Condition</span>
            <span className="text-[0.68rem] normal-case tracking-normal text-foreground/90">
              {config.factKey || "Select fact"}
              {` • ${config.operator}`}
              {config.operator === "equals" && config.value?.trim().length
                ? ` ${config.value}`
                : ""}
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <ConditionComboboxField
              label="Fact"
              placeholder="Select fact"
              searchPlaceholder="Search work-unit facts..."
              emptyText="No work-unit facts found."
              value={config.factKey}
              options={workUnitFactSelectionOptions}
              onSelect={(factKey) => {
                onChange({
                  ...condition,
                  kind: "work_unit_fact",
                  required: condition.required ?? true,
                  config: {
                    ...config,
                    factKey,
                  },
                });
              }}
            />
            <div className="space-y-2">
              <Label htmlFor={`${testId}-operator`}>Operator</Label>
              <select
                id={`${testId}-operator`}
                className="h-9 w-full rounded-none border border-input bg-background px-2 text-xs"
                value={config.operator}
                onChange={(event) => {
                  const operator = event.target.value === "equals" ? "equals" : "exists";
                  onChange({
                    ...condition,
                    kind: "work_unit_fact",
                    required: condition.required ?? true,
                    config: {
                      ...config,
                      operator,
                    },
                  });
                }}
              >
                {workUnitFactConditionOperatorOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {config.operator === "equals" ? (
              <div className="space-y-2">
                <Label htmlFor={`${testId}-value`}>Value</Label>
                <Input
                  id={`${testId}-value`}
                  className="rounded-none"
                  value={config.value ?? ""}
                  onChange={(event) => {
                    onChange({
                      ...condition,
                      kind: "work_unit_fact",
                      required: condition.required ?? true,
                      config: {
                        ...config,
                        value: event.target.value,
                      },
                    });
                  }}
                />
              </div>
            ) : null}
          </div>
        </div>
      );
    }

    if (condition.kind === "artifact") {
      const config = normalizeArtifactConditionConfig(condition.config);
      return (
        <div key={testId} data-testid={testId} className="chiron-frame-flat grid gap-3 p-3">
          <div className="flex items-center justify-between gap-2 text-xs uppercase tracking-[0.12em] text-muted-foreground">
            <span>Artifact Condition</span>
            <span className="text-[0.68rem] normal-case tracking-normal text-foreground/90">
              {config.slotKey || "Select artifact slot"}
              {` • ${config.operator}`}
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <ConditionComboboxField
              label="Artifact Slot"
              placeholder="Select artifact slot"
              searchPlaceholder="Search artifact slots..."
              emptyText="No artifact slots found."
              value={config.slotKey}
              options={artifactSlotSelectionOptions}
              onSelect={(slotKey) => {
                onChange({
                  ...condition,
                  kind: "artifact",
                  required: condition.required ?? true,
                  config: {
                    ...config,
                    slotKey,
                  },
                });
              }}
            />
            <div className="space-y-2">
              <Label htmlFor={`${testId}-operator`}>Operator</Label>
              <select
                id={`${testId}-operator`}
                className="h-9 w-full rounded-none border border-input bg-background px-2 text-xs"
                value={config.operator}
                onChange={(event) => {
                  const operator =
                    event.target.value === "stale" || event.target.value === "fresh"
                      ? event.target.value
                      : "exists";
                  onChange({
                    ...condition,
                    kind: "artifact",
                    required: condition.required ?? true,
                    config: {
                      ...config,
                      operator,
                    },
                  });
                }}
              >
                {artifactConditionOperatorOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div key={testId} data-testid={testId} className="chiron-frame-flat p-3">
        <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
          Unsupported condition kind: {condition.kind}
        </p>
      </div>
    );
  };

  const summarizeCondition = (condition: TransitionCondition): string => {
    if (condition.kind === "fact") {
      const config = normalizeFactConditionConfig(condition.config);
      return config.operator === "equals" && config.value?.trim().length
        ? `${config.factKey || "(fact)"} ${config.operator} ${config.value}`
        : `${config.factKey || "(fact)"} ${config.operator}`;
    }

    if (condition.kind === "work_unit_fact" || condition.kind === "work_unit") {
      const config = normalizeWorkUnitFactConditionConfig(condition.config);
      return config.operator === "equals" && config.value?.trim().length
        ? `${config.factKey || "(work-unit fact)"} ${config.operator} ${config.value}`
        : `${config.factKey || "(work-unit fact)"} ${config.operator}`;
    }

    if (condition.kind === "artifact") {
      const config = normalizeArtifactConditionConfig(condition.config);
      return `${config.slotKey || "(artifact slot)"} ${config.operator}`;
    }

    return condition.kind;
  };

  const openGroupEditor = (phase: GatePhase) => {
    setGroupEditor({
      phase,
      groupKey: null,
      mode: "all",
      conditions: [],
    });
  };

  const openGroupEditorForEdit = (phase: GatePhase, groupKey: string) => {
    const gate = phase === "start" ? transitionEditor.startGate : transitionEditor.completionGate;
    const group = gate.groups.find((entry) => entry.key === groupKey);
    if (!group) {
      return;
    }

    setGroupEditor({
      phase,
      groupKey,
      mode: group.mode,
      conditions: [...group.conditions],
    });
  };

  const saveGroupEditor = () => {
    if (!groupEditor) {
      return;
    }

    if (groupEditor.groupKey) {
      updateGate(groupEditor.phase, (gate) => ({
        ...gate,
        groups: gate.groups.map((group) =>
          group.key === groupEditor.groupKey
            ? {
                ...group,
                mode: groupEditor.mode,
                conditions: [...groupEditor.conditions],
              }
            : group,
        ),
      }));
    } else {
      updateGate(groupEditor.phase, (gate) => ({
        ...gate,
        groups: [
          ...gate.groups,
          {
            key: `group.${crypto.randomUUID()}`,
            mode: groupEditor.mode,
            conditions: [...groupEditor.conditions],
          },
        ],
      }));
    }

    if (groupEditor.phase === "start") {
      setIsStartDirty(true);
    } else {
      setIsCompletionDirty(true);
    }

    setGroupEditor(null);
  };

  const currentTransition = editingTransitionKey
    ? transitionByKey.get(editingTransitionKey)
    : undefined;

  return (
    <section className="grid gap-3">
      <div className="chiron-frame-flat p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
              Lifecycle Detail
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              CRUD surfaces for states, transitions, and transition condition sets.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-none"
              onClick={openCreateStateDialog}
            >
              + Add State
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-none"
              onClick={openCreateTransitionDialog}
            >
              + Add Transition
            </Button>
          </div>
        </div>
      </div>

      <div className="chiron-frame-flat overflow-hidden">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border/70 bg-background/50 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <th className="px-3 py-2 font-medium">State</th>
              <th className="px-3 py-2 font-medium">Description</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {statesDraft.map((state) => (
              <tr key={state.key} className="border-b border-border/50">
                <td className="px-3 py-2">{state.displayName ?? state.key}</td>
                <td className="px-3 py-2 text-muted-foreground">{state.description ?? "—"}</td>
                <td className="px-3 py-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-none"
                    aria-label="Edit State"
                    onClick={() => openEditStateDialog(state)}
                  >
                    Edit
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="chiron-frame-flat overflow-hidden">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border/70 bg-background/50 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <th className="px-3 py-2 font-medium">Transition</th>
              <th className="px-3 py-2 font-medium">From</th>
              <th className="px-3 py-2 font-medium">To</th>
              <th className="px-3 py-2 font-medium">Start Condition</th>
              <th className="px-3 py-2 font-medium">Completion Condition</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transitionsDraft.map((transition) => (
              <tr key={transition.transitionKey} className="border-b border-border/50">
                <td className="px-3 py-2">{transition.transitionKey}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {transition.fromState ?? absentFromStateLabel}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{transition.toState}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {conditionLabel(transition, "start")}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {conditionLabel(transition, "completion")}
                </td>
                <td className="px-3 py-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-none"
                    aria-label="Edit Transition"
                    onClick={() => openEditTransitionDialog(transition)}
                  >
                    Edit
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog
        open={stateDialogMode !== null}
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            return;
          }

          requestCloseStateDialog();
        }}
      >
        <DialogContent className="chiron-cut-frame-thick w-[min(72rem,calc(100vw-2rem))] p-8 sm:max-w-none sm:p-10">
          <form
            className="flex flex-col gap-12"
            onChangeCapture={() => {
              if (!stateDialogMode) {
                return;
              }

              markStateDirtyForActiveTab(stateDialogMode, stateEditorTab);
            }}
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void saveStateDialog();
            }}
          >
            <div className="flex flex-col gap-10">
              <DialogHeader className="gap-4">
                <DialogTitle className="text-base font-semibold uppercase tracking-[0.08em]">
                  {stateDialogMode === "edit" ? "Edit State" : "Add State"}
                </DialogTitle>
                <div className="flex flex-wrap gap-2 border-b border-border pb-3">
                  <Button
                    type="button"
                    size="sm"
                    variant={stateEditorTab === "contract" ? "default" : "outline"}
                    className="rounded-none"
                    onClick={() => setStateEditorTab("contract")}
                  >
                    Contract
                    {((stateDialogMode === "create" && isCreateContractDirty) ||
                      (stateDialogMode === "edit" && isEditContractDirty)) && (
                      <span
                        data-testid="state-contract-modified-indicator"
                        className="ml-1 text-[0.85rem] leading-none"
                      >
                        *
                      </span>
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={stateEditorTab === "guidance" ? "default" : "outline"}
                    className="rounded-none"
                    onClick={() => setStateEditorTab("guidance")}
                  >
                    Guidance
                    {((stateDialogMode === "create" && isCreateGuidanceDirty) ||
                      (stateDialogMode === "edit" && isEditGuidanceDirty)) && (
                      <span
                        data-testid="state-guidance-modified-indicator"
                        className="ml-1 text-[0.85rem] leading-none"
                      >
                        *
                      </span>
                    )}
                  </Button>
                </div>
              </DialogHeader>

              {stateEditorTab === "contract" ? (
                <div className="grid grid-cols-2 gap-x-10 gap-y-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="state-key"
                      className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
                    >
                      State Key
                    </Label>
                    <Input
                      id="state-key"
                      className="rounded-none border-border/70 bg-background/50 text-xs tracking-[0.04em] placeholder:text-muted-foreground/50"
                      value={stateEditor.key}
                      disabled={stateDialogMode === "edit"}
                      onChange={(event) =>
                        setStateEditor((previous) => ({ ...previous, key: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="state-display-name"
                      className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
                    >
                      Display Name
                    </Label>
                    <Input
                      id="state-display-name"
                      className="rounded-none border-border/70 bg-background/50 text-xs tracking-[0.04em] placeholder:text-muted-foreground/50"
                      value={stateEditor.displayName ?? ""}
                      onChange={(event) =>
                        setStateEditor((previous) => ({
                          ...previous,
                          displayName: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label
                      htmlFor="state-description"
                      className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
                    >
                      Description
                    </Label>
                    <Textarea
                      id="state-description"
                      className="min-h-[14rem] resize-none rounded-none border-border/70 bg-background/50 p-3 text-xs tracking-[0.04em] placeholder:text-muted-foreground/50"
                      value={stateEditor.description ?? ""}
                      onChange={(event) =>
                        setStateEditor((previous) => ({
                          ...previous,
                          description: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-x-10 gap-y-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="state-guidance-human"
                      className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
                    >
                      Human Guidance
                    </Label>
                    <Textarea
                      id="state-guidance-human"
                      className="min-h-[14rem] resize-none rounded-none border-border/70 bg-background/50 p-3 text-xs tracking-[0.04em] placeholder:text-muted-foreground/50"
                      value={stateGuidanceHumanValue}
                      onChange={(event) => setStateGuidanceHumanValue(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="state-guidance-agent"
                      className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
                    >
                      Agent Guidance
                    </Label>
                    <Textarea
                      id="state-guidance-agent"
                      className="min-h-[14rem] resize-none rounded-none border-border/70 bg-background/50 p-3 text-xs tracking-[0.04em] placeholder:text-muted-foreground/50"
                      value={stateGuidanceAgentValue}
                      onChange={(event) => setStateGuidanceAgentValue(event.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="sm:justify-end sm:gap-4 sm:px-0">
              <Button
                type="button"
                variant="outline"
                className="rounded-none px-6"
                onClick={requestCloseStateDialog}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-none px-8"
                disabled={stateEditor.key.trim().length === 0}
              >
                {stateDialogMode === "edit" ? "Save State" : "Create State"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={stateDiscardOpen} onOpenChange={setStateDiscardOpen}>
        <DialogContent className="max-w-md rounded-none">
          <DialogHeader>
            <DialogTitle>Discard unsaved changes?</DialogTitle>
            <DialogDescription>
              You have unsaved state edits. Discarding now will close the dialog and lose those
              changes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-none"
              onClick={() => setStateDiscardOpen(false)}
            >
              Keep Editing
            </Button>
            <Button type="button" className="rounded-none" onClick={closeStateDialog}>
              Discard Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={transitionDialogOpen}
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            setTransitionDialogOpen(true);
            return;
          }

          requestCloseTransitionDialog();
        }}
      >
        <DialogContent className="chiron-cut-frame-thick flex w-[min(72rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] flex-col overflow-hidden p-8 sm:max-w-none sm:p-10">
          <form
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void saveTransitionDialog();
            }}
          >
            <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
              <DialogHeader className="gap-4">
                <DialogTitle className="text-base font-semibold uppercase tracking-[0.08em]">
                  {editingTransitionKey ? "Edit Transition" : "Add Transition"}
                </DialogTitle>
              </DialogHeader>

              <div className="flex flex-wrap gap-2 border-b border-border pb-3">
                <Button
                  type="button"
                  size="sm"
                  variant={transitionEditorTab === "contract" ? "default" : "outline"}
                  className="rounded-none"
                  onClick={() => setTransitionEditorTab("contract")}
                >
                  Contract
                  {isContractDirty ? (
                    <span
                      data-testid="transition-contract-modified-indicator"
                      className="ml-1 text-[0.85rem] leading-none"
                    >
                      *
                    </span>
                  ) : null}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={transitionEditorTab === "start" ? "default" : "outline"}
                  className="rounded-none"
                  onClick={() => setTransitionEditorTab("start")}
                >
                  Start Conditions
                  {isStartDirty ? (
                    <span
                      data-testid="transition-start-modified-indicator"
                      className="ml-1 text-[0.85rem] leading-none"
                    >
                      *
                    </span>
                  ) : null}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={transitionEditorTab === "completion" ? "default" : "outline"}
                  className="rounded-none"
                  onClick={() => setTransitionEditorTab("completion")}
                >
                  Completion Conditions
                  {isCompletionDirty ? (
                    <span
                      data-testid="transition-completion-modified-indicator"
                      className="ml-1 text-[0.85rem] leading-none"
                    >
                      *
                    </span>
                  ) : null}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={transitionEditorTab === "bindings" ? "default" : "outline"}
                  className="rounded-none"
                  onClick={() => setTransitionEditorTab("bindings")}
                >
                  Bindings
                  {isBindingsDirty ? (
                    <span
                      data-testid="transition-bindings-modified-indicator"
                      className="ml-1 text-[0.85rem] leading-none"
                    >
                      *
                    </span>
                  ) : null}
                </Button>
              </div>
              <div
                data-testid="transition-tab-scroll-region"
                className="min-h-0 flex-1 overflow-y-auto pr-1"
              >
                {transitionEditorTab === "contract" ? (
                  <div
                    className="grid grid-cols-2 gap-x-10 gap-y-6"
                    onChangeCapture={() => setIsContractDirty(true)}
                  >
                    <div className="col-span-2 space-y-2">
                      <Label
                        htmlFor="transition-key"
                        className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
                      >
                        Transition Key
                      </Label>
                      <Input
                        id="transition-key"
                        className="rounded-none border-border/70 bg-background/50 text-xs tracking-[0.04em] placeholder:text-muted-foreground/50"
                        value={transitionEditor.transitionKey}
                        disabled={editingTransitionKey !== null}
                        onChange={(event) =>
                          setTransitionEditor((previous) => ({
                            ...previous,
                            transitionKey: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label id="transition-from-state-label">From State</Label>
                      <Popover open={isFromStateOpen} onOpenChange={setIsFromStateOpen}>
                        <PopoverTrigger
                          render={
                            <Button
                              type="button"
                              variant="outline"
                              role="combobox"
                              aria-labelledby="transition-from-state-label"
                              aria-expanded={isFromStateOpen}
                              className="h-8 w-full justify-between rounded-none border-input bg-transparent px-2.5 py-1 font-normal"
                            >
                              <span className="truncate text-xs">
                                {transitionEditor.fromState === absentFromStateValue
                                  ? absentFromStateLabel
                                  : transitionEditor.fromState.trim().length > 0
                                    ? transitionEditor.fromState
                                    : "Select from state"}
                              </span>
                              <ChevronsUpDownIcon className="size-3.5 shrink-0 opacity-70" />
                            </Button>
                          }
                        />
                        <PopoverContent
                          className="w-[var(--anchor-width)] p-0"
                          align="start"
                          frame="cut-thin"
                          sideOffset={4}
                        >
                          <Command density="compact" frame="default">
                            <CommandInput density="compact" placeholder="Search states..." />
                            <CommandList>
                              <CommandEmpty>No states found.</CommandEmpty>
                              <CommandGroup heading="States">
                                <CommandItem
                                  key="from-absent"
                                  value={absentFromStateLabel}
                                  density="compact"
                                  onSelect={() => {
                                    setTransitionEditor((previous) => ({
                                      ...previous,
                                      fromState: absentFromStateValue,
                                    }));
                                    setIsContractDirty(true);
                                    setIsFromStateOpen(false);
                                  }}
                                >
                                  <div className="grid min-w-0 flex-1 gap-0.5">
                                    <span className="truncate font-medium">
                                      {absentFromStateLabel}
                                    </span>
                                    <span className="truncate text-[0.68rem] uppercase tracking-[0.08em] text-muted-foreground">
                                      {absentFromStateSubtitle}
                                    </span>
                                  </div>
                                  {transitionEditor.fromState === absentFromStateValue ? (
                                    <CheckIcon className="size-3.5" />
                                  ) : null}
                                </CommandItem>
                                {statesDraft.map((state) => (
                                  <CommandItem
                                    key={`from-${state.key}`}
                                    value={`${state.key} ${state.displayName ?? ""}`}
                                    density="compact"
                                    onSelect={() => {
                                      setTransitionEditor((previous) => ({
                                        ...previous,
                                        fromState: state.key,
                                      }));
                                      setIsContractDirty(true);
                                      setIsFromStateOpen(false);
                                    }}
                                  >
                                    <div className="grid min-w-0 flex-1 gap-0.5">
                                      <span className="truncate font-medium">{state.key}</span>
                                      {(state.displayName?.trim().length ?? 0) > 0 ? (
                                        <span className="truncate text-[0.68rem] uppercase tracking-[0.08em] text-muted-foreground">
                                          {state.displayName}
                                        </span>
                                      ) : null}
                                    </div>
                                    {transitionEditor.fromState === state.key ? (
                                      <CheckIcon className="size-3.5" />
                                    ) : null}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label id="transition-to-state-label">To State</Label>
                      <Popover open={isToStateOpen} onOpenChange={setIsToStateOpen}>
                        <PopoverTrigger
                          render={
                            <Button
                              type="button"
                              variant="outline"
                              role="combobox"
                              aria-labelledby="transition-to-state-label"
                              aria-expanded={isToStateOpen}
                              className="h-8 w-full justify-between rounded-none border-input bg-transparent px-2.5 py-1 font-normal"
                            >
                              <span className="truncate text-xs">
                                {transitionEditor.toState.trim().length > 0
                                  ? transitionEditor.toState
                                  : "Select to state"}
                              </span>
                              <ChevronsUpDownIcon className="size-3.5 shrink-0 opacity-70" />
                            </Button>
                          }
                        />
                        <PopoverContent
                          className="w-[var(--anchor-width)] p-0"
                          align="start"
                          frame="cut-thin"
                          sideOffset={4}
                        >
                          <Command density="compact" frame="default">
                            <CommandInput density="compact" placeholder="Search states..." />
                            <CommandList>
                              <CommandEmpty>No states found.</CommandEmpty>
                              <CommandGroup heading="States">
                                {statesDraft.map((state) => (
                                  <CommandItem
                                    key={`to-${state.key}`}
                                    value={`${state.key} ${state.displayName ?? ""}`}
                                    density="compact"
                                    onSelect={() => {
                                      setTransitionEditor((previous) => ({
                                        ...previous,
                                        toState: state.key,
                                      }));
                                      setIsContractDirty(true);
                                      setIsToStateOpen(false);
                                    }}
                                  >
                                    <div className="grid min-w-0 flex-1 gap-0.5">
                                      <span className="truncate font-medium">{state.key}</span>
                                      {(state.displayName?.trim().length ?? 0) > 0 ? (
                                        <span className="truncate text-[0.68rem] uppercase tracking-[0.08em] text-muted-foreground">
                                          {state.displayName}
                                        </span>
                                      ) : null}
                                    </div>
                                    {transitionEditor.toState === state.key ? (
                                      <CheckIcon className="size-3.5" />
                                    ) : null}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                ) : transitionEditorTab === "start" ? (
                  <div className="grid gap-6" onChangeCapture={() => setIsStartDirty(true)}>
                    <div className="grid gap-2">
                      <Label htmlFor="transition-start-mode">Start Gate Mode</Label>
                      <select
                        id="transition-start-mode"
                        className="h-9 rounded-none border border-input bg-background px-2 text-xs"
                        value={transitionEditor.startGate.mode}
                        onChange={(event) =>
                          updateGate("start", (gate) => ({
                            ...gate,
                            mode: event.target.value === "any" ? "any" : "all",
                          }))
                        }
                      >
                        <option value="all">All conditions</option>
                        <option value="any">Any condition</option>
                      </select>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-none"
                        onClick={() => openGroupEditor("start")}
                      >
                        Add Group
                      </Button>
                    </div>
                    <div className="grid gap-2">
                      <p className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                        Start Groups
                      </p>
                      {transitionEditor.startGate.groups.length > 0 ? (
                        transitionEditor.startGate.groups.map((group, index) => (
                          <button
                            key={group.key}
                            type="button"
                            className="chiron-frame-flat w-full p-2 text-left text-xs"
                            aria-label={`Edit Start Group ${index + 1}`}
                            onClick={() => openGroupEditorForEdit("start", group.key)}
                          >
                            <p className="uppercase tracking-[0.12em] text-muted-foreground">
                              Group {index + 1} ({group.mode})
                            </p>
                            <p className="mt-1 text-foreground/90">
                              {group.conditions.length > 0
                                ? group.conditions.map(summarizeCondition).join(" • ")
                                : "No conditions in group."}
                            </p>
                          </button>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground">No groups added yet.</p>
                      )}
                    </div>
                  </div>
                ) : transitionEditorTab === "bindings" ? (
                  <div className="grid gap-2" onChangeCapture={() => setIsBindingsDirty(true)}>
                    <Label id="transition-bind-workflows-label">Bind Workflows</Label>
                    <Popover open={isBindingsOpen} onOpenChange={setIsBindingsOpen}>
                      <PopoverTrigger
                        render={
                          <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            aria-labelledby="transition-bind-workflows-label"
                            aria-expanded={isBindingsOpen}
                            className="min-h-8 h-auto w-full justify-between rounded-none border-input bg-transparent px-2.5 py-1 font-normal"
                          >
                            {transitionEditor.workflowKeys.length > 0 ? (
                              <span className="flex min-w-0 flex-wrap gap-1 py-0.5 text-left text-xs">
                                {transitionEditor.workflowKeys.map((workflowKey) => (
                                  <span
                                    key={workflowKey}
                                    className="inline-flex max-w-full items-center rounded-none border border-border/70 bg-background/70 px-1.5 py-0.5 text-[0.68rem] uppercase tracking-[0.08em]"
                                  >
                                    <span className="truncate">{workflowKey}</span>
                                  </span>
                                ))}
                              </span>
                            ) : (
                              <span className="truncate text-xs">Select workflow bindings</span>
                            )}
                            <ChevronsUpDownIcon className="size-3.5 shrink-0 opacity-70" />
                          </Button>
                        }
                      />
                      <PopoverContent
                        className="w-[var(--anchor-width)] p-0"
                        align="start"
                        frame="cut-thin"
                        sideOffset={4}
                      >
                        <Command density="compact" frame="default">
                          <CommandInput density="compact" placeholder="Search workflows..." />
                          <CommandList>
                            <CommandEmpty>No workflows found.</CommandEmpty>
                            <CommandGroup heading="Workflows">
                              {(workflows ?? []).map((workflow) => (
                                <CommandItem
                                  key={workflow.key}
                                  value={`${workflow.key} ${workflow.displayName ?? ""}`}
                                  density="compact"
                                  onSelect={() => {
                                    setTransitionEditor((previous) => {
                                      const selected = previous.workflowKeys.includes(workflow.key);
                                      return {
                                        ...previous,
                                        workflowKeys: selected
                                          ? previous.workflowKeys.filter(
                                              (key) => key !== workflow.key,
                                            )
                                          : [...previous.workflowKeys, workflow.key],
                                      };
                                    });
                                    setIsBindingsDirty(true);
                                  }}
                                >
                                  <div className="grid min-w-0 flex-1 gap-0.5">
                                    <span className="truncate font-medium">{workflow.key}</span>
                                    {(workflow.displayName?.trim().length ?? 0) > 0 ? (
                                      <span className="truncate text-[0.68rem] uppercase tracking-[0.08em] text-muted-foreground">
                                        {workflow.displayName}
                                      </span>
                                    ) : null}
                                  </div>
                                  {transitionEditor.workflowKeys.includes(workflow.key) ? (
                                    <CheckIcon className="size-3.5" />
                                  ) : null}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                ) : (
                  <div className="grid gap-6" onChangeCapture={() => setIsCompletionDirty(true)}>
                    <div className="grid gap-2">
                      <Label htmlFor="transition-completion-mode">Completion Gate Mode</Label>
                      <select
                        id="transition-completion-mode"
                        className="h-9 rounded-none border border-input bg-background px-2 text-xs"
                        value={transitionEditor.completionGate.mode}
                        onChange={(event) =>
                          updateGate("completion", (gate) => ({
                            ...gate,
                            mode: event.target.value === "any" ? "any" : "all",
                          }))
                        }
                      >
                        <option value="all">All conditions</option>
                        <option value="any">Any condition</option>
                      </select>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-none"
                        onClick={() => openGroupEditor("completion")}
                      >
                        Add Group
                      </Button>
                    </div>
                    <div className="grid gap-2">
                      <p className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                        Completion Groups
                      </p>
                      {transitionEditor.completionGate.groups.length > 0 ? (
                        transitionEditor.completionGate.groups.map((group, index) => (
                          <button
                            key={group.key}
                            type="button"
                            className="chiron-frame-flat w-full p-2 text-left text-xs"
                            aria-label={`Edit Completion Group ${index + 1}`}
                            onClick={() => openGroupEditorForEdit("completion", group.key)}
                          >
                            <p className="uppercase tracking-[0.12em] text-muted-foreground">
                              Group {index + 1} ({group.mode})
                            </p>
                            <p className="mt-1 text-foreground/90">
                              {group.conditions.length > 0
                                ? group.conditions.map(summarizeCondition).join(" • ")
                                : "No conditions in group."}
                            </p>
                          </button>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground">No groups added yet.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter
              data-testid="transition-dialog-footer"
              className="mt-6 shrink-0 border-t border-border pt-4 sm:justify-end sm:gap-4 sm:px-0"
            >
              <Button
                type="button"
                variant="outline"
                className="rounded-none px-6"
                onClick={requestCloseTransitionDialog}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-none px-8"
                disabled={
                  transitionEditor.transitionKey.trim().length === 0 ||
                  transitionEditor.toState.trim().length === 0
                }
              >
                {editingTransitionKey ? "Save Transition" : "Create Transition"}
              </Button>
            </DialogFooter>
          </form>

          {currentTransition ? (
            <p className="sr-only">Editing {currentTransition.transitionKey}</p>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={transitionDiscardOpen} onOpenChange={setTransitionDiscardOpen}>
        <DialogContent className="max-w-md rounded-none">
          <DialogHeader>
            <DialogTitle>Discard unsaved changes?</DialogTitle>
            <DialogDescription>
              You have unsaved transition edits. Discarding now will close the dialog and lose those
              changes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-none"
              onClick={() => setTransitionDiscardOpen(false)}
            >
              Keep Editing
            </Button>
            <Button type="button" className="rounded-none" onClick={closeTransitionDialog}>
              Discard Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={groupEditor !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setGroupEditor(null);
          }
        }}
      >
        <DialogContent className="flex w-[min(48rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-none p-6 sm:max-w-none sm:p-8">
          <DialogHeader className="shrink-0">
            <DialogTitle>{groupEditor?.groupKey ? "Edit Group" : "Add Group"}</DialogTitle>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto py-4 scrollbar-thin">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="transition-group-mode">Group Mode</Label>
                <select
                  id="transition-group-mode"
                  className="h-9 rounded-none border border-input bg-background px-2 text-xs"
                  value={groupEditor?.mode ?? "all"}
                  onChange={(event) =>
                    setGroupEditor((previous) =>
                      previous
                        ? {
                            ...previous,
                            mode: event.target.value === "any" ? "any" : "all",
                          }
                        : previous,
                    )
                  }
                >
                  <option value="all">All conditions</option>
                  <option value="any">Any condition</option>
                </select>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-none"
                  onClick={() => addGroupCondition("fact")}
                >
                  Add Project Fact Condition
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-none"
                  onClick={() => addGroupCondition("work_unit_fact")}
                >
                  Add Work Unit Fact Condition
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-none"
                  onClick={() => addGroupCondition("artifact")}
                >
                  Add Artifact Condition
                </Button>
              </div>
              <div className="grid gap-3">
                <p className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                  Group Conditions
                </p>
                {groupEditor && groupEditor.conditions.length > 0 ? (
                  groupEditor.conditions.map((condition, index) =>
                    renderConditionEditor(
                      condition,
                      (next) => updateGroupEditorCondition(index, next),
                      `group-condition-${index}`,
                    ),
                  )
                ) : (
                  <p className="text-xs text-muted-foreground">No conditions added yet.</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0">
            <Button
              type="button"
              variant="outline"
              className="rounded-none"
              onClick={() => setGroupEditor(null)}
            >
              Cancel
            </Button>
            <Button type="button" className="rounded-none" onClick={saveGroupEditor}>
              Save Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
