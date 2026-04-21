import type {
  CanonicalWorkflowContextFactDefinition,
  FactType,
  FactValidation,
  PathValidationConfig,
} from "@chiron/contracts/methodology/fact";
import type {
  RuntimeFactCrudError,
  RuntimeFactCrudVerb,
  RuntimeFactValidationError,
} from "@chiron/contracts/runtime/facts";
import {
  LifecycleRepository,
  MethodologyRepository,
  type FactSchemaRow,
  type MethodologyFactDefinitionRow,
} from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";
import { Context, Effect, Layer } from "effect";
import path from "node:path";

import { RepositoryError } from "../errors";
import { ExecutionReadRepository } from "../repositories/execution-read-repository";
import { ProjectFactRepository } from "../repositories/project-fact-repository";
import { ProjectWorkUnitRepository } from "../repositories/project-work-unit-repository";
import { WorkflowContextFactRepository } from "../repositories/workflow-context-fact-repository";
import { WorkUnitFactRepository } from "../repositories/work-unit-fact-repository";

type RuntimeManualFactCrudServiceError =
  | RepositoryError
  | RuntimeFactValidationError
  | RuntimeFactCrudError;

type RuntimeManualFactScope = "project" | "work_unit" | "workflow_context";

export interface RuntimeManualFactCrudResult {
  readonly scope: RuntimeManualFactScope;
  readonly factDefinitionId: string;
  readonly verb: RuntimeFactCrudVerb;
  readonly affectedCount: number;
  readonly affectedInstanceIds: readonly string[];
}

export interface NormalizeWorkflowContextFactValueInput {
  readonly projectId: string;
  readonly methodologyVersionId: string;
  readonly workflowWorkUnitTypeId: string;
  readonly definition: CanonicalWorkflowContextFactDefinition;
  readonly value: unknown;
}

export type RuntimeManualFactCrudInput =
  | {
      readonly scope: "project";
      readonly projectId: string;
      readonly factDefinitionId: string;
      readonly payload: unknown;
      readonly authoredByUserId?: string | null;
      readonly producedByTransitionExecutionId?: string | null;
      readonly producedByWorkflowExecutionId?: string | null;
    }
  | {
      readonly scope: "work_unit";
      readonly projectWorkUnitId: string;
      readonly factDefinitionId: string;
      readonly payload: unknown;
      readonly authoredByUserId?: string | null;
      readonly producedByTransitionExecutionId?: string | null;
      readonly producedByWorkflowExecutionId?: string | null;
    }
  | {
      readonly scope: "workflow_context";
      readonly projectId: string;
      readonly workflowExecutionId: string;
      readonly contextFactDefinitionId: string;
      readonly payload: unknown;
      readonly sourceStepExecutionId?: string | null;
    };

type PrimitiveDefinition = {
  readonly valueType: FactType;
  readonly validationJson: unknown;
};

const getWorkflowContextFactValueType = (
  definition: CanonicalWorkflowContextFactDefinition,
): FactType | undefined => {
  if ("type" in definition) {
    return definition.type;
  }

  if ("valueType" in definition) {
    return definition.valueType;
  }

  if (definition.kind === "work_unit_reference_fact") {
    return "work_unit";
  }

  return undefined;
};

type JsonSchemaValidation = Extract<FactValidation, { kind: "json-schema" }>;
const getJsonSubSchema = (validation: FactValidation) =>
  validation.kind === "json-schema" ? validation.subSchema : undefined;

type ParsedManualCrudPayload =
  | { readonly verb: "create"; readonly value: unknown }
  | { readonly verb: "update"; readonly instanceId: string; readonly value: unknown }
  | { readonly verb: "remove"; readonly instanceId: string }
  | { readonly verb: "delete" };

type ParsedRuntimeFactInstanceValue = {
  readonly instanceId: string;
  readonly value: unknown;
};

type ParsedWorkflowRefFactValue = {
  readonly workflowDefinitionId: string;
};

type ParsedArtifactSlotReferenceFactValue = {
  readonly slotDefinitionId: string;
  readonly artifactInstanceId: string;
};

type ParsedWorkUnitDraftSpecFactValue = {
  readonly workUnitDefinitionId: string;
  readonly factValues: readonly {
    workUnitFactDefinitionId: string;
    value: unknown;
  }[];
  readonly artifactValues: readonly {
    slotDefinitionId: string;
    relativePath?: string;
    sourceContextFactDefinitionId?: string;
    clear: boolean;
  }[];
};

type WorkUnitPersistedValue =
  | { readonly referencedProjectWorkUnitId: string; readonly valueJson?: unknown }
  | { readonly referencedProjectWorkUnitId?: null; readonly valueJson: unknown };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isJsonCompatible = (value: unknown): boolean => {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(isJsonCompatible);
  }

  if (isRecord(value)) {
    return Object.values(value).every(isJsonCompatible);
  }

  return false;
};

const normalizeFactType = (value: string | null | undefined): FactType => {
  switch (value) {
    case "string":
    case "number":
    case "boolean":
    case "json":
    case "work_unit":
      return value;
    default:
      return "json";
  }
};

const normalizeValidation = (value: unknown): FactValidation | null => {
  if (!isRecord(value) || typeof value.kind !== "string") {
    return null;
  }

  switch (value.kind) {
    case "none":
      return { kind: "none" };
    case "path":
      return isRecord(value.path)
        ? ({ kind: "path", path: value.path as PathValidationConfig } satisfies FactValidation)
        : null;
    case "allowed-values":
      return Array.isArray(value.values)
        ? ({ kind: "allowed-values", values: value.values } satisfies FactValidation)
        : null;
    case "json-schema":
      return {
        kind: "json-schema",
        schemaDialect:
          typeof value.schemaDialect === "string" && value.schemaDialect.length > 0
            ? value.schemaDialect
            : "draft-2020-12",
        schema: "schema" in value ? value.schema : undefined,
        ...(isRecord(value.subSchema) && value.subSchema.type === "object"
          ? { subSchema: value.subSchema as NonNullable<JsonSchemaValidation["subSchema"]> }
          : {}),
      } satisfies FactValidation;
    default:
      return null;
  }
};

const sameJson = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

const toValidationError = (
  factKind: CanonicalWorkflowContextFactDefinition["kind"],
  message: string,
) => ({ _tag: "RuntimeFactValidationError", factKind, message }) as RuntimeFactValidationError;

const toCrudError = (verb: RuntimeFactCrudVerb, message: string) =>
  ({ _tag: "RuntimeFactCrudError", verb, message }) as RuntimeFactCrudError;

const normalizePath = (raw: string, config: PathValidationConfig): string => {
  const trimmed = config.normalization.trimWhitespace ? raw.trim() : raw;
  const normalized =
    config.normalization.mode === "posix" ? path.posix.normalize(trimmed) : trimmed;

  if (config.safety.disallowAbsolute && path.posix.isAbsolute(normalized)) {
    throw new Error("Absolute paths are not allowed.");
  }

  if (config.safety.preventTraversal && normalized.split("/").some((segment) => segment === "..")) {
    throw new Error("Path traversal is not allowed.");
  }

  return normalized;
};

const getJsonValueType = (value: unknown): string => {
  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    return "array";
  }

  return typeof value === "object" ? "object" : typeof value;
};

const matchesJsonSchemaType = (value: unknown, schemaType: unknown): boolean => {
  const actualType = getJsonValueType(value);
  if (schemaType === "integer") {
    return typeof value === "number" && Number.isInteger(value);
  }
  return schemaType === actualType;
};

