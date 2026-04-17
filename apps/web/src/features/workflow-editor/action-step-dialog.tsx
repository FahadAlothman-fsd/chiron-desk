import { useForm } from "@tanstack/react-form";
import {
  AlertTriangleIcon,
  ListTreeIcon,
  PanelTopIcon,
  PlayIcon,
  SaveIcon,
  SparklesIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "../../components/ui/button";
import { Checkbox } from "../../components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import type {
  WorkflowActionStepPayload,
  WorkflowContextFactDefinitionItem,
  WorkflowEditorStep,
} from "./types";

type ActionStepDialogMode = "create" | "edit";

type ActionStepDialogProps = {
  open: boolean;
  mode: ActionStepDialogMode;
  step?: WorkflowEditorStep | undefined;
  contextFactDefinitions: readonly WorkflowContextFactDefinitionItem[];
  onOpenChange: (open: boolean) => void;
  onSave: (payload: WorkflowActionStepPayload) => Promise<void> | void;
  onDelete?: (() => Promise<void> | void) | undefined;
};

type ActionStepEditorTab = "overview" | "actions" | "execution" | "guidance";

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

const ACTION_ALLOWED_CONTEXT_FACT_KINDS = new Set([
  "definition_backed_external_fact",
  "bound_external_fact",
  "artifact_reference_fact",
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

function normalizeActionStepPayload(
  step: WorkflowEditorStep | undefined,
): WorkflowActionStepPayload {
  if (!step || step.stepType !== "action") {
    return createEmptyActionStepPayload();
  }

  const payload = step.payload;
  return {
    ...createEmptyActionStepPayload(),
    ...payload,
    label: payload.label ?? "",
    descriptionJson: payload.descriptionJson,
    actions: payload.actions ?? [],
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

function getTabSnapshot(tab: ActionStepEditorTab, value: WorkflowActionStepPayload) {
  switch (tab) {
    case "overview":
      return stableStringify({
        key: value.key,
        label: value.label ?? "",
        description: value.descriptionJson?.markdown ?? "",
      });
    case "actions":
      return stableStringify(value.actions);
    case "execution":
      return stableStringify({ executionMode: value.executionMode });
    case "guidance":
      return stableStringify(value.guidance);
  }
}

function validatePayload(
  value: WorkflowActionStepPayload,
  eligibleFacts: readonly WorkflowContextFactDefinitionItem[],
) {
  if (!value.key.trim()) {
    return "Action step key is required.";
  }

  if (value.actions.length < 1) {
    return "Add at least one propagation action.";
  }

  if (!value.actions.some((action) => action.enabled !== false)) {
    return "Enable at least one propagation action.";
  }

  const eligibleFactIds = new Set(eligibleFacts.map((fact) => fact.contextFactDefinitionId));
  const actionKeys = new Set<string>();
  const actionFactIds = new Set<string>();

  for (const action of value.actions) {
    if (!action.actionKey.trim()) {
      return "Each action needs an action key.";
    }

    if (!eligibleFactIds.has(action.contextFactDefinitionId)) {
      return "Every action must bind to an Action-eligible workflow context fact.";
    }

    if (actionKeys.has(action.actionKey.trim())) {
      return "Action keys must be unique within the step.";
    }
    actionKeys.add(action.actionKey.trim());

    if (actionFactIds.has(action.contextFactDefinitionId)) {
      return "Each Action-step propagation action must target a different workflow context fact.";
    }
    actionFactIds.add(action.contextFactDefinitionId);

    if (action.items.length < 1) {
      return `Action '${action.actionKey}' must include at least one propagation item.`;
    }

    const itemKeys = new Set<string>();
    for (const item of action.items) {
      if (!item.itemKey.trim()) {
        return `Every item in action '${action.actionKey}' needs an item key.`;
      }

      if (itemKeys.has(item.itemKey.trim())) {
        return `Item keys in action '${action.actionKey}' must be unique.`;
      }
      itemKeys.add(item.itemKey.trim());
    }
  }

  return null;
}

function createDefaultAction(
  fact: WorkflowContextFactDefinitionItem,
  index: number,
): WorkflowActionStepPayload["actions"][number] {
  return {
    actionId: createLocalId("action"),
    actionKey: `propagate-${fact.key}`,
    label: fact.label,
    enabled: true,
    sortOrder: (index + 1) * 100,
    actionKind: "propagation",
    contextFactDefinitionId: fact.contextFactDefinitionId,
    contextFactKind: fact.kind,
    items: [
      {
        itemId: createLocalId("action-item"),
        itemKey: `${fact.key}-value`,
        label: fact.label,
        sortOrder: 100,
      },
    ],
  };
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

  const eligibleContextFacts = useMemo(
    () =>
      contextFactDefinitions.filter((fact) =>
        ACTION_ALLOWED_CONTEXT_FACT_KINDS.has(
          fact.kind as (typeof contextFactDefinitions)[number]["kind"],
        ),
      ),
    [contextFactDefinitions],
  );
  const contextFactsById = useMemo(
    () => new Map(eligibleContextFacts.map((fact) => [fact.contextFactDefinitionId, fact])),
    [eligibleContextFacts],
  );
  const defaultValues = useMemo(() => normalizeActionStepPayload(step), [step]);

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      const validationMessage = validatePayload(value, eligibleContextFacts);
      if (validationMessage) {
        setStatusMessage(validationMessage);
        return;
      }

      setStatusMessage(null);
      const descriptionMarkdown = value.descriptionJson?.markdown?.trim() ?? "";
      await onSave({
        ...value,
        key: value.key.trim(),
        ...(value.label?.trim() ? { label: value.label.trim() } : { label: undefined }),
        ...(descriptionMarkdown ? { descriptionJson: { markdown: descriptionMarkdown } } : {}),
        actions: normalizeActionOrders(
          value.actions.map((action) => ({
            ...action,
            actionKey: action.actionKey.trim(),
            ...(action.label?.trim() ? { label: action.label.trim() } : { label: undefined }),
            items: action.items.map((item) => ({
              ...item,
              itemKey: item.itemKey.trim(),
              ...(item.label?.trim() ? { label: item.label.trim() } : { label: undefined }),
            })),
          })),
        ),
        guidance: {
          human: { markdown: value.guidance?.human.markdown ?? "" },
          agent: { markdown: value.guidance?.agent.markdown ?? "" },
        },
      });
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset(defaultValues);
    setActiveTab("overview");
    setStatusMessage(null);
    setShowDiscardDialog(false);
  }, [defaultValues, form, open]);

  const requestClose = (isDirty: boolean) => {
    if (isDirty) {
      setShowDiscardDialog(true);
      return;
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && requestClose(false)}>
      <form.Subscribe>
        {(state) => {
          const dirtyTabs = new Map(
            ACTION_TAB_ORDER.map((tab) => [
              tab.key,
              getTabSnapshot(tab.key, state.values) !== getTabSnapshot(tab.key, defaultValues),
            ]),
          );
          const usedContextFactIds = new Set(
            state.values.actions.map((action) => action.contextFactDefinitionId),
          );
          const nextAvailableContextFact = eligibleContextFacts.find(
            (fact) => !usedContextFactIds.has(fact.contextFactDefinitionId),
          );

          return (
            <>
              <DialogContent className="w-[min(76rem,calc(100vw-2rem))] max-w-none p-0 sm:max-w-none">
                <DialogHeader className="border-b border-border/80 px-5 py-4">
                  <DialogTitle className="font-geist-pixel-square text-base uppercase tracking-[0.12em]">
                    {mode === "create"
                      ? "Create Action Step"
                      : `Edit ${state.values.label || state.values.key || "Action Step"}`}
                  </DialogTitle>
                  <DialogDescription>
                    Author the complete Action-step payload at once: overview, propagation actions,
                    execution mode, and guidance.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid min-h-[40rem] gap-0 lg:grid-cols-[18rem_minmax(0,1fr)]">
                  <aside className="border-r border-border/80 bg-card/60 p-3">
                    <nav className="grid gap-2">
                      {ACTION_TAB_ORDER.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.key;
                        const isDirty = dirtyTabs.get(tab.key) === true;

                        return (
                          <button
                            key={tab.key}
                            type="button"
                            className={[
                              "chiron-frame-flat flex items-center justify-between gap-3 px-3 py-2 text-left text-xs transition-colors",
                              isActive ? "bg-accent/30" : "hover:bg-accent/15",
                            ].join(" ")}
                            onClick={() => setActiveTab(tab.key)}
                          >
                            <span className="flex items-center gap-2">
                              <Icon className="size-3.5" />
                              <span className="uppercase tracking-[0.12em]">{tab.label}</span>
                            </span>
                            {isDirty ? (
                              <span className="size-2 bg-primary" aria-hidden="true" />
                            ) : null}
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
                            value={state.values.key}
                            onChange={(event) => form.setFieldValue("key", event.target.value)}
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
                            value={state.values.label ?? ""}
                            onChange={(event) => form.setFieldValue("label", event.target.value)}
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
                            value={state.values.descriptionJson?.markdown ?? ""}
                            onChange={(event) =>
                              form.setFieldValue(
                                "descriptionJson",
                                event.target.value.trim().length > 0
                                  ? { markdown: event.target.value }
                                  : undefined,
                              )
                            }
                            placeholder="Describe the deterministic propagation this step performs."
                          />
                        </div>
                      </div>
                    ) : null}

                    {activeTab === "actions" ? (
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-3 border border-border/70 bg-background/40 p-3">
                          <div className="space-y-1">
                            <p className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                              Whole-step propagation payload
                            </p>
                            <p className="text-sm text-foreground">
                              Each action binds exactly one Action-eligible workflow context fact.
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            className="rounded-none"
                            disabled={!nextAvailableContextFact}
                            onClick={() => {
                              if (!nextAvailableContextFact) {
                                return;
                              }

                              form.setFieldValue("actions", [
                                ...state.values.actions,
                                createDefaultAction(
                                  nextAvailableContextFact,
                                  state.values.actions.length,
                                ),
                              ]);
                            }}
                          >
                            Add action
                          </Button>
                        </div>

                        {eligibleContextFacts.length === 0 ? (
                          <p className="border border-amber-400/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                            No Action-eligible workflow context facts are available yet.
                          </p>
                        ) : null}

                        {state.values.actions.length === 0 ? (
                          <div className="border border-dashed border-border/70 bg-background/40 px-4 py-6 text-sm text-muted-foreground">
                            No propagation actions configured yet.
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {state.values.actions.map((action, actionIndex) => {
                              const selectedFact = contextFactsById.get(
                                action.contextFactDefinitionId,
                              );

                              return (
                                <section
                                  key={action.actionId}
                                  className="space-y-4 border border-border/70 bg-background/40 p-4"
                                >
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="space-y-1">
                                      <p className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                                        Action {actionIndex + 1}
                                      </p>
                                      <p className="text-sm text-foreground">
                                        {action.label?.trim() ||
                                          action.actionKey ||
                                          "Untitled action"}
                                      </p>
                                      {selectedFact ? (
                                        <p className="text-xs text-muted-foreground">
                                          {selectedFact.label} ·{" "}
                                          {selectedFact.kind.replaceAll("_", " ")}
                                        </p>
                                      ) : null}
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                      <Button
                                        type="button"
                                        size="xs"
                                        variant="outline"
                                        className="rounded-none"
                                        disabled={actionIndex === 0}
                                        onClick={() => {
                                          const next = [...state.values.actions];
                                          const [moved] = next.splice(actionIndex, 1);
                                          next.splice(actionIndex - 1, 0, moved!);
                                          form.setFieldValue(
                                            "actions",
                                            normalizeActionOrders(next),
                                          );
                                        }}
                                      >
                                        Move up
                                      </Button>
                                      <Button
                                        type="button"
                                        size="xs"
                                        variant="outline"
                                        className="rounded-none"
                                        disabled={actionIndex === state.values.actions.length - 1}
                                        onClick={() => {
                                          const next = [...state.values.actions];
                                          const [moved] = next.splice(actionIndex, 1);
                                          next.splice(actionIndex + 1, 0, moved!);
                                          form.setFieldValue(
                                            "actions",
                                            normalizeActionOrders(next),
                                          );
                                        }}
                                      >
                                        Move down
                                      </Button>
                                      <Button
                                        type="button"
                                        size="xs"
                                        variant="destructive"
                                        className="rounded-none"
                                        onClick={() =>
                                          form.setFieldValue(
                                            "actions",
                                            normalizeActionOrders(
                                              state.values.actions.filter(
                                                (entry) => entry.actionId !== action.actionId,
                                              ),
                                            ),
                                          )
                                        }
                                      >
                                        Remove action
                                      </Button>
                                    </div>
                                  </div>

                                  <div className="grid gap-4 md:grid-cols-2">
                                    <div className="grid gap-2">
                                      <label
                                        htmlFor={`action-context-fact-${action.actionId}`}
                                        className="text-xs uppercase tracking-[0.12em] text-muted-foreground"
                                      >
                                        Context fact
                                      </label>
                                      <Select
                                        value={action.contextFactDefinitionId}
                                        onValueChange={(value) => {
                                          const fact = value
                                            ? contextFactsById.get(value)
                                            : undefined;
                                          if (!fact) {
                                            return;
                                          }

                                          form.setFieldValue(
                                            "actions",
                                            state.values.actions.map((entry) =>
                                              entry.actionId === action.actionId
                                                ? {
                                                    ...entry,
                                                    contextFactDefinitionId:
                                                      fact.contextFactDefinitionId,
                                                    contextFactKind: fact.kind,
                                                  }
                                                : entry,
                                            ),
                                          );
                                        }}
                                      >
                                        <SelectTrigger
                                          id={`action-context-fact-${action.actionId}`}
                                          className="w-full"
                                        >
                                          <SelectValue placeholder="Choose a context fact" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {eligibleContextFacts.map((fact) => (
                                            <SelectItem
                                              key={fact.contextFactDefinitionId}
                                              value={fact.contextFactDefinitionId}
                                            >
                                              {fact.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <div className="grid gap-2">
                                      <label
                                        htmlFor={`action-key-${action.actionId}`}
                                        className="text-xs uppercase tracking-[0.12em] text-muted-foreground"
                                      >
                                        Action key
                                      </label>
                                      <Input
                                        id={`action-key-${action.actionId}`}
                                        aria-label={`Action key ${actionIndex + 1}`}
                                        value={action.actionKey}
                                        onChange={(event) =>
                                          form.setFieldValue(
                                            "actions",
                                            state.values.actions.map((entry) =>
                                              entry.actionId === action.actionId
                                                ? { ...entry, actionKey: event.target.value }
                                                : entry,
                                            ),
                                          )
                                        }
                                      />
                                    </div>

                                    <div className="grid gap-2 md:col-span-2">
                                      <label
                                        htmlFor={`action-label-${action.actionId}`}
                                        className="text-xs uppercase tracking-[0.12em] text-muted-foreground"
                                      >
                                        Action label
                                      </label>
                                      <Input
                                        id={`action-label-${action.actionId}`}
                                        aria-label={`Action label ${actionIndex + 1}`}
                                        value={action.label ?? ""}
                                        onChange={(event) =>
                                          form.setFieldValue(
                                            "actions",
                                            state.values.actions.map((entry) =>
                                              entry.actionId === action.actionId
                                                ? { ...entry, label: event.target.value }
                                                : entry,
                                            ),
                                          )
                                        }
                                      />
                                    </div>

                                    <label
                                      htmlFor={`action-enabled-${action.actionId}`}
                                      className="flex items-center gap-3 text-xs text-foreground md:col-span-2"
                                    >
                                      <Checkbox
                                        id={`action-enabled-${action.actionId}`}
                                        checked={action.enabled !== false}
                                        onCheckedChange={(checked) =>
                                          form.setFieldValue(
                                            "actions",
                                            state.values.actions.map((entry) =>
                                              entry.actionId === action.actionId
                                                ? { ...entry, enabled: Boolean(checked) }
                                                : entry,
                                            ),
                                          )
                                        }
                                      />
                                      Action enabled
                                    </label>
                                  </div>

                                  <div className="space-y-3 border border-border/70 bg-background/50 p-3">
                                    <div className="flex items-center justify-between gap-2">
                                      <div>
                                        <p className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                                          Propagation items
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          Stable nested ids, whole-step save.
                                        </p>
                                      </div>
                                      <Button
                                        type="button"
                                        size="xs"
                                        variant="outline"
                                        className="rounded-none"
                                        onClick={() =>
                                          form.setFieldValue(
                                            "actions",
                                            state.values.actions.map((entry) =>
                                              entry.actionId === action.actionId
                                                ? {
                                                    ...entry,
                                                    items: [
                                                      ...entry.items,
                                                      {
                                                        itemId: createLocalId("action-item"),
                                                        itemKey: `${entry.actionKey || "item"}-${entry.items.length + 1}`,
                                                        label: entry.label,
                                                        sortOrder: (entry.items.length + 1) * 100,
                                                      },
                                                    ],
                                                  }
                                                : entry,
                                            ),
                                          )
                                        }
                                      >
                                        Add item
                                      </Button>
                                    </div>

                                    <div className="space-y-3">
                                      {action.items.map((item, itemIndex) => (
                                        <div
                                          key={item.itemId}
                                          className="grid gap-3 border border-border/70 bg-background/60 p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
                                        >
                                          <div className="grid gap-2">
                                            <label
                                              htmlFor={`item-key-${item.itemId}`}
                                              className="text-xs uppercase tracking-[0.12em] text-muted-foreground"
                                            >
                                              Item key
                                            </label>
                                            <Input
                                              id={`item-key-${item.itemId}`}
                                              aria-label={`Item key ${actionIndex + 1}-${itemIndex + 1}`}
                                              value={item.itemKey}
                                              onChange={(event) =>
                                                form.setFieldValue(
                                                  "actions",
                                                  state.values.actions.map((entry) =>
                                                    entry.actionId === action.actionId
                                                      ? {
                                                          ...entry,
                                                          items: entry.items.map((entryItem) =>
                                                            entryItem.itemId === item.itemId
                                                              ? {
                                                                  ...entryItem,
                                                                  itemKey: event.target.value,
                                                                }
                                                              : entryItem,
                                                          ),
                                                        }
                                                      : entry,
                                                  ),
                                                )
                                              }
                                            />
                                          </div>

                                          <div className="grid gap-2">
                                            <label
                                              htmlFor={`item-label-${item.itemId}`}
                                              className="text-xs uppercase tracking-[0.12em] text-muted-foreground"
                                            >
                                              Item label
                                            </label>
                                            <Input
                                              id={`item-label-${item.itemId}`}
                                              aria-label={`Item label ${actionIndex + 1}-${itemIndex + 1}`}
                                              value={item.label ?? ""}
                                              onChange={(event) =>
                                                form.setFieldValue(
                                                  "actions",
                                                  state.values.actions.map((entry) =>
                                                    entry.actionId === action.actionId
                                                      ? {
                                                          ...entry,
                                                          items: entry.items.map((entryItem) =>
                                                            entryItem.itemId === item.itemId
                                                              ? {
                                                                  ...entryItem,
                                                                  label: event.target.value,
                                                                }
                                                              : entryItem,
                                                          ),
                                                        }
                                                      : entry,
                                                  ),
                                                )
                                              }
                                            />
                                          </div>

                                          <div className="flex flex-wrap items-end gap-2 md:justify-end">
                                            <Button
                                              type="button"
                                              size="xs"
                                              variant="outline"
                                              className="rounded-none"
                                              disabled={itemIndex === 0}
                                              onClick={() => {
                                                form.setFieldValue(
                                                  "actions",
                                                  state.values.actions.map((entry) => {
                                                    if (entry.actionId !== action.actionId) {
                                                      return entry;
                                                    }

                                                    const nextItems = [...entry.items];
                                                    const [moved] = nextItems.splice(itemIndex, 1);
                                                    nextItems.splice(itemIndex - 1, 0, moved!);
                                                    return {
                                                      ...entry,
                                                      items: nextItems.map(
                                                        (entryItem, nextIndex) => ({
                                                          ...entryItem,
                                                          sortOrder: (nextIndex + 1) * 100,
                                                        }),
                                                      ),
                                                    };
                                                  }),
                                                );
                                              }}
                                            >
                                              Up
                                            </Button>
                                            <Button
                                              type="button"
                                              size="xs"
                                              variant="outline"
                                              className="rounded-none"
                                              disabled={itemIndex === action.items.length - 1}
                                              onClick={() => {
                                                form.setFieldValue(
                                                  "actions",
                                                  state.values.actions.map((entry) => {
                                                    if (entry.actionId !== action.actionId) {
                                                      return entry;
                                                    }

                                                    const nextItems = [...entry.items];
                                                    const [moved] = nextItems.splice(itemIndex, 1);
                                                    nextItems.splice(itemIndex + 1, 0, moved!);
                                                    return {
                                                      ...entry,
                                                      items: nextItems.map(
                                                        (entryItem, nextIndex) => ({
                                                          ...entryItem,
                                                          sortOrder: (nextIndex + 1) * 100,
                                                        }),
                                                      ),
                                                    };
                                                  }),
                                                );
                                              }}
                                            >
                                              Down
                                            </Button>
                                            <Button
                                              type="button"
                                              size="xs"
                                              variant="destructive"
                                              className="rounded-none"
                                              onClick={() =>
                                                form.setFieldValue(
                                                  "actions",
                                                  state.values.actions.map((entry) =>
                                                    entry.actionId === action.actionId
                                                      ? {
                                                          ...entry,
                                                          items: entry.items
                                                            .filter(
                                                              (entryItem) =>
                                                                entryItem.itemId !== item.itemId,
                                                            )
                                                            .map((entryItem, nextIndex) => ({
                                                              ...entryItem,
                                                              sortOrder: (nextIndex + 1) * 100,
                                                            })),
                                                        }
                                                      : entry,
                                                  ),
                                                )
                                              }
                                            >
                                              Remove
                                            </Button>
                                          </div>
                                        </div>
                                      ))}
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
                            const active = state.values.executionMode === option.key;

                            return (
                              <button
                                key={option.key}
                                type="button"
                                className={[
                                  "border p-4 text-left transition-colors",
                                  active
                                    ? "border-primary bg-primary/10 text-foreground"
                                    : "border-border/70 bg-background/40 text-muted-foreground hover:bg-background/60",
                                ].join(" ")}
                                onClick={() => form.setFieldValue("executionMode", option.key)}
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
                          Runtime remains locked to lazy rows, manual completion, idempotent
                          duplicate run / retry behavior, and propagation-only actions in Plan A.
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
                            value={state.values.guidance?.human.markdown ?? ""}
                            onChange={(event) =>
                              form.setFieldValue("guidance", {
                                human: { markdown: event.target.value },
                                agent: { markdown: state.values.guidance?.agent.markdown ?? "" },
                              })
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
                            value={state.values.guidance?.agent.markdown ?? ""}
                            onChange={(event) =>
                              form.setFieldValue("guidance", {
                                human: { markdown: state.values.guidance?.human.markdown ?? "" },
                                agent: { markdown: event.target.value },
                              })
                            }
                          />
                        </div>
                      </div>
                    ) : null}
                  </section>
                </div>

                <DialogFooter className="border-t border-border/80 px-5 py-4 sm:justify-between">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-none"
                      onClick={() => requestClose(state.isDirty)}
                    >
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
                    onClick={() => void form.handleSubmit()}
                    disabled={state.isSubmitting}
                  >
                    <SaveIcon className="size-3.5" /> Save action step
                  </Button>
                </DialogFooter>
              </DialogContent>

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
                        form.reset(defaultValues);
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
        }}
      </form.Subscribe>
    </Dialog>
  );
}
