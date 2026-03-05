import { useMemo } from "react";

import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { Input } from "@/components/ui/input";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";
import type { BaselinePreview } from "@/features/projects/baseline-visibility";

const factsSearchSchema = z.object({
  q: z.string().optional().default(""),
  state: z.enum(["all", "missing", "filled"]).optional().default("all"),
});

export const Route = createFileRoute("/projects/$projectId/facts")({
  validateSearch: (search) => factsSearchSchema.parse(search),
  component: ProjectFactsRoute,
});

function ProjectFactsRoute() {
  const { projectId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { orpc } = Route.useRouteContext();

  const projectQuery = useQuery(
    orpc.project.getProjectDetails.queryOptions({ input: { projectId } }),
  );
  const baselinePreview = (projectQuery.data?.baselinePreview ?? null) as BaselinePreview | null;

  const allFacts = useMemo(() => {
    if (!baselinePreview) {
      return [] as Array<{
        workUnitTypeKey: string;
        key: string;
        type: string;
        required: boolean;
        defaultValue: unknown;
      }>;
    }

    if (baselinePreview.projectionSummary?.facts?.length) {
      return baselinePreview.projectionSummary.facts;
    }

    return baselinePreview.facts.map((fact) => ({
      workUnitTypeKey: baselinePreview.transitionPreview.workUnitTypeKey ?? "unknown",
      key: fact.key,
      type: fact.type,
      required: fact.required,
      defaultValue: fact.value,
    }));
  }, [baselinePreview]);

  const filteredFacts = useMemo(() => {
    const query = search.q.trim().toLowerCase();
    return allFacts.filter((fact) => {
      const matchesQuery =
        query.length === 0 ||
        `${fact.workUnitTypeKey} ${fact.key} ${fact.type}`.toLowerCase().includes(query);
      const isMissing =
        fact.required && (fact.defaultValue === null || fact.defaultValue === undefined);
      const matchesState =
        search.state === "all" || (search.state === "missing" ? isMissing : !isMissing);
      return matchesQuery && matchesState;
    });
  }, [allFacts, search.q, search.state]);

  return (
    <MethodologyWorkspaceShell
      title="Project facts"
      segments={[
        { label: "Projects", to: "/projects" },
        {
          label: projectQuery.data?.project.displayName ?? projectId,
          to: "/projects/$projectId",
          params: { projectId },
        },
        { label: "Facts" },
      ]}
    >
      <section className="grid gap-3 md:grid-cols-[1fr_auto]">
        <Input
          value={search.q}
          onChange={(event) =>
            navigate({ search: { ...search, q: event.target.value }, replace: true })
          }
          placeholder="Filter facts by work unit, key, or type"
        />
        <select
          value={search.state}
          onChange={(event) =>
            navigate({
              search: { ...search, state: event.target.value as "all" | "missing" | "filled" },
              replace: true,
            })
          }
          className="border border-border/80 bg-background px-3 py-2 text-sm"
        >
          <option value="all">All facts</option>
          <option value="missing">Missing required</option>
          <option value="filled">Filled/defaulted</option>
        </select>
      </section>

      <section className="space-y-2 border border-border/80 bg-background p-4 text-sm">
        {filteredFacts.length === 0 ? (
          <p className="text-muted-foreground">No facts match current filters.</p>
        ) : (
          <ul className="space-y-2">
            {filteredFacts.map((fact) => (
              <li
                key={`${fact.workUnitTypeKey}-${fact.key}`}
                className="border border-border/70 bg-background/40 p-3"
              >
                <p className="font-medium">{fact.key}</p>
                <p className="text-xs text-muted-foreground">
                  {fact.workUnitTypeKey} | {fact.type} | {fact.required ? "required" : "optional"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </MethodologyWorkspaceShell>
  );
}
