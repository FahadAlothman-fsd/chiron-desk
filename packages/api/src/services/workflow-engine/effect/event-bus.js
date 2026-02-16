import { Context, Effect, Layer, PubSub, Stream } from "effect";
export class WorkflowEventBus extends Context.Tag("WorkflowEventBus")() {}
export const makeWorkflowEventBus = Effect.gen(function* () {
  const pubsub = yield* PubSub.sliding(256);
  return {
    publish: (event) => PubSub.publish(pubsub, event),
    stream: Stream.fromPubSub(pubsub),
  };
});
export const WorkflowEventBusLive = Layer.scoped(WorkflowEventBus, makeWorkflowEventBus);
export const effectWorkflowEventBus = Effect.runSync(Effect.scoped(makeWorkflowEventBus));
export const WorkflowEventBusSingletonLive = Layer.succeed(
  WorkflowEventBus,
  effectWorkflowEventBus,
);
