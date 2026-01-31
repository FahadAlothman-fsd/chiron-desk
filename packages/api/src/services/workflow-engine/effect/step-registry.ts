import { Context, Effect, HashMap, Layer, Option } from "effect";
import { BranchHandler, BranchHandlerLive } from "../step-handlers/branch-effect-handler";
import {
  DisplayOutputHandler,
  DisplayOutputHandlerLive,
} from "../step-handlers/display-output-effect-handler";
import {
  ExecuteActionHandler,
  ExecuteActionHandlerLive,
} from "../step-handlers/execute-action-effect-handler";
import {
  InvokeWorkflowHandler,
  InvokeWorkflowHandlerLive,
} from "../step-handlers/invoke-workflow-effect-handler";
import {
  SandboxedAgentHandler,
  SandboxedAgentHandlerLive,
} from "../step-handlers/sandboxed-agent-handler";
import { UserFormHandler, UserFormHandlerLive } from "../step-handlers/user-form-handler";
import { WorkflowEventBusSingletonLive } from "./event-bus";
import { UnknownStepTypeError } from "./errors";

export interface StepHandlerInput {
  readonly stepConfig: Record<string, unknown>;
  readonly variables: Record<string, unknown>;
  readonly executionId: string;
  readonly workflowId?: string;
  readonly stepId?: string;
  readonly stepExecutionId?: string;
  readonly stepNumber?: number;
  readonly stepGoal?: string | null;
  readonly stepType?: string;
  readonly userInput?: unknown;
}

export interface StepHandlerOutput {
  readonly result: unknown;
  readonly variableUpdates?: Record<string, unknown>;
  readonly nextStepOverride?: number;
  readonly requiresUserInput?: boolean;
}

export type StepHandler = (input: StepHandlerInput) => Effect.Effect<StepHandlerOutput, Error>;

const normalizeError = (error: unknown) => {
  if (error instanceof Error) {
    return error;
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.trim().length > 0) {
      return new Error(record.message);
    }

    if (typeof record._tag === "string") {
      try {
        return new Error(JSON.stringify(record));
      } catch {
        return new Error(record._tag);
      }
    }
  }

  return new Error(typeof error === "string" ? error : String(error));
};

export class StepHandlerRegistry extends Context.Tag("StepHandlerRegistry")<
  StepHandlerRegistry,
  {
    readonly getHandler: (stepType: string) => Effect.Effect<StepHandler, UnknownStepTypeError>;
    readonly registerHandler: (stepType: string, handler: StepHandler) => Effect.Effect<void>;
  }
>() {}

export const makeStepHandlerRegistry = Effect.gen(function* () {
  let handlers = HashMap.empty<string, StepHandler>();

  const defaultHandler: StepHandler = (input) =>
    Effect.succeed({
      result: `Executed step with config: ${JSON.stringify(input.stepConfig)}`,
    });

  const userFormHandler = yield* UserFormHandler;
  const userFormStepHandler: StepHandler = (input) =>
    userFormHandler.execute(input).pipe(
      Effect.map((output) => ({
        result: output.result,
        variableUpdates: output.variableUpdates,
        requiresUserInput: output.requiresUserInput,
      })),
      Effect.catchAll((error) => Effect.fail(normalizeError(error))),
    );

  const displayOutputHandler = yield* DisplayOutputHandler;
  const displayOutputStepHandler: StepHandler = (input) =>
    displayOutputHandler.execute(input).pipe(
      Effect.map((output) => ({
        result: output.result,
        requiresUserInput: output.requiresUserInput,
      })),
      Effect.catchAll((error) => Effect.fail(normalizeError(error))),
    );

  const executeActionHandler = yield* ExecuteActionHandler;
  const executeActionStepHandler: StepHandler = (input) =>
    executeActionHandler.execute(input).pipe(
      Effect.map((output) => ({
        result: output.result,
        variableUpdates: output.variableUpdates,
        requiresUserInput: output.requiresUserInput,
      })),
      Effect.catchAll((error) => Effect.fail(normalizeError(error))),
    );

  const invokeWorkflowHandler = yield* InvokeWorkflowHandler;
  const invokeWorkflowStepHandler: StepHandler = (input) =>
    invokeWorkflowHandler.execute(input).pipe(
      Effect.map((output) => ({
        result: output.result,
        variableUpdates: output.variableUpdates,
        requiresUserInput: output.requiresUserInput,
      })),
      Effect.catchAll((error) => Effect.fail(normalizeError(error))),
    );

  const branchHandler = yield* BranchHandler;
  const branchStepHandler: StepHandler = (input) =>
    branchHandler.execute(input).pipe(
      Effect.map((output) => ({
        result: output.result,
        nextStepOverride: output.nextStepNumber,
      })),
      Effect.catchAll((error) => Effect.fail(normalizeError(error))),
    );

  handlers = HashMap.set(handlers, "display", displayOutputStepHandler);
  handlers = HashMap.set(handlers, "action", executeActionStepHandler);
  handlers = HashMap.set(handlers, "invoke", invokeWorkflowStepHandler);
  const sandboxedAgentHandler = yield* SandboxedAgentHandler;
  const sandboxedAgentStepHandler: StepHandler = (input) =>
    sandboxedAgentHandler.execute(input).pipe(
      Effect.map((output) => ({
        result: output.result,
        variableUpdates: output.variableUpdates,
        requiresUserInput: output.requiresUserInput,
      })),
      Effect.catchAll((error) => Effect.fail(normalizeError(error))),
    );

  const agentStepHandler: StepHandler = (input) => {
    const stepConfig = (input.stepConfig ?? {}) as Record<string, unknown>;
    const agentKind = stepConfig.agentKind;
    if (agentKind === "opencode") {
      return defaultHandler(input);
    }
    return sandboxedAgentStepHandler(input);
  };

  handlers = HashMap.set(handlers, "form", userFormStepHandler);
  handlers = HashMap.set(handlers, "agent", agentStepHandler);
  handlers = HashMap.set(handlers, "branch", branchStepHandler);

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

export const AllHandlerLayers = Layer.mergeAll(
  WorkflowEventBusSingletonLive,
  UserFormHandlerLive,
  DisplayOutputHandlerLive,
  ExecuteActionHandlerLive,
  InvokeWorkflowHandlerLive,
  BranchHandlerLive,
  SandboxedAgentHandlerLive,
);

export const StepHandlerRegistryLive = Layer.effect(StepHandlerRegistry, makeStepHandlerRegistry);
