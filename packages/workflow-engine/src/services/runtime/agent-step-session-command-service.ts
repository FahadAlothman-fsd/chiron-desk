import type {
  CompleteAgentStepExecutionInput,
  CompleteAgentStepExecutionOutput,
  StartAgentStepSessionInput,
  StartAgentStepSessionOutput,
  UpdateAgentStepTurnSelectionInput,
  UpdateAgentStepTurnSelectionOutput,
  SendAgentStepMessageInput,
  SendAgentStepMessageOutput,
} from "@chiron/contracts/agent-step/runtime";
import { HarnessService, type HarnessOperationError } from "@chiron/agent-runtime";
import { AgentStepStateTransitionError } from "@chiron/contracts/agent-step/errors";
import { LifecycleRepository, MethodologyRepository } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";
import { Context, Effect, Layer } from "effect";

import { RepositoryError } from "../../errors";
import { AgentStepExecutionHarnessBindingRepository } from "../../repositories/agent-step-execution-harness-binding-repository";
import { AgentStepExecutionStateRepository } from "../../repositories/agent-step-execution-state-repository";
import { ExecutionReadRepository } from "../../repositories/execution-read-repository";
import { StepExecutionRepository } from "../../repositories/step-execution-repository";
import { StepContextQueryService } from "../step-context-query-service";
import { StepExecutionLifecycleService } from "../step-execution-lifecycle-service";
import {
  ensureAgentStepRuntimeContext,
  transitionAgentStepState,
} from "./agent-step-runtime-support";

type AgentStepSessionCommandServiceError =
  | RepositoryError
  | HarnessOperationError
  | AgentStepStateTransitionError;

const isMissingHarnessSessionError = (message: string) =>
  message.includes("Harness session") && message.includes("was not found");

const isUnavailableHarnessSessionError = (message: string) => {
  const normalized = message.toLowerCase();

  return (
    isMissingHarnessSessionError(message) ||
    normalized.includes("econnrefused") ||
    normalized.includes("fetch failed") ||
    normalized.includes("network") ||
    normalized.includes("connect") ||
    normalized.includes("timed out")
  );
};

export class AgentStepSessionCommandService extends Context.Tag(
  "@chiron/workflow-engine/services/runtime/AgentStepSessionCommandService",
)<
  AgentStepSessionCommandService,
  {
    readonly startAgentStepSession: (
      input: StartAgentStepSessionInput,
    ) => Effect.Effect<StartAgentStepSessionOutput, AgentStepSessionCommandServiceError>;
    readonly sendAgentStepMessage: (
      input: SendAgentStepMessageInput,
    ) => Effect.Effect<SendAgentStepMessageOutput, AgentStepSessionCommandServiceError>;
    readonly updateAgentStepTurnSelection: (
      input: UpdateAgentStepTurnSelectionInput,
    ) => Effect.Effect<UpdateAgentStepTurnSelectionOutput, RepositoryError>;
    readonly completeAgentStepExecution: (
      input: CompleteAgentStepExecutionInput,
    ) => Effect.Effect<CompleteAgentStepExecutionOutput, AgentStepSessionCommandServiceError>;
  }
>() {}

