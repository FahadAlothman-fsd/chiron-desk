import type {
  GetTransitionEligibilityInput,
  GetTransitionEligibilityOutput,
  RequiredLinkEligibility,
  TransitionEligibility,
} from "@chiron/contracts/methodology/eligibility";
import { Context, Effect } from "effect";
import { LifecycleRepository } from "./lifecycle-repository";
import { MethodologyRepository } from "./repository";
import { VersionNotFoundError } from "./errors";

const ABSENT_STATE = "__absent__";
const ALLOWED_GATE_CLASSES = new Set(["start_gate", "completion_gate"] as const);
const ALLOWED_STRENGTHS = new Set(["hard", "soft", "context"] as const);

function isGateClass(value: string): value is TransitionEligibility["gateClass"] {
  return ALLOWED_GATE_CLASSES.has(value as TransitionEligibility["gateClass"]);
}

function isDependencyStrength(value: string): value is RequiredLinkEligibility["strength"] {
  return ALLOWED_STRENGTHS.has(value as RequiredLinkEligibility["strength"]);
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
    ) => Effect.Effect<GetTransitionEligibilityOutput, VersionNotFoundError>;
  }
>() {}

export const EligibilityServiceLive = Effect.gen(function* () {
  const repo = yield* MethodologyRepository;
  const lifecycleRepo = yield* LifecycleRepository;

  const getTransitionEligibility = (
    input: GetTransitionEligibilityInput,
  ): Effect.Effect<GetTransitionEligibilityOutput, VersionNotFoundError> =>
    Effect.gen(function* () {
      // Step 1: Verify version exists
      const version = yield* repo.findVersionById(input.versionId);
      if (!version) {
        return yield* Effect.fail(new VersionNotFoundError({ versionId: input.versionId }));
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

      const transitionRequiredLinks = yield* lifecycleRepo.findTransitionRequiredLinks(
        input.versionId,
      );
      const stateKeyById = new Map(states.map((s) => [s.id, s.key]));

      // Step 6: Build eligibility metadata with guard requirements
      const eligibleTransitions: TransitionEligibility[] = [];

      for (const transition of transitions) {
        const toStateKey = stateKeyById.get(transition.toStateId);
        if (!toStateKey) {
          throw new Error(
            `Transition '${transition.transitionKey}' references missing toStateId '${transition.toStateId}'`,
          );
        }

        if (!isGateClass(transition.gateClass)) {
          throw new Error(
            `Transition '${transition.transitionKey}' has invalid gateClass '${transition.gateClass}'`,
          );
        }

        const requiredLinks = transitionRequiredLinks
          .filter((link) => link.transitionId === transition.id)
          .sort((a, b) => a.linkTypeKey.localeCompare(b.linkTypeKey));

        // Map to eligibility format
        const eligibility: TransitionEligibility = {
          transitionKey: transition.transitionKey,
          fromState: currentStateKey,
          toState: toStateKey,
          gateClass: transition.gateClass,
          requiredLinks: requiredLinks.map((link): RequiredLinkEligibility => {
            if (!isDependencyStrength(link.strength)) {
              throw new Error(
                `Transition '${transition.transitionKey}' has invalid link strength '${link.strength}' for linkType '${link.linkTypeKey}'`,
              );
            }
            return {
              linkTypeKey: link.linkTypeKey,
              strength: link.strength,
              required: link.required,
            };
          }),
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
