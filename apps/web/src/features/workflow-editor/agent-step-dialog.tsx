import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangleIcon,
  BotIcon,
  InfoIcon,
  PanelTopIcon,
  SaveIcon,
  ShieldCheckIcon,
  SparklesIcon,
  WorkflowIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import type {
  WorkflowAgentStepPayload,
  WorkflowContextFactDefinitionItem,
  WorkflowEditorStep,
  WorkflowHarnessDiscoveryMetadata,
} from "./types";
import { DEFAULT_AGENT_STEP_RUNTIME_POLICY } from "./types";
import { CompletionRuntimePolicyTab } from "./agent-step-tabs/completion-runtime-policy-tab";
import { GuidanceTab } from "./agent-step-tabs/guidance-tab";
import { HarnessModelTab } from "./agent-step-tabs/harness-model-tab";
import { ObjectiveInstructionsTab } from "./agent-step-tabs/objective-instructions-tab";
import { OverviewTab } from "./agent-step-tabs/overview-tab";
import { ReadScopeTab, type AgentStepReadableRow } from "./agent-step-tabs/read-scope-tab";
import { WriteScopeTab } from "./agent-step-tabs/write-scope-tab";

type AgentStepDialogMode = "create" | "edit";

type AgentStepDialogProps = {
  open: boolean;
  mode: AgentStepDialogMode;
  step?: WorkflowEditorStep | undefined;
  contextFactDefinitions: readonly WorkflowContextFactDefinitionItem[];
  discoverHarnessMetadata?: (() => Promise<WorkflowHarnessDiscoveryMetadata>) | undefined;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: WorkflowAgentStepPayload) => Promise<void> | void;
  onDelete?: (() => Promise<void> | void) | undefined;
};

type AgentStepEditorTab =
  | "overview"
  | "objective_and_instructions"
  | "harness_and_model"
  | "read_scope"
  | "write_scope"
  | "completion_and_runtime_policy"
  | "guidance";

const TAB_ORDER: ReadonlyArray<{
  key: AgentStepEditorTab;
  label: string;
  icon: typeof PanelTopIcon;
}> = [
  { key: "overview", label: "Overview", icon: PanelTopIcon },
  { key: "objective_and_instructions", label: "Objective & Instructions", icon: SparklesIcon },
  { key: "harness_and_model", label: "Harness & Model", icon: BotIcon },
  { key: "read_scope", label: "Read Scope", icon: InfoIcon },
  { key: "write_scope", label: "Write Scope", icon: WorkflowIcon },
  {
    key: "completion_and_runtime_policy",
    label: "Completion & Runtime Policy",
    icon: ShieldCheckIcon,
  },
  { key: "guidance", label: "Guidance", icon: AlertTriangleIcon },
];

function createLocalId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function createEmptyAgentStepPayload(): WorkflowAgentStepPayload {
  return {
    key: "",
    label: "",
    objective: "",
    instructionsMarkdown: "",
    harnessSelection: { harness: "opencode" },
    explicitReadGrants: [],
    writeItems: [],
    completionRequirements: [],
    runtimePolicy: DEFAULT_AGENT_STEP_RUNTIME_POLICY,
    guidance: {
      human: { markdown: "" },
      agent: { markdown: "" },
    },
  };
}

function normalizePayload(step: WorkflowEditorStep | undefined): WorkflowAgentStepPayload {
  if (!step || step.stepType !== "agent") {
    return createEmptyAgentStepPayload();
  }

  const payload = step.payload as WorkflowAgentStepPayload;
  return {
    ...createEmptyAgentStepPayload(),
    ...payload,
    label: payload.label ?? "",
    descriptionJson: payload.descriptionJson,
    harnessSelection: payload.harnessSelection ?? { harness: "opencode" },
    explicitReadGrants: payload.explicitReadGrants ?? [],
    writeItems: payload.writeItems ?? [],
    completionRequirements: payload.completionRequirements ?? [],
    runtimePolicy: payload.runtimePolicy ?? DEFAULT_AGENT_STEP_RUNTIME_POLICY,
    guidance: payload.guidance ?? {
      human: { markdown: "" },
      agent: { markdown: "" },
    },
  };
}

