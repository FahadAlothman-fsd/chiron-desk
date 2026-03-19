import {
  type CreateMethodologyWorkUnitInput as CreateWorkUnitInput,
  type UpdateMethodologyWorkUnitInput as UpdateWorkUnitInput,
  type UpdateDraftLifecycleInput,
  type WorkUnitTypeDefinition,
} from "@chiron/contracts/methodology/lifecycle";
import {
  type AgentTypeDefinition,
  type CreateMethodologyAgentInput as CreateAgentInput,
  type DeleteMethodologyAgentInput as DeleteAgentInput,
  type UpdateMethodologyAgentInput as UpdateAgentInput,
} from "@chiron/contracts/methodology/agent";
import type { ValidationResult } from "@chiron/contracts/methodology/version";
import { Context, Effect } from "effect";
import { LifecycleRepository } from "./lifecycle-repository";
import { MethodologyRepository } from "./repository";
import { validateLifecycleDefinition } from "./lifecycle-validation";
import type { MethodologyVersionRow } from "./repository";
import { RepositoryError, VersionNotDraftError, VersionNotFoundError } from "./errors";

export interface UpdateDraftLifecycleResult {
  version: MethodologyVersionRow;
  validation: ValidationResult;
}

/**
 * Service for lifecycle definition operations.
 * Manages work unit types, lifecycle states, transitions, and fact schemas.
 */
export class LifecycleService extends Context.Tag("LifecycleService")<
  LifecycleService,
  {
    readonly updateDraftLifecycle: (
      input: UpdateDraftLifecycleInput,
      actorId: string,
    ) => Effect.Effect<
      UpdateDraftLifecycleResult,
      VersionNotFoundError | VersionNotDraftError | RepositoryError
    >;
    readonly createAgent: (
      input: CreateAgentInput,
      actorId: string,
    ) => Effect.Effect<
      UpdateDraftLifecycleResult,
      VersionNotFoundError | VersionNotDraftError | RepositoryError
    >;
    readonly createWorkUnit: (
      input: CreateWorkUnitInput,
      actorId: string,
    ) => Effect.Effect<
      UpdateDraftLifecycleResult,
      VersionNotFoundError | VersionNotDraftError | RepositoryError
    >;
    readonly updateWorkUnit: (
      input: UpdateWorkUnitInput,
      actorId: string,
    ) => Effect.Effect<
      UpdateDraftLifecycleResult,
      VersionNotFoundError | VersionNotDraftError | RepositoryError
    >;
    readonly updateAgent: (
      input: UpdateAgentInput,
      actorId: string,
    ) => Effect.Effect<
      UpdateDraftLifecycleResult,
      VersionNotFoundError | VersionNotDraftError | RepositoryError
    >;
    readonly deleteAgent: (
      input: DeleteAgentInput,
      actorId: string,
    ) => Effect.Effect<
      UpdateDraftLifecycleResult,
      VersionNotFoundError | VersionNotDraftError | RepositoryError
    >;
  }
>() {}

function ensureVersionIsDraft(
  version: MethodologyVersionRow,
): Effect.Effect<MethodologyVersionRow, VersionNotDraftError> {
  if (version.status !== "draft") {
    return Effect.fail(
      new VersionNotDraftError({
        versionId: version.id,
        currentStatus: version.status,
      }),
    );
  }
  return Effect.succeed(version);
}

/**
 * Compute changed fields for lifecycle definitions.
 * Returns null if no changes detected.
 */
