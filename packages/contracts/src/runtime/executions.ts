import * as Schema from "effect/Schema";

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
  stepsSurface: Schema.Struct({
    mode: Schema.Literal("deferred"),
    message: Schema.String,
  }),
});
export type GetWorkflowExecutionDetailOutput = typeof GetWorkflowExecutionDetailOutput.Type;

export const StartTransitionExecutionInput = Schema.Struct({
  projectId: Schema.String,
  transitionId: Schema.String,
  transitionKey: Schema.optional(Schema.String),
  workflowId: Schema.String,
  workflowKey: Schema.optional(Schema.String),
  projectWorkUnitId: Schema.optional(Schema.String),
  futureCandidate: Schema.optional(
    Schema.Struct({
      workUnitTypeId: Schema.String,
      workUnitTypeKey: Schema.optional(Schema.String),
      source: Schema.Literal("future"),
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
