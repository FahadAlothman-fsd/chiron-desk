import type {
  InvokeActivationTransitionPayload,
  InvokeBindingPayload,
  InvokeStepPayload,
  WorkflowContextFactDto,
} from "@chiron/contracts/methodology/workflow";
import { Context, Effect, Layer } from "effect";

import {
  RepositoryError,
  ValidationDecodeError,
  VersionNotDraftError,
  VersionNotFoundError,
} from "../errors";
import { MethodologyRepository, type MethodologyVersionRow } from "../repository";

type WorkUnitInvokePayload = Extract<InvokeStepPayload, { targetKind: "work_unit" }>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const hasAuthoredArray = (value: unknown, key: string): boolean =>
  isRecord(value) && Array.isArray(value[key]) && value[key].length > 0;

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

const validateContextFactReference = (
  factByIdentifier: ReadonlyMap<string, WorkflowContextFactDto>,
  contextFactDefinitionId: string,
  subject: string,
): Effect.Effect<void, ValidationDecodeError> =>
  factByIdentifier.has(contextFactDefinitionId)
    ? Effect.void
    : Effect.fail(
        new ValidationDecodeError({
          message: `Unknown workflow context fact '${contextFactDefinitionId}' for ${subject}`,
        }),
      );

const getBindingDestinationKey = (binding: InvokeBindingPayload): string =>
  binding.destination.kind === "work_unit_fact"
    ? `work_unit_fact:${binding.destination.workUnitFactDefinitionId}`
    : `artifact_slot:${binding.destination.artifactSlotDefinitionId}`;

const getWorkflowContextFactCardinality = (fact: WorkflowContextFactDto): "one" | "many" =>
  fact.cardinality === "many" ? "many" : "one";

const isLiteralCapableDestination = (destination: {
  factType: string;
  cardinality: string;
  validationJson: unknown;
}): boolean => {
  if (destination.cardinality !== "one") {
    return false;
  }

  if (
    destination.factType !== "string" &&
    destination.factType !== "number" &&
    destination.factType !== "boolean"
  ) {
    return false;
  }

  return !(
    typeof destination.validationJson === "object" &&
    destination.validationJson !== null &&
    "kind" in destination.validationJson &&
    destination.validationJson.kind === "path"
  );
};

const isContextFactCompatibleWithWorkUnitFact = (
  sourceFact: WorkflowContextFactDto,
  destination: { factType: string; cardinality: string },
): boolean => {
  if (getWorkflowContextFactCardinality(sourceFact) !== destination.cardinality) {
    return false;
  }

  return sourceFact.kind === "plain_value_fact" && sourceFact.valueType === destination.factType;
};

const isContextFactCompatibleWithArtifactSlot = (
  sourceFact: WorkflowContextFactDto,
  destination: { cardinality: "single" | "fileset" },
): boolean =>
  sourceFact.kind === "artifact_reference_fact" &&
  getWorkflowContextFactCardinality(sourceFact) ===
    (destination.cardinality === "fileset" ? "many" : "one");

