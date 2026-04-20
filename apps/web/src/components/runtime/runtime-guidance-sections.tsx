import type {
  GetRuntimeGuidanceActiveOutput,
  RuntimeGuidanceCandidateCard,
} from "@chiron/contracts/runtime/guidance";
import { Link } from "@tanstack/react-router";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type RuntimeGuidanceTransitionResult = {
  readonly result: "available" | "blocked";
  readonly firstReason?: string;
};

export type RuntimeGuidanceStreamStatus = "idle" | "connecting" | "streaming" | "done" | "error";

type RuntimeGuidanceSectionsProps = {
  readonly projectId: string;
  readonly activeCards: GetRuntimeGuidanceActiveOutput["activeWorkUnitCards"];
  readonly activeLoading: boolean;
  readonly activeErrorMessage: string | null;
  readonly candidateCards: readonly RuntimeGuidanceCandidateCard[];
  readonly transitionResults: Readonly<Record<string, RuntimeGuidanceTransitionResult>>;
  readonly completedCandidateCards: ReadonlySet<string>;
  readonly streamStatus: RuntimeGuidanceStreamStatus;
  readonly streamErrorMessage: string | null;
  readonly onOpenStartGate: (
    card: RuntimeGuidanceCandidateCard,
    transition: RuntimeGuidanceCandidateCard["transitions"][number],
  ) => void;
};

function normalizeStateLabel(value: string | null | undefined): string {
  if (!value || value === "unknown-state" || value.toLowerCase() === "null") {
    return "Activation";
  }

  return value;
}

