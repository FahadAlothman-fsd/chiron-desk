import { Context, Effect, Layer, Option } from "effect";
import { LifecycleRepository, MethodologyRepository } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";

import { RepositoryError } from "../errors";
import { ExecutionReadRepository } from "../repositories/execution-read-repository";
import { ProjectWorkUnitRepository } from "../repositories/project-work-unit-repository";
import { StepExecutionRepository } from "../repositories/step-execution-repository";
import {
  FormStepExecutionService,
  type SaveFormStepDraftInput,
  type SaveFormStepDraftOutput,
} from "./form-step-execution-service";
import { InvokeCompletionService } from "./invoke-completion-service";
import { InvokeTargetResolutionService } from "./invoke-target-resolution-service";
import type { SingletonAutoAttachWarning } from "@chiron/contracts/runtime/executions";
import { WorkflowContextExternalPrefillService } from "./workflow-context-external-prefill-service";
import { StepProgressionService } from "./step-progression-service";
import { StepExecutionTransactionService } from "./step-execution-transaction-service";
import type {
  SaveBranchStepSelectionInput,
  SaveBranchStepSelectionOutput,
  SubmitFormStepExecutionInput,
  SubmitFormStepExecutionOutput,
} from "@chiron/contracts/runtime/executions";
import { BranchStepRuntimeRepository } from "../repositories/branch-step-runtime-repository";
import { evaluateRoutes, toProjectWorkUnitInstanceSummaries } from "./branch-route-evaluator";

export interface ActivateWorkflowStepExecutionInput {
  projectId: string;
  workflowExecutionId: string;
}

export interface ActivateWorkflowStepExecutionOutput {
  stepExecutionId: string;
  warnings?: readonly SingletonAutoAttachWarning[];
}

export type ActivateFirstWorkflowStepExecutionInput = ActivateWorkflowStepExecutionInput;
export type ActivateFirstWorkflowStepExecutionOutput = ActivateWorkflowStepExecutionOutput;

export interface CompleteStepExecutionInput {
  projectId: string;
  workflowExecutionId: string;
  stepExecutionId: string;
}

export interface CompleteStepExecutionOutput {
  stepExecutionId: string;
  status: "completed";
}

const makeCommandError = (cause: string): RepositoryError =>
  new RepositoryError({
    operation: "workflow-execution-step-command",
    cause: new Error(cause),
  });

export class WorkflowExecutionStepCommandService extends Context.Tag(
  "@chiron/workflow-engine/services/WorkflowExecutionStepCommandService",
)<
  WorkflowExecutionStepCommandService,
  {
    readonly activateWorkflowStepExecution: (
      input: ActivateWorkflowStepExecutionInput,
    ) => Effect.Effect<ActivateWorkflowStepExecutionOutput, RepositoryError>;
    readonly activateFirstWorkflowStepExecution: (
      input: ActivateFirstWorkflowStepExecutionInput,
    ) => Effect.Effect<ActivateFirstWorkflowStepExecutionOutput, RepositoryError>;
    readonly saveFormStepDraft: (
      input: SaveFormStepDraftInput,
    ) => Effect.Effect<SaveFormStepDraftOutput, RepositoryError>;
    readonly submitFormStep: (
      input: SubmitFormStepExecutionInput,
    ) => Effect.Effect<SubmitFormStepExecutionOutput, RepositoryError>;
    readonly saveBranchStepSelection: (
      input: SaveBranchStepSelectionInput,
    ) => Effect.Effect<SaveBranchStepSelectionOutput, RepositoryError>;
    readonly completeStepExecution: (
      input: CompleteStepExecutionInput,
    ) => Effect.Effect<CompleteStepExecutionOutput, RepositoryError>;
  }
>() {}