const validateJsonSchemaValue = (value: unknown, schemaValue: unknown): string | null => {
  if (!isRecord(schemaValue)) {
    return null;
  }

  if (
    Array.isArray(schemaValue.enum) &&
    !schemaValue.enum.some((entry) => sameJson(entry, value))
  ) {
    return "Value is not in the allowed enum set.";
  }

  const acceptedTypes = Array.isArray(schemaValue.type)
    ? schemaValue.type
    : schemaValue.type !== undefined
      ? [schemaValue.type]
      : [];

  if (
    acceptedTypes.length > 0 &&
    !acceptedTypes.some((schemaType) => matchesJsonSchemaType(value, schemaType))
  ) {
    return `Value must be ${acceptedTypes.map(String).join(" or ")}.`;
  }

  if (typeof value === "number") {
    if (typeof schemaValue.minimum === "number" && value < schemaValue.minimum) {
      return `Value must be greater than or equal to ${schemaValue.minimum}.`;
    }

    if (typeof schemaValue.maximum === "number" && value > schemaValue.maximum) {
      return `Value must be less than or equal to ${schemaValue.maximum}.`;
    }

    if (typeof schemaValue.exclusiveMinimum === "number" && value <= schemaValue.exclusiveMinimum) {
      return `Value must be greater than ${schemaValue.exclusiveMinimum}.`;
    }

    if (typeof schemaValue.exclusiveMaximum === "number" && value >= schemaValue.exclusiveMaximum) {
      return `Value must be less than ${schemaValue.exclusiveMaximum}.`;
    }
  }

  if (typeof value === "string") {
    if (typeof schemaValue.minLength === "number" && value.length < schemaValue.minLength) {
      return `Value must be at least ${schemaValue.minLength} characters.`;
    }

    if (typeof schemaValue.maxLength === "number" && value.length > schemaValue.maxLength) {
      return `Value must be at most ${schemaValue.maxLength} characters.`;
    }
  }

  if (Array.isArray(value)) {
    if (typeof schemaValue.minItems === "number" && value.length < schemaValue.minItems) {
      return `Value must contain at least ${schemaValue.minItems} item(s).`;
    }

    if (typeof schemaValue.maxItems === "number" && value.length > schemaValue.maxItems) {
      return `Value must contain at most ${schemaValue.maxItems} item(s).`;
    }

    if (schemaValue.items !== undefined) {
      for (const entry of value) {
        const itemError = validateJsonSchemaValue(entry, schemaValue.items);
        if (itemError) {
          return itemError;
        }
      }
    }
  }

  if (isRecord(value)) {
    const properties = isRecord(schemaValue.properties) ? schemaValue.properties : null;
    const requiredKeys = Array.isArray(schemaValue.required)
      ? schemaValue.required.filter((entry): entry is string => typeof entry === "string")
      : [];

    if (properties && schemaValue.additionalProperties === false) {
      const extraKeys = Object.keys(value).filter((key) => !(key in properties));
      if (extraKeys.length > 0) {
        return "Value must match the exact key-shape defined by the schema.";
      }
    }

    for (const requiredKey of requiredKeys) {
      if (!(requiredKey in value)) {
        return `Field '${requiredKey}' is required.`;
      }
    }

    if (properties) {
      for (const [key, propertySchema] of Object.entries(properties)) {
        if (!(key in value)) {
          continue;
        }

        const propertyError = validateJsonSchemaValue(value[key], propertySchema);
        if (propertyError) {
          return propertyError;
        }
      }
    }
  }

  return null;
};

const validateSubSchemaValue = (
  value: unknown,
  validation: NonNullable<JsonSchemaValidation["subSchema"]>,
): unknown => {
  if (!isRecord(value)) {
    throw new Error("Value must be an object.");
  }

  const normalized: Record<string, unknown> = { ...value };

  for (const field of validation.fields) {
    const fieldValue = normalized[field.key];

    if (field.cardinality === "many") {
      if (!Array.isArray(fieldValue)) {
        throw new Error(`Field '${field.key}' must be an array.`);
      }
      const allValid = fieldValue.every((entry) => typeof entry === field.type);
      if (!allValid) {
        throw new Error(`Field '${field.key}' contains an invalid value type.`);
      }
      continue;
    }

    if (fieldValue === undefined) {
      throw new Error(`Field '${field.key}' is required.`);
    }

    if (typeof fieldValue !== field.type) {
      throw new Error(`Field '${field.key}' must be a ${field.type}.`);
    }
  }

  return normalized;
};

const validateValueAgainstDefinition = (params: {
  readonly value: unknown;
  readonly definition: PrimitiveDefinition;
}): Effect.Effect<unknown, RuntimeFactCrudError> =>
  Effect.gen(function* () {
    const validation = normalizeValidation(params.definition.validationJson);

    let normalized = params.value;

    if (!isJsonCompatible(normalized)) {
      return yield* Effect.fail(toCrudError("create", "Value must be JSON-compatible."));
    }

    switch (params.definition.valueType) {
      case "string":
        if (typeof normalized !== "string") {
          return yield* Effect.fail(toCrudError("create", "Value must be a string."));
        }
        break;
      case "number":
        if (typeof normalized !== "number") {
          return yield* Effect.fail(toCrudError("create", "Value must be a number."));
        }
        break;
      case "boolean":
        if (typeof normalized !== "boolean") {
          return yield* Effect.fail(toCrudError("create", "Value must be a boolean."));
        }
        break;
      case "work_unit":
        if (
          typeof normalized !== "string" &&
          !(isRecord(normalized) && typeof normalized.projectWorkUnitId === "string")
        ) {
          return yield* Effect.fail(
            toCrudError(
              "create",
              "Work-unit references must be a projectWorkUnitId string or object.",
            ),
          );
        }
        break;
      case "json":
        break;
    }

    if (!validation || validation.kind === "none") {
      return normalized;
    }

    if (validation.kind === "allowed-values") {
      if (!validation.values.some((entry) => sameJson(entry, normalized))) {
        return yield* Effect.fail(toCrudError("create", "Value is not in the allowed set."));
      }
      return normalized;
    }

    if (validation.kind === "path") {
      if (typeof normalized !== "string") {
        return yield* Effect.fail(
          toCrudError("create", "Path validation requires a string value."),
        );
      }

      return yield* Effect.try({
        try: () => normalizePath(normalized, validation.path),
        catch: (error) =>
          toCrudError("create", error instanceof Error ? error.message : "Invalid path value."),
      });
    }

    const subSchema = getJsonSubSchema(validation);
    const schemaError = validateJsonSchemaValue(normalized, validation.schema);
    if (schemaError) {
      return yield* Effect.fail(toCrudError("create", schemaError));
    }

    if (subSchema?.type === "object") {
      return yield* Effect.try({
        try: () => validateSubSchemaValue(normalized, subSchema),
        catch: (error) =>
          toCrudError(
            "create",
            error instanceof Error ? error.message : "Value does not match the configured schema.",
          ),
      });
    }

    return normalized;
  });

const ensureCrudCompatible = <A>(
  verb: RuntimeFactCrudVerb,
  effect: Effect.Effect<A | null | undefined, RepositoryError>,
  missingMessage: string,
) =>
  effect.pipe(
    Effect.flatMap((result) =>
      result == null ? toCrudError(verb, missingMessage) : Effect.succeed(result),
    ),
  );

const parseManualCrudPayload = (
  payload: unknown,
): Effect.Effect<ParsedManualCrudPayload, RuntimeFactCrudError> => {
  if (!isRecord(payload) || typeof payload.verb !== "string") {
    return Effect.fail(toCrudError("create", "Manual runtime CRUD payload is invalid."));
  }

  switch (payload.verb) {
    case "create":
      return "value" in payload
        ? Effect.succeed({ verb: "create", value: payload.value })
        : Effect.fail(toCrudError("create", "Create payloads require a value."));
    case "update":
      return typeof payload.instanceId === "string" && "value" in payload
        ? Effect.succeed({ verb: "update", instanceId: payload.instanceId, value: payload.value })
        : Effect.fail(toCrudError("update", "Update payloads require instanceId and value."));
    case "remove":
      return typeof payload.instanceId === "string"
        ? Effect.succeed({ verb: "remove", instanceId: payload.instanceId })
        : Effect.fail(toCrudError("remove", "Remove payloads require instanceId."));
    case "delete":
      return Effect.succeed({ verb: "delete" });
    default:
      return Effect.fail(toCrudError("create", "Manual runtime CRUD payload is invalid."));
  }
};

