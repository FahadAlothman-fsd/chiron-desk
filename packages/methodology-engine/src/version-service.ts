import type {
  CreateDraftVersionInput,
  GetDraftLineageInput,
  MethodologyVersionDefinition,
  UpdateDraftVersionInput,
  ValidateDraftVersionInput,
  ValidationResult,
} from "@chiron/contracts/methodology/version";
import type { UpdateDraftWorkflowsInputDto } from "@chiron/contracts/methodology/dto";
import { Context, Effect, Schema } from "effect";
import { MethodologyVersionDefinition as MethodologyVersionDefinitionSchema } from "@chiron/contracts/methodology/version";

import {
  DuplicateVersionError,
  RepositoryError,
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
    ) => Effect.Effect<
      CreateDraftResult,
      DuplicateVersionError | ValidationDecodeError | RepositoryError
    >;
    readonly updateDraftVersion: (
      input: UpdateDraftVersionInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
    readonly updateDraftWorkflows: (
      input: UpdateDraftWorkflowsInputDto,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
    readonly validateDraftVersion: (
      input: ValidateDraftVersionInput,
      actorId: string | null,
    ) => Effect.Effect<
      ValidationResult,
      VersionNotFoundError | VersionNotDraftError | RepositoryError
    >;
    readonly getDraftLineage: (
      input: GetDraftLineageInput,
    ) => Effect.Effect<readonly MethodologyVersionEventRow[], RepositoryError>;
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

function toDefinitionExtensions(definition: MethodologyVersionDefinition): unknown {
  return {
    workUnitTypes: definition.workUnitTypes,
    agentTypes: definition.agentTypes,
    transitions: definition.transitions,
    guidance:
      definition.guidance?.global === undefined
        ? undefined
        : {
            global: definition.guidance.global,
          },
  };
}

function mergeGuidance(
  extensionGuidance: MethodologyVersionDefinition["guidance"] | undefined,
  snapshotGuidance: MethodologyVersionDefinition["guidance"] | undefined,
): MethodologyVersionDefinition["guidance"] | undefined {
  if (!extensionGuidance && !snapshotGuidance) {
    return undefined;
  }

  return {
    global: snapshotGuidance?.global ?? extensionGuidance?.global,
    byWorkUnitType: {
      ...extensionGuidance?.byWorkUnitType,
      ...snapshotGuidance?.byWorkUnitType,
    },
    byAgentType: {
      ...extensionGuidance?.byAgentType,
      ...snapshotGuidance?.byAgentType,
    },
    byTransition: {
      ...extensionGuidance?.byTransition,
      ...snapshotGuidance?.byTransition,
    },
  };
}

function mergeDefinitionWithSnapshot(
  definitionExtensions: unknown,
  snapshot: {
    workflows: MethodologyVersionDefinition["workflows"];
    transitionWorkflowBindings: MethodologyVersionDefinition["transitionWorkflowBindings"];
    guidance?: MethodologyVersionDefinition["guidance"];
  },
): Effect.Effect<MethodologyVersionDefinition, ValidationDecodeError> {
  return decodeDefinition(definitionExtensions).pipe(
    Effect.map((definition) => ({
      ...definition,
      workflows: snapshot.workflows,
      transitionWorkflowBindings: snapshot.transitionWorkflowBindings,
      guidance: mergeGuidance(definition.guidance, snapshot.guidance),
    })),
  );
}

export const MethodologyVersionServiceLive = Effect.gen(function* () {
  const repo = yield* MethodologyRepository;

  const createDraftVersion = (
    input: CreateDraftVersionInput,
    actorId: string | null,
  ): Effect.Effect<
    CreateDraftResult,
    DuplicateVersionError | ValidationDecodeError | RepositoryError
  > =>
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
        definitionExtensions: toDefinitionExtensions(definition),
        workflows: definition.workflows,
        transitionWorkflowBindings: definition.transitionWorkflowBindings,
        guidance: definition.guidance,
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
    VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
  > =>
    Effect.gen(function* () {
      const definition = yield* decodeDefinition(input.definition);

      const existing = yield* repo.findVersionById(input.versionId);
      if (!existing) {
        return yield* Effect.fail(new VersionNotFoundError({ versionId: input.versionId }));
      }
      yield* ensureVersionIsDraft(existing);

      const previousSnapshot = yield* repo.findWorkflowSnapshot(existing.id);
      const previousLegacyDefinition = yield* decodeDefinition(existing.definitionExtensions).pipe(
        Effect.orElseSucceed(
          () =>
            ({
              workUnitTypes: [],
              agentTypes: [],
              transitions: [],
              workflows: [],
              transitionWorkflowBindings: {},
              guidance: undefined,
            }) satisfies MethodologyVersionDefinition,
        ),
      );
      const previousGuidance = mergeGuidance(
        previousLegacyDefinition.guidance,
        previousSnapshot.guidance,
      );

      const timestamp = new Date().toISOString();
      const diagnostics = validateDraftDefinition(definition, timestamp);

      const changedFieldsJson = computeChangedFields(
        {
          displayName: existing.displayName,
          version: existing.version,
          definitionExtensions: existing.definitionExtensions,
        },
        {
          displayName: input.displayName,
          version: input.version,
          definitionExtensions: toDefinitionExtensions(definition),
        },
      );

      const workflowsChanged =
        JSON.stringify(previousSnapshot.workflows) !== JSON.stringify(definition.workflows);
      const transitionBindingsChanged =
        JSON.stringify(previousSnapshot.transitionWorkflowBindings) !==
        JSON.stringify(definition.transitionWorkflowBindings);
      const guidanceChanged =
        JSON.stringify(previousGuidance) !== JSON.stringify(definition.guidance);

      const { version } = yield* repo.updateDraft({
        versionId: input.versionId,
        displayName: input.displayName,
        version: input.version,
        definitionExtensions: toDefinitionExtensions(definition),
        workflows: definition.workflows,
        transitionWorkflowBindings: definition.transitionWorkflowBindings,
        guidance: definition.guidance,
        factDefinitions: input.factDefinitions,
        linkTypeDefinitions: input.linkTypeDefinitions,
        actorId,
        changedFieldsJson,
        validationDiagnostics: diagnostics,
      });

      if (workflowsChanged) {
        yield* repo.recordEvent({
          methodologyVersionId: version.id,
          eventType: "workflows_updated",
          actorId,
          changedFieldsJson: {
            workflows: { from: previousSnapshot.workflows, to: definition.workflows },
          },
          diagnosticsJson: null,
        });
      }

      if (transitionBindingsChanged) {
        yield* repo.recordEvent({
          methodologyVersionId: version.id,
          eventType: "transition_bindings_updated",
          actorId,
          changedFieldsJson: {
            transitionWorkflowBindings: {
              from: previousSnapshot.transitionWorkflowBindings,
              to: definition.transitionWorkflowBindings,
            },
          },
          diagnosticsJson: null,
        });
      }

      if (guidanceChanged) {
        yield* repo.recordEvent({
          methodologyVersionId: version.id,
          eventType: "guidance_updated",
          actorId,
          changedFieldsJson: {
            guidance: { from: previousGuidance, to: definition.guidance },
          },
          diagnosticsJson: null,
        });
      }

      return { version, diagnostics };
    });

  const validateDraftVersionFn = (
    input: ValidateDraftVersionInput,
    actorId: string | null,
  ): Effect.Effect<
    ValidationResult,
    VersionNotFoundError | VersionNotDraftError | RepositoryError
  > =>
    Effect.gen(function* () {
      const existing = yield* repo.findVersionById(input.versionId);
      if (!existing) {
        return yield* Effect.fail(new VersionNotFoundError({ versionId: input.versionId }));
      }
      yield* ensureVersionIsDraft(existing);

      const snapshot = yield* repo.findWorkflowSnapshot(existing.id);
      const definition = yield* mergeDefinitionWithSnapshot(
        existing.definitionExtensions,
        snapshot,
      ).pipe(
        Effect.catchAll(() =>
          Effect.succeed({
            workUnitTypes: [],
            agentTypes: [],
            transitions: [],
            workflows: snapshot.workflows,
            transitionWorkflowBindings: snapshot.transitionWorkflowBindings,
            guidance: snapshot.guidance,
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

  const updateDraftWorkflows = (
    input: UpdateDraftWorkflowsInputDto,
    actorId: string | null,
  ): Effect.Effect<
    UpdateDraftResult,
    VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
  > =>
    Effect.gen(function* () {
      const existing = yield* repo.findVersionById(input.versionId);
      if (!existing) {
        return yield* Effect.fail(new VersionNotFoundError({ versionId: input.versionId }));
      }

      yield* ensureVersionIsDraft(existing);

      const baseDefinition = yield* decodeDefinition(existing.definitionExtensions).pipe(
        Effect.catchAll(() =>
          Effect.succeed({
            workUnitTypes: [],
            agentTypes: [],
            transitions: [],
            workflows: [],
            transitionWorkflowBindings: {},
            guidance: undefined,
          } satisfies MethodologyVersionDefinition),
        ),
      );

      const nextDefinition: MethodologyVersionDefinition = {
        ...baseDefinition,
        workflows: input.workflows,
        transitionWorkflowBindings: input.transitionWorkflowBindings,
        guidance: input.guidance,
      };

      return yield* updateDraftVersion(
        {
          versionId: input.versionId,
          displayName: existing.displayName,
          version: existing.version,
          definition: nextDefinition,
        },
        actorId,
      );
    });

  const getDraftLineage = (
    input: GetDraftLineageInput,
  ): Effect.Effect<readonly MethodologyVersionEventRow[], RepositoryError> =>
    repo.getVersionEvents({ versionId: input.methodologyVersionId });

  return MethodologyVersionService.of({
    createDraftVersion,
    updateDraftVersion,
    updateDraftWorkflows,
    validateDraftVersion: validateDraftVersionFn,
    getDraftLineage,
  });
});
