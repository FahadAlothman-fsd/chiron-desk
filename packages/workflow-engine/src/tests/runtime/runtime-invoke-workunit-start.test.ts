import { Cause, Context, Effect, Layer, Option } from "effect";
import { describe, expect, it } from "vitest";

import { LifecycleRepository, MethodologyRepository } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";
import { RepositoryError } from "../../errors";
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
} from "../../repositories/invoke-execution-repository";
import {
  StepExecutionRepository,
  type RuntimeFormStepExecutionStateRow,
  type RuntimeStepExecutionRow,
  type RuntimeWorkflowContextFactDefinitionRow,
  type RuntimeWorkflowEdgeRow,
  type RuntimeWorkflowExecutionContextFactRow,
  type RuntimeWorkflowStepDefinitionRow,
  type UpsertRuntimeFormStepExecutionStateParams,
} from "../../repositories/step-execution-repository";
import {
  InvokeWorkUnitExecutionService,
  InvokeWorkUnitExecutionServiceLive,
} from "../../services/invoke-work-unit-execution-service";

type TestState = {
  projectWorkUnits: Array<{
    id: string;
    projectId: string;
    workUnitTypeId: string;
    currentStateId: string | null;
  }>;
  factInstances: Array<{
    id: string;
    projectWorkUnitId: string;
    factDefinitionId: string;
    valueJson: unknown;
  }>;
  artifactSnapshots: Array<{
    id: string;
    projectWorkUnitId: string;
    artifactSlotDefinitionId: string;
  }>;
  transitionExecutions: Array<{
    id: string;
    projectWorkUnitId: string;
    transitionDefinitionId: string;
  }>;
  workflowExecutions: Array<{
    id: string;
    transitionExecutionId: string;
    workflowDefinitionId: string;
  }>;
  factMappings: InvokeWorkUnitCreatedFactInstanceRow[];
  artifactMappings: InvokeWorkUnitCreatedArtifactSnapshotRow[];
  invokeTarget: InvokeWorkUnitTargetExecutionRow;
};

