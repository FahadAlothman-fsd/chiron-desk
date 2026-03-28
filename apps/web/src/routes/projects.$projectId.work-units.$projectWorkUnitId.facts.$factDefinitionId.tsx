import { useMemo, useState } from "react";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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

function parseJsonInput(
  value: string,
): { ok: true; parsed: unknown } | { ok: false; error: string } {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "Enter a JSON value before submitting." };
  }

  try {
    return { ok: true, parsed: JSON.parse(trimmed) };
  } catch {
    return { ok: false, error: "Value must be valid JSON (for strings use quotes)." };
  }
}

function parseWorkUnitReferenceInput(
  value: string,
): { ok: true; referencedProjectWorkUnitId: string } | { ok: false; error: string } {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "Enter a linked work unit id before submitting." };
  }

  return { ok: true, referencedProjectWorkUnitId: trimmed };
}

export function ProjectWorkUnitFactDetailRoute() {
  const { projectId, projectWorkUnitId, factDefinitionId } = Route.useParams();
  const { orpc, queryClient } = Route.useRouteContext();

  const [addPrimitiveValueInput, setAddPrimitiveValueInput] = useState("");
  const [setPrimitiveValueInput, setSetPrimitiveValueInput] = useState("");
  const [replacePrimitiveValueByInstance, setReplacePrimitiveValueByInstance] = useState<
    Record<string, string>
  >({});

  const [addLinkedWorkUnitInput, setAddLinkedWorkUnitInput] = useState("");
  const [setLinkedWorkUnitInput, setSetLinkedWorkUnitInput] = useState("");
  const [replaceLinkedWorkUnitByInstance, setReplaceLinkedWorkUnitByInstance] = useState<
    Record<string, string>
  >({});

  const [formError, setFormError] = useState<string | null>(null);

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

  const addFactMutation = useMutation(
    orpc.project.addRuntimeWorkUnitFactValue.mutationOptions({
      onSuccess: async () => {
        setAddPrimitiveValueInput("");
        setAddLinkedWorkUnitInput("");
        setFormError(null);
        await invalidateRuntimeFactQueries();
      },
    }),
  );

  const setFactMutation = useMutation(
    orpc.project.setRuntimeWorkUnitFactValue.mutationOptions({
      onSuccess: async () => {
        setSetPrimitiveValueInput("");
        setSetLinkedWorkUnitInput("");
        setFormError(null);
        await invalidateRuntimeFactQueries();
      },
    }),
  );

  const replaceFactMutation = useMutation(
    orpc.project.replaceRuntimeWorkUnitFactValue.mutationOptions({
      onSuccess: async () => {
        setFormError(null);
        await invalidateRuntimeFactQueries();
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

  const showAddControl =
    detail?.actions.canAddInstance === true &&
    (detail.factDefinition.cardinality === "many" || hasCurrentValue === false);
  const showSetControl =
    detail?.actions.canUpdateExisting === true &&
    detail.factDefinition.cardinality === "one" &&
    (isDependencyFact
      ? primaryOutgoingDependencyInstance !== null
      : primaryPrimitiveInstance !== null);

  const replacePrimitiveInputs = useMemo(
    () =>
      primitiveValues.reduce<Record<string, string>>((acc, valueRow) => {
        acc[valueRow.workUnitFactInstanceId] =
          replacePrimitiveValueByInstance[valueRow.workUnitFactInstanceId] ??
          formatFactValue(valueRow.value);
        return acc;
      }, {}),
    [primitiveValues, replacePrimitiveValueByInstance],
  );

  const replaceLinkedWorkUnitInputs = useMemo(
    () =>
      outgoingDependencyValues.reduce<Record<string, string>>((acc, member) => {
        acc[member.workUnitFactInstanceId] =
          replaceLinkedWorkUnitByInstance[member.workUnitFactInstanceId] ??
          member.counterpartProjectWorkUnitId;
        return acc;
      }, {}),
    [outgoingDependencyValues, replaceLinkedWorkUnitByInstance],
  );

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
                          <CardDescription className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                            Instance {valueRow.workUnitFactInstanceId}
                          </CardDescription>
                          <CardTitle className="text-sm">Current value</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <pre className="whitespace-pre-wrap break-words border border-border/70 bg-background/60 p-2 text-xs text-muted-foreground">
                            {formatFactValue(valueRow.value)}
                          </pre>

                          {detail.actions.canUpdateExisting ? (
                            <form
                              data-testid={`work-unit-fact-replace-form-${valueRow.workUnitFactInstanceId}`}
                              className="space-y-2"
                              onSubmit={async (event) => {
                                event.preventDefault();
                                const candidate = parseJsonInput(
                                  replacePrimitiveInputs[valueRow.workUnitFactInstanceId] ?? "",
                                );

                                if (!candidate.ok) {
                                  setFormError(candidate.error);
                                  return;
                                }

                                await replaceFactMutation.mutateAsync({
                                  projectId,
                                  projectWorkUnitId,
                                  factDefinitionId,
                                  workUnitFactInstanceId: valueRow.workUnitFactInstanceId,
                                  value: candidate.parsed,
                                });
                              }}
                            >
                              <div className="space-y-1 text-xs text-muted-foreground">
                                <p>Value (JSON)</p>
                                <Textarea
                                  value={
                                    replacePrimitiveInputs[valueRow.workUnitFactInstanceId] ?? ""
                                  }
                                  onChange={(event) =>
                                    setReplacePrimitiveValueByInstance((previous) => ({
                                      ...previous,
                                      [valueRow.workUnitFactInstanceId]: event.target.value,
                                    }))
                                  }
                                  className="min-h-24 rounded-none"
                                  aria-label="Value (JSON)"
                                />
                              </div>

                              <button
                                type="submit"
                                className={cn(
                                  buttonVariants({ variant: "outline", size: "sm" }),
                                  "rounded-none uppercase tracking-[0.1em]",
                                )}
                              >
                                Replace value
                              </button>
                            </form>
                          ) : null}
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

                        {detail.actions.canUpdateExisting ? (
                          <form
                            data-testid={`work-unit-fact-replace-form-${member.workUnitFactInstanceId}`}
                            className="space-y-2"
                            onSubmit={async (event) => {
                              event.preventDefault();
                              const candidate = parseWorkUnitReferenceInput(
                                replaceLinkedWorkUnitInputs[member.workUnitFactInstanceId] ?? "",
                              );

                              if (!candidate.ok) {
                                setFormError(candidate.error);
                                return;
                              }

                              await replaceFactMutation.mutateAsync({
                                projectId,
                                projectWorkUnitId,
                                factDefinitionId,
                                workUnitFactInstanceId: member.workUnitFactInstanceId,
                                referencedProjectWorkUnitId: candidate.referencedProjectWorkUnitId,
                              });
                            }}
                          >
                            <div className="space-y-1 text-xs text-muted-foreground">
                              <p>Linked work unit id</p>
                              <Input
                                value={
                                  replaceLinkedWorkUnitInputs[member.workUnitFactInstanceId] ?? ""
                                }
                                onChange={(event) =>
                                  setReplaceLinkedWorkUnitByInstance((previous) => ({
                                    ...previous,
                                    [member.workUnitFactInstanceId]: event.target.value,
                                  }))
                                }
                                aria-label="Linked work unit id"
                              />
                            </div>

                            <button
                              type="submit"
                              className={cn(
                                buttonVariants({ variant: "outline", size: "sm" }),
                                "rounded-none uppercase tracking-[0.1em]",
                              )}
                            >
                              Replace linked work unit
                            </button>
                          </form>
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

            {showAddControl ? (
              !isDependencyFact ? (
                <form
                  data-testid="work-unit-fact-add-form"
                  className="space-y-2 border border-border/70 bg-background/40 p-3"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const candidate = parseJsonInput(addPrimitiveValueInput);

                    if (!candidate.ok) {
                      setFormError(candidate.error);
                      return;
                    }

                    await addFactMutation.mutateAsync({
                      projectId,
                      projectWorkUnitId,
                      factDefinitionId,
                      value: candidate.parsed,
                    });
                  }}
                >
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>Value (JSON)</p>
                    <Textarea
                      value={addPrimitiveValueInput}
                      onChange={(event) => setAddPrimitiveValueInput(event.target.value)}
                      className="min-h-24 rounded-none"
                      aria-label="Value (JSON)"
                    />
                  </div>

                  <button
                    type="submit"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "rounded-none uppercase tracking-[0.1em]",
                    )}
                  >
                    {detail.factDefinition.cardinality === "one" ? "Set value" : "Add instance"}
                  </button>
                </form>
              ) : (
                <form
                  data-testid="work-unit-fact-add-form"
                  className="space-y-2 border border-border/70 bg-background/40 p-3"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const candidate = parseWorkUnitReferenceInput(addLinkedWorkUnitInput);

                    if (!candidate.ok) {
                      setFormError(candidate.error);
                      return;
                    }

                    await addFactMutation.mutateAsync({
                      projectId,
                      projectWorkUnitId,
                      factDefinitionId,
                      referencedProjectWorkUnitId: candidate.referencedProjectWorkUnitId,
                    });
                  }}
                >
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>Linked work unit id</p>
                    <Input
                      value={addLinkedWorkUnitInput}
                      onChange={(event) => setAddLinkedWorkUnitInput(event.target.value)}
                      aria-label="Linked work unit id"
                    />
                  </div>

                  <button
                    type="submit"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "rounded-none uppercase tracking-[0.1em]",
                    )}
                  >
                    {detail.factDefinition.cardinality === "one"
                      ? "Set linked work unit"
                      : "Add linked work unit"}
                  </button>
                </form>
              )
            ) : null}

            {showSetControl ? (
              !isDependencyFact ? (
                primaryPrimitiveInstance ? (
                  <form
                    data-testid="work-unit-fact-set-form"
                    className="space-y-2 border border-border/70 bg-background/40 p-3"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      const candidate = parseJsonInput(setPrimitiveValueInput);

                      if (!candidate.ok) {
                        setFormError(candidate.error);
                        return;
                      }

                      await setFactMutation.mutateAsync({
                        projectId,
                        projectWorkUnitId,
                        factDefinitionId,
                        workUnitFactInstanceId: primaryPrimitiveInstance.workUnitFactInstanceId,
                        value: candidate.parsed,
                      });
                    }}
                  >
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>Value (JSON)</p>
                      <Textarea
                        value={setPrimitiveValueInput}
                        onChange={(event) => setSetPrimitiveValueInput(event.target.value)}
                        className="min-h-24 rounded-none"
                        aria-label="Value (JSON)"
                      />
                    </div>

                    <button
                      type="submit"
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                        "rounded-none uppercase tracking-[0.1em]",
                      )}
                    >
                      Set value
                    </button>
                  </form>
                ) : null
              ) : primaryOutgoingDependencyInstance ? (
                <form
                  data-testid="work-unit-fact-set-form"
                  className="space-y-2 border border-border/70 bg-background/40 p-3"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const candidate = parseWorkUnitReferenceInput(setLinkedWorkUnitInput);

                    if (!candidate.ok) {
                      setFormError(candidate.error);
                      return;
                    }

                    await setFactMutation.mutateAsync({
                      projectId,
                      projectWorkUnitId,
                      factDefinitionId,
                      workUnitFactInstanceId:
                        primaryOutgoingDependencyInstance.workUnitFactInstanceId,
                      referencedProjectWorkUnitId: candidate.referencedProjectWorkUnitId,
                    });
                  }}
                >
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>Linked work unit id</p>
                    <Input
                      value={setLinkedWorkUnitInput}
                      onChange={(event) => setSetLinkedWorkUnitInput(event.target.value)}
                      aria-label="Linked work unit id"
                    />
                  </div>

                  <button
                    type="submit"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "rounded-none uppercase tracking-[0.1em]",
                    )}
                  >
                    Set linked work unit
                  </button>
                </form>
              ) : null
            ) : null}

            {formError ? <p className="text-xs text-destructive">{formError}</p> : null}
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
        </>
      ) : null}
    </MethodologyWorkspaceShell>
  );
}
