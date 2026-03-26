import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRightIcon } from "lucide-react";
import { z } from "zod";

import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RUNTIME_DEFERRED_RATIONALE,
  getDeterministicState,
} from "@/features/methodologies/foundation";
import {
  BaselineVisibilitySection,
  type BaselinePreview,
} from "@/features/projects/baseline-visibility";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function readOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  return value === null ? null : readString(value);
}

function toValidationDiagnostic(
  value: unknown,
): BaselinePreview["diagnosticsHistory"][string][number] | null {
  if (!isRecord(value)) {
    return null;
  }

  const code = readString(value.code);
  const scope = readString(value.scope);
  const required = readString(value.required);
  const observed = readString(value.observed);
  const timestamp = readString(value.timestamp);
  if (
    code === null ||
    scope === null ||
    required === null ||
    observed === null ||
    timestamp === null ||
    typeof value.blocking !== "boolean"
  ) {
    return null;
  }

  return {
    code,
    scope,
    blocking: value.blocking,
    required,
    observed,
    remediation: readOptionalString(value.remediation) ?? null,
    timestamp,
    evidenceRef: readOptionalString(value.evidenceRef) ?? null,
  };
}

function toBaselineTransition(
  value: unknown,
): BaselinePreview["transitionPreview"]["transitions"][number] | null {
  if (!isRecord(value)) {
    return null;
  }

  const transitionKey = readString(value.transitionKey);
  const toState = readString(value.toState);
  const status = readString(value.status);
  const statusReasonCode = readString(value.statusReasonCode);
  const gateClass = value.gateClass;
  if (
    transitionKey === null ||
    toState === null ||
    statusReasonCode === null ||
    (status !== "eligible" && status !== "blocked" && status !== "future") ||
    (gateClass !== "start_gate" && gateClass !== "completion_gate")
  ) {
    return null;
  }

  const diagnostics = Array.isArray(value.diagnostics)
    ? value.diagnostics.flatMap((diagnostic) => {
        const parsed = toValidationDiagnostic(diagnostic);
        return parsed ? [parsed] : [];
      })
    : [];

  const conditionSets = Array.isArray(value.conditionSets)
    ? value.conditionSets.flatMap((conditionSet) => {
        if (!isRecord(conditionSet)) {
          return [];
        }
        const key = readString(conditionSet.key);
        const phase = conditionSet.phase;
        const mode = conditionSet.mode;
        if (
          key === null ||
          (phase !== "start" && phase !== "completion") ||
          (mode !== "all" && mode !== "any")
        ) {
          return [];
        }

        const parsedConditionSet: BaselinePreview["transitionPreview"]["transitions"][number]["conditionSets"][number] =
          {
            key,
            phase,
            mode,
            groups: Array.isArray(conditionSet.groups) ? conditionSet.groups : [],
          };
        return [parsedConditionSet];
      })
    : [];

  const workflows = Array.isArray(value.workflows)
    ? value.workflows.flatMap((workflow) => {
        if (!isRecord(workflow)) {
          return [];
        }
        const workflowKey = readString(workflow.workflowKey);
        const disabledReason = readString(workflow.disabledReason);
        const helperText = readString(workflow.helperText);
        if (
          workflowKey === null ||
          disabledReason === null ||
          helperText === null ||
          workflow.enabled !== false
        ) {
          return [];
        }

        return [
          {
            workflowKey,
            enabled: false as const,
            disabledReason,
            helperText,
          },
        ];
      })
    : [];

  return {
    transitionKey,
    fromState: readOptionalString(value.fromState) ?? null,
    toState,
    gateClass,
    status,
    statusReasonCode,
    ...(value.guidance !== undefined ? { guidance: value.guidance } : {}),
    conditionSets,
    diagnostics,
    workflows,
  };
}

