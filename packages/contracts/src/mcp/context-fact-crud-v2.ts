import * as Schema from "effect/Schema";

import { AgentStepRuntimeErrorEnvelope, AgentStepRuntimeState } from "../agent-step/runtime.js";
import {
  DraftSpecSelectedArtifactSchema,
  DraftSpecSelectedFactSchema,
} from "./draft-spec-schemas.js";
export {
  DraftSpecSelectedArtifactSchema,
  DraftSpecSelectedFactSchema,
} from "./draft-spec-schemas.js";
import { FactCardinality, PlainFactType } from "../methodology/fact.js";
import { WorkflowContextFactKind } from "../methodology/workflow.js";

export const AGENT_STEP_MCP_V2_TOOLS = [
  "read_step_execution_snapshot",
  "read_context_fact_schema",
  "read_context_fact_instances",
  "read_attachable_targets",
  "create_context_fact_instance",
  "update_context_fact_instance",
  "remove_context_fact_instance",
  "delete_context_fact_instance",
] as const;
export const AgentStepMcpV2ToolName = Schema.Literal(...AGENT_STEP_MCP_V2_TOOLS);
export type AgentStepMcpV2ToolName = typeof AgentStepMcpV2ToolName.Type;

export const AgentStepMcpScopeV2 = Schema.Struct({
  version: Schema.Literal("v2"),
  tools: Schema.Array(AgentStepMcpV2ToolName),
  requestContextAccess: Schema.Literal(false),
});
export type AgentStepMcpScopeV2 = typeof AgentStepMcpScopeV2.Type;

export const ContextFactCrudOperation = Schema.Literal("create", "update", "remove", "delete");
export type ContextFactCrudOperation = typeof ContextFactCrudOperation.Type;

export const ContextFactKey = Schema.NonEmptyString;
export type ContextFactKey = typeof ContextFactKey.Type;

export const ContextFactInstanceId = Schema.NonEmptyString;
export type ContextFactInstanceId = typeof ContextFactInstanceId.Type;

export const PlainFactValue = Schema.Union(
  Schema.String,
  Schema.Number,
  Schema.Boolean,
  Schema.Null,
  Schema.Array(Schema.Unknown),
  Schema.Record({ key: Schema.String, value: Schema.Unknown }),
);
export type PlainFactValue = typeof PlainFactValue.Type;

export const BoundFactValue = Schema.Struct({
  factInstanceId: Schema.optional(Schema.NonEmptyString),
  value: Schema.Unknown,
  deleted: Schema.optional(Schema.Boolean),
});
export type BoundFactValue = typeof BoundFactValue.Type;

export const WorkflowRefFactValueV2 = Schema.Struct({
  workflowDefinitionId: Schema.NonEmptyString,
});
export type WorkflowRefFactValueV2 = typeof WorkflowRefFactValueV2.Type;

export const WorkUnitReferenceFactValueV2 = Schema.Struct({
  projectWorkUnitId: Schema.NonEmptyString,
});
export type WorkUnitReferenceFactValueV2 = typeof WorkUnitReferenceFactValueV2.Type;

export const ArtifactSlotReferenceFileView = Schema.Struct({
  filePath: Schema.NonEmptyString,
  gitCommitHash: Schema.NullOr(Schema.NonEmptyString),
  deleted: Schema.optional(Schema.Boolean),
});
export type ArtifactSlotReferenceFileView = typeof ArtifactSlotReferenceFileView.Type;

export const ArtifactSlotReferenceFactValueV2 = Schema.Struct({
  artifactInstanceId: Schema.optional(Schema.NonEmptyString),
  files: Schema.Array(ArtifactSlotReferenceFileView),
});
export type ArtifactSlotReferenceFactValueV2 = typeof ArtifactSlotReferenceFactValueV2.Type;

export const DraftSpecKeyedFactValues = Schema.Record({
  key: Schema.NonEmptyString,
  value: Schema.Unknown,
});
export type DraftSpecKeyedFactValues = typeof DraftSpecKeyedFactValues.Type;

