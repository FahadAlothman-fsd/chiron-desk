import { useEffect, useMemo, useState } from "react";

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
  readonly workUnitId: string;
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
      workUnitId: "",
    };
  }

  return {
    factType: definition.factType,
    textValue: formatPrimitiveText(value),
    booleanValue: false,
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
      return { ok: true, value: draft.booleanValue };
    case "json": {
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
        instanceId: typeof envelope?.instanceId === "string" ? envelope.instanceId : "",
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
        return { ok: false, error: "Enter the bound fact instance ID before continuing." };
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
            value={draft.booleanValue ? "true" : "false"}
            onValueChange={(value) => onChange({ ...draft, booleanValue: value === "true" })}
          >
            <SelectTrigger className="w-full" aria-label={label}>
              <SelectValue placeholder="Select true or false" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">true</SelectItem>
              <SelectItem value="false">false</SelectItem>
            </SelectContent>
          </Select>
        </FieldContent>
      </Field>
    );
  }

  if (definition.factType === "json") {
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
          name={label.replace(/\s+/g, "-").toLowerCase()}
          autoComplete="off"
          spellCheck={definition.factType === "string" ? undefined : false}
          aria-label={label}
        />
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
              <Input
                value={draft.instanceId}
                onChange={(event) => onChange({ ...draft, instanceId: event.target.value })}
                name="bound-instance-id"
                autoComplete="off"
                spellCheck={false}
                aria-label={editor.instanceLabel}
              />
              <FieldDescription>
                Bound facts store a canonical envelope with the source fact instance ID and typed
                value.
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
  const [draft, setDraft] = useState(initialDraft);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(initialDraft);
      setLocalError(null);
    }
  }, [initialDraft, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(88vh,52rem)] max-w-2xl overflow-y-auto rounded-none border border-border/80 bg-background">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          data-testid={testId}
          onSubmit={async (event) => {
            event.preventDefault();
            const parsed = parseDialogDraft(editor, draft);
            if (!parsed.ok) {
              setLocalError(parsed.error);
              return;
            }

            setLocalError(null);
            await onSubmit(parsed.value);
          }}
        >
          <FactDialogFields editor={editor} draft={draft} onChange={setDraft} />

          {localError ? <FieldError>{localError}</FieldError> : null}
          {errorMessage ? <FieldError>{errorMessage}</FieldError> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (pendingLabel ?? `${submitLabel}…`) : submitLabel}
            </Button>
          </DialogFooter>
        </form>
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
