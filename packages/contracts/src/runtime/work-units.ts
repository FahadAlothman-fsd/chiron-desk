import * as Schema from "effect/Schema";

import {
  RuntimeCandidateAvailability,
  TransitionExecutionStatus,
  WorkflowExecutionStatus,
} from "./status.js";

export const RuntimeFactPrimitiveType = Schema.Literal("string", "number", "boolean", "json");
export type RuntimeFactPrimitiveType = typeof RuntimeFactPrimitiveType.Type;

export const RuntimeWorkUnitFactKind = Schema.Literal("plain_fact", "work_unit_reference_fact");
export type RuntimeWorkUnitFactKind = typeof RuntimeWorkUnitFactKind.Type;

export const RuntimeFactCardinality = Schema.Literal("one", "many");
export type RuntimeFactCardinality = typeof RuntimeFactCardinality.Type;

export const RuntimeWorkUnitTab = Schema.Literal("primitive", "work_units");
export type RuntimeWorkUnitTab = typeof RuntimeWorkUnitTab.Type;

export const RuntimeWorkUnitIdentity = Schema.Struct({
  projectWorkUnitId: Schema.String,
  workUnitTypeId: Schema.String,
  workUnitTypeKey: Schema.String,
  workUnitTypeName: Schema.String,
  currentStateId: Schema.String,
  currentStateKey: Schema.String,
  currentStateLabel: Schema.String,
});
export type RuntimeWorkUnitIdentity = typeof RuntimeWorkUnitIdentity.Type;

export const RuntimeWorkUnitActiveTransitionSummary = Schema.Struct({
  transitionExecutionId: Schema.String,
  transitionId: Schema.String,
  transitionKey: Schema.String,
  transitionName: Schema.String,
  toStateId: Schema.String,
  toStateKey: Schema.String,
  toStateLabel: Schema.String,
  status: Schema.Literal("active"),
  readyForCompletion: Schema.optional(Schema.Boolean),
  primaryWorkflow: Schema.optional(
    Schema.Struct({
      workflowExecutionId: Schema.String,
      workflowId: Schema.String,
      workflowKey: Schema.String,
      workflowName: Schema.String,
      status: Schema.Literal("active", "completed"),
    }),
  ),
  actions: Schema.Struct({
    primary: Schema.Struct({
      kind: Schema.Literal("open_transition"),
      transitionExecutionId: Schema.String,
    }),
    secondaryWorkflow: Schema.optional(
      Schema.Struct({ kind: Schema.Literal("open_workflow"), workflowExecutionId: Schema.String }),
    ),
    openTransitionTarget: Schema.Struct({
      page: Schema.Literal("transition-execution-detail"),
      transitionExecutionId: Schema.String,
    }),
    openWorkflowTarget: Schema.optional(
      Schema.Struct({
        page: Schema.Literal("workflow-execution-detail"),
        workflowExecutionId: Schema.String,
      }),
    ),
  }),
});
export type RuntimeWorkUnitActiveTransitionSummary =
  typeof RuntimeWorkUnitActiveTransitionSummary.Type;

export const GetWorkUnitsInput = Schema.Struct({
  projectId: Schema.String,
  filters: Schema.optional(
    Schema.Struct({
      cardinalities: Schema.optional(Schema.Array(Schema.Literal("one", "many"))),
      workUnitTypeIds: Schema.optional(Schema.Array(Schema.String)),
      workUnitTypeKeys: Schema.optional(Schema.Array(Schema.String)),
      hasActiveTransition: Schema.optional(Schema.Boolean),
    }),
  ),
});
export type GetWorkUnitsInput = typeof GetWorkUnitsInput.Type;

