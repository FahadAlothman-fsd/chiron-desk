import type {
  LifecycleTransition,
  WorkUnitTypeDefinition,
} from "@chiron/contracts/methodology/lifecycle";
import path from "node:path";
import type { AgentTypeDefinition } from "@chiron/contracts/methodology/agent";
import type { ValidationDiagnostic, ValidationResult } from "@chiron/contracts/methodology/version";

function makeDiagnostic(
  fields: Omit<ValidationDiagnostic, "timestamp" | "evidenceRef"> & {
    evidenceRef?: string | null;
  },
  timestamp: string,
): ValidationDiagnostic {
  return {
    ...fields,
    timestamp,
    evidenceRef: fields.evidenceRef ?? null,
  };
}

// Allowed sets for methodology lifecycle contract validation.
const ALLOWED_CARDINALITY = new Set(["one_per_project", "many_per_project"]);
const ALLOWED_FACT_TYPES = new Set(["string", "number", "boolean", "json", "work_unit"]);
const ABSENT_STATE = "__absent__";

function isDefaultValueCompatible(factType: string, defaultValue: unknown): boolean {
  switch (factType) {
    case "string":
    case "work_unit":
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
  if (typeof value !== "string") {
    return "Path validation requires a string default value";
  }

  const raw = config.trimWhitespace ? value.trim() : value;
  if (raw.length === 0) {
    return "Path default must not be empty";
  }
  if (raw.includes("\0")) {
    return "Path must not include null bytes";
  }

  const normalized = path.posix.normalize(raw);
  if (config.disallowAbsolute && path.posix.isAbsolute(normalized)) {
    return "Absolute paths are not allowed by policy";
  }
  if (config.preventTraversal && normalized.split("/").includes("..")) {
    return "Path traversal segments ('..') are not allowed by policy";
  }

  return null;
}

function isJsonSchemaCompatible(schema: unknown, value: unknown): boolean {
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

/**
 * Validate a lifecycle definition for a methodology draft.
 * Returns deterministic diagnostics sorted by scope then code.
 * All 12 ACs from Story 1.2 are validated here.
 */
export function validateLifecycleDefinition(
  workUnitTypes: readonly WorkUnitTypeDefinition[],
  timestamp: string,
  _definedLinkTypeKeys?: readonly string[],
  agentTypes: readonly AgentTypeDefinition[] = [],
): ValidationResult {
  const diagnostics: ValidationDiagnostic[] = [];

  // AC 6: Validate cardinality values
  for (const [wutIndex, wut] of workUnitTypes.entries()) {
    if (!ALLOWED_CARDINALITY.has(wut.cardinality)) {
      diagnostics.push(
        makeDiagnostic(
          {
            code: "INVALID_CARDINALITY",
            scope: `workUnitTypes[${wutIndex}].cardinality`,
            blocking: true,
            required: `One of: ${Array.from(ALLOWED_CARDINALITY).join(", ")}`,
            observed: wut.cardinality,
            remediation: "Use 'one_per_project' or 'many_per_project'",
          },
          timestamp,
        ),
      );
    }
  }

  const workUnitTypeKeys = new Set<string>();
  for (const [wutIndex, wut] of workUnitTypes.entries()) {
    if (workUnitTypeKeys.has(wut.key)) {
      diagnostics.push(
        makeDiagnostic(
          {
            code: "DUPLICATE_WORK_UNIT_KEY",
            scope: `workUnitTypes[${wutIndex}].key`,
            blocking: true,
            required: "Unique work unit key within methodology version",
            observed: wut.key,
            remediation: `Rename work unit key '${wut.key}' to be unique`,
          },
          timestamp,
        ),
      );
    }
    workUnitTypeKeys.add(wut.key);
  }

  // AC 5: Check for duplicate state IDs within each work unit type
  for (const [wutIndex, wut] of workUnitTypes.entries()) {
    const stateKeys = new Set<string>();
    for (const [stateIndex, state] of wut.lifecycleStates.entries()) {
      if (stateKeys.has(state.key)) {
        diagnostics.push(
          makeDiagnostic(
            {
              code: "DUPLICATE_STATE_ID",
              scope: `workUnitTypes[${wutIndex}].lifecycleStates[${stateIndex}].key`,
              blocking: true,
              required: "Unique state key within work unit type",
              observed: state.key,
              remediation: `Rename state key '${state.key}' to be unique`,
            },
            timestamp,
          ),
        );
      }
      stateKeys.add(state.key);
    }
  }

  // AC 5: Check for duplicate transition keys within each work unit type
  for (const [wutIndex, wut] of workUnitTypes.entries()) {
    const transitionKeys = new Set<string>();
    for (const [transIndex, trans] of wut.lifecycleTransitions.entries()) {
      if (transitionKeys.has(trans.transitionKey)) {
        diagnostics.push(
          makeDiagnostic(
            {
              code: "DUPLICATE_TRANSITION_KEY",
              scope: `workUnitTypes[${wutIndex}].lifecycleTransitions[${transIndex}].transitionKey`,
              blocking: true,
              required: "Unique transition key within work unit type",
              observed: trans.transitionKey,
              remediation: `Rename transition key '${trans.transitionKey}' to be unique`,
            },
            timestamp,
          ),
        );
      }
      transitionKeys.add(trans.transitionKey);
    }
  }

  // AC 5: Check for undefined state references in transitions
  for (const [wutIndex, wut] of workUnitTypes.entries()) {
    const validStateKeys = new Set(wut.lifecycleStates.map((s) => s.key));
    validStateKeys.add(ABSENT_STATE); // __absent__ is always valid as pseudo-state

    for (const [transIndex, trans] of wut.lifecycleTransitions.entries()) {
      // Check fromState (optional, can be undefined/null which means __absent__)
      if (trans.fromState !== undefined && trans.fromState !== null) {
        if (!validStateKeys.has(trans.fromState)) {
          diagnostics.push(
            makeDiagnostic(
              {
                code: "UNDEFINED_FROM_STATE_REFERENCE",
                scope: `workUnitTypes[${wutIndex}].lifecycleTransitions[${transIndex}].fromState`,
                blocking: true,
                required: `Reference to defined state in work unit type '${wut.key}'`,
                observed: trans.fromState,
                remediation: `Add state '${trans.fromState}' to lifecycleStates or use null/undefined for __absent__`,
              },
              timestamp,
            ),
          );
        }
      }

      // Check toState (required, cannot be __absent__)
      if (!validStateKeys.has(trans.toState)) {
        diagnostics.push(
          makeDiagnostic(
            {
              code: "UNDEFINED_TO_STATE_REFERENCE",
              scope: `workUnitTypes[${wutIndex}].lifecycleTransitions[${transIndex}].toState`,
              blocking: true,
              required: `Reference to defined state in work unit type '${wut.key}'`,
              observed: trans.toState,
              remediation: `Add state '${trans.toState}' to lifecycleStates`,
            },
            timestamp,
          ),
        );
      }
    }
  }

  // AC 10: Reject defined_state -> __absent__ transitions
  for (const [wutIndex, wut] of workUnitTypes.entries()) {
    for (const [transIndex, trans] of wut.lifecycleTransitions.entries()) {
      if (trans.toState === ABSENT_STATE) {
        diagnostics.push(
          makeDiagnostic(
            {
              code: "INVALID_ABSENT_TRANSITION_DIRECTION",
              scope: `workUnitTypes[${wutIndex}].lifecycleTransitions[${transIndex}].toState`,
              blocking: true,
              required:
                "Target state cannot be __absent__ (activation is one-way: __absent__ -> defined)",
              observed: ABSENT_STATE,
              remediation:
                "Use a defined state as target, or use fromState=undefined for activation from __absent__",
            },
            timestamp,
          ),
        );
      }
    }
  }

  // AC 7: Validate fact schemas
  for (const [wutIndex, wut] of workUnitTypes.entries()) {
    const factKeys = new Set<string>();
    for (const [factIndex, fact] of wut.factSchemas.entries()) {
      // Check for duplicate fact keys
      if (factKeys.has(fact.key)) {
        diagnostics.push(
          makeDiagnostic(
            {
              code: "DUPLICATE_FACT_KEY",
              scope: `workUnitTypes[${wutIndex}].factSchemas[${factIndex}].key`,
              blocking: true,
              required: "Unique fact key within work unit type",
              observed: fact.key,
              remediation: `Rename fact key '${fact.key}' to be unique`,
            },
            timestamp,
          ),
        );
      }
      factKeys.add(fact.key);

      // Check for supported fact types
      if (!ALLOWED_FACT_TYPES.has(fact.factType)) {
        diagnostics.push(
          makeDiagnostic(
            {
              code: "UNSUPPORTED_FACT_TYPE",
              scope: `workUnitTypes[${wutIndex}].factSchemas[${factIndex}].factType`,
              blocking: true,
              required: `One of: ${Array.from(ALLOWED_FACT_TYPES).join(", ")}`,
              observed: fact.factType,
              remediation: "Use 'string', 'number', 'boolean', or 'json'",
            },
            timestamp,
          ),
        );
      }

      // Check for reserved key collisions (keys starting with underscore)
      if (fact.key.startsWith("_")) {
        diagnostics.push(
          makeDiagnostic(
            {
              code: "RESERVED_FACT_KEY",
              scope: `workUnitTypes[${wutIndex}].factSchemas[${factIndex}].key`,
              blocking: true,
              required: "Fact key must not start with underscore (reserved prefix)",
              observed: fact.key,
              remediation: "Remove leading underscore from fact key",
            },
            timestamp,
          ),
        );
      }

      // Validate default value compatibility with fact type
      if (
        fact.defaultValue !== undefined &&
        fact.defaultValue !== null &&
        !isDefaultValueCompatible(fact.factType, fact.defaultValue)
      ) {
        diagnostics.push(
          makeDiagnostic(
            {
              code: "INVALID_FACT_DEFAULT",
              scope: `workUnitTypes[${wutIndex}].factSchemas[${factIndex}].defaultValue`,
              blocking: true,
              required: `Default value compatible with fact type '${fact.factType}'`,
              observed: `${typeof fact.defaultValue} (value: ${JSON.stringify(fact.defaultValue)})`,
              remediation: `Provide a ${fact.factType} default value`,
            },
            timestamp,
          ),
        );
      }

      const validation = fact.validation;
      if (validation.kind === "path") {
        if (fact.factType !== "string") {
          diagnostics.push(
            makeDiagnostic(
              {
                code: "INVALID_PATH_VALIDATION_KIND",
                scope: `workUnitTypes[${wutIndex}].factSchemas[${factIndex}].validation.kind`,
                blocking: true,
                required: "Path validation is only valid when factType is 'string'",
                observed: `factType=${fact.factType}`,
                remediation: "Change factType to 'string' or remove path validation",
              },
              timestamp,
            ),
          );
        }

        if (fact.defaultValue !== undefined && fact.defaultValue !== null) {
          const pathIssue = validatePathDefault(fact.defaultValue, {
            disallowAbsolute: validation.path.safety.disallowAbsolute,
            preventTraversal: validation.path.safety.preventTraversal,
            trimWhitespace: validation.path.normalization.trimWhitespace,
          });
          if (pathIssue) {
            diagnostics.push(
              makeDiagnostic(
                {
                  code: "INVALID_PATH_DEFAULT",
                  scope: `workUnitTypes[${wutIndex}].factSchemas[${factIndex}].defaultValue`,
                  blocking: true,
                  required:
                    "Default path complies with configured path normalization and safety policy",
                  observed: String(fact.defaultValue),
                  remediation: pathIssue,
                },
                timestamp,
              ),
            );
          }
        }
      }

      if (validation.kind === "allowed-values") {
        const allowedValues = validation.values;
        if (
          fact.defaultValue !== undefined &&
          fact.defaultValue !== null &&
          !allowedValues.some((v: unknown) => v === fact.defaultValue)
        ) {
          diagnostics.push(
            makeDiagnostic(
              {
                code: "INVALID_ALLOWED_VALUES_DEFAULT",
                scope: `workUnitTypes[${wutIndex}].factSchemas[${factIndex}].defaultValue`,
                blocking: true,
                required: `Default value must be one of allowed values: ${JSON.stringify(allowedValues)}`,
                observed: JSON.stringify(fact.defaultValue),
                remediation: `Change defaultValue to one of the allowed values`,
              },
              timestamp,
            ),
          );
        }
      }

      if (validation.kind === "json-schema") {
        if (fact.factType !== "json") {
          diagnostics.push(
            makeDiagnostic(
              {
                code: "INVALID_JSON_SCHEMA_VALIDATION_KIND",
                scope: `workUnitTypes[${wutIndex}].factSchemas[${factIndex}].validation.kind`,
                blocking: true,
                required: "JSON-schema validation is only valid when factType is 'json'",
                observed: `factType=${fact.factType}`,
                remediation: "Change factType to 'json' or remove json-schema validation",
              },
              timestamp,
            ),
          );
        }

        if (
          fact.defaultValue !== undefined &&
          fact.defaultValue !== null &&
          !isJsonSchemaCompatible(validation.schema, fact.defaultValue)
        ) {
          diagnostics.push(
            makeDiagnostic(
              {
                code: "INVALID_JSON_SCHEMA_DEFAULT",
                scope: `workUnitTypes[${wutIndex}].factSchemas[${factIndex}].defaultValue`,
                blocking: true,
                required: "JSON default compatible with configured schema type",
                observed: JSON.stringify(fact.defaultValue),
                remediation: `Adjust default value or schemaDialect=${validation.schemaDialect}`,
              },
              timestamp,
            ),
          );
        }
      }
    }
  }

  // AC 1: Validate that work unit types can be defined (basic structure check)
  // This is implicitly validated by TypeScript, but we ensure empty arrays are warned
  for (const [wutIndex, wut] of workUnitTypes.entries()) {
    if (wut.lifecycleStates.length === 0) {
      diagnostics.push(
        makeDiagnostic(
          {
            code: "EMPTY_LIFECYCLE_STATES",
            scope: `workUnitTypes[${wutIndex}].lifecycleStates`,
            blocking: false, // Non-blocking warning
            required: "At least one lifecycle state for valid methodology",
            observed: "Empty array",
            remediation: "Add lifecycle states to define work unit behavior",
          },
          timestamp,
        ),
      );
    }
    if (wut.lifecycleTransitions.length === 0) {
      diagnostics.push(
        makeDiagnostic(
          {
            code: "EMPTY_LIFECYCLE_TRANSITIONS",
            scope: `workUnitTypes[${wutIndex}].lifecycleTransitions`,
            blocking: false, // Non-blocking warning
            required: "At least one transition for valid methodology",
            observed: "Empty array",
            remediation: "Add transitions to enable state changes",
          },
          timestamp,
        ),
      );
    }
  }

  const agentKeys = new Set<string>();
  for (const [agentIndex, agent] of agentTypes.entries()) {
    if (agentKeys.has(agent.key)) {
      diagnostics.push(
        makeDiagnostic(
          {
            code: "DUPLICATE_AGENT_TYPE_KEY",
            scope: `agentTypes[${agentIndex}].key`,
            blocking: true,
            required: "Unique agent type key within methodology version",
            observed: agent.key,
            remediation: `Rename agent key '${agent.key}' to be unique`,
          },
          timestamp,
        ),
      );
    }
    agentKeys.add(agent.key);

    if (agent.key.startsWith("_")) {
      diagnostics.push(
        makeDiagnostic(
          {
            code: "RESERVED_AGENT_TYPE_KEY",
            scope: `agentTypes[${agentIndex}].key`,
            blocking: true,
            required: "Agent key must not start with underscore",
            observed: agent.key,
            remediation: "Use a non-reserved agent key",
          },
          timestamp,
        ),
      );
    }

    if (agent.persona.trim().length === 0) {
      diagnostics.push(
        makeDiagnostic(
          {
            code: "EMPTY_AGENT_PERSONA",
            scope: `agentTypes[${agentIndex}].persona`,
            blocking: true,
            required: "Non-empty persona definition",
            observed: agent.persona,
            remediation: "Provide a persona template for this agent",
          },
          timestamp,
        ),
      );
    }

    if (agent.defaultModel) {
      const provider = agent.defaultModel.provider.trim();
      const model = agent.defaultModel.model.trim();
      if (provider.length === 0 || model.length === 0) {
        diagnostics.push(
          makeDiagnostic(
            {
              code: "INVALID_MODEL_REFERENCE",
              scope: `agentTypes[${agentIndex}].defaultModel`,
              blocking: true,
              required: "defaultModel.provider and defaultModel.model must be non-empty",
              observed: JSON.stringify(agent.defaultModel),
              remediation: "Provide both provider and model values",
            },
            timestamp,
          ),
        );
      }
    }
  }

  // Deterministic sort: by scope, then by code (AC 11 requirement)
  diagnostics.sort((a, b) => {
    const scopeCmp = a.scope.localeCompare(b.scope);
    if (scopeCmp !== 0) return scopeCmp;
    return a.code.localeCompare(b.code);
  });

  return {
    valid: diagnostics.filter((d) => d.blocking).length === 0,
    diagnostics,
  };
}

/**
 * Check if a transition is eligible from a given current state.
 * Returns deterministic eligibility metadata (AC 11).
 */
export function getEligibleTransitions(
  workUnitType: WorkUnitTypeDefinition,
  currentStateKey: string | null, // null means __absent__
): LifecycleTransition[] {
  return workUnitType.lifecycleTransitions.filter((t) => {
    // From __absent__: fromState is undefined/null
    if (currentStateKey === null || currentStateKey === ABSENT_STATE) {
      return t.fromState === undefined || t.fromState === null;
    }
    // From defined state: fromState matches current
    return t.fromState === currentStateKey;
  });
}
