import type { AgentStepRuntimeWriteItem } from "@chiron/contracts/agent-step/runtime";
import type { WriteContextValueInput, WriteContextValueOutput } from "@chiron/contracts/mcp/tools";
import {
  AgentStepStateTransitionError,
  McpToolValidationError,
  McpWriteRequirementError,
} from "@chiron/contracts/agent-step/errors";
import { LifecycleRepository, MethodologyRepository } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";
import { Context, Effect, Layer } from "effect";

import { RepositoryError } from "../../errors";
import { AgentStepExecutionHarnessBindingRepository } from "../../repositories/agent-step-execution-harness-binding-repository";
import { AgentStepExecutionStateRepository } from "../../repositories/agent-step-execution-state-repository";
import { ExecutionReadRepository } from "../../repositories/execution-read-repository";
import { StepExecutionRepository } from "../../repositories/step-execution-repository";
import { StepContextQueryService } from "../step-context-query-service";
import { StepExecutionTransactionService } from "../step-execution-transaction-service";
import {
  type AgentStepRuntimeResolvedContext,
  ensureAgentStepRuntimeContext,
  listExposedWriteItemIds,
  listUnsatisfiedRequirementIds,
  toIso,
  valueJsonToCurrentValues,
} from "./agent-step-runtime-support";
import { ArtifactSlotReferenceService } from "./artifact-slot-reference-service";

type AgentStepContextWriteServiceError =
  | RepositoryError
  | AgentStepStateTransitionError
  | McpToolValidationError
  | McpWriteRequirementError;

export interface AgentStepContextWriteResult {
  readonly output: WriteContextValueOutput;
  readonly newlyExposedWriteItems: readonly AgentStepRuntimeWriteItem[];
}

export class AgentStepContextWriteService extends Context.Tag(
  "@chiron/workflow-engine/services/runtime/AgentStepContextWriteService",
)<
  AgentStepContextWriteService,
  {
    readonly writeContextValue: (
      input: WriteContextValueInput,
    ) => Effect.Effect<AgentStepContextWriteResult, AgentStepContextWriteServiceError>;
  }
>() {}