export const DraftSpecKeyedArtifactValues = Schema.Record({
  key: Schema.NonEmptyString,
  value: Schema.Array(Schema.NonEmptyString),
});
export type DraftSpecKeyedArtifactValues = typeof DraftSpecKeyedArtifactValues.Type;

export const WorkUnitDraftSpecAuthoredValue = Schema.Struct({
  factValues: DraftSpecKeyedFactValues,
  artifactValues: DraftSpecKeyedArtifactValues,
});
export type WorkUnitDraftSpecAuthoredValue = typeof WorkUnitDraftSpecAuthoredValue.Type;

export const ContextFactInstanceValueV2 = Schema.Union(
  PlainFactValue,
  BoundFactValue,
  WorkflowRefFactValueV2,
  WorkUnitReferenceFactValueV2,
  ArtifactSlotReferenceFactValueV2,
  WorkUnitDraftSpecAuthoredValue,
);
export type ContextFactInstanceValueV2 = typeof ContextFactInstanceValueV2.Type;

export const ContextFactValueInputV2 = Schema.Unknown;
export type ContextFactValueInputV2 = typeof ContextFactValueInputV2.Type;

export const ReadStepExecutionSnapshotInputV2 = Schema.Struct({});
export type ReadStepExecutionSnapshotInputV2 = typeof ReadStepExecutionSnapshotInputV2.Type;

export const StepSnapshotReadAccess = Schema.Struct({
  canReadSchema: Schema.Boolean,
  canReadInstances: Schema.Boolean,
  canReadAttachableTargets: Schema.Boolean,
});
export type StepSnapshotReadAccess = typeof StepSnapshotReadAccess.Type;

export const StepSnapshotWriteAccess = Schema.Struct({
  canCreate: Schema.Boolean,
  canUpdate: Schema.Boolean,
  canRemove: Schema.Boolean,
  canDelete: Schema.Boolean,
});
export type StepSnapshotWriteAccess = typeof StepSnapshotWriteAccess.Type;

export const StepSnapshotReadSetItem = Schema.Struct({
  factKey: ContextFactKey,
  contextFactKind: WorkflowContextFactKind,
  label: Schema.optional(Schema.String),
  description: Schema.optional(Schema.Unknown),
  guidance: Schema.optional(Schema.Unknown),
  access: StepSnapshotReadAccess,
});
export type StepSnapshotReadSetItem = typeof StepSnapshotReadSetItem.Type;

export const StepSnapshotWriteSetItem = Schema.Struct({
  factKey: ContextFactKey,
  contextFactKind: WorkflowContextFactKind,
  label: Schema.optional(Schema.String),
  description: Schema.optional(Schema.Unknown),
  guidance: Schema.optional(Schema.Unknown),
  instanceCount: Schema.Number,
  hasInstances: Schema.Boolean,
  requiredForCompletion: Schema.Boolean,
  readAccess: StepSnapshotReadAccess,
  writeAccess: StepSnapshotWriteAccess,
});
export type StepSnapshotWriteSetItem = typeof StepSnapshotWriteSetItem.Type;

export const StepSnapshotCompletionSummary = Schema.Struct({
  total: Schema.Number,
  withInstances: Schema.Number,
  withoutInstances: Schema.Number,
  isComplete: Schema.Boolean,
});
export type StepSnapshotCompletionSummary = typeof StepSnapshotCompletionSummary.Type;

export const ReadStepExecutionSnapshotOutputV2 = Schema.Struct({
  state: AgentStepRuntimeState,
  objective: Schema.NonEmptyString,
  instructionsMarkdown: Schema.NonEmptyString,
  completion: StepSnapshotCompletionSummary,
  readSet: Schema.Array(StepSnapshotReadSetItem),
  writeSet: Schema.Array(StepSnapshotWriteSetItem),
});
export type ReadStepExecutionSnapshotOutputV2 = typeof ReadStepExecutionSnapshotOutputV2.Type;

