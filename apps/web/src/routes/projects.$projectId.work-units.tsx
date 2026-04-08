import { useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { Link, Outlet, createFileRoute, useLocation } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { z } from "zod";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";

const workUnitsSearchSchema = z.object({
  q: z.string().optional().default(""),
});

const runtimeWorkUnitsQueryKey = (projectId: string) => ["runtime-work-units", projectId] as const;

type RuntimeWorkUnitRow = {
  projectWorkUnitId: string;
  displayIdentity: {
    primaryLabel: string;
    secondaryLabel: string;
    fullInstanceId: string;
  };
  workUnitType: {
    workUnitTypeId: string;
    workUnitTypeKey: string;
    workUnitTypeName?: string;
    cardinality: "one_per_project" | "many_per_project";
  };
  currentState: {
    stateId: string;
    stateKey: string;
    stateLabel: string;
  };
  activeTransition?: {
    transitionExecutionId: string;
    transitionId: string;
    transitionKey: string;
    transitionName?: string;
    toStateId: string;
    toStateKey: string;
    toStateLabel: string;
  };
};

type RuntimeWorkUnitsQueryShape = {
  project?: { projectId: string; name: string };
  rows?: RuntimeWorkUnitRow[];
};

type WorkUnitDefinitionShape = {
  key: string;
  displayName: string;
  cardinality: "one_per_project" | "many_per_project";
  description?: string;
  activationTransitions: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readText(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (!isRecord(value)) {
    return undefined;
  }

  const markdown = readText(value.markdown);
  if (markdown) {
    return markdown;
  }

  const short = readText(value.short);
  if (short) {
    return short;
  }

  const long = readText(value.long);
  if (long) {
    return long;
  }

  const human = readText(value.human);
  if (human) {
    return human;
  }

  const agent = readText(value.agent);
  if (agent) {
    return agent;
  }

  return undefined;
}

function stateBadgeClass(hasInstance: boolean, hasActiveTransition: boolean): string {
  if (hasActiveTransition) {
    return "border-emerald-500/60 bg-emerald-500/15 text-emerald-200";
  }

  if (hasInstance) {
    return "border-primary/60 bg-primary/15 text-primary";
  }

  return "border-border/70 bg-background/70 text-muted-foreground";
}

function cardToneClass(hasInstance: boolean, hasActiveTransition: boolean): string {
  if (hasActiveTransition) {
    return "border-emerald-500/50 bg-emerald-500/8";
  }

  if (hasInstance) {
    return "border-primary/45 bg-primary/8";
  }

  return "border-border/75 bg-background";
}

function transitionLabel(row: RuntimeWorkUnitRow): string {
  if (row.activeTransition?.transitionName && row.activeTransition.transitionName.length > 0) {
    return row.activeTransition.transitionName;
  }

  if (row.activeTransition?.transitionKey) {
    return row.activeTransition.transitionKey;
  }

  return "No active transition";
}

function parseWorkUnitDefinitions(raw: unknown): WorkUnitDefinitionShape[] {
  if (!isRecord(raw) || !Array.isArray(raw.workUnitTypes)) {
    return [];
  }

  return raw.workUnitTypes.flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.key !== "string") {
      return [];
    }

    const cardinality =
      entry.cardinality === "one_per_project" || entry.cardinality === "many_per_project"
        ? entry.cardinality
        : "many_per_project";

    const displayName =
      typeof entry.displayName === "string" && entry.displayName.trim().length > 0
        ? entry.displayName
        : entry.key;

    const description = readText(entry.description) ?? readText(entry.guidance);

    const activationTransitions = Array.isArray(entry.lifecycleTransitions)
      ? entry.lifecycleTransitions.flatMap((transition) => {
          if (!isRecord(transition) || typeof transition.key !== "string") {
            return [];
          }

          const fromState = typeof transition.fromState === "string" ? transition.fromState : "";
          return fromState.trim().length === 0 ? [transition.key] : [];
        })
      : [];

    return [
      {
        key: entry.key,
        displayName,
        cardinality,
        ...(description ? { description } : {}),
        activationTransitions,
      },
    ];
  });
}

