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
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import { Textarea } from "../../components/ui/textarea";
import { getAllowedValues } from "../methodologies/fact-validation";

import type {
  WorkflowBranchRouteConditionPayload,
  WorkflowBranchRouteGroupPayload,
  WorkflowBranchRoutePayload,
  WorkflowBranchStepPayload,
  WorkflowConditionOperand,
  WorkflowConditionOperator,
  WorkflowContextFactDefinitionItem,
  WorkflowContextFactDraft,
  WorkflowEditorEdge,
  WorkflowEditorPickerBadge,
  WorkflowEditorFieldDraft,
  WorkflowEditorGuidance,
  WorkflowInvokeArtifactSlotDefinition,
  WorkflowEditorMetadata,
  WorkflowEditorPickerOption,
  WorkflowEditorStep,
  WorkflowFormStepPayload,
  WorkflowInvokeStepPayload,
  WorkflowInvokeWorkUnitFactDefinition,
} from "./types";
import { STEP_TYPE_ICON_CODES, STEP_TYPE_LABELS } from "./types";

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
  loadWorkUnitArtifactSlots: (
    workUnitTypeKey: string,
  ) => Promise<readonly WorkflowEditorPickerOption[]>;
  onOpenChange: (open: boolean) => void;
  onSave: (draft: WorkflowContextFactDraft) => Promise<void> | void;
};

type InvokeStepDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  step?: WorkflowEditorStep | undefined;
  availableWorkflows: readonly WorkflowEditorPickerOption[];
  availableWorkUnits: readonly WorkflowEditorPickerOption[];
  availableTransitions: readonly WorkflowEditorPickerOption[];
  availableContextFacts: readonly WorkflowContextFactDefinitionItem[];
  workUnitFactsQueryScope: string;
  loadWorkUnitFacts: (
    workUnitDefinitionId: string,
  ) => Promise<readonly WorkflowInvokeWorkUnitFactDefinition[]>;
  loadWorkUnitArtifactSlots: (
    workUnitDefinitionId: string,
  ) => Promise<readonly WorkflowInvokeArtifactSlotDefinition[]>;
  loadWorkUnitTransitions?: (
    workUnitDefinitionId: string,
  ) => Promise<readonly WorkflowEditorPickerOption[]>;
  loadWorkUnitWorkflows?: (
    workUnitDefinitionId: string,
  ) => Promise<readonly WorkflowEditorPickerOption[]>;
  loadTransitionBoundWorkflowKeys?: (
    workUnitDefinitionId: string,
    transitionId: string,
  ) => Promise<readonly string[]>;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: WorkflowInvokeStepPayload) => Promise<void> | void;
  onDelete?: (() => Promise<void> | void) | undefined;
};

type BranchStepDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  step?: WorkflowEditorStep | undefined;
  availableSteps: readonly WorkflowEditorPickerOption[];
  availableContextFacts: readonly WorkflowContextFactDefinitionItem[];
  conditionOperators: readonly WorkflowConditionOperator[];
  onOpenChange: (open: boolean) => void;
  onSave: (payload: WorkflowBranchStepPayload) => Promise<void> | void;
  onDelete?: (() => Promise<void> | void) | undefined;
};

type RouteDialogProps = {
  open: boolean;
  ownerStepId?: string;
  route: WorkflowBranchRoutePayload | null;
  availableSteps: readonly WorkflowEditorPickerOption[];
  availableContextFacts: readonly WorkflowContextFactDefinitionItem[];
  conditionOperators: readonly WorkflowConditionOperator[];
  onOpenChange: (open: boolean) => void;
  onSave: (route: WorkflowBranchRoutePayload) => void;
};

type FormStepDialogTab = "contract" | "fields" | "guidance";
type WorkflowContextFactDialogTab = "contract" | "value-semantics" | "guidance";
type InvokeStepDialogTab = "contract" | "target" | "bindings" | "guidance";
type BranchStepDialogTab = "contract" | "routes" | "guidance";

type InvokeBindingDraft = {
  localId: string;
  destinationKind: "work_unit_fact" | "artifact_slot";
  destinationDefinitionId: string;
  sourceKind: "context_fact" | "literal" | "runtime";
  contextFactDefinitionId: string;
  literalValue: string;
};

type InvokeActivationTransitionDraft = {
  localId: string;
  transitionId: string;
  workflowDefinitionIds: string[];
};

type InvokeStepDialogSnapshot = {
  contract: {
    key: string;
    label: string;
    descriptionMarkdown: string;
  };
  target: {
    targetKind: WorkflowInvokeStepPayload["targetKind"];
    sourceMode: WorkflowInvokeStepPayload["sourceMode"];
    workflowDefinitionIds: string[];
    workUnitDefinitionId: string;
    contextFactDefinitionId: string;
  };
  bindings: {
    bindings: Array<Omit<InvokeBindingDraft, "localId">>;
    activationTransitions: Array<Omit<InvokeActivationTransitionDraft, "localId">>;
  };
  guidance: WorkflowEditorGuidance;
};

type BranchStepDialogSnapshot = {
  contract: {
    key: string;
    label: string;
    descriptionMarkdown: string;
    defaultTargetStepId: string | null;
  };
  routes: {
    routes: WorkflowBranchRoutePayload[];
  };
  guidance: WorkflowEditorGuidance;
};

type RouteDialogSnapshot = {
  targetStepId: string;
  conditionMode: "all" | "any";
  groups: WorkflowBranchRouteGroupPayload[];
};

type InvokeBindingDestinationOption = {
  kind: "work_unit_fact" | "artifact_slot";
  definitionId: string;
  label: string;
  key: string;
  cardinality: "one" | "many";
  factType?: WorkflowInvokeWorkUnitFactDefinition["factType"];
  validationJson?: unknown;
  summary: string;
  literalAllowed: boolean;
};

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
const JSON_SUB_SCHEMA_VALUE_TYPE_OPTIONS = ["string", "number", "boolean"] as const;

type JsonSubSchemaDraft = {
  localId: string;
  displayName: string;
  key: string;
  valueType: (typeof JSON_SUB_SCHEMA_VALUE_TYPE_OPTIONS)[number];
  stringValidationType: PlainStringValidationType;
  stringAllowedValues: string[];
  pendingStringAllowedValueTag: string;
  stringPathKind: "file" | "directory";
  stringTrimWhitespace: boolean;
  stringDisallowAbsolute: boolean;
  stringPreventTraversal: boolean;
};

type PlainStringValidationType = "none" | "path" | "allowed-values";

type WorkUnitDraftFactCard = {
  localId: string;
  factDefinitionId: string;
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
    workUnitDefinitionId: string;
    selectedWorkUnitFactDefinitionIds: string[];
    selectedArtifactSlotDefinitionIds: string[];
    plainStringDefaultValue: string;
    plainStringValidationType: PlainStringValidationType;
    plainStringPathKind: "file" | "directory";
    plainStringTrimWhitespace: boolean;
    plainStringDisallowAbsolute: boolean;
    plainStringPreventTraversal: boolean;
    pendingAllowedValueTag: string;
    allowedValueTags: string[];
    jsonSubSchemaDrafts: Array<Omit<JsonSubSchemaDraft, "localId">>;
    pendingIncludedFactDefinitionId: string;
  };
  guidance: WorkflowEditorGuidance;
};

type FormStepDialogSnapshot = {
  contract: {
    stepKey: string;
    label: string;
    descriptionMarkdown: string;
  };
  fields: {
    fieldDrafts: Array<Omit<WorkflowEditorFieldDraft, "localId">>;
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
    workUnitDefinitionId: fact?.workUnitDefinitionId ?? fact?.workUnitTypeKey ?? "",
    selectedWorkUnitFactDefinitionIds:
      fact?.selectedWorkUnitFactDefinitionIds ?? fact?.includedFactDefinitionIds ?? [],
    selectedArtifactSlotDefinitionIds: fact?.selectedArtifactSlotDefinitionIds ?? [],
    workUnitTypeKey: fact?.workUnitTypeKey ?? "",
    includedFactDefinitionIds: fact?.includedFactDefinitionIds ?? [],
    validationJson: fact?.validationJson,
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
  pendingAllowedValueTag: string;
  allowedValueTags: readonly string[];
  jsonSubSchemaDrafts: readonly JsonSubSchemaDraft[];
  pendingIncludedFactDefinitionId: string;
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
      workUnitDefinitionId: params.draft.workUnitDefinitionId ?? params.draft.workUnitTypeKey ?? "",
      selectedWorkUnitFactDefinitionIds: params.draftSpecCards.map(
        (entry) => entry.factDefinitionId,
      ),
      selectedArtifactSlotDefinitionIds: [...params.draft.selectedArtifactSlotDefinitionIds],
      plainStringDefaultValue: params.plainStringDefaultValue,
      plainStringValidationType: params.plainStringValidationType,
      plainStringPathKind: params.plainStringPathKind,
      plainStringTrimWhitespace: params.plainStringTrimWhitespace,
      plainStringDisallowAbsolute: params.plainStringDisallowAbsolute,
      plainStringPreventTraversal: params.plainStringPreventTraversal,
      pendingAllowedValueTag: params.pendingAllowedValueTag,
      allowedValueTags: [...params.allowedValueTags],
      jsonSubSchemaDrafts: params.jsonSubSchemaDrafts.map(({ localId: _localId, ...entry }) => ({
        ...entry,
      })),
      pendingIncludedFactDefinitionId: params.pendingIncludedFactDefinitionId,
    },
    guidance: {
      humanMarkdown: params.draft.guidance.humanMarkdown,
      agentMarkdown: params.draft.guidance.agentMarkdown,
    },
  };
}

