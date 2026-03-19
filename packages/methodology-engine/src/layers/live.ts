import { Layer } from "effect";

import { MethodologyVersionServiceLive } from "../services/methodology-version-service";
import { MethodologyValidationServiceLive } from "../services/methodology-validation-service";
import { PublishedMethodologyServiceLive } from "../services/published-methodology-service";

const MethodologyEngineL1ServicesUnwired = Layer.mergeAll(
  MethodologyVersionServiceLive,
  MethodologyValidationServiceLive,
  PublishedMethodologyServiceLive,
);

export const MethodologyEngineL1ServicesLive = MethodologyEngineL1ServicesUnwired;

export const MethodologyEngineL1Live = MethodologyEngineL1ServicesLive;
