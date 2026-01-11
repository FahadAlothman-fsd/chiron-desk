import { Context, Effect, HashMap, Layer } from "effect";
import { UnknownStepTypeError } from "./errors";

export interface StepHandlerInput {
	readonly stepConfig: Record<string, unknown>;
	readonly variables: Record<string, unknown>;
	readonly executionId: string;
}

export interface StepHandlerOutput {
	readonly result: unknown;
	readonly variableUpdates?: Record<string, unknown>;
	readonly nextStepOverride?: number;
}

export type StepHandler = (
	input: StepHandlerInput,
) => Effect.Effect<StepHandlerOutput, Error>;

export class StepHandlerRegistry extends Context.Tag("StepHandlerRegistry")<
	StepHandlerRegistry,
	{
		readonly getHandler: (
			stepType: string,
		) => Effect.Effect<StepHandler, UnknownStepTypeError>;
		readonly registerHandler: (
			stepType: string,
			handler: StepHandler,
		) => Effect.Effect<void>;
	}
>() {}

export const makeStepHandlerRegistry = Effect.gen(function* () {
	let handlers = HashMap.empty<string, StepHandler>();

	const defaultHandler: StepHandler = (input) =>
		Effect.succeed({
			result: `Executed step with config: ${JSON.stringify(input.stepConfig)}`,
		});

	handlers = HashMap.set(handlers, "display-output", defaultHandler);
	handlers = HashMap.set(handlers, "execute-action", defaultHandler);
	handlers = HashMap.set(handlers, "invoke-workflow", defaultHandler);
	handlers = HashMap.set(handlers, "user-form", defaultHandler);
	handlers = HashMap.set(handlers, "sandboxed-agent", defaultHandler);

	return {
		getHandler: (stepType: string) =>
			Effect.gen(function* () {
				const handler = HashMap.get(handlers, stepType);
				if (handler._tag === "None") {
					return yield* Effect.fail(new UnknownStepTypeError({ stepType }));
				}
				return handler.value;
			}),

		registerHandler: (stepType: string, handler: StepHandler) =>
			Effect.sync(() => {
				handlers = HashMap.set(handlers, stepType, handler);
			}),
	};
});

export const StepHandlerRegistryLive = Layer.effect(
	StepHandlerRegistry,
	makeStepHandlerRegistry,
);
