import { decodeWorkflow } from "../../../../../workflow-engine/src/services/decode";
import { Effect } from "effect";

type WorkflowStepForDecode = {
  id: string;
  stepType: string;
  config: unknown;
};

type ValidateDecodeInput = {
  workflowId: string;
  workflowName?: string | null;
  steps: WorkflowStepForDecode[];
};

const toStepConfig = (step: WorkflowStepForDecode): Record<string, unknown> => {
  if (!step.config || typeof step.config !== "object" || Array.isArray(step.config)) {
    return {
      type: step.stepType,
      id: step.id,
    };
  }

  const config = step.config as Record<string, unknown>;

  return {
    ...config,
    type: step.stepType,
    id: typeof config.id === "string" ? config.id : step.id,
  };
};

export const validateWorkflowDecodeBoundary = ({
  workflowId,
  workflowName,
  steps,
}: ValidateDecodeInput): Promise<void> =>
  Effect.runPromise(
    decodeWorkflow({
      id: workflowId,
      name: workflowName ?? workflowId,
      steps: steps.map(toStepConfig),
    }).pipe(
      Effect.asVoid,
      Effect.mapError(
        (error) =>
          new Error(`Workflow decode boundary failed for workflow ${workflowId}: ${error.message}`),
      ),
    ),
  );
