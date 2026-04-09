import type { AgentStepDesignTimePayload } from "@chiron/contracts/agent-step";
import type { WorkflowContextFactDto } from "@chiron/contracts/methodology/workflow";
import { Context, Effect, Layer } from "effect";

import {
  RepositoryError,
  ValidationDecodeError,
  VersionNotDraftError,
  VersionNotFoundError,
} from "../errors";
import { MethodologyRepository, type MethodologyVersionRow } from "../repository";

export interface AgentStepDefinitionReadModel {
  readonly stepId: string;
  readonly payload: AgentStepDesignTimePayload;
}

interface CreateAgentStepDefinitionParams {
  readonly versionId: string;
  readonly workflowDefinitionId: string;
  readonly afterStepKey: string | null;
  readonly payload: AgentStepDesignTimePayload;
}

interface UpdateAgentStepDefinitionParams {
  readonly versionId: string;
  readonly workflowDefinitionId: string;
  readonly stepId: string;
  readonly payload: AgentStepDesignTimePayload;
}

interface DeleteAgentStepDefinitionParams {
  readonly versionId: string;
  readonly workflowDefinitionId: string;
  readonly stepId: string;
}

interface AgentStepDefinitionRepository {
  readonly createAgentStepDefinition: (
    params: CreateAgentStepDefinitionParams,
  ) => Effect.Effect<AgentStepDefinitionReadModel, RepositoryError>;
  readonly updateAgentStepDefinition: (
    params: UpdateAgentStepDefinitionParams,
  ) => Effect.Effect<AgentStepDefinitionReadModel, RepositoryError>;
  readonly deleteAgentStepDefinition: (
    params: DeleteAgentStepDefinitionParams,
  ) => Effect.Effect<void, RepositoryError>;
}

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

const unique = <A>(values: Iterable<A>): readonly A[] => [...new Set(values)];

export const normalizeWriteItemOrders = (
  writeItems: AgentStepDesignTimePayload["writeItems"],
): AgentStepDesignTimePayload["writeItems"] =>
  [...writeItems]
    .map((writeItem, index) => ({ writeItem, index }))
    .sort((left, right) => left.writeItem.order - right.writeItem.order || left.index - right.index)
    .map(({ writeItem }, index) => ({
      ...writeItem,
      order: (index + 1) * 100,
      requirementContextFactDefinitionIds: unique(writeItem.requirementContextFactDefinitionIds),
    }));

