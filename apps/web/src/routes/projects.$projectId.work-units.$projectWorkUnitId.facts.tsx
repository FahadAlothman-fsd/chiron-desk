import { useMemo, useState } from "react";

import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import {
  RuntimeConfirmDialog,
  RuntimeFactValueDialog,
  type RuntimeFactOption,
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

const workUnitFactsSearchSchema = z.object({
  tab: z.enum(["primitive", "work_units"]).optional().default("primitive"),
  q: z.string().optional().default(""),
  existence: z.enum(["all", "exists", "not_exists"]).optional().default("all"),
  primitiveFactType: z
    .enum(["all", "string", "number", "boolean", "json"])
    .optional()
    .default("all"),
  hasActiveTransition: z.enum(["all", "active", "inactive"]).optional().default("all"),
});

const runtimeWorkUnitFactsQueryKey = (projectId: string, projectWorkUnitId: string) =>
  ["runtime-work-unit-facts", projectId, projectWorkUnitId] as const;
const runtimeWorkUnitFactDetailQueryKey = (
  projectId: string,
  projectWorkUnitId: string,
  factDefinitionId: string,
) => ["runtime-work-unit-fact-detail", projectId, projectWorkUnitId, factDefinitionId] as const;
const runtimeWorkUnitOverviewQueryKey = (projectId: string, projectWorkUnitId: string) =>
  ["runtime-work-unit-overview", projectId, projectWorkUnitId] as const;
const runtimeProjectWorkUnitsQueryKey = (projectId: string) =>
  ["runtime-work-units", projectId] as const;

export const Route = createFileRoute("/projects/$projectId/work-units/$projectWorkUnitId/facts")({
  validateSearch: (search) => workUnitFactsSearchSchema.parse(search),
  component: ProjectWorkUnitFactsRoute,
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

function getCardinalityBadgeClass(cardinality: "one" | "many"): string {
  return cardinality === "many"
    ? "border-purple-500/50 bg-purple-500/20 text-purple-200"
    : "border-blue-500/50 bg-blue-500/20 text-blue-200";
}

function getFactKindBadgeClass(kind: "plain_fact" | "work_unit_reference_fact"): string {
  return kind === "work_unit_reference_fact"
    ? "border-cyan-500/50 bg-cyan-500/20 text-cyan-200"
    : "border-slate-500/50 bg-slate-500/20 text-slate-200";
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

export function ProjectWorkUnitFactsRoute() {
  const { projectId, projectWorkUnitId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { orpc, queryClient } = Route.useRouteContext();
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedFactDefinitionId, setSelectedFactDefinitionId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editInstanceId, setEditInstanceId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const runtimeFilters = useMemo(() => {
    const filters: {
      existence?: "exists" | "not_exists";
      primitiveFactTypes?: Array<"string" | "number" | "boolean" | "json">;
    } = {};

    if (search.existence !== "all") {
      filters.existence = search.existence;
    }

    if (search.primitiveFactType !== "all") {
      filters.primitiveFactTypes = [search.primitiveFactType];
    }

    return filters;
  }, [search.existence, search.primitiveFactType]);

  const workUnitFactsQuery = useQuery({
    ...orpc.project.getRuntimeWorkUnitFacts.queryOptions({
      input: {
        projectId,
        projectWorkUnitId,
        tab: search.tab,
        ...(Object.keys(runtimeFilters).length > 0 ? { filters: runtimeFilters } : {}),
      },
    }),
    queryKey: runtimeWorkUnitFactsQueryKey(projectId, projectWorkUnitId),
  });

  const workUnitFactDetailQuery = useQuery({
    ...orpc.project.getRuntimeWorkUnitFactDetail.queryOptions({
      input: {
        projectId,
        projectWorkUnitId,
        factDefinitionId: selectedFactDefinitionId ?? "__idle__",
      },
    }),
    queryKey: runtimeWorkUnitFactDetailQueryKey(
      projectId,
      projectWorkUnitId,
      selectedFactDefinitionId ?? "__idle__",
    ),
    enabled: selectedFactDefinitionId !== null,
  });

  const runtimeWorkUnitsQuery = useQuery({
    ...orpc.project.getRuntimeWorkUnits.queryOptions({
      input: { projectId },
    }),
    queryKey: runtimeProjectWorkUnitsQueryKey(projectId),
  });

  const invalidateRuntimeFactQueries = async (factDefinitionId: string) => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: runtimeWorkUnitFactsQueryKey(projectId, projectWorkUnitId),
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
        if (selectedFactDefinitionId) {
          await invalidateRuntimeFactQueries(selectedFactDefinitionId);
        }
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
        if (selectedFactDefinitionId) {
          await invalidateRuntimeFactQueries(selectedFactDefinitionId);
        }
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
        if (selectedFactDefinitionId) {
          await invalidateRuntimeFactQueries(selectedFactDefinitionId);
        }
      },
      onError: (error) => {
        setMutationError(getMutationErrorMessage(error));
      },
    }),
  );

  const filteredPrimitiveCards = useMemo(() => {
    const cards = workUnitFactsQuery.data?.primitive?.cards ?? [];
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
  }, [search.q, workUnitFactsQuery.data?.primitive?.cards]);

  const filteredWorkUnitDependencySections = useMemo(() => {
    const workUnits = workUnitFactsQuery.data?.workUnits;
    const query = search.q.trim().toLowerCase();

    type DependencyCard = {
      readonly factDefinitionId: string;
      readonly factKey: string;
      readonly factName?: string | undefined;
      readonly cardinality: "one" | "many";
      readonly count: number;
      readonly currentMembers: ReadonlyArray<{
        readonly workUnitFactInstanceId: string;
        readonly counterpartLabel: string;
        readonly counterpartWorkUnitTypeKey: string;
      }>;
    };

    const filterCards = (cards: readonly DependencyCard[]) => {
      if (query.length === 0) {
        return cards;
      }

      return cards.filter((card) =>
        [
          card.factKey,
          card.factName ?? "",
          card.cardinality,
          ...card.currentMembers.flatMap((member) => [
            member.counterpartLabel,
            member.counterpartWorkUnitTypeKey,
          ]),
        ]
          .join(" ")
          .toLowerCase()
          .includes(query),
      );
    };

    return {
      outgoing: filterCards(workUnits?.outgoing ?? []),
      incoming: filterCards(workUnits?.incoming ?? []),
    };
  }, [search.q, workUnitFactsQuery.data?.workUnits]);

  const workUnitLabel = workUnitFactsQuery.data?.workUnit.workUnitTypeName ?? projectWorkUnitId;
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

  const resetDialogState = () => {
    setMutationError(null);
    setCreateDialogOpen(false);
    setEditInstanceId(null);
    setDeleteDialogOpen(false);
  };

  const openDetailDialog = (factDefinitionId: string) => {
    resetDialogState();
    setSelectedFactDefinitionId(factDefinitionId);
    setDetailDialogOpen(true);
  };

  const openCreateDialog = (factDefinitionId: string) => {
    resetDialogState();
    setSelectedFactDefinitionId(factDefinitionId);
    setCreateDialogOpen(true);
  };

  return (
    <MethodologyWorkspaceShell
      title="Work unit facts"
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
          label: workUnitLabel,
          to: "/projects/$projectId/work-units/$projectWorkUnitId",
          params: { projectId, projectWorkUnitId },
        },
        { label: "Facts" },
      ]}
    >
      <section className="chiron-frame-flat chiron-tone-navigation space-y-3 p-4">
        <div className="space-y-1">
          <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
            Work unit context
          </p>
          <p className="text-sm font-medium">{workUnitLabel}</p>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {workUnitFactsQuery.data?.workUnit.workUnitTypeKey ?? "—"} · state{" "}
            {workUnitFactsQuery.data?.workUnit.currentStateLabel ?? "—"}
          </p>
        </div>

        <div className="inline-flex w-fit border border-border/80 bg-background/40 p-1">
          <button
            type="button"
            data-testid="work-unit-facts-tab-primitive"
            onClick={() => navigate({ search: { ...search, tab: "primitive" }, replace: true })}
            className={cn(
              "px-3 py-1.5 text-xs font-medium uppercase tracking-[0.12em]",
              search.tab === "primitive"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground",
            )}
          >
            Primitive
          </button>

          <button
            type="button"
            data-testid="work-unit-facts-tab-work-units"
            onClick={() => navigate({ search: { ...search, tab: "work_units" }, replace: true })}
            className={cn(
              "px-3 py-1.5 text-xs font-medium uppercase tracking-[0.12em]",
              search.tab === "work_units"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground",
            )}
          >
            Work Units
          </button>
        </div>

        <div
          className={cn(
            "grid gap-3",
            search.tab === "primitive" ? "md:grid-cols-[1fr_auto_auto]" : "md:grid-cols-1",
          )}
        >
          <Input
            value={search.q}
            onChange={(event) =>
              navigate({ search: { ...search, q: event.target.value }, replace: true })
            }
            className="rounded-none"
            placeholder="Filter fact definitions by key, name, type, cardinality, or counterpart"
          />

          {search.tab === "primitive" ? (
            <>
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
                value={search.primitiveFactType}
                onChange={(event) =>
                  navigate({
                    search: {
                      ...search,
                      primitiveFactType: event.target.value as
                        | "all"
                        | "string"
                        | "number"
                        | "boolean"
                        | "json",
                    },
                    replace: true,
                  })
                }
                className="rounded-none border border-border/80 bg-background px-3 py-2 text-sm"
              >
                <option value="all">All primitive types</option>
                <option value="string">string</option>
                <option value="number">number</option>
                <option value="boolean">boolean</option>
                <option value="json">json</option>
              </select>
            </>
          ) : null}
        </div>

        <p className="text-xs text-muted-foreground">
          Open a fact detail to add, set, replace, or remove runtime values for this work unit.
        </p>
      </section>

      {workUnitFactsQuery.isLoading ? <Skeleton className="h-44 w-full rounded-none" /> : null}

      {!workUnitFactsQuery.isLoading && search.tab === "primitive" ? (
        <section className="space-y-3">
          {filteredPrimitiveCards.length === 0 ? (
            <section className="chiron-frame-flat chiron-tone-context p-4 text-sm text-muted-foreground">
              No primitive fact definitions match the current filters.
            </section>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {filteredPrimitiveCards.map((card) => (
                <li key={card.factDefinitionId}>
                  <Card
                    frame="flat"
                    tone="runtime"
                    className="h-full border-border/80 bg-background/40"
                  >
                    <CardHeader className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={cn(
                            "inline-flex items-center border px-2 py-1 text-[0.65rem] uppercase tracking-[0.12em]",
                            getFactKindBadgeClass("plain_fact"),
                          )}
                        >
                          plain fact
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center border px-2 py-1 text-[0.65rem] uppercase tracking-[0.12em]",
                            getCardinalityBadgeClass(card.cardinality),
                          )}
                        >
                          {card.cardinality}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center border px-2 py-1 text-[0.65rem] uppercase tracking-[0.12em]",
                            getTypeBadgeClass(card.factType),
                          )}
                        >
                          {card.factType}
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
                          {card.currentValues.map((value, index) => (
                            <li
                              key={`${card.factDefinitionId}-value-${index}`}
                              className="truncate border border-border/70 bg-background/50 px-2 py-1"
                              title={formatFactValue(value)}
                            >
                              {formatFactValue(value)}
                            </li>
                          ))}
                        </ul>
                      ) : null}

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-none uppercase tracking-[0.12em]"
                          onClick={() => openDetailDialog(card.factDefinitionId)}
                        >
                          Open detail
                        </Button>

                        {card.cardinality === "many" || !card.exists ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-none uppercase tracking-[0.12em]"
                            onClick={() => openCreateDialog(card.factDefinitionId)}
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
          )}
        </section>
      ) : null}

      {!workUnitFactsQuery.isLoading && search.tab === "work_units" ? (
        <section className="space-y-4">
          <section className="chiron-frame-flat chiron-tone-navigation space-y-3 p-4">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
              Outgoing
            </p>

            {filteredWorkUnitDependencySections.outgoing.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No outgoing dependency facts match the current filters.
              </p>
            ) : (
              <ul className="grid gap-3 md:grid-cols-2">
                {filteredWorkUnitDependencySections.outgoing.map((card) => (
                  <li key={card.factDefinitionId}>
                    <Card
                      frame="flat"
                      tone="runtime"
                      className="h-full border-border/80 bg-background/40"
                    >
                      <CardHeader className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={cn(
                              "inline-flex items-center border px-2 py-1 text-[0.65rem] uppercase tracking-[0.12em]",
                              getFactKindBadgeClass("work_unit_reference_fact"),
                            )}
                          >
                            dependency
                          </span>
                          <span
                            className={cn(
                              "inline-flex items-center border px-2 py-1 text-[0.65rem] uppercase tracking-[0.12em]",
                              getCardinalityBadgeClass(card.cardinality),
                            )}
                          >
                            {card.cardinality}
                          </span>
                          <CardDescription className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                            {card.count} current member{card.count === 1 ? "" : "s"}
                          </CardDescription>
                        </div>
                        <CardTitle className="text-base tracking-[0.02em]">
                          {card.factName ?? card.factKey}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">{card.factKey}</p>
                      </CardHeader>

                      <CardContent className="space-y-3">
                        <ul className="space-y-1 text-xs">
                          {card.currentMembers.map((member) => (
                            <li
                              key={member.workUnitFactInstanceId}
                              className="border border-border/70 bg-background/50 px-2 py-1"
                            >
                              {member.counterpartLabel} · {member.counterpartWorkUnitTypeKey}
                            </li>
                          ))}
                        </ul>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-none uppercase tracking-[0.12em]"
                            onClick={() => openDetailDialog(card.factDefinitionId)}
                          >
                            Open detail
                          </Button>

                          {card.cardinality === "many" || card.count === 0 ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-none uppercase tracking-[0.12em]"
                              onClick={() => openCreateDialog(card.factDefinitionId)}
                            >
                              {card.cardinality === "one"
                                ? "Set linked work unit"
                                : "Add linked work unit"}
                            </Button>
                          ) : null}
                        </div>
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="chiron-frame-flat chiron-tone-navigation space-y-3 p-4">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
              Incoming
            </p>

            {filteredWorkUnitDependencySections.incoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No incoming dependency facts match the current filters.
              </p>
            ) : (
              <ul className="grid gap-3 md:grid-cols-2">
                {filteredWorkUnitDependencySections.incoming.map((card) => (
                  <li key={card.factDefinitionId}>
                    <Card
                      frame="flat"
                      tone="runtime"
                      className="h-full border-border/80 bg-background/40"
                    >
                      <CardHeader className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={cn(
                              "inline-flex items-center border px-2 py-1 text-[0.65rem] uppercase tracking-[0.12em]",
                              getFactKindBadgeClass("work_unit_reference_fact"),
                            )}
                          >
                            dependency
                          </span>
                          <span
                            className={cn(
                              "inline-flex items-center border px-2 py-1 text-[0.65rem] uppercase tracking-[0.12em]",
                              getCardinalityBadgeClass(card.cardinality),
                            )}
                          >
                            {card.cardinality}
                          </span>
                          <CardDescription className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                            {card.count} current member{card.count === 1 ? "" : "s"}
                          </CardDescription>
                        </div>
                        <CardTitle className="text-base tracking-[0.02em]">
                          {card.factName ?? card.factKey}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">{card.factKey}</p>
                      </CardHeader>

                      <CardContent className="space-y-3">
                        <ul className="space-y-1 text-xs">
                          {card.currentMembers.map((member) => (
                            <li
                              key={member.workUnitFactInstanceId}
                              className="border border-border/70 bg-background/50 px-2 py-1"
                            >
                              {member.counterpartLabel} · {member.counterpartWorkUnitTypeKey}
                            </li>
                          ))}
                        </ul>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-none uppercase tracking-[0.12em]"
                          onClick={() => openDetailDialog(card.factDefinitionId)}
                        >
                          Open detail
                        </Button>
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </section>
      ) : null}

      <Dialog
        open={detailDialogOpen && selectedFactDefinitionId !== null}
        onOpenChange={(open) => {
          setDetailDialogOpen(open);
          if (!open) {
            resetDialogState();
            setSelectedFactDefinitionId(null);
          }
        }}
      >
        <DialogContent className="max-h-[min(88vh,52rem)] max-w-3xl overflow-y-auto rounded-none border border-border/80 bg-background">
          <DialogHeader>
            <DialogTitle>
              {detail?.factDefinition.factName ??
                detail?.factDefinition.factKey ??
                "Work unit fact detail"}
            </DialogTitle>
            <DialogDescription>
              Inspect current runtime instances and open the canonical manual CRUD dialogs from
              here.
            </DialogDescription>
          </DialogHeader>

          {workUnitFactDetailQuery.isLoading || !detail ? (
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

              {!isDependencyFact ? (
                <section className="chiron-frame-flat chiron-tone-navigation space-y-3 p-4">
                  <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                    Current state
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {detail.primitiveState?.exists
                      ? `${detail.primitiveState.currentCount} current value${detail.primitiveState.currentCount === 1 ? "" : "s"}`
                      : "No current value"}
                  </p>

                  {primitiveValues.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No current value.</p>
                  ) : primitiveValues.length === 1 ? (
                    <Card frame="flat" tone="runtime" className="border-border/70 bg-background/40">
                      <CardHeader className="pb-2">
                        <CardDescription className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                          Current value
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <pre className="whitespace-pre-wrap break-words border border-border/70 bg-background/60 p-2 text-xs text-muted-foreground">
                          {formatFactValue(primitiveValues[0]?.value)}
                        </pre>
                      </CardContent>
                    </Card>
                  ) : (
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
                              </div>
                            </CardHeader>
                            <CardContent>
                              <pre className="whitespace-pre-wrap break-words border border-border/70 bg-background/60 p-2 text-xs text-muted-foreground">
                                {formatFactValue(valueRow.value)}
                              </pre>
                            </CardContent>
                          </Card>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ) : (
                <section className="chiron-frame-flat chiron-tone-navigation space-y-3 p-4">
                  <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                    Current dependency state
                  </p>

                  <section className="space-y-2 border border-border/70 bg-background/40 p-3">
                    <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                      Outgoing
                    </p>
                    {outgoingDependencyValues.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No outgoing dependency members.
                      </p>
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
                            {detail.factDefinition.cardinality === "many" ? (
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
                      <p className="text-sm text-muted-foreground">
                        No incoming dependency members.
                      </p>
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

              <section className="chiron-frame-flat chiron-tone-context space-y-3 p-4">
                <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                  Actions
                </p>
                <div className="flex flex-wrap gap-2">
                  {showCreateControl ? (
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
                          ? "Create linked work unit"
                          : "Create instance"
                        : isDependencyFact
                          ? "Add linked work unit"
                          : "Add instance"}
                    </Button>
                  ) : null}

                  {showUpdateControl ? (
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
                      {isDependencyFact
                        ? outgoingDependencyValues.length === 1
                          ? "Delete linked work unit"
                          : "Delete linked work units"
                        : primitiveValues.length === 1
                          ? "Delete current value"
                          : "Delete current values"}
                    </Button>
                  ) : null}
                </div>

                {mutationError ? <p className="text-xs text-destructive">{mutationError}</p> : null}
              </section>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDetailDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {detail ? (
        <RuntimeFactValueDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          title={
            detail.factDefinition.cardinality === "one"
              ? isDependencyFact
                ? "Create linked work unit"
                : "Create work-unit fact instance"
              : isDependencyFact
                ? "Add linked work unit"
                : "Add work-unit fact instance"
          }
          description={
            isDependencyFact
              ? "Choose the runtime work unit reference for this fact definition."
              : detail.factDefinition.cardinality === "one"
                ? "Create the first runtime instance for this work-unit fact definition."
                : "Create a new runtime instance for this work-unit fact definition."
          }
          submitLabel={
            detail.factDefinition.cardinality === "one"
              ? isDependencyFact
                ? "Create linked work unit"
                : "Create instance"
              : isDependencyFact
                ? "Add linked work unit"
                : "Add instance"
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
            if (!selectedFactDefinitionId) return;

            if (isDependencyFact) {
              const referencedProjectWorkUnitId =
                typeof value === "object" && value !== null && "projectWorkUnitId" in value
                  ? String((value as { projectWorkUnitId: string }).projectWorkUnitId)
                  : "";

              await createFactMutation.mutateAsync({
                projectId,
                projectWorkUnitId,
                factDefinitionId: selectedFactDefinitionId,
                referencedProjectWorkUnitId,
              });
              return;
            }

            await createFactMutation.mutateAsync({
              projectId,
              projectWorkUnitId,
              factDefinitionId: selectedFactDefinitionId,
              value,
            });
          }}
        />
      ) : null}

      {detail && (editingPrimitiveInstance || editingDependencyInstance) && editInstanceId ? (
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
            if (!selectedFactDefinitionId) return;

            if (isDependencyFact && editingDependencyInstance) {
              const referencedProjectWorkUnitId =
                typeof value === "object" && value !== null && "projectWorkUnitId" in value
                  ? String((value as { projectWorkUnitId: string }).projectWorkUnitId)
                  : "";

              await updateFactMutation.mutateAsync({
                projectId,
                projectWorkUnitId,
                factDefinitionId: selectedFactDefinitionId,
                workUnitFactInstanceId: editingDependencyInstance.workUnitFactInstanceId,
                referencedProjectWorkUnitId,
              });
              return;
            }

            if (editingPrimitiveInstance) {
              await updateFactMutation.mutateAsync({
                projectId,
                projectWorkUnitId,
                factDefinitionId: selectedFactDefinitionId,
                workUnitFactInstanceId: editingPrimitiveInstance.workUnitFactInstanceId,
                value,
              });
            }
          }}
        />
      ) : null}

      <RuntimeConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={
          detail
            ? isDependencyFact
              ? outgoingDependencyValues.length === 1
                ? "Delete linked work unit?"
                : "Delete linked work units?"
              : primitiveValues.length === 1
                ? "Delete current work-unit fact value?"
                : "Delete current work-unit fact values?"
            : "Delete current work-unit fact values?"
        }
        description="This writes logical-delete tombstones for the current runtime work-unit fact state."
        confirmLabel={
          detail
            ? isDependencyFact
              ? outgoingDependencyValues.length === 1
                ? "Delete link"
                : "Delete links"
              : primitiveValues.length === 1
                ? "Delete value"
                : "Delete values"
            : "Delete values"
        }
        isPending={deleteFactMutation.isPending}
        errorMessage={deleteDialogOpen ? mutationError : null}
        onConfirm={async () => {
          if (!selectedFactDefinitionId) return;
          await deleteFactMutation.mutateAsync({
            projectId,
            projectWorkUnitId,
            factDefinitionId: selectedFactDefinitionId,
          });
        }}
      />
    </MethodologyWorkspaceShell>
  );
}
