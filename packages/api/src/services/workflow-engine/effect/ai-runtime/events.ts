export type AiStreamEvent =
  | {
      type: "message.delta";
      executionId: string;
      stepId: string;
      content: string;
      tokenIndex?: number;
    }
  | {
      type: "message.complete";
      executionId: string;
      stepId: string;
      fullText: string;
      tokenCount?: number;
      durationMs?: number;
    }
  | {
      type: "tool.call";
      executionId: string;
      stepId: string;
      toolCallId: string;
      toolName: string;
      toolType?: string;
      args: unknown;
    }
  | {
      type: "tool.input.start";
      executionId: string;
      stepId: string;
      toolCallId: string;
    }
  | {
      type: "tool.input.delta";
      executionId: string;
      stepId: string;
      toolCallId: string;
      delta: string;
    }
  | {
      type: "tool.pending";
      executionId: string;
      stepId: string;
      toolCallId: string;
      toolName: string;
      toolType?: string;
      args: unknown;
      riskLevel?: string;
      approvalMode?: string;
    }
  | {
      type: "tool.approval";
      executionId: string;
      stepId: string;
      toolCallId: string;
      toolName: string;
      toolType?: string;
      action: "approve" | "reject" | "edit";
      editedArgs?: unknown;
      feedback?: string;
    }
  | {
      type: "tool.result";
      executionId: string;
      stepId: string;
      toolCallId: string;
      toolName: string;
      toolType?: string;
      result: unknown;
    }
  | {
      type: "error";
      executionId: string;
      stepId: string;
      message: string;
    };

export type ToolApprovalAction = "approve" | "reject" | "edit";
