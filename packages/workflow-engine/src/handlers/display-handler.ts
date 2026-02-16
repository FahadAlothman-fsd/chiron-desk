import { Effect } from "effect";
import type { StepHandler } from "../services/step-handler";

export const makeDisplayHandler = (): StepHandler => () =>
  Effect.succeed({
    requiresUserInput: false,
  });