export const ReadContextFactSchemaInputV2 = Schema.Struct({
  factKey: ContextFactKey,
});
export type ReadContextFactSchemaInputV2 = typeof ReadContextFactSchemaInputV2.Type;

const ContextFactSchemaCommon = Schema.Struct({
  factKey: ContextFactKey,
  label: Schema.optional(Schema.String),
  description: Schema.optional(Schema.Unknown),
  guidance: Schema.optional(Schema.Unknown),
  cardinality: FactCardinality,
  actions: Schema.Array(ContextFactCrudOperation),
});

export const PlainFactSchemaOutput = Schema.Struct({
  contextFactKind: Schema.Literal("plain_fact", "plain_value_fact"),
  valueType: PlainFactType,
  validation: Schema.optional(Schema.Unknown),
}).pipe(Schema.extend(ContextFactSchemaCommon));
export type PlainFactSchemaOutput = typeof PlainFactSchemaOutput.Type;

export const BoundFactSchemaOutput = Schema.Struct({
  contextFactKind: Schema.Literal("bound_fact"),
  factDefinitionId: Schema.NonEmptyString,
  valueType: Schema.optional(Schema.Literal("string", "number", "boolean", "json", "work_unit")),
  workUnitDefinitionId: Schema.optional(Schema.NonEmptyString),
  underlyingValidation: Schema.optional(Schema.Unknown),
}).pipe(Schema.extend(ContextFactSchemaCommon));
export type BoundFactSchemaOutput = typeof BoundFactSchemaOutput.Type;

export const WorkflowRefSchemaOutput = Schema.Struct({
  contextFactKind: Schema.Literal("workflow_ref_fact"),
  currentWorkUnitTypeKey: Schema.optional(Schema.NonEmptyString),
}).pipe(Schema.extend(ContextFactSchemaCommon));
export type WorkflowRefSchemaOutput = typeof WorkflowRefSchemaOutput.Type;

export const WorkUnitReferenceSchemaOutput = Schema.Struct({
  contextFactKind: Schema.Literal("work_unit_reference_fact"),
  targetWorkUnitDefinitionId: Schema.NonEmptyString,
  linkTypeDefinitionId: Schema.NonEmptyString,
}).pipe(Schema.extend(ContextFactSchemaCommon));
export type WorkUnitReferenceSchemaOutput = typeof WorkUnitReferenceSchemaOutput.Type;

export const ArtifactSlotReferenceSchemaOutput = Schema.Struct({
  contextFactKind: Schema.Literal("artifact_slot_reference_fact"),
  slotDefinitionId: Schema.NonEmptyString,
  artifactSlotKey: Schema.optional(Schema.NonEmptyString),
  artifactSlotName: Schema.optional(Schema.String),
  rules: Schema.optional(Schema.Unknown),
}).pipe(Schema.extend(ContextFactSchemaCommon));
export type ArtifactSlotReferenceSchemaOutput = typeof ArtifactSlotReferenceSchemaOutput.Type;

export const WorkUnitDraftSpecSchemaOutput = Schema.Struct({
  contextFactKind: Schema.Literal("work_unit_draft_spec_fact"),
  targetWorkUnitDefinitionId: Schema.NonEmptyString,
  selectedFactSchemas: Schema.Record({
    key: Schema.NonEmptyString,
    value: DraftSpecSelectedFactSchema,
  }),
  selectedArtifactSchemas: Schema.Record({
    key: Schema.NonEmptyString,
    value: DraftSpecSelectedArtifactSchema,
  }),
}).pipe(Schema.extend(ContextFactSchemaCommon));
export type WorkUnitDraftSpecSchemaOutput = typeof WorkUnitDraftSpecSchemaOutput.Type;

export const ReadContextFactSchemaOutputV2 = Schema.Union(
  PlainFactSchemaOutput,
  BoundFactSchemaOutput,
  WorkflowRefSchemaOutput,
  WorkUnitReferenceSchemaOutput,
  ArtifactSlotReferenceSchemaOutput,
  WorkUnitDraftSpecSchemaOutput,
);
export type ReadContextFactSchemaOutputV2 = typeof ReadContextFactSchemaOutputV2.Type;

