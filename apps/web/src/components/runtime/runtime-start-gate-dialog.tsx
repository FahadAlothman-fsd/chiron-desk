import type {
  RuntimeCondition,
  RuntimeConditionEvaluation,
  RuntimeConditionEvaluationTree,
  RuntimeConditionTree,
} from "@chiron/contracts/runtime/conditions";
import type { GetTransitionStartGateDetailsOutput } from "@chiron/contracts/runtime/work-units";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DetailCode,
  DetailLabel,
  DetailPrimary,
  ExecutionBadge,
} from "@/features/projects/execution-detail-visuals";
import { cn } from "@/lib/utils";

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

type StartGateWorkflow =
  GetTransitionStartGateDetailsOutput["launchability"]["availableWorkflows"][number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function isRuntimeConditionTree(value: unknown): value is RuntimeConditionTree {
  if (!isRecord(value)) {
    return false;
  }

  return (
    (value.mode === "all" || value.mode === "any") &&
    Array.isArray(value.conditions) &&
    Array.isArray(value.groups)
  );
}

function isRuntimeConditionEvaluationTree(value: unknown): value is RuntimeConditionEvaluationTree {
  if (!isRecord(value)) {
    return false;
  }

  return (
    (value.mode === "all" || value.mode === "any") &&
    typeof value.met === "boolean" &&
    Array.isArray(value.conditions) &&
    Array.isArray(value.groups)
  );
}

function formatConditionValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value === null) {
    return "null";
  }

  try {
    return JSON.stringify(value);
  } catch {
    return "[unrenderable value]";
  }
}

function describeRuntimeCondition(condition: RuntimeCondition): {
  kindLabel: string;
  operatorLabel: string;
  summary: string;
  detail: string;
} {
  const negationPrefix = condition.isNegated ? "not " : "";

  switch (condition.kind) {
    case "fact": {
      const path = condition.subFieldKey
        ? `${condition.factKey}.${condition.subFieldKey}`
        : condition.factKey;
      const operatorLabel = condition.operator === "equals" ? "equals" : `${negationPrefix}exists`;

      return {
        kindLabel: "Project fact",
        operatorLabel,
        summary:
          condition.operator === "equals"
            ? `${path} ${negationPrefix}equals ${formatConditionValue(condition.comparisonJson)}`
            : `${path} must ${negationPrefix}exist`,
        detail:
          condition.operator === "equals"
            ? "Checks a project fact value against the required comparison value."
            : "Checks whether the required project fact instance exists before launch.",
      };
    }

    case "work_unit_fact": {
      const path = condition.subFieldKey
        ? `${condition.factKey}.${condition.subFieldKey}`
        : condition.factKey;
      const operatorLabel = condition.operator === "equals" ? "equals" : `${negationPrefix}exists`;

      return {
        kindLabel: "Work-unit fact",
        operatorLabel,
        summary:
          condition.operator === "equals"
            ? `${path} ${negationPrefix}equals ${formatConditionValue(condition.comparisonJson)}`
            : `${path} must ${negationPrefix}exist`,
        detail:
          condition.operator === "equals"
            ? "Checks a work-unit fact value against the required comparison value."
            : "Checks whether the required work-unit fact instance exists before launch.",
      };
    }

    case "artifact": {
      return {
        kindLabel: "Artifact",
        operatorLabel: `${negationPrefix}${condition.operator}`,
        summary: `Artifact slot ${condition.slotKey} must be ${negationPrefix}${condition.operator}`,
        detail: "Checks artifact presence or freshness requirements before launch.",
      };
    }

    case "work_unit": {
      const minCount = condition.minCount ?? 1;
      const stateScope =
        condition.operator === "work_unit_instance_exists_in_state"
          ? ` in ${condition.stateKeys.join(", ")}`
          : "";

      return {
        kindLabel: "Project work unit",
        operatorLabel: `${negationPrefix}${condition.operator}`,
        summary: `${minCount}+ ${condition.workUnitTypeKey}${stateScope}`,
        detail:
          condition.operator === "work_unit_instance_exists_in_state"
            ? "Checks whether enough project work units of this type currently sit in one of the required states before launch."
            : "Checks whether enough project work units of this type currently exist before launch.",
      };
    }
  }
}

function getConditionTreeCounts(tree: RuntimeConditionTree): {
  conditions: number;
  groups: number;
} {
  return tree.groups.reduce(
    (counts, group) => {
      const nested = getConditionTreeCounts(group);
      return {
        conditions: counts.conditions + nested.conditions,
        groups: counts.groups + 1 + nested.groups,
      };
    },
    { conditions: tree.conditions.length, groups: 0 },
  );
}

