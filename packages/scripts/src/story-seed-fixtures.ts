import { Data, Effect } from "effect";

export type StorySeedId = "2-7";

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
  readonly status: "draft" | "active" | "retired";
  readonly displayName: string;
  readonly retiredAt: Date | null;
};

export type StorySeedPlan = {
  readonly storyId: StorySeedId;
  readonly users: readonly StorySeedUser[];
  readonly methodologyDefinitions: readonly StorySeedMethodologyDefinition[];
  readonly methodologyVersions: readonly StorySeedMethodologyVersion[];
};

const STORY_2_7_PLAN: StorySeedPlan = {
  storyId: "2-7",
  users: [
    {
      name: "Chiron Operator",
      email: "operator@chiron.local",
      password: "chiron-operator-123",
    },
  ],
  methodologyDefinitions: [
    {
      id: "mdef_story_2_7_bmad_v1",
      key: "bmad.v1",
      name: "BMAD v1",
      descriptionJson: {
        summary: "Project-context-only canonical mapping for Story 2.7.",
      },
    },
  ],
  methodologyVersions: [
    {
      id: "mver_bmad_project_context_only_draft",
      methodologyId: "mdef_story_2_7_bmad_v1",
      version: "v1",
      status: "active",
      displayName: "BMAD v1",
      retiredAt: null,
    },
  ],
};

const storySeedPlans: Record<StorySeedId, StorySeedPlan> = {
  "2-7": STORY_2_7_PLAN,
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
