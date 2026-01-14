import { Context, Effect, HashMap, Layer } from "effect";
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

export type StepHandler = (input: StepHandlerInput) => Effect.Effect<StepHandlerOutput, Error>;

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
      })),
      Effect.catchAll((error) => Effect.fail(new Error(error.message))),
    );

  const displayOutputHandler = yield* DisplayOutputHandler;
  const displayOutputStepHandler: StepHandler = (input) =>
    displayOutputHandler.execute(input).pipe(
      Effect.map((output) => ({
        result: output.result,
      })),
      Effect.catchAll((error) => Effect.fail(new Error(error.message))),
    );

  const executeActionHandler = yield* ExecuteActionHandler;
  const executeActionStepHandler: StepHandler = (input) =>
    executeActionHandler.execute(input).pipe(
      Effect.map((output) => ({
        result: output.result,
        variableUpdates: output.variableUpdates,
      })),
      Effect.catchAll((error) => Effect.fail(new Error(error.message))),
    );

  const invokeWorkflowHandler = yield* InvokeWorkflowHandler;
  const invokeWorkflowStepHandler: StepHandler = (input) =>
    invokeWorkflowHandler.execute(input).pipe(
      Effect.map((output) => ({
        result: output.result,
        variableUpdates: output.variableUpdates,
      })),
      Effect.catchAll((error) => Effect.fail(new Error(error.message))),
    );

  const branchHandler = yield* BranchHandler;
  const branchStepHandler: StepHandler = (input) =>
    branchHandler.execute(input).pipe(
      Effect.map((output) => ({
        result: output.result,
        nextStepOverride: output.nextStepNumber,
      })),
      Effect.catchAll((error) => Effect.fail(new Error(error.message))),
    );

  handlers = HashMap.set(handlers, "display-output", displayOutputStepHandler);
  handlers = HashMap.set(handlers, "execute-action", executeActionStepHandler);
  handlers = HashMap.set(handlers, "invoke-workflow", invokeWorkflowStepHandler);
  const sandboxedAgentHandler = yield* SandboxedAgentHandler;
  const sandboxedAgentStepHandler: StepHandler = (input) =>
    sandboxedAgentHandler.execute(input).pipe(
      Effect.map((output) => ({
        result: output.result,
        variableUpdates: output.variableUpdates,
      })),
      Effect.catchAll((error) => Effect.fail(new Error(error.message))),
    );

  handlers = HashMap.set(handlers, "user-form", userFormStepHandler);
  handlers = HashMap.set(handlers, "sandboxed-agent", sandboxedAgentStepHandler);
  handlers = HashMap.set(handlers, "system-agent", defaultHandler);
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

const AllHandlerLayers = Layer.mergeAll(
  UserFormHandlerLive,
  DisplayOutputHandlerLive,
  ExecuteActionHandlerLive,
  InvokeWorkflowHandlerLive,
  BranchHandlerLive,
  SandboxedAgentHandlerLive,
);

export const StepHandlerRegistryLive = Layer.effect(
  StepHandlerRegistry,
  makeStepHandlerRegistry,
).pipe(Layer.provide(AllHandlerLayers));
