import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LifecycleState = {
  key: string;
  displayName?: string;
  description?: string;
};

type TransitionConditionSet = {
  key: string;
  phase: "start" | "completion";
  mode: "all" | "any";
  guidance?: string;
};

type LifecycleTransition = {
  transitionKey: string;
  fromState?: string | null;
  toState: string;
  conditionSets?: TransitionConditionSet[];
};

type StateMachineTabProps = {
  states: readonly LifecycleState[];
  transitions: readonly LifecycleTransition[];
  conditionSets: readonly TransitionConditionSet[];
  onSaveStates?: (states: LifecycleState[]) => Promise<void>;
  onSaveTransitions?: (transitions: LifecycleTransition[]) => Promise<void>;
  onSaveConditionSets?: (
    transitionKey: string,
    conditionSets: TransitionConditionSet[],
  ) => Promise<void>;
};

type TransitionDraft = {
  transitionKey: string;
  fromState: string;
  toState: string;
  startConditionKey: string;
  completionConditionKey: string;
};

const emptyStateDraft: LifecycleState = {
  key: "",
  displayName: "",
  description: "",
};

const emptyTransitionDraft: TransitionDraft = {
  transitionKey: "",
  fromState: "",
  toState: "",
  startConditionKey: "",
  completionConditionKey: "",
};

