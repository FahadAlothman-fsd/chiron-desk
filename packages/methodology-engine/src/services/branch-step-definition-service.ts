import type {
  BranchRouteConditionPayload,
  BranchStepPayload,
  WorkflowContextFactDto,
  WorkflowEdgeDto,
  WorkflowStepReadModel,
} from "@chiron/contracts/methodology/workflow";
import { Context, Effect, Layer } from "effect";

import {
  RepositoryError,
  ValidationDecodeError,
  VersionNotDraftError,
  VersionNotFoundError,
} from "../errors";
import { MethodologyRepository, type MethodologyVersionRow } from "../repository";
import { ConditionValidator, ConditionValidatorLive } from "./condition-engine";

type BranchProjectedEdgeOwner = "branch_default" | "branch_conditional";
type ConditionValidatorService = ConditionValidator["Type"];

type BranchProjectedEdgeMetadata = {
  readonly markdown: "";
  readonly edgeOwner: BranchProjectedEdgeOwner;
  readonly branchStepId: string;
  readonly routeId?: string;
};

type BranchEdgeRepository = {
  readonly listWorkflowEdgesByDefinitionId?: (input: {
    readonly versionId: string;
    readonly workflowDefinitionId: string;
  }) => Effect.Effect<readonly WorkflowEdgeDto[], RepositoryError>;
  readonly createWorkflowEdgeByDefinitionId?: (input: {
    readonly versionId: string;
    readonly workflowDefinitionId: string;
    readonly fromStepKey: string | null;
    readonly toStepKey: string | null;
    readonly descriptionJson: unknown;
  }) => Effect.Effect<WorkflowEdgeDto, RepositoryError>;
  readonly deleteWorkflowEdgeByDefinitionId?: (input: {
    readonly versionId: string;
    readonly workflowDefinitionId: string;
    readonly edgeId: string;
  }) => Effect.Effect<void, RepositoryError>;
};

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

const missingCapability = (operation: string) =>
  new RepositoryError({
    operation,
    cause: new Error("Branch projected edge repository capability is not configured"),
  });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getStepPayloadKey = (step: WorkflowStepReadModel): string => {
  switch (step.stepType) {
    case "form":
    case "invoke":
    case "branch":
      return step.payload.key;
    default:
      return step.stepId;
  }
};

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

const parseBranchProjectedEdgeMetadata = (value: unknown): BranchProjectedEdgeMetadata | null => {
  if (!isRecord(value)) {
    return null;
  }

  if (value.edgeOwner !== "branch_default" && value.edgeOwner !== "branch_conditional") {
    return null;
  }

  if (typeof value.branchStepId !== "string" || value.branchStepId.length === 0) {
    return null;
  }

  if (value.edgeOwner === "branch_conditional") {
    if (typeof value.routeId !== "string" || value.routeId.length === 0) {
      return null;
    }
  }

  return {
    markdown: "",
    edgeOwner: value.edgeOwner,
    branchStepId: value.branchStepId,
    ...(typeof value.routeId === "string" ? { routeId: value.routeId } : {}),
  };
};

const validateConditionReferences = (
  payload: BranchStepPayload,
  facts: readonly WorkflowContextFactDto[],
): Effect.Effect<void, ValidationDecodeError> =>
  Effect.gen(function* () {
    const factByIdentifier = createContextFactIndex(facts);

    for (const route of payload.routes) {
      if (route.groups.length === 0) {
        return yield* new ValidationDecodeError({
          message: `Branch route '${route.routeId}' must include at least one condition group`,
        });
      }

      for (const group of route.groups) {
        if (group.conditions.length === 0) {
          return yield* new ValidationDecodeError({
            message: `Branch route group '${group.groupId}' must include at least one condition`,
          });
        }

        for (const condition of group.conditions) {
          const fact = factByIdentifier.get(condition.contextFactDefinitionId);
          if (!fact) {
            return yield* new ValidationDecodeError({
              message:
                `Unknown workflow context fact '${condition.contextFactDefinitionId}' for branch ` +
                `condition '${condition.conditionId}'`,
            });
          }

          if (fact.kind !== condition.contextFactKind) {
            return yield* new ValidationDecodeError({
              message:
                `Branch condition '${condition.conditionId}' fact kind mismatch: expected ` +
                `'${fact.kind}' but received '${condition.contextFactKind}'`,
            });
          }
        }
      }
    }
  });

