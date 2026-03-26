import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Result } from "better-result";
import { AlertTriangleIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { z } from "zod";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AllowedValuesChipEditor } from "@/features/methodologies/fact-editor-controls";
import {
  createAllowedValuesValidation,
  getAllowedValues,
  getUiValidationKind,
} from "@/features/methodologies/fact-validation";
import { type MethodologyDetails } from "@/features/methodologies/foundation";
import {
  createEmptyMethodologyFact,
  MethodologyFactsInventory,
  parseMethodologyFacts,
} from "@/features/methodologies/methodology-facts";
import {
  createEmptyMethodologyVersionWorkspaceDraft,
  createDraftFromProjection,
  type DraftProjectionShape,
  type FactEditorValue,
  type MethodologyVersionWorkspaceDraft,
} from "@/features/methodologies/version-workspace";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";

const factsSearchSchema = z.object({
  intent: z.enum(["add-fact"]).optional(),
});

type FactsSearch = z.infer<typeof factsSearchSchema>;

export const Route = createFileRoute("/methodologies/$methodologyId/versions/$versionId/facts")({
  validateSearch: (search): FactsSearch => factsSearchSchema.parse(search),
  component: MethodologyVersionFactsRoute,
});

type FactEditorStep = "contract" | "guidance";

type FactEditorFormValues = {
  displayName: string;
  factKey: string;
  factType: FactEditorValue["factType"];
  defaultValue: string;
  description: string;
  humanMarkdown: string;
  agentMarkdown: string;
  validationType: "none" | "path" | "allowed-values";
  pathKind: "file" | "directory";
  trimWhitespace: boolean;
  disallowAbsolute: boolean;
  preventTraversal: boolean;
  allowedValues: string;
};

type JsonFactValueType = "string" | "number" | "boolean";

type JsonSubKey = {
  id: string;
  displayName: string;
  key: string;
  value: string;
  valueType: JsonFactValueType;
  cardinality: "one" | "many";
  validationType: "none" | "path" | "allowed-values";
  pathKind: "file" | "directory";
  trimWhitespace: boolean;
  disallowAbsolute: boolean;
  preventTraversal: boolean;
  allowedValues: string;
};

let jsonSubKeyIdSequence = 0;