function normalizeWorkUnitKey(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (trimmed.length === 0) {
    return trimmed;
  }

  return trimmed
    .replace(/^wu[._:-]/, "")
    .replace(/^work[-_ ]*unit[._:-]/, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export const Route = createFileRoute("/projects/$projectId/work-units")({
  validateSearch: (search) => workUnitsSearchSchema.parse(search),
  component: ProjectWorkUnitsRoute,
});

export function ProjectWorkUnitsRoute() {
  const { projectId } = Route.useParams();
  const location = useLocation();
  const search = Route.useSearch();
  const { orpc } = Route.useRouteContext();
  const [isSingletonOpen, setIsSingletonOpen] = useState(true);
  const [isInstancesOpen, setIsInstancesOpen] = useState(false);
  const workUnitsPath = `/projects/${projectId}/work-units`;
  const isChildDetailRoute =
    location.pathname !== workUnitsPath && location.pathname !== `${workUnitsPath}/`;

  const projectDetailsQuery = useQuery(
    orpc.project.getProjectDetails.queryOptions({ input: { projectId } }),
  );

  const pinnedVersionId =
    projectDetailsQuery.data &&
    typeof projectDetailsQuery.data === "object" &&
    projectDetailsQuery.data !== null &&
    "pin" in projectDetailsQuery.data &&
    isRecord(projectDetailsQuery.data.pin) &&
    typeof projectDetailsQuery.data.pin.methodologyVersionId === "string"
      ? projectDetailsQuery.data.pin.methodologyVersionId
      : null;

  const workUnitDefinitionsQuery = useQuery({
    ...orpc.methodology.version.workUnit.list.queryOptions({
      input: { versionId: pinnedVersionId ?? "" },
    }),
    enabled: Boolean(pinnedVersionId),
  });

  const runtimeWorkUnitsQuery = useQuery({
    ...orpc.project.getRuntimeWorkUnits.queryOptions({
      input: {
        projectId,
      },
    }),
    queryKey: runtimeWorkUnitsQueryKey(projectId),
  });

  const rows = (
    (runtimeWorkUnitsQuery.data as RuntimeWorkUnitsQueryShape | undefined)?.rows ?? []
  ).slice();

  const filteredRows = useMemo(() => {
    const query = search.q.trim().toLowerCase();

    return rows.filter((row: RuntimeWorkUnitRow) =>
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
  }, [rows, search.q]);

  const definitions = useMemo(
    () => parseWorkUnitDefinitions(workUnitDefinitionsQuery.data),
    [workUnitDefinitionsQuery.data],
  );

  const singletonDefinitions = useMemo(
    () => definitions.filter((definition) => definition.cardinality === "one_per_project"),
    [definitions],
  );

  const singletonDefinitionKeys = useMemo(() => {
    const keys = new Set<string>();
    singletonDefinitions.forEach((definition) => {
      keys.add(definition.key);
      keys.add(normalizeWorkUnitKey(definition.key));
    });
    return keys;
  }, [singletonDefinitions]);

  const singletonRowsByKey = useMemo(() => {
    const singletonRows = filteredRows.filter((row) => {
      if (row.workUnitType.cardinality === "one_per_project") {
        return true;
      }

      const normalized = normalizeWorkUnitKey(row.workUnitType.workUnitTypeKey);
      return (
        singletonDefinitionKeys.has(row.workUnitType.workUnitTypeKey) ||
        singletonDefinitionKeys.has(normalized)
      );
    });

    const map = new Map<string, RuntimeWorkUnitRow>();
    singletonRows.forEach((row) => {
      const rawKey = row.workUnitType.workUnitTypeKey;
      const normalizedKey = normalizeWorkUnitKey(rawKey);
      if (!map.has(rawKey)) {
        map.set(rawKey, row);
      }
      if (normalizedKey.length > 0 && !map.has(normalizedKey)) {
        map.set(normalizedKey, row);
      }
    });

    return map;
  }, [filteredRows, singletonDefinitionKeys]);

  const singletonCards = useMemo(() => {
    const byDefinition = singletonDefinitions.map((definition) => ({
      definition,
      instance:
        singletonRowsByKey.get(definition.key) ??
        singletonRowsByKey.get(normalizeWorkUnitKey(definition.key)),
    }));

    if (byDefinition.length > 0) {
      return byDefinition;
    }

    return Array.from(singletonRowsByKey.values()).map((row) => ({
      definition: {
        key: row.workUnitType.workUnitTypeKey,
        displayName: row.workUnitType.workUnitTypeName ?? row.displayIdentity.primaryLabel,
        cardinality: "one_per_project" as const,
        description: undefined,
        activationTransitions: [],
      },
      instance: row,
    }));
  }, [singletonDefinitions, singletonRowsByKey]);

  const singletonWithInstances = singletonCards.filter((card) => card.instance).length;

  const singletonInstanceIds = useMemo(
    () =>
      new Set(
        singletonCards.flatMap((card) => (card.instance ? [card.instance.projectWorkUnitId] : [])),
      ),
    [singletonCards],
  );

  const manyDefinitionsCount = definitions.filter(
    (definition) => definition.cardinality === "many_per_project",
  ).length;

  const manyInstancesCount = filteredRows.filter(
    (row) => !singletonInstanceIds.has(row.projectWorkUnitId),
  ).length;

  const projectDisplayName =
    (runtimeWorkUnitsQuery.data as RuntimeWorkUnitsQueryShape | undefined)?.project?.name ??
    (projectDetailsQuery.data &&
    typeof projectDetailsQuery.data === "object" &&
    projectDetailsQuery.data !== null &&
    "project" in projectDetailsQuery.data &&
    isRecord(projectDetailsQuery.data.project) &&
    typeof projectDetailsQuery.data.project.displayName === "string"
      ? projectDetailsQuery.data.project.displayName
      : projectId);

  return isChildDetailRoute ? (
    <Outlet />
  ) : (
    <MethodologyWorkspaceShell
      title="Project work units"
      segments={[
        { label: "Projects", to: "/projects" },
        {
          label: projectDisplayName,
          to: "/projects/$projectId",
          params: { projectId },
        },
        { label: "Work Units" },
      ]}
    >
      <section className="space-y-3 border border-border/80 bg-background p-4">
        <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
          Singleton-first runtime layout
        </p>
        <p className="text-sm text-muted-foreground">
          Cardinality-one work units are surfaced as definitions first. Each card shows runtime
          presence, state, transition, and activation readiness when no instance exists.
        </p>
      </section>

      <Collapsible open={isSingletonOpen} onOpenChange={setIsSingletonOpen}>
        <section className="chiron-frame-flat overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border border-border/80 bg-background p-3">
            <div>
              <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                Singleton work units
              </p>
              <p className="text-sm text-muted-foreground">
                {singletonWithInstances}/{singletonCards.length} instantiated
              </p>
            </div>
            <CollapsibleTrigger className="inline-flex items-center gap-1 border border-border/80 px-2 py-1 text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground transition hover:bg-muted/40">
              <ChevronRight className={isSingletonOpen ? "h-3.5 w-3.5 rotate-90" : "h-3.5 w-3.5"} />
              {isSingletonOpen ? "Collapse" : "Expand"}
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent>
            <div className="grid gap-3 border border-t-0 border-border/80 bg-background/40 p-3 md:grid-cols-2">
              {singletonCards.length === 0 ? (
                <div className="border border-border/70 bg-background p-3 text-sm text-muted-foreground md:col-span-2">
                  No singleton definitions were found in the pinned methodology snapshot.
                </div>
              ) : (
                singletonCards.map(({ definition, instance }) => {
                  const hasInstance = Boolean(instance);
                  const hasActiveTransition = Boolean(instance?.activeTransition);

                  return (
                    <article
                      key={definition.key}
                      className={`space-y-3 border p-3 ${cardToneClass(hasInstance, hasActiveTransition)}`}
                    >
                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          {definition.key}
                        </p>
                        <h3 className="text-sm font-semibold">{definition.displayName}</h3>
                        <p className="text-xs text-muted-foreground">
                          {definition.description ?? "No description configured."}
                        </p>
                      </div>

                      {instance ? (
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2 text-[0.68rem] uppercase tracking-[0.14em]">
                            <span
                              className={`border px-2 py-1 ${stateBadgeClass(true, hasActiveTransition)}`}
                            >
                              {instance.currentState.stateLabel}
                            </span>
                            <span className="border border-border/70 bg-background px-2 py-1 text-muted-foreground">
                              {transitionLabel(instance)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Instance ID: {instance.projectWorkUnitId}
                          </p>
                          <Link
                            to="/projects/$projectId/work-units/$projectWorkUnitId"
                            params={{ projectId, projectWorkUnitId: instance.projectWorkUnitId }}
                            search={{ q: search.q }}
                            className="inline-flex border border-border/80 px-2 py-1 text-[0.68rem] font-medium uppercase tracking-[0.14em] text-primary transition hover:bg-primary/10"
                          >
                            Open overview
                          </Link>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="inline-flex border border-border/70 bg-background px-2 py-1 text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                            No instance yet
                          </div>
                          <div className="space-y-1">
                            <p className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                              Possible activation transitions
                            </p>
                            {definition.activationTransitions.length === 0 ? (
                              <p className="text-xs text-muted-foreground">
                                No activation transitions configured.
                              </p>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {definition.activationTransitions.map((transitionKey) => (
                                  <span
                                    key={`${definition.key}-${transitionKey}`}
                                    className="border border-border/70 bg-background px-2 py-1 text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground"
                                  >
                                    {transitionKey}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })
              )}
            </div>
          </CollapsibleContent>
        </section>
      </Collapsible>

      <Collapsible open={isInstancesOpen} onOpenChange={setIsInstancesOpen}>
        <section className="chiron-frame-flat overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border border-border/80 bg-background p-3">
            <div>
              <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                Work unit instances (many)
              </p>
              <p className="text-sm text-muted-foreground">
                {manyInstancesCount} runtime instances · {manyDefinitionsCount} definitions
              </p>
            </div>
            <CollapsibleTrigger className="inline-flex items-center gap-1 border border-border/80 px-2 py-1 text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground transition hover:bg-muted/40">
              <ChevronRight className={isInstancesOpen ? "h-3.5 w-3.5 rotate-90" : "h-3.5 w-3.5"} />
              {isInstancesOpen ? "Collapse" : "Expand"}
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent>
            <div className="border border-t-0 border-border/80 bg-background/40 p-3 text-sm text-muted-foreground">
              Brainstorming session placeholder: this section will become the table of all
              cardinality-many instances once we implement the next step types.
            </div>
          </CollapsibleContent>
        </section>
      </Collapsible>
    </MethodologyWorkspaceShell>
  );
}
