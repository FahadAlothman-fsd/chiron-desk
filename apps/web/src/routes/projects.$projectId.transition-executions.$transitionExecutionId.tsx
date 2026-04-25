import { useEffect, useMemo, useState } from "react";

import type {
  RuntimeCondition,
  RuntimeConditionEvaluation,
  RuntimeConditionEvaluationTree,
} from "@chiron/contracts/runtime/conditions";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";
import {
  DetailCode,
  DetailEyebrow,
  DetailLabel,
  DetailPrimary,
  ExecutionBadge,
  getExecutionStatusTone,
  getGateStateTone,
} from "@/features/projects/execution-detail-visuals";
import { cn } from "@/lib/utils";

const transitionExecutionSearchSchema = z.object({
  projectWorkUnitId: z.string().optional(),
});

const runtimeGuidanceActiveQueryKey = (projectId: string) =>
  ["runtime-guidance-active", projectId] as const;
const runtimeActiveWorkflowsQueryKey = (projectId: string) =>
  ["runtime-active-workflows", projectId] as const;

export const runtimeTransitionExecutionDetailQueryKey = (
  projectId: string,
  transitionExecutionId: string,
) => ["runtime-transition-execution-detail", projectId, transitionExecutionId] as const;

export const runtimeTransitionExecutionShellQueryKey = (
  projectId: string,
  transitionExecutionId: string,
  _projectWorkUnitId?: string,
) => runtimeTransitionExecutionDetailQueryKey(projectId, transitionExecutionId);

function formatTimestamp(value: string | undefined): string {
  if (!value) {
    return "—";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }

  return String(error);
}

function renderTransitionStatus(status: "active" | "completed" | "superseded"): string {
  switch (status) {
    case "active":
      return "Active";
    case "completed":
      return "Completed";
    default:
      return "Superseded";
  }
}

function renderWorkflowStatus(
  status: "active" | "completed" | "superseded" | "parent_superseded",
): string {
  switch (status) {
    case "active":
      return "Active";
    case "completed":
      return "Completed";
    case "parent_superseded":
      return "Parent superseded";
    default:
      return "Superseded";
  }
}

function renderTransitionPath(detail: {
  fromStateLabel?: string | undefined;
  fromStateKey?: string | undefined;
  toStateLabel: string;
}): string {
  const from = detail.fromStateLabel ?? detail.fromStateKey ?? "Activation";
  return `${from} → ${detail.toStateLabel}`;
}

function hasConditionEvaluationNodes(tree: RuntimeConditionEvaluationTree | undefined): boolean {
  return Boolean(
    tree &&
    (tree.conditions.length > 0 ||
      tree.groups.some((group: RuntimeConditionEvaluationTree) =>
        hasConditionEvaluationNodes(group),
      )),
  );
}

function describeRuntimeCondition(condition: RuntimeCondition): {
  kindLabel: string;
  summary: string;
  detail: string;
} {
  switch (condition.kind) {
    case "fact":
      return {
        kindLabel: "Project fact",
        summary: condition.factKey,
        detail: "A project-level fact value must exist before the transition can complete.",
      };
    case "work_unit_fact":
      return {
        kindLabel: "Work-unit fact",
        summary: condition.factKey,
        detail: "This work unit must have the required fact recorded before completion.",
      };
    case "artifact":
      return {
        kindLabel: "Artifact",
        summary: condition.slotKey,
        detail:
          condition.operator === "fresh"
            ? "A fresh artifact snapshot is required."
            : condition.operator === "stale"
              ? "A stale artifact snapshot is required."
              : "A current artifact snapshot must exist.",
      };
    case "work_unit":
      return {
        kindLabel: "Project work unit",
        summary:
          condition.operator === "work_unit_instance_exists_in_state"
            ? `${condition.workUnitTypeKey} (${condition.stateKeys.join(", ")}) × ${condition.minCount ?? 1}`
            : `${condition.workUnitTypeKey} × ${condition.minCount ?? 1}`,
        detail:
          condition.operator === "work_unit_instance_exists_in_state"
            ? "Matching project work units must currently exist in one of the required lifecycle states before completion."
            : "Matching project work units must currently exist before completion.",
      };
  }
}

