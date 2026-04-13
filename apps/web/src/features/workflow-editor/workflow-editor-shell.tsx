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

import {
  BranchStepDialog,
  EdgeDialog,
  FormStepDialog,
  InvokeStepDialog,
  getPickerBadgeClassName,
  WorkflowContextFactDialog,
  WorkflowMetadataDialog,
} from "./dialogs";
import { AgentStepDialog } from "./agent-step-dialog";
import { StepListInspector } from "./step-list-inspector";
import { StepTypesGrid } from "./step-types-grid";
import type {
  WorkflowBranchStepMutationHandlers,
  WorkflowBranchStepPayload,
  WorkflowConditionOperator,
  WorkflowAgentStepMutationHandlers,
  WorkflowAgentStepPayload,
  WorkflowContextFactDefinitionItem,
  WorkflowContextFactDraft,
  WorkflowContextFactMutationHandlers,
  WorkflowEditorEdge,
  WorkflowEditorMetadata,
  WorkflowEditorPickerBadge,
  WorkflowEditorPickerOption,
  WorkflowEditorSelection,
  WorkflowEditorStep,
  WorkflowFormStepMutationHandlers,
  WorkflowInvokeArtifactSlotDefinition,
  WorkflowInvokeStepMutationHandlers,
  WorkflowInvokeStepPayload,
  WorkflowInvokeWorkUnitFactDefinition,
} from "./types";
import { STEP_TYPE_LABELS } from "./types";
import { WorkflowCanvas } from "./workflow-canvas";

type WorkflowEditorShellProps = {
  metadata: WorkflowEditorMetadata;
  initialSteps: readonly WorkflowEditorStep[];
  initialEdges: readonly WorkflowEditorEdge[];
  contextFactDefinitions: readonly WorkflowContextFactDefinitionItem[];
  methodologyFacts: readonly WorkflowEditorPickerOption[];
  currentWorkUnitFacts: readonly WorkflowEditorPickerOption[];
  artifactSlots: readonly WorkflowEditorPickerOption[];
  workUnitTypes: readonly WorkflowEditorPickerOption[];
  availableWorkflows: readonly WorkflowEditorPickerOption[];
  availableTransitions: readonly WorkflowEditorPickerOption[];
  conditionOperators: readonly WorkflowConditionOperator[];
  workUnitFactsQueryScope: string;
  loadWorkUnitFacts: (workUnitTypeKey: string) => Promise<readonly WorkflowEditorPickerOption[]>;
  loadWorkUnitArtifactSlots: (
    workUnitTypeKey: string,
  ) => Promise<readonly WorkflowEditorPickerOption[]>;
  loadInvokeWorkUnitFacts: (
    workUnitTypeKey: string,
  ) => Promise<readonly WorkflowInvokeWorkUnitFactDefinition[]>;
  loadInvokeWorkUnitArtifactSlots: (
    workUnitTypeKey: string,
  ) => Promise<readonly WorkflowInvokeArtifactSlotDefinition[]>;
  loadInvokeWorkUnitTransitions?: (
    workUnitTypeKey: string,
  ) => Promise<readonly WorkflowEditorPickerOption[]>;
  loadInvokeWorkUnitWorkflows?: (
    workUnitTypeKey: string,
  ) => Promise<readonly WorkflowEditorPickerOption[]>;
  loadInvokeTransitionBoundWorkflowKeys?: (
    workUnitTypeKey: string,
    transitionId: string,
  ) => Promise<readonly string[]>;
  onSaveMetadata: (metadata: WorkflowEditorMetadata) => Promise<void>;
  onCreateEdge?: (edge: WorkflowEditorEdge) => Promise<void>;
  onUpdateEdge?: (edgeId: string, descriptionMarkdown: string) => Promise<void>;
  onDeleteEdge?: (edgeId: string) => Promise<void>;
} & WorkflowFormStepMutationHandlers &
  WorkflowAgentStepMutationHandlers &
  WorkflowBranchStepMutationHandlers &
  WorkflowInvokeStepMutationHandlers &
  WorkflowContextFactMutationHandlers;

function createLocalId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function updateEdgeStepKeys(
  edges: readonly WorkflowEditorEdge[],
  previousStepKey: string,
  nextStepKey: string,
) {
  if (previousStepKey === nextStepKey) {
    return [...edges];
  }

  return edges.map((edge) => ({
    ...edge,
    fromStepKey: edge.fromStepKey === previousStepKey ? nextStepKey : edge.fromStepKey,
    toStepKey: edge.toStepKey === previousStepKey ? nextStepKey : edge.toStepKey,
  }));
}

function updateInvokeStepContextFactReferences(
  payload: WorkflowInvokeStepPayload,
  previousContextFactDefinitionId: string,
  nextContextFactDefinitionId: string,
): WorkflowInvokeStepPayload {
  const nextBindings =
    payload.targetKind === "work_unit"
      ? payload.bindings.map((binding) =>
          binding.source.kind === "context_fact" &&
          binding.source.contextFactDefinitionId === previousContextFactDefinitionId
            ? {
                ...binding,
                source: {
                  kind: "context_fact" as const,
                  contextFactDefinitionId: nextContextFactDefinitionId,
                },
              }
            : binding,
        )
      : undefined;

  if (
    payload.sourceMode === "context_fact_backed" &&
    payload.contextFactDefinitionId === previousContextFactDefinitionId
  ) {
    return payload.targetKind === "work_unit"
      ? {
          ...payload,
          contextFactDefinitionId: nextContextFactDefinitionId,
          bindings: nextBindings ?? payload.bindings,
        }
      : { ...payload, contextFactDefinitionId: nextContextFactDefinitionId };
  }

  return payload.targetKind === "work_unit" && nextBindings
    ? { ...payload, bindings: nextBindings }
    : payload;
}

