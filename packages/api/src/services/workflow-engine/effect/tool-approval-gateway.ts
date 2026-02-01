import { Context, Deferred, Effect, Layer, Ref } from "effect";
import type { ToolApprovalAction } from "@chiron/agent-runtime/ai-sdk/events";

export interface ToolApprovalRequest {
  toolCallId: string;
  toolName: string;
  executionId: string;
  stepId: string;
  args: unknown;
  riskLevel?: string;
  approvalMode?: string;
}

export interface ToolApprovalResolution {
  toolCallId: string;
  toolName: string;
  action: ToolApprovalAction;
  editedArgs?: unknown;
  feedback?: string;
}

export interface ToolApprovalGateway {
  readonly _tag: "ToolApprovalGateway";
  request: (request: ToolApprovalRequest) => Effect.Effect<ToolApprovalResolution, never>;
  resolve: (resolution: ToolApprovalResolution) => Effect.Effect<boolean, never>;
}

export const ToolApprovalGateway = Context.GenericTag<ToolApprovalGateway>("ToolApprovalGateway");

const pendingRef = Effect.runSync(
  Ref.make(new Map<string, Deferred.Deferred<ToolApprovalResolution>>()),
);

export const toolApprovalGateway: ToolApprovalGateway = {
  _tag: "ToolApprovalGateway",
  request: (request) =>
    Effect.gen(function* () {
      const deferred = yield* Deferred.make<ToolApprovalResolution>();
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
