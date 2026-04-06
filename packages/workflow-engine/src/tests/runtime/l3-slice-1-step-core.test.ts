import { Context, Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";

import {
  StepExecutionRepository,
  type CompleteRuntimeStepExecutionParams,
  type CreateRuntimeFormStepExecutionStateParams,
  type CreateRuntimeStepExecutionParams,
  type ReplaceRuntimeWorkflowExecutionContextFactsParams,
  type RuntimeFormStepExecutionStateRow,
  type RuntimeStepExecutionRow,
  type RuntimeWorkflowEdgeRow,
  type RuntimeWorkflowExecutionContextFactRow,
  type RuntimeWorkflowStepDefinitionRow,
  type UpsertRuntimeFormStepExecutionStateParams,
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
import { StepContextMutationServiceLive } from "../../services/step-context-mutation-service";
import { StepProgressionServiceLive } from "../../services/step-progression-service";

const buildRuntimeTestLayer = (options?: { entryMode?: "valid" | "missing" | "ambiguous" }) => {
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

  const entryMode = options?.entryMode ?? "valid";

  const edgesByMode: Record<"valid" | "missing" | "ambiguous", RuntimeWorkflowEdgeRow[]> = {
    valid: [
      {
        id: "edge-1",
        workflowId: "workflow-1",
        fromStepId: "step-1",
        toStepId: "step-2",
        createdAt: new Date("2026-04-01T10:02:00.000Z"),
      },
    ],
    missing: [
      {
        id: "edge-1",
        workflowId: "workflow-1",
        fromStepId: "step-1",
        toStepId: "step-2",
        createdAt: new Date("2026-04-01T10:02:00.000Z"),
      },
      {
        id: "edge-2",
        workflowId: "workflow-1",
        fromStepId: "step-2",
        toStepId: "step-1",
        createdAt: new Date("2026-04-01T10:03:00.000Z"),
      },
    ],
    ambiguous: [],
  };

  const edges = edgesByMode[entryMode];

  const stepRepoLayer = Layer.succeed(StepExecutionRepository, {
    createStepExecution: ({
      workflowExecutionId,
      stepDefinitionId,
      stepType,
      status,
      previousStepExecutionId,
    }: CreateRuntimeStepExecutionParams) =>
      Effect.sync(() => {
        const row: RuntimeStepExecutionRow = {
          id: `exec-${steps.length + 1}`,
          workflowExecutionId,
          stepDefinitionId,
          stepType,
          status,
          activatedAt: new Date(),
          completedAt: null,
          previousStepExecutionId,
        };
        steps.push(row);
        return row;
      }),
    getStepExecutionById: (stepExecutionId: string) =>
      Effect.succeed(steps.find((step) => step.id === stepExecutionId) ?? null),
    findStepExecutionByWorkflowAndDefinition: ({
      workflowExecutionId,
      stepDefinitionId,
    }: {
      workflowExecutionId: string;
      stepDefinitionId: string;
    }) =>
      Effect.succeed(
        steps.find(
          (step) =>
            step.workflowExecutionId === workflowExecutionId &&
            step.stepDefinitionId === stepDefinitionId,
        ) ?? null,
      ),
    listStepExecutionsForWorkflow: (workflowExecutionId: string) =>
      Effect.succeed(steps.filter((step) => step.workflowExecutionId === workflowExecutionId)),
    completeStepExecution: ({ stepExecutionId }: CompleteRuntimeStepExecutionParams) =>
      Effect.sync(() => {
        const row = steps.find((step) => step.id === stepExecutionId);
        if (!row) {
          return null;
        }
        row.status = "completed";
        row.completedAt = new Date();
        return row;
      }),
    createFormStepExecutionState: ({
      stepExecutionId,
    }: CreateRuntimeFormStepExecutionStateParams) =>
      Effect.sync(() => {
        const existing = formState.find((row) => row.stepExecutionId === stepExecutionId);
        if (existing) {
          return existing;
        }

        const row: RuntimeFormStepExecutionStateRow = {
          id: `state-${formState.length + 1}`,
          stepExecutionId,
          draftPayloadJson: null,
          submittedPayloadJson: null,
          lastDraftSavedAt: null,
          submittedAt: null,
        };
        formState.push(row);
        return row;
      }),
    upsertFormStepExecutionState: ({
      stepExecutionId,
      draftPayloadJson,
      submittedPayloadJson,
      lastDraftSavedAt,
      submittedAt,
    }: UpsertRuntimeFormStepExecutionStateParams) =>
      Effect.sync(() => {
        const existing = formState.find((row) => row.stepExecutionId === stepExecutionId);
        if (existing) {
          existing.draftPayloadJson = draftPayloadJson;
          existing.submittedPayloadJson = submittedPayloadJson;
          existing.lastDraftSavedAt = lastDraftSavedAt;
          existing.submittedAt = submittedAt;
          return existing;
        }

        const row: RuntimeFormStepExecutionStateRow = {
          id: `state-${formState.length + 1}`,
          stepExecutionId,
          draftPayloadJson,
          submittedPayloadJson,
          lastDraftSavedAt,
          submittedAt,
        };
        formState.push(row);
        return row;
      }),
    getFormStepExecutionState: (stepExecutionId: string) =>
      Effect.succeed(formState.find((row) => row.stepExecutionId === stepExecutionId) ?? null),
    replaceWorkflowExecutionContextFacts: ({
      workflowExecutionId,
      sourceStepExecutionId,
      affectedContextFactDefinitionIds,
      currentValues,
    }: ReplaceRuntimeWorkflowExecutionContextFactsParams) =>
      Effect.sync(() => {
        for (let index = contextFacts.length - 1; index >= 0; index -= 1) {
          const row = contextFacts[index];
          if (
            row &&
            row.workflowExecutionId === workflowExecutionId &&
            affectedContextFactDefinitionIds.includes(row.contextFactDefinitionId)
          ) {
            contextFacts.splice(index, 1);
          }
        }

        const now = new Date();
        const inserted = currentValues.map((value, index) => {
          const row: RuntimeWorkflowExecutionContextFactRow = {
            id: `ctx-${index + 1}-${value.contextFactDefinitionId}`,
            workflowExecutionId,
            contextFactDefinitionId: value.contextFactDefinitionId,
            instanceOrder: value.instanceOrder,
            valueJson: value.valueJson,
            sourceStepExecutionId,
            createdAt: now,
            updatedAt: now,
          };
          contextFacts.push(row);
          return row;
        });

        return inserted;
      }),
    listWorkflowExecutionContextFacts: (workflowExecutionId: string) =>
      Effect.succeed(
        contextFacts.filter((fact) => fact.workflowExecutionId === workflowExecutionId),
      ),
    listWorkflowStepDefinitions: (workflowId: string) =>
      Effect.succeed(stepDefinitions.filter((step) => step.workflowId === workflowId)),
    listWorkflowEdges: (workflowId: string) =>
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
        currentStepExecutionId: steps.at(-1)?.id ?? null,
        supersededByWorkflowExecutionId: null,
        startedAt: new Date("2026-04-01T09:59:00.000Z"),
        completedAt: null,
        supersededAt: null,
      }),
    setCurrentStepExecutionId: ({
      workflowExecutionId,
      currentStepExecutionId,
    }: {
      workflowExecutionId: string;
      currentStepExecutionId: string | null;
    }) =>
      Effect.sync(() => {
        if (workflowExecutionId !== "wfexec-1") {
          return null;
        }

        return {
          id: workflowExecutionId,
          transitionExecutionId: "tx-1",
          workflowId: "workflow-1",
          workflowRole: "primary",
          status: "active",
          currentStepExecutionId,
          supersededByWorkflowExecutionId: null,
          startedAt: new Date("2026-04-01T09:59:00.000Z"),
          completedAt: null,
          supersededAt: null,
        };
      }),
    markWorkflowExecutionCompleted: () => Effect.succeed(null),
    markWorkflowExecutionSuperseded: () => Effect.succeed(null),
    updateTransitionPrimaryWorkflowExecutionPointer: () => Effect.void,
    retryWorkflowExecution: () => Effect.succeed(null),
  } as unknown as Context.Tag.Service<typeof WorkflowExecutionRepository>);

  const base = Layer.mergeAll(stepRepoLayer, workflowRepoLayer);
  const progression = Layer.provide(StepProgressionServiceLive, base);
  const lifecycle = Layer.provide(
    StepExecutionLifecycleServiceLive,
    Layer.mergeAll(base, progression),
  );
  const contextMutation = Layer.provide(StepContextMutationServiceLive, base);
  const transaction = Layer.provide(
    StepExecutionTransactionServiceLive,
    Layer.mergeAll(base, lifecycle, contextMutation),
  );

  return {
    layer: Layer.mergeAll(base, progression, lifecycle, contextMutation, transaction),
    state: { steps, formState, contextFacts },
  };
};

