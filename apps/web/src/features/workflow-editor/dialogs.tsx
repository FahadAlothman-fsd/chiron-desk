import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { CheckIcon, ChevronsUpDownIcon, PlusIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
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
import { Label } from "../../components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";

import type {
  WorkflowContextFactDefinitionItem,
  WorkflowContextFactDraft,
  WorkflowEditorEdge,
  WorkflowEditorPickerBadge,
  WorkflowEditorFieldDraft,
  WorkflowEditorGuidance,
  WorkflowEditorMetadata,
  WorkflowEditorPickerOption,
  WorkflowEditorStep,
  WorkflowFormStepPayload,
} from "./types";

type FormStepDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  step?: WorkflowEditorStep | undefined;
  contextFactDefinitions: readonly WorkflowContextFactDefinitionItem[];
  onOpenChange: (open: boolean) => void;
  onSave: (payload: WorkflowFormStepPayload) => Promise<void> | void;
  onDelete?: (() => Promise<void> | void) | undefined;
};

type WorkflowContextFactDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  fact?: WorkflowContextFactDefinitionItem | undefined;
  methodologyFacts: readonly WorkflowEditorPickerOption[];
  currentWorkUnitFacts: readonly WorkflowEditorPickerOption[];
  artifactSlots: readonly WorkflowEditorPickerOption[];
  workUnitTypes: readonly WorkflowEditorPickerOption[];
  availableWorkflows: readonly WorkflowEditorPickerOption[];
  workUnitFactsQueryScope: string;
  loadWorkUnitFacts: (workUnitTypeKey: string) => Promise<readonly WorkflowEditorPickerOption[]>;
  onOpenChange: (open: boolean) => void;
  onSave: (draft: WorkflowContextFactDraft) => Promise<void> | void;
};

type FormStepDialogTab = "contract" | "fields" | "guidance";
type WorkflowContextFactDialogTab = "contract" | "value-semantics" | "guidance";

const CONTEXT_FACT_KIND_OPTIONS = [
  { value: "plain_value_fact", label: "Plain Value Fact" },
  { value: "definition_backed_external_fact", label: "Definition-Backed External Fact" },
  { value: "bound_external_fact", label: "Bound External Fact" },
  { value: "workflow_reference_fact", label: "Workflow Reference Fact" },
  { value: "artifact_reference_fact", label: "Artifact Reference Fact" },
  { value: "work_unit_draft_spec_fact", label: "Work Unit Draft Spec Fact" },
] as const;

const CARDINALITY_OPTIONS = ["one", "many"] as const;

const VALUE_TYPE_OPTIONS = ["string", "number", "boolean", "json"] as const;

type JsonSubSchemaDraft = {
  localId: string;
  displayName: string;
  key: string;
  defaultValue: string;
  valueType: (typeof VALUE_TYPE_OPTIONS)[number];
};

type PlainStringValidationType = "none" | "path" | "regex" | "allowed-values";

type WorkUnitDraftFactCard = {
  localId: string;
  factKey: string;
  displayName: string;
  description: string | undefined;
};

type WorkflowContextFactDialogSnapshot = {
  contract: {
    key: string;
    label: string;
    descriptionMarkdown: string;
    kind: WorkflowContextFactDraft["kind"];
    cardinality: WorkflowContextFactDraft["cardinality"];
  };
  valueSemantics: {
    valueType: WorkflowContextFactDraft["valueType"];
    externalFactDefinitionId: string;
    allowedWorkflowDefinitionIds: string[];
    artifactSlotDefinitionId: string;
    workUnitTypeKey: string;
    includedFactKeys: string[];
    plainStringDefaultValue: string;
    plainStringValidationType: PlainStringValidationType;
    plainStringPathKind: "file" | "directory";
    plainStringTrimWhitespace: boolean;
    plainStringDisallowAbsolute: boolean;
    plainStringPreventTraversal: boolean;
    plainStringRegexPattern: string;
    pendingAllowedValueTag: string;
    allowedValueTags: string[];
    jsonSubSchemaDrafts: Array<Omit<JsonSubSchemaDraft, "localId">>;
    pendingIncludedFactKey: string;
  };
  guidance: WorkflowEditorGuidance;
};

function createLocalId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeGuidance(guidance?: Partial<WorkflowEditorGuidance>): WorkflowEditorGuidance {
  return {
    humanMarkdown: guidance?.humanMarkdown ?? "",
    agentMarkdown: guidance?.agentMarkdown ?? "",
  };
}

function toContextFactDraft(
  fact?: WorkflowContextFactDefinitionItem,
  kind: WorkflowContextFactDraft["kind"] = "plain_value_fact",
): WorkflowContextFactDraft {
  return {
    key: fact?.key ?? "",
    label: fact?.label ?? "",
    descriptionMarkdown: fact?.descriptionMarkdown ?? "",
    kind: fact?.kind ?? kind,
    cardinality: fact?.cardinality ?? "one",
    guidance: normalizeGuidance(fact?.guidance),
    valueType: fact?.valueType ?? "string",
    externalFactDefinitionId: fact?.externalFactDefinitionId ?? "",
    allowedWorkflowDefinitionIds: fact?.allowedWorkflowDefinitionIds ?? [],
    artifactSlotDefinitionId: fact?.artifactSlotDefinitionId ?? "",
    workUnitTypeKey: fact?.workUnitTypeKey ?? "",
    includedFactKeys: fact?.includedFactKeys ?? [],
  };
}

function toWorkflowContextFactDialogSnapshot(params: {
  draft: WorkflowContextFactDraft;
  plainStringDefaultValue: string;
  plainStringValidationType: PlainStringValidationType;
  plainStringPathKind: "file" | "directory";
  plainStringTrimWhitespace: boolean;
  plainStringDisallowAbsolute: boolean;
  plainStringPreventTraversal: boolean;
  plainStringRegexPattern: string;
  pendingAllowedValueTag: string;
  allowedValueTags: readonly string[];
  jsonSubSchemaDrafts: readonly JsonSubSchemaDraft[];
  pendingIncludedFactKey: string;
  draftSpecCards: readonly WorkUnitDraftFactCard[];
}): WorkflowContextFactDialogSnapshot {
  return {
    contract: {
      key: params.draft.key,
      label: params.draft.label,
      descriptionMarkdown: params.draft.descriptionMarkdown,
      kind: params.draft.kind,
      cardinality: params.draft.cardinality,
    },
    valueSemantics: {
      valueType: params.draft.valueType,
      externalFactDefinitionId: params.draft.externalFactDefinitionId ?? "",
      allowedWorkflowDefinitionIds: [...params.draft.allowedWorkflowDefinitionIds],
      artifactSlotDefinitionId: params.draft.artifactSlotDefinitionId ?? "",
      workUnitTypeKey: params.draft.workUnitTypeKey ?? "",
      includedFactKeys: params.draftSpecCards.map((entry) => entry.factKey),
      plainStringDefaultValue: params.plainStringDefaultValue,
      plainStringValidationType: params.plainStringValidationType,
      plainStringPathKind: params.plainStringPathKind,
      plainStringTrimWhitespace: params.plainStringTrimWhitespace,
      plainStringDisallowAbsolute: params.plainStringDisallowAbsolute,
      plainStringPreventTraversal: params.plainStringPreventTraversal,
      plainStringRegexPattern: params.plainStringRegexPattern,
      pendingAllowedValueTag: params.pendingAllowedValueTag,
      allowedValueTags: [...params.allowedValueTags],
      jsonSubSchemaDrafts: params.jsonSubSchemaDrafts.map(({ localId: _localId, ...entry }) => ({
        ...entry,
      })),
      pendingIncludedFactKey: params.pendingIncludedFactKey,
    },
    guidance: {
      humanMarkdown: params.draft.guidance.humanMarkdown,
      agentMarkdown: params.draft.guidance.agentMarkdown,
    },
  };
}

function areDialogSnapshotSectionsEqual(first: unknown, second: unknown) {
  return JSON.stringify(first) === JSON.stringify(second);
}

function summarizeContextFact(fact: WorkflowContextFactDraft | WorkflowContextFactDefinitionItem) {
  const lead = `${fact.kind.replaceAll("_", " ")} · ${fact.cardinality}`;

  switch (fact.kind) {
    case "plain_value_fact":
      return `${lead} · ${fact.valueType ?? "string"}`;
    case "definition_backed_external_fact":
    case "bound_external_fact":
      return fact.externalFactDefinitionId?.trim()
        ? `${lead} · ${fact.externalFactDefinitionId.trim()}`
        : lead;
    case "workflow_reference_fact":
      return fact.allowedWorkflowDefinitionIds.length > 0
        ? `${lead} · ${fact.allowedWorkflowDefinitionIds.length} workflow${
            fact.allowedWorkflowDefinitionIds.length === 1 ? "" : "s"
          }`
        : lead;
    case "artifact_reference_fact":
      return fact.artifactSlotDefinitionId?.trim()
        ? `${lead} · ${fact.artifactSlotDefinitionId.trim()}`
        : lead;
    case "work_unit_draft_spec_fact":
      return fact.workUnitTypeKey?.trim() ? `${lead} · ${fact.workUnitTypeKey.trim()}` : lead;
  }
}

