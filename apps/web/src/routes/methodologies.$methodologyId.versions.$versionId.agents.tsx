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

const deferredAgentAdvancedSchema = z
  .object({
    defaultModel: z
      .object({
        provider: z.string().min(1),
        model: z.string().min(1),
      })
      .optional(),
    mcpServers: z.array(z.string().min(1)).optional(),
    capabilities: z.array(z.string().min(1)).optional(),
  })
  .strict();

type DeferredAgentAdvanced = z.infer<typeof deferredAgentAdvancedSchema>;

type DraftAgent = {
  key?: string;
  displayName?: string;
  description?: string;
  persona?: string;
  promptTemplate?: { markdown?: string };
  defaultModel?: unknown;
  mcpServers?: unknown;
  capabilities?: unknown;
};

const emptyAdvancedPayload = "{}";

function stableJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function parseAdvancedJson(
  raw: string,
): { ok: true; value: DeferredAgentAdvanced } | { ok: false; message: string } {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { ok: true, value: {} };
  }

  const parsed = z
    .string()
    .transform((value, context) => {
      try {
        return JSON.parse(value) as unknown;
      } catch {
        context.addIssue({ code: "custom", message: "json_parse_failed" });
        return z.NEVER;
      }
    })
    .safeParse(trimmed);

  if (!parsed.success) {
    return { ok: false, message: "Advanced JSON must be valid JSON before saving." };
  }

  const validated = deferredAgentAdvancedSchema.safeParse(parsed.data);
  if (!validated.success) {
    return {
      ok: false,
      message:
        "Advanced JSON must include only defaultModel, mcpServers (string[]), and capabilities (string[]).",
    };
  }

  return { ok: true, value: validated.data };
}

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
  const [isAgentEditorOpen, setIsAgentEditorOpen] = useState(false);
  const [editingAgentKey, setEditingAgentKey] = useState<string | null>(null);
  const [deletingAgentKey, setDeletingAgentKey] = useState<string | null>(null);
  const [agentEditorTab, setAgentEditorTab] = useState<"contract" | "guidance" | "advanced">(
    "contract",
  );
  const [pendingCloseAgentEditor, setPendingCloseAgentEditor] = useState(false);
  const [agentKey, setAgentKey] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPromptMarkdown, setSystemPromptMarkdown] = useState("");
  const [advancedJson, setAdvancedJson] = useState(emptyAdvancedPayload);
  const [advancedJsonError, setAdvancedJsonError] = useState<string | null>(null);
  const [initialAgentFormValues, setInitialAgentFormValues] = useState({
    agentKey: "",
    displayName: "",
    description: "",
    systemPromptMarkdown: "",
    advancedJson: emptyAdvancedPayload,
  });

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
        closeAgentEditor();
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
        closeAgentEditor();
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

  const agentTypes: DraftAgent[] =
    draftQuery.data &&
    typeof draftQuery.data === "object" &&
    "agentTypes" in draftQuery.data &&
    Array.isArray(draftQuery.data.agentTypes)
      ? (draftQuery.data.agentTypes as DraftAgent[])
      : [];

  const trimmedAgentKey = agentKey.trim();
  const trimmedDisplayName = displayName.trim();
  const trimmedDescription = description.trim();
  const trimmedSystemPromptMarkdown = systemPromptMarkdown.trim();
  const isAgentEditorValid = trimmedAgentKey.length > 0 && trimmedSystemPromptMarkdown.length > 0;

  const isContractTabDirty =
    agentKey !== initialAgentFormValues.agentKey ||
    displayName !== initialAgentFormValues.displayName ||
    description !== initialAgentFormValues.description;
  const isGuidanceTabDirty = systemPromptMarkdown !== initialAgentFormValues.systemPromptMarkdown;
  const isAdvancedTabDirty = advancedJson !== initialAgentFormValues.advancedJson;
  const isAgentEditorDirty = isContractTabDirty || isGuidanceTabDirty || isAdvancedTabDirty;

  function resetAgentFormState() {
    setAgentKey("");
    setDisplayName("");
    setDescription("");
    setSystemPromptMarkdown("");
    setAdvancedJson(emptyAdvancedPayload);
    setAdvancedJsonError(null);
    setInitialAgentFormValues({
      agentKey: "",
      displayName: "",
      description: "",
      systemPromptMarkdown: "",
      advancedJson: emptyAdvancedPayload,
    });
    setAgentEditorTab("contract");
  }

  function closeAgentEditor() {
    setIsAgentEditorOpen(false);
    setEditingAgentKey(null);
    setPendingCloseAgentEditor(false);
    resetAgentFormState();
    if (isCreateIntentActive) {
      clearCreateIntent();
    }
  }

  function requestCloseAgentEditor() {
    if (isAgentEditorDirty) {
      setPendingCloseAgentEditor(true);
      return;
    }
    closeAgentEditor();
  }

  function openCreateAgent() {
    setEditingAgentKey(null);
    resetAgentFormState();
    setIsAgentEditorOpen(true);
  }

  function createAgent() {
    if (!isAgentEditorValid) {
      return;
    }

    const advancedParse = parseAdvancedJson(advancedJson);
    if (!advancedParse.ok) {
      setAgentEditorTab("advanced");
      setAdvancedJsonError(advancedParse.message);
      return;
    }

    setAdvancedJsonError(null);

    createAgentMutation.mutate({
      versionId,
      agent: {
        key: trimmedAgentKey,
        displayName: trimmedDisplayName,
        description: trimmedDescription,
        promptTemplate: { markdown: trimmedSystemPromptMarkdown },
        ...(advancedParse.value.defaultModel
          ? { defaultModel: advancedParse.value.defaultModel }
          : {}),
        ...(advancedParse.value.mcpServers ? { mcpServers: advancedParse.value.mcpServers } : {}),
        ...(advancedParse.value.capabilities
          ? { capabilities: advancedParse.value.capabilities }
          : {}),
      },
    });
  }

  function openEditAgent(agent: DraftAgent) {
    const nextAgentKey = agent.key ?? "";
    const nextDisplayName = agent.displayName ?? "";
    const nextDescription = agent.description ?? "";
    const nextSystemPromptMarkdown =
      (typeof agent.promptTemplate?.markdown === "string" ? agent.promptTemplate.markdown : null) ??
      agent.persona ??
      "";
    const nextAdvanced = stableJson({
      ...(agent.defaultModel ? { defaultModel: agent.defaultModel } : {}),
      ...(Array.isArray(agent.mcpServers) ? { mcpServers: agent.mcpServers } : {}),
      ...(Array.isArray(agent.capabilities) ? { capabilities: agent.capabilities } : {}),
    });
    setEditingAgentKey(agent.key ?? null);
    setAgentKey(nextAgentKey);
    setDisplayName(nextDisplayName);
    setDescription(nextDescription);
    setSystemPromptMarkdown(nextSystemPromptMarkdown);
    setAdvancedJson(nextAdvanced);
    setAdvancedJsonError(null);
    setInitialAgentFormValues({
      agentKey: nextAgentKey,
      displayName: nextDisplayName,
      description: nextDescription,
      systemPromptMarkdown: nextSystemPromptMarkdown,
      advancedJson: nextAdvanced,
    });
    setAgentEditorTab("contract");
    setIsAgentEditorOpen(true);
  }

  function saveAgentChanges() {
    if (!editingAgentKey || !isAgentEditorValid) {
      return;
    }

    const advancedParse = parseAdvancedJson(advancedJson);
    if (!advancedParse.ok) {
      setAgentEditorTab("advanced");
      setAdvancedJsonError(advancedParse.message);
      return;
    }

    setAdvancedJsonError(null);

    updateAgentMutation.mutate({
      versionId,
      agentKey: editingAgentKey,
      agent: {
        key: trimmedAgentKey,
        displayName: trimmedDisplayName,
        description: trimmedDescription,
        promptTemplate: { markdown: trimmedSystemPromptMarkdown },
        ...(advancedParse.value.defaultModel
          ? { defaultModel: advancedParse.value.defaultModel }
          : {}),
        ...(advancedParse.value.mcpServers ? { mcpServers: advancedParse.value.mcpServers } : {}),
        ...(advancedParse.value.capabilities
          ? { capabilities: advancedParse.value.capabilities }
          : {}),
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

  function submitAgentEditor() {
    if (editingAgentKey) {
      saveAgentChanges();
      return;
    }
    createAgent();
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
          <Button size="sm" className="rounded-none" onClick={openCreateAgent}>
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
        open={isAgentEditorOpen || isCreateIntentActive}
        onOpenChange={(open) => {
          if (open) {
            if (!isAgentEditorOpen && !editingAgentKey) {
              openCreateAgent();
            }
            return;
          }
          requestCloseAgentEditor();
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop className="fixed inset-0 bg-black/70" />
          <DialogPrimitive.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-5xl -translate-x-1/2 -translate-y-1/2 border border-border bg-background p-4 shadow-2xl">
            <DialogPrimitive.Title className="text-sm font-semibold uppercase tracking-[0.18em]">
              {editingAgentKey ? "Edit Agent" : "Add Agent"}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-2 text-xs text-muted-foreground">
              {editingAgentKey
                ? "Update metadata and system prompt guidance while preserving methodology context."
                : "Define an agent shell for this draft version."}
            </DialogPrimitive.Description>

            <div className="mt-4 flex flex-wrap gap-2 border-b border-border pb-3">
              <Button
                type="button"
                size="sm"
                variant={agentEditorTab === "contract" ? "default" : "outline"}
                className="rounded-none"
                onClick={() => setAgentEditorTab("contract")}
              >
                Contract{" "}
                {isContractTabDirty ? (
                  <span data-testid="agent-contract-modified-indicator">*</span>
                ) : null}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={agentEditorTab === "guidance" ? "default" : "outline"}
                className="rounded-none"
                onClick={() => setAgentEditorTab("guidance")}
              >
                Guidance{" "}
                {isGuidanceTabDirty ? (
                  <span data-testid="agent-guidance-modified-indicator">*</span>
                ) : null}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={agentEditorTab === "advanced" ? "default" : "outline"}
                className="rounded-none"
                onClick={() => setAgentEditorTab("advanced")}
              >
                Advanced (Deferred){" "}
                {isAdvancedTabDirty ? (
                  <span data-testid="agent-advanced-modified-indicator">*</span>
                ) : null}
              </Button>
            </div>

            {agentEditorTab === "contract" ? (
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
              </div>
            ) : agentEditorTab === "guidance" ? (
              <div className="mt-4 space-y-3">
                <label className="grid gap-1 text-sm">
                  <span>System Prompt (Markdown)</span>
                  <textarea
                    value={systemPromptMarkdown}
                    onChange={(event) => setSystemPromptMarkdown(event.target.value)}
                    className="border border-border bg-background px-2 py-1"
                  />
                </label>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-muted-foreground">
                  Advanced runtime settings are deferred in v1; this raw JSON editor is temporary.
                </p>
                <label className="grid gap-1 text-sm">
                  <span>Advanced JSON</span>
                  <textarea
                    aria-label="Advanced JSON"
                    value={advancedJson}
                    onChange={(event) => {
                      setAdvancedJson(event.target.value);
                      if (advancedJsonError) {
                        setAdvancedJsonError(null);
                      }
                    }}
                    className="min-h-[220px] border border-border bg-background px-2 py-1 font-mono text-xs"
                  />
                </label>
                {advancedJsonError ? (
                  <p className="text-xs text-destructive">{advancedJsonError}</p>
                ) : null}
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" className="rounded-none" onClick={requestCloseAgentEditor}>
                Cancel
              </Button>
              <Button
                className="rounded-none"
                onClick={submitAgentEditor}
                disabled={!isAgentEditorValid}
              >
                {editingAgentKey ? "Save Agent Changes" : "Create Agent"}
              </Button>
            </div>
            {trimmedSystemPromptMarkdown.length === 0 ? (
              <p className="mt-2 text-xs text-destructive">
                System prompt markdown is required before saving.
              </p>
            ) : null}
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <DialogPrimitive.Root
        open={pendingCloseAgentEditor}
        onOpenChange={setPendingCloseAgentEditor}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop className="fixed inset-0 bg-black/70" />
          <DialogPrimitive.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 border border-border bg-background p-4 shadow-2xl">
            <DialogPrimitive.Title className="text-sm font-semibold uppercase tracking-[0.18em]">
              Discard unsaved changes?
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-3 text-sm text-muted-foreground">
              Your agent changes are not saved yet.
            </DialogPrimitive.Description>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                className="rounded-none"
                onClick={() => setPendingCloseAgentEditor(false)}
              >
                Keep Editing
              </Button>
              <Button className="rounded-none" onClick={closeAgentEditor}>
                Discard Changes
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
