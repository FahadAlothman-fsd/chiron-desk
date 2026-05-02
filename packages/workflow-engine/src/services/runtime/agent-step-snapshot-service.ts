import type { ReadStepSnapshotInput, ReadStepSnapshotOutput } from "@chiron/contracts/mcp/tools";
import { LifecycleRepository, MethodologyRepository } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";
import { Context, Effect, Layer } from "effect";

import { RepositoryError } from "../../errors";
import { AgentStepExecutionHarnessBindingRepository } from "../../repositories/agent-step-execution-harness-binding-repository";
import { AgentStepExecutionStateRepository } from "../../repositories/agent-step-execution-state-repository";
import { ExecutionReadRepository } from "../../repositories/execution-read-repository";
import { StepExecutionRepository } from "../../repositories/step-execution-repository";
import { StepContextQueryService } from "../step-context-query-service";
import { ensureAgentStepRuntimeContext } from "./agent-step-runtime-support";

export class AgentStepSnapshotService extends Context.Tag(
  "@chiron/workflow-engine/services/runtime/AgentStepSnapshotService",
)<
  AgentStepSnapshotService,
  {
    readonly readStepSnapshot: (
      input: ReadStepSnapshotInput,
    ) => Effect.Effect<ReadStepSnapshotOutput, RepositoryError>;
  }
>() {}

export const AgentStepSnapshotServiceLive = Layer.effect(
  AgentStepSnapshotService,
  Effect.gen(function* () {
    const stepRepo = yield* StepExecutionRepository;
    const readRepo = yield* ExecutionReadRepository;
    const projectContextRepo = yield* ProjectContextRepository;
    const lifecycleRepo = yield* LifecycleRepository;
    const methodologyRepo = yield* MethodologyRepository;
    const stateRepo = yield* AgentStepExecutionStateRepository;
    const bindingRepo = yield* AgentStepExecutionHarnessBindingRepository;
    const contextQuery = yield* StepContextQueryService;

    const readStepSnapshot = (input: ReadStepSnapshotInput) =>
      Effect.gen(function* () {
        const hiddenStepExecutionId =
          typeof (input as unknown as { stepExecutionId?: unknown }).stepExecutionId === "string"
            ? (input as unknown as { stepExecutionId: string }).stepExecutionId
            : null;

        if (!hiddenStepExecutionId) {
          return yield* new RepositoryError({
            operation: "agent-step-snapshot.read",
            cause: new Error("read_step_snapshot requires a step execution scope."),
          });
        }

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
          { stepExecutionId: hiddenStepExecutionId },
        );

        return {
          readItemId: input.readItemId,
          stepExecutionId: context.stepExecution.id,
          workflowExecutionId: context.workflowDetail.workflowExecution.id,
          state: context.runtimeState,
          ...(context.projectName ? { projectName: context.projectName } : {}),
          objective: context.agentPayload.objective,
          instructionsMarkdown: context.agentPayload.instructionsMarkdown,
          contractVersion: "v1",
        } satisfies ReadStepSnapshotOutput;
      });

    return AgentStepSnapshotService.of({ readStepSnapshot });
  }),
);
