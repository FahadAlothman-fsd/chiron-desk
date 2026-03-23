# Finish L2 Artifact Slots

## TL;DR
> **Summary**: Replace the placeholder artifact-slot surface with a full id-first CRUD workflow for slots and nested templates, using `Handlebars + Monaco` for markdown template authoring and the existing replace-based persistence seam for saves.
> **Deliverables**:
> - id-first contracts/API/repository flow for artifact slots and nested templates
> - full `ArtifactSlotsTab` slot/template CRUD with dirty/discard protection and stacked dialogs
> - `@chiron/template-engine` phase-1 Handlebars render seam for artifact templates
> - Monaco-based template content authoring with predefined variable insertion and no preview
> - updated route/repository/API/web tests plus design-doc sync
> **Effort**: XL
> **Parallel**: YES - 2 waves
> **Critical Path**: 1 -> 2 -> 4 -> 6 -> 7 -> 8 -> 9 -> 10

## Context
### Original Request
- Finish `apps/web/src/features/methodologies/work-unit-l2/ArtifactSlotsTab.tsx` so the Artifact Slots tab is no longer read-only and matches the CRUD interaction quality of the other L2 dialogs.
- Include slot CRUD, nested template CRUD, dirty `*` tab indicators, proper dialog stacking, and end-to-end persistence into `methodology_artifact_slot_definitions` and `methodology_artifact_slot_templates`.
- Expand template authoring to markdown-only executable templates with variable support for methodology facts, current work-unit facts, and methodology work units.

### Interview Summary
- Phase 1 output is markdown-only.
- Template authoring/runtime pairing is locked to `Handlebars + Monaco`.
- `Plate` is explicitly out for phase 1 because canonical content must remain executable markdown template source.
- `IDs everywhere` is the identity rule: slot/template ids are the true identity across payloads, UI state, editing flows, and persistence boundaries.
- Slot/template `key` stays in the model, but only as editable secondary metadata.
- Phase 1 excludes rendered preview; scope stops at author/edit/save/persist plus runtime-ready content.
- Tests are `tests-after`, but every task still ends with automated verification in the same slice.

### Metis Review (gaps addressed)
- Treat id-first identity as an end-to-end contract problem, not a UI-only change.
- Keep bulk replace as the persistence seam unless contract expansion is explicitly justified.
- Reuse sibling L2 dialog patterns instead of inventing a new modal lifecycle.
- Avoid preview/runtime drift by keeping template source canonical and preview out of scope.
- Verify id round-trip, discard semantics, duplicate key handling, and markdown content round-trip explicitly.

## Work Objectives
### Core Objective
- Deliver a decision-complete, runtime-ready artifact-slot authoring surface where slots and nested templates can be created, edited, deleted, persisted, and reloaded by stable ids rather than key-derived identity.

