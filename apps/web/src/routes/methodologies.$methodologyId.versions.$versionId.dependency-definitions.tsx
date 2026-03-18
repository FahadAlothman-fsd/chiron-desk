import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";

import { Button, buttonVariants } from "@/components/ui/button";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";

export const Route = createFileRoute(
  "/methodologies/$methodologyId/versions/$versionId/dependency-definitions",
)({
  validateSearch: (search) =>
    z
      .object({
        intent: z.enum(["add-link-type"]).optional(),
        tab: z.enum(["definitions", "usage", "diagnostics"]).optional(),
      })
      .parse(search),
  component: MethodologyVersionDependencyDefinitionsRoute,
});

export function MethodologyVersionDependencyDefinitionsRoute() {
  const { methodologyId, versionId } = Route.useParams();
  const search = Route.useSearch();
  const tab = search.tab ?? "definitions";
  const { orpc } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingDependencyKey, setEditingDependencyKey] = useState<string | null>(null);
  const [deletingDependencyKey, setDeletingDependencyKey] = useState<string | null>(null);
  const [linkTypeKey, setLinkTypeKey] = useState("");
  const [description, setDescription] = useState("");
  const [allowHard, setAllowHard] = useState(false);
  const [allowSoft, setAllowSoft] = useState(false);

  const draftQuery = useQuery(
    orpc.methodology.version.dependencyDefinition.list.queryOptions({
      input: { versionId },
    }),
  );

  const createDependencyDefinitionMutation = useMutation(
    orpc.methodology.version.dependencyDefinition.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpc.methodology.version.dependencyDefinition.list.queryOptions({
            input: { versionId },
          }).queryKey,
        });
        setIsCreateDialogOpen(false);
        setLinkTypeKey("");
        setDescription("");
        setAllowHard(false);
        setAllowSoft(false);
      },
    }),
  );

  const updateDependencyDefinitionMutation = useMutation(
    orpc.methodology.version.dependencyDefinition.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpc.methodology.version.dependencyDefinition.list.queryOptions({
            input: { versionId },
          }).queryKey,
        });
        setEditingDependencyKey(null);
        setLinkTypeKey("");
        setDescription("");
        setAllowHard(false);
        setAllowSoft(false);
      },
    }),
  );

  const deleteDependencyDefinitionMutation = useMutation(
    orpc.methodology.version.dependencyDefinition.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpc.methodology.version.dependencyDefinition.list.queryOptions({
            input: { versionId },
          }).queryKey,
        });
        setDeletingDependencyKey(null);
      },
    }),
  );

  const linkTypeDefinitions = ((
    draftQuery.data as
      | {
          linkTypeDefinitions?: ReadonlyArray<{
            key?: string;
            description?: string;
            allowedStrengths?: ReadonlyArray<string>;
          }>;
          transitionWorkflowBindings?: Record<string, unknown>;
        }
      | undefined
  )?.linkTypeDefinitions ?? []) as ReadonlyArray<{
    key?: string;
    description?: string;
    allowedStrengths?: ReadonlyArray<string>;
  }>;
  const bindings =
    (draftQuery.data as { transitionWorkflowBindings?: Record<string, unknown> } | undefined)
      ?.transitionWorkflowBindings ?? {};
  const linkTypeKeys =
    linkTypeDefinitions.length > 0
      ? linkTypeDefinitions.map((definition) => definition.key ?? "").filter(Boolean)
      : Object.keys(bindings).sort();

  function resetFormState() {
    setLinkTypeKey("");
    setDescription("");
    setAllowHard(false);
    setAllowSoft(false);
  }

  function openEditDependencyDefinition(definition: {
    key?: string;
    description?: string;
    allowedStrengths?: ReadonlyArray<string>;
  }) {
    setEditingDependencyKey(definition.key ?? null);
    setLinkTypeKey(definition.key ?? "");
    setDescription(definition.description ?? "");
    setAllowHard(definition.allowedStrengths?.includes("hard") ?? false);
    setAllowSoft(definition.allowedStrengths?.includes("soft") ?? false);
  }

  function allowedStrengthsTuple() {
    const allowedStrengths = [allowHard ? "hard" : null, allowSoft ? "soft" : null].filter(
      (value): value is "hard" | "soft" => value !== null,
    );
    if (allowedStrengths.length === 0) {
      return null;
    }

    return allowedStrengths as ["hard" | "soft", ...("hard" | "soft")[]];
  }

  function createDependencyDefinition() {
    const allowedStrengths = allowedStrengthsTuple();
    if (!allowedStrengths) {
      return;
    }

    createDependencyDefinitionMutation.mutate({
      versionId,
      dependencyDefinition: {
        key: linkTypeKey.trim(),
        description: description.trim(),
        allowedStrengths: allowedStrengths as ["hard" | "soft", ...("hard" | "soft")[]],
      },
    });
  }

  function saveDependencyDefinitionChanges() {
    const allowedStrengths = allowedStrengthsTuple();
    if (!editingDependencyKey || !allowedStrengths) {
      return;
    }

    updateDependencyDefinitionMutation.mutate({
      versionId,
      dependencyKey: editingDependencyKey,
      dependencyDefinition: {
        key: linkTypeKey.trim(),
        description: description.trim(),
        allowedStrengths,
      },
    });
  }

  function confirmDeleteDependencyDefinition() {
    if (!deletingDependencyKey) {
      return;
    }

    deleteDependencyDefinitionMutation.mutate({
      versionId,
      dependencyKey: deletingDependencyKey,
    });
  }

  return (
    <MethodologyWorkspaceShell
      title="Dependency Definitions"
      stateLabel={draftQuery.isLoading ? "loading" : draftQuery.isError ? "failed" : "success"}
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
        { label: "Dependency Definitions" },
      ]}
    >
      <section className="chiron-frame-flat chiron-tone-navigation p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["definitions", "Definitions"],
                ["usage", "Usage"],
                ["diagnostics", "Diagnostics"],
              ] as const
            ).map(([key, label]) => (
              <Link
                key={key}
                to="/methodologies/$methodologyId/versions/$versionId/dependency-definitions"
                params={{ methodologyId, versionId }}
                search={{ intent: search.intent, tab: key }}
                className={buttonVariants({
                  size: "sm",
                  variant: tab === key ? "default" : "outline",
                })}
              >
                {label}
              </Link>
            ))}
          </div>
          <Button size="sm" className="rounded-none" onClick={() => setIsCreateDialogOpen(true)}>
            + Add Link Type
          </Button>
        </div>
        {search.intent === "add-link-type" ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Add Link Type requested from command palette.
          </p>
        ) : null}
      </section>

      {draftQuery.isLoading ? <p className="text-sm">Loading dependency definitions...</p> : null}
      {draftQuery.isError ? (
        <p className="text-sm">
          State: failed - Unable to load dependency definitions while preserving current
          methodology/version context.
        </p>
      ) : null}

      {!draftQuery.isLoading && !draftQuery.isError ? (
        <section className="chiron-frame-flat p-3">
          <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
            Known Link Types
          </p>
          {linkTypeKeys.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No link types yet.</p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm">
              {linkTypeKeys.map((key) => (
                <li key={key} className="border border-border/70 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span>{key}</span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-none"
                        onClick={() =>
                          openEditDependencyDefinition(
                            linkTypeDefinitions.find((definition) => definition.key === key) ?? {
                              key,
                              description: "",
                              allowedStrengths: [],
                            },
                          )
                        }
                      >
                        {`Edit ${key}`}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-none"
                        onClick={() => setDeletingDependencyKey(key)}
                      >
                        {`Delete ${key}`}
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <DialogPrimitive.Root open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop className="fixed inset-0 bg-black/70" />
          <DialogPrimitive.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 border border-border bg-background p-4 shadow-2xl">
            <DialogPrimitive.Title className="text-sm font-semibold uppercase tracking-[0.18em]">
              Add Link Type
            </DialogPrimitive.Title>
            <div className="mt-4 space-y-3">
              <label className="grid gap-1 text-sm">
                <span>Link Type Key</span>
                <input
                  value={linkTypeKey}
                  onChange={(event) => setLinkTypeKey(event.target.value)}
                  className="border border-border bg-background px-2 py-1"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span>Description</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="border border-border bg-background px-2 py-1"
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={allowHard}
                  onChange={(event) => setAllowHard(event.target.checked)}
                />
                <span>Hard</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={allowSoft}
                  onChange={(event) => setAllowSoft(event.target.checked)}
                />
                <span>Soft</span>
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                className="rounded-none"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button className="rounded-none" onClick={createDependencyDefinition}>
                Create Link Type
              </Button>
            </div>
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <DialogPrimitive.Root
        open={editingDependencyKey !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingDependencyKey(null);
            resetFormState();
          }
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop className="fixed inset-0 bg-black/70" />
          <DialogPrimitive.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 border border-border bg-background p-4 shadow-2xl">
            <DialogPrimitive.Title className="text-sm font-semibold uppercase tracking-[0.18em]">
              Edit Link Type
            </DialogPrimitive.Title>
            <div className="mt-4 space-y-3">
              <label className="grid gap-1 text-sm">
                <span>Link Type Key</span>
                <input
                  value={linkTypeKey}
                  onChange={(event) => setLinkTypeKey(event.target.value)}
                  className="border border-border bg-background px-2 py-1"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span>Description</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="border border-border bg-background px-2 py-1"
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={allowHard}
                  onChange={(event) => setAllowHard(event.target.checked)}
                />
                <span>Hard</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={allowSoft}
                  onChange={(event) => setAllowSoft(event.target.checked)}
                />
                <span>Soft</span>
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                className="rounded-none"
                onClick={() => {
                  setEditingDependencyKey(null);
                  resetFormState();
                }}
              >
                Cancel
              </Button>
              <Button className="rounded-none" onClick={saveDependencyDefinitionChanges}>
                Save Link Type Changes
              </Button>
            </div>
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <DialogPrimitive.Root
        open={deletingDependencyKey !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingDependencyKey(null);
          }
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop className="fixed inset-0 bg-black/70" />
          <DialogPrimitive.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 border border-border bg-background p-4 shadow-2xl">
            <DialogPrimitive.Title className="text-sm font-semibold uppercase tracking-[0.18em]">
              Delete Link Type
            </DialogPrimitive.Title>
            <p className="mt-3 text-sm text-muted-foreground">
              Remove this link type definition from the current draft version.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                className="rounded-none"
                onClick={() => setDeletingDependencyKey(null)}
              >
                Cancel
              </Button>
              <Button className="rounded-none" onClick={confirmDeleteDependencyDefinition}>
                Confirm Delete Link Type
              </Button>
            </div>
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </MethodologyWorkspaceShell>
  );
}
