import { Layer } from "effect";

import { LifecycleService, LifecycleServiceLive } from "../lifecycle-service";
import {
  MethodologyVersionService as LegacyMethodologyVersionService,
  MethodologyVersionServiceLive as LegacyMethodologyVersionServiceLive,
} from "../version-service";
import { MethodologyVersionServiceLive } from "../services/methodology-version-service";
import { MethodologyValidationServiceLive } from "../services/methodology-validation-service";
import { PublishedMethodologyServiceLive } from "../services/published-methodology-service";

export const MethodologyEngineL1ServicesLive = Layer.mergeAll(
  MethodologyVersionServiceLive,
  MethodologyValidationServiceLive,
  PublishedMethodologyServiceLive,
);

export const MethodologyEngineL1CompatibilityLive = Layer.mergeAll(
  Layer.effect(LegacyMethodologyVersionService, LegacyMethodologyVersionServiceLive),
  Layer.effect(LifecycleService, LifecycleServiceLive),
);

export const MethodologyEngineL1Live = Layer.mergeAll(
  MethodologyEngineL1ServicesLive,
  MethodologyEngineL1CompatibilityLive,
);