function createRuntime(options?: {
  stepExecutionStatus?: RuntimeStepExecutionRow["status"];
  invokeActivationTransitions?: ReadonlyArray<{
    transitionId: string;
    workflowDefinitionIds: readonly string[];
  }>;
  invokeBindings?: ReadonlyArray<{
    destination:
      | { kind: "work_unit_fact"; workUnitFactDefinitionId: string }
      | { kind: "artifact_slot"; artifactSlotDefinitionId: string };
    source:
      | { kind: "context_fact"; contextFactDefinitionId: string }
      | { kind: "literal"; value: string | number | boolean }
      | { kind: "runtime" };
  }>;
  workflowContextFactInstances?: readonly RuntimeWorkflowExecutionContextFactRow[];
  workflowEditorContextFacts?: ReadonlyArray<{
    contextFactDefinitionId: string;
    key: string;
    kind: string;
    cardinality: "one" | "many";
    valueType?: "string" | "number" | "boolean" | "json";
    label?: string;
  }>;
  factSchemas?: ReadonlyArray<{
    id: string;
    methodologyVersionId: string;
    workUnitTypeId: string;
    name: string;
    key: string;
    factType: "string" | "number" | "boolean" | "json";
    cardinality: "one" | "many";
    description: null;
    defaultValueJson: unknown;
    guidanceJson: null;
    validationJson: unknown;
    createdAt: Date;
    updatedAt: Date;
  }>;
}) {
  const invokeRoot: InvokeStepExecutionStateRow = {
    id: "invoke-root-1",
    stepExecutionId: "step-exec-1",
    invokeStepDefinitionId: "invoke-step-1",
    createdAt: new Date("2026-04-14T00:00:00.000Z"),
    updatedAt: new Date("2026-04-14T00:00:00.000Z"),
  };

  const state: TestState = {
    projectWorkUnits: [],
    factInstances: [],
    artifactSnapshots: [],
    transitionExecutions: [],
    workflowExecutions: [],
    factMappings: [],
    artifactMappings: [],
    invokeTarget: {
      id: "invoke-wu-target-1",
      invokeStepExecutionStateId: invokeRoot.id,
      projectWorkUnitId: null,
      workUnitDefinitionId: "wu-child",
      transitionDefinitionId: "transition-ready",
      transitionExecutionId: null,
      workflowDefinitionId: null,
      workflowExecutionId: null,
      resolutionOrder: 0,
      createdAt: new Date("2026-04-14T00:01:00.000Z"),
      updatedAt: new Date("2026-04-14T00:01:00.000Z"),
    },
  };

  const workflowDetail: WorkflowExecutionDetailReadModel = {
    workflowExecution: {
      id: "wf-parent-exec-1",
      transitionExecutionId: "tx-parent-1",
      workflowId: "wf-parent",
      workflowRole: "primary",
      status: "active",
      currentStepExecutionId: "step-exec-1",
      supersededByWorkflowExecutionId: null,
      startedAt: new Date("2026-04-14T00:00:00.000Z"),
      completedAt: null,
      supersededAt: null,
    },
    transitionExecution: {
      id: "tx-parent-1",
      projectWorkUnitId: "wu-parent-1",
      transitionId: "transition-parent",
      status: "active",
      primaryWorkflowExecutionId: "wf-parent-exec-1",
      supersededByTransitionExecutionId: null,
      startedAt: new Date("2026-04-14T00:00:00.000Z"),
      completedAt: null,
      supersededAt: null,
    },
    projectId: "project-1",
    projectWorkUnitId: "wu-parent-1",
    workUnitTypeId: "wu-parent",
    currentStateId: "state-parent-active",
  };

  const stepExecution: RuntimeStepExecutionRow = {
    id: "step-exec-1",
    workflowExecutionId: workflowDetail.workflowExecution.id,
    stepDefinitionId: "invoke-step-1",
    stepType: "invoke",
    status: options?.stepExecutionStatus ?? "active",
    activatedAt: new Date("2026-04-14T00:00:00.000Z"),
    completedAt:
      options?.stepExecutionStatus === "completed" ? new Date("2026-04-14T00:05:00.000Z") : null,
    previousStepExecutionId: null,
  };

  const stepRepoLayer = Layer.succeed(StepExecutionRepository, {
    createStepExecution: () => Effect.die("unused"),
    getStepExecutionById: (stepExecutionId: string) =>
      Effect.succeed(stepExecutionId === stepExecution.id ? stepExecution : null),
    findStepExecutionByWorkflowAndDefinition: () => Effect.die("unused"),
    listStepExecutionsForWorkflow: () => Effect.succeed([]),
    completeStepExecution: () => Effect.die("unused"),
    createFormStepExecutionState: () => Effect.die("unused"),
    upsertFormStepExecutionState: (_params: UpsertRuntimeFormStepExecutionStateParams) =>
      Effect.die("unused"),
    getFormStepExecutionState: () => Effect.succeed<RuntimeFormStepExecutionStateRow | null>(null),
    replaceWorkflowExecutionContextFacts: () => Effect.die("unused"),
    listWorkflowExecutionContextFacts: () =>
      Effect.succeed<readonly RuntimeWorkflowExecutionContextFactRow[]>(
        options?.workflowContextFactInstances ?? [],
      ),
    listWorkflowContextFactDefinitions: () =>
      Effect.succeed<readonly RuntimeWorkflowContextFactDefinitionRow[]>([]),
    listWorkflowStepDefinitions: () =>
      Effect.succeed<readonly RuntimeWorkflowStepDefinitionRow[]>([]),
    listWorkflowEdges: () => Effect.succeed<readonly RuntimeWorkflowEdgeRow[]>([]),
  } as unknown as Context.Tag.Service<typeof StepExecutionRepository>);

  const readRepoLayer = Layer.succeed(ExecutionReadRepository, {
    getTransitionExecutionDetail: () => Effect.succeed(null),
    listTransitionExecutionsForWorkUnit: () => Effect.succeed([]),
    getWorkflowExecutionDetail: (workflowExecutionId: string) =>
      Effect.succeed(
        workflowExecutionId === workflowDetail.workflowExecution.id ? workflowDetail : null,
      ),
    listWorkflowExecutionsForTransition: () => Effect.succeed([]),
    listActiveWorkflowExecutionsByProject: () => Effect.succeed([]),
  } as unknown as Context.Tag.Service<typeof ExecutionReadRepository>);

  const projectContextRepoLayer = Layer.succeed(ProjectContextRepository, {
    findProjectPin: () =>
      Effect.succeed({
        projectId: "project-1",
        methodologyVersionId: "version-1",
        methodologyId: "methodology-1",
        methodologyKey: "core",
        publishedVersion: "1.0.0",
        actorId: null,
        createdAt: new Date("2026-04-14T00:00:00.000Z"),
        updatedAt: new Date("2026-04-14T00:00:00.000Z"),
      }),
  } as unknown as Context.Tag.Service<typeof ProjectContextRepository>);

  const lifecycleRepoLayer = Layer.succeed(LifecycleRepository, {
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
          id: "wu-child",
          methodologyVersionId: "version-1",
          key: "WU.CHILD",
          displayName: "Child",
          descriptionJson: null,
          guidanceJson: null,
          cardinality: "many",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
    findLifecycleStates: () => Effect.succeed([]),
    findLifecycleTransitions: () => Effect.succeed([]),
    findFactSchemas: (_versionId: string, workUnitTypeId?: string) =>
      Effect.succeed(
        workUnitTypeId === "wu-child"
          ? (options?.factSchemas ?? [
              {
                id: "fact-1",
                methodologyVersionId: "version-1",
                workUnitTypeId: "wu-child",
                name: "Title",
                key: "title",
                factType: "string",
                cardinality: "one",
                description: null,
                defaultValueJson: "Draft title",
                guidanceJson: null,
                validationJson: null,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
              {
                id: "fact-2",
                methodologyVersionId: "version-1",
                workUnitTypeId: "wu-child",
                name: "Notes",
                key: "notes",
                factType: "json",
                cardinality: "one",
                description: null,
                defaultValueJson: null,
                guidanceJson: null,
                validationJson: null,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ])
          : [],
      ),
    findTransitionConditionSets: () => Effect.succeed([]),
    findAgentTypes: () => Effect.succeed([]),
    findTransitionWorkflowBindings: () => Effect.succeed([]),
    saveLifecycleDefinition: () => Effect.die("unused"),
    recordLifecycleEvent: () => Effect.die("unused"),
  } as unknown as Context.Tag.Service<typeof LifecycleRepository>);

  const methodologyRepoLayer = Layer.succeed(MethodologyRepository, {
    getWorkflowEditorDefinition: () =>
      Effect.succeed({
        contextFacts: options?.workflowEditorContextFacts ?? [],
      }),
    getInvokeStepDefinition: () =>
      Effect.succeed({
        stepId: "invoke-step-1",
        payload: {
          key: "invoke-children",
          targetKind: "work_unit",
          sourceMode: "fixed_set",
          workUnitDefinitionId: "wu-child",
          bindings: options?.invokeBindings ?? [],
          activationTransitions: options?.invokeActivationTransitions ?? [
            {
              transitionId: "transition-ready",
              workflowDefinitionIds: ["wf-child-primary", "wf-child-secondary"],
            },
          ],
        },
      }),
    findArtifactSlotsByWorkUnitType: () =>
      Effect.succeed([
        {
          id: "slot-1",
          key: "brief",
          displayName: "Brief",
          descriptionJson: null,
          guidanceJson: null,
          cardinality: "single",
          rulesJson: null,
          templates: [],
        },
        {
          id: "slot-2",
          key: "notes",
          displayName: "Notes",
          descriptionJson: null,
          guidanceJson: null,
          cardinality: "single",
          rulesJson: null,
          templates: [],
        },
      ]),
  } as unknown as Context.Tag.Service<typeof MethodologyRepository>);

  const invokeRepoLayer = Layer.succeed(InvokeExecutionRepository, {
    createInvokeStepExecutionState: () => Effect.die("unused"),
    getInvokeStepExecutionStateByStepExecutionId: (stepExecutionId: string) =>
      Effect.succeed(stepExecutionId === invokeRoot.stepExecutionId ? invokeRoot : null),
    listInvokeWorkflowTargetExecutions: () => Effect.succeed([]),
    getInvokeWorkflowTargetExecutionById: () => Effect.succeed(null),
    createInvokeWorkflowTargetExecution: () => Effect.die("unused"),
    markInvokeWorkflowTargetExecutionStarted: () => Effect.die("unused"),
    listInvokeWorkUnitTargetExecutions: () => Effect.succeed([state.invokeTarget]),
    getInvokeWorkUnitTargetExecutionById: (invokeWorkUnitTargetExecutionId: string) =>
      Effect.succeed(
        invokeWorkUnitTargetExecutionId === state.invokeTarget.id ? state.invokeTarget : null,
      ),
    createInvokeWorkUnitTargetExecution: () => Effect.die("unused"),
    markInvokeWorkUnitTargetExecutionStarted: () => Effect.die("unused"),
    listInvokeWorkUnitCreatedFactInstances: () => Effect.succeed(state.factMappings),
    createInvokeWorkUnitCreatedFactInstance: () => Effect.die("unused"),
    listInvokeWorkUnitCreatedArtifactSnapshots: () => Effect.succeed(state.artifactMappings),
    createInvokeWorkUnitCreatedArtifactSnapshot: () => Effect.die("unused"),
    startInvokeWorkUnitTargetAtomically: (params: {
      projectId: string;
      invokeWorkUnitTargetExecutionId: string;
      workUnitDefinitionId: string;
      transitionDefinitionId: string;
      workflowDefinitionId: string;
      initialFactDefinitions: ReadonlyArray<{
        factDefinitionId: string;
        initialValueJson: unknown;
      }>;
      initialArtifactSlotDefinitions: ReadonlyArray<{ artifactSlotDefinitionId: string }>;
    }) =>
      Effect.try({
        try: () => {
          const snapshot = {
            projectWorkUnits: [...state.projectWorkUnits],
            factInstances: [...state.factInstances],
            artifactSnapshots: [...state.artifactSnapshots],
            transitionExecutions: [...state.transitionExecutions],
            workflowExecutions: [...state.workflowExecutions],
            factMappings: [...state.factMappings],
            artifactMappings: [...state.artifactMappings],
            invokeTarget: { ...state.invokeTarget },
          };

          try {
            const projectWorkUnitId = `pwu-${state.projectWorkUnits.length + 1}`;
            state.projectWorkUnits.push({
              id: projectWorkUnitId,
              projectId: params.projectId,
              workUnitTypeId: params.workUnitDefinitionId,
              currentStateId: null,
            });

            const createdFactIds = params.initialFactDefinitions.map((definition, index) => {
              const id = `fact-instance-${state.factInstances.length + index + 1}`;
              state.factInstances.push({
                id,
                projectWorkUnitId,
                factDefinitionId: definition.factDefinitionId,
                valueJson: definition.initialValueJson,
              });
              state.factMappings.push({
                id: `fact-map-${state.factMappings.length + 1}`,
                invokeWorkUnitTargetExecutionId: params.invokeWorkUnitTargetExecutionId,
                factDefinitionId: definition.factDefinitionId,
                workUnitFactInstanceId: id,
                createdAt: new Date("2026-04-14T00:02:00.000Z"),
              });
              return id;
            });

            const createdArtifactIds = params.initialArtifactSlotDefinitions.map(
              (definition, index) => {
                const id = `artifact-snapshot-${state.artifactSnapshots.length + index + 1}`;
                state.artifactSnapshots.push({
                  id,
                  projectWorkUnitId,
                  artifactSlotDefinitionId: definition.artifactSlotDefinitionId,
                });
                state.artifactMappings.push({
                  id: `artifact-map-${state.artifactMappings.length + 1}`,
                  invokeWorkUnitTargetExecutionId: params.invokeWorkUnitTargetExecutionId,
                  artifactSlotDefinitionId: definition.artifactSlotDefinitionId,
                  artifactSnapshotId: id,
                  createdAt: new Date("2026-04-14T00:03:00.000Z"),
                });
                return id;
              },
            );

            if (params.workflowDefinitionId === "wf-fail-after-artifacts") {
              throw new Error("Injected atomic failure");
            }

            const transitionExecutionId = `transition-exec-${state.transitionExecutions.length + 1}`;
            state.transitionExecutions.push({
              id: transitionExecutionId,
              projectWorkUnitId,
              transitionDefinitionId: params.transitionDefinitionId,
            });

            const workflowExecutionId = `workflow-exec-${state.workflowExecutions.length + 1}`;
            state.workflowExecutions.push({
              id: workflowExecutionId,
              transitionExecutionId,
              workflowDefinitionId: params.workflowDefinitionId,
            });

            state.invokeTarget = {
              ...state.invokeTarget,
              projectWorkUnitId,
              transitionExecutionId,
              workflowDefinitionId: params.workflowDefinitionId,
              workflowExecutionId,
              updatedAt: new Date("2026-04-14T00:04:00.000Z"),
            };

            expect(createdFactIds).toEqual(
              state.factMappings.map((row) => row.workUnitFactInstanceId),
            );
            expect(createdArtifactIds).toEqual(
              state.artifactMappings.map((row) => row.artifactSnapshotId),
            );

            return {
              invokeWorkUnitTargetExecutionId: params.invokeWorkUnitTargetExecutionId,
              projectWorkUnitId,
              transitionExecutionId,
              workflowExecutionId,
              result: "started" as const,
            };
          } catch (error) {
            state.projectWorkUnits = snapshot.projectWorkUnits;
            state.factInstances = snapshot.factInstances;
            state.artifactSnapshots = snapshot.artifactSnapshots;
            state.transitionExecutions = snapshot.transitionExecutions;
            state.workflowExecutions = snapshot.workflowExecutions;
            state.factMappings = snapshot.factMappings;
            state.artifactMappings = snapshot.artifactMappings;
            state.invokeTarget = snapshot.invokeTarget;
            throw error;
          }
        },
        catch: (cause) => new Error(cause instanceof Error ? cause.message : String(cause)),
      }).pipe(
        Effect.mapError(
          (cause) =>
            new RepositoryError({
              operation: "invoke.atomic.startInvokeWorkUnitTarget",
              cause,
            }),
        ),
      ),
  } as unknown as Context.Tag.Service<typeof InvokeExecutionRepository>);

  const dependencies = Layer.mergeAll(
    stepRepoLayer,
    readRepoLayer,
    projectContextRepoLayer,
    lifecycleRepoLayer,
    methodologyRepoLayer,
    invokeRepoLayer,
  );

  const layer = Layer.provide(InvokeWorkUnitExecutionServiceLive, dependencies);

  return { dependencies, layer, state };
}

describe("InvokeWorkUnitExecutionService", () => {
  const expectRepositoryErrorMessage = async (
    effect: Effect.Effect<unknown, RepositoryError, InvokeWorkUnitExecutionService>,
    layer: Layer.Layer<InvokeWorkUnitExecutionService>,
    message: string,
  ) => {
    const exit = await Effect.runPromiseExit(effect.pipe(Effect.provide(layer)));
    expect(exit._tag).toBe("Failure");
    if (exit._tag !== "Failure") {
      return;
    }

    const failure = Cause.failureOption(exit.cause);
    expect(Option.isSome(failure)).toBe(true);
    if (Option.isNone(failure)) {
      return;
    }

    expect(failure.value._tag).toBe("RepositoryError");
    expect(failure.value.cause).toMatchObject({ message });
  };

  it("starts an invoke work-unit target in one atomic operation with mapping rows", async () => {
    const runtime = createRuntime();

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* InvokeWorkUnitExecutionService;
        return yield* service.startInvokeWorkUnitTarget({
          projectId: "project-1",
          stepExecutionId: "step-exec-1",
          invokeWorkUnitTargetExecutionId: "invoke-wu-target-1",
          workflowDefinitionId: "wf-child-primary",
        });
      }).pipe(Effect.provide(runtime.layer)),
    );

    expect(result.result).toBe("started");
    expect(runtime.state.projectWorkUnits).toEqual([
      {
        id: result.projectWorkUnitId,
        projectId: "project-1",
        workUnitTypeId: "wu-child",
        currentStateId: null,
      },
    ]);
    expect(runtime.state.factInstances.map((row) => row.id)).toEqual(
      runtime.state.factMappings.map((row) => row.workUnitFactInstanceId),
    );
    expect(runtime.state.artifactSnapshots.map((row) => row.id)).toEqual(
      runtime.state.artifactMappings.map((row) => row.artifactSnapshotId),
    );
    expect(runtime.state.transitionExecutions).toEqual([
      {
        id: result.transitionExecutionId,
        projectWorkUnitId: result.projectWorkUnitId,
        transitionDefinitionId: "transition-ready",
      },
    ]);
    expect(runtime.state.workflowExecutions).toEqual([
      {
        id: result.workflowExecutionId,
        transitionExecutionId: result.transitionExecutionId,
        workflowDefinitionId: "wf-child-primary",
      },
    ]);
    expect(runtime.state.invokeTarget.projectWorkUnitId).toBe(result.projectWorkUnitId);
    expect(runtime.state.invokeTarget.transitionExecutionId).toBe(result.transitionExecutionId);
    expect(runtime.state.invokeTarget.workflowExecutionId).toBe(result.workflowExecutionId);
    expect(runtime.state.invokeTarget.workflowDefinitionId).toBe("wf-child-primary");
  });

  it("returns already_started without duplicating entities", async () => {
    const runtime = createRuntime();
    runtime.state.invokeTarget = {
      ...runtime.state.invokeTarget,
      projectWorkUnitId: "pwu-existing",
      transitionExecutionId: "transition-exec-existing",
      workflowDefinitionId: "wf-child-primary",
      workflowExecutionId: "workflow-exec-existing",
    };

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* InvokeWorkUnitExecutionService;
        return yield* service.startInvokeWorkUnitTarget({
          projectId: "project-1",
          stepExecutionId: "step-exec-1",
          invokeWorkUnitTargetExecutionId: "invoke-wu-target-1",
          workflowDefinitionId: "wf-child-primary",
        });
      }).pipe(Effect.provide(runtime.layer)),
    );

    expect(result).toEqual({
      invokeWorkUnitTargetExecutionId: "invoke-wu-target-1",
      projectWorkUnitId: "pwu-existing",
      transitionExecutionId: "transition-exec-existing",
      workflowExecutionId: "workflow-exec-existing",
      result: "already_started",
    });
    expect(runtime.state.projectWorkUnits).toHaveLength(0);
    expect(runtime.state.factInstances).toHaveLength(0);
    expect(runtime.state.artifactSnapshots).toHaveLength(0);
  });

  it("fails invalid workflow selections before creation", async () => {
    const runtime = createRuntime();

    await expectRepositoryErrorMessage(
      Effect.gen(function* () {
        const service = yield* InvokeWorkUnitExecutionService;
        return yield* service.startInvokeWorkUnitTarget({
          projectId: "project-1",
          stepExecutionId: "step-exec-1",
          invokeWorkUnitTargetExecutionId: "invoke-wu-target-1",
          workflowDefinitionId: "wf-not-allowed",
        });
      }),
      runtime.layer,
      "selected workflow definition is not valid for target",
    );

    expect(runtime.state.projectWorkUnits).toHaveLength(0);
    expect(runtime.state.factInstances).toHaveLength(0);
    expect(runtime.state.artifactSnapshots).toHaveLength(0);
  });

  it("fails blocked transitions before creation", async () => {
    const runtime = createRuntime({ invokeActivationTransitions: [] });

    await expectRepositoryErrorMessage(
      Effect.gen(function* () {
        const service = yield* InvokeWorkUnitExecutionService;
        return yield* service.startInvokeWorkUnitTarget({
          projectId: "project-1",
          stepExecutionId: "step-exec-1",
          invokeWorkUnitTargetExecutionId: "invoke-wu-target-1",
          workflowDefinitionId: "wf-child-primary",
        });
      }),
      runtime.layer,
      "invoke work-unit target transition is blocked",
    );

    expect(runtime.state.projectWorkUnits).toHaveLength(0);
    expect(runtime.state.factInstances).toHaveLength(0);
    expect(runtime.state.artifactSnapshots).toHaveLength(0);
  });

  it("rolls back all created entities on atomic failure", async () => {
    const runtime = createRuntime({
      invokeActivationTransitions: [
        {
          transitionId: "transition-ready",
          workflowDefinitionIds: [
            "wf-child-primary",
            "wf-child-secondary",
            "wf-fail-after-artifacts",
          ],
        },
      ],
    });

    await expectRepositoryErrorMessage(
      Effect.gen(function* () {
        const service = yield* InvokeWorkUnitExecutionService;
        return yield* service.startInvokeWorkUnitTarget({
          projectId: "project-1",
          stepExecutionId: "step-exec-1",
          invokeWorkUnitTargetExecutionId: "invoke-wu-target-1",
          workflowDefinitionId: "wf-fail-after-artifacts",
        });
      }),
      runtime.layer,
      "Injected atomic failure",
    );

    expect(runtime.state.projectWorkUnits).toEqual([]);
    expect(runtime.state.factInstances).toEqual([]);
    expect(runtime.state.artifactSnapshots).toEqual([]);
    expect(runtime.state.transitionExecutions).toEqual([]);
    expect(runtime.state.workflowExecutions).toEqual([]);
    expect(runtime.state.factMappings).toEqual([]);
    expect(runtime.state.artifactMappings).toEqual([]);
    expect(runtime.state.invokeTarget.projectWorkUnitId).toBeNull();
    expect(runtime.state.invokeTarget.transitionExecutionId).toBeNull();
    expect(runtime.state.invokeTarget.workflowExecutionId).toBeNull();
  });

  it("applies bound/context/runtime values and only initializes mapped-or-default facts", async () => {
    const runtime = createRuntime({
      invokeBindings: [
        {
          destination: { kind: "work_unit_fact", workUnitFactDefinitionId: "fact-1" },
          source: { kind: "literal", value: "Bound title" },
        },
        {
          destination: { kind: "work_unit_fact", workUnitFactDefinitionId: "fact-2" },
          source: { kind: "context_fact", contextFactDefinitionId: "ctx-fact-json" },
        },
        {
          destination: { kind: "work_unit_fact", workUnitFactDefinitionId: "fact-3" },
          source: { kind: "runtime" },
        },
      ],
      workflowEditorContextFacts: [
        {
          contextFactDefinitionId: "ctx-fact-json",
          key: "ctx_json",
          kind: "plain_value_fact",
          cardinality: "one",
          valueType: "json",
          label: "Context Json",
        },
      ],
      workflowContextFactInstances: [
        {
          id: "ctx-instance-1",
          workflowExecutionId: "wf-parent-exec-1",
          contextFactDefinitionId: "ctx-fact-json",
          instanceOrder: 0,
          valueJson: { payload: "from-context" },
          sourceStepExecutionId: "form-step-1",
          createdAt: new Date("2026-04-14T00:00:00.000Z"),
          updatedAt: new Date("2026-04-14T00:00:00.000Z"),
        },
      ],
      factSchemas: [
        {
          id: "fact-1",
          methodologyVersionId: "version-1",
          workUnitTypeId: "wu-child",
          name: "Title",
          key: "title",
          factType: "string",
          cardinality: "one",
          description: null,
          defaultValueJson: "Draft title",
          guidanceJson: null,
          validationJson: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "fact-2",
          methodologyVersionId: "version-1",
          workUnitTypeId: "wu-child",
          name: "Context Json",
          key: "context_json",
          factType: "json",
          cardinality: "one",
          description: null,
          defaultValueJson: null,
          guidanceJson: null,
          validationJson: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "fact-3",
          methodologyVersionId: "version-1",
          workUnitTypeId: "wu-child",
          name: "Runtime Number",
          key: "runtime_number",
          factType: "number",
          cardinality: "one",
          description: null,
          defaultValueJson: null,
          guidanceJson: null,
          validationJson: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "fact-4",
          methodologyVersionId: "version-1",
          workUnitTypeId: "wu-child",
          name: "Unmapped Nullable",
          key: "unmapped_nullable",
          factType: "string",
          cardinality: "one",
          description: null,
          defaultValueJson: null,
          guidanceJson: null,
          validationJson: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* InvokeWorkUnitExecutionService;
        return yield* service.startInvokeWorkUnitTarget({
          projectId: "project-1",
          stepExecutionId: "step-exec-1",
          invokeWorkUnitTargetExecutionId: "invoke-wu-target-1",
          workflowDefinitionId: "wf-child-primary",
          runtimeFactValues: [{ workUnitFactDefinitionId: "fact-3", valueJson: 42 }],
        });
      }).pipe(Effect.provide(runtime.layer)),
    );

    expect(result.result).toBe("started");
    expect(runtime.state.factInstances).toHaveLength(3);
    expect(runtime.state.factInstances).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ factDefinitionId: "fact-1", valueJson: "Bound title" }),
        expect.objectContaining({
          factDefinitionId: "fact-2",
          valueJson: { payload: "from-context" },
        }),
        expect.objectContaining({ factDefinitionId: "fact-3", valueJson: 42 }),
      ]),
    );
    expect(runtime.state.factInstances.find((row) => row.factDefinitionId === "fact-4")).toBe(
      undefined,
    );
  });

  it("fails when a runtime binding value is missing", async () => {
    const runtime = createRuntime({
      invokeBindings: [
        {
          destination: { kind: "work_unit_fact", workUnitFactDefinitionId: "fact-1" },
          source: { kind: "runtime" },
        },
      ],
      factSchemas: [
        {
          id: "fact-1",
          methodologyVersionId: "version-1",
          workUnitTypeId: "wu-child",
          name: "Runtime Required",
          key: "runtime_required",
          factType: "string",
          cardinality: "one",
          description: null,
          defaultValueJson: null,
          guidanceJson: null,
          validationJson: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });

    await expectRepositoryErrorMessage(
      Effect.gen(function* () {
        const service = yield* InvokeWorkUnitExecutionService;
        return yield* service.startInvokeWorkUnitTarget({
          projectId: "project-1",
          stepExecutionId: "step-exec-1",
          invokeWorkUnitTargetExecutionId: "invoke-wu-target-1",
          workflowDefinitionId: "wf-child-primary",
        });
      }),
      runtime.layer,
      "missing runtime value for work-unit fact 'fact-1'",
    );
  });

  it("fails when invoke bindings target artifact slots", async () => {
    const runtime = createRuntime({
      invokeBindings: [
        {
          destination: { kind: "artifact_slot", artifactSlotDefinitionId: "slot-1" },
          source: { kind: "context_fact", contextFactDefinitionId: "ctx-artifact" },
        },
      ],
    });

    await expectRepositoryErrorMessage(
      Effect.gen(function* () {
        const service = yield* InvokeWorkUnitExecutionService;
        return yield* service.startInvokeWorkUnitTarget({
          projectId: "project-1",
          stepExecutionId: "step-exec-1",
          invokeWorkUnitTargetExecutionId: "invoke-wu-target-1",
          workflowDefinitionId: "wf-child-primary",
        });
      }),
      runtime.layer,
      "artifact-slot bindings are not supported for invoke work-unit starts",
    );
  });

  it("rejects starts when the parent invoke step is no longer active", async () => {
    const runtime = createRuntime({ stepExecutionStatus: "completed" });

    await expectRepositoryErrorMessage(
      Effect.gen(function* () {
        const service = yield* InvokeWorkUnitExecutionService;
        return yield* service.startInvokeWorkUnitTarget({
          projectId: "project-1",
          stepExecutionId: "step-exec-1",
          invokeWorkUnitTargetExecutionId: "invoke-wu-target-1",
          workflowDefinitionId: "wf-child-primary",
        });
      }),
      runtime.layer,
      "step execution is not active",
    );

    expect(runtime.state.projectWorkUnits).toEqual([]);
    expect(runtime.state.factInstances).toEqual([]);
    expect(runtime.state.artifactSnapshots).toEqual([]);
    expect(runtime.state.transitionExecutions).toEqual([]);
    expect(runtime.state.workflowExecutions).toEqual([]);
    expect(runtime.state.factMappings).toEqual([]);
    expect(runtime.state.artifactMappings).toEqual([]);
    expect(runtime.state.invokeTarget.projectWorkUnitId).toBeNull();
    expect(runtime.state.invokeTarget.transitionExecutionId).toBeNull();
    expect(runtime.state.invokeTarget.workflowExecutionId).toBeNull();
  });
});
