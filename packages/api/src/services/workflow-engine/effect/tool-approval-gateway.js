import { Context, Deferred, Effect, Layer, Ref } from "effect";
export const ToolApprovalGateway = Context.GenericTag("ToolApprovalGateway");
const pendingRef = Effect.runSync(Ref.make(new Map()));
export const toolApprovalGateway = {
  _tag: "ToolApprovalGateway",
  request: (request) =>
    Effect.gen(function* () {
      const deferred = yield* Deferred.make();
      yield* Ref.update(pendingRef, (map) => {
        const next = new Map(map);
        next.set(request.toolCallId, deferred);
        return next;
      });
      const resolution = yield* Deferred.await(deferred);
      yield* Ref.update(pendingRef, (map) => {
        const next = new Map(map);
        next.delete(request.toolCallId);
        return next;
      });
      return resolution;
    }),
  resolve: (resolution) =>
    Effect.gen(function* () {
      const pending = yield* Ref.get(pendingRef);
      const deferred = pending.get(resolution.toolCallId);
      if (!deferred) {
        return false;
      }
      yield* Deferred.succeed(deferred, resolution);
      return true;
    }),
};
export const ToolApprovalGatewayLive = Layer.succeed(ToolApprovalGateway, toolApprovalGateway);
