import { useEffect, useMemo, useState } from "react";
import { useForm } from "@tanstack/react-form";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type RuntimePrimitiveFactType = "string" | "number" | "boolean" | "json" | "work_unit";

export type RuntimeFactOption = {
  readonly value: string;
  readonly label: string;
  readonly description?: string;
};

export type RuntimePrimitiveDefinition = {
  readonly factType: RuntimePrimitiveFactType;
  readonly validation?: unknown;
};

export type RuntimeDraftSpecFieldDefinition = {
  readonly workUnitFactDefinitionId: string;
  readonly label: string;
  readonly description?: string;
  readonly definition: RuntimePrimitiveDefinition;
};

export type RuntimeDraftSpecArtifactDefinition = {
  readonly slotDefinitionId: string;
  readonly label: string;
  readonly description?: string;
};

export type RuntimeDialogEditor =
  | {
      readonly kind: "primitive";
      readonly definition: RuntimePrimitiveDefinition;
      readonly workUnitOptions?: readonly RuntimeFactOption[];
    }
  | {
      readonly kind: "work_unit";
      readonly options: readonly RuntimeFactOption[];
    }
  | {
      readonly kind: "bound_fact";
      readonly definition: RuntimePrimitiveDefinition;
      readonly instanceLabel: string;
      readonly instanceOptions?: readonly RuntimeFactOption[];
      readonly workUnitOptions?: readonly RuntimeFactOption[];
    }
  | {
      readonly kind: "workflow_ref_fact";
      readonly options: readonly RuntimeFactOption[];
    }
  | {
      readonly kind: "artifact_slot_reference_fact" | "artifact_slot_reference_fact";
      readonly slotDefinitionId: string;
      readonly slotLabel: string;
      readonly options: readonly RuntimeFactOption[];
    }
  | {
      readonly kind: "work_unit_draft_spec_fact";
      readonly workUnitDefinitionId: string;
      readonly workUnitLabel: string;
      readonly fields: readonly RuntimeDraftSpecFieldDefinition[];
      readonly artifacts: readonly RuntimeDraftSpecArtifactDefinition[];
      readonly workUnitOptions?: readonly RuntimeFactOption[];
    };

type RuntimePrimitiveDraft = {
  readonly factType: RuntimePrimitiveFactType;
  readonly textValue: string;
  readonly booleanValue: boolean;
  readonly booleanMode?: "unset" | "true" | "false";
  readonly workUnitId: string;
  readonly jsonFields?: RuntimeJsonFieldDraft[];
};

type RuntimeJsonFieldDraft = {
  readonly key: string;
  readonly label: string;
  readonly type: "string" | "number" | "boolean";
  readonly cardinality: "one" | "many";
  readonly description?: string;
  readonly validation?: unknown;
  readonly values: string[];
};

type RuntimeDraftSpecFieldDraft = {
  readonly workUnitFactDefinitionId: string;
  readonly included: boolean;
  readonly label: string;
  readonly description?: string | undefined;
  readonly draft: RuntimePrimitiveDraft;
};

type RuntimeDraftSpecArtifactDraft = {
  readonly slotDefinitionId: string;
  readonly included: boolean;
  readonly label: string;
  readonly description?: string | undefined;
  readonly relativePath: string;
  readonly sourceContextFactDefinitionId: string;
  readonly clear: boolean;
};

type RuntimeDialogDraft = {
  readonly kind: RuntimeDialogEditor["kind"];
  readonly primitive?: RuntimePrimitiveDraft | undefined;
  readonly workUnitId?: string | undefined;
  readonly instanceId?: string | undefined;
  readonly workflowDefinitionId?: string | undefined;
  readonly artifactInstanceId?: string | undefined;
  readonly slotDefinitionId?: string | undefined;
  readonly workUnitDefinitionId?: string | undefined;
  readonly fields?: RuntimeDraftSpecFieldDraft[] | undefined;
  readonly artifacts?: RuntimeDraftSpecArtifactDraft[] | undefined;
};

type RuntimeFactValueDialogProps = {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly title: string;
  readonly description: string;
  readonly submitLabel: string;
  readonly pendingLabel?: string;
  readonly editor: RuntimeDialogEditor;
  readonly initialValue?: unknown;
  readonly isPending: boolean;
  readonly errorMessage?: string | null;
  readonly onSubmit: (value: unknown) => Promise<void> | void;
  readonly testId?: string;
};

type RuntimeConfirmDialogProps = {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly title: string;
  readonly description: string;
  readonly confirmLabel: string;
  readonly pendingLabel?: string;
  readonly isPending: boolean;
  readonly onConfirm: () => Promise<void> | void;
  readonly errorMessage?: string | null;
  readonly testId?: string;
};

type RuntimeParseResult =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly error: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const humanizeKey = (value: string) =>
  value
    .split(/[_\-.]+/)
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

const getPathValidationInfo = (validation: unknown): { pathKind: "file" | "directory" } | null => {
  if (!isRecord(validation) || validation.kind !== "path") {
    return null;
  }

  if (isRecord(validation.path)) {
    return {
      pathKind: validation.path.pathKind === "directory" ? "directory" : "file",
    };
  }

  return {
    pathKind: validation.pathKind === "directory" ? "directory" : "file",
  };
};

const getJsonSchemaPropertyValidation = (property: unknown): unknown => {
  if (!isRecord(property)) {
    return undefined;
  }

  if ("x-validation" in property) {
    return property["x-validation"];
  }

  return property.validation;
};

