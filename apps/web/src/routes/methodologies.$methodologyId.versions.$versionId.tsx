import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import {
  MethodologyVersionWorkspace,
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
  component: MethodologyWorkspaceEntryRoute,
});

export function MethodologyWorkspaceEntryRoute() {
  const { methodologyId, versionId } = Route.useParams();
  const { orpc, queryClient } = Route.useRouteContext();
  const initialDraft = useMemo(
    () => createEmptyMethodologyVersionWorkspaceDraft(methodologyId),
    [methodologyId],
  );
  const [draft, setDraft] = useState<MethodologyVersionWorkspaceDraft>(initialDraft);
  const [parseDiagnostics, setParseDiagnostics] = useState<WorkspaceParseDiagnostic[]>([]);
  const [publishVersion, setPublishVersion] = useState("");
  const [evidenceFilter, setEvidenceFilter] = useState("");
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

  useEffect(() => {
    if (!draftQuery.data) {
      return;
    }

    setDraft(createDraftFromProjection(methodologyId, draftQuery.data as DraftProjectionShape));
    setParseDiagnostics([]);
  }, [draftQuery.data, methodologyId]);

  useEffect(() => {
    if (publishVersion || !currentVersion?.version) {
      return;
    }

    setPublishVersion(currentVersion.version);
  }, [currentVersion?.version, publishVersion]);

  const immutableRejectionDiagnostic = {
    field: "displayName",
    group: "field",
    blocking: true,
    message:
      "IMMUTABLE_PUBLISHED_VERSION required: draft status observed: published status remediation: create or open a draft before editing immutable contract fields.",
  } satisfies WorkspaceParseDiagnostic;

  const handleSave = async () => {
    if (immutableVersion) {
      setParseDiagnostics([immutableRejectionDiagnostic]);
      return;
    }

    const parsed = parseWorkspaceDraftForPersistence(draft);
    if (hasBlockingDiagnostics(parsed.diagnostics)) {
      setParseDiagnostics(parsed.diagnostics);
      return;
    }

    setParseDiagnostics([]);
    try {
      const lifecycleInput = {
        versionId,
        workUnitTypes: parsed.lifecycle.workUnitTypes,
        agentTypes: parsed.lifecycle.agentTypes,
      } as Parameters<typeof updateLifecycleMutation.mutateAsync>[0];

      const lifecycleResult = await updateLifecycleMutation.mutateAsync(lifecycleInput);

      const lifecycleDiagnostics = mapValidationDiagnosticsToWorkspaceDiagnostics(
        lifecycleResult.validation.diagnostics,
      );
      if (!lifecycleResult.validation.valid || hasBlockingDiagnostics(lifecycleDiagnostics)) {
        setParseDiagnostics(lifecycleDiagnostics);
        return;
      }

      const workflowInput = {
        versionId,
        workflows: parsed.workflows.workflows,
        transitionWorkflowBindings: parsed.workflows.transitionWorkflowBindings,
        guidance: parsed.workflows.guidance,
      } as Parameters<typeof updateWorkflowsMutation.mutateAsync>[0];

      const workflowResult = await updateWorkflowsMutation.mutateAsync(workflowInput);

      const workflowDiagnostics = mapValidationDiagnosticsToWorkspaceDiagnostics(
        workflowResult.diagnostics,
      );
      if (hasBlockingDiagnostics(workflowDiagnostics)) {
        setParseDiagnostics(workflowDiagnostics);
        return;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: draftQueryOptions.queryKey }),
        queryClient.invalidateQueries({ queryKey: detailsQueryOptions.queryKey }),
      ]);

      const refreshedDraft = await draftQuery.refetch();
      if (refreshedDraft.data) {
        setDraft(
          createDraftFromProjection(methodologyId, refreshedDraft.data as DraftProjectionShape),
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to persist draft updates.";
      if (message.toLowerCase().includes("draft")) {
        setParseDiagnostics([immutableRejectionDiagnostic]);
        return;
      }

      setParseDiagnostics([
        {
          field: "displayName",
          group: "field",
          blocking: true,
          message: `SAVE_FAILED required: deterministic save observed: ${message}`,
        },
      ]);
    }
  };

  const handlePublish = async () => {
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

    try {
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
    } catch (error) {
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
      <details className="chiron-frame-flat p-3">
        <summary className="cursor-pointer text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
          Workspace Context
        </summary>
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
          Deterministic Epic 2 authoring baseline loaded. This workspace edits methodology draft
          contracts and remains non-executable.
        </p>
      </details>

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

      <section className="chiron-frame-flat p-4 space-y-3">
        <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
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
                setPublishVersion(event.target.value);
              }}
            />
          </label>
          <button
            type="button"
            className="inline-flex h-9 items-center justify-center border border-border/70 px-3 text-sm"
            disabled={publishMutation.isPending || validateDraftMutation.isPending}
            onClick={() => {
              void handlePublish();
            }}
          >
            {publishMutation.isPending || validateDraftMutation.isPending
              ? "Publishing..."
              : "Publish Immutable Version"}
          </button>
        </div>
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

      <section className="chiron-frame-flat p-4 space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
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

      <details className="chiron-frame-flat p-3">
        <summary className="cursor-pointer text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
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

      <MethodologyVersionWorkspace
        draft={draft}
        parseDiagnostics={parseDiagnostics}
        isSaving={isSaving}
        onChange={(field, value) => {
          setDraft((current) => ({
            ...current,
            [field]: value,
          }));
        }}
        onSave={() => {
          void handleSave();
        }}
      />
    </MethodologyWorkspaceShell>
  );
}