function getEvaluationCounts(tree: RuntimeConditionEvaluationTree): {
  total: number;
  met: number;
  unmet: number;
} {
  const directMet = tree.conditions.filter(
    (condition: RuntimeConditionEvaluation) => condition.met,
  ).length;
  const directUnmet = tree.conditions.length - directMet;
  const nested = tree.groups.map((group: RuntimeConditionEvaluationTree) =>
    getEvaluationCounts(group),
  );
  const nestedTotal = nested.reduce(
    (sum: number, group: { total: number; met: number; unmet: number }) => sum + group.total,
    0,
  );
  const nestedMet = nested.reduce(
    (sum: number, group: { total: number; met: number; unmet: number }) => sum + group.met,
    0,
  );
  const nestedUnmet = nested.reduce(
    (sum: number, group: { total: number; met: number; unmet: number }) => sum + group.unmet,
    0,
  );

  return {
    total: tree.conditions.length + nestedTotal,
    met: directMet + nestedMet,
    unmet: directUnmet + nestedUnmet,
  };
}

function renderEvaluationBadgeTone(met: boolean): "emerald" | "rose" {
  return met ? "emerald" : "rose";
}

function renderEvaluationLabel(met: boolean): string {
  return met ? "fulfilled" : "unfulfilled";
}

function renderSatisfiedCopy(condition: RuntimeCondition): string {
  switch (condition.kind) {
    case "fact":
      return "This project fact is currently present.";
    case "work_unit_fact":
      return "This work-unit fact is currently present.";
    case "artifact":
      return condition.operator === "fresh"
        ? "A fresh artifact snapshot is currently available."
        : condition.operator === "stale"
          ? "A stale artifact snapshot is currently available."
          : "A current artifact snapshot is currently available.";
    case "work_unit":
      return condition.operator === "work_unit_instance_exists_in_state"
        ? "Enough project work units are currently in the required states."
        : "Enough project work units currently exist.";
  }
}

function renderCompletionGateHeadline(panelState: string): string {
  switch (panelState) {
    case "workflow_running":
      return "Waiting on the active workflow";
    case "passing":
      return "Transition is ready to complete";
    case "failing":
      return "Completion is blocked";
    case "completed_read_only":
      return "Transition already completed";
    case "superseded_read_only":
      return "Transition was superseded";
    default:
      return "Completion status";
  }
}

function renderCompletionGateGuidance(panelState: string): string {
  switch (panelState) {
    case "workflow_running":
      return "Finish the current primary workflow before the runtime can close this transition.";
    case "passing":
      return "All completion requirements are currently satisfied. The primary action can promote the work unit to its target state.";
    case "failing":
      return "The transition cannot close yet. Fix the blocking requirement below or swap to another primary workflow if this attempt is no longer the right path.";
    case "completed_read_only":
      return "This transition already applied its state change. The gate is now read-only evidence.";
    case "superseded_read_only":
      return "A newer transition execution took over, so this gate is historical context only.";
    default:
      return "Review the runtime gate status and act on the current blocker.";
  }
}

