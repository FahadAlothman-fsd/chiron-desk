import { Data, Effect } from "effect";

export type StorySeedId = "2-1";

export type StorySeedUser = {
  readonly name: string;
  readonly email: string;
  readonly password: string;
};

export type StorySeedMethodologyDefinition = {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly descriptionJson: Record<string, unknown>;
};

export type StorySeedMethodologyVersion = {
  readonly id: string;
  readonly methodologyId: string;
  readonly version: string;
  readonly status: "draft" | "published" | "retired";
  readonly displayName: string;
  readonly definitionExtensions: Record<string, unknown>;
  readonly retiredAt: Date | null;
};

export type StorySeedPlan = {
  readonly storyId: StorySeedId;
  readonly users: readonly StorySeedUser[];
  readonly methodologyDefinitions: readonly StorySeedMethodologyDefinition[];
  readonly methodologyVersions: readonly StorySeedMethodologyVersion[];
};

const STORY_2_1_PLAN: StorySeedPlan = {
  storyId: "2-1",
  users: [
    {
      name: "Chiron Operator",
      email: "operator@chiron.local",
      password: "chiron-operator-123",
    },
  ],
  methodologyDefinitions: [
    {
      id: "mdef_story_2_1_alpha",
      key: "story-2-1-alpha",
      name: "Story 2.1 Alpha",
      descriptionJson: {
        summary: "Seeded methodology for Story 2.1 deterministic catalog coverage.",
      },
    },
    {
      id: "mdef_story_2_1_beta",
      key: "story-2-1-beta",
      name: "Story 2.1 Beta",
      descriptionJson: {
        summary: "Seeded methodology with draft flow for details and versions route testing.",
      },
    },
    {
      id: "mdef_story_2_1_gamma",
      key: "story-2-1-gamma",
      name: "Story 2.1 Gamma",
      descriptionJson: {
        summary: "Seeded methodology with no versions to verify empty-version semantics.",
      },
    },
  ],
  methodologyVersions: [
    {
      id: "mver_story_2_1_alpha_v1",
      methodologyId: "mdef_story_2_1_alpha",
      version: "v1",
      status: "published",
      displayName: "Story 2.1 Alpha v1",
      definitionExtensions: {},
      retiredAt: null,
    },
    {
      id: "mver_story_2_1_alpha_v2",
      methodologyId: "mdef_story_2_1_alpha",
      version: "v2",
      status: "draft",
      displayName: "Story 2.1 Alpha v2 Draft",
      definitionExtensions: {},
      retiredAt: null,
    },
    {
      id: "mver_story_2_1_beta_v1",
      methodologyId: "mdef_story_2_1_beta",
      version: "v1",
      status: "published",
      displayName: "Story 2.1 Beta v1",
      definitionExtensions: {},
      retiredAt: null,
    },
  ],
};

const storySeedPlans: Record<StorySeedId, StorySeedPlan> = {
  "2-1": STORY_2_1_PLAN,
};

export const availableStorySeedIds = Object.keys(storySeedPlans) as StorySeedId[];

export class StorySeedNotFoundError extends Data.TaggedError("StorySeedNotFoundError")<{
  readonly storyId: string;
  readonly availableStorySeedIds: readonly StorySeedId[];
}> {}

export const formatStorySeedNotFoundError = (error: StorySeedNotFoundError): string =>
  `Unknown story seed '${error.storyId}'. Available story seeds: ${error.availableStorySeedIds.join(", ")}`;

export const getStorySeedPlan = (
  storyId: string,
): Effect.Effect<StorySeedPlan, StorySeedNotFoundError> => {
  if (storyId in storySeedPlans) {
    return Effect.succeed(storySeedPlans[storyId as StorySeedId]);
  }

  return Effect.fail(
    new StorySeedNotFoundError({
      storyId,
      availableStorySeedIds,
    }),
  );
};