function computeLifecycleChanges(
  prev: {
    workUnitTypes: readonly WorkUnitTypeDefinition[];
    agentTypes: readonly AgentTypeDefinition[];
  } | null,
  next: {
    workUnitTypes: readonly WorkUnitTypeDefinition[];
    agentTypes: readonly AgentTypeDefinition[];
  },
): Record<string, { from: unknown; to: unknown }> | null {
  const changes: Record<string, { from: unknown; to: unknown }> = {};

  // Compare work unit types arrays
  const prevJson = prev ? JSON.stringify(prev.workUnitTypes) : null;
  const nextJson = JSON.stringify(next.workUnitTypes);

  if (prevJson !== nextJson) {
    changes.workUnitTypes = {
      from: prev?.workUnitTypes ?? null,
      to: next.workUnitTypes,
    };
  }

  const prevAgentsJson = prev ? JSON.stringify(prev.agentTypes) : null;
  const nextAgentsJson = JSON.stringify(next.agentTypes);
  if (prevAgentsJson !== nextAgentsJson) {
    changes.agentTypes = {
      from: prev?.agentTypes ?? null,
      to: next.agentTypes,
    };
  }

  return Object.keys(changes).length > 0 ? changes : null;
}

function extractText(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  if (!("text" in value)) {
    return undefined;
  }

  if (typeof value.text === "string") {
    return value.text;
  }

  return undefined;
}

function asCardinality(value: string): WorkUnitTypeDefinition["cardinality"] {
  return value === "one_per_project" ? "one_per_project" : "many_per_project";
}

function asGateClass(value: string): "start_gate" | "completion_gate" {
  return value === "start_gate" ? "start_gate" : "completion_gate";
}

function asFactType(value: string): "string" | "number" | "boolean" | "json" {
  if (value === "number") {
    return "number";
  }

  if (value === "boolean") {
    return "boolean";
  }

  if (value === "json") {
    return "json";
  }

  return "string";
}

function asModelReference(value: unknown): AgentTypeDefinition["defaultModel"] {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const modelReference = value as { provider?: unknown; model?: unknown };
  if (typeof modelReference.provider !== "string" || typeof modelReference.model !== "string") {
    return undefined;
  }

  return {
    provider: modelReference.provider,
    model: modelReference.model,
  };
}

function asStringArray(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const items = value.filter((item): item is string => typeof item === "string");
  return items.length === value.length ? items : undefined;
}

function loadPreviousLifecycleDefinition(
  versionId: string,
  lifecycleRepo: LifecycleRepository["Type"],
): Effect.Effect<
  {
    workUnitTypes: readonly WorkUnitTypeDefinition[];
    agentTypes: readonly AgentTypeDefinition[];
  },
  RepositoryError
