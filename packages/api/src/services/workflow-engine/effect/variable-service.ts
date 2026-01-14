import {
  type Variable,
  type VariableHistoryEntry,
  type VariableSource,
  variableHistory,
  variables,
  workflowExecutions,
} from "@chiron/db";
import { and, eq } from "drizzle-orm";
import { Context, Effect, Layer } from "effect";
import Handlebars from "handlebars";
import { DatabaseService } from "./database-service";
import {
  ExecutionNotFoundError,
  VariableDatabaseError,
  VariableNotFoundError,
  VariableResolutionError,
} from "./errors";
import { WorkflowEventBus } from "./event-bus";

export interface VariableServiceImpl {
  get(executionId: string, name: string): Effect.Effect<Variable | null, VariableDatabaseError>;

  getAll(executionId: string): Effect.Effect<Variable[], VariableDatabaseError>;

  set(
    executionId: string,
    name: string,
    value: unknown,
    source: VariableSource,
    stepNumber?: number,
  ): Effect.Effect<Variable, VariableDatabaseError>;

  merge(
    executionId: string,
    vars: Record<string, unknown>,
    source: VariableSource,
  ): Effect.Effect<Variable[], VariableDatabaseError>;

  delete(executionId: string, name: string): Effect.Effect<void, VariableDatabaseError>;

  getHistory(
    executionId: string,
    name?: string,
  ): Effect.Effect<VariableHistoryEntry[], VariableDatabaseError>;

  resolveTemplate(
    template: string,
    executionId: string,
  ): Effect.Effect<string, VariableDatabaseError | VariableResolutionError | VariableNotFoundError>;

  resolveObject<T extends Record<string, unknown>>(
    obj: T,
    executionId: string,
  ): Effect.Effect<T, VariableDatabaseError | VariableResolutionError | VariableNotFoundError>;

  propagateToParent(
    childExecutionId: string,
    variableNames: string[],
  ): Effect.Effect<void, VariableDatabaseError | ExecutionNotFoundError | VariableNotFoundError>;
}

export class VariableService extends Context.Tag("VariableService")<
  VariableService,
  VariableServiceImpl
>() {}

const HANDLEBARS_PATTERN = /\{\{[^}]+\}\}/g;