function humanizeKey(value: string): string {
  const normalized = value
    .trim()
    .replace(/^seed:[^:]+:/, "")
    .replace(/^WU[._:-]/i, "")
    .replace(/^TR[._:-]/i, "")
    .replace(/^WF[._:-]/i, "")
    .replace(/[._:-]+/g, " ");

  return normalized
    .split(" ")
    .filter((part) => part.length > 0)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

function compactKey(value: string): string {
  return value
    .trim()
    .replace(/^seed:wut:/i, "")
    .replace(/^seed:transition:/i, "")
    .replace(/^seed:workflow:/i, "")
    .replace(/:mver_.+$/i, "")
    .replace(/[._:-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function workUnitTitleFromKey(value: string): string {
  const compact = compactKey(value);
  if (compact.length === 0) {
    return "WORK UNIT";
  }

  return compact.toUpperCase();
}

function looksOpaqueIdentifier(value: string): boolean {
  return value.startsWith("seed:") || value.includes(":mver_") || value.includes(":transition:");
}

function toReadableLabel(
  primary: string | null | undefined,
  key: string,
  fallback: string,
): string {
  if (primary && primary.trim().length > 0 && !looksOpaqueIdentifier(primary)) {
    return primary;
  }

  if (key.trim().length > 0) {
    return humanizeKey(key);
  }

  return fallback;
}

function renderStreamStatus(status: RuntimeGuidanceStreamStatus): string {
  switch (status) {
    case "connecting":
      return "connecting";
    case "streaming":
      return "streaming";
    case "done":
      return "complete";
    case "error":
      return "error";
    default:
      return "idle";
  }
}

function renderResultLabel(result: RuntimeGuidanceTransitionResult | undefined): {
  label: string;
  className: string;
} {
  if (!result) {
    return {
      label: "Evaluating",
      className: "border-amber-500/40 bg-amber-500/10 text-amber-200",
    };
  }

  if (result.result === "available") {
    return {
      label: "Available",
      className: "border-emerald-500/40 bg-emerald-500/12 text-emerald-200",
    };
  }

  return {
    label: "Blocked",
    className: "border-rose-500/40 bg-rose-500/12 text-rose-200",
  };
}

export function RuntimeGuidanceSections({
  projectId,
  activeCards,
  activeLoading,
  activeErrorMessage,
  candidateCards,
  transitionResults,
  completedCandidateCards,
  streamStatus,
  streamErrorMessage,
  onOpenStartGate,
}: RuntimeGuidanceSectionsProps) {
  return (
    <>
      <section aria-labelledby="runtime-guidance-active" className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2
            id="runtime-guidance-active"
            className="font-geist-pixel-square text-sm uppercase tracking-[0.14em]"
          >
            Active
          </h2>
          <p className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
            {activeCards.length} card{activeCards.length === 1 ? "" : "s"}
          </p>
        </div>

        {activeLoading ? (
          <p className="text-sm text-muted-foreground">Loading active runtime cards…</p>
        ) : null}

        {activeErrorMessage ? (
          <p className="border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {activeErrorMessage}
          </p>
        ) : null}

        {!activeLoading && !activeErrorMessage && activeCards.length === 0 ? (
          <p className="border border-border/70 bg-background p-3 text-sm text-muted-foreground">
            No active transition executions.
          </p>
        ) : null}

        <div className="grid gap-3 lg:grid-cols-2">
          {activeCards.map((card) => (
            <Card
              key={card.projectWorkUnitId}
              frame="cut-thick"
              tone="runtime"
              className="gap-0 border-primary/45 bg-primary/8"
              data-testid={`runtime-guidance-active-card-${card.projectWorkUnitId}`}
            >
              <CardHeader className="border-b border-border/70">
                <CardTitle className="uppercase tracking-[0.12em] text-primary">
                  {workUnitTitleFromKey(card.workUnitTypeKey)}
                </CardTitle>
                <CardDescription>
                  {compactKey(card.workUnitTypeKey)} · current state{" "}
                  {normalizeStateLabel(card.currentStateLabel)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 py-3">
                <div className="space-y-1 text-xs">
                  <p className="font-medium text-primary">Active transition</p>
                  <p className="text-muted-foreground">
                    {toReadableLabel(
                      card.activeTransition.transitionName,
                      card.activeTransition.transitionKey,
                      "Transition",
                    )}
                  </p>
                  <p className="text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground">
                    {card.activeTransition.transitionKey}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-[0.68rem] uppercase tracking-[0.12em]">
                    <span className="border border-border/80 bg-background/80 px-2 py-1">
                      {normalizeStateLabel(card.currentStateLabel)}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <span className="border border-primary/60 bg-primary/12 px-2 py-1 text-primary">
                      {normalizeStateLabel(card.activeTransition.toStateLabel)}
                    </span>
                  </div>
                </div>
                <div className="space-y-1 text-xs">
                  <p className="font-medium text-primary">Primary workflow</p>
                  <p className="text-muted-foreground">
                    {toReadableLabel(
                      card.activePrimaryWorkflow.workflowName,
                      card.activePrimaryWorkflow.workflowKey,
                      "Workflow",
                    )}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-[0.68rem] uppercase tracking-[0.12em]">
                    <span className="border border-border/70 bg-background/60 px-2 py-1 text-muted-foreground">
                      {card.activePrimaryWorkflow.workflowKey}
                    </span>
                    <span className="border border-sky-500/40 bg-sky-500/12 px-2 py-1 text-sky-200">
                      status {card.activePrimaryWorkflow.status}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <p className="border border-border/70 bg-background/40 px-2 py-1 text-muted-foreground">
                    facts {card.factSummary.currentCount}/{card.factSummary.totalCount}
                  </p>
                  <p className="border border-border/70 bg-background/40 px-2 py-1 text-muted-foreground">
                    artifacts {card.artifactSummary.currentCount}/{card.artifactSummary.totalCount}
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex-wrap justify-between gap-2 text-[0.68rem] uppercase tracking-[0.12em]">
                <div className="flex flex-wrap gap-2">
                  <Link
                    to="/projects/$projectId/transition-executions/$transitionExecutionId"
                    params={{
                      projectId,
                      transitionExecutionId:
                        card.actions.openTransitionTarget.transitionExecutionId,
                    }}
                    search={{ projectWorkUnitId: card.projectWorkUnitId }}
                    data-testid="open-transition-detail"
                    className={cn(
                      buttonVariants({ size: "xs" }),
                      "rounded-none uppercase tracking-[0.12em]",
                    )}
                  >
                    Open transition detail
                  </Link>

                  <Link
                    to="/projects/$projectId/workflow-executions/$workflowExecutionId"
                    params={{
                      projectId,
                      workflowExecutionId: card.actions.openWorkflowTarget.workflowExecutionId,
                    }}
                    data-testid="open-workflow-detail"
                    className={cn(
                      buttonVariants({ size: "xs", variant: "secondary" }),
                      "rounded-none uppercase tracking-[0.12em]",
                    )}
                  >
                    Open workflow detail
                  </Link>
                </div>

                {card.activeTransition.readyForCompletion ? (
                  <span className="border border-primary/40 bg-primary/15 px-2 py-1 text-primary">
                    ready hint
                  </span>
                ) : (
                  <span className="text-muted-foreground">completion pending</span>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="runtime-guidance-open-future" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2
            id="runtime-guidance-open-future"
            className="font-geist-pixel-square text-sm uppercase tracking-[0.14em]"
          >
            Open/Future
          </h2>
          <p className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
            stream {renderStreamStatus(streamStatus)}
          </p>
        </div>

        {streamErrorMessage ? (
          <p className="border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {streamErrorMessage}
          </p>
        ) : null}

        {candidateCards.length === 0 ? (
          <p className="border border-border/70 bg-background p-3 text-sm text-muted-foreground">
            Waiting for runtime guidance candidates.
          </p>
        ) : null}

        <div className="space-y-3">
          {candidateCards.map((card) => (
            <Card key={card.candidateCardId} frame="cut-thick" tone="runtime" className="gap-0">
              <CardHeader className="border-b border-border/70">
                <CardTitle>
                  {toReadableLabel(
                    card.workUnitContext.workUnitTypeName,
                    card.workUnitContext.workUnitTypeKey,
                    "Work Unit",
                  )}
                </CardTitle>
                <CardDescription>
                  {card.workUnitContext.workUnitTypeKey} · current{" "}
                  {normalizeStateLabel(card.workUnitContext.currentStateLabel)}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-2 py-3">
                {card.transitions.map((transition) => {
                  const result = transitionResults[transition.candidateId];
                  const resultToken = renderResultLabel(result);

                  return (
                    <div
                      key={transition.candidateId}
                      className="space-y-2 border border-border/70 bg-background/50 p-3 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium">
                            {toReadableLabel(
                              transition.transitionName,
                              transition.transitionKey,
                              "Transition",
                            )}
                          </p>
                          <p className="text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground">
                            {transition.transitionKey}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[0.68rem] uppercase tracking-[0.12em]">
                            <span className="border border-border/80 bg-background/80 px-2 py-1">
                              {normalizeStateLabel(card.workUnitContext.currentStateLabel)}
                            </span>
                            <span className="text-muted-foreground">→</span>
                            <span className="border border-primary/60 bg-primary/12 px-2 py-1 text-primary">
                              {normalizeStateLabel(transition.toStateLabel)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="border border-border/70 bg-muted/30 px-2 py-1 uppercase tracking-[0.1em] text-muted-foreground">
                            {transition.source}
                          </span>
                          <span
                            className={`border px-2 py-1 uppercase tracking-[0.1em] ${resultToken.className}`}
                          >
                            {resultToken.label}
                          </span>
                        </div>
                      </div>

                      {result?.firstReason ? (
                        <p className="text-muted-foreground">reason: {result.firstReason}</p>
                      ) : null}

                      <div className="flex justify-end">
                        <Button
                          variant={result?.result === "blocked" ? "secondary" : "default"}
                          size="sm"
                          className={cn(
                            "rounded-none uppercase tracking-[0.12em]",
                            result?.result === "blocked"
                              ? "border border-rose-500/40 bg-rose-500/15 text-rose-100 hover:bg-rose-500/25"
                              : "",
                          )}
                          onClick={() => onOpenStartGate(card, transition)}
                        >
                          Start-gate drill-in
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>

              <CardFooter className="justify-end text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground">
                {completedCandidateCards.has(card.candidateCardId)
                  ? "evaluation complete"
                  : "evaluating"}
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}
