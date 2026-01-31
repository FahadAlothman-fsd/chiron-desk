import { Context, Effect, Layer, Ref } from "effect";

export interface ExecutionState {
  readonly executionId: string;
  readonly workflowId: string;
  readonly projectId?: string;
  readonly parentExecutionId: string | null;
  readonly userId?: string;
  readonly variables: Record<string, unknown>;
  readonly currentStepNumber: number;
}

export class ExecutionContext extends Context.Tag("ExecutionContext")<
  ExecutionContext,
  {
    readonly getState: () => Effect.Effect<ExecutionState>;
    readonly updateVariables: (updates: Record<string, unknown>) => Effect.Effect<void>;
    readonly incrementStep: () => Effect.Effect<number>;
    readonly getVariable: <T>(name: string) => Effect.Effect<T | undefined>;
  }
>() {}

export const makeExecutionContext = (
  initialState: ExecutionState,
): Effect.Effect<Context.Tag.Service<typeof ExecutionContext>> =>
  Effect.gen(function* () {
    const stateRef = yield* Ref.make(initialState);

    return {
      getState: () => Ref.get(stateRef),

      updateVariables: (updates: Record<string, unknown>) =>
        Ref.update(stateRef, (state) => ({
          ...state,
          variables: { ...state.variables, ...updates },
        })),

      incrementStep: () =>
        Ref.updateAndGet(stateRef, (state) => ({
          ...state,
          currentStepNumber: state.currentStepNumber + 1,
        })).pipe(Effect.map((state) => state.currentStepNumber)),

      getVariable: <T>(name: string) =>
        Ref.get(stateRef).pipe(Effect.map((state) => state.variables[name] as T | undefined)),
    };
  });

export const ExecutionContextLive = (initialState: ExecutionState) =>
  Layer.effect(ExecutionContext, makeExecutionContext(initialState));
