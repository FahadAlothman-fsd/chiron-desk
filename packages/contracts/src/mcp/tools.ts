import * as Schema from "effect/Schema";

import { AgentStepRuntimeState } from "../agent-step/runtime.js";
import { WorkflowContextFactKind } from "../methodology/workflow.js";

export const AGENT_STEP_MCP_V1_TOOLS = [
  "read_step_snapshot",
  "read_context_value",
  "write_context_value",
] as const;

export const AgentStepMcpToolName = Schema.Literal(...AGENT_STEP_MCP_V1_TOOLS);
export type AgentStepMcpToolName = typeof AgentStepMcpToolName.Type;

export const AgentStepMcpScope = Schema.Struct({
  version: Schema.Literal("v1"),
  tools: Schema.Array(AgentStepMcpToolName),
  requestContextAccess: Schema.Literal(false),
});
export type AgentStepMcpScope = typeof AgentStepMcpScope.Type;

export const ReadStepSnapshotInput = Schema.Struct({
  stepExecutionId: Schema.NonEmptyString,
});
export type ReadStepSnapshotInput = typeof ReadStepSnapshotInput.Type;

export const ReadStepSnapshotOutput = Schema.Struct({
  stepExecutionId: Schema.NonEmptyString,
  workflowExecutionId: Schema.NonEmptyString,
  state: AgentStepRuntimeState,
  objective: Schema.NonEmptyString,
  instructionsMarkdown: Schema.NonEmptyString,
  contractVersion: Schema.Literal("v1"),
});
export type ReadStepSnapshotOutput = typeof ReadStepSnapshotOutput.Type;

export const ReadContextValueInput = Schema.Struct({
  stepExecutionId: Schema.NonEmptyString,
  contextFactDefinitionId: Schema.NonEmptyString,
});
export type ReadContextValueInput = typeof ReadContextValueInput.Type;

export const ReadContextValueOutput = Schema.Struct({
  stepExecutionId: Schema.NonEmptyString,
  contextFactDefinitionId: Schema.NonEmptyString,
  contextFactKind: WorkflowContextFactKind,
  values: Schema.Array(
    Schema.Struct({
      contextFactInstanceId: Schema.optional(Schema.NonEmptyString),
      valueJson: Schema.Unknown,
      recordedAt: Schema.optional(Schema.String),
    }),
  ),
});
export type ReadContextValueOutput = typeof ReadContextValueOutput.Type;

export const WriteContextValueInput = Schema.Struct({
  stepExecutionId: Schema.NonEmptyString,
  writeItemId: Schema.NonEmptyString,
  valueJson: Schema.Unknown,
  appliedByTimelineItemId: Schema.optional(Schema.NonEmptyString),
});
export type WriteContextValueInput = typeof WriteContextValueInput.Type;

export const WriteContextValueOutput = Schema.Struct({
  status: Schema.Literal("applied"),
  stepExecutionId: Schema.NonEmptyString,
  writeItemId: Schema.NonEmptyString,
  appliedWrite: Schema.Struct({
    appliedWriteId: Schema.NonEmptyString,
    contextFactDefinitionId: Schema.NonEmptyString,
    appliedAt: Schema.String,
    valueJson: Schema.Unknown,
  }),
});
export type WriteContextValueOutput = typeof WriteContextValueOutput.Type;

export const AgentStepMcpRequestEnvelope = Schema.Union(
  Schema.Struct({
    version: Schema.Literal("v1"),
    toolName: Schema.Literal("read_step_snapshot"),
    input: ReadStepSnapshotInput,
  }),
  Schema.Struct({
    version: Schema.Literal("v1"),
    toolName: Schema.Literal("read_context_value"),
    input: ReadContextValueInput,
  }),
  Schema.Struct({
    version: Schema.Literal("v1"),
    toolName: Schema.Literal("write_context_value"),
    input: WriteContextValueInput,
  }),
);
export type AgentStepMcpRequestEnvelope = typeof AgentStepMcpRequestEnvelope.Type;

export const AgentStepMcpResponseEnvelope = Schema.Union(
  Schema.Struct({
    version: Schema.Literal("v1"),
    toolName: Schema.Literal("read_step_snapshot"),
    output: ReadStepSnapshotOutput,
  }),
  Schema.Struct({
    version: Schema.Literal("v1"),
    toolName: Schema.Literal("read_context_value"),
    output: ReadContextValueOutput,
  }),
  Schema.Struct({
    version: Schema.Literal("v1"),
    toolName: Schema.Literal("write_context_value"),
    output: WriteContextValueOutput,
  }),
);
export type AgentStepMcpResponseEnvelope = typeof AgentStepMcpResponseEnvelope.Type;
