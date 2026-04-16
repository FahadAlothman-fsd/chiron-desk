import type { WorkflowContextFactDto } from "@chiron/contracts/methodology/workflow";
import { LifecycleRepository, MethodologyRepository } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";
import { Context, Effect, Layer } from "effect";

import { RepositoryError } from "../errors";
import { ExecutionReadRepository } from "../repositories/execution-read-repository";
import { InvokeExecutionRepository } from "../repositories/invoke-execution-repository";
import {
  StepExecutionRepository,
  type ReplaceRuntimeWorkflowExecutionContextFactValue,
} from "../repositories/step-execution-repository";
import { StepContextMutationService } from "./step-context-mutation-service";

export interface PropagateInvokeCompletionOutputsParams {
  projectId: string;
  workflowExecutionId: string;
  stepExecutionId: string;
}

export interface PropagateInvokeCompletionOutputsResult {
  affectedContextFactDefinitionIds: readonly string[];
  propagatedValueCount: number;
}

const makePropagationError = (cause: string): RepositoryError =>
  new RepositoryError({
    operation: "invoke-propagation",
    cause: new Error(cause),
  });

const toResolutionOrder = (value: number | null): number => value ?? Number.MAX_SAFE_INTEGER;

const restrictToCardinality = <T>(
  values: readonly T[],
  cardinality: WorkflowContextFactDto["cardinality"],
): readonly T[] => (cardinality === "one" ? values.slice(0, 1) : values);

const buildWorkflowReferenceValues = (params: {
  contextFact: Extract<WorkflowContextFactDto, { kind: "workflow_reference_fact" }>;
  invokeTargets: ReadonlyArray<{
    workflowDefinitionId: string;
    workflowExecutionId: string;
    resolutionOrder: number | null;
  }>;
}): readonly ReplaceRuntimeWorkflowExecutionContextFactValue[] => {
  const filteredTargets = params.invokeTargets.filter((target) =>
    params.contextFact.allowedWorkflowDefinitionIds.length > 0
      ? params.contextFact.allowedWorkflowDefinitionIds.includes(target.workflowDefinitionId)
      : true,
  );

  return restrictToCardinality(
    filteredTargets
      .toSorted(
        (left, right) =>
          toResolutionOrder(left.resolutionOrder) - toResolutionOrder(right.resolutionOrder),
      )
      .map((target, instanceOrder) => ({
        contextFactDefinitionId:
          params.contextFact.contextFactDefinitionId ?? params.contextFact.key,
        instanceOrder,
        valueJson: {
          workflowDefinitionId: target.workflowDefinitionId,
          workflowExecutionId: target.workflowExecutionId,
        },
      })),
    params.contextFact.cardinality,
  );
};

const buildWorkUnitDraftSpecValues = (params: {
  contextFact: Extract<WorkflowContextFactDto, { kind: "work_unit_draft_spec_fact" }>;
  invokeTargets: ReadonlyArray<{
    projectWorkUnitId: string;
    workUnitDefinitionId: string;
    resolutionOrder: number | null;
    workUnitFactInstanceIds: ReadonlyArray<{
      factDefinitionId: string;
      workUnitFactInstanceId: string;
    }>;
    artifactSnapshotIds: ReadonlyArray<{
      artifactSlotDefinitionId: string;
      artifactSnapshotId: string;
    }>;
  }>;
}): readonly ReplaceRuntimeWorkflowExecutionContextFactValue[] => {
  const filteredTargets = params.invokeTargets.filter(
    (target) => target.workUnitDefinitionId === params.contextFact.workUnitDefinitionId,
  );

  return restrictToCardinality(
    filteredTargets
      .toSorted(
        (left, right) =>
          toResolutionOrder(left.resolutionOrder) - toResolutionOrder(right.resolutionOrder),
      )
      .map((target, instanceOrder) => ({
        contextFactDefinitionId:
          params.contextFact.contextFactDefinitionId ?? params.contextFact.key,
        instanceOrder,
        valueJson: {
          projectWorkUnitId: target.projectWorkUnitId,
          workUnitFactInstanceIds: target.workUnitFactInstanceIds
            .filter((fact) =>
              params.contextFact.selectedWorkUnitFactDefinitionIds.length > 0
                ? params.contextFact.selectedWorkUnitFactDefinitionIds.includes(
                    fact.factDefinitionId,
                  )
                : true,
            )
            .map((fact) => fact.workUnitFactInstanceId),
          artifactSnapshotIds: target.artifactSnapshotIds
            .filter((artifact) =>
              params.contextFact.selectedArtifactSlotDefinitionIds.length > 0
                ? params.contextFact.selectedArtifactSlotDefinitionIds.includes(
                    artifact.artifactSlotDefinitionId,
                  )
                : true,
            )
            .map((artifact) => artifact.artifactSnapshotId),
        },
      })),
    params.contextFact.cardinality,
  );
};

