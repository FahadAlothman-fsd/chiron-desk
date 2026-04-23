import {
  AlertTriangleIcon,
  CheckIcon,
  ChevronsUpDownIcon,
  ListTreeIcon,
  PanelTopIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  SaveIcon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

import { Button } from "../../components/ui/button";
import { Checkbox } from "../../components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import { getPickerBadgeClassName } from "./dialogs";
import type {
  WorkflowActionStepPayload,
  WorkflowContextFactDefinitionItem,
  WorkflowEditorPickerBadge,
  WorkflowEditorPickerOption,
  WorkflowEditorStep,
} from "./types";

type ActionStepDialogMode = "create" | "edit";
type ActionStepEditorTab = "overview" | "actions" | "execution" | "guidance";
type ActionType = WorkflowActionStepPayload["actions"][number]["actionKind"];
type ActionDraft = WorkflowActionStepPayload["actions"][number];
type PropagationItemDraft = ActionDraft["items"][number];
type EligibleActionContextFact = WorkflowContextFactDefinitionItem & {
  kind: ActionDraft["contextFactKind"] | "artifact_slot_reference_fact";
};

type ActionStepDialogProps = {
  open: boolean;
  mode: ActionStepDialogMode;
  step?: WorkflowEditorStep | undefined;
  contextFactDefinitions: readonly WorkflowContextFactDefinitionItem[];
  onOpenChange: (open: boolean) => void;
  onSave: (payload: WorkflowActionStepPayload) => Promise<void> | void;
  onDelete?: (() => Promise<void> | void) | undefined;
};

type ActionDialogMode = "create" | "edit";

type PropagationActionDialogProps = {
  open: boolean;
  mode: ActionDialogMode;
  action: ActionDraft | null;
  eligibleContextFacts: readonly EligibleActionContextFact[];
  contextFactOptions: readonly WorkflowEditorPickerOption[];
  existingActionKeys: ReadonlySet<string>;
  onOpenChange: (open: boolean) => void;
  onSave: (action: ActionDraft) => void;
};

type ActionStepDialogSnapshot = {
  overview: { key: string; label: string; descriptionMarkdown: string };
  actions: { actions: WorkflowActionStepPayload["actions"] };
  execution: { executionMode: WorkflowActionStepPayload["executionMode"] };
  guidance: NonNullable<WorkflowActionStepPayload["guidance"]>;
};

const ACTION_TAB_ORDER: ReadonlyArray<{
  key: ActionStepEditorTab;
  label: string;
  icon: typeof PanelTopIcon;
}> = [
  { key: "overview", label: "Overview", icon: PanelTopIcon },
  { key: "actions", label: "Actions", icon: ListTreeIcon },
  { key: "execution", label: "Execution", icon: PlayIcon },
  { key: "guidance", label: "Guidance", icon: SparklesIcon },
];

const ACTION_TYPE_OPTIONS: ReadonlyArray<{
  value: ActionType;
  label: string;
  description: string;
}> = [
  {
    value: "propagation",
    label: "Propagation",
    description: "Propagate authored workflow context facts through stable propagation items.",
  },
];

const ACTION_ALLOWED_CONTEXT_FACT_KINDS = new Set([
  "bound_fact",
  "artifact_slot_reference_fact",
] as const);

function createLocalId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function createEmptyActionStepPayload(): WorkflowActionStepPayload {
  return {
    key: "",
    label: "",
    executionMode: "sequential",
    actions: [],
    guidance: {
      human: { markdown: "" },
      agent: { markdown: "" },
    },
  };
}

function isEligibleActionContextFactKind(
  kind: WorkflowContextFactDefinitionItem["kind"],
): kind is EligibleActionContextFact["kind"] {
  if (kind === "bound_fact" || kind === "artifact_slot_reference_fact") {
    return ACTION_ALLOWED_CONTEXT_FACT_KINDS.has(kind);
  }

  return false;
}

function isActionEditorStep(
  step: WorkflowEditorStep | undefined,
): step is Extract<WorkflowEditorStep, { stepType: "action" }> {
  return Boolean(step && step.stepType === "action" && "actions" in step.payload);
}

function normalizeActionStepPayload(
  step: WorkflowEditorStep | undefined,
): WorkflowActionStepPayload {
  if (!isActionEditorStep(step)) {
    return createEmptyActionStepPayload();
  }

  const payload = step.payload;
  return {
    ...createEmptyActionStepPayload(),
    ...payload,
    label: payload.label ?? "",
    ...(payload.descriptionJson ? { descriptionJson: payload.descriptionJson } : {}),
    actions: (payload.actions ?? []).map((action) => ({
      ...action,
      items: action.items.map((item) => ({
        ...item,
        targetContextFactDefinitionId:
          item.targetContextFactDefinitionId ?? action.contextFactDefinitionId,
      })),
    })),
    guidance: payload.guidance ?? {
      human: { markdown: "" },
      agent: { markdown: "" },
    },
  };
}

function normalizeActionOrders(actions: WorkflowActionStepPayload["actions"]) {
  return actions.map((action, actionIndex) => ({
    ...action,
    sortOrder: (actionIndex + 1) * 100,
    items: action.items.map((item, itemIndex) => ({
      ...item,
      sortOrder: (itemIndex + 1) * 100,
    })),
  }));
}

function stableStringify(value: unknown) {
  return JSON.stringify(value);
}

function toActionStepDialogSnapshot(value: WorkflowActionStepPayload): ActionStepDialogSnapshot {
  return {
    overview: {
      key: value.key,
      label: value.label ?? "",
      descriptionMarkdown: value.descriptionJson?.markdown ?? "",
    },
    actions: { actions: value.actions },
    execution: { executionMode: value.executionMode },
    guidance: value.guidance ?? {
      human: { markdown: "" },
      agent: { markdown: "" },
    },
  };
}

function getTabSnapshot(tab: ActionStepEditorTab, value: WorkflowActionStepPayload) {
  const snapshot = toActionStepDialogSnapshot(value);
  return stableStringify(snapshot[tab]);
}

function getValueTypeBadgeLabel(
  valueType: WorkflowContextFactDefinitionItem["valueType"],
): WorkflowEditorPickerBadge {
  switch (valueType) {
    case "number":
      return { label: "number", tone: "type-number" };
    case "boolean":
      return { label: "boolean", tone: "type-boolean" };
    case "json":
      return { label: "json", tone: "type-json" };
    case "work_unit":
      return { label: "work unit", tone: "type-work-unit" };
    case "string":
    default:
      return { label: "string", tone: "type-string" };
  }
}

function getContextKindBadge(fact: EligibleActionContextFact): WorkflowEditorPickerBadge | null {
  switch (fact.kind) {
    case "bound_fact":
      return { label: "bound", tone: "bound-fact" };
    case "artifact_slot_reference_fact":
      return { label: "artifact", tone: "artifact-snapshot" };
    default:
      return null;
  }
}

function getUnderlyingBindingBadges(fact: EligibleActionContextFact): WorkflowEditorPickerBadge[] {
  switch (fact.kind) {
    case "bound_fact":
      return fact.factDefinitionId?.trim()
        ? [
            {
              label: fact.factDefinitionId.trim(),
              tone: getContextKindBadge(fact)?.tone ?? "bound-fact",
            },
          ]
        : [];
    case "artifact_slot_reference_fact":
      return fact.slotDefinitionId?.trim()
        ? [{ label: fact.slotDefinitionId.trim(), tone: "artifact-snapshot" }]
        : [];
    default:
      return [];
  }
}

function buildContextFactOptions(
  facts: readonly EligibleActionContextFact[],
): WorkflowEditorPickerOption[] {
  return facts.map((fact) => {
    const badges: WorkflowEditorPickerBadge[] = [{ label: fact.cardinality, tone: "cardinality" }];
    const kindBadge = getContextKindBadge(fact);
    if (kindBadge) {
      badges.push(kindBadge);
    }
    if (fact.valueType) {
      badges.push(getValueTypeBadgeLabel(fact.valueType));
    }
    badges.push(...getUnderlyingBindingBadges(fact));

    return {
      value: fact.contextFactDefinitionId,
      label: fact.label,
      secondaryLabel: fact.key,
      description: fact.summary,
      badges,
      searchText: [
        fact.contextFactDefinitionId,
        fact.label,
        fact.key,
        fact.kind,
        fact.summary,
        ...badges.map((badge) => badge.label),
      ].join(" "),
    } satisfies WorkflowEditorPickerOption;
  });
}

function getActionTypeBadgeClassName(kind: ActionType) {
  return cn(
    "inline-flex w-fit items-center rounded-none border px-2 py-1 text-[0.64rem] uppercase tracking-[0.12em]",
    kind === "propagation"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
      : "border-border/70 bg-background/70 text-muted-foreground",
  );
}

function getActionTypeLabel(kind: ActionType) {
  return ACTION_TYPE_OPTIONS.find((option) => option.value === kind)?.label ?? kind;
}

function createDefaultPropagationItem(
  contextFactDefinitionId: string | undefined,
): PropagationItemDraft {
  return {
    itemId: createLocalId("action-item"),
    itemKey: "",
    label: "",
    sortOrder: 100,
    ...(contextFactDefinitionId ? { targetContextFactDefinitionId: contextFactDefinitionId } : {}),
  };
}

function createDefaultAction(
  kind: ActionType,
  index: number,
  firstEligibleFact?: EligibleActionContextFact,
): ActionDraft {
  const actionKeyBase = kind === "propagation" ? "propagate" : kind;
  return {
    actionId: createLocalId("action"),
    actionKey: `${actionKeyBase}-${index + 1}`,
    label: "",
    enabled: true,
    sortOrder: (index + 1) * 100,
    actionKind: kind,
    contextFactDefinitionId: firstEligibleFact?.contextFactDefinitionId ?? "",
    contextFactKind: firstEligibleFact?.kind ?? "bound_fact",
    items: [createDefaultPropagationItem(firstEligibleFact?.contextFactDefinitionId)],
  };
}

function derivePropagationActionCompatibility(params: {
  action: ActionDraft;
  factsById: ReadonlyMap<string, EligibleActionContextFact>;
}) {
  const selectedFacts = params.action.items.flatMap((item) => {
    const targetId = item.targetContextFactDefinitionId?.trim();
    if (!targetId) {
      return [];
    }
    const fact = params.factsById.get(targetId);
    return fact ? [{ item, fact }] : [];
  });

  const primary = selectedFacts[0];
  return {
    primary,
    selectedFacts,
    distinctKinds: new Set(selectedFacts.map((entry) => entry.fact.kind)),
    distinctTargetIds: new Set(selectedFacts.map((entry) => entry.fact.contextFactDefinitionId)),
  };
}

function validateActionStepPayload(
  value: WorkflowActionStepPayload,
  factsById: ReadonlyMap<string, EligibleActionContextFact>,
) {
  if (!value.key.trim()) {
    return "Action step key is required.";
  }

  if (value.actions.length < 1) {
    return "Add at least one action.";
  }

  if (!value.actions.some((action) => action.enabled !== false)) {
    return "Enable at least one action.";
  }

  const actionKeys = new Set<string>();
  for (const action of value.actions) {
    const trimmedActionKey = action.actionKey.trim();
    if (!trimmedActionKey) {
      return "Each action needs an action key.";
    }
    if (actionKeys.has(trimmedActionKey)) {
      return "Action keys must be unique within the step.";
    }
    actionKeys.add(trimmedActionKey);

    if (action.items.length < 1) {
      return `Action '${trimmedActionKey}' must include at least one propagation item.`;
    }

    const itemKeys = new Set<string>();
    for (const item of action.items) {
      const trimmedItemKey = item.itemKey.trim();
      if (!trimmedItemKey) {
        return `Every item in action '${trimmedActionKey}' needs an item key.`;
      }
      if (itemKeys.has(trimmedItemKey)) {
        return `Item keys in action '${trimmedActionKey}' must be unique.`;
      }
      itemKeys.add(trimmedItemKey);

      const targetId = item.targetContextFactDefinitionId?.trim();
      if (!targetId) {
        return `Select a context fact for '${trimmedItemKey}'.`;
      }

      const fact = factsById.get(targetId);
      if (!fact) {
        return `Action item '${trimmedItemKey}' targets an unknown context fact.`;
      }
    }
  }

  return null;
}

function normalizeActionStepForSave(
  value: WorkflowActionStepPayload,
  factsById: ReadonlyMap<string, EligibleActionContextFact>,
): WorkflowActionStepPayload {
  return {
    ...value,
    key: value.key.trim(),
    ...(value.label?.trim() ? { label: value.label.trim() } : { label: undefined }),
    ...(value.descriptionJson?.markdown?.trim()
      ? { descriptionJson: { markdown: value.descriptionJson.markdown.trim() } }
      : {}),
    actions: normalizeActionOrders(
      value.actions.map((action) => {
        const compatibility = derivePropagationActionCompatibility({ action, factsById });
        const primaryFact = compatibility.primary?.fact;
        return {
          ...action,
          actionKey: action.actionKey.trim(),
          ...(action.label?.trim() ? { label: action.label.trim() } : { label: undefined }),
          contextFactDefinitionId:
            primaryFact?.contextFactDefinitionId ?? action.contextFactDefinitionId,
          contextFactKind: primaryFact?.kind ?? action.contextFactKind,
          items: action.items.map((item) => ({
            ...item,
            itemKey: item.itemKey.trim(),
            ...(item.label?.trim() ? { label: item.label.trim() } : { label: undefined }),
            targetContextFactDefinitionId:
              item.targetContextFactDefinitionId?.trim() || action.contextFactDefinitionId,
          })),
        };
      }),
    ),
    guidance: {
      human: { markdown: value.guidance?.human.markdown ?? "" },
      agent: { markdown: value.guidance?.agent.markdown ?? "" },
    },
  };
}

function SearchableCombobox(props: {
  labelId?: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly WorkflowEditorPickerOption[];
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selectedOption = props.options.find((option) => option.value === props.value);

  useEffect(() => {
    if (props.disabled && open) {
      setOpen(false);
    }
  }, [open, props.disabled]);

  return (
    <Popover
      open={props.disabled ? false : open}
      onOpenChange={props.disabled ? undefined : setOpen}
    >
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-labelledby={props.labelId}
            aria-expanded={open}
            disabled={props.disabled}
            className="h-8 w-full justify-between rounded-none border-input bg-transparent px-2.5 py-1 font-normal"
          >
            <span className="truncate text-xs">
              {selectedOption ? selectedOption.label : props.placeholder}
            </span>
            <ChevronsUpDownIcon className="size-3.5 shrink-0 opacity-70" />
          </Button>
        }
      />
      <PopoverContent
        className="w-[var(--anchor-width)] p-0"
        align="start"
        frame="cut-thin"
        tone="context"
        sideOffset={4}
      >
        <Command density="compact" frame="default">
          <CommandInput density="compact" placeholder={props.searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{props.emptyLabel}</CommandEmpty>
            <CommandGroup heading="Options">
              {props.options.map((option) => (
                <CommandItem
                  key={option.value}
                  {...(typeof option.disabled === "boolean" ? { disabled: option.disabled } : {})}
                  value={
                    option.searchText ??
                    [
                      option.value,
                      option.label,
                      option.secondaryLabel ?? "",
                      option.description ?? "",
                      ...(option.badges?.map((badge) => badge.label) ?? []),
                    ].join(" ")
                  }
                  density="compact"
                  onSelect={() => {
                    if (option.disabled) {
                      return;
                    }
                    props.onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <div className="flex min-w-0 items-start gap-2">
                    <div className="grid min-w-0 flex-1 gap-1">
                      <span className="truncate font-medium">{option.label}</span>
                      {option.secondaryLabel ? (
                        <span className="truncate text-[0.68rem] uppercase tracking-[0.08em] text-muted-foreground">
                          {option.secondaryLabel}
                        </span>
                      ) : null}
                      {option.badges?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {option.badges.map((badge) => (
                            <span
                              key={`${option.value}-${badge.tone}-${badge.label}`}
                              className={getPickerBadgeClassName(badge)}
                            >
                              {badge.label}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    {props.value === option.value ? (
                      <CheckIcon className="mt-0.5 size-3.5 shrink-0" />
                    ) : null}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function summarizeActionKinds(
  action: ActionDraft,
  factsById: ReadonlyMap<string, EligibleActionContextFact>,
) {
  const compatibility = derivePropagationActionCompatibility({ action, factsById });
  const distinctTargets = compatibility.distinctTargetIds.size;

  return {
    itemCount: action.items.length,
    distinctTargets,
    distinctKinds: compatibility.distinctKinds.size,
  };
}

function getTargetContextFactBadge(fact: EligibleActionContextFact): WorkflowEditorPickerBadge {
  switch (fact.kind) {
    case "bound_fact":
      return { label: fact.label, tone: "bound-fact" };
    case "artifact_slot_reference_fact":
      return { label: fact.label, tone: "artifact-snapshot" };
    default:
      return { label: fact.label, tone: "bound-fact" };
  }
}

function PropagationActionDialog({
  open,
  mode,
  action,
  eligibleContextFacts,
  contextFactOptions,
  existingActionKeys,
  onOpenChange,
  onSave,
}: PropagationActionDialogProps) {
  const [draft, setDraft] = useState<ActionDraft | null>(action);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const factsById = useMemo(
    () => new Map(eligibleContextFacts.map((fact) => [fact.contextFactDefinitionId, fact])),
    [eligibleContextFacts],
  );
  const initialSnapshot = useMemo(() => (action ? stableStringify(action) : null), [action]);

  useEffect(() => {
    if (!open) {
      setShowDiscardDialog(false);
      setStatusMessage(null);
      return;
    }

    setDraft(action ? structuredClone(action) : null);
    setShowDiscardDialog(false);
    setStatusMessage(null);
  }, [action, open]);

  const isDirty = useMemo(() => {
    if (!open || !draft || !initialSnapshot) {
      return false;
    }
    return stableStringify(draft) !== initialSnapshot;
  }, [draft, initialSnapshot, open]);

  if (!draft) {
    return null;
  }

  const compatibility = derivePropagationActionCompatibility({ action: draft, factsById });
  const actionStats = summarizeActionKinds(draft, factsById);
  const normalizedExistingActionKeys = new Set(
    [...existingActionKeys].map((entry) => entry.trim()),
  );

  const validateDraft = () => {
    const trimmedActionKey = draft.actionKey.trim();
    if (!trimmedActionKey) {
      return "Action key is required.";
    }
    if (normalizedExistingActionKeys.has(trimmedActionKey)) {
      return "Action key must be unique within the step.";
    }
    if (draft.items.length < 1) {
      return "Add at least one propagation item.";
    }

    const itemKeys = new Set<string>();
    for (const item of draft.items) {
      const trimmedItemKey = item.itemKey.trim();
      if (!trimmedItemKey) {
        return "Every propagation item needs an item key.";
      }
      if (itemKeys.has(trimmedItemKey)) {
        return "Propagation item keys must be unique within the action.";
      }
      itemKeys.add(trimmedItemKey);

      const targetId = item.targetContextFactDefinitionId?.trim();
      if (!targetId) {
        return `Select a context fact for '${trimmedItemKey}'.`;
      }
      const fact = factsById.get(targetId);
      if (!fact) {
        return `Propagation item '${trimmedItemKey}' targets an unknown context fact.`;
      }
    }

    return null;
  };

  const requestClose = () => {
    if (isDirty) {
      setShowDiscardDialog(true);
      return;
    }
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && requestClose()}>
        <DialogContent className="flex w-[min(52rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] max-w-none flex-col overflow-hidden rounded-none p-0 sm:max-w-none">
          <DialogHeader className="border-b border-border/80 px-5 py-4">
            <DialogTitle className="font-geist-pixel-square text-base uppercase tracking-[0.12em]">
              {mode === "create" ? "Add Action" : "Edit Action"}
            </DialogTitle>
            <DialogDescription>
              Configure one action type at a time. Propagation actions keep their authored items
              together.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <div className="grid gap-4">
              {statusMessage ? (
                <p className="border border-destructive/45 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {statusMessage}
                </p>
              ) : null}

              <section className="grid gap-3 border border-border/70 bg-background/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                      Action type
                    </p>
                    <span className={getActionTypeBadgeClassName(draft.actionKind)}>
                      {getActionTypeLabel(draft.actionKind)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex rounded-none border border-border/70 px-2 py-1 text-[0.64rem] uppercase tracking-[0.12em] text-muted-foreground">
                      {actionStats.itemCount} item{actionStats.itemCount === 1 ? "" : "s"}
                    </span>
                    <span className="inline-flex rounded-none border border-border/70 px-2 py-1 text-[0.64rem] uppercase tracking-[0.12em] text-muted-foreground">
                      {actionStats.distinctTargets} target
                      {actionStats.distinctTargets === 1 ? "" : "s"}
                    </span>
                    <span className="inline-flex rounded-none border border-border/70 px-2 py-1 text-[0.64rem] uppercase tracking-[0.12em] text-muted-foreground">
                      {actionStats.distinctKinds} kind{actionStats.distinctKinds === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <label
                      className="text-xs uppercase tracking-[0.12em] text-muted-foreground"
                      htmlFor={`action-key-${draft.actionId}`}
                    >
                      Action key
                    </label>
                    <Input
                      id={`action-key-${draft.actionId}`}
                      aria-label="Action key"
                      value={draft.actionKey}
                      onChange={(event) =>
                        setDraft((previous) =>
                          previous ? { ...previous, actionKey: event.target.value } : previous,
                        )
                      }
                    />
                  </div>

                  <div className="grid gap-2">
                    <label
                      className="text-xs uppercase tracking-[0.12em] text-muted-foreground"
                      htmlFor={`action-label-${draft.actionId}`}
                    >
                      Action name
                    </label>
                    <Input
                      id={`action-label-${draft.actionId}`}
                      aria-label="Action name"
                      value={draft.label ?? ""}
                      onChange={(event) =>
                        setDraft((previous) =>
                          previous ? { ...previous, label: event.target.value } : previous,
                        )
                      }
                    />
                  </div>

                  <label
                    className="flex items-center gap-3 text-xs text-foreground md:col-span-2"
                    htmlFor={`action-enabled-${draft.actionId}`}
                  >
                    <Checkbox
                      id={`action-enabled-${draft.actionId}`}
                      checked={draft.enabled !== false}
                      onCheckedChange={(checked) =>
                        setDraft((previous) =>
                          previous ? { ...previous, enabled: Boolean(checked) } : previous,
                        )
                      }
                    />
                    Action enabled
                  </label>
                </div>

                <div className="border border-border/70 bg-background/50 p-3 text-xs text-muted-foreground">
                  This action groups propagation items only. Each item selects its own target
                  context fact, and mixed propagation kinds are allowed in the same action.
                </div>
              </section>

              <section className="grid gap-3 border border-border/70 bg-background/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                      Propagation items
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Pick the context fact each propagation item targets, then name the item row.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    className="rounded-none"
                    onClick={() =>
                      setDraft((previous) =>
                        previous
                          ? {
                              ...previous,
                              items: [
                                ...previous.items,
                                {
                                  ...createDefaultPropagationItem(undefined),
                                  itemKey: `${previous.actionKey || "item"}-${previous.items.length + 1}`,
                                  sortOrder: (previous.items.length + 1) * 100,
                                },
                              ],
                            }
                          : previous,
                      )
                    }
                  >
                    <PlusIcon className="size-3" /> Add propagation item
                  </Button>
                </div>

                {draft.items.length === 0 ? (
                  <div className="border border-dashed border-border/70 bg-background/40 px-4 py-6 text-sm text-muted-foreground">
                    No propagation items configured yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {draft.items.map((item, itemIndex) => {
                      const targetFact = item.targetContextFactDefinitionId
                        ? factsById.get(item.targetContextFactDefinitionId)
                        : undefined;
                      const itemScopedContextFactOptions = contextFactOptions.map((option) => {
                        const selectedBySibling = draft.items.some(
                          (entry) =>
                            entry.itemId !== item.itemId &&
                            entry.targetContextFactDefinitionId === option.value,
                        );

                        if (
                          !selectedBySibling ||
                          option.value === item.targetContextFactDefinitionId
                        ) {
                          return option;
                        }

                        return {
                          ...option,
                          disabled: true,
                        } satisfies WorkflowEditorPickerOption;
                      });

                      return (
                        <article
                          key={item.itemId}
                          className="grid gap-4 border border-border/70 bg-background/50 p-3"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-1">
                              <p className="font-geist-pixel-square text-sm uppercase tracking-[0.12em]">
                                {item.label?.trim() ||
                                  item.itemKey ||
                                  `Propagation Item ${itemIndex + 1}`}
                              </p>
                              <p className="text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground">
                                {item.itemId}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="xs"
                                variant="outline"
                                className="rounded-none"
                                disabled={itemIndex === 0}
                                onClick={() =>
                                  setDraft((previous) => {
                                    if (!previous) {
                                      return previous;
                                    }
                                    const nextItems = [...previous.items];
                                    const [moved] = nextItems.splice(itemIndex, 1);
                                    nextItems.splice(itemIndex - 1, 0, moved!);
                                    return { ...previous, items: nextItems };
                                  })
                                }
                              >
                                Up
                              </Button>
                              <Button
                                type="button"
                                size="xs"
                                variant="outline"
                                className="rounded-none"
                                disabled={itemIndex === draft.items.length - 1}
                                onClick={() =>
                                  setDraft((previous) => {
                                    if (!previous) {
                                      return previous;
                                    }
                                    const nextItems = [...previous.items];
                                    const [moved] = nextItems.splice(itemIndex, 1);
                                    nextItems.splice(itemIndex + 1, 0, moved!);
                                    return { ...previous, items: nextItems };
                                  })
                                }
                              >
                                Down
                              </Button>
                              <Button
                                type="button"
                                size="xs"
                                variant="destructive"
                                className="rounded-none"
                                onClick={() =>
                                  setDraft((previous) =>
                                    previous
                                      ? {
                                          ...previous,
                                          items: previous.items.filter(
                                            (entry) => entry.itemId !== item.itemId,
                                          ),
                                        }
                                      : previous,
                                  )
                                }
                              >
                                Remove
                              </Button>
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2 md:col-span-2">
                              <p
                                id={`target-context-${item.itemId}`}
                                className="text-xs uppercase tracking-[0.12em] text-muted-foreground"
                              >
                                Context fact to propagate
                              </p>
                              <SearchableCombobox
                                labelId={`target-context-${item.itemId}`}
                                value={item.targetContextFactDefinitionId ?? ""}
                                onChange={(value) =>
                                  setDraft((previous) =>
                                    previous
                                      ? {
                                          ...previous,
                                          items: previous.items.map((entry) =>
                                            entry.itemId === item.itemId
                                              ? { ...entry, targetContextFactDefinitionId: value }
                                              : entry,
                                          ),
                                        }
                                      : previous,
                                  )
                                }
                                options={itemScopedContextFactOptions}
                                placeholder="Choose a context fact"
                                searchPlaceholder="Search context facts"
                                emptyLabel="No Action-eligible context facts available."
                              />
                              {targetFact ? (
                                <p className="text-xs text-muted-foreground">
                                  {targetFact.summary}
                                </p>
                              ) : null}
                            </div>

                            <div className="grid gap-2">
                              <label
                                className="text-xs uppercase tracking-[0.12em] text-muted-foreground"
                                htmlFor={`item-key-${item.itemId}`}
                              >
                                Item key
                              </label>
                              <Input
                                id={`item-key-${item.itemId}`}
                                aria-label={`Item key ${itemIndex + 1}`}
                                value={item.itemKey}
                                onChange={(event) =>
                                  setDraft((previous) =>
                                    previous
                                      ? {
                                          ...previous,
                                          items: previous.items.map((entry) =>
                                            entry.itemId === item.itemId
                                              ? { ...entry, itemKey: event.target.value }
                                              : entry,
                                          ),
                                        }
                                      : previous,
                                  )
                                }
                              />
                            </div>

                            <div className="grid gap-2">
                              <label
                                className="text-xs uppercase tracking-[0.12em] text-muted-foreground"
                                htmlFor={`item-label-${item.itemId}`}
                              >
                                Item label
                              </label>
                              <Input
                                id={`item-label-${item.itemId}`}
                                aria-label={`Item label ${itemIndex + 1}`}
                                value={item.label ?? ""}
                                onChange={(event) =>
                                  setDraft((previous) =>
                                    previous
                                      ? {
                                          ...previous,
                                          items: previous.items.map((entry) =>
                                            entry.itemId === item.itemId
                                              ? { ...entry, label: event.target.value }
                                              : entry,
                                          ),
                                        }
                                      : previous,
                                  )
                                }
                              />
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="grid gap-2 border border-border/70 bg-background/40 p-4 text-xs text-muted-foreground">
                <p className="text-[0.68rem] uppercase tracking-[0.14em]">Configured stats</p>
                <p>
                  Distinct target facts: {compatibility.distinctTargetIds.size} · Compatible kind
                  set: {compatibility.distinctKinds.size}
                </p>
              </section>
            </div>
          </div>

          <DialogFooter className="border-t border-border/80 px-5 py-4 sm:justify-between">
            <Button type="button" variant="outline" className="rounded-none" onClick={requestClose}>
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-none"
              onClick={() => {
                const validationMessage = validateDraft();
                if (validationMessage) {
                  setStatusMessage(validationMessage);
                  return;
                }

                const primary = derivePropagationActionCompatibility({ action: draft, factsById })
                  .primary?.fact;
                if (!primary) {
                  setStatusMessage("Select a context fact for at least one propagation item.");
                  return;
                }

                onSave({
                  ...draft,
                  actionKey: draft.actionKey.trim(),
                  ...(draft.label?.trim() ? { label: draft.label.trim() } : { label: undefined }),
                  contextFactDefinitionId: primary.contextFactDefinitionId,
                  contextFactKind: primary.kind,
                  items: draft.items.map((item) => ({
                    ...item,
                    itemKey: item.itemKey.trim(),
                    ...(item.label?.trim() ? { label: item.label.trim() } : { label: undefined }),
                  })),
                });
              }}
            >
              {mode === "create" ? "Add action" : "Save action"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <DialogContent className="w-[min(28rem,calc(100vw-2rem))] max-w-none rounded-none p-6 sm:max-w-none">
          <DialogHeader>
            <DialogTitle className="text-base uppercase tracking-[0.08em]">
              Discard action changes?
            </DialogTitle>
            <DialogDescription>
              This action draft has unsaved changes. Discard them and close the stacked dialog?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="rounded-none"
              onClick={() => setShowDiscardDialog(false)}
            >
              Keep editing
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-none"
              onClick={() => {
                setShowDiscardDialog(false);
                onOpenChange(false);
              }}
            >
              <AlertTriangleIcon className="size-3.5" /> Discard changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ActionStepDialog({
  open,
  mode,
  step,
  contextFactDefinitions,
  onOpenChange,
  onSave,
  onDelete,
}: ActionStepDialogProps) {
  const [activeTab, setActiveTab] = useState<ActionStepEditorTab>("overview");
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState<WorkflowActionStepPayload>(createEmptyActionStepPayload());
  const [initialSnapshot, setInitialSnapshot] = useState<ActionStepDialogSnapshot | null>(null);
  const [selectedActionKind, setSelectedActionKind] = useState<ActionType | "">("");
  const [isActionDialogOpen, setActionDialogOpen] = useState(false);
  const [editingActionDraft, setEditingActionDraft] = useState<ActionDraft | null>(null);
  const [actionDialogMode, setActionDialogMode] = useState<ActionDialogMode>("create");

  const eligibleContextFacts = useMemo(
    () =>
      contextFactDefinitions.filter((fact): fact is EligibleActionContextFact =>
        isEligibleActionContextFactKind(fact.kind),
      ),
    [contextFactDefinitions],
  );
  const contextFactsById = useMemo(
    () => new Map(eligibleContextFacts.map((fact) => [fact.contextFactDefinitionId, fact])),
    [eligibleContextFacts],
  );
  const contextFactOptions = useMemo(
    () => buildContextFactOptions(eligibleContextFacts),
    [eligibleContextFacts],
  );
  const defaultValues = useMemo(() => normalizeActionStepPayload(step), [step]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setDraft(defaultValues);
    setInitialSnapshot(toActionStepDialogSnapshot(defaultValues));
    setActiveTab("overview");
    setStatusMessage(null);
    setShowDiscardDialog(false);
    setSelectedActionKind("");
    setActionDialogOpen(false);
    setEditingActionDraft(null);
    setActionDialogMode("create");
  }, [defaultValues, open]);

  const dirtyTabs = useMemo(
    () =>
      new Map(
        ACTION_TAB_ORDER.map((tab) => [
          tab.key,
          initialSnapshot
            ? getTabSnapshot(tab.key, draft) !== stableStringify(initialSnapshot[tab.key])
            : false,
        ]),
      ),
    [draft, initialSnapshot],
  );
  const isDirty = [...dirtyTabs.values()].some(Boolean);

  const requestClose = () => {
    if (isDirty) {
      setShowDiscardDialog(true);
      return;
    }
    onOpenChange(false);
  };

  const existingActionKeys = useMemo(() => {
    if (!editingActionDraft) {
      return new Set(draft.actions.map((action) => action.actionKey));
    }
    return new Set(
      draft.actions
        .filter((action) => action.actionId !== editingActionDraft.actionId)
        .map((action) => action.actionKey),
    );
  }, [draft.actions, editingActionDraft]);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && requestClose()}>
      <DialogContent className="flex w-[min(76rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] max-w-none flex-col overflow-hidden p-0 sm:max-w-none">
        <DialogHeader className="border-b border-border/80 px-5 py-4">
          <DialogTitle className="font-geist-pixel-square text-base uppercase tracking-[0.12em]">
            {mode === "create"
              ? "Create Action Step"
              : `Edit ${draft.label || draft.key || "Action Step"}`}
          </DialogTitle>
          <DialogDescription>
            Author the step contract, action overview, runtime mode, and guidance. Configure each
            action in its own stacked dialog.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="border-r border-border/80 bg-card/60 p-3">
            <nav className="grid gap-2">
              {ACTION_TAB_ORDER.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                const isTabDirty = dirtyTabs.get(tab.key) === true;

                return (
                  <button
                    key={tab.key}
                    type="button"
                    className={cn(
                      "chiron-frame-flat flex items-center justify-between gap-3 px-3 py-2 text-left text-xs transition-colors",
                      isActive ? "bg-accent/30" : "hover:bg-accent/15",
                    )}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="size-3.5" />
                      <span className="uppercase tracking-[0.12em]">{tab.label}</span>
                    </span>
                    {isTabDirty ? <span className="size-2 bg-primary" aria-hidden="true" /> : null}
                  </button>
                );
              })}
            </nav>
          </aside>

          <section className="overflow-y-auto p-5">
            {statusMessage ? (
              <p className="mb-4 border border-destructive/45 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {statusMessage}
              </p>
            ) : null}

            {activeTab === "overview" ? (
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <label
                    htmlFor="action-step-key"
                    className="text-xs uppercase tracking-[0.12em] text-muted-foreground"
                  >
                    Step key
                  </label>
                  <Input
                    id="action-step-key"
                    aria-label="Step key"
                    value={draft.key}
                    onChange={(event) =>
                      setDraft((previous) => ({ ...previous, key: event.target.value }))
                    }
                    placeholder="propagate_setup_context"
                  />
                </div>

                <div className="grid gap-2">
                  <label
                    htmlFor="action-step-label"
                    className="text-xs uppercase tracking-[0.12em] text-muted-foreground"
                  >
                    Label
                  </label>
                  <Input
                    id="action-step-label"
                    aria-label="Label"
                    value={draft.label ?? ""}
                    onChange={(event) =>
                      setDraft((previous) => ({ ...previous, label: event.target.value }))
                    }
                    placeholder="Propagate Setup Context"
                  />
                </div>

                <div className="grid gap-2">
                  <label
                    htmlFor="action-step-description"
                    className="text-xs uppercase tracking-[0.12em] text-muted-foreground"
                  >
                    Description
                  </label>
                  <Textarea
                    id="action-step-description"
                    aria-label="Description"
                    value={draft.descriptionJson?.markdown ?? ""}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        descriptionJson:
                          event.target.value.trim().length > 0
                            ? { markdown: event.target.value }
                            : undefined,
                      }))
                    }
                    placeholder="Describe the deterministic actions this step authors."
                  />
                </div>
              </div>
            ) : null}

            {activeTab === "actions" ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-3 border border-border/70 bg-background/40 p-3">
                  <div className="grid gap-1">
                    <p className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                      Action overview
                    </p>
                    <p className="text-sm text-foreground">
                      Add an action type first, then configure its details in a stacked dialog.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-end gap-2">
                    <div className="grid gap-1">
                      <label
                        htmlFor="new-action-type"
                        className="text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground"
                      >
                        Action type
                      </label>
                      <Select
                        value={selectedActionKind}
                        onValueChange={(value) => setSelectedActionKind(value as ActionType)}
                      >
                        <SelectTrigger id="new-action-type" className="w-[14rem] rounded-none">
                          <SelectValue placeholder="Select action type" />
                        </SelectTrigger>
                        <SelectContent>
                          {ACTION_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-none"
                      disabled={!selectedActionKind}
                      onClick={() => {
                        if (!selectedActionKind) {
                          return;
                        }
                        setActionDialogMode("create");
                        setEditingActionDraft(
                          createDefaultAction(
                            selectedActionKind,
                            draft.actions.length,
                            eligibleContextFacts[0],
                          ),
                        );
                        setActionDialogOpen(true);
                      }}
                    >
                      <PlusIcon className="size-3.5" /> Add Action
                    </Button>
                  </div>
                </div>

                {eligibleContextFacts.length === 0 ? (
                  <p className="border border-amber-400/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                    No Action-eligible workflow context facts are available yet.
                  </p>
                ) : null}

                {draft.actions.length === 0 ? (
                  <div className="border border-dashed border-border/70 bg-background/40 px-4 py-6 text-sm text-muted-foreground">
                    No actions configured yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {draft.actions.map((action, actionIndex) => {
                      const summary = summarizeActionKinds(action, contextFactsById);
                      const targetedFacts = Array.from(
                        new Map(
                          action.items
                            .map((item) => item.targetContextFactDefinitionId)
                            .filter(
                              (value): value is string =>
                                typeof value === "string" && value.trim().length > 0,
                            )
                            .map((value) => [value, contextFactsById.get(value)]),
                        ).values(),
                      ).filter((fact): fact is EligibleActionContextFact => Boolean(fact));

                      return (
                        <section
                          key={action.actionId}
                          className="space-y-4 border border-border/70 bg-background/40 p-4"
                        >
                          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={getActionTypeBadgeClassName(action.actionKind)}>
                                  {getActionTypeLabel(action.actionKind)}
                                </span>
                                <span className="inline-flex rounded-none border border-border/70 px-2 py-1 text-[0.64rem] uppercase tracking-[0.12em] text-muted-foreground">
                                  {action.enabled !== false ? "enabled" : "disabled"}
                                </span>
                              </div>
                              <p className="text-sm text-foreground">
                                {action.label?.trim() || action.actionKey || "Untitled action"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {action.actionKey} · {summary.itemCount} item
                                {summary.itemCount === 1 ? "" : "s"}
                              </p>
                              {targetedFacts.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {targetedFacts.map((fact) => {
                                    const badge = getTargetContextFactBadge(fact);
                                    return (
                                      <span
                                        key={`${action.actionId}-${fact.contextFactDefinitionId}`}
                                        className={getPickerBadgeClassName(badge)}
                                      >
                                        {badge.label}
                                      </span>
                                    );
                                  })}
                                </div>
                              ) : null}
                            </div>

                            <div className="flex flex-wrap gap-2 lg:justify-end lg:self-start">
                              <Button
                                type="button"
                                size="xs"
                                variant="outline"
                                className="rounded-none"
                                disabled={actionIndex === 0}
                                onClick={() =>
                                  setDraft((previous) => {
                                    const next = [...previous.actions];
                                    const [moved] = next.splice(actionIndex, 1);
                                    next.splice(actionIndex - 1, 0, moved!);
                                    return { ...previous, actions: normalizeActionOrders(next) };
                                  })
                                }
                              >
                                Move up
                              </Button>
                              <Button
                                type="button"
                                size="xs"
                                variant="outline"
                                className="rounded-none"
                                disabled={actionIndex === draft.actions.length - 1}
                                onClick={() =>
                                  setDraft((previous) => {
                                    const next = [...previous.actions];
                                    const [moved] = next.splice(actionIndex, 1);
                                    next.splice(actionIndex + 1, 0, moved!);
                                    return { ...previous, actions: normalizeActionOrders(next) };
                                  })
                                }
                              >
                                Move down
                              </Button>
                              <Button
                                type="button"
                                size="xs"
                                variant="outline"
                                className="rounded-none"
                                onClick={() => {
                                  setActionDialogMode("edit");
                                  setEditingActionDraft(structuredClone(action));
                                  setActionDialogOpen(true);
                                }}
                              >
                                <PencilIcon className="size-3" /> Edit action
                              </Button>
                              <Button
                                type="button"
                                size="xs"
                                variant="destructive"
                                className="rounded-none"
                                onClick={() =>
                                  setDraft((previous) => ({
                                    ...previous,
                                    actions: normalizeActionOrders(
                                      previous.actions.filter(
                                        (entry) => entry.actionId !== action.actionId,
                                      ),
                                    ),
                                  }))
                                }
                              >
                                <Trash2Icon className="size-3" /> Remove
                              </Button>
                            </div>
                          </div>
                        </section>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}

            {activeTab === "execution" ? (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  {(
                    [
                      {
                        key: "sequential",
                        title: "Sequential",
                        body: "Run earlier enabled actions first. Later actions stay blocked until those succeed.",
                      },
                      {
                        key: "parallel",
                        title: "Parallel",
                        body: "Allow explicit runtime run / retry actions for any enabled row without sequential gating.",
                      },
                    ] as const
                  ).map((option) => {
                    const isSelected = draft.executionMode === option.key;

                    return (
                      <button
                        key={option.key}
                        type="button"
                        className={cn(
                          "border p-4 text-left transition-colors",
                          isSelected
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border/70 bg-background/40 text-muted-foreground hover:bg-background/60",
                        )}
                        onClick={() =>
                          setDraft((previous) => ({ ...previous, executionMode: option.key }))
                        }
                      >
                        <div className="space-y-2">
                          <p className="font-geist-pixel-square text-sm uppercase tracking-[0.12em]">
                            {option.title}
                          </p>
                          <p className="text-xs/relaxed">{option.body}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="border border-border/70 bg-background/40 p-3 text-xs text-muted-foreground">
                  Runtime remains locked to lazy rows, manual completion, idempotent duplicate run /
                  retry behavior, and propagation-only actions in Plan A.
                </div>
              </div>
            ) : null}

            {activeTab === "guidance" ? (
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <label
                    htmlFor="action-step-human-guidance"
                    className="text-xs uppercase tracking-[0.12em] text-muted-foreground"
                  >
                    Human guidance
                  </label>
                  <Textarea
                    id="action-step-human-guidance"
                    aria-label="Human guidance"
                    value={draft.guidance?.human.markdown ?? ""}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        guidance: {
                          human: { markdown: event.target.value },
                          agent: { markdown: previous.guidance?.agent.markdown ?? "" },
                        },
                      }))
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <label
                    htmlFor="action-step-agent-guidance"
                    className="text-xs uppercase tracking-[0.12em] text-muted-foreground"
                  >
                    Agent guidance
                  </label>
                  <Textarea
                    id="action-step-agent-guidance"
                    aria-label="Agent guidance"
                    value={draft.guidance?.agent.markdown ?? ""}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        guidance: {
                          human: { markdown: previous.guidance?.human.markdown ?? "" },
                          agent: { markdown: event.target.value },
                        },
                      }))
                    }
                  />
                </div>
              </div>
            ) : null}
          </section>
        </div>

        <DialogFooter className="border-t border-border/80 px-5 py-4 sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="rounded-none" onClick={requestClose}>
              Close
            </Button>
            {mode === "edit" && onDelete ? (
              <Button
                type="button"
                variant="destructive"
                className="rounded-none"
                onClick={() => void onDelete()}
              >
                Delete step
              </Button>
            ) : null}
          </div>

          <Button
            type="button"
            className="rounded-none"
            onClick={() => {
              const validationMessage = validateActionStepPayload(draft, contextFactsById);
              if (validationMessage) {
                setStatusMessage(validationMessage);
                return;
              }

              setStatusMessage(null);
              void onSave(normalizeActionStepForSave(draft, contextFactsById));
            }}
          >
            <SaveIcon className="size-3.5" /> Save action step
          </Button>
        </DialogFooter>

        <Dialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
          <DialogContent className="w-[min(28rem,calc(100vw-2rem))] max-w-none rounded-none p-6 sm:max-w-none">
            <DialogHeader>
              <DialogTitle className="text-base uppercase tracking-[0.08em]">
                Discard unsaved changes?
              </DialogTitle>
              <DialogDescription>
                This Action-step draft has unsaved changes. Discard them and close the dialog?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-between">
              <Button
                type="button"
                variant="outline"
                className="rounded-none"
                onClick={() => setShowDiscardDialog(false)}
              >
                Keep editing
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="rounded-none"
                onClick={() => {
                  setShowDiscardDialog(false);
                  setDraft(defaultValues);
                  onOpenChange(false);
                }}
              >
                <AlertTriangleIcon className="size-3.5" /> Discard changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <PropagationActionDialog
          open={isActionDialogOpen}
          mode={actionDialogMode}
          action={editingActionDraft}
          eligibleContextFacts={eligibleContextFacts}
          contextFactOptions={contextFactOptions}
          existingActionKeys={existingActionKeys}
          onOpenChange={(nextOpen) => {
            setActionDialogOpen(nextOpen);
            if (!nextOpen) {
              setEditingActionDraft(null);
            }
          }}
          onSave={(action) => {
            setDraft((previous) => {
              const existingIndex = previous.actions.findIndex(
                (entry) => entry.actionId === action.actionId,
              );
              if (existingIndex === -1) {
                return {
                  ...previous,
                  actions: normalizeActionOrders([...previous.actions, action]),
                };
              }

              return {
                ...previous,
                actions: normalizeActionOrders(
                  previous.actions.map((entry) =>
                    entry.actionId === action.actionId ? action : entry,
                  ),
                ),
              };
            });
            setActionDialogOpen(false);
            setEditingActionDraft(null);
            setSelectedActionKind("");
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
