import { Layer } from "effect";
import { ConfigServiceLive } from "./config-service";
import { DatabaseServiceLive } from "./database-service";
import { WorkflowEventBusLive } from "./event-bus";
import { StepHandlerRegistryLive } from "./step-registry";

export * from "./config-service";
export * from "./database-service";
export * from "./error-utils";
export * from "./errors";
export * from "./event-bus";
export * from "./execution-context";
export * from "./executor";
export * from "./step-registry";

export const MainLayer = Layer.mergeAll(
	DatabaseServiceLive,
	ConfigServiceLive,
	WorkflowEventBusLive,
	StepHandlerRegistryLive,
);