const formatPrimitiveText = (value: unknown) => {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
};

const getAllowedPrimitiveOptions = (
  definition: RuntimePrimitiveDefinition,
): ReadonlyArray<{ value: string; label: string; rawValue: string | number | boolean }> => {
  if (!isRecord(definition.validation) || definition.validation.kind !== "allowed-values") {
    return [];
  }

  if (!Array.isArray(definition.validation.values)) {
    return [];
  }

  return definition.validation.values.flatMap((candidate) => {
    if (
      typeof candidate !== "string" &&
      typeof candidate !== "number" &&
      typeof candidate !== "boolean"
    ) {
      return [];
    }

    return [
      {
        value: String(candidate),
        label: String(candidate),
        rawValue: candidate,
      },
    ];
  });
};

const getStructuredJsonFields = (
  definition: RuntimePrimitiveDefinition,
): ReadonlyArray<{
  key: string;
  label?: string;
  type: "string" | "number" | "boolean";
  cardinality: "one" | "many";
  description?: string;
  validation?: unknown;
}> => {
  if (!isRecord(definition.validation) || definition.validation.kind !== "json-schema") {
    return [];
  }

  const schema = isRecord(definition.validation.schema) ? definition.validation.schema : null;
  const schemaProperties = isRecord(schema?.properties) ? schema.properties : null;
  const subSchema = isRecord(definition.validation.subSchema)
    ? definition.validation.subSchema
    : null;

  if (subSchema && subSchema.type === "object" && Array.isArray(subSchema.fields)) {
    return subSchema.fields.flatMap((field) => {
      if (!isRecord(field) || typeof field.key !== "string") {
        return [];
      }

      if (field.type !== "string" && field.type !== "number" && field.type !== "boolean") {
        return [];
      }

      const propertyValidation = schemaProperties
        ? getJsonSchemaPropertyValidation(schemaProperties[field.key])
        : undefined;

      return [
        {
          key: field.key,
          ...(typeof field.displayName === "string" ? { label: field.displayName } : {}),
          type: field.type,
          cardinality: field.cardinality === "many" ? "many" : "one",
          ...(isRecord(field.description) && typeof field.description.markdown === "string"
            ? { description: field.description.markdown }
            : {}),
          ...((field.validation ?? propertyValidation) !== undefined
            ? { validation: field.validation ?? propertyValidation }
            : {}),
        },
      ];
    });
  }

  if (!schema || schema.type !== "object" || !schemaProperties) {
    return [];
  }

  return Object.entries(schemaProperties).flatMap(([key, property]) => {
    if (!isRecord(property)) {
      return [];
    }

    const propertyType = property.type;
    if (propertyType === "string" || propertyType === "number" || propertyType === "boolean") {
      return [
        {
          key,
          ...(typeof property.title === "string" ? { label: property.title } : {}),
          type: propertyType,
          cardinality: "one" as const,
          ...(typeof property.description === "string"
            ? { description: property.description }
            : {}),
          ...(getJsonSchemaPropertyValidation(property) !== undefined
            ? { validation: getJsonSchemaPropertyValidation(property) }
            : {}),
        },
      ];
    }

    if (
      propertyType === "array" &&
      isRecord(property.items) &&
      (property.items.type === "string" ||
        property.items.type === "number" ||
        property.items.type === "boolean")
    ) {
      return [
        {
          key,
          ...(typeof property.title === "string" ? { label: property.title } : {}),
          type: property.items.type,
          cardinality: "many" as const,
          ...(typeof property.description === "string"
            ? { description: property.description }
            : {}),
          ...(getJsonSchemaPropertyValidation(property.items) !== undefined
            ? { validation: getJsonSchemaPropertyValidation(property.items) }
            : getJsonSchemaPropertyValidation(property) !== undefined
              ? { validation: getJsonSchemaPropertyValidation(property) }
              : {}),
        },
      ];
    }

    return [];
  });
};

const stringifyStructuredJsonValue = (
  value: unknown,
  fieldType: "string" | "number" | "boolean",
): string => {
  if (fieldType === "boolean") {
    return value === true ? "true" : value === false ? "false" : "";
  }

  if (value === null || value === undefined) {
    return "";
  }

  return typeof value === "string" ? value : String(value);
};

const parseStructuredJsonFieldValue = (
  value: string,
  fieldType: "string" | "number" | "boolean",
): RuntimeParseResult => {
  if (fieldType === "string") {
    return { ok: true, value };
  }

  if (fieldType === "number") {
    if (value.trim().length === 0) {
      return { ok: false, error: "Enter a number before continuing." };
    }

    const parsed = Number(value);
    return Number.isNaN(parsed)
      ? { ok: false, error: "Enter a valid number before continuing." }
      : { ok: true, value: parsed };
  }

  if (value === "true") {
    return { ok: true, value: true };
  }
  if (value === "false") {
    return { ok: true, value: false };
  }

  return { ok: false, error: "Select true or false before continuing." };
};