export const ReadContextFactInstancesInputV2 = Schema.Struct({
  factKey: ContextFactKey,
  instanceIds: Schema.optional(Schema.Array(ContextFactInstanceId)),
  limit: Schema.optional(Schema.Number),
});
export type ReadContextFactInstancesInputV2 = typeof ReadContextFactInstancesInputV2.Type;

const ContextFactInstanceCommon = Schema.Struct({
  instanceId: ContextFactInstanceId,
  recordedAt: Schema.optional(Schema.String),
});

export const PlainFactInstanceOutput = Schema.Struct({
  value: PlainFactValue,
}).pipe(Schema.extend(ContextFactInstanceCommon));
export type PlainFactInstanceOutput = typeof PlainFactInstanceOutput.Type;

export const BoundFactInstanceOutput = Schema.Struct({
  value: BoundFactValue,
}).pipe(Schema.extend(ContextFactInstanceCommon));
export type BoundFactInstanceOutput = typeof BoundFactInstanceOutput.Type;

export const WorkflowRefInstanceOutput = Schema.Struct({
  value: WorkflowRefFactValueV2,
  workflowDescription: Schema.optional(Schema.Unknown),
  workflowGuidance: Schema.optional(Schema.Unknown),
}).pipe(Schema.extend(ContextFactInstanceCommon));
export type WorkflowRefInstanceOutput = typeof WorkflowRefInstanceOutput.Type;

export const WorkUnitFactSummary = Schema.Struct({
  factKey: Schema.NonEmptyString,
  cardinality: FactCardinality,
  hasValue: Schema.Boolean,
  currentCount: Schema.Number,
  previewValue: Schema.optional(Schema.Unknown),
});
export type WorkUnitFactSummary = typeof WorkUnitFactSummary.Type;

export const WorkUnitCandidateSummary = Schema.Struct({
  projectWorkUnitId: Schema.NonEmptyString,
  label: Schema.String,
  workUnitTypeKey: Schema.NonEmptyString,
  workUnitTypeName: Schema.optional(Schema.String),
  currentStateKey: Schema.optional(Schema.NonEmptyString),
  currentStateLabel: Schema.optional(Schema.String),
  factSummaries: Schema.optional(Schema.Array(WorkUnitFactSummary)),
});
export type WorkUnitCandidateSummary = typeof WorkUnitCandidateSummary.Type;

export const WorkUnitReferenceInstanceOutput = Schema.Struct({
  value: WorkUnitReferenceFactValueV2,
  target: WorkUnitCandidateSummary,
}).pipe(Schema.extend(ContextFactInstanceCommon));
export type WorkUnitReferenceInstanceOutput = typeof WorkUnitReferenceInstanceOutput.Type;

export const ArtifactSlotReferenceInstanceOutput = Schema.Struct({
  value: ArtifactSlotReferenceFactValueV2,
  artifactSlotKey: Schema.optional(Schema.NonEmptyString),
  artifactSlotName: Schema.optional(Schema.String),
}).pipe(Schema.extend(ContextFactInstanceCommon));
export type ArtifactSlotReferenceInstanceOutput = typeof ArtifactSlotReferenceInstanceOutput.Type;

export const WorkUnitDraftSpecInstanceOutput = Schema.Struct({
  value: WorkUnitDraftSpecAuthoredValue,
}).pipe(Schema.extend(ContextFactInstanceCommon));
export type WorkUnitDraftSpecInstanceOutput = typeof WorkUnitDraftSpecInstanceOutput.Type;

export const ReadContextFactInstancesOutputV2 = Schema.Struct({
  factKey: ContextFactKey,
  contextFactKind: WorkflowContextFactKind,
  instances: Schema.Array(
    Schema.Union(
      PlainFactInstanceOutput,
      BoundFactInstanceOutput,
      WorkflowRefInstanceOutput,
      WorkUnitReferenceInstanceOutput,
      ArtifactSlotReferenceInstanceOutput,
      WorkUnitDraftSpecInstanceOutput,
    ),
  ),
});
export type ReadContextFactInstancesOutputV2 = typeof ReadContextFactInstancesOutputV2.Type;

