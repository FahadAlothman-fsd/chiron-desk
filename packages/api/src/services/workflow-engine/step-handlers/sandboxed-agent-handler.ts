import type { CoreMessage, CoreTool } from "ai";
import { Context, Data, Effect, Layer } from "effect";
import type {
	StepHandlerInput,
	StepHandlerOutput,
} from "../effect/step-registry";

export class SandboxedAgentError extends Data.TaggedError(
	"SandboxedAgentError",
)<{
	readonly cause: unknown;
	readonly operation: string;
	readonly message: string;
}> {}

export interface ToolConfig {
	readonly name: string;
	readonly type:
		| "update-variable"
		| "ax-generation"
		| "snapshot-artifact"
		| "custom";
	readonly description: string;
	readonly inputSchema: Record<string, unknown>;
	readonly approval?: {
		readonly required: boolean;
		readonly riskLevel: "safe" | "moderate" | "dangerous";
	};
}

export interface SandboxedAgentConfig {
	readonly systemPrompt: string;
	readonly userPrompt: string;
	readonly tools: readonly ToolConfig[];
	readonly completionCondition: {
		readonly type: "all-tools-approved" | "all-variables-set" | "max-turns";
		readonly requiredVariables?: readonly string[];
		readonly maxTurns?: number;
	};
	readonly model?: {
		readonly provider: string;
		readonly modelId: string;
	};
}

export interface SandboxedAgentHandlerOutput extends StepHandlerOutput {
	readonly requiresUserInput: boolean;
	readonly pendingApproval?: {
		readonly toolName: string;
		readonly toolArgs: Record<string, unknown>;
	};
	readonly conversationState?: {
		readonly messages: readonly CoreMessage[];
		readonly turnCount: number;
	};
}

export interface SandboxedAgentHandler {
	readonly _tag: "SandboxedAgentHandler";
	execute: (
		input: StepHandlerInput,
		userInput?: unknown,
	) => Effect.Effect<SandboxedAgentHandlerOutput, SandboxedAgentError>;
}

export const SandboxedAgentHandler = Context.GenericTag<SandboxedAgentHandler>(
	"SandboxedAgentHandler",
);

function resolvePromptVariables(
	template: string,
	variables: Record<string, unknown>,
): string {
	return template.replace(/\{\{(\w+)\}\}/g, (_, varName) => {
		const value = variables[varName];
		if (value === undefined) return `{{${varName}}}`;
		return String(value);
	});
}

function checkCompletionCondition(
	config: SandboxedAgentConfig,
	variables: Record<string, unknown>,
	approvedTools: Set<string>,
	turnCount: number,
): boolean {
	switch (config.completionCondition.type) {
		case "all-tools-approved": {
			const toolNames = config.tools.map((t) => t.name);
			return toolNames.every((name) => approvedTools.has(name));
		}
		case "all-variables-set": {
			const required = config.completionCondition.requiredVariables ?? [];
			return required.every(
				(varName) =>
					variables[varName] !== undefined && variables[varName] !== null,
			);
		}
		case "max-turns": {
			const maxTurns = config.completionCondition.maxTurns ?? 10;
			return turnCount >= maxTurns;
		}
		default:
			return false;
	}
}

export const SandboxedAgentHandlerLive = Layer.succeed(SandboxedAgentHandler, {
	_tag: "SandboxedAgentHandler" as const,

	execute: (input: StepHandlerInput, userInput?: unknown) =>
		Effect.sync(() => {
			const config = input.stepConfig as unknown as SandboxedAgentConfig;
			const conversationState = (input.stepConfig as Record<string, unknown>)
				._conversationState as
				| {
						messages: CoreMessage[];
						turnCount: number;
						approvedTools: string[];
				  }
				| undefined;

			const messages: CoreMessage[] = conversationState?.messages ?? [];
			const turnCount = conversationState?.turnCount ?? 0;
			const approvedTools = new Set<string>(
				conversationState?.approvedTools ?? [],
			);

			if (messages.length === 0) {
				const systemPrompt = resolvePromptVariables(
					config.systemPrompt,
					input.variables,
				);
				const userPrompt = resolvePromptVariables(
					config.userPrompt,
					input.variables,
				);

				messages.push({ role: "system", content: systemPrompt });
				messages.push({ role: "user", content: userPrompt });
			}

			if (userInput !== undefined && userInput !== null) {
				const userMessage = userInput as
					| string
					| { type: "approval"; toolName: string; approved: boolean }
					| { type: "message"; content: string };

				if (typeof userMessage === "string") {
					messages.push({ role: "user", content: userMessage });
				} else if (userMessage.type === "approval") {
					if (userMessage.approved) {
						approvedTools.add(userMessage.toolName);
					}
					messages.push({
						role: "user",
						content: userMessage.approved
							? `Approved: ${userMessage.toolName}`
							: `Rejected: ${userMessage.toolName}`,
					});
				} else if (userMessage.type === "message") {
					messages.push({ role: "user", content: userMessage.content });
				}
			}

			const isComplete = checkCompletionCondition(
				config,
				input.variables,
				approvedTools,
				turnCount,
			);

			if (isComplete) {
				return {
					result: { completed: true, turnCount },
					variableUpdates: {},
					requiresUserInput: false,
					conversationState: {
						messages,
						turnCount,
					},
				};
			}

			return {
				result: { completed: false, turnCount },
				requiresUserInput: true,
				conversationState: {
					messages,
					turnCount: turnCount + 1,
				},
			};
		}),
});

export function createLegacySandboxedAgentHandler() {
	return {
		async executeStep(
			step: { config: unknown; nextStepNumber: number | null },
			context: { executionVariables?: Record<string, unknown> },
			userInput?: unknown,
		) {
			const input: StepHandlerInput = {
				stepConfig: step.config as Record<string, unknown>,
				variables: context.executionVariables ?? {},
				executionId: "",
			};

			const program = Effect.provide(
				Effect.flatMap(SandboxedAgentHandler, (handler) =>
					handler.execute(input, userInput),
				),
				SandboxedAgentHandlerLive,
			);

			const result = await Effect.runPromise(program);

			return {
				output: result.result,
				nextStepNumber: step.nextStepNumber ?? null,
				requiresUserInput: result.requiresUserInput,
			};
		},
	};
}