describe("l3 slice-1 step core services", () => {
  it("activates the entry step idempotently while it is still pending", async () => {
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
    expect(runtime.state.steps[0]?.previousStepExecutionId).toBeNull();
    expect(runtime.state.formState[0]?.stepExecutionId).toBe(result.first.id);
  });

  it("surfaces invalid entry-step derivation explicitly", async () => {
    const runtime = buildRuntimeTestLayer({ entryMode: "missing" });

    const exit = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const service = yield* StepExecutionLifecycleService;
        return yield* service.activateFirstStepExecution("wfexec-1");
      }).pipe(Effect.provide(runtime.layer)),
    );

    expect(exit._tag).toBe("Failure");

    expect(runtime.state.steps).toHaveLength(0);
  });

  it("keeps submit separate from completion and replaces current context facts", async () => {
    const runtime = buildRuntimeTestLayer();

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const tx = yield* StepExecutionTransactionService;
        const activated = yield* tx.activateFirstStepExecution("wfexec-1");

        const firstSubmit = yield* tx.submitFormStepExecution({
          workflowExecutionId: "wfexec-1",
          stepExecutionId: activated.stepExecutionId,
          submittedValues: {
            initiativeName: "Draft initiative",
            objectives: ["one", "two"],
          },
          contextReplace: {
            workflowExecutionId: "wfexec-1",
            sourceStepExecutionId: activated.stepExecutionId,
            affectedContextFactDefinitionIds: ["ctx-initiative-name", "ctx-objectives"],
            currentValues: [
              {
                contextFactDefinitionId: "ctx-initiative-name",
                instanceOrder: 0,
                valueJson: "Draft initiative",
              },
              {
                contextFactDefinitionId: "ctx-objectives",
                instanceOrder: 0,
                valueJson: "one",
              },
              {
                contextFactDefinitionId: "ctx-objectives",
                instanceOrder: 1,
                valueJson: "two",
              },
            ],
          },
        });

        const secondSubmit = yield* tx.submitFormStepExecution({
          workflowExecutionId: "wfexec-1",
          stepExecutionId: activated.stepExecutionId,
          submittedValues: {
            initiativeName: "Final initiative",
            objectives: [],
          },
          contextReplace: {
            workflowExecutionId: "wfexec-1",
            sourceStepExecutionId: activated.stepExecutionId,
            affectedContextFactDefinitionIds: ["ctx-initiative-name", "ctx-objectives"],
            currentValues: [
              {
                contextFactDefinitionId: "ctx-initiative-name",
                instanceOrder: 0,
                valueJson: "Final initiative",
              },
            ],
          },
        });

        const completed = yield* tx.completeStepExecution({
          workflowExecutionId: "wfexec-1",
          stepExecutionId: activated.stepExecutionId,
        });

        return { activated, firstSubmit, secondSubmit, completed };
      }).pipe(Effect.provide(runtime.layer)),
    );

    expect(result.firstSubmit.status).toBe("captured");
    expect(result.secondSubmit.status).toBe("captured");
    expect(result.completed.status).toBe("completed");

    expect(runtime.state.formState[0]).toMatchObject({
      draftPayloadJson: {
        initiativeName: "Final initiative",
        objectives: [],
      },
      submittedPayloadJson: {
        initiativeName: "Final initiative",
        objectives: [],
      },
    });
    expect(runtime.state.formState[0]?.submittedAt).toBeInstanceOf(Date);

    expect(runtime.state.contextFacts).toHaveLength(1);
    expect(runtime.state.contextFacts[0]).toMatchObject({
      contextFactDefinitionId: "ctx-initiative-name",
      instanceOrder: 0,
      valueJson: "Final initiative",
    });

    const firstStep = runtime.state.steps.find((step) => step.stepDefinitionId === "step-1");
    const secondStep = runtime.state.steps.find((step) => step.stepDefinitionId === "step-2");

    expect(firstStep?.status).toBe("completed");
    expect(secondStep).toBeUndefined();
  });

  it("fails explicit duplicate activation after the step has already completed", async () => {
    const runtime = buildRuntimeTestLayer();

    const exit = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const lifecycle = yield* StepExecutionLifecycleService;
        const activated = yield* lifecycle.activateFirstStepExecution("wfexec-1");
        yield* lifecycle.completeStepExecution({ stepExecutionId: activated.id });
        return yield* lifecycle.activateStepExecution({
          workflowExecutionId: "wfexec-1",
          stepDefinitionId: "step-1",
          stepType: "form",
          previousStepExecutionId: null,
        });
      }).pipe(Effect.provide(runtime.layer)),
    );

    expect(exit._tag).toBe("Failure");
    expect(runtime.state.steps).toHaveLength(1);
    expect(runtime.state.steps[0]?.status).toBe("completed");
  });
});
