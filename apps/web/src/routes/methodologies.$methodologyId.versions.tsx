import { Link, Outlet, createFileRoute, useLocation } from "@tanstack/react-router";

import { buttonVariants } from "@/components/ui/button";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";

export const Route = createFileRoute("/methodologies/$methodologyId/versions")({
  component: MethodologyVersionsRoute,
});

export function MethodologyVersionsRoute() {
  const { methodologyId } = Route.useParams();
  const location = useLocation();

  const versionsPath = `/methodologies/${methodologyId}/versions`;

  if (location.pathname !== versionsPath) {
    return <Outlet />;
  }

  return (
    <MethodologyWorkspaceShell
      title="Methodology Versions (Compatibility Route)"
      stateLabel="success"
      segments={[
        { label: "Methodologies", to: "/methodologies" },
        { label: methodologyId, to: "/methodologies/$methodologyId", params: { methodologyId } },
        { label: "Versions" },
      ]}
    >
      <section className="border border-border/80 bg-background p-4">
        <p className="text-sm text-muted-foreground">
          Version index behaviors now live on the Methodology Dashboard to avoid duplicated page
          maintenance.
        </p>
        <div className="mt-3">
          <Link
            to="/methodologies/$methodologyId"
            params={{ methodologyId }}
            className={buttonVariants({ size: "sm", variant: "outline" })}
          >
            Open Methodology Dashboard
          </Link>
        </div>
      </section>
    </MethodologyWorkspaceShell>
  );
}
