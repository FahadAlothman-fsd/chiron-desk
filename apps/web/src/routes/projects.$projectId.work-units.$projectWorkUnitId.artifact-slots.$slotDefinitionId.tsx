import type { CheckArtifactSlotCurrentStateOutput } from "@chiron/contracts/runtime/artifacts";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { ArtifactSnapshotDialog } from "@/components/runtime/artifact-snapshot-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";

const runtimeArtifactSlotDetailQueryKey = (
  projectId: string,
  projectWorkUnitId: string,
  slotDefinitionId: string,
) => ["runtime-artifact-slot-detail", projectId, projectWorkUnitId, slotDefinitionId] as const;

const runtimeArtifactSlotsQueryKey = (projectId: string, projectWorkUnitId: string) =>
  ["runtime-artifact-slots", projectId, projectWorkUnitId] as const;

const runtimeArtifactSnapshotDialogQueryKey = (
  projectId: string,
  projectWorkUnitId: string,
  slotDefinitionId: string,
  projectArtifactSnapshotId: string,
) =>
  [
    "runtime-artifact-snapshot-dialog",
    projectId,
    projectWorkUnitId,
    slotDefinitionId,
    projectArtifactSnapshotId,
  ] as const;

function formatTimestamp(timestamp?: string): string {
  if (!timestamp) {
    return "—";
  }

  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return timestamp;
  }

  return parsed.toLocaleString();
}

function formatRecordedBy(recordedBy?: {
  transitionName?: string | undefined;
  transitionKey?: string | undefined;
  workflowName?: string | undefined;
  workflowKey?: string | undefined;
  userId?: string | undefined;
}): string {
  if (!recordedBy) {
    return "Recording provenance not available";
  }

  const parts = [
    recordedBy.transitionName ?? recordedBy.transitionKey,
    recordedBy.workflowName ?? recordedBy.workflowKey,
    recordedBy.userId,
  ].filter((value): value is string => Boolean(value));

  return parts.length > 0 ? parts.join(" · ") : "Recording provenance not available";
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }

  return String(error);
}

export const Route = createFileRoute(
  "/projects/$projectId/work-units/$projectWorkUnitId/artifact-slots/$slotDefinitionId",
)({
  component: ProjectWorkUnitArtifactSlotDetailRoute,
});

