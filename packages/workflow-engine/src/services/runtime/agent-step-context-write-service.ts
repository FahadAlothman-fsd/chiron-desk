import type { AgentStepRuntimeWriteItem } from "@chiron/contracts/agent-step/runtime";
import type { WriteContextValueInput, WriteContextValueOutput } from "@chiron/contracts/mcp/tools";
import {
  AgentStepStateTransitionError,
  McpToolValidationError,
  McpWriteRequirementError,
} from "@chiron/contracts/agent-step/errors";
import { LifecycleRepository, MethodologyRepository } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";
import { SandboxGitService, type SandboxGitFileResolution } from "@chiron/sandbox-engine";
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
    const sandboxGit = yield* SandboxGitService;

    const writeContextValue = (input: WriteContextValueInput) =>
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
          sandboxGit,
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
          return yield* Effect.fail(
            new RepositoryError({
              operation: "agent-step-context-write",
              cause: new Error("No applied writes were persisted for the successful agent write."),
            }),
          );
        }

        return {
          output: {
            status: "applied",
            stepExecutionId: context.stepExecution.id,
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
  sandboxGit: SandboxGitService["Type"];
}) {
  return params.writeItem.contextFactKind === "artifact_reference_fact"
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
  sandboxGit: SandboxGitService["Type"];
}) {
  return Effect.gen(function* () {
    if (!params.context.projectRootPath) {
      return yield* new McpToolValidationError({
        toolName: "write_context_value",
        message: "Artifact references require a project root path before they can be recorded.",
      });
    }

    const existingByOrder = new Map(
      params.context.contextFacts
        .filter((fact) => fact.contextFactDefinitionId === params.writeItem.contextFactDefinitionId)
        .map((fact) => [fact.instanceOrder, fact.valueJson] as const),
    );

    return yield* Effect.forEach(params.rawCurrentValues, (value) =>
      Effect.gen(function* () {
        const relativePath = yield* extractRelativePath(value.valueJson);
        const resolution = yield* params.sandboxGit.resolveArtifactReference({
          rootPath: params.context.projectRootPath!,
          filePath: relativePath,
        });

        const existing = parseRecordedArtifactReference(existingByOrder.get(value.instanceOrder));
        if (existing) {
          const comparison = yield* params.sandboxGit.compareRecordedArtifactReference({
            recorded: existing,
            current: resolution,
          });

          if (comparison.status === "deleted") {
            return {
              contextFactDefinitionId: value.contextFactDefinitionId,
              instanceOrder: value.instanceOrder,
              valueJson: {
                relativePath: comparison.relativePath,
                gitCommitHash: comparison.gitCommitHash,
                gitBlobHash: comparison.gitBlobHash,
                gitCommitSubject: comparison.gitCommitSubject,
                gitCommitBody: comparison.gitCommitBody,
                deleted: true,
              },
            };
          }
        }

        yield* validateArtifactResolution({
          resolution,
          relativePath,
        });

        if (resolution.status !== "committed") {
          return yield* new McpToolValidationError({
            toolName: "write_context_value",
            message: `Artifact '${relativePath}' could not be resolved to a committed file.`,
          });
        }

        return {
          contextFactDefinitionId: value.contextFactDefinitionId,
          instanceOrder: value.instanceOrder,
          valueJson: {
            relativePath: resolution.relativePath,
            gitCommitHash: resolution.gitCommitHash,
            gitBlobHash: resolution.gitBlobHash,
            gitCommitSubject: resolution.gitCommitSubject,
            gitCommitBody: resolution.gitCommitBody,
          },
        };
      }).pipe(
        Effect.catchTag(
          "SandboxGitInvalidPathError",
          (error) =>
            new McpToolValidationError({
              toolName: "write_context_value",
              message: error.message,
            }),
        ),
      ),
    );
  });
}

function extractRelativePath(valueJson: unknown) {
  return Effect.gen(function* () {
    if (
      !valueJson ||
      typeof valueJson !== "object" ||
      !("relativePath" in valueJson) ||
      typeof valueJson.relativePath !== "string" ||
      valueJson.relativePath.trim().length === 0
    ) {
      return yield* new McpToolValidationError({
        toolName: "write_context_value",
        message:
          "Artifact reference writes require valueJson to contain a non-empty relativePath string.",
      });
    }

    return valueJson.relativePath;
  });
}

function validateArtifactResolution(params: {
  resolution: SandboxGitFileResolution;
  relativePath: string;
}) {
  switch (params.resolution.status) {
    case "git_not_installed":
      return new McpToolValidationError({
        toolName: "write_context_value",
        message:
          "Git is not installed or is not available on PATH. Initialize the project repository before writing artifact references.",
      });
    case "not_a_repo":
      return new McpToolValidationError({
        toolName: "write_context_value",
        message:
          "Project root directory is not a git repository. Initialize git in the project root before writing artifact references.",
      });
    case "missing":
      return new McpToolValidationError({
        toolName: "write_context_value",
        message: `Artifact path '${params.relativePath}' does not exist in the project repository.`,
      });
    case "not_committed":
      return new McpToolValidationError({
        toolName: "write_context_value",
        message: `Artifact path '${params.relativePath}' is not committed yet. Commit the file before writing the artifact reference.`,
      });
    case "committed":
      return Effect.void;
  }
}

function parseRecordedArtifactReference(valueJson: unknown): {
  relativePath: string;
  gitCommitHash?: string | null;
  gitBlobHash?: string | null;
  gitCommitSubject?: string | null;
  gitCommitBody?: string | null;
} | null {
  if (!valueJson || typeof valueJson !== "object") {
    return null;
  }

  if (!("relativePath" in valueJson) || typeof valueJson.relativePath !== "string") {
    return null;
  }

  return {
    relativePath: valueJson.relativePath,
    gitCommitHash:
      "gitCommitHash" in valueJson &&
      (typeof valueJson.gitCommitHash === "string" || valueJson.gitCommitHash === null)
        ? valueJson.gitCommitHash
        : undefined,
    gitBlobHash:
      "gitBlobHash" in valueJson &&
      (typeof valueJson.gitBlobHash === "string" || valueJson.gitBlobHash === null)
        ? valueJson.gitBlobHash
        : undefined,
    gitCommitSubject:
      "gitCommitSubject" in valueJson &&
      (typeof valueJson.gitCommitSubject === "string" || valueJson.gitCommitSubject === null)
        ? valueJson.gitCommitSubject
        : undefined,
    gitCommitBody:
      "gitCommitBody" in valueJson &&
      (typeof valueJson.gitCommitBody === "string" || valueJson.gitCommitBody === null)
        ? valueJson.gitCommitBody
        : undefined,
  };
}