export const ReadAttachableTargetsInputV2 = Schema.Struct({
  factKey: ContextFactKey,
  targetIds: Schema.optional(Schema.Array(Schema.NonEmptyString)),
  targetFieldKey: Schema.optional(Schema.NonEmptyString),
  limit: Schema.optional(Schema.Number),
});
export type ReadAttachableTargetsInputV2 = typeof ReadAttachableTargetsInputV2.Type;

export const BoundFactAttachableTarget = Schema.Struct({
  factInstanceId: Schema.NonEmptyString,
  value: Schema.Unknown,
});
export type BoundFactAttachableTarget = typeof BoundFactAttachableTarget.Type;

export const WorkflowAttachableTarget = Schema.Struct({
  workflowDefinitionId: Schema.NonEmptyString,
  workflowKey: Schema.NonEmptyString,
  workflowLabel: Schema.optional(Schema.String),
  description: Schema.optional(Schema.Unknown),
  guidance: Schema.optional(Schema.Unknown),
});
export type WorkflowAttachableTarget = typeof WorkflowAttachableTarget.Type;

export const WorkUnitReferenceAttachableTargetsOutput = Schema.Struct({
  factKey: ContextFactKey,
  contextFactKind: Schema.Literal("work_unit_reference_fact"),
  candidates: Schema.Array(WorkUnitCandidateSummary),
});
export type WorkUnitReferenceAttachableTargetsOutput =
  typeof WorkUnitReferenceAttachableTargetsOutput.Type;

export const BoundFactAttachableTargetsOutput = Schema.Struct({
  factKey: ContextFactKey,
  contextFactKind: Schema.Literal("bound_fact"),
  candidates: Schema.Array(BoundFactAttachableTarget),
});
export type BoundFactAttachableTargetsOutput = typeof BoundFactAttachableTargetsOutput.Type;

export const WorkflowRefAttachableTargetsOutput = Schema.Struct({
  factKey: ContextFactKey,
  contextFactKind: Schema.Literal("workflow_ref_fact"),
  candidates: Schema.Array(WorkflowAttachableTarget),
});
export type WorkflowRefAttachableTargetsOutput = typeof WorkflowRefAttachableTargetsOutput.Type;

export const DraftSpecAttachableTargetsOutput = Schema.Struct({
  factKey: ContextFactKey,
  contextFactKind: Schema.Literal("work_unit_draft_spec_fact"),
  fields: Schema.Record({
    key: Schema.NonEmptyString,
    value: Schema.Array(WorkUnitCandidateSummary),
  }),
});
export type DraftSpecAttachableTargetsOutput = typeof DraftSpecAttachableTargetsOutput.Type;

export const ReadAttachableTargetsOutputV2 = Schema.Union(
  BoundFactAttachableTargetsOutput,
  WorkflowRefAttachableTargetsOutput,
  WorkUnitReferenceAttachableTargetsOutput,
  DraftSpecAttachableTargetsOutput,
);
export type ReadAttachableTargetsOutputV2 = typeof ReadAttachableTargetsOutputV2.Type;

export const CreateContextFactInstanceInputV2 = Schema.Struct({
  factKey: ContextFactKey,
  value: ContextFactValueInputV2,
});
export type CreateContextFactInstanceInputV2 = typeof CreateContextFactInstanceInputV2.Type;

export const UpdateContextFactInstanceInputV2 = Schema.Struct({
  factKey: ContextFactKey,
  instanceId: ContextFactInstanceId,
  value: ContextFactValueInputV2,
});
export type UpdateContextFactInstanceInputV2 = typeof UpdateContextFactInstanceInputV2.Type;

export const RemoveContextFactInstanceInputV2 = Schema.Struct({
  factKey: ContextFactKey,
  instanceId: ContextFactInstanceId,
  value: Schema.optional(ContextFactValueInputV2),
});
export type RemoveContextFactInstanceInputV2 = typeof RemoveContextFactInstanceInputV2.Type;

