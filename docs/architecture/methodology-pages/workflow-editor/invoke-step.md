# Workflow Editor Invoke Step Dialog

This document defines the stable methodology Workflow Editor contract for the `invoke.v1` step dialog, aligned with the locked Epic 3 baseline in `docs/plans/2026-03-11-methodology-design-time-pages-tentative-design.md` section 6.7.

## Scope

- This is the design-time contract for `invoke.v1`.
- Invoke steps run a workflow in the current work unit or delegate to child work units.
- Parent-child communication in v1 is intentionally simplified.

## Contract goals

- Keep invoke selection typed and explicit.
- Support fixed, variable, and iterate workflow selection.
- Make child delegation visible without adding a dedicated IO mapping editor.
- Keep runtime behavior deterministic and constrained.

## Core contract

```ts
type InvokeStepConfigV1 = {
  stepConfigVersion: "invoke.v1";

  overview: {
    stepKey: string;
    stepName: string;
    title?: string;
    message?: string;
  };

  targetScope: "self" | "child";
  workflowSelectorMode: "fixed" | "variable" | "iterate";

  fixedWorkflow?: { workflowKey?: string; workflowId?: string };
  workflowRefVariable?: string;

  iterate?: {
    itemsVariable: string;
    itemAlias: string;
    itemWorkflowRefField?: string;
    itemChildWorkUnitTypeField?: string;
  };

  runMode: "sequential" | "parallel";
  parallelLimit?: number;
  waitForChildCompletion: boolean;
  errorPolicy: "fail" | "continue" | "pause";

  childWorkUnitType?: string;
  childActivationTransition?: string;
  childRefsOutputVariable?: string;

  guidance?: { human?: string; agent?: string };
};
```

## Runtime semantics

- `targetScope` selects in-place invoke (`self`) vs child delegation (`child`).
- `workflowSelectorMode` supports fixed, variable, and iterate selection.
- `iterate` supports `set<workflow_ref>` or `set<object>` collections.
- `runMode`, `parallelLimit`, and `errorPolicy` control execution strategy.
- In `child` mode, child refs are captured in `childRefsOutputVariable` for later use.

## Data communication policy

The approved v1 direction removes dedicated parent-child IO mapping from invoke authoring.

- Workflow-to-workflow communication uses facts and artifact slots.
- There is no dedicated `inputMapping` editor in `invoke.v1`.
- There is no schema-agnostic `output` capture mode in `invoke.v1`.

## Editor behavior

- The invoke dialog uses `Overview`, `Workflow Source`, `Execution`, `Output & Child Capture`, and `Guidance` tabs.
- Advanced variable and workflow selectors use stacked dialogs.
- Unsaved edits persist across tab switches until save or discard.

### Dialog wireframes

```text
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ EDIT STEP — INVOKE                                          ● Unsaved      [Cancel] [Save] │
│ Tabs: [Overview] [Workflow Source] [Execution] [Output & Child Capture] [Guidance]        │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ (tab content area)                                                                          │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ OVERVIEW                                                                   │
│ Step Key              [ run_brainstorming_invokes ]                        │
│ Step Name             [ Run Brainstorming Invokes ]                        │
│ Target Scope          [ self | child ]                                     │
│                                                                            │
│ Summary chips:                                                             │
│ [Selector: iterate] [Run: parallel] [On Error: continue]                  │
│ [Child Refs Capture: enabled]                                              │
└────────────────────────────────────────────────────────────────────────────┘
```

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ WORKFLOW SOURCE                                                            │
│ Selector Mode: ( ) fixed   ( ) variable   (●) iterate                      │
│                                                                            │
│ if fixed:                                                                  │
│   Fixed Workflow      [ Select workflow key/id ]                           │
│                                                                            │
│ if variable:                                                               │
│   Workflow Ref Var    [ context.selectedWorkflowRef ]                      │
│   (type: workflow_ref, cardinality: single)                                │
│                                                                            │
│ if iterate:                                                                │
│   Items Variable      [ context.selectedElicitationWorkflowRefs ]          │
│   Item Alias          [ wf ]                                               │
│   Item Ref Field      [ workflowRef ] (optional, for object items)         │
│   (items type: set<workflow_ref> or set<object with workflowRef>)          │
└────────────────────────────────────────────────────────────────────────────┘
```

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ EXECUTION                                                                  │
│ Run Mode               [ sequential | parallel ]                           │
│ Parallel Limit         [ 4 ]                                               │
│ Wait For Completion    [x]                                                 │
│ Error Policy           [ fail | continue | pause ]                         │
│                                                                            │
│ Child options (when Target Scope=child):                                   │
│ Child Work Unit Type   [ brainstorming ]                                   │
│ Child Activation       [ draft_to_ready ]                                  │
└────────────────────────────────────────────────────────────────────────────┘
```

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ OUTPUT & CHILD CAPTURE                                                     │
│ Child refs output variable (child mode):                                   │
│ [ context.invokedBrainstormingChildren ]                                   │
│                                                                            │
│ Data communication policy (v1):                                            │
│ - workflow-to-workflow communication is through facts + artifact slots     │
│ - no dedicated IO contract/mapping editor in invoke v1                     │
└────────────────────────────────────────────────────────────────────────────┘
```

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ GUIDANCE                                      ● Unsaved                      │
│ Human Guidance                                                           │
│ [ Use child delegation only when brainstorming is necessary ]            │
│                                                                          │
│ Agent Guidance                                                           │
│ [ Validate workflow-ref typing before invoke execution ]                 │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Deprecated legacy shape

The following older fields are not authoritative for Epic 3 implementation:

- `forEach`
- `workflowRef` as the only selection model
- `inputMapping`
- schema-agnostic `output` capture modes
- `onChildError`

Use the typed `targetScope`, `workflowSelectorMode`, `iterate`, and `childRefsOutputVariable` model above instead.
