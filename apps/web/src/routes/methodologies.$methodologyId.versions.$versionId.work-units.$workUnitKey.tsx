import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { Button, buttonVariants } from "@/components/ui/button";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";

export const Route = createFileRoute(
  "/methodologies/$methodologyId/versions/$versionId/work-units/$workUnitKey",
)({
  validateSearch: (search) =>
    z
      .object({
        tab: z
          .enum(["overview", "facts", "workflows", "state-machine", "artifact-slots"])
          .optional(),
      })
      .parse(search),
  component: MethodologyVersionWorkUnitDetailsRoute,
});

export function MethodologyVersionWorkUnitDetailsRoute() {
  const { methodologyId, versionId, workUnitKey } = Route.useParams();
  const search = Route.useSearch();
  const tab = search.tab ?? "overview";
  const { orpc } = Route.useRouteContext();

  const draftQuery = useQuery(
    orpc.methodology.version.workUnit.get.queryOptions({
      input: { versionId },
    }),
  );

  return (
    <MethodologyWorkspaceShell
      title={`Work Unit · ${workUnitKey}`}
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
        {
          label: "Work Units",
          to: "/methodologies/$methodologyId/versions/$versionId/work-units",
          params: { methodologyId, versionId },
        },
        { label: workUnitKey },
      ]}
    >
      <section className="chiron-frame-flat chiron-tone-navigation p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["overview", "Overview"],
                ["facts", "Facts"],
                ["workflows", "Workflows"],
                ["state-machine", "State Machine"],
                ["artifact-slots", "Artifact Slots"],
              ] as const
            ).map(([key, label]) => (
              <Link
                key={key}
                to="/methodologies/$methodologyId/versions/$versionId/work-units/$workUnitKey"
                params={{ methodologyId, versionId, workUnitKey }}
                search={{ tab: key }}
                className={buttonVariants({
                  size: "sm",
                  variant: tab === key ? "default" : "outline",
                })}
              >
                {label}
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="rounded-none">
              Add Fact
            </Button>
            <Button size="sm" variant="outline" className="rounded-none">
              Add Workflow
            </Button>
            <Button size="sm" className="rounded-none">
              Open Workflow Editor
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-[2fr_1fr]">
        <div className="chiron-frame-flat p-3">
          <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
            {tab} Surface
          </p>
          {draftQuery.isLoading ? (
            <p className="mt-2 text-sm">Loading work-unit details...</p>
          ) : draftQuery.isError ? (
            <p className="mt-2 text-sm">
              State: failed - Unable to load work-unit details while preserving selected context.
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              L2 detail shell is active for deterministic Story 3.1 baseline.
            </p>
          )}
        </div>

        <div className="chiron-frame-flat p-3">
          <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
            Selection Summary
          </p>
          <p className="mt-2 text-sm">Methodology: {methodologyId}</p>
          <p className="text-sm">Version: {versionId}</p>
          <p className="text-sm">Work Unit: {workUnitKey}</p>
        </div>
      </section>
    </MethodologyWorkspaceShell>
  );
}
