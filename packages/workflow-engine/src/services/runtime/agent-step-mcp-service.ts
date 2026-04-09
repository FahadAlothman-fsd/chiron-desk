import type {
  AgentStepMcpRequestEnvelope,
  AgentStepMcpResponseEnvelope,
} from "@chiron/contracts/mcp/tools";
import { Context, Effect, Layer } from "effect";

import { AgentStepContextReadService } from "./agent-step-context-read-service";
import {
  AgentStepContextWriteService,
  type AgentStepContextWriteResult,
} from "./agent-step-context-write-service";
import { AgentStepSnapshotService } from "./agent-step-snapshot-service";

export interface AgentStepMcpExecutionResult {
  readonly response: AgentStepMcpResponseEnvelope;
  readonly newlyExposedWriteItems: AgentStepContextWriteResult["newlyExposedWriteItems"];
}

export class AgentStepMcpService extends Context.Tag(
  "@chiron/workflow-engine/services/runtime/AgentStepMcpService",
)<
  AgentStepMcpService,
  {
    readonly execute: (
      request: AgentStepMcpRequestEnvelope,
    ) => Effect.Effect<AgentStepMcpExecutionResult, unknown>;
  }
>() {}

export const AgentStepMcpServiceLive = Layer.effect(
  AgentStepMcpService,
  Effect.gen(function* () {
    const snapshot = yield* AgentStepSnapshotService;
    const read = yield* AgentStepContextReadService;
    const write = yield* AgentStepContextWriteService;

    const execute = (request: AgentStepMcpRequestEnvelope) =>
      Effect.gen(function* () {
        switch (request.toolName) {
          case "read_step_snapshot":
            return {
              response: {
                version: "v1",
                toolName: "read_step_snapshot",
                output: yield* snapshot.readStepSnapshot(request.input),
              },
              newlyExposedWriteItems: [],
            } satisfies AgentStepMcpExecutionResult;
          case "read_context_value":
            return {
              response: {
                version: "v1",
                toolName: "read_context_value",
                output: yield* read.readContextValue(request.input),
              },
              newlyExposedWriteItems: [],
            } satisfies AgentStepMcpExecutionResult;
          case "write_context_value": {
            const result = yield* write.writeContextValue(request.input);
            return {
              response: {
                version: "v1",
                toolName: "write_context_value",
                output: result.output,
              },
              newlyExposedWriteItems: result.newlyExposedWriteItems,
            } satisfies AgentStepMcpExecutionResult;
          }
        }
      });

    return AgentStepMcpService.of({ execute });
  }),
);
