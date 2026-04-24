import type {
  AgentStepRuntimeState,
  AgentStepTimelineCursor,
  AgentStepTimelineItem,
  AgentStepRuntimeWriteItem,
  GetAgentStepExecutionDetailOutput,
} from "@chiron/contracts/agent-step/runtime";
import type { WorkflowContextFactKind } from "@chiron/contracts/methodology/workflow";
import type {
  RuntimeConditionTree,
  RuntimeConditionEvaluation,
  RuntimeConditionEvaluationTree,
} from "@chiron/contracts/runtime/conditions";
import type {
  GetRuntimeStepExecutionDetailOutput,
  RuntimeActionAffectedTarget,
  RuntimeInvokeWorkUnitTargetRow,
  RuntimeFormNestedField,
  RuntimeFormResolvedField,
  RuntimeInvokeWorkflowTargetRow,
  RuntimeWorkflowContextFactGroup,
} from "@chiron/contracts/runtime/executions";
import type { AgentStepSseEnvelope } from "@chiron/contracts/sse/envelope";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Result } from "better-result";
import {
  BotIcon,
  CheckIcon,
  ChevronRight,
  UserIcon,
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
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  AiReasoning,
  AiReasoningContent,
  AiReasoningText,
  AiReasoningTrigger,
} from "@/components/elements/ai-reasoning";
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
import { Button, buttonVariants } from "@/components/ui/button";
import { showSingletonAutoAttachWarnings as showSingletonAutoAttachWarningToasts } from "@/features/projects/singleton-auto-attach-warning-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
import {
  STEP_TYPE_ICON_CODES,
  type WorkflowHarnessDiscoveryMetadata,
} from "@/features/workflow-editor/types";
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
import { RouteErrorCard } from "@/components/route-error-card";
import { resolveRuntimeBackendUrl } from "@/lib/runtime-backend";
import { useSSE } from "@/lib/use-sse";
import { cn } from "@/lib/utils";

export const runtimeStepExecutionDetailQueryKey = (projectId: string, stepExecutionId: string) =>
  ["runtime-step-execution-detail", projectId, stepExecutionId] as const;

export const runtimeAgentStepExecutionDetailQueryKey = (
  projectId: string,
  stepExecutionId: string,
) => ["runtime-agent-step-execution-detail", projectId, stepExecutionId] as const;

export const agentStepTimelineQueryKey = (
  projectId: string,
  stepExecutionId: string,
  cursor?: AgentStepTimelineCursor,
) =>
  [
    "runtime-agent-step-timeline",
    projectId,
    stepExecutionId,
    cursor?.before ?? null,
    cursor?.after ?? null,
  ] as const;

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
type ActionBody = Extract<GetRuntimeStepExecutionDetailOutput["body"], { stepType: "action" }>;
type BranchBody = Extract<GetRuntimeStepExecutionDetailOutput["body"], { stepType: "branch" }>;
type InvokeBody = Extract<GetRuntimeStepExecutionDetailOutput["body"], { stepType: "invoke" }>;
type AgentBody = GetAgentStepExecutionDetailOutput["body"];
type StepBody = GetRuntimeStepExecutionDetailOutput["body"];
type StepNextStep = NonNullable<StepBody["nextStep"]>;
type TimelineThinkingItem = Extract<AgentStepTimelineItem, { itemType: "thinking" }>;
type TimelineToolItem = Extract<AgentStepTimelineItem, { itemType: "tool_activity" }>;

type ToolCallTimelineEntry = {
  readonly entryType: "tool-call";
  readonly timelineItemId: string;
  readonly toolKind: TimelineToolItem["toolKind"];
  readonly toolName: string;
  readonly state: ToolCallState;
  readonly createdAt: string;
  readonly summary?: string;
  readonly input?: unknown;
  readonly output?: string;
  readonly error?: string;
};

type TimelineDisplayEntry =
  | {
      readonly entryType: "message";
      readonly item: Extract<AgentStepTimelineItem, { itemType: "message" }>;
    }
  | {
      readonly entryType: "thinking";
      readonly item: TimelineThinkingItem;
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

function formatInvokeStatusLabel(status: RuntimeInvokeWorkflowTargetRow["status"]): string {
  switch (status) {
    case "not_started":
      return "Not started";
    case "blocked":
      return "Blocked";
    case "active":
      return "Active";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    case "unavailable":
      return "Unavailable";
  }
}

function getInvokeStatusTone(status: RuntimeInvokeWorkflowTargetRow["status"]) {
  switch (status) {
    case "active":
      return "emerald" as const;
    case "completed":
      return "sky" as const;
    case "blocked":
    case "failed":
      return "rose" as const;
    case "unavailable":
      return "slate" as const;
    case "not_started":
    default:
      return "amber" as const;
  }
}

function formatInvokeTargetKindLabel(targetKind: InvokeBody["targetKind"]): string {
  return targetKind === "work_unit" ? "Work unit" : "Workflow";
}

function formatInvokeSourceModeLabel(sourceMode: InvokeBody["sourceMode"]): string {
  return sourceMode === "fact_backed" ? "Fact backed" : "Fixed";
}

function formatInvokeCompletionRuleLabel(targetKind: InvokeBody["targetKind"]): string {
  return targetKind === "workflow"
    ? "At least one invoked workflow must complete before the parent step can complete."
    : "At least one invoked work-unit transition must complete before the parent step can complete.";
}

function formatInvokeProgressLabel(completedTargets: number, totalTargets: number): string {
  return `${completedTargets} of ${totalTargets} target${totalTargets === 1 ? "" : "s"} completed`;
}

function getInitialPrimaryWorkflowSelection(row: RuntimeInvokeWorkUnitTargetRow): string {
  return row.workflowDefinitionId ?? row.availablePrimaryWorkflows[0]?.workflowDefinitionId ?? "";
}

function formatBranchSuggestionSourceLabel(source: BranchBody["suggestion"]["source"]): string {
  switch (source) {
    case "conditional_route":
      return "Valid route";
    case "default_target":
      return "Default target";
    case "none":
    default:
      return "No suggestion";
  }
}

function getBranchAvailableTargetStepIds(body: BranchBody): readonly string[] {
  const validConditionalTargets = [
    ...new Set(
      body.conditionalRoutes.filter((route) => route.isValid).map((route) => route.targetStepId),
    ),
  ];

  if (validConditionalTargets.length > 0) {
    return validConditionalTargets;
  }

  return body.defaultTargetStepId ? [body.defaultTargetStepId] : [];
}

function formatBranchAvailabilitySummary(body: BranchBody): string {
  const validRouteCount = body.conditionalRoutes.filter((route) => route.isValid).length;

  if (validRouteCount === 0) {
    return body.defaultTargetStepId
      ? "No valid routes matched. A default target is available to save explicitly."
      : "No valid routes matched and no default target is available.";
  }

  return `${validRouteCount} valid route${validRouteCount === 1 ? "" : "s"} available.`;
}

type InvokeWorkUnitBindingPreview = RuntimeInvokeWorkUnitTargetRow["bindingPreview"][number];

type RepoFilePickerEntry = {
  relativePath: string;
  status: "committed" | "not_committed" | "missing" | "not_a_repo" | "git_not_installed";
  tracked?: boolean;
  untracked?: boolean;
  staged?: boolean;
  modified?: boolean;
  deleted?: boolean;
  gitCommitHash?: string | null;
  gitBlobHash?: string | null;
  gitCommitSubject?: string | null;
  gitCommitBody?: string | null;
  message?: string;
};

const isWorkUnitBinding = (binding: InvokeWorkUnitBindingPreview): boolean =>
  binding.destinationFactType === "work_unit" || typeof binding.editorWorkUnitTypeKey === "string";

const isArtifactBinding = (binding: InvokeWorkUnitBindingPreview): boolean =>
  binding.destinationKind === "artifact_slot";

function parseArtifactFilesetPaths(rawValue: string): string[] {
  return rawValue
    .split("\n")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function hasArtifactRelativePath(value: unknown): value is { relativePath: string } {
  return (
    isPlainRecord(value) && typeof value.relativePath === "string" && value.relativePath.length > 0
  );
}

function extractArtifactRelativePathsFromValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => extractArtifactRelativePathsFromValue(entry));
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return [];
    }

    const decoded = decodeOptionValue(trimmed);
    if (decoded !== value) {
      return extractArtifactRelativePathsFromValue(decoded);
    }

    return [trimmed];
  }

  if (hasArtifactRelativePath(value)) {
    return [value.relativePath];
  }

  if (isPlainRecord(value) && Array.isArray(value.files)) {
    return value.files.flatMap((entry) => extractArtifactRelativePathsFromValue(entry));
  }

  return [];
}

function normalizeFileSystemPath(value: string): string {
  return value.replaceAll("\\", "/").replace(/\/+$/g, "");
}

function toAbsoluteProjectPath(projectRootPath: string | undefined, relativePath: string): string {
  const normalizedRelativePath = relativePath.replace(/^\/+/, "");
  if (!projectRootPath) {
    return normalizedRelativePath;
  }

  return `${normalizeFileSystemPath(projectRootPath)}/${normalizedRelativePath}`;
}

function toProjectRelativePath(projectRootPath: string, selectedPath: string): string | null {
  const normalizedRoot = normalizeFileSystemPath(projectRootPath).toLowerCase();
  const normalizedSelected = normalizeFileSystemPath(selectedPath);
  const normalizedSelectedLower = normalizedSelected.toLowerCase();

  if (
    normalizedSelectedLower === normalizedRoot ||
    !normalizedSelectedLower.startsWith(`${normalizedRoot}/`)
  ) {
    return null;
  }

  return normalizedSelected.slice(normalizedRoot.length + 1);
}

function parseSelectedArtifactPaths(rawValue: string, cardinality: "one" | "many"): string[] {
  if (cardinality === "many") {
    return parseArtifactFilesetPaths(rawValue);
  }

  return extractArtifactRelativePathsFromValue(rawValue);
}

function serializeInvokeBindingDraftValue(
  binding: InvokeWorkUnitBindingPreview,
  value: unknown,
): string {
  if (value === undefined || value === null) {
    return "";
  }

  if (binding.destinationKind !== "work_unit_fact") {
    if (!isArtifactBinding(binding)) {
      return "";
    }

    if (binding.destinationCardinality === "many") {
      if (Array.isArray(value)) {
        return value
          .flatMap((entry) => {
            if (typeof entry === "string") {
              return [entry];
            }

            if (
              typeof entry === "object" &&
              entry !== null &&
              "relativePath" in entry &&
              typeof entry.relativePath === "string"
            ) {
              return [entry.relativePath];
            }

            return [];
          })
          .join("\n");
      }

      if (
        typeof value === "object" &&
        value !== null &&
        "relativePath" in value &&
        typeof value.relativePath === "string"
      ) {
        return value.relativePath;
      }

      return typeof value === "string" ? value : "";
    }

    return encodeOptionValue(value);
  }

  if (isWorkUnitBinding(binding)) {
    return encodeOptionValue(value);
  }

  if (binding.editorOptions?.length) {
    return encodeOptionValue(value);
  }

  if (binding.destinationFactType === "boolean") {
    return value === true ? "true" : value === false ? "false" : "";
  }

  if (binding.destinationFactType === "number") {
    return typeof value === "number" ? String(value) : "";
  }

  if (binding.destinationFactType === "json" || binding.destinationCardinality === "many") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return "";
    }
  }

  return typeof value === "string" ? value : formatUnknown(value);
}

function createRuntimeBindingDraftState(
  rows: readonly RuntimeInvokeWorkUnitTargetRow[],
): Record<string, Record<string, string>> {
  return Object.fromEntries(
    rows.map((row) => {
      const initialValues = Object.fromEntries(
        row.bindingPreview
          .filter(
            (binding) =>
              binding.destinationKind === "work_unit_fact" ||
              binding.destinationKind === "artifact_slot",
          )
          .map((binding) => [
            binding.destinationDefinitionId,
            serializeInvokeBindingDraftValue(
              binding,
              binding.savedDraftValueJson ?? binding.resolvedValueJson,
            ),
          ]),
      );

      return [row.invokeWorkUnitTargetExecutionId, initialValues];
    }),
  );
}

function updateRuntimeBindingDraftState(params: {
  current: Record<string, Record<string, string>>;
  rowId: string;
  destinationDefinitionId: string;
  value: string;
}): Record<string, Record<string, string>> {
  return {
    ...params.current,
    [params.rowId]: {
      ...params.current[params.rowId],
      [params.destinationDefinitionId]: params.value,
    },
  };
}

function getInvokeAuthoredPrefillValue(binding: InvokeWorkUnitBindingPreview): unknown {
  if (typeof binding.authoredPrefillValueJson !== "undefined") {
    return binding.authoredPrefillValueJson;
  }

  if (
    binding.sourceKind !== "runtime" &&
    typeof binding.savedDraftValueJson === "undefined" &&
    typeof binding.resolvedValueJson !== "undefined"
  ) {
    return binding.resolvedValueJson;
  }

  return undefined;
}

function getInvokeSavedDraftValue(binding: InvokeWorkUnitBindingPreview): unknown {
  return binding.savedDraftValueJson;
}

function getInvokeSourceRefillLabel(binding: InvokeWorkUnitBindingPreview): string {
  switch (binding.sourceKind) {
    case "context_fact":
      return "Refill from context fact";
    case "literal":
      return "Refill from literal";
    case "runtime":
    default:
      return "Refill value";
  }
}

function getInvokeSourceRefillAriaLabel(binding: InvokeWorkUnitBindingPreview): string {
  return `${getInvokeSourceRefillLabel(binding)} for ${binding.destinationLabel}`;
}

function formatInvokeBindingSourceValue(binding: InvokeWorkUnitBindingPreview): string {
  if (binding.sourceKind === "runtime") {
    return "Provided at runtime";
  }

  if (binding.sourceKind === "literal") {
    return `Literal: ${formatUnknown(getInvokeAuthoredPrefillValue(binding))}`;
  }

  return binding.sourceContextFactKey
    ? `Context fact: ${binding.sourceContextFactKey}`
    : "Context fact";
}

function formatInvokeSourceMetadata(params: {
  kind?: string;
  cardinality?: string;
  valueType?: string;
}): string | null {
  const parts = [params.kind, params.cardinality, params.valueType].filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
  return parts.length > 0 ? parts.join(" · ") : null;
}

function formatInvokeTransitionPath(row: RuntimeInvokeWorkUnitTargetRow): string {
  const fromLabel = row.transitionFromStateLabel ?? "Activation";
  const toLabel = row.transitionToStateLabel ?? row.transitionLabel;
  return `${fromLabel} → ${toLabel}`;
}

function formatInvokeDestinationMetadata(binding: InvokeWorkUnitBindingPreview): string {
  if (binding.destinationKind === "artifact_slot") {
    return `artifact slot${binding.destinationCardinality ? ` · ${binding.destinationCardinality}` : ""}`;
  }

  return ["work unit fact", binding.destinationFactType, binding.destinationCardinality]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" · ");
}

function getInvokeSourceTone(
  sourceKind: InvokeWorkUnitBindingPreview["sourceKind"],
): Parameters<typeof ExecutionBadge>[0]["tone"] {
  switch (sourceKind) {
    case "literal":
      return "violet";
    case "context_fact":
      return "sky";
    case "runtime":
    default:
      return "amber";
  }
}

function getInvokeDestinationTone(
  binding: InvokeWorkUnitBindingPreview,
): Parameters<typeof ExecutionBadge>[0]["tone"] {
  if (binding.destinationKind === "artifact_slot") {
    return "amber";
  }

  if (binding.destinationFactType === "work_unit") {
    return "lime";
  }

  if (binding.destinationFactType === "json" || binding.destinationCardinality === "many") {
    return "rose";
  }

  return "slate";
}

function getInvokeBindingContainerTone(binding: InvokeWorkUnitBindingPreview): string {
  if (binding.requiresRuntimeValue) {
    return "border-amber-500/30 bg-amber-500/5";
  }

  if (binding.sourceKind === "literal") {
    return "border-violet-500/30 bg-violet-500/5";
  }

  if (binding.sourceKind === "context_fact") {
    return "border-sky-500/30 bg-sky-500/5";
  }

  return "border-border/70 bg-background/60";
}

function getEncodedOptionLabel(
  options: ReadonlyArray<{ value: unknown; label: string }>,
  encodedValue: string,
): string | null {
  const matched = options.find((option) => encodeOptionValue(option.value) === encodedValue);
  return matched?.label ?? null;
}

function getArtifactInputDisplayLabel(
  rawValue: string,
  cardinality: "one" | "many" | undefined,
): string | null {
  if (!cardinality) {
    return null;
  }

  const relativePaths = parseSelectedArtifactPaths(rawValue, cardinality);
  if (relativePaths.length === 0) {
    return null;
  }

  return cardinality === "many"
    ? relativePaths.length === 1
      ? (relativePaths[0] ?? null)
      : `${relativePaths.length} files selected`
    : (relativePaths[0] ?? null);
}

function formatPrimaryWorkflowOption(
  option: RuntimeInvokeWorkUnitTargetRow["availablePrimaryWorkflows"][number],
): string {
  return option.workflowDefinitionKey
    ? `${option.workflowDefinitionName} · ${option.workflowDefinitionKey}`
    : option.workflowDefinitionName;
}

function getSelectedPrimaryWorkflowLabel(
  row: RuntimeInvokeWorkUnitTargetRow,
  workflowDefinitionId: string,
): string | null {
  const matched = row.availablePrimaryWorkflows.find(
    (option) => option.workflowDefinitionId === workflowDefinitionId,
  );
  return matched ? formatPrimaryWorkflowOption(matched) : null;
}

function getRepoFileStatusTone(
  entry: RepoFilePickerEntry,
): Parameters<typeof ExecutionBadge>[0]["tone"] {
  switch (entry.status) {
    case "committed":
      return "emerald";
    case "not_committed":
      return entry.untracked ? "amber" : entry.modified || entry.staged ? "violet" : "amber";
    case "missing":
      return "rose";
    case "not_a_repo":
    case "git_not_installed":
    default:
      return "slate";
  }
}

function formatRepoFileStatus(entry: RepoFilePickerEntry): string {
  if (entry.status === "committed") {
    return "committed";
  }
  if (entry.status === "missing") {
    return "missing";
  }
  if (entry.status === "not_a_repo") {
    return "not a repo";
  }
  if (entry.status === "git_not_installed") {
    return "git unavailable";
  }

  return [
    entry.untracked ? "untracked" : null,
    entry.staged ? "staged" : null,
    entry.modified ? "modified" : null,
    entry.deleted ? "deleted" : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" · ");
}

function formatRepoFileMeta(entry: RepoFilePickerEntry): string | null {
  if (entry.status === "committed") {
    return entry.gitCommitSubject ?? entry.gitCommitHash ?? null;
  }
  if (entry.status === "not_a_repo" || entry.status === "git_not_installed") {
    return entry.message ?? null;
  }
  return null;
}

function parseRuntimeBindingInputValue(params: {
  binding: InvokeWorkUnitBindingPreview;
  rawValue: string;
}): { ok: true; valueJson: unknown } | { ok: false; message: string } {
  const { binding, rawValue } = params;

  if (binding.destinationKind !== "work_unit_fact") {
    if (isArtifactBinding(binding)) {
      if (rawValue.trim().length === 0) {
        return {
          ok: false,
          message: `Select an artifact source for '${binding.destinationLabel}'.`,
        };
      }

      if (binding.destinationCardinality === "many") {
        const relativePaths = rawValue
          .split("\n")
          .map((entry) => entry.trim())
          .filter((entry) => entry.length > 0);
        if (relativePaths.length === 0) {
          return {
            ok: false,
            message: `Provide one or more artifact paths for '${binding.destinationLabel}'.`,
          };
        }

        return {
          ok: true,
          valueJson: {
            files: relativePaths.map((relativePath) => ({ relativePath })),
          },
        };
      }

      const trimmedRawValue = rawValue.trim();
      const decoded = decodeOptionValue(rawValue);
      if (typeof decoded === "string") {
        return {
          ok: true,
          valueJson: {
            relativePath: trimmedRawValue,
          },
        };
      }
      if (
        typeof decoded !== "object" ||
        decoded === null ||
        !("relativePath" in decoded) ||
        typeof decoded.relativePath !== "string" ||
        decoded.relativePath.trim().length === 0
      ) {
        return {
          ok: false,
          message: `Artifact source for '${binding.destinationLabel}' must provide a relativePath string.`,
        };
      }

      return { ok: true, valueJson: decoded };
    }

    return {
      ok: false,
      message: `Runtime input is not supported for destination '${binding.destinationLabel}'.`,
    };
  }

  const isMany = binding.destinationCardinality === "many";
  const destinationType = binding.destinationFactType;

  if (isWorkUnitBinding(binding)) {
    if (rawValue.trim().length === 0) {
      return {
        ok: false,
        message: `Select a work unit for '${binding.destinationLabel}'.`,
      };
    }

    return { ok: true, valueJson: decodeOptionValue(rawValue) };
  }

  if (binding.editorOptions?.length) {
    if (rawValue.trim().length === 0) {
      return {
        ok: false,
        message: `Select a value for '${binding.destinationLabel}'.`,
      };
    }

    return { ok: true, valueJson: decodeOptionValue(rawValue) };
  }

  if (isMany || destinationType === "json") {
    if (rawValue.trim().length === 0) {
      return {
        ok: false,
        message: `Enter a JSON ${isMany ? "array" : "value"} for '${binding.destinationLabel}'.`,
      };
    }

    const parsed = Result.try({
      try: () => JSON.parse(rawValue),
      catch: () => undefined,
    });
    if (parsed.isErr() || parsed.value === undefined) {
      return {
        ok: false,
        message: `Invalid JSON for '${binding.destinationLabel}'.`,
      };
    }

    if (isMany && !Array.isArray(parsed.value)) {
      return {
        ok: false,
        message: `Runtime value for '${binding.destinationLabel}' must be a JSON array.`,
      };
    }

    return { ok: true, valueJson: parsed.value };
  }

  if (destinationType === "number") {
    if (rawValue.trim().length === 0) {
      return {
        ok: false,
        message: `Runtime value for '${binding.destinationLabel}' must be a number.`,
      };
    }

    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) {
      return {
        ok: false,
        message: `Runtime value for '${binding.destinationLabel}' must be a number.`,
      };
    }

    return { ok: true, valueJson: parsed };
  }

  if (destinationType === "boolean") {
    if (rawValue !== "true" && rawValue !== "false") {
      return {
        ok: false,
        message: `Runtime value for '${binding.destinationLabel}' must be true or false.`,
      };
    }

    return { ok: true, valueJson: rawValue === "true" };
  }

  return { ok: true, valueJson: rawValue };
}

