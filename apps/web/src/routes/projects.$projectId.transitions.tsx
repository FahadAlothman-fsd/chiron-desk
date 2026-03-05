import { useMemo } from "react";

import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { Input } from "@/components/ui/input";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";
import type { BaselinePreview } from "@/features/projects/baseline-visibility";

const transitionsSearchSchema = z.object({
  q: z.string().optional().default(""),
  status: z.enum(["all", "eligible", "blocked", "future"]).optional().default("all"),
});

export const Route = createFileRoute("/projects/$projectId/transitions")({
  validateSearch: (search) => transitionsSearchSchema.parse(search),
  component: ProjectTransitionsRoute,
});

function ProjectTransitionsRoute() {
  const { projectId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { orpc } = Route.useRouteContext();

  const projectQuery = useQuery(
    orpc.project.getProjectDetails.queryOptions({ input: { projectId } }),
  );
  const baselinePreview = (projectQuery.data?.baselinePreview ?? null) as BaselinePreview | null;

  const transitions = baselinePreview?.transitionPreview.transitions ?? [];

  const filteredTransitions = useMemo(() => {
    const query = search.q.trim().toLowerCase();
    return transitions.filter((transition) => {
      const matchesQuery =
        query.length === 0 ||
        `${transition.transitionKey} ${transition.fromState ?? "__absent__"} ${transition.toState} ${transition.statusReasonCode}`
          .toLowerCase()
          .includes(query);
      const matchesStatus = search.status === "all" || transition.status === search.status;
      return matchesQuery && matchesStatus;
    });
  }, [search.q, search.status, transitions]);

  return (
    <MethodologyWorkspaceShell
      title="Project transitions"
      segments={[
        { label: "Projects", to: "/projects" },
        {
          label: projectQuery.data?.project.displayName ?? projectId,
          to: "/projects/$projectId",
          params: { projectId },
        },
        { label: "Transitions" },
      ]}
    >
      <section className="grid gap-3 md:grid-cols-[1fr_auto]">
        <Input
          value={search.q}
          onChange={(event) =>
            navigate({ search: { ...search, q: event.target.value }, replace: true })
          }
          placeholder="Filter transitions by key or reason"
        />
        <select
          value={search.status}
          onChange={(event) =>
            navigate({
              search: {
                ...search,
                status: event.target.value as "all" | "eligible" | "blocked" | "future",
              },
              replace: true,
            })
          }
          className="border border-border/80 bg-background px-3 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="eligible">Eligible</option>
          <option value="blocked">Blocked</option>
          <option value="future">Future</option>
        </select>
      </section>

      <section className="space-y-2 border border-border/80 bg-background p-4 text-sm">
        <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
          Work unit context: {baselinePreview?.transitionPreview.workUnitTypeKey ?? "n/a"}
        </p>
        {filteredTransitions.length === 0 ? (
          <p className="text-muted-foreground">No transitions match current filters.</p>
        ) : (
          <ul className="space-y-2">
            {filteredTransitions.map((transition) => (
              <li
                key={transition.transitionKey}
                className="border border-border/70 bg-background/40 p-3"
              >
                <p className="font-medium">{transition.transitionKey}</p>
                <p className="text-xs text-muted-foreground">
                  {transition.fromState ?? "__absent__"} -&gt; {transition.toState} (
                  {transition.gateClass})
                </p>
                <p className="text-xs">status: {transition.status}</p>
                <p className="text-xs text-muted-foreground">
                  reason: {transition.statusReasonCode}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </MethodologyWorkspaceShell>
  );
}