> {
  return Effect.gen(function* () {
    const [
      workUnitTypeRows,
      lifecycleStateRows,
      transitionRows,
      factSchemaRows,
      transitionConditionSetRows,
      agentTypeRows,
    ] = yield* Effect.all([
      lifecycleRepo.findWorkUnitTypes(versionId),
      lifecycleRepo.findLifecycleStates(versionId),
      lifecycleRepo.findLifecycleTransitions(versionId),
      lifecycleRepo.findFactSchemas(versionId),
      lifecycleRepo.findTransitionConditionSets(versionId),
      lifecycleRepo.findAgentTypes(versionId),
    ]);

    const stateByWorkUnitType = new Map<string, Array<(typeof lifecycleStateRows)[number]>>();
    const stateKeyById = new Map<string, string>();
    for (const state of lifecycleStateRows) {
      const states = stateByWorkUnitType.get(state.workUnitTypeId) ?? [];
      states.push(state);
      stateByWorkUnitType.set(state.workUnitTypeId, states);
      stateKeyById.set(state.id, state.key);
    }

    const transitionsByWorkUnitType = new Map<string, Array<(typeof transitionRows)[number]>>();
    for (const transition of transitionRows) {
      const transitions = transitionsByWorkUnitType.get(transition.workUnitTypeId) ?? [];
      transitions.push(transition);
      transitionsByWorkUnitType.set(transition.workUnitTypeId, transitions);
    }

    const factsByWorkUnitType = new Map<string, Array<(typeof factSchemaRows)[number]>>();
    for (const factSchema of factSchemaRows) {
      const facts = factsByWorkUnitType.get(factSchema.workUnitTypeId) ?? [];
      facts.push(factSchema);
      factsByWorkUnitType.set(factSchema.workUnitTypeId, facts);
    }

    const conditionSetsByTransition = new Map<
      string,
      Array<(typeof transitionConditionSetRows)[number]>
    >();
    for (const conditionSet of transitionConditionSetRows) {
      const conditionSets = conditionSetsByTransition.get(conditionSet.transitionId) ?? [];
      conditionSets.push(conditionSet);
      conditionSetsByTransition.set(conditionSet.transitionId, conditionSets);
    }

    const workUnitTypes: WorkUnitTypeDefinition[] = workUnitTypeRows.map((workUnitTypeRow) => ({
      key: workUnitTypeRow.key,
      displayName: workUnitTypeRow.displayName ?? undefined,
      description: extractText(workUnitTypeRow.descriptionJson),
      guidance:
        (workUnitTypeRow.guidanceJson as WorkUnitTypeDefinition["guidance"] | null) ?? undefined,
      cardinality: asCardinality(workUnitTypeRow.cardinality),
      lifecycleStates: (stateByWorkUnitType.get(workUnitTypeRow.id) ?? []).map((stateRow) => ({
        key: stateRow.key,
        displayName: stateRow.displayName ?? undefined,
        description: extractText(stateRow.descriptionJson),
      })),
      lifecycleTransitions: (transitionsByWorkUnitType.get(workUnitTypeRow.id) ?? [])
        .map((transitionRow) => {
          const toState = stateKeyById.get(transitionRow.toStateId);
          if (!toState) {
            return null;
          }

          return {
            transitionKey: transitionRow.transitionKey,
            fromState:
              transitionRow.fromStateId === null
                ? undefined
                : (stateKeyById.get(transitionRow.fromStateId) ?? undefined),
            toState,
            gateClass: asGateClass(transitionRow.gateClass),
            conditionSets: (conditionSetsByTransition.get(transitionRow.id) ?? []).map(
              (conditionSetRow) => ({
                key: conditionSetRow.key,
                phase:
                  conditionSetRow.phase === "completion"
                    ? ("completion" as const)
                    : ("start" as const),
                mode: conditionSetRow.mode === "any" ? ("any" as const) : ("all" as const),
                groups: Array.isArray(conditionSetRow.groupsJson)
                  ? (conditionSetRow.groupsJson as WorkUnitTypeDefinition["lifecycleTransitions"][number]["conditionSets"][number]["groups"])
                  : [],
                guidance:
                  typeof conditionSetRow.guidanceJson === "string"
                    ? conditionSetRow.guidanceJson
                    : undefined,
              }),
            ),
          };
        })
        .filter((transition): transition is NonNullable<typeof transition> => transition !== null),
      factSchemas: (factsByWorkUnitType.get(workUnitTypeRow.id) ?? []).map((factSchemaRow) => ({
        name: factSchemaRow.name ?? undefined,
        key: factSchemaRow.key,
        factType: asFactType(factSchemaRow.factType),
        description: factSchemaRow.description ?? undefined,
        defaultValue: factSchemaRow.defaultValueJson ?? undefined,
        guidance:
          (factSchemaRow.guidanceJson as
            | WorkUnitTypeDefinition["factSchemas"][number]["guidance"]
            | null) ?? undefined,
        validation: (factSchemaRow.validationJson as
          | WorkUnitTypeDefinition["factSchemas"][number]["validation"]
          | null) ?? { kind: "none" },
      })),
    }));

    const agentTypes: AgentTypeDefinition[] = agentTypeRows.map((agentTypeRow) => ({
      key: agentTypeRow.key,
      displayName: agentTypeRow.displayName ?? undefined,
      description: agentTypeRow.description ?? undefined,
      persona: agentTypeRow.persona,
      defaultModel: asModelReference(agentTypeRow.defaultModelJson),
      mcpServers: asStringArray(agentTypeRow.mcpServersJson),
      capabilities: asStringArray(agentTypeRow.capabilitiesJson),
    }));

    return { workUnitTypes, agentTypes };
  });
}

