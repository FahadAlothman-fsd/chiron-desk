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

function MethodologyWorkspaceEntryRoute() {
  const { methodologyId, versionId } = Route.useParams();
  const { orpc, queryClient } = Route.useRouteContext();
  const initialDraft = useMemo(
    () => createEmptyMethodologyVersionWorkspaceDraft(methodologyId),
    [methodologyId],
  );
  const [draft, setDraft] = useState<MethodologyVersionWorkspaceDraft>(initialDraft);
  const [parseDiagnostics, setParseDiagnostics] = useState<WorkspaceParseDiagnostic[]>([]);

  const detailsQueryOptions = orpc.methodology.getMethodologyDetails.queryOptions({
    input: { methodologyKey: methodologyId },
  });
  const draftQueryOptions = orpc.methodology.getDraftProjection.queryOptions({
    input: { versionId },
  });
  const draftQuery = useQuery(draftQueryOptions);

  const updateLifecycleMutation = useMutation(
    orpc.methodology.updateDraftLifecycle.mutationOptions(),
  );
  const updateWorkflowsMutation = useMutation(
    orpc.methodology.updateDraftWorkflows.mutationOptions(),
  );

  const isSaving = updateLifecycleMutation.isPending || updateWorkflowsMutation.isPending;

  useEffect(() => {
    if (!draftQuery.data) {
      return;
    }

    setDraft(createDraftFromProjection(methodologyId, draftQuery.data as DraftProjectionShape));
    setParseDiagnostics([]);
  }, [draftQuery.data, methodologyId]);

  const handleSave = async () => {
    const parsed = parseWorkspaceDraftForPersistence(draft);
    if (parsed.diagnostics.length > 0) {
      setParseDiagnostics(parsed.diagnostics);
      return;
    }

    setParseDiagnostics([]);

    const lifecycleInput = {
      versionId,
      workUnitTypes: parsed.lifecycle.workUnitTypes,
      agentTypes: parsed.lifecycle.agentTypes,
    } as Parameters<typeof updateLifecycleMutation.mutateAsync>[0];

    const lifecycleResult = await updateLifecycleMutation.mutateAsync(lifecycleInput);

    const lifecycleDiagnostics = mapValidationDiagnosticsToWorkspaceDiagnostics(
      lifecycleResult.validation.diagnostics,
    );
    if (!lifecycleResult.validation.valid || lifecycleDiagnostics.length > 0) {
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
    if (workflowDiagnostics.length > 0) {
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
  };

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
