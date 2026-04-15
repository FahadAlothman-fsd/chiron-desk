import { MethodologyRepository } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";
import { Context, Effect, Layer } from "effect";

import { RepositoryError } from "../errors";
import { ExecutionReadRepository } from "../repositories/execution-read-repository";
import { InvokeExecutionRepository } from "../repositories/invoke-execution-repository";
import { StepExecutionRepository } from "../repositories/step-execution-repository";
import { TransitionExecutionRepository } from "../repositories/transition-execution-repository";
import { WorkflowExecutionRepository } from "../repositories/workflow-execution-repository";
import { getInvokeTargetsBlockedReason } from "./invoke-target-resolution-service";

export interface InvokeCompletionEligibilityParams {
  projectId: string;
  workflowExecutionId: string;
  stepExecutionId: string;
}

export interface InvokeCompletionEligibilityResult {
  eligible: boolean;
  reasonIfIneligible: string | null;
}

const WORKFLOW_INELIGIBLE_REASON =
  "At least one child workflow execution must be completed before invoke completion";
const WORK_UNIT_INELIGIBLE_REASON =
  "At least one child transition path must be completed before invoke completion";

const makeCompletionError = (cause: string): RepositoryError =>
  new RepositoryError({
    operation: "invoke-completion",
    cause: new Error(cause),
  });

export class InvokeCompletionService extends Context.Tag(
  "@chiron/workflow-engine/services/InvokeCompletionService",
)<
  InvokeCompletionService,
  {
    readonly getCompletionEligibility: (
      params: InvokeCompletionEligibilityParams,
    ) => Effect.Effect<InvokeCompletionEligibilityResult, RepositoryError>;
  }
>() {}

export const InvokeCompletionServiceLive = Layer.effect(
  InvokeCompletionService,
  Effect.gen(function* () {
    const projectContextRepo = yield* ProjectContextRepository;
    const methodologyRepo = yield* MethodologyRepository;
    const executionReadRepo = yield* ExecutionReadRepository;
    const invokeRepo = yield* InvokeExecutionRepository;
    const stepRepo = yield* StepExecutionRepository;
    const workflowRepo = yield* WorkflowExecutionRepository;
    const transitionRepo = yield* TransitionExecutionRepository;

    const getCompletionEligibility = ({
      projectId,
      workflowExecutionId,
      stepExecutionId,
    }: InvokeCompletionEligibilityParams) =>
      Effect.gen(function* () {
        const [stepExecution, workflowDetail, projectPin] = yield* Effect.all([
          stepRepo.getStepExecutionById(stepExecutionId),
          executionReadRepo.getWorkflowExecutionDetail(workflowExecutionId),
          projectContextRepo.findProjectPin(projectId),
        ]);

        if (!stepExecution || stepExecution.workflowExecutionId !== workflowExecutionId) {
          return yield* makeCompletionError("step execution does not belong to workflow execution");
        }

        if (!workflowDetail || workflowDetail.projectId !== projectId) {
          return yield* makeCompletionError("workflow execution does not belong to project");
        }

        if (!projectPin) {
          return yield* makeCompletionError("project methodology pin missing");
        }

        const [invokeDefinition, invokeState] = yield* Effect.all([
          methodologyRepo.getInvokeStepDefinition({
            versionId: projectPin.methodologyVersionId,
            workflowDefinitionId: workflowDetail.workflowExecution.workflowId,
            stepId: stepExecution.stepDefinitionId,
          }),
          invokeRepo.getInvokeStepExecutionStateByStepExecutionId(stepExecutionId),
        ]);

        if (!invokeDefinition) {
          return yield* makeCompletionError("invoke step definition missing for step execution");
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
          return yield* makeCompletionError("invoke step payload missing for step execution");
        }

        if (!invokeState) {
          return yield* makeCompletionError("invoke step execution state not found");
        }

        if (invokeTargetKind === "workflow") {
          const workflowTargets = yield* invokeRepo.listInvokeWorkflowTargetExecutions(
            invokeState.id,
          );
          const blockedReason = getInvokeTargetsBlockedReason({
            workflowTargets,
            workUnitTargets: [],
          });
          if (blockedReason) {
            return {
              eligible: false,
              reasonIfIneligible: blockedReason,
            } satisfies InvokeCompletionEligibilityResult;
          }

          const childWorkflows = yield* Effect.forEach(
            workflowTargets.filter((target) => target.workflowExecutionId !== null),
            (target) => workflowRepo.getWorkflowExecutionById(target.workflowExecutionId!),
          );
          const eligible = childWorkflows.some(
            (workflowExecution) => workflowExecution?.status === "completed",
          );

          return {
            eligible,
            reasonIfIneligible: eligible ? null : WORKFLOW_INELIGIBLE_REASON,
          } satisfies InvokeCompletionEligibilityResult;
        }

        const workUnitTargets = yield* invokeRepo.listInvokeWorkUnitTargetExecutions(
          invokeState.id,
        );
        const blockedReason = getInvokeTargetsBlockedReason({
          workflowTargets: [],
          workUnitTargets,
        });
        if (blockedReason) {
          return {
            eligible: false,
            reasonIfIneligible: blockedReason,
          } satisfies InvokeCompletionEligibilityResult;
        }

        const childTransitions = yield* Effect.forEach(
          workUnitTargets.filter((target) => target.transitionExecutionId !== null),
          (target) => transitionRepo.getTransitionExecutionById(target.transitionExecutionId!),
        );
        const eligible = childTransitions.some(
          (transitionExecution) => transitionExecution?.status === "completed",
        );

        return {
          eligible,
          reasonIfIneligible: eligible ? null : WORK_UNIT_INELIGIBLE_REASON,
        } satisfies InvokeCompletionEligibilityResult;
      });

    return InvokeCompletionService.of({
      getCompletionEligibility,
    });
  }),
);
