import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { db, eq, projects } from "@chiron/db";
import { Context, Data, Effect, Layer } from "effect";
import type { StepHandlerInput, StepHandlerOutput } from "../effect/step-registry";

export class ExecuteActionError extends Data.TaggedError("ExecuteActionError")<{
  readonly cause: unknown;
  readonly message: string;
}> {}

interface ActionConfig {
  type: "file" | "git" | "database" | "http" | "shell";
  operation: string;
  params?: Record<string, unknown>;
}

interface ExecuteActionConfig {
  actions: ActionConfig[];
  executionMode?: "sequential" | "parallel";
  requiresUserConfirmation?: boolean;
}

export interface ExecuteActionHandler {
  readonly _tag: "ExecuteActionHandler";
  execute: (
    input: StepHandlerInput,
    userInput?: unknown,
  ) => Effect.Effect<StepHandlerOutput, ExecuteActionError>;
}

export const ExecuteActionHandler =
  Context.GenericTag<ExecuteActionHandler>("ExecuteActionHandler");

function resolveTemplate(template: string, variables: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
    const parts = path.split(".");
    let value: unknown = variables;
    for (const part of parts) {
      if (value && typeof value === "object" && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return match;
      }
    }
    if (value === undefined || value === null) return match;
    return String(value);
  });
}

function resolveDeep(obj: unknown, variables: Record<string, unknown>): unknown {
  if (typeof obj === "string") {
    return resolveTemplate(obj, variables);
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => resolveDeep(item, variables));
  }
  if (obj && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = resolveDeep(value, variables);
    }
    return result;
  }
  return obj;
}

async function executeFileAction(
  operation: string,
  params: Record<string, unknown>,
  rootPath: string,
): Promise<{ success: boolean; message: string }> {
  const path = params.path as string;
  const fullPath = resolve(rootPath, path);

  if (!fullPath.startsWith(rootPath)) {
    throw new Error("Path traversal not allowed");
  }

  switch (operation) {
    case "mkdir": {
      await mkdir(fullPath, { recursive: true });
      return { success: true, message: `Created directory: ${path}` };
    }
    case "write": {
      const content = (params.content as string) || "";
      await mkdir(dirname(fullPath), { recursive: true });
      await writeFile(fullPath, content, "utf-8");
      return { success: true, message: `Written file: ${path}` };
    }
    default:
      return {
        success: false,
        message: `Unknown file operation: ${operation}`,
      };
  }
}

async function executeGitAction(
  operation: string,
  _params: Record<string, unknown>,
  rootPath: string,
): Promise<{ success: boolean; message: string }> {
  const { exec } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execAsync = promisify(exec);

  switch (operation) {
    case "init": {
      await execAsync("git init", { cwd: rootPath });
      return { success: true, message: "Initialized git repository" };
    }
    default:
      return { success: false, message: `Unknown git operation: ${operation}` };
  }
}

async function executeDatabaseAction(
  operation: string,
  params: Record<string, unknown>,
): Promise<{ success: boolean; message: string }> {
  switch (operation) {
    case "update": {
      const table = params.table as string;
      const data = params.data as Record<string, unknown>;
      const whereField = params.whereField as string;
      const whereValue = params.whereValue as string;

      if (table === "projects" && whereField === "id") {
        await db.update(projects).set(data).where(eq(projects.id, whereValue));
        return { success: true, message: `Updated project ${whereValue}` };
      }
      return { success: false, message: `Unsupported table: ${table}` };
    }
    default:
      return {
        success: false,
        message: `Unknown database operation: ${operation}`,
      };
  }
}

export const ExecuteActionHandlerLive = Layer.succeed(ExecuteActionHandler, {
  _tag: "ExecuteActionHandler" as const,

  execute: (input: StepHandlerInput, userInput?: unknown) =>
    Effect.gen(function* () {
      const config = input.stepConfig as unknown as ExecuteActionConfig;
      const variables = input.variables;

      if (!config.actions || !Array.isArray(config.actions)) {
        return yield* Effect.fail(
          new ExecuteActionError({
            cause: new Error("Missing actions in config"),
            message: "ExecuteAction step requires an actions array",
          }),
        );
      }

      if (config.requiresUserConfirmation && !userInput) {
        const preview = config.actions.map((a) => ({
          type: a.type,
          operation: a.operation,
          params: resolveDeep(a.params || {}, variables),
        }));
        return {
          result: { preview, awaitingConfirmation: true },
          requiresUserInput: true,
        };
      }

      const rootPath = (variables.rootPath as string) || process.cwd();
      const results: { success: boolean; message: string }[] = [];

      for (const action of config.actions) {
        const resolvedParams = resolveDeep(action.params || {}, variables) as Record<
          string,
          unknown
        >;

        try {
          let actionResult: { success: boolean; message: string };

          switch (action.type) {
            case "file":
              actionResult = yield* Effect.tryPromise({
                try: () => executeFileAction(action.operation, resolvedParams, rootPath),
                catch: (error) =>
                  new ExecuteActionError({
                    cause: error,
                    message: `File action failed: ${error instanceof Error ? error.message : "Unknown error"}`,
                  }),
              });
              break;

            case "git":
              actionResult = yield* Effect.tryPromise({
                try: () => executeGitAction(action.operation, resolvedParams, rootPath),
                catch: (error) =>
                  new ExecuteActionError({
                    cause: error,
                    message: `Git action failed: ${error instanceof Error ? error.message : "Unknown error"}`,
                  }),
              });
              break;

            case "database":
              actionResult = yield* Effect.tryPromise({
                try: () => executeDatabaseAction(action.operation, resolvedParams),
                catch: (error) =>
                  new ExecuteActionError({
                    cause: error,
                    message: `Database action failed: ${error instanceof Error ? error.message : "Unknown error"}`,
                  }),
              });
              break;

            default:
              actionResult = {
                success: false,
                message: `Unsupported action type: ${action.type}`,
              };
          }

          results.push(actionResult);
        } catch (e) {
          results.push({
            success: false,
            message: `Action failed: ${e instanceof Error ? e.message : "Unknown error"}`,
          });
        }
      }

      const allSuccessful = results.every((r) => r.success);

      return {
        result: {
          executed: true,
          results,
          allSuccessful,
        },
        variableUpdates: {
          actionResults: results,
        },
        requiresUserInput: false,
      };
    }),
});
