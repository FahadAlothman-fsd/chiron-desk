import type {
  CompleteAgentStepExecutionInput,
  CompleteAgentStepExecutionOutput,
  ReconnectAgentStepSessionInput,
  ReconnectAgentStepSessionOutput,
  StartAgentStepSessionInput,
  StartAgentStepSessionOutput,
  UpdateAgentStepTurnSelectionInput,
  UpdateAgentStepTurnSelectionOutput,
  SendAgentStepMessageInput,
  SendAgentStepMessageOutput,
} from "@chiron/contracts/agent-step/runtime";
import { HarnessService, type HarnessOperationError } from "@chiron/agent-runtime";
import { AgentStepStateTransitionError } from "@chiron/contracts/agent-step/errors";
import type { ModelReference } from "@chiron/contracts/methodology/agent";
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
    readonly reconnectAgentStepSession: (
      input: ReconnectAgentStepSessionInput,
    ) => Effect.Effect<ReconnectAgentStepSessionOutput, AgentStepSessionCommandServiceError>;
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
        const projectRootPath = project?.projectRootPath?.trim();
        const sessionId = context.bindingRow?.sessionId;
        const selectedAgent =
          context.bindingRow?.selectedAgentKey ??
          context.agentPayload.harnessSelection.agent ??
          null;
        const selectedModel =
          context.bindingRow?.selectedModelJson ??
          context.agentPayload.harnessSelection.model ??
          null;
        const harnessId =
          context.bindingRow?.harnessId ??
          context.agentPayload.harnessSelection.harness ??
          "opencode";

        if (!projectRootPath) {
          return yield* new AgentStepStateTransitionError({
            fromState: context.runtimeState,
            toState: "starting_session",
            message: "Project root path is required to connect to an existing agent session.",
          });
        }

        const persistBoundBinding = ({
          resolvedSessionId,
          resolvedServerInstanceId,
          resolvedServerBaseUrl,
          resolvedAgent,
          resolvedModel,
        }: {
          resolvedSessionId: string;
          resolvedServerInstanceId: string | null;
          resolvedServerBaseUrl: string | null;
          resolvedAgent: string | null;
          resolvedModel: ModelReference | null;
        }) =>
          bindingRepo
            .updateBinding({
              stepExecutionId: context.stepExecution.id,
              harnessId,
              bindingState: "bound",
              sessionId: resolvedSessionId,
              serverInstanceId: resolvedServerInstanceId,
              serverBaseUrl: resolvedServerBaseUrl,
              selectedAgentKey: resolvedAgent,
              selectedModelJson: resolvedModel,
            })
            .pipe(
              Effect.flatMap((updated) =>
                updated
                  ? Effect.succeed(updated)
                  : bindingRepo.createBinding({
                      stepExecutionId: context.stepExecution.id,
                      harnessId,
                      bindingState: "bound",
                      sessionId: resolvedSessionId,
                      serverInstanceId: resolvedServerInstanceId,
                      serverBaseUrl: resolvedServerBaseUrl,
                      selectedAgentKey: resolvedAgent,
                      selectedModelJson: resolvedModel,
                    }),
              ),
            );

        const harnessSelection = {
          ...(selectedAgent ? { agent: selectedAgent } : {}),
          ...(selectedModel ? { model: selectedModel } : {}),
        };

        if (!sessionId) {
          const started = yield* harness.startSession({
            stepExecutionId: context.stepExecution.id,
            projectRootPath,
            ...harnessSelection,
            objective: context.agentPayload.objective,
            instructionsMarkdown: context.agentPayload.instructionsMarkdown,
            noReply: context.agentPayload.runtimePolicy.bootstrapPromptNoReply ?? true,
          });

          yield* persistBoundBinding({
            resolvedSessionId: started.session.sessionId,
            resolvedServerInstanceId: started.serverInstanceId ?? null,
            resolvedServerBaseUrl: started.serverBaseUrl ?? null,
            resolvedAgent: started.session.agent ?? selectedAgent ?? null,
            resolvedModel: started.session.model ?? selectedModel ?? null,
          });

          let resolvedState = context.runtimeState;
          if (context.runtimeState === "active_streaming") {
            resolvedState = "active_streaming";
          } else {
            if (context.runtimeState === "not_started") {
              yield* transitionAgentStepState({
                stepExecutionId: context.stepExecution.id,
                from: "not_started",
                to: "starting_session",
                stateRepo,
              });
              yield* transitionAgentStepState({
                stepExecutionId: context.stepExecution.id,
                from: "starting_session",
                to: "active_idle",
                stateRepo,
              });
            } else if (context.runtimeState === "starting_session") {
              yield* transitionAgentStepState({
                stepExecutionId: context.stepExecution.id,
                from: "starting_session",
                to: "active_idle",
                stateRepo,
              });
            } else if (context.runtimeState === "disconnected_or_error") {
              yield* transitionAgentStepState({
                stepExecutionId: context.stepExecution.id,
                from: "disconnected_or_error",
                to: "active_idle",
                stateRepo,
              });
            }

            resolvedState = "active_idle";
          }

          if (!context.stateRow?.bootstrapAppliedAt) {
            yield* stateRepo.updateState({
              stepExecutionId: context.stepExecution.id,
              bootstrapAppliedAt: new Date(),
            });
          }

          return {
            stepExecutionId: context.stepExecution.id,
            state: resolvedState,
            bindingState: "bound",
          } satisfies StartAgentStepSessionOutput;
        }

        const reconnected = yield* harness
          .reconnectSession({
            stepExecutionId: context.stepExecution.id,
            projectRootPath,
            resumeSessionId: sessionId,
            ...(context.bindingRow?.serverBaseUrl
              ? { serverBaseUrl: context.bindingRow.serverBaseUrl }
              : {}),
            ...harnessSelection,
            objective: context.agentPayload.objective,
            instructionsMarkdown: context.agentPayload.instructionsMarkdown,
          })
          .pipe(
            Effect.map((started) => started),
            Effect.catchTags({
              OpenCodeExecutionError: (error) =>
                isUnavailableHarnessSessionError(error.message)
                  ? Effect.succeed(null)
                  : Effect.fail(error),
              HarnessExecutionError: (error) =>
                isUnavailableHarnessSessionError(error.message)
                  ? Effect.succeed(null)
                  : Effect.fail(error),
            }),
          );

        if (!reconnected) {
          yield* bindingRepo.updateBinding({
            stepExecutionId: context.stepExecution.id,
            harnessId,
            bindingState: "errored",
            sessionId,
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

          return yield* new AgentStepStateTransitionError({
            fromState: context.runtimeState,
            toState: "starting_session",
            message: "Agent session was lost. Start or retry the session to continue.",
          });
        }

        yield* persistBoundBinding({
          resolvedSessionId: reconnected.session.sessionId,
          resolvedServerInstanceId: reconnected.serverInstanceId ?? null,
          resolvedServerBaseUrl: reconnected.serverBaseUrl ?? null,
          resolvedAgent: reconnected.session.agent ?? selectedAgent ?? null,
          resolvedModel: reconnected.session.model ?? selectedModel ?? null,
        });

        let resolvedState = context.runtimeState;
        if (context.runtimeState === "active_streaming") {
          resolvedState = "active_streaming";
        } else {
          if (context.runtimeState === "not_started") {
            yield* transitionAgentStepState({
              stepExecutionId: context.stepExecution.id,
              from: "not_started",
              to: "starting_session",
              stateRepo,
            });
            yield* transitionAgentStepState({
              stepExecutionId: context.stepExecution.id,
              from: "starting_session",
              to: "active_idle",
              stateRepo,
            });
          } else if (context.runtimeState === "starting_session") {
            yield* transitionAgentStepState({
              stepExecutionId: context.stepExecution.id,
              from: "starting_session",
              to: "active_idle",
              stateRepo,
            });
          } else if (context.runtimeState === "disconnected_or_error") {
            yield* transitionAgentStepState({
              stepExecutionId: context.stepExecution.id,
              from: "disconnected_or_error",
              to: "active_idle",
              stateRepo,
            });
          }

          resolvedState = "active_idle";
        }

        if (!context.stateRow?.bootstrapAppliedAt) {
          yield* stateRepo.updateState({
            stepExecutionId: context.stepExecution.id,
            bootstrapAppliedAt: new Date(),
          });
        }

        return {
          stepExecutionId: context.stepExecution.id,
          state: resolvedState,
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

    const reconnectAgentStepSession = (input: ReconnectAgentStepSessionInput) =>
      Effect.gen(function* () {
        const context = yield* resolveProjectContext(input.stepExecutionId, input.projectId);
        const project = yield* projectContextRepo.getProjectById({ projectId: input.projectId });
        const projectRootPath = project?.projectRootPath?.trim();
        const sessionId = context.bindingRow?.sessionId;
        const harnessId =
          context.bindingRow?.harnessId ??
          context.agentPayload.harnessSelection.harness ??
          "opencode";

        if (!projectRootPath) {
          return yield* new AgentStepStateTransitionError({
            fromState: context.runtimeState,
            toState: "starting_session",
            message: "Project root path is required to reconnect an existing agent session.",
          });
        }

        if (!sessionId) {
          return yield* new AgentStepStateTransitionError({
            fromState: context.runtimeState,
            toState: "starting_session",
            message:
              "No existing harness session is bound to this step. Start a new session instead.",
          });
        }

        const reconnected = yield* harness
          .reconnectSession({
            stepExecutionId: context.stepExecution.id,
            projectRootPath,
            resumeSessionId: sessionId,
            ...(context.bindingRow?.serverBaseUrl
              ? { serverBaseUrl: context.bindingRow.serverBaseUrl }
              : {}),
            agent:
              context.bindingRow?.selectedAgentKey ?? context.agentPayload.harnessSelection.agent,
            model:
              context.bindingRow?.selectedModelJson ?? context.agentPayload.harnessSelection.model,
            objective: context.agentPayload.objective,
            instructionsMarkdown: context.agentPayload.instructionsMarkdown,
          })
          .pipe(
            Effect.map((started) => started),
            Effect.catchTags({
              OpenCodeExecutionError: (error) =>
                isUnavailableHarnessSessionError(error.message)
                  ? Effect.succeed(null)
                  : Effect.fail(error),
              HarnessExecutionError: (error) =>
                isUnavailableHarnessSessionError(error.message)
                  ? Effect.succeed(null)
                  : Effect.fail(error),
            }),
          );

        if (!reconnected) {
          yield* bindingRepo.updateBinding({
            stepExecutionId: context.stepExecution.id,
            harnessId,
            bindingState: "errored",
            sessionId,
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

          return yield* new AgentStepStateTransitionError({
            fromState: context.runtimeState,
            toState: "starting_session",
            message: "Agent session was lost. Start or retry the session to continue.",
          });
        }

        yield* bindingRepo.updateBinding({
          stepExecutionId: context.stepExecution.id,
          harnessId,
          bindingState: "bound",
          sessionId: reconnected.session.sessionId,
          serverInstanceId: reconnected.serverInstanceId ?? null,
          serverBaseUrl: reconnected.serverBaseUrl ?? null,
          selectedAgentKey:
            reconnected.session.agent ??
            context.bindingRow?.selectedAgentKey ??
            context.agentPayload.harnessSelection.agent ??
            null,
          selectedModelJson:
            reconnected.session.model ??
            context.bindingRow?.selectedModelJson ??
            context.agentPayload.harnessSelection.model ??
            null,
        });

        let nextState = context.runtimeState;
        if (context.runtimeState === "starting_session") {
          yield* transitionAgentStepState({
            stepExecutionId: context.stepExecution.id,
            from: context.runtimeState,
            to: "active_idle",
            stateRepo,
          });
          nextState = "active_idle";
        } else if (context.runtimeState === "disconnected_or_error") {
          yield* transitionAgentStepState({
            stepExecutionId: context.stepExecution.id,
            from: context.runtimeState,
            to: "active_idle",
            stateRepo,
          });
          nextState = "active_idle";
        }

        return {
          stepExecutionId: context.stepExecution.id,
          state: nextState,
          bindingState: "bound",
        } satisfies ReconnectAgentStepSessionOutput;
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
      reconnectAgentStepSession,
      sendAgentStepMessage,
      updateAgentStepTurnSelection,
      completeAgentStepExecution,
    });
  }),
);
