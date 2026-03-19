import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Link, Outlet, createFileRoute, useLocation } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangleIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [isCreateDraftDialogOpen, setIsCreateDraftDialogOpen] = useState(false);
  const [isVersionEditDialogOpen, setIsVersionEditDialogOpen] = useState(false);
  const [isVersionArchiveDialogOpen, setIsVersionArchiveDialogOpen] = useState(false);
  const [nextDraftDisplayName, setNextDraftDisplayName] = useState("");
  const [nextDraftVersion, setNextDraftVersion] = useState("");
  const [nextDraftSeed, setNextDraftSeed] = useState<ReturnType<typeof buildNextDraftInput> | null>(
    null,
  );
  const [nextDisplayName, setNextDisplayName] = useState("");
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [nextVersionDisplayName, setNextVersionDisplayName] = useState("");
  const [nextVersionTag, setNextVersionTag] = useState("");
  const createDraftMutation = useMutation(
    orpc.methodology.version.create.mutationOptions({
      onSuccess: async (result) => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: listQueryOptions.queryKey }),
          queryClient.invalidateQueries({ queryKey: detailsQueryOptions.queryKey }),
        ]);

        toast.success("Draft created");
        setIsCreateDraftDialogOpen(false);
        setNextDraftSeed(null);

        const versionId =
          typeof result === "object" &&
          result !== null &&
          "version" in result &&
          typeof result.version === "object" &&
          result.version !== null &&
          "id" in result.version &&
          typeof result.version.id === "string"
            ? result.version.id
            : null;

        if (!versionId) {
          return;
        }

        void navigate({
          to: "/methodologies/$methodologyId/versions/$versionId",
          params: { methodologyId, versionId },
        });
      },
    }),
  );
  const updateCatalogMutation = useMutation(
    orpc.methodology.catalog.update.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: listQueryOptions.queryKey }),
          queryClient.invalidateQueries({ queryKey: detailsQueryOptions.queryKey }),
        ]);
        setIsEditDialogOpen(false);
        toast.success("Methodology updated");
      },
    }),
  );
  const archiveCatalogMutation = useMutation(
    orpc.methodology.catalog.delete.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: listQueryOptions.queryKey }),
          queryClient.invalidateQueries({ queryKey: detailsQueryOptions.queryKey }),
        ]);
        setIsArchiveDialogOpen(false);
        toast.success("Methodology archived");
        void navigate({ to: "/methodologies" });
      },
    }),
  );
  const updateVersionMetadataMutation = useMutation(
    orpc.methodology.version.updateMeta.mutationOptions({
      onSuccess: async () => {
        setIsVersionEditDialogOpen(false);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: listQueryOptions.queryKey }),
          queryClient.invalidateQueries({ queryKey: detailsQueryOptions.queryKey }),
        ]);
        toast.success("Version updated");
      },
    }),
  );
  const archiveVersionMutation = useMutation(
    orpc.methodology.version.archive.mutationOptions({
      onSuccess: async () => {
        setIsVersionArchiveDialogOpen(false);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: listQueryOptions.queryKey }),
          queryClient.invalidateQueries({ queryKey: detailsQueryOptions.queryKey }),
        ]);
        toast.success("Version archived");
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
            onClick={() => {
              if (!row.original.isEditable) {
                return;
              }
              setSelectedVersionId(row.original.id);
              setNextVersionDisplayName(row.original.displayName);
              setNextVersionTag(row.original.version);
              setIsVersionEditDialogOpen(true);
            }}
          >
            {row.original.isEditable ? "Edit version" : "Locked"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-none"
            disabled={!row.original.isEditable}
            onClick={() => {
              if (!row.original.isEditable) {
                return;
              }
              setSelectedVersionId(row.original.id);
              setIsVersionArchiveDialogOpen(true);
            }}
          >
            Archive version
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
                    onClick={() => {
                      setNextDisplayName(details.displayName);
                      setIsEditDialogOpen(true);
                    }}
                  >
                    Edit Methodology
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-none"
                    onClick={() => {
                      setIsArchiveDialogOpen(true);
                    }}
                  >
                    Archive Methodology
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-none"
                    disabled={createDraftMutation.isPending}
                    onClick={() => {
                      const seedInput = buildNextDraftInput(details, methodologyId);
                      setNextDraftSeed(seedInput);
                      setNextDraftDisplayName(seedInput.displayName);
                      setNextDraftVersion(seedInput.version);
                      setIsCreateDraftDialogOpen(true);
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

          <DialogPrimitive.Root open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogPrimitive.Portal>
              <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[1px]" />
              <DialogPrimitive.Popup className="fixed top-1/2 left-1/2 z-50 w-[min(92vw,30rem)] -translate-x-1/2 -translate-y-1/2 border border-border/80 bg-background p-4 shadow-lg">
                <DialogPrimitive.Title className="text-sm font-semibold uppercase tracking-[0.12em]">
                  Edit Methodology
                </DialogPrimitive.Title>
                <form
                  className="mt-4 grid gap-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    updateCatalogMutation.mutate({
                      displayName: nextDisplayName.trim(),
                      methodologyKey: methodologyId,
                    });
                  }}
                >
                  <label
                    htmlFor="methodology-display-name-input"
                    className="space-y-1 text-xs uppercase tracking-[0.14em] text-muted-foreground"
                  >
                    Display Name
                    <input
                      id="methodology-display-name-input"
                      value={nextDisplayName}
                      onChange={(event) => setNextDisplayName(event.target.value)}
                      className="flex h-10 w-full rounded-none border border-input bg-background px-3 py-2 text-sm"
                    />
                  </label>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-none"
                      onClick={() => setIsEditDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="rounded-none"
                      disabled={updateCatalogMutation.isPending}
                    >
                      Save Changes
                    </Button>
                  </div>
                </form>
              </DialogPrimitive.Popup>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>

          <DialogPrimitive.Root open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
            <DialogPrimitive.Portal>
              <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[1px]" />
              <DialogPrimitive.Popup className="fixed top-1/2 left-1/2 z-50 w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2 border border-border/80 bg-background p-4 shadow-lg">
                <DialogPrimitive.Title className="text-sm font-semibold uppercase tracking-[0.12em]">
                  Archive Methodology
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="mt-2 text-sm text-muted-foreground">
                  This hides the methodology from the default catalog without deleting its versions.
                </DialogPrimitive.Description>
                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-none"
                    onClick={() => setIsArchiveDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="rounded-none"
                    disabled={archiveCatalogMutation.isPending}
                    onClick={() => archiveCatalogMutation.mutate({ methodologyKey: methodologyId })}
                  >
                    Confirm Archive
                  </Button>
                </div>
              </DialogPrimitive.Popup>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>

          <DialogPrimitive.Root
            open={isCreateDraftDialogOpen}
            onOpenChange={(open) => {
              setIsCreateDraftDialogOpen(open);
              if (!open) {
                setNextDraftSeed(null);
              }
            }}
          >
            <DialogPrimitive.Portal>
              <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[1px]" />
              <DialogPrimitive.Popup className="fixed top-1/2 left-1/2 z-50 w-[min(92vw,30rem)] -translate-x-1/2 -translate-y-1/2 border border-border/80 bg-background p-4 shadow-lg">
                <DialogPrimitive.Title className="text-sm font-semibold uppercase tracking-[0.12em]">
                  Create Draft Version
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="mt-2 text-sm text-muted-foreground">
                  Confirm naming for the next draft before creating the version snapshot.
                </DialogPrimitive.Description>
                <form
                  className="mt-4 grid gap-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!nextDraftSeed) {
                      return;
                    }

                    createDraftMutation.mutate({
                      ...nextDraftSeed,
                      displayName: nextDraftDisplayName.trim() || nextDraftSeed.displayName,
                      version: nextDraftVersion.trim() || nextDraftSeed.version,
                    });
                  }}
                >
                  <label
                    htmlFor="draft-display-name-input"
                    className="space-y-1 text-xs uppercase tracking-[0.14em] text-muted-foreground"
                  >
                    Draft Display Name
                    <input
                      id="draft-display-name-input"
                      value={nextDraftDisplayName}
                      onChange={(event) => setNextDraftDisplayName(event.target.value)}
                      className="flex h-10 w-full rounded-none border border-input bg-background px-3 py-2 text-sm"
                    />
                  </label>
                  <label
                    htmlFor="draft-version-input"
                    className="space-y-1 text-xs uppercase tracking-[0.14em] text-muted-foreground"
                  >
                    Draft Version
                    <input
                      id="draft-version-input"
                      value={nextDraftVersion}
                      onChange={(event) => setNextDraftVersion(event.target.value)}
                      className="flex h-10 w-full rounded-none border border-input bg-background px-3 py-2 text-sm"
                    />
                  </label>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-none"
                      onClick={() => {
                        setIsCreateDraftDialogOpen(false);
                        setNextDraftSeed(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="rounded-none"
                      disabled={createDraftMutation.isPending || !nextDraftSeed}
                    >
                      Create Draft Version
                    </Button>
                  </div>
                </form>
              </DialogPrimitive.Popup>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>

          <DialogPrimitive.Root
            open={isVersionEditDialogOpen}
            onOpenChange={setIsVersionEditDialogOpen}
          >
            <DialogPrimitive.Portal>
              <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[1px]" />
              <DialogPrimitive.Popup className="fixed top-1/2 left-1/2 z-50 w-[min(92vw,30rem)] -translate-x-1/2 -translate-y-1/2 border border-border/80 bg-background p-4 shadow-lg">
                <DialogPrimitive.Title className="text-sm font-semibold uppercase tracking-[0.12em]">
                  Edit Version
                </DialogPrimitive.Title>
                <form
                  className="mt-4 grid gap-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    updateVersionMetadataMutation.mutate({
                      versionId: selectedVersionId,
                      displayName: nextVersionDisplayName.trim(),
                      version: nextVersionTag.trim(),
                    });
                  }}
                >
                  <label
                    htmlFor="version-display-name-input"
                    className="space-y-1 text-xs uppercase tracking-[0.14em] text-muted-foreground"
                  >
                    Version Display Name
                    <input
                      id="version-display-name-input"
                      value={nextVersionDisplayName}
                      onChange={(event) => setNextVersionDisplayName(event.target.value)}
                      className="flex h-10 w-full rounded-none border border-input bg-background px-3 py-2 text-sm"
                    />
                  </label>
                  <label
                    htmlFor="version-tag-input"
                    className="space-y-1 text-xs uppercase tracking-[0.14em] text-muted-foreground"
                  >
                    Version Tag
                    <input
                      id="version-tag-input"
                      value={nextVersionTag}
                      onChange={(event) => setNextVersionTag(event.target.value)}
                      className="flex h-10 w-full rounded-none border border-input bg-background px-3 py-2 text-sm"
                    />
                  </label>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-none"
                      onClick={() => setIsVersionEditDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="rounded-none"
                      disabled={updateVersionMetadataMutation.isPending}
                    >
                      Save Version
                    </Button>
                  </div>
                </form>
              </DialogPrimitive.Popup>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>

          <DialogPrimitive.Root
            open={isVersionArchiveDialogOpen}
            onOpenChange={setIsVersionArchiveDialogOpen}
          >
            <DialogPrimitive.Portal>
              <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[1px]" />
              <DialogPrimitive.Popup className="fixed top-1/2 left-1/2 z-50 w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2 border border-destructive/50 bg-background p-4 shadow-lg">
                <div className="mb-2 inline-flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-destructive">
                  <AlertTriangleIcon className="size-4" />
                  <span>Destructive action</span>
                </div>
                <DialogPrimitive.Title className="text-sm font-semibold uppercase tracking-[0.12em] text-destructive">
                  Archive Version
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="mt-2 text-sm text-muted-foreground">
                  This archives the selected version and removes it from editable draft flow.
                </DialogPrimitive.Description>
                <p className="mt-3 border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive/90">
                  Archiving a version can strand active references. Confirm only after validating
                  downstream consumers and migration intent.
                </p>
                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-none"
                    onClick={() => setIsVersionArchiveDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    className="rounded-none"
                    disabled={archiveVersionMutation.isPending}
                    onClick={() => archiveVersionMutation.mutate({ versionId: selectedVersionId })}
                  >
                    Confirm Version Archive
                  </Button>
                </div>
              </DialogPrimitive.Popup>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>
        </>
      ) : null}
    </MethodologyWorkspaceShell>
  );
}
