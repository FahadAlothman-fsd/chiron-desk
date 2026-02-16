import { Context, Effect, Layer, Ref } from "effect";

export type ExecutionState = {
  executionId: string;
  workflowId: string;
  projectId?: string;
  parentExecutionId?: string | null;
  userId?: string;
  variables: Record<string, unknown>;
  currentStepNumber: number;
};

export type ExecutionContextImpl = {
  getState: () => Effect.Effect<ExecutionState>;
  updateVariables: (updates: Record<string, unknown>) => Effect.Effect<void>;
  setVariable: (key: string, value: unknown) => Effect.Effect<void>;
  getVariable: <T>(key: string) => Effect.Effect<T | undefined>;
  incrementStep: () => Effect.Effect<number>;
};

export class ExecutionContext extends Context.Tag("ExecutionContext")<
  ExecutionContext,
  ExecutionContextImpl
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

      setVariable: (key: string, value: unknown) =>
        Ref.update(stateRef, (state) => ({
          ...state,
          variables: { ...state.variables, [key]: value },
        })),

      getVariable: <T>(key: string) =>
        Ref.get(stateRef).pipe(Effect.map((state) => state.variables[key] as T | undefined)),

      incrementStep: () =>
        Ref.updateAndGet(stateRef, (state) => ({
          ...state,
          currentStepNumber: state.currentStepNumber + 1,
        })).pipe(Effect.map((state) => state.currentStepNumber)),
    };
  });

export const ExecutionContextLive = (initialState: ExecutionState) =>
  Layer.effect(ExecutionContext, makeExecutionContext(initialState));
