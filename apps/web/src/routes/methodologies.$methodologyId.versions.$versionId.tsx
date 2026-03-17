import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, Outlet, createFileRoute, useLocation } from "@tanstack/react-router";
import { Result } from "better-result";
import { useMemo, useState } from "react";
import { z } from "zod";

import { buttonVariants } from "@/components/ui/button";
import {
  MethodologyVersionWorkspaceAuthorHub,
  type AuthorHubSurfaceSummary,
} from "@/features/methodologies/version-workspace-author-hub";
import type { MethodologyVersionWorkspaceAuthorHubActions } from "@/features/methodologies/version-workspace-author-hub-actions";
import {
  createDraftFromProjection,
  createEmptyMethodologyVersionWorkspaceDraft,
  mapValidationDiagnosticsToWorkspaceDiagnostics,
  parseWorkspaceDraftForPersistence,
  type DraftProjectionShape,
  type MethodologyVersionWorkspaceDraft,
  type WorkspaceParseDiagnostic,
} from "@/features/methodologies/version-workspace";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";

export const Route = createFileRoute("/methodologies/$methodologyId/versions/$versionId")({
  validateSearch: (search) =>
    z
      .object({
        page: z.enum(["author", "review"]).optional(),
      })
      .parse(search),
  component: MethodologyWorkspaceEntryRoute,
});

