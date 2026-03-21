import type {
  GetTransitionEligibilityInput,
  GetTransitionEligibilityOutput,
  TransitionEligibility,
  WorkflowEligibilityDiagnostic,
} from "@chiron/contracts/methodology/eligibility";
import { Context, Effect } from "effect";
import { LifecycleRepository } from "./lifecycle-repository";
import { MethodologyRepository } from "./repository";
import { RepositoryError, VersionNotFoundError } from "./errors";

const ABSENT_STATE = "__absent__";
const ALLOWED_GATE_CLASSES = new Set(["start_gate", "completion_gate"] as const);

function isGateClass(value: string): value is TransitionEligibility["gateClass"] {
  return ALLOWED_GATE_CLASSES.has(value as TransitionEligibility["gateClass"]);
}

function projectWorkflowEligibility(
  transitionId: string,
  transitionKey: string,
  transitionBindingRows: readonly {
    transitionId: string;
    workflowKey: string | null;
  }[],
): {
  eligibleWorkflowKeys: string[];
  workflowSelectionRequired: boolean;
  workflowBlocked: boolean;
  workflowDiagnostics: WorkflowEligibilityDiagnostic[];
} {
  const boundRows = transitionBindingRows.filter((row) => row.transitionId === transitionId);
  const boundWorkflowKeys = [
    ...new Set(
      boundRows.map((row) => row.workflowKey).filter((value): value is string => value !== null),
    ),
  ].sort();
  const workflowDiagnostics: WorkflowEligibilityDiagnostic[] = [];

  if (boundRows.length === 0) {
    workflowDiagnostics.push({
      code: "NO_WORKFLOW_BOUND",
      blocking: true,
      required: `Transition '${transitionKey}' to have one or more workflow bindings`,
      observed: `Transition '${transitionKey}' has zero workflow bindings`,
      remediation: `Bind at least one workflow key to transition '${transitionKey}'`,
    });

    return {
      eligibleWorkflowKeys: [],
      workflowSelectionRequired: false,
      workflowBlocked: true,
      workflowDiagnostics,
    };
  }

  const unresolved = boundRows.filter((row) => row.workflowKey === null);
  for (const _binding of unresolved) {
    workflowDiagnostics.push({
      code: "UNRESOLVED_WORKFLOW_BINDING",
      blocking: true,
      required: `Every bound workflow for transition '${transitionKey}' to resolve to a persisted workflow`,
      observed: `Transition '${transitionKey}' has one or more unresolved workflow bindings`,
      remediation: `Re-save workflow definitions and transition bindings for transition '${transitionKey}'`,
    });
  }

  workflowDiagnostics.sort((a, b) => {
    const codeCmp = a.code.localeCompare(b.code);
    if (codeCmp !== 0) {
      return codeCmp;
    }

    return a.observed.localeCompare(b.observed);
  });

  const eligibleWorkflowKeys = boundWorkflowKeys;
  const workflowBlocked = workflowDiagnostics.length > 0 || eligibleWorkflowKeys.length === 0;

  return {
    eligibleWorkflowKeys,
    workflowSelectionRequired: !workflowBlocked && eligibleWorkflowKeys.length > 1,
    workflowBlocked,
    workflowDiagnostics,
  };
}

/**
 * Service for querying transition eligibility metadata.
 * Returns deterministic eligibility information based on lifecycle definitions (AC 11).
 */
export class EligibilityService extends Context.Tag("EligibilityService")<
  EligibilityService,
  {
    readonly getTransitionEligibility: (
      input: GetTransitionEligibilityInput,
    ) => Effect.Effect<GetTransitionEligibilityOutput, VersionNotFoundError | RepositoryError>;
  }
>() {}

