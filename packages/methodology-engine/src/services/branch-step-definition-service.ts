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
import {
  ConditionValidator,
  ConditionValidatorLive,
  type ResolvedConditionOperand,
} from "./condition-engine";

type BranchProjectedEdgeOwner = "branch_default" | "branch_conditional";
type ConditionValidatorService = ConditionValidator["Type"];

type BranchProjectedEdgeMetadata = {
  readonly markdown: "";
  readonly edgeOwner: BranchProjectedEdgeOwner;
  readonly branchStepId: string;
  readonly routeId?: string;
  readonly targetStepId?: string;
};

type DeferredInvokeShell = {
  readonly stepId: string;
  readonly stepType: "invoke";
  readonly mode: "deferred";
  readonly defaultMessage: string;
};

type DeferredBranchShell = {
  readonly stepId: string;
  readonly stepType: "branch";
  readonly mode: "deferred";
  readonly defaultMessage: string;
};

type LegacyWorkflowStepReadModel =
  | WorkflowStepReadModel
  | DeferredInvokeShell
  | DeferredBranchShell;

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

const getJsonSubFieldMetadata = (
  fact: WorkflowContextFactDto,
  subFieldKey: string,
): {
  operandType: "string" | "number" | "boolean";
  validationKind: "none" | "path" | "allowed-values";
} | null => {
  const factValueType =
    "type" in fact &&
    (fact.type === "string" ||
      fact.type === "number" ||
      fact.type === "boolean" ||
      fact.type === "json")
      ? fact.type
      : "valueType" in fact &&
          (fact.valueType === "string" ||
            fact.valueType === "number" ||
            fact.valueType === "boolean" ||
            fact.valueType === "json" ||
            fact.valueType === "work_unit")
        ? fact.valueType
        : undefined;

  if (
    (fact.kind !== "plain_fact" &&
      fact.kind !== "plain_value_fact" &&
      fact.kind !== "bound_fact") ||
    factValueType !== "json"
  ) {
    return null;
  }

  if (!isRecord(fact.validationJson) || fact.validationJson.kind !== "json-schema") {
    return null;
  }

  const subSchema = isRecord(fact.validationJson.subSchema) ? fact.validationJson.subSchema : null;
  const schema = isRecord(fact.validationJson.schema) ? fact.validationJson.schema : null;
  const subSchemaFields = Array.isArray(subSchema?.fields) ? subSchema.fields : [];
  const legacyPropertyFields = isRecord(schema?.properties)
    ? Object.entries(schema.properties).map(([key, property]) => {
        const record = isRecord(property) ? property : null;
        return {
          key,
          type: record?.type,
          validation:
            record && typeof record.validation !== "undefined"
              ? record.validation
              : record && typeof record["x-validation"] !== "undefined"
                ? record["x-validation"]
                : undefined,
        };
      })
    : [];
  const fields = subSchemaFields.length > 0 ? subSchemaFields : legacyPropertyFields;
  const matchedField = fields.find((entry) => isRecord(entry) && entry.key === subFieldKey);
  if (!isRecord(matchedField)) {
    return null;
  }

  const operandType =
    matchedField.type === "string" ||
    matchedField.type === "number" ||
    matchedField.type === "boolean"
      ? matchedField.type
      : null;
  if (!operandType) {
    return null;
  }

  const validation = isRecord(matchedField.validation) ? matchedField.validation : null;
  const validationKind =
    operandType === "string" &&
    (validation?.kind === "path" || validation?.kind === "allowed-values")
      ? validation.kind
      : "none";

  return { operandType, validationKind };
};

