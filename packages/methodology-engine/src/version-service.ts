import type {
  CreateDraftVersionInput,
  GetPublicationEvidenceInput,
  GetDraftLineageInput,
  MethodologyLinkTypeDefinitionInput,
  MethodologyVersionDefinition,
  PublishDraftVersionInput,
  PublicationEvidence,
  UpdateDraftVersionInput,
  ValidationDiagnostic,
  ValidateDraftVersionInput,
  ValidationResult,
} from "@chiron/contracts/methodology/version";
import type {
  CreateMethodologyDependencyDefinitionInput,
  DeleteMethodologyDependencyDefinitionInput,
  UpdateMethodologyDependencyDefinitionInput,
} from "@chiron/contracts/methodology/dependency";
import type {
  CreateMethodologyFactInput,
  DeleteMethodologyFactInput,
  MethodologyFactDefinitionInput,
  UpdateMethodologyFactInput,
} from "@chiron/contracts/methodology/fact";
import type { WorkUnitTypeDefinition } from "@chiron/contracts/methodology/lifecycle";
import { Context, Effect, Schema } from "effect";
import { MethodologyVersionDefinition as MethodologyVersionDefinitionSchema } from "@chiron/contracts/methodology/version";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";

import {
  DependencyDefinitionNotFoundError,
  DuplicateDependencyDefinitionError,
  MethodologyNotFoundError,
  DraftVersionAlreadyExistsError,
  DuplicateVersionError,
  RepositoryError,
  ValidationDecodeError,
  VersionNotDraftError,
  VersionNotFoundError,
} from "./errors";
import type { CreateDraftParams, UpdateDraftParams } from "./repository";
import type { MethodologyVersionEventRow, MethodologyVersionRow } from "./repository";
import { MethodologyRepository } from "./repository";
import { LifecycleRepository, type SaveLifecycleDefinitionParams } from "./lifecycle-repository";
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