export const VariableServiceLive = Layer.effect(
  VariableService,
  Effect.gen(function* () {
    const dbService = yield* DatabaseService;
    const eventBus = yield* WorkflowEventBus;
    const { db } = dbService;

    const get = (
      executionId: string,
      name: string,
    ): Effect.Effect<Variable | null, VariableDatabaseError> =>
      Effect.tryPromise({
        try: async () => {
          const result = await db
            .select()
            .from(variables)
            .where(and(eq(variables.executionId, executionId), eq(variables.name, name)))
            .limit(1);
          return result[0] ?? null;
        },
        catch: (error) => new VariableDatabaseError({ operation: "get", cause: error }),
      });

    const getAll = (executionId: string): Effect.Effect<Variable[], VariableDatabaseError> =>
      Effect.tryPromise({
        try: async () => db.select().from(variables).where(eq(variables.executionId, executionId)),
        catch: (error) => new VariableDatabaseError({ operation: "getAll", cause: error }),
      });

    /**
     * Set a variable with full transaction support (AC6).
     * Uses Drizzle transaction to ensure atomic variable update + history insert.
     * Fresh-read guarantee: re-reads variable within transaction before update.
     */
    const set = (
      executionId: string,
      name: string,
      value: unknown,
      source: VariableSource,
      stepNumber?: number,
    ): Effect.Effect<Variable, VariableDatabaseError> =>
      Effect.gen(function* () {
        const result = yield* Effect.tryPromise({
          try: async () => {
            // Wrap in transaction for atomicity (AC6)
            return await db.transaction(async (tx) => {
              // Fresh-read within transaction (AC6 requirement)
              const [existing] = await tx
                .select()
                .from(variables)
                .where(and(eq(variables.executionId, executionId), eq(variables.name, name)))
                .limit(1);

              // Upsert variable
              const [variable] = await tx
                .insert(variables)
                .values({
                  executionId,
                  name,
                  value,
                  source,
                  updatedAt: new Date(),
                })
                .onConflictDoUpdate({
                  target: [variables.executionId, variables.name],
                  set: {
                    value,
                    source,
                    updatedAt: new Date(),
                  },
                })
                .returning();

              if (!variable) {
                throw new Error("Insert returned no rows");
              }

              // Insert history record (atomic with variable update)
              await tx.insert(variableHistory).values({
                variableId: variable.id,
                previousValue: existing?.value ?? null,
                newValue: value,
                source,
                stepNumber,
              });

              return variable;
            });
          },
          catch: (error) => new VariableDatabaseError({ operation: "set", cause: error }),
        });

        yield* eventBus.publish({
          _tag: "VariableChanged",
          executionId,
          name,
          source,
        });

        return result;
      });

    const merge = (
      executionId: string,
      vars: Record<string, unknown>,
      source: VariableSource,
    ): Effect.Effect<Variable[], VariableDatabaseError> =>
      Effect.all(
        Object.entries(vars).map(([name, value]) => set(executionId, name, value, source)),
        { concurrency: "unbounded" },
      );

    const deleteVar = (
      executionId: string,
      name: string,
    ): Effect.Effect<void, VariableDatabaseError> =>
      Effect.tryPromise({
        try: async () => {
          await db
            .delete(variables)
            .where(and(eq(variables.executionId, executionId), eq(variables.name, name)));
        },
        catch: (error) => new VariableDatabaseError({ operation: "delete", cause: error }),
      });

    const getHistory = (
      executionId: string,
      name?: string,
    ): Effect.Effect<VariableHistoryEntry[], VariableDatabaseError> =>
      Effect.gen(function* () {
        const vars = yield* getAll(executionId);
        const variableIds = name
          ? vars.filter((v) => v.name === name).map((v) => v.id)
          : vars.map((v) => v.id);

        if (variableIds.length === 0) return [];

        return yield* Effect.tryPromise({
          try: async () => {
            const results: VariableHistoryEntry[] = [];
            for (const varId of variableIds) {
              const history = await db
                .select()
                .from(variableHistory)
                .where(eq(variableHistory.variableId, varId))
                .orderBy(variableHistory.changedAt);
              results.push(...history);
            }
            return results;
          },
          catch: (error) =>
            new VariableDatabaseError({
              operation: "getHistory",
              cause: error,
            }),
        });
      });

    const resolveTemplate = (
      template: string,
      executionId: string,
    ): Effect.Effect<
      string,
      VariableDatabaseError | VariableResolutionError | VariableNotFoundError
    > =>
      Effect.gen(function* () {
        const allVars = yield* getAll(executionId);

        // Build context with 4-level precedence: System > Execution > Step > Input (AC4)
        // Lower precedence sources are applied first, higher precedence overwrites
        const precedenceOrder: VariableSource[] = [
          "migration",
          "input",
          "parent",
          "step",
          "child-propagation",
          "system",
        ];

        const sortedVars = [...allVars].toSorted((a, b) => {
          const aIdx = precedenceOrder.indexOf(a.source as VariableSource);
          const bIdx = precedenceOrder.indexOf(b.source as VariableSource);
          return aIdx - bIdx;
        });

        const context: Record<string, unknown> = {};
        for (const v of sortedVars) {
          context[v.name] = v.value;
        }

        const matches = template.match(HANDLEBARS_PATTERN) || [];
        const missingVariables: string[] = [];

        for (const match of matches) {
          const varName = match.slice(2, -2).trim().split(".")[0];
          if (varName && !(varName in context)) {
            missingVariables.push(varName);
          }
        }

        if (missingVariables.length > 0) {
          return yield* Effect.fail(
            new VariableResolutionError({
              template,
              missingVariables: [...new Set(missingVariables)],
            }),
          );
        }

        try {
          const compiled = Handlebars.compile(template, { noEscape: true });
          return compiled(context);
        } catch {
          return yield* Effect.fail(
            new VariableResolutionError({
              template,
              missingVariables: [],
            }),
          );
        }
      });

    const resolveObject = <T extends Record<string, unknown>>(
      obj: T,
      executionId: string,
    ): Effect.Effect<T, VariableDatabaseError | VariableResolutionError | VariableNotFoundError> =>
      Effect.gen(function* () {
        const resolveValue = (
          value: unknown,
        ): Effect.Effect<
          unknown,
          VariableDatabaseError | VariableResolutionError | VariableNotFoundError
        > => {
          if (typeof value === "string" && HANDLEBARS_PATTERN.test(value)) {
            return resolveTemplate(value, executionId);
          }
          if (Array.isArray(value)) {
            return Effect.all(value.map(resolveValue));
          }
          if (value !== null && typeof value === "object") {
            return resolveObject(value as Record<string, unknown>, executionId) as Effect.Effect<
              unknown,
              VariableDatabaseError | VariableResolutionError | VariableNotFoundError
            >;
          }
          return Effect.succeed(value);
        };

        const entries = Object.entries(obj);
        const resolvedEntries = yield* Effect.all(
          entries.map(([key, value]) =>
            Effect.map(resolveValue(value), (resolved) => [key, resolved]),
          ),
        );

        return Object.fromEntries(resolvedEntries) as T;
      });

    /**
     * Propagate variables from child to parent execution.
     * FAIL-FAST: If any requested variable is missing, propagation stops immediately
     * and no variables are copied. Use separate calls for partial propagation tolerance.
     */
    const propagateToParent = (
      childExecutionId: string,
      variableNames: string[],
    ): Effect.Effect<
      void,
      VariableDatabaseError | ExecutionNotFoundError | VariableNotFoundError
    > =>
      Effect.gen(function* () {
        const childExecution = yield* Effect.tryPromise({
          try: async () => {
            const [exec] = await db
              .select()
              .from(workflowExecutions)
              .where(eq(workflowExecutions.id, childExecutionId))
              .limit(1);
            return exec;
          },
          catch: (error) =>
            new VariableDatabaseError({
              operation: "propagateToParent-getChild",
              cause: error,
            }),
        });

        if (!childExecution) {
          return yield* Effect.fail(new ExecutionNotFoundError({ executionId: childExecutionId }));
        }

        const parentId = childExecution.parentExecutionId;
        if (!parentId) {
          return;
        }

        for (const name of variableNames) {
          const childVar = yield* get(childExecutionId, name);
          if (!childVar) {
            return yield* Effect.fail(
              new VariableNotFoundError({
                variableName: name,
                executionId: childExecutionId,
              }),
            );
          }

          yield* set(parentId, name, childVar.value, "child-propagation");
        }

        yield* eventBus.publish({
          _tag: "VariablesPropagated",
          childId: childExecutionId,
          parentId,
          names: variableNames,
        });
      });

    return {
      get,
      getAll,
      set,
      merge,
      delete: deleteVar,
      getHistory,
      resolveTemplate,
      resolveObject,
      propagateToParent,
    };
  }),
);