const parseRuntimeFactInstanceValue = (
  value: unknown,
  factKind: CanonicalWorkflowContextFactDefinition["kind"],
): Effect.Effect<ParsedRuntimeFactInstanceValue, RuntimeFactValidationError> => {
  if (!isRecord(value) || typeof value.instanceId !== "string" || !("value" in value)) {
    return Effect.fail(
      toValidationError(factKind, "Bound facts require a { instanceId, value } payload."),
    );
  }

  return Effect.succeed({ instanceId: value.instanceId, value: value.value });
};

const parseWorkflowRefFactValue = (
  value: unknown,
  factKind: CanonicalWorkflowContextFactDefinition["kind"],
): Effect.Effect<ParsedWorkflowRefFactValue, RuntimeFactValidationError> => {
  if (!isRecord(value) || typeof value.workflowDefinitionId !== "string") {
    return Effect.fail(
      toValidationError(factKind, "Workflow reference facts require a workflowDefinitionId."),
    );
  }

  return Effect.succeed({ workflowDefinitionId: value.workflowDefinitionId });
};

const parseArtifactSlotReferenceFactValue = (
  value: unknown,
  factKind: CanonicalWorkflowContextFactDefinition["kind"],
): Effect.Effect<ParsedArtifactSlotReferenceFactValue, RuntimeFactValidationError> => {
  if (
    !isRecord(value) ||
    typeof value.slotDefinitionId !== "string" ||
    typeof value.artifactInstanceId !== "string"
  ) {
    return Effect.fail(
      toValidationError(
        factKind,
        "Artifact slot reference facts require slotDefinitionId and artifactInstanceId.",
      ),
    );
  }

  return Effect.succeed({
    slotDefinitionId: value.slotDefinitionId,
    artifactInstanceId: value.artifactInstanceId,
  });
};

const parseWorkUnitDraftSpecFactValue = (
  value: unknown,
  factKind: CanonicalWorkflowContextFactDefinition["kind"],
): Effect.Effect<ParsedWorkUnitDraftSpecFactValue, RuntimeFactValidationError> => {
  if (
    !isRecord(value) ||
    typeof value.workUnitDefinitionId !== "string" ||
    !Array.isArray(value.factValues) ||
    !Array.isArray(value.artifactValues)
  ) {
    return Effect.fail(
      toValidationError(
        factKind,
        "Work-unit draft spec facts require the canonical draft-spec payload.",
      ),
    );
  }

  const factValues = value.factValues.flatMap((entry) =>
    isRecord(entry) && typeof entry.workUnitFactDefinitionId === "string" && "value" in entry
      ? [{ workUnitFactDefinitionId: entry.workUnitFactDefinitionId, value: entry.value }]
      : [],
  );
  const artifactValues = value.artifactValues.flatMap((entry) =>
    isRecord(entry) && typeof entry.slotDefinitionId === "string"
      ? [
          {
            slotDefinitionId: entry.slotDefinitionId,
            ...(typeof entry.relativePath === "string" ? { relativePath: entry.relativePath } : {}),
            ...(typeof entry.sourceContextFactDefinitionId === "string"
              ? { sourceContextFactDefinitionId: entry.sourceContextFactDefinitionId }
              : {}),
            clear: entry.clear === true,
          },
        ]
      : [],
  );

  if (
    factValues.length !== value.factValues.length ||
    artifactValues.length !== value.artifactValues.length
  ) {
    return Effect.fail(
      toValidationError(
        factKind,
        "Work-unit draft spec facts require the canonical draft-spec payload.",
      ),
    );
  }

  return Effect.succeed({
    workUnitDefinitionId: value.workUnitDefinitionId,
    factValues,
    artifactValues,
  });
};

const normalizeDraftArtifactEntries = (
  value: unknown,
): ParsedWorkUnitDraftSpecFactValue["artifactValues"] => {
  if (typeof value === "string") {
    return [{ relativePath: value, clear: false, slotDefinitionId: "" }];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => normalizeDraftArtifactEntries(entry));
  }

  if (!isRecord(value)) {
    return [];
  }

  if (Array.isArray(value.files)) {
    return value.files.flatMap((entry) => normalizeDraftArtifactEntries(entry));
  }

  if (typeof value.relativePath === "string") {
    return [
      {
        relativePath: value.relativePath,
        ...(typeof value.sourceContextFactDefinitionId === "string"
          ? { sourceContextFactDefinitionId: value.sourceContextFactDefinitionId }
          : {}),
        clear: value.clear === true,
        slotDefinitionId: "",
      },
    ];
  }

  return [];
};

const toDraftSpecKeyedPayload = (params: {
  readonly value: unknown;
  readonly definition: Extract<
    CanonicalWorkflowContextFactDefinition,
    { kind: "work_unit_draft_spec_fact" }
  >;
  readonly selectedFactDefinitions: readonly { id: string; key: string }[];
  readonly selectedArtifactDefinitions: readonly { id: string; key: string }[];
}): Effect.Effect<ParsedWorkUnitDraftSpecFactValue, RuntimeFactValidationError> => {
  if (!isRecord(params.value)) {
    return Effect.fail(
      toValidationError(
        params.definition.kind,
        "Work-unit draft spec facts require a canonical payload or selected fact/artifact keys.",
      ),
    );
  }

  const selectedFactByKey = new Map(
    params.selectedFactDefinitions.map((definition) => [definition.key, definition.id] as const),
  );
  const selectedArtifactByKey = new Map(
    params.selectedArtifactDefinitions.map(
      (definition) => [definition.key, definition.id] as const,
    ),
  );

  const factValues: ParsedWorkUnitDraftSpecFactValue["factValues"] = [];
  const artifactValues: ParsedWorkUnitDraftSpecFactValue["artifactValues"] = [];
  const unexpectedKeys: string[] = [];

  for (const [key, entry] of Object.entries(params.value)) {
    const factDefinitionId = selectedFactByKey.get(key);
    if (factDefinitionId) {
      factValues.push({ workUnitFactDefinitionId: factDefinitionId, value: entry });
      continue;
    }

    const slotDefinitionId = selectedArtifactByKey.get(key);
    if (slotDefinitionId) {
      const normalizedEntries = normalizeDraftArtifactEntries(entry);
      if (normalizedEntries.length === 0) {
        return Effect.fail(
          toValidationError(
            params.definition.kind,
            `Artifact '${key}' must be a relative path string, an artifact entry, or a files array.`,
          ),
        );
      }

      artifactValues.push(
        ...normalizedEntries.map((artifactValue) => ({
          ...artifactValue,
          slotDefinitionId,
        })),
      );
      continue;
    }

    unexpectedKeys.push(key);
  }

  if (unexpectedKeys.length > 0) {
    return Effect.fail(
      toValidationError(
        params.definition.kind,
        `Draft spec contains unexpected key(s): ${unexpectedKeys.join(", ")}. Use only selected fact or artifact keys.`,
      ),
    );
  }

  return Effect.succeed({
    workUnitDefinitionId: params.definition.workUnitDefinitionId,
    factValues,
    artifactValues,
  });
};