export function toBaselinePreview(value: unknown): BaselinePreview | null {
  if (!isRecord(value)) {
    return null;
  }

  const summary = isRecord(value.summary) ? value.summary : null;
  const transitionPreview = isRecord(value.transitionPreview) ? value.transitionPreview : null;
  if (summary === null || transitionPreview === null) {
    return null;
  }

  const methodologyKey = readString(summary.methodologyKey);
  const pinnedVersion = readString(summary.pinnedVersion);
  const publishState = readString(summary.publishState);
  const validationStatus = readString(summary.validationStatus);
  const setupFactsStatus = readString(summary.setupFactsStatus);
  const currentState = readString(transitionPreview.currentState);
  if (
    methodologyKey === null ||
    pinnedVersion === null ||
    publishState === null ||
    validationStatus === null ||
    setupFactsStatus === null ||
    currentState === null
  ) {
    return null;
  }

  const transitions = Array.isArray(transitionPreview.transitions)
    ? transitionPreview.transitions.flatMap((transition) => {
        const parsed = toBaselineTransition(transition);
        return parsed ? [parsed] : [];
      })
    : [];

  const diagnosticsHistory = isRecord(value.diagnosticsHistory)
    ? Object.fromEntries(
        Object.entries(value.diagnosticsHistory).map(([context, diagnostics]) => [
          context,
          Array.isArray(diagnostics)
            ? diagnostics.flatMap((diagnostic) => {
                const parsed = toValidationDiagnostic(diagnostic);
                return parsed ? [parsed] : [];
              })
            : [],
        ]),
      )
    : {};

  const evidenceTimeline = Array.isArray(value.evidenceTimeline)
    ? value.evidenceTimeline.flatMap((event) => {
        if (!isRecord(event)) {
          return [];
        }
        const kind = readString(event.kind);
        const timestamp = readString(event.timestamp);
        const reference = readString(event.reference);
        if (kind === null || timestamp === null || reference === null) {
          return [];
        }

        return [
          {
            kind,
            actor: readOptionalString(event.actor) ?? null,
            timestamp,
            reference,
          },
        ];
      })
    : [];

  const facts = Array.isArray(value.facts)
    ? value.facts.flatMap((fact) => {
        if (!isRecord(fact)) {
          return [];
        }
        const key = readString(fact.key);
        const type = readString(fact.type);
        const indicator = fact.indicator;
        if (
          key === null ||
          type === null ||
          typeof fact.missing !== "boolean" ||
          (indicator !== "blocking" && indicator !== "ok")
        ) {
          return [];
        }

        return [
          {
            key,
            type,
            value: fact.value,
            required: fact.required === true,
            missing: fact.missing,
            indicator,
            sourceExecutionId: readOptionalString(fact.sourceExecutionId) ?? null,
            updatedAt: readOptionalString(fact.updatedAt) ?? null,
          } satisfies BaselinePreview["facts"][number],
        ];
      })
    : [];

  const projectionSummary = isRecord(value.projectionSummary)
    ? {
        workUnits: Array.isArray(value.projectionSummary.workUnits)
          ? value.projectionSummary.workUnits.flatMap((workUnit) => {
              if (!isRecord(workUnit)) {
                return [];
              }
              const workUnitTypeKey = readString(workUnit.workUnitTypeKey);
              if (workUnitTypeKey === null) {
                return [];
              }
              return [
                {
                  workUnitTypeKey,
                  ...(workUnit.guidance !== undefined ? { guidance: workUnit.guidance } : {}),
                },
              ];
            })
          : [],
        agents: Array.isArray(value.projectionSummary.agents)
          ? value.projectionSummary.agents.flatMap((agent) => {
              if (!isRecord(agent)) {
                return [];
              }
              const agentTypeKey = readString(agent.agentTypeKey);
              if (agentTypeKey === null) {
                return [];
              }
              return [
                {
                  agentTypeKey,
                  ...(agent.guidance !== undefined ? { guidance: agent.guidance } : {}),
                },
              ];
            })
          : [],
        transitions: Array.isArray(value.projectionSummary.transitions)
          ? value.projectionSummary.transitions.flatMap((transition) => {
              if (!isRecord(transition)) {
                return [];
              }
              const transitionKey = readString(transition.transitionKey);
              const toState = readString(transition.toState);
              const gateClass = transition.gateClass;
              if (
                transitionKey === null ||
                toState === null ||
                (gateClass !== "start_gate" && gateClass !== "completion_gate")
              ) {
                return [];
              }

              const parsedTransition: NonNullable<
                BaselinePreview["projectionSummary"]
              >["transitions"][number] = {
                transitionKey,
                workUnitTypeKey: readOptionalString(transition.workUnitTypeKey) ?? null,
                fromState: readOptionalString(transition.fromState) ?? null,
                toState,
                gateClass,
              };

              return [parsedTransition];
            })
          : [],
        facts: Array.isArray(value.projectionSummary.facts)
          ? value.projectionSummary.facts.flatMap((fact) => {
              if (!isRecord(fact)) {
                return [];
              }
              const workUnitTypeKey = readString(fact.workUnitTypeKey);
              const key = readString(fact.key);
              const type = readString(fact.type);
              if (workUnitTypeKey === null || key === null || type === null) {
                return [];
              }

              return [
                {
                  workUnitTypeKey,
                  key,
                  type,
                  required: fact.required === true,
                  defaultValue: fact.defaultValue,
                },
              ];
            })
          : [],
      }
    : undefined;

  return {
    summary: {
      methodologyKey,
      pinnedVersion,
      publishState,
      validationStatus,
      setupFactsStatus,
    },
    transitionPreview: {
      workUnitTypeKey: readOptionalString(transitionPreview.workUnitTypeKey) ?? null,
      currentState,
      transitions,
    },
    ...(projectionSummary ? { projectionSummary } : {}),
    facts,
    diagnosticsHistory,
    evidenceTimeline,
  };
}

