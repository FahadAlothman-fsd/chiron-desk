import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, Outlet, createFileRoute, useLocation } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";

import { DataGrid } from "@/components/data-grid";
import { Button, buttonVariants } from "@/components/ui/button";
import { buildNextDraftInput } from "@/features/methodologies/commands";
import { selectLatestDraft, type MethodologyDetails } from "@/features/methodologies/foundation";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";

export const Route = createFileRoute("/methodologies/$methodologyId")({
  component: MethodologyDetailsRoute,
});

export function MethodologyDetailsRoute() {
  const { methodologyId } = Route.useParams();
  const navigate = Route.useNavigate();
  const { orpc, queryClient } = Route.useRouteContext();
  const location = useLocation();

  const detailsPath = `/methodologies/${methodologyId}`;

  const detailsQueryOptions = orpc.methodology.getMethodologyDetails.queryOptions({
    input: { methodologyKey: methodologyId },
  });
  const listQueryOptions = orpc.methodology.listMethodologies.queryOptions();

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
  const latestActive =
    details?.versions.find((version) => version.status === "active") ??
    details?.versions.find((version) => version.status === "published") ??
    null;

  const ledgerRows =
    details?.versions.map((version) => {
      const pinnedProjectCount =
        "pinnedProjectCount" in version && typeof version.pinnedProjectCount === "number"
          ? version.pinnedProjectCount
          : 0;
      const isEditable =
        "isEditable" in version && typeof version.isEditable === "boolean"
          ? version.isEditable
          : version.status !== "archived";
      const editabilityReason =
        "editabilityReason" in version && typeof version.editabilityReason === "string"
          ? version.editabilityReason
          : isEditable
            ? "editable"
            : version.status === "archived"
              ? "archived"
              : "pinned";

      return {
        ...version,
        pinnedProjectCount,
        isEditable,
        editabilityReason,
      };
    }) ?? [];

  const lifecycleClass = (status: string) => {
    switch (status) {
      case "draft":
        return "border-amber-500/60 bg-amber-500/10 text-amber-700 dark:text-amber-300";
      case "active":
      case "published":
        return "border-emerald-500/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
      case "archived":
        return "border-zinc-500/60 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300";
      default:
        return "border-border/80 bg-muted/40 text-foreground";
    }
  };

  const columns: ColumnDef<(typeof ledgerRows)[number]>[] = [
    {
      accessorKey: "displayName",
      header: "Display Name",
    },
    {
      accessorKey: "version",
      header: "Version",
    },
    {
      id: "lifecycle",
      header: "Lifecycle",
      cell: ({ row }) => (
        <span
          className={`inline-flex rounded-none border px-2 py-1 text-xs ${lifecycleClass(row.original.status)}`}
        >
          {row.original.status === "active"
            ? "Active"
            : row.original.status === "draft"
              ? "Draft"
              : row.original.status}
        </span>
      ),
    },
    {
      id: "editability",
      header: "Editability",
      cell: ({ row }) => {
        if (row.original.isEditable) {
          return <span className="text-xs">Editable</span>;
        }
        if (row.original.editabilityReason === "pinned") {
          return <span className="text-xs text-muted-foreground">Pinned by active projects</span>;
        }
        return <span className="text-xs text-muted-foreground">Archived</span>;
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/methodologies/$methodologyId/versions/$versionId"
            params={{ methodologyId, versionId: row.original.id }}
            search={{ page: row.original.status === "draft" ? undefined : "review" }}
            className={buttonVariants({ size: "sm", variant: "outline" })}
          >
            Open
          </Link>
          <Button
            size="sm"
            variant="outline"
            className="rounded-none"
            disabled={!row.original.isEditable}
          >
            {row.original.isEditable ? "Edit version" : "Locked"}
          </Button>
        </div>
      ),
    },
  ];

  const totalVersions = details?.versions.length ?? 0;

  if (location.pathname !== detailsPath) {
    return <Outlet />;
  }

  return (
    <MethodologyWorkspaceShell
      title="Methodology Dashboard"
      stateLabel={detailsQuery.isLoading ? "loading" : detailsQuery.isError ? "failed" : "success"}
      segments={[{ label: "Methodologies", to: "/methodologies" }, { label: methodologyId }]}
    >
      {detailsQuery.isLoading ? <p className="text-sm">Loading methodology dashboard...</p> : null}
      {detailsQuery.isError ? (
        <p className="text-sm">State: failed - Unable to load details.</p>
      ) : null}

      {details ? (
        <>
          <section className="grid gap-3 md:grid-cols-3">
            <article className="border border-border/80 bg-background p-4">
              <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                Latest Active Version
              </p>
              <p className="mt-2 text-sm font-medium">
                {latestActive ? `${latestActive.displayName} (${latestActive.version})` : "None"}
              </p>
            </article>
            <article className="border border-border/80 bg-background p-4">
              <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                Latest Draft Version
              </p>
              <p className="mt-2 text-sm font-medium">
                {latestDraft ? `${latestDraft.displayName} (${latestDraft.version})` : "None"}
              </p>
            </article>
            <article className="border border-border/80 bg-background p-4">
              <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                Total Versions
              </p>
              <p className="mt-2 text-2xl font-semibold">{totalVersions}</p>
            </article>
          </section>

          <section className="border border-border/80 bg-background">
            <div className="border-b border-border/80 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                  Version Ledger
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
                        params: {
                          methodologyId,
                          versionId: latestDraft.id,
                        },
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
                    Versions Index (Compat)
                  </Link>
                </div>
              </div>
            </div>
            <div className="p-4">
              <DataGrid columns={columns} data={ledgerRows} emptyLabel="No versions found." />
            </div>
          </section>
        </>
      ) : null}
    </MethodologyWorkspaceShell>
  );
}
