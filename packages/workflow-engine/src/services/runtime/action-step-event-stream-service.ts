import type { RuntimeActionCompletionSummary } from "@chiron/contracts/runtime/executions";
import type { ActionStepSseEnvelope } from "@chiron/contracts/sse/envelope";
import { Context, Effect, Layer, Runtime, Stream } from "effect";

import { RepositoryError } from "../../errors";
import { StepExecutionDetailService } from "../step-execution-detail-service";

type ActionStepStreamSnapshot = {
  readonly stepExecutionId: string;
  readonly stepStatus: "active" | "completed";
  readonly completionSummary: RuntimeActionCompletionSummary;
  readonly actions: ReadonlyArray<{
    readonly actionId: string;
    readonly sortOrder: number;
    readonly status: "not_started" | "running" | "succeeded" | "needs_attention" | "skipped";
    readonly resultSummaryJson?: unknown;
    readonly resultJson?: unknown;
    readonly items: ReadonlyArray<{
      readonly itemId: string;
      readonly sortOrder: number;
      readonly status:
        | "not_started"
        | "running"
        | "succeeded"
        | "failed"
        | "needs_attention"
        | "skipped";
      readonly resultSummaryJson?: unknown;
      readonly resultJson?: unknown;
      readonly affectedTargets: readonly unknown[];
    }>;
  }>;
};

const POLL_INTERVAL_MS = 200;

const stableJson = (value: unknown) => JSON.stringify(value ?? null);

const sameUnknown = (left: unknown, right: unknown) => stableJson(left) === stableJson(right);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class ActionStepEventStreamService extends Context.Tag(
  "@chiron/workflow-engine/services/runtime/ActionStepEventStreamService",
)<
  ActionStepEventStreamService,
  {
    readonly streamExecutionEvents: (input: {
      projectId: string;
      stepExecutionId: string;
    }) => Stream.Stream<ActionStepSseEnvelope, never>;
  }
>() {}

