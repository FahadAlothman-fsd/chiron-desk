import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "@/components/ui/sonner";

import type {
  WorkflowContextFactDefinitionItem,
  WorkflowContextFactDraft,
  WorkflowEditorEdge,
  WorkflowEditorGuidance,
  WorkflowEditorPickerBadge,
  WorkflowEditorMetadata,
  WorkflowEditorPickerOption,
  WorkflowEditorStep,
  WorkflowFormStepPayload,
} from "../features/workflow-editor/types";
import { WorkflowEditorShell } from "../features/workflow-editor/workflow-editor-shell";

export const Route = createFileRoute(
  "/methodologies/$methodologyId/versions/$versionId/work-units/$workUnitKey/workflow-editor/$workflowDefinitionId",
)({
  component: MethodologyWorkflowEditorRoute,
});

type RawEditorDefinition = {
  workflow?: unknown;
  steps?: unknown;
  edges?: unknown;
  contextFacts?: unknown;
  formDefinitions?: unknown;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readMarkdown(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  const record = asRecord(value);
  if (!record) {
    return "";
  }

  if (typeof record.markdown === "string") {
    return record.markdown;
  }

  return "";
}

function readGuidance(value: unknown): WorkflowEditorGuidance {
  const record = asRecord(value);
  if (!record) {
    return { humanMarkdown: "", agentMarkdown: "" };
  }

  const human = readMarkdown(record.human);
  const agent = readMarkdown(record.agent);

  return { humanMarkdown: human, agentMarkdown: agent };
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

function normalizeContextFactKind(
  value: unknown,
): WorkflowContextFactDefinitionItem["kind"] | null {
  switch (value) {
    case "plain_value_fact":
    case "definition_backed_external_fact":
    case "bound_external_fact":
    case "workflow_reference_fact":
    case "artifact_reference_fact":
    case "work_unit_draft_spec_fact":
      return value;
    case "plain_value":
      return "plain_value_fact";
    case "workflow_reference":
      return "workflow_reference_fact";
    case "artifact_reference":
      return "artifact_reference_fact";
    case "draft_spec":
      return "work_unit_draft_spec_fact";
    case "external_binding":
      return "bound_external_fact";
    default:
      return null;
  }
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

function toWorkflowMetadata(
  workflowDefinitionId: string,
  workflow: unknown,
): WorkflowEditorMetadata {
  const value = asRecord(workflow) ?? {};

  const descriptionMarkdown =
    readMarkdown(value.descriptionJson) ||
    readMarkdown(value.description) ||
    readMarkdown(value.guidanceJson);
  const key =
    typeof value.key === "string" && value.key.trim().length > 0 ? value.key : workflowDefinitionId;
  const displayName =
    typeof value.displayName === "string" && value.displayName.trim().length > 0
      ? value.displayName
      : key;

  return {
    workflowDefinitionId,
    key,
    displayName,
    descriptionMarkdown,
  };
}

function toFormFields(rawFields: unknown): WorkflowFormStepPayload["fields"] {
  if (!Array.isArray(rawFields)) {
    return [];
  }

  const fields: WorkflowFormStepPayload["fields"] = [];

  rawFields.forEach((entry) => {
    const field = asRecord(entry);
    if (!field) {
      return;
    }

    if (typeof field.contextFactDefinitionId === "string") {
      fields.push({
        contextFactDefinitionId: field.contextFactDefinitionId,
        fieldLabel:
          typeof field.fieldLabel === "string" && field.fieldLabel.trim().length > 0
            ? field.fieldLabel
            : field.contextFactDefinitionId,
        fieldKey:
          typeof field.fieldKey === "string" && field.fieldKey.trim().length > 0
            ? field.fieldKey
            : field.contextFactDefinitionId,
        helpText:
          typeof field.helpText === "string"
            ? field.helpText
            : field.helpText === null
              ? null
              : null,
        required: field.required === true,
        ...(field.uiMultiplicityMode === "one" || field.uiMultiplicityMode === "many"
          ? { uiMultiplicityMode: field.uiMultiplicityMode }
          : {}),
      });
      return;
    }

    if (typeof field.key === "string") {
      fields.push({
        contextFactDefinitionId: field.key,
        fieldLabel:
          typeof field.label === "string" && field.label.trim().length > 0
            ? field.label
            : field.key,
        fieldKey: field.key,
        helpText: readMarkdown(field.descriptionJson) || null,
        required: field.required === true,
      });
    }
  });

  return fields;
}

function toWorkflowFormPayload(rawPayload: unknown): WorkflowFormStepPayload | null {
  const payload = asRecord(rawPayload);
  if (!payload || typeof payload.key !== "string") {
    return null;
  }

  return {
    key: payload.key,
    ...(typeof payload.label === "string" ? { label: payload.label } : {}),
    ...(readMarkdown(payload.descriptionJson)
      ? { descriptionJson: { markdown: readMarkdown(payload.descriptionJson) } }
      : {}),
    fields: toFormFields(payload.fields),
    guidance: readGuidance(payload.guidanceJson ?? payload.guidance),
  };
}

function toWorkflowSteps(rawSteps: unknown, rawFormDefinitions: unknown): WorkflowEditorStep[] {
  const definitionsByStepId = new Map<string, WorkflowFormStepPayload>();

  if (Array.isArray(rawFormDefinitions)) {
    rawFormDefinitions.forEach((entry) => {
      const definition = asRecord(entry);
      if (!definition || typeof definition.stepId !== "string") {
        return;
      }

      const payload = toWorkflowFormPayload(definition.payload);
      if (payload) {
        definitionsByStepId.set(definition.stepId, payload);
      }
    });
  }

  const stepsFromWorkflow = Array.isArray(rawSteps)
    ? rawSteps
        .map((rawStep, index): WorkflowEditorStep | null => {
          const step = asRecord(rawStep);
          if (!step) {
            return null;
          }

          if (step.stepType !== "form" && step.type !== "form") {
            return null;
          }

          const stepId = typeof step.stepId === "string" ? step.stepId : `step-${index}`;
          const payload = toWorkflowFormPayload(step.payload) ?? definitionsByStepId.get(stepId);

          if (!payload) {
            return null;
          }

          return {
            stepId,
            stepType: "form",
            payload,
          };
        })
        .filter((step): step is WorkflowEditorStep => step !== null)
    : [];

  if (stepsFromWorkflow.length > 0) {
    return stepsFromWorkflow;
  }

  return [...definitionsByStepId.entries()].map(([stepId, payload]) => ({
    stepId,
    stepType: "form",
    payload,
  }));
}

function toWorkflowEdges(rawEdges: unknown): WorkflowEditorEdge[] {
  if (!Array.isArray(rawEdges)) {
    return [];
  }

  return rawEdges
    .map((rawEdge, index): WorkflowEditorEdge | null => {
      const edge = asRecord(rawEdge);
      if (!edge) {
        return null;
      }

      if (typeof edge.fromStepKey !== "string" || typeof edge.toStepKey !== "string") {
        return null;
      }

      return {
        edgeId:
          typeof edge.edgeId === "string"
            ? edge.edgeId
            : typeof edge.edgeKey === "string"
              ? edge.edgeKey
              : `edge-${index}`,
        fromStepKey: edge.fromStepKey,
        toStepKey: edge.toStepKey,
        descriptionMarkdown: readMarkdown(edge.descriptionJson),
      };
    })
    .filter((edge): edge is WorkflowEditorEdge => edge !== null);
}

function toContextFactDefinitions(rawFacts: unknown): WorkflowContextFactDefinitionItem[] {
  if (!Array.isArray(rawFacts)) {
    return [];
  }

  return rawFacts
    .map((entry): WorkflowContextFactDefinitionItem | null => {
      const value = asRecord(entry);
      if (!value) {
        return null;
      }

      const kind = normalizeContextFactKind(value.kind);
      if (!kind || typeof value.key !== "string") {
        return null;
      }

      const cardinality = value.cardinality === "many" ? "many" : "one";
      const item: WorkflowContextFactDefinitionItem = {
        contextFactDefinitionId:
          typeof value.contextFactDefinitionId === "string"
            ? value.contextFactDefinitionId
            : typeof value.factKey === "string"
              ? value.factKey
              : value.key,
        key: value.key,
        label:
          typeof value.label === "string"
            ? value.label
            : typeof value.displayName === "string"
              ? value.displayName
              : value.key,
        descriptionMarkdown:
          readMarkdown(value.descriptionJson) ||
          readMarkdown(value.description) ||
          readMarkdown(value.summaryJson),
        kind: kind as WorkflowContextFactDefinitionItem["kind"],
        cardinality,
        guidance: readGuidance(value.guidanceJson ?? value.guidance),
        allowedWorkflowDefinitionIds: Array.isArray(value.allowedWorkflowDefinitionIds)
          ? value.allowedWorkflowDefinitionIds.filter(
              (workflowId): workflowId is string => typeof workflowId === "string",
            )
          : [],
        includedFactKeys: Array.isArray(value.includedFactKeys)
          ? value.includedFactKeys.filter(
              (factKey): factKey is string => typeof factKey === "string",
            )
          : Array.isArray(value.fields)
            ? value.fields
                .map((field) => asRecord(field)?.key)
                .filter((factKey): factKey is string => typeof factKey === "string")
            : [],
        summary: typeof value.summary === "string" ? value.summary : "",
      };

      if (
        kind === "plain_value_fact" &&
        (value.valueType === "string" ||
          value.valueType === "number" ||
          value.valueType === "boolean" ||
          value.valueType === "json")
      ) {
        item.valueType = value.valueType;
      }

      if (typeof value.externalFactDefinitionId === "string") {
        item.externalFactDefinitionId = value.externalFactDefinitionId;
      }

      if (typeof value.artifactSlotDefinitionId === "string") {
        item.artifactSlotDefinitionId = value.artifactSlotDefinitionId;
      } else if (typeof value.artifactSlotKey === "string") {
        item.artifactSlotDefinitionId = value.artifactSlotKey;
      }

      if (typeof value.workUnitTypeKey === "string") {
        item.workUnitTypeKey = value.workUnitTypeKey;
      }

      return {
        ...item,
        summary: item.summary || summarizeContextFact(item),
      };
    })
    .filter((item): item is WorkflowContextFactDefinitionItem => item !== null);
}

function toContextFactMutationPayload(draft: WorkflowContextFactDraft) {
  const descriptionMarkdown = draft.descriptionMarkdown.trim();
  const humanMarkdown = draft.guidance.humanMarkdown.trim();
  const agentMarkdown = draft.guidance.agentMarkdown.trim();

  const base = {
    kind: draft.kind,
    key: draft.key.trim(),
    label: draft.label.trim() || undefined,
    cardinality: draft.cardinality,
    ...(descriptionMarkdown.length > 0
      ? {
          descriptionJson: { markdown: descriptionMarkdown },
        }
      : {}),
    guidanceJson: {
      human: humanMarkdown.length > 0 ? { markdown: humanMarkdown } : undefined,
      agent: agentMarkdown.length > 0 ? { markdown: agentMarkdown } : undefined,
    },
  };

  switch (draft.kind) {
    case "plain_value_fact":
      return { ...base, valueType: draft.valueType ?? "string" };
    case "definition_backed_external_fact":
    case "bound_external_fact":
      return {
        ...base,
        externalFactDefinitionId: draft.externalFactDefinitionId?.trim() ?? "",
      };
    case "workflow_reference_fact":
      return {
        ...base,
        allowedWorkflowDefinitionIds: draft.allowedWorkflowDefinitionIds,
      };
    case "artifact_reference_fact":
      return {
        ...base,
        artifactSlotDefinitionId: draft.artifactSlotDefinitionId?.trim() ?? "",
      };
    case "work_unit_draft_spec_fact":
      return {
        ...base,
        workUnitTypeKey: draft.workUnitTypeKey?.trim() ?? "",
        includedFactKeys: draft.includedFactKeys,
      };
  }
}

function getFactDefinitionEntries(rawFactDefinitions: unknown) {
  const record = asRecord(rawFactDefinitions);
  return Array.isArray(record?.factDefinitions)
    ? record.factDefinitions
    : Array.isArray(record?.factSchemas)
      ? record.factSchemas
      : Array.isArray(rawFactDefinitions)
        ? rawFactDefinitions
        : [];
}

function getWorkUnitEntries(rawWorkUnits: unknown) {
  const record = asRecord(rawWorkUnits);
  return Array.isArray(record?.workUnitTypes)
    ? record.workUnitTypes
    : Array.isArray(rawWorkUnits)
      ? rawWorkUnits
      : [];
}

function getWorkUnitFactEntries(rawWorkUnits: unknown, workUnitTypeKey: string) {
  const matchedWorkUnit = getWorkUnitEntries(rawWorkUnits).find((entry) => {
    const workUnit = asRecord(entry);
    return workUnit && workUnit.key === workUnitTypeKey;
  });
  const workUnit = asRecord(matchedWorkUnit);

  return Array.isArray(workUnit?.factSchemas) ? workUnit.factSchemas : [];
}

function normalizePickerFactType(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  switch (value) {
    case "string":
    case "number":
    case "boolean":
    case "json":
      return value;
    case "work_unit":
    case "work unit":
      return "work unit";
    default:
      return null;
  }
}

function getWorkUnitTypeLabel(rawWorkUnits: unknown, workUnitTypeKey: string) {
  const matchedWorkUnit = getWorkUnitEntries(rawWorkUnits).find((entry) => {
    const workUnit = asRecord(entry);
    return workUnit && workUnit.key === workUnitTypeKey;
  });
  const workUnit = asRecord(matchedWorkUnit);

  if (!workUnit) {
    return null;
  }

  if (typeof workUnit.displayName === "string" && workUnit.displayName.trim().length > 0) {
    return workUnit.displayName.trim();
  }

  if (typeof workUnit.name === "string" && workUnit.name.trim().length > 0) {
    return workUnit.name.trim();
  }

  return typeof workUnit.key === "string" && workUnit.key.trim().length > 0
    ? workUnit.key.trim()
    : null;
}

function getFactTypeBadgeTone(
  type: ReturnType<typeof normalizePickerFactType>,
): WorkflowEditorPickerBadge["tone"] {
  switch (type) {
    case "string":
      return "type-string";
    case "number":
      return "type-number";
    case "boolean":
      return "type-boolean";
    case "json":
      return "type-json";
    case "work unit":
      return "type-work-unit";
    default:
      return "cardinality";
  }
}

function toFactOptions(
  rawFactDefinitions: unknown,
  fallbackDescription: string,
  rawWorkUnits: unknown,
  source: "methodology" | "current_work_unit",
): WorkflowEditorPickerOption[] {
  const facts = getFactDefinitionEntries(rawFactDefinitions);

  return facts
    .map((entry) => {
      const value = asRecord(entry);
      if (!value || typeof value.key !== "string") {
        return null;
      }

      const label =
        typeof value.name === "string" && value.name.trim().length > 0
          ? value.name.trim()
          : typeof value.label === "string" && value.label.trim().length > 0
            ? value.label.trim()
            : typeof value.displayName === "string" && value.displayName.trim().length > 0
              ? value.displayName.trim()
              : value.key;
      const description = readMarkdown(value.descriptionJson) || readMarkdown(value.description);
      const cardinality =
        value.cardinality === "one" || value.cardinality === "many" ? value.cardinality : null;
      const factType = normalizePickerFactType(value.valueType ?? value.factType);
      const workUnitTypeKey =
        typeof value.workUnitTypeKey === "string" && value.workUnitTypeKey.trim().length > 0
          ? value.workUnitTypeKey.trim()
          : null;
      const workUnitTypeLabel =
        factType === "work unit" && workUnitTypeKey
          ? getWorkUnitTypeLabel(rawWorkUnits, workUnitTypeKey)
          : null;
      const badges: WorkflowEditorPickerBadge[] = [
        {
          label: source === "methodology" ? "Methodology" : "Current Work Unit",
          tone: source === "methodology" ? "source-methodology" : "source-current-work-unit",
        },
        ...(cardinality ? [{ label: cardinality, tone: "cardinality" as const }] : []),
        ...(factType ? [{ label: factType, tone: getFactTypeBadgeTone(factType) }] : []),
        ...(workUnitTypeLabel
          ? [{ label: workUnitTypeLabel, tone: "work-unit-definition" as const }]
          : []),
      ];
      const searchText = [
        value.key,
        label,
        description,
        fallbackDescription,
        workUnitTypeKey,
        ...badges.map((badge) => badge.label),
      ]
        .filter((segment): segment is string => typeof segment === "string" && segment.length > 0)
        .join(" ");

      return {
        value: value.key,
        label,
        description: description || fallbackDescription,
        searchText,
        badges,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
}

function toMethodologyFactOptions(rawFactDefinitions: unknown, rawWorkUnits: unknown) {
  return toFactOptions(rawFactDefinitions, "Methodology fact", rawWorkUnits, "methodology");
}

function toWorkUnitFactOptions(rawWorkUnits: unknown, workUnitTypeKey: string) {
  return toFactOptions(
    getWorkUnitFactEntries(rawWorkUnits, workUnitTypeKey),
    "Work unit fact",
    rawWorkUnits,
    "current_work_unit",
  );
}

function toWorkUnitTypeOptions(rawWorkUnits: unknown) {
  const workUnitTypes = getWorkUnitEntries(rawWorkUnits);

  return workUnitTypes
    .map((entry) => {
      const workUnit = asRecord(entry);
      if (!workUnit || typeof workUnit.key !== "string") {
        return null;
      }

      const label =
        typeof workUnit.displayName === "string" && workUnit.displayName.trim().length > 0
          ? workUnit.displayName.trim()
          : workUnit.key;
      const description =
        readMarkdown(workUnit.descriptionJson) ||
        readMarkdown(workUnit.description) ||
        (typeof workUnit.cardinality === "string"
          ? workUnit.cardinality.replaceAll("_", " ")
          : "") ||
        "Work unit";

      return {
        value: workUnit.key,
        label,
        description,
      };
    })
    .filter(
      (entry): entry is { value: string; label: string; description: string } => entry !== null,
    );
}

function toArtifactSlotOptions(rawArtifactSlots: unknown) {
  const record = asRecord(rawArtifactSlots);
  const slots = Array.isArray(rawArtifactSlots)
    ? rawArtifactSlots
    : Array.isArray(record?.artifactSlots)
      ? record.artifactSlots
      : [];

  return slots
    .map((entry) => {
      const slot = asRecord(entry);
      if (!slot || typeof slot.key !== "string") {
        return null;
      }

      const cardinality =
        typeof slot.cardinality === "string" ? slot.cardinality.replaceAll("_", " ") : null;

      return {
        value: slot.key,
        label:
          typeof slot.displayName === "string" && slot.displayName.trim().length > 0
            ? slot.displayName.trim()
            : slot.key,
        description: readMarkdown(slot.description) || "Artifact slot",
        badges: cardinality ? [{ label: cardinality, tone: "cardinality" as const }] : [],
      };
    })
    .filter(
      (
        entry,
      ): entry is {
        value: string;
        label: string;
        description: string;
        badges: { label: string; tone: "cardinality" }[];
      } => entry !== null,
    );
}

function toWorkflowOptions(rawWorkflows: unknown) {
  const record = asRecord(rawWorkflows);
  const workflows = Array.isArray(record?.workflows)
    ? record.workflows
    : Array.isArray(rawWorkflows)
      ? rawWorkflows
      : [];

  return workflows
    .map((entry) => {
      const workflow = asRecord(entry);
      if (!workflow) {
        return null;
      }

      const value =
        typeof workflow.workflowDefinitionId === "string" &&
        workflow.workflowDefinitionId.trim().length > 0
          ? workflow.workflowDefinitionId
          : typeof workflow.key === "string" && workflow.key.trim().length > 0
            ? workflow.key
            : null;

      if (!value) {
        return null;
      }

      return {
        value,
        label:
          typeof workflow.displayName === "string" && workflow.displayName.trim().length > 0
            ? workflow.displayName
            : value,
        description:
          readMarkdown(workflow.descriptionJson) ||
          readMarkdown(workflow.description) ||
          readMarkdown(workflow.guidanceJson) ||
          "Workflow",
      };
    })
    .filter(
      (entry): entry is { value: string; label: string; description: string } => entry !== null,
    );
}

export function MethodologyWorkflowEditorRoute() {
  const { methodologyId, versionId, workUnitKey, workflowDefinitionId } = Route.useParams();
  const { orpc, queryClient } = Route.useRouteContext();

  const workflowProcedures = orpc.methodology.version.workUnit.workflow as unknown as {
    getEditorDefinition?: {
      queryOptions: (args: {
        input: {
          methodologyId: string;
          versionId: string;
          workUnitTypeKey: string;
          workflowDefinitionId: string;
        };
      }) => unknown;
    };
    updateWorkflowMetadata?: { mutationOptions: () => unknown };
    createFormStep?: { mutationOptions: () => unknown };
    updateFormStep?: { mutationOptions: () => unknown };
    deleteFormStep?: { mutationOptions: () => unknown };
    createEdge?: { mutationOptions: () => unknown };
    updateEdge?: { mutationOptions: () => unknown };
    deleteEdge?: { mutationOptions: () => unknown };
    contextFact?: {
      create?: { mutationOptions: () => unknown };
      update?: { mutationOptions: () => unknown };
      delete?: { mutationOptions: () => unknown };
    };
  };

  const editorQueryOptions = (workflowProcedures.getEditorDefinition?.queryOptions?.({
    input: {
      methodologyId,
      versionId,
      workUnitTypeKey: workUnitKey,
      workflowDefinitionId,
    },
  }) ?? {
    queryKey: ["workflow-editor", methodologyId, versionId, workUnitKey, workflowDefinitionId],
    queryFn: async () => null,
  }) as unknown as {
    queryKey: unknown[];
    queryFn: () => Promise<unknown>;
  };

  const editorDefinitionQuery = useQuery(editorQueryOptions);
  const methodologyFactsQueryOptions = (orpc.methodology.version.fact?.list?.queryOptions?.({
    input: { versionId },
  }) ?? {
    queryKey: ["methodology-facts", versionId],
    queryFn: async () => ({ factDefinitions: [] }),
  }) as unknown as {
    queryKey: unknown[];
    queryFn: () => Promise<unknown>;
  };
  const methodologyFactsQuery = useQuery(methodologyFactsQueryOptions);
  const workUnitTypesQueryOptions = (orpc.methodology.version.workUnit.list?.queryOptions?.({
    input: { versionId },
  }) ?? {
    queryKey: ["work-unit-types", versionId],
    queryFn: async () => ({ workUnitTypes: [] }),
  }) as unknown as {
    queryKey: unknown[];
    queryFn: () => Promise<unknown>;
  };
  const workUnitTypesQuery = useQuery(workUnitTypesQueryOptions);
  const workUnitFactsQueryOptions = (orpc.methodology.version.workUnit.fact?.list?.queryOptions?.({
    input: { versionId },
  }) ?? {
    queryKey: ["work-unit-facts", versionId],
    queryFn: async () => ({ workUnitTypes: [] }),
  }) as unknown as {
    queryKey: unknown[];
    queryFn: () => Promise<unknown>;
  };
  const workUnitFactsQuery = useQuery(workUnitFactsQueryOptions);
  const artifactSlotsQueryOptions =
    (orpc.methodology.version.workUnit.artifactSlot?.list?.queryOptions?.({
      input: { versionId, workUnitTypeKey: workUnitKey },
    }) ?? {
      queryKey: ["work-unit-artifact-slots", versionId, workUnitKey],
      queryFn: async () => [],
    }) as unknown as {
      queryKey: unknown[];
      queryFn: () => Promise<unknown>;
    };
  const artifactSlotsQuery = useQuery(artifactSlotsQueryOptions);
  const availableWorkflowsQueryOptions =
    (orpc.methodology.version.workUnit.workflow.list?.queryOptions?.({
      input: { versionId, workUnitTypeKey: workUnitKey },
    }) ?? {
      queryKey: ["work-unit-workflows", versionId, workUnitKey],
      queryFn: async () => [],
    }) as unknown as {
      queryKey: unknown[];
      queryFn: () => Promise<unknown>;
    };
  const availableWorkflowsQuery = useQuery(availableWorkflowsQueryOptions);

  const updateWorkflowMutation = useMutation(
    (workflowProcedures.updateWorkflowMetadata?.mutationOptions?.() ?? {
      mutationFn: async () => null,
    }) as { mutationFn: (input: unknown) => Promise<unknown> },
  );
  const createFormStepMutation = useMutation(
    (workflowProcedures.createFormStep?.mutationOptions?.() ?? {
      mutationFn: async () => null,
    }) as { mutationFn: (input: unknown) => Promise<unknown> },
  );
  const updateFormStepMutation = useMutation(
    (workflowProcedures.updateFormStep?.mutationOptions?.() ?? {
      mutationFn: async () => null,
    }) as { mutationFn: (input: unknown) => Promise<unknown> },
  );
  const deleteFormStepMutation = useMutation(
    (workflowProcedures.deleteFormStep?.mutationOptions?.() ?? {
      mutationFn: async () => null,
    }) as { mutationFn: (input: unknown) => Promise<unknown> },
  );
  const createContextFactMutation = useMutation(
    (workflowProcedures.contextFact?.create?.mutationOptions?.() ?? {
      mutationFn: async () => null,
    }) as { mutationFn: (input: unknown) => Promise<unknown> },
  );
  const updateContextFactMutation = useMutation(
    (workflowProcedures.contextFact?.update?.mutationOptions?.() ?? {
      mutationFn: async () => null,
    }) as { mutationFn: (input: unknown) => Promise<unknown> },
  );
  const deleteContextFactMutation = useMutation(
    (workflowProcedures.contextFact?.delete?.mutationOptions?.() ?? {
      mutationFn: async () => null,
    }) as { mutationFn: (input: unknown) => Promise<unknown> },
  );
  const createEdgeMutation = useMutation(
    (workflowProcedures.createEdge?.mutationOptions?.() ?? {
      mutationFn: async () => null,
    }) as { mutationFn: (input: unknown) => Promise<unknown> },
  );
  const updateEdgeMutation = useMutation(
    (workflowProcedures.updateEdge?.mutationOptions?.() ?? {
      mutationFn: async () => null,
    }) as { mutationFn: (input: unknown) => Promise<unknown> },
  );
  const deleteEdgeMutation = useMutation(
    (workflowProcedures.deleteEdge?.mutationOptions?.() ?? {
      mutationFn: async () => null,
    }) as { mutationFn: (input: unknown) => Promise<unknown> },
  );

  const editorDefinition =
    (editorDefinitionQuery.data as RawEditorDefinition | null | undefined) ?? null;
  const workflow = editorDefinition ? asRecord(editorDefinition.workflow) : null;

  if (editorDefinitionQuery.isLoading) {
    return (
      <section className="chiron-frame-flat chiron-tone-canvas grid gap-2 p-4">
        <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
          Workflow Editor
        </p>
        <p className="text-sm text-muted-foreground">Loading workflow editor definition...</p>
      </section>
    );
  }

  if (!workflow) {
    return (
      <section className="chiron-frame-flat chiron-tone-contracts grid gap-2 p-4">
        <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
          Workflow Editor
        </p>
        <p className="text-sm">
          Unable to resolve workflow {workflowDefinitionId} for work unit {workUnitKey}.
        </p>
      </section>
    );
  }

  const resolvedWorkflowDefinitionId =
    typeof workflow.workflowDefinitionId === "string" && workflow.workflowDefinitionId.length > 0
      ? workflow.workflowDefinitionId
      : workflowDefinitionId;
  const initialSteps = toWorkflowSteps(editorDefinition?.steps, editorDefinition?.formDefinitions);

  return (
    <WorkflowEditorShell
      metadata={toWorkflowMetadata(resolvedWorkflowDefinitionId, workflow)}
      initialSteps={initialSteps}
      initialEdges={toWorkflowEdges(editorDefinition?.edges)}
      contextFactDefinitions={toContextFactDefinitions(editorDefinition?.contextFacts)}
      methodologyFacts={toMethodologyFactOptions(
        methodologyFactsQuery.data,
        workUnitTypesQuery.data,
      )}
      currentWorkUnitFacts={toWorkUnitFactOptions(workUnitFactsQuery.data, workUnitKey)}
      artifactSlots={toArtifactSlotOptions(artifactSlotsQuery.data)}
      workUnitTypes={toWorkUnitTypeOptions(workUnitTypesQuery.data)}
      availableWorkflows={toWorkflowOptions(availableWorkflowsQuery.data)}
      workUnitFactsQueryScope={versionId}
      loadWorkUnitFacts={async (selectedWorkUnitTypeKey) => {
        const data = await queryClient.fetchQuery(workUnitFactsQueryOptions);

        return toWorkUnitFactOptions(data, selectedWorkUnitTypeKey);
      }}
      onSaveMetadata={async (metadata) => {
        await updateWorkflowMutation.mutateAsync({
          versionId,
          workUnitTypeKey: workUnitKey,
          workflowDefinitionId: resolvedWorkflowDefinitionId,
          payload: {
            workflowDefinitionId: metadata.workflowDefinitionId,
            key: metadata.key,
            ...(metadata.displayName.length > 0 ? { displayName: metadata.displayName } : {}),
            ...(metadata.descriptionMarkdown.length > 0
              ? { descriptionJson: { markdown: metadata.descriptionMarkdown } }
              : {}),
          },
        });

        await queryClient.invalidateQueries({ queryKey: editorQueryOptions.queryKey });
      }}
      onCreateFormStep={async (payload) => {
        await createFormStepMutation.mutateAsync({
          versionId,
          workUnitTypeKey: workUnitKey,
          workflowDefinitionId: resolvedWorkflowDefinitionId,
          afterStepKey: null,
          payload,
        });

        await queryClient.invalidateQueries({ queryKey: editorQueryOptions.queryKey });
      }}
      onUpdateFormStep={async (stepId, payload) => {
        await updateFormStepMutation.mutateAsync({
          versionId,
          workUnitTypeKey: workUnitKey,
          workflowDefinitionId: resolvedWorkflowDefinitionId,
          stepId,
          payload,
        });

        await queryClient.invalidateQueries({ queryKey: editorQueryOptions.queryKey });
      }}
      onDeleteFormStep={async (stepId) => {
        await deleteFormStepMutation.mutateAsync({
          versionId,
          workUnitTypeKey: workUnitKey,
          workflowDefinitionId: resolvedWorkflowDefinitionId,
          stepId,
        });

        await queryClient.invalidateQueries({ queryKey: editorQueryOptions.queryKey });
      }}
      onCreateContextFact={async (draft) => {
        try {
          await createContextFactMutation.mutateAsync({
            versionId,
            workUnitTypeKey: workUnitKey,
            workflowDefinitionId: resolvedWorkflowDefinitionId,
            fact: toContextFactMutationPayload(draft),
          });

          await queryClient.invalidateQueries({ queryKey: editorQueryOptions.queryKey });
        } catch (error) {
          toast.error(`Failed to create context fact: ${toErrorMessage(error)}`);
          throw error;
        }
      }}
      onUpdateContextFact={async (factKey, draft) => {
        try {
          await updateContextFactMutation.mutateAsync({
            versionId,
            workUnitTypeKey: workUnitKey,
            workflowDefinitionId: resolvedWorkflowDefinitionId,
            factKey,
            fact: toContextFactMutationPayload(draft),
          });

          await queryClient.invalidateQueries({ queryKey: editorQueryOptions.queryKey });
        } catch (error) {
          toast.error(`Failed to update context fact: ${toErrorMessage(error)}`);
          throw error;
        }
      }}
      onDeleteContextFact={async (factKey) => {
        await deleteContextFactMutation.mutateAsync({
          versionId,
          workUnitTypeKey: workUnitKey,
          workflowDefinitionId: resolvedWorkflowDefinitionId,
          factKey,
        });

        await queryClient.invalidateQueries({ queryKey: editorQueryOptions.queryKey });
      }}
      onCreateEdge={async (edge) => {
        await createEdgeMutation.mutateAsync({
          versionId,
          workUnitTypeKey: workUnitKey,
          workflowDefinitionId: resolvedWorkflowDefinitionId,
          fromStepKey: edge.fromStepKey,
          toStepKey: edge.toStepKey,
          ...(edge.descriptionMarkdown.length > 0
            ? { descriptionJson: { markdown: edge.descriptionMarkdown } }
            : {}),
        });

        await queryClient.invalidateQueries({ queryKey: editorQueryOptions.queryKey });
      }}
      onUpdateEdge={async (edgeId, descriptionMarkdown) => {
        await updateEdgeMutation.mutateAsync({
          versionId,
          workUnitTypeKey: workUnitKey,
          workflowDefinitionId: resolvedWorkflowDefinitionId,
          edgeId,
          ...(descriptionMarkdown.length > 0
            ? { descriptionJson: { markdown: descriptionMarkdown } }
            : {}),
        });

        await queryClient.invalidateQueries({ queryKey: editorQueryOptions.queryKey });
      }}
      onDeleteEdge={async (edgeId) => {
        await deleteEdgeMutation.mutateAsync({
          versionId,
          workUnitTypeKey: workUnitKey,
          workflowDefinitionId: resolvedWorkflowDefinitionId,
          edgeId,
        });

        await queryClient.invalidateQueries({ queryKey: editorQueryOptions.queryKey });
      }}
    />
  );
}