function createJsonSubKeyId(): string {
  jsonSubKeyIdSequence += 1;
  return `json-sub-key-${jsonSubKeyIdSequence}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractMarkdownText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (isRecord(value) && typeof value.markdown === "string") {
    return value.markdown;
  }

  return "";
}

function extractGuidanceText(value: unknown, fallbacks: string[] = []): string {
  if (isRecord(value)) {
    const markdown = extractMarkdownText(value);
    if (markdown.length > 0) {
      return markdown;
    }

    for (const fallback of fallbacks) {
      const candidate = value[fallback];
      if (typeof candidate === "string" && candidate.length > 0) {
        return candidate;
      }
    }
  }

  return "";
}

function toJsonValueType(value: unknown): JsonFactValueType {
  if (value === "string" || value === "number" || value === "boolean") {
    return value;
  }

  return "string";
}

function parseJsonSubKeys(fact: FactEditorValue): JsonSubKey[] {
  if (fact.validation?.kind !== "json-schema") {
    return [];
  }

  const validationRecord = fact.validation as { schema?: unknown; subSchema?: unknown };
  const schema = isRecord(validationRecord.schema) ? validationRecord.schema : {};
  const properties = isRecord(schema.properties) ? schema.properties : {};

  const subSchema = isRecord(validationRecord.subSchema) ? validationRecord.subSchema : {};
  const subSchemaFields = Array.isArray(subSchema.fields) ? subSchema.fields : [];

  return Object.entries(properties).map(([propertyKey, propertySchema]) => {
    const propertyRecord = isRecord(propertySchema) ? propertySchema : {};
    const xValidation = isRecord(propertyRecord["x-validation"])
      ? propertyRecord["x-validation"]
      : {};
    const validationType = getUiValidationKind(xValidation);
    const allowedValues = getAllowedValues(xValidation);
    const pathValidation = isRecord(xValidation.path) ? xValidation.path : {};
    const normalization = isRecord(pathValidation.normalization)
      ? pathValidation.normalization
      : {};
    const safety = isRecord(pathValidation.safety) ? pathValidation.safety : {};
    const rawDefaultValue = propertyRecord.default;

    const subSchemaField = subSchemaFields.find((field: unknown) => {
      if (!isRecord(field)) {
        return false;
      }
      return field.key === propertyKey;
    });
    const subSchemaFieldRecord = isRecord(subSchemaField) ? subSchemaField : {};

    return {
      id: createJsonSubKeyId(),
      displayName:
        typeof propertyRecord.title === "string"
          ? propertyRecord.title
          : typeof propertyRecord.description === "string"
            ? propertyRecord.description
            : propertyKey,
      key: propertyKey,
      value:
        rawDefaultValue === undefined
          ? ""
          : typeof rawDefaultValue === "string"
            ? rawDefaultValue
            : JSON.stringify(rawDefaultValue),
      valueType: toJsonValueType(propertyRecord.type),
      cardinality: subSchemaFieldRecord.cardinality === "many" ? "many" : "one",
      validationType:
        validationType === "path"
          ? "path"
          : validationType === "allowed-values"
            ? "allowed-values"
            : "none",
      pathKind: pathValidation.pathKind === "directory" ? "directory" : "file",
      trimWhitespace: normalization.trimWhitespace !== false,
      disallowAbsolute: safety.disallowAbsolute !== false,
      preventTraversal: safety.preventTraversal !== false,
      allowedValues: allowedValues.join("\n"),
    };
  });
}

function createEmptyJsonSubKey(existingKeys: readonly JsonSubKey[]): JsonSubKey {
  const usedKeys = new Set(
    existingKeys.map((entry) => entry.key.trim()).filter((entry) => entry.length > 0),
  );
  let counter = existingKeys.length + 1;
  let key = `field_${counter}`;
  while (usedKeys.has(key)) {
    counter += 1;
    key = `field_${counter}`;
  }

  return {
    id: createJsonSubKeyId(),
    displayName: "",
    key,
    value: "",
    valueType: "string",
    cardinality: "one",
    validationType: "none",
    pathKind: "file",
    trimWhitespace: true,
    disallowAbsolute: true,
    preventTraversal: true,
    allowedValues: "",
  };
}

function parseJsonSubKeyDefaultValue(entry: JsonSubKey): unknown {
  const trimmed = entry.value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  if (entry.valueType === "number") {
    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? numeric : trimmed;
  }

  if (entry.valueType === "boolean") {
    return trimmed === "true";
  }

  return entry.value;
}

function jsonSubKeysToJsonSchemaValidation(
  keys: readonly JsonSubKey[],
): FactEditorValue["validation"] {
  const properties: Record<string, Record<string, unknown>> = {};
  const subSchemaFields: Array<Record<string, unknown>> = [];

  for (const entry of keys) {
    const trimmedKey = entry.key.trim();
    if (trimmedKey.length === 0) {
      continue;
    }

    const propertySchema: Record<string, unknown> = {
      type: entry.valueType,
    };

    const title = entry.displayName.trim();
    if (title.length > 0) {
      propertySchema.title = title;
    }

    const parsedDefault = parseJsonSubKeyDefaultValue(entry);
    if (entry.cardinality === "one" && parsedDefault !== undefined) {
      propertySchema.default = parsedDefault;
    }

    if (entry.valueType === "string") {
      if (entry.validationType === "path") {
        propertySchema["x-validation"] = {
          kind: "path",
          path: {
            pathKind: entry.pathKind,
            normalization: {
              mode: "posix",
              trimWhitespace: entry.trimWhitespace,
            },
            safety: {
              disallowAbsolute: entry.disallowAbsolute,
              preventTraversal: entry.preventTraversal,
            },
          },
        };
      } else if (entry.validationType === "allowed-values") {
        propertySchema["x-validation"] = createAllowedValuesValidation(
          entry.allowedValues
            .split(/\r?\n/g)
            .map((value) => value.trim())
            .filter((value) => value.length > 0),
        );
      }
    }

    const subSchemaField: Record<string, unknown> = {
      key: trimmedKey,
      type: entry.valueType,
      cardinality: entry.cardinality,
    };
    if (entry.cardinality === "one" && parsedDefault !== undefined) {
      subSchemaField.defaultValue = parsedDefault;
    }

    properties[trimmedKey] = propertySchema;
    subSchemaFields.push(subSchemaField);
  }

  return {
    kind: "json-schema",
    schemaDialect: "draft-2020-12",
    schema: {
      type: "object",
      additionalProperties: false,
      properties,
    },
    subSchema: {
      type: "object",
      fields: subSchemaFields,
    },
  } as FactEditorValue["validation"];
}

function factToFormValues(fact: FactEditorValue): FactEditorFormValues {
  const validation = fact.validation as
    | {
        kind?: string;
        path?: {
          pathKind?: "file" | "directory";
          normalization?: { trimWhitespace?: boolean };
          safety?: { disallowAbsolute?: boolean; preventTraversal?: boolean };
        };
        rules?: Array<{ kind?: string; values?: string[] }>;
        schema?: unknown;
      }
    | undefined;
  const allowedValues = getAllowedValues(validation);
  const uiValidationKind = getUiValidationKind(validation);
  const validationType = uiValidationKind === "json-schema" ? "none" : uiValidationKind;

  const factRecord = fact as unknown as Record<string, unknown>;
  const guidanceRecord = isRecord(factRecord.guidance) ? factRecord.guidance : {};
  const description = extractMarkdownText(factRecord.description);
  const humanGuidance = extractGuidanceText(guidanceRecord.human, ["short", "long"]);
  const agentGuidance = extractGuidanceText(guidanceRecord.agent, ["intent"]);

  return {
    displayName: fact.name ?? "",
    factKey: fact.key,
    factType: fact.factType,
    defaultValue: fact.defaultValue === undefined ? "" : String(fact.defaultValue),
    description,
    humanMarkdown: humanGuidance,
    agentMarkdown: agentGuidance,
    validationType,
    pathKind: validation?.path?.pathKind === "directory" ? "directory" : "file",
    trimWhitespace: validation?.path?.normalization?.trimWhitespace ?? true,
    disallowAbsolute: validation?.path?.safety?.disallowAbsolute ?? true,
    preventTraversal: validation?.path?.safety?.preventTraversal ?? true,
    allowedValues: allowedValues.join("\n"),
  };
}

function normalizeFactType(factType: FactEditorValue["factType"]): FactEditorValue["factType"] {
  if (
    factType === "string" ||
    factType === "number" ||
    factType === "boolean" ||
    factType === "json" ||
    factType === "work_unit"
  ) {
    return factType;
  }

  if (typeof factType === "string" && factType === "work unit") {
    return "work_unit";
  }

  return "string";
}

function parseFactDefaultValue(
  factType: FactEditorValue["factType"],
  rawDefaultValue: string,
): unknown {
  if (rawDefaultValue.trim().length === 0) {
    return undefined;
  }

  if (factType === "string") {
    return rawDefaultValue;
  }

  if (factType === "number") {
    const parsed = Number(rawDefaultValue);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  if (factType === "boolean") {
    const normalized = rawDefaultValue.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
    return undefined;
  }

  return Result.try(() => JSON.parse(rawDefaultValue)).unwrapOr(undefined);
}

function formValuesToFact(
  values: FactEditorFormValues,
  baseFact: FactEditorValue,
  jsonSubKeys: readonly JsonSubKey[],
): FactEditorValue {
  const factType = normalizeFactType(values.factType);
  const key = values.factKey.trim();
  const displayName = values.displayName.trim();
  const description = values.description.trim();
  const humanMarkdown = values.humanMarkdown.trim();
  const agentMarkdown = values.agentMarkdown.trim();
  const allowedValues = values.allowedValues
    .split(/\r?\n/g)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  const defaultValue = parseFactDefaultValue(factType, values.defaultValue);

  const validation: FactEditorValue["validation"] =
    factType === "json"
      ? jsonSubKeysToJsonSchemaValidation(jsonSubKeys)
      : factType === "string"
        ? values.validationType === "path"
          ? {
              kind: "path",
              path: {
                pathKind: values.pathKind,
                normalization: {
                  mode: "posix",
                  trimWhitespace: values.trimWhitespace,
                },
                safety: {
                  disallowAbsolute: values.disallowAbsolute,
                  preventTraversal: values.preventTraversal,
                },
              },
            }
          : values.validationType === "allowed-values" && allowedValues.length > 0
            ? createAllowedValuesValidation(allowedValues)
            : { kind: "none" }
        : { kind: "none" };

  return {
    ...(baseFact.__uiId ? { __uiId: baseFact.__uiId } : {}),
    ...(displayName.length > 0 ? { name: displayName } : {}),
    key,
    factType,
    cardinality: "one",
    ...(defaultValue !== undefined ? { defaultValue } : {}),
    description: { markdown: description },
    guidance: {
      human: { markdown: humanMarkdown },
      agent: { markdown: agentMarkdown },
    },
    validation: (validation ?? { kind: "none" }) as Exclude<
      FactEditorValue["validation"],
      undefined
    >,
  } as unknown as FactEditorValue;
}

function factToMutationInput(fact: FactEditorValue): Record<string, unknown> {
  const normalizedFactType = normalizeFactType(fact.factType);
  const trimmedKey = fact.key.trim();
  const factRecord = fact as unknown as Record<string, unknown>;
  const guidanceRecord = isRecord(factRecord.guidance) ? factRecord.guidance : {};
  const description = extractMarkdownText(factRecord.description).trim();
  const humanGuidance = extractGuidanceText(guidanceRecord.human, ["short", "long"]).trim();
  const agentGuidance = extractGuidanceText(guidanceRecord.agent, ["intent"]).trim();

  return {
    name: fact.name,
    key: trimmedKey,
    factType: normalizedFactType,
    cardinality: (fact as unknown as { cardinality?: "one" | "many" }).cardinality ?? "one",
    defaultValue: fact.defaultValue,
    description: { markdown: description },
    guidance: {
      human: { markdown: humanGuidance },
      agent: { markdown: agentGuidance },
    },
    validation: fact.validation,
  };
}

function FactEditorDialog({
  open,
  onOpenChange,
  initialFact,
  isEditing,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialFact: FactEditorValue;
  isEditing: boolean;
  onSave: (fact: FactEditorValue) => Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<FactEditorStep>("contract");
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);
  const [isContractTabDirty, setIsContractTabDirty] = useState(false);
  const [isGuidanceTabDirty, setIsGuidanceTabDirty] = useState(false);
  const [jsonSubKeys, setJsonSubKeys] = useState<JsonSubKey[]>(() => parseJsonSubKeys(initialFact));
  const form = useForm({
    defaultValues: factToFormValues(initialFact),
    onSubmit: async ({ value }) => {
      await onSave(formValuesToFact(value, initialFact, jsonSubKeys));
    },
  });
  const isDialogDirty = isContractTabDirty || isGuidanceTabDirty;

  const closeDialog = () => {
    setIsDiscardDialogOpen(false);
    setActiveTab("contract");
    onOpenChange(false);
  };

  const requestClose = () => {
    if (isDialogDirty) {
      setIsDiscardDialogOpen(true);
      return;
    }

    closeDialog();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          onOpenChange(true);
          return;
        }

        requestClose();
      }}
    >
      <DialogContent className="chiron-cut-frame-thick w-[min(72rem,calc(100vw-2rem))] p-8 sm:max-w-none sm:p-10">
        <form
          className="flex flex-col gap-12"
          onChangeCapture={() => {
            if (activeTab === "contract") {
              setIsContractTabDirty(true);
              return;
            }

            setIsGuidanceTabDirty(true);
          }}
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();

            const nextFactKey = form.getFieldValue("factKey").trim();
            if (nextFactKey.length === 0) {
              setActiveTab("contract");
              toast.error("Fact key is required");
              return;
            }
            void form.handleSubmit();
          }}
        >
          <div className="flex flex-col gap-10">
            <DialogHeader className="gap-4">
              <DialogTitle className="text-base font-semibold uppercase tracking-[0.08em]">
                {isEditing ? "Edit Fact" : "Add Fact"}
              </DialogTitle>
              <div className="flex flex-wrap gap-2 border-b border-border pb-3">
                {(
                  [
                    ["contract", "Contract"],
                    ["guidance", "Guidance"],
                  ] as const
                ).map(([stepValue, label]) => {
                  return (
                    <div key={stepValue}>
                      <Button
                        type="button"
                        size="sm"
                        variant={activeTab === stepValue ? "default" : "outline"}
                        className="rounded-none"
                        onClick={() => setActiveTab(stepValue)}
                      >
                        {label}
                        {stepValue === "contract" && isContractTabDirty ? (
                          <span
                            data-testid="fact-contract-modified-indicator"
                            className="ml-1 text-[0.85rem] leading-none"
                          >
                            *
                          </span>
                        ) : null}
                        {stepValue === "guidance" && isGuidanceTabDirty ? (
                          <span
                            data-testid="fact-guidance-modified-indicator"
                            className="ml-1 text-[0.85rem] leading-none"
                          >
                            *
                          </span>
                        ) : null}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </DialogHeader>

            <div className="max-h-[calc(90vh-16rem)] overflow-y-auto pr-2 scrollbar-thin">
              {activeTab === "contract" ? (
                <div className="grid grid-cols-2 gap-x-10 gap-y-6">
                  <form.Field name="displayName">
                    {(field) => (
                      <div className="space-y-2">
                        <Label
                          htmlFor={field.name}
                          className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
                        >
                          Display Name
                        </Label>
                        <Input
                          id={field.name}
                          className="rounded-none border-border/70 bg-background/50 text-xs tracking-[0.04em] placeholder:text-muted-foreground/50"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </div>
                    )}
                  </form.Field>
                  <form.Field name="factKey">
                    {(field) => (
                      <div className="space-y-2">
                        <Label
                          htmlFor={field.name}
                          className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
                        >
                          Fact Key
                        </Label>
                        <Input
                          id={field.name}
                          className="rounded-none border-border/70 bg-background/50 text-xs tracking-[0.04em] placeholder:text-muted-foreground/50"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                        {field.state.value.trim().length === 0 ? (
                          <p
                            data-testid="fact-key-required-message"
                            className="text-[10px] uppercase tracking-[0.12em] text-destructive"
                          >
                            Fact key is required to save.
                          </p>
                        ) : null}
                      </div>
                    )}
                  </form.Field>
                  <form.Field name="factType">
                    {(field) => (
                      <div className="space-y-2">
                        <Label
                          htmlFor={field.name}
                          className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
                        >
                          Fact Type
                        </Label>
                        <Select
                          value={field.state.value}
                          onValueChange={(v) =>
                            field.handleChange(v as FactEditorValue["factType"])
                          }
                        >
                          <SelectTrigger className="h-9 rounded-none border-border/70 bg-background/50 text-xs tracking-[0.04em]">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent className="rounded-none border-border/70 bg-background text-xs">
                            <SelectItem value="string">string</SelectItem>
                            <SelectItem value="number">number</SelectItem>
                            <SelectItem value="boolean">boolean</SelectItem>
                            <SelectItem value="json">json</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </form.Field>
                  <form.Subscribe selector={(state) => state.values.factType}>
                    {(factType) =>
                      factType !== "json" ? (
                        <form.Field name="defaultValue">
                          {(field) => (
                            <div className="space-y-2">
                              <Label
                                htmlFor={field.name}
                                className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
                              >
                                Default Value
                              </Label>
                              <Input
                                id={field.name}
                                className="rounded-none border-border/70 bg-background/50 text-xs tracking-[0.04em] placeholder:text-muted-foreground/50"
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) => field.handleChange(e.target.value)}
                              />
                            </div>
                          )}
                        </form.Field>
                      ) : null
                    }
                  </form.Subscribe>
                  <form.Subscribe selector={(state) => state.values.factType}>
                    {(factType) =>
                      factType === "string" ? (
                        <div className="col-span-2 space-y-6">
                          <form.Field name="validationType">
                            {(field) => (
                              <div className="space-y-2">
                                <Label
                                  htmlFor={field.name}
                                  className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
                                >
                                  Validation Type
                                </Label>
                                <Select
                                  value={field.state.value}
                                  onValueChange={(v) =>
                                    field.handleChange(v as FactEditorFormValues["validationType"])
                                  }
                                >
                                  <SelectTrigger className="h-9 rounded-none border-border/70 bg-background/50 text-xs tracking-[0.04em]">
                                    <SelectValue placeholder="Select validation" />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-none border-border/70 bg-background text-xs">
                                    <SelectItem value="none">none</SelectItem>
                                    <SelectItem value="path">path</SelectItem>
                                    <SelectItem value="allowed-values">allowed-values</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </form.Field>

                          <form.Subscribe selector={(state) => state.values.validationType}>
                            {(validationType) =>
                              validationType === "path" ? (
                                <Card
                                  frame="flat"
                                  tone="contracts"
                                  className="rounded-none border-0 bg-background/30 p-4 shadow-none"
                                >
                                  <div className="grid gap-6">
                                    <form.Field name="pathKind">
                                      {(field) => (
                                        <div className="space-y-2">
                                          <Label
                                            htmlFor={field.name}
                                            className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
                                          >
                                            Path Kind
                                          </Label>
                                          <Select
                                            value={field.state.value}
                                            onValueChange={(v) =>
                                              field.handleChange(v as "file" | "directory")
                                            }
                                          >
                                            <SelectTrigger className="h-9 rounded-none border-border/70 bg-background/50 text-xs tracking-[0.04em]">
                                              <SelectValue placeholder="Select kind" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-none border-border/70 bg-background text-xs">
                                              <SelectItem value="file">file</SelectItem>
                                              <SelectItem value="directory">directory</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      )}
                                    </form.Field>
                                    <div className="flex flex-wrap gap-x-8 gap-y-4">
                                      <form.Field name="trimWhitespace">
                                        {(field) => (
                                          <div className="flex items-center gap-2">
                                            <Checkbox
                                              id={field.name}
                                              checked={field.state.value}
                                              onCheckedChange={(checked) =>
                                                field.handleChange(checked === true)
                                              }
                                            />
                                            <Label
                                              htmlFor={field.name}
                                              className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground"
                                            >
                                              Trim Whitespace
                                            </Label>
                                          </div>
                                        )}
                                      </form.Field>
                                      <form.Field name="disallowAbsolute">
                                        {(field) => (
                                          <div className="flex items-center gap-2">
                                            <Checkbox
                                              id={field.name}
                                              checked={field.state.value}
                                              onCheckedChange={(checked) =>
                                                field.handleChange(checked === true)
                                              }
                                            />
                                            <Label
                                              htmlFor={field.name}
                                              className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground"
                                            >
                                              Disallow Absolute
                                            </Label>
                                          </div>
                                        )}
                                      </form.Field>
                                      <form.Field name="preventTraversal">
                                        {(field) => (
                                          <div className="flex items-center gap-2">
                                            <Checkbox
                                              id={field.name}
                                              checked={field.state.value}
                                              onCheckedChange={(checked) =>
                                                field.handleChange(checked === true)
                                              }
                                            />
                                            <Label
                                              htmlFor={field.name}
                                              className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground"
                                            >
                                              Prevent Traversal
                                            </Label>
                                          </div>
                                        )}
                                      </form.Field>
                                    </div>
                                  </div>
                                </Card>
                              ) : validationType === "allowed-values" ? (
                                <form.Field name="allowedValues">
                                  {(field) => (
                                    <div className="space-y-2">
                                      <Label className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                                        Allowed Values
                                      </Label>
                                      <AllowedValuesChipEditor
                                        values={field.state.value
                                          .split(/\r?\n/g)
                                          .map((value) => value.trim())
                                          .filter((value) => value.length > 0)}
                                        onChange={(values) => field.handleChange(values.join("\n"))}
                                      />
                                    </div>
                                  )}
                                </form.Field>
                              ) : null
                            }
                          </form.Subscribe>
                        </div>
                      ) : factType === "json" ? (
                        <div className="col-span-2 space-y-4">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                              JSON Sub-schema Keys
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              className="rounded-none px-3"
                              onClick={() => {
                                setIsContractTabDirty(true);
                                setJsonSubKeys((current) => [
                                  ...current,
                                  createEmptyJsonSubKey(current),
                                ]);
                              }}
                            >
                              Add JSON Key
                            </Button>
                          </div>

                          {jsonSubKeys.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                              No keys defined yet. Add at least one key to author the JSON fact
                              schema.
                            </p>
                          ) : (
                            <div className="space-y-4">
                              {jsonSubKeys.map((entry, index) => (
                                <Card
                                  key={entry.id}
                                  frame="flat"
                                  tone="contracts"
                                  className="rounded-none border-0 bg-background/30 p-4 shadow-none"
                                >
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                      <div className="space-y-2">
                                        <Label
                                          htmlFor={`json-subkey-display-${entry.id}`}
                                          className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
                                        >
                                          Key Display Name
                                        </Label>
                                        <Input
                                          id={`json-subkey-display-${entry.id}`}
                                          className="rounded-none border-border/70 bg-background/50 text-xs tracking-[0.04em]"
                                          value={entry.displayName}
                                          onChange={(event) => {
                                            setIsContractTabDirty(true);
                                            setJsonSubKeys((current) =>
                                              current.map((currentEntry, currentIndex) =>
                                                currentIndex === index
                                                  ? {
                                                      ...currentEntry,
                                                      displayName: event.target.value,
                                                    }
                                                  : currentEntry,
                                              ),
                                            );
                                          }}
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label
                                          htmlFor={`json-subkey-key-${entry.id}`}
                                          className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
                                        >
                                          Key Name
                                        </Label>
                                        <Input
                                          id={`json-subkey-key-${entry.id}`}
                                          className="rounded-none border-border/70 bg-background/50 text-xs tracking-[0.04em]"
                                          value={entry.key}
                                          onChange={(event) => {
                                            setIsContractTabDirty(true);
                                            setJsonSubKeys((current) =>
                                              current.map((currentEntry, currentIndex) =>
                                                currentIndex === index
                                                  ? { ...currentEntry, key: event.target.value }
                                                  : currentEntry,
                                              ),
                                            );
                                          }}
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label
                                          htmlFor={`json-subkey-value-${entry.id}`}
                                          className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
                                        >
                                          {entry.valueType === "boolean"
                                            ? "Default Value"
                                            : entry.valueType === "number"
                                              ? "Default Value"
                                              : "Default Value"}
                                        </Label>
                                        {entry.valueType === "boolean" ? (
                                          <div className="flex items-center gap-3">
                                            <Checkbox
                                              id={`json-subkey-value-${entry.id}`}
                                              checked={entry.value === "true"}
                                              onCheckedChange={(checked) => {
                                                setIsContractTabDirty(true);
                                                setJsonSubKeys((current) =>
                                                  current.map((currentEntry, currentIndex) =>
                                                    currentIndex === index
                                                      ? {
                                                          ...currentEntry,
                                                          value:
                                                            checked === true ? "true" : "false",
                                                        }
                                                      : currentEntry,
                                                  ),
                                                );
                                              }}
                                            />
                                            <span className="text-xs text-muted-foreground">
                                              {entry.value === "true" ? "true" : "false"}
                                            </span>
                                          </div>
                                        ) : entry.valueType === "number" ? (
                                          <Input
                                            id={`json-subkey-value-${entry.id}`}
                                            type="number"
                                            className="rounded-none border-border/70 bg-background/50 text-xs tracking-[0.04em]"
                                            value={entry.value}
                                            onChange={(event) => {
                                              setIsContractTabDirty(true);
                                              setJsonSubKeys((current) =>
                                                current.map((currentEntry, currentIndex) =>
                                                  currentIndex === index
                                                    ? { ...currentEntry, value: event.target.value }
                                                    : currentEntry,
                                                ),
                                              );
                                            }}
                                          />
                                        ) : (
                                          <Input
                                            id={`json-subkey-value-${entry.id}`}
                                            className="rounded-none border-border/70 bg-background/50 text-xs tracking-[0.04em]"
                                            value={entry.value}
                                            onChange={(event) => {
                                              setIsContractTabDirty(true);
                                              setJsonSubKeys((current) =>
                                                current.map((currentEntry, currentIndex) =>
                                                  currentIndex === index
                                                    ? { ...currentEntry, value: event.target.value }
                                                    : currentEntry,
                                                ),
                                              );
                                            }}
                                          />
                                        )}
                                      </div>
                                      <div className="space-y-2">
                                        <Label
                                          htmlFor={`json-subkey-type-${entry.id}`}
                                          className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
                                        >
                                          Value Type
                                        </Label>
                                        <Select
                                          value={entry.valueType}
                                          onValueChange={(value) => {
                                            setIsContractTabDirty(true);
                                            setJsonSubKeys((current) =>
                                              current.map((currentEntry, currentIndex) =>
                                                currentIndex === index
                                                  ? {
                                                      ...currentEntry,
                                                      valueType: value as JsonFactValueType,
                                                      validationType:
                                                        value === "string"
                                                          ? currentEntry.validationType
                                                          : "none",
                                                    }
                                                  : currentEntry,
                                              ),
                                            );
                                          }}
                                        >
                                          <SelectTrigger
                                            id={`json-subkey-type-${entry.id}`}
                                            className="h-9 rounded-none border-border/70 bg-background/50 text-xs tracking-[0.04em]"
                                          >
                                            <SelectValue placeholder="Select type" />
                                          </SelectTrigger>
                                          <SelectContent className="rounded-none border-border/70 bg-background text-xs">
                                            <SelectItem value="string">string</SelectItem>
                                            <SelectItem value="number">number</SelectItem>
                                            <SelectItem value="boolean">boolean</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>

                                    {entry.valueType === "string" ? (
                                      <div className="space-y-4 border border-border/70 p-3">
                                        <div className="space-y-2">
                                          <Label className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                                            Value Validation Type
                                          </Label>
                                          <Select
                                            value={entry.validationType}
                                            onValueChange={(value) => {
                                              setIsContractTabDirty(true);
                                              setJsonSubKeys((current) =>
                                                current.map((currentEntry, currentIndex) =>
                                                  currentIndex === index
                                                    ? {
                                                        ...currentEntry,
                                                        validationType:
                                                          value as JsonSubKey["validationType"],
                                                      }
                                                    : currentEntry,
                                                ),
                                              );
                                            }}
                                          >
                                            <SelectTrigger className="h-9 rounded-none border-border/70 bg-background/50 text-xs tracking-[0.04em]">
                                              <SelectValue placeholder="Select validation" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-none border-border/70 bg-background text-xs">
                                              <SelectItem value="none">none</SelectItem>
                                              <SelectItem value="path">path</SelectItem>
                                              <SelectItem value="allowed-values">
                                                allowed-values
                                              </SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>

                                        {entry.validationType === "path" ? (
                                          <div className="space-y-3">
                                            <div className="space-y-2">
                                              <Label className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                                                Path Kind
                                              </Label>
                                              <Select
                                                value={entry.pathKind}
                                                onValueChange={(value) => {
                                                  setIsContractTabDirty(true);
                                                  setJsonSubKeys((current) =>
                                                    current.map((currentEntry, currentIndex) =>
                                                      currentIndex === index
                                                        ? {
                                                            ...currentEntry,
                                                            pathKind: value as "file" | "directory",
                                                          }
                                                        : currentEntry,
                                                    ),
                                                  );
                                                }}
                                              >
                                                <SelectTrigger className="h-9 rounded-none border-border/70 bg-background/50 text-xs tracking-[0.04em]">
                                                  <SelectValue placeholder="Select path kind" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-none border-border/70 bg-background text-xs">
                                                  <SelectItem value="file">file</SelectItem>
                                                  <SelectItem value="directory">
                                                    directory
                                                  </SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </div>
                                            <div className="flex flex-wrap gap-x-6 gap-y-3">
                                              <div className="flex items-center gap-2">
                                                <Checkbox
                                                  checked={entry.trimWhitespace}
                                                  onCheckedChange={(checked) => {
                                                    setIsContractTabDirty(true);
                                                    setJsonSubKeys((current) =>
                                                      current.map((currentEntry, currentIndex) =>
                                                        currentIndex === index
                                                          ? {
                                                              ...currentEntry,
                                                              trimWhitespace: checked === true,
                                                            }
                                                          : currentEntry,
                                                      ),
                                                    );
                                                  }}
                                                />
                                                <Label className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                                                  Trim Whitespace
                                                </Label>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <Checkbox
                                                  checked={entry.disallowAbsolute}
                                                  onCheckedChange={(checked) => {
                                                    setIsContractTabDirty(true);
                                                    setJsonSubKeys((current) =>
                                                      current.map((currentEntry, currentIndex) =>
                                                        currentIndex === index
                                                          ? {
                                                              ...currentEntry,
                                                              disallowAbsolute: checked === true,
                                                            }
                                                          : currentEntry,
                                                      ),
                                                    );
                                                  }}
                                                />
                                                <Label className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                                                  Disallow Absolute
                                                </Label>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <Checkbox
                                                  checked={entry.preventTraversal}
                                                  onCheckedChange={(checked) => {
                                                    setIsContractTabDirty(true);
                                                    setJsonSubKeys((current) =>
                                                      current.map((currentEntry, currentIndex) =>
                                                        currentIndex === index
                                                          ? {
                                                              ...currentEntry,
                                                              preventTraversal: checked === true,
                                                            }
                                                          : currentEntry,
                                                      ),
                                                    );
                                                  }}
                                                />
                                                <Label className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                                                  Prevent Traversal
                                                </Label>
                                              </div>
                                            </div>
                                          </div>
                                        ) : null}

                                        {entry.validationType === "allowed-values" ? (
                                          <div className="space-y-2">
                                            <Label className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                                              Allowed Values
                                            </Label>
                                            <AllowedValuesChipEditor
                                              values={entry.allowedValues
                                                .split(/\r?\n/g)
                                                .map((value) => value.trim())
                                                .filter((value) => value.length > 0)}
                                              onChange={(values) => {
                                                setIsContractTabDirty(true);
                                                setJsonSubKeys((current) =>
                                                  current.map((currentEntry, currentIndex) =>
                                                    currentIndex === index
                                                      ? {
                                                          ...currentEntry,
                                                          allowedValues: values.join("\n"),
                                                        }
                                                      : currentEntry,
                                                  ),
                                                );
                                              }}
                                            />
                                          </div>
                                        ) : null}
                                      </div>
                                    ) : null}

                                    <div className="flex justify-end">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        className="rounded-none px-3"
                                        onClick={() => {
                                          setIsContractTabDirty(true);
                                          setJsonSubKeys((current) =>
                                            current.filter(
                                              (currentEntry) => currentEntry.id !== entry.id,
                                            ),
                                          );
                                        }}
                                      >
                                        Remove Key
                                      </Button>
                                    </div>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : null
                    }
                  </form.Subscribe>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-x-10 gap-y-6">
                  <form.Field name="description">
                    {(field) => (
                      <div className="col-span-2 space-y-2">
                        <Label
                          htmlFor={field.name}
                          className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
                        >
                          Description
                        </Label>
                        <Textarea
                          id={field.name}
                          className="min-h-[6rem] resize-none rounded-none border-border/70 bg-background/50 p-3 text-xs tracking-[0.04em] placeholder:text-muted-foreground/50"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </div>
                    )}
                  </form.Field>
                  <form.Field name="humanMarkdown">
                    {(field) => (
                      <div className="space-y-2">
                        <Label
                          htmlFor={field.name}
                          className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
                        >
                          Human Guidance
                        </Label>
                        <Textarea
                          id={field.name}
                          className="min-h-[14rem] resize-none rounded-none border-border/70 bg-background/50 p-3 text-xs tracking-[0.04em] placeholder:text-muted-foreground/50"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </div>
                    )}
                  </form.Field>
                  <form.Field name="agentMarkdown">
                    {(field) => (
                      <div className="space-y-2">
                        <Label
                          htmlFor={field.name}
                          className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
                        >
                          Agent Guidance
                        </Label>
                        <Textarea
                          id={field.name}
                          className="min-h-[14rem] resize-none rounded-none border-border/70 bg-background/50 p-3 text-xs tracking-[0.04em] placeholder:text-muted-foreground/50"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </div>
                    )}
                  </form.Field>
                </div>
              )}
            </div>

            <DialogFooter className="sm:justify-end sm:gap-4 sm:px-0">
              <Button
                variant="outline"
                className="rounded-none px-6"
                type="button"
                onClick={requestClose}
              >
                Cancel
              </Button>
              <form.Subscribe selector={(state) => state.values.factKey}>
                {(factKey) => (
                  <Button
                    className="rounded-none px-8"
                    type="submit"
                    disabled={factKey.trim().length === 0}
                  >
                    Save
                  </Button>
                )}
              </form.Subscribe>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>

      <Dialog open={isDiscardDialogOpen} onOpenChange={setIsDiscardDialogOpen}>
        <DialogContent className="max-w-md rounded-none">
          <DialogHeader>
            <DialogTitle>Discard unsaved changes?</DialogTitle>
            <DialogDescription>
              You have unsaved fact edits. Discarding now will close the dialog and lose those
              changes.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-none"
              type="button"
              onClick={() => setIsDiscardDialogOpen(false)}
            >
              Keep Editing
            </Button>
            <Button className="rounded-none" type="button" onClick={closeDialog}>
              Discard Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

export function MethodologyVersionFactsRoute() {
  const { methodologyId, versionId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { orpc, queryClient } = Route.useRouteContext();
  const initialDraft = useMemo(
    () => createEmptyMethodologyVersionWorkspaceDraft(methodologyId),
    [methodologyId],
  );
  const [draft, setDraft] = useState<MethodologyVersionWorkspaceDraft>(initialDraft);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingFactId, setEditingFactId] = useState<string | null>(null);
  const [editorFact, setEditorFact] = useState<FactEditorValue>(createEmptyMethodologyFact());
  const [guidanceFactId, setGuidanceFactId] = useState<string | null>(null);
  const [deleteFactId, setDeleteFactId] = useState<string | null>(null);

  const detailsQueryOptions = orpc.methodology.getMethodologyDetails.queryOptions({
    input: { methodologyKey: methodologyId },
  });
  const detailsQuery = useQuery(detailsQueryOptions);
  const details = (detailsQuery.data as MethodologyDetails | undefined) ?? null;
  const currentVersion = details?.versions.find((version) => version.id === versionId) ?? null;
  const draftQueryOptions = orpc.methodology.version.fact.list.queryOptions({
    input: { versionId },
  });
  const draftQuery = useQuery(draftQueryOptions);
  const createFactMutation = useMutation(orpc.methodology.version.fact.create.mutationOptions());
  const updateFactMutation = useMutation(orpc.methodology.version.fact.update.mutationOptions());
  const deleteFactMutation = useMutation(orpc.methodology.version.fact.delete.mutationOptions());

  useEffect(() => {
    if (!draftQuery.data) {
      return;
    }

    setDraft(createDraftFromProjection(methodologyId, draftQuery.data as DraftProjectionShape));
  }, [draftQuery.data, methodologyId]);

  const facts = useMemo(
    () => parseMethodologyFacts(draft.factDefinitionsJson),
    [draft.factDefinitionsJson],
  );

  const findFactById = (factId: string): FactEditorValue | null => {
    for (const [index, fact] of facts.entries()) {
      const rowId = fact.__uiId ?? `fact-row-${index}`;
      if (rowId === factId) {
        return fact;
      }
    }

    return null;
  };

  const openCreateDialog = () => {
    setEditingFactId(null);
    setEditorFact(createEmptyMethodologyFact());
    setEditorOpen(true);
  };

  const isCreateIntentActive = search.intent === "add-fact";

  const openEditDialog = (factId: string) => {
    const existing = findFactById(factId);
    if (!existing) {
      return;
    }

    setEditingFactId(factId);
    setEditorFact(existing);
    setEditorOpen(true);
  };

  const selectedGuidanceFact = guidanceFactId ? findFactById(guidanceFactId) : null;
  const guidanceHuman = (
    (
      selectedGuidanceFact?.guidance?.human as
        | { markdown?: string; short?: string; long?: string }
        | undefined
    )?.markdown ??
    (selectedGuidanceFact?.guidance?.human as { short?: string; long?: string } | undefined)
      ?.short ??
    (selectedGuidanceFact?.guidance?.human as { short?: string; long?: string } | undefined)
      ?.long ??
    ""
  ).trim();
  const guidanceAgent = (
    (selectedGuidanceFact?.guidance?.agent as { markdown?: string; intent?: string } | undefined)
      ?.markdown ??
    (selectedGuidanceFact?.guidance?.agent as { intent?: string } | undefined)?.intent ??
    ""
  ).trim();

  const refreshFacts = async (successMessage: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: detailsQueryOptions.queryKey }),
      queryClient.invalidateQueries({ queryKey: draftQueryOptions.queryKey }),
    ]);

    const refreshedDraft = await draftQuery.refetch();
    if (refreshedDraft.data) {
      setDraft(
        createDraftFromProjection(methodologyId, refreshedDraft.data as DraftProjectionShape),
      );
    }

    toast.success(successMessage);
  };

  const deleteFact = async () => {
    if (!deleteFactId || deleteFactMutation.isPending) {
      return;
    }

    const existing = findFactById(deleteFactId);
    if (!existing) {
      return;
    }

    const deleteResult = await Result.tryPromise({
      try: async () => {
        await deleteFactMutation.mutateAsync({ versionId, factKey: existing.key });
        await refreshFacts("Fact deleted");
      },
      catch: (error) => error,
    });

    if (deleteResult.isErr()) {
      return;
    }
    setDeleteFactId(null);
  };

  const saveEditorFact = async (nextFact: FactEditorValue) => {
    const mutationResult = await Result.tryPromise({
      try: async () => {
        if (editingFactId) {
          const existing = findFactById(editingFactId);
          if (!existing) {
            return;
          }

          await updateFactMutation.mutateAsync({
            versionId,
            factKey: existing.key,
            fact: factToMutationInput(nextFact) as never,
          });
        } else {
          await createFactMutation.mutateAsync({
            versionId,
            fact: factToMutationInput(nextFact) as never,
          });
        }

        await refreshFacts("Fact saved");
      },
      catch: (error) => error,
    });

    if (mutationResult.isErr()) {
      return;
    }

    setEditorOpen(false);
    setEditingFactId(null);
    setEditorFact(createEmptyMethodologyFact());
  };

  return (
    <>
      <MethodologyWorkspaceShell
        title="Methodology Facts"
        stateLabel={
          detailsQuery.isLoading || draftQuery.isLoading
            ? "loading"
            : detailsQuery.isError || draftQuery.isError
              ? "failed"
              : "success"
        }
        segments={[
          { label: "Methodologies", to: "/methodologies" },
          { label: methodologyId, to: "/methodologies/$methodologyId", params: { methodologyId } },
          {
            label: "Versions",
            to: "/methodologies/$methodologyId/versions",
            params: { methodologyId },
          },
          {
            label: currentVersion?.displayName ?? versionId,
            to: "/methodologies/$methodologyId/versions/$versionId",
            params: { methodologyId, versionId },
          },
          { label: "Facts" },
        ]}
      >
        {detailsQuery.isLoading ? <p className="text-sm">Loading methodology facts...</p> : null}
        {detailsQuery.isError ? (
          <p className="text-sm">State: failed - Unable to load methodology details.</p>
        ) : null}

        {details ? (
          <div className="space-y-4">
            <section className="border border-border/80 bg-background p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                    Methodology Facts
                  </p>
                  <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                    Fact Inventory
                  </p>
                  <h2 className="mt-2 text-xl font-semibold uppercase tracking-[0.08em]">
                    {details.displayName}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Editing contract for {currentVersion?.displayName ?? versionId}.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" className="rounded-none" onClick={openCreateDialog}>
                    Add Fact
                  </Button>
                  <Link
                    to="/methodologies/$methodologyId/versions/$versionId"
                    params={{ methodologyId, versionId }}
                    className={buttonVariants({ size: "sm", variant: "outline" })}
                  >
                    Open Workspace
                  </Link>
                  <Link
                    to="/methodologies/$methodologyId/versions"
                    params={{ methodologyId }}
                    className={buttonVariants({ size: "sm", variant: "outline" })}
                  >
                    Open Versions
                  </Link>
                </div>
              </div>

              <div className="mt-4">
                <MethodologyFactsInventory
                  facts={facts}
                  onViewGuidance={setGuidanceFactId}
                  onEditFact={openEditDialog}
                  onDeleteFact={setDeleteFactId}
                />
              </div>
            </section>
          </div>
        ) : null}
      </MethodologyWorkspaceShell>

      <FactEditorDialog
        key={`${editingFactId ?? "new"}-${editorOpen ? "open" : "closed"}`}
        open={editorOpen || isCreateIntentActive}
        onOpenChange={(open) => {
          setEditorOpen(open);
          if (!open && isCreateIntentActive) {
            void navigate({
              to: "/methodologies/$methodologyId/versions/$versionId/facts",
              params: { methodologyId, versionId },
              search: {},
            });
          }
        }}
        initialFact={editorFact}
        isEditing={editingFactId !== null}
        onSave={saveEditorFact}
      />

      <Dialog
        open={guidanceFactId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setGuidanceFactId(null);
          }
        }}
      >
        <DialogContent className="chiron-cut-frame-thick w-[min(38rem,calc(100vw-2rem))] p-6 sm:max-w-none">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold uppercase tracking-[0.08em]">
              Guidance
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Review the stored methodology guidance before editing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <section className="space-y-2">
              <h3 className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Human</h3>
              <div className="border border-border/70 p-3 text-sm leading-6">
                {guidanceHuman ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{guidanceHuman}</ReactMarkdown>
                ) : (
                  "-"
                )}
              </div>
            </section>
            <section className="space-y-2">
              <h3 className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Agent</h3>
              <div className="border border-border/70 p-3 text-sm leading-6">
                {guidanceAgent ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{guidanceAgent}</ReactMarkdown>
                ) : (
                  "-"
                )}
              </div>
            </section>
          </div>
          <DialogFooter>
            <Button className="rounded-none" onClick={() => setGuidanceFactId(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteFactId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteFactId(null);
          }
        }}
      >
        <DialogContent className="chiron-cut-frame-thick w-[min(34rem,calc(100vw-2rem))] border-destructive/50 p-6 sm:max-w-none">
          <DialogHeader>
            <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-destructive">
              <AlertTriangleIcon className="size-4" aria-hidden="true" />
              <span>Destructive action</span>
            </div>
            <DialogTitle className="text-base font-semibold uppercase tracking-[0.08em] text-destructive">
              Delete Fact
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              This will permanently remove this fact from the methodology contract.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-none border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive/90">
            Removing this fact can invalidate workflow assumptions, prompts, and transition
            references that depend on it.
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="rounded-none"
              onClick={() => setDeleteFactId(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-none"
              onClick={() => void deleteFact()}
            >
              Delete Fact Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