function RuntimeConditionTreePanel({
  tree,
  evaluation,
  depth = 0,
}: {
  tree: RuntimeConditionTree;
  evaluation?: RuntimeConditionEvaluationTree;
  depth?: number;
}) {
  const counts = getConditionTreeCounts(tree);

  return (
    <div className={cn("space-y-3", depth > 0 ? "border-l border-border/60 pl-4" : undefined)}>
      <div className="space-y-2 border border-border/70 bg-background/40 p-3">
        <div className="flex flex-wrap gap-2">
          <ExecutionBadge
            label={`${tree.mode} gate`}
            tone={tree.mode === "all" ? "amber" : "sky"}
          />
          <ExecutionBadge label={`${counts.conditions} checks`} tone="slate" />
          {counts.groups > 0 ? (
            <ExecutionBadge label={`${counts.groups} groups`} tone="violet" />
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">
          {tree.mode === "all"
            ? "Every condition in this group must pass before the transition can launch."
            : "Any branch in this group can pass for the transition to become launchable."}
        </p>
      </div>

      {tree.conditions.length > 0 ? (
        <div className="space-y-2">
          {tree.conditions.map((condition, index) => {
            const detail = describeRuntimeCondition(condition);
            const conditionEvaluation = evaluation?.conditions[index] as
              | RuntimeConditionEvaluation
              | undefined;
            return (
              <div
                key={`${condition.kind}-${detail.summary}-${index}`}
                className="space-y-2 border border-border/70 bg-background/40 p-3"
              >
                <div className="flex flex-wrap gap-2">
                  <ExecutionBadge label={detail.kindLabel} tone="violet" />
                  <ExecutionBadge label={detail.operatorLabel} tone="slate" />
                  {condition.isNegated ? <ExecutionBadge label="negated" tone="rose" /> : null}
                  {conditionEvaluation ? (
                    <ExecutionBadge
                      label={conditionEvaluation.met ? "passed" : "blocked"}
                      tone={conditionEvaluation.met ? "emerald" : "rose"}
                    />
                  ) : null}
                </div>
                <DetailPrimary>{detail.summary}</DetailPrimary>
                <p className="text-sm text-muted-foreground">{detail.detail}</p>
                {conditionEvaluation ? (
                  <div className="space-y-1 border border-border/60 bg-background/60 px-3 py-2 text-xs">
                    <p className="uppercase tracking-[0.12em] text-muted-foreground">Evaluation</p>
                    <p className={conditionEvaluation.met ? "text-emerald-300" : "text-rose-300"}>
                      {conditionEvaluation.met
                        ? "This condition currently passes."
                        : (conditionEvaluation.reason ?? "This condition currently blocks launch.")}
                    </p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {tree.groups.length > 0 ? (
        <div className="space-y-3">
          {tree.groups.map((group, index) => (
            <RuntimeConditionTreePanel
              key={`${group.mode}-${index}`}
              tree={group}
              evaluation={evaluation?.groups[index]}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}

      {tree.conditions.length === 0 && tree.groups.length === 0 ? (
        <p className="border border-border/70 bg-background/40 p-3 text-sm text-muted-foreground">
          No conditions are configured in this gate group.
        </p>
      ) : null}
    </div>
  );
}

function WorkflowLaunchCombobox(props: {
  workflows: readonly StartGateWorkflow[];
  selectedWorkflowId: string;
  onSelect: (workflowId: string) => void;
  selectedWorkflow: StartGateWorkflow | null;
}) {
  const { workflows, selectedWorkflowId, onSelect, selectedWorkflow } = props;
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-label="Launch workflow"
              aria-expanded={open}
              disabled={workflows.length === 0}
              className="h-auto w-full justify-between rounded-none border-border/80 bg-background/80 px-3 py-2 font-normal text-foreground hover:bg-background/90"
            />
          }
        >
          <div className="flex min-w-0 flex-1 flex-col items-start text-left">
            <span className="truncate text-sm font-medium">
              {selectedWorkflow?.workflowName ?? "Select workflow"}
            </span>
            <span className="truncate text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground">
              {selectedWorkflow?.workflowKey ?? "Search by workflow name or key"}
            </span>
          </div>
          <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-60" />
        </PopoverTrigger>

        <PopoverContent
          className="w-[var(--anchor-width)] min-w-[24rem] rounded-none p-0"
          align="start"
          frame="cut-thin"
          tone="context"
          sideOffset={4}
        >
          <Command density="compact" frame="default" className="bg-[#0b0f12] text-foreground">
            <CommandInput density="compact" placeholder="Search workflows..." />
            <CommandList>
              <CommandEmpty>No workflows found.</CommandEmpty>
              <CommandGroup heading="Available workflows">
                {workflows.map((workflow) => (
                  <CommandItem
                    key={workflow.workflowId}
                    density="compact"
                    value={[
                      workflow.workflowName,
                      workflow.workflowKey,
                      workflow.workflowDescription,
                      workflow.workflowHumanGuidance,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onSelect={() => {
                      onSelect(workflow.workflowId);
                      setOpen(false);
                    }}
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-2">
                      <div className="grid min-w-0 flex-1 gap-1">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <span className="truncate font-medium">{workflow.workflowName}</span>
                          <ExecutionBadge
                            label={workflow.workflowKey}
                            tone="slate"
                            className="px-1.5 py-0.5"
                          />
                        </div>
                        {workflow.workflowDescription ? (
                          <span className="line-clamp-2 text-[0.72rem] text-muted-foreground">
                            {workflow.workflowDescription}
                          </span>
                        ) : null}
                        {workflow.workflowHumanGuidance ? (
                          <span className="line-clamp-2 text-[0.68rem] uppercase tracking-[0.08em] text-primary/80">
                            Guidance · {workflow.workflowHumanGuidance}
                          </span>
                        ) : null}
                      </div>
                      <CheckIcon
                        className={cn(
                          "mt-0.5 size-3.5 shrink-0",
                          selectedWorkflowId === workflow.workflowId ? "opacity-100" : "opacity-0",
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

      {selectedWorkflow ? (
        <div className="space-y-2 border border-border/70 bg-background/40 p-3">
          <DetailLabel>Selected workflow</DetailLabel>
          <DetailPrimary>{selectedWorkflow.workflowName}</DetailPrimary>
          <DetailCode>{selectedWorkflow.workflowKey}</DetailCode>
          {selectedWorkflow.workflowDescription ? (
            <p className="text-sm text-muted-foreground">{selectedWorkflow.workflowDescription}</p>
          ) : null}
          {selectedWorkflow.workflowHumanGuidance ? (
            <div className="space-y-1 border border-primary/20 bg-primary/8 px-3 py-2">
              <DetailLabel className="text-primary/80">Human guidance</DetailLabel>
              <p className="text-sm text-primary/90">{selectedWorkflow.workflowHumanGuidance}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

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

  const conditionTree =
    detail && isRuntimeConditionTree(detail.conditionTree) ? detail.conditionTree : null;
  const evaluationTree =
    detail && isRuntimeConditionEvaluationTree(detail.evaluationTree)
      ? detail.evaluationTree
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(92vh,60rem)] max-w-[min(92vw,64rem)] overflow-y-auto rounded-none border border-border/80 bg-background">
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
            <section className="space-y-2 border border-border/70 bg-background/40 p-3">
              <DetailLabel>Transition</DetailLabel>
              <DetailPrimary>
                {detail.transition.transitionName} ({detail.transition.transitionKey})
              </DetailPrimary>
              <div className="flex flex-wrap gap-2">
                <ExecutionBadge label={`source ${detail.workUnitContext.source}`} tone="slate" />
                <ExecutionBadge label={`target ${detail.transition.toStateKey}`} tone="sky" />
              </div>
            </section>

            <section className="space-y-2 border border-border/70 bg-background/40 p-3">
              <DetailLabel>Gate summary</DetailLabel>
              <div className="flex flex-wrap gap-2">
                <ExecutionBadge
                  label={detail.gateSummary.result}
                  tone={detail.gateSummary.result === "available" ? "emerald" : "rose"}
                />
                <ExecutionBadge
                  label={detail.launchability.canLaunch ? "launchable" : "not launchable"}
                  tone={detail.launchability.canLaunch ? "sky" : "amber"}
                />
              </div>
            </section>

            <section className="space-y-2 border border-border/70 bg-background/40 p-3">
              <DetailLabel>Launch workflow</DetailLabel>
              <WorkflowLaunchCombobox
                workflows={availableWorkflows}
                selectedWorkflowId={selectedWorkflowId}
                onSelect={setSelectedWorkflowId}
                selectedWorkflow={selectedWorkflow}
              />
            </section>

            <section className="space-y-2 border border-border/70 bg-background/40 p-3">
              <DetailLabel>Condition tree</DetailLabel>
              {conditionTree ? (
                <RuntimeConditionTreePanel
                  tree={conditionTree}
                  evaluation={evaluationTree ?? undefined}
                />
              ) : (
                <div className="space-y-2 border border-border/70 bg-background/40 p-3">
                  <p className="text-sm text-muted-foreground">
                    The condition set could not be rendered as a structured gate tree.
                  </p>
                  <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
                    {JSON.stringify(detail.conditionTree, null, 2)}
                  </pre>
                </div>
              )}
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
