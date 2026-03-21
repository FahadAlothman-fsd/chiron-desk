import { useMutation, useQuery } from "@tanstack/react-query";
import { useHotkey } from "@tanstack/react-hotkeys";
import { Link, createFileRoute } from "@tanstack/react-router";
import { CircleHelp, FilePlus2, PackagePlus, Workflow, X, type LucideIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { z } from "zod";

import { buttonVariants } from "@/components/ui/button";
import { ArtifactSlotsTab } from "@/features/methodologies/work-unit-l2/ArtifactSlotsTab";
import { FactsTab } from "@/features/methodologies/work-unit-l2/FactsTab";
import { OverviewTab } from "@/features/methodologies/work-unit-l2/OverviewTab";
import { StateMachineTab } from "@/features/methodologies/work-unit-l2/StateMachineTab";
import { WorkflowsTab } from "@/features/methodologies/work-unit-l2/WorkflowsTab";
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
  const navigate = Route.useNavigate();
  const tab = search.tab ?? "overview";
  const { orpc, queryClient } = Route.useRouteContext();
  const [isKeymapOpen, setIsKeymapOpen] = useState(false);
  const [isFactsCreateOpen, setIsFactsCreateOpen] = useState(false);

  const toggleKeymap = useCallback(() => setIsKeymapOpen((value) => !value), []);
  const isTypingTarget = useCallback((target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) {
      return false;
    }
    return (
      target.isContentEditable ||
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT"
    );
  }, []);

  const switchTab = useCallback(
    (nextTab: "facts" | "workflows" | "state-machine" | "artifact-slots" | "overview") => {
      void navigate({
        search: (previous) => ({
          ...previous,
          tab: nextTab,
        }),
        replace: true,
      });
    },
    [navigate],
  );

  useHotkey("/", (event) => {
    if (isTypingTarget(event.target)) {
      return;
    }
    if (!event.shiftKey) {
      return;
    }
    event.preventDefault();
    toggleKeymap();
  });

  useHotkey("Escape", () => setIsKeymapOpen(false));
  useHotkey("1", (event) => {
    if (isTypingTarget(event.target)) {
      return;
    }
    event.preventDefault();
    switchTab("facts");
    setIsFactsCreateOpen(true);
  });
  useHotkey("2", (event) => {
    if (isTypingTarget(event.target)) {
      return;
    }
    event.preventDefault();
    switchTab("workflows");
  });
  useHotkey("3", (event) => {
    if (isTypingTarget(event.target)) {
      return;
    }
    event.preventDefault();
    switchTab("state-machine");
  });
  useHotkey("4", (event) => {
    if (isTypingTarget(event.target)) {
      return;
    }
    event.preventDefault();
    switchTab("artifact-slots");
  });
  useHotkey("5", (event) => {
    if (isTypingTarget(event.target)) {
      return;
    }
    event.preventDefault();
    switchTab("overview");
  });
  useHotkey("F", (event) => {
    if (tab !== "facts" || isTypingTarget(event.target)) {
      return;
    }
    event.preventDefault();
    setIsFactsCreateOpen(true);
  });

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
  const workflowsQueryOptions = orpc.methodology.version.workUnit.workflow.list.queryOptions({
    input: { versionId, workUnitTypeKey: workUnitKey },
  });
  const workflowsQuery = useQuery({
    ...workflowsQueryOptions,
    enabled: tab === "workflows",
  });
  const createWorkflowMutation = useMutation(
    orpc.methodology.version.workUnit.workflow.create.mutationOptions(),
  );
  const updateWorkflowMutation = useMutation(
    orpc.methodology.version.workUnit.workflow.update.mutationOptions(),
  );
  const deleteWorkflowMutation = useMutation(
    orpc.methodology.version.workUnit.workflow.delete.mutationOptions(),
  );

  const stateMachineStatesQueryOptions =
    orpc.methodology.version.workUnit.stateMachine.state.list.queryOptions({
      input: { versionId, workUnitTypeKey: workUnitKey },
    });
  const stateMachineStatesQuery = useQuery({
    ...stateMachineStatesQueryOptions,
    enabled: tab === "state-machine",
  });
  const stateMachineTransitionsQueryOptions =
    orpc.methodology.version.workUnit.stateMachine.transition.list.queryOptions({
      input: { versionId, workUnitTypeKey: workUnitKey },
    });
  const stateMachineTransitionsQuery = useQuery({
    ...stateMachineTransitionsQueryOptions,
    enabled: tab === "state-machine",
  });
  const firstTransitionKey = useMemo(() => {
    const transitions = stateMachineTransitionsQuery.data;
    if (!Array.isArray(transitions) || transitions.length === 0) {
      return null;
    }
    const first = transitions[0] as { transitionKey?: unknown };
    return typeof first.transitionKey === "string" && first.transitionKey.length > 0
      ? first.transitionKey
      : null;
  }, [stateMachineTransitionsQuery.data]);
  const conditionSetsQueryOptions =
    orpc.methodology.version.workUnit.stateMachine.transition.conditionSet.list.queryOptions({
      input: {
        versionId,
        workUnitTypeKey: workUnitKey,
        transitionKey: firstTransitionKey ?? "",
      },
    });
  const conditionSetsQuery = useQuery({
    ...conditionSetsQueryOptions,
    enabled: tab === "state-machine" && firstTransitionKey !== null,
  });
  const updateStatesMutation = useMutation(
    orpc.methodology.version.workUnit.stateMachine.state.update.mutationOptions(),
  );
  const updateTransitionsMutation = useMutation(
    orpc.methodology.version.workUnit.stateMachine.transition.update.mutationOptions(),
  );
  const updateConditionSetsMutation = useMutation(
    orpc.methodology.version.workUnit.stateMachine.transition.conditionSet.update.mutationOptions(),
  );

  const artifactSlotsQueryOptions =
    orpc.methodology.version.workUnit.artifactSlot.list.queryOptions({
      input: { versionId, workUnitTypeKey: workUnitKey },
    });
  const artifactSlotsQuery = useQuery({
    ...artifactSlotsQueryOptions,
    enabled: tab === "artifact-slots",
  });
  const replaceArtifactSlotsMutation = useMutation(
    orpc.methodology.version.workUnit.artifactSlot.replace.mutationOptions(),
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

  const normalizeMarkdownPair = (
    value: unknown,
  ): { human: { markdown: string }; agent: { markdown: string } } | undefined => {
    if (!value || typeof value !== "object") {
      return undefined;
    }
    const entry = value as {
      human?: { markdown?: unknown } | null;
      agent?: { markdown?: unknown } | null;
    };
    const human = typeof entry.human?.markdown === "string" ? entry.human.markdown : "";
    const agent = typeof entry.agent?.markdown === "string" ? entry.agent.markdown : "";
    if (human.length === 0 && agent.length === 0) {
      return undefined;
    }
    return { human: { markdown: human }, agent: { markdown: agent } };
  };

  const normalizeWorkflowForApi = (workflow: {
    key: string;
    displayName?: string;
    metadata?: Record<string, string | number | boolean | string[]>;
    guidance?: {
      human?: { markdown?: string };
      agent?: { markdown?: string };
    };
  }) => ({
    key: workflow.key,
    ...(workflow.displayName ? { displayName: workflow.displayName } : {}),
    ...(workflow.metadata ? { metadata: workflow.metadata } : {}),
    ...(normalizeMarkdownPair(workflow.guidance)
      ? { guidance: normalizeMarkdownPair(workflow.guidance) }
      : {}),
  });

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
              <KeymapRow icon={FilePlus2} text="1 — Facts" />
              <KeymapRow icon={Workflow} text="2 — Workflows" />
              <KeymapRow icon={Workflow} text="3 — State Machine" />
              <KeymapRow icon={PackagePlus} text="4 — Artifact Slots" />
              <KeymapRow icon={CircleHelp} text="5 — Overview" />
              <KeymapRow icon={FilePlus2} text="F — Add Fact (Facts tab)" />
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
      ) : tab === "workflows" ? (
        <WorkflowsTab
          workflows={
            (Array.isArray(workflowsQuery.data)
              ? workflowsQuery.data
              : (selectedWorkUnit?.workflows ?? [])) as {
              key: string;
              displayName?: string;
              metadata?: Record<string, string | number | boolean | string[]>;
              guidance?: {
                human?: { markdown?: string };
                agent?: { markdown?: string };
              };
              steps?: unknown[];
              edges?: unknown[];
            }[]
          }
          onCreateWorkflow={async (workflow) => {
            await createWorkflowMutation.mutateAsync({
              versionId,
              workUnitTypeKey: workUnitKey,
              workflow: normalizeWorkflowForApi(workflow),
            });
            await queryClient.invalidateQueries({ queryKey: workflowsQueryOptions.queryKey });
          }}
          onUpdateWorkflow={async (workflowKey, workflow) => {
            await updateWorkflowMutation.mutateAsync({
              versionId,
              workUnitTypeKey: workUnitKey,
              workflowKey,
              workflow: normalizeWorkflowForApi(workflow),
            });
            await queryClient.invalidateQueries({ queryKey: workflowsQueryOptions.queryKey });
          }}
          onDeleteWorkflow={async (workflowKey) => {
            await deleteWorkflowMutation.mutateAsync({
              versionId,
              workUnitTypeKey: workUnitKey,
              workflowKey,
            });
            await queryClient.invalidateQueries({ queryKey: workflowsQueryOptions.queryKey });
          }}
          onOpenWorkflowEditor={(workflowKey) => {
            window.open(
              `/methodologies/${methodologyId}/versions/${versionId}/work-units/${workUnitKey}/workflow-editor?workflowKey=${encodeURIComponent(workflowKey)}`,
              "_self",
            );
          }}
        />
      ) : tab === "state-machine" ? (
        <StateMachineTab
          states={
            (Array.isArray(stateMachineStatesQuery.data)
              ? stateMachineStatesQuery.data
              : (selectedWorkUnit?.lifecycle?.states ?? [])) as {
              key: string;
              displayName?: string;
              description?: string;
            }[]
          }
          transitions={
            (Array.isArray(stateMachineTransitionsQuery.data)
              ? stateMachineTransitionsQuery.data
              : (selectedWorkUnit?.lifecycle?.transitions ?? [])) as {
              transitionKey: string;
              fromState?: string | null;
              toState: string;
            }[]
          }
          conditionSets={
            (Array.isArray(conditionSetsQuery.data) ? conditionSetsQuery.data : []) as {
              key: string;
              phase: "start" | "completion";
              mode: "all" | "any";
              guidance?: string;
            }[]
          }
          onSaveStates={async (states) => {
            await updateStatesMutation.mutateAsync({
              versionId,
              workUnitTypeKey: workUnitKey,
              states,
            });
            await queryClient.invalidateQueries({
              queryKey: stateMachineStatesQueryOptions.queryKey,
            });
          }}
          onSaveTransitions={async (transitions) => {
            await updateTransitionsMutation.mutateAsync({
              versionId,
              workUnitTypeKey: workUnitKey,
              transitions: transitions.map((transition) => ({
                transitionKey: transition.transitionKey,
                fromState: transition.fromState ?? undefined,
                toState: transition.toState,
                conditionSets: (transition.conditionSets ?? []).map((conditionSet) => ({
                  key: conditionSet.key,
                  phase: conditionSet.phase,
                  mode: conditionSet.mode,
                  ...(conditionSet.guidance ? { guidance: conditionSet.guidance } : {}),
                  groups: [],
                })),
              })),
            });
            await queryClient.invalidateQueries({
              queryKey: stateMachineTransitionsQueryOptions.queryKey,
            });
          }}
          onSaveConditionSets={async (transitionKey, conditionSets) => {
            if (!transitionKey) {
              return;
            }
            await updateConditionSetsMutation.mutateAsync({
              versionId,
              workUnitTypeKey: workUnitKey,
              transitionKey,
              conditionSets: conditionSets.map((conditionSet) => ({
                key: conditionSet.key,
                phase: conditionSet.phase,
                mode: conditionSet.mode,
                ...(conditionSet.guidance ? { guidance: conditionSet.guidance } : {}),
                groups: [],
              })),
            });
            await queryClient.invalidateQueries({ queryKey: conditionSetsQueryOptions.queryKey });
          }}
        />
      ) : tab === "artifact-slots" ? (
        <ArtifactSlotsTab
          slots={
            (Array.isArray(artifactSlotsQuery.data)
              ? artifactSlotsQuery.data
              : (selectedWorkUnit?.artifactSlots ?? [])) as {
              key: string;
              displayName?: string;
              cardinality: "single" | "fileset";
              rules?: unknown;
              templates: readonly { key: string; displayName?: string; content?: string }[];
            }[]
          }
          onSaveSlots={async () => {
            const slots = (
              Array.isArray(artifactSlotsQuery.data)
                ? artifactSlotsQuery.data
                : (selectedWorkUnit?.artifactSlots ?? [])
            ) as {
              key: string;
              displayName?: string;
              description?: { human: { markdown: string }; agent: { markdown: string } };
              guidance?: { human: { markdown: string }; agent: { markdown: string } };
              cardinality: "single" | "fileset";
              rules?: unknown;
              templates: {
                key: string;
                displayName?: string;
                description?: { human: { markdown: string }; agent: { markdown: string } };
                guidance?: { human: { markdown: string }; agent: { markdown: string } };
                content?: string;
              }[];
            }[];
            await replaceArtifactSlotsMutation.mutateAsync({
              versionId,
              workUnitTypeKey: workUnitKey,
              slots: slots.map((slot) => ({
                key: slot.key,
                displayName: typeof slot.displayName === "string" ? slot.displayName : undefined,
                description: normalizeMarkdownPair(slot.description),
                guidance: normalizeMarkdownPair(slot.guidance),
                cardinality: slot.cardinality,
                ...(slot.rules && typeof slot.rules === "object" ? { rules: slot.rules } : {}),
                templates: (slot.templates ?? []).map((template) => ({
                  key: template.key,
                  displayName:
                    typeof template.displayName === "string" ? template.displayName : undefined,
                  description: normalizeMarkdownPair(template.description),
                  guidance: normalizeMarkdownPair(template.guidance),
                  content: typeof template.content === "string" ? template.content : undefined,
                })),
              })),
            });
            await queryClient.invalidateQueries({ queryKey: artifactSlotsQueryOptions.queryKey });
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
