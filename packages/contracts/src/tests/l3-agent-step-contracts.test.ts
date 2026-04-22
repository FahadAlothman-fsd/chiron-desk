import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";

import {
  AGENT_STEP_ALLOWED_STATE_TRANSITIONS,
  AGENT_STEP_EDITOR_TABS,
  AGENT_STEP_NORMALIZED_ERROR_TAGS,
  AGENT_STEP_RUNTIME_STATES,
  AGENT_STEP_V2_MCP_TOOLS,
  AgentStepAllowedStateTransition,
  AgentStepContractBoundary,
  AgentStepDesignTimePayload,
  AgentStepNormalizedError,
  AgentStepRuntimeDetailPayload,
  CreateAgentStepInput,
  GetAgentStepExecutionDetailOutput,
  SendAgentStepMessageInput,
  StartAgentStepSessionInput,
  UpdateAgentStepTurnSelectionInput,
} from "../agent-step";
import {
  AGENT_STEP_MCP_V2_TOOLS,
  AgentStepMcpScopeV2,
  AgentStepMcpV2RequestEnvelope,
  AgentStepMcpV2ResponseEnvelope,
} from "../mcp";

describe("l3 agent-step contracts", () => {
  it("locks the design-time payload and dialog tabs", () => {
    expect(AGENT_STEP_EDITOR_TABS).toEqual([
      "overview",
      "objective_and_instructions",
      "harness_and_model",
      "read_scope",
      "write_scope",
      "completion_and_runtime_policy",
      "guidance",
    ]);

    const decode = Schema.decodeUnknownSync(AgentStepDesignTimePayload);
    const decoded = decode({
      key: "draft-prd",
      label: "Draft PRD",
      objective: "Draft a PRD from the available context.",
      instructionsMarkdown: "Focus on outcomes, constraints, and acceptance criteria.",
      harnessSelection: {
        agent: "explore",
        model: {
          provider: "openai",
          model: "gpt-5.4",
        },
      },
      explicitReadGrants: [{ contextFactDefinitionId: "fact-project-context" }],
      writeItems: [
        {
          writeItemId: "write-prd",
          contextFactDefinitionId: "fact-prd-artifact",
          contextFactKind: "artifact_slot_reference_fact",
          order: 10,
          requirementContextFactDefinitionIds: ["fact-project-context"],
        },
      ],
      completionRequirements: [{ contextFactDefinitionId: "fact-prd-artifact" }],
      request_context_access: true,
    });

    expect(decoded).toMatchObject({
      key: "draft-prd",
      harnessSelection: {
        harness: "opencode",
        agent: "explore",
        model: {
          provider: "openai",
          model: "gpt-5.4",
        },
      },
      runtimePolicy: {
        sessionStart: "explicit",
        continuationMode: "bootstrap_only",
        liveStreamCount: 1,
        bootstrapPromptNoReply: true,
        nativeMessageLog: false,
        persistedWritePolicy: "applied_only",
      },
    });
    expect(decoded).not.toHaveProperty("request_context_access");
  });

  it("locks create/update/runtime procedure contracts", () => {
    const createInput = Schema.decodeUnknownSync(CreateAgentStepInput)({
      workflowDefinitionId: "wf-1",
      afterStepKey: null,
      payload: {
        key: "draft-prd",
        objective: "Draft the PRD.",
        instructionsMarkdown: "Use the pinned methodology version only.",
        explicitReadGrants: [],
        writeItems: [],
        completionRequirements: [],
      },
    });

    expect(createInput.afterStepKey).toBeNull();

    expect(
      Schema.decodeUnknownSync(StartAgentStepSessionInput)({
        projectId: "project-1",
        stepExecutionId: "step-exec-1",
      }),
    ).toEqual({ projectId: "project-1", stepExecutionId: "step-exec-1" });

    expect(
      Schema.decodeUnknownSync(SendAgentStepMessageInput)({
        projectId: "project-1",
        stepExecutionId: "step-exec-1",
        message: "Draft the artifact now.",
      }).message,
    ).toBe("Draft the artifact now.");

    expect(
      Schema.decodeUnknownSync(UpdateAgentStepTurnSelectionInput)({
        projectId: "project-1",
        stepExecutionId: "step-exec-1",
        model: {
          provider: "anthropic",
          model: "claude-sonnet",
        },
      }).model,
    ).toEqual({ provider: "anthropic", model: "claude-sonnet" });

    expect(
      Schema.decodeUnknownSync(UpdateAgentStepTurnSelectionInput)({
        projectId: "project-1",
        stepExecutionId: "step-exec-1",
        agent: "explore",
      }).agent,
    ).toBe("explore");
  });

  it("freezes the runtime state machine and disallows extra states", () => {
    expect(AGENT_STEP_RUNTIME_STATES).toEqual([
      "not_started",
      "starting_session",
      "active_streaming",
      "active_idle",
      "disconnected_or_error",
      "completed",
    ]);

    expect(AGENT_STEP_ALLOWED_STATE_TRANSITIONS).toEqual({
      not_started: ["starting_session"],
      starting_session: ["active_streaming", "active_idle", "disconnected_or_error"],
      active_streaming: ["active_idle", "disconnected_or_error"],
      active_idle: ["active_streaming", "disconnected_or_error", "completed"],
      disconnected_or_error: ["starting_session", "active_idle", "completed"],
      completed: [],
    });

    const decodeTransition = Schema.decodeUnknownSync(AgentStepAllowedStateTransition);
    expect(decodeTransition({ from: "not_started", to: "starting_session" })).toEqual({
      from: "not_started",
      to: "starting_session",
    });
    expect(() => decodeTransition({ from: "completed", to: "active_idle" })).toThrow();
    expect(() => decodeTransition({ from: "active_streaming", to: "completed" })).toThrow();
    expect(() => decodeTransition({ from: "paused", to: "completed" })).toThrow();
  });

  it("locks runtime detail payloads around single-stream and applied-write semantics", () => {
    const detail = Schema.decodeUnknownSync(AgentStepRuntimeDetailPayload)({
      stepType: "agent",
      state: "active_idle",
      sessionStartPolicy: "explicit",
      contractBoundary: {
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
      },
      harnessBinding: {
        harnessId: "opencode",
        bindingState: "bound",
        sessionId: "session-1",
        serverInstanceId: "server-1",
        selectedAgent: "explore",
      },
      composer: {
        enabled: true,
        startSessionVisible: false,
      },
      objective: "Draft a PRD.",
      instructionsMarkdown: "Ground every claim in context.",
      readableContextFacts: [
        {
          readItemId: "projectContext",
          contextFactDefinitionId: "fact-project-context",
          contextFactKind: "plain_fact",
          source: "explicit",
          supportedReadModes: ["latest", "all"],
        },
      ],
      writeItems: [
        {
          writeItemId: "write-prd",
          contextFactDefinitionId: "fact-prd-artifact",
          contextFactKind: "artifact_slot_reference_fact",
          order: 100,
          requirementContextFactDefinitionIds: ["fact-project-context"],
          exposureMode: "requirements_only",
        },
      ],
      writeSetCompletion: {
        total: 1,
        applied: 1,
        ready: 0,
        blocked: 0,
        isComplete: true,
      },
      nextStep: {
        state: "active",
        nextStepDefinitionId: "step-2",
        nextStepExecutionId: "step-exec-2",
      },
      timelinePreview: [
        {
          itemType: "thinking",
          timelineItemId: "item-1",
          createdAt: "2026-04-09T00:00:00.000Z",
          content: "Bootstrap applied.",
        },
      ],
    });

    expect(detail.timelinePreview[0]?.itemType).toBe("thinking");
    expect(detail.nextStep?.nextStepExecutionId).toBe("step-exec-2");
    expect(detail.contractBoundary.streamContract.streamCount).toBe(1);
    expect(detail.contractBoundary.requestContextAccess).toBe(false);
    expect(detail.contractBoundary.nativeMessageLog).toBe(false);
    expect(detail.contractBoundary.persistedWritePolicy).toBe("applied_only");
  });

  it("freezes the detail output wrapper", () => {
    const output = Schema.decodeUnknownSync(GetAgentStepExecutionDetailOutput)({
      stepExecutionId: "step-exec-1",
      workflowExecutionId: "wf-exec-1",
      body: {
        stepType: "agent",
        state: "not_started",
        sessionStartPolicy: "explicit",
        contractBoundary: {
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
        },
        harnessBinding: {
          harnessId: "opencode",
          bindingState: "unbound",
        },
        composer: {
          enabled: false,
          startSessionVisible: true,
          reasonIfDisabled: "Start the session first.",
        },
        objective: "Draft the PRD.",
        instructionsMarkdown: "Use the reusable context only.",
        readableContextFacts: [],
        writeItems: [],
        writeSetCompletion: {
          total: 0,
          applied: 0,
          ready: 0,
          blocked: 0,
          isComplete: false,
        },
        nextStep: {
          state: "inactive",
          nextStepDefinitionId: "step-2",
        },
        timelinePreview: [],
      },
    });

    expect(output.body.state).toBe("not_started");
    expect(output.body.composer.startSessionVisible).toBe(true);
    expect(output.body.nextStep?.state).toBe("inactive");
  });

  it("locks MCP v2 to the full context-fact CRUD surface", () => {
    expect(AGENT_STEP_MCP_V2_TOOLS).toEqual([
      "read_step_execution_snapshot",
      "read_context_fact_schema",
      "read_context_fact_instances",
      "read_attachable_targets",
      "create_context_fact_instance",
      "update_context_fact_instance",
      "remove_context_fact_instance",
      "delete_context_fact_instance",
    ]);

    const scope = Schema.decodeUnknownSync(AgentStepMcpScopeV2)({
      version: "v2",
      tools: [...AGENT_STEP_MCP_V2_TOOLS],
      requestContextAccess: false,
    });
    expect(scope).toEqual({
      version: "v2",
      tools: [...AGENT_STEP_MCP_V2_TOOLS],
      requestContextAccess: false,
    });

    expect(() =>
      Schema.decodeUnknownSync(AgentStepMcpV2RequestEnvelope)({
        version: "v2",
        toolName: "request_context_access",
        input: {},
      }),
    ).toThrow();

    const writeResponse = Schema.decodeUnknownSync(AgentStepMcpV2ResponseEnvelope)({
      version: "v2",
      toolName: "update_context_fact_instance",
      output: {
        status: "applied",
        operation: "update",
        factKey: "prd_artifact",
        instanceId: "ctx-1",
        value: { files: [{ filePath: "docs/prd.md", gitCommitHash: "abc123" }] },
        changedContext: true,
      },
    });

    expect(writeResponse.toolName).toBe("update_context_fact_instance");
    if (writeResponse.toolName !== "update_context_fact_instance") {
      throw new Error("expected update_context_fact_instance response");
    }

    if (!("output" in writeResponse)) {
      throw new Error("expected update_context_fact_instance output envelope");
    }

    expect(writeResponse.output.status).toBe("applied");
    expect(writeResponse.output.changedContext).toBe(true);
  });

  it("normalizes typed errors to harness/opencode families only", () => {
    expect(AGENT_STEP_NORMALIZED_ERROR_TAGS).toEqual([
      "AgentStepStateTransitionError",
      "HarnessExecutionError",
      "OpenCodeExecutionError",
      "McpToolValidationError",
      "McpWriteRequirementError",
      "SingleLiveStreamContractError",
    ]);

    const error = Schema.decodeUnknownSync(AgentStepNormalizedError)({
      _tag: "OpenCodeExecutionError",
      operation: "stream_events",
      message: "Harness stream terminated unexpectedly.",
    });

    expect(error._tag).toBe("OpenCodeExecutionError");
    expect(() =>
      Schema.decodeUnknownSync(AgentStepNormalizedError)({
        _tag: "AnthropicRateLimitError",
        message: "nope",
      }),
    ).toThrow();
  });

  it("keeps the exported contract boundary stable", () => {
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
      secondLiveStream: true,
    });

    expect(boundary.streamContract.streamCount).toBe(1);
    expect(boundary).not.toHaveProperty("secondLiveStream");
  });
});
