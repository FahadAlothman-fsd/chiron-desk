import * as Schema from "effect/Schema";

import {
  AgentStepMcpReadMode,
  AgentStepRuntimeErrorEnvelope,
  AgentStepRuntimeState,
} from "../agent-step/runtime.js";
import { WorkflowContextFactKind } from "../methodology/workflow.js";
import { RuntimeFactInstanceValue } from "../runtime/facts.js";

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
  readItemId: Schema.NonEmptyString,
});
export type ReadStepSnapshotInput = typeof ReadStepSnapshotInput.Type;

export const ReadStepSnapshotOutput = Schema.Struct({
  readItemId: Schema.NonEmptyString,
  stepExecutionId: Schema.NonEmptyString,
  workflowExecutionId: Schema.NonEmptyString,
  state: AgentStepRuntimeState,
  objective: Schema.NonEmptyString,
  instructionsMarkdown: Schema.NonEmptyString,
  contractVersion: Schema.Literal("v1"),
});
export type ReadStepSnapshotOutput = typeof ReadStepSnapshotOutput.Type;

// For read_context_value, readItemId is the workflow context fact definition key exposed to the agent.
// The server resolves that key to the backing contextFactDefinitionId before reading values.
export const ReadContextValueInput = Schema.Union(
  Schema.Struct({
    readItemId: Schema.NonEmptyString,
    mode: Schema.Literal("latest", "all"),
  }),
  Schema.Struct({
    readItemId: Schema.NonEmptyString,
    mode: Schema.Literal("query"),
    queryParam: Schema.NonEmptyString,
  }),
);
export type ReadContextValueInput = typeof ReadContextValueInput.Type;

export const ReadContextValueOutput = Schema.Struct({
  readItemId: Schema.NonEmptyString,
  mode: AgentStepMcpReadMode,
  queryParam: Schema.optional(Schema.NonEmptyString),
  contextFactDefinitionId: Schema.NonEmptyString,
  contextFactKind: WorkflowContextFactKind,
  values: Schema.Array(
    RuntimeFactInstanceValue.pipe(
      Schema.extend(
        Schema.Struct({
          recordedAt: Schema.optional(Schema.String),
        }),
      ),
    ),
  ),
});
export type ReadContextValueOutput = typeof ReadContextValueOutput.Type;

export const WriteContextValueInput = Schema.Struct({
  writeItemId: Schema.NonEmptyString,
  valueJson: Schema.Unknown,
  appliedByTimelineItemId: Schema.optional(Schema.NonEmptyString),
});
export type WriteContextValueInput = typeof WriteContextValueInput.Type;

export const WriteContextValueOutput = Schema.Struct({
  status: Schema.Literal("applied"),
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
    toolName: Schema.Literal("read_step_snapshot"),
    error: AgentStepRuntimeErrorEnvelope,
  }),
  Schema.Struct({
    version: Schema.Literal("v1"),
    toolName: Schema.Literal("read_context_value"),
    output: ReadContextValueOutput,
  }),
  Schema.Struct({
    version: Schema.Literal("v1"),
    toolName: Schema.Literal("read_context_value"),
    error: AgentStepRuntimeErrorEnvelope,
  }),
  Schema.Struct({
    version: Schema.Literal("v1"),
    toolName: Schema.Literal("write_context_value"),
    output: WriteContextValueOutput,
  }),
  Schema.Struct({
    version: Schema.Literal("v1"),
    toolName: Schema.Literal("write_context_value"),
    error: AgentStepRuntimeErrorEnvelope,
  }),
);
export type AgentStepMcpResponseEnvelope = typeof AgentStepMcpResponseEnvelope.Type;
