import { useMemo, useState } from "react";
import { ArrowRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import {
  getStatusVisualToken,
  TransitionStatusBadge,
  type TransitionPreviewStatus,
} from "./status-visual";

type ValidationDiagnostic = {
  code: string;
  scope: string;
  blocking: boolean;
  required: string;
  observed: string;
  remediation: string;
  timestamp: string;
  evidenceRef: string;
};

export type BaselineTransition = {
  transitionKey: string;
  fromState: string | null;
  toState: string;
  gateClass: "start_gate" | "completion_gate";
  status: TransitionPreviewStatus;
  statusReasonCode: string;
  requiredLinks: Array<{ linkTypeKey: string; strength?: string; required?: boolean }>;
  diagnostics: ValidationDiagnostic[];
  workflows: Array<{
    workflowKey: string;
    enabled: false;
    disabledReason: string;
    helperText: string;
  }>;
};

export type BaselinePreview = {
  summary: {
    methodologyKey: string;
    pinnedVersion: string;
    publishState: string;
    validationStatus: string;
    setupFactsStatus: string;
  };
  transitionPreview: {
    workUnitTypeKey: string | null;
    currentState: string;
    transitions: BaselineTransition[];
  };
  projectionSummary?: {
    workUnits: string[];
    agents: string[];
    transitions: Array<{
      transitionKey: string;
      workUnitTypeKey: string | null;
      fromState: string | null;
      toState: string;
      gateClass: "start_gate" | "completion_gate";
    }>;
    facts: Array<{
      workUnitTypeKey: string;
      key: string;
      type: string;
      required: boolean;
      defaultValue: unknown;
    }>;
  };
  facts: Array<{
    key: string;
    type: string;
    value: unknown;
    required: boolean;
    missing: boolean;
    indicator: "blocking" | "ok";
    sourceExecutionId: string | null;
    updatedAt: string | null;
  }>;
  diagnosticsHistory: Record<string, ValidationDiagnostic[]>;
  evidenceTimeline: Array<{
    kind: string;
    actor: string | null;
    timestamp: string;
    reference: string;
  }>;
};

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return date.toLocaleString();
}

function formatStateLabel(state: string | null): string {
  if (!state || state === "__absent__") {
    return "Absent";
  }

  return state.replaceAll("_", " ").replaceAll(".", " ").trim();
}

function formatReasonLabel(reason: string): string {
  return reason
    .toLowerCase()
    .split("_")
    .map((word) => (word.length > 0 ? `${word[0]?.toUpperCase()}${word.slice(1)}` : ""))
    .join(" ");
}

function formatWorkUnitLabel(transitionKey: string): string {
  return transitionKey.includes(":")
    ? (transitionKey.split(":", 2)[0] ?? transitionKey)
    : transitionKey;
}

