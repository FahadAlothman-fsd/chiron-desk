import type { WorkflowAgentStepPayload } from "../types";

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "../../../components/ui/field";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";

type OverviewTabProps = {
  values: WorkflowAgentStepPayload;
  onKeyChange: (value: string) => void;
  onLabelChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
};

export function OverviewTab({
  values,
  onKeyChange,
  onLabelChange,
  onDescriptionChange,
}: OverviewTabProps) {
  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="agent-step-key">Step key</FieldLabel>
        <FieldContent>
          <Input
            id="agent-step-key"
            value={values.key}
            onChange={(event) => onKeyChange(event.target.value)}
          />
          <FieldDescription>
            Stable workflow step identifier used by edges and runtime state.
          </FieldDescription>
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel htmlFor="agent-step-label">Label</FieldLabel>
        <FieldContent>
          <Input
            id="agent-step-label"
            value={values.label ?? ""}
            onChange={(event) => onLabelChange(event.target.value)}
          />
          <FieldDescription>
            Human-facing name for the workflow editor canvas and inspector.
          </FieldDescription>
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel htmlFor="agent-step-description">Description</FieldLabel>
        <FieldContent>
          <Textarea
            id="agent-step-description"
            rows={6}
            value={values.descriptionJson?.markdown ?? ""}
            onChange={(event) => onDescriptionChange(event.target.value)}
          />
          <FieldDescription>
            Short canvas summary that explains what this agent step does.
          </FieldDescription>
        </FieldContent>
      </Field>
    </FieldGroup>
  );
}
