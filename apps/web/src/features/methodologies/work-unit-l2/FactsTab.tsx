import { useMemo, useState } from "react";
import { AlertTriangleIcon, CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogDescription,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

type FactType = "string" | "number" | "boolean" | "json" | "work unit";
type CanonicalFactType = FactType | "work_unit" | "work_unit_ref";
type FactCardinality = "one" | "many";
type ValidationKind = "none" | "path" | "allowed-values" | "json-schema";
type FactEditorStep = "contract" | "guidance";

type PathValidation = {
  pathKind?: "file" | "directory";
  normalization?: { mode?: string; trimWhitespace?: boolean };
  safety?: { disallowAbsolute?: boolean; preventTraversal?: boolean };
};

type RawFactValidation = {
  kind?: ValidationKind;
  path?: PathValidation;
  schemaDialect?: string;
  schema?: unknown;
  subSchema?: unknown;
  dependencyType?: string;
  workUnitKey?: string;
  rules?: Array<{ kind?: string; values?: string[] }>;
};

type RawFact = {
  kind?: "plain_fact" | "work_unit_reference_fact";
  name?: string;
  key: string;
  type?: "string" | "number" | "boolean" | "json";
  factType: CanonicalFactType;
  cardinality?: FactCardinality;
  defaultValue?: unknown;
  guidance?: {
    human?: { markdown?: string };
    agent?: { markdown?: string };
  };
  description?: string | { markdown?: string };
  validation?: RawFactValidation;
  dependencyType?: string;
};

type DependencyDefinition = {
  key?: string;
  name?: string;
};

type WorkUnitDefinition = {
  key: string;
  displayName?: string;
};

type FactsTabProps = {
  initialFacts: readonly unknown[];
  dependencyDefinitions?: readonly DependencyDefinition[];
  workUnits?: readonly WorkUnitDefinition[];
  createDialogOpen?: boolean;
  onCreateDialogOpenChange?: (open: boolean) => void;
  onCreateFact?: (input: { fact: RawFact }) => Promise<void>;
  onUpdateFact?: (input: { factKey: string; fact: RawFact }) => Promise<void>;
  onDeleteFact?: (input: { factKey: string }) => Promise<void>;
};

type UiFact = {
  id: string;
  name: string;
  key: string;
  factType: FactType;
  cardinality: FactCardinality;
  validationKind: ValidationKind;
  defaultValue: unknown;
  dependencyType: string;
  workUnitKey: string;
  pathKind: "file" | "directory";
  trimWhitespace: boolean;
  disallowAbsolute: boolean;
  preventTraversal: boolean;
  allowedValues: string;
  numberMin: number | undefined;
  numberMax: number | undefined;
  humanGuidance: string;
  agentGuidance: string;
  description: string;
  jsonSubKeys: JsonSubKey[];
};

type FactFormState = {
  name: string;
  key: string;
  factType: FactType;
  cardinality: FactCardinality;
  validationKind: ValidationKind;
  defaultValue: string;
  dependencyType: string;
  workUnitKey: string;
  pathKind: "file" | "directory";
  trimWhitespace: boolean;
  disallowAbsolute: boolean;
  preventTraversal: boolean;
  allowedValues: string;
  numberMin: string;
  numberMax: string;
  humanGuidance: string;
  agentGuidance: string;
  description: string;
};

type JsonFactValueType = "string" | "number" | "boolean";

type JsonSubKey = {
  id: string;
  displayName: string;
  key: string;
  valueType: JsonFactValueType;
  cardinality: FactCardinality;
  validationType: "none" | "path" | "allowed-values";
  pathKind: "file" | "directory";
  trimWhitespace: boolean;
  disallowAbsolute: boolean;
  preventTraversal: boolean;
  allowedValues: string;
  numberMin: string;
  numberMax: string;
};

let jsonSubKeyIdSequence = 0;

function createJsonSubKeyId(): string {
  jsonSubKeyIdSequence += 1;
  return `json-sub-key-${jsonSubKeyIdSequence}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toJsonValueType(value: unknown): JsonFactValueType {
  if (value === "string" || value === "number" || value === "boolean") {
    return value;
  }

  return "string";
}

function parseJsonSubKeys(validation: RawFactValidation | undefined): JsonSubKey[] {
  if (validation?.kind !== "json-schema") {
    return [];
  }

  const schema = isRecord(validation.schema) ? validation.schema : {};
  const properties = isRecord(schema.properties) ? schema.properties : {};
  const rawSubSchema = validation.subSchema;
  const subSchema = isRecord(rawSubSchema) ? rawSubSchema : {};
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
      numberMin: toOptionalNumberInput(propertyRecord.minimum),
      numberMax: toOptionalNumberInput(propertyRecord.maximum),
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
    valueType: "string",
    cardinality: "one",
    validationType: "none",
    pathKind: "file",
    trimWhitespace: true,
    disallowAbsolute: true,
    preventTraversal: true,
    allowedValues: "",
    numberMin: "",
    numberMax: "",
  };
}

function jsonSubKeysToJsonSchemaValidation(keys: readonly JsonSubKey[]): RawFactValidation {
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
    } else if (entry.valueType === "number") {
      const minimum = parseOptionalNumber(entry.numberMin);
      const maximum = parseOptionalNumber(entry.numberMax);

      if (typeof minimum === "number") {
        propertySchema.minimum = minimum;
      }

      if (typeof maximum === "number") {
        propertySchema.maximum = maximum;
      }
    }

    subSchemaFields.push({
      key: trimmedKey,
      type: entry.valueType,
      cardinality: entry.cardinality,
    });
    properties[trimmedKey] = propertySchema;
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
  };
}

function createFactId(index: number): string {
  return `wu-fact-${index + 1}`;
}

function toUiFactType(fact: RawFact): FactType {
  if (fact.kind === "work_unit_reference_fact") {
    return "work unit";
  }

  const value = fact.factType;

  if (value === "work unit" || value === "work_unit" || value === "work_unit_ref") {
    return "work unit";
  }

  if (value === "number" || value === "boolean" || value === "json" || value === "string") {
    return value;
  }

  return "string";
}

function parseNumberBounds(validation: RawFactValidation | undefined): {
  minimum?: number;
  maximum?: number;
} {
  if (validation?.kind !== "json-schema" || !isRecord(validation.schema)) {
    return {};
  }

  const minimum =
    typeof validation.schema.minimum === "number" && Number.isFinite(validation.schema.minimum)
      ? validation.schema.minimum
      : undefined;
  const maximum =
    typeof validation.schema.maximum === "number" && Number.isFinite(validation.schema.maximum)
      ? validation.schema.maximum
      : undefined;

  return {
    ...(typeof minimum === "number" ? { minimum } : {}),
    ...(typeof maximum === "number" ? { maximum } : {}),
  };
}

function parseOptionalNumber(rawValue: string): number | undefined {
  const trimmed = rawValue.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  const numeric = Number(trimmed);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function toOptionalNumberInput(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}

function hasInvalidNumberRange(minRaw: string, maxRaw: string): boolean {
  const minimum = parseOptionalNumber(minRaw);
  const maximum = parseOptionalNumber(maxRaw);
  return typeof minimum === "number" && typeof maximum === "number" && maximum < minimum;
}

function hasInvalidJsonSubKeyNumberRange(keys: readonly JsonSubKey[]): boolean {
  return keys.some(
    (entry) =>
      entry.valueType === "number" && hasInvalidNumberRange(entry.numberMin, entry.numberMax),
  );
}

function normalizeFact(source: unknown, index: number): UiFact {
  const fact = (source ?? {}) as RawFact;
  const name = fact.name?.trim() || fact.key?.trim() || `Fact ${index + 1}`;
  const key = fact.key?.trim() || `fact.${index + 1}`;
  const factType = toUiFactType(fact);
  const validationKind = getUiValidationKind(fact.validation);
  const dependencyType =
    fact.validation?.dependencyType?.trim() || fact.dependencyType?.trim() || "";
  const workUnitKey = fact.validation?.workUnitKey?.trim() || "";
  const path = fact.validation?.path;
  const defaultValue = fact.defaultValue;
  const pathKind = path?.pathKind === "directory" ? "directory" : "file";
  const trimWhitespace = path?.normalization?.trimWhitespace ?? true;
  const disallowAbsolute = path?.safety?.disallowAbsolute ?? true;
  const preventTraversal = path?.safety?.preventTraversal ?? true;
  const allowedValues = getAllowedValues(fact.validation).join("\n");
  const humanGuidance = fact.guidance?.human?.markdown ?? "";
  const agentGuidance = fact.guidance?.agent?.markdown ?? "";
  const description =
    typeof fact.description === "string"
      ? fact.description.trim()
      : (fact.description?.markdown?.trim() ?? "");
  const jsonSubKeys = parseJsonSubKeys(fact.validation);
  const numberBounds = parseNumberBounds(fact.validation);

  return {
    id: createFactId(index),
    name,
    key,
    factType,
    cardinality: fact.cardinality === "many" ? "many" : "one",
    validationKind,
    defaultValue,
    dependencyType,
    workUnitKey,
    pathKind,
    trimWhitespace,
    disallowAbsolute,
    preventTraversal,
    allowedValues,
    numberMin: numberBounds.minimum,
    numberMax: numberBounds.maximum,
    humanGuidance,
    agentGuidance,
    description,
    jsonSubKeys,
  };
}

function compareUiFactsByKey(a: UiFact, b: UiFact) {
  return a.key.localeCompare(b.key);
}

function toFormState(fact?: UiFact): FactFormState {
  return {
    name: fact?.name ?? "",
    key: fact?.key ?? "",
    factType: fact?.factType ?? "string",
    cardinality: fact?.cardinality ?? "one",
    validationKind: fact?.validationKind ?? "none",
    defaultValue: fact?.defaultValue === undefined ? "" : String(fact.defaultValue),
    dependencyType: fact?.dependencyType ?? "",
    pathKind: fact?.pathKind ?? "file",
    trimWhitespace: fact?.trimWhitespace ?? true,
    disallowAbsolute: fact?.disallowAbsolute ?? true,
    preventTraversal: fact?.preventTraversal ?? true,
    allowedValues: fact?.allowedValues ?? "",
    numberMin: typeof fact?.numberMin === "number" ? String(fact.numberMin) : "",
    numberMax: typeof fact?.numberMax === "number" ? String(fact.numberMax) : "",
    humanGuidance: fact?.humanGuidance ?? "",
    agentGuidance: fact?.agentGuidance ?? "",
    description: fact?.description ?? "",
    workUnitKey: fact?.workUnitKey ?? "",
  };
}

function guidanceSummary(fact: UiFact): string {
  const count = [fact.humanGuidance, fact.agentGuidance].filter(
    (entry) => entry.trim().length > 0,
  ).length;
  if (count === 0) {
    return "—";
  }

  return `${count} note${count > 1 ? "s" : ""}`;
}

function getValidationBadgeClass(kind: ValidationKind): string {
  if (kind === "path") {
    return "border-amber-500/50 bg-amber-500/20 text-amber-200";
  }

  if (kind === "json-schema") {
    return "border-emerald-500/50 bg-emerald-500/20 text-emerald-200";
  }

  if (kind === "allowed-values") {
    return "border-indigo-500/50 bg-indigo-500/20 text-indigo-200";
  }

  return "border-slate-500/50 bg-slate-500/20 text-slate-200";
}

function getTypeBadgeClass(type: FactType): string {
  if (type === "number") {
    return "border-sky-500/50 bg-sky-500/20 text-sky-200";
  }

  if (type === "boolean") {
    return "border-violet-500/50 bg-violet-500/20 text-violet-200";
  }

  if (type === "json") {
    return "border-fuchsia-500/50 bg-fuchsia-500/20 text-fuchsia-200";
  }

  if (type === "work unit") {
    return "border-cyan-500/50 bg-cyan-500/20 text-cyan-200";
  }

  return "border-teal-500/50 bg-teal-500/20 text-teal-200";
}

function toMutationFact(formState: FactFormState, jsonSubKeys: readonly JsonSubKey[]): RawFact {
  const trimmedName = formState.name.trim();
  const derivedKeyFromName = trimmedName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  const resolvedKey =
    formState.key.trim() ||
    (derivedKeyFromName.length > 0 ? `fact.${derivedKeyFromName}` : "fact.new");
  const dependencyType = formState.dependencyType.trim();
  const workUnitKey = formState.workUnitKey.trim();
  const allowedValues = formState.allowedValues
    .split(/\r?\n/g)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  const numberMinimum = parseOptionalNumber(formState.numberMin);
  const numberMaximum = parseOptionalNumber(formState.numberMax);
  const trimmedDescription = formState.description.trim();
  const validation: RawFactValidation =
    formState.factType === "work unit"
      ? {
          kind: "none",
          ...(dependencyType.length > 0 ? { dependencyType } : {}),
          ...(workUnitKey.length > 0 ? { workUnitKey } : {}),
        }
      : formState.factType === "json"
        ? jsonSubKeysToJsonSchemaValidation(jsonSubKeys)
        : formState.factType === "number"
          ? typeof numberMinimum === "number" || typeof numberMaximum === "number"
            ? {
                kind: "json-schema",
                schemaDialect: "draft-2020-12",
                schema: {
                  type: "number",
                  ...(typeof numberMinimum === "number" ? { minimum: numberMinimum } : {}),
                  ...(typeof numberMaximum === "number" ? { maximum: numberMaximum } : {}),
                },
              }
            : { kind: "none" }
          : formState.factType === "string"
            ? formState.validationKind === "path"
              ? {
                  kind: "path",
                  path: {
                    pathKind: formState.pathKind,
                    normalization: {
                      mode: "posix",
                      trimWhitespace: formState.trimWhitespace,
                    },
                    safety: {
                      disallowAbsolute: formState.disallowAbsolute,
                      preventTraversal: formState.preventTraversal,
                    },
                  },
                }
              : formState.validationKind === "allowed-values" && allowedValues.length > 0
                ? createAllowedValuesValidation(allowedValues)
                : formState.validationKind === "json-schema"
                  ? { kind: "json-schema" }
                  : { kind: "none" }
            : { kind: "none" };

  return {
    kind: formState.factType === "work unit" ? "work_unit_reference_fact" : "plain_fact",
    name: trimmedName,
    key: resolvedKey,
    ...(formState.factType === "work unit" ? {} : { type: formState.factType }),
    factType: formState.factType,
    cardinality: formState.cardinality,
    ...(trimmedDescription.length > 0
      ? {
          description: trimmedDescription,
        }
      : {}),
    ...(formState.humanGuidance.trim().length > 0 || formState.agentGuidance.trim().length > 0
      ? {
          guidance: {
            ...(formState.humanGuidance.trim().length > 0
              ? { human: { markdown: formState.humanGuidance } }
              : {}),
            ...(formState.agentGuidance.trim().length > 0
              ? { agent: { markdown: formState.agentGuidance } }
              : {}),
          },
        }
      : {}),
    validation,
    ...(dependencyType.length > 0 ? { dependencyType } : {}),
  };
}

export function FactsTab({
  initialFacts,
  dependencyDefinitions = [],
  workUnits = [],
  createDialogOpen = false,
  onCreateDialogOpenChange,
  onCreateFact,
  onUpdateFact,
  onDeleteFact,
}: FactsTabProps) {
  const normalizedFacts = useMemo(
    () => initialFacts.map(normalizeFact).sort(compareUiFactsByKey),
    [initialFacts],
  );
  const [factsDraft, setFactsDraft] = useState<UiFact[] | null>(null);
  const [editingFactId, setEditingFactId] = useState<string | null>(null);
  const [deletingFactId, setDeletingFactId] = useState<string | null>(null);
  const [formState, setFormState] = useState<FactFormState>(toFormState());
  const [activeTab, setActiveTab] = useState<FactEditorStep>("contract");
  const [isContractTabDirty, setIsContractTabDirty] = useState(false);
  const [isGuidanceTabDirty, setIsGuidanceTabDirty] = useState(false);
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);
  const [isDependencyTypeOpen, setIsDependencyTypeOpen] = useState(false);
  const [isWorkUnitOpen, setIsWorkUnitOpen] = useState(false);
  const [jsonSubKeys, setJsonSubKeys] = useState<JsonSubKey[]>([]);
  const facts = factsDraft ?? normalizedFacts;
  const isDialogDirty = isContractTabDirty || isGuidanceTabDirty;
  const dependencyTypeOptions = useMemo(
    () =>
      dependencyDefinitions.filter(
        (entry): entry is { key: string; name?: string } =>
          typeof entry.key === "string" && entry.key.trim().length > 0,
      ),
    [dependencyDefinitions],
  );

  const mutateFacts = (updater: (current: UiFact[]) => UiFact[]) => {
    setFactsDraft((current) => updater(current ?? normalizedFacts));
  };

  const editingFact = useMemo(
    () => facts.find((fact) => fact.id === editingFactId) ?? null,
    [editingFactId, facts],
  );

  const isEditorOpen = editingFactId !== null || createDialogOpen;
  const isCreateMode = editingFactId === "new" || (editingFactId === null && createDialogOpen);

  const closeEditor = () => {
    setEditingFactId(null);
    setActiveTab("contract");
    setIsContractTabDirty(false);
    setIsGuidanceTabDirty(false);
    setIsDiscardDialogOpen(false);
    setIsDependencyTypeOpen(false);
    setIsWorkUnitOpen(false);
    setJsonSubKeys([]);
    onCreateDialogOpenChange?.(false);
  };

  const requestCloseEditor = () => {
    if (isDialogDirty) {
      setIsDiscardDialogOpen(true);
      return;
    }

    closeEditor();
  };

  const openCreateDialog = () => {
    setEditingFactId("new");
    setFormState(toFormState());
    setActiveTab("contract");
    setIsContractTabDirty(false);
    setIsGuidanceTabDirty(false);
    setIsDependencyTypeOpen(false);
    setIsWorkUnitOpen(false);
    setJsonSubKeys([]);
    onCreateDialogOpenChange?.(true);
  };

  const openEditDialog = (factId: string) => {
    const fact = facts.find((row) => row.id === factId);
    if (!fact) {
      return;
    }

    setEditingFactId(factId);
    setFormState(toFormState(fact));
    setActiveTab("contract");
    setIsContractTabDirty(false);
    setIsGuidanceTabDirty(false);
    setIsDependencyTypeOpen(false);
    setIsWorkUnitOpen(false);
    setJsonSubKeys(fact.jsonSubKeys);
    onCreateDialogOpenChange?.(false);
  };

  const saveFact = async () => {
    const trimmedName = formState.name.trim();
    const derivedKeyFromName = trimmedName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    const key =
      formState.key.trim() ||
      (derivedKeyFromName.length > 0 ? `fact.${derivedKeyFromName}` : "fact.new");

    const mutationFact = toMutationFact(formState, jsonSubKeys);
    const numberMinimum = parseOptionalNumber(formState.numberMin);
    const numberMaximum = parseOptionalNumber(formState.numberMax);
    if (
      formState.factType === "number" &&
      hasInvalidNumberRange(formState.numberMin, formState.numberMax)
    ) {
      toast.error("Maximum value cannot be less than minimum value.");
      return;
    }
    if (formState.factType === "json" && hasInvalidJsonSubKeyNumberRange(jsonSubKeys)) {
      toast.error("JSON number field maximum value cannot be less than minimum value.");
      return;
    }
    const nextFact: UiFact = {
      id: isCreateMode
        ? createFactId(facts.length + 1)
        : (editingFact?.id ?? createFactId(facts.length + 1)),
      name: formState.name.trim() || key,
      key,
      factType: formState.factType,
      cardinality: formState.cardinality,
      validationKind:
        formState.factType === "string"
          ? formState.validationKind
          : formState.factType === "json"
            ? "json-schema"
            : formState.factType === "work unit"
              ? "none"
              : formState.factType === "number"
                ? typeof numberMinimum === "number" || typeof numberMaximum === "number"
                  ? "json-schema"
                  : "none"
                : "none",
      defaultValue: undefined,
      dependencyType: formState.dependencyType.trim(),
      workUnitKey: formState.workUnitKey.trim(),
      pathKind: formState.pathKind,
      trimWhitespace: formState.trimWhitespace,
      disallowAbsolute: formState.disallowAbsolute,
      preventTraversal: formState.preventTraversal,
      allowedValues: formState.allowedValues,
      numberMin: numberMinimum,
      numberMax: numberMaximum,
      humanGuidance: formState.humanGuidance,
      agentGuidance: formState.agentGuidance,
      description: formState.description,
      jsonSubKeys,
    };

    try {
      if (isCreateMode) {
        await onCreateFact?.({ fact: mutationFact });
        mutateFacts((current) => [...current, nextFact].sort(compareUiFactsByKey));
      } else {
        if (editingFact) {
          await onUpdateFact?.({ factKey: editingFact.key, fact: mutationFact });
        }
        mutateFacts((current) =>
          current.map((row) => (row.id === nextFact.id ? nextFact : row)).sort(compareUiFactsByKey),
        );
      }

      closeEditor();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save fact";
      toast.error(errorMessage);
    }
  };

  return (
    <section className="grid gap-3">
      <div className="chiron-frame-flat p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
              Facts
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Table-first work-unit fact contracts with validation and dependency badges.
            </p>
          </div>
          <Button type="button" className="rounded-none" onClick={openCreateDialog}>
            + Add Fact
          </Button>
        </div>
      </div>

      <div className="chiron-frame-flat overflow-hidden">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border/70 bg-background/50 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <th className="px-3 py-2 font-medium">Fact</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Cardinality</th>
              <th className="px-3 py-2 font-medium">Validation</th>
              <th className="px-3 py-2 font-medium">Guidance</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {facts.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-sm text-muted-foreground" colSpan={6}>
                  No facts authored yet.
                </td>
              </tr>
            ) : (
              facts.map((fact) => (
                <tr
                  key={fact.id}
                  className="border-b border-border/50 transition-colors hover:bg-background/50"
                >
                  <td className="px-3 py-3">
                    <div className="font-medium">{fact.name}</div>
                    <div className="font-mono text-[0.7rem] uppercase tracking-[0.12em] text-muted-foreground">
                      {fact.key}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={[
                        "inline-flex items-center border px-2 py-1 text-[0.65rem] uppercase tracking-[0.12em]",
                        getTypeBadgeClass(fact.factType),
                      ].join(" ")}
                    >
                      {fact.factType}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={[
                        "inline-flex items-center border px-2 py-1 text-[0.65rem] uppercase tracking-[0.12em]",
                        fact.cardinality === "many"
                          ? "border-purple-500/50 bg-purple-500/20 text-purple-200"
                          : "border-blue-500/50 bg-blue-500/20 text-blue-200",
                      ].join(" ")}
                    >
                      {fact.cardinality ?? "one"}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={[
                          "inline-flex items-center border px-2 py-1 text-[0.65rem] uppercase tracking-[0.12em]",
                          getValidationBadgeClass(fact.validationKind),
                        ].join(" ")}
                      >
                        {fact.validationKind}
                      </span>
                      {fact.dependencyType.length > 0 ? (
                        <span className="inline-flex items-center border border-cyan-500/50 bg-cyan-500/20 px-2 py-1 text-[0.65rem] uppercase tracking-[0.12em] text-cyan-200">
                          DEP: {fact.dependencyType}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{guidanceSummary(fact)}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="inline-flex h-7 items-center justify-center rounded-none border border-border/70 px-2 text-xs uppercase tracking-[0.12em] transition-colors hover:bg-accent"
                        onClick={() => openEditDialog(fact.id)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-7 items-center justify-center rounded-none border border-destructive/40 bg-destructive/10 px-2 text-xs uppercase tracking-[0.12em] text-destructive transition-colors hover:bg-destructive/20"
                        onClick={() => setDeletingFactId(fact.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog
        open={isEditorOpen}
        onOpenChange={(open) => {
          if (open) {
            return;
          }
          requestCloseEditor();
        }}
      >
        <DialogContent className="chiron-cut-frame-thick w-[min(48rem,calc(100vw-2rem))] overflow-hidden p-8 sm:max-w-none">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold uppercase tracking-[0.08em]">
              {isCreateMode ? "Add Fact" : "Edit Fact"}
            </DialogTitle>
            <div className="mt-2 flex flex-wrap gap-2 border-b border-border pb-3">
              {(
                [
                  ["contract", "Contract"],
                  ["guidance", "Guidance"],
                ] as const
              ).map(([tabValue, label]) => (
                <div key={tabValue}>
                  <Button
                    type="button"
                    size="sm"
                    variant={activeTab === tabValue ? "default" : "outline"}
                    className="rounded-none"
                    onClick={() => setActiveTab(tabValue)}
                  >
                    {label}
                    {tabValue === "contract" && isContractTabDirty ? (
                      <span
                        data-testid="fact-contract-modified-indicator"
                        className="ml-1 leading-none"
                      >
                        *
                      </span>
                    ) : null}
                    {tabValue === "guidance" && isGuidanceTabDirty ? (
                      <span
                        data-testid="fact-guidance-modified-indicator"
                        className="ml-1 leading-none"
                      >
                        *
                      </span>
                    ) : null}
                  </Button>
                </div>
              ))}
            </div>
          </DialogHeader>

          <div className="max-h-[calc(90vh-16rem)] overflow-y-auto pr-2 scrollbar-thin">
            {activeTab === "contract" ? (
              <div
                className="grid grid-cols-2 gap-4"
                onChangeCapture={() => setIsContractTabDirty(true)}
              >
                <div className="space-y-2">
                  <Label htmlFor="wu-fact-display-name">Display Name</Label>
                  <Input
                    id="wu-fact-display-name"
                    value={formState.name}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, name: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wu-fact-key">Fact Key</Label>
                  <Input
                    id="wu-fact-key"
                    value={formState.key}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, key: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fact Type</Label>
                  <Select
                    value={formState.factType}
                    onValueChange={(value) =>
                      setFormState((prev) => ({
                        ...prev,
                        factType: value as FactType,
                        validationKind: value === "string" ? prev.validationKind : "none",
                      }))
                    }
                  >
                    <SelectTrigger className="rounded-none">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="rounded-none">
                      <SelectItem value="string">string</SelectItem>
                      <SelectItem value="number">number</SelectItem>
                      <SelectItem value="boolean">boolean</SelectItem>
                      <SelectItem value="json">json</SelectItem>
                      <SelectItem value="work unit">work unit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cardinality</Label>
                  <Select
                    value={formState.cardinality}
                    onValueChange={(value) =>
                      setFormState((prev) => ({
                        ...prev,
                        cardinality: value as FactCardinality,
                      }))
                    }
                  >
                    <SelectTrigger className="rounded-none">
                      <SelectValue placeholder="Select cardinality" />
                    </SelectTrigger>
                    <SelectContent className="rounded-none">
                      <SelectItem value="one">one</SelectItem>
                      <SelectItem value="many">many</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formState.factType === "string" ? (
                  <div className="space-y-2">
                    <Label>Validation Type</Label>
                    <Select
                      value={formState.validationKind}
                      onValueChange={(value) =>
                        setFormState((prev) => ({
                          ...prev,
                          validationKind: value as ValidationKind,
                        }))
                      }
                    >
                      <SelectTrigger className="rounded-none">
                        <SelectValue placeholder="Select validation" />
                      </SelectTrigger>
                      <SelectContent className="rounded-none">
                        <SelectItem value="none">none</SelectItem>
                        <SelectItem value="path">path</SelectItem>
                        <SelectItem value="allowed-values">allowed-values</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
                {formState.factType === "number" ? (
                  <div className="col-span-2 grid gap-4 border border-border/70 p-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="wu-fact-number-min">Minimum Value</Label>
                      <Input
                        id="wu-fact-number-min"
                        type="number"
                        value={formState.numberMin}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, numberMin: event.target.value }))
                        }
                        placeholder="Optional"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="wu-fact-number-max">Maximum Value</Label>
                      <Input
                        id="wu-fact-number-max"
                        type="number"
                        value={formState.numberMax}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, numberMax: event.target.value }))
                        }
                        placeholder="Optional"
                      />
                    </div>
                    {hasInvalidNumberRange(formState.numberMin, formState.numberMax) ? (
                      <p
                        data-testid="wu-fact-number-range-error"
                        className="md:col-span-2 text-[10px] uppercase tracking-[0.12em] text-destructive"
                      >
                        Maximum value cannot be less than minimum value.
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {formState.factType === "string" && formState.validationKind === "path" ? (
                  <div className="col-span-2 grid gap-4 border border-border/70 p-4">
                    <div className="space-y-2">
                      <Label>Path Kind</Label>
                      <Select
                        value={formState.pathKind}
                        onValueChange={(value) =>
                          setFormState((prev) => ({
                            ...prev,
                            pathKind: value as "file" | "directory",
                          }))
                        }
                      >
                        <SelectTrigger className="rounded-none">
                          <SelectValue placeholder="Select kind" />
                        </SelectTrigger>
                        <SelectContent className="rounded-none">
                          <SelectItem value="file">file</SelectItem>
                          <SelectItem value="directory">directory</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-wrap gap-x-8 gap-y-4">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="wu-fact-path-trim-whitespace"
                          checked={formState.trimWhitespace}
                          onCheckedChange={(checked) =>
                            setFormState((prev) => ({
                              ...prev,
                              trimWhitespace: checked === true,
                            }))
                          }
                        />
                        <Label
                          htmlFor="wu-fact-path-trim-whitespace"
                          className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground"
                        >
                          Trim Whitespace
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="wu-fact-path-disallow-absolute"
                          checked={formState.disallowAbsolute}
                          onCheckedChange={(checked) =>
                            setFormState((prev) => ({
                              ...prev,
                              disallowAbsolute: checked === true,
                            }))
                          }
                        />
                        <Label
                          htmlFor="wu-fact-path-disallow-absolute"
                          className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground"
                        >
                          Disallow Absolute
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="wu-fact-path-prevent-traversal"
                          checked={formState.preventTraversal}
                          onCheckedChange={(checked) =>
                            setFormState((prev) => ({
                              ...prev,
                              preventTraversal: checked === true,
                            }))
                          }
                        />
                        <Label
                          htmlFor="wu-fact-path-prevent-traversal"
                          className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground"
                        >
                          Prevent Traversal
                        </Label>
                      </div>
                    </div>
                  </div>
                ) : null}
                {formState.factType === "string" &&
                formState.validationKind === "allowed-values" ? (
                  <div className="col-span-2 space-y-2">
                    <Label className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      Allowed Values
                    </Label>
                    <AllowedValuesChipEditor
                      values={formState.allowedValues
                        .split(/\r?\n/g)
                        .map((value) => value.trim())
                        .filter((value) => value.length > 0)}
                      onChange={(values) =>
                        setFormState((prev) => ({ ...prev, allowedValues: values.join("\n") }))
                      }
                    />
                  </div>
                ) : null}
                {formState.factType === "json" ? (
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
                          setJsonSubKeys((current) => [...current, createEmptyJsonSubKey(current)]);
                        }}
                      >
                        Add JSON Key
                      </Button>
                    </div>

                    {jsonSubKeys.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No keys defined yet. Add at least one key to author the JSON fact schema.
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
                                <div className="space-y-2">
                                  <Label
                                    htmlFor={`json-subkey-cardinality-${entry.id}`}
                                    className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
                                  >
                                    Cardinality
                                  </Label>
                                  <Select
                                    value={entry.cardinality}
                                    onValueChange={(value) => {
                                      setIsContractTabDirty(true);
                                      setJsonSubKeys((current) =>
                                        current.map((currentEntry, currentIndex) =>
                                          currentIndex === index
                                            ? {
                                                ...currentEntry,
                                                cardinality: value as FactCardinality,
                                              }
                                            : currentEntry,
                                        ),
                                      );
                                    }}
                                  >
                                    <SelectTrigger
                                      id={`json-subkey-cardinality-${entry.id}`}
                                      className="h-9 rounded-none border-border/70 bg-background/50 text-xs tracking-[0.04em]"
                                    >
                                      <SelectValue placeholder="Select cardinality" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-none border-border/70 bg-background text-xs">
                                      <SelectItem value="one">one</SelectItem>
                                      <SelectItem value="many">many</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              {entry.valueType === "number" ? (
                                <div className="space-y-4 border border-border/70 p-3">
                                  <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                      <Label
                                        htmlFor={`wu-json-subkey-number-min-${entry.id}`}
                                        className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
                                      >
                                        Value Minimum
                                      </Label>
                                      <Input
                                        id={`wu-json-subkey-number-min-${entry.id}`}
                                        type="number"
                                        className="h-9 rounded-none border-border/70 bg-background/50 text-xs tracking-[0.04em]"
                                        value={entry.numberMin}
                                        onChange={(event) => {
                                          setIsContractTabDirty(true);
                                          setJsonSubKeys((current) =>
                                            current.map((currentEntry, currentIndex) =>
                                              currentIndex === index
                                                ? {
                                                    ...currentEntry,
                                                    numberMin: event.target.value,
                                                  }
                                                : currentEntry,
                                            ),
                                          );
                                        }}
                                        placeholder="Optional"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label
                                        htmlFor={`wu-json-subkey-number-max-${entry.id}`}
                                        className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
                                      >
                                        Value Maximum
                                      </Label>
                                      <Input
                                        id={`wu-json-subkey-number-max-${entry.id}`}
                                        type="number"
                                        className="h-9 rounded-none border-border/70 bg-background/50 text-xs tracking-[0.04em]"
                                        value={entry.numberMax}
                                        onChange={(event) => {
                                          setIsContractTabDirty(true);
                                          setJsonSubKeys((current) =>
                                            current.map((currentEntry, currentIndex) =>
                                              currentIndex === index
                                                ? {
                                                    ...currentEntry,
                                                    numberMax: event.target.value,
                                                  }
                                                : currentEntry,
                                            ),
                                          );
                                        }}
                                        placeholder="Optional"
                                      />
                                    </div>
                                  </div>
                                  {hasInvalidNumberRange(entry.numberMin, entry.numberMax) ? (
                                    <p
                                      data-testid="wu-fact-json-number-range-error"
                                      className="text-[10px] uppercase tracking-[0.12em] text-destructive"
                                    >
                                      Maximum value cannot be less than minimum value.
                                    </p>
                                  ) : null}
                                </div>
                              ) : null}

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
                                            <SelectItem value="directory">directory</SelectItem>
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
                ) : null}
                {formState.factType === "work unit" ? (
                  <div className="col-span-2 space-y-2">
                    <Label id="wu-fact-work-unit-label">Work Unit</Label>
                    <Popover open={isWorkUnitOpen} onOpenChange={setIsWorkUnitOpen}>
                      <PopoverTrigger
                        render={
                          <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            aria-labelledby="wu-fact-work-unit-label"
                            aria-expanded={isWorkUnitOpen}
                            className="h-8 w-full justify-between rounded-none border-input bg-transparent px-2.5 py-1 font-normal"
                          >
                            <span className="truncate text-xs">
                              {formState.workUnitKey.length > 0
                                ? formState.workUnitKey
                                : "Select work unit"}
                            </span>
                            <ChevronsUpDownIcon className="size-3.5 shrink-0 opacity-70" />
                          </Button>
                        }
                      />
                      <PopoverContent
                        className="w-[var(--anchor-width)] p-0"
                        align="start"
                        frame="cut-thin"
                        sideOffset={4}
                      >
                        <Command density="compact" frame="default">
                          <CommandInput density="compact" placeholder="Search work units..." />
                          <CommandList>
                            <CommandEmpty>No work units found.</CommandEmpty>
                            <CommandGroup heading="Work Units">
                              {(workUnits ?? []).map((entry) => (
                                <CommandItem
                                  key={entry.key}
                                  value={`${entry.key} ${entry.displayName ?? ""}`}
                                  density="compact"
                                  onSelect={() => {
                                    setFormState((prev) => ({ ...prev, workUnitKey: entry.key }));
                                    setIsWorkUnitOpen(false);
                                  }}
                                >
                                  <div className="grid min-w-0 flex-1 gap-0.5">
                                    <span className="truncate font-medium">{entry.key}</span>
                                    {entry.displayName?.trim().length ? (
                                      <span className="truncate text-[0.68rem] uppercase tracking-[0.08em] text-muted-foreground">
                                        {entry.displayName}
                                      </span>
                                    ) : null}
                                  </div>
                                  {formState.workUnitKey === entry.key ? (
                                    <CheckIcon className="size-3.5" />
                                  ) : null}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                ) : null}
                {formState.factType === "work unit" ? (
                  <div className="col-span-2 space-y-2">
                    <Label id="wu-fact-dependency-type-label">Dependency Type</Label>
                    <Popover open={isDependencyTypeOpen} onOpenChange={setIsDependencyTypeOpen}>
                      <PopoverTrigger
                        render={
                          <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            aria-labelledby="wu-fact-dependency-type-label"
                            aria-expanded={isDependencyTypeOpen}
                            className="h-8 w-full justify-between rounded-none border-input bg-transparent px-2.5 py-1 font-normal"
                          >
                            <span className="truncate text-xs">
                              {formState.dependencyType.length > 0
                                ? formState.dependencyType
                                : "Select dependency type"}
                            </span>
                            <ChevronsUpDownIcon className="size-3.5 shrink-0 opacity-70" />
                          </Button>
                        }
                      />
                      <PopoverContent
                        className="w-[var(--anchor-width)] p-0"
                        align="start"
                        frame="cut-thin"
                        sideOffset={4}
                      >
                        <Command density="compact" frame="default">
                          <CommandInput
                            density="compact"
                            placeholder="Search dependency types..."
                          />
                          <CommandList>
                            <CommandEmpty>No dependency types found.</CommandEmpty>
                            <CommandGroup heading="Dependency Types">
                              {dependencyTypeOptions.map((entry) => (
                                <CommandItem
                                  key={entry.key}
                                  value={`${entry.key} ${entry.name ?? ""}`}
                                  density="compact"
                                  onSelect={() => {
                                    setFormState((prev) => ({
                                      ...prev,
                                      dependencyType: entry.key,
                                    }));
                                    setIsDependencyTypeOpen(false);
                                  }}
                                >
                                  <div className="grid min-w-0 flex-1 gap-0.5">
                                    <span className="truncate font-medium">{entry.key}</span>
                                    {entry.name?.trim().length ? (
                                      <span className="truncate text-[0.68rem] uppercase tracking-[0.08em] text-muted-foreground">
                                        {entry.name}
                                      </span>
                                    ) : null}
                                  </div>
                                  {formState.dependencyType === entry.key ? (
                                    <CheckIcon className="size-3.5" />
                                  ) : null}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                ) : null}
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="wu-fact-description">Description</Label>
                  <Textarea
                    id="wu-fact-description"
                    className="min-h-[8rem] resize-none rounded-none"
                    value={formState.description}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, description: event.target.value }))
                    }
                  />
                </div>
              </div>
            ) : (
              <div className="grid gap-4" onChangeCapture={() => setIsGuidanceTabDirty(true)}>
                <div className="space-y-2">
                  <Label htmlFor="wu-fact-human-guidance">Human Guidance</Label>
                  <Textarea
                    id="wu-fact-human-guidance"
                    className="min-h-[8rem] resize-none rounded-none"
                    value={formState.humanGuidance}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, humanGuidance: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wu-fact-agent-guidance">Agent Guidance</Label>
                  <Textarea
                    id="wu-fact-agent-guidance"
                    className="min-h-[8rem] resize-none rounded-none"
                    value={formState.agentGuidance}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, agentGuidance: event.target.value }))
                    }
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-none"
              onClick={requestCloseEditor}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-none"
              onClick={() => void saveFact()}
              disabled={
                (formState.factType === "number" &&
                  hasInvalidNumberRange(formState.numberMin, formState.numberMax)) ||
                (formState.factType === "json" && hasInvalidJsonSubKeyNumberRange(jsonSubKeys))
              }
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDiscardDialogOpen} onOpenChange={setIsDiscardDialogOpen}>
        <DialogContent className="chiron-cut-frame-thick w-[min(28rem,calc(100vw-2rem))] p-8 sm:max-w-none">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold uppercase tracking-[0.08em]">
              Discard unsaved changes?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            You have unsaved edits in this fact dialog. Discard them and close?
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-none"
              onClick={() => setIsDiscardDialogOpen(false)}
            >
              Keep Editing
            </Button>
            <Button type="button" className="rounded-none" onClick={closeEditor}>
              Discard Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deletingFactId !== null}
        onOpenChange={(open) => !open && setDeletingFactId(null)}
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
              This will permanently remove this fact from the work unit contract.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-none border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive/90">
            Removing this fact can invalidate workflow assumptions, prompts, and transition
            references that depend on it.
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-none"
              onClick={() => setDeletingFactId(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-none"
              onClick={() => {
                if (!deletingFactId) {
                  return;
                }
                const deletingFact = facts.find((entry) => entry.id === deletingFactId);
                if (!deletingFact) {
                  setDeletingFactId(null);
                  return;
                }
                void (async () => {
                  try {
                    await onDeleteFact?.({ factKey: deletingFact.key });
                    mutateFacts((current) => current.filter((fact) => fact.id !== deletingFactId));
                    setDeletingFactId(null);
                  } catch (error) {
                    const errorMessage =
                      error instanceof Error ? error.message : "Failed to delete fact";
                    toast.error(errorMessage);
                    setDeletingFactId(null);
                  }
                })();
              }}
            >
              Delete Fact Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