export const validateAgentStepRequirements = (
  payload: AgentStepDesignTimePayload,
  facts: readonly WorkflowContextFactDto[],
): Effect.Effect<void, ValidationDecodeError> =>
  Effect.gen(function* () {
    const factByIdentifier = new Map<string, WorkflowContextFactDto>();
    const writeTargets = new Set<string>();
    const writeItemIds = new Set<string>();
    const explicitReads = new Set<string>();
    const completionRequirements = new Set<string>();

    for (const fact of facts) {
      factByIdentifier.set(fact.key, fact);
      if (typeof fact.contextFactDefinitionId === "string") {
        factByIdentifier.set(fact.contextFactDefinitionId, fact);
      }
    }

    for (const explicitRead of payload.explicitReadGrants) {
      if (explicitReads.has(explicitRead.contextFactDefinitionId)) {
        return yield* new ValidationDecodeError({
          message: `Agent step cannot grant context fact '${explicitRead.contextFactDefinitionId}' more than once`,
        });
      }

      explicitReads.add(explicitRead.contextFactDefinitionId);

      if (!factByIdentifier.has(explicitRead.contextFactDefinitionId)) {
        return yield* new ValidationDecodeError({
          message: `Unknown workflow context fact '${explicitRead.contextFactDefinitionId}'`,
        });
      }
    }

    for (const writeItem of payload.writeItems) {
      if (writeItemIds.has(writeItem.writeItemId)) {
        return yield* new ValidationDecodeError({
          message: `Agent step cannot declare write item '${writeItem.writeItemId}' more than once`,
        });
      }

      if (writeTargets.has(writeItem.contextFactDefinitionId)) {
        return yield* new ValidationDecodeError({
          message: `Agent step cannot target context fact '${writeItem.contextFactDefinitionId}' more than once`,
        });
      }

      writeItemIds.add(writeItem.writeItemId);
      writeTargets.add(writeItem.contextFactDefinitionId);

      const fact = factByIdentifier.get(writeItem.contextFactDefinitionId);
      if (!fact) {
        return yield* new ValidationDecodeError({
          message: `Unknown workflow context fact '${writeItem.contextFactDefinitionId}'`,
        });
      }

      if (fact.kind !== writeItem.contextFactKind) {
        return yield* new ValidationDecodeError({
          message: `Write item '${writeItem.writeItemId}' targets context fact '${writeItem.contextFactDefinitionId}' with mismatched kind '${writeItem.contextFactKind}'`,
        });
      }

      const seenRequirements = new Set<string>();
      for (const requirementId of writeItem.requirementContextFactDefinitionIds) {
        if (seenRequirements.has(requirementId)) {
          return yield* new ValidationDecodeError({
            message: `Write item '${writeItem.writeItemId}' cannot require context fact '${requirementId}' more than once`,
          });
        }

        if (requirementId === writeItem.contextFactDefinitionId) {
          return yield* new ValidationDecodeError({
            message: `Write item '${writeItem.writeItemId}' cannot require its own target context fact '${requirementId}'`,
          });
        }

        if (!factByIdentifier.has(requirementId)) {
          return yield* new ValidationDecodeError({
            message: `Write item '${writeItem.writeItemId}' references unknown requirement context fact '${requirementId}'`,
          });
        }

        seenRequirements.add(requirementId);
      }
    }

    for (const completionRequirement of payload.completionRequirements) {
      if (completionRequirements.has(completionRequirement.contextFactDefinitionId)) {
        return yield* new ValidationDecodeError({
          message: `Agent step cannot require completion context fact '${completionRequirement.contextFactDefinitionId}' more than once`,
        });
      }

      completionRequirements.add(completionRequirement.contextFactDefinitionId);

      if (!factByIdentifier.has(completionRequirement.contextFactDefinitionId)) {
        return yield* new ValidationDecodeError({
          message: `Unknown completion context fact '${completionRequirement.contextFactDefinitionId}'`,
        });
      }

      if (!writeTargets.has(completionRequirement.contextFactDefinitionId)) {
        return yield* new ValidationDecodeError({
          message: `Completion context fact '${completionRequirement.contextFactDefinitionId}' must be produced by this agent step`,
        });
      }
    }
  });

export const normalizeAgentStepPayload = (
  payload: AgentStepDesignTimePayload,
): AgentStepDesignTimePayload => ({
  ...payload,
  explicitReadGrants: unique(
    payload.explicitReadGrants.map((grant) => grant.contextFactDefinitionId),
  ).map((contextFactDefinitionId) => ({ contextFactDefinitionId })),
  writeItems: normalizeWriteItemOrders(payload.writeItems),
  completionRequirements: unique(
    payload.completionRequirements.map((requirement) => requirement.contextFactDefinitionId),
  ).map((contextFactDefinitionId) => ({ contextFactDefinitionId })),
});

export class AgentStepDefinitionService extends Context.Tag("AgentStepDefinitionService")<
  AgentStepDefinitionService,
  {
    readonly createAgentStep: (
      input: {
        readonly versionId: string;
        readonly workUnitTypeKey: string;
        readonly workflowDefinitionId: string;
        readonly afterStepKey: string | null;
        readonly payload: AgentStepDesignTimePayload;
      },
      actorId: string | null,
    ) => Effect.Effect<
      AgentStepDefinitionReadModel,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
    readonly updateAgentStep: (
      input: {
        readonly versionId: string;
        readonly workUnitTypeKey: string;
        readonly workflowDefinitionId: string;
        readonly stepId: string;
        readonly payload: AgentStepDesignTimePayload;
      },
      actorId: string | null,
    ) => Effect.Effect<
      AgentStepDefinitionReadModel,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
    readonly deleteAgentStep: (
      input: {
        readonly versionId: string;
        readonly workUnitTypeKey: string;
        readonly workflowDefinitionId: string;
        readonly stepId: string;
      },
      actorId: string | null,
    ) => Effect.Effect<
      void,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
  }
