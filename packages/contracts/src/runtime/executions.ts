import * as Schema from "effect/Schema";

import { FactCardinality, FactType, PathValidationConfig } from "../methodology/fact.js";
import {
  ActionStepExecutionMode,
  DeferredWorkflowStepType,
  FormFieldUiMultiplicityMode,
  FormStepPayload,
  InvokeSourceMode,
  InvokeTargetKind,
  WorkflowContextFactKind,
} from "../methodology/workflow.js";
import { RuntimeProjectFactDetailDefinition } from "./facts.js";
import { RuntimeConditionEvaluationTree } from "./conditions.js";
import { TransitionExecutionStatus, WorkflowExecutionStatus } from "./status.js";
import { RuntimeWorkUnitFactDetailDefinition, RuntimeWorkUnitIdentity } from "./work-units.js";

export const PROJECT_EXECUTIONS_LEGACY_COMPATIBILITY_MODES = ["legacy_read_only"] as const;
export const ProjectExecutionsLegacyCompatibilityMode = Schema.Literal(
  ...PROJECT_EXECUTIONS_LEGACY_COMPATIBILITY_MODES,
);
export type ProjectExecutionsLegacyCompatibilityMode =
  typeof ProjectExecutionsLegacyCompatibilityMode.Type;

export const RuntimeExcludedL3Entity = Schema.Literal("step_executions");
export type RuntimeExcludedL3Entity = typeof RuntimeExcludedL3Entity.Type;

export const RuntimeWorkflowStepType = Schema.Literal(
  "form",
  "agent",
  "action",
  "invoke",
  "branch",
  "display",
);
export type RuntimeWorkflowStepType = typeof RuntimeWorkflowStepType.Type;

export const RuntimeWorkflowStepDefinitionSummary = Schema.Struct({
  stepDefinitionId: Schema.NonEmptyString,
  stepType: RuntimeWorkflowStepType,
  stepKey: Schema.optional(Schema.String),
  stepLabel: Schema.optional(Schema.String),
});
export type RuntimeWorkflowStepDefinitionSummary = typeof RuntimeWorkflowStepDefinitionSummary.Type;

export const RuntimeWorkflowStepExecutionSummary = Schema.Struct({
  stepExecutionId: Schema.NonEmptyString,
  stepDefinitionId: Schema.NonEmptyString,
  stepType: RuntimeWorkflowStepType,
  status: Schema.Literal("active", "completed"),
  activatedAt: Schema.String,
  completedAt: Schema.optional(Schema.String),
  target: Schema.Struct({
    page: Schema.Literal("step-execution-detail"),
    stepExecutionId: Schema.NonEmptyString,
  }),
});
export type RuntimeWorkflowStepExecutionSummary = typeof RuntimeWorkflowStepExecutionSummary.Type;

export const RuntimeWorkflowStepSurface = Schema.Union(
  Schema.Struct({
    state: Schema.Literal("entry_pending"),
    entryStep: RuntimeWorkflowStepDefinitionSummary,
  }),
  Schema.Struct({
    state: Schema.Literal("active_step"),
    activeStep: RuntimeWorkflowStepExecutionSummary,
  }),
  Schema.Struct({
    state: Schema.Literal("next_pending"),
    afterStep: RuntimeWorkflowStepExecutionSummary,
    nextStep: RuntimeWorkflowStepDefinitionSummary,
  }),
  Schema.Struct({
    state: Schema.Literal("terminal_no_next_step"),
    terminalStep: Schema.optional(RuntimeWorkflowStepExecutionSummary),
  }),
  Schema.Struct({
    state: Schema.Literal("invalid_definition"),
    reason: Schema.Literal("missing_entry_step", "ambiguous_entry_step"),
  }),
);
export type RuntimeWorkflowStepSurface = typeof RuntimeWorkflowStepSurface.Type;

export const RuntimeWorkflowContextFactInstance = Schema.Struct({
  contextFactInstanceId: Schema.optional(Schema.NonEmptyString),
  instanceOrder: Schema.Number,
  valueJson: Schema.Unknown,
  sourceStepExecutionId: Schema.optional(Schema.NonEmptyString),
  recordedAt: Schema.optional(Schema.String),
});
export type RuntimeWorkflowContextFactInstance = typeof RuntimeWorkflowContextFactInstance.Type;

export const RuntimeWorkflowContextFactGroup = Schema.Struct({
  contextFactDefinitionId: Schema.NonEmptyString,
  definitionKey: Schema.optional(Schema.String),
  definitionLabel: Schema.optional(Schema.String),
  definitionDescriptionJson: Schema.optional(Schema.Unknown),
  instances: Schema.Array(RuntimeWorkflowContextFactInstance),
});
export type RuntimeWorkflowContextFactGroup = typeof RuntimeWorkflowContextFactGroup.Type;

export const RuntimeWorkflowContextFactsSection = Schema.Struct({
  mode: Schema.Literal("read_only_by_definition"),
  groups: Schema.Array(RuntimeWorkflowContextFactGroup),
});
export type RuntimeWorkflowContextFactsSection = typeof RuntimeWorkflowContextFactsSection.Type;

export const RuntimeStepExecutionDto = Schema.Union(
  Schema.Struct({
    stepExecutionId: Schema.NonEmptyString,
    stepType: Schema.Literal("form"),
    mode: Schema.Literal("captured"),
    formStep: FormStepPayload,
    submittedAt: Schema.optional(Schema.String),
  }),
  Schema.Struct({
    stepExecutionId: Schema.NonEmptyString,
    stepType: DeferredWorkflowStepType,
    mode: Schema.Literal("deferred"),
    defaultMessage: Schema.String,
  }),
);
export type RuntimeStepExecutionDto = typeof RuntimeStepExecutionDto.Type;

export const SubmitFormStepExecutionInput = Schema.Struct({
  projectId: Schema.NonEmptyString,
  workflowExecutionId: Schema.NonEmptyString,
  stepExecutionId: Schema.NonEmptyString,
  values: Schema.Record({
    key: Schema.String,
    value: Schema.Unknown,
  }),
});
export type SubmitFormStepExecutionInput = typeof SubmitFormStepExecutionInput.Type;

export const SubmitFormStepExecutionOutput = Schema.Struct({
  stepExecutionId: Schema.NonEmptyString,
  status: Schema.Literal("captured"),
});
export type SubmitFormStepExecutionOutput = typeof SubmitFormStepExecutionOutput.Type;

export const ProjectExecutionsCompatibility = Schema.Struct({
  table: Schema.Literal("project_executions"),
  mode: ProjectExecutionsLegacyCompatibilityMode,
  writesAllowed: Schema.Literal(false),
});
export type ProjectExecutionsCompatibility = typeof ProjectExecutionsCompatibility.Type;

