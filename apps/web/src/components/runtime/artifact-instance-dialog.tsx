import type { GetArtifactInstanceDialogOutput } from "@chiron/contracts/runtime/artifacts";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ArtifactInstanceDialogProps = {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly detail: GetArtifactInstanceDialogOutput | null;
  readonly isLoading: boolean;
  readonly errorMessage: string | null;
};

function formatTimestamp(timestamp: string): string {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return timestamp;
  }

  return parsed.toLocaleString();
}

function formatRecordedBy(
  artifactInstance: GetArtifactInstanceDialogOutput["artifactInstance"],
): string {
  if (!artifactInstance.recordedBy) {
    return "Recording provenance not available";
  }

  const parts = [
    artifactInstance.recordedBy.transitionName ?? artifactInstance.recordedBy.transitionKey,
    artifactInstance.recordedBy.workflowName ?? artifactInstance.recordedBy.workflowKey,
    artifactInstance.recordedBy.userId,
  ].filter((value): value is string => Boolean(value));

  return parts.length > 0 ? parts.join(" · ") : "Recording provenance not available";
}

export function ArtifactInstanceDialog({
  open,
  onOpenChange,
  detail,
  isLoading,
  errorMessage,
}: ArtifactInstanceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-none border border-border/80 bg-background">
        <DialogHeader>
          <DialogTitle>Artifact instance drill-in</DialogTitle>
          <DialogDescription>
            Current artifact-instance metadata and tracked files. File content viewing is out of
            scope for this slice.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading artifact details…</p>
        ) : null}

        {errorMessage ? (
          <p className="border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}

        {!isLoading && detail ? (
          <div className="space-y-3 text-xs">
            <section className="space-y-1 border border-border/70 bg-background/40 p-3">
              <p className="text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground">
                Artifact instance context
              </p>
              <p className="font-medium">
                {detail.slotDefinition.slotName ?? detail.slotDefinition.slotKey} ·{" "}
                {detail.slotDefinition.artifactKind}
              </p>
              <p className="text-muted-foreground">
                Artifact instance ID: {detail.artifactInstance.artifactInstanceId ?? "unknown"}
              </p>
              {detail.artifactInstance.updatedAt ? (
                <p className="text-muted-foreground">
                  Updated: {formatTimestamp(detail.artifactInstance.updatedAt)}
                </p>
              ) : null}
            </section>

            <section className="space-y-1 border border-border/70 bg-background/40 p-3">
              <p className="text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground">
                Recording provenance
              </p>
              <p className="text-muted-foreground">{formatRecordedBy(detail.artifactInstance)}</p>
            </section>

            <section className="space-y-2 border border-border/70 bg-background/40 p-3">
              <p className="text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground">
                Tracked files
              </p>
              {detail.artifactInstance.files.length === 0 ? (
                <p className="text-muted-foreground">
                  No tracked files are recorded for this artifact instance.
                </p>
              ) : (
                <ul className="space-y-1">
                  {detail.artifactInstance.files.map((member) => (
                    <li
                      key={member.filePath}
                      className="space-y-1 border border-border/70 bg-background/50 px-2 py-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="truncate text-foreground">{member.filePath}</p>
                      </div>

                      {member.gitCommitHash ? (
                        <p className="text-[0.68rem] text-muted-foreground">
                          commit {member.gitCommitHash}
                          {member.gitCommitTitle ? ` · ${member.gitCommitTitle}` : ""}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-1 border border-border/70 bg-background/40 p-3">
              <p className="text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground">
                Current summary
              </p>
              <p className="text-muted-foreground">
                Current tracked files in this artifact instance: {detail.artifactInstance.fileCount}
              </p>
            </section>
          </div>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="rounded-none uppercase tracking-[0.12em]"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
