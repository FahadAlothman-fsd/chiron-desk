import { AgentRuntime } from "@chiron/agent-runtime";
import type { AgentMessage } from "@chiron/contracts";
import { Effect } from "effect";
import type { AgentStepConfig } from "../schema/agent";
import { ApprovalGateway } from "../services/approval-gateway";
import { WorkflowEventBus } from "../services/event-bus";
import type { StepHandler } from "../services/step-handler";
import { VariableService } from "../services/variable-service";

const DEFAULT_MODEL = "openrouter:openai/gpt-4o-mini";

const getMessageAndEdits = (
  userInput: unknown,
): { message?: string; variableEdits?: Record<string, unknown> } => {
  if (typeof userInput === "string") {
    return { message: userInput };
  }

  if (!userInput || typeof userInput !== "object") {
    return {};
  }

  const payload = userInput as Record<string, unknown>;
  const message = typeof payload.message === "string" ? payload.message : undefined;
  const variableEdits =
    payload.variables && typeof payload.variables === "object" && !Array.isArray(payload.variables)
      ? (payload.variables as Record<string, unknown>)
      : undefined;

  return { message, variableEdits };
};

const evaluateCompletion = (
  step: AgentStepConfig,
  toolOutcomes: { toolName: string; status: string }[],
  variables: Record<string, unknown>,
): boolean => {
  const conditions = step.completionConditions ?? [{ type: "agent-done" as const }];

  return conditions.some((condition) => {
    if (condition.type === "agent-done") {
      return true;
    }

    if (condition.type === "manual") {
      return false;
    }

    if (condition.type === "all-tools-approved") {
      return condition.requiredTools.every((requiredTool) => {
        const outcome = toolOutcomes.find((toolOutcome) => toolOutcome.toolName === requiredTool);
        return outcome?.status === "approved" || outcome?.status === "executed";
      });
    }

    if (condition.type === "all-variables-set") {
      return condition.requiredVariables.every((name) => {
        const value = variables[name];
        return value !== undefined && value !== null && value !== "";
      });
    }

    return false;
  });
};

export const makeAgentHandler =
  (): StepHandler<VariableService | WorkflowEventBus | AgentRuntime | ApprovalGateway> => (input) =>
    Effect.gen(function* () {
      const step = input.step as AgentStepConfig;
      const variableService = yield* VariableService;
      const eventBus = yield* WorkflowEventBus;
      const agentRuntime = yield* AgentRuntime;
      const approvalGateway = yield* ApprovalGateway;

      const { message: userMessage, variableEdits } = getMessageAndEdits(input.userInput);
      if (variableEdits) {
        yield* variableService.merge(variableEdits);
      }

      const systemPromptBlock = step.systemPromptBlock
        ? yield* variableService.resolveTemplate(step.systemPromptBlock)
        : undefined;

      const initialPrompt = step.initialPrompt
        ? yield* variableService.resolveTemplate(step.initialPrompt)
        : undefined;

      const userText = userMessage ?? initialPrompt;

      if (!userText) {
        return {
          requiresUserInput: true,
        };
      }

      const messages: AgentMessage[] = [];
      if (systemPromptBlock) {
        messages.push({ role: "system", content: systemPromptBlock });
      }
      messages.push({ role: "user", content: userText });

      const model = step.model ? `${step.model.provider}:${step.model.modelId}` : DEFAULT_MODEL;

      const result = yield* agentRuntime.run({
        executionId: input.executionId,
        stepId: step.id ?? "agent-step",
        stepNumber: 0,
        agentKind: step.agentKind,
        model,
        messages,
        tools: [],
      });

      const outputVariables: Record<string, unknown> = {
        [`${step.id ?? "agent"}.text`]: result.fullText,
      };

      for (const outcome of result.toolOutcomes) {
        const tool = (step.tools ?? []).find((candidate) => candidate.name === outcome.toolName);
        if (!tool) {
          continue;
        }

        if (tool.requiresApproval) {
          const toolCallId = `${step.id ?? "agent-step"}:${tool.name}`;

          yield* eventBus.publish({
            _tag: "ApprovalRequested",
            executionId: input.executionId,
            stepId: step.id ?? "agent-step",
            toolName: tool.name,
            toolType: tool.toolType,
            toolCallId,
            args: outcome.args,
          });

          const resolution = yield* approvalGateway.request({
            toolCallId,
            toolName: tool.name,
            executionId: input.executionId,
            stepId: step.id ?? "agent-step",
            args: outcome.args,
          });

          yield* eventBus.publish({
            _tag: "ApprovalResolved",
            executionId: input.executionId,
            stepId: step.id ?? "agent-step",
            toolName: tool.name,
            toolType: tool.toolType,
            toolCallId,
            action: resolution.action,
            editedArgs: resolution.editedArgs,
            feedback: resolution.feedback,
          });

          if (resolution.action === "reject") {
            continue;
          }
        }

        if (
          tool?.toolType === "update-variable" &&
          tool.targetVariable &&
          outcome.result !== undefined
        ) {
          outputVariables[tool.targetVariable] = outcome.result;
        }
      }

      yield* eventBus.publish({
        _tag: "TextChunk",
        executionId: input.executionId,
        stepId: step.id ?? "agent-step",
        content: result.fullText,
      });

      const completionVariables = {
        ...input.variables,
        ...outputVariables,
      };

      const isComplete = evaluateCompletion(step, result.toolOutcomes, completionVariables);

      return {
        outputVariables,
        requiresUserInput: !isComplete,
      };
    });