>() {}

export const AgentStepDefinitionServiceLive = Layer.effect(
  AgentStepDefinitionService,
  Effect.gen(function* () {
    const repo = yield* MethodologyRepository;
    const agentStepRepo = repo as Context.Tag.Service<typeof MethodologyRepository> &
      AgentStepDefinitionRepository;

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
      payload: AgentStepDesignTimePayload,
    ) =>
      Effect.gen(function* () {
        const facts = yield* repo.listWorkflowContextFactsByDefinitionId({
          versionId,
          workflowDefinitionId,
        });
        yield* validateAgentStepRequirements(payload, facts);
        return normalizeAgentStepPayload(payload);
      });

    const createAgentStep = (
      input: {
        readonly versionId: string;
        readonly workUnitTypeKey: string;
        readonly workflowDefinitionId: string;
        readonly afterStepKey: string | null;
        readonly payload: AgentStepDesignTimePayload;
      },
      actorId: string | null,
    ) =>
      Effect.gen(function* () {
        yield* ensureDraft(input.versionId);
        const normalizedPayload = yield* validatePayload(
          input.workflowDefinitionId,
          input.versionId,
          input.payload,
        );

        const created = yield* agentStepRepo.createAgentStepDefinition({
          versionId: input.versionId,
          workflowDefinitionId: input.workflowDefinitionId,
          afterStepKey: input.afterStepKey,
          payload: normalizedPayload,
        });

        yield* repo.recordEvent({
          methodologyVersionId: input.versionId,
          eventType: "workflows_updated",
          actorId: actorId ?? "system",
          changedFieldsJson: {
            operation: "create_agent_step",
            workUnitTypeKey: input.workUnitTypeKey,
            workflowDefinitionId: input.workflowDefinitionId,
            stepId: created.stepId,
          },
          diagnosticsJson: null,
        });

        return created;
      });

    const updateAgentStep = (
      input: {
        readonly versionId: string;
        readonly workUnitTypeKey: string;
        readonly workflowDefinitionId: string;
        readonly stepId: string;
        readonly payload: AgentStepDesignTimePayload;
      },
      actorId: string | null,
    ) =>
      Effect.gen(function* () {
        yield* ensureDraft(input.versionId);
        const normalizedPayload = yield* validatePayload(
          input.workflowDefinitionId,
          input.versionId,
          input.payload,
        );

        const updated = yield* agentStepRepo.updateAgentStepDefinition({
          versionId: input.versionId,
          workflowDefinitionId: input.workflowDefinitionId,
          stepId: input.stepId,
          payload: normalizedPayload,
        });

        yield* repo.recordEvent({
          methodologyVersionId: input.versionId,
          eventType: "workflows_updated",
          actorId: actorId ?? "system",
          changedFieldsJson: {
            operation: "update_agent_step",
            workUnitTypeKey: input.workUnitTypeKey,
            workflowDefinitionId: input.workflowDefinitionId,
            stepId: updated.stepId,
          },
          diagnosticsJson: null,
        });

        return updated;
      });

    const deleteAgentStep = (
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

        yield* agentStepRepo.deleteAgentStepDefinition({
          versionId: input.versionId,
          workflowDefinitionId: input.workflowDefinitionId,
          stepId: input.stepId,
        });

        yield* repo.recordEvent({
          methodologyVersionId: input.versionId,
          eventType: "workflows_updated",
          actorId: actorId ?? "system",
          changedFieldsJson: {
            operation: "delete_agent_step",
            workUnitTypeKey: input.workUnitTypeKey,
            workflowDefinitionId: input.workflowDefinitionId,
            stepId: input.stepId,
          },
          diagnosticsJson: null,
        });
      });

    return AgentStepDefinitionService.of({
      createAgentStep,
      updateAgentStep,
      deleteAgentStep,
    });
  }),
);
