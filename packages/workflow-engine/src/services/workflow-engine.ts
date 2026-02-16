import { Context, Effect } from "effect";
import type { WorkflowConfig } from "../schema/workflow";
import { decodeWorkflow } from "./decode";
import { ApprovalGateway } from "./approval-gateway";
import { ExecutionContext } from "./execution-context";
import { WorkflowEventBus } from "./event-bus";
import type { StepHandlerOutput } from "./step-handler";
import { StepHandlerRegistry } from "./step-registry";
import { VariableService } from "./variable-service";

const CURRENT_STEP_INDEX_KEY = "__workflow.currentStepIndex";
const WORKFLOW_CONFIG_KEY = "__workflow.config";

export type ExecuteInput = {
  executionId: string;
  workflow: unknown;
  variables?: Record<string, unknown>;
  userId?: string;
  projectId?: string;
  parentExecutionId?: string | null;
};

export type ContinueInput = {
  userInput?: unknown;
};

export type SubmitApprovalInput = {
  toolCallId: string;
  toolName?: string;
  stepId?: string;
  toolType?: string;
  action: "approve" | "reject" | "edit";
  editedArgs?: unknown;
  feedback?: string;
};

export type WorkflowEngineImpl = {
  execute: (input: ExecuteInput) => Effect.Effect<void, unknown, WorkflowEngineDependencies>;
  continue: (input: ContinueInput) => Effect.Effect<void, unknown, WorkflowEngineDependencies>;
  submitApproval: (
    input: SubmitApprovalInput,
  ) => Effect.Effect<void, unknown, WorkflowEngineDependencies>;
  submitStep: (input: ContinueInput) => Effect.Effect<void, unknown, WorkflowEngineDependencies>;
};

type WorkflowEngineDependencies =
  | StepHandlerRegistry
  | WorkflowEventBus
  | ExecutionContext
  | VariableService
  | ApprovalGateway;

export class WorkflowEngine extends Context.Tag("WorkflowEngine")<
  WorkflowEngine,
  WorkflowEngineImpl
>() {}

const runStep = (
  workflow: WorkflowConfig,
  stepIndex: number,
  userInput: unknown | undefined,
): Effect.Effect<
  { nextIndex: number | null; output?: StepHandlerOutput },
  unknown,
  WorkflowEngineDependencies
> =>
  Effect.gen(function* () {
    const step = workflow.steps[stepIndex];
    if (!step) {
      return { nextIndex: null };
    }

    const registry = yield* StepHandlerRegistry;
    const eventBus = yield* WorkflowEventBus;
    const executionContext = yield* ExecutionContext;
    const variableService = yield* VariableService;

    const handler = registry.get(step.type);
    if (!handler) {
      return yield* Effect.fail(new Error(`Missing step handler for ${step.type}`));
    }

    const stepNumber = yield* executionContext.incrementStep();
    const stepId = step.id ?? `${step.type}-${stepIndex + 1}`;

    yield* eventBus.publish({
      _tag: "StepStarted",
      executionId: (yield* executionContext.getState()).executionId,
      stepId,
      stepNumber,
      stepType: step.type,
    });

    const state = yield* executionContext.getState();
    const output = yield* handler({
      executionId: state.executionId,
      step,
      variables: state.variables,
      userInput,
    }) as Effect.Effect<StepHandlerOutput, unknown, WorkflowEngineDependencies>;

    if (output?.outputVariables) {
      yield* variableService.merge(output.outputVariables);
    }

    yield* eventBus.publish({
      _tag: "StepCompleted",
      executionId: state.executionId,
      stepId,
      stepNumber,
      result: output,
    });

    if (output?.requiresUserInput) {
      yield* variableService.set(CURRENT_STEP_INDEX_KEY, stepIndex);
      return { nextIndex: null, output };
    }

    if (output?.nextStepId) {
      const nextIndex = workflow.steps.findIndex((nextStep) => nextStep.id === output.nextStepId);
      return { nextIndex: nextIndex === -1 ? null : nextIndex, output };
    }

    const nextIndex = stepIndex + 1;
    yield* variableService.set(CURRENT_STEP_INDEX_KEY, nextIndex);
    return { nextIndex, output };
  });

