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
  WorkUnitTypeDefinition,
} from "@chiron/contracts/methodology/lifecycle";
import { Context, Effect, Layer } from "effect";

import {
  RepositoryError,
  ValidationDecodeError,
  VersionNotDraftError,
  VersionNotFoundError,
} from "../errors";
import { MethodologyVersionService } from "./methodology-version-service";
import type { UpdateDraftLifecycleResult } from "./methodology-version-service";
import type { UpdateDraftResult } from "../version-service";

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
    const versionService = yield* MethodologyVersionService;

    const updateLifecycleForWorkUnit = (
      versionId: string,
      workUnitTypeKey: string,
      mutate: (workUnit: typeof WorkUnitTypeDefinition.Type) => typeof WorkUnitTypeDefinition.Type,
      actorId: string | null,
    ) =>
      Effect.gen(function* () {
        const snapshot = yield* versionService.getAuthoringSnapshot(versionId);
        const workUnitTypes = snapshot.workUnitTypes;
        const agentTypes = snapshot.agentTypes;

        let found = false;
        const nextWorkUnits = workUnitTypes.map((workUnit) => {
          if (workUnit.key !== workUnitTypeKey) {
            return workUnit;
          }
          found = true;
          return mutate(workUnit);
        });

        if (!found) {
          return yield* Effect.fail(
            new RepositoryError({
              operation: "workUnitStateMachine.updateLifecycle",
              cause: new Error(`work unit type '${workUnitTypeKey}' not found`),
            }),
          );
        }

        return yield* versionService.updateDraftLifecycle(
          {
            versionId,
            workUnitTypes: nextWorkUnits,
            agentTypes,
          },
          actorId,
        );
      });

    const listStates = (input: GetWorkUnitStateMachineInput) =>
      Effect.gen(function* () {
        const snapshot = yield* versionService.getAuthoringSnapshot(input.versionId);
        const workUnitTypes = snapshot.workUnitTypes;
        const workUnit = workUnitTypes.find((item) => item.key === input.workUnitTypeKey);
        return workUnit ? workUnit.lifecycleStates : [];
      });

    const upsertState = (input: UpsertWorkUnitLifecycleStateInput, actorId: string | null) =>
      updateLifecycleForWorkUnit(
        input.versionId,
        input.workUnitTypeKey,
        (workUnit) => {
          const exists = workUnit.lifecycleStates.some((state) => state.key === input.state.key);
          return {
            ...workUnit,
            lifecycleStates: exists
              ? workUnit.lifecycleStates.map((state) =>
                  state.key === input.state.key ? input.state : state,
                )
              : [...workUnit.lifecycleStates, input.state],
          };
        },
        actorId,
      );

    const deleteState = (input: DeleteWorkUnitLifecycleStateInput, actorId: string | null) =>
      updateLifecycleForWorkUnit(
        input.versionId,
        input.workUnitTypeKey,
        (workUnit) => ({
          ...workUnit,
          lifecycleStates: workUnit.lifecycleStates.filter((state) => state.key !== input.stateKey),
          lifecycleTransitions: workUnit.lifecycleTransitions
            .filter((transition) =>
              input.strategy === "cleanup"
                ? transition.fromState !== input.stateKey && transition.toState !== input.stateKey
                : transition.toState !== input.stateKey,
            )
            .map((transition) =>
              input.strategy === "disconnect" && transition.fromState === input.stateKey
                ? { ...transition, fromState: undefined }
                : transition,
            ),
        }),
        actorId,
      );

    const listTransitions = (input: GetWorkUnitStateMachineInput) =>
      Effect.gen(function* () {
        const snapshot = yield* versionService.getAuthoringSnapshot(input.versionId);
        const workUnitTypes = snapshot.workUnitTypes;
        const workUnit = workUnitTypes.find((item) => item.key === input.workUnitTypeKey);
        return workUnit ? workUnit.lifecycleTransitions : [];
      });

    const upsertTransition = (
      input: UpsertWorkUnitLifecycleTransitionInput,
      actorId: string | null,
    ) =>
      updateLifecycleForWorkUnit(
        input.versionId,
        input.workUnitTypeKey,
        (workUnit) => {
          const exists = workUnit.lifecycleTransitions.some(
            (transition) => transition.transitionKey === input.transition.transitionKey,
          );
          return {
            ...workUnit,
            lifecycleTransitions: exists
              ? workUnit.lifecycleTransitions.map((transition) =>
                  transition.transitionKey === input.transition.transitionKey
                    ? input.transition
                    : transition,
                )
              : [...workUnit.lifecycleTransitions, input.transition],
          };
        },
        actorId,
      );

    const deleteTransition = (
      input: DeleteWorkUnitLifecycleTransitionInput,
      actorId: string | null,
    ) =>
      updateLifecycleForWorkUnit(
        input.versionId,
        input.workUnitTypeKey,
        (workUnit) => ({
          ...workUnit,
          lifecycleTransitions: workUnit.lifecycleTransitions.filter(
            (transition) => transition.transitionKey !== input.transitionKey,
          ),
        }),
        actorId,
      );

    const replaceConditionSets = (
      input: ReplaceWorkUnitTransitionConditionSetsInput,
      actorId: string | null,
    ) =>
      updateLifecycleForWorkUnit(
        input.versionId,
        input.workUnitTypeKey,
        (workUnit) => ({
          ...workUnit,
          lifecycleTransitions: workUnit.lifecycleTransitions.map((transition) =>
            transition.transitionKey === input.transitionKey
              ? { ...transition, conditionSets: input.conditionSets }
              : transition,
          ),
        }),
        actorId,
      );

    const replaceBindings = (
      input: ReplaceWorkUnitTransitionBindingsInput,
      actorId: string | null,
    ) =>
      Effect.gen(function* () {
        return yield* versionService.replaceTransitionBindings(input, actorId);
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
