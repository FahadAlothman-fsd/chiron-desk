import { Effect, Ref } from "effect";
import { ConfigService } from "./config-service";
import { withRetry, withTimeout } from "./error-utils";
import { MaxStepsExceededError, type StepError } from "./errors";
import { WorkflowEventBus } from "./event-bus";
import { ExecutionContext, type ExecutionState } from "./execution-context";
import { StepHandlerRegistry } from "./step-registry";

export interface WorkflowStep {
	readonly type: string;
	readonly config: Record<string, unknown>;
}

export interface WorkflowDefinition {
	readonly id: string;
	readonly steps: ReadonlyArray<WorkflowStep>;
}

export const executeWorkflow = (
	workflow: WorkflowDefinition,
	initialState: ExecutionState,
): Effect.Effect<
	void,
	MaxStepsExceededError | StepError,
	ExecutionContext | WorkflowEventBus | StepHandlerRegistry | ConfigService
> =>
	Effect.gen(function* () {
		const ctx = yield* ExecutionContext;
		const eventBus = yield* WorkflowEventBus;
		const registry = yield* StepHandlerRegistry;
		const config = yield* ConfigService;

		const maxSteps = config.get("maxStepExecutions");
		const stepTimeoutMs = config.get("stepTimeoutMs");

		yield* eventBus.publish({
			_tag: "WorkflowStarted",
			executionId: initialState.executionId,
			workflowId: workflow.id,
		});

		const stepCountRef = yield* Ref.make(0);

		for (const step of workflow.steps) {
			const currentCount = yield* Ref.updateAndGet(stepCountRef, (n) => n + 1);

			if (currentCount > maxSteps) {
				yield* eventBus.publish({
					_tag: "WorkflowError",
					executionId: initialState.executionId,
					error: `Max steps exceeded: ${maxSteps}`,
				});
				return yield* Effect.fail(
					new MaxStepsExceededError({
						executionId: initialState.executionId,
						maxSteps,
					}),
				);
			}

			const state = yield* ctx.getState();

			yield* eventBus.publish({
				_tag: "StepStarted",
				executionId: state.executionId,
				stepNumber: state.currentStepNumber,
				stepType: step.type,
			});

			const handler = yield* registry.getHandler(step.type);

			const stepEffect = handler({
				stepConfig: step.config,
				variables: state.variables,
				executionId: state.executionId,
			});

			const result = yield* withRetry(
				withTimeout(
					stepEffect,
					stepTimeoutMs,
					`step-${state.currentStepNumber}`,
				),
				{ maxRetries: 2, baseDelayMs: 1000 },
			);

			if (result.variableUpdates) {
				yield* ctx.updateVariables(result.variableUpdates);
			}

			yield* ctx.incrementStep();

			yield* eventBus.publish({
				_tag: "StepCompleted",
				executionId: state.executionId,
				stepNumber: state.currentStepNumber,
			});
		}

		yield* eventBus.publish({
			_tag: "WorkflowCompleted",
			executionId: initialState.executionId,
		});
	});
