import type {
  AgentStepRuntimeState,
  AgentStepTimelineItem,
  GetAgentStepExecutionDetailOutput,
} from "@chiron/contracts/agent-step/runtime";
import type { WorkflowContextFactKind } from "@chiron/contracts/methodology/workflow";
import type {
  GetRuntimeStepExecutionDetailOutput,
  RuntimeFormNestedField,
  RuntimeFormResolvedField,
  RuntimeWorkflowContextFactGroup,
} from "@chiron/contracts/runtime/executions";
import type { AgentStepSseEnvelope } from "@chiron/contracts/sse/envelope";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Result } from "better-result";
import {
  BotIcon,
  CheckIcon,
  ChevronsUpDownIcon,
  CopyIcon,
  Loader2Icon,
  PanelRightCloseIcon,
  PanelRightOpenIcon,
  PlayIcon,
  RadioIcon,
  RefreshCcwIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  AiToolCall,
  AiToolCallContent,
  AiToolCallError,
  AiToolCallHeader,
  AiToolCallInput,
  AiToolCallOutput,
  type ToolCallState,
} from "@/components/elements/ai-tool-call";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  type PromptInputSubmitStatus,
} from "@/components/ai-elements/prompt-input";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Field, FieldContent, FieldDescription, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorLogoGroup,
  ModelSelectorName,
  ModelSelectorSeparator,
  ModelSelectorTrigger,
} from "@/features/workflow-editor/agent-step-tabs/model-selector";
import type { WorkflowHarnessDiscoveryMetadata } from "@/features/workflow-editor/types";
import {
  DetailCode,
  DetailEyebrow,
  DetailLabel,
  DetailPrimary,
  ExecutionBadge,
  getExecutionStatusTone,
  getGateStateTone,
  getStepTypeTone,
} from "@/features/projects/execution-detail-visuals";
import { resolveRuntimeBackendUrl } from "@/lib/runtime-backend";
import { useSSE } from "@/lib/use-sse";
import { cn } from "@/lib/utils";

export const runtimeStepExecutionDetailQueryKey = (projectId: string, stepExecutionId: string) =>
  ["runtime-step-execution-detail", projectId, stepExecutionId] as const;

export const runtimeAgentStepExecutionDetailQueryKey = (
  projectId: string,
  stepExecutionId: string,
) => ["runtime-agent-step-execution-detail", projectId, stepExecutionId] as const;

const runtimeWorkflowExecutionDetailQueryKey = (projectId: string, workflowExecutionId: string) =>
  ["runtime-workflow-execution-detail", projectId, workflowExecutionId] as const;

const agentStepHarnessMetadataQueryKey = ["agent-step-harness-metadata"] as const;

const AGENT_STEP_SSE_EVENT_NAMES = [
  "bootstrap",
  "session_state",
  "timeline",
  "tool_activity",
  "error",
  "done",
] as const;

type FormBody = Extract<GetRuntimeStepExecutionDetailOutput["body"], { stepType: "form" }>;
type AgentBody = GetAgentStepExecutionDetailOutput["body"];
type TimelineToolItem = Extract<AgentStepTimelineItem, { itemType: "tool_activity" }>;

type ToolCallTimelineEntry = {
  readonly entryType: "tool-call";
  readonly timelineItemId: string;
  readonly toolKind: TimelineToolItem["toolKind"];
  readonly toolName: string;
  readonly state: ToolCallState;
  readonly createdAt: string;
  readonly summary?: string;
  readonly input?: Record<string, unknown>;
  readonly output?: string;
  readonly error?: string;
};

type TimelineDisplayEntry =
  | {
      readonly entryType: "message";
      readonly item: Extract<AgentStepTimelineItem, { itemType: "message" }>;
    }
  | ToolCallTimelineEntry;

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

function formatUnknown(value: unknown): string {
  if (value === null) {
    return "null";
  }

  if (value === undefined) {
    return "undefined";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  const serialized = Result.try({
    try: () => JSON.stringify(value, null, 2),
    catch: () => "[unserializable]",
  });

  return serialized.isOk() ? serialized.value : "[unserializable]";
}

function parseToolPayload(value: string | undefined): Record<string, unknown> | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Result.try({
    try: () => JSON.parse(value),
    catch: () => undefined,
  });

  if (parsed.isOk() && typeof parsed.value === "object" && parsed.value !== null) {
    return parsed.value as Record<string, unknown>;
  }

  return { value };
}

function resolveToolInputPayload(item: TimelineToolItem): Record<string, unknown> | undefined {
  return item.input ? parseToolPayload(item.input) : undefined;
}

function resolveToolOutputPayload(item: TimelineToolItem): string | undefined {
  return item.output;
}

function resolveToolErrorPayload(item: TimelineToolItem): string | undefined {
  return item.error;
}

function buildAgentStepStreamUrl(projectId: string, stepExecutionId: string): string {
  const url = new URL(`${resolveRuntimeBackendUrl()}/sse/agent-step-session-events`);
  url.searchParams.set("projectId", projectId);
  url.searchParams.set("stepExecutionId", stepExecutionId);
  return url.toString();
}

function upsertTimelineItem(
  items: readonly AgentStepTimelineItem[],
  item: AgentStepTimelineItem,
): AgentStepTimelineItem[] {
  const next = new Map(items.map((entry) => [entry.timelineItemId, entry]));
  next.set(item.timelineItemId, item);

  return [...next.values()].sort((left, right) => {
    const byTime = left.createdAt.localeCompare(right.createdAt);
    return byTime !== 0 ? byTime : left.timelineItemId.localeCompare(right.timelineItemId);
  });
}

function buildTimelineDisplayEntries(
  items: readonly AgentStepTimelineItem[],
): TimelineDisplayEntry[] {
  const pendingToolIndexes = new Map<string, number[]>();
  const displayEntries: TimelineDisplayEntry[] = [];

  const toToolCorrelationKey = (timelineItemId: string): string => {
    if (timelineItemId.endsWith(":started")) {
      return timelineItemId.slice(0, -":started".length);
    }

    if (timelineItemId.endsWith(":completed")) {
      return timelineItemId.slice(0, -":completed".length);
    }

    if (timelineItemId.endsWith(":failed")) {
      return timelineItemId.slice(0, -":failed".length);
    }

    return timelineItemId;
  };

  for (const item of items) {
    if (item.itemType === "message") {
      displayEntries.push({ entryType: "message", item });
      continue;
    }

    const toolKey = toToolCorrelationKey(item.timelineItemId);
    const pendingIndexes = pendingToolIndexes.get(toolKey) ?? [];

    if (item.status === "started") {
      const inputPayload =
        resolveToolInputPayload(item) ?? (item.summary ? { summary: item.summary } : undefined);

      displayEntries.push({
        entryType: "tool-call",
        timelineItemId: item.timelineItemId,
        toolKind: item.toolKind,
        toolName: item.toolName,
        state: "running",
        createdAt: item.createdAt,
        ...(item.summary ? { summary: item.summary } : {}),
        ...(inputPayload ? { input: inputPayload } : {}),
      });

      pendingIndexes.push(displayEntries.length - 1);
      pendingToolIndexes.set(toolKey, pendingIndexes);
      continue;
    }

    const pendingIndex = pendingIndexes.pop();
    if (pendingIndex === undefined) {
      const outputPayload = resolveToolOutputPayload(item);
      const errorPayload = resolveToolErrorPayload(item);

      displayEntries.push({
        entryType: "tool-call",
        timelineItemId: item.timelineItemId,
        toolKind: item.toolKind,
        toolName: item.toolName,
        state: item.status === "completed" ? "completed" : "error",
        createdAt: item.createdAt,
        ...(item.summary ? { summary: item.summary } : {}),
        ...(item.status === "completed"
          ? outputPayload
            ? { output: outputPayload }
            : item.summary
              ? { output: item.summary }
              : {}
          : {}),
        ...(item.status === "failed"
          ? errorPayload
            ? { error: errorPayload }
            : item.summary
              ? { error: item.summary }
              : {}
          : {}),
      });
      pendingToolIndexes.set(toolKey, pendingIndexes);
      continue;
    }

    const pendingEntry = displayEntries[pendingIndex];
    if (pendingEntry?.entryType !== "tool-call") {
      pendingToolIndexes.set(toolKey, pendingIndexes);
      continue;
    }

    const outputPayload = resolveToolOutputPayload(item);
    const errorPayload = resolveToolErrorPayload(item);

    displayEntries[pendingIndex] = {
      ...pendingEntry,
      state: item.status === "completed" ? "completed" : "error",
      ...(pendingEntry.summary ? {} : item.summary ? { summary: item.summary } : {}),
      ...(item.status === "completed"
        ? outputPayload
          ? { output: outputPayload }
          : item.summary
            ? { output: item.summary }
            : {}
        : {}),
      ...(item.status === "failed"
        ? errorPayload
          ? { error: errorPayload }
          : item.summary
            ? { error: item.summary }
            : {}
        : {}),
    };

    pendingToolIndexes.set(toolKey, pendingIndexes);
  }

  return displayEntries;
}

