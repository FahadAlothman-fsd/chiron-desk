import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { AlertTriangleIcon, CheckIcon, ChevronsUpDownIcon, HistoryIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { buttonVariants, Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RUNTIME_DEFERRED_RATIONALE,
  getDeterministicState,
  sortCatalogDeterministically,
  type MethodologyCatalogItem,
} from "@/features/methodologies/foundation";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";
import { getLatestPublishedVersion } from "@/features/projects/card-avatar-map";
import {
  makeTransportFailureDiagnostic,
  type DeterministicValidationDiagnostic,
} from "@/features/projects/deterministic-diagnostics";
import { cn } from "@/lib/utils";

type MethodologyVersion = {
  id: string;
  version: string;
  status: string;
  displayName: string;
  createdAt: string;
};

type ValidationDiagnostic = DeterministicValidationDiagnostic;

function isPublishedVersion(version: MethodologyVersion): boolean {
  return version.status === "active";
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return date.toLocaleString();
}

function getEventBadgeTone(eventType: string): string {
  switch (eventType) {
    case "pinned":
      return "border-emerald-500/40 bg-emerald-500/15 text-emerald-200";
    case "repinned":
      return "border-sky-500/40 bg-sky-500/15 text-sky-200";
    default:
      return "border-border/60 bg-background text-foreground";
  }
}

export const Route = createFileRoute("/projects/$projectId/pinning")({
  component: ProjectPinningRoute,
});

export function ProjectPinningRoute() {
  const { projectId } = Route.useParams();
  const { orpc, queryClient } = Route.useRouteContext();

  const [selectedMethodologyKey, setSelectedMethodologyKey] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState("");
  const [versionMode, setVersionMode] = useState<"auto" | "user">("auto");
  const [methodologyComboboxOpen, setMethodologyComboboxOpen] = useState(false);
  const [versionComboboxOpen, setVersionComboboxOpen] = useState(false);
  const [lastDiagnostics, setLastDiagnostics] = useState<ValidationDiagnostic[] | null>(null);

  const projectQueryOptions = orpc.project.getProjectDetails.queryOptions({ input: { projectId } });
  const projectQuery = useQuery(projectQueryOptions);
  const methodologiesQuery = useQuery(orpc.methodology.listMethodologies.queryOptions());

  const orderedMethodologies = useMemo(
    () =>
      sortCatalogDeterministically(
        (methodologiesQuery.data as MethodologyCatalogItem[] | undefined) ?? [],
      ),
    [methodologiesQuery.data],
  );

  useEffect(() => {
    if (selectedMethodologyKey) {
      return;
    }

    const pinnedMethodologyKey = projectQuery.data?.pin?.methodologyKey;
    if (pinnedMethodologyKey) {
      setSelectedMethodologyKey(pinnedMethodologyKey);
      setVersionMode("auto");
      return;
    }

    if (orderedMethodologies.length > 0) {
      setSelectedMethodologyKey(orderedMethodologies[0]?.methodologyKey ?? null);
      setVersionMode("auto");
    }
  }, [orderedMethodologies, projectQuery.data?.pin?.methodologyKey, selectedMethodologyKey]);

  const detailsQuery = useQuery({
    ...orpc.methodology.getMethodologyDetails.queryOptions({
      input: { methodologyKey: selectedMethodologyKey ?? "" },
    }),
    enabled: Boolean(selectedMethodologyKey),
  });

  const publishedVersions = useMemo(
    () =>
      ((detailsQuery.data?.versions ?? []) as readonly MethodologyVersion[]).filter((version) =>
        isPublishedVersion(version),
      ),
    [detailsQuery.data?.versions],
  );

  useEffect(() => {
    if (publishedVersions.length === 0) {
      setSelectedVersion("");
      return;
    }

    const stillValid = publishedVersions.some((version) => version.version === selectedVersion);
    if (versionMode === "user" && stillValid) {
      return;
    }

    const latest = getLatestPublishedVersion(publishedVersions);
    setSelectedVersion(latest?.version ?? "");
  }, [publishedVersions, selectedVersion, versionMode]);

  const repinMutation = useMutation(
    orpc.methodology.repinProjectMethodologyVersion.mutationOptions({
      onSuccess: async (result) => {
        setLastDiagnostics(result.diagnostics.diagnostics as ValidationDiagnostic[]);
        await queryClient.invalidateQueries({ queryKey: projectQueryOptions.queryKey });
      },
      onError: (error) => {
        setLastDiagnostics([
          makeTransportFailureDiagnostic({
            code: "PROJECT_REPIN_TRANSPORT_ERROR",
            scope: "project.repin.transport",
            evidenceRef: "project-pin-event:transport-repin",
            error,
          }),
        ]);
      },
    }),
  );

  const state = getDeterministicState({
    isLoading: projectQuery.isLoading || methodologiesQuery.isLoading,
    hasError: Boolean(projectQuery.error || methodologiesQuery.error || repinMutation.error),
    hasData: Boolean(projectQuery.data),
    isBlocked: Boolean(selectedMethodologyKey && publishedVersions.length === 0),
  });

  return (
    <MethodologyWorkspaceShell
      title="Project pinning"
      stateLabel={state}
      segments={[
        { label: "Projects", to: "/projects" },
        {
          label: projectQuery.data?.project.displayName ?? projectId,
          to: "/projects/$projectId",
          params: { projectId },
        },
        { label: "Pinning" },
      ]}
    >
      <section className="flex flex-wrap items-center justify-between gap-3 border border-border/80 bg-background p-4">
        <div className="space-y-1">
          <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
            Pinning operations
          </p>
          <p className="text-sm text-muted-foreground">
            Review the active pin, repin to another published version, and inspect pin lineage.
          </p>
        </div>
        <Link
          to="/projects/$projectId"
          params={{ projectId }}
          className={
            buttonVariants({ variant: "outline" }) + " rounded-none uppercase tracking-[0.12em]"
          }
        >
          Open project dashboard
        </Link>
      </section>

      <section className="space-y-4 border border-border/80 bg-background p-4">
        <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
          Active pin snapshot
        </p>

        {projectQuery.isLoading ? <Skeleton className="h-24 w-full rounded-none" /> : null}

        {!projectQuery.isLoading && projectQuery.data?.pin ? (
          <div className="space-y-4 border border-border/70 bg-background/30 p-4">
            <div className="space-y-2 border border-border/70 bg-background/60 p-3">
              <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                Current pin
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="border border-border/70 bg-background px-2 py-1">
                  {projectQuery.data.pin.methodologyKey}
                </span>
                <span className="text-muted-foreground">at</span>
                <span className="border border-border/70 bg-background px-2 py-1">
                  v{projectQuery.data.pin.publishedVersion}
                </span>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-1">
                <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                  Project
                </p>
                <p className="text-sm font-medium">{projectQuery.data.project.displayName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                  Actor
                </p>
                <p className="break-all text-sm">{projectQuery.data.pin.actorId}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                  Updated
                </p>
                <p className="text-sm">{formatTimestamp(projectQuery.data.pin.timestamp)}</p>
              </div>
            </div>
          </div>
        ) : null}

        {!projectQuery.isLoading && !projectQuery.data?.pin ? (
          <div className="space-y-2 border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <p className="font-medium text-amber-200">No active pin found.</p>
            <p className="text-muted-foreground">
              Select a methodology and published version below.
            </p>
          </div>
        ) : null}
      </section>

      <section className="space-y-2 border border-border/80 bg-background p-4">
        <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
          Readiness visibility
        </p>
        <p className="text-sm text-muted-foreground">
          Baseline methodology, transition readiness, diagnostics, and evidence are shown on the
          project dashboard.
        </p>
        <Link
          to="/projects/$projectId"
          params={{ projectId }}
          className={
            buttonVariants({ variant: "outline" }) + " rounded-none uppercase tracking-[0.12em]"
          }
        >
          Open readiness baseline
        </Link>
      </section>

      <section className="space-y-3 border border-border/80 bg-background p-4">
        <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
          Repin configuration
        </p>

        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Methodology</p>
            <Popover open={methodologyComboboxOpen} onOpenChange={setMethodologyComboboxOpen}>
              <PopoverTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    data-testid="repin-methodology-combobox"
                    className="w-full justify-between rounded-none"
                    aria-expanded={methodologyComboboxOpen}
                  />
                }
              >
                {selectedMethodologyKey ?? "Select methodology"}
                <ChevronsUpDownIcon className="size-4 opacity-50" />
              </PopoverTrigger>
              <PopoverContent className="w-[380px] rounded-none p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search methodologies..." />
                  <CommandList>
                    <CommandEmpty>No methodologies found.</CommandEmpty>
                    <CommandGroup heading="Methodologies">
                      {orderedMethodologies.map((methodology) => (
                        <CommandItem
                          key={methodology.methodologyId}
                          value={`${methodology.displayName} ${methodology.methodologyKey}`}
                          onSelect={() => {
                            setSelectedMethodologyKey(methodology.methodologyKey);
                            setVersionMode("auto");
                            setMethodologyComboboxOpen(false);
                            setLastDiagnostics(null);
                          }}
                        >
                          <div className="flex w-full items-center justify-between gap-2">
                            <span>{methodology.methodologyKey}</span>
                            <CheckIcon
                              className={cn(
                                "size-4",
                                selectedMethodologyKey === methodology.methodologyKey
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Published version
            </p>
            <Popover open={versionComboboxOpen} onOpenChange={setVersionComboboxOpen}>
              <PopoverTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    data-testid="repin-version-combobox"
                    className="w-full justify-between rounded-none"
                    aria-expanded={versionComboboxOpen}
                    disabled={publishedVersions.length === 0}
                  />
                }
              >
                {selectedVersion || "Select published version"}
                <ChevronsUpDownIcon className="size-4 opacity-50" />
              </PopoverTrigger>
              <PopoverContent className="w-[380px] rounded-none p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search versions..." />
                  <CommandList>
                    <CommandEmpty>No published versions found.</CommandEmpty>
                    <CommandGroup heading="Published versions">
                      {publishedVersions.map((version) => (
                        <CommandItem
                          key={version.id}
                          value={`${version.version} ${version.displayName}`}
                          onSelect={() => {
                            setSelectedVersion(version.version);
                            setVersionMode("user");
                            setVersionComboboxOpen(false);
                            setLastDiagnostics(null);
                          }}
                        >
                          <div className="flex w-full items-center justify-between gap-2">
                            <div className="flex flex-col">
                              <span>{version.version}</span>
                              <span className="text-[0.7rem] text-muted-foreground">
                                {version.displayName}
                              </span>
                            </div>
                            <CheckIcon
                              className={cn(
                                "size-4",
                                selectedVersion === version.version ? "opacity-100" : "opacity-0",
                              )}
                            />
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <Button
            type="button"
            className="rounded-none uppercase tracking-[0.12em]"
            disabled={
              repinMutation.isPending ||
              !selectedMethodologyKey ||
              !selectedVersion ||
              publishedVersions.length === 0
            }
            onClick={() => {
              if (!selectedMethodologyKey || !selectedVersion) {
                return;
              }

              repinMutation.mutate({
                projectId,
                methodologyKey: selectedMethodologyKey,
                publishedVersion: selectedVersion,
              });
            }}
          >
            {repinMutation.isPending ? "Repinning..." : "Repin project"}
          </Button>
        </div>

        <div className="space-y-2 border border-border/70 bg-background/30 p-3">
          <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
            Version transition preview
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">Current</span>
            <span className="border border-border/70 bg-background px-2 py-1">
              {projectQuery.data?.pin?.publishedVersion ?? "-"}
            </span>
            <span className="text-muted-foreground">to</span>
            <span className="border border-border/70 bg-background px-2 py-1">
              {selectedVersion || "-"}
            </span>
          </div>
        </div>

        {selectedMethodologyKey && publishedVersions.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No published versions available for selected methodology. Publish an eligible version
            first.
          </p>
        ) : null}

        {repinMutation.error || (lastDiagnostics && lastDiagnostics.length > 0) ? (
          <section className="space-y-3 border border-destructive/50 bg-destructive/10 p-4 text-xs">
            <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
              <AlertTriangleIcon className="size-4" />
              <span>
                {repinMutation.error
                  ? "Repin request failed"
                  : "Repin blocked by deterministic validation"}
              </span>
            </div>

            {lastDiagnostics && lastDiagnostics.length > 0 ? (
              <ul className="space-y-2">
                {lastDiagnostics.map((diagnostic) => (
                  <li
                    key={`${diagnostic.code}-${diagnostic.timestamp}`}
                    className="space-y-2 border border-destructive/30 bg-background/60 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-foreground">{diagnostic.code}</p>
                      <span className="border border-destructive/40 bg-destructive/20 px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.14em] text-destructive">
                        {diagnostic.blocking ? "Blocking" : "Advisory"}
                      </span>
                    </div>
                    <p className="text-muted-foreground">scope: {diagnostic.scope}</p>
                    <p>
                      <span className="font-medium text-foreground">Required:</span>{" "}
                      {diagnostic.required}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Observed:</span>{" "}
                      {diagnostic.observed}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Remediation:</span>{" "}
                      {diagnostic.remediation}
                    </p>
                    <div className="flex flex-wrap gap-3 text-muted-foreground">
                      <span>timestamp: {diagnostic.timestamp}</span>
                      <span>evidenceRef: {diagnostic.evidenceRef}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}
      </section>

      <section className="space-y-3 border border-border/80 bg-background p-4">
        <div className="flex items-center gap-2">
          <HistoryIcon className="size-4 text-muted-foreground" />
          <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
            Pin lineage
          </p>
        </div>

        {projectQuery.isLoading ? <Skeleton className="mt-1 h-20 w-full rounded-none" /> : null}

        {!projectQuery.isLoading && (projectQuery.data?.lineage ?? []).length === 0 ? (
          <p className="text-sm">State: normal - No lineage events.</p>
        ) : null}

        {!projectQuery.isLoading && (projectQuery.data?.lineage ?? []).length > 0 ? (
          <ul className="space-y-2 text-xs">
            {(projectQuery.data?.lineage ?? []).map((event) => (
              <li key={event.id} className="space-y-2 border border-border/70 bg-background/30 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={cn(
                      "border px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.14em]",
                      getEventBadgeTone(event.eventType),
                    )}
                  >
                    {event.eventType.toUpperCase()}
                  </span>
                  <span className="text-muted-foreground">{formatTimestamp(event.timestamp)}</span>
                </div>

                <div className="grid gap-2 md:grid-cols-3">
                  <p>
                    <span className="text-muted-foreground">actor:</span> {event.actorId}
                  </p>
                  <p>
                    <span className="text-muted-foreground">previous:</span>{" "}
                    <span className="border border-border/70 bg-background px-2 py-0.5">
                      {event.previousVersion ?? "-"}
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">new:</span>{" "}
                    <span className="border border-border/70 bg-background px-2 py-0.5">
                      {event.newVersion}
                    </span>
                  </p>
                </div>

                <p className="break-all text-muted-foreground">evidence: {event.evidenceRef}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="border border-border/80 bg-background p-4">
        <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">Runtime</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button aria-disabled="true" disabled variant="outline" className="rounded-none">
            Runtime Execution (Epic 3+)
          </Button>
          <p className="text-xs text-muted-foreground">{RUNTIME_DEFERRED_RATIONALE}</p>
        </div>
      </section>
    </MethodologyWorkspaceShell>
  );
}
