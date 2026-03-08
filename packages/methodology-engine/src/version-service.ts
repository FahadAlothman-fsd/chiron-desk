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
import type { MethodologyVersionProjection } from "@chiron/contracts/methodology/projection";
import { Context, Effect, Schema } from "effect";
import { MethodologyVersionDefinition as MethodologyVersionDefinitionSchema } from "@chiron/contracts/methodology/version";
import path from "node:path";

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
  ProjectRow,
} from "./repository";
import { MethodologyRepository } from "./repository";
import { LifecycleRepository } from "./lifecycle-repository";
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

export interface ProjectSummary {
  id: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

const PROJECT_NAME_PREFIXES = [
  "Aegis",
  "Arcadian",
  "Astral",
  "Cinder",
  "Cobalt",
  "Eternal",
  "Golden",
  "Helios",
  "Iris",
  "Luminous",
  "Mythic",
  "Obsidian",
  "Orchid",
  "Radiant",
  "Silver",
  "Velvet",
] as const;

const PROJECT_NAME_CORE = [
  "Athena",
  "Apollo",
  "Artemis",
  "Atlas",
  "Freya",
  "Hermes",
  "Hyperion",
  "Icarus",
  "Nyx",
  "Orion",
  "Perseus",
  "Selene",
  "Skadi",
  "Thalia",
  "Tyr",
  "Zephyr",
] as const;

function hashProjectId(input: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function generateProjectDisplayName(projectId: string): string {
  const hash = hashProjectId(projectId);
  const prefix = PROJECT_NAME_PREFIXES[hash % PROJECT_NAME_PREFIXES.length] ?? "Mythic";
  const core =
    PROJECT_NAME_CORE[Math.floor(hash / PROJECT_NAME_PREFIXES.length) % PROJECT_NAME_CORE.length] ??
    "Atlas";
  const suffix = ((hash >>> 9) % 90) + 10;
  return `${prefix} ${core} ${suffix}`;
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
    readonly createProject: (
      projectId: string,
      name?: string,
    ) => Effect.Effect<ProjectSummary, RepositoryError>;
    readonly listProjects: () => Effect.Effect<readonly ProjectSummary[], RepositoryError>;
    readonly getProjectById: (
      projectId: string,
    ) => Effect.Effect<ProjectSummary | null, RepositoryError>;
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
    readonly getDraftProjection: (
      versionId: string,
    ) => Effect.Effect<
      MethodologyVersionProjection,
      VersionNotFoundError | ValidationDecodeError | RepositoryError
    >;
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

function toProjectSummary(project: ProjectRow): ProjectSummary {
  const normalizedName = project.name?.trim() ?? "";

  return {
    id: project.id,
    displayName:
      normalizedName.length > 0 ? normalizedName : generateProjectDisplayName(project.id),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  } satisfies ProjectSummary;
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

const ALLOWED_GATE_CLASSES = new Set(["start_gate", "completion_gate"]);

function asGateClass(value: unknown): "start_gate" | "completion_gate" {
  return typeof value === "string" && ALLOWED_GATE_CLASSES.has(value)
    ? (value as "start_gate" | "completion_gate")
    : "start_gate";
}

const ALLOWED_LINK_STRENGTH = new Set(["required", "optional"]);

function asLinkStrength(value: unknown): "required" | "optional" {
  return typeof value === "string" && ALLOWED_LINK_STRENGTH.has(value)
    ? (value as "required" | "optional")
    : "required";
}

const ALLOWED_CANONICAL_FACT_TYPES = new Set(["string", "number", "boolean", "json"]);

function asCanonicalFactType(value: unknown): "string" | "number" | "boolean" | "json" {
  return typeof value === "string" && ALLOWED_CANONICAL_FACT_TYPES.has(value)
    ? (value as "string" | "number" | "boolean" | "json")
    : "string";
}

function extractText(value: unknown): string | null {
  return typeof value === "string" ? value : null;
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
      requiredLinkRows,
      agentRows,
    ] = yield* Effect.all([
      lifecycleRepo.findWorkUnitTypes(versionId),
      lifecycleRepo.findLifecycleStates(versionId),
      lifecycleRepo.findLifecycleTransitions(versionId),
      lifecycleRepo.findFactSchemas(versionId),
      lifecycleRepo.findTransitionRequiredLinks(versionId),
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
    const requiredLinksByTransition = new Map<string, Array<(typeof requiredLinkRows)[number]>>();
    for (const transition of transitionRows) {
      const transitionBucket = transitionsByWorkUnit.get(transition.workUnitTypeId) ?? [];
      transitionsByWorkUnit.set(transition.workUnitTypeId, [...transitionBucket, transition]);

      requiredLinksByTransition.set(
        transition.id,
        requiredLinkRows.filter((link) => link.transitionId === transition.id),
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
          description: workUnit.descriptionJson,
          cardinality: asCardinality(workUnit.cardinality),
          lifecycleStates: states.map((state) => ({
            key: state.key,
            displayName: extractText(state.displayName),
            description: state.descriptionJson,
          })),
          lifecycleTransitions: transitions.map((transition) => ({
            transitionKey: transition.transitionKey,
            fromState:
              transition.fromStateId && stateKeyById.has(transition.fromStateId)
                ? (stateKeyById.get(transition.fromStateId) ?? "")
                : "__absent__",
            toState: stateKeyById.get(transition.toStateId) ?? "",
            gateClass: asGateClass(transition.gateClass),
            requiredLinks: (requiredLinksByTransition.get(transition.id) ?? [])
              .sort((a, b) => a.id.localeCompare(b.id))
              .map((link) => ({
                linkTypeKey: link.linkTypeKey,
                strength: asLinkStrength(link.strength),
                required: link.required,
              })),
          })),
          factSchemas: factSchemas.map((fact) => ({
            name: extractText(fact.name),
            key: fact.key,
            factType: asCanonicalFactType(fact.factType),
            required: fact.required,
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
        gateClass: transition.gateClass,
        requiredLinks: transition.requiredLinks,
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
    byWorkflow: {
      ...extensionGuidance?.byWorkflow,
      ...snapshotGuidance?.byWorkflow,
    },
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
      const previousGuidance = previousSnapshot.guidance;

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
      const lifecycleDefinition = yield* resolveLifecycleDefinition(existing, lifecycleRepo);
      const definition: MethodologyVersionDefinition = {
        workUnitTypes: lifecycleDefinition.workUnitTypes,
        agentTypes: lifecycleDefinition.agentTypes,
        transitions: lifecycleDefinition.transitions,
        workflows: snapshot.workflows,
        transitionWorkflowBindings: snapshot.transitionWorkflowBindings,
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

      const snapshot = yield* repo.findWorkflowSnapshot(existing.id);
      const lifecycleDefinition = yield* resolveLifecycleDefinition(existing, lifecycleRepo);

      const nextDefinition: MethodologyVersionDefinition = {
        workUnitTypes: lifecycleDefinition.workUnitTypes,
        agentTypes: lifecycleDefinition.agentTypes,
        transitions: lifecycleDefinition.transitions,
        workflows: input.workflows,
        transitionWorkflowBindings: input.transitionWorkflowBindings,
        guidance: mergeGuidance(snapshot.guidance, input.guidance),
      };

      return yield* updateDraftVersion(
        {
          versionId: input.versionId,
          displayName: existing.displayName,
          version: existing.version,
          definition: nextDefinition,
          factDefinitions: input.factDefinitions,
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
      const lifecycleDefinition = yield* resolveLifecycleDefinition(existing, lifecycleRepo);
      const definition: MethodologyVersionDefinition = {
        workUnitTypes: lifecycleDefinition.workUnitTypes,
        agentTypes: lifecycleDefinition.agentTypes,
        transitions: lifecycleDefinition.transitions,
        workflows: snapshot.workflows,
        transitionWorkflowBindings: snapshot.transitionWorkflowBindings,
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

          if (!isJsonSchemaCompatible(validation.schema, fact.defaultValueJson)) {
            diagnostics.push(
              makePublishDiagnostic(
                "PUBLISH_FACTS_V1_SCHEMA_INVALID",
                "publish.validation.facts",
                timestamp,
                "json default compatible with configured schema",
                `${fact.key}:${JSON.stringify(fact.defaultValueJson)}`,
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

  const createProject = (
    projectId: string,
    name?: string,
  ): Effect.Effect<ProjectSummary, RepositoryError> =>
    repo
      .createProject({ projectId, name })
      .pipe(Effect.map((project) => toProjectSummary(project)));

  const listProjects = (): Effect.Effect<readonly ProjectSummary[], RepositoryError> =>
    repo
      .listProjects()
      .pipe(Effect.map((projects) => projects.map((project) => toProjectSummary(project))));

  const getProjectById = (
    projectId: string,
  ): Effect.Effect<ProjectSummary | null, RepositoryError> =>
    repo
      .getProjectById({ projectId })
      .pipe(Effect.map((project) => (project ? toProjectSummary(project) : null)));

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

  const getDraftProjection = (
    versionId: string,
  ): Effect.Effect<
    MethodologyVersionProjection,
    VersionNotFoundError | ValidationDecodeError | RepositoryError
  > =>
    Effect.gen(function* () {
      const version = yield* repo.findVersionById(versionId);
      if (!version) {
        return yield* Effect.fail(new VersionNotFoundError({ versionId }));
      }

      const snapshot = yield* repo.findWorkflowSnapshot(version.id);
      const lifecycleDefinition = yield* resolveLifecycleDefinition(version, lifecycleRepo);
      const factDefinitionsRows = yield* repo.findFactDefinitionsByVersionId(version.id);
      const factDefinitions = factDefinitionsRows.map((fact) => ({
        name: fact.name,
        key: fact.key,
        factType: fact.valueType,
        required: fact.required,
        description: fact.descriptionJson,
        guidance: fact.guidanceJson,
        defaultValue: fact.defaultValueJson,
        validation: fact.validationJson,
      }));

      return {
        id: version.id,
        methodologyId: version.methodologyId,
        version: version.version,
        status: version.status as MethodologyVersionProjection["status"],
        displayName: version.displayName,
        workUnitTypes: lifecycleDefinition.workUnitTypes,
        agentTypes: lifecycleDefinition.agentTypes,
        transitions: lifecycleDefinition.transitions,
        workflows: snapshot.workflows,
        transitionWorkflowBindings: snapshot.transitionWorkflowBindings,
        guidance: snapshot.guidance,
        factDefinitions,
      } satisfies MethodologyVersionProjection;
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
    createProject,
    listProjects,
    getProjectById,
    createMethodology,
    listMethodologies,
    getMethodologyDetails,
    getDraftProjection,
    getPublishedContractByVersionAndWorkUnitType,
  });
});
