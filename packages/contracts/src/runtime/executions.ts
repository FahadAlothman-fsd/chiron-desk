import * as Schema from "effect/Schema";

import { FactCardinality, FactType, PathValidationConfig } from "../methodology/fact.js";
import {
  DeferredWorkflowStepType,
  FormFieldUiMultiplicityMode,
  FormStepPayload,
  WorkflowContextFactKind,
} from "../methodology/workflow.js";
import { RuntimeProjectFactDetailDefinition } from "./facts.js";
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

export const GetRuntimeStepExecutionDetailOutput = Schema.Struct({
  shell: RuntimeStepExecutionDetailShell,
  body: Schema.Union(RuntimeFormStepExecutionDetailBody, RuntimeDeferredStepExecutionDetailBody),
});
export type GetRuntimeStepExecutionDetailOutput = typeof GetRuntimeStepExecutionDetailOutput.Type;

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

export const RetrySameWorkflowExecutionOutput = Schema.Struct({
  transitionExecutionId: Schema.String,
  workflowExecutionId: Schema.String,
  workflowRole: Schema.Literal("primary", "supporting"),
});
export type RetrySameWorkflowExecutionOutput = typeof RetrySameWorkflowExecutionOutput.Type;

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