export const GetTransitionExecutionDetailInput = Schema.Struct({
  projectId: Schema.String,
  projectWorkUnitId: Schema.String,
  transitionExecutionId: Schema.String,
});
export type GetTransitionExecutionDetailInput = typeof GetTransitionExecutionDetailInput.Type;

export const RuntimeTransitionDefinitionSummary = Schema.Struct({
  transitionId: Schema.String,
  transitionKey: Schema.String,
  transitionName: Schema.String,
  description: Schema.optional(Schema.Unknown),
  fromStateId: Schema.optional(Schema.String),
  fromStateKey: Schema.optional(Schema.String),
  fromStateLabel: Schema.optional(Schema.String),
  toStateId: Schema.String,
  toStateKey: Schema.String,
  toStateLabel: Schema.String,
  boundWorkflows: Schema.Array(
    Schema.Struct({
      workflowId: Schema.String,
      workflowKey: Schema.String,
      workflowName: Schema.String,
    }),
  ),
  startConditionSets: Schema.Array(Schema.Unknown),
  completionConditionSets: Schema.Array(Schema.Unknown),
});
export type RuntimeTransitionDefinitionSummary = typeof RuntimeTransitionDefinitionSummary.Type;

export const RuntimeWorkflowExecutionSummary = Schema.Struct({
  workflowExecutionId: Schema.String,
  workflowId: Schema.String,
  workflowKey: Schema.String,
  workflowName: Schema.String,
  status: WorkflowExecutionStatus,
  startedAt: Schema.String,
  completedAt: Schema.optional(Schema.String),
  supersededAt: Schema.optional(Schema.String),
  supersedesWorkflowExecutionId: Schema.optional(Schema.String),
  target: Schema.Struct({
    page: Schema.Literal("workflow-execution-detail"),
    workflowExecutionId: Schema.String,
  }),
});
export type RuntimeWorkflowExecutionSummary = typeof RuntimeWorkflowExecutionSummary.Type;

export const GetTransitionExecutionDetailOutput = Schema.Struct({
  workUnit: RuntimeWorkUnitIdentity,
  transitionExecution: Schema.Struct({
    transitionExecutionId: Schema.String,
    status: TransitionExecutionStatus,
    startedAt: Schema.String,
    completedAt: Schema.optional(Schema.String),
    supersededAt: Schema.optional(Schema.String),
    supersedesTransitionExecutionId: Schema.optional(Schema.String),
  }),
  transitionDefinition: RuntimeTransitionDefinitionSummary,
  startGate: Schema.Struct({
    mode: Schema.Literal("informational"),
    startedAt: Schema.String,
    note: Schema.String,
  }),
  currentPrimaryWorkflow: Schema.optional(RuntimeWorkflowExecutionSummary),
  primaryAttemptHistory: Schema.Array(RuntimeWorkflowExecutionSummary),
  supportingWorkflows: Schema.Array(RuntimeWorkflowExecutionSummary),
  completionGate: Schema.Struct({
    panelState: Schema.Literal(
      "workflow_running",
      "passing",
      "failing",
      "completed_read_only",
      "superseded_read_only",
    ),
    lastEvaluatedAt: Schema.optional(Schema.String),
    completedAt: Schema.optional(Schema.String),
    firstBlockingReason: Schema.optional(Schema.String),
    conditionTree: Schema.optional(Schema.Unknown),
    evaluationTree: Schema.optional(RuntimeConditionEvaluationTree),
    actions: Schema.optional(
      Schema.Struct({
        completeTransition: Schema.optional(
          Schema.Struct({
            kind: Schema.Literal("complete_transition_execution"),
            transitionExecutionId: Schema.String,
          }),
        ),
        chooseAnotherPrimaryWorkflow: Schema.optional(
          Schema.Struct({
            kind: Schema.Literal("choose_primary_workflow_for_transition_execution"),
            transitionExecutionId: Schema.String,
          }),
        ),
      }),
    ),
  }),
});
export type GetTransitionExecutionDetailOutput = typeof GetTransitionExecutionDetailOutput.Type;

export const GetWorkflowExecutionDetailInput = Schema.Struct({
  projectId: Schema.String,
  workflowExecutionId: Schema.String,
});
export type GetWorkflowExecutionDetailInput = typeof GetWorkflowExecutionDetailInput.Type;

export const GetWorkflowExecutionDetailOutput = Schema.Struct({
  workflowExecution: Schema.Struct({
    workflowExecutionId: Schema.String,
    workflowId: Schema.String,
    workflowKey: Schema.String,
    workflowName: Schema.String,
    workflowRole: Schema.Literal("primary", "supporting"),
    status: WorkflowExecutionStatus,
    startedAt: Schema.String,
    completedAt: Schema.optional(Schema.String),
    supersededAt: Schema.optional(Schema.String),
    supersedesWorkflowExecutionId: Schema.optional(Schema.String),
  }),
  workUnit: RuntimeWorkUnitIdentity.pipe(
    Schema.extend(
      Schema.Struct({
        target: Schema.Struct({
          page: Schema.Literal("work-unit-overview"),
          projectWorkUnitId: Schema.String,
        }),
      }),
    ),
  ),
  parentTransition: Schema.Struct({
    transitionExecutionId: Schema.String,
    transitionId: Schema.String,
    transitionKey: Schema.String,
    transitionName: Schema.String,
    status: TransitionExecutionStatus,
    target: Schema.Struct({
      page: Schema.Literal("transition-execution-detail"),
      transitionExecutionId: Schema.String,
    }),
  }),
  lineage: Schema.Struct({
    supersedesWorkflowExecutionId: Schema.optional(Schema.String),
    supersededByWorkflowExecutionId: Schema.optional(Schema.String),
    previousPrimaryAttempts: Schema.optional(Schema.Array(RuntimeWorkflowExecutionSummary)),
  }),
  retryAction: Schema.optional(
    Schema.Struct({
      kind: Schema.Literal("retry_same_workflow"),
      enabled: Schema.Boolean,
      reasonIfDisabled: Schema.optional(Schema.String),
      parentTransitionExecutionId: Schema.optional(Schema.String),
    }),
  ),
  completeAction: Schema.optional(
    Schema.Struct({
      kind: Schema.Literal("complete_workflow_execution"),
      enabled: Schema.Boolean,
      reasonIfDisabled: Schema.optional(Schema.String),
    }),
  ),
  impactDialog: Schema.optional(
    Schema.Struct({
      requiredForRetry: Schema.Boolean,
      affectedEntitiesSummary: Schema.Struct({
        transitionExecutionId: Schema.String,
        workflowExecutionIds: Schema.Array(Schema.String),
        futureStepExecutionCount: Schema.optional(Schema.Number),
      }),
    }),
  ),
  stepSurface: RuntimeWorkflowStepSurface,
  workflowContextFacts: RuntimeWorkflowContextFactsSection,
});
export type GetWorkflowExecutionDetailOutput = typeof GetWorkflowExecutionDetailOutput.Type;

