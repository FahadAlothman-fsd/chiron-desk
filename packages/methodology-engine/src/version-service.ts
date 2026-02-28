import type {
  CreateDraftVersionInput,
  GetProjectPinLineageInput,
  GetPublicationEvidenceInput,
  GetDraftLineageInput,
  MethodologyVersionDefinition,
  PinProjectMethodologyVersionInput,
  ProjectMethodologyPinEvent,
  PublishDraftVersionInput,
  PublicationEvidence,
  RepinProjectMethodologyVersionInput,
  UpdateDraftVersionInput,
  ValidationDiagnostic,
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
import type {
  MethodologyVersionEventRow,
  MethodologyVersionRow,
  ProjectMethodologyPinEventRow,
  ProjectMethodologyPinRow,
} from "./repository";
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

export interface PublishDraftResult {
  published: boolean;
  diagnostics: ValidationResult;
  version?: MethodologyVersionRow;
  evidence?: PublicationEvidence;
}

export interface ProjectMethodologyPinState {
  projectId: string;
  methodologyVersionId: string;
  methodologyKey: string;
  publishedVersion: string;
  actorId: string | null;
  timestamp: string;
}

export interface PinProjectMethodologyVersionResult {
  pinned: boolean;
  diagnostics: ValidationResult;
  pin?: ProjectMethodologyPinState;
}

export interface RepinProjectMethodologyVersionResult {
  repinned: boolean;
  diagnostics: ValidationResult;
  pin?: ProjectMethodologyPinState;
}

export interface GetPublishedContractInput {
  methodologyKey: string;
  publishedVersion: string;
  workUnitTypeKey: string;
}

export interface PublishedContractQueryResult {
  version: MethodologyVersionRow;
  workflows: MethodologyVersionDefinition["workflows"];
  transitionWorkflowBindings: MethodologyVersionDefinition["transitionWorkflowBindings"];
}

export interface MethodologyCatalogItem {
  methodologyId: string;
  methodologyKey: string;
  displayName: string;
  hasDraftVersion: boolean;
  availableVersions: number;
  updatedAt: string;
}

export interface MethodologyDetails {
  methodologyId: string;
  methodologyKey: string;
  displayName: string;
  descriptionJson: unknown;
  createdAt: string;
  updatedAt: string;
  versions: readonly {
    id: string;
    version: string;
    status: string;
    displayName: string;
    createdAt: string;
    retiredAt: string | null;
  }[];
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
    readonly publishDraftVersion: (
      input: PublishDraftVersionInput,
      actorId: string | null,
    ) => Effect.Effect<
      PublishDraftResult,
      VersionNotFoundError | RepositoryError | ValidationDecodeError
    >;
    readonly getPublicationEvidence: (
      input: GetPublicationEvidenceInput,
    ) => Effect.Effect<readonly PublicationEvidence[], RepositoryError>;
    readonly pinProjectMethodologyVersion: (
      input: PinProjectMethodologyVersionInput,
      actorId: string | null,
    ) => Effect.Effect<PinProjectMethodologyVersionResult, RepositoryError>;
    readonly repinProjectMethodologyVersion: (
      input: RepinProjectMethodologyVersionInput,
      actorId: string | null,
    ) => Effect.Effect<RepinProjectMethodologyVersionResult, RepositoryError>;
    readonly getProjectPinLineage: (
      input: GetProjectPinLineageInput,
    ) => Effect.Effect<readonly ProjectMethodologyPinEvent[], RepositoryError>;
    readonly getProjectMethodologyPin: (
      projectId: string,
    ) => Effect.Effect<ProjectMethodologyPinState | null, RepositoryError>;
    readonly createMethodology: (
      methodologyKey: string,
      displayName: string,
    ) => Effect.Effect<MethodologyDetails, RepositoryError>;
    readonly listMethodologies: () => Effect.Effect<
      readonly MethodologyCatalogItem[],
      RepositoryError
    >;
    readonly getMethodologyDetails: (
      methodologyKey: string,
    ) => Effect.Effect<MethodologyDetails | null, RepositoryError>;
    readonly getPublishedContractByVersionAndWorkUnitType: (
      input: GetPublishedContractInput,
    ) => Effect.Effect<PublishedContractQueryResult, VersionNotFoundError | RepositoryError>;
  }
>() {}

const ALLOWED_FACT_TYPES = new Set(["string", "number", "boolean", "json"]);

function sortDiagnostics(
  diagnostics: readonly ValidationDiagnostic[],
): readonly ValidationDiagnostic[] {
  return [...diagnostics].sort((a, b) => {
    if (a.scope === b.scope) {
      return a.code.localeCompare(b.code);
    }
    return a.scope.localeCompare(b.scope);
  });
}

function makePublishDiagnostic(
  code:
    | "PUBLISH_FACTS_V1_SCHEMA_INVALID"
    | "PUBLISH_FACTS_V1_REFS_DERIVED_FORBIDDEN"
    | "PUBLISH_REQUIRED_CONTRACT_INCOMPLETE"
    | "PUBLISH_VERSION_ALREADY_EXISTS"
    | "PUBLISH_CONCURRENT_WRITE_CONFLICT"
    | "PUBLISHED_CONTRACT_IMMUTABLE"
    | "PUBLISH_ATOMICITY_GUARD_ABORTED",
  scope:
    | "publish.validation.facts"
    | "publish.validation.contract"
    | "publish.versioning"
    | "publish.immutability"
    | "publish.persistence",
  timestamp: string,
  required: string,
  observed: string,
  remediation: string,
): ValidationDiagnostic {
  return {
    code,
    scope,
    blocking: true,
    required,
    observed,
    remediation,
    timestamp,
    evidenceRef: null,
  };
}

function makeProjectPinDiagnostic(
  code:
    | "PROJECT_PIN_TARGET_VERSION_NOT_FOUND"
    | "PROJECT_PIN_TARGET_VERSION_INCOMPATIBLE"
    | "PROJECT_REPIN_BLOCKED_EXECUTION_HISTORY"
    | "PROJECT_REPIN_REQUIRES_EXISTING_PIN"
    | "PROJECT_PIN_ATOMICITY_GUARD_ABORTED",
  scope: "project.pin.target" | "project.repin.policy" | "project.pin.persistence",
  timestamp: string,
  required: string,
  observed: string,
  remediation: string,
): ValidationDiagnostic {
  return {
    code,
    scope,
    blocking: true,
    required,
    observed,
    remediation,
    timestamp,
    evidenceRef: null,
  };
}

function toProjectPinState(pin: ProjectMethodologyPinRow): ProjectMethodologyPinState {
  return {
    projectId: pin.projectId,
    methodologyVersionId: pin.methodologyVersionId,
    methodologyKey: pin.methodologyKey,
    publishedVersion: pin.publishedVersion,
    actorId: pin.actorId,
    timestamp: pin.updatedAt.toISOString(),
  };
}

function toProjectPinEvent(event: ProjectMethodologyPinEventRow): ProjectMethodologyPinEvent {
  return {
    id: event.id,
    projectId: event.projectId,
    eventType: event.eventType,
    actorId: event.actorId,
    previousVersion: event.previousVersion,
    newVersion: event.newVersion,
    timestamp: event.createdAt.toISOString(),
    evidenceRef: event.evidenceRef,
  };
}

function isDefaultValueCompatible(factType: string, defaultValue: unknown): boolean {
  if (defaultValue === null || defaultValue === undefined) {
    return true;
  }

  switch (factType) {
    case "string":
      return typeof defaultValue === "string";
    case "number":
      return typeof defaultValue === "number" && Number.isFinite(defaultValue);
    case "boolean":
      return typeof defaultValue === "boolean";
    case "json":
      return true;
    default:
      return false;
  }
}

function hasRefsOrDerived(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  if (Array.isArray(value)) {
    return value.some((entry) => hasRefsOrDerived(entry));
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (
      "ref" in obj ||
      "refs" in obj ||
      "derived" in obj ||
      "derivedFrom" in obj ||
      "expression" in obj
    ) {
      return true;
    }
    return Object.values(obj).some((entry) => hasRefsOrDerived(entry));
  }
  return false;
}

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

  const publishDraftVersion = (
    input: PublishDraftVersionInput,
    actorId: string | null,
  ): Effect.Effect<
    PublishDraftResult,
    VersionNotFoundError | RepositoryError | ValidationDecodeError
  > =>
    Effect.gen(function* () {
      const existing = yield* repo.findVersionById(input.versionId);
      if (!existing) {
        return yield* Effect.fail(new VersionNotFoundError({ versionId: input.versionId }));
      }

      const timestamp = new Date().toISOString();

      if (existing.status !== "draft") {
        const diagnostics: ValidationResult = {
          valid: false,
          diagnostics: [
            makePublishDiagnostic(
              "PUBLISHED_CONTRACT_IMMUTABLE",
              "publish.immutability",
              timestamp,
              "draft status",
              `status=${existing.status}`,
              "Edit a draft and publish a new version",
            ),
          ],
        };
        return {
          published: false,
          diagnostics,
        };
      }

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

      const baseValidation = validateDraftDefinition(definition, timestamp);
      const diagnostics: ValidationDiagnostic[] = [];

      const blockingBase = sortDiagnostics(baseValidation.diagnostics.filter((d) => d.blocking));
      if (blockingBase.length > 0) {
        diagnostics.push(
          makePublishDiagnostic(
            "PUBLISH_REQUIRED_CONTRACT_INCOMPLETE",
            "publish.validation.contract",
            timestamp,
            "work unit types, transitions, transition workflow bindings, and valid workflow step types",
            blockingBase.map((d) => `${d.scope}:${d.code}`).join(","),
            "Resolve blocking contract diagnostics and republish",
          ),
        );
      }

      const missingRequired: string[] = [];
      if (definition.workUnitTypes.length === 0) {
        missingRequired.push("workUnitTypes");
      }
      if (definition.transitions.length === 0) {
        missingRequired.push("transitions");
      }
      const transitionCount = definition.transitions.length;
      const bindingCount = Object.keys(definition.transitionWorkflowBindings ?? {}).length;
      if (transitionCount > 0 && bindingCount < transitionCount) {
        missingRequired.push("transitionWorkflowBindings");
      }
      if (missingRequired.length > 0) {
        diagnostics.push(
          makePublishDiagnostic(
            "PUBLISH_REQUIRED_CONTRACT_INCOMPLETE",
            "publish.validation.contract",
            timestamp,
            "all required contract elements present",
            missingRequired.sort().join(","),
            "Complete missing contract elements and republish",
          ),
        );
      }

      const factSchemas = yield* repo.findFactSchemasByVersionId(existing.id);
      const seenFactKeys = new Set<string>();
      for (const fact of factSchemas) {
        if (seenFactKeys.has(fact.key)) {
          diagnostics.push(
            makePublishDiagnostic(
              "PUBLISH_FACTS_V1_SCHEMA_INVALID",
              "publish.validation.facts",
              timestamp,
              "unique fact keys",
              `duplicate key: ${fact.key}`,
              "Ensure each fact key is unique per work unit type",
            ),
          );
        }
        seenFactKeys.add(fact.key);

        if (!ALLOWED_FACT_TYPES.has(fact.factType)) {
          diagnostics.push(
            makePublishDiagnostic(
              "PUBLISH_FACTS_V1_SCHEMA_INVALID",
              "publish.validation.facts",
              timestamp,
              "supported fact type",
              `${fact.key}:${fact.factType}`,
              "Use one of string, number, boolean, json",
            ),
          );
        }

        if (!isDefaultValueCompatible(fact.factType, fact.defaultValueJson)) {
          diagnostics.push(
            makePublishDiagnostic(
              "PUBLISH_FACTS_V1_SCHEMA_INVALID",
              "publish.validation.facts",
              timestamp,
              "default value compatible with fact type",
              `${fact.key}:${JSON.stringify(fact.defaultValueJson)}`,
              "Set a valid static default for the fact type",
            ),
          );
        }

        if (hasRefsOrDerived(fact.defaultValueJson) || hasRefsOrDerived(fact.guidanceJson)) {
          diagnostics.push(
            makePublishDiagnostic(
              "PUBLISH_FACTS_V1_REFS_DERIVED_FORBIDDEN",
              "publish.validation.facts",
              timestamp,
              "facts v1 static fields with no refs or derived expressions",
              `fact=${fact.key}`,
              "Replace refs/derived expressions with static values",
            ),
          );
        }
      }

      const sortedDiagnostics = sortDiagnostics(diagnostics);
      if (sortedDiagnostics.length > 0) {
        return {
          published: false,
          diagnostics: {
            valid: false,
            diagnostics: sortedDiagnostics,
          },
        };
      }

      const validationSummary: ValidationResult = {
        valid: true,
        diagnostics: [],
      };

      const publishAttempt = yield* Effect.either(
        repo.publishDraftVersion({
          versionId: existing.id,
          publishedVersion: input.publishedVersion,
          actorId,
          validationSummary,
        }),
      );

      if (publishAttempt._tag === "Left") {
        const error = publishAttempt.left;
        const causeCode = error.code;

        if (causeCode === "PUBLISH_VERSION_ALREADY_EXISTS") {
          return {
            published: false,
            diagnostics: {
              valid: false,
              diagnostics: [
                makePublishDiagnostic(
                  "PUBLISH_VERSION_ALREADY_EXISTS",
                  "publish.versioning",
                  timestamp,
                  "unique published version per methodology",
                  input.publishedVersion,
                  "Choose the next available version and retry",
                ),
              ],
            },
          };
        }

        if (causeCode === "PUBLISH_CONCURRENT_WRITE_CONFLICT") {
          return {
            published: false,
            diagnostics: {
              valid: false,
              diagnostics: [
                makePublishDiagnostic(
                  "PUBLISH_CONCURRENT_WRITE_CONFLICT",
                  "publish.versioning",
                  timestamp,
                  "single-writer publish transaction",
                  "concurrent publish conflict",
                  "Re-fetch version state and retry",
                ),
              ],
            },
          };
        }

        if (causeCode === "PUBLISHED_CONTRACT_IMMUTABLE") {
          return {
            published: false,
            diagnostics: {
              valid: false,
              diagnostics: [
                makePublishDiagnostic(
                  "PUBLISHED_CONTRACT_IMMUTABLE",
                  "publish.immutability",
                  timestamp,
                  "draft status",
                  "status changed during publish",
                  "Edit a draft and publish a new version",
                ),
              ],
            },
          };
        }

        if (causeCode === "PUBLISH_ATOMICITY_GUARD_ABORTED") {
          return {
            published: false,
            diagnostics: {
              valid: false,
              diagnostics: [
                makePublishDiagnostic(
                  "PUBLISH_ATOMICITY_GUARD_ABORTED",
                  "publish.persistence",
                  timestamp,
                  "publish transaction commits snapshot + evidence atomically",
                  "atomicity guard aborted publish after detecting persistence failure",
                  "Investigate persistence failure and retry once guard conditions are resolved",
                ),
              ],
            },
          };
        }

        return yield* Effect.fail(error);
      }

      const published = publishAttempt.right;

      const evidence: PublicationEvidence = {
        actorId,
        timestamp: published.event.createdAt.toISOString(),
        sourceDraftRef: `draft:${existing.id}`,
        publishedVersion: input.publishedVersion,
        validationSummary,
        evidenceRef: published.event.id,
      };

      return {
        published: true,
        version: published.version,
        evidence,
        diagnostics: validationSummary,
      };
    });

  const getPublicationEvidence = (
    input: GetPublicationEvidenceInput,
  ): Effect.Effect<readonly PublicationEvidence[], RepositoryError> =>
    repo.getPublicationEvidence({ methodologyVersionId: input.methodologyVersionId });

  const pinProjectMethodologyVersion = (
    input: PinProjectMethodologyVersionInput,
    actorId: string | null,
  ): Effect.Effect<PinProjectMethodologyVersionResult, RepositoryError> =>
    Effect.gen(function* () {
      const timestamp = new Date().toISOString();
      const definition = yield* repo.findDefinitionByKey(input.methodologyKey);
      if (!definition) {
        return {
          pinned: false,
          diagnostics: {
            valid: false,
            diagnostics: [
              makeProjectPinDiagnostic(
                "PROJECT_PIN_TARGET_VERSION_NOT_FOUND",
                "project.pin.target",
                timestamp,
                "existing published methodology version",
                `${input.methodologyKey}@${input.publishedVersion}`,
                "Select an existing published version and retry",
              ),
            ],
          },
        };
      }

      const target = yield* repo.findVersionByMethodologyAndVersion(
        definition.id,
        input.publishedVersion,
      );

      if (!target) {
        return {
          pinned: false,
          diagnostics: {
            valid: false,
            diagnostics: [
              makeProjectPinDiagnostic(
                "PROJECT_PIN_TARGET_VERSION_NOT_FOUND",
                "project.pin.target",
                timestamp,
                "existing published methodology version",
                `${input.methodologyKey}@${input.publishedVersion}`,
                "Select an existing published version and retry",
              ),
            ],
          },
        };
      }

      if (target.status !== "active") {
        return {
          pinned: false,
          diagnostics: {
            valid: false,
            diagnostics: [
              makeProjectPinDiagnostic(
                "PROJECT_PIN_TARGET_VERSION_INCOMPATIBLE",
                "project.pin.target",
                timestamp,
                "active published methodology version",
                `${input.methodologyKey}@${input.publishedVersion} status=${target.status}`,
                "Select a compatible published version for the methodology",
              ),
            ],
          },
        };
      }

      const currentPin = yield* repo.findProjectPin(input.projectId);
      const pinWrite = yield* repo
        .pinProjectMethodologyVersion({
          projectId: input.projectId,
          methodologyVersionId: target.id,
          actorId,
          previousVersion: currentPin?.publishedVersion ?? null,
          newVersion: target.version,
        })
        .pipe(
          Effect.catchAll((error) => {
            if (error.code === "PROJECT_PIN_ATOMICITY_GUARD_ABORTED") {
              return Effect.succeed({
                pin: null,
                diagnostics: {
                  valid: false,
                  diagnostics: [
                    makeProjectPinDiagnostic(
                      "PROJECT_PIN_ATOMICITY_GUARD_ABORTED",
                      "project.pin.persistence",
                      timestamp,
                      "pin pointer and lineage event committed atomically",
                      "transaction aborted due to persistence guard",
                      "Investigate persistence failure and retry once resolved",
                    ),
                  ],
                },
              } as const);
            }
            return Effect.fail(error);
          }),
        );

      if ("diagnostics" in pinWrite) {
        return {
          pinned: false,
          diagnostics: pinWrite.diagnostics,
        };
      }

      return {
        pinned: true,
        diagnostics: { valid: true, diagnostics: [] },
        pin: toProjectPinState(pinWrite.pin),
      };
    });

  const repinProjectMethodologyVersion = (
    input: RepinProjectMethodologyVersionInput,
    actorId: string | null,
  ): Effect.Effect<RepinProjectMethodologyVersionResult, RepositoryError> =>
    Effect.gen(function* () {
      const timestamp = new Date().toISOString();
      const definition = yield* repo.findDefinitionByKey(input.methodologyKey);
      if (!definition) {
        return {
          repinned: false,
          diagnostics: {
            valid: false,
            diagnostics: [
              makeProjectPinDiagnostic(
                "PROJECT_PIN_TARGET_VERSION_NOT_FOUND",
                "project.pin.target",
                timestamp,
                "existing published methodology version",
                `${input.methodologyKey}@${input.publishedVersion}`,
                "Select an existing published version and retry",
              ),
            ],
          },
        };
      }

      const target = yield* repo.findVersionByMethodologyAndVersion(
        definition.id,
        input.publishedVersion,
      );

      if (!target) {
        return {
          repinned: false,
          diagnostics: {
            valid: false,
            diagnostics: [
              makeProjectPinDiagnostic(
                "PROJECT_PIN_TARGET_VERSION_NOT_FOUND",
                "project.pin.target",
                timestamp,
                "existing published methodology version",
                `${input.methodologyKey}@${input.publishedVersion}`,
                "Select an existing published version and retry",
              ),
            ],
          },
        };
      }

      if (target.status !== "active") {
        return {
          repinned: false,
          diagnostics: {
            valid: false,
            diagnostics: [
              makeProjectPinDiagnostic(
                "PROJECT_PIN_TARGET_VERSION_INCOMPATIBLE",
                "project.pin.target",
                timestamp,
                "active published methodology version",
                `${input.methodologyKey}@${input.publishedVersion} status=${target.status}`,
                "Select a compatible published version for the methodology",
              ),
            ],
          },
        };
      }

      const hasExecutions = yield* repo.hasPersistedExecutions(input.projectId);
      if (hasExecutions) {
        return {
          repinned: false,
          diagnostics: {
            valid: false,
            diagnostics: [
              makeProjectPinDiagnostic(
                "PROJECT_REPIN_BLOCKED_EXECUTION_HISTORY",
                "project.repin.policy",
                timestamp,
                "project without persisted executions",
                "persisted executions detected",
                "Use migration workflow when available in later epic scope",
              ),
            ],
          },
        };
      }

      const currentPin = yield* repo.findProjectPin(input.projectId);
      if (!currentPin) {
        return {
          repinned: false,
          diagnostics: {
            valid: false,
            diagnostics: [
              makeProjectPinDiagnostic(
                "PROJECT_REPIN_REQUIRES_EXISTING_PIN",
                "project.repin.policy",
                timestamp,
                "project with an existing pinned methodology version",
                "no current project methodology pin found",
                "Pin the project to a published version before attempting repin",
              ),
            ],
          },
        };
      }
      const repinWrite = yield* repo
        .repinProjectMethodologyVersion({
          projectId: input.projectId,
          methodologyVersionId: target.id,
          actorId,
          previousVersion: currentPin.publishedVersion,
          newVersion: target.version,
        })
        .pipe(
          Effect.catchAll((error) => {
            if (error.code === "PROJECT_REPIN_REQUIRES_EXISTING_PIN") {
              return Effect.succeed({
                pin: null,
                diagnostics: {
                  valid: false,
                  diagnostics: [
                    makeProjectPinDiagnostic(
                      "PROJECT_REPIN_REQUIRES_EXISTING_PIN",
                      "project.repin.policy",
                      timestamp,
                      "project with an existing pinned methodology version",
                      "no current project methodology pin found",
                      "Pin the project to a published version before attempting repin",
                    ),
                  ],
                },
              } as const);
            }
            if (error.code === "PROJECT_PIN_ATOMICITY_GUARD_ABORTED") {
              return Effect.succeed({
                pin: null,
                diagnostics: {
                  valid: false,
                  diagnostics: [
                    makeProjectPinDiagnostic(
                      "PROJECT_PIN_ATOMICITY_GUARD_ABORTED",
                      "project.pin.persistence",
                      timestamp,
                      "pin pointer and lineage event committed atomically",
                      "transaction aborted due to persistence guard",
                      "Investigate persistence failure and retry once resolved",
                    ),
                  ],
                },
              } as const);
            }
            return Effect.fail(error);
          }),
        );

      if ("diagnostics" in repinWrite) {
        return {
          repinned: false,
          diagnostics: repinWrite.diagnostics,
        };
      }

      return {
        repinned: true,
        diagnostics: { valid: true, diagnostics: [] },
        pin: toProjectPinState(repinWrite.pin),
      };
    });

  const getProjectPinLineage = (
    input: GetProjectPinLineageInput,
  ): Effect.Effect<readonly ProjectMethodologyPinEvent[], RepositoryError> =>
    repo
      .getProjectPinLineage({ projectId: input.projectId })
      .pipe(Effect.map((events) => events.map((event) => toProjectPinEvent(event))));

  const getProjectMethodologyPin = (
    projectId: string,
  ): Effect.Effect<ProjectMethodologyPinState | null, RepositoryError> =>
    repo.findProjectPin(projectId).pipe(Effect.map((pin) => (pin ? toProjectPinState(pin) : null)));

  const createMethodology = (
    methodologyKey: string,
    displayName: string,
  ): Effect.Effect<MethodologyDetails, RepositoryError> =>
    Effect.gen(function* () {
      const existing = yield* repo.findDefinitionByKey(methodologyKey);
      const definition = existing
        ? existing
        : yield* repo.createDefinition(methodologyKey, displayName);

      const versions = yield* repo.listVersionsByMethodologyId(definition.id);
      const orderedVersions = [...versions].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id),
      );

      return {
        methodologyId: definition.id,
        methodologyKey: definition.key,
        displayName: definition.name,
        descriptionJson: definition.descriptionJson,
        createdAt: definition.createdAt.toISOString(),
        updatedAt: definition.updatedAt.toISOString(),
        versions: orderedVersions.map((version) => ({
          id: version.id,
          version: version.version,
          status: version.status,
          displayName: version.displayName,
          createdAt: version.createdAt.toISOString(),
          retiredAt: version.retiredAt ? version.retiredAt.toISOString() : null,
        })),
      } satisfies MethodologyDetails;
    });

  const listMethodologies = (): Effect.Effect<readonly MethodologyCatalogItem[], RepositoryError> =>
    Effect.gen(function* () {
      const definitions = yield* repo.listDefinitions();
      const withSummary = yield* Effect.forEach(definitions, (definition) =>
        repo.listVersionsByMethodologyId(definition.id).pipe(
          Effect.map((versions) => {
            const orderedVersions = [...versions].sort(
              (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id),
            );
            const lastVersion = orderedVersions.at(-1);

            return {
              methodologyId: definition.id,
              methodologyKey: definition.key,
              displayName: definition.name,
              hasDraftVersion: orderedVersions.some((version) => version.status === "draft"),
              availableVersions: orderedVersions.length,
              updatedAt: (lastVersion?.createdAt ?? definition.updatedAt).toISOString(),
            } satisfies MethodologyCatalogItem;
          }),
        ),
      );

      return [...withSummary].sort((a, b) => {
        const updatedAtCompare = a.updatedAt.localeCompare(b.updatedAt);
        if (updatedAtCompare !== 0) {
          return updatedAtCompare;
        }
        return a.methodologyKey.localeCompare(b.methodologyKey);
      });
    });

  const getMethodologyDetails = (
    methodologyKey: string,
  ): Effect.Effect<MethodologyDetails | null, RepositoryError> =>
    Effect.gen(function* () {
      const definition = yield* repo.findDefinitionByKey(methodologyKey);
      if (!definition) {
        return null;
      }

      const versions = yield* repo.listVersionsByMethodologyId(definition.id);
      const orderedVersions = [...versions].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id),
      );

      return {
        methodologyId: definition.id,
        methodologyKey: definition.key,
        displayName: definition.name,
        descriptionJson: definition.descriptionJson,
        createdAt: definition.createdAt.toISOString(),
        updatedAt: definition.updatedAt.toISOString(),
        versions: orderedVersions.map((version) => ({
          id: version.id,
          version: version.version,
          status: version.status,
          displayName: version.displayName,
          createdAt: version.createdAt.toISOString(),
          retiredAt: version.retiredAt ? version.retiredAt.toISOString() : null,
        })),
      } satisfies MethodologyDetails;
    });

  const getPublishedContractByVersionAndWorkUnitType = (
    input: GetPublishedContractInput,
  ): Effect.Effect<PublishedContractQueryResult, VersionNotFoundError | RepositoryError> =>
    Effect.gen(function* () {
      const definition = yield* repo.findDefinitionByKey(input.methodologyKey);
      if (!definition) {
        return yield* Effect.fail(
          new VersionNotFoundError({
            versionId: `${input.methodologyKey}@${input.publishedVersion}`,
          }),
        );
      }

      const version = yield* repo.findVersionByMethodologyAndVersion(
        definition.id,
        input.publishedVersion,
      );
      if (!version) {
        return yield* Effect.fail(
          new VersionNotFoundError({
            versionId: `${input.methodologyKey}@${input.publishedVersion}`,
          }),
        );
      }

      const snapshot = yield* repo.findWorkflowSnapshot(version.id);
      const workflows = (snapshot.workflows ?? []).filter(
        (workflow) =>
          !workflow.workUnitTypeKey || workflow.workUnitTypeKey === input.workUnitTypeKey,
      );
      const workflowKeys = new Set(workflows.map((workflow) => workflow.key));
      const transitionEntries = Object.entries(snapshot.transitionWorkflowBindings ?? {}) as Array<
        [string, string[]]
      >;
      const filteredBindings = new Map<string, string[]>();
      for (const [transitionKey, boundWorkflowKeys] of transitionEntries) {
        const filtered = boundWorkflowKeys.filter((workflowKey) => workflowKeys.has(workflowKey));
        if (filtered.length > 0) {
          filteredBindings.set(transitionKey, filtered);
        }
      }
      const transitionWorkflowBindings = Object.fromEntries(
        [...filteredBindings.entries()].sort((a, b) => a[0].localeCompare(b[0])),
      ) as MethodologyVersionDefinition["transitionWorkflowBindings"];

      return {
        version,
        workflows,
        transitionWorkflowBindings,
      };
    });

  return MethodologyVersionService.of({
    createDraftVersion,
    updateDraftVersion,
    updateDraftWorkflows,
    validateDraftVersion: validateDraftVersionFn,
    getDraftLineage,
    publishDraftVersion,
    getPublicationEvidence,
    pinProjectMethodologyVersion,
    repinProjectMethodologyVersion,
    getProjectPinLineage,
    getProjectMethodologyPin,
    createMethodology,
    listMethodologies,
    getMethodologyDetails,
    getPublishedContractByVersionAndWorkUnitType,
  });
});