export const GetWorkUnitsOutput = Schema.Struct({
  project: Schema.Struct({ projectId: Schema.String, name: Schema.String }),
  filters: Schema.Struct({
    cardinalities: Schema.optional(Schema.Array(Schema.Literal("one", "many"))),
    workUnitTypeIds: Schema.optional(Schema.Array(Schema.String)),
    workUnitTypeKeys: Schema.optional(Schema.Array(Schema.String)),
    hasActiveTransition: Schema.optional(Schema.Boolean),
  }),
  rows: Schema.Array(
    Schema.Struct({
      projectWorkUnitId: Schema.String,
      displayIdentity: Schema.Struct({
        primaryLabel: Schema.String,
        secondaryLabel: Schema.String,
        fullInstanceId: Schema.String,
      }),
      workUnitType: Schema.Struct({
        workUnitTypeId: Schema.String,
        workUnitTypeKey: Schema.String,
        workUnitTypeName: Schema.optional(Schema.String),
        cardinality: Schema.Literal("one_per_project", "many_per_project"),
      }),
      currentState: Schema.Struct({
        stateId: Schema.String,
        stateKey: Schema.String,
        stateLabel: Schema.String,
      }),
      activeTransition: Schema.optional(
        Schema.Struct({
          transitionExecutionId: Schema.String,
          transitionId: Schema.String,
          transitionKey: Schema.String,
          transitionName: Schema.optional(Schema.String),
          toStateId: Schema.String,
          toStateKey: Schema.String,
          toStateLabel: Schema.String,
          primaryWorkflow: Schema.optional(
            Schema.Struct({
              workflowExecutionId: Schema.String,
              workflowId: Schema.String,
              workflowKey: Schema.String,
              workflowName: Schema.optional(Schema.String),
              status: WorkflowExecutionStatus,
            }),
          ),
        }),
      ),
      summaries: Schema.Struct({
        factsDependencies: Schema.Struct({
          factInstancesCurrent: Schema.Number,
          factDefinitionsTotal: Schema.Number,
          inboundDependencyCount: Schema.Number,
          outboundDependencyCount: Schema.Number,
        }),
        artifactSlots: Schema.Struct({
          slotsWithCurrentArtifacts: Schema.Number,
          slotDefinitionsTotal: Schema.Number,
        }),
      }),
      timestamps: Schema.Struct({ createdAt: Schema.String, updatedAt: Schema.String }),
      target: Schema.Struct({
        page: Schema.Literal("work-unit-overview"),
        projectWorkUnitId: Schema.String,
      }),
    }),
  ),
});
export type GetWorkUnitsOutput = typeof GetWorkUnitsOutput.Type;

export const GetWorkUnitOverviewInput = Schema.Struct({
  projectId: Schema.String,
  projectWorkUnitId: Schema.String,
});
export type GetWorkUnitOverviewInput = typeof GetWorkUnitOverviewInput.Type;

export const GetWorkUnitOverviewOutput = Schema.Struct({
  workUnit: RuntimeWorkUnitIdentity.pipe(
    Schema.extend(Schema.Struct({ createdAt: Schema.String, updatedAt: Schema.String })),
  ),
  activeTransition: Schema.optional(RuntimeWorkUnitActiveTransitionSummary),
  summaries: Schema.Struct({
    factsDependencies: Schema.Struct({
      factInstancesCurrent: Schema.Number,
      factDefinitionsTotal: Schema.Number,
      inboundDependencyCount: Schema.Number,
      outboundDependencyCount: Schema.Number,
      target: Schema.Struct({
        page: Schema.Literal("work-unit-facts"),
        projectWorkUnitId: Schema.String,
      }),
    }),
    stateMachine: Schema.Struct({
      currentStateKey: Schema.String,
      currentStateLabel: Schema.String,
      hasActiveTransition: Schema.Boolean,
      target: Schema.Struct({
        page: Schema.Literal("work-unit-state-machine"),
        projectWorkUnitId: Schema.String,
      }),
    }),
    artifactSlots: Schema.Struct({
      slotsWithCurrentSnapshots: Schema.Number,
      slotDefinitionsTotal: Schema.Number,
      target: Schema.Struct({
        page: Schema.Literal("artifact-slots"),
        projectWorkUnitId: Schema.String,
      }),
    }),
  }),
});
export type GetWorkUnitOverviewOutput = typeof GetWorkUnitOverviewOutput.Type;

