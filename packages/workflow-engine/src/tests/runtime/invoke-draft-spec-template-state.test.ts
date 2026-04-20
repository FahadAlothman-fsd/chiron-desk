import { Context, Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";

import { LifecycleRepository, MethodologyRepository } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";

import {
  ExecutionReadRepository,
  type WorkflowExecutionDetailReadModel,
} from "../../repositories/execution-read-repository";
import {
  InvokeExecutionRepository,
  type InvokeStepExecutionStateRow,
  type InvokeWorkUnitCreatedArtifactSnapshotRow,
  type InvokeWorkUnitCreatedFactInstanceRow,
  type InvokeWorkUnitTargetExecutionRow,
  type StartInvokeWorkUnitTargetAtomicallyParams,
} from "../../repositories/invoke-execution-repository";
import {
  StepExecutionRepository,
  type ReplaceRuntimeWorkflowExecutionContextFactsParams,
  type RuntimeFormStepExecutionStateRow,
  type RuntimeStepExecutionRow,
  type RuntimeWorkflowContextFactDefinitionRow,
  type RuntimeWorkflowEdgeRow,
  type RuntimeWorkflowExecutionContextFactRow,
  type RuntimeWorkflowStepDefinitionRow,
  type UpsertRuntimeFormStepExecutionStateParams,
} from "../../repositories/step-execution-repository";
import {
  InvokePropagationService,
  InvokePropagationServiceLive,
} from "../../services/invoke-propagation-service";
import {
  InvokeWorkUnitExecutionService,
  InvokeWorkUnitExecutionServiceLive,
} from "../../services/invoke-work-unit-execution-service";
import { StepContextMutationServiceLive } from "../../services/step-context-mutation-service";

type RunState = {
  workflowExecutionId: string;
  stepExecutionId: string;
  invokeState: InvokeStepExecutionStateRow;
  target: InvokeWorkUnitTargetExecutionRow;
  outputRows: RuntimeWorkflowExecutionContextFactRow[];
};

type TestState = {
  runs: RunState[];
  contextFactsByWorkflowExecutionId: Map<string, RuntimeWorkflowExecutionContextFactRow[]>;
  replaceCalls: ReplaceRuntimeWorkflowExecutionContextFactsParams[];
  factMappings: InvokeWorkUnitCreatedFactInstanceRow[];
  artifactMappings: InvokeWorkUnitCreatedArtifactSnapshotRow[];
  nextProjectWorkUnitNumber: number;
  nextFactNumber: number;
  nextArtifactNumber: number;
  nextTransitionNumber: number;
  nextWorkflowNumber: number;
};

const sourceTemplate = Object.freeze({
  draftKey: "draft-story-a",
  workUnitDefinitionId: "wu-story",
  factValues: [{ workUnitFactDefinitionId: "fact-title", value: "Story A" }],
  artifactSlots: [
    {
      artifactSlotDefinitionId: "slot-brief",
      files: [{ relativePath: "stories/story-a.md", clear: false }],
    },
  ],
});

const projectPin = {
  projectId: "project-1",
  methodologyVersionId: "version-1",
  methodologyId: "methodology-1",
  methodologyKey: "core",
  publishedVersion: "1.0.0",
  actorId: null,
  createdAt: new Date("2026-04-19T00:00:00.000Z"),
  updatedAt: new Date("2026-04-19T00:00:00.000Z"),
};

const parentWorkflowDetail = (workflowExecutionId: string): WorkflowExecutionDetailReadModel => ({
  workflowExecution: {
    id: workflowExecutionId,
    transitionExecutionId: `transition-${workflowExecutionId}`,
    workflowId: "workflow-parent",
    workflowRole: "primary",
    status: "active",
    currentStepExecutionId: workflowExecutionId.replace("wf-parent", "step"),
    supersededByWorkflowExecutionId: null,
    startedAt: new Date("2026-04-19T00:00:00.000Z"),
    completedAt: null,
    supersededAt: null,
  },
  transitionExecution: {
    id: `transition-${workflowExecutionId}`,
    projectWorkUnitId: `parent-work-unit-${workflowExecutionId}`,
    transitionId: "transition-parent",
    status: "active",
    primaryWorkflowExecutionId: workflowExecutionId,
    supersededByTransitionExecutionId: null,
    startedAt: new Date("2026-04-19T00:00:00.000Z"),
    completedAt: null,
    supersededAt: null,
  },
  projectId: "project-1",
  projectWorkUnitId: `parent-work-unit-${workflowExecutionId}`,
  workUnitTypeId: "wu-parent",
  currentStateId: "state-active",
});

const makeRun = (index: number): RunState => ({
  workflowExecutionId: `wf-parent-${index}`,
  stepExecutionId: `step-exec-${index}`,
  invokeState: {
    id: `invoke-state-${index}`,
    stepExecutionId: `step-exec-${index}`,
    invokeStepDefinitionId: "invoke-step-1",
    createdAt: new Date("2026-04-19T00:00:00.000Z"),
    updatedAt: new Date("2026-04-19T00:00:00.000Z"),
  },
  target: {
    id: `invoke-target-${index}`,
    invokeStepExecutionStateId: `invoke-state-${index}`,
    projectWorkUnitId: null,
    workUnitDefinitionId: "wu-story",
    transitionDefinitionId: "transition-ready",
    transitionExecutionId: null,
    workflowDefinitionId: null,
    workflowExecutionId: null,
    resolutionOrder: 0,
    frozenDraftTemplateJson: null,
    createdAt: new Date("2026-04-19T00:00:00.000Z"),
    updatedAt: new Date("2026-04-19T00:00:00.000Z"),
  },
  outputRows: [],
});

function buildRuntime(runCount = 1) {
  const runs = Array.from({ length: runCount }, (_unused, index) => makeRun(index + 1));
  const state: TestState = {
    runs,
    contextFactsByWorkflowExecutionId: new Map(
      runs.map((run) => [
        run.workflowExecutionId,
        [
          {
            id: `ctx-template-${run.workflowExecutionId}`,
            workflowExecutionId: run.workflowExecutionId,
            contextFactDefinitionId: "ctx-story-drafts",
            instanceOrder: 0,
            valueJson: structuredClone(sourceTemplate),
            sourceStepExecutionId: null,
            createdAt: new Date("2026-04-19T00:00:00.000Z"),
            updatedAt: new Date("2026-04-19T00:00:00.000Z"),
          },
        ],
      ]),
    ),
    replaceCalls: [],
    factMappings: [],
    artifactMappings: [],
    nextProjectWorkUnitNumber: 1,
    nextFactNumber: 1,
    nextArtifactNumber: 1,
    nextTransitionNumber: 1,
    nextWorkflowNumber: 1,
  };

  const stepRepoLayer = Layer.succeed(StepExecutionRepository, {
    createStepExecution: () => Effect.die("unused"),
    getStepExecutionById: (stepExecutionId: string) =>
      Effect.succeed(
        state.runs.find((run) => run.stepExecutionId === stepExecutionId)
          ? ({
              id: stepExecutionId,
              workflowExecutionId: stepExecutionId.replace("step-exec", "wf-parent"),
              stepDefinitionId: "invoke-step-1",
              stepType: "invoke",
              status: "active",
              activatedAt: new Date("2026-04-19T00:00:00.000Z"),
              completedAt: null,
              previousStepExecutionId: null,
            } satisfies RuntimeStepExecutionRow)
          : null,
      ),
    findStepExecutionByWorkflowAndDefinition: () => Effect.die("unused"),
    listStepExecutionsForWorkflow: () => Effect.succeed([]),
    completeStepExecution: () => Effect.die("unused"),
    createFormStepExecutionState: () => Effect.die("unused"),
    upsertFormStepExecutionState: (_params: UpsertRuntimeFormStepExecutionStateParams) =>
      Effect.die("unused"),
    getFormStepExecutionState: () => Effect.succeed<RuntimeFormStepExecutionStateRow | null>(null),
    replaceWorkflowExecutionContextFacts: (
      params: ReplaceRuntimeWorkflowExecutionContextFactsParams,
    ) =>
      Effect.sync(() => {
        state.replaceCalls.push(params);
        const existing =
          state.contextFactsByWorkflowExecutionId
            .get(params.workflowExecutionId)
            ?.filter(
              (row) =>
                !params.affectedContextFactDefinitionIds.includes(row.contextFactDefinitionId),
            ) ?? [];
        const created = params.currentValues.map(
          (value, index) =>
            ({
              id: `ctx-output-${params.workflowExecutionId}-${index}`,
              workflowExecutionId: params.workflowExecutionId,
              contextFactDefinitionId: value.contextFactDefinitionId,
              instanceOrder: value.instanceOrder,
              valueJson: value.valueJson,
              sourceStepExecutionId: params.sourceStepExecutionId,
              createdAt: new Date("2026-04-19T00:10:00.000Z"),
              updatedAt: new Date("2026-04-19T00:10:00.000Z"),
            }) satisfies RuntimeWorkflowExecutionContextFactRow,
        );
        state.contextFactsByWorkflowExecutionId.set(params.workflowExecutionId, [
          ...existing,
          ...created,
        ]);
        const run = state.runs.find(
          (candidate) => candidate.workflowExecutionId === params.workflowExecutionId,
        );
        if (run) {
          run.outputRows = created;
        }
        return created;
      }),
    listWorkflowExecutionContextFacts: (workflowExecutionId: string) =>
      Effect.succeed(state.contextFactsByWorkflowExecutionId.get(workflowExecutionId) ?? []),
    listWorkflowContextFactDefinitions: () =>
      Effect.succeed<readonly RuntimeWorkflowContextFactDefinitionRow[]>([]),
    listWorkflowStepDefinitions: () =>
      Effect.succeed<readonly RuntimeWorkflowStepDefinitionRow[]>([]),
    listWorkflowEdges: () => Effect.succeed<readonly RuntimeWorkflowEdgeRow[]>([]),
  } as unknown as Context.Tag.Service<typeof StepExecutionRepository>);

  const executionReadLayer = Layer.succeed(ExecutionReadRepository, {
    getTransitionExecutionDetail: () => Effect.die("unused"),
    listTransitionExecutionsForWorkUnit: () => Effect.die("unused"),
    getWorkflowExecutionDetail: (workflowExecutionId: string) =>
      Effect.succeed(
        state.runs.find((run) => run.workflowExecutionId === workflowExecutionId)
          ? parentWorkflowDetail(workflowExecutionId)
          : null,
      ),
    listWorkflowExecutionsForTransition: () => Effect.die("unused"),
    listActiveWorkflowExecutionsByProject: () => Effect.die("unused"),
  } as unknown as Context.Tag.Service<typeof ExecutionReadRepository>);

  const invokeRepoLayer = Layer.succeed(InvokeExecutionRepository, {
    createInvokeStepExecutionState: () => Effect.die("unused"),
    getInvokeStepExecutionStateByStepExecutionId: (stepExecutionId: string) =>
      Effect.succeed(
        state.runs.find((run) => run.stepExecutionId === stepExecutionId)?.invokeState ?? null,
      ),
    listInvokeWorkflowTargetExecutions: () => Effect.succeed([]),
    getInvokeWorkflowTargetExecutionById: () => Effect.die("unused"),
    createInvokeWorkflowTargetExecution: () => Effect.die("unused"),
    markInvokeWorkflowTargetExecutionStarted: () => Effect.die("unused"),
    startInvokeWorkflowTargetAtomically: () => Effect.die("unused"),
    listInvokeWorkUnitTargetExecutions: (invokeStepExecutionStateId: string) =>
      Effect.succeed(
        state.runs
          .filter((run) => run.invokeState.id === invokeStepExecutionStateId)
          .map((run) => run.target),
      ),
    getInvokeWorkUnitTargetExecutionById: (invokeWorkUnitTargetExecutionId: string) =>
      Effect.succeed(
        state.runs.find((run) => run.target.id === invokeWorkUnitTargetExecutionId)?.target ?? null,
      ),
    createInvokeWorkUnitTargetExecution: () => Effect.die("unused"),
    markInvokeWorkUnitTargetExecutionStarted: () => Effect.die("unused"),
    startInvokeWorkUnitTargetAtomically: (params: StartInvokeWorkUnitTargetAtomicallyParams) =>
      Effect.sync(() => {
        const run = state.runs.find(
          (candidate) => candidate.target.id === params.invokeWorkUnitTargetExecutionId,
        );
        if (!run) {
          throw new Error("invoke target missing");
        }

        if (
          run.target.projectWorkUnitId &&
          run.target.transitionExecutionId &&
          run.target.workflowDefinitionId &&
          run.target.workflowExecutionId
        ) {
          return {
            invokeWorkUnitTargetExecutionId: run.target.id,
            projectWorkUnitId: run.target.projectWorkUnitId,
            transitionExecutionId: run.target.transitionExecutionId,
            workflowExecutionId: run.target.workflowExecutionId,
            result: "already_started" as const,
          };
        }

        const projectWorkUnitId = `story-work-unit-${state.nextProjectWorkUnitNumber++}`;
        const transitionExecutionId = `transition-exec-${state.nextTransitionNumber++}`;
        const workflowExecutionId = `child-workflow-exec-${state.nextWorkflowNumber++}`;

        run.target = {
          ...run.target,
          projectWorkUnitId,
          transitionExecutionId,
          workflowDefinitionId: params.workflowDefinitionId,
          workflowExecutionId,
          frozenDraftTemplateJson: params.frozenDraftTemplateJson ?? null,
          updatedAt: new Date("2026-04-19T00:05:00.000Z"),
        };

        for (const definition of params.initialFactDefinitions) {
          state.factMappings.push({
            id: `fact-map-${state.factMappings.length + 1}`,
            invokeWorkUnitTargetExecutionId: run.target.id,
            factDefinitionId: definition.factDefinitionId,
            workUnitFactInstanceId: `fact-instance-${state.nextFactNumber++}`,
            createdAt: new Date("2026-04-19T00:05:00.000Z"),
          });
        }

        for (const definition of params.initialArtifactSlotDefinitions) {
          state.artifactMappings.push({
            id: `artifact-map-${state.artifactMappings.length + 1}`,
            invokeWorkUnitTargetExecutionId: run.target.id,
            artifactSlotDefinitionId: definition.artifactSlotDefinitionId,
            artifactSnapshotId: `artifact-snapshot-${state.nextArtifactNumber++}`,
            createdAt: new Date("2026-04-19T00:05:00.000Z"),
          });
        }

        return {
          invokeWorkUnitTargetExecutionId: run.target.id,
          projectWorkUnitId,
          transitionExecutionId,
          workflowExecutionId,
          result: "started" as const,
        };
      }),
    listInvokeWorkUnitCreatedFactInstances: (invokeWorkUnitTargetExecutionId: string) =>
      Effect.succeed(
        state.factMappings.filter(
          (row) => row.invokeWorkUnitTargetExecutionId === invokeWorkUnitTargetExecutionId,
        ),
      ),
    createInvokeWorkUnitCreatedFactInstance: () => Effect.die("unused"),
    listInvokeWorkUnitCreatedArtifactSnapshots: (invokeWorkUnitTargetExecutionId: string) =>
      Effect.succeed(
        state.artifactMappings.filter(
          (row) => row.invokeWorkUnitTargetExecutionId === invokeWorkUnitTargetExecutionId,
        ),
      ),
    createInvokeWorkUnitCreatedArtifactSnapshot: () => Effect.die("unused"),
  } as unknown as Context.Tag.Service<typeof InvokeExecutionRepository>);

  const projectContextLayer = Layer.succeed(ProjectContextRepository, {
    findProjectPin: () => Effect.succeed(projectPin),
  } as unknown as Context.Tag.Service<typeof ProjectContextRepository>);

  const lifecycleLayer = Layer.succeed(LifecycleRepository, {
    findWorkUnitTypes: () =>
      Effect.succeed([
        {
          id: "wu-parent",
          methodologyVersionId: "version-1",
          key: "WU.PARENT",
          displayName: "Parent",
          descriptionJson: null,
          guidanceJson: null,
          cardinality: "one",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "wu-story",
          methodologyVersionId: "version-1",
          key: "WU.STORY",
          displayName: "Story",
          descriptionJson: null,
          guidanceJson: null,
          cardinality: "many",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
    findLifecycleStates: () => Effect.die("unused"),
    findLifecycleTransitions: () => Effect.die("unused"),
    findFactSchemas: (_versionId: string, workUnitTypeId?: string) =>
      Effect.succeed(
        workUnitTypeId === "wu-story"
          ? [
              {
                id: "fact-title",
                methodologyVersionId: "version-1",
                workUnitTypeId: "wu-story",
                name: "Title",
                key: "title",
                factType: "string",
                cardinality: "one",
                description: null,
                defaultValueJson: null,
                guidanceJson: null,
                validationJson: null,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
              {
                id: "fact-default",
                methodologyVersionId: "version-1",
                workUnitTypeId: "wu-story",
                name: "Body",
                key: "body",
                factType: "string",
                cardinality: "one",
                description: null,
                defaultValueJson: "Default body",
                guidanceJson: null,
                validationJson: null,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ]
          : [],
      ),
    findTransitionConditionSets: () => Effect.die("unused"),
    findAgentTypes: () => Effect.die("unused"),
    findTransitionWorkflowBindings: () => Effect.die("unused"),
    saveLifecycleDefinition: () => Effect.die("unused"),
    recordLifecycleEvent: () => Effect.die("unused"),
  } as unknown as Context.Tag.Service<typeof LifecycleRepository>);

  const methodologyLayer = Layer.succeed(MethodologyRepository, {
    getWorkflowEditorDefinition: () =>
      Effect.succeed({
        contextFacts: [
          {
            contextFactDefinitionId: "ctx-story-drafts",
            kind: "work_unit_draft_spec_fact",
            key: "storyDrafts",
            label: "Story Drafts",
            cardinality: "many",
            workUnitDefinitionId: "wu-story",
            selectedWorkUnitFactDefinitionIds: ["fact-title"],
            selectedArtifactSlotDefinitionIds: ["slot-brief"],
          },
        ],
      }),
    getInvokeStepDefinition: () =>
      Effect.succeed({
        stepId: "invoke-step-1",
        payload: {
          key: "invoke-story-drafts",
          targetKind: "work_unit",
          sourceMode: "fact_backed",
          contextFactDefinitionId: "ctx-story-drafts",
          bindings: [
            {
              destination: { kind: "work_unit_fact", workUnitFactDefinitionId: "fact-title" },
              source: { kind: "context_fact", contextFactDefinitionId: "ctx-story-drafts" },
            },
            {
              destination: { kind: "artifact_slot", artifactSlotDefinitionId: "slot-brief" },
              source: { kind: "context_fact", contextFactDefinitionId: "ctx-story-drafts" },
            },
          ],
          activationTransitions: [
            { transitionId: "transition-ready", workflowDefinitionIds: ["workflow-story"] },
          ],
        },
      }),
    findArtifactSlotsByWorkUnitType: () =>
      Effect.succeed([
        {
          id: "slot-brief",
          key: "brief",
          displayName: "Brief",
          descriptionJson: null,
          guidanceJson: null,
          cardinality: "single",
          rulesJson: null,
          templates: [],
        },
      ]),
  } as unknown as Context.Tag.Service<typeof MethodologyRepository>);

  const baseLayer = Layer.mergeAll(
    stepRepoLayer,
    executionReadLayer,
    invokeRepoLayer,
    projectContextLayer,
    lifecycleLayer,
    methodologyLayer,
  );
  const contextLayer = StepContextMutationServiceLive.pipe(Layer.provideMerge(baseLayer));

  return {
    state,
    executeLayer: InvokeWorkUnitExecutionServiceLive.pipe(Layer.provideMerge(baseLayer)),
    propagateLayer: InvokePropagationServiceLive.pipe(
      Layer.provideMerge(baseLayer),
      Layer.provideMerge(contextLayer),
    ),
  };
}

const expectTemplateOnlyValue = (value: Record<string, unknown>) => {
  expect(value).toHaveProperty("draftKey");
  expect(value).toHaveProperty("workUnitDefinitionId", "wu-story");
  expect(value).toHaveProperty("factValues");
  expect(value).toHaveProperty("artifactSlots");
  expect(value).not.toHaveProperty("projectWorkUnitId");
  expect(value).not.toHaveProperty("workUnitFactInstanceIds");
  expect(value).not.toHaveProperty("artifactSnapshotIds");
};

describe("invoke draft-spec template/state separation", () => {
  it("keeps propagated draft specs template-only while invoke state holds frozen values and created runtime mappings", async () => {
    const runtime = buildRuntime();
    const [run] = runtime.state.runs;
    if (!run) throw new Error("missing run");

    const started = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* InvokeWorkUnitExecutionService;
        return yield* service.startInvokeWorkUnitTarget({
          projectId: "project-1",
          stepExecutionId: run.stepExecutionId,
          invokeWorkUnitTargetExecutionId: run.target.id,
          workflowDefinitionId: "workflow-story",
        });
      }).pipe(Effect.provide(runtime.executeLayer)),
    );

    expect(started.result).toBe("started");
    expect(run.target.projectWorkUnitId).toBe(started.projectWorkUnitId);
    expect(run.target.workflowExecutionId).toBe(started.workflowExecutionId);
    expect(run.target.frozenDraftTemplateJson).toEqual({
      draftKey: "draft-story-a",
      workUnitDefinitionId: "wu-story",
      factValues: [{ workUnitFactDefinitionId: "fact-title", value: "Story A" }],
      artifactSlots: [
        {
          artifactSlotDefinitionId: "slot-brief",
          files: [{ relativePath: "stories/story-a.md", clear: false }],
        },
      ],
    });
    expect(runtime.state.factMappings.map((row) => row.workUnitFactInstanceId)).toHaveLength(1);
    expect(runtime.state.artifactMappings.map((row) => row.artifactSnapshotId)).toHaveLength(1);
    expect(sourceTemplate).toEqual({
      draftKey: "draft-story-a",
      workUnitDefinitionId: "wu-story",
      factValues: [{ workUnitFactDefinitionId: "fact-title", value: "Story A" }],
      artifactSlots: [
        {
          artifactSlotDefinitionId: "slot-brief",
          files: [{ relativePath: "stories/story-a.md", clear: false }],
        },
      ],
    });

    await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* InvokePropagationService;
        return yield* service.propagateInvokeCompletionOutputs({
          projectId: "project-1",
          workflowExecutionId: run.workflowExecutionId,
          stepExecutionId: run.stepExecutionId,
        });
      }).pipe(Effect.provide(runtime.propagateLayer)),
    );

    expect(runtime.state.replaceCalls).toHaveLength(1);
    expect(run.outputRows).toHaveLength(1);
    const propagatedValue = run.outputRows[0]!.valueJson as Record<string, unknown>;
    expectTemplateOnlyValue(propagatedValue);
    expect(propagatedValue).toEqual({
      draftKey: "draft-story-a",
      workUnitDefinitionId: "wu-story",
      factValues: [{ workUnitFactDefinitionId: "fact-title", value: "Story A" }],
      artifactSlots: [
        {
          artifactSlotDefinitionId: "slot-brief",
          files: [{ relativePath: "stories/story-a.md", clear: false }],
        },
      ],
    });
  });

  it("supports template reuse across multiple invokes with distinct materialization state", async () => {
    const runtime = buildRuntime(2);

    const results = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* InvokeWorkUnitExecutionService;
        return yield* Effect.forEach(runtime.state.runs, (run) =>
          service.startInvokeWorkUnitTarget({
            projectId: "project-1",
            stepExecutionId: run.stepExecutionId,
            invokeWorkUnitTargetExecutionId: run.target.id,
            workflowDefinitionId: "workflow-story",
          }),
        );
      }).pipe(Effect.provide(runtime.executeLayer)),
    );

    expect(results.map((result) => result.result)).toEqual(["started", "started"]);
    expect(runtime.state.runs[0]!.target.frozenDraftTemplateJson).toEqual(
      runtime.state.runs[1]!.target.frozenDraftTemplateJson,
    );
    expect(runtime.state.runs[0]!.target.projectWorkUnitId).not.toBe(
      runtime.state.runs[1]!.target.projectWorkUnitId,
    );
    expect(runtime.state.runs[0]!.target.workflowExecutionId).not.toBe(
      runtime.state.runs[1]!.target.workflowExecutionId,
    );

    const firstRunFactIds = runtime.state.factMappings
      .filter((row) => row.invokeWorkUnitTargetExecutionId === runtime.state.runs[0]!.target.id)
      .map((row) => row.workUnitFactInstanceId);
    const secondRunFactIds = runtime.state.factMappings
      .filter((row) => row.invokeWorkUnitTargetExecutionId === runtime.state.runs[1]!.target.id)
      .map((row) => row.workUnitFactInstanceId);
    const firstRunArtifactIds = runtime.state.artifactMappings
      .filter((row) => row.invokeWorkUnitTargetExecutionId === runtime.state.runs[0]!.target.id)
      .map((row) => row.artifactSnapshotId);
    const secondRunArtifactIds = runtime.state.artifactMappings
      .filter((row) => row.invokeWorkUnitTargetExecutionId === runtime.state.runs[1]!.target.id)
      .map((row) => row.artifactSnapshotId);

    expect(firstRunFactIds).not.toEqual(secondRunFactIds);
    expect(firstRunArtifactIds).not.toEqual(secondRunArtifactIds);

    await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* InvokePropagationService;
        return yield* Effect.forEach(runtime.state.runs, (run) =>
          service.propagateInvokeCompletionOutputs({
            projectId: "project-1",
            workflowExecutionId: run.workflowExecutionId,
            stepExecutionId: run.stepExecutionId,
          }),
        );
      }).pipe(Effect.provide(runtime.propagateLayer)),
    );

    for (const run of runtime.state.runs) {
      expect(run.outputRows).toHaveLength(1);
      expectTemplateOnlyValue(run.outputRows[0]!.valueJson as Record<string, unknown>);
    }
  });
});
