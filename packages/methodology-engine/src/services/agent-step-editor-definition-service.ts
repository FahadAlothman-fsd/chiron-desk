import type { AgentStepDesignTimePayload } from "@chiron/contracts/agent-step";
import type {
  WorkflowContextFactDto,
  WorkflowEditorRouteIdentity,
  WorkflowStepReadModel,
} from "@chiron/contracts/methodology/workflow";
import { Context, Effect, Layer } from "effect";

import { RepositoryError, ValidationDecodeError } from "../errors";
import { MethodologyRepository, type WorkflowEditorDefinitionReadModel } from "../repository";
import { WorkflowEditorDefinitionService } from "./workflow-editor-definition-service";
import {
  normalizeAgentStepPayload,
  type AgentStepDefinitionReadModel,
} from "./agent-step-definition-service";

export type AgentStepReadSource = "explicit" | "inferred_from_write";

export type AgentStepReadModePreview =
  | "value_read"
  | "value_write_target"
  | "bound_read"
  | "bound_write_target"
  | "workflow_reference_read"
  | "workflow_reference_write_target"
  | "artifact_snapshot_read"
  | "artifact_snapshot_write_target"
  | "draft_spec_read"
  | "draft_spec_write_target";

export interface AgentStepReadableContextFactPreview {
  readonly contextFactDefinitionId: string;
  readonly key: string;
  readonly label?: string | undefined;
  readonly contextFactKind: WorkflowContextFactDto["kind"];
  readonly source: AgentStepReadSource;
  readonly readModePreview: AgentStepReadModePreview;
}

export interface AgentStepWriteItemPreview {
  readonly writeItemId: string;
  readonly contextFactDefinitionId: string;
  readonly contextFactKey: string;
  readonly contextFactKind: WorkflowContextFactDto["kind"];
  readonly label?: string | undefined;
  readonly order: number;
  readonly requirementContextFactDefinitionIds: readonly string[];
  readonly requirementLabels: readonly string[];
  readonly exposureModePreview: "requirements_only";
}

type DeferredAgentStepShell = Extract<
  WorkflowStepReadModel,
  { readonly stepType: "agent"; readonly mode: "deferred" }
>;

export interface AgentStepEditorDefinition {
  readonly workflow: WorkflowEditorDefinitionReadModel["workflow"];
  readonly step: DeferredAgentStepShell;
  readonly contextFacts: readonly WorkflowContextFactDto[];
  readonly payload: AgentStepDesignTimePayload;
  readonly readableContextFactPreviews: readonly AgentStepReadableContextFactPreview[];
  readonly writeItemPreviews: readonly AgentStepWriteItemPreview[];
}

interface AgentStepEditorDefinitionRepository {
  readonly listAgentStepDefinitions: (params: {
    readonly versionId: string;
    readonly workflowDefinitionId: string;
  }) => Effect.Effect<readonly AgentStepDefinitionReadModel[], RepositoryError>;
  readonly getAgentStepDefinition?: (params: {
    readonly versionId: string;
    readonly workflowDefinitionId: string;
    readonly stepId: string;
  }) => Effect.Effect<AgentStepDefinitionReadModel, RepositoryError>;
}

const getFactIdentifier = (fact: WorkflowContextFactDto) =>
  fact.contextFactDefinitionId ?? fact.key;

export const deriveAgentStepReadModePreview = (
  factKind: WorkflowContextFactDto["kind"],
  source: AgentStepReadSource,
): AgentStepReadModePreview => {
  switch (factKind) {
    case "plain_fact":
    case "plain_value_fact":
      return source === "explicit" ? "value_read" : "value_write_target";
    case "bound_fact":
      return source === "explicit" ? "bound_read" : "bound_write_target";
    case "workflow_ref_fact":
      return source === "explicit" ? "workflow_reference_read" : "workflow_reference_write_target";
    case "work_unit_reference_fact":
      return source === "explicit" ? "workflow_reference_read" : "workflow_reference_write_target";
    case "artifact_slot_reference_fact":
      return source === "explicit" ? "artifact_snapshot_read" : "artifact_snapshot_write_target";
    case "work_unit_draft_spec_fact":
      return source === "explicit" ? "draft_spec_read" : "draft_spec_write_target";
  }
};

export const deriveInferredReadableContextFacts = (
  payload: AgentStepDesignTimePayload,
  facts: readonly WorkflowContextFactDto[],
): readonly AgentStepReadableContextFactPreview[] => {
  const factByIdentifier = new Map<string, WorkflowContextFactDto>(
    facts.map((fact) => [getFactIdentifier(fact), fact]),
  );
  const explicitIds = new Set(
    payload.explicitReadGrants.map((explicitRead) => explicitRead.contextFactDefinitionId),
  );

  return payload.writeItems.flatMap((writeItem) => {
    if (explicitIds.has(writeItem.contextFactDefinitionId)) {
      return [];
    }

    const fact = factByIdentifier.get(writeItem.contextFactDefinitionId);
    if (!fact) {
      return [];
    }

    return [
      {
        contextFactDefinitionId: getFactIdentifier(fact),
        key: fact.key,
        label: fact.label,
        contextFactKind: fact.kind,
        source: "inferred_from_write" as const,
        readModePreview: deriveAgentStepReadModePreview(fact.kind, "inferred_from_write"),
      },
    ];
  });
};

