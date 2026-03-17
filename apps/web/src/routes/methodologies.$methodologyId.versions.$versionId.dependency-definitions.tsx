import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { Button, buttonVariants } from "@/components/ui/button";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";

export const Route = createFileRoute(
  "/methodologies/$methodologyId/versions/$versionId/dependency-definitions",
)({
  validateSearch: (search) =>
    z
      .object({
        intent: z.enum(["add-link-type"]).optional(),
        tab: z.enum(["definitions", "usage", "diagnostics"]).optional(),
      })
      .parse(search),
  component: MethodologyVersionDependencyDefinitionsRoute,
});

export function MethodologyVersionDependencyDefinitionsRoute() {
  const { methodologyId, versionId } = Route.useParams();
  const search = Route.useSearch();
  const tab = search.tab ?? "definitions";
  const { orpc } = Route.useRouteContext();

  const draftQuery = useQuery(
    orpc.methodology.getDraftProjection.queryOptions({
      input: { versionId },
    }),
  );

  const bindings =
    (draftQuery.data as { transitionWorkflowBindings?: Record<string, unknown> } | undefined)
      ?.transitionWorkflowBindings ?? {};
  const linkTypeKeys = Object.keys(bindings).sort();

  return (
    <MethodologyWorkspaceShell
      title="Dependency Definitions"
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
        { label: "Dependency Definitions" },
      ]}
    >
      <section className="chiron-frame-flat chiron-tone-navigation p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["definitions", "Definitions"],
                ["usage", "Usage"],
                ["diagnostics", "Diagnostics"],
              ] as const
            ).map(([key, label]) => (
              <Link
                key={key}
                to="/methodologies/$methodologyId/versions/$versionId/dependency-definitions"
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
            + Add Link Type
          </Button>
        </div>
        {search.intent === "add-link-type" ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Add Link Type requested from command palette.
          </p>
        ) : null}
      </section>

      {draftQuery.isLoading ? <p className="text-sm">Loading dependency definitions...</p> : null}
      {draftQuery.isError ? (
        <p className="text-sm">
          State: failed - Unable to load dependency definitions while preserving current
          methodology/version context.
        </p>
      ) : null}

      {!draftQuery.isLoading && !draftQuery.isError ? (
        <section className="chiron-frame-flat p-3">
          <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
            Known Link Types
          </p>
          {linkTypeKeys.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No link types yet.</p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm">
              {linkTypeKeys.map((key) => (
                <li key={key} className="border border-border/70 p-2">
                  {key}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </MethodologyWorkspaceShell>
  );
}
