import { Context, Effect, Layer } from "effect";

import { RepositoryError } from "../errors";
import { ExecutionReadRepository } from "../repositories/execution-read-repository";
import { ProjectFactRepository } from "../repositories/project-fact-repository";
import { StepExecutionRepository } from "../repositories/step-execution-repository";
import { StepContextQueryService } from "./step-context-query-service";

export interface GetRuntimeStepExecutionDetailInput {
  projectId: string;
  stepExecutionId: string;
}

export interface GetRuntimeStepExecutionDetailOutput {
  stepExecution: {
    stepExecutionId: string;
    workflowExecutionId: string;
    stepDefinitionId: string;
    stepType: string;
    status: "active" | "completed";
    activatedAt: string;
    completedAt?: string;
  };
  tabs: {
    submissionAndProgression: {
      draftValues: unknown;
      submittedSnapshot: unknown;
      submittedAt?: string;
      progression: unknown;
      nextStepExecutionId?: string;
    };
    writes: {
      workflowContextWrites: Array<{
        contextFactId: string;
        factKey: string;
        factKind: string;
        value: unknown;
      }>;
      authoritativeProjectFactWrites: Array<{
        projectFactInstanceId: string;
        factDefinitionId: string;
        value: unknown;
      }>;
    };
    contextFactSemantics: {
      notes: string[];
      mappings: Array<{
        factKey: string;
        semantics: string;
      }>;
    };
  };
}

const makeDetailError = (cause: string): RepositoryError =>
  new RepositoryError({
    operation: "step-execution-detail",
    cause: new Error(cause),
  });

const toIso = (value: Date | null): string | undefined => (value ? value.toISOString() : undefined);

export class StepExecutionDetailService extends Context.Tag(
  "@chiron/workflow-engine/services/StepExecutionDetailService",
)<
  StepExecutionDetailService,
  {
    readonly getRuntimeStepExecutionDetail: (
      input: GetRuntimeStepExecutionDetailInput,
    ) => Effect.Effect<GetRuntimeStepExecutionDetailOutput | null, RepositoryError>;
  }
>() {}

export const StepExecutionDetailServiceLive = Layer.effect(
  StepExecutionDetailService,
  Effect.gen(function* () {
    const stepRepo = yield* StepExecutionRepository;
    const readRepo = yield* ExecutionReadRepository;
    const projectFactRepo = yield* ProjectFactRepository;
    const contextQuery = yield* StepContextQueryService;

    const getRuntimeStepExecutionDetail = (input: GetRuntimeStepExecutionDetailInput) =>
      Effect.gen(function* () {
        const stepExecution = yield* stepRepo.getStepExecutionById(input.stepExecutionId);
        if (!stepExecution) {
          return null;
        }

        const workflowDetail = yield* readRepo.getWorkflowExecutionDetail(
          stepExecution.workflowExecutionId,
        );
        if (!workflowDetail || workflowDetail.projectId !== input.projectId) {
          return null;
        }

        const formState = yield* stepRepo.getFormStepExecutionState(stepExecution.id);
        const allContextFacts = yield* contextQuery.listContextFacts(
          stepExecution.workflowExecutionId,
        );

        const workflowContextWrites = allContextFacts
          .filter((fact) => fact.sourceStepExecutionId === stepExecution.id)
          .map((fact) => ({
            contextFactId: fact.id,
            factKey: fact.factKey,
            factKind: fact.factKind,
            value: fact.valueJson,
          }));

        const stepExecutions = yield* stepRepo.listStepExecutionsForWorkflow(
          stepExecution.workflowExecutionId,
        );
        const nextStep = stepExecutions.find((candidate) => {
          if (candidate.id === stepExecution.id) {
            return false;
          }
          if (!candidate.progressionData || typeof candidate.progressionData !== "object") {
            return false;
          }
          const linkedFrom = (candidate.progressionData as Record<string, unknown>)
            .activatedFromStepExecutionId;
          return linkedFrom === stepExecution.id;
        });

        const submittedSnapshotAsRecord =
          formState?.submittedSnapshotJson &&
          typeof formState.submittedSnapshotJson === "object" &&
          !Array.isArray(formState.submittedSnapshotJson)
            ? (formState.submittedSnapshotJson as Record<string, unknown>)
            : null;

        const mappedAuthoritativeFactDefinitionIds = new Set(
          Object.keys(submittedSnapshotAsRecord ?? {})
            .filter((key) => key.startsWith("project."))
            .map((key) => key.slice("project.".length))
            .filter((key) => key.length > 0),
        );

        const projectFacts = yield* projectFactRepo.listFactsByProject({
          projectId: workflowDetail.projectId,
        });

        const authoritativeProjectFactWrites = projectFacts
          .filter(
            (fact) =>
              fact.producedByWorkflowExecutionId === stepExecution.workflowExecutionId &&
              mappedAuthoritativeFactDefinitionIds.has(fact.factDefinitionId),
          )
          .map((fact) => ({
            projectFactInstanceId: fact.id,
            factDefinitionId: fact.factDefinitionId,
            value: fact.valueJson,
          }));

        const mappings = workflowContextWrites.map((write) => ({
          factKey: write.factKey,
          semantics:
            write.factKind === "plain_value"
              ? "Captured as workflow-local context for downstream steps."
              : `Captured as '${write.factKind}' workflow context output.`,
        }));

        return {
          stepExecution: {
            stepExecutionId: stepExecution.id,
            workflowExecutionId: stepExecution.workflowExecutionId,
            stepDefinitionId: stepExecution.stepDefinitionId,
            stepType: stepExecution.stepType,
            status: stepExecution.status,
            activatedAt: stepExecution.activatedAt.toISOString(),
            completedAt: toIso(stepExecution.completedAt),
          },
          tabs: {
            submissionAndProgression: {
              draftValues: formState?.draftValuesJson ?? null,
              submittedSnapshot: formState?.submittedSnapshotJson ?? null,
              submittedAt: toIso(formState?.submittedAt ?? null),
              progression: stepExecution.progressionData,
              nextStepExecutionId: nextStep?.id,
            },
            writes: {
              workflowContextWrites,
              authoritativeProjectFactWrites,
            },
            contextFactSemantics: {
              notes: [
                "Submission snapshot is immutable once submitted.",
                "Progression records lifecycle outcomes and next-step activation lineage.",
                "Workflow context writes stay within workflow execution context.",
                "Authoritative writes are propagated into project fact instances when mapped via 'project.<factDefinitionId>' keys.",
              ],
              mappings,
            },
          },
        } satisfies GetRuntimeStepExecutionDetailOutput;
      }).pipe(
        Effect.catchTag("RepositoryError", (error) => Effect.fail(error)),
        Effect.catchAll(() => makeDetailError("failed to build runtime step execution detail")),
      );

    return StepExecutionDetailService.of({
      getRuntimeStepExecutionDetail,
    });
  }),
);