function getAgentComposerUiState(params: { state: AgentStepRuntimeState; sessionId?: string }) {
  const { state, sessionId } = params;

  switch (state) {
    case "not_started":
      return {
        enabled: false,
        startSessionVisible: true,
        startSessionLabel: "Start Session",
        reason: "Start the session to enable the composer.",
      } as const;
    case "starting_session":
      if (!sessionId) {
        return {
          enabled: false,
          startSessionVisible: true,
          startSessionLabel: "Retry Session",
          reason: "Session startup is stale or disconnected. Retry to recover.",
        } as const;
      }

      return {
        enabled: false,
        startSessionVisible: false,
        startSessionLabel: "Start Session",
        reason: "Session startup is in progress.",
      } as const;
    case "active_streaming":
      return {
        enabled: false,
        startSessionVisible: false,
        startSessionLabel: "Start Session",
        reason: "The agent is still streaming the current turn.",
      } as const;
    case "active_idle":
      return {
        enabled: true,
        startSessionVisible: false,
        startSessionLabel: "Start Session",
      } as const;
    case "disconnected_or_error":
      return {
        enabled: false,
        startSessionVisible: true,
        startSessionLabel: "Retry Session",
        reason: "The session disconnected or errored. Retry to recover.",
      } as const;
    case "completed":
      return {
        enabled: false,
        startSessionVisible: false,
        startSessionLabel: "Start Session",
        reason: "This Agent step is completed.",
      } as const;
  }
}

function getAgentStateTone(
  state: AgentStepRuntimeState,
): Parameters<typeof ExecutionBadge>[0]["tone"] {
  switch (state) {
    case "not_started":
      return "slate";
    case "starting_session":
      return "amber";
    case "active_streaming":
      return "sky";
    case "active_idle":
      return "emerald";
    case "disconnected_or_error":
      return "rose";
    case "completed":
      return "lime";
  }
}

function renderAgentStateLabel(state: AgentStepRuntimeState): string {
  return state.replaceAll("_", " ");
}

function renderContextFactLabel(
  group: RuntimeWorkflowContextFactGroup | undefined,
  fallback: string,
) {
  return group?.definitionLabel ?? group?.definitionKey ?? fallback;
}

function renderContextFactKindLabel(kind: WorkflowContextFactKind): string {
  return kind.replaceAll("_", " ");
}

function getToolActivityTone(
  toolKind: "harness" | "mcp",
): Parameters<typeof ExecutionBadge>[0]["tone"] {
  return toolKind === "mcp" ? "amber" : "violet";
}

function getPromptInputSubmitStatus(params: {
  state: AgentStepRuntimeState;
  hasError: boolean;
  pendingTurnSubmit: boolean;
}): PromptInputSubmitStatus {
  if (params.hasError || params.state === "disconnected_or_error") {
    return "error";
  }

  if (params.pendingTurnSubmit) {
    return "streaming";
  }

  return params.state === "active_streaming" || params.state === "starting_session"
    ? "streaming"
    : "idle";
}

function getModelLabel(
  model: AgentBody["harnessBinding"]["selectedModel"] | undefined,
  metadata: WorkflowHarnessDiscoveryMetadata | undefined,
): string {
  if (!model) {
    return "Select a model";
  }

  const discovered = metadata?.models.find(
    (entry) => entry.provider === model.provider && entry.model === model.model,
  );

  return discovered?.label ?? `${model.provider} / ${model.model}`;
}

function formatAgentDefaultModel(agent: WorkflowHarnessDiscoveryMetadata["agents"][number]) {
  return agent.defaultModel
    ? `${agent.defaultModel.provider} / ${agent.defaultModel.model}`
    : "No default model";
}

function getAgentLabel(
  selectedAgent: string | undefined,
  metadata: WorkflowHarnessDiscoveryMetadata | undefined,
): string {
  if (!selectedAgent) {
    return "Select an agent";
  }

  const discovered = metadata?.agents.find((agent) => agent.key === selectedAgent);
  if (!discovered) {
    return selectedAgent;
  }

  return `${discovered.label} · ${formatAgentDefaultModel(discovered)}`;
}

function encodeOptionValue(value: unknown): string {
  return JSON.stringify(value);
}

function decodeOptionValue(value: string): unknown {
  const decoded = Result.try({
    try: () => JSON.parse(value),
    catch: () => value,
  });

  return decoded.isOk() ? decoded.value : value;
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

function getReferencePlaceholder(field: RuntimeFormResolvedField): string {
  return field.widget.valueType === "work_unit" ? "Select a work unit" : "Select an existing fact";
}

function NestedFieldHeader({ nestedField }: { nestedField: RuntimeFormNestedField }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="text-xs leading-none">{nestedField.label}</div>
      <ExecutionBadge
        label={nestedField.required ? "required" : "optional"}
        tone={nestedField.required ? "rose" : "slate"}
      />
    </div>
  );
}

function getUnavailableReferenceLabel(value: unknown, field: RuntimeFormResolvedField): string {
  const formatted = primitiveToInput(value, field);
  return formatted.length > 0 ? formatted : getReferencePlaceholder(field);
}

type StepTypeFrameStyle = CSSProperties & {
  "--frame-border": string;
  "--frame-corner": string;
};

function getStepTypeFrameStyle(stepType: string): StepTypeFrameStyle {
  switch (stepType) {
    case "form":
      return {
        "--frame-border": "color-mix(in oklab, rgb(56 189 248) 24%, var(--border))",
        "--frame-corner": "color-mix(in oklab, rgb(125 211 252) 82%, var(--foreground))",
      };
    case "agent":
      return {
        "--frame-border": "color-mix(in oklab, rgb(167 139 250) 24%, var(--border))",
        "--frame-corner": "color-mix(in oklab, rgb(196 181 253) 82%, var(--foreground))",
      };
    default:
      return {
        "--frame-border": "color-mix(in oklab, var(--foreground) 18%, var(--border))",
        "--frame-corner": "color-mix(in oklab, var(--foreground) 56%, var(--border))",
      };
  }
}

