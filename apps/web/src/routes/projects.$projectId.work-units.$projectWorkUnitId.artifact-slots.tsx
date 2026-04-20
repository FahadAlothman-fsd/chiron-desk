import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MethodologyWorkspaceShell } from "@/features/methodologies/workspace-shell";

const runtimeArtifactSlotsQueryKey = (projectId: string, projectWorkUnitId: string) =>
  ["runtime-artifact-slots", projectId, projectWorkUnitId] as const;

function formatTimestamp(timestamp?: string): string {
  if (!timestamp) {
    return "—";
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return date.toLocaleString();
}

export const Route = createFileRoute(
  "/projects/$projectId/work-units/$projectWorkUnitId/artifact-slots",
)({
  component: ProjectWorkUnitArtifactSlotsRoute,
});

export function ProjectWorkUnitArtifactSlotsRoute() {
  const { projectId, projectWorkUnitId } = Route.useParams();
  const { orpc } = Route.useRouteContext();

  const runtimeArtifactSlotsQuery = useQuery({
    ...orpc.project.getRuntimeArtifactSlots.queryOptions({
      input: {
        projectId,
        projectWorkUnitId,
      },
    }),
    queryKey: runtimeArtifactSlotsQueryKey(projectId, projectWorkUnitId),
  });

  const artifactSlots = runtimeArtifactSlotsQuery.data;

  return (
    <MethodologyWorkspaceShell
      title="Artifact slots"
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
          label: artifactSlots?.workUnit.workUnitTypeName ?? projectWorkUnitId,
          to: "/projects/$projectId/work-units/$projectWorkUnitId",
          params: { projectId, projectWorkUnitId },
        },
        { label: "Artifact Slots" },
      ]}
    >
      {runtimeArtifactSlotsQuery.isLoading ? (
        <Skeleton className="h-56 w-full rounded-none" />
      ) : null}

      {artifactSlots ? (
        <>
          <section className="space-y-3 border border-border/80 bg-background p-4">
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
              Work unit context
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                  Work unit
                </p>
                <p className="text-sm font-medium">{artifactSlots.workUnit.workUnitTypeName}</p>
                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  {artifactSlots.workUnit.workUnitTypeKey}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                  Current state
                </p>
                <p className="text-sm">{artifactSlots.workUnit.currentStateLabel}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                  Slot count
                </p>
                <p className="text-sm">{artifactSlots.slots.length}</p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            {artifactSlots.slots.length === 0 ? (
              <section className="border border-border/80 bg-background p-4 text-sm text-muted-foreground">
                No artifact slot definitions are available for this work unit type.
              </section>
            ) : (
              <ul className="grid gap-3 md:grid-cols-2">
                {artifactSlots.slots.map((slotCard) => {
                  const currentArtifactInstance = slotCard.currentArtifactInstance;
                  return (
                    <li key={slotCard.slotDefinition.slotDefinitionId}>
                      <Card
                        frame="cut"
                        tone="runtime"
                        className="h-full border-border/80 bg-background/40"
                      >
                        <CardHeader className="space-y-1">
                          <CardDescription className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                            {slotCard.slotDefinition.artifactKind}
                          </CardDescription>
                          <CardTitle className="text-base tracking-[0.02em]">
                            {slotCard.slotDefinition.slotName ?? slotCard.slotDefinition.slotKey}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground">
                            {slotCard.slotDefinition.slotKey}
                          </p>
                        </CardHeader>

                        <CardContent className="space-y-3 text-xs text-muted-foreground">
                          {currentArtifactInstance.exists ? (
                            <>
                              <p>
                                Current artifact instance: {currentArtifactInstance.fileCount} file
                                {currentArtifactInstance.fileCount === 1 ? "" : "s"}
                              </p>
                              <p>Updated: {formatTimestamp(currentArtifactInstance.updatedAt)}</p>

                              {currentArtifactInstance.previewFiles.length > 0 ? (
                                <ul className="space-y-1">
                                  {currentArtifactInstance.previewFiles.map((member) => (
                                    <li
                                      key={member.filePath}
                                      className="truncate border border-border/70 bg-background/50 px-2 py-1"
                                    >
                                      {member.filePath}
                                    </li>
                                  ))}
                                </ul>
                              ) : null}
                            </>
                          ) : (
                            <>
                              <p>No current artifact instance.</p>
                            </>
                          )}

                          <Link
                            to="/projects/$projectId/work-units/$projectWorkUnitId/artifact-slots/$slotDefinitionId"
                            params={{
                              projectId,
                              projectWorkUnitId,
                              slotDefinitionId: slotCard.slotDefinition.slotDefinitionId,
                            }}
                            search={{ q: "" }}
                            className="inline-flex text-xs font-medium uppercase tracking-[0.12em] text-primary hover:underline"
                          >
                            Open detail
                          </Link>
                        </CardContent>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </MethodologyWorkspaceShell>
  );
}
