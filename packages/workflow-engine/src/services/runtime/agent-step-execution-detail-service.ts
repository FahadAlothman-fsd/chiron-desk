import type {
  GetAgentStepExecutionDetailInput,
  GetAgentStepExecutionDetailOutput,
} from "@chiron/contracts/agent-step/runtime";
import type { HarnessOperationError } from "@chiron/agent-runtime";
import { LifecycleRepository, MethodologyRepository } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";
import { Context, Effect, Layer } from "effect";

import { RepositoryError } from "../../errors";
import { AgentStepExecutionHarnessBindingRepository } from "../../repositories/agent-step-execution-harness-binding-repository";
import { AgentStepExecutionStateRepository } from "../../repositories/agent-step-execution-state-repository";
import { ExecutionReadRepository } from "../../repositories/execution-read-repository";
import { StepExecutionRepository } from "../../repositories/step-execution-repository";
import { StepContextQueryService } from "../step-context-query-service";
import { StepExecutionDetailService } from "../step-execution-detail-service";
import {
  AGENT_STEP_CONTRACT_BOUNDARY,
  buildComposerState,
  ensureAgentStepRuntimeContext,
  normalizeHarnessBinding,
} from "./agent-step-runtime-support";
import { AgentStepTimelineService } from "./agent-step-timeline-service";

export class AgentStepExecutionDetailService extends Context.Tag(
  "@chiron/workflow-engine/services/runtime/AgentStepExecutionDetailService",
)<
  AgentStepExecutionDetailService,
  {
    readonly getAgentStepExecutionDetail: (
      input: GetAgentStepExecutionDetailInput,
    ) => Effect.Effect<
      GetAgentStepExecutionDetailOutput | null,
      RepositoryError | HarnessOperationError
    >;
  }
>() {}

export const AgentStepExecutionDetailServiceLive = Layer.effect(
  AgentStepExecutionDetailService,
  Effect.gen(function* () {
    const sharedDetail = yield* StepExecutionDetailService;
    const timeline = yield* AgentStepTimelineService;
    const stepRepo = yield* StepExecutionRepository;
    const readRepo = yield* ExecutionReadRepository;
    const projectContextRepo = yield* ProjectContextRepository;
    const lifecycleRepo = yield* LifecycleRepository;
    const methodologyRepo = yield* MethodologyRepository;
    const stateRepo = yield* AgentStepExecutionStateRepository;
    const bindingRepo = yield* AgentStepExecutionHarnessBindingRepository;
    const contextQuery = yield* StepContextQueryService;

    const getAgentStepExecutionDetail = (input: GetAgentStepExecutionDetailInput) =>
      Effect.gen(function* () {
        const shell = yield* sharedDetail.getRuntimeStepExecutionDetail({
          projectId: input.projectId,
          stepExecutionId: input.stepExecutionId,
        });

        if (!shell || shell.shell.stepType !== "agent") {
          return null;
        }

        const _context = yield* ensureAgentStepRuntimeContext(
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

        const timelinePreview = yield* timeline.getTimelinePage({
          projectId: input.projectId,
          stepExecutionId: input.stepExecutionId,
          limit: 20,
        });

        const refreshedContext = yield* ensureAgentStepRuntimeContext(
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

        const writeSetCompletion = {
          total: refreshedContext.writeItems.length,
          applied: refreshedContext.writeItems.filter((item) => {
            const fact = refreshedContext.contextFacts.find(
              (f) => f.contextFactDefinitionId === item.contextFactDefinitionId,
            );
            return (fact?.instances.length ?? 0) > 0;
          }).length,
          ready: 0,
          blocked: 0,
          isComplete: false,
        };

        writeSetCompletion.blocked = refreshedContext.writeItems.filter((item) => {
          const requirementsSatisfied = item.requirementContextFactDefinitionIds.every((reqId) => {
            const reqFact = refreshedContext.contextFacts.find(
              (f) => f.contextFactDefinitionId === reqId,
            );
            return (reqFact?.instances.length ?? 0) > 0;
          });
          return !requirementsSatisfied;
        }).length;

        writeSetCompletion.ready = refreshedContext.writeItems.filter((item) => {
          const requirementsSatisfied = item.requirementContextFactDefinitionIds.every((reqId) => {
            const reqFact = refreshedContext.contextFacts.find(
              (f) => f.contextFactDefinitionId === reqId,
            );
            return (reqFact?.instances.length ?? 0) > 0;
          });
          const fact = refreshedContext.contextFacts.find(
            (f) => f.contextFactDefinitionId === item.contextFactDefinitionId,
          );
          return requirementsSatisfied && (fact?.instances.length ?? 0) === 0;
        }).length;

        writeSetCompletion.isComplete =
          writeSetCompletion.total > 0 && writeSetCompletion.applied === writeSetCompletion.total;

        return {
          stepExecutionId: refreshedContext.stepExecution.id,
          workflowExecutionId: refreshedContext.workflowDetail.workflowExecution.id,
          body: {
            stepType: "agent",
            state: refreshedContext.runtimeState,
            contractBoundary: AGENT_STEP_CONTRACT_BOUNDARY,
            sessionStartPolicy: "explicit",
            harnessBinding: normalizeHarnessBinding({
              payload: refreshedContext.agentPayload,
              bindingRow: refreshedContext.bindingRow,
            }),
            composer: buildComposerState({
              state: refreshedContext.runtimeState,
              sessionId: refreshedContext.bindingRow?.sessionId ?? undefined,
            }),
            projectRootPath: refreshedContext.projectRootPath,
            objective: refreshedContext.agentPayload.objective,
            instructionsMarkdown: refreshedContext.agentPayload.instructionsMarkdown,
            readableContextFacts: refreshedContext.readableContextFacts,
            writeItems: refreshedContext.writeItems,
            writeSetCompletion,
            timelinePreview: timelinePreview.items,
          },
        } satisfies GetAgentStepExecutionDetailOutput;
      });

    return AgentStepExecutionDetailService.of({ getAgentStepExecutionDetail });
  }),
);
