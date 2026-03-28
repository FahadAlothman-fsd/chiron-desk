import type { GetArtifactSnapshotDialogOutput } from "@chiron/contracts/runtime/artifacts";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ArtifactSnapshotDialogProps = {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly detail: GetArtifactSnapshotDialogOutput | null;
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

function formatRecordedBy(snapshot: GetArtifactSnapshotDialogOutput["snapshot"]): string {
  if (!snapshot.recordedBy) {
    return "Recording provenance not available";
  }

  const parts = [
    snapshot.recordedBy.transitionName ?? snapshot.recordedBy.transitionKey,
    snapshot.recordedBy.workflowName ?? snapshot.recordedBy.workflowKey,
    snapshot.recordedBy.userId,
  ].filter((value): value is string => Boolean(value));

  return parts.length > 0 ? parts.join(" · ") : "Recording provenance not available";
}

export function ArtifactSnapshotDialog({
  open,
  onOpenChange,
  detail,
  isLoading,
  errorMessage,
}: ArtifactSnapshotDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-none border border-border/80 bg-background">
        <DialogHeader>
          <DialogTitle>Artifact snapshot drill-in</DialogTitle>
          <DialogDescription>
            Snapshot-specific metadata and delta members. File content viewing is out of scope for
            this slice.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading snapshot details…</p>
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
                Snapshot context
              </p>
              <p className="font-medium">
                {detail.slotDefinition.slotName ?? detail.slotDefinition.slotKey} ·{" "}
                {detail.slotDefinition.artifactKind}
              </p>
              <p className="text-muted-foreground">
                Snapshot ID: {detail.snapshot.projectArtifactSnapshotId}
              </p>
              <p className="text-muted-foreground">
                Recorded: {formatTimestamp(detail.snapshot.createdAt)}
              </p>
              {detail.snapshot.supersedesProjectArtifactSnapshotId ? (
                <p className="text-muted-foreground">
                  Supersedes: {detail.snapshot.supersedesProjectArtifactSnapshotId}
                </p>
              ) : null}
            </section>

            <section className="space-y-1 border border-border/70 bg-background/40 p-3">
              <p className="text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground">
                Recording provenance
              </p>
              <p className="text-muted-foreground">{formatRecordedBy(detail.snapshot)}</p>
            </section>

            <section className="space-y-2 border border-border/70 bg-background/40 p-3">
              <p className="text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground">
                Delta members
              </p>
              {detail.snapshot.deltaMembers.length === 0 ? (
                <p className="text-muted-foreground">
                  No delta members were recorded for this snapshot.
                </p>
              ) : (
                <ul className="space-y-1">
                  {detail.snapshot.deltaMembers.map((member) => (
                    <li
                      key={member.artifactSnapshotFileId}
                      className="space-y-1 border border-border/70 bg-background/50 px-2 py-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="truncate text-foreground">{member.filePath}</p>
                        <span
                          className={
                            member.memberStatus === "present"
                              ? "border border-primary/50 bg-primary/15 px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.1em] text-primary"
                              : "border border-destructive/50 bg-destructive/10 px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.1em] text-destructive"
                          }
                        >
                          {member.memberStatus}
                        </span>
                      </div>

                      {(member.gitBlobHash ?? member.gitCommitHash) ? (
                        <p className="text-[0.68rem] text-muted-foreground">
                          {member.gitBlobHash ? `blob ${member.gitBlobHash}` : "blob —"}
                          {" · "}
                          {member.gitCommitHash ? `commit ${member.gitCommitHash}` : "commit —"}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-1 border border-border/70 bg-background/40 p-3">
              <p className="text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground">
                Effective summary
              </p>
              <p className="text-muted-foreground">
                Effective current members after this snapshot:{" "}
                {detail.snapshot.effectiveMemberCounts.currentCount}
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