const createPrimitiveDraft = (
  definition: RuntimePrimitiveDefinition,
  value: unknown,
): RuntimePrimitiveDraft => {
  if (definition.factType === "work_unit") {
    return {
      factType: definition.factType,
      textValue: "",
      booleanValue: false,
      workUnitId:
        typeof value === "string"
          ? value
          : isRecord(value) && typeof value.projectWorkUnitId === "string"
            ? value.projectWorkUnitId
            : "",
    };
  }

  if (definition.factType === "boolean") {
    return {
      factType: definition.factType,
      textValue: String(Boolean(value)),
      booleanValue: Boolean(value),
      booleanMode: value === true ? "true" : value === false ? "false" : "unset",
      workUnitId: "",
    };
  }

  if (definition.factType === "json") {
    const structuredFields = getStructuredJsonFields(definition);
    if (structuredFields.length > 0) {
      const currentValue = isRecord(value) ? value : {};

      return {
        factType: definition.factType,
        textValue: formatPrimitiveText(value),
        booleanValue: false,
        booleanMode: "unset",
        workUnitId: "",
        jsonFields: structuredFields.map((field) => {
          const raw = currentValue[field.key];
          const entries = field.cardinality === "many" ? (Array.isArray(raw) ? raw : []) : [raw];

          return {
            key: field.key,
            label: field.label ?? humanizeKey(field.key),
            type: field.type,
            cardinality: field.cardinality,
            ...(field.description ? { description: field.description } : {}),
            ...(field.validation !== undefined ? { validation: field.validation } : {}),
            values:
              entries.length > 0
                ? entries.map((entry) => stringifyStructuredJsonValue(entry, field.type))
                : [""],
          };
        }),
      };
    }
  }

  return {
    factType: definition.factType,
    textValue: formatPrimitiveText(value),
    booleanValue: false,
    booleanMode: "unset",
    workUnitId: "",
  };
};

const parsePrimitiveDraft = (
  definition: RuntimePrimitiveDefinition,
  draft: RuntimePrimitiveDraft,
): RuntimeParseResult => {
  if (definition.factType === "work_unit") {
    if (draft.workUnitId.trim().length === 0) {
      return { ok: false, error: "Select a work unit before continuing." };
    }

    return {
      ok: true,
      value: { projectWorkUnitId: draft.workUnitId.trim() },
    };
  }

  const allowedOptions = getAllowedPrimitiveOptions(definition);
  const pathValidationInfo = getPathValidationInfo(definition.validation);
  if (allowedOptions.length > 0) {
    const selected = allowedOptions.find((option) => option.value === draft.textValue);
    if (!selected) {
      return { ok: false, error: "Select a value before continuing." };
    }
    return { ok: true, value: selected.rawValue };
  }

  switch (definition.factType) {
    case "string": {
      if (draft.textValue.trim().length === 0) {
        return { ok: false, error: "Enter a value before continuing." };
      }
      return { ok: true, value: draft.textValue };
    }
    case "number": {
      if (draft.textValue.trim().length === 0) {
        return { ok: false, error: "Enter a number before continuing." };
      }

      const parsed = Number(draft.textValue);
      if (Number.isNaN(parsed)) {
        return { ok: false, error: "Enter a valid number before continuing." };
      }
      return { ok: true, value: parsed };
    }
    case "boolean":
      if (draft.booleanMode === "unset") {
        return { ok: false, error: "Select true or false before continuing." };
      }
      return { ok: true, value: draft.booleanMode === "true" };
    case "json": {
      if (draft.jsonFields && draft.jsonFields.length > 0) {
        const value: Record<string, unknown> = {};

        for (const field of draft.jsonFields) {
          const populatedValues = field.values.filter((entry) => entry.trim().length > 0);
          if (field.cardinality === "many") {
            const parsedValues: unknown[] = [];
            for (const entry of populatedValues) {
              const parsed = parseStructuredJsonFieldValue(entry, field.type);
              if (!parsed.ok) {
                return { ok: false, error: `${field.label}: ${parsed.error}` };
              }
              parsedValues.push(parsed.value);
            }

            if (parsedValues.length > 0) {
              value[field.key] = parsedValues;
            }
            continue;
          }

          const firstValue = field.values[0] ?? "";
          if (firstValue.trim().length === 0) {
            continue;
          }

          const parsed = parseStructuredJsonFieldValue(firstValue, field.type);
          if (!parsed.ok) {
            return { ok: false, error: `${field.label}: ${parsed.error}` };
          }
          value[field.key] = parsed.value;
        }

        return { ok: true, value };
      }

      if (draft.textValue.trim().length === 0) {
        return { ok: false, error: "Enter a JSON value before continuing." };
      }

      try {
        return { ok: true, value: JSON.parse(draft.textValue) };
      } catch {
        return { ok: false, error: "Value must be valid JSON." };
      }
    }
  }
};

