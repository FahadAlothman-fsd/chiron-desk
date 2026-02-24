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
import type { DependencyStrength } from "@chiron/contracts/methodology/dependency";
import type { GateClass } from "@chiron/contracts/methodology/lifecycle";

const ABSENT_STATE = "__absent__";

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

      // Step 6: Build eligibility metadata with guard requirements
      const eligibleTransitions: TransitionEligibility[] = [];

      for (const transition of transitions) {
        // Find required links for this transition
        const requiredLinks = yield* lifecycleRepo.findTransitionRequiredLinks(
          input.versionId,
          transition.id,
        );

        // Map to eligibility format
        const eligibility: TransitionEligibility = {
          transitionKey: transition.transitionKey,
          fromState: currentStateKey,
          toState: states.find((s) => s.id === transition.toStateId)?.key ?? "",
          gateClass: transition.gateClass as GateClass,
          requiredLinks: requiredLinks.map(
            (link): RequiredLinkEligibility => ({
              linkTypeKey: link.linkTypeKey,
              strength: link.strength as DependencyStrength,
              required: link.required,
            }),
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