export function ProjectWorkUnitArtifactSlotDetailRoute() {
  const { projectId, projectWorkUnitId, slotDefinitionId } = Route.useParams();
  const { orpc, queryClient } = Route.useRouteContext();
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [checkResult, setCheckResult] = useState<CheckArtifactSlotCurrentStateOutput | null>(null);
  const [checkErrorMessage, setCheckErrorMessage] = useState<string | null>(null);

  const runtimeArtifactSlotDetailQuery = useQuery({
    ...orpc.project.getRuntimeArtifactSlotDetail.queryOptions({
      input: {
        projectId,
        projectWorkUnitId,
        slotDefinitionId,
      },
    }),
    queryKey: runtimeArtifactSlotDetailQueryKey(projectId, projectWorkUnitId, slotDefinitionId),
  });

  const checkCurrentStateMutation = useMutation(
    orpc.project.checkArtifactSlotCurrentState.mutationOptions({
      onSuccess: async (result) => {
        setCheckResult(result);
        setCheckErrorMessage(null);
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: runtimeArtifactSlotDetailQueryKey(
              projectId,
              projectWorkUnitId,
              slotDefinitionId,
            ),
          }),
          queryClient.invalidateQueries({
            queryKey: runtimeArtifactSlotsQueryKey(projectId, projectWorkUnitId),
          }),
        ]);
      },
      onError: (error) => {
        setCheckErrorMessage(toErrorMessage(error));
      },
    }),
  );

  const artifactSnapshotDialogQuery = useQuery({
    queryKey: runtimeArtifactSnapshotDialogQueryKey(
      projectId,
      projectWorkUnitId,
      slotDefinitionId,
      selectedSnapshotId ?? "idle",
    ),
    enabled: selectedSnapshotId !== null,
    queryFn: async () => {
      if (!selectedSnapshotId) {
        return null;
      }

      return await orpc.project.getRuntimeArtifactSnapshotDialog.call({
        projectId,
        projectWorkUnitId,
        slotDefinitionId,
        projectArtifactSnapshotId: selectedSnapshotId,
      });
    },
  });

  const artifactSlotDetail = runtimeArtifactSlotDetailQuery.data;

  return (
    <MethodologyWorkspaceShell
      title="Artifact slot detail"
      segments={[
        { label: "Projects", to: "/projects" },
        {
          label: projectId,
          to: "/projects/$projectId",
          params: { projectId },
        },
        {
          label: "Work Units",
          to: "/projects/$projectId/work-units",
          params: { projectId },
        },
        {
          label: artifactSlotDetail?.workUnit.workUnitTypeName ?? projectWorkUnitId,
          to: "/projects/$projectId/work-units/$projectWorkUnitId",
          params: { projectId, projectWorkUnitId },
        },
        {
          label: "Artifact Slots",
          to: "/projects/$projectId/work-units/$projectWorkUnitId/artifact-slots",
          params: { projectId, projectWorkUnitId },
        },
        { label: artifactSlotDetail?.slotDefinition.slotName ?? slotDefinitionId },
      ]}
    >
      {runtimeArtifactSlotDetailQuery.isLoading ? (
        <Skeleton className="h-56 w-full rounded-none" />
      ) : null}

      {artifactSlotDetail ? (
        <>
          <section className="space-y-3 border border-border/80 bg-background p-4">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
              Slot metadata
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                  Slot
                </p>
                <p className="text-sm font-medium">
                  {artifactSlotDetail.slotDefinition.slotName ??
                    artifactSlotDetail.slotDefinition.slotKey}
                </p>
                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  {artifactSlotDetail.slotDefinition.slotKey}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                  Work unit
                </p>
                <p className="text-sm">{artifactSlotDetail.workUnit.workUnitTypeName}</p>
                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  {artifactSlotDetail.workUnit.currentStateLabel}
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3 border border-border/80 bg-background p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                Current effective snapshot
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-none uppercase tracking-[0.1em]"
                disabled={checkCurrentStateMutation.isPending}
                onClick={() => {
                  setCheckErrorMessage(null);
                  checkCurrentStateMutation.mutate({
                    projectId,
                    projectWorkUnitId,
                    slotDefinitionId,
                  });
                }}
              >
                {checkCurrentStateMutation.isPending ? "Checking…" : "Check current slot state"}
              </Button>
            </div>

            {checkErrorMessage ? (
              <p className="border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {checkErrorMessage}
              </p>
            ) : null}

            {checkResult?.result === "changed" ? (
              <p className="border border-primary/50 bg-primary/15 px-3 py-2 text-sm text-primary">
                Current state changed and a new snapshot was recorded.
              </p>
            ) : null}

            {checkResult?.result === "unchanged" ? (
              <p className="border border-border/70 bg-background/60 px-3 py-2 text-sm text-muted-foreground">
                Current state is unchanged from the latest effective snapshot.
              </p>
            ) : null}

            {checkResult?.result === "unavailable" ? (
              <p className="border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                Current state check is unavailable because project root path or git context could
                not be resolved.
              </p>
            ) : null}

            {artifactSlotDetail.currentEffectiveSnapshot.exists ? (
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>
                  Snapshot ID:{" "}
                  {artifactSlotDetail.currentEffectiveSnapshot.projectArtifactSnapshotId ??
                    "unknown"}
                </p>
                <p>
                  Recorded: {formatTimestamp(artifactSlotDetail.currentEffectiveSnapshot.createdAt)}
                </p>
                <p>
                  Recorded by:{" "}
                  {formatRecordedBy(artifactSlotDetail.currentEffectiveSnapshot.recordedBy)}
                </p>
                <p>
                  Current member count:{" "}
                  {artifactSlotDetail.currentEffectiveSnapshot.memberCounts.currentCount}
                </p>

                {artifactSlotDetail.currentEffectiveSnapshot.members.length > 0 ? (
                  <ul className="space-y-1">
                    {artifactSlotDetail.currentEffectiveSnapshot.members.map((member) => (
                      <li
                        key={member.artifactSnapshotFileId}
                        className="truncate border border-border/70 bg-background/50 px-2 py-1"
                      >
                        {member.filePath}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : (
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>No current effective artifact.</p>
                <p>Lineage history is still available below.</p>
              </div>
            )}
          </section>

          <section className="space-y-3 border border-border/80 bg-background p-4">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
              Lineage history
            </p>

            {artifactSlotDetail.lineage.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No lineage snapshots have been recorded yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {artifactSlotDetail.lineage.map((snapshot) => (
                  <li key={snapshot.projectArtifactSnapshotId}>
                    <Card frame="flat" tone="runtime" className="border-border/70 bg-background/40">
                      <CardHeader className="space-y-1 pb-2">
                        <CardDescription className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                          Snapshot {snapshot.projectArtifactSnapshotId}
                        </CardDescription>
                        <CardTitle className="text-sm">
                          {formatTimestamp(snapshot.createdAt)}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-xs text-muted-foreground">
                        <p>
                          Delta rows: {snapshot.memberCounts.deltaRowCount} · Effective count:{" "}
                          {snapshot.memberCounts.effectiveCount}
                        </p>
                        <p>Recorded by: {formatRecordedBy(snapshot.recordedBy)}</p>

                        {snapshot.actions?.inspectSnapshot ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-none uppercase tracking-[0.1em]"
                            onClick={() =>
                              setSelectedSnapshotId(
                                snapshot.actions?.inspectSnapshot?.projectArtifactSnapshotId ??
                                  null,
                              )
                            }
                          >
                            Inspect snapshot
                          </Button>
                        ) : null}
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <Link
              to="/projects/$projectId/work-units/$projectWorkUnitId/artifact-slots"
              params={{ projectId, projectWorkUnitId }}
              search={{ q: "", hasActiveTransition: "all" }}
              className="inline-flex text-xs font-medium uppercase tracking-[0.12em] text-primary hover:underline"
            >
              Back to Artifact Slots
            </Link>
          </section>

          <ArtifactSnapshotDialog
            open={selectedSnapshotId !== null}
            onOpenChange={(open) => {
              if (!open) {
                setSelectedSnapshotId(null);
              }
            }}
            detail={artifactSnapshotDialogQuery.data ?? null}
            isLoading={artifactSnapshotDialogQuery.isLoading}
            errorMessage={
              artifactSnapshotDialogQuery.error
                ? toErrorMessage(artifactSnapshotDialogQuery.error)
                : null
            }
          />
        </>
      ) : null}
    </MethodologyWorkspaceShell>
  );
}
