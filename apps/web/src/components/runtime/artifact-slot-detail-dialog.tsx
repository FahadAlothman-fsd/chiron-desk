import { useState } from "react";
import type { GetArtifactSlotDetailOutput } from "@chiron/contracts/runtime/artifacts";
import { CheckIcon, CopyIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ArtifactSlotDetailDialogProps = {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly detail: GetArtifactSlotDetailOutput | null;
  readonly isLoading: boolean;
  readonly errorMessage: string | null;
};

function formatTimestamp(timestamp?: string | null): string {
  if (!timestamp) {
    return "—";
  }

  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return timestamp;
  }

  return parsed.toLocaleString();
}

function CopyValueButton(props: { value: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("h-7 border-border/70 bg-background/60 px-2 text-[0.65rem]", props.className)}
      aria-label={`Copy ${props.label}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(props.value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1200);
        } catch {
          // ignore clipboard failures; manual copy remains possible from visible text
        }
      }}
    >
      {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
    </Button>
  );
}

function renderLatestState(
  latestCurrent: NonNullable<
    GetArtifactSlotDetailOutput["currentArtifactInstance"]["files"][number]["latestCurrent"]
  >,
) {
  if (latestCurrent.status === "committed") {
    return (
      <div className="space-y-1 text-muted-foreground">
        <p className="font-medium text-foreground">Latest repo commit</p>
        <p>{latestCurrent.gitCommitTitle ?? "Untitled commit"}</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[0.68rem]">
            {latestCurrent.gitCommitHash ?? "hash unavailable"}
          </span>
          {latestCurrent.gitCommitHash ? (
            <CopyValueButton
              value={latestCurrent.gitCommitHash}
              label={`latest hash for ${latestCurrent.relativePath}`}
            />
          ) : null}
        </div>
        <p>{formatTimestamp(latestCurrent.gitCommitDate)}</p>
      </div>
    );
  }

  if (latestCurrent.status === "not_committed") {
    const flags = [
      latestCurrent.untracked ? "untracked" : null,
      latestCurrent.staged ? "staged" : null,
      latestCurrent.modified ? "modified" : null,
      latestCurrent.deleted ? "deleted" : null,
    ].filter((value): value is string => value !== null);

    return (
      <div className="space-y-1 text-muted-foreground">
        <p className="font-medium text-foreground">Latest repo state</p>
        <p>{flags.length > 0 ? flags.join(" · ") : "not committed"}</p>
      </div>
    );
  }

  if (latestCurrent.status === "missing") {
    return (
      <p className="text-muted-foreground">Latest repo state: file missing from working tree.</p>
    );
  }

  return (
    <p className="text-muted-foreground">
      Latest repo state unavailable{latestCurrent.message ? `: ${latestCurrent.message}` : "."}
    </p>
  );
}

export function ArtifactSlotDetailDialog({
  open,
  onOpenChange,
  detail,
  isLoading,
  errorMessage,
}: ArtifactSlotDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl rounded-none border border-border/80 bg-background">
        <DialogHeader>
          <DialogTitle>Artifact slot detail</DialogTitle>
          <DialogDescription>
            Review the current artifact instance and compare its recorded git metadata with the
            file’s latest repo state.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? <p className="text-sm text-muted-foreground">Loading slot detail…</p> : null}

        {errorMessage ? (
          <p className="border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}

        {!isLoading && detail ? (
          <div className="space-y-3 text-xs">
            <section className="space-y-1 border border-border/70 bg-background/40 p-3">
              <p className="text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground">
                Slot metadata
              </p>
              <p className="font-medium text-foreground">
                {detail.slotDefinition.slotName ?? detail.slotDefinition.slotKey} ·{" "}
                {detail.slotDefinition.artifactKind}
              </p>
              <p className="text-muted-foreground">{detail.slotDefinition.slotKey}</p>
            </section>

            <section className="space-y-1 border border-border/70 bg-background/40 p-3 text-muted-foreground">
              <p className="text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground">
                Current artifact instance
              </p>
              {detail.currentArtifactInstance.exists ? (
                <>
                  <p>
                    Artifact instance ID:{" "}
                    {detail.currentArtifactInstance.artifactInstanceId ?? "unknown"}
                  </p>
                  <p>Updated: {formatTimestamp(detail.currentArtifactInstance.updatedAt)}</p>
                  <p>Tracked files: {detail.currentArtifactInstance.fileCount}</p>
                </>
              ) : (
                <p>No current artifact instance.</p>
              )}
            </section>

            {detail.currentArtifactInstance.exists ? (
              <section className="space-y-2 border border-border/70 bg-background/40 p-3">
                <p className="text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground">
                  Files
                </p>
                {detail.currentArtifactInstance.files.map((member) => (
                  <div
                    key={member.filePath}
                    className="space-y-3 border border-border/70 bg-background/50 px-3 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground">
                          File path
                        </p>
                        <p className="break-all text-foreground">{member.filePath}</p>
                      </div>
                      <CopyValueButton
                        value={member.filePath}
                        label={`path for ${member.filePath}`}
                      />
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1 border border-border/60 bg-background/40 px-3 py-2">
                        <p className="text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground">
                          Recorded commit
                        </p>
                        <p className="font-medium text-foreground">
                          {member.gitCommitTitle ?? "Recorded commit unavailable"}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                          <span className="font-mono text-[0.68rem]">
                            {member.gitCommitHash ?? "hash unavailable"}
                          </span>
                          {member.gitCommitHash ? (
                            <CopyValueButton
                              value={member.gitCommitHash}
                              label={`recorded hash for ${member.filePath}`}
                            />
                          ) : null}
                        </div>
                        <p className="text-muted-foreground">
                          {formatTimestamp(member.gitCommitDate)}
                        </p>
                      </div>

                      <div className="space-y-1 border border-border/60 bg-background/40 px-3 py-2">
                        <p className="text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground">
                          Latest on file
                        </p>
                        {member.latestCurrent ? (
                          renderLatestState(member.latestCurrent)
                        ) : (
                          <p className="text-muted-foreground">Latest repo state unavailable.</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </section>
            ) : null}
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
