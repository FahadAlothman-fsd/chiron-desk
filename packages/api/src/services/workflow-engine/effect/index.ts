import { Layer } from "effect";
import { AIProviderServiceLive } from "./ai-provider-service";
import { ApprovalServiceLive } from "./approval-service";
import { ChatServiceLive } from "./chat-service";
import { ConfigServiceLive } from "./config-service";
import { DatabaseServiceLive } from "./database-service";
import { WorkflowEventBusLive } from "./event-bus";
import { StepHandlerRegistryLive } from "./step-registry";
import { VariableServiceLive } from "./variable-service";

export * from "./ai-provider-service";
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
export * from "./tool-builder";
export * from "./variable-service";

export const AILayer = Layer.mergeAll(AIProviderServiceLive, ChatServiceLive, ApprovalServiceLive);

export const MainLayer = Layer.mergeAll(
  DatabaseServiceLive,
  ConfigServiceLive,
  WorkflowEventBusLive,
  StepHandlerRegistryLive,
).pipe(Layer.provideMerge(VariableServiceLive), Layer.provideMerge(AILayer));