function buildInvokeWorkUnitRuntimePayload(params: {
  rowRuntimeInputs: Record<string, string>;
  editableBindings: InvokeWorkUnitBindingPreview[];
}):
  | {
      ok: true;
      runtimeFactValues?: Array<{ workUnitFactDefinitionId: string; valueJson: unknown }>;
      runtimeArtifactValues?: Array<{
        artifactSlotDefinitionId: string;
        relativePath?: string;
        sourceContextFactDefinitionId?: string;
        clear?: boolean;
        files?: Array<{
          relativePath?: string;
          sourceContextFactDefinitionId?: string;
          clear?: boolean;
        }>;
      }>;
    }
  | { ok: false; message: string } {
  const runtimeFactValues: Array<{ workUnitFactDefinitionId: string; valueJson: unknown }> = [];
  const runtimeArtifactValues: Array<{
    artifactSlotDefinitionId: string;
    relativePath?: string;
    sourceContextFactDefinitionId?: string;
    clear?: boolean;
    files?: Array<{
      relativePath?: string;
      sourceContextFactDefinitionId?: string;
      clear?: boolean;
    }>;
  }> = [];

  for (const binding of params.editableBindings) {
    const rawValue = params.rowRuntimeInputs[binding.destinationDefinitionId] ?? "";
    if (rawValue.trim().length === 0) {
      if (binding.destinationKind === "work_unit_fact") {
        runtimeFactValues.push({
          workUnitFactDefinitionId: binding.destinationDefinitionId,
          valueJson: null,
        });
      } else {
        runtimeArtifactValues.push({
          artifactSlotDefinitionId: binding.destinationDefinitionId,
          clear: true,
        });
      }
      continue;
    }

    const parsed = parseRuntimeBindingInputValue({ binding, rawValue });
    if (!parsed.ok) {
      return parsed;
    }

    if (binding.destinationKind === "work_unit_fact") {
      runtimeFactValues.push({
        workUnitFactDefinitionId: binding.destinationDefinitionId,
        valueJson: parsed.valueJson,
      });
    } else {
      if (
        typeof parsed.valueJson === "object" &&
        parsed.valueJson !== null &&
        "files" in parsed.valueJson &&
        Array.isArray(parsed.valueJson.files)
      ) {
        runtimeArtifactValues.push({
          artifactSlotDefinitionId: binding.destinationDefinitionId,
          files: parsed.valueJson.files,
        });
      } else if (
        typeof parsed.valueJson === "object" &&
        parsed.valueJson !== null &&
        "relativePath" in parsed.valueJson &&
        typeof parsed.valueJson.relativePath === "string"
      ) {
        runtimeArtifactValues.push({
          artifactSlotDefinitionId: binding.destinationDefinitionId,
          relativePath: parsed.valueJson.relativePath,
          ...("sourceContextFactDefinitionId" in parsed.valueJson &&
          typeof parsed.valueJson.sourceContextFactDefinitionId === "string"
            ? { sourceContextFactDefinitionId: parsed.valueJson.sourceContextFactDefinitionId }
            : {}),
        });
      }
    }
  }

  return {
    ok: true,
    ...(runtimeFactValues.length > 0 ? { runtimeFactValues } : {}),
    ...(runtimeArtifactValues.length > 0 ? { runtimeArtifactValues } : {}),
  };
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

function unwrapComparisonValue(value: unknown): unknown {
  if (value && typeof value === "object" && !Array.isArray(value) && "value" in value) {
    return (value as { value: unknown }).value;
  }

  return value;
}

function getBranchConditionSummary(evaluation: RuntimeConditionEvaluation): string {
  const condition = evaluation.condition;

  if (condition.kind === "artifact") {
    const expression = `artifact:${condition.slotKey} ${condition.operator}`;
    return condition.isNegated ? `NOT ${expression}` : expression;
  }

  const target = condition.subFieldKey
    ? `${condition.factKey}.${condition.subFieldKey}`
    : condition.factKey;
  const operator =
    condition.operator === "equals"
      ? `equals ${formatUnknown(unwrapComparisonValue(condition.comparisonJson))}`
      : "exists";
  const expression = `${target} ${operator}`;

  return condition.isNegated ? `NOT ${expression}` : expression;
}

function getBranchConditionTargetLabel(evaluation: RuntimeConditionEvaluation): string {
  const condition = evaluation.condition;

  if (condition.kind === "artifact") {
    return `artifact:${condition.slotKey}`;
  }

  return condition.subFieldKey
    ? `${condition.factKey}.${condition.subFieldKey}`
    : condition.factKey;
}

function getBranchConditionOperatorLabel(evaluation: RuntimeConditionEvaluation): string {
  return evaluation.condition.isNegated
    ? `NOT ${evaluation.condition.operator}`
    : evaluation.condition.operator;
}

function getBranchConditionExpectedValue(evaluation: RuntimeConditionEvaluation): unknown {
  if (typeof evaluation.expectedValueJson !== "undefined") {
    return evaluation.expectedValueJson;
  }

  if (evaluation.condition.kind === "artifact") {
    return evaluation.condition.operator === "exists" ? "present" : undefined;
  }

  return evaluation.condition.operator === "equals"
    ? unwrapComparisonValue(evaluation.condition.comparisonJson)
    : evaluation.condition.operator === "exists"
      ? "present"
      : undefined;
}

function BranchConditionValueCard({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="space-y-1 border border-border/70 bg-background/40 p-2">
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="break-all font-mono text-xs text-foreground/90">{formatUnknown(value)}</p>
    </div>
  );
}

function countBranchEvaluations(tree: RuntimeConditionEvaluationTree): {
  met: number;
  total: number;
} {
  const conditionCounts = tree.conditions.reduce(
    (
      totals: { met: number; total: number },
      condition: RuntimeConditionEvaluationTree["conditions"][number],
    ) => ({
      met: totals.met + (condition.met ? 1 : 0),
      total: totals.total + 1,
    }),
    { met: 0, total: 0 },
  );

  return tree.groups.reduce(
    (totals: { met: number; total: number }, group: RuntimeConditionEvaluationTree) => {
      const nested = countBranchEvaluations(group);
      return {
        met: totals.met + nested.met,
        total: totals.total + nested.total,
      };
    },
    conditionCounts,
  );
}

function BranchConditionEvaluationTreePanel({
  tree,
  depth = 0,
}: {
  tree: RuntimeConditionEvaluationTree;
  depth?: number;
}) {
  const counts = countBranchEvaluations(tree);

  return (
    <div className={cn("space-y-2", depth > 0 ? "border-l border-border/60 pl-3" : undefined)}>
      <div className="space-y-2 border border-border/70 bg-background/30 p-2">
        <div className="flex flex-wrap gap-2">
          <ExecutionBadge label={`${tree.mode.toUpperCase()} group`} tone="slate" />
          <ExecutionBadge
            label={tree.met ? "Satisfied" : "Blocked"}
            tone={tree.met ? "emerald" : "rose"}
          />
          <ExecutionBadge label={`${counts.met}/${counts.total} matched`} tone="violet" />
        </div>
        {tree.reason ? <p className="text-xs text-muted-foreground">{tree.reason}</p> : null}
      </div>

      {tree.conditions.length > 0 ? (
        <div className="space-y-2">
          {tree.conditions.map(
            (evaluation: RuntimeConditionEvaluationTree["conditions"][number], index: number) => (
              <div
                key={`${getBranchConditionSummary(evaluation)}-${index}`}
                className={cn(
                  "space-y-1 border bg-background/30 p-2",
                  evaluation.met ? "border-emerald-500/30" : "border-rose-500/30",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <ExecutionBadge
                    label={evaluation.met ? "Matched" : "Failed"}
                    tone={evaluation.met ? "emerald" : "rose"}
                  />
                  <ExecutionBadge label={evaluation.condition.kind} tone="slate" />
                </div>
                <div className="space-y-2">
                  <p className="break-all font-mono text-[11px] text-foreground/85">
                    {getBranchConditionSummary(evaluation)}
                  </p>
                  <div className="grid gap-2 md:grid-cols-5">
                    <BranchConditionValueCard
                      label="Target"
                      value={getBranchConditionTargetLabel(evaluation)}
                    />
                    <BranchConditionValueCard
                      label="Operator"
                      value={getBranchConditionOperatorLabel(evaluation)}
                    />
                    <BranchConditionValueCard
                      label="Expected"
                      value={getBranchConditionExpectedValue(evaluation)}
                    />
                    <BranchConditionValueCard label="Current" value={evaluation.currentValueJson} />
                    <BranchConditionValueCard
                      label="Result"
                      value={evaluation.met ? "matched" : "failed"}
                    />
                  </div>
                </div>
                {!evaluation.met && evaluation.reason ? (
                  <p className="text-xs text-muted-foreground">{evaluation.reason}</p>
                ) : null}
              </div>
            ),
          )}
        </div>
      ) : null}

      {tree.groups.length > 0 ? (
        <div className="space-y-2">
          {tree.groups.map((group: RuntimeConditionEvaluationTree, index: number) => (
            <BranchConditionEvaluationTreePanel
              key={`${group.mode}-${index}`}
              tree={group}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function isRuntimeConditionTree(value: unknown): value is RuntimeConditionTree {
  return (
    value !== null &&
    typeof value === "object" &&
    "mode" in value &&
    ((value as { mode?: unknown }).mode === "all" ||
      (value as { mode?: unknown }).mode === "any") &&
    "conditions" in value &&
    Array.isArray((value as { conditions?: unknown }).conditions) &&
    "groups" in value &&
    Array.isArray((value as { groups?: unknown }).groups)
  );
}

function getInvokeConditionTreeCounts(tree: RuntimeConditionTree): {
  conditions: number;
  groups: number;
} {
  return tree.groups.reduce(
    (counts, group) => {
      const nested = getInvokeConditionTreeCounts(group);
      return {
        conditions: counts.conditions + nested.conditions,
        groups: counts.groups + 1 + nested.groups,
      };
    },
    { conditions: tree.conditions.length, groups: 0 },
  );
}

function describeInvokeRuntimeCondition(condition: RuntimeConditionTree["conditions"][number]): {
  kindLabel: string;
  operatorLabel: string;
  summary: string;
  detail: string;
} {
  const negationPrefix = condition.isNegated ? "not " : "";

  switch (condition.kind) {
    case "fact": {
      const path = condition.subFieldKey
        ? `${condition.factKey}.${condition.subFieldKey}`
        : condition.factKey;
      return {
        kindLabel: "Project fact",
        operatorLabel: condition.operator === "equals" ? "equals" : `${negationPrefix}exists`,
        summary:
          condition.operator === "equals"
            ? `${path} ${negationPrefix}equals ${formatUnknown(unwrapComparisonValue(condition.comparisonJson))}`
            : `${path} must ${negationPrefix}exist`,
        detail:
          condition.operator === "equals"
            ? "Checks a project fact value against the required comparison value."
            : "Checks whether the required project fact instance exists before launch.",
      };
    }
    case "work_unit_fact": {
      const path = condition.subFieldKey
        ? `${condition.factKey}.${condition.subFieldKey}`
        : condition.factKey;
      return {
        kindLabel: "Work-unit fact",
        operatorLabel: condition.operator === "equals" ? "equals" : `${negationPrefix}exists`,
        summary:
          condition.operator === "equals"
            ? `${path} ${negationPrefix}equals ${formatUnknown(unwrapComparisonValue(condition.comparisonJson))}`
            : `${path} must ${negationPrefix}exist`,
        detail:
          condition.operator === "equals"
            ? "Checks a work-unit fact value against the required comparison value."
            : "Checks whether the required work-unit fact instance exists before launch.",
      };
    }
    case "artifact":
      return {
        kindLabel: "Artifact",
        operatorLabel: `${negationPrefix}${condition.operator}`,
        summary: `Artifact slot ${condition.slotKey} must be ${negationPrefix}${condition.operator}`,
        detail: "Checks artifact presence or freshness requirements before launch.",
      };
  }
}

function InvokeStartGateTreePanel({
  tree,
  evaluation,
  depth = 0,
}: {
  tree: RuntimeConditionTree;
  evaluation?: RuntimeConditionEvaluationTree;
  depth?: number;
}) {
  const counts = getInvokeConditionTreeCounts(tree);

  return (
    <div className={cn("space-y-3", depth > 0 ? "border-l border-border/60 pl-4" : undefined)}>
      <div className="space-y-2 border border-border/70 bg-background/40 p-3">
        <div className="flex flex-wrap gap-2">
          <ExecutionBadge
            label={`${tree.mode} gate`}
            tone={tree.mode === "all" ? "amber" : "sky"}
          />
          <ExecutionBadge label={`${counts.conditions} checks`} tone="slate" />
          {counts.groups > 0 ? (
            <ExecutionBadge label={`${counts.groups} groups`} tone="violet" />
          ) : null}
          {evaluation ? (
            <ExecutionBadge
              label={evaluation.met ? "passing" : "blocked"}
              tone={evaluation.met ? "emerald" : "rose"}
            />
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">
          {tree.mode === "all"
            ? "Every condition in this group must pass before the child work unit can launch."
            : "Any branch in this group can pass for the child work unit to become launchable."}
        </p>
        {!evaluation?.met && evaluation?.reason ? (
          <p className="text-xs text-rose-100/90">{evaluation.reason}</p>
        ) : null}
      </div>

      {tree.conditions.length > 0 ? (
        <div className="space-y-2">
          {tree.conditions.map((condition, index) => {
            const detail = describeInvokeRuntimeCondition(condition);
            const conditionEvaluation = evaluation?.conditions[index];
            return (
              <div
                key={`${condition.kind}-${detail.summary}-${index}`}
                className="space-y-2 border border-border/70 bg-background/40 p-3"
              >
                <div className="flex flex-wrap gap-2">
                  <ExecutionBadge label={detail.kindLabel} tone="violet" />
                  <ExecutionBadge label={detail.operatorLabel} tone="slate" />
                  {condition.isNegated ? <ExecutionBadge label="negated" tone="rose" /> : null}
                  {conditionEvaluation ? (
                    <ExecutionBadge
                      label={conditionEvaluation.met ? "passed" : "blocked"}
                      tone={conditionEvaluation.met ? "emerald" : "rose"}
                    />
                  ) : null}
                </div>
                <DetailPrimary>{detail.summary}</DetailPrimary>
                <p className="text-sm text-muted-foreground">{detail.detail}</p>
                {conditionEvaluation ? (
                  <div className="space-y-1 border border-border/60 bg-background/60 px-3 py-2 text-xs">
                    <p className="uppercase tracking-[0.12em] text-muted-foreground">Evaluation</p>
                    <p className={conditionEvaluation.met ? "text-emerald-300" : "text-rose-300"}>
                      {conditionEvaluation.met
                        ? "This condition currently passes."
                        : (conditionEvaluation.reason ?? "This condition currently blocks launch.")}
                    </p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {tree.groups.length > 0 ? (
        <div className="space-y-3">
          {tree.groups.map((group, index) => (
            <InvokeStartGateTreePanel
              key={`${group.mode}-${index}`}
              tree={group}
              evaluation={evaluation?.groups[index]}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}

      {tree.conditions.length === 0 && tree.groups.length === 0 ? (
        <p className="border border-border/70 bg-background/40 p-3 text-sm text-muted-foreground">
          No conditions are configured in this gate group.
        </p>
      ) : null}
    </div>
  );
}

function parseToolPayload(value: string | undefined): unknown {
  if (!value) {
    return undefined;
  }

  const parsed = Result.try({
    try: () => JSON.parse(value),
    catch: () => undefined,
  });

  if (parsed.isOk()) {
    return parsed.value;
  }

  return value;
}

function resolveToolInputPayload(item: TimelineToolItem): unknown {
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

function mergeTimelineItems(
  items: readonly AgentStepTimelineItem[],
  nextItems: readonly AgentStepTimelineItem[],
): AgentStepTimelineItem[] {
  let merged = [...items];

  for (const item of nextItems) {
    merged = upsertTimelineItem(merged, item);
  }

  return merged;
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

    if (item.itemType === "thinking") {
      displayEntries.push({ entryType: "thinking", item });
      continue;
    }

    const toolKey = toToolCorrelationKey(item.timelineItemId);
    const pendingIndexes = pendingToolIndexes.get(toolKey) ?? [];

    if (item.status === "started") {
      const inputPayload = resolveToolInputPayload(item);

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
        startSessionLabel: sessionId ? "Reconnect Session" : "Start Session",
        reason: sessionId
          ? "The session disconnected. Reconnect to re-open the existing session."
          : "No session is currently bound. Start a new session.",
      } as const;
    case "completed":
      return {
        enabled: false,
        startSessionVisible: Boolean(sessionId),
        startSessionLabel: "Reconnect Session",
        reason: sessionId
          ? "This Agent step is completed. Reconnect to inspect the existing session."
          : "This Agent step is completed.",
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

function formatPropagationOperationLabel(
  kind: ActionBody["actions"][number]["items"][number]["propagationMappings"][number]["operationKind"],
): string {
  return kind === "no_op" ? "already in sync" : kind;
}

function getPropagationOperationTone(
  kind: ActionBody["actions"][number]["items"][number]["propagationMappings"][number]["operationKind"],
): Parameters<typeof ExecutionBadge>[0]["tone"] {
  switch (kind) {
    case "create":
      return "sky";
    case "update":
      return "violet";
    case "delete":
      return "rose";
    case "no_op":
    default:
      return "slate";
  }
}

function isAppliedPropagationResult(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    value.code === "propagation_applied"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getContextFactKindTone(
  kind: WorkflowContextFactKind,
): Parameters<typeof ExecutionBadge>[0]["tone"] {
  switch (kind) {
    case "plain_fact":
    case "plain_value_fact":
      return "sky";
    case "bound_fact":
      return "violet";
    case "artifact_slot_reference_fact":
      return "amber";
    case "workflow_ref_fact":
      return "lime";
    case "work_unit_reference_fact":
      return "emerald";
    case "work_unit_draft_spec_fact":
      return "rose";
  }
}

function truncateHash(value: string): string {
  return value.length <= 10 ? value : `${value.slice(0, 7)}…${value.slice(-4)}`;
}

function formatPrimitiveValue(value: unknown): string {
  return typeof value === "string" ? value : formatUnknown(value);
}

function getValueTone(value: unknown): Parameters<typeof ExecutionBadge>[0]["tone"] {
  if (typeof value === "string") {
    return "sky";
  }
  if (typeof value === "number") {
    return "amber";
  }
  if (typeof value === "boolean") {
    return value ? "emerald" : "rose";
  }
  if (Array.isArray(value)) {
    return "violet";
  }
  if (isRecord(value)) {
    return "slate";
  }
  return "slate";
}

function getValueKindLabel(value: unknown): string {
  if (typeof value === "string") {
    return "text";
  }
  if (typeof value === "number") {
    return "number";
  }
  if (typeof value === "boolean") {
    return "boolean";
  }
  if (Array.isArray(value)) {
    return `list ${value.length}`;
  }
  if (isRecord(value)) {
    return "json";
  }
  if (value === null) {
    return "null";
  }
  return typeof value;
}

function normalizeSchemaLabel(value: string): string {
  return value.replaceAll(/[_-]+/g, " ");
}

function renderSchemaDisplayName(params: { label?: string; fallbackKey?: string }): string {
  if (params.label) {
    return params.label;
  }

  if (!params.fallbackKey) {
    return "Value";
  }

  return normalizeSchemaLabel(params.fallbackKey)
    .split(" ")
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function getDraftSpecValueTone(valueType?: string): Parameters<typeof ExecutionBadge>[0]["tone"] {
  switch (valueType) {
    case "string":
      return "sky";
    case "number":
      return "amber";
    case "boolean":
      return "emerald";
    case "json":
      return "slate";
    case "work_unit":
      return "violet";
    default:
      return "slate";
  }
}

function getWriteActionBadges(params: {
  kind: WorkflowContextFactKind;
  instanceCount: number;
}): Array<{
  label: string;
  tone: Parameters<typeof ExecutionBadge>[0]["tone"];
}> {
  if (params.instanceCount === 0) {
    return [{ label: "create", tone: "sky" }];
  }

  return [
    { label: "update", tone: "violet" },
    { label: "remove", tone: "amber" },
    ...(params.kind === "bound_fact" || params.kind === "artifact_slot_reference_fact"
      ? ([{ label: "delete", tone: "rose" }] as const)
      : []),
  ];
}

function CopyValueButton(props: { value: string; label: string; className?: string }) {
  const { value, label, className } = props;
  const [copied, setCopied] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("h-7 border-border/70 bg-background/60 px-2 text-[0.65rem]", className)}
      aria-label={`Copy ${label}`}
      onClick={async () => {
        const copiedResult = await Result.tryPromise({
          try: () => navigator.clipboard.writeText(value),
          catch: (error) => error,
        });
        if (copiedResult.isOk()) {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1200);
        }
      }}
    >
      {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
    </Button>
  );
}

function InstanceMetaRow(props: {
  label: string;
  value: React.ReactNode;
  copyValue?: string;
  copyLabel?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border border-border/60 bg-background/45 px-2 py-2">
      <div className="min-w-0 space-y-1">
        <DetailLabel>{props.label}</DetailLabel>
        <DetailPrimary className="break-words text-xs font-normal">{props.value}</DetailPrimary>
      </div>
      {props.copyValue && props.copyLabel ? (
        <CopyValueButton value={props.copyValue} label={props.copyLabel} className="shrink-0" />
      ) : null}
    </div>
  );
}

function KeyValueObject(props: { values: Record<string, unknown> }) {
  const entries = Object.entries(props.values);
  if (entries.length === 0) {
    return <p className="text-xs text-muted-foreground">No authored values.</p>;
  }

  return (
    <div className="space-y-2">
      {entries.map(([key, value]) => (
        <div key={key} className="space-y-2 border border-border/60 bg-background/35 px-2 py-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="space-y-1">
              <DetailLabel>{key}</DetailLabel>
              <ExecutionBadge label={getValueKindLabel(value)} tone={getValueTone(value)} />
            </div>
          </div>
          {isRecord(value) && !Array.isArray(value) ? (
            <div className="grid gap-2 md:grid-cols-2">
              {Object.entries(value).map(([nestedKey, nestedValue]) => (
                <div
                  key={nestedKey}
                  className="space-y-1 border border-border/60 bg-background/45 px-2 py-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <DetailLabel>{nestedKey}</DetailLabel>
                    <ExecutionBadge
                      label={getValueKindLabel(nestedValue)}
                      tone={getValueTone(nestedValue)}
                    />
                  </div>
                  <DetailPrimary className="break-words text-xs font-normal">
                    {formatPrimitiveValue(nestedValue)}
                  </DetailPrimary>
                </div>
              ))}
            </div>
          ) : Array.isArray(value) ? (
            <div className="space-y-2">
              {value.map((entry, index) => (
                <div
                  key={`${key}-${index}`}
                  className="space-y-1 border border-border/60 bg-background/45 px-2 py-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <DetailLabel>Item {index + 1}</DetailLabel>
                    <ExecutionBadge label={getValueKindLabel(entry)} tone={getValueTone(entry)} />
                  </div>
                  <DetailPrimary className="break-words text-xs font-normal">
                    {formatPrimitiveValue(entry)}
                  </DetailPrimary>
                </div>
              ))}
            </div>
          ) : (
            <DetailPrimary className="break-words text-xs font-normal">
              {formatPrimitiveValue(value)}
            </DetailPrimary>
          )}
        </div>
      ))}
    </div>
  );
}

function DraftSpecNestedValueTable(props: { values: Record<string, unknown> }) {
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {Object.entries(props.values).map(([nestedKey, nestedValue]) => (
        <div
          key={nestedKey}
          className="space-y-1 border border-border/60 bg-background/45 px-2 py-2"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <DetailLabel>{renderSchemaDisplayName({ fallbackKey: nestedKey })}</DetailLabel>
            <ExecutionBadge
              label={getValueKindLabel(nestedValue)}
              tone={getValueTone(nestedValue)}
            />
          </div>
          <DetailPrimary className="break-words text-xs font-normal">
            {formatPrimitiveValue(nestedValue)}
          </DetailPrimary>
        </div>
      ))}
    </div>
  );
}

function ArtifactFileCard(props: { file: Record<string, unknown>; index: number }) {
  const filePath =
    typeof props.file.filePath === "string" ? props.file.filePath : `file-${props.index + 1}`;
  const status = typeof props.file.status === "string" ? props.file.status : undefined;
  const markedDeleted = status === "deleted" || props.file.deleted === true;
  const commitTitle =
    typeof props.file.gitCommitSubject === "string" && props.file.gitCommitSubject.length > 0
      ? props.file.gitCommitSubject
      : null;
  const commitHash = typeof props.file.gitCommitHash === "string" ? props.file.gitCommitHash : null;

  return (
    <div
      className={cn(
        "space-y-2 border border-border/70 bg-background/40 p-2",
        markedDeleted && "border-rose-500/40 bg-rose-500/8",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <DetailLabel>File path</DetailLabel>
          <DetailPrimary
            className={cn(
              "break-all text-xs font-normal",
              markedDeleted && "line-through opacity-80",
            )}
          >
            {filePath}
          </DetailPrimary>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExecutionBadge
            label={markedDeleted ? "marked deleted" : (status ?? "recorded")}
            tone={markedDeleted ? "rose" : "emerald"}
          />
          <CopyValueButton value={filePath} label="file path" />
        </div>
      </div>

      {commitTitle ? <InstanceMetaRow label="Commit" value={commitTitle} /> : null}
      {commitHash ? (
        <InstanceMetaRow
          label="Commit hash"
          value={
            <span className="font-mono text-[0.72rem] text-muted-foreground">
              {truncateHash(commitHash)}
            </span>
          }
          copyValue={commitHash}
          copyLabel="commit hash"
        />
      ) : null}
    </div>
  );
}

function InvokeArtifactPathList(props: {
  value: unknown;
  cardinality: "one" | "many" | undefined;
  projectRootPath?: string;
  statusMap?: ReadonlyMap<string, RepoFilePickerEntry>;
  showStatus?: boolean;
}) {
  const relativePaths = extractArtifactRelativePathsFromValue(props.value);

  if (relativePaths.length === 0) {
    return (
      <pre className="whitespace-pre-wrap break-words text-xs text-foreground">
        {formatUnknown(props.value)}
      </pre>
    );
  }

  return (
    <div className="space-y-1 border border-border/70 bg-background/40 p-2">
      {relativePaths.map((relativePath) => {
        const matched = props.statusMap?.get(relativePath);
        return (
          <div
            key={`${relativePath}-${props.cardinality ?? "unknown"}`}
            className="flex flex-wrap items-center gap-2"
          >
            <DetailPrimary className="text-xs font-normal">{relativePath}</DetailPrimary>
            {props.showStatus && matched ? (
              <ExecutionBadge
                label={formatRepoFileStatus(matched)}
                tone={getRepoFileStatusTone(matched)}
              />
            ) : null}
            {props.showStatus && matched ? (
              <span className="truncate text-[0.68rem] uppercase tracking-[0.08em] text-muted-foreground">
                {formatRepoFileMeta(matched) ?? ""}
              </span>
            ) : null}
            <CopyValueButton
              value={toAbsoluteProjectPath(props.projectRootPath, relativePath)}
              label={`full path for ${relativePath}`}
            />
          </div>
        );
      })}
    </div>
  );
}

function renderContextFactInstanceValue(
  kind: WorkflowContextFactKind,
  value: unknown,
  schemas?: {
    selectedFactSchemas?: Record<string, { label?: string | undefined; factKey: string }>;
    selectedArtifactSchemas?: Record<string, { label?: string | undefined; slotKey: string }>;
  },
): React.ReactNode {
  if (kind === "bound_fact" && isRecord(value)) {
    const deleted = value.deleted === true;
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <ExecutionBadge label="bound value" tone="violet" />
          {deleted ? <ExecutionBadge label="marked deleted" tone="rose" /> : null}
        </div>
        {typeof value.factInstanceId === "string" ? (
          <InstanceMetaRow
            label="Bound fact instance"
            value={
              <span className="font-mono text-[0.72rem] text-muted-foreground">
                {value.factInstanceId}
              </span>
            }
            copyValue={value.factInstanceId}
            copyLabel="bound fact instance id"
          />
        ) : null}
        <InstanceMetaRow label="Value" value={formatPrimitiveValue(value.value)} />
      </div>
    );
  }

  if (kind === "artifact_slot_reference_fact" && isRecord(value)) {
    const slotDefinitionId =
      typeof value.slotDefinitionId === "string" ? value.slotDefinitionId : undefined;
    const files = Array.isArray(value.files) ? value.files.filter(isRecord) : [];

    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <ExecutionBadge label="artifact snapshot" tone="amber" />
          <ExecutionBadge
            label={`${files.length} file${files.length === 1 ? "" : "s"}`}
            tone="slate"
          />
        </div>
        {slotDefinitionId ? (
          <InstanceMetaRow
            label="Slot definition"
            value={
              <span className="font-mono text-[0.72rem] text-muted-foreground">
                {slotDefinitionId}
              </span>
            }
            copyValue={slotDefinitionId}
            copyLabel="slot definition id"
          />
        ) : null}
        {files.length === 0 ? (
          <p className="text-xs text-muted-foreground">No file entries recorded.</p>
        ) : (
          <div className="space-y-2">
            {files.map((file, index) => (
              <ArtifactFileCard
                key={`${typeof file.filePath === "string" ? file.filePath : index}`}
                file={file}
                index={index}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (kind === "work_unit_draft_spec_fact" && isRecord(value)) {
    const factValues =
      isRecord(value.factValues) && !Array.isArray(value.factValues) ? value.factValues : undefined;
    const artifactValues =
      isRecord(value.artifactValues) && !Array.isArray(value.artifactValues)
        ? value.artifactValues
        : undefined;

    const factArray = Array.isArray(value.factValues) ? value.factValues.filter(isRecord) : [];
    const artifactArray = Array.isArray(value.artifactValues)
      ? value.artifactValues.filter(isRecord)
      : [];

    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <ExecutionBadge label="draft spec" tone="rose" />
          {typeof value.workUnitDefinitionId === "string" ? (
            <ExecutionBadge label="normalized" tone="slate" />
          ) : null}
        </div>
        {factValues ? (
          <div className="space-y-2">
            <DetailLabel>Fact values</DetailLabel>
            <div className="space-y-2">
              {Object.entries(factValues).map(([key, entry]) => {
                const schemaEntry = Object.values(schemas?.selectedFactSchemas ?? {}).find(
                  (schema) => schema.factKey === key,
                );
                return (
                  <div
                    key={key}
                    className="space-y-2 border border-border/60 bg-background/35 px-2 py-2"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <DetailLabel>
                          {renderSchemaDisplayName({
                            label: schemaEntry?.label,
                            fallbackKey: schemaEntry?.factKey ?? key,
                          })}
                        </DetailLabel>
                        <ExecutionBadge
                          label={schemaEntry?.valueType ?? getValueKindLabel(entry)}
                          tone={getDraftSpecValueTone(schemaEntry?.valueType)}
                        />
                      </div>
                    </div>
                    {isRecord(entry) && !Array.isArray(entry) ? (
                      <DraftSpecNestedValueTable values={entry} />
                    ) : Array.isArray(entry) ? (
                      <div className="space-y-2">
                        {entry.map((item, index) => (
                          <div
                            key={`${key}-${index}`}
                            className="space-y-1 border border-border/60 bg-background/45 px-2 py-2"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <DetailLabel>Item {index + 1}</DetailLabel>
                              <ExecutionBadge
                                label={getValueKindLabel(item)}
                                tone={getValueTone(item)}
                              />
                            </div>
                            <DetailPrimary className="break-words text-xs font-normal">
                              {formatPrimitiveValue(item)}
                            </DetailPrimary>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <DetailPrimary className="break-words text-xs font-normal">
                        {formatPrimitiveValue(entry)}
                      </DetailPrimary>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : factArray.length > 0 ? (
          <div className="space-y-2">
            <DetailLabel>Fact values</DetailLabel>
            <div className="space-y-2">
              {factArray.map((entry, index) => {
                const factId =
                  typeof entry.workUnitFactDefinitionId === "string"
                    ? entry.workUnitFactDefinitionId
                    : null;
                const schema = factId ? schemas?.selectedFactSchemas?.[factId] : null;
                const label = schema?.label ?? schema?.factKey ?? factId ?? `fact-${index + 1}`;
                return (
                  <div
                    key={`${factId ?? index}`}
                    className="space-y-2 border border-border/60 bg-background/35 px-2 py-2"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <DetailLabel>
                          {renderSchemaDisplayName({
                            label,
                            fallbackKey: schema?.factKey ?? factId ?? undefined,
                          })}
                        </DetailLabel>
                        <ExecutionBadge
                          label={schema?.valueType ?? getValueKindLabel(entry.value)}
                          tone={getDraftSpecValueTone(schema?.valueType)}
                        />
                      </div>
                    </div>
                    {isRecord(entry.value) && !Array.isArray(entry.value) ? (
                      <DraftSpecNestedValueTable values={entry.value} />
                    ) : (
                      <DetailPrimary className="break-words text-xs font-normal">
                        {formatPrimitiveValue(entry.value)}
                      </DetailPrimary>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
        {artifactValues ? (
          <div className="space-y-2">
            <DetailLabel>Artifact values</DetailLabel>
            <div className="space-y-2">
              {Object.entries(artifactValues).map(([key, entry]) => (
                <InstanceMetaRow
                  key={key}
                  label={key}
                  value={
                    Array.isArray(entry) ? entry.join(", ") || "—" : formatPrimitiveValue(entry)
                  }
                />
              ))}
            </div>
          </div>
        ) : artifactArray.length > 0 ? (
          <div className="space-y-2">
            <DetailLabel>Artifact values</DetailLabel>
            <div className="space-y-2">
              {artifactArray.map((entry, index) => {
                const slotId =
                  typeof entry.slotDefinitionId === "string" ? entry.slotDefinitionId : null;
                const schema = slotId ? schemas?.selectedArtifactSchemas?.[slotId] : null;
                const label = schema?.label ?? schema?.slotKey ?? slotId ?? `slot-${index + 1}`;
                return (
                  <InstanceMetaRow
                    key={`${slotId ?? index}`}
                    label={label}
                    value={
                      entry.clear === true
                        ? "Cleared"
                        : typeof entry.relativePath === "string"
                          ? entry.relativePath
                          : formatUnknown(entry)
                    }
                  />
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return <DetailPrimary className="text-xs font-normal">{String(value)}</DetailPrimary>;
  }

  if (value === null) {
    return (
      <DetailPrimary className="text-xs font-normal text-muted-foreground">null</DetailPrimary>
    );
  }

  return (
    <pre className="whitespace-pre-wrap break-words border border-border/60 bg-background/35 p-2 text-[0.72rem] text-foreground">
      {formatUnknown(value)}
    </pre>
  );
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
    body.page.fields.map((field) => {
      const sourceValue =
        sourcePayload[field.fieldKey] ??
        sourcePayload[field.contextFactDefinitionId] ??
        getEmptyFieldValue(field);

      return [field.fieldKey, normalizeInitialFieldValue(field, sourceValue)];
    }),
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

function isBoundReferenceContextFactKind(kind: string): boolean {
  return kind === "bound_fact";
}

function isWorkflowReferenceContextFactKind(kind: string): boolean {
  return kind === "workflow_ref_fact";
}

function isArtifactReferenceContextFactKind(kind: string): boolean {
  return kind === "artifact_slot_reference_fact";
}

type BoundFactInputMode = "existing" | "new";

function getBoundFactInstanceId(value: unknown): string {
  if (!isPlainRecord(value)) {
    return "";
  }

  return typeof value.instanceId === "string"
    ? value.instanceId
    : typeof value.factInstanceId === "string"
      ? value.factInstanceId
      : "";
}

function getBoundFactInlineValue(value: unknown): unknown {
  return isPlainRecord(value) && "value" in value ? value.value : null;
}

function getBoundFactOptionValueByInstanceId(
  field: RuntimeFormResolvedField,
  instanceId: string,
): unknown {
  return (
    field.widget.options?.find((option) => getBoundFactInstanceId(option.value) === instanceId)
      ?.value ?? null
  );
}

function getSingleBoundFactOptionValue(field: RuntimeFormResolvedField): unknown {
  return field.widget.options?.length === 1 ? (field.widget.options[0]?.value ?? null) : null;
}

function getLockedBoundFactEnvelope(field: RuntimeFormResolvedField, value: unknown): unknown {
  if (field.contextFactKind !== "bound_fact" || field.widget.cardinality !== "one") {
    return null;
  }

  const currentInstanceId = getBoundFactInstanceId(value);
  if (currentInstanceId.length > 0) {
    const optionValue = getBoundFactOptionValueByInstanceId(field, currentInstanceId);
    if (isPlainRecord(value) && "value" in value) {
      return { factInstanceId: currentInstanceId, value: value.value };
    }
    if (isPlainRecord(optionValue) && "value" in optionValue) {
      return { factInstanceId: currentInstanceId, value: optionValue.value };
    }
    return { factInstanceId: currentInstanceId };
  }

  if (field.widget.externalCardinality !== "one") {
    return null;
  }

  const singleOptionValue = getSingleBoundFactOptionValue(field);
  const singleOptionInstanceId = getBoundFactInstanceId(singleOptionValue);
  if (singleOptionInstanceId.length === 0) {
    return null;
  }

  if (isPlainRecord(value) && "value" in value) {
    return { factInstanceId: singleOptionInstanceId, value: value.value };
  }

  if (!isPlainRecord(value) && value !== null && value !== undefined && value !== "") {
    return { factInstanceId: singleOptionInstanceId, value };
  }

  if (isPlainRecord(singleOptionValue) && "value" in singleOptionValue) {
    return singleOptionValue;
  }

  return { factInstanceId: singleOptionInstanceId };
}

function shouldDisallowNewBoundFactInstance(
  field: RuntimeFormResolvedField,
  value: unknown,
): boolean {
  return getBoundFactInstanceId(getLockedBoundFactEnvelope(field, value)).length > 0;
}

function normalizeInitialFieldValue(field: RuntimeFormResolvedField, value: unknown): unknown {
  if (field.contextFactKind !== "bound_fact") {
    return value;
  }

  return getLockedBoundFactEnvelope(field, value) ?? value;
}

function getDefaultBoundFactInputMode(
  field: RuntimeFormResolvedField,
  value: unknown,
): BoundFactInputMode {
  if (getBoundFactInstanceId(value).length > 0) {
    return "existing";
  }

  if (isPlainRecord(value) && "value" in value) {
    return "new";
  }

  return (field.widget.options?.length ?? 0) > 0 ? "existing" : "new";
}

function createEmptyValueForWidget(widget: RuntimeFormResolvedField["widget"]): unknown {
  if (widget.renderedMultiplicity === "many") {
    return [];
  }

  switch (widget.control) {
    case "checkbox":
      return false;
    case "json":
      return {};
    default:
      return null;
  }
}

function createBoundFactEnvelope(params: {
  field: RuntimeFormResolvedField;
  mode: BoundFactInputMode;
  currentValue: unknown;
}): unknown {
  const { field, mode, currentValue } = params;

  if (mode === "existing") {
    const instanceId = getBoundFactInstanceId(currentValue);
    if (instanceId.length === 0) {
      return null;
    }

    return getBoundFactOptionValueByInstanceId(field, instanceId) ?? { factInstanceId: instanceId };
  }

  const inlineValue = getBoundFactInlineValue(currentValue);
  return {
    value: inlineValue ?? createEmptyValueForWidget(field.widget.boundValueWidget ?? field.widget),
  };
}

function sanitizeBoundFactValue(value: unknown): unknown {
  if (!isPlainRecord(value)) {
    return value;
  }

  const instanceId = getBoundFactInstanceId(value);
  if ("value" in value) {
    return instanceId.length > 0
      ? { factInstanceId: instanceId, value: value.value }
      : { value: value.value };
  }

  return instanceId.length > 0 ? { factInstanceId: instanceId } : null;
}

function primitiveFromInput(value: string, field: RuntimeFormResolvedField): unknown {
  if (isArtifactReferenceContextFactKind(field.contextFactKind)) {
    return value.length > 0 ? { relativePath: value } : null;
  }

  if (isWorkflowReferenceContextFactKind(field.contextFactKind)) {
    return value.length > 0 ? { workflowDefinitionId: value } : null;
  }

  if (isBoundReferenceContextFactKind(field.contextFactKind)) {
    return value.length > 0 ? { value } : null;
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

  if (isArtifactReferenceContextFactKind(field.contextFactKind) && isPlainRecord(value)) {
    return typeof value.relativePath === "string" ? value.relativePath : "";
  }

  if (isWorkflowReferenceContextFactKind(field.contextFactKind) && isPlainRecord(value)) {
    return typeof value.workflowDefinitionId === "string" ? value.workflowDefinitionId : "";
  }

  if (isBoundReferenceContextFactKind(field.contextFactKind) && isPlainRecord(value)) {
    if ("value" in value) {
      return value.value == null ? "" : String(value.value);
    }

    return getBoundFactInstanceId(value);
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

function buildMutationValues(
  values: Record<string, unknown>,
  fields: readonly RuntimeFormResolvedField[],
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(values).map(([fieldKey, value]) => {
      const field = fields.find((candidate) => candidate.fieldKey === fieldKey);
      if (!field || field.contextFactKind !== "bound_fact") {
        return [fieldKey, value];
      }

      if (Array.isArray(value)) {
        return [fieldKey, value.map((entry) => sanitizeBoundFactValue(entry))];
      }

      return [fieldKey, sanitizeBoundFactValue(value)];
    }),
  );
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

  if (field.contextFactKind === "bound_fact" && isPlainRecord(value)) {
    if ("value" in value) {
      return hasPresentFieldValue(value.value) ? undefined : `${field.fieldLabel} is required`;
    }

    return getBoundFactInstanceId(value).length > 0 ? undefined : `${field.fieldLabel} is required`;
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
    case "action":
      return {
        "--frame-border": "color-mix(in oklab, rgb(52 211 153) 24%, var(--border))",
        "--frame-corner": "color-mix(in oklab, rgb(110 231 183) 82%, var(--foreground))",
      };
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
    case "invoke":
      return {
        "--frame-border": "color-mix(in oklab, rgb(251 191 36) 24%, var(--border))",
        "--frame-corner": "color-mix(in oklab, rgb(252 211 77) 82%, var(--foreground))",
      };
    case "branch":
      return {
        "--frame-border": "color-mix(in oklab, rgb(251 113 133) 24%, var(--border))",
        "--frame-corner": "color-mix(in oklab, rgb(253 164 175) 82%, var(--foreground))",
      };
    default:
      return {
        "--frame-border": "color-mix(in oklab, var(--foreground) 18%, var(--border))",
        "--frame-corner": "color-mix(in oklab, var(--foreground) 56%, var(--border))",
      };
  }
}

function getStepTypeColors(stepType: GetRuntimeStepExecutionDetailOutput["shell"]["stepType"]) {
  switch (stepType) {
    case "action":
      return { border: "border-emerald-500/30", bg: "bg-emerald-500/5" };
    case "agent":
      return { border: "border-violet-500/30", bg: "bg-violet-500/5" };
    case "invoke":
      return { border: "border-amber-500/30", bg: "bg-amber-500/5" };
    case "branch":
      return { border: "border-rose-500/30", bg: "bg-rose-500/5" };
    case "display":
      return { border: "border-slate-500/30", bg: "bg-slate-500/5" };
    case "form":
    default:
      return { border: "border-sky-500/30", bg: "bg-sky-500/5" };
  }
}

function getCompletionGateLabel(
  stepType: GetRuntimeStepExecutionDetailOutput["shell"]["stepType"],
) {
  return stepType === "agent" ? "Session completion" : "Completion gate";
}

function formatActionExecutionModeLabel(mode: ActionBody["executionMode"]): string {
  return mode === "parallel" ? "Parallel" : "Sequential";
}

function formatActionRenderableStatusLabel(
  status:
    | ActionBody["actions"][number]["status"]
    | ActionBody["actions"][number]["items"][number]["status"],
): string {
  switch (status) {
    case "not_started":
      return "Not started";
    case "skipped":
      return "Skipped";
    case "running":
      return "Running";
    case "succeeded":
      return "Succeeded";
    case "failed":
      return "Failed";
    case "needs_attention":
      return "Needs attention";
  }
}

function getActionRenderableStatusTone(
  status:
    | ActionBody["actions"][number]["status"]
    | ActionBody["actions"][number]["items"][number]["status"],
) {
  switch (status) {
    case "running":
      return "sky" as const;
    case "skipped":
      return "slate" as const;
    case "succeeded":
      return "emerald" as const;
    case "failed":
    case "needs_attention":
      return "rose" as const;
    case "not_started":
    default:
      return "amber" as const;
  }
}

function formatActionPolicyLabel(
  value:
    | ActionBody["runtimeRowPolicy"]
    | ActionBody["duplicateRunPolicy"]
    | ActionBody["duplicateRetryPolicy"],
): string {
  switch (value) {
    case "lazy_on_first_execution":
      return "Lazy rows";
    case "idempotent_noop":
      return "Idempotent no-op";
  }
}

function formatActionAffectedTarget(target: RuntimeActionAffectedTarget): string {
  if (target.label?.trim()) {
    return target.label;
  }

  if (target.targetId?.trim()) {
    return `${target.targetKind.replaceAll("_", " ")} · ${target.targetId}`;
  }

  return target.targetKind.replaceAll("_", " ");
}

function getAffectedTargetStateTone(
  target: RuntimeActionAffectedTarget,
): "emerald" | "rose" | "slate" {
  switch (target.targetState) {
    case "exists":
      return "emerald";
    case "missing":
      return "rose";
    default:
      return "slate";
  }
}

function getAffectedTargetRowClasses(target: RuntimeActionAffectedTarget): string {
  switch (target.targetState) {
    case "exists":
      return "border-emerald-500/30 bg-emerald-500/10";
    case "missing":
      return "border-rose-500/30 bg-rose-500/10";
    default:
      return "border-border/70 bg-background/60";
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

function PrimitiveFieldEditor(props: {
  field: RuntimeFormResolvedField;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled: boolean;
}) {
  const { field, value, onChange, disabled } = props;

  if (field.widget.control === "select" && (field.widget.options?.length ?? 0) > 0) {
    return <SelectField field={field} value={value} onChange={onChange} disabled={disabled} />;
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
  const shouldUseCombobox = hasOptions || isBoundReferenceContextFactKind(field.contextFactKind);

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

function BoundFactFieldRow(props: {
  field: RuntimeFormResolvedField;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled: boolean;
  disabledOptionValues?: ReadonlySet<string>;
  labelOverride?: string;
}) {
  const { field, value, onChange, disabled, disabledOptionValues, labelOverride } = props;
  const lockedExistingValue = useMemo(
    () => getLockedBoundFactEnvelope(field, value),
    [field, value],
  );
  const createNewDisabled = shouldDisallowNewBoundFactInstance(field, value);
  const normalizedValue = lockedExistingValue ?? value;
  const defaultMode = getDefaultBoundFactInputMode(field, normalizedValue);
  const [mode, setMode] = useState<BoundFactInputMode>(defaultMode);
  const hasOptions = (field.widget.options?.length ?? 0) > 0;
  const existingSelectionValue = useMemo(() => {
    const instanceId = getBoundFactInstanceId(normalizedValue);
    if (instanceId.length === 0) {
      return null;
    }

    return getBoundFactOptionValueByInstanceId(field, instanceId) ?? { factInstanceId: instanceId };
  }, [field, normalizedValue]);
  const valueField = useMemo<RuntimeFormResolvedField>(
    () => ({
      ...field,
      fieldLabel: labelOverride ?? field.fieldLabel,
      contextFactKind: "plain_value_fact",
      widget: field.widget.boundValueWidget ?? field.widget,
    }),
    [field, labelOverride],
  );

  useEffect(() => {
    setMode(defaultMode);
  }, [defaultMode]);

  useEffect(() => {
    if (!lockedExistingValue) {
      return;
    }

    if (encodeOptionValue(lockedExistingValue) === encodeOptionValue(value)) {
      return;
    }

    onChange(lockedExistingValue);
  }, [lockedExistingValue, onChange, value]);

  return (
    <div className="space-y-3 border border-border/70 bg-background/30 p-3">
      {!createNewDisabled ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={mode === "existing" ? "default" : "outline"}
            size="sm"
            disabled={disabled}
            onClick={() => {
              setMode("existing");
              onChange(
                createBoundFactEnvelope({ field, mode: "existing", currentValue: normalizedValue }),
              );
            }}
          >
            Bind existing
          </Button>
          <Button
            type="button"
            variant={mode === "new" ? "default" : "outline"}
            size="sm"
            disabled={disabled}
            onClick={() => {
              setMode("new");
              onChange(
                createBoundFactEnvelope({ field, mode: "new", currentValue: normalizedValue }),
              );
            }}
          >
            Create new
          </Button>
        </div>
      ) : null}

      {mode === "existing" || createNewDisabled ? (
        <div className="space-y-2">
          <ReferenceOptionCombobox
            field={{ ...field, fieldLabel: labelOverride ?? field.fieldLabel }}
            value={existingSelectionValue}
            onChange={(nextValue) => onChange(nextValue)}
            disabledOptionValues={disabledOptionValues}
            disabled={
              disabled ||
              !hasOptions ||
              (field.widget.externalCardinality === "one" &&
                (field.widget.options?.length ?? 0) <= 1)
            }
          />
          {createNewDisabled ? (
            <PrimitiveFieldEditor
              field={valueField}
              value={getBoundFactInlineValue(normalizedValue)}
              onChange={(nextValue) =>
                onChange({
                  factInstanceId: getBoundFactInstanceId(normalizedValue),
                  value: nextValue,
                })
              }
              disabled={disabled}
            />
          ) : null}
          {field.widget.emptyState ? (
            <p className="text-xs text-muted-foreground">{field.widget.emptyState}</p>
          ) : null}
          {!hasOptions ? (
            <p className="text-xs text-muted-foreground">
              You can still create a fresh value inline with the typed editor above.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="space-y-2">
          <PrimitiveFieldEditor
            field={valueField}
            value={getBoundFactInlineValue(normalizedValue)}
            onChange={(nextValue) => onChange({ value: nextValue })}
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">
            Create a new {field.widget.bindingLabel?.toLowerCase() ?? "bound fact"} value inline.
          </p>
        </div>
      )}
    </div>
  );
}

function BoundFactField(props: {
  field: RuntimeFormResolvedField;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled: boolean;
}) {
  const { field, value, onChange, disabled } = props;

  if (field.widget.renderedMultiplicity === "many") {
    const items = Array.isArray(value) ? value : [];
    const selectedValues = new Set(
      items
        .map((entry) => {
          const instanceId = getBoundFactInstanceId(entry);
          if (instanceId.length === 0) {
            return null;
          }

          return (
            getBoundFactOptionValueByInstanceId(field, instanceId) ?? { factInstanceId: instanceId }
          );
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
        .map((entry) => encodeOptionValue(entry)),
    );

    return (
      <div className="space-y-3">
        {items.map((entry, index) => (
          <div key={`${field.fieldKey}-${index}`} className="space-y-2">
            <BoundFactFieldRow
              field={field}
              value={entry}
              onChange={(nextValue) => onChange(updateArrayValue(items, index, nextValue))}
              disabled={disabled}
              disabledOptionValues={selectedValues}
              labelOverride={`${field.fieldLabel} ${index + 1}`}
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
          onClick={() =>
            onChange(
              addArrayValue(
                items,
                createBoundFactEnvelope({
                  field,
                  mode: getDefaultBoundFactInputMode(field, null),
                  currentValue: null,
                }),
              ),
            )
          }
        >
          Add value
        </Button>
      </div>
    );
  }

  return <BoundFactFieldRow field={field} value={value} onChange={onChange} disabled={disabled} />;
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

  if (field.contextFactKind === "bound_fact") {
    return <BoundFactField field={field} value={value} onChange={onChange} disabled={disabled} />;
  }

  if (
    isWorkflowReferenceContextFactKind(field.contextFactKind) ||
    (field.widget.control === "select" && (field.widget.options?.length ?? 0) > 0)
  ) {
    return <SelectField field={field} value={value} onChange={onChange} disabled={disabled} />;
  }

  if (field.widget.control === "reference") {
    return <ReferenceField field={field} value={value} onChange={onChange} disabled={disabled} />;
  }

  if (isArtifactReferenceContextFactKind(field.contextFactKind)) {
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
    return (
      <PrimitiveFieldEditor field={field} value={value} onChange={onChange} disabled={disabled} />
    );
  }

  return (
    <PrimitiveFieldEditor field={field} value={value} onChange={onChange} disabled={disabled} />
  );
}

function StepExecutionShellCard(props: {
  projectId: string;
  shell: GetRuntimeStepExecutionDetailOutput["shell"];
  completionOutcome: string;
  isBusy: boolean;
  nextStep?: StepNextStep;
  onComplete?: () => void;
}) {
  const { projectId, shell, completionOutcome, isBusy, nextStep, onComplete } = props;
  const navigate = Route.useNavigate();
  const { orpc, queryClient } = Route.useRouteContext();
  const stepTypeColors = getStepTypeColors(shell.stepType);
  const stepTypeIconCode = STEP_TYPE_ICON_CODES[shell.stepType];
  const activateNextStepMutation = useMutation(
    orpc.project.activateWorkflowStepExecution.mutationOptions({
      onSuccess: async (result) => {
        showSingletonAutoAttachWarningToasts({
          warnings: result?.warnings,
          onOpenWorkUnits: () => {
            void navigate({
              to: "/projects/$projectId/work-units",
              params: { projectId },
              search: { q: "" },
            });
          },
        });
        await queryClient.invalidateQueries({
          queryKey: runtimeStepExecutionDetailQueryKey(projectId, shell.stepExecutionId),
        });

        if (result?.stepExecutionId) {
          await navigate({
            to: "/projects/$projectId/step-executions/$stepExecutionId",
            params: { projectId, stepExecutionId: result.stepExecutionId },
          });
        }
      },
    }),
  );
  const canOpenNextStep = nextStep?.state === "active" || nextStep?.state === "completed";
  const canActivateNextStep = nextStep?.state === "inactive";
  const nextStepLabel =
    nextStep?.state === "active"
      ? "Next step is active"
      : nextStep?.state === "completed"
        ? "Next step is completed"
        : nextStep?.state === "inactive"
          ? "Next step is inactive"
          : null;

  return (
    <Card frame="cut-heavy" tone="runtime" corner="white">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <DetailEyebrow>Shared step shell</DetailEyebrow>
            <CardTitle>Step execution identity &amp; status</CardTitle>
            <CardDescription>
              Common runtime metadata stays in the shared shell while step-type specific interaction
              lives below.
            </CardDescription>
          </div>

          {stepTypeIconCode ? (
            <div className="flex size-10 shrink-0 items-center justify-center border border-border/70 bg-background/50 p-2">
              <img
                src={`/visuals/workflow-editor/step-types/asset-${stepTypeIconCode}.svg`}
                alt=""
                aria-hidden="true"
                className="h-7 w-auto object-contain invert brightness-150 contrast-125"
              />
            </div>
          ) : null}
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

          <div
            className={cn(
              "space-y-3 border p-3 before:pointer-events-none before:absolute",
              stepTypeColors.border,
              stepTypeColors.bg,
            )}
          >
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
                <DetailLabel>{getCompletionGateLabel(shell.stepType)}</DetailLabel>
                <DetailPrimary>{completionOutcome}</DetailPrimary>
                {!shell.completionAction.enabled && shell.completionAction.reasonIfDisabled ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {shell.completionAction.reasonIfDisabled}
                  </p>
                ) : null}
              </div>
              {shell.status === "completed" && nextStepLabel ? (
                <div className="sm:col-span-2">
                  <DetailLabel>Next step</DetailLabel>
                  <DetailPrimary>{nextStepLabel}</DetailPrimary>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>

      {shell.completionAction.visible && shell.completionAction.enabled && onComplete ? (
        <CardFooter className="justify-end gap-2">
          <Button type="button" disabled={isBusy} onClick={onComplete}>
            Complete Step
          </Button>
        </CardFooter>
      ) : shell.status === "completed" && nextStep ? (
        <CardFooter className="justify-end gap-2">
          {canOpenNextStep && nextStep.nextStepExecutionId ? (
            <Button
              type="button"
              disabled={isBusy}
              onClick={() =>
                void navigate({
                  to: "/projects/$projectId/step-executions/$stepExecutionId",
                  params: { projectId, stepExecutionId: nextStep.nextStepExecutionId! },
                })
              }
            >
              Open next step
            </Button>
          ) : null}
          {canActivateNextStep ? (
            <Button
              type="button"
              disabled={isBusy || activateNextStepMutation.isPending}
              onClick={() =>
                activateNextStepMutation.mutate({
                  projectId,
                  workflowExecutionId: shell.workflowExecutionId,
                })
              }
            >
              Activate and open next step
            </Button>
          ) : null}
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
        values: buildMutationValues(value, body.page.fields),
      });
    },
  });

  useEffect(() => {
    form.reset(getInitialFormValues(body));
  }, [body, form]);

  return (
    <div className="space-y-4">
      <StepExecutionShellCard
        projectId={projectId}
        shell={detail.shell}
        completionOutcome={completionOutcome}
        isBusy={isBusy}
        nextStep={detail.body.nextStep}
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
                              resolvedField.contextFactKind === "bound_fact"
                                ? "amber"
                                : resolvedField.contextFactKind === "workflow_ref_fact"
                                  ? "violet"
                                  : resolvedField.contextFactKind === "artifact_slot_reference_fact"
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
                values: buildMutationValues(form.state.values, body.page.fields),
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
  contextFactKind: WorkflowContextFactKind;
  writeItem?: AgentStepRuntimeWriteItem;
}) {
  const { group, emptyMessage, contextFactKind, writeItem } = props;

  if (!group || group.instances.length === 0) {
    return <p className="text-xs text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-2">
      {group.instances.map((instance) => (
        <li
          key={`${group.contextFactDefinitionId}-${instance.contextFactInstanceId ?? instance.instanceOrder}`}
          className="space-y-3 border border-border/70 bg-background/50 p-3"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <ExecutionBadge label={`instance ${instance.instanceOrder + 1}`} tone="slate" />
              <ExecutionBadge
                label={renderContextFactKindLabel(contextFactKind)}
                tone={getContextFactKindTone(contextFactKind)}
              />
              {isRecord(instance.valueJson) &&
              (instance.valueJson.deleted === true || instance.valueJson.status === "deleted") ? (
                <ExecutionBadge label="marked deleted" tone="rose" />
              ) : null}
            </div>
            <DetailLabel>{formatTimestamp(instance.recordedAt)}</DetailLabel>
          </div>

          {instance.contextFactInstanceId ? (
            <InstanceMetaRow
              label="Instance id"
              value={
                <span className="font-mono text-[0.72rem] text-muted-foreground">
                  {instance.contextFactInstanceId}
                </span>
              }
              copyValue={instance.contextFactInstanceId}
              copyLabel="context fact instance id"
            />
          ) : null}

          {renderContextFactInstanceValue(contextFactKind, instance.valueJson, {
            selectedFactSchemas: writeItem?.selectedFactSchemas,
            selectedArtifactSchemas: writeItem?.selectedArtifactSchemas,
          })}
        </li>
      ))}
    </ul>
  );
}

function ActionInteractionSurface(props: {
  projectId: string;
  detail: GetRuntimeStepExecutionDetailOutput & { body: ActionBody };
}) {
  const { detail, projectId } = props;
  const { orpc, queryClient } = Route.useRouteContext();
  const shell = detail.shell;
  const body = detail.body;

  const invalidateStepDetail = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: runtimeStepExecutionDetailQueryKey(projectId, shell.stepExecutionId),
    });
  }, [projectId, queryClient, shell.stepExecutionId]);

  const runActionsMutation = useMutation(
    orpc.project.runActionStepActions.mutationOptions({
      onSuccess: invalidateStepDetail,
    }),
  );

  const retryActionsMutation = useMutation(
    orpc.project.retryActionStepActions.mutationOptions({
      onSuccess: invalidateStepDetail,
    }),
  );

  const skipActionsMutation = useMutation(
    orpc.project.skipActionStepActions.mutationOptions({
      onSuccess: invalidateStepDetail,
    }),
  );

  const skipActionItemsMutation = useMutation(
    orpc.project.skipActionStepActionItems.mutationOptions({
      onSuccess: invalidateStepDetail,
    }),
  );

  const completeStepMutation = useMutation(
    orpc.project.completeActionStepExecution.mutationOptions({
      onSuccess: invalidateStepDetail,
    }),
  );

  const isBusy =
    runActionsMutation.isPending ||
    retryActionsMutation.isPending ||
    skipActionsMutation.isPending ||
    skipActionItemsMutation.isPending ||
    completeStepMutation.isPending;

  const surfacedError = runActionsMutation.error
    ? toErrorMessage(runActionsMutation.error)
    : retryActionsMutation.error
      ? toErrorMessage(retryActionsMutation.error)
      : skipActionsMutation.error
        ? toErrorMessage(skipActionsMutation.error)
        : skipActionItemsMutation.error
          ? toErrorMessage(skipActionItemsMutation.error)
          : completeStepMutation.error
            ? toErrorMessage(completeStepMutation.error)
            : null;

  const completionOutcome =
    shell.status === "completed"
      ? "Completed"
      : body.completionSummary.eligible
        ? "Ready to complete"
        : (body.completionSummary.reasonIfIneligible ??
          shell.completionAction.reasonIfDisabled ??
          "Incomplete");

  const actionProgress = useMemo(
    () => ({
      total: body.actions.length,
      notStarted: body.actions.filter((action) => action.status === "not_started").length,
      skipped: body.actions.filter((action) => action.status === "skipped").length,
      running: body.actions.filter((action) => action.status === "running").length,
      succeeded: body.actions.filter((action) => action.status === "succeeded").length,
      needsAttention: body.actions.filter((action) => action.status === "needs_attention").length,
    }),
    [body.actions],
  );

  const itemProgress = useMemo(
    () => ({
      total: body.actions.reduce((count, action) => count + action.items.length, 0),
      succeeded: body.actions.reduce(
        (count, action) =>
          count + action.items.filter((item) => item.status === "succeeded").length,
        0,
      ),
      skipped: body.actions.reduce(
        (count, action) => count + action.items.filter((item) => item.status === "skipped").length,
        0,
      ),
      running: body.actions.reduce(
        (count, action) => count + action.items.filter((item) => item.status === "running").length,
        0,
      ),
      needsAttention: body.actions.reduce(
        (count, action) =>
          count +
          action.items.filter(
            (item) => item.status === "needs_attention" || item.status === "failed",
          ).length,
        0,
      ),
    }),
    [body.actions],
  );

  return (
    <div className="space-y-4">
      <StepExecutionShellCard
        projectId={projectId}
        shell={shell}
        completionOutcome={completionOutcome}
        isBusy={isBusy}
        nextStep={detail.body.nextStep}
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
            <DetailEyebrow>Action runtime</DetailEyebrow>
            <CardTitle>Run propagation rows under the locked Plan A rules</CardTitle>
            <CardDescription>
              Action rows stay lazy until first execution, retry remains in-place for
              needs-attention rows, and completion stays manual until at least one action succeeds
              with no rows left running.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="border border-border/70 bg-background/40 p-3">
              <DetailLabel>Execution mode</DetailLabel>
              <DetailPrimary>{formatActionExecutionModeLabel(body.executionMode)}</DetailPrimary>
              <p className="mt-1 text-xs text-muted-foreground">
                {body.executionMode === "sequential"
                  ? "Earlier enabled actions must succeed before later rows can run."
                  : "Any enabled row can run or retry independently."}
              </p>
            </div>

            <div className="border border-border/70 bg-background/40 p-3">
              <DetailLabel>Runtime rows</DetailLabel>
              <DetailPrimary>{formatActionPolicyLabel(body.runtimeRowPolicy)}</DetailPrimary>
              <p className="mt-1 text-xs text-muted-foreground">
                Rows materialize on first execution instead of during activation.
              </p>
            </div>

            <div className="border border-border/70 bg-background/40 p-3">
              <DetailLabel>Duplicate run / retry</DetailLabel>
              <DetailPrimary>
                {formatActionPolicyLabel(body.duplicateRunPolicy)} ·{" "}
                {formatActionPolicyLabel(body.duplicateRetryPolicy)}
              </DetailPrimary>
              <p className="mt-1 text-xs text-muted-foreground">
                Duplicate run and retry requests do nothing once the server locks a row state.
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <article className="space-y-3 border border-border/70 bg-background/40 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <DetailEyebrow>Completion rule</DetailEyebrow>
                  <CardTitle>Manual completion stays locked to runtime truth</CardTitle>
                </div>
                <ExecutionBadge
                  label={completionOutcome}
                  tone={body.completionSummary.eligible ? "emerald" : "amber"}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Requires at least one succeeded action and blocks while any action row is still
                running.
              </p>
              {!body.completionSummary.eligible && body.completionSummary.reasonIfIneligible ? (
                <p className="text-xs text-muted-foreground">
                  {body.completionSummary.reasonIfIneligible}
                </p>
              ) : null}
            </article>

            <article className="space-y-3 border border-border/70 bg-background/40 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <DetailEyebrow>Progress</DetailEyebrow>
                  <CardTitle>Action + item status summary</CardTitle>
                </div>
                <ExecutionBadge
                  label={`${actionProgress.succeeded + actionProgress.skipped}/${actionProgress.total} completed`}
                  tone="emerald"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-5">
                <div className="border border-border/70 bg-background/60 p-2 text-center text-muted-foreground">
                  rows ready {actionProgress.notStarted}
                </div>
                <div className="border border-border/70 bg-background/60 p-2 text-center text-muted-foreground">
                  rows running {actionProgress.running}
                </div>
                <div className="border border-border/70 bg-background/60 p-2 text-center text-muted-foreground">
                  rows skipped {actionProgress.skipped}
                </div>
                <div className="border border-border/70 bg-background/60 p-2 text-center text-muted-foreground">
                  items running {itemProgress.running}
                </div>
                <div className="border border-border/70 bg-background/60 p-2 text-center text-muted-foreground">
                  attention {Math.max(actionProgress.needsAttention, itemProgress.needsAttention)}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {itemProgress.succeeded + itemProgress.skipped} of {itemProgress.total} propagation
                item
                {itemProgress.total === 1 ? "" : "s"} succeeded.
              </p>
            </article>
          </div>

          {surfacedError ? (
            <div className="border border-destructive/60 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {surfacedError}
            </div>
          ) : null}

          {body.actions.length === 0 ? (
            <div className="border border-dashed border-border/70 bg-background/40 px-4 py-6 text-sm text-muted-foreground">
              No propagation actions were authored for this Action step.
            </div>
          ) : (
            <div className="space-y-3">
              {body.actions.map((action) => (
                <Card
                  key={action.actionId}
                  frame="flat"
                  tone="runtime"
                  className="border-border/70 bg-background/40"
                  data-testid={`action-runtime-row-${action.actionId}`}
                >
                  <CardHeader className="border-b border-border/70">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <CardTitle className="text-sm">
                          {action.label ?? action.actionKey}
                        </CardTitle>
                        <CardDescription>
                          {action.actionKey}
                          {action.contextFactKey ? ` · ${action.contextFactKey}` : ""}
                        </CardDescription>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <ExecutionBadge
                          label={formatActionRenderableStatusLabel(action.status)}
                          tone={getActionRenderableStatusTone(action.status)}
                        />
                        <ExecutionBadge
                          label={action.enabled ? "Enabled" : "Disabled"}
                          tone={action.enabled ? "emerald" : "slate"}
                        />
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-4 text-xs text-muted-foreground">
                    <div className="grid gap-3 md:grid-cols-3">
                      <div>
                        <DetailLabel>Sort order</DetailLabel>
                        <DetailPrimary>{action.sortOrder}</DetailPrimary>
                      </div>
                      <div>
                        <DetailLabel>Target scope</DetailLabel>
                        <DetailPrimary>
                          {
                            new Set(action.items.map((item) => item.targetContextFactDefinitionId))
                              .size
                          }{" "}
                          target
                          {new Set(action.items.map((item) => item.targetContextFactDefinitionId))
                            .size === 1
                            ? ""
                            : "s"}
                          {" · "}
                          {
                            new Set(action.items.map((item) => item.targetContextFactKind)).size
                          }{" "}
                          kind
                          {new Set(action.items.map((item) => item.targetContextFactKind)).size ===
                          1
                            ? ""
                            : "s"}
                        </DetailPrimary>
                        <DetailCode>Targets are selected per propagation item.</DetailCode>
                      </div>
                      <div>
                        <DetailLabel>Run / Retry / Skip</DetailLabel>
                        <DetailPrimary>
                          {action.runAction.enabled ? "Run allowed" : "Run locked"} ·{" "}
                          {action.retryAction.enabled ? "Retry allowed" : "Retry locked"} ·{" "}
                          {action.skipAction.enabled ? "Skip allowed" : "Skip locked"}
                        </DetailPrimary>
                      </div>
                    </div>

                    {action.resultSummaryJson ? (
                      <div className="space-y-2">
                        <DetailLabel>Action result summary</DetailLabel>
                        <pre className="whitespace-pre-wrap break-words border border-border/70 bg-background/50 p-2 text-xs text-foreground">
                          {formatUnknown(action.resultSummaryJson)}
                        </pre>
                      </div>
                    ) : null}

                    {action.resultJson ? (
                      <div className="space-y-2">
                        <DetailLabel>Action result payload</DetailLabel>
                        <pre className="whitespace-pre-wrap break-words border border-border/70 bg-background/50 p-2 text-xs text-foreground">
                          {formatUnknown(action.resultJson)}
                        </pre>
                      </div>
                    ) : null}

                    {!action.runAction.enabled && action.runAction.reasonIfDisabled ? (
                      <p className="text-xs text-muted-foreground">
                        {action.runAction.reasonIfDisabled}
                      </p>
                    ) : null}

                    {!action.retryAction.enabled && action.retryAction.reasonIfDisabled ? (
                      <p className="text-xs text-muted-foreground">
                        {action.retryAction.reasonIfDisabled}
                      </p>
                    ) : null}

                    {!action.skipAction.enabled && action.skipAction.reasonIfDisabled ? (
                      <p className="text-xs text-muted-foreground">
                        {action.skipAction.reasonIfDisabled}
                      </p>
                    ) : null}

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <DetailEyebrow>Propagation items</DetailEyebrow>
                        <CardDescription>
                          Stable authored item IDs stay visible at runtime and keep their row state
                          in place.
                        </CardDescription>
                      </div>

                      <div className="space-y-2">
                        {action.items.map((item) => (
                          <article
                            key={item.itemId}
                            data-testid={`action-runtime-item-${item.itemId}`}
                            className="space-y-3 border border-border/70 bg-background/50 p-3"
                          >
                            {(() => {
                              const showAppliedStateLabels =
                                item.status === "succeeded" &&
                                isAppliedPropagationResult(item.resultJson);
                              return (
                                <>
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="space-y-1">
                                      <DetailPrimary>{item.label ?? item.itemKey}</DetailPrimary>
                                      <DetailCode>{item.itemKey}</DetailCode>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      <ExecutionBadge
                                        label={formatActionRenderableStatusLabel(item.status)}
                                        tone={getActionRenderableStatusTone(item.status)}
                                      />
                                      <ExecutionBadge
                                        label={`order ${item.sortOrder}`}
                                        tone="slate"
                                      />
                                      <ExecutionBadge
                                        label={renderContextFactKindLabel(
                                          item.targetContextFactKind,
                                        )}
                                        tone={getContextFactKindTone(item.targetContextFactKind)}
                                      />
                                      {item.recoveryAction ? (
                                        <ExecutionBadge label="Recovery available" tone="amber" />
                                      ) : null}
                                    </div>
                                  </div>

                                  {item.resultSummaryJson ? (
                                    <div>
                                      <DetailLabel>Result summary</DetailLabel>
                                      <pre className="mt-1 whitespace-pre-wrap break-words text-xs text-foreground">
                                        {formatUnknown(item.resultSummaryJson)}
                                      </pre>
                                    </div>
                                  ) : null}

                                  <div>
                                    <DetailLabel>Item target context</DetailLabel>
                                    <div className="mt-1 flex flex-wrap items-center gap-2">
                                      <ExecutionBadge
                                        label={
                                          item.targetContextFactKey ??
                                          item.targetContextFactDefinitionId
                                        }
                                        tone="sky"
                                      />
                                      {item.targetContextFactKey ? (
                                        <span className="text-xs text-muted-foreground">
                                          {item.targetContextFactDefinitionId}
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>

                                  {item.propagationMappings.length > 0 ? (
                                    <div className="space-y-2">
                                      <DetailLabel>Propagation mappings</DetailLabel>
                                      <div className="space-y-3">
                                        {item.propagationMappings.map((mapping, index) => (
                                          <div
                                            key={`${item.itemId}-${mapping.targetKind}-${mapping.targetId ?? index}`}
                                            className="space-y-3 border border-border/70 bg-background/45 p-3"
                                          >
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                              <div className="space-y-1">
                                                <DetailPrimary>
                                                  {mapping.label ??
                                                    mapping.targetId ??
                                                    `mapping ${index + 1}`}
                                                </DetailPrimary>
                                                {mapping.targetId ? (
                                                  <DetailCode>{mapping.targetId}</DetailCode>
                                                ) : null}
                                              </div>
                                              <div className="flex flex-wrap gap-2">
                                                <ExecutionBadge
                                                  label={formatPropagationOperationLabel(
                                                    mapping.operationKind,
                                                  )}
                                                  tone={getPropagationOperationTone(
                                                    mapping.operationKind,
                                                  )}
                                                />
                                                <ExecutionBadge
                                                  label={mapping.targetKind.replaceAll("_", " ")}
                                                  tone="slate"
                                                />
                                              </div>
                                            </div>

                                            <div className="grid gap-3 md:grid-cols-2">
                                              <div className="space-y-2 border border-border/60 bg-background/35 p-3">
                                                <DetailLabel>
                                                  {showAppliedStateLabels
                                                    ? "Current external value"
                                                    : "Previous external value"}
                                                </DetailLabel>
                                                {mapping.previousValueJson === undefined ? (
                                                  <p className="text-xs text-muted-foreground">
                                                    No external instance/value.
                                                  </p>
                                                ) : (
                                                  renderContextFactInstanceValue(
                                                    item.targetContextFactKind,
                                                    mapping.previousValueJson,
                                                  )
                                                )}
                                              </div>
                                              <div className="space-y-2 border border-border/60 bg-background/35 p-3">
                                                <DetailLabel>
                                                  {showAppliedStateLabels
                                                    ? "Current context value"
                                                    : "Next propagated value"}
                                                </DetailLabel>
                                                {mapping.nextValueJson === undefined ? (
                                                  <p className="text-xs text-muted-foreground">
                                                    No propagated value.
                                                  </p>
                                                ) : (
                                                  renderContextFactInstanceValue(
                                                    item.targetContextFactKind,
                                                    mapping.nextValueJson,
                                                  )
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ) : null}

                                  {item.affectedTargets.length > 0 ? (
                                    <div className="space-y-2">
                                      <DetailLabel>Affected targets</DetailLabel>
                                      <ul className="space-y-2">
                                        {item.affectedTargets.map((target, index) => (
                                          <li
                                            key={`${item.itemId}-${target.targetKind}-${target.targetId ?? index}`}
                                            className={cn(
                                              "flex items-center justify-between gap-3 border px-2 py-2",
                                              getAffectedTargetRowClasses(target),
                                            )}
                                          >
                                            <span className="min-w-0 truncate text-foreground">
                                              {formatActionAffectedTarget(target)}
                                            </span>
                                            <div className="flex items-center gap-2">
                                              {target.targetState ? (
                                                <ExecutionBadge
                                                  label={target.targetState}
                                                  tone={getAffectedTargetStateTone(target)}
                                                />
                                              ) : null}
                                              <ExecutionBadge
                                                label={target.targetKind.replaceAll("_", " ")}
                                                tone="slate"
                                              />
                                            </div>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  ) : null}

                                  {item.recoveryAction?.reasonIfDisabled ? (
                                    <p className="text-xs text-muted-foreground">
                                      {item.recoveryAction.reasonIfDisabled}
                                    </p>
                                  ) : null}

                                  {!item.skipAction.enabled && item.skipAction.reasonIfDisabled ? (
                                    <p className="text-xs text-muted-foreground">
                                      {item.skipAction.reasonIfDisabled}
                                    </p>
                                  ) : null}

                                  <div className="flex justify-end">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      disabled={isBusy || !item.skipAction.enabled}
                                      onClick={() =>
                                        skipActionItemsMutation.mutate({
                                          projectId,
                                          stepExecutionId: shell.stepExecutionId,
                                          actionId: item.skipAction.actionId,
                                          itemIds: [item.skipAction.itemId],
                                        })
                                      }
                                    >
                                      Skip item
                                    </Button>
                                  </div>
                                </>
                              );
                            })()}
                          </article>
                        ))}
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isBusy || !action.runAction.enabled}
                      onClick={() =>
                        runActionsMutation.mutate({
                          projectId,
                          stepExecutionId: shell.stepExecutionId,
                          actionIds: [action.runAction.actionId],
                        })
                      }
                    >
                      Run action
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isBusy || !action.retryAction.enabled}
                      onClick={() =>
                        retryActionsMutation.mutate({
                          projectId,
                          stepExecutionId: shell.stepExecutionId,
                          actionIds: [action.retryAction.actionId],
                        })
                      }
                    >
                      Retry action
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isBusy || !action.skipAction.enabled}
                      onClick={() =>
                        skipActionsMutation.mutate({
                          projectId,
                          stepExecutionId: shell.stepExecutionId,
                          actionIds: [action.skipAction.actionId],
                        })
                      }
                    >
                      Skip action
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BranchInteractionSurface(props: {
  projectId: string;
  detail: GetRuntimeStepExecutionDetailOutput & { body: BranchBody };
}) {
  const { detail, projectId } = props;
  const { orpc, queryClient } = Route.useRouteContext();
  const shell = detail.shell;
  const body = detail.body;
  const availableTargetStepIds = useMemo(() => getBranchAvailableTargetStepIds(body), [body]);
  const validRoutes = useMemo(
    () => body.conditionalRoutes.filter((route) => route.isValid),
    [body.conditionalRoutes],
  );
  const [selectedTargetStepId, setSelectedTargetStepId] = useState(
    body.persistedSelection.selectedTargetStepId ?? "",
  );

  useEffect(() => {
    setSelectedTargetStepId(body.persistedSelection.selectedTargetStepId ?? "");
  }, [body.persistedSelection.selectedTargetStepId]);

  const invalidateStepDetail = async () => {
    await queryClient.invalidateQueries({
      queryKey: runtimeStepExecutionDetailQueryKey(projectId, shell.stepExecutionId),
    });
  };

  const saveSelectionMutation = useMutation(
    orpc.project.saveBranchStepSelection.mutationOptions({
      onSuccess: invalidateStepDetail,
    }),
  );

  const completeStepMutation = useMutation(
    orpc.project.completeStepExecution.mutationOptions({
      onSuccess: invalidateStepDetail,
    }),
  );

  const isBusy = saveSelectionMutation.isPending || completeStepMutation.isPending;
  const completionOutcome =
    shell.status === "completed"
      ? "Completed"
      : body.completionSummary.eligible
        ? "Ready to complete"
        : (body.completionSummary.reasonIfIneligible ??
          shell.completionAction.reasonIfDisabled ??
          "Incomplete");
  const mutationError = saveSelectionMutation.error ?? completeStepMutation.error;
  const invalidPersistedSelection =
    body.persistedSelection.selectedTargetStepId !== null && !body.persistedSelection.isValid;
  const hasSuggestionOnlyState =
    body.persistedSelection.selectedTargetStepId === null &&
    body.suggestion.suggestedTargetStepId !== null;
  const selectionChanged =
    selectedTargetStepId !== (body.persistedSelection.selectedTargetStepId ?? "");

  return (
    <div className="space-y-4">
      <StepExecutionShellCard
        projectId={projectId}
        shell={shell}
        completionOutcome={completionOutcome}
        isBusy={isBusy}
        nextStep={detail.body.nextStep}
        onComplete={() =>
          completeStepMutation.mutate({
            projectId,
            workflowExecutionId: shell.workflowExecutionId,
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
            <DetailEyebrow>Branch runtime</DetailEyebrow>
            <CardTitle>Persist a route selection before completion</CardTitle>
            <CardDescription>
              Suggestions stay advisory. Only the saved target selection can unlock branch
              completion.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="border border-border/70 bg-background/40 p-3">
              <DetailLabel>Saved selection</DetailLabel>
              <DetailPrimary>
                {body.persistedSelection.selectedTargetStepId ?? "No target saved"}
              </DetailPrimary>
              {body.persistedSelection.savedAt ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Saved {formatTimestamp(body.persistedSelection.savedAt)}
                </p>
              ) : null}
            </div>

            <div className="border border-border/70 bg-background/40 p-3">
              <DetailLabel>Suggestion</DetailLabel>
              <DetailPrimary>
                {body.suggestion.suggestedTargetStepId ?? "No current suggestion"}
              </DetailPrimary>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatBranchSuggestionSourceLabel(body.suggestion.source)}
                {body.suggestion.routeId ? ` · ${body.suggestion.routeId}` : ""}
              </p>
            </div>

            <div className="border border-border/70 bg-background/40 p-3">
              <DetailLabel>Route availability</DetailLabel>
              <DetailPrimary>{formatBranchAvailabilitySummary(body)}</DetailPrimary>
              <p className="mt-1 text-xs text-muted-foreground">
                Default target: {body.defaultTargetStepId ?? "None"}
              </p>
            </div>
          </div>

          {invalidPersistedSelection ? (
            <div className="flex items-start gap-2 border border-destructive/60 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
              <span>
                Saved target {body.persistedSelection.selectedTargetStepId} is no longer valid. Save
                a new target before completing this branch.
              </span>
            </div>
          ) : null}

          {hasSuggestionOnlyState ? (
            <div className="flex items-start gap-2 border border-sky-300/40 bg-sky-500/10 px-3 py-2 text-sm text-sky-100">
              <RadioIcon className="mt-0.5 size-4 shrink-0" />
              <span>
                Suggested target {body.suggestion.suggestedTargetStepId} is advisory only until you
                save it.
              </span>
            </div>
          ) : null}

          {!body.completionSummary.eligible && body.completionSummary.reasonIfIneligible ? (
            <div className="border border-amber-400/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
              {body.completionSummary.reasonIfIneligible}
            </div>
          ) : null}

          {mutationError ? (
            <div className="border border-destructive/60 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {toErrorMessage(mutationError)}
            </div>
          ) : null}

          <div className="space-y-3 border border-border/70 bg-background/40 p-3">
            <div className="space-y-1">
              <DetailEyebrow>Selection</DetailEyebrow>
              <CardTitle>Save the target that should govern completion</CardTitle>
              <CardDescription>
                The dropdown only offers server-approved targets from the current runtime payload.
              </CardDescription>
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
              <div className="space-y-2">
                <DetailLabel>Target step</DetailLabel>
                <Select
                  value={selectedTargetStepId}
                  onValueChange={(value) => setSelectedTargetStepId(value ?? "")}
                >
                  <SelectTrigger
                    id="branch-selected-target"
                    className="w-full bg-background/80 text-foreground"
                  >
                    <SelectValue placeholder="Choose a target step" />
                  </SelectTrigger>
                  <SelectContent className="border border-border/80 bg-[#0b0f12] text-foreground">
                    {availableTargetStepIds.map((targetStepId) => (
                      <SelectItem key={targetStepId} value={targetStepId}>
                        {targetStepId}
                        {targetStepId === body.defaultTargetStepId && validRoutes.length === 0
                          ? " (default)"
                          : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {availableTargetStepIds.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No valid targets are available to save from the current server payload.
                  </p>
                ) : null}
              </div>

              <Button
                type="button"
                disabled={!body.saveSelectionAction.enabled || isBusy || !selectionChanged}
                onClick={() =>
                  saveSelectionMutation.mutate({
                    projectId,
                    stepExecutionId: shell.stepExecutionId,
                    selectedTargetStepId: selectedTargetStepId || null,
                  })
                }
              >
                Save selection
              </Button>

              <Button
                type="button"
                variant="outline"
                disabled={
                  !body.saveSelectionAction.enabled ||
                  isBusy ||
                  body.persistedSelection.selectedTargetStepId === null
                }
                onClick={() =>
                  saveSelectionMutation.mutate({
                    projectId,
                    stepExecutionId: shell.stepExecutionId,
                    selectedTargetStepId: null,
                  })
                }
              >
                Clear saved selection
              </Button>
            </div>

            {!body.saveSelectionAction.enabled && body.saveSelectionAction.reasonIfDisabled ? (
              <p className="text-xs text-muted-foreground">
                {body.saveSelectionAction.reasonIfDisabled}
              </p>
            ) : null}
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <DetailEyebrow>Conditional routes</DetailEyebrow>
              <CardTitle>Valid route list</CardTitle>
              <CardDescription>
                Single, none, and multi-match states all come from the locked server payload.
              </CardDescription>
            </div>

            {body.conditionalRoutes.length === 0 ? (
              <div className="border border-border/70 bg-background/40 p-3 text-sm text-muted-foreground">
                No conditional routes were authored for this branch.
              </div>
            ) : (
              <div className="space-y-3">
                {body.conditionalRoutes.map((route) => (
                  <Card
                    key={route.routeId}
                    frame="flat"
                    tone="runtime"
                    className="border-border/70 bg-background/40"
                  >
                    <CardHeader className="border-b border-border/70">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <CardTitle className="text-sm">{route.routeId}</CardTitle>
                          <CardDescription>Target step {route.targetStepId}</CardDescription>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <ExecutionBadge
                            label={route.isValid ? "Valid" : "Blocked"}
                            tone={route.isValid ? "emerald" : "rose"}
                          />
                          <ExecutionBadge label={route.conditionMode.toUpperCase()} tone="slate" />
                          {body.persistedSelection.selectedTargetStepId === route.targetStepId ? (
                            <ExecutionBadge label="Saved target" tone="sky" />
                          ) : null}
                          {body.suggestion.routeId === route.routeId ? (
                            <ExecutionBadge label="Suggested" tone="amber" />
                          ) : null}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3 pt-4 text-xs text-muted-foreground">
                      <div className="grid gap-3 md:grid-cols-3">
                        <div>
                          <DetailLabel>Sort order</DetailLabel>
                          <DetailPrimary>{route.sortOrder}</DetailPrimary>
                        </div>
                        <div>
                          <DetailLabel>Target step</DetailLabel>
                          <DetailPrimary>{route.targetStepId}</DetailPrimary>
                        </div>
                        <div>
                          <DetailLabel>Evaluation</DetailLabel>
                          <DetailPrimary>{route.isValid ? "Match" : "Blocked"}</DetailPrimary>
                        </div>
                      </div>

                      {route.evaluationTree ? (
                        <BranchConditionEvaluationTreePanel tree={route.evaluationTree} />
                      ) : null}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InvokeInteractionSurface(props: {
  projectId: string;
  detail: GetRuntimeStepExecutionDetailOutput & { body: InvokeBody };
}) {
  const { detail, projectId } = props;
  const { orpc, queryClient } = Route.useRouteContext();
  const desktopBridge = typeof window === "undefined" ? undefined : window.desktop;
  const selectDesktopFiles =
    typeof desktopBridge?.selectFiles === "function" ? desktopBridge.selectFiles : undefined;
  const shell = detail.shell;
  const body = detail.body;
  const [selectedWorkflowsByRowId, setSelectedWorkflowsByRowId] = useState<Record<string, string>>(
    () =>
      Object.fromEntries(
        body.workUnitTargets.map((row) => [
          row.invokeWorkUnitTargetExecutionId,
          getInitialPrimaryWorkflowSelection(row),
        ]),
      ),
  );
  const [runtimeBindingInputsByRowId, setRuntimeBindingInputsByRowId] = useState<
    Record<string, Record<string, string>>
  >(() => createRuntimeBindingDraftState(body.workUnitTargets));
  const [runtimeBindingValidationError, setRuntimeBindingValidationError] = useState<string | null>(
    null,
  );
  const [artifactPickerKey, setArtifactPickerKey] = useState<string | null>(null);
  const [artifactPickerQuery, setArtifactPickerQuery] = useState("");
  const [nativeArtifactPickerKey, setNativeArtifactPickerKey] = useState<string | null>(null);

  useEffect(() => {
    setSelectedWorkflowsByRowId(
      Object.fromEntries(
        body.workUnitTargets.map((row) => [
          row.invokeWorkUnitTargetExecutionId,
          getInitialPrimaryWorkflowSelection(row),
        ]),
      ),
    );
    setRuntimeBindingInputsByRowId(createRuntimeBindingDraftState(body.workUnitTargets));
    setRuntimeBindingValidationError(null);
    setArtifactPickerKey(null);
    setArtifactPickerQuery("");
    setNativeArtifactPickerKey(null);
  }, [body.workUnitTargets]);

  const projectDetailsQuery = useQuery({
    ...orpc.project.getProjectDetails.queryOptions({ input: { projectId } }),
    enabled: true,
  });
  const projectRootPath = projectDetailsQuery.data?.project.projectRootPath;

  const repoFilesQuery = useQuery({
    ...orpc.project.listProjectRepoFiles.queryOptions({
      input: {
        projectId,
        ...(artifactPickerQuery.trim().length > 0 ? { query: artifactPickerQuery.trim() } : {}),
        limit: 200,
      },
    }),
    enabled: artifactPickerKey !== null && typeof selectDesktopFiles !== "function",
  });

  const selectedArtifactRelativePaths = useMemo(() => {
    const collected = new Set<string>();
    for (const row of body.workUnitTargets) {
      const rowRuntimeInputs =
        runtimeBindingInputsByRowId[row.invokeWorkUnitTargetExecutionId] ?? {};
      for (const binding of row.bindingPreview) {
        if (binding.destinationKind !== "artifact_slot") {
          continue;
        }
        const rawValue = rowRuntimeInputs[binding.destinationDefinitionId] ?? "";
        for (const relativePath of parseSelectedArtifactPaths(
          rawValue,
          binding.destinationCardinality,
        )) {
          collected.add(relativePath);
        }
      }
    }
    return [...collected];
  }, [body.workUnitTargets, runtimeBindingInputsByRowId]);

  const selectedArtifactStatusesQuery = useQuery({
    ...orpc.project.getProjectRepoFileStatuses.queryOptions({
      input: {
        projectId,
        relativePaths: selectedArtifactRelativePaths,
      },
    }),
    enabled: selectedArtifactRelativePaths.length > 0,
  });

  const selectedArtifactStatusMap = useMemo(
    () =>
      new Map(
        (selectedArtifactStatusesQuery.data ?? []).map(
          (entry) => [entry.relativePath, entry] as const,
        ),
      ),
    [selectedArtifactStatusesQuery.data],
  );

  const chooseNativeArtifactFiles = useCallback(
    async (params: {
      rowId: string;
      binding: InvokeWorkUnitBindingPreview;
      artifactPickerId: string;
    }) => {
      if (!selectDesktopFiles) {
        return;
      }

      const projectRootPath = projectDetailsQuery.data?.project.projectRootPath;
      if (!projectRootPath) {
        setRuntimeBindingValidationError(
          "Desktop file selection requires a project root path for this project.",
        );
        return;
      }

      setNativeArtifactPickerKey(params.artifactPickerId);
      try {
        const selectedPaths = await selectDesktopFiles({
          multiple: params.binding.destinationCardinality === "many",
          title:
            params.binding.destinationCardinality === "many"
              ? `Select files for ${params.binding.destinationLabel}`
              : `Select file for ${params.binding.destinationLabel}`,
          buttonLabel:
            params.binding.destinationCardinality === "many" ? "Select files" : "Select file",
          defaultPath: projectRootPath,
        });

        if (!selectedPaths || selectedPaths.length === 0) {
          return;
        }

        const relativePaths = selectedPaths.flatMap((selectedPath) => {
          const relativePath = toProjectRelativePath(projectRootPath, selectedPath);
          return relativePath ? [relativePath] : [];
        });

        if (relativePaths.length !== selectedPaths.length) {
          setRuntimeBindingValidationError(
            "Selected files must stay within the project root directory.",
          );
          return;
        }

        setRuntimeBindingValidationError(null);
        setRuntimeBindingInputsByRowId((current) =>
          updateRuntimeBindingDraftState({
            current,
            rowId: params.rowId,
            destinationDefinitionId: params.binding.destinationDefinitionId,
            value:
              params.binding.destinationCardinality === "many"
                ? relativePaths.join("\n")
                : (relativePaths[0] ?? ""),
          }),
        );
      } finally {
        setNativeArtifactPickerKey(null);
      }
    },
    [projectDetailsQuery.data?.project.projectRootPath, selectDesktopFiles],
  );

  const invalidateStepDetail = async () => {
    await queryClient.invalidateQueries({
      queryKey: runtimeStepExecutionDetailQueryKey(projectId, shell.stepExecutionId),
    });
  };

  const startWorkflowMutation = useMutation(
    orpc.project.startInvokeWorkflowTarget.mutationOptions({
      onSuccess: invalidateStepDetail,
    }),
  );

  const startWorkUnitMutation = useMutation(
    orpc.project.startInvokeWorkUnitTarget.mutationOptions({
      onSuccess: async (result) => {
        showSingletonAutoAttachWarningToasts({
          warnings: result?.warnings,
          onOpenWorkUnits: () => {
            void navigate({
              to: "/projects/$projectId/work-units",
              params: { projectId },
              search: { q: "" },
            });
          },
        });
        await invalidateStepDetail();
      },
    }),
  );

  const saveWorkUnitDraftMutation = useMutation(
    orpc.project.saveInvokeWorkUnitTargetDraft.mutationOptions({
      onSuccess: invalidateStepDetail,
    }),
  );

  const completeStepMutation = useMutation(
    orpc.project.completeStepExecution.mutationOptions({
      onSuccess: invalidateStepDetail,
    }),
  );

  const isBusy =
    startWorkflowMutation.isPending ||
    saveWorkUnitDraftMutation.isPending ||
    startWorkUnitMutation.isPending ||
    completeStepMutation.isPending;

  const completionOutcome =
    shell.status === "completed"
      ? "Completed"
      : body.completionSummary.eligible
        ? "Ready to complete"
        : (body.completionSummary.reasonIfIneligible ??
          shell.completionAction.reasonIfDisabled ??
          "Incomplete");

  const workflowRowsVisible = body.targetKind === "workflow" || body.workflowTargets.length > 0;
  const workUnitRowsVisible = body.targetKind === "work_unit" || body.workUnitTargets.length > 0;
  const mutationError =
    startWorkflowMutation.error ??
    saveWorkUnitDraftMutation.error ??
    startWorkUnitMutation.error ??
    completeStepMutation.error;
  const surfacedError =
    runtimeBindingValidationError ?? (mutationError ? toErrorMessage(mutationError) : null);

  return (
    <div className="space-y-4">
      <StepExecutionShellCard
        projectId={projectId}
        shell={shell}
        completionOutcome={completionOutcome}
        isBusy={isBusy}
        nextStep={detail.body.nextStep}
        onComplete={() =>
          completeStepMutation.mutate({
            projectId,
            workflowExecutionId: shell.workflowExecutionId,
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
            <DetailEyebrow>Invoke runtime</DetailEyebrow>
            <CardTitle>Invoke targets, completion rule &amp; propagation preview</CardTitle>
            <CardDescription>
              Invoke steps keep the shared shell above, then materialize frozen child targets with
              explicit start/open actions and completion-time propagation only.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="border border-sky-500/30 bg-sky-500/5 p-3">
              <div className="flex items-center justify-between gap-2">
                <DetailLabel>Target kind</DetailLabel>
                <ExecutionBadge label={formatInvokeTargetKindLabel(body.targetKind)} tone="sky" />
              </div>
              <DetailPrimary>{formatInvokeTargetKindLabel(body.targetKind)}</DetailPrimary>
            </div>
            <div
              className={cn(
                "p-3",
                body.sourceMode === "fact_backed"
                  ? "border border-violet-500/30 bg-violet-500/5"
                  : "border border-amber-500/30 bg-amber-500/5",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <DetailLabel>Source mode</DetailLabel>
                <ExecutionBadge
                  label={formatInvokeSourceModeLabel(body.sourceMode)}
                  tone={body.sourceMode === "fact_backed" ? "violet" : "amber"}
                />
              </div>
              <DetailPrimary>{formatInvokeSourceModeLabel(body.sourceMode)}</DetailPrimary>
              {body.sourceMode === "fact_backed" ? (
                <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                  <p>
                    Bound context fact:{" "}
                    {body.sourceContextFactLabel ??
                      body.sourceContextFactKey ??
                      "(key unavailable)"}
                    {body.sourceContextFactDefinitionId
                      ? ` · ${body.sourceContextFactDefinitionId}`
                      : ""}
                  </p>
                  {formatInvokeSourceMetadata({
                    kind: body.sourceContextFactKind,
                    cardinality: body.sourceContextFactCardinality,
                    valueType:
                      body.sourceContextFactWorkUnitDefinitionName ??
                      body.sourceContextFactValueType,
                  }) ? (
                    <p>
                      Type:{" "}
                      {formatInvokeSourceMetadata({
                        kind: body.sourceContextFactKind,
                        cardinality: body.sourceContextFactCardinality,
                        valueType:
                          body.sourceContextFactWorkUnitDefinitionName ??
                          body.sourceContextFactValueType,
                      })}
                    </p>
                  ) : null}
                  <p>Runtime instances: {(body.sourceContextFactInstanceValues ?? []).length}</p>
                  {(body.sourceContextFactInstanceValues ?? []).length > 0 ? (
                    <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all border border-border/60 bg-background/30 p-2 text-[11px] leading-relaxed text-foreground/85">
                      {body.sourceContextFactInstanceValues
                        ?.map((value, index) => `#${index + 1}: ${formatUnknown(value)}`)
                        .join("\n")}
                    </pre>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div
              className={cn(
                "p-3",
                body.completionSummary.eligible
                  ? "border border-emerald-500/30 bg-emerald-500/5"
                  : "border border-amber-500/30 bg-amber-500/5",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <DetailLabel>Completion progress</DetailLabel>
                <ExecutionBadge
                  label={body.completionSummary.eligible ? "Ready" : "Pending"}
                  tone={body.completionSummary.eligible ? "emerald" : "amber"}
                />
              </div>
              <DetailPrimary>
                {formatInvokeProgressLabel(
                  body.completionSummary.completedTargets,
                  body.completionSummary.totalTargets,
                )}
              </DetailPrimary>
              {!body.completionSummary.eligible && body.completionSummary.reasonIfIneligible ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {body.completionSummary.reasonIfIneligible}
                </p>
              ) : null}
            </div>
          </div>

          <div className="border border-amber-500/20 bg-background/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <DetailLabel>Completion rule</DetailLabel>
              <ExecutionBadge label="manual completion" tone="amber" />
            </div>
            <DetailPrimary>{formatInvokeCompletionRuleLabel(body.targetKind)}</DetailPrimary>
            <p className="mt-1 text-xs text-muted-foreground">
              Completion remains manual and uses the shared complete-step action in the shell.
            </p>
          </div>

          {surfacedError ? (
            <div className="border border-destructive/60 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {surfacedError}
            </div>
          ) : null}

          {workflowRowsVisible ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <DetailEyebrow>Workflow targets</DetailEyebrow>
                <CardTitle>Invoked workflows</CardTitle>
                <CardDescription>
                  Human-readable workflow labels lead; definition and execution IDs stay secondary.
                </CardDescription>
              </div>

              {body.workflowTargets.length === 0 ? (
                <div className="border border-border/70 bg-background/40 p-3 text-sm text-muted-foreground">
                  No workflow targets resolved.
                </div>
              ) : (
                <div className="space-y-3">
                  {body.workflowTargets.map((row) => {
                    const startAction = row.actions.start;

                    return (
                      <Card
                        key={row.invokeWorkflowTargetExecutionId}
                        frame="flat"
                        tone="runtime"
                        className="border-border/70 bg-background/40"
                      >
                        <CardHeader className="border-b border-border/70">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-1">
                              <CardTitle className="text-sm">{row.label}</CardTitle>
                              <CardDescription>
                                {row.workflowDefinitionKey ??
                                  row.workflowDefinitionName ??
                                  "Workflow target"}
                              </CardDescription>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <ExecutionBadge
                                label={formatInvokeStatusLabel(row.status)}
                                tone={getInvokeStatusTone(row.status)}
                              />
                              {row.activeChildStepLabel ? (
                                <ExecutionBadge label={row.activeChildStepLabel} tone="violet" />
                              ) : null}
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-3 pt-4 text-xs text-muted-foreground">
                          <div className="grid gap-3 md:grid-cols-2">
                            <div>
                              <DetailLabel>Workflow label</DetailLabel>
                              <DetailPrimary>{row.label}</DetailPrimary>
                              {row.workflowDefinitionId ? (
                                <DetailCode>{row.workflowDefinitionId}</DetailCode>
                              ) : null}
                            </div>

                            <div>
                              <DetailLabel>Workflow execution</DetailLabel>
                              <DetailPrimary>
                                {row.workflowExecutionId ? "Execution started" : "Not started yet"}
                              </DetailPrimary>
                              {row.workflowExecutionId ? (
                                <DetailCode>{row.workflowExecutionId}</DetailCode>
                              ) : null}
                            </div>

                            {row.activeChildStepLabel ? (
                              <div className="md:col-span-2">
                                <DetailLabel>Active child step</DetailLabel>
                                <DetailPrimary>{row.activeChildStepLabel}</DetailPrimary>
                              </div>
                            ) : null}
                          </div>

                          {startAction && !startAction.enabled && startAction.reasonIfDisabled ? (
                            <p className="text-xs text-muted-foreground">
                              {startAction.reasonIfDisabled}
                            </p>
                          ) : null}
                        </CardContent>

                        <CardFooter className="justify-end gap-2">
                          {startAction ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isBusy || !startAction.enabled}
                              onClick={() =>
                                startWorkflowMutation.mutate({
                                  projectId,
                                  stepExecutionId: shell.stepExecutionId,
                                  invokeWorkflowTargetExecutionId:
                                    startAction.invokeWorkflowTargetExecutionId,
                                })
                              }
                            >
                              Start workflow
                            </Button>
                          ) : null}

                          {row.actions.openWorkflow ? (
                            <Link
                              to="/projects/$projectId/workflow-executions/$workflowExecutionId"
                              params={{
                                projectId,
                                workflowExecutionId: row.actions.openWorkflow.workflowExecutionId,
                              }}
                              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                            >
                              Open workflow
                            </Link>
                          ) : null}
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}

          {workUnitRowsVisible ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <DetailEyebrow>Work-unit targets</DetailEyebrow>
                <CardTitle>Invoked work-unit paths</CardTitle>
                <CardDescription>
                  Startable rows require an explicit primary workflow selection before runtime child
                  entities are materialized.
                </CardDescription>
              </div>

              {body.workUnitTargets.length === 0 ? (
                <div className="border border-border/70 bg-background/40 p-3 text-sm text-muted-foreground">
                  No work-unit targets resolved.
                </div>
              ) : (
                <div className="space-y-3">
                  {body.workUnitTargets.map((row) => {
                    const selectedWorkflowId =
                      selectedWorkflowsByRowId[row.invokeWorkUnitTargetExecutionId] ??
                      getInitialPrimaryWorkflowSelection(row);
                    const startAction = row.actions.start;
                    const bindingsLocked =
                      !!row.projectWorkUnitId ||
                      !!row.transitionExecutionId ||
                      !!row.workflowExecutionId;
                    const editableBindings = row.bindingPreview.filter(
                      (binding) =>
                        binding.destinationKind === "work_unit_fact" ||
                        binding.destinationKind === "artifact_slot",
                    );
                    const unsupportedRuntimeBindings = row.bindingPreview.filter(
                      (binding) =>
                        binding.destinationKind !== "work_unit_fact" &&
                        binding.destinationKind !== "artifact_slot",
                    );
                    const unsupportedRuntimeBindingsReason =
                      unsupportedRuntimeBindings.length > 0
                        ? "This invoke target includes unsupported binding kinds."
                        : null;
                    const rowRuntimeInputs =
                      runtimeBindingInputsByRowId[row.invokeWorkUnitTargetExecutionId] ?? {};
                    const selectedPrimaryWorkflowLabel = getSelectedPrimaryWorkflowLabel(
                      row,
                      selectedWorkflowId,
                    );

                    return (
                      <Card
                        key={row.invokeWorkUnitTargetExecutionId}
                        frame="flat"
                        tone="runtime"
                        className="border-border/70 bg-background/40"
                      >
                        <CardHeader className="border-b border-border/70">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-1">
                              <CardTitle className="text-sm">{row.workUnitLabel}</CardTitle>
                              <CardDescription>{formatInvokeTransitionPath(row)}</CardDescription>
                              <div className="flex flex-wrap gap-2 pt-1">
                                {row.workUnitDefinitionKey ? (
                                  <ExecutionBadge label={row.workUnitDefinitionKey} tone="lime" />
                                ) : null}
                                {row.transitionDefinitionKey ? (
                                  <ExecutionBadge label={row.transitionDefinitionKey} tone="sky" />
                                ) : null}
                                <ExecutionBadge
                                  label={
                                    row.availablePrimaryWorkflows.length > 0
                                      ? "workflow ready"
                                      : "needs workflow"
                                  }
                                  tone={
                                    row.availablePrimaryWorkflows.length > 0 ? "violet" : "amber"
                                  }
                                />
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <ExecutionBadge
                                label={formatInvokeStatusLabel(row.status)}
                                tone={getInvokeStatusTone(row.status)}
                              />
                              {row.currentWorkUnitStateLabel ? (
                                <ExecutionBadge
                                  label={row.currentWorkUnitStateLabel}
                                  tone="slate"
                                />
                              ) : null}
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-3 pt-4 text-xs text-muted-foreground">
                          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            <div>
                              <DetailLabel>Work unit</DetailLabel>
                              <DetailPrimary>
                                {row.workUnitDefinitionName ?? row.workUnitLabel}
                              </DetailPrimary>
                              {row.workUnitDefinitionKey ? (
                                <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                                  {row.workUnitDefinitionKey}
                                </p>
                              ) : null}
                              <DetailCode>{row.workUnitDefinitionId}</DetailCode>
                            </div>

                            <div>
                              <DetailLabel>Transition</DetailLabel>
                              <DetailPrimary>{formatInvokeTransitionPath(row)}</DetailPrimary>
                              {row.transitionDefinitionKey ? (
                                <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                                  {row.transitionDefinitionKey}
                                </p>
                              ) : null}
                              <DetailCode>{row.transitionDefinitionId}</DetailCode>
                            </div>

                            <div>
                              <DetailLabel>Primary workflow</DetailLabel>
                              {startAction && row.availablePrimaryWorkflows.length > 0 ? (
                                <Select
                                  value={selectedWorkflowId}
                                  onValueChange={(value) =>
                                    setSelectedWorkflowsByRowId((current) => ({
                                      ...current,
                                      [row.invokeWorkUnitTargetExecutionId]: value ?? "",
                                    }))
                                  }
                                >
                                  <SelectTrigger
                                    id={`invoke-primary-workflow-${row.invokeWorkUnitTargetExecutionId}`}
                                    className="w-full border-violet-500/30 bg-violet-500/10 text-foreground"
                                  >
                                    <span className="flex flex-1 items-center gap-2 overflow-hidden text-left">
                                      <ExecutionBadge label="primary" tone="violet" />
                                      <span className="truncate">
                                        {selectedPrimaryWorkflowLabel ??
                                          "Choose a primary workflow"}
                                      </span>
                                    </span>
                                  </SelectTrigger>
                                  <SelectContent className="border border-border/80 bg-[#0b0f12] text-foreground">
                                    {row.availablePrimaryWorkflows.map((option) => (
                                      <SelectItem
                                        key={option.workflowDefinitionId}
                                        value={option.workflowDefinitionId}
                                      >
                                        {formatPrimaryWorkflowOption(option)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <>
                                  <DetailPrimary>
                                    {row.workflowLabel ?? "No primary workflow selected"}
                                  </DetailPrimary>
                                  {row.workflowDefinitionId ? (
                                    <DetailCode>{row.workflowDefinitionId}</DetailCode>
                                  ) : null}
                                </>
                              )}
                            </div>

                            <div>
                              <DetailLabel>Current work-unit state</DetailLabel>
                              <DetailPrimary>
                                {row.currentWorkUnitStateLabel ?? "Not created yet"}
                              </DetailPrimary>
                              {row.projectWorkUnitId ? (
                                <DetailCode>{row.projectWorkUnitId}</DetailCode>
                              ) : null}
                            </div>
                          </div>

                          {row.blockedReason ? (
                            <p className="text-xs text-muted-foreground">{row.blockedReason}</p>
                          ) : null}

                          {isRuntimeConditionTree(row.startGate.conditionTree) ? (
                            <div className="space-y-2 border border-border/70 bg-background/50 p-3">
                              <DetailLabel>Condition tree</DetailLabel>
                              {row.startGate.evaluatedAt ? (
                                <p className="text-xs text-muted-foreground">
                                  Evaluated {formatTimestamp(row.startGate.evaluatedAt)}
                                </p>
                              ) : null}
                              <InvokeStartGateTreePanel
                                tree={row.startGate.conditionTree}
                                evaluation={row.startGate.evaluationTree}
                              />
                            </div>
                          ) : null}

                          {startAction && !startAction.enabled && startAction.reasonIfDisabled ? (
                            <p className="text-xs text-muted-foreground">
                              {startAction.reasonIfDisabled}
                            </p>
                          ) : null}

                          {unsupportedRuntimeBindingsReason ? (
                            <p className="text-xs text-muted-foreground">
                              {unsupportedRuntimeBindingsReason}
                            </p>
                          ) : null}

                          {row.bindingPreview.length > 0 ? (
                            <div className="space-y-2 border border-border/70 bg-background/50 p-3">
                              <DetailLabel>Binding preview</DetailLabel>
                              <p className="text-xs text-muted-foreground">
                                These are the invoke bindings that will initialize the child
                                work-unit when started.
                              </p>

                              <ul className="space-y-2">
                                {row.bindingPreview.map((binding) => {
                                  const runtimeRawValue =
                                    rowRuntimeInputs[binding.destinationDefinitionId] ?? "";
                                  const savedDraftValue = getInvokeSavedDraftValue(binding);
                                  const authoredPrefillValue =
                                    getInvokeAuthoredPrefillValue(binding);
                                  const hasSavedDraftValue = typeof savedDraftValue !== "undefined";
                                  const hasAuthoredPrefillValue =
                                    typeof authoredPrefillValue !== "undefined";
                                  const manyOrJsonInput =
                                    binding.destinationCardinality === "many" ||
                                    binding.destinationFactType === "json";
                                  const isWorkUnitSelector = isWorkUnitBinding(binding);
                                  const selectorOptions = binding.editorOptions ?? [];
                                  const selectedBindingOptionLabel = getEncodedOptionLabel(
                                    selectorOptions,
                                    runtimeRawValue,
                                  );
                                  const artifactInputDisplayLabel =
                                    binding.destinationKind === "artifact_slot"
                                      ? getArtifactInputDisplayLabel(
                                          runtimeRawValue,
                                          binding.destinationCardinality,
                                        )
                                      : null;
                                  const usesRuntimeArtifactPicker =
                                    binding.destinationKind === "artifact_slot" &&
                                    binding.requiresRuntimeValue;
                                  const usesDesktopArtifactPicker =
                                    usesRuntimeArtifactPicker &&
                                    typeof selectDesktopFiles === "function";
                                  const parsedSelectedArtifactPaths = usesRuntimeArtifactPicker
                                    ? parseSelectedArtifactPaths(
                                        runtimeRawValue,
                                        binding.destinationCardinality,
                                      )
                                    : [];
                                  const filesetSelectedPaths =
                                    usesRuntimeArtifactPicker &&
                                    binding.destinationCardinality === "many"
                                      ? parsedSelectedArtifactPaths
                                      : [];
                                  const singleArtifactSelectedPath =
                                    usesRuntimeArtifactPicker &&
                                    binding.destinationCardinality !== "many"
                                      ? (parsedSelectedArtifactPaths[0] ?? "")
                                      : "";
                                  const filesetSelectedSet = new Set(filesetSelectedPaths);
                                  const artifactPickerId = `${row.invokeWorkUnitTargetExecutionId}:${binding.destinationDefinitionId}`;

                                  return (
                                    <li
                                      key={`${row.invokeWorkUnitTargetExecutionId}-${binding.destinationDefinitionId}`}
                                      className={cn(
                                        "space-y-3 border p-3",
                                        getInvokeBindingContainerTone(binding),
                                      )}
                                    >
                                      <div className="flex flex-wrap items-center gap-2">
                                        <ExecutionBadge
                                          label={
                                            binding.destinationKind === "artifact_slot"
                                              ? "artifact destination"
                                              : "fact destination"
                                          }
                                          tone={getInvokeDestinationTone(binding)}
                                        />
                                        <ExecutionBadge
                                          label={binding.sourceKind.replaceAll("_", " ")}
                                          tone={getInvokeSourceTone(binding.sourceKind)}
                                        />
                                        <ExecutionBadge
                                          label={
                                            binding.requiresRuntimeValue
                                              ? "runtime required"
                                              : "prefilled"
                                          }
                                          tone={binding.requiresRuntimeValue ? "amber" : "emerald"}
                                        />
                                        {hasSavedDraftValue ? (
                                          <ExecutionBadge label="saved mapping" tone="violet" />
                                        ) : null}
                                      </div>
                                      <div className="grid gap-2 md:grid-cols-2">
                                        <div>
                                          <DetailLabel>Destination</DetailLabel>
                                          <DetailPrimary>{binding.destinationLabel}</DetailPrimary>
                                          <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                                            {formatInvokeDestinationMetadata(binding)}
                                          </p>
                                          <DetailCode>{binding.destinationDefinitionId}</DetailCode>
                                        </div>
                                        <div>
                                          <DetailLabel>Source</DetailLabel>
                                          <DetailPrimary>
                                            {formatInvokeBindingSourceValue(binding)}
                                          </DetailPrimary>
                                          {formatInvokeSourceMetadata({
                                            kind: binding.sourceContextFactKind,
                                            cardinality: binding.sourceContextFactCardinality,
                                            valueType: binding.sourceContextFactValueType,
                                          }) ? (
                                            <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                                              {formatInvokeSourceMetadata({
                                                kind: binding.sourceContextFactKind,
                                                cardinality: binding.sourceContextFactCardinality,
                                                valueType: binding.sourceContextFactValueType,
                                              })}
                                            </p>
                                          ) : null}
                                          {binding.sourceContextFactDefinitionId ? (
                                            <DetailCode>
                                              {binding.sourceContextFactDefinitionId}
                                            </DetailCode>
                                          ) : null}
                                        </div>
                                      </div>

                                      {binding.destinationKind === "artifact_slot" ? (
                                        <div className="space-y-2">
                                          <DetailLabel>Start-time value</DetailLabel>
                                          {usesRuntimeArtifactPicker ? (
                                            <div className="space-y-2">
                                              {usesDesktopArtifactPicker ? (
                                                <Button
                                                  type="button"
                                                  variant="outline"
                                                  role="combobox"
                                                  aria-label={`artifact-files-${artifactPickerId}`}
                                                  className="h-8 w-full justify-between rounded-none border-amber-500/30 bg-amber-500/10 px-2.5 py-1 font-normal text-foreground"
                                                  disabled={
                                                    bindingsLocked ||
                                                    nativeArtifactPickerKey === artifactPickerId
                                                  }
                                                  onClick={() => {
                                                    void chooseNativeArtifactFiles({
                                                      rowId: row.invokeWorkUnitTargetExecutionId,
                                                      binding,
                                                      artifactPickerId,
                                                    });
                                                  }}
                                                >
                                                  <span className="truncate text-left text-xs">
                                                    {nativeArtifactPickerKey === artifactPickerId
                                                      ? "Opening system file selector..."
                                                      : binding.destinationCardinality === "many"
                                                        ? filesetSelectedPaths.length === 0
                                                          ? "Choose files"
                                                          : `${filesetSelectedPaths.length} files selected`
                                                        : singleArtifactSelectedPath.length > 0
                                                          ? singleArtifactSelectedPath
                                                          : "Choose file"}
                                                  </span>
                                                  <ChevronsUpDownIcon className="size-3.5 shrink-0 opacity-70" />
                                                </Button>
                                              ) : (
                                                <Popover
                                                  open={artifactPickerKey === artifactPickerId}
                                                  onOpenChange={(nextOpen) => {
                                                    setArtifactPickerKey(
                                                      nextOpen ? artifactPickerId : null,
                                                    );
                                                    setArtifactPickerQuery("");
                                                  }}
                                                >
                                                  <PopoverTrigger
                                                    render={
                                                      <Button
                                                        type="button"
                                                        variant="outline"
                                                        role="combobox"
                                                        aria-label={`artifact-files-${artifactPickerId}`}
                                                        className="h-8 w-full justify-between rounded-none border-amber-500/30 bg-amber-500/10 px-2.5 py-1 font-normal text-foreground"
                                                        disabled={bindingsLocked}
                                                      />
                                                    }
                                                  >
                                                    <span className="truncate text-left text-xs">
                                                      {binding.destinationCardinality === "many"
                                                        ? filesetSelectedPaths.length === 0
                                                          ? "Browse project repo files"
                                                          : `${filesetSelectedPaths.length} files selected`
                                                        : singleArtifactSelectedPath.length > 0
                                                          ? singleArtifactSelectedPath
                                                          : "Browse project repo files"}
                                                    </span>
                                                    <ChevronsUpDownIcon className="size-3.5 shrink-0 opacity-70" />
                                                  </PopoverTrigger>
                                                  <PopoverContent
                                                    className="w-[min(36rem,calc(100vw-3rem))] p-0"
                                                    align="start"
                                                    frame="cut-thin"
                                                    tone="context"
                                                    sideOffset={4}
                                                  >
                                                    <Command
                                                      density="compact"
                                                      frame="default"
                                                      className="bg-[#0b0f12] text-foreground"
                                                    >
                                                      <CommandInput
                                                        density="compact"
                                                        placeholder="Search project repo files..."
                                                        value={artifactPickerQuery}
                                                        onValueChange={setArtifactPickerQuery}
                                                      />
                                                      <CommandList>
                                                        <CommandEmpty>
                                                          No repo files found.
                                                        </CommandEmpty>
                                                        <CommandGroup heading="Project repo files">
                                                          {(repoFilesQuery.data ?? []).map(
                                                            (entry) => {
                                                              const selected =
                                                                binding.destinationCardinality ===
                                                                "many"
                                                                  ? filesetSelectedSet.has(
                                                                      entry.relativePath,
                                                                    )
                                                                  : singleArtifactSelectedPath ===
                                                                    entry.relativePath;
                                                              const meta =
                                                                formatRepoFileMeta(entry);
                                                              return (
                                                                <CommandItem
                                                                  key={`${artifactPickerId}-${entry.relativePath}`}
                                                                  value={`${entry.relativePath} ${formatRepoFileStatus(entry)} ${meta ?? ""}`}
                                                                  onSelect={() => {
                                                                    setRuntimeBindingValidationError(
                                                                      null,
                                                                    );
                                                                    setRuntimeBindingInputsByRowId(
                                                                      (current) =>
                                                                        updateRuntimeBindingDraftState(
                                                                          {
                                                                            current,
                                                                            rowId:
                                                                              row.invokeWorkUnitTargetExecutionId,
                                                                            destinationDefinitionId:
                                                                              binding.destinationDefinitionId,
                                                                            value:
                                                                              binding.destinationCardinality ===
                                                                              "many"
                                                                                ? (selected
                                                                                    ? filesetSelectedPaths.filter(
                                                                                        (value) =>
                                                                                          value !==
                                                                                          entry.relativePath,
                                                                                      )
                                                                                    : [
                                                                                        ...filesetSelectedPaths,
                                                                                        entry.relativePath,
                                                                                      ]
                                                                                  ).join("\n")
                                                                                : selected
                                                                                  ? ""
                                                                                  : entry.relativePath,
                                                                          },
                                                                        ),
                                                                    );
                                                                    if (
                                                                      binding.destinationCardinality !==
                                                                      "many"
                                                                    ) {
                                                                      setArtifactPickerKey(null);
                                                                      setArtifactPickerQuery("");
                                                                    }
                                                                  }}
                                                                >
                                                                  <Checkbox
                                                                    checked={selected}
                                                                    className="pointer-events-none"
                                                                  />
                                                                  <div className="grid min-w-0 flex-1 gap-0.5">
                                                                    <span className="truncate font-medium">
                                                                      {entry.relativePath}
                                                                    </span>
                                                                    <div className="flex flex-wrap gap-1">
                                                                      <ExecutionBadge
                                                                        label={formatRepoFileStatus(
                                                                          entry,
                                                                        )}
                                                                        tone={getRepoFileStatusTone(
                                                                          entry,
                                                                        )}
                                                                      />
                                                                    </div>
                                                                    {meta ? (
                                                                      <span className="truncate text-[0.68rem] uppercase tracking-[0.08em] text-muted-foreground">
                                                                        {meta}
                                                                      </span>
                                                                    ) : null}
                                                                  </div>
                                                                </CommandItem>
                                                              );
                                                            },
                                                          )}
                                                        </CommandGroup>
                                                      </CommandList>
                                                    </Command>
                                                  </PopoverContent>
                                                </Popover>
                                              )}
                                              {(
                                                binding.destinationCardinality === "many"
                                                  ? filesetSelectedPaths.length > 0
                                                  : singleArtifactSelectedPath.length > 0
                                              ) ? (
                                                <InvokeArtifactPathList
                                                  value={
                                                    binding.destinationCardinality === "many"
                                                      ? filesetSelectedPaths
                                                      : singleArtifactSelectedPath
                                                  }
                                                  cardinality={binding.destinationCardinality}
                                                  projectRootPath={projectRootPath}
                                                  statusMap={selectedArtifactStatusMap}
                                                  showStatus
                                                />
                                              ) : null}
                                            </div>
                                          ) : (
                                            <Select
                                              value={runtimeRawValue}
                                              disabled={
                                                bindingsLocked || selectorOptions.length === 0
                                              }
                                              onValueChange={(value) => {
                                                setRuntimeBindingValidationError(null);
                                                setRuntimeBindingInputsByRowId((current) =>
                                                  updateRuntimeBindingDraftState({
                                                    current,
                                                    rowId: row.invokeWorkUnitTargetExecutionId,
                                                    destinationDefinitionId:
                                                      binding.destinationDefinitionId,
                                                    value: value ?? "",
                                                  }),
                                                );
                                              }}
                                            >
                                              <SelectTrigger className="w-full border-amber-500/30 bg-amber-500/10 text-foreground">
                                                <span className="truncate text-left">
                                                  {selectedBindingOptionLabel ??
                                                    artifactInputDisplayLabel ??
                                                    "Select an artifact source"}
                                                </span>
                                              </SelectTrigger>
                                              <SelectContent className="border border-border/80 bg-[#0b0f12] text-foreground">
                                                {selectorOptions.map((option) => (
                                                  <SelectItem
                                                    key={`${binding.destinationDefinitionId}-${encodeOptionValue(option.value)}`}
                                                    value={encodeOptionValue(option.value)}
                                                  >
                                                    {option.label}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          )}
                                          {binding.editorEmptyState ? (
                                            <p className="text-xs text-muted-foreground">
                                              {binding.editorEmptyState}
                                            </p>
                                          ) : null}
                                          {binding.sourceWarnings?.length ? (
                                            <div className="space-y-1 border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-100">
                                              <DetailLabel>Mapping warnings</DetailLabel>
                                              <ul className="space-y-1">
                                                {binding.sourceWarnings.map((warning, index) => (
                                                  <li
                                                    key={`${binding.destinationDefinitionId}-warning-${index}`}
                                                  >
                                                    {warning}
                                                  </li>
                                                ))}
                                              </ul>
                                            </div>
                                          ) : null}
                                        </div>
                                      ) : binding.destinationKind !== "work_unit_fact" ? (
                                        <div />
                                      ) : (
                                        <div className="space-y-2">
                                          <DetailLabel>Start-time value</DetailLabel>
                                          {isWorkUnitSelector || selectorOptions.length > 0 ? (
                                            <>
                                              <Select
                                                value={runtimeRawValue}
                                                disabled={
                                                  bindingsLocked ||
                                                  (isWorkUnitSelector &&
                                                    selectorOptions.length === 0)
                                                }
                                                onValueChange={(value) => {
                                                  setRuntimeBindingValidationError(null);
                                                  setRuntimeBindingInputsByRowId((current) =>
                                                    updateRuntimeBindingDraftState({
                                                      current,
                                                      rowId: row.invokeWorkUnitTargetExecutionId,
                                                      destinationDefinitionId:
                                                        binding.destinationDefinitionId,
                                                      value: value ?? "",
                                                    }),
                                                  );
                                                }}
                                              >
                                                <SelectTrigger className="w-full border-sky-500/30 bg-sky-500/10 text-foreground">
                                                  <span className="truncate text-left">
                                                    {selectedBindingOptionLabel ??
                                                      (isWorkUnitSelector
                                                        ? "Select a work unit"
                                                        : `Select ${binding.destinationLabel}`)}
                                                  </span>
                                                </SelectTrigger>
                                                <SelectContent className="border border-border/80 bg-[#0b0f12] text-foreground">
                                                  {selectorOptions.map((option) => (
                                                    <SelectItem
                                                      key={`${binding.destinationDefinitionId}-${encodeOptionValue(option.value)}`}
                                                      value={encodeOptionValue(option.value)}
                                                    >
                                                      {option.label}
                                                    </SelectItem>
                                                  ))}
                                                </SelectContent>
                                              </Select>
                                              {binding.editorEmptyState ||
                                              (isWorkUnitSelector &&
                                                selectorOptions.length === 0) ? (
                                                <p className="text-xs text-muted-foreground">
                                                  {binding.editorEmptyState ??
                                                    "No eligible work units are available yet."}
                                                </p>
                                              ) : null}
                                            </>
                                          ) : binding.destinationFactType === "boolean" &&
                                            binding.destinationCardinality === "one" ? (
                                            <Select
                                              value={runtimeRawValue}
                                              disabled={bindingsLocked}
                                              onValueChange={(value) => {
                                                setRuntimeBindingValidationError(null);
                                                setRuntimeBindingInputsByRowId((current) =>
                                                  updateRuntimeBindingDraftState({
                                                    current,
                                                    rowId: row.invokeWorkUnitTargetExecutionId,
                                                    destinationDefinitionId:
                                                      binding.destinationDefinitionId,
                                                    value: value ?? "",
                                                  }),
                                                );
                                              }}
                                            >
                                              <SelectTrigger className="w-full border-violet-500/30 bg-violet-500/10 text-foreground">
                                                <span className="truncate text-left">
                                                  {runtimeRawValue.length > 0
                                                    ? runtimeRawValue
                                                    : "Select true or false"}
                                                </span>
                                              </SelectTrigger>
                                              <SelectContent className="border border-border/80 bg-[#0b0f12] text-foreground">
                                                <SelectItem value="true">true</SelectItem>
                                                <SelectItem value="false">false</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          ) : manyOrJsonInput ? (
                                            <Textarea
                                              value={runtimeRawValue}
                                              disabled={bindingsLocked}
                                              onChange={(event) => {
                                                setRuntimeBindingValidationError(null);
                                                setRuntimeBindingInputsByRowId((current) =>
                                                  updateRuntimeBindingDraftState({
                                                    current,
                                                    rowId: row.invokeWorkUnitTargetExecutionId,
                                                    destinationDefinitionId:
                                                      binding.destinationDefinitionId,
                                                    value: event.target.value,
                                                  }),
                                                );
                                              }}
                                              rows={3}
                                              placeholder={
                                                binding.destinationCardinality === "many"
                                                  ? '["value-1", "value-2"]'
                                                  : '{"key":"value"}'
                                              }
                                            />
                                          ) : (
                                            <Input
                                              type={
                                                binding.destinationFactType === "number"
                                                  ? "number"
                                                  : "text"
                                              }
                                              value={runtimeRawValue}
                                              disabled={bindingsLocked}
                                              onChange={(event) => {
                                                setRuntimeBindingValidationError(null);
                                                setRuntimeBindingInputsByRowId((current) =>
                                                  updateRuntimeBindingDraftState({
                                                    current,
                                                    rowId: row.invokeWorkUnitTargetExecutionId,
                                                    destinationDefinitionId:
                                                      binding.destinationDefinitionId,
                                                    value: event.target.value,
                                                  }),
                                                );
                                              }}
                                              placeholder="Enter runtime value"
                                            />
                                          )}
                                        </div>
                                      )}

                                      {hasSavedDraftValue ? (
                                        <div className="space-y-2 border border-violet-500/30 bg-violet-500/10 p-2">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <DetailLabel>Saved mapping value</DetailLabel>
                                            <ExecutionBadge label="frozen draft" tone="violet" />
                                          </div>
                                          {binding.destinationKind === "artifact_slot" ? (
                                            <InvokeArtifactPathList
                                              value={savedDraftValue}
                                              cardinality={binding.destinationCardinality}
                                              projectRootPath={projectRootPath}
                                            />
                                          ) : (
                                            <pre className="whitespace-pre-wrap break-words text-xs text-foreground">
                                              {formatUnknown(savedDraftValue)}
                                            </pre>
                                          )}
                                        </div>
                                      ) : null}

                                      {binding.sourceKind !== "runtime" ? (
                                        <div className="space-y-2 border border-sky-500/30 bg-sky-500/10 p-2">
                                          <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="space-y-1">
                                              <DetailLabel>Available refill value</DetailLabel>
                                              <p className="text-[11px] text-muted-foreground">
                                                Re-apply the authored mapping source without
                                                changing the saved draft until you save again.
                                              </p>
                                            </div>
                                            {!bindingsLocked ? (
                                              <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={!hasAuthoredPrefillValue}
                                                aria-label={getInvokeSourceRefillAriaLabel(binding)}
                                                onClick={() => {
                                                  if (!hasAuthoredPrefillValue) {
                                                    return;
                                                  }

                                                  setRuntimeBindingValidationError(null);
                                                  setRuntimeBindingInputsByRowId((current) =>
                                                    updateRuntimeBindingDraftState({
                                                      current,
                                                      rowId: row.invokeWorkUnitTargetExecutionId,
                                                      destinationDefinitionId:
                                                        binding.destinationDefinitionId,
                                                      value: serializeInvokeBindingDraftValue(
                                                        binding,
                                                        authoredPrefillValue,
                                                      ),
                                                    }),
                                                  );
                                                }}
                                              >
                                                {getInvokeSourceRefillLabel(binding)}
                                              </Button>
                                            ) : null}
                                          </div>
                                          {hasAuthoredPrefillValue ? (
                                            binding.destinationKind === "artifact_slot" ? (
                                              <InvokeArtifactPathList
                                                value={authoredPrefillValue}
                                                cardinality={binding.destinationCardinality}
                                                projectRootPath={projectRootPath}
                                              />
                                            ) : (
                                              <pre className="whitespace-pre-wrap break-words text-xs text-foreground">
                                                {formatUnknown(authoredPrefillValue)}
                                              </pre>
                                            )
                                          ) : (
                                            <pre className="whitespace-pre-wrap break-words text-xs text-foreground">
                                              No source value is available to refill right now.
                                            </pre>
                                          )}
                                        </div>
                                      ) : null}
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          ) : null}
                        </CardContent>

                        <CardFooter className="justify-end gap-2">
                          {startAction ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={
                                isBusy ||
                                !startAction.enabled ||
                                unsupportedRuntimeBindingsReason !== null ||
                                selectedWorkflowId.length === 0
                              }
                              onClick={() => {
                                if (!selectedWorkflowId) {
                                  return;
                                }

                                if (unsupportedRuntimeBindingsReason) {
                                  setRuntimeBindingValidationError(
                                    unsupportedRuntimeBindingsReason,
                                  );
                                  return;
                                }

                                const payload = buildInvokeWorkUnitRuntimePayload({
                                  rowRuntimeInputs,
                                  editableBindings,
                                });
                                if (!payload.ok) {
                                  setRuntimeBindingValidationError(payload.message);
                                  return;
                                }

                                setRuntimeBindingValidationError(null);

                                startWorkUnitMutation.mutate({
                                  projectId,
                                  stepExecutionId: shell.stepExecutionId,
                                  invokeWorkUnitTargetExecutionId:
                                    startAction.invokeWorkUnitTargetExecutionId,
                                  workflowDefinitionId: selectedWorkflowId,
                                  ...(payload.runtimeFactValues
                                    ? { runtimeFactValues: payload.runtimeFactValues }
                                    : {}),
                                  ...(payload.runtimeArtifactValues
                                    ? { runtimeArtifactValues: payload.runtimeArtifactValues }
                                    : {}),
                                });
                              }}
                            >
                              Start work unit
                            </Button>
                          ) : null}

                          {!bindingsLocked ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isBusy || unsupportedRuntimeBindingsReason !== null}
                              onClick={() => {
                                if (unsupportedRuntimeBindingsReason) {
                                  setRuntimeBindingValidationError(
                                    unsupportedRuntimeBindingsReason,
                                  );
                                  return;
                                }

                                const payload = buildInvokeWorkUnitRuntimePayload({
                                  rowRuntimeInputs,
                                  editableBindings,
                                });
                                if (!payload.ok) {
                                  setRuntimeBindingValidationError(payload.message);
                                  return;
                                }

                                setRuntimeBindingValidationError(null);
                                saveWorkUnitDraftMutation.mutate({
                                  projectId,
                                  stepExecutionId: shell.stepExecutionId,
                                  invokeWorkUnitTargetExecutionId:
                                    row.invokeWorkUnitTargetExecutionId,
                                  ...(payload.runtimeFactValues
                                    ? { runtimeFactValues: payload.runtimeFactValues }
                                    : {}),
                                  ...(payload.runtimeArtifactValues
                                    ? { runtimeArtifactValues: payload.runtimeArtifactValues }
                                    : {}),
                                });
                              }}
                            >
                              Save mappings
                            </Button>
                          ) : null}

                          {row.actions.openWorkUnit ? (
                            <Link
                              to="/projects/$projectId/work-units/$projectWorkUnitId"
                              params={{
                                projectId,
                                projectWorkUnitId: row.actions.openWorkUnit.projectWorkUnitId,
                              }}
                              search={{ q: "" }}
                              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                            >
                              Open work unit
                            </Link>
                          ) : null}

                          {row.actions.openTransition ? (
                            <Link
                              to="/projects/$projectId/transition-executions/$transitionExecutionId"
                              params={{
                                projectId,
                                transitionExecutionId:
                                  row.actions.openTransition.transitionExecutionId,
                              }}
                              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                            >
                              Open transition
                            </Link>
                          ) : null}

                          {row.actions.openWorkflow ? (
                            <Link
                              to="/projects/$projectId/workflow-executions/$workflowExecutionId"
                              params={{
                                projectId,
                                workflowExecutionId: row.actions.openWorkflow.workflowExecutionId,
                              }}
                              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                            >
                              Open workflow
                            </Link>
                          ) : null}
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}

          <div className="space-y-3 border border-border/70 bg-background/40 p-3">
            <div className="space-y-1">
              <DetailEyebrow>Propagation preview</DetailEyebrow>
              <CardTitle>Completion-time outputs</CardTitle>
              <CardDescription>{body.propagationPreview.summary}</CardDescription>
            </div>

            {body.propagationPreview.outputs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No context-fact outputs will be written when this invoke step completes.
              </p>
            ) : (
              <ul className="space-y-2">
                {body.propagationPreview.outputs.map((output) => (
                  <li
                    key={output.contextFactDefinitionId}
                    className="border border-border/70 bg-background/50 p-2"
                  >
                    <DetailPrimary>{output.label}</DetailPrimary>
                    {output.contextFactKey ? (
                      <DetailCode>{output.contextFactKey}</DetailCode>
                    ) : null}
                    <DetailCode>{output.contextFactDefinitionId}</DetailCode>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
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

  const shouldFetchTimelineHistory =
    Boolean(detail.body.harnessBinding.sessionId) && detail.body.timelinePreview.length > 0;
  const timelineHistoryQuery = useQuery({
    ...orpc.project.getAgentStepTimelinePage.queryOptions({
      input: {
        projectId,
        stepExecutionId: shell.stepExecutionId,
        limit: 1000,
      },
    }),
    queryKey: agentStepTimelineQueryKey(projectId, shell.stepExecutionId),
    enabled: shouldFetchTimelineHistory,
  });

  const [composerText, setComposerText] = useState("");
  const [agentSelectorOpen, setAgentSelectorOpen] = useState(false);
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [sidePanelOpen, setSidePanelOpen] = useState(true);
  const [sidePanelTab, setSidePanelTab] = useState<"read" | "write">("write");
  const [metadataOpen, setMetadataOpen] = useState(false);
  const [objectiveOpen, setObjectiveOpen] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [runtimeState, setRuntimeState] = useState<AgentStepRuntimeState>(detail.body.state);
  const [timelineItems, setTimelineItems] = useState<readonly AgentStepTimelineItem[]>(
    detail.body.timelinePreview,
  );
  const [liveErrorMessage, setLiveErrorMessage] = useState<string | null>(null);
  const [copiedAttachCommand, setCopiedAttachCommand] = useState(false);
  const [pendingTurnSubmit, setPendingTurnSubmit] = useState(false);
  const timelinePreviewRef = useRef(detail.body.timelinePreview);
  const processedEventCountRef = useRef(0);
  const pendingOptimisticUserTimelineIdRef = useRef<string | null>(null);
  const pendingOptimisticUserMessageRef = useRef<string | null>(null);

  useEffect(() => {
    setRuntimeState(detail.body.state);
  }, [detail.body.state]);

  useEffect(() => {
    timelinePreviewRef.current = detail.body.timelinePreview;
  }, [detail.body.timelinePreview]);

  useEffect(() => {
    if (!shell.stepExecutionId) {
      return;
    }

    processedEventCountRef.current = 0;
    setLiveErrorMessage(null);
    setCopiedAttachCommand(false);
    setPendingTurnSubmit(false);
    pendingOptimisticUserTimelineIdRef.current = null;
    pendingOptimisticUserMessageRef.current = null;
    setTimelineItems(timelinePreviewRef.current);
  }, [shell.stepExecutionId]);

  useEffect(() => {
    if (timelineHistoryQuery.data?.items) {
      return;
    }

    setTimelineItems(detail.body.timelinePreview);
  }, [detail.body.timelinePreview, timelineHistoryQuery.data?.items]);

  useEffect(() => {
    if (!timelineHistoryQuery.data?.items) {
      return;
    }

    setTimelineItems((previous) => mergeTimelineItems(previous, timelineHistoryQuery.data.items));
  }, [timelineHistoryQuery.data?.items]);

  useEffect(() => {
    if (!timelineHistoryQuery.error) {
      return;
    }

    console.error("Failed to load full agent step timeline history.", timelineHistoryQuery.error);
  }, [timelineHistoryQuery.error]);

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
    ...(detail.body.harnessBinding.sessionId
      ? { sessionId: detail.body.harnessBinding.sessionId }
      : {}),
  });
  const shouldStreamSessionEvents =
    Boolean(detail.body.harnessBinding.sessionId) && runtimeState !== "disconnected_or_error";
  const streamUrl = shouldStreamSessionEvents
    ? buildAgentStepStreamUrl(projectId, shell.stepExecutionId)
    : null;
  const stream = useSSE<AgentStepSseEnvelope, AgentStepSseEnvelope>(streamUrl, {
    eventNames: AGENT_STEP_SSE_EVENT_NAMES,
  });
  const timelineHistoryErrorMessage = timelineHistoryQuery.error
    ? toErrorMessage(timelineHistoryQuery.error)
    : null;
  const isTimelineHistoryLoading = shouldFetchTimelineHistory && timelineHistoryQuery.isLoading;

  useEffect(() => {
    const nextEvents = stream.events.slice(processedEventCountRef.current);
    if (nextEvents.length === 0) {
      return;
    }

    processedEventCountRef.current = stream.events.length;

    for (const event of nextEvents) {
      if (event.eventType === "bootstrap") {
        setRuntimeState(event.data.state);
        setTimelineItems((previous) => mergeTimelineItems(previous, event.data.timelineItems));
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

  const reconnectSessionMutation = useMutation(
    orpc.project.reconnectAgentStepSession.mutationOptions({
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

  const isBusy =
    startSessionMutation.isPending ||
    reconnectSessionMutation.isPending ||
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

  const completionOutcome =
    shell.status === "completed"
      ? "Completed"
      : shell.completionAction.enabled
        ? "Ready to complete"
        : (shell.completionAction.reasonIfDisabled ?? "Incomplete");

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
        projectId={projectId}
        shell={shell}
        completionOutcome={completionOutcome}
        isBusy={isBusy}
        nextStep={detail.body.nextStep}
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
                      Agent step metadata
                    </CardDescription>
                    <CardTitle className="text-sm uppercase tracking-[0.12em]">
                      Runtime context
                    </CardTitle>
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <ExecutionBadge
                        label={renderAgentStateLabel(runtimeState)}
                        {...(() => {
                          const tone = getAgentStateTone(runtimeState);
                          return tone ? { tone } : {};
                        })()}
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
                </div>
              </CardHeader>
              <CardContent className="space-y-3 py-4">
                <Collapsible open={metadataOpen} onOpenChange={setMetadataOpen}>
                  <div className="border border-border/70 bg-background/60">
                    <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground transition hover:bg-background/80">
                      <span>Metadata details</span>
                      <span className="inline-flex items-center gap-1">
                        <ChevronRight
                          className={cn(
                            "size-3.5 transition-transform",
                            metadataOpen ? "rotate-90" : "",
                          )}
                        />
                        {metadataOpen ? "Collapse" : "Expand"}
                      </span>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="space-y-3 border-t border-border/70 p-3 text-xs">
                        <Collapsible open={objectiveOpen} onOpenChange={setObjectiveOpen}>
                          <div className="border border-border/70 bg-background/50">
                            <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground transition hover:bg-background/80">
                              <span>Objective</span>
                              <span className="inline-flex items-center gap-1">
                                <ChevronRight
                                  className={cn(
                                    "size-3.5 transition-transform",
                                    objectiveOpen ? "rotate-90" : "",
                                  )}
                                />
                                {objectiveOpen ? "Collapse" : "Expand"}
                              </span>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="border-t border-border/70 p-3 text-sm leading-relaxed text-foreground">
                                {detail.body.objective}
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>

                        <Collapsible open={instructionsOpen} onOpenChange={setInstructionsOpen}>
                          <div className="border border-border/70 bg-background/50">
                            <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground transition hover:bg-background/80">
                              <span>Instructions</span>
                              <span className="inline-flex items-center gap-1">
                                <ChevronRight
                                  className={cn(
                                    "size-3.5 transition-transform",
                                    instructionsOpen ? "rotate-90" : "",
                                  )}
                                />
                                {instructionsOpen ? "Collapse" : "Expand"}
                              </span>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="border-t border-border/70 p-3 text-sm leading-relaxed text-foreground">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {detail.body.instructionsMarkdown}
                                </ReactMarkdown>
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>

                        <div className="border border-border/70 bg-background/50 p-3">
                          <p className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                            Session policy
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <ExecutionBadge label={detail.body.sessionStartPolicy} tone="amber" />
                            <ExecutionBadge
                              label={detail.body.contractBoundary.streamContract.streamName}
                              tone="sky"
                            />
                            <ExecutionBadge
                              label={detail.body.contractBoundary.version}
                              tone="slate"
                            />
                          </div>
                        </div>

                        <div className="space-y-2 border border-border/70 bg-background/50 p-3">
                          <p className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                            Harness binding
                          </p>
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
                            <div className="flex items-center justify-between gap-2 rounded-none border border-border/70 bg-background/60 px-2 py-1.5 text-[0.7rem]">
                              <span className="truncate text-muted-foreground">
                                {attachCommand}
                              </span>
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
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              </CardContent>
            </Card>

            <div
              className="grid items-stretch gap-4 transition-[grid-template-columns] duration-200 ease-out"
              style={
                {
                  gridTemplateColumns: sidePanelOpen
                    ? "minmax(0,1fr) minmax(20rem,0.9fr)"
                    : "minmax(0,1fr) minmax(0,0fr)",
                } as CSSProperties
              }
            >
              <Card
                frame="flat"
                tone="runtime"
                className="flex h-[calc(100vh-16rem)] min-h-[26rem] min-w-0 flex-col border-border/70 bg-background/40"
              >
                <CardHeader className="border-b border-border/70">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <CardDescription className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                        Timeline
                      </CardDescription>
                      <CardTitle className="text-sm">Conversation &amp; tool activity</CardTitle>
                    </div>
                    <div className="flex flex-col items-start gap-2 text-xs md:items-end">
                      {!sidePanelOpen ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          aria-label="Open context side panel"
                          onClick={() => setSidePanelOpen(true)}
                        >
                          <PanelRightOpenIcon className="size-3.5" />
                        </Button>
                      ) : null}
                      {isTimelineHistoryLoading ? (
                        <div
                          className="flex items-center gap-2 text-muted-foreground"
                          data-testid="agent-step-timeline-history-loading"
                        >
                          <Loader2Icon className="size-3.5 animate-spin" />
                          <span>Loading full history…</span>
                        </div>
                      ) : null}
                      {runtimeState === "active_streaming" ? (
                        <div className="flex items-center gap-2 text-sky-200">
                          <RadioIcon className="size-3.5 animate-pulse" />
                          <span>Streaming current turn</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="min-h-0 flex-1 space-y-3 overflow-y-auto py-4">
                  {timelineHistoryErrorMessage ? (
                    <div
                      className="flex items-start gap-2 border border-destructive/60 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                      data-testid="agent-step-timeline-history-error"
                    >
                      <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
                      <div className="space-y-1">
                        <p>Couldn&apos;t load the full timeline history.</p>
                        <p className="text-xs text-destructive/80">
                          Showing the recent preview instead. {timelineHistoryErrorMessage}
                        </p>
                      </div>
                    </div>
                  ) : null}
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
                            className={cn(
                              "border p-3",
                              entry.item.role === "assistant"
                                ? "border-violet-500/30 bg-violet-500/5"
                                : entry.item.role === "user"
                                  ? "border-sky-500/30 bg-sky-500/5"
                                  : "border-border/70 bg-background/55",
                            )}
                            data-testid={`agent-step-timeline-message-${entry.item.timelineItemId}`}
                          >
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div
                                  className={cn(
                                    "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium",
                                    entry.item.role === "assistant"
                                      ? "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
                                      : entry.item.role === "user"
                                        ? "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                                        : "bg-muted text-muted-foreground",
                                  )}
                                >
                                  {entry.item.role === "assistant" ? (
                                    <BotIcon className="size-3.5" />
                                  ) : entry.item.role === "user" ? (
                                    <UserIcon className="size-3.5" />
                                  ) : null}
                                  <span className="capitalize">{entry.item.role}</span>
                                </div>
                                <span className="text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground">
                                  {formatTimestamp(entry.item.createdAt)}
                                </span>
                              </div>
                            </div>
                            <pre
                              className={cn(
                                "whitespace-pre-wrap break-words text-sm",
                                entry.item.role === "assistant"
                                  ? "text-foreground"
                                  : "text-foreground/90",
                              )}
                            >
                              {entry.item.content}
                            </pre>
                          </article>
                        ) : entry.entryType === "thinking" ? (
                          <AiReasoning
                            key={entry.item.timelineItemId}
                            defaultOpen={true}
                            className="rounded-none border-border/70 bg-background/40"
                          >
                            <AiReasoningTrigger>
                              <span className="text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground">
                                {formatTimestamp(entry.item.createdAt)}
                              </span>
                            </AiReasoningTrigger>
                            <AiReasoningContent>
                              <AiReasoningText>{entry.item.content}</AiReasoningText>
                            </AiReasoningContent>
                          </AiReasoning>
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
                  "flex h-[calc(100vh-16rem)] min-h-[26rem] min-w-0 flex-col overflow-hidden border border-border/70 bg-background/40 transition-all duration-200 ease-out",
                  sidePanelOpen
                    ? "translate-x-0 opacity-100"
                    : "pointer-events-none -translate-x-2 border-transparent opacity-0",
                )}
                aria-hidden={!sidePanelOpen}
              >
                <div className="flex items-center justify-between gap-2 border-b border-border/70 px-3 py-2">
                  <div className="space-y-0.5">
                    <p className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                      Context side panel
                    </p>
                    <p className="text-sm font-medium">Read / Write</p>
                  </div>
                  {sidePanelOpen ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      aria-label="Close context side panel"
                      onClick={() => setSidePanelOpen(false)}
                    >
                      <PanelRightCloseIcon className="size-3.5" />
                    </Button>
                  ) : null}
                </div>

                <div
                  className={cn(
                    "min-h-0 flex-1 space-y-3 overflow-y-auto p-3 transition-opacity duration-150",
                    sidePanelOpen ? "opacity-100" : "opacity-0",
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
                              contextFactKind={entry.contextFactKind}
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
                                <ExecutionBadge
                                  label={renderContextFactKindLabel(entry.item.contextFactKind)}
                                  tone={getContextFactKindTone(entry.item.contextFactKind)}
                                />
                                <ExecutionBadge
                                  label={`${entry.group?.instances.length ?? 0} instance${
                                    (entry.group?.instances.length ?? 0) === 1 ? "" : "s"
                                  }`}
                                  tone="slate"
                                />
                                {entry.group ? (
                                  <ExecutionBadge
                                    label={entry.group.cardinality}
                                    tone={entry.group.cardinality === "many" ? "amber" : "sky"}
                                  />
                                ) : null}
                                {getWriteActionBadges({
                                  kind: entry.item.contextFactKind,
                                  instanceCount: entry.group?.instances.length ?? 0,
                                }).map((action) => (
                                  <ExecutionBadge
                                    key={`${entry.item.writeItemId}-${action.label}`}
                                    label={action.label}
                                    tone={action.tone}
                                  />
                                ))}
                              </div>
                              <h3 className="text-sm font-medium text-foreground">
                                {renderContextFactLabel(
                                  entry.group,
                                  entry.item.contextFactDefinitionId,
                                )}
                              </h3>
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
                                contextFactKind={entry.item.contextFactKind}
                                writeItem={entry.item}
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
                      disabled={isBusy}
                      onClick={() => {
                        const hasBoundSession = Boolean(detail.body.harnessBinding.sessionId);
                        if (hasBoundSession) {
                          reconnectSessionMutation.mutate({
                            projectId,
                            stepExecutionId: shell.stepExecutionId,
                          });
                          return;
                        }

                        startSessionMutation.mutate({
                          projectId,
                          stepExecutionId: shell.stepExecutionId,
                        });
                      }}
                      data-testid="agent-step-start-session"
                    >
                      {startSessionMutation.isPending ? (
                        <Loader2Icon className="size-3.5 animate-spin" />
                      ) : reconnectSessionMutation.isPending ? (
                        <Loader2Icon className="size-3.5 animate-spin" />
                      ) : runtimeState === "disconnected_or_error" ||
                        runtimeState === "completed" ? (
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
  errorComponent: StepExecutionRouteErrorComponent,
  component: RuntimeFormStepDetailRoute,
});

function StepExecutionRouteErrorState(props: {
  projectId: string;
  stepExecutionId: string;
  error: unknown;
  onRetry?: () => void;
}) {
  return (
    <MethodologyWorkspaceShell
      title="Step execution detail"
      stateLabel="failed"
      segments={[
        { label: "Projects", to: "/projects" },
        {
          label: props.projectId,
          to: "/projects/$projectId",
          params: { projectId: props.projectId },
        },
        { label: props.stepExecutionId },
      ]}
    >
      <RouteErrorCard
        title="Step execution detail failed"
        description="This view could not be rendered cleanly. Use one of these links to recover even inside Electron."
        detail={toErrorMessage(props.error)}
        onRetry={props.onRetry}
        actions={
          <>
            <Link className={buttonVariants({ variant: "outline" })} to="/projects">
              Projects
            </Link>
            <Link
              className={buttonVariants({ variant: "outline" })}
              to="/projects/$projectId"
              params={{ projectId: props.projectId }}
            >
              Project overview
            </Link>
          </>
        }
      />
    </MethodologyWorkspaceShell>
  );
}

function StepExecutionRouteErrorComponent(props: { error: unknown; reset: () => void }) {
  const { projectId, stepExecutionId } = Route.useParams();

  return (
    <StepExecutionRouteErrorState
      projectId={projectId}
      stepExecutionId={stepExecutionId}
      error={props.error}
      onRetry={props.reset}
    />
  );
}

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
        <StepExecutionRouteErrorState
          projectId={projectId}
          stepExecutionId={stepExecutionId}
          error={combinedError}
          onRetry={() => {
            void stepDetailQuery.refetch();
            if (isAgentStep) {
              void agentDetailQuery.refetch();
            }
          }}
        />
      ) : detail ? (
        detail.body.stepType === "form" ? (
          <FormInteractionSurface
            projectId={projectId}
            detail={detail as typeof detail & { body: FormBody }}
          />
        ) : detail.body.stepType === "action" ? (
          <ActionInteractionSurface
            projectId={projectId}
            detail={detail as typeof detail & { body: ActionBody }}
          />
        ) : detail.body.stepType === "branch" ? (
          <BranchInteractionSurface
            projectId={projectId}
            detail={detail as typeof detail & { body: BranchBody }}
          />
        ) : detail.body.stepType === "invoke" ? (
          <InvokeInteractionSurface
            projectId={projectId}
            detail={detail as typeof detail & { body: InvokeBody }}
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
