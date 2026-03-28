import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => () => ({
    useParams: () => ({ projectId: "project-1" }),
    useRouteContext: () => ({ orpc: {}, queryClient: {} }),
  }),
}));

vi.mock("@/components/runtime/runtime-guidance-sections", () => ({
  RuntimeGuidanceSections: () => null,
}));

vi.mock("@/components/runtime/runtime-start-gate-dialog", () => ({
  RuntimeStartGateDialog: () => null,
}));

vi.mock("@/features/methodologies/workspace-shell", () => ({
  MethodologyWorkspaceShell: () => null,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" "),
}));

import {
  applyRuntimeGuidanceStreamEvent,
  initialRuntimeGuidanceStreamState,
} from "../../routes/projects.$projectId.transitions";

describe("runtime guidance stream reconnect state", () => {
  it("discards prior transition results and done cards on new bootstrap", () => {
    const firstBootstrap = {
      version: "1" as const,
      type: "bootstrap" as const,
      cards: [
        {
          candidateCardId: "card-old",
          source: "open" as const,
          workUnitContext: {
            projectWorkUnitId: "wu-old",
            workUnitTypeId: "wut-old",
            workUnitTypeKey: "WU.OLD",
            workUnitTypeName: "Old Work Unit",
            currentStateKey: "draft",
            currentStateLabel: "Draft",
          },
          summaries: {
            facts: { currentCount: 1, totalCount: 2 },
            artifactSlots: { currentCount: 0, totalCount: 1 },
          },
          transitions: [
            {
              candidateId: "cand-old",
              transitionId: "t-old",
              transitionKey: "TR.OLD",
              transitionName: "Transition Old",
              toStateKey: "next",
              toStateLabel: "Next",
              source: "open" as const,
            },
          ],
        },
      ],
    };

    const withOldTransitionResult = applyRuntimeGuidanceStreamEvent(
      applyRuntimeGuidanceStreamEvent(initialRuntimeGuidanceStreamState, firstBootstrap),
      {
        version: "1" as const,
        type: "transitionResult" as const,
        candidateId: "cand-old",
        result: "blocked" as const,
        firstReason: "old reason",
      },
    );

    const withOldDoneMarker = applyRuntimeGuidanceStreamEvent(withOldTransitionResult, {
      version: "1" as const,
      type: "workUnitDone" as const,
      candidateCardId: "card-old",
    });

    expect(withOldDoneMarker.transitionResults["cand-old"]?.result).toBe("blocked");
    expect(withOldDoneMarker.completedCandidateCards.has("card-old")).toBe(true);

    const secondBootstrap = {
      version: "1" as const,
      type: "bootstrap" as const,
      cards: [
        {
          candidateCardId: "card-new",
          source: "future" as const,
          workUnitContext: {
            workUnitTypeId: "wut-new",
            workUnitTypeKey: "WU.NEW",
            workUnitTypeName: "New Work Unit",
            currentStateLabel: "Absent",
          },
          summaries: {
            facts: { currentCount: 0, totalCount: 1 },
            artifactSlots: { currentCount: 0, totalCount: 1 },
          },
          transitions: [
            {
              candidateId: "cand-new",
              transitionId: "t-new",
              transitionKey: "TR.NEW",
              transitionName: "Transition New",
              toStateKey: "draft",
              toStateLabel: "Draft",
              source: "future" as const,
            },
          ],
        },
      ],
    };

    const rehydrated = applyRuntimeGuidanceStreamEvent(withOldDoneMarker, secondBootstrap);

    expect(rehydrated.candidateCards).toHaveLength(1);
    expect(rehydrated.candidateCards[0]?.candidateCardId).toBe("card-new");
    expect(Object.keys(rehydrated.transitionResults)).toEqual([]);
    expect(rehydrated.completedCandidateCards.size).toBe(0);
    expect(rehydrated.streamStatus).toBe("streaming");
  });
});