### Deliverables
- `packages/contracts/src/methodology/artifact-slot.ts` updated for id-first slot/template payloads.
- `packages/api/src/routers/methodology.ts` updated so artifact-slot list/replace procedures expose and accept ids consistently.
- `packages/db/src/methodology-repository.ts` and `packages/db/src/tests/repository/methodology-repository.integration.test.ts` updated for id round-trip behavior.
- `packages/template-engine/src/index.ts` plus tests implementing phase-1 Handlebars render support for artifact templates.
- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx` adapted to id-first artifact-slot state and mutation plumbing.
- `apps/web/src/features/methodologies/work-unit-l2/ArtifactSlotsTab.tsx` rebuilt into full slot/template CRUD with stacked dialogs.
- `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx` expanded to cover the new flows.
- `docs/architecture/methodology-pages/artifact-slots-design-time.md` updated to reflect id-first identity, Handlebars+Monaco, and no-preview scope.

### Definition of Done (verifiable conditions with commands)
- `bun test apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx` passes with artifact-slot CRUD, discard, and id-round-trip coverage.
- `bun test packages/db/src/tests/repository/methodology-repository.integration.test.ts` passes with artifact-slot id round-trip coverage.
- `bun test packages/api/src/tests/routers/methodology.test.ts` passes with artifact-slot list/replace id coverage.
- `bun test packages/template-engine/src/index.test.ts` passes with strict-mode Handlebars helper coverage.
- Artifact-slot authoring can create a slot and nested template, save through replace, reload, and update the same entities by id rather than duplicating them.

### Must Have
- Id-first slot/template identity across contract, API, route state, and UI draft state.
- Editable secondary `key` metadata for slots/templates without using `key` as the real identity.
- Full slot CRUD and nested template CRUD in stacked dialogs.
- Dirty indicators on `Contract`, `Guidance`, `Templates`, and template `Content` tabs when applicable.
- Discard protection for parent and child dialogs.
- Monaco-based Handlebars markdown authoring with predefined variable insertion and no preview.
- Existing replace mutation remains the persistence write path.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- No Plate, Slate JSON, or rich-text canonical storage.
- No rendered preview in phase 1.
- No fine-grained slot/template CRUD endpoints unless explicitly re-scoped.
- No reusable nested-dialog framework extraction from this tab.
- No template publishing/versioning/library management.
- No key-based entity identity in any new code path.

## Verification Strategy
> ZERO HUMAN INTERVENTION — all verification is agent-executed.
- Test decision: `tests-after` using targeted route integration, API router, repository integration, and new template-engine unit tests.
- QA policy: Every task includes one happy-path and one failure/edge-path scenario.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: identity/runtime/doc foundations (`contracts`, `api`, `db`, `template-engine`, `docs`)
Wave 2: route + UI + integration verification (`route adapters`, `slot dialog`, `template dialog`, `Monaco`, `web tests`)

### Dependency Matrix (full, all tasks)
- 1 blocks 2, 4, 6, 7, 8, 9, 10
- 2 blocks 4, 6, 7, 8, 9, 10
- 3 blocks 9
- 4 blocks 6, 7, 8, 9, 10
- 5 is independent after 1 and 2
- 6 blocks 7, 8, 9, 10
- 7 blocks 8, 9, 10
- 8 blocks 9, 10
- 9 blocks 10
- 10 blocks final verification only

### Agent Dispatch Summary (wave -> task count -> categories)
- Wave 1 -> 5 tasks -> `quick`, `unspecified-high`, `deep`, `writing`
- Wave 2 -> 5 tasks -> `visual-engineering`, `unspecified-high`, `deep`
- Final Verification -> 4 tasks -> `oracle`, `unspecified-high`, `deep`

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Propagate id-first artifact-slot contracts

  **What to do**: Update the artifact-slot contract model so slot and template entities carry stable `id` fields throughout authoring and persistence-facing payloads. Lock the local-create convention to `draft:`-prefixed temporary ids, keep `key` as editable secondary metadata, and define that non-`draft:` ids in replace payloads must map to existing persisted entities.
  **Must NOT do**: Do not remove `key` from the domain, do not add preview-related fields, and do not invent a second identity mechanism alongside `id`.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: Shared contract decisions propagate into multiple layers.
  - Skills: `[]` — Reason: Repo-native patterns are sufficient.
  - Omitted: `test-driven-development` — Reason: Test strategy is locked to tests-after for this workstream.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2, 4, 6, 7, 8, 9, 10 | Blocked By: none

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `packages/contracts/src/methodology/artifact-slot.ts` — current slot/template payloads are key-first and need id-first evolution.
  - Pattern: `packages/db/src/schema/methodology.ts` — DB already has `id` columns for slot definitions and templates.
  - Pattern: `docs/architecture/methodology-pages/artifact-slots-design-time.md` — current design-time baseline still documents key-centric template metadata.
  - API/Type: `packages/api/src/routers/methodology.ts` — router mirror must stay aligned with contract changes.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Slot and template payload contracts include `id` and preserve `key` as secondary metadata.
  - [ ] The contract layer documents or encodes the `draft:` temp-id convention for unsaved UI entities.
  - [ ] Contract validation rejects blank ids/keys and does not reintroduce key-based identity assumptions.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Contract accepts id-first artifact slot entities
    Tool: Bash
    Steps: Run `bun test packages/api/src/tests/routers/methodology.test.ts -t "artifact slot contract accepts id-first payload"`
    Expected: PASS; payloads with slot/template `id`, `key`, and markdown `content` validate successfully.
    Evidence: .sisyphus/evidence/task-1-contract-ids.txt

  Scenario: Contract rejects invalid identity shape
    Tool: Bash
    Steps: Run `bun test packages/api/src/tests/routers/methodology.test.ts -t "artifact slot contract rejects missing or malformed ids"`
    Expected: PASS; blank ids or non-`draft:` unknown ids fail validation/assertion.
    Evidence: .sisyphus/evidence/task-1-contract-ids-error.txt
  ```

  **Commit**: YES | Message: `refactor(methodology): add id-first artifact slot contracts` | Files: `packages/contracts/src/methodology/artifact-slot.ts`, `packages/api/src/routers/methodology.ts`, `packages/api/src/tests/routers/methodology.test.ts`

