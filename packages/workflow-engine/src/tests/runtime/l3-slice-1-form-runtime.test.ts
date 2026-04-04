import { Context, Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";

import { ExecutionReadRepository } from "../../repositories/execution-read-repository";
import { ProjectFactRepository } from "../../repositories/project-fact-repository";
import {
  StepExecutionRepository,
  type RuntimeFormStepExecutionStateRow,
  type RuntimeStepExecutionRow,
  type RuntimeWorkflowEdgeRow,
  type RuntimeWorkflowExecutionContextFactRow,
  type RuntimeWorkflowStepDefinitionRow,
} from "../../repositories/step-execution-repository";
import { TransitionExecutionRepository } from "../../repositories/transition-execution-repository";
import { WorkflowExecutionRepository } from "../../repositories/workflow-execution-repository";
import {
  FormStepExecutionService,
  FormStepExecutionServiceLive,
} from "../../services/form-step-execution-service";
import {
  StepExecutionDetailService,
  StepExecutionDetailServiceLive,
} from "../../services/step-execution-detail-service";
import { StepContextMutationServiceLive } from "../../services/step-context-mutation-service";
import { StepContextQueryServiceLive } from "../../services/step-context-query-service";
import {
  StepExecutionLifecycleService,
  StepExecutionLifecycleServiceLive,
} from "../../services/step-execution-lifecycle-service";
import { StepExecutionTransactionServiceLive } from "../../services/step-execution-transaction-service";
import { StepProgressionServiceLive } from "../../services/step-progression-service";
import {
  WorkflowExecutionCommandService,
  WorkflowExecutionCommandServiceLive,
} from "../../services/workflow-execution-command-service";
import {
  WorkflowExecutionStepCommandService,
  WorkflowExecutionStepCommandServiceLive,
} from "../../services/workflow-execution-step-command-service";

function makeRuntimeLayer(options?: { secondStepType?: RuntimeWorkflowStepDefinitionRow["type"] }) {
  const secondStepType = options?.secondStepType ?? "form";
  const steps: RuntimeStepExecutionRow[] = [];
  const formState: RuntimeFormStepExecutionStateRow[] = [];
  const contextFacts: RuntimeWorkflowExecutionContextFactRow[] = [];
  const projectFacts: Context.Tag.Service<
    typeof ProjectFactRepository
  >["listFactsByProject"] extends (...args: any[]) => Effect.Effect<infer T, any>
    ? T extends readonly (infer Item)[]
      ? Item[]
      : never
    : never = [];

  const stepDefinitions: RuntimeWorkflowStepDefinitionRow[] = [
    {
      id: "step-1",
      workflowId: "workflow-1",
      key: "collect_setup_context",
      type: "form",
      createdAt: new Date("2026-04-03T10:00:00.000Z"),
    },
    {
      id: "step-2",
      workflowId: "workflow-1",
      key: "collect_setup_facts",
      type: secondStepType,
      createdAt: new Date("2026-04-03T10:01:00.000Z"),
    },
  ];

  const edges: RuntimeWorkflowEdgeRow[] = [
    {
      id: "edge-1",
      workflowId: "workflow-1",
      fromStepId: "step-1",
      toStepId: "step-2",
      createdAt: new Date("2026-04-03T10:02:00.000Z"),
    },
  ];

  const workflowExecutions = new Map([
    [
      "wfexec-1",
      {
        id: "wfexec-1",
        transitionExecutionId: "tx-1",
        workflowId: "workflow-1",
        workflowRole: "primary" as const,
        status: "active" as const,
        supersededByWorkflowExecutionId: null,
        startedAt: new Date("2026-04-03T09:59:00.000Z"),
        completedAt: null,
        supersededAt: null,
      },
    ],
  ]);

  const executionReadLayer = Layer.succeed(ExecutionReadRepository, {
    getTransitionExecutionDetail: () => Effect.succeed(null),
    listTransitionExecutionsForWorkUnit: () => Effect.succeed([]),
    getWorkflowExecutionDetail: (workflowExecutionId: string) =>
      Effect.sync(() => {
        const workflowExecution = workflowExecutions.get(workflowExecutionId);
        if (!workflowExecution) {
          return null;
        }

        return {
          workflowExecution,
          transitionExecution: {
            id: "tx-1",
            projectWorkUnitId: "wu-1",
            transitionId: "transition-1",
            status: "active" as const,
            primaryWorkflowExecutionId: workflowExecution.id,
            supersededByTransitionExecutionId: null,
            startedAt: new Date("2026-04-03T09:58:00.000Z"),
            completedAt: null,
            supersededAt: null,
          },
          projectId: "project-1",
          projectWorkUnitId: "wu-1",
          workUnitTypeId: "setup",
          currentStateId: "draft",
        };
      }),
    listWorkflowExecutionsForTransition: () => Effect.succeed([...workflowExecutions.values()]),
    listActiveWorkflowExecutionsByProject: () => Effect.succeed([]),
  } as unknown as Context.Tag.Service<typeof ExecutionReadRepository>);

  const stepRepoLayer = Layer.succeed(StepExecutionRepository, {
    createStepExecution: ({
      workflowExecutionId,
      stepDefinitionId,
      stepType,
      status,
      progressionData,
    }) =>
      Effect.sync(() => {
        const row: RuntimeStepExecutionRow = {
          id: `step-exec-${steps.length + 1}`,
          workflowExecutionId,
          stepDefinitionId,
          stepType,
          status,
          activatedAt: new Date(),
          completedAt: null,
          progressionData,
        };
        steps.push(row);
        return row;
      }),
    getStepExecutionById: (stepExecutionId) =>
      Effect.succeed(steps.find((row) => row.id === stepExecutionId) ?? null),
    findStepExecutionByWorkflowAndDefinition: ({ workflowExecutionId, stepDefinitionId }) =>
      Effect.succeed(
        steps.find(
          (row) =>
            row.workflowExecutionId === workflowExecutionId &&
            row.stepDefinitionId === stepDefinitionId,
        ) ?? null,
      ),
    listStepExecutionsForWorkflow: (workflowExecutionId) =>
      Effect.succeed(steps.filter((row) => row.workflowExecutionId === workflowExecutionId)),
    completeStepExecution: ({ stepExecutionId, progressionData }) =>
      Effect.sync(() => {
        const row = steps.find((item) => item.id === stepExecutionId);
        if (!row) {
          return null;
        }
        row.status = "completed";
        row.completedAt = new Date();
        row.progressionData = progressionData;
        return row;
      }),
    upsertFormStepExecutionState: ({
      stepExecutionId,
      draftValuesJson,
      submittedSnapshotJson,
      submittedAt,
    }) =>
      Effect.sync(() => {
        const existing = formState.find((row) => row.stepExecutionId === stepExecutionId);
        if (existing) {
          existing.draftValuesJson = draftValuesJson;
          existing.submittedSnapshotJson = submittedSnapshotJson;
          existing.submittedAt = submittedAt;
          return existing;
        }
        const row: RuntimeFormStepExecutionStateRow = {
          id: `state-${formState.length + 1}`,
          stepExecutionId,
          draftValuesJson,
          submittedSnapshotJson,
          submittedAt,
        };
        formState.push(row);
        return row;
      }),
    getFormStepExecutionState: (stepExecutionId) =>
      Effect.succeed(formState.find((row) => row.stepExecutionId === stepExecutionId) ?? null),
    writeWorkflowExecutionContextFact: ({
      workflowExecutionId,
      factKey,
      factKind,
      valueJson,
      sourceStepExecutionId,
    }) =>
      Effect.sync(() => {
        const row: RuntimeWorkflowExecutionContextFactRow = {
          id: `ctx-${contextFacts.length + 1}`,
          workflowExecutionId,
          factKey,
          factKind,
          valueJson,
          sourceStepExecutionId,
        };
        contextFacts.push(row);
        return row;
      }),
    listWorkflowExecutionContextFacts: (workflowExecutionId) =>
      Effect.succeed(contextFacts.filter((row) => row.workflowExecutionId === workflowExecutionId)),
    listWorkflowStepDefinitions: (workflowId) =>
      Effect.succeed(stepDefinitions.filter((row) => row.workflowId === workflowId)),
    listWorkflowEdges: (workflowId) =>
      Effect.succeed(edges.filter((row) => row.workflowId === workflowId)),
  } as unknown as Context.Tag.Service<typeof StepExecutionRepository>);

  const workflowRepoLayer = Layer.succeed(WorkflowExecutionRepository, {
    createWorkflowExecution: ({ transitionExecutionId, workflowId, workflowRole, status }) =>
      Effect.sync(() => {
        const created = {
          id: `wfexec-${workflowExecutions.size + 1}`,
          transitionExecutionId,
          workflowId,
          workflowRole,
          status: status ?? "active",
          supersededByWorkflowExecutionId: null,
          startedAt: new Date(),
          completedAt: null,
          supersededAt: null,
        };
        workflowExecutions.set(created.id, created);
        return created;
      }),
    getWorkflowExecutionById: (workflowExecutionId) =>
      Effect.succeed(workflowExecutions.get(workflowExecutionId) ?? null),
    markWorkflowExecutionCompleted: () => Effect.succeed(null),
    markWorkflowExecutionSuperseded: () => Effect.succeed(null),
    updateTransitionPrimaryWorkflowExecutionPointer: () => Effect.void,
    retryWorkflowExecution: () => Effect.succeed(null),
  } as unknown as Context.Tag.Service<typeof WorkflowExecutionRepository>);

  const projectFactRepoLayer = Layer.succeed(ProjectFactRepository, {
    createFactInstance: ({
      projectId,
      factDefinitionId,
      valueJson,
      producedByWorkflowExecutionId,
    }) =>
      Effect.sync(() => {
        const row = {
          id: `pf-${projectFacts.length + 1}`,
          projectId,
          factDefinitionId,
          valueJson,
          status: "active" as const,
          supersededByFactInstanceId: null,
          producedByTransitionExecutionId: null,
          producedByWorkflowExecutionId: producedByWorkflowExecutionId ?? null,
          authoredByUserId: null,
          createdAt: new Date(),
        };
        projectFacts.push(row);
        return row;
      }),
    getCurrentValuesByDefinition: ({ projectId, factDefinitionId }) =>
      Effect.succeed(
        projectFacts.filter(
          (row) =>
            row.projectId === projectId &&
            row.factDefinitionId === factDefinitionId &&
            row.status === "active",
        ),
      ),
    listFactsByProject: ({ projectId }) =>
      Effect.succeed(projectFacts.filter((row) => row.projectId === projectId)),
    supersedeFactInstance: ({ projectFactInstanceId, supersededByProjectFactInstanceId }) =>
      Effect.sync(() => {
        const row = projectFacts.find((item) => item.id === projectFactInstanceId);
        if (row) {
          row.status = "superseded";
          row.supersededByFactInstanceId = supersededByProjectFactInstanceId;
        }
      }),
  } as unknown as Context.Tag.Service<typeof ProjectFactRepository>);

  const transitionRepoLayer = Layer.succeed(TransitionExecutionRepository, {
    createTransitionExecution: () => Effect.die("unused"),
    startTransitionExecution: () => Effect.die("unused"),
    switchActiveTransitionExecution: () => Effect.die("unused"),
    getActiveTransitionExecutionForWorkUnit: () => Effect.succeed(null),
    getTransitionExecutionById: () => Effect.succeed(null),
  } as unknown as Context.Tag.Service<typeof TransitionExecutionRepository>);

  const base = Layer.mergeAll(
    executionReadLayer,
    stepRepoLayer,
    workflowRepoLayer,
    projectFactRepoLayer,
    transitionRepoLayer,
  );

  const progression = Layer.provide(StepProgressionServiceLive, base);
  const lifecycle = Layer.provide(
    StepExecutionLifecycleServiceLive,
    Layer.mergeAll(base, progression),
  );
  const contextMutation = Layer.provide(StepContextMutationServiceLive, base);
  const contextQuery = Layer.provide(StepContextQueryServiceLive, base);
  const transaction = Layer.provide(
    StepExecutionTransactionServiceLive,
    Layer.mergeAll(base, progression, lifecycle, contextMutation),
  );
  const formExecution = Layer.provide(
    FormStepExecutionServiceLive,
    Layer.mergeAll(base, transaction),
  );
  const stepCommand = Layer.provide(
    WorkflowExecutionStepCommandServiceLive,
    Layer.mergeAll(base, progression, lifecycle, formExecution),
  );
  const stepDetail = Layer.provide(
    StepExecutionDetailServiceLive,
    Layer.mergeAll(base, contextQuery),
  );
  const workflowCommand = Layer.provide(WorkflowExecutionCommandServiceLive, base);

  return {
    state: { steps, formState, contextFacts, projectFacts, workflowExecutions },
    layer: Layer.mergeAll(
      base,
      progression,
      lifecycle,
      contextMutation,
      contextQuery,
      transaction,
      formExecution,
      stepCommand,
      stepDetail,
      workflowCommand,
    ),
  };
}

describe("l3 slice-1 form runtime services", () => {
  it("explicit first-step activation is idempotent", async () => {
    const runtime = makeRuntimeLayer();

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* WorkflowExecutionStepCommandService;
        const first = yield* service.activateFirstWorkflowStepExecution({
          projectId: "project-1",
          workflowExecutionId: "wfexec-1",
        });
        const second = yield* service.activateFirstWorkflowStepExecution({
          projectId: "project-1",
          workflowExecutionId: "wfexec-1",
        });
        return { first, second };
      }).pipe(Effect.provide(runtime.layer)),
    );

    expect(result.first.stepExecutionId).toBe(result.second.stepExecutionId);
    expect(runtime.state.steps).toHaveLength(1);
  });

  it("submits Form step with immutable snapshot, context writes, mapped project writes, and progression", async () => {
    const runtime = makeRuntimeLayer();

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const stepCommands = yield* WorkflowExecutionStepCommandService;
        const detailService = yield* StepExecutionDetailService;

        const activated = yield* stepCommands.activateFirstWorkflowStepExecution({
          projectId: "project-1",
          workflowExecutionId: "wfexec-1",
        });

        yield* stepCommands.saveFormStepDraft({
          projectId: "project-1",
          workflowExecutionId: "wfexec-1",
          stepExecutionId: activated.stepExecutionId,
          values: {
            initiative_name: "Chiron",
            "project.setup_tags": { env: "dev" },
          },
        });

        const submitted = yield* stepCommands.submitFormStep({
          projectId: "project-1",
          workflowExecutionId: "wfexec-1",
          stepExecutionId: activated.stepExecutionId,
          values: {
            initiative_name: "Chiron",
            "project.setup_tags": { env: "dev" },
          },
        });

        const detail = yield* detailService.getRuntimeStepExecutionDetail({
          projectId: "project-1",
          stepExecutionId: activated.stepExecutionId,
        });

        return { submitted, detail };
      }).pipe(Effect.provide(runtime.layer)),
    );

    expect(result.submitted.status).toBe("captured");
    expect(runtime.state.formState[0]?.submittedSnapshotJson).toMatchObject({
      initiative_name: "Chiron",
      "project.setup_tags": { env: "dev" },
    });
    expect(runtime.state.contextFacts).toHaveLength(1);
    expect(runtime.state.contextFacts[0]?.factKey).toBe("initiative_name");

    expect(runtime.state.projectFacts).toHaveLength(1);
    expect(runtime.state.projectFacts[0]?.factDefinitionId).toBe("setup_tags");

    expect(result.detail?.tabs.submissionAndProgression.submittedSnapshot).toMatchObject({
      initiative_name: "Chiron",
    });
    expect(result.detail?.tabs.writes.workflowContextWrites).toHaveLength(1);
    expect(result.detail?.tabs.writes.authoritativeProjectFactWrites).toHaveLength(1);
    expect(
      result.detail?.tabs.contextFactSemantics.notes.some((note) =>
        note.includes("Submission snapshot is immutable"),
      ),
    ).toBe(true);
  });

  it("keeps lifecycle seams reusable when the next step type is deferred for a later slice", async () => {
    const runtime = makeRuntimeLayer({ secondStepType: "agent" });

    await Effect.runPromise(
      Effect.gen(function* () {
        const stepCommands = yield* WorkflowExecutionStepCommandService;

        const activated = yield* stepCommands.activateFirstWorkflowStepExecution({
          projectId: "project-1",
          workflowExecutionId: "wfexec-1",
        });

        yield* stepCommands.submitFormStep({
          projectId: "project-1",
          workflowExecutionId: "wfexec-1",
          stepExecutionId: activated.stepExecutionId,
          values: {
            initiative_name: "Chiron",
          },
        });
      }).pipe(Effect.provide(runtime.layer)),
    );

    const firstStep = runtime.state.steps.find((step) => step.stepDefinitionId === "step-1");
    const nextStep = runtime.state.steps.find((step) => step.stepDefinitionId === "step-2");

    expect(firstStep?.status).toBe("completed");
    expect(nextStep).toMatchObject({
      stepDefinitionId: "step-2",
      stepType: "agent",
      status: "active",
    });
    expect(nextStep?.progressionData).toMatchObject({
      activatedFromStepExecutionId: firstStep?.id,
    });
  });

  it("workflow retry path does not auto-create step executions", async () => {
    const runtime = makeRuntimeLayer();

    await Effect.runPromise(
      Effect.gen(function* () {
        const commandService = yield* WorkflowExecutionCommandService;
        yield* commandService.retrySameWorkflowExecution({
          projectId: "project-1",
          workflowExecutionId: "wfexec-1",
        });
      }).pipe(Effect.provide(runtime.layer)),
    );

    expect(runtime.state.steps).toHaveLength(0);
  });

  it("workflow start alone leaves step executions empty until explicit activation", async () => {
    const runtime = makeRuntimeLayer();

    expect(runtime.state.steps).toHaveLength(0);

    await Effect.runPromise(
      Effect.gen(function* () {
        const lifecycleService = yield* StepExecutionLifecycleService;
        const status = yield* lifecycleService.getStepExecutionStatus("missing");
        return status;
      }).pipe(Effect.provide(runtime.layer)),
    );

    expect(runtime.state.steps).toHaveLength(0);
  });
});
