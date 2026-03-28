import { call } from "@orpc/server";
import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";

import { RuntimeGuidanceService } from "../../../../workflow-engine/src/index";

import { createProjectRuntimeRouter } from "../../routers/project-runtime";

const PUBLIC_CTX = { context: { session: null } };

const collect = async <T>(iterable: AsyncIterable<T>): Promise<T[]> => {
  const values: T[] = [];
  for await (const value of iterable) {
    values.push(value);
  }
  return values;
};

function makeRuntimeGuidanceLayer() {
  const calls = {
    getActive: 0,
    streamCandidates: 0,
  };

  const guidanceService: RuntimeGuidanceService["Type"] = {
    getActive: (input) => {
      calls.getActive += 1;
      return Effect.succeed({
        activeWorkUnitCards: [
          {
            projectWorkUnitId: "wu-1",
            workUnitTypeId: "wut-1",
            workUnitTypeKey: "WUT.ONE",
            workUnitTypeName: "Work Unit One",
            currentStateKey: "todo",
            currentStateLabel: "Todo",
            factSummary: { currentCount: 1, totalCount: 2 },
            artifactSummary: { currentCount: 0, totalCount: 1 },
            activeTransition: {
              transitionExecutionId: "te-1",
              transitionId: "t-1",
              transitionKey: "T.ONE",
              transitionName: "Start",
              toStateKey: "doing",
              toStateLabel: "Doing",
              status: "active",
            },
            activePrimaryWorkflow: {
              workflowExecutionId: "we-1",
              workflowId: "wf-1",
              workflowKey: "WF.ONE",
              workflowName: "Workflow One",
              status: "active",
            },
            actions: {
              primary: {
                kind: "open_transition",
                transitionExecutionId: "te-1",
              },
              openTransitionTarget: { transitionExecutionId: "te-1" },
              openWorkflowTarget: { workflowExecutionId: "we-1" },
            },
          },
        ],
      });
    },
    streamCandidates: (input) => {
      calls.streamCandidates += 1;
      return Effect.succeed(
        (async function* () {
          yield {
            version: "1",
            type: "bootstrap",
            cards: [
              {
                candidateCardId: "card-1",
                source: "open",
                workUnitContext: {
                  projectWorkUnitId: "wu-1",
                  workUnitTypeId: "wut-1",
                  workUnitTypeKey: "WUT.ONE",
                  workUnitTypeName: "Work Unit One",
                  currentStateKey: "todo",
                  currentStateLabel: "Todo",
                },
                summaries: {
                  facts: { currentCount: 1, totalCount: 2 },
                  artifactSlots: { currentCount: 0, totalCount: 1 },
                },
                transitions: [
                  {
                    candidateId: "cand-1",
                    transitionId: "t-1",
                    transitionKey: "T.ONE",
                    transitionName: "Start",
                    toStateKey: "doing",
                    toStateLabel: "Doing",
                    source: "open",
                  },
                ],
              },
            ],
          } as const;
          yield {
            version: "1",
            type: "transitionResult",
            candidateId: input.projectId === "project-1" ? "cand-1" : "cand-x",
            result: "available",
          } as const;
          yield {
            version: "1",
            type: "workUnitDone",
            candidateCardId: "card-1",
          } as const;
          yield { version: "1", type: "done" } as const;
        })(),
      );
    },
  };

  return {
    calls,
    layer: Layer.succeed(RuntimeGuidanceService, guidanceService),
  };
}

describe("project runtime router streams", () => {
  it("delegates getRuntimeGuidanceActive to service once", async () => {
    const testLayer = makeRuntimeGuidanceLayer();
    const router = createProjectRuntimeRouter(testLayer.layer);

    const result = await call(
      router.getRuntimeGuidanceActive,
      { projectId: "project-1" },
      PUBLIC_CTX,
    );

    expect(testLayer.calls.getActive).toBe(1);
    expect(result.activeWorkUnitCards).toHaveLength(1);
    expect(result.activeWorkUnitCards[0]?.projectWorkUnitId).toBe("wu-1");
  });

  it("streams guidance envelopes from a single delegated stream", async () => {
    const testLayer = makeRuntimeGuidanceLayer();
    const router = createProjectRuntimeRouter(testLayer.layer);

    const stream = await call(
      router.streamRuntimeGuidanceCandidates,
      { projectId: "project-1" },
      PUBLIC_CTX,
    );
    const events = await collect(stream);

    expect(testLayer.calls.streamCandidates).toBe(1);
    expect(events.map((event) => event.type)).toEqual([
      "bootstrap",
      "transitionResult",
      "workUnitDone",
      "done",
    ]);
    expect(events.every((event) => event.version === "1")).toBe(true);
  });
});
