import type { CSSProperties } from "react";

import { Button } from "../../components/ui/button";

import {
  STEP_TYPE_COLORS,
  STEP_TYPE_ICON_CODES,
  STEP_TYPE_LABELS,
  type WorkflowEditorEdge,
  type WorkflowEditorSelection,
  type WorkflowEditorStep,
  type WorkflowEditorStepType,
} from "./types";

const STEP_TYPE_BADGE_CLASS_NAMES: Record<WorkflowEditorStepType, string> = {
  form: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-200",
  agent: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-200",
  action: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
  invoke: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200",
  branch: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-200",
  display: "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-200",
};

const STEP_TYPE_ACCENT_CLASS_NAMES: Record<WorkflowEditorStepType, string> = {
  form: "text-sky-400 dark:text-sky-300",
  agent: "text-violet-400 dark:text-violet-300",
  action: "text-emerald-400 dark:text-emerald-300",
  invoke: "text-amber-400 dark:text-amber-300",
  branch: "text-rose-400 dark:text-rose-300",
  display: "text-slate-300 dark:text-slate-200",
};

type WorkflowStepFrameStyle = CSSProperties & {
  "--frame-bg": string;
  "--frame-border": string;
  "--frame-corner": string;
};

function getStepFrameStyle(selected: boolean): WorkflowStepFrameStyle {
  return {
    "--frame-bg": "var(--background)",
    "--frame-border": selected
      ? "color-mix(in oklab, currentColor 42%, var(--foreground))"
      : "color-mix(in oklab, currentColor 18%, var(--border))",
    "--frame-corner": "color-mix(in oklab, currentColor 82%, var(--foreground))",
    background: "var(--background)",
    borderRadius: 0,
    boxShadow: selected ? "0 0 0 1px color-mix(in oklab, currentColor 28%, transparent)" : "none",
  } satisfies WorkflowStepFrameStyle;
}

function StepTypeBadge({ stepType }: { stepType: WorkflowEditorStepType }) {
  return (
    <span
      className={[
        "inline-flex w-fit items-center gap-1.5 rounded-full border px-2 py-1 text-[0.62rem] uppercase tracking-[0.12em]",
        STEP_TYPE_BADGE_CLASS_NAMES[stepType],
      ].join(" ")}
    >
      <img
        src={`/visuals/workflow-editor/step-types/asset-${STEP_TYPE_ICON_CODES[stepType]}.svg`}
        alt=""
        aria-hidden="true"
        className="size-3.5 shrink-0 object-contain invert brightness-150 contrast-125"
      />
      <span>{STEP_TYPE_LABELS[stepType]}</span>
    </span>
  );
}

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
            <ul className="grid gap-2">
              {steps.map((step) => (
                <li key={step.stepId}>
                  <button
                    type="button"
                    className={[
                      "chiron-cut-frame-heavy",
                      "w-full",
                      "overflow-visible",
                      "text-left",
                      "transition-colors",
                      STEP_TYPE_ACCENT_CLASS_NAMES[step.stepType],
                    ].join(" ")}
                    style={getStepFrameStyle(false)}
                    onClick={() => onSelectStep(step.stepId)}
                    aria-label={`Inspect Step ${step.payload.key}`}
                  >
                    <div className="relative z-[2] grid w-full gap-3 p-3 text-foreground">
                      <div className="flex items-start justify-between gap-3">
                        <StepTypeBadge stepType={step.stepType} />
                        <span className="text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground/80">
                          {STEP_TYPE_COLORS[step.stepType]}
                        </span>
                      </div>

                      <div className="grid gap-1.5">
                        <span className="font-geist-pixel-square text-sm uppercase tracking-[0.14em] text-foreground">
                          {step.payload.key}
                        </span>
                        <span className="text-[0.64rem] uppercase tracking-[0.18em] text-muted-foreground">
                          Workflow step
                        </span>
                      </div>

                      <span className="text-xs/relaxed text-muted-foreground">
                        {step.payload.label?.trim() || "No label yet"}
                      </span>
                    </div>
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
              {STEP_TYPE_LABELS[selectedStep.stepType].toUpperCase()} STEP INSPECTOR
            </p>
            <Button type="button" size="xs" variant="outline" onClick={onClearSelection}>
              Back to step list
            </Button>
          </div>
          <div
            className={[
              "chiron-cut-frame-heavy",
              "overflow-visible",
              STEP_TYPE_ACCENT_CLASS_NAMES[selectedStep.stepType],
            ].join(" ")}
            style={getStepFrameStyle(true)}
          >
            <div className="relative z-[2] grid gap-3 p-3 text-foreground">
              <div className="flex items-start justify-between gap-3">
                <StepTypeBadge stepType={selectedStep.stepType} />
                <span className="text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground/80">
                  {STEP_TYPE_COLORS[selectedStep.stepType]}
                </span>
              </div>

              <div className="grid gap-1.5">
                <p className="font-geist-pixel-square text-sm uppercase tracking-[0.14em] text-foreground">
                  {selectedStep.payload.key}
                </p>
                <p className="text-[0.64rem] uppercase tracking-[0.18em] text-muted-foreground">
                  Workflow step
                </p>
              </div>

              <div className="grid gap-1 text-xs/relaxed text-muted-foreground">
                <p>{selectedStep.payload.label?.trim() || "No label yet"}</p>
                <p>{selectedStep.payload.descriptionJson?.markdown?.trim() || "No description"}</p>
              </div>
            </div>
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
