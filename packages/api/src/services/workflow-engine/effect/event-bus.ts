import { Context, Effect, Layer, PubSub, Stream } from "effect";

export type WorkflowEvent =
	| {
			readonly _tag: "WorkflowStarted";
			readonly executionId: string;
			readonly workflowId: string;
	  }
	| {
			readonly _tag: "StepStarted";
			readonly executionId: string;
			readonly stepNumber: number;
			readonly stepType: string;
	  }
	| {
			readonly _tag: "StepCompleted";
			readonly executionId: string;
			readonly stepNumber: number;
	  }
	| {
			readonly _tag: "ToolCallStarted";
			readonly executionId: string;
			readonly toolName: string;
	  }
	| {
			readonly _tag: "ToolCallCompleted";
			readonly executionId: string;
			readonly toolName: string;
	  }
	| {
			readonly _tag: "TextChunk";
			readonly executionId: string;
			readonly chunk: string;
	  }
	| {
			readonly _tag: "ApprovalRequested";
			readonly executionId: string;
			readonly stepId: string;
	  }
	| { readonly _tag: "WorkflowCompleted"; readonly executionId: string }
	| {
			readonly _tag: "WorkflowError";
			readonly executionId: string;
			readonly error: string;
	  }
	| {
			readonly _tag: "VariableChanged";
			readonly executionId: string;
			readonly name: string;
			readonly source: string;
	  }
	| {
			readonly _tag: "VariablesPropagated";
			readonly childId: string;
			readonly parentId: string;
			readonly names: string[];
	  };

export class WorkflowEventBus extends Context.Tag("WorkflowEventBus")<
	WorkflowEventBus,
	{
		readonly publish: (event: WorkflowEvent) => Effect.Effect<boolean>;
		readonly stream: Stream.Stream<WorkflowEvent>;
	}
>() {}

export const makeWorkflowEventBus = Effect.gen(function* () {
	const pubsub = yield* PubSub.sliding<WorkflowEvent>(256);

	return {
		publish: (event: WorkflowEvent) => PubSub.publish(pubsub, event),
		stream: Stream.fromPubSub(pubsub),
	};
});

export const WorkflowEventBusLive = Layer.scoped(
	WorkflowEventBus,
	makeWorkflowEventBus,
);