export interface MethodologyCatalogDeleteResult {
  methodologyId: string;
  methodologyKey: string;
  archivedAt: string;
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

export interface UpdateVersionMetadataInput {
  versionId: string;
  version: string;
  displayName: string;
}

function flattenTransitionWorkflowBindingsByWorkUnit(
  scopedBindings: Record<string, Record<string, readonly string[]>>,
): MethodologyVersionDefinition["transitionWorkflowBindings"] {
  const flattened = new Map<string, string[]>();

  for (const transitionsByKey of Object.values(scopedBindings)) {
    for (const [transitionKey, workflowKeys] of Object.entries(transitionsByKey)) {
      const current = flattened.get(transitionKey) ?? [];
      const merged = new Set([...current, ...workflowKeys]);
      flattened.set(
        transitionKey,
        [...merged].sort((a, b) => a.localeCompare(b)),
      );
    }
  }

  return Object.fromEntries(
    [...flattened.entries()].sort((a, b) => a[0].localeCompare(b[0])),
  ) as MethodologyVersionDefinition["transitionWorkflowBindings"];
}

export interface ArchiveVersionInput {
  versionId: string;
}

export class MethodologyVersionService extends Context.Tag("MethodologyVersionService")<
  MethodologyVersionService,
  {
    readonly createDraftVersion: (
      input: CreateDraftVersionInput,
      actorId: string | null,
    ) => Effect.Effect<
      CreateDraftResult,
      | DraftVersionAlreadyExistsError
      | DuplicateVersionError
      | ValidationDecodeError
      | RepositoryError
    >;
    readonly updateDraftVersion: (
      input: UpdateDraftVersionInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
    readonly createFact: (
      input: CreateMethodologyFactInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
    readonly updateFact: (
      input: UpdateMethodologyFactInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
    readonly deleteFact: (
      input: DeleteMethodologyFactInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
    readonly createDependencyDefinition: (
      input: CreateMethodologyDependencyDefinitionInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftResult,
      | VersionNotFoundError
      | VersionNotDraftError
      | DuplicateDependencyDefinitionError
      | ValidationDecodeError
      | RepositoryError
    >;
    readonly updateDependencyDefinition: (
      input: UpdateMethodologyDependencyDefinitionInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftResult,
      | VersionNotFoundError
      | VersionNotDraftError
      | DependencyDefinitionNotFoundError
      | DuplicateDependencyDefinitionError
      | ValidationDecodeError
      | RepositoryError
    >;
    readonly deleteDependencyDefinition: (
      input: DeleteMethodologyDependencyDefinitionInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftResult,
      | VersionNotFoundError
      | VersionNotDraftError
      | DependencyDefinitionNotFoundError
      | ValidationDecodeError
      | RepositoryError
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
    readonly updateVersionMetadata: (
      input: UpdateVersionMetadataInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
    readonly archiveVersion: (
      input: ArchiveVersionInput,
      actorId: string | null,
    ) => Effect.Effect<MethodologyVersionRow, VersionNotFoundError | RepositoryError>;
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
    readonly createMethodology: (
      methodologyKey: string,
      displayName: string,
    ) => Effect.Effect<MethodologyDetails, RepositoryError>;
    readonly updateMethodology: (
      methodologyKey: string,
      displayName: string,
    ) => Effect.Effect<MethodologyDetails, MethodologyNotFoundError | RepositoryError>;
    readonly archiveMethodology: (
      methodologyKey: string,
    ) => Effect.Effect<MethodologyCatalogDeleteResult, MethodologyNotFoundError | RepositoryError>;
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

const ALLOWED_FACT_TYPES = new Set(["string", "number", "boolean", "json", "work_unit"]);

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

function mapFactDefinitionRowToInput(fact: {
  name: string | null;
  key: string;
  valueType: string;
  cardinality: string | null;
  descriptionJson: unknown;
  guidanceJson: unknown;
  defaultValueJson: unknown;
  validationJson: unknown;
}): MethodologyFactDefinitionInput {
  return {
    name: fact.name ?? undefined,
    key: fact.key,
    factType: fact.valueType as MethodologyFactDefinitionInput["factType"],
    cardinality: (fact.cardinality as "one" | "many" | null) ?? "one",
    description: fact.descriptionJson as MethodologyFactDefinitionInput["description"],
    guidance: fact.guidanceJson as MethodologyFactDefinitionInput["guidance"],
    defaultValue: fact.defaultValueJson,
    validation: fact.validationJson as MethodologyFactDefinitionInput["validation"],
  };
}

function mapLinkTypeDefinitionRowToInput(definition: {
  key: string;
  name: string | null;
  descriptionJson: unknown;
  guidanceJson: unknown;
}): MethodologyLinkTypeDefinitionInput {
  return {
    key: definition.key,
    name: definition.name ?? undefined,
    description:
      typeof definition.descriptionJson === "string" ? definition.descriptionJson : undefined,
    guidance: definition.guidanceJson as MethodologyLinkTypeDefinitionInput["guidance"],
  };
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

function validatePathDefault(
  value: unknown,
  config: {
    disallowAbsolute: boolean;
    preventTraversal: boolean;
    trimWhitespace: boolean;
  },
): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "string") {
    return "path validation requires a string default value";
  }

  const raw = config.trimWhitespace ? value.trim() : value;
  if (raw.length === 0) {
    return "path default must not be empty";
  }
  if (raw.includes("\0")) {
    return "path must not include null bytes";
  }

  const normalized = path.posix.normalize(raw);
  if (config.disallowAbsolute && path.posix.isAbsolute(normalized)) {
    return "absolute paths are disallowed";
  }
  if (config.preventTraversal && normalized.split("/").includes("..")) {
    return "path traversal segments ('..') are disallowed";
  }

  return null;
}

function isJsonSchemaCompatible(schema: unknown, value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (!schema || typeof schema !== "object") {
    return true;
  }

  const schemaRecord = schema as Record<string, unknown>;
  const typeDef = schemaRecord.type;
  if (typeDef === undefined) {
    return true;
  }
  const acceptedTypes = Array.isArray(typeDef) ? typeDef : [typeDef];
  const actualType =
    value === null
      ? "null"
      : Array.isArray(value)
        ? "array"
        : typeof value === "object"
          ? "object"
          : typeof value;
  return acceptedTypes.some((t) => t === actualType);
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

const ALLOWED_CARDINALITY = new Set(["one_per_project", "many_per_project"]);

function asCardinality(value: unknown): "one_per_project" | "many_per_project" {
  return typeof value === "string" && ALLOWED_CARDINALITY.has(value)
    ? (value as "one_per_project" | "many_per_project")
    : "one_per_project";
}

const ALLOWED_CANONICAL_FACT_TYPES = new Set(["string", "number", "boolean", "json", "work_unit"]);

function asCanonicalFactType(
  value: unknown,
): "string" | "number" | "boolean" | "json" | "work_unit" {
  if (value === "work unit") {
    return "work_unit";
  }

  return typeof value === "string" && ALLOWED_CANONICAL_FACT_TYPES.has(value)
    ? (value as "string" | "number" | "boolean" | "json" | "work_unit")
    : "string";
}

function extractText(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value !== "object" || value === null || !("text" in value)) {
    return null;
  }

  return typeof value.text === "string" ? value.text : null;
}

function asModelReference(value: unknown): { provider: string; model: string } | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.provider !== "string" || typeof record.model !== "string") {
    return undefined;
  }
  return { provider: record.provider, model: record.model };
}

function asStringArray(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.filter((entry): entry is string => typeof entry === "string");
}

function loadCanonicalLifecycleDefinition(
  versionId: string,
  lifecycleRepo: LifecycleRepository["Type"],
): Effect.Effect<
  {
    workUnitTypes: MethodologyVersionDefinition["workUnitTypes"];
    agentTypes: MethodologyVersionDefinition["agentTypes"];
    transitions: MethodologyVersionDefinition["transitions"];
  },
  RepositoryError
> {
  return Effect.gen(function* () {
    const [
      workUnitTypeRows,
      stateRows,
      transitionRows,
      factSchemaRows,
      conditionSetRows,
      agentRows,
    ] = yield* Effect.all([
      lifecycleRepo.findWorkUnitTypes(versionId),
      lifecycleRepo.findLifecycleStates(versionId),
      lifecycleRepo.findLifecycleTransitions(versionId),
      lifecycleRepo.findFactSchemas(versionId),
      lifecycleRepo.findTransitionConditionSets(versionId),
      lifecycleRepo.findAgentTypes(versionId),
    ]);

    const statesByWorkUnit = new Map<string, Array<(typeof stateRows)[number]>>();
    const stateKeyById = new Map<string, string>();
    for (const state of stateRows) {
      stateKeyById.set(state.id, state.key);
      const bucket = statesByWorkUnit.get(state.workUnitTypeId) ?? [];
      statesByWorkUnit.set(state.workUnitTypeId, [...bucket, state]);
    }

    const transitionsByWorkUnit = new Map<string, Array<(typeof transitionRows)[number]>>();
    const conditionSetsByTransition = new Map<string, Array<(typeof conditionSetRows)[number]>>();
    for (const transition of transitionRows) {
      const transitionBucket = transitionsByWorkUnit.get(transition.workUnitTypeId) ?? [];
      transitionsByWorkUnit.set(transition.workUnitTypeId, [...transitionBucket, transition]);

      conditionSetsByTransition.set(
        transition.id,
        conditionSetRows.filter((conditionSet) => conditionSet.transitionId === transition.id),
      );
    }

    const factsByWorkUnit = new Map<string, Array<(typeof factSchemaRows)[number]>>();
    for (const schema of factSchemaRows) {
      const bucket = factsByWorkUnit.get(schema.workUnitTypeId) ?? [];
      factsByWorkUnit.set(schema.workUnitTypeId, [...bucket, schema]);
    }

    const workUnitTypes = [...workUnitTypeRows]
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((workUnit) => {
        const states = [...(statesByWorkUnit.get(workUnit.id) ?? [])].sort((a, b) =>
          a.key.localeCompare(b.key),
        );
        const transitions = [...(transitionsByWorkUnit.get(workUnit.id) ?? [])].sort((a, b) =>
          a.transitionKey.localeCompare(b.transitionKey),
        );
        const factSchemas = [...(factsByWorkUnit.get(workUnit.id) ?? [])].sort((a, b) =>
          a.key.localeCompare(b.key),
        );

        return {
          key: workUnit.key,
          displayName: extractText(workUnit.displayName),
          description: extractText(workUnit.descriptionJson),
          guidance:
            (workUnit.guidanceJson as WorkUnitTypeDefinition["guidance"] | null) ?? undefined,
          cardinality: asCardinality(workUnit.cardinality),
          lifecycleStates: states.map((state) => ({
            key: state.key,
            displayName: extractText(state.displayName),
            description: extractText(state.descriptionJson),
          })),
          lifecycleTransitions: transitions.map((transition) => {
            const transitionConditionSets = (
              conditionSetsByTransition.get(transition.id) ?? []
            ).sort((a, b) => a.key.localeCompare(b.key));
            return {
              transitionKey: transition.transitionKey,
              fromState:
                transition.fromStateId && stateKeyById.has(transition.fromStateId)
                  ? (stateKeyById.get(transition.fromStateId) ?? "")
                  : "__absent__",
              toState: transition.toStateId ? (stateKeyById.get(transition.toStateId) ?? "") : "",
              conditionSets: transitionConditionSets.map((conditionSet) => ({
                key: conditionSet.key,
                phase: conditionSet.phase === "completion" ? "completion" : ("start" as const),
                mode: conditionSet.mode === "any" ? "any" : ("all" as const),
                groups: Array.isArray(conditionSet.groupsJson)
                  ? (conditionSet.groupsJson as Array<{
                      key: string;
                      mode: "all" | "any";
                      conditions: Array<{
                        kind: string;
                        required?: boolean;
                        config: unknown;
                        rationale?: string;
                      }>;
                    }>)
                  : [],
                guidance:
                  typeof conditionSet.guidanceJson === "string"
                    ? conditionSet.guidanceJson
                    : undefined,
              })),
            };
          }),
          factSchemas: factSchemas.map((fact) => ({
            name: extractText(fact.name),
            key: fact.key,
            factType: asCanonicalFactType(fact.factType),
            description: extractText(fact.description),
            defaultValue: fact.defaultValueJson,
            guidance: fact.guidanceJson,
            validation: fact.validationJson,
          })),
        };
      });

    const agentTypes = [...agentRows]
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((agent) => ({
        key: agent.key,
        displayName: extractText(agent.displayName),
        description: extractText(agent.description),
        persona: agent.persona,
        defaultModel: asModelReference(agent.defaultModelJson),
        mcpServers: asStringArray(agent.mcpServersJson),
        capabilities: asStringArray(agent.capabilitiesJson),
      }));

    const transitions = workUnitTypes.flatMap((workUnit) =>
      (workUnit.lifecycleTransitions ?? []).map((transition) => ({
        key: transition.transitionKey,
        transitionKey: transition.transitionKey,
        workUnitTypeKey: workUnit.key,
        fromState: transition.fromState,
        toState: transition.toState,
        conditionSets: transition.conditionSets,
      })),
    );

    return {
      workUnitTypes,
      agentTypes,
      transitions,
    };
  });
}

function resolveLifecycleDefinition(
  version: MethodologyVersionRow,
  lifecycleRepo: LifecycleRepository["Type"],
): Effect.Effect<
  {
    workUnitTypes: MethodologyVersionDefinition["workUnitTypes"];
    agentTypes: MethodologyVersionDefinition["agentTypes"];
    transitions: MethodologyVersionDefinition["transitions"];
  },
  RepositoryError
> {
  return loadCanonicalLifecycleDefinition(version.id, lifecycleRepo);
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
    if (!areSemanticallyEqual(prev[key], next[key])) {
      changes[key] = { from: prev[key], to: next[key] };
    }
  }
  return Object.keys(changes).length > 0 ? changes : null;
}

function normalizeUndefinedKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeUndefinedKeys(item));
  }

  if (value && typeof value === "object") {
    const normalized: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry !== undefined) {
        normalized[key] = normalizeUndefinedKeys(entry);
      }
    }
    return normalized;
  }

  return value;
}

const areSemanticallyEqual = (left: unknown, right: unknown): boolean =>
  isDeepStrictEqual(normalizeUndefinedKeys(left), normalizeUndefinedKeys(right));

const JsonUnknownSchema = Schema.parseJson(Schema.Unknown);
const encodeJsonForDiagnostic = (value: unknown): string =>
  value === undefined ? "undefined" : Schema.encodeSync(JsonUnknownSchema)(value);

function toDefinitionExtensions(definition: MethodologyVersionDefinition): unknown {
  return {
    guidance:
      definition.guidance?.global === undefined
        ? undefined
        : {
            global: definition.guidance.global,
          },
  };
}

function toCanonicalLifecycleSaveInput(
  definition: MethodologyVersionDefinition,
): Pick<SaveLifecycleDefinitionParams, "workUnitTypes" | "agentTypes"> {
  type MutableLifecycleState = { key: string; displayName?: string; description?: string };
  type MutableLifecycleTransition = {
    transitionKey: string;
    fromState?: string;
    toState: string;
    conditionSets: Array<
      SaveLifecycleDefinitionParams["workUnitTypes"][number]["lifecycleTransitions"][number]["conditionSets"][number]
    >;
  };
  type MutableFactSchema =
    SaveLifecycleDefinitionParams["workUnitTypes"][number]["factSchemas"][number];
  type MutableWorkUnitType = {
    key: string;
    displayName?: string;
    description?: string;
    guidance?: SaveLifecycleDefinitionParams["workUnitTypes"][number]["guidance"];
    cardinality: "one_per_project" | "many_per_project";
    lifecycleStates: MutableLifecycleState[];
    lifecycleTransitions: MutableLifecycleTransition[];
    factSchemas: MutableFactSchema[];
  };

  const workUnitInputs = Array.isArray(definition.workUnitTypes)
    ? (definition.workUnitTypes as Array<Record<string, unknown>>)
    : [];
  const transitionInputs = Array.isArray(definition.transitions)
    ? (definition.transitions as Array<Record<string, unknown>>)
    : [];

  const workUnitTypes: MutableWorkUnitType[] = workUnitInputs
    .filter((workUnit) => typeof workUnit.key === "string" && workUnit.key.length > 0)
    .map((workUnit) => {
      const displayName =
        typeof workUnit.displayName === "string" ? workUnit.displayName : undefined;
      const description =
        typeof workUnit.description === "string" ? workUnit.description : undefined;
      const guidance =
        workUnit.guidance && typeof workUnit.guidance === "object"
          ? (workUnit.guidance as MutableWorkUnitType["guidance"])
          : undefined;

      return {
        key: workUnit.key as string,
        ...(displayName !== undefined ? { displayName } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(guidance !== undefined ? { guidance } : {}),
        cardinality:
          workUnit.cardinality === "many_per_project" ? "many_per_project" : "one_per_project",
        lifecycleStates: Array.isArray(workUnit.lifecycleStates)
          ? (workUnit.lifecycleStates as MutableLifecycleState[])
          : [],
        lifecycleTransitions: Array.isArray(workUnit.lifecycleTransitions)
          ? (workUnit.lifecycleTransitions as MutableLifecycleTransition[])
          : [],
        factSchemas: Array.isArray(workUnit.factSchemas)
          ? (workUnit.factSchemas as MutableFactSchema[])
          : [],
      } satisfies MutableWorkUnitType;
    });

  const workUnitTypeByKey = new Map(workUnitTypes.map((workUnit) => [workUnit.key, workUnit]));

  const ensureWorkUnitType = (key: string) => {
    const existing = workUnitTypeByKey.get(key);
    if (existing) {
      return existing;
    }

    const created: MutableWorkUnitType = {
      key,
      cardinality: "one_per_project",
      lifecycleStates: [],
      lifecycleTransitions: [],
      factSchemas: [],
    };
    workUnitTypes.push(created);
    workUnitTypeByKey.set(key, created);
    return created;
  };

  const ensureState = (workUnitType: MutableWorkUnitType, stateKey: string) => {
    if (
      workUnitType.lifecycleStates.some(
        (state) =>
          state.key === stateKey || (stateKey === "__absent__" && state.key === "__absent__"),
      )
    ) {
      return;
    }
    if (stateKey === "__absent__") {
      return;
    }
    workUnitType.lifecycleStates.push({ key: stateKey });
  };

  for (const transition of transitionInputs) {
    const transitionKey =
      typeof transition.transitionKey === "string"
        ? transition.transitionKey
        : typeof transition.key === "string"
          ? transition.key
          : null;
    if (!transitionKey) {
      continue;
    }

    const inferredWorkUnitTypeKey = transitionKey.includes(":")
      ? (transitionKey.split(":", 1)[0] ?? null)
      : null;
    const workUnitTypeKey =
      (typeof transition.workUnitTypeKey === "string" ? transition.workUnitTypeKey : null) ??
      (typeof transition.workUnitType === "string" ? transition.workUnitType : null) ??
      inferredWorkUnitTypeKey ??
      workUnitTypes[0]?.key;

    if (!workUnitTypeKey) {
      continue;
    }

    const workUnitType = ensureWorkUnitType(workUnitTypeKey);
    const fromState =
      typeof transition.fromState === "string" ? transition.fromState : "__absent__";
    const toState = typeof transition.toState === "string" ? transition.toState : "done";

    ensureState(workUnitType, fromState);
    ensureState(workUnitType, toState);

    if (
      workUnitType.lifecycleTransitions.some(
        (candidate) => candidate.transitionKey === transitionKey,
      )
    ) {
      continue;
    }

    workUnitType.lifecycleTransitions.push({
      transitionKey,
      fromState,
      toState,
      conditionSets: Array.isArray(transition.conditionSets)
        ? (transition.conditionSets as MutableLifecycleTransition["conditionSets"])
        : [],
    });
  }

  return {
    workUnitTypes: workUnitTypes as SaveLifecycleDefinitionParams["workUnitTypes"],
    agentTypes: definition.agentTypes as SaveLifecycleDefinitionParams["agentTypes"],
  };
}

export const MethodologyVersionServiceLive = Effect.gen(function* () {
  const repo = yield* MethodologyRepository;
  const lifecycleRepo = yield* LifecycleRepository;

  const createDraftVersion = (
    input: CreateDraftVersionInput,
    actorId: string | null,
  ): Effect.Effect<
    CreateDraftResult,
    DraftVersionAlreadyExistsError | DuplicateVersionError | ValidationDecodeError | RepositoryError
  > =>
    Effect.gen(function* () {
      const definition = yield* decodeDefinition(input.definition);

      const existingDef = yield* repo.findDefinitionByKey(input.methodologyKey);

      if (existingDef) {
        const existingVersions = yield* repo.listVersionsByMethodologyId(existingDef.id);
        const existingDraft = existingVersions.find((version) => version.status === "draft");
        if (existingDraft) {
          return yield* new DraftVersionAlreadyExistsError({
            methodologyId: existingDef.id,
            versionId: existingDraft.id,
            existingVersion: existingDraft.version,
          });
        }

        const existingVersion = yield* repo.findVersionByMethodologyAndVersion(
          existingDef.id,
          input.version,
        );
        if (existingVersion) {
          return yield* new DuplicateVersionError({
            methodologyId: existingDef.id,
            version: input.version,
          });
        }
      }

      const timestamp = new Date().toISOString();
      const diagnostics = validateDraftDefinition(definition, timestamp);
      const lifecycleInput = toCanonicalLifecycleSaveInput(definition);

      const createDraftParams = {
        methodologyKey: input.methodologyKey,
        displayName: input.displayName,
        version: input.version,
        definitionExtensions: toDefinitionExtensions(definition),
        workflows: definition.workflows,
        transitionWorkflowBindings: definition.transitionWorkflowBindings,
        ...(definition.guidance !== undefined ? { guidance: definition.guidance } : {}),
        ...(input.factDefinitions !== undefined ? { factDefinitions: input.factDefinitions } : {}),
        ...(input.linkTypeDefinitions !== undefined
          ? { linkTypeDefinitions: input.linkTypeDefinitions }
          : {}),
        actorId,
        validationDiagnostics: diagnostics,
      } satisfies CreateDraftParams;

      const { version } = yield* repo.createDraft(createDraftParams);

      yield* lifecycleRepo.saveLifecycleDefinition({
        versionId: version.id,
        workUnitTypes: lifecycleInput.workUnitTypes,
        agentTypes: lifecycleInput.agentTypes,
        actorId,
        validationResult: diagnostics,
        changedFieldsJson: {
          lifecycle: {
            from: null,
            to: {
              workUnitTypes: definition.workUnitTypes,
              agentTypes: definition.agentTypes,
            },
          },
        },
      });

      return { version, diagnostics };
    });

  const updateDraftVersion = (
    input: UpdateDraftVersionInput,
    actorId: string | null,
    options?: {
      rewriteWorkflowGraph?: boolean;
    },
  ): Effect.Effect<
    UpdateDraftResult,
    VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
  > =>
    Effect.gen(function* () {
      const definition = yield* decodeDefinition(input.definition);

      const existing = yield* repo.findVersionById(input.versionId);
      if (!existing) {
        return yield* new VersionNotFoundError({ versionId: input.versionId });
      }
      yield* ensureVersionIsDraft(existing);

      const previousSnapshot = yield* repo.findWorkflowSnapshot(existing.id);
      const previousGuidance = previousSnapshot.guidance;

      const timestamp = new Date().toISOString();
      const diagnostics = validateDraftDefinition(definition, timestamp);
      const lifecycleInput = toCanonicalLifecycleSaveInput(definition);

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

      const workflowsChanged = !areSemanticallyEqual(
        previousSnapshot.workflows,
        definition.workflows,
      );
      const transitionBindingsChanged = !areSemanticallyEqual(
        previousSnapshot.transitionWorkflowBindings,
        definition.transitionWorkflowBindings,
      );
      const guidanceChanged = !areSemanticallyEqual(previousGuidance, definition.guidance);

      const updateDraftParams = {
        versionId: input.versionId,
        displayName: input.displayName,
        version: input.version,
        definitionExtensions: toDefinitionExtensions(definition),
        workflows: definition.workflows,
        rewriteWorkflowGraph: options?.rewriteWorkflowGraph ?? true,
        transitionWorkflowBindings: definition.transitionWorkflowBindings,
        ...(definition.guidance !== undefined ? { guidance: definition.guidance } : {}),
        ...(input.factDefinitions !== undefined ? { factDefinitions: input.factDefinitions } : {}),
        ...(input.linkTypeDefinitions !== undefined
          ? { linkTypeDefinitions: input.linkTypeDefinitions }
          : {}),
        actorId,
        changedFieldsJson,
        validationDiagnostics: diagnostics,
      } satisfies UpdateDraftParams;

      const { version } = yield* repo.updateDraft(updateDraftParams);

      yield* lifecycleRepo.saveLifecycleDefinition({
        versionId: input.versionId,
        workUnitTypes: lifecycleInput.workUnitTypes,
        agentTypes: lifecycleInput.agentTypes,
        actorId,
        validationResult: diagnostics,
        changedFieldsJson: {
          lifecycle: {
            from: null,
            to: {
              workUnitTypes: definition.workUnitTypes,
              agentTypes: definition.agentTypes,
            },
          },
        },
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
        return yield* new VersionNotFoundError({ versionId: input.versionId });
      }
      yield* ensureVersionIsDraft(existing);

      const snapshot = yield* repo.findWorkflowSnapshot(existing.id);
      const lifecycleDefinition = yield* resolveLifecycleDefinition(existing, lifecycleRepo);
      const definition: MethodologyVersionDefinition = {
        workUnitTypes: lifecycleDefinition.workUnitTypes,
        agentTypes: lifecycleDefinition.agentTypes,
        transitions: lifecycleDefinition.transitions,
        workflows: snapshot.workflows,
        transitionWorkflowBindings: flattenTransitionWorkflowBindingsByWorkUnit(
          snapshot.transitionWorkflowBindings,
        ),
        guidance: snapshot.guidance,
      };

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

  const updateVersionMetadata = (
    input: UpdateVersionMetadataInput,
    actorId: string | null,
  ): Effect.Effect<
    UpdateDraftResult,
    VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
  > =>
    Effect.gen(function* () {
      const existing = yield* repo.findVersionById(input.versionId);
      if (!existing) {
        return yield* new VersionNotFoundError({ versionId: input.versionId });
      }

      yield* ensureVersionIsDraft(existing);

      const snapshot = yield* repo.findWorkflowSnapshot(existing.id);
      const lifecycleDefinition = yield* resolveLifecycleDefinition(existing, lifecycleRepo);
      const factDefinitions = yield* repo.findFactDefinitionsByVersionId(existing.id);
      const linkTypeDefinitions = yield* repo.findLinkTypeDefinitionsByVersionId(existing.id);

      return yield* updateDraftVersion(
        {
          versionId: existing.id,
          displayName: input.displayName,
          version: input.version,
          definition: {
            workUnitTypes: lifecycleDefinition.workUnitTypes,
            agentTypes: lifecycleDefinition.agentTypes,
            transitions: lifecycleDefinition.transitions,
            workflows: snapshot.workflows,
            transitionWorkflowBindings: flattenTransitionWorkflowBindingsByWorkUnit(
              snapshot.transitionWorkflowBindings,
            ),
            guidance: snapshot.guidance,
          },
          factDefinitions: factDefinitions.map(mapFactDefinitionRowToInput),
          linkTypeDefinitions: linkTypeDefinitions.map(mapLinkTypeDefinitionRowToInput),
        },
        actorId,
      );
    });

  const archiveVersion = (
    input: ArchiveVersionInput,
    actorId: string | null,
  ): Effect.Effect<MethodologyVersionRow, VersionNotFoundError | RepositoryError> =>
    Effect.gen(function* () {
      const archived = yield* repo.archiveVersion(input.versionId);
      if (!archived) {
        return yield* new VersionNotFoundError({ versionId: input.versionId });
      }

      yield* repo.recordEvent({
        methodologyVersionId: archived.id,
        eventType: "deleted",
        actorId,
        changedFieldsJson: {
          status: {
            to: "archived",
          },
        },
        diagnosticsJson: null,
      });

      return archived;
    });

  const createFact = (
    input: CreateMethodologyFactInput,
    actorId: string | null,
  ): Effect.Effect<
    UpdateDraftResult,
    VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
  > =>
    Effect.gen(function* () {
      const existing = yield* repo.findVersionById(input.versionId);
      if (!existing) {
        return yield* new VersionNotFoundError({ versionId: input.versionId });
      }

      yield* ensureVersionIsDraft(existing);

      const snapshot = yield* repo.findWorkflowSnapshot(existing.id);
      const existingFacts = yield* repo.findFactDefinitionsByVersionId(existing.id);

      const lifecycleDefinition = yield* resolveLifecycleDefinition(existing, lifecycleRepo);

      return yield* updateDraftVersion(
        {
          versionId: existing.id,
          displayName: existing.displayName,
          version: existing.version,
          definition: {
            workUnitTypes: lifecycleDefinition.workUnitTypes,
            agentTypes: lifecycleDefinition.agentTypes,
            transitions: lifecycleDefinition.transitions,
            workflows: snapshot.workflows,
            transitionWorkflowBindings: flattenTransitionWorkflowBindingsByWorkUnit(
              snapshot.transitionWorkflowBindings,
            ),
            guidance: snapshot.guidance,
          },
          factDefinitions: [...existingFacts.map(mapFactDefinitionRowToInput), input.fact],
        },
        actorId,
        { rewriteWorkflowGraph: false },
      );
    });

  const updateFact = (
    input: UpdateMethodologyFactInput,
    actorId: string | null,
  ): Effect.Effect<
    UpdateDraftResult,
    VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
  > =>
    Effect.gen(function* () {
      const existing = yield* repo.findVersionById(input.versionId);
      if (!existing) {
        return yield* new VersionNotFoundError({ versionId: input.versionId });
      }

      yield* ensureVersionIsDraft(existing);

      const snapshot = yield* repo.findWorkflowSnapshot(existing.id);
      const existingFacts = yield* repo.findFactDefinitionsByVersionId(existing.id);

      const lifecycleDefinition = yield* resolveLifecycleDefinition(existing, lifecycleRepo);

      return yield* updateDraftVersion(
        {
          versionId: existing.id,
          displayName: existing.displayName,
          version: existing.version,
          definition: {
            workUnitTypes: lifecycleDefinition.workUnitTypes,
            agentTypes: lifecycleDefinition.agentTypes,
            transitions: lifecycleDefinition.transitions,
            workflows: snapshot.workflows,
            transitionWorkflowBindings: flattenTransitionWorkflowBindingsByWorkUnit(
              snapshot.transitionWorkflowBindings,
            ),
            guidance: snapshot.guidance,
          },
          factDefinitions: existingFacts.map((fact) =>
            fact.key === input.factKey ? input.fact : mapFactDefinitionRowToInput(fact),
          ),
        },
        actorId,
        { rewriteWorkflowGraph: false },
      );
    });

  const deleteFact = (
    input: DeleteMethodologyFactInput,
    actorId: string | null,
  ): Effect.Effect<
    UpdateDraftResult,
    VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
  > =>
    Effect.gen(function* () {
      const existing = yield* repo.findVersionById(input.versionId);
      if (!existing) {
        return yield* new VersionNotFoundError({ versionId: input.versionId });
      }

      yield* ensureVersionIsDraft(existing);

      const snapshot = yield* repo.findWorkflowSnapshot(existing.id);
      const existingFacts = yield* repo.findFactDefinitionsByVersionId(existing.id);

      const lifecycleDefinition = yield* resolveLifecycleDefinition(existing, lifecycleRepo);

      return yield* updateDraftVersion(
        {
          versionId: existing.id,
          displayName: existing.displayName,
          version: existing.version,
          definition: {
            workUnitTypes: lifecycleDefinition.workUnitTypes,
            agentTypes: lifecycleDefinition.agentTypes,
            transitions: lifecycleDefinition.transitions,
            workflows: snapshot.workflows,
            transitionWorkflowBindings: flattenTransitionWorkflowBindingsByWorkUnit(
              snapshot.transitionWorkflowBindings,
            ),
            guidance: snapshot.guidance,
          },
          factDefinitions: existingFacts
            .filter((fact) => fact.key !== input.factKey)
            .map(mapFactDefinitionRowToInput),
        },
        actorId,
        { rewriteWorkflowGraph: false },
      );
    });

  const createDependencyDefinition = (
    input: CreateMethodologyDependencyDefinitionInput,
    actorId: string | null,
  ): Effect.Effect<
    UpdateDraftResult,
    | VersionNotFoundError
    | VersionNotDraftError
    | DuplicateDependencyDefinitionError
    | ValidationDecodeError
    | RepositoryError
  > =>
    Effect.gen(function* () {
      const existing = yield* repo.findVersionById(input.versionId);
      if (!existing) {
        return yield* new VersionNotFoundError({ versionId: input.versionId });
      }

      yield* ensureVersionIsDraft(existing);

      const snapshot = yield* repo.findWorkflowSnapshot(existing.id);
      const lifecycleDefinition = yield* resolveLifecycleDefinition(existing, lifecycleRepo);
      const existingFacts = yield* repo.findFactDefinitionsByVersionId(existing.id);
      const existingLinkTypes = yield* repo.findLinkTypeDefinitionsByVersionId(existing.id);

      if (
        existingLinkTypes.some((definition) => definition.key === input.dependencyDefinition.key)
      ) {
        return yield* new DuplicateDependencyDefinitionError({
          versionId: existing.id,
          dependencyKey: input.dependencyDefinition.key,
        });
      }

      return yield* updateDraftVersion(
        {
          versionId: existing.id,
          displayName: existing.displayName,
          version: existing.version,
          definition: {
            workUnitTypes: lifecycleDefinition.workUnitTypes,
            agentTypes: lifecycleDefinition.agentTypes,
            transitions: lifecycleDefinition.transitions,
            workflows: snapshot.workflows,
            transitionWorkflowBindings: flattenTransitionWorkflowBindingsByWorkUnit(
              snapshot.transitionWorkflowBindings,
            ),
            guidance: snapshot.guidance,
          },
          factDefinitions: existingFacts.map(mapFactDefinitionRowToInput),
          linkTypeDefinitions: [
            ...existingLinkTypes.map(mapLinkTypeDefinitionRowToInput),
            input.dependencyDefinition,
          ],
        },
        actorId,
      );
    });

  const updateDependencyDefinition = (
    input: UpdateMethodologyDependencyDefinitionInput,
    actorId: string | null,
  ): Effect.Effect<
    UpdateDraftResult,
    | VersionNotFoundError
    | VersionNotDraftError
    | DependencyDefinitionNotFoundError
    | DuplicateDependencyDefinitionError
    | ValidationDecodeError
    | RepositoryError
  > =>
    Effect.gen(function* () {
      const existing = yield* repo.findVersionById(input.versionId);
      if (!existing) {
        return yield* new VersionNotFoundError({ versionId: input.versionId });
      }

      yield* ensureVersionIsDraft(existing);

      const snapshot = yield* repo.findWorkflowSnapshot(existing.id);
      const lifecycleDefinition = yield* resolveLifecycleDefinition(existing, lifecycleRepo);
      const existingFacts = yield* repo.findFactDefinitionsByVersionId(existing.id);
      const existingLinkTypes = yield* repo.findLinkTypeDefinitionsByVersionId(existing.id);

      if (!existingLinkTypes.some((definition) => definition.key === input.dependencyKey)) {
        return yield* new DependencyDefinitionNotFoundError({
          versionId: existing.id,
          dependencyKey: input.dependencyKey,
        });
      }

      if (
        input.dependencyDefinition.key !== input.dependencyKey &&
        existingLinkTypes.some((definition) => definition.key === input.dependencyDefinition.key)
      ) {
        return yield* new DuplicateDependencyDefinitionError({
          versionId: existing.id,
          dependencyKey: input.dependencyDefinition.key,
        });
      }

      return yield* updateDraftVersion(
        {
          versionId: existing.id,
          displayName: existing.displayName,
          version: existing.version,
          definition: {
            workUnitTypes: lifecycleDefinition.workUnitTypes,
            agentTypes: lifecycleDefinition.agentTypes,
            transitions: lifecycleDefinition.transitions,
            workflows: snapshot.workflows,
            transitionWorkflowBindings: flattenTransitionWorkflowBindingsByWorkUnit(
              snapshot.transitionWorkflowBindings,
            ),
            guidance: snapshot.guidance,
          },
          factDefinitions: existingFacts.map(mapFactDefinitionRowToInput),
          linkTypeDefinitions: existingLinkTypes.map((definition) =>
            definition.key === input.dependencyKey
              ? input.dependencyDefinition
              : mapLinkTypeDefinitionRowToInput(definition),
          ),
        },
        actorId,
      );
    });

  const deleteDependencyDefinition = (
    input: DeleteMethodologyDependencyDefinitionInput,
    actorId: string | null,
  ): Effect.Effect<
    UpdateDraftResult,
    | VersionNotFoundError
    | VersionNotDraftError
    | DependencyDefinitionNotFoundError
    | ValidationDecodeError
    | RepositoryError
  > =>
    Effect.gen(function* () {
      const existing = yield* repo.findVersionById(input.versionId);
      if (!existing) {
        return yield* new VersionNotFoundError({ versionId: input.versionId });
      }

      yield* ensureVersionIsDraft(existing);

      const snapshot = yield* repo.findWorkflowSnapshot(existing.id);
      const lifecycleDefinition = yield* resolveLifecycleDefinition(existing, lifecycleRepo);
      const existingFacts = yield* repo.findFactDefinitionsByVersionId(existing.id);
      const existingLinkTypes = yield* repo.findLinkTypeDefinitionsByVersionId(existing.id);

      if (!existingLinkTypes.some((definition) => definition.key === input.dependencyKey)) {
        return yield* new DependencyDefinitionNotFoundError({
          versionId: existing.id,
          dependencyKey: input.dependencyKey,
        });
      }

      return yield* updateDraftVersion(
        {
          versionId: existing.id,
          displayName: existing.displayName,
          version: existing.version,
          definition: {
            workUnitTypes: lifecycleDefinition.workUnitTypes,
            agentTypes: lifecycleDefinition.agentTypes,
            transitions: lifecycleDefinition.transitions,
            workflows: snapshot.workflows,
            transitionWorkflowBindings: flattenTransitionWorkflowBindingsByWorkUnit(
              snapshot.transitionWorkflowBindings,
            ),
            guidance: snapshot.guidance,
          },
          factDefinitions: existingFacts.map(mapFactDefinitionRowToInput),
          linkTypeDefinitions: existingLinkTypes
            .filter((definition) => definition.key !== input.dependencyKey)
            .map(mapLinkTypeDefinitionRowToInput),
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
        return yield* new VersionNotFoundError({ versionId: input.versionId });
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
      const lifecycleDefinition = yield* resolveLifecycleDefinition(existing, lifecycleRepo);
      const definition: MethodologyVersionDefinition = {
        workUnitTypes: lifecycleDefinition.workUnitTypes,
        agentTypes: lifecycleDefinition.agentTypes,
        transitions: lifecycleDefinition.transitions,
        workflows: snapshot.workflows,
        transitionWorkflowBindings: flattenTransitionWorkflowBindingsByWorkUnit(
          snapshot.transitionWorkflowBindings,
        ),
        guidance: snapshot.guidance,
      };

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
              "Use one of string, number, boolean, json, work_unit",
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
              `${fact.key}:${encodeJsonForDiagnostic(fact.defaultValueJson)}`,
              "Set a valid static default for the fact type",
            ),
          );
        }

        const validation =
          fact.validationJson && typeof fact.validationJson === "object"
            ? (fact.validationJson as {
                kind?: string;
                path?: {
                  normalization?: { trimWhitespace?: boolean };
                  safety?: { disallowAbsolute?: boolean; preventTraversal?: boolean };
                };
                schema?: unknown;
              })
            : null;

        if (validation?.kind === "path") {
          if (fact.factType !== "string") {
            diagnostics.push(
              makePublishDiagnostic(
                "PUBLISH_FACTS_V1_SCHEMA_INVALID",
                "publish.validation.facts",
                timestamp,
                "path validation only used with string factType",
                `${fact.key}:${fact.factType}`,
                "Set factType to string or remove path validation",
              ),
            );
          }

          const pathIssue = validatePathDefault(fact.defaultValueJson, {
            disallowAbsolute: validation.path?.safety?.disallowAbsolute ?? true,
            preventTraversal: validation.path?.safety?.preventTraversal ?? true,
            trimWhitespace: validation.path?.normalization?.trimWhitespace ?? true,
          });

          if (pathIssue) {
            diagnostics.push(
              makePublishDiagnostic(
                "PUBLISH_FACTS_V1_SCHEMA_INVALID",
                "publish.validation.facts",
                timestamp,
                "default path value compatible with normalization and safety policy",
                `${fact.key}:${String(fact.defaultValueJson)}`,
                pathIssue,
              ),
            );
          }
        }

        if (validation?.kind === "json-schema") {
          if (fact.factType !== "json") {
            diagnostics.push(
              makePublishDiagnostic(
                "PUBLISH_FACTS_V1_SCHEMA_INVALID",
                "publish.validation.facts",
                timestamp,
                "json-schema validation only used with json factType",
                `${fact.key}:${fact.factType}`,
                "Set factType to json or remove json-schema validation",
              ),
            );
          }

          const subSchema = (validation as { subSchema?: unknown }).subSchema;
          const hasNestedJsonSubFields =
            typeof subSchema === "object" &&
            subSchema !== null &&
            Array.isArray((subSchema as { fields?: unknown }).fields) &&
            (subSchema as { fields: unknown[] }).fields.some(
              (field) =>
                typeof field === "object" &&
                field !== null &&
                (field as { type?: unknown }).type === "json",
            );

          if (hasNestedJsonSubFields) {
            diagnostics.push(
              makePublishDiagnostic(
                "PUBLISH_FACTS_V1_SCHEMA_INVALID",
                "publish.validation.facts",
                timestamp,
                "json sub-schema fields limited to one level of primitive values",
                `${fact.key}:json-sub-schema`,
                "Change nested json field types to string, number, or boolean",
              ),
            );
          }

          if (!isJsonSchemaCompatible(validation.schema, fact.defaultValueJson)) {
            diagnostics.push(
              makePublishDiagnostic(
                "PUBLISH_FACTS_V1_SCHEMA_INVALID",
                "publish.validation.facts",
                timestamp,
                "json default compatible with configured schema",
                `${fact.key}:${encodeJsonForDiagnostic(fact.defaultValueJson)}`,
                "Adjust default value or schema",
              ),
            );
          }
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

        return yield* error;
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

  const updateMethodology = (
    methodologyKey: string,
    displayName: string,
  ): Effect.Effect<MethodologyDetails, MethodologyNotFoundError | RepositoryError> =>
    Effect.gen(function* () {
      const definition = yield* repo.updateDefinition(methodologyKey, displayName);
      if (!definition || definition.archivedAt) {
        return yield* new MethodologyNotFoundError({ key: methodologyKey });
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

  const archiveMethodology = (
    methodologyKey: string,
  ): Effect.Effect<MethodologyCatalogDeleteResult, MethodologyNotFoundError | RepositoryError> =>
    Effect.gen(function* () {
      const definition = yield* repo.archiveDefinition(methodologyKey);
      if (!definition?.archivedAt) {
        return yield* new MethodologyNotFoundError({ key: methodologyKey });
      }

      return {
        methodologyId: definition.id,
        methodologyKey: definition.key,
        archivedAt: definition.archivedAt.toISOString(),
      } satisfies MethodologyCatalogDeleteResult;
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
        return yield* new VersionNotFoundError({
          versionId: `${input.methodologyKey}@${input.publishedVersion}`,
        });
      }

      const version = yield* repo.findVersionByMethodologyAndVersion(
        definition.id,
        input.publishedVersion,
      );
      if (!version) {
        return yield* new VersionNotFoundError({
          versionId: `${input.methodologyKey}@${input.publishedVersion}`,
        });
      }

      const snapshot = yield* repo.findWorkflowSnapshot(version.id);
      const workflows = (snapshot.workflows ?? []).filter(
        (workflow) =>
          !workflow.workUnitTypeKey || workflow.workUnitTypeKey === input.workUnitTypeKey,
      );
      const workflowKeys = new Set(workflows.map((workflow) => workflow.key));
      const transitionEntries = Object.entries(
        snapshot.transitionWorkflowBindings?.[input.workUnitTypeKey] ?? {},
      ) as Array<[string, string[]]>;
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
    updateVersionMetadata,
    archiveVersion,
    createFact,
    updateFact,
    deleteFact,
    createDependencyDefinition,
    updateDependencyDefinition,
    deleteDependencyDefinition,
    validateDraftVersion: validateDraftVersionFn,
    getDraftLineage,
    publishDraftVersion,
    getPublicationEvidence,
    createMethodology,
    updateMethodology,
    archiveMethodology,
    listMethodologies,
    getMethodologyDetails,
    getPublishedContractByVersionAndWorkUnitType,
  });
});