export const DeleteContextFactInstanceInputV2 = Schema.Struct({
  factKey: ContextFactKey,
  instanceId: ContextFactInstanceId,
  value: Schema.optional(ContextFactValueInputV2),
});
export type DeleteContextFactInstanceInputV2 = typeof DeleteContextFactInstanceInputV2.Type;

export const ContextFactWriteResultOutputV2 = Schema.Struct({
  status: Schema.Literal("applied"),
  operation: ContextFactCrudOperation,
  factKey: ContextFactKey,
  instanceId: ContextFactInstanceId,
  value: Schema.optional(ContextFactInstanceValueV2),
  changedContext: Schema.Boolean,
});
export type ContextFactWriteResultOutputV2 = typeof ContextFactWriteResultOutputV2.Type;

export const AgentStepMcpV2RequestEnvelope = Schema.Union(
  Schema.Struct({
    version: Schema.Literal("v2"),
    toolName: Schema.Literal("read_step_execution_snapshot"),
    input: ReadStepExecutionSnapshotInputV2,
  }),
  Schema.Struct({
    version: Schema.Literal("v2"),
    toolName: Schema.Literal("read_context_fact_schema"),
    input: ReadContextFactSchemaInputV2,
  }),
  Schema.Struct({
    version: Schema.Literal("v2"),
    toolName: Schema.Literal("read_context_fact_instances"),
    input: ReadContextFactInstancesInputV2,
  }),
  Schema.Struct({
    version: Schema.Literal("v2"),
    toolName: Schema.Literal("read_attachable_targets"),
    input: ReadAttachableTargetsInputV2,
  }),
  Schema.Struct({
    version: Schema.Literal("v2"),
    toolName: Schema.Literal("create_context_fact_instance"),
    input: CreateContextFactInstanceInputV2,
  }),
  Schema.Struct({
    version: Schema.Literal("v2"),
    toolName: Schema.Literal("update_context_fact_instance"),
    input: UpdateContextFactInstanceInputV2,
  }),
  Schema.Struct({
    version: Schema.Literal("v2"),
    toolName: Schema.Literal("remove_context_fact_instance"),
    input: RemoveContextFactInstanceInputV2,
  }),
  Schema.Struct({
    version: Schema.Literal("v2"),
    toolName: Schema.Literal("delete_context_fact_instance"),
    input: DeleteContextFactInstanceInputV2,
  }),
);
export type AgentStepMcpV2RequestEnvelope = typeof AgentStepMcpV2RequestEnvelope.Type;

export const AgentStepMcpV2ResponseEnvelope = Schema.Union(
  Schema.Struct({
    version: Schema.Literal("v2"),
    toolName: Schema.Literal("read_step_execution_snapshot"),
    output: ReadStepExecutionSnapshotOutputV2,
  }),
  Schema.Struct({
    version: Schema.Literal("v2"),
    toolName: Schema.Literal("read_context_fact_schema"),
    output: ReadContextFactSchemaOutputV2,
  }),
  Schema.Struct({
    version: Schema.Literal("v2"),
    toolName: Schema.Literal("read_context_fact_instances"),
    output: ReadContextFactInstancesOutputV2,
  }),
  Schema.Struct({
    version: Schema.Literal("v2"),
    toolName: Schema.Literal("read_attachable_targets"),
    output: ReadAttachableTargetsOutputV2,
  }),
  Schema.Struct({
    version: Schema.Literal("v2"),
    toolName: Schema.Literal(
      "create_context_fact_instance",
      "update_context_fact_instance",
      "remove_context_fact_instance",
      "delete_context_fact_instance",
    ),
    output: ContextFactWriteResultOutputV2,
  }),
  Schema.Struct({
    version: Schema.Literal("v2"),
    toolName: AgentStepMcpV2ToolName,
    error: AgentStepRuntimeErrorEnvelope,
  }),
);
export type AgentStepMcpV2ResponseEnvelope = typeof AgentStepMcpV2ResponseEnvelope.Type;
