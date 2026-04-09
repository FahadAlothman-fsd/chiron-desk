import type { WorkflowAgentStepPayload } from "../types";

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "../../../components/ui/field";
import { Textarea } from "../../../components/ui/textarea";

type ObjectiveInstructionsTabProps = {
  values: WorkflowAgentStepPayload;
  setValue: <K extends keyof WorkflowAgentStepPayload>(
    key: K,
    value: WorkflowAgentStepPayload[K],
  ) => void;
};

export function ObjectiveInstructionsTab({ values, setValue }: ObjectiveInstructionsTabProps) {
  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="agent-step-objective">Objective</FieldLabel>
        <FieldContent>
          <Textarea
            id="agent-step-objective"
            rows={5}
            value={values.objective}
            onChange={(event) => setValue("objective", event.target.value)}
          />
          <FieldDescription>
            One crisp statement describing the desired outcome for the session.
          </FieldDescription>
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel htmlFor="agent-step-instructions">Instructions</FieldLabel>
        <FieldContent>
          <Textarea
            id="agent-step-instructions"
            rows={12}
            value={values.instructionsMarkdown}
            onChange={(event) => setValue("instructionsMarkdown", event.target.value)}
          />
          <FieldDescription>
            Author the step-specific operating rules, guardrails, and expected execution style.
          </FieldDescription>
        </FieldContent>
      </Field>
    </FieldGroup>
  );
}
