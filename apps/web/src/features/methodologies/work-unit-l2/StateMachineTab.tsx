import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type LifecycleState = {
  key: string;
  displayName?: string;
  description?: string;
};

type LifecycleTransition = {
  transitionKey: string;
  fromState?: string | null;
  toState: string;
};

type TransitionConditionSet = {
  key: string;
  phase: "start" | "completion";
  mode: "all" | "any";
  guidance?: string;
};

type StateMachineTabProps = {
  states: readonly LifecycleState[];
  transitions: readonly LifecycleTransition[];
  conditionSets: readonly TransitionConditionSet[];
  onSaveStates?: () => Promise<void>;
  onSaveTransitions?: () => Promise<void>;
  onSaveConditionSets?: () => Promise<void>;
};

export function StateMachineTab({
  states,
  transitions,
  conditionSets,
  onSaveStates,
  onSaveTransitions,
  onSaveConditionSets,
}: StateMachineTabProps) {
  const [conditionSetsOpen, setConditionSetsOpen] = useState(false);

  return (
    <section className="grid gap-3">
      <div className="chiron-frame-flat p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
              Lifecycle Detail
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Lifecycle states and transitions with condition-set editing.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="rounded-none" onClick={() => void onSaveStates?.()}>
              Save States
            </Button>
            <Button
              type="button"
              className="rounded-none"
              onClick={() => void onSaveTransitions?.()}
            >
              Save Transitions
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-none"
              onClick={() => setConditionSetsOpen(true)}
            >
              Edit Condition Sets
            </Button>
          </div>
        </div>
      </div>

      <div className="chiron-frame-flat overflow-hidden">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border/70 bg-background/50 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <th className="px-3 py-2 font-medium">State</th>
              <th className="px-3 py-2 font-medium">Description</th>
            </tr>
          </thead>
          <tbody>
            {states.map((state) => (
              <tr key={state.key} className="border-b border-border/50">
                <td className="px-3 py-2">{state.displayName ?? state.key}</td>
                <td className="px-3 py-2 text-muted-foreground">{state.description ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="chiron-frame-flat overflow-hidden">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border/70 bg-background/50 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <th className="px-3 py-2 font-medium">Transition</th>
              <th className="px-3 py-2 font-medium">From</th>
              <th className="px-3 py-2 font-medium">To</th>
            </tr>
          </thead>
          <tbody>
            {transitions.map((transition) => (
              <tr key={transition.transitionKey} className="border-b border-border/50">
                <td className="px-3 py-2">{transition.transitionKey}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {transition.fromState ?? "__absent__"}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{transition.toState}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={conditionSetsOpen} onOpenChange={setConditionSetsOpen}>
        <DialogContent className="rounded-none">
          <DialogHeader>
            <DialogTitle>Transition Condition Sets</DialogTitle>
          </DialogHeader>

          <div className="space-y-2 text-sm">
            {conditionSets.length === 0 ? (
              <p className="text-muted-foreground">No condition sets defined.</p>
            ) : null}
            {conditionSets.map((conditionSet) => (
              <div key={conditionSet.key} className="rounded-none border border-border/70 p-2">
                <p className="font-medium">{conditionSet.key}</p>
                <p className="text-xs text-muted-foreground">
                  {conditionSet.phase} · {conditionSet.mode}
                </p>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-none"
              onClick={() => setConditionSetsOpen(false)}
            >
              Close
            </Button>
            <Button
              type="button"
              className="rounded-none"
              onClick={() => void onSaveConditionSets?.()}
            >
              Save Condition Sets
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
