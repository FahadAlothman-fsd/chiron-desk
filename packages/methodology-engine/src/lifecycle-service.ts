import type {
  GetTransitionEligibilityInput,
  GetTransitionEligibilityOutput,
  RequiredLinkEligibility,
  TransitionEligibility,
  UpdateDraftLifecycleInput,
  UpdateDraftLifecycleOutput,
  ValidationResult,
  WorkUnitTypeDefinition,
} from "@chiron/contracts/methodology/lifecycle";
import { Context, Effect } from "effect";
import { LifecycleRepository } from "./lifecycle-repository";
import { MethodologyRepository } from "./repository";
import { validateLifecycleDefinition } from "./lifecycle-validation";
import type { MethodologyVersionRow } from "./repository";
import { VersionNotDraftError, VersionNotFoundError } from "./errors";

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
      actorId: string | null,
    ) => Effect.Effect<UpdateDraftLifecycleResult, VersionNotFoundError | VersionNotDraftError>;
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
  prev: { workUnitTypes: WorkUnitTypeDefinition[] } | null,
  next: { workUnitTypes: WorkUnitTypeDefinition[] },
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

  return Object.keys(changes).length > 0 ? changes : null;
}

export const LifecycleServiceLive = Effect.gen(function* () {
  const repo = yield* MethodologyRepository;
  const lifecycleRepo = yield* LifecycleRepository;

  const updateDraftLifecycle = (
    input: UpdateDraftLifecycleInput,
    actorId: string | null,
  ): Effect.Effect<UpdateDraftLifecycleResult, VersionNotFoundError | VersionNotDraftError> =>
    Effect.gen(function* () {
      // Step 1: Find existing version
      const existing = yield* repo.findVersionById(input.versionId);
      if (!existing) {
        return yield* Effect.fail(new VersionNotFoundError({ versionId: input.versionId }));
      }

      // Step 2: Ensure draft status
      yield* ensureVersionIsDraft(existing);

      // Step 3: Validate lifecycle definition (pure function)
      const timestamp = new Date().toISOString();
      const validation = validateLifecycleDefinition(input.workUnitTypes, timestamp);

      // Step 4: Compute changed fields for evidence
      const changedFieldsJson = computeLifecycleChanges(
        // Extract previous lifecycle data from definitionJson if present
        existing.definitionJson && typeof existing.definitionJson === "object"
          ? (existing.definitionJson as { workUnitTypes: WorkUnitTypeDefinition[] })
          : null,
        { workUnitTypes: input.workUnitTypes },
      );

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
