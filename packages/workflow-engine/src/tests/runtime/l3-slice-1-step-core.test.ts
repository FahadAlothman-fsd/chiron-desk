import { Context, Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";

import { ProjectFactRepository } from "../../repositories/project-fact-repository";
import {
  StepExecutionRepository,
  type RuntimeFormStepExecutionStateRow,
  type RuntimeStepExecutionRow,
  type RuntimeWorkflowEdgeRow,
  type RuntimeWorkflowExecutionContextFactRow,
  type RuntimeWorkflowStepDefinitionRow,
} from "../../repositories/step-execution-repository";
import { WorkflowExecutionRepository } from "../../repositories/workflow-execution-repository";
import {
  StepExecutionLifecycleService,
  StepExecutionLifecycleServiceLive,
} from "../../services/step-execution-lifecycle-service";
import {
  StepExecutionTransactionService,
  StepExecutionTransactionServiceLive,
} from "../../services/step-execution-transaction-service";
import { StepProgressionServiceLive } from "../../services/step-progression-service";
import { StepContextMutationServiceLive } from "../../services/step-context-mutation-service";

const buildRuntimeTestLayer = () => {
  const steps: RuntimeStepExecutionRow[] = [];
  const formState: RuntimeFormStepExecutionStateRow[] = [];
  const contextFacts: RuntimeWorkflowExecutionContextFactRow[] = [];
  const stepDefinitions: RuntimeWorkflowStepDefinitionRow[] = [
    {
      id: "step-1",
      workflowId: "workflow-1",
      key: "capture",
      type: "form",
      createdAt: new Date("2026-04-01T10:00:00.000Z"),
    },
    {
      id: "step-2",
      workflowId: "workflow-1",
      key: "confirm",
      type: "form",
      createdAt: new Date("2026-04-01T10:01:00.000Z"),
    },
  ];
  const edges: RuntimeWorkflowEdgeRow[] = [
    {
      id: "edge-1",
      workflowId: "workflow-1",
      fromStepId: "step-1",
      toStepId: "step-2",
      createdAt: new Date("2026-04-01T10:02:00.000Z"),
    },
  ];

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
          id: `exec-${steps.length + 1}`,
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
      Effect.succeed(steps.find((step) => step.id === stepExecutionId) ?? null),
    findStepExecutionByWorkflowAndDefinition: ({ workflowExecutionId, stepDefinitionId }) =>
      Effect.succeed(
        steps.find(
          (step) =>
            step.workflowExecutionId === workflowExecutionId &&
            step.stepDefinitionId === stepDefinitionId,
        ) ?? null,
      ),
    listStepExecutionsForWorkflow: (workflowExecutionId) =>
      Effect.succeed(steps.filter((step) => step.workflowExecutionId === workflowExecutionId)),
    completeStepExecution: ({ stepExecutionId, progressionData }) =>
      Effect.sync(() => {
        const row = steps.find((step) => step.id === stepExecutionId);
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
      Effect.succeed(
        contextFacts.filter((fact) => fact.workflowExecutionId === workflowExecutionId),
      ),
    listWorkflowStepDefinitions: (workflowId) =>
      Effect.succeed(stepDefinitions.filter((step) => step.workflowId === workflowId)),
    listWorkflowEdges: (workflowId) =>
      Effect.succeed(edges.filter((edge) => edge.workflowId === workflowId)),
  } as unknown as Context.Tag.Service<typeof StepExecutionRepository>);

  const workflowRepoLayer = Layer.succeed(WorkflowExecutionRepository, {
    createWorkflowExecution: () => Effect.die("unused"),
    getWorkflowExecutionById: (workflowExecutionId: string) =>
      Effect.succeed({
        id: workflowExecutionId,
        transitionExecutionId: "tx-1",
        workflowId: "workflow-1",
        workflowRole: "primary",
        status: "active",
        supersededByWorkflowExecutionId: null,
        startedAt: new Date("2026-04-01T09:59:00.000Z"),
        completedAt: null,
        supersededAt: null,
      }),
    markWorkflowExecutionCompleted: () => Effect.succeed(null),
    markWorkflowExecutionSuperseded: () => Effect.succeed(null),
    updateTransitionPrimaryWorkflowExecutionPointer: () => Effect.void,
    retryWorkflowExecution: () => Effect.succeed(null),
  } as unknown as Context.Tag.Service<typeof WorkflowExecutionRepository>);

  const projectFactRepoLayer = Layer.succeed(ProjectFactRepository, {
    createFactInstance: ({ projectId, factDefinitionId, valueJson }) =>
      Effect.succeed({
        id: `pf-${projectId}-${factDefinitionId}`,
        projectId,
        factDefinitionId,
        valueJson,
        status: "active",
        supersededByFactInstanceId: null,
        producedByTransitionExecutionId: null,
        producedByWorkflowExecutionId: null,
        authoredByUserId: null,
        createdAt: new Date(),
      }),
    getCurrentValuesByDefinition: () => Effect.succeed([]),
    listFactsByProject: () => Effect.succeed([]),
    supersedeFactInstance: () => Effect.void,
  } as unknown as Context.Tag.Service<typeof ProjectFactRepository>);

  const base = Layer.mergeAll(stepRepoLayer, workflowRepoLayer, projectFactRepoLayer);
  const progression = Layer.provide(StepProgressionServiceLive, base);
  const lifecycle = Layer.provide(
    StepExecutionLifecycleServiceLive,
    Layer.mergeAll(base, progression),
  );
  const contextMutation = Layer.provide(StepContextMutationServiceLive, base);
  const transaction = Layer.provide(
    StepExecutionTransactionServiceLive,
    Layer.mergeAll(base, progression, lifecycle, contextMutation),
  );

  return {
    layer: Layer.mergeAll(base, progression, lifecycle, contextMutation, transaction),
    state: { steps, formState, contextFacts },
  };
};

describe("l3 slice-1 step core services", () => {
  it("activates first step idempotently", async () => {
    const runtime = buildRuntimeTestLayer();

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* StepExecutionLifecycleService;
        const first = yield* service.activateFirstStepExecution("wfexec-1");
        const second = yield* service.activateFirstStepExecution("wfexec-1");
        return { first, second };
      }).pipe(Effect.provide(runtime.layer)),
    );

    expect(result.first.id).toBe(result.second.id);
    expect(runtime.state.steps).toHaveLength(1);
    expect(runtime.state.steps[0]?.stepDefinitionId).toBe("step-1");
  });

  it("submits form step with snapshot, context writes, and deterministic progression", async () => {
    const runtime = buildRuntimeTestLayer();

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const tx = yield* StepExecutionTransactionService;
        const activated = yield* tx.activateFirstStepExecution("wfexec-1");
        return yield* tx.submitFormStepExecution({
          workflowExecutionId: "wfexec-1",
          stepExecutionId: activated.stepExecutionId,
          submittedValues: { initiativeName: "Chiron" },
          contextWrites: [
            {
              workflowExecutionId: "wfexec-1",
              sourceStepExecutionId: activated.stepExecutionId,
              factKey: "initiative_name",
              factKind: "plain_value",
              valueJson: "Chiron",
            },
          ],
        });
      }).pipe(Effect.provide(runtime.layer)),
    );

    expect(result.status).toBe("captured");
    expect(result.nextStepExecutionId).toBeDefined();

    expect(runtime.state.formState[0]?.submittedSnapshotJson).toMatchObject({
      initiativeName: "Chiron",
    });
    expect(runtime.state.contextFacts).toHaveLength(1);
    expect(runtime.state.contextFacts[0]?.factKey).toBe("initiative_name");

    const firstStep = runtime.state.steps.find((step) => step.stepDefinitionId === "step-1");
    const secondStep = runtime.state.steps.find((step) => step.stepDefinitionId === "step-2");

    expect(firstStep?.status).toBe("completed");
    expect(secondStep?.status).toBe("active");
    expect(secondStep?.progressionData).toMatchObject({
      activatedFromStepExecutionId: firstStep?.id,
    });
  });
});
