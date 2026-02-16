import { Context, Deferred, Effect, HashMap, Layer, Ref } from "effect";

export type ApprovalRequest = {
  toolCallId: string;
  toolName: string;
  executionId: string;
  stepId: string;
  args?: unknown;
  riskLevel?: string;
};

export type ApprovalResolution = {
  toolCallId: string;
  toolName: string;
  action: "approve" | "reject" | "edit";
  editedArgs?: unknown;
  feedback?: string;
};

export type ApprovalGatewayImpl = {
  request: (request: ApprovalRequest) => Effect.Effect<ApprovalResolution>;
  resolve: (resolution: ApprovalResolution) => Effect.Effect<boolean>;
};

export class ApprovalGateway extends Context.Tag("ApprovalGateway")<
  ApprovalGateway,
  ApprovalGatewayImpl
>() {}

export const makeApprovalGateway = Effect.gen(function* () {
  const pending = yield* Ref.make(HashMap.empty<string, Deferred.Deferred<ApprovalResolution>>());

  const request = (request: ApprovalRequest): Effect.Effect<ApprovalResolution> =>
    Effect.gen(function* () {
      const deferred = yield* Deferred.make<ApprovalResolution>();

      yield* Ref.update(pending, (map) => HashMap.set(map, request.toolCallId, deferred));

      return yield* Deferred.await(deferred);
    });

  const resolve = (resolution: ApprovalResolution): Effect.Effect<boolean> =>
    Effect.gen(function* () {
      const deferred = yield* Ref.modify(pending, (map) => {
        const target = HashMap.get(map, resolution.toolCallId);
        if (target._tag === "Some") {
          return [target.value, HashMap.remove(map, resolution.toolCallId)] as const;
        }

        return [null, map] as const;
      });

      if (!deferred) {
        return false;
      }

      return yield* Deferred.succeed(deferred, resolution).pipe(Effect.as(true));
    });

  return {
    request,
    resolve,
  } satisfies ApprovalGatewayImpl;
});

export const ApprovalGatewayLive = Layer.effect(ApprovalGateway, makeApprovalGateway);