const resolveBoundFactDefinition = (
  deps: {
    readonly methodologyRepo: Pick<MethodologyRepository["Type"], "findFactDefinitionsByVersionId">;
    readonly lifecycleRepo: Pick<LifecycleRepository["Type"], "findFactSchemas">;
  },
  params: {
    readonly methodologyVersionId: string;
    readonly workflowWorkUnitTypeId: string;
    readonly definition: Extract<CanonicalWorkflowContextFactDefinition, { kind: "bound_fact" }>;
  },
) =>
  Effect.gen(function* () {
    if (params.definition.valueType) {
      return {
        valueType: params.definition.valueType,
        validationJson: undefined,
      } satisfies PrimitiveDefinition;
    }

    const [projectDefinitions, workUnitDefinitions] = yield* Effect.all([
      deps.methodologyRepo.findFactDefinitionsByVersionId(params.methodologyVersionId),
      deps.lifecycleRepo.findFactSchemas(
        params.methodologyVersionId,
        params.workflowWorkUnitTypeId,
      ),
    ]);

    const projectDefinition = projectDefinitions.find(
      (candidate) =>
        candidate.id === params.definition.factDefinitionId ||
        candidate.key === params.definition.factDefinitionId,
    );
    if (projectDefinition) {
      return {
        valueType: normalizeFactType(projectDefinition.valueType),
        validationJson: projectDefinition.validationJson,
      } satisfies PrimitiveDefinition;
    }

    const workUnitDefinition = workUnitDefinitions.find(
      (candidate) =>
        candidate.id === params.definition.factDefinitionId ||
        candidate.key === params.definition.factDefinitionId,
    );
    if (workUnitDefinition) {
      return {
        valueType: normalizeFactType(workUnitDefinition.factType),
        validationJson: workUnitDefinition.validationJson,
      } satisfies PrimitiveDefinition;
    }

    return yield* Effect.fail(
      toCrudError(
        "create",
        `Bound fact '${params.definition.factDefinitionId}' could not be resolved.`,
      ),
    );
  });

export const normalizeWorkflowContextFactValue = (
  deps: {
    readonly methodologyRepo: Pick<
      MethodologyRepository["Type"],
      "findArtifactSlotsByWorkUnitType" | "findFactDefinitionsByVersionId"
    >;
    readonly lifecycleRepo: Pick<
      LifecycleRepository["Type"],
      "findFactSchemas" | "findWorkUnitTypes"
    >;
    readonly projectWorkUnitRepo: Pick<ProjectWorkUnitRepository["Type"], "getProjectWorkUnitById">;
  },
  params: NormalizeWorkflowContextFactValueInput,
): Effect.Effect<unknown, RuntimeManualFactCrudServiceError> =>
  Effect.gen(function* () {
    switch (params.definition.kind) {
      case "plain_fact":
      case "plain_value_fact":
        return yield* validateValueAgainstDefinition({
          value: params.value,
          definition: {
            valueType: normalizeFactType(
              getWorkflowContextFactValueType(params.definition) ?? "json",
            ),
            validationJson: params.definition.validationJson,
          },
        }).pipe(
          Effect.mapError((error) => toValidationError(params.definition.kind, error.message)),
        );
      case "bound_fact": {
        const envelope = yield* parseRuntimeFactInstanceValue(params.value, params.definition.kind);
        const boundDefinition = yield* resolveBoundFactDefinition(deps, {
          methodologyVersionId: params.methodologyVersionId,
          workflowWorkUnitTypeId: params.workflowWorkUnitTypeId,
          definition: params.definition,
        });
        const normalizedValue = yield* validateValueAgainstDefinition({
          value: envelope.value,
          definition: boundDefinition,
        }).pipe(
          Effect.mapError((error) => toValidationError(params.definition.kind, error.message)),
        );
        return { instanceId: envelope.instanceId, value: normalizedValue };
      }
      case "workflow_ref_fact": {
        const normalized = yield* parseWorkflowRefFactValue(params.value, params.definition.kind);
        if (
          params.definition.allowedWorkflowDefinitionIds.length > 0 &&
          !params.definition.allowedWorkflowDefinitionIds.includes(normalized.workflowDefinitionId)
        ) {
          return yield* Effect.fail(
            toValidationError(
              params.definition.kind,
              `Workflow '${normalized.workflowDefinitionId}' is not allowed for this fact.`,
            ),
          );
        }
        return normalized;
      }
      case "artifact_slot_reference_fact": {
        const normalized = yield* parseArtifactSlotReferenceFactValue(
          params.value,
          params.definition.kind,
        );
        if (normalized.slotDefinitionId !== params.definition.slotDefinitionId) {
          return yield* Effect.fail(
            toValidationError(
              params.definition.kind,
              `Artifact snapshot fact must target slot '${params.definition.slotDefinitionId}'.`,
            ),
          );
        }
        return normalized;
      }
      case "work_unit_reference_fact": {
        if (!isRecord(params.value) || typeof params.value.projectWorkUnitId !== "string") {
          return yield* Effect.fail(
            toValidationError(
              params.definition.kind,
              "Work-unit reference facts require a projectWorkUnitId.",
            ),
          );
        }

        const referencedWorkUnit = yield* deps.projectWorkUnitRepo.getProjectWorkUnitById(
          params.value.projectWorkUnitId,
        );
        if (!referencedWorkUnit || referencedWorkUnit.projectId !== params.projectId) {
          return yield* Effect.fail(
            toValidationError(
              params.definition.kind,
              `Referenced work unit '${params.value.projectWorkUnitId}' does not exist in the project.`,
            ),
          );
        }

        return { projectWorkUnitId: params.value.projectWorkUnitId };
      }
      case "work_unit_draft_spec_fact": {
        const targetWorkUnitType = (yield* deps.lifecycleRepo.findWorkUnitTypes(
          params.methodologyVersionId,
        )).find((candidate) => candidate.id === params.definition.workUnitDefinitionId);
        if (!targetWorkUnitType) {
          return yield* Effect.fail(
            toValidationError(
              params.definition.kind,
              `Draft spec target work unit '${params.definition.workUnitDefinitionId}' could not be resolved.`,
            ),
          );
        }

        const availableFactDefinitions = yield* deps.lifecycleRepo.findFactSchemas(
          params.methodologyVersionId,
        );
        const selectedFactIds = new Set(params.definition.selectedWorkUnitFactDefinitionIds);
        const selectedArtifactIds = new Set(params.definition.selectedArtifactSlotDefinitionIds);
        const selectedFactDefinitions = availableFactDefinitions
          .filter((definition) => selectedFactIds.has(definition.id))
          .map((definition) => ({ id: definition.id, key: definition.key }));
        const selectedArtifactDefinitions =
          (yield* deps.methodologyRepo.findArtifactSlotsByWorkUnitType({
            versionId: params.methodologyVersionId,
            workUnitTypeKey: targetWorkUnitType.key,
          }))
            .filter((definition) => selectedArtifactIds.has(definition.id))
            .map((definition) => ({ id: definition.id, key: definition.key }));

        const draftPayload =
          isRecord(params.value) &&
          typeof params.value.workUnitDefinitionId !== "string" &&
          !Array.isArray(params.value.factValues) &&
          !Array.isArray(params.value.artifactValues)
            ? yield* toDraftSpecKeyedPayload({
                value: params.value,
                definition: params.definition,
                selectedFactDefinitions,
                selectedArtifactDefinitions,
              })
            : yield* parseWorkUnitDraftSpecFactValue(params.value, params.definition.kind);

        if (draftPayload.workUnitDefinitionId !== params.definition.workUnitDefinitionId) {
          return yield* Effect.fail(
            toValidationError(
              params.definition.kind,
              `Draft spec must target work unit '${params.definition.workUnitDefinitionId}'.`,
            ),
          );
        }

        const factDefinitionsById = new Map(
          availableFactDefinitions.map((definition) => [definition.id, definition] as const),
        );

        const normalizedFactValues = yield* Effect.forEach(draftPayload.factValues, (factValue) =>
          Effect.gen(function* () {
            if (!selectedFactIds.has(factValue.workUnitFactDefinitionId)) {
              return yield* Effect.fail(
                toValidationError(
                  params.definition.kind,
                  `Work-unit fact '${factValue.workUnitFactDefinitionId}' is not selectable for this draft spec.`,
                ),
              );
            }

            const factDefinition = factDefinitionsById.get(factValue.workUnitFactDefinitionId);
            if (!factDefinition) {
              return yield* Effect.fail(
                toValidationError(
                  params.definition.kind,
                  `Work-unit fact '${factValue.workUnitFactDefinitionId}' could not be resolved.`,
                ),
              );
            }

            const value = yield* validateValueAgainstDefinition({
              value: factValue.value,
              definition: {
                valueType: normalizeFactType(factDefinition.factType),
                validationJson: factDefinition.validationJson,
              },
            }).pipe(
              Effect.mapError((error) => toValidationError(params.definition.kind, error.message)),
            );

            return {
              workUnitFactDefinitionId: factValue.workUnitFactDefinitionId,
              value,
            };
          }),
        );

        for (const artifactValue of draftPayload.artifactValues) {
          if (!selectedArtifactIds.has(artifactValue.slotDefinitionId)) {
            return yield* Effect.fail(
              toValidationError(
                params.definition.kind,
                `Artifact slot '${artifactValue.slotDefinitionId}' is not selectable for this draft spec.`,
              ),
            );
          }
        }

        return {
          ...draftPayload,
          factValues: normalizedFactValues,
        };
      }
    }
  });