const dashboardSearchSchema = z.object({
  workUnitTypeKey: z.string().min(1).optional(),
});

export const Route = createFileRoute("/projects/$projectId/")({
  validateSearch: (search) => dashboardSearchSchema.parse(search),
  component: ProjectDashboardRoute,
});

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return date.toLocaleString();
}

export function ProjectDashboardRoute() {
  const { projectId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { orpc } = Route.useRouteContext();

  const projectQuery = useQuery(
    orpc.project.getProjectDetails.queryOptions({
      input: { projectId, workUnitTypeKey: search.workUnitTypeKey },
    }),
  );

  const state = getDeterministicState({
    isLoading: projectQuery.isLoading,
    hasError: Boolean(projectQuery.error),
    hasData: Boolean(projectQuery.data),
    isBlocked: false,
  });

  return (
    <MethodologyWorkspaceShell
      title="Project dashboard"
      stateLabel={state}
      segments={[
        { label: "Projects", to: "/projects" },
        { label: projectQuery.data?.project.displayName ?? projectId },
      ]}
    >
      <section className="space-y-4 border border-border/80 bg-background p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
              Project overview
            </p>
            <h2 className="text-lg font-semibold tracking-[0.04em]">
              {projectQuery.data?.project.displayName ?? projectId}
            </h2>
          </div>
          <Link
            to="/projects/$projectId/pinning"
            params={{ projectId }}
            className={
              buttonVariants({ variant: "default" }) + " rounded-none uppercase tracking-[0.12em]"
            }
          >
            Open pinning workspace
            <ArrowRightIcon className="size-4" />
          </Link>
        </div>

        {projectQuery.isLoading ? <Skeleton className="h-20 w-full rounded-none" /> : null}

        {!projectQuery.isLoading && projectQuery.data ? (
          <div className="grid gap-3 border border-border/70 bg-background/30 p-3 md:grid-cols-3">
            <div className="space-y-1">
              <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                Project ID
              </p>
              <p className="break-all text-sm">{projectQuery.data.project.id}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                Created
              </p>
              <p className="text-sm">{formatTimestamp(projectQuery.data.project.createdAt)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                Last Updated
              </p>
              <p className="text-sm">{formatTimestamp(projectQuery.data.project.updatedAt)}</p>
            </div>
          </div>
        ) : null}
      </section>

      <section className="space-y-3 border border-border/80 bg-background p-4">
        <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
          Active methodology pin
        </p>

        {projectQuery.isLoading ? <Skeleton className="h-16 w-full rounded-none" /> : null}

        {!projectQuery.isLoading && projectQuery.data?.pin ? (
          <div className="grid gap-3 border border-border/70 bg-background/30 p-3 md:grid-cols-4">
            <div className="space-y-1">
              <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                Methodology
              </p>
              <p className="text-sm font-medium">{projectQuery.data.pin.methodologyKey}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                Version
              </p>
              <p className="text-sm font-medium">{projectQuery.data.pin.publishedVersion}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                Actor
              </p>
              <p className="break-all text-sm">{projectQuery.data.pin.actorId}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                Updated
              </p>
              <p className="text-sm">{formatTimestamp(projectQuery.data.pin.timestamp)}</p>
            </div>
          </div>
        ) : null}

        {!projectQuery.isLoading && !projectQuery.data?.pin ? (
          <div className="space-y-2 border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <p className="font-medium text-amber-200">No active pin found.</p>
            <p className="text-muted-foreground">
              Open the pinning workspace to choose a methodology and pin a published version.
            </p>
          </div>
        ) : null}
      </section>

      <BaselineVisibilitySection
        baselinePreview={toBaselinePreview(projectQuery.data?.baselinePreview ?? null)}
        {...(search.workUnitTypeKey !== undefined
          ? { selectedWorkUnitTypeKey: search.workUnitTypeKey }
          : {})}
        onSelectWorkUnitType={(workUnitTypeKey) => {
          navigate({
            search: {
              ...search,
              workUnitTypeKey,
            },
            replace: true,
          });
        }}
      />

      <section className="border border-border/80 bg-background p-4">
        <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">Runtime</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button aria-disabled="true" disabled variant="outline" className="rounded-none">
            Runtime Execution (Epic 3+)
          </Button>
          <p className="text-xs text-muted-foreground">{RUNTIME_DEFERRED_RATIONALE}</p>
        </div>
      </section>
    </MethodologyWorkspaceShell>
  );
}
