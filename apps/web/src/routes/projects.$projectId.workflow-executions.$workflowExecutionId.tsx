import { useMemo, useState } from "react";

import { useMutation, useQueries, useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

import {
  RuntimeConfirmDialog,
  RuntimeFactValueDialog,
  type RuntimeDialogEditor,
  type RuntimeDraftSpecArtifactDefinition,
  type RuntimeDraftSpecFieldDefinition,
  type RuntimeFactOption,
  type RuntimePrimitiveDefinition,
} from "@/components/runtime/runtime-fact-dialogs";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";
import { showSingletonAutoAttachWarnings } from "@/features/projects/singleton-auto-attach-warning-toast";
import {
  DetailCode,
  DetailEyebrow,
  DetailLabel,
  DetailPrimary,
  ExecutionBadge,
  getExecutionStatusTone,
  getStepTypeTone,
} from "@/features/projects/execution-detail-visuals";
import {
  WorkflowStepSurfaceGraph,
  type WorkflowStepGraphBranchSelection,
  type WorkflowStepGraphDefinitionEdge,
  type WorkflowStepGraphDefinitionStep,
  type WorkflowStepGraphRuntimeExecution,
} from "@/features/projects/workflow-step-surface-graph";
import { cn } from "@/lib/utils";

const runtimeGuidanceActiveQueryKey = (projectId: string) =>
  ["runtime-guidance-active", projectId] as const;
const runtimeActiveWorkflowsQueryKey = (projectId: string) =>
  ["runtime-active-workflows", projectId] as const;

export const runtimeWorkflowExecutionDetailQueryKey = (
  projectId: string,
  workflowExecutionId: string,
) => ["runtime-workflow-execution-detail", projectId, workflowExecutionId] as const;

export const runtimeWorkflowExecutionShellQueryKey = (
  projectId: string,
  workflowExecutionId: string,
) => runtimeWorkflowExecutionDetailQueryKey(projectId, workflowExecutionId);

type WorkflowContextFactInstance = {
  contextFactInstanceId?: string | undefined;
  instanceOrder: number;
  valueJson: unknown;
  sourceStepExecutionId?: string | undefined;
  recordedAt?: string | undefined;
};

type WorkflowContextFactGroup = {
  contextFactDefinitionId: string;
  definitionKey?: string | undefined;
  definitionLabel?: string | undefined;
  definitionDescriptionJson?: unknown;
  instances: readonly WorkflowContextFactInstance[];
};

type WorkflowContextDefinition =
  | {
      kind: "plain_fact";
      contextFactDefinitionId: string;
      key: string;
      label?: string;
      descriptionJson?: unknown;
      cardinality: "one" | "many";
      valueType: "string" | "number" | "boolean" | "json";
      validationJson?: unknown;
    }
  | {
      kind: "plain_value_fact";
      contextFactDefinitionId: string;
      key: string;
      label?: string;
      descriptionJson?: unknown;
      cardinality: "one" | "many";
      valueType: "string" | "number" | "boolean" | "json";
      validationJson?: unknown;
    }
  | {
      kind: "bound_fact";
      contextFactDefinitionId: string;
      key: string;
      label?: string;
      descriptionJson?: unknown;
      cardinality: "one" | "many";
      factDefinitionId: string;
      valueType?: "string" | "number" | "boolean" | "json" | "work_unit";
      workUnitDefinitionId?: string;
      validationJson?: unknown;
    }
  | {
      kind: "workflow_ref_fact";
      contextFactDefinitionId: string;
      key: string;
      label?: string;
      descriptionJson?: unknown;
      cardinality: "one" | "many";
      allowedWorkflowDefinitionIds: string[];
    }
  | {
      kind: "artifact_slot_reference_fact";
      contextFactDefinitionId: string;
      key: string;
      label?: string;
      descriptionJson?: unknown;
      cardinality: "one" | "many";
      slotDefinitionId: string;
    }
  | {
      kind: "work_unit_draft_spec_fact";
      contextFactDefinitionId: string;
      key: string;
      label?: string;
      descriptionJson?: unknown;
      cardinality: "one" | "many";
      workUnitDefinitionId: string;
      selectedWorkUnitFactDefinitionIds: string[];
      selectedArtifactSlotDefinitionIds: string[];
    };

type FactDefinitionCatalogEntry = {
  id: string;
  label: string;
  definition: RuntimePrimitiveDefinition;
};

type WorkUnitCatalogEntry = {
  id?: string;
  label: string;
};

type BoundFactSourceDescriptor = {
  contextFactDefinitionId: string;
  factDefinitionId: string;
  resolvedFactDefinitionId: string;
  source: "project" | "work_unit";
};

type AccentTone = "slate" | "sky" | "emerald" | "amber" | "rose" | "violet" | "lime";

type WorkflowContextFactBadge = {
  label: string;
  tone: AccentTone;
};

type WorkflowContextFactPresentation = {
  kindBadge: WorkflowContextFactBadge;
  metadataBadges: WorkflowContextFactBadge[];
  detailRows: Array<{ label: string; value: string }>;
};

type WorkflowContextFilterKind = WorkflowContextDefinition["kind"];
type WorkflowContextFilterCardinality = WorkflowContextDefinition["cardinality"];
type WorkflowContextInstanceFilter = "has_instance" | "no_instance";

const ACCENT_TONE_CLASSES: Record<AccentTone, string> = {
  slate: "border-slate-500/40 bg-slate-500/10 text-slate-200",
  sky: "border-sky-500/40 bg-sky-500/12 text-sky-200",
  emerald: "border-emerald-500/40 bg-emerald-500/12 text-emerald-200",
  amber: "border-amber-500/40 bg-amber-500/12 text-amber-200",
  rose: "border-rose-500/40 bg-rose-500/12 text-rose-200",
  violet: "border-violet-500/40 bg-violet-500/12 text-violet-200",
  lime: "border-lime-500/40 bg-lime-500/12 text-lime-200",
};

const WORKFLOW_CONTEXT_FILTER_KIND_ORDER: WorkflowContextFilterKind[] = [
  "plain_fact",
  "plain_value_fact",
  "bound_fact",
  "workflow_ref_fact",
  "artifact_slot_reference_fact",
  "work_unit_draft_spec_fact",
];

const WORKFLOW_CONTEXT_FILTER_CARDINALITY_ORDER: WorkflowContextFilterCardinality[] = [
  "one",
  "many",
];

const WORKFLOW_CONTEXT_INSTANCE_FILTER_ORDER: WorkflowContextInstanceFilter[] = [
  "has_instance",
  "no_instance",
];

type ArtifactSnapshotOptionsBySlot = Map<string, RuntimeFactOption[]>;

type WorkflowStepSurface =
  | {
      state: "entry_pending";
      entryStep: {
        stepDefinitionId: string;
        stepType: string;
        stepKey?: string;
        stepLabel?: string;
      };
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
      nextStep: {
        stepDefinitionId: string;
        stepType: string;
        stepKey?: string;
        stepLabel?: string;
      };
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

function formatTimestamp(value: string | undefined): string {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

function formatDescription(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "markdown" in value &&
    typeof (value as { markdown?: unknown }).markdown === "string"
  ) {
    return (value as { markdown: string }).markdown;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "[unserializable description]";
  }
}

function formatUnknown(value: unknown): string {
  if (value === null) {
    return "null";
  }

  if (value === undefined) {
    return "undefined";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "[unserializable]";
  }
}

function summarizeWorkflowContextValue(value: unknown): string {
  if (value === null || value === undefined) {
    return formatUnknown(value);
  }

  if (typeof value === "string") {
    return value.length > 140 ? `${value.slice(0, 137)}…` : value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "Empty list";
    }

    return `${value.length} item${value.length === 1 ? "" : "s"}`;
  }

  if (isPlainRecord(value)) {
    if (typeof value.relativePath === "string") {
      return value.relativePath;
    }

    if (typeof value.workflowDefinitionId === "string") {
      return value.workflowDefinitionId;
    }

    if (typeof value.projectWorkUnitId === "string") {
      return value.projectWorkUnitId;
    }

    if (typeof value.factInstanceId === "string") {
      return value.factInstanceId;
    }

    const keys = Object.keys(value);
    if (keys.length === 0) {
      return "Empty object";
    }

    if (keys.length === 1) {
      const key = keys[0]!;
      return `${key}: ${summarizeWorkflowContextValue(value[key])}`;
    }

    return `${keys.length} fields · ${keys.slice(0, 3).join(", ")}${keys.length > 3 ? "…" : ""}`;
  }

  return formatUnknown(value);
}

function getWorkflowContextInstanceKey(
  group: WorkflowContextFactGroup,
  instance: WorkflowContextFactInstance,
): string {
  return (
    instance.contextFactInstanceId ?? `${group.contextFactDefinitionId}-${instance.instanceOrder}`
  );
}

function renderWorkflowContextKind(kind: WorkflowContextDefinition["kind"]): string {
  switch (kind) {
    case "plain_fact":
      return "Plain fact";
    case "plain_value_fact":
      return "Plain value";
    case "bound_fact":
      return "Bound fact";
    case "workflow_ref_fact":
      return "Workflow ref";
    case "artifact_slot_reference_fact":
      return "Artifact ref";
    case "work_unit_draft_spec_fact":
      return "Draft spec";
  }
}

function renderWorkflowContextFilterKind(kind: WorkflowContextFilterKind): string {
  switch (kind) {
    case "plain_fact":
      return "Plain fact";
    case "plain_value_fact":
      return "Plain value";
    case "bound_fact":
      return "Bound fact";
    case "workflow_ref_fact":
      return "Workflow";
    case "artifact_slot_reference_fact":
      return "Artifact";
    case "work_unit_draft_spec_fact":
      return "Draft spec";
  }
}

function renderWorkflowContextCardinality(cardinality: WorkflowContextFilterCardinality): string {
  return cardinality === "one" ? "One" : "Many";
}

function renderWorkflowContextInstanceFilter(filter: WorkflowContextInstanceFilter): string {
  return filter === "has_instance" ? "Has instance" : "No instance";
}

function getWorkflowContextKindTone(kind: WorkflowContextDefinition["kind"]): AccentTone {
  switch (kind) {
    case "plain_fact":
    case "plain_value_fact":
      return "sky";
    case "bound_fact":
      return "lime";
    case "workflow_ref_fact":
      return "violet";
    case "artifact_slot_reference_fact":
      return "amber";
    case "work_unit_draft_spec_fact":
      return "emerald";
  }
}

export function filterWorkflowContextFactGroups(params: {
  groups: readonly WorkflowContextFactGroup[];
  contextDefinitions: Map<string, WorkflowContextDefinition>;
  keyFilter: string;
  kindFilters: readonly WorkflowContextFilterKind[];
  cardinalityFilters: readonly WorkflowContextFilterCardinality[];
  instanceFilters: readonly WorkflowContextInstanceFilter[];
}): WorkflowContextFactGroup[] {
  const {
    groups,
    contextDefinitions,
    keyFilter,
    kindFilters,
    cardinalityFilters,
    instanceFilters,
  } = params;
  const normalizedKeyFilter = keyFilter.trim().toLowerCase();

  return groups.filter((group) => {
    const matchesKey = (group.definitionKey ?? "").toLowerCase().includes(normalizedKeyFilter);
    if (!matchesKey) {
      return false;
    }

    const definition = contextDefinitions.get(group.contextFactDefinitionId);
    const kind = definition?.kind;
    if (kindFilters.length > 0 && (!kind || !kindFilters.includes(kind))) {
      return false;
    }

    const cardinality = definition?.cardinality;
    if (
      cardinalityFilters.length > 0 &&
      (!cardinality || !cardinalityFilters.includes(cardinality))
    ) {
      return false;
    }

    if (instanceFilters.length === 0) {
      return true;
    }

    const instanceState = group.instances.length > 0 ? "has_instance" : "no_instance";
    return instanceFilters.includes(instanceState);
  });
}

function renderValueTypeLabel(
  valueType: "string" | "number" | "boolean" | "json" | "work_unit",
): string {
  switch (valueType) {
    case "work_unit":
      return "work unit";
    default:
      return valueType;
  }
}

function getValueTypeTone(
  valueType: "string" | "number" | "boolean" | "json" | "work_unit",
): AccentTone {
  switch (valueType) {
    case "string":
      return "emerald";
    case "number":
      return "sky";
    case "boolean":
      return "violet";
    case "json":
      return "amber";
    case "work_unit":
      return "lime";
  }
}

function buildWorkflowContextFactPresentation(params: {
  definition: WorkflowContextDefinition | null;
  projectFactCatalog: Map<string, FactDefinitionCatalogEntry>;
  workUnitFactCatalog: Map<string, FactDefinitionCatalogEntry>;
  workUnitCatalog: Map<string, WorkUnitCatalogEntry>;
  workflowOptions: RuntimeFactOption[];
  artifactSlotCatalog: Map<string, WorkUnitCatalogEntry>;
}): WorkflowContextFactPresentation | null {
  const {
    definition,
    projectFactCatalog,
    workUnitFactCatalog,
    workUnitCatalog,
    workflowOptions,
    artifactSlotCatalog,
  } = params;
  if (!definition) {
    return null;
  }

  const metadataBadges: WorkflowContextFactBadge[] = [
    {
      label: definition.cardinality,
      tone: definition.cardinality === "one" ? "sky" : "violet",
    },
  ];
  const detailRows: Array<{ label: string; value: string }> = [];

  switch (definition.kind) {
    case "plain_fact":
    case "plain_value_fact": {
      metadataBadges.push({
        label: renderValueTypeLabel(definition.valueType),
        tone: getValueTypeTone(definition.valueType),
      });
      detailRows.push({ label: "Value type", value: renderValueTypeLabel(definition.valueType) });
      break;
    }
    case "bound_fact": {
      const projectFact = projectFactCatalog.get(definition.factDefinitionId) ?? null;
      const workUnitFact = workUnitFactCatalog.get(definition.factDefinitionId) ?? null;
      const resolvedFact = projectFact ?? workUnitFact;
      const resolvedValueType =
        definition.valueType ?? resolvedFact?.definition.factType ?? ("json" as const);

      metadataBadges.push({
        label: renderValueTypeLabel(resolvedValueType),
        tone: getValueTypeTone(resolvedValueType),
      });
      if (projectFact) {
        metadataBadges.push({ label: "project fact", tone: "lime" });
        detailRows.push({ label: "Bound to", value: `Project fact · ${projectFact.label}` });
      } else if (workUnitFact) {
        metadataBadges.push({ label: "current work unit fact", tone: "emerald" });
        detailRows.push({
          label: "Bound to",
          value: `Current work unit fact · ${workUnitFact.label}`,
        });
      } else {
        detailRows.push({ label: "Bound to", value: definition.factDefinitionId });
      }

      if (definition.workUnitDefinitionId) {
        detailRows.push({
          label: "Work unit",
          value:
            workUnitCatalog.get(definition.workUnitDefinitionId)?.label ??
            definition.workUnitDefinitionId,
        });
      }
      break;
    }
    case "workflow_ref_fact": {
      const allowedCount = definition.allowedWorkflowDefinitionIds.length;
      metadataBadges.push({
        label: `${allowedCount} allowed`,
        tone: allowedCount > 0 ? "violet" : "slate",
      });
      const allowedLabels = definition.allowedWorkflowDefinitionIds
        .map(
          (workflowDefinitionId) =>
            workflowOptions.find((option) => option.value === workflowDefinitionId)?.label ??
            workflowDefinitionId,
        )
        .slice(0, 3);
      detailRows.push({ label: "Allowed workflows", value: String(allowedCount) });
      if (allowedLabels.length > 0) {
        detailRows.push({
          label: "Examples",
          value: `${allowedLabels.join(", ")}${allowedCount > allowedLabels.length ? "…" : ""}`,
        });
      }
      break;
    }
    case "artifact_slot_reference_fact": {
      const slotLabel =
        artifactSlotCatalog.get(definition.slotDefinitionId)?.label ?? definition.slotDefinitionId;
      metadataBadges.push({ label: "artifact slot", tone: "amber" });
      detailRows.push({ label: "Attached slot", value: slotLabel });
      break;
    }
    case "work_unit_draft_spec_fact": {
      metadataBadges.push({ label: "draft spec", tone: "emerald" });
      detailRows.push({
        label: "Work unit",
        value:
          workUnitCatalog.get(definition.workUnitDefinitionId)?.label ??
          definition.workUnitDefinitionId,
      });
      detailRows.push({
        label: "Included facts",
        value: String(definition.selectedWorkUnitFactDefinitionIds.length),
      });
      detailRows.push({
        label: "Artifact slots",
        value: String(definition.selectedArtifactSlotDefinitionIds.length),
      });
      break;
    }
  }

  return {
    kindBadge: {
      label: renderWorkflowContextKind(definition.kind),
      tone: getWorkflowContextKindTone(definition.kind),
    },
    metadataBadges,
    detailRows,
  };
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }

  return String(error);
}

