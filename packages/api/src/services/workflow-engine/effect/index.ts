import { Layer } from "effect";
import { ConfigServiceLive } from "./config-service";
import { DatabaseServiceLive } from "./database-service";
import { WorkflowEventBusLive } from "./event-bus";
import { StepHandlerRegistryLive } from "./step-registry";
import { VariableServiceLive } from "./variable-service";

export * from "./config-service";
export * from "./database-service";
export * from "./error-utils";
export * from "./errors";
export * from "./event-bus";
export * from "./execution-context";
export * from "./executor";
export * from "./step-registry";
export * from "./variable-service";

export const MainLayer = Layer.mergeAll(
	DatabaseServiceLive,
	ConfigServiceLive,
	WorkflowEventBusLive,
	StepHandlerRegistryLive,
).pipe(Layer.provideMerge(VariableServiceLive));