const validateBranchTargets = (
  payload: BranchStepPayload,
  existingSteps: readonly WorkflowStepReadModel[],
  branchStepId: string | null,
): Effect.Effect<void, ValidationDecodeError> =>
  Effect.gen(function* () {
    const stepIds = new Set(existingSteps.map((step) => step.stepId));
    const routeTargetIds = new Set<string>();

    if (payload.defaultTargetStepId !== null) {
      if (!stepIds.has(payload.defaultTargetStepId)) {
        return yield* new ValidationDecodeError({
          message: `Branch default target '${payload.defaultTargetStepId}' does not exist in the workflow`,
        });
      }

      if (branchStepId !== null && payload.defaultTargetStepId === branchStepId) {
        return yield* new ValidationDecodeError({
          message: "Branch default target cannot point to the branch step itself",
        });
      }
    }

    for (const route of payload.routes) {
      if (!stepIds.has(route.targetStepId)) {
        return yield* new ValidationDecodeError({
          message: `Branch route target '${route.targetStepId}' does not exist in the workflow`,
        });
      }

      if (branchStepId !== null && route.targetStepId === branchStepId) {
        return yield* new ValidationDecodeError({
          message: `Branch route '${route.routeId}' cannot target the branch step itself`,
        });
      }

      if (routeTargetIds.has(route.targetStepId)) {
        return yield* new ValidationDecodeError({
          message: `Branch conditional routes must use unique targetStepId values; duplicate '${route.targetStepId}' found`,
        });
      }

      routeTargetIds.add(route.targetStepId);
    }
  });

const validateConditions = (
  payload: BranchStepPayload,
  validator: ConditionValidatorService,
): Effect.Effect<void, ValidationDecodeError> => {
  const conditions: BranchRouteConditionPayload[] = payload.routes.flatMap((route) =>
    route.groups.flatMap((group) => group.conditions),
  );

  return validator.validateConditionSet(conditions);
};