export const GetRuntimeStepExecutionDetailInput = Schema.Struct({
  projectId: Schema.String,
  stepExecutionId: Schema.String,
});
export type GetRuntimeStepExecutionDetailInput = typeof GetRuntimeStepExecutionDetailInput.Type;

export const RuntimeStepExecutionDetailShell = Schema.Struct({
  stepExecutionId: Schema.NonEmptyString,
  workflowExecutionId: Schema.NonEmptyString,
  stepDefinitionId: Schema.NonEmptyString,
  stepType: RuntimeWorkflowStepType,
  status: Schema.Literal("active", "completed"),
  activatedAt: Schema.String,
  completedAt: Schema.optional(Schema.String),
  completionAction: Schema.Struct({
    kind: Schema.Literal("complete_step_execution"),
    visible: Schema.Boolean,
    enabled: Schema.Boolean,
    reasonIfDisabled: Schema.optional(Schema.String),
  }),
});
export type RuntimeStepExecutionDetailShell = typeof RuntimeStepExecutionDetailShell.Type;

export const ACTION_STEP_RUNTIME_ROW_STATUSES = [
  "running",
  "succeeded",
  "needs_attention",
] as const;
export const ActionStepRuntimeRowStatus = Schema.Literal(...ACTION_STEP_RUNTIME_ROW_STATUSES);
export type ActionStepRuntimeRowStatus = typeof ActionStepRuntimeRowStatus.Type;

export const ACTION_STEP_RUNTIME_ITEM_STATUSES = [
  "running",
  "succeeded",
  "failed",
  "needs_attention",
] as const;
export const ActionStepRuntimeItemStatus = Schema.Literal(...ACTION_STEP_RUNTIME_ITEM_STATUSES);
export type ActionStepRuntimeItemStatus = typeof ActionStepRuntimeItemStatus.Type;

export const ActionStepRenderableActionStatus = Schema.Literal(
  "not_started",
  "skipped",
  ...ACTION_STEP_RUNTIME_ROW_STATUSES,
);
export type ActionStepRenderableActionStatus = typeof ActionStepRenderableActionStatus.Type;

export const ActionStepRenderableItemStatus = Schema.Literal(
  "not_started",
  "skipped",
  ...ACTION_STEP_RUNTIME_ITEM_STATUSES,
);
export type ActionStepRenderableItemStatus = typeof ActionStepRenderableItemStatus.Type;

// Plan A boundary: runtime rows stay lazy and manual completion stays generic. No auto-complete,
// no extra action kinds, no richer invoke draft-spec payload assumptions, and no raw-write
// hardening contracts are introduced here; those expansions are deferred to Plan B.
export const ACTION_STEP_RUNTIME_RULES = [
  "lazy_runtime_rows",
  "manual_completion_only",
  "idempotent_duplicate_run_retry",
  "propagation_kind_only",
] as const;

export const RuntimeActionAffectedTarget = Schema.Struct({
  targetKind: Schema.Literal("external_fact", "artifact"),
  targetState: Schema.optional(Schema.Literal("exists", "missing")),
  targetId: Schema.optional(Schema.NonEmptyString),
  label: Schema.optional(Schema.String),
});
export type RuntimeActionAffectedTarget = typeof RuntimeActionAffectedTarget.Type;

export const RuntimeActionPropagationItemDetail = Schema.Struct({
  itemId: Schema.NonEmptyString,
  itemKey: Schema.NonEmptyString,
  label: Schema.optional(Schema.String),
  sortOrder: Schema.Number,
  targetContextFactDefinitionId: Schema.NonEmptyString,
  targetContextFactKey: Schema.optional(Schema.String),
  status: ActionStepRenderableItemStatus,
  resultSummaryJson: Schema.optional(Schema.Unknown),
  resultJson: Schema.optional(Schema.Unknown),
  affectedTargets: Schema.Array(RuntimeActionAffectedTarget),
  recoveryAction: Schema.optional(
    Schema.Struct({
      kind: Schema.Literal("recreate_bound_target_from_context_value"),
      enabled: Schema.Boolean,
      reasonIfDisabled: Schema.optional(Schema.String),
    }),
  ),
  skipAction: Schema.Struct({
    kind: Schema.Literal("skip_action_step_action_items"),
    enabled: Schema.Boolean,
    reasonIfDisabled: Schema.optional(Schema.String),
    actionId: Schema.NonEmptyString,
    itemId: Schema.NonEmptyString,
  }),
});
export type RuntimeActionPropagationItemDetail = typeof RuntimeActionPropagationItemDetail.Type;

export const RuntimeActionExecutionRow = Schema.Struct({
  actionId: Schema.NonEmptyString,
  actionKey: Schema.NonEmptyString,
  label: Schema.optional(Schema.String),
  enabled: Schema.Boolean,
  sortOrder: Schema.Number,
  actionKind: Schema.Literal("propagation"),
  contextFactDefinitionId: Schema.NonEmptyString,
  contextFactKey: Schema.optional(Schema.String),
  contextFactKind: Schema.Literal(
    "definition_backed_external_fact",
    "bound_external_fact",
    "artifact_reference_fact",
  ),
  status: ActionStepRenderableActionStatus,
  resultSummaryJson: Schema.optional(Schema.Unknown),
  resultJson: Schema.optional(Schema.Unknown),
  items: Schema.Array(RuntimeActionPropagationItemDetail),
  runAction: Schema.Struct({
    kind: Schema.Literal("run_action_step_actions"),
    enabled: Schema.Boolean,
    reasonIfDisabled: Schema.optional(Schema.String),
    actionId: Schema.NonEmptyString,
  }),
  retryAction: Schema.Struct({
    kind: Schema.Literal("retry_action_step_actions"),
    enabled: Schema.Boolean,
    reasonIfDisabled: Schema.optional(Schema.String),
    actionId: Schema.NonEmptyString,
  }),
  skipAction: Schema.Struct({
    kind: Schema.Literal("skip_action_step_actions"),
    enabled: Schema.Boolean,
    reasonIfDisabled: Schema.optional(Schema.String),
    actionId: Schema.NonEmptyString,
  }),
});
export type RuntimeActionExecutionRow = typeof RuntimeActionExecutionRow.Type;