const validateBindingSet = (
  repo: MethodologyRepository["Type"],
  versionId: string,
  payload: WorkUnitInvokePayload,
  bindings: readonly InvokeBindingPayload[],
  factByIdentifier: ReadonlyMap<string, WorkflowContextFactDto>,
): Effect.Effect<void, ValidationDecodeError | RepositoryError> =>
  Effect.gen(function* () {
    const seenDestinations = new Set<string>();
    const workUnitFactIds = bindings.flatMap((binding) =>
      binding.destination.kind === "work_unit_fact"
        ? [binding.destination.workUnitFactDefinitionId]
        : [],
    );
    const artifactSlotIds = bindings.flatMap((binding) =>
      binding.destination.kind === "artifact_slot"
        ? [binding.destination.artifactSlotDefinitionId]
        : [],
    );
    const workUnitFacts = yield* repo.findInvokeBindingWorkUnitFactDefinitionsByIds({
      versionId,
      ids: workUnitFactIds,
    });
    const artifactSlots = yield* repo.findInvokeBindingArtifactSlotDefinitionsByIds({
      versionId,
      ids: artifactSlotIds,
    });
    const workUnitFactById = new Map(workUnitFacts.map((fact) => [fact.id, fact]));
    const artifactSlotById = new Map(artifactSlots.map((slot) => [slot.id, slot]));
    const selectedDraftSpecFact =
      payload.sourceMode === "context_fact_backed"
        ? factByIdentifier.get(payload.contextFactDefinitionId)
        : null;

    for (const binding of bindings) {
      const destinationKey = getBindingDestinationKey(binding);

      if (seenDestinations.has(destinationKey)) {
        return yield* new ValidationDecodeError({
          message: `Invoke bindings must use unique destinations; duplicate '${destinationKey}' found`,
        });
      }

      seenDestinations.add(destinationKey);

      if (binding.destination.kind === "work_unit_fact") {
        const destination = workUnitFactById.get(binding.destination.workUnitFactDefinitionId);
        if (!destination) {
          return yield* new ValidationDecodeError({
            message:
              `Unknown work-unit fact destination '${binding.destination.workUnitFactDefinitionId}' ` +
              `for invoke binding '${destinationKey}'`,
          });
        }

        if (
          (payload.sourceMode === "fixed_set" &&
            destination.workUnitTypeId !== payload.workUnitDefinitionId) ||
          (payload.sourceMode === "context_fact_backed" &&
            (!selectedDraftSpecFact ||
              selectedDraftSpecFact.kind !== "work_unit_draft_spec_fact" ||
              selectedDraftSpecFact.workUnitDefinitionId !== destination.workUnitTypeId ||
              !selectedDraftSpecFact.selectedWorkUnitFactDefinitionIds.includes(destination.id)))
        ) {
          return yield* new ValidationDecodeError({
            message: `Invoke binding destination '${destinationKey}' is not available for this invoke target`,
          });
        }

        if (binding.source.kind === "context_fact") {
          yield* validateContextFactReference(
            factByIdentifier,
            binding.source.contextFactDefinitionId,
            `invoke binding source for '${destinationKey}'`,
          );

          const sourceFact = factByIdentifier.get(binding.source.contextFactDefinitionId);
          if (!sourceFact || !isContextFactCompatibleWithWorkUnitFact(sourceFact, destination)) {
            return yield* new ValidationDecodeError({
              message: `Context-fact source for '${destinationKey}' is incompatible with destination type/cardinality`,
            });
          }
        }

        if (binding.source.kind === "literal") {
          if (!isLiteralCapableDestination(destination)) {
            return yield* new ValidationDecodeError({
              message: `Literal source is not allowed for destination '${destinationKey}'`,
            });
          }

          if (
            (destination.factType === "string" && typeof binding.source.value !== "string") ||
            (destination.factType === "number" && typeof binding.source.value !== "number") ||
            (destination.factType === "boolean" && typeof binding.source.value !== "boolean")
          ) {
            return yield* new ValidationDecodeError({
              message: `Literal source for '${destinationKey}' must match destination fact type '${destination.factType}'`,
            });
          }
        }

        continue;
      }

      const artifactSlot = artifactSlotById.get(binding.destination.artifactSlotDefinitionId);
      if (!artifactSlot) {
        return yield* new ValidationDecodeError({
          message:
            `Unknown artifact-slot destination '${binding.destination.artifactSlotDefinitionId}' ` +
            `for invoke binding '${destinationKey}'`,
        });
      }

      if (
        (payload.sourceMode === "fixed_set" &&
          artifactSlot.workUnitTypeId !== payload.workUnitDefinitionId) ||
        (payload.sourceMode === "context_fact_backed" &&
          (!selectedDraftSpecFact ||
            selectedDraftSpecFact.kind !== "work_unit_draft_spec_fact" ||
            selectedDraftSpecFact.workUnitDefinitionId !== artifactSlot.workUnitTypeId ||
            !selectedDraftSpecFact.selectedArtifactSlotDefinitionIds.includes(artifactSlot.id)))
      ) {
        return yield* new ValidationDecodeError({
          message: `Invoke binding destination '${destinationKey}' is not available for this invoke target`,
        });
      }

      if (binding.source.kind === "literal") {
        return yield* new ValidationDecodeError({
          message: `Literal source is not allowed for artifact-slot destination '${destinationKey}'`,
        });
      }

      if (binding.source.kind === "context_fact") {
        yield* validateContextFactReference(
          factByIdentifier,
          binding.source.contextFactDefinitionId,
          `invoke binding source for '${destinationKey}'`,
        );

        const sourceFact = factByIdentifier.get(binding.source.contextFactDefinitionId);
        if (!sourceFact || !isContextFactCompatibleWithArtifactSlot(sourceFact, artifactSlot)) {
          return yield* new ValidationDecodeError({
            message: `Context-fact source for '${destinationKey}' is incompatible with destination type/cardinality`,
          });
        }
      }
    }
  });