export function StateMachineTab({
  states,
  transitions,
  conditionSets,
  onSaveStates,
  onSaveTransitions,
}: StateMachineTabProps) {
  const [statesDraft, setStatesDraft] = useState<LifecycleState[]>([]);
  const [transitionsDraft, setTransitionsDraft] = useState<LifecycleTransition[]>([]);
  const [stateDialogOpen, setStateDialogOpen] = useState(false);
  const [stateEditor, setStateEditor] = useState<LifecycleState>(emptyStateDraft);
  const [transitionDialogOpen, setTransitionDialogOpen] = useState(false);
  const [editingTransitionKey, setEditingTransitionKey] = useState<string | null>(null);
  const [transitionEditor, setTransitionEditor] = useState<TransitionDraft>(emptyTransitionDraft);
  const [transitionEditorTab, setTransitionEditorTab] = useState<"start" | "completion">("start");

  useEffect(() => {
    setStatesDraft(states.map((state) => ({ ...state })));
  }, [states]);

  useEffect(() => {
    const normalized = transitions.map((transition) => ({
      ...transition,
      conditionSets: transition.conditionSets ?? [],
    }));

    if (normalized.length > 0 && conditionSets.length > 0) {
      const firstTransition = normalized[0];
      if (firstTransition) {
        normalized[0] = {
          ...firstTransition,
          conditionSets: firstTransition.conditionSets?.length
            ? firstTransition.conditionSets
            : conditionSets.map((conditionSet) => ({ ...conditionSet })),
        };
      }
    }

    setTransitionsDraft(normalized);
  }, [conditionSets, transitions]);

  const transitionByKey = useMemo(
    () => new Map(transitionsDraft.map((transition) => [transition.transitionKey, transition])),
    [transitionsDraft],
  );

  const conditionLabel = (transition: LifecycleTransition, phase: "start" | "completion") => {
    const phaseSet = (transition.conditionSets ?? []).find((entry) => entry.phase === phase);
    return phaseSet?.key ?? "—";
  };

  const openCreateStateDialog = () => {
    setStateEditor(emptyStateDraft);
    setStateDialogOpen(true);
  };

  const saveCreatedState = async () => {
    const key = stateEditor.key.trim();
    if (!key) {
      return;
    }

    const nextState: LifecycleState = {
      key,
      ...(stateEditor.displayName?.trim() ? { displayName: stateEditor.displayName.trim() } : {}),
      ...(stateEditor.description?.trim() ? { description: stateEditor.description.trim() } : {}),
    };

    const nextStates = [...statesDraft, nextState];
    setStatesDraft(nextStates);
    await onSaveStates?.(nextStates);
    setStateDialogOpen(false);
  };

  const toTransitionDraft = (transition: LifecycleTransition): TransitionDraft => {
    const startSet = (transition.conditionSets ?? []).find((entry) => entry.phase === "start");
    const completionSet = (transition.conditionSets ?? []).find(
      (entry) => entry.phase === "completion",
    );
    return {
      transitionKey: transition.transitionKey,
      fromState: transition.fromState ?? "",
      toState: transition.toState,
      startConditionKey: startSet?.key ?? "",
      completionConditionKey: completionSet?.key ?? "",
    };
  };

  const openCreateTransitionDialog = () => {
    setEditingTransitionKey(null);
    setTransitionEditor({
      ...emptyTransitionDraft,
      fromState: statesDraft[0]?.key ?? "",
      toState: statesDraft[0]?.key ?? "",
    });
    setTransitionEditorTab("start");
    setTransitionDialogOpen(true);
  };

  const openEditTransitionDialog = (transition: LifecycleTransition) => {
    setEditingTransitionKey(transition.transitionKey);
    setTransitionEditor(toTransitionDraft(transition));
    setTransitionEditorTab("start");
    setTransitionDialogOpen(true);
  };

  const toConditionSets = (draft: TransitionDraft): TransitionConditionSet[] => [
    ...(draft.startConditionKey.trim()
      ? [
          {
            key: draft.startConditionKey.trim(),
            phase: "start" as const,
            mode: "all" as const,
            guidance: "",
          },
        ]
      : []),
    ...(draft.completionConditionKey.trim()
      ? [
          {
            key: draft.completionConditionKey.trim(),
            phase: "completion" as const,
            mode: "all" as const,
            guidance: "",
          },
        ]
      : []),
  ];

  const saveTransitionDialog = async () => {
    const transitionKey = transitionEditor.transitionKey.trim();
    const toState = transitionEditor.toState.trim();
    if (!transitionKey || !toState) {
      return;
    }

    const nextTransition: LifecycleTransition = {
      transitionKey,
      fromState: transitionEditor.fromState.trim() ? transitionEditor.fromState.trim() : null,
      toState,
      conditionSets: toConditionSets(transitionEditor),
    };

    const nextTransitions = editingTransitionKey
      ? transitionsDraft.map((transition) =>
          transition.transitionKey === editingTransitionKey ? nextTransition : transition,
        )
      : [...transitionsDraft, nextTransition];

    setTransitionsDraft(nextTransitions);
    await onSaveTransitions?.(nextTransitions);
    setTransitionDialogOpen(false);
  };

  const currentTransition = editingTransitionKey
    ? transitionByKey.get(editingTransitionKey)
    : undefined;

  return (
    <section className="grid gap-3">
      <div className="chiron-frame-flat p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
              Lifecycle Detail
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              CRUD surfaces for states, transitions, and transition condition sets.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-none"
              onClick={openCreateStateDialog}
            >
              + Add State
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-none"
              onClick={openCreateTransitionDialog}
            >
              + Add Transition
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
            {statesDraft.map((state) => (
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
              <th className="px-3 py-2 font-medium">Start Condition</th>
              <th className="px-3 py-2 font-medium">Completion Condition</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transitionsDraft.map((transition) => (
              <tr key={transition.transitionKey} className="border-b border-border/50">
                <td className="px-3 py-2">{transition.transitionKey}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {transition.fromState ?? "__absent__"}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{transition.toState}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {conditionLabel(transition, "start")}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {conditionLabel(transition, "completion")}
                </td>
                <td className="px-3 py-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-none"
                    aria-label="Edit Transition"
                    onClick={() => openEditTransitionDialog(transition)}
                  >
                    Edit
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={stateDialogOpen} onOpenChange={setStateDialogOpen}>
        <DialogContent className="rounded-none">
          <DialogHeader>
            <DialogTitle>Add State</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="state-key">State Key</Label>
            <Input
              id="state-key"
              value={stateEditor.key}
              onChange={(event) =>
                setStateEditor((previous) => ({ ...previous, key: event.target.value }))
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="state-display-name">Display Name</Label>
            <Input
              id="state-display-name"
              value={stateEditor.displayName ?? ""}
              onChange={(event) =>
                setStateEditor((previous) => ({ ...previous, displayName: event.target.value }))
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="state-description">Description</Label>
            <Input
              id="state-description"
              value={stateEditor.description ?? ""}
              onChange={(event) =>
                setStateEditor((previous) => ({ ...previous, description: event.target.value }))
              }
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-none"
              onClick={() => setStateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" className="rounded-none" onClick={() => void saveCreatedState()}>
              Create State
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={transitionDialogOpen} onOpenChange={setTransitionDialogOpen}>
        <DialogContent className="rounded-none">
          <DialogHeader>
            <DialogTitle>{editingTransitionKey ? "Edit Transition" : "Add Transition"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="transition-key">Transition Key</Label>
            <Input
              id="transition-key"
              value={transitionEditor.transitionKey}
              disabled={editingTransitionKey !== null}
              onChange={(event) =>
                setTransitionEditor((previous) => ({
                  ...previous,
                  transitionKey: event.target.value,
                }))
              }
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="transition-from-state">From State</Label>
            <Input
              id="transition-from-state"
              value={transitionEditor.fromState}
              onChange={(event) =>
                setTransitionEditor((previous) => ({ ...previous, fromState: event.target.value }))
              }
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="transition-to-state">To State</Label>
            <Input
              id="transition-to-state"
              value={transitionEditor.toState}
              onChange={(event) =>
                setTransitionEditor((previous) => ({ ...previous, toState: event.target.value }))
              }
            />
          </div>

          <div className="mb-2 flex gap-2 border-b border-border pb-2">
            <Button
              type="button"
              size="sm"
              variant={transitionEditorTab === "start" ? "default" : "outline"}
              className="rounded-none"
              onClick={() => setTransitionEditorTab("start")}
            >
              Start Conditions
            </Button>
            <Button
              type="button"
              size="sm"
              variant={transitionEditorTab === "completion" ? "default" : "outline"}
              className="rounded-none"
              onClick={() => setTransitionEditorTab("completion")}
            >
              Completion Conditions
            </Button>
          </div>

          {transitionEditorTab === "start" ? (
            <div className="grid gap-2">
              <Label htmlFor="transition-start-condition-key">Start Condition Key</Label>
              <Input
                id="transition-start-condition-key"
                value={transitionEditor.startConditionKey}
                onChange={(event) =>
                  setTransitionEditor((previous) => ({
                    ...previous,
                    startConditionKey: event.target.value,
                  }))
                }
              />
            </div>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="transition-completion-condition-key">Completion Condition Key</Label>
              <Input
                id="transition-completion-condition-key"
                value={transitionEditor.completionConditionKey}
                onChange={(event) =>
                  setTransitionEditor((previous) => ({
                    ...previous,
                    completionConditionKey: event.target.value,
                  }))
                }
              />
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-none"
              onClick={() => setTransitionDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-none"
              onClick={() => void saveTransitionDialog()}
            >
              {editingTransitionKey ? "Save Transition" : "Create Transition"}
            </Button>
          </DialogFooter>

          {currentTransition ? (
            <p className="sr-only">Editing {currentTransition.transitionKey}</p>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