function renderWorkflowStatus(
  status: "active" | "completed" | "superseded" | "parent_superseded",
): string {
  switch (status) {
    case "active":
      return "Active";
    case "completed":
      return "Completed";
    case "parent_superseded":
      return "Parent superseded";
    default:
      return "Superseded";
  }
}

function renderStepSurfaceLabel(state: WorkflowStepSurface["state"]): string {
  switch (state) {
    case "entry_pending":
      return "Entry pending";
    case "active_step":
      return "Active step";
    case "next_pending":
      return "Next pending";
    case "terminal_no_next_step":
      return "Terminal";
    case "invalid_definition":
      return "Invalid definition";
  }
}

function renderStepLabel(step: { stepKey?: string; stepLabel?: string; stepType: string }): string {
  return step.stepLabel ?? step.stepKey ?? `${step.stepType} step`;
}

function renderWorkflowRoleLabel(role: string): string {
  return role.replaceAll("_", " ");
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readMarkdown(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (!isPlainRecord(value)) {
    return "";
  }

  return typeof value.markdown === "string" ? value.markdown : "";
}

function normalizeWorkflowStepType(
  value: unknown,
): WorkflowStepGraphDefinitionStep["stepType"] | null {
  switch (value) {
    case "form":
    case "agent":
    case "action":
    case "invoke":
    case "branch":
    case "display":
      return value;
    default:
      return null;
  }
}

function parseBranchProjectedEdgeMetadata(value: unknown): {
  edgeOwner: Extract<
    WorkflowStepGraphDefinitionEdge["kind"],
    "branch_default" | "branch_conditional"
  >;
  routeId?: string;
} | null {
  const record = isPlainRecord(value) ? value : null;
  if (!record) {
    return null;
  }

  if (record.edgeOwner !== "branch_default" && record.edgeOwner !== "branch_conditional") {
    return null;
  }

  return {
    edgeOwner: record.edgeOwner,
    ...(typeof record.routeId === "string" && record.routeId.trim().length > 0
      ? { routeId: record.routeId }
      : {}),
  };
}

function toWorkflowStepGraphDefinition(value: unknown): {
  steps: WorkflowStepGraphDefinitionStep[];
  edges: WorkflowStepGraphDefinitionEdge[];
} {
  if (!isPlainRecord(value)) {
    return { steps: [], edges: [] };
  }

  const rawSteps = Array.isArray(value.steps) ? value.steps : [];
  const steps = rawSteps.flatMap<WorkflowStepGraphDefinitionStep>((entry, index) => {
    const step = isPlainRecord(entry) ? entry : null;
    if (!step) {
      return [];
    }

    const stepType = normalizeWorkflowStepType(step.stepType ?? step.type);
    const payload = isPlainRecord(step.payload) ? step.payload : null;
    const stepDefinitionId = typeof step.stepId === "string" ? step.stepId : `step-${index}`;
    const stepKey =
      typeof payload?.key === "string"
        ? payload.key
        : typeof step.stepKey === "string"
          ? step.stepKey
          : stepDefinitionId;

    if (!stepType) {
      return [];
    }

    return [
      {
        stepDefinitionId,
        stepType,
        stepKey,
        ...(typeof payload?.label === "string"
          ? { stepLabel: payload.label }
          : typeof step.stepLabel === "string"
            ? { stepLabel: step.stepLabel }
            : {}),
        ...(readMarkdown(payload?.descriptionJson ?? step.descriptionJson ?? step.defaultMessage)
          ? {
              descriptionMarkdown: readMarkdown(
                payload?.descriptionJson ?? step.descriptionJson ?? step.defaultMessage,
              ),
            }
          : {}),
      },
    ];
  });

  const stepIdByKey = new Map(steps.map((step) => [step.stepKey, step.stepDefinitionId]));
  const rawEdges = Array.isArray(value.edges) ? value.edges : [];
  const edges = rawEdges.flatMap<WorkflowStepGraphDefinitionEdge>((entry, index) => {
    const edge = isPlainRecord(entry) ? entry : null;
    if (!edge || typeof edge.fromStepKey !== "string" || typeof edge.toStepKey !== "string") {
      return [];
    }

    const fromStepDefinitionId = stepIdByKey.get(edge.fromStepKey);
    const toStepDefinitionId = stepIdByKey.get(edge.toStepKey);
    if (!fromStepDefinitionId || !toStepDefinitionId) {
      return [];
    }

    const projectedMetadata = parseBranchProjectedEdgeMetadata(edge.descriptionJson);

    return [
      {
        edgeId:
          typeof edge.edgeId === "string"
            ? edge.edgeId
            : typeof edge.edgeKey === "string"
              ? edge.edgeKey
              : `edge-${index}`,
        fromStepDefinitionId,
        toStepDefinitionId,
        kind: projectedMetadata?.edgeOwner ?? "linear",
        ...(projectedMetadata?.routeId ? { routeId: projectedMetadata.routeId } : {}),
      },
    ];
  });

  return { steps, edges };
}

function getProjectPin(
  value: unknown,
): { methodologyId: string; methodologyVersionId: string } | null {
  if (!isPlainRecord(value) || !isPlainRecord(value.pin)) {
    return null;
  }

  return typeof value.pin.methodologyId === "string" &&
    typeof value.pin.methodologyVersionId === "string"
    ? {
        methodologyId: value.pin.methodologyId,
        methodologyVersionId: value.pin.methodologyVersionId,
      }
    : null;
}

function toRuntimeWorkUnitOptions(value: unknown): RuntimeFactOption[] {
  if (!isPlainRecord(value) || !Array.isArray(value.rows)) {
    return [];
  }

  return value.rows.flatMap((row) => {
    if (!isPlainRecord(row) || typeof row.projectWorkUnitId !== "string") {
      return [];
    }

    const displayIdentity = isPlainRecord(row.displayIdentity) ? row.displayIdentity : null;
    const primaryLabel =
      typeof displayIdentity?.primaryLabel === "string"
        ? displayIdentity.primaryLabel
        : row.projectWorkUnitId;
    const secondaryLabel =
      typeof displayIdentity?.secondaryLabel === "string" ? displayIdentity.secondaryLabel : null;

    return [
      {
        value: row.projectWorkUnitId,
        label: secondaryLabel ? `${primaryLabel} · ${secondaryLabel}` : primaryLabel,
      },
    ];
  });
}

function toWorkflowContextDefinitions(value: unknown): Map<string, WorkflowContextDefinition> {
  if (!isPlainRecord(value) || !Array.isArray(value.contextFacts)) {
    return new Map();
  }

  const definitions = new Map<string, WorkflowContextDefinition>();

  for (const entry of value.contextFacts) {
    if (!isPlainRecord(entry) || typeof entry.kind !== "string" || typeof entry.key !== "string") {
      continue;
    }

    const contextFactDefinitionId =
      typeof entry.contextFactDefinitionId === "string" ? entry.contextFactDefinitionId : null;
    const cardinality = entry.cardinality === "many" ? "many" : "one";
    if (!contextFactDefinitionId) {
      continue;
    }

    switch (entry.kind) {
      case "plain_fact":
      case "plain_value_fact":
        if (
          entry.valueType === "string" ||
          entry.type === "string" ||
          entry.valueType === "number" ||
          entry.type === "number" ||
          entry.valueType === "boolean" ||
          entry.type === "boolean" ||
          entry.valueType === "json" ||
          entry.type === "json"
        ) {
          const valueType: "string" | "number" | "boolean" | "json" =
            entry.valueType === "string" ||
            entry.valueType === "number" ||
            entry.valueType === "boolean" ||
            entry.valueType === "json"
              ? entry.valueType
              : (entry.type as "string" | "number" | "boolean" | "json");
          definitions.set(contextFactDefinitionId, {
            kind: entry.kind,
            contextFactDefinitionId,
            key: entry.key,
            ...(typeof entry.label === "string" ? { label: entry.label } : {}),
            ...(entry.descriptionJson !== undefined
              ? { descriptionJson: entry.descriptionJson }
              : {}),
            cardinality,
            valueType,
            ...(entry.validationJson !== undefined ? { validationJson: entry.validationJson } : {}),
          });
        }
        break;
      case "bound_fact":
        if (typeof entry.factDefinitionId === "string") {
          definitions.set(contextFactDefinitionId, {
            kind: entry.kind,
            contextFactDefinitionId,
            key: entry.key,
            ...(typeof entry.label === "string" ? { label: entry.label } : {}),
            ...(entry.descriptionJson !== undefined
              ? { descriptionJson: entry.descriptionJson }
              : {}),
            cardinality,
            factDefinitionId: entry.factDefinitionId,
            ...(entry.valueType === "string" ||
            entry.valueType === "number" ||
            entry.valueType === "boolean" ||
            entry.valueType === "json" ||
            entry.valueType === "work_unit"
              ? { valueType: entry.valueType }
              : {}),
            ...(typeof entry.workUnitDefinitionId === "string"
              ? { workUnitDefinitionId: entry.workUnitDefinitionId }
              : {}),
            ...(entry.validationJson !== undefined ? { validationJson: entry.validationJson } : {}),
          });
        }
        break;
      case "workflow_ref_fact":
        definitions.set(contextFactDefinitionId, {
          kind: entry.kind,
          contextFactDefinitionId,
          key: entry.key,
          ...(typeof entry.label === "string" ? { label: entry.label } : {}),
          ...(entry.descriptionJson !== undefined
            ? { descriptionJson: entry.descriptionJson }
            : {}),
          cardinality,
          allowedWorkflowDefinitionIds: Array.isArray(entry.allowedWorkflowDefinitionIds)
            ? entry.allowedWorkflowDefinitionIds.filter(
                (candidate): candidate is string => typeof candidate === "string",
              )
            : [],
        });
        break;
      case "artifact_slot_reference_fact":
        if (typeof entry.slotDefinitionId === "string") {
          definitions.set(contextFactDefinitionId, {
            kind: entry.kind,
            contextFactDefinitionId,
            key: entry.key,
            ...(typeof entry.label === "string" ? { label: entry.label } : {}),
            ...(entry.descriptionJson !== undefined
              ? { descriptionJson: entry.descriptionJson }
              : {}),
            cardinality,
            slotDefinitionId: entry.slotDefinitionId,
          });
        }
        break;
      case "work_unit_draft_spec_fact":
        if (typeof entry.workUnitDefinitionId === "string") {
          definitions.set(contextFactDefinitionId, {
            kind: entry.kind,
            contextFactDefinitionId,
            key: entry.key,
            ...(typeof entry.label === "string" ? { label: entry.label } : {}),
            ...(entry.descriptionJson !== undefined
              ? { descriptionJson: entry.descriptionJson }
              : {}),
            cardinality,
            workUnitDefinitionId: entry.workUnitDefinitionId,
            selectedWorkUnitFactDefinitionIds: Array.isArray(
              entry.selectedWorkUnitFactDefinitionIds,
            )
              ? entry.selectedWorkUnitFactDefinitionIds.filter(
                  (candidate): candidate is string => typeof candidate === "string",
                )
              : [],
            selectedArtifactSlotDefinitionIds: Array.isArray(
              entry.selectedArtifactSlotDefinitionIds,
            )
              ? entry.selectedArtifactSlotDefinitionIds.filter(
                  (candidate): candidate is string => typeof candidate === "string",
                )
              : [],
          });
        }
        break;
    }
  }

  return definitions;
}

function toProjectFactCatalog(value: unknown): Map<string, FactDefinitionCatalogEntry> {
  if (!isPlainRecord(value) || !Array.isArray(value.factDefinitions)) {
    return new Map();
  }

  return new Map(
    value.factDefinitions.flatMap((entry) => {
      if (!isPlainRecord(entry) || typeof entry.id !== "string" || typeof entry.key !== "string") {
        return [];
      }

      const factType =
        entry.valueType === "string" ||
        entry.valueType === "number" ||
        entry.valueType === "boolean" ||
        entry.valueType === "json" ||
        entry.valueType === "work_unit"
          ? entry.valueType
          : null;
      if (!factType) {
        return [];
      }

      const catalogEntry = {
        id: entry.id,
        label: typeof entry.name === "string" ? entry.name : entry.key,
        definition: {
          factType,
          ...(entry.validationJson !== undefined ? { validation: entry.validationJson } : {}),
        },
      } satisfies FactDefinitionCatalogEntry;

      return [
        [entry.id, catalogEntry],
        [entry.key, catalogEntry],
      ];
    }),
  );
}

function toWorkUnitFactCatalog(value: unknown): Map<string, FactDefinitionCatalogEntry> {
  if (!isPlainRecord(value) || !Array.isArray(value.workUnitTypes)) {
    return new Map();
  }

  return new Map(
    value.workUnitTypes.flatMap((workUnitType) => {
      if (!isPlainRecord(workUnitType) || !Array.isArray(workUnitType.factSchemas)) {
        return [];
      }

      return workUnitType.factSchemas.flatMap((entry) => {
        if (
          !isPlainRecord(entry) ||
          typeof entry.id !== "string" ||
          typeof entry.key !== "string"
        ) {
          return [];
        }

        const factType =
          entry.factType === "string" ||
          entry.factType === "number" ||
          entry.factType === "boolean" ||
          entry.factType === "json" ||
          entry.factType === "work_unit"
            ? entry.factType
            : null;
        if (!factType) {
          return [];
        }

        const catalogEntry = {
          id: entry.id,
          label: typeof entry.name === "string" ? entry.name : entry.key,
          definition: {
            factType,
            ...(entry.validationJson !== undefined ? { validation: entry.validationJson } : {}),
          },
        } satisfies FactDefinitionCatalogEntry;

        return [
          [entry.id, catalogEntry],
          [entry.key, catalogEntry],
        ];
      });
    }),
  );
}

function toWorkUnitCatalog(value: unknown): Map<string, WorkUnitCatalogEntry> {
  if (!isPlainRecord(value) || !Array.isArray(value.workUnitTypes)) {
    return new Map();
  }

  return new Map(
    value.workUnitTypes.flatMap((entry) => {
      if (!isPlainRecord(entry) || typeof entry.id !== "string" || typeof entry.key !== "string") {
        return [];
      }

      return [
        [
          entry.id,
          {
            id: entry.id,
            label: typeof entry.displayName === "string" ? entry.displayName : entry.key,
          } satisfies WorkUnitCatalogEntry,
        ],
        [
          entry.key,
          {
            id: entry.id,
            label: typeof entry.displayName === "string" ? entry.displayName : entry.key,
          } satisfies WorkUnitCatalogEntry,
        ],
      ];
    }),
  );
}

function toWorkflowOptions(value: unknown): RuntimeFactOption[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!isPlainRecord(entry) || typeof entry.id !== "string") {
      return [];
    }

    const key = typeof entry.key === "string" ? entry.key : entry.id;
    const name = typeof entry.name === "string" ? entry.name : key;
    return [{ value: entry.id, label: `${name} · ${key}` }];
  });
}

