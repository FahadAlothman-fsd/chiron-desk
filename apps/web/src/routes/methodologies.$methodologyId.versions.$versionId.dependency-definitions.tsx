import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";

import { Button, buttonVariants } from "@/components/ui/button";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";

const dependencyDefinitionsSearchSchema = z.object({
  intent: z.enum(["add-link-type"]).optional(),
  tab: z.enum(["definitions", "usage", "diagnostics"]).optional(),
});

type DependencyDefinitionsSearch = z.infer<typeof dependencyDefinitionsSearchSchema>;

export const Route = createFileRoute(
  "/methodologies/$methodologyId/versions/$versionId/dependency-definitions",
)({
  validateSearch: (search): DependencyDefinitionsSearch =>
    dependencyDefinitionsSearchSchema.parse(search),
  component: MethodologyVersionDependencyDefinitionsRoute,
});

export function MethodologyVersionDependencyDefinitionsRoute() {
  const { methodologyId, versionId } = Route.useParams();
  const search = Route.useSearch();
  const tab = search.tab ?? "definitions";
  const navigate = useNavigate();
  const { orpc } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const [isDependencyEditorOpen, setIsDependencyEditorOpen] = useState(false);
  const [editingDependencyKey, setEditingDependencyKey] = useState<string | null>(null);
  const [deletingDependencyKey, setDeletingDependencyKey] = useState<string | null>(null);
  const [dependencyEditorTab, setDependencyEditorTab] = useState<"contract" | "guidance">(
    "contract",
  );
  const [pendingCloseDependencyEditor, setPendingCloseDependencyEditor] = useState(false);
  const [linkTypeKey, setLinkTypeKey] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [humanGuidance, setHumanGuidance] = useState("");
  const [agentGuidance, setAgentGuidance] = useState("");
  const [initialDependencyFormValues, setInitialDependencyFormValues] = useState({
    linkTypeKey: "",
    name: "",
    description: "",
    humanGuidance: "",
    agentGuidance: "",
  });

  const draftQuery = useQuery(
    orpc.methodology.version.dependencyDefinition.list.queryOptions({
      input: { versionId },
    }),
  );

  const isCreateIntentActive = search.intent === "add-link-type";

  function clearCreateIntent() {
    void navigate({
      to: "/methodologies/$methodologyId/versions/$versionId/dependency-definitions",
      params: { methodologyId, versionId },
      search: {},
      replace: true,
    });
  }

  const createDependencyDefinitionMutation = useMutation(
    orpc.methodology.version.dependencyDefinition.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpc.methodology.version.dependencyDefinition.list.queryOptions({
            input: { versionId },
          }).queryKey,
        });
        closeDependencyEditor();
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
        closeDependencyEditor();
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

  const linkTypeDefinitions =
    (
      draftQuery.data as
        | {
            linkTypeDefinitions?: ReadonlyArray<{
              key?: string;
              name?: string;
              description?: string;
              guidance?: {
                human?: { markdown?: string };
                agent?: { markdown?: string };
              };
            }>;
            transitionWorkflowBindings?: Record<string, unknown>;
          }
        | undefined
    )?.linkTypeDefinitions ?? [];

  const bindings =
    (draftQuery.data as { transitionWorkflowBindings?: Record<string, unknown> } | undefined)
      ?.transitionWorkflowBindings ?? {};
  const linkTypeKeys =
    linkTypeDefinitions.length > 0
      ? linkTypeDefinitions.map((definition) => definition.key ?? "").filter(Boolean)
      : Object.keys(bindings).sort();

  const isContractTabDirty =
    linkTypeKey !== initialDependencyFormValues.linkTypeKey ||
    name !== initialDependencyFormValues.name ||
    description !== initialDependencyFormValues.description;
  const isGuidanceTabDirty =
    humanGuidance !== initialDependencyFormValues.humanGuidance ||
    agentGuidance !== initialDependencyFormValues.agentGuidance;
  const isDependencyEditorDirty = isContractTabDirty || isGuidanceTabDirty;

  function resetDependencyFormState() {
    setLinkTypeKey("");
    setName("");
    setDescription("");
    setHumanGuidance("");
    setAgentGuidance("");
    setInitialDependencyFormValues({
      linkTypeKey: "",
      name: "",
      description: "",
      humanGuidance: "",
      agentGuidance: "",
    });
    setDependencyEditorTab("contract");
  }

  function closeDependencyEditor() {
    setIsDependencyEditorOpen(false);
    setEditingDependencyKey(null);
    setPendingCloseDependencyEditor(false);
    resetDependencyFormState();
    if (isCreateIntentActive) {
      clearCreateIntent();
    }
  }

  function requestCloseDependencyEditor() {
    if (isDependencyEditorDirty) {
      setPendingCloseDependencyEditor(true);
      return;
    }
    closeDependencyEditor();
  }

  function openCreateDependencyDefinition() {
    setEditingDependencyKey(null);
    resetDependencyFormState();
    setIsDependencyEditorOpen(true);
  }

  function openEditDependencyDefinition(definition: {
    key?: string;
    name?: string;
    description?: string;
    guidance?: {
      human?: { markdown?: string };
      agent?: { markdown?: string };
    };
  }) {
    const nextLinkTypeKey = definition.key ?? "";
    const nextName = definition.name ?? "";
    const nextDescription = definition.description ?? "";
    const nextHumanGuidance = definition.guidance?.human?.markdown ?? "";
    const nextAgentGuidance = definition.guidance?.agent?.markdown ?? "";
    setEditingDependencyKey(definition.key ?? null);
    setLinkTypeKey(nextLinkTypeKey);
    setName(nextName);
    setDescription(nextDescription);
    setHumanGuidance(nextHumanGuidance);
    setAgentGuidance(nextAgentGuidance);
    setInitialDependencyFormValues({
      linkTypeKey: nextLinkTypeKey,
      name: nextName,
      description: nextDescription,
      humanGuidance: nextHumanGuidance,
      agentGuidance: nextAgentGuidance,
    });
    setDependencyEditorTab("contract");
    setIsDependencyEditorOpen(true);
  }

  function buildGuidancePayload() {
    const trimmedHumanGuidance = humanGuidance.trim();
    const trimmedAgentGuidance = agentGuidance.trim();
    if (!trimmedHumanGuidance && !trimmedAgentGuidance) {
      return undefined;
    }

    return {
      human: { markdown: trimmedHumanGuidance },
      agent: { markdown: trimmedAgentGuidance },
    };
  }

  function createDependencyDefinition() {
    createDependencyDefinitionMutation.mutate({
      versionId,
      dependencyDefinition: {
        key: linkTypeKey.trim(),
        name: name.trim(),
        description: description.trim(),
        guidance: buildGuidancePayload(),
      },
    });
  }

  function saveDependencyDefinitionChanges() {
    if (!editingDependencyKey) {
      return;
    }

    updateDependencyDefinitionMutation.mutate({
      versionId,
      dependencyKey: editingDependencyKey,
      dependencyDefinition: {
        key: linkTypeKey.trim(),
        name: name.trim(),
        description: description.trim(),
        guidance: buildGuidancePayload(),
      },
    });
  }

  function submitDependencyEditor() {
    if (editingDependencyKey) {
      saveDependencyDefinitionChanges();
      return;
    }
    createDependencyDefinition();
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
          <Button size="sm" className="rounded-none" onClick={openCreateDependencyDefinition}>
            + Add Link Type
          </Button>
        </div>
        {isCreateIntentActive ? (
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
              {linkTypeKeys.map((key) => {
                const definition =
                  linkTypeDefinitions.find((candidate) => candidate.key === key) ??
                  ({
                    key,
                    name: "",
                    description: "",
                  } as const);
                return (
                  <li key={key} className="border border-border/70 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p>{definition.name?.trim() || key}</p>
                        <p className="text-xs text-muted-foreground">{key}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-none"
                          onClick={() => openEditDependencyDefinition(definition)}
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
                );
              })}
            </ul>
          )}
        </section>
      ) : null}

      <DialogPrimitive.Root
        open={isDependencyEditorOpen || isCreateIntentActive}
        onOpenChange={(open) => {
          if (open) {
            if (!isDependencyEditorOpen && !editingDependencyKey) {
              openCreateDependencyDefinition();
            }
            return;
          }
          requestCloseDependencyEditor();
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop className="fixed inset-0 bg-black/70" />
          <DialogPrimitive.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-5xl -translate-x-1/2 -translate-y-1/2 border border-border bg-background p-4 shadow-2xl">
            <DialogPrimitive.Title className="text-sm font-semibold uppercase tracking-[0.18em]">
              {editingDependencyKey ? "Edit Link Type" : "Add Link Type"}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-2 text-xs text-muted-foreground">
              {editingDependencyKey
                ? "Update dependency metadata and guidance while preserving draft context."
                : "Define a dependency type for this draft version."}
            </DialogPrimitive.Description>

            <div className="mt-4 flex flex-wrap gap-2 border-b border-border pb-3">
              <Button
                type="button"
                size="sm"
                variant={dependencyEditorTab === "contract" ? "default" : "outline"}
                className="rounded-none"
                onClick={() => setDependencyEditorTab("contract")}
              >
                Contract{" "}
                {isContractTabDirty ? (
                  <span data-testid="dependency-contract-modified-indicator">*</span>
                ) : null}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={dependencyEditorTab === "guidance" ? "default" : "outline"}
                className="rounded-none"
                onClick={() => setDependencyEditorTab("guidance")}
              >
                Guidance{" "}
                {isGuidanceTabDirty ? (
                  <span data-testid="dependency-guidance-modified-indicator">*</span>
                ) : null}
              </Button>
            </div>

            {dependencyEditorTab === "contract" ? (
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
                  <span>Name</span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
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
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <label className="grid gap-1 text-sm">
                  <span>Human Guidance</span>
                  <textarea
                    value={humanGuidance}
                    onChange={(event) => setHumanGuidance(event.target.value)}
                    className="border border-border bg-background px-2 py-1"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span>Agent Guidance</span>
                  <textarea
                    value={agentGuidance}
                    onChange={(event) => setAgentGuidance(event.target.value)}
                    className="border border-border bg-background px-2 py-1"
                  />
                </label>
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                className="rounded-none"
                onClick={requestCloseDependencyEditor}
              >
                Cancel
              </Button>
              <Button className="rounded-none" onClick={submitDependencyEditor}>
                {editingDependencyKey ? "Save Link Type Changes" : "Create Link Type"}
              </Button>
            </div>
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <DialogPrimitive.Root
        open={pendingCloseDependencyEditor}
        onOpenChange={setPendingCloseDependencyEditor}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop className="fixed inset-0 bg-black/70" />
          <DialogPrimitive.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 border border-border bg-background p-4 shadow-2xl">
            <DialogPrimitive.Title className="text-sm font-semibold uppercase tracking-[0.18em]">
              Discard unsaved changes?
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-3 text-sm text-muted-foreground">
              Your dependency definition changes are not saved yet.
            </DialogPrimitive.Description>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                className="rounded-none"
                onClick={() => setPendingCloseDependencyEditor(false)}
              >
                Keep Editing
              </Button>
              <Button className="rounded-none" onClick={closeDependencyEditor}>
                Discard Changes
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
