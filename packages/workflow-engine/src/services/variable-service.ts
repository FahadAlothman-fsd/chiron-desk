import { Context, Effect, Layer } from "effect";
import Handlebars from "handlebars";
import { ExecutionContext } from "./execution-context";

const HANDLEBARS_PATTERN = /\{\{[^}]+\}\}/g;

export type VariableServiceImpl = {
  get: <T>(key: string) => Effect.Effect<T | undefined, never, never>;
  set: (key: string, value: unknown) => Effect.Effect<void, never, never>;
  merge: (vars: Record<string, unknown>) => Effect.Effect<void, never, never>;
  resolveTemplate: (template: string) => Effect.Effect<string, unknown, never>;
  resolveObject: <T extends Record<string, unknown>>(obj: T) => Effect.Effect<T, unknown, never>;
};

export class VariableService extends Context.Tag("VariableService")<
  VariableService,
  VariableServiceImpl
>() {}

export const VariableServiceLive = Layer.effect(
  VariableService,
  Effect.gen(function* () {
    const executionContext = yield* ExecutionContext;

    const get = <T>(key: string): Effect.Effect<T | undefined, never, never> =>
      executionContext.getVariable<T>(key);

    const set = (key: string, value: unknown): Effect.Effect<void, never, never> =>
      executionContext.setVariable(key, value);

    const merge = (vars: Record<string, unknown>): Effect.Effect<void, never, never> =>
      executionContext.updateVariables(vars);

    const resolveTemplate = (template: string): Effect.Effect<string, unknown, never> =>
      Effect.gen(function* () {
        if (!HANDLEBARS_PATTERN.test(template)) {
          return template;
        }

        const state = yield* executionContext.getState();

        return yield* Effect.try({
          try: () => Handlebars.compile(template)(state.variables),
          catch: (cause) => cause,
        });
      });

    const resolveObject = <T extends Record<string, unknown>>(
      obj: T,
    ): Effect.Effect<T, unknown, never> =>
      Effect.gen(function* () {
        const state = yield* executionContext.getState();

        const resolveValue = (value: unknown): unknown => {
          if (typeof value === "string") {
            if (!HANDLEBARS_PATTERN.test(value)) {
              return value;
            }

            return Handlebars.compile(value)(state.variables);
          }

          if (Array.isArray(value)) {
            return value.map(resolveValue);
          }

          if (value && typeof value === "object") {
            return Object.fromEntries(
              Object.entries(value).map(([key, nested]) => [key, resolveValue(nested)]),
            );
          }

          return value;
        };

        return resolveValue(obj) as T;
      });

    return {
      get,
      set,
      merge,
      resolveTemplate,
      resolveObject,
    } satisfies VariableServiceImpl;
  }),
);