function toArtifactSlotCatalog(value: unknown): Map<string, WorkUnitCatalogEntry> {
  if (!Array.isArray(value)) {
    return new Map();
  }

  return new Map(
    value.flatMap((entry) => {
      if (!isPlainRecord(entry) || typeof entry.id !== "string") {
        return [];
      }

      const catalogEntry = {
        id: entry.id,
        label:
          typeof entry.displayName === "string"
            ? entry.displayName
            : typeof entry.key === "string"
              ? entry.key
              : entry.id,
      } satisfies WorkUnitCatalogEntry;

      return typeof entry.key === "string"
        ? [
            [entry.id, catalogEntry],
            [entry.key, catalogEntry],
          ]
        : [[entry.id, catalogEntry]];
    }),
  );
}

function toArtifactSnapshotOptionsBySlot(
  queries: ReadonlyArray<{ data?: unknown }>,
): ArtifactSnapshotOptionsBySlot {
  const result = new Map<string, RuntimeFactOption[]>();

  for (const query of queries) {
    if (!isPlainRecord(query.data) || !isPlainRecord(query.data.slotDefinition)) {
      continue;
    }

    const slotDefinitionId =
      typeof query.data.slotDefinition.slotDefinitionId === "string"
        ? query.data.slotDefinition.slotDefinitionId
        : null;
    if (!slotDefinitionId) {
      continue;
    }

    const options: RuntimeFactOption[] = [];
    if (
      isPlainRecord(query.data.currentArtifactInstance) &&
      query.data.currentArtifactInstance.exists === true
    ) {
      const artifactInstanceId =
        typeof query.data.currentArtifactInstance.artifactInstanceId === "string"
          ? query.data.currentArtifactInstance.artifactInstanceId
          : null;
      if (artifactInstanceId) {
        options.push({ value: artifactInstanceId, label: `Current · ${artifactInstanceId}` });
      }
    }

    result.set(slotDefinitionId, options);
  }

  return result;
}

function toProjectFactInstanceOptions(value: unknown): RuntimeFactOption[] {
  if (
    !isPlainRecord(value) ||
    !isPlainRecord(value.factDefinition) ||
    !isPlainRecord(value.currentState)
  ) {
    return [];
  }

  const factLabel =
    typeof value.factDefinition.factName === "string"
      ? value.factDefinition.factName
      : typeof value.factDefinition.factKey === "string"
        ? value.factDefinition.factKey
        : "Fact";

  if (!Array.isArray(value.currentState.values)) {
    return [];
  }

  return value.currentState.values.flatMap((entry, index) => {
    if (!isPlainRecord(entry) || typeof entry.instanceId !== "string") {
      return [];
    }

    const preview = "value" in entry ? formatUnknown(entry.value) : "";
    return [
      {
        value: entry.instanceId,
        label: `${factLabel} · ${preview || `Instance ${index + 1}`}`,
      },
    ];
  });
}

function toWorkUnitFactInstanceOptions(value: unknown): RuntimeFactOption[] {
  if (!isPlainRecord(value) || !isPlainRecord(value.factDefinition)) {
    return [];
  }

  const factLabel =
    typeof value.factDefinition.factName === "string"
      ? value.factDefinition.factName
      : typeof value.factDefinition.factKey === "string"
        ? value.factDefinition.factKey
        : "Fact";

  const primitiveValues =
    isPlainRecord(value.primitiveState) && Array.isArray(value.primitiveState.values)
      ? value.primitiveState.values.flatMap((entry, index) => {
          if (!isPlainRecord(entry) || typeof entry.workUnitFactInstanceId !== "string") {
            return [];
          }

          const preview = "value" in entry ? formatUnknown(entry.value) : "";
          return [
            {
              value: entry.workUnitFactInstanceId,
              label: `${factLabel} · ${preview || `Instance ${index + 1}`}`,
            },
          ];
        })
      : [];

  const dependencyValues =
    isPlainRecord(value.dependencyState) && Array.isArray(value.dependencyState.outgoing)
      ? value.dependencyState.outgoing.flatMap((entry) => {
          if (!isPlainRecord(entry) || typeof entry.workUnitFactInstanceId !== "string") {
            return [];
          }

          const counterpartLabel =
            typeof entry.counterpartLabel === "string"
              ? entry.counterpartLabel
              : typeof entry.counterpartProjectWorkUnitId === "string"
                ? entry.counterpartProjectWorkUnitId
                : entry.workUnitFactInstanceId;
          return [
            {
              value: entry.workUnitFactInstanceId,
              label: `${factLabel} · ${counterpartLabel}`,
            },
          ];
        })
      : [];

  return primitiveValues.length > 0 ? primitiveValues : dependencyValues;
}

function buildWorkflowContextDialogEditor(params: {
  definition: WorkflowContextDefinition;
  projectFactCatalog: Map<string, FactDefinitionCatalogEntry>;
  workUnitFactCatalog: Map<string, FactDefinitionCatalogEntry>;
  workUnitCatalog: Map<string, WorkUnitCatalogEntry>;
  workflowOptions: RuntimeFactOption[];
  artifactSlotCatalog: Map<string, WorkUnitCatalogEntry>;
  artifactSnapshotOptionsBySlot: ArtifactSnapshotOptionsBySlot;
  boundFactInstanceOptionsByContextFactDefinition: Map<string, RuntimeFactOption[]>;
  workUnitOptions: RuntimeFactOption[];
}): RuntimeDialogEditor | null {
  switch (params.definition.kind) {
    case "plain_fact":
    case "plain_value_fact":
      return {
        kind: "primitive",
        definition: {
          factType: params.definition.valueType,
          ...(params.definition.validationJson !== undefined
            ? { validation: params.definition.validationJson }
            : {}),
        },
      };
    case "bound_fact": {
      const resolvedDefinition =
        params.projectFactCatalog.get(params.definition.factDefinitionId) ??
        params.workUnitFactCatalog.get(params.definition.factDefinitionId) ??
        null;
      const instanceOptions =
        params.boundFactInstanceOptionsByContextFactDefinition.get(
          params.definition.contextFactDefinitionId,
        ) ?? [];

      return {
        kind: "bound_fact",
        instanceLabel: `${resolvedDefinition?.label ?? params.definition.factDefinitionId} instance ID`,
        instanceOptions,
        autoSelectSingleInstance:
          params.definition.cardinality === "one" && instanceOptions.length === 1,
        definition: resolvedDefinition?.definition ?? {
          factType: params.definition.valueType ?? "json",
          ...(params.definition.validationJson !== undefined
            ? { validation: params.definition.validationJson }
            : {}),
        },
        ...(resolvedDefinition?.definition.validation !== undefined
          ? {
              definition: {
                ...resolvedDefinition.definition,
                validationSourceLabel: "external fact",
              },
            }
          : {}),
        workUnitOptions: params.workUnitOptions,
      };
    }
    case "workflow_ref_fact":
      return {
        kind: "workflow_ref_fact",
        options: params.definition.allowedWorkflowDefinitionIds.map((workflowDefinitionId) => {
          return (
            params.workflowOptions.find((option) => option.value === workflowDefinitionId) ?? {
              value: workflowDefinitionId,
              label: workflowDefinitionId,
            }
          );
        }),
      };
    case "artifact_slot_reference_fact":
      return {
        kind: "artifact_slot_reference_fact",
        slotDefinitionId: params.definition.slotDefinitionId,
        slotLabel:
          params.artifactSlotCatalog.get(params.definition.slotDefinitionId)?.label ??
          params.definition.slotDefinitionId,
        options: params.artifactSnapshotOptionsBySlot.get(params.definition.slotDefinitionId) ?? [],
      };
    case "work_unit_draft_spec_fact": {
      const fields: RuntimeDraftSpecFieldDefinition[] =
        params.definition.selectedWorkUnitFactDefinitionIds.map((workUnitFactDefinitionId) => {
          const catalogEntry = params.workUnitFactCatalog.get(workUnitFactDefinitionId);
          return {
            workUnitFactDefinitionId,
            label: catalogEntry?.label ?? workUnitFactDefinitionId,
            definition: catalogEntry?.definition ?? { factType: "json" },
          };
        });

      const artifacts: RuntimeDraftSpecArtifactDefinition[] =
        params.definition.selectedArtifactSlotDefinitionIds.map((slotDefinitionId) => ({
          slotDefinitionId,
          label: params.artifactSlotCatalog.get(slotDefinitionId)?.label ?? slotDefinitionId,
        }));

      return {
        kind: "work_unit_draft_spec_fact",
        workUnitDefinitionId: params.definition.workUnitDefinitionId,
        workUnitLabel:
          params.workUnitCatalog.get(params.definition.workUnitDefinitionId)?.label ??
          params.definition.workUnitDefinitionId,
        fields,
        artifacts,
        workUnitOptions: params.workUnitOptions,
      };
    }
    default:
      if ((params.definition as { kind?: string }).kind === "artifact_slot_reference_fact") {
        return {
          kind: "artifact_slot_reference_fact",
          slotDefinitionId: (params.definition as { slotDefinitionId: string }).slotDefinitionId,
          slotLabel:
            params.artifactSlotCatalog.get(
              (params.definition as { slotDefinitionId: string }).slotDefinitionId,
            )?.label ?? (params.definition as { slotDefinitionId: string }).slotDefinitionId,
          options:
            params.artifactSnapshotOptionsBySlot.get(
              (params.definition as { slotDefinitionId: string }).slotDefinitionId,
            ) ?? [],
        };
      }
      return null;
  }
}

