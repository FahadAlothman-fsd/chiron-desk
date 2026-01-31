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
      readonly stepId: string;
      readonly stepNumber?: number;
      readonly stepType: string;
    }
  | {
      readonly _tag: "StepCompleted";
      readonly executionId: string;
      readonly stepId: string;
      readonly stepNumber?: number;
      readonly result?: unknown;
    }
  | {
      readonly _tag: "ToolCallStarted";
      readonly executionId: string;
      readonly stepId: string;
      readonly toolName: string;
      readonly toolType?: string;
      readonly toolCallId: string;
      readonly args?: unknown;
    }
  | {
      readonly _tag: "ToolCallCompleted";
      readonly executionId: string;
      readonly stepId: string;
      readonly toolName: string;
      readonly toolType?: string;
      readonly toolCallId: string;
      readonly result?: unknown;
    }
  | {
      readonly _tag: "ToolInputStarted";
      readonly executionId: string;
      readonly stepId: string;
      readonly toolCallId: string;
    }
  | {
      readonly _tag: "ToolInputDelta";
      readonly executionId: string;
      readonly stepId: string;
      readonly toolCallId: string;
      readonly delta: string;
    }
  | {
      readonly _tag: "TextChunk";
      readonly executionId: string;
      readonly stepId: string;
      readonly content: string;
    }
  | {
      readonly _tag: "ApprovalRequested";
      readonly executionId: string;
      readonly stepId: string;
      readonly toolName: string;
      readonly toolType?: string;
      readonly toolCallId: string;
      readonly args?: unknown;
      readonly riskLevel?: string;
    }
  | {
      readonly _tag: "ApprovalResolved";
      readonly executionId: string;
      readonly stepId: string;
      readonly toolName: string;
      readonly toolType?: string;
      readonly toolCallId: string;
      readonly action: "approve" | "reject" | "edit";
      readonly editedArgs?: unknown;
      readonly feedback?: string;
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

export const WorkflowEventBusLive = Layer.scoped(WorkflowEventBus, makeWorkflowEventBus);

export const effectWorkflowEventBus = Effect.runSync(Effect.scoped(makeWorkflowEventBus));

export const WorkflowEventBusSingletonLive = Layer.succeed(
  WorkflowEventBus,
  effectWorkflowEventBus,
);