const deriveExplicitReadableContextFacts = (
  payload: AgentStepDesignTimePayload,
  facts: readonly WorkflowContextFactDto[],
): readonly AgentStepReadableContextFactPreview[] => {
  const factByIdentifier = new Map<string, WorkflowContextFactDto>(
    facts.map((fact) => [getFactIdentifier(fact), fact]),
  );

  return payload.explicitReadGrants.flatMap((grant) => {
    const fact = factByIdentifier.get(grant.contextFactDefinitionId);
    if (!fact) {
      return [];
    }

    return [
      {
        contextFactDefinitionId: getFactIdentifier(fact),
        key: fact.key,
        label: fact.label,
        contextFactKind: fact.kind,
        source: "explicit" as const,
        readModePreview: deriveAgentStepReadModePreview(fact.kind, "explicit"),
      },
    ];
  });
};

const deriveWriteItemPreviews = (
  payload: AgentStepDesignTimePayload,
  facts: readonly WorkflowContextFactDto[],
): readonly AgentStepWriteItemPreview[] => {
  const factByIdentifier = new Map<string, WorkflowContextFactDto>(
    facts.map((fact) => [getFactIdentifier(fact), fact]),
  );

  return payload.writeItems.map((writeItem) => {
    const targetFact = factByIdentifier.get(writeItem.contextFactDefinitionId);
    const requirementLabels = writeItem.requirementContextFactDefinitionIds.map(
      (requirementId) => factByIdentifier.get(requirementId)?.label ?? requirementId,
    );

    return {
      writeItemId: writeItem.writeItemId,
      contextFactDefinitionId: writeItem.contextFactDefinitionId,
      contextFactKey: targetFact?.key ?? writeItem.contextFactDefinitionId,
      contextFactKind: writeItem.contextFactKind,
      label: writeItem.label,
      order: writeItem.order,
      requirementContextFactDefinitionIds: writeItem.requirementContextFactDefinitionIds,
      requirementLabels,
      exposureModePreview: "requirements_only" as const,
    };
  });
};

const findAgentStepShell = (
  baseDefinition: WorkflowEditorDefinitionReadModel,
  stepId: string,
): Effect.Effect<DeferredAgentStepShell, ValidationDecodeError> =>
  Effect.gen(function* () {
    const shell = baseDefinition.steps.find(
      (step): step is DeferredAgentStepShell =>
        step.stepId === stepId &&
        step.stepType === "agent" &&
        "mode" in step &&
        step.mode === "deferred",
    );
    if (!shell) {
      return yield* new ValidationDecodeError({
        message: `Workflow step '${stepId}' is not a deferred agent step shell`,
      });
    }

    return shell;
  });

export class AgentStepEditorDefinitionService extends Context.Tag(
  "AgentStepEditorDefinitionService",
)<
  AgentStepEditorDefinitionService,
  {
    readonly getAgentStepDefinition: (
      input: WorkflowEditorRouteIdentity & { readonly stepId: string },
    ) => Effect.Effect<AgentStepEditorDefinition, ValidationDecodeError | RepositoryError>;
  }
>() {}

export const AgentStepEditorDefinitionServiceLive = Layer.effect(
  AgentStepEditorDefinitionService,
  Effect.gen(function* () {
    const baseEditor = yield* WorkflowEditorDefinitionService;
    const repo = yield* MethodologyRepository;
    const agentStepRepo = repo as Context.Tag.Service<typeof MethodologyRepository> &
      AgentStepEditorDefinitionRepository;

    const fetchAgentStepDefinition = (input: {
      readonly versionId: string;
      readonly workflowDefinitionId: string;
      readonly stepId: string;
    }) => {
      if (typeof agentStepRepo.getAgentStepDefinition === "function") {
        return agentStepRepo.getAgentStepDefinition(input);
      }

      return Effect.gen(function* () {
        const definitions = yield* agentStepRepo.listAgentStepDefinitions({
          versionId: input.versionId,
          workflowDefinitionId: input.workflowDefinitionId,
        });
        const definition = definitions.find((entry) => entry.stepId === input.stepId);
        if (!definition) {
          return yield* new RepositoryError({
            operation: "methodology.getAgentStepDefinition",
            cause: `Agent step '${input.stepId}' not found for workflowDefinitionId='${input.workflowDefinitionId}'`,
          });
        }

        return definition;
      });
    };

    const getAgentStepDefinition = (
      input: WorkflowEditorRouteIdentity & { readonly stepId: string },
    ) =>
      Effect.gen(function* () {
        const baseDefinition = yield* baseEditor.getEditorDefinition(input);
        const step = yield* findAgentStepShell(baseDefinition, input.stepId);
        const agentStepDefinition = yield* fetchAgentStepDefinition({
          versionId: input.versionId,
          workflowDefinitionId: input.workflowDefinitionId,
          stepId: input.stepId,
        });

        const payload = normalizeAgentStepPayload(agentStepDefinition.payload);
        const explicitReadableContextFacts = deriveExplicitReadableContextFacts(
          payload,
          baseDefinition.contextFacts,
        );
        const inferredReadableContextFacts = deriveInferredReadableContextFacts(
          payload,
          baseDefinition.contextFacts,
        );

        return {
          workflow: baseDefinition.workflow,
          step,
          contextFacts: baseDefinition.contextFacts,
          payload,
          readableContextFactPreviews: [
            ...explicitReadableContextFacts,
            ...inferredReadableContextFacts,
          ],
          writeItemPreviews: deriveWriteItemPreviews(payload, baseDefinition.contextFacts),
        } satisfies AgentStepEditorDefinition;
      });

    return AgentStepEditorDefinitionService.of({ getAgentStepDefinition });
  }),
);
