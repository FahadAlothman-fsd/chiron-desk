import type { ReadContextValueInput, ReadContextValueOutput } from "@chiron/contracts/mcp/tools";
import { McpToolValidationError } from "@chiron/contracts/agent-step/errors";
import { LifecycleRepository, MethodologyRepository } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";
import { Context, Effect, Layer } from "effect";

import { RepositoryError } from "../../errors";
import { AgentStepExecutionHarnessBindingRepository } from "../../repositories/agent-step-execution-harness-binding-repository";
import { AgentStepExecutionStateRepository } from "../../repositories/agent-step-execution-state-repository";
import { ExecutionReadRepository } from "../../repositories/execution-read-repository";
import { StepExecutionRepository } from "../../repositories/step-execution-repository";
import { StepContextQueryService } from "../step-context-query-service";
import { ensureAgentStepRuntimeContext, toIso } from "./agent-step-runtime-support";

type AgentStepContextReadServiceError = RepositoryError | McpToolValidationError;

export class AgentStepContextReadService extends Context.Tag(
  "@chiron/workflow-engine/services/runtime/AgentStepContextReadService",
)<
  AgentStepContextReadService,
  {
    readonly readContextValue: (
      input: ReadContextValueInput,
    ) => Effect.Effect<ReadContextValueOutput, AgentStepContextReadServiceError>;
  }
>() {}

export const AgentStepContextReadServiceLive = Layer.effect(
  AgentStepContextReadService,
  Effect.gen(function* () {
    const stepRepo = yield* StepExecutionRepository;
    const readRepo = yield* ExecutionReadRepository;
    const projectContextRepo = yield* ProjectContextRepository;
    const lifecycleRepo = yield* LifecycleRepository;
    const methodologyRepo = yield* MethodologyRepository;
    const stateRepo = yield* AgentStepExecutionStateRepository;
    const bindingRepo = yield* AgentStepExecutionHarnessBindingRepository;
    const contextQuery = yield* StepContextQueryService;

    const readContextValue = (input: ReadContextValueInput) =>
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

        const readableFact = context.readableContextFacts.find(
          (fact) => fact.contextFactDefinitionId === input.contextFactDefinitionId,
        );
        if (!readableFact) {
          return yield* new McpToolValidationError({
            toolName: "read_context_value",
            message: `Context fact '${input.contextFactDefinitionId}' is outside the Agent step read scope.`,
          });
        }

        const values = context.contextFacts
          .filter((fact) => fact.contextFactDefinitionId === input.contextFactDefinitionId)
          .sort((left, right) => left.instanceOrder - right.instanceOrder)
          .map((fact) => ({
            contextFactInstanceId: fact.id,
            valueJson: fact.valueJson,
            recordedAt: toIso(fact.createdAt),
          }));

        return {
          stepExecutionId: context.stepExecution.id,
          contextFactDefinitionId: input.contextFactDefinitionId,
          contextFactKind: readableFact.contextFactKind,
          values,
        } satisfies ReadContextValueOutput;
      });

    return AgentStepContextReadService.of({ readContextValue });
  }),
);