const validateConditionReferences = (
  payload: BranchStepPayload,
  facts: readonly WorkflowContextFactDto[],
): Effect.Effect<ReadonlyMap<string, ResolvedConditionOperand>, ValidationDecodeError> =>
  Effect.gen(function* () {
    const factByIdentifier = createContextFactIndex(facts);
    const operandByConditionId = new Map<string, ResolvedConditionOperand>();

    const resolveOperand = (
      condition: BranchRouteConditionPayload,
      fact: WorkflowContextFactDto,
    ): Effect.Effect<ResolvedConditionOperand, ValidationDecodeError> =>
      Effect.gen(function* () {
        const factValueType =
          "type" in fact &&
          (fact.type === "string" ||
            fact.type === "number" ||
            fact.type === "boolean" ||
            fact.type === "json")
            ? fact.type
            : "valueType" in fact &&
                (fact.valueType === "string" ||
                  fact.valueType === "number" ||
                  fact.valueType === "boolean" ||
                  fact.valueType === "json" ||
                  fact.valueType === "work_unit")
              ? fact.valueType
              : undefined;

        const subFieldKey = condition.subFieldKey?.trim() ?? "";
        if (subFieldKey.length > 0) {
          if (
            (fact.kind === "plain_fact" ||
              fact.kind === "plain_value_fact" ||
              fact.kind === "bound_fact") &&
            factValueType === "json"
          ) {
            const subField = getJsonSubFieldMetadata(fact, subFieldKey);
            if (!subField) {
              return yield* new ValidationDecodeError({
                message:
                  `Branch condition '${condition.conditionId}' references unknown json ` +
                  `subfield '${subFieldKey}'`,
              });
            }

            return {
              operandType: subField.operandType,
              cardinality: fact.cardinality,
              freshnessCapable: false,
            } as const;
          }

          if (fact.kind !== "work_unit_draft_spec_fact") {
            return yield* new ValidationDecodeError({
              message:
                `Branch condition '${condition.conditionId}' uses subFieldKey on unsupported ` +
                `fact kind '${fact.kind}'`,
            });
          }

          if (subFieldKey.startsWith("artifact:")) {
            const artifactSlotDefinitionId = subFieldKey.slice("artifact:".length);
            if (!fact.selectedArtifactSlotDefinitionIds.includes(artifactSlotDefinitionId)) {
              return yield* new ValidationDecodeError({
                message:
                  `Branch condition '${condition.conditionId}' references unknown draft-spec ` +
                  `artifact subfield '${artifactSlotDefinitionId}'`,
              });
            }

            return {
              operandType: "artifact_reference",
              cardinality: "one",
              freshnessCapable: true,
            } as const;
          }

          if (subFieldKey.startsWith("fact:")) {
            const workUnitFactDefinitionId = subFieldKey.slice("fact:".length);
            if (!fact.selectedWorkUnitFactDefinitionIds.includes(workUnitFactDefinitionId)) {
              return yield* new ValidationDecodeError({
                message:
                  `Branch condition '${condition.conditionId}' references unknown draft-spec ` +
                  `fact subfield '${workUnitFactDefinitionId}'`,
              });
            }

            return {
              operandType: "json_object",
              cardinality: "one",
              freshnessCapable: false,
            } as const;
          }

          return yield* new ValidationDecodeError({
            message:
              `Branch condition '${condition.conditionId}' has invalid subFieldKey '${subFieldKey}'. ` +
              "Expected 'fact:<id>' or 'artifact:<id>'.",
          });
        }

        switch (fact.kind) {
          case "plain_fact":
          case "plain_value_fact":
            return {
              operandType: factValueType === "json" ? "json_object" : (factValueType ?? "string"),
              cardinality: fact.cardinality,
              freshnessCapable: false,
            } as const;
          case "workflow_ref_fact":
            return {
              operandType: "workflow_reference",
              cardinality: fact.cardinality,
              freshnessCapable: false,
            } as const;
          case "artifact_slot_reference_fact":
            return {
              operandType: "artifact_reference",
              cardinality: fact.cardinality,
              freshnessCapable: true,
            } as const;
          case "work_unit_reference_fact":
            return {
              operandType: "work_unit",
              cardinality: fact.cardinality,
              freshnessCapable: false,
            } as const;
          case "work_unit_draft_spec_fact":
            return {
              operandType: "json_object",
              cardinality: fact.cardinality,
              freshnessCapable: true,
            } as const;
          case "bound_fact": {
            const valueType =
              factValueType === "number" ||
              factValueType === "boolean" ||
              factValueType === "json" ||
              factValueType === "work_unit"
                ? factValueType
                : typeof fact.workUnitDefinitionId === "string" &&
                    fact.workUnitDefinitionId.length > 0
                  ? "work_unit"
                  : "string";

            return {
              operandType: valueType === "json" ? "json_object" : valueType,
              cardinality: fact.cardinality,
              freshnessCapable: false,
            } as const;
          }
        }
      });

    const assertFactSpecificOperatorCompatibility = (
      condition: BranchRouteConditionPayload,
      fact: WorkflowContextFactDto,
      operand: ResolvedConditionOperand,
    ): Effect.Effect<void, ValidationDecodeError> =>
      Effect.gen(function* () {
        const factValueType =
          "type" in fact &&
          (fact.type === "string" ||
            fact.type === "number" ||
            fact.type === "boolean" ||
            fact.type === "json")
            ? fact.type
            : "valueType" in fact &&
                (fact.valueType === "string" ||
                  fact.valueType === "number" ||
                  fact.valueType === "boolean" ||
                  fact.valueType === "json" ||
                  fact.valueType === "work_unit")
              ? fact.valueType
              : undefined;

        if (
          fact.kind !== "plain_fact" &&
          fact.kind !== "plain_value_fact" &&
          fact.kind !== "bound_fact"
        ) {
          return;
        }

        const subFieldKey = condition.subFieldKey?.trim() ?? "";

        const allowedOperators = (() => {
          if (factValueType === "json") {
            if (subFieldKey.length === 0) {
              return new Set(["exists"]);
            }

            if (operand.operandType === "string") {
              return new Set(["exists", "equals"]);
            }

            if (operand.operandType === "number") {
              return new Set(["exists", "equals"]);
            }

            if (operand.operandType === "boolean") {
              return new Set(["exists", "equals"]);
            }

            return new Set<string>();
          }

          if (subFieldKey.length > 0) {
            return new Set<string>();
          }

          if (fact.kind === "bound_fact") {
            if (
              factValueType === "work_unit" ||
              (typeof fact.workUnitDefinitionId === "string" &&
                fact.workUnitDefinitionId.length > 0)
            ) {
              return new Set(["exists", "equals"]);
            }

            if (factValueType === "string") {
              return new Set(["exists", "equals"]);
            }

            if (factValueType === "number") {
              return new Set(["exists", "equals"]);
            }

            if (factValueType === "boolean") {
              return new Set(["exists", "equals"]);
            }

            if (factValueType === "json") {
              return new Set(["exists"]);
            }
          }

          if (factValueType === "string") {
            return new Set(["exists", "equals"]);
          }

          if (factValueType === "number") {
            return new Set(["exists", "equals"]);
          }

          if (factValueType === "boolean") {
            return new Set(["exists", "equals"]);
          }

          return null;
        })();

        if (!allowedOperators) {
          return;
        }

        if (!allowedOperators.has(condition.operator)) {
          return yield* new ValidationDecodeError({
            message:
              `Branch condition operator '${condition.operator}' is outside the Plan A ` +
              `authoring subset for fact '${fact.key}'`,
          });
        }
      });

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
          if (
            condition.operator === "work_unit_instance_exists" ||
            condition.operator === "work_unit_instance_exists_in_state"
          ) {
            continue;
          }

          if (typeof condition.contextFactDefinitionId !== "string") {
            return yield* new ValidationDecodeError({
              message:
                `Branch condition '${condition.conditionId}' must reference a workflow context fact ` +
                "when using fact-based operators",
            });
          }

          const fact = factByIdentifier.get(condition.contextFactDefinitionId);
          if (!fact) {
            return yield* new ValidationDecodeError({
              message:
                `Unknown workflow context fact '${condition.contextFactDefinitionId}' for branch ` +
                `condition '${condition.conditionId}'`,
            });
          }

          const operand = yield* resolveOperand(condition, fact);
          yield* assertFactSpecificOperatorCompatibility(condition, fact, operand);
          operandByConditionId.set(condition.conditionId, operand);
        }
      }
    }

    return operandByConditionId;
  });

