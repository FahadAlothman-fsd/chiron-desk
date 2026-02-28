import { Link, createFileRoute } from "@tanstack/react-router";

import { Button, buttonVariants } from "@/components/ui/button";
import { RUNTIME_DEFERRED_RATIONALE } from "@/features/methodologies/foundation";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";

export const Route = createFileRoute("/methodologies/$methodologyId/versions/$versionId")({
  component: MethodologyWorkspaceEntryRoute,
});

function MethodologyWorkspaceEntryRoute() {
  const { methodologyId, versionId } = Route.useParams();

  return (
    <MethodologyWorkspaceShell
      title="Methodology Version Workspace Entry"
      stateLabel="success"
      segments={[
        { label: "Methodologies", to: "/methodologies" },
        { label: methodologyId, to: "/methodologies/$methodologyId", params: { methodologyId } },
        {
          label: "Versions",
          to: "/methodologies/$methodologyId/versions",
          params: { methodologyId },
        },
        { label: versionId },
      ]}
    >
      <section className="border border-border/80 bg-background p-4">
        <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
          Workspace Context
        </p>
        <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
          <p>
            Methodology:{" "}
            <span className="font-semibold uppercase tracking-[0.06em]">{methodologyId}</span>
          </p>
          <p>
            Version: <span className="font-semibold uppercase tracking-[0.06em]">{versionId}</span>
          </p>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Deterministic Epic 2 entry established. Deep authoring and runtime execution unlock in
          next stories.
        </p>
      </section>

      <section className="border border-border/80 bg-background p-4">
        <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
          Navigation
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            to="/methodologies/$methodologyId/versions"
            params={{ methodologyId }}
            className={buttonVariants({ size: "sm", variant: "outline" })}
          >
            Back to Versions
          </Link>
          <Link
            to="/methodologies/$methodologyId"
            params={{ methodologyId }}
            className={buttonVariants({ size: "sm", variant: "outline" })}
          >
            Back to Details
          </Link>
        </div>
      </section>

      <section className="border border-border/80 bg-background p-4">
        <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">Runtime</p>
        <div className="mt-3 flex items-center gap-3">
          <Button aria-disabled="true" disabled variant="outline" className="rounded-none">
            Runtime Execution (Epic 3+)
          </Button>
          <p className="text-xs text-muted-foreground">{RUNTIME_DEFERRED_RATIONALE}</p>
        </div>
      </section>
    </MethodologyWorkspaceShell>
  );
}
