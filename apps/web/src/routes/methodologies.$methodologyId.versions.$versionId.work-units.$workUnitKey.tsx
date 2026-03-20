import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { CircleHelp, FilePlus2, PackagePlus, Workflow, X, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";

import { buttonVariants } from "@/components/ui/button";
import { OverviewTab } from "@/features/methodologies/work-unit-l2/OverviewTab";
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
  const [isKeymapOpen, setIsKeymapOpen] = useState(false);

  const toggleKeymap = useCallback(() => setIsKeymapOpen((value) => !value), []);

  useEffect(() => {
    const isTypingElement = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) {
        return false;
      }
      const tag = target.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingElement(event.target)) {
        return;
      }

      const isQuestionShortcut = event.key === "?" || (event.key === "/" && event.shiftKey);
      if (isQuestionShortcut) {
        event.preventDefault();
        toggleKeymap();
        return;
      }

      if (event.key === "Escape") {
        setIsKeymapOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleKeymap]);

  const draftQuery = useQuery(
    orpc.methodology.version.workUnit.get.queryOptions({
      input: { versionId },
    }),
  );

  const workUnitTypes = Array.isArray(
    (draftQuery.data as { workUnitTypes?: ReadonlyArray<{ key?: string }> } | undefined)
      ?.workUnitTypes,
  )
    ? ((draftQuery.data as { workUnitTypes?: ReadonlyArray<{ key?: string }> }).workUnitTypes ?? [])
    : [];
  const hasMatchingWorkUnit = workUnitTypes.some((workUnit) => workUnit?.key === workUnitKey);
  const hasResolvedInvalidSelection =
    !draftQuery.isLoading && !draftQuery.isError && !hasMatchingWorkUnit;

  const selectedWorkUnit = workUnitTypes.find((workUnit) => workUnit?.key === workUnitKey) as
    | {
        key?: string;
        factSchemas?: unknown[];
        workflows?: unknown[];
        lifecycle?: { states?: unknown[]; transitions?: unknown[] };
        artifactSlots?: unknown[];
      }
    | undefined;

  const factsCount = Array.isArray(selectedWorkUnit?.factSchemas)
    ? selectedWorkUnit.factSchemas.length
    : 0;
  const workflowsCount = Array.isArray(selectedWorkUnit?.workflows)
    ? selectedWorkUnit.workflows.length
    : 0;
  const statesCount = Array.isArray(selectedWorkUnit?.lifecycle?.states)
    ? selectedWorkUnit.lifecycle.states.length
    : 0;
  const transitionsCount = Array.isArray(selectedWorkUnit?.lifecycle?.transitions)
    ? selectedWorkUnit.lifecycle.transitions.length
    : 0;
  const artifactSlotsCount = Array.isArray(selectedWorkUnit?.artifactSlots)
    ? selectedWorkUnit.artifactSlots.length
    : 0;

  return (
    <MethodologyWorkspaceShell
      title={`Work Unit · ${workUnitKey}`}
      stateLabel={
        draftQuery.isLoading
          ? "loading"
          : draftQuery.isError || hasResolvedInvalidSelection
            ? "failed"
            : "success"
      }
      showBreadcrumbs={false}
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
        <div className="flex flex-wrap items-center gap-2">
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
      </section>

      {isKeymapOpen ? (
        <div data-testid="keymap-menu" className="fixed bottom-0 right-0 z-50 w-[min(22rem,100vw)]">
          <section className="chiron-frame-flat p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                KEYMAP
              </p>
              <button
                type="button"
                aria-label="Close keymap"
                className="inline-flex h-7 w-7 items-center justify-center rounded-none border border-border/70 text-muted-foreground transition-colors hover:bg-accent"
                onClick={() => setIsKeymapOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="grid gap-2 text-sm">
              <KeymapRow icon={CircleHelp} text="? — Toggle helper" />
              <KeymapRow icon={X} text="Esc — Close helper" />
              <KeymapRow icon={FilePlus2} text="F — Add Fact" />
              <KeymapRow icon={Workflow} text="W — Add Workflow" />
              <KeymapRow icon={Workflow} text="S — Add State" />
              <KeymapRow icon={PackagePlus} text="A — Add Artifact Slot" />
            </ul>
          </section>
        </div>
      ) : null}

      {!isKeymapOpen ? (
        <button
          type="button"
          aria-label="Open keymap"
          className="fixed bottom-0 right-0 z-40 inline-flex h-9 w-9 items-center justify-center border border-border/70 bg-background p-0 text-muted-foreground transition-colors hover:bg-accent"
          onClick={toggleKeymap}
        >
          <CircleHelp className="h-4 w-4" />
        </button>
      ) : null}

      {draftQuery.isError || hasResolvedInvalidSelection ? (
        <section className="grid gap-3 lg:grid-cols-[2fr_1fr]">
          <div className="chiron-frame-flat p-3">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
              Overview
            </p>
            <p className="mt-2 text-sm">
              State: failed - Unable to load work-unit details while preserving selected context.
            </p>
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
      ) : tab === "overview" ? (
        <OverviewTab
          factsCount={factsCount}
          workflowsCount={workflowsCount}
          statesCount={statesCount}
          transitionsCount={transitionsCount}
          artifactSlotsCount={artifactSlotsCount}
        />
      ) : (
        <section className="grid gap-3 lg:grid-cols-[2fr_1fr]">
          <div className="chiron-frame-flat p-3">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
              {tab} Surface
            </p>
            {draftQuery.isLoading ? (
              <p className="mt-2 text-sm">Loading work-unit details...</p>
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
      )}
    </MethodologyWorkspaceShell>
  );
}

function KeymapRow({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <li className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span>{text}</span>
    </li>
  );
}
