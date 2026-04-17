import type {
  ActionStepPayload,
  WorkflowContextFactDto,
} from "@chiron/contracts/methodology/workflow";
import { Context, Effect, Layer } from "effect";

import {
  RepositoryError,
  ValidationDecodeError,
  VersionNotDraftError,
  VersionNotFoundError,
} from "../errors";
import {
  MethodologyRepository,
  type MethodologyVersionRow,
  type WorkflowActionStepDefinitionReadModel,
} from "../repository";

export interface ActionStepDefinitionReadModel {
  readonly stepId: string;
  readonly stepType: "action";
  readonly payload: ActionStepPayload;
}

interface CreateActionStepDefinitionParams {
  readonly versionId: string;
  readonly workflowDefinitionId: string;
  readonly afterStepKey: string | null;
  readonly payload: ActionStepPayload;
}

interface UpdateActionStepDefinitionParams {
  readonly versionId: string;
  readonly workflowDefinitionId: string;
  readonly stepId: string;
  readonly payload: ActionStepPayload;
}

interface DeleteActionStepDefinitionParams {
  readonly versionId: string;
  readonly workflowDefinitionId: string;
  readonly stepId: string;
}

interface GetActionStepDefinitionParams {
  readonly versionId: string;
  readonly workflowDefinitionId: string;
  readonly stepId: string;
}

interface ActionStepDefinitionRepository {
  readonly createActionStepDefinition: (
    params: CreateActionStepDefinitionParams,
  ) => Effect.Effect<WorkflowActionStepDefinitionReadModel, RepositoryError>;
  readonly updateActionStepDefinition: (
    params: UpdateActionStepDefinitionParams,
  ) => Effect.Effect<WorkflowActionStepDefinitionReadModel, RepositoryError>;
  readonly deleteActionStepDefinition: (
    params: DeleteActionStepDefinitionParams,
  ) => Effect.Effect<void, RepositoryError>;
  readonly getActionStepDefinition: (
    params: GetActionStepDefinitionParams,
  ) => Effect.Effect<WorkflowActionStepDefinitionReadModel | null, RepositoryError>;
}

const ACTION_STEP_ALLOWED_CONTEXT_FACT_KINDS = new Set<WorkflowContextFactDto["kind"]>([
  "definition_backed_external_fact",
  "bound_external_fact",
  "artifact_reference_fact",
]);

const ensureDraftVersion = (
  version: MethodologyVersionRow,
): Effect.Effect<void, VersionNotDraftError> =>
  version.status === "draft"
    ? Effect.void
    : Effect.fail(
        new VersionNotDraftError({
          versionId: version.id,
          currentStatus: version.status,
        }),
      );

