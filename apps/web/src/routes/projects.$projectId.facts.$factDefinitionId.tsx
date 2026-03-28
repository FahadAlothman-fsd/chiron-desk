import { useMemo, useState } from "react";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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

export function ProjectFactDetailRoute() {
  const { projectId, factDefinitionId } = Route.useParams();
  const { orpc, queryClient } = Route.useRouteContext();

  const [addValueInput, setAddValueInput] = useState("");
  const [setValueInput, setSetValueInput] = useState("");
  const [replaceValueByInstance, setReplaceValueByInstance] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

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

  const addFactMutation = useMutation(
    orpc.project.addRuntimeProjectFactValue.mutationOptions({
      onSuccess: async () => {
        setAddValueInput("");
        setFormError(null);
        await invalidateRuntimeFactQueries();
      },
    }),
  );

  const setFactMutation = useMutation(
    orpc.project.setRuntimeProjectFactValue.mutationOptions({
      onSuccess: async () => {
        setSetValueInput("");
        setFormError(null);
        await invalidateRuntimeFactQueries();
      },
    }),
  );

  const replaceFactMutation = useMutation(
    orpc.project.replaceRuntimeProjectFactValue.mutationOptions({
      onSuccess: async () => {
        setFormError(null);
        await invalidateRuntimeFactQueries();
      },
    }),
  );

  const detail = projectFactDetailQuery.data;
  const primaryInstance = detail?.currentState.values[0] ?? null;
  const showAddControl =
    detail?.actions.canAddInstance === true &&
    (detail.factDefinition.cardinality === "many" || detail.currentState.exists === false);
  const showSetControl =
    detail?.actions.canUpdateExisting === true &&
    detail.factDefinition.cardinality === "one" &&
    primaryInstance !== null;

  const replaceInputs = useMemo(
    () =>
      detail?.currentState.values.reduce<Record<string, string>>((acc, valueRow) => {
        acc[valueRow.projectFactInstanceId] =
          replaceValueByInstance[valueRow.projectFactInstanceId] ?? formatFactValue(valueRow.value);
        return acc;
      }, {}) ?? {},
    [detail?.currentState.values, replaceValueByInstance],
  );

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
                  <li key={valueRow.projectFactInstanceId}>
                    <Card frame="flat" tone="runtime" className="border-border/70 bg-background/40">
                      <CardHeader className="pb-2">
                        <CardDescription className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                          Instance {valueRow.projectFactInstanceId}
                        </CardDescription>
                        <CardTitle className="text-sm">Current value</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <pre className="whitespace-pre-wrap break-words border border-border/70 bg-background/60 p-2 text-xs text-muted-foreground">
                          {formatFactValue(valueRow.value)}
                        </pre>

                        {detail.actions.canUpdateExisting ? (
                          <form
                            data-testid={`project-fact-replace-form-${valueRow.projectFactInstanceId}`}
                            className="space-y-2"
                            onSubmit={async (event) => {
                              event.preventDefault();
                              const candidate = parseJsonInput(
                                replaceInputs[valueRow.projectFactInstanceId] ?? "",
                              );

                              if (!candidate.ok) {
                                setFormError(candidate.error);
                                return;
                              }

                              await replaceFactMutation.mutateAsync({
                                projectId,
                                factDefinitionId,
                                projectFactInstanceId: valueRow.projectFactInstanceId,
                                value: candidate.parsed,
                              });
                            }}
                          >
                            <div className="space-y-1 text-xs text-muted-foreground">
                              <p>Value (JSON)</p>
                              <Textarea
                                value={replaceInputs[valueRow.projectFactInstanceId] ?? ""}
                                onChange={(event) =>
                                  setReplaceValueByInstance((previous) => ({
                                    ...previous,
                                    [valueRow.projectFactInstanceId]: event.target.value,
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

          <section className="space-y-3 border border-border/80 bg-background p-4">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
              Actions
            </p>

            {showAddControl ? (
              <form
                data-testid="project-fact-add-form"
                className="space-y-2 border border-border/70 bg-background/40 p-3"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const candidate = parseJsonInput(addValueInput);
                  if (!candidate.ok) {
                    setFormError(candidate.error);
                    return;
                  }

                  await addFactMutation.mutateAsync({
                    projectId,
                    factDefinitionId,
                    value: candidate.parsed,
                  });
                }}
              >
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>Value (JSON)</p>
                  <Textarea
                    value={addValueInput}
                    onChange={(event) => setAddValueInput(event.target.value)}
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
                  Add instance
                </button>
              </form>
            ) : null}

            {showSetControl && primaryInstance ? (
              <form
                data-testid="project-fact-set-form"
                className="space-y-2 border border-border/70 bg-background/40 p-3"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const candidate = parseJsonInput(setValueInput);
                  if (!candidate.ok) {
                    setFormError(candidate.error);
                    return;
                  }

                  await setFactMutation.mutateAsync({
                    projectId,
                    factDefinitionId,
                    projectFactInstanceId: primaryInstance.projectFactInstanceId,
                    value: candidate.parsed,
                  });
                }}
              >
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>Value (JSON)</p>
                  <Textarea
                    value={setValueInput}
                    onChange={(event) => setSetValueInput(event.target.value)}
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
            ) : null}

            {formError ? <p className="text-xs text-destructive">{formError}</p> : null}
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
        </>
      ) : null}
    </MethodologyWorkspaceShell>
  );
}