export const GetWorkUnitStateMachineInput = GetWorkUnitOverviewInput;
export type GetWorkUnitStateMachineInput = typeof GetWorkUnitStateMachineInput.Type;

export const GetWorkUnitStateMachineOutput = Schema.Struct({
  workUnit: RuntimeWorkUnitIdentity,
  activeTransition: Schema.optional(RuntimeWorkUnitActiveTransitionSummary),
  possibleTransitions: Schema.Array(
    Schema.Struct({
      transitionId: Schema.String,
      transitionKey: Schema.String,
      transitionName: Schema.String,
      fromStateId: Schema.String,
      fromStateKey: Schema.String,
      toStateId: Schema.String,
      toStateKey: Schema.String,
      toStateLabel: Schema.String,
      result: RuntimeCandidateAvailability,
      firstReason: Schema.optional(Schema.String),
      actionMode: Schema.Literal("start", "switch"),
      actions: Schema.Struct({
        inspectStartGate: Schema.Struct({
          transitionId: Schema.String,
          projectWorkUnitId: Schema.String,
        }),
      }),
    }),
  ),
  history: Schema.Array(
    Schema.Struct({
      transitionExecutionId: Schema.String,
      transitionId: Schema.String,
      transitionKey: Schema.String,
      transitionName: Schema.String,
      fromStateId: Schema.optional(Schema.String),
      fromStateKey: Schema.optional(Schema.String),
      toStateId: Schema.String,
      toStateKey: Schema.String,
      status: Schema.Literal("completed", "superseded"),
      startedAt: Schema.String,
      completedAt: Schema.optional(Schema.String),
      supersededAt: Schema.optional(Schema.String),
      target: Schema.Struct({
        page: Schema.Literal("transition-execution-detail"),
        transitionExecutionId: Schema.String,
      }),
    }),
  ),
});
export type GetWorkUnitStateMachineOutput = typeof GetWorkUnitStateMachineOutput.Type;

export const GetTransitionStartGateDetailsInput = Schema.Struct({
  projectId: Schema.String,
  transitionId: Schema.String,
  transitionKey: Schema.optional(Schema.String),
  projectWorkUnitId: Schema.optional(Schema.String),
  futureCandidate: Schema.optional(
    Schema.Struct({
      workUnitTypeId: Schema.String,
      workUnitTypeKey: Schema.optional(Schema.String),
      source: Schema.Literal("future"),
    }),
  ),
});
export type GetTransitionStartGateDetailsInput = typeof GetTransitionStartGateDetailsInput.Type;

export const GetTransitionStartGateDetailsOutput = Schema.Struct({
  transition: Schema.Struct({
    transitionId: Schema.String,
    transitionKey: Schema.String,
    transitionName: Schema.String,
    fromStateId: Schema.optional(Schema.String),
    fromStateKey: Schema.optional(Schema.String),
    toStateId: Schema.optional(Schema.String),
    toStateKey: Schema.String,
  }),
  workUnitContext: Schema.Struct({
    projectWorkUnitId: Schema.optional(Schema.String),
    workUnitTypeId: Schema.String,
    workUnitTypeKey: Schema.String,
    workUnitTypeName: Schema.String,
    currentStateLabel: Schema.String,
    source: Schema.Literal("open", "future"),
  }),
  gateSummary: Schema.Struct({ result: RuntimeCandidateAvailability }),
  conditionTree: Schema.Unknown,
  launchability: Schema.Struct({
    canLaunch: Schema.Boolean,
    availableWorkflows: Schema.Array(
      Schema.Struct({
        workflowId: Schema.String,
        workflowKey: Schema.String,
        workflowName: Schema.String,
        workflowDescription: Schema.optional(Schema.String),
        workflowHumanGuidance: Schema.optional(Schema.String),
      }),
    ),
  }),
});
export type GetTransitionStartGateDetailsOutput = typeof GetTransitionStartGateDetailsOutput.Type;