function titleizeKey(value: string) {
  return value
    .replaceAll(/[._-]+/g, " ")
    .split(" ")
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function createEmptyJsonSubSchemaDraft(
  existing: readonly JsonSubSchemaDraft[],
): JsonSubSchemaDraft {
  const usedKeys = new Set(
    existing.map((entry) => entry.key.trim()).filter((entry) => entry.length > 0),
  );
  let counter = existing.length + 1;
  let nextKey = `field_${counter}`;

  while (usedKeys.has(nextKey)) {
    counter += 1;
    nextKey = `field_${counter}`;
  }

  return {
    localId: createLocalId("json-sub-schema"),
    displayName: "",
    key: nextKey,
    defaultValue: "",
    valueType: "string",
  };
}

function createWorkUnitDraftFactCard(
  factKey: string,
  workUnitFacts: readonly WorkflowEditorPickerOption[],
): WorkUnitDraftFactCard {
  const matchedOption = workUnitFacts.find((option) => option.value === factKey);

  return {
    localId: createLocalId("draft-spec-fact"),
    factKey,
    displayName: matchedOption?.label ?? titleizeKey(factKey),
    description: matchedOption?.description,
  };
}

function getPickerOptionCardinality(
  option: WorkflowEditorPickerOption | undefined,
): WorkflowContextFactDraft["cardinality"] | undefined {
  const label = option?.badges?.find((badge) => badge.tone === "cardinality")?.label;

  // Map artifact slot cardinality (single/fileset) to fact cardinality (one/many)
  if (label === "one" || label === "single") return "one";
  if (label === "many" || label === "fileset") return "many";
  return undefined;
}

function toFieldDraft(
  definition: WorkflowContextFactDefinitionItem,
  existing?: Partial<WorkflowEditorFieldDraft>,
): WorkflowEditorFieldDraft {
  return {
    localId: existing?.localId ?? createLocalId("form-field"),
    contextFactDefinitionId: definition.contextFactDefinitionId,
    fieldLabel: existing?.fieldLabel ?? (definition.label || definition.key),
    fieldKey: existing?.fieldKey ?? definition.key,
    helpText: existing?.helpText ?? null,
    required: existing?.required ?? false,
    ...(definition.cardinality === "many"
      ? { uiMultiplicityMode: existing?.uiMultiplicityMode ?? "many" }
      : {}),
  };
}

function normalizeFieldDrafts(
  step: WorkflowEditorStep | undefined,
  contextFactDefinitions: readonly WorkflowContextFactDefinitionItem[],
) {
  const definitionsById = new Map(
    contextFactDefinitions.map((definition) => [definition.contextFactDefinitionId, definition]),
  );

  return (step?.payload.fields ?? []).map((field) => {
    const linkedDefinition = definitionsById.get(field.contextFactDefinitionId);

    if (linkedDefinition) {
      return toFieldDraft(linkedDefinition, {
        ...field,
        localId: createLocalId("form-field"),
      });
    }

    return {
      localId: createLocalId("form-field"),
      contextFactDefinitionId: field.contextFactDefinitionId,
      fieldLabel: field.fieldLabel,
      fieldKey: field.fieldKey,
      helpText: field.helpText ?? null,
      required: field.required ?? false,
      ...(field.uiMultiplicityMode ? { uiMultiplicityMode: field.uiMultiplicityMode } : {}),
    };
  });
}

function toWorkflowFormPayload(params: {
  stepKey: string;
  label: string;
  descriptionMarkdown: string;
  fieldDrafts: readonly WorkflowEditorFieldDraft[];
  guidance: WorkflowEditorGuidance;
}) {
  const normalizedDescription = params.descriptionMarkdown.trim();
  const normalizedLabel = params.label.trim();

  return {
    key: params.stepKey.trim(),
    ...(normalizedLabel.length > 0 ? { label: normalizedLabel } : {}),
    ...(normalizedDescription.length > 0
      ? { descriptionJson: { markdown: normalizedDescription } }
      : {}),
    fields: params.fieldDrafts.map(({ localId: _localId, ...field }) => ({
      contextFactDefinitionId: field.contextFactDefinitionId,
      fieldLabel: field.fieldLabel.trim(),
      fieldKey: field.fieldKey.trim(),
      helpText: field.helpText?.trim() ? field.helpText.trim() : null,
      required: Boolean(field.required),
      ...(field.uiMultiplicityMode ? { uiMultiplicityMode: field.uiMultiplicityMode } : {}),
    })),
    guidance: {
      humanMarkdown: params.guidance.humanMarkdown.trim(),
      agentMarkdown: params.guidance.agentMarkdown.trim(),
    },
  } satisfies WorkflowFormStepPayload;
}

function toPreviewLabel(definition?: WorkflowContextFactDefinitionItem) {
  if (!definition) {
    return "Missing workflow context fact definition";
  }

  if (definition.kind === "plain_value_fact") {
    if (definition.valueType === "boolean") {
      return definition.cardinality === "many" ? "checkbox collection" : "checkbox";
    }

    if (definition.valueType === "json") {
      return definition.cardinality === "many" ? "JSON card stack" : "JSON editor";
    }

    return definition.cardinality === "many"
      ? `${definition.valueType ?? "string"} collection`
      : `${definition.valueType ?? "string"} input`;
  }

  if (definition.kind === "workflow_reference_fact") {
    return "workflow selector";
  }

  if (definition.kind === "artifact_reference_fact") {
    return "artifact slot picker";
  }

  if (definition.kind === "work_unit_draft_spec_fact") {
    return "draft-spec composer";
  }

  return "external binding";
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
                  value={
                    option.searchText ??
                    [
                      option.value,
                      option.label,
                      option.description ?? "",
                      ...(option.badges?.map((badge) => badge.label) ?? []),
                    ].join(" ")
                  }
                  density="compact"
                  onSelect={() => {
                    props.onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <div className="flex min-w-0 items-start gap-2">
                    <div className="grid min-w-0 flex-1 gap-1">
                      <span className="truncate font-medium">{option.label}</span>
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
                      ) : option.description ? (
                        <span className="truncate text-[0.68rem] uppercase tracking-[0.08em] text-muted-foreground">
                          {option.description}
                        </span>
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

export function getPickerBadgeClassName(badge: WorkflowEditorPickerBadge) {
  return cn(
    "inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-[0.68rem] uppercase tracking-[0.12em]",
    badge.tone === "source-methodology"
      ? "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-200"
      : badge.tone === "source-current-work-unit"
        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
        : badge.tone === "cardinality"
          ? "border-border/70 bg-muted/60 text-muted-foreground"
          : badge.tone === "external-fact"
            ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-200"
            : badge.tone === "bound-fact"
              ? "border-indigo-500/30 bg-indigo-500/15 text-indigo-700 dark:text-indigo-200"
              : badge.tone === "workflow-reference"
                ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-200"
                : badge.tone === "artifact-reference"
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200"
                  : badge.tone === "type-string"
                    ? "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-200"
                    : badge.tone === "type-number"
                      ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-200"
                      : badge.tone === "type-boolean"
                        ? "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-200"
                        : badge.tone === "type-json"
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200"
                          : badge.tone === "type-work-unit"
                            ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-200"
                            : "border-border/70 bg-background/70 text-muted-foreground",
  );
}

function SearchableMultiSelect(props: {
  labelId?: string;
  values: readonly string[];
  onChange: (values: string[]) => void;
  options: readonly WorkflowEditorPickerOption[];
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel: string;
  singularLabel: string;
  pluralLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedLabels = props.options
    .filter((option) => props.values.includes(option.value))
    .map((option) => option.label);
  const triggerLabel =
    selectedLabels.length === 0
      ? props.placeholder
      : selectedLabels.length === 1
        ? selectedLabels[0]!
        : `${selectedLabels.length} ${selectedLabels.length === 1 ? props.singularLabel : props.pluralLabel} selected`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-labelledby={props.labelId}
            aria-expanded={open}
            className="h-8 w-full justify-between rounded-none border-input bg-transparent px-2.5 py-1 font-normal"
          >
            <span className="truncate text-xs">{triggerLabel}</span>
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
              {props.options.map((option) => {
                const selected = props.values.includes(option.value);

                return (
                  <CommandItem
                    key={option.value}
                    value={`${option.value} ${option.label} ${option.description ?? ""}`}
                    density="compact"
                    onSelect={() => {
                      props.onChange(
                        selected
                          ? props.values.filter((value) => value !== option.value)
                          : [...props.values, option.value],
                      );
                    }}
                  >
                    <Checkbox checked={selected} className="pointer-events-none" />
                    <div className="grid min-w-0 flex-1 gap-0.5">
                      <span className="truncate font-medium">{option.label}</span>
                      {option.description ? (
                        <span className="truncate text-[0.68rem] uppercase tracking-[0.08em] text-muted-foreground">
                          {option.description}
                        </span>
                      ) : null}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function TabButton(props: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  isDirty?: boolean;
  dirtyIndicatorTestId?: string;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={props.active ? "default" : "outline"}
      className="rounded-none"
      onClick={props.onClick}
    >
      {props.children}
      {props.isDirty ? (
        <span data-testid={props.dirtyIndicatorTestId} className="ml-1 leading-none">
          *
        </span>
      ) : null}
    </Button>
  );
}

function GuidanceFields(props: {
  guidance: WorkflowEditorGuidance;
  onChange: (guidance: WorkflowEditorGuidance) => void;
  humanLabel?: string;
  agentLabel?: string;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="grid gap-2">
        <Label htmlFor="workflow-editor-human-guidance">
          {props.humanLabel ?? "Human Guidance"}
        </Label>
        <Textarea
          id="workflow-editor-human-guidance"
          className="min-h-40 resize-none rounded-none border-border/70 bg-background/50"
          value={props.guidance.humanMarkdown}
          onChange={(event) =>
            props.onChange({
              ...props.guidance,
              humanMarkdown: event.target.value,
            })
          }
          placeholder="Operator-facing guidance"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="workflow-editor-agent-guidance">
          {props.agentLabel ?? "Agent Guidance"}
        </Label>
        <Textarea
          id="workflow-editor-agent-guidance"
          className="min-h-40 resize-none rounded-none border-border/70 bg-background/50"
          value={props.guidance.agentMarkdown}
          onChange={(event) =>
            props.onChange({
              ...props.guidance,
              agentMarkdown: event.target.value,
            })
          }
          placeholder="Agent-facing guidance"
        />
      </div>
    </div>
  );
}

export function FormStepDialog({
  open,
  mode,
  step,
  contextFactDefinitions,
  onOpenChange,
  onSave,
  onDelete,
}: FormStepDialogProps) {
  const [stepKey, setStepKey] = useState("");
  const [label, setLabel] = useState("");
  const [descriptionMarkdown, setDescriptionMarkdown] = useState("");
  const [guidance, setGuidance] = useState<WorkflowEditorGuidance>(normalizeGuidance());
  const [activeTab, setActiveTab] = useState<FormStepDialogTab>("contract");
  const [fieldDrafts, setFieldDrafts] = useState<WorkflowEditorFieldDraft[]>([]);
  const [pendingFieldContextFactId, setPendingFieldContextFactId] = useState("");
  const [pendingDeleteFieldId, setPendingDeleteFieldId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setStepKey(step?.payload.key ?? "");
    setLabel(step?.payload.label ?? "");
    setDescriptionMarkdown(step?.payload.descriptionJson?.markdown ?? "");
    setGuidance(normalizeGuidance(step?.payload.guidance));
    setFieldDrafts(normalizeFieldDrafts(step, contextFactDefinitions));
    setPendingFieldContextFactId("");
    setPendingDeleteFieldId(null);
    setActiveTab("contract");
  }, [contextFactDefinitions, open, step]);

  const title =
    mode === "create" ? "Create Form Step" : `Edit Form Step: ${step?.payload.key ?? ""}`;
  const definitionsById = useMemo(
    () =>
      new Map(
        contextFactDefinitions.map((definition) => [
          definition.contextFactDefinitionId,
          definition,
        ]),
      ),
    [contextFactDefinitions],
  );
  const boundContextFactIds = useMemo(
    () => new Set(fieldDrafts.map((field) => field.contextFactDefinitionId)),
    [fieldDrafts],
  );
  const availableDefinitionsForAdd = useMemo(
    () =>
      contextFactDefinitions.filter(
        (definition) => !boundContextFactIds.has(definition.contextFactDefinitionId),
      ),
    [boundContextFactIds, contextFactDefinitions],
  );
  const canSave =
    stepKey.trim().length > 0 &&
    fieldDrafts.every(
      (field) => field.fieldLabel.trim().length > 0 && field.fieldKey.trim().length > 0,
    );

  const removeField = (localId: string) => {
    setFieldDrafts((previous) => previous.filter((field) => field.localId !== localId));
    setPendingDeleteFieldId(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="chiron-cut-frame-thick flex w-[min(64rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] flex-col overflow-hidden p-6 sm:max-w-none sm:p-8">
          <form
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
            onSubmit={(event) => {
              event.preventDefault();
              if (!canSave) {
                return;
              }

              void onSave(
                toWorkflowFormPayload({
                  stepKey,
                  label,
                  descriptionMarkdown,
                  fieldDrafts,
                  guidance,
                }),
              );
            }}
          >
            <DialogHeader className="shrink-0 gap-2">
              <DialogTitle className="text-base font-semibold uppercase tracking-[0.08em]">
                {title}
              </DialogTitle>
              <DialogDescription>
                Form authoring is locked to Contract, Fields, and Guidance. Fields bind to
                workflow-level context-fact definitions only.
              </DialogDescription>
              <div className="mt-1 flex flex-wrap gap-2 border-b border-border pb-3">
                <TabButton
                  active={activeTab === "contract"}
                  onClick={() => setActiveTab("contract")}
                >
                  Contract
                </TabButton>
                <TabButton active={activeTab === "fields"} onClick={() => setActiveTab("fields")}>
                  Fields
                </TabButton>
                <TabButton
                  active={activeTab === "guidance"}
                  onClick={() => setActiveTab("guidance")}
                >
                  Guidance
                </TabButton>
              </div>
            </DialogHeader>

            <div className="min-h-0 flex-1 overflow-y-auto py-4 pr-1 scrollbar-thin">
              {activeTab === "contract" ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="grid gap-2 lg:col-span-2">
                    <Label htmlFor="workflow-editor-form-step-key">Step Key</Label>
                    <Input
                      id="workflow-editor-form-step-key"
                      className="rounded-none border-border/70 bg-background/50"
                      value={stepKey}
                      onChange={(event) => setStepKey(event.target.value)}
                      placeholder="capture-context"
                    />
                  </div>
                  <div className="grid gap-2 lg:col-span-2">
                    <Label htmlFor="workflow-editor-form-step-label">Step Title</Label>
                    <Input
                      id="workflow-editor-form-step-label"
                      className="rounded-none border-border/70 bg-background/50"
                      value={label}
                      onChange={(event) => setLabel(event.target.value)}
                      placeholder="Capture workflow context"
                    />
                  </div>
                  <div className="grid gap-2 lg:col-span-2">
                    <Label htmlFor="workflow-editor-form-step-description">Step Description</Label>
                    <Textarea
                      id="workflow-editor-form-step-description"
                      className="min-h-36 resize-none rounded-none border-border/70 bg-background/50"
                      value={descriptionMarkdown}
                      onChange={(event) => setDescriptionMarkdown(event.target.value)}
                      placeholder="Markdown description for this Form step"
                    />
                  </div>
                </div>
              ) : null}

              {activeTab === "fields" ? (
                <div className="grid gap-4">
                  <div className="chiron-frame-flat chiron-tone-context grid gap-3 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="grid gap-1">
                        <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                          Field Bindings
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Bind each field to one reusable workflow context fact. A fact can only be
                          bound once per Form step.
                        </p>
                      </div>
                    </div>

                    {contextFactDefinitions.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No workflow context facts are available yet. Use Context Fact Definitions in
                        the editor rail first.
                      </p>
                    ) : availableDefinitionsForAdd.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Every workflow context fact is already bound in this Form step.
                      </p>
                    ) : (
                      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                        <div className="grid gap-2">
                          <Label htmlFor="workflow-editor-add-field">Workflow Context Fact</Label>
                          <Select
                            value={pendingFieldContextFactId}
                            onValueChange={(value) => setPendingFieldContextFactId(value ?? "")}
                          >
                            <SelectTrigger
                              id="workflow-editor-add-field"
                              className="w-full rounded-none border-border/70 bg-background/50"
                            >
                              <SelectValue placeholder="Select a workflow context fact" />
                            </SelectTrigger>
                            <SelectContent className="rounded-none">
                              {availableDefinitionsForAdd.map((definition) => (
                                <SelectItem
                                  key={definition.contextFactDefinitionId}
                                  value={definition.contextFactDefinitionId}
                                >
                                  {definition.label || definition.key}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end">
                          <Button
                            type="button"
                            className="rounded-none"
                            disabled={pendingFieldContextFactId.length === 0}
                            onClick={() => {
                              const definition = definitionsById.get(pendingFieldContextFactId);
                              if (!definition) {
                                return;
                              }

                              setFieldDrafts((previous) => [...previous, toFieldDraft(definition)]);
                              setPendingFieldContextFactId("");
                            }}
                          >
                            + Add Field Binding
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {fieldDrafts.length === 0 ? (
                    <div className="chiron-frame-flat grid gap-2 p-3">
                      <p className="text-xs text-muted-foreground">
                        No field bindings authored yet. Add bindings from the reusable workflow
                        context-fact definitions above.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {fieldDrafts.map((field, index) => {
                        const linkedDefinition = definitionsById.get(field.contextFactDefinitionId);
                        const selectableDefinitions = contextFactDefinitions.filter(
                          (definition) =>
                            definition.contextFactDefinitionId === field.contextFactDefinitionId ||
                            !boundContextFactIds.has(definition.contextFactDefinitionId),
                        );

                        return (
                          <article
                            key={field.localId}
                            className="chiron-cut-frame-thick chiron-tone-canvas grid gap-4 p-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="grid gap-1">
                                <p className="font-geist-pixel-square text-sm uppercase tracking-[0.12em]">
                                  {field.fieldLabel ||
                                    linkedDefinition?.label ||
                                    linkedDefinition?.key ||
                                    "Field binding"}
                                </p>
                                <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                                  {linkedDefinition
                                    ? `${linkedDefinition.key} · ${linkedDefinition.kind.replaceAll("_", " ")} · ${linkedDefinition.cardinality}`
                                    : "Unresolved workflow context fact"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Preview: {toPreviewLabel(linkedDefinition)}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  size="xs"
                                  variant="outline"
                                  className="rounded-none"
                                  disabled={index === 0}
                                  onClick={() => {
                                    if (index === 0) {
                                      return;
                                    }

                                    setFieldDrafts((previous) => {
                                      const next = [...previous];
                                      [next[index - 1], next[index]] = [
                                        next[index]!,
                                        next[index - 1]!,
                                      ];
                                      return next;
                                    });
                                  }}
                                >
                                  Move Up
                                </Button>
                                <Button
                                  type="button"
                                  size="xs"
                                  variant="outline"
                                  className="rounded-none"
                                  disabled={index === fieldDrafts.length - 1}
                                  onClick={() => {
                                    if (index === fieldDrafts.length - 1) {
                                      return;
                                    }

                                    setFieldDrafts((previous) => {
                                      const next = [...previous];
                                      [next[index], next[index + 1]] = [
                                        next[index + 1]!,
                                        next[index]!,
                                      ];
                                      return next;
                                    });
                                  }}
                                >
                                  Move Down
                                </Button>
                                <Button
                                  type="button"
                                  size="xs"
                                  variant="destructive"
                                  className="rounded-none"
                                  onClick={() => setPendingDeleteFieldId(field.localId)}
                                >
                                  Remove
                                </Button>
                              </div>
                            </div>

                            <div className="grid gap-4 lg:grid-cols-2">
                              <div className="grid gap-2 lg:col-span-2">
                                <Label
                                  htmlFor={`workflow-editor-field-definition-${field.localId}`}
                                >
                                  Workflow Context Fact
                                </Label>
                                <Select
                                  value={field.contextFactDefinitionId}
                                  onValueChange={(value) => {
                                    if (!value) {
                                      return;
                                    }

                                    const nextDefinition = definitionsById.get(value);
                                    setFieldDrafts((previous) =>
                                      previous.map((entry) =>
                                        entry.localId === field.localId && nextDefinition
                                          ? toFieldDraft(nextDefinition, {
                                              ...entry,
                                              contextFactDefinitionId: value,
                                            })
                                          : entry,
                                      ),
                                    );
                                  }}
                                >
                                  <SelectTrigger
                                    id={`workflow-editor-field-definition-${field.localId}`}
                                    className="w-full rounded-none border-border/70 bg-background/50"
                                  >
                                    <SelectValue placeholder="Select a workflow context fact" />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-none">
                                    {selectableDefinitions.map((definition) => (
                                      <SelectItem
                                        key={definition.contextFactDefinitionId}
                                        value={definition.contextFactDefinitionId}
                                      >
                                        {definition.label || definition.key}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="grid gap-2">
                                <Label htmlFor={`workflow-editor-field-label-${field.localId}`}>
                                  Field Label
                                </Label>
                                <Input
                                  id={`workflow-editor-field-label-${field.localId}`}
                                  className="rounded-none border-border/70 bg-background/50"
                                  value={field.fieldLabel}
                                  onChange={(event) =>
                                    setFieldDrafts((previous) =>
                                      previous.map((entry) =>
                                        entry.localId === field.localId
                                          ? { ...entry, fieldLabel: event.target.value }
                                          : entry,
                                      ),
                                    )
                                  }
                                />
                              </div>

                              <div className="grid gap-2">
                                <Label htmlFor={`workflow-editor-field-key-${field.localId}`}>
                                  Field Key
                                </Label>
                                <Input
                                  id={`workflow-editor-field-key-${field.localId}`}
                                  className="rounded-none border-border/70 bg-background/50"
                                  value={field.fieldKey}
                                  onChange={(event) =>
                                    setFieldDrafts((previous) =>
                                      previous.map((entry) =>
                                        entry.localId === field.localId
                                          ? { ...entry, fieldKey: event.target.value }
                                          : entry,
                                      ),
                                    )
                                  }
                                />
                              </div>

                              <div className="grid gap-2 lg:col-span-2">
                                <Label htmlFor={`workflow-editor-field-help-${field.localId}`}>
                                  Help Text
                                </Label>
                                <Textarea
                                  id={`workflow-editor-field-help-${field.localId}`}
                                  className="min-h-24 resize-none rounded-none border-border/70 bg-background/50"
                                  value={field.helpText ?? ""}
                                  onChange={(event) =>
                                    setFieldDrafts((previous) =>
                                      previous.map((entry) =>
                                        entry.localId === field.localId
                                          ? { ...entry, helpText: event.target.value }
                                          : entry,
                                      ),
                                    )
                                  }
                                  placeholder="Explain what the operator should provide"
                                />
                              </div>

                              <div className="flex items-center gap-3">
                                <Checkbox
                                  id={`workflow-editor-field-required-${field.localId}`}
                                  checked={field.required === true}
                                  onCheckedChange={(checked) =>
                                    setFieldDrafts((previous) =>
                                      previous.map((entry) =>
                                        entry.localId === field.localId
                                          ? { ...entry, required: checked === true }
                                          : entry,
                                      ),
                                    )
                                  }
                                />
                                <Label htmlFor={`workflow-editor-field-required-${field.localId}`}>
                                  Required binding
                                </Label>
                              </div>

                              <div className="grid gap-2">
                                <Label
                                  htmlFor={`workflow-editor-field-multiplicity-${field.localId}`}
                                >
                                  UI Multiplicity
                                </Label>
                                {linkedDefinition?.cardinality === "many" ? (
                                  <Select
                                    value={field.uiMultiplicityMode ?? "many"}
                                    onValueChange={(value) =>
                                      setFieldDrafts((previous) =>
                                        previous.map((entry) =>
                                          entry.localId === field.localId
                                            ? {
                                                ...entry,
                                                uiMultiplicityMode: value as "one" | "many",
                                              }
                                            : entry,
                                        ),
                                      )
                                    }
                                  >
                                    <SelectTrigger
                                      id={`workflow-editor-field-multiplicity-${field.localId}`}
                                      className="w-full rounded-none border-border/70 bg-background/50"
                                    >
                                      <SelectValue placeholder="Select UI multiplicity" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-none">
                                      <SelectItem value="many">many</SelectItem>
                                      <SelectItem value="one">one</SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <p className="text-xs text-muted-foreground">
                                    Single-value only. This binding inherits `one` from the linked
                                    context fact.
                                  </p>
                                )}
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null}

              {activeTab === "guidance" ? (
                <GuidanceFields guidance={guidance} onChange={setGuidance} />
              ) : null}
            </div>

            <DialogFooter className="shrink-0 border-t border-border/70 pt-4 sm:justify-between">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-none"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                {mode === "edit" ? (
                  <Button
                    type="button"
                    variant="destructive"
                    className="rounded-none"
                    onClick={() => void onDelete?.()}
                  >
                    Delete
                  </Button>
                ) : null}
              </div>
              <Button type="submit" className="rounded-none" disabled={!canSave}>
                {mode === "create" ? "Create" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={pendingDeleteFieldId !== null}
        onOpenChange={(nextOpen) => !nextOpen && setPendingDeleteFieldId(null)}
      >
        <DialogContent className="chiron-cut-frame-thick w-[min(28rem,calc(100vw-2rem))] p-6 sm:max-w-none">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold uppercase tracking-[0.08em]">
              Remove field binding?
            </DialogTitle>
            <DialogDescription>
              This removes the binding from the Form step only. The workflow context fact definition
              stays available in the editor rail.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="rounded-none"
              onClick={() => setPendingDeleteFieldId(null)}
            >
              Keep Field
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-none"
              onClick={() => pendingDeleteFieldId && removeField(pendingDeleteFieldId)}
            >
              Remove Binding
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function WorkflowContextFactDialog({
  open,
  mode,
  fact,
  methodologyFacts,
  currentWorkUnitFacts,
  artifactSlots,
  workUnitTypes,
  availableWorkflows,
  workUnitFactsQueryScope,
  loadWorkUnitFacts,
  onOpenChange,
  onSave,
}: WorkflowContextFactDialogProps) {
  const [draft, setDraft] = useState<WorkflowContextFactDraft>(toContextFactDraft());
  const [initialSnapshot, setInitialSnapshot] = useState<WorkflowContextFactDialogSnapshot | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<WorkflowContextFactDialogTab>("contract");
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);
  const [plainStringDefaultValue, setPlainStringDefaultValue] = useState("");
  const [plainStringValidationType, setPlainStringValidationType] =
    useState<PlainStringValidationType>("none");
  const [plainStringPathKind, setPlainStringPathKind] = useState<"file" | "directory">("file");
  const [plainStringTrimWhitespace, setPlainStringTrimWhitespace] = useState(true);
  const [plainStringDisallowAbsolute, setPlainStringDisallowAbsolute] = useState(true);
  const [plainStringPreventTraversal, setPlainStringPreventTraversal] = useState(true);
  const [plainStringRegexPattern, setPlainStringRegexPattern] = useState("");
  const [pendingAllowedValueTag, setPendingAllowedValueTag] = useState("");
  const [allowedValueTags, setAllowedValueTags] = useState<string[]>([]);
  const [jsonSubSchemaDrafts, setJsonSubSchemaDrafts] = useState<JsonSubSchemaDraft[]>([]);
  const [pendingIncludedFactKey, setPendingIncludedFactKey] = useState("");
  const [draftSpecCards, setDraftSpecCards] = useState<WorkUnitDraftFactCard[]>([]);
  const selectedWorkUnitTypeKey =
    draft.kind === "work_unit_draft_spec_fact" ? (draft.workUnitTypeKey?.trim() ?? "") : "";
  const selectedWorkUnitFactsQuery = useQuery({
    queryKey: [
      "workflow-editor",
      "work-unit-draft-spec-facts",
      workUnitFactsQueryScope,
      selectedWorkUnitTypeKey,
    ],
    queryFn: async () => loadWorkUnitFacts(selectedWorkUnitTypeKey),
    enabled:
      open && draft.kind === "work_unit_draft_spec_fact" && selectedWorkUnitTypeKey.length > 0,
  });
  const selectedWorkUnitFacts = selectedWorkUnitFactsQuery.data ?? [];
  const selectedDraftSpecPickerFacts = useMemo(
    () =>
      selectedWorkUnitFacts.map((option) => {
        const nextBadges = option.badges?.filter(
          (badge) =>
            badge.tone !== "source-methodology" && badge.tone !== "source-current-work-unit",
        );

        return nextBadges ? { ...option, badges: nextBadges } : option;
      }),
    [selectedWorkUnitFacts],
  );
  const externalFactOptions = useMemo(() => {
    const optionsByValue = new Map<string, WorkflowEditorPickerOption>();

    methodologyFacts.forEach((option) => {
      optionsByValue.set(option.value, option);
    });

    currentWorkUnitFacts.forEach((option) => {
      optionsByValue.set(option.value, option);
    });

    return [...optionsByValue.values()];
  }, [currentWorkUnitFacts, methodologyFacts]);
  const selectedExternalFact = useMemo(
    () =>
      draft.kind === "definition_backed_external_fact" || draft.kind === "bound_external_fact"
        ? externalFactOptions.find((option) => option.value === draft.externalFactDefinitionId)
        : undefined,
    [draft.externalFactDefinitionId, draft.kind, externalFactOptions],
  );
  const selectedDraftSpecFact = useMemo(
    () =>
      draft.kind === "work_unit_draft_spec_fact"
        ? selectedWorkUnitFacts.find((option) => option.value === pendingIncludedFactKey)
        : undefined,
    [draft.kind, pendingIncludedFactKey, selectedWorkUnitFacts],
  );
  const selectedArtifactSlot = useMemo(
    () =>
      draft.kind === "artifact_reference_fact"
        ? artifactSlots.find((option) => option.value === draft.artifactSlotDefinitionId)
        : undefined,
    [draft.kind, draft.artifactSlotDefinitionId, artifactSlots],
  );
  const constrainedSourceCardinality = useMemo(() => {
    switch (draft.kind) {
      case "definition_backed_external_fact":
      case "bound_external_fact":
        return getPickerOptionCardinality(selectedExternalFact);
      case "work_unit_draft_spec_fact":
        return getPickerOptionCardinality(selectedDraftSpecFact);
      case "artifact_reference_fact":
        return getPickerOptionCardinality(selectedArtifactSlot);
      default:
        return undefined;
    }
  }, [draft.kind, selectedDraftSpecFact, selectedExternalFact, selectedArtifactSlot]);
  const availableCardinalityOptions = useMemo(
    () =>
      constrainedSourceCardinality === "one"
        ? CARDINALITY_OPTIONS.filter((option) => option === "one")
        : CARDINALITY_OPTIONS,
    [constrainedSourceCardinality],
  );
  const selectedCardinalityValue =
    constrainedSourceCardinality === "one" ? "one" : draft.cardinality;

  useEffect(() => {
    if (!open) {
      setIsDiscardDialogOpen(false);
      return;
    }

    const nextDraft = toContextFactDraft(fact);
    const nextPlainStringDefaultValue = "";
    const nextPlainStringValidationType = "none" as const;
    const nextPlainStringPathKind = "file" as const;
    const nextPlainStringTrimWhitespace = true;
    const nextPlainStringDisallowAbsolute = true;
    const nextPlainStringPreventTraversal = true;
    const nextPlainStringRegexPattern = "";
    const nextPendingAllowedValueTag = "";
    const nextAllowedValueTags: string[] = [];
    const nextJsonSubSchemaDrafts =
      nextDraft.kind === "plain_value_fact" && nextDraft.valueType === "json"
        ? [createEmptyJsonSubSchemaDraft([])]
        : [];
    const nextPendingIncludedFactKey = "";
    const nextDraftSpecCards = nextDraft.includedFactKeys.map((factKey) =>
      createWorkUnitDraftFactCard(factKey, []),
    );

    setDraft(nextDraft);
    setPlainStringDefaultValue(nextPlainStringDefaultValue);
    setPlainStringValidationType(nextPlainStringValidationType);
    setPlainStringPathKind(nextPlainStringPathKind);
    setPlainStringTrimWhitespace(nextPlainStringTrimWhitespace);
    setPlainStringDisallowAbsolute(nextPlainStringDisallowAbsolute);
    setPlainStringPreventTraversal(nextPlainStringPreventTraversal);
    setPlainStringRegexPattern(nextPlainStringRegexPattern);
    setPendingAllowedValueTag(nextPendingAllowedValueTag);
    setAllowedValueTags(nextAllowedValueTags);
    setJsonSubSchemaDrafts(nextJsonSubSchemaDrafts);
    setPendingIncludedFactKey(nextPendingIncludedFactKey);
    setDraftSpecCards(nextDraftSpecCards);
    setInitialSnapshot(
      toWorkflowContextFactDialogSnapshot({
        draft: nextDraft,
        plainStringDefaultValue: nextPlainStringDefaultValue,
        plainStringValidationType: nextPlainStringValidationType,
        plainStringPathKind: nextPlainStringPathKind,
        plainStringTrimWhitespace: nextPlainStringTrimWhitespace,
        plainStringDisallowAbsolute: nextPlainStringDisallowAbsolute,
        plainStringPreventTraversal: nextPlainStringPreventTraversal,
        plainStringRegexPattern: nextPlainStringRegexPattern,
        pendingAllowedValueTag: nextPendingAllowedValueTag,
        allowedValueTags: nextAllowedValueTags,
        jsonSubSchemaDrafts: nextJsonSubSchemaDrafts,
        pendingIncludedFactKey: nextPendingIncludedFactKey,
        draftSpecCards: nextDraftSpecCards,
      }),
    );
    setIsDiscardDialogOpen(false);
    setActiveTab("contract");
  }, [fact, open]);

  useEffect(() => {
    if (!open || selectedWorkUnitFacts.length === 0) {
      return;
    }

    setDraftSpecCards((current) =>
      current.map((entry) => {
        const matchedOption = selectedWorkUnitFacts.find(
          (option) => option.value === entry.factKey,
        );

        return matchedOption
          ? {
              ...entry,
              displayName: matchedOption.label,
              description: matchedOption.description,
            }
          : entry;
      }),
    );
  }, [open, selectedWorkUnitFacts]);

  useEffect(() => {
    if (!open || constrainedSourceCardinality !== "one" || draft.cardinality === "one") {
      return;
    }

    setDraft((previous) =>
      previous.cardinality === "one" ? previous : { ...previous, cardinality: "one" },
    );
  }, [draft.cardinality, open, constrainedSourceCardinality]);

  const availableDraftSpecFactOptions = useMemo(
    () =>
      selectedDraftSpecPickerFacts.filter(
        (option) => !draftSpecCards.some((entry) => entry.factKey === option.value),
      ),
    [draftSpecCards, selectedDraftSpecPickerFacts],
  );

  const currentSnapshot = useMemo(
    () =>
      toWorkflowContextFactDialogSnapshot({
        draft,
        plainStringDefaultValue,
        plainStringValidationType,
        plainStringPathKind,
        plainStringTrimWhitespace,
        plainStringDisallowAbsolute,
        plainStringPreventTraversal,
        plainStringRegexPattern,
        pendingAllowedValueTag,
        allowedValueTags,
        jsonSubSchemaDrafts,
        pendingIncludedFactKey,
        draftSpecCards,
      }),
    [
      allowedValueTags,
      draft,
      draftSpecCards,
      jsonSubSchemaDrafts,
      pendingAllowedValueTag,
      pendingIncludedFactKey,
      plainStringDefaultValue,
      plainStringDisallowAbsolute,
      plainStringPathKind,
      plainStringPreventTraversal,
      plainStringRegexPattern,
      plainStringTrimWhitespace,
      plainStringValidationType,
    ],
  );
  const isContractDirty =
    open && initialSnapshot
      ? !areDialogSnapshotSectionsEqual(currentSnapshot.contract, initialSnapshot.contract)
      : false;
  const isValueSemanticsDirty =
    open && initialSnapshot
      ? !areDialogSnapshotSectionsEqual(
          currentSnapshot.valueSemantics,
          initialSnapshot.valueSemantics,
        )
      : false;
  const isGuidanceDirty =
    open && initialSnapshot
      ? !areDialogSnapshotSectionsEqual(currentSnapshot.guidance, initialSnapshot.guidance)
      : false;
  const isDialogDirty = isContractDirty || isValueSemanticsDirty || isGuidanceDirty;

  const canSave = draft.key.trim().length > 0;

  const closeDialog = () => {
    setIsDiscardDialogOpen(false);
    onOpenChange(false);
  };

  const requestCloseDialog = () => {
    if (isDialogDirty) {
      setIsDiscardDialogOpen(true);
      return;
    }

    closeDialog();
  };

  const addAllowedValueTag = () => {
    const nextValue = pendingAllowedValueTag.trim();
    if (!nextValue || allowedValueTags.includes(nextValue)) {
      return;
    }

    setAllowedValueTags((current) => [...current, nextValue]);
    setPendingAllowedValueTag("");
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            return;
          }

          requestCloseDialog();
        }}
      >
        <DialogContent className="chiron-cut-frame-thick flex w-[min(60rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] flex-col overflow-hidden p-6 sm:max-w-none sm:p-8">
          <form
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
            onSubmit={(event) => {
              event.preventDefault();
              if (!canSave) {
                return;
              }

              void onSave({
                ...draft,
                key: draft.key.trim(),
                label: draft.label.trim(),
                descriptionMarkdown: draft.descriptionMarkdown.trim(),
                externalFactDefinitionId: draft.externalFactDefinitionId?.trim() ?? "",
                artifactSlotDefinitionId: draft.artifactSlotDefinitionId?.trim() ?? "",
                workUnitTypeKey: draft.workUnitTypeKey?.trim() ?? "",
                allowedWorkflowDefinitionIds: draft.allowedWorkflowDefinitionIds.map((entry) =>
                  entry.trim(),
                ),
                includedFactKeys: draftSpecCards
                  .map((entry) => entry.factKey.trim())
                  .filter((entry) => entry.length > 0),
                guidance: {
                  humanMarkdown: draft.guidance.humanMarkdown.trim(),
                  agentMarkdown: draft.guidance.agentMarkdown.trim(),
                },
              });
            }}
          >
            <DialogHeader className="shrink-0 gap-2">
              <DialogTitle className="text-base font-semibold uppercase tracking-[0.08em]">
                {mode === "create"
                  ? "Create Context Fact Definition"
                  : `Edit Context Fact Definition: ${fact?.label || fact?.key || ""}`}
              </DialogTitle>
              <DialogDescription>
                Workflow-level context facts are the canonical reusable inputs for Form field
                bindings.
              </DialogDescription>
              <div className="mt-1 flex flex-wrap gap-2 border-b border-border pb-3">
                <TabButton
                  active={activeTab === "contract"}
                  onClick={() => setActiveTab("contract")}
                  isDirty={isContractDirty}
                  dirtyIndicatorTestId="workflow-context-fact-contract-modified-indicator"
                >
                  Contract
                </TabButton>
                <TabButton
                  active={activeTab === "value-semantics"}
                  onClick={() => setActiveTab("value-semantics")}
                  isDirty={isValueSemanticsDirty}
                  dirtyIndicatorTestId="workflow-context-fact-value-semantics-modified-indicator"
                >
                  Value Semantics
                </TabButton>
                <TabButton
                  active={activeTab === "guidance"}
                  onClick={() => setActiveTab("guidance")}
                  isDirty={isGuidanceDirty}
                  dirtyIndicatorTestId="workflow-context-fact-guidance-modified-indicator"
                >
                  Guidance
                </TabButton>
              </div>
            </DialogHeader>

            <div className="min-h-0 flex-1 overflow-y-auto py-4 pr-1 scrollbar-thin">
              {activeTab === "contract" ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="workflow-editor-context-fact-key">Fact Key</Label>
                    <Input
                      id="workflow-editor-context-fact-key"
                      className="rounded-none border-border/70 bg-background/50"
                      value={draft.key}
                      onChange={(event) =>
                        setDraft((previous) => ({ ...previous, key: event.target.value }))
                      }
                      placeholder="project-summary"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="workflow-editor-context-fact-label">Display Name</Label>
                    <Input
                      id="workflow-editor-context-fact-label"
                      className="rounded-none border-border/70 bg-background/50"
                      value={draft.label}
                      onChange={(event) =>
                        setDraft((previous) => ({ ...previous, label: event.target.value }))
                      }
                      placeholder="Project Summary"
                    />
                  </div>

                  <div className="grid gap-2 lg:col-span-2">
                    <Label htmlFor="workflow-editor-context-fact-description">Description</Label>
                    <Textarea
                      id="workflow-editor-context-fact-description"
                      className="min-h-32 resize-none rounded-none border-border/70 bg-background/50"
                      value={draft.descriptionMarkdown}
                      onChange={(event) =>
                        setDraft((previous) => ({
                          ...previous,
                          descriptionMarkdown: event.target.value,
                        }))
                      }
                      placeholder="Markdown description for this reusable workflow context fact"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="workflow-editor-context-fact-kind">Fact Kind</Label>
                    <Select
                      value={draft.kind}
                      onValueChange={(value) =>
                        setDraft((previous) => {
                          const nextKind = value as WorkflowContextFactDraft["kind"];
                          setPlainStringDefaultValue("");
                          setPlainStringValidationType("none");
                          setPlainStringPathKind("file");
                          setPlainStringTrimWhitespace(true);
                          setPlainStringDisallowAbsolute(true);
                          setPlainStringPreventTraversal(true);
                          setPlainStringRegexPattern("");
                          setPendingAllowedValueTag("");
                          setAllowedValueTags([]);
                          setJsonSubSchemaDrafts([]);
                          setPendingIncludedFactKey("");
                          setDraftSpecCards([]);

                          return {
                            ...toContextFactDraft(undefined, nextKind),
                            key: previous.key,
                            label: previous.label,
                            descriptionMarkdown: previous.descriptionMarkdown,
                            cardinality: previous.cardinality,
                            guidance: previous.guidance,
                            kind: nextKind,
                          };
                        })
                      }
                      disabled={mode === "edit"}
                    >
                      <SelectTrigger
                        id="workflow-editor-context-fact-kind"
                        className="w-full rounded-none border-border/70 bg-background/50"
                      >
                        <SelectValue placeholder="Select fact kind" />
                      </SelectTrigger>
                      <SelectContent className="rounded-none">
                        {CONTEXT_FACT_KIND_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {mode === "edit" ? (
                      <p className="text-xs text-muted-foreground">
                        Fact kind is locked after creation in slice-1. Delete and recreate to change
                        it.
                      </p>
                    ) : null}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="workflow-editor-context-fact-cardinality">Cardinality</Label>
                    <Select
                      value={selectedCardinalityValue}
                      onValueChange={(value) =>
                        setDraft((previous) => ({
                          ...previous,
                          cardinality: value as WorkflowContextFactDraft["cardinality"],
                        }))
                      }
                    >
                      <SelectTrigger
                        id="workflow-editor-context-fact-cardinality"
                        className="w-full rounded-none border-border/70 bg-background/50"
                      >
                        <SelectValue placeholder="Select cardinality" />
                      </SelectTrigger>
                      <SelectContent className="rounded-none">
                        {availableCardinalityOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : null}

              {activeTab === "value-semantics" ? (
                <div className="chiron-frame-flat chiron-tone-context grid gap-4 p-4">
                  <div className="grid gap-1">
                    <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                      {
                        CONTEXT_FACT_KIND_OPTIONS.find((option) => option.value === draft.kind)
                          ?.label
                      }
                    </p>
                    <p className="text-xs text-muted-foreground">{summarizeContextFact(draft)}</p>
                  </div>

                  {draft.kind === "plain_value_fact" ? (
                    <div className="grid gap-4">
                      <div className="grid gap-2 lg:max-w-sm">
                        <Label htmlFor="workflow-editor-context-fact-value-type">Value Type</Label>
                        <Select
                          value={draft.valueType ?? "string"}
                          onValueChange={(value) => {
                            const nextValueType = (value ?? "string") as
                              | "string"
                              | "number"
                              | "boolean"
                              | "json";

                            setDraft((previous) => ({
                              ...previous,
                              valueType: nextValueType,
                            }));

                            if (nextValueType === "json") {
                              setJsonSubSchemaDrafts((current) =>
                                current.length > 0 ? current : [createEmptyJsonSubSchemaDraft([])],
                              );
                            }
                          }}
                        >
                          <SelectTrigger
                            id="workflow-editor-context-fact-value-type"
                            className="w-full rounded-none border-border/70 bg-background/50"
                          >
                            <SelectValue placeholder="Select value type" />
                          </SelectTrigger>
                          <SelectContent className="rounded-none">
                            {VALUE_TYPE_OPTIONS.map((valueType) => (
                              <SelectItem key={valueType} value={valueType}>
                                {valueType}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {draft.valueType === "string" ? (
                        <Card frame="cut-thick" tone="context" className="shadow-none">
                          <CardHeader className="border-b border-border/70">
                            <CardTitle className="font-geist-pixel-square text-sm uppercase tracking-[0.12em]">
                              String Validation
                            </CardTitle>
                            <CardDescription>
                              Configure default input semantics and operator-side validation rules.
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="grid gap-4 py-4 lg:grid-cols-2">
                            <div className="grid gap-2 lg:col-span-2">
                              <Label htmlFor="workflow-editor-context-fact-string-default-value">
                                Default Value
                              </Label>
                              <Input
                                id="workflow-editor-context-fact-string-default-value"
                                className="rounded-none border-border/70 bg-background/50"
                                value={plainStringDefaultValue}
                                onChange={(event) => setPlainStringDefaultValue(event.target.value)}
                                placeholder="Enter a default string value"
                              />
                            </div>

                            <div className="grid gap-2">
                              <Label htmlFor="workflow-editor-context-fact-string-validation-type">
                                Validation Type
                              </Label>
                              <Select
                                value={plainStringValidationType}
                                onValueChange={(value) =>
                                  setPlainStringValidationType(value as PlainStringValidationType)
                                }
                              >
                                <SelectTrigger
                                  id="workflow-editor-context-fact-string-validation-type"
                                  className="w-full rounded-none border-border/70 bg-background/50"
                                >
                                  <SelectValue placeholder="Select validation type" />
                                </SelectTrigger>
                                <SelectContent className="rounded-none">
                                  <SelectItem value="none">none</SelectItem>
                                  <SelectItem value="path">path</SelectItem>
                                  <SelectItem value="regex">regex</SelectItem>
                                  <SelectItem value="allowed-values">allowed-values</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {plainStringValidationType === "regex" ? (
                              <div className="grid gap-2">
                                <Label htmlFor="workflow-editor-context-fact-string-regex-pattern">
                                  Regex Pattern
                                </Label>
                                <Input
                                  id="workflow-editor-context-fact-string-regex-pattern"
                                  className="rounded-none border-border/70 bg-background/50"
                                  value={plainStringRegexPattern}
                                  onChange={(event) =>
                                    setPlainStringRegexPattern(event.target.value)
                                  }
                                  placeholder="^src/.+\\.tsx$"
                                />
                              </div>
                            ) : null}

                            {plainStringValidationType === "allowed-values" ? (
                              <div className="grid gap-3 lg:col-span-2">
                                <Label htmlFor="workflow-editor-context-fact-string-allowed-value-input">
                                  Allowed Values
                                </Label>
                                <div className="flex flex-col gap-2 sm:flex-row">
                                  <Input
                                    id="workflow-editor-context-fact-string-allowed-value-input"
                                    className="rounded-none border-border/70 bg-background/50"
                                    value={pendingAllowedValueTag}
                                    onChange={(event) =>
                                      setPendingAllowedValueTag(event.target.value)
                                    }
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter") {
                                        event.preventDefault();
                                        addAllowedValueTag();
                                      }
                                    }}
                                    placeholder="Enter an allowed value"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="rounded-none"
                                    onClick={addAllowedValueTag}
                                  >
                                    Add allowed value
                                  </Button>
                                </div>
                                {allowedValueTags.length > 0 ? (
                                  <div className="flex flex-wrap gap-2">
                                    {allowedValueTags.map((value) => (
                                      <span
                                        key={value}
                                        className="chiron-frame-flat inline-flex items-center gap-1 px-2 py-1 text-xs"
                                      >
                                        {value}
                                        <button
                                          type="button"
                                          aria-label={`Remove ${value}`}
                                          className="text-muted-foreground transition-colors hover:text-foreground"
                                          onClick={() =>
                                            setAllowedValueTags((current) =>
                                              current.filter((entry) => entry !== value),
                                            )
                                          }
                                        >
                                          <XIcon className="size-3" />
                                        </button>
                                      </span>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            ) : null}

                            {plainStringValidationType === "path" ? (
                              <div className="chiron-frame-flat grid gap-4 p-4 lg:col-span-2">
                                <div className="grid gap-2 lg:max-w-sm">
                                  <Label htmlFor="workflow-editor-context-fact-string-path-kind">
                                    Path Kind
                                  </Label>
                                  <Select
                                    value={plainStringPathKind}
                                    onValueChange={(value) =>
                                      setPlainStringPathKind(value as "file" | "directory")
                                    }
                                  >
                                    <SelectTrigger
                                      id="workflow-editor-context-fact-string-path-kind"
                                      className="w-full rounded-none border-border/70 bg-background/50"
                                    >
                                      <SelectValue placeholder="Select path kind" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-none">
                                      <SelectItem value="file">file</SelectItem>
                                      <SelectItem value="directory">directory</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="flex flex-wrap gap-x-8 gap-y-4">
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      id="workflow-editor-context-fact-string-trim-whitespace"
                                      checked={plainStringTrimWhitespace}
                                      onCheckedChange={(checked) =>
                                        setPlainStringTrimWhitespace(checked === true)
                                      }
                                    />
                                    <Label
                                      htmlFor="workflow-editor-context-fact-string-trim-whitespace"
                                      className="text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground"
                                    >
                                      Trim Whitespace
                                    </Label>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      id="workflow-editor-context-fact-string-disallow-absolute"
                                      checked={plainStringDisallowAbsolute}
                                      onCheckedChange={(checked) =>
                                        setPlainStringDisallowAbsolute(checked === true)
                                      }
                                    />
                                    <Label
                                      htmlFor="workflow-editor-context-fact-string-disallow-absolute"
                                      className="text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground"
                                    >
                                      Disallow Absolute
                                    </Label>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      id="workflow-editor-context-fact-string-prevent-traversal"
                                      checked={plainStringPreventTraversal}
                                      onCheckedChange={(checked) =>
                                        setPlainStringPreventTraversal(checked === true)
                                      }
                                    />
                                    <Label
                                      htmlFor="workflow-editor-context-fact-string-prevent-traversal"
                                      className="text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground"
                                    >
                                      Prevent Traversal
                                    </Label>
                                  </div>
                                </div>
                              </div>
                            ) : null}
                          </CardContent>
                        </Card>
                      ) : null}

                      {draft.valueType === "json" ? (
                        <div className="grid gap-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="grid gap-1">
                              <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                                JSON Sub-schema
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Define nested keys with the same dense card language used elsewhere
                                in the editor.
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              className="rounded-none"
                              onClick={() =>
                                setJsonSubSchemaDrafts((current) => [
                                  ...current,
                                  createEmptyJsonSubSchemaDraft(current),
                                ])
                              }
                            >
                              <PlusIcon className="size-3.5" />
                              Add JSON Key
                            </Button>
                          </div>

                          {jsonSubSchemaDrafts.length === 0 ? (
                            <div className="chiron-frame-flat grid gap-2 p-4">
                              <p className="text-xs text-muted-foreground">
                                No JSON keys authored yet. Add a key to shape the nested contract.
                              </p>
                            </div>
                          ) : (
                            <div className="grid gap-3">
                              {jsonSubSchemaDrafts.map((entry, index) => (
                                <Card
                                  key={entry.localId}
                                  frame="cut-thick"
                                  tone="context"
                                  className="shadow-none"
                                >
                                  <CardHeader className="border-b border-border/70">
                                    <CardTitle className="font-geist-pixel-square text-sm uppercase tracking-[0.12em]">
                                      {entry.displayName || entry.key || `JSON Key ${index + 1}`}
                                    </CardTitle>
                                    <CardDescription>
                                      Key {index + 1} · nested JSON field contract
                                    </CardDescription>
                                  </CardHeader>
                                  <CardContent className="grid gap-4 py-4 lg:grid-cols-2">
                                    <div className="grid gap-2">
                                      <Label
                                        htmlFor={`workflow-editor-json-display-name-${entry.localId}`}
                                      >
                                        Key Display Name
                                      </Label>
                                      <Input
                                        id={`workflow-editor-json-display-name-${entry.localId}`}
                                        className="rounded-none border-border/70 bg-background/50"
                                        value={entry.displayName}
                                        onChange={(event) =>
                                          setJsonSubSchemaDrafts((current) =>
                                            current.map((currentEntry) =>
                                              currentEntry.localId === entry.localId
                                                ? {
                                                    ...currentEntry,
                                                    displayName: event.target.value,
                                                  }
                                                : currentEntry,
                                            ),
                                          )
                                        }
                                        placeholder="Project Root"
                                      />
                                    </div>
                                    <div className="grid gap-2">
                                      <Label
                                        htmlFor={`workflow-editor-json-key-name-${entry.localId}`}
                                      >
                                        Key Name
                                      </Label>
                                      <Input
                                        id={`workflow-editor-json-key-name-${entry.localId}`}
                                        className="rounded-none border-border/70 bg-background/50"
                                        value={entry.key}
                                        onChange={(event) =>
                                          setJsonSubSchemaDrafts((current) =>
                                            current.map((currentEntry) =>
                                              currentEntry.localId === entry.localId
                                                ? { ...currentEntry, key: event.target.value }
                                                : currentEntry,
                                            ),
                                          )
                                        }
                                        placeholder="project_root"
                                      />
                                    </div>
                                    <div className="grid gap-2">
                                      <Label
                                        htmlFor={`workflow-editor-json-default-value-${entry.localId}`}
                                      >
                                        Default Value
                                      </Label>
                                      <Input
                                        id={`workflow-editor-json-default-value-${entry.localId}`}
                                        className="rounded-none border-border/70 bg-background/50"
                                        value={entry.defaultValue}
                                        onChange={(event) =>
                                          setJsonSubSchemaDrafts((current) =>
                                            current.map((currentEntry) =>
                                              currentEntry.localId === entry.localId
                                                ? {
                                                    ...currentEntry,
                                                    defaultValue: event.target.value,
                                                  }
                                                : currentEntry,
                                            ),
                                          )
                                        }
                                        placeholder="./docs"
                                      />
                                    </div>
                                    <div className="grid gap-2">
                                      <Label
                                        htmlFor={`workflow-editor-json-value-type-${entry.localId}`}
                                      >
                                        Value Type
                                      </Label>
                                      <Select
                                        value={entry.valueType}
                                        onValueChange={(value) =>
                                          setJsonSubSchemaDrafts((current) =>
                                            current.map((currentEntry) =>
                                              currentEntry.localId === entry.localId
                                                ? {
                                                    ...currentEntry,
                                                    valueType: (value ?? "string") as
                                                      | "string"
                                                      | "number"
                                                      | "boolean"
                                                      | "json",
                                                  }
                                                : currentEntry,
                                            ),
                                          )
                                        }
                                      >
                                        <SelectTrigger
                                          id={`workflow-editor-json-value-type-${entry.localId}`}
                                          className="w-full rounded-none border-border/70 bg-background/50"
                                        >
                                          <SelectValue placeholder="Select value type" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-none">
                                          {VALUE_TYPE_OPTIONS.map((valueType) => (
                                            <SelectItem key={valueType} value={valueType}>
                                              {valueType}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </CardContent>
                                  <CardFooter className="justify-end border-border/70">
                                    <Button
                                      type="button"
                                      size="xs"
                                      variant="destructive"
                                      className="rounded-none"
                                      onClick={() =>
                                        setJsonSubSchemaDrafts((current) =>
                                          current.filter(
                                            (currentEntry) =>
                                              currentEntry.localId !== entry.localId,
                                          ),
                                        )
                                      }
                                    >
                                      Remove Key
                                    </Button>
                                  </CardFooter>
                                </Card>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {draft.kind === "definition_backed_external_fact" ||
                  draft.kind === "bound_external_fact" ? (
                    <div className="grid gap-2 lg:max-w-2xl">
                      <Label id="workflow-editor-context-fact-external-definition">
                        External Fact Definition Id
                      </Label>
                      <SearchableCombobox
                        labelId="workflow-editor-context-fact-external-definition"
                        value={draft.externalFactDefinitionId ?? ""}
                        onChange={(value) =>
                          setDraft((previous) => ({ ...previous, externalFactDefinitionId: value }))
                        }
                        options={externalFactOptions}
                        placeholder="Select an external fact"
                        searchPlaceholder="Search external facts..."
                        emptyLabel="No external facts found."
                      />
                    </div>
                  ) : null}

                  {draft.kind === "workflow_reference_fact" ? (
                    <div className="grid gap-3">
                      <Label id="workflow-editor-context-fact-workflow-ids">
                        Allowed Workflow Definition Ids
                      </Label>
                      {draft.cardinality === "one" ? (
                        <SearchableCombobox
                          labelId="workflow-editor-context-fact-workflow-ids"
                          value={draft.allowedWorkflowDefinitionIds[0] ?? ""}
                          onChange={(value) =>
                            setDraft((previous) => ({
                              ...previous,
                              allowedWorkflowDefinitionIds: value ? [value] : [],
                            }))
                          }
                          options={availableWorkflows}
                          placeholder="Select an allowed workflow"
                          searchPlaceholder="Search workflows..."
                          emptyLabel="No workflows found."
                        />
                      ) : (
                        <SearchableMultiSelect
                          labelId="workflow-editor-context-fact-workflow-ids"
                          values={draft.allowedWorkflowDefinitionIds}
                          onChange={(values) =>
                            setDraft((previous) => ({
                              ...previous,
                              allowedWorkflowDefinitionIds: values,
                            }))
                          }
                          options={availableWorkflows}
                          placeholder="Select allowed workflows"
                          searchPlaceholder="Search workflows..."
                          emptyLabel="No workflows found."
                          singularLabel="workflow"
                          pluralLabel="workflows"
                        />
                      )}

                      {draft.allowedWorkflowDefinitionIds.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          No workflows selected yet. Add one or more reusable workflow references.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {draft.allowedWorkflowDefinitionIds.map((workflowId) => (
                            <button
                              key={workflowId}
                              type="button"
                              className="chiron-frame-flat flex items-center gap-2 px-3 py-2 text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground"
                              onClick={() =>
                                setDraft((previous) => ({
                                  ...previous,
                                  allowedWorkflowDefinitionIds:
                                    previous.allowedWorkflowDefinitionIds.filter(
                                      (value) => value !== workflowId,
                                    ),
                                }))
                              }
                            >
                              <span>{workflowId}</span>
                              <span className="text-foreground">×</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}

                  {draft.kind === "artifact_reference_fact" ? (
                    <div className="grid gap-2 lg:max-w-2xl">
                      <Label id="workflow-editor-context-fact-artifact-slot">
                        Artifact Slot Definition Id
                      </Label>
                      <SearchableCombobox
                        labelId="workflow-editor-context-fact-artifact-slot"
                        value={draft.artifactSlotDefinitionId ?? ""}
                        onChange={(value) =>
                          setDraft((previous) => ({ ...previous, artifactSlotDefinitionId: value }))
                        }
                        options={artifactSlots}
                        placeholder="Select an artifact slot"
                        searchPlaceholder="Search artifact slots..."
                        emptyLabel="No artifact slots found."
                      />
                    </div>
                  ) : null}

                  {draft.kind === "work_unit_draft_spec_fact" ? (
                    <div className="grid gap-4">
                      <div className="grid gap-2 lg:max-w-2xl">
                        <Label id="workflow-editor-context-fact-work-unit-type">
                          Work Unit Type Key
                        </Label>
                        <SearchableCombobox
                          labelId="workflow-editor-context-fact-work-unit-type"
                          value={draft.workUnitTypeKey ?? ""}
                          onChange={(value) => {
                            setPendingIncludedFactKey("");
                            setDraftSpecCards([]);
                            setDraft((previous) => ({
                              ...previous,
                              workUnitTypeKey: value,
                              includedFactKeys: [],
                            }));
                          }}
                          options={workUnitTypes}
                          placeholder="Select a work unit type"
                          searchPlaceholder="Search work unit types..."
                          emptyLabel="No work unit types found."
                        />
                      </div>

                      <div className="chiron-frame-flat grid gap-3 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="grid gap-1">
                            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                              Included Fact Keys
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Compose the reusable draft-spec envelope as removable fact cards.
                            </p>
                          </div>
                        </div>

                        {availableDraftSpecFactOptions.length > 0 ? (
                          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                            <div className="grid gap-2">
                              <Label id="workflow-editor-context-fact-draft-spec-fields">
                                Fact Key
                              </Label>
                              <SearchableCombobox
                                labelId="workflow-editor-context-fact-draft-spec-fields"
                                value={pendingIncludedFactKey}
                                onChange={setPendingIncludedFactKey}
                                options={availableDraftSpecFactOptions}
                                placeholder={
                                  selectedWorkUnitTypeKey.length > 0
                                    ? "Select a fact key"
                                    : "Select a work unit type first"
                                }
                                searchPlaceholder="Search fact keys..."
                                emptyLabel={
                                  selectedWorkUnitTypeKey.length === 0
                                    ? "Select a work unit type first."
                                    : selectedWorkUnitFactsQuery.isLoading
                                      ? "Loading fact keys..."
                                      : "No fact keys found."
                                }
                                disabled={selectedWorkUnitTypeKey.length === 0}
                              />
                            </div>
                            <div className="flex items-end">
                              <Button
                                type="button"
                                className="rounded-none"
                                disabled={
                                  selectedWorkUnitTypeKey.length === 0 ||
                                  pendingIncludedFactKey.length === 0
                                }
                                onClick={() => {
                                  if (pendingIncludedFactKey.length === 0) {
                                    return;
                                  }

                                  const nextCards = [
                                    ...draftSpecCards,
                                    createWorkUnitDraftFactCard(
                                      pendingIncludedFactKey,
                                      selectedWorkUnitFacts,
                                    ),
                                  ];
                                  setDraftSpecCards(nextCards);
                                  setDraft((previous) => ({
                                    ...previous,
                                    includedFactKeys: nextCards.map((entry) => entry.factKey),
                                  }));
                                  setPendingIncludedFactKey("");
                                }}
                              >
                                <PlusIcon className="size-3.5" />
                                Add Fact Key
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            {selectedWorkUnitTypeKey.length === 0
                              ? "Select a work unit type to load draft-spec fact keys."
                              : selectedWorkUnitFactsQuery.isLoading
                                ? "Loading facts for the selected work unit..."
                                : "Every available work unit fact is already included in this draft-spec composer."}
                          </p>
                        )}

                        {draftSpecCards.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            No included fact keys yet. Add cards from the searchable picker above.
                          </p>
                        ) : (
                          <div className="grid gap-3">
                            {draftSpecCards.map((entry) => (
                              <Card
                                key={entry.localId}
                                frame="cut-thick"
                                tone="context"
                                className="shadow-none"
                              >
                                <CardHeader className="border-b border-border/70">
                                  <CardTitle className="font-geist-pixel-square text-sm uppercase tracking-[0.12em]">
                                    {entry.displayName}
                                  </CardTitle>
                                  <CardDescription>{entry.factKey}</CardDescription>
                                </CardHeader>
                                <CardContent className="grid gap-3 py-4 lg:grid-cols-3">
                                  <div className="grid gap-1">
                                    <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                                      Fact Key
                                    </p>
                                    <p className="text-xs">{entry.factKey}</p>
                                  </div>
                                  <div className="grid gap-1">
                                    <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                                      Display Name
                                    </p>
                                    <p className="text-xs">{entry.displayName}</p>
                                  </div>
                                  <div className="grid gap-1">
                                    <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                                      Description
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {entry.description ?? "Work unit fact"}
                                    </p>
                                  </div>
                                </CardContent>
                                <CardFooter className="justify-end border-border/70">
                                  <Button
                                    type="button"
                                    size="xs"
                                    variant="destructive"
                                    className="rounded-none"
                                    onClick={() => {
                                      const nextCards = draftSpecCards.filter(
                                        (currentEntry) => currentEntry.localId !== entry.localId,
                                      );
                                      setDraftSpecCards(nextCards);
                                      setDraft((previous) => ({
                                        ...previous,
                                        includedFactKeys: nextCards.map((card) => card.factKey),
                                      }));
                                    }}
                                  >
                                    Remove
                                  </Button>
                                </CardFooter>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {activeTab === "guidance" ? (
                <GuidanceFields
                  guidance={draft.guidance}
                  onChange={(guidance) => setDraft((previous) => ({ ...previous, guidance }))}
                />
              ) : null}
            </div>

            <DialogFooter className="shrink-0 border-t border-border/70 pt-4 sm:justify-between">
              <Button
                type="button"
                variant="outline"
                className="rounded-none"
                onClick={requestCloseDialog}
              >
                Cancel
              </Button>
              <Button type="submit" className="rounded-none" disabled={!canSave}>
                {mode === "create" ? "Create" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDiscardDialogOpen} onOpenChange={setIsDiscardDialogOpen}>
        <DialogContent className="chiron-cut-frame-thick w-[min(28rem,calc(100vw-2rem))] p-8 sm:max-w-none">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold uppercase tracking-[0.08em]">
              Discard unsaved changes?
            </DialogTitle>
            <DialogDescription>
              You have unsaved fact edits. Discarding now will close the dialog and lose those
              changes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-none"
              onClick={() => setIsDiscardDialogOpen(false)}
            >
              Keep Editing
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-none"
              onClick={closeDialog}
            >
              Discard Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

type EdgeDialogProps = {
  open: boolean;
  edge?: WorkflowEditorEdge | undefined;
  onOpenChange: (open: boolean) => void;
  onSave: (descriptionMarkdown: string) => Promise<void> | void;
  onDelete: () => Promise<void> | void;
};

export function EdgeDialog({ open, edge, onOpenChange, onSave, onDelete }: EdgeDialogProps) {
  const [descriptionMarkdown, setDescriptionMarkdown] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }
    setDescriptionMarkdown(edge?.descriptionMarkdown ?? "");
  }, [edge?.descriptionMarkdown, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="chiron-cut-frame-thick w-[min(32rem,calc(100vw-2rem))] p-5 sm:max-w-none">
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void onSave(descriptionMarkdown.trim());
          }}
        >
          <DialogHeader>
            <DialogTitle>Edge Details</DialogTitle>
            <DialogDescription>
              {edge
                ? `Edit transition edge from ${edge.fromStepKey} to ${edge.toStepKey}.`
                : "No edge selected."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-1.5">
            <Label htmlFor="workflow-editor-edge-description">Description</Label>
            <Textarea
              id="workflow-editor-edge-description"
              value={descriptionMarkdown}
              onChange={(event) => setDescriptionMarkdown(event.target.value)}
              placeholder="Markdown description for this edge"
              rows={5}
            />
          </div>

          <DialogFooter className="gap-2 sm:items-start sm:justify-between">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <div className="grid w-full gap-2 sm:w-auto">
              <Button type="submit">Save edge</Button>
              <Button type="button" variant="destructive" onClick={() => void onDelete()}>
                Delete edge
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type WorkflowMetadataDialogProps = {
  open: boolean;
  metadata: WorkflowEditorMetadata;
  onOpenChange: (open: boolean) => void;
  onSave: (nextMetadata: WorkflowEditorMetadata) => Promise<void> | void;
};

export function WorkflowMetadataDialog({
  open,
  metadata,
  onOpenChange,
  onSave,
}: WorkflowMetadataDialogProps) {
  const [key, setKey] = useState(metadata.key);
  const [displayName, setDisplayName] = useState(metadata.displayName);
  const [descriptionMarkdown, setDescriptionMarkdown] = useState(metadata.descriptionMarkdown);

  useEffect(() => {
    if (!open) {
      return;
    }
    setKey(metadata.key);
    setDisplayName(metadata.displayName);
    setDescriptionMarkdown(metadata.descriptionMarkdown);
  }, [metadata, open]);

  const normalizedDisplayName = useMemo(() => displayName.trim(), [displayName]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="chiron-cut-frame-thick w-[min(36rem,calc(100vw-2rem))] p-5 sm:max-w-none">
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!key.trim()) {
              return;
            }
            void onSave({
              workflowDefinitionId: metadata.workflowDefinitionId,
              key: key.trim(),
              displayName: normalizedDisplayName,
              descriptionMarkdown: descriptionMarkdown.trim(),
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>Workflow metadata</DialogTitle>
            <DialogDescription>
              Updates the canonical workflow row for this workflow definition.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="workflow-editor-metadata-key">Workflow Key</Label>
              <Input
                id="workflow-editor-metadata-key"
                value={key}
                onChange={(event) => setKey(event.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="workflow-editor-metadata-display-name">Workflow Display Name</Label>
              <Input
                id="workflow-editor-metadata-display-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="workflow-editor-metadata-description">Description</Label>
              <Textarea
                id="workflow-editor-metadata-description"
                rows={5}
                value={descriptionMarkdown}
                onChange={(event) => setDescriptionMarkdown(event.target.value)}
                placeholder="Markdown description"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save metadata</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