function ConditionEvaluationTreePanel({
  tree,
  depth = 0,
}: {
  tree: RuntimeConditionEvaluationTree;
  depth?: number;
}) {
  const modeTone = tree.mode === "all" ? "amber" : "sky";
  const modeCopy =
    tree.mode === "all"
      ? "Every requirement in this group must pass."
      : "Any one branch in this group can pass.";
  const counts = getEvaluationCounts(tree);

  return (
    <div className={cn("space-y-3", depth > 0 ? "border-l border-border/60 pl-4" : undefined)}>
      <div className="space-y-2 border border-border/70 bg-background/40 p-3">
        <div className="flex flex-wrap gap-2">
          <ExecutionBadge label={`${tree.mode} gate`} tone={modeTone} />
          <ExecutionBadge label={`${counts.total} checks`} tone="slate" />
          <ExecutionBadge
            label={`${counts.met} fulfilled / ${counts.unmet} unfulfilled`}
            tone={tree.met ? "emerald" : "rose"}
          />
        </div>
        <p className="text-xs text-muted-foreground">{modeCopy}</p>
        {tree.reason ? <p className="text-xs text-rose-100/90">{tree.reason}</p> : null}
      </div>

      {tree.conditions.length > 0 ? (
        <div className="space-y-2">
          {tree.conditions.map((evaluation: RuntimeConditionEvaluation, index: number) => {
            const detail = describeRuntimeCondition(evaluation.condition);
            return (
              <div
                key={`${evaluation.condition.kind}-${detail.summary}-${index}`}
                className={cn(
                  "space-y-2 border bg-background/40 p-3",
                  evaluation.met ? "border-emerald-500/30" : "border-rose-500/30",
                )}
              >
                <div className="flex flex-wrap gap-2">
                  <ExecutionBadge label={detail.kindLabel} tone="violet" />
                  <ExecutionBadge
                    label={
                      evaluation.condition.kind === "artifact"
                        ? evaluation.condition.operator
                        : evaluation.condition.kind === "work_unit"
                          ? evaluation.condition.operator
                          : "exists"
                    }
                    tone="slate"
                  />
                  <ExecutionBadge
                    label={renderEvaluationLabel(evaluation.met)}
                    tone={renderEvaluationBadgeTone(evaluation.met)}
                  />
                </div>
                <DetailPrimary>{detail.summary}</DetailPrimary>
                <p className="text-sm text-muted-foreground">
                  {evaluation.met
                    ? renderSatisfiedCopy(evaluation.condition)
                    : (evaluation.reason ?? detail.detail)}
                </p>
              </div>
            );
          })}
        </div>
      ) : null}

      {tree.groups.length > 0 ? (
        <div className="space-y-3">
          {tree.groups.map((group: RuntimeConditionEvaluationTree, index: number) => (
            <ConditionEvaluationTreePanel
              key={`${group.mode}-${index}`}
              tree={group}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export const Route = createFileRoute(
  "/projects/$projectId/transition-executions/$transitionExecutionId",
)({
  validateSearch: (search) => transitionExecutionSearchSchema.parse(search),
  loaderDeps: ({ search }) => ({
    projectWorkUnitId: search.projectWorkUnitId,
  }),
  loader: async ({ context, params, deps }) => {
    if (!deps.projectWorkUnitId) {
      return;
    }

    await context.queryClient.ensureQueryData({
      ...context.orpc.project.getRuntimeTransitionExecutionDetail.queryOptions({
        input: {
          projectId: params.projectId,
          projectWorkUnitId: deps.projectWorkUnitId,
          transitionExecutionId: params.transitionExecutionId,
        },
      }),
      queryKey: runtimeTransitionExecutionDetailQueryKey(
        params.projectId,
        params.transitionExecutionId,
      ),
    });
  },
  component: TransitionExecutionDetailRoute,
});

export function TransitionExecutionDetailRoute() {
  const { projectId, transitionExecutionId } = Route.useParams();
  const search = Route.useSearch();
  const { orpc, queryClient } = Route.useRouteContext();
  const projectWorkUnitId =
    typeof search.projectWorkUnitId === "string" ? search.projectWorkUnitId : undefined;

  const [selectedWorkflowId, setSelectedWorkflowId] = useState("");

  const transitionDetailQuery = useQuery({
    ...(projectWorkUnitId
      ? orpc.project.getRuntimeTransitionExecutionDetail.queryOptions({
          input: {
            projectId,
            projectWorkUnitId,
            transitionExecutionId,
          },
        })
      : {
          queryFn: async () => null,
        }),
    enabled: Boolean(projectWorkUnitId),
    queryKey: runtimeTransitionExecutionDetailQueryKey(projectId, transitionExecutionId),
  });

  const choosePrimaryMutation = useMutation(
    orpc.project.choosePrimaryWorkflowForTransitionExecution.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: runtimeTransitionExecutionDetailQueryKey(projectId, transitionExecutionId),
          }),
          queryClient.invalidateQueries({ queryKey: runtimeGuidanceActiveQueryKey(projectId) }),
          queryClient.invalidateQueries({ queryKey: runtimeActiveWorkflowsQueryKey(projectId) }),
        ]);
      },
    }),
  );

  const completeTransitionMutation = useMutation(
    orpc.project.completeTransitionExecution.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: runtimeTransitionExecutionDetailQueryKey(projectId, transitionExecutionId),
          }),
          queryClient.invalidateQueries({ queryKey: runtimeGuidanceActiveQueryKey(projectId) }),
          queryClient.invalidateQueries({ queryKey: runtimeActiveWorkflowsQueryKey(projectId) }),
        ]);
      },
    }),
  );

  const detail = transitionDetailQuery.data;
  const boundWorkflows = detail?.transitionDefinition.boundWorkflows ?? [];

  useEffect(() => {
    if (!detail) {
      setSelectedWorkflowId("");
      return;
    }

    const differentWorkflowId = boundWorkflows.find(
      (workflow) => workflow.workflowId !== detail.currentPrimaryWorkflow?.workflowId,
    )?.workflowId;

    setSelectedWorkflowId(differentWorkflowId ?? boundWorkflows[0]?.workflowId ?? "");
  }, [boundWorkflows, detail]);

  const selectedWorkflow = useMemo(
    () => boundWorkflows.find((workflow) => workflow.workflowId === selectedWorkflowId),
    [boundWorkflows, selectedWorkflowId],
  );

  const isLoading = Boolean(projectWorkUnitId) && transitionDetailQuery.isLoading;
  const hasError = Boolean(transitionDetailQuery.error);
  const isBusy = choosePrimaryMutation.isPending || completeTransitionMutation.isPending;
  const completionEvaluationTree = detail?.completionGate.evaluationTree;
  const hasCompletionEvidence = hasConditionEvaluationNodes(completionEvaluationTree);

  const chooseAnotherPrimaryAvailable =
    detail?.completionGate.actions?.chooseAnotherPrimaryWorkflow !== undefined;
  const completeTransitionAvailable =
    detail?.completionGate.actions?.completeTransition !== undefined;

  return (
    <MethodologyWorkspaceShell
      title="Transition execution"
      stateLabel={isLoading ? "loading" : hasError ? "failed" : "normal"}
      segments={[
        { label: "Projects", to: "/projects" },
        {
          label: projectId,
          to: "/projects/$projectId",
          params: { projectId },
        },
        {
          label: "Guidance",
          to: "/projects/$projectId/transitions",
          params: { projectId },
        },
        { label: detail?.transitionDefinition.transitionKey ?? transitionExecutionId },
      ]}
    >
      <section
        data-testid="runtime-transition-execution-shell-boundary"
        className="space-y-3 border border-border/80 bg-background p-4"
      >
        <DetailEyebrow>Runtime context</DetailEyebrow>

        {isLoading ? (
          <>
            <p className="text-sm text-muted-foreground">Loading transition execution detail…</p>
            <Skeleton className="h-28 w-full rounded-none" />
          </>
        ) : hasError ? (
          <p className="border border-destructive/60 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {toErrorMessage(transitionDetailQuery.error)}
          </p>
        ) : !projectWorkUnitId ? (
          <p className="border border-border/80 bg-background/50 px-3 py-2 text-sm text-muted-foreground">
            Missing work-unit context. Open this page from Guidance active cards.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.8fr)]">
            <div className="space-y-2 border border-border/70 bg-background/40 p-3">
              <DetailLabel>Transition execution</DetailLabel>
              <DetailCode>
                {detail?.transitionExecution.transitionExecutionId ?? transitionExecutionId}
              </DetailCode>
              <DetailPrimary>
                {detail?.transitionDefinition.transitionName ?? "Pending context"}
              </DetailPrimary>
            </div>
            <div className="space-y-2 border border-border/70 bg-background/40 p-3">
              <DetailLabel>Execution state</DetailLabel>
              <div className="flex flex-wrap gap-2">
                <ExecutionBadge
                  label={
                    detail ? renderTransitionStatus(detail.transitionExecution.status) : "Pending"
                  }
                  tone={
                    detail ? getExecutionStatusTone(detail.transitionExecution.status) : "amber"
                  }
                />
                {detail?.workUnit.workUnitTypeKey ? (
                  <ExecutionBadge label={detail.workUnit.workUnitTypeKey} tone="violet" />
                ) : null}
              </div>
            </div>
          </div>
        )}
      </section>

      {detail ? (
        <>
          <section className="space-y-4 border border-border/80 bg-background p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-1">
                <DetailEyebrow className="text-[0.72rem]">Completion gate</DetailEyebrow>
                <h2 className="text-lg font-semibold text-foreground">
                  {renderCompletionGateHeadline(detail.completionGate.panelState)}
                </h2>
                <p className="max-w-3xl text-sm text-muted-foreground">
                  {renderCompletionGateGuidance(detail.completionGate.panelState)}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <ExecutionBadge
                  label={detail.completionGate.panelState.replaceAll("_", " ")}
                  tone={getGateStateTone(detail.completionGate.panelState)}
                />
                <ExecutionBadge
                  label={renderTransitionStatus(detail.transitionExecution.status)}
                  tone={getExecutionStatusTone(detail.transitionExecution.status)}
                />
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
              <div className="space-y-3 border border-border/70 bg-background/40 p-4">
                <div className="space-y-2">
                  <DetailLabel>Gate status</DetailLabel>
                  <DetailPrimary className="text-base">
                    {renderCompletionGateHeadline(detail.completionGate.panelState)}
                  </DetailPrimary>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <DetailLabel>Last evaluated</DetailLabel>
                    <DetailPrimary>
                      {formatTimestamp(detail.completionGate.lastEvaluatedAt)}
                    </DetailPrimary>
                  </div>
                  <div className="space-y-1">
                    <DetailLabel>Completed at</DetailLabel>
                    <DetailPrimary>
                      {formatTimestamp(detail.completionGate.completedAt)}
                    </DetailPrimary>
                  </div>
                </div>

                {detail.completionGate.firstBlockingReason ? (
                  <div className="space-y-2 border border-rose-500/40 bg-rose-500/10 p-4">
                    <div className="flex flex-wrap gap-2">
                      <ExecutionBadge label="current blocker" tone="rose" />
                    </div>
                    <DetailPrimary>Why completion is blocked</DetailPrimary>
                    <p className="text-sm text-rose-100/90">
                      {detail.completionGate.firstBlockingReason}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="space-y-3 border border-border/70 bg-background/40 p-4">
                <div className="space-y-1">
                  <DetailLabel>
                    {completeTransitionAvailable
                      ? "Primary action"
                      : chooseAnotherPrimaryAvailable
                        ? "Recovery action"
                        : "Operator action"}
                  </DetailLabel>
                  <DetailPrimary>
                    {completeTransitionAvailable
                      ? "Close this transition now"
                      : chooseAnotherPrimaryAvailable
                        ? "Switch to a different primary workflow"
                        : detail.currentPrimaryWorkflow?.status === "active"
                          ? "Monitor the running workflow"
                          : "No transition action available"}
                  </DetailPrimary>
                </div>

                {completeTransitionAvailable ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      The completion gate is passing. This is the primary state-changing action.
                    </p>
                    <button
                      type="button"
                      className={cn(
                        buttonVariants({ variant: "default", size: "sm" }),
                        "rounded-none text-[0.68rem] uppercase tracking-[0.12em]",
                      )}
                      disabled={isBusy}
                      onClick={async () => {
                        if (!projectWorkUnitId) {
                          return;
                        }

                        await completeTransitionMutation.mutateAsync({
                          projectId,
                          projectWorkUnitId,
                          transitionExecutionId,
                        });
                      }}
                    >
                      Complete transition
                    </button>
                  </>
                ) : null}

                {chooseAnotherPrimaryAvailable ? (
                  <div className="space-y-3 border border-border/70 bg-background/60 p-3">
                    <p className="text-sm text-muted-foreground">
                      If this workflow path is not satisfying the gate, choose another bound
                      workflow attempt.
                    </p>
                    <div className="space-y-2">
                      <label
                        className="text-xs uppercase tracking-[0.12em] text-muted-foreground"
                        htmlFor="next-primary-workflow"
                      >
                        Next primary workflow
                      </label>
                      <Select
                        value={selectedWorkflowId}
                        onValueChange={(value) => setSelectedWorkflowId(value ?? "")}
                      >
                        <SelectTrigger
                          id="next-primary-workflow"
                          className="w-full bg-background/80 text-foreground"
                        >
                          <SelectValue placeholder="Choose a workflow" />
                        </SelectTrigger>
                        <SelectContent className="border border-border/80 bg-[#0b0f12] text-foreground">
                          {boundWorkflows.map((workflow) => (
                            <SelectItem key={workflow.workflowId} value={workflow.workflowId}>
                              {workflow.workflowName} ({workflow.workflowKey})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isBusy || !selectedWorkflowId || !projectWorkUnitId}
                      onClick={async () => {
                        if (!projectWorkUnitId || !selectedWorkflowId) {
                          return;
                        }

                        await choosePrimaryMutation.mutateAsync({
                          projectId,
                          projectWorkUnitId,
                          transitionExecutionId,
                          workflowId: selectedWorkflowId,
                          ...(selectedWorkflow?.workflowKey
                            ? { workflowKey: selectedWorkflow.workflowKey }
                            : {}),
                        });
                      }}
                    >
                      Choose another primary workflow
                    </Button>
                  </div>
                ) : null}

                {!completeTransitionAvailable &&
                !chooseAnotherPrimaryAvailable &&
                detail.currentPrimaryWorkflow ? (
                  <Link
                    to="/projects/$projectId/workflow-executions/$workflowExecutionId"
                    params={{
                      projectId,
                      workflowExecutionId: detail.currentPrimaryWorkflow.workflowExecutionId,
                    }}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "w-fit rounded-none text-[0.68rem] uppercase tracking-[0.12em]",
                    )}
                  >
                    Open workflow detail
                  </Link>
                ) : null}
              </div>
            </div>

            {hasCompletionEvidence && completionEvaluationTree ? (
              <div className="space-y-3 border border-border/70 bg-background/40 p-4">
                <div className="space-y-1">
                  <DetailLabel>Completion requirements</DetailLabel>
                  <DetailPrimary>What the runtime evaluated</DetailPrimary>
                  <p className="text-sm text-muted-foreground">
                    These are the live completion-gate results for this transition. Each requirement
                    shows whether it is currently fulfilled or unfulfilled and why.
                  </p>
                </div>

                <ConditionEvaluationTreePanel tree={completionEvaluationTree} />
              </div>
            ) : detail.completionGate.panelState === "failing" ? (
              <div className="border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100/90">
                Completion is blocked, but no structured completion requirements were resolved for
                this transition.
              </div>
            ) : null}
          </section>

          <section className="space-y-3 border border-border/80 bg-background p-4">
            <div className="space-y-1">
              <DetailEyebrow className="text-[0.72rem]">Current primary workflow</DetailEyebrow>
              <p className="text-sm text-muted-foreground">
                This is the workflow attempt currently responsible for driving the transition
                forward.
              </p>
            </div>

            {detail.currentPrimaryWorkflow ? (
              <div className="space-y-3 border border-border/70 bg-background/40 p-4 text-sm">
                <div className="flex flex-wrap gap-2">
                  <ExecutionBadge
                    label={renderWorkflowStatus(detail.currentPrimaryWorkflow.status)}
                    tone={getExecutionStatusTone(detail.currentPrimaryWorkflow.status)}
                  />
                  <ExecutionBadge label="primary workflow" tone="violet" />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <DetailLabel>Workflow</DetailLabel>
                    <DetailPrimary>{detail.currentPrimaryWorkflow.workflowName}</DetailPrimary>
                    <DetailCode>{detail.currentPrimaryWorkflow.workflowKey}</DetailCode>
                  </div>
                  <div>
                    <DetailLabel>Started</DetailLabel>
                    <DetailPrimary>
                      {formatTimestamp(detail.currentPrimaryWorkflow.startedAt)}
                    </DetailPrimary>
                  </div>
                </div>

                <Link
                  to="/projects/$projectId/workflow-executions/$workflowExecutionId"
                  params={{
                    projectId,
                    workflowExecutionId: detail.currentPrimaryWorkflow.workflowExecutionId,
                  }}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "mt-1 w-fit rounded-none text-[0.68rem] uppercase tracking-[0.12em]",
                  )}
                >
                  Open workflow detail
                </Link>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No primary workflow is currently selected.
              </p>
            )}
          </section>

          <Card frame="cut-heavy" tone="runtime" corner="white">
            <CardHeader>
              <div className="space-y-1">
                <DetailEyebrow className="text-[0.72rem]">Transition definition</DetailEyebrow>
                <CardTitle>{detail.transitionDefinition.transitionName}</CardTitle>
                <CardDescription>
                  {renderTransitionPath(detail.transitionDefinition)}
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.8fr)]">
                <div className="space-y-3 border border-border/70 bg-background/40 p-3">
                  <div>
                    <DetailLabel>Transition key</DetailLabel>
                    <DetailCode>{detail.transitionDefinition.transitionKey}</DetailCode>
                  </div>
                  <div>
                    <DetailLabel>State path</DetailLabel>
                    <DetailPrimary>
                      {renderTransitionPath(detail.transitionDefinition)}
                    </DetailPrimary>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ExecutionBadge
                      label={`${detail.transitionDefinition.completionConditionSets.length} completion sets`}
                      tone="amber"
                    />
                    <ExecutionBadge
                      label={`${detail.transitionDefinition.boundWorkflows.length} bound workflows`}
                      tone="slate"
                    />
                  </div>
                </div>

                <div className="space-y-3 border border-border/70 bg-background/40 p-3">
                  <div className="flex flex-wrap gap-2">
                    <ExecutionBadge label="start gate" tone="amber" />
                    <ExecutionBadge label="active" tone="sky" />
                  </div>
                  <div>
                    <DetailLabel>Started</DetailLabel>
                    <DetailPrimary>{formatTimestamp(detail.startGate.startedAt)}</DetailPrimary>
                  </div>
                  <p className="text-xs text-muted-foreground">{detail.startGate.note}</p>
                </div>
              </div>

              <div className="space-y-2">
                <DetailEyebrow className="text-[0.68rem]">Bound workflows</DetailEyebrow>

                {detail.transitionDefinition.boundWorkflows.length > 0 ? (
                  <ul className="space-y-2">
                    {detail.transitionDefinition.boundWorkflows.map((workflow) => (
                      <li
                        key={workflow.workflowId}
                        className="border border-border/70 bg-background/40 px-3 py-2 text-xs"
                      >
                        <p className="font-medium text-foreground">{workflow.workflowName}</p>
                        <p className="text-muted-foreground">{workflow.workflowKey}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No bound workflows configured.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <section className="space-y-3 border border-border/80 bg-background p-4">
            <h2 className="text-[0.72rem] uppercase tracking-[0.16em] text-muted-foreground">
              Primary attempt history
            </h2>

            {detail.primaryAttemptHistory.length > 0 ? (
              <ul className="space-y-2">
                {detail.primaryAttemptHistory.map((workflow) => (
                  <li
                    key={workflow.workflowExecutionId}
                    className="border border-border/70 bg-background/40 px-3 py-2 text-xs"
                  >
                    <div className="grid gap-1 md:grid-cols-[1fr_auto]">
                      <div>
                        <p className="font-medium text-foreground">{workflow.workflowName}</p>
                        <p className="text-muted-foreground">{workflow.workflowKey}</p>
                        <p className="text-muted-foreground">
                          status {renderWorkflowStatus(workflow.status)} · started{" "}
                          {formatTimestamp(workflow.startedAt)}
                        </p>
                      </div>

                      <Link
                        to="/projects/$projectId/workflow-executions/$workflowExecutionId"
                        params={{ projectId, workflowExecutionId: workflow.workflowExecutionId }}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "xs" }),
                          "h-fit rounded-none text-[0.66rem] uppercase tracking-[0.12em]",
                        )}
                      >
                        Open workflow detail
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No prior primary attempts.</p>
            )}
          </section>

          <section className="space-y-3 border border-border/80 bg-background p-4">
            <h2 className="text-[0.72rem] uppercase tracking-[0.16em] text-muted-foreground">
              Supporting workflows
            </h2>

            {detail.supportingWorkflows.length > 0 ? (
              <ul className="space-y-2">
                {detail.supportingWorkflows.map((workflow) => (
                  <li
                    key={workflow.workflowExecutionId}
                    className="border border-border/70 bg-background/40 px-3 py-2 text-xs"
                  >
                    <div className="grid gap-1 md:grid-cols-[1fr_auto]">
                      <div>
                        <p className="font-medium text-foreground">{workflow.workflowName}</p>
                        <p className="text-muted-foreground">{workflow.workflowKey}</p>
                        <p className="text-muted-foreground">
                          status {renderWorkflowStatus(workflow.status)} · started{" "}
                          {formatTimestamp(workflow.startedAt)}
                        </p>
                      </div>

                      <Link
                        to="/projects/$projectId/workflow-executions/$workflowExecutionId"
                        params={{ projectId, workflowExecutionId: workflow.workflowExecutionId }}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "xs" }),
                          "h-fit rounded-none text-[0.66rem] uppercase tracking-[0.12em]",
                        )}
                      >
                        Open workflow detail
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No supporting workflows.</p>
            )}
          </section>

          <section className="flex flex-wrap gap-2">
            <Link
              to="/projects/$projectId/transitions"
              params={{ projectId }}
              search={{ q: "", status: "all" }}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-none")}
            >
              Back to Guidance
            </Link>

            <Link
              to="/projects/$projectId/workflows"
              params={{ projectId }}
              search={{ q: "", workUnitTypeKey: "all" }}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-none")}
            >
              Open Active Workflows
            </Link>
          </section>
        </>
      ) : null}
    </MethodologyWorkspaceShell>
  );
}

export function TransitionExecutionShellRoute() {
  return <TransitionExecutionDetailRoute />;
}
