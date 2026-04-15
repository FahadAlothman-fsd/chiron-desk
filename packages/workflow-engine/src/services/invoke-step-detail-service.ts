import type {
  RuntimeInvokeStepExecutionDetailBody,
  RuntimeInvokeTargetStatus,
} from "@chiron/contracts/runtime/executions";
import type {
  InvokeStepPayload,
  WorkflowContextFactDto,
} from "@chiron/contracts/methodology/workflow";
import { LifecycleRepository, MethodologyRepository } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";
import { Context, Effect, Layer } from "effect";

import { RepositoryError } from "../errors";
import { type WorkflowExecutionDetailReadModel } from "../repositories/execution-read-repository";
import { InvokeExecutionRepository } from "../repositories/invoke-execution-repository";
import { ProjectWorkUnitRepository } from "../repositories/project-work-unit-repository";
import {
  StepExecutionRepository,
  type RuntimeStepExecutionRow,
} from "../repositories/step-execution-repository";
import { TransitionExecutionRepository } from "../repositories/transition-execution-repository";
import { WorkflowExecutionRepository } from "../repositories/workflow-execution-repository";
import { InvokeCompletionService } from "./invoke-completion-service";

export interface BuildInvokeStepExecutionDetailBodyParams {
  projectId: string;
  stepExecution: RuntimeStepExecutionRow;
  workflowDetail: WorkflowExecutionDetailReadModel;
}

type WorkflowDefinitionSummary = {
  workflowDefinitionId: string;
  workflowDefinitionKey?: string;
  workflowDefinitionName?: string;
  workUnitTypeKey?: string;
};

type WorkUnitTypeSummary = {
  id: string;
  key: string;
  name: string;
};

type TransitionSummary = {
  transitionDefinitionId: string;
  transitionDefinitionKey?: string;
  transitionLabel: string;
};

const makeDetailError = (cause: string): RepositoryError =>
  new RepositoryError({
    operation: "invoke-step-detail",
    cause: new Error(cause),
  });

const humanizeKey = (value: string): string =>
  value
    .replaceAll(/[._-]+/g, " ")
    .split(" ")
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

const shortId = (value: string): string => value.slice(0, 8);

const formatWorkUnitLabel = (name: string, projectWorkUnitId?: string): string =>
  projectWorkUnitId ? `${name} (${shortId(projectWorkUnitId)})` : name;

const getContextFactLabel = (contextFact: WorkflowContextFactDto): string =>
  contextFact.label ?? humanizeKey(contextFact.key);

const getWorkflowDefinitionName = (
  summary: WorkflowDefinitionSummary | undefined,
  workflowDefinitionId: string,
): string =>
  summary?.workflowDefinitionName ??
  summary?.workflowDefinitionKey ??
  humanizeKey(workflowDefinitionId);

const getWorkUnitTypeName = (
  summary: WorkUnitTypeSummary | undefined,
  workUnitDefinitionId: string,
): string => summary?.name ?? humanizeKey(workUnitDefinitionId);

const getTransitionLabel = (
  summary: TransitionSummary | undefined,
  transitionDefinitionId: string,
): string =>
  summary?.transitionLabel ??
  humanizeKey(summary?.transitionDefinitionKey ?? transitionDefinitionId);

const toPropagationPreview = (params: {
  targetKind: InvokeStepPayload["targetKind"];
  outputs: readonly WorkflowContextFactDto[];
}): RuntimeInvokeStepExecutionDetailBody["propagationPreview"] => {
  const outputs = params.outputs.map((contextFact) => ({
    label: getContextFactLabel(contextFact),
    contextFactDefinitionId: contextFact.contextFactDefinitionId,
    contextFactKey: contextFact.key,
  }));

  const summary =
    outputs.length === 0
      ? params.targetKind === "workflow"
        ? "No workflow-reference outputs will be written on invoke completion."
        : "No work-unit draft-spec outputs will be written on invoke completion."
      : params.targetKind === "workflow"
        ? `On step completion, ${outputs.length} workflow reference output${outputs.length === 1 ? "" : "s"} will be written.`
        : `On step completion, ${outputs.length} work-unit draft-spec output${outputs.length === 1 ? "" : "s"} will be written.`;

  return {
    mode: "on_step_completion",
    summary,
    outputs,
  };
};

