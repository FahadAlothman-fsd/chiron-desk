import { useState } from "react";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

import {
  RuntimeConfirmDialog,
  RuntimeFactValueDialog,
} from "@/components/runtime/runtime-fact-dialogs";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";
import { cn } from "@/lib/utils";

const runtimeProjectFactDetailQueryKey = (projectId: string, factDefinitionId: string) =>
  ["runtime-project-fact-detail", projectId, factDefinitionId] as const;

const runtimeProjectFactsQueryPrefix = (projectId: string) =>
  ["runtime-project-facts", projectId] as const;

const runtimeOverviewQueryKey = (projectId: string) => ["runtime-overview", projectId] as const;

export const Route = createFileRoute("/projects/$projectId/facts/$factDefinitionId")({
  component: ProjectFactDetailRoute,
});

function formatFactValue(value: unknown): string {
  if (value === null) {
    return "null";
  }
  if (value === undefined) {
    return "undefined";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "[unserializable]";
  }
}

function getMutationErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = error.message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }

  return "Unable to save the runtime fact change.";
}

export function ProjectFactDetailRoute() {
  const { projectId, factDefinitionId } = Route.useParams();
  const { orpc, queryClient } = Route.useRouteContext();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editInstanceId, setEditInstanceId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const projectFactDetailQuery = useQuery({
    ...orpc.project.getRuntimeProjectFactDetail.queryOptions({
      input: { projectId, factDefinitionId },
    }),
    queryKey: runtimeProjectFactDetailQueryKey(projectId, factDefinitionId),
  });

  const invalidateRuntimeFactQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: runtimeProjectFactsQueryPrefix(projectId) }),
      queryClient.invalidateQueries({
        queryKey: runtimeProjectFactDetailQueryKey(projectId, factDefinitionId),
      }),
      queryClient.invalidateQueries({ queryKey: runtimeOverviewQueryKey(projectId) }),
    ]);
  };

  const createFactMutation = useMutation(
    orpc.project.createRuntimeProjectFactValue.mutationOptions({
      onSuccess: async () => {
        setCreateDialogOpen(false);
        setMutationError(null);
        await invalidateRuntimeFactQueries();
      },
      onError: (error) => {
        setMutationError(getMutationErrorMessage(error));
      },
    }),
  );

  const updateFactMutation = useMutation(
    orpc.project.updateRuntimeProjectFactValue.mutationOptions({
      onSuccess: async () => {
        setEditInstanceId(null);
        setMutationError(null);
        await invalidateRuntimeFactQueries();
      },
      onError: (error) => {
        setMutationError(getMutationErrorMessage(error));
      },
    }),
  );

  const deleteFactMutation = useMutation(
    orpc.project.deleteRuntimeProjectFactValue.mutationOptions({
      onSuccess: async () => {
        setDeleteDialogOpen(false);
        setMutationError(null);
        await invalidateRuntimeFactQueries();
      },
      onError: (error) => {
        setMutationError(getMutationErrorMessage(error));
      },
    }),
  );

  const detail = projectFactDetailQuery.data;
  const primaryInstance = detail?.currentState.values[0] ?? null;
  const showCreateControl =
    detail?.actions.canAddInstance === true &&
    (detail.factDefinition.cardinality === "many" || detail.currentState.exists === false);
  const showUpdateControl =
    detail?.actions.canUpdateExisting === true &&
    detail.factDefinition.cardinality === "one" &&
    primaryInstance !== null;
  const showDeleteControl = (detail?.currentState.values.length ?? 0) > 0;
  const editingInstance =
    detail?.currentState.values.find((valueRow) => valueRow.instanceId === editInstanceId) ?? null;

  return (
    <MethodologyWorkspaceShell
      title="Project fact detail"
      segments={[
        { label: "Projects", to: "/projects" },
        {
          label: detail?.project.name ?? projectId,
          to: "/projects/$projectId",
          params: { projectId },
        },
        {
          label: "Facts",
          to: "/projects/$projectId/facts",
          params: { projectId },
        },
        { label: detail?.factDefinition.factKey ?? factDefinitionId },
      ]}
    >
      {projectFactDetailQuery.isLoading ? <Skeleton className="h-56 w-full rounded-none" /> : null}

      {!projectFactDetailQuery.isLoading && detail ? (
        <>
          <section className="space-y-3 border border-border/80 bg-background p-4">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
              Definition metadata
            </p>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                  Key
                </p>
                <p className="text-sm font-medium">{detail.factDefinition.factKey}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                  Name
                </p>
                <p className="text-sm">{detail.factDefinition.factName ?? "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                  Type
                </p>
                <p className="text-sm">{detail.factDefinition.factType}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                  Cardinality
                </p>
                <p className="text-sm">{detail.factDefinition.cardinality}</p>
              </div>
            </div>

            {detail.factDefinition.description !== undefined ? (
              <Card frame="flat" tone="runtime" className="border-border/70 bg-background/40">
                <CardHeader className="pb-2">
                  <CardDescription className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                    Description
                  </CardDescription>
                  <CardTitle className="text-sm">Definition details</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap break-words text-xs text-muted-foreground">
                    {formatFactValue(detail.factDefinition.description)}
                  </pre>
                </CardContent>
              </Card>
            ) : null}
          </section>

          <section className="space-y-3 border border-border/80 bg-background p-4">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
              Current state
            </p>
            <p className="text-sm text-muted-foreground">
              {detail.currentState.exists
                ? `${detail.currentState.currentCount} current value${detail.currentState.currentCount === 1 ? "" : "s"}`
                : "No current value"}
            </p>

            {detail.currentState.values.length > 0 ? (
              <ul className="space-y-3">
                {detail.currentState.values.map((valueRow) => (
                  <li key={valueRow.instanceId}>
                    <Card frame="flat" tone="runtime" className="border-border/70 bg-background/40">
                      <CardHeader className="pb-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <CardDescription className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                            Instance {valueRow.instanceId}
                          </CardDescription>
                          <div className="flex flex-wrap gap-2">
                            <span className="border border-primary/50 bg-primary/15 px-2 py-1 text-[0.62rem] uppercase tracking-[0.12em] text-primary">
                              Active
                            </span>
                            {detail.actions.canUpdateExisting &&
                            detail.factDefinition.cardinality === "many" ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setMutationError(null);
                                  setEditInstanceId(valueRow.instanceId);
                                }}
                              >
                                Edit instance
                              </Button>
                            ) : null}
                          </div>
                        </div>
                        <CardTitle className="text-sm">Current value</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <pre className="whitespace-pre-wrap break-words border border-border/70 bg-background/60 p-2 text-xs text-muted-foreground">
                          {formatFactValue(valueRow.value)}
                        </pre>
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="space-y-2 border border-border/80 bg-background p-4">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
              Manual runtime CRUD
            </p>
            <p className="text-sm text-muted-foreground">
              Dialogs are the canonical manual CRUD surface here. Single-cardinality facts use a
              direct set or replace dialog. Multi-cardinality facts keep an instance list with
              per-instance edit dialogs.
            </p>
          </section>

          <section className="space-y-3 border border-border/80 bg-background p-4">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
              Actions
            </p>

            {showCreateControl ? (
              <div className="border border-border/70 bg-background/40 p-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setMutationError(null);
                    setCreateDialogOpen(true);
                  }}
                >
                  {detail.factDefinition.cardinality === "one" ? "Set value" : "Add instance"}
                </Button>
              </div>
            ) : null}

            {showUpdateControl && primaryInstance ? (
              <div className="border border-border/70 bg-background/40 p-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setMutationError(null);
                    setEditInstanceId(primaryInstance.instanceId);
                  }}
                >
                  Replace value
                </Button>
              </div>
            ) : null}

            {showDeleteControl ? (
              <div className="space-y-2 border border-border/70 bg-background/40 p-3">
                <p className="text-xs text-muted-foreground">
                  Delete logically by writing tombstones for the current value set.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setMutationError(null);
                    setDeleteDialogOpen(true);
                  }}
                >
                  {detail.currentState.currentCount === 1
                    ? "Delete current value"
                    : "Delete current values"}
                </Button>
              </div>
            ) : null}

            {mutationError ? <p className="text-xs text-destructive">{mutationError}</p> : null}
          </section>

          <section>
            <Link
              to="/projects/$projectId/facts"
              params={{ projectId }}
              search={{ q: "", existence: "all", factType: "all" }}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "rounded-none text-[0.72rem] uppercase tracking-[0.12em]",
              )}
            >
              Back to Project Facts
            </Link>
          </section>

          <RuntimeFactValueDialog
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            title={
              detail.factDefinition.cardinality === "one"
                ? "Set project fact value"
                : "Add project fact instance"
            }
            description={
              detail.factDefinition.cardinality === "one"
                ? "Set the current value for this project fact definition."
                : "Create a new runtime instance for this project fact definition."
            }
            submitLabel={
              detail.factDefinition.cardinality === "one" ? "Set value" : "Create instance"
            }
            editor={{
              kind: "primitive",
              definition: {
                factType: detail.factDefinition.factType,
                validation: detail.factDefinition.validation,
              },
            }}
            isPending={createFactMutation.isPending}
            errorMessage={createDialogOpen ? mutationError : null}
            onSubmit={async (value) => {
              await createFactMutation.mutateAsync({
                projectId,
                factDefinitionId,
                value,
              });
            }}
            testId="project-fact-create-dialog"
          />

          {editingInstance ? (
            <RuntimeFactValueDialog
              open={editInstanceId !== null}
              onOpenChange={(open) => setEditInstanceId(open ? editingInstance.instanceId : null)}
              title={
                detail.factDefinition.cardinality === "one"
                  ? "Replace project fact value"
                  : "Edit project fact instance"
              }
              description={
                detail.factDefinition.cardinality === "one"
                  ? "Replace the current value for this single-cardinality project fact."
                  : `Update instance ${editingInstance.instanceId} for this project fact definition.`
              }
              submitLabel={
                detail.factDefinition.cardinality === "one" ? "Replace value" : "Save instance"
              }
              editor={{
                kind: "primitive",
                definition: {
                  factType: detail.factDefinition.factType,
                  validation: detail.factDefinition.validation,
                },
              }}
              initialValue={editingInstance.value}
              isPending={updateFactMutation.isPending}
              errorMessage={editInstanceId !== null ? mutationError : null}
              onSubmit={async (value) => {
                await updateFactMutation.mutateAsync({
                  projectId,
                  factDefinitionId,
                  projectFactInstanceId: editingInstance.instanceId,
                  value,
                });
              }}
              testId="project-fact-update-dialog"
            />
          ) : null}

          <RuntimeConfirmDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            title={
              detail.currentState.currentCount === 1
                ? "Delete current project fact value?"
                : "Delete current project fact values?"
            }
            description="This writes logical-delete tombstones for the current runtime project fact state."
            confirmLabel={detail.currentState.currentCount === 1 ? "Delete value" : "Delete values"}
            isPending={deleteFactMutation.isPending}
            errorMessage={deleteDialogOpen ? mutationError : null}
            onConfirm={async () => {
              await deleteFactMutation.mutateAsync({ projectId, factDefinitionId });
            }}
            testId="project-fact-delete-dialog"
          />
        </>
      ) : null}
    </MethodologyWorkspaceShell>
  );
}
