import {
  WorkUnitTypeDefinition as WorkUnitTypeDefinitionSchema,
  type UpdateDraftLifecycleInput,
  type WorkUnitTypeDefinition,
} from "@chiron/contracts/methodology/lifecycle";
import {
  AgentTypeDefinition as AgentTypeDefinitionSchema,
  type AgentTypeDefinition,
} from "@chiron/contracts/methodology/agent";
import type { ValidationResult } from "@chiron/contracts/methodology/version";
import { Context, Effect, Schema } from "effect";
import { LifecycleRepository } from "./lifecycle-repository";
import { MethodologyRepository } from "./repository";
import { validateLifecycleDefinition } from "./lifecycle-validation";
import type { MethodologyVersionRow } from "./repository";
import { ValidationDecodeError, VersionNotDraftError, VersionNotFoundError } from "./errors";

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
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError
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

const decodeWorkUnitTypes = Schema.decodeUnknown(Schema.Array(WorkUnitTypeDefinitionSchema));
const decodeAgentTypes = Schema.decodeUnknown(Schema.Array(AgentTypeDefinitionSchema));

function extractPreviousLifecycleDefinition(definitionJson: unknown): Effect.Effect<
  {
    workUnitTypes: readonly WorkUnitTypeDefinition[];
    agentTypes: readonly AgentTypeDefinition[];
  } | null,
  ValidationDecodeError
> {
  if (typeof definitionJson !== "object" || definitionJson === null) {
    return Effect.succeed(null);
  }
  if (
    !Object.prototype.hasOwnProperty.call(definitionJson, "workUnitTypes") &&
    !Object.prototype.hasOwnProperty.call(definitionJson, "agentTypes")
  ) {
    return Effect.succeed(null);
  }
  const payload = definitionJson as { workUnitTypes?: unknown; agentTypes?: unknown };
  return Effect.all({
    workUnitTypes: decodeWorkUnitTypes(payload.workUnitTypes ?? []),
    agentTypes: decodeAgentTypes(payload.agentTypes ?? []),
  }).pipe(
    Effect.mapError(
      (err) =>
        new ValidationDecodeError({
          message: `Invalid existing definitionJson lifecycle payload: ${String(err)}`,
        }),
    ),
  );
}

export const LifecycleServiceLive = Effect.gen(function* () {
  const repo = yield* MethodologyRepository;
  const lifecycleRepo = yield* LifecycleRepository;

  const updateDraftLifecycle = (
    input: UpdateDraftLifecycleInput,
    actorId: string,
  ): Effect.Effect<
    UpdateDraftLifecycleResult,
    VersionNotFoundError | VersionNotDraftError | ValidationDecodeError
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
      const previousDefinition = yield* extractPreviousLifecycleDefinition(existing.definitionJson);
      const changedFieldsJson = computeLifecycleChanges(previousDefinition, {
        workUnitTypes: input.workUnitTypes,
        agentTypes: input.agentTypes,
      });

      // Step 5: If validation has blocking errors, return without persisting (AC 5, 6, 7, 8, 9, 10)
      if (!validation.valid) {
        // Record validation failure event for evidence lineage (AC 12)
        yield* lifecycleRepo.recordLifecycleEvent({
          methodologyVersionId: input.versionId,
          eventType: "lifecycle_validated",
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

  return LifecycleService.of({
    updateDraftLifecycle,
  });
});
