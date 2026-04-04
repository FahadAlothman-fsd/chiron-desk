import { useMutation, useQueries, useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { AlertTriangleIcon, CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  RUNTIME_DEFERRED_RATIONALE,
  getDeterministicState,
  sortCatalogDeterministically,
  type MethodologyCatalogItem,
  type MethodologyDetails,
} from "@/features/methodologies/foundation";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";
import {
  getAvatarAssetForMethodologyIndex,
  getLatestPublishedVersion,
} from "@/features/projects/card-avatar-map";
import {
  makeTransportFailureDiagnostic,
  type DeterministicValidationDiagnostic,
} from "@/features/projects/deterministic-diagnostics";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const PROJECT_NAME_PREFIXES = [
  "Aegis",
  "Aurora",
  "Cinder",
  "Golden",
  "Helios",
  "Luminous",
  "Mythic",
  "Radiant",
  "Silver",
  "Verdant",
] as const;

const PROJECT_NAME_CORES = [
  "Atlas",
  "Beacon",
  "Harbor",
  "Horizon",
  "Orion",
  "Pioneer",
  "Summit",
  "Thalia",
  "Vanguard",
  "Zephyr",
] as const;

type MethodologyVersion = {
  id: string;
  version: string;
  status: string;
  displayName: string;
  createdAt: string;
};

type ValidationDiagnostic = DeterministicValidationDiagnostic;

export const Route = createFileRoute("/projects/new")({
  component: CreateProjectRoute,
});

function isPublishedVersion(version: MethodologyVersion): boolean {
  return version.status === "active";
}

function extractMethodologyDescription(details: MethodologyDetails | null): string {
  if (!details) {
    return "Methodology details load once selected.";
  }

  const description = details.descriptionJson;
  if (typeof description === "string" && description.trim().length > 0) {
    return description;
  }

  if (
    description &&
    typeof description === "object" &&
    "summary" in description &&
    typeof description.summary === "string" &&
    description.summary.trim().length > 0
  ) {
    return description.summary;
  }

  const latest = getLatestPublishedVersion(
    (details.versions as readonly MethodologyVersion[]).filter((version) =>
      isPublishedVersion(version),
    ),
  );

  return latest
    ? `Latest published version: ${latest.version}`
    : "No published versions available yet.";
}

function generateRandomProjectName(): string {
  const prefix =
    PROJECT_NAME_PREFIXES[Math.floor(Math.random() * PROJECT_NAME_PREFIXES.length)] ?? "Mythic";
  const core = PROJECT_NAME_CORES[Math.floor(Math.random() * PROJECT_NAME_CORES.length)] ?? "Atlas";
  const suffix = Math.floor(Math.random() * 900) + 100;

  return `${prefix} ${core} ${suffix}`;
}

function normalizeProjectRootPath(input: string): string {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return "";
  }

  const withForwardSlashes = trimmed.replace(/\\/g, "/");
  const collapsed = withForwardSlashes.replace(/\/{2,}/g, "/");

  if (collapsed === "/") {
    return collapsed;
  }

  return collapsed.replace(/\/+$/g, "");
}

function validateProjectRootPath(input: string): string | null {
  const normalized = normalizeProjectRootPath(input);
  if (normalized.length === 0) {
    return null;
  }

  const isUnixAbsolute = normalized.startsWith("/");
  const isWindowsDrive = /^[A-Za-z]:\//.test(normalized);
  const isUncPath = /^\/\/[^/]+\/[^/]+/.test(normalized);

  if (!isUnixAbsolute && !isWindowsDrive && !isUncPath) {
    return "Enter an absolute path (e.g. /repo/app or C:/repo/app).";
  }

  if (/\0/.test(normalized)) {
    return "Path cannot include null bytes.";
  }

  return null;
}