export const RuntimeActionCompletionSummary = Schema.Struct({
  mode: Schema.Literal("manual"),
  eligible: Schema.Boolean,
  requiresAtLeastOneSucceededAction: Schema.Literal(true),
  blockedByRunningActions: Schema.Literal(true),
  reasonIfIneligible: Schema.optional(Schema.String),
});
export type RuntimeActionCompletionSummary = typeof RuntimeActionCompletionSummary.Type;

export const RuntimeActionStepExecutionDetailBody = Schema.Struct({
  stepType: Schema.Literal("action"),
  executionMode: ActionStepExecutionMode,
  runtimeRowPolicy: Schema.Literal("lazy_on_first_execution"),
  duplicateRunPolicy: Schema.Literal("idempotent_noop"),
  duplicateRetryPolicy: Schema.Literal("idempotent_noop"),
  completionSummary: RuntimeActionCompletionSummary,
  actions: Schema.Array(RuntimeActionExecutionRow),
});
export type RuntimeActionStepExecutionDetailBody = typeof RuntimeActionStepExecutionDetailBody.Type;

export const BRANCH_RUNTIME_RESOLUTION_RULES = [
  "evaluate_all_conditionals_first",
  "ui_suggestion_prefers_first_valid_conditional_by_sort_order_else_default",
  "persisted_selected_target_governs_completion",
  "completion_blocked_without_valid_persisted_selection",
  "user_may_choose_any_valid_route",
  "no_valid_route_and_no_default_blocks_branch",
] as const;

export const RuntimeBranchConditionalRouteDetail = Schema.Struct({
  routeId: Schema.NonEmptyString,
  targetStepId: Schema.NonEmptyString,
  sortOrder: Schema.Number,
  isValid: Schema.Boolean,
  conditionMode: Schema.Literal("all", "any"),
  evaluationTree: Schema.optional(RuntimeConditionEvaluationTree),
});
export type RuntimeBranchConditionalRouteDetail = typeof RuntimeBranchConditionalRouteDetail.Type;

export const RuntimeBranchPersistedSelection = Schema.Struct({
  selectedTargetStepId: Schema.NullOr(Schema.NonEmptyString),
  isValid: Schema.Boolean,
  savedAt: Schema.optional(Schema.String),
  blockingReason: Schema.optional(Schema.String),
});
export type RuntimeBranchPersistedSelection = typeof RuntimeBranchPersistedSelection.Type;

export const RuntimeBranchSuggestion = Schema.Struct({
  suggestedTargetStepId: Schema.NullOr(Schema.NonEmptyString),
  source: Schema.Literal("conditional_route", "default_target", "none"),
  routeId: Schema.optional(Schema.NonEmptyString),
});
export type RuntimeBranchSuggestion = typeof RuntimeBranchSuggestion.Type;

export const RuntimeBranchCompletionSummary = Schema.Struct({
  mode: Schema.Literal("explicit_saved_selection"),
  eligible: Schema.Boolean,
  reasonIfIneligible: Schema.optional(Schema.String),
});
export type RuntimeBranchCompletionSummary = typeof RuntimeBranchCompletionSummary.Type;

// Plan A branch resolution is intentionally narrow: UI suggestions are advisory only and saved
// `selectedTargetStepId` is the sole completion authority. Branch streaming, append-only selection
// history, and broader evaluator/value-model convergence remain deferred to Plan B.
export const RuntimeBranchStepExecutionDetailBody = Schema.Struct({
  stepType: Schema.Literal("branch"),
  resolutionContract: Schema.Literal("explicit_save_selection_v1"),
  persistedSelection: RuntimeBranchPersistedSelection,
  suggestion: RuntimeBranchSuggestion,
  conditionalRoutes: Schema.Array(RuntimeBranchConditionalRouteDetail),
  defaultTargetStepId: Schema.NullOr(Schema.NonEmptyString),
  saveSelectionAction: Schema.Struct({
    kind: Schema.Literal("save_branch_step_selection"),
    enabled: Schema.Boolean,
    reasonIfDisabled: Schema.optional(Schema.String),
  }),
  completionSummary: RuntimeBranchCompletionSummary,
});
export type RuntimeBranchStepExecutionDetailBody = typeof RuntimeBranchStepExecutionDetailBody.Type;

export const RuntimeFormFieldWidgetControl = Schema.Literal(
  "text",
  "select",
  "path",
  "checkbox",
  "number",
  "json",
  "reference",
  "workflow-reference",
  "artifact-reference",
  "draft-spec",
);
export type RuntimeFormFieldWidgetControl = typeof RuntimeFormFieldWidgetControl.Type;

export const RuntimeFormFieldOption = Schema.Struct({
  value: Schema.Unknown,
  label: Schema.String,
  description: Schema.optional(Schema.String),
});
export type RuntimeFormFieldOption = typeof RuntimeFormFieldOption.Type;

export const RuntimeFormNestedField = Schema.Struct({
  key: Schema.NonEmptyString,
  label: Schema.String,
  factType: FactType,
  cardinality: FactCardinality,
  required: Schema.Boolean,
  description: Schema.optional(Schema.String),
  validation: Schema.optional(Schema.Unknown),
  options: Schema.optional(Schema.Array(RuntimeFormFieldOption)),
  emptyState: Schema.optional(Schema.String),
  workUnitTypeKey: Schema.optional(Schema.NonEmptyString),
});
export type RuntimeFormNestedField = typeof RuntimeFormNestedField.Type;

export const RuntimeFormResolvedFieldWidget = Schema.Struct({
  control: RuntimeFormFieldWidgetControl,
  valueType: Schema.optional(FactType),
  cardinality: FactCardinality,
  renderedMultiplicity: FormFieldUiMultiplicityMode,
  options: Schema.optional(Schema.Array(RuntimeFormFieldOption)),
  pathConfig: Schema.optional(PathValidationConfig),
  nestedFields: Schema.optional(Schema.Array(RuntimeFormNestedField)),
  emptyState: Schema.optional(Schema.String),
  externalBindingKey: Schema.optional(Schema.NonEmptyString),
  artifactSlotDefinitionId: Schema.optional(Schema.NonEmptyString),
  bindingLabel: Schema.optional(Schema.String),
});
export type RuntimeFormResolvedFieldWidget = typeof RuntimeFormResolvedFieldWidget.Type;