function normalizeWriteOrders(values: WorkflowAgentStepPayload["writeItems"]) {
  return values.map((item, index) => ({ ...item, order: (index + 1) * 100 }));
}

function deriveReadModePreview(
  fact: WorkflowContextFactDefinitionItem,
  source: "explicit" | "inferred_from_write",
) {
  switch (fact.kind) {
    case "plain_value_fact":
      return source === "explicit" ? "value_read" : "value_write_target";
    case "definition_backed_external_fact":
    case "bound_external_fact":
      return source === "explicit" ? "external_read" : "external_write_target";
    case "workflow_reference_fact":
      return source === "explicit" ? "workflow_reference_read" : "workflow_reference_write_target";
    case "artifact_reference_fact":
      return source === "explicit" ? "artifact_reference_read" : "artifact_reference_write_target";
    case "work_unit_draft_spec_fact":
      return source === "explicit" ? "draft_spec_read" : "draft_spec_write_target";
  }
}

function stableStringify(value: unknown) {
  return JSON.stringify(value);
}

function getTabSnapshot(tab: AgentStepEditorTab, value: WorkflowAgentStepPayload) {
  switch (tab) {
    case "overview":
      return stableStringify({
        key: value.key,
        label: value.label ?? "",
        description: value.descriptionJson?.markdown ?? "",
      });
    case "objective_and_instructions":
      return stableStringify({
        objective: value.objective,
        instructionsMarkdown: value.instructionsMarkdown,
      });
    case "harness_and_model":
      return stableStringify(value.harnessSelection);
    case "read_scope":
      return stableStringify(value.explicitReadGrants);
    case "write_scope":
      return stableStringify(value.writeItems);
    case "completion_and_runtime_policy":
      return stableStringify({
        completionRequirements: value.completionRequirements,
        runtimePolicy: value.runtimePolicy,
      });
    case "guidance":
      return stableStringify(value.guidance);
  }
}

function validatePayload(values: WorkflowAgentStepPayload): string | null {
  if (!values.key.trim()) {
    return "Agent step key is required.";
  }

  if (!values.objective.trim()) {
    return "Agent step objective is required.";
  }

  if (!values.instructionsMarkdown.trim()) {
    return "Agent step instructions are required.";
  }

  return null;
}