const createDialogDraft = (editor: RuntimeDialogEditor, value: unknown): RuntimeDialogDraft => {
  switch (editor.kind) {
    case "primitive":
      return { kind: editor.kind, primitive: createPrimitiveDraft(editor.definition, value) };
    case "work_unit":
      return {
        kind: editor.kind,
        workUnitId:
          typeof value === "string"
            ? value
            : isRecord(value) && typeof value.projectWorkUnitId === "string"
              ? value.projectWorkUnitId
              : "",
      };
    case "bound_fact": {
      const envelope = isRecord(value) ? value : null;
      return {
        kind: editor.kind,
        instanceId:
          typeof envelope?.instanceId === "string"
            ? envelope.instanceId
            : (editor.instanceOptions?.[0]?.value ?? ""),
        primitive: createPrimitiveDraft(editor.definition, envelope?.value),
      };
    }
    case "workflow_ref_fact":
      return {
        kind: editor.kind,
        workflowDefinitionId:
          isRecord(value) && typeof value.workflowDefinitionId === "string"
            ? value.workflowDefinitionId
            : "",
      };
    case "artifact_slot_reference_fact":
      return {
        kind: editor.kind,
        slotDefinitionId: editor.slotDefinitionId,
        artifactInstanceId:
          isRecord(value) && typeof value.artifactInstanceId === "string"
            ? value.artifactInstanceId
            : "",
      };
    case "work_unit_draft_spec_fact": {
      const currentValue = isRecord(value) ? value : null;
      const currentFactValues = Array.isArray(currentValue?.factValues)
        ? currentValue.factValues.filter(isRecord)
        : [];
      const currentArtifactValues = Array.isArray(currentValue?.artifactValues)
        ? currentValue.artifactValues.filter(isRecord)
        : [];

      return {
        kind: editor.kind,
        workUnitDefinitionId:
          typeof currentValue?.workUnitDefinitionId === "string"
            ? currentValue.workUnitDefinitionId
            : editor.workUnitDefinitionId,
        fields: editor.fields.map((field) => {
          const existing = currentFactValues.find(
            (entry) => entry.workUnitFactDefinitionId === field.workUnitFactDefinitionId,
          );

          return {
            workUnitFactDefinitionId: field.workUnitFactDefinitionId,
            included: Boolean(existing),
            label: field.label,
            description: field.description,
            draft: createPrimitiveDraft(field.definition, existing?.value),
          };
        }),
        artifacts: editor.artifacts.map((artifact) => {
          const existing = currentArtifactValues.find(
            (entry) => entry.slotDefinitionId === artifact.slotDefinitionId,
          );

          return {
            slotDefinitionId: artifact.slotDefinitionId,
            included: Boolean(existing),
            label: artifact.label,
            description: artifact.description,
            relativePath: typeof existing?.relativePath === "string" ? existing.relativePath : "",
            sourceContextFactDefinitionId:
              typeof existing?.sourceContextFactDefinitionId === "string"
                ? existing.sourceContextFactDefinitionId
                : "",
            clear: existing?.clear === true,
          };
        }),
      };
    }
  }
};

const parseDialogDraft = (
  editor: RuntimeDialogEditor,
  draft: RuntimeDialogDraft,
): RuntimeParseResult => {
  if (editor.kind !== draft.kind) {
    return { ok: false, error: "Dialog state is out of sync." };
  }

  switch (editor.kind) {
    case "primitive":
      return parsePrimitiveDraft(
        editor.definition,
        draft.primitive ?? createPrimitiveDraft(editor.definition, undefined),
      );
    case "work_unit":
      return (draft.workUnitId ?? "").trim().length > 0
        ? { ok: true, value: { projectWorkUnitId: (draft.workUnitId ?? "").trim() } }
        : { ok: false, error: "Select a work unit before continuing." };
    case "bound_fact": {
      const instanceId = (draft.instanceId ?? "").trim();
      if (instanceId.length === 0) {
        return { ok: false, error: "Select the bound fact instance before continuing." };
      }

      const primitiveResult = parsePrimitiveDraft(
        editor.definition,
        draft.primitive ?? createPrimitiveDraft(editor.definition, undefined),
      );
      if (!primitiveResult.ok) {
        return primitiveResult;
      }

      return {
        ok: true,
        value: {
          instanceId,
          value: primitiveResult.value,
        },
      };
    }
    case "workflow_ref_fact":
      return (draft.workflowDefinitionId ?? "").trim().length > 0
        ? { ok: true, value: { workflowDefinitionId: (draft.workflowDefinitionId ?? "").trim() } }
        : { ok: false, error: "Select a workflow before continuing." };
    case "artifact_slot_reference_fact":
      return (draft.artifactInstanceId ?? "").trim().length > 0
        ? {
            ok: true,
            value: {
              slotDefinitionId: draft.slotDefinitionId ?? editor.slotDefinitionId,
              artifactInstanceId: (draft.artifactInstanceId ?? "").trim(),
            },
          }
        : { ok: false, error: "Select an artifact instance before continuing." };
    case "work_unit_draft_spec_fact": {
      const factValues: Array<{ workUnitFactDefinitionId: string; value: unknown }> = [];
      const fields = draft.fields ?? [];
      for (const field of fields) {
        if (!field.included) {
          continue;
        }

        const fieldDefinition = editor.fields.find(
          (candidate) => candidate.workUnitFactDefinitionId === field.workUnitFactDefinitionId,
        );
        if (!fieldDefinition) {
          return { ok: false, error: `Field '${field.label}' is unavailable.` };
        }

        const fieldResult = parsePrimitiveDraft(fieldDefinition.definition, field.draft);
        if (!fieldResult.ok) {
          return { ok: false, error: `${field.label}: ${fieldResult.error}` };
        }

        factValues.push({
          workUnitFactDefinitionId: field.workUnitFactDefinitionId,
          value: fieldResult.value,
        });
      }

      const artifactValues: Array<{
        slotDefinitionId: string;
        relativePath?: string;
        sourceContextFactDefinitionId?: string;
        clear?: boolean;
      }> = [];

      const artifacts = draft.artifacts ?? [];
      for (const artifact of artifacts) {
        if (!artifact.included) {
          continue;
        }

        const relativePath = artifact.relativePath.trim();
        const sourceContextFactDefinitionId = artifact.sourceContextFactDefinitionId.trim();
        if (
          relativePath.length === 0 &&
          sourceContextFactDefinitionId.length === 0 &&
          !artifact.clear
        ) {
          return {
            ok: false,
            error: `${artifact.label}: provide a relative path, source context fact ID, or clear flag.`,
          };
        }

        artifactValues.push({
          slotDefinitionId: artifact.slotDefinitionId,
          ...(relativePath.length > 0 ? { relativePath } : {}),
          ...(sourceContextFactDefinitionId.length > 0 ? { sourceContextFactDefinitionId } : {}),
          ...(artifact.clear ? { clear: true } : {}),
        });
      }

      return {
        ok: true,
        value: {
          workUnitDefinitionId: draft.workUnitDefinitionId ?? editor.workUnitDefinitionId,
          factValues,
          artifactValues,
        },
      };
    }
  }
};

