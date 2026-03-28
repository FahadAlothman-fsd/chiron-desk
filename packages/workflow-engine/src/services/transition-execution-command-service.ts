import type {
  ChoosePrimaryWorkflowForTransitionExecutionInput,
  ChoosePrimaryWorkflowForTransitionExecutionOutput,
  CompleteTransitionExecutionInput,
  CompleteTransitionExecutionOutput,
  StartTransitionExecutionInput,
  StartTransitionExecutionOutput,
  SwitchActiveTransitionExecutionInput,
  SwitchActiveTransitionExecutionOutput,
} from "@chiron/contracts/runtime/executions";
import { Context, Effect, Layer } from "effect";

import { RepositoryError } from "../errors";
import { ExecutionReadRepository } from "../repositories/execution-read-repository";
import { ProjectWorkUnitRepository } from "../repositories/project-work-unit-repository";
import { TransitionExecutionRepository } from "../repositories/transition-execution-repository";
import { WorkflowExecutionRepository } from "../repositories/workflow-execution-repository";
import { RuntimeGateService } from "./runtime-gate-service";

interface RuntimeGateStartInput {
  projectId: string;
  projectWorkUnitId: string;
  transitionId: string;
  workflowId: string;
}

interface RuntimeGateCompletionInput {
  projectId: string;
  projectWorkUnitId: string;
  transitionExecutionId: string;
}

interface RuntimeGateStartResult {
  passed: boolean;
  evaluatedAt: string;
  firstBlockingReason?: string;
  conditionTree?: unknown;
}

interface RuntimeGateCompletionResult {
  passed: boolean;
  evaluatedAt: string;
  firstBlockingReason?: string;
  conditionTree?: unknown;
  targetState?: {
    stateId: string;
    stateKey: string;
    stateLabel: string;
  };
}

type TransitionExecutionAtomicOps = Context.Tag.Service<typeof TransitionExecutionRepository> & {
  readonly completeTransitionExecutionAtomically?: (params: {
    transitionExecutionId: string;
    projectWorkUnitId: string;
    newStateId: string;
    newStateKey: string;
    newStateLabel: string;
  }) => Effect.Effect<CompleteTransitionExecutionOutput, RepositoryError>;
};

type WorkflowExecutionAtomicOps = Context.Tag.Service<typeof WorkflowExecutionRepository> & {
  readonly choosePrimaryWorkflowForTransitionExecutionAtomically?: (params: {
    transitionExecutionId: string;
    workflowId: string;
    supersededWorkflowExecutionId: string | null;
  }) => Effect.Effect<ChoosePrimaryWorkflowForTransitionExecutionOutput, RepositoryError>;
};

const makeCommandError = (operation: string, cause: string): RepositoryError =>
  new RepositoryError({ operation, cause: new Error(cause) });

export class TransitionExecutionCommandService extends Context.Tag(
  "@chiron/workflow-engine/services/TransitionExecutionCommandService",
)<
  TransitionExecutionCommandService,
  {
    readonly startTransitionExecution: (
      input: StartTransitionExecutionInput,
    ) => Effect.Effect<StartTransitionExecutionOutput, RepositoryError>;
    readonly switchActiveTransitionExecution: (
      input: SwitchActiveTransitionExecutionInput,
    ) => Effect.Effect<SwitchActiveTransitionExecutionOutput, RepositoryError>;
    readonly completeTransitionExecution: (
      input: CompleteTransitionExecutionInput,
    ) => Effect.Effect<CompleteTransitionExecutionOutput, RepositoryError>;
    readonly choosePrimaryWorkflowForTransitionExecution: (
      input: ChoosePrimaryWorkflowForTransitionExecutionInput,
    ) => Effect.Effect<ChoosePrimaryWorkflowForTransitionExecutionOutput, RepositoryError>;
  }
>() {}

