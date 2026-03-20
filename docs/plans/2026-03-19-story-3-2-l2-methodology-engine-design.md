# Story 3.2 L2 Methodology-Engine Design

## Goal

Define and lock the backend architecture trajectory for Story 3.2 so Work Unit L2 tabs (`Overview`, `Facts`, `Workflows`, `State Machine`, `Artifact Slots`) are backed by coherent, work-unit-owned design-time services and APIs.

## Context Baseline (from Story 3.1)

- L1 boundary-first composition is active through:
  - `packages/methodology-engine/src/services/methodology-version-service.ts`
  - `packages/methodology-engine/src/layers/live.ts`
  - `packages/api/src/routers/methodology.ts`
- L2 scaffolds exist but are not implemented as live boundaries yet:
  - `packages/methodology-engine/src/services/work-unit-service.ts`
  - `packages/methodology-engine/src/services/workflow-service.ts`
  - `packages/methodology-engine/src/contracts/runtime-resolvers.ts`
- Current API still depends on compatibility-shaped version-root mutation paths for deep updates:
  - `updateDraftLifecycle`
  - `updateDraftWorkflows`

## Design Decision

1. Keep `methodology version` as publish/release aggregate root.
2. Make `work unit` the design-time owner for L2 internals:
   - work-unit facts,
   - work-unit workflows,
   - work-unit state machine (states/transitions/condition sets/bindings),
   - artifact slots.
3. Keep L1 narrow and stable:
   - version lifecycle + publication,
   - methodology-level facts/agents/dependency definitions,
   - shallow work-unit metadata only.
4. Enforce transactional integrity across L1→L2 calls:
   - L1 publish/clone orchestration must pass a shared transaction context into L2 mutation services.
5. Enforce L2 referential cleanup at schema level:
   - L2 child entities should cascade on parent work-unit/version deletion where appropriate.

## Proposed API Namespace (Story 3.2 target)

Under `methodology.version.workUnit.*`:

- `fact.{list,create,update,delete}`
- `workflow.{list,create,update,delete}`
- `stateMachine.state.{list,create,update,delete}`
- `stateMachine.transition.{list,create,update,delete}`
- `stateMachine.transition.conditionSet.{list,create,update,delete}`
- `stateMachine.transition.binding.{list,create,update,delete}`
- `artifactSlot.{list,create,update,delete}`
- `artifactSlot.template.{list,create,update,delete}`

## Locked L2 UX and behavior decisions (2026-03-19)

### Design-time fact table naming lock (added)

- Work-unit-scoped design-time facts use table name: `work_unit_fact_definitions`.
- This table is distinct from methodology-level `methodology_fact_definitions`.
- Story 3.2 backend slices must align schema/repository/contracts/router naming to this split.

### Page and tab shape

- L2 remains **one selected-work-unit page** with stable top-level tabs:
  - `Overview`
  - `Facts`
  - `Workflows`
  - `State Machine`
  - `Artifact Slots`
- `State Machine` includes **two inner tabs**:
  - `States`
  - `Transitions`

### Facts tab behavior

- Facts tab is **list/table-first** and aligns with methodology-facts interaction style.
- No row-expansion in this slice.
- CRUD remains dialog-first (`+ Add Fact`, `Edit`, `Delete`).
- L2-specific metadata can appear as extra columns without changing the base facts authoring model.

### Workflows and binding ownership

- Workflows tab owns workflow definition CRUD and routing to workflow editor.
- Transition/workflow bindings are authored in State Machine transition editing, not in Workflows tab.
- Workflows tab may show read-only "bound transitions" visibility in row/details context.

### Artifact Slots behavior

- Artifact Slots remains slot-first (table/list).
- Templates are edited **inside Slot Details dialog** as a nested templates table.
- No separate Templates page/tab in Story 3.2 baseline.

### Frozen artifact-slot schema baseline (approved)

- Slot fields:
  - `key`, `displayName`, `descriptionJson`, `guidanceJson`, `cardinality (single|fileset)`, optional `rulesJson`
- Template fields:
  - `slotDefinitionId`, `key`, `displayName`, `descriptionJson`, `guidanceJson`, `content`
- Explicit v1 exclusions:
  - `purpose`, `allowedNamespacesJson`, `defaultContentJson`, separate persisted `variables`
- Variable namespace enforcement comes from shared variable-target rules, not template-row metadata.

### State deletion and transition impact policy (locked)

- Deleting a state is **warn, not block**.
- Confirmation dialog must list impacted transitions explicitly before confirm.
- Primary non-destructive option is **disconnect** impacted transitions from deleted state endpoint(s)
  (`fromState`/`toState` becomes null where applicable).
- Optional cleanup option may delete impacted transitions as an explicit operator choice.
- If user triggers delete from transition context, the same impact disclosure still applies where dependent
  references would be affected.

