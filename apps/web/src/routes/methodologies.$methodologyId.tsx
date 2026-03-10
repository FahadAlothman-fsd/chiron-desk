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

export const Route = createFileRoute("/methodologies/$methodologyId")({
  component: MethodologyDetailsRoute,
});

export function MethodologyDetailsRoute() {
  const { methodologyId } = Route.useParams();
  const { orpc, queryClient } = Route.useRouteContext();
  const location = useLocation();
  const navigate = useNavigate();

  const detailsPath = `/methodologies/${methodologyId}`;

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
          params: { methodologyId, versionId: result.version.id },
        });
      },
    }),
  );

  const details = (detailsQuery.data as MethodologyDetails | undefined) ?? null;
  const latestDraft = details ? selectLatestDraft(details.versions) : null;

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
          <section className="grid gap-4 border border-border/80 bg-background p-4 md:grid-cols-[2fr_1fr]">
            <div>
              <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                Metadata
              </p>
              <h2 className="mt-2 text-xl font-semibold uppercase tracking-[0.08em]">
                {details.displayName}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">{details.methodologyKey}</p>
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              <dt className="text-muted-foreground">Created</dt>
              <dd className="text-right">{details.createdAt}</dd>
              <dt className="text-muted-foreground">Updated</dt>
              <dd className="text-right">{details.updatedAt}</dd>
              <dt className="text-muted-foreground">Versions</dt>
              <dd className="text-right">{details.versions.length}</dd>
            </dl>
          </section>

          <section className="border border-border/80 bg-background p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                Quick Actions
              </p>
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
                      params: { methodologyId, versionId: latestDraft.id },
                    });
                  }}
                >
                  Open Existing Draft
                </Button>
                <Link
                  to="/methodologies/$methodologyId/versions"
                  params={{ methodologyId }}
                  className={buttonVariants({ size: "sm", variant: "outline" })}
                >
                  Open Versions
                </Link>
              </div>
            </div>

            <div className="mt-3 text-xs text-muted-foreground">
              Manage version history from the dedicated Versions page.
            </div>
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