function ReferenceOptionCombobox(props: {
  field: RuntimeFormResolvedField;
  value: unknown;
  onChange: (value: unknown) => void;
  disabledOptionValues?: ReadonlySet<string>;
  disabled?: boolean;
}) {
  const { field, value, onChange, disabledOptionValues, disabled = false } = props;
  const [open, setOpen] = useState(false);
  const options = field.widget.options ?? [];
  const selectedValue = value == null ? "" : encodeOptionValue(value);
  const selectedOption =
    options.find((option) => encodeOptionValue(option.value) === selectedValue) ??
    (value != null
      ? {
          value,
          label: getUnavailableReferenceLabel(value, field),
          description: "Current selection is unavailable",
        }
      : null);

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-label={field.fieldLabel}
              aria-expanded={open}
              disabled={disabled}
              className="h-8 w-full justify-between rounded-none border-border/80 bg-background/80 px-2.5 py-1 font-normal text-foreground hover:bg-background/90"
            />
          }
        >
          <span className="truncate text-xs">
            {selectedOption?.label ??
              (disabled
                ? (field.widget.emptyState ?? getReferencePlaceholder(field))
                : getReferencePlaceholder(field))}
          </span>
          <ChevronsUpDownIcon className="size-3.5 shrink-0 opacity-70" />
        </PopoverTrigger>

        <PopoverContent
          className="w-[var(--anchor-width)] p-0"
          align="start"
          frame="cut-thin"
          tone="context"
          sideOffset={4}
        >
          <Command density="compact" frame="default" className="bg-[#0b0f12] text-foreground">
            <CommandInput
              density="compact"
              placeholder={
                field.widget.valueType === "work_unit"
                  ? "Search work units..."
                  : "Search fact instances..."
              }
            />
            <CommandList>
              <CommandEmpty>No matching options found.</CommandEmpty>
              <CommandGroup heading="Available options">
                {selectedOption ? (
                  <CommandItem
                    density="compact"
                    value={`clear ${field.fieldLabel}`}
                    onSelect={() => {
                      onChange(null);
                      setOpen(false);
                    }}
                  >
                    <span className="font-medium">Clear selection</span>
                  </CommandItem>
                ) : null}
                {options.map((option) => {
                  const encodedValue = encodeOptionValue(option.value);
                  const disabled =
                    disabledOptionValues?.has(encodedValue) === true &&
                    encodedValue !== selectedValue;

                  return (
                    <CommandItem
                      key={`${field.fieldKey}-${encodedValue}`}
                      density="compact"
                      value={
                        option.description ? `${option.label} ${option.description}` : option.label
                      }
                      disabled={disabled}
                      onSelect={() => {
                        if (disabled) {
                          return;
                        }

                        onChange(option.value);
                        setOpen(false);
                      }}
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-2">
                        <div className="grid min-w-0 flex-1 gap-0.5">
                          <span className="truncate font-medium">{option.label}</span>
                          {option.description ? (
                            <span className="truncate text-[0.68rem] uppercase tracking-[0.08em] text-muted-foreground">
                              {option.description}
                            </span>
                          ) : null}
                        </div>
                        <CheckIcon
                          className={cn(
                            "mt-0.5 size-3.5 shrink-0",
                            selectedValue === encodedValue ? "opacity-100" : "opacity-0",
                          )}
                        />
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedOption?.description ? (
        <p className="text-xs text-muted-foreground">{selectedOption.description}</p>
      ) : null}
    </div>
  );
}

function NestedFieldEditor(props: {
  nestedField: RuntimeFormNestedField;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled: boolean;
}) {
  const { nestedField, value, onChange, disabled } = props;
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
        <NestedFieldHeader nestedField={nestedField} />
        <Select
          disabled={disabled}
          value={value == null ? "" : encodeOptionValue(value)}
          onValueChange={(nextValue) =>
            onChange(nextValue && nextValue.length > 0 ? decodeOptionValue(nextValue) : null)
          }
        >
          <SelectTrigger
            aria-label={nestedField.label}
            className="w-full bg-background/80 text-foreground"
          >
            <SelectValue placeholder="Select a work unit" />
          </SelectTrigger>
          <SelectContent className="border border-border/80 bg-[#0b0f12] text-foreground">
            {nestedField.options?.map((option) => (
              <SelectItem
                key={`${nestedField.key}-${encodeOptionValue(option.value)}`}
                value={encodeOptionValue(option.value)}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        <NestedFieldHeader nestedField={nestedField} />
        <Checkbox
          disabled={disabled}
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
        <NestedFieldHeader nestedField={nestedField} />
        <Input
          disabled={disabled}
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
            <NestedFieldHeader nestedField={nestedField} />
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
                disabled={disabled}
              />
            ))}
          </div>
        </Field>
      );
    }

    return (
      <Field>
        <NestedFieldHeader nestedField={nestedField} />
        <Textarea
          disabled={disabled}
          aria-label={nestedField.label}
          value={value == null ? "" : JSON.stringify(value, null, 2)}
          onChange={(event) => {
            const nextValue = event.target.value;
            if (nextValue.trim().length === 0) {
              onChange(null);
              return;
            }

            const decoded = Result.try({
              try: () => JSON.parse(nextValue),
              catch: () => nextValue,
            });
            onChange(decoded.isOk() ? decoded.value : nextValue);
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
      <NestedFieldHeader nestedField={nestedField} />
      <Input
        disabled={disabled}
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
  disabled: boolean;
}) {
  const { field, value, onChange, disabled } = props;
  const nestedFields = field.widget.nestedFields ?? [];

  if (nestedFields.length === 0) {
    return (
      <Textarea
        disabled={disabled}
        aria-label={field.fieldLabel}
        value={value == null ? "" : JSON.stringify(value, null, 2)}
        onChange={(event) => {
          const nextValue = event.target.value;
          if (nextValue.trim().length === 0) {
            onChange(null);
            return;
          }

          const decoded = Result.try({
            try: () => JSON.parse(nextValue),
            catch: () => nextValue,
          });
          onChange(decoded.isOk() ? decoded.value : nextValue);
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
          disabled={disabled}
        />
      ))}
    </div>
  );
}

function DraftSpecEditor(props: {
  field: RuntimeFormResolvedField;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled: boolean;
}) {
  const { field, value, onChange, disabled } = props;
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
            disabled={disabled}
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
              disabled={disabled}
              onClick={() => onChange(removeArrayValue(blocks, index))}
            >
              Remove block
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => onChange(addArrayValue(blocks, {}))}
        >
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
  disabled: boolean;
}) {
  const { field, value, onChange, disabled } = props;
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
                disabled={disabled}
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
    <Select
      disabled={disabled}
      value={value == null ? "" : encodeOptionValue(value)}
      onValueChange={(nextValue) =>
        onChange(nextValue && nextValue.length > 0 ? decodeOptionValue(nextValue) : null)
      }
    >
      <SelectTrigger
        aria-label={field.fieldLabel}
        className="w-full bg-background/80 text-foreground"
      >
        <SelectValue placeholder="Select an option" />
      </SelectTrigger>
      <SelectContent className="border border-border/80 bg-[#0b0f12] text-foreground">
        {options.map((option) => (
          <SelectItem
            key={`${field.fieldKey}-${encodeOptionValue(option.value)}`}
            value={encodeOptionValue(option.value)}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function RepeatedPrimitiveField(props: {
  field: RuntimeFormResolvedField;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled: boolean;
}) {
  const { field, value, onChange, disabled } = props;
  const items = Array.isArray(value) ? value : [];

  return (
    <div className="space-y-3">
      {items.map((entry, index) => (
        <div key={`${field.fieldKey}-${index}`} className="flex items-center gap-2">
          <Input
            disabled={disabled}
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
            disabled={disabled}
            onClick={() => onChange(removeArrayValue(items, index))}
          >
            Remove
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
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
  disabled: boolean;
}) {
  const { field, value, onChange, disabled } = props;
  const options = field.widget.options ?? [];
  const hasOptions = options.length > 0;
  const shouldUseCombobox = hasOptions || field.contextFactKind === "bound_external_fact";

  if (field.widget.renderedMultiplicity === "many") {
    const items = Array.isArray(value) ? value : [];
    const selectedValues = new Set(
      items.filter((entry) => entry != null).map((entry) => encodeOptionValue(entry)),
    );
    const canAddReference = hasOptions && items.length < options.length;

    return (
      <div className="space-y-3">
        {items.map((entry, index) => (
          <div key={`${field.fieldKey}-${index}`} className="flex items-center gap-2">
            <div className="flex-1">
              {shouldUseCombobox ? (
                <ReferenceOptionCombobox
                  field={{ ...field, fieldLabel: `${field.fieldLabel} ${index + 1}` }}
                  value={entry}
                  onChange={(nextValue) => onChange(updateArrayValue(items, index, nextValue))}
                  disabledOptionValues={selectedValues}
                  disabled={disabled || !hasOptions}
                />
              ) : (
                <Input
                  disabled={disabled}
                  aria-label={`${field.fieldLabel} ${index + 1}`}
                  value={primitiveToInput(entry, field)}
                  onChange={(event) =>
                    onChange(
                      updateArrayValue(items, index, primitiveFromInput(event.target.value, field)),
                    )
                  }
                  placeholder={
                    field.widget.valueType === "work_unit"
                      ? "project work unit id"
                      : "fact instance id"
                  }
                />
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={() => onChange(removeArrayValue(items, index))}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          disabled={disabled || !canAddReference}
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
      {shouldUseCombobox ? (
        <ReferenceOptionCombobox
          field={field}
          value={value}
          onChange={onChange}
          disabled={disabled || !hasOptions}
        />
      ) : (
        <Input
          disabled={disabled}
          aria-label={field.fieldLabel}
          value={primitiveToInput(value, field)}
          onChange={(event) => onChange(primitiveFromInput(event.target.value, field))}
          placeholder={
            field.widget.valueType === "work_unit" ? "project work unit id" : "fact instance id"
          }
        />
      )}
      {field.widget.emptyState ? (
        <p className="text-xs text-muted-foreground">{field.widget.emptyState}</p>
      ) : null}
      {shouldUseCombobox && !hasOptions && value != null ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => onChange(null)}
          >
            Clear unavailable selection
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function FormFieldEditor(props: {
  field: RuntimeFormResolvedField;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled: boolean;
}) {
  const { field, value, onChange, disabled } = props;

  if (field.contextFactKind === "work_unit_draft_spec_fact") {
    return <DraftSpecEditor field={field} value={value} onChange={onChange} disabled={disabled} />;
  }

  if (
    field.contextFactKind === "workflow_reference_fact" ||
    (field.widget.control === "select" && (field.widget.options?.length ?? 0) > 0)
  ) {
    return <SelectField field={field} value={value} onChange={onChange} disabled={disabled} />;
  }

  if (field.widget.control === "reference") {
    return <ReferenceField field={field} value={value} onChange={onChange} disabled={disabled} />;
  }

  if (field.contextFactKind === "artifact_reference_fact") {
    return (
      <div className="space-y-2">
        <Input
          disabled={disabled}
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
                disabled={disabled}
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
            disabled={disabled}
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
          disabled={disabled}
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
                disabled={disabled}
              />
              <Button
                type="button"
                variant="outline"
                disabled={disabled}
                onClick={() => onChange(removeArrayValue(items, index))}
              >
                Remove row
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => onChange(addArrayValue(items, {}))}
          >
            Add row
          </Button>
        </div>
      );
    }

    return (
      <JsonStructuredEditor field={field} value={value} onChange={onChange} disabled={disabled} />
    );
  }

  if (field.widget.renderedMultiplicity === "many") {
    return (
      <RepeatedPrimitiveField field={field} value={value} onChange={onChange} disabled={disabled} />
    );
  }

  return (
    <Input
      disabled={disabled}
      aria-label={field.fieldLabel}
      type={field.widget.control === "number" ? "number" : "text"}
      value={primitiveToInput(value, field)}
      onChange={(event) => onChange(primitiveFromInput(event.target.value, field))}
      placeholder={field.widget.control === "path" ? "repo-relative path" : undefined}
    />
  );
}

function StepExecutionShellCard(props: {
  shell: GetRuntimeStepExecutionDetailOutput["shell"];
  completionOutcome: string;
  isBusy: boolean;
  onComplete?: () => void;
}) {
  const { shell, completionOutcome, isBusy, onComplete } = props;

  return (
    <Card frame="cut-heavy" tone="runtime" corner="white">
      <CardHeader>
        <div className="space-y-1">
          <DetailEyebrow>Shared step shell</DetailEyebrow>
          <CardTitle>Step execution identity &amp; status</CardTitle>
          <CardDescription>
            Common runtime metadata stays in the shared shell while step-type specific interaction
            lives below.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1.3fr)_minmax(16rem,0.7fr)]">
          <div className="space-y-3 border border-border/70 bg-background/40 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <ExecutionBadge label={shell.status} tone={getExecutionStatusTone(shell.status)} />
              <ExecutionBadge label={shell.stepType} tone={getStepTypeTone(shell.stepType)} />
              <ExecutionBadge
                label={completionOutcome}
                tone={getGateStateTone(shell.completionAction.enabled ? "ready" : shell.status)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <DetailLabel>Step execution</DetailLabel>
                <DetailCode>{shell.stepExecutionId}</DetailCode>
              </div>
              <div>
                <DetailLabel>Workflow execution</DetailLabel>
                <DetailCode>{shell.workflowExecutionId}</DetailCode>
              </div>
              <div className="sm:col-span-2">
                <DetailLabel>Step definition</DetailLabel>
                <DetailPrimary>{shell.stepType} step</DetailPrimary>
                <DetailCode>{shell.stepDefinitionId}</DetailCode>
              </div>
            </div>
          </div>

          <div className="space-y-3 border border-sky-500/30 bg-sky-500/5 p-3 before:pointer-events-none before:absolute">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <DetailLabel>Activated</DetailLabel>
                <DetailPrimary>{formatTimestamp(shell.activatedAt)}</DetailPrimary>
              </div>
              <div>
                <DetailLabel>Completed</DetailLabel>
                <DetailPrimary>{formatTimestamp(shell.completedAt)}</DetailPrimary>
              </div>
              <div className="sm:col-span-2">
                <DetailLabel>Completion gate</DetailLabel>
                <DetailPrimary>{completionOutcome}</DetailPrimary>
                {!shell.completionAction.enabled && shell.completionAction.reasonIfDisabled ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {shell.completionAction.reasonIfDisabled}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </CardContent>

      {shell.completionAction.visible && shell.completionAction.enabled && onComplete ? (
        <CardFooter className="justify-end">
          <Button type="button" disabled={isBusy} onClick={onComplete}>
            Complete Step
          </Button>
        </CardFooter>
      ) : null}
    </Card>
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
  const isReadOnly = detail.shell.status === "completed";

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
      <StepExecutionShellCard
        shell={detail.shell}
        completionOutcome={completionOutcome}
        isBusy={isBusy}
        onComplete={() =>
          completeStepMutation.mutate({
            projectId,
            workflowExecutionId: detail.shell.workflowExecutionId,
            stepExecutionId: detail.shell.stepExecutionId,
          })
        }
      />

      <Card
        frame="cut-heavy"
        tone="runtime"
        corner="white"
        style={getStepTypeFrameStyle(detail.shell.stepType)}
      >
        <CardHeader>
          <div className="space-y-1">
            <DetailEyebrow>Form</DetailEyebrow>
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
                        <div className="text-sm leading-none text-foreground">
                          {resolvedField.fieldLabel}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <ExecutionBadge
                            label={renderContextFactKindLabel(resolvedField.contextFactKind)}
                            tone={
                              resolvedField.contextFactKind === "bound_external_fact"
                                ? "amber"
                                : resolvedField.contextFactKind === "workflow_reference_fact"
                                  ? "violet"
                                  : resolvedField.contextFactKind === "artifact_reference_fact"
                                    ? "emerald"
                                    : resolvedField.contextFactKind === "work_unit_draft_spec_fact"
                                      ? "sky"
                                      : "slate"
                            }
                          />
                          <ExecutionBadge
                            label={resolvedField.widget.renderedMultiplicity}
                            tone="slate"
                          />
                          {resolvedField.widget.valueType ? (
                            <ExecutionBadge label={resolvedField.widget.valueType} tone="sky" />
                          ) : null}
                          {resolvedField.widget.bindingLabel ? (
                            <ExecutionBadge label={resolvedField.widget.bindingLabel} tone="lime" />
                          ) : null}
                          <ExecutionBadge
                            label={resolvedField.required ? "required" : "optional"}
                            tone={resolvedField.required ? "rose" : "slate"}
                          />
                        </div>
                      </div>

                      {resolvedField.helpText ? (
                        <FieldDescription>{resolvedField.helpText}</FieldDescription>
                      ) : null}

                      <FormFieldEditor
                        field={resolvedField}
                        value={field.state.value}
                        onChange={field.handleChange}
                        disabled={isReadOnly}
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

function ContextFactInstances(props: {
  group: RuntimeWorkflowContextFactGroup | undefined;
  emptyMessage: string;
}) {
  const { group, emptyMessage } = props;

  if (!group || group.instances.length === 0) {
    return <p className="text-xs text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-2">
      {group.instances.map((instance) => (
        <li
          key={`${group.contextFactDefinitionId}-${instance.contextFactInstanceId ?? instance.instanceOrder}`}
          className="space-y-1 border border-border/70 bg-background/50 p-2"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground">
            <span>Instance {instance.instanceOrder + 1}</span>
            <span>{formatTimestamp(instance.recordedAt)}</span>
          </div>
          <pre className="whitespace-pre-wrap break-words text-xs text-foreground">
            {formatUnknown(instance.valueJson)}
          </pre>
        </li>
      ))}
    </ul>
  );
}

function AgentInteractionSurface(props: {
  projectId: string;
  shell: GetRuntimeStepExecutionDetailOutput["shell"];
  detail: GetAgentStepExecutionDetailOutput;
}) {
  const { detail, projectId, shell } = props;
  const { orpc, queryClient } = Route.useRouteContext();

  const workflowDetailQuery = useQuery({
    ...orpc.project.getRuntimeWorkflowExecutionDetail.queryOptions({
      input: {
        projectId,
        workflowExecutionId: shell.workflowExecutionId,
      },
    }),
    queryKey: runtimeWorkflowExecutionDetailQueryKey(projectId, shell.workflowExecutionId),
  });

  const workflowProcedures = orpc.methodology.version.workUnit.workflow as unknown as {
    discoverAgentStepHarnessMetadata?: {
      queryOptions?: (_args: { input: {} }) => {
        queryKey: readonly unknown[];
        queryFn: () => Promise<WorkflowHarnessDiscoveryMetadata>;
      };
    };
  };

  const harnessMetadataQueryOptions =
    workflowProcedures.discoverAgentStepHarnessMetadata?.queryOptions?.({ input: {} }) ?? {
      queryKey: agentStepHarnessMetadataQueryKey,
      queryFn: async () => undefined,
    };

  const harnessMetadataQuery = useQuery({
    ...harnessMetadataQueryOptions,
    queryKey: agentStepHarnessMetadataQueryKey,
  });

  const [composerText, setComposerText] = useState("");
  const [agentSelectorOpen, setAgentSelectorOpen] = useState(false);
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [sidePanelOpen, setSidePanelOpen] = useState(true);
  const [sidePanelTab, setSidePanelTab] = useState<"read" | "write">("write");
  const [runtimeState, setRuntimeState] = useState<AgentStepRuntimeState>(detail.body.state);
  const [timelineItems, setTimelineItems] = useState<readonly AgentStepTimelineItem[]>(
    detail.body.timelinePreview,
  );
  const [liveErrorMessage, setLiveErrorMessage] = useState<string | null>(null);
  const [copiedAttachCommand, setCopiedAttachCommand] = useState(false);
  const [pendingTurnSubmit, setPendingTurnSubmit] = useState(false);
  const processedEventCountRef = useRef(0);
  const pendingOptimisticUserTimelineIdRef = useRef<string | null>(null);
  const pendingOptimisticUserMessageRef = useRef<string | null>(null);

  useEffect(() => {
    setRuntimeState(detail.body.state);
  }, [detail.body.state]);

  useEffect(() => {
    processedEventCountRef.current = 0;
    setLiveErrorMessage(null);
    setCopiedAttachCommand(false);
    setPendingTurnSubmit(false);
    pendingOptimisticUserTimelineIdRef.current = null;
    pendingOptimisticUserMessageRef.current = null;
    setTimelineItems(detail.body.timelinePreview);
  }, [detail.body.timelinePreview]);

  useEffect(() => {
    if (!copiedAttachCommand) {
      return;
    }

    const timer = setTimeout(() => {
      setCopiedAttachCommand(false);
    }, 1600);

    return () => {
      clearTimeout(timer);
    };
  }, [copiedAttachCommand]);

  const composerUiState = getAgentComposerUiState({
    state: runtimeState,
    sessionId: detail.body.harnessBinding.sessionId,
  });
  const shouldStreamSessionEvents =
    Boolean(detail.body.harnessBinding.sessionId) &&
    runtimeState !== "disconnected_or_error" &&
    runtimeState !== "completed";
  const streamUrl = shouldStreamSessionEvents
    ? buildAgentStepStreamUrl(projectId, shell.stepExecutionId)
    : null;
  const stream = useSSE<AgentStepSseEnvelope, AgentStepSseEnvelope>(streamUrl, {
    eventNames: AGENT_STEP_SSE_EVENT_NAMES,
  });

  useEffect(() => {
    const nextEvents = stream.events.slice(processedEventCountRef.current);
    if (nextEvents.length === 0) {
      return;
    }

    processedEventCountRef.current = stream.events.length;

    for (const event of nextEvents) {
      if (event.eventType === "bootstrap") {
        setRuntimeState(event.data.state);
        setTimelineItems((previous) => {
          let merged = previous;
          for (const item of event.data.timelineItems) {
            merged = upsertTimelineItem(merged, item);
          }
          return merged;
        });
        continue;
      }

      if (event.eventType === "session_state") {
        setPendingTurnSubmit(false);
        setRuntimeState(event.data.state);
        continue;
      }

      if (event.eventType === "timeline" || event.eventType === "tool_activity") {
        setPendingTurnSubmit(false);
        setTimelineItems((previous) => {
          if (
            event.eventType === "timeline" &&
            event.data.item.itemType === "message" &&
            event.data.item.role === "user" &&
            pendingOptimisticUserTimelineIdRef.current &&
            pendingOptimisticUserMessageRef.current &&
            event.data.item.content.trim() === pendingOptimisticUserMessageRef.current.trim()
          ) {
            const withoutOptimistic = previous.filter(
              (entry) => entry.timelineItemId !== pendingOptimisticUserTimelineIdRef.current,
            );
            pendingOptimisticUserTimelineIdRef.current = null;
            pendingOptimisticUserMessageRef.current = null;
            return upsertTimelineItem(withoutOptimistic, event.data.item);
          }

          return upsertTimelineItem(previous, event.data.item);
        });

        if (
          event.eventType === "tool_activity" &&
          event.data.item.toolKind === "mcp" &&
          event.data.item.toolName === "write_context_value" &&
          event.data.item.status === "completed"
        ) {
          void Promise.all([
            queryClient.invalidateQueries({
              queryKey: runtimeWorkflowExecutionDetailQueryKey(
                projectId,
                shell.workflowExecutionId,
              ),
            }),
            queryClient.invalidateQueries({
              queryKey: runtimeAgentStepExecutionDetailQueryKey(projectId, shell.stepExecutionId),
            }),
          ]);
        }

        continue;
      }

      if (event.eventType === "error") {
        setPendingTurnSubmit(false);
        setRuntimeState("disconnected_or_error");
        setLiveErrorMessage(event.data.error.message);
        void Promise.all([
          queryClient.invalidateQueries({
            queryKey: runtimeStepExecutionDetailQueryKey(projectId, shell.stepExecutionId),
          }),
          queryClient.invalidateQueries({
            queryKey: runtimeAgentStepExecutionDetailQueryKey(projectId, shell.stepExecutionId),
          }),
          queryClient.invalidateQueries({
            queryKey: runtimeWorkflowExecutionDetailQueryKey(projectId, shell.workflowExecutionId),
          }),
        ]);
        continue;
      }

      if (event.eventType === "done") {
        setPendingTurnSubmit(false);
        setRuntimeState(event.data.finalState);
      }
    }
  }, [projectId, queryClient, shell.stepExecutionId, shell.workflowExecutionId, stream.events]);

  useEffect(() => {
    if (stream.status !== "error") {
      return;
    }

    void Promise.all([
      queryClient.invalidateQueries({
        queryKey: runtimeStepExecutionDetailQueryKey(projectId, shell.stepExecutionId),
      }),
      queryClient.invalidateQueries({
        queryKey: runtimeAgentStepExecutionDetailQueryKey(projectId, shell.stepExecutionId),
      }),
      queryClient.invalidateQueries({
        queryKey: runtimeWorkflowExecutionDetailQueryKey(projectId, shell.workflowExecutionId),
      }),
    ]);
  }, [projectId, queryClient, shell.stepExecutionId, shell.workflowExecutionId, stream.status]);

  const startSessionMutation = useMutation(
    orpc.project.startAgentStepSession.mutationOptions({
      onSuccess: async (result) => {
        setRuntimeState(result.state);
        setLiveErrorMessage(null);
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: runtimeStepExecutionDetailQueryKey(projectId, shell.stepExecutionId),
          }),
          queryClient.invalidateQueries({
            queryKey: runtimeAgentStepExecutionDetailQueryKey(projectId, shell.stepExecutionId),
          }),
          queryClient.invalidateQueries({
            queryKey: runtimeWorkflowExecutionDetailQueryKey(projectId, shell.workflowExecutionId),
          }),
        ]);
      },
      onError: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: runtimeStepExecutionDetailQueryKey(projectId, shell.stepExecutionId),
          }),
          queryClient.invalidateQueries({
            queryKey: runtimeAgentStepExecutionDetailQueryKey(projectId, shell.stepExecutionId),
          }),
          queryClient.invalidateQueries({
            queryKey: runtimeWorkflowExecutionDetailQueryKey(projectId, shell.workflowExecutionId),
          }),
        ]);
      },
    }),
  );

  const sendMessageMutation = useMutation(
    orpc.project.sendAgentStepMessage.mutationOptions({
      onSuccess: async (result) => {
        setPendingTurnSubmit(false);
        setRuntimeState(result.state);
        await queryClient.invalidateQueries({
          queryKey: runtimeAgentStepExecutionDetailQueryKey(projectId, shell.stepExecutionId),
        });
      },
      onError: async () => {
        setPendingTurnSubmit(false);
        pendingOptimisticUserTimelineIdRef.current = null;
        pendingOptimisticUserMessageRef.current = null;
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: runtimeStepExecutionDetailQueryKey(projectId, shell.stepExecutionId),
          }),
          queryClient.invalidateQueries({
            queryKey: runtimeAgentStepExecutionDetailQueryKey(projectId, shell.stepExecutionId),
          }),
          queryClient.invalidateQueries({
            queryKey: runtimeWorkflowExecutionDetailQueryKey(projectId, shell.workflowExecutionId),
          }),
        ]);
      },
    }),
  );

  const updateTurnSelectionMutation = useMutation(
    orpc.project.updateAgentStepTurnSelection.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: agentStepHarnessMetadataQueryKey });
        await queryClient.invalidateQueries({
          queryKey: runtimeAgentStepExecutionDetailQueryKey(projectId, shell.stepExecutionId),
        });
      },
    }),
  );

  const completeStepMutation = useMutation(
    orpc.project.completeAgentStepExecution.mutationOptions({
      onSuccess: async () => {
        setRuntimeState("completed");
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: runtimeStepExecutionDetailQueryKey(projectId, shell.stepExecutionId),
          }),
          queryClient.invalidateQueries({
            queryKey: runtimeAgentStepExecutionDetailQueryKey(projectId, shell.stepExecutionId),
          }),
          queryClient.invalidateQueries({
            queryKey: runtimeWorkflowExecutionDetailQueryKey(projectId, shell.workflowExecutionId),
          }),
        ]);
      },
    }),
  );

  const completionOutcome =
    shell.status === "completed"
      ? "Completed"
      : shell.completionAction.enabled
        ? "Ready to complete"
        : (shell.completionAction.reasonIfDisabled ?? "Incomplete");
  const isBusy =
    startSessionMutation.isPending ||
    updateTurnSelectionMutation.isPending ||
    completeStepMutation.isPending;

  const workflowGroups = workflowDetailQuery.data?.workflowContextFacts.groups ?? [];
  const workflowGroupById = useMemo(
    () => new Map(workflowGroups.map((group) => [group.contextFactDefinitionId, group])),
    [workflowGroups],
  );

  const readItems = useMemo(
    () =>
      detail.body.readableContextFacts.map((fact) => ({
        ...fact,
        group: workflowGroupById.get(fact.contextFactDefinitionId),
      })),
    [detail.body.readableContextFacts, workflowGroupById],
  );

  const writeItems = useMemo(
    () =>
      detail.body.writeItems.map((item) => {
        const group = workflowGroupById.get(item.contextFactDefinitionId);
        const requirements = item.requirementContextFactDefinitionIds.map((requirementId) => ({
          requirementId,
          group: workflowGroupById.get(requirementId),
        }));
        const requirementCount = requirements.length;
        const satisfiedCount = requirements.filter(
          (entry) => (entry.group?.instances.length ?? 0) > 0,
        ).length;
        const requirementsSatisfied = satisfiedCount === requirementCount;
        const appliedCount = group?.instances.length ?? 0;

        return {
          item,
          group,
          requirements,
          requirementsSatisfied,
          appliedCount,
          status: !requirementsSatisfied ? "blocked" : appliedCount > 0 ? "applied" : "ready",
        } as const;
      }),
    [detail.body.writeItems, workflowGroupById],
  );

  const writeProgress = useMemo(
    () => ({
      total: writeItems.length,
      blocked: writeItems.filter((entry) => entry.status === "blocked").length,
      ready: writeItems.filter((entry) => entry.status === "ready").length,
      applied: writeItems.filter((entry) => entry.status === "applied").length,
    }),
    [writeItems],
  );

  const selectedModel = detail.body.harnessBinding.selectedModel;
  const selectedAgent = detail.body.harnessBinding.selectedAgent;
  const timelineDisplayEntries = useMemo(
    () => buildTimelineDisplayEntries(timelineItems),
    [timelineItems],
  );
  const attachCommand = detail.body.harnessBinding.serverBaseUrl
    ? `opencode attach ${detail.body.harnessBinding.serverBaseUrl} -s ${detail.body.harnessBinding.sessionId}${detail.body.projectRootPath ? ` --dir ${detail.body.projectRootPath}` : ""}`
    : null;
  const selectedAgentLabel = getAgentLabel(selectedAgent, harnessMetadataQuery.data);
  const selectedModelLabel = getModelLabel(selectedModel, harnessMetadataQuery.data);
  const promptSubmitStatus = getPromptInputSubmitStatus({
    state: runtimeState,
    hasError:
      Boolean(liveErrorMessage) ||
      Boolean(startSessionMutation.error) ||
      Boolean(sendMessageMutation.error),
    pendingTurnSubmit,
  });

  return (
    <div className="space-y-4 scrollbar-thin">
      <StepExecutionShellCard
        shell={shell}
        completionOutcome={completionOutcome}
        isBusy={isBusy}
        onComplete={() =>
          completeStepMutation.mutate({
            projectId,
            stepExecutionId: shell.stepExecutionId,
          })
        }
      />

      <Card
        frame="cut-heavy"
        tone="runtime"
        corner="white"
        style={getStepTypeFrameStyle(shell.stepType)}
      >
        <CardHeader>
          <div className="space-y-1">
            <DetailEyebrow>Agent runtime</DetailEyebrow>
            <CardTitle>Session orchestration &amp; context boundaries</CardTitle>
            <CardDescription>
              Explicit session start, one live SSE feed, provider-grouped next-turn model selection,
              and read/write context boundaries for this Agent step.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-4">
            <Card frame="flat" tone="runtime" className="border-border/70 bg-background/40">
              <CardHeader className="border-b border-border/70">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardDescription className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                      Objective
                    </CardDescription>
                    <CardTitle className="text-sm uppercase tracking-[0.12em]">
                      {detail.body.objective}
                    </CardTitle>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <ExecutionBadge
                      label={renderAgentStateLabel(runtimeState)}
                      tone={getAgentStateTone(runtimeState)}
                    />
                    <ExecutionBadge
                      label={stream.status === "open" ? "stream open" : stream.status}
                      tone={
                        stream.status === "error"
                          ? "rose"
                          : stream.status === "open"
                            ? "sky"
                            : "slate"
                      }
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 py-4 xl:grid-cols-[minmax(0,1fr)_minmax(15rem,0.45fr)]">
                <div className="space-y-2">
                  <p className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                    Instructions
                  </p>
                  <div className="border border-border/70 bg-background/60 p-3 text-sm leading-relaxed text-foreground">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {detail.body.instructionsMarkdown}
                    </ReactMarkdown>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="border border-border/70 bg-background/60 p-3 text-xs">
                    <p className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                      Session policy
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <ExecutionBadge label={detail.body.sessionStartPolicy} tone="amber" />
                      <ExecutionBadge
                        label={detail.body.contractBoundary.streamContract.streamName}
                        tone="sky"
                      />
                      <ExecutionBadge label={detail.body.contractBoundary.version} tone="slate" />
                    </div>
                  </div>
                  <div className="border border-border/70 bg-background/60 p-3 text-xs">
                    <p className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                      Harness binding
                    </p>
                    <div className="mt-2 space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <ExecutionBadge
                          label={detail.body.harnessBinding.harnessId}
                          tone="violet"
                        />
                        <ExecutionBadge
                          label={detail.body.harnessBinding.bindingState}
                          tone={
                            detail.body.harnessBinding.bindingState === "bound"
                              ? "emerald"
                              : "amber"
                          }
                        />
                      </div>
                      {detail.body.harnessBinding.sessionId ? (
                        <DetailCode>{detail.body.harnessBinding.sessionId}</DetailCode>
                      ) : (
                        <p className="text-muted-foreground">No live harness session yet.</p>
                      )}
                      {detail.body.harnessBinding.serverBaseUrl ? (
                        <DetailCode>{detail.body.harnessBinding.serverBaseUrl}</DetailCode>
                      ) : null}
                      {attachCommand ? (
                        <div className="flex items-center justify-between gap-2 rounded-none border border-border/70 bg-background/50 px-2 py-1.5 text-[0.7rem]">
                          <span className="truncate text-muted-foreground">{attachCommand}</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 shrink-0 px-2"
                            onClick={async () => {
                              const copied = await Result.tryPromise({
                                try: () => navigator.clipboard.writeText(attachCommand),
                                catch: (error) => error,
                              });

                              if (copied.isOk()) {
                                setCopiedAttachCommand(true);
                                return;
                              }

                              setLiveErrorMessage(
                                "Failed to copy attach command. Copy it manually from the line above.",
                              );
                            }}
                          >
                            {copiedAttachCommand ? (
                              <>
                                <CheckIcon className="size-3.5" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <CopyIcon className="size-3.5" />
                                <span>Copy attach</span>
                              </>
                            )}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div
              className="grid items-stretch gap-4 transition-[grid-template-columns] duration-200 ease-out"
              style={
                {
                  gridTemplateColumns: sidePanelOpen
                    ? "minmax(0,1fr) minmax(20rem,0.9fr)"
                    : "minmax(0,1fr) 2.75rem",
                } as CSSProperties
              }
            >
              <Card
                frame="flat"
                tone="runtime"
                className="flex h-[calc(100vh-16rem)] min-h-[26rem] min-w-0 flex-col border-border/70 bg-background/40"
              >
                <CardHeader className="border-b border-border/70">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <CardDescription className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                        Timeline
                      </CardDescription>
                      <CardTitle className="text-sm">Conversation &amp; tool activity</CardTitle>
                    </div>
                    {runtimeState === "active_streaming" ? (
                      <div className="flex items-center gap-2 text-xs text-sky-200">
                        <RadioIcon className="size-3.5 animate-pulse" />
                        <span>Streaming current turn</span>
                      </div>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="min-h-0 flex-1 space-y-3 overflow-y-auto py-4">
                  {timelineDisplayEntries.length === 0 ? (
                    <div className="border border-dashed border-border/70 bg-background/50 px-3 py-6 text-center text-sm text-muted-foreground">
                      No timeline activity yet. Start the session to begin the runtime trace.
                    </div>
                  ) : (
                    <div className="space-y-3 pr-1" data-testid="agent-step-timeline-list">
                      {timelineDisplayEntries.map((entry) =>
                        entry.entryType === "message" ? (
                          <article
                            key={entry.item.timelineItemId}
                            className="border border-border/70 bg-background/55 p-3"
                            data-testid={`agent-step-timeline-message-${entry.item.timelineItemId}`}
                          >
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <ExecutionBadge
                                  label={entry.item.role}
                                  tone={
                                    entry.item.role === "assistant"
                                      ? "violet"
                                      : entry.item.role === "user"
                                        ? "sky"
                                        : "slate"
                                  }
                                />
                                <span className="text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground">
                                  {formatTimestamp(entry.item.createdAt)}
                                </span>
                              </div>
                            </div>
                            <pre className="whitespace-pre-wrap break-words text-sm text-foreground">
                              {entry.item.content}
                            </pre>
                          </article>
                        ) : (
                          <AiToolCall
                            key={entry.timelineItemId}
                            name={entry.toolName}
                            state={entry.state}
                            className="rounded-none border-border/70 bg-background/55"
                          >
                            <AiToolCallHeader className="rounded-none">
                              <div className="flex flex-wrap items-center gap-2">
                                <ExecutionBadge
                                  label={entry.toolKind}
                                  tone={entry.toolKind === "mcp" ? "amber" : "violet"}
                                />
                                <span className="text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground">
                                  {formatTimestamp(entry.createdAt)}
                                </span>
                              </div>
                            </AiToolCallHeader>
                            <AiToolCallContent>
                              {entry.summary ? (
                                <p className="text-sm text-muted-foreground">{entry.summary}</p>
                              ) : null}
                              {entry.input ? <AiToolCallInput input={entry.input} /> : null}
                              {entry.output ? (
                                <AiToolCallOutput>
                                  <pre className="whitespace-pre-wrap break-words font-mono text-xs">
                                    {entry.output}
                                  </pre>
                                </AiToolCallOutput>
                              ) : null}
                              {entry.error ? <AiToolCallError error={entry.error} /> : null}
                            </AiToolCallContent>
                          </AiToolCall>
                        ),
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <aside
                className={cn(
                  "flex h-[calc(100vh-16rem)] min-h-[26rem] min-w-0 flex-col overflow-hidden border border-border/70 bg-background/40",
                  !sidePanelOpen && "justify-self-end",
                )}
              >
                <div
                  className={cn(
                    "flex items-center gap-2 border-b border-border/70 py-2",
                    sidePanelOpen ? "justify-between px-3" : "justify-center px-1",
                  )}
                >
                  {sidePanelOpen ? (
                    <div className="space-y-0.5">
                      <p className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                        Context side panel
                      </p>
                      <p className="text-sm font-medium">Read / Write</p>
                    </div>
                  ) : null}

                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label="Toggle side panel"
                    onClick={() => setSidePanelOpen((current) => !current)}
                  >
                    {sidePanelOpen ? (
                      <PanelRightCloseIcon className="size-3.5" />
                    ) : (
                      <PanelRightOpenIcon className="size-3.5" />
                    )}
                  </Button>
                </div>

                <div
                  className={cn(
                    "min-h-0 flex-1 space-y-3 overflow-y-auto p-3 transition-opacity duration-150",
                    sidePanelOpen ? "opacity-100" : "pointer-events-none select-none opacity-0",
                  )}
                >
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={sidePanelTab === "read" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setSidePanelTab("read")}
                    >
                      Read
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={sidePanelTab === "write" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setSidePanelTab("write")}
                    >
                      Write
                    </Button>
                  </div>

                  {workflowDetailQuery.isLoading ? (
                    <Skeleton className="h-48 w-full rounded-none" />
                  ) : workflowDetailQuery.error ? (
                    <div className="border border-destructive/60 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {toErrorMessage(workflowDetailQuery.error)}
                    </div>
                  ) : sidePanelTab === "read" ? (
                    <div className="space-y-3" data-testid="agent-step-side-panel-read">
                      {readItems.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No readable context facts are exposed.
                        </p>
                      ) : (
                        readItems.map((entry) => (
                          <article
                            key={entry.contextFactDefinitionId}
                            className="space-y-3 border border-border/70 bg-background/55 p-3"
                          >
                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-2">
                                <ExecutionBadge label={entry.source} tone="slate" />
                                <ExecutionBadge
                                  label={renderContextFactKindLabel(entry.contextFactKind)}
                                  tone="sky"
                                />
                              </div>
                              <h3 className="text-sm font-medium text-foreground">
                                {renderContextFactLabel(entry.group, entry.contextFactDefinitionId)}
                              </h3>
                            </div>
                            <ContextFactInstances
                              group={entry.group}
                              emptyMessage="No runtime values are currently available."
                            />
                          </article>
                        ))
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3" data-testid="agent-step-side-panel-write">
                      <article className="space-y-3 border border-border/70 bg-background/55 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                              Progression
                            </p>
                            <h3 className="text-sm font-medium text-foreground">
                              Requirement-gated write exposure
                            </h3>
                          </div>
                          <ExecutionBadge
                            label={`${writeProgress.applied}/${writeProgress.total} applied`}
                            tone="emerald"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="border border-border/70 bg-background/60 p-2 text-center text-muted-foreground">
                            blocked {writeProgress.blocked}
                          </div>
                          <div className="border border-border/70 bg-background/60 p-2 text-center text-muted-foreground">
                            ready {writeProgress.ready}
                          </div>
                          <div className="border border-border/70 bg-background/60 p-2 text-center text-muted-foreground">
                            applied {writeProgress.applied}
                          </div>
                        </div>
                      </article>

                      {writeItems.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No write targets are configured.
                        </p>
                      ) : (
                        writeItems.map((entry) => (
                          <article
                            key={entry.item.writeItemId}
                            className="space-y-3 border border-border/70 bg-background/55 p-3"
                          >
                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-2">
                                <ExecutionBadge label={`order ${entry.item.order}`} tone="slate" />
                                <ExecutionBadge
                                  label={entry.status}
                                  tone={
                                    entry.status === "applied"
                                      ? "emerald"
                                      : entry.status === "ready"
                                        ? "amber"
                                        : "rose"
                                  }
                                />
                              </div>
                              <h3 className="text-sm font-medium text-foreground">
                                {renderContextFactLabel(
                                  entry.group,
                                  entry.item.contextFactDefinitionId,
                                )}
                              </h3>
                              <p className="text-xs text-muted-foreground">
                                {renderContextFactKindLabel(entry.item.contextFactKind)}
                              </p>
                            </div>

                            <div className="space-y-2">
                              <p className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                                Requirements
                              </p>
                              {entry.requirements.length === 0 ? (
                                <p className="text-xs text-muted-foreground">
                                  No prerequisites. Exposed immediately.
                                </p>
                              ) : (
                                <ul className="space-y-2">
                                  {entry.requirements.map((requirement) => {
                                    const satisfied =
                                      (requirement.group?.instances.length ?? 0) > 0;
                                    return (
                                      <li
                                        key={`${entry.item.writeItemId}-${requirement.requirementId}`}
                                        className="flex items-center justify-between gap-3 border border-border/70 bg-background/60 px-2 py-2 text-xs"
                                      >
                                        <span className="min-w-0 truncate text-foreground">
                                          {renderContextFactLabel(
                                            requirement.group,
                                            requirement.requirementId,
                                          )}
                                        </span>
                                        <ExecutionBadge
                                          label={satisfied ? "satisfied" : "waiting"}
                                          tone={satisfied ? "emerald" : "amber"}
                                        />
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                            </div>

                            <div className="space-y-2">
                              <p className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                                Applied values
                              </p>
                              <ContextFactInstances
                                group={entry.group}
                                emptyMessage="No successful Chiron write-tool application yet."
                              />
                            </div>
                          </article>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </aside>
            </div>

            <Card frame="flat" tone="runtime" className="border-border/70 bg-background/40">
              <CardHeader className="border-b border-border/70">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardDescription className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                      Composer
                    </CardDescription>
                    <CardTitle className="text-sm">
                      PromptInput baseline + next-turn model selection
                    </CardTitle>
                  </div>
                  {composerUiState.startSessionVisible ? (
                    <Button
                      type="button"
                      disabled={isBusy || runtimeState === "completed"}
                      onClick={() =>
                        startSessionMutation.mutate({
                          projectId,
                          stepExecutionId: shell.stepExecutionId,
                        })
                      }
                      data-testid="agent-step-start-session"
                    >
                      {startSessionMutation.isPending ? (
                        <Loader2Icon className="size-3.5 animate-spin" />
                      ) : runtimeState === "disconnected_or_error" ? (
                        <RefreshCcwIcon className="size-3.5" />
                      ) : (
                        <PlayIcon className="size-3.5" />
                      )}
                      <span>{composerUiState.startSessionLabel}</span>
                    </Button>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-3 py-4">
                <PromptInput
                  className={cn(
                    "relative transition-opacity",
                    !composerUiState.enabled && "opacity-70",
                  )}
                  onSubmit={(event) => {
                    event.preventDefault();
                    const nextMessage = composerText.trim();
                    if (!composerUiState.enabled || nextMessage.length === 0) {
                      return;
                    }

                    const optimisticMessage: AgentStepTimelineItem = {
                      itemType: "message",
                      timelineItemId: `optimistic-user:${crypto.randomUUID()}`,
                      createdAt: new Date().toISOString(),
                      role: "user",
                      content: nextMessage,
                    };

                    setPendingTurnSubmit(true);
                    setLiveErrorMessage(null);
                    setComposerText("");
                    setRuntimeState("active_streaming");
                    pendingOptimisticUserTimelineIdRef.current = optimisticMessage.timelineItemId;
                    pendingOptimisticUserMessageRef.current = nextMessage;
                    setTimelineItems((previous) => upsertTimelineItem(previous, optimisticMessage));

                    sendMessageMutation.mutate({
                      projectId,
                      stepExecutionId: shell.stepExecutionId,
                      message: nextMessage,
                    });
                  }}
                  data-testid="agent-step-composer"
                >
                  <PromptInputBody className="relative">
                    <PromptInputTextarea
                      value={composerText}
                      disabled={!composerUiState.enabled || isBusy}
                      onChange={(event) => setComposerText(event.target.value)}
                      placeholder={
                        composerUiState.enabled
                          ? "Send the next runtime turn..."
                          : (composerUiState.reason ?? "Session start is required first.")
                      }
                      className={!composerUiState.enabled ? "blur-sm" : undefined}
                    />
                    {!composerUiState.enabled ? (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/45 px-4 text-center text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        {composerUiState.reason}
                      </div>
                    ) : null}
                  </PromptInputBody>
                  <PromptInputFooter>
                    <PromptInputTools>
                      <ModelSelector open={agentSelectorOpen} onOpenChange={setAgentSelectorOpen}>
                        <ModelSelectorTrigger
                          render={
                            <Button
                              variant="outline"
                              size="sm"
                              className="justify-between text-left"
                            >
                              <span className="truncate">{selectedAgentLabel}</span>
                              <ChevronsUpDownIcon className="size-3.5 opacity-70" />
                            </Button>
                          }
                        />
                        <ModelSelectorContent title="Next turn agent selector">
                          <ModelSelectorInput placeholder="Search agents..." />
                          <ModelSelectorList>
                            <ModelSelectorEmpty>No matching agents.</ModelSelectorEmpty>
                            <ModelSelectorGroup heading="Discovered agents">
                              {(harnessMetadataQuery.data?.agents ?? []).map((agent) => {
                                const checked = selectedAgent === agent.key;

                                return (
                                  <ModelSelectorItem
                                    key={agent.key}
                                    value={`${agent.key}/${agent.label}/${formatAgentDefaultModel(agent)}`}
                                    onSelect={() => {
                                      updateTurnSelectionMutation.mutate({
                                        projectId,
                                        stepExecutionId: shell.stepExecutionId,
                                        agent: agent.key,
                                      });
                                      setAgentSelectorOpen(false);
                                    }}
                                  >
                                    <div className="flex min-w-0 items-center gap-2">
                                      <ModelSelectorName className="flex-none">
                                        {agent.label}
                                      </ModelSelectorName>
                                      <span className="truncate text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                                        {formatAgentDefaultModel(agent)}
                                      </span>
                                      <span className="border border-border px-1.5 py-0.5 text-[0.6rem] uppercase tracking-[0.14em] text-muted-foreground">
                                        {agent.mode}
                                      </span>
                                      <CheckIcon
                                        className={cn(
                                          "ml-auto size-3.5",
                                          checked ? "opacity-100" : "opacity-0",
                                        )}
                                      />
                                    </div>
                                  </ModelSelectorItem>
                                );
                              })}
                            </ModelSelectorGroup>
                          </ModelSelectorList>
                        </ModelSelectorContent>
                      </ModelSelector>

                      <ModelSelector open={modelSelectorOpen} onOpenChange={setModelSelectorOpen}>
                        <ModelSelectorTrigger
                          render={
                            <Button
                              variant="outline"
                              size="sm"
                              className="justify-between text-left"
                            >
                              <span className="truncate">{selectedModelLabel}</span>
                              <ChevronsUpDownIcon className="size-3.5 opacity-70" />
                            </Button>
                          }
                        />
                        <ModelSelectorContent title="Next turn model selector">
                          <ModelSelectorInput placeholder="Search providers and models..." />
                          <ModelSelectorList>
                            <ModelSelectorEmpty>No matching models.</ModelSelectorEmpty>
                            {(harnessMetadataQuery.data?.providers ?? []).map((provider, index) => (
                              <div key={provider.provider}>
                                {index > 0 ? <ModelSelectorSeparator /> : null}
                                <ModelSelectorGroup heading={provider.label}>
                                  {provider.models.map((model) => {
                                    const checked =
                                      selectedModel?.provider === model.provider &&
                                      selectedModel?.model === model.model;

                                    return (
                                      <ModelSelectorItem
                                        key={`${model.provider}/${model.model}`}
                                        value={`${model.provider}/${model.model}/${model.label}`}
                                        onSelect={() => {
                                          updateTurnSelectionMutation.mutate({
                                            projectId,
                                            stepExecutionId: shell.stepExecutionId,
                                            model: {
                                              provider: model.provider,
                                              model: model.model,
                                            },
                                          });
                                          setModelSelectorOpen(false);
                                        }}
                                      >
                                        <div className="flex min-w-0 items-center gap-2">
                                          <ModelSelectorLogoGroup>
                                            <ModelSelectorLogo provider={model.provider} />
                                          </ModelSelectorLogoGroup>
                                          <ModelSelectorName>{model.label}</ModelSelectorName>
                                          <span className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                                            {model.provider}
                                          </span>
                                          {model.isDefault ? (
                                            <span className="border border-primary/35 bg-primary/10 px-1.5 py-0.5 text-[0.6rem] uppercase tracking-[0.14em] text-primary">
                                              default
                                            </span>
                                          ) : null}
                                          <CheckIcon
                                            className={cn(
                                              "ml-auto size-3.5",
                                              checked ? "opacity-100" : "opacity-0",
                                            )}
                                          />
                                        </div>
                                      </ModelSelectorItem>
                                    );
                                  })}
                                </ModelSelectorGroup>
                              </div>
                            ))}
                          </ModelSelectorList>
                        </ModelSelectorContent>
                      </ModelSelector>
                      <ExecutionBadge label="next turn only" tone="amber" />
                    </PromptInputTools>
                    <PromptInputSubmit
                      type="submit"
                      status={promptSubmitStatus}
                      disabled={
                        !composerUiState.enabled || composerText.trim().length === 0 || isBusy
                      }
                    >
                      {runtimeState === "disconnected_or_error" ? "Retry" : "Send"}
                    </PromptInputSubmit>
                  </PromptInputFooter>
                </PromptInput>

                <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                  <p>
                    {runtimeState === "not_started"
                      ? "Choose a provider/model now to influence the first session turn."
                      : "Provider/model changes are persisted for the next turn only and do not interrupt the current live session."}
                  </p>
                  <div className="grid gap-1">
                    <div className="flex items-center gap-2">
                      <BotIcon className="size-3.5" />
                      <span>{selectedAgentLabel}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-block size-3.5 text-center text-muted-foreground">
                        ◌
                      </span>
                      <span>{selectedModelLabel}</span>
                    </div>
                  </div>
                </div>

                {pendingTurnSubmit && !liveErrorMessage && !sendMessageMutation.error ? (
                  <div className="flex items-start gap-2 border border-sky-300/40 bg-sky-500/10 px-3 py-2 text-sm text-sky-100">
                    <RadioIcon className="mt-0.5 size-4 shrink-0 animate-pulse" />
                    <span>Turn submitted. Waiting for stream updates…</span>
                  </div>
                ) : null}

                {liveErrorMessage || startSessionMutation.error || sendMessageMutation.error ? (
                  <div className="flex items-start gap-2 border border-destructive/60 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
                    <span>
                      {liveErrorMessage ??
                        toErrorMessage(startSessionMutation.error ?? sendMessageMutation.error)}
                    </span>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </CardContent>
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

  const agentDetailQuery = useQuery({
    ...orpc.project.getAgentStepExecutionDetail.queryOptions({
      input: {
        projectId,
        stepExecutionId,
      },
    }),
    queryKey: runtimeAgentStepExecutionDetailQueryKey(projectId, stepExecutionId),
    enabled: stepDetailQuery.data?.shell.stepType === "agent",
  });

  const detail = stepDetailQuery.data;
  const isAgentStep = detail?.shell.stepType === "agent";
  const isLoading =
    stepDetailQuery.isLoading ||
    (isAgentStep && agentDetailQuery.isLoading && !agentDetailQuery.data);
  const combinedError = stepDetailQuery.error ?? (isAgentStep ? agentDetailQuery.error : null);
  const hasError = Boolean(combinedError);

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
              {toErrorMessage(combinedError)}
            </p>
          </CardContent>
        </Card>
      ) : detail ? (
        detail.body.stepType === "form" ? (
          <FormInteractionSurface
            projectId={projectId}
            detail={detail as typeof detail & { body: FormBody }}
          />
        ) : detail.shell.stepType === "agent" ? (
          agentDetailQuery.data ? (
            <AgentInteractionSurface
              projectId={projectId}
              shell={detail.shell}
              detail={agentDetailQuery.data}
            />
          ) : (
            <Card frame="cut-heavy" tone="runtime" corner="white">
              <CardHeader>
                <CardTitle>Loading Agent step runtime…</CardTitle>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full rounded-none" />
              </CardContent>
            </Card>
          )
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