function CreateProjectRoute() {
  const navigate = Route.useNavigate();
  const { orpc, queryClient } = Route.useRouteContext();

  const [selectedMethodologyId, setSelectedMethodologyId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>(() => generateRandomProjectName());
  const [selectedVersionsByMethodologyId, setSelectedVersionsByMethodologyId] = useState<
    Record<string, string>
  >({});
  const [projectRootPath, setProjectRootPath] = useState("");
  const [versionModeByMethodologyId, setVersionModeByMethodologyId] = useState<
    Record<string, "auto" | "user">
  >({});
  const [openComboboxForMethodologyId, setOpenComboboxForMethodologyId] = useState<string | null>(
    null,
  );
  const [lastDiagnostics, setLastDiagnostics] = useState<ValidationDiagnostic[] | null>(null);
  const [isSelectingProjectRootPath, setIsSelectingProjectRootPath] = useState(false);
  const desktopBridge = typeof window === "undefined" ? undefined : window.desktop;

  const methodologiesQuery = useQuery(orpc.methodology.listMethodologies.queryOptions());
  const projectsQueryOptions = orpc.project.listProjects.queryOptions();

  const orderedMethodologies = useMemo(
    () =>
      sortCatalogDeterministically(
        (methodologiesQuery.data as MethodologyCatalogItem[] | undefined) ?? [],
      ),
    [methodologiesQuery.data],
  );

  useEffect(() => {
    if (!selectedMethodologyId && orderedMethodologies.length > 0) {
      setSelectedMethodologyId(orderedMethodologies[0]?.methodologyId ?? null);
    }
  }, [orderedMethodologies, selectedMethodologyId]);

  const methodologyDetailsQueries = useQueries({
    queries: orderedMethodologies.map((methodology) => ({
      ...orpc.methodology.getMethodologyDetails.queryOptions({
        input: {
          methodologyKey: methodology.methodologyKey,
        },
      }),
      staleTime: 60_000,
    })),
  });

  const detailsByMethodologyId = useMemo(() => {
    const entries = orderedMethodologies.map(
      (methodology, index) =>
        [
          methodology.methodologyId,
          (methodologyDetailsQueries[index]?.data as MethodologyDetails | undefined) ?? null,
        ] as const,
    );

    return Object.fromEntries(entries) as Record<string, MethodologyDetails | null>;
  }, [methodologyDetailsQueries, orderedMethodologies]);

  useEffect(() => {
    setSelectedVersionsByMethodologyId((current) => {
      let next = current;
      let changed = false;

      for (const methodology of orderedMethodologies) {
        const methodologyId = methodology.methodologyId;
        const details = detailsByMethodologyId[methodologyId];
        const versions = ((details?.versions ?? []) as readonly MethodologyVersion[]).filter(
          (version) => isPublishedVersion(version),
        );
        const activeSelection = current[methodologyId] ?? "";

        if (versions.length === 0) {
          if (activeSelection !== "") {
            if (!changed) {
              next = { ...current };
              changed = true;
            }
            next[methodologyId] = "";
          }
          continue;
        }

        const mode = versionModeByMethodologyId[methodologyId] ?? "auto";
        const stillValid = versions.some((version) => version.id === activeSelection);
        if (mode === "user" && stillValid) {
          continue;
        }

        const latest = getLatestPublishedVersion(versions);
        const latestVersionId = latest?.id ?? "";
        if (latestVersionId !== activeSelection) {
          if (!changed) {
            next = { ...current };
            changed = true;
          }
          next[methodologyId] = latestVersionId;
        }
      }

      return changed ? next : current;
    });
  }, [detailsByMethodologyId, orderedMethodologies, versionModeByMethodologyId]);

  const selectedVersionId = selectedMethodologyId
    ? (selectedVersionsByMethodologyId[selectedMethodologyId] ?? "")
    : "";

  const selectedMethodologyVersions =
    selectedMethodologyId && detailsByMethodologyId[selectedMethodologyId]
      ? (
          (detailsByMethodologyId[selectedMethodologyId]?.versions ??
            []) as readonly MethodologyVersion[]
        ).filter((version) => isPublishedVersion(version))
      : [];

  const selectedMethodology = selectedMethodologyId
    ? (orderedMethodologies.find(
        (methodology) => methodology.methodologyId === selectedMethodologyId,
      ) ?? null)
    : null;
  const selectedVersionLabel = selectedMethodologyVersions.find(
    (version) => version.id === selectedVersionId,
  )?.version;

  const selectedMethodologyHasPublishedVersions = selectedMethodologyVersions.length > 0;
  const hasDesktopBridge = typeof desktopBridge === "object" && desktopBridge !== null;
  const selectProjectDirectory =
    typeof desktopBridge?.selectProjectRootDirectory === "function"
      ? desktopBridge.selectProjectRootDirectory
      : typeof desktopBridge?.selectFolder === "function"
        ? desktopBridge.selectFolder
        : undefined;
  const canBrowseProjectRootPath = typeof selectProjectDirectory === "function";
  const hasPartialDesktopBridge = hasDesktopBridge && !canBrowseProjectRootPath;
  const normalizedProjectRootPath = useMemo(
    () => normalizeProjectRootPath(projectRootPath),
    [projectRootPath],
  );
  const projectRootPathValidationError = useMemo(
    () => validateProjectRootPath(projectRootPath),
    [projectRootPath],
  );

  const createAndPinMutation = useMutation(
    orpc.project.createAndPinProject.mutationOptions({
      onSuccess: async (result) => {
        setLastDiagnostics(result.diagnostics.diagnostics as ValidationDiagnostic[]);

        if (!result.pinned) {
          return;
        }

        await queryClient.invalidateQueries({ queryKey: projectsQueryOptions.queryKey });
        await queryClient.invalidateQueries({
          queryKey: ["project", "details", result.project.id],
        });

        await navigate({
          to: "/projects/$projectId",
          params: { projectId: result.project.id },
        });
      },
      onError: (error) => {
        setLastDiagnostics([
          makeTransportFailureDiagnostic({
            code: "PROJECT_PIN_TRANSPORT_ERROR",
            scope: "project.pin.transport",
            evidenceRef: "project-pin-event:transport-create",
            error,
          }),
        ]);
      },
    }),
  );

  const isAnyMethodologyLoading =
    methodologiesQuery.isLoading || methodologyDetailsQueries.some((query) => query.isLoading);

  const browseForProjectRootPath = async () => {
    if (!selectProjectDirectory || isSelectingProjectRootPath) {
      return;
    }

    setIsSelectingProjectRootPath(true);

    try {
      const selectedPath = await selectProjectDirectory();
      if (typeof selectedPath === "string" && selectedPath.trim().length > 0) {
        setProjectRootPath(selectedPath);
      }
    } finally {
      setIsSelectingProjectRootPath(false);
    }
  };

  const state = getDeterministicState({
    isLoading: isAnyMethodologyLoading,
    hasError: Boolean(
      methodologiesQuery.error ||
      methodologyDetailsQueries.some((query) => Boolean(query.error)) ||
      createAndPinMutation.error,
    ),
    hasData: Boolean(methodologiesQuery.data),
    isBlocked: selectedMethodologyId ? !selectedMethodologyHasPublishedVersions : false,
  });

  return (
    <MethodologyWorkspaceShell
      title="Create project"
      stateLabel={state}
      segments={[{ label: "Projects" }, { label: "Create" }]}
    >
      <section className="space-y-4 border border-border/80 bg-background p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <p className="text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">
              Methodology pinning
            </p>
            <h2 className="text-xl font-semibold">Create a project from a pinned methodology</h2>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Choose one methodology card, then select an exact published version from that card.
              Default selection is deterministic and no implicit repin occurs.
            </p>
          </div>
          <Link to="/projects">
            <Button
              type="button"
              variant="outline"
              className="rounded-none uppercase tracking-[0.12em]"
            >
              Back to projects
            </Button>
          </Link>
        </div>

        <div className="grid gap-3 border border-border/80 bg-background/20 p-4 md:grid-cols-[1fr_auto] md:items-end">
          <div className="space-y-2">
            <label
              htmlFor="project-name"
              className="text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground"
            >
              Project name
            </label>
            <Input
              id="project-name"
              value={projectName}
              maxLength={120}
              onChange={(event) => {
                setProjectName(event.currentTarget.value);
              }}
              placeholder="Project name"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            className="rounded-none uppercase tracking-[0.12em]"
            onClick={() => {
              setProjectName(generateRandomProjectName());
            }}
          >
            Generate new name
          </Button>
        </div>

        <div className="space-y-3 border border-border/80 bg-background/20 p-4">
          <div className="space-y-2">
            <label
              htmlFor="project-root-path"
              className="text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground"
            >
              Project root path
            </label>
            <div className="grid gap-2 md:grid-cols-[1fr_auto]">
              <Input
                id="project-root-path"
                value={projectRootPath}
                onChange={(event) => {
                  setProjectRootPath(event.currentTarget.value);
                }}
                placeholder="/absolute/path/to/project"
              />
              <Button
                type="button"
                variant="outline"
                className="rounded-none uppercase tracking-[0.12em]"
                disabled={!canBrowseProjectRootPath || isSelectingProjectRootPath}
                onClick={() => {
                  void browseForProjectRootPath();
                }}
              >
                {isSelectingProjectRootPath ? "Opening..." : "Browse"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Optional runtime git anchor. Stored in <code>projects.project_root_path</code>.
            </p>
            {!canBrowseProjectRootPath && !hasPartialDesktopBridge ? (
              <p className="text-xs text-muted-foreground">
                Directory picker is available in the desktop app. Manual path input remains
                available.
              </p>
            ) : null}
            {hasPartialDesktopBridge ? (
              <p className="text-xs text-muted-foreground">
                Desktop bridge looks outdated or incomplete. Restart the desktop app and retry
                Browse.
              </p>
            ) : null}
          </div>

          {normalizedProjectRootPath.length > 0 ? (
            <p className="text-xs text-muted-foreground">Normalized: {normalizedProjectRootPath}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Normalized: not set (runtime freshness checks remain unavailable).
            </p>
          )}

          {projectRootPathValidationError ? (
            <p className="text-xs text-destructive">{projectRootPathValidationError}</p>
          ) : null}
        </div>

        {isAnyMethodologyLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Skeleton className="h-[28rem] w-full rounded-none" />
            <Skeleton className="h-[28rem] w-full rounded-none" />
            <Skeleton className="h-[28rem] w-full rounded-none" />
          </div>
        ) : null}

        {!isAnyMethodologyLoading && orderedMethodologies.length > 0 ? (
          <RadioGroup
            value={selectedMethodologyId ?? ""}
            onValueChange={(methodologyId) => {
              setSelectedMethodologyId(methodologyId);
              setLastDiagnostics(null);
            }}
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
            aria-label="Methodology"
          >
            {orderedMethodologies.map((methodology, index) => {
              const methodologyId = methodology.methodologyId;
              const selected = selectedMethodologyId === methodologyId;
              const avatarAsset = getAvatarAssetForMethodologyIndex(index);
              const details = detailsByMethodologyId[methodologyId];
              const publishedVersions = (
                (details?.versions ?? []) as readonly MethodologyVersion[]
              ).filter((version) => isPublishedVersion(version));
              const selectedVersionForCard = selectedVersionsByMethodologyId[methodologyId] ?? "";
              const selectedVersionLabelForCard =
                publishedVersions.find((version) => version.id === selectedVersionForCard)
                  ?.version ?? "";
              const hasPublishedVersions = publishedVersions.length > 0;

              return (
                <label
                  key={methodology.methodologyId}
                  htmlFor={`methodology-${methodology.methodologyId}`}
                  className={cn(
                    "group relative flex min-h-[28rem] cursor-pointer flex-col border border-border/80 bg-muted/10 p-4 transition-colors",
                    selected && "border-primary bg-primary/8",
                  )}
                >
                  <div className="space-y-4">
                    <div className="border border-border/70 bg-background/40 p-3">
                      <img
                        src={`/visuals/methodologies/avatars/${avatarAsset}.svg`}
                        alt=""
                        className="h-28 w-full object-contain"
                      />
                    </div>

                    <div className="space-y-1">
                      <p className="text-lg font-semibold uppercase tracking-[0.08em]">
                        {methodology.displayName}
                      </p>
                      <p className="text-xs text-muted-foreground">{methodology.methodologyKey}</p>
                    </div>

                    <p className="min-h-10 text-xs leading-relaxed text-muted-foreground">
                      {extractMethodologyDescription(details ?? null)}
                    </p>
                  </div>

                  <div className="mt-4 space-y-2 border border-border/70 bg-background/30 p-3">
                    <p className="text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground">
                      Published version
                    </p>

                    <Popover
                      open={openComboboxForMethodologyId === methodologyId}
                      onOpenChange={(open) => {
                        setOpenComboboxForMethodologyId(open ? methodologyId : null);
                        if (open) {
                          setSelectedMethodologyId(methodologyId);
                        }
                      }}
                    >
                      <PopoverTrigger
                        render={
                          <Button
                            type="button"
                            role="combobox"
                            variant="outline"
                            className="w-full justify-between rounded-none border-border/70 bg-background/70"
                            aria-expanded={openComboboxForMethodologyId === methodologyId}
                            disabled={!hasPublishedVersions}
                          />
                        }
                      >
                        {selectedVersionLabelForCard || "Select version"}
                        <ChevronsUpDownIcon className="size-4 opacity-50" />
                      </PopoverTrigger>

                      <PopoverContent
                        className="w-[360px] rounded-none border-border/80 bg-background/95 p-0"
                        align="start"
                      >
                        <Command>
                          <CommandInput placeholder="Search versions..." />
                          <CommandList>
                            <CommandEmpty>No published versions found.</CommandEmpty>
                            <CommandGroup heading="Published Versions">
                              {publishedVersions.map((version) => (
                                <CommandItem
                                  key={version.id}
                                  value={`${version.version} ${version.displayName}`}
                                  onSelect={() => {
                                    setSelectedMethodologyId(methodologyId);
                                    setSelectedVersionsByMethodologyId((current) => ({
                                      ...current,
                                      [methodologyId]: version.id,
                                    }));
                                    setVersionModeByMethodologyId((current) => ({
                                      ...current,
                                      [methodologyId]: "user",
                                    }));
                                    setOpenComboboxForMethodologyId(null);
                                    setLastDiagnostics(null);
                                  }}
                                  className="py-2"
                                >
                                  <div className="flex w-full items-center justify-between gap-3">
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-sm font-medium">{version.version}</span>
                                      <span className="text-[0.7rem] text-muted-foreground">
                                        {version.displayName}
                                      </span>
                                    </div>
                                    <CheckIcon
                                      className={cn(
                                        "size-4",
                                        selectedVersionForCard === version.id
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

                    {!hasPublishedVersions ? (
                      <p className="text-[0.7rem] text-muted-foreground">
                        Publish a version to enable project creation.
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-4 flex items-end justify-between gap-2 text-xs text-muted-foreground">
                    <div className="space-y-0.5">
                      <p className="uppercase tracking-[0.14em]">Published versions</p>
                      <p>{publishedVersions.length}</p>
                    </div>
                    <RadioGroupItem
                      id={`methodology-${methodology.methodologyId}`}
                      value={methodologyId}
                      aria-label={`Select ${methodology.displayName}`}
                    />
                  </div>
                </label>
              );
            })}
          </RadioGroup>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border border-border/70 bg-background/20 p-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Selected pin target: {selectedMethodology?.methodologyKey ?? "none"}{" "}
              {selectedVersionLabel ? `@ ${selectedVersionLabel}` : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              Project root path:{" "}
              {normalizedProjectRootPath.length > 0 ? normalizedProjectRootPath : "not set"}
            </p>
          </div>
          <Button
            type="button"
            disabled={
              createAndPinMutation.isPending ||
              !selectedMethodologyId ||
              !selectedVersionId ||
              projectName.trim().length === 0 ||
              Boolean(projectRootPathValidationError) ||
              !selectedMethodologyHasPublishedVersions
            }
            className="rounded-none uppercase tracking-[0.12em]"
            onClick={() => {
              if (!selectedMethodologyId || !selectedVersionId) {
                return;
              }

              const payload = {
                methodologyId: selectedMethodologyId,
                versionId: selectedVersionId,
                name: projectName.trim(),
                ...(normalizedProjectRootPath.length > 0
                  ? { projectRootPath: normalizedProjectRootPath }
                  : {}),
              };

              createAndPinMutation.mutate(payload);
            }}
          >
            {createAndPinMutation.isPending ? "Creating..." : "Create and pin project"}
          </Button>
        </div>

        {!selectedMethodologyHasPublishedVersions && selectedMethodologyId ? (
          <p className="text-xs text-muted-foreground">
            No published versions available for selected methodology. Publish an eligible version
            first.
          </p>
        ) : null}

        {createAndPinMutation.error || (lastDiagnostics && lastDiagnostics.length > 0) ? (
          <section className="space-y-3 border border-destructive/50 bg-destructive/10 p-4 text-xs">
            <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
              <AlertTriangleIcon className="size-4" />
              <span>
                {createAndPinMutation.error
                  ? "Create and pin request failed"
                  : "Pin request blocked by deterministic validation"}
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

export { CreateProjectRoute };