function toFormStepDialogSnapshot(params: {
  stepKey: string;
  label: string;
  descriptionMarkdown: string;
  fieldDrafts: readonly WorkflowEditorFieldDraft[];
  guidance: WorkflowEditorGuidance;
}): FormStepDialogSnapshot {
  return {
    contract: {
      stepKey: params.stepKey,
      label: params.label,
      descriptionMarkdown: params.descriptionMarkdown,
    },
    fields: {
      fieldDrafts: params.fieldDrafts.map(({ localId: _localId, ...field }) => ({
        ...field,
      })),
    },
    guidance: {
      humanMarkdown: params.guidance.humanMarkdown,
      agentMarkdown: params.guidance.agentMarkdown,
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
      return fact.workUnitDefinitionId?.trim() || fact.workUnitTypeKey?.trim()
        ? `${lead} · ${(fact.workUnitDefinitionId ?? fact.workUnitTypeKey ?? "").trim()}`
        : lead;
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
    valueType: "string",
    stringValidationType: "none",
    stringAllowedValues: [],
    pendingStringAllowedValueTag: "",
    stringPathKind: "file",
    stringTrimWhitespace: true,
    stringDisallowAbsolute: true,
    stringPreventTraversal: true,
  };
}

function toStringValidationState(validationJson: unknown): {
  kind: PlainStringValidationType;
  pathKind: "file" | "directory";
  trimWhitespace: boolean;
  disallowAbsolute: boolean;
  preventTraversal: boolean;
  allowedValues: string[];
} {
  const base = {
    kind: "none" as PlainStringValidationType,
    pathKind: "file" as const,
    trimWhitespace: true,
    disallowAbsolute: true,
    preventTraversal: true,
    allowedValues: [] as string[],
  };

  if (typeof validationJson !== "object" || validationJson === null) {
    return base;
  }

  const kind = "kind" in validationJson ? (validationJson as { kind?: unknown }).kind : undefined;
  if (kind === "allowed-values") {
    const values =
      "values" in validationJson && Array.isArray((validationJson as { values?: unknown }).values)
        ? (validationJson as { values: unknown[] }).values
            .filter((entry): entry is string => typeof entry === "string")
            .map((entry) => entry.trim())
            .filter((entry) => entry.length > 0)
        : [];

    return {
      ...base,
      kind: "allowed-values",
      allowedValues: values,
    };
  }

  if (kind !== "path") {
    return base;
  }

  const pathKind =
    "pathKind" in validationJson ? (validationJson as { pathKind?: unknown }).pathKind : undefined;
  const normalization =
    "normalization" in validationJson
      ? (validationJson as { normalization?: unknown }).normalization
      : undefined;
  const safety =
    "safety" in validationJson ? (validationJson as { safety?: unknown }).safety : undefined;

  const trimWhitespace =
    typeof normalization === "object" &&
    normalization !== null &&
    "trimWhitespace" in normalization &&
    typeof (normalization as { trimWhitespace?: unknown }).trimWhitespace === "boolean"
      ? (normalization as { trimWhitespace: boolean }).trimWhitespace
      : true;
  const disallowAbsolute =
    typeof safety === "object" &&
    safety !== null &&
    "disallowAbsolute" in safety &&
    typeof (safety as { disallowAbsolute?: unknown }).disallowAbsolute === "boolean"
      ? (safety as { disallowAbsolute: boolean }).disallowAbsolute
      : true;
  const preventTraversal =
    typeof safety === "object" &&
    safety !== null &&
    "preventTraversal" in safety &&
    typeof (safety as { preventTraversal?: unknown }).preventTraversal === "boolean"
      ? (safety as { preventTraversal: boolean }).preventTraversal
      : true;

  return {
    ...base,
    kind: "path",
    pathKind: pathKind === "directory" ? "directory" : "file",
    trimWhitespace,
    disallowAbsolute,
    preventTraversal,
  };
}

function toJsonSubSchemaDraftsFromValidation(validationJson: unknown): JsonSubSchemaDraft[] {
  if (typeof validationJson !== "object" || validationJson === null) {
    return [];
  }

  const kind = "kind" in validationJson ? (validationJson as { kind?: unknown }).kind : undefined;
  const subSchema =
    "subSchema" in validationJson
      ? (validationJson as { subSchema?: unknown }).subSchema
      : undefined;
  if (kind !== "json-schema" || typeof subSchema !== "object" || subSchema === null) {
    return [];
  }

  const fields =
    "fields" in subSchema && Array.isArray((subSchema as { fields?: unknown }).fields)
      ? ((subSchema as { fields: unknown[] }).fields ?? [])
      : [];

  return fields
    .map((field, index) => {
      if (typeof field !== "object" || field === null) {
        return null;
      }

      const key = "key" in field ? (field as { key?: unknown }).key : undefined;
      const type = "type" in field ? (field as { type?: unknown }).type : undefined;
      if (typeof key !== "string" || key.trim().length === 0) {
        return null;
      }

      const valueType =
        type === "string" || type === "number" || type === "boolean" ? type : "string";
      const displayName =
        "displayName" in field ? (field as { displayName?: unknown }).displayName : undefined;
      const validation =
        "validation" in field ? (field as { validation?: unknown }).validation : undefined;
      const stringValidation = toStringValidationState(validation);

      return {
        localId: createLocalId(`json-sub-schema-${index + 1}`),
        key,
        valueType,
        displayName: typeof displayName === "string" ? displayName : "",
        stringValidationType: stringValidation.kind,
        stringAllowedValues: stringValidation.allowedValues,
        pendingStringAllowedValueTag: "",
        stringPathKind: stringValidation.pathKind,
        stringTrimWhitespace: stringValidation.trimWhitespace,
        stringDisallowAbsolute: stringValidation.disallowAbsolute,
        stringPreventTraversal: stringValidation.preventTraversal,
      } satisfies JsonSubSchemaDraft;
    })
    .filter((entry): entry is JsonSubSchemaDraft => entry !== null);
}

function buildJsonSubSchemaStringValidation(entry: JsonSubSchemaDraft): unknown {
  if (entry.valueType !== "string") {
    return undefined;
  }

  if (entry.stringValidationType === "path") {
    return {
      kind: "path",
      pathKind: entry.stringPathKind,
      normalization: {
        mode: "posix",
        trimWhitespace: entry.stringTrimWhitespace,
      },
      safety: {
        disallowAbsolute: entry.stringDisallowAbsolute,
        preventTraversal: entry.stringPreventTraversal,
      },
    };
  }

  if (entry.stringValidationType === "allowed-values") {
    const values = entry.stringAllowedValues;

    return values.length > 0
      ? {
          kind: "allowed-values",
          values,
        }
      : undefined;
  }

  return undefined;
}

function buildPlainValueValidationJson(params: {
  valueType: "string" | "number" | "boolean" | "json";
  plainStringValidationType: PlainStringValidationType;
  plainStringPathKind: "file" | "directory";
  plainStringTrimWhitespace: boolean;
  plainStringDisallowAbsolute: boolean;
  plainStringPreventTraversal: boolean;
  allowedValueTags: readonly string[];
  jsonSubSchemaDrafts: readonly JsonSubSchemaDraft[];
}) {
  if (params.valueType === "string") {
    if (params.plainStringValidationType === "allowed-values") {
      const values = params.allowedValueTags
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
      return values.length > 0
        ? {
            kind: "allowed-values" as const,
            values,
          }
        : undefined;
    }

    if (params.plainStringValidationType === "path") {
      return {
        kind: "path" as const,
        pathKind: params.plainStringPathKind,
        normalization: {
          mode: "posix" as const,
          trimWhitespace: params.plainStringTrimWhitespace,
        },
        safety: {
          disallowAbsolute: params.plainStringDisallowAbsolute,
          preventTraversal: params.plainStringPreventTraversal,
        },
      };
    }

    return undefined;
  }

  if (params.valueType !== "json") {
    return undefined;
  }

  const fields = params.jsonSubSchemaDrafts
    .map((entry) => {
      const key = entry.key.trim();
      if (key.length === 0) {
        return null;
      }

      return {
        key,
        ...(entry.displayName.trim().length > 0 ? { displayName: entry.displayName.trim() } : {}),
        type: entry.valueType,
        cardinality: "one" as const,
        ...(typeof buildJsonSubSchemaStringValidation(entry) === "undefined"
          ? {}
          : { validation: buildJsonSubSchemaStringValidation(entry) }),
      };
    })
    .filter(
      (
        entry,
      ): entry is {
        key: string;
        displayName?: string;
        type: "string" | "number" | "boolean";
        cardinality: "one";
        validation?: unknown;
      } => entry !== null,
    );

  const properties = Object.fromEntries(fields.map((entry) => [entry.key, { type: entry.type }]));

  return {
    kind: "json-schema" as const,
    schemaDialect: "draft-2020-12",
    schema: {
      type: "object",
      additionalProperties: false,
      properties,
    },
    subSchema: {
      type: "object" as const,
      fields,
    },
  };
}

function createWorkUnitDraftFactCard(
  factDefinitionId: string,
  workUnitFacts: readonly WorkflowEditorPickerOption[],
): WorkUnitDraftFactCard {
  const matchedOption = workUnitFacts.find((option) => option.value === factDefinitionId);

  return {
    localId: createLocalId("draft-spec-fact"),
    factDefinitionId,
    factKey: matchedOption?.secondaryLabel ?? factDefinitionId,
    displayName: matchedOption?.label ?? titleizeKey(factDefinitionId),
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
  const selectedOption = props.options.find(
    (option) => option.value === props.value || option.secondaryLabel === props.value,
  );

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
                  disabled={option.disabled}
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
                      {option.disabledReason ? (
                        <span className="truncate text-[0.68rem] uppercase tracking-[0.08em] text-amber-300/90">
                          {option.disabledReason}
                        </span>
                      ) : null}
                    </div>
                    {props.value === option.value || props.value === option.secondaryLabel ? (
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
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={props.active ? "default" : "outline"}
      className="rounded-none"
      onClick={props.onClick}
      disabled={props.disabled}
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

function createEmptyInvokeBindingDraft(): InvokeBindingDraft {
  return {
    localId: createLocalId("invoke-binding"),
    destinationKind: "work_unit_fact",
    destinationDefinitionId: "",
    sourceKind: "context_fact",
    contextFactDefinitionId: "",
    literalValue: "",
  };
}

const INVOKE_BINDING_SOURCE_OPTIONS = [
  {
    value: "context_fact",
    label: "Context Fact",
    description: "Read from a compatible workflow context fact.",
  },
  {
    value: "literal",
    label: "Literal",
    description: "Provide a fixed literal value inline.",
  },
  {
    value: "runtime",
    label: "Runtime",
    description: "Value will be supplied when the project runs.",
  },
] as const;

function isLiteralCapableFactDefinition(
  definition: Pick<
    WorkflowInvokeWorkUnitFactDefinition,
    "factType" | "cardinality" | "validationJson"
  >,
) {
  if (definition.cardinality !== "one") {
    return false;
  }

  if (
    definition.factType !== "string" &&
    definition.factType !== "number" &&
    definition.factType !== "boolean"
  ) {
    return false;
  }

  return !(
    typeof definition.validationJson === "object" &&
    definition.validationJson !== null &&
    "kind" in definition.validationJson &&
    definition.validationJson.kind === "path"
  );
}

function getContextFactValueType(
  fact: WorkflowContextFactDefinitionItem,
): WorkflowInvokeWorkUnitFactDefinition["factType"] | "artifact_reference" | null {
  switch (fact.kind) {
    case "plain_value_fact":
      return fact.valueType ?? "string";
    case "definition_backed_external_fact":
    case "bound_external_fact":
      return fact.valueType ?? null;
    case "artifact_reference_fact":
      return "artifact_reference";
    default:
      return null;
  }
}

function isContextFactCompatibleWithDestination(
  fact: WorkflowContextFactDefinitionItem,
  destination: InvokeBindingDestinationOption | undefined,
) {
  if (!destination || fact.cardinality !== destination.cardinality) {
    return false;
  }

  if (destination.kind === "artifact_slot") {
    return fact.kind === "artifact_reference_fact";
  }

  return getContextFactValueType(fact) === (destination.factType ?? null);
}

function createEmptyInvokeActivationTransitionDraft(): InvokeActivationTransitionDraft {
  return {
    localId: createLocalId("invoke-activation-transition"),
    transitionId: "",
    workflowDefinitionIds: [],
  };
}

function toInvokeGuidance(
  guidance?: WorkflowInvokeStepPayload["guidance"],
): WorkflowEditorGuidance {
  return {
    humanMarkdown: guidance?.human?.markdown ?? "",
    agentMarkdown: guidance?.agent?.markdown ?? "",
  };
}

function toInvokeBindingDrafts(
  payload: WorkflowInvokeStepPayload | undefined,
): InvokeBindingDraft[] {
  if (!payload || payload.targetKind !== "work_unit") {
    return [];
  }

  return payload.bindings.map((binding) => ({
    localId: createLocalId("invoke-binding"),
    destinationKind: binding.destination.kind,
    destinationDefinitionId:
      binding.destination.kind === "work_unit_fact"
        ? binding.destination.workUnitFactDefinitionId
        : binding.destination.artifactSlotDefinitionId,
    sourceKind: binding.source.kind,
    contextFactDefinitionId:
      binding.source.kind === "context_fact" ? binding.source.contextFactDefinitionId : "",
    literalValue:
      binding.source.kind === "literal"
        ? String(binding.source.value)
        : binding.source.kind === "runtime"
          ? ""
          : "",
  }));
}

function toInvokeActivationTransitionDrafts(
  payload: WorkflowInvokeStepPayload | undefined,
): InvokeActivationTransitionDraft[] {
  if (!payload || payload.targetKind !== "work_unit") {
    return [];
  }

  return payload.activationTransitions.map((transition) => ({
    localId: createLocalId("invoke-activation-transition"),
    transitionId: transition.transitionId,
    workflowDefinitionIds: [...transition.workflowDefinitionIds],
  }));
}

function toInvokeStepDialogSnapshot(params: {
  key: string;
  label: string;
  descriptionMarkdown: string;
  targetKind: WorkflowInvokeStepPayload["targetKind"];
  sourceMode: WorkflowInvokeStepPayload["sourceMode"];
  workflowDefinitionIds: readonly string[];
  workUnitDefinitionId: string;
  contextFactDefinitionId: string;
  bindings: readonly InvokeBindingDraft[];
  activationTransitions: readonly InvokeActivationTransitionDraft[];
  guidance: WorkflowEditorGuidance;
}): InvokeStepDialogSnapshot {
  return {
    contract: {
      key: params.key,
      label: params.label,
      descriptionMarkdown: params.descriptionMarkdown,
    },
    target: {
      targetKind: params.targetKind,
      sourceMode: params.sourceMode,
      workflowDefinitionIds: [...params.workflowDefinitionIds],
      workUnitDefinitionId: params.workUnitDefinitionId,
      contextFactDefinitionId: params.contextFactDefinitionId,
    },
    bindings: {
      bindings: params.bindings.map(({ localId: _localId, ...binding }) => ({ ...binding })),
      activationTransitions: params.activationTransitions.map(
        ({ localId: _localId, ...transition }) => ({
          ...transition,
          workflowDefinitionIds: [...transition.workflowDefinitionIds],
        }),
      ),
    },
    guidance: {
      humanMarkdown: params.guidance.humanMarkdown,
      agentMarkdown: params.guidance.agentMarkdown,
    },
  };
}

function toWorkflowInvokePayload(params: {
  key: string;
  label: string;
  descriptionMarkdown: string;
  targetKind: WorkflowInvokeStepPayload["targetKind"];
  sourceMode: WorkflowInvokeStepPayload["sourceMode"];
  workflowDefinitionIds: readonly string[];
  workUnitDefinitionId: string;
  contextFactDefinitionId: string;
  bindings: readonly InvokeBindingDraft[];
  bindingDestinationsByKey: ReadonlyMap<string, InvokeBindingDestinationOption>;
  activationTransitions: readonly InvokeActivationTransitionDraft[];
  guidance: WorkflowEditorGuidance;
}): WorkflowInvokeStepPayload {
  const normalizedKey = params.key.trim();
  const normalizedLabel = params.label.trim();
  const normalizedDescription = params.descriptionMarkdown.trim();
  const normalizedGuidance = {
    human: { markdown: params.guidance.humanMarkdown.trim() },
    agent: { markdown: params.guidance.agentMarkdown.trim() },
  };
  const base = {
    key: normalizedKey,
    ...(normalizedLabel.length > 0 ? { label: normalizedLabel } : {}),
    ...(normalizedDescription.length > 0
      ? { descriptionJson: { markdown: normalizedDescription } }
      : {}),
    guidance: normalizedGuidance,
  };

  if (params.targetKind === "workflow" && params.sourceMode === "fixed_set") {
    return {
      ...base,
      targetKind: "workflow",
      sourceMode: "fixed_set",
      workflowDefinitionIds: params.workflowDefinitionIds
        .map((workflowDefinitionId) => workflowDefinitionId.trim())
        .filter((workflowDefinitionId) => workflowDefinitionId.length > 0),
    };
  }

  if (params.targetKind === "workflow") {
    return {
      ...base,
      targetKind: "workflow",
      sourceMode: "context_fact_backed",
      contextFactDefinitionId: params.contextFactDefinitionId.trim(),
    };
  }

  const bindings = params.bindings.map(({ localId: _localId, ...binding }) => {
    const destinationKey = `${binding.destinationKind}:${binding.destinationDefinitionId.trim()}`;
    const destinationDefinition = params.bindingDestinationsByKey.get(destinationKey);
    const literalValue =
      destinationDefinition?.factType === "number"
        ? Number(binding.literalValue)
        : destinationDefinition?.factType === "boolean"
          ? binding.literalValue === "true"
          : binding.literalValue;

    return {
      destination:
        binding.destinationKind === "work_unit_fact"
          ? {
              kind: "work_unit_fact" as const,
              workUnitFactDefinitionId: binding.destinationDefinitionId.trim(),
            }
          : {
              kind: "artifact_slot" as const,
              artifactSlotDefinitionId: binding.destinationDefinitionId.trim(),
            },
      source:
        binding.sourceKind === "context_fact"
          ? {
              kind: "context_fact" as const,
              contextFactDefinitionId: binding.contextFactDefinitionId.trim(),
            }
          : binding.sourceKind === "literal"
            ? { kind: "literal" as const, value: literalValue }
            : { kind: "runtime" as const },
    };
  });
  const activationTransitions = params.activationTransitions.map(
    ({ localId: _localId, ...transition }) => ({
      transitionId: transition.transitionId.trim(),
      workflowDefinitionIds: transition.workflowDefinitionIds
        .map((workflowDefinitionId) => workflowDefinitionId.trim())
        .filter((workflowDefinitionId) => workflowDefinitionId.length > 0),
    }),
  );

  if (params.sourceMode === "fixed_set") {
    return {
      ...base,
      targetKind: "work_unit",
      sourceMode: "fixed_set",
      workUnitDefinitionId: params.workUnitDefinitionId.trim(),
      bindings,
      activationTransitions,
    };
  }

  return {
    ...base,
    targetKind: "work_unit",
    sourceMode: "context_fact_backed",
    contextFactDefinitionId: params.contextFactDefinitionId.trim(),
    bindings,
    activationTransitions,
  };
}

export function InvokeStepDialog({
  open,
  mode,
  step,
  availableWorkflows,
  availableWorkUnits,
  availableTransitions,
  availableContextFacts,
  workUnitFactsQueryScope,
  loadWorkUnitFacts,
  loadWorkUnitArtifactSlots,
  loadWorkUnitTransitions,
  loadWorkUnitWorkflows,
  loadTransitionBoundWorkflowKeys,
  onOpenChange,
  onSave,
  onDelete,
}: InvokeStepDialogProps) {
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [descriptionMarkdown, setDescriptionMarkdown] = useState("");
  const [targetKind, setTargetKind] = useState<WorkflowInvokeStepPayload["targetKind"]>("workflow");
  const [sourceMode, setSourceMode] =
    useState<WorkflowInvokeStepPayload["sourceMode"]>("fixed_set");
  const [workflowDefinitionIds, setWorkflowDefinitionIds] = useState<string[]>([]);
  const [workUnitDefinitionId, setWorkUnitDefinitionId] = useState("");
  const [contextFactDefinitionId, setContextFactDefinitionId] = useState("");
  const [bindings, setBindings] = useState<InvokeBindingDraft[]>([]);
  const [activationTransitions, setActivationTransitions] = useState<
    InvokeActivationTransitionDraft[]
  >([]);
  const [guidance, setGuidance] = useState<WorkflowEditorGuidance>(normalizeGuidance());
  const [initialSnapshot, setInitialSnapshot] = useState<InvokeStepDialogSnapshot | null>(null);
  const [activeTab, setActiveTab] = useState<InvokeStepDialogTab>("contract");
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [boundWorkflowKeysByTransition, setBoundWorkflowKeysByTransition] = useState<
    Record<string, readonly string[]>
  >({});

  const invokeStep = step?.stepType === "invoke" ? step : undefined;
  const contextFactsById = useMemo(
    () => new Map(availableContextFacts.map((fact) => [fact.contextFactDefinitionId, fact])),
    [availableContextFacts],
  );
  const workflowReferenceFactOptions = useMemo(
    () =>
      availableContextFacts
        .filter((fact) => fact.kind === "workflow_reference_fact")
        .map((fact) => ({
          value: fact.contextFactDefinitionId,
          label: fact.label || fact.key,
          secondaryLabel: fact.key,
          description: fact.summary,
        })),
    [availableContextFacts],
  );
  const workUnitDraftSpecFactOptions = useMemo(
    () =>
      availableContextFacts
        .filter((fact) => fact.kind === "work_unit_draft_spec_fact")
        .map((fact) => ({
          value: fact.contextFactDefinitionId,
          label: fact.label || fact.key,
          secondaryLabel: fact.key,
          description: fact.summary,
        })),
    [availableContextFacts],
  );
  const bindingContextFactOptions = useMemo(
    () =>
      availableContextFacts.map((fact) => ({
        value: fact.contextFactDefinitionId,
        label: fact.label || fact.key,
        secondaryLabel: fact.key,
        description: fact.summary,
      })),
    [availableContextFacts],
  );
  const selectedContextFact = contextFactsById.get(contextFactDefinitionId);
  const selectedBindingWorkUnitDefinitionId =
    targetKind !== "work_unit"
      ? ""
      : sourceMode === "fixed_set"
        ? workUnitDefinitionId.trim()
        : selectedContextFact?.kind === "work_unit_draft_spec_fact"
          ? (selectedContextFact.workUnitDefinitionId?.trim() ?? "")
          : "";
  const bindingWorkUnitFactsQuery = useQuery({
    queryKey: [
      "workflow-editor",
      "invoke-binding-work-unit-facts",
      workUnitFactsQueryScope,
      selectedBindingWorkUnitDefinitionId,
    ],
    queryFn: async () => loadWorkUnitFacts(selectedBindingWorkUnitDefinitionId),
    enabled: open && targetKind === "work_unit" && selectedBindingWorkUnitDefinitionId.length > 0,
  });
  const bindingArtifactSlotsQuery = useQuery({
    queryKey: [
      "workflow-editor",
      "invoke-binding-artifact-slots",
      workUnitFactsQueryScope,
      selectedBindingWorkUnitDefinitionId,
    ],
    queryFn: async () => loadWorkUnitArtifactSlots(selectedBindingWorkUnitDefinitionId),
    enabled: open && targetKind === "work_unit" && selectedBindingWorkUnitDefinitionId.length > 0,
  });
  const bindingTransitionsQuery = useQuery({
    queryKey: [
      "workflow-editor",
      "invoke-binding-transitions",
      workUnitFactsQueryScope,
      selectedBindingWorkUnitDefinitionId,
    ],
    queryFn: async () => {
      if (loadWorkUnitTransitions) {
        return loadWorkUnitTransitions(selectedBindingWorkUnitDefinitionId);
      }

      return availableTransitions;
    },
    enabled: open && targetKind === "work_unit" && selectedBindingWorkUnitDefinitionId.length > 0,
  });
  const bindingWorkflowsQuery = useQuery({
    queryKey: [
      "workflow-editor",
      "invoke-binding-workflows",
      workUnitFactsQueryScope,
      selectedBindingWorkUnitDefinitionId,
    ],
    queryFn: async () => {
      if (loadWorkUnitWorkflows) {
        return loadWorkUnitWorkflows(selectedBindingWorkUnitDefinitionId);
      }

      return availableWorkflows;
    },
    enabled: open && targetKind === "work_unit" && selectedBindingWorkUnitDefinitionId.length > 0,
  });
  const availableBindingDestinations = useMemo(() => {
    const selectedDraftSpecFact =
      sourceMode === "context_fact_backed" &&
      selectedContextFact?.kind === "work_unit_draft_spec_fact"
        ? selectedContextFact
        : null;
    const selectedFactIds = new Set(selectedDraftSpecFact?.selectedWorkUnitFactDefinitionIds ?? []);
    const selectedArtifactIds = new Set(
      selectedDraftSpecFact?.selectedArtifactSlotDefinitionIds ?? [],
    );

    const factDestinations = (bindingWorkUnitFactsQuery.data ?? [])
      .filter(
        (definition) => sourceMode !== "context_fact_backed" || selectedFactIds.has(definition.id),
      )
      .map(
        (definition) =>
          ({
            kind: "work_unit_fact",
            definitionId: definition.id,
            label: definition.label,
            key: definition.key,
            cardinality: definition.cardinality,
            factType: definition.factType,
            validationJson: definition.validationJson,
            summary: `work unit fact · ${definition.factType} · ${definition.cardinality}`,
            literalAllowed: isLiteralCapableFactDefinition(definition),
          }) satisfies InvokeBindingDestinationOption,
      );
    const artifactDestinations = (bindingArtifactSlotsQuery.data ?? [])
      .filter(
        (definition) =>
          sourceMode !== "context_fact_backed" || selectedArtifactIds.has(definition.id),
      )
      .map(
        (definition) =>
          ({
            kind: "artifact_slot",
            definitionId: definition.id,
            label: definition.label,
            key: definition.key,
            cardinality: definition.cardinality === "fileset" ? "many" : "one",
            summary: `artifact slot · ${definition.cardinality}`,
            literalAllowed: false,
          }) satisfies InvokeBindingDestinationOption,
      );

    return [...factDestinations, ...artifactDestinations];
  }, [
    bindingArtifactSlotsQuery.data,
    bindingWorkUnitFactsQuery.data,
    selectedContextFact,
    sourceMode,
  ]);
  const bindingDestinationsByKey = useMemo(
    () =>
      new Map(
        availableBindingDestinations.map((destination) => [
          `${destination.kind}:${destination.definitionId}`,
          destination,
        ]),
      ),
    [availableBindingDestinations],
  );
  const bindingDestinationOptions = useMemo(
    () =>
      availableBindingDestinations.map((destination) => ({
        value: `${destination.kind}:${destination.definitionId}`,
        label: destination.label,
        secondaryLabel: destination.key,
        description: destination.summary,
      })),
    [availableBindingDestinations],
  );
  const availableInvokeTransitionOptions = useMemo(
    () => bindingTransitionsQuery.data ?? availableTransitions,
    [availableTransitions, bindingTransitionsQuery.data],
  );
  const availableInvokeWorkflowOptions = useMemo(
    () => bindingWorkflowsQuery.data ?? availableWorkflows,
    [availableWorkflows, bindingWorkflowsQuery.data],
  );

  useEffect(() => {
    if (!open) {
      setIsDiscardDialogOpen(false);
      setIsDeleteDialogOpen(false);
      setStatusMessage(null);
      return;
    }

    const payload = invokeStep?.payload;
    const nextKey = payload?.key ?? "";
    const nextLabel = payload?.label ?? "";
    const nextDescriptionMarkdown = payload?.descriptionJson?.markdown ?? "";
    const nextTargetKind = payload?.targetKind ?? "workflow";
    const nextSourceMode = payload?.sourceMode ?? "fixed_set";
    const nextWorkflowDefinitionIds =
      payload?.targetKind === "workflow" && payload.sourceMode === "fixed_set"
        ? [...payload.workflowDefinitionIds]
        : [];
    const nextWorkUnitDefinitionId =
      payload?.targetKind === "work_unit" && payload.sourceMode === "fixed_set"
        ? payload.workUnitDefinitionId
        : "";
    const nextContextFactDefinitionId =
      payload?.sourceMode === "context_fact_backed" ? payload.contextFactDefinitionId : "";
    const nextBindings = toInvokeBindingDrafts(payload);
    const nextActivationTransitions = toInvokeActivationTransitionDrafts(payload);
    const nextGuidance = toInvokeGuidance(payload?.guidance);

    setKey(nextKey);
    setLabel(nextLabel);
    setDescriptionMarkdown(nextDescriptionMarkdown);
    setTargetKind(nextTargetKind);
    setSourceMode(nextSourceMode);
    setWorkflowDefinitionIds(nextWorkflowDefinitionIds);
    setWorkUnitDefinitionId(nextWorkUnitDefinitionId);
    setContextFactDefinitionId(nextContextFactDefinitionId);
    setBindings(nextBindings);
    setActivationTransitions(nextActivationTransitions);
    setGuidance(nextGuidance);
    setInitialSnapshot(
      toInvokeStepDialogSnapshot({
        key: nextKey,
        label: nextLabel,
        descriptionMarkdown: nextDescriptionMarkdown,
        targetKind: nextTargetKind,
        sourceMode: nextSourceMode,
        workflowDefinitionIds: nextWorkflowDefinitionIds,
        workUnitDefinitionId: nextWorkUnitDefinitionId,
        contextFactDefinitionId: nextContextFactDefinitionId,
        bindings: nextBindings,
        activationTransitions: nextActivationTransitions,
        guidance: nextGuidance,
      }),
    );
    setActiveTab("contract");
    setIsDiscardDialogOpen(false);
    setIsDeleteDialogOpen(false);
    setStatusMessage(null);
  }, [invokeStep, open]);

  useEffect(() => {
    if (!open || targetKind !== "work_unit") {
      return;
    }

    setBindings((previous) =>
      previous.map((binding) => {
        const destination = bindingDestinationsByKey.get(
          `${binding.destinationKind}:${binding.destinationDefinitionId}`,
        );
        const compatibleSourceKinds = destination
          ? [
              "context_fact",
              ...(destination.literalAllowed ? (["literal"] as const) : []),
              "runtime",
            ]
          : (["context_fact", "runtime"] as const);
        const nextSourceKind = compatibleSourceKinds.includes(binding.sourceKind)
          ? binding.sourceKind
          : compatibleSourceKinds[0];
        const nextContextFactId =
          nextSourceKind === "context_fact" ? binding.contextFactDefinitionId : "";
        const nextLiteralValue = nextSourceKind === "literal" ? binding.literalValue : "";

        return nextSourceKind !== binding.sourceKind ||
          nextContextFactId !== binding.contextFactDefinitionId ||
          nextLiteralValue !== binding.literalValue
          ? {
              ...binding,
              sourceKind: nextSourceKind,
              contextFactDefinitionId: nextContextFactId,
              literalValue: nextLiteralValue,
            }
          : binding;
      }),
    );
  }, [bindingDestinationsByKey, open, targetKind]);

  useEffect(() => {
    if (
      !open ||
      targetKind !== "work_unit" ||
      selectedBindingWorkUnitDefinitionId.length === 0 ||
      !loadTransitionBoundWorkflowKeys
    ) {
      setBoundWorkflowKeysByTransition({});
      return;
    }

    const transitionIds = [
      ...new Set(
        activationTransitions
          .map((transition) => transition.transitionId.trim())
          .filter((transitionId) => transitionId.length > 0),
      ),
    ];
    if (transitionIds.length === 0) {
      setBoundWorkflowKeysByTransition({});
      return;
    }

    let cancelled = false;
    void Promise.all(
      transitionIds.map(async (transitionId) => {
        const workflowKeys = await loadTransitionBoundWorkflowKeys(
          selectedBindingWorkUnitDefinitionId,
          transitionId,
        );
        return [transitionId, [...workflowKeys]] as const;
      }),
    ).then((entries) => {
      if (cancelled) {
        return;
      }

      setBoundWorkflowKeysByTransition(
        Object.fromEntries(entries) as Record<string, readonly string[]>,
      );
    });

    return () => {
      cancelled = true;
    };
  }, [
    activationTransitions,
    loadTransitionBoundWorkflowKeys,
    open,
    selectedBindingWorkUnitDefinitionId,
    targetKind,
  ]);

  useEffect(() => {
    if (!open || targetKind !== "work_unit") {
      return;
    }

    setActivationTransitions((previous) => {
      let changed = false;
      const next = previous.map((transition) => {
        const transitionId = transition.transitionId.trim();
        if (transitionId.length === 0) {
          if (transition.workflowDefinitionIds.length > 0) {
            changed = true;
            return { ...transition, workflowDefinitionIds: [] };
          }

          return transition;
        }

        const boundWorkflowKeys = boundWorkflowKeysByTransition[transitionId];
        if (!boundWorkflowKeys) {
          return transition;
        }
        const allowedWorkflowValues = new Set(
          availableInvokeWorkflowOptions
            .filter((option) => {
              const workflowKey = option.secondaryLabel ?? option.value;
              return (
                boundWorkflowKeys.includes(workflowKey) || boundWorkflowKeys.includes(option.value)
              );
            })
            .map((option) => option.value),
        );
        const nextWorkflowDefinitionIds = transition.workflowDefinitionIds.filter((workflowId) =>
          allowedWorkflowValues.has(workflowId),
        );

        if (nextWorkflowDefinitionIds.length !== transition.workflowDefinitionIds.length) {
          changed = true;
          return { ...transition, workflowDefinitionIds: nextWorkflowDefinitionIds };
        }

        return transition;
      });

      return changed ? next : previous;
    });
  }, [availableInvokeWorkflowOptions, boundWorkflowKeysByTransition, open, targetKind]);

  const currentSnapshot = useMemo(
    () =>
      toInvokeStepDialogSnapshot({
        key,
        label,
        descriptionMarkdown,
        targetKind,
        sourceMode,
        workflowDefinitionIds,
        workUnitDefinitionId,
        contextFactDefinitionId,
        bindings,
        activationTransitions,
        guidance,
      }),
    [
      activationTransitions,
      bindings,
      contextFactDefinitionId,
      descriptionMarkdown,
      guidance,
      key,
      label,
      sourceMode,
      targetKind,
      workflowDefinitionIds,
      workUnitDefinitionId,
    ],
  );

  const isContractDirty =
    open && initialSnapshot
      ? !areDialogSnapshotSectionsEqual(currentSnapshot.contract, initialSnapshot.contract)
      : false;
  const isTargetDirty =
    open && initialSnapshot
      ? !areDialogSnapshotSectionsEqual(currentSnapshot.target, initialSnapshot.target)
      : false;
  const isBindingsDirty =
    open && initialSnapshot
      ? !areDialogSnapshotSectionsEqual(currentSnapshot.bindings, initialSnapshot.bindings)
      : false;
  const isGuidanceDirty =
    open && initialSnapshot
      ? !areDialogSnapshotSectionsEqual(currentSnapshot.guidance, initialSnapshot.guidance)
      : false;
  const isDialogDirty = isContractDirty || isTargetDirty || isBindingsDirty || isGuidanceDirty;

  useEffect(() => {
    if (!open) {
      return;
    }

    if (targetKind === "workflow" && activeTab === "bindings") {
      setActiveTab("target");
    }
  }, [activeTab, open, targetKind]);

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (key.trim().length === 0) {
      errors.push("Invoke step key is required.");
    }

    if (
      targetKind === "workflow" &&
      sourceMode === "fixed_set" &&
      workflowDefinitionIds.length === 0
    ) {
      errors.push("Select at least one workflow for workflow-target invoke.");
    }

    if (targetKind === "workflow" && sourceMode === "context_fact_backed") {
      if (contextFactDefinitionId.trim().length === 0) {
        errors.push("Select a workflow reference context fact.");
      } else if (selectedContextFact?.kind !== "workflow_reference_fact") {
        errors.push("Workflow-target invoke requires a workflow reference context fact.");
      }
    }

    if (
      targetKind === "work_unit" &&
      sourceMode === "fixed_set" &&
      workUnitDefinitionId.trim().length === 0
    ) {
      errors.push("Select a work unit for work-unit-target invoke.");
    }

    if (targetKind === "work_unit" && sourceMode === "context_fact_backed") {
      if (contextFactDefinitionId.trim().length === 0) {
        errors.push("Select a work-unit draft-spec context fact.");
      } else if (selectedContextFact?.kind !== "work_unit_draft_spec_fact") {
        errors.push("Work-unit-target invoke requires a work_unit_draft_spec_fact context fact.");
      }
    }

    if (targetKind === "work_unit") {
      bindings.forEach((binding, index) => {
        const destination = bindingDestinationsByKey.get(
          `${binding.destinationKind}:${binding.destinationDefinitionId.trim()}`,
        );
        if (binding.destinationDefinitionId.trim().length === 0 || !destination) {
          errors.push(`Complete invoke binding ${index + 1} before saving.`);
          return;
        }

        if (binding.sourceKind === "context_fact") {
          if (binding.contextFactDefinitionId.trim().length === 0) {
            errors.push(`Select a source context fact for invoke binding ${index + 1}.`);
            return;
          }

          const sourceFact = contextFactsById.get(binding.contextFactDefinitionId);
          if (!sourceFact || !isContextFactCompatibleWithDestination(sourceFact, destination)) {
            errors.push(`Invoke binding ${index + 1} has an incompatible source context fact.`);
          }
          return;
        }

        if (binding.sourceKind === "literal") {
          if (!destination.literalAllowed) {
            errors.push(`Invoke binding ${index + 1} does not allow literal values.`);
            return;
          }

          if (destination.factType === "number" && binding.literalValue.trim().length === 0) {
            errors.push(`Provide a numeric literal for invoke binding ${index + 1}.`);
            return;
          }

          if (destination.factType === "number" && Number.isNaN(Number(binding.literalValue))) {
            errors.push(`Invoke binding ${index + 1} requires a valid numeric literal.`);
          }
        }
      });

      const destinationKeys = bindings
        .map((binding) => `${binding.destinationKind}:${binding.destinationDefinitionId.trim()}`)
        .filter((key) => !key.endsWith(":"));
      if (new Set(destinationKeys).size !== destinationKeys.length) {
        errors.push("Each invoke destination can only be bound once.");
      }

      activationTransitions.forEach((transition, index) => {
        if (transition.transitionId.trim().length === 0) {
          errors.push(`Select a transition for activation transition ${index + 1}.`);
          return;
        }

        if (transition.workflowDefinitionIds.length === 0) {
          errors.push(`Select at least one workflow for activation transition ${index + 1}.`);
        }
      });

      const transitionIds = activationTransitions
        .map((transition) => transition.transitionId.trim())
        .filter((transitionId) => transitionId.length > 0);
      if (new Set(transitionIds).size !== transitionIds.length) {
        errors.push("Each activation transition can only be configured once.");
      }
    }

    return errors;
  }, [
    activationTransitions,
    bindings,
    bindingDestinationsByKey,
    contextFactDefinitionId,
    contextFactsById,
    key,
    selectedContextFact,
    sourceMode,
    targetKind,
    workflowDefinitionIds,
    workUnitDefinitionId,
  ]);

  const canSave = validationErrors.length === 0;
  const title =
    mode === "create" ? "Create Invoke Step" : `Edit Invoke Step: ${invokeStep?.payload.key ?? ""}`;

  const closeDialog = () => {
    setIsDiscardDialogOpen(false);
    setIsDeleteDialogOpen(false);
    onOpenChange(false);
  };

  const requestDeleteDialog = () => {
    if (!onDelete) {
      return;
    }

    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    setIsDeleteDialogOpen(false);
    void onDelete?.();
  };

  const requestCloseDialog = () => {
    if (isDialogDirty) {
      setIsDiscardDialogOpen(true);
      return;
    }

    closeDialog();
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
        <DialogContent className="chiron-cut-frame-thick flex w-[min(68rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] flex-col overflow-hidden p-6 sm:max-w-none sm:p-8">
          <form
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
            onSubmit={(event) => {
              event.preventDefault();
              if (!canSave) {
                setStatusMessage(validationErrors[0] ?? "Complete the invoke step configuration.");
                return;
              }

              setStatusMessage(null);
              void onSave(
                toWorkflowInvokePayload({
                  key,
                  label,
                  descriptionMarkdown,
                  targetKind,
                  sourceMode,
                  workflowDefinitionIds,
                  workUnitDefinitionId,
                  contextFactDefinitionId,
                  bindings,
                  bindingDestinationsByKey,
                  activationTransitions,
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
                Author invoke contract, target/source configuration, and audience guidance in one
                dialog.
              </DialogDescription>
              <div className="mt-1 flex flex-wrap gap-2 border-b border-border pb-3">
                <TabButton
                  active={activeTab === "contract"}
                  onClick={() => setActiveTab("contract")}
                  isDirty={isContractDirty}
                  dirtyIndicatorTestId="workflow-invoke-step-contract-modified-indicator"
                >
                  Contract
                </TabButton>
                <TabButton
                  active={activeTab === "target"}
                  onClick={() => setActiveTab("target")}
                  isDirty={isTargetDirty}
                  dirtyIndicatorTestId="workflow-invoke-step-target-modified-indicator"
                >
                  Target
                </TabButton>
                <TabButton
                  active={activeTab === "bindings"}
                  onClick={() => setActiveTab("bindings")}
                  isDirty={isBindingsDirty}
                  dirtyIndicatorTestId="workflow-invoke-step-bindings-modified-indicator"
                  disabled={targetKind === "workflow"}
                >
                  Bindings
                </TabButton>
                <TabButton
                  active={activeTab === "guidance"}
                  onClick={() => setActiveTab("guidance")}
                  isDirty={isGuidanceDirty}
                  dirtyIndicatorTestId="workflow-invoke-step-guidance-modified-indicator"
                >
                  Guidance
                </TabButton>
              </div>
            </DialogHeader>

            <div className="min-h-0 flex-1 overflow-y-auto py-4 pr-1 scrollbar-thin">
              {statusMessage ? (
                <p className="mb-4 border border-destructive/45 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {statusMessage}
                </p>
              ) : null}

              {!canSave ? (
                <p className="mb-4 border border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  {validationErrors[0]}
                </p>
              ) : null}

              {activeTab === "contract" ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="grid gap-2 lg:col-span-2">
                    <Label htmlFor="workflow-editor-invoke-step-key">Step Key</Label>
                    <Input
                      id="workflow-editor-invoke-step-key"
                      className="rounded-none border-border/70 bg-background/50"
                      value={key}
                      onChange={(event) => {
                        setKey(event.target.value);
                        setStatusMessage(null);
                      }}
                      placeholder="invoke-story-work"
                    />
                  </div>
                  <div className="grid gap-2 lg:col-span-2">
                    <Label htmlFor="workflow-editor-invoke-step-label">Step Title</Label>
                    <Input
                      id="workflow-editor-invoke-step-label"
                      className="rounded-none border-border/70 bg-background/50"
                      value={label}
                      onChange={(event) => {
                        setLabel(event.target.value);
                        setStatusMessage(null);
                      }}
                      placeholder="Invoke Story Work"
                    />
                  </div>
                  <div className="grid gap-2 lg:col-span-2">
                    <Label htmlFor="workflow-editor-invoke-step-description">
                      Step Description
                    </Label>
                    <Textarea
                      id="workflow-editor-invoke-step-description"
                      className="min-h-36 resize-none rounded-none border-border/70 bg-background/50"
                      value={descriptionMarkdown}
                      onChange={(event) => {
                        setDescriptionMarkdown(event.target.value);
                        setStatusMessage(null);
                      }}
                      placeholder="Markdown description for this Invoke step"
                    />
                  </div>
                </div>
              ) : null}

              {activeTab === "target" ? (
                <div className="grid gap-4">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="workflow-editor-invoke-target-kind">Target Kind</Label>
                      <Select
                        value={targetKind}
                        onValueChange={(value) => {
                          if (!value) {
                            return;
                          }
                          setTargetKind(value as WorkflowInvokeStepPayload["targetKind"]);
                          setStatusMessage(null);
                        }}
                      >
                        <SelectTrigger
                          id="workflow-editor-invoke-target-kind"
                          className="w-full rounded-none border-border/70 bg-background/50"
                        >
                          <SelectValue placeholder="Select target kind" />
                        </SelectTrigger>
                        <SelectContent className="rounded-none">
                          <SelectItem value="workflow">workflow</SelectItem>
                          <SelectItem value="work_unit">work_unit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="workflow-editor-invoke-source-mode">Source Mode</Label>
                      <Select
                        value={sourceMode}
                        onValueChange={(value) => {
                          if (!value) {
                            return;
                          }
                          setSourceMode(value as WorkflowInvokeStepPayload["sourceMode"]);
                          setStatusMessage(null);
                        }}
                      >
                        <SelectTrigger
                          id="workflow-editor-invoke-source-mode"
                          className="w-full rounded-none border-border/70 bg-background/50"
                        >
                          <SelectValue placeholder="Select source mode" />
                        </SelectTrigger>
                        <SelectContent className="rounded-none">
                          <SelectItem value="fixed_set">fixed_set</SelectItem>
                          <SelectItem value="context_fact_backed">context_fact_backed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {targetKind === "workflow" && sourceMode === "fixed_set" ? (
                    <div className="chiron-frame-flat chiron-tone-context grid gap-3 p-3">
                      <div className="grid gap-1">
                        <Label id="workflow-editor-invoke-workflow-definitions-label">
                          Workflow Definitions
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Select the workflow definitions that this invoke step can fan out to.
                        </p>
                      </div>
                      <SearchableMultiSelect
                        labelId="workflow-editor-invoke-workflow-definitions-label"
                        values={workflowDefinitionIds}
                        onChange={(values) => {
                          setWorkflowDefinitionIds(values);
                          setStatusMessage(null);
                        }}
                        options={availableWorkflows}
                        placeholder="Select workflows"
                        searchPlaceholder="Search workflows"
                        emptyLabel="No workflows found."
                        singularLabel="workflow"
                        pluralLabel="workflows"
                      />
                    </div>
                  ) : null}

                  {targetKind === "workflow" && sourceMode === "context_fact_backed" ? (
                    <div className="chiron-frame-flat chiron-tone-context grid gap-3 p-3">
                      <div className="grid gap-1">
                        <Label id="workflow-editor-invoke-workflow-context-fact-label">
                          Workflow Context Fact
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Select a workflow-reference fact that resolves the workflows at runtime.
                        </p>
                      </div>
                      <SearchableCombobox
                        labelId="workflow-editor-invoke-workflow-context-fact-label"
                        value={contextFactDefinitionId}
                        onChange={(value) => {
                          setContextFactDefinitionId(value);
                          setStatusMessage(null);
                        }}
                        options={workflowReferenceFactOptions}
                        placeholder="Select a workflow reference fact"
                        searchPlaceholder="Search workflow reference facts"
                        emptyLabel="No workflow reference facts available."
                      />
                    </div>
                  ) : null}

                  {targetKind === "work_unit" && sourceMode === "fixed_set" ? (
                    <div className="chiron-frame-flat chiron-tone-context grid gap-3 p-3">
                      <div className="grid gap-1">
                        <Label id="workflow-editor-invoke-work-unit-label">Work Unit</Label>
                        <p className="text-xs text-muted-foreground">
                          Select the authored work-unit definition that this invoke step activates.
                        </p>
                      </div>
                      <SearchableCombobox
                        labelId="workflow-editor-invoke-work-unit-label"
                        value={workUnitDefinitionId}
                        onChange={(value) => {
                          setWorkUnitDefinitionId(value);
                          setStatusMessage(null);
                        }}
                        options={availableWorkUnits}
                        placeholder="Select a work unit"
                        searchPlaceholder="Search work units"
                        emptyLabel="No work units found."
                      />
                    </div>
                  ) : null}

                  {targetKind === "work_unit" && sourceMode === "context_fact_backed" ? (
                    <div className="chiron-frame-flat chiron-tone-context grid gap-3 p-3">
                      <div className="grid gap-1">
                        <Label id="workflow-editor-invoke-work-unit-context-fact-label">
                          Workflow Context Fact
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Select a draft-spec fact that resolves the invoked work unit from context.
                        </p>
                      </div>
                      <SearchableCombobox
                        labelId="workflow-editor-invoke-work-unit-context-fact-label"
                        value={contextFactDefinitionId}
                        onChange={(value) => {
                          setContextFactDefinitionId(value);
                          setStatusMessage(null);
                        }}
                        options={workUnitDraftSpecFactOptions}
                        placeholder="Select a work-unit draft spec fact"
                        searchPlaceholder="Search work-unit draft spec facts"
                        emptyLabel="No work_unit_draft_spec_fact facts available."
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}

              {activeTab === "bindings" ? (
                targetKind === "workflow" ? (
                  <div className="chiron-frame-flat grid gap-2 border-amber-500/35 bg-amber-500/8 p-3 text-xs text-muted-foreground">
                    <p className="font-medium uppercase tracking-[0.12em] text-foreground">
                      Bindings Unavailable
                    </p>
                    <p>
                      Bindings are only available when Target Kind is <strong>work_unit</strong>.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    <section className="chiron-frame-flat chiron-tone-context grid gap-3 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="grid gap-1">
                          <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                            Work Unit Bindings
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Map values into the invoked work-unit facts and artifact slots.
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          className="rounded-none"
                          onClick={() => {
                            setBindings((previous) => [
                              ...previous,
                              createEmptyInvokeBindingDraft(),
                            ]);
                            setStatusMessage(null);
                          }}
                        >
                          <PlusIcon className="size-3" /> Add Binding
                        </Button>
                      </div>

                      {bindings.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          No invoke bindings authored yet.
                        </p>
                      ) : (
                        <div className="grid gap-3">
                          {bindings.map((binding, index) => {
                            const selectedDestination = bindingDestinationsByKey.get(
                              `${binding.destinationKind}:${binding.destinationDefinitionId}`,
                            );
                            const currentDestinationKey = `${binding.destinationKind}:${binding.destinationDefinitionId}`;
                            const alreadyBoundDestinationKeys = new Set(
                              bindings
                                .filter((entry) => entry.localId !== binding.localId)
                                .map(
                                  (entry) =>
                                    `${entry.destinationKind}:${entry.destinationDefinitionId.trim()}`,
                                )
                                .filter((entry) => !entry.endsWith(":")),
                            );
                            const destinationOptionsForBinding = bindingDestinationOptions.map(
                              (option) => {
                                const isAlreadyBound =
                                  option.value !== currentDestinationKey &&
                                  alreadyBoundDestinationKeys.has(option.value);
                                return isAlreadyBound
                                  ? {
                                      ...option,
                                      disabled: true,
                                      disabledReason: "Already bound in another binding",
                                    }
                                  : option;
                              },
                            );
                            const availableSourceKinds = selectedDestination
                              ? [
                                  "context_fact",
                                  ...(selectedDestination.literalAllowed
                                    ? (["literal"] as const)
                                    : []),
                                  "runtime",
                                ]
                              : (["context_fact", "runtime"] as const);
                            const compatibleContextFactOptions = bindingContextFactOptions.filter(
                              (option) => {
                                const sourceFact = contextFactsById.get(option.value);
                                return sourceFact
                                  ? isContextFactCompatibleWithDestination(
                                      sourceFact,
                                      selectedDestination,
                                    )
                                  : false;
                              },
                            );

                            return (
                              <article
                                key={binding.localId}
                                className="chiron-cut-frame-thick chiron-tone-canvas grid gap-4 p-4"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="font-geist-pixel-square text-sm uppercase tracking-[0.12em]">
                                    Binding {index + 1}
                                  </p>
                                  <Button
                                    type="button"
                                    size="xs"
                                    variant="destructive"
                                    className="rounded-none"
                                    onClick={() =>
                                      setBindings((previous) =>
                                        previous.filter(
                                          (entry) => entry.localId !== binding.localId,
                                        ),
                                      )
                                    }
                                  >
                                    <XIcon className="size-3" /> Remove
                                  </Button>
                                </div>

                                <div className="grid gap-4 lg:grid-cols-2">
                                  <div className="grid gap-2 lg:col-span-2">
                                    <Label
                                      id={`workflow-editor-invoke-binding-destination-label-${binding.localId}`}
                                    >
                                      Destination
                                    </Label>
                                    <SearchableCombobox
                                      labelId={`workflow-editor-invoke-binding-destination-label-${binding.localId}`}
                                      value={
                                        binding.destinationDefinitionId
                                          ? `${binding.destinationKind}:${binding.destinationDefinitionId}`
                                          : ""
                                      }
                                      onChange={(value) => {
                                        const [nextKind, ...rest] = value.split(":");
                                        const nextId = rest.join(":");
                                        if (
                                          (nextKind !== "work_unit_fact" &&
                                            nextKind !== "artifact_slot") ||
                                          nextId.length === 0
                                        ) {
                                          return;
                                        }

                                        setBindings((previous) =>
                                          previous.map((entry) =>
                                            entry.localId === binding.localId
                                              ? {
                                                  ...entry,
                                                  destinationKind: nextKind,
                                                  destinationDefinitionId: nextId,
                                                }
                                              : entry,
                                          ),
                                        );
                                      }}
                                      options={destinationOptionsForBinding}
                                      placeholder="Select a destination"
                                      searchPlaceholder="Search destinations"
                                      emptyLabel="No invoke destinations available."
                                    />
                                    {selectedDestination ? (
                                      <p className="text-[0.7rem] text-muted-foreground">
                                        Destination metadata: {selectedDestination.summary} ·{" "}
                                        {selectedDestination.key}
                                      </p>
                                    ) : null}
                                  </div>

                                  <div className="grid gap-2">
                                    <Label
                                      htmlFor={`workflow-editor-invoke-binding-type-${binding.localId}`}
                                    >
                                      Source Type
                                    </Label>
                                    <Select
                                      value={binding.sourceKind}
                                      onValueChange={(value) => {
                                        if (!value) {
                                          return;
                                        }

                                        setBindings((previous) =>
                                          previous.map((entry) =>
                                            entry.localId === binding.localId
                                              ? {
                                                  ...entry,
                                                  sourceKind:
                                                    value as InvokeBindingDraft["sourceKind"],
                                                  contextFactDefinitionId:
                                                    value === "context_fact"
                                                      ? entry.contextFactDefinitionId
                                                      : "",
                                                  literalValue:
                                                    value === "literal" ? entry.literalValue : "",
                                                }
                                              : entry,
                                          ),
                                        );
                                      }}
                                    >
                                      <SelectTrigger
                                        id={`workflow-editor-invoke-binding-type-${binding.localId}`}
                                        className="w-full rounded-none border-border/70 bg-background/50"
                                      >
                                        <SelectValue placeholder="Select source type" />
                                      </SelectTrigger>
                                      <SelectContent className="rounded-none">
                                        {INVOKE_BINDING_SOURCE_OPTIONS.filter((option) =>
                                          availableSourceKinds.includes(
                                            option.value as InvokeBindingDraft["sourceKind"],
                                          ),
                                        ).map((option) => (
                                          <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <p className="text-[0.7rem] text-muted-foreground">
                                      {INVOKE_BINDING_SOURCE_OPTIONS.find(
                                        (option) => option.value === binding.sourceKind,
                                      )?.description ??
                                        "Choose how the destination receives a value."}
                                    </p>
                                  </div>

                                  {binding.sourceKind === "context_fact" ? (
                                    <div className="grid gap-2">
                                      <Label
                                        id={`workflow-editor-invoke-binding-source-fact-label-${binding.localId}`}
                                      >
                                        Source Context Fact
                                      </Label>
                                      <SearchableCombobox
                                        labelId={`workflow-editor-invoke-binding-source-fact-label-${binding.localId}`}
                                        value={binding.contextFactDefinitionId}
                                        onChange={(value) =>
                                          setBindings((previous) =>
                                            previous.map((entry) =>
                                              entry.localId === binding.localId
                                                ? { ...entry, contextFactDefinitionId: value }
                                                : entry,
                                            ),
                                          )
                                        }
                                        options={compatibleContextFactOptions}
                                        placeholder="Select a compatible context fact"
                                        searchPlaceholder="Search compatible context facts"
                                        emptyLabel="No compatible context facts available."
                                      />
                                      <p className="text-[0.7rem] text-muted-foreground">
                                        Source note: only compatible context facts are shown for
                                        this destination.
                                      </p>
                                    </div>
                                  ) : null}

                                  {binding.sourceKind === "literal" && selectedDestination ? (
                                    <div className="grid gap-2">
                                      <Label
                                        htmlFor={`workflow-editor-invoke-binding-literal-${binding.localId}`}
                                      >
                                        Literal Value
                                      </Label>
                                      {selectedDestination.factType === "boolean" ? (
                                        <div className="flex items-center gap-3">
                                          <Checkbox
                                            id={`workflow-editor-invoke-binding-literal-${binding.localId}`}
                                            checked={binding.literalValue === "true"}
                                            onCheckedChange={(checked) =>
                                              setBindings((previous) =>
                                                previous.map((entry) =>
                                                  entry.localId === binding.localId
                                                    ? {
                                                        ...entry,
                                                        literalValue: checked ? "true" : "false",
                                                      }
                                                    : entry,
                                                ),
                                              )
                                            }
                                          />
                                          <Label
                                            htmlFor={`workflow-editor-invoke-binding-literal-${binding.localId}`}
                                          >
                                            Boolean literal
                                          </Label>
                                        </div>
                                      ) : (
                                        <Input
                                          id={`workflow-editor-invoke-binding-literal-${binding.localId}`}
                                          type={
                                            selectedDestination.factType === "number"
                                              ? "number"
                                              : "text"
                                          }
                                          className="rounded-none border-border/70 bg-background/50"
                                          value={binding.literalValue}
                                          onChange={(event) =>
                                            setBindings((previous) =>
                                              previous.map((entry) =>
                                                entry.localId === binding.localId
                                                  ? { ...entry, literalValue: event.target.value }
                                                  : entry,
                                              ),
                                            )
                                          }
                                          placeholder={
                                            selectedDestination.factType === "number"
                                              ? "42"
                                              : "literal text"
                                          }
                                        />
                                      )}
                                      <p className="text-[0.7rem] text-muted-foreground">
                                        Source note: literal must match destination type{" "}
                                        {selectedDestination.factType}.
                                      </p>
                                    </div>
                                  ) : null}

                                  {binding.sourceKind === "runtime" ? (
                                    <div className="grid gap-2 lg:col-span-2">
                                      <p className="text-[0.7rem] text-muted-foreground">
                                        Runtime source: this destination is intentionally left for
                                        project runtime to provide.
                                      </p>
                                    </div>
                                  ) : null}
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      )}
                    </section>

                    <section className="chiron-frame-flat chiron-tone-context grid gap-3 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="grid gap-1">
                          <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                            Activation Transitions
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Select the transitions and workflows that should activate after invoke.
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          className="rounded-none"
                          onClick={() => {
                            setActivationTransitions((previous) => [
                              ...previous,
                              createEmptyInvokeActivationTransitionDraft(),
                            ]);
                            setStatusMessage(null);
                          }}
                        >
                          <PlusIcon className="size-3" /> Add Transition
                        </Button>
                      </div>

                      {activationTransitions.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          No activation transitions authored yet.
                        </p>
                      ) : (
                        <div className="grid gap-3">
                          {activationTransitions.map((transition, index) =>
                            (() => {
                              const selectedTransitionId = transition.transitionId.trim();
                              const selectedTransitionIdsByOtherRows = new Set(
                                activationTransitions
                                  .filter((entry) => entry.localId !== transition.localId)
                                  .map((entry) => entry.transitionId.trim())
                                  .filter((entry) => entry.length > 0),
                              );
                              const transitionOptionsForRow = availableInvokeTransitionOptions.map(
                                (option) => {
                                  const isAlreadyUsed =
                                    option.value !== selectedTransitionId &&
                                    selectedTransitionIdsByOtherRows.has(option.value);
                                  return isAlreadyUsed
                                    ? {
                                        ...option,
                                        disabled: true,
                                        disabledReason:
                                          "Already used in another activation transition",
                                      }
                                    : option;
                                },
                              );
                              const boundWorkflowKeys =
                                selectedTransitionId.length > 0
                                  ? boundWorkflowKeysByTransition[selectedTransitionId]
                                  : undefined;
                              const transitionWorkflowOptions =
                                selectedTransitionId.length > 0
                                  ? boundWorkflowKeys
                                    ? availableInvokeWorkflowOptions.filter((option) => {
                                        const workflowKey = option.secondaryLabel ?? option.value;
                                        return (
                                          boundWorkflowKeys.includes(workflowKey) ||
                                          boundWorkflowKeys.includes(option.value)
                                        );
                                      })
                                    : availableInvokeWorkflowOptions
                                  : [];

                              return (
                                <article
                                  key={transition.localId}
                                  className="chiron-cut-frame-thick chiron-tone-canvas grid gap-4 p-4"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="font-geist-pixel-square text-sm uppercase tracking-[0.12em]">
                                      Activation Transition {index + 1}
                                    </p>
                                    <Button
                                      type="button"
                                      size="xs"
                                      variant="destructive"
                                      className="rounded-none"
                                      onClick={() =>
                                        setActivationTransitions((previous) =>
                                          previous.filter(
                                            (entry) => entry.localId !== transition.localId,
                                          ),
                                        )
                                      }
                                    >
                                      <XIcon className="size-3" /> Remove
                                    </Button>
                                  </div>

                                  <div className="grid gap-4 lg:grid-cols-2">
                                    <div className="grid gap-2">
                                      <Label
                                        id={`workflow-editor-invoke-transition-label-${transition.localId}`}
                                      >
                                        Transition
                                      </Label>
                                      <SearchableCombobox
                                        labelId={`workflow-editor-invoke-transition-label-${transition.localId}`}
                                        value={transition.transitionId}
                                        onChange={(value) =>
                                          setActivationTransitions((previous) =>
                                            previous.map((entry) =>
                                              entry.localId === transition.localId
                                                ? {
                                                    ...entry,
                                                    transitionId: value,
                                                    workflowDefinitionIds: [],
                                                  }
                                                : entry,
                                            ),
                                          )
                                        }
                                        options={transitionOptionsForRow}
                                        placeholder="Select a transition"
                                        searchPlaceholder="Search transitions"
                                        emptyLabel={
                                          selectedBindingWorkUnitDefinitionId.length === 0
                                            ? "Select a work unit first."
                                            : "No transitions found."
                                        }
                                        disabled={selectedBindingWorkUnitDefinitionId.length === 0}
                                      />
                                    </div>

                                    <div className="grid gap-2">
                                      <Label
                                        id={`workflow-editor-invoke-transition-workflows-label-${transition.localId}`}
                                      >
                                        Workflows
                                      </Label>
                                      <SearchableMultiSelect
                                        labelId={`workflow-editor-invoke-transition-workflows-label-${transition.localId}`}
                                        values={transition.workflowDefinitionIds}
                                        onChange={(values) =>
                                          setActivationTransitions((previous) =>
                                            previous.map((entry) =>
                                              entry.localId === transition.localId
                                                ? { ...entry, workflowDefinitionIds: values }
                                                : entry,
                                            ),
                                          )
                                        }
                                        options={transitionWorkflowOptions}
                                        placeholder="Select workflows"
                                        searchPlaceholder="Search workflows"
                                        emptyLabel={
                                          transition.transitionId.trim().length === 0
                                            ? "Select a transition first."
                                            : "No bound primary workflows for this transition."
                                        }
                                        singularLabel="workflow"
                                        pluralLabel="workflows"
                                      />
                                      {transition.transitionId.trim().length > 0 ? (
                                        <p className="text-[0.7rem] text-muted-foreground">
                                          Workflow options are limited to the selected transition's
                                          bound primary workflows.
                                        </p>
                                      ) : null}
                                    </div>
                                  </div>
                                </article>
                              );
                            })(),
                          )}
                        </div>
                      )}
                    </section>
                  </div>
                )
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
                  onClick={requestCloseDialog}
                >
                  Cancel
                </Button>
                {mode === "edit" ? (
                  <Button
                    type="button"
                    variant="destructive"
                    className="rounded-none"
                    onClick={requestDeleteDialog}
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

      <Dialog open={isDiscardDialogOpen} onOpenChange={setIsDiscardDialogOpen}>
        <DialogContent className="chiron-cut-frame-thick w-[min(28rem,calc(100vw-2rem))] p-8 sm:max-w-none">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold uppercase tracking-[0.08em]">
              Discard unsaved changes?
            </DialogTitle>
            <DialogDescription>
              You have unsaved invoke-step edits. Discarding now will close the dialog and lose
              those changes.
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

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="chiron-cut-frame-thick w-[min(28rem,calc(100vw-2rem))] p-8 sm:max-w-none">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold uppercase tracking-[0.08em]">
              Delete invoke step?
            </DialogTitle>
            <DialogDescription>
              This action is destructive and cannot be undone. The invoke step and its authored
              bindings and activation transitions will be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-none"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-none"
              onClick={confirmDelete}
            >
              Delete Invoke Step
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
  const [initialSnapshot, setInitialSnapshot] = useState<FormStepDialogSnapshot | null>(null);
  const [activeTab, setActiveTab] = useState<FormStepDialogTab>("contract");
  const [fieldDrafts, setFieldDrafts] = useState<WorkflowEditorFieldDraft[]>([]);
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);
  const [pendingFieldContextFactId, setPendingFieldContextFactId] = useState("");
  const [pendingDeleteFieldId, setPendingDeleteFieldId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setIsDiscardDialogOpen(false);
      return;
    }

    const nextStepKey = step?.payload.key ?? "";
    const nextLabel = step?.payload.label ?? "";
    const nextDescriptionMarkdown = step?.payload.descriptionJson?.markdown ?? "";
    const nextGuidance = normalizeGuidance(step?.payload.guidance);
    const nextFieldDrafts = normalizeFieldDrafts(step, contextFactDefinitions);

    setStepKey(nextStepKey);
    setLabel(nextLabel);
    setDescriptionMarkdown(nextDescriptionMarkdown);
    setGuidance(nextGuidance);
    setFieldDrafts(nextFieldDrafts);
    setInitialSnapshot(
      toFormStepDialogSnapshot({
        stepKey: nextStepKey,
        label: nextLabel,
        descriptionMarkdown: nextDescriptionMarkdown,
        fieldDrafts: nextFieldDrafts,
        guidance: nextGuidance,
      }),
    );
    setIsDiscardDialogOpen(false);
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
  const currentSnapshot = useMemo(
    () =>
      toFormStepDialogSnapshot({
        stepKey,
        label,
        descriptionMarkdown,
        fieldDrafts,
        guidance,
      }),
    [descriptionMarkdown, fieldDrafts, guidance, label, stepKey],
  );
  const isContractDirty =
    open && initialSnapshot
      ? !areDialogSnapshotSectionsEqual(currentSnapshot.contract, initialSnapshot.contract)
      : false;
  const isFieldsDirty =
    open && initialSnapshot
      ? !areDialogSnapshotSectionsEqual(currentSnapshot.fields, initialSnapshot.fields)
      : false;
  const isGuidanceDirty =
    open && initialSnapshot
      ? !areDialogSnapshotSectionsEqual(currentSnapshot.guidance, initialSnapshot.guidance)
      : false;
  const isDialogDirty = isContractDirty || isFieldsDirty || isGuidanceDirty;

  const removeField = (localId: string) => {
    setFieldDrafts((previous) => previous.filter((field) => field.localId !== localId));
    setPendingDeleteFieldId(null);
  };

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
                  isDirty={isContractDirty}
                  dirtyIndicatorTestId="workflow-form-step-contract-modified-indicator"
                >
                  Contract
                </TabButton>
                <TabButton
                  active={activeTab === "fields"}
                  onClick={() => setActiveTab("fields")}
                  isDirty={isFieldsDirty}
                  dirtyIndicatorTestId="workflow-form-step-fields-modified-indicator"
                >
                  Fields
                </TabButton>
                <TabButton
                  active={activeTab === "guidance"}
                  onClick={() => setActiveTab("guidance")}
                  isDirty={isGuidanceDirty}
                  dirtyIndicatorTestId="workflow-form-step-guidance-modified-indicator"
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
                  onClick={requestCloseDialog}
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

      <Dialog open={isDiscardDialogOpen} onOpenChange={setIsDiscardDialogOpen}>
        <DialogContent className="chiron-cut-frame-thick w-[min(28rem,calc(100vw-2rem))] p-8 sm:max-w-none">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold uppercase tracking-[0.08em]">
              Discard unsaved changes?
            </DialogTitle>
            <DialogDescription>
              You have unsaved form-step edits. Discarding now will close the dialog and lose those
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
  loadWorkUnitArtifactSlots,
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
  const [pendingAllowedValueTag, setPendingAllowedValueTag] = useState("");
  const [allowedValueTags, setAllowedValueTags] = useState<string[]>([]);
  const [jsonSubSchemaDrafts, setJsonSubSchemaDrafts] = useState<JsonSubSchemaDraft[]>([]);
  const [pendingIncludedFactDefinitionId, setPendingIncludedFactDefinitionId] = useState("");
  const [pendingIncludedArtifactSlotDefinitionId, setPendingIncludedArtifactSlotDefinitionId] =
    useState("");
  const [draftSpecCards, setDraftSpecCards] = useState<WorkUnitDraftFactCard[]>([]);
  const selectedWorkUnitDefinitionId =
    draft.kind === "work_unit_draft_spec_fact"
      ? (draft.workUnitDefinitionId?.trim() ?? draft.workUnitTypeKey?.trim() ?? "")
      : "";
  const selectedWorkUnitFactsQuery = useQuery({
    queryKey: [
      "workflow-editor",
      "work-unit-draft-spec-facts",
      workUnitFactsQueryScope,
      selectedWorkUnitDefinitionId,
    ],
    queryFn: async () => loadWorkUnitFacts(selectedWorkUnitDefinitionId),
    enabled:
      open && draft.kind === "work_unit_draft_spec_fact" && selectedWorkUnitDefinitionId.length > 0,
  });
  const selectedWorkUnitFacts = selectedWorkUnitFactsQuery.data ?? [];
  const selectedWorkUnitArtifactSlotsQuery = useQuery({
    queryKey: [
      "workflow-editor",
      "work-unit-draft-spec-artifact-slots",
      workUnitFactsQueryScope,
      selectedWorkUnitDefinitionId,
    ],
    queryFn: async () => loadWorkUnitArtifactSlots(selectedWorkUnitDefinitionId),
    enabled:
      open && draft.kind === "work_unit_draft_spec_fact" && selectedWorkUnitDefinitionId.length > 0,
  });
  const selectedWorkUnitArtifactSlots = selectedWorkUnitArtifactSlotsQuery.data ?? [];
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
        ? externalFactOptions.find(
            (option) =>
              option.value === draft.externalFactDefinitionId ||
              option.secondaryLabel === draft.externalFactDefinitionId,
          )
        : undefined,
    [draft.externalFactDefinitionId, draft.kind, externalFactOptions],
  );
  const selectedDraftSpecFact = useMemo(
    () =>
      draft.kind === "work_unit_draft_spec_fact"
        ? selectedWorkUnitFacts.find((option) => option.value === pendingIncludedFactDefinitionId)
        : undefined,
    [draft.kind, pendingIncludedFactDefinitionId, selectedWorkUnitFacts],
  );
  const availableDraftSpecArtifactOptions = useMemo(
    () =>
      selectedWorkUnitArtifactSlots.filter(
        (option) =>
          !draft.selectedArtifactSlotDefinitionIds.some(
            (selectedId) => selectedId === option.value || selectedId === option.secondaryLabel,
          ),
      ),
    [draft.selectedArtifactSlotDefinitionIds, selectedWorkUnitArtifactSlots],
  );
  const selectedArtifactSlot = useMemo(
    () =>
      draft.kind === "artifact_reference_fact"
        ? artifactSlots.find(
            (option) =>
              option.value === draft.artifactSlotDefinitionId ||
              option.secondaryLabel === draft.artifactSlotDefinitionId,
          )
        : undefined,
    [draft.kind, draft.artifactSlotDefinitionId, artifactSlots],
  );
  const selectedWorkUnitArtifactOptionsByIdentifier = useMemo(() => {
    const optionsByIdentifier = new Map<string, WorkflowEditorPickerOption>();

    selectedWorkUnitArtifactSlots.forEach((option) => {
      optionsByIdentifier.set(option.value, option);
      if (typeof option.secondaryLabel === "string" && option.secondaryLabel.length > 0) {
        optionsByIdentifier.set(option.secondaryLabel, option);
      }
    });

    return optionsByIdentifier;
  }, [selectedWorkUnitArtifactSlots]);
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
    const nextStringValidation = toStringValidationState(nextDraft.validationJson);
    const nextPlainStringDefaultValue = "";
    const nextPlainStringValidationType = nextStringValidation.kind;
    const nextPlainStringPathKind = nextStringValidation.pathKind;
    const nextPlainStringTrimWhitespace = nextStringValidation.trimWhitespace;
    const nextPlainStringDisallowAbsolute = nextStringValidation.disallowAbsolute;
    const nextPlainStringPreventTraversal = nextStringValidation.preventTraversal;
    const nextPendingAllowedValueTag = "";
    const nextAllowedValueTags: string[] = [...nextStringValidation.allowedValues];
    const nextJsonSubSchemaDrafts =
      nextDraft.kind === "plain_value_fact" && nextDraft.valueType === "json"
        ? (() => {
            const parsed = toJsonSubSchemaDraftsFromValidation(nextDraft.validationJson);
            return parsed.length > 0 ? parsed : [createEmptyJsonSubSchemaDraft([])];
          })()
        : [];
    const nextPendingIncludedFactDefinitionId = "";
    const nextPendingIncludedArtifactSlotDefinitionId = "";
    const nextDraftSpecCards = (
      nextDraft.selectedWorkUnitFactDefinitionIds.length > 0
        ? nextDraft.selectedWorkUnitFactDefinitionIds
        : nextDraft.includedFactDefinitionIds
    ).map((factDefinitionId) => createWorkUnitDraftFactCard(factDefinitionId, []));

    setDraft(nextDraft);
    setPlainStringDefaultValue(nextPlainStringDefaultValue);
    setPlainStringValidationType(nextPlainStringValidationType);
    setPlainStringPathKind(nextPlainStringPathKind);
    setPlainStringTrimWhitespace(nextPlainStringTrimWhitespace);
    setPlainStringDisallowAbsolute(nextPlainStringDisallowAbsolute);
    setPlainStringPreventTraversal(nextPlainStringPreventTraversal);
    setPendingAllowedValueTag(nextPendingAllowedValueTag);
    setAllowedValueTags(nextAllowedValueTags);
    setJsonSubSchemaDrafts(nextJsonSubSchemaDrafts);
    setPendingIncludedFactDefinitionId(nextPendingIncludedFactDefinitionId);
    setPendingIncludedArtifactSlotDefinitionId(nextPendingIncludedArtifactSlotDefinitionId);
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
        pendingAllowedValueTag: nextPendingAllowedValueTag,
        allowedValueTags: nextAllowedValueTags,
        jsonSubSchemaDrafts: nextJsonSubSchemaDrafts,
        pendingIncludedFactDefinitionId: nextPendingIncludedFactDefinitionId,
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
          (option) => option.value === entry.factDefinitionId,
        );

        return matchedOption
          ? {
              ...entry,
              factKey: matchedOption.secondaryLabel ?? entry.factKey,
              displayName: matchedOption.label,
              description: matchedOption.description,
            }
          : entry;
      }),
    );
  }, [open, selectedWorkUnitFacts]);

  useEffect(() => {
    if (
      !open ||
      (draft.kind !== "definition_backed_external_fact" && draft.kind !== "bound_external_fact") ||
      draft.externalFactDefinitionId.trim().length === 0
    ) {
      return;
    }

    const matchedOption = externalFactOptions.find(
      (option) =>
        option.value === draft.externalFactDefinitionId ||
        option.secondaryLabel === draft.externalFactDefinitionId,
    );
    if (!matchedOption || matchedOption.value === draft.externalFactDefinitionId) {
      return;
    }

    setDraft((previous) => {
      if (previous.externalFactDefinitionId === matchedOption.value) {
        return previous;
      }

      return {
        ...previous,
        externalFactDefinitionId: matchedOption.value,
        valueType: matchedOption.valueType,
        validationJson: matchedOption.validationJson,
        workUnitDefinitionId: matchedOption.workUnitDefinitionId ?? "",
        workUnitTypeKey: matchedOption.workUnitDefinitionId ?? "",
      };
    });
  }, [draft.externalFactDefinitionId, draft.kind, externalFactOptions, open]);

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
        (option) => !draftSpecCards.some((entry) => entry.factDefinitionId === option.value),
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
        pendingAllowedValueTag,
        allowedValueTags,
        jsonSubSchemaDrafts,
        pendingIncludedFactDefinitionId,
        draftSpecCards,
      }),
    [
      allowedValueTags,
      draft,
      draftSpecCards,
      jsonSubSchemaDrafts,
      pendingAllowedValueTag,
      pendingIncludedFactDefinitionId,
      plainStringDefaultValue,
      plainStringDisallowAbsolute,
      plainStringPathKind,
      plainStringPreventTraversal,
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

              const nextValidationJson =
                draft.kind === "plain_value_fact"
                  ? buildPlainValueValidationJson({
                      valueType: draft.valueType ?? "string",
                      plainStringValidationType,
                      plainStringPathKind,
                      plainStringTrimWhitespace,
                      plainStringDisallowAbsolute,
                      plainStringPreventTraversal,
                      allowedValueTags,
                      jsonSubSchemaDrafts,
                    })
                  : draft.validationJson;

              void onSave({
                ...draft,
                validationJson: nextValidationJson,
                key: draft.key.trim(),
                label: draft.label.trim(),
                descriptionMarkdown: draft.descriptionMarkdown.trim(),
                externalFactDefinitionId: draft.externalFactDefinitionId?.trim() ?? "",
                artifactSlotDefinitionId: draft.artifactSlotDefinitionId?.trim() ?? "",
                workUnitDefinitionId:
                  draft.workUnitDefinitionId?.trim() ?? draft.workUnitTypeKey?.trim() ?? "",
                workUnitTypeKey:
                  draft.workUnitDefinitionId?.trim() ?? draft.workUnitTypeKey?.trim() ?? "",
                allowedWorkflowDefinitionIds: draft.allowedWorkflowDefinitionIds.map((entry) =>
                  entry.trim(),
                ),
                selectedWorkUnitFactDefinitionIds: draftSpecCards
                  .map((entry) => entry.factDefinitionId.trim())
                  .filter((entry) => entry.length > 0),
                selectedArtifactSlotDefinitionIds: draft.selectedArtifactSlotDefinitionIds,
                includedFactDefinitionIds: draftSpecCards
                  .map((entry) => entry.factDefinitionId.trim())
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
                          setPendingAllowedValueTag("");
                          setAllowedValueTags([]);
                          setJsonSubSchemaDrafts([]);
                          setPendingIncludedFactDefinitionId("");
                          setPendingIncludedArtifactSlotDefinitionId("");
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
                                  <SelectItem value="allowed-values">allowed-values</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

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
                                                      | "boolean",
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
                                          {JSON_SUB_SCHEMA_VALUE_TYPE_OPTIONS.map((valueType) => (
                                            <SelectItem key={valueType} value={valueType}>
                                              {valueType}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    {entry.valueType === "string" ? (
                                      <div className="grid gap-3 lg:col-span-2">
                                        <div className="grid gap-2 lg:max-w-sm">
                                          <Label
                                            htmlFor={`workflow-editor-json-string-validation-type-${entry.localId}`}
                                          >
                                            String Validation
                                          </Label>
                                          <Select
                                            value={entry.stringValidationType}
                                            onValueChange={(value) =>
                                              setJsonSubSchemaDrafts((current) =>
                                                current.map((currentEntry) =>
                                                  currentEntry.localId === entry.localId
                                                    ? {
                                                        ...currentEntry,
                                                        stringValidationType:
                                                          value === "path" ||
                                                          value === "allowed-values"
                                                            ? value
                                                            : "none",
                                                      }
                                                    : currentEntry,
                                                ),
                                              )
                                            }
                                          >
                                            <SelectTrigger
                                              id={`workflow-editor-json-string-validation-type-${entry.localId}`}
                                              className="w-full rounded-none border-border/70 bg-background/50"
                                            >
                                              <SelectValue placeholder="Select string validation" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-none">
                                              <SelectItem value="none">none</SelectItem>
                                              <SelectItem value="path">path</SelectItem>
                                              <SelectItem value="allowed-values">
                                                allowed-values
                                              </SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>

                                        {entry.stringValidationType === "allowed-values" ? (
                                          <div className="grid gap-3">
                                            <Label
                                              htmlFor={`workflow-editor-json-string-allowed-value-input-${entry.localId}`}
                                            >
                                              Allowed Values
                                            </Label>
                                            <div className="flex flex-col gap-2 sm:flex-row">
                                              <Input
                                                id={`workflow-editor-json-string-allowed-value-input-${entry.localId}`}
                                                className="rounded-none border-border/70 bg-background/50"
                                                value={entry.pendingStringAllowedValueTag}
                                                onChange={(event) =>
                                                  setJsonSubSchemaDrafts((current) =>
                                                    current.map((currentEntry) =>
                                                      currentEntry.localId === entry.localId
                                                        ? {
                                                            ...currentEntry,
                                                            pendingStringAllowedValueTag:
                                                              event.target.value,
                                                          }
                                                        : currentEntry,
                                                    ),
                                                  )
                                                }
                                                onKeyDown={(event) => {
                                                  if (event.key !== "Enter") {
                                                    return;
                                                  }

                                                  event.preventDefault();
                                                  setJsonSubSchemaDrafts((current) =>
                                                    current.map((currentEntry) => {
                                                      if (currentEntry.localId !== entry.localId) {
                                                        return currentEntry;
                                                      }

                                                      const nextTag =
                                                        currentEntry.pendingStringAllowedValueTag.trim();
                                                      if (
                                                        nextTag.length === 0 ||
                                                        currentEntry.stringAllowedValues.includes(
                                                          nextTag,
                                                        )
                                                      ) {
                                                        return currentEntry;
                                                      }

                                                      return {
                                                        ...currentEntry,
                                                        pendingStringAllowedValueTag: "",
                                                        stringAllowedValues: [
                                                          ...currentEntry.stringAllowedValues,
                                                          nextTag,
                                                        ],
                                                      };
                                                    }),
                                                  );
                                                }}
                                                placeholder="Enter an allowed value"
                                              />
                                              <Button
                                                type="button"
                                                variant="outline"
                                                className="rounded-none"
                                                onClick={() =>
                                                  setJsonSubSchemaDrafts((current) =>
                                                    current.map((currentEntry) => {
                                                      if (currentEntry.localId !== entry.localId) {
                                                        return currentEntry;
                                                      }

                                                      const nextTag =
                                                        currentEntry.pendingStringAllowedValueTag.trim();
                                                      if (
                                                        nextTag.length === 0 ||
                                                        currentEntry.stringAllowedValues.includes(
                                                          nextTag,
                                                        )
                                                      ) {
                                                        return currentEntry;
                                                      }

                                                      return {
                                                        ...currentEntry,
                                                        pendingStringAllowedValueTag: "",
                                                        stringAllowedValues: [
                                                          ...currentEntry.stringAllowedValues,
                                                          nextTag,
                                                        ],
                                                      };
                                                    }),
                                                  )
                                                }
                                              >
                                                Add allowed value
                                              </Button>
                                            </div>

                                            {entry.stringAllowedValues.length > 0 ? (
                                              <div className="flex flex-wrap gap-2">
                                                {entry.stringAllowedValues.map((value) => (
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
                                                        setJsonSubSchemaDrafts((current) =>
                                                          current.map((currentEntry) =>
                                                            currentEntry.localId === entry.localId
                                                              ? {
                                                                  ...currentEntry,
                                                                  stringAllowedValues:
                                                                    currentEntry.stringAllowedValues.filter(
                                                                      (item) => item !== value,
                                                                    ),
                                                                }
                                                              : currentEntry,
                                                          ),
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

                                        {entry.stringValidationType === "path" ? (
                                          <div className="grid gap-3">
                                            <div className="grid gap-2 lg:max-w-sm">
                                              <Label
                                                htmlFor={`workflow-editor-json-string-path-kind-${entry.localId}`}
                                              >
                                                Path Kind
                                              </Label>
                                              <Select
                                                value={entry.stringPathKind}
                                                onValueChange={(value) =>
                                                  setJsonSubSchemaDrafts((current) =>
                                                    current.map((currentEntry) =>
                                                      currentEntry.localId === entry.localId
                                                        ? {
                                                            ...currentEntry,
                                                            stringPathKind:
                                                              value === "directory"
                                                                ? "directory"
                                                                : "file",
                                                          }
                                                        : currentEntry,
                                                    ),
                                                  )
                                                }
                                              >
                                                <SelectTrigger
                                                  id={`workflow-editor-json-string-path-kind-${entry.localId}`}
                                                  className="w-full rounded-none border-border/70 bg-background/50"
                                                >
                                                  <SelectValue placeholder="Select path kind" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-none">
                                                  <SelectItem value="file">file</SelectItem>
                                                  <SelectItem value="directory">
                                                    directory
                                                  </SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </div>

                                            <div className="grid gap-2 text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground md:grid-cols-3">
                                              <div className="flex items-center gap-2">
                                                <Checkbox
                                                  id={`workflow-editor-json-string-trim-whitespace-${entry.localId}`}
                                                  checked={entry.stringTrimWhitespace}
                                                  onCheckedChange={(checked) =>
                                                    setJsonSubSchemaDrafts((current) =>
                                                      current.map((currentEntry) =>
                                                        currentEntry.localId === entry.localId
                                                          ? {
                                                              ...currentEntry,
                                                              stringTrimWhitespace:
                                                                checked === true,
                                                            }
                                                          : currentEntry,
                                                      ),
                                                    )
                                                  }
                                                />
                                                <Label
                                                  htmlFor={`workflow-editor-json-string-trim-whitespace-${entry.localId}`}
                                                  className="text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground"
                                                >
                                                  Trim Whitespace
                                                </Label>
                                              </div>

                                              <div className="flex items-center gap-2">
                                                <Checkbox
                                                  id={`workflow-editor-json-string-disallow-absolute-${entry.localId}`}
                                                  checked={entry.stringDisallowAbsolute}
                                                  onCheckedChange={(checked) =>
                                                    setJsonSubSchemaDrafts((current) =>
                                                      current.map((currentEntry) =>
                                                        currentEntry.localId === entry.localId
                                                          ? {
                                                              ...currentEntry,
                                                              stringDisallowAbsolute:
                                                                checked === true,
                                                            }
                                                          : currentEntry,
                                                      ),
                                                    )
                                                  }
                                                />
                                                <Label
                                                  htmlFor={`workflow-editor-json-string-disallow-absolute-${entry.localId}`}
                                                  className="text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground"
                                                >
                                                  Disallow Absolute
                                                </Label>
                                              </div>

                                              <div className="flex items-center gap-2">
                                                <Checkbox
                                                  id={`workflow-editor-json-string-prevent-traversal-${entry.localId}`}
                                                  checked={entry.stringPreventTraversal}
                                                  onCheckedChange={(checked) =>
                                                    setJsonSubSchemaDrafts((current) =>
                                                      current.map((currentEntry) =>
                                                        currentEntry.localId === entry.localId
                                                          ? {
                                                              ...currentEntry,
                                                              stringPreventTraversal:
                                                                checked === true,
                                                            }
                                                          : currentEntry,
                                                      ),
                                                    )
                                                  }
                                                />
                                                <Label
                                                  htmlFor={`workflow-editor-json-string-prevent-traversal-${entry.localId}`}
                                                  className="text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground"
                                                >
                                                  Prevent Traversal
                                                </Label>
                                              </div>
                                            </div>
                                          </div>
                                        ) : null}
                                      </div>
                                    ) : null}
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
                        onChange={(value) => {
                          const selectedOption = externalFactOptions.find(
                            (option) => option.value === value,
                          );
                          setDraft((previous) => ({
                            ...previous,
                            externalFactDefinitionId: value,
                            valueType: selectedOption?.valueType,
                            validationJson: selectedOption?.validationJson,
                            workUnitDefinitionId: selectedOption?.workUnitDefinitionId ?? "",
                            workUnitTypeKey: selectedOption?.workUnitDefinitionId ?? "",
                          }));
                        }}
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
                          Work Unit Definition
                        </Label>
                        <SearchableCombobox
                          labelId="workflow-editor-context-fact-work-unit-type"
                          value={draft.workUnitDefinitionId ?? draft.workUnitTypeKey ?? ""}
                          onChange={(value) => {
                            setPendingIncludedFactDefinitionId("");
                            setPendingIncludedArtifactSlotDefinitionId("");
                            setDraftSpecCards([]);
                            setDraft((previous) => ({
                              ...previous,
                              workUnitDefinitionId: value,
                              workUnitTypeKey: value,
                              selectedWorkUnitFactDefinitionIds: [],
                              selectedArtifactSlotDefinitionIds: [],
                              includedFactDefinitionIds: [],
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
                              Included Fact Definitions
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Compose the reusable draft-spec envelope from selected work-unit fact
                              definitions.
                            </p>
                          </div>
                        </div>

                        {availableDraftSpecFactOptions.length > 0 ? (
                          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                            <div className="grid gap-2">
                              <Label id="workflow-editor-context-fact-draft-spec-fields">
                                Fact Definition
                              </Label>
                              <SearchableCombobox
                                labelId="workflow-editor-context-fact-draft-spec-fields"
                                value={pendingIncludedFactDefinitionId}
                                onChange={setPendingIncludedFactDefinitionId}
                                options={availableDraftSpecFactOptions}
                                placeholder={
                                  selectedWorkUnitDefinitionId.length > 0
                                    ? "Select a fact definition"
                                    : "Select a work unit type first"
                                }
                                searchPlaceholder="Search fact definitions..."
                                emptyLabel={
                                  selectedWorkUnitDefinitionId.length === 0
                                    ? "Select a work unit type first."
                                    : selectedWorkUnitFactsQuery.isLoading
                                      ? "Loading fact definitions..."
                                      : "No fact definitions found."
                                }
                                disabled={selectedWorkUnitDefinitionId.length === 0}
                              />
                            </div>
                            <div className="flex items-end">
                              <Button
                                type="button"
                                className="rounded-none"
                                disabled={
                                  selectedWorkUnitDefinitionId.length === 0 ||
                                  pendingIncludedFactDefinitionId.length === 0
                                }
                                onClick={() => {
                                  if (pendingIncludedFactDefinitionId.length === 0) {
                                    return;
                                  }

                                  const nextCards = [
                                    ...draftSpecCards,
                                    createWorkUnitDraftFactCard(
                                      pendingIncludedFactDefinitionId,
                                      selectedWorkUnitFacts,
                                    ),
                                  ];
                                  setDraftSpecCards(nextCards);
                                  setDraft((previous) => ({
                                    ...previous,
                                    selectedWorkUnitFactDefinitionIds: nextCards.map(
                                      (entry) => entry.factDefinitionId,
                                    ),
                                    includedFactDefinitionIds: nextCards.map(
                                      (entry) => entry.factDefinitionId,
                                    ),
                                  }));
                                  setPendingIncludedFactDefinitionId("");
                                }}
                              >
                                <PlusIcon className="size-3.5" />
                                Add Fact Definition
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            {selectedWorkUnitDefinitionId.length === 0
                              ? "Select a work unit type to load draft-spec fact definitions."
                              : selectedWorkUnitFactsQuery.isLoading
                                ? "Loading facts for the selected work unit..."
                                : "Every available work unit fact is already included in this draft-spec composer."}
                          </p>
                        )}

                        {draftSpecCards.length === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            No included fact definitions yet. Add cards from the searchable picker
                            above.
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
                                        selectedWorkUnitFactDefinitionIds: nextCards.map(
                                          (card) => card.factDefinitionId,
                                        ),
                                        includedFactDefinitionIds: nextCards.map(
                                          (card) => card.factDefinitionId,
                                        ),
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

                        <div className="grid gap-3 border-t border-border/70 pt-3">
                          <div className="grid gap-1">
                            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                              Included Artifact Slot Definitions
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Add reusable artifact-slot references to the draft-spec envelope.
                            </p>
                          </div>
                          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                            <div className="grid gap-2">
                              <Label id="workflow-editor-context-fact-draft-spec-artifact-slots">
                                Artifact Slot Definition
                              </Label>
                              <SearchableCombobox
                                labelId="workflow-editor-context-fact-draft-spec-artifact-slots"
                                value={pendingIncludedArtifactSlotDefinitionId}
                                onChange={setPendingIncludedArtifactSlotDefinitionId}
                                options={availableDraftSpecArtifactOptions}
                                placeholder={
                                  selectedWorkUnitDefinitionId.length > 0
                                    ? "Select an artifact slot"
                                    : "Select a work unit type first"
                                }
                                searchPlaceholder="Search artifact slots..."
                                emptyLabel={
                                  selectedWorkUnitDefinitionId.length === 0
                                    ? "Select a work unit type first."
                                    : selectedWorkUnitArtifactSlotsQuery.isLoading
                                      ? "Loading artifact slots..."
                                      : "No artifact slots available."
                                }
                                disabled={selectedWorkUnitDefinitionId.length === 0}
                              />
                            </div>
                            <div className="flex items-end">
                              <Button
                                type="button"
                                className="rounded-none"
                                disabled={
                                  selectedWorkUnitDefinitionId.length === 0 ||
                                  pendingIncludedArtifactSlotDefinitionId.length === 0
                                }
                                onClick={() => {
                                  if (pendingIncludedArtifactSlotDefinitionId.length === 0) {
                                    return;
                                  }

                                  setDraft((previous) => {
                                    const nextSelectedArtifactSlotDefinitionIds = [
                                      ...previous.selectedArtifactSlotDefinitionIds,
                                      pendingIncludedArtifactSlotDefinitionId,
                                    ];
                                    return {
                                      ...previous,
                                      selectedArtifactSlotDefinitionIds:
                                        nextSelectedArtifactSlotDefinitionIds,
                                    };
                                  });
                                  setPendingIncludedArtifactSlotDefinitionId("");
                                }}
                              >
                                <PlusIcon className="size-3.5" />
                                Add Artifact Slot
                              </Button>
                            </div>
                          </div>

                          {draft.selectedArtifactSlotDefinitionIds.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                              No included artifact slots yet.
                            </p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {draft.selectedArtifactSlotDefinitionIds.map((slotDefinitionId) => (
                                <button
                                  key={slotDefinitionId}
                                  type="button"
                                  className="chiron-frame-flat flex items-center gap-2 px-3 py-2 text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground"
                                  onClick={() =>
                                    setDraft((previous) => ({
                                      ...previous,
                                      selectedArtifactSlotDefinitionIds:
                                        previous.selectedArtifactSlotDefinitionIds.filter(
                                          (current) => current !== slotDefinitionId,
                                        ),
                                    }))
                                  }
                                >
                                  <span>{slotDefinitionId}</span>
                                  {selectedWorkUnitArtifactOptionsByIdentifier.get(slotDefinitionId)
                                    ?.label ? (
                                    <span>
                                      {
                                        selectedWorkUnitArtifactOptionsByIdentifier.get(
                                          slotDefinitionId,
                                        )?.label
                                      }
                                    </span>
                                  ) : null}
                                  <span className="text-foreground">×</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
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

function createEmptyBranchRouteCondition(
  fact?: WorkflowContextFactDefinitionItem,
): WorkflowBranchRouteConditionPayload {
  return {
    conditionId: createLocalId("branch-condition"),
    contextFactDefinitionId: fact?.contextFactDefinitionId ?? "",
    subFieldKey: null,
    operator: "exists",
    isNegated: false,
    comparisonJson: null,
  };
}

function normalizeConditionSubFieldKey(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

function isJsonScalarFact(fact: WorkflowContextFactDefinitionItem | undefined) {
  return (
    fact?.valueType === "json" &&
    (fact.kind === "plain_value_fact" ||
      fact.kind === "definition_backed_external_fact" ||
      fact.kind === "bound_external_fact")
  );
}

function getPlainStringValidationKind(
  fact: WorkflowContextFactDefinitionItem | undefined,
): "none" | "path" | "allowed-values" {
  if (fact?.kind !== "plain_value_fact" || fact.valueType !== "string") {
    return "none";
  }

  const validation = fact.validationJson;
  if (typeof validation !== "object" || validation === null) {
    return "none";
  }

  const kind = "kind" in validation ? (validation as { kind?: unknown }).kind : undefined;
  if (kind === "path" || kind === "allowed-values") {
    return kind;
  }

  return "none";
}

function getExternalStringValidationKind(
  fact: WorkflowContextFactDefinitionItem | undefined,
): "none" | "path" | "allowed-values" {
  if (
    !fact ||
    (fact.kind !== "definition_backed_external_fact" && fact.kind !== "bound_external_fact") ||
    fact.valueType !== "string"
  ) {
    return "none";
  }

  const validation = fact.validationJson;
  if (typeof validation !== "object" || validation === null) {
    return "none";
  }

  const kind = "kind" in validation ? (validation as { kind?: unknown }).kind : undefined;
  if (kind === "path" || kind === "allowed-values") {
    return kind;
  }

  return "none";
}

function getPlainJsonSubFieldOptions(fact: WorkflowContextFactDefinitionItem | undefined) {
  if (!isJsonScalarFact(fact)) {
    return [];
  }

  const validation = fact.validationJson;
  if (typeof validation !== "object" || validation === null) {
    return [];
  }

  const kind = "kind" in validation ? (validation as { kind?: unknown }).kind : undefined;
  const subSchema =
    "subSchema" in validation ? (validation as { subSchema?: unknown }).subSchema : undefined;
  const schema = "schema" in validation ? (validation as { schema?: unknown }).schema : undefined;
  if (kind !== "json-schema") {
    return [];
  }

  const subSchemaFields =
    typeof subSchema === "object" &&
    subSchema !== null &&
    "fields" in subSchema &&
    Array.isArray((subSchema as { fields?: unknown }).fields)
      ? ((subSchema as { fields: unknown[] }).fields ?? [])
      : [];

  const legacyPropertyFields =
    typeof schema === "object" && schema !== null && "properties" in schema
      ? Object.entries((schema as { properties?: Record<string, unknown> }).properties ?? {}).map(
          ([key, property]) => {
            const record = typeof property === "object" && property !== null ? property : null;
            return {
              key,
              type: record?.type,
              displayName:
                typeof record?.title === "string" && record.title.trim().length > 0
                  ? record.title.trim()
                  : undefined,
              validation:
                record && typeof record.validation !== "undefined"
                  ? record.validation
                  : record && typeof record["x-validation"] !== "undefined"
                    ? record["x-validation"]
                    : undefined,
            };
          },
        )
      : [];

  const fields = subSchemaFields.length > 0 ? subSchemaFields : legacyPropertyFields;

  return fields
    .map((entry) => {
      if (typeof entry !== "object" || entry === null) {
        return null;
      }

      const key = "key" in entry ? (entry as { key?: unknown }).key : undefined;
      const type = "type" in entry ? (entry as { type?: unknown }).type : undefined;
      if (typeof key !== "string" || key.trim().length === 0) {
        return null;
      }

      const normalizedType =
        type === "string" || type === "number" || type === "boolean" ? type : null;
      if (!normalizedType) {
        return null;
      }

      const displayName =
        "displayName" in entry ? (entry as { displayName?: unknown }).displayName : undefined;
      const validation =
        "validation" in entry ? (entry as { validation?: unknown }).validation : undefined;
      const stringValidation =
        normalizedType === "string" ? toStringValidationState(validation) : null;
      const validationKind = stringValidation?.kind ?? "none";

      return {
        value: key,
        operandType: normalizedType,
        label: typeof displayName === "string" && displayName.trim().length > 0 ? displayName : key,
        description: `${normalizedType.toUpperCase()} · ${key}`,
        validationKind,
        allowedValues: stringValidation?.allowedValues ?? [],
      };
    })
    .filter(
      (
        entry,
      ): entry is {
        value: string;
        operandType: "string" | "number" | "boolean";
        label: string;
        description: string;
        validationKind: PlainStringValidationType;
        allowedValues: string[];
      } => entry !== null,
    );
}

function allowsConditionSubFieldTargeting(fact: WorkflowContextFactDefinitionItem | undefined) {
  return fact?.kind === "work_unit_draft_spec_fact" || isJsonScalarFact(fact);
}

function getPlainValueFactAllowedOperatorKeys(params: {
  fact: WorkflowContextFactDefinitionItem;
  subFieldKey: string | null;
  operand: WorkflowConditionOperand | null;
}) {
  const { fact, subFieldKey, operand } = params;
  if (fact.kind !== "plain_value_fact") {
    return null;
  }

  if (fact.valueType === "json") {
    if (!subFieldKey) {
      return new Set(["exists"]);
    }

    const matchedSubField = getPlainJsonSubFieldOptions(fact).find(
      (entry) => entry.value === subFieldKey,
    );

    if (operand?.operandType === "string") {
      if (matchedSubField?.validationKind === "path") {
        return new Set(["exists", "exists_in_repo"]);
      }

      if (matchedSubField?.validationKind === "allowed-values") {
        return new Set(["exists", "equals"]);
      }

      return new Set(["equals", "contains", "starts_with", "ends_with"]);
    }

    if (operand?.operandType === "number") {
      return new Set(["equals", "gt", "gte", "lt", "lte", "between"]);
    }

    if (operand?.operandType === "boolean") {
      return new Set(["equals"]);
    }

    return new Set<string>();
  }

  if (fact.valueType === "string") {
    const validationKind = getPlainStringValidationKind(fact);
    if (validationKind === "path") {
      return new Set(["exists", "exists_in_repo"]);
    }

    if (validationKind === "allowed-values") {
      return new Set(["exists", "equals"]);
    }

    return new Set(["exists", "equals", "contains", "starts_with", "ends_with"]);
  }

  if (fact.valueType === "number") {
    return new Set(["exists", "equals", "gt", "gte", "lt", "lte", "between"]);
  }

  if (fact.valueType === "boolean") {
    return new Set(["exists", "equals"]);
  }

  return null;
}

function getExternalFactAllowedOperatorKeys(params: {
  fact: WorkflowContextFactDefinitionItem;
  subFieldKey: string | null;
}) {
  const { fact, subFieldKey } = params;
  if (fact.kind !== "definition_backed_external_fact" && fact.kind !== "bound_external_fact") {
    return null;
  }

  if (fact.valueType === "json") {
    if (!subFieldKey) {
      return new Set(["exists"]);
    }

    const matchedSubField = getPlainJsonSubFieldOptions(fact).find(
      (entry) => entry.value === subFieldKey,
    );

    if (!matchedSubField) {
      return new Set<string>();
    }

    if (matchedSubField.operandType === "string") {
      if (matchedSubField.validationKind === "path") {
        return new Set(["exists", "exists_in_repo"]);
      }

      if (matchedSubField.validationKind === "allowed-values") {
        return new Set(["exists", "equals"]);
      }

      return new Set(["equals", "contains", "starts_with", "ends_with"]);
    }

    if (matchedSubField.operandType === "number") {
      return new Set(["equals", "gt", "gte", "lt", "lte", "between"]);
    }

    if (matchedSubField.operandType === "boolean") {
      return new Set(["equals"]);
    }

    return new Set<string>();
  }

  if (fact.valueType === "work_unit") {
    return new Set(["exists", "current_state"]);
  }

  if (fact.valueType === "string") {
    const validationKind = getExternalStringValidationKind(fact);
    if (validationKind === "path") {
      return new Set(["exists", "exists_in_repo"]);
    }

    if (validationKind === "allowed-values") {
      return new Set(["exists", "equals"]);
    }

    return new Set(["exists", "equals", "contains", "starts_with", "ends_with"]);
  }

  if (fact.valueType === "number") {
    return new Set(["exists", "equals", "gt", "gte", "lt", "lte", "between"]);
  }

  if (fact.valueType === "boolean") {
    return new Set(["exists", "equals"]);
  }

  if (fact.valueType === "json") {
    return new Set(["exists"]);
  }

  return null;
}

function resolveConditionOperandForEditor(
  fact: WorkflowContextFactDefinitionItem | undefined,
  subFieldKey: string | null | undefined,
) {
  if (!fact) {
    return null;
  }

  const scalarValueType =
    fact.valueType === "number" || fact.valueType === "boolean" || fact.valueType === "json"
      ? fact.valueType
      : fact.valueType === "work_unit" ||
          ((fact.kind === "definition_backed_external_fact" ||
            fact.kind === "bound_external_fact") &&
            typeof fact.workUnitDefinitionId === "string" &&
            fact.workUnitDefinitionId.trim().length > 0)
        ? "work_unit"
        : "string";

  const normalizedSubFieldKey = normalizeConditionSubFieldKey(subFieldKey);
  if (normalizedSubFieldKey) {
    if (isJsonScalarFact(fact)) {
      const matchedField = getPlainJsonSubFieldOptions(fact).find(
        (entry) => entry.value === normalizedSubFieldKey,
      );

      return matchedField
        ? {
            operandType: matchedField.operandType,
            cardinality: fact.cardinality,
            freshnessCapable: false,
          }
        : null;
    }

    if (fact.kind !== "work_unit_draft_spec_fact") {
      return null;
    }

    const matchedOption = getDraftSpecSubFieldOption(fact, normalizedSubFieldKey);
    return matchedOption
      ? {
          operandType: matchedOption.operandType,
          cardinality: matchedOption.cardinality,
          freshnessCapable: matchedOption.freshnessCapable,
        }
      : null;
  }

  switch (fact.kind) {
    case "plain_value_fact":
      return {
        operandType: fact.valueType === "json" ? "json_object" : (fact.valueType ?? "string"),
        cardinality: fact.cardinality,
        freshnessCapable: false,
      } as const;
    case "workflow_reference_fact":
      return {
        operandType: "workflow_reference" as const,
        cardinality: fact.cardinality,
        freshnessCapable: false,
      };
    case "artifact_reference_fact":
      return {
        operandType: "artifact_reference" as const,
        cardinality: fact.cardinality,
        freshnessCapable: true,
      };
    case "work_unit_draft_spec_fact":
      return {
        operandType: "work_unit" as const,
        cardinality: fact.cardinality,
        freshnessCapable: false,
      };
    case "definition_backed_external_fact":
    case "bound_external_fact":
      return {
        operandType: scalarValueType === "json" ? "json_object" : scalarValueType,
        cardinality: fact.cardinality,
        freshnessCapable: false,
      };
  }
}

function getCompatibleConditionOperators(
  conditionOperators: readonly WorkflowConditionOperator[],
  operand: WorkflowConditionOperand | null,
  fact: WorkflowContextFactDefinitionItem | undefined,
  subFieldKey: string | null,
) {
  if (!operand) {
    return [];
  }

  const base = conditionOperators.filter((operator) => operator.supportsOperand(operand));
  if (!fact) {
    return base;
  }

  if (fact.kind === "work_unit_draft_spec_fact") {
    const draftSpecOption = getDraftSpecSubFieldOption(fact, subFieldKey);
    if (!draftSpecOption) {
      return base.filter((operator) => new Set(["exists", "current_state"]).has(operator.key));
    }

    if (draftSpecOption?.operandType === "string") {
      if (draftSpecOption.validationKind === "path") {
        return base.filter((operator) => new Set(["exists", "exists_in_repo"]).has(operator.key));
      }

      if (draftSpecOption.validationKind === "allowed-values") {
        return base.filter((operator) => new Set(["exists", "equals"]).has(operator.key));
      }
    }

    return base;
  }

  const allowedForPlainFact = getPlainValueFactAllowedOperatorKeys({ fact, subFieldKey, operand });
  if (!allowedForPlainFact) {
    const allowedForExternalFact = getExternalFactAllowedOperatorKeys({ fact, subFieldKey });
    return allowedForExternalFact
      ? base.filter((operator) => allowedForExternalFact.has(operator.key))
      : base;
  }

  return base.filter((operator) => allowedForPlainFact.has(operator.key));
}

function createDefaultComparisonJson(
  operator: WorkflowConditionOperator | undefined,
  operand: WorkflowConditionOperand | null,
  fact?: WorkflowContextFactDefinitionItem,
  subFieldKey?: string | null,
) {
  if (!operator?.requiresComparison) {
    return null;
  }

  if (operator.key === "between") {
    return { min: 0, max: 0 };
  }

  if (operand?.operandType === "number") {
    return { value: 0 };
  }

  if (operand?.operandType === "boolean") {
    return { value: false };
  }

  const allowedValues = getConditionAllowedValues(fact, subFieldKey);
  if (operator.key === "equals" && allowedValues.length > 0) {
    return { value: allowedValues[0] ?? "" };
  }

  if (operand?.operandType === "workflow_reference" && fact?.kind === "workflow_reference_fact") {
    return { value: fact.allowedWorkflowDefinitionIds[0] ?? "" };
  }

  if (operator.key === "current_state") {
    return { value: getConditionCurrentStateValues(fact, subFieldKey)[0]?.value ?? "" };
  }

  return { value: "" };
}

function getConditionAllowedValues(
  fact: WorkflowContextFactDefinitionItem | undefined,
  subFieldKey?: string | null,
) {
  const normalizedSubFieldKey = normalizeConditionSubFieldKey(subFieldKey);
  if (fact?.kind === "work_unit_draft_spec_fact" && normalizedSubFieldKey) {
    return getDraftSpecSubFieldOption(fact, normalizedSubFieldKey)?.allowedValues ?? [];
  }

  if (normalizedSubFieldKey && isJsonScalarFact(fact)) {
    return (
      getPlainJsonSubFieldOptions(fact).find((entry) => entry.value === normalizedSubFieldKey)
        ?.allowedValues ?? []
    );
  }

  return getAllowedValues(fact?.validationJson);
}

function getConditionReferenceValues(fact: WorkflowContextFactDefinitionItem | undefined) {
  if (fact?.kind !== "workflow_reference_fact") {
    return [];
  }

  return fact.allowedWorkflowDefinitionIds
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function getConditionCurrentStateValues(
  fact: WorkflowContextFactDefinitionItem | undefined,
  subFieldKey?: string | null,
) {
  if (!fact) {
    return [];
  }

  if (fact.kind === "work_unit_draft_spec_fact") {
    const draftSpecSubField = getDraftSpecSubFieldOption(fact, subFieldKey);
    if (draftSpecSubField) {
      return draftSpecSubField.workUnitStateOptions ?? [];
    }

    return fact.workUnitStateOptions ?? [];
  }

  if (fact.kind !== "definition_backed_external_fact" && fact.kind !== "bound_external_fact") {
    return [];
  }

  return fact.workUnitStateOptions ?? [];
}

function getDraftSpecSubFieldOption(
  fact: WorkflowContextFactDefinitionItem | undefined,
  subFieldKey: string | null | undefined,
) {
  if (fact?.kind !== "work_unit_draft_spec_fact") {
    return null;
  }

  const normalizedSubFieldKey = normalizeConditionSubFieldKey(subFieldKey);
  if (!normalizedSubFieldKey) {
    return null;
  }

  return (
    fact.draftSpecSubFieldOptions?.find((option) => option.value === normalizedSubFieldKey) ?? null
  );
}

function getDraftSpecRootTargetLabel() {
  return "Targeting Work Unit Instance";
}

function getConditionNoteText(params: {
  fact: WorkflowContextFactDefinitionItem | undefined;
  subFieldKey: string | null;
  operator: WorkflowConditionOperator | undefined;
  operand: WorkflowConditionOperand | null;
}) {
  const { fact, subFieldKey, operator, operand } = params;
  if (!fact || !operator || !operand) {
    return null;
  }

  const normalizedSubFieldKey = normalizeConditionSubFieldKey(subFieldKey);
  const plainJsonSubField = normalizedSubFieldKey
    ? getPlainJsonSubFieldOptions(fact).find((entry) => entry.value === normalizedSubFieldKey)
    : null;
  const draftSpecSubField = getDraftSpecSubFieldOption(fact, normalizedSubFieldKey);
  const targetLabel =
    draftSpecSubField?.label ??
    plainJsonSubField?.label ??
    (fact.kind === "work_unit_draft_spec_fact" && !normalizedSubFieldKey
      ? getDraftSpecRootTargetLabel()
      : (normalizedSubFieldKey ?? fact.label ?? fact.key));
  const valueScopeLead =
    fact.cardinality === "many"
      ? `Condition passes when at least one runtime value for ${targetLabel} satisfies this rule.`
      : `Condition is evaluated against the runtime value for ${targetLabel}.`;

  if (fact.kind === "plain_value_fact") {
    if (fact.valueType === "json" && !normalizedSubFieldKey) {
      return operator.key === "exists"
        ? `${valueScopeLead} Root JSON conditions only check whether the container value exists.`
        : "Root JSON conditions only support container-level existence. Select a JSON sub-field to compare scalar values.";
    }

    if (operator.key === "exists_in_repo") {
      return `${valueScopeLead} Paths are treated as repo-relative when checking repository existence.`;
    }

    if (plainJsonSubField?.validationKind === "allowed-values" && operator.key === "equals") {
      return `${valueScopeLead} Comparison options come from the allowed values defined for this field.`;
    }

    if (plainJsonSubField?.validationKind === "path") {
      return `${valueScopeLead} This sub-field uses path semantics, so repository checks use normalized repo-relative paths.`;
    }

    switch (operator.key) {
      case "exists":
        return `${valueScopeLead} This checks whether a value is present at runtime.`;
      case "equals":
        return `${valueScopeLead} This checks for an exact match with the comparison value.`;
      case "contains":
        return `${valueScopeLead} This checks whether the runtime text contains the comparison text.`;
      case "starts_with":
        return `${valueScopeLead} This checks whether the runtime text starts with the comparison text.`;
      case "ends_with":
        return `${valueScopeLead} This checks whether the runtime text ends with the comparison text.`;
      case "gt":
      case "gte":
      case "lt":
      case "lte":
      case "between":
        return `${valueScopeLead} Numeric operators compare the selected runtime number against the authored threshold.`;
      default:
        return null;
    }
  }

  if (fact.kind === "definition_backed_external_fact" || fact.kind === "bound_external_fact") {
    if (fact.valueType === "json" && !normalizedSubFieldKey) {
      return operator.key === "exists"
        ? `${valueScopeLead} Root JSON conditions only check whether the container value exists.`
        : "Root JSON conditions only support container-level existence. Select a JSON sub-field to compare scalar values.";
    }

    if (plainJsonSubField?.validationKind === "allowed-values" && operator.key === "equals") {
      return `${valueScopeLead} Comparison options come from the allowed values defined for this field.`;
    }

    if (plainJsonSubField?.validationKind === "path") {
      return `${valueScopeLead} This sub-field uses path semantics, so repository checks use normalized repo-relative paths.`;
    }

    if (fact.valueType === "work_unit" && operator.key === "current_state") {
      return `${valueScopeLead} Comparison options come from the lifecycle states defined on the referenced work unit type, plus Activation for the pre-state before first activation.`;
    }

    if (operator.key === "exists_in_repo") {
      return `${valueScopeLead} Paths are treated as repo-relative when checking repository existence.`;
    }

    if (fact.valueType === "string" && getExternalStringValidationKind(fact) === "allowed-values") {
      return `${valueScopeLead} Comparison options come from the allowed values defined for the referenced external fact.`;
    }
  }

  if (fact.kind === "artifact_reference_fact" && operator.key === "fresh") {
    return "Fresh checks whether the referenced artifact was produced recently enough for the current workflow state.";
  }

  if (fact.kind === "work_unit_draft_spec_fact") {
    if (!normalizedSubFieldKey) {
      return operator.key === "current_state"
        ? `${valueScopeLead} Comparison options come from the lifecycle states defined on the targeted work unit.`
        : `${valueScopeLead} Root draft-spec conditions evaluate the targeted work unit instance rather than a nested fact payload.`;
    }

    if (draftSpecSubField?.kind === "artifact" && operator.key === "fresh") {
      return `${valueScopeLead} Fresh checks whether the targeted artifact instance was produced recently enough for the current workflow state.`;
    }

    if (draftSpecSubField?.validationKind === "allowed-values" && operator.key === "equals") {
      return `${valueScopeLead} Comparison options come from the allowed values defined for the targeted fact.`;
    }

    if (draftSpecSubField?.validationKind === "path") {
      return `${valueScopeLead} This targeted fact uses path semantics, so repository checks use normalized repo-relative paths.`;
    }

    return `${valueScopeLead} This rule evaluates the targeted draft-spec selection using its underlying fact type.`;
  }

  return null;
}

function reconcileBranchConditionDraft(params: {
  condition: WorkflowBranchRouteConditionPayload;
  fact: WorkflowContextFactDefinitionItem | undefined;
  nextContextFactDefinitionId?: string;
  nextSubFieldKey?: string | null;
  conditionOperators: readonly WorkflowConditionOperator[];
}) {
  const normalizedSubFieldKey = allowsConditionSubFieldTargeting(params.fact)
    ? normalizeConditionSubFieldKey(params.nextSubFieldKey ?? params.condition.subFieldKey)
    : null;
  const operand = resolveConditionOperandForEditor(params.fact, normalizedSubFieldKey);
  const compatibleOperators = getCompatibleConditionOperators(
    params.conditionOperators,
    operand,
    params.fact,
    normalizedSubFieldKey,
  );
  const nextOperator =
    compatibleOperators.find((operator) => operator.key === params.condition.operator) ??
    compatibleOperators[0];
  const nextComparisonJson =
    nextOperator &&
    operand &&
    nextOperator.validateComparison(params.condition.comparisonJson, operand)
      ? params.condition.comparisonJson
      : createDefaultComparisonJson(nextOperator, operand, params.fact, normalizedSubFieldKey);

  return {
    ...params.condition,
    contextFactDefinitionId:
      params.nextContextFactDefinitionId ?? params.condition.contextFactDefinitionId,
    subFieldKey: normalizedSubFieldKey,
    operator: nextOperator?.key ?? "exists",
    comparisonJson: nextComparisonJson,
  } satisfies WorkflowBranchRouteConditionPayload;
}

function getDraftSpecSubFieldOptions(fact: WorkflowContextFactDefinitionItem | undefined) {
  return fact?.kind === "work_unit_draft_spec_fact" ? (fact.draftSpecSubFieldOptions ?? []) : [];
}

function createEmptyBranchRouteGroup(): WorkflowBranchRouteGroupPayload {
  return {
    groupId: createLocalId("branch-group"),
    mode: "all",
    conditions: [createEmptyBranchRouteCondition()],
  };
}

function createEmptyBranchRoute(): WorkflowBranchRoutePayload {
  return {
    routeId: createLocalId("branch-route"),
    targetStepId: "",
    conditionMode: "all",
    groups: [createEmptyBranchRouteGroup()],
  };
}

function toBranchGuidance(
  guidance?: WorkflowBranchStepPayload["guidance"],
): WorkflowEditorGuidance {
  return {
    humanMarkdown: guidance?.human?.markdown ?? "",
    agentMarkdown: guidance?.agent?.markdown ?? "",
  };
}

function toBranchStepDialogSnapshot(params: {
  key: string;
  label: string;
  descriptionMarkdown: string;
  defaultTargetStepId: string | null;
  routes: readonly WorkflowBranchRoutePayload[];
  guidance: WorkflowEditorGuidance;
}): BranchStepDialogSnapshot {
  return {
    contract: {
      key: params.key,
      label: params.label,
      descriptionMarkdown: params.descriptionMarkdown,
      defaultTargetStepId: params.defaultTargetStepId,
    },
    routes: {
      routes: params.routes.map((route) => ({
        ...route,
        groups: route.groups.map((group) => ({
          ...group,
          conditions: group.conditions.map((condition) => ({ ...condition })),
        })),
      })),
    },
    guidance: {
      humanMarkdown: params.guidance.humanMarkdown,
      agentMarkdown: params.guidance.agentMarkdown,
    },
  };
}

function toRouteDialogSnapshot(route: WorkflowBranchRoutePayload): RouteDialogSnapshot {
  return {
    targetStepId: route.targetStepId,
    conditionMode: route.conditionMode,
    groups: route.groups.map((group) => ({
      ...group,
      conditions: group.conditions.map((condition) => ({ ...condition })),
    })),
  };
}

function toWorkflowBranchStepPayload(params: {
  key: string;
  label: string;
  descriptionMarkdown: string;
  defaultTargetStepId: string | null;
  routes: readonly WorkflowBranchRoutePayload[];
  guidance: WorkflowEditorGuidance;
}): WorkflowBranchStepPayload {
  const normalizedKey = params.key.trim();
  const normalizedLabel = params.label.trim();
  const normalizedDescription = params.descriptionMarkdown.trim();

  return {
    key: normalizedKey,
    ...(normalizedLabel.length > 0 ? { label: normalizedLabel } : {}),
    ...(normalizedDescription.length > 0
      ? { descriptionJson: { markdown: normalizedDescription } }
      : {}),
    guidance: {
      human: { markdown: params.guidance.humanMarkdown.trim() },
      agent: { markdown: params.guidance.agentMarkdown.trim() },
    },
    defaultTargetStepId: params.defaultTargetStepId,
    routes: params.routes.map((route) => ({
      ...route,
      targetStepId: route.targetStepId.trim(),
      groups: route.groups.map((group) => ({
        ...group,
        conditions: group.conditions.map((condition) => ({
          ...condition,
          contextFactDefinitionId: condition.contextFactDefinitionId.trim(),
          operator: condition.operator.trim(),
        })),
      })),
    })),
  };
}

function getConditionComparisonDisplayValue(condition: WorkflowBranchRouteConditionPayload) {
  const record = condition.comparisonJson as { value?: unknown } | null;
  if (typeof record?.value === "boolean") {
    return record.value ? "true" : "false";
  }

  return typeof record?.value === "undefined" ? "" : String(record.value);
}

function toComparisonScalar(rawValue: string, operand: WorkflowConditionOperand | null): unknown {
  if (operand?.operandType === "number") {
    const parsed = Number(rawValue);
    return Number.isFinite(parsed) ? parsed : rawValue;
  }

  if (operand?.operandType === "boolean") {
    return rawValue === "true";
  }

  return rawValue;
}

function createComparisonJsonForCondition(params: {
  operator: WorkflowConditionOperator | undefined;
  operand: WorkflowConditionOperand | null;
  rawValue?: string;
  minRawValue?: string;
  maxRawValue?: string;
}): unknown {
  if (!params.operator || !params.operator.requiresComparison) {
    return null;
  }

  if (params.operator.key === "between") {
    return {
      min: toComparisonScalar(params.minRawValue ?? "", params.operand),
      max: toComparisonScalar(params.maxRawValue ?? "", params.operand),
    };
  }

  return { value: toComparisonScalar(params.rawValue ?? "", params.operand) };
}

function RouteModeRadioGroup(props: {
  label: string;
  value: "all" | "any";
  onChange: (value: "all" | "any") => void;
  name: string;
}) {
  return (
    <div className="grid gap-2">
      <Label>{props.label}</Label>
      <RadioGroup
        value={props.value}
        onValueChange={(value) => value && props.onChange(value as "all" | "any")}
        className="grid gap-2 sm:grid-cols-2"
      >
        {(["all", "any"] as const).map((option) => (
          <div
            key={option}
            className="chiron-frame-flat flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-[0.12em]"
          >
            <RadioGroupItem value={option} name={props.name} />
            <span>{option}</span>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}

function RouteConditionComparisonField(props: {
  condition: WorkflowBranchRouteConditionPayload;
  fact: WorkflowContextFactDefinitionItem | undefined;
  subFieldKey: string | null;
  operand: WorkflowConditionOperand | null;
  operator: WorkflowConditionOperator | undefined;
  onChange: (comparisonJson: unknown) => void;
}) {
  if (!props.operator?.requiresComparison) {
    return (
      <p className="text-xs text-muted-foreground">
        This operator does not require comparison input.
      </p>
    );
  }

  const value = getConditionComparisonDisplayValue(props.condition);
  const allowedValues = getConditionAllowedValues(props.fact, props.subFieldKey);

  if (props.operator.key === "equals" && allowedValues.length > 0) {
    return (
      <Select
        value={allowedValues.includes(value) ? value : undefined}
        onValueChange={(nextValue) =>
          props.onChange(
            createComparisonJsonForCondition({
              operator: props.operator,
              operand: props.operand,
              rawValue: nextValue ?? "",
            }),
          )
        }
      >
        <SelectTrigger className="w-full rounded-none border-border/70 bg-background/50">
          <SelectValue placeholder="Select a value" />
        </SelectTrigger>
        <SelectContent className="rounded-none">
          {allowedValues.map((entry) => (
            <SelectItem key={entry} value={entry}>
              {entry}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  const workflowReferenceValues = getConditionReferenceValues(props.fact);
  if (workflowReferenceValues.length > 0) {
    return (
      <Select
        value={workflowReferenceValues.includes(value) ? value : undefined}
        onValueChange={(nextValue) =>
          props.onChange(
            createComparisonJsonForCondition({
              operator: props.operator,
              operand: props.operand,
              rawValue: nextValue ?? "",
            }),
          )
        }
      >
        <SelectTrigger className="w-full rounded-none border-border/70 bg-background/50">
          <SelectValue placeholder="Select a workflow" />
        </SelectTrigger>
        <SelectContent className="rounded-none">
          {workflowReferenceValues.map((entry) => (
            <SelectItem key={entry} value={entry}>
              {entry}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  const currentStateValues = getConditionCurrentStateValues(props.fact, props.subFieldKey);
  if (props.operator.key === "current_state" && currentStateValues.length > 0) {
    return (
      <Select
        value={currentStateValues.some((entry) => entry.value === value) ? value : undefined}
        onValueChange={(nextValue) =>
          props.onChange(
            createComparisonJsonForCondition({
              operator: props.operator,
              operand: props.operand,
              rawValue: nextValue ?? "",
            }),
          )
        }
      >
        <SelectTrigger className="w-full rounded-none border-border/70 bg-background/50">
          <SelectValue placeholder="Select a state" />
        </SelectTrigger>
        <SelectContent className="rounded-none" align="start" sideOffset={6}>
          {currentStateValues.map((entry) => (
            <SelectItem key={entry.value} value={entry.value}>
              {entry.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (props.operator.key === "between") {
    const record = props.condition.comparisonJson as { min?: unknown; max?: unknown } | null;

    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          aria-label="Comparison Minimum"
          type="number"
          className="rounded-none border-border/70 bg-background/50"
          value={typeof record?.min === "undefined" ? "" : String(record.min)}
          onChange={(event) =>
            props.onChange(
              createComparisonJsonForCondition({
                operator: props.operator,
                operand: props.operand,
                minRawValue: event.target.value,
                maxRawValue: typeof record?.max === "undefined" ? "" : String(record.max),
              }),
            )
          }
          placeholder="Minimum"
        />
        <Input
          aria-label="Comparison Maximum"
          type="number"
          className="rounded-none border-border/70 bg-background/50"
          value={typeof record?.max === "undefined" ? "" : String(record.max)}
          onChange={(event) =>
            props.onChange(
              createComparisonJsonForCondition({
                operator: props.operator,
                operand: props.operand,
                minRawValue: typeof record?.min === "undefined" ? "" : String(record.min),
                maxRawValue: event.target.value,
              }),
            )
          }
          placeholder="Maximum"
        />
      </div>
    );
  }

  if (props.operand?.operandType === "boolean") {
    return (
      <Select
        value={value}
        onValueChange={(nextValue) =>
          props.onChange(
            createComparisonJsonForCondition({
              operator: props.operator,
              operand: props.operand,
              rawValue: nextValue ?? "false",
            }),
          )
        }
      >
        <SelectTrigger className="w-full rounded-none border-border/70 bg-background/50">
          <SelectValue placeholder="Select a value" />
        </SelectTrigger>
        <SelectContent className="rounded-none">
          <SelectItem value="true">true</SelectItem>
          <SelectItem value="false">false</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  return (
    <Input
      aria-label="Comparison Value"
      type={props.operand?.operandType === "number" ? "number" : "text"}
      className="rounded-none border-border/70 bg-background/50"
      value={value}
      onChange={(event) =>
        props.onChange(
          createComparisonJsonForCondition({
            operator: props.operator,
            operand: props.operand,
            rawValue: event.target.value,
          }),
        )
      }
      placeholder="Comparison value"
    />
  );
}

export function RouteDialog({
  open,
  ownerStepId,
  route,
  availableSteps,
  availableContextFacts,
  conditionOperators,
  onOpenChange,
  onSave,
}: RouteDialogProps) {
  const [draft, setDraft] = useState<WorkflowBranchRoutePayload>(route ?? createEmptyBranchRoute());
  const [initialSnapshot, setInitialSnapshot] = useState<RouteDialogSnapshot | null>(null);
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [expandedGroupIds, setExpandedGroupIds] = useState<string[]>([]);

  const availableTargetSteps = useMemo(
    () => availableSteps.filter((step) => step.value !== ownerStepId),
    [availableSteps, ownerStepId],
  );
  const factsById = useMemo(
    () => new Map(availableContextFacts.map((fact) => [fact.contextFactDefinitionId, fact])),
    [availableContextFacts],
  );
  const factOptions = useMemo(
    () =>
      availableContextFacts.map((fact) => ({
        value: fact.contextFactDefinitionId,
        label: fact.label || fact.key,
        secondaryLabel: fact.key,
        description: fact.summary,
      })),
    [availableContextFacts],
  );

  useEffect(() => {
    if (!open) {
      setIsDiscardDialogOpen(false);
      setStatusMessage(null);
      return;
    }

    const nextDraft = route ? structuredClone(route) : createEmptyBranchRoute();
    setDraft(nextDraft);
    setInitialSnapshot(toRouteDialogSnapshot(nextDraft));
    setExpandedGroupIds(nextDraft.groups.map((group) => group.groupId));
    setIsDiscardDialogOpen(false);
    setStatusMessage(null);
  }, [open, route]);

  const currentSnapshot = useMemo(() => toRouteDialogSnapshot(draft), [draft]);
  const isDirty =
    open && initialSnapshot
      ? !areDialogSnapshotSectionsEqual(currentSnapshot, initialSnapshot)
      : false;

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (draft.targetStepId.trim().length === 0) {
      errors.push("Select a target step for this route.");
    }

    if (draft.groups.length === 0) {
      errors.push("Add at least one condition group.");
    }

    draft.groups.forEach((group, groupIndex) => {
      if (group.conditions.length === 0) {
        errors.push(`Add at least one condition to group ${groupIndex + 1}.`);
      }

      group.conditions.forEach((condition, conditionIndex) => {
        const operator = conditionOperators.find((entry) => entry.key === condition.operator);
        const fact = factsById.get(condition.contextFactDefinitionId);
        const normalizedSubFieldKey = allowsConditionSubFieldTargeting(fact)
          ? normalizeConditionSubFieldKey(condition.subFieldKey)
          : null;
        const operand = resolveConditionOperandForEditor(fact, normalizedSubFieldKey);
        if (condition.contextFactDefinitionId.trim().length === 0) {
          errors.push(
            `Select a context fact for condition ${conditionIndex + 1} in group ${groupIndex + 1}.`,
          );
          return;
        }

        if (!operand) {
          errors.push(
            `Select a valid operand for condition ${conditionIndex + 1} in group ${groupIndex + 1}.`,
          );
          return;
        }

        if (!operator) {
          errors.push(
            `Select an operator for condition ${conditionIndex + 1} in group ${groupIndex + 1}.`,
          );
          return;
        }

        if (
          !getCompatibleConditionOperators(
            conditionOperators,
            operand,
            fact,
            normalizedSubFieldKey,
          ).some((entry) => entry.key === operator.key)
        ) {
          errors.push(
            `Select a compatible operator for condition ${conditionIndex + 1} in group ${groupIndex + 1}.`,
          );
          return;
        }

        if (!operator.validateComparison(condition.comparisonJson, operand)) {
          errors.push(
            `Provide a valid comparison for condition ${conditionIndex + 1} in group ${groupIndex + 1}.`,
          );
        }
      });
    });

    return errors;
  }, [conditionOperators, draft, factsById]);

  const canSave = validationErrors.length === 0;

  const closeDialog = () => {
    setIsDiscardDialogOpen(false);
    onOpenChange(false);
  };

  const requestClose = () => {
    if (isDirty) {
      setIsDiscardDialogOpen(true);
      return;
    }

    closeDialog();
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            return;
          }

          requestClose();
        }}
      >
        <DialogContent className="chiron-cut-frame-thick flex w-[min(64rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] flex-col overflow-hidden p-6 sm:max-w-none">
          <form
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
            onSubmit={(event) => {
              event.preventDefault();
              if (!canSave) {
                setStatusMessage(validationErrors[0] ?? "Complete the route definition.");
                return;
              }

              onSave(draft);
              onOpenChange(false);
            }}
          >
            <DialogHeader className="shrink-0 gap-2">
              <DialogTitle className="text-base font-semibold uppercase tracking-[0.08em]">
                {route ? "Edit Route" : "Add Route"}
              </DialogTitle>
              <DialogDescription>
                Author route target, route-wide condition mode, groups, and operator-backed
                conditions.
              </DialogDescription>
            </DialogHeader>

            <div className="min-h-0 flex-1 overflow-y-auto py-4 pr-1 scrollbar-thin">
              {statusMessage ? (
                <p className="mb-4 border border-destructive/45 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {statusMessage}
                </p>
              ) : null}

              {!canSave ? (
                <p className="mb-4 border border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  {validationErrors[0]}
                </p>
              ) : null}

              <div className="grid gap-4">
                <section className="chiron-frame-flat chiron-tone-context grid gap-4 p-4">
                  <div className="grid gap-2">
                    <Label id="workflow-editor-branch-route-target-label">Target Step</Label>
                    <SearchableCombobox
                      labelId="workflow-editor-branch-route-target-label"
                      value={draft.targetStepId}
                      onChange={(value) => {
                        setDraft((previous) => ({ ...previous, targetStepId: value }));
                        setStatusMessage(null);
                      }}
                      options={availableTargetSteps}
                      placeholder="Select a target step"
                      searchPlaceholder="Search steps"
                      emptyLabel="No steps available."
                    />
                  </div>

                  <RouteModeRadioGroup
                    label="Condition Mode"
                    name={`workflow-editor-route-condition-mode-${draft.routeId}`}
                    value={draft.conditionMode}
                    onChange={(value) => {
                      setDraft((previous) => ({ ...previous, conditionMode: value }));
                      setStatusMessage(null);
                    }}
                  />
                </section>

                <section className="chiron-frame-flat chiron-tone-context grid gap-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="grid gap-1">
                      <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                        Groups
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Build nested condition groups for this route. Each group can require all or
                        any condition.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      className="rounded-none"
                      onClick={() => {
                        const nextGroup = createEmptyBranchRouteGroup();
                        setDraft((previous) => ({
                          ...previous,
                          groups: [...previous.groups, nextGroup],
                        }));
                        setExpandedGroupIds((previous) => [...previous, nextGroup.groupId]);
                        setStatusMessage(null);
                      }}
                    >
                      <PlusIcon className="size-3" /> Add Group
                    </Button>
                  </div>

                  {draft.groups.map((group, groupIndex) => {
                    const isExpanded = expandedGroupIds.includes(group.groupId);

                    return (
                      <article
                        key={group.groupId}
                        className="chiron-cut-frame-thick chiron-tone-canvas grid gap-3 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <button
                            type="button"
                            className="grid gap-1 text-left"
                            onClick={() =>
                              setExpandedGroupIds((previous) =>
                                previous.includes(group.groupId)
                                  ? previous.filter((entry) => entry !== group.groupId)
                                  : [...previous, group.groupId],
                              )
                            }
                          >
                            <span className="font-geist-pixel-square text-sm uppercase tracking-[0.12em]">
                              Group {groupIndex + 1}
                            </span>
                            <span className="text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground">
                              {group.mode.toUpperCase()} · {group.conditions.length} condition
                              {group.conditions.length === 1 ? "" : "s"}
                            </span>
                          </button>
                          <Button
                            type="button"
                            size="xs"
                            variant="destructive"
                            className="rounded-none"
                            onClick={() =>
                              setDraft((previous) => ({
                                ...previous,
                                groups: previous.groups.filter(
                                  (entry) => entry.groupId !== group.groupId,
                                ),
                              }))
                            }
                          >
                            <XIcon className="size-3" /> Remove Group
                          </Button>
                        </div>

                        {isExpanded ? (
                          <div className="grid gap-4">
                            <RouteModeRadioGroup
                              label="Group Mode"
                              name={`workflow-editor-branch-group-mode-${group.groupId}`}
                              value={group.mode}
                              onChange={(value) =>
                                setDraft((previous) => ({
                                  ...previous,
                                  groups: previous.groups.map((entry) =>
                                    entry.groupId === group.groupId
                                      ? { ...entry, mode: value }
                                      : entry,
                                  ),
                                }))
                              }
                            />

                            <div className="grid gap-3">
                              {group.conditions.map((condition, conditionIndex) => {
                                const fact = factsById.get(condition.contextFactDefinitionId);
                                const normalizedSubFieldKey = allowsConditionSubFieldTargeting(fact)
                                  ? normalizeConditionSubFieldKey(condition.subFieldKey)
                                  : null;
                                const operand = resolveConditionOperandForEditor(
                                  fact,
                                  normalizedSubFieldKey,
                                );
                                const compatibleOperators = getCompatibleConditionOperators(
                                  conditionOperators,
                                  operand,
                                  fact,
                                  normalizedSubFieldKey,
                                );
                                const selectedOperator = compatibleOperators.find(
                                  (operator) => operator.key === condition.operator,
                                );
                                const draftSpecSubFieldOptions = getDraftSpecSubFieldOptions(fact);
                                const plainJsonSubFieldOptions = getPlainJsonSubFieldOptions(fact);
                                const conditionNoteText = getConditionNoteText({
                                  fact,
                                  subFieldKey: normalizedSubFieldKey,
                                  operator: selectedOperator,
                                  operand,
                                });

                                return (
                                  <div
                                    key={condition.conditionId}
                                    className="chiron-frame-flat grid gap-4 p-4"
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <p className="font-medium uppercase tracking-[0.12em]">
                                        Condition {conditionIndex + 1}
                                      </p>
                                      <Button
                                        type="button"
                                        size="xs"
                                        variant="destructive"
                                        className="rounded-none"
                                        onClick={() =>
                                          setDraft((previous) => ({
                                            ...previous,
                                            groups: previous.groups.map((entry) =>
                                              entry.groupId === group.groupId
                                                ? {
                                                    ...entry,
                                                    conditions: entry.conditions.filter(
                                                      (candidate) =>
                                                        candidate.conditionId !==
                                                        condition.conditionId,
                                                    ),
                                                  }
                                                : entry,
                                            ),
                                          }))
                                        }
                                      >
                                        Remove Condition
                                      </Button>
                                    </div>

                                    <div className="grid gap-4 lg:grid-cols-2">
                                      <div className="grid gap-2 lg:col-span-2">
                                        <Label
                                          id={`workflow-editor-branch-condition-fact-${condition.conditionId}`}
                                        >
                                          Context Fact
                                        </Label>
                                        <SearchableCombobox
                                          labelId={`workflow-editor-branch-condition-fact-${condition.conditionId}`}
                                          value={condition.contextFactDefinitionId}
                                          onChange={(value) => {
                                            const nextFact = factsById.get(value);
                                            setDraft((previous) => ({
                                              ...previous,
                                              groups: previous.groups.map((entry) =>
                                                entry.groupId === group.groupId
                                                  ? {
                                                      ...entry,
                                                      conditions: entry.conditions.map(
                                                        (candidate) =>
                                                          candidate.conditionId ===
                                                          condition.conditionId
                                                            ? reconcileBranchConditionDraft({
                                                                condition: candidate,
                                                                fact: nextFact,
                                                                nextContextFactDefinitionId: value,
                                                                nextSubFieldKey: null,
                                                                conditionOperators,
                                                              })
                                                            : candidate,
                                                      ),
                                                    }
                                                  : entry,
                                              ),
                                            }));
                                          }}
                                          options={factOptions}
                                          placeholder="Select a workflow context fact"
                                          searchPlaceholder="Search context facts"
                                          emptyLabel="No context facts available."
                                        />
                                      </div>

                                      {fact?.kind === "work_unit_draft_spec_fact" ||
                                      isJsonScalarFact(fact) ? (
                                        <div className="grid gap-2 lg:col-span-2">
                                          <Label
                                            htmlFor={`workflow-editor-branch-condition-sub-field-${condition.conditionId}`}
                                          >
                                            {fact?.kind === "work_unit_draft_spec_fact"
                                              ? "Draft-spec Sub-field"
                                              : "JSON Sub-field"}
                                          </Label>
                                          <Select
                                            value={normalizedSubFieldKey ?? "__root__"}
                                            onValueChange={(value) =>
                                              setDraft((previous) => ({
                                                ...previous,
                                                groups: previous.groups.map((entry) =>
                                                  entry.groupId === group.groupId
                                                    ? {
                                                        ...entry,
                                                        conditions: entry.conditions.map(
                                                          (candidate) =>
                                                            candidate.conditionId ===
                                                            condition.conditionId
                                                              ? reconcileBranchConditionDraft({
                                                                  condition: candidate,
                                                                  fact,
                                                                  nextSubFieldKey:
                                                                    value === "__root__"
                                                                      ? null
                                                                      : value,
                                                                  conditionOperators,
                                                                })
                                                              : candidate,
                                                        ),
                                                      }
                                                    : entry,
                                                ),
                                              }))
                                            }
                                          >
                                            <SelectTrigger
                                              id={`workflow-editor-branch-condition-sub-field-${condition.conditionId}`}
                                              className="w-full rounded-none border-border/70 bg-background/50"
                                            >
                                              <SelectValue
                                                placeholder={
                                                  fact?.kind === "work_unit_draft_spec_fact"
                                                    ? getDraftSpecRootTargetLabel()
                                                    : "Use whole JSON value"
                                                }
                                              />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-none">
                                              <SelectItem value="__root__">
                                                {fact?.kind === "work_unit_draft_spec_fact"
                                                  ? getDraftSpecRootTargetLabel()
                                                  : "Whole JSON value"}
                                              </SelectItem>
                                              {(fact?.kind === "work_unit_draft_spec_fact"
                                                ? draftSpecSubFieldOptions
                                                : plainJsonSubFieldOptions
                                              ).map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                  {option.label}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                          {fact?.kind === "work_unit_draft_spec_fact" ||
                                          condition.subFieldKey ? (
                                            <p className="text-[0.68rem] uppercase tracking-[0.08em] text-muted-foreground">
                                              {fact?.kind === "work_unit_draft_spec_fact"
                                                ? normalizedSubFieldKey
                                                  ? draftSpecSubFieldOptions.find(
                                                      (option) =>
                                                        option.value === normalizedSubFieldKey,
                                                    )?.description
                                                  : getDraftSpecRootTargetLabel()
                                                : plainJsonSubFieldOptions.find(
                                                    (option) =>
                                                      option.value === normalizedSubFieldKey,
                                                  )?.description}
                                            </p>
                                          ) : null}
                                        </div>
                                      ) : null}

                                      <div className="grid gap-2">
                                        <Label
                                          htmlFor={`workflow-editor-branch-condition-operator-${condition.conditionId}`}
                                        >
                                          Operator
                                        </Label>
                                        <Select
                                          value={condition.operator}
                                          onValueChange={(value) =>
                                            setDraft((previous) => ({
                                              ...previous,
                                              groups: previous.groups.map((entry) =>
                                                entry.groupId === group.groupId
                                                  ? {
                                                      ...entry,
                                                      conditions: entry.conditions.map(
                                                        (candidate) =>
                                                          candidate.conditionId ===
                                                          condition.conditionId
                                                            ? {
                                                                ...candidate,
                                                                operator:
                                                                  value ?? candidate.operator,
                                                                comparisonJson:
                                                                  createDefaultComparisonJson(
                                                                    compatibleOperators.find(
                                                                      (operator) =>
                                                                        operator.key ===
                                                                        (value ??
                                                                          candidate.operator),
                                                                    ),
                                                                    operand,
                                                                    fact,
                                                                    condition.subFieldKey,
                                                                  ),
                                                              }
                                                            : candidate,
                                                      ),
                                                    }
                                                  : entry,
                                              ),
                                            }))
                                          }
                                        >
                                          <SelectTrigger
                                            id={`workflow-editor-branch-condition-operator-${condition.conditionId}`}
                                            className="w-full rounded-none border-border/70 bg-background/50"
                                          >
                                            <SelectValue placeholder="Select an operator" />
                                          </SelectTrigger>
                                          <SelectContent className="rounded-none">
                                            {compatibleOperators.map((operator) => (
                                              <SelectItem key={operator.key} value={operator.key}>
                                                {operator.label}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      <div className="grid gap-2 lg:col-span-2">
                                        <Label>Comparison</Label>
                                        <RouteConditionComparisonField
                                          condition={condition}
                                          fact={fact}
                                          subFieldKey={condition.subFieldKey}
                                          operand={operand}
                                          operator={selectedOperator}
                                          onChange={(comparisonJson) =>
                                            setDraft((previous) => ({
                                              ...previous,
                                              groups: previous.groups.map((entry) =>
                                                entry.groupId === group.groupId
                                                  ? {
                                                      ...entry,
                                                      conditions: entry.conditions.map(
                                                        (candidate) =>
                                                          candidate.conditionId ===
                                                          condition.conditionId
                                                            ? { ...candidate, comparisonJson }
                                                            : candidate,
                                                      ),
                                                    }
                                                  : entry,
                                              ),
                                            }))
                                          }
                                        />
                                      </div>

                                      {conditionNoteText ? (
                                        <div className="lg:col-span-2">
                                          <p className="border border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                                            <span className="font-medium uppercase tracking-[0.12em] text-foreground">
                                              Condition Note
                                            </span>{" "}
                                            {conditionNoteText}
                                          </p>
                                        </div>
                                      ) : null}

                                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.12em]">
                                        <Checkbox
                                          checked={condition.isNegated}
                                          onCheckedChange={(checked) =>
                                            setDraft((previous) => ({
                                              ...previous,
                                              groups: previous.groups.map((entry) =>
                                                entry.groupId === group.groupId
                                                  ? {
                                                      ...entry,
                                                      conditions: entry.conditions.map(
                                                        (candidate) =>
                                                          candidate.conditionId ===
                                                          condition.conditionId
                                                            ? {
                                                                ...candidate,
                                                                isNegated: checked === true,
                                                              }
                                                            : candidate,
                                                      ),
                                                    }
                                                  : entry,
                                              ),
                                            }))
                                          }
                                        />
                                        NOT
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            <Button
                              type="button"
                              size="xs"
                              variant="outline"
                              className="justify-self-start rounded-none"
                              onClick={() =>
                                setDraft((previous) => ({
                                  ...previous,
                                  groups: previous.groups.map((entry) =>
                                    entry.groupId === group.groupId
                                      ? {
                                          ...entry,
                                          conditions: [
                                            ...entry.conditions,
                                            createEmptyBranchRouteCondition(),
                                          ],
                                        }
                                      : entry,
                                  ),
                                }))
                              }
                            >
                              <PlusIcon className="size-3" /> Add Condition
                            </Button>
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </section>
              </div>
            </div>

            <DialogFooter className="shrink-0 border-t border-border/70 pt-4 sm:justify-between">
              <Button
                type="button"
                variant="outline"
                className="rounded-none"
                onClick={requestClose}
              >
                Cancel
              </Button>
              <Button type="submit" className="rounded-none" disabled={!canSave}>
                Save Route
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
              You have unsaved route edits. Discarding now will close the stacked dialog and keep
              the parent Branch dialog open.
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

export function BranchStepDialog({
  open,
  mode,
  step,
  availableSteps,
  availableContextFacts,
  conditionOperators,
  onOpenChange,
  onSave,
  onDelete,
}: BranchStepDialogProps) {
  const branchStep = step?.stepType === "branch" ? step : undefined;
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [descriptionMarkdown, setDescriptionMarkdown] = useState("");
  const [defaultTargetStepId, setDefaultTargetStepId] = useState<string | null>(null);
  const [routes, setRoutes] = useState<WorkflowBranchRoutePayload[]>([]);
  const [guidance, setGuidance] = useState<WorkflowEditorGuidance>(normalizeGuidance());
  const [initialSnapshot, setInitialSnapshot] = useState<BranchStepDialogSnapshot | null>(null);
  const [activeTab, setActiveTab] = useState<BranchStepDialogTab>("contract");
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isRouteDialogOpen, setRouteDialogOpen] = useState(false);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);

  const availableTargetSteps = useMemo(
    () => availableSteps.filter((candidate) => candidate.value !== branchStep?.stepId),
    [availableSteps, branchStep?.stepId],
  );
  const stepLabelById = useMemo(
    () => new Map(availableSteps.map((option) => [option.value, option.label])),
    [availableSteps],
  );
  const editingRoute = useMemo(
    () => routes.find((route) => route.routeId === editingRouteId) ?? null,
    [editingRouteId, routes],
  );

  useEffect(() => {
    if (!open) {
      setIsDiscardDialogOpen(false);
      setRouteDialogOpen(false);
      setEditingRouteId(null);
      setStatusMessage(null);
      return;
    }

    const payload = branchStep?.payload;
    const nextKey = payload?.key ?? "";
    const nextLabel = payload?.label ?? "";
    const nextDescriptionMarkdown = payload?.descriptionJson?.markdown ?? "";
    const nextDefaultTargetStepId = payload?.defaultTargetStepId ?? null;
    const nextRoutes = payload?.routes ? structuredClone(payload.routes) : [];
    const nextGuidance = toBranchGuidance(payload?.guidance);

    setKey(nextKey);
    setLabel(nextLabel);
    setDescriptionMarkdown(nextDescriptionMarkdown);
    setDefaultTargetStepId(nextDefaultTargetStepId);
    setRoutes(nextRoutes);
    setGuidance(nextGuidance);
    setInitialSnapshot(
      toBranchStepDialogSnapshot({
        key: nextKey,
        label: nextLabel,
        descriptionMarkdown: nextDescriptionMarkdown,
        defaultTargetStepId: nextDefaultTargetStepId,
        routes: nextRoutes,
        guidance: nextGuidance,
      }),
    );
    setActiveTab("contract");
    setIsDiscardDialogOpen(false);
    setRouteDialogOpen(false);
    setEditingRouteId(null);
    setStatusMessage(null);
  }, [branchStep, open]);

  const currentSnapshot = useMemo(
    () =>
      toBranchStepDialogSnapshot({
        key,
        label,
        descriptionMarkdown,
        defaultTargetStepId,
        routes,
        guidance,
      }),
    [defaultTargetStepId, descriptionMarkdown, guidance, key, label, routes],
  );
  const isContractDirty =
    open && initialSnapshot
      ? !areDialogSnapshotSectionsEqual(currentSnapshot.contract, initialSnapshot.contract)
      : false;
  const isRoutesDirty =
    open && initialSnapshot
      ? !areDialogSnapshotSectionsEqual(currentSnapshot.routes, initialSnapshot.routes)
      : false;
  const isGuidanceDirty =
    open && initialSnapshot
      ? !areDialogSnapshotSectionsEqual(currentSnapshot.guidance, initialSnapshot.guidance)
      : false;
  const isDialogDirty = isContractDirty || isRoutesDirty || isGuidanceDirty;

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (key.trim().length === 0) {
      errors.push("Branch step key is required.");
    }

    const routeTargetIds = routes
      .map((route) => route.targetStepId.trim())
      .filter((value) => value.length > 0);
    if (new Set(routeTargetIds).size !== routeTargetIds.length) {
      errors.push("Each branch route must target a unique step.");
    }

    routes.forEach((route, routeIndex) => {
      if (route.targetStepId.trim().length === 0) {
        errors.push(`Select a target step for route ${routeIndex + 1}.`);
      }
      if (route.groups.length === 0) {
        errors.push(`Add at least one group to route ${routeIndex + 1}.`);
      }
    });

    return errors;
  }, [key, routes]);

  const canSave = validationErrors.length === 0;
  const title =
    mode === "create" ? "Create Branch Step" : `Edit Branch Step: ${branchStep?.payload.key ?? ""}`;

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
        <DialogContent className="chiron-cut-frame-thick flex w-[min(68rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] flex-col overflow-hidden p-6 sm:max-w-none sm:p-8">
          <form
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
            onSubmit={(event) => {
              event.preventDefault();
              if (!canSave) {
                setStatusMessage(validationErrors[0] ?? "Complete the branch configuration.");
                return;
              }

              onSave(
                toWorkflowBranchStepPayload({
                  key,
                  label,
                  descriptionMarkdown,
                  defaultTargetStepId,
                  routes,
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
                Author branch contract, default target, conditional routes, and audience guidance in
                one dialog.
              </DialogDescription>
              <div className="mt-1 flex flex-wrap gap-2 border-b border-border pb-3">
                <TabButton
                  active={activeTab === "contract"}
                  onClick={() => setActiveTab("contract")}
                  isDirty={isContractDirty}
                >
                  Contract
                </TabButton>
                <TabButton
                  active={activeTab === "routes"}
                  onClick={() => setActiveTab("routes")}
                  isDirty={isRoutesDirty}
                >
                  Routes
                </TabButton>
                <TabButton
                  active={activeTab === "guidance"}
                  onClick={() => setActiveTab("guidance")}
                  isDirty={isGuidanceDirty}
                >
                  Guidance
                </TabButton>
              </div>
            </DialogHeader>

            <div className="min-h-0 flex-1 overflow-y-auto py-4 pr-1 scrollbar-thin">
              {statusMessage ? (
                <p className="mb-4 border border-destructive/45 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {statusMessage}
                </p>
              ) : null}

              {!canSave ? (
                <p className="mb-4 border border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  {validationErrors[0]}
                </p>
              ) : null}

              {activeTab === "contract" ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="grid gap-2 lg:col-span-2">
                    <Label htmlFor="workflow-editor-branch-step-key">Step Key</Label>
                    <Input
                      id="workflow-editor-branch-step-key"
                      className="rounded-none border-border/70 bg-background/50"
                      value={key}
                      onChange={(event) => setKey(event.target.value)}
                      placeholder="branch-on-status"
                    />
                  </div>
                  <div className="grid gap-2 lg:col-span-2">
                    <Label htmlFor="workflow-editor-branch-step-label">Step Title</Label>
                    <Input
                      id="workflow-editor-branch-step-label"
                      className="rounded-none border-border/70 bg-background/50"
                      value={label}
                      onChange={(event) => setLabel(event.target.value)}
                      placeholder="Branch on Status"
                    />
                  </div>
                  <div className="grid gap-2 lg:col-span-2">
                    <Label htmlFor="workflow-editor-branch-step-description">
                      Step Description
                    </Label>
                    <Textarea
                      id="workflow-editor-branch-step-description"
                      className="min-h-36 resize-none rounded-none border-border/70 bg-background/50"
                      value={descriptionMarkdown}
                      onChange={(event) => setDescriptionMarkdown(event.target.value)}
                      placeholder="Markdown description for this Branch step"
                    />
                  </div>
                  <div className="grid gap-2 lg:col-span-2">
                    <Label id="workflow-editor-branch-default-target-label">
                      Default Target Step
                    </Label>
                    <SearchableCombobox
                      labelId="workflow-editor-branch-default-target-label"
                      value={defaultTargetStepId ?? ""}
                      onChange={(value) => setDefaultTargetStepId(value || null)}
                      options={availableTargetSteps}
                      placeholder="Select a default target"
                      searchPlaceholder="Search steps"
                      emptyLabel="No steps available."
                    />
                  </div>
                </div>
              ) : null}

              {activeTab === "routes" ? (
                <div className="grid gap-4">
                  <section className="chiron-frame-flat chiron-tone-context grid gap-3 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="grid gap-1">
                        <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                          Routes
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Conditional routes own the projected branch edges in the workflow canvas.
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        className="rounded-none"
                        onClick={() => {
                          setEditingRouteId(null);
                          setRouteDialogOpen(true);
                        }}
                      >
                        <PlusIcon className="size-3" /> Add Route
                      </Button>
                    </div>

                    {routes.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No conditional routes authored yet.
                      </p>
                    ) : (
                      <div className="grid gap-3">
                        {routes.map((route) => (
                          <article
                            key={route.routeId}
                            className="chiron-cut-frame-thick chiron-tone-canvas grid gap-3 p-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="grid gap-1">
                                <p className="font-geist-pixel-square text-sm uppercase tracking-[0.12em]">
                                  {stepLabelById.get(route.targetStepId) ?? route.targetStepId}
                                </p>
                                <p className="text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground">
                                  {route.routeId}
                                </p>
                              </div>
                              <span className="inline-flex w-fit items-center rounded-none border border-border/70 px-2 py-1 text-[0.64rem] uppercase tracking-[0.12em] text-muted-foreground">
                                {route.conditionMode}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {route.groups.length} group{route.groups.length === 1 ? "" : "s"} ·{" "}
                              {route.groups.reduce(
                                (count, group) => count + group.conditions.length,
                                0,
                              )}{" "}
                              condition
                              {route.groups.reduce(
                                (count, group) => count + group.conditions.length,
                                0,
                              ) === 1
                                ? ""
                                : "s"}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="xs"
                                variant="outline"
                                className="rounded-none"
                                onClick={() => {
                                  setEditingRouteId(route.routeId);
                                  setRouteDialogOpen(true);
                                }}
                              >
                                Edit Route
                              </Button>
                              <Button
                                type="button"
                                size="xs"
                                variant="destructive"
                                className="rounded-none"
                                onClick={() =>
                                  setRoutes((previous) =>
                                    previous.filter((entry) => entry.routeId !== route.routeId),
                                  )
                                }
                              >
                                Delete Route
                              </Button>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
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
                  onClick={requestCloseDialog}
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

      <Dialog open={isDiscardDialogOpen} onOpenChange={setIsDiscardDialogOpen}>
        <DialogContent className="chiron-cut-frame-thick w-[min(28rem,calc(100vw-2rem))] p-8 sm:max-w-none">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold uppercase tracking-[0.08em]">
              Discard unsaved changes?
            </DialogTitle>
            <DialogDescription>
              You have unsaved branch-step edits. Discarding now will close the dialog and lose
              those changes.
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

      <RouteDialog
        open={isRouteDialogOpen}
        ownerStepId={branchStep?.stepId}
        route={editingRoute}
        availableSteps={availableTargetSteps}
        availableContextFacts={availableContextFacts}
        conditionOperators={conditionOperators}
        onOpenChange={(nextOpen) => {
          setRouteDialogOpen(nextOpen);
          if (!nextOpen) {
            setEditingRouteId(null);
          }
        }}
        onSave={(nextRoute) => {
          setRoutes((previous) => {
            const existingIndex = previous.findIndex(
              (entry) => entry.routeId === nextRoute.routeId,
            );
            if (existingIndex === -1) {
              return [...previous, nextRoute];
            }

            return previous.map((entry) =>
              entry.routeId === nextRoute.routeId ? nextRoute : entry,
            );
          });
          setEditingRouteId(null);
          setRouteDialogOpen(false);
        }}
      />
    </>
  );
}

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
  steps: readonly WorkflowEditorStep[];
  onOpenChange: (open: boolean) => void;
  onSave: (nextMetadata: WorkflowEditorMetadata) => Promise<void> | void;
};

function WorkflowStepOptionBadge({ step }: { step: WorkflowEditorStep }) {
  return (
    <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-[0.62rem] uppercase tracking-[0.12em] text-sky-200">
      <img
        src={`/visuals/workflow-editor/step-types/asset-${STEP_TYPE_ICON_CODES[step.stepType]}.svg`}
        alt=""
        aria-hidden="true"
        className="size-3.5 shrink-0 object-contain invert brightness-150 contrast-125"
      />
      <span>{STEP_TYPE_LABELS[step.stepType]}</span>
    </span>
  );
}

export function WorkflowMetadataDialog({
  open,
  metadata,
  steps,
  onOpenChange,
  onSave,
}: WorkflowMetadataDialogProps) {
  const [key, setKey] = useState(metadata.key);
  const [displayName, setDisplayName] = useState(metadata.displayName);
  const [descriptionMarkdown, setDescriptionMarkdown] = useState(metadata.descriptionMarkdown);
  const [entryStepId, setEntryStepId] = useState<string | null>(metadata.entryStepId);

  useEffect(() => {
    if (!open) {
      return;
    }
    setKey(metadata.key);
    setDisplayName(metadata.displayName);
    setDescriptionMarkdown(metadata.descriptionMarkdown);
    setEntryStepId(metadata.entryStepId);
  }, [metadata, open]);

  const normalizedDisplayName = useMemo(() => displayName.trim(), [displayName]);
  const selectedEntryStep = useMemo(
    () => steps.find((step) => step.stepId === entryStepId) ?? null,
    [entryStepId, steps],
  );

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
              entryStepId,
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
              <Label htmlFor="workflow-editor-metadata-entry-step">Entry Step</Label>
              <Select
                value={entryStepId ?? "__none__"}
                onValueChange={(value) => setEntryStepId(value === "__none__" ? null : value)}
              >
                <SelectTrigger
                  id="workflow-editor-metadata-entry-step"
                  className="h-auto min-h-8 w-full"
                >
                  <span className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left">
                    <span className="grid min-w-0 gap-0.5">
                      <span className="truncate text-xs text-foreground">
                        {selectedEntryStep
                          ? selectedEntryStep.payload.label?.trim() || selectedEntryStep.payload.key
                          : "No entry step selected"}
                      </span>
                      <span className="truncate text-[0.64rem] uppercase tracking-[0.12em] text-muted-foreground">
                        {selectedEntryStep
                          ? selectedEntryStep.payload.key
                          : "Workflow starts with no explicit entry"}
                      </span>
                    </span>
                    {selectedEntryStep ? (
                      <WorkflowStepOptionBadge step={selectedEntryStep} />
                    ) : null}
                  </span>
                </SelectTrigger>
                <SelectContent align="start" className="w-[var(--anchor-width)]">
                  <SelectItem value="__none__">
                    <span className="grid min-w-0 gap-0.5">
                      <span>No entry step</span>
                      <span className="text-[0.64rem] uppercase tracking-[0.12em] text-muted-foreground">
                        Clear explicit entry selection
                      </span>
                    </span>
                  </SelectItem>
                  {steps.map((step) => (
                    <SelectItem key={step.stepId} value={step.stepId}>
                      <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                        <span className="grid min-w-0 gap-0.5">
                          <span className="truncate text-xs text-foreground">
                            {step.payload.label?.trim() || step.payload.key}
                          </span>
                          <span className="truncate text-[0.64rem] uppercase tracking-[0.12em] text-muted-foreground">
                            {step.payload.key}
                          </span>
                        </span>
                        <WorkflowStepOptionBadge step={step} />
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[0.68rem] text-muted-foreground">
                {selectedEntryStep
                  ? `Current entry: ${selectedEntryStep.payload.label?.trim() || selectedEntryStep.payload.key}`
                  : "Choose which workflow step should be treated as the entry step."}
              </p>
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
