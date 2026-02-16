import { Context, Effect } from "effect";
import { Layer } from "effect";
import { VariableService } from "./variable-service";

export type ActionExecutionInput = {
  executionId: string;
  stepId: string;
  action: Record<string, unknown>;
  variables: Record<string, unknown>;
};

export type ActionExecutionResult = {
  outputVariable?: string;
  outputValue?: unknown;
};

export type ActionServiceImpl = {
  execute: (input: ActionExecutionInput) => Effect.Effect<ActionExecutionResult, unknown, never>;
};

export class ActionService extends Context.Tag("ActionService")<
  ActionService,
  ActionServiceImpl
>() {}

const readString = (action: Record<string, unknown>, key: string): string | undefined => {
  const value = action[key];
  return typeof value === "string" ? value : undefined;
};

const readNumber = (action: Record<string, unknown>, key: string): number | undefined => {
  const value = action[key];
  return typeof value === "number" ? value : undefined;
};

const toRecord = (value: unknown): Record<string, unknown> | undefined => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
};

const withOutput = (
  action: Record<string, unknown>,
  defaultOutputVariable: string | undefined,
  outputValue: unknown,
): ActionExecutionResult => ({
  outputVariable: readString(action, "outputVariable") ?? defaultOutputVariable,
  outputValue,
});

export const ActionServiceLive = Layer.effect(
  ActionService,
  Effect.gen(function* () {
    const variableService = yield* VariableService;

    const execute: ActionServiceImpl["execute"] = (input) =>
      Effect.gen(function* () {
        const kind = readString(input.action, "kind");
        const operation = readString(input.action, "operation");

        if (!kind || !operation) {
          return yield* Effect.fail(
            new Error(`Unsupported action kind/operation: ${kind}/${operation}`),
          );
        }

        if (kind === "variable") {
          if (operation === "set") {
            const target = readString(input.action, "name") ?? readString(input.action, "target");
            if (!target) {
              return yield* Effect.fail(
                new Error("Missing target variable for variable:set action"),
              );
            }

            const rawValue = input.action.value;
            const value =
              typeof rawValue === "string"
                ? yield* variableService.resolveTemplate(rawValue)
                : rawValue;

            yield* variableService.set(target, value);
            return withOutput(input.action, target, value);
          }

          if (operation === "copy") {
            const source = readString(input.action, "from");
            const target = readString(input.action, "to");
            if (!source || !target) {
              return yield* Effect.fail(new Error("Missing from/to for variable:copy action"));
            }

            const value = yield* variableService.get(source);
            yield* variableService.set(target, value);
            return withOutput(input.action, target, value);
          }

          if (operation === "merge") {
            const updates = toRecord(input.action.values);
            if (!updates) {
              return yield* Effect.fail(new Error("Invalid values for variable:merge action"));
            }

            const resolvedUpdates = yield* variableService.resolveObject(updates);
            yield* variableService.merge(resolvedUpdates);
            return withOutput(input.action, undefined, resolvedUpdates);
          }

          if (operation === "delete") {
            const target = readString(input.action, "name") ?? readString(input.action, "target");
            if (!target) {
              return yield* Effect.fail(
                new Error("Missing target variable for variable:delete action"),
              );
            }

            yield* variableService.set(target, undefined);
            return withOutput(input.action, target, undefined);
          }

          if (operation === "append") {
            const target = readString(input.action, "name") ?? readString(input.action, "target");
            if (!target) {
              return yield* Effect.fail(
                new Error("Missing target variable for variable:append action"),
              );
            }

            const current = yield* variableService.get<unknown>(target);
            if (current !== undefined && !Array.isArray(current)) {
              return yield* Effect.fail(
                new Error(`variable:append target is not an array: ${target}`),
              );
            }

            const appendValue = input.action.value;
            const resolvedValue =
              typeof appendValue === "string"
                ? yield* variableService.resolveTemplate(appendValue)
                : appendValue;
            const next = [...(current ?? []), resolvedValue];

            yield* variableService.set(target, next);
            return withOutput(input.action, target, next);
          }

          if (operation === "increment") {
            const target = readString(input.action, "name") ?? readString(input.action, "target");
            if (!target) {
              return yield* Effect.fail(
                new Error("Missing target variable for variable:increment action"),
              );
            }

            const by = readNumber(input.action, "by") ?? 1;
            const current = yield* variableService.get<unknown>(target);
            if (current !== undefined && typeof current !== "number") {
              return yield* Effect.fail(
                new Error(`variable:increment target is not numeric: ${target}`),
              );
            }

            const next = (current ?? 0) + by;
            yield* variableService.set(target, next);
            return withOutput(input.action, target, next);
          }

          return yield* Effect.fail(new Error(`Unsupported variable operation: ${operation}`));
        }

        if (kind === "env" && operation === "get") {
          const name = readString(input.action, "name") ?? readString(input.action, "key");
          if (!name) {
            return yield* Effect.fail(new Error("Missing env variable name for env:get action"));
          }

          const fallback = input.action.default;
          const value = process.env[name] ?? fallback;
          return withOutput(input.action, undefined, value);
        }

        if (kind === "file" && operation === "template") {
          const template =
            readString(input.action, "content") ?? readString(input.action, "template");
          if (!template) {
            return yield* Effect.fail(
              new Error("Missing content/template for file:template action"),
            );
          }

          const rendered = yield* variableService.resolveTemplate(template);
          return withOutput(input.action, undefined, rendered);
        }

        if (kind === "directory" && operation === "join") {
          const segmentsRaw = input.action.segments;
          if (!Array.isArray(segmentsRaw)) {
            return yield* Effect.fail(new Error("Invalid segments for directory:join action"));
          }

          const segments = segmentsRaw.map((segment) => String(segment));
          const joined = segments.join("/").replace(/\/{2,}/g, "/");
          return withOutput(input.action, undefined, joined);
        }

        if (kind === "artifact" && operation === "record") {
          const artifact = toRecord(input.action.artifact);
          if (!artifact) {
            return yield* Effect.fail(
              new Error("Invalid artifact payload for artifact:record action"),
            );
          }
          return withOutput(input.action, undefined, artifact);
        }

        if (kind === "snapshot" && operation === "capture") {
          const snapshot = { ...input.variables };
          return withOutput(input.action, undefined, snapshot);
        }

        if (kind === "git" && operation === "ref") {
          const branch = readString(input.action, "branch");
          const tag = readString(input.action, "tag");
          const ref = tag ? `refs/tags/${tag}` : `refs/heads/${branch ?? "main"}`;
          return withOutput(input.action, undefined, ref);
        }

        return yield* Effect.fail(
          new Error(`Unsupported action kind/operation: ${kind}/${operation}`),
        );
      });

    return {
      execute,
    } satisfies ActionServiceImpl;
  }),
);
