import type { WorkflowAgentStepPayload, WorkflowContextFactDefinitionItem } from "../types";

import { FieldDescription } from "../../../components/ui/field";

type CompletionRuntimePolicyTabProps = {
  values: WorkflowAgentStepPayload;
  contextFactsById: ReadonlyMap<string, WorkflowContextFactDefinitionItem>;
  onToggleCompletionRequirement: (contextFactDefinitionId: string, checked: boolean) => void;
  onSetBootstrapPromptNoReply: (value: boolean) => void;
};

export function CompletionRuntimePolicyTab({
  values,
  contextFactsById,
  onToggleCompletionRequirement,
  onSetBootstrapPromptNoReply,
}: CompletionRuntimePolicyTabProps) {
  const completionRequirements = new Set(
    values.completionRequirements.map((requirement) => requirement.contextFactDefinitionId),
  );

  return (
    <div className="grid gap-4">
      <div className="chiron-frame-flat grid gap-2 p-3">
        <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
          Completion Requirements
        </p>
        <FieldDescription>
          Completion facts must also be produced by this agent step. Runtime policy stays mostly
          locked for v1, except for whether the bootstrap prompt should begin generation
          immediately.
        </FieldDescription>
      </div>

      <div className="grid gap-2">
        {values.writeItems.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Add write scope cards before choosing completion requirements.
          </p>
        ) : (
          values.writeItems.map((item) => {
            const fact = contextFactsById.get(item.contextFactDefinitionId);
            const checked = completionRequirements.has(item.contextFactDefinitionId);

            return (
              <label
                key={item.writeItemId}
                className="chiron-frame-flat flex items-center justify-between gap-3 p-3 text-xs"
              >
                <div className="grid gap-0.5">
                  <span className="font-medium uppercase tracking-[0.12em]">
                    {fact?.label || fact?.key || item.contextFactDefinitionId}
                  </span>
                  <span className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                    {item.contextFactKind.replaceAll("_", " ")}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) =>
                    onToggleCompletionRequirement(
                      item.contextFactDefinitionId,
                      event.target.checked,
                    )
                  }
                />
              </label>
            );
          })
        )}
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <div className="chiron-frame-flat grid gap-1 p-3 text-xs">
          <span className="uppercase tracking-[0.14em] text-muted-foreground">Session start</span>
          <span className="font-medium uppercase tracking-[0.12em]">
            {values.runtimePolicy.sessionStart}
          </span>
        </div>
        <div className="chiron-frame-flat grid gap-1 p-3 text-xs">
          <span className="uppercase tracking-[0.14em] text-muted-foreground">
            Continuation mode
          </span>
          <span className="font-medium uppercase tracking-[0.12em]">
            {values.runtimePolicy.continuationMode}
          </span>
        </div>
        <div className="chiron-frame-flat grid gap-1 p-3 text-xs">
          <span className="uppercase tracking-[0.14em] text-muted-foreground">Live streams</span>
          <span className="font-medium uppercase tracking-[0.12em]">
            {values.runtimePolicy.liveStreamCount}
          </span>
        </div>
        <label className="chiron-frame-flat grid gap-2 p-3 text-xs">
          <span className="uppercase tracking-[0.14em] text-muted-foreground">
            Bootstrap reply behavior
          </span>
          <span className="font-medium uppercase tracking-[0.12em] text-foreground">
            Start generation from injected objective + instructions
          </span>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!values.runtimePolicy.bootstrapPromptNoReply}
              onChange={(event) => onSetBootstrapPromptNoReply(!event.target.checked)}
              className="size-4"
            />
            <span className="text-muted-foreground">
              When enabled, the bootstrap prompt does not set <code>noReply</code> and the agent may
              begin generating immediately.
            </span>
          </div>
        </label>
        <div className="chiron-frame-flat grid gap-1 p-3 text-xs">
          <span className="uppercase tracking-[0.14em] text-muted-foreground">
            Persisted writes
          </span>
          <span className="font-medium uppercase tracking-[0.12em]">
            {values.runtimePolicy.persistedWritePolicy}
          </span>
        </div>
      </div>
    </div>
  );
}