export const WorkflowExecutionStepCommandServiceLive = Layer.effect(
  WorkflowExecutionStepCommandService,
  Effect.gen(function* () {
    const readRepo = yield* ExecutionReadRepository;
    const stepRepo = yield* StepExecutionRepository;
    const projectContextRepo = yield* ProjectContextRepository;
    const projectWorkUnitRepo = yield* ProjectWorkUnitRepository;
    const methodologyRepo = yield* MethodologyRepository;
    const lifecycleRepo = yield* LifecycleRepository;
    const contextExternalPrefillService = yield* Effect.serviceOption(
      WorkflowContextExternalPrefillService,
    );
    const branchRuntimeRepo = yield* BranchStepRuntimeRepository;
    const formExecution = yield* FormStepExecutionService;
    const invokeTargetResolution = yield* InvokeTargetResolutionService;
    const progression = yield* StepProgressionService;
    const tx = yield* StepExecutionTransactionService;
    const invokeCompletion = yield* InvokeCompletionService;

    const assertWorkflowOwnership = (input: { projectId: string; workflowExecutionId: string }) =>
      Effect.gen(function* () {
        const detail = yield* readRepo.getWorkflowExecutionDetail(input.workflowExecutionId);
        if (!detail || detail.projectId !== input.projectId) {
          return yield* makeCommandError("workflow execution does not belong to project");
        }
        return detail;
      });

    const ensureInvokeStepMaterialized = (params: {
      projectId: string;
      workflowExecutionId: string;
      workflowDefinitionId: string;
      stepExecutionId: string;
      stepDefinitionId: string;
    }) =>
      Effect.gen(function* () {
        const projectPin = yield* projectContextRepo.findProjectPin(params.projectId);
        if (!projectPin) {
          return yield* makeCommandError("project methodology pin missing");
        }

        const invokeDefinition = yield* methodologyRepo.getInvokeStepDefinition({
          versionId: projectPin.methodologyVersionId,
          workflowDefinitionId: params.workflowDefinitionId,
          stepId: params.stepDefinitionId,
        });

        if (!invokeDefinition) {
          return yield* makeCommandError("invoke step definition not found");
        }

        return yield* invokeTargetResolution.materializeTargetsForActivation({
          workflowExecutionId: params.workflowExecutionId,
          stepExecutionId: params.stepExecutionId,
          invokeStepDefinitionId: params.stepDefinitionId,
          invokeStep: invokeDefinition.payload,
        });
      });

    const prepopulateExternalContextFactsAtActivation = (params: {
      projectId: string;
      workflowExecutionId: string;
    }) =>
      Effect.gen(function* () {
        if (Option.isNone(contextExternalPrefillService)) {
          return [] as readonly SingletonAutoAttachWarning[];
        }

        const result = yield* contextExternalPrefillService.value.prefillFromExternalBindings({
          projectId: params.projectId,
          workflowExecutionId: params.workflowExecutionId,
        });

        return result.warnings;
      });

    const activateWorkflowStepExecution = (input: ActivateWorkflowStepExecutionInput) =>
      Effect.gen(function* () {
        const detail = yield* assertWorkflowOwnership(input);

        const existing = yield* stepRepo.listStepExecutionsForWorkflow(input.workflowExecutionId);
        if (existing.length === 0) {
          const warnings = yield* prepopulateExternalContextFactsAtActivation({
            projectId: input.projectId,
            workflowExecutionId: input.workflowExecutionId,
          });

          const activated = yield* tx.activateFirstStepExecution(input.workflowExecutionId);
          const activatedStep = yield* stepRepo.getStepExecutionById(activated.stepExecutionId);
          if (!activatedStep) {
            return yield* makeCommandError("activated step execution not found");
          }

          if (activatedStep.stepType === "invoke") {
            yield* ensureInvokeStepMaterialized({
              projectId: input.projectId,
              workflowExecutionId: input.workflowExecutionId,
              workflowDefinitionId: detail.workflowExecution.workflowId,
              stepExecutionId: activatedStep.id,
              stepDefinitionId: activatedStep.stepDefinitionId,
            });
          }

          return warnings.length > 0 ? { ...activated, warnings } : activated;
        }

        const currentStepExecutionId = detail.workflowExecution.currentStepExecutionId;
        if (!currentStepExecutionId) {
          return yield* makeCommandError("workflow current step pointer is missing for activation");
        }

        const currentStepExecution = yield* stepRepo.getStepExecutionById(currentStepExecutionId);
        if (!currentStepExecution) {
          return yield* makeCommandError("workflow current step execution was not found");
        }

        if (currentStepExecution.status === "active") {
          const warnings = yield* prepopulateExternalContextFactsAtActivation({
            projectId: input.projectId,
            workflowExecutionId: input.workflowExecutionId,
          });

          if (currentStepExecution.stepType === "invoke") {
            yield* ensureInvokeStepMaterialized({
              projectId: input.projectId,
              workflowExecutionId: input.workflowExecutionId,
              workflowDefinitionId: detail.workflowExecution.workflowId,
              stepExecutionId: currentStepExecution.id,
              stepDefinitionId: currentStepExecution.stepDefinitionId,
            });
          }

          return warnings.length > 0
            ? { stepExecutionId: currentStepExecution.id, warnings }
            : { stepExecutionId: currentStepExecution.id };
        }

        const nextStep = yield* progression.getNextStepDefinition({
          workflowExecutionId: input.workflowExecutionId,
          workflowId: detail.workflowExecution.workflowId,
          fromStepDefinitionId: currentStepExecution.stepDefinitionId,
          fromStepExecutionId: currentStepExecution.id,
        });

        if (nextStep.state === "blocked") {
          return yield* makeCommandError(nextStep.reason);
        }

        if (nextStep.state !== "next_step_ready") {
          return yield* makeCommandError("workflow has no next step ready for activation");
        }

        const activated = yield* tx.activateStepExecution({
          workflowExecutionId: input.workflowExecutionId,
          stepDefinitionId: nextStep.nextStep.id,
          stepType: nextStep.nextStep.type,
          previousStepExecutionId: currentStepExecution.id,
        });

        if (nextStep.nextStep.type === "invoke") {
          yield* ensureInvokeStepMaterialized({
            projectId: input.projectId,
            workflowExecutionId: input.workflowExecutionId,
            workflowDefinitionId: detail.workflowExecution.workflowId,
            stepExecutionId: activated.stepExecutionId,
            stepDefinitionId: nextStep.nextStep.id,
          });
        }

        return activated;
      });

    const activateFirstWorkflowStepExecution = (input: ActivateFirstWorkflowStepExecutionInput) =>
      activateWorkflowStepExecution(input);

    const saveFormStepDraft = (input: SaveFormStepDraftInput) =>
      Effect.gen(function* () {
        yield* assertWorkflowOwnership(input);
        return yield* formExecution.saveFormStepDraft(input);
      });

    const submitFormStep = (input: SubmitFormStepExecutionInput) =>
      Effect.gen(function* () {
        yield* assertWorkflowOwnership(input);
        return yield* formExecution.submitFormStep(input);
      });

    const saveBranchStepSelection = (input: SaveBranchStepSelectionInput) =>
      Effect.gen(function* () {
        const stepExecution = yield* stepRepo.getStepExecutionById(input.stepExecutionId);
        if (!stepExecution) {
          return yield* makeCommandError("step execution not found");
        }

        if (stepExecution.stepType !== "branch") {
          return yield* makeCommandError("step execution is not a branch step");
        }

        if (stepExecution.status !== "active") {
          return yield* makeCommandError("only active branch steps can save a target selection");
        }

        const workflowDetail = yield* assertWorkflowOwnership({
          projectId: input.projectId,
          workflowExecutionId: stepExecution.workflowExecutionId,
        });

        const projectPin = yield* projectContextRepo.findProjectPin(input.projectId);
        if (!projectPin) {
          return yield* makeCommandError("project methodology pin missing");
        }

        const workUnitTypes = yield* lifecycleRepo.findWorkUnitTypes(
          projectPin.methodologyVersionId,
        );
        const workUnitType = workUnitTypes.find(
          (entry) => entry.id === workflowDetail.workUnitTypeId,
        );
        if (!workUnitType) {
          return yield* makeCommandError("workflow work-unit type not found");
        }

        const [
          branchDefinition,
          workflowEditor,
          contextFacts,
          branchState,
          lifecycleStates,
          projectWorkUnits,
        ] = yield* Effect.all([
          methodologyRepo.getBranchStepDefinition({
            versionId: projectPin.methodologyVersionId,
            workflowDefinitionId: workflowDetail.workflowExecution.workflowId,
            stepId: stepExecution.stepDefinitionId,
          }),
          methodologyRepo.getWorkflowEditorDefinition({
            versionId: projectPin.methodologyVersionId,
            workUnitTypeKey: workUnitType.key,
            workflowDefinitionId: workflowDetail.workflowExecution.workflowId,
          }),
          stepRepo.listWorkflowExecutionContextFacts(stepExecution.workflowExecutionId),
          branchRuntimeRepo.loadWithRoutes(stepExecution.id),
          lifecycleRepo.findLifecycleStates(projectPin.methodologyVersionId),
          projectWorkUnitRepo.listProjectWorkUnitsByProject(workflowDetail.projectId),
        ]);

        if (!branchDefinition) {
          return yield* makeCommandError("branch step definition not found");
        }

        if (!branchState) {
          return yield* makeCommandError("branch step runtime state not found");
        }

        const evaluations = evaluateRoutes({
          routes: branchDefinition.payload.routes.map((route, index) => ({
            ...route,
            sortOrder: index,
          })),
          contextFacts,
          contextFactDefinitions: workflowEditor.contextFacts,
          projectWorkUnitInstances: toProjectWorkUnitInstanceSummaries({
            projectWorkUnits,
            workUnitTypeKeysById: new Map(workUnitTypes.map((row) => [row.id, row.key] as const)),
            stateKeysById: new Map(lifecycleStates.map((row) => [row.id, row.key] as const)),
          }),
        });

        const validConditionalTargets = evaluations
          .filter((route) => route.isValid)
          .map((route) => route.targetStepId);
        const validTargets = new Set(
          validConditionalTargets.length > 0
            ? validConditionalTargets
            : branchDefinition.payload.defaultTargetStepId
              ? [branchDefinition.payload.defaultTargetStepId]
              : [],
        );

        if (input.selectedTargetStepId !== null && !validTargets.has(input.selectedTargetStepId)) {
          return yield* makeCommandError(
            "branch target selection must be one of the currently valid persisted targets",
          );
        }

        const saved = yield* branchRuntimeRepo.saveSelection({
          stepExecutionId: input.stepExecutionId,
          selectedTargetStepId: input.selectedTargetStepId,
        });

        if (!saved) {
          return yield* makeCommandError("branch step runtime state could not be updated");
        }

        return {
          stepExecutionId: input.stepExecutionId,
          selectedTargetStepId: saved.selectedTargetStepId,
          result: "saved",
        } satisfies SaveBranchStepSelectionOutput;
      });

    const completeStepExecution = (input: CompleteStepExecutionInput) =>
      Effect.gen(function* () {
        yield* assertWorkflowOwnership(input);
        const stepExecution = yield* stepRepo.getStepExecutionById(input.stepExecutionId);
        if (!stepExecution) {
          return yield* makeCommandError("step execution not found");
        }

        if (stepExecution.stepType === "invoke" && stepExecution.status !== "completed") {
          const eligibility = yield* invokeCompletion.getCompletionEligibility({
            projectId: input.projectId,
            workflowExecutionId: input.workflowExecutionId,
            stepExecutionId: input.stepExecutionId,
          });
          if (!eligibility.eligible) {
            return yield* makeCommandError(
              eligibility.reasonIfIneligible ?? "invoke step is not eligible for completion",
            );
          }
        }

        return yield* tx.completeStepExecution({
          workflowExecutionId: input.workflowExecutionId,
          stepExecutionId: input.stepExecutionId,
        });
      });

    return WorkflowExecutionStepCommandService.of({
      activateWorkflowStepExecution,
      activateFirstWorkflowStepExecution,
      saveFormStepDraft,
      submitFormStep,
      saveBranchStepSelection,
      completeStepExecution,
    });
  }),
);