### Unbound transition behavior (locked)

- A transition with no workflow binding is treated as **warning** severity.
- Transitions list shows an `Unbound` badge.
- Inline quick-fix `Bind workflow` opens the full Transition dialog directly on workflow-binding tab.

## Gap Matrix (required vs current)

| Domain | Required by Story 3.2 | Current state | Gap to close |
|---|---|---|---|
| Work-unit facts | L2 CRUD in selected work-unit context | `packages/contracts/src/methodology/fact.ts` is methodology-level; router lacks nested work-unit fact ops | Add work-unit fact contracts + nested router/service methods |
| Workflows | L2 workflow CRUD + list in work-unit context | Workflow persistence exists, but router/service ownership remains version-root compatibility path | Add explicit `workUnit.workflow.*` router + service ownership |
| State machine | State/transition authoring and gate-policy operations + warned cleanup on state deletion | Current model requires `toState` (`Schema.NonEmptyString` + DB `to_state_id.notNull`) and uses cascade FK delete behavior | Add `workUnit.stateMachine.*` contracts + router + services; introduce explicit delete-state impact handling and disconnect/delete options |
| Artifact slots | Slot + template CRUD powering Artifact Slots tab | No dedicated contracts/tables/services | Introduce artifact-slot schema/contracts/services/router |

## Service and File Plan (Story 3.2)

### A) Services and layer composition

**Create**
- `packages/methodology-engine/src/services/work-unit-fact-service.ts`
- `packages/methodology-engine/src/services/work-unit-state-machine-service.ts`
- `packages/methodology-engine/src/services/work-unit-artifact-slot-service.ts`

**Update**
- `packages/methodology-engine/src/services/work-unit-service.ts`
- `packages/methodology-engine/src/services/workflow-service.ts`
- `packages/methodology-engine/src/layers/live.ts`
- `packages/methodology-engine/src/index.ts`

### B) Contracts

**Create**
- `packages/contracts/src/methodology/artifact-slot.ts`

**Update**
- `packages/contracts/src/methodology/fact.ts` (work-unit-scoped variants)
- `packages/contracts/src/methodology/lifecycle.ts` (state-machine scoped inputs, including transition cleanup intent for state deletion)
- `packages/contracts/src/methodology/index.ts`

### C) API router

**Update**
- `packages/api/src/routers/methodology.ts`
  - add nested `methodology.version.workUnit.*` L2 procedures
  - keep compatibility aliases during transition until web migration is complete
  - mark compatibility-shaped `updateDraftLifecycle` / `updateDraftWorkflows` paths as transitional for L2-owned domains

### D) Persistence

**Update**
- `packages/db/src/schema/methodology.ts`
  - add artifact-slot definitions/templates tables
  - update lifecycle transition nullability/cleanup semantics only where required by state-delete disconnect option
- `packages/db/src/methodology-repository.ts`
  - add repository operations for L2 domains
- `packages/methodology-engine/src/ports/methodology-tx.ts`
  - ensure L2 services run within shared transaction context during L1 orchestrations

## Suggested Execution Slices

### Slice 1 (low-risk foundation)

1. Add artifact-slot contracts + schema + repository methods.
2. Add artifact-slot service and nested API procedures.
3. Add targeted tests for artifact-slot CRUD paths.

### Slice 2 (state machine + workflow ownership)

1. Introduce state-machine nested contracts and service methods.
2. Add `workUnit.workflow.*` and `workUnit.stateMachine.*` nested router paths.
3. Move web L2 tabs to nested paths while keeping compatibility reads.

## Verification Targets for Story 3.2 backend slices

- `bun run --cwd packages/methodology-engine test -- src/tests/l1/*.test.ts src/tests/l2-l3/*.test.ts`
- `bun run --cwd packages/api test -- src/tests/routers/methodology.test.ts`
- `bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units*.integration.test.tsx'`
- `bun run check`

## Risk Notes

- Risk: leaking deep L2 writes back into L1 boundaries.
  - Mitigation: treat `methodology-version-service.ts` as L1-only facade; add characterization tests for forbidden deep mutation ownership.
- Risk: API breakage for existing shallow callers.
  - Mitigation: maintain compatibility aliases while migrating web tabs progressively.
- Risk: schema churn for artifact slots.
  - Mitigation: isolate artifact-slot tables and avoid coupling to runtime execution tables in Story 3.2.
- Risk: partial writes when L1 operations invoke multiple L2 service mutations.
  - Mitigation: use shared `MethodologyTx` boundary so L1→L2 orchestration runs atomically.
- Risk: orphaned L2 children after work-unit structural deletes.
  - Mitigation: apply FK cascade semantics on L2 child tables scoped to work units/versions.