export const RuntimeFormResolvedField = Schema.Struct({
  fieldKey: Schema.NonEmptyString,
  fieldLabel: Schema.NonEmptyString,
  helpText: Schema.optional(Schema.String),
  required: Schema.Boolean,
  contextFactDefinitionId: Schema.NonEmptyString,
  contextFactKey: Schema.NonEmptyString,
  contextFactKind: WorkflowContextFactKind,
  widget: RuntimeFormResolvedFieldWidget,
});
export type RuntimeFormResolvedField = typeof RuntimeFormResolvedField.Type;

export const RuntimeFormPageModel = Schema.Struct({
  formKey: Schema.NonEmptyString,
  formLabel: Schema.optional(Schema.String),
  descriptionMarkdown: Schema.optional(Schema.String),
  projectRootPath: Schema.optional(Schema.String),
  fields: Schema.Array(RuntimeFormResolvedField),
});
export type RuntimeFormPageModel = typeof RuntimeFormPageModel.Type;

export const RuntimeFormStepExecutionDetailBody = Schema.Struct({
  stepType: Schema.Literal("form"),
  page: RuntimeFormPageModel,
  draft: Schema.Struct({
    payloadMode: Schema.Literal("latest_only"),
    payload: Schema.Unknown,
    lastSavedAt: Schema.optional(Schema.String),
  }),
  saveDraftAction: Schema.Struct({
    kind: Schema.Literal("save_form_step_draft"),
    enabled: Schema.Boolean,
    reasonIfDisabled: Schema.optional(Schema.String),
  }),
  submission: Schema.Struct({
    payloadMode: Schema.Literal("latest_only"),
    payload: Schema.Unknown,
    submittedAt: Schema.optional(Schema.String),
  }),
  submitAction: Schema.Struct({
    kind: Schema.Literal("submit_form_step"),
    enabled: Schema.Boolean,
    reasonIfDisabled: Schema.optional(Schema.String),
  }),
  lineage: Schema.Struct({
    previousStepExecutionId: Schema.optional(Schema.NonEmptyString),
    nextStepExecutionId: Schema.optional(Schema.NonEmptyString),
  }),
});
export type RuntimeFormStepExecutionDetailBody = typeof RuntimeFormStepExecutionDetailBody.Type;

export const RuntimeDeferredStepExecutionDetailBody = Schema.Struct({
  stepType: DeferredWorkflowStepType,
  mode: Schema.Literal("deferred"),
  defaultMessage: Schema.String,
});
export type RuntimeDeferredStepExecutionDetailBody =
  typeof RuntimeDeferredStepExecutionDetailBody.Type;

export const RuntimeInvokeTargetStatus = Schema.Literal(
  "not_started",
  "blocked",
  "active",
  "completed",
  "failed",
  "unavailable",
);
export type RuntimeInvokeTargetStatus = typeof RuntimeInvokeTargetStatus.Type;

export const RuntimeInvokeWorkflowTargetRow = Schema.Struct({
  label: Schema.String,
  status: RuntimeInvokeTargetStatus,
  activeChildStepLabel: Schema.optional(Schema.String),
  invokeWorkflowTargetExecutionId: Schema.NonEmptyString,
  workflowDefinitionId: Schema.NonEmptyString,
  workflowDefinitionKey: Schema.optional(Schema.String),
  workflowDefinitionName: Schema.optional(Schema.String),
  workflowExecutionId: Schema.optional(Schema.NonEmptyString),
  actions: Schema.Struct({
    start: Schema.optional(
      Schema.Struct({
        kind: Schema.Literal("start_invoke_workflow_target"),
        enabled: Schema.Boolean,
        reasonIfDisabled: Schema.optional(Schema.String),
        invokeWorkflowTargetExecutionId: Schema.NonEmptyString,
      }),
    ),
    openWorkflow: Schema.optional(
      Schema.Struct({
        kind: Schema.Literal("open_workflow_execution"),
        workflowExecutionId: Schema.NonEmptyString,
        target: Schema.Struct({
          page: Schema.Literal("workflow-execution-detail"),
          workflowExecutionId: Schema.NonEmptyString,
        }),
      }),
    ),
  }),
});
export type RuntimeInvokeWorkflowTargetRow = typeof RuntimeInvokeWorkflowTargetRow.Type;

export const RuntimeInvokePrimaryWorkflowOption = Schema.Struct({
  workflowDefinitionName: Schema.String,
  workflowDefinitionId: Schema.NonEmptyString,
  workflowDefinitionKey: Schema.optional(Schema.String),
});
export type RuntimeInvokePrimaryWorkflowOption = typeof RuntimeInvokePrimaryWorkflowOption.Type;

export const RuntimeInvokeWorkUnitBindingPreview = Schema.Struct({
  destinationKind: Schema.Literal("work_unit_fact", "artifact_slot"),
  destinationDefinitionId: Schema.NonEmptyString,
  destinationLabel: Schema.String,
  destinationFactType: Schema.optional(FactType),
  destinationCardinality: Schema.optional(FactCardinality),
  editorOptions: Schema.optional(Schema.Array(RuntimeFormFieldOption)),
  editorEmptyState: Schema.optional(Schema.String),
  editorWorkUnitTypeKey: Schema.optional(Schema.NonEmptyString),
  sourceKind: Schema.Literal("context_fact", "literal", "runtime"),
  sourceContextFactDefinitionId: Schema.optional(Schema.NonEmptyString),
  sourceContextFactKey: Schema.optional(Schema.String),
  resolvedValueJson: Schema.optional(Schema.Unknown),
  requiresRuntimeValue: Schema.Boolean,
});
export type RuntimeInvokeWorkUnitBindingPreview = typeof RuntimeInvokeWorkUnitBindingPreview.Type;

