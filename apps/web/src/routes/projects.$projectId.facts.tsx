import { type ReactNode, useMemo, useState } from "react";

import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import {
  RuntimeConfirmDialog,
  RuntimeFactValueDialog,
  type RuntimeDialogEditor,
} from "@/components/runtime/runtime-fact-dialogs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";
import { cn } from "@/lib/utils";

const factsSearchSchema = z.object({
  q: z.string().optional().default(""),
  existence: z.enum(["all", "exists", "not_exists"]).optional().default("all"),
  factType: z.enum(["all", "string", "number", "boolean", "json"]).optional().default("all"),
});

const runtimeProjectFactsQueryKey = (projectId: string, existence: string, factType: string) =>
  ["runtime-project-facts", projectId, existence, factType] as const;
const runtimeProjectFactDetailQueryKey = (projectId: string, factDefinitionId: string) =>
  ["runtime-project-fact-detail", projectId, factDefinitionId] as const;
const runtimeOverviewQueryKey = (projectId: string) => ["runtime-overview", projectId] as const;

export const Route = createFileRoute("/projects/$projectId/facts")({
  validateSearch: (search) => factsSearchSchema.parse(search),
  component: ProjectFactsRoute,
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
    return JSON.stringify(value);
  } catch {
    return "[unserializable]";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function getPathValidationKind(validation: unknown): "file" | "directory" | null {
  if (!isRecord(validation) || validation.kind !== "path" || !isRecord(validation.path)) {
    return null;
  }

  return validation.path.pathKind === "directory" ? "directory" : "file";
}

function getAllowedValidationValues(validation: unknown): string[] {
  if (
    !isRecord(validation) ||
    validation.kind !== "allowed-values" ||
    !Array.isArray(validation.values)
  ) {
    return [];
  }

  return validation.values.map((entry) => formatFactValue(entry));
}

function summarizeJsonValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.length === 0
      ? "Empty list"
      : `${value.length} item${value.length === 1 ? "" : "s"}`;
  }

  if (isRecord(value)) {
    const keys = Object.keys(value);
    if (keys.length === 0) {
      return "Empty object";
    }

    const preview = keys.slice(0, 3).join(", ");
    return keys.length > 3
      ? `${keys.length} fields · ${preview}…`
      : `${keys.length} fields · ${preview}`;
  }

  return formatFactValue(value);
}

function ValidationHintBadges({ validation }: { validation: unknown }): ReactNode {
  const pathKind = getPathValidationKind(validation);
  const allowedValues = getAllowedValidationValues(validation);

  if (!pathKind && allowedValues.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {pathKind ? (
        <span className="inline-flex items-center border border-amber-500/50 bg-amber-500/10 px-1.5 py-0.5 text-[0.62rem] uppercase tracking-[0.12em] text-amber-200">
          {pathKind} path
        </span>
      ) : null}
      {allowedValues.length > 0 ? (
        <span className="inline-flex items-center border border-indigo-500/50 bg-indigo-500/10 px-1.5 py-0.5 text-[0.62rem] uppercase tracking-[0.12em] text-indigo-200">
          {allowedValues.length} allowed value{allowedValues.length === 1 ? "" : "s"}
        </span>
      ) : null}
    </div>
  );
}