export const LifecycleServiceLive = Effect.gen(function* () {
  const repo = yield* MethodologyRepository;
  const lifecycleRepo = yield* LifecycleRepository;

  const updateDraftLifecycle = (
    input: UpdateDraftLifecycleInput,
    actorId: string,
  ): Effect.Effect<
    UpdateDraftLifecycleResult,
    VersionNotFoundError | VersionNotDraftError | RepositoryError
  > =>
    Effect.gen(function* () {
      // Step 1: Find existing version
      const existing = yield* repo.findVersionById(input.versionId);
      if (!existing) {
        return yield* Effect.fail(new VersionNotFoundError({ versionId: input.versionId }));
      }

      // Step 2: Ensure draft status
      yield* ensureVersionIsDraft(existing);

      // Step 3: Fetch defined link types for validation
      const definedLinkTypeKeys = yield* repo.findLinkTypeKeys(input.versionId);

      // Step 4: Validate lifecycle definition (pure function)
      const timestamp = new Date().toISOString();
      const validation = validateLifecycleDefinition(
        input.workUnitTypes,
        timestamp,
        Array.from(definedLinkTypeKeys),
        input.agentTypes,
      );

      // Step 4: Compute changed fields for evidence
      const previousDefinition = yield* loadPreviousLifecycleDefinition(
        input.versionId,
        lifecycleRepo,
      );
      const changedFieldsJson = computeLifecycleChanges(previousDefinition, {
        workUnitTypes: input.workUnitTypes,
        agentTypes: input.agentTypes,
      });

      // Step 5: If validation has blocking errors, return without persisting (AC 5, 6, 7, 8, 9, 10)
      if (!validation.valid) {
        // Record validation failure event for evidence lineage (AC 12)
        yield* lifecycleRepo.recordLifecycleEvent({
          methodologyVersionId: input.versionId,
          eventType: "validated",
          actorId,
          changedFieldsJson,
          diagnosticsJson: validation,
        });

        return { version: existing, validation };
      }

      // Step 6: Persist lifecycle definition transactionally
      const { version } = yield* lifecycleRepo.saveLifecycleDefinition({
        versionId: input.versionId,
        workUnitTypes: input.workUnitTypes,
        agentTypes: input.agentTypes,
        actorId,
        validationResult: validation,
        changedFieldsJson,
      });

      return { version, validation };
    });

  const createAgent = (
    input: CreateAgentInput,
    actorId: string,
  ): Effect.Effect<
    UpdateDraftLifecycleResult,
    VersionNotFoundError | VersionNotDraftError | RepositoryError
  > =>
    Effect.gen(function* () {
      const existing = yield* repo.findVersionById(input.versionId);
      if (!existing) {
        return yield* Effect.fail(new VersionNotFoundError({ versionId: input.versionId }));
      }

      yield* ensureVersionIsDraft(existing);

      const previousDefinition = yield* loadPreviousLifecycleDefinition(
        input.versionId,
        lifecycleRepo,
      );

      return yield* updateDraftLifecycle(
        {
          versionId: input.versionId,
          workUnitTypes: previousDefinition.workUnitTypes,
          agentTypes: [...previousDefinition.agentTypes, input.agent],
        },
        actorId,
      );
    });

  const createWorkUnit = (
    input: CreateWorkUnitInput,
    actorId: string,
  ): Effect.Effect<
    UpdateDraftLifecycleResult,
    VersionNotFoundError | VersionNotDraftError | RepositoryError
  > =>
    Effect.gen(function* () {
      const existing = yield* repo.findVersionById(input.versionId);
      if (!existing) {
        return yield* Effect.fail(new VersionNotFoundError({ versionId: input.versionId }));
      }

      yield* ensureVersionIsDraft(existing);

      const previousDefinition = yield* loadPreviousLifecycleDefinition(
        input.versionId,
        lifecycleRepo,
      );

      const nextWorkUnit: WorkUnitTypeDefinition = {
        key: input.workUnitType.key,
        displayName: input.workUnitType.displayName,
        description: input.workUnitType.description,
        guidance: input.workUnitType.guidance,
        cardinality: input.workUnitType.cardinality ?? "many_per_project",
        lifecycleStates: [{ key: "draft" }],
        lifecycleTransitions: [],
        factSchemas: [],
      };

      return yield* updateDraftLifecycle(
        {
          versionId: input.versionId,
          workUnitTypes: [...previousDefinition.workUnitTypes, nextWorkUnit],
          agentTypes: previousDefinition.agentTypes,
        },
        actorId,
      );
    });

  const updateAgent = (
    input: UpdateAgentInput,
    actorId: string,
  ): Effect.Effect<
    UpdateDraftLifecycleResult,
    VersionNotFoundError | VersionNotDraftError | RepositoryError
  > =>
    Effect.gen(function* () {
      const existing = yield* repo.findVersionById(input.versionId);
      if (!existing) {
        return yield* Effect.fail(new VersionNotFoundError({ versionId: input.versionId }));
      }

      yield* ensureVersionIsDraft(existing);

      const previousDefinition = yield* loadPreviousLifecycleDefinition(
        input.versionId,
        lifecycleRepo,
      );

      return yield* updateDraftLifecycle(
        {
          versionId: input.versionId,
          workUnitTypes: previousDefinition.workUnitTypes,
          agentTypes: previousDefinition.agentTypes.map((agent) =>
            agent.key === input.agentKey ? input.agent : agent,
          ),
        },
        actorId,
      );
    });

  const updateWorkUnit = (
    input: UpdateWorkUnitInput,
    actorId: string,
  ): Effect.Effect<
    UpdateDraftLifecycleResult,
    VersionNotFoundError | VersionNotDraftError | RepositoryError
  > =>
    Effect.gen(function* () {
      const existing = yield* repo.findVersionById(input.versionId);
      if (!existing) {
        return yield* Effect.fail(new VersionNotFoundError({ versionId: input.versionId }));
      }

      yield* ensureVersionIsDraft(existing);

      const previousDefinition = yield* loadPreviousLifecycleDefinition(
        input.versionId,
        lifecycleRepo,
      );

      return yield* updateDraftLifecycle(
        {
          versionId: input.versionId,
          workUnitTypes: previousDefinition.workUnitTypes.map((workUnit) =>
            workUnit.key === input.workUnitKey
              ? {
                  ...workUnit,
                  key: input.workUnitType.key,
                  displayName: input.workUnitType.displayName,
                  description: input.workUnitType.description,
                  guidance: input.workUnitType.guidance,
                  cardinality: input.workUnitType.cardinality ?? workUnit.cardinality,
                }
              : workUnit,
          ),
          agentTypes: previousDefinition.agentTypes,
        },
        actorId,
      );
    });

  const deleteAgent = (
    input: DeleteAgentInput,
    actorId: string,
  ): Effect.Effect<
    UpdateDraftLifecycleResult,
    VersionNotFoundError | VersionNotDraftError | RepositoryError
  > =>
    Effect.gen(function* () {
      const existing = yield* repo.findVersionById(input.versionId);
      if (!existing) {
        return yield* Effect.fail(new VersionNotFoundError({ versionId: input.versionId }));
      }

      yield* ensureVersionIsDraft(existing);

      const previousDefinition = yield* loadPreviousLifecycleDefinition(
        input.versionId,
        lifecycleRepo,
      );

      return yield* updateDraftLifecycle(
        {
          versionId: input.versionId,
          workUnitTypes: previousDefinition.workUnitTypes,
          agentTypes: previousDefinition.agentTypes.filter((agent) => agent.key !== input.agentKey),
        },
        actorId,
      );
    });

  return LifecycleService.of({
    updateDraftLifecycle,
    createWorkUnit,
    updateWorkUnit,
    createAgent,
    updateAgent,
    deleteAgent,
  });
});
