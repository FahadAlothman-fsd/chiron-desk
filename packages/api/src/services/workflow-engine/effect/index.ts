import { Layer } from "effect";
import { AIProviderServiceLive } from "./ai-provider-service";
import { AiRuntimeServiceLive } from "./ai-runtime/ai-runtime-service";
import { ApprovalServiceLive } from "./approval-service";
import { ChatServiceLive } from "./chat-service";
import { ConfigServiceLive } from "./config-service";
import { DatabaseServiceLive } from "./database-service";
import { WorkflowEventBusLive } from "./event-bus";
import { StepHandlerRegistryLive } from "./step-registry";
import { ToolApprovalGatewayLive } from "./tool-approval-gateway";
import { VariableServiceLive } from "./variable-service";

export * from "./ai-runtime/ai-runtime-service";
export * from "./ai-runtime/ai-runtime-runner";
export * from "./ai-runtime/events";
export * from "./ai-runtime/opencode-relay";
export * from "./approval-service";
export * from "./chat-service";
export * from "./config-service";
export * from "./database-service";
export * from "./error-recovery";
export * from "./error-utils";
export * from "./errors";
export * from "./event-bus";
export * from "./execution-context";
export * from "./executor";
export * from "./step-registry";
export * from "./streaming-adapter";
export * from "./tool-approval-gateway";
export * from "./tool-builder";
export * from "./tooling-engine";
export * from "./variable-service";

export const AILayer = Layer.mergeAll(
  AIProviderServiceLive,
  AiRuntimeServiceLive,
  ChatServiceLive,
  ApprovalServiceLive,
);

export const MainLayer = Layer.mergeAll(
  DatabaseServiceLive,
  ConfigServiceLive,
  WorkflowEventBusLive,
  StepHandlerRegistryLive,
  ToolApprovalGatewayLive,
).pipe(Layer.provideMerge(VariableServiceLive), Layer.provideMerge(AILayer));
