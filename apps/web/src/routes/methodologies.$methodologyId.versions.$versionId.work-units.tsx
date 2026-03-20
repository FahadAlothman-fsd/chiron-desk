import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Outlet, createFileRoute, useLocation } from "@tanstack/react-router";
import { Layers3Icon, RectangleHorizontalIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Result } from "better-result";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkUnitsListView } from "@/features/methodologies/work-units-list-view";
import { deriveWorkUnitsPageRows } from "@/features/methodologies/work-units-page-selectors";
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
      .passthrough()
      .parse(search),
  component: MethodologyVersionWorkUnitsRoute,
});

type WorkUnitFormValues = {
  key: string;
  displayName: string;
  description: string;
  cardinality: "one_per_project" | "many_per_project";
  humanGuidance: string;
  agentGuidance: string;
};

const emptyWorkUnitFormValues: WorkUnitFormValues = {
  key: "",
  displayName: "",
  description: "",
  cardinality: "many_per_project",
  humanGuidance: "",
  agentGuidance: "",
};

function extractWorkUnitText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (
    value &&
    typeof value === "object" &&
    typeof (value as { text?: unknown }).text === "string"
  ) {
    return (value as { text: string }).text;
  }

  return "";
}

export function MethodologyVersionWorkUnitsRoute() {
  const { methodologyId, versionId } = Route.useParams();
  const location = useLocation();
  const search = Route.useSearch();
  const { orpc } = Route.useRouteContext();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();

  const workUnitsPath = `/methodologies/${methodologyId}/versions/${versionId}/work-units`;
  const isChildDetailRoute =
    location.pathname !== workUnitsPath && location.pathname !== `${workUnitsPath}/`;

  const detailsQueryOptions = orpc.methodology.getMethodologyDetails.queryOptions({
    input: { methodologyKey: methodologyId },
  });
  const draftQueryOptions = orpc.methodology.version.workUnit.list.queryOptions({
    input: { versionId },
  });

  const detailsQuery = useQuery(detailsQueryOptions);

  const draftQuery = useQuery(draftQueryOptions);

  const draftProjection = (draftQuery.data ?? null) as {
    factDefinitions?: ReadonlyArray<{
      key?: string;
      name?: string;
      factType?: "string" | "number" | "boolean" | "json";
      description?: string;
      guidance?: {
        human?: { markdown?: string; short?: string; long?: string };
        agent?: { markdown?: string; intent?: string };
      };
      validation?: unknown;
    }>;
    workUnitTypes?: ReadonlyArray<{
      key?: string;
      displayName?: string;
      description?: unknown;
      guidance?: {
        human?: { markdown?: string };
        agent?: { markdown?: string };
      };
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
  const [editingWorkUnitKey, setEditingWorkUnitKey] = useState<string | null>(null);
  const [createDialogTab, setCreateDialogTab] = useState<"contract" | "guidance">("contract");
  const [newWorkUnitKey, setNewWorkUnitKey] = useState("");
  const [newWorkUnitDisplayName, setNewWorkUnitDisplayName] = useState("");
  const [newWorkUnitDescription, setNewWorkUnitDescription] = useState("");
  const [newWorkUnitCardinality, setNewWorkUnitCardinality] = useState<
    "one_per_project" | "many_per_project"
  >("many_per_project");
  const [newWorkUnitHumanGuidance, setNewWorkUnitHumanGuidance] = useState("");
  const [newWorkUnitAgentGuidance, setNewWorkUnitAgentGuidance] = useState("");
  const [initialWorkUnitFormValues, setInitialWorkUnitFormValues] =
    useState<WorkUnitFormValues>(emptyWorkUnitFormValues);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);
  const newWorkUnitKeyRef = useRef<HTMLInputElement | null>(null);

  const isContractTabDirty =
    newWorkUnitKey !== initialWorkUnitFormValues.key ||
    newWorkUnitDisplayName !== initialWorkUnitFormValues.displayName ||
    newWorkUnitDescription !== initialWorkUnitFormValues.description ||
    newWorkUnitCardinality !== initialWorkUnitFormValues.cardinality;

  const isGuidanceTabDirty =
    newWorkUnitHumanGuidance !== initialWorkUnitFormValues.humanGuidance ||
    newWorkUnitAgentGuidance !== initialWorkUnitFormValues.agentGuidance;

  const isCreateDialogDirty = isContractTabDirty || isGuidanceTabDirty;

  const createWorkUnitMutation = useMutation(
    orpc.methodology.version.workUnit.create.mutationOptions(),
  );
  const updateWorkUnitMutation = useMutation(
    orpc.methodology.version.workUnit.updateMeta.mutationOptions(),
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

  const activeWorkUnitKey = search.selected ?? null;
  const isCreateIntentActive = search.intent === "add-work-unit";

  const existingWorkUnitTypes = useMemo(
    () => (Array.isArray(draftProjection?.workUnitTypes) ? draftProjection.workUnitTypes : []),
    [draftProjection?.workUnitTypes],
  );

  const isEditMode = editingWorkUnitKey !== null;

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

  const openWorkUnitDetails = (workUnitKey: string) => {
    void navigate({
      to: "/methodologies/$methodologyId/versions/$versionId/work-units/$workUnitKey",
      params: {
        methodologyId,
        versionId,
        workUnitKey,
      },
    });
  };

  const clearCreateIntent = () => updateSearch({});

  const resetWorkUnitFormState = (values: WorkUnitFormValues) => {
    setNewWorkUnitKey(values.key);
    setNewWorkUnitDisplayName(values.displayName);
    setNewWorkUnitDescription(values.description);
    setNewWorkUnitCardinality(values.cardinality);
    setNewWorkUnitHumanGuidance(values.humanGuidance);
    setNewWorkUnitAgentGuidance(values.agentGuidance);
    setInitialWorkUnitFormValues(values);
    setCreateDialogTab("contract");
    setCreateError(null);
  };

  const closeCreateDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingWorkUnitKey(null);
    resetWorkUnitFormState(emptyWorkUnitFormValues);
    setIsDiscardDialogOpen(false);
    if (isCreateIntentActive) {
      clearCreateIntent();
    }
  };

  const requestCloseCreateDialog = () => {
    if (isCreateDialogDirty) {
      setIsDiscardDialogOpen(true);
      return;
    }

    closeCreateDialog();
  };

  const handleCreateWorkUnit = async () => {
    const nextKey = (newWorkUnitKeyRef.current?.value ?? newWorkUnitKey).trim();
    const nextDisplayName = newWorkUnitDisplayName.trim() || nextKey;
    const nextDescription = newWorkUnitDescription.trim();
    const nextHumanGuidance = newWorkUnitHumanGuidance.trim();
    const nextAgentGuidance = newWorkUnitAgentGuidance.trim();
    if (!nextKey) {
      setCreateError("Work Unit Key is required.");
      return;
    }

    const keyAlreadyExists = existingWorkUnitTypes.some(
      (workUnit) => workUnit?.key === nextKey && workUnit?.key !== editingWorkUnitKey,
    );
    if (keyAlreadyExists) {
      setCreateError("Work Unit Key must be unique.");
      return;
    }

    setCreateError(null);

    const mutationResult = await Result.tryPromise({
      try: async () => {
        if (isEditMode && editingWorkUnitKey) {
          await updateWorkUnitMutation.mutateAsync({
            versionId,
            workUnitKey: editingWorkUnitKey,
            workUnitType: {
              key: nextKey,
              displayName: nextDisplayName,
              description: nextDescription,
              guidance:
                nextHumanGuidance || nextAgentGuidance
                  ? {
                      human: { markdown: nextHumanGuidance },
                      agent: { markdown: nextAgentGuidance },
                    }
                  : undefined,
              cardinality: newWorkUnitCardinality,
            },
          });
        } else {
          await createWorkUnitMutation.mutateAsync({
            versionId,
            workUnitType: {
              key: nextKey,
              displayName: nextDisplayName,
              description: nextDescription,
              guidance:
                nextHumanGuidance || nextAgentGuidance
                  ? {
                      human: { markdown: nextHumanGuidance },
                      agent: { markdown: nextAgentGuidance },
                    }
                  : undefined,
              cardinality: newWorkUnitCardinality,
            },
          });
        }

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: draftQueryOptions.queryKey }),
          queryClient.invalidateQueries({ queryKey: detailsQueryOptions.queryKey }),
        ]);
      },
      catch: (error: unknown) => error,
    });

    if (mutationResult.isErr()) {
      setCreateError(
        isEditMode
          ? "Unable to save work unit changes. Review the current draft definitions and try again."
          : "Unable to create work unit. Review the current draft definitions and try again.",
      );
      return;
    }

    closeCreateDialog();
    updateSearch({ selected: nextKey });
    toast.success(isEditMode ? "Work unit updated." : "Work unit created.");
  };

  const openCreateDialog = () => {
    setEditingWorkUnitKey(null);
    resetWorkUnitFormState(emptyWorkUnitFormValues);
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (workUnitKey: string) => {
    const workUnit = existingWorkUnitTypes.find((candidate) => candidate?.key === workUnitKey);
    if (!workUnit) {
      return;
    }

    setEditingWorkUnitKey(workUnitKey);
    resetWorkUnitFormState({
      key: workUnit.key ?? "",
      displayName: workUnit.displayName ?? "",
      description: extractWorkUnitText(workUnit.description),
      cardinality: workUnit.cardinality ?? "many_per_project",
      humanGuidance: workUnit.guidance?.human?.markdown ?? "",
      agentGuidance: workUnit.guidance?.agent?.markdown ?? "",
    });
    setIsCreateDialogOpen(true);
  };

  useEffect(() => {
    if (isCreateIntentActive && !isCreateDialogOpen && !isEditMode) {
      setEditingWorkUnitKey(null);
      setNewWorkUnitKey("");
      setNewWorkUnitDisplayName("");
      setNewWorkUnitDescription("");
      setNewWorkUnitCardinality("many_per_project");
      setNewWorkUnitHumanGuidance("");
      setNewWorkUnitAgentGuidance("");
      setInitialWorkUnitFormValues(emptyWorkUnitFormValues);
      setCreateDialogTab("contract");
      setCreateError(null);
      setIsCreateDialogOpen(true);
    }
  }, [isCreateDialogOpen, isCreateIntentActive, isEditMode]);

  return isChildDetailRoute ? (
    <Outlet />
  ) : (
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
          <input
            className="h-8 w-full rounded-none border border-border/70 bg-background px-2.5 text-sm md:max-w-sm"
            placeholder="Search work units..."
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          <Button size="sm" className="rounded-none" onClick={openCreateDialog}>
            + Add Work Unit
          </Button>
        </div>
      </section>

      <Dialog
        open={isCreateDialogOpen || isCreateIntentActive}
        onOpenChange={(open) => {
          if (open) {
            return;
          }

          requestCloseCreateDialog();
        }}
      >
        <DialogContent
          className="max-w-[95vw] rounded-none p-0 sm:max-w-5xl lg:max-w-6xl"
          showCloseButton
        >
          <DialogHeader className="gap-0 border-b border-border p-4 pr-12 pb-3">
            <DialogTitle className="text-sm font-semibold uppercase tracking-[0.18em]">
              {isEditMode ? "Edit Work Unit" : "Add Work Unit"}
            </DialogTitle>
            <DialogDescription className="mt-2 text-xs text-muted-foreground">
              {isEditMode
                ? "Update the selected work unit metadata while preserving its lifecycle structure."
                : "Create a new work unit in this methodology version using the minimal lifecycle shell."}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex flex-wrap gap-2 border-b border-border px-4 pb-3">
            <Button
              type="button"
              size="sm"
              variant={createDialogTab === "contract" ? "default" : "outline"}
              className="rounded-none"
              onClick={() => setCreateDialogTab("contract")}
            >
              Contract
              {isContractTabDirty ? (
                <span
                  data-testid="work-unit-contract-modified-indicator"
                  className="ml-1 text-[0.85rem] leading-none"
                >
                  *
                </span>
              ) : null}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={createDialogTab === "guidance" ? "default" : "outline"}
              className="rounded-none"
              onClick={() => setCreateDialogTab("guidance")}
            >
              Guidance
              {isGuidanceTabDirty ? (
                <span
                  data-testid="work-unit-guidance-modified-indicator"
                  className="ml-1 text-[0.85rem] leading-none"
                >
                  *
                </span>
              ) : null}
            </Button>
          </div>

          <div className="space-y-3 p-4 pt-3">
            {createDialogTab === "contract" ? (
              <>
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

                <fieldset className="grid gap-2 text-xs" aria-label="Cardinality">
                  <legend className="text-xs">Cardinality</legend>
                  <div className="grid gap-2 md:grid-cols-2">
                    <button
                      type="button"
                      className={[
                        "rounded-none border p-3 text-left transition-colors",
                        newWorkUnitCardinality === "many_per_project"
                          ? "border-primary bg-primary/10"
                          : "border-border/70 hover:bg-accent/40",
                      ].join(" ")}
                      aria-pressed={newWorkUnitCardinality === "many_per_project"}
                      onClick={() => {
                        setNewWorkUnitCardinality("many_per_project");
                        if (createError) {
                          setCreateError(null);
                        }
                      }}
                    >
                      <Card className="rounded-none border-0 bg-transparent shadow-none">
                        <CardHeader className="p-0">
                          <CardTitle className="flex items-center gap-2 text-sm">
                            <Layers3Icon className="size-4" aria-hidden="true" />
                            Many per project
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 pt-1 text-xs text-muted-foreground">
                          Create multiple instances of this work unit in a project lifecycle.
                        </CardContent>
                      </Card>
                    </button>
                    <button
                      type="button"
                      className={[
                        "rounded-none border p-3 text-left transition-colors",
                        newWorkUnitCardinality === "one_per_project"
                          ? "border-primary bg-primary/10"
                          : "border-border/70 hover:bg-accent/40",
                      ].join(" ")}
                      aria-pressed={newWorkUnitCardinality === "one_per_project"}
                      onClick={() => {
                        setNewWorkUnitCardinality("one_per_project");
                        if (createError) {
                          setCreateError(null);
                        }
                      }}
                    >
                      <Card className="rounded-none border-0 bg-transparent shadow-none">
                        <CardHeader className="p-0">
                          <CardTitle className="flex items-center gap-2 text-sm">
                            <RectangleHorizontalIcon className="size-4" aria-hidden="true" />
                            One per project
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 pt-1 text-xs text-muted-foreground">
                          Limit this work unit to a single instance per project lifecycle.
                        </CardContent>
                      </Card>
                    </button>
                  </div>
                </fieldset>
              </>
            ) : (
              <>
                <label htmlFor="new-work-unit-human-guidance" className="grid gap-1 text-xs">
                  <span>Human Guidance</span>
                  <textarea
                    id="new-work-unit-human-guidance"
                    aria-label="Human Guidance"
                    className="border-input placeholder:text-muted-foreground min-h-20 w-full rounded-none border bg-transparent px-2.5 py-2 text-xs outline-none"
                    value={newWorkUnitHumanGuidance}
                    onChange={(event) => {
                      setNewWorkUnitHumanGuidance(event.target.value);
                      if (createError) {
                        setCreateError(null);
                      }
                    }}
                    placeholder="Guidance for operators working this work unit."
                  />
                </label>

                <label htmlFor="new-work-unit-agent-guidance" className="grid gap-1 text-xs">
                  <span>Agent Guidance</span>
                  <textarea
                    id="new-work-unit-agent-guidance"
                    aria-label="Agent Guidance"
                    className="border-input placeholder:text-muted-foreground min-h-20 w-full rounded-none border bg-transparent px-2.5 py-2 text-xs outline-none"
                    value={newWorkUnitAgentGuidance}
                    onChange={(event) => {
                      setNewWorkUnitAgentGuidance(event.target.value);
                      if (createError) {
                        setCreateError(null);
                      }
                    }}
                    placeholder="Guidance for automated agents running this work unit."
                  />
                </label>
              </>
            )}

            {createError ? <p className="text-xs text-destructive">{createError}</p> : null}
          </div>

          <Separator className="bg-border" />

          <DialogFooter className="mt-0 px-4 py-3 sm:justify-end">
            <Button variant="outline" className="rounded-none" onClick={requestCloseCreateDialog}>
              Cancel
            </Button>
            <Button
              className="rounded-none"
              onClick={() => void handleCreateWorkUnit()}
              disabled={createWorkUnitMutation.isPending || updateWorkUnitMutation.isPending}
            >
              {isEditMode ? "Save Work Unit Changes" : "Create Work Unit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDiscardDialogOpen} onOpenChange={setIsDiscardDialogOpen}>
        <DialogContent className="max-w-md rounded-none">
          <DialogHeader>
            <DialogTitle>Discard unsaved changes?</DialogTitle>
            <DialogDescription>
              You have unsaved work-unit edits. Discarding now will close the dialog and lose those
              changes.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-none"
              onClick={() => setIsDiscardDialogOpen(false)}
            >
              Keep Editing
            </Button>
            <Button className="rounded-none" onClick={closeCreateDialog}>
              Discard Changes
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
        <section className="grid gap-3">
          <WorkUnitsListView
            rows={filteredWorkUnits}
            activeWorkUnitKey={activeWorkUnitKey}
            onViewDetails={openWorkUnitDetails}
            onEdit={openEditDialog}
          />
        </section>
      ) : null}
    </MethodologyWorkspaceShell>
  );
}
