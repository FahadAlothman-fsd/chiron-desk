import { Context, Effect, Stream } from "effect";
import type {
  AgentKind,
  AgentRunParams,
  AgentRunResult,
  AgentStreamEvent,
} from "@chiron/contracts";
import { AgentRuntimeError } from "./errors";

export interface AgentAdapter {
  readonly kind: AgentKind;
  run: (params: AgentRunParams) => Effect.Effect<AgentRunResult, AgentRuntimeError>;
  stream: (params: AgentRunParams) => Stream.Stream<AgentStreamEvent, AgentRuntimeError>;
}

export const ChironAgentAdapter = Context.GenericTag<AgentAdapter>("ChironAgentAdapter");
export const OpenCodeAgentAdapter = Context.GenericTag<AgentAdapter>("OpenCodeAgentAdapter");