function updateBranchStepContextFactReferences(
  payload: WorkflowBranchStepPayload,
  previousContextFactDefinitionId: string,
  nextContextFactDefinitionId: string,
): WorkflowBranchStepPayload {
  return {
    ...payload,
    routes: payload.routes.map((route) => ({
      ...route,
      groups: route.groups.map((group) => ({
        ...group,
        conditions: group.conditions.map((condition) =>
          condition.contextFactDefinitionId === previousContextFactDefinitionId
            ? { ...condition, contextFactDefinitionId: nextContextFactDefinitionId }
            : condition,
        ),
      })),
    })),
  };
}

function buildBranchProjectedEdges(params: {
  stepId: string;
  stepKey: string;
  payload: WorkflowBranchStepPayload;
  steps: readonly WorkflowEditorStep[];
}): WorkflowEditorEdge[] {
  const stepById = new Map(params.steps.map((step) => [step.stepId, step]));
  const edges: WorkflowEditorEdge[] = [];

  if (params.payload.defaultTargetStepId) {
    const targetStep = stepById.get(params.payload.defaultTargetStepId);
    if (targetStep) {
      edges.push({
        edgeId: `${params.stepId}:branch-default`,
        fromStepKey: params.stepKey,
        toStepKey: targetStep.payload.key,
        descriptionMarkdown: "",
        edgeOwner: "branch_default",
        branchStepId: params.stepId,
      });
    }
  }

  params.payload.routes.forEach((route) => {
    const targetStep = stepById.get(route.targetStepId);
    if (!targetStep) {
      return;
    }

    edges.push({
      edgeId: `${params.stepId}:branch:${route.routeId}`,
      fromStepKey: params.stepKey,
      toStepKey: targetStep.payload.key,
      descriptionMarkdown: "",
      edgeOwner: "branch_conditional",
      branchStepId: params.stepId,
      routeId: route.routeId,
    });
  });

  return edges;
}

function replaceBranchProjectedEdges(params: {
  edges: readonly WorkflowEditorEdge[];
  stepId: string;
  stepKey: string;
  payload: WorkflowBranchStepPayload;
  steps: readonly WorkflowEditorStep[];
}) {
  const survivingEdges = params.edges.filter((edge) => edge.branchStepId !== params.stepId);
  return [...survivingEdges, ...buildBranchProjectedEdges(params)];
}