const createContextFactIndex = (facts: readonly WorkflowContextFactDto[]) => {
  const factByIdentifier = new Map<string, WorkflowContextFactDto>();

  for (const fact of facts) {
    factByIdentifier.set(fact.key, fact);
    if (typeof fact.contextFactDefinitionId === "string") {
      factByIdentifier.set(fact.contextFactDefinitionId, fact);
    }
  }

  return factByIdentifier;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const validateActionStepPayload = (
  payload: ActionStepPayload,
  facts: readonly WorkflowContextFactDto[],
): Effect.Effect<void, ValidationDecodeError> =>
  Effect.gen(function* () {
    if (payload.actions.length < 1) {
      return yield* new ValidationDecodeError({
        message: "Action step must include at least one action",
      });
    }

    if (!payload.actions.some((action) => action.enabled !== false)) {
      return yield* new ValidationDecodeError({
        message: "Action step must enable at least one action",
      });
    }

    const factByIdentifier = createContextFactIndex(facts);
    const actionIds = new Set<string>();
    const actionKeys = new Set<string>();
    const actionSortOrders = new Set<number>();
    for (const action of payload.actions) {
      if (action.actionKind !== "propagation") {
        return yield* new ValidationDecodeError({
          message: `Action '${action.actionId}' must use actionKind 'propagation'`,
        });
      }

      if (actionIds.has(action.actionId)) {
        return yield* new ValidationDecodeError({
          message: `Action step cannot declare action '${action.actionId}' more than once`,
        });
      }

      if (actionKeys.has(action.actionKey)) {
        return yield* new ValidationDecodeError({
          message: `Action step cannot declare action key '${action.actionKey}' more than once`,
        });
      }

      if (actionSortOrders.has(action.sortOrder)) {
        return yield* new ValidationDecodeError({
          message: `Action step cannot reuse action sortOrder '${action.sortOrder}'`,
        });
      }

      actionIds.add(action.actionId);
      actionKeys.add(action.actionKey);
      actionSortOrders.add(action.sortOrder);

      if (action.items.length < 1) {
        return yield* new ValidationDecodeError({
          message: `Action '${action.actionId}' must include at least one propagation item`,
        });
      }

      const fact = factByIdentifier.get(action.contextFactDefinitionId);
      if (!fact) {
        return yield* new ValidationDecodeError({
          message: `Unknown workflow context fact '${action.contextFactDefinitionId}'`,
        });
      }

      if (!ACTION_STEP_ALLOWED_CONTEXT_FACT_KINDS.has(fact.kind)) {
        return yield* new ValidationDecodeError({
          message:
            `Action '${action.actionId}' targets unsupported workflow context fact kind ` +
            `'${fact.kind}'`,
        });
      }

      const itemIds = new Set<string>();
      const itemKeys = new Set<string>();
      const itemSortOrders = new Set<number>();

      for (const item of action.items) {
        if (itemIds.has(item.itemId)) {
          return yield* new ValidationDecodeError({
            message: `Action '${action.actionId}' cannot declare item '${item.itemId}' more than once`,
          });
        }

        if (itemKeys.has(item.itemKey)) {
          return yield* new ValidationDecodeError({
            message: `Action '${action.actionId}' cannot declare item key '${item.itemKey}' more than once`,
          });
        }

        if (itemSortOrders.has(item.sortOrder)) {
          return yield* new ValidationDecodeError({
            message: `Action '${action.actionId}' cannot reuse item sortOrder '${item.sortOrder}'`,
          });
        }

        itemIds.add(item.itemId);
        itemKeys.add(item.itemKey);
        itemSortOrders.add(item.sortOrder);

        const effectiveFact = item.targetContextFactDefinitionId
          ? factByIdentifier.get(item.targetContextFactDefinitionId)
          : fact;

        if (item.targetContextFactDefinitionId && !effectiveFact) {
          return yield* new ValidationDecodeError({
            message:
              `Action '${action.actionId}' item '${item.itemId}' targets unknown workflow context fact ` +
              `'${item.targetContextFactDefinitionId}'`,
          });
        }

        if (effectiveFact && !ACTION_STEP_ALLOWED_CONTEXT_FACT_KINDS.has(effectiveFact.kind)) {
          return yield* new ValidationDecodeError({
            message:
              `Action '${action.actionId}' item '${item.itemId}' targets unsupported workflow context fact kind ` +
              `'${effectiveFact.kind}'`,
          });
        }
      }
    }
  });

const getWorkflowStepKey = (step: unknown): string | null => {
  if (!isRecord(step) || typeof step.stepType !== "string" || typeof step.stepId !== "string") {
    return null;
  }

  if (typeof step.stepKey === "string" && step.stepKey.trim().length > 0) {
    return step.stepKey.trim();
  }

  if (!isRecord(step.payload) || typeof step.payload.key !== "string") {
    return null;
  }

  return step.payload.key.trim();
};

const toActionStepDefinitionReadModel = (
  definition: WorkflowActionStepDefinitionReadModel,
): ActionStepDefinitionReadModel => ({
  stepId: definition.stepId,
  stepType: "action",
  payload: definition.payload,
});

export class ActionStepDefinitionService extends Context.Tag("ActionStepDefinitionService")<
  ActionStepDefinitionService,
  {
    readonly createActionStep: (
      input: {
        readonly versionId: string;
        readonly workUnitTypeKey: string;
        readonly workflowDefinitionId: string;
        readonly afterStepKey: string | null;
        readonly payload: ActionStepPayload;
      },
      actorId: string | null,
    ) => Effect.Effect<
      ActionStepDefinitionReadModel,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
    readonly updateActionStep: (
      input: {
        readonly versionId: string;
        readonly workUnitTypeKey: string;
        readonly workflowDefinitionId: string;
        readonly stepId: string;
        readonly payload: ActionStepPayload;
      },
      actorId: string | null,
    ) => Effect.Effect<
      ActionStepDefinitionReadModel,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
    readonly deleteActionStep: (
      input: {
        readonly versionId: string;
        readonly workUnitTypeKey: string;
        readonly workflowDefinitionId: string;
        readonly stepId: string;
      },
      actorId: string | null,
    ) => Effect.Effect<void, VersionNotFoundError | VersionNotDraftError | RepositoryError>;
    readonly getActionStepDefinition: (input: {
      readonly versionId: string;
      readonly workflowDefinitionId: string;
      readonly stepId: string;
    }) => Effect.Effect<ActionStepDefinitionReadModel, ValidationDecodeError | RepositoryError>;
  }
>() {}

export const ActionStepDefinitionServiceLive = Layer.effect(
  ActionStepDefinitionService,
  Effect.gen(function* () {
    const repo = yield* MethodologyRepository;
    const actionStepRepo = repo as Context.Tag.Service<typeof MethodologyRepository> &
      ActionStepDefinitionRepository;

    const ensureDraft = (versionId: string) =>
      Effect.gen(function* () {
        const version = yield* repo.findVersionById(versionId);
        if (!version) {
          return yield* new VersionNotFoundError({ versionId });
        }

        yield* ensureDraftVersion(version);
      });

    const validatePayload = (
      workflowDefinitionId: string,
      versionId: string,
      payload: ActionStepPayload,
    ) =>
      Effect.gen(function* () {
        const facts = yield* repo.listWorkflowContextFactsByDefinitionId({
          versionId,
          workflowDefinitionId,
        });

        yield* validateActionStepPayload(payload, facts);
      });

    const validateStepKeyUniqueness = (params: {
      readonly versionId: string;
      readonly workUnitTypeKey: string;
      readonly workflowDefinitionId: string;
      readonly stepKey: string;
      readonly excludeStepId?: string;
    }) =>
      Effect.gen(function* () {
        const editor = yield* repo.getWorkflowEditorDefinition({
          versionId: params.versionId,
          workUnitTypeKey: params.workUnitTypeKey,
          workflowDefinitionId: params.workflowDefinitionId,
        });

        const normalizedKey = params.stepKey.trim();
        const duplicate = editor.steps.find((step) => {
          if (step.stepId === params.excludeStepId) {
            return false;
          }

          return getWorkflowStepKey(step) === normalizedKey;
        });

        if (duplicate) {
          return yield* new ValidationDecodeError({
            message: `Step key '${normalizedKey}' already exists in this workflow`,
          });
        }
      });

    const createActionStep = (
      input: {
        readonly versionId: string;
        readonly workUnitTypeKey: string;
        readonly workflowDefinitionId: string;
        readonly afterStepKey: string | null;
        readonly payload: ActionStepPayload;
      },
      actorId: string | null,
    ) =>
      Effect.gen(function* () {
        yield* ensureDraft(input.versionId);
        yield* validatePayload(input.workflowDefinitionId, input.versionId, input.payload);
        yield* validateStepKeyUniqueness({
          versionId: input.versionId,
          workUnitTypeKey: input.workUnitTypeKey,
          workflowDefinitionId: input.workflowDefinitionId,
          stepKey: input.payload.key,
        });

        const created = yield* actionStepRepo.createActionStepDefinition({
          versionId: input.versionId,
          workflowDefinitionId: input.workflowDefinitionId,
          afterStepKey: input.afterStepKey,
          payload: input.payload,
        });

        yield* repo.recordEvent({
          methodologyVersionId: input.versionId,
          eventType: "workflows_updated",
          actorId: actorId ?? "system",
          changedFieldsJson: {
            operation: "create_action_step",
            workUnitTypeKey: input.workUnitTypeKey,
            workflowDefinitionId: input.workflowDefinitionId,
            stepId: created.stepId,
          },
          diagnosticsJson: null,
        });

        return toActionStepDefinitionReadModel(created);
      });

    const updateActionStep = (
      input: {
        readonly versionId: string;
        readonly workUnitTypeKey: string;
        readonly workflowDefinitionId: string;
        readonly stepId: string;
        readonly payload: ActionStepPayload;
      },
      actorId: string | null,
    ) =>
      Effect.gen(function* () {
        yield* ensureDraft(input.versionId);
        yield* validatePayload(input.workflowDefinitionId, input.versionId, input.payload);
        yield* validateStepKeyUniqueness({
          versionId: input.versionId,
          workUnitTypeKey: input.workUnitTypeKey,
          workflowDefinitionId: input.workflowDefinitionId,
          stepKey: input.payload.key,
          excludeStepId: input.stepId,
        });

        const updated = yield* actionStepRepo.updateActionStepDefinition({
          versionId: input.versionId,
          workflowDefinitionId: input.workflowDefinitionId,
          stepId: input.stepId,
          payload: input.payload,
        });

        yield* repo.recordEvent({
          methodologyVersionId: input.versionId,
          eventType: "workflows_updated",
          actorId: actorId ?? "system",
          changedFieldsJson: {
            operation: "update_action_step",
            workUnitTypeKey: input.workUnitTypeKey,
            workflowDefinitionId: input.workflowDefinitionId,
            stepId: updated.stepId,
          },
          diagnosticsJson: null,
        });

        return toActionStepDefinitionReadModel(updated);
      });

    const deleteActionStep = (
      input: {
        readonly versionId: string;
        readonly workUnitTypeKey: string;
        readonly workflowDefinitionId: string;
        readonly stepId: string;
      },
      actorId: string | null,
    ) =>
      Effect.gen(function* () {
        yield* ensureDraft(input.versionId);

        yield* actionStepRepo.deleteActionStepDefinition({
          versionId: input.versionId,
          workflowDefinitionId: input.workflowDefinitionId,
          stepId: input.stepId,
        });

        yield* repo.recordEvent({
          methodologyVersionId: input.versionId,
          eventType: "workflows_updated",
          actorId: actorId ?? "system",
          changedFieldsJson: {
            operation: "delete_action_step",
            workUnitTypeKey: input.workUnitTypeKey,
            workflowDefinitionId: input.workflowDefinitionId,
            stepId: input.stepId,
          },
          diagnosticsJson: null,
        });
      });

    const getActionStepDefinition = (input: {
      readonly versionId: string;
      readonly workflowDefinitionId: string;
      readonly stepId: string;
    }) =>
      Effect.gen(function* () {
        const definition = yield* actionStepRepo.getActionStepDefinition({
          versionId: input.versionId,
          workflowDefinitionId: input.workflowDefinitionId,
          stepId: input.stepId,
        });

        if (!definition) {
          return yield* new ValidationDecodeError({
            message: `Workflow action step '${input.stepId}' could not be resolved`,
          });
        }

        return toActionStepDefinitionReadModel(definition);
      });

    return ActionStepDefinitionService.of({
      createActionStep,
      updateActionStep,
      deleteActionStep,
      getActionStepDefinition,
    });
  }),
);