export const RuntimeInvokeWorkUnitTargetRow = Schema.Struct({
  workUnitLabel: Schema.String,
  transitionLabel: Schema.String,
  workflowLabel: Schema.optional(Schema.String),
  currentWorkUnitStateLabel: Schema.optional(Schema.String),
  status: RuntimeInvokeTargetStatus,
  blockedReason: Schema.optional(Schema.String),
  availablePrimaryWorkflows: Schema.Array(RuntimeInvokePrimaryWorkflowOption),
  invokeWorkUnitTargetExecutionId: Schema.NonEmptyString,
  projectWorkUnitId: Schema.optional(Schema.NonEmptyString),
  workUnitDefinitionId: Schema.NonEmptyString,
  workUnitDefinitionKey: Schema.optional(Schema.String),
  workUnitDefinitionName: Schema.optional(Schema.String),
  transitionDefinitionId: Schema.NonEmptyString,
  transitionDefinitionKey: Schema.optional(Schema.String),
  workflowDefinitionId: Schema.optional(Schema.NonEmptyString),
  workflowDefinitionKey: Schema.optional(Schema.String),
  transitionExecutionId: Schema.optional(Schema.NonEmptyString),
  workflowExecutionId: Schema.optional(Schema.NonEmptyString),
  actions: Schema.Struct({
    start: Schema.optional(
      Schema.Struct({
        kind: Schema.Literal("start_invoke_work_unit_target"),
        enabled: Schema.Boolean,
        reasonIfDisabled: Schema.optional(Schema.String),
        invokeWorkUnitTargetExecutionId: Schema.NonEmptyString,
      }),
    ),
    openWorkUnit: Schema.optional(
      Schema.Struct({
        kind: Schema.Literal("open_work_unit"),
        projectWorkUnitId: Schema.NonEmptyString,
        target: Schema.Struct({
          page: Schema.Literal("work-unit-overview"),
          projectWorkUnitId: Schema.NonEmptyString,
        }),
      }),
    ),
    openTransition: Schema.optional(
      Schema.Struct({
        kind: Schema.Literal("open_transition_execution"),
        transitionExecutionId: Schema.NonEmptyString,
        target: Schema.Struct({
          page: Schema.Literal("transition-execution-detail"),
          transitionExecutionId: Schema.NonEmptyString,
        }),
      }),
    ),
    openWorkflow: Schema.optional(
      Schema.Struct({
        kind: Schema.Literal("open_workflow_execution"),
        workflowExecutionId: Schema.NonEmptyString,
        target: Schema.Struct({
          page: Schema.Literal("workflow-execution-detail"),
          workflowExecutionId: Schema.NonEmptyString,
        }),
      }),
    ),
  }),
  bindingPreview: Schema.Array(RuntimeInvokeWorkUnitBindingPreview),
});
export type RuntimeInvokeWorkUnitTargetRow = typeof RuntimeInvokeWorkUnitTargetRow.Type;

export const RuntimeInvokeCompletionSummary = Schema.Struct({
  mode: Schema.Literal("manual"),
  eligible: Schema.Boolean,
  reasonIfIneligible: Schema.optional(Schema.String),
  totalTargets: Schema.Number,
  completedTargets: Schema.Number,
});
export type RuntimeInvokeCompletionSummary = typeof RuntimeInvokeCompletionSummary.Type;

export const RuntimeInvokePropagationPreviewItem = Schema.Struct({
  label: Schema.String,
  contextFactDefinitionId: Schema.NonEmptyString,
  contextFactKey: Schema.optional(Schema.String),
});
export type RuntimeInvokePropagationPreviewItem = typeof RuntimeInvokePropagationPreviewItem.Type;

export const RuntimeInvokePropagationPreview = Schema.Struct({
  mode: Schema.Literal("on_step_completion"),
  summary: Schema.String,
  outputs: Schema.Array(RuntimeInvokePropagationPreviewItem),
});
export type RuntimeInvokePropagationPreview = typeof RuntimeInvokePropagationPreview.Type;

export const RuntimeInvokeStepExecutionDetailBody = Schema.Struct({
  stepType: Schema.Literal("invoke"),
  targetKind: InvokeTargetKind,
  sourceMode: InvokeSourceMode,
  sourceContextFactDefinitionId: Schema.optional(Schema.NonEmptyString),
  sourceContextFactKey: Schema.optional(Schema.String),
  sourceContextFactInstanceValues: Schema.optional(Schema.Array(Schema.Unknown)),
  workflowTargets: Schema.Array(RuntimeInvokeWorkflowTargetRow),
  workUnitTargets: Schema.Array(RuntimeInvokeWorkUnitTargetRow),
  completionSummary: RuntimeInvokeCompletionSummary,
  propagationPreview: RuntimeInvokePropagationPreview,
});
export type RuntimeInvokeStepExecutionDetailBody = typeof RuntimeInvokeStepExecutionDetailBody.Type;

export const GetRuntimeStepExecutionDetailOutput = Schema.Struct({
  shell: RuntimeStepExecutionDetailShell,
  body: Schema.Union(
    RuntimeFormStepExecutionDetailBody,
    RuntimeActionStepExecutionDetailBody,
    RuntimeBranchStepExecutionDetailBody,
    RuntimeInvokeStepExecutionDetailBody,
    RuntimeDeferredStepExecutionDetailBody,
  ),
});
export type GetRuntimeStepExecutionDetailOutput = typeof GetRuntimeStepExecutionDetailOutput.Type;

export const StartInvokeWorkflowTargetInput = Schema.Struct({
  projectId: Schema.NonEmptyString,
  stepExecutionId: Schema.NonEmptyString,
  invokeWorkflowTargetExecutionId: Schema.NonEmptyString,
});
export type StartInvokeWorkflowTargetInput = typeof StartInvokeWorkflowTargetInput.Type;

export const StartInvokeWorkflowTargetResult = Schema.Literal("started", "already_started");
export type StartInvokeWorkflowTargetResult = typeof StartInvokeWorkflowTargetResult.Type;

export const StartInvokeWorkflowTargetOutput = Schema.Struct({
  invokeWorkflowTargetExecutionId: Schema.NonEmptyString,
  workflowExecutionId: Schema.NonEmptyString,
  result: StartInvokeWorkflowTargetResult,
});
export type StartInvokeWorkflowTargetOutput = typeof StartInvokeWorkflowTargetOutput.Type;

export const StartInvokeWorkUnitTargetInput = Schema.Struct({
  projectId: Schema.NonEmptyString,
  stepExecutionId: Schema.NonEmptyString,
  invokeWorkUnitTargetExecutionId: Schema.NonEmptyString,
  workflowDefinitionId: Schema.NonEmptyString,
  runtimeFactValues: Schema.optional(
    Schema.Array(
      Schema.Struct({
        workUnitFactDefinitionId: Schema.NonEmptyString,
        valueJson: Schema.Unknown,
      }),
    ),
  ),
  runtimeArtifactValues: Schema.optional(
    Schema.Array(
      Schema.Struct({
        artifactSlotDefinitionId: Schema.NonEmptyString,
        relativePath: Schema.optional(Schema.NonEmptyString),
        sourceContextFactDefinitionId: Schema.optional(Schema.NonEmptyString),
        clear: Schema.optional(Schema.Boolean),
      }),
    ),
  ),
});
export type StartInvokeWorkUnitTargetInput = typeof StartInvokeWorkUnitTargetInput.Type;

export const StartInvokeWorkUnitTargetResult = Schema.Literal("started", "already_started");
export type StartInvokeWorkUnitTargetResult = typeof StartInvokeWorkUnitTargetResult.Type;

