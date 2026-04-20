import { useState } from "react";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

import {
  RuntimeConfirmDialog,
  RuntimeFactValueDialog,
  type RuntimeFactOption,
} from "@/components/runtime/runtime-fact-dialogs";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";
import { cn } from "@/lib/utils";

const runtimeWorkUnitFactDetailQueryKey = (
  projectId: string,
  projectWorkUnitId: string,
  factDefinitionId: string,
) => ["runtime-work-unit-fact-detail", projectId, projectWorkUnitId, factDefinitionId] as const;

const runtimeWorkUnitFactsQueryPrefix = (projectId: string, projectWorkUnitId: string) =>
  ["runtime-work-unit-facts", projectId, projectWorkUnitId] as const;

const runtimeWorkUnitOverviewQueryKey = (projectId: string, projectWorkUnitId: string) =>
  ["runtime-work-unit-overview", projectId, projectWorkUnitId] as const;

const runtimeProjectWorkUnitsQueryKey = (projectId: string) =>
  ["runtime-work-units", projectId] as const;

export const Route = createFileRoute(
  "/projects/$projectId/work-units/$projectWorkUnitId/facts/$factDefinitionId",
)({
  component: ProjectWorkUnitFactDetailRoute,
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getWorkUnitOptions(value: unknown, currentProjectWorkUnitId: string): RuntimeFactOption[] {
  if (!isRecord(value) || !Array.isArray(value.rows)) {
    return [];
  }

  return value.rows.flatMap((row) => {
    if (!isRecord(row) || typeof row.projectWorkUnitId !== "string") {
      return [];
    }

    if (row.projectWorkUnitId === currentProjectWorkUnitId) {
      return [];
    }

    const displayIdentity = isRecord(row.displayIdentity) ? row.displayIdentity : null;
    const primaryLabel =
      typeof displayIdentity?.primaryLabel === "string"
        ? displayIdentity.primaryLabel
        : row.projectWorkUnitId;
    const secondaryLabel =
      typeof displayIdentity?.secondaryLabel === "string" ? displayIdentity.secondaryLabel : null;

    return [
      {
        value: row.projectWorkUnitId,
        label: secondaryLabel ? `${primaryLabel} · ${secondaryLabel}` : primaryLabel,
      },
    ];
  });
}

export function ProjectWorkUnitFactDetailRoute() {
  const { projectId, projectWorkUnitId, factDefinitionId } = Route.useParams();
  const { orpc, queryClient } = Route.useRouteContext();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editInstanceId, setEditInstanceId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const workUnitFactDetailQuery = useQuery({
    ...orpc.project.getRuntimeWorkUnitFactDetail.queryOptions({
      input: {
        projectId,
        projectWorkUnitId,
        factDefinitionId,
      },
    }),
    queryKey: runtimeWorkUnitFactDetailQueryKey(projectId, projectWorkUnitId, factDefinitionId),
  });

  const runtimeWorkUnitsQuery = useQuery({
    ...orpc.project.getRuntimeWorkUnits.queryOptions({
      input: {
        projectId,
      },
    }),
    queryKey: runtimeProjectWorkUnitsQueryKey(projectId),
  });

  const invalidateRuntimeFactQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: runtimeWorkUnitFactsQueryPrefix(projectId, projectWorkUnitId),
      }),
      queryClient.invalidateQueries({
        queryKey: runtimeWorkUnitFactDetailQueryKey(projectId, projectWorkUnitId, factDefinitionId),
      }),
      queryClient.invalidateQueries({
        queryKey: runtimeWorkUnitOverviewQueryKey(projectId, projectWorkUnitId),
      }),
    ]);
  };

  const createFactMutation = useMutation(
    orpc.project.createRuntimeWorkUnitFactValue.mutationOptions({
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
    orpc.project.updateRuntimeWorkUnitFactValue.mutationOptions({
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
    orpc.project.deleteRuntimeWorkUnitFactValue.mutationOptions({
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

  const detail = workUnitFactDetailQuery.data;
  const isDependencyFact =
    detail?.factDefinition.factType === "work_unit" || detail?.dependencyState !== undefined;
  const primitiveValues = detail?.primitiveState?.values ?? [];
  const outgoingDependencyValues = detail?.dependencyState?.outgoing ?? [];
  const incomingDependencyValues = detail?.dependencyState?.incoming ?? [];

  const primaryPrimitiveInstance = primitiveValues[0] ?? null;
  const primaryOutgoingDependencyInstance = outgoingDependencyValues[0] ?? null;

  const hasCurrentValue = isDependencyFact
    ? outgoingDependencyValues.length > 0
    : (detail?.primitiveState?.exists ?? false);

  const showCreateControl =
    detail?.actions.canAddInstance === true &&
    (detail.factDefinition.cardinality === "many" || hasCurrentValue === false);
  const showUpdateControl =
    detail?.actions.canUpdateExisting === true &&
    detail.factDefinition.cardinality === "one" &&
    (isDependencyFact
      ? primaryOutgoingDependencyInstance !== null
      : primaryPrimitiveInstance !== null);
  const showDeleteControl = hasCurrentValue;
  const editingPrimitiveInstance =
    primitiveValues.find((valueRow) => valueRow.workUnitFactInstanceId === editInstanceId) ?? null;
  const editingDependencyInstance =
    outgoingDependencyValues.find(
      (valueRow) => valueRow.workUnitFactInstanceId === editInstanceId,
    ) ?? null;
  const workUnitOptions = getWorkUnitOptions(runtimeWorkUnitsQuery.data, projectWorkUnitId);

  const backTab = isDependencyFact ? "work_units" : "primitive";

  return (
    <MethodologyWorkspaceShell
      title="Work unit fact detail"
      segments={[
        { label: "Projects", to: "/projects" },
        {
          label: projectId,
          to: "/projects/$projectId",
          params: { projectId },
        },
        {
          label: "Work Units",
          to: "/projects/$projectId/work-units",
          params: { projectId },
        },
        {
          label: detail?.workUnit.workUnitTypeName ?? projectWorkUnitId,
          to: "/projects/$projectId/work-units/$projectWorkUnitId",
          params: { projectId, projectWorkUnitId },
        },
        {
          label: "Facts",
          to: "/projects/$projectId/work-units/$projectWorkUnitId/facts",
          params: { projectId, projectWorkUnitId },
        },
        { label: detail?.factDefinition.factKey ?? factDefinitionId },
      ]}
    >
      {workUnitFactDetailQuery.isLoading ? <Skeleton className="h-56 w-full rounded-none" /> : null}

      {!workUnitFactDetailQuery.isLoading && detail ? (
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

          {!isDependencyFact ? (
            <section className="space-y-3 border border-border/80 bg-background p-4">
              <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                Current state
              </p>
              <p className="text-sm text-muted-foreground">
                {detail.primitiveState?.exists
                  ? `${detail.primitiveState.currentCount} current value${detail.primitiveState.currentCount === 1 ? "" : "s"}`
                  : "No current value"}
              </p>

              {primitiveValues.length > 0 ? (
                <ul className="space-y-3">
                  {primitiveValues.map((valueRow) => (
                    <li key={valueRow.workUnitFactInstanceId}>
                      <Card
                        frame="flat"
                        tone="runtime"
                        className="border-border/70 bg-background/40"
                      >
                        <CardHeader className="pb-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <CardDescription className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                              Instance {valueRow.workUnitFactInstanceId}
                            </CardDescription>
                            {detail.actions.canUpdateExisting &&
                            detail.factDefinition.cardinality === "many" ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setMutationError(null);
                                  setEditInstanceId(valueRow.workUnitFactInstanceId);
                                }}
                              >
                                Edit instance
                              </Button>
                            ) : null}
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
          ) : (
            <section className="space-y-3 border border-border/80 bg-background p-4">
              <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                Current dependency state
              </p>

              {detail.dependencyState?.dependencyDefinition ? (
                <Card frame="flat" tone="runtime" className="border-border/70 bg-background/40">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                      Dependency definition metadata
                    </CardDescription>
                    <CardTitle className="text-sm">
                      {detail.dependencyState.dependencyDefinition.dependencyDefinitionName ??
                        detail.dependencyState.dependencyDefinition.dependencyDefinitionKey ??
                        detail.dependencyState.dependencyDefinition.dependencyDefinitionId ??
                        "Dependency"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-xs text-muted-foreground">
                    <p>
                      Key:{" "}
                      {detail.dependencyState.dependencyDefinition.dependencyDefinitionKey ?? "—"}
                    </p>
                    <p>
                      ID:{" "}
                      {detail.dependencyState.dependencyDefinition.dependencyDefinitionId ?? "—"}
                    </p>
                  </CardContent>
                </Card>
              ) : null}

              <section className="space-y-2 border border-border/70 bg-background/40 p-3">
                <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                  Outgoing
                </p>

                {outgoingDependencyValues.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No outgoing dependency members.</p>
                ) : (
                  <ul className="space-y-2">
                    {outgoingDependencyValues.map((member) => (
                      <li
                        key={member.workUnitFactInstanceId}
                        className="space-y-2 border border-border/70 p-2"
                      >
                        <p className="text-xs text-muted-foreground">
                          {member.counterpartLabel} · {member.counterpartWorkUnitTypeKey}
                        </p>
                        <p className="text-[0.68rem] text-muted-foreground">
                          Created {member.createdAt}
                        </p>

                        {detail.actions.canUpdateExisting &&
                        detail.factDefinition.cardinality === "many" ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setMutationError(null);
                              setEditInstanceId(member.workUnitFactInstanceId);
                            }}
                          >
                            Edit instance
                          </Button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="space-y-2 border border-border/70 bg-background/40 p-3">
                <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                  Incoming
                </p>

                {incomingDependencyValues.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No incoming dependency members.</p>
                ) : (
                  <ul className="space-y-2">
                    {incomingDependencyValues.map((member) => (
                      <li
                        key={member.workUnitFactInstanceId}
                        className="border border-border/70 p-2"
                      >
                        <p className="text-xs text-muted-foreground">
                          {member.counterpartLabel} · {member.counterpartWorkUnitTypeKey}
                        </p>
                        <p className="text-[0.68rem] text-muted-foreground">
                          Created {member.createdAt}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </section>
          )}

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
                  {detail.factDefinition.cardinality === "one"
                    ? isDependencyFact
                      ? "Set linked work unit"
                      : "Set value"
                    : isDependencyFact
                      ? "Add linked work unit"
                      : "Add instance"}
                </Button>
              </div>
            ) : null}

            {showUpdateControl ? (
              <div className="border border-border/70 bg-background/40 p-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setMutationError(null);
                    setEditInstanceId(
                      isDependencyFact
                        ? (primaryOutgoingDependencyInstance?.workUnitFactInstanceId ?? null)
                        : (primaryPrimitiveInstance?.workUnitFactInstanceId ?? null),
                    );
                  }}
                >
                  {isDependencyFact ? "Replace linked work unit" : "Replace value"}
                </Button>
              </div>
            ) : null}

            {showDeleteControl ? (
              <div className="space-y-2 border border-border/70 bg-background/40 p-3">
                <p className="text-xs text-muted-foreground">
                  Delete logically by writing tombstones for the current work-unit fact value set.
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
                  {isDependencyFact
                    ? outgoingDependencyValues.length === 1
                      ? "Delete linked work unit"
                      : "Delete linked work units"
                    : primitiveValues.length === 1
                      ? "Delete current value"
                      : "Delete current values"}
                </Button>
              </div>
            ) : null}

            {mutationError ? <p className="text-xs text-destructive">{mutationError}</p> : null}
          </section>

          <section>
            <Link
              to="/projects/$projectId/work-units/$projectWorkUnitId/facts"
              params={{ projectId, projectWorkUnitId }}
              search={{
                tab: backTab,
                q: "",
                existence: "all",
                primitiveFactType: "all",
                hasActiveTransition: "all",
              }}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "rounded-none text-[0.72rem] uppercase tracking-[0.12em]",
              )}
            >
              Back to Work Unit Facts
            </Link>
          </section>

          <RuntimeFactValueDialog
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            title={
              detail.factDefinition.cardinality === "one"
                ? isDependencyFact
                  ? "Set linked work unit"
                  : "Set work-unit fact value"
                : isDependencyFact
                  ? "Add linked work unit"
                  : "Add work-unit fact instance"
            }
            description={
              isDependencyFact
                ? "Choose the runtime work unit reference for this fact definition."
                : detail.factDefinition.cardinality === "one"
                  ? "Set the current runtime value for this work-unit fact definition."
                  : "Create a new runtime instance for this work-unit fact definition."
            }
            submitLabel={
              detail.factDefinition.cardinality === "one"
                ? isDependencyFact
                  ? "Set linked work unit"
                  : "Set value"
                : isDependencyFact
                  ? "Create link"
                  : "Create instance"
            }
            editor={
              isDependencyFact
                ? { kind: "work_unit", options: workUnitOptions }
                : {
                    kind: "primitive",
                    definition: {
                      factType: detail.factDefinition.factType,
                      validation: detail.factDefinition.validation,
                    },
                  }
            }
            isPending={createFactMutation.isPending}
            errorMessage={createDialogOpen ? mutationError : null}
            onSubmit={async (value) => {
              if (isDependencyFact) {
                const referencedProjectWorkUnitId =
                  typeof value === "object" && value !== null && "projectWorkUnitId" in value
                    ? String((value as { projectWorkUnitId: string }).projectWorkUnitId)
                    : "";

                await createFactMutation.mutateAsync({
                  projectId,
                  projectWorkUnitId,
                  factDefinitionId,
                  referencedProjectWorkUnitId,
                });
                return;
              }

              await createFactMutation.mutateAsync({
                projectId,
                projectWorkUnitId,
                factDefinitionId,
                value,
              });
            }}
            testId="work-unit-fact-create-dialog"
          />

          {(editingPrimitiveInstance || editingDependencyInstance) && editInstanceId ? (
            <RuntimeFactValueDialog
              open={editInstanceId !== null}
              onOpenChange={(open) => setEditInstanceId(open ? editInstanceId : null)}
              title={
                isDependencyFact
                  ? "Replace linked work unit"
                  : detail.factDefinition.cardinality === "one"
                    ? "Replace work-unit fact value"
                    : "Edit work-unit fact instance"
              }
              description={
                isDependencyFact
                  ? `Update the linked work unit for instance ${editInstanceId}.`
                  : detail.factDefinition.cardinality === "one"
                    ? "Replace the current runtime value for this work-unit fact definition."
                    : `Update instance ${editInstanceId} for this work-unit fact definition.`
              }
              submitLabel={
                isDependencyFact
                  ? "Save link"
                  : detail.factDefinition.cardinality === "one"
                    ? "Replace value"
                    : "Save instance"
              }
              editor={
                isDependencyFact
                  ? { kind: "work_unit", options: workUnitOptions }
                  : {
                      kind: "primitive",
                      definition: {
                        factType: detail.factDefinition.factType,
                        validation: detail.factDefinition.validation,
                      },
                    }
              }
              initialValue={
                isDependencyFact
                  ? editingDependencyInstance
                    ? { projectWorkUnitId: editingDependencyInstance.counterpartProjectWorkUnitId }
                    : undefined
                  : editingPrimitiveInstance?.value
              }
              isPending={updateFactMutation.isPending}
              errorMessage={editInstanceId !== null ? mutationError : null}
              onSubmit={async (value) => {
                if (isDependencyFact && editingDependencyInstance) {
                  const referencedProjectWorkUnitId =
                    typeof value === "object" && value !== null && "projectWorkUnitId" in value
                      ? String((value as { projectWorkUnitId: string }).projectWorkUnitId)
                      : "";

                  await updateFactMutation.mutateAsync({
                    projectId,
                    projectWorkUnitId,
                    factDefinitionId,
                    workUnitFactInstanceId: editingDependencyInstance.workUnitFactInstanceId,
                    referencedProjectWorkUnitId,
                  });
                  return;
                }

                if (editingPrimitiveInstance) {
                  await updateFactMutation.mutateAsync({
                    projectId,
                    projectWorkUnitId,
                    factDefinitionId,
                    workUnitFactInstanceId: editingPrimitiveInstance.workUnitFactInstanceId,
                    value,
                  });
                }
              }}
              testId="work-unit-fact-update-dialog"
            />
          ) : null}

          <RuntimeConfirmDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            title={
              isDependencyFact
                ? outgoingDependencyValues.length === 1
                  ? "Delete linked work unit?"
                  : "Delete linked work units?"
                : primitiveValues.length === 1
                  ? "Delete current work-unit fact value?"
                  : "Delete current work-unit fact values?"
            }
            description="This writes logical-delete tombstones for the current runtime work-unit fact state."
            confirmLabel={
              isDependencyFact
                ? outgoingDependencyValues.length === 1
                  ? "Delete link"
                  : "Delete links"
                : primitiveValues.length === 1
                  ? "Delete value"
                  : "Delete values"
            }
            isPending={deleteFactMutation.isPending}
            errorMessage={deleteDialogOpen ? mutationError : null}
            onConfirm={async () => {
              await deleteFactMutation.mutateAsync({
                projectId,
                projectWorkUnitId,
                factDefinitionId,
              });
            }}
            testId="work-unit-fact-delete-dialog"
          />
        </>
      ) : null}
    </MethodologyWorkspaceShell>
  );
}
