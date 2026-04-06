import type {
  GetRuntimeStepExecutionDetailOutput,
  RuntimeFormNestedField,
  RuntimeFormResolvedField,
} from "@chiron/contracts/runtime/executions";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldDescription, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";

export const runtimeStepExecutionDetailQueryKey = (projectId: string, stepExecutionId: string) =>
  ["runtime-step-execution-detail", projectId, stepExecutionId] as const;

type FormBody = Extract<GetRuntimeStepExecutionDetailOutput["body"], { stepType: "form" }>;

function formatTimestamp(value: string | undefined): string {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }

  return String(error);
}

function encodeOptionValue(value: unknown): string {
  return JSON.stringify(value);
}

function decodeOptionValue(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getEmptyFieldValue(field: RuntimeFormResolvedField): unknown {
  return field.widget.renderedMultiplicity === "many" ? [] : null;
}

function getInitialFormValues(body: FormBody): Record<string, unknown> {
  const preferredPayload = body.draft.lastSavedAt ? body.draft.payload : body.submission.payload;
  const sourcePayload = isPlainRecord(preferredPayload)
    ? preferredPayload
    : isPlainRecord(body.draft.payload)
      ? body.draft.payload
      : {};

  return Object.fromEntries(
    body.page.fields.map((field) => [
      field.fieldKey,
      sourcePayload[field.fieldKey] ?? getEmptyFieldValue(field),
    ]),
  );
}

function updateArrayValue(current: unknown, index: number, nextValue: unknown): unknown[] {
  const array = Array.isArray(current) ? [...current] : [];
  array[index] = nextValue;
  return array;
}

function addArrayValue(current: unknown, nextValue: unknown): unknown[] {
  return Array.isArray(current) ? [...current, nextValue] : [nextValue];
}

function removeArrayValue(current: unknown, index: number): unknown[] {
  return Array.isArray(current) ? current.filter((_, itemIndex) => itemIndex !== index) : [];
}

function primitiveFromInput(value: string, field: RuntimeFormResolvedField): unknown {
  if (field.contextFactKind === "artifact_reference_fact") {
    return value.length > 0 ? { relativePath: value } : null;
  }

  if (field.contextFactKind === "workflow_reference_fact") {
    return value.length > 0 ? { workflowDefinitionId: value } : null;
  }

  if (field.contextFactKind === "bound_external_fact") {
    return value.length > 0 ? { factInstanceId: value } : null;
  }

  if (field.widget.control === "reference" && field.widget.valueType === "work_unit") {
    return value.length > 0 ? { projectWorkUnitId: value } : null;
  }

  if (field.widget.control === "number") {
    return value.length > 0 ? Number(value) : null;
  }

  return value.length > 0 ? value : null;
}

function primitiveToInput(value: unknown, field: RuntimeFormResolvedField): string {
  if (value == null) {
    return "";
  }

  if (field.contextFactKind === "artifact_reference_fact" && isPlainRecord(value)) {
    return typeof value.relativePath === "string" ? value.relativePath : "";
  }

  if (field.contextFactKind === "workflow_reference_fact" && isPlainRecord(value)) {
    return typeof value.workflowDefinitionId === "string" ? value.workflowDefinitionId : "";
  }

  if (field.contextFactKind === "bound_external_fact" && isPlainRecord(value)) {
    return typeof value.factInstanceId === "string" ? value.factInstanceId : "";
  }

  if (
    field.widget.control === "reference" &&
    field.widget.valueType === "work_unit" &&
    isPlainRecord(value)
  ) {
    return typeof value.projectWorkUnitId === "string" ? value.projectWorkUnitId : "";
  }

  return String(value);
}

function buildMutationValues(values: Record<string, unknown>): Record<string, unknown> {
  return values;
}

function hasPresentFieldValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.some(hasPresentFieldValue);
  }

  if (isPlainRecord(value)) {
    return Object.keys(value).length > 0;
  }

  return true;
}

function validateFieldValue(field: RuntimeFormResolvedField, value: unknown): string | undefined {
  if (!field.required) {
    return undefined;
  }

  return hasPresentFieldValue(value) ? undefined : `${field.fieldLabel} is required`;
}

function uniqueErrorMessages(errors: readonly unknown[]): string[] {
  return [...new Set(errors.map((error) => String(error)).filter((error) => error.length > 0))];
}

