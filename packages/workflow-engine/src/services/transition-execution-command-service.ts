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
import { LifecycleRepository } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";
import { Context, Effect, Layer } from "effect";
import { Option } from "effect";

import { RepositoryError } from "../errors";
import { ExecutionReadRepository } from "../repositories/execution-read-repository";
import { ProjectWorkUnitRepository } from "../repositories/project-work-unit-repository";
import { TransitionExecutionRepository } from "../repositories/transition-execution-repository";
import { WorkflowExecutionRepository } from "../repositories/workflow-execution-repository";
import { RuntimeGateService } from "./runtime-gate-service";
import { toRuntimeConditionTree } from "./transition-gate-conditions";
import { WorkflowContextExternalPrefillService } from "./workflow-context-external-prefill-service";

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

const mapGateError =
  (operation: string) =>
  (error: unknown): RepositoryError =>
    error instanceof RepositoryError
      ? error
      : new RepositoryError({
          operation,
          cause: error instanceof Error ? error : new Error(String(error)),
        });

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
    const projectWorkUnitRepo = yield* ProjectWorkUnitRepository;
    const readRepo = yield* ExecutionReadRepository;
    const runtimeGate = yield* RuntimeGateService;
    const contextExternalPrefillService = yield* Effect.serviceOption(
      WorkflowContextExternalPrefillService,
    );
    const projectContextRepository = yield* ProjectContextRepository;
    const lifecycleRepository = yield* LifecycleRepository;

    const resolveTransitionGateContext = (input: {
      projectId: string;
      projectWorkUnitId?: string;
      workUnitTypeId?: string;
      transitionId: string;
      operation: string;
    }) =>
      Effect.gen(function* () {
        const projectPin = yield* projectContextRepository.findProjectPin(input.projectId);
        if (!projectPin) {
          return yield* makeCommandError(
            input.operation,
            `project pin not found for project '${input.projectId}'`,
          );
        }

        const workUnitTypeId = yield* Effect.gen(function* () {
          if (input.projectWorkUnitId) {
            const projectWorkUnit = yield* projectWorkUnitRepo.getProjectWorkUnitById(
              input.projectWorkUnitId,
            );
            if (!projectWorkUnit) {
              return yield* makeCommandError(
                input.operation,
                `project work unit '${input.projectWorkUnitId}' not found`,
              );
            }
            if (projectWorkUnit.projectId !== input.projectId) {
              return yield* makeCommandError(
                input.operation,
                `project work unit '${input.projectWorkUnitId}' does not belong to project '${input.projectId}'`,
              );
            }

            return projectWorkUnit.workUnitTypeId;
          }

          if (input.workUnitTypeId) {
            return input.workUnitTypeId;
          }

          return yield* makeCommandError(
            input.operation,
            "either projectWorkUnitId or workUnitTypeId is required",
          );
        });

        const [lifecycleTransitions, lifecycleStates, transitionConditionSets] = yield* Effect.all([
          lifecycleRepository.findLifecycleTransitions(projectPin.methodologyVersionId, {
            workUnitTypeId,
          }),
          lifecycleRepository.findLifecycleStates(projectPin.methodologyVersionId, workUnitTypeId),
          lifecycleRepository.findTransitionConditionSets(
            projectPin.methodologyVersionId,
            input.transitionId,
          ),
        ]);

        const transition = lifecycleTransitions.find(
          (row) => row.id === input.transitionId && row.workUnitTypeId === workUnitTypeId,
        );
        if (!transition) {
          return yield* makeCommandError(
            input.operation,
            `transition '${input.transitionId}' not found for work unit type '${workUnitTypeId}'`,
          );
        }

        const startSets = transitionConditionSets
          .filter((conditionSet) => conditionSet.phase !== "completion")
          .sort((a, b) => a.key.localeCompare(b.key));

        const completionSets = transitionConditionSets
          .filter((conditionSet) => conditionSet.phase === "completion")
          .sort((a, b) => a.key.localeCompare(b.key));

        const stateById = new Map(lifecycleStates.map((state) => [state.id, state] as const));
        const targetState = transition.toStateId
          ? (stateById.get(transition.toStateId) ?? null)
          : null;

        return {
          workUnitTypeId,
          transitionFromStateId: transition.fromStateId ?? undefined,
          startGateConditionTree: toRuntimeConditionTree(startSets),
          completionGateConditionTree: toRuntimeConditionTree(completionSets),
          targetState: targetState
            ? {
                stateId: targetState.id,
                stateKey: targetState.key,
                stateLabel: targetState.displayName ?? targetState.key,
              }
            : undefined,
        };
      });

    const startTransitionExecution = (input: StartTransitionExecutionInput) =>
      Effect.gen(function* () {
        const resolvedStart = yield* Effect.gen(function* () {
          if (input.workUnit.mode === "existing") {
            const transitionContext = yield* resolveTransitionGateContext({
              projectId: input.projectId,
              projectWorkUnitId: input.workUnit.projectWorkUnitId,
              transitionId: input.transitionId,
              operation: "transition-execution-command.startTransitionExecution",
            });

            return {
              projectWorkUnitId: input.workUnit.projectWorkUnitId,
              transitionContext,
            };
          }

          const transitionContext = yield* resolveTransitionGateContext({
            projectId: input.projectId,
            workUnitTypeId: input.workUnit.workUnitTypeId,
            transitionId: input.transitionId,
            operation: "transition-execution-command.startTransitionExecution",
          });

          const createdProjectWorkUnit = yield* projectWorkUnitRepo
            .createProjectWorkUnit({
              projectId: input.projectId,
              workUnitTypeId: input.workUnit.workUnitTypeId,
              currentStateId: null,
            })
            .pipe(
              Effect.mapError(
                (error) =>
                  new RepositoryError({
                    operation:
                      "transition-execution-command.startTransitionExecution.createProjectWorkUnit",
                    cause: error,
                  }),
              ),
            );

          return {
            projectWorkUnitId: createdProjectWorkUnit.id,
            transitionContext,
          };
        });

        const gate = yield* runtimeGate
          .evaluateStartGate({
            projectId: input.projectId,
            projectWorkUnitId: resolvedStart.projectWorkUnitId,
            conditionTree: resolvedStart.transitionContext.startGateConditionTree,
          })
          .pipe(
            Effect.mapError(mapGateError("transition-execution-command.startTransitionExecution")),
          );

        if (gate.result !== "available") {
          return yield* makeCommandError(
            "transition-execution-command.startTransitionExecution",
            gate.firstReason ?? "start gate failed",
          );
        }

        const started = yield* transitionRepo.startTransitionExecution({
          projectWorkUnitId: resolvedStart.projectWorkUnitId,
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

        if (Option.isSome(contextExternalPrefillService)) {
          yield* contextExternalPrefillService.value.prefillFromExternalBindings({
            projectId: input.projectId,
            workflowExecutionId: workflowExecution.id,
          });
        }

        return {
          projectWorkUnitId: started.projectWorkUnitId,
          transitionExecutionId: started.id,
          workflowExecutionId: workflowExecution.id,
        } satisfies StartTransitionExecutionOutput;
      });

    const switchActiveTransitionExecution = (input: SwitchActiveTransitionExecutionInput) =>
      Effect.gen(function* () {
        const transitionContext = yield* resolveTransitionGateContext({
          projectId: input.projectId,
          projectWorkUnitId: input.projectWorkUnitId,
          transitionId: input.transitionId,
          operation: "transition-execution-command.switchActiveTransitionExecution",
        });

        const gate = yield* runtimeGate
          .evaluateStartGate({
            projectId: input.projectId,
            projectWorkUnitId: input.projectWorkUnitId,
            conditionTree: transitionContext.startGateConditionTree,
          })
          .pipe(
            Effect.mapError(
              mapGateError("transition-execution-command.switchActiveTransitionExecution"),
            ),
          );

        if (gate.result !== "available") {
          return yield* makeCommandError(
            "transition-execution-command.switchActiveTransitionExecution",
            gate.firstReason ?? "start gate failed",
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

        if (Option.isSome(contextExternalPrefillService)) {
          yield* contextExternalPrefillService.value.prefillFromExternalBindings({
            projectId: input.projectId,
            workflowExecutionId: workflowExecution.id,
          });
        }

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

        const transitionContext = yield* resolveTransitionGateContext({
          projectId: input.projectId,
          projectWorkUnitId: input.projectWorkUnitId,
          transitionId: detail.transitionExecution.transitionId,
          operation: "transition-execution-command.completeTransitionExecution",
        });

        const completion = yield* runtimeGate
          .evaluateCompletionGate({
            projectId: input.projectId,
            projectWorkUnitId: input.projectWorkUnitId,
            conditionTree: transitionContext.completionGateConditionTree,
          })
          .pipe(
            Effect.mapError(
              mapGateError("transition-execution-command.completeTransitionExecution"),
            ),
          );

        if (completion.result !== "available") {
          return yield* makeCommandError(
            "transition-execution-command.completeTransitionExecution",
            completion.firstReason ?? "completion gate failed",
          );
        }

        const targetState = transitionContext.targetState;

        if (!targetState) {
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
          newStateId: targetState.stateId,
          newStateKey: targetState.stateKey,
          newStateLabel: targetState.stateLabel,
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
        if (detail.primaryWorkflowExecution?.status === "active") {
          return yield* makeCommandError(
            "transition-execution-command.choosePrimaryWorkflowForTransitionExecution",
            "primary workflow must finish before choosing another primary workflow",
          );
        }

        const transitionContext = yield* resolveTransitionGateContext({
          projectId: input.projectId,
          projectWorkUnitId: input.projectWorkUnitId,
          transitionId: detail.transitionExecution.transitionId,
          operation: "transition-execution-command.choosePrimaryWorkflowForTransitionExecution",
        });

        yield* runtimeGate
          .evaluateCompletionGate({
            projectId: input.projectId,
            projectWorkUnitId: input.projectWorkUnitId,
            conditionTree: transitionContext.completionGateConditionTree,
          })
          .pipe(
            Effect.mapError(
              mapGateError(
                "transition-execution-command.choosePrimaryWorkflowForTransitionExecution",
              ),
            ),
            Effect.flatMap((completion) =>
              completion.result === "blocked"
                ? Effect.void
                : makeCommandError(
                    "transition-execution-command.choosePrimaryWorkflowForTransitionExecution",
                    "choose another primary workflow is only available while the completion gate is blocked",
                  ),
            ),
          );

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