export const GetWorkUnitFactsInput = Schema.Struct({
  projectId: Schema.String,
  projectWorkUnitId: Schema.String,
  tab: RuntimeWorkUnitTab,
  filters: Schema.optional(
    Schema.Struct({
      existence: Schema.optional(Schema.Literal("exists", "not_exists")),
      primitiveFactTypes: Schema.optional(Schema.Array(RuntimeFactPrimitiveType)),
    }),
  ),
});
export type GetWorkUnitFactsInput = typeof GetWorkUnitFactsInput.Type;

export const WorkUnitFactDependencyDefinition = Schema.Struct({
  dependencyDefinitionId: Schema.optional(Schema.String),
  dependencyDefinitionKey: Schema.optional(Schema.String),
  dependencyDefinitionName: Schema.optional(Schema.String),
});
export type WorkUnitFactDependencyDefinition = typeof WorkUnitFactDependencyDefinition.Type;

export const GetWorkUnitFactsOutput = Schema.Struct({
  workUnit: RuntimeWorkUnitIdentity,
  activeTab: RuntimeWorkUnitTab,
  filters: Schema.Struct({
    existence: Schema.optional(Schema.Literal("exists", "not_exists")),
    primitiveFactTypes: Schema.optional(Schema.Array(RuntimeFactPrimitiveType)),
  }),
  primitive: Schema.optional(
    Schema.Struct({
      cards: Schema.Array(
        Schema.Struct({
          kind: Schema.Literal("plain_fact"),
          factDefinitionId: Schema.String,
          factKey: Schema.String,
          factName: Schema.optional(Schema.String),
          type: RuntimeFactPrimitiveType,
          factType: RuntimeFactPrimitiveType,
          cardinality: RuntimeFactCardinality,
          validation: Schema.optional(Schema.Unknown),
          exists: Schema.Boolean,
          currentCount: Schema.Number,
          currentValues: Schema.Array(Schema.Unknown),
          target: Schema.Struct({
            page: Schema.Literal("work-unit-fact-detail"),
            factDefinitionId: Schema.String,
          }),
        }),
      ),
    }),
  ),
  workUnits: Schema.optional(
    Schema.Struct({
      outgoing: Schema.Array(
        Schema.Struct({
          kind: Schema.Literal("work_unit_reference_fact"),
          factDefinitionId: Schema.String,
          factKey: Schema.String,
          factName: Schema.optional(Schema.String),
          cardinality: RuntimeFactCardinality,
          dependencyDefinition: Schema.optional(WorkUnitFactDependencyDefinition),
          count: Schema.Number,
          currentMembers: Schema.Array(
            Schema.Struct({
              workUnitFactInstanceId: Schema.String,
              counterpartProjectWorkUnitId: Schema.String,
              counterpartWorkUnitTypeId: Schema.String,
              counterpartWorkUnitTypeKey: Schema.String,
              counterpartWorkUnitTypeName: Schema.String,
              counterpartLabel: Schema.String,
            }),
          ),
          target: Schema.Struct({
            page: Schema.Literal("work-unit-fact-detail"),
            factDefinitionId: Schema.String,
          }),
        }),
      ),
      incoming: Schema.Array(
        Schema.Struct({
          kind: Schema.Literal("work_unit_reference_fact"),
          factDefinitionId: Schema.String,
          factKey: Schema.String,
          factName: Schema.optional(Schema.String),
          cardinality: RuntimeFactCardinality,
          dependencyDefinition: Schema.optional(WorkUnitFactDependencyDefinition),
          count: Schema.Number,
          currentMembers: Schema.Array(
            Schema.Struct({
              workUnitFactInstanceId: Schema.String,
              counterpartProjectWorkUnitId: Schema.String,
              counterpartWorkUnitTypeId: Schema.String,
              counterpartWorkUnitTypeKey: Schema.String,
              counterpartWorkUnitTypeName: Schema.String,
              counterpartLabel: Schema.String,
            }),
          ),
          target: Schema.Struct({
            page: Schema.Literal("work-unit-fact-detail"),
            factDefinitionId: Schema.String,
          }),
        }),
      ),
    }),
  ),
});
export type GetWorkUnitFactsOutput = typeof GetWorkUnitFactsOutput.Type;

