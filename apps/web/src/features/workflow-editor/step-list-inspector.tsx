import { Button } from "../../components/ui/button";

import type { WorkflowEditorEdge, WorkflowEditorSelection, WorkflowEditorStep } from "./types";

type StepListInspectorProps = {
  steps: readonly WorkflowEditorStep[];
  edges: readonly WorkflowEditorEdge[];
  selection: WorkflowEditorSelection;
  onSelectStep: (stepId: string) => void;
  onSelectEdge: (edgeId: string) => void;
  onClearSelection: () => void;
  onCreateFormStep: () => void;
  onEditSelectedStep: () => void;
  onEditSelectedEdge: () => void;
  onConnectSteps: (sourceStepKey: string, targetStepKey: string) => void;
};

export function StepListInspector({
  steps,
  edges,
  selection,
  onSelectStep,
  onSelectEdge,
  onClearSelection,
  onCreateFormStep,
  onEditSelectedStep,
  onEditSelectedEdge,
  onConnectSteps,
}: StepListInspectorProps) {
  const selectedStep =
    selection?.kind === "step" ? steps.find((step) => step.stepId === selection.stepId) : undefined;
  const selectedEdge =
    selection?.kind === "edge" ? edges.find((edge) => edge.edgeId === selection.edgeId) : undefined;

  return (
    <section className="chiron-frame-flat mt-3 grid gap-2 p-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
          STEP LIST & INSPECTOR
        </p>
        <Button type="button" size="xs" variant="outline" onClick={onCreateFormStep}>
          + Form
        </Button>
      </div>

      {selection === null ? (
        <div className="grid gap-2">
          {steps.length === 0 ? (
            <p className="text-xs text-muted-foreground">No steps authored yet.</p>
          ) : (
            <ul className="grid gap-1">
              {steps.map((step) => (
                <li key={step.stepId}>
                  <button
                    type="button"
                    className="chiron-frame-flat flex w-full items-center justify-between gap-2 px-2 py-2 text-left hover:bg-accent/25"
                    onClick={() => onSelectStep(step.stepId)}
                    aria-label={`Inspect Step ${step.payload.key}`}
                  >
                    <span className="font-medium uppercase tracking-[0.1em]">
                      {step.payload.key}
                    </span>
                    <span className="text-[0.64rem] uppercase tracking-[0.12em] text-muted-foreground">
                      form
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {edges.length > 0 ? (
            <div className="grid gap-1">
              <p className="text-[0.64rem] uppercase tracking-[0.12em] text-muted-foreground">
                Edges
              </p>
              {edges.map((edge) => (
                <button
                  key={edge.edgeId}
                  type="button"
                  className="chiron-frame-flat flex items-center justify-between gap-2 px-2 py-1.5 text-left text-xs hover:bg-accent/25"
                  onClick={() => onSelectEdge(edge.edgeId)}
                >
                  <span>
                    {edge.fromStepKey} → {edge.toStepKey}
                  </span>
                  <span className="text-[0.64rem] uppercase tracking-[0.12em] text-muted-foreground">
                    inspect
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {steps.length > 1 ? (
            <div className="grid gap-1">
              <p className="text-[0.64rem] uppercase tracking-[0.12em] text-muted-foreground">
                Quick Connect
              </p>
              {steps.slice(1).map((targetStep) => (
                <Button
                  key={targetStep.stepId}
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={() =>
                    onConnectSteps(steps[0]?.payload.key ?? "", targetStep.payload.key)
                  }
                >
                  Connect {steps[0]?.payload.key ?? "source"} to {targetStep.payload.key}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      ) : selectedStep ? (
        <div className="grid gap-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[0.64rem] uppercase tracking-[0.12em] text-muted-foreground">
              FORM STEP INSPECTOR
            </p>
            <Button type="button" size="xs" variant="outline" onClick={onClearSelection}>
              Back to step list
            </Button>
          </div>
          <div className="chiron-frame-flat grid gap-1 p-2">
            <p className="font-medium uppercase tracking-[0.1em]">{selectedStep.payload.key}</p>
            <p className="text-muted-foreground">{selectedStep.payload.label ?? "No label"}</p>
            <p className="text-muted-foreground">
              {selectedStep.payload.descriptionJson?.markdown ?? "No description"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="xs" variant="outline" onClick={onEditSelectedStep}>
              Edit form step
            </Button>
            {steps
              .filter((candidate) => candidate.stepId !== selectedStep.stepId)
              .map((candidate) => (
                <Button
                  key={candidate.stepId}
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={() => onConnectSteps(selectedStep.payload.key, candidate.payload.key)}
                >
                  Connect to {candidate.payload.key}
                </Button>
              ))}
          </div>
        </div>
      ) : selectedEdge ? (
        <div className="grid gap-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[0.64rem] uppercase tracking-[0.12em] text-muted-foreground">
              EDGE INSPECTOR
            </p>
            <Button type="button" size="xs" variant="outline" onClick={onClearSelection}>
              Back to step list
            </Button>
          </div>
          <div className="chiron-frame-flat grid gap-1 p-2">
            <p className="font-medium uppercase tracking-[0.1em]">{selectedEdge.fromStepKey}</p>
            <p className="text-muted-foreground">to {selectedEdge.toStepKey}</p>
            <p className="text-muted-foreground">
              {selectedEdge.descriptionMarkdown || "No description"}
            </p>
          </div>
          <Button type="button" size="xs" variant="outline" onClick={onEditSelectedEdge}>
            Edit edge
          </Button>
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={() => onConnectSteps(selectedEdge.fromStepKey, selectedEdge.toStepKey)}
          >
            Attempt duplicate edge
          </Button>
        </div>
      ) : null}
    </section>
  );
}