function WorkflowContextValuePresentation({ value }: { value: unknown }) {
  if (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return (
      <pre className="whitespace-pre-wrap break-words border border-border/70 bg-background/60 p-3 text-xs text-muted-foreground">
        {formatUnknown(value)}
      </pre>
    );
  }

  if (Array.isArray(value)) {
    return (
      <div className="space-y-2">
        {value.length === 0 ? (
          <p className="border border-border/70 bg-background/60 p-3 text-xs text-muted-foreground">
            Empty list
          </p>
        ) : (
          value.map((entry) => (
            <pre
              key={`value-${formatUnknown(entry)}`}
              className="whitespace-pre-wrap break-words border border-border/70 bg-background/60 p-3 text-xs text-muted-foreground"
            >
              {formatUnknown(entry)}
            </pre>
          ))
        )}
      </div>
    );
  }

  if (isPlainRecord(value)) {
    if (typeof value.relativePath === "string") {
      return (
        <dl className="grid gap-2 border border-border/70 bg-background/60 p-3 text-xs">
          <div>
            <dt className="text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
              Relative path
            </dt>
            <dd className="mt-1 break-all text-foreground">{value.relativePath}</dd>
          </div>
        </dl>
      );
    }

    if (typeof value.workflowDefinitionId === "string") {
      return (
        <dl className="grid gap-2 border border-border/70 bg-background/60 p-3 text-xs">
          <div>
            <dt className="text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
              Workflow definition ID
            </dt>
            <dd className="mt-1 break-all text-foreground">{value.workflowDefinitionId}</dd>
          </div>
        </dl>
      );
    }

    if (typeof value.projectWorkUnitId === "string") {
      return (
        <dl className="grid gap-2 border border-border/70 bg-background/60 p-3 text-xs">
          <div>
            <dt className="text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
              Project work unit ID
            </dt>
            <dd className="mt-1 break-all text-foreground">{value.projectWorkUnitId}</dd>
          </div>
        </dl>
      );
    }

    if (typeof value.factInstanceId === "string") {
      return (
        <dl className="grid gap-2 border border-border/70 bg-background/60 p-3 text-xs">
          <div>
            <dt className="text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
              Fact instance ID
            </dt>
            <dd className="mt-1 break-all text-foreground">{value.factInstanceId}</dd>
          </div>
        </dl>
      );
    }

    return (
      <dl className="grid gap-2 border border-border/70 bg-background/60 p-3 text-xs sm:grid-cols-2">
        {Object.entries(value).map(([key, entry]) => (
          <div key={key} className="space-y-1">
            <dt className="text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
              {key}
            </dt>
            <dd className="whitespace-pre-wrap break-words text-foreground">
              {formatUnknown(entry)}
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <pre className="whitespace-pre-wrap break-words border border-border/70 bg-background/60 p-3 text-xs text-muted-foreground">
      {formatUnknown(value)}
    </pre>
  );
}

export function WorkflowContextFactDialog({
  group,
  open,
  onOpenChange,
}: {
  group: WorkflowContextFactGroup;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const description = formatDescription(group.definitionDescriptionJson);
  const title = group.definitionLabel ?? group.definitionKey ?? group.contextFactDefinitionId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(85vh,48rem)] max-w-3xl overflow-hidden rounded-none border border-border/80 bg-background">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description ?? "Read-only workflow context instances for this definition."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 overflow-y-auto pr-1 text-xs">
          <section className="space-y-1 border border-border/70 bg-background/40 p-3">
            <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
              Definition metadata
            </p>
            <p className="text-muted-foreground">
              Key: {group.definitionKey ?? "—"} · Current instances: {group.instances.length}
            </p>
          </section>

          {group.instances.length === 0 ? (
            <section className="space-y-1 border border-border/70 bg-background/40 p-3">
              <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                Empty state
              </p>
              <p className="text-muted-foreground">
                No current instances recorded for this definition.
              </p>
            </section>
          ) : null}

          {group.instances.length === 1 ? (
            <section className="space-y-3 border border-border/70 bg-background/40 p-3">
              <div className="space-y-1">
                <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                  Instance {group.instances[0]!.instanceOrder + 1}
                </p>
                <p className="text-muted-foreground">
                  Recorded: {formatTimestamp(group.instances[0]!.recordedAt)}
                </p>
              </div>
              <WorkflowContextValuePresentation value={group.instances[0]!.valueJson} />
            </section>
          ) : null}

          {group.instances.length > 1 ? (
            <div className="space-y-3">
              {group.instances.map((instance) => (
                <section
                  key={
                    instance.contextFactInstanceId ??
                    `${group.contextFactDefinitionId}-${instance.instanceOrder}`
                  }
                  className="space-y-3 border border-border/70 bg-background/40 p-3"
                >
                  <div className="space-y-1">
                    <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                      Instance {instance.instanceOrder + 1}
                    </p>
                    <p className="text-muted-foreground">
                      Recorded: {formatTimestamp(instance.recordedAt)}
                    </p>
                  </div>
                  <WorkflowContextValuePresentation value={instance.valueJson} />
                </section>
              ))}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WorkflowContextInstanceDialog({
  group,
  instance,
  definition,
  presentation,
  open,
  onOpenChange,
}: {
  group: WorkflowContextFactGroup;
  instance: WorkflowContextFactInstance | null;
  definition: WorkflowContextDefinition | null;
  presentation: WorkflowContextFactPresentation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const title = group.definitionLabel ?? group.definitionKey ?? group.contextFactDefinitionId;
  const description = formatDescription(group.definitionDescriptionJson);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-3xl flex-col overflow-hidden rounded-none border border-border/80 bg-background">
        <DialogHeader>
          <DialogTitle>
            {instance
              ? `${title} · Instance ${instance.instanceOrder + 1}`
              : `${title} · Instance detail`}
          </DialogTitle>
          <DialogDescription>
            {description ?? "Inspect the selected workflow-context instance and its current value."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1 text-xs">
          <section className="space-y-3 border border-border/70 bg-background/40 p-3">
            <div className="flex flex-wrap gap-2">
              {presentation ? (
                <ExecutionBadge
                  label={presentation.kindBadge.label}
                  tone={presentation.kindBadge.tone}
                />
              ) : null}
              {presentation?.metadataBadges.map((badge) => (
                <ExecutionBadge
                  key={`${badge.label}-${badge.tone}`}
                  label={badge.label}
                  tone={badge.tone}
                />
              ))}
            </div>

            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <DetailLabel>Context fact key</DetailLabel>
                <DetailPrimary className="break-all">{group.definitionKey ?? "—"}</DetailPrimary>
              </div>
              <div className="space-y-1">
                <DetailLabel>Cardinality</DetailLabel>
                <DetailPrimary>{definition?.cardinality === "many" ? "Many" : "One"}</DetailPrimary>
              </div>
              {presentation?.detailRows.map((row) => (
                <div key={row.label} className="space-y-1">
                  <DetailLabel>{row.label}</DetailLabel>
                  <DetailPrimary className="break-words">{row.value}</DetailPrimary>
                </div>
              ))}
            </dl>
          </section>

          {instance ? (
            <section className="space-y-3 border border-border/70 bg-background/40 p-3">
              <dl className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <DetailLabel>Recorded</DetailLabel>
                  <DetailPrimary>{formatTimestamp(instance.recordedAt)}</DetailPrimary>
                </div>
                <div className="space-y-1">
                  <DetailLabel>Instance order</DetailLabel>
                  <DetailPrimary>{instance.instanceOrder + 1}</DetailPrimary>
                </div>
                {instance.contextFactInstanceId ? (
                  <div className="space-y-1 sm:col-span-2">
                    <DetailLabel>Context fact instance ID</DetailLabel>
                    <DetailCode>{instance.contextFactInstanceId}</DetailCode>
                  </div>
                ) : null}
                {instance.sourceStepExecutionId ? (
                  <div className="space-y-1 sm:col-span-2">
                    <DetailLabel>Source step execution</DetailLabel>
                    <DetailCode>{instance.sourceStepExecutionId}</DetailCode>
                  </div>
                ) : null}
              </dl>

              <div className="space-y-2">
                <DetailLabel>Value</DetailLabel>
                <WorkflowContextValuePresentation value={instance.valueJson} />
              </div>
            </section>
          ) : (
            <section className="border border-border/70 bg-background/40 p-3 text-muted-foreground">
              Select an instance from the card to inspect its details.
            </section>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WorkflowContextManualCrudCard({
  group,
  definition,
  editor,
  presentation,
  onCreate,
  onUpdate,
  onRemove,
  onDeleteAll,
  isCreating,
  isUpdating,
  isRemoving,
  isDeleting,
}: {
  group: WorkflowContextFactGroup;
  definition: WorkflowContextDefinition | null;
  editor: RuntimeDialogEditor | null;
  presentation: WorkflowContextFactPresentation | null;
  onCreate: (value: unknown) => Promise<void>;
  onUpdate: (instanceId: string, value: unknown) => Promise<void>;
  onRemove: (instanceId: string) => Promise<void>;
  onDeleteAll: () => Promise<void>;
  isCreating: boolean;
  isUpdating: boolean;
  isRemoving: boolean;
  isDeleting: boolean;
}) {
  const description = formatDescription(group.definitionDescriptionJson);
  const title = group.definitionLabel ?? group.definitionKey ?? group.contextFactDefinitionId;
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editInstanceId, setEditInstanceId] = useState<string | null>(null);
  const [removeInstanceId, setRemoveInstanceId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [openInstanceKey, setOpenInstanceKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const primaryInstance = group.instances[0] ?? null;
  const editingInstance =
    group.instances.find((instance) => instance.contextFactInstanceId === editInstanceId) ?? null;
  const removeTarget =
    group.instances.find((instance) => instance.contextFactInstanceId === removeInstanceId) ?? null;
  const openInstance =
    group.instances.find(
      (instance) => getWorkflowContextInstanceKey(group, instance) === openInstanceKey,
    ) ?? null;
  const isSingle = definition?.cardinality === "one";
  const canCreateNew = definition
    ? definition.cardinality === "many" || group.instances.length === 0
    : false;

  return (
    <Card frame="flat" tone="runtime" className="border-border/70 bg-background/40">
      <CardHeader className="gap-4 border-b border-border/60 pb-4">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {presentation ? (
              <ExecutionBadge
                label={presentation.kindBadge.label}
                tone={presentation.kindBadge.tone}
              />
            ) : null}
            {presentation?.metadataBadges.map((badge) => (
              <ExecutionBadge
                key={`${badge.label}-${badge.tone}`}
                label={badge.label}
                tone={badge.tone}
              />
            ))}
          </div>
          <div className="space-y-1">
            <CardDescription>
              {group.definitionKey ?? group.contextFactDefinitionId}
            </CardDescription>
            <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
          </div>
        </div>
        <CardAction>
          <span className="border border-border/70 bg-background/40 px-2 py-1 text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
            {group.instances.length} instance{group.instances.length === 1 ? "" : "s"}
          </span>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-4 pt-5 text-xs text-muted-foreground xl:grid-cols-[minmax(0,0.95fr)_minmax(20rem,1.05fr)]">
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm leading-6 text-foreground/90">
              {description ?? "No definition description recorded."}
            </p>
            <p>
              This card keeps the fact contract, binding target, and current runtime instances in
              one place so you can inspect or edit without losing context.
            </p>
          </div>

          {presentation?.detailRows.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {presentation.detailRows.map((row) => (
                <div
                  key={row.label}
                  className="space-y-1 border border-border/70 bg-background/60 p-3"
                >
                  <DetailLabel>{row.label}</DetailLabel>
                  <DetailPrimary className="break-words text-sm">{row.value}</DetailPrimary>
                </div>
              ))}
            </div>
          ) : null}

          {definition ? (
            <div className="space-y-2 border border-border/70 bg-background/60 p-3">
              <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                Actions
              </p>
              <div className="flex flex-wrap gap-2">
                {canCreateNew ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isCreating || !editor}
                    onClick={() => {
                      setError(null);
                      setCreateDialogOpen(true);
                    }}
                  >
                    {isSingle && group.instances.length === 0 ? "Create instance" : "Add instance"}
                  </Button>
                ) : null}

                {isSingle && primaryInstance?.contextFactInstanceId ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isUpdating || !editor}
                    onClick={() => {
                      setError(null);
                      setEditInstanceId(primaryInstance.contextFactInstanceId ?? null);
                    }}
                  >
                    Edit instance
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}

          {!definition || !editor ? (
            <p className="border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              Context fact contract metadata is unavailable, so structured manual CRUD cannot open.
            </p>
          ) : null}

          {error ? (
            <div className="border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          ) : null}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <DetailLabel>Recorded instances</DetailLabel>
              <p className="text-xs text-muted-foreground">
                Click an item to inspect the full instance payload.
              </p>
            </div>
            <ExecutionBadge
              label={group.instances.length === 0 ? "empty" : "recorded"}
              tone={group.instances.length === 0 ? "slate" : "sky"}
            />
          </div>

          {group.instances.length === 0 ? (
            <p className="border border-dashed border-border/70 bg-background/60 px-3 py-6 text-sm text-muted-foreground">
              No current instances recorded.
            </p>
          ) : (
            <div className="max-h-[min(45vh,18rem)] space-y-2 overflow-y-auto pr-1">
              {group.instances.map((instance) => {
                const instanceKey = getWorkflowContextInstanceKey(group, instance);

                return (
                  <div
                    key={instanceKey}
                    className="grid gap-2 border border-border/70 bg-background/60 p-3 lg:grid-cols-[minmax(0,1fr)_auto]"
                  >
                    <button
                      type="button"
                      className="space-y-2 text-left transition-colors hover:text-foreground"
                      onClick={() => setOpenInstanceKey(instanceKey)}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <ExecutionBadge
                          label={`Instance ${instance.instanceOrder + 1}`}
                          tone="slate"
                        />
                        <span className="text-[0.72rem] uppercase tracking-[0.12em] text-muted-foreground">
                          {formatTimestamp(instance.recordedAt)}
                        </span>
                      </div>
                      <p className="break-words text-sm text-foreground">
                        {summarizeWorkflowContextValue(instance.valueJson)}
                      </p>
                    </button>

                    {instance.contextFactInstanceId &&
                    definition?.cardinality === "many" &&
                    editor ? (
                      <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isUpdating}
                          onClick={() => {
                            setError(null);
                            setEditInstanceId(instance.contextFactInstanceId!);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isRemoving}
                          onClick={() => {
                            setError(null);
                            setRemoveInstanceId(instance.contextFactInstanceId!);
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Delete clears every current instance for this definition.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isDeleting || group.instances.length === 0}
          onClick={async () => {
            setError(null);
            setDeleteDialogOpen(true);
          }}
        >
          Delete definition state
        </Button>
      </CardFooter>

      {editor ? (
        <RuntimeFactValueDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          title={isSingle ? `Create ${title} instance` : `Add ${title} instance`}
          description={
            isSingle
              ? "Create the first runtime instance for this workflow-context fact."
              : "Create a new runtime instance for this workflow-context fact."
          }
          submitLabel={isSingle ? "Create instance" : "Add instance"}
          editor={editor}
          isPending={isCreating}
          errorMessage={createDialogOpen ? error : null}
          onSubmit={async (value) => {
            try {
              setError(null);
              await onCreate(value);
              setCreateDialogOpen(false);
            } catch (cause) {
              setError(toErrorMessage(cause));
            }
          }}
        />
      ) : null}

      {editor && editingInstance?.contextFactInstanceId ? (
        <RuntimeFactValueDialog
          open={editInstanceId !== null}
          onOpenChange={(open) =>
            setEditInstanceId(open ? (editingInstance.contextFactInstanceId ?? null) : null)
          }
          title={`Edit ${title} instance`}
          description={
            isSingle
              ? `Update instance ${editingInstance.instanceOrder + 1} for this workflow-context fact.`
              : `Update instance ${editingInstance.instanceOrder + 1} for this workflow-context fact.`
          }
          submitLabel="Save instance"
          editor={editor}
          initialValue={editingInstance.valueJson}
          isPending={isUpdating}
          errorMessage={editInstanceId !== null ? error : null}
          onSubmit={async (value) => {
            try {
              setError(null);
              await onUpdate(editingInstance.contextFactInstanceId!, value);
              setEditInstanceId(null);
            } catch (cause) {
              setError(toErrorMessage(cause));
            }
          }}
        />
      ) : null}

      <RuntimeConfirmDialog
        open={removeInstanceId !== null}
        onOpenChange={(open) => setRemoveInstanceId(open ? removeInstanceId : null)}
        title={`Remove ${title} instance?`}
        description={
          removeTarget
            ? `Remove instance ${removeTarget.instanceOrder + 1} from the current workflow-context state.`
            : "Remove the selected workflow-context instance."
        }
        confirmLabel="Remove instance"
        isPending={isRemoving}
        errorMessage={removeInstanceId !== null ? error : null}
        onConfirm={async () => {
          if (!removeInstanceId) {
            return;
          }

          try {
            setError(null);
            await onRemove(removeInstanceId);
            setRemoveInstanceId(null);
          } catch (cause) {
            setError(toErrorMessage(cause));
          }
        }}
      />

      <RuntimeConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={`Delete ${title} state?`}
        description="Delete clears every current instance for this workflow-context definition."
        confirmLabel="Delete definition state"
        isPending={isDeleting}
        errorMessage={deleteDialogOpen ? error : null}
        onConfirm={async () => {
          try {
            setError(null);
            await onDeleteAll();
            setDeleteDialogOpen(false);
          } catch (cause) {
            setError(toErrorMessage(cause));
          }
        }}
      />

      <WorkflowContextInstanceDialog
        group={group}
        instance={openInstance}
        definition={definition}
        presentation={presentation}
        open={openInstanceKey !== null}
        onOpenChange={(open) => setOpenInstanceKey(open ? openInstanceKey : null)}
      />
    </Card>
  );
}

function WorkflowStepSurfaceCard({
  projectId,
  stepSurface,
  activateWorkflowStep,
  isActivating,
  completeWorkflow,
  isCompleting,
}: {
  projectId: string;
  stepSurface: WorkflowStepSurface;
  activateWorkflowStep: () => Promise<void>;
  isActivating: boolean;
  completeWorkflow?: () => void;
  isCompleting: boolean;
}) {
  const badgeClassName =
    stepSurface.state === "invalid_definition"
      ? "border-destructive/50 bg-destructive/10 text-destructive"
      : stepSurface.state === "active_step"
        ? "border-primary/50 bg-primary/15 text-primary"
        : "border-border/70 bg-background/40 text-muted-foreground";

  switch (stepSurface.state) {
    case "entry_pending":
      return (
        <Card frame="flat" tone="runtime" className="border-border/70 bg-background/40">
          <CardHeader>
            <CardDescription>Workflow orchestration state</CardDescription>
            <CardTitle>Entry step pending activation</CardTitle>
            <CardAction>
              <span
                className={cn(
                  "border px-2 py-1 text-[0.65rem] uppercase tracking-[0.12em]",
                  badgeClassName,
                )}
              >
                {renderStepSurfaceLabel(stepSurface.state)}
              </span>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <p>Entry step: {renderStepLabel(stepSurface.entryStep)}</p>
            <p>Type: {stepSurface.entryStep.stepType}</p>
          </CardContent>
          <CardFooter className="justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Activate the workflow entry shell from here.
            </p>
            <Button size="sm" onClick={activateWorkflowStep} disabled={isActivating}>
              Activate entry step
            </Button>
          </CardFooter>
        </Card>
      );

    case "active_step":
      return (
        <Card frame="flat" tone="runtime" className="border-border/70 bg-background/40">
          <CardHeader>
            <CardDescription>Workflow orchestration state</CardDescription>
            <CardTitle>Active step in progress</CardTitle>
            <CardAction>
              <div className="flex flex-wrap gap-2">
                <span
                  className={cn(
                    "border px-2 py-1 text-[0.65rem] uppercase tracking-[0.12em]",
                    badgeClassName,
                  )}
                >
                  {renderStepSurfaceLabel(stepSurface.state)}
                </span>
                <ExecutionBadge
                  label={stepSurface.activeStep.stepType}
                  tone={getStepTypeTone(stepSurface.activeStep.stepType)}
                />
              </div>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <p>
              <span className="text-muted-foreground/70">Step status:</span>{" "}
              <span className="text-foreground">{stepSurface.activeStep.status}</span>
            </p>
            <p>
              <span className="text-muted-foreground/70">Activated:</span>{" "}
              <span className="text-foreground">
                {formatTimestamp(stepSurface.activeStep.activatedAt)}
              </span>
            </p>
            <p>While an active step exists, next-step activation stays hidden on this page.</p>
          </CardContent>
          <CardFooter className="justify-end">
            <Link
              to="/projects/$projectId/step-executions/$stepExecutionId"
              params={{ projectId, stepExecutionId: stepSurface.activeStep.stepExecutionId }}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-none")}
            >
              Open active step
            </Link>
          </CardFooter>
        </Card>
      );

    case "next_pending":
      return (
        <Card frame="flat" tone="runtime" className="border-border/70 bg-background/40">
          <CardHeader>
            <CardDescription>Workflow orchestration state</CardDescription>
            <CardTitle>Next step pending activation</CardTitle>
            <CardAction>
              <span
                className={cn(
                  "border px-2 py-1 text-[0.65rem] uppercase tracking-[0.12em]",
                  badgeClassName,
                )}
              >
                {renderStepSurfaceLabel(stepSurface.state)}
              </span>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <p>Completed step: {stepSurface.afterStep.stepType}</p>
            <p>Completed at: {formatTimestamp(stepSurface.afterStep.completedAt)}</p>
            <p>Next step: {renderStepLabel(stepSurface.nextStep)}</p>
            <p>Next type: {stepSurface.nextStep.stepType}</p>
          </CardContent>
          <CardFooter className="justify-between gap-3">
            <Link
              to="/projects/$projectId/step-executions/$stepExecutionId"
              params={{ projectId, stepExecutionId: stepSurface.afterStep.stepExecutionId }}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-none")}
            >
              Open completed step
            </Link>
            <Button size="sm" onClick={activateWorkflowStep} disabled={isActivating}>
              Activate next step
            </Button>
          </CardFooter>
        </Card>
      );

    case "terminal_no_next_step":
      return (
        <Card frame="flat" tone="runtime" className="border-border/70 bg-background/40">
          <CardHeader>
            <CardDescription>Workflow orchestration state</CardDescription>
            <CardTitle>Workflow is terminal</CardTitle>
            <CardAction>
              <span
                className={cn(
                  "border px-2 py-1 text-[0.65rem] uppercase tracking-[0.12em]",
                  badgeClassName,
                )}
              >
                {renderStepSurfaceLabel(stepSurface.state)}
              </span>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            {stepSurface.terminalStep ? (
              <>
                <p>Terminal step type: {stepSurface.terminalStep.stepType}</p>
                <p>Completed at: {formatTimestamp(stepSurface.terminalStep.completedAt)}</p>
              </>
            ) : (
              <p>No next step is defined for this workflow path.</p>
            )}
          </CardContent>
          {stepSurface.terminalStep ? (
            <CardFooter className="justify-end gap-2">
              {completeWorkflow ? (
                <Button size="sm" onClick={completeWorkflow} disabled={isCompleting}>
                  Complete workflow
                </Button>
              ) : null}
              <Link
                to="/projects/$projectId/step-executions/$stepExecutionId"
                params={{ projectId, stepExecutionId: stepSurface.terminalStep.stepExecutionId }}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-none")}
              >
                Open terminal step
              </Link>
            </CardFooter>
          ) : null}
        </Card>
      );

    case "invalid_definition":
      return (
        <Card frame="flat" tone="runtime" className="border-destructive/50 bg-destructive/10">
          <CardHeader>
            <CardDescription className="text-destructive/80">
              Workflow orchestration state
            </CardDescription>
            <CardTitle className="text-destructive">Workflow definition is invalid</CardTitle>
            <CardAction>
              <span
                className={cn(
                  "border px-2 py-1 text-[0.65rem] uppercase tracking-[0.12em]",
                  badgeClassName,
                )}
              >
                {renderStepSurfaceLabel(stepSurface.state)}
              </span>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-destructive">
            <p>
              {stepSurface.reason === "missing_entry_step"
                ? "No unique entry step could be derived for this workflow definition."
                : "Multiple entry steps were derived, so runtime activation is blocked."}
            </p>
          </CardContent>
        </Card>
      );
  }
}

export const Route = createFileRoute(
  "/projects/$projectId/workflow-executions/$workflowExecutionId",
)({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData({
      ...context.orpc.project.getRuntimeWorkflowExecutionDetail.queryOptions({
        input: {
          projectId: params.projectId,
          workflowExecutionId: params.workflowExecutionId,
        },
      }),
      queryKey: runtimeWorkflowExecutionDetailQueryKey(
        params.projectId,
        params.workflowExecutionId,
      ),
    });
  },
  component: WorkflowExecutionDetailRoute,
});

export function WorkflowExecutionDetailRoute() {
  const { projectId, workflowExecutionId } = Route.useParams();
  const navigate = Route.useNavigate();
  const { orpc, queryClient } = Route.useRouteContext();
  const [workflowContextFactFilter, setWorkflowContextFactFilter] = useState("");
  const [workflowContextKindFilters, setWorkflowContextKindFilters] = useState<
    WorkflowContextFilterKind[]
  >([]);
  const [workflowContextCardinalityFilters, setWorkflowContextCardinalityFilters] = useState<
    WorkflowContextFilterCardinality[]
  >([]);
  const [workflowContextInstanceFilters, setWorkflowContextInstanceFilters] = useState<
    WorkflowContextInstanceFilter[]
  >([]);
  const [openCompleteDialog, setOpenCompleteDialog] = useState(false);

  const workflowExecutionDetailQuery = useQuery({
    ...orpc.project.getRuntimeWorkflowExecutionDetail.queryOptions({
      input: {
        projectId,
        workflowExecutionId,
      },
    }),
    queryKey: runtimeWorkflowExecutionDetailQueryKey(projectId, workflowExecutionId),
  });

  const invalidateWorkflowExecutionDetail = async () => {
    await queryClient.invalidateQueries({
      queryKey: runtimeWorkflowExecutionDetailQueryKey(projectId, workflowExecutionId),
    });
  };

  const retrySameWorkflowMutation = useMutation(
    orpc.project.retrySameWorkflowExecution.mutationOptions({
      onSuccess: async (result) => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: runtimeWorkflowExecutionDetailQueryKey(projectId, workflowExecutionId),
          }),
          queryClient.invalidateQueries({ queryKey: runtimeActiveWorkflowsQueryKey(projectId) }),
          queryClient.invalidateQueries({ queryKey: runtimeGuidanceActiveQueryKey(projectId) }),
        ]);

        if (result?.workflowExecutionId) {
          await navigate({
            to: "/projects/$projectId/workflow-executions/$workflowExecutionId",
            params: {
              projectId,
              workflowExecutionId: result.workflowExecutionId,
            },
            replace: true,
          });
        }
      },
    }),
  );

  const activateWorkflowStepMutation = useMutation(
    orpc.project.activateWorkflowStepExecution.mutationOptions({
      onSuccess: async (result) => {
        showSingletonAutoAttachWarnings({
          warnings: result?.warnings,
          onOpenWorkUnits: () => {
            void navigate({
              to: "/projects/$projectId/work-units",
              params: { projectId },
              search: { q: "" },
            });
          },
        });
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: runtimeWorkflowExecutionDetailQueryKey(projectId, workflowExecutionId),
          }),
          queryClient.invalidateQueries({ queryKey: runtimeActiveWorkflowsQueryKey(projectId) }),
          queryClient.invalidateQueries({ queryKey: runtimeGuidanceActiveQueryKey(projectId) }),
        ]);

        if (result?.stepExecutionId) {
          await navigate({
            to: "/projects/$projectId/step-executions/$stepExecutionId",
            params: {
              projectId,
              stepExecutionId: result.stepExecutionId,
            },
          });
        }
      },
    }),
  );

  const completeWorkflowMutation = useMutation(
    orpc.project.completeWorkflowExecution.mutationOptions({
      onSuccess: async () => {
        setOpenCompleteDialog(false);
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: runtimeWorkflowExecutionDetailQueryKey(projectId, workflowExecutionId),
          }),
          queryClient.invalidateQueries({ queryKey: runtimeActiveWorkflowsQueryKey(projectId) }),
          queryClient.invalidateQueries({ queryKey: runtimeGuidanceActiveQueryKey(projectId) }),
        ]);
      },
    }),
  );

  const createWorkflowContextFactMutation = useMutation(
    orpc.project.createRuntimeWorkflowContextFactValue.mutationOptions({
      onSuccess: invalidateWorkflowExecutionDetail,
    }),
  );

  const updateWorkflowContextFactMutation = useMutation(
    orpc.project.updateRuntimeWorkflowContextFactValue.mutationOptions({
      onSuccess: invalidateWorkflowExecutionDetail,
    }),
  );

  const removeWorkflowContextFactMutation = useMutation(
    orpc.project.removeRuntimeWorkflowContextFactValue.mutationOptions({
      onSuccess: invalidateWorkflowExecutionDetail,
    }),
  );

  const deleteWorkflowContextFactMutation = useMutation(
    orpc.project.deleteRuntimeWorkflowContextFactValue.mutationOptions({
      onSuccess: invalidateWorkflowExecutionDetail,
    }),
  );

  const detail = workflowExecutionDetailQuery.data;
  const isLoading = workflowExecutionDetailQuery.isLoading;
  const hasError = Boolean(workflowExecutionDetailQuery.error);
  const projectDetailsQuery = useQuery({
    queryKey: ["project-details", projectId],
    queryFn: async () => {
      const { client } = await import("@/utils/orpc");
      return client.project.getProjectDetails({ projectId });
    },
  });
  const projectPin = getProjectPin(projectDetailsQuery.data);

  const contextEditorDefinitionQuery = useQuery(
    (projectPin && detail
      ? {
          queryKey: [
            "workflow-editor-definition",
            projectPin.methodologyId,
            projectPin.methodologyVersionId,
            detail.workUnit.workUnitTypeKey,
            detail.workflowExecution.workflowId,
          ],
          queryFn: async () => {
            const { client } = await import("@/utils/orpc");
            return client.methodology.getEditorDefinition({
              methodologyId: projectPin.methodologyId,
              versionId: projectPin.methodologyVersionId,
              workUnitTypeKey: detail.workUnit.workUnitTypeKey,
              workflowDefinitionId: detail.workflowExecution.workflowId,
            });
          },
        }
      : {
          queryKey: ["workflow-editor-definition", projectId, workflowExecutionId, "idle"],
          queryFn: async () => null,
        }) as unknown as { queryKey: unknown[]; queryFn: () => Promise<unknown> },
  );

  const methodologyFactDefinitionsQuery = useQuery(
    (projectPin
      ? orpc.methodology.version.fact.list.queryOptions({
          input: { versionId: projectPin.methodologyVersionId },
        })
      : {
          queryKey: ["methodology-facts", "idle"],
          queryFn: async () => ({ factDefinitions: [] }),
        }) as unknown as { queryKey: unknown[]; queryFn: () => Promise<unknown> },
  );

  const workUnitFactDefinitionsQuery = useQuery(
    (projectPin
      ? orpc.methodology.version.workUnit.fact.list.queryOptions({
          input: { versionId: projectPin.methodologyVersionId },
        })
      : {
          queryKey: ["work-unit-facts", "idle"],
          queryFn: async () => ({ workUnitTypes: [] }),
        }) as unknown as { queryKey: unknown[]; queryFn: () => Promise<unknown> },
  );

  const workUnitDefinitionsQuery = useQuery(
    (projectPin
      ? orpc.methodology.version.workUnit.list.queryOptions({
          input: { versionId: projectPin.methodologyVersionId },
        })
      : {
          queryKey: ["work-unit-types", "idle"],
          queryFn: async () => ({ workUnitTypes: [] }),
        }) as unknown as { queryKey: unknown[]; queryFn: () => Promise<unknown> },
  );

  const workflowDefinitionsQuery = useQuery(
    (projectPin && detail
      ? orpc.methodology.version.workUnit.workflow.list.queryOptions({
          input: {
            versionId: projectPin.methodologyVersionId,
            workUnitTypeKey: detail.workUnit.workUnitTypeKey,
          },
        })
      : {
          queryKey: ["work-unit-workflows", "idle"],
          queryFn: async () => [],
        }) as unknown as { queryKey: unknown[]; queryFn: () => Promise<unknown> },
  );

  const artifactSlotDefinitionsQuery = useQuery(
    (projectPin && detail
      ? orpc.methodology.version.workUnit.artifactSlot.list.queryOptions({
          input: {
            versionId: projectPin.methodologyVersionId,
            workUnitTypeKey: detail.workUnit.workUnitTypeKey,
          },
        })
      : {
          queryKey: ["artifact-slots", "idle"],
          queryFn: async () => [],
        }) as unknown as { queryKey: unknown[]; queryFn: () => Promise<unknown> },
  );

  const runtimeWorkUnitsQuery = useQuery({
    queryKey: ["runtime-work-units", projectId],
    queryFn: async () => {
      const { client } = await import("@/utils/orpc");
      return client.project.getRuntimeWorkUnits({ projectId });
    },
  });

  const contextDefinitions = useMemo(
    () => toWorkflowContextDefinitions(contextEditorDefinitionQuery.data),
    [contextEditorDefinitionQuery.data],
  );
  const stepGraphDefinition = useMemo(
    () => toWorkflowStepGraphDefinition(contextEditorDefinitionQuery.data),
    [contextEditorDefinitionQuery.data],
  );
  const artifactSnapshotSlotIds = useMemo(
    () =>
      [...contextDefinitions.values()]
        .filter(
          (
            definition,
          ): definition is Extract<
            WorkflowContextDefinition,
            { kind: "artifact_slot_reference_fact" }
          > => definition.kind === "artifact_slot_reference_fact",
        )
        .map((definition) => definition.slotDefinitionId),
    [contextDefinitions],
  );
  const artifactSnapshotQueries = useQueries({
    queries: artifactSnapshotSlotIds.map(
      (slotDefinitionId) =>
        (detail
          ? orpc.project.getRuntimeArtifactSlotDetail.queryOptions({
              input: {
                projectId,
                projectWorkUnitId: detail.workUnit.projectWorkUnitId,
                slotDefinitionId,
              },
            })
          : {
              queryKey: ["runtime-artifact-slot-detail", projectId, "idle", slotDefinitionId],
              queryFn: async () => null,
            }) as { queryKey: unknown[]; queryFn: () => Promise<unknown> },
    ),
  });

  const projectFactCatalog = useMemo(
    () => toProjectFactCatalog(methodologyFactDefinitionsQuery.data),
    [methodologyFactDefinitionsQuery.data],
  );
  const workUnitFactCatalog = useMemo(
    () => toWorkUnitFactCatalog(workUnitFactDefinitionsQuery.data),
    [workUnitFactDefinitionsQuery.data],
  );
  const workUnitCatalog = useMemo(
    () => toWorkUnitCatalog(workUnitDefinitionsQuery.data),
    [workUnitDefinitionsQuery.data],
  );
  const workflowOptions = useMemo(
    () => toWorkflowOptions(workflowDefinitionsQuery.data),
    [workflowDefinitionsQuery.data],
  );
  const artifactSlotCatalog = useMemo(
    () => toArtifactSlotCatalog(artifactSlotDefinitionsQuery.data),
    [artifactSlotDefinitionsQuery.data],
  );
  const workUnitOptions = useMemo(
    () => toRuntimeWorkUnitOptions(runtimeWorkUnitsQuery.data),
    [runtimeWorkUnitsQuery.data],
  );
  const boundFactSourceDescriptors = useMemo<BoundFactSourceDescriptor[]>(
    () =>
      [...contextDefinitions.values()].flatMap<BoundFactSourceDescriptor>((definition) => {
        if (definition.kind !== "bound_fact") {
          return [];
        }

        if (projectFactCatalog.has(definition.factDefinitionId)) {
          const resolvedDefinition = projectFactCatalog.get(definition.factDefinitionId)!;
          return [
            {
              contextFactDefinitionId: definition.contextFactDefinitionId,
              factDefinitionId: definition.factDefinitionId,
              resolvedFactDefinitionId: resolvedDefinition.id,
              source: "project" as const,
            },
          ];
        }

        if (workUnitFactCatalog.has(definition.factDefinitionId)) {
          const resolvedDefinition = workUnitFactCatalog.get(definition.factDefinitionId)!;
          return [
            {
              contextFactDefinitionId: definition.contextFactDefinitionId,
              factDefinitionId: definition.factDefinitionId,
              resolvedFactDefinitionId: resolvedDefinition.id,
              source: "work_unit" as const,
            },
          ];
        }

        return [];
      }),
    [contextDefinitions, projectFactCatalog, workUnitFactCatalog],
  );
  const boundFactSourceQueries = useQueries({
    queries: boundFactSourceDescriptors.map(
      (descriptor) =>
        (descriptor.source === "project"
          ? orpc.project.getRuntimeProjectFactDetail.queryOptions({
              input: {
                projectId,
                factDefinitionId: descriptor.resolvedFactDefinitionId,
              },
            })
          : detail
            ? orpc.project.getRuntimeWorkUnitFactDetail.queryOptions({
                input: {
                  projectId,
                  projectWorkUnitId: detail.workUnit.projectWorkUnitId,
                  factDefinitionId: descriptor.resolvedFactDefinitionId,
                },
              })
            : {
                queryKey: [
                  "runtime-work-unit-fact-detail",
                  projectId,
                  "idle",
                  descriptor.resolvedFactDefinitionId,
                ],
                queryFn: async () => null,
              }) as { queryKey: unknown[]; queryFn: () => Promise<unknown> },
    ),
  });
  const boundFactInstanceOptionsByContextFactDefinition = useMemo(() => {
    const result = new Map<string, RuntimeFactOption[]>();

    for (const [index, descriptor] of boundFactSourceDescriptors.entries()) {
      const data = boundFactSourceQueries[index]?.data;
      result.set(
        descriptor.contextFactDefinitionId,
        descriptor.source === "project"
          ? toProjectFactInstanceOptions(data)
          : toWorkUnitFactInstanceOptions(data),
      );
    }

    return result;
  }, [boundFactSourceDescriptors, boundFactSourceQueries]);
  const artifactSnapshotOptionsBySlot = useMemo(
    () => toArtifactSnapshotOptionsBySlot(artifactSnapshotQueries),
    [artifactSnapshotQueries],
  );
  const workflowContextFactGroups = detail?.workflowContextFacts.groups ?? [];
  const workflowContextKindCounts = useMemo(() => {
    const counts = new Map<WorkflowContextFilterKind, number>();

    for (const group of workflowContextFactGroups) {
      const kind = contextDefinitions.get(group.contextFactDefinitionId)?.kind;
      if (!kind) {
        continue;
      }

      counts.set(kind, (counts.get(kind) ?? 0) + 1);
    }

    return counts;
  }, [contextDefinitions, workflowContextFactGroups]);
  const availableWorkflowContextKinds = useMemo(
    () => WORKFLOW_CONTEXT_FILTER_KIND_ORDER.filter((kind) => workflowContextKindCounts.has(kind)),
    [workflowContextKindCounts],
  );
  const workflowContextCardinalityCounts = useMemo(() => {
    const counts = new Map<WorkflowContextFilterCardinality, number>();

    for (const group of workflowContextFactGroups) {
      const cardinality = contextDefinitions.get(group.contextFactDefinitionId)?.cardinality;
      if (!cardinality) {
        continue;
      }

      counts.set(cardinality, (counts.get(cardinality) ?? 0) + 1);
    }

    return counts;
  }, [contextDefinitions, workflowContextFactGroups]);
  const workflowContextInstanceCounts = useMemo(() => {
    const counts = new Map<WorkflowContextInstanceFilter, number>([
      ["has_instance", 0],
      ["no_instance", 0],
    ]);

    for (const group of workflowContextFactGroups) {
      const key = group.instances.length > 0 ? "has_instance" : "no_instance";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return counts;
  }, [workflowContextFactGroups]);
  const filteredWorkflowContextFactGroups = useMemo(() => {
    return filterWorkflowContextFactGroups({
      groups: workflowContextFactGroups,
      contextDefinitions,
      keyFilter: workflowContextFactFilter,
      kindFilters: workflowContextKindFilters,
      cardinalityFilters: workflowContextCardinalityFilters,
      instanceFilters: workflowContextInstanceFilters,
    });
  }, [
    contextDefinitions,
    workflowContextCardinalityFilters,
    workflowContextFactFilter,
    workflowContextFactGroups,
    workflowContextInstanceFilters,
    workflowContextKindFilters,
  ]);
  const hasActiveWorkflowContextFilters =
    workflowContextFactFilter.trim().length > 0 ||
    workflowContextKindFilters.length > 0 ||
    workflowContextCardinalityFilters.length > 0 ||
    workflowContextInstanceFilters.length > 0;

  return (
    <MethodologyWorkspaceShell
      title="Workflow execution"
      stateLabel={isLoading ? "loading" : hasError ? "failed" : "normal"}
      segments={[
        { label: "Projects", to: "/projects" },
        {
          label: projectId,
          to: "/projects/$projectId",
          params: { projectId },
        },
        {
          label: "Active Workflows",
          to: "/projects/$projectId/workflows",
          params: { projectId },
        },
        { label: detail?.workflowExecution.workflowKey ?? workflowExecutionId },
      ]}
    >
      <section
        data-testid="runtime-workflow-execution-shell-boundary"
        className="space-y-3 border border-border/80 bg-background p-4"
      >
        <DetailEyebrow>Runtime context</DetailEyebrow>

        {isLoading ? (
          <>
            <p className="text-sm text-muted-foreground">Loading workflow execution detail…</p>
            <Skeleton className="h-28 w-full rounded-none" />
          </>
        ) : hasError ? (
          <p className="border border-destructive/60 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {toErrorMessage(workflowExecutionDetailQuery.error)}
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.8fr)]">
            <div className="space-y-2 border border-border/70 bg-background/40 p-3">
              <DetailLabel>Workflow execution</DetailLabel>
              <DetailCode>
                {detail?.workflowExecution.workflowExecutionId ?? workflowExecutionId}
              </DetailCode>
              <DetailPrimary>
                {detail?.workflowExecution.workflowName ?? "pending context"}
              </DetailPrimary>
            </div>
            <div className="space-y-2 border border-border/70 bg-background/40 p-3">
              <DetailLabel>Execution state</DetailLabel>
              <div className="flex flex-wrap gap-2">
                <ExecutionBadge
                  label={detail ? renderWorkflowStatus(detail.workflowExecution.status) : "Pending"}
                  tone={detail ? getExecutionStatusTone(detail.workflowExecution.status) : "amber"}
                />
                {detail ? (
                  <ExecutionBadge
                    label={renderWorkflowRoleLabel(detail.workflowExecution.workflowRole)}
                    tone={detail.workflowExecution.workflowRole === "primary" ? "violet" : "slate"}
                  />
                ) : null}
              </div>
            </div>
          </div>
        )}
      </section>

      {detail ? (
        <>
          <section className="space-y-3 border border-border/80 bg-background p-4">
            <DetailEyebrow className="text-[0.72rem]">Workflow runtime summary</DetailEyebrow>

            <div className="grid gap-3 md:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
              <div className="space-y-3 border border-border/70 bg-background/40 p-3">
                <div>
                  <DetailLabel>Name</DetailLabel>
                  <DetailPrimary>{detail.workflowExecution.workflowName}</DetailPrimary>
                  <DetailCode>{detail.workflowExecution.workflowKey}</DetailCode>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ExecutionBadge
                    label={renderWorkflowStatus(detail.workflowExecution.status)}
                    tone={getExecutionStatusTone(detail.workflowExecution.status)}
                  />
                  <ExecutionBadge
                    label={renderWorkflowRoleLabel(detail.workflowExecution.workflowRole)}
                    tone={detail.workflowExecution.workflowRole === "primary" ? "violet" : "slate"}
                  />
                </div>
              </div>

              <div className="space-y-3 border border-border/70 bg-background/40 p-3">
                <div>
                  <DetailLabel>Started</DetailLabel>
                  <DetailPrimary>
                    {formatTimestamp(detail.workflowExecution.startedAt)}
                  </DetailPrimary>
                </div>
                <div>
                  <DetailLabel>Completed</DetailLabel>
                  <DetailPrimary>
                    {formatTimestamp(detail.workflowExecution.completedAt)}
                  </DetailPrimary>
                </div>
                <div>
                  <DetailLabel>Superseded</DetailLabel>
                  <DetailPrimary>
                    {formatTimestamp(detail.workflowExecution.supersededAt)}
                  </DetailPrimary>
                </div>
              </div>
            </div>

            <div className="grid gap-2 border border-border/70 bg-background/40 p-3 text-xs md:grid-cols-2">
              <div className="space-y-1">
                <p className="font-medium text-foreground">Parent transition</p>
                <p className="text-muted-foreground">
                  {detail.parentTransition.transitionName} ({detail.parentTransition.transitionKey})
                </p>
                <Link
                  to="/projects/$projectId/transition-executions/$transitionExecutionId"
                  params={{
                    projectId,
                    transitionExecutionId: detail.parentTransition.transitionExecutionId,
                  }}
                  search={{ projectWorkUnitId: detail.workUnit.projectWorkUnitId }}
                  className="inline-flex font-medium uppercase tracking-[0.1em] text-primary hover:underline"
                >
                  Open transition detail
                </Link>
              </div>

              <div className="space-y-1">
                <p className="font-medium text-foreground">Parent work unit</p>
                <p className="text-muted-foreground">
                  {detail.workUnit.workUnitTypeName} ({detail.workUnit.workUnitTypeKey})
                </p>
                <Link
                  to="/projects/$projectId/work-units/$projectWorkUnitId"
                  params={{ projectId, projectWorkUnitId: detail.workUnit.projectWorkUnitId }}
                  search={{ q: "" }}
                  className="inline-flex font-medium uppercase tracking-[0.1em] text-primary hover:underline"
                >
                  Open work unit overview
                </Link>
              </div>
            </div>
          </section>

          <section className="space-y-3 border border-border/80 bg-background p-4">
            <DetailEyebrow className="text-[0.72rem]">Retry and supersession lineage</DetailEyebrow>

            <div className="space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">Supersedes workflow execution:</span>{" "}
                {detail.lineage.supersedesWorkflowExecutionId ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Superseded by workflow execution:</span>{" "}
                {detail.lineage.supersededByWorkflowExecutionId ?? "—"}
              </p>
            </div>

            {detail.lineage.previousPrimaryAttempts &&
            detail.lineage.previousPrimaryAttempts.length > 0 ? (
              <div className="space-y-2">
                <p className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                  Previous primary attempts
                </p>
                <ul className="space-y-2">
                  {detail.lineage.previousPrimaryAttempts.map((attempt) => (
                    <li
                      key={attempt.workflowExecutionId}
                      className="grid gap-1 border border-border/70 bg-background/40 px-3 py-2 text-xs md:grid-cols-[1fr_auto]"
                    >
                      <div>
                        <p className="font-medium text-foreground">{attempt.workflowName}</p>
                        <p className="text-muted-foreground">{attempt.workflowKey}</p>
                      </div>
                      <Link
                        to="/projects/$projectId/workflow-executions/$workflowExecutionId"
                        params={{ projectId, workflowExecutionId: attempt.workflowExecutionId }}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "xs" }),
                          "h-fit rounded-none text-[0.66rem] uppercase tracking-[0.12em]",
                        )}
                      >
                        Open attempt
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {detail.retryAction?.enabled ? (
              <button
                type="button"
                className={cn(
                  buttonVariants({ variant: "default", size: "sm" }),
                  "rounded-none text-[0.68rem] uppercase tracking-[0.12em]",
                )}
                disabled={retrySameWorkflowMutation.isPending}
                onClick={async () => {
                  await retrySameWorkflowMutation.mutateAsync({
                    projectId,
                    workflowExecutionId,
                  });
                }}
              >
                Retry same workflow
              </button>
            ) : null}

            {detail.retryAction && !detail.retryAction.enabled ? (
              <div className="space-y-1 border border-border/70 bg-background/40 px-3 py-2 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Retry unavailable</p>
                <p>
                  {detail.retryAction.reasonIfDisabled ??
                    "Retry is currently unavailable for this workflow execution."}
                </p>
              </div>
            ) : null}

            {detail.impactDialog?.requiredForRetry ? (
              <p className="text-xs text-muted-foreground">
                Retry impact: transition{" "}
                {detail.impactDialog.affectedEntitiesSummary.transitionExecutionId}
                {" · workflows "}
                {detail.impactDialog.affectedEntitiesSummary.workflowExecutionIds.join(", ")}
              </p>
            ) : null}
          </section>

          <section className="space-y-3 border border-border/80 bg-background p-4">
            <DetailEyebrow className="text-[0.72rem]">Workflow step surface</DetailEyebrow>
            {stepGraphDefinition.steps.length > 0 ? (
              <WorkflowStepSurfaceGraph
                projectId={projectId}
                stepSurface={detail.stepSurface as WorkflowStepSurface}
                steps={stepGraphDefinition.steps}
                edges={stepGraphDefinition.edges}
                executions={
                  (detail.stepGraphRuntime?.executions ?? []) as WorkflowStepGraphRuntimeExecution[]
                }
                branchSelections={
                  (detail.stepGraphRuntime?.branchSelections ??
                    []) as WorkflowStepGraphBranchSelection[]
                }
                activateWorkflowStep={async () => {
                  await activateWorkflowStepMutation.mutateAsync({
                    projectId,
                    workflowExecutionId,
                  });
                }}
                isActivating={activateWorkflowStepMutation.isPending}
                {...(detail.completeAction?.enabled
                  ? { completeWorkflow: () => setOpenCompleteDialog(true) }
                  : {})}
                isCompleting={completeWorkflowMutation.isPending}
              />
            ) : (
              <WorkflowStepSurfaceCard
                projectId={projectId}
                stepSurface={detail.stepSurface as WorkflowStepSurface}
                activateWorkflowStep={async () => {
                  await activateWorkflowStepMutation.mutateAsync({
                    projectId,
                    workflowExecutionId,
                  });
                }}
                isActivating={activateWorkflowStepMutation.isPending}
                {...(detail.completeAction?.enabled
                  ? { completeWorkflow: () => setOpenCompleteDialog(true) }
                  : {})}
                isCompleting={completeWorkflowMutation.isPending}
              />
            )}

            <Dialog open={openCompleteDialog} onOpenChange={setOpenCompleteDialog}>
              <DialogContent className="max-w-md rounded-none border border-border/80 bg-background">
                <DialogHeader>
                  <DialogTitle>Complete workflow execution?</DialogTitle>
                  <DialogDescription>
                    This workflow is terminal. Completing it will mark the workflow execution as
                    finished.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenCompleteDialog(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      await completeWorkflowMutation.mutateAsync({
                        projectId,
                        workflowExecutionId,
                      });
                    }}
                    disabled={completeWorkflowMutation.isPending}
                  >
                    Complete workflow
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </section>

          <section className="w-full space-y-3 border border-border/80 bg-background p-4">
            <div className="space-y-1">
              <div className="space-y-1">
                <DetailEyebrow className="text-[0.72rem]">Workflow context facts</DetailEyebrow>
                <p className="text-sm text-muted-foreground">
                  Context facts now surface their contract, bindings, and recorded instances
                  directly in the card. Click any instance item to inspect its full payload.
                </p>
              </div>
            </div>

            <div className="space-y-3 border border-border/70 bg-background/40 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <DetailLabel>Filter workflow context facts</DetailLabel>
                  <p className="text-xs text-muted-foreground">
                    Search by key, then refine by kind, cardinality, and whether the fact already
                    has instances.
                  </p>
                </div>

                {hasActiveWorkflowContextFilters ? (
                  <button
                    type="button"
                    className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setWorkflowContextFactFilter("");
                      setWorkflowContextKindFilters([]);
                      setWorkflowContextCardinalityFilters([]);
                      setWorkflowContextInstanceFilters([]);
                    }}
                  >
                    Clear all filters
                  </button>
                ) : null}
              </div>

              <div className="grid gap-3 xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] xl:items-start">
                <div className="space-y-2">
                  <DetailLabel className="text-[0.65rem]">Key search</DetailLabel>
                  <Input
                    value={workflowContextFactFilter}
                    onChange={(event) => setWorkflowContextFactFilter(event.target.value)}
                    placeholder="Search by context fact key…"
                    aria-label="Filter context facts by key"
                  />
                  <p className="text-xs text-muted-foreground">
                    Showing {filteredWorkflowContextFactGroups.length} of{" "}
                    {workflowContextFactGroups.length} context facts.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <DetailLabel className="text-[0.65rem]">Kinds</DetailLabel>
                    {availableWorkflowContextKinds.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          aria-pressed={workflowContextKindFilters.length === 0}
                          className={cn(
                            "inline-flex items-center gap-2 border px-2 py-1 text-[0.65rem] font-medium uppercase tracking-[0.14em] transition-colors",
                            workflowContextKindFilters.length === 0
                              ? "border-foreground/30 bg-foreground/10 text-foreground"
                              : "border-border/70 bg-background/50 text-muted-foreground hover:text-foreground",
                          )}
                          onClick={() => setWorkflowContextKindFilters([])}
                        >
                          All
                          <span className="text-[0.62rem] text-muted-foreground">
                            {workflowContextFactGroups.length}
                          </span>
                        </button>

                        {availableWorkflowContextKinds.map((kind) => {
                          const active = workflowContextKindFilters.includes(kind);
                          const count = workflowContextKindCounts.get(kind) ?? 0;
                          const tone = getWorkflowContextKindTone(kind);

                          return (
                            <button
                              key={kind}
                              type="button"
                              aria-pressed={active}
                              className={cn(
                                "inline-flex items-center gap-2 border px-2 py-1 text-[0.65rem] font-medium uppercase tracking-[0.14em] transition-colors",
                                active
                                  ? ACCENT_TONE_CLASSES[tone]
                                  : "border-border/70 bg-background/50 text-muted-foreground hover:text-foreground",
                              )}
                              onClick={() => {
                                setWorkflowContextKindFilters((current) =>
                                  current.includes(kind)
                                    ? current.filter((candidate) => candidate !== kind)
                                    : [...current, kind],
                                );
                              }}
                            >
                              {renderWorkflowContextFilterKind(kind)}
                              <span
                                className={cn(
                                  "text-[0.62rem]",
                                  active ? "text-current" : "text-muted-foreground",
                                )}
                              >
                                {count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Kind filters appear once context fact contract metadata is available.
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <DetailLabel className="text-[0.65rem]">Cardinality</DetailLabel>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        aria-pressed={workflowContextCardinalityFilters.length === 0}
                        className={cn(
                          "inline-flex items-center gap-2 border px-2 py-1 text-[0.65rem] font-medium uppercase tracking-[0.14em] transition-colors",
                          workflowContextCardinalityFilters.length === 0
                            ? "border-foreground/30 bg-foreground/10 text-foreground"
                            : "border-border/70 bg-background/50 text-muted-foreground hover:text-foreground",
                        )}
                        onClick={() => setWorkflowContextCardinalityFilters([])}
                      >
                        All
                        <span className="text-[0.62rem] text-muted-foreground">
                          {workflowContextFactGroups.length}
                        </span>
                      </button>

                      {WORKFLOW_CONTEXT_FILTER_CARDINALITY_ORDER.map((cardinality) => {
                        const active = workflowContextCardinalityFilters.includes(cardinality);
                        const count = workflowContextCardinalityCounts.get(cardinality) ?? 0;
                        const tone = cardinality === "one" ? "sky" : "violet";

                        return (
                          <button
                            key={cardinality}
                            type="button"
                            aria-pressed={active}
                            className={cn(
                              "inline-flex items-center gap-2 border px-2 py-1 text-[0.65rem] font-medium uppercase tracking-[0.14em] transition-colors",
                              active
                                ? ACCENT_TONE_CLASSES[tone]
                                : "border-border/70 bg-background/50 text-muted-foreground hover:text-foreground",
                            )}
                            onClick={() => {
                              setWorkflowContextCardinalityFilters((current) =>
                                current.includes(cardinality)
                                  ? current.filter((candidate) => candidate !== cardinality)
                                  : [...current, cardinality],
                              );
                            }}
                          >
                            {renderWorkflowContextCardinality(cardinality)}
                            <span
                              className={cn(
                                "text-[0.62rem]",
                                active ? "text-current" : "text-muted-foreground",
                              )}
                            >
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <DetailLabel className="text-[0.65rem]">Instance state</DetailLabel>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        aria-pressed={workflowContextInstanceFilters.length === 0}
                        className={cn(
                          "inline-flex items-center gap-2 border px-2 py-1 text-[0.65rem] font-medium uppercase tracking-[0.14em] transition-colors",
                          workflowContextInstanceFilters.length === 0
                            ? "border-foreground/30 bg-foreground/10 text-foreground"
                            : "border-border/70 bg-background/50 text-muted-foreground hover:text-foreground",
                        )}
                        onClick={() => setWorkflowContextInstanceFilters([])}
                      >
                        All
                        <span className="text-[0.62rem] text-muted-foreground">
                          {workflowContextFactGroups.length}
                        </span>
                      </button>

                      {WORKFLOW_CONTEXT_INSTANCE_FILTER_ORDER.map((instanceFilter) => {
                        const active = workflowContextInstanceFilters.includes(instanceFilter);
                        const count = workflowContextInstanceCounts.get(instanceFilter) ?? 0;
                        const tone = instanceFilter === "has_instance" ? "emerald" : "slate";

                        return (
                          <button
                            key={instanceFilter}
                            type="button"
                            aria-pressed={active}
                            className={cn(
                              "inline-flex items-center gap-2 border px-2 py-1 text-[0.65rem] font-medium uppercase tracking-[0.14em] transition-colors",
                              active
                                ? ACCENT_TONE_CLASSES[tone]
                                : "border-border/70 bg-background/50 text-muted-foreground hover:text-foreground",
                            )}
                            onClick={() => {
                              setWorkflowContextInstanceFilters((current) =>
                                current.includes(instanceFilter)
                                  ? current.filter((candidate) => candidate !== instanceFilter)
                                  : [...current, instanceFilter],
                              );
                            }}
                          >
                            {renderWorkflowContextInstanceFilter(instanceFilter)}
                            <span
                              className={cn(
                                "text-[0.62rem]",
                                active ? "text-current" : "text-muted-foreground",
                              )}
                            >
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {workflowContextFactGroups.length === 0 ? (
              <p className="border border-border/70 bg-background/40 px-3 py-2 text-sm text-muted-foreground">
                This workflow does not define any context facts.
              </p>
            ) : filteredWorkflowContextFactGroups.length === 0 ? (
              <p className="border border-border/70 bg-background/40 px-3 py-6 text-sm text-muted-foreground">
                No workflow context facts match “{workflowContextFactFilter.trim()}”.
              </p>
            ) : (
              <div className="max-h-[min(70vh,44rem)] overflow-y-auto pr-2">
                <div className="space-y-3">
                  {filteredWorkflowContextFactGroups.map((group) => {
                    const definition =
                      contextDefinitions.get(group.contextFactDefinitionId) ?? null;
                    const presentation = buildWorkflowContextFactPresentation({
                      definition,
                      projectFactCatalog,
                      workUnitFactCatalog,
                      workUnitCatalog,
                      workflowOptions,
                      artifactSlotCatalog,
                    });
                    const editor = definition
                      ? buildWorkflowContextDialogEditor({
                          definition,
                          projectFactCatalog,
                          workUnitFactCatalog,
                          workUnitCatalog,
                          workflowOptions,
                          artifactSlotCatalog,
                          artifactSnapshotOptionsBySlot,
                          boundFactInstanceOptionsByContextFactDefinition,
                          workUnitOptions,
                        })
                      : null;

                    return (
                      <div key={group.contextFactDefinitionId} className="space-y-0">
                        <WorkflowContextManualCrudCard
                          group={group}
                          definition={definition}
                          editor={editor}
                          presentation={presentation}
                          onCreate={async (value) => {
                            await createWorkflowContextFactMutation.mutateAsync({
                              projectId,
                              workflowExecutionId,
                              contextFactDefinitionId: group.contextFactDefinitionId,
                              value,
                            });
                          }}
                          onUpdate={async (instanceId, value) => {
                            await updateWorkflowContextFactMutation.mutateAsync({
                              projectId,
                              workflowExecutionId,
                              contextFactDefinitionId: group.contextFactDefinitionId,
                              instanceId,
                              value,
                            });
                          }}
                          onRemove={async (instanceId) => {
                            await removeWorkflowContextFactMutation.mutateAsync({
                              projectId,
                              workflowExecutionId,
                              contextFactDefinitionId: group.contextFactDefinitionId,
                              instanceId,
                            });
                          }}
                          onDeleteAll={async () => {
                            await deleteWorkflowContextFactMutation.mutateAsync({
                              projectId,
                              workflowExecutionId,
                              contextFactDefinitionId: group.contextFactDefinitionId,
                            });
                          }}
                          isCreating={createWorkflowContextFactMutation.isPending}
                          isUpdating={updateWorkflowContextFactMutation.isPending}
                          isRemoving={removeWorkflowContextFactMutation.isPending}
                          isDeleting={deleteWorkflowContextFactMutation.isPending}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          <section className="flex flex-wrap gap-2">
            <Link
              to="/projects/$projectId/workflows"
              params={{ projectId }}
              search={{ q: "", workUnitTypeKey: "all" }}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-none")}
            >
              Back to Active Workflows
            </Link>

            <Link
              to="/projects/$projectId/transitions"
              params={{ projectId }}
              search={{ q: "", status: "all" }}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-none")}
            >
              Back to Guidance
            </Link>
          </section>
        </>
      ) : null}
    </MethodologyWorkspaceShell>
  );
}

export function WorkflowExecutionShellRoute() {
  return <WorkflowExecutionDetailRoute />;
}
