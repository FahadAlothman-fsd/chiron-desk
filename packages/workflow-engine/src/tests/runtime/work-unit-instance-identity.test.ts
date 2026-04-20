import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";

import { LifecycleRepository } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";

import { ArtifactRepository } from "../../repositories/artifact-repository";
import { ExecutionReadRepository } from "../../repositories/execution-read-repository";
import { ProjectWorkUnitRepository } from "../../repositories/project-work-unit-repository";
import { WorkUnitFactRepository } from "../../repositories/work-unit-fact-repository";
import { AgentStepContextReadService } from "../../services/runtime/agent-step-context-read-service";
import {
  RuntimeWorkUnitService,
  RuntimeWorkUnitServiceLive,
} from "../../services/runtime-work-unit-service";
import { makeAgentStepRuntimeTestContext } from "./agent-step-runtime-test-support";

const now = new Date("2026-04-19T00:00:00.000Z");

const projectWorkUnits = [
  {
    id: "story-wu-1",
    projectId: "project-1",
    workUnitTypeId: "wu-type-story",
    workUnitKey: "story-1",
    instanceNumber: 1,
    displayName: "Alpha Story",
    currentStateId: "state-todo",
    activeTransitionExecutionId: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "story-wu-2",
    projectId: "project-1",
    workUnitTypeId: "wu-type-story",
    workUnitKey: "story-2",
    instanceNumber: 2,
    displayName: "Beta Story",
    currentStateId: "state-todo",
    activeTransitionExecutionId: null,
    createdAt: new Date(now.getTime() + 1_000),
    updatedAt: new Date(now.getTime() + 1_000),
  },
  {
    id: "setup-wu-1",
    projectId: "project-1",
    workUnitTypeId: "wu-type-setup",
    workUnitKey: "setup-1",
    instanceNumber: 1,
    displayName: "Ignored",
    currentStateId: "state-todo",
    activeTransitionExecutionId: null,
    createdAt: new Date(now.getTime() + 2_000),
    updatedAt: new Date(now.getTime() + 2_000),
  },
] as const;

const runtimeWorkUnitTestLayer = RuntimeWorkUnitServiceLive.pipe(
  Layer.provideMerge(
    Layer.succeed(ProjectWorkUnitRepository, {
      createProjectWorkUnit: () => Effect.die("unused"),
      listProjectWorkUnitsByProject: (projectId: string) =>
        Effect.succeed(projectWorkUnits.filter((workUnit) => workUnit.projectId === projectId)),
      getProjectWorkUnitById: (projectWorkUnitId: string) =>
        Effect.succeed(
          projectWorkUnits.find((workUnit) => workUnit.id === projectWorkUnitId) ?? null,
        ),
      updateActiveTransitionExecutionPointer: () => Effect.die("unused"),
    } as any),
  ),
  Layer.provideMerge(
    Layer.succeed(WorkUnitFactRepository, {
      createFactInstance: () => Effect.die("unused"),
      getCurrentValuesByDefinition: () => Effect.succeed([]),
      listFactsByWorkUnit: ({ projectWorkUnitId }: { projectWorkUnitId: string }) =>
        Effect.succeed(
          projectWorkUnitId === "story-wu-1"
            ? [
                {
                  id: "fact-title-1",
                  projectWorkUnitId,
                  factDefinitionId: "fact-title",
                  valueJson: "Alpha Story",
                  referencedProjectWorkUnitId: null,
                  status: "active" as const,
                  supersededByFactInstanceId: null,
                  producedByTransitionExecutionId: null,
                  producedByWorkflowExecutionId: null,
                  authoredByUserId: null,
                  createdAt: now,
                },
              ]
            : [],
        ),
      supersedeFactInstance: () => Effect.void,
    } as any),
  ),
  Layer.provideMerge(
    Layer.succeed(ArtifactRepository, {
      createSnapshot: () => Effect.die("unused"),
      addSnapshotFiles: () => Effect.die("unused"),
      getCurrentSnapshotBySlot: () =>
        Effect.succeed({
          exists: false,
          snapshot: null,
          members: [],
        }),
      listLineageHistory: () => Effect.succeed([]),
      checkFreshness: () => Effect.succeed({ exists: false, freshness: "unavailable" as const }),
    } as any),
  ),
  Layer.provideMerge(
    Layer.succeed(ExecutionReadRepository, {
      getTransitionExecutionDetail: () => Effect.succeed(null),
      listTransitionExecutionsForWorkUnit: () => Effect.succeed([]),
    } as any),
  ),
  Layer.provideMerge(
    Layer.succeed(ProjectContextRepository, {
      findProjectPin: () =>
        Effect.succeed({
          projectId: "project-1",
          methodologyVersionId: "version-1",
          methodologyId: "methodology-1",
          methodologyKey: "methodology",
          publishedVersion: "1.0.0",
          actorId: null,
          createdAt: now,
          updatedAt: now,
        }),
      getProjectById: () => Effect.succeed(null),
    } as any),
  ),
  Layer.provideMerge(
    Layer.succeed(LifecycleRepository, {
      findWorkUnitTypes: () =>
        Effect.succeed([
          {
            id: "wu-type-story",
            methodologyVersionId: "version-1",
            key: "story",
            displayName: "Story",
            cardinality: "many_per_project",
          },
          {
            id: "wu-type-setup",
            methodologyVersionId: "version-1",
            key: "setup",
            displayName: "Setup",
            cardinality: "one_per_project",
          },
        ]),
      findLifecycleStates: () =>
        Effect.succeed([
          {
            id: "state-todo",
            key: "todo",
            displayName: "Todo",
          },
        ]),
      findLifecycleTransitions: () => Effect.succeed([]),
      findTransitionWorkflowBindings: () => Effect.succeed([]),
    } as any),
  ),
);