const validateActivationTransitions = (
  activationTransitions: readonly InvokeActivationTransitionPayload[],
): Effect.Effect<void, ValidationDecodeError> =>
  Effect.gen(function* () {
    const seenTransitionIds = new Set<string>();

    for (const transition of activationTransitions) {
      if (seenTransitionIds.has(transition.transitionId)) {
        return yield* new ValidationDecodeError({
          message:
            `Invoke activation transitions must use unique transitionId values; ` +
            `duplicate '${transition.transitionId}' found`,
        });
      }

      seenTransitionIds.add(transition.transitionId);

      const uniqueWorkflowDefinitionIds = new Set(transition.workflowDefinitionIds);
      if (uniqueWorkflowDefinitionIds.size !== transition.workflowDefinitionIds.length) {
        return yield* new ValidationDecodeError({
          message:
            `Invoke activation transition '${transition.transitionId}' cannot repeat ` +
            `workflowDefinitionIds`,
        });
      }
    }
  });

const validateInvokePayload = (
  repo: MethodologyRepository["Type"],
  versionId: string,
  payload: InvokeStepPayload,
  facts: readonly WorkflowContextFactDto[],
): Effect.Effect<void, ValidationDecodeError | RepositoryError> =>
  Effect.gen(function* () {
    const factByIdentifier = createContextFactIndex(facts);

    if (payload.sourceMode === "context_fact_backed") {
      yield* validateContextFactReference(
        factByIdentifier,
        payload.contextFactDefinitionId,
        `invoke source for step '${payload.key}'`,
      );
    }

    if (payload.targetKind === "workflow") {
      if (hasAuthoredArray(payload, "bindings")) {
        return yield* new ValidationDecodeError({
          message: "Workflow-target invoke cannot have authored bindings",
        });
      }

      if (hasAuthoredArray(payload, "activationTransitions")) {
        return yield* new ValidationDecodeError({
          message: "Workflow-target invoke cannot have activation transitions",
        });
      }

      return;
    }

    const workUnitPayload: WorkUnitInvokePayload = payload;

    yield* validateBindingSet(
      repo,
      versionId,
      workUnitPayload,
      workUnitPayload.bindings,
      factByIdentifier,
    );
    yield* validateActivationTransitions(workUnitPayload.activationTransitions);
  });

