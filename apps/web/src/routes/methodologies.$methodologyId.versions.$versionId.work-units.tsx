import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { z } from "zod";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { WorkUnitsGraphView } from "@/features/methodologies/work-units-graph-view";
import {
  deriveActiveWorkUnit,
  deriveWorkUnitsPageRows,
} from "@/features/methodologies/work-units-page-selectors";
import { WorkUnitsRightRail } from "@/features/methodologies/work-units-right-rail";
import { projectMethodologyGraph } from "@/features/methodologies/version-graph";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";

export const Route = createFileRoute(
  "/methodologies/$methodologyId/versions/$versionId/work-units",
)({
  validateSearch: (search) =>
    z
      .object({
        view: z.enum(["graph", "contracts", "diagnostics"]).optional(),
        selected: z.string().min(1).optional(),
        intent: z.literal("add-work-unit").optional(),
      })
      .strict()
      .parse(search),
  component: MethodologyVersionWorkUnitsRoute,
});

export function MethodologyVersionWorkUnitsRoute() {
  const { methodologyId, versionId } = Route.useParams();
  const search = Route.useSearch();
  const { orpc } = Route.useRouteContext();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();

  const detailsQuery = useQuery(
    orpc.methodology.getMethodologyDetails.queryOptions({
      input: { methodologyKey: methodologyId },
    }),
  );

  const draftQuery = useQuery(
    orpc.methodology.version.workUnit.list.queryOptions({
      input: { versionId },
    }),
  );

  const draftProjection = (draftQuery.data ?? null) as {
    workUnitTypes?: ReadonlyArray<{
      key?: string;
      displayName?: string;
      cardinality?: "one_per_project" | "many_per_project";
      lifecycleStates?: ReadonlyArray<{ key?: string }>;
      lifecycleTransitions?: ReadonlyArray<unknown>;
      factSchemas?: ReadonlyArray<unknown>;
      relationships?: ReadonlyArray<unknown>;
    }>;
    workflows?: ReadonlyArray<{
      key?: string;
      displayName?: string;
      workUnitTypeKey?: string;
      steps?: ReadonlyArray<unknown>;
      edges?: ReadonlyArray<unknown>;
    }>;
    transitionWorkflowBindings?: Record<string, readonly string[]>;
    agentTypes?: ReadonlyArray<{
      key?: string;
      displayName?: string;
      description?: string;
      factSchemaKeys?: ReadonlyArray<string>;
    }>;
  } | null;

  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newWorkUnitKey, setNewWorkUnitKey] = useState("");
  const [newWorkUnitDisplayName, setNewWorkUnitDisplayName] = useState("");
  const [newWorkUnitDescription, setNewWorkUnitDescription] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const newWorkUnitKeyRef = useRef<HTMLInputElement | null>(null);

  const updateDraftLifecycleMutation = useMutation(
    orpc.methodology.version.workUnit.create.mutationOptions(),
  );

  const workUnits = useMemo(() => deriveWorkUnitsPageRows(draftProjection), [draftProjection]);

  const filteredWorkUnits = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return workUnits;
    }

    return workUnits.filter(
      (row) =>
        row.displayName.toLowerCase().includes(normalizedQuery) ||
        row.key.toLowerCase().includes(normalizedQuery),
    );
  }, [searchQuery, workUnits]);

  const activeWorkUnit = deriveActiveWorkUnit(workUnits, search.selected ?? null);
  const activeWorkUnitKey = activeWorkUnit?.key ?? null;
  const activeView = search.view ?? "graph";
  const isGraphView = activeView === "graph";
  const isCreateIntentActive = search.intent === "add-work-unit";

  const graphProjection = useMemo(
    () =>
      projectMethodologyGraph(
        {
          workUnitTypes: Array.isArray(draftProjection?.workUnitTypes)
            ? draftProjection.workUnitTypes
            : [],
          workflows: Array.isArray(draftProjection?.workflows) ? draftProjection.workflows : [],
          transitionWorkflowBindings:
            draftProjection?.transitionWorkflowBindings &&
            typeof draftProjection.transitionWorkflowBindings === "object"
              ? draftProjection.transitionWorkflowBindings
              : {},
        },
        { level: "L1" },
      ),
    [draftProjection],
  );

  const existingWorkUnitTypes = useMemo(
    () => (Array.isArray(draftProjection?.workUnitTypes) ? draftProjection.workUnitTypes : []),
    [draftProjection?.workUnitTypes],
  );

  const existingAgentTypes = useMemo(
    () => (Array.isArray(draftProjection?.agentTypes) ? draftProjection.agentTypes : []),
    [draftProjection?.agentTypes],
  );

  const updateSearch = (next: {
    view?: "graph" | "contracts" | "diagnostics";
    selected?: string;
  }) => {
    void navigate({
      search: (previous) => ({
        view: next.view ?? previous.view,
        selected: next.selected ?? previous.selected,
      }),
    });
  };

  const clearCreateIntent = () => updateSearch({});

  const closeCreateDialog = () => {
    setIsCreateDialogOpen(false);
    if (isCreateIntentActive) {
      clearCreateIntent();
    }
  };

  const handleCreateWorkUnit = async () => {
    const nextKey = (newWorkUnitKeyRef.current?.value ?? newWorkUnitKey).trim();
    const nextDisplayName = newWorkUnitDisplayName.trim() || nextKey;
    const nextDescription = newWorkUnitDescription.trim();
    if (!nextKey) {
      setCreateError("Work Unit Key is required.");
      return;
    }

    const keyAlreadyExists = existingWorkUnitTypes.some((workUnit) => workUnit?.key === nextKey);
    if (keyAlreadyExists) {
      setCreateError("Work Unit Key must be unique.");
      return;
    }

    setCreateError(null);

    try {
      await updateDraftLifecycleMutation.mutateAsync({
        versionId,
        workUnitTypes: [
          ...existingWorkUnitTypes,
          {
            key: nextKey,
            displayName: nextDisplayName,
            description: nextDescription,
            cardinality: "many_per_project",
            lifecycleStates: [{ key: "draft" }],
            lifecycleTransitions: [],
            factSchemas: [],
          },
        ],
        agentTypes: existingAgentTypes.map((agent) => ({
          key: agent?.key ?? "",
          displayName: agent?.displayName ?? agent?.key ?? "",
          description: agent?.description ?? "",
          persona:
            typeof (agent as { persona?: unknown })?.persona === "string" &&
            (agent as { persona?: string }).persona?.trim().length
              ? (agent as { persona?: string }).persona!.trim()
              : "draft",
          defaultModel:
            (agent as { defaultModel?: { provider?: string; model?: string } })?.defaultModel
              ?.provider &&
            (agent as { defaultModel?: { provider?: string; model?: string } })?.defaultModel?.model
              ? {
                  provider: (agent as { defaultModel?: { provider?: string; model?: string } })
                    .defaultModel!.provider!,
                  model: (agent as { defaultModel?: { provider?: string; model?: string } })
                    .defaultModel!.model!,
                }
              : undefined,
          mcpServers: Array.isArray((agent as { mcpServers?: unknown }).mcpServers)
            ? ((agent as { mcpServers?: string[] }).mcpServers ?? [])
            : [],
          capabilities: Array.isArray((agent as { capabilities?: unknown }).capabilities)
            ? ((agent as { capabilities?: string[] }).capabilities ?? [])
            : [],
        })),
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["methodology", "draft", versionId] }),
        queryClient.invalidateQueries({ queryKey: ["methodology", "details", methodologyId] }),
      ]);

      setIsCreateDialogOpen(false);
      setNewWorkUnitKey("");
      setNewWorkUnitDisplayName("");
      setNewWorkUnitDescription("");
      updateSearch({ selected: nextKey });
    } catch {
      setCreateError(
        "Unable to create work unit. Review the current draft definitions and try again.",
      );
    }
  };

  return (
    <MethodologyWorkspaceShell
      title="Work Units"
      stateLabel={
        draftQuery.isLoading || detailsQuery.isLoading
          ? "loading"
          : draftQuery.isError || detailsQuery.isError
            ? "failed"
            : "success"
      }
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
        { label: "Work Units" },
      ]}
    >
      <section className="chiron-frame-flat chiron-tone-navigation p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={isGraphView ? "default" : "outline"}
              className="rounded-none"
              onClick={() => updateSearch({ view: "graph" })}
            >
              Graph
            </Button>
            <Button
              size="sm"
              variant={activeView === "contracts" ? "default" : "outline"}
              className="rounded-none"
              onClick={() => updateSearch({ view: "contracts" })}
            >
              Contracts
            </Button>
            <Button
              size="sm"
              variant={activeView === "diagnostics" ? "default" : "outline"}
              className="rounded-none"
              onClick={() => updateSearch({ view: "diagnostics" })}
            >
              Diagnostics
            </Button>
          </div>
          <Button
            size="sm"
            className="rounded-none"
            onClick={() => {
              setCreateError(null);
              setNewWorkUnitKey("");
              setNewWorkUnitDisplayName("");
              setNewWorkUnitDescription("");
              setIsCreateDialogOpen(true);
            }}
          >
            + Add Work Unit
          </Button>
        </div>
      </section>

      <Dialog
        open={isCreateDialogOpen || isCreateIntentActive}
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open && isCreateIntentActive) {
            clearCreateIntent();
          }
        }}
      >
        <DialogContent className="max-w-md rounded-none">
          <DialogHeader>
            <DialogTitle>Add Work Unit</DialogTitle>
            <DialogDescription>
              Create a new work unit in this methodology version using the minimal lifecycle shell.
            </DialogDescription>
          </DialogHeader>

          <label htmlFor="new-work-unit-key" className="grid gap-1 text-xs">
            <span>Work Unit Key</span>
            <input
              ref={newWorkUnitKeyRef}
              id="new-work-unit-key"
              aria-label="Work Unit Key"
              className="border-input placeholder:text-muted-foreground h-8 w-full rounded-none border bg-transparent px-2.5 py-1 text-xs outline-none"
              value={newWorkUnitKey}
              onChange={(event) => {
                setNewWorkUnitKey(event.target.value);
                if (createError) {
                  setCreateError(null);
                }
              }}
              placeholder="WU.NEW_STEP"
            />
          </label>

          <label htmlFor="new-work-unit-display-name" className="grid gap-1 text-xs">
            <span>Display Name</span>
            <input
              id="new-work-unit-display-name"
              aria-label="Display Name"
              className="border-input placeholder:text-muted-foreground h-8 w-full rounded-none border bg-transparent px-2.5 py-1 text-xs outline-none"
              value={newWorkUnitDisplayName}
              onChange={(event) => {
                setNewWorkUnitDisplayName(event.target.value);
                if (createError) {
                  setCreateError(null);
                }
              }}
              placeholder="New Step"
            />
          </label>

          <label htmlFor="new-work-unit-description" className="grid gap-1 text-xs">
            <span>Description</span>
            <textarea
              id="new-work-unit-description"
              aria-label="Description"
              className="border-input placeholder:text-muted-foreground min-h-20 w-full rounded-none border bg-transparent px-2.5 py-2 text-xs outline-none"
              value={newWorkUnitDescription}
              onChange={(event) => {
                setNewWorkUnitDescription(event.target.value);
                if (createError) {
                  setCreateError(null);
                }
              }}
              placeholder="Operator-facing work unit summary."
            />
          </label>

          {createError ? <p className="text-xs text-destructive">{createError}</p> : null}

          <DialogFooter>
            <Button variant="outline" className="rounded-none" onClick={closeCreateDialog}>
              Cancel
            </Button>
            <Button
              className="rounded-none"
              onClick={() => void handleCreateWorkUnit()}
              disabled={updateDraftLifecycleMutation.isPending}
            >
              Create Work Unit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {draftQuery.isLoading ? (
        <p className="text-sm">Loading work-unit shells for this version...</p>
      ) : null}
      {draftQuery.isError ? (
        <p className="text-sm">
          State: failed - Unable to load work-unit shells. Current methodology/version scope is
          preserved.
        </p>
      ) : null}

      {!draftQuery.isLoading && !draftQuery.isError ? (
        <section className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_22rem]">
          {isGraphView ? (
            <WorkUnitsGraphView
              rows={filteredWorkUnits}
              graph={graphProjection}
              activeWorkUnitKey={activeWorkUnitKey}
              onSelect={(workUnitKey) => updateSearch({ selected: workUnitKey })}
            />
          ) : activeView === "contracts" ? (
            <section className="chiron-frame-flat flex min-h-[28rem] flex-col justify-between p-4">
              <div className="space-y-2">
                <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                  Contracts
                </p>
                <h2 className="text-base font-semibold">Work-unit contract shell</h2>
                <p className="text-sm text-muted-foreground">
                  State: loading contracts overview while preserving selected work-unit context.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Contract details remain anchored to the selected summary and will replace this
                placeholder as Story 3.1 follow-on surfaces land.
              </p>
            </section>
          ) : activeView === "diagnostics" ? (
            <section className="chiron-frame-flat flex min-h-[28rem] flex-col justify-between p-4">
              <div className="space-y-2">
                <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                  Diagnostics
                </p>
                <h2 className="text-base font-semibold">Work-unit diagnostics shell</h2>
                <p className="text-sm text-muted-foreground">
                  State: loading diagnostics overview while preserving selected work-unit context.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Deterministic diagnostics remain version-scoped here until the dedicated findings
                surface replaces this baseline shell.
              </p>
            </section>
          ) : (
            <section className="chiron-frame-flat flex min-h-[28rem] items-center justify-center p-4">
              <p className="text-sm text-muted-foreground">
                State: failed - Unsupported Work Units tab selection.
              </p>
            </section>
          )}

          <WorkUnitsRightRail
            methodologyId={methodologyId}
            versionId={versionId}
            rows={filteredWorkUnits}
            activeWorkUnit={activeWorkUnit}
            activeWorkUnitKey={activeWorkUnitKey}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSelect={(workUnitKey) => updateSearch({ selected: workUnitKey })}
            onOpenRelationshipView={(workUnitKey) =>
              updateSearch({
                view: "graph",
                selected: workUnitKey,
              })
            }
          />
        </section>
      ) : null}
    </MethodologyWorkspaceShell>
  );
}