export class RuntimeManualFactCrudService extends Context.Tag(
  "@chiron/workflow-engine/services/RuntimeManualFactCrudService",
)<
  RuntimeManualFactCrudService,
  {
    readonly normalizeWorkflowContextValue: (
      input: NormalizeWorkflowContextFactValueInput,
    ) => Effect.Effect<unknown, RuntimeManualFactCrudServiceError>;
    readonly apply: (
      input: RuntimeManualFactCrudInput,
    ) => Effect.Effect<RuntimeManualFactCrudResult, RuntimeManualFactCrudServiceError>;
  }
>() {}

export const RuntimeManualFactCrudServiceLive = Layer.effect(
  RuntimeManualFactCrudService,
  Effect.gen(function* () {
    const projectContextRepo = yield* ProjectContextRepository;
    const methodologyRepo = yield* MethodologyRepository;
    const lifecycleRepo = yield* LifecycleRepository;
    const projectFactRepo = yield* ProjectFactRepository;
    const workUnitFactRepo = yield* WorkUnitFactRepository;
    const workflowContextFactRepo = yield* WorkflowContextFactRepository;
    const projectWorkUnitRepo = yield* ProjectWorkUnitRepository;
    const executionReadRepo = yield* ExecutionReadRepository;

    const parsePayload = (payload: unknown) => parseManualCrudPayload(payload);

    const resolveProjectDefinition = (projectId: string, factDefinitionId: string) =>
      Effect.gen(function* () {
        const pin = yield* projectContextRepo.findProjectPin(projectId);
        if (!pin) {
          return yield* Effect.fail(toCrudError("create", "Project methodology pin is missing."));
        }

        const definitions = yield* methodologyRepo.findFactDefinitionsByVersionId(
          pin.methodologyVersionId,
        );
        const definition = definitions.find(
          (candidate) => candidate.id === factDefinitionId || candidate.key === factDefinitionId,
        );
        if (!definition) {
          return yield* Effect.fail(
            toCrudError("create", `Project fact '${factDefinitionId}' does not exist.`),
          );
        }

        return { pin, definition };
      });

    const resolveWorkUnitDefinition = (projectWorkUnitId: string, factDefinitionId: string) =>
      Effect.gen(function* () {
        const workUnit = yield* projectWorkUnitRepo.getProjectWorkUnitById(projectWorkUnitId);
        if (!workUnit) {
          return yield* Effect.fail(
            toCrudError("create", `Work unit '${projectWorkUnitId}' does not exist.`),
          );
        }

        const pin = yield* projectContextRepo.findProjectPin(workUnit.projectId);
        if (!pin) {
          return yield* Effect.fail(toCrudError("create", "Project methodology pin is missing."));
        }

        const definitions = yield* lifecycleRepo.findFactSchemas(
          pin.methodologyVersionId,
          workUnit.workUnitTypeId,
        );
        const definition = definitions.find(
          (candidate) => candidate.id === factDefinitionId || candidate.key === factDefinitionId,
        );
        if (!definition) {
          return yield* Effect.fail(
            toCrudError("create", `Work-unit fact '${factDefinitionId}' does not exist.`),
          );
        }

        return { pin, workUnit, definition };
      });

    const resolveWorkflowContextDefinition = (params: {
      readonly projectId: string;
      readonly workflowExecutionId: string;
      readonly contextFactDefinitionId: string;
    }) =>
      Effect.gen(function* () {
        const [workflowDetail, pin] = yield* Effect.all([
          executionReadRepo.getWorkflowExecutionDetail(params.workflowExecutionId),
          projectContextRepo.findProjectPin(params.projectId),
        ]);

        if (!workflowDetail || workflowDetail.projectId !== params.projectId) {
          return yield* Effect.fail(
            toCrudError("create", "Workflow execution does not belong to project."),
          );
        }
        if (!pin) {
          return yield* Effect.fail(toCrudError("create", "Project methodology pin is missing."));
        }

        const workUnitTypes = yield* lifecycleRepo.findWorkUnitTypes(pin.methodologyVersionId);
        const workUnitType = workUnitTypes.find(
          (candidate) => candidate.id === workflowDetail.workUnitTypeId,
        );
        if (!workUnitType) {
          return yield* Effect.fail(
            toCrudError("create", "Workflow work-unit type could not be resolved."),
          );
        }

        const editor = yield* methodologyRepo.getWorkflowEditorDefinition({
          versionId: pin.methodologyVersionId,
          workUnitTypeKey: workUnitType.key,
          workflowDefinitionId: workflowDetail.workflowExecution.workflowId,
        });

        const definition = editor.contextFacts.find(
          (candidate) =>
            candidate.contextFactDefinitionId === params.contextFactDefinitionId ||
            candidate.key === params.contextFactDefinitionId,
        );
        if (!definition || typeof definition.contextFactDefinitionId !== "string") {
          return yield* Effect.fail(
            toCrudError(
              "create",
              `Workflow-context fact '${params.contextFactDefinitionId}' does not exist.`,
            ),
          );
        }

        return { pin, workflowDetail, editor, workUnitType, definition };
      });

    const normalizeWorkUnitReference = (value: unknown) => {
      if (typeof value === "string") {
        return value;
      }
      if (isRecord(value) && typeof value.projectWorkUnitId === "string") {
        return value.projectWorkUnitId;
      }
      return null;
    };

    const validateWorkUnitReference = (projectId: string, value: unknown) =>
      Effect.gen(function* () {
        const referencedProjectWorkUnitId = normalizeWorkUnitReference(value);
        if (!referencedProjectWorkUnitId) {
          return yield* Effect.fail(
            toCrudError(
              "create",
              "Work-unit facts require a projectWorkUnitId string or object value.",
            ),
          );
        }

        const referenced = yield* projectWorkUnitRepo.getProjectWorkUnitById(
          referencedProjectWorkUnitId,
        );
        if (!referenced || referenced.projectId !== projectId) {
          return yield* Effect.fail(
            toCrudError(
              "create",
              `Referenced work unit '${referencedProjectWorkUnitId}' does not exist in the project.`,
            ),
          );
        }

        return referencedProjectWorkUnitId;
      });

    const normalizeProjectValue = (definition: MethodologyFactDefinitionRow, value: unknown) =>
      validateValueAgainstDefinition({
        value,
        definition: {
          valueType: normalizeFactType(definition.valueType),
          validationJson: definition.validationJson,
        },
      });

    const normalizeWorkUnitValue = (params: {
      readonly projectId: string;
      readonly definition: FactSchemaRow;
      readonly value: unknown;
    }): Effect.Effect<WorkUnitPersistedValue, RuntimeFactCrudError> =>
      Effect.gen(function* () {
        const valueType = normalizeFactType(params.definition.factType);
        if (valueType === "work_unit") {
          const referencedProjectWorkUnitId = yield* validateWorkUnitReference(
            params.projectId,
            params.value,
          ).pipe(Effect.mapError((error) => error as RuntimeFactCrudError));
          return { referencedProjectWorkUnitId, valueJson: null };
        }

        const normalized = yield* validateValueAgainstDefinition({
          value: params.value,
          definition: {
            valueType,
            validationJson: params.definition.validationJson,
          },
        });
        return { valueJson: normalized };
      });

    const normalizeWorkflowContextValue = (params: {
      readonly methodologyVersionId: string;
      readonly workflowWorkUnitTypeId: string;
      readonly definition: CanonicalWorkflowContextFactDefinition;
      readonly value: unknown;
    }): Effect.Effect<unknown, RuntimeManualFactCrudServiceError> =>
      Effect.gen(function* () {
        switch (params.definition.kind) {
          case "plain_fact":
          case "plain_value_fact":
            return yield* validateValueAgainstDefinition({
              value: params.value,
              definition: {
                valueType: normalizeFactType(
                  getWorkflowContextFactValueType(params.definition) ?? "json",
                ),
                validationJson: params.definition.validationJson,
              },
            }).pipe(
              Effect.mapError((error) => toValidationError(params.definition.kind, error.message)),
            );
          case "bound_fact": {
            const envelope = yield* parseRuntimeFactInstanceValue(
              params.value,
              params.definition.kind,
            );
            const boundDefinition = yield* resolveBoundFactDefinition({
              methodologyVersionId: params.methodologyVersionId,
              workflowWorkUnitTypeId: params.workflowWorkUnitTypeId,
              definition: params.definition,
            });
            const normalizedValue = yield* validateValueAgainstDefinition({
              value: envelope.value,
              definition: boundDefinition,
            }).pipe(
              Effect.mapError((error) => toValidationError(params.definition.kind, error.message)),
            );
            return { instanceId: envelope.instanceId, value: normalizedValue };
          }
          case "workflow_ref_fact": {
            const normalized = yield* parseWorkflowRefFactValue(
              params.value,
              params.definition.kind,
            );
            if (
              params.definition.allowedWorkflowDefinitionIds.length > 0 &&
              !params.definition.allowedWorkflowDefinitionIds.includes(
                normalized.workflowDefinitionId,
              )
            ) {
              return yield* Effect.fail(
                toValidationError(
                  params.definition.kind,
                  `Workflow '${normalized.workflowDefinitionId}' is not allowed for this fact.`,
                ),
              );
            }
            return normalized;
          }
          case "artifact_slot_reference_fact": {
            const normalized = yield* parseArtifactSlotReferenceFactValue(
              params.value,
              params.definition.kind,
            );
            if (normalized.slotDefinitionId !== params.definition.slotDefinitionId) {
              return yield* Effect.fail(
                toValidationError(
                  params.definition.kind,
                  `Artifact snapshot fact must target slot '${params.definition.slotDefinitionId}'.`,
                ),
              );
            }
            return normalized;
          }
          case "work_unit_reference_fact": {
            if (!isRecord(params.value) || typeof params.value.projectWorkUnitId !== "string") {
              return yield* Effect.fail(
                toValidationError(
                  params.definition.kind,
                  "Work-unit reference facts require a projectWorkUnitId.",
                ),
              );
            }
            return { projectWorkUnitId: params.value.projectWorkUnitId };
          }
          case "work_unit_draft_spec_fact": {
            const normalized = yield* parseWorkUnitDraftSpecFactValue(
              params.value,
              params.definition.kind,
            );
            if (normalized.workUnitDefinitionId !== params.definition.workUnitDefinitionId) {
              return yield* Effect.fail(
                toValidationError(
                  params.definition.kind,
                  `Draft spec must target work unit '${params.definition.workUnitDefinitionId}'.`,
                ),
              );
            }

            const selectedFactIds = new Set(params.definition.selectedWorkUnitFactDefinitionIds);
            const selectedArtifactIds = new Set(
              params.definition.selectedArtifactSlotDefinitionIds,
            );
            const availableFactDefinitions = yield* lifecycleRepo.findFactSchemas(
              params.methodologyVersionId,
            );
            const factDefinitionsById = new Map(
              availableFactDefinitions.map((definition) => [definition.id, definition] as const),
            );

            const normalizedFactValues = yield* Effect.forEach(normalized.factValues, (factValue) =>
              Effect.gen(function* () {
                if (!selectedFactIds.has(factValue.workUnitFactDefinitionId)) {
                  return yield* Effect.fail(
                    toValidationError(
                      params.definition.kind,
                      `Work-unit fact '${factValue.workUnitFactDefinitionId}' is not selectable for this draft spec.`,
                    ),
                  );
                }

                const factDefinition = factDefinitionsById.get(factValue.workUnitFactDefinitionId);
                if (!factDefinition) {
                  return yield* Effect.fail(
                    toValidationError(
                      params.definition.kind,
                      `Work-unit fact '${factValue.workUnitFactDefinitionId}' could not be resolved.`,
                    ),
                  );
                }

                const value = yield* validateValueAgainstDefinition({
                  value: factValue.value,
                  definition: {
                    valueType: normalizeFactType(factDefinition.factType),
                    validationJson: factDefinition.validationJson,
                  },
                }).pipe(
                  Effect.mapError((error) =>
                    toValidationError(params.definition.kind, error.message),
                  ),
                );

                return {
                  workUnitFactDefinitionId: factValue.workUnitFactDefinitionId,
                  value,
                };
              }),
            );

            for (const artifactValue of normalized.artifactValues) {
              if (!selectedArtifactIds.has(artifactValue.slotDefinitionId)) {
                return yield* Effect.fail(
                  toValidationError(
                    params.definition.kind,
                    `Artifact slot '${artifactValue.slotDefinitionId}' is not selectable for this draft spec.`,
                  ),
                );
              }
            }

            return {
              ...normalized,
              factValues: normalizedFactValues,
            };
          }
        }
      });

    const applyProjectCrud = (input: Extract<RuntimeManualFactCrudInput, { scope: "project" }>) =>
      Effect.gen(function* () {
        const payload = yield* parsePayload(input.payload);
        const { definition } = yield* resolveProjectDefinition(
          input.projectId,
          input.factDefinitionId,
        );
        const current = yield* projectFactRepo.getCurrentValuesByDefinition({
          projectId: input.projectId,
          factDefinitionId: definition.id,
        });

        switch (payload.verb) {
          case "create": {
            if (definition.cardinality !== "many" && current.length > 0) {
              return yield* Effect.fail(
                toCrudError(
                  payload.verb,
                  `Project fact '${definition.key}' already has a current value. Use update instead.`,
                ),
              );
            }
            const valueJson = yield* normalizeProjectValue(definition, payload.value);
            const created = yield* projectFactRepo.createFactInstance({
              projectId: input.projectId,
              factDefinitionId: definition.id,
              valueJson,
              authoredByUserId: input.authoredByUserId ?? null,
              producedByTransitionExecutionId: input.producedByTransitionExecutionId ?? null,
              producedByWorkflowExecutionId: input.producedByWorkflowExecutionId ?? null,
            });
            return {
              scope: input.scope,
              factDefinitionId: definition.id,
              verb: payload.verb,
              affectedCount: 1,
              affectedInstanceIds: [created.id],
            } satisfies RuntimeManualFactCrudResult;
          }
          case "update": {
            const currentRow = current.find((row) => row.id === payload.instanceId);
            if (!currentRow) {
              return yield* Effect.fail(
                toCrudError(
                  payload.verb,
                  `Project fact instance '${payload.instanceId}' does not exist.`,
                ),
              );
            }
            const valueJson = yield* normalizeProjectValue(definition, payload.value);
            const updated = projectFactRepo.updateFactInstance
              ? yield* ensureCrudCompatible(
                  payload.verb,
                  projectFactRepo.updateFactInstance({
                    projectFactInstanceId: payload.instanceId,
                    valueJson,
                    authoredByUserId: input.authoredByUserId ?? null,
                    producedByTransitionExecutionId: input.producedByTransitionExecutionId ?? null,
                    producedByWorkflowExecutionId: input.producedByWorkflowExecutionId ?? null,
                  }),
                  `Project fact instance '${payload.instanceId}' could not be updated.`,
                )
              : yield* Effect.gen(function* () {
                  const replacement = yield* projectFactRepo.createFactInstance({
                    projectId: input.projectId,
                    factDefinitionId: definition.id,
                    valueJson,
                    authoredByUserId: input.authoredByUserId ?? null,
                    producedByTransitionExecutionId: input.producedByTransitionExecutionId ?? null,
                    producedByWorkflowExecutionId: input.producedByWorkflowExecutionId ?? null,
                  });
                  yield* projectFactRepo.supersedeFactInstance({
                    projectFactInstanceId: payload.instanceId,
                    supersededByProjectFactInstanceId: replacement.id,
                  });
                  return replacement;
                });
            return {
              scope: input.scope,
              factDefinitionId: definition.id,
              verb: payload.verb,
              affectedCount: 1,
              affectedInstanceIds: [updated.id],
            } satisfies RuntimeManualFactCrudResult;
          }
          case "remove": {
            const currentRow = current.find((row) => row.id === payload.instanceId);
            if (!currentRow) {
              return yield* Effect.fail(
                toCrudError(
                  payload.verb,
                  `Project fact instance '${payload.instanceId}' does not exist.`,
                ),
              );
            }
            if (!projectFactRepo.logicallyDeleteFactInstance) {
              return yield* Effect.fail(
                toCrudError(payload.verb, "Project fact logical delete is not supported."),
              );
            }
            const deleted = yield* ensureCrudCompatible(
              payload.verb,
              projectFactRepo.logicallyDeleteFactInstance({
                projectFactInstanceId: payload.instanceId,
                authoredByUserId: input.authoredByUserId ?? null,
                producedByTransitionExecutionId: input.producedByTransitionExecutionId ?? null,
                producedByWorkflowExecutionId: input.producedByWorkflowExecutionId ?? null,
              }),
              `Project fact instance '${payload.instanceId}' could not be deleted.`,
            );
            return {
              scope: input.scope,
              factDefinitionId: definition.id,
              verb: payload.verb,
              affectedCount: 1,
              affectedInstanceIds: [deleted.id],
            } satisfies RuntimeManualFactCrudResult;
          }
          case "delete": {
            if (!projectFactRepo.logicallyDeleteFactInstance) {
              return yield* Effect.fail(
                toCrudError(payload.verb, "Project fact logical delete is not supported."),
              );
            }
            const deleted = yield* Effect.forEach(current, (row) =>
              ensureCrudCompatible(
                payload.verb,
                projectFactRepo.logicallyDeleteFactInstance!({
                  projectFactInstanceId: row.id,
                  authoredByUserId: input.authoredByUserId ?? null,
                  producedByTransitionExecutionId: input.producedByTransitionExecutionId ?? null,
                  producedByWorkflowExecutionId: input.producedByWorkflowExecutionId ?? null,
                }),
                `Project fact instance '${row.id}' could not be deleted.`,
              ),
            );
            return {
              scope: input.scope,
              factDefinitionId: definition.id,
              verb: payload.verb,
              affectedCount: deleted.length,
              affectedInstanceIds: deleted.map((row) => row.id),
            } satisfies RuntimeManualFactCrudResult;
          }
        }
      });

    const applyWorkUnitCrud = (
      input: Extract<RuntimeManualFactCrudInput, { scope: "work_unit" }>,
    ) =>
      Effect.gen(function* () {
        const payload = yield* parsePayload(input.payload);
        const { workUnit, definition } = yield* resolveWorkUnitDefinition(
          input.projectWorkUnitId,
          input.factDefinitionId,
        );
        const current = yield* workUnitFactRepo.getCurrentValuesByDefinition({
          projectWorkUnitId: input.projectWorkUnitId,
          factDefinitionId: definition.id,
        });

        switch (payload.verb) {
          case "create": {
            if (definition.cardinality !== "many" && current.length > 0) {
              return yield* Effect.fail(
                toCrudError(
                  payload.verb,
                  `Work-unit fact '${definition.key}' already has a current value. Use update instead.`,
                ),
              );
            }
            const persisted = yield* normalizeWorkUnitValue({
              projectId: workUnit.projectId,
              definition,
              value: payload.value,
            });
            const created = yield* workUnitFactRepo.createFactInstance({
              projectWorkUnitId: input.projectWorkUnitId,
              factDefinitionId: definition.id,
              valueJson: persisted.valueJson,
              referencedProjectWorkUnitId: persisted.referencedProjectWorkUnitId ?? null,
              authoredByUserId: input.authoredByUserId ?? null,
              producedByTransitionExecutionId: input.producedByTransitionExecutionId ?? null,
              producedByWorkflowExecutionId: input.producedByWorkflowExecutionId ?? null,
            });
            return {
              scope: input.scope,
              factDefinitionId: definition.id,
              verb: payload.verb,
              affectedCount: 1,
              affectedInstanceIds: [created.id],
            } satisfies RuntimeManualFactCrudResult;
          }
          case "update": {
            const currentRow = current.find((row) => row.id === payload.instanceId);
            if (!currentRow) {
              return yield* Effect.fail(
                toCrudError(
                  payload.verb,
                  `Work-unit fact instance '${payload.instanceId}' does not exist.`,
                ),
              );
            }
            const persisted = yield* normalizeWorkUnitValue({
              projectId: workUnit.projectId,
              definition,
              value: payload.value,
            });
            const updated = workUnitFactRepo.updateFactInstance
              ? yield* ensureCrudCompatible(
                  payload.verb,
                  workUnitFactRepo.updateFactInstance({
                    workUnitFactInstanceId: payload.instanceId,
                    valueJson: persisted.valueJson,
                    referencedProjectWorkUnitId: persisted.referencedProjectWorkUnitId ?? null,
                    authoredByUserId: input.authoredByUserId ?? null,
                    producedByTransitionExecutionId: input.producedByTransitionExecutionId ?? null,
                    producedByWorkflowExecutionId: input.producedByWorkflowExecutionId ?? null,
                  }),
                  `Work-unit fact instance '${payload.instanceId}' could not be updated.`,
                )
              : yield* Effect.gen(function* () {
                  const replacement = yield* workUnitFactRepo.createFactInstance({
                    projectWorkUnitId: input.projectWorkUnitId,
                    factDefinitionId: definition.id,
                    valueJson: persisted.valueJson,
                    referencedProjectWorkUnitId: persisted.referencedProjectWorkUnitId ?? null,
                    authoredByUserId: input.authoredByUserId ?? null,
                    producedByTransitionExecutionId: input.producedByTransitionExecutionId ?? null,
                    producedByWorkflowExecutionId: input.producedByWorkflowExecutionId ?? null,
                  });
                  yield* workUnitFactRepo.supersedeFactInstance({
                    workUnitFactInstanceId: payload.instanceId,
                    supersededByWorkUnitFactInstanceId: replacement.id,
                  });
                  return replacement;
                });
            return {
              scope: input.scope,
              factDefinitionId: definition.id,
              verb: payload.verb,
              affectedCount: 1,
              affectedInstanceIds: [updated.id],
            } satisfies RuntimeManualFactCrudResult;
          }
          case "remove": {
            const currentRow = current.find((row) => row.id === payload.instanceId);
            if (!currentRow) {
              return yield* Effect.fail(
                toCrudError(
                  payload.verb,
                  `Work-unit fact instance '${payload.instanceId}' does not exist.`,
                ),
              );
            }
            if (!workUnitFactRepo.logicallyDeleteFactInstance) {
              return yield* Effect.fail(
                toCrudError(payload.verb, "Work-unit fact logical delete is not supported."),
              );
            }
            const deleted = yield* ensureCrudCompatible(
              payload.verb,
              workUnitFactRepo.logicallyDeleteFactInstance({
                workUnitFactInstanceId: payload.instanceId,
                authoredByUserId: input.authoredByUserId ?? null,
                producedByTransitionExecutionId: input.producedByTransitionExecutionId ?? null,
                producedByWorkflowExecutionId: input.producedByWorkflowExecutionId ?? null,
              }),
              `Work-unit fact instance '${payload.instanceId}' could not be deleted.`,
            );
            return {
              scope: input.scope,
              factDefinitionId: definition.id,
              verb: payload.verb,
              affectedCount: 1,
              affectedInstanceIds: [deleted.id],
            } satisfies RuntimeManualFactCrudResult;
          }
          case "delete": {
            if (!workUnitFactRepo.logicallyDeleteFactInstance) {
              return yield* Effect.fail(
                toCrudError(payload.verb, "Work-unit fact logical delete is not supported."),
              );
            }
            const deleted = yield* Effect.forEach(current, (row) =>
              ensureCrudCompatible(
                payload.verb,
                workUnitFactRepo.logicallyDeleteFactInstance!({
                  workUnitFactInstanceId: row.id,
                  authoredByUserId: input.authoredByUserId ?? null,
                  producedByTransitionExecutionId: input.producedByTransitionExecutionId ?? null,
                  producedByWorkflowExecutionId: input.producedByWorkflowExecutionId ?? null,
                }),
                `Work-unit fact instance '${row.id}' could not be deleted.`,
              ),
            );
            return {
              scope: input.scope,
              factDefinitionId: definition.id,
              verb: payload.verb,
              affectedCount: deleted.length,
              affectedInstanceIds: deleted.map((row) => row.id),
            } satisfies RuntimeManualFactCrudResult;
          }
        }
      });

    const applyWorkflowContextCrud = (
      input: Extract<RuntimeManualFactCrudInput, { scope: "workflow_context" }>,
    ) =>
      Effect.gen(function* () {
        const payload = yield* parsePayload(input.payload);
        const { pin, workflowDetail, definition } = yield* resolveWorkflowContextDefinition({
          projectId: input.projectId,
          workflowExecutionId: input.workflowExecutionId,
          contextFactDefinitionId: input.contextFactDefinitionId,
        });
        const current = yield* workflowContextFactRepo.listCurrentFactValuesByDefinition({
          workflowExecutionId: input.workflowExecutionId,
          contextFactDefinitionId: definition.contextFactDefinitionId!,
        });

        const normalizeValue = (value: unknown) =>
          normalizeWorkflowContextFactValue(
            {
              methodologyRepo,
              lifecycleRepo,
              projectWorkUnitRepo,
            },
            {
              projectId: input.projectId,
              methodologyVersionId: pin.methodologyVersionId,
              workflowWorkUnitTypeId: workflowDetail.workUnitTypeId,
              definition,
              value,
            },
          );

        switch (payload.verb) {
          case "create": {
            if (definition.cardinality !== "many" && current.length > 0) {
              return yield* Effect.fail(
                toCrudError(
                  payload.verb,
                  `Workflow-context fact '${definition.key}' already has a current value. Use update instead.`,
                ),
              );
            }
            const valueJson = yield* normalizeValue(payload.value);
            const created = yield* workflowContextFactRepo.createFactValue({
              workflowExecutionId: input.workflowExecutionId,
              contextFactDefinitionId: definition.contextFactDefinitionId!,
              valueJson,
              sourceStepExecutionId: input.sourceStepExecutionId ?? null,
            });
            return {
              scope: input.scope,
              factDefinitionId: definition.contextFactDefinitionId!,
              verb: payload.verb,
              affectedCount: 1,
              affectedInstanceIds: [created.instanceId],
            } satisfies RuntimeManualFactCrudResult;
          }
          case "update": {
            const currentRow = current.find((row) => row.instanceId === payload.instanceId);
            if (!currentRow) {
              return yield* Effect.fail(
                toCrudError(
                  payload.verb,
                  `Workflow-context fact instance '${payload.instanceId}' does not exist.`,
                ),
              );
            }
            const valueJson = yield* normalizeValue(payload.value);
            const updated = yield* ensureCrudCompatible(
              payload.verb,
              workflowContextFactRepo.updateFactValue({
                workflowExecutionId: input.workflowExecutionId,
                contextFactDefinitionId: definition.contextFactDefinitionId!,
                instanceId: payload.instanceId,
                valueJson,
                sourceStepExecutionId: input.sourceStepExecutionId ?? null,
              }),
              `Workflow-context fact instance '${payload.instanceId}' could not be updated.`,
            );
            return {
              scope: input.scope,
              factDefinitionId: definition.contextFactDefinitionId!,
              verb: payload.verb,
              affectedCount: 1,
              affectedInstanceIds: [updated.instanceId],
            } satisfies RuntimeManualFactCrudResult;
          }
          case "remove": {
            const currentRow = current.find((row) => row.instanceId === payload.instanceId);
            if (!currentRow) {
              return yield* Effect.fail(
                toCrudError(
                  payload.verb,
                  `Workflow-context fact instance '${payload.instanceId}' does not exist.`,
                ),
              );
            }
            const removed = yield* workflowContextFactRepo.removeFactValue({
              workflowExecutionId: input.workflowExecutionId,
              contextFactDefinitionId: definition.contextFactDefinitionId!,
              instanceId: payload.instanceId,
              sourceStepExecutionId: input.sourceStepExecutionId ?? null,
            });
            if (!removed) {
              return yield* Effect.fail(
                toCrudError(
                  payload.verb,
                  `Workflow-context fact instance '${payload.instanceId}' could not be removed.`,
                ),
              );
            }
            return {
              scope: input.scope,
              factDefinitionId: definition.contextFactDefinitionId!,
              verb: payload.verb,
              affectedCount: 1,
              affectedInstanceIds: [payload.instanceId],
            } satisfies RuntimeManualFactCrudResult;
          }
          case "delete": {
            const deletedCount = yield* workflowContextFactRepo.deleteFactValues({
              workflowExecutionId: input.workflowExecutionId,
              contextFactDefinitionId: definition.contextFactDefinitionId!,
              sourceStepExecutionId: input.sourceStepExecutionId ?? null,
            });
            return {
              scope: input.scope,
              factDefinitionId: definition.contextFactDefinitionId!,
              verb: payload.verb,
              affectedCount: deletedCount,
              affectedInstanceIds: current.flatMap((row) =>
                typeof row.instanceId === "string" ? [row.instanceId] : [],
              ),
            } satisfies RuntimeManualFactCrudResult;
          }
        }
      });

    const apply = (input: RuntimeManualFactCrudInput) => {
      switch (input.scope) {
        case "project":
          return applyProjectCrud(input);
        case "work_unit":
          return applyWorkUnitCrud(input);
        case "workflow_context":
          return applyWorkflowContextCrud(input);
      }
    };

    const normalizeWorkflowContextValueForService = (
      input: NormalizeWorkflowContextFactValueInput,
    ) =>
      normalizeWorkflowContextFactValue(
        {
          methodologyRepo,
          lifecycleRepo,
          projectWorkUnitRepo,
        },
        input,
      );

    return RuntimeManualFactCrudService.of({
      normalizeWorkflowContextValue: normalizeWorkflowContextValueForService,
      apply,
    });
  }),
);