export class BranchStepDefinitionService extends Context.Tag("BranchStepDefinitionService")<
  BranchStepDefinitionService,
  {
    readonly createBranchStep: (
      input: {
        readonly versionId: string;
        readonly workUnitTypeKey: string;
        readonly workflowDefinitionId: string;
        readonly payload: BranchStepPayload;
      },
      actorId: string | null,
    ) => Effect.Effect<
      {
        readonly stepId: string;
        readonly payload: BranchStepPayload;
      },
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
    readonly updateBranchStep: (
      input: {
        readonly versionId: string;
        readonly workUnitTypeKey: string;
        readonly workflowDefinitionId: string;
        readonly stepId: string;
        readonly payload: BranchStepPayload;
      },
      actorId: string | null,
    ) => Effect.Effect<
      {
        readonly stepId: string;
        readonly payload: BranchStepPayload;
      },
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
    readonly deleteBranchStep: (
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

export const BranchStepDefinitionServiceLive = Layer.effect(
  BranchStepDefinitionService,
  Effect.gen(function* () {
    const repo = (yield* MethodologyRepository) as MethodologyRepository["Type"] &
      BranchEdgeRepository;
    const conditionValidator: ConditionValidatorService = yield* ConditionValidator;

    const ensureDraft = (versionId: string) =>
      Effect.gen(function* () {
        const version = yield* repo.findVersionById(versionId);
        if (!version) {
          return yield* new VersionNotFoundError({ versionId });
        }

        yield* ensureDraftVersion(version);
      });

    const ensureProjectedEdgeCapabilities = () => {
      if (
        !repo.listWorkflowEdgesByDefinitionId ||
        !repo.createWorkflowEdgeByDefinitionId ||
        !repo.deleteWorkflowEdgeByDefinitionId
      ) {
        return Effect.fail(missingCapability("branchStep.projectedEdges"));
      }

      return Effect.void;
    };

    const getWorkflowShape = (input: {
      readonly versionId: string;
      readonly workUnitTypeKey: string;
      readonly workflowDefinitionId: string;
    }) =>
      repo.getWorkflowEditorDefinition({
        versionId: input.versionId,
        workUnitTypeKey: input.workUnitTypeKey,
        workflowDefinitionId: input.workflowDefinitionId,
      });

    const validatePayload = (
      input: {
        readonly versionId: string;
        readonly workUnitTypeKey: string;
        readonly workflowDefinitionId: string;
        readonly payload: BranchStepPayload;
      },
      branchStepId: string | null,
    ) =>
      Effect.gen(function* () {
        const workflow = yield* getWorkflowShape(input);
        yield* validateBranchTargets(input.payload, workflow.steps, branchStepId);
        yield* validateConditionReferences(input.payload, workflow.contextFacts);
        yield* validateConditions(input.payload, conditionValidator);

        return new Map(workflow.steps.map((step) => [step.stepId, getStepPayloadKey(step)]));
      });

    const deleteProjectedEdges = (input: {
      readonly versionId: string;
      readonly workflowDefinitionId: string;
      readonly branchStepId: string;
    }) =>
      Effect.gen(function* () {
        yield* ensureProjectedEdgeCapabilities();

        const edges = yield* repo.listWorkflowEdgesByDefinitionId!({
          versionId: input.versionId,
          workflowDefinitionId: input.workflowDefinitionId,
        });

        const projectedEdges = edges.filter((edge) => {
          const metadata = parseBranchProjectedEdgeMetadata(edge.descriptionJson);
          return metadata?.branchStepId === input.branchStepId;
        });

        yield* Effect.forEach(projectedEdges, (edge) =>
          repo.deleteWorkflowEdgeByDefinitionId!({
            versionId: input.versionId,
            workflowDefinitionId: input.workflowDefinitionId,
            edgeId: edge.edgeId,
          }),
        );
      });

    const syncProjectedEdges = (input: {
      readonly versionId: string;
      readonly workflowDefinitionId: string;
      readonly branchStepId: string;
      readonly branchStepKey: string;
      readonly payload: BranchStepPayload;
      readonly stepKeyById: ReadonlyMap<string, string>;
    }) =>
      Effect.gen(function* () {
        yield* deleteProjectedEdges({
          versionId: input.versionId,
          workflowDefinitionId: input.workflowDefinitionId,
          branchStepId: input.branchStepId,
        });

        if (input.payload.defaultTargetStepId !== null) {
          const toStepKey = input.stepKeyById.get(input.payload.defaultTargetStepId);
          if (!toStepKey) {
            return yield* new ValidationDecodeError({
              message: `Branch default target '${input.payload.defaultTargetStepId}' is missing a workflow step key`,
            });
          }

          yield* repo.createWorkflowEdgeByDefinitionId!({
            versionId: input.versionId,
            workflowDefinitionId: input.workflowDefinitionId,
            fromStepKey: input.branchStepKey,
            toStepKey,
            descriptionJson: {
              markdown: "",
              edgeOwner: "branch_default",
              branchStepId: input.branchStepId,
            } satisfies BranchProjectedEdgeMetadata,
          });
        }

        yield* Effect.forEach(input.payload.routes, (route) =>
          Effect.gen(function* () {
            const toStepKey = input.stepKeyById.get(route.targetStepId);
            if (!toStepKey) {
              return yield* new ValidationDecodeError({
                message: `Branch route target '${route.targetStepId}' is missing a workflow step key`,
              });
            }

            yield* repo.createWorkflowEdgeByDefinitionId!({
              versionId: input.versionId,
              workflowDefinitionId: input.workflowDefinitionId,
              fromStepKey: input.branchStepKey,
              toStepKey,
              descriptionJson: {
                markdown: "",
                edgeOwner: "branch_conditional",
                branchStepId: input.branchStepId,
                routeId: route.routeId,
              } satisfies BranchProjectedEdgeMetadata,
            });
          }),
        );
      });

    const createBranchStep = (
      input: {
        readonly versionId: string;
        readonly workUnitTypeKey: string;
        readonly workflowDefinitionId: string;
        readonly payload: BranchStepPayload;
      },
      actorId: string | null,
    ) =>
      Effect.gen(function* () {
        yield* ensureDraft(input.versionId);
        const stepKeyById = yield* validatePayload(input, null);

        const created = yield* repo.createBranchStepDefinition({
          versionId: input.versionId,
          workflowDefinitionId: input.workflowDefinitionId,
          payload: input.payload,
        });

        yield* syncProjectedEdges({
          versionId: input.versionId,
          workflowDefinitionId: input.workflowDefinitionId,
          branchStepId: created.stepId,
          branchStepKey: input.payload.key,
          payload: input.payload,
          stepKeyById,
        });

        yield* repo.recordEvent({
          methodologyVersionId: input.versionId,
          eventType: "workflows_updated",
          actorId: actorId ?? "system",
          changedFieldsJson: {
            operation: "create_branch_step",
            workUnitTypeKey: input.workUnitTypeKey,
            workflowDefinitionId: input.workflowDefinitionId,
            stepId: created.stepId,
          },
          diagnosticsJson: null,
        });

        return created;
      });

    const updateBranchStep = (
      input: {
        readonly versionId: string;
        readonly workUnitTypeKey: string;
        readonly workflowDefinitionId: string;
        readonly stepId: string;
        readonly payload: BranchStepPayload;
      },
      actorId: string | null,
    ) =>
      Effect.gen(function* () {
        yield* ensureDraft(input.versionId);
        const stepKeyById = yield* validatePayload(input, input.stepId);

        const updated = yield* repo.updateBranchStepDefinition({
          versionId: input.versionId,
          workflowDefinitionId: input.workflowDefinitionId,
          stepId: input.stepId,
          payload: input.payload,
        });

        yield* syncProjectedEdges({
          versionId: input.versionId,
          workflowDefinitionId: input.workflowDefinitionId,
          branchStepId: input.stepId,
          branchStepKey: input.payload.key,
          payload: input.payload,
          stepKeyById,
        });

        yield* repo.recordEvent({
          methodologyVersionId: input.versionId,
          eventType: "workflows_updated",
          actorId: actorId ?? "system",
          changedFieldsJson: {
            operation: "update_branch_step",
            workUnitTypeKey: input.workUnitTypeKey,
            workflowDefinitionId: input.workflowDefinitionId,
            stepId: updated.stepId,
          },
          diagnosticsJson: null,
        });

        return updated;
      });

    const deleteBranchStep = (
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
        yield* deleteProjectedEdges({
          versionId: input.versionId,
          workflowDefinitionId: input.workflowDefinitionId,
          branchStepId: input.stepId,
        });

        yield* repo.deleteBranchStepDefinition({
          versionId: input.versionId,
          workflowDefinitionId: input.workflowDefinitionId,
          stepId: input.stepId,
        });

        yield* repo.recordEvent({
          methodologyVersionId: input.versionId,
          eventType: "workflows_updated",
          actorId: actorId ?? "system",
          changedFieldsJson: {
            operation: "delete_branch_step",
            workUnitTypeKey: input.workUnitTypeKey,
            workflowDefinitionId: input.workflowDefinitionId,
            stepId: input.stepId,
          },
          diagnosticsJson: null,
        });
      });

    return BranchStepDefinitionService.of({
      createBranchStep,
      updateBranchStep,
      deleteBranchStep,
    });
  }),
).pipe(Layer.provide(ConditionValidatorLive));