export class InvokeStepDefinitionService extends Context.Tag("InvokeStepDefinitionService")<
  InvokeStepDefinitionService,
  {
    readonly createInvokeStep: (
      input: {
        readonly versionId: string;
        readonly workUnitTypeKey: string;
        readonly workflowDefinitionId: string;
        readonly payload: InvokeStepPayload;
      },
      actorId: string | null,
    ) => Effect.Effect<
      {
        readonly stepId: string;
        readonly payload: InvokeStepPayload;
      },
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
    readonly updateInvokeStep: (
      input: {
        readonly versionId: string;
        readonly workUnitTypeKey: string;
        readonly workflowDefinitionId: string;
        readonly stepId: string;
        readonly payload: InvokeStepPayload;
      },
      actorId: string | null,
    ) => Effect.Effect<
      {
        readonly stepId: string;
        readonly payload: InvokeStepPayload;
      },
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
    readonly deleteInvokeStep: (
      input: {
        readonly versionId: string;
        readonly workUnitTypeKey: string;
        readonly workflowDefinitionId: string;
        readonly stepId: string;
      },
      actorId: string | null,
    ) => Effect.Effect<void, VersionNotFoundError | VersionNotDraftError | RepositoryError>;
  }
>() {}

export const InvokeStepDefinitionServiceLive = Layer.effect(
  InvokeStepDefinitionService,
  Effect.gen(function* () {
    const repo = yield* MethodologyRepository;

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
      payload: InvokeStepPayload,
    ) =>
      Effect.gen(function* () {
        const facts = yield* repo.listWorkflowContextFactsByDefinitionId({
          versionId,
          workflowDefinitionId,
        });

        yield* validateInvokePayload(repo, versionId, payload, facts);
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

          const payload = "payload" in step && isRecord(step.payload) ? step.payload : null;
          const stepKey =
            payload && typeof payload.key === "string" ? payload.key.trim() : undefined;

          return stepKey === normalizedKey;
        });
        if (duplicate) {
          return yield* new ValidationDecodeError({
            message: `Step key '${normalizedKey}' already exists in this workflow`,
          });
        }
      });

    const createInvokeStep = (
      input: {
        readonly versionId: string;
        readonly workUnitTypeKey: string;
        readonly workflowDefinitionId: string;
        readonly payload: InvokeStepPayload;
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

        const created = yield* repo.createInvokeStepDefinition({
          versionId: input.versionId,
          workflowDefinitionId: input.workflowDefinitionId,
          payload: input.payload,
        });

        yield* repo.recordEvent({
          methodologyVersionId: input.versionId,
          eventType: "workflows_updated",
          actorId: actorId ?? "system",
          changedFieldsJson: {
            operation: "create_invoke_step",
            workUnitTypeKey: input.workUnitTypeKey,
            workflowDefinitionId: input.workflowDefinitionId,
            stepId: created.stepId,
          },
          diagnosticsJson: null,
        });

        return created;
      });

    const updateInvokeStep = (
      input: {
        readonly versionId: string;
        readonly workUnitTypeKey: string;
        readonly workflowDefinitionId: string;
        readonly stepId: string;
        readonly payload: InvokeStepPayload;
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

        const updated = yield* repo.updateInvokeStepDefinition({
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
            operation: "update_invoke_step",
            workUnitTypeKey: input.workUnitTypeKey,
            workflowDefinitionId: input.workflowDefinitionId,
            stepId: updated.stepId,
          },
          diagnosticsJson: null,
        });

        return updated;
      });

    const deleteInvokeStep = (
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

        yield* repo.deleteInvokeStepDefinition({
          versionId: input.versionId,
          workflowDefinitionId: input.workflowDefinitionId,
          stepId: input.stepId,
        });

        yield* repo.recordEvent({
          methodologyVersionId: input.versionId,
          eventType: "workflows_updated",
          actorId: actorId ?? "system",
          changedFieldsJson: {
            operation: "delete_invoke_step",
            workUnitTypeKey: input.workUnitTypeKey,
            workflowDefinitionId: input.workflowDefinitionId,
            stepId: input.stepId,
          },
          diagnosticsJson: null,
        });
      });

    return InvokeStepDefinitionService.of({
      createInvokeStep,
      updateInvokeStep,
      deleteInvokeStep,
    });
  }),
);
