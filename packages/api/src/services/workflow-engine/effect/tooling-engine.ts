import { randomUUID } from "node:crypto";
import { Data, Effect } from "effect";
import {
  ApprovalService,
  type ApprovalDecision,
  type UserAutoApproveSettings,
} from "./approval-service";
import type { WorkflowEventBus } from "./event-bus";
import {
  ToolBuilderError,
  type ToolConfig,
  type ToolExecutionContext,
  type ToolExecutionResult,
  validateToolArgs,
  executeTool,
} from "./tool-builder";
import { ToolApprovalGateway, type ToolApprovalResolution } from "./tool-approval-gateway";

export class ToolingEngineError extends Data.TaggedError("ToolingEngineError")<{
  readonly cause: unknown;
  readonly operation: "approve" | "execute" | "validate";
  readonly toolName: string;
}> {}

export interface ToolExecutionRequest {
  toolConfig: ToolConfig;
  args: unknown;
  context: ToolExecutionContext;
  toolCallId?: string;
  userId?: string;
}

export type ToolApprovalDecision =
  | {
      status: "approved";
      toolCallId: string;
      args: unknown;
    }
  | {
      status: "pending";
      toolCallId: string;
      args: unknown;
    };

const fallbackUserSettings: UserAutoApproveSettings = {
  enabled: false,
  trustLevel: "paranoid",
  toolOverrides: {},
};

export const requestToolApproval = (
  eventBus: WorkflowEventBus,
  request: {
    executionId: string;
    stepId: string;
    toolName: string;
    toolType?: string;
    toolCallId: string;
    args: unknown;
    riskLevel: string;
    approvalMode: string;
  },
) =>
  eventBus.publish({
    _tag: "ApprovalRequested",
    executionId: request.executionId,
    stepId: request.stepId,
    toolName: request.toolName,
    toolType: request.toolType,
    toolCallId: request.toolCallId,
    args: request.args,
    riskLevel: request.riskLevel,
  });

export const resolveToolApproval = (
  eventBus: WorkflowEventBus,
  resolution: {
    executionId: string;
    stepId: string;
    toolName: string;
    toolType?: string;
    toolCallId: string;
    action: "approve" | "reject" | "edit";
    editedArgs?: unknown;
    feedback?: string;
  },
) =>
  eventBus.publish({
    _tag: "ApprovalResolved",
    executionId: resolution.executionId,
    stepId: resolution.stepId,
    toolName: resolution.toolName,
    toolType: resolution.toolType,
    toolCallId: resolution.toolCallId,
    action: resolution.action,
    editedArgs: resolution.editedArgs,
    feedback: resolution.feedback,
  });

export const evaluateToolApproval = (
  request: ToolExecutionRequest,
): Effect.Effect<ToolApprovalDecision, ToolingEngineError | ToolBuilderError> =>
  Effect.gen(function* () {
    const toolCallId = request.toolCallId ?? randomUUID();
    const { toolConfig, context } = request;

    yield* validateToolArgs(toolConfig, request.args).pipe(
      Effect.mapError(
        (cause) =>
          new ToolingEngineError({
            cause,
            operation: "validate",
            toolName: toolConfig.name,
          }),
      ),
    );

    const approvalService = yield* ApprovalService;

    const userSettings = request.userId
      ? yield* approvalService.getUserSettings(request.userId)
      : fallbackUserSettings;
    const sessionState = yield* approvalService.getSessionState(context.executionId);
    const decision = yield* approvalService.shouldAutoApprove(
      {
        toolName: toolConfig.name,
        toolType: toolConfig.type,
        approval: toolConfig.approval,
        executionId: context.executionId,
      },
      userSettings,
      sessionState,
    );

    if (toolConfig.approval.mode === "none" || decision.autoApprove) {
      return {
        status: "approved",
        toolCallId,
        args: request.args,
      };
    }

    yield* requestToolApproval(context.eventBus as WorkflowEventBus, {
      executionId: context.executionId,
      stepId: context.stepId,
      toolName: toolConfig.name,
      toolType: toolConfig.type,
      toolCallId,
      args: request.args,
      riskLevel: toolConfig.approval.riskLevel,
      approvalMode: toolConfig.approval.mode,
    });

    return {
      status: "pending",
      toolCallId,
      args: request.args,
    };
  });

export const executeToolCall = (
  request: ToolExecutionRequest,
): Effect.Effect<ToolExecutionResult, ToolingEngineError | ToolBuilderError> =>
  Effect.gen(function* () {
    const toolCallId = request.toolCallId ?? randomUUID();
    const { toolConfig, context } = request;

    yield* validateToolArgs(toolConfig, request.args).pipe(
      Effect.mapError(
        (cause) =>
          new ToolingEngineError({
            cause,
            operation: "validate",
            toolName: toolConfig.name,
          }),
      ),
    );

    const approvalService = yield* ApprovalService;
    const approvalGateway = yield* ToolApprovalGateway;

    const userSettings = request.userId
      ? yield* approvalService.getUserSettings(request.userId)
      : fallbackUserSettings;
    const sessionState = yield* approvalService.getSessionState(context.executionId);
    const decision = yield* approvalService.shouldAutoApprove(
      {
        toolName: toolConfig.name,
        toolType: toolConfig.type,
        approval: toolConfig.approval,
        executionId: context.executionId,
      },
      userSettings,
      sessionState,
    );

    let resolution: ToolApprovalResolution | null = null;

    if (toolConfig.approval.mode === "none" || decision.autoApprove) {
      resolution = {
        toolCallId,
        toolName: toolConfig.name,
        action: "approve",
      };
    } else {
      yield* requestToolApproval(context.eventBus as WorkflowEventBus, {
        executionId: context.executionId,
        stepId: context.stepId,
        toolName: toolConfig.name,
        toolType: toolConfig.type,
        toolCallId,
        args: request.args,
        riskLevel: toolConfig.approval.riskLevel,
        approvalMode: toolConfig.approval.mode,
      });

      resolution = yield* approvalGateway.request({
        toolCallId,
        toolName: toolConfig.name,
        executionId: context.executionId,
        stepId: context.stepId,
        args: request.args,
        riskLevel: toolConfig.approval.riskLevel,
        approvalMode: toolConfig.approval.mode,
      });
    }

    if (resolution) {
      yield* resolveToolApproval(context.eventBus as WorkflowEventBus, {
        executionId: context.executionId,
        stepId: context.stepId,
        toolName: toolConfig.name,
        toolType: toolConfig.type,
        toolCallId,
        action: resolution.action,
        editedArgs: resolution.editedArgs,
        feedback: resolution.feedback,
      });
    }

    if (resolution?.action === "reject") {
      return {
        success: false,
        output: null,
        error: resolution.feedback ?? "Tool call rejected",
      };
    }

    const finalArgs =
      resolution?.action === "edit" && resolution.editedArgs ? resolution.editedArgs : request.args;

    const result = yield* executeTool(toolConfig.name, toolConfig.type, finalArgs, context, {
      targetVariable: toolConfig.targetVariable,
      toolCallId,
    }).pipe(
      Effect.mapError(
        (cause) =>
          new ToolingEngineError({
            cause,
            operation: "execute",
            toolName: toolConfig.name,
          }),
      ),
    );

    return result;
  });
