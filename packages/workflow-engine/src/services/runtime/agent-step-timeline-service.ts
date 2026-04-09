import type {
  GetAgentStepTimelinePageInput,
  GetAgentStepTimelinePageOutput,
} from "@chiron/contracts/agent-step/runtime";
import { HarnessService, type HarnessOperationError } from "@chiron/agent-runtime";
import { LifecycleRepository, MethodologyRepository } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";
import { Context, Effect, Layer } from "effect";

import { RepositoryError } from "../../errors";
import { AgentStepExecutionHarnessBindingRepository } from "../../repositories/agent-step-execution-harness-binding-repository";
import { AgentStepExecutionStateRepository } from "../../repositories/agent-step-execution-state-repository";
import { ExecutionReadRepository } from "../../repositories/execution-read-repository";
import { StepExecutionRepository } from "../../repositories/step-execution-repository";
import { StepContextQueryService } from "../step-context-query-service";
import {
  buildTimelineCursor,
  ensureAgentStepRuntimeContext,
  transitionAgentStepState,
} from "./agent-step-runtime-support";

type AgentStepTimelineServiceError = RepositoryError | HarnessOperationError;

const isMissingHarnessSessionError = (message: string) =>
  message.includes("Harness session") && message.includes("was not found");

export class AgentStepTimelineService extends Context.Tag(
  "@chiron/workflow-engine/services/runtime/AgentStepTimelineService",
)<
  AgentStepTimelineService,
  {
    readonly getTimelinePage: (
      input: GetAgentStepTimelinePageInput,
    ) => Effect.Effect<GetAgentStepTimelinePageOutput, AgentStepTimelineServiceError>;
  }
>() {}

export const AgentStepTimelineServiceLive = Layer.effect(
  AgentStepTimelineService,
  Effect.gen(function* () {
    const stepRepo = yield* StepExecutionRepository;
    const readRepo = yield* ExecutionReadRepository;
    const projectContextRepo = yield* ProjectContextRepository;
    const lifecycleRepo = yield* LifecycleRepository;
    const methodologyRepo = yield* MethodologyRepository;
    const stateRepo = yield* AgentStepExecutionStateRepository;
    const bindingRepo = yield* AgentStepExecutionHarnessBindingRepository;
    const contextQuery = yield* StepContextQueryService;
    const harness = yield* HarnessService;

    const getTimelinePage = (input: GetAgentStepTimelinePageInput) =>
      Effect.gen(function* () {
        const context = yield* ensureAgentStepRuntimeContext(
          {
            stepRepo,
            readRepo,
            projectContextRepo,
            lifecycleRepo,
            methodologyRepo,
            stateRepo,
            bindingRepo,
            contextQuery,
          },
          {
            projectId: input.projectId,
            stepExecutionId: input.stepExecutionId,
          },
        );

        if (!context.bindingRow?.sessionId) {
          return {
            stepExecutionId: context.stepExecution.id,
            cursor: input.cursor ?? {},
            items: [],
          } satisfies GetAgentStepTimelinePageOutput;
        }

        const page = yield* harness
          .getTimelinePage(context.bindingRow.sessionId, input.cursor)
          .pipe(
            Effect.catchTags({
              OpenCodeExecutionError: (error) =>
                isMissingHarnessSessionError(error.message)
                  ? Effect.gen(function* () {
                      yield* bindingRepo.updateBinding({
                        stepExecutionId: context.stepExecution.id,
                        harnessId: context.bindingRow?.harnessId ?? "opencode",
                        bindingState: "errored",
                        sessionId: null,
                        serverInstanceId: null,
                        serverBaseUrl: null,
                      });

                      if (
                        context.runtimeState === "starting_session" ||
                        context.runtimeState === "active_streaming" ||
                        context.runtimeState === "active_idle"
                      ) {
                        yield* transitionAgentStepState({
                          stepExecutionId: context.stepExecution.id,
                          from: context.runtimeState,
                          to: "disconnected_or_error",
                          stateRepo,
                        });
                      }

                      return {
                        sessionId: context.bindingRow?.sessionId ?? "missing-session",
                        stepExecutionId: context.stepExecution.id,
                        cursor: input.cursor ?? {},
                        items: [],
                      };
                    })
                  : Effect.fail(error),
              HarnessExecutionError: (error) =>
                isMissingHarnessSessionError(error.message)
                  ? Effect.gen(function* () {
                      yield* bindingRepo.updateBinding({
                        stepExecutionId: context.stepExecution.id,
                        harnessId: context.bindingRow?.harnessId ?? "opencode",
                        bindingState: "errored",
                        sessionId: null,
                        serverInstanceId: null,
                        serverBaseUrl: null,
                      });

                      if (
                        context.runtimeState === "starting_session" ||
                        context.runtimeState === "active_streaming" ||
                        context.runtimeState === "active_idle"
                      ) {
                        yield* transitionAgentStepState({
                          stepExecutionId: context.stepExecution.id,
                          from: context.runtimeState,
                          to: "disconnected_or_error",
                          stateRepo,
                        });
                      }

                      return {
                        sessionId: context.bindingRow?.sessionId ?? "missing-session",
                        stepExecutionId: context.stepExecution.id,
                        cursor: input.cursor ?? {},
                        items: [],
                      };
                    })
                  : Effect.fail(error),
            }),
          );
        const items =
          typeof input.limit === "number" && input.limit >= 0
            ? page.items.slice(0, input.limit)
            : page.items;

        return {
          stepExecutionId: context.stepExecution.id,
          cursor: buildTimelineCursor(items),
          items,
        } satisfies GetAgentStepTimelinePageOutput;
      });

    return AgentStepTimelineService.of({ getTimelinePage });
  }),
);