export class InvokePropagationService extends Context.Tag(
  "@chiron/workflow-engine/services/InvokePropagationService",
)<
  InvokePropagationService,
  {
    readonly propagateInvokeCompletionOutputs: (
      params: PropagateInvokeCompletionOutputsParams,
    ) => Effect.Effect<PropagateInvokeCompletionOutputsResult, RepositoryError>;
  }
>() {}

export const InvokePropagationServiceLive = Layer.effect(
  InvokePropagationService,
  Effect.gen(function* () {
    const projectContextRepo = yield* ProjectContextRepository;
    const lifecycleRepo = yield* LifecycleRepository;
    const methodologyRepo = yield* MethodologyRepository;
    const executionReadRepo = yield* ExecutionReadRepository;
    const invokeRepo = yield* InvokeExecutionRepository;
    const stepRepo = yield* StepExecutionRepository;
    const contextMutation = yield* StepContextMutationService;

    const propagateInvokeCompletionOutputs = ({
      projectId,
      workflowExecutionId,
      stepExecutionId,
    }: PropagateInvokeCompletionOutputsParams) =>
      Effect.gen(function* () {
        const [stepExecution, workflowDetail, projectPin] = yield* Effect.all([
          stepRepo.getStepExecutionById(stepExecutionId),
          executionReadRepo.getWorkflowExecutionDetail(workflowExecutionId),
          projectContextRepo.findProjectPin(projectId),
        ]);

        if (!stepExecution || stepExecution.workflowExecutionId !== workflowExecutionId) {
          return yield* makePropagationError(
            "step execution does not belong to workflow execution",
          );
        }

        if (!workflowDetail || workflowDetail.projectId !== projectId) {
          return yield* makePropagationError("workflow execution does not belong to project");
        }

        if (!projectPin) {
          return yield* makePropagationError("project methodology pin missing");
        }

        const workUnitTypes = yield* lifecycleRepo.findWorkUnitTypes(
          projectPin.methodologyVersionId,
        );
        const workUnitType = workUnitTypes.find(
          (candidate) => candidate.id === workflowDetail.workUnitTypeId,
        );
        if (!workUnitType) {
          return yield* makePropagationError("work unit type missing for invoke propagation");
        }

        const [workflowEditor, invokeDefinition, invokeState] = yield* Effect.all([
          methodologyRepo.getWorkflowEditorDefinition({
            versionId: projectPin.methodologyVersionId,
            workUnitTypeKey: workUnitType.key,
            workflowDefinitionId: workflowDetail.workflowExecution.workflowId,
          }),
          methodologyRepo.getInvokeStepDefinition({
            versionId: projectPin.methodologyVersionId,
            workflowDefinitionId: workflowDetail.workflowExecution.workflowId,
            stepId: stepExecution.stepDefinitionId,
          }),
          invokeRepo.getInvokeStepExecutionStateByStepExecutionId(stepExecutionId),
        ]);

        if (!invokeDefinition) {
          return yield* makePropagationError("invoke step definition missing for step execution");
        }

        const invokePayload =
          typeof invokeDefinition === "object" && invokeDefinition !== null
            ? (invokeDefinition as { payload?: unknown }).payload
            : null;
        const invokeTargetKind =
          invokePayload && typeof invokePayload === "object"
            ? (invokePayload as { targetKind?: unknown }).targetKind
            : null;
        if (invokeTargetKind !== "workflow" && invokeTargetKind !== "work_unit") {
          return yield* makePropagationError("invoke step payload missing for step execution");
        }

        if (!invokeState) {
          return yield* makePropagationError("invoke step execution state not found");
        }

        if (invokeTargetKind === "workflow") {
          const workflowTargets = yield* invokeRepo.listInvokeWorkflowTargetExecutions(
            invokeState.id,
          );
          const startedTargets = workflowTargets.flatMap((target) =>
            target.workflowExecutionId
              ? [
                  {
                    workflowDefinitionId: target.workflowDefinitionId,
                    workflowExecutionId: target.workflowExecutionId,
                    resolutionOrder: target.resolutionOrder,
                  },
                ]
              : [],
          );
          const outputFacts = workflowEditor.contextFacts.filter(
            (fact): fact is Extract<WorkflowContextFactDto, { kind: "workflow_reference_fact" }> =>
              fact.kind === "workflow_reference_fact",
          );
          const affectedContextFactDefinitionIds = outputFacts.map(
            (fact) => fact.contextFactDefinitionId ?? fact.key,
          );
          const currentValues = outputFacts.flatMap((fact) =>
            buildWorkflowReferenceValues({
              contextFact: fact,
              invokeTargets: startedTargets,
            }),
          );

          if (affectedContextFactDefinitionIds.length > 0) {
            yield* contextMutation.replaceContextFacts({
              workflowExecutionId,
              sourceStepExecutionId: stepExecutionId,
              affectedContextFactDefinitionIds,
              currentValues,
            });
          }

          return {
            affectedContextFactDefinitionIds,
            propagatedValueCount: currentValues.length,
          } satisfies PropagateInvokeCompletionOutputsResult;
        }

        const workUnitTargets = yield* invokeRepo.listInvokeWorkUnitTargetExecutions(
          invokeState.id,
        );
        const targetedWorkUnitDefinitionIds = new Set(
          workUnitTargets.map((target) => target.workUnitDefinitionId),
        );
        const startedTargets = yield* Effect.forEach(
          workUnitTargets.filter((target) => target.projectWorkUnitId !== null),
          (target) =>
            Effect.gen(function* () {
              const [factMappings, artifactMappings] = yield* Effect.all([
                invokeRepo.listInvokeWorkUnitCreatedFactInstances(target.id),
                invokeRepo.listInvokeWorkUnitCreatedArtifactSnapshots(target.id),
              ]);

              return {
                projectWorkUnitId: target.projectWorkUnitId!,
                workUnitDefinitionId: target.workUnitDefinitionId,
                resolutionOrder: target.resolutionOrder,
                workUnitFactInstanceIds: factMappings.map((mapping) => ({
                  factDefinitionId: mapping.factDefinitionId,
                  workUnitFactInstanceId: mapping.workUnitFactInstanceId,
                })),
                artifactSnapshotIds: artifactMappings.map((mapping) => ({
                  artifactSlotDefinitionId: mapping.artifactSlotDefinitionId,
                  artifactSnapshotId: mapping.artifactSnapshotId,
                })),
              };
            }),
        );
        const outputFacts = workflowEditor.contextFacts.filter(
          (fact): fact is Extract<WorkflowContextFactDto, { kind: "work_unit_draft_spec_fact" }> =>
            fact.kind === "work_unit_draft_spec_fact" &&
            targetedWorkUnitDefinitionIds.has(fact.workUnitDefinitionId),
        );
        const affectedContextFactDefinitionIds = outputFacts.map(
          (fact) => fact.contextFactDefinitionId ?? fact.key,
        );
        const currentValues = outputFacts.flatMap((fact) =>
          buildWorkUnitDraftSpecValues({
            contextFact: fact,
            invokeTargets: startedTargets,
          }),
        );

        if (affectedContextFactDefinitionIds.length > 0) {
          yield* contextMutation.replaceContextFacts({
            workflowExecutionId,
            sourceStepExecutionId: stepExecutionId,
            affectedContextFactDefinitionIds,
            currentValues,
          });
        }

        return {
          affectedContextFactDefinitionIds,
          propagatedValueCount: currentValues.length,
        } satisfies PropagateInvokeCompletionOutputsResult;
      });

    return InvokePropagationService.of({
      propagateInvokeCompletionOutputs,
    });
  }),
);
