import type {
  MethodologyVersionDefinition,
  ValidationDiagnostic,
  ValidationResult,
} from "@chiron/contracts/methodology/version";

function makeDiagnostic(
  fields: Omit<ValidationDiagnostic, "timestamp">,
  timestamp: string,
): ValidationDiagnostic {
  return { ...fields, timestamp };
}

/**
 * Validate a methodology version definition and return deterministic diagnostics.
 * Accepts an explicit `timestamp` so that equivalent inputs always produce
 * identical output (no internal clock dependency).
 */
export function validateDraftDefinition(
  definition: MethodologyVersionDefinition,
  timestamp: string,
): ValidationResult {
  const diagnostics: ValidationDiagnostic[] = [];
  if (definition.workUnitTypes.length === 0) {
    diagnostics.push(
      makeDiagnostic(
        {
          code: "EMPTY_WORK_UNIT_TYPES",
          scope: "definition.workUnitTypes",
          blocking: true,
          required: "At least one work unit type for a publishable methodology",
          observed: "Empty array",
          remediation:
            "Add work unit type definitions before publishing (not required for draft save)",
        },
        timestamp,
      ),
    );
  }
  if (definition.transitions.length === 0) {
    diagnostics.push(
      makeDiagnostic(
        {
          code: "EMPTY_TRANSITIONS",
          scope: "definition.transitions",
          blocking: true,
          required: "At least one transition for a publishable methodology",
          observed: "Empty array",
          remediation: "Add transition definitions before publishing (not required for draft save)",
        },
        timestamp,
      ),
    );
  }
  const transitionKeys = new Set(
    definition.transitions
      .filter((t): t is Record<string, unknown> => t !== null && typeof t === "object")
      .map((t) => (typeof t.key === "string" ? t.key : null))
      .filter((k): k is string => k !== null),
  );
  const bindingKeys = Object.keys(definition.allowedWorkflowsByTransition).sort();
  for (const key of bindingKeys) {
    if (transitionKeys.size > 0 && !transitionKeys.has(key)) {
      diagnostics.push(
        makeDiagnostic(
          {
            code: "UNRESOLVED_TRANSITION_BINDING",
            scope: `definition.allowedWorkflowsByTransition.${key}`,
            blocking: false,
            required: `Binding key '${key}' to reference a defined transition`,
            observed: `No transition with key '${key}' found in transitions array`,
            remediation: `Add a transition with key '${key}' or remove the binding`,
          },
          timestamp,
        ),
      );
    }
  }
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
