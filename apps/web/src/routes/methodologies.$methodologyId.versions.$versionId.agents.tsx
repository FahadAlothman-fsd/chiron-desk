import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";

import { Button, buttonVariants } from "@/components/ui/button";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";

const agentsSearchSchema = z.object({
  intent: z.enum(["add-agent"]).optional(),
  tab: z.enum(["catalog", "contracts", "diagnostics"]).optional(),
});

type AgentsSearch = z.infer<typeof agentsSearchSchema>;

export const Route = createFileRoute("/methodologies/$methodologyId/versions/$versionId/agents")({
  validateSearch: (search): AgentsSearch => agentsSearchSchema.parse(search),
  component: MethodologyVersionAgentsRoute,
});

export function MethodologyVersionAgentsRoute() {
  const { methodologyId, versionId } = Route.useParams();
  const search = Route.useSearch();
  const tab = search.tab ?? "catalog";
  const navigate = useNavigate();
  const { orpc } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingAgentKey, setEditingAgentKey] = useState<string | null>(null);
  const [deletingAgentKey, setDeletingAgentKey] = useState<string | null>(null);
  const [agentKey, setAgentKey] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [persona, setPersona] = useState("");

  const draftQuery = useQuery(
    orpc.methodology.version.agent.list.queryOptions({
      input: { versionId },
    }),
  );

  const isCreateIntentActive = search.intent === "add-agent";

  function clearCreateIntent() {
    void navigate({
      to: "/methodologies/$methodologyId/versions/$versionId/agents",
      params: { methodologyId, versionId },
      search: {},
      replace: true,
    });
  }

  const createAgentMutation = useMutation(
    orpc.methodology.version.agent.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpc.methodology.version.agent.list.queryOptions({ input: { versionId } })
            .queryKey,
        });
        setIsCreateDialogOpen(false);
        setAgentKey("");
        setDisplayName("");
        setDescription("");
        setPersona("");

        if (isCreateIntentActive) {
          clearCreateIntent();
        }
      },
    }),
  );

  const updateAgentMutation = useMutation(
    orpc.methodology.version.agent.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpc.methodology.version.agent.list.queryOptions({ input: { versionId } })
            .queryKey,
        });
        setEditingAgentKey(null);
        setAgentKey("");
        setDisplayName("");
        setDescription("");
        setPersona("");
      },
    }),
  );

  const deleteAgentMutation = useMutation(
    orpc.methodology.version.agent.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpc.methodology.version.agent.list.queryOptions({ input: { versionId } })
            .queryKey,
        });
        setDeletingAgentKey(null);
      },
    }),
  );

  const agentTypes = ((
    draftQuery.data as
      | { agentTypes?: ReadonlyArray<{ key?: string; displayName?: string }> }
      | undefined
  )?.agentTypes ?? []) as ReadonlyArray<{ key?: string; displayName?: string }>;

  function createAgent() {
    createAgentMutation.mutate({
      versionId,
      agent: {
        key: agentKey.trim(),
        displayName: displayName.trim(),
        description: description.trim(),
        persona: persona.trim(),
      },
    });
  }

  function openEditAgent(agent: {
    key?: string;
    displayName?: string;
    description?: string;
    persona?: string;
  }) {
    setEditingAgentKey(agent.key ?? null);
    setAgentKey(agent.key ?? "");
    setDisplayName(agent.displayName ?? "");
    setDescription(agent.description ?? "");
    setPersona(agent.persona ?? "");
  }

  function saveAgentChanges() {
    if (!editingAgentKey) {
      return;
    }

    updateAgentMutation.mutate({
      versionId,
      agentKey: editingAgentKey,
      agent: {
        key: agentKey.trim(),
        displayName: displayName.trim(),
        description: description.trim(),
        persona: persona.trim(),
      },
    });
  }

  function confirmDeleteAgent() {
    if (!deletingAgentKey) {
      return;
    }

    deleteAgentMutation.mutate({
      versionId,
      agentKey: deletingAgentKey,
    });
  }

  return (
    <MethodologyWorkspaceShell
      title="Agents"
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
        { label: "Agents" },
      ]}
    >
      <section className="chiron-frame-flat chiron-tone-navigation p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["catalog", "Catalog"],
                ["contracts", "Contracts"],
                ["diagnostics", "Diagnostics"],
              ] as const
            ).map(([key, label]) => (
              <Link
                key={key}
                to="/methodologies/$methodologyId/versions/$versionId/agents"
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
            + Add Agent
          </Button>
        </div>
        {search.intent === "add-agent" ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Add Agent requested from command palette.
          </p>
        ) : null}
      </section>

      {draftQuery.isLoading ? <p className="text-sm">Loading agent definitions...</p> : null}
      {draftQuery.isError ? (
        <p className="text-sm">
          State: failed - Unable to load agent definitions while preserving version context.
        </p>
      ) : null}

      {!draftQuery.isLoading && !draftQuery.isError ? (
        <section className="grid gap-2 md:grid-cols-2">
          {agentTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No agent definitions yet.</p>
          ) : (
            agentTypes.map((agent, index) => {
              const key = agent?.key ?? `agent-${index + 1}`;
              return (
                <article key={key} className="chiron-frame-flat p-3">
                  <p className="font-medium">{agent?.displayName ?? key}</p>
                  <p className="text-xs text-muted-foreground">{key}</p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-none"
                      onClick={() => openEditAgent(agent)}
                    >
                      Edit {agent?.displayName ?? key}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-none"
                      onClick={() => setDeletingAgentKey(key)}
                    >
                      Delete {agent?.displayName ?? key}
                    </Button>
                  </div>
                </article>
              );
            })
          )}
        </section>
      ) : null}

      <DialogPrimitive.Root
        open={isCreateDialogOpen || isCreateIntentActive}
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open && isCreateIntentActive) {
            clearCreateIntent();
          }
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop className="fixed inset-0 bg-black/70" />
          <DialogPrimitive.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 border border-border bg-background p-4 shadow-2xl">
            <DialogPrimitive.Title className="text-sm font-semibold uppercase tracking-[0.18em]">
              Add Agent
            </DialogPrimitive.Title>
            <div className="mt-4 space-y-3">
              <label className="grid gap-1 text-sm">
                <span>Agent Key</span>
                <input
                  value={agentKey}
                  onChange={(event) => setAgentKey(event.target.value)}
                  className="border border-border bg-background px-2 py-1"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span>Display Name</span>
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
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
              <label className="grid gap-1 text-sm">
                <span>Persona</span>
                <textarea
                  value={persona}
                  onChange={(event) => setPersona(event.target.value)}
                  className="border border-border bg-background px-2 py-1"
                />
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
              <Button className="rounded-none" onClick={createAgent}>
                Create Agent
              </Button>
            </div>
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <DialogPrimitive.Root
        open={editingAgentKey !== null}
        onOpenChange={(open) => !open && setEditingAgentKey(null)}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop className="fixed inset-0 bg-black/70" />
          <DialogPrimitive.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 border border-border bg-background p-4 shadow-2xl">
            <DialogPrimitive.Title className="text-sm font-semibold uppercase tracking-[0.18em]">
              Edit Agent
            </DialogPrimitive.Title>
            <div className="mt-4 space-y-3">
              <label className="grid gap-1 text-sm">
                <span>Agent Key</span>
                <input
                  value={agentKey}
                  onChange={(event) => setAgentKey(event.target.value)}
                  className="border border-border bg-background px-2 py-1"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span>Display Name</span>
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
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
              <label className="grid gap-1 text-sm">
                <span>Persona</span>
                <textarea
                  value={persona}
                  onChange={(event) => setPersona(event.target.value)}
                  className="border border-border bg-background px-2 py-1"
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                className="rounded-none"
                onClick={() => setEditingAgentKey(null)}
              >
                Cancel
              </Button>
              <Button className="rounded-none" onClick={saveAgentChanges}>
                Save Agent Changes
              </Button>
            </div>
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <DialogPrimitive.Root
        open={deletingAgentKey !== null}
        onOpenChange={(open) => !open && setDeletingAgentKey(null)}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop className="fixed inset-0 bg-black/70" />
          <DialogPrimitive.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 border border-border bg-background p-4 shadow-2xl">
            <DialogPrimitive.Title className="text-sm font-semibold uppercase tracking-[0.18em]">
              Delete Agent
            </DialogPrimitive.Title>
            <p className="mt-3 text-sm text-muted-foreground">
              Remove this agent definition from the current draft version.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                className="rounded-none"
                onClick={() => setDeletingAgentKey(null)}
              >
                Cancel
              </Button>
              <Button className="rounded-none" onClick={confirmDeleteAgent}>
                Confirm Delete Agent
              </Button>
            </div>
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </MethodologyWorkspaceShell>
  );
}
