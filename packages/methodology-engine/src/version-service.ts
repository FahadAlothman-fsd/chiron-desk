import type {
  CreateDraftVersionInput,
  GetDraftLineageInput,
  MethodologyVersionDefinition,
  UpdateDraftVersionInput,
  ValidateDraftVersionInput,
  ValidationResult,
} from "@chiron/contracts/methodology/version";
import { Context, Effect, Schema } from "effect";
import { MethodologyVersionDefinition as MethodologyVersionDefinitionSchema } from "@chiron/contracts/methodology/version";

import {
  DuplicateVersionError,
  ValidationDecodeError,
  VersionNotDraftError,
  VersionNotFoundError,
} from "./errors";
import type { MethodologyVersionEventRow, MethodologyVersionRow } from "./repository";
import { MethodologyRepository } from "./repository";
import { validateDraftDefinition } from "./validation";

export interface CreateDraftResult {
  version: MethodologyVersionRow;
  diagnostics: ValidationResult;
}

export interface UpdateDraftResult {
  version: MethodologyVersionRow;
  diagnostics: ValidationResult;
}

export class MethodologyVersionService extends Context.Tag("MethodologyVersionService")<
  MethodologyVersionService,
  {
    readonly createDraftVersion: (
      input: CreateDraftVersionInput,
      actorId: string | null,
    ) => Effect.Effect<CreateDraftResult, DuplicateVersionError | ValidationDecodeError>;
    readonly updateDraftVersion: (
      input: UpdateDraftVersionInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError
    >;
    readonly validateDraftVersion: (
      input: ValidateDraftVersionInput,
      actorId: string | null,
    ) => Effect.Effect<ValidationResult, VersionNotFoundError | VersionNotDraftError>;
    readonly getDraftLineage: (
      input: GetDraftLineageInput,
    ) => Effect.Effect<readonly MethodologyVersionEventRow[]>;
  }
>() {}

function decodeDefinition(
  json: unknown,
): Effect.Effect<MethodologyVersionDefinition, ValidationDecodeError> {
  return Schema.decodeUnknown(MethodologyVersionDefinitionSchema)(json).pipe(
    Effect.mapError((err) => new ValidationDecodeError({ message: String(err) })),
  );
}

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
 * Compute a JSON-serialisable diff of fields that changed between old and new.
 * Only top-level keys are compared; both values are included for traceability.
 */
function computeChangedFields(
  prev: Record<string, unknown>,
  next: Record<string, unknown>,
): Record<string, { from: unknown; to: unknown }> | null {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  const allKeys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  for (const key of allKeys) {
    if (JSON.stringify(prev[key]) !== JSON.stringify(next[key])) {
      changes[key] = { from: prev[key], to: next[key] };
    }
  }
  return Object.keys(changes).length > 0 ? changes : null;
}

export const MethodologyVersionServiceLive = Effect.gen(function* () {
  const repo = yield* MethodologyRepository;

  const createDraftVersion = (
    input: CreateDraftVersionInput,
    actorId: string | null,
  ): Effect.Effect<CreateDraftResult, DuplicateVersionError | ValidationDecodeError> =>
    Effect.gen(function* () {
      const definition = yield* decodeDefinition(input.definition);

      const existingDef = yield* repo.findDefinitionByKey(input.methodologyKey);

      if (existingDef) {
        const existingVersion = yield* repo.findVersionByMethodologyAndVersion(
          existingDef.id,
          input.version,
        );
        if (existingVersion) {
          return yield* Effect.fail(
            new DuplicateVersionError({
              methodologyId: existingDef.id,
              version: input.version,
            }),
          );
        }
      }

      const timestamp = new Date().toISOString();
      const diagnostics = validateDraftDefinition(definition, timestamp);

      const { version } = yield* repo.createDraft({
        methodologyKey: input.methodologyKey,
        displayName: input.displayName,
        version: input.version,
        definitionJson: input.definition,
        factDefinitions: input.factDefinitions,
        linkTypeDefinitions: input.linkTypeDefinitions,
        actorId,
        validationDiagnostics: diagnostics,
      });

      return { version, diagnostics };
    });

  const updateDraftVersion = (
    input: UpdateDraftVersionInput,
    actorId: string | null,
  ): Effect.Effect<
    UpdateDraftResult,
    VersionNotFoundError | VersionNotDraftError | ValidationDecodeError
  > =>
    Effect.gen(function* () {
      const definition = yield* decodeDefinition(input.definition);

      const existing = yield* repo.findVersionById(input.versionId);
      if (!existing) {
        return yield* Effect.fail(new VersionNotFoundError({ versionId: input.versionId }));
      }
      yield* ensureVersionIsDraft(existing);

      const timestamp = new Date().toISOString();
      const diagnostics = validateDraftDefinition(definition, timestamp);

      const changedFieldsJson = computeChangedFields(
        {
          displayName: existing.displayName,
          version: existing.version,
          definitionJson: existing.definitionJson,
        },
        {
          displayName: input.displayName,
          version: input.version,
          definitionJson: input.definition,
        },
      );

      const { version } = yield* repo.updateDraft({
        versionId: input.versionId,
        displayName: input.displayName,
        version: input.version,
        definitionJson: input.definition,
        factDefinitions: input.factDefinitions,
        linkTypeDefinitions: input.linkTypeDefinitions,
        actorId,
        changedFieldsJson,
        validationDiagnostics: diagnostics,
      });

      return { version, diagnostics };
    });

  const validateDraftVersionFn = (
    input: ValidateDraftVersionInput,
    actorId: string | null,
  ): Effect.Effect<ValidationResult, VersionNotFoundError | VersionNotDraftError> =>
    Effect.gen(function* () {
      const existing = yield* repo.findVersionById(input.versionId);
      if (!existing) {
        return yield* Effect.fail(new VersionNotFoundError({ versionId: input.versionId }));
      }
      yield* ensureVersionIsDraft(existing);

      const definition = yield* decodeDefinition(existing.definitionJson).pipe(
        Effect.catchAll(() =>
          Effect.succeed({
            workUnitTypes: [],
            agentTypes: [],
            transitions: [],
            allowedWorkflowsByTransition: {},
          } satisfies MethodologyVersionDefinition),
        ),
      );

      const timestamp = new Date().toISOString();
      const diagnostics = validateDraftDefinition(definition, timestamp);

      yield* repo.recordEvent({
        methodologyVersionId: existing.id,
        eventType: "validated",
        actorId,
        changedFieldsJson: null,
        diagnosticsJson: diagnostics,
      });

      return diagnostics;
    });

  const getDraftLineage = (
    input: GetDraftLineageInput,
  ): Effect.Effect<readonly MethodologyVersionEventRow[]> =>
    repo.getVersionEvents({ versionId: input.methodologyVersionId });

  return MethodologyVersionService.of({
    createDraftVersion,
    updateDraftVersion,
    validateDraftVersion: validateDraftVersionFn,
    getDraftLineage,
  });
});
