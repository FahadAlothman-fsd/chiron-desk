import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { CircleHelp, FilePlus2, PackagePlus, Workflow, X, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";

import { buttonVariants } from "@/components/ui/button";
import { FactsTab } from "@/features/methodologies/work-unit-l2/FactsTab";
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
  const { orpc, queryClient } = Route.useRouteContext();
  const [isKeymapOpen, setIsKeymapOpen] = useState(false);
  const [isFactsCreateOpen, setIsFactsCreateOpen] = useState(false);

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

      if (tab === "facts" && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setIsFactsCreateOpen(true);
        return;
      }

      if (event.key === "Escape") {
        setIsKeymapOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [tab, toggleKeymap]);

  const draftQueryOptions = orpc.methodology.version.workUnit.get.queryOptions({
    input: { versionId },
  });
  const draftQuery = useQuery(draftQueryOptions);
  const createWorkUnitFactMutation = useMutation(
    orpc.methodology.version.workUnit.fact.create.mutationOptions(),
  );
  const updateWorkUnitFactMutation = useMutation(
    orpc.methodology.version.workUnit.fact.update.mutationOptions(),
  );
  const deleteWorkUnitFactMutation = useMutation(
    orpc.methodology.version.workUnit.fact.delete.mutationOptions(),
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
  const dependencyDefinitions = Array.isArray(
    (
      draftQuery.data as
        | { linkTypeDefinitions?: ReadonlyArray<{ key?: string; name?: string }> }
        | undefined
    )?.linkTypeDefinitions,
  )
    ? ((draftQuery.data as { linkTypeDefinitions?: ReadonlyArray<{ key?: string; name?: string }> })
        .linkTypeDefinitions ?? [])
    : [];

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
      ) : tab === "facts" ? (
        <FactsTab
          initialFacts={
            Array.isArray(selectedWorkUnit?.factSchemas) ? selectedWorkUnit.factSchemas : []
          }
          dependencyDefinitions={dependencyDefinitions}
          createDialogOpen={isFactsCreateOpen}
          onCreateDialogOpenChange={setIsFactsCreateOpen}
          onCreateFact={async ({ fact }) => {
            const humanGuidance =
              fact.guidance?.human?.markdown?.trim() ?? fact.guidance?.human?.short?.trim() ?? "";
            const agentGuidance =
              fact.guidance?.agent?.markdown?.trim() ?? fact.guidance?.agent?.intent?.trim() ?? "";
            const rawValidation = fact.validation as Record<string, unknown> | undefined;
            const rawPath = rawValidation?.path;
            const rawKind = rawValidation?.kind;
            const pathValidation =
              rawKind === "path" && rawPath && typeof rawPath === "object"
                ? (rawPath as {
                    pathKind?: "file" | "directory";
                    normalization?: { mode?: "posix"; trimWhitespace?: boolean };
                    safety?: { disallowAbsolute?: boolean; preventTraversal?: boolean };
                  })
                : undefined;
            const apiValidation =
              fact.factType === "work unit"
                ? ({ kind: "none" } as const)
                : rawKind === "path" && pathValidation?.pathKind
                  ? {
                      kind: "path" as const,
                      path: {
                        pathKind: pathValidation.pathKind,
                        normalization: pathValidation.normalization,
                        safety: pathValidation.safety,
                      },
                    }
                  : rawKind === "json-schema" && typeof rawValidation?.schemaDialect === "string"
                    ? {
                        kind: "json-schema" as const,
                        schemaDialect: rawValidation.schemaDialect,
                        schema: rawValidation.schema,
                      }
                    : ({ kind: "none" } as const);
            const apiFact = {
              name: fact.name,
              key: fact.key ?? "",
              factType: fact.factType === "work unit" ? "string" : fact.factType,
              defaultValue: fact.defaultValue,
              guidance:
                humanGuidance.length > 0 || agentGuidance.length > 0
                  ? {
                      human: { markdown: humanGuidance },
                      agent: { markdown: agentGuidance },
                    }
                  : undefined,
              validation: apiValidation,
            };
            await createWorkUnitFactMutation.mutateAsync({
              versionId,
              workUnitTypeKey: workUnitKey,
              fact: apiFact,
            });
            await queryClient.invalidateQueries({ queryKey: draftQueryOptions.queryKey });
          }}
          onUpdateFact={async ({ factKey, fact }) => {
            const humanGuidance =
              fact.guidance?.human?.markdown?.trim() ?? fact.guidance?.human?.short?.trim() ?? "";
            const agentGuidance =
              fact.guidance?.agent?.markdown?.trim() ?? fact.guidance?.agent?.intent?.trim() ?? "";
            const rawValidation = fact.validation as Record<string, unknown> | undefined;
            const rawPath = rawValidation?.path;
            const rawKind = rawValidation?.kind;
            const pathValidation =
              rawKind === "path" && rawPath && typeof rawPath === "object"
                ? (rawPath as {
                    pathKind?: "file" | "directory";
                    normalization?: { mode?: "posix"; trimWhitespace?: boolean };
                    safety?: { disallowAbsolute?: boolean; preventTraversal?: boolean };
                  })
                : undefined;
            const apiValidation =
              fact.factType === "work unit"
                ? ({ kind: "none" } as const)
                : rawKind === "path" && pathValidation?.pathKind
                  ? {
                      kind: "path" as const,
                      path: {
                        pathKind: pathValidation.pathKind,
                        normalization: pathValidation.normalization,
                        safety: pathValidation.safety,
                      },
                    }
                  : rawKind === "json-schema" && typeof rawValidation?.schemaDialect === "string"
                    ? {
                        kind: "json-schema" as const,
                        schemaDialect: rawValidation.schemaDialect,
                        schema: rawValidation.schema,
                      }
                    : ({ kind: "none" } as const);
            const apiFact = {
              name: fact.name,
              key: fact.key ?? "",
              factType: fact.factType === "work unit" ? "string" : fact.factType,
              defaultValue: fact.defaultValue,
              guidance:
                humanGuidance.length > 0 || agentGuidance.length > 0
                  ? {
                      human: { markdown: humanGuidance },
                      agent: { markdown: agentGuidance },
                    }
                  : undefined,
              validation: apiValidation,
            };
            await updateWorkUnitFactMutation.mutateAsync({
              versionId,
              workUnitTypeKey: workUnitKey,
              factKey,
              fact: apiFact,
            });
            await queryClient.invalidateQueries({ queryKey: draftQueryOptions.queryKey });
          }}
          onDeleteFact={async ({ factKey }) => {
            await deleteWorkUnitFactMutation.mutateAsync({
              versionId,
              workUnitTypeKey: workUnitKey,
              factKey,
            });
            await queryClient.invalidateQueries({ queryKey: draftQueryOptions.queryKey });
          }}
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