function PrimitiveEditor({
  definition,
  draft,
  onChange,
  label,
  workUnitOptions,
}: {
  readonly definition: RuntimePrimitiveDefinition;
  readonly draft: RuntimePrimitiveDraft;
  readonly onChange: (draft: RuntimePrimitiveDraft) => void;
  readonly label: string;
  readonly workUnitOptions: readonly RuntimeFactOption[] | undefined;
}) {
  const allowedOptions = getAllowedPrimitiveOptions(definition);
  const pathValidationInfo = getPathValidationInfo(definition.validation);

  if (definition.factType === "work_unit") {
    return (
      <Field>
        <FieldLabel>{label}</FieldLabel>
        <FieldContent>
          <Select
            value={draft.workUnitId}
            onValueChange={(value) => onChange({ ...draft, workUnitId: value ?? "" })}
          >
            <SelectTrigger className="w-full" aria-label={label}>
              <SelectValue placeholder="Select a work unit" />
            </SelectTrigger>
            <SelectContent>
              {workUnitOptions?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>
            Choose the runtime work unit to reference from this fact value.
          </FieldDescription>
        </FieldContent>
      </Field>
    );
  }

  if (allowedOptions.length > 0) {
    return (
      <Field>
        <FieldLabel>{label}</FieldLabel>
        <FieldContent>
          <Select
            value={draft.textValue}
            onValueChange={(value) => onChange({ ...draft, textValue: value ?? "" })}
          >
            <SelectTrigger className="w-full" aria-label={label}>
              <SelectValue placeholder="Select a value" />
            </SelectTrigger>
            <SelectContent>
              {allowedOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldContent>
      </Field>
    );
  }

  if (definition.factType === "boolean") {
    return (
      <Field>
        <FieldLabel>{label}</FieldLabel>
        <FieldContent>
          <Select
            value={draft.booleanMode ?? "unset"}
            onValueChange={(value) =>
              onChange({
                ...draft,
                booleanValue: value === "true",
                booleanMode: value === "true" || value === "false" ? value : "unset",
              })
            }
          >
            <SelectTrigger className="w-full" aria-label={label}>
              <SelectValue placeholder="Select true or false" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unset">Unset</SelectItem>
              <SelectItem value="true">true</SelectItem>
              <SelectItem value="false">false</SelectItem>
            </SelectContent>
          </Select>
        </FieldContent>
      </Field>
    );
  }

  if (definition.factType === "json") {
    if (draft.jsonFields && draft.jsonFields.length > 0) {
      return (
        <FieldSet className="gap-3">
          {draft.jsonFields.map((field, fieldIndex) => {
            const currentJsonFields = draft.jsonFields ?? [];
            const allowedOptions = getAllowedPrimitiveOptions({
              factType: field.type,
              ...(field.validation !== undefined ? { validation: field.validation } : {}),
            });

            const updateFieldValues = (nextValues: string[]) =>
              onChange({
                ...draft,
                jsonFields: currentJsonFields.map((candidate, index) =>
                  index === fieldIndex ? { ...candidate, values: nextValues } : candidate,
                ),
              });

            return (
              <section
                key={field.key}
                className="space-y-3 border border-border/70 bg-background/40 p-3"
              >
                <div className="space-y-1">
                  <FieldLabel>{field.label}</FieldLabel>
                  <FieldDescription>
                    {field.description ?? `${field.type} · ${field.cardinality}`}
                  </FieldDescription>
                </div>

                {field.values.map((entry, entryIndex) => (
                  <div key={`${field.key}-${entryIndex}`} className="flex items-start gap-2">
                    <div className="flex-1 space-y-2">
                      {field.cardinality === "many" ? (
                        <p className="text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
                          Instance {entryIndex + 1}
                        </p>
                      ) : null}

                      {field.type === "boolean" ? (
                        <Select
                          value={entry || "unset"}
                          onValueChange={(value) => {
                            const nextValues = [...field.values];
                            nextValues[entryIndex] = value && value !== "unset" ? value : "";
                            updateFieldValues(nextValues);
                          }}
                        >
                          <SelectTrigger
                            className="w-full"
                            aria-label={`${field.label} ${entryIndex + 1}`}
                          >
                            <SelectValue placeholder="Select true or false" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unset">Unset</SelectItem>
                            <SelectItem value="true">true</SelectItem>
                            <SelectItem value="false">false</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : allowedOptions.length > 0 ? (
                        <Select
                          value={entry}
                          onValueChange={(value) => {
                            const nextValues = [...field.values];
                            nextValues[entryIndex] = value ?? "";
                            updateFieldValues(nextValues);
                          }}
                        >
                          <SelectTrigger
                            className="w-full"
                            aria-label={`${field.label} ${entryIndex + 1}`}
                          >
                            <SelectValue placeholder={`Select ${field.label}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {allowedOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <>
                          <Input
                            value={entry}
                            onChange={(event) => {
                              const nextValues = [...field.values];
                              nextValues[entryIndex] = event.target.value;
                              updateFieldValues(nextValues);
                            }}
                            type={field.type === "number" ? "number" : "text"}
                            inputMode={field.type === "number" ? "decimal" : undefined}
                            placeholder={
                              field.type === "string" && getPathValidationInfo(field.validation)
                                ? `repo-relative ${getPathValidationInfo(field.validation)?.pathKind} path`
                                : undefined
                            }
                            spellCheck={
                              field.type === "string" && !getPathValidationInfo(field.validation)
                            }
                            aria-label={`${field.label} ${entryIndex + 1}`}
                          />
                          {field.type === "string" && getPathValidationInfo(field.validation) ? (
                            <FieldDescription>
                              Enter a repo-relative{" "}
                              {getPathValidationInfo(field.validation)?.pathKind} path.
                            </FieldDescription>
                          ) : null}
                        </>
                      )}
                    </div>

                    {field.cardinality === "many" && field.values.length > 1 ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          updateFieldValues(field.values.filter((_, index) => index !== entryIndex))
                        }
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                ))}

                {field.cardinality === "many" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => updateFieldValues([...field.values, ""])}
                  >
                    Add instance
                  </Button>
                ) : null}
              </section>
            );
          })}
        </FieldSet>
      );
    }

    return (
      <Field>
        <FieldLabel>{label}</FieldLabel>
        <FieldContent>
          <Textarea
            value={draft.textValue}
            onChange={(event) => onChange({ ...draft, textValue: event.target.value })}
            className="min-h-32 rounded-none"
            aria-label={label}
          />
          <FieldDescription>Enter a valid JSON value for this fact.</FieldDescription>
        </FieldContent>
      </Field>
    );
  }

  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <FieldContent>
        <Input
          value={draft.textValue}
          onChange={(event) => onChange({ ...draft, textValue: event.target.value })}
          type={definition.factType === "number" ? "number" : "text"}
          inputMode={definition.factType === "number" ? "decimal" : undefined}
          placeholder={
            definition.factType === "string" && pathValidationInfo
              ? `repo-relative ${pathValidationInfo.pathKind} path`
              : undefined
          }
          name={label.replace(/\s+/g, "-").toLowerCase()}
          autoComplete="off"
          spellCheck={definition.factType === "string" && !pathValidationInfo ? undefined : false}
          aria-label={label}
        />
        {definition.factType === "string" && pathValidationInfo ? (
          <FieldDescription>
            Enter a repo-relative {pathValidationInfo.pathKind} path.
          </FieldDescription>
        ) : null}
      </FieldContent>
    </Field>
  );
}

function FactDialogFields({
  editor,
  draft,
  onChange,
}: {
  readonly editor: RuntimeDialogEditor;
  readonly draft: RuntimeDialogDraft;
  readonly onChange: (draft: RuntimeDialogDraft) => void;
}) {
  if (editor.kind !== draft.kind) {
    return null;
  }

  switch (editor.kind) {
    case "primitive":
      if (!draft.primitive) {
        return null;
      }
      return (
        <PrimitiveEditor
          definition={editor.definition}
          draft={draft.primitive}
          onChange={(primitive) => onChange({ ...draft, primitive })}
          label="Fact value"
          workUnitOptions={editor.workUnitOptions}
        />
      );
    case "work_unit":
      return (
        <Field>
          <FieldLabel>Linked work unit</FieldLabel>
          <FieldContent>
            <Select
              value={draft.workUnitId}
              onValueChange={(value) => onChange({ ...draft, workUnitId: value ?? "" })}
            >
              <SelectTrigger className="w-full" aria-label="Linked work unit">
                <SelectValue placeholder="Select a work unit" />
              </SelectTrigger>
              <SelectContent>
                {editor.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldContent>
        </Field>
      );
    case "bound_fact":
      if (!draft.primitive) {
        return null;
      }
      return (
        <FieldGroup>
          <Field>
            <FieldLabel>{editor.instanceLabel}</FieldLabel>
            <FieldContent>
              <Select
                value={draft.instanceId}
                onValueChange={(value) => onChange({ ...draft, instanceId: value ?? "" })}
                disabled={(editor.instanceOptions?.length ?? 0) === 0}
              >
                <SelectTrigger className="w-full" aria-label={editor.instanceLabel}>
                  <SelectValue placeholder="Select a source fact instance" />
                </SelectTrigger>
                <SelectContent>
                  {editor.instanceOptions?.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>
                {editor.instanceOptions && editor.instanceOptions.length > 0
                  ? "Bound facts store a canonical envelope with the selected source fact instance ID and typed value."
                  : "No source fact instances are currently available to bind from."}
              </FieldDescription>
            </FieldContent>
          </Field>
          <PrimitiveEditor
            definition={editor.definition}
            draft={draft.primitive}
            onChange={(primitive) => onChange({ ...draft, primitive })}
            label="Bound value"
            workUnitOptions={editor.workUnitOptions}
          />
        </FieldGroup>
      );
    case "workflow_ref_fact":
      return (
        <Field>
          <FieldLabel>Workflow reference</FieldLabel>
          <FieldContent>
            <Select
              value={draft.workflowDefinitionId}
              onValueChange={(value) => onChange({ ...draft, workflowDefinitionId: value ?? "" })}
            >
              <SelectTrigger className="w-full" aria-label="Workflow reference">
                <SelectValue placeholder="Select a workflow" />
              </SelectTrigger>
              <SelectContent>
                {editor.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>
              Choose one of the workflows allowed by this context fact contract.
            </FieldDescription>
          </FieldContent>
        </Field>
      );
    case "artifact_slot_reference_fact":
      return (
        <Field>
          <FieldLabel>{editor.slotLabel}</FieldLabel>
          <FieldContent>
            <Select
              value={draft.artifactInstanceId}
              onValueChange={(value) => onChange({ ...draft, artifactInstanceId: value ?? "" })}
            >
              <SelectTrigger className="w-full" aria-label={editor.slotLabel}>
                <SelectValue placeholder="Select an artifact instance" />
              </SelectTrigger>
              <SelectContent>
                {editor.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>
              Artifact slot references must target slot {editor.slotDefinitionId}.
            </FieldDescription>
          </FieldContent>
        </Field>
      );
    case "work_unit_draft_spec_fact":
      if (!draft.fields || !draft.artifacts) {
        return null;
      }

      const fields = draft.fields;
      const artifacts = draft.artifacts;

      return (
        <FieldSet className="gap-4">
          <section className="space-y-1 border border-border/70 bg-background/40 p-3">
            <p className="text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
              Draft target
            </p>
            <p className="text-xs text-foreground">{editor.workUnitLabel}</p>
            <p className="text-xs text-muted-foreground">{editor.workUnitDefinitionId}</p>
          </section>

          <section className="space-y-3">
            <FieldTitle>Selected fact values</FieldTitle>
            {fields.length === 0 ? (
              <p className="border border-border/70 bg-background/40 px-3 py-2 text-xs text-muted-foreground">
                No work-unit facts are selectable for this draft spec.
              </p>
            ) : (
              fields.map((field) => {
                const fieldDefinition = editor.fields.find(
                  (candidate) =>
                    candidate.workUnitFactDefinitionId === field.workUnitFactDefinitionId,
                );
                if (!fieldDefinition) {
                  return null;
                }

                return (
                  <section
                    key={field.workUnitFactDefinitionId}
                    className="space-y-3 border border-border/70 bg-background/40 p-3"
                  >
                    <Field orientation="horizontal">
                      <Checkbox
                        checked={field.included}
                        onCheckedChange={(checked) =>
                          onChange({
                            ...draft,
                            fields: fields.map((candidate) =>
                              candidate.workUnitFactDefinitionId === field.workUnitFactDefinitionId
                                ? { ...candidate, included: Boolean(checked) }
                                : candidate,
                            ),
                          })
                        }
                      />
                      <FieldContent>
                        <FieldTitle>{field.label}</FieldTitle>
                        {field.description ? (
                          <FieldDescription>{field.description}</FieldDescription>
                        ) : null}
                      </FieldContent>
                    </Field>

                    {field.included ? (
                      <PrimitiveEditor
                        definition={fieldDefinition.definition}
                        draft={field.draft}
                        onChange={(nextDraft) =>
                          onChange({
                            ...draft,
                            fields: fields.map((candidate) =>
                              candidate.workUnitFactDefinitionId === field.workUnitFactDefinitionId
                                ? { ...candidate, draft: nextDraft }
                                : candidate,
                            ),
                          })
                        }
                        label={field.label}
                        workUnitOptions={editor.workUnitOptions}
                      />
                    ) : null}
                  </section>
                );
              })
            )}
          </section>

          <section className="space-y-3">
            <FieldTitle>Selected artifact values</FieldTitle>
            {artifacts.length === 0 ? (
              <p className="border border-border/70 bg-background/40 px-3 py-2 text-xs text-muted-foreground">
                No artifact slots are selectable for this draft spec.
              </p>
            ) : (
              artifacts.map((artifact) => (
                <section
                  key={artifact.slotDefinitionId}
                  className="space-y-3 border border-border/70 bg-background/40 p-3"
                >
                  <Field orientation="horizontal">
                    <Checkbox
                      checked={artifact.included}
                      onCheckedChange={(checked) =>
                        onChange({
                          ...draft,
                          artifacts: artifacts.map((candidate) =>
                            candidate.slotDefinitionId === artifact.slotDefinitionId
                              ? { ...candidate, included: Boolean(checked) }
                              : candidate,
                          ),
                        })
                      }
                    />
                    <FieldContent>
                      <FieldTitle>{artifact.label}</FieldTitle>
                      {artifact.description ? (
                        <FieldDescription>{artifact.description}</FieldDescription>
                      ) : null}
                    </FieldContent>
                  </Field>

                  {artifact.included ? (
                    <FieldGroup>
                      <Field>
                        <FieldLabel>Relative path</FieldLabel>
                        <FieldContent>
                          <Input
                            value={artifact.relativePath}
                            onChange={(event) =>
                              onChange({
                                ...draft,
                                artifacts: artifacts.map((candidate) =>
                                  candidate.slotDefinitionId === artifact.slotDefinitionId
                                    ? { ...candidate, relativePath: event.target.value }
                                    : candidate,
                                ),
                              })
                            }
                            name={`relative-path-${artifact.slotDefinitionId}`}
                            autoComplete="off"
                            spellCheck={false}
                            aria-label={`${artifact.label} relative path`}
                          />
                        </FieldContent>
                      </Field>

                      <Field>
                        <FieldLabel>Source context fact ID</FieldLabel>
                        <FieldContent>
                          <Input
                            value={artifact.sourceContextFactDefinitionId}
                            onChange={(event) =>
                              onChange({
                                ...draft,
                                artifacts: artifacts.map((candidate) =>
                                  candidate.slotDefinitionId === artifact.slotDefinitionId
                                    ? {
                                        ...candidate,
                                        sourceContextFactDefinitionId: event.target.value,
                                      }
                                    : candidate,
                                ),
                              })
                            }
                            name={`source-context-fact-${artifact.slotDefinitionId}`}
                            autoComplete="off"
                            spellCheck={false}
                            aria-label={`${artifact.label} source context fact id`}
                          />
                        </FieldContent>
                      </Field>

                      <Field orientation="horizontal">
                        <Checkbox
                          checked={artifact.clear}
                          onCheckedChange={(checked) =>
                            onChange({
                              ...draft,
                              artifacts: artifacts.map((candidate) =>
                                candidate.slotDefinitionId === artifact.slotDefinitionId
                                  ? { ...candidate, clear: Boolean(checked) }
                                  : candidate,
                              ),
                            })
                          }
                        />
                        <FieldContent>
                          <FieldTitle>Clear slot state</FieldTitle>
                          <FieldDescription>
                            Record a clear intent for this artifact slot inside the draft spec
                            payload.
                          </FieldDescription>
                        </FieldContent>
                      </Field>
                    </FieldGroup>
                  ) : null}
                </section>
              ))
            )}
          </section>
        </FieldSet>
      );
  }
}

export function RuntimeFactValueDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  pendingLabel,
  editor,
  initialValue,
  isPending,
  errorMessage,
  onSubmit,
  testId,
}: RuntimeFactValueDialogProps) {
  const initialDraft = useMemo(
    () => createDialogDraft(editor, initialValue),
    [editor, initialValue],
  );
  const form = useForm({
    defaultValues: initialDraft,
    onSubmit: async ({ value }) => {
      const parsed = parseDialogDraft(editor, value);
      if (!parsed.ok) {
        throw new Error(parsed.error);
      }

      await onSubmit(parsed.value);
    },
  });
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      form.reset(initialDraft);
      setLocalError(null);
    }
  }, [form, initialDraft, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(88vh,52rem)] max-w-2xl overflow-y-auto rounded-none border border-border/80 bg-background">
        <form.Subscribe selector={(state) => ({ values: state.values, isDirty: state.isDirty })}>
          {({ values, isDirty }) => (
            <form
              className="space-y-4"
              data-testid={testId}
              onSubmit={async (event) => {
                event.preventDefault();
                try {
                  setLocalError(null);
                  await form.handleSubmit();
                } catch (error) {
                  if (error instanceof Error && error.message.length > 0) {
                    setLocalError(error.message);
                    return;
                  }
                  throw error;
                }
              }}
            >
              <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>{description}</DialogDescription>
              </DialogHeader>

              <div className="flex items-center justify-between border border-border/70 bg-background/40 px-3 py-2 text-xs">
                <span className="uppercase tracking-[0.12em] text-muted-foreground">
                  Form state
                </span>
                <span className={isDirty ? "text-amber-400" : "text-muted-foreground"}>
                  {isDirty ? "Unsaved changes" : "No pending changes"}
                </span>
              </div>

              <FactDialogFields
                editor={editor}
                draft={values}
                onChange={(next) => {
                  form.setFieldValue("kind", () => next.kind);
                  form.setFieldValue("primitive", () => next.primitive);
                  form.setFieldValue("workUnitId", () => next.workUnitId);
                  form.setFieldValue("instanceId", () => next.instanceId);
                  form.setFieldValue("workflowDefinitionId", () => next.workflowDefinitionId);
                  form.setFieldValue("artifactInstanceId", () => next.artifactInstanceId);
                  form.setFieldValue("slotDefinitionId", () => next.slotDefinitionId);
                  form.setFieldValue("workUnitDefinitionId", () => next.workUnitDefinitionId);
                  form.setFieldValue("fields", () => next.fields);
                  form.setFieldValue("artifacts", () => next.artifacts);
                }}
              />

              {localError ? <FieldError>{localError}</FieldError> : null}
              {errorMessage ? <FieldError>{errorMessage}</FieldError> : null}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending || !isDirty}>
                  {isPending ? (pendingLabel ?? `${submitLabel}…`) : submitLabel}
                </Button>
              </DialogFooter>
            </form>
          )}
        </form.Subscribe>
      </DialogContent>
    </Dialog>
  );
}

export function RuntimeConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  pendingLabel,
  isPending,
  onConfirm,
  errorMessage,
  testId,
}: RuntimeConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-none border border-border/80 bg-background">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {errorMessage ? <FieldError>{errorMessage}</FieldError> : null}

        <DialogFooter data-testid={testId}>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={async () => {
              await onConfirm();
            }}
          >
            {isPending ? (pendingLabel ?? `${confirmLabel}…`) : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
