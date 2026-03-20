import {
  type DeleteWorkUnitLifecycleStateInput,
  type DeleteWorkUnitLifecycleTransitionInput,
  type GetWorkUnitStateMachineInput,
  LifecycleTransition,
  LifecycleState,
  type ReplaceWorkUnitTransitionBindingsInput,
  type ReplaceWorkUnitTransitionConditionSetsInput,
  type UpsertWorkUnitLifecycleStateInput,
  type UpsertWorkUnitLifecycleTransitionInput,
} from "@chiron/contracts/methodology/lifecycle";
import { Context, Effect, Layer } from "effect";

import {
  RepositoryError,
  ValidationDecodeError,
  VersionNotDraftError,
  VersionNotFoundError,
} from "../errors";
import { LifecycleRepository } from "../lifecycle-repository";
import { MethodologyRepository, type MethodologyVersionRow } from "../repository";
import type { UpdateDraftResult } from "../version-service";
import type { UpdateDraftLifecycleResult } from "./methodology-version-service";

export class WorkUnitStateMachineService extends Context.Tag("WorkUnitStateMachineService")<
  WorkUnitStateMachineService,
  {
    readonly listStates: (
      input: GetWorkUnitStateMachineInput,
    ) => Effect.Effect<
      readonly (typeof LifecycleState.Type)[],
      VersionNotFoundError | ValidationDecodeError | RepositoryError
    >;
    readonly upsertState: (
      input: UpsertWorkUnitLifecycleStateInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftLifecycleResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
    readonly deleteState: (
      input: DeleteWorkUnitLifecycleStateInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftLifecycleResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
    readonly listTransitions: (
      input: GetWorkUnitStateMachineInput,
    ) => Effect.Effect<
      readonly (typeof LifecycleTransition.Type)[],
      VersionNotFoundError | ValidationDecodeError | RepositoryError
    >;
    readonly upsertTransition: (
      input: UpsertWorkUnitLifecycleTransitionInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftLifecycleResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
    readonly deleteTransition: (
      input: DeleteWorkUnitLifecycleTransitionInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftLifecycleResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
    readonly replaceConditionSets: (
      input: ReplaceWorkUnitTransitionConditionSetsInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftLifecycleResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
    readonly replaceBindings: (
      input: ReplaceWorkUnitTransitionBindingsInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
  }
>() {}

export const WorkUnitStateMachineServiceLive = Layer.effect(
  WorkUnitStateMachineService,
  Effect.gen(function* () {
    const repo = yield* MethodologyRepository;
    const lifecycleRepo = yield* LifecycleRepository;

    const ensureDraftVersion = (
      versionId: string,
    ): Effect.Effect<
      MethodologyVersionRow,
      VersionNotFoundError | VersionNotDraftError | RepositoryError
    > =>
      Effect.gen(function* () {
        const version = yield* repo.findVersionById(versionId);
        if (!version) {
          return yield* Effect.fail(new VersionNotFoundError({ versionId }));
        }
        if (version.status !== "draft") {
          return yield* Effect.fail(
            new VersionNotDraftError({ versionId: version.id, currentStatus: version.status }),
          );
        }
        return version;
      });

    const loadWorkUnitStateMachine = (input: GetWorkUnitStateMachineInput) =>
      Effect.gen(function* () {
        const workUnitTypeRows = yield* lifecycleRepo.findWorkUnitTypes(input.versionId);
        const workUnitTypeRow = workUnitTypeRows.find((row) => row.key === input.workUnitTypeKey);
        if (!workUnitTypeRow) {
          return yield* Effect.fail(
            new RepositoryError({
              operation: "workUnitStateMachine.loadWorkUnitStateMachine",
              cause: new Error(`work unit type '${input.workUnitTypeKey}' not found`),
            }),
          );
        }

        const [stateRows, transitionRows, conditionSetRows] = yield* Effect.all([
          lifecycleRepo.findLifecycleStates(input.versionId, workUnitTypeRow.id),
          lifecycleRepo.findLifecycleTransitions(input.versionId, {
            workUnitTypeId: workUnitTypeRow.id,
          }),
          lifecycleRepo.findTransitionConditionSets(input.versionId),
        ]);

        const stateKeyById = new Map(stateRows.map((row) => [row.id, row.key] as const));
        const conditionSetsByTransitionId = new Map<
          string,
          Array<(typeof conditionSetRows)[number]>
        >();

        for (const conditionSetRow of conditionSetRows) {
          const current = conditionSetsByTransitionId.get(conditionSetRow.transitionId) ?? [];
          current.push(conditionSetRow);
          conditionSetsByTransitionId.set(conditionSetRow.transitionId, current);
        }

        const states: LifecycleState[] = stateRows.map((row) => ({
          key: row.key,
          displayName: row.displayName ?? undefined,
          description: typeof row.descriptionJson === "string" ? row.descriptionJson : undefined,
        }));

        const transitions: LifecycleTransition[] = [];
        for (const row of transitionRows) {
          const toState = row.toStateId ? stateKeyById.get(row.toStateId) : undefined;
          if (!toState) {
            continue;
          }

          const conditionSets: LifecycleTransition["conditionSets"] = (
            conditionSetsByTransitionId.get(row.id) ?? []
          ).map((conditionSetRow) => ({
            key: conditionSetRow.key,
            phase: conditionSetRow.phase === "completion" ? "completion" : "start",
            mode: conditionSetRow.mode === "any" ? "any" : "all",
            groups: Array.isArray(conditionSetRow.groupsJson) ? conditionSetRow.groupsJson : [],
            guidance:
              typeof conditionSetRow.guidanceJson === "string"
                ? conditionSetRow.guidanceJson
                : undefined,
          }));

          const fromState =
            row.fromStateId === null ? undefined : stateKeyById.get(row.fromStateId);
          const transition: LifecycleTransition = {
            transitionKey: row.transitionKey,
            toState,
            conditionSets,
            ...(fromState ? { fromState } : {}),
          };

          transitions.push(transition);
        }

        return {
          versionId: input.versionId,
          workUnitTypeKey: input.workUnitTypeKey,
          states,
          transitions,
        };
      });

    const toLifecycleResult = (version: MethodologyVersionRow) =>
      Effect.succeed({
        version,
        validation: { valid: true, diagnostics: [] },
      } satisfies UpdateDraftLifecycleResult);

    const toWorkflowResult = (version: MethodologyVersionRow) =>
      Effect.succeed({
        version,
        diagnostics: { valid: true, diagnostics: [] },
      } satisfies UpdateDraftResult);

    const recordLifecycleEvent = (
      versionId: string,
      actorId: string | null,
      changedFieldsJson: Record<string, unknown>,
    ) =>
      repo.recordEvent({
        methodologyVersionId: versionId,
        eventType: "lifecycle_updated",
        actorId,
        changedFieldsJson,
        diagnosticsJson: null,
      });

    const listStates = (input: GetWorkUnitStateMachineInput) =>
      Effect.gen(function* () {
        const workUnitStateMachine = yield* loadWorkUnitStateMachine(input);
        return workUnitStateMachine.states;
      });

    const upsertState = (input: UpsertWorkUnitLifecycleStateInput, actorId: string | null) =>
      Effect.gen(function* () {
        const version = yield* ensureDraftVersion(input.versionId);
        if (!repo.replaceWorkUnitLifecycleStates) {
          return yield* Effect.fail(
            new RepositoryError({
              operation: "workUnitStateMachine.upsertState",
              cause: new Error("Lifecycle state repository capability is not configured"),
            }),
          );
        }

        const stateMachine = yield* loadWorkUnitStateMachine({
          versionId: input.versionId,
          workUnitTypeKey: input.workUnitTypeKey,
        });

        const exists = stateMachine.states.some((state) => state.key === input.state.key);
        const states = exists
          ? stateMachine.states.map((state) =>
              state.key === input.state.key ? input.state : state,
            )
          : [...stateMachine.states, input.state];

        yield* repo.replaceWorkUnitLifecycleStates({
          versionId: input.versionId,
          workUnitTypeKey: input.workUnitTypeKey,
          states,
        });

        yield* recordLifecycleEvent(input.versionId, actorId, {
          operation: "replace_lifecycle_states",
          workUnitTypeKey: input.workUnitTypeKey,
        });

        return yield* toLifecycleResult(version);
      });

    const deleteState = (input: DeleteWorkUnitLifecycleStateInput, actorId: string | null) =>
      Effect.gen(function* () {
        const version = yield* ensureDraftVersion(input.versionId);
        if (!repo.replaceWorkUnitLifecycleStates || !repo.replaceWorkUnitLifecycleTransitions) {
          return yield* Effect.fail(
            new RepositoryError({
              operation: "workUnitStateMachine.deleteState",
              cause: new Error("Lifecycle repository capabilities are not configured"),
            }),
          );
        }

        const stateMachine = yield* loadWorkUnitStateMachine({
          versionId: input.versionId,
          workUnitTypeKey: input.workUnitTypeKey,
        });

        const states = stateMachine.states.filter((state) => state.key !== input.stateKey);
        const transitions = stateMachine.transitions
          .filter((transition) =>
            input.strategy === "cleanup"
              ? transition.fromState !== input.stateKey && transition.toState !== input.stateKey
              : transition.toState !== input.stateKey,
          )
          .map((transition) =>
            input.strategy === "disconnect" && transition.fromState === input.stateKey
              ? { ...transition, fromState: undefined }
              : transition,
          );

        yield* repo.replaceWorkUnitLifecycleStates({
          versionId: input.versionId,
          workUnitTypeKey: input.workUnitTypeKey,
          states,
        });
        yield* repo.replaceWorkUnitLifecycleTransitions({
          versionId: input.versionId,
          workUnitTypeKey: input.workUnitTypeKey,
          transitions,
        });

        yield* recordLifecycleEvent(input.versionId, actorId, {
          operation: "replace_lifecycle_states",
          workUnitTypeKey: input.workUnitTypeKey,
        });

        return yield* toLifecycleResult(version);
      });

    const listTransitions = (input: GetWorkUnitStateMachineInput) =>
      Effect.gen(function* () {
        const workUnitStateMachine = yield* loadWorkUnitStateMachine(input);
        return workUnitStateMachine.transitions;
      });

    const upsertTransition = (
      input: UpsertWorkUnitLifecycleTransitionInput,
      actorId: string | null,
    ) =>
      Effect.gen(function* () {
        const version = yield* ensureDraftVersion(input.versionId);
        if (!repo.replaceWorkUnitLifecycleTransitions) {
          return yield* Effect.fail(
            new RepositoryError({
              operation: "workUnitStateMachine.upsertTransition",
              cause: new Error("Lifecycle transition repository capability is not configured"),
            }),
          );
        }

        const stateMachine = yield* loadWorkUnitStateMachine({
          versionId: input.versionId,
          workUnitTypeKey: input.workUnitTypeKey,
        });

        const exists = stateMachine.transitions.some(
          (transition) => transition.transitionKey === input.transition.transitionKey,
        );
        const transitions = exists
          ? stateMachine.transitions.map((transition) =>
              transition.transitionKey === input.transition.transitionKey
                ? input.transition
                : transition,
            )
          : [...stateMachine.transitions, input.transition];

        yield* repo.replaceWorkUnitLifecycleTransitions({
          versionId: input.versionId,
          workUnitTypeKey: input.workUnitTypeKey,
          transitions,
        });

        yield* recordLifecycleEvent(input.versionId, actorId, {
          operation: "replace_lifecycle_transitions",
          workUnitTypeKey: input.workUnitTypeKey,
        });

        return yield* toLifecycleResult(version);
      });

    const deleteTransition = (
      input: DeleteWorkUnitLifecycleTransitionInput,
      actorId: string | null,
    ) =>
      Effect.gen(function* () {
        const version = yield* ensureDraftVersion(input.versionId);
        if (!repo.replaceWorkUnitLifecycleTransitions) {
          return yield* Effect.fail(
            new RepositoryError({
              operation: "workUnitStateMachine.deleteTransition",
              cause: new Error("Lifecycle transition repository capability is not configured"),
            }),
          );
        }

        const stateMachine = yield* loadWorkUnitStateMachine({
          versionId: input.versionId,
          workUnitTypeKey: input.workUnitTypeKey,
        });

        const transitions = stateMachine.transitions.filter(
          (transition) => transition.transitionKey !== input.transitionKey,
        );

        yield* repo.replaceWorkUnitLifecycleTransitions({
          versionId: input.versionId,
          workUnitTypeKey: input.workUnitTypeKey,
          transitions,
        });

        yield* recordLifecycleEvent(input.versionId, actorId, {
          operation: "replace_lifecycle_transitions",
          workUnitTypeKey: input.workUnitTypeKey,
        });

        return yield* toLifecycleResult(version);
      });

    const replaceConditionSets = (
      input: ReplaceWorkUnitTransitionConditionSetsInput,
      actorId: string | null,
    ) =>
      Effect.gen(function* () {
        const version = yield* ensureDraftVersion(input.versionId);
        if (!repo.replaceWorkUnitTransitionConditionSets) {
          return yield* Effect.fail(
            new RepositoryError({
              operation: "workUnitStateMachine.replaceConditionSets",
              cause: new Error("Transition condition-set repository capability is not configured"),
            }),
          );
        }

        yield* repo.replaceWorkUnitTransitionConditionSets({
          versionId: input.versionId,
          workUnitTypeKey: input.workUnitTypeKey,
          transitionKey: input.transitionKey,
          conditionSets: input.conditionSets,
        });

        yield* recordLifecycleEvent(input.versionId, actorId, {
          operation: "replace_transition_condition_sets",
          workUnitTypeKey: input.workUnitTypeKey,
          transitionKey: input.transitionKey,
        });

        return yield* toLifecycleResult(version);
      });

    const replaceBindings = (
      input: ReplaceWorkUnitTransitionBindingsInput,
      actorId: string | null,
    ) =>
      Effect.gen(function* () {
        const version = yield* ensureDraftVersion(input.versionId);

        if (!repo.replaceTransitionWorkflowBindings) {
          return yield* Effect.fail(
            new RepositoryError({
              operation: "workUnitStateMachine.replaceBindings",
              cause: new Error("Workflow binding repository capability is not configured"),
            }),
          );
        }

        yield* repo.replaceTransitionWorkflowBindings({
          versionId: input.versionId,
          workUnitTypeKey: input.workUnitTypeKey,
          transitionKey: input.transitionKey,
          workflowKeys: input.workflowKeys,
        });

        yield* recordLifecycleEvent(input.versionId, actorId, {
          operation: "replace_transition_workflow_bindings",
          workUnitTypeKey: input.workUnitTypeKey,
          transitionKey: input.transitionKey,
        });

        return yield* toWorkflowResult(version);
      });

    return WorkUnitStateMachineService.of({
      listStates,
      upsertState,
      deleteState,
      listTransitions,
      upsertTransition,
      deleteTransition,
      replaceConditionSets,
      replaceBindings,
    });
  }),
);
