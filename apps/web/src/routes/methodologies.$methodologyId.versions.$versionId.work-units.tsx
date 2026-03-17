import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";

export const Route = createFileRoute(
  "/methodologies/$methodologyId/versions/$versionId/work-units",
)({
  validateSearch: (search) =>
    z
      .object({
        intent: z.enum(["add-work-unit"]).optional(),
      })
      .parse(search),
  component: MethodologyVersionWorkUnitsRoute,
});

export function MethodologyVersionWorkUnitsRoute() {
  const { methodologyId, versionId } = Route.useParams();
  const search = Route.useSearch();
  const { orpc } = Route.useRouteContext();

  const detailsQuery = useQuery(
    orpc.methodology.getMethodologyDetails.queryOptions({
      input: { methodologyKey: methodologyId },
    }),
  );

  const draftQuery = useQuery(
    orpc.methodology.getDraftProjection.queryOptions({
      input: { versionId },
    }),
  );

  const workUnits = ((
    draftQuery.data as
      | { workUnitTypes?: ReadonlyArray<{ key?: string; displayName?: string }> }
      | undefined
  )?.workUnitTypes ?? []) as ReadonlyArray<{ key?: string; displayName?: string }>;

  return (
    <MethodologyWorkspaceShell
      title="Work Units"
      stateLabel={
        draftQuery.isLoading || detailsQuery.isLoading
          ? "loading"
          : draftQuery.isError || detailsQuery.isError
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
        { label: "Work Units" },
      ]}
    >
      <section className="chiron-frame-flat chiron-tone-navigation p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {(["Graph", "Contracts", "Diagnostics"] as const).map((tab) => (
              <Button
                key={tab}
                size="sm"
                variant={tab === "Graph" ? "default" : "outline"}
                className="rounded-none"
              >
                {tab}
              </Button>
            ))}
          </div>
          <Button size="sm" className="rounded-none">
            + Add Work Unit
          </Button>
        </div>
        {search.intent === "add-work-unit" ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Add Work Unit requested from command palette. Use + Add Work Unit to continue the
            deterministic create flow.
          </p>
        ) : null}
      </section>

      {draftQuery.isLoading ? (
        <p className="text-sm">Loading work-unit shells for this version...</p>
      ) : null}
      {draftQuery.isError ? (
        <p className="text-sm">
          State: failed - Unable to load work-unit shells. Current methodology/version scope is
          preserved.
        </p>
      ) : null}

      {!draftQuery.isLoading && !draftQuery.isError ? (
        <section className="grid gap-3 lg:grid-cols-[2fr_1fr_1fr]">
          <div className="chiron-frame-flat p-3">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
              Graph Canvas (Locked Shell)
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Graph interactions remain design-time baseline for Story 3.1.
            </p>
          </div>

          <div className="chiron-frame-flat p-3">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
              Searchable List
            </p>
            <div className="mt-2 space-y-2">
              {workUnits.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No work units yet. Add one to start defining design-time structure.
                </p>
              ) : (
                workUnits.map((unit, index) => {
                  const workUnitKey = unit?.key ?? `work-unit-${index + 1}`;
                  const workUnitLabel = unit?.displayName ?? workUnitKey;

                  return (
                    <div key={workUnitKey} className="border border-border/70 p-2 text-sm">
                      <p className="font-medium">{workUnitLabel}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Link
                          className="underline"
                          to="/methodologies/$methodologyId/versions/$versionId/work-units/$workUnitKey"
                          params={{ methodologyId, versionId, workUnitKey }}
                        >
                          Open details
                        </Link>
                        <button type="button" className="underline">
                          Open Relationship View
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="chiron-frame-flat p-3">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
              Selected Summary
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Select a work unit from the list to anchor L2 details context.
            </p>
          </div>
        </section>
      ) : null}
    </MethodologyWorkspaceShell>
  );
}
