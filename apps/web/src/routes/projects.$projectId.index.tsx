import type {
  RuntimeGuidanceCandidateCard,
  RuntimeGuidanceStreamEnvelope,
} from "@chiron/contracts/runtime/guidance";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRightIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { RuntimeGuidanceActiveCards } from "@/components/runtime/runtime-guidance-sections";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getDeterministicState } from "@/features/methodologies/foundation";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";
import { cn } from "@/lib/utils";

const runtimeOverviewQueryKey = (projectId: string) => ["runtime-overview", projectId] as const;

export const Route = createFileRoute("/projects/$projectId/")({
  component: ProjectDashboardRoute,
});

type RuntimeStatCardProps = {
  title: string;
  value: string;
  subtitle: string;
};

function RuntimeStatCard({ title, value, subtitle }: RuntimeStatCardProps) {
  return (
    <article className="chiron-tone-runtime relative h-full overflow-hidden rounded-none border border-border/80 bg-background/95 p-4 transition-colors group-hover:border-primary/60">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-100"
        style={{
          background: [
            "linear-gradient(to bottom, color-mix(in oklab, var(--frame-bg) 92%, transparent), color-mix(in oklab, var(--frame-bg) 82%, transparent))",
            "repeating-linear-gradient(45deg, transparent, transparent 10px, color-mix(in oklab, var(--section-accent) 32%, transparent) 10px, color-mix(in oklab, var(--section-accent) 32%, transparent) 11px)",
          ].join(", "),
        }}
      />
      <div aria-hidden="true" className="absolute left-0 top-0 h-2 w-2 bg-[var(--frame-border)]" />
      <div aria-hidden="true" className="absolute right-0 top-0 h-2 w-2 bg-[var(--frame-border)]" />
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-2 w-2 bg-[var(--frame-border)]"
      />
      <div
        aria-hidden="true"
        className="absolute bottom-0 right-0 h-2 w-2 bg-[var(--frame-border)]"
      />

      <div className="relative space-y-3">
        <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
        <p className="text-2xl leading-none tracking-[0.02em]">{value}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </article>
  );
}

function formatStartedAt(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return date.toLocaleString();
}

