# Workflow Editor Action Step Dialog

This document defines the stable methodology Workflow Editor contract for the `action.v1` step dialog, aligned with the locked Epic 3 baseline in `docs/plans/2026-03-11-methodology-design-time-pages-tentative-design.md` section 6.9.

## Scope

- This is the deterministic design-time contract for `action.v1`.
- Action steps perform bounded, non-chat mutations.
- The v1 lock intentionally keeps the action surface narrow.

## Contract goals

- Keep action execution deterministic and reviewable.
- Limit mutations to typed variable updates, artifact synchronization, and AX-backed generation.
- Make ordering, unlock rules, and approvals explicit.
- Avoid turning action steps into a general infrastructure automation DSL.

## Core contract

```ts
type ActionStepConfigV1 = {
  stepConfigVersion: "action.v1";

  overview: {
    stepKey: string;
    stepName: string;
    title?: string;
    message?: string;
  };

  runMode: "sequential" | "parallel";
  parallelLimit?: number;
  errorPolicy: "fail" | "continue";

  actions: ActionOp[];

  guidance?: {
    human?: string;
    agent?: string;
  };
};

type ActionOp = UpdateVariableOp | ArtifactSyncOp | AxGenerateOp;

type BaseActionOp = {
  actionId: string;
  label?: string;
  description?: string;
  requires?: string[];
  dependsOn?: string[];
  requiresApproval?: boolean;
  receiptAs?: string;
};

type UpdateVariableOp = BaseActionOp & {
  kind: "update-variable";
  operation: "set" | "append" | "merge" | "remove";
  targetVariable: string;
  valueFrom:
    | { mode: "literal"; value: unknown }
    | { mode: "variable"; variablePath: string };
};

type ArtifactSyncOp = BaseActionOp & {
  kind: "artifact-sync";
  operation: "sync";
  slotKey: string;
  syncMode: "template-upsert" | "fileset-sync" | "snapshot-refresh";
  sourceVariable?: string;
  changedPathsVariable?: string;
};

type AxGenerateOp = BaseActionOp & {
  kind: "ax-generate";
  signatureRef: { id: string; version?: string };
  inputBindings: Record<string, string>;
  outputTarget: string;
  reviewPolicy?: "single_pass" | "feedback_rerun";
  feedbackVariable?: string;
  maxReruns?: number;
};
```

## Runtime semantics

- Action steps are deterministic and non-chat.
- `requires` drives progressive unlock of actions.
- `dependsOn` defines explicit execution order; dependency cycles are validation errors.
- `runMode` controls sequential vs parallel execution.
- `errorPolicy` controls fail-fast vs continue-on-error behavior.
- `update-variable` may write only to declared `context.*`, `self.*`, or `project.*` targets.
- `artifact-sync` requires a valid pre-defined artifact slot.
- `ax-generate` is signature-driven and bounded.

## Editor behavior

- The action dialog uses `Overview`, `Actions`, `Execution`, and `Guidance` tabs.
- Action editing uses stacked dialogs:
  - Level 1: basics and kind
  - Level 2: kind-specific config
  - Level 3: guards (`requires`, `dependsOn`, approvals, receipts)
- Unsaved edits persist across tab switches until save or discard.

### Dialog wireframes

```text
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ EDIT STEP — ACTION                                       ● Unsaved         [Cancel] [Save] │
│ Tabs: [Overview] [Actions] [Execution] [Guidance]                                       │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ (tab content area)                                                                          │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ OVERVIEW                                                                   │
│ Step Key            [ persist_story_state ]                                │
│ Step Name           [ Persist Story State ]                                │
│                                                                            │
│ Summary chips:                                                             │
│ [Actions: 4] [Run: sequential] [Error: fail] [Approvals: 1]               │
└────────────────────────────────────────────────────────────────────────────┘
```

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ ACTIONS                                                                     │
│ [ + Add Action ]                                                            │
│                                                                              │
│ Action ID            Kind            Target/Slot              Unlock        │
│ set_status           update-variable self.facts.status        always        │
│ sync_story_doc       artifact-sync   slot: story_doc          needs status  │
│ gen_summary          ax-generate     context.storySummary     needs sync    │
│                                                                              │
│ [Edit] [Duplicate] [Delete] on each row                                     │
│                                                                              │
│ Edit/Add opens stacked dialog:                                               │
│ - Level 1: basics + kind                                                     │
│ - Level 2: kind-specific config                                              │
│ - Level 3: guards (requires/dependsOn/approval/receiptAs)                   │
└────────────────────────────────────────────────────────────────────────────┘
```

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ EXECUTION                                                                  │
│ Run Mode          [ sequential | parallel ]                                │
│ Parallel Limit    [ 3 ]                                                     │
│ Error Policy      [ fail | continue ]                                       │
│                                                                            │
│ Execution graph preview (dependsOn)                                        │
│ set_status -> sync_story_doc -> gen_summary                                │
└────────────────────────────────────────────────────────────────────────────┘
```

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ GUIDANCE                                                                   │
│ Human Guidance                                                              │
│ [ Keep mutations deterministic and review approvals before apply... ]       │
│                                                                            │
│ Agent Guidance                                                              │
│ [ Prefer update-variable + artifact-sync; use ax-generate when needed ]    │
└────────────────────────────────────────────────────────────────────────────┘
```

## Out of scope in `action.v1`

The following legacy action kinds are not part of the approved Epic 3 action-step lock:

- `git`
- `file`
- `directory`
- `env`
- `snapshot`
- broad shell-like automation categories

Those concerns may exist elsewhere in the system, but they are not the canonical design-time contract for `action.v1`.

## Deprecated legacy shape

The older action-step documents and prototypes exposed a broad automation DSL. For Epic 3, treat that shape as superseded by the narrower `ActionOp = UpdateVariableOp | ArtifactSyncOp | AxGenerateOp` contract above.
