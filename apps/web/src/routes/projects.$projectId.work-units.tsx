import { useMemo } from "react";

import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";

const workUnitsSearchSchema = z.object({
  q: z.string().optional().default(""),
  hasActiveTransition: z.enum(["all", "active", "inactive"]).optional().default("all"),
});

const runtimeWorkUnitsQueryKey = (projectId: string, hasActiveTransition: string) =>
  ["runtime-work-units", projectId, hasActiveTransition] as const;

function formatUpdatedAt(timestamp: string): string {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return date.toLocaleString();
}

export const Route = createFileRoute("/projects/$projectId/work-units")({
  validateSearch: (search) => workUnitsSearchSchema.parse(search),
  component: ProjectWorkUnitsRoute,
});

export function ProjectWorkUnitsRoute() {
  const { projectId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { orpc } = Route.useRouteContext();

  const runtimeFilters = useMemo(() => {
    if (search.hasActiveTransition === "all") {
      return {} as { hasActiveTransition?: boolean };
    }

    return {
      hasActiveTransition: search.hasActiveTransition === "active",
    };
  }, [search.hasActiveTransition]);

  const runtimeWorkUnitsQuery = useQuery({
    ...orpc.project.getRuntimeWorkUnits.queryOptions({
      input: {
        projectId,
        ...(Object.keys(runtimeFilters).length > 0 ? { filters: runtimeFilters } : {}),
      },
    }),
    queryKey: runtimeWorkUnitsQueryKey(projectId, search.hasActiveTransition),
  });

  const filteredRows = useMemo(() => {
    const rows = runtimeWorkUnitsQuery.data?.rows ?? [];
    const query = search.q.trim().toLowerCase();

    return rows.filter((row) =>
      query.length === 0
        ? true
        : [
            row.displayIdentity.primaryLabel,
            row.displayIdentity.secondaryLabel,
            row.workUnitType.workUnitTypeKey,
            row.currentState.stateLabel,
            row.activeTransition?.transitionKey ?? "",
            row.activeTransition?.transitionName ?? "",
          ]
            .join(" ")
            .toLowerCase()
            .includes(query),
    );
  }, [runtimeWorkUnitsQuery.data?.rows, search.q]);

  return (
    <MethodologyWorkspaceShell
      title="Project work units"
      segments={[
        { label: "Projects", to: "/projects" },
        {
          label: runtimeWorkUnitsQuery.data?.project.name ?? projectId,
          to: "/projects/$projectId",
          params: { projectId },
        },
        { label: "Work Units" },
      ]}
    >
      <section className="grid gap-3 border border-border/80 bg-background p-4 md:grid-cols-[1fr_auto]">
        <Input
          value={search.q}
          onChange={(event) =>
            navigate({ search: { ...search, q: event.target.value }, replace: true })
          }
          placeholder="Filter work units by label, key, state, or transition"
        />

        <select
          value={search.hasActiveTransition}
          onChange={(event) =>
            navigate({
              search: {
                ...search,
                hasActiveTransition: event.target.value as "all" | "active" | "inactive",
              },
              replace: true,
            })
          }
          className="border border-border/80 bg-background px-3 py-2 text-sm"
        >
          <option value="all">All work units</option>
          <option value="active">With active transition</option>
          <option value="inactive">Without active transition</option>
        </select>
      </section>

      <section className="chiron-frame-flat overflow-hidden">
        {filteredRows.length === 0 ? (
          <div className="border border-border/80 bg-background p-4 text-sm text-muted-foreground">
            No runtime work-unit instances match current filters.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Work Unit</TableHead>
                <TableHead>Current State</TableHead>
                <TableHead>Active Transition</TableHead>
                <TableHead>Facts / Dependencies</TableHead>
                <TableHead>Artifact Slots</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((row) => (
                <TableRow key={row.projectWorkUnitId}>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{row.displayIdentity.primaryLabel}</p>
                      <p
                        className="inline-flex border border-border/70 bg-background/70 px-2 py-0.5 text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground"
                        title={row.displayIdentity.fullInstanceId}
                      >
                        {row.displayIdentity.secondaryLabel}
                      </p>
                      <p className="text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground">
                        {row.workUnitType.workUnitTypeKey}
                      </p>
                      <Link
                        to="/projects/$projectId/work-units/$projectWorkUnitId"
                        params={{ projectId, projectWorkUnitId: row.projectWorkUnitId }}
                        search={{
                          q: search.q,
                          hasActiveTransition: search.hasActiveTransition,
                        }}
                        className="inline-flex text-xs font-medium uppercase tracking-[0.12em] text-primary hover:underline"
                      >
                        Open overview
                      </Link>
                    </div>
                  </TableCell>

                  <TableCell>
                    <p className="text-xs text-muted-foreground">{row.currentState.stateLabel}</p>
                  </TableCell>

                  <TableCell>
                    {row.activeTransition ? (
                      <div className="space-y-1 text-xs">
                        <p className="font-medium">
                          {row.activeTransition.transitionName ??
                            row.activeTransition.transitionKey}
                        </p>
                        <p className="text-muted-foreground">
                          {row.activeTransition.transitionKey}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No active transition</p>
                    )}
                  </TableCell>

                  <TableCell>
                    <p className="text-xs text-muted-foreground">
                      {row.summaries.factsDependencies.factInstancesCurrent} /{" "}
                      {row.summaries.factsDependencies.factDefinitionsTotal}
                    </p>
                    <p className="text-[0.68rem] text-muted-foreground">
                      in {row.summaries.factsDependencies.inboundDependencyCount} · out{" "}
                      {row.summaries.factsDependencies.outboundDependencyCount}
                    </p>
                  </TableCell>

                  <TableCell>
                    <p className="text-xs text-muted-foreground">
                      {row.summaries.artifactSlots.slotsWithCurrentArtifacts} /{" "}
                      {row.summaries.artifactSlots.slotDefinitionsTotal}
                    </p>
                  </TableCell>

                  <TableCell>
                    <p className="text-xs text-muted-foreground">
                      {formatUpdatedAt(row.timestamps.updatedAt)}
                    </p>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </MethodologyWorkspaceShell>
  );
}