export const EligibilityServiceLive = Effect.gen(function* () {
  const repo = yield* MethodologyRepository;
  const lifecycleRepo = yield* LifecycleRepository;

  const getTransitionEligibility = (
    input: GetTransitionEligibilityInput,
  ): Effect.Effect<GetTransitionEligibilityOutput, VersionNotFoundError | RepositoryError> =>
    Effect.gen(function* () {
      // Step 1: Verify version exists
      const version = yield* repo.findVersionById(input.versionId);
      if (!version) {
        return yield* new VersionNotFoundError({ versionId: input.versionId });
      }

      // Step 2: Find work unit type
      const workUnitTypes = yield* lifecycleRepo.findWorkUnitTypes(input.versionId);
      const workUnitType = workUnitTypes.find((wut) => wut.key === input.workUnitTypeKey);

      if (!workUnitType) {
        // Return empty eligibility if work unit type not found
        return {
          workUnitTypeKey: input.workUnitTypeKey,
          currentState: input.currentState ?? ABSENT_STATE,
          eligibleTransitions: [],
        };
      }

      // Step 3: Find all states for this work unit type
      const states = yield* lifecycleRepo.findLifecycleStates(input.versionId, workUnitType.id);
      const stateMap = new Map(states.map((s) => [s.key, s.id]));

      // Step 4: Determine current state ID
      // If currentState is null/undefined, treat as __absent__ (from_state_id = NULL)
      const currentStateKey = input.currentState ?? ABSENT_STATE;
      const currentStateId =
        currentStateKey === ABSENT_STATE ? null : (stateMap.get(currentStateKey) ?? null);

      // Step 5: Find eligible transitions based on current state
      // AC 11: Eligibility from definition only (not runtime evaluation)
      const transitions = yield* lifecycleRepo.findLifecycleTransitions(input.versionId, {
        workUnitTypeId: workUnitType.id,
        fromStateId: currentStateId, // NULL = __absent__, defined = specific state
      });

      const transitionConditionSets = yield* lifecycleRepo.findTransitionConditionSets(
        input.versionId,
      );
      const transitionWorkflowBindings = yield* lifecycleRepo.findTransitionWorkflowBindings(
        input.versionId,
      );
      const stateKeyById = new Map(states.map((s) => [s.id, s.key]));

      // Step 6: Build eligibility metadata with guard requirements
      const eligibleTransitions: TransitionEligibility[] = [];

      for (const transition of transitions) {
        const toStateKey = transition.toStateId
          ? (stateKeyById.get(transition.toStateId) ?? null)
          : null;
        if (!toStateKey) {
          continue;
        }

        const conditionSets = transitionConditionSets
          .filter((conditionSet) => conditionSet.transitionId === transition.id)
          .sort((a, b) => a.key.localeCompare(b.key));

        const derivedGateClass = conditionSets.some(
          (conditionSet) => conditionSet.phase === "completion",
        )
          ? "completion_gate"
          : "start_gate";

        if (!isGateClass(derivedGateClass)) {
          throw new Error(
            `Transition '${transition.transitionKey}' has invalid gateClass '${derivedGateClass}'`,
          );
        }

        // Map to eligibility format
        const eligibility: TransitionEligibility = {
          transitionKey: transition.transitionKey,
          fromState: currentStateKey,
          toState: toStateKey,
          gateClass: derivedGateClass,
          conditionSets: conditionSets.map((conditionSet) => ({
            key: conditionSet.key,
            phase: conditionSet.phase === "completion" ? "completion" : "start",
            mode: conditionSet.mode === "any" ? "any" : "all",
            groups: Array.isArray(conditionSet.groupsJson) ? conditionSet.groupsJson : [],
            guidance:
              typeof conditionSet.guidanceJson === "string" ? conditionSet.guidanceJson : undefined,
          })),
          ...projectWorkflowEligibility(
            transition.id,
            transition.transitionKey,
            transitionWorkflowBindings,
          ),
        };

        eligibleTransitions.push(eligibility);
      }

      // Step 7: Sort deterministically by transitionKey for consistent output (AC 11)
      eligibleTransitions.sort((a, b) => a.transitionKey.localeCompare(b.transitionKey));

      return {
        workUnitTypeKey: input.workUnitTypeKey,
        currentState: currentStateKey,
        eligibleTransitions,
      };
    });

  return EligibilityService.of({
    getTransitionEligibility,
  });
});