export class InvokeStepDetailService extends Context.Tag(
  "@chiron/workflow-engine/services/InvokeStepDetailService",
)<
  InvokeStepDetailService,
  {
    readonly buildInvokeStepExecutionDetailBody: (
      params: BuildInvokeStepExecutionDetailBodyParams,
    ) => Effect.Effect<RuntimeInvokeStepExecutionDetailBody, RepositoryError>;
  }
>() {}

export const InvokeStepDetailServiceLive = Layer.effect(
  InvokeStepDetailService,
  Effect.gen(function* () {
    const projectContextRepo = yield* ProjectContextRepository;
    const lifecycleRepo = yield* LifecycleRepository;
    const methodologyRepo = yield* MethodologyRepository;
    const invokeRepo = yield* InvokeExecutionRepository;
    const projectWorkUnitRepo = yield* ProjectWorkUnitRepository;
    const stepRepo = yield* StepExecutionRepository;
    const transitionRepo = yield* TransitionExecutionRepository;
    const workflowRepo = yield* WorkflowExecutionRepository;
    const invokeCompletionService = yield* InvokeCompletionService;

    const buildInvokeStepExecutionDetailBody = ({
      projectId,
      stepExecution,
      workflowDetail,
    }: BuildInvokeStepExecutionDetailBodyParams) =>
      Effect.gen(function* () {
        const projectPin = yield* projectContextRepo.findProjectPin(projectId);
        if (!projectPin) {
          return yield* Effect.fail(
            makeDetailError("project methodology pin missing for invoke step detail"),
          );
        }

        const workUnitTypes = yield* lifecycleRepo.findWorkUnitTypes(
          projectPin.methodologyVersionId,
        );
        const parentWorkUnitType = workUnitTypes.find(
          (candidate) => candidate.id === workflowDetail.workUnitTypeId,
        );
        if (!parentWorkUnitType) {
          return yield* Effect.fail(
            makeDetailError("parent work-unit type missing for invoke step detail"),
          );
        }

        const workflowEditor = yield* methodologyRepo.getWorkflowEditorDefinition({
          versionId: projectPin.methodologyVersionId,
          workUnitTypeKey: parentWorkUnitType.key,
          workflowDefinitionId: workflowDetail.workflowExecution.workflowId,
        });

        const invokeDefinition = workflowEditor.steps.find(
          (step): step is typeof step & { stepType: "invoke"; payload: InvokeStepPayload } =>
            step.stepType === "invoke" && step.stepId === stepExecution.stepDefinitionId,
        );
        if (!invokeDefinition) {
          return yield* Effect.fail(
            makeDetailError("invoke step definition missing for runtime detail"),
          );
        }

        const invokeState = yield* invokeRepo.getInvokeStepExecutionStateByStepExecutionId(
          stepExecution.id,
        );
        if (!invokeState) {
          return yield* Effect.fail(makeDetailError("invoke step execution state not found"));
        }

        const [workflowTargetRows, workUnitTargetRows, completionEligibility] = yield* Effect.all([
          invokeRepo.listInvokeWorkflowTargetExecutions(invokeState.id),
          invokeRepo.listInvokeWorkUnitTargetExecutions(invokeState.id),
          invokeCompletionService.getCompletionEligibility({
            projectId,
            workflowExecutionId: stepExecution.workflowExecutionId,
            stepExecutionId: stepExecution.id,
          }),
        ]);

        const workUnitTypeById = new Map(
          workUnitTypes.map(
            (workUnitType) =>
              [
                workUnitType.id,
                {
                  id: workUnitType.id,
                  key: workUnitType.key,
                  name: workUnitType.displayName ?? humanizeKey(workUnitType.key),
                } satisfies WorkUnitTypeSummary,
              ] as const,
          ),
        );

        const allWorkflowDefinitions = methodologyRepo.listWorkflowsByWorkUnitType
          ? (yield* Effect.forEach(workUnitTypes, (workUnitType) =>
              methodologyRepo.listWorkflowsByWorkUnitType!({
                versionId: projectPin.methodologyVersionId,
                workUnitTypeKey: workUnitType.key,
              }),
            )).flat()
          : [];

        const workflowDefinitionsById = new Map(
          allWorkflowDefinitions.flatMap((workflow) =>
            typeof workflow.workflowDefinitionId === "string"
              ? [
                  [
                    workflow.workflowDefinitionId,
                    {
                      workflowDefinitionId: workflow.workflowDefinitionId,
                      workflowDefinitionKey: workflow.key,
                      workflowDefinitionName: workflow.displayName ?? humanizeKey(workflow.key),
                      workUnitTypeKey: workflow.workUnitTypeKey,
                    } satisfies WorkflowDefinitionSummary,
                  ] as const,
                ]
              : [],
          ),
        );

        const relevantWorkUnitTypeIds = new Set<string>();
        if (invokeDefinition.payload.targetKind === "work_unit") {
          for (const row of workUnitTargetRows) {
            relevantWorkUnitTypeIds.add(row.workUnitDefinitionId);
          }
        }

        const transitionsById = new Map<string, TransitionSummary>();
        const statesByWorkUnitTypeId = new Map<string, Map<string, string>>();
        for (const workUnitTypeId of relevantWorkUnitTypeIds) {
          const [transitions, states] = yield* Effect.all([
            lifecycleRepo.findLifecycleTransitions(projectPin.methodologyVersionId, {
              workUnitTypeId,
            }),
            lifecycleRepo.findLifecycleStates(projectPin.methodologyVersionId, workUnitTypeId),
          ]);

          for (const transition of transitions) {
            transitionsById.set(transition.id, {
              transitionDefinitionId: transition.id,
              transitionDefinitionKey: transition.transitionKey,
              transitionLabel: humanizeKey(transition.transitionKey),
            });
          }

          statesByWorkUnitTypeId.set(
            workUnitTypeId,
            new Map(
              states.map(
                (state) => [state.id, state.displayName ?? humanizeKey(state.key)] as const,
              ),
            ),
          );
        }

        const childWorkflowRows = yield* Effect.forEach(
          workflowTargetRows
            .map((row) => row.workflowExecutionId)
            .filter((value): value is string => typeof value === "string"),
          (workflowExecutionId) => workflowRepo.getWorkflowExecutionById(workflowExecutionId),
        );
        const childWorkflowsById = new Map(
          childWorkflowRows.flatMap((workflow) =>
            workflow ? [[workflow.id, workflow] as const] : [],
          ),
        );

        const childWorkflowStepRows = yield* Effect.forEach(
          childWorkflowRows
            .flatMap((workflow) =>
              typeof workflow?.currentStepExecutionId === "string"
                ? [workflow.currentStepExecutionId]
                : [],
            )
            .filter((value): value is string => typeof value === "string"),
          (stepExecutionId) => stepRepo.getStepExecutionById(stepExecutionId),
        );
        const childWorkflowStepRowsById = new Map(
          childWorkflowStepRows.flatMap((row) => (row ? [[row.id, row] as const] : [])),
        );

        const childWorkflowEditorsById = new Map<string, typeof workflowEditor>();
        for (const workflow of childWorkflowRows) {
          if (!workflow) {
            continue;
          }
          const workflowDefinition = workflowDefinitionsById.get(workflow.workflowId);
          if (
            !workflowDefinition?.workUnitTypeKey ||
            childWorkflowEditorsById.has(workflow.workflowId)
          ) {
            continue;
          }

          const editor = yield* methodologyRepo.getWorkflowEditorDefinition({
            versionId: projectPin.methodologyVersionId,
            workUnitTypeKey: workflowDefinition.workUnitTypeKey,
            workflowDefinitionId: workflow.workflowId,
          });
          childWorkflowEditorsById.set(workflow.workflowId, editor);
        }

        const childTransitionRows = yield* Effect.forEach(
          workUnitTargetRows
            .map((row) => row.transitionExecutionId)
            .filter((value): value is string => typeof value === "string"),
          (transitionExecutionId) =>
            transitionRepo.getTransitionExecutionById(transitionExecutionId),
        );
        const childTransitionsById = new Map(
          childTransitionRows.flatMap((transition) =>
            transition ? [[transition.id, transition] as const] : [],
          ),
        );

        const projectWorkUnits = yield* Effect.forEach(
          workUnitTargetRows
            .map((row) => row.projectWorkUnitId)
            .filter((value): value is string => typeof value === "string"),
          (projectWorkUnitId) => projectWorkUnitRepo.getProjectWorkUnitById(projectWorkUnitId),
        );
        const projectWorkUnitsById = new Map(
          projectWorkUnits.flatMap((workUnit) =>
            workUnit ? [[workUnit.id, workUnit] as const] : [],
          ),
        );

        const propagationOutputs = workflowEditor.contextFacts.filter((contextFact) =>
          invokeDefinition.payload.targetKind === "workflow"
            ? contextFact.kind === "workflow_reference_fact"
            : contextFact.kind === "work_unit_draft_spec_fact" &&
              contextFact.workUnitDefinitionId === invokeDefinition.payload.workUnitDefinitionId,
        );

        const workflowTargets = workflowTargetRows.map((row) => {
          const workflowDefinition = workflowDefinitionsById.get(row.workflowDefinitionId);
          const childWorkflow = row.workflowExecutionId
            ? childWorkflowsById.get(row.workflowExecutionId)
            : undefined;

          const status: RuntimeInvokeTargetStatus = !row.workflowExecutionId
            ? "not_started"
            : !childWorkflow
              ? "unavailable"
              : childWorkflow.status === "completed"
                ? "completed"
                : childWorkflow.status === "active"
                  ? "active"
                  : "failed";

          const activeChildStepLabel =
            status === "active" && childWorkflow?.currentStepExecutionId
              ? (() => {
                  const currentStepRow = childWorkflowStepRowsById.get(
                    childWorkflow.currentStepExecutionId,
                  );
                  const editor = childWorkflowEditorsById.get(childWorkflow.workflowId);
                  const stepDefinition = currentStepRow
                    ? editor?.steps.find((step) => step.stepId === currentStepRow.stepDefinitionId)
                    : undefined;

                  return (
                    stepDefinition?.payload.label ??
                    (stepDefinition?.payload.key
                      ? humanizeKey(stepDefinition.payload.key)
                      : undefined)
                  );
                })()
              : undefined;

          return {
            label: getWorkflowDefinitionName(workflowDefinition, row.workflowDefinitionId),
            status,
            activeChildStepLabel,
            invokeWorkflowTargetExecutionId: row.id,
            workflowDefinitionId: row.workflowDefinitionId,
            workflowDefinitionKey: workflowDefinition?.workflowDefinitionKey,
            workflowDefinitionName: workflowDefinition?.workflowDefinitionName,
            workflowExecutionId: row.workflowExecutionId ?? undefined,
            actions: {
              ...(!row.workflowExecutionId
                ? {
                    start: {
                      kind: "start_invoke_workflow_target" as const,
                      enabled: stepExecution.status === "active",
                      reasonIfDisabled:
                        stepExecution.status !== "active"
                          ? "Only active invoke steps can start child workflows."
                          : undefined,
                      invokeWorkflowTargetExecutionId: row.id,
                    },
                  }
                : {}),
              ...(row.workflowExecutionId
                ? {
                    openWorkflow: {
                      kind: "open_workflow_execution" as const,
                      workflowExecutionId: row.workflowExecutionId,
                      target: {
                        page: "workflow-execution-detail" as const,
                        workflowExecutionId: row.workflowExecutionId,
                      },
                    },
                  }
                : {}),
            },
          } satisfies RuntimeInvokeStepExecutionDetailBody["workflowTargets"][number];
        });

        const workflowOptionsByTransitionId = new Map(
          invokeDefinition.payload.targetKind === "work_unit"
            ? invokeDefinition.payload.activationTransitions.map((transition) => [
                transition.transitionId,
                transition.workflowDefinitionIds.map((workflowDefinitionId) => {
                  const summary = workflowDefinitionsById.get(workflowDefinitionId);
                  return {
                    workflowDefinitionId,
                    workflowDefinitionKey: summary?.workflowDefinitionKey,
                    workflowDefinitionName: getWorkflowDefinitionName(
                      summary,
                      workflowDefinitionId,
                    ),
                  };
                }),
              ])
            : [],
        );

        const workUnitTargets = workUnitTargetRows.map((row) => {
          const workUnitType = workUnitTypeById.get(row.workUnitDefinitionId);
          const transition = transitionsById.get(row.transitionDefinitionId);
          const availablePrimaryWorkflows =
            workflowOptionsByTransitionId.get(row.transitionDefinitionId) ?? [];
          const selectedWorkflow = row.workflowDefinitionId
            ? workflowDefinitionsById.get(row.workflowDefinitionId)
            : undefined;
          const projectWorkUnit = row.projectWorkUnitId
            ? projectWorkUnitsById.get(row.projectWorkUnitId)
            : undefined;
          const transitionExecution = row.transitionExecutionId
            ? childTransitionsById.get(row.transitionExecutionId)
            : undefined;

          const partiallyStarted =
            !!row.projectWorkUnitId ||
            !!row.transitionExecutionId ||
            !!row.workflowDefinitionId ||
            !!row.workflowExecutionId;
          const fullyStarted =
            !!row.projectWorkUnitId &&
            !!row.transitionExecutionId &&
            !!row.workflowDefinitionId &&
            !!row.workflowExecutionId;

          const blockedReason = !fullyStarted
            ? availablePrimaryWorkflows.length === 0
              ? "No primary workflows are available for this transition."
              : partiallyStarted
                ? "Invoke target is in a partially started state."
                : undefined
            : !transitionExecution
              ? "Started transition execution could not be resolved."
              : transitionExecution.status === "superseded"
                ? "Started transition path was superseded before completion."
                : undefined;

          const status: RuntimeInvokeTargetStatus = !partiallyStarted
            ? availablePrimaryWorkflows.length === 0
              ? "blocked"
              : "not_started"
            : !fullyStarted
              ? "failed"
              : !transitionExecution || !projectWorkUnit
                ? "unavailable"
                : transitionExecution.status === "completed"
                  ? "completed"
                  : transitionExecution.status === "active"
                    ? "active"
                    : "failed";

          const currentWorkUnitStateLabel =
            projectWorkUnit?.currentStateId && projectWorkUnit.workUnitTypeId
              ? (statesByWorkUnitTypeId
                  .get(projectWorkUnit.workUnitTypeId)
                  ?.get(projectWorkUnit.currentStateId) ?? projectWorkUnit.currentStateId)
              : undefined;

          return {
            workUnitLabel: formatWorkUnitLabel(
              getWorkUnitTypeName(workUnitType, row.workUnitDefinitionId),
              row.projectWorkUnitId ?? undefined,
            ),
            transitionLabel: getTransitionLabel(transition, row.transitionDefinitionId),
            workflowLabel: row.workflowDefinitionId
              ? getWorkflowDefinitionName(selectedWorkflow, row.workflowDefinitionId)
              : undefined,
            currentWorkUnitStateLabel,
            status,
            blockedReason,
            availablePrimaryWorkflows,
            invokeWorkUnitTargetExecutionId: row.id,
            projectWorkUnitId: row.projectWorkUnitId ?? undefined,
            workUnitDefinitionId: row.workUnitDefinitionId,
            workUnitDefinitionKey: workUnitType?.key,
            workUnitDefinitionName: workUnitType?.name,
            transitionDefinitionId: row.transitionDefinitionId,
            transitionDefinitionKey: transition?.transitionDefinitionKey,
            workflowDefinitionId: row.workflowDefinitionId ?? undefined,
            workflowDefinitionKey: selectedWorkflow?.workflowDefinitionKey,
            transitionExecutionId: row.transitionExecutionId ?? undefined,
            workflowExecutionId: row.workflowExecutionId ?? undefined,
            actions: {
              ...(!fullyStarted
                ? {
                    start: {
                      kind: "start_invoke_work_unit_target" as const,
                      enabled:
                        stepExecution.status === "active" &&
                        status !== "blocked" &&
                        availablePrimaryWorkflows.length > 0,
                      reasonIfDisabled:
                        stepExecution.status !== "active"
                          ? "Only active invoke steps can start child work units."
                          : status === "blocked"
                            ? blockedReason
                            : availablePrimaryWorkflows.length === 0
                              ? "No primary workflows are available for this transition."
                              : undefined,
                      invokeWorkUnitTargetExecutionId: row.id,
                    },
                  }
                : {}),
              ...(row.projectWorkUnitId
                ? {
                    openWorkUnit: {
                      kind: "open_work_unit" as const,
                      projectWorkUnitId: row.projectWorkUnitId,
                      target: {
                        page: "work-unit-overview" as const,
                        projectWorkUnitId: row.projectWorkUnitId,
                      },
                    },
                  }
                : {}),
              ...(row.transitionExecutionId
                ? {
                    openTransition: {
                      kind: "open_transition_execution" as const,
                      transitionExecutionId: row.transitionExecutionId,
                      target: {
                        page: "transition-execution-detail" as const,
                        transitionExecutionId: row.transitionExecutionId,
                      },
                    },
                  }
                : {}),
              ...(row.workflowExecutionId
                ? {
                    openWorkflow: {
                      kind: "open_workflow_execution" as const,
                      workflowExecutionId: row.workflowExecutionId,
                      target: {
                        page: "workflow-execution-detail" as const,
                        workflowExecutionId: row.workflowExecutionId,
                      },
                    },
                  }
                : {}),
            },
          } satisfies RuntimeInvokeStepExecutionDetailBody["workUnitTargets"][number];
        });

        const relevantTargets =
          invokeDefinition.payload.targetKind === "workflow" ? workflowTargets : workUnitTargets;
        const completedTargets = relevantTargets.filter(
          (target) => target.status === "completed",
        ).length;
        const reasonIfIneligible = completionEligibility.reasonIfIneligible ?? undefined;

        return {
          stepType: "invoke",
          targetKind: invokeDefinition.payload.targetKind,
          sourceMode: invokeDefinition.payload.sourceMode,
          workflowTargets,
          workUnitTargets,
          completionSummary: {
            mode: "manual",
            eligible: completionEligibility.eligible,
            reasonIfIneligible,
            totalTargets: relevantTargets.length,
            completedTargets,
          },
          propagationPreview: toPropagationPreview({
            targetKind: invokeDefinition.payload.targetKind,
            outputs: propagationOutputs,
          }),
        } satisfies RuntimeInvokeStepExecutionDetailBody;
      });

    return InvokeStepDetailService.of({
      buildInvokeStepExecutionDetailBody,
    });
  }),
);
