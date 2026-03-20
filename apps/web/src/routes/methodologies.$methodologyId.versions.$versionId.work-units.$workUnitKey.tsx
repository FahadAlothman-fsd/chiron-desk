import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { buttonVariants } from "@/components/ui/button";
import { OverviewTab } from "@/features/methodologies/work-unit-l2/OverviewTab";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";

export const Route = createFileRoute(
  "/methodologies/$methodologyId/versions/$versionId/work-units/$workUnitKey",
)({
  validateSearch: (search) =>
    z
      .object({
        tab: z
          .enum(["overview", "facts", "workflows", "state-machine", "artifact-slots"])
          .optional(),
      })
      .parse(search),
  component: MethodologyVersionWorkUnitDetailsRoute,
});

export function MethodologyVersionWorkUnitDetailsRoute() {
  const { methodologyId, versionId, workUnitKey } = Route.useParams();
  const search = Route.useSearch();
  const tab = search.tab ?? "overview";
  const { orpc } = Route.useRouteContext();

  const draftQuery = useQuery(
    orpc.methodology.version.workUnit.get.queryOptions({
      input: { versionId },
    }),
  );

  const workUnitTypes = Array.isArray(
    (draftQuery.data as { workUnitTypes?: ReadonlyArray<{ key?: string }> } | undefined)
      ?.workUnitTypes,
  )
    ? ((draftQuery.data as { workUnitTypes?: ReadonlyArray<{ key?: string }> }).workUnitTypes ?? [])
    : [];
  const hasMatchingWorkUnit = workUnitTypes.some((workUnit) => workUnit?.key === workUnitKey);
  const hasResolvedInvalidSelection =
    !draftQuery.isLoading && !draftQuery.isError && !hasMatchingWorkUnit;

  const selectedWorkUnit = workUnitTypes.find((workUnit) => workUnit?.key === workUnitKey) as
    | {
        key?: string;
        factSchemas?: unknown[];
        workflows?: unknown[];
        lifecycle?: { states?: unknown[]; transitions?: unknown[] };
        artifactSlots?: unknown[];
      }
    | undefined;

  const factsCount = Array.isArray(selectedWorkUnit?.factSchemas)
    ? selectedWorkUnit.factSchemas.length
    : 0;
  const workflowsCount = Array.isArray(selectedWorkUnit?.workflows)
    ? selectedWorkUnit.workflows.length
    : 0;
  const statesCount = Array.isArray(selectedWorkUnit?.lifecycle?.states)
    ? selectedWorkUnit.lifecycle.states.length
    : 0;
  const transitionsCount = Array.isArray(selectedWorkUnit?.lifecycle?.transitions)
    ? selectedWorkUnit.lifecycle.transitions.length
    : 0;
  const artifactSlotsCount = Array.isArray(selectedWorkUnit?.artifactSlots)
    ? selectedWorkUnit.artifactSlots.length
    : 0;

  return (
    <MethodologyWorkspaceShell
      title={`Work Unit · ${workUnitKey}`}
      stateLabel={
        draftQuery.isLoading
          ? "loading"
          : draftQuery.isError || hasResolvedInvalidSelection
            ? "failed"
            : "success"
      }
      segments={[
        { label: "Methodologies", to: "/methodologies" },
        { label: methodologyId, to: "/methodologies/$methodologyId", params: { methodologyId } },
        {
          label: "Versions",
          to: "/methodologies/$methodologyId/versions",
          params: { methodologyId },
        },
        {
          label: versionId,
          to: "/methodologies/$methodologyId/versions/$versionId",
          params: { methodologyId, versionId },
        },
        {
          label: "Work Units",
          to: "/methodologies/$methodologyId/versions/$versionId/work-units",
          params: { methodologyId, versionId },
        },
        { label: workUnitKey },
      ]}
    >
      <section className="chiron-frame-flat chiron-tone-navigation p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["overview", "Overview"],
                ["facts", "Facts"],
                ["workflows", "Workflows"],
                ["state-machine", "State Machine"],
                ["artifact-slots", "Artifact Slots"],
              ] as const
            ).map(([key, label]) => (
              <Link
                key={key}
                to="/methodologies/$methodologyId/versions/$versionId/work-units/$workUnitKey"
                params={{ methodologyId, versionId, workUnitKey }}
                search={{ tab: key }}
                className={buttonVariants({
                  size: "sm",
                  variant: tab === key ? "default" : "outline",
                })}
              >
                {label}
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap gap-2" />
        </div>
      </section>

      {draftQuery.isError || hasResolvedInvalidSelection ? (
        <section className="grid gap-3 lg:grid-cols-[2fr_1fr]">
          <div className="chiron-frame-flat p-3">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
              Overview
            </p>
            <p className="mt-2 text-sm">
              State: failed - Unable to load work-unit details while preserving selected context.
            </p>
          </div>

          <div className="chiron-frame-flat p-3">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
              Selection Summary
            </p>
            <p className="mt-2 text-sm">Methodology: {methodologyId}</p>
            <p className="text-sm">Version: {versionId}</p>
            <p className="text-sm">Work Unit: {workUnitKey}</p>
          </div>
        </section>
      ) : tab === "overview" ? (
        <OverviewTab
          factsCount={factsCount}
          workflowsCount={workflowsCount}
          statesCount={statesCount}
          transitionsCount={transitionsCount}
          artifactSlotsCount={artifactSlotsCount}
        />
      ) : (
        <section className="grid gap-3 lg:grid-cols-[2fr_1fr]">
          <div className="chiron-frame-flat p-3">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
              {tab} Surface
            </p>
            {draftQuery.isLoading ? (
              <p className="mt-2 text-sm">Loading work-unit details...</p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                L2 detail shell is active for deterministic Story 3.1 baseline.
              </p>
            )}
          </div>

          <div className="chiron-frame-flat p-3">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
              Selection Summary
            </p>
            <p className="mt-2 text-sm">Methodology: {methodologyId}</p>
            <p className="text-sm">Version: {versionId}</p>
            <p className="text-sm">Work Unit: {workUnitKey}</p>
          </div>
        </section>
      )}
    </MethodologyWorkspaceShell>
  );
}