export const ActionStepEventStreamServiceLive = Layer.effect(
  ActionStepEventStreamService,
  Effect.gen(function* () {
    const stepDetailService = yield* StepExecutionDetailService;
    const runtime = yield* Effect.runtime<never>();

    const loadSnapshot = (input: { projectId: string; stepExecutionId: string }) =>
      stepDetailService.getRuntimeStepExecutionDetail(input).pipe(
        Effect.flatMap((detail) => {
          if (
            !detail ||
            detail.shell.stepType !== "action" ||
            detail.body.stepType !== "action" ||
            !("completionSummary" in detail.body) ||
            !("actions" in detail.body)
          ) {
            return Effect.fail(
              new RepositoryError({
                operation: "action-step-event-stream.loadSnapshot",
                cause: new Error(`Action step execution not found: ${input.stepExecutionId}`),
              }),
            );
          }

          const actionBody = detail.body;

          return Effect.succeed({
            stepExecutionId: detail.shell.stepExecutionId,
            stepStatus: detail.shell.status,
            completionSummary: actionBody.completionSummary,
            actions: actionBody.actions.map((action) => ({
              actionId: action.actionId,
              sortOrder: action.sortOrder,
              status: action.status,
              ...(action.resultSummaryJson ? { resultSummaryJson: action.resultSummaryJson } : {}),
              ...(action.resultJson ? { resultJson: action.resultJson } : {}),
              items: action.items.map((item) => ({
                itemId: item.itemId,
                sortOrder: item.sortOrder,
                status: item.status,
                ...(item.resultSummaryJson ? { resultSummaryJson: item.resultSummaryJson } : {}),
                ...(item.resultJson ? { resultJson: item.resultJson } : {}),
                affectedTargets: item.affectedTargets,
              })),
            })),
          } satisfies ActionStepStreamSnapshot);
        }),
      );

    async function* streamExecutionEventsIterable(input: {
      projectId: string;
      stepExecutionId: string;
    }): AsyncGenerator<ActionStepSseEnvelope> {
      let previous: ActionStepStreamSnapshot | null = null;

      while (true) {
        let current: ActionStepStreamSnapshot;

        try {
          current = await Runtime.runPromise(runtime)(loadSnapshot(input));
        } catch (error) {
          yield {
            version: "v1",
            stream: "action_step_execution_events",
            eventType: "error",
            stepExecutionId: input.stepExecutionId,
            data: {
              message: error instanceof Error ? error.message : String(error),
            },
          } satisfies ActionStepSseEnvelope;
          return;
        }

        if (previous === null) {
          yield {
            version: "v1",
            stream: "action_step_execution_events",
            eventType: "bootstrap",
            stepExecutionId: current.stepExecutionId,
            data: {
              stepStatus: current.stepStatus,
              completionSummary: current.completionSummary,
              actions: current.actions.map((action) => ({
                actionId: action.actionId,
                status: action.status,
                ...(action.resultSummaryJson
                  ? { resultSummaryJson: action.resultSummaryJson }
                  : {}),
              })),
              items: current.actions.flatMap((action) =>
                action.items.map((item) => ({
                  actionId: action.actionId,
                  itemId: item.itemId,
                  status: item.status,
                  ...(item.resultSummaryJson ? { resultSummaryJson: item.resultSummaryJson } : {}),
                  affectedTargets: item.affectedTargets as readonly never[],
                })),
              ),
            },
          } satisfies ActionStepSseEnvelope;
        } else {
          const previousActions = new Map(
            previous.actions.map((action) => [action.actionId, action] as const),
          );

          for (const action of current.actions) {
            const previousAction = previousActions.get(action.actionId);
            const previousItems = new Map(
              (previousAction?.items ?? []).map((item) => [item.itemId, item] as const),
            );

            for (const item of [...action.items].sort(
              (left, right) => left.sortOrder - right.sortOrder,
            )) {
              const previousItem = previousItems.get(item.itemId);
              if (
                !previousItem ||
                previousItem.status !== item.status ||
                !sameUnknown(previousItem.resultSummaryJson, item.resultSummaryJson) ||
                !sameUnknown(previousItem.resultJson, item.resultJson) ||
                !sameUnknown(previousItem.affectedTargets, item.affectedTargets)
              ) {
                yield {
                  version: "v1",
                  stream: "action_step_execution_events",
                  eventType: "action-item-status-changed",
                  stepExecutionId: current.stepExecutionId,
                  data: {
                    actionId: action.actionId,
                    itemId: item.itemId,
                    status: item.status,
                    ...(item.resultSummaryJson
                      ? { resultSummaryJson: item.resultSummaryJson }
                      : {}),
                    ...(item.resultJson ? { resultJson: item.resultJson } : {}),
                    affectedTargets: item.affectedTargets as readonly never[],
                  },
                } satisfies ActionStepSseEnvelope;
              }
            }

            if (
              !previousAction ||
              previousAction.status !== action.status ||
              !sameUnknown(previousAction.resultSummaryJson, action.resultSummaryJson) ||
              !sameUnknown(previousAction.resultJson, action.resultJson)
            ) {
              yield {
                version: "v1",
                stream: "action_step_execution_events",
                eventType: "action-status-changed",
                stepExecutionId: current.stepExecutionId,
                data: {
                  actionId: action.actionId,
                  status: action.status,
                  ...(action.resultSummaryJson
                    ? { resultSummaryJson: action.resultSummaryJson }
                    : {}),
                  ...(action.resultJson ? { resultJson: action.resultJson } : {}),
                },
              } satisfies ActionStepSseEnvelope;
            }
          }

          if (!sameUnknown(previous.completionSummary, current.completionSummary)) {
            yield {
              version: "v1",
              stream: "action_step_execution_events",
              eventType: "step-completion-eligibility-changed",
              stepExecutionId: current.stepExecutionId,
              data: current.completionSummary,
            } satisfies ActionStepSseEnvelope;
          }
        }

        previous = current;

        if (current.stepStatus === "completed") {
          yield {
            version: "v1",
            stream: "action_step_execution_events",
            eventType: "done",
            stepExecutionId: current.stepExecutionId,
            data: {
              finalStepStatus: current.stepStatus,
            },
          } satisfies ActionStepSseEnvelope;
          return;
        }

        await sleep(POLL_INTERVAL_MS);
      }
    }

    const streamExecutionEvents = (input: { projectId: string; stepExecutionId: string }) =>
      Stream.fromAsyncIterable(
        streamExecutionEventsIterable(input),
        () =>
          new RepositoryError({
            operation: "action-step-event-stream.iterable",
            cause: new Error("action step stream iteration failed"),
          }),
      ).pipe(Stream.orDie);

    return ActionStepEventStreamService.of({ streamExecutionEvents });
  }),
);