export function BaselineVisibilitySection({
  baselinePreview,
}: {
  baselinePreview: BaselinePreview | null;
}) {
  const [showFuturePaths, setShowFuturePaths] = useState(false);

  const transitionRows = useMemo(() => {
    if (!baselinePreview) {
      return [] as BaselineTransition[];
    }

    return baselinePreview.transitionPreview.transitions.filter(
      (transition) => showFuturePaths || transition.status !== "future",
    );
  }, [baselinePreview, showFuturePaths]);

  return (
    <section className="space-y-4 border border-border/80 bg-background p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
          Baseline visibility
        </p>
        <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={showFuturePaths}
            onChange={(event) => setShowFuturePaths(event.target.checked)}
          />
          Show future paths
        </label>
      </div>

      {!baselinePreview ? (
        <Card frame="cut-thick" tone="context" className="p-3 text-sm text-muted-foreground">
          Baseline preview appears after a project is pinned to a methodology version.
        </Card>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <Card size="sm" frame="cut-thick" tone="navigation" className="space-y-1 p-3">
              <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                Methodology
              </p>
              <p className="text-sm font-medium">{baselinePreview.summary.methodologyKey}</p>
            </Card>
            <Card size="sm" frame="cut-thick" tone="navigation" className="space-y-1 p-3">
              <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                Pinned version
              </p>
              <p className="text-sm font-medium">{baselinePreview.summary.pinnedVersion}</p>
            </Card>
            <Card size="sm" frame="cut-thick" tone="navigation" className="space-y-1 p-3">
              <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                Publish state
              </p>
              <p className="text-sm font-medium">{baselinePreview.summary.publishState}</p>
            </Card>
            <Card size="sm" frame="cut-thick" tone="navigation" className="space-y-1 p-3">
              <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                Validation
              </p>
              <p className="text-sm font-medium">{baselinePreview.summary.validationStatus}</p>
            </Card>
            <Card size="sm" frame="cut-thick" tone="navigation" className="space-y-1 p-3">
              <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                Setup facts
              </p>
              <p className="text-sm">{baselinePreview.summary.setupFactsStatus}</p>
            </Card>
          </div>

          <Card frame="cut-thick" tone="context" className="space-y-3 p-3">
            <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
              Transition readiness preview (
              {baselinePreview.transitionPreview.workUnitTypeKey ?? "n/a"})
            </p>
            {transitionRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transitions in current view.</p>
            ) : (
              <ul
                className={cn(
                  "space-y-2 text-xs",
                  showFuturePaths ? "max-h-[24rem] overflow-y-auto pr-1" : "",
                )}
              >
                {transitionRows.map((transition) => {
                  const token = getStatusVisualToken(transition.status);

                  return (
                    <li
                      key={transition.transitionKey}
                      className={cn("space-y-3 border p-3", token.containerClassName)}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="space-y-1">
                          <p className="font-semibold text-foreground">
                            {formatWorkUnitLabel(transition.transitionKey)}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-[0.72rem] uppercase tracking-[0.08em] text-muted-foreground">
                            <span className="border border-border/70 bg-background/70 px-2 py-1">
                              {formatStateLabel(transition.fromState)}
                            </span>
                            <span className="chiron-transition-flow-arrow">
                              <span className="chiron-transition-flow-line" />
                              <ArrowRightIcon className="chiron-transition-flow-icon size-3.5" />
                            </span>
                            <span className="border border-border/70 bg-background/70 px-2 py-1">
                              {formatStateLabel(transition.toState)}
                            </span>
                            <span className="border border-border/60 px-2 py-1 text-[0.64rem] text-muted-foreground/90">
                              {transition.gateClass.replace("_", " ")}
                            </span>
                          </div>
                          <p className="text-muted-foreground">
                            reason: {formatReasonLabel(transition.statusReasonCode)}
                          </p>
                        </div>
                        <TransitionStatusBadge status={transition.status} />
                      </div>

                      {transition.workflows.length > 0 ? (
                        <ul className="space-y-2">
                          {transition.workflows.map((workflow) => (
                            <li
                              key={`${transition.transitionKey}-${workflow.workflowKey}`}
                              className="flex flex-wrap items-center gap-2 border border-border/70 bg-background/60 p-2"
                            >
                              <span className="font-medium">{workflow.workflowKey}</span>
                              <Button
                                type="button"
                                variant="outline"
                                className="rounded-none"
                                aria-disabled="true"
                                onClick={(event) => event.preventDefault()}
                              >
                                Execute (Epic 3+)
                              </Button>
                              <span className="text-muted-foreground">
                                {workflow.disabledReason}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted-foreground">
                          No workflows bound for this transition.
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card frame="cut-thick" tone="contracts" className="space-y-2 p-3 text-xs">
            <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
              Fact provenance
            </p>
            {baselinePreview.facts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No persisted facts for selected work-unit context.
              </p>
            ) : (
              <ul className="space-y-2">
                {baselinePreview.facts.map((fact) => (
                  <li
                    key={fact.key}
                    className="space-y-1 border border-border/70 bg-background/60 p-2"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{fact.key}</span>
                      <span className="text-muted-foreground">type: {fact.type}</span>
                      <span className={fact.missing ? "text-amber-200" : "text-emerald-200"}>
                        {fact.missing ? "Blocking: required fact missing" : "Ready"}
                      </span>
                    </div>
                    <p className="text-muted-foreground">
                      sourceExecutionId: {fact.sourceExecutionId ?? "-"} | updatedAt:{" "}
                      {fact.updatedAt ?? "-"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card frame="cut-thick" tone="publish" className="space-y-2 p-3 text-xs">
            <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
              Diagnostics history (publish | pin | repin-policy)
            </p>
            {Object.values(baselinePreview.diagnosticsHistory).every(
              (items) => items.length === 0,
            ) ? (
              <p className="text-sm text-muted-foreground">
                No diagnostics yet. Diagnostics appear after publish/pin/policy checks.
              </p>
            ) : (
              <ul className="space-y-2">
                {Object.entries(baselinePreview.diagnosticsHistory).flatMap(
                  ([context, diagnostics]) =>
                    diagnostics.map((diagnostic) => (
                      <li
                        key={`${context}-${diagnostic.code}-${diagnostic.timestamp}`}
                        className="border border-border/70 bg-background/60 p-2"
                      >
                        <p className="font-medium">{diagnostic.code}</p>
                        <p className="text-muted-foreground">context: {context}</p>
                        <p className="text-muted-foreground">scope: {diagnostic.scope}</p>
                      </li>
                    )),
                )}
              </ul>
            )}
          </Card>

          <Card frame="cut-thick" tone="evidence" className="space-y-2 p-3 text-xs">
            <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
              Evidence timeline
            </p>
            {baselinePreview.evidenceTimeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">No evidence events recorded.</p>
            ) : (
              <ul className="space-y-1">
                {baselinePreview.evidenceTimeline.map((event) => (
                  <li
                    key={`${event.kind}-${event.reference}`}
                    className="border border-border/70 bg-background/60 p-2"
                  >
                    {event.kind} | actor: {event.actor ?? "-"} | {formatTimestamp(event.timestamp)}{" "}
                    | {event.reference}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </section>
  );
}
