import { useMemo } from "react";

import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { Input } from "@/components/ui/input";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";
import type { BaselinePreview } from "@/features/projects/baseline-visibility";

const workUnitsSearchSchema = z.object({
  q: z.string().optional().default(""),
  workUnitTypeKey: z.string().optional(),
});

export const Route = createFileRoute("/projects/$projectId/work-units")({
  validateSearch: (search) => workUnitsSearchSchema.parse(search),
  component: ProjectWorkUnitsRoute,
});

function ProjectWorkUnitsRoute() {
  const { projectId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { orpc } = Route.useRouteContext();

  const projectQuery = useQuery(
    orpc.project.getProjectDetails.queryOptions({
      input: { projectId, workUnitTypeKey: search.workUnitTypeKey },
    }),
  );
  const baselinePreview = (projectQuery.data?.baselinePreview ?? null) as BaselinePreview | null;

  const workUnits = useMemo(() => {
    if (!baselinePreview) {
      return [] as Array<{ workUnitTypeKey: string; guidance?: unknown }>;
    }

    if (baselinePreview.projectionSummary?.workUnits?.length) {
      return baselinePreview.projectionSummary.workUnits;
    }

    return baselinePreview.transitionPreview.workUnitTypeKey
      ? [{ workUnitTypeKey: baselinePreview.transitionPreview.workUnitTypeKey }]
      : [];
  }, [baselinePreview]);

  const filteredWorkUnits = useMemo(() => {
    const query = search.q.trim().toLowerCase();
    return workUnits.filter(
      (workUnit) => query.length === 0 || workUnit.workUnitTypeKey.toLowerCase().includes(query),
    );
  }, [workUnits, search.q]);

  return (
    <MethodologyWorkspaceShell
      title="Project work units"
      segments={[
        { label: "Projects", to: "/projects" },
        {
          label: projectQuery.data?.project.displayName ?? projectId,
          to: "/projects/$projectId",
          params: { projectId },
        },
        { label: "Work Units" },
      ]}
    >
      <section className="grid gap-3 md:grid-cols-[1fr_auto]">
        <Input
          value={search.q}
          onChange={(event) =>
            navigate({ search: { ...search, q: event.target.value }, replace: true })
          }
          placeholder="Filter work units by key"
        />
        <select
          value={search.workUnitTypeKey ?? baselinePreview?.transitionPreview.workUnitTypeKey ?? ""}
          onChange={(event) =>
            navigate({
              search: {
                ...search,
                workUnitTypeKey: event.target.value || undefined,
              },
              replace: true,
            })
          }
          className="border border-border/80 bg-background px-3 py-2 text-sm"
        >
          {workUnits.map((workUnit) => (
            <option key={workUnit.workUnitTypeKey} value={workUnit.workUnitTypeKey}>
              {workUnit.workUnitTypeKey}
            </option>
          ))}
        </select>
      </section>

      <section className="space-y-2 border border-border/80 bg-background p-4 text-sm">
        {filteredWorkUnits.length === 0 ? (
          <p className="text-muted-foreground">No work units match current filters.</p>
        ) : (
          <ul className="space-y-2">
            {filteredWorkUnits.map((workUnit) => {
              const isCurrent =
                baselinePreview?.transitionPreview.workUnitTypeKey === workUnit.workUnitTypeKey;
              return (
                <li
                  key={workUnit.workUnitTypeKey}
                  className="border border-border/70 bg-background/40 p-3"
                >
                  <p className="font-medium">{workUnit.workUnitTypeKey}</p>
                  <p className="text-xs text-muted-foreground">
                    {isCurrent ? "Current readiness context" : "Available in methodology contract"}
                  </p>
                  {workUnit.guidance !== undefined && workUnit.guidance !== null ? (
                    <div className="mt-2 border border-border/70 bg-background/60 p-2 text-xs text-muted-foreground">
                      <p className="font-medium text-foreground">Work unit guidance</p>
                      <pre className="mt-1 whitespace-pre-wrap font-mono text-xs">
                        {typeof workUnit.guidance === "string"
                          ? workUnit.guidance
                          : JSON.stringify(workUnit.guidance, null, 2)}
                      </pre>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </MethodologyWorkspaceShell>
  );
}