export function ProjectDashboardRoute() {
  const { projectId } = Route.useParams();
  const { orpc } = Route.useRouteContext();
  const [candidateCards, setCandidateCards] = useState<readonly RuntimeGuidanceCandidateCard[]>([]);
  const [transitionResults, setTransitionResults] = useState<
    Record<string, { result: "available" | "blocked"; firstReason?: string }>
  >({});
  const [guidanceStreamError, setGuidanceStreamError] = useState<string | null>(null);

  const runtimeOverviewQuery = useQuery({
    ...orpc.project.getRuntimeOverview.queryOptions({
      input: { projectId },
    }),
    queryKey: runtimeOverviewQueryKey(projectId),
  });

  const runtimeGuidanceActiveQuery = useQuery({
    ...orpc.project.getRuntimeGuidanceActive.queryOptions({
      input: { projectId },
    }),
    queryKey: ["runtime-guidance-active", projectId],
  });

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const stream = (await orpc.project.streamRuntimeGuidanceCandidates.call({
          projectId,
        })) as AsyncIterable<RuntimeGuidanceStreamEnvelope>;

        for await (const event of stream) {
          if (cancelled) {
            break;
          }

          if (event.type === "bootstrap") {
            setCandidateCards(event.cards);
            setTransitionResults({});
            setGuidanceStreamError(null);
            continue;
          }

          if (event.type === "transitionResult") {
            setTransitionResults((previous) => ({
              ...previous,
              [event.candidateId]: {
                result: event.result,
                ...(event.firstReason ? { firstReason: event.firstReason } : {}),
              },
            }));
            continue;
          }

          if (event.type === "error") {
            setGuidanceStreamError(event.message);
            break;
          }
        }
      } catch (error) {
        if (!cancelled) {
          setGuidanceStreamError(error instanceof Error ? error.message : String(error));
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [orpc, projectId]);

  const state = getDeterministicState({
    isLoading: runtimeOverviewQuery.isLoading,
    hasError: Boolean(runtimeOverviewQuery.error),
    hasData: Boolean(runtimeOverviewQuery.data),
    isBlocked: false,
  });

  const runtimeOverview = runtimeOverviewQuery.data;
  const activeErrorMessage = runtimeGuidanceActiveQuery.error
    ? runtimeGuidanceActiveQuery.error instanceof Error
      ? runtimeGuidanceActiveQuery.error.message
      : String(runtimeGuidanceActiveQuery.error)
    : guidanceStreamError;

  return (
    <MethodologyWorkspaceShell
      title="Project overview"
      stateLabel={state}
      segments={[{ label: "Projects", to: "/projects" }, { label: projectId }]}
    >
      <section className="space-y-3">
        <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
          Runtime project overview
        </p>

        {runtimeOverviewQuery.isLoading ? <Skeleton className="h-36 w-full rounded-none" /> : null}

        {!runtimeOverviewQuery.isLoading && runtimeOverview ? (
          <div className="grid gap-3 md:grid-cols-3">
            <Link
              to="/projects/$projectId/facts"
              params={{ projectId }}
              search={{
                q: "",
                existence: runtimeOverview.stats.factTypesWithInstances.target.filters.existence,
                factType: "all",
              }}
              className="group block"
            >
              <RuntimeStatCard
                title="Fact types with instances"
                value={`${runtimeOverview.stats.factTypesWithInstances.current ?? 0}/${runtimeOverview.stats.factTypesWithInstances.total ?? 0}`}
                subtitle={runtimeOverview.stats.factTypesWithInstances.subtitle}
              />
            </Link>

            <Link
              to="/projects/$projectId/work-units"
              params={{ projectId }}
              search={{ q: "" }}
              className="group block"
            >
              <RuntimeStatCard
                title="Work-unit types with instances"
                value={`${runtimeOverview.stats.workUnitTypesWithInstances.current ?? 0}/${runtimeOverview.stats.workUnitTypesWithInstances.total ?? 0}`}
                subtitle={runtimeOverview.stats.workUnitTypesWithInstances.subtitle}
              />
            </Link>

            <Link
              to="/projects/$projectId/transitions"
              params={{ projectId }}
              search={{ q: "", status: "all" }}
              className="group block"
            >
              <RuntimeStatCard
                title="Active transitions"
                value={`${runtimeOverview.stats.activeTransitions.count ?? 0}`}
                subtitle={runtimeOverview.stats.activeTransitions.subtitle}
              />
            </Link>
          </div>
        ) : null}
      </section>

      <section className="chiron-tone-runtime relative overflow-hidden rounded-none border border-border/80 bg-background/95 p-4">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-100"
          style={{
            background: [
              "linear-gradient(to bottom, color-mix(in oklab, var(--frame-bg) 92%, transparent), color-mix(in oklab, var(--frame-bg) 82%, transparent))",
              "repeating-linear-gradient(45deg, transparent, transparent 10px, color-mix(in oklab, var(--section-accent) 32%, transparent) 10px, color-mix(in oklab, var(--section-accent) 32%, transparent) 11px)",
            ].join(", "),
          }}
        />
        <div
          aria-hidden="true"
          className="absolute left-0 top-0 h-2 w-2 bg-[var(--frame-border)]"
        />
        <div
          aria-hidden="true"
          className="absolute right-0 top-0 h-2 w-2 bg-[var(--frame-border)]"
        />
        <div
          aria-hidden="true"
          className="absolute bottom-0 left-0 h-2 w-2 bg-[var(--frame-border)]"
        />
        <div
          aria-hidden="true"
          className="absolute bottom-0 right-0 h-2 w-2 bg-[var(--frame-border)]"
        />

        <div className="relative space-y-4">
          <RuntimeGuidanceActiveCards
            projectId={projectId}
            activeCards={runtimeGuidanceActiveQuery.data?.activeWorkUnitCards ?? []}
            activeLoading={runtimeGuidanceActiveQuery.isLoading}
            activeErrorMessage={activeErrorMessage}
            candidateCards={candidateCards}
            transitionResults={transitionResults}
            sectionId="project-dashboard-active-guidance"
            title="Active guidance"
            emptyMessage="No active transitions right now."
          />

          {!runtimeGuidanceActiveQuery.isLoading && runtimeOverview?.activeWorkflows.length ? (
            <div className="border border-border/70 bg-background/40 px-3 py-2 text-xs text-muted-foreground">
              {runtimeOverview.activeWorkflows.length} workflow execution
              {runtimeOverview.activeWorkflows.length === 1 ? "" : "s"} active. Most recent start{" "}
              {formatStartedAt(runtimeOverview.activeWorkflows[0]?.startedAt ?? "")}
            </div>
          ) : null}

          <div className="border-t border-border/80 pt-4">
            <Link
              to="/projects/$projectId/transitions"
              params={{ projectId }}
              search={{ q: "", status: "all" }}
              className={cn(
                buttonVariants({ variant: "default", size: "lg" }),
                "w-full justify-between rounded-none text-[0.72rem] uppercase tracking-[0.14em]",
              )}
            >
              Go to Guidance
              <ArrowRightIcon className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </MethodologyWorkspaceShell>
  );
}
