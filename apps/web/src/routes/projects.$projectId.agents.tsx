import { useMemo } from "react";

import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { Input } from "@/components/ui/input";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";
import type { BaselinePreview } from "@/features/projects/baseline-visibility";

const agentsSearchSchema = z.object({
  q: z.string().optional().default(""),
});

export const Route = createFileRoute("/projects/$projectId/agents")({
  validateSearch: (search) => agentsSearchSchema.parse(search),
  component: ProjectAgentsRoute,
});

function ProjectAgentsRoute() {
  const { projectId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { orpc } = Route.useRouteContext();

  const projectQuery = useQuery(
    orpc.project.getProjectDetails.queryOptions({ input: { projectId } }),
  );
  const baselinePreview = (projectQuery.data?.baselinePreview ?? null) as BaselinePreview | null;

  const agents = baselinePreview?.projectionSummary?.agents ?? [];

  const filteredAgents = useMemo(() => {
    const query = search.q.trim().toLowerCase();
    return agents.filter((agent) => query.length === 0 || agent.toLowerCase().includes(query));
  }, [agents, search.q]);

  return (
    <MethodologyWorkspaceShell
      title="Project agents"
      segments={[
        { label: "Projects", to: "/projects" },
        {
          label: projectQuery.data?.project.displayName ?? projectId,
          to: "/projects/$projectId",
          params: { projectId },
        },
        { label: "Agents" },
      ]}
    >
      <section className="grid gap-3 md:grid-cols-[1fr_auto]">
        <Input
          value={search.q}
          onChange={(event) =>
            navigate({ search: { ...search, q: event.target.value }, replace: true })
          }
          placeholder="Filter agents by key"
        />
      </section>

      <section className="space-y-2 border border-border/80 bg-background p-4 text-sm">
        {filteredAgents.length === 0 ? (
          <p className="text-muted-foreground">No agents match current filters.</p>
        ) : (
          <ul className="space-y-2">
            {filteredAgents.map((agent) => (
              <li key={agent} className="border border-border/70 bg-background/40 p-3">
                <p className="font-medium">{agent}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </MethodologyWorkspaceShell>
  );
}
