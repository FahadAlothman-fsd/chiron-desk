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
  rules?: LegacyAllowedValuesRule[];
  schemaDialect?: string;
  schema?: unknown;
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

function getJsonSchemaEnum(validation: FactValidationLike | undefined): string[] {
  const schema = validation?.schema;
  if (!schema || typeof schema !== "object" || !("enum" in schema)) {
    return [];
  }

  const enumValues = (schema as { enum?: unknown[] }).enum;
  if (!Array.isArray(enumValues)) {
    return [];
  }

  return enumValues
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim());
}

export function getAllowedValues(validation: unknown): string[] {
  const normalized = validation as FactValidationLike | undefined;
  const fromJsonSchema = getJsonSchemaEnum(normalized);
  if (fromJsonSchema.length > 0) {
    return fromJsonSchema;
  }

  return getLegacyAllowedValues(normalized);
}

export function getUiValidationKind(validation: unknown): UiFactValidationKind {
  const normalized = validation as FactValidationLike | undefined;
  if (normalized?.kind === "path") {
    return "path";
  }

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
    kind: "json-schema" as const,
    schemaDialect: "draft-2020-12",
    schema: {
      type: "string",
      enum: values,
    },
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
