import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";

import {
  AGENT_STEP_MCP_READ_MODES,
  AGENT_STEP_V2_MCP_TOOLS,
  AgentStepContractBoundary,
  AgentStepReadableContextFact,
  AgentStepRuntimeErrorEnvelope,
} from "../agent-step/runtime";
import {
  AgentStepMcpRequestEnvelope,
  AgentStepMcpResponseEnvelope,
  ReadContextValueInput,
  ReadContextValueOutput,
  ReadStepSnapshotInput,
  WriteContextValueInput,
} from "../mcp/tools";
import { McpToolValidationError } from "../agent-step/errors";

describe("mcp progressive disclosure contracts", () => {
  it("locks item-id based MCP inputs and removes stepExecutionId from v1 tool inputs", () => {
    expect(
      Schema.decodeUnknownSync(ReadStepSnapshotInput)({
        readItemId: "read-step-snapshot",
        stepExecutionId: "should-be-dropped",
      }),
    ).toEqual({ readItemId: "read-step-snapshot" });

    expect(
      Schema.decodeUnknownSync(WriteContextValueInput)({
        writeItemId: "write-story-doc",
        valueJson: { markdown: "draft" },
        stepExecutionId: "should-be-dropped",
      }),
    ).toEqual({
      writeItemId: "write-story-doc",
      valueJson: { markdown: "draft" },
    });
  });

  it("locks mode-driven reads with explicit queryParam", () => {
    expect(AGENT_STEP_MCP_READ_MODES).toEqual(["latest", "all", "query"]);

    expect(
      Schema.decodeUnknownSync(ReadContextValueInput)({
        readItemId: "storyDrafts",
        mode: "latest",
      }),
    ).toEqual({
      readItemId: "storyDrafts",
      mode: "latest",
    });

    expect(
      Schema.decodeUnknownSync(ReadContextValueInput)({
        readItemId: "supportingFlows",
        mode: "query",
        queryParam: "instanceId=ctx-1&limit=2",
      }),
    ).toEqual({
      readItemId: "supportingFlows",
      mode: "query",
      queryParam: "instanceId=ctx-1&limit=2",
    });

    expect(() =>
      Schema.decodeUnknownSync(ReadContextValueInput)({
        readItemId: "supportingFlows",
        mode: "query",
      }),
    ).toThrow();
  });

  it("locks progressive disclosure read/write ids on the runtime contract boundary", () => {
    expect(AGENT_STEP_V2_MCP_TOOLS).toEqual([
      "read_step_execution_snapshot",
      "read_context_fact_schema",
      "read_context_fact_instances",
      "read_attachable_targets",
      "create_context_fact_instance",
      "update_context_fact_instance",
      "remove_context_fact_instance",
      "delete_context_fact_instance",
    ]);

    const boundary = Schema.decodeUnknownSync(AgentStepContractBoundary)({
      version: "v2",
      supportedMcpTools: [...AGENT_STEP_V2_MCP_TOOLS],
      stepSnapshotReadItemId: "read_step_execution_snapshot",
      requestContextAccess: false,
      continuationMode: "bootstrap_only",
      nativeMessageLog: false,
      persistedWritePolicy: "applied_only",
      streamContract: {
        streamName: "agent_step_session_events",
        streamCount: 1,
        transport: "sse",
        source: "step_execution_scoped",
        purpose: "timeline_and_tool_activity",
      },
    });

    expect(boundary.stepSnapshotReadItemId).toBe("read_step_execution_snapshot");

    const readable = Schema.decodeUnknownSync(AgentStepReadableContextFact)({
      readItemId: "supportingFlows",
      contextFactDefinitionId: "context-fact-1",
      contextFactKind: "bound_fact",
      source: "explicit",
      supportedReadModes: ["latest", "query"],
      queryParam: "instanceId",
    });

    expect(readable).toEqual({
      readItemId: "supportingFlows",
      contextFactDefinitionId: "context-fact-1",
      contextFactKind: "bound_fact",
      source: "explicit",
      supportedReadModes: ["latest", "query"],
      queryParam: "instanceId",
    });
  });

  it("locks read outputs to runtime instance envelopes", () => {
    const output = Schema.decodeUnknownSync(ReadContextValueOutput)({
      readItemId: "storyDrafts",
      mode: "query",
      queryParam: "instanceId=ctx-1",
      contextFactDefinitionId: "context-fact-1",
      contextFactKind: "artifact_slot_reference_fact",
      values: [
        {
          instanceId: "ctx-1",
          value: {
            slotDefinitionId: "slot-story-doc",
            artifactInstanceId: "artifact-instance-1",
            files: [
              {
                filePath: "stories/draft.md",
                gitCommitHash: "abc123",
                gitCommitTitle: "Add draft story",
              },
            ],
          },
          recordedAt: "2026-04-19T00:00:00.000Z",
        },
      ],
    });

    expect(output.values[0]).toEqual({
      instanceId: "ctx-1",
      value: {
        slotDefinitionId: "slot-story-doc",
        artifactInstanceId: "artifact-instance-1",
        files: [
          {
            filePath: "stories/draft.md",
            gitCommitHash: "abc123",
            gitCommitTitle: "Add draft story",
          },
        ],
      },
      recordedAt: "2026-04-19T00:00:00.000Z",
    });
  });

  it("makes context-fact readItemId equal the fact definition key", () => {
    const factDefinitionKey = "storyDrafts";

    const readable = Schema.decodeUnknownSync(AgentStepReadableContextFact)({
      readItemId: factDefinitionKey,
      contextFactDefinitionId: "context-fact-story-drafts",
      contextFactKind: "work_unit_draft_spec_fact",
      source: "explicit",
      supportedReadModes: ["latest", "all", "query"],
      queryParam: "instanceId",
    });

    const request = Schema.decodeUnknownSync(ReadContextValueInput)({
      readItemId: factDefinitionKey,
      mode: "all",
    });

    expect(readable.readItemId).toBe(factDefinitionKey);
    expect(request.readItemId).toBe(factDefinitionKey);
    expect(readable.readItemId).toBe("storyDrafts");
  });

  it("locks structured MCP runtime error envelopes", () => {
    const runtimeError = Schema.decodeUnknownSync(AgentStepRuntimeErrorEnvelope)({
      status: "error",
      error: new McpToolValidationError({
        toolName: "read_context_fact_instances",
        message: "Unsupported read mode.",
      }),
    });

    expect(runtimeError.error._tag).toBe("McpToolValidationError");

    const response = Schema.decodeUnknownSync(AgentStepMcpResponseEnvelope)({
      version: "v1",
      toolName: "read_context_value",
      error: runtimeError,
    });

    expect(response.toolName).toBe("read_context_value");
    expect("error" in response).toBe(true);
  });

  it("locks request envelopes to the new progressive disclosure inputs", () => {
    const request = Schema.decodeUnknownSync(AgentStepMcpRequestEnvelope)({
      version: "v1",
      toolName: "read_context_value",
      input: {
        readItemId: "supportingFlows",
        mode: "all",
      },
    });

    expect(request.input).toEqual({
      readItemId: "supportingFlows",
      mode: "all",
    });
  });
});
