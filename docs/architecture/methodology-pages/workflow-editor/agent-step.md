# Workflow Editor Agent Step Dialog

This document defines the stable methodology Workflow Editor contract for the `agent.v1` step dialog, aligned with the locked Epic 3 baseline in `docs/plans/2026-03-11-methodology-design-time-pages-tentative-design.md` sections 6.5 and 6.6.

## Scope

- This is the design-time contract for `agent.v1`.
- It defines the step-specific agent configuration surface used by the Workflow Editor.
- It does not redefine generic workflow-step shell metadata or runtime provider catalogs.

## Contract goals

- Keep agent-step configuration typed, explicit, and versioned.
- Separate read-only context access from action discovery and action execution.
- Make progressive unlock rules deterministic and visible.
- Keep writes bounded to declared targets only.

## Core contract

```ts
type AgentStepConfigV1 = {
  stepConfigVersion: "agent.v1";

  harness: "chiron" | "opencode";

  agent: {
    id: string;
    source?: "methodology" | "project" | "system" | "builtin";
    modelOverride?: { provider: string; model: string };
  };

  instructions: {
    stepInstructions: string;
    instructionPlacement?: "system_merge" | "message";
  };

  tools: {
    context: ContextToolPolicy;
    actions: ActionsToolPolicy;
    action: ActionToolPolicy;
  };

  completion: {
    conditions: Array<"agent-done" | "all-tools-approved" | "all-variables-set" | "manual">;
  };

  harnessConfig?: Record<string, unknown>;
  guidance?: { human?: string; agent?: string };
};

type ContextToolPolicy = {
  enabled: boolean;
  allowedSelectors: Array<
    | "project.facts"
    | "self.facts"
    | "project.workUnits"
    | "project.workUnitFacts"
    | "artifact.snapshots"
  >;
  selectorParams?: {
    projectFactKeys?: string[];
    selfFactKeys?: string[];
    workUnitKeys?: string[];
    workUnitFactKeysByWorkUnit?: Record<string, string[]>;
    artifactSlots?: string[];
    latestOnly?: boolean;
    includePaths?: boolean;
    includeMetadata?: boolean;
  };
  maxPayloadBytes?: number;
};

type ActionsToolPolicy = {
  enabled: boolean;
  catalog: StepActionDefinition[];
};

type ActionToolPolicy = {
  enabled: boolean;
  enforceAllowList: true;
  dryRunSupported?: boolean;
};

type StepActionDefinition =
  | UpdateVariableAction
  | AxGenerationAction
  | ArtifactSyncAction;

type ActionAvailability = {
  usageMode: "single_use" | "multi_use";
  onConsume: "remove_from_catalog" | "keep_visible";
  rerunPolicy: "forbid" | "require_user_approval" | "allow";
};

type UpdateVariableAction = {
  actionId: string;
  kind: "update-variable";
  label?: string;
  description?: string;
  targetVariable: string;
  valueFrom?:
    | { mode: "literal"; value: unknown }
    | { mode: "variable"; variablePath: string };
  requiredVariables?: string[];
  availability?: ActionAvailability;
  requiresApproval?: boolean;
};

type AxGenerationAction = {
  actionId: string;
  kind: "ax-generation";
  label?: string;
  description?: string;
  axSignatureRef: { id: string; version?: string };
  targetVariable: string;
  requiredVariables?: string[];
  availability?: ActionAvailability;
  requiresApproval?: boolean;
};

type ArtifactSyncAction = {
  actionId: string;
  kind: "artifact-sync";
  label?: string;
  description?: string;
  slotKey: string;
  syncMode: "template-upsert" | "fileset-sync" | "snapshot-refresh";
  sourceVariable?: string;
  resultVariable?: string;
  requiredVariables?: string[];
  availability?: ActionAvailability;
  requiresApproval?: boolean;
};
```

## Runtime semantics

### Instructions

- `stepInstructions` is the step-authored instruction block.
- `instructionPlacement` defaults to `system_merge`.
- `step_objectives` is implicitly injected when present in template context.
- Variable insertion follows the methodology prompt authoring model, not free-form unresolved placeholders.

### Three-tool model

