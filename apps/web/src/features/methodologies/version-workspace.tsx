import { useForm } from "@tanstack/react-form";
import { Result } from "better-result";
import { Button } from "@/components/ui/button";
import { AllowedValuesChipEditor } from "./fact-editor-controls";
import {
  createAllowedValuesValidation,
  getAllowedValues,
  getUiValidationKind,
  normalizeFactValidation,
} from "./fact-validation";
import { Input } from "@/components/ui/input";
import { useEffect, useMemo, useRef, useState } from "react";

import { RUNTIME_DEFERRED_RATIONALE } from "./foundation";
import { VersionWorkspaceGraph } from "./version-workspace-graph";

export type MethodologyVersionWorkspaceDraft = {
  methodologyKey: string;
  displayName: string;
  factDefinitionsJson: string;
  workUnitTypesJson: string;
  agentTypesJson: string;
  factSchemasJson: string;
  transitionsJson: string;
  workflowsJson: string;
  workflowStepsJson: string;
  transitionWorkflowBindingsJson: string;
  guidanceJson: string;
};

export type WorkspaceParseDiagnostic = {
  field: keyof MethodologyVersionWorkspaceDraft;
  message: string;
  blocking?: boolean;
  group?: "field" | "work unit" | "transition" | "workflow";
  scope?: string;
  focusTarget?: WorkspaceFocusTarget;
};

export type WorkspaceFocusTarget = {
  level: "L1" | "L2" | "L3";
  nodeId?: string;
  workUnitTypeKey?: string;
  workflowKey?: string;
  transitionKey?: string;
};

type MethodologyVersionWorkspaceProps = {
  draft: MethodologyVersionWorkspaceDraft;
  parseDiagnostics: readonly WorkspaceParseDiagnostic[];
  isSaving: boolean;
  onChange: (field: keyof MethodologyVersionWorkspaceDraft, value: string) => void;
  onSave: () => void;
};

const FIELD_ELEMENT_IDS: Record<keyof MethodologyVersionWorkspaceDraft, string> = {
  methodologyKey: "workspace-field-methodologyKey",
  displayName: "workspace-field-displayName",
  factDefinitionsJson: "workspace-field-factDefinitionsJson",
  workUnitTypesJson: "workspace-field-workUnitTypesJson",
  agentTypesJson: "workspace-field-agentTypesJson",
  factSchemasJson: "workspace-field-factSchemasJson",
  transitionsJson: "workspace-field-transitionsJson",
  workflowsJson: "workspace-field-workflowsJson",
  workflowStepsJson: "workspace-field-workflowStepsJson",
  transitionWorkflowBindingsJson: "workspace-field-transitionWorkflowBindingsJson",
  guidanceJson: "workspace-field-guidanceJson",
};

const DIAGNOSTIC_GROUP_ORDER = ["field", "work unit", "transition", "workflow"] as const;

const DIAGNOSTIC_GROUP_LABEL: Record<(typeof DIAGNOSTIC_GROUP_ORDER)[number], string> = {
  field: "Field",
  "work unit": "Work Unit",
  transition: "Transition",
  workflow: "Workflow",
};

export type DraftProjectionShape = {
  displayName: string;
  factDefinitions?: readonly unknown[];
  workUnitTypes: readonly unknown[];
  agentTypes: readonly unknown[];
  transitions: readonly unknown[];
  workflows: readonly unknown[];
  transitionWorkflowBindings: Record<string, readonly string[]>;
  guidance?: unknown;
};

export type WorkspacePersistencePayload = {
  lifecycle: {
    workUnitTypes: unknown[];
    agentTypes: unknown[];
  };
  workflows: {
    workflows: unknown[];
    transitionWorkflowBindings: Record<string, string[]>;
    guidance?: unknown;
    factDefinitions: unknown[];
  };
  diagnostics: WorkspaceParseDiagnostic[];
};

export type ValidationDiagnosticShape = {
  code: string;
  scope: string;
  blocking?: boolean;
  required?: unknown;
  observed?: unknown;
  remediation?: string;
};

export type FactTypeValue = "string" | "number" | "boolean" | "json" | "work_unit";

export type FactEditorValue = {
  __uiId?: string;
  name?: string;
  key: string;
  factType: FactTypeValue;
  cardinality?: "one" | "many";
  defaultValue?: unknown;
  description?: { markdown?: string };
  guidance?: {
    human?: {
      markdown?: string;
      examples?: string[];
    };
    agent?: {
      intent?: string;
      constraints?: string[];
      examples?: string[];
    };
  };
  validation?:
    | { kind: "none" }
    | {
        kind: "path";
        path: {
          pathKind: "file" | "directory";
          normalization: { mode: "posix"; trimWhitespace: boolean };
          safety: { disallowAbsolute: boolean; preventTraversal: boolean };
        };
      }
    | {
        kind: "json-schema";
        schemaDialect: string;
        schema: unknown;
      };
};

type ParsedFactDefinitions = {
  facts: FactEditorValue[];
  valid: boolean;
};

const FACT_TYPES: readonly FactTypeValue[] = ["string", "number", "boolean", "json", "work_unit"];

let factEditorIdSequence = 0;

function createFactEditorId(): string {
  factEditorIdSequence += 1;
  return `fact-editor-${factEditorIdSequence}`;
}

function toGuidanceLine(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  return Result.try(() => JSON.stringify(value)).unwrapOr(String(value));
}

function parseJsonSafely(value: string): unknown {
  return Result.try(() => JSON.parse(value)).unwrapOr(null);
}

function toFactEditorValue(input: unknown, fallbackId?: string): FactEditorValue {
  const value = isRecord(input) ? input : {};
  const factType = FACT_TYPES.includes(value.factType as FactTypeValue)
    ? (value.factType as FactTypeValue)
    : "string";
  const cardinality = value.cardinality === "many" ? "many" : "one";

  const guidanceSource = isRecord(value.guidance) ? value.guidance : {};
  const humanSource = isRecord(guidanceSource.human) ? guidanceSource.human : {};
  const agentSource = isRecord(guidanceSource.agent) ? guidanceSource.agent : {};

  const humanMarkdown = typeof humanSource.markdown === "string" ? humanSource.markdown : undefined;
  const humanExamples = Array.isArray(humanSource.examples)
    ? humanSource.examples.map(toGuidanceLine)
    : [];

  const agentIntent =
    typeof agentSource.intent === "string"
      ? agentSource.intent
      : typeof agentSource.markdown === "string"
        ? agentSource.markdown
        : undefined;
  const agentConstraints = Array.isArray(agentSource.constraints)
    ? agentSource.constraints.map(toGuidanceLine)
    : [];
  const agentExamples = Array.isArray(agentSource.examples)
    ? agentSource.examples.map(toGuidanceLine)
    : [];

  const guidance: FactEditorValue["guidance"] = {
    ...(humanMarkdown || humanExamples.length > 0
      ? {
          human: {
            ...(humanMarkdown ? { markdown: humanMarkdown } : {}),
            ...(humanExamples.length > 0 ? { examples: humanExamples } : {}),
          },
        }
      : {}),
    ...(agentIntent || agentConstraints.length > 0 || agentExamples.length > 0
      ? {
          agent: {
            ...(agentIntent ? { intent: agentIntent } : {}),
            ...(agentConstraints.length > 0 ? { constraints: agentConstraints } : {}),
            ...(agentExamples.length > 0 ? { examples: agentExamples } : {}),
          },
        }
      : {}),
  };

  let validation: FactEditorValue["validation"] = { kind: "none" };
  if (
    isRecord(value.validation) &&
    value.validation.kind === "path" &&
    isRecord(value.validation.path)
  ) {
    const normalization = isRecord(value.validation.path.normalization)
      ? value.validation.path.normalization
      : {};
    const safety = isRecord(value.validation.path.safety) ? value.validation.path.safety : {};

    validation = {
      kind: "path",
      path: {
        pathKind: value.validation.path.pathKind === "directory" ? "directory" : "file",
        normalization: {
          mode: "posix",
          trimWhitespace: normalization.trimWhitespace !== false,
        },
        safety: {
          disallowAbsolute: safety.disallowAbsolute !== false,
          preventTraversal: safety.preventTraversal !== false,
        },
      },
    };
  } else if (isRecord(value.validation) && value.validation.kind === "json-schema") {
    validation = {
      kind: "json-schema",
      schemaDialect:
        typeof value.validation.schemaDialect === "string"
          ? value.validation.schemaDialect
          : "draft-2020-12",
      schema: value.validation.schema ?? {},
    };
  }

  const name = typeof value.name === "string" ? value.name : undefined;
  const descriptionSource = isRecord(value.description) ? value.description : undefined;
  const descriptionHuman = isRecord(descriptionSource?.human) ? descriptionSource.human : {};
  const descriptionAgent = isRecord(descriptionSource?.agent) ? descriptionSource.agent : {};
  const descriptionMarkdown =
    typeof descriptionSource?.markdown === "string"
      ? descriptionSource.markdown
      : typeof descriptionHuman.markdown === "string"
        ? descriptionHuman.markdown
        : typeof descriptionAgent.markdown === "string"
          ? descriptionAgent.markdown
          : typeof value.description === "string"
            ? value.description
            : undefined;
  const description = descriptionMarkdown ? { markdown: descriptionMarkdown } : undefined;

  return {
    __uiId: typeof value.__uiId === "string" ? value.__uiId : (fallbackId ?? createFactEditorId()),
    ...(name ? { name } : {}),
    key: typeof value.key === "string" ? value.key : "",
    factType,
    cardinality,
    defaultValue: value.defaultValue,
    ...(description ? { description } : {}),
    ...(guidance && (guidance.human || guidance.agent) ? { guidance } : {}),
    validation,
  };
}

export function parseFactDefinitions(value: string): FactEditorValue[] {
  const parsed = parseJsonSafely(value);
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.map((item, index) => toFactEditorValue(item, `fact-definition-${index}`));
}

function parseFactDefinitionsWithStatus(value: string): ParsedFactDefinitions {
  const parsed = parseJsonSafely(value);
  if (!Array.isArray(parsed)) {
    return {
      facts: [],
      valid: false,
    };
  }

  return {
    facts: parseFactDefinitions(value),
    valid: true,
  };
}

function factDefaultToInputValue(fact: FactEditorValue): string {
  if (fact.defaultValue === undefined || fact.defaultValue === null) {
    return "";
  }
  if (fact.factType === "json") {
    return JSON.stringify(fact.defaultValue, null, 2);
  }
  return String(fact.defaultValue);
}

