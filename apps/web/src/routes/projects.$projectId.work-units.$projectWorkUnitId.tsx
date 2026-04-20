import type {
  GetTransitionStartGateDetailsInput,
  GetTransitionStartGateDetailsOutput,
} from "@chiron/contracts/runtime/work-units";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";

import { RuntimeStartGateDialog } from "@/components/runtime/runtime-start-gate-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const runtimeWorkUnitOverviewQueryKey = (projectId: string, projectWorkUnitId: string) =>
  ["runtime-work-unit-overview", projectId, projectWorkUnitId] as const;

const runtimeWorkUnitStateMachineQueryKey = (projectId: string, projectWorkUnitId: string) =>
  ["runtime-work-unit-state-machine", projectId, projectWorkUnitId] as const;

type StartGateSelection = {
  readonly transition: {
    transitionId: string;
    transitionKey: string;
    transitionName: string;
    result: "available" | "blocked";
    firstReason?: string;
  };
  readonly input: GetTransitionStartGateDetailsInput;
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }

  return String(error);
}

function renderTransitionResult(result: "available" | "blocked") {
  if (result === "available") {
    return { label: "available", className: "border-primary/50 bg-primary/15 text-primary" };
  }

  return {
    label: "blocked",
    className: "border-destructive/50 bg-destructive/10 text-destructive",
  };
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return date.toLocaleString();
}

function normalizeStateLabel(stateLabel: string | null | undefined): string {
  if (!stateLabel || stateLabel === "unknown-state") {
    return "Activation";
  }

  return stateLabel;
}

export const Route = createFileRoute("/projects/$projectId/work-units/$projectWorkUnitId")({
  component: ProjectWorkUnitOverviewRoute,
});

