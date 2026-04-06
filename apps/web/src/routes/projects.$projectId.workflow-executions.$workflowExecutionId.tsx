import { useState } from "react";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";
import { cn } from "@/lib/utils";

const runtimeGuidanceActiveQueryKey = (projectId: string) =>
  ["runtime-guidance-active", projectId] as const;
const runtimeActiveWorkflowsQueryKey = (projectId: string) =>
  ["runtime-active-workflows", projectId] as const;

export const runtimeWorkflowExecutionDetailQueryKey = (
  projectId: string,
  workflowExecutionId: string,
) => ["runtime-workflow-execution-detail", projectId, workflowExecutionId] as const;

export const runtimeWorkflowExecutionShellQueryKey = (
  projectId: string,
  workflowExecutionId: string,
) => runtimeWorkflowExecutionDetailQueryKey(projectId, workflowExecutionId);

type WorkflowContextFactInstance = {
  contextFactInstanceId?: string;
  instanceOrder: number;
  valueJson: unknown;
  sourceStepExecutionId?: string;
  recordedAt?: string;
};

type WorkflowContextFactGroup = {
  contextFactDefinitionId: string;
  definitionKey?: string;
  definitionLabel?: string;
  definitionDescriptionJson?: unknown;
  instances: WorkflowContextFactInstance[];
};

type WorkflowStepSurface =
  | {
      state: "entry_pending";
      entryStep: {
        stepDefinitionId: string;
        stepType: string;
        stepKey?: string;
        stepLabel?: string;
      };
    }
  | {
      state: "active_step";
      activeStep: {
        stepExecutionId: string;
        stepDefinitionId: string;
        stepType: string;
        status: "active" | "completed";
        activatedAt: string;
        completedAt?: string;
        target: { page: "step-execution-detail"; stepExecutionId: string };
      };
    }
  | {
      state: "next_pending";
      afterStep: {
        stepExecutionId: string;
        stepDefinitionId: string;
        stepType: string;
        status: "active" | "completed";
        activatedAt: string;
        completedAt?: string;
        target: { page: "step-execution-detail"; stepExecutionId: string };
      };
      nextStep: {
        stepDefinitionId: string;
        stepType: string;
        stepKey?: string;
        stepLabel?: string;
      };
    }
  | {
      state: "terminal_no_next_step";
      terminalStep?: {
        stepExecutionId: string;
        stepDefinitionId: string;
        stepType: string;
        status: "active" | "completed";
        activatedAt: string;
        completedAt?: string;
        target: { page: "step-execution-detail"; stepExecutionId: string };
      };
    }
  | {
      state: "invalid_definition";
      reason: "missing_entry_step" | "ambiguous_entry_step";
    };

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

function formatDescription(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "markdown" in value &&
    typeof (value as { markdown?: unknown }).markdown === "string"
  ) {
    return (value as { markdown: string }).markdown;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "[unserializable description]";
  }
}

