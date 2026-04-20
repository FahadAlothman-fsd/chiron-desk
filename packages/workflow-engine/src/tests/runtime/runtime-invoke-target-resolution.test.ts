import { Context, Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";

import {
  InvokeExecutionRepository,
  type CreateInvokeStepExecutionStateParams,
  type CreateInvokeWorkflowTargetExecutionParams,
  type CreateInvokeWorkUnitTargetExecutionParams,
  type InvokeStepExecutionStateRow,
  type InvokeWorkflowTargetExecutionRow,
  type InvokeWorkUnitTargetExecutionRow,
} from "../../repositories/invoke-execution-repository";
import {
  StepExecutionRepository,
  type ReplaceRuntimeWorkflowExecutionContextFactsParams,
  type RuntimeFormStepExecutionStateRow,
  type RuntimeWorkflowContextFactDefinitionRow,
  type RuntimeWorkflowEdgeRow,
  type RuntimeWorkflowExecutionContextFactRow,
  type RuntimeWorkflowStepDefinitionRow,
  type UpsertRuntimeFormStepExecutionStateParams,
} from "../../repositories/step-execution-repository";
import {
  InvokeTargetResolutionService,
  InvokeTargetResolutionServiceLive,
  NO_INVOKE_TARGETS_RESOLVED_REASON,
} from "../../services/invoke-target-resolution-service";

const buildInvokeTargetResolutionTestLayer = (
  initialContextFacts: RuntimeWorkflowExecutionContextFactRow[],
) => {
  const invokeStates: InvokeStepExecutionStateRow[] = [];
  const workflowTargets: InvokeWorkflowTargetExecutionRow[] = [];
  const workUnitTargets: InvokeWorkUnitTargetExecutionRow[] = [];
  const contextFacts = [...initialContextFacts];

  const stepRepoLayer = Layer.succeed(StepExecutionRepository, {
    createStepExecution: () => Effect.die("unused"),
    getStepExecutionById: () => Effect.die("unused"),
    findStepExecutionByWorkflowAndDefinition: () => Effect.die("unused"),
    listStepExecutionsForWorkflow: () => Effect.succeed([]),
    completeStepExecution: () => Effect.die("unused"),
    createFormStepExecutionState: () => Effect.die("unused"),
    upsertFormStepExecutionState: (_params: UpsertRuntimeFormStepExecutionStateParams) =>
      Effect.die("unused"),
    getFormStepExecutionState: (_stepExecutionId: string) =>
      Effect.succeed<RuntimeFormStepExecutionStateRow | null>(null),
    replaceWorkflowExecutionContextFacts: (
      _params: ReplaceRuntimeWorkflowExecutionContextFactsParams,
    ) => Effect.die("unused"),
    listWorkflowExecutionContextFacts: (workflowExecutionId: string) =>
      Effect.succeed(
        contextFacts.filter((fact) => fact.workflowExecutionId === workflowExecutionId),
      ),
    listWorkflowContextFactDefinitions: (_workflowId: string) =>
      Effect.succeed<readonly RuntimeWorkflowContextFactDefinitionRow[]>([]),
    listWorkflowStepDefinitions: (_workflowId: string) =>
      Effect.succeed<readonly RuntimeWorkflowStepDefinitionRow[]>([]),
    listWorkflowEdges: (_workflowId: string) =>
      Effect.succeed<readonly RuntimeWorkflowEdgeRow[]>([]),
  } as unknown as Context.Tag.Service<typeof StepExecutionRepository>);

  const invokeRepoLayer = Layer.succeed(InvokeExecutionRepository, {
    createInvokeStepExecutionState: ({
      stepExecutionId,
      invokeStepDefinitionId,
    }: CreateInvokeStepExecutionStateParams) =>
      Effect.sync(() => {
        const row: InvokeStepExecutionStateRow = {
          id: `invoke-state-${invokeStates.length + 1}`,
          stepExecutionId,
          invokeStepDefinitionId,
          createdAt: new Date(`2026-04-14T00:00:0${invokeStates.length}.000Z`),
          updatedAt: new Date(`2026-04-14T00:00:0${invokeStates.length}.000Z`),
        };
        invokeStates.push(row);
        return row;
      }),
    getInvokeStepExecutionStateByStepExecutionId: (stepExecutionId: string) =>
      Effect.succeed(invokeStates.find((row) => row.stepExecutionId === stepExecutionId) ?? null),
    listInvokeWorkflowTargetExecutions: (invokeStepExecutionStateId: string) =>
      Effect.succeed(
        workflowTargets.filter(
          (row) => row.invokeStepExecutionStateId === invokeStepExecutionStateId,
        ),
      ),
    getInvokeWorkflowTargetExecutionById: (invokeWorkflowTargetExecutionId: string) =>
      Effect.succeed(
        workflowTargets.find((row) => row.id === invokeWorkflowTargetExecutionId) ?? null,
      ),
    createInvokeWorkflowTargetExecution: ({
      invokeStepExecutionStateId,
      workflowDefinitionId,
      workflowExecutionId = null,
      resolutionOrder = null,
    }: CreateInvokeWorkflowTargetExecutionParams) =>
      Effect.sync(() => {
        const row: InvokeWorkflowTargetExecutionRow = {
          id: `invoke-wf-target-${workflowTargets.length + 1}`,
          invokeStepExecutionStateId,
          workflowDefinitionId,
          workflowExecutionId,
          resolutionOrder,
          createdAt: new Date(`2026-04-14T00:01:0${workflowTargets.length}.000Z`),
          updatedAt: new Date(`2026-04-14T00:01:0${workflowTargets.length}.000Z`),
        };
        workflowTargets.push(row);
        return row;
      }),
    markInvokeWorkflowTargetExecutionStarted: () => Effect.die("unused"),
    listInvokeWorkUnitTargetExecutions: (invokeStepExecutionStateId: string) =>
      Effect.succeed(
        workUnitTargets.filter(
          (row) => row.invokeStepExecutionStateId === invokeStepExecutionStateId,
        ),
      ),
    getInvokeWorkUnitTargetExecutionById: (invokeWorkUnitTargetExecutionId: string) =>
      Effect.succeed(
        workUnitTargets.find((row) => row.id === invokeWorkUnitTargetExecutionId) ?? null,
      ),
    createInvokeWorkUnitTargetExecution: ({
      invokeStepExecutionStateId,
      projectWorkUnitId = null,
      workUnitDefinitionId,
      transitionDefinitionId,
      transitionExecutionId = null,
      workflowDefinitionId = null,
      workflowExecutionId = null,
      resolutionOrder = null,
    }: CreateInvokeWorkUnitTargetExecutionParams) =>
      Effect.sync(() => {
        const row: InvokeWorkUnitTargetExecutionRow = {
          id: `invoke-wu-target-${workUnitTargets.length + 1}`,
          invokeStepExecutionStateId,
          projectWorkUnitId,
          workUnitDefinitionId,
          transitionDefinitionId,
          transitionExecutionId,
          workflowDefinitionId,
          workflowExecutionId,
          resolutionOrder,
          createdAt: new Date(`2026-04-14T00:02:0${workUnitTargets.length}.000Z`),
          updatedAt: new Date(`2026-04-14T00:02:0${workUnitTargets.length}.000Z`),
        };
        workUnitTargets.push(row);
        return row;
      }),
    markInvokeWorkUnitTargetExecutionStarted: () => Effect.die("unused"),
    listInvokeWorkUnitCreatedFactInstances: () => Effect.succeed([]),
    createInvokeWorkUnitCreatedFactInstance: () => Effect.die("unused"),
    listInvokeWorkUnitCreatedArtifactSnapshots: () => Effect.succeed([]),
    createInvokeWorkUnitCreatedArtifactSnapshot: () => Effect.die("unused"),
  } as unknown as Context.Tag.Service<typeof InvokeExecutionRepository>);

  return {
    layer: Layer.provide(
      InvokeTargetResolutionServiceLive,
      Layer.mergeAll(stepRepoLayer, invokeRepoLayer),
    ),
    state: {
      invokeStates,
      workflowTargets,
      workUnitTargets,
      contextFacts,
    },
  };
};

describe("InvokeTargetResolutionService", () => {
  it("creates the invoke root once and materializes deduplicated workflow targets with resolution order", async () => {
    const runtime = buildInvokeTargetResolutionTestLayer([]);

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* InvokeTargetResolutionService;

        const first = yield* service.materializeTargetsForActivation({
          workflowExecutionId: "wfexec-parent-1",
          stepExecutionId: "step-exec-1",
          invokeStepDefinitionId: "step-def-invoke-1",
          invokeStep: {
            key: "invoke-child-workflows",
            targetKind: "workflow",
            sourceMode: "fixed",
            workflowDefinitionIds: ["wf-story", "wf-story", "wf-bugfix"],
          },
        });

        const second = yield* service.materializeTargetsForActivation({
          workflowExecutionId: "wfexec-parent-1",
          stepExecutionId: "step-exec-1",
          invokeStepDefinitionId: "step-def-invoke-1",
          invokeStep: {
            key: "invoke-child-workflows",
            targetKind: "workflow",
            sourceMode: "fixed",
            workflowDefinitionIds: ["wf-story", "wf-should-not-appear"],
          },
        });

        return { first, second };
      }).pipe(Effect.provide(runtime.layer)),
    );

    expect(result.first.materializationState).toBe("created");
    expect(result.first.blockingReason).toBeNull();
    expect(result.first.workflowTargetExecutions.map((row) => row.workflowDefinitionId)).toEqual([
      "wf-story",
      "wf-bugfix",
    ]);
    expect(result.first.workflowTargetExecutions.map((row) => row.resolutionOrder)).toEqual([0, 1]);
    expect(result.second.materializationState).toBe("already_exists");
    expect(result.second.workflowTargetExecutions.map((row) => row.workflowDefinitionId)).toEqual([
      "wf-story",
      "wf-bugfix",
    ]);
    expect(runtime.state.invokeStates).toHaveLength(1);
    expect(runtime.state.workflowTargets).toHaveLength(2);
  });

  it("materializes context-backed work-unit targets before child start and deduplicates canonically", async () => {
    const runtime = buildInvokeTargetResolutionTestLayer([
      {
        id: "ctx-1",
        workflowExecutionId: "wfexec-parent-2",
        contextFactDefinitionId: "fact-story-drafts",
        instanceOrder: 0,
        valueJson: [
          { workUnitDefinitionId: "wu-story", canonicalKey: "draft-1", title: "Story A" },
          { workUnitDefinitionId: "wu-story", canonicalKey: "draft-1", title: "Story A" },
          { workUnitDefinitionId: "wu-story", canonicalKey: "draft-2", title: "Story B" },
        ],
        sourceStepExecutionId: null,
        createdAt: new Date("2026-04-14T00:00:00.000Z"),
        updatedAt: new Date("2026-04-14T00:00:00.000Z"),
      },
    ]);

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* InvokeTargetResolutionService;
        return yield* service.materializeTargetsForActivation({
          workflowExecutionId: "wfexec-parent-2",
          stepExecutionId: "step-exec-2",
          invokeStepDefinitionId: "step-def-invoke-2",
          invokeStep: {
            key: "invoke-drafted-work-units",
            targetKind: "work_unit",
            sourceMode: "fact_backed",
            contextFactDefinitionId: "fact-story-drafts",
            bindings: [],
            activationTransitions: [
              { transitionId: "transition-ready", workflowDefinitionIds: ["wf-create-story"] },
              { transitionId: "transition-ready", workflowDefinitionIds: ["wf-create-story"] },
              { transitionId: "transition-review", workflowDefinitionIds: [] },
            ],
          },
        });
      }).pipe(Effect.provide(runtime.layer)),
    );

    expect(result.materializationState).toBe("created");
    expect(result.blockingReason).toBeNull();
    expect(result.workUnitTargetExecutions).toHaveLength(4);
    expect(
      result.workUnitTargetExecutions.map((row) => [
        row.workUnitDefinitionId,
        row.transitionDefinitionId,
        row.resolutionOrder,
      ]),
    ).toEqual([
      ["wu-story", "transition-ready", 0],
      ["wu-story", "transition-review", 1],
      ["wu-story", "transition-ready", 2],
      ["wu-story", "transition-review", 3],
    ]);
    expect(result.workUnitTargetExecutions.every((row) => row.projectWorkUnitId === null)).toBe(
      true,
    );
    expect(result.workUnitTargetExecutions.every((row) => row.workflowExecutionId === null)).toBe(
      true,
    );
  });

  it("freezes a zero-target invoke step as blocked for the life of the step", async () => {
    const runtime = buildInvokeTargetResolutionTestLayer([]);

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* InvokeTargetResolutionService;

        const first = yield* service.materializeTargetsForActivation({
          workflowExecutionId: "wfexec-parent-3",
          stepExecutionId: "step-exec-3",
          invokeStepDefinitionId: "step-def-invoke-3",
          invokeStep: {
            key: "invoke-context-workflows",
            targetKind: "workflow",
            sourceMode: "fact_backed",
            contextFactDefinitionId: "fact-workflows",
          },
        });

        runtime.state.contextFacts.push({
          id: "ctx-late",
          workflowExecutionId: "wfexec-parent-3",
          contextFactDefinitionId: "fact-workflows",
          instanceOrder: 0,
          valueJson: ["wf-late"],
          sourceStepExecutionId: null,
          createdAt: new Date("2026-04-14T00:05:00.000Z"),
          updatedAt: new Date("2026-04-14T00:05:00.000Z"),
        });

        const second = yield* service.materializeTargetsForActivation({
          workflowExecutionId: "wfexec-parent-3",
          stepExecutionId: "step-exec-3",
          invokeStepDefinitionId: "step-def-invoke-3",
          invokeStep: {
            key: "invoke-context-workflows",
            targetKind: "workflow",
            sourceMode: "fact_backed",
            contextFactDefinitionId: "fact-workflows",
          },
        });

        return { first, second };
      }).pipe(Effect.provide(runtime.layer)),
    );

    expect(result.first.materializationState).toBe("created");
    expect(result.first.blockingReason).toBe(NO_INVOKE_TARGETS_RESOLVED_REASON);
    expect(result.first.workflowTargetExecutions).toEqual([]);
    expect(result.first.workUnitTargetExecutions).toEqual([]);
    expect(result.second.materializationState).toBe("already_exists");
    expect(result.second.blockingReason).toBe(NO_INVOKE_TARGETS_RESOLVED_REASON);
    expect(result.second.workflowTargetExecutions).toEqual([]);
    expect(runtime.state.invokeStates).toHaveLength(1);
    expect(runtime.state.workflowTargets).toHaveLength(0);
  });

  it("backfills context-backed work-unit targets when facts appear after initial zero-target materialization", async () => {
    const runtime = buildInvokeTargetResolutionTestLayer([]);

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* InvokeTargetResolutionService;

        const first = yield* service.materializeTargetsForActivation({
          workflowExecutionId: "wfexec-parent-4",
          stepExecutionId: "step-exec-4",
          invokeStepDefinitionId: "step-def-invoke-4",
          invokeStep: {
            key: "invoke-drafted-research-work-units",
            targetKind: "work_unit",
            sourceMode: "fact_backed",
            contextFactDefinitionId: "fact-research-draft-specs",
            bindings: [],
            activationTransitions: [
              {
                transitionId: "transition-ready",
                workflowDefinitionIds: ["wf-research-primary"],
              },
            ],
          },
        });

        runtime.state.contextFacts.push({
          id: "ctx-late-work-unit",
          workflowExecutionId: "wfexec-parent-4",
          contextFactDefinitionId: "fact-research-draft-specs",
          instanceOrder: 0,
          valueJson: [{ workUnitDefinitionId: "wu-research", id: "research-001" }],
          sourceStepExecutionId: null,
          createdAt: new Date("2026-04-14T00:05:00.000Z"),
          updatedAt: new Date("2026-04-14T00:05:00.000Z"),
        });

        const second = yield* service.materializeTargetsForActivation({
          workflowExecutionId: "wfexec-parent-4",
          stepExecutionId: "step-exec-4",
          invokeStepDefinitionId: "step-def-invoke-4",
          invokeStep: {
            key: "invoke-drafted-research-work-units",
            targetKind: "work_unit",
            sourceMode: "fact_backed",
            contextFactDefinitionId: "fact-research-draft-specs",
            bindings: [],
            activationTransitions: [
              {
                transitionId: "transition-ready",
                workflowDefinitionIds: ["wf-research-primary"],
              },
            ],
          },
        });

        return { first, second };
      }).pipe(Effect.provide(runtime.layer)),
    );

    expect(result.first.materializationState).toBe("created");
    expect(result.first.blockingReason).toBe(NO_INVOKE_TARGETS_RESOLVED_REASON);
    expect(result.first.workUnitTargetExecutions).toEqual([]);

    expect(result.second.materializationState).toBe("already_exists");
    expect(result.second.blockingReason).toBeNull();
    expect(result.second.workUnitTargetExecutions).toHaveLength(1);
    expect(result.second.workUnitTargetExecutions[0]).toMatchObject({
      workUnitDefinitionId: "wu-research",
      transitionDefinitionId: "transition-ready",
      resolutionOrder: 0,
    });
    expect(runtime.state.invokeStates).toHaveLength(1);
    expect(runtime.state.workUnitTargets).toHaveLength(1);
  });

  it("does not rematerialize context-backed work-unit targets once rows already exist", async () => {
    const runtime = buildInvokeTargetResolutionTestLayer([
      {
        id: "ctx-5",
        workflowExecutionId: "wfexec-parent-5",
        contextFactDefinitionId: "fact-research-draft-specs",
        instanceOrder: 0,
        valueJson: [{ workUnitDefinitionId: "wu-research", id: "research-001" }],
        sourceStepExecutionId: null,
        createdAt: new Date("2026-04-14T00:00:00.000Z"),
        updatedAt: new Date("2026-04-14T00:00:00.000Z"),
      },
    ]);

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* InvokeTargetResolutionService;

        const first = yield* service.materializeTargetsForActivation({
          workflowExecutionId: "wfexec-parent-5",
          stepExecutionId: "step-exec-5",
          invokeStepDefinitionId: "step-def-invoke-5",
          invokeStep: {
            key: "invoke-drafted-research-work-units",
            targetKind: "work_unit",
            sourceMode: "fact_backed",
            contextFactDefinitionId: "fact-research-draft-specs",
            bindings: [],
            activationTransitions: [
              {
                transitionId: "transition-ready",
                workflowDefinitionIds: ["wf-research-primary"],
              },
            ],
          },
        });

        runtime.state.contextFacts.push({
          id: "ctx-late-work-unit-2",
          workflowExecutionId: "wfexec-parent-5",
          contextFactDefinitionId: "fact-research-draft-specs",
          instanceOrder: 1,
          valueJson: [{ workUnitDefinitionId: "wu-research", id: "research-002" }],
          sourceStepExecutionId: null,
          createdAt: new Date("2026-04-14T00:05:00.000Z"),
          updatedAt: new Date("2026-04-14T00:05:00.000Z"),
        });

        const second = yield* service.materializeTargetsForActivation({
          workflowExecutionId: "wfexec-parent-5",
          stepExecutionId: "step-exec-5",
          invokeStepDefinitionId: "step-def-invoke-5",
          invokeStep: {
            key: "invoke-drafted-research-work-units",
            targetKind: "work_unit",
            sourceMode: "fact_backed",
            contextFactDefinitionId: "fact-research-draft-specs",
            bindings: [],
            activationTransitions: [
              {
                transitionId: "transition-ready",
                workflowDefinitionIds: ["wf-research-primary"],
              },
            ],
          },
        });

        return { first, second };
      }).pipe(Effect.provide(runtime.layer)),
    );

    expect(result.first.materializationState).toBe("created");
    expect(result.first.blockingReason).toBeNull();
    expect(result.first.workUnitTargetExecutions).toHaveLength(1);

    expect(result.second.materializationState).toBe("already_exists");
    expect(result.second.workUnitTargetExecutions).toHaveLength(1);
    expect(runtime.state.invokeStates).toHaveLength(1);
    expect(runtime.state.workUnitTargets).toHaveLength(1);
  });
});