const runFromIndex = (
  workflow: WorkflowConfig,
  startIndex: number,
  userInput?: unknown,
): Effect.Effect<void, unknown, WorkflowEngineDependencies> =>
  Effect.gen(function* () {
    const eventBus = yield* WorkflowEventBus;
    const executionContext = yield* ExecutionContext;
    const state = yield* executionContext.getState();

    yield* eventBus.publish({
      _tag: "WorkflowStarted",
      executionId: state.executionId,
      workflowId: workflow.id,
    });

    let currentIndex: number | null = startIndex;
    let input: unknown | undefined = userInput;

    while (currentIndex !== null && currentIndex < workflow.steps.length) {
      const stepResult: { nextIndex: number | null; output?: StepHandlerOutput } = yield* runStep(
        workflow,
        currentIndex,
        input,
      );
      const nextIndex: number | null = stepResult.nextIndex;
      const output = stepResult.output;
      if (output?.requiresUserInput) {
        return;
      }

      currentIndex = nextIndex;
      input = undefined;
    }

    yield* eventBus.publish({
      _tag: "WorkflowCompleted",
      executionId: state.executionId,
    });
  }).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        const eventBus = yield* WorkflowEventBus;
        const executionContext = yield* ExecutionContext;
        const state = yield* executionContext.getState();
        yield* eventBus.publish({
          _tag: "WorkflowError",
          executionId: state.executionId,
          error: String(error),
        });
        return yield* Effect.fail(error);
      }),
    ),
  );

export const WorkflowEngineLive = {
  execute: (input) =>
    Effect.gen(function* () {
      const workflow = yield* decodeWorkflow(input.workflow);
      const executionContext = yield* ExecutionContext;
      yield* executionContext.updateVariables(input.variables ?? {});
      yield* executionContext.setVariable(CURRENT_STEP_INDEX_KEY, 0);
      yield* executionContext.setVariable(WORKFLOW_CONFIG_KEY, workflow);
      return yield* runFromIndex(workflow, 0);
    }),

  continue: (input) =>
    Effect.gen(function* () {
      const executionContext = yield* ExecutionContext;
      const variableService = yield* VariableService;
      const state = yield* executionContext.getState();
      const workflowValue =
        (yield* variableService.get<unknown>(WORKFLOW_CONFIG_KEY)) ??
        state.variables[WORKFLOW_CONFIG_KEY];
      if (!workflowValue) {
        return yield* Effect.fail(new Error("Missing workflow in execution context"));
      }
      const workflow = yield* decodeWorkflow(workflowValue);

      const currentStepIndex =
        (yield* variableService.get<number>(CURRENT_STEP_INDEX_KEY)) ??
        (state.variables[CURRENT_STEP_INDEX_KEY] as number | undefined) ??
        0;

      return yield* runFromIndex(workflow, currentStepIndex, input.userInput);
    }),

  submitApproval: (input) =>
    Effect.gen(function* () {
      const approvalGateway = yield* ApprovalGateway;
      const eventBus = yield* WorkflowEventBus;
      const executionContext = yield* ExecutionContext;
      const state = yield* executionContext.getState();

      const resolved = yield* approvalGateway.resolve({
        toolCallId: input.toolCallId,
        toolName: input.toolName ?? "unknown",
        action: input.action,
        editedArgs: input.editedArgs,
        feedback: input.feedback,
      });

      if (!resolved) {
        return yield* Effect.fail(new Error(`No pending approval found for ${input.toolCallId}`));
      }

      yield* eventBus.publish({
        _tag: "ApprovalResolved",
        executionId: state.executionId,
        stepId: input.stepId ?? "unknown",
        toolName: input.toolName ?? "unknown",
        toolType: input.toolType,
        toolCallId: input.toolCallId,
        action: input.action,
        editedArgs: input.editedArgs,
        feedback: input.feedback,
      });
    }),

  submitStep: (input) =>
    Effect.gen(function* () {
      const executionContext = yield* ExecutionContext;
      const variableService = yield* VariableService;
      const state = yield* executionContext.getState();
      const workflowValue =
        (yield* variableService.get<unknown>(WORKFLOW_CONFIG_KEY)) ??
        state.variables[WORKFLOW_CONFIG_KEY];
      if (!workflowValue) {
        return yield* Effect.fail(new Error("Missing workflow in execution context"));
      }
      const workflow = yield* decodeWorkflow(workflowValue);

      const currentStepIndex =
        (yield* variableService.get<number>(CURRENT_STEP_INDEX_KEY)) ??
        (state.variables[CURRENT_STEP_INDEX_KEY] as number | undefined) ??
        0;

      return yield* runFromIndex(workflow, currentStepIndex, input.userInput);
    }),
} satisfies WorkflowEngineImpl;