export const AgentStepSessionCommandServiceLive = Layer.effect(
  AgentStepSessionCommandService,
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
    const lifecycle = yield* StepExecutionLifecycleService;

    const resolveProjectContext = (stepExecutionId: string, projectId: string) =>
      ensureAgentStepRuntimeContext(
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
        { stepExecutionId, projectId },
      );

    const startAgentStepSession = (input: StartAgentStepSessionInput) =>
      Effect.gen(function* () {
        const context = yield* resolveProjectContext(input.stepExecutionId, input.projectId);
        const project = yield* projectContextRepo.getProjectById({ projectId: input.projectId });
        let transitionFromState = context.runtimeState;

        if (context.bindingRow?.bindingState === "binding") {
          yield* bindingRepo.updateBinding({
            stepExecutionId: context.stepExecution.id,
            harnessId: context.bindingRow.harnessId,
            bindingState: "errored",
            sessionId: context.bindingRow.sessionId,
            serverInstanceId: null,
            serverBaseUrl: null,
          });

          if (context.runtimeState === "starting_session") {
            yield* transitionAgentStepState({
              stepExecutionId: context.stepExecution.id,
              from: context.runtimeState,
              to: "disconnected_or_error",
              stateRepo,
            });

            transitionFromState = "disconnected_or_error";
          }
        }

        if (context.bindingRow?.bindingState === "bound" && context.bindingRow.sessionId) {
          const hasLiveSession = yield* harness.getTimelinePage(context.bindingRow.sessionId).pipe(
            Effect.map(() => true),
            Effect.catchTags({
              OpenCodeExecutionError: (error) =>
                isUnavailableHarnessSessionError(error.message)
                  ? Effect.succeed(false)
                  : Effect.fail(error),
              HarnessExecutionError: (error) =>
                isUnavailableHarnessSessionError(error.message)
                  ? Effect.succeed(false)
                  : Effect.fail(error),
            }),
          );

          if (!hasLiveSession || context.runtimeState === "disconnected_or_error") {
            yield* bindingRepo.updateBinding({
              stepExecutionId: context.stepExecution.id,
              harnessId: context.bindingRow.harnessId,
              bindingState: "errored",
              sessionId: context.bindingRow.sessionId,
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

              transitionFromState = "disconnected_or_error";
            }
          }

          if (hasLiveSession && context.runtimeState !== "disconnected_or_error") {
            const resolvedState =
              context.runtimeState === "active_streaming" ? "active_streaming" : "active_idle";

            if (context.runtimeState === "starting_session") {
              yield* transitionAgentStepState({
                stepExecutionId: context.stepExecution.id,
                from: "starting_session",
                to: resolvedState,
                stateRepo,
              });
            }

            return {
              stepExecutionId: context.stepExecution.id,
              state: resolvedState,
              bindingState: "bound",
            } satisfies StartAgentStepSessionOutput;
          }
        }

        yield* transitionAgentStepState({
          stepExecutionId: context.stepExecution.id,
          from: transitionFromState,
          to: "starting_session",
          stateRepo,
        });

        const binding =
          (yield* bindingRepo.updateBinding({
            stepExecutionId: context.stepExecution.id,
            harnessId: context.agentPayload.harnessSelection.harness ?? "opencode",
            bindingState: "binding",
            selectedAgentKey:
              context.bindingRow?.selectedAgentKey ??
              context.agentPayload.harnessSelection.agent ??
              null,
            selectedModelJson:
              context.bindingRow?.selectedModelJson ??
              context.agentPayload.harnessSelection.model ??
              null,
          })) ??
          (yield* bindingRepo.createBinding({
            stepExecutionId: context.stepExecution.id,
            harnessId: context.agentPayload.harnessSelection.harness ?? "opencode",
            bindingState: "binding",
            selectedAgentKey:
              context.bindingRow?.selectedAgentKey ??
              context.agentPayload.harnessSelection.agent ??
              null,
            selectedModelJson:
              context.bindingRow?.selectedModelJson ??
              context.agentPayload.harnessSelection.model ??
              null,
          }));

        const started = yield* harness.startSession({
          stepExecutionId: context.stepExecution.id,
          ...(project?.projectRootPath ? { projectRootPath: project.projectRootPath } : {}),
          ...(context.bindingRow?.sessionId
            ? { resumeSessionId: context.bindingRow.sessionId }
            : {}),
          agent: binding.selectedAgentKey ?? context.agentPayload.harnessSelection.agent,
          model: binding.selectedModelJson ?? context.agentPayload.harnessSelection.model,
          objective: context.agentPayload.objective,
          instructionsMarkdown: context.agentPayload.instructionsMarkdown,
        });
        const startedState =
          started.session.state === "active_streaming" ? "active_streaming" : "active_idle";

        yield* bindingRepo.updateBinding({
          stepExecutionId: context.stepExecution.id,
          harnessId: context.agentPayload.harnessSelection.harness ?? "opencode",
          bindingState: "bound",
          sessionId: started.session.sessionId,
          serverInstanceId: started.serverInstanceId ?? null,
          serverBaseUrl: started.serverBaseUrl ?? null,
          selectedAgentKey:
            started.session.agent ??
            binding.selectedAgentKey ??
            context.agentPayload.harnessSelection.agent ??
            null,
          selectedModelJson:
            started.session.model ??
            binding.selectedModelJson ??
            context.agentPayload.harnessSelection.model ??
            null,
        });

        yield* transitionAgentStepState({
          stepExecutionId: context.stepExecution.id,
          from: "starting_session",
          to: startedState,
          stateRepo,
        });

        if (!context.stateRow?.bootstrapAppliedAt) {
          yield* stateRepo.updateState({
            stepExecutionId: context.stepExecution.id,
            bootstrapAppliedAt: new Date(),
          });
        }

        return {
          stepExecutionId: context.stepExecution.id,
          state: startedState,
          bindingState: "bound",
        } satisfies StartAgentStepSessionOutput;
      });

    const sendAgentStepMessage = (input: SendAgentStepMessageInput) =>
      Effect.gen(function* () {
        const context = yield* resolveProjectContext(input.stepExecutionId, input.projectId);
        const sessionId = context.bindingRow?.sessionId;
        if (!sessionId) {
          return yield* new AgentStepStateTransitionError({
            fromState: context.runtimeState,
            toState: "active_streaming",
            message: "Agent session must be started before messages can be sent.",
          });
        }

        if (context.runtimeState === "active_idle") {
          yield* transitionAgentStepState({
            stepExecutionId: context.stepExecution.id,
            from: context.runtimeState,
            to: "active_streaming",
            stateRepo,
          });
        } else if (context.runtimeState !== "active_streaming") {
          return yield* new AgentStepStateTransitionError({
            fromState: context.runtimeState,
            toState: "active_streaming",
            message: "Messages can be sent only while the Agent step session is active.",
          });
        }

        const accepted = yield* harness.sendMessage(sessionId, input.message).pipe(
          Effect.catchTags({
            OpenCodeExecutionError: (error) =>
              isMissingHarnessSessionError(error.message)
                ? Effect.gen(function* () {
                    yield* bindingRepo.updateBinding({
                      stepExecutionId: context.stepExecution.id,
                      harnessId: context.bindingRow?.harnessId ?? "opencode",
                      bindingState: "errored",
                      sessionId: context.bindingRow?.sessionId ?? null,
                      serverInstanceId: null,
                      serverBaseUrl: null,
                    });

                    yield* transitionAgentStepState({
                      stepExecutionId: context.stepExecution.id,
                      from: "active_streaming",
                      to: "disconnected_or_error",
                      stateRepo,
                    });

                    return yield* new AgentStepStateTransitionError({
                      fromState: "active_streaming",
                      toState: "disconnected_or_error",
                      message: "Agent session was lost. Start or retry the session to continue.",
                    });
                  })
                : Effect.fail(error),
            HarnessExecutionError: (error) =>
              isMissingHarnessSessionError(error.message)
                ? Effect.gen(function* () {
                    yield* bindingRepo.updateBinding({
                      stepExecutionId: context.stepExecution.id,
                      harnessId: context.bindingRow?.harnessId ?? "opencode",
                      bindingState: "errored",
                      sessionId: context.bindingRow?.sessionId ?? null,
                      serverInstanceId: null,
                      serverBaseUrl: null,
                    });

                    yield* transitionAgentStepState({
                      stepExecutionId: context.stepExecution.id,
                      from: "active_streaming",
                      to: "disconnected_or_error",
                      stateRepo,
                    });

                    return yield* new AgentStepStateTransitionError({
                      fromState: "active_streaming",
                      toState: "disconnected_or_error",
                      message: "Agent session was lost. Start or retry the session to continue.",
                    });
                  })
                : Effect.fail(error),
          }),
        );

        yield* transitionAgentStepState({
          stepExecutionId: context.stepExecution.id,
          from: "active_streaming",
          to: accepted.state,
          stateRepo,
        });

        return {
          stepExecutionId: context.stepExecution.id,
          accepted: true,
          state: accepted.state,
        } satisfies SendAgentStepMessageOutput;
      });

    const updateAgentStepTurnSelection = (input: UpdateAgentStepTurnSelectionInput) =>
      Effect.gen(function* () {
        const context = yield* resolveProjectContext(input.stepExecutionId, input.projectId);

        yield* bindingRepo
          .updateBinding({
            stepExecutionId: context.stepExecution.id,
            harnessId: context.agentPayload.harnessSelection.harness ?? "opencode",
            bindingState: context.bindingRow?.bindingState ?? "unbound",
            ...(input.agent !== undefined ? { selectedAgentKey: input.agent } : {}),
            ...(input.model !== undefined ? { selectedModelJson: input.model } : {}),
          })
          .pipe(
            Effect.flatMap((updated) =>
              updated
                ? Effect.succeed(updated)
                : bindingRepo.createBinding({
                    stepExecutionId: context.stepExecution.id,
                    harnessId: context.agentPayload.harnessSelection.harness ?? "opencode",
                    bindingState: "unbound",
                    selectedAgentKey:
                      input.agent ?? context.agentPayload.harnessSelection.agent ?? null,
                    selectedModelJson:
                      input.model ?? context.agentPayload.harnessSelection.model ?? null,
                  }),
            ),
          );

        return {
          stepExecutionId: context.stepExecution.id,
          appliesTo: "next_turn_only",
          ...(input.model ? { model: input.model } : {}),
          ...(input.agent ? { agent: input.agent } : {}),
        } satisfies UpdateAgentStepTurnSelectionOutput;
      });

    const completeAgentStepExecution = (input: CompleteAgentStepExecutionInput) =>
      Effect.gen(function* () {
        const context = yield* resolveProjectContext(input.stepExecutionId, input.projectId);

        yield* transitionAgentStepState({
          stepExecutionId: context.stepExecution.id,
          from: context.runtimeState,
          to: "completed",
          stateRepo,
        });

        yield* lifecycle.completeStepExecution({ stepExecutionId: context.stepExecution.id });

        return {
          stepExecutionId: context.stepExecution.id,
          state: "completed",
        } satisfies CompleteAgentStepExecutionOutput;
      });

    return AgentStepSessionCommandService.of({
      startAgentStepSession,
      sendAgentStepMessage,
      updateAgentStepTurnSelection,
      completeAgentStepExecution,
    });
  }),
);