export const StartInvokeWorkUnitTargetOutput = Schema.Struct({
  invokeWorkUnitTargetExecutionId: Schema.NonEmptyString,
  projectWorkUnitId: Schema.NonEmptyString,
  transitionExecutionId: Schema.NonEmptyString,
  workflowExecutionId: Schema.NonEmptyString,
  result: StartInvokeWorkUnitTargetResult,
});
export type StartInvokeWorkUnitTargetOutput = typeof StartInvokeWorkUnitTargetOutput.Type;

export const StartActionStepExecutionInput = Schema.Struct({
  projectId: Schema.NonEmptyString,
  stepExecutionId: Schema.NonEmptyString,
});
export type StartActionStepExecutionInput = typeof StartActionStepExecutionInput.Type;

export const StartActionStepExecutionResult = Schema.Literal(
  "started",
  "already_running",
  "already_started",
);
export type StartActionStepExecutionResult = typeof StartActionStepExecutionResult.Type;

export const StartActionStepExecutionOutput = Schema.Struct({
  stepExecutionId: Schema.NonEmptyString,
  result: StartActionStepExecutionResult,
});
export type StartActionStepExecutionOutput = typeof StartActionStepExecutionOutput.Type;

const UniqueActionDefinitionIds = Schema.Array(Schema.NonEmptyString).pipe(
  Schema.filter(
    (actionIds) => actionIds.length > 0 && new Set(actionIds).size === actionIds.length,
  ),
);

export const RunActionStepActionsInput = Schema.Struct({
  projectId: Schema.NonEmptyString,
  stepExecutionId: Schema.NonEmptyString,
  actionIds: UniqueActionDefinitionIds,
});
export type RunActionStepActionsInput = typeof RunActionStepActionsInput.Type;

export const RunActionStepActionResult = Schema.Literal(
  "started",
  "already_running",
  "already_succeeded",
);
export type RunActionStepActionResult = typeof RunActionStepActionResult.Type;

export const RunActionStepActionsOutput = Schema.Struct({
  stepExecutionId: Schema.NonEmptyString,
  actionResults: Schema.Array(
    Schema.Struct({
      actionId: Schema.NonEmptyString,
      result: RunActionStepActionResult,
    }),
  ),
});
export type RunActionStepActionsOutput = typeof RunActionStepActionsOutput.Type;

export const RetryActionStepActionsInput = Schema.Struct({
  projectId: Schema.NonEmptyString,
  stepExecutionId: Schema.NonEmptyString,
  actionIds: UniqueActionDefinitionIds,
});
export type RetryActionStepActionsInput = typeof RetryActionStepActionsInput.Type;

export const RetryActionStepActionResult = Schema.Literal(
  "started",
  "already_running",
  "not_retryable",
);
export type RetryActionStepActionResult = typeof RetryActionStepActionResult.Type;

export const RetryActionStepActionsOutput = Schema.Struct({
  stepExecutionId: Schema.NonEmptyString,
  actionResults: Schema.Array(
    Schema.Struct({
      actionId: Schema.NonEmptyString,
      result: RetryActionStepActionResult,
    }),
  ),
});
export type RetryActionStepActionsOutput = typeof RetryActionStepActionsOutput.Type;

export const SkipActionStepActionsInput = Schema.Struct({
  projectId: Schema.NonEmptyString,
  stepExecutionId: Schema.NonEmptyString,
  actionIds: UniqueActionDefinitionIds,
});
export type SkipActionStepActionsInput = typeof SkipActionStepActionsInput.Type;

export const SkipActionStepActionResult = Schema.Literal(
  "skipped",
  "already_running",
  "already_succeeded",
);
export type SkipActionStepActionResult = typeof SkipActionStepActionResult.Type;

export const SkipActionStepActionsOutput = Schema.Struct({
  stepExecutionId: Schema.NonEmptyString,
  actionResults: Schema.Array(
    Schema.Struct({
      actionId: Schema.NonEmptyString,
      result: SkipActionStepActionResult,
    }),
  ),
});
export type SkipActionStepActionsOutput = typeof SkipActionStepActionsOutput.Type;

const UniqueActionItemDefinitionIds = Schema.Array(Schema.NonEmptyString).pipe(
  Schema.filter((itemIds) => itemIds.length > 0 && new Set(itemIds).size === itemIds.length),
);

export const SkipActionStepActionItemsInput = Schema.Struct({
  projectId: Schema.NonEmptyString,
  stepExecutionId: Schema.NonEmptyString,
  actionId: Schema.NonEmptyString,
  itemIds: UniqueActionItemDefinitionIds,
});
export type SkipActionStepActionItemsInput = typeof SkipActionStepActionItemsInput.Type;

export const SkipActionStepActionItemResult = Schema.Literal(
  "skipped",
  "already_running",
  "already_succeeded",
);
export type SkipActionStepActionItemResult = typeof SkipActionStepActionItemResult.Type;

export const SkipActionStepActionItemsOutput = Schema.Struct({
  stepExecutionId: Schema.NonEmptyString,
  actionId: Schema.NonEmptyString,
  itemResults: Schema.Array(
    Schema.Struct({
      itemId: Schema.NonEmptyString,
      result: SkipActionStepActionItemResult,
    }),
  ),
});
export type SkipActionStepActionItemsOutput = typeof SkipActionStepActionItemsOutput.Type;

export const SaveBranchStepSelectionInput = Schema.Struct({
  projectId: Schema.NonEmptyString,
  stepExecutionId: Schema.NonEmptyString,
  selectedTargetStepId: Schema.NullOr(Schema.NonEmptyString),
});
export type SaveBranchStepSelectionInput = typeof SaveBranchStepSelectionInput.Type;

export const SaveBranchStepSelectionOutput = Schema.Struct({
  stepExecutionId: Schema.NonEmptyString,
  selectedTargetStepId: Schema.NullOr(Schema.NonEmptyString),
  result: Schema.Literal("saved"),
});
export type SaveBranchStepSelectionOutput = typeof SaveBranchStepSelectionOutput.Type;

export const StartTransitionExecutionInput = Schema.Struct({
  projectId: Schema.String,
  transitionId: Schema.String,
  workflowId: Schema.String,
  workUnit: Schema.Union(
    Schema.Struct({
      mode: Schema.Literal("existing"),
      projectWorkUnitId: Schema.String,
    }),
    Schema.Struct({
      mode: Schema.Literal("new"),
      workUnitTypeId: Schema.String,
    }),
  ),
});
export type StartTransitionExecutionInput = typeof StartTransitionExecutionInput.Type;

