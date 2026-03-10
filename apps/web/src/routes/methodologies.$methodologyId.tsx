import { useQuery } from "@tanstack/react-query";
import { Link, Outlet, createFileRoute, useLocation } from "@tanstack/react-router";
import { useMemo } from "react";

import { buttonVariants } from "@/components/ui/button";
import { selectLatestDraft, type MethodologyDetails } from "@/features/methodologies/foundation";
import {
  MethodologyFactsInventory,
  parseMethodologyFacts,
} from "@/features/methodologies/methodology-facts";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";

export const Route = createFileRoute("/methodologies/$methodologyId")({
  component: MethodologyDetailsRoute,
});

export function MethodologyDetailsRoute() {
  const { methodologyId } = Route.useParams();
  const { orpc } = Route.useRouteContext();
  const location = useLocation();

  const detailsPath = `/methodologies/${methodologyId}`;

  const detailsQueryOptions = orpc.methodology.getMethodologyDetails.queryOptions({
    input: { methodologyKey: methodologyId },
  });

  const detailsQuery = useQuery(detailsQueryOptions);
  const details = (detailsQuery.data as MethodologyDetails | undefined) ?? null;
  const latestDraft = details ? selectLatestDraft(details.versions) : null;
  const inventoryVersionId = latestDraft?.id ?? details?.versions[0]?.id ?? null;
  const factsEditorTargetVersionId = latestDraft?.id ?? null;
  const inventoryQueryOptions = orpc.methodology.getDraftProjection.queryOptions({
    input: { versionId: inventoryVersionId ?? "" },
  });
  const inventoryQuery = useQuery({
    ...inventoryQueryOptions,
    enabled: inventoryVersionId !== null,
  });
  const inventoryFacts = useMemo(() => {
    const factDefinitions = (inventoryQuery.data as { factDefinitions?: unknown[] } | undefined)
      ?.factDefinitions;
    return parseMethodologyFacts(JSON.stringify(factDefinitions ?? []));
  }, [inventoryQuery.data]);

  if (location.pathname !== detailsPath) {
    return <Outlet />;
  }

  return (
    <MethodologyWorkspaceShell
      title="Methodology Details"
      stateLabel={detailsQuery.isLoading ? "loading" : detailsQuery.isError ? "failed" : "success"}
      segments={[{ label: "Methodologies", to: "/methodologies" }, { label: methodologyId }]}
    >
      {detailsQuery.isLoading ? <p className="text-sm">Loading methodology details...</p> : null}
      {detailsQuery.isError ? (
        <p className="text-sm">State: failed - Unable to load details.</p>
      ) : null}

      {details ? (
        <>
          <section className="border border-border/80 bg-background p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                  Fact Inventory
                </p>
                <h2 className="mt-2 text-xl font-semibold uppercase tracking-[0.08em]">
                  {details.displayName}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {latestDraft
                    ? `Viewing draft inventory from ${latestDraft.displayName}.`
                    : "Viewing the latest methodology fact contract."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  to="/methodologies/$methodologyId/versions/$versionId/facts"
                  params={{ methodologyId, versionId: factsEditorTargetVersionId ?? "" }}
                  className={buttonVariants({ size: "sm", variant: "outline" })}
                  disabled={!factsEditorTargetVersionId}
                >
                  Open Facts Editor
                </Link>
                <Link
                  to="/methodologies/$methodologyId/versions"
                  params={{ methodologyId }}
                  className={buttonVariants({ size: "sm", variant: "outline" })}
                >
                  Open Versions
                </Link>
              </div>
            </div>

            <div className="mt-4">
              <MethodologyFactsInventory
                facts={inventoryFacts}
                emptyLabel="No methodology facts have been authored for this methodology yet."
                showActions={false}
              />
            </div>
          </section>
        </>
      ) : null}
    </MethodologyWorkspaceShell>
  );
}
