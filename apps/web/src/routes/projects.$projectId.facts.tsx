import { useMemo } from "react";

import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

export function ProjectFactsRoute() {
  const { projectId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { orpc } = Route.useRouteContext();

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
      <section className="grid gap-3 border border-border/80 bg-background p-4 md:grid-cols-[1fr_auto_auto]">
        <Input
          value={search.q}
          onChange={(event) =>
            navigate({ search: { ...search, q: event.target.value }, replace: true })
          }
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
          className="border border-border/80 bg-background px-3 py-2 text-sm"
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
          className="border border-border/80 bg-background px-3 py-2 text-sm"
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
          <section className="border border-border/80 bg-background p-4 text-sm text-muted-foreground">
            No project fact definitions match the current filters.
          </section>
        ) : null}

        {!projectFactsQuery.isLoading && filteredCards.length > 0 ? (
          <ul className="grid gap-3 md:grid-cols-2">
            {filteredCards.map((card) => (
              <li key={card.factDefinitionId}>
                <Card
                  frame="cut"
                  tone="runtime"
                  className="h-full border-border/80 bg-background/40"
                >
                  <CardHeader className="space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardDescription className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                        {card.factType} · {card.cardinality}
                      </CardDescription>
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
                        {card.currentValues.slice(0, 3).map((value, index) => (
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

                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to="/projects/$projectId/facts/$factDefinitionId"
                        params={{ projectId, factDefinitionId: card.factDefinitionId }}
                        search={{
                          q: search.q,
                          existence: search.existence,
                          factType: search.factType,
                        }}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "xs" }),
                          "rounded-none uppercase tracking-[0.12em]",
                        )}
                      >
                        Open detail
                      </Link>

                      <Link
                        to="/projects/$projectId/facts/$factDefinitionId"
                        params={{ projectId, factDefinitionId: card.factDefinitionId }}
                        search={{
                          q: search.q,
                          existence: search.existence,
                          factType: search.factType,
                        }}
                        className="inline-flex text-xs font-medium uppercase tracking-[0.12em] text-primary hover:underline"
                      >
                        Add value
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </MethodologyWorkspaceShell>
  );
}
