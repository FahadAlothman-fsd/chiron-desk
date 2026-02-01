import { Context, Effect, Layer, Stream } from "effect";
import type { AgentRunParams, AgentRunResult, AgentStreamEvent } from "@chiron/contracts";
import { AgentRuntimeError } from "./errors";
import { ChironAgentAdapter, OpenCodeAgentAdapter } from "./adapters";
import { ChironAgentAdapterLive } from "./adapters/chiron-adapter";
import { OpenCodeAgentAdapterLive } from "./adapters/opencode-adapter";

export interface AgentRuntime {
  readonly _tag: "AgentRuntime";
  run: (params: AgentRunParams) => Effect.Effect<AgentRunResult, AgentRuntimeError>;
  stream: (params: AgentRunParams) => Stream.Stream<AgentStreamEvent, AgentRuntimeError>;
}

export const AgentRuntime = Context.GenericTag<AgentRuntime>("AgentRuntime");

export const AgentRuntimeLive = Layer.effect(
  AgentRuntime,
  Effect.gen(function* () {
    const chironAdapter = yield* ChironAgentAdapter;
    const opencodeAdapter = yield* OpenCodeAgentAdapter;

    return {
      _tag: "AgentRuntime" as const,
      run: (params) =>
        params.agentKind === "opencode" ? opencodeAdapter.run(params) : chironAdapter.run(params),
      stream: (params) =>
        params.agentKind === "opencode"
          ? opencodeAdapter.stream(params)
          : chironAdapter.stream(params),
    };
  }),
);

export const AgentRuntimeDefault = AgentRuntimeLive.pipe(
  Layer.provide(ChironAgentAdapterLive),
  Layer.provide(OpenCodeAgentAdapterLive),
);