export function ProjectWorkUnitOverviewRoute() {
  const { projectId, projectWorkUnitId } = Route.useParams();
  const { orpc, queryClient } = Route.useRouteContext();
  const [startGateSelection, setStartGateSelection] = useState<StartGateSelection | null>(null);

  const runtimeWorkUnitOverviewQuery = useQuery({
    ...orpc.project.getRuntimeWorkUnitOverview.queryOptions({
      input: {
        projectId,
        projectWorkUnitId,
      },
    }),
    queryKey: runtimeWorkUnitOverviewQueryKey(projectId, projectWorkUnitId),
  });

  const overview = runtimeWorkUnitOverviewQuery.data;

  const stateMachineQuery = useQuery({
    ...orpc.project.getRuntimeWorkUnitStateMachine.queryOptions({
      input: {
        projectId,
        projectWorkUnitId,
      },
    }),
    queryKey: runtimeWorkUnitStateMachineQueryKey(projectId, projectWorkUnitId),
  });

  const stateMachine = stateMachineQuery.data;
  const hasActiveTransition = overview?.activeTransition !== undefined;

  const startGateQueryKey = useMemo(
    () =>
      startGateSelection
        ? ([
            "runtime-start-gate-detail",
            projectId,
            startGateSelection.input.transitionId,
            startGateSelection.input.projectWorkUnitId ?? "none",
          ] as const)
        : (["runtime-start-gate-detail", projectId, "idle"] as const),
    [projectId, startGateSelection],
  );

  const startGateQuery = useQuery({
    queryKey: startGateQueryKey,
    enabled: startGateSelection !== null,
    queryFn: async () => {
      if (!startGateSelection) {
        return null;
      }

      return (await orpc.project.getRuntimeStartGateDetail.call(
        startGateSelection.input,
      )) as GetTransitionStartGateDetailsOutput;
    },
  });

  const refreshRuntimeWorkUnit = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: runtimeWorkUnitOverviewQueryKey(projectId, projectWorkUnitId),
    });
    await queryClient.invalidateQueries({
      queryKey: runtimeWorkUnitStateMachineQueryKey(projectId, projectWorkUnitId),
    });
  }, [projectId, projectWorkUnitId, queryClient]);

  const startTransitionExecutionMutation = useMutation(
    orpc.project.startTransitionExecution.mutationOptions({
      onSuccess: async () => {
        await refreshRuntimeWorkUnit();
      },
      onError(error) {
        toast.error(toErrorMessage(error));
      },
    }),
  );

  const switchActiveTransitionExecutionMutation = useMutation(
    orpc.project.switchActiveTransitionExecution.mutationOptions({
      onSuccess: async () => {
        await refreshRuntimeWorkUnit();
      },
      onError(error) {
        toast.error(toErrorMessage(error));
      },
    }),
  );

  const openStartGate = useCallback(
    (transition: {
      transitionId: string;
      transitionKey: string;
      transitionName: string;
      result: "available" | "blocked";
      firstReason?: string;
    }) => {
      setStartGateSelection({
        transition,
        input: {
          projectId,
          transitionId: transition.transitionId,
          transitionKey: transition.transitionKey,
          projectWorkUnitId,
        },
      });
    },
    [projectId, projectWorkUnitId],
  );

  const handleLaunchTransition = useCallback(
    (workflow: { workflowId: string; workflowKey?: string }) => {
      if (!startGateSelection) {
        return;
      }

      if (hasActiveTransition && overview?.activeTransition) {
        switchActiveTransitionExecutionMutation.mutate({
          projectId,
          projectWorkUnitId,
          supersededTransitionExecutionId: overview.activeTransition.transitionExecutionId,
          transitionId: startGateSelection.transition.transitionId,
          transitionKey: startGateSelection.transition.transitionKey,
          workflowId: workflow.workflowId,
          ...(workflow.workflowKey ? { workflowKey: workflow.workflowKey } : {}),
        });
      } else {
        startTransitionExecutionMutation.mutate({
          projectId,
          transitionId: startGateSelection.transition.transitionId,
          workflowId: workflow.workflowId,
          workUnit: {
            mode: "existing",
            projectWorkUnitId,
          },
        });
      }

      setStartGateSelection(null);
    },
    [
      hasActiveTransition,
      overview?.activeTransition,
      projectId,
      projectWorkUnitId,
      startGateSelection,
      startTransitionExecutionMutation,
      switchActiveTransitionExecutionMutation,
    ],
  );

  const startGateErrorMessage = startGateQuery.error ? toErrorMessage(startGateQuery.error) : null;
  const isLaunchingTransition =
    startTransitionExecutionMutation.isPending || switchActiveTransitionExecutionMutation.isPending;
  const launchLabel = hasActiveTransition ? "Switch active transition" : "Start transition";
  const rawTransitionCandidates = stateMachine?.possibleTransitions ?? [];
  const transitionCandidates =
    hasActiveTransition && overview?.activeTransition
      ? rawTransitionCandidates.filter(
          (candidate) => candidate.transitionId !== overview.activeTransition?.transitionId,
        )
      : rawTransitionCandidates;
  const availableTransitionCandidates = transitionCandidates.filter(
    (transition) => transition.result === "available",
  );
  const blockedTransitionCandidates = transitionCandidates.filter(
    (transition) => transition.result === "blocked",
  );
  const actionLabel = hasActiveTransition ? "Switch transition" : "Start transition";
  const currentStateLabel = normalizeStateLabel(overview?.workUnit.currentStateLabel);
  const currentStateKey =
    currentStateLabel === "Activation"
      ? "activation"
      : currentStateLabel.toLowerCase().replaceAll(" ", "_");

  const renderTransitionCandidate = (transition: (typeof transitionCandidates)[number]) => {
    const resultToken = renderTransitionResult(transition.result);

    return (
      <li
        key={transition.transitionId}
        className="space-y-2 border border-border/70 bg-background/40 p-3"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <p className="text-sm font-medium">{transition.transitionName}</p>
            <p className="text-xs text-muted-foreground">{transition.transitionKey}</p>
            <div className="flex flex-wrap items-center gap-2 text-[0.68rem]">
              <span className="border border-border/80 bg-background/80 px-2 py-1 uppercase tracking-[0.12em]">
                {transition.fromStateKey}
              </span>
              <span className="text-muted-foreground">→</span>
              <span className="border border-primary/60 bg-primary/10 px-2 py-1 uppercase tracking-[0.12em] text-primary">
                {transition.toStateLabel}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="border border-border/70 bg-muted/30 px-2 py-1 text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
              {transition.actionMode} candidate
            </span>
            <span
              className={`border px-2 py-1 text-[0.65rem] uppercase tracking-[0.12em] ${resultToken.className}`}
            >
              {resultToken.label}
            </span>
          </div>
        </div>

        {transition.firstReason ? (
          <div className="space-y-1 border border-destructive/40 bg-destructive/10 p-2 text-xs">
            <p className="uppercase tracking-[0.12em] text-destructive">First blocker</p>
            <p className="text-muted-foreground">{transition.firstReason}</p>
          </div>
        ) : null}

        <details className="chiron-frame-flat chiron-tone-context p-2 text-xs">
          <summary className="cursor-pointer list-none uppercase tracking-[0.12em] text-muted-foreground">
            Inline gate preview
          </summary>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            <div className="border border-border/70 bg-background/70 p-2">
              <p className="text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
                Result
              </p>
              <p className="mt-1 uppercase tracking-[0.08em]">{transition.result}</p>
            </div>
            <div className="border border-border/70 bg-background/70 p-2">
              <p className="text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
                Action mode
              </p>
              <p className="mt-1 uppercase tracking-[0.08em]">{transition.actionMode}</p>
            </div>
            <div className="border border-border/70 bg-background/70 p-2 md:col-span-2">
              <p className="text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
                Summary
              </p>
              <p className="mt-1 text-muted-foreground">
                {transition.firstReason ?? "No blockers reported at preview level."}
              </p>
            </div>
          </div>
        </details>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="rounded-none uppercase tracking-[0.12em]"
            onClick={() =>
              openStartGate({
                transitionId: transition.transitionId,
                transitionKey: transition.transitionKey,
                transitionName: transition.transitionName,
                result: transition.result,
                ...(transition.firstReason ? { firstReason: transition.firstReason } : {}),
              })
            }
          >
            Open start-gate diagnostics
          </Button>
          <Button
            className="rounded-none uppercase tracking-[0.12em]"
            disabled={transition.result !== "available" || isLaunchingTransition}
            onClick={() =>
              openStartGate({
                transitionId: transition.transitionId,
                transitionKey: transition.transitionKey,
                transitionName: transition.transitionName,
                result: transition.result,
                ...(transition.firstReason ? { firstReason: transition.firstReason } : {}),
              })
            }
          >
            {actionLabel}
          </Button>
          {transition.result !== "available" ? (
            <p className="text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground">
              {hasActiveTransition
                ? "Switch unavailable until blocker is resolved"
                : "Start unavailable until blocker is resolved"}
            </p>
          ) : null}
        </div>
      </li>
    );
  };

  return (
    <MethodologyWorkspaceShell
      title="Work unit overview"
      segments={[
        { label: "Projects", to: "/projects" },
        {
          label: projectId,
          to: "/projects/$projectId",
          params: { projectId },
        },
        {
          label: "Work Units",
          to: "/projects/$projectId/work-units",
          params: { projectId },
        },
        { label: overview?.workUnit.workUnitTypeName ?? projectWorkUnitId },
      ]}
    >
      {runtimeWorkUnitOverviewQuery.isLoading ? (
        <Skeleton className="h-56 w-full rounded-none" />
      ) : null}

      {overview ? (
        <>
          <section className="chiron-frame-flat chiron-tone-navigation space-y-4 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <p className="chiron-tone-kicker text-[0.68rem] uppercase tracking-[0.18em]">
                  Work unit
                </p>
                <p className="text-base uppercase tracking-[0.1em]">
                  {overview.workUnit.workUnitTypeName}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="border border-border/80 bg-background/85 px-2 py-1 text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground">
                    {overview.workUnit.workUnitTypeKey}
                  </span>
                  <span className="border border-border/80 bg-background/85 px-2 py-1 text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground">
                    instance {overview.workUnit.projectWorkUnitId}
                  </span>
                </div>
              </div>

              <div className="border border-border/80 bg-background/85 px-3 py-2 text-right">
                <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                  Current state
                </p>
                <p className="mt-1 text-sm uppercase tracking-[0.1em] text-primary">
                  {currentStateLabel}
                </p>
                <p className="text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground">
                  key {currentStateKey}
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="chiron-frame-flat chiron-tone-context p-3">
                <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                  Created
                </p>
                <p className="mt-1 text-sm">{formatTimestamp(overview.workUnit.createdAt)}</p>
              </div>
              <div className="chiron-frame-flat chiron-tone-context p-3">
                <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                  Updated
                </p>
                <p className="mt-1 text-sm">{formatTimestamp(overview.workUnit.updatedAt)}</p>
              </div>
            </div>
          </section>

          {overview.activeTransition ? (
            <section className="chiron-frame-flat chiron-tone-navigation p-4">
              <div className="space-y-3 border border-primary/40 bg-primary/10 p-3">
                <div className="space-y-1">
                  <p className="text-[0.65rem] uppercase tracking-[0.14em] text-primary">
                    Active transition
                  </p>
                  <p className="text-base tracking-[0.02em] text-foreground">
                    {overview.activeTransition.transitionName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {overview.activeTransition.transitionKey}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="border border-border/80 bg-background/80 px-2 py-1 uppercase tracking-[0.12em]">
                      {currentStateLabel}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <span className="border border-primary/60 bg-primary/10 px-2 py-1 uppercase tracking-[0.12em] text-primary">
                      {overview.activeTransition.toStateLabel}
                    </span>
                  </div>
                </div>

                <div className="grid gap-2 text-xs md:grid-cols-2">
                  <div className="chiron-frame-flat chiron-tone-context p-2">
                    <p className="text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
                      Transition status
                    </p>
                    <p className="mt-1 uppercase tracking-[0.08em]">
                      {overview.activeTransition.status}
                    </p>
                  </div>
                  <div className="chiron-frame-flat chiron-tone-context p-2">
                    <p className="text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
                      Completion gate
                    </p>
                    <p className="mt-1 uppercase tracking-[0.08em]">
                      {overview.activeTransition.readyForCompletion ? "ready" : "pending"}
                    </p>
                  </div>
                </div>

                {overview.activeTransition.primaryWorkflow ? (
                  <div className="chiron-frame-flat chiron-tone-context space-y-1 p-2 text-xs">
                    <p className="text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
                      Primary workflow
                    </p>
                    <p>
                      {overview.activeTransition.primaryWorkflow.workflowName} (
                      {overview.activeTransition.primaryWorkflow.workflowKey})
                    </p>
                    <p className="uppercase tracking-[0.08em] text-muted-foreground">
                      status {overview.activeTransition.primaryWorkflow.status}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No primary workflow is attached yet.
                  </p>
                )}

                <div>
                  <Link
                    to="/projects/$projectId/transition-executions/$transitionExecutionId"
                    params={{
                      projectId,
                      transitionExecutionId: overview.activeTransition.transitionExecutionId,
                    }}
                    search={{ projectWorkUnitId }}
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "rounded-none uppercase tracking-[0.12em]",
                    )}
                  >
                    Open active transition detail
                  </Link>
                </div>
              </div>
            </section>
          ) : null}

          <section className="chiron-frame-flat chiron-tone-navigation space-y-3 p-4">
            <div className="space-y-1">
              <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                {hasActiveTransition ? "Alternative transitions" : "Available transitions"}
              </p>
              <p className="text-sm text-muted-foreground">
                {hasActiveTransition
                  ? "Inspect and switch to an alternative transition from the current active path."
                  : "Inspect and start one of the transitions available from this work unit state."}
              </p>
            </div>

            {stateMachineQuery.isLoading ? <Skeleton className="h-24 w-full rounded-none" /> : null}

            {stateMachine && stateMachine.possibleTransitions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {hasActiveTransition
                  ? "No alternative transitions are currently available."
                  : "No transitions are currently available from this state."}
              </p>
            ) : null}

            {stateMachine && transitionCandidates.length > 0 ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-[0.68rem] uppercase tracking-[0.12em]">
                  <span className="border border-primary/40 bg-primary/10 px-2 py-1 text-primary">
                    ready now {availableTransitionCandidates.length}
                  </span>
                  <span className="border border-destructive/40 bg-destructive/10 px-2 py-1 text-destructive">
                    blocked {blockedTransitionCandidates.length}
                  </span>
                </div>

                {availableTransitionCandidates.length > 0 ? (
                  <section className="space-y-2">
                    <p className="text-[0.68rem] uppercase tracking-[0.12em] text-primary">
                      Ready now
                    </p>
                    <ul className="space-y-2">
                      {availableTransitionCandidates.map((transition) =>
                        renderTransitionCandidate(transition),
                      )}
                    </ul>
                  </section>
                ) : null}

                {blockedTransitionCandidates.length > 0 ? (
                  <section className="space-y-2">
                    <p className="text-[0.68rem] uppercase tracking-[0.12em] text-destructive">
                      Blocked by start gate
                    </p>
                    <ul className="space-y-2">
                      {blockedTransitionCandidates.map((transition) =>
                        renderTransitionCandidate(transition),
                      )}
                    </ul>
                  </section>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className="grid gap-3 md:grid-cols-3">
            <Card
              frame="flat"
              tone="navigation"
              className="h-full border-border/80 bg-background/40"
            >
              <CardHeader>
                <CardTitle className="text-sm">Facts / Dependencies</CardTitle>
                <CardDescription>Current fact and dependency footprint</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-xs text-muted-foreground">
                <p>
                  Facts: {overview.summaries.factsDependencies.factInstancesCurrent} /{" "}
                  {overview.summaries.factsDependencies.factDefinitionsTotal}
                </p>
                <p>
                  Dependencies: in {overview.summaries.factsDependencies.inboundDependencyCount} ·
                  out {overview.summaries.factsDependencies.outboundDependencyCount}
                </p>
                <Link
                  to="/projects/$projectId/work-units/$projectWorkUnitId/facts"
                  params={{ projectId, projectWorkUnitId }}
                  search={{
                    tab: "primitive",
                    q: "",
                    existence: "all",
                    primitiveFactType: "all",
                    hasActiveTransition: "all",
                  }}
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "rounded-none uppercase tracking-[0.12em]",
                  )}
                >
                  Open facts
                </Link>
              </CardContent>
            </Card>

            <Card
              frame="flat"
              tone="navigation"
              className="h-full border-border/80 bg-background/40"
            >
              <CardHeader>
                <CardTitle className="text-sm">State Machine</CardTitle>
                <CardDescription>Current state and switch candidates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-muted-foreground">
                <p>
                  {overview.summaries.stateMachine.currentStateLabel} (
                  {overview.summaries.stateMachine.currentStateKey})
                </p>
                <p>
                  Active transition:{" "}
                  {overview.summaries.stateMachine.hasActiveTransition ? "yes" : "no"}
                </p>
                <Link
                  to="/projects/$projectId/work-units/$projectWorkUnitId/state-machine"
                  params={{ projectId, projectWorkUnitId }}
                  search={{ q: "" }}
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "rounded-none uppercase tracking-[0.12em]",
                  )}
                >
                  Open state machine
                </Link>
              </CardContent>
            </Card>

            <Card
              frame="flat"
              tone="navigation"
              className="h-full border-border/80 bg-background/40"
            >
              <CardHeader>
                <CardTitle className="text-sm">Artifact Slots</CardTitle>
                <CardDescription>Current artifact-slot occupancy</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-xs text-muted-foreground">
                <p>
                  Slots with snapshots: {overview.summaries.artifactSlots.slotsWithCurrentSnapshots}{" "}
                  / {overview.summaries.artifactSlots.slotDefinitionsTotal}
                </p>
                <Link
                  to="/projects/$projectId/work-units/$projectWorkUnitId/artifact-slots"
                  params={{ projectId, projectWorkUnitId }}
                  search={{ q: "" }}
                  className={cn(
                    buttonVariants({ variant: "outline" }),
                    "rounded-none uppercase tracking-[0.12em]",
                  )}
                >
                  Open artifact slots
                </Link>
              </CardContent>
            </Card>
          </section>

          <section>
            <Link
              to="/projects/$projectId/work-units"
              params={{ projectId }}
              search={{ q: "" }}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "rounded-none uppercase tracking-[0.12em]",
              )}
            >
              Back to Work Units
            </Link>
          </section>
        </>
      ) : null}

      <RuntimeStartGateDialog
        open={startGateSelection !== null}
        onOpenChange={(open) => {
          if (!open) {
            setStartGateSelection(null);
          }
        }}
        detail={(startGateQuery.data as GetTransitionStartGateDetailsOutput | null) ?? null}
        isLoading={startGateQuery.isLoading}
        errorMessage={startGateErrorMessage}
        onLaunch={handleLaunchTransition}
        isLaunching={isLaunchingTransition}
        launchLabel={launchLabel}
      />
    </MethodologyWorkspaceShell>
  );
}
