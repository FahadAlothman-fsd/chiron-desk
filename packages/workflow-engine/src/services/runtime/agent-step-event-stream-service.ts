import type { AgentStepSseEnvelope } from "@chiron/contracts/sse/envelope";
import { HarnessService, type HarnessOperationError } from "@chiron/agent-runtime";
import {
  AgentStepStateTransitionError,
  SingleLiveStreamContractError,
} from "@chiron/contracts/agent-step/errors";
import { LifecycleRepository, MethodologyRepository } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";
import { Context, Effect, Layer, Stream } from "effect";

import { RepositoryError } from "../../errors";
import { AgentStepExecutionHarnessBindingRepository } from "../../repositories/agent-step-execution-harness-binding-repository";
import { AgentStepExecutionStateRepository } from "../../repositories/agent-step-execution-state-repository";
import { ExecutionReadRepository } from "../../repositories/execution-read-repository";
import { StepExecutionRepository } from "../../repositories/step-execution-repository";
import { StepContextQueryService } from "../step-context-query-service";
import {
  ensureAgentStepRuntimeContext,
  transitionAgentStepState,
} from "./agent-step-runtime-support";

type AgentStepEventStreamServiceError =
  | RepositoryError
  | HarnessOperationError
  | AgentStepStateTransitionError
  | SingleLiveStreamContractError;

export class AgentStepEventStreamService extends Context.Tag(
  "@chiron/workflow-engine/services/runtime/AgentStepEventStreamService",
)<
  AgentStepEventStreamService,
  {
    readonly streamSessionEvents: (input: {
      projectId: string;
      stepExecutionId: string;
    }) => Stream.Stream<AgentStepSseEnvelope, AgentStepEventStreamServiceError>;
  }
>() {}

export const AgentStepEventStreamServiceLive = Layer.effect(
  AgentStepEventStreamService,
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
    const activeStreams = new Set<string>();

    const streamSessionEvents = (input: { projectId: string; stepExecutionId: string }) =>
      Stream.unwrap(
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
            input,
          );

          const sessionId = context.bindingRow?.sessionId;
          if (!sessionId) {
            return Stream.empty;
          }

          if (activeStreams.has(context.stepExecution.id)) {
            return yield* new SingleLiveStreamContractError({
              stepExecutionId: context.stepExecution.id,
              message:
                "Only one live Agent-step session event stream may be open per step execution.",
            });
          }

          activeStreams.add(context.stepExecution.id);

          const applyEventState = (event: AgentStepSseEnvelope) =>
            Effect.gen(function* () {
              if (event.eventType === "session_state") {
                const latest = yield* stateRepo.getStateByStepExecutionId(context.stepExecution.id);
                const from = latest?.state ?? context.runtimeState;
                yield* transitionAgentStepState({
                  stepExecutionId: context.stepExecution.id,
                  from,
                  to: event.data.state,
                  stateRepo,
                });
                return;
              }

              if (event.eventType === "error") {
                const latest = yield* stateRepo.getStateByStepExecutionId(context.stepExecution.id);
                const from = latest?.state ?? context.runtimeState;
                yield* transitionAgentStepState({
                  stepExecutionId: context.stepExecution.id,
                  from,
                  to: "disconnected_or_error",
                  stateRepo,
                });
                return;
              }

              if (event.eventType === "done") {
                const latest = yield* stateRepo.getStateByStepExecutionId(context.stepExecution.id);
                const from = latest?.state ?? context.runtimeState;
                yield* transitionAgentStepState({
                  stepExecutionId: context.stepExecution.id,
                  from,
                  to: event.data.finalState,
                  stateRepo,
                });
                return;
              }
            });

          return harness
            .streamSessionEvents(sessionId)
            .pipe(
              Stream.tap(applyEventState),
              Stream.ensuring(
                Effect.sync(() => void activeStreams.delete(context.stepExecution.id)),
              ),
            );
        }),
      );

    return AgentStepEventStreamService.of({ streamSessionEvents });
  }),
);
