export type UiFactValidationKind = "none" | "path" | "allowed-values" | "json-schema";

type LegacyAllowedValuesRule = {
  kind?: string;
  values?: string[];
};

type FactValidationLike = {
  kind?: string;
  path?: {
    pathKind?: "file" | "directory";
    normalization?: { trimWhitespace?: boolean };
    safety?: { disallowAbsolute?: boolean; preventTraversal?: boolean };
  };
  values?: unknown[];
  rules?: LegacyAllowedValuesRule[];
};

function getLegacyAllowedValues(validation: FactValidationLike | undefined): string[] {
  return (
    validation?.rules
      ?.find((rule) => rule.kind === "allowed-values")
      ?.values?.filter(
        (value): value is string => typeof value === "string" && value.trim().length > 0,
      )
      .map((value) => value.trim()) ?? []
  );
}

export function getAllowedValues(validation: unknown): string[] {
  const normalized = validation as FactValidationLike | undefined;

  // Handle new allowed-values format: { kind: "allowed-values", values: [...] }
  if (normalized?.kind === "allowed-values" && Array.isArray(normalized.values)) {
    return normalized.values
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .map((value) => value.trim());
  }

  // Handle legacy rules array format
  return getLegacyAllowedValues(normalized);
}

export function getUiValidationKind(validation: unknown): UiFactValidationKind {
  const normalized = validation as FactValidationLike | undefined;

  // Check explicit kind first
  if (normalized?.kind === "path") {
    return "path";
  }

  if (normalized?.kind === "allowed-values") {
    return "allowed-values";
  }

  // Fallback: check for legacy formats
  if (getAllowedValues(normalized).length > 0) {
    return "allowed-values";
  }

  if (normalized?.kind === "json-schema") {
    return "json-schema";
  }

  return "none";
}

export function createAllowedValuesValidation(values: string[]) {
  return {
    kind: "allowed-values" as const,
    values,
  };
}

export function normalizeFactValidation(validation: unknown): unknown {
  const normalized = validation as FactValidationLike | undefined;
  const allowedValues = getAllowedValues(normalized);
  if (allowedValues.length > 0) {
    return createAllowedValuesValidation(allowedValues);
  }

  return validation ?? { kind: "none" as const };
}