export function MethodologyWorkspaceEntryRoute() {
  const { methodologyId, versionId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const location = useLocation();
  const { orpc, queryClient } = Route.useRouteContext();
  const initialDraft = useMemo(
    () => createEmptyMethodologyVersionWorkspaceDraft(methodologyId),
    [methodologyId],
  );
  const [parseDiagnostics, setParseDiagnostics] = useState<WorkspaceParseDiagnostic[]>([]);
  const [publishVersionOverride, setPublishVersionOverride] = useState<string | null>(null);
  const [evidenceFilter, setEvidenceFilter] = useState("");
  const workspacePage = search.page === "review" ? "review" : "author";
  const [publishResult, setPublishResult] = useState<{
    publishedVersion: string;
    sourceDraftRef: string;
    timestamp: string;
    actorId: string | null;
    evidenceRef: string;
    validationSummary: {
      valid: boolean;
      diagnostics: readonly { code: string; scope: string }[];
    };
  } | null>(null);

  const hasBlockingDiagnostics = (diagnostics: readonly WorkspaceParseDiagnostic[]) =>
    diagnostics.some((diagnostic) => diagnostic.blocking !== false);

  const detailsQueryOptions = orpc.methodology.getMethodologyDetails.queryOptions({
    input: { methodologyKey: methodologyId },
  });
  const detailsQuery = useQuery(detailsQueryOptions);
  const draftQueryOptions = orpc.methodology.getDraftProjection.queryOptions({
    input: { versionId },
  });
  const draftQuery = useQuery(draftQueryOptions);
  const evidenceQueryOptions = orpc.methodology.getPublicationEvidence.queryOptions({
    input: { methodologyVersionId: versionId },
  });
  const evidenceQuery = useQuery(evidenceQueryOptions);

  const validateDraftMutation = useMutation(
    orpc.methodology.validateDraftVersion.mutationOptions(),
  );
  const updateLifecycleMutation = useMutation(
    orpc.methodology.updateDraftLifecycle.mutationOptions(),
  );
  const updateWorkflowsMutation = useMutation(
    orpc.methodology.updateDraftWorkflows.mutationOptions(),
  );
  const publishMutation = useMutation(orpc.methodology.publishDraftVersion.mutationOptions());

  const isSaving =
    updateLifecycleMutation.isPending ||
    updateWorkflowsMutation.isPending ||
    validateDraftMutation.isPending;

  const currentVersion = useMemo(() => {
    const details =
      (detailsQuery.data as
        | { versions?: Array<{ id: string; status: string; version: string }> }
        | undefined) ?? null;
    return details?.versions?.find((version) => version.id === versionId) ?? null;
  }, [detailsQuery.data, versionId]);

  const immutableVersion = currentVersion ? currentVersion.status !== "draft" : false;
  const effectiveWorkspacePage =
    immutableVersion && workspacePage === "review" ? "review" : workspacePage;
  const workspacePath = `/methodologies/${methodologyId}/versions/${versionId}`;
  const draft = useMemo<MethodologyVersionWorkspaceDraft>(() => {
    if (!draftQuery.data) {
      return initialDraft;
    }

    return createDraftFromProjection(methodologyId, draftQuery.data as DraftProjectionShape);
  }, [draftQuery.data, initialDraft, methodologyId]);
  const parsedDraft = useMemo(() => parseWorkspaceDraftForPersistence(draft), [draft]);
  const publishVersion = publishVersionOverride ?? currentVersion?.version ?? "";
  const authorHubActions: MethodologyVersionWorkspaceAuthorHubActions = {
    openWorkUnits: {
      disabledReason: null,
      onTrigger: () => {
        void navigate({
          to: "/methodologies/$methodologyId/versions/$versionId/work-units",
          params: { methodologyId, versionId },
        });
      },
    },
    createWorkUnit: {
      disabledReason: null,
      onTrigger: () => {
        void navigate({
          to: "/methodologies/$methodologyId/versions/$versionId/work-units",
          params: { methodologyId, versionId },
        });
      },
    },
    openFacts: {
      disabledReason: null,
      onTrigger: () => {
        void navigate({
          to: "/methodologies/$methodologyId/versions/$versionId/facts",
          params: { methodologyId, versionId },
        });
      },
    },
    createFact: {
      disabledReason: null,
      onTrigger: () => {
        void navigate({
          to: "/methodologies/$methodologyId/versions/$versionId/facts",
          params: { methodologyId, versionId },
        });
      },
    },
    openAgents: {
      disabledReason: null,
      onTrigger: () => {
        void navigate({
          to: "/methodologies/$methodologyId/versions/$versionId/agents",
          params: { methodologyId, versionId },
        });
      },
    },
    createAgent: {
      disabledReason: null,
      onTrigger: () => {
        void navigate({
          to: "/methodologies/$methodologyId/versions/$versionId/agents",
          params: { methodologyId, versionId },
        });
      },
    },
    openLinkTypes: {
      disabledReason: null,
      onTrigger: () => {
        void navigate({
          to: "/methodologies/$methodologyId/versions/$versionId/dependency-definitions",
          params: { methodologyId, versionId },
        });
      },
    },
    createLinkType: {
      disabledReason: null,
      onTrigger: () => {
        void navigate({
          to: "/methodologies/$methodologyId/versions/$versionId/dependency-definitions",
          params: { methodologyId, versionId },
        });
      },
    },
  };

  const authorHubSummaries = useMemo(
    () => ({
      workUnits: createWorkUnitSummary(
        parsedDraft.lifecycle.workUnitTypes,
        parsedDraft.workflows.workflows,
      ),
      facts: createFactSummary(
        parsedDraft.workflows.factDefinitions,
        parsedDraft.lifecycle.workUnitTypes,
      ),
      agents: createAgentSummary(parsedDraft.lifecycle.agentTypes),
      linkTypes: createLinkTypeSummary(parsedDraft.workflows.transitionWorkflowBindings),
    }),
    [parsedDraft],
  );

  const handlePublish = async () => {
    if (publishMutation.isPending || validateDraftMutation.isPending) {
      return;
    }

    const normalizedPublishVersion = publishVersion.trim();
    if (!normalizedPublishVersion) {
      setParseDiagnostics([
        {
          field: "displayName",
          group: "field",
          message:
            "PUBLISH_VERSION_REQUIRED required: non-empty publish version observed: empty remediation: provide target published version before publishing.",
        },
      ]);
      return;
    }

    const parsed = parseWorkspaceDraftForPersistence(draft);
    if (hasBlockingDiagnostics(parsed.diagnostics)) {
      setParseDiagnostics(parsed.diagnostics);
      return;
    }

    setParseDiagnostics([]);

    const publishResultAttempt = await Result.tryPromise({
      try: async () => {
        const validationResult = await validateDraftMutation.mutateAsync({ versionId });
        const validationDiagnostics = mapValidationDiagnosticsToWorkspaceDiagnostics(
          validationResult.diagnostics,
        );

        if (!validationResult.valid || hasBlockingDiagnostics(validationDiagnostics)) {
          setParseDiagnostics(validationDiagnostics);
          return;
        }

        const publishResult = await publishMutation.mutateAsync({
          versionId,
          publishedVersion: normalizedPublishVersion,
        });
        const publishDiagnostics = mapValidationDiagnosticsToWorkspaceDiagnostics(
          publishResult.diagnostics,
        );

        if (
          !publishResult.published ||
          hasBlockingDiagnostics(publishDiagnostics) ||
          !publishResult.evidence
        ) {
          setParseDiagnostics(
            publishDiagnostics.length > 0
              ? publishDiagnostics
              : [
                  {
                    field: "displayName",
                    group: "field",
                    blocking: true,
                    message:
                      "PUBLISH_BLOCKED required: valid methodology draft observed: blocked publish remediation: resolve diagnostics and retry publish.",
                  },
                ],
          );
          return;
        }

        setPublishResult({
          publishedVersion: publishResult.evidence.publishedVersion,
          sourceDraftRef: publishResult.evidence.sourceDraftRef,
          timestamp: publishResult.evidence.timestamp,
          actorId: publishResult.evidence.actorId,
          evidenceRef: publishResult.evidence.evidenceRef,
          validationSummary: {
            valid: publishResult.evidence.validationSummary.valid,
            diagnostics: publishResult.evidence.validationSummary.diagnostics.map((diagnostic) => ({
              code: diagnostic.code,
              scope: diagnostic.scope,
            })),
          },
        });

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: detailsQueryOptions.queryKey }),
          queryClient.invalidateQueries({ queryKey: draftQueryOptions.queryKey }),
          queryClient.invalidateQueries({ queryKey: evidenceQueryOptions.queryKey }),
        ]);

        await Promise.all([detailsQuery.refetch(), draftQuery.refetch(), evidenceQuery.refetch()]);
      },
      catch: (error) => error,
    });

    if (publishResultAttempt.isErr()) {
      const error = publishResultAttempt.error;
      const message =
        error instanceof Error ? error.message : "Failed to publish methodology draft.";
      setParseDiagnostics([
        {
          field: "displayName",
          group: "field",
          blocking: true,
          message: `PUBLISH_FAILED required: successful publish observed: ${message}`,
        },
      ]);
    }
  };

  const evidenceRows = useMemo(() => {
    const rows = Array.isArray(evidenceQuery.data)
      ? evidenceQuery.data.map((entry) => ({
          actorId: entry.actorId,
          timestamp: entry.timestamp,
          sourceDraftRef: entry.sourceDraftRef,
          publishedVersion: entry.publishedVersion,
          valid: entry.validationSummary.valid,
          evidenceRef: entry.evidenceRef,
        }))
      : [];

    const normalizedFilter = evidenceFilter.trim().toLowerCase();
    const filteredRows = rows.filter((row) => {
      if (!normalizedFilter) {
        return true;
      }

      return [
        row.actorId ?? "",
        row.timestamp,
        row.sourceDraftRef,
        row.publishedVersion,
        row.valid ? "valid" : "invalid",
        row.evidenceRef,
      ].some((value) => value.toLowerCase().includes(normalizedFilter));
    });

    return filteredRows.sort((left, right) => {
      const byTimestamp = left.timestamp.localeCompare(right.timestamp);
      if (byTimestamp !== 0) {
        return byTimestamp;
      }

      return left.evidenceRef.localeCompare(right.evidenceRef);
    });
  }, [evidenceFilter, evidenceQuery.data]);

  if (location.pathname !== workspacePath) {
    return <Outlet />;
  }

  return (
    <MethodologyWorkspaceShell
      title="Methodology Version Workspace"
      stateLabel={
        draftQuery.isLoading
          ? "loading"
          : draftQuery.isError || updateLifecycleMutation.isError || updateWorkflowsMutation.isError
            ? "failed"
            : "success"
      }
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
      <section className="chiron-frame-flat chiron-tone-navigation p-3">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ["author", "Author"],
              ["review", "Review & Publish"],
            ] as const
          ).map(([pageKey, label]) => (
            <button
              key={pageKey}
              type="button"
              className={
                workspacePage === pageKey
                  ? "h-8 border border-[var(--chiron-fluo-2)] bg-[var(--chiron-fluo-2)]/20 px-3 text-xs uppercase tracking-[0.14em]"
                  : "h-8 border border-border/70 px-3 text-xs uppercase tracking-[0.14em]"
              }
              onClick={() => {
                void navigate({
                  to: "/methodologies/$methodologyId/versions/$versionId",
                  params: { methodologyId, versionId },
                  search: {
                    page: pageKey === "author" ? undefined : "review",
                  },
                  replace: true,
                });
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {effectiveWorkspacePage === "review" ? (
        <details className="chiron-frame-flat chiron-tone-context p-3" open>
          <summary className="chiron-tone-kicker cursor-pointer text-[0.68rem] uppercase tracking-[0.18em]">
            Workspace Context
          </summary>
          <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
            <p>
              Methodology:{" "}
              <span className="font-semibold uppercase tracking-[0.06em]">{methodologyId}</span>
            </p>
            <p>
              Version:{" "}
              <span className="font-semibold uppercase tracking-[0.06em]">{versionId}</span>
            </p>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Deterministic Epic 2 authoring baseline loaded. This workspace edits methodology draft
            contracts and remains non-executable.
          </p>
        </details>
      ) : null}

      {draftQuery.isLoading ? (
        <section className="border border-border/80 bg-background p-4">
          <p className="text-sm">Loading draft projection...</p>
        </section>
      ) : null}

      {draftQuery.isError ? (
        <section className="border border-border/80 bg-background p-4">
          <p className="text-sm">State: failed - Unable to load draft projection.</p>
        </section>
      ) : null}

      {updateLifecycleMutation.isError ? (
        <section className="border border-border/80 bg-background p-4">
          <p className="text-sm">State: failed - {updateLifecycleMutation.error.message}</p>
        </section>
      ) : null}

      {updateWorkflowsMutation.isError ? (
        <section className="border border-border/80 bg-background p-4">
          <p className="text-sm">State: failed - {updateWorkflowsMutation.error.message}</p>
        </section>
      ) : null}

      {effectiveWorkspacePage === "review" ? (
        <section className="chiron-frame-flat chiron-tone-publish p-4 space-y-3">
          <p className="chiron-tone-kicker text-[0.68rem] uppercase tracking-[0.18em]">
            Publish Methodology Version
          </p>
          <p className="text-xs text-muted-foreground">
            Publish runs deterministic validation preflight. Blocking diagnostics prevent immutable
            publication.
          </p>
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              <span>Published Version</span>
              <input
                aria-label="Published Version"
                className="border border-border/70 bg-background px-2 py-1 text-sm"
                value={publishVersion}
                onChange={(event) => {
                  setPublishVersionOverride(event.target.value);
                }}
              />
            </label>
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center border border-border/70 px-3 text-sm"
              disabled={
                immutableVersion || publishMutation.isPending || validateDraftMutation.isPending
              }
              onClick={() => {
                void handlePublish();
              }}
            >
              {publishMutation.isPending || validateDraftMutation.isPending
                ? "Publishing..."
                : immutableVersion
                  ? "Published Versions Are Read Only"
                  : "Publish Immutable Version"}
            </button>
          </div>
          {immutableVersion ? (
            <p className="text-xs text-muted-foreground">
              Published versions are immutable. Create a draft to make changes or publish a new
              version.
            </p>
          ) : null}
          {publishResult ? (
            <div className="chiron-cut-frame px-3 py-2" data-variant="surface">
              <p className="text-[0.64rem] uppercase tracking-[0.14em] text-muted-foreground">
                Last Publish Result
              </p>
              <p className="mt-2 text-xs">Version: {publishResult.publishedVersion}</p>
              <p className="text-xs">Source Draft: {publishResult.sourceDraftRef}</p>
              <p className="text-xs">Actor: {publishResult.actorId ?? "system"}</p>
              <p className="text-xs">Timestamp: {publishResult.timestamp}</p>
              <p className="text-xs">Evidence: {publishResult.evidenceRef}</p>
              <p className="text-xs">
                Validation: {publishResult.validationSummary.valid ? "valid" : "invalid"} /
                diagnostics {publishResult.validationSummary.diagnostics.length}
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      {effectiveWorkspacePage === "review" ? (
        <section className="chiron-frame-flat chiron-tone-evidence p-4 space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <p className="chiron-tone-kicker text-[0.68rem] uppercase tracking-[0.18em]">
              Publication Evidence
            </p>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground min-w-[220px]">
              <span>Filter Evidence</span>
              <input
                aria-label="Filter Evidence"
                className="border border-border/70 bg-background px-2 py-1 text-sm"
                placeholder="Search actor/version/evidence reference"
                value={evidenceFilter}
                onChange={(event) => {
                  setEvidenceFilter(event.target.value);
                }}
              />
            </label>
          </div>

          <div className="overflow-x-auto border border-border/70">
            <table className="w-full text-xs">
              <thead className="bg-background/70 text-muted-foreground">
                <tr>
                  <th className="px-2 py-1 text-left font-medium">Actor</th>
                  <th className="px-2 py-1 text-left font-medium">Timestamp</th>
                  <th className="px-2 py-1 text-left font-medium">Source Draft</th>
                  <th className="px-2 py-1 text-left font-medium">Published Version</th>
                  <th className="px-2 py-1 text-left font-medium">Validation</th>
                  <th className="px-2 py-1 text-left font-medium">Evidence Ref</th>
                </tr>
              </thead>
              <tbody>
                {evidenceRows.map((row) => (
                  <tr
                    key={`${row.timestamp}:${row.evidenceRef}`}
                    className="border-t border-border/60"
                  >
                    <td className="px-2 py-1">{row.actorId ?? "system"}</td>
                    <td className="px-2 py-1">{row.timestamp}</td>
                    <td className="px-2 py-1">{row.sourceDraftRef}</td>
                    <td className="px-2 py-1">{row.publishedVersion}</td>
                    <td className="px-2 py-1">{row.valid ? "valid" : "invalid"}</td>
                    <td className="px-2 py-1">{row.evidenceRef}</td>
                  </tr>
                ))}
                {evidenceRows.length === 0 ? (
                  <tr>
                    <td className="px-2 py-2 text-muted-foreground" colSpan={6}>
                      No publication evidence records for this version.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <details
        className="chiron-frame-flat chiron-tone-navigation p-3"
        open={workspacePage === "review"}
      >
        <summary className="chiron-tone-kicker cursor-pointer text-[0.68rem] uppercase tracking-[0.18em]">
          Navigation
        </summary>
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
      </details>

      {effectiveWorkspacePage === "author" ? (
        <MethodologyVersionWorkspaceAuthorHub
          actions={authorHubActions}
          draftStatus={
            currentVersion?.status === "draft"
              ? "Draft version"
              : (currentVersion?.status ?? "Draft version")
          }
          saveState={isSaving ? "Saving" : "Saved"}
          runtimeState="Deferred"
          readinessState={parseDiagnostics.length > 0 ? "Needs Review" : "Ready"}
          summaries={authorHubSummaries}
        />
      ) : null}
    </MethodologyWorkspaceShell>
  );
}

function createWorkUnitSummary(
  workUnitTypes: readonly unknown[],
  workflows: readonly unknown[],
): AuthorHubSurfaceSummary {
  const transitionCount = workUnitTypes.reduce<number>((count, workUnitType) => {
    if (!isRecord(workUnitType) || !Array.isArray(workUnitType.lifecycleTransitions)) {
      return count;
    }

    return count + workUnitType.lifecycleTransitions.length;
  }, 0);

  return {
    primary: formatCount(workUnitTypes.length, "work unit"),
    secondary: [
      formatCount(transitionCount, "transition"),
      formatCount(workflows.length, "workflow"),
    ],
  };
}

function createFactSummary(
  factDefinitions: readonly unknown[],
  workUnitTypes: readonly unknown[],
): AuthorHubSurfaceSummary {
  const schemaCount = workUnitTypes.reduce<number>((count, workUnitType) => {
    if (!isRecord(workUnitType) || !Array.isArray(workUnitType.factSchemas)) {
      return count;
    }

    return count + workUnitType.factSchemas.length;
  }, 0);

  return {
    primary: formatCount(factDefinitions.length, "methodology fact"),
    secondary: [formatCount(schemaCount, "work-unit schema")],
  };
}

function createAgentSummary(agentTypes: readonly unknown[]): AuthorHubSurfaceSummary {
  return {
    primary: formatCount(agentTypes.length, "agent definition"),
    secondary: [],
  };
}

function createLinkTypeSummary(
  transitionWorkflowBindings: Record<string, readonly string[]>,
): AuthorHubSurfaceSummary {
  const linkTypeCount = Object.keys(transitionWorkflowBindings).length;
  const bindingCount = Object.values(transitionWorkflowBindings).reduce(
    (count, workflowKeys) => count + workflowKeys.length,
    0,
  );

  return {
    primary: formatCount(linkTypeCount, "link type"),
    secondary: [formatCount(bindingCount, "active binding")],
  };
}

function formatCount(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