function formatUnknown(value: unknown): string {
  if (value === null) {
    return "null";
  }

  if (value === undefined) {
    return "undefined";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "[unserializable]";
  }
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

function renderStepSurfaceLabel(state: WorkflowStepSurface["state"]): string {
  switch (state) {
    case "entry_pending":
      return "Entry pending";
    case "active_step":
      return "Active step";
    case "next_pending":
      return "Next pending";
    case "terminal_no_next_step":
      return "Terminal";
    case "invalid_definition":
      return "Invalid definition";
  }
}

function renderStepLabel(step: { stepKey?: string; stepLabel?: string; stepType: string }): string {
  return step.stepLabel ?? step.stepKey ?? `${step.stepType} step`;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function WorkflowContextValuePresentation({ value }: { value: unknown }) {
  if (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return (
      <pre className="whitespace-pre-wrap break-words border border-border/70 bg-background/60 p-3 text-xs text-muted-foreground">
        {formatUnknown(value)}
      </pre>
    );
  }

  if (Array.isArray(value)) {
    return (
      <div className="space-y-2">
        {value.length === 0 ? (
          <p className="border border-border/70 bg-background/60 p-3 text-xs text-muted-foreground">
            Empty list
          </p>
        ) : (
          value.map((entry) => (
            <pre
              key={`value-${formatUnknown(entry)}`}
              className="whitespace-pre-wrap break-words border border-border/70 bg-background/60 p-3 text-xs text-muted-foreground"
            >
              {formatUnknown(entry)}
            </pre>
          ))
        )}
      </div>
    );
  }

  if (isPlainRecord(value)) {
    if (typeof value.relativePath === "string") {
      return (
        <dl className="grid gap-2 border border-border/70 bg-background/60 p-3 text-xs">
          <div>
            <dt className="text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
              Relative path
            </dt>
            <dd className="mt-1 break-all text-foreground">{value.relativePath}</dd>
          </div>
        </dl>
      );
    }

    if (typeof value.workflowDefinitionId === "string") {
      return (
        <dl className="grid gap-2 border border-border/70 bg-background/60 p-3 text-xs">
          <div>
            <dt className="text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
              Workflow definition ID
            </dt>
            <dd className="mt-1 break-all text-foreground">{value.workflowDefinitionId}</dd>
          </div>
        </dl>
      );
    }

    if (typeof value.projectWorkUnitId === "string") {
      return (
        <dl className="grid gap-2 border border-border/70 bg-background/60 p-3 text-xs">
          <div>
            <dt className="text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
              Project work unit ID
            </dt>
            <dd className="mt-1 break-all text-foreground">{value.projectWorkUnitId}</dd>
          </div>
        </dl>
      );
    }

    if (typeof value.factInstanceId === "string") {
      return (
        <dl className="grid gap-2 border border-border/70 bg-background/60 p-3 text-xs">
          <div>
            <dt className="text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
              Fact instance ID
            </dt>
            <dd className="mt-1 break-all text-foreground">{value.factInstanceId}</dd>
          </div>
        </dl>
      );
    }

    return (
      <dl className="grid gap-2 border border-border/70 bg-background/60 p-3 text-xs sm:grid-cols-2">
        {Object.entries(value).map(([key, entry]) => (
          <div key={key} className="space-y-1">
            <dt className="text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
              {key}
            </dt>
            <dd className="whitespace-pre-wrap break-words text-foreground">
              {formatUnknown(entry)}
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <pre className="whitespace-pre-wrap break-words border border-border/70 bg-background/60 p-3 text-xs text-muted-foreground">
      {formatUnknown(value)}
    </pre>
  );
}

export function WorkflowContextFactDialog({
  group,
  open,
  onOpenChange,
}: {
  group: WorkflowContextFactGroup;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const description = formatDescription(group.definitionDescriptionJson);
  const title = group.definitionLabel ?? group.definitionKey ?? group.contextFactDefinitionId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(85vh,48rem)] max-w-3xl overflow-hidden rounded-none border border-border/80 bg-background">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description ?? "Read-only workflow context instances for this definition."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 overflow-y-auto pr-1 text-xs">
          <section className="space-y-1 border border-border/70 bg-background/40 p-3">
            <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
              Definition metadata
            </p>
            <p className="text-muted-foreground">
              Key: {group.definitionKey ?? "—"} · Current instances: {group.instances.length}
            </p>
          </section>

          {group.instances.length === 0 ? (
            <section className="space-y-1 border border-border/70 bg-background/40 p-3">
              <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                Empty state
              </p>
              <p className="text-muted-foreground">
                No current instances recorded for this definition.
              </p>
            </section>
          ) : null}

          {group.instances.length === 1 ? (
            <section className="space-y-3 border border-border/70 bg-background/40 p-3">
              <div className="space-y-1">
                <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                  Instance {group.instances[0]!.instanceOrder + 1}
                </p>
                <p className="text-muted-foreground">
                  Recorded: {formatTimestamp(group.instances[0]!.recordedAt)}
                </p>
              </div>
              <WorkflowContextValuePresentation value={group.instances[0]!.valueJson} />
            </section>
          ) : null}

          {group.instances.length > 1 ? (
            <div className="space-y-3">
              {group.instances.map((instance) => (
                <section
                  key={
                    instance.contextFactInstanceId ??
                    `${group.contextFactDefinitionId}-${instance.instanceOrder}`
                  }
                  className="space-y-3 border border-border/70 bg-background/40 p-3"
                >
                  <div className="space-y-1">
                    <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                      Instance {instance.instanceOrder + 1}
                    </p>
                    <p className="text-muted-foreground">
                      Recorded: {formatTimestamp(instance.recordedAt)}
                    </p>
                  </div>
                  <WorkflowContextValuePresentation value={instance.valueJson} />
                </section>
              ))}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WorkflowStepSurfaceCard({
  projectId,
  stepSurface,
  activateWorkflowStep,
  isActivating,
}: {
  projectId: string;
  stepSurface: WorkflowStepSurface;
  activateWorkflowStep: () => Promise<void>;
  isActivating: boolean;
}) {
  const badgeClassName =
    stepSurface.state === "invalid_definition"
      ? "border-destructive/50 bg-destructive/10 text-destructive"
      : stepSurface.state === "active_step"
        ? "border-primary/50 bg-primary/15 text-primary"
        : "border-border/70 bg-background/40 text-muted-foreground";

  switch (stepSurface.state) {
    case "entry_pending":
      return (
        <Card frame="flat" tone="runtime" className="border-border/70 bg-background/40">
          <CardHeader>
            <CardDescription>Workflow orchestration state</CardDescription>
            <CardTitle>Entry step pending activation</CardTitle>
            <CardAction>
              <span
                className={cn(
                  "border px-2 py-1 text-[0.65rem] uppercase tracking-[0.12em]",
                  badgeClassName,
                )}
              >
                {renderStepSurfaceLabel(stepSurface.state)}
              </span>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <p>Entry step: {renderStepLabel(stepSurface.entryStep)}</p>
            <p>Type: {stepSurface.entryStep.stepType}</p>
          </CardContent>
          <CardFooter className="justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Activate the workflow entry shell from here.
            </p>
            <Button size="sm" onClick={activateWorkflowStep} disabled={isActivating}>
              Activate entry step
            </Button>
          </CardFooter>
        </Card>
      );

    case "active_step":
      return (
        <Card frame="flat" tone="runtime" className="border-border/70 bg-background/40">
          <CardHeader>
            <CardDescription>Workflow orchestration state</CardDescription>
            <CardTitle>Active step in progress</CardTitle>
            <CardAction>
              <span
                className={cn(
                  "border px-2 py-1 text-[0.65rem] uppercase tracking-[0.12em]",
                  badgeClassName,
                )}
              >
                {renderStepSurfaceLabel(stepSurface.state)}
              </span>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <p>Step type: {stepSurface.activeStep.stepType}</p>
            <p>Status: {stepSurface.activeStep.status}</p>
            <p>Activated: {formatTimestamp(stepSurface.activeStep.activatedAt)}</p>
            <p>While an active step exists, next-step activation stays hidden on this page.</p>
          </CardContent>
          <CardFooter className="justify-end">
            <Link
              to="/projects/$projectId/step-executions/$stepExecutionId"
              params={{ projectId, stepExecutionId: stepSurface.activeStep.stepExecutionId }}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-none")}
            >
              Open active step
            </Link>
          </CardFooter>
        </Card>
      );

    case "next_pending":
      return (
        <Card frame="flat" tone="runtime" className="border-border/70 bg-background/40">
          <CardHeader>
            <CardDescription>Workflow orchestration state</CardDescription>
            <CardTitle>Next step pending activation</CardTitle>
            <CardAction>
              <span
                className={cn(
                  "border px-2 py-1 text-[0.65rem] uppercase tracking-[0.12em]",
                  badgeClassName,
                )}
              >
                {renderStepSurfaceLabel(stepSurface.state)}
              </span>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <p>Completed step: {stepSurface.afterStep.stepType}</p>
            <p>Completed at: {formatTimestamp(stepSurface.afterStep.completedAt)}</p>
            <p>Next step: {renderStepLabel(stepSurface.nextStep)}</p>
            <p>Next type: {stepSurface.nextStep.stepType}</p>
          </CardContent>
          <CardFooter className="justify-between gap-3">
            <Link
              to="/projects/$projectId/step-executions/$stepExecutionId"
              params={{ projectId, stepExecutionId: stepSurface.afterStep.stepExecutionId }}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-none")}
            >
              Open completed step
            </Link>
            <Button size="sm" onClick={activateWorkflowStep} disabled={isActivating}>
              Activate next step
            </Button>
          </CardFooter>
        </Card>
      );

    case "terminal_no_next_step":
      return (
        <Card frame="flat" tone="runtime" className="border-border/70 bg-background/40">
          <CardHeader>
            <CardDescription>Workflow orchestration state</CardDescription>
            <CardTitle>Workflow is terminal</CardTitle>
            <CardAction>
              <span
                className={cn(
                  "border px-2 py-1 text-[0.65rem] uppercase tracking-[0.12em]",
                  badgeClassName,
                )}
              >
                {renderStepSurfaceLabel(stepSurface.state)}
              </span>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            {stepSurface.terminalStep ? (
              <>
                <p>Terminal step type: {stepSurface.terminalStep.stepType}</p>
                <p>Completed at: {formatTimestamp(stepSurface.terminalStep.completedAt)}</p>
              </>
            ) : (
              <p>No next step is defined for this workflow path.</p>
            )}
          </CardContent>
          {stepSurface.terminalStep ? (
            <CardFooter className="justify-end">
              <Link
                to="/projects/$projectId/step-executions/$stepExecutionId"
                params={{ projectId, stepExecutionId: stepSurface.terminalStep.stepExecutionId }}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-none")}
              >
                Open terminal step
              </Link>
            </CardFooter>
          ) : null}
        </Card>
      );

    case "invalid_definition":
      return (
        <Card frame="flat" tone="runtime" className="border-destructive/50 bg-destructive/10">
          <CardHeader>
            <CardDescription className="text-destructive/80">
              Workflow orchestration state
            </CardDescription>
            <CardTitle className="text-destructive">Workflow definition is invalid</CardTitle>
            <CardAction>
              <span
                className={cn(
                  "border px-2 py-1 text-[0.65rem] uppercase tracking-[0.12em]",
                  badgeClassName,
                )}
              >
                {renderStepSurfaceLabel(stepSurface.state)}
              </span>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-destructive">
            <p>
              {stepSurface.reason === "missing_entry_step"
                ? "No unique entry step could be derived for this workflow definition."
                : "Multiple entry steps were derived, so runtime activation is blocked."}
            </p>
          </CardContent>
        </Card>
      );
  }
}

export const Route = createFileRoute(
  "/projects/$projectId/workflow-executions/$workflowExecutionId",
)({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData({
      ...context.orpc.project.getRuntimeWorkflowExecutionDetail.queryOptions({
        input: {
          projectId: params.projectId,
          workflowExecutionId: params.workflowExecutionId,
        },
      }),
      queryKey: runtimeWorkflowExecutionDetailQueryKey(
        params.projectId,
        params.workflowExecutionId,
      ),
    });
  },
  component: WorkflowExecutionDetailRoute,
});

export function WorkflowExecutionDetailRoute() {
  const { projectId, workflowExecutionId } = Route.useParams();
  const navigate = Route.useNavigate();
  const { orpc, queryClient } = Route.useRouteContext();
  const [openContextFactId, setOpenContextFactId] = useState<string | null>(null);

  const workflowExecutionDetailQuery = useQuery({
    ...orpc.project.getRuntimeWorkflowExecutionDetail.queryOptions({
      input: {
        projectId,
        workflowExecutionId,
      },
    }),
    queryKey: runtimeWorkflowExecutionDetailQueryKey(projectId, workflowExecutionId),
  });

  const retrySameWorkflowMutation = useMutation(
    orpc.project.retrySameWorkflowExecution.mutationOptions({
      onSuccess: async (result) => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: runtimeWorkflowExecutionDetailQueryKey(projectId, workflowExecutionId),
          }),
          queryClient.invalidateQueries({ queryKey: runtimeActiveWorkflowsQueryKey(projectId) }),
          queryClient.invalidateQueries({ queryKey: runtimeGuidanceActiveQueryKey(projectId) }),
        ]);

        if (result?.workflowExecutionId) {
          await navigate({
            to: "/projects/$projectId/workflow-executions/$workflowExecutionId",
            params: {
              projectId,
              workflowExecutionId: result.workflowExecutionId,
            },
            replace: true,
          });
        }
      },
    }),
  );

  const activateWorkflowStepMutation = useMutation(
    orpc.project.activateWorkflowStepExecution.mutationOptions({
      onSuccess: async (result) => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: runtimeWorkflowExecutionDetailQueryKey(projectId, workflowExecutionId),
          }),
          queryClient.invalidateQueries({ queryKey: runtimeActiveWorkflowsQueryKey(projectId) }),
          queryClient.invalidateQueries({ queryKey: runtimeGuidanceActiveQueryKey(projectId) }),
        ]);

        if (result?.stepExecutionId) {
          await navigate({
            to: "/projects/$projectId/step-executions/$stepExecutionId",
            params: {
              projectId,
              stepExecutionId: result.stepExecutionId,
            },
          });
        }
      },
    }),
  );

  const detail = workflowExecutionDetailQuery.data;
  const isLoading = workflowExecutionDetailQuery.isLoading;
  const hasError = Boolean(workflowExecutionDetailQuery.error);

  return (
    <MethodologyWorkspaceShell
      title="Workflow execution"
      stateLabel={isLoading ? "loading" : hasError ? "failed" : "normal"}
      segments={[
        { label: "Projects", to: "/projects" },
        {
          label: projectId,
          to: "/projects/$projectId",
          params: { projectId },
        },
        {
          label: "Active Workflows",
          to: "/projects/$projectId/workflows",
          params: { projectId },
        },
        { label: detail?.workflowExecution.workflowKey ?? workflowExecutionId },
      ]}
    >
      <section
        data-testid="runtime-workflow-execution-shell-boundary"
        className="space-y-3 border border-border/80 bg-background p-4"
      >
        <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
          Runtime context
        </p>

        {isLoading ? (
          <>
            <p className="text-sm text-muted-foreground">Loading workflow execution detail…</p>
            <Skeleton className="h-28 w-full rounded-none" />
          </>
        ) : hasError ? (
          <p className="border border-destructive/60 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {toErrorMessage(workflowExecutionDetailQuery.error)}
          </p>
        ) : (
          <div className="grid gap-2 text-sm md:grid-cols-3">
            <p>
              <span className="text-muted-foreground">Workflow execution:</span>{" "}
              {detail?.workflowExecution.workflowExecutionId ?? workflowExecutionId}
            </p>
            <p>
              <span className="text-muted-foreground">Workflow:</span>{" "}
              {detail?.workflowExecution.workflowName ?? "pending context"}
            </p>
            <p>
              <span className="text-muted-foreground">Status:</span>{" "}
              {detail ? renderWorkflowStatus(detail.workflowExecution.status) : "pending"}
            </p>
          </div>
        )}
      </section>

      {detail ? (
        <>
          <section className="space-y-3 border border-border/80 bg-background p-4">
            <h2 className="text-[0.72rem] uppercase tracking-[0.16em] text-muted-foreground">
              Workflow runtime summary
            </h2>

            <div className="grid gap-3 text-sm md:grid-cols-2">
              <div className="space-y-1">
                <p>
                  <span className="text-muted-foreground">Name:</span>{" "}
                  {detail.workflowExecution.workflowName}
                </p>
                <p>
                  <span className="text-muted-foreground">Key:</span>{" "}
                  {detail.workflowExecution.workflowKey}
                </p>
                <p>
                  <span className="text-muted-foreground">Role:</span>{" "}
                  {detail.workflowExecution.workflowRole}
                </p>
                <p>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  {renderWorkflowStatus(detail.workflowExecution.status)}
                </p>
              </div>

              <div className="space-y-1">
                <p>
                  <span className="text-muted-foreground">Started:</span>{" "}
                  {formatTimestamp(detail.workflowExecution.startedAt)}
                </p>
                <p>
                  <span className="text-muted-foreground">Completed:</span>{" "}
                  {formatTimestamp(detail.workflowExecution.completedAt)}
                </p>
                <p>
                  <span className="text-muted-foreground">Superseded:</span>{" "}
                  {formatTimestamp(detail.workflowExecution.supersededAt)}
                </p>
              </div>
            </div>

            <div className="grid gap-2 border border-border/70 bg-background/40 p-3 text-xs md:grid-cols-2">
              <div className="space-y-1">
                <p className="font-medium text-foreground">Parent transition</p>
                <p className="text-muted-foreground">
                  {detail.parentTransition.transitionName} ({detail.parentTransition.transitionKey})
                </p>
                <Link
                  to="/projects/$projectId/transition-executions/$transitionExecutionId"
                  params={{
                    projectId,
                    transitionExecutionId: detail.parentTransition.transitionExecutionId,
                  }}
                  search={{ projectWorkUnitId: detail.workUnit.projectWorkUnitId }}
                  className="inline-flex font-medium uppercase tracking-[0.1em] text-primary hover:underline"
                >
                  Open transition detail
                </Link>
              </div>

              <div className="space-y-1">
                <p className="font-medium text-foreground">Parent work unit</p>
                <p className="text-muted-foreground">
                  {detail.workUnit.workUnitTypeName} ({detail.workUnit.workUnitTypeKey})
                </p>
                <Link
                  to="/projects/$projectId/work-units/$projectWorkUnitId"
                  params={{ projectId, projectWorkUnitId: detail.workUnit.projectWorkUnitId }}
                  search={{ q: "", hasActiveTransition: "all" }}
                  className="inline-flex font-medium uppercase tracking-[0.1em] text-primary hover:underline"
                >
                  Open work unit overview
                </Link>
              </div>
            </div>
          </section>

          <section className="space-y-3 border border-border/80 bg-background p-4">
            <h2 className="text-[0.72rem] uppercase tracking-[0.16em] text-muted-foreground">
              Retry and supersession lineage
            </h2>

            <div className="space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">Supersedes workflow execution:</span>{" "}
                {detail.lineage.supersedesWorkflowExecutionId ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Superseded by workflow execution:</span>{" "}
                {detail.lineage.supersededByWorkflowExecutionId ?? "—"}
              </p>
            </div>

            {detail.lineage.previousPrimaryAttempts &&
            detail.lineage.previousPrimaryAttempts.length > 0 ? (
              <div className="space-y-2">
                <p className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                  Previous primary attempts
                </p>
                <ul className="space-y-2">
                  {detail.lineage.previousPrimaryAttempts.map((attempt) => (
                    <li
                      key={attempt.workflowExecutionId}
                      className="grid gap-1 border border-border/70 bg-background/40 px-3 py-2 text-xs md:grid-cols-[1fr_auto]"
                    >
                      <div>
                        <p className="font-medium text-foreground">{attempt.workflowName}</p>
                        <p className="text-muted-foreground">{attempt.workflowKey}</p>
                      </div>
                      <Link
                        to="/projects/$projectId/workflow-executions/$workflowExecutionId"
                        params={{ projectId, workflowExecutionId: attempt.workflowExecutionId }}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "xs" }),
                          "h-fit rounded-none text-[0.66rem] uppercase tracking-[0.12em]",
                        )}
                      >
                        Open attempt
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {detail.retryAction?.enabled ? (
              <button
                type="button"
                className={cn(
                  buttonVariants({ variant: "default", size: "sm" }),
                  "rounded-none text-[0.68rem] uppercase tracking-[0.12em]",
                )}
                disabled={retrySameWorkflowMutation.isPending}
                onClick={async () => {
                  await retrySameWorkflowMutation.mutateAsync({
                    projectId,
                    workflowExecutionId,
                  });
                }}
              >
                Retry same workflow
              </button>
            ) : null}

            {detail.retryAction && !detail.retryAction.enabled ? (
              <div className="space-y-1 border border-border/70 bg-background/40 px-3 py-2 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Retry unavailable</p>
                <p>
                  {detail.retryAction.reasonIfDisabled ??
                    "Retry is currently unavailable for this workflow execution."}
                </p>
              </div>
            ) : null}

            {detail.impactDialog?.requiredForRetry ? (
              <p className="text-xs text-muted-foreground">
                Retry impact: transition{" "}
                {detail.impactDialog.affectedEntitiesSummary.transitionExecutionId}
                {" · workflows "}
                {detail.impactDialog.affectedEntitiesSummary.workflowExecutionIds.join(", ")}
              </p>
            ) : null}
          </section>

          <section className="space-y-3 border border-border/80 bg-background p-4">
            <h2 className="text-[0.72rem] uppercase tracking-[0.16em] text-muted-foreground">
              Workflow step surface
            </h2>
            <WorkflowStepSurfaceCard
              projectId={projectId}
              stepSurface={detail.stepSurface as WorkflowStepSurface}
              activateWorkflowStep={async () => {
                await activateWorkflowStepMutation.mutateAsync({ projectId, workflowExecutionId });
              }}
              isActivating={activateWorkflowStepMutation.isPending}
            />
          </section>

          <section className="space-y-3 border border-border/80 bg-background p-4">
            <div className="space-y-1">
              <h2 className="text-[0.72rem] uppercase tracking-[0.16em] text-muted-foreground">
                Workflow context facts
              </h2>
              <p className="text-sm text-muted-foreground">
                Read-only current-state context facts grouped by definition order.
              </p>
            </div>

            {detail.workflowContextFacts.groups.length === 0 ? (
              <p className="border border-border/70 bg-background/40 px-3 py-2 text-sm text-muted-foreground">
                This workflow does not define any context facts.
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {detail.workflowContextFacts.groups.map((group: WorkflowContextFactGroup) => {
                  const description = formatDescription(group.definitionDescriptionJson);
                  const title =
                    group.definitionLabel ?? group.definitionKey ?? group.contextFactDefinitionId;

                  return (
                    <div key={group.contextFactDefinitionId} className="space-y-0">
                      <Card
                        frame="flat"
                        tone="runtime"
                        className="border-border/70 bg-background/40"
                      >
                        <CardHeader>
                          <CardDescription>
                            {group.definitionKey ?? group.contextFactDefinitionId}
                          </CardDescription>
                          <CardTitle>{title}</CardTitle>
                          <CardAction>
                            <span className="border border-border/70 bg-background/40 px-2 py-1 text-[0.65rem] uppercase tracking-[0.12em] text-muted-foreground">
                              {group.instances.length} instance
                              {group.instances.length === 1 ? "" : "s"}
                            </span>
                          </CardAction>
                        </CardHeader>
                        <CardContent className="space-y-2 text-xs text-muted-foreground">
                          <p>{description ?? "No definition description recorded."}</p>
                          <p>
                            {group.instances.length === 0
                              ? "No current instances recorded."
                              : group.instances.length === 1
                                ? "One current instance recorded."
                                : `${group.instances.length} current instances recorded.`}
                          </p>
                        </CardContent>
                        <CardFooter className="justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setOpenContextFactId(group.contextFactDefinitionId)}
                          >
                            View instances
                          </Button>
                        </CardFooter>
                      </Card>

                      <WorkflowContextFactDialog
                        group={group}
                        open={openContextFactId === group.contextFactDefinitionId}
                        onOpenChange={(open) =>
                          setOpenContextFactId(open ? group.contextFactDefinitionId : null)
                        }
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="flex flex-wrap gap-2">
            <Link
              to="/projects/$projectId/workflows"
              params={{ projectId }}
              search={{ q: "", workUnitTypeKey: "all" }}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-none")}
            >
              Back to Active Workflows
            </Link>

            <Link
              to="/projects/$projectId/transitions"
              params={{ projectId }}
              search={{ q: "", status: "all" }}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-none")}
            >
              Back to Guidance
            </Link>
          </section>
        </>
      ) : null}
    </MethodologyWorkspaceShell>
  );
}

export function WorkflowExecutionShellRoute() {
  return <WorkflowExecutionDetailRoute />;
}