export const StartTransitionExecutionOutput = Schema.Struct({
  projectWorkUnitId: Schema.optional(Schema.String),
  transitionExecutionId: Schema.String,
  workflowExecutionId: Schema.String,
});
export type StartTransitionExecutionOutput = typeof StartTransitionExecutionOutput.Type;

export const SwitchActiveTransitionExecutionInput = Schema.Struct({
  projectId: Schema.String,
  projectWorkUnitId: Schema.String,
  supersededTransitionExecutionId: Schema.String,
  transitionId: Schema.String,
  transitionKey: Schema.optional(Schema.String),
  workflowId: Schema.String,
  workflowKey: Schema.optional(Schema.String),
});
export type SwitchActiveTransitionExecutionInput = typeof SwitchActiveTransitionExecutionInput.Type;

export const SwitchActiveTransitionExecutionOutput = Schema.Struct({
  supersededTransitionExecutionId: Schema.String,
  transitionExecutionId: Schema.String,
  workflowExecutionId: Schema.String,
});
export type SwitchActiveTransitionExecutionOutput =
  typeof SwitchActiveTransitionExecutionOutput.Type;

export const ChoosePrimaryWorkflowForTransitionExecutionInput = Schema.Struct({
  projectId: Schema.String,
  projectWorkUnitId: Schema.String,
  transitionExecutionId: Schema.String,
  workflowId: Schema.String,
  workflowKey: Schema.optional(Schema.String),
});
export type ChoosePrimaryWorkflowForTransitionExecutionInput =
  typeof ChoosePrimaryWorkflowForTransitionExecutionInput.Type;

export const ChoosePrimaryWorkflowForTransitionExecutionOutput = Schema.Struct({
  transitionExecutionId: Schema.String,
  workflowExecutionId: Schema.String,
  supersededWorkflowExecutionId: Schema.optional(Schema.String),
});
export type ChoosePrimaryWorkflowForTransitionExecutionOutput =
  typeof ChoosePrimaryWorkflowForTransitionExecutionOutput.Type;

export const RetrySameWorkflowExecutionInput = Schema.Struct({
  projectId: Schema.String,
  workflowExecutionId: Schema.String,
});
export type RetrySameWorkflowExecutionInput = typeof RetrySameWorkflowExecutionInput.Type;

export const CompleteWorkflowExecutionInput = Schema.Struct({
  projectId: Schema.String,
  workflowExecutionId: Schema.String,
});
export type CompleteWorkflowExecutionInput = typeof CompleteWorkflowExecutionInput.Type;

export const RetrySameWorkflowExecutionOutput = Schema.Struct({
  transitionExecutionId: Schema.String,
  workflowExecutionId: Schema.String,
  workflowRole: Schema.Literal("primary", "supporting"),
});
export type RetrySameWorkflowExecutionOutput = typeof RetrySameWorkflowExecutionOutput.Type;

export const CompleteWorkflowExecutionOutput = Schema.Struct({
  workflowExecutionId: Schema.String,
  status: Schema.Literal("completed"),
});
export type CompleteWorkflowExecutionOutput = typeof CompleteWorkflowExecutionOutput.Type;

export const CompleteTransitionExecutionInput = Schema.Struct({
  projectId: Schema.String,
  projectWorkUnitId: Schema.String,
  transitionExecutionId: Schema.String,
});
export type CompleteTransitionExecutionInput = typeof CompleteTransitionExecutionInput.Type;

export const CompleteTransitionExecutionOutput = Schema.Struct({
  transitionExecutionId: Schema.String,
  projectWorkUnitId: Schema.String,
  newStateId: Schema.String,
  newStateKey: Schema.String,
  newStateLabel: Schema.String,
});
export type CompleteTransitionExecutionOutput = typeof CompleteTransitionExecutionOutput.Type;

export const AddWorkUnitFactInstanceInput = Schema.Struct({
  projectId: Schema.String,
  projectWorkUnitId: Schema.String,
  factDefinitionId: Schema.String,
  value: Schema.optional(Schema.Unknown),
  referencedProjectWorkUnitId: Schema.optional(Schema.String),
});
export type AddWorkUnitFactInstanceInput = typeof AddWorkUnitFactInstanceInput.Type;

export const AddWorkUnitFactInstanceOutput = Schema.Struct({
  workUnitFactInstanceId: Schema.String,
});
export type AddWorkUnitFactInstanceOutput = typeof AddWorkUnitFactInstanceOutput.Type;

export const UpdateWorkUnitFactInstanceInput = Schema.Struct({
  projectId: Schema.String,
  projectWorkUnitId: Schema.String,
  factDefinitionId: Schema.String,
  workUnitFactInstanceId: Schema.String,
  value: Schema.optional(Schema.Unknown),
  referencedProjectWorkUnitId: Schema.optional(Schema.String),
});
export type UpdateWorkUnitFactInstanceInput = typeof UpdateWorkUnitFactInstanceInput.Type;

export const UpdateWorkUnitFactInstanceOutput = Schema.Struct({
  workUnitFactInstanceId: Schema.String,
  supersededWorkUnitFactInstanceId: Schema.String,
});
export type UpdateWorkUnitFactInstanceOutput = typeof UpdateWorkUnitFactInstanceOutput.Type;

export const AddProjectFactInstanceInput = Schema.Struct({
  projectId: Schema.String,
  factDefinitionId: Schema.String,
  value: Schema.Unknown,
});
export type AddProjectFactInstanceInput = typeof AddProjectFactInstanceInput.Type;

export const AddProjectFactInstanceOutput = Schema.Struct({
  projectFactInstanceId: Schema.String,
});
export type AddProjectFactInstanceOutput = typeof AddProjectFactInstanceOutput.Type;

export const UpdateProjectFactInstanceInput = Schema.Struct({
  projectId: Schema.String,
  factDefinitionId: Schema.String,
  projectFactInstanceId: Schema.String,
  value: Schema.Unknown,
});
export type UpdateProjectFactInstanceInput = typeof UpdateProjectFactInstanceInput.Type;

export const UpdateProjectFactInstanceOutput = Schema.Struct({
  projectFactInstanceId: Schema.String,
  supersededProjectFactInstanceId: Schema.String,
});
export type UpdateProjectFactInstanceOutput = typeof UpdateProjectFactInstanceOutput.Type;

export const RuntimeFactMutationShapes = Schema.Struct({
  workUnitFactDetail: RuntimeWorkUnitFactDetailDefinition,
  projectFactDetail: RuntimeProjectFactDetailDefinition,
});
export type RuntimeFactMutationShapes = typeof RuntimeFactMutationShapes.Type;
