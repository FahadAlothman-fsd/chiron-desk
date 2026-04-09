import type { WorkflowAgentStepPayload } from "../types";

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "../../../components/ui/field";
import { Textarea } from "../../../components/ui/textarea";

type GuidanceTabProps = {
  values: WorkflowAgentStepPayload;
  setHumanMarkdown: (markdown: string) => void;
  setAgentMarkdown: (markdown: string) => void;
};

export function GuidanceTab({ values, setHumanMarkdown, setAgentMarkdown }: GuidanceTabProps) {
  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="agent-step-guidance-human">Human guidance</FieldLabel>
        <FieldContent>
          <Textarea
            id="agent-step-guidance-human"
            rows={8}
            value={values.guidance?.human.markdown ?? ""}
            onChange={(event) => setHumanMarkdown(event.target.value)}
          />
          <FieldDescription>
            Operator-facing guidance shown before the session starts.
          </FieldDescription>
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel htmlFor="agent-step-guidance-agent">Agent guidance</FieldLabel>
        <FieldContent>
          <Textarea
            id="agent-step-guidance-agent"
            rows={8}
            value={values.guidance?.agent.markdown ?? ""}
            onChange={(event) => setAgentMarkdown(event.target.value)}
          />
          <FieldDescription>
            Reusable supporting guidance blended into the authored prompt.
          </FieldDescription>
        </FieldContent>
      </Field>
    </FieldGroup>
  );
}
