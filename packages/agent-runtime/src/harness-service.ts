import { Context } from "effect";
import * as Schema from "effect/Schema";

export const HarnessDiscoveredModel = Schema.Struct({
  provider: Schema.NonEmptyString,
  model: Schema.NonEmptyString,
  label: Schema.NonEmptyString,
  isDefault: Schema.Boolean,
  supportsReasoning: Schema.Boolean,
  supportsTools: Schema.Boolean,
  supportsAttachments: Schema.Boolean,
});
export type HarnessDiscoveredModel = typeof HarnessDiscoveredModel.Type;

export const HarnessDiscoveredProvider = Schema.Struct({
  provider: Schema.NonEmptyString,
  label: Schema.NonEmptyString,
  defaultModel: Schema.optional(Schema.NonEmptyString),
  models: Schema.Array(HarnessDiscoveredModel),
});
export type HarnessDiscoveredProvider = typeof HarnessDiscoveredProvider.Type;

export const HarnessDiscoveredAgent = Schema.Struct({
  key: Schema.NonEmptyString,
  label: Schema.NonEmptyString,
  description: Schema.optional(Schema.String),
  mode: Schema.Literal("subagent", "primary", "all"),
  defaultModel: Schema.optional(
    Schema.Struct({
      provider: Schema.NonEmptyString,
      model: Schema.NonEmptyString,
    }),
  ),
});
export type HarnessDiscoveredAgent = typeof HarnessDiscoveredAgent.Type;

export const HarnessDiscoveryMetadata = Schema.Struct({
  harness: Schema.Literal("opencode"),
  discoveredAt: Schema.NonEmptyString,
  agents: Schema.Array(HarnessDiscoveredAgent),
  providers: Schema.Array(HarnessDiscoveredProvider),
  models: Schema.Array(HarnessDiscoveredModel),
});
export type HarnessDiscoveryMetadata = typeof HarnessDiscoveryMetadata.Type;

export class HarnessDiscoveryError extends Schema.TaggedError<HarnessDiscoveryError>()(
  "HarnessDiscoveryError",
  {
    harness: Schema.NonEmptyString,
    message: Schema.String,
  },
) {}

export class HarnessService extends Context.Tag("HarnessService")<
  HarnessService,
  {
    readonly discoverMetadata: () => import("effect").Effect.Effect<
      HarnessDiscoveryMetadata,
      HarnessDiscoveryError
    >;
  }
>() {}