- [x] 2. Make API and repository replace flow id-first

  **What to do**: Update artifact-slot list/replace procedures and repository mappings so persisted slots/templates round-trip real ids, replace updates existing entities by id, `draft:` ids create new rows, and key uniqueness remains a validation rule rather than the entity identity rule.
  **Must NOT do**: Do not add fine-grained slot/template endpoints; do not silently create rows for unknown non-`draft:` ids; do not break the existing bulk replace write path.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: This task changes repository semantics and identity guarantees.
  - Skills: `[]` — Reason: Existing repo tests and schema provide the needed guardrails.
  - Omitted: `systematic-debugging` — Reason: The task is design-led, not incident-led.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 4, 6, 7, 8, 9, 10 | Blocked By: 1

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `packages/api/src/routers/methodology.ts:562` — current zod mirror is key-first.
  - Pattern: `packages/db/src/methodology-repository.ts:2008` — current replace flow inserts nested templates using `template.key` only.
  - Pattern: `packages/db/src/methodology-repository.ts:2023` — current list flow returns keys/content but not ids.
  - Test: `packages/db/src/tests/repository/methodology-repository.integration.test.ts:675` — current persistence test is the right seam to extend.
  - Test: `packages/api/src/tests/routers/methodology.test.ts` — router coverage should assert id round-trip and replace behavior.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Artifact-slot list responses expose persisted slot/template ids.
  - [ ] Replace updates existing slot/template rows by id and only creates on `draft:` ids.
  - [ ] Unknown non-`draft:` ids fail with deterministic diagnostics instead of duplicating data.
  - [ ] Repository/API tests cover create, update, delete, key rename, and nested template replacement by id.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Replace preserves identity on secondary key rename
    Tool: Bash
    Steps: Run `bun test packages/db/src/tests/repository/methodology-repository.integration.test.ts -t "updates artifact slots by id when keys change"`
    Expected: PASS; slot/template `key` can change while the same persisted `id` remains in the reloaded result.
    Evidence: .sisyphus/evidence/task-2-repo-id-roundtrip.txt

  Scenario: Replace rejects stale persisted id
    Tool: Bash
    Steps: Run `bun test packages/api/src/tests/routers/methodology.test.ts -t "artifact slot replace rejects unknown persisted ids"`
    Expected: PASS; API returns failure for a non-`draft:` id that does not belong to the current work-unit artifact-slot set.
    Evidence: .sisyphus/evidence/task-2-repo-id-roundtrip-error.txt
  ```

  **Commit**: YES | Message: `refactor(methodology): make artifact slot replace id-first` | Files: `packages/api/src/routers/methodology.ts`, `packages/api/src/tests/routers/methodology.test.ts`, `packages/db/src/methodology-repository.ts`, `packages/db/src/tests/repository/methodology-repository.integration.test.ts`

- [x] 3. Implement phase-1 Handlebars template-engine seam

  **What to do**: Build the first real `@chiron/template-engine` implementation for artifact-template rendering: strict runtime rendering, relaxed/editor diagnostics support in the API shape if needed later, and the locked phase-1 helper allowlist (`if`, `unless`, `each`, `with`, comparisons, boolean helpers, fallbacks). Keep the implementation template-text-first and ready for Monaco-authored markdown source.
  **Must NOT do**: Do not add preview UI, partial registries, arbitrary helpers, or prompt-receipt persistence in this task.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: This is a new module implementation with strictness policy implications.
  - Skills: `[]` — Reason: The module design doc is the primary authority.
  - Omitted: `hono` — Reason: No Hono-specific work is needed.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 9 | Blocked By: none

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `packages/template-engine/src/index.ts` — currently empty; this is a greenfield implementation.
  - API/Type: `docs/architecture/modules/template-engine.md:52` — MVP responsibilities and render API target.
  - API/Type: `docs/architecture/modules/template-engine.md:63` — strictness and helper allowlist are locked.
  - Pattern: `docs/architecture/methodology-pages/workflow-editor/variable-target-model.md` — variable namespaces should stay dot-path friendly for template content.
  - External: `https://handlebarsjs.com/api-reference/runtime-options.html` — strict/runtime option behavior.

  **Acceptance Criteria** (agent-executable only):
  - [ ] `packages/template-engine/src/index.ts` exports a usable render seam for markdown template text.
  - [ ] Runtime strict mode rejects missing variables and denied helpers deterministically.
  - [ ] Allowed helpers cover the locked phase-1 list and nothing broader.
  - [ ] Dedicated tests cover happy-path rendering, missing variables, denied helpers, and secondary-key style dot-path lookups.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Strict Handlebars render succeeds for allowed helpers
    Tool: Bash
    Steps: Run `bun test packages/template-engine/src/index.test.ts -t "renders markdown artifact template with allowlisted helpers"`
    Expected: PASS; the rendered markdown matches the expected output for `if`/`each`/fallback helper usage.
    Evidence: .sisyphus/evidence/task-3-template-engine.txt

  Scenario: Strict Handlebars render fails for missing variable or denied helper
    Tool: Bash
    Steps: Run `bun test packages/template-engine/src/index.test.ts -t "rejects missing variables and denied helpers in strict mode"`
    Expected: PASS; the module surfaces deterministic diagnostics/errors for both failure classes.
    Evidence: .sisyphus/evidence/task-3-template-engine-error.txt
  ```

  **Commit**: YES | Message: `feat(template-engine): add strict artifact template rendering` | Files: `packages/template-engine/src/index.ts`, `packages/template-engine/src/index.test.ts`, `packages/template-engine/package.json`

- [x] 4. Adapt work-unit route to id-first artifact-slot state

  **What to do**: Refactor `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx` so artifact-slot data enters the tab with ids, secondary keys, normalized guidance/description, and `draft:` temp ids for unsaved local entities. Centralize artifact-slot payload normalization in route-local helpers rather than duplicating transformation logic inside the component.
  **Must NOT do**: Do not keep key-based row lookup in the route, do not call new endpoints, and do not bury id reconciliation inside ad hoc component closures.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: Route-level data shaping and mutation plumbing must stay coherent.
  - Skills: [] — Reason: Existing route patterns are sufficient.
  - Omitted: `vercel-react-best-practices` — Reason: This is state-shape and mutation work, not performance tuning.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 6, 7, 8, 9, 10 | Blocked By: 1, 2

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx:205` — current artifact-slot query and replace mutation seam.
  - Pattern: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx:931` — current `ArtifactSlotsTab` handoff is key-only and stateless.
  - Pattern: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx:1651` — current route test only asserts basic list/replace wiring.
  - Pattern: `apps/web/src/features/methodologies/work-unit-l2/FactsTab.tsx:214` — sibling tabs use normalized UI draft shapes separate from raw server payloads.

  **Acceptance Criteria** (agent-executable only):
  - [ ] The route passes id-first slot/template shapes to `ArtifactSlotsTab`.
  - [ ] Replace payload generation is centralized in helpers that preserve ids and normalize empty markdown fields to `undefined`.
  - [ ] New client-created slot/template entities receive deterministic `draft:` temp ids before save.
  - [ ] Route invalidation/refetch replaces temp ids with persisted ids after successful save.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Route normalizes id-first artifact slot payloads
    Tool: Bash
    Steps: Run `bun test apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx -t "normalizes id-first artifact slot payloads through the work-unit route"`
    Expected: PASS; save payload includes ids, normalized markdown fields, and preserves nested template ordering.
    Evidence: .sisyphus/evidence/task-4-route-adapter.txt

  Scenario: Route rejects stale persisted ids during replace
    Tool: Bash
    Steps: Run `bun test apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx -t "surfaces artifact slot replace errors for stale persisted ids"`
    Expected: PASS; the route leaves local dialog state intact and surfaces the mutation failure path.
    Evidence: .sisyphus/evidence/task-4-route-adapter-error.txt
  ```

  **Commit**: YES | Message: `refactor(web): normalize artifact slot route state by id` | Files: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx`, `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx`

