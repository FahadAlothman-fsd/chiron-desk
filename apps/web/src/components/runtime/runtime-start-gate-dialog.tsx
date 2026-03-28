import type { GetTransitionStartGateDetailsOutput } from "@chiron/contracts/runtime/work-units";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type RuntimeStartGateDialogProps = {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly detail: GetTransitionStartGateDetailsOutput | null;
  readonly isLoading: boolean;
  readonly errorMessage: string | null;
  readonly onLaunch: (workflow: {
    workflowId: string;
    workflowKey?: string;
    workflowName?: string;
  }) => void;
  readonly isLaunching: boolean;
  readonly launchLabel: string;
};

export function RuntimeStartGateDialog({
  open,
  onOpenChange,
  detail,
  isLoading,
  errorMessage,
  onLaunch,
  isLaunching,
  launchLabel,
}: RuntimeStartGateDialogProps) {
  const availableWorkflows = detail?.launchability.availableWorkflows ?? [];
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>("");

  useEffect(() => {
    if (!open) {
      setSelectedWorkflowId("");
      return;
    }

    const firstWorkflowId = availableWorkflows[0]?.workflowId ?? "";
    setSelectedWorkflowId(firstWorkflowId);
  }, [availableWorkflows, open]);

  const selectedWorkflow = useMemo(
    () => availableWorkflows.find((workflow) => workflow.workflowId === selectedWorkflowId) ?? null,
    [availableWorkflows, selectedWorkflowId],
  );

  const canLaunch =
    detail?.launchability.canLaunch === true &&
    detail.gateSummary.result === "available" &&
    selectedWorkflow !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-none border border-border/80 bg-background">
        <DialogHeader>
          <DialogTitle>Start-gate drill-in</DialogTitle>
          <DialogDescription>
            Inspect the current start gate and launch the selected transition workflow.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading start-gate details…</p>
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
                Transition
              </p>
              <p className="font-medium">
                {detail.transition.transitionName} ({detail.transition.transitionKey})
              </p>
              <p className="text-muted-foreground">
                source: {detail.workUnitContext.source} · target: {detail.transition.toStateKey}
              </p>
            </section>

            <section className="space-y-1 border border-border/70 bg-background/40 p-3">
              <p className="text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground">
                Gate summary
              </p>
              <p
                className={
                  detail.gateSummary.result === "available"
                    ? "font-medium text-primary"
                    : "font-medium text-destructive"
                }
              >
                {detail.gateSummary.result}
              </p>
            </section>

            <section className="space-y-2 border border-border/70 bg-background/40 p-3">
              <p className="text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground">
                Launch workflow
              </p>
              <select
                value={selectedWorkflowId}
                onChange={(event) => setSelectedWorkflowId(event.target.value)}
                className="w-full border border-border/70 bg-background px-2 py-2 text-xs"
                disabled={availableWorkflows.length === 0}
              >
                {availableWorkflows.length === 0 ? (
                  <option value="">No workflows available</option>
                ) : (
                  availableWorkflows.map((workflow) => (
                    <option key={workflow.workflowId} value={workflow.workflowId}>
                      {workflow.workflowName} ({workflow.workflowKey})
                    </option>
                  ))
                )}
              </select>
            </section>

            <section className="space-y-1 border border-border/70 bg-background/40 p-3">
              <p className="text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground">
                Condition tree
              </p>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
                {JSON.stringify(detail.conditionTree, null, 2)}
              </pre>
            </section>
          </div>
        ) : null}

        <DialogFooter>
          <Button
            variant="outline"
            className="rounded-none uppercase tracking-[0.12em]"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            className="rounded-none uppercase tracking-[0.12em]"
            disabled={!canLaunch || isLaunching}
            onClick={() => {
              if (!selectedWorkflow) {
                return;
              }

              onLaunch({
                workflowId: selectedWorkflow.workflowId,
                workflowKey: selectedWorkflow.workflowKey,
                workflowName: selectedWorkflow.workflowName,
              });
            }}
          >
            {isLaunching ? "Launching…" : launchLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
