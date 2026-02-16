import { Effect } from "effect";
import type { ActionStepConfig } from "../schema/action";
import { ActionService } from "../services/action-service";
import type { StepHandler } from "../services/step-handler";

export const makeActionHandler = (): StepHandler<ActionService> => (input) =>
  Effect.gen(function* () {
    const step = input.step as ActionStepConfig;
    const actionService = yield* ActionService;

    const completed = new Set<string>();
    const outputVariables: Record<string, unknown> = {};

    for (const action of step.actions) {
      const dependsOn = action.dependsOn ?? [];
      const missing = dependsOn.find((dep) => !completed.has(dep));
      if (missing) {
        return yield* Effect.fail(new Error(`Action dependency not satisfied: ${missing}`));
      }

      const result = yield* actionService.execute({
        executionId: input.executionId,
        stepId: step.id,
        action,
        variables: input.variables,
      });

      if (result.outputVariable) {
        outputVariables[result.outputVariable] = result.outputValue;
      }

      completed.add(action.id);
    }

    return {
      outputVariables,
      requiresUserInput: false,
    };
  });
