import { Context, Data, Effect, Layer } from "effect";
import type {
	StepHandlerInput,
	StepHandlerOutput,
} from "../effect/step-registry";
import { InvokeWorkflowStepHandler } from "./invoke-workflow-handler";

export class InvokeWorkflowError extends Data.TaggedError(
	"InvokeWorkflowError",
)<{
	readonly cause: unknown;
	readonly operation: string;
	readonly message: string;
}> {}

export interface InvokeWorkflowConfig {
	readonly workflowsToInvoke: string;
	readonly variableMapping: Record<string, string>;
	readonly aggregateInto: string;
	readonly expectedOutputVariable: string;
	readonly completionCondition: {
		readonly type: "all-complete";
	};
}

export interface InvokeWorkflowHandlerOutput extends StepHandlerOutput {
	readonly requiresUserInput: boolean;
}

export interface InvokeWorkflowHandler {
	readonly _tag: "InvokeWorkflowHandler";
	execute: (
		input: StepHandlerInput,
		userInput?: unknown,
	) => Effect.Effect<InvokeWorkflowHandlerOutput, InvokeWorkflowError>;
}

export const InvokeWorkflowHandler = Context.GenericTag<InvokeWorkflowHandler>(
	"InvokeWorkflowHandler",
);

const legacyHandler = new InvokeWorkflowStepHandler();

export const InvokeWorkflowHandlerLive = Layer.succeed(InvokeWorkflowHandler, {
	_tag: "InvokeWorkflowHandler" as const,

	execute: (input: StepHandlerInput, userInput?: unknown) =>
		Effect.tryPromise({
			try: async () => {
				const step = {
					id: input.executionId,
					workflowId: "",
					stepNumber: 1,
					goal: "",
					stepType: "invoke-workflow" as const,
					config: input.stepConfig,
					nextStepNumber: null,
					createdAt: new Date(),
				};

				const context = {
					executionId: input.executionId,
					workflowId: "",
					projectId: "",
					userId: "",
					executionVariables: {},
					systemVariables: {},
					variables: input.variables,
				};

				const result = await legacyHandler.executeStep(
					step,
					context,
					userInput,
				);

				return {
					result: result.output,
					variableUpdates: result.output as Record<string, unknown>,
					requiresUserInput: result.requiresUserInput ?? false,
				};
			},
			catch: (error) =>
				new InvokeWorkflowError({
					cause: error,
					operation: "execute",
					message: error instanceof Error ? error.message : String(error),
				}),
		}),
});

export function createLegacyInvokeWorkflowHandler() {
	return {
		async executeStep(
			step: { config: unknown; nextStepNumber: number | null },
			context: { variables: Record<string, unknown> },
			userInput?: unknown,
		) {
			const input: StepHandlerInput = {
				stepConfig: step.config as Record<string, unknown>,
				variables: context.variables,
				executionId: "",
			};

			const program = Effect.provide(
				Effect.flatMap(InvokeWorkflowHandler, (handler) =>
					handler.execute(input, userInput),
				),
				InvokeWorkflowHandlerLive,
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