export const TransitionExecutionCommandServiceLive = Layer.effect(
  TransitionExecutionCommandService,
  Effect.gen(function* () {
    const transitionRepo = yield* TransitionExecutionRepository;
    const workflowRepo = yield* WorkflowExecutionRepository;
    yield* ProjectWorkUnitRepository;
    const readRepo = yield* ExecutionReadRepository;
    const runtimeGate = (yield* RuntimeGateService) as unknown as {
      readonly evaluateStartGate: (
        input: RuntimeGateStartInput,
      ) => Effect.Effect<RuntimeGateStartResult, RepositoryError>;
      readonly evaluateCompletionGate: (
        input: RuntimeGateCompletionInput,
      ) => Effect.Effect<RuntimeGateCompletionResult, RepositoryError>;
    };

    const startTransitionExecution = (input: StartTransitionExecutionInput) =>
      Effect.gen(function* () {
        if (!input.projectWorkUnitId) {
          return yield* makeCommandError(
            "transition-execution-command.startTransitionExecution",
            "projectWorkUnitId is required for runtime transition start",
          );
        }

        const gate = yield* runtimeGate.evaluateStartGate({
          projectId: input.projectId,
          projectWorkUnitId: input.projectWorkUnitId,
          transitionId: input.transitionId,
          workflowId: input.workflowId,
        });

        if (!gate.passed) {
          return yield* makeCommandError(
            "transition-execution-command.startTransitionExecution",
            gate.firstBlockingReason ?? "start gate failed",
          );
        }

        const started = yield* transitionRepo.startTransitionExecution({
          projectWorkUnitId: input.projectWorkUnitId,
          transitionId: input.transitionId,
        });

        const workflowExecution = yield* workflowRepo.createWorkflowExecution({
          transitionExecutionId: started.id,
          workflowId: input.workflowId,
          workflowRole: "primary",
        });

        yield* workflowRepo.updateTransitionPrimaryWorkflowExecutionPointer({
          transitionExecutionId: started.id,
          primaryWorkflowExecutionId: workflowExecution.id,
        });

        return {
          projectWorkUnitId: started.projectWorkUnitId,
          transitionExecutionId: started.id,
          workflowExecutionId: workflowExecution.id,
        } satisfies StartTransitionExecutionOutput;
      });

    const switchActiveTransitionExecution = (input: SwitchActiveTransitionExecutionInput) =>
      Effect.gen(function* () {
        const gate = yield* runtimeGate.evaluateStartGate({
          projectId: input.projectId,
          projectWorkUnitId: input.projectWorkUnitId,
          transitionId: input.transitionId,
          workflowId: input.workflowId,
        });

        if (!gate.passed) {
          return yield* makeCommandError(
            "transition-execution-command.switchActiveTransitionExecution",
            gate.firstBlockingReason ?? "start gate failed",
          );
        }

        const switched = yield* transitionRepo.switchActiveTransitionExecution({
          projectWorkUnitId: input.projectWorkUnitId,
          transitionId: input.transitionId,
        });

        const workflowExecution = yield* workflowRepo.createWorkflowExecution({
          transitionExecutionId: switched.started.id,
          workflowId: input.workflowId,
          workflowRole: "primary",
        });

        yield* workflowRepo.updateTransitionPrimaryWorkflowExecutionPointer({
          transitionExecutionId: switched.started.id,
          primaryWorkflowExecutionId: workflowExecution.id,
        });

        return {
          supersededTransitionExecutionId: input.supersededTransitionExecutionId,
          transitionExecutionId: switched.started.id,
          workflowExecutionId: workflowExecution.id,
        } satisfies SwitchActiveTransitionExecutionOutput;
      });

    const completeTransitionExecution = (input: CompleteTransitionExecutionInput) =>
      Effect.gen(function* () {
        const detail = yield* readRepo.getTransitionExecutionDetail(input.transitionExecutionId);
        if (!detail) {
          return yield* makeCommandError(
            "transition-execution-command.completeTransitionExecution",
            "transition execution not found",
          );
        }
        if (
          detail.projectId !== input.projectId ||
          detail.transitionExecution.projectWorkUnitId !== input.projectWorkUnitId
        ) {
          return yield* makeCommandError(
            "transition-execution-command.completeTransitionExecution",
            "transition execution does not belong to project/work unit",
          );
        }
        if (detail.transitionExecution.status !== "active") {
          return yield* makeCommandError(
            "transition-execution-command.completeTransitionExecution",
            "transition execution is not active",
          );
        }
        if (detail.activeTransitionExecutionId !== detail.transitionExecution.id) {
          return yield* makeCommandError(
            "transition-execution-command.completeTransitionExecution",
            "work unit active transition pointer does not match",
          );
        }
        if (
          !detail.primaryWorkflowExecution ||
          detail.primaryWorkflowExecution.status !== "completed"
        ) {
          return yield* makeCommandError(
            "transition-execution-command.completeTransitionExecution",
            "primary workflow must be completed before transition completion",
          );
        }

        const completion = yield* runtimeGate.evaluateCompletionGate({
          projectId: input.projectId,
          projectWorkUnitId: input.projectWorkUnitId,
          transitionExecutionId: input.transitionExecutionId,
        });

        if (!completion.passed) {
          return yield* makeCommandError(
            "transition-execution-command.completeTransitionExecution",
            completion.firstBlockingReason ?? "completion gate failed",
          );
        }

        if (!completion.targetState) {
          return yield* makeCommandError(
            "transition-execution-command.completeTransitionExecution",
            "completion gate did not resolve a target state",
          );
        }

        const transitionAtomicOps = transitionRepo as TransitionExecutionAtomicOps;
        if (!transitionAtomicOps.completeTransitionExecutionAtomically) {
          return yield* makeCommandError(
            "transition-execution-command.completeTransitionExecution",
            "transition repository missing atomic completion capability",
          );
        }

        return yield* transitionAtomicOps.completeTransitionExecutionAtomically({
          transitionExecutionId: input.transitionExecutionId,
          projectWorkUnitId: input.projectWorkUnitId,
          newStateId: completion.targetState.stateId,
          newStateKey: completion.targetState.stateKey,
          newStateLabel: completion.targetState.stateLabel,
        });
      });

    const choosePrimaryWorkflowForTransitionExecution = (
      input: ChoosePrimaryWorkflowForTransitionExecutionInput,
    ) =>
      Effect.gen(function* () {
        const detail = yield* readRepo.getTransitionExecutionDetail(input.transitionExecutionId);
        if (!detail) {
          return yield* makeCommandError(
            "transition-execution-command.choosePrimaryWorkflowForTransitionExecution",
            "transition execution not found",
          );
        }
        if (
          detail.projectId !== input.projectId ||
          detail.transitionExecution.projectWorkUnitId !== input.projectWorkUnitId
        ) {
          return yield* makeCommandError(
            "transition-execution-command.choosePrimaryWorkflowForTransitionExecution",
            "transition execution does not belong to project/work unit",
          );
        }
        if (detail.transitionExecution.status !== "active") {
          return yield* makeCommandError(
            "transition-execution-command.choosePrimaryWorkflowForTransitionExecution",
            "transition execution must be active",
          );
        }

        yield* runtimeGate.evaluateCompletionGate({
          projectId: input.projectId,
          projectWorkUnitId: input.projectWorkUnitId,
          transitionExecutionId: input.transitionExecutionId,
        });

        const workflowAtomicOps = workflowRepo as WorkflowExecutionAtomicOps;
        if (!workflowAtomicOps.choosePrimaryWorkflowForTransitionExecutionAtomically) {
          return yield* makeCommandError(
            "transition-execution-command.choosePrimaryWorkflowForTransitionExecution",
            "workflow repository missing atomic choose-primary capability",
          );
        }

        return yield* workflowAtomicOps.choosePrimaryWorkflowForTransitionExecutionAtomically({
          transitionExecutionId: input.transitionExecutionId,
          workflowId: input.workflowId,
          supersededWorkflowExecutionId: detail.primaryWorkflowExecution?.id ?? null,
        });
      });

    return TransitionExecutionCommandService.of({
      startTransitionExecution,
      switchActiveTransitionExecution,
      completeTransitionExecution,
      choosePrimaryWorkflowForTransitionExecution,
    });
  }),
);