describe("work-unit runtime identity and disclosure", () => {
  it("reads immutable work-unit keys, monotonic instance numbers, and many-only display labels", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* RuntimeWorkUnitService;
        return yield* service.getWorkUnits({ projectId: "project-1" });
      }).pipe(Effect.provide(runtimeWorkUnitTestLayer)),
    );

    expect(result.rows.map((row) => row.displayIdentity.fullInstanceId)).toEqual([
      "story-1",
      "story-2",
      "setup-1",
    ]);
    expect(result.rows[0]?.displayIdentity.primaryLabel).toBe("Alpha Story");
    expect(result.rows[0]?.displayIdentity.secondaryLabel).toBe("Story · Todo");
    expect(result.rows[2]?.displayIdentity.primaryLabel).toBe("Setup");
    expect(result.rows[2]?.displayIdentity.secondaryLabel).toBe("Todo");
    expect((result.rows[0] as any).runtimeIdentity).toEqual({
      workUnitKey: "story-1",
      instanceNumber: 1,
      displayName: "Alpha Story",
    });
    expect((result.rows[2] as any).runtimeIdentity).toEqual({
      workUnitKey: "setup-1",
      instanceNumber: 1,
      displayName: null,
    });

    const overview = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* RuntimeWorkUnitService;
        return yield* service.getWorkUnitOverview({
          projectId: "project-1",
          projectWorkUnitId: "story-wu-1",
        });
      }).pipe(Effect.provide(runtimeWorkUnitTestLayer)),
    );

    expect((overview.workUnit as any).workUnitKey).toBe("story-1");
    expect((overview.workUnit as any).instanceNumber).toBe(1);
    expect((overview.workUnit as any).displayName).toBe("Alpha Story");
  });

  it("keeps work-unit reference reads lightweight by default and expands facts/artifacts explicitly", async () => {
    const lightweight = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* RuntimeWorkUnitService;
        return yield* service.readWorkUnitReference({
          projectId: "project-1",
          projectWorkUnitId: "story-wu-1",
          workUnitFactInstanceIds: ["fact-title-1"],
          artifactSnapshotIds: ["artifact-brief-1"],
        });
      }).pipe(Effect.provide(runtimeWorkUnitTestLayer)),
    );

    expect(lightweight).toMatchObject({
      projectWorkUnitId: "story-wu-1",
      workUnitKey: "story-1",
      instanceNumber: 1,
      displayName: "Alpha Story",
      workUnitTypeKey: "story",
    });
    expect(lightweight).not.toHaveProperty("facts");
    expect(lightweight).not.toHaveProperty("artifacts");

    const expanded = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* RuntimeWorkUnitService;
        return yield* service.readWorkUnitReference({
          projectId: "project-1",
          projectWorkUnitId: "story-wu-1",
          workUnitFactInstanceIds: ["fact-title-1"],
          artifactSnapshotIds: ["artifact-brief-1"],
          disclosure: { facts: true, artifacts: true },
        });
      }).pipe(Effect.provide(runtimeWorkUnitTestLayer)),
    );

    expect(expanded).toMatchObject({
      facts: { workUnitFactInstanceIds: ["fact-title-1"] },
      artifacts: { artifactSnapshotIds: ["artifact-brief-1"] },
    });
  });

  it("applies progressive disclosure to agent-step work-unit reads", async () => {
    const ctx = makeAgentStepRuntimeTestContext({
      workflowEditorContextFacts: [
        {
          kind: "work_unit_draft_spec_fact",
          contextFactDefinitionId: "ctx-story-drafts",
          key: "story-drafts",
          label: "Story Drafts",
          cardinality: "many",
          workUnitDefinitionId: "wu-type-1",
          selectedWorkUnitFactDefinitionIds: ["fact-title"],
          selectedArtifactSlotDefinitionIds: ["slot-story-doc"],
        },
      ],
      agentPayload: {
        key: "review_story_drafts",
        label: "Review story drafts",
        objective: "Inspect discovered work units.",
        instructionsMarkdown: "Read the disclosed work-unit summaries.",
        harnessSelection: {
          harness: "opencode",
          agent: "fake-agent",
          model: { provider: "fake-provider", model: "fake-model" },
        },
        explicitReadGrants: [{ contextFactDefinitionId: "ctx-story-drafts" }],
        writeItems: [],
        completionRequirements: [],
        runtimePolicy: {
          sessionStart: "explicit",
          continuationMode: "bootstrap_only",
          liveStreamCount: 1,
          bootstrapPromptNoReply: true,
          nativeMessageLog: false,
          persistedWritePolicy: "applied_only",
        },
      },
      projectWorkUnits: [
        {
          id: "wu-1",
          projectId: "project-1",
          workUnitTypeId: "wu-type-1",
          workUnitKey: "setup-1",
          instanceNumber: 1,
          displayName: "Alpha Story",
          currentStateId: null,
          activeTransitionExecutionId: null,
          createdAt: now,
          updatedAt: now,
        },
      ],
      initialContextFacts: [
        {
          id: "ctx-story-draft-1",
          workflowExecutionId: "wfexec-1",
          contextFactDefinitionId: "ctx-story-drafts",
          instanceOrder: 0,
          valueJson: {
            projectWorkUnitId: "wu-1",
            workUnitFactInstanceIds: ["fact-title-1"],
            artifactSnapshotIds: ["artifact-brief-1"],
          },
          sourceStepExecutionId: null,
          createdAt: now,
          updatedAt: now,
        },
      ],
    });

    const lightweight = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* AgentStepContextReadService;
        return yield* service.readContextValue({
          readItemId: "story-drafts",
          mode: "all",
          stepExecutionId: "step-exec-1",
        } as any);
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    expect(lightweight.values).toEqual([
      {
        instanceId: "ctx-story-draft-1",
        value: {
          projectWorkUnitId: "wu-1",
          workUnitKey: "setup-1",
          instanceNumber: 1,
          displayName: "Alpha Story",
          workUnitTypeId: "wu-type-1",
          workUnitTypeKey: "setup",
          workUnitTypeName: "Setup",
          cardinality: "many_per_project",
          currentStateId: "activation",
          currentStateKey: "activation",
          currentStateLabel: "Activation",
        },
        recordedAt: now.toISOString(),
      },
    ]);

    const expanded = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* AgentStepContextReadService;
        return yield* service.readContextValue({
          readItemId: "story-drafts",
          mode: "query",
          queryParam: "instanceId=ctx-story-draft-1&expand=facts,artifacts",
          stepExecutionId: "step-exec-1",
        } as any);
      }).pipe(Effect.provide(ctx.runtimeLayer)),
    );

    expect(expanded.values).toEqual([
      {
        instanceId: "ctx-story-draft-1",
        value: {
          projectWorkUnitId: "wu-1",
          workUnitKey: "setup-1",
          instanceNumber: 1,
          displayName: "Alpha Story",
          workUnitTypeId: "wu-type-1",
          workUnitTypeKey: "setup",
          workUnitTypeName: "Setup",
          cardinality: "many_per_project",
          currentStateId: "activation",
          currentStateKey: "activation",
          currentStateLabel: "Activation",
          facts: { workUnitFactInstanceIds: ["fact-title-1"] },
          artifacts: { artifactSnapshotIds: ["artifact-brief-1"] },
        },
        recordedAt: now.toISOString(),
      },
    ]);
  });
});