export const GetWorkUnitFactDetailInput = Schema.Struct({
  projectId: Schema.String,
  projectWorkUnitId: Schema.String,
  factDefinitionId: Schema.String,
});
export type GetWorkUnitFactDetailInput = typeof GetWorkUnitFactDetailInput.Type;

export const RuntimeWorkUnitFactDetailDefinition = Schema.Struct({
  kind: RuntimeWorkUnitFactKind,
  factDefinitionId: Schema.String,
  factKey: Schema.String,
  factName: Schema.optional(Schema.String),
  type: Schema.optional(RuntimeFactPrimitiveType),
  factType: Schema.Literal("string", "number", "boolean", "json", "work_unit"),
  cardinality: RuntimeFactCardinality,
  description: Schema.optional(Schema.Unknown),
  guidance: Schema.optional(Schema.Unknown),
  validation: Schema.optional(Schema.Unknown),
});
export type RuntimeWorkUnitFactDetailDefinition = typeof RuntimeWorkUnitFactDetailDefinition.Type;

export const GetWorkUnitFactDetailOutput = Schema.Struct({
  workUnit: Schema.Struct({
    projectWorkUnitId: Schema.String,
    workUnitTypeId: Schema.String,
    workUnitTypeKey: Schema.String,
    workUnitTypeName: Schema.String,
  }),
  factDefinition: RuntimeWorkUnitFactDetailDefinition,
  primitiveState: Schema.optional(
    Schema.Struct({
      exists: Schema.Boolean,
      currentCount: Schema.Number,
      values: Schema.Array(
        Schema.Struct({
          workUnitFactInstanceId: Schema.String,
          value: Schema.Unknown,
          createdAt: Schema.String,
        }),
      ),
    }),
  ),
  dependencyState: Schema.optional(
    Schema.Struct({
      dependencyDefinition: Schema.optional(WorkUnitFactDependencyDefinition),
      outgoing: Schema.Array(
        Schema.Struct({
          workUnitFactInstanceId: Schema.String,
          counterpartProjectWorkUnitId: Schema.String,
          counterpartWorkUnitTypeId: Schema.String,
          counterpartWorkUnitTypeKey: Schema.String,
          counterpartWorkUnitTypeName: Schema.String,
          counterpartLabel: Schema.String,
          createdAt: Schema.String,
        }),
      ),
      incoming: Schema.Array(
        Schema.Struct({
          workUnitFactInstanceId: Schema.String,
          counterpartProjectWorkUnitId: Schema.String,
          counterpartWorkUnitTypeId: Schema.String,
          counterpartWorkUnitTypeKey: Schema.String,
          counterpartWorkUnitTypeName: Schema.String,
          counterpartLabel: Schema.String,
          createdAt: Schema.String,
        }),
      ),
    }),
  ),
  actions: Schema.Struct({
    canAddInstance: Schema.Boolean,
    canUpdateExisting: Schema.Boolean,
    canRemoveExisting: Schema.Literal(false),
  }),
});
export type GetWorkUnitFactDetailOutput = typeof GetWorkUnitFactDetailOutput.Type;

export const RuntimeTransitionExecutionStatus = TransitionExecutionStatus;
export type RuntimeTransitionExecutionStatus = typeof RuntimeTransitionExecutionStatus.Type;