const validateBranchTargets = (
  payload: BranchStepPayload,
  existingSteps: readonly { readonly stepId: string }[],
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
  operandByConditionId: ReadonlyMap<string, ResolvedConditionOperand>,
): Effect.Effect<void, ValidationDecodeError> => {
  const conditions = payload.routes.flatMap((route) =>
    route.groups.flatMap((group) =>
      group.conditions.map((condition) => ({
        condition,
        operand: operandByConditionId.get(condition.conditionId),
      })),
    ),
  );

  const validatorConditions = conditions.filter(
    (entry) =>
      entry.condition.operator !== "work_unit_instance_exists" &&
      entry.condition.operator !== "work_unit_instance_exists_in_state",
  );

  if (validatorConditions.some((entry) => !entry.operand)) {
    return Effect.fail(
      new ValidationDecodeError({
        message: "Failed to resolve one or more branch condition operands",
      }),
    );
  }

  if (validatorConditions.length === 0) {
    return Effect.void;
  }

  return validator.validateConditionSet(
    validatorConditions.map((entry) => ({
      condition: entry.condition,
      operand: entry.operand as ResolvedConditionOperand,
    })),
  );
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
    ): Effect.Effect<ReadonlyMap<string, string>, ValidationDecodeError | RepositoryError> =>
      Effect.gen(function* () {
        const workflow = yield* getWorkflowShape(input);
        const workflowSteps = workflow.steps as readonly LegacyWorkflowStepReadModel[];

        yield* validateBranchTargets(input.payload, workflowSteps, branchStepId);
        const operandByConditionId = yield* validateConditionReferences(
          input.payload,
          workflow.contextFacts,
        );
        yield* validateConditions(input.payload, conditionValidator, operandByConditionId);

        const workflowStepById = new Map(workflowSteps.map((step) => [step.stepId, step]));
        const stepKeyById = new Map<string, string>();

        const resolveStepKey = (
          stepId: string,
        ): Effect.Effect<string, ValidationDecodeError | RepositoryError> =>
          Effect.gen(function* () {
            const cached = stepKeyById.get(stepId);
            if (cached) {
              return cached;
            }

            const step = workflowStepById.get(stepId);
            if (!step) {
              return yield* new ValidationDecodeError({
                message: `Branch target '${stepId}' does not exist in the workflow`,
              });
            }

            const readNonEmptyKey = (value: unknown): string | null =>
              typeof value === "string" && value.length > 0 ? value : null;

            switch (step.stepType) {
              case "form": {
                const key = readNonEmptyKey(step.payload.key);
                if (!key) {
                  return yield* new ValidationDecodeError({
                    message: `Workflow step '${step.stepId}' of type '${step.stepType}' is missing payload.key`,
                  });
                }
                stepKeyById.set(stepId, key);
                return key;
              }
              case "invoke": {
                const inlineKey = "payload" in step ? readNonEmptyKey(step.payload.key) : null;
                if (inlineKey) {
                  stepKeyById.set(stepId, inlineKey);
                  return inlineKey;
                }

                const definition = yield* repo.getInvokeStepDefinition({
                  versionId: input.versionId,
                  workflowDefinitionId: input.workflowDefinitionId,
                  stepId,
                });
                const resolvedKey = definition ? readNonEmptyKey(definition.payload.key) : null;

                if (!resolvedKey) {
                  return yield* new ValidationDecodeError({
                    message: `Workflow step '${stepId}' of type 'invoke' is missing payload.key`,
                  });
                }

                stepKeyById.set(stepId, resolvedKey);
                return resolvedKey;
              }
              case "branch": {
                const inlineKey = "payload" in step ? readNonEmptyKey(step.payload.key) : null;
                if (inlineKey) {
                  stepKeyById.set(stepId, inlineKey);
                  return inlineKey;
                }

                const definition = yield* repo.getBranchStepDefinition({
                  versionId: input.versionId,
                  workflowDefinitionId: input.workflowDefinitionId,
                  stepId,
                });
                const resolvedKey = definition ? readNonEmptyKey(definition.payload.key) : null;

                if (!resolvedKey) {
                  return yield* new ValidationDecodeError({
                    message: `Workflow step '${stepId}' of type 'branch' is missing payload.key`,
                  });
                }

                stepKeyById.set(stepId, resolvedKey);
                return resolvedKey;
              }
              default: {
                const deferredStepKey = "stepKey" in step && readNonEmptyKey(step.stepKey);
                if (deferredStepKey) {
                  stepKeyById.set(stepId, deferredStepKey);
                  return deferredStepKey;
                }

                if ("payload" in step) {
                  const payload = isRecord(step.payload) ? step.payload : null;
                  const inlineKey = payload ? readNonEmptyKey(payload.key) : null;
                  if (inlineKey) {
                    stepKeyById.set(stepId, inlineKey);
                    return inlineKey;
                  }
                }

                stepKeyById.set(stepId, stepId);
                return stepId;
              }
            }
          });

        if (input.payload.defaultTargetStepId !== null) {
          yield* resolveStepKey(input.payload.defaultTargetStepId);
        }
        for (const route of input.payload.routes) {
          if (!stepKeyById.has(route.targetStepId)) {
            yield* resolveStepKey(route.targetStepId);
          }
        }

        return stepKeyById;
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
              targetStepId: input.payload.defaultTargetStepId,
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
                targetStepId: route.targetStepId,
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
