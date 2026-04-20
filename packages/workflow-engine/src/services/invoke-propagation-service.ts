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
import type { FrozenInvokeDraftTemplate } from "./invoke-work-unit-execution-service";
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

const sortByResolutionOrder = <T extends { resolutionOrder: number | null }>(
  values: readonly T[],
): T[] =>
  [...values].sort(
    (left: T, right: T) =>
      toResolutionOrder(left.resolutionOrder) - toResolutionOrder(right.resolutionOrder),
  );

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeFrozenDraftTemplate = (value: unknown): FrozenInvokeDraftTemplate | null => {
  if (!isPlainRecord(value)) {
    return null;
  }

  if (
    typeof value.draftKey !== "string" ||
    typeof value.workUnitDefinitionId !== "string" ||
    !Array.isArray(value.factValues) ||
    !Array.isArray(value.artifactSlots)
  ) {
    return null;
  }

  const factValues = value.factValues.flatMap((entry) =>
    isPlainRecord(entry) && typeof entry.workUnitFactDefinitionId === "string" && "value" in entry
      ? [{ workUnitFactDefinitionId: entry.workUnitFactDefinitionId, value: entry.value }]
      : [],
  );
  const artifactSlots = value.artifactSlots.flatMap((entry) => {
    if (!isPlainRecord(entry) || typeof entry.artifactSlotDefinitionId !== "string") {
      return [];
    }

    const files = Array.isArray(entry.files)
      ? entry.files.flatMap((file) =>
          isPlainRecord(file)
            ? [
                {
                  ...(typeof file.relativePath === "string"
                    ? { relativePath: file.relativePath }
                    : {}),
                  ...(typeof file.sourceContextFactDefinitionId === "string"
                    ? { sourceContextFactDefinitionId: file.sourceContextFactDefinitionId }
                    : {}),
                  clear: file.clear === true,
                },
              ]
            : [],
        )
      : [];

    return [{ artifactSlotDefinitionId: entry.artifactSlotDefinitionId, files }];
  });

  if (
    factValues.length !== value.factValues.length ||
    artifactSlots.length !== value.artifactSlots.length
  ) {
    return null;
  }

  return {
    draftKey: value.draftKey,
    workUnitDefinitionId: value.workUnitDefinitionId,
    factValues,
    artifactSlots,
  };
};

const buildWorkflowReferenceValues = (params: {
  contextFact: Extract<WorkflowContextFactDto, { kind: "workflow_ref_fact" }>;
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
    sortByResolutionOrder(filteredTargets).map((target, instanceOrder) => ({
      contextFactDefinitionId: params.contextFact.contextFactDefinitionId ?? params.contextFact.key,
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
    workUnitDefinitionId: string;
    resolutionOrder: number | null;
    frozenDraftTemplateJson: unknown;
  }>;
}): readonly ReplaceRuntimeWorkflowExecutionContextFactValue[] => {
  const filteredTargets = params.invokeTargets.filter(
    (target) => target.workUnitDefinitionId === params.contextFact.workUnitDefinitionId,
  );

  return restrictToCardinality(
    sortByResolutionOrder(filteredTargets).flatMap((target, instanceOrder) => {
      const frozenTemplate = normalizeFrozenDraftTemplate(target.frozenDraftTemplateJson);
      if (!frozenTemplate) {
        return [];
      }

      return [
        {
          contextFactDefinitionId:
            params.contextFact.contextFactDefinitionId ?? params.contextFact.key,
          instanceOrder,
          valueJson: {
            draftKey: frozenTemplate.draftKey,
            workUnitDefinitionId: frozenTemplate.workUnitDefinitionId,
            factValues: frozenTemplate.factValues.filter((fact) =>
              params.contextFact.selectedWorkUnitFactDefinitionIds.length > 0
                ? params.contextFact.selectedWorkUnitFactDefinitionIds.includes(
                    fact.workUnitFactDefinitionId,
                  )
                : true,
            ),
            artifactSlots: frozenTemplate.artifactSlots.filter((slot) =>
              params.contextFact.selectedArtifactSlotDefinitionIds.length > 0
                ? params.contextFact.selectedArtifactSlotDefinitionIds.includes(
                    slot.artifactSlotDefinitionId,
                  )
                : true,
            ),
          },
        } satisfies ReplaceRuntimeWorkflowExecutionContextFactValue,
      ];
    }),
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
            (fact): fact is Extract<WorkflowContextFactDto, { kind: "workflow_ref_fact" }> =>
              fact.kind === "workflow_ref_fact",
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
                workUnitDefinitionId: target.workUnitDefinitionId,
                resolutionOrder: target.resolutionOrder,
                frozenDraftTemplateJson: target.frozenDraftTemplateJson ?? {
                  draftKey: `${target.workUnitDefinitionId}:${target.transitionDefinitionId}:${target.resolutionOrder ?? 0}`,
                  workUnitDefinitionId: target.workUnitDefinitionId,
                  factValues: factMappings.map((mapping) => ({
                    workUnitFactDefinitionId: mapping.factDefinitionId,
                    value: mapping.workUnitFactInstanceId,
                  })),
                  artifactSlots: artifactMappings.map((mapping) => ({
                    artifactSlotDefinitionId: mapping.artifactSlotDefinitionId,
                    files: [{ relativePath: mapping.artifactSnapshotId, clear: false }],
                  })),
                },
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