function stepReferencesContextFact(
  step: WorkflowEditorStep,
  contextFactDefinitionId: string,
): boolean {
  switch (step.stepType) {
    case "form":
      return step.payload.fields.some(
        (field) => field.contextFactDefinitionId === contextFactDefinitionId,
      );
    case "agent":
      return (
        step.payload.explicitReadGrants.some(
          (grant) => grant.contextFactDefinitionId === contextFactDefinitionId,
        ) ||
        step.payload.writeItems.some(
          (writeItem) =>
            writeItem.contextFactDefinitionId === contextFactDefinitionId ||
            writeItem.requirementContextFactDefinitionIds.includes(contextFactDefinitionId),
        ) ||
        step.payload.completionRequirements.some(
          (requirement) => requirement.contextFactDefinitionId === contextFactDefinitionId,
        )
      );
    case "invoke":
      return (
        (step.payload.sourceMode === "context_fact_backed" &&
          step.payload.contextFactDefinitionId === contextFactDefinitionId) ||
        (step.payload.targetKind === "work_unit" &&
          step.payload.bindings.some(
            (binding) => binding.contextFactDefinitionId === contextFactDefinitionId,
          ))
      );
    case "branch":
      return step.payload.routes.some((route) =>
        route.groups.some((group) =>
          group.conditions.some(
            (condition) => condition.contextFactDefinitionId === contextFactDefinitionId,
          ),
        ),
      );
    default:
      return false;
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

function getValueTypeBadge(
  valueType: WorkflowContextFactDraft["valueType"] | "work unit" | null | undefined,
): WorkflowEditorPickerBadge {
  switch (valueType) {
    case "number":
      return { label: "number", tone: "type-number" };
    case "boolean":
      return { label: "boolean", tone: "type-boolean" };
    case "json":
      return { label: "json", tone: "type-json" };
    case "work unit":
      return { label: "work unit", tone: "type-work-unit" };
    case "string":
    default:
      return { label: "string", tone: "type-string" };
  }
}

function getPickerOptionTypeBadge(
  option: WorkflowEditorPickerOption | undefined,
): WorkflowEditorPickerBadge | undefined {
  return option?.badges?.find(
    (badge) =>
      badge.tone === "type-string" ||
      badge.tone === "type-number" ||
      badge.tone === "type-boolean" ||
      badge.tone === "type-json" ||
      badge.tone === "type-work-unit",
  );
}

function toCountLabel(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function getContextFactBadges(
  fact: WorkflowContextFactDefinitionItem,
  externalFactsById: ReadonlyMap<string, WorkflowEditorPickerOption>,
  artifactSlotsById: ReadonlyMap<string, WorkflowEditorPickerOption>,
  workUnitTypesById: ReadonlyMap<string, WorkflowEditorPickerOption>,
): WorkflowEditorPickerBadge[] {
  const badges: WorkflowEditorPickerBadge[] = [{ label: fact.cardinality, tone: "cardinality" }];

  switch (fact.kind) {
    case "plain_value_fact":
      badges.push(getValueTypeBadge(fact.valueType));
      return badges;
    case "definition_backed_external_fact": {
      const externalFact = fact.externalFactDefinitionId
        ? externalFactsById.get(fact.externalFactDefinitionId)
        : undefined;
      const externalType = getPickerOptionTypeBadge(externalFact);

      badges.push({ label: "external", tone: "external-fact" });
      if (externalType) {
        badges.push(externalType);
      }
      return badges;
    }
    case "bound_external_fact": {
      const externalFact = fact.externalFactDefinitionId
        ? externalFactsById.get(fact.externalFactDefinitionId)
        : undefined;
      const externalType = getPickerOptionTypeBadge(externalFact);

      badges.push({ label: "bound", tone: "bound-fact" });
      if (externalType) {
        badges.push(externalType);
      }
      return badges;
    }
    case "workflow_reference_fact": {
      const allowedWorkflowCount = new Set(
        fact.allowedWorkflowDefinitionIds
          .map((workflowDefinitionId) => workflowDefinitionId.trim())
          .filter((workflowDefinitionId) => workflowDefinitionId.length > 0),
      ).size;

      badges.push({ label: "workflow", tone: "workflow-reference" });
      badges.push({
        label: toCountLabel(allowedWorkflowCount, "workflow"),
        tone: "workflow-reference",
      });
      return badges;
    }
    case "artifact_reference_fact": {
      const artifactSlotKey = fact.artifactSlotDefinitionId?.trim() ?? "";
      const artifactSlot = artifactSlotKey ? artifactSlotsById.get(artifactSlotKey) : undefined;

      badges.push({ label: "artifact", tone: "artifact-reference" });
      if (artifactSlotKey.length > 0) {
        badges.push({
          label: artifactSlot?.label ?? artifactSlotKey,
          tone: "artifact-reference",
        });
      }
      return badges;
    }
    case "work_unit_draft_spec_fact":
      badges.push({ label: "work unit", tone: "type-work-unit" });
      if (fact.workUnitTypeKey?.trim()) {
        const workUnitIdentifier = fact.workUnitTypeKey.trim();
        const workUnit = workUnitTypesById.get(workUnitIdentifier);
        badges.push({
          label: workUnit?.label ?? workUnitIdentifier,
          tone: "work-unit-definition",
        });
      }
      return badges;
  }
}

function toContextFactDefinitionItem(
  draft: WorkflowContextFactDraft,
  previous?: WorkflowContextFactDefinitionItem,
): WorkflowContextFactDefinitionItem {
  const trimmedKey = draft.key.trim();
  const nextId = previous
    ? previous.contextFactDefinitionId === previous.key
      ? trimmedKey
      : previous.contextFactDefinitionId
    : trimmedKey;

  return {
    contextFactDefinitionId: nextId,
    key: trimmedKey,
    label: draft.label.trim(),
    descriptionMarkdown: draft.descriptionMarkdown.trim(),
    kind: draft.kind,
    cardinality: draft.cardinality,
    guidance: {
      humanMarkdown: draft.guidance.humanMarkdown.trim(),
      agentMarkdown: draft.guidance.agentMarkdown.trim(),
    },
    ...(draft.valueType ? { valueType: draft.valueType } : {}),
    ...(draft.externalFactDefinitionId?.trim()
      ? { externalFactDefinitionId: draft.externalFactDefinitionId.trim() }
      : {}),
    allowedWorkflowDefinitionIds: draft.allowedWorkflowDefinitionIds,
    ...(draft.artifactSlotDefinitionId?.trim()
      ? { artifactSlotDefinitionId: draft.artifactSlotDefinitionId.trim() }
      : {}),
    ...(draft.workUnitDefinitionId?.trim()
      ? { workUnitDefinitionId: draft.workUnitDefinitionId.trim() }
      : {}),
    selectedWorkUnitFactDefinitionIds:
      draft.selectedWorkUnitFactDefinitionIds.length > 0
        ? draft.selectedWorkUnitFactDefinitionIds
        : draft.includedFactDefinitionIds,
    selectedArtifactSlotDefinitionIds: draft.selectedArtifactSlotDefinitionIds,
    ...(draft.workUnitTypeKey?.trim() ? { workUnitTypeKey: draft.workUnitTypeKey.trim() } : {}),
    includedFactDefinitionIds: draft.includedFactDefinitionIds,
    ...(typeof draft.validationJson === "undefined"
      ? {}
      : {
          validationJson: draft.validationJson,
        }),
    summary: summarizeContextFact(draft),
  };
}

export function WorkflowEditorShell({
  metadata,
  initialSteps,
  initialEdges,
  contextFactDefinitions,
  methodologyFacts,
  currentWorkUnitFacts,
  artifactSlots,
  workUnitTypes,
  availableWorkflows,
  availableTransitions,
  conditionOperators,
  workUnitFactsQueryScope,
  loadWorkUnitFacts,
  loadWorkUnitArtifactSlots,
  loadInvokeWorkUnitFacts,
  loadInvokeWorkUnitArtifactSlots,
  loadInvokeWorkUnitTransitions,
  loadInvokeWorkUnitWorkflows,
  loadInvokeTransitionBoundWorkflowKeys,
  onSaveMetadata,
  onCreateFormStep,
  onUpdateFormStep,
  onDeleteFormStep,
  onCreateAgentStep,
  onUpdateAgentStep,
  onDeleteAgentStep,
  onCreateInvokeStep,
  onUpdateInvokeStep,
  onDeleteInvokeStep,
  onCreateBranchStep,
  onUpdateBranchStep,
  onDeleteBranchStep,
  discoverHarnessMetadata,
  onCreateContextFact,
  onUpdateContextFact,
  onDeleteContextFact,
  onCreateEdge,
  onUpdateEdge,
  onDeleteEdge,
}: WorkflowEditorShellProps) {
  const [steps, setSteps] = useState<WorkflowEditorStep[]>([...initialSteps]);
  const [edges, setEdges] = useState<WorkflowEditorEdge[]>([...initialEdges]);
  const [localContextFacts, setLocalContextFacts] = useState<WorkflowContextFactDefinitionItem[]>([
    ...contextFactDefinitions,
  ]);
  const [selection, setSelection] = useState<WorkflowEditorSelection>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [isFormDialogOpen, setFormDialogOpen] = useState(false);
  const [formDialogMode, setFormDialogMode] = useState<"create" | "edit">("create");
  const [isAgentDialogOpen, setAgentDialogOpen] = useState(false);
  const [agentDialogMode, setAgentDialogMode] = useState<"create" | "edit">("create");
  const [isInvokeDialogOpen, setInvokeDialogOpen] = useState(false);
  const [invokeDialogMode, setInvokeDialogMode] = useState<"create" | "edit">("create");
  const [isBranchDialogOpen, setBranchDialogOpen] = useState(false);
  const [branchDialogMode, setBranchDialogMode] = useState<"create" | "edit">("create");
  const [isContextFactDialogOpen, setContextFactDialogOpen] = useState(false);
  const [contextFactDialogMode, setContextFactDialogMode] = useState<"create" | "edit">("create");
  const [editingContextFactId, setEditingContextFactId] = useState<string | null>(null);
  const [deletingContextFactId, setDeletingContextFactId] = useState<string | null>(null);

  const [isEdgeDialogOpen, setEdgeDialogOpen] = useState(false);
  const [isMetadataDialogOpen, setMetadataDialogOpen] = useState(false);

  useEffect(() => {
    setSteps([...initialSteps]);
  }, [initialSteps]);

  useEffect(() => {
    setEdges([...initialEdges]);
  }, [initialEdges]);

  useEffect(() => {
    setLocalContextFacts([...contextFactDefinitions]);
  }, [contextFactDefinitions]);

  const selectedStep = useMemo(
    () =>
      selection?.kind === "step"
        ? steps.find((step) => step.stepId === selection.stepId)
        : undefined,
    [selection, steps],
  );
  const selectedEdge = useMemo(
    () =>
      selection?.kind === "edge"
        ? edges.find((edge) => edge.edgeId === selection.edgeId)
        : undefined,
    [edges, selection],
  );
  const editingContextFact = useMemo(
    () =>
      editingContextFactId
        ? localContextFacts.find((fact) => fact.contextFactDefinitionId === editingContextFactId)
        : undefined,
    [editingContextFactId, localContextFacts],
  );
  const deletingContextFact = useMemo(
    () =>
      deletingContextFactId
        ? localContextFacts.find((fact) => fact.contextFactDefinitionId === deletingContextFactId)
        : undefined,
    [deletingContextFactId, localContextFacts],
  );
  const externalFactsById = useMemo(() => {
    const optionsByValue = new Map<string, WorkflowEditorPickerOption>();

    methodologyFacts.forEach((option) => {
      optionsByValue.set(option.value, option);
      if (typeof option.secondaryLabel === "string" && option.secondaryLabel.length > 0) {
        optionsByValue.set(option.secondaryLabel, option);
      }
    });

    currentWorkUnitFacts.forEach((option) => {
      optionsByValue.set(option.value, option);
      if (typeof option.secondaryLabel === "string" && option.secondaryLabel.length > 0) {
        optionsByValue.set(option.secondaryLabel, option);
      }
    });

    return optionsByValue;
  }, [currentWorkUnitFacts, methodologyFacts]);
  const artifactSlotsById = useMemo(
    () => new Map(artifactSlots.map((option) => [option.value, option])),
    [artifactSlots],
  );
  const workUnitTypesById = useMemo(() => {
    const optionsByValue = new Map<string, WorkflowEditorPickerOption>();

    workUnitTypes.forEach((option) => {
      optionsByValue.set(option.value, option);
      if (typeof option.secondaryLabel === "string" && option.secondaryLabel.length > 0) {
        optionsByValue.set(option.secondaryLabel, option);
      }
    });

    return optionsByValue;
  }, [workUnitTypes]);
  const stepOptions = useMemo<WorkflowEditorPickerOption[]>(
    () =>
      steps.map((step) => ({
        value: step.stepId,
        label: step.payload.label?.trim() || step.payload.key,
        secondaryLabel: step.payload.key,
        description: STEP_TYPE_LABELS[step.stepType],
      })),
    [steps],
  );

  const openCreateFormDialog = () => {
    setStatusMessage(null);
    setFormDialogMode("create");
    setFormDialogOpen(true);
  };

  const openCreateAgentDialog = () => {
    setStatusMessage(null);
    setAgentDialogMode("create");
    setAgentDialogOpen(true);
  };

  const openCreateInvokeDialog = () => {
    setStatusMessage(null);
    setInvokeDialogMode("create");
    setInvokeDialogOpen(true);
  };

  const openCreateBranchDialog = () => {
    setStatusMessage(null);
    setBranchDialogMode("create");
    setBranchDialogOpen(true);
  };

  const openEditFormDialog = () => {
    if (!selectedStep) {
      return;
    }
    setStatusMessage(null);
    setFormDialogMode("edit");
    setFormDialogOpen(true);
  };

  const openEditAgentDialog = () => {
    if (!selectedStep) {
      return;
    }
    setStatusMessage(null);
    setAgentDialogMode("edit");
    setAgentDialogOpen(true);
  };

  const openEditInvokeDialog = () => {
    if (!selectedStep) {
      return;
    }
    setStatusMessage(null);
    setInvokeDialogMode("edit");
    setInvokeDialogOpen(true);
  };

  const openEditBranchDialog = () => {
    if (!selectedStep) {
      return;
    }
    setStatusMessage(null);
    setBranchDialogMode("edit");
    setBranchDialogOpen(true);
  };

  const openSelectedStepDialog = () => {
    if (!selectedStep) {
      return;
    }

    if (selectedStep.stepType === "agent") {
      openEditAgentDialog();
      return;
    }

    if (selectedStep.stepType === "invoke") {
      openEditInvokeDialog();
      return;
    }

    if (selectedStep.stepType === "branch") {
      openEditBranchDialog();
      return;
    }

    openEditFormDialog();
  };

  const openCreateContextFactDialog = () => {
    setStatusMessage(null);
    setEditingContextFactId(null);
    setContextFactDialogMode("create");
    setContextFactDialogOpen(true);
  };

  const openEditContextFactDialog = (contextFactDefinitionId: string) => {
    setStatusMessage(null);
    setEditingContextFactId(contextFactDefinitionId);
    setContextFactDialogMode("edit");
    setContextFactDialogOpen(true);
  };

  const tryCreateEdge = ({
    sourceStepKey,
    targetStepKey,
  }: {
    sourceStepKey: string;
    targetStepKey: string;
  }) => {
    if (sourceStepKey === targetStepKey) {
      setStatusMessage("A step cannot connect to itself.");
      return;
    }

    const sourceStep = steps.find((step) => step.payload.key === sourceStepKey);
    if (sourceStep?.stepType === "branch") {
      setStatusMessage(
        "Branch topology is authored in the Branch dialog, not through generic edge creation.",
      );
      return;
    }

    if (edges.some((edge) => edge.fromStepKey === sourceStepKey)) {
      setStatusMessage("Slice-1 allows only one outgoing edge per step.");
      return;
    }

    setStatusMessage(null);

    const nextEdge: WorkflowEditorEdge = {
      edgeId: createLocalId("edge"),
      fromStepKey: sourceStepKey,
      toStepKey: targetStepKey,
      descriptionMarkdown: "",
    };

    setEdges((previous) => [...previous, nextEdge]);
    setSelection({ kind: "edge", edgeId: nextEdge.edgeId });
    void onCreateEdge?.(nextEdge);
  };

  return (
    <main className="space-y-3">
      <header className="chiron-frame-flat chiron-tone-navigation flex flex-wrap items-center justify-between gap-3 p-3 md:p-4">
        <div className="grid gap-1">
          <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
            Workflow Editor
          </p>
          <h1 className="font-geist-pixel-square text-lg font-semibold uppercase tracking-[0.12em] md:text-xl">
            {metadata.displayName || metadata.key}
          </h1>
        </div>
        <Button type="button" variant="outline" onClick={() => setMetadataDialogOpen(true)}>
          Edit workflow metadata
        </Button>
      </header>

      {statusMessage ? (
        <p
          role="alert"
          className="chiron-frame-flat border-destructive/45 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          {statusMessage}
        </p>
      ) : null}

      <div className="grid gap-3 xl:grid-cols-[23rem_minmax(0,1fr)]">
        <aside className="chiron-frame-flat chiron-tone-canvas grid auto-rows-max gap-2 p-2">
          <StepTypesGrid
            onCreateFormStep={openCreateFormDialog}
            onCreateAgentStep={openCreateAgentDialog}
            onCreateInvokeStep={openCreateInvokeDialog}
            onCreateBranchStep={openCreateBranchDialog}
          />

          <StepListInspector
            metadata={metadata}
            steps={steps}
            edges={edges}
            selection={selection}
            onSelectStep={(stepId) => {
              setStatusMessage(null);
              setSelection({ kind: "step", stepId });
            }}
            onSelectEdge={(edgeId) => {
              const edge = edges.find((entry) => entry.edgeId === edgeId);
              setStatusMessage(null);
              if (edge?.branchStepId) {
                setSelection({ kind: "step", stepId: edge.branchStepId });
                return;
              }
              setSelection({ kind: "edge", edgeId });
            }}
            onFocusBranchStep={(branchStepId) => {
              setStatusMessage(null);
              setSelection({ kind: "step", stepId: branchStepId });
            }}
            onClearSelection={() => {
              setStatusMessage(null);
              setSelection(null);
            }}
            onEditSelectedStep={openSelectedStepDialog}
            onEditSelectedEdge={() => setEdgeDialogOpen(true)}
            onConnectSteps={(sourceStepKey, targetStepKey) =>
              tryCreateEdge({ sourceStepKey, targetStepKey })
            }
          />

          <section className="chiron-frame-flat chiron-tone-context grid gap-2 p-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                Context Fact Definitions
              </p>
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={openCreateContextFactDialog}
              >
                + Fact
              </Button>
            </div>

            {localContextFacts.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No context fact definitions configured yet.
              </p>
            ) : (
              <ul className="grid max-h-[22rem] gap-2 overflow-y-auto pr-1 scrollbar-thin">
                {localContextFacts.map((fact) => (
                  <li
                    key={fact.contextFactDefinitionId}
                    className="chiron-cut-frame-thick grid gap-2 p-3"
                  >
                    <div className="grid gap-3">
                      <div className="grid gap-0.5">
                        <p className="font-geist-pixel-square text-sm uppercase tracking-[0.12em]">
                          {fact.label || fact.key}
                        </p>
                        <p className="text-[0.64rem] uppercase tracking-[0.14em] text-muted-foreground">
                          {fact.key}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {getContextFactBadges(
                          fact,
                          externalFactsById,
                          artifactSlotsById,
                          workUnitTypesById,
                        ).map((badge, index) => (
                          <span
                            key={`${fact.contextFactDefinitionId}-${badge.tone}-${badge.label}-${index}`}
                            className={getPickerBadgeClassName(badge)}
                          >
                            {badge.label}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        className="rounded-none"
                        onClick={() => openEditContextFactDialog(fact.contextFactDefinitionId)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="xs"
                        variant="destructive"
                        className="rounded-none"
                        onClick={() => setDeletingContextFactId(fact.contextFactDefinitionId)}
                      >
                        Delete
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>

        <WorkflowCanvas
          entryStepId={metadata.entryStepId}
          steps={steps}
          edges={edges}
          selection={selection}
          errorMessage={statusMessage}
          onSelectStep={(stepId) => {
            setSelection({ kind: "step", stepId });
            setStatusMessage(null);
          }}
          onSelectEdge={(edgeId) => {
            const edge = edges.find((entry) => entry.edgeId === edgeId);
            if (edge?.branchStepId) {
              setSelection({ kind: "step", stepId: edge.branchStepId });
              setStatusMessage(null);
              return;
            }
            setSelection({ kind: "edge", edgeId });
            setStatusMessage(null);
          }}
          onFocusBranchStep={(branchStepId) => {
            setSelection({ kind: "step", stepId: branchStepId });
            setStatusMessage(null);
          }}
          onConnect={tryCreateEdge}
        />
      </div>

      <FormStepDialog
        open={isFormDialogOpen}
        mode={formDialogMode}
        step={
          formDialogMode === "edit" && selectedStep?.stepType === "form" ? selectedStep : undefined
        }
        contextFactDefinitions={localContextFacts}
        onOpenChange={setFormDialogOpen}
        onSave={async (payload) => {
          setStatusMessage(null);
          if (formDialogMode === "edit" && selectedStep?.stepType === "form") {
            const previousStepKey = selectedStep.payload.key;
            setSteps((previous) =>
              previous.map((entry) =>
                entry.stepId === selectedStep.stepId
                  ? {
                      ...entry,
                      payload,
                    }
                  : entry,
              ),
            );
            if (previousStepKey !== payload.key) {
              setEdges((previous) => updateEdgeStepKeys(previous, previousStepKey, payload.key));
            }
            await onUpdateFormStep?.(selectedStep.stepId, payload);
          } else {
            const nextStep: WorkflowEditorStep = {
              stepId: createLocalId("step"),
              stepType: "form",
              payload,
            };
            setSteps((previous) => [...previous, nextStep]);
            setSelection({ kind: "step", stepId: nextStep.stepId });
            await onCreateFormStep?.(payload);
          }
          setFormDialogOpen(false);
        }}
        onDelete={
          formDialogMode === "edit" && selectedStep?.stepType === "form"
            ? async () => {
                setSteps((previous) =>
                  previous.filter((entry) => entry.stepId !== selectedStep.stepId),
                );
                setEdges((previous) =>
                  previous.filter(
                    (edge) =>
                      edge.fromStepKey !== selectedStep.payload.key &&
                      edge.toStepKey !== selectedStep.payload.key,
                  ),
                );
                setSelection(null);
                setFormDialogOpen(false);
                await onDeleteFormStep?.(selectedStep.stepId);
              }
            : undefined
        }
      />

      <AgentStepDialog
        open={isAgentDialogOpen}
        mode={agentDialogMode}
        step={
          agentDialogMode === "edit" && selectedStep?.stepType === "agent"
            ? selectedStep
            : undefined
        }
        contextFactDefinitions={localContextFacts}
        discoverHarnessMetadata={discoverHarnessMetadata}
        onOpenChange={setAgentDialogOpen}
        onSave={async (payload) => {
          setStatusMessage(null);
          if (agentDialogMode === "edit" && selectedStep?.stepType === "agent") {
            const previousStepKey = selectedStep.payload.key;
            setSteps((previous) =>
              previous.map((entry) =>
                entry.stepId === selectedStep.stepId
                  ? {
                      ...entry,
                      payload,
                    }
                  : entry,
              ),
            );
            if (previousStepKey !== payload.key) {
              setEdges((previous) =>
                previous.map((edge) => ({
                  ...edge,
                  fromStepKey:
                    edge.fromStepKey === previousStepKey ? payload.key : edge.fromStepKey,
                  toStepKey: edge.toStepKey === previousStepKey ? payload.key : edge.toStepKey,
                })),
              );
            }
            await onUpdateAgentStep?.(selectedStep.stepId, payload as WorkflowAgentStepPayload);
          } else {
            const nextStep: WorkflowEditorStep = {
              stepId: createLocalId("step"),
              stepType: "agent",
              payload,
            };
            setSteps((previous) => [...previous, nextStep]);
            setSelection({ kind: "step", stepId: nextStep.stepId });
            await onCreateAgentStep?.(payload as WorkflowAgentStepPayload);
          }
          setAgentDialogOpen(false);
        }}
        onDelete={
          agentDialogMode === "edit" && selectedStep?.stepType === "agent"
            ? async () => {
                setSteps((previous) =>
                  previous.filter((entry) => entry.stepId !== selectedStep.stepId),
                );
                setEdges((previous) =>
                  previous.filter(
                    (edge) =>
                      edge.fromStepKey !== selectedStep.payload.key &&
                      edge.toStepKey !== selectedStep.payload.key,
                  ),
                );
                setSelection(null);
                setAgentDialogOpen(false);
                await onDeleteAgentStep?.(selectedStep.stepId);
              }
            : undefined
        }
      />

      <InvokeStepDialog
        open={isInvokeDialogOpen}
        mode={invokeDialogMode}
        step={
          invokeDialogMode === "edit" && selectedStep?.stepType === "invoke"
            ? selectedStep
            : undefined
        }
        availableWorkflows={availableWorkflows}
        availableWorkUnits={workUnitTypes}
        availableTransitions={availableTransitions}
        availableContextFacts={localContextFacts}
        workUnitFactsQueryScope={workUnitFactsQueryScope}
        loadWorkUnitFacts={loadInvokeWorkUnitFacts}
        loadWorkUnitArtifactSlots={loadInvokeWorkUnitArtifactSlots}
        loadWorkUnitTransitions={loadInvokeWorkUnitTransitions}
        loadWorkUnitWorkflows={loadInvokeWorkUnitWorkflows}
        loadTransitionBoundWorkflowKeys={loadInvokeTransitionBoundWorkflowKeys}
        onOpenChange={setInvokeDialogOpen}
        onSave={async (payload) => {
          setStatusMessage(null);
          if (invokeDialogMode === "edit" && selectedStep?.stepType === "invoke") {
            const previousStepKey = selectedStep.payload.key;
            setSteps((previous) =>
              previous.map((entry) =>
                entry.stepId === selectedStep.stepId
                  ? {
                      ...entry,
                      payload,
                    }
                  : entry,
              ),
            );
            if (previousStepKey !== payload.key) {
              setEdges((previous) => updateEdgeStepKeys(previous, previousStepKey, payload.key));
            }
            await onUpdateInvokeStep?.(selectedStep.stepId, payload);
          } else {
            const nextStep: WorkflowEditorStep = {
              stepId: createLocalId("step"),
              stepType: "invoke",
              payload,
            };
            setSteps((previous) => [...previous, nextStep]);
            setSelection({ kind: "step", stepId: nextStep.stepId });
            await onCreateInvokeStep?.(payload);
          }
          setInvokeDialogOpen(false);
        }}
        onDelete={
          invokeDialogMode === "edit" && selectedStep?.stepType === "invoke"
            ? async () => {
                setSteps((previous) =>
                  previous.filter((entry) => entry.stepId !== selectedStep.stepId),
                );
                setEdges((previous) =>
                  previous.filter(
                    (edge) =>
                      edge.fromStepKey !== selectedStep.payload.key &&
                      edge.toStepKey !== selectedStep.payload.key,
                  ),
                );
                setSelection(null);
                setInvokeDialogOpen(false);
                await onDeleteInvokeStep?.(selectedStep.stepId);
              }
            : undefined
        }
      />

      <BranchStepDialog
        open={isBranchDialogOpen}
        mode={branchDialogMode}
        step={
          branchDialogMode === "edit" && selectedStep?.stepType === "branch"
            ? selectedStep
            : undefined
        }
        availableSteps={stepOptions}
        availableContextFacts={localContextFacts}
        conditionOperators={conditionOperators}
        onOpenChange={setBranchDialogOpen}
        onSave={async (payload) => {
          setStatusMessage(null);
          if (branchDialogMode === "edit" && selectedStep?.stepType === "branch") {
            const previousStepKey = selectedStep.payload.key;
            const nextSteps = steps.map((entry) =>
              entry.stepId === selectedStep.stepId
                ? {
                    ...entry,
                    payload,
                  }
                : entry,
            );

            setSteps(nextSteps);
            const nextEdges = replaceBranchProjectedEdges({
              edges:
                previousStepKey !== payload.key
                  ? updateEdgeStepKeys(edges, previousStepKey, payload.key)
                  : edges,
              stepId: selectedStep.stepId,
              stepKey: payload.key,
              payload,
              steps: nextSteps,
            });
            setEdges(nextEdges);
            await onUpdateBranchStep?.(selectedStep.stepId, payload);
          } else {
            const nextStep: WorkflowEditorStep = {
              stepId: createLocalId("step"),
              stepType: "branch",
              payload,
            };
            const nextSteps = [...steps, nextStep];
            setSteps(nextSteps);
            setEdges((previous) => [
              ...previous,
              ...buildBranchProjectedEdges({
                stepId: nextStep.stepId,
                stepKey: payload.key,
                payload,
                steps: nextSteps,
              }),
            ]);
            setSelection({ kind: "step", stepId: nextStep.stepId });
            await onCreateBranchStep?.(payload);
          }
          setBranchDialogOpen(false);
        }}
        onDelete={
          branchDialogMode === "edit" && selectedStep?.stepType === "branch"
            ? async () => {
                setSteps((previous) =>
                  previous.filter((entry) => entry.stepId !== selectedStep.stepId),
                );
                setEdges((previous) =>
                  previous.filter(
                    (edge) =>
                      edge.branchStepId !== selectedStep.stepId &&
                      edge.fromStepKey !== selectedStep.payload.key &&
                      edge.toStepKey !== selectedStep.payload.key,
                  ),
                );
                setSelection(null);
                setBranchDialogOpen(false);
                await onDeleteBranchStep?.(selectedStep.stepId);
              }
            : undefined
        }
      />

      <WorkflowContextFactDialog
        open={isContextFactDialogOpen}
        mode={contextFactDialogMode}
        fact={contextFactDialogMode === "edit" ? editingContextFact : undefined}
        methodologyFacts={methodologyFacts}
        currentWorkUnitFacts={currentWorkUnitFacts}
        artifactSlots={artifactSlots}
        workUnitTypes={workUnitTypes}
        availableWorkflows={availableWorkflows}
        workUnitFactsQueryScope={workUnitFactsQueryScope}
        loadWorkUnitFacts={loadWorkUnitFacts}
        loadWorkUnitArtifactSlots={loadWorkUnitArtifactSlots}
        onOpenChange={setContextFactDialogOpen}
        onSave={async (draft) => {
          setStatusMessage(null);
          if (contextFactDialogMode === "edit" && editingContextFact) {
            const nextFact = toContextFactDefinitionItem(draft, editingContextFact);
            const previousBindingId = editingContextFact.contextFactDefinitionId;
            await onUpdateContextFact?.(editingContextFact.contextFactDefinitionId, draft);
            setLocalContextFacts((previous) =>
              previous.map((entry) =>
                entry.contextFactDefinitionId === editingContextFact.contextFactDefinitionId
                  ? nextFact
                  : entry,
              ),
            );
            if (previousBindingId !== nextFact.contextFactDefinitionId) {
              setSteps((previous) =>
                previous.map((step) => {
                  if (step.stepType === "form") {
                    return {
                      ...step,
                      payload: {
                        ...step.payload,
                        fields: step.payload.fields.map((field) =>
                          field.contextFactDefinitionId === previousBindingId
                            ? {
                                ...field,
                                contextFactDefinitionId: nextFact.contextFactDefinitionId,
                              }
                            : field,
                        ),
                      },
                    };
                  }

                  if (step.stepType === "agent") {
                    return {
                      ...step,
                      payload: {
                        ...step.payload,
                        explicitReadGrants: step.payload.explicitReadGrants.map((grant) =>
                          grant.contextFactDefinitionId === previousBindingId
                            ? { contextFactDefinitionId: nextFact.contextFactDefinitionId }
                            : grant,
                        ),
                        writeItems: step.payload.writeItems.map((writeItem) => ({
                          ...writeItem,
                          contextFactDefinitionId:
                            writeItem.contextFactDefinitionId === previousBindingId
                              ? nextFact.contextFactDefinitionId
                              : writeItem.contextFactDefinitionId,
                          requirementContextFactDefinitionIds:
                            writeItem.requirementContextFactDefinitionIds.map((requirementId) =>
                              requirementId === previousBindingId
                                ? nextFact.contextFactDefinitionId
                                : requirementId,
                            ),
                        })),
                        completionRequirements: step.payload.completionRequirements.map(
                          (requirement) =>
                            requirement.contextFactDefinitionId === previousBindingId
                              ? { contextFactDefinitionId: nextFact.contextFactDefinitionId }
                              : requirement,
                        ),
                      },
                    };
                  }

                  if (step.stepType === "invoke") {
                    return {
                      ...step,
                      payload: updateInvokeStepContextFactReferences(
                        step.payload,
                        previousBindingId,
                        nextFact.contextFactDefinitionId,
                      ),
                    };
                  }

                  if (step.stepType === "branch") {
                    return {
                      ...step,
                      payload: updateBranchStepContextFactReferences(
                        step.payload,
                        previousBindingId,
                        nextFact.contextFactDefinitionId,
                      ),
                    };
                  }

                  return step;
                }),
              );
            }
          } else {
            const createdFact = await onCreateContextFact?.(draft);
            if (createdFact) {
              setLocalContextFacts((previous) => [...previous, createdFact]);
            }
          }

          setContextFactDialogOpen(false);
          setEditingContextFactId(null);
        }}
      />

      <Dialog
        open={deletingContextFactId !== null}
        onOpenChange={(nextOpen) => !nextOpen && setDeletingContextFactId(null)}
      >
        <DialogContent className="chiron-cut-frame-thick w-[min(30rem,calc(100vw-2rem))] p-6 sm:max-w-none">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold uppercase tracking-[0.08em]">
              Delete context fact definition?
            </DialogTitle>
            <DialogDescription>
              {deletingContextFact
                ? `Delete ${deletingContextFact.label || deletingContextFact.key} from this workflow editor?`
                : "Delete this context fact definition?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="rounded-none"
              onClick={() => setDeletingContextFactId(null)}
            >
              Keep Fact
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-none"
              onClick={async () => {
                if (!deletingContextFact) {
                  return;
                }

                const isBound = steps.some((step) =>
                  stepReferencesContextFact(step, deletingContextFact.contextFactDefinitionId),
                );

                if (isBound) {
                  setStatusMessage(
                    `Cannot delete ${deletingContextFact.key} while a workflow step still references it.`,
                  );
                  setDeletingContextFactId(null);
                  return;
                }

                setLocalContextFacts((previous) =>
                  previous.filter(
                    (entry) =>
                      entry.contextFactDefinitionId !== deletingContextFact.contextFactDefinitionId,
                  ),
                );
                setDeletingContextFactId(null);
                setStatusMessage(null);
                await onDeleteContextFact?.(deletingContextFact.contextFactDefinitionId);
              }}
            >
              Delete Fact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EdgeDialog
        open={isEdgeDialogOpen}
        edge={selectedEdge}
        onOpenChange={setEdgeDialogOpen}
        onSave={async (descriptionMarkdown) => {
          if (!selectedEdge) {
            return;
          }
          setEdges((previous) =>
            previous.map((entry) =>
              entry.edgeId === selectedEdge.edgeId
                ? {
                    ...entry,
                    descriptionMarkdown,
                  }
                : entry,
            ),
          );
          await onUpdateEdge?.(selectedEdge.edgeId, descriptionMarkdown);
          setEdgeDialogOpen(false);
        }}
        onDelete={async () => {
          if (!selectedEdge) {
            return;
          }
          setEdges((previous) => previous.filter((entry) => entry.edgeId !== selectedEdge.edgeId));
          setSelection(null);
          setEdgeDialogOpen(false);
          await onDeleteEdge?.(selectedEdge.edgeId);
        }}
      />

      <WorkflowMetadataDialog
        open={isMetadataDialogOpen}
        metadata={metadata}
        steps={steps}
        onOpenChange={setMetadataDialogOpen}
        onSave={async (nextMetadata) => {
          await onSaveMetadata(nextMetadata);
          setMetadataDialogOpen(false);
        }}
      />
    </main>
  );
}