function ProjectFactValuePresentation(props: {
  value: unknown;
  factType: "string" | "number" | "boolean" | "json";
  validation: unknown;
  compact?: boolean;
}) {
  const { value, factType, validation, compact = false } = props;

  if (factType === "boolean") {
    return (
      <div className="space-y-2">
        <ValidationHintBadges validation={validation} />
        <span
          className={cn(
            "inline-flex items-center border px-2 py-1 text-xs uppercase tracking-[0.12em]",
            value === true
              ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-200"
              : "border-rose-500/50 bg-rose-500/10 text-rose-200",
          )}
        >
          {value === true ? "True" : "False"}
        </span>
      </div>
    );
  }

  if (factType === "number") {
    return (
      <div className="space-y-2">
        <ValidationHintBadges validation={validation} />
        <div className="border border-sky-500/30 bg-sky-500/10 px-2 py-1.5 font-mono text-sm text-sky-100">
          {formatFactValue(value)}
        </div>
      </div>
    );
  }

  if (factType === "json") {
    return compact ? (
      <div className="space-y-2">
        <ValidationHintBadges validation={validation} />
        <div className="border border-fuchsia-500/30 bg-fuchsia-500/10 px-2 py-1.5 text-xs text-fuchsia-100">
          {summarizeJsonValue(value)}
        </div>
      </div>
    ) : (
      <div className="space-y-2">
        <ValidationHintBadges validation={validation} />
        <pre className="whitespace-pre-wrap break-words border border-fuchsia-500/30 bg-fuchsia-500/10 p-2 text-xs text-fuchsia-100">
          {JSON.stringify(value, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <ValidationHintBadges validation={validation} />
      <div
        className={cn(
          "border border-teal-500/30 bg-teal-500/10 px-2 py-1.5 font-mono text-sm text-teal-100",
          compact ? "truncate" : "whitespace-pre-wrap break-all",
        )}
        title={formatFactValue(value)}
      >
        {formatFactValue(value)}
      </div>
    </div>
  );
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

function getCardinalityBadgeClass(cardinality: "one" | "many"): string {
  return cardinality === "many"
    ? "border-purple-500/50 bg-purple-500/20 text-purple-200"
    : "border-blue-500/50 bg-blue-500/20 text-blue-200";
}

function getTypeBadgeClass(type: "string" | "number" | "boolean" | "json"): string {
  if (type === "number") {
    return "border-sky-500/50 bg-sky-500/20 text-sky-200";
  }

  if (type === "boolean") {
    return "border-violet-500/50 bg-violet-500/20 text-violet-200";
  }

  if (type === "json") {
    return "border-fuchsia-500/50 bg-fuchsia-500/20 text-fuchsia-200";
  }

  return "border-teal-500/50 bg-teal-500/20 text-teal-200";
}

function getValidationBadgeClass(kind: string): string {
  if (kind === "path") {
    return "border-amber-500/50 bg-amber-500/20 text-amber-200";
  }

  if (kind === "json-schema") {
    return "border-emerald-500/50 bg-emerald-500/20 text-emerald-200";
  }

  if (kind === "allowed-values") {
    return "border-indigo-500/50 bg-indigo-500/20 text-indigo-200";
  }

  return "border-slate-500/50 bg-slate-500/20 text-slate-200";
}

function getValidationKind(validation: unknown): string | null {
  return typeof (validation as { kind?: unknown })?.kind === "string"
    ? (validation as { kind: string }).kind
    : null;
}

type ProjectFactDialogState = {
  factDefinitionId: string;
  mode: "detail" | "create";
};

export function ProjectFactsRoute() {
  const { projectId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { orpc, queryClient } = Route.useRouteContext();
  const [dialogState, setDialogState] = useState<ProjectFactDialogState | null>(null);
  const [detailCreateDialogOpen, setDetailCreateDialogOpen] = useState(false);
  const [editInstanceId, setEditInstanceId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const runtimeFilters = useMemo(() => {
    const filters: {
      existence?: "exists" | "not_exists";
      factTypes?: Array<"string" | "number" | "boolean" | "json">;
    } = {};

    if (search.existence !== "all") {
      filters.existence = search.existence;
    }

    if (search.factType !== "all") {
      filters.factTypes = [search.factType];
    }

    return filters;
  }, [search.existence, search.factType]);

  const projectFactsQuery = useQuery({
    ...orpc.project.getRuntimeProjectFacts.queryOptions({
      input: {
        projectId,
        ...(Object.keys(runtimeFilters).length > 0 ? { filters: runtimeFilters } : {}),
      },
    }),
    queryKey: runtimeProjectFactsQueryKey(projectId, search.existence, search.factType),
  });

  const filteredCards = useMemo(() => {
    const cards = projectFactsQuery.data?.cards ?? [];
    const query = search.q.trim().toLowerCase();

    if (query.length === 0) {
      return cards;
    }

    return cards.filter((card) =>
      [card.factKey, card.factName ?? "", card.factType, card.cardinality]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [projectFactsQuery.data?.cards, search.q]);

  const selectedFactDefinitionId = dialogState?.factDefinitionId ?? null;
  const projectFactDetailQuery = useQuery({
    ...orpc.project.getRuntimeProjectFactDetail.queryOptions({
      input: {
        projectId,
        factDefinitionId: selectedFactDefinitionId ?? "__idle__",
      },
    }),
    queryKey: runtimeProjectFactDetailQueryKey(projectId, selectedFactDefinitionId ?? "__idle__"),
    enabled: selectedFactDefinitionId !== null,
  });

  const invalidateRuntimeFactQueries = async (factDefinitionId: string) => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: runtimeProjectFactsQueryKey(projectId, search.existence, search.factType),
      }),
      queryClient.invalidateQueries({ queryKey: ["runtime-project-facts", projectId] }),
      queryClient.invalidateQueries({
        queryKey: runtimeProjectFactDetailQueryKey(projectId, factDefinitionId),
      }),
      queryClient.invalidateQueries({ queryKey: runtimeOverviewQueryKey(projectId) }),
    ]);
  };

  const createFactMutation = useMutation(
    orpc.project.createRuntimeProjectFactValue.mutationOptions({
      onSuccess: async (_data, variables) => {
        setMutationError(null);
        setDetailCreateDialogOpen(false);
        setDialogState(null);
        await invalidateRuntimeFactQueries(variables.factDefinitionId);
      },
      onError: (error) => {
        setMutationError(getMutationErrorMessage(error));
      },
    }),
  );

  const updateFactMutation = useMutation(
    orpc.project.updateRuntimeProjectFactValue.mutationOptions({
      onSuccess: async (_data, variables) => {
        setMutationError(null);
        setEditInstanceId(null);
        await invalidateRuntimeFactQueries(variables.factDefinitionId);
      },
      onError: (error) => {
        setMutationError(getMutationErrorMessage(error));
      },
    }),
  );

  const deleteFactMutation = useMutation(
    orpc.project.deleteRuntimeProjectFactValue.mutationOptions({
      onSuccess: async (_data, variables) => {
        setMutationError(null);
        setDeleteDialogOpen(false);
        setDialogState(null);
        await invalidateRuntimeFactQueries(variables.factDefinitionId);
      },
      onError: (error) => {
        setMutationError(getMutationErrorMessage(error));
      },
    }),
  );

  const detail = projectFactDetailQuery.data;
  const primaryInstance = detail?.currentState.values[0] ?? null;
  const editingInstance =
    detail?.currentState.values.find((valueRow) => valueRow.instanceId === editInstanceId) ?? null;
  const showCreateControl =
    detail?.actions.canAddInstance === true &&
    (detail.factDefinition.cardinality === "many" || detail.currentState.exists === false);
  const showUpdateControl =
    detail?.actions.canUpdateExisting === true &&
    detail.factDefinition.cardinality === "one" &&
    primaryInstance !== null;
  const showDeleteControl = (detail?.currentState.values.length ?? 0) > 0;
  const factEditor: RuntimeDialogEditor | null = detail
    ? {
        kind: "primitive",
        definition: {
          factType: detail.factDefinition.factType,
          ...(detail.factDefinition.validation !== undefined
            ? { validation: detail.factDefinition.validation }
            : {}),
        },
      }
    : null;

  return (
    <MethodologyWorkspaceShell
      title="Project facts"
      segments={[
        { label: "Projects", to: "/projects" },
        {
          label: projectFactsQuery.data?.project.name ?? projectId,
          to: "/projects/$projectId",
          params: { projectId },
        },
        { label: "Facts" },
      ]}
    >
      <section className="chiron-frame-flat chiron-tone-navigation grid gap-3 p-4 md:grid-cols-[1fr_auto_auto]">
        <Input
          value={search.q}
          onChange={(event) =>
            navigate({ search: { ...search, q: event.target.value }, replace: true })
          }
          className="rounded-none"
          placeholder="Filter fact definitions by key, name, type, or cardinality"
        />

        <select
          value={search.existence}
          onChange={(event) =>
            navigate({
              search: {
                ...search,
                existence: event.target.value as "all" | "exists" | "not_exists",
              },
              replace: true,
            })
          }
          className="rounded-none border border-border/80 bg-background px-3 py-2 text-sm"
        >
          <option value="all">All existence</option>
          <option value="exists">Exists</option>
          <option value="not_exists">Not exists</option>
        </select>

        <select
          value={search.factType}
          onChange={(event) =>
            navigate({
              search: {
                ...search,
                factType: event.target.value as "all" | "string" | "number" | "boolean" | "json",
              },
              replace: true,
            })
          }
          className="rounded-none border border-border/80 bg-background px-3 py-2 text-sm"
        >
          <option value="all">All types</option>
          <option value="string">string</option>
          <option value="number">number</option>
          <option value="boolean">boolean</option>
          <option value="json">json</option>
        </select>

        <p className="md:col-span-3 text-xs text-muted-foreground">
          Manual authoring is available on project fact instances only. Open a fact detail to add,
          set, or replace values.
        </p>
      </section>

      <section className="space-y-3">
        {projectFactsQuery.isLoading ? <Skeleton className="h-44 w-full rounded-none" /> : null}

        {!projectFactsQuery.isLoading && filteredCards.length === 0 ? (
          <section className="chiron-frame-flat chiron-tone-context p-4 text-sm text-muted-foreground">
            No project fact definitions match the current filters.
          </section>
        ) : null}

        {!projectFactsQuery.isLoading && filteredCards.length > 0 ? (
          <ul className="grid gap-3 md:grid-cols-2">
            {filteredCards.map((card) => (
              <li key={card.factDefinitionId}>
                <Card
                  frame="flat"
                  tone="runtime"
                  className="h-full border-border/80 bg-background/40"
                >
                  <CardHeader className="space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={cn(
                            "inline-flex items-center border px-2 py-1 text-[0.65rem] uppercase tracking-[0.12em]",
                            getTypeBadgeClass(card.factType),
                          )}
                        >
                          {card.factType}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center border px-2 py-1 text-[0.65rem] uppercase tracking-[0.12em]",
                            getCardinalityBadgeClass(card.cardinality),
                          )}
                        >
                          {card.cardinality}
                        </span>
                        {getValidationKind(card.validation) ? (
                          <span
                            className={cn(
                              "inline-flex items-center border px-2 py-1 text-[0.65rem] uppercase tracking-[0.12em]",
                              getValidationBadgeClass(getValidationKind(card.validation)!),
                            )}
                          >
                            {getValidationKind(card.validation)}
                          </span>
                        ) : null}
                      </div>
                      <span
                        className={cn(
                          "border px-2 py-1 text-[0.62rem] uppercase tracking-[0.12em]",
                          card.exists
                            ? "border-primary/50 bg-primary/15 text-primary"
                            : "border-border/70 bg-background/50 text-muted-foreground",
                        )}
                      >
                        {card.exists ? "Has instances" : "No instances"}
                      </span>
                    </div>
                    <CardTitle className="text-base tracking-[0.02em]">
                      {card.factName ?? card.factKey}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">{card.factKey}</p>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      {card.exists
                        ? `${card.currentCount} current value${card.currentCount === 1 ? "" : "s"}`
                        : "No current value"}
                    </p>

                    {card.currentValues.length > 0 ? (
                      <ul className="space-y-1 text-xs">
                        {card.currentValues.slice(0, 3).map((value) => (
                          <li
                            key={value.instanceId}
                            className="space-y-2 border border-border/70 bg-background/50 px-2 py-2"
                          >
                            <p className="text-[0.62rem] uppercase tracking-[0.12em] text-muted-foreground">
                              Instance {value.instanceId}
                            </p>
                            <ProjectFactValuePresentation
                              value={value.value}
                              factType={card.factType}
                              validation={card.validation}
                              compact
                            />
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-none uppercase tracking-[0.12em]"
                        onClick={() => {
                          setMutationError(null);
                          setDetailCreateDialogOpen(false);
                          setEditInstanceId(null);
                          setDeleteDialogOpen(false);
                          setDialogState({
                            factDefinitionId: card.factDefinitionId,
                            mode: "detail",
                          });
                        }}
                      >
                        Open detail
                      </Button>

                      {card.cardinality === "many" || !card.exists ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-none uppercase tracking-[0.12em]"
                          onClick={() => {
                            setMutationError(null);
                            setEditInstanceId(null);
                            setDeleteDialogOpen(false);
                            setDetailCreateDialogOpen(true);
                            setDialogState({
                              factDefinitionId: card.factDefinitionId,
                              mode: "create",
                            });
                          }}
                        >
                          {card.cardinality === "one" ? "Create instance" : "Add instance"}
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <Dialog
        open={dialogState?.mode === "detail" && selectedFactDefinitionId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDialogState(null);
            setMutationError(null);
            setDetailCreateDialogOpen(false);
            setEditInstanceId(null);
            setDeleteDialogOpen(false);
          }
        }}
      >
        <DialogContent className="max-h-[min(88vh,52rem)] max-w-3xl overflow-y-auto rounded-none border border-border/80 bg-background">
          <DialogHeader>
            <DialogTitle>
              {detail?.factDefinition.factName ??
                detail?.factDefinition.factKey ??
                "Project fact detail"}
            </DialogTitle>
            <DialogDescription>
              Inspect current runtime values and open the canonical manual CRUD dialogs from here.
            </DialogDescription>
          </DialogHeader>

          {projectFactDetailQuery.isLoading || !detail ? (
            <Skeleton className="h-56 w-full rounded-none" />
          ) : (
            <div className="space-y-4 text-sm">
              <section className="chiron-frame-flat chiron-tone-navigation space-y-3 p-4">
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
              </section>

              <section className="chiron-frame-flat chiron-tone-navigation space-y-3 p-4">
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
                        <Card
                          frame="flat"
                          tone="runtime"
                          className="border-border/70 bg-background/40"
                        >
                          <CardHeader className="pb-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <CardDescription className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                                Instance {valueRow.instanceId}
                              </CardDescription>
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
                            <CardTitle className="text-sm">Current value</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ProjectFactValuePresentation
                              value={valueRow.value}
                              factType={detail.factDefinition.factType}
                              validation={detail.factDefinition.validation}
                            />
                          </CardContent>
                        </Card>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>

              <section className="chiron-frame-flat chiron-tone-context space-y-3 p-4">
                <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                  Actions
                </p>

                {showCreateControl ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMutationError(null);
                      setDetailCreateDialogOpen(true);
                    }}
                  >
                    {detail.factDefinition.cardinality === "one"
                      ? "Create instance"
                      : "Add instance"}
                  </Button>
                ) : null}

                {showUpdateControl && primaryInstance ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMutationError(null);
                      setEditInstanceId(primaryInstance.instanceId);
                    }}
                  >
                    Edit instance
                  </Button>
                ) : null}

                {showDeleteControl ? (
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
                ) : null}

                {mutationError ? <p className="text-xs text-destructive">{mutationError}</p> : null}
              </section>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDialogState(null);
                setMutationError(null);
                setDetailCreateDialogOpen(false);
                setEditInstanceId(null);
                setDeleteDialogOpen(false);
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {factEditor && detail ? (
        <RuntimeFactValueDialog
          open={detailCreateDialogOpen && selectedFactDefinitionId !== null}
          onOpenChange={(open) => {
            setDetailCreateDialogOpen(open);
            if (!open && dialogState?.mode === "create") {
              setDialogState(null);
            }
          }}
          title={
            detail.factDefinition.cardinality === "one"
              ? "Create project fact instance"
              : "Add project fact instance"
          }
          description={
            detail.factDefinition.cardinality === "one"
              ? "Create the first runtime instance for this project fact."
              : "Create a new runtime instance for this project fact."
          }
          submitLabel={
            detail.factDefinition.cardinality === "one" ? "Create instance" : "Add instance"
          }
          editor={factEditor}
          isPending={createFactMutation.isPending}
          errorMessage={detailCreateDialogOpen ? mutationError : null}
          onSubmit={async (value) => {
            await createFactMutation.mutateAsync({
              projectId,
              factDefinitionId: detail.factDefinition.factDefinitionId,
              value,
            });
          }}
        />
      ) : null}

      {factEditor && detail && editingInstance ? (
        <RuntimeFactValueDialog
          open={editInstanceId !== null}
          onOpenChange={(open) => setEditInstanceId(open ? editingInstance.instanceId : null)}
          title="Edit project fact instance"
          description={
            detail.factDefinition.cardinality === "one"
              ? `Update instance ${editingInstance.instanceId} for this project fact.`
              : `Update instance ${editingInstance.instanceId} for this project fact.`
          }
          submitLabel="Save instance"
          editor={factEditor}
          initialValue={editingInstance.value}
          isPending={updateFactMutation.isPending}
          errorMessage={editInstanceId !== null ? mutationError : null}
          onSubmit={async (value) => {
            await updateFactMutation.mutateAsync({
              projectId,
              factDefinitionId: detail.factDefinition.factDefinitionId,
              projectFactInstanceId: editingInstance.instanceId,
              value,
            });
          }}
        />
      ) : null}

      <RuntimeConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete project fact state?"
        description={
          detail
            ? detail.currentState.currentCount === 1
              ? "Delete logically by writing a tombstone for the current value."
              : "Delete logically by writing tombstones for every current value in this fact definition."
            : "Delete the current runtime value set."
        }
        confirmLabel={
          detail?.currentState.currentCount === 1 ? "Delete current value" : "Delete current values"
        }
        isPending={deleteFactMutation.isPending}
        errorMessage={deleteDialogOpen ? mutationError : null}
        onConfirm={async () => {
          if (!detail) {
            return;
          }

          await deleteFactMutation.mutateAsync({
            projectId,
            factDefinitionId: detail.factDefinition.factDefinitionId,
          });
        }}
      />
    </MethodologyWorkspaceShell>
  );
}
