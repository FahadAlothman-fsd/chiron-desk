import { Context, Effect, Layer } from "effect";
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
export declare const ToolApprovalGateway: Context.Tag<ToolApprovalGateway, ToolApprovalGateway>;
export declare const toolApprovalGateway: ToolApprovalGateway;
export declare const ToolApprovalGatewayLive: Layer.Layer<ToolApprovalGateway, never, never>;
