import { Effect } from "effect";
import type { InvokeStepConfig } from "../schema/invoke";
import type { StepHandler } from "../services/step-handler";
import { WorkflowInvoker } from "../services/workflow-invoker";

const mapInputs = (
  mapping: InvokeStepConfig["inputMapping"],
  variables: Record<string, unknown>,
): Record<string, unknown> => {
  if (!mapping) {
    return variables;
  }

  const result: Record<string, unknown> = {};
  for (const [target, source] of Object.entries(mapping)) {
    result[target] = variables[source];
  }
  return result;
};

export const makeInvokeHandler = (): StepHandler<WorkflowInvoker> => (input) =>
  Effect.gen(function* () {
    const step = input.step as InvokeStepConfig;
    const invoker = yield* WorkflowInvoker;

    const invokeResult = yield* invoker.invoke({
      executionId: input.executionId,
      workflowId: step.workflowRef.id,
      workflowKey: step.workflowRef.key,
      variables: mapInputs(step.inputMapping, input.variables),
      waitForCompletion: step.waitForCompletion,
    });

    const outputVariables: Record<string, unknown> = {};
    const mode = step.output?.mode ?? "reference";
    const target = step.output?.target ?? `${step.id}.child`;

    if (mode === "reference") {
      outputVariables[target] = invokeResult.childExecutionId;
    } else if (mode === "variables") {
      Object.assign(outputVariables, invokeResult.outputVariables ?? {});
    } else {
      outputVariables[target] = invokeResult.outputVariables ?? {};
    }

    return {
      outputVariables,
      requiresUserInput: false,
    };
  });