function toggleMultiSelectValue(
  current: unknown,
  optionValue: unknown,
  checked: boolean,
): unknown[] {
  const entries = Array.isArray(current) ? [...current] : [];
  const encodedTarget = encodeOptionValue(optionValue);
  const withoutCurrent = entries.filter((entry) => encodeOptionValue(entry) !== encodedTarget);

  return checked ? [...withoutCurrent, optionValue] : withoutCurrent;
}

function NestedFieldEditor(props: {
  nestedField: RuntimeFormNestedField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const { nestedField, value, onChange } = props;
  const nestedJsonFields = (() => {
    if (!isPlainRecord(nestedField.validation) || nestedField.validation.kind !== "json-schema") {
      return [];
    }

    const subSchema = nestedField.validation.subSchema;
    if (
      isPlainRecord(subSchema) &&
      subSchema.type === "object" &&
      Array.isArray(subSchema.fields)
    ) {
      return subSchema.fields.flatMap((field) => {
        if (
          !isPlainRecord(field) ||
          typeof field.key !== "string" ||
          typeof field.type !== "string"
        ) {
          return [];
        }

        return [
          {
            key: field.key,
            label: typeof field.key === "string" ? field.key.replaceAll(/[_-]+/g, " ") : field.key,
            factType: field.type,
            cardinality: field.cardinality === "many" ? "many" : "one",
            required: "defaultValue" in field,
            validation: isPlainRecord(field) ? field.validation : undefined,
          } as RuntimeFormNestedField,
        ];
      });
    }

    const schema = isPlainRecord(nestedField.validation.schema)
      ? nestedField.validation.schema
      : null;
    const properties = schema && isPlainRecord(schema.properties) ? schema.properties : null;
    const required = Array.isArray(schema?.required)
      ? new Set(schema.required.filter((entry): entry is string => typeof entry === "string"))
      : new Set<string>();

    if (!properties) {
      return [];
    }

    return Object.entries(properties).flatMap(([key, property]) => {
      if (!isPlainRecord(property) || typeof property.type !== "string") {
        return [];
      }

      const factType =
        property.type === "string" ||
        property.type === "number" ||
        property.type === "boolean" ||
        property.type === "json" ||
        property.type === "work_unit"
          ? property.type
          : property.type === "object"
            ? "json"
            : null;

      if (!factType) {
        return [];
      }

      return [
        {
          key,
          label:
            typeof property.title === "string" && property.title.length > 0
              ? property.title
              : key.replaceAll(/[_-]+/g, " "),
          factType,
          cardinality: property.cardinality === "many" ? "many" : "one",
          required: required.has(key),
        } as RuntimeFormNestedField,
      ];
    });
  })();

  if (nestedField.factType === "work_unit" && (nestedField.options?.length ?? 0) > 0) {
    return (
      <Field>
        <div className="text-xs leading-none">{nestedField.label}</div>
        <select
          aria-label={nestedField.label}
          className="dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-none border bg-transparent px-2.5 py-1 text-xs outline-none focus-visible:ring-1"
          value={value == null ? "" : encodeOptionValue(value)}
          onChange={(event) =>
            onChange(event.target.value.length > 0 ? decodeOptionValue(event.target.value) : null)
          }
        >
          <option value="">Select a work unit</option>
          {nestedField.options?.map((option) => (
            <option
              key={`${nestedField.key}-${encodeOptionValue(option.value)}`}
              value={encodeOptionValue(option.value)}
            >
              {option.label}
            </option>
          ))}
        </select>
        {nestedField.emptyState ? (
          <p className="text-xs text-muted-foreground">{nestedField.emptyState}</p>
        ) : null}
      </Field>
    );
  }

  if (nestedField.factType === "boolean") {
    return (
      <Field
        orientation="horizontal"
        className="items-center justify-between border border-border/70 px-3 py-2"
      >
        <div className="text-xs leading-none">{nestedField.label}</div>
        <Checkbox
          checked={value === true}
          aria-label={nestedField.label}
          onCheckedChange={(checked) => onChange(Boolean(checked))}
        />
      </Field>
    );
  }

  if (nestedField.factType === "number") {
    return (
      <Field>
        <div className="text-xs leading-none">{nestedField.label}</div>
        <Input
          aria-label={nestedField.label}
          type="number"
          value={typeof value === "number" ? String(value) : ""}
          onChange={(event) =>
            onChange(event.target.value.length > 0 ? Number(event.target.value) : null)
          }
        />
      </Field>
    );
  }

  if (nestedField.factType === "json") {
    if (nestedJsonFields.length > 0) {
      const current = isPlainRecord(value) ? value : {};

      return (
        <Field className="space-y-3 border border-border/70 bg-background/40 p-3">
          <div className="space-y-1">
            <div className="text-xs leading-none">{nestedField.label}</div>
            {nestedField.description ? (
              <FieldDescription>{nestedField.description}</FieldDescription>
            ) : null}
          </div>

          <div className="space-y-3 border border-border/70 bg-background/40 p-3">
            {nestedJsonFields.map((field) => (
              <NestedFieldEditor
                key={field.key}
                nestedField={field}
                value={current[field.key]}
                onChange={(nextValue) => onChange({ ...current, [field.key]: nextValue })}
              />
            ))}
          </div>
        </Field>
      );
    }

    return (
      <Field>
        <div className="text-xs leading-none">{nestedField.label}</div>
        <Textarea
          aria-label={nestedField.label}
          value={value == null ? "" : JSON.stringify(value, null, 2)}
          onChange={(event) => {
            const nextValue = event.target.value;
            if (nextValue.trim().length === 0) {
              onChange(null);
              return;
            }

            try {
              onChange(JSON.parse(nextValue));
            } catch {
              onChange(nextValue);
            }
          }}
        />
      </Field>
    );
  }

  const inputValue =
    nestedField.factType === "work_unit" && isPlainRecord(value)
      ? typeof value.projectWorkUnitId === "string"
        ? value.projectWorkUnitId
        : ""
      : value == null
        ? ""
        : String(value);

  return (
    <Field>
      <div className="text-xs leading-none">{nestedField.label}</div>
      <Input
        aria-label={nestedField.label}
        value={inputValue}
        onChange={(event) => {
          if (nestedField.factType === "work_unit") {
            onChange(
              event.target.value.length > 0 ? { projectWorkUnitId: event.target.value } : null,
            );
            return;
          }

          onChange(event.target.value.length > 0 ? event.target.value : null);
        }}
      />
    </Field>
  );
}

function JsonStructuredEditor(props: {
  field: RuntimeFormResolvedField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const { field, value, onChange } = props;
  const nestedFields = field.widget.nestedFields ?? [];

  if (nestedFields.length === 0) {
    return (
      <Textarea
        aria-label={field.fieldLabel}
        value={value == null ? "" : JSON.stringify(value, null, 2)}
        onChange={(event) => {
          const nextValue = event.target.value;
          if (nextValue.trim().length === 0) {
            onChange(null);
            return;
          }

          try {
            onChange(JSON.parse(nextValue));
          } catch {
            onChange(nextValue);
          }
        }}
      />
    );
  }

  const current = isPlainRecord(value) ? value : {};

  return (
    <div className="space-y-3 border border-border/70 bg-background/40 p-3">
      {nestedFields.map((nestedField) => (
        <NestedFieldEditor
          key={nestedField.key}
          nestedField={nestedField}
          value={current[nestedField.key]}
          onChange={(nextValue) => onChange({ ...current, [nestedField.key]: nextValue })}
        />
      ))}
    </div>
  );
}

function DraftSpecEditor(props: {
  field: RuntimeFormResolvedField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const { field, value, onChange } = props;
  const nestedFields = field.widget.nestedFields ?? [];

  const renderBlock = (blockValue: unknown, onBlockChange: (nextValue: unknown) => void) => {
    const current = isPlainRecord(blockValue) ? blockValue : {};

    return (
      <div className="space-y-3 border border-border/70 bg-background/40 p-3">
        {nestedFields.map((nestedField) => (
          <NestedFieldEditor
            key={nestedField.key}
            nestedField={nestedField}
            value={current[nestedField.key]}
            onChange={(nextValue) => onBlockChange({ ...current, [nestedField.key]: nextValue })}
          />
        ))}
      </div>
    );
  };

  if (field.widget.renderedMultiplicity === "many") {
    const blocks = Array.isArray(value) ? value : [];

    return (
      <div className="space-y-3">
        {blocks.map((block, index) => (
          <div key={`${field.fieldKey}-${index}`} className="space-y-3">
            {renderBlock(block, (nextValue) =>
              onChange(updateArrayValue(blocks, index, nextValue)),
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => onChange(removeArrayValue(blocks, index))}
            >
              Remove block
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={() => onChange(addArrayValue(blocks, {}))}>
          Add block
        </Button>
      </div>
    );
  }

  return renderBlock(value, onChange);
}

function SelectField(props: {
  field: RuntimeFormResolvedField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const { field, value, onChange } = props;
  const options = field.widget.options ?? [];

  if (field.widget.renderedMultiplicity === "many") {
    const currentValues = Array.isArray(value) ? value : [];

    return (
      <div className="space-y-2 border border-border/70 bg-background/40 p-3">
        {options.map((option) => {
          const checked = currentValues.some(
            (entry) => encodeOptionValue(entry) === encodeOptionValue(option.value),
          );

          return (
            <div
              key={`${field.fieldKey}-${encodeOptionValue(option.value)}`}
              className="flex items-center justify-between gap-3 text-xs text-foreground"
            >
              <span>{option.label}</span>
              <Checkbox
                checked={checked}
                onCheckedChange={(nextChecked) =>
                  onChange(
                    toggleMultiSelectValue(currentValues, option.value, Boolean(nextChecked)),
                  )
                }
              />
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <select
      aria-label={field.fieldLabel}
      className="dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-none border bg-transparent px-2.5 py-1 text-xs outline-none focus-visible:ring-1"
      value={value == null ? "" : encodeOptionValue(value)}
      onChange={(event) =>
        onChange(event.target.value.length > 0 ? decodeOptionValue(event.target.value) : null)
      }
    >
      <option value="">Select an option</option>
      {options.map((option) => (
        <option
          key={`${field.fieldKey}-${encodeOptionValue(option.value)}`}
          value={encodeOptionValue(option.value)}
        >
          {option.label}
        </option>
      ))}
    </select>
  );
}

function RepeatedPrimitiveField(props: {
  field: RuntimeFormResolvedField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const { field, value, onChange } = props;
  const items = Array.isArray(value) ? value : [];

  return (
    <div className="space-y-3">
      {items.map((entry, index) => (
        <div key={`${field.fieldKey}-${index}`} className="flex items-center gap-2">
          <Input
            aria-label={`${field.fieldLabel} ${index + 1}`}
            value={primitiveToInput(entry, field)}
            onChange={(event) =>
              onChange(
                updateArrayValue(items, index, primitiveFromInput(event.target.value, field)),
              )
            }
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => onChange(removeArrayValue(items, index))}
          >
            Remove
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() => onChange(addArrayValue(items, primitiveFromInput("", field)))}
      >
        Add value
      </Button>
    </div>
  );
}

function ReferenceField(props: {
  field: RuntimeFormResolvedField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const { field, value, onChange } = props;

  if (field.widget.renderedMultiplicity === "many") {
    const items = Array.isArray(value) ? value : [];

    return (
      <div className="space-y-3">
        {items.map((entry, index) => (
          <div key={`${field.fieldKey}-${index}`} className="flex items-center gap-2">
            <Input
              aria-label={`${field.fieldLabel} ${index + 1}`}
              value={primitiveToInput(entry, field)}
              onChange={(event) =>
                onChange(
                  updateArrayValue(items, index, primitiveFromInput(event.target.value, field)),
                )
              }
              placeholder={
                field.widget.valueType === "work_unit" ? "project work unit id" : "fact instance id"
              }
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => onChange(removeArrayValue(items, index))}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() => onChange(addArrayValue(items, null))}
        >
          Add reference
        </Button>
        {field.widget.emptyState ? (
          <p className="text-xs text-muted-foreground">{field.widget.emptyState}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Input
        aria-label={field.fieldLabel}
        value={primitiveToInput(value, field)}
        onChange={(event) => onChange(primitiveFromInput(event.target.value, field))}
        placeholder={
          field.widget.valueType === "work_unit" ? "project work unit id" : "fact instance id"
        }
      />
      {field.widget.emptyState ? (
        <p className="text-xs text-muted-foreground">{field.widget.emptyState}</p>
      ) : null}
    </div>
  );
}

function FormFieldEditor(props: {
  field: RuntimeFormResolvedField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const { field, value, onChange } = props;

  if (field.contextFactKind === "work_unit_draft_spec_fact") {
    return <DraftSpecEditor field={field} value={value} onChange={onChange} />;
  }

  if (
    field.contextFactKind === "workflow_reference_fact" ||
    (field.widget.control === "select" && (field.widget.options?.length ?? 0) > 0)
  ) {
    return <SelectField field={field} value={value} onChange={onChange} />;
  }

  if (field.widget.control === "reference") {
    return <ReferenceField field={field} value={value} onChange={onChange} />;
  }

  if (field.contextFactKind === "artifact_reference_fact") {
    return (
      <div className="space-y-2">
        <Input
          aria-label={field.fieldLabel}
          value={primitiveToInput(value, field)}
          onChange={(event) => onChange(primitiveFromInput(event.target.value, field))}
          placeholder="repo-relative path"
        />
        {field.widget.artifactSlotDefinitionId ? (
          <p className="text-xs text-muted-foreground">
            Target slot: {field.widget.artifactSlotDefinitionId}
          </p>
        ) : null}
      </div>
    );
  }

  if (field.widget.control === "checkbox") {
    if (field.widget.renderedMultiplicity === "many") {
      const items = Array.isArray(value) ? value : [];
      return (
        <div className="space-y-3">
          {items.map((entry, index) => (
            <div key={`${field.fieldKey}-${index}`} className="flex items-center gap-3 text-xs">
              <Checkbox
                checked={entry === true}
                aria-label={`${field.fieldLabel} ${index + 1}`}
                onCheckedChange={(checked) =>
                  onChange(updateArrayValue(items, index, Boolean(checked)))
                }
              />
              <span>Value {index + 1}</span>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => onChange(addArrayValue(items, false))}
          >
            Add toggle
          </Button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-3 border border-border/70 bg-background/40 px-3 py-2 text-xs">
        <Checkbox
          checked={value === true}
          aria-label={field.fieldLabel}
          onCheckedChange={(checked) => onChange(Boolean(checked))}
        />
        <span>{field.fieldLabel}</span>
      </div>
    );
  }

  if (field.widget.control === "json") {
    if (field.widget.renderedMultiplicity === "many") {
      const items = Array.isArray(value) ? value : [];
      return (
        <div className="space-y-3">
          {items.map((entry, index) => (
            <div key={`${field.fieldKey}-${index}`} className="space-y-2">
              <JsonStructuredEditor
                field={field}
                value={entry}
                onChange={(nextValue) => onChange(updateArrayValue(items, index, nextValue))}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => onChange(removeArrayValue(items, index))}
              >
                Remove row
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => onChange(addArrayValue(items, {}))}
          >
            Add row
          </Button>
        </div>
      );
    }

    return <JsonStructuredEditor field={field} value={value} onChange={onChange} />;
  }

  if (field.widget.renderedMultiplicity === "many") {
    return <RepeatedPrimitiveField field={field} value={value} onChange={onChange} />;
  }

  return (
    <Input
      aria-label={field.fieldLabel}
      type={field.widget.control === "number" ? "number" : "text"}
      value={primitiveToInput(value, field)}
      onChange={(event) => onChange(primitiveFromInput(event.target.value, field))}
      placeholder={field.widget.control === "path" ? "repo-relative path" : undefined}
    />
  );
}

function FormInteractionSurface(props: {
  projectId: string;
  detail: GetRuntimeStepExecutionDetailOutput & { body: FormBody };
}) {
  const { detail, projectId } = props;
  const body = detail.body;
  const { orpc, queryClient } = Route.useRouteContext();

  const saveDraftMutation = useMutation(
    orpc.project.saveFormStepDraft.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: runtimeStepExecutionDetailQueryKey(projectId, detail.shell.stepExecutionId),
        });
      },
    }),
  );

  const submitMutation = useMutation(
    orpc.project.submitFormStep.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: runtimeStepExecutionDetailQueryKey(projectId, detail.shell.stepExecutionId),
        });
      },
    }),
  );

  const completeStepMutation = useMutation(
    orpc.project.completeStepExecution.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: runtimeStepExecutionDetailQueryKey(projectId, detail.shell.stepExecutionId),
        });
      },
    }),
  );

  const completionOutcome =
    detail.shell.status === "completed"
      ? "Completed"
      : detail.shell.completionAction.enabled
        ? "Ready to complete"
        : (detail.shell.completionAction.reasonIfDisabled ?? "Incomplete");

  const isBusy =
    saveDraftMutation.isPending || submitMutation.isPending || completeStepMutation.isPending;

  const form = useForm({
    defaultValues: getInitialFormValues(body),
    onSubmit: async ({ value }) => {
      await submitMutation.mutateAsync({
        projectId,
        workflowExecutionId: detail.shell.workflowExecutionId,
        stepExecutionId: detail.shell.stepExecutionId,
        values: buildMutationValues(value),
      });
    },
  });

  useEffect(() => {
    form.reset(getInitialFormValues(body));
  }, [body, form]);

  return (
    <div className="space-y-4">
      <Card frame="cut-heavy" tone="runtime" corner="white">
        <CardHeader>
          <div className="space-y-1">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
              Shared step shell
            </p>
            <CardTitle>Step execution identity & status</CardTitle>
            <CardDescription>
              Common metadata stays in the header shell; Form-only interaction lives below.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-3">
            <div>
              <p className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                Step execution
              </p>
              <p>{detail.shell.stepExecutionId}</p>
            </div>
            <div>
              <p className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                Workflow execution
              </p>
              <p>{detail.shell.workflowExecutionId}</p>
            </div>
            <div>
              <p className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                Step definition
              </p>
              <p>{detail.shell.stepDefinitionId}</p>
            </div>
            <div>
              <p className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                State
              </p>
              <p>{detail.shell.status}</p>
            </div>
            <div>
              <p className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                Activated
              </p>
              <p>{formatTimestamp(detail.shell.activatedAt)}</p>
            </div>
            <div>
              <p className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                Completed
              </p>
              <p>{formatTimestamp(detail.shell.completedAt)}</p>
            </div>
            <div className="md:col-span-2 xl:col-span-3">
              <p className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                Completion outcome
              </p>
              <p>{completionOutcome}</p>
            </div>
          </div>
        </CardContent>

        {detail.shell.completionAction.visible && detail.shell.completionAction.enabled ? (
          <CardFooter className="justify-end">
            <Button
              type="button"
              disabled={isBusy}
              onClick={() =>
                completeStepMutation.mutate({
                  projectId,
                  workflowExecutionId: detail.shell.workflowExecutionId,
                  stepExecutionId: detail.shell.stepExecutionId,
                })
              }
            >
              Complete Step
            </Button>
          </CardFooter>
        ) : null}
      </Card>

      <Card frame="cut-heavy" tone="runtime" corner="white">
        <CardHeader>
          <div className="space-y-1">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">Form</p>
            <CardTitle>{body.page.formLabel ?? body.page.formKey}</CardTitle>
            {body.page.descriptionMarkdown ? (
              <CardDescription>{body.page.descriptionMarkdown}</CardDescription>
            ) : null}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-3 text-xs md:grid-cols-2">
            <div className="border border-border/70 bg-background/40 p-3">
              <p className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                Last draft save
              </p>
              <p>{formatTimestamp(body.draft.lastSavedAt)}</p>
            </div>
            <div className="border border-border/70 bg-background/40 p-3">
              <p className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                Last submit
              </p>
              <p>{formatTimestamp(body.submission.submittedAt)}</p>
            </div>
          </div>

          {body.page.projectRootPath ? (
            <div className="border border-border/70 bg-background/40 p-3 text-xs text-muted-foreground">
              Project root anchor: {body.page.projectRootPath}
            </div>
          ) : null}

          <FieldGroup>
            {body.page.fields.map((resolvedField) => (
              <form.Field
                key={resolvedField.fieldKey}
                name={resolvedField.fieldKey}
                validators={{
                  onChange: ({ value }) => validateFieldValue(resolvedField, value),
                  onSubmit: ({ value }) => validateFieldValue(resolvedField, value),
                }}
              >
                {(field) => (
                  <Field className="border border-border/70 bg-background/40 p-3">
                    <FieldContent className="space-y-3">
                      <div className="space-y-1">
                        <div className="text-xs leading-none">{resolvedField.fieldLabel}</div>
                        <div className="flex flex-wrap gap-2 text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground">
                          <span>{resolvedField.contextFactKind.replaceAll("_", " ")}</span>
                          <span>{resolvedField.widget.renderedMultiplicity}</span>
                          {resolvedField.widget.valueType ? (
                            <span>{resolvedField.widget.valueType}</span>
                          ) : null}
                          {resolvedField.required ? <span>required</span> : null}
                        </div>
                      </div>

                      {resolvedField.helpText ? (
                        <FieldDescription>{resolvedField.helpText}</FieldDescription>
                      ) : null}

                      <FormFieldEditor
                        field={resolvedField}
                        value={field.state.value}
                        onChange={field.handleChange}
                      />

                      {field.state.meta.errors.length > 0 ? (
                        <div className="space-y-1 text-xs text-destructive">
                          {uniqueErrorMessages(field.state.meta.errors).map((error, index) => (
                            <p key={`${resolvedField.fieldKey}-error-${index}`}>{error}</p>
                          ))}
                        </div>
                      ) : null}
                    </FieldContent>
                  </Field>
                )}
              </form.Field>
            ))}
          </FieldGroup>

          {(saveDraftMutation.error || submitMutation.error || completeStepMutation.error) && (
            <div className="border border-destructive/60 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {toErrorMessage(
                saveDraftMutation.error ?? submitMutation.error ?? completeStepMutation.error,
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!body.saveDraftAction.enabled || isBusy}
            onClick={() =>
              saveDraftMutation.mutate({
                projectId,
                workflowExecutionId: detail.shell.workflowExecutionId,
                stepExecutionId: detail.shell.stepExecutionId,
                values: buildMutationValues(form.state.values),
              })
            }
          >
            Save draft
          </Button>
          <Button
            type="button"
            disabled={!body.submitAction.enabled || isBusy}
            onClick={() => void form.handleSubmit()}
          >
            Submit
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export const Route = createFileRoute("/projects/$projectId/step-executions/$stepExecutionId")({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData({
      ...context.orpc.project.getRuntimeStepExecutionDetail.queryOptions({
        input: {
          projectId: params.projectId,
          stepExecutionId: params.stepExecutionId,
        },
      }),
      queryKey: runtimeStepExecutionDetailQueryKey(params.projectId, params.stepExecutionId),
    });
  },
  component: RuntimeFormStepDetailRoute,
});

export function RuntimeFormStepDetailRoute() {
  const { projectId, stepExecutionId } = Route.useParams();
  const { orpc } = Route.useRouteContext();

  const stepDetailQuery = useQuery({
    ...orpc.project.getRuntimeStepExecutionDetail.queryOptions({
      input: {
        projectId,
        stepExecutionId,
      },
    }),
    queryKey: runtimeStepExecutionDetailQueryKey(projectId, stepExecutionId),
  });

  const detail = stepDetailQuery.data;
  const isLoading = stepDetailQuery.isLoading;
  const hasError = Boolean(stepDetailQuery.error);

  return (
    <MethodologyWorkspaceShell
      title="Step execution detail"
      stateLabel={isLoading ? "loading" : hasError ? "failed" : "normal"}
      segments={[
        { label: "Projects", to: "/projects" },
        {
          label: projectId,
          to: "/projects/$projectId",
          params: { projectId },
        },
        detail
          ? {
              label: "Workflow execution",
              to: "/projects/$projectId/workflow-executions/$workflowExecutionId",
              params: {
                projectId,
                workflowExecutionId: detail.shell.workflowExecutionId,
              },
            }
          : { label: "Workflow execution" },
        { label: stepExecutionId },
      ]}
    >
      {isLoading ? (
        <Card frame="cut-heavy" tone="runtime" corner="white">
          <CardHeader>
            <CardTitle>Loading step execution detail…</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-40 w-full rounded-none" />
          </CardContent>
        </Card>
      ) : hasError ? (
        <Card frame="cut-heavy" tone="runtime" corner="white">
          <CardContent className="pt-4">
            <p className="border border-destructive/60 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {toErrorMessage(stepDetailQuery.error)}
            </p>
          </CardContent>
        </Card>
      ) : detail ? (
        detail.body.stepType === "form" ? (
          <FormInteractionSurface
            projectId={projectId}
            detail={detail as typeof detail & { body: FormBody }}
          />
        ) : (
          <Card frame="cut-heavy" tone="runtime" corner="white">
            <CardHeader>
              <CardTitle>{detail.shell.stepType} step detail</CardTitle>
              <CardDescription>{detail.body.defaultMessage}</CardDescription>
            </CardHeader>
          </Card>
        )
      ) : (
        <Card frame="cut-heavy" tone="runtime" corner="white">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Step execution detail is unavailable.</p>
          </CardContent>
        </Card>
      )}
    </MethodologyWorkspaceShell>
  );
}
