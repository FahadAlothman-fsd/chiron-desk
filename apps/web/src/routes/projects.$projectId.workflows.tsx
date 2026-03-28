import { useMemo } from "react";

import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";

const activeWorkflowsSearchSchema = z.object({
  q: z.string().optional().default(""),
  workUnitTypeKey: z.string().optional().default("all"),
});

export const runtimeActiveWorkflowsQueryKey = (projectId: string) =>
  ["runtime-active-workflows", projectId] as const;

export const Route = createFileRoute("/projects/$projectId/workflows")({
  validateSearch: (search) => activeWorkflowsSearchSchema.parse(search),
  component: ProjectActiveWorkflowsRoute,
});

function formatStartedAt(value: string): string {
  const timestamp = new Date(value);

  if (Number.isNaN(timestamp.getTime())) {
    return value;
  }

  return timestamp.toLocaleString();
}

export function ProjectActiveWorkflowsRoute() {
  const { projectId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { orpc } = Route.useRouteContext();

  const activeWorkflowsQuery = useQuery({
    ...orpc.project.getRuntimeActiveWorkflows.queryOptions({
      input: { projectId },
    }),
    queryKey: runtimeActiveWorkflowsQueryKey(projectId),
  });

  const rows = activeWorkflowsQuery.data ?? [];

  const workUnitTypeOptions = useMemo(
    () => ["all", ...new Set(rows.map((row) => row.workUnit.workUnitTypeKey).filter(Boolean))],
    [rows],
  );

  const filteredRows = useMemo(() => {
    const query = search.q.trim().toLowerCase();

    return rows.filter((row) => {
      if (
        search.workUnitTypeKey !== "all" &&
        row.workUnit.workUnitTypeKey !== search.workUnitTypeKey
      ) {
        return false;
      }

      if (query.length === 0) {
        return true;
      }

      const haystack = [
        row.workflowName,
        row.workflowKey,
        row.workflowExecutionId,
        row.workUnit.workUnitTypeKey,
        row.workUnit.workUnitLabel,
        row.transition.transitionName,
        row.transition.transitionKey,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [rows, search.q, search.workUnitTypeKey]);

  return (
    <MethodologyWorkspaceShell
      title="Active workflows"
      stateLabel={
        activeWorkflowsQuery.isLoading
          ? "loading"
          : activeWorkflowsQuery.isError
            ? "failed"
            : "normal"
      }
      segments={[
        { label: "Projects", to: "/projects" },
        {
          label: projectId,
          to: "/projects/$projectId",
          params: { projectId },
        },
        { label: "Active Workflows" },
      ]}
    >
      <section className="grid gap-3 border border-border/80 bg-background p-4 md:grid-cols-[1fr_auto]">
        <Input
          value={search.q}
          onChange={(event) =>
            navigate({ search: { ...search, q: event.target.value }, replace: true })
          }
          placeholder="Filter active workflows"
          aria-label="Filter active workflows"
        />

        <select
          value={search.workUnitTypeKey}
          onChange={(event) =>
            navigate({
              search: {
                ...search,
                workUnitTypeKey: event.target.value || "all",
              },
              replace: true,
            })
          }
          className="border border-border/80 bg-background px-3 py-2 text-sm"
          aria-label="Filter by work-unit type"
        >
          {workUnitTypeOptions.map((workUnitTypeKey) => (
            <option key={workUnitTypeKey} value={workUnitTypeKey}>
              {workUnitTypeKey === "all" ? "All work-unit types" : workUnitTypeKey}
            </option>
          ))}
        </select>
      </section>

      <section className="border border-border/80 bg-background p-4">
        {activeWorkflowsQuery.isLoading ? <Skeleton className="h-44 w-full rounded-none" /> : null}

        {!activeWorkflowsQuery.isLoading && filteredRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No active workflows match current filters.
          </p>
        ) : null}

        {!activeWorkflowsQuery.isLoading && filteredRows.length > 0 ? (
          <Table data-testid="runtime-active-workflows-table">
            <TableHeader>
              <TableRow>
                <TableHead>Work Unit</TableHead>
                <TableHead>Transition</TableHead>
                <TableHead>Workflow Execution</TableHead>
                <TableHead>Started At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.map((row) => (
                <TableRow
                  key={row.workflowExecutionId}
                  data-testid={`runtime-active-workflow-row-${row.workflowExecutionId}`}
                  className="cursor-pointer"
                  tabIndex={0}
                  onClick={() =>
                    navigate({
                      to: "/projects/$projectId/workflow-executions/$workflowExecutionId",
                      params: {
                        projectId,
                        workflowExecutionId: row.workflowExecutionId,
                      },
                    })
                  }
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") {
                      return;
                    }

                    event.preventDefault();
                    void navigate({
                      to: "/projects/$projectId/workflow-executions/$workflowExecutionId",
                      params: {
                        projectId,
                        workflowExecutionId: row.workflowExecutionId,
                      },
                    });
                  }}
                >
                  <TableCell>
                    <div className="space-y-1 text-xs">
                      <p className="font-medium text-foreground">{row.workUnit.workUnitTypeKey}</p>
                      <p className="text-muted-foreground">{row.workUnit.workUnitLabel}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 text-xs">
                      <p className="font-medium text-foreground">{row.transition.transitionName}</p>
                      <p className="text-muted-foreground">{row.transition.transitionKey}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link
                      to="/projects/$projectId/workflow-executions/$workflowExecutionId"
                      params={{ projectId, workflowExecutionId: row.workflowExecutionId }}
                      data-testid={`runtime-active-workflow-link-${row.workflowExecutionId}`}
                      className="inline-flex text-xs font-medium uppercase tracking-[0.1em] text-primary hover:underline"
                    >
                      {row.workflowName}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">{row.workflowKey}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-xs text-muted-foreground">
                      {formatStartedAt(row.startedAt)}
                    </p>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </section>
    </MethodologyWorkspaceShell>
  );
}