- `context` is read-only scoped visibility for this step only.
- `actions` is the read-only catalog of step actions, including progressive unlock state.
- `action` executes one allow-listed catalog entry.

### Progressive unlock and write scope

- Action availability is controlled by `requiredVariables`.
- `single_use` actions can be removed after consumption; `multi_use` actions remain callable.
- Writes are limited to the declared target of the selected step action.
- Writes outside the allow-listed target set are rejected.

### Completion

- `agent-done` completes when the agent signals completion.
- `all-tools-approved` completes when required approval-gated actions are approved.
- `all-variables-set` completes when required targets are populated.
- `manual` requires explicit user completion.

## Expected editor behavior

- Agent-step authoring uses these tabs: `Overview`, `Instructions`, `Context Access`, `Actions Catalog`, `Completion & Guidance`.
- Unsaved changes persist across tab switches.
- Dirty-state indication remains visible until save or explicit discard.
- Advanced selector and action editing flows use stacked dialogs.

### Dialog wireframes

```text
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ EDIT STEP — AGENT                                         ● Unsaved        [Cancel] [Save] │
│ Tabs: [Overview] [Instructions] [Context Access] [Actions Catalog] [Completion & Guidance] │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ (tab content area)                                                                          │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ OVERVIEW                                                                   │
│ Step Key            [ conduct_session ]                                    │
│ Step Name           [ Conduct Session ]                                    │
│ Harness             [ chiron | opencode ]                                  │
│ Agent Source        [ methodology | project | system | builtin ]           │
│ Agent               [ mimir_analyst ]                                      │
│ Model Override      [ off | provider/model ]                               │
│                                                                            │
│ Summary chips: [Context Selectors: 3] [Actions: 4] [Locked: 2]            │
└────────────────────────────────────────────────────────────────────────────┘
```

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ INSTRUCTIONS                                                               │
│ Placement          [ system_merge | message ]                              │
│                                                                            │
│ Step Instructions                                                           │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ Analyze session and capture structured outputs...                     │ │
│ │ Use {{step_objectives}} when present in template context.             │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│ [Insert Variable] [Preview Rendered]                                      │
└────────────────────────────────────────────────────────────────────────────┘
```

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ CONTEXT ACCESS                                                             │
│ [ + Add Selector ]                                                         │
│                                                                            │
│ • project.facts            (projectType, projectRootPath)                 │
│ • self.facts               (intakeMode)                                   │
│ • artifact.snapshots       (slot: brief_notes, latestOnly=true)           │
│                                                                            │
│ Limits: maxPayloadBytes [ 120000 ]                                         │
│ Options: [includePaths] [includeMetadata]                                  │
└────────────────────────────────────────────────────────────────────────────┘
```

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ ACTIONS CATALOG                                                            │
│ [ + Add Action ]                                                           │
│                                                                            │
│ Action ID            Kind             Target Variable      Unlock   Usage    │
│ set_topic            update-variable  self.facts.topic     always   once     │
│ set_goals            update-variable  context.statedGoals  needs topic once  │
│ generate_options     ax-generation    context.options      needs goals multi │
│ sync_artifacts       artifact-sync    self/artifact slot   always   multi     │
│                                                                            │
│ Execution Policy                                                           │
│ enforceAllowList: [on]   dryRunSupported: [off]                            │
└────────────────────────────────────────────────────────────────────────────┘
```

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ COMPLETION & GUIDANCE                                                      │
│ Completion Conditions                                                      │
│ [x] all-variables-set   [x] agent-done   [ ] manual                        │
│                                                                            │
│ Human Guidance                                                              │
│ [ Keep brainstorming flow disciplined and explicit... ]                    │
│                                                                            │
│ Agent Guidance                                                              │
│ [ Use context/actions/action tools in that order... ]                      │
└────────────────────────────────────────────────────────────────────────────┘
```

## Deprecated legacy shape

The following older fields are no longer authoritative for Epic 3 implementation and should not be reused in new stories or code:

- `agentKind`
- `agentId`
- generic `tools[]`
- `editableVariables[]`
- flat `completionConditions[]` outside the `completion` object
- proposal-only session attachment behavior in the previous revision of this document

When older docs or prototypes reference those fields, treat them as superseded by `agent.v1` above.
