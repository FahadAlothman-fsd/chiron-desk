import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, Outlet, createFileRoute, useLocation, useNavigate } from "@tanstack/react-router";

import { Button, buttonVariants } from "@/components/ui/button";
import { buildNextDraftInput } from "@/features/methodologies/commands";
import {
  RUNTIME_DEFERRED_RATIONALE,
  selectLatestDraft,
  type MethodologyDetails,
} from "@/features/methodologies/foundation";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";

export const Route = createFileRoute("/methodologies/$methodologyId/versions")({
  component: MethodologyVersionsRoute,
});

function MethodologyVersionsRoute() {
  const { methodologyId } = Route.useParams();
  const { orpc, queryClient } = Route.useRouteContext();
  const location = useLocation();
  const navigate = useNavigate();

  const versionsPath = `/methodologies/${methodologyId}/versions`;

  const listQueryOptions = orpc.methodology.listMethodologies.queryOptions();
  const detailsQueryOptions = orpc.methodology.getMethodologyDetails.queryOptions({
    input: { methodologyKey: methodologyId },
  });

  const detailsQuery = useQuery(detailsQueryOptions);
  const createDraftMutation = useMutation(
    orpc.methodology.createDraftVersion.mutationOptions({
      onSuccess: async (result) => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: listQueryOptions.queryKey }),
          queryClient.invalidateQueries({ queryKey: detailsQueryOptions.queryKey }),
        ]);

        void navigate({
          to: "/methodologies/$methodologyId/versions/$versionId",
          params: {
            methodologyId,
            versionId: result.version.id,
          },
        });
      },
    }),
  );

  const details = (detailsQuery.data as MethodologyDetails | undefined) ?? null;
  const latestDraft = details ? selectLatestDraft(details.versions) : null;

  if (location.pathname !== versionsPath) {
    return <Outlet />;
  }

  return (
    <MethodologyWorkspaceShell
      title="Methodology Versions"
      stateLabel={detailsQuery.isLoading ? "loading" : detailsQuery.isError ? "failed" : "success"}
      segments={[
        { label: "Methodologies", to: "/methodologies" },
        { label: methodologyId, to: "/methodologies/$methodologyId", params: { methodologyId } },
        { label: "Versions" },
      ]}
    >
      {detailsQuery.isLoading ? <p className="text-sm">Loading versions...</p> : null}
      {detailsQuery.isError ? (
        <p className="text-sm">State: failed - Unable to load versions.</p>
      ) : null}

      {details ? (
        <>
          <section className="border border-border/80 bg-background p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                  Draft Controls
                </p>
                <h2 className="mt-1 text-lg font-semibold uppercase tracking-[0.08em]">
                  {details.displayName}
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-none"
                  disabled={createDraftMutation.isPending}
                  onClick={() => {
                    createDraftMutation.mutate(buildNextDraftInput(details, methodologyId));
                  }}
                >
                  {createDraftMutation.isPending ? "Creating Draft..." : "Create Draft"}
                </Button>

                <Button
                  size="sm"
                  className="rounded-none"
                  disabled={!latestDraft}
                  onClick={() => {
                    if (!latestDraft) {
                      return;
                    }

                    void navigate({
                      to: "/methodologies/$methodologyId/versions/$versionId",
                      params: {
                        methodologyId,
                        versionId: latestDraft.id,
                      },
                    });
                  }}
                >
                  Open Existing Draft
                </Button>
              </div>
            </div>
          </section>

          <section className="border border-border/80 bg-background">
            <div className="border-b border-border/80 px-4 py-3">
              <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                Version Ledger
              </p>
            </div>
            <ul className="space-y-2 p-4">
              {details.versions.map((version) => (
                <li key={version.id} className="border border-border/70 p-3 text-sm">
                  <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-center">
                    <p>
                      {version.displayName} ({version.version}) - {version.status}
                    </p>
                    <Link
                      to="/methodologies/$methodologyId/versions/$versionId"
                      params={{ methodologyId, versionId: version.id }}
                      className={buttonVariants({ size: "sm", variant: "outline" })}
                    >
                      Open Workspace Entry
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="border border-border/80 bg-background p-4">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
              Runtime
            </p>
            <div className="mt-3 flex items-center gap-3">
              <Button aria-disabled="true" disabled variant="outline" className="rounded-none">
                Runtime Execution (Epic 3+)
              </Button>
              <p className="text-xs text-muted-foreground">{RUNTIME_DEFERRED_RATIONALE}</p>
            </div>
          </section>
        </>
      ) : null}
    </MethodologyWorkspaceShell>
  );
}