export const AgentStepContextWriteServiceLive = Layer.effect(
  AgentStepContextWriteService,
  Effect.gen(function* () {
    const stepRepo = yield* StepExecutionRepository;
    const readRepo = yield* ExecutionReadRepository;
    const projectContextRepo = yield* ProjectContextRepository;
    const lifecycleRepo = yield* LifecycleRepository;
    const methodologyRepo = yield* MethodologyRepository;
    const stateRepo = yield* AgentStepExecutionStateRepository;
    const bindingRepo = yield* AgentStepExecutionHarnessBindingRepository;
    const contextQuery = yield* StepContextQueryService;
    const tx = yield* StepExecutionTransactionService;
    const artifactSnapshotService = yield* ArtifactSlotReferenceService;

    const resolveHiddenStepExecutionId = (input: unknown) => {
      const stepExecutionId = (input as { stepExecutionId?: unknown }).stepExecutionId;
      return typeof stepExecutionId === "string" ? stepExecutionId : null;
    };

    const writeContextValue = (input: WriteContextValueInput) =>
      Effect.gen(function* () {
        const hiddenStepExecutionId = resolveHiddenStepExecutionId(input);

        if (!hiddenStepExecutionId) {
          return yield* new McpToolValidationError({
            toolName: "write_context_value",
            message: "write_context_value requires an internal step execution scope.",
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

        if (context.runtimeState !== "active_idle" && context.runtimeState !== "active_streaming") {
          return yield* new AgentStepStateTransitionError({
            fromState: context.runtimeState,
            toState: context.runtimeState,
            message: "Context writes are allowed only while the Agent session is active.",
          });
        }

        const writeItem = context.writeItems.find((item) => item.writeItemId === input.writeItemId);
        if (!writeItem) {
          return yield* new McpToolValidationError({
            toolName: "write_context_value",
            message: `Write item '${input.writeItemId}' is not available for this Agent step.`,
          });
        }

        const rawCurrentValues = valueJsonToCurrentValues({
          contextFactDefinitionId: writeItem.contextFactDefinitionId,
          valueJson: input.valueJson,
        });
        if (rawCurrentValues.length === 0) {
          return yield* new McpToolValidationError({
            toolName: "write_context_value",
            message: "write_context_value requires at least one non-empty value.",
          });
        }

        const currentValues = yield* resolveCurrentValues({
          context,
          writeItem,
          rawCurrentValues,
          artifactSnapshotService,
        });

        const beforeExposedIds = new Set(
          listExposedWriteItemIds({
            writeItems: context.writeItems,
            contextFacts: context.contextFacts,
          }),
        );

        const unsatisfiedRequirementIds = listUnsatisfiedRequirementIds({
          writeItem,
          contextFacts: context.contextFacts,
        });
        if (unsatisfiedRequirementIds.length > 0) {
          return yield* new McpWriteRequirementError({
            toolName: "write_context_value",
            writeItemId: writeItem.writeItemId,
            unsatisfiedContextFactDefinitionIds: [...unsatisfiedRequirementIds],
            message: `Write item '${writeItem.writeItemId}' is blocked until all required context facts exist.`,
          });
        }

        const applied = yield* tx.applyAgentStepWrite({
          workflowExecutionId: context.workflowDetail.workflowExecution.id,
          stepExecutionId: context.stepExecution.id,
          writeItemId: writeItem.writeItemId,
          contextFactDefinitionId: writeItem.contextFactDefinitionId,
          contextFactKind: writeItem.contextFactKind,
          currentValues,
        });

        const latestContextFacts = yield* contextQuery.listContextFacts(
          context.workflowDetail.workflowExecution.id,
        );
        const afterExposedIds = new Set(
          listExposedWriteItemIds({
            writeItems: context.writeItems,
            contextFacts: latestContextFacts,
          }),
        );

        const newestAppliedWrite = applied.appliedWrites[0];
        if (!newestAppliedWrite) {
          return yield* new RepositoryError({
            operation: "agent-step-context-write",
            cause: new Error("No applied writes were persisted for the successful agent write."),
          });
        }

        return {
          output: {
            status: "applied",
            writeItemId: writeItem.writeItemId,
            appliedWrite: {
              appliedWriteId: newestAppliedWrite.id,
              contextFactDefinitionId: newestAppliedWrite.contextFactDefinitionId,
              appliedAt: toIso(newestAppliedWrite.createdAt)!,
              valueJson: newestAppliedWrite.appliedValueJson,
            },
          } satisfies WriteContextValueOutput,
          newlyExposedWriteItems: context.writeItems.filter(
            (candidate) =>
              afterExposedIds.has(candidate.writeItemId) &&
              !beforeExposedIds.has(candidate.writeItemId),
          ),
        } satisfies AgentStepContextWriteResult;
      });

    return AgentStepContextWriteService.of({ writeContextValue });
  }),
);

function resolveCurrentValues(params: {
  context: AgentStepRuntimeResolvedContext;
  writeItem: AgentStepRuntimeWriteItem;
  rawCurrentValues: readonly {
    contextFactDefinitionId: string;
    instanceOrder: number;
    valueJson: unknown;
  }[];
  artifactSnapshotService: ArtifactSlotReferenceService["Type"];
}) {
  return params.writeItem.contextFactKind === "artifact_slot_reference_fact"
    ? resolveArtifactReferenceValues(params)
    : Effect.succeed(params.rawCurrentValues);
}

function resolveArtifactReferenceValues(params: {
  context: AgentStepRuntimeResolvedContext;
  writeItem: AgentStepRuntimeWriteItem;
  rawCurrentValues: readonly {
    contextFactDefinitionId: string;
    instanceOrder: number;
    valueJson: unknown;
  }[];
  artifactSnapshotService: ArtifactSlotReferenceService["Type"];
}) {
  return Effect.gen(function* () {
    if (!params.context.projectRootPath) {
      return yield* new McpToolValidationError({
        toolName: "write_context_value",
        message: "Artifact references require a project root path before they can be recorded.",
      });
    }

    const slotDefinitionId = params.context.contextFactById.get(
      params.writeItem.contextFactDefinitionId,
    );
    if (!slotDefinitionId || slotDefinitionId.kind !== "artifact_slot_reference_fact") {
      return yield* new McpToolValidationError({
        toolName: "write_context_value",
        message:
          "Artifact slot reference writes require an artifact_slot_reference_fact definition.",
      });
    }

    return yield* params.artifactSnapshotService
      .normalizeWriteValues({
        methodologyVersionId: params.context.projectPin.methodologyVersionId,
        workUnitTypeKey: params.context.workUnitType.key,
        contextFactDefinitionId: params.writeItem.contextFactDefinitionId,
        slotDefinitionId: slotDefinitionId.slotDefinitionId,
        projectRootPath: params.context.projectRootPath,
        workflowContextFacts: params.context.workflowEditor.contextFacts,
        contextFacts: params.context.contextFacts,
        rawCurrentValues: params.rawCurrentValues,
      })
      .pipe(
        Effect.mapError(
          (error) =>
            new McpToolValidationError({
              toolName: "write_context_value",
              message: error.message,
            }),
        ),
      );
  });
}