export function AgentStepDialog({
  open,
  mode,
  step,
  contextFactDefinitions,
  discoverHarnessMetadata,
  onOpenChange,
  onSave,
  onDelete,
}: AgentStepDialogProps) {
  const [activeTab, setActiveTab] = useState<AgentStepEditorTab>("overview");
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const defaultValues = useMemo(() => normalizePayload(step), [step]);
  const contextFactsById = useMemo(
    () => new Map(contextFactDefinitions.map((fact) => [fact.contextFactDefinitionId, fact])),
    [contextFactDefinitions],
  );

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      const validationMessage = validatePayload(value);
      if (validationMessage) {
        setStatusMessage(validationMessage);
        return;
      }

      setStatusMessage(null);
      await onSave({
        ...value,
        key: value.key.trim(),
        label: value.label?.trim() ?? "",
        objective: value.objective.trim(),
        instructionsMarkdown: value.instructionsMarkdown.trim(),
        writeItems: normalizeWriteOrders(value.writeItems),
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

  const harnessQuery = useQuery({
    queryKey: ["workflow-editor", "agent-step", "harness-metadata"],
    queryFn: async () => discoverHarnessMetadata?.(),
    enabled: open && Boolean(discoverHarnessMetadata),
    staleTime: 60_000,
  });

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
          const explicitRows: AgentStepReadableRow[] = contextFactDefinitions.map((fact) => ({
            contextFactDefinitionId: fact.contextFactDefinitionId,
            key: fact.key,
            label: fact.label,
            source: "explicit",
            readModePreview: deriveReadModePreview(fact, "explicit"),
          }));
          const inferredRows = state.values.writeItems.flatMap((item) => {
            const fact = contextFactsById.get(item.contextFactDefinitionId);
            if (!fact) {
              return [];
            }

            return [
              {
                contextFactDefinitionId: fact.contextFactDefinitionId,
                key: fact.key,
                label: fact.label,
                source: "inferred_from_write" as const,
                readModePreview: deriveReadModePreview(fact, "inferred_from_write"),
              },
            ];
          });
          const dirtyTabs = new Map(
            TAB_ORDER.map((tab) => [
              tab.key,
              getTabSnapshot(tab.key, state.values) !== getTabSnapshot(tab.key, defaultValues),
            ]),
          );

          return (
            <>
              <DialogContent className="flex w-[min(78rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] max-w-none flex-col overflow-hidden p-0 sm:max-w-none">
                <DialogHeader className="border-b border-border/80 px-5 py-4">
                  <DialogTitle className="font-geist-pixel-square text-base uppercase tracking-[0.12em]">
                    {mode === "create"
                      ? "Create Agent Step"
                      : `Edit ${state.values.label || state.values.key || "Agent Step"}`}
                  </DialogTitle>
                  <DialogDescription>
                    Author the complete Agent-step definition in one payload: read scope, write
                    scope, runtime policy, guidance, and model selection.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[18rem_minmax(0,1fr)]">
                  <aside className="border-r border-border/80 bg-card/60 p-3">
                    <nav className="grid gap-2">
                      {TAB_ORDER.map((tab) => {
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

                  <section className="min-h-0 overflow-y-auto p-5">
                    {statusMessage ? (
                      <p className="mb-4 border border-destructive/45 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                        {statusMessage}
                      </p>
                    ) : null}

                    {activeTab === "overview" ? (
                      <OverviewTab
                        values={state.values}
                        setValue={(key, value) => form.setFieldValue(key, value)}
                      />
                    ) : null}

                    {activeTab === "objective_and_instructions" ? (
                      <ObjectiveInstructionsTab
                        values={state.values}
                        setValue={(key, value) => form.setFieldValue(key, value)}
                      />
                    ) : null}

                    {activeTab === "harness_and_model" ? (
                      <HarnessModelTab
                        values={state.values}
                        metadata={harnessQuery.data}
                        isLoading={harnessQuery.isLoading}
                        onSelectAgent={(agent) =>
                          form.setFieldValue("harnessSelection", {
                            harness: "opencode",
                            ...(agent ? { agent: agent.key } : {}),
                            ...(state.values.harnessSelection.model
                              ? { model: state.values.harnessSelection.model }
                              : {}),
                          })
                        }
                        onSelectModel={(model) =>
                          form.setFieldValue(
                            "harnessSelection",
                            model
                              ? {
                                  harness: "opencode",
                                  ...(state.values.harnessSelection.agent
                                    ? { agent: state.values.harnessSelection.agent }
                                    : {}),
                                  model: { provider: model.provider, model: model.model },
                                }
                              : {
                                  harness: "opencode",
                                  ...(state.values.harnessSelection.agent
                                    ? { agent: state.values.harnessSelection.agent }
                                    : {}),
                                },
                          )
                        }
                      />
                    ) : null}

                    {activeTab === "read_scope" ? (
                      <ReadScopeTab
                        values={state.values}
                        explicitRows={explicitRows}
                        inferredRows={inferredRows}
                        contextFactsById={contextFactsById}
                        onToggleExplicit={(contextFactDefinitionId, checked) => {
                          const next = checked
                            ? [...state.values.explicitReadGrants, { contextFactDefinitionId }]
                            : state.values.explicitReadGrants.filter(
                                (grant) =>
                                  grant.contextFactDefinitionId !== contextFactDefinitionId,
                              );
                          form.setFieldValue("explicitReadGrants", next);
                        }}
                      />
                    ) : null}

                    {activeTab === "write_scope" ? (
                      <WriteScopeTab
                        values={state.values}
                        contextFacts={contextFactDefinitions}
                        contextFactsById={contextFactsById}
                        onAddWriteItem={(contextFactDefinitionId) => {
                          const fact = contextFactsById.get(contextFactDefinitionId);
                          if (!fact) {
                            return;
                          }

                          form.setFieldValue("writeItems", [
                            ...state.values.writeItems,
                            {
                              writeItemId: createLocalId("write-item"),
                              contextFactDefinitionId,
                              contextFactKind: fact.kind,
                              label: undefined,
                              order: (state.values.writeItems.length + 1) * 100,
                              requirementContextFactDefinitionIds: [],
                            },
                          ]);
                        }}
                        onRemoveWriteItem={(writeItemId) =>
                          form.setFieldValue(
                            "writeItems",
                            normalizeWriteOrders(
                              state.values.writeItems.filter(
                                (item) => item.writeItemId !== writeItemId,
                              ),
                            ),
                          )
                        }
                        onMoveWriteItem={(writeItemId, direction) => {
                          const index = state.values.writeItems.findIndex(
                            (item) => item.writeItemId === writeItemId,
                          );
                          if (index < 0) {
                            return;
                          }

                          const targetIndex = direction === "up" ? index - 1 : index + 1;
                          if (targetIndex < 0 || targetIndex >= state.values.writeItems.length) {
                            return;
                          }

                          const next = [...state.values.writeItems];
                          const [moved] = next.splice(index, 1);
                          next.splice(targetIndex, 0, moved!);
                          form.setFieldValue("writeItems", normalizeWriteOrders(next));
                        }}
                        onUpdateWriteItemLabel={(writeItemId, label) =>
                          form.setFieldValue(
                            "writeItems",
                            state.values.writeItems.map((item) =>
                              item.writeItemId === writeItemId
                                ? { ...item, label: label.trim().length > 0 ? label : undefined }
                                : item,
                            ),
                          )
                        }
                        onToggleWriteRequirement={(writeItemId, contextFactDefinitionId, checked) =>
                          form.setFieldValue(
                            "writeItems",
                            state.values.writeItems.map((item) => {
                              if (item.writeItemId !== writeItemId) {
                                return item;
                              }

                              const requirementIds = new Set(
                                item.requirementContextFactDefinitionIds,
                              );
                              if (checked) {
                                requirementIds.add(contextFactDefinitionId);
                              } else {
                                requirementIds.delete(contextFactDefinitionId);
                              }

                              return {
                                ...item,
                                requirementContextFactDefinitionIds: [...requirementIds],
                              };
                            }),
                          )
                        }
                      />
                    ) : null}

                    {activeTab === "completion_and_runtime_policy" ? (
                      <CompletionRuntimePolicyTab
                        values={state.values}
                        contextFactsById={contextFactsById}
                        onToggleCompletionRequirement={(contextFactDefinitionId, checked) => {
                          const next = checked
                            ? [...state.values.completionRequirements, { contextFactDefinitionId }]
                            : state.values.completionRequirements.filter(
                                (entry) =>
                                  entry.contextFactDefinitionId !== contextFactDefinitionId,
                              );
                          form.setFieldValue("completionRequirements", next);
                        }}
                        onSetBootstrapPromptNoReply={(bootstrapPromptNoReply) =>
                          form.setFieldValue("runtimePolicy", {
                            ...state.values.runtimePolicy,
                            bootstrapPromptNoReply,
                          })
                        }
                      />
                    ) : null}

                    {activeTab === "guidance" ? (
                      <GuidanceTab
                        values={state.values}
                        setHumanMarkdown={(markdown) =>
                          form.setFieldValue("guidance", {
                            human: { markdown },
                            agent: { markdown: state.values.guidance?.agent.markdown ?? "" },
                          })
                        }
                        setAgentMarkdown={(markdown) =>
                          form.setFieldValue("guidance", {
                            human: { markdown: state.values.guidance?.human.markdown ?? "" },
                            agent: { markdown },
                          })
                        }
                      />
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
                    <SaveIcon className="size-3.5" /> Save agent step
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
                      This Agent-step draft has unsaved changes. Discard them and close the dialog?
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
                      Discard changes
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
