import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, Outlet, createFileRoute, useLocation } from "@tanstack/react-router";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getDeterministicState,
  sortCatalogDeterministically,
  type MethodologyCatalogItem,
} from "@/features/methodologies/foundation";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";

const methodologiesSearchSchema = z.object({
  intent: z.enum(["create-methodology"]).optional(),
});

export const Route = createFileRoute("/methodologies")({
  validateSearch: (search) => methodologiesSearchSchema.parse(search),
  component: MethodologiesRoute,
});

export function MethodologiesRoute() {
  const location = useLocation();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { orpc, queryClient } = Route.useRouteContext();
  const [methodologyKey, setMethodologyKey] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const listQueryOptions = orpc.methodology.listMethodologies.queryOptions();
  const listQuery = useQuery(listQueryOptions);

  useEffect(() => {
    if (search.intent === "create-methodology") {
      setIsCreateDialogOpen(true);
    }
  }, [search.intent]);

  const createMethodologyMutation = useMutation(
    orpc.methodology.createMethodology.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: listQueryOptions.queryKey });
        setMethodologyKey("");
        setDisplayName("");
        setFormError(null);
        setIsCreateDialogOpen(false);

        if (search.intent) {
          void navigate({
            to: "/methodologies",
            search: { intent: undefined },
            replace: true,
          });
        }
      },
    }),
  );
  const seedCanonicalBmadMutation = useMutation(
    orpc.methodology.catalog.seed.mutationOptions({
      onSuccess: async (result) => {
        await queryClient.invalidateQueries({ queryKey: listQueryOptions.queryKey });
        toast.success(
          `BMAD seeded (${result.versionCount} versions, ${result.insertedCanonicalRowCount} canonical rows).`,
        );
      },
    }),
  );

  const ordered = useMemo(
    () =>
      sortCatalogDeterministically((listQuery.data as MethodologyCatalogItem[] | undefined) ?? []),
    [listQuery.data],
  );

  const state = getDeterministicState({
    isLoading: listQuery.isLoading,
    hasError: Boolean(listQuery.error),
    hasData: Boolean(listQuery.data),
    isBlocked: Boolean(formError),
  });

  if (location.pathname !== "/methodologies") {
    return <Outlet />;
  }

  return (
    <MethodologyWorkspaceShell
      title="Methodologies"
      stateLabel={state}
      segments={[{ label: "Methodologies" }]}
    >
      <section className="flex flex-wrap items-start justify-between gap-4 border border-border/80 bg-background p-4">
        <div className="max-w-2xl space-y-3">
          <p className="text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">
            Catalog Actions
          </p>
          <h2 className="text-lg font-semibold">Register a methodology in the catalog</h2>
          <p className="text-sm text-muted-foreground">
            Provide a stable key and human-readable name. Draft versions are created from details or
            versions views.
          </p>
          <p className="text-sm text-muted-foreground">
            Need the canonical baseline? Seed or refresh BMAD in place without resetting runtime or
            project data.
          </p>
        </div>

        <div className="flex flex-wrap items-start justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={seedCanonicalBmadMutation.isPending}
            className="rounded-none uppercase tracking-[0.12em]"
            onClick={() => seedCanonicalBmadMutation.mutate({})}
          >
            {seedCanonicalBmadMutation.isPending ? "Seeding BMAD..." : "Seed / Update BMAD"}
          </Button>
          <DialogPrimitive.Root
            open={isCreateDialogOpen}
            onOpenChange={(nextOpen) => {
              setIsCreateDialogOpen(nextOpen);

              if (!nextOpen && search.intent) {
                void navigate({
                  to: "/methodologies",
                  search: { intent: undefined },
                  replace: true,
                });
              }
            }}
          >
            <DialogPrimitive.Trigger
              render={
                <Button className="rounded-none uppercase tracking-[0.12em]">
                  Create Methodology
                </Button>
              }
            />
            <DialogPrimitive.Portal>
              <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[1px]" />
              <DialogPrimitive.Popup className="fixed top-1/2 left-1/2 z-50 w-[min(92vw,30rem)] -translate-x-1/2 -translate-y-1/2 border border-border/80 bg-background p-4 shadow-lg">
                <DialogPrimitive.Title className="text-sm font-semibold uppercase tracking-[0.12em]">
                  Create Methodology
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="mt-2 text-xs text-muted-foreground">
                  State: normal - Use a deterministic key and descriptive display name.
                </DialogPrimitive.Description>

                <form
                  className="mt-4 grid gap-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const key = methodologyKey.trim().toLowerCase().replaceAll(" ", "-");
                    const name = displayName.trim();

                    if (!key || !name) {
                      setFormError("State: blocked - Key and display name are required.");
                      return;
                    }
                    if (ordered.some((item) => item.methodologyKey === key)) {
                      setFormError("State: blocked - Methodology key already exists.");
                      return;
                    }

                    createMethodologyMutation.mutate({ methodologyKey: key, displayName: name });
                  }}
                >
                  <label
                    htmlFor="methodology-key-input"
                    className="space-y-1 text-xs uppercase tracking-[0.14em] text-muted-foreground"
                  >
                    Methodology Key
                    <Input
                      id="methodology-key-input"
                      value={methodologyKey}
                      onChange={(event) => {
                        setMethodologyKey(event.target.value);
                        setFormError(null);
                      }}
                      placeholder="equity-research-core"
                      className="rounded-none"
                    />
                  </label>
                  <label
                    htmlFor="methodology-name-input"
                    className="space-y-1 text-xs uppercase tracking-[0.14em] text-muted-foreground"
                  >
                    Display Name
                    <Input
                      id="methodology-name-input"
                      value={displayName}
                      onChange={(event) => {
                        setDisplayName(event.target.value);
                        setFormError(null);
                      }}
                      placeholder="Equity Research Core"
                      className="rounded-none"
                    />
                  </label>

                  <div className="flex flex-wrap justify-end gap-2">
                    <DialogPrimitive.Close
                      render={
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-none uppercase tracking-[0.12em]"
                        >
                          Cancel
                        </Button>
                      }
                    />
                    <Button
                      type="submit"
                      disabled={createMethodologyMutation.isPending}
                      className="rounded-none uppercase tracking-[0.12em]"
                    >
                      {createMethodologyMutation.isPending ? "Creating..." : "Create Methodology"}
                    </Button>
                  </div>

                  {formError ? <p className="text-xs text-muted-foreground">{formError}</p> : null}
                  {createMethodologyMutation.error ? (
                    <p className="text-xs text-muted-foreground">
                      State: failed - {createMethodologyMutation.error.message}
                    </p>
                  ) : null}
                </form>
              </DialogPrimitive.Popup>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>
        </div>
      </section>

      {seedCanonicalBmadMutation.error ? (
        <section className="border border-border/80 bg-background p-4">
          <p className="text-sm text-muted-foreground">
            State: failed - {seedCanonicalBmadMutation.error.message}
          </p>
        </section>
      ) : null}

      <section className="border border-border/80 bg-background">
        <div className="border-b border-border/80 px-4 py-3">
          <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
            Catalog Feed
          </p>
        </div>

        <div className="p-4">
          {listQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full rounded-none" />
              <Skeleton className="h-10 w-full rounded-none" />
              <Skeleton className="h-10 w-full rounded-none" />
            </div>
          ) : null}

          {!listQuery.isLoading && listQuery.isError ? (
            <p className="text-sm">State: failed - Unable to load methodologies.</p>
          ) : null}

          {!listQuery.isLoading && !listQuery.isError && ordered.length === 0 ? (
            <p className="text-sm">State: normal - No methodologies registered.</p>
          ) : null}

          {!listQuery.isLoading && !listQuery.isError && ordered.length > 0 ? (
            <ul className="space-y-2">
              {ordered.map((item) => (
                <li key={item.methodologyId} className="border border-border/70 p-3">
                  <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                      <p className="font-medium uppercase tracking-[0.08em]">{item.displayName}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.methodologyKey} | draft:{String(item.hasDraftVersion)} | versions:
                        {item.availableVersions}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        to="/methodologies/$methodologyId"
                        params={{ methodologyId: item.methodologyKey }}
                        className={buttonVariants({ size: "sm", variant: "outline" })}
                      >
                        Details
                      </Link>
                      <Link
                        to="/methodologies/$methodologyId/versions"
                        params={{ methodologyId: item.methodologyKey }}
                        className={buttonVariants({ size: "sm" })}
                      >
                        Versions
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>
    </MethodologyWorkspaceShell>
  );
}
