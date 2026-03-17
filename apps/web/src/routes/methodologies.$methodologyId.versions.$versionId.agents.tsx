import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { Button, buttonVariants } from "@/components/ui/button";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";

export const Route = createFileRoute("/methodologies/$methodologyId/versions/$versionId/agents")({
  validateSearch: (search) =>
    z
      .object({
        intent: z.enum(["add-agent"]).optional(),
        tab: z.enum(["catalog", "contracts", "diagnostics"]).optional(),
      })
      .parse(search),
  component: MethodologyVersionAgentsRoute,
});

export function MethodologyVersionAgentsRoute() {
  const { methodologyId, versionId } = Route.useParams();
  const search = Route.useSearch();
  const tab = search.tab ?? "catalog";
  const { orpc } = Route.useRouteContext();

  const draftQuery = useQuery(
    orpc.methodology.getDraftProjection.queryOptions({
      input: { versionId },
    }),
  );

  const agentTypes = ((
    draftQuery.data as
      | { agentTypes?: ReadonlyArray<{ key?: string; displayName?: string }> }
      | undefined
  )?.agentTypes ?? []) as ReadonlyArray<{ key?: string; displayName?: string }>;

  return (
    <MethodologyWorkspaceShell
      title="Agents"
      stateLabel={draftQuery.isLoading ? "loading" : draftQuery.isError ? "failed" : "success"}
      segments={[
        { label: "Methodologies", to: "/methodologies" },
        { label: methodologyId, to: "/methodologies/$methodologyId", params: { methodologyId } },
        {
          label: "Versions",
          to: "/methodologies/$methodologyId/versions",
          params: { methodologyId },
        },
        {
          label: versionId,
          to: "/methodologies/$methodologyId/versions/$versionId",
          params: { methodologyId, versionId },
        },
        { label: "Agents" },
      ]}
    >
      <section className="chiron-frame-flat chiron-tone-navigation p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["catalog", "Catalog"],
                ["contracts", "Contracts"],
                ["diagnostics", "Diagnostics"],
              ] as const
            ).map(([key, label]) => (
              <Link
                key={key}
                to="/methodologies/$methodologyId/versions/$versionId/agents"
                params={{ methodologyId, versionId }}
                search={{ intent: search.intent, tab: key }}
                className={buttonVariants({
                  size: "sm",
                  variant: tab === key ? "default" : "outline",
                })}
              >
                {label}
              </Link>
            ))}
          </div>
          <Button size="sm" className="rounded-none">
            + Add Agent
          </Button>
        </div>
        {search.intent === "add-agent" ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Add Agent requested from command palette.
          </p>
        ) : null}
      </section>

      {draftQuery.isLoading ? <p className="text-sm">Loading agent definitions...</p> : null}
      {draftQuery.isError ? (
        <p className="text-sm">
          State: failed - Unable to load agent definitions while preserving version context.
        </p>
      ) : null}

      {!draftQuery.isLoading && !draftQuery.isError ? (
        <section className="grid gap-2 md:grid-cols-2">
          {agentTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No agent definitions yet.</p>
          ) : (
            agentTypes.map((agent, index) => {
              const key = agent?.key ?? `agent-${index + 1}`;
              return (
                <article key={key} className="chiron-frame-flat p-3">
                  <p className="font-medium">{agent?.displayName ?? key}</p>
                  <p className="text-xs text-muted-foreground">{key}</p>
                </article>
              );
            })
          )}
        </section>
      ) : null}
    </MethodologyWorkspaceShell>
  );
}