function inputValueToFactDefault(factType: FactTypeValue, rawValue: string): unknown {
  if (rawValue.trim().length === 0) {
    return undefined;
  }
  if (factType === "string") {
    return rawValue;
  }
  if (factType === "work_unit") {
    return rawValue;
  }
  if (factType === "number") {
    const parsed = Number(rawValue);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (factType === "boolean") {
    if (rawValue === "true") {
      return true;
    }
    if (rawValue === "false") {
      return false;
    }
    return undefined;
  }

  return Result.try(() => JSON.parse(rawValue)).unwrapOr(undefined);
}

function sanitizeFact(fact: FactEditorValue): FactEditorValue {
  const name = fact.name?.trim();
  const key = fact.key.trim();
  const descriptionMarkdown = fact.description?.markdown?.trim();
  const humanMarkdown = fact.guidance?.human?.markdown?.trim();
  const humanExamples =
    fact.guidance?.human?.examples?.map((line) => line.trim()).filter((line) => line.length > 0) ??
    [];
  const agentIntent = fact.guidance?.agent?.intent?.trim();
  const agentConstraints =
    fact.guidance?.agent?.constraints
      ?.map((line) => line.trim())
      .filter((line) => line.length > 0) ?? [];
  const agentExamples =
    fact.guidance?.agent?.examples?.map((line) => line.trim()).filter((line) => line.length > 0) ??
    [];

  const guidance =
    humanMarkdown ||
    humanExamples.length > 0 ||
    agentIntent ||
    agentConstraints.length > 0 ||
    agentExamples.length > 0
      ? {
          ...(humanMarkdown || humanExamples.length > 0
            ? {
                human: {
                  ...(humanMarkdown ? { markdown: humanMarkdown } : {}),
                  ...(humanExamples.length > 0 ? { examples: humanExamples } : {}),
                },
              }
            : {}),
          ...(agentIntent || agentConstraints.length > 0 || agentExamples.length > 0
            ? {
                agent: {
                  ...(agentIntent ? { intent: agentIntent } : {}),
                  ...(agentConstraints.length > 0 ? { constraints: agentConstraints } : {}),
                  ...(agentExamples.length > 0 ? { examples: agentExamples } : {}),
                },
              }
            : {}),
        }
      : undefined;

  const normalizedValidation = normalizeFactValidation(
    fact.validation,
  ) as FactEditorValue["validation"];
  const validation: NonNullable<FactEditorValue["validation"]> = normalizedValidation ?? {
    kind: "none",
  };

  const descriptionValue = descriptionMarkdown ? { markdown: descriptionMarkdown } : undefined;

  return {
    ...(name && name.length > 0 ? { name } : {}),
    key,
    factType: fact.factType,
    cardinality: fact.cardinality === "many" ? "many" : "one",
    defaultValue: fact.defaultValue,
    ...(descriptionValue ? { description: descriptionValue } : {}),
    ...(guidance ? { guidance } : {}),
    validation,
  };
}

export function serializeFacts(facts: readonly FactEditorValue[]): string {
  return toDeterministicJson(facts.map(sanitizeFact));
}

function factsToSerializable(facts: readonly FactEditorValue[]): unknown[] {
  return facts.map(sanitizeFact);
}

function setFactValidationKind(
  fact: FactEditorValue,
  kind: "none" | "path" | "json-schema" | "allowed-values",
): FactEditorValue {
  if (kind === "path") {
    return {
      ...fact,
      validation: {
        kind: "path",
        path: {
          pathKind: "file",
          normalization: { mode: "posix", trimWhitespace: true },
          safety: { disallowAbsolute: true, preventTraversal: true },
        },
      },
    };
  }

  if (kind === "json-schema") {
    return {
      ...fact,
      validation: {
        kind: "json-schema",
        schemaDialect: "draft-2020-12",
        schema: {},
      },
    };
  }

  if (kind === "allowed-values") {
    return {
      ...fact,
      validation: createAllowedValuesValidation([]) as never,
    };
  }

  return { ...fact, validation: { kind: "none" } };
}

type JsonSchemaPropertyType =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "object"
  | "array"
  | "null";

type PropertyValidation = Exclude<FactEditorValue["validation"], undefined>;

const DEFAULT_PATH_VALIDATION: PropertyValidation = {
  kind: "path",
  path: {
    pathKind: "file",
    normalization: { mode: "posix", trimWhitespace: true },
    safety: { disallowAbsolute: true, preventTraversal: true },
  },
};

function normalizePropertyValidation(input: unknown): PropertyValidation {
  if (!isRecord(input)) {
    return { kind: "none" };
  }

  if (input.kind === "path" && isRecord(input.path)) {
    const normalization = isRecord(input.path.normalization) ? input.path.normalization : {};
    const safety = isRecord(input.path.safety) ? input.path.safety : {};

    return {
      kind: "path",
      path: {
        pathKind: input.path.pathKind === "directory" ? "directory" : "file",
        normalization: {
          mode: "posix",
          trimWhitespace: normalization.trimWhitespace !== false,
        },
        safety: {
          disallowAbsolute: safety.disallowAbsolute !== false,
          preventTraversal: safety.preventTraversal !== false,
        },
      },
    };
  }

  if (input.kind === "json-schema") {
    return {
      kind: "json-schema",
      schemaDialect:
        typeof input.schemaDialect === "string" ? input.schemaDialect : "draft-2020-12",
      schema: input.schema ?? {},
    };
  }

  return { kind: "none" };
}

function setPropertyValidationKind(
  current: JsonSchemaEditorProperty,
  kind: "none" | "path" | "json-schema",
): JsonSchemaEditorProperty {
  if (kind === "path") {
    return {
      ...current,
      validation: {
        ...DEFAULT_PATH_VALIDATION,
      },
    };
  }

  if (kind === "json-schema") {
    return {
      ...current,
      validation: {
        kind: "json-schema",
        schemaDialect: "draft-2020-12",
        schema: { type: current.type },
      },
    };
  }

  return {
    ...current,
    validation: { kind: "none" },
  };
}

function getPropertyValidationWarning(property: JsonSchemaEditorProperty): string | null {
  if (property.validation.kind === "path" && property.type !== "string") {
    return "Path validation is only compatible with string properties.";
  }

  if (
    property.validation.kind === "json-schema" &&
    property.type !== "object" &&
    property.type !== "array"
  ) {
    return "json-schema profile is most useful for object/array properties; this selection may be redundant.";
  }

  return null;
}

type JsonSchemaEditorProperty = {
  key: string;
  type: JsonSchemaPropertyType;
  required: boolean;
  operatorDescription: string;
  agentDescription: string;
  validation: PropertyValidation;
  additionalProperties: boolean;
  properties: JsonSchemaEditorProperty[];
};

type JsonSchemaEditorState = {
  rootType: JsonSchemaPropertyType;
  additionalProperties: boolean;
  properties: JsonSchemaEditorProperty[];
};

const JSON_SCHEMA_PROPERTY_TYPES: readonly JsonSchemaPropertyType[] = [
  "string",
  "number",
  "integer",
  "boolean",
  "object",
  "array",
  "null",
];

function normalizeJsonSchemaEditorState(schema: unknown): JsonSchemaEditorState {
  const schemaRecord = isRecord(schema) ? schema : {};
  const rootType = JSON_SCHEMA_PROPERTY_TYPES.includes(schemaRecord.type as JsonSchemaPropertyType)
    ? (schemaRecord.type as JsonSchemaPropertyType)
    : "object";
  const additionalProperties = schemaRecord.additionalProperties !== false;
  const propertiesRecord = isRecord(schemaRecord.properties) ? schemaRecord.properties : {};
  const requiredSet = new Set(
    Array.isArray(schemaRecord.required)
      ? schemaRecord.required.filter((value): value is string => typeof value === "string")
      : [],
  );

  const toProperty = (
    propertyKey: string,
    propertySchema: unknown,
    isRequired: boolean,
  ): JsonSchemaEditorProperty => {
    const propertyRecord = isRecord(propertySchema) ? propertySchema : {};
    const propertyType = JSON_SCHEMA_PROPERTY_TYPES.includes(
      propertyRecord.type as JsonSchemaPropertyType,
    )
      ? (propertyRecord.type as JsonSchemaPropertyType)
      : "string";

    const nestedPropertiesRecord = isRecord(propertyRecord.properties)
      ? propertyRecord.properties
      : {};
    const nestedRequiredSet = new Set(
      Array.isArray(propertyRecord.required)
        ? propertyRecord.required.filter((value): value is string => typeof value === "string")
        : [],
    );

    const nestedProperties =
      propertyType === "object"
        ? Object.entries(nestedPropertiesRecord).map(([nestedKey, nestedSchema]) =>
            toProperty(nestedKey, nestedSchema, nestedRequiredSet.has(nestedKey)),
          )
        : [];

    return {
      key: propertyKey,
      type: propertyType,
      required: isRequired,
      operatorDescription:
        typeof propertyRecord.description === "string" ? propertyRecord.description : "",
      agentDescription:
        typeof propertyRecord["x-agent-description"] === "string"
          ? propertyRecord["x-agent-description"]
          : "",
      validation: normalizePropertyValidation(propertyRecord["x-validation"]),
      additionalProperties: propertyRecord.additionalProperties !== false,
      properties: nestedProperties,
    };
  };

  const properties = Object.entries(propertiesRecord).map(([propertyKey, propertySchema]) =>
    toProperty(propertyKey, propertySchema, requiredSet.has(propertyKey)),
  );

  return {
    rootType,
    additionalProperties,
    properties,
  };
}

function serializeJsonSchemaEditorState(state: JsonSchemaEditorState): Record<string, unknown> {
  if (state.rootType !== "object") {
    return {
      type: state.rootType,
    };
  }

  const toSchemaProperty = (
    property: JsonSchemaEditorProperty,
  ): [string, Record<string, unknown>] | null => {
    const propertyKey = property.key.trim();
    if (!propertyKey) {
      return null;
    }

    const propertySchema: Record<string, unknown> = {
      type: property.type,
    };

    const operatorDescription = property.operatorDescription.trim();
    if (operatorDescription) {
      propertySchema.description = operatorDescription;
    }

    const agentDescription = property.agentDescription.trim();
    if (agentDescription) {
      propertySchema["x-agent-description"] = agentDescription;
    }

    if (property.validation.kind !== "none") {
      propertySchema["x-validation"] =
        property.validation.kind === "json-schema"
          ? {
              ...property.validation,
              schema: isRecord(property.validation.schema)
                ? property.validation.schema
                : { type: property.type },
            }
          : property.validation;
    }

    if (property.type === "object") {
      const nestedEntries = property.properties
        .map(toSchemaProperty)
        .filter((entry): entry is [string, Record<string, unknown>] => entry !== null);
      const nestedRequired = property.properties
        .filter((entry) => entry.required && entry.key.trim().length > 0)
        .map((entry) => entry.key.trim());

      propertySchema.additionalProperties = property.additionalProperties;
      if (nestedEntries.length > 0) {
        propertySchema.properties = Object.fromEntries(nestedEntries);
      }
      if (nestedRequired.length > 0) {
        propertySchema.required = nestedRequired;
      }
    }

    return [propertyKey, propertySchema];
  };

  const propertiesEntries = state.properties
    .map(toSchemaProperty)
    .filter((entry): entry is [string, Record<string, unknown>] => entry !== null);
  const required: string[] = [];

  for (const property of state.properties) {
    const propertyKey = property.key.trim();
    if (!propertyKey) {
      continue;
    }
    if (property.required) {
      required.push(propertyKey);
    }
  }

  const properties = Object.fromEntries(propertiesEntries);

  return {
    type: "object",
    additionalProperties: state.additionalProperties,
    ...(propertiesEntries.length > 0 ? { properties } : {}),
    ...(required.length > 0 ? { required } : {}),
  };
}

function nextJsonSchemaPropertyKey(properties: readonly JsonSchemaEditorProperty[]): string {
  const usedKeys = new Set(properties.map((property) => property.key.trim()).filter(Boolean));
  let counter = 1;
  while (usedKeys.has(`property_${counter}`)) {
    counter += 1;
  }
  return `property_${counter}`;
}

function createEmptyJsonSchemaProperty(
  existingProperties: readonly JsonSchemaEditorProperty[],
): JsonSchemaEditorProperty {
  return {
    key: nextJsonSchemaPropertyKey(existingProperties),
    type: "string",
    required: false,
    operatorDescription: "",
    agentDescription: "",
    validation: { kind: "none" },
    additionalProperties: true,
    properties: [],
  };
}

function updateJsonSchemaPropertyAtPath(
  properties: readonly JsonSchemaEditorProperty[],
  path: readonly number[],
  updater: (property: JsonSchemaEditorProperty) => JsonSchemaEditorProperty,
): JsonSchemaEditorProperty[] {
  const [head, ...tail] = path;
  if (head === undefined) {
    return [...properties];
  }

  return properties.map((property, index) => {
    if (index !== head) {
      return property;
    }

    if (tail.length === 0) {
      return updater(property);
    }

    return {
      ...property,
      properties: updateJsonSchemaPropertyAtPath(property.properties, tail, updater),
    };
  });
}

function removeJsonSchemaPropertyAtPath(
  properties: readonly JsonSchemaEditorProperty[],
  path: readonly number[],
): JsonSchemaEditorProperty[] {
  const [head, ...tail] = path;
  if (head === undefined) {
    return [...properties];
  }

  if (tail.length === 0) {
    return properties.filter((_, index) => index !== head);
  }

  return properties.map((property, index) => {
    if (index !== head) {
      return property;
    }

    return {
      ...property,
      properties: removeJsonSchemaPropertyAtPath(property.properties, tail),
    };
  });
}

export function createEmptyFact(): FactEditorValue {
  return {
    __uiId: createFactEditorId(),
    name: "",
    key: "",
    factType: "string",
    cardinality: "one",
    description: { markdown: "" },
    guidance: {
      human: {
        markdown: "",
        examples: [],
      },
      agent: {
        intent: "",
        constraints: [],
        examples: [],
      },
    },
    validation: { kind: "none" },
  };
}

type FactListSyncProps = {
  facts: FactEditorValue[];
  onSync: (facts: FactEditorValue[]) => void;
};

function FactListSync({ facts, onSync }: FactListSyncProps) {
  useEffect(() => {
    onSync(facts);
  }, [facts, onSync]);

  return null;
}

type FactListEditorProps = {
  heading: string;
  facts: FactEditorValue[];
  onChange: (nextFacts: FactEditorValue[]) => void;
  addLabel: string;
  emptyMessage: string;
  rowKeyPrefix: string;
};

export function FactListEditor({
  heading,
  facts,
  onChange,
  addLabel,
  emptyMessage,
  rowKeyPrefix,
}: FactListEditorProps) {
  const form = useForm({
    defaultValues: {
      facts,
    },
  });
  const serializedFacts = useMemo(() => serializeFacts(facts), [facts]);
  const lastSyncedRef = useRef(serializedFacts);

  useEffect(() => {
    if (serializedFacts === lastSyncedRef.current) {
      return;
    }
    lastSyncedRef.current = serializedFacts;
    form.reset({ facts });
  }, [facts, form, serializedFacts]);

  const syncFacts = (nextFacts: FactEditorValue[]) => {
    const serialized = serializeFacts(nextFacts);
    if (serialized === lastSyncedRef.current) {
      return;
    }
    lastSyncedRef.current = serialized;
    onChange(nextFacts);
  };

  return (
    <>
      <form.Subscribe selector={(state) => state.values.facts}>
        {(nextFacts) => (
          <FactListSync facts={(nextFacts as FactEditorValue[]) ?? []} onSync={syncFacts} />
        )}
      </form.Subscribe>

      <form.Field name="facts" mode="array">
        {(factsField) => {
          const factItems = (factsField.state.value as FactEditorValue[] | undefined) ?? [];

          return (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                  {heading}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="h-7 rounded-none px-2 text-xs"
                  onClick={() => {
                    factsField.pushValue(createEmptyFact());
                  }}
                >
                  {addLabel}
                </Button>
              </div>

              {factItems.length === 0 ? (
                <p className="text-xs text-muted-foreground">{emptyMessage}</p>
              ) : (
                factItems.map((fact, index) => {
                  const validationKind = getUiValidationKind(fact.validation);
                  const rowId = fact.__uiId ?? `${rowKeyPrefix}-row-${index}`;
                  return (
                    <article key={rowId} className="chiron-frame-flat space-y-2 p-2">
                      <div className="grid gap-2 md:grid-cols-2">
                        <form.Field name={`facts[${index}].name` as never}>
                          {(nameField) => (
                            <Input
                              value={(nameField.state.value as string | undefined) ?? ""}
                              placeholder="Name (human-readable)"
                              onBlur={nameField.handleBlur}
                              onChange={(event) => {
                                nameField.handleChange(() => event.target.value as never);
                              }}
                            />
                          )}
                        </form.Field>
                        <form.Field name={`facts[${index}].key` as never}>
                          {(keyField) => (
                            <Input
                              value={(keyField.state.value as string | undefined) ?? ""}
                              placeholder="fact_key"
                              onBlur={keyField.handleBlur}
                              onChange={(event) => {
                                keyField.handleChange(() => event.target.value as never);
                              }}
                            />
                          )}
                        </form.Field>
                      </div>

                      <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                        <form.Field name={`facts[${index}].factType` as never}>
                          {(typeField) => (
                            <select
                              className="h-8 border border-border/70 bg-background px-2 text-xs"
                              value={
                                (typeField.state.value as FactTypeValue | undefined) ?? "string"
                              }
                              onBlur={typeField.handleBlur}
                              onChange={(event) => {
                                typeField.handleChange(
                                  () => event.target.value as FactTypeValue as never,
                                );
                              }}
                            >
                              {FACT_TYPES.map((factType) => (
                                <option key={factType} value={factType}>
                                  {factType}
                                </option>
                              ))}
                            </select>
                          )}
                        </form.Field>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 rounded-none px-2 text-xs"
                          onClick={() => {
                            factsField.removeValue(index);
                          }}
                        >
                          Remove
                        </Button>
                      </div>

                      <form.Field name={`facts[${index}].defaultValue` as never}>
                        {(defaultField) => (
                          <Input
                            value={factDefaultToInputValue(fact)}
                            placeholder={
                              fact.factType === "json" ? "JSON default" : "Default value"
                            }
                            onBlur={defaultField.handleBlur}
                            onChange={(event) => {
                              defaultField.handleChange(
                                () =>
                                  inputValueToFactDefault(
                                    fact.factType,
                                    event.target.value,
                                  ) as never,
                              );
                            }}
                          />
                        )}
                      </form.Field>

                      <form.Field name={`facts[${index}].description` as never}>
                        {(descriptionField) => {
                          const descriptionValue = descriptionField.state.value as
                            | FactEditorValue["description"]
                            | undefined;
                          return (
                            <Input
                              value={descriptionValue?.markdown ?? ""}
                              placeholder="Description"
                              onBlur={descriptionField.handleBlur}
                              onChange={(event) => {
                                descriptionField.handleChange(
                                  () => ({ markdown: event.target.value }) as never,
                                );
                              }}
                            />
                          );
                        }}
                      </form.Field>

                      <div className="space-y-2">
                        <p className="text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">
                          Guidance (Markdown-Friendly)
                        </p>
                        <div className="grid gap-2 md:grid-cols-2">
                          <form.Field name={`facts[${index}].guidance.human.markdown` as never}>
                            {(field) => (
                              <textarea
                                className="w-full border border-border/70 bg-background px-2 py-1.5 text-xs"
                                rows={3}
                                value={(field.state.value as string | undefined) ?? ""}
                                placeholder="Human markdown"
                                onBlur={field.handleBlur}
                                onChange={(event) => {
                                  field.handleChange(() => event.target.value as never);
                                }}
                              />
                            )}
                          </form.Field>
                          <form.Field name={`facts[${index}].guidance.agent.intent` as never}>
                            {(field) => (
                              <textarea
                                className="w-full border border-border/70 bg-background px-2 py-1.5 text-xs"
                                rows={4}
                                value={(field.state.value as string | undefined) ?? ""}
                                placeholder="Agent markdown"
                                onBlur={field.handleBlur}
                                onChange={(event) => {
                                  field.handleChange(() => event.target.value as never);
                                }}
                              />
                            )}
                          </form.Field>
                        </div>
                      </div>

                      <div className="grid gap-2 md:grid-cols-2">
                        <form.Field name={`facts[${index}].validation` as never}>
                          {(validationField) => {
                            const value =
                              (validationField.state.value as
                                | FactEditorValue["validation"]
                                | undefined) ?? ({ kind: "none" } as const);
                            return (
                              <select
                                className="h-8 border border-border/70 bg-background px-2 text-xs"
                                value={value.kind}
                                onBlur={validationField.handleBlur}
                                onChange={(event) => {
                                  validationField.handleChange(
                                    () =>
                                      setFactValidationKind(
                                        factItems[index] ?? createEmptyFact(),
                                        event.target.value as
                                          | "none"
                                          | "path"
                                          | "json-schema"
                                          | "allowed-values",
                                      ).validation as never,
                                  );
                                }}
                              >
                                <option value="none">validation: none</option>
                                <option value="path">validation: path</option>
                                <option value="allowed-values">validation: allowed values</option>
                                <option value="json-schema">validation: json-schema</option>
                              </select>
                            );
                          }}
                        </form.Field>

                        {validationKind === "path" ? (
                          <form.Field name={`facts[${index}].validation.path.pathKind` as never}>
                            {(pathKindField) => (
                              <select
                                className="h-8 border border-border/70 bg-background px-2 text-xs"
                                value={
                                  (pathKindField.state.value as "file" | "directory" | undefined) ??
                                  "file"
                                }
                                onBlur={pathKindField.handleBlur}
                                onChange={(event) => {
                                  pathKindField.handleChange(
                                    () => event.target.value as "file" | "directory" as never,
                                  );
                                }}
                              >
                                <option value="file">pathKind: file</option>
                                <option value="directory">pathKind: directory</option>
                              </select>
                            )}
                          </form.Field>
                        ) : validationKind === "json-schema" ? (
                          <form.Field name={`facts[${index}].validation.schemaDialect` as never}>
                            {(schemaDialectField) => (
                              <Input
                                value={(schemaDialectField.state.value as string | undefined) ?? ""}
                                placeholder="schema dialect"
                                onBlur={schemaDialectField.handleBlur}
                                onChange={(event) => {
                                  schemaDialectField.handleChange(
                                    () => event.target.value as never,
                                  );
                                }}
                              />
                            )}
                          </form.Field>
                        ) : validationKind === "allowed-values" ? (
                          <div className="h-8" />
                        ) : (
                          <div className="h-8" />
                        )}
                      </div>

                      {validationKind === "path" ? (
                        <div className="grid gap-2 md:grid-cols-3 text-xs text-muted-foreground">
                          <label
                            htmlFor={`${rowId}-trim-whitespace`}
                            className="flex items-center gap-2"
                          >
                            <form.Field
                              name={
                                `facts[${index}].validation.path.normalization.trimWhitespace` as never
                              }
                            >
                              {(field) => (
                                <input
                                  id={`${rowId}-trim-whitespace`}
                                  type="checkbox"
                                  checked={(field.state.value as boolean | undefined) ?? true}
                                  onBlur={field.handleBlur}
                                  onChange={(event) => {
                                    field.handleChange(() => event.target.checked as never);
                                  }}
                                />
                              )}
                            </form.Field>
                            Trim whitespace
                          </label>
                          <label
                            htmlFor={`${rowId}-disallow-absolute`}
                            className="flex items-center gap-2"
                          >
                            <form.Field
                              name={
                                `facts[${index}].validation.path.safety.disallowAbsolute` as never
                              }
                            >
                              {(field) => (
                                <input
                                  id={`${rowId}-disallow-absolute`}
                                  type="checkbox"
                                  checked={(field.state.value as boolean | undefined) ?? true}
                                  onBlur={field.handleBlur}
                                  onChange={(event) => {
                                    field.handleChange(() => event.target.checked as never);
                                  }}
                                />
                              )}
                            </form.Field>
                            Disallow absolute
                          </label>
                          <label
                            htmlFor={`${rowId}-prevent-traversal`}
                            className="flex items-center gap-2"
                          >
                            <form.Field
                              name={
                                `facts[${index}].validation.path.safety.preventTraversal` as never
                              }
                            >
                              {(field) => (
                                <input
                                  id={`${rowId}-prevent-traversal`}
                                  type="checkbox"
                                  checked={(field.state.value as boolean | undefined) ?? true}
                                  onBlur={field.handleBlur}
                                  onChange={(event) => {
                                    field.handleChange(() => event.target.checked as never);
                                  }}
                                />
                              )}
                            </form.Field>
                            Prevent traversal
                          </label>
                        </div>
                      ) : null}

                      {validationKind === "allowed-values" ? (
                        <form.Field name={`facts[${index}].validation` as never}>
                          {(validationField) => {
                            const values = getAllowedValues(validationField.state.value);

                            return (
                              <AllowedValuesChipEditor
                                values={values}
                                onChange={(nextValues) => {
                                  validationField.handleChange(
                                    () => createAllowedValuesValidation(nextValues) as never,
                                  );
                                }}
                              />
                            );
                          }}
                        </form.Field>
                      ) : validationKind === "json-schema" ? (
                        <form.Field name={`facts[${index}].validation.schema` as never}>
                          {(schemaField) => {
                            const schemaState = normalizeJsonSchemaEditorState(
                              schemaField.state.value,
                            );
                            const updateSchemaState = (
                              updater: (state: JsonSchemaEditorState) => JsonSchemaEditorState,
                            ) => {
                              const nextState = updater(schemaState);
                              schemaField.handleChange(
                                () => serializeJsonSchemaEditorState(nextState) as never,
                              );
                            };

                            const renderSchemaProperties = (
                              properties: JsonSchemaEditorProperty[],
                              parentPath: number[] = [],
                            ) =>
                              properties.map((property, propertyIndex) => {
                                const propertyPath = [...parentPath, propertyIndex];
                                const pathKey = propertyPath.join("-");
                                const propertyValidationWarning =
                                  getPropertyValidationWarning(property);

                                return (
                                  <div
                                    key={`${rowId}-schema-property-${pathKey}`}
                                    className="space-y-2 border border-border/60 p-2"
                                    style={{ marginLeft: parentPath.length * 12 }}
                                  >
                                    <div className="grid gap-2 md:grid-cols-[1fr_180px_auto_auto]">
                                      <Input
                                        value={property.key}
                                        placeholder="property_key"
                                        onChange={(event) => {
                                          updateSchemaState((current) => ({
                                            ...current,
                                            properties: updateJsonSchemaPropertyAtPath(
                                              current.properties,
                                              propertyPath,
                                              (entry) => ({ ...entry, key: event.target.value }),
                                            ),
                                          }));
                                        }}
                                      />
                                      <select
                                        className="h-8 border border-border/70 bg-background px-2 text-xs"
                                        value={property.type}
                                        onChange={(event) => {
                                          updateSchemaState((current) => ({
                                            ...current,
                                            properties: updateJsonSchemaPropertyAtPath(
                                              current.properties,
                                              propertyPath,
                                              (entry) => ({
                                                ...entry,
                                                type: event.target.value as JsonSchemaPropertyType,
                                                properties:
                                                  event.target.value === "object"
                                                    ? entry.properties
                                                    : [],
                                                additionalProperties:
                                                  event.target.value === "object"
                                                    ? entry.additionalProperties
                                                    : true,
                                                validation:
                                                  entry.validation.kind === "json-schema"
                                                    ? {
                                                        ...entry.validation,
                                                        schema: {
                                                          type: event.target.value,
                                                        },
                                                      }
                                                    : entry.validation,
                                              }),
                                            ),
                                          }));
                                        }}
                                      >
                                        {JSON_SCHEMA_PROPERTY_TYPES.map((schemaType) => (
                                          <option key={schemaType} value={schemaType}>
                                            {schemaType}
                                          </option>
                                        ))}
                                      </select>
                                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <input
                                          type="checkbox"
                                          checked={property.required}
                                          onChange={(event) => {
                                            updateSchemaState((current) => ({
                                              ...current,
                                              properties: updateJsonSchemaPropertyAtPath(
                                                current.properties,
                                                propertyPath,
                                                (entry) => ({
                                                  ...entry,
                                                  required: event.target.checked,
                                                }),
                                              ),
                                            }));
                                          }}
                                        />
                                        required
                                      </label>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        className="h-8 rounded-none px-2 text-xs"
                                        onClick={() => {
                                          updateSchemaState((current) => ({
                                            ...current,
                                            properties: removeJsonSchemaPropertyAtPath(
                                              current.properties,
                                              propertyPath,
                                            ),
                                          }));
                                        }}
                                      >
                                        Remove
                                      </Button>
                                    </div>

                                    <div className="grid gap-2 md:grid-cols-2">
                                      <Input
                                        value={property.operatorDescription}
                                        placeholder="Operator description"
                                        onChange={(event) => {
                                          updateSchemaState((current) => ({
                                            ...current,
                                            properties: updateJsonSchemaPropertyAtPath(
                                              current.properties,
                                              propertyPath,
                                              (entry) => ({
                                                ...entry,
                                                operatorDescription: event.target.value,
                                              }),
                                            ),
                                          }));
                                        }}
                                      />
                                      <Input
                                        value={property.agentDescription}
                                        placeholder="Agent description"
                                        onChange={(event) => {
                                          updateSchemaState((current) => ({
                                            ...current,
                                            properties: updateJsonSchemaPropertyAtPath(
                                              current.properties,
                                              propertyPath,
                                              (entry) => ({
                                                ...entry,
                                                agentDescription: event.target.value,
                                              }),
                                            ),
                                          }));
                                        }}
                                      />
                                    </div>

                                    <div className="grid gap-2 md:grid-cols-2">
                                      <select
                                        className="h-8 border border-border/70 bg-background px-2 text-xs"
                                        value={property.validation.kind}
                                        onChange={(event) => {
                                          updateSchemaState((current) => ({
                                            ...current,
                                            properties: updateJsonSchemaPropertyAtPath(
                                              current.properties,
                                              propertyPath,
                                              (entry) =>
                                                setPropertyValidationKind(
                                                  entry,
                                                  event.target.value as
                                                    | "none"
                                                    | "path"
                                                    | "json-schema",
                                                ),
                                            ),
                                          }));
                                        }}
                                      >
                                        <option value="none">property validation: none</option>
                                        <option value="path">property validation: path</option>
                                        <option value="json-schema">
                                          property validation: json-schema
                                        </option>
                                      </select>

                                      {property.validation.kind === "path" ? (
                                        <select
                                          className="h-8 border border-border/70 bg-background px-2 text-xs"
                                          value={property.validation.path.pathKind}
                                          onChange={(event) => {
                                            updateSchemaState((current) => ({
                                              ...current,
                                              properties: updateJsonSchemaPropertyAtPath(
                                                current.properties,
                                                propertyPath,
                                                (entry) =>
                                                  entry.validation.kind === "path"
                                                    ? {
                                                        ...entry,
                                                        validation: {
                                                          ...entry.validation,
                                                          path: {
                                                            ...entry.validation.path,
                                                            pathKind: event.target.value as
                                                              | "file"
                                                              | "directory",
                                                          },
                                                        },
                                                      }
                                                    : entry,
                                              ),
                                            }));
                                          }}
                                        >
                                          <option value="file">pathKind: file</option>
                                          <option value="directory">pathKind: directory</option>
                                        </select>
                                      ) : property.validation.kind === "json-schema" ? (
                                        <Input
                                          value={property.validation.schemaDialect}
                                          placeholder="schema dialect"
                                          onChange={(event) => {
                                            updateSchemaState((current) => ({
                                              ...current,
                                              properties: updateJsonSchemaPropertyAtPath(
                                                current.properties,
                                                propertyPath,
                                                (entry) =>
                                                  entry.validation.kind === "json-schema"
                                                    ? {
                                                        ...entry,
                                                        validation: {
                                                          ...entry.validation,
                                                          schemaDialect: event.target.value,
                                                        },
                                                      }
                                                    : entry,
                                              ),
                                            }));
                                          }}
                                        />
                                      ) : (
                                        <div className="h-8" />
                                      )}
                                    </div>

                                    {property.validation.kind === "path" ? (
                                      <div className="grid gap-2 md:grid-cols-3 text-xs text-muted-foreground">
                                        <label className="flex items-center gap-2">
                                          <input
                                            type="checkbox"
                                            checked={
                                              property.validation.path.normalization.trimWhitespace
                                            }
                                            onChange={(event) => {
                                              updateSchemaState((current) => ({
                                                ...current,
                                                properties: updateJsonSchemaPropertyAtPath(
                                                  current.properties,
                                                  propertyPath,
                                                  (entry) =>
                                                    entry.validation.kind === "path"
                                                      ? {
                                                          ...entry,
                                                          validation: {
                                                            ...entry.validation,
                                                            path: {
                                                              ...entry.validation.path,
                                                              normalization: {
                                                                ...entry.validation.path
                                                                  .normalization,
                                                                trimWhitespace:
                                                                  event.target.checked,
                                                              },
                                                            },
                                                          },
                                                        }
                                                      : entry,
                                                ),
                                              }));
                                            }}
                                          />
                                          Trim whitespace
                                        </label>
                                        <label className="flex items-center gap-2">
                                          <input
                                            type="checkbox"
                                            checked={
                                              property.validation.path.safety.disallowAbsolute
                                            }
                                            onChange={(event) => {
                                              updateSchemaState((current) => ({
                                                ...current,
                                                properties: updateJsonSchemaPropertyAtPath(
                                                  current.properties,
                                                  propertyPath,
                                                  (entry) =>
                                                    entry.validation.kind === "path"
                                                      ? {
                                                          ...entry,
                                                          validation: {
                                                            ...entry.validation,
                                                            path: {
                                                              ...entry.validation.path,
                                                              safety: {
                                                                ...entry.validation.path.safety,
                                                                disallowAbsolute:
                                                                  event.target.checked,
                                                              },
                                                            },
                                                          },
                                                        }
                                                      : entry,
                                                ),
                                              }));
                                            }}
                                          />
                                          Disallow absolute
                                        </label>
                                        <label className="flex items-center gap-2">
                                          <input
                                            type="checkbox"
                                            checked={
                                              property.validation.path.safety.preventTraversal
                                            }
                                            onChange={(event) => {
                                              updateSchemaState((current) => ({
                                                ...current,
                                                properties: updateJsonSchemaPropertyAtPath(
                                                  current.properties,
                                                  propertyPath,
                                                  (entry) =>
                                                    entry.validation.kind === "path"
                                                      ? {
                                                          ...entry,
                                                          validation: {
                                                            ...entry.validation,
                                                            path: {
                                                              ...entry.validation.path,
                                                              safety: {
                                                                ...entry.validation.path.safety,
                                                                preventTraversal:
                                                                  event.target.checked,
                                                              },
                                                            },
                                                          },
                                                        }
                                                      : entry,
                                                ),
                                              }));
                                            }}
                                          />
                                          Prevent traversal
                                        </label>
                                      </div>
                                    ) : null}

                                    {propertyValidationWarning ? (
                                      <p className="text-xs text-amber-300/90">
                                        {propertyValidationWarning}
                                      </p>
                                    ) : null}

                                    {property.type === "object" ? (
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between gap-2">
                                          <label className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <input
                                              type="checkbox"
                                              checked={property.additionalProperties}
                                              onChange={(event) => {
                                                updateSchemaState((current) => ({
                                                  ...current,
                                                  properties: updateJsonSchemaPropertyAtPath(
                                                    current.properties,
                                                    propertyPath,
                                                    (entry) => ({
                                                      ...entry,
                                                      additionalProperties: event.target.checked,
                                                    }),
                                                  ),
                                                }));
                                              }}
                                            />
                                            allow additionalProperties
                                          </label>
                                          <Button
                                            type="button"
                                            variant="outline"
                                            className="h-7 rounded-none px-2 text-xs"
                                            onClick={() => {
                                              updateSchemaState((current) => ({
                                                ...current,
                                                properties: updateJsonSchemaPropertyAtPath(
                                                  current.properties,
                                                  propertyPath,
                                                  (entry) => ({
                                                    ...entry,
                                                    properties: [
                                                      ...entry.properties,
                                                      createEmptyJsonSchemaProperty(
                                                        entry.properties,
                                                      ),
                                                    ],
                                                  }),
                                                ),
                                              }));
                                            }}
                                          >
                                            + Add Nested Property
                                          </Button>
                                        </div>

                                        {property.properties.length === 0 ? (
                                          <p className="text-xs text-muted-foreground">
                                            No nested properties.
                                          </p>
                                        ) : (
                                          renderSchemaProperties(property.properties, propertyPath)
                                        )}
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              });

                            return (
                              <section className="chiron-frame-flat space-y-2 p-2">
                                <p className="text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">
                                  JSON Schema Builder
                                </p>

                                <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                                  <select
                                    className="h-8 border border-border/70 bg-background px-2 text-xs"
                                    value={schemaState.rootType}
                                    onBlur={schemaField.handleBlur}
                                    onChange={(event) => {
                                      updateSchemaState((current) => ({
                                        ...current,
                                        rootType: event.target.value as JsonSchemaPropertyType,
                                      }));
                                    }}
                                  >
                                    {JSON_SCHEMA_PROPERTY_TYPES.map((schemaType) => (
                                      <option key={schemaType} value={schemaType}>
                                        root type: {schemaType}
                                      </option>
                                    ))}
                                  </select>

                                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <input
                                      type="checkbox"
                                      checked={schemaState.additionalProperties}
                                      disabled={schemaState.rootType !== "object"}
                                      onChange={(event) => {
                                        updateSchemaState((current) => ({
                                          ...current,
                                          additionalProperties: event.target.checked,
                                        }));
                                      }}
                                    />
                                    allow additionalProperties
                                  </label>
                                </div>

                                {schemaState.rootType === "object" ? (
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">
                                        Properties
                                      </p>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        className="h-7 rounded-none px-2 text-xs"
                                        onClick={() => {
                                          updateSchemaState((current) => ({
                                            ...current,
                                            properties: [
                                              ...current.properties,
                                              createEmptyJsonSchemaProperty(current.properties),
                                            ],
                                          }));
                                        }}
                                      >
                                        + Add Property
                                      </Button>
                                    </div>

                                    {schemaState.properties.length === 0 ? (
                                      <p className="text-xs text-muted-foreground">
                                        No properties yet.
                                      </p>
                                    ) : (
                                      renderSchemaProperties(schemaState.properties)
                                    )}
                                  </div>
                                ) : null}
                              </section>
                            );
                          }}
                        </form.Field>
                      ) : null}
                    </article>
                  );
                })
              )}
            </>
          );
        }}
      </form.Field>
    </>
  );
}

export function toDeterministicJson(input: unknown): string {
  return JSON.stringify(toDeterministicValue(input), null, 2);
}

export function createEmptyMethodologyVersionWorkspaceDraft(
  methodologyKey: string,
): MethodologyVersionWorkspaceDraft {
  return {
    methodologyKey,
    displayName: `${methodologyKey} Draft`,
    factDefinitionsJson: toDeterministicJson([]),
    workUnitTypesJson: toDeterministicJson([]),
    agentTypesJson: toDeterministicJson([]),
    factSchemasJson: toDeterministicJson({}),
    transitionsJson: toDeterministicJson([]),
    workflowsJson: toDeterministicJson([]),
    workflowStepsJson: toDeterministicJson({}),
    transitionWorkflowBindingsJson: toDeterministicJson({}),
    guidanceJson: toDeterministicJson({}),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toDeterministicValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => toDeterministicValue(entry));
  }

  if (!isRecord(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, toDeterministicValue(entry)]),
  );
}

function isUnknownArrayRecord(value: unknown): value is Record<string, unknown[]> {
  if (!isRecord(value)) {
    return false;
  }

  return Object.values(value).every((entry) => Array.isArray(entry));
}

function isStringArrayRecord(value: unknown): value is Record<string, string[]> {
  if (!isRecord(value)) {
    return false;
  }

  return Object.values(value).every(
    (entry) => Array.isArray(entry) && entry.every((item) => typeof item === "string"),
  );
}

function extractFactSchemasByWorkUnit(
  workUnitTypes: readonly unknown[],
): Record<string, unknown[]> {
  const entries: Array<[string, unknown[]]> = [];

  for (const workUnitType of workUnitTypes) {
    if (!isRecord(workUnitType) || typeof workUnitType.key !== "string") {
      continue;
    }

    const factSchemas = Array.isArray(workUnitType.factSchemas) ? workUnitType.factSchemas : [];
    entries.push([workUnitType.key, factSchemas]);
  }

  return Object.fromEntries(entries);
}

function extractStepsByWorkflow(workflows: readonly unknown[]): Record<string, unknown[]> {
  const entries: Array<[string, unknown[]]> = [];

  for (const workflow of workflows) {
    if (!isRecord(workflow) || typeof workflow.key !== "string") {
      continue;
    }

    const steps = Array.isArray(workflow.steps) ? workflow.steps : [];
    entries.push([workflow.key, steps]);
  }

  return Object.fromEntries(entries);
}

function extractWorkflowRowsFromWorkUnits(workUnitTypes: readonly unknown[]): unknown[] {
  const rows: unknown[] = [];

  for (const workUnitType of workUnitTypes) {
    if (!isRecord(workUnitType) || typeof workUnitType.key !== "string") {
      continue;
    }

    const workflows = Array.isArray(workUnitType.workflows) ? workUnitType.workflows : [];
    for (const workflow of workflows) {
      if (!isRecord(workflow)) {
        continue;
      }

      rows.push({
        workUnitTypeKey: workUnitType.key,
        ...workflow,
      });
    }
  }

  return rows;
}

function extractTransitionWorkflowBindingsByTransition(
  workUnitTypes: readonly unknown[],
): Record<string, string[]> {
  const entries: Array<[string, string[]]> = [];

  for (const workUnitType of workUnitTypes) {
    if (!isRecord(workUnitType)) {
      continue;
    }

    const transitions = Array.isArray(workUnitType.lifecycleTransitions)
      ? workUnitType.lifecycleTransitions
      : [];
    for (const transition of transitions) {
      if (!isRecord(transition) || typeof transition.transitionKey !== "string") {
        continue;
      }

      const allowedWorkflowKeys = Array.isArray(transition.allowedWorkflowKeys)
        ? transition.allowedWorkflowKeys.filter(
            (entry): entry is string => typeof entry === "string",
          )
        : [];

      entries.push([transition.transitionKey, [...allowedWorkflowKeys].sort()]);
    }
  }

  return Object.fromEntries(entries);
}

function extractTransitionRows(workUnitTypes: readonly unknown[]): unknown[] {
  const rows: unknown[] = [];

  for (const workUnitType of workUnitTypes) {
    if (!isRecord(workUnitType) || typeof workUnitType.key !== "string") {
      continue;
    }

    const lifecycleTransitions = Array.isArray(workUnitType.lifecycleTransitions)
      ? workUnitType.lifecycleTransitions
      : [];

    for (const lifecycleTransition of lifecycleTransitions) {
      if (!isRecord(lifecycleTransition)) {
        continue;
      }

      rows.push({
        workUnitTypeKey: workUnitType.key,
        ...lifecycleTransition,
      });
    }
  }

  return rows;
}

function mergeWorkflowDataIntoWorkUnits(
  workUnitTypes: readonly unknown[],
  workflows: readonly unknown[],
  stepsByWorkflow: Record<string, unknown[]>,
  transitionWorkflowBindings: Record<string, string[]>,
): unknown[] {
  const workflowsByWorkUnit = new Map<string, unknown[]>();

  for (const workflow of workflows) {
    if (!isRecord(workflow) || typeof workflow.workUnitTypeKey !== "string") {
      continue;
    }

    const existing = workflowsByWorkUnit.get(workflow.workUnitTypeKey) ?? [];
    existing.push({
      ...workflow,
      steps:
        typeof workflow.key === "string"
          ? (stepsByWorkflow[workflow.key] ?? [])
          : (workflow.steps ?? []),
    });
    workflowsByWorkUnit.set(workflow.workUnitTypeKey, existing);
  }

  return workUnitTypes.map((workUnitType) => {
    if (!isRecord(workUnitType) || typeof workUnitType.key !== "string") {
      return workUnitType;
    }

    const lifecycleTransitions = Array.isArray(workUnitType.lifecycleTransitions)
      ? workUnitType.lifecycleTransitions.map((transition) => {
          if (!isRecord(transition) || typeof transition.transitionKey !== "string") {
            return transition;
          }

          if (
            Array.isArray(transition.allowedWorkflowKeys) &&
            transition.allowedWorkflowKeys.length > 0
          ) {
            return transition;
          }

          return {
            ...transition,
            allowedWorkflowKeys: transitionWorkflowBindings[transition.transitionKey] ?? [],
          };
        })
      : [];

    if (Array.isArray(workUnitType.workflows) && workUnitType.workflows.length > 0) {
      return {
        ...workUnitType,
        lifecycleTransitions,
      };
    }

    return {
      ...workUnitType,
      lifecycleTransitions,
      workflows: workflowsByWorkUnit.get(workUnitType.key) ?? [],
    };
  });
}

export function createDraftFromProjection(
  methodologyKey: string,
  projection: DraftProjectionShape,
): MethodologyVersionWorkspaceDraft {
  const workUnitTypes = Array.isArray(projection.workUnitTypes) ? projection.workUnitTypes : [];
  const workflows = Array.isArray(projection.workflows) ? projection.workflows : [];
  const enrichedWorkUnitTypes = mergeWorkflowDataIntoWorkUnits(
    workUnitTypes,
    workflows,
    extractStepsByWorkflow(workflows),
    Object.fromEntries(
      Object.entries(projection.transitionWorkflowBindings ?? {}).map(
        ([transitionKey, workflowKeys]) => [transitionKey, [...workflowKeys]],
      ),
    ),
  );

  return {
    methodologyKey,
    displayName: projection.displayName,
    factDefinitionsJson: toDeterministicJson(
      Array.isArray(projection.factDefinitions) ? projection.factDefinitions : [],
    ),
    workUnitTypesJson: toDeterministicJson(enrichedWorkUnitTypes),
    agentTypesJson: toDeterministicJson(
      Array.isArray(projection.agentTypes) ? projection.agentTypes : [],
    ),
    factSchemasJson: toDeterministicJson(extractFactSchemasByWorkUnit(enrichedWorkUnitTypes)),
    transitionsJson: toDeterministicJson(extractTransitionRows(enrichedWorkUnitTypes)),
    workflowsJson: toDeterministicJson(extractWorkflowRowsFromWorkUnits(enrichedWorkUnitTypes)),
    workflowStepsJson: toDeterministicJson(
      extractStepsByWorkflow(extractWorkflowRowsFromWorkUnits(enrichedWorkUnitTypes)),
    ),
    transitionWorkflowBindingsJson: toDeterministicJson(
      extractTransitionWorkflowBindingsByTransition(enrichedWorkUnitTypes),
    ),
    guidanceJson: toDeterministicJson(projection.guidance ?? {}),
  };
}

function parseJson(
  field: keyof MethodologyVersionWorkspaceDraft,
  value: string,
  diagnostics: WorkspaceParseDiagnostic[],
): unknown {
  const parsedResult = Result.try(() => JSON.parse(value));
  if (parsedResult.isErr()) {
    diagnostics.push({
      field,
      message: "Invalid JSON format. Fix JSON syntax and retry save.",
      group: "field",
    });
    return null;
  }

  return parsedResult.value;
}

function mergeFactSchemasIntoWorkUnits(
  workUnitTypes: readonly unknown[],
  factSchemasByWorkUnit: Record<string, unknown[]>,
): unknown[] {
  return workUnitTypes.map((workUnitType) => {
    if (!isRecord(workUnitType) || typeof workUnitType.key !== "string") {
      return workUnitType;
    }

    if (Array.isArray(workUnitType.factSchemas) && workUnitType.factSchemas.length > 0) {
      return workUnitType;
    }

    return {
      ...workUnitType,
      factSchemas: factSchemasByWorkUnit[workUnitType.key] ?? [],
    };
  });
}

function mergeTransitionsIntoWorkUnits(
  workUnitTypes: readonly unknown[],
  transitionRows: readonly unknown[],
): unknown[] {
  const byWorkUnit = new Map<string, unknown[]>();

  for (const transitionRow of transitionRows) {
    if (!isRecord(transitionRow) || typeof transitionRow.workUnitTypeKey !== "string") {
      continue;
    }

    const existing = byWorkUnit.get(transitionRow.workUnitTypeKey) ?? [];
    existing.push(
      Object.fromEntries(
        Object.entries(transitionRow).filter(([key]) => key !== "workUnitTypeKey"),
      ),
    );
    byWorkUnit.set(transitionRow.workUnitTypeKey, existing);
  }

  return workUnitTypes.map((workUnitType) => {
    if (!isRecord(workUnitType) || typeof workUnitType.key !== "string") {
      return workUnitType;
    }

    if (
      Array.isArray(workUnitType.lifecycleTransitions) &&
      workUnitType.lifecycleTransitions.length > 0
    ) {
      return workUnitType;
    }

    const lifecycleTransitions = byWorkUnit.get(workUnitType.key);
    if (!lifecycleTransitions) {
      return workUnitType;
    }

    return {
      ...workUnitType,
      lifecycleTransitions,
    };
  });
}

export function parseWorkspaceDraftForPersistence(
  draft: MethodologyVersionWorkspaceDraft,
): WorkspacePersistencePayload {
  const diagnostics: WorkspaceParseDiagnostic[] = [];

  const factDefinitionsValue = parseJson(
    "factDefinitionsJson",
    draft.factDefinitionsJson,
    diagnostics,
  );
  const workUnitTypesValue = parseJson("workUnitTypesJson", draft.workUnitTypesJson, diagnostics);
  const agentTypesValue = parseJson("agentTypesJson", draft.agentTypesJson, diagnostics);
  const factSchemasValue = parseJson("factSchemasJson", draft.factSchemasJson, diagnostics);
  const transitionsValue = parseJson("transitionsJson", draft.transitionsJson, diagnostics);
  const workflowsValue = parseJson("workflowsJson", draft.workflowsJson, diagnostics);
  const workflowStepsValue = parseJson("workflowStepsJson", draft.workflowStepsJson, diagnostics);
  const bindingsValue = parseJson(
    "transitionWorkflowBindingsJson",
    draft.transitionWorkflowBindingsJson,
    diagnostics,
  );
  const guidanceValue = parseJson("guidanceJson", draft.guidanceJson, diagnostics);

  const factDefinitions = Array.isArray(factDefinitionsValue) ? factDefinitionsValue : [];
  const workUnitTypes = Array.isArray(workUnitTypesValue) ? workUnitTypesValue : [];
  const agentTypes = Array.isArray(agentTypesValue) ? agentTypesValue : [];
  const factSchemasByWorkUnit = isUnknownArrayRecord(factSchemasValue) ? factSchemasValue : {};
  const transitions = Array.isArray(transitionsValue) ? transitionsValue : [];
  const workflows = Array.isArray(workflowsValue) ? workflowsValue : [];
  const workflowSteps = isUnknownArrayRecord(workflowStepsValue) ? workflowStepsValue : {};
  const transitionWorkflowBindings = isStringArrayRecord(bindingsValue) ? bindingsValue : {};
  const guidance = isRecord(guidanceValue) ? guidanceValue : undefined;
  const canonicalWorkUnitTypes = mergeWorkflowDataIntoWorkUnits(
    mergeTransitionsIntoWorkUnits(
      mergeFactSchemasIntoWorkUnits(workUnitTypes, factSchemasByWorkUnit),
      transitions,
    ),
    workflows,
    workflowSteps,
    transitionWorkflowBindings,
  );

  if (!Array.isArray(factDefinitionsValue)) {
    diagnostics.push({
      field: "factDefinitionsJson",
      message: "Expected a JSON array of methodology fact definitions.",
      group: "field",
    });
  }
  if (!Array.isArray(workUnitTypesValue)) {
    diagnostics.push({
      field: "workUnitTypesJson",
      message: "Expected a JSON array of work unit definitions.",
      group: "field",
    });
  }
  if (!Array.isArray(agentTypesValue)) {
    diagnostics.push({
      field: "agentTypesJson",
      message: "Expected a JSON array of agent type definitions.",
      group: "field",
    });
  }
  if (!isUnknownArrayRecord(factSchemasValue)) {
    diagnostics.push({
      field: "factSchemasJson",
      message: "Expected a JSON object map: workUnitKey -> fact schema array.",
      group: "field",
    });
  }
  if (!Array.isArray(transitionsValue)) {
    diagnostics.push({
      field: "transitionsJson",
      message: "Expected a JSON array of transitions.",
      group: "field",
    });
  }
  if (!Array.isArray(workflowsValue)) {
    diagnostics.push({
      field: "workflowsJson",
      message: "Expected a JSON array of workflow definitions.",
      group: "field",
    });
  }
  if (!isUnknownArrayRecord(workflowStepsValue)) {
    diagnostics.push({
      field: "workflowStepsJson",
      message: "Expected a JSON object map: workflowKey -> step array.",
      group: "field",
    });
  }
  if (!isStringArrayRecord(bindingsValue)) {
    diagnostics.push({
      field: "transitionWorkflowBindingsJson",
      message: "Expected a JSON object map: transitionKey -> workflow key array.",
      group: "field",
    });
  }

  return {
    lifecycle: {
      workUnitTypes: canonicalWorkUnitTypes,
      agentTypes,
    },
    workflows: {
      workflows: extractWorkflowRowsFromWorkUnits(canonicalWorkUnitTypes),
      transitionWorkflowBindings:
        extractTransitionWorkflowBindingsByTransition(canonicalWorkUnitTypes),
      guidance,
      factDefinitions,
    },
    diagnostics,
  };
}

function scopeToWorkspaceField(scope: string): keyof MethodologyVersionWorkspaceDraft {
  if (scope.includes("factDefinitions")) {
    return "factDefinitionsJson";
  }
  if (scope.includes("factSchemas")) {
    return "factSchemasJson";
  }
  if (scope.includes("transitionWorkflowBindings")) {
    return "transitionWorkflowBindingsJson";
  }
  if (scope.includes("workflow") && scope.includes("step")) {
    return "workflowStepsJson";
  }
  if (scope.includes("workflow") || scope.includes("guidance")) {
    return "workflowsJson";
  }
  if (scope.includes("transition") || scope.includes("lifecycle")) {
    return "transitionsJson";
  }
  if (scope.includes("workUnit")) {
    return "workUnitTypesJson";
  }
  return "displayName";
}

function deriveDiagnosticGroup(scope: string): "field" | "work unit" | "transition" | "workflow" {
  if (scope.includes("workflow")) {
    return "workflow";
  }
  if (scope.includes("transition") || scope.includes("lifecycle")) {
    return "transition";
  }
  if (scope.includes("workUnit") || scope.includes("agentTypes") || scope.includes("factSchemas")) {
    return "work unit";
  }
  if (scope.includes("factDefinitions")) {
    return "field";
  }
  return "field";
}

function deriveFocusTarget(scope: string): WorkspaceFocusTarget | undefined {
  if (scope.startsWith("definition.workflows.")) {
    const workflowScope = scope.slice("definition.workflows.".length);
    const workflowKey = workflowScope
      .replace(/\.steps\..*$/, "")
      .replace(/\.edges\..*$/, "")
      .replace(/\.entry$/, "")
      .replace(/\.terminal$/, "")
      .trim();

    if (!workflowKey) {
      return undefined;
    }

    return {
      level: "L3",
      workflowKey,
      nodeId: `wf:${workflowKey}`,
    };
  }

  const transitionScopeMatch = /definition\.transitionWorkflowBindings\.([^.\s]+)/.exec(scope);
  if (transitionScopeMatch?.[1]) {
    return {
      level: "L1",
      transitionKey: transitionScopeMatch[1],
    };
  }

  if (scope.includes("workUnit") || scope.includes("agentTypes") || scope.includes("factSchemas")) {
    return { level: "L1" };
  }

  if (scope.includes("transition") || scope.includes("lifecycle")) {
    return { level: "L1" };
  }

  return undefined;
}

function formatValidationDiagnostic(diagnostic: ValidationDiagnosticShape): string {
  const required = diagnostic.required !== undefined ? JSON.stringify(diagnostic.required) : "n/a";
  const observed = diagnostic.observed !== undefined ? JSON.stringify(diagnostic.observed) : "n/a";
  const remediation = diagnostic.remediation ? ` remediation: ${diagnostic.remediation}` : "";
  return `${diagnostic.code} required: ${required} observed: ${observed}${remediation}`;
}

function compareDiagnosticsDeterministically(
  left: WorkspaceParseDiagnostic,
  right: WorkspaceParseDiagnostic,
): number {
  const leftGroup = left.group ?? "field";
  const rightGroup = right.group ?? "field";
  if (leftGroup !== rightGroup) {
    return DIAGNOSTIC_GROUP_ORDER.indexOf(leftGroup) - DIAGNOSTIC_GROUP_ORDER.indexOf(rightGroup);
  }

  if (left.field !== right.field) {
    return left.field.localeCompare(right.field);
  }

  if ((left.scope ?? "") !== (right.scope ?? "")) {
    return (left.scope ?? "").localeCompare(right.scope ?? "");
  }

  return left.message.localeCompare(right.message);
}

export function mapValidationDiagnosticsToWorkspaceDiagnostics(
  input:
    | readonly ValidationDiagnosticShape[]
    | { diagnostics: readonly ValidationDiagnosticShape[] },
): WorkspaceParseDiagnostic[] {
  const diagnostics = "diagnostics" in input ? input.diagnostics : input;

  return diagnostics
    .map((diagnostic: ValidationDiagnosticShape) => {
      const focusTarget = deriveFocusTarget(diagnostic.scope);

      return {
        field: scopeToWorkspaceField(diagnostic.scope),
        message: formatValidationDiagnostic(diagnostic),
        blocking: diagnostic.blocking ?? true,
        group: deriveDiagnosticGroup(diagnostic.scope),
        scope: diagnostic.scope,
        ...(focusTarget ? { focusTarget } : {}),
      };
    })
    .sort(compareDiagnosticsDeterministically);
}

export function MethodologyVersionWorkspace({
  draft,
  parseDiagnostics,
  isSaving,
  onChange,
  onSave,
}: MethodologyVersionWorkspaceProps) {
  const parsedForGraph = useMemo(() => parseWorkspaceDraftForPersistence(draft), [draft]);
  const parsedMethodologyFacts = useMemo(
    () => parseFactDefinitionsWithStatus(draft.factDefinitionsJson),
    [draft.factDefinitionsJson],
  );
  const [showWorkspaceContext, setShowWorkspaceContext] = useState(false);
  const [focusTarget, setFocusTarget] = useState<WorkspaceFocusTarget | null>(null);
  const [focusSequence, setFocusSequence] = useState(0);
  const [factsDirty, setFactsDirty] = useState(false);
  const focusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const workUnitCount = parsedForGraph.lifecycle.workUnitTypes.length;
  const workflowCount = parsedForGraph.workflows.workflows.length;
  const bindingCount = Object.keys(parsedForGraph.workflows.transitionWorkflowBindings).length;
  const methodologyFacts = parsedMethodologyFacts.facts;
  const workUnitFactsByKey = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(extractFactSchemasByWorkUnit(parsedForGraph.lifecycle.workUnitTypes)).map(
          ([workUnitKey, facts]) => [
            workUnitKey,
            facts.map((fact, index) =>
              toFactEditorValue(fact, `${workUnitKey}-fact-schema-${index}`),
            ),
          ],
        ),
      ) as Record<string, FactEditorValue[]>,
    [parsedForGraph.lifecycle.workUnitTypes],
  );
  const factEditorWarnings = useMemo(() => {
    const warnings: string[] = [];
    if (!parsedMethodologyFacts.valid) {
      warnings.push(
        "Methodology fact JSON could not be parsed. The editor is showing an empty fallback until you make a valid edit.",
      );
    }
    if (parseDiagnostics.some((diagnostic) => diagnostic.field === "factSchemasJson")) {
      warnings.push(
        "Work-unit fact schema JSON is out of sync with canonical work-unit data. The editor is rendering canonical work-unit facts until you save.",
      );
    }

    return warnings;
  }, [parseDiagnostics, parsedMethodologyFacts.valid]);
  const workUnitKeys = useMemo(
    () =>
      parsedForGraph.lifecycle.workUnitTypes
        .map((workUnit) =>
          isRecord(workUnit) && typeof workUnit.key === "string" ? workUnit.key : null,
        )
        .filter((value): value is string => Boolean(value)),
    [parsedForGraph.lifecycle.workUnitTypes],
  );
  const [activeWorkUnitKey, setActiveWorkUnitKey] = useState<string>("");

  useEffect(() => {
    if (workUnitKeys.length === 0) {
      setActiveWorkUnitKey("");
      return;
    }
    if (!activeWorkUnitKey || !workUnitKeys.includes(activeWorkUnitKey)) {
      setActiveWorkUnitKey(workUnitKeys[0] ?? "");
    }
  }, [activeWorkUnitKey, workUnitKeys]);

  const activeWorkUnitFacts = workUnitFactsByKey[activeWorkUnitKey] ?? [];

  const updateMethodologyFacts = (nextFacts: FactEditorValue[]) => {
    setFactsDirty(true);
    onChange("factDefinitionsJson", serializeFacts(nextFacts));
  };

  const updateWorkUnitFacts = (workUnitKey: string, nextFacts: FactEditorValue[]) => {
    setFactsDirty(true);
    const parsedWorkUnits = parseJsonSafely(draft.workUnitTypesJson);
    if (!Array.isArray(parsedWorkUnits)) {
      return;
    }

    const nextWorkUnits = parsedWorkUnits.map((entry) => {
      if (!isRecord(entry) || entry.key !== workUnitKey) {
        return entry;
      }

      return {
        ...entry,
        factSchemas: factsToSerializable(nextFacts),
      };
    });

    const nextFactSchemaMap = extractFactSchemasByWorkUnit(nextWorkUnits);
    onChange("workUnitTypesJson", toDeterministicJson(nextWorkUnits));
    onChange("factSchemasJson", toDeterministicJson(nextFactSchemaMap));
  };

  const handleSaveFacts = () => {
    onSave();
    setFactsDirty(false);
  };

  const groupedDiagnostics = useMemo(() => {
    const groups: Record<(typeof DIAGNOSTIC_GROUP_ORDER)[number], WorkspaceParseDiagnostic[]> = {
      field: [],
      "work unit": [],
      transition: [],
      workflow: [],
    };

    for (const diagnostic of parseDiagnostics) {
      groups[diagnostic.group ?? "field"].push(diagnostic);
    }

    return groups;
  }, [parseDiagnostics]);

  useEffect(() => {
    if (parseDiagnostics.length === 0) {
      setFocusTarget(null);
      setFocusSequence(0);
    }
  }, [parseDiagnostics.length]);

  useEffect(() => {
    return () => {
      if (focusTimeoutRef.current !== null) {
        clearTimeout(focusTimeoutRef.current);
        focusTimeoutRef.current = null;
      }
    };
  }, []);

  const focusDiagnosticField = (field: keyof MethodologyVersionWorkspaceDraft) => {
    if (field === "methodologyKey" || field === "displayName") {
      setShowWorkspaceContext(true);
    }

    const elementId = FIELD_ELEMENT_IDS[field];
    if (focusTimeoutRef.current !== null) {
      clearTimeout(focusTimeoutRef.current);
      focusTimeoutRef.current = null;
    }

    focusTimeoutRef.current = setTimeout(() => {
      const element = document.getElementById(elementId);
      if (element instanceof HTMLElement) {
        element.focus();
      }
      focusTimeoutRef.current = null;
    }, 0);
  };

  const handleDiagnosticFocus = (diagnostic: WorkspaceParseDiagnostic) => {
    focusDiagnosticField(diagnostic.field);
    if (diagnostic.focusTarget) {
      setFocusTarget(diagnostic.focusTarget);
      setFocusSequence((current) => current + 1);
    }
  };

  return (
    <div className="space-y-5">
      <section className="chiron-frame-flat chiron-tone-canvas p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="chiron-tone-kicker text-[0.68rem] uppercase tracking-[0.18em]">
              Draft / Non-Executable
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Graph-first authoring mode. Runtime execution remains deferred in Epic 2.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="chiron-frame-flat px-2 py-1 text-[0.64rem] uppercase tracking-[0.16em] text-muted-foreground">
              Work Units {workUnitCount}
            </span>
            <span className="chiron-frame-flat px-2 py-1 text-[0.64rem] uppercase tracking-[0.16em] text-muted-foreground">
              Workflows {workflowCount}
            </span>
            <span className="chiron-frame-flat px-2 py-1 text-[0.64rem] uppercase tracking-[0.16em] text-muted-foreground">
              Bound {bindingCount}
            </span>
            <Button disabled={isSaving} onClick={onSave} className="rounded-none">
              {isSaving ? "Saving..." : "Save Draft"}
            </Button>
          </div>
        </div>
      </section>

      <VersionWorkspaceGraph
        draft={draft}
        parsed={parsedForGraph}
        onChange={onChange}
        focusTarget={focusTarget}
        focusTargetSequence={focusSequence}
      />

      <section className="chiron-frame-flat chiron-tone-context p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="chiron-tone-kicker text-[0.68rem] uppercase tracking-[0.18em]">
            Workspace Context and Runtime
          </p>
          <Button
            type="button"
            variant="outline"
            className="rounded-none h-8 px-2 text-xs"
            onClick={() => {
              setShowWorkspaceContext((current) => !current);
            }}
          >
            {showWorkspaceContext ? "Hide Context" : "Show Context"}
          </Button>
        </div>

        {showWorkspaceContext ? (
          <div className="mt-3 space-y-3">
            <section className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm">
                <span className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                  Methodology Key
                </span>
                <input
                  id={FIELD_ELEMENT_IDS.methodologyKey}
                  aria-label="Methodology Key"
                  className="border border-border/70 bg-background px-2 py-1 text-sm"
                  value={draft.methodologyKey}
                  onChange={(event) => {
                    onChange("methodologyKey", event.target.value);
                  }}
                />
              </label>

              <label className="flex flex-col gap-2 text-sm">
                <span className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                  Display Name
                </span>
                <input
                  id={FIELD_ELEMENT_IDS.displayName}
                  aria-label="Display Name"
                  className="border border-border/70 bg-background px-2 py-1 text-sm"
                  value={draft.displayName}
                  onChange={(event) => {
                    onChange("displayName", event.target.value);
                  }}
                />
              </label>
            </section>

            <section className="chiron-frame-flat chiron-tone-runtime p-3">
              <p className="chiron-tone-kicker text-[0.68rem] uppercase tracking-[0.18em]">
                Runtime
              </p>
              <div className="mt-3 flex items-center gap-3">
                <Button aria-disabled="true" disabled variant="outline" className="rounded-none">
                  Runtime Execution (Epic 3+)
                </Button>
                <p className="text-xs text-muted-foreground">{RUNTIME_DEFERRED_RATIONALE}</p>
              </div>
            </section>
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            Hidden by default to keep the graph and inspector as the primary workspace.
          </p>
        )}
      </section>

      <section className="chiron-frame-flat chiron-tone-contracts space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="chiron-tone-kicker font-geist-pixel-grid text-[0.74rem] uppercase tracking-[0.2em]">
              Fact Authoring Studio
            </p>
            <p className="text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground">
              {factsDirty ? "Unsaved fact edits" : "Facts synced"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-xs text-muted-foreground">
              Structured forms for methodology and work-unit facts. No raw JSON required.
            </p>
            <Button
              type="button"
              variant="outline"
              className="h-8 rounded-none px-3 text-xs"
              onClick={handleSaveFacts}
              disabled={isSaving || !factsDirty || factEditorWarnings.length > 0}
            >
              {isSaving ? "Saving..." : "Save Facts"}
            </Button>
          </div>
        </div>

        {factEditorWarnings.length > 0 ? (
          <div className="chiron-frame-flat border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            {factEditorWarnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-2">
          <section
            id={FIELD_ELEMENT_IDS.factDefinitionsJson}
            className="chiron-frame-flat space-y-3 p-3"
          >
            <FactListEditor
              heading="Methodology Facts"
              facts={methodologyFacts}
              onChange={updateMethodologyFacts}
              addLabel="+ Add Fact"
              emptyMessage="No methodology facts yet."
              rowKeyPrefix="methodology-fact"
            />
          </section>

          <section
            id={FIELD_ELEMENT_IDS.factSchemasJson}
            className="chiron-frame-flat space-y-3 p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                Work-Unit Scope
              </p>
              <div className="flex items-center gap-2">
                <select
                  className="h-7 min-w-36 border border-border/70 bg-background px-2 text-xs"
                  value={activeWorkUnitKey}
                  onChange={(event) => {
                    setActiveWorkUnitKey(event.target.value);
                  }}
                >
                  {workUnitKeys.map((workUnitKey) => (
                    <option key={workUnitKey} value={workUnitKey}>
                      {workUnitKey}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {activeWorkUnitKey.length === 0 ? (
              <p className="text-xs text-muted-foreground">Create a work unit first.</p>
            ) : (
              <FactListEditor
                heading="Work-Unit Fact Schemas"
                facts={activeWorkUnitFacts}
                onChange={(nextFacts) => {
                  updateWorkUnitFacts(activeWorkUnitKey, nextFacts);
                }}
                addLabel="+ Add Schema"
                emptyMessage="No fact schemas for this work unit yet."
                rowKeyPrefix={`${activeWorkUnitKey}-fact`}
              />
            )}
          </section>
        </div>
      </section>

      {parseDiagnostics.length > 0 ? (
        <section className="border border-destructive/70 bg-background p-4">
          <p className="text-[0.68rem] uppercase tracking-[0.18em] text-destructive">
            Draft Diagnostics
          </p>
          <div className="mt-3 space-y-3">
            {DIAGNOSTIC_GROUP_ORDER.map((group) => {
              const diagnostics = groupedDiagnostics[group];
              if (diagnostics.length === 0) {
                return null;
              }

              return (
                <section key={group} className="chiron-cut-frame px-3 py-2" data-variant="surface">
                  <p className="text-[0.64rem] uppercase tracking-[0.14em] text-destructive">
                    {DIAGNOSTIC_GROUP_LABEL[group]} ({diagnostics.length})
                  </p>
                  <ul className="mt-2 space-y-1 text-xs">
                    {diagnostics.map((diagnostic) => (
                      <li
                        key={`${diagnostic.group ?? "field"}:${diagnostic.field}:${diagnostic.scope ?? ""}:${diagnostic.message}`}
                      >
                        <button
                          type="button"
                          className="text-left underline-offset-2 hover:underline"
                          onClick={() => {
                            handleDiagnosticFocus(diagnostic);
                          }}
                        >
                          {diagnostic.field}: {diagnostic.message}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="chiron-frame-flat chiron-tone-navigation p-3">
        <p className="text-xs text-muted-foreground">
          Save writes draft lifecycle/workflow contracts and reloads deterministic state.
        </p>
      </section>
    </div>
  );
}
