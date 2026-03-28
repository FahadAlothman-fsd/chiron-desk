import { useMemo } from "react";

import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

export function ProjectWorkUnitFactsRoute() {
  const { projectId, projectWorkUnitId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { orpc } = Route.useRouteContext();

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
      <section className="space-y-3 border border-border/80 bg-background p-4">
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
                className="border border-border/80 bg-background px-3 py-2 text-sm"
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
                className="border border-border/80 bg-background px-3 py-2 text-sm"
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
      </section>

      {workUnitFactsQuery.isLoading ? <Skeleton className="h-44 w-full rounded-none" /> : null}

      {!workUnitFactsQuery.isLoading && search.tab === "primitive" ? (
        <section className="space-y-3">
          {filteredPrimitiveCards.length === 0 ? (
            <section className="border border-border/80 bg-background p-4 text-sm text-muted-foreground">
              No primitive fact definitions match the current filters.
            </section>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {filteredPrimitiveCards.map((card) => (
                <li key={card.factDefinitionId}>
                  <Card
                    frame="cut"
                    tone="runtime"
                    className="h-full border-border/80 bg-background/40"
                  >
                    <CardHeader className="space-y-1">
                      <CardDescription className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                        {card.factType} · {card.cardinality}
                      </CardDescription>
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

                      <Link
                        to="/projects/$projectId/work-units/$projectWorkUnitId/facts/$factDefinitionId"
                        params={{
                          projectId,
                          projectWorkUnitId,
                          factDefinitionId: card.factDefinitionId,
                        }}
                        search={{
                          tab: search.tab,
                          q: search.q,
                          existence: search.existence,
                          primitiveFactType: search.primitiveFactType,
                          hasActiveTransition: search.hasActiveTransition,
                        }}
                        className="inline-flex text-xs font-medium uppercase tracking-[0.12em] text-primary hover:underline"
                      >
                        Open detail
                      </Link>
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
          <section className="space-y-3 border border-border/80 bg-background p-4">
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
                      frame="cut"
                      tone="runtime"
                      className="h-full border-border/80 bg-background/40"
                    >
                      <CardHeader className="space-y-1">
                        <CardDescription className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                          {card.cardinality} · {card.count} current member
                          {card.count === 1 ? "" : "s"}
                        </CardDescription>
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

                        <Link
                          to="/projects/$projectId/work-units/$projectWorkUnitId/facts/$factDefinitionId"
                          params={{
                            projectId,
                            projectWorkUnitId,
                            factDefinitionId: card.factDefinitionId,
                          }}
                          search={{
                            tab: search.tab,
                            q: search.q,
                            existence: search.existence,
                            primitiveFactType: search.primitiveFactType,
                            hasActiveTransition: search.hasActiveTransition,
                          }}
                          className="inline-flex text-xs font-medium uppercase tracking-[0.12em] text-primary hover:underline"
                        >
                          Open detail
                        </Link>
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3 border border-border/80 bg-background p-4">
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
                      frame="cut"
                      tone="runtime"
                      className="h-full border-border/80 bg-background/40"
                    >
                      <CardHeader className="space-y-1">
                        <CardDescription className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                          {card.cardinality} · {card.count} current member
                          {card.count === 1 ? "" : "s"}
                        </CardDescription>
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

                        <Link
                          to="/projects/$projectId/work-units/$projectWorkUnitId/facts/$factDefinitionId"
                          params={{
                            projectId,
                            projectWorkUnitId,
                            factDefinitionId: card.factDefinitionId,
                          }}
                          search={{
                            tab: search.tab,
                            q: search.q,
                            existence: search.existence,
                            primitiveFactType: search.primitiveFactType,
                            hasActiveTransition: search.hasActiveTransition,
                          }}
                          className="inline-flex text-xs font-medium uppercase tracking-[0.12em] text-primary hover:underline"
                        >
                          Open detail
                        </Link>
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </section>
      ) : null}
    </MethodologyWorkspaceShell>
  );
}