- [x] 5. Sync artifact-slot design docs to the locked phase-1 model

  **What to do**: Update the artifact-slot design documentation so it no longer implies key-centric identity or preview scope. The docs must describe ids as the real identity, `key` as secondary metadata, `Handlebars + Monaco` authoring, markdown-only canonical template content, stacked dialogs, and no preview in phase 1.
  **Must NOT do**: Do not rewrite unrelated methodology-page docs, and do not reopen the engine decision in documentation prose.

  **Recommended Agent Profile**:
  - Category: `writing` — Reason: This is architecture-doc synchronization.
  - Skills: [] — Reason: The current draft and locked decisions provide enough context.
  - Omitted: `writing-skills` — Reason: We are editing product docs, not agent skills.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: none | Blocked By: 1, 2

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `docs/architecture/methodology-pages/artifact-slots-design-time.md:72` — currently key-oriented template contract rules and stacked dialog notes.
  - Pattern: `docs/architecture/modules/template-engine.md:52` — Handlebars runtime baseline should remain aligned.
  - Pattern: `.sisyphus/plans/finish-l2-artifact-slots.md` — this plan’s `Interview Summary`, `Must Have`, and `Must NOT Have` sections are the authoritative locked decisions to mirror accurately.

  **Acceptance Criteria** (agent-executable only):
  - [ ] The artifact-slot design doc states ids are canonical identity and keys are secondary metadata.
  - [ ] The doc locks `Handlebars + Monaco` with markdown-only canonical source and no preview for phase 1.
  - [ ] The doc reflects stacked slot/template dialogs and the existing replace-based persistence seam.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Artifact-slot doc reflects locked phase-1 decisions
    Tool: Bash
    Steps: Run `grep -n "ids are canonical\|Handlebars\|Monaco\|no preview" docs/architecture/methodology-pages/artifact-slots-design-time.md`
    Expected: Matching lines confirm id-first identity, Handlebars+Monaco, and no-preview scope are explicitly documented.
    Evidence: .sisyphus/evidence/task-5-doc-sync.txt

  Scenario: Doc no longer implies key-centric identity
    Tool: Bash
    Steps: Run `grep -n "key-centric\|key is identity" docs/architecture/methodology-pages/artifact-slots-design-time.md`
    Expected: No matches, or only explanatory text saying keys are secondary metadata.
    Evidence: .sisyphus/evidence/task-5-doc-sync-error.txt
  ```

  **Commit**: YES | Message: `docs(methodology): sync artifact slot phase-1 design` | Files: `docs/architecture/methodology-pages/artifact-slots-design-time.md`

- [x] 6. Rebuild ArtifactSlotsTab around id-first slot CRUD

  **What to do**: Replace the placeholder `ArtifactSlotsTab` table/details dialog with a local-draft slot management surface that supports `+ Add Slot`, `Edit Slot`, and `Delete Slot`, using slot `id` as the React/state identity key and keeping slot `key` editable as secondary metadata. The slot dialog must expose `Contract`, `Guidance`, and `Templates` tabs, and the main surface must show stable row actions instead of the current read-only details button.
  **Must NOT do**: Do not keep `detailsSlotKey`-style key lookup, do not persist directly from child controls, and do not route slot editing into a separate page.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` — Reason: This is a dense interactive CRUD surface in React.
  - Skills: [] — Reason: Sibling tabs and local UI primitives are enough.
  - Omitted: `brainstorming` — Reason: The design is already locked.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 7, 8, 9, 10 | Blocked By: 1, 2, 4

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `apps/web/src/features/methodologies/work-unit-l2/ArtifactSlotsTab.tsx:31` — current placeholder implementation to replace.
  - Pattern: `apps/web/src/features/methodologies/work-unit-l2/FactsTab.tsx:214` — local draft list + editor open state pattern.
  - Pattern: `apps/web/src/features/methodologies/work-unit-l2/WorkflowsTab.tsx` — row actions and dialog CRUD conventions.
  - Pattern: `docs/architecture/methodology-pages/artifact-slots-design-time.md:79` — slot dialog stack expectations.

  **Acceptance Criteria** (agent-executable only):
  - [ ] The table supports `+ Add Slot`, `Edit Slot`, and `Delete Slot` actions.
  - [ ] Slot row identity in React state and draft mutation logic is based on slot `id`, not `key`.
  - [ ] The slot editor opens as a dialog with `Contract`, `Guidance`, and `Templates` tabs.
  - [ ] Saving the parent surface persists the whole slot draft snapshot through the existing replace mutation.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Create and save a new slot from the table
    Tool: Bash
    Steps: Run `bun test apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx -t "creates a new artifact slot from the table and persists it through replace"`
    Expected: PASS; the test clicks `+ Add Slot`, fills `Display Name`, `Slot Key`, `Cardinality`, saves, and asserts the replace payload contains a `draft:` id before refetch.
    Evidence: .sisyphus/evidence/task-6-slot-crud.txt

  Scenario: Delete a slot and persist the removal
    Tool: Bash
    Steps: Run `bun test apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx -t "deletes an artifact slot by id and persists the removal"`
    Expected: PASS; the remove action targets the correct slot `id` and the refetched list no longer contains that slot.
    Evidence: .sisyphus/evidence/task-6-slot-crud-error.txt
  ```

  **Commit**: YES | Message: `feat(web): add id-first artifact slot CRUD shell` | Files: `apps/web/src/features/methodologies/work-unit-l2/ArtifactSlotsTab.tsx`, `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx`, `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx`

- [ ] 7. Add slot-tab dirty indicators and discard protection

  **What to do**: Implement slot-dialog dirty tracking for `Contract`, `Guidance`, and `Templates` tabs, plus parent-level discard confirmation that mirrors sibling L2 dialogs. Track dirtiness per tab, not with one coarse flag, and preserve form state when switching tabs until the user saves or discards.
  **Must NOT do**: Do not silently reset state on close, do not let nested-template edits bypass parent discard logic, and do not mark dirty from initial normalization alone.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` — Reason: This is modal state and UX parity work.
  - Skills: [] — Reason: FactsTab already provides the dominant pattern.
  - Omitted: `web-design-guidelines` — Reason: The task is behavior parity, not a design audit.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 8, 9, 10 | Blocked By: 6

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `apps/web/src/features/methodologies/work-unit-l2/FactsTab.tsx:219` — per-tab dirty flags and discard-dialog state.
  - Pattern: `apps/web/src/features/methodologies/work-unit-l2/FactsTab.tsx:257` — close-request guard before discarding edits.
  - Pattern: `apps/web/src/features/methodologies/work-unit-l2/StateMachineTab.tsx` — sibling dialog-close expectations.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Editing fields on a slot tab adds `*` to the affected tab label and not unrelated tabs.
  - [ ] Switching tabs preserves unsaved values.
  - [ ] Closing a dirty slot dialog opens a discard confirmation with `Keep editing` and `Discard changes` options.
  - [ ] Choosing `Discard changes` restores the last-saved slot snapshot and clears dirty markers.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Dirty indicators track slot tab edits accurately
    Tool: Bash
    Steps: Run `bun test apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx -t "tracks artifact slot dirty tabs independently"`
    Expected: PASS; editing `Contract` marks only `Contract*`, editing guidance marks `Guidance*`, and tab switches keep unsaved values.
    Evidence: .sisyphus/evidence/task-7-slot-dirty.txt

  Scenario: Discard dialog restores last-saved slot state
    Tool: Bash
    Steps: Run `bun test apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx -t "discards dirty artifact slot dialog edits"`
    Expected: PASS; closing the dialog prompts, `Keep editing` preserves state, and `Discard changes` resets fields and removes `*` markers.
    Evidence: .sisyphus/evidence/task-7-slot-dirty-error.txt
  ```

  **Commit**: YES | Message: `feat(web): add artifact slot dirty and discard flows` | Files: `apps/web/src/features/methodologies/work-unit-l2/ArtifactSlotsTab.tsx`, `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx`

- [ ] 8. Implement nested template CRUD dialog with id-first identity

  **What to do**: Build the slot-level `Templates` tab into a nested template management surface with `+ Add Template`, `Edit Template`, and `Delete Template` actions. The child dialog must use template `id` as the true identity, keep template `key` editable as secondary metadata, and include `Contract`, `Guidance`, and `Content` tabs.
  **Must NOT do**: Do not collapse template editing inline into the slot form, do not use template `key` as the child dialog lookup key, and do not allow child dialog closure to silently mutate parent dirty state.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` — Reason: Nested dialog state and child CRUD are the core UX complexity.
  - Skills: [] — Reason: Existing dialog primitives and tab patterns are enough.
  - Omitted: `dispatching-parallel-agents` — Reason: This task edits the same interactive surface as tasks 6 and 7.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 9, 10 | Blocked By: 6, 7

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `docs/architecture/methodology-pages/artifact-slots-design-time.md:81` — stacked dialog authoring model.
  - Pattern: `apps/web/src/features/methodologies/work-unit-l2/ArtifactSlotsTab.tsx` — parent surface being extended.
  - Pattern: `apps/web/src/components/ui/dialog.tsx` — dialog primitives to reuse for parent/child stack.
  - Pattern: `apps/web/src/features/methodologies/work-unit-l2/FactsTab.tsx` — save/cancel/discard button conventions.

  **Acceptance Criteria** (agent-executable only):
  - [ ] The slot `Templates` tab lists nested templates with add/edit/delete actions.
  - [ ] Template dialogs open in a child stack above the slot dialog and preserve parent state.
  - [ ] Template edits mutate the correct nested entity by `id` and allow `key` edits without changing identity.
  - [ ] Deleting the last template persists an empty template list without breaking slot save.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Add and update a nested template by id
    Tool: Bash
    Steps: Run `bun test apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx -t "adds and updates nested artifact templates by id"`
    Expected: PASS; the test creates a template, saves, reloads, reopens, changes `Display Name` and `Template Key`, and asserts the same template `id` is updated.
    Evidence: .sisyphus/evidence/task-8-template-crud.txt

  Scenario: Cancel child template dialog without losing parent slot edits
    Tool: Bash
    Steps: Run `bun test apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx -t "preserves parent slot edits when child template dialog is cancelled"`
    Expected: PASS; unsaved parent edits remain intact after cancelling the child dialog.
    Evidence: .sisyphus/evidence/task-8-template-crud-error.txt
  ```

  **Commit**: YES | Message: `feat(web): add nested artifact template CRUD dialogs` | Files: `apps/web/src/features/methodologies/work-unit-l2/ArtifactSlotsTab.tsx`, `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx`

- [ ] 9. Add Monaco template authoring with predefined variable insertion

  **What to do**: Replace the plain text template content field with Monaco-based markdown template authoring in the template dialog `Content` tab. Configure the editor for Handlebars-friendly markdown source, provide explicit insertion affordances for methodology facts, current work-unit facts, and methodology work units, and keep the authored source as exact persisted markdown text with no preview panel.
  **Must NOT do**: Do not add a rendered preview, do not introduce Plate or dual storage, and do not let Monaco own the canonical data shape beyond the raw string content.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` — Reason: Editor integration and UX details dominate this task.
  - Skills: [] — Reason: Repo-local UI primitives plus the locked design are enough.
  - Omitted: `vercel-composition-patterns` — Reason: The component API is localized, not a reusable library design.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 10 | Blocked By: 3, 4, 7, 8

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `apps/web/src/components/ui/command.tsx` — existing command-list primitives for variable insertion UI.
  - Pattern: `apps/web/src/components/ui/popover.tsx` — popover/suggestion surfaces for variable insertion.
  - Pattern: `apps/web/src/features/methodologies/command-palette.tsx` — command interaction conventions.
  - Pattern: `docs/architecture/modules/template-engine.md:63` — helper/strictness policy the editor must not contradict.
  - Pattern: `docs/architecture/methodology-pages/workflow-editor/variable-target-model.md` — namespace shape for inserted variable paths.
  - External: `https://github.com/microsoft/monaco-editor/tree/main/samples/electron-esm-webpack` — Electron integration reference for worker/asset setup.

  **Acceptance Criteria** (agent-executable only):
  - [ ] The template `Content` tab uses Monaco instead of a plain textarea/plain text block.
  - [ ] The editor persists exact markdown Handlebars source with no extra serialization layer.
  - [ ] Variable insertion offers explicit choices for methodology facts, current work-unit facts, and methodology work units.
  - [ ] The saved `content` round-trips exactly after reload, including Handlebars expressions and markdown newlines.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Monaco editor inserts predefined variable tokens into template content
    Tool: Bash
    Steps: Run `bun test apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx -t "inserts predefined artifact template variables through Monaco authoring"`
    Expected: PASS; the test opens `Content`, inserts a methodology fact token, a work-unit fact token, and a methodology work-unit token, then saves exact markdown source.
    Evidence: .sisyphus/evidence/task-9-monaco.txt

  Scenario: Exact markdown Handlebars source survives save and reload
    Tool: Bash
    Steps: Run `bun test apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx -t "round-trips Monaco-authored markdown template source exactly"`
    Expected: PASS; `## Title\n{{artifact.name}}\n{{{body}}}` reloads byte-for-byte unchanged.
    Evidence: .sisyphus/evidence/task-9-monaco-error.txt
  ```

  **Commit**: YES | Message: `feat(web): add Monaco artifact template authoring` | Files: `apps/web/package.json`, `apps/web/src/features/methodologies/work-unit-l2/ArtifactSlotsTab.tsx`, `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx`

- [ ] 10. Expand end-to-end artifact-slot regression coverage

  **What to do**: Turn the current minimal route wiring test into a comprehensive regression suite for artifact-slot CRUD, nested template CRUD, dirty/discard, id round-trip, secondary key rename, save failure retention, and no-preview scope. Rework the route test fixture data to carry ids and to reflect the new slot/template dialogs and labels.
  **Must NOT do**: Do not rely on manual verification, do not keep the old key-only fixture shape, and do not stop at list/replace smoke coverage.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: This is broad integration coverage over a large route fixture.
  - Skills: [] — Reason: Existing test seam is already established.
  - Omitted: `systematic-debugging` — Reason: This is proactive regression coverage, not reactive debugging.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: final verification only | Blocked By: 4, 6, 7, 8, 9

  **References** (executor has NO interview context — be exhaustive):
  - Test: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx:1651` — current artifact-slot coverage is a minimal smoke test and must be replaced/expanded.
  - Pattern: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx:931` — route handoff to artifact-slot tab.
  - Pattern: `apps/web/src/features/methodologies/work-unit-l2/ArtifactSlotsTab.tsx` — final UI surface under test.
  - Test: `packages/db/src/tests/repository/methodology-repository.integration.test.ts:675` — repository round-trip expectations to mirror at route level.

  **Acceptance Criteria** (agent-executable only):
  - [ ] The shell-routes integration suite covers slot create/edit/delete, nested template create/edit/delete, dirty/discard, id round-trip, and key rename-as-metadata behavior.
  - [ ] The suite asserts save-failure behavior keeps dialogs/state intact and does not drop unsaved edits.
  - [ ] The suite asserts there is no preview UI in the template dialog.
  - [ ] The suite is the primary web regression seam for artifact-slot authoring and passes green.

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Full happy-path artifact slot authoring regression passes
    Tool: Bash
    Steps: Run `bun test apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx`
    Expected: PASS; the suite covers slot/template CRUD, exact markdown content round-trip, and id-first persistence semantics.
    Evidence: .sisyphus/evidence/task-10-web-regression.txt

  Scenario: Failure-path regression keeps unsaved state intact
    Tool: Bash
    Steps: Run `bun test apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx -t "retains artifact slot dialog state after replace failure"`
    Expected: PASS; mutation failure leaves the dialog open with prior edits preserved and an error surfaced.
    Evidence: .sisyphus/evidence/task-10-web-regression-error.txt
  ```

  **Commit**: YES | Message: `test(web): expand artifact slot route regressions` | Files: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx`

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [ ] F1. Plan Compliance Audit — oracle
  - Tool/Agent: `task(subagent_type="oracle")`
  - Steps: Review implemented changes against `.sisyphus/plans/finish-l2-artifact-slots.md`; verify id-first identity, no-preview scope, Handlebars+Monaco, bulk replace persistence, and task-level acceptance criteria coverage.
  - Expected: Explicit approval that implementation matches plan decisions with no scope drift.
  - Evidence: `.sisyphus/evidence/f1-plan-compliance.md`
- [ ] F2. Code Quality Review — unspecified-high
  - Tool/Agent: `task(category="unspecified-high")`
  - Steps: Review changed files for maintainability, state-shape consistency, temp-id handling, duplicate-key validation, Monaco integration hygiene, and test clarity.
  - Expected: Explicit approval that code is production-ready with no major correctness or maintainability issues.
  - Evidence: `.sisyphus/evidence/f2-code-quality.md`
- [ ] F3. Real Manual QA — unspecified-high (+ playwright if UI)
  - Tool/Agent: `task(category="unspecified-high")` plus `playwright` if the reviewer needs browser interaction
  - Steps: Execute the actual slot/template UI flows: create slot, edit slot key/name, add nested template, edit template content in Monaco, save, reload, verify same ids persist, then trigger a failure/discard path.
  - Expected: Explicit approval that the shipped UX behaves correctly in the browser and matches the automated regression expectations.
  - Evidence: `.sisyphus/evidence/f3-manual-qa.md`
- [ ] F4. Scope Fidelity Check — deep
  - Tool/Agent: `task(category="deep")`
  - Steps: Audit the final diff for forbidden extras: no preview UI, no Plate, no fine-grained CRUD endpoints, no template versioning/publishing, no key-based identity regressions, no generalized framework extraction.
  - Expected: Explicit approval that the implementation stayed inside the agreed phase-1 scope.
  - Evidence: `.sisyphus/evidence/f4-scope-fidelity.md`

## Commit Strategy
- Keep commits vertical and self-verifying; do not mix id-plumbing, runtime, and UI dialog work in one changeset.
- Preferred commit sequence:
  - `refactor(methodology): propagate artifact slot ids through contracts and persistence`
  - `feat(template-engine): add strict Handlebars render support for artifact templates`
  - `feat(web): add id-first artifact slot dialog CRUD`
  - `feat(web): add nested template authoring with Monaco`
  - `test(web): expand artifact slot route integration coverage`
  - `docs(methodology): sync artifact slot authoring design`

## Success Criteria
- Artifact slots and nested templates can be created, edited, deleted, and reloaded by id without accidental duplication.
- Slot/template `key` can change without changing entity identity.
- Dirty/discard flows behave like sibling L2 CRUD surfaces.
- Template content round-trips as exact markdown Handlebars source.
- The plan’s no-preview, id-first, Handlebars+Monaco boundaries are preserved in the implementation.
