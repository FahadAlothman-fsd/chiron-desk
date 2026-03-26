# BMAD to Chiron Slice-A Seeding Plan

## TL;DR
> **Summary**: First refactor Chiron’s L1/L2 descriptive metadata and seeding procedure to match the approved BMAD→Chiron data model, then seed the refined methodology definition plus dual methodology versions (`draft` and `active`) for `WU.SETUP`, `WU.BRAINSTORMING`, and `WU.RESEARCH`.
> **Deliverables**:
> - Active mapping authority for setup, brainstorming, and research slices plus L1/L2 metadata-ownership rules
> - Refactored contracts/schema/frontend/seeding procedure for correct `description` / `guidance` ownership
> - Refined methodology definition plus one `draft` and one `active` methodology version sharing the same Slice-A L1/L2 canonical data
> - Deterministic L1/L2 seed packets for 3 work-unit types, 5 primary workflows, and 10 brainstorming support workflows, excluding workflow steps/edges
> - Updated integrity/reseed/version tests and slice registration metadata
> **Effort**: XL
> **Parallel**: YES - 4 waves
> **Critical Path**: 1 → 2 → 3 → 4 → 5 → 6/7/8 → 9 → 10 → 11 → F1-F4

## Context
### Original Request
User wants a **pure data seeding plan** to translate BMAD artifacts/workflows into Chiron using design-time tables and explicit rationale. Current first-slice scope is: project setup, brainstorming, and the three research workflows (market, domain, technical).

### Interview Summary
- Locked slice taxonomy: `WU.SETUP`, `WU.BRAINSTORMING`, `WU.RESEARCH`
- Locked workflow scope: `setup_project`, `brainstorming`, `market_research`, `domain_research`, `technical_research`
- Locked brainstorming support-workflow scope: seed 10 unbound `advanced_elicitation` support workflows as part of the `WU.BRAINSTORMING` L2 packet; they are in-scope support rows, not additional transition-bound primary workflows
- Locked modeling choice: one `WU.RESEARCH` work-unit type with three workflows
- Locked planning approach: canonical slice packets, not workflow-by-workflow ports or legacy snapshot normalization
- Locked sequencing: refactor data shapes first, then seed the locked data into those corrected shapes
- Locked completion boundary: this plan finishes L1/L2 only; workflow steps/edges move to a later separate plan
- Locked versioning: seed one refined methodology definition and two methodology versions with the same underlying Slice-A canonical data — one `draft`, one `active`
- Locked metadata ownership: work-unit facts, states, workflows, artifact slots/templates, transitions, methodology facts, dependencies, agents, and work-unit types get both `description` and `guidance`; condition sets and transition bindings get neither
- Locked fact-definition enhancement: methodology facts and work-unit facts gain a first-class `cardinality` field with values `one | many`; ordering is not a second platform-wide field
- Locked Slice-A fact redesign: brainstorming replaces singular `objective` with plural `objectives`, and research keeps `research_goals` as plural; both are modeled as goal-oriented JSON facts with `cardinality: many`
- Locked nested-schema enhancement: JSON fact sub-schema fields also support `type` + `cardinality`; list-valued subfields are not a new type and should not carry scalar defaults
- Locked storage/validation split: canonical fact-definition storage remains Chiron-native `type + cardinality` (plus dependency semantics), while JSON Schema draft `2020-12` is the compiled runtime-validation artifact for JSON facts / sub-schemas

### Metis Review (gaps addressed)
- Authority completeness is the main risk: setup already has active mapping authority; brainstorming and research must get the same before row seeding starts
- Existing tests currently assert mostly-empty canonical tables, so the plan must explicitly migrate those expectations
- No canonical payload may land in `definition_extensions_json`
- Existing seeding procedure must be updated deliberately to conform to the approved seed data model instead of silently forcing the new rows into legacy assumptions
- Deferred tables and L3 workflow-step/edge work must stay intentionally deferred unless this plan explicitly promotes them

## Work Objectives
### Core Objective
Produce canonical, deterministic Slice-A seed data that preserves BMAD intent while fitting Chiron’s table-first methodology model.

### Deliverables
- Canonical mapping docs for brainstorming and research slices
- Slice-A mapping matrix embedded in active authority docs
- Refactored L1/L2 contracts/schema/frontend authoring/serialization for correct `description` / `guidance` ownership
- Refactored fact-definition model for first-class fact cardinality on methodology facts and work-unit facts
- Updated seeding procedure and slice packet modules for setup, brainstorming, and research
- Refined methodology definition plus dual methodology versions (`draft`, `active`)
- Methodology facts, dependency definitions, work-unit types, agent types, work-unit facts, states, transitions, condition sets, workflow bindings, workflows, artifact slots, and slot templates for Slice A
- Updated seed metadata and test coverage proving deterministic, non-extension-based, dual-version seeding

### Definition of Done (verifiable conditions with commands)
- `bunx vitest run packages/scripts/src/tests/seeding/manual-seed-fixtures.test.ts packages/scripts/src/tests/seeding/methodology-seed-integrity.test.ts packages/scripts/src/tests/seeding/seed-error-handling.test.ts packages/scripts/src/tests/seeding/methodology-seed-integration.test.ts`
- `bun run db:seed:test:reset`
- `bun run check-types`
- `bun run check`

### Must Have
- Refactor-first execution order: shape correction before row seeding
- Refined methodology definition row plus one `draft` and one `active` methodology version
- Table-first canonical storage only
- First-class fact cardinality on methodology facts and work-unit facts using `one | many`
- Deterministic row IDs/keys for every Slice-A entity
- Explicit start/completion condition sets for every Slice-A transition
- Explicit transition-workflow bindings for all 5 primary workflows, plus explicit unbound support-workflow treatment for the 10 brainstorming elicitation workflows
- Artifact slot definitions and slot-owned templates for setup, brainstorming, and research outputs where locked in the draft
- Seeded template content treats facts as runtime-valued inputs: optional facts are guarded with conditionals, and list-valued facts are expected to render through iteration/block syntax rather than unconditional scalar interpolation
- Minimal methodology-agent rows for the workflows that actually need them in L1/L2
- Existing seeding procedure updated to conform to the corrected L1/L2 data shapes and dual-version requirements
- Slice registration metadata that lists exact work-unit and workflow keys

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- No canonical payload in `methodology_versions.definition_extensions_json`
- No executor-authored semantics for brainstorming/research after Task 1
- No one-to-one copy of BMAD micro-files into Chiron states or facts
- No runtime web-search/tooling orchestration redesign
- No workflow steps or workflow edges in this plan
- No full-methodology seeding beyond Slice A
- No accidental population of deferred tables unless the task explicitly says so

## Verification Strategy
> ZERO HUMAN INTERVENTION — all verification is agent-executed.
- Test decision: tests-after using existing Vitest seeding suite plus seed-run commands
- QA policy: Every task has agent-executed scenarios
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: authority freeze + shape refactor + seeding-procedure/version scaffolding (Tasks 1-3)

Wave 2: L1 + foundational L2 slice entities in parallel after Wave 1 (Tasks 4-8)
- methodology definition + dual versions + methodology facts/work units/dependencies
- slice-A agents
- setup rows
- brainstorming rows
- shared research rows

Wave 3: research workflow rows + verification hardening (Tasks 9-11)
- three research workflow rows/bindings
- deterministic integrity tests
- reseed/version/procedure/integration assertions

### Dependency Matrix (full, all tasks)
| Task | Depends On | Blocks |
| --- | --- | --- |
| 1 | — | 2-11 |
| 2 | 1 | 3-11 |
| 3 | 1,2 | 4-11 |
| 4 | 1,2,3 | 6,7,8,9,10,11 |
| 5 | 1,2,3 | 7,8,9,10,11 |
| 6 | 1,2,3,4 | 9,10,11 |
| 7 | 1,2,3,4,5 | 8,9,10,11 |
| 8 | 1,2,3,4,5 | 9,10,11 |
| 9 | 1,2,3,4,5,8 | 10,11 |
| 10 | 4,5,6,7,8,9 | 11 |
| 11 | 10 | F1-F4 |
| F1-F4 | 11 + explicit user approval | completion |

### Agent Dispatch Summary
| Wave | Task Count | Categories |
| --- | --- | --- |
| 1 | 3 | writing, unspecified-high |
| 2 | 5 | unspecified-high, writing |
| 3 | 3 | unspecified-high, quick |

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Freeze Slice-A authority and metadata-ownership rules

  **What to do**: Update the active methodology authority docs so Slice A explicitly covers `WU.SETUP`, `WU.BRAINSTORMING`, and `WU.RESEARCH`, and so the authority set also locks the descriptive-metadata rules now approved in the draft: which entities own both `description` and `guidance`, which entities own neither, and that this plan ends at L1/L2 with workflow steps/edges deferred. The authority docs must also state that the seeded methodology will ship as one refined methodology definition plus two versions (`draft` and `active`) sharing the same underlying Slice-A canonical data.
  **Must NOT do**: Re-promote lineage drafts as runtime truth; keep the old seed-first assumption; imply that workflow steps/edges are still in scope here.

  **Recommended Agent Profile**:
  - Category: `writing` — Reason: authority and guardrail documentation.
  - Skills: [`superpowers/writing-plans`] — why: keeps authority docs explicit and execution-safe.
  - Omitted: [`hono`, `better-auth-best-practices`] — why not needed.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2-11 | Blocked By: none

  **References**:
  - `docs/architecture/methodology-bmad-setup-mapping.md`
  - `docs/architecture/epic-3-authority.md`
  - `docs/architecture/methodology-progressive-seeding.md`
  - `docs/architecture/methodology-canonical-authority.md`
  - `.sisyphus/drafts/bmad-to-chiron-seeding-translation.md`

  **Acceptance Criteria**:
  - [ ] Active authority docs explicitly name setup, brainstorming, and research as Slice-A work units.
  - [ ] Active authority docs explicitly state refactor-first, seed-second sequencing.
  - [ ] Active authority docs explicitly state that condition sets and transition bindings own neither `description` nor `guidance`.
  - [ ] Active authority docs explicitly state that this plan stops at L1/L2 and defers steps/edges.
  - [ ] Active authority docs explicitly state that the overall seed includes one methodology definition and two versions: `draft` and `active`.

  **QA Scenarios**:
  ```
  Scenario: Authority docs route Slice A and metadata rules
    Tool: Bash
    Steps: Run a script that reads the promoted docs and asserts presence of `setup`, `brainstorming`, `research`, `draft`, `active`, `description`, `guidance`, and `condition sets` / `bindings` exclusion language.
    Expected: Script exits 0.
    Evidence: .sisyphus/evidence/task-1-authority-freeze.txt

  Scenario: Lineage/runtime leakage is absent
    Tool: Bash
    Steps: Run a grep/Python check against the promoted docs for pre-lock runtime shapes or language implying workflow steps/edges are in this plan.
    Expected: Script exits 0 with no forbidden terms.
    Evidence: .sisyphus/evidence/task-1-authority-freeze-error.txt
  ```

  **Commit**: YES | Message: `docs(methodology): freeze slice-a l1-l2 authority` | Files: [`docs/architecture/methodology-bmad-brainstorming-mapping.md`, `docs/architecture/methodology-bmad-research-mapping.md`, `docs/architecture/epic-3-authority.md`, `docs/architecture/methodology-progressive-seeding.md`, `docs/architecture/methodology-canonical-authority.md`]

- [x] 2. Refactor L1/L2 description and guidance ownership across contracts, schema, frontend, and serializers

  **What to do**: Implement the approved descriptive-metadata model before any Slice-A row seeding. Add both `description` and `guidance` with the locked JSON shapes to all L1/L2 entities that should own them: methodology facts, dependency definitions, agents, work-unit types, work-unit facts, work-unit states, work-unit workflows, work-unit artifact slots, work-unit artifact slot templates, and transitions. Add a first-class `cardinality` field to methodology-fact and work-unit-fact definitions with locked values `one | many`. Extend JSON fact sub-schema modeling so nested fields also carry `type` + `cardinality`; when a nested field is `many`, it is list-valued rather than a new type and should not use scalar defaults. Keep canonical authoring/storage Chiron-native rather than raw JSON Schema syntax, and treat JSON Schema draft `2020-12` as the compiled validation artifact used later in runtime fact-write validation. Remove both fields from condition sets and transition bindings wherever they currently exist in schema, contracts, frontend editors, or serialization paths. Normalize all affected editors/loaders/savers so the same ownership model is expressed consistently end to end.
  **Must NOT do**: Leave workflow description trapped in `metadata.description`; keep artifact-slot `description` in audience-guidance shape; preserve condition-set or binding guidance as legacy fallback; overload multiplicity into `factType`; add a second global ordering field; model list-valued nested schema fields as fake standalone types.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: cross-package contract/schema/frontend refactor.
  - Skills: [`test-driven-development`] — why: lock the new ownership rules with failing tests before refactoring.
  - Omitted: [`dispatching-parallel-agents`] — why not needed because these surfaces share one data model.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 3-11 | Blocked By: 1

  **References**:
  - `packages/contracts/src/methodology/`
  - `packages/db/src/schema/methodology.ts`
  - `apps/web/src/features/methodologies/work-unit-l2/StateMachineTab.tsx`
  - `apps/web/src/features/methodologies/work-unit-l2/FactsTab.tsx`
  - `apps/web/src/features/methodologies/work-unit-l2/ArtifactSlotsTab.tsx`
  - `apps/web/src/features/methodologies/work-unit-l2/WorkflowsTab.tsx`
  - `.sisyphus/drafts/bmad-to-chiron-seeding-translation.md`

  **Acceptance Criteria**:
  - [ ] All approved L1/L2 entities persist `description` as `{ markdown }` and `guidance` as `{ human: { markdown }, agent: { markdown } }`.
  - [ ] Condition sets and transition bindings persist neither `description` nor `guidance`.
  - [ ] Methodology facts and work-unit facts persist a first-class `cardinality` field with values `one | many`.
  - [ ] JSON fact sub-schema fields support nested `type` + `cardinality`, and list-valued subfields do not persist scalar defaults.
  - [ ] Canonical fact-definition storage remains Chiron-native while JSON Schema draft `2020-12` is treated as the compiled validation target rather than the authoring model.
  - [ ] Workflows no longer rely on `metadata.description` for first-class description storage.
  - [ ] Artifact slots/templates no longer use audience-guidance shape for `description`.
  - [ ] Frontend editors round-trip the corrected ownership model without silent fallback distortion.
  - [ ] Locked template semantics remain valid under the corrected model: fact-backed template values may be rendered conditionally when absent and iterated when list-valued.

  **QA Scenarios**:
  ```
  Scenario: L1/L2 ownership model compiles and round-trips
    Tool: Bash
    Steps: Run `bun run check-types` and targeted frontend/contract tests that save and reload methodology entities touching facts, workflows, transitions, slots, and condition sets.
    Expected: Typecheck and tests pass.
    Evidence: .sisyphus/evidence/task-2-description-guidance-refactor.txt

  Scenario: Forbidden ownership remnants are removed
    Tool: Bash
    Steps: Run grep/script assertions for `metadata.description`, condition-set guidance fields, binding guidance fields, and artifact-slot description-as-audience-guidance remnants.
    Expected: Script exits 0 with no forbidden remnants.
    Evidence: .sisyphus/evidence/task-2-description-guidance-refactor-error.txt
  ```

  **Commit**: YES | Message: `refactor(methodology): normalize description guidance ownership` | Files: [`packages/contracts/src/methodology/*`, `packages/db/src/schema/methodology.ts`, `apps/web/src/features/methodologies/work-unit-l2/*`, `apps/web/src/routes/methodologies.*`, `packages/project-context/src/*`]

- [x] 3. Update the existing seeding procedure to conform to the corrected data model and dual-version seeding

  **What to do**: Refactor the current methodology seeding procedure so it builds canonical table rows from the corrected L1/L2 shapes and can seed one methodology definition plus two methodology versions (`draft` and `active`) from the same shared Slice-A canonical row builders. Update the existing seed registries, row aggregators, metadata exports, and any version/status plumbing so the procedure no longer assumes the old baseline-metadata-only model. Keep the table-first export pattern, deterministic IDs, and slice metadata, but make the procedure explicitly version-aware and compatible with the newly corrected entity shapes. Rename `packages/scripts/src/seed/methodology/tables/methodology-fact-schemas.seed.ts` to `packages/scripts/src/seed/methodology/tables/work-unit-fact-definitions.seed.ts` so the file layout matches the canonical table it populates. Create or replace `packages/scripts/src/seed/methodology/tables/methodology-artifact-slot-definitions.seed.ts` and `packages/scripts/src/seed/methodology/tables/methodology-artifact-slot-templates.seed.ts` as real table modules that export the actual Slice-A slot and template rows used by later seeding tasks.
  **Must NOT do**: Introduce a parallel seed pipeline; duplicate row builders separately for draft and active versions; keep legacy seed assumptions that conflict with the corrected shapes.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: this is seed-pipeline and version-scaffolding work.
  - Skills: [`test-driven-development`] — why: protect ordering and version/status behavior.
  - Omitted: [`turborepo`] — why no pipeline redesign is needed.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 4-11 | Blocked By: 1,2

  **References**:
  - `packages/scripts/src/seed/methodology/index.ts`
  - `packages/scripts/src/seed/methodology/tables/*.seed.ts`
  - `packages/db/src/tests/repository/methodology-repository.integration.test.ts`
  - `packages/methodology-engine/src/validation.ts`
  - `.sisyphus/drafts/bmad-to-chiron-seeding-translation.md`

  **Acceptance Criteria**:
  - [ ] The existing seeding procedure supports one methodology definition plus one draft version and one active version.
  - [ ] Shared canonical row builders feed both versions rather than duplicated per-version row definitions.
  - [ ] Slice metadata still exports deterministic `slice_a_setup`, `slice_a_brainstorming`, and `slice_a_research` registrations.
  - [ ] The procedure is compatible with the corrected `description` / `guidance` ownership model.
  - [ ] The misleading module name `methodology-fact-schemas.seed.ts` is removed and replaced by `work-unit-fact-definitions.seed.ts`.
  - [ ] `methodology-artifact-slot-definitions.seed.ts` and `methodology-artifact-slot-templates.seed.ts` exist as real table modules and export the actual Slice-A slot/template rows consumed by the seed registry.

  **QA Scenarios**:
  ```
  Scenario: Seed procedure exposes dual-version scaffolding
    Tool: Bash
    Steps: Run a script that imports the methodology seed registry and asserts methodology definition output plus one draft and one active version are produced from the same shared row builders.
    Expected: Script exits 0.
    Evidence: .sisyphus/evidence/task-3-seed-procedure.txt

  Scenario: No legacy baseline-only assumptions remain
    Tool: Bash
    Steps: Run grep/script checks for stale `baseline_metadata`-only assumptions or draft/active duplication inside the seeding procedure.
    Expected: Script exits 0 with no forbidden assumptions.
    Evidence: .sisyphus/evidence/task-3-seed-procedure-error.txt
  ```

  **Commit**: YES | Message: `refactor(seed): align procedure with l1-l2 data model` | Files: [`packages/scripts/src/seed/methodology/index.ts`, `packages/scripts/src/seed/methodology/tables/*.seed.ts`, `packages/scripts/src/seed/methodology/*`, `packages/db/src/tests/repository/methodology-repository.integration.test.ts`]

- [x] 4. Seed the refined methodology definition, dual versions, and L1 canonical rows except agents

  **What to do**: Seed the overall methodology surface, not just per-work-unit rows. Populate or refine the methodology definition row, then seed exactly two methodology versions with the same underlying Slice-A canonical data: one editable `draft` version and one `active` published version. In the same task, seed the locked L1 canonical rows for methodology facts, dependency definitions, and work-unit definitions using the corrected metadata shapes from Task 2, including first-class fact `cardinality` values on methodology facts. Keep IDs deterministic and align all row contents to the locked L1 snapshot in `.sisyphus/drafts/bmad-to-chiron-seeding-translation.md`.
  **Must NOT do**: Seed different L1 data between draft and active versions; leave methodology definition unchanged if the approved draft requires refinement; add step/edge rows.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: foundational seed rows and version ownership.
  - Skills: [`test-driven-development`] — why: assert methodology definition/version presence and L1 row counts first.
  - Omitted: [`dispatching-parallel-agents`] — why shared foundational rows should land coherently.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 6,7,8,9,10,11 | Blocked By: 1,2,3

  **References**:
  - `.sisyphus/drafts/bmad-to-chiron-seeding-translation.md`
  - `packages/scripts/src/seed/methodology/index.ts`
  - `packages/db/src/tests/repository/methodology-repository.integration.test.ts`

  **Acceptance Criteria**:
  - [ ] One methodology definition row exists and reflects the refined Slice-A methodology identity.
  - [ ] One draft methodology version and one active methodology version exist.
  - [ ] Methodology facts, dependency definitions, and work-unit definitions match the locked draft snapshot and corrected shapes, including fact cardinality.
  - [ ] Draft and active versions reference the same underlying Slice-A canonical dataset.

  **QA Scenarios**:
  ```
  Scenario: Methodology definition and dual versions seed correctly
    Tool: Bash
    Steps: Run a Bun/Vitest check that loads the seeded methodology definition and versions, asserting one definition, one draft version, and one active version with aligned Slice-A metadata.
    Expected: Check passes.
    Evidence: .sisyphus/evidence/task-4-methodology-l1.txt

  Scenario: Draft and active versions do not drift in L1 canonical data
    Tool: Bash
    Steps: Run a comparison script over L1 canonical rows reachable from both versions and fail on content drift other than version/status fields.
    Expected: Script exits 0.
    Evidence: .sisyphus/evidence/task-4-methodology-l1-error.txt
  ```

  **Commit**: YES | Message: `feat(seed): add methodology definition and dual l1 versions` | Files: [`packages/scripts/src/seed/methodology/*`, `packages/scripts/src/seed/methodology/tables/*`, `packages/scripts/src/tests/seeding/*`]

- [x] 5. Seed the minimal methodology agents required by Slice A

  **What to do**: Seed exactly the locked Slice-A methodology agents, using the corrected L1 metadata shapes. This locked set is `bmad_analyst`, `bmad_brainstorming_coach`, and `bmad_tech_writer`, with any prompt/persona refinement needed to keep them aligned to the approved BMAD translation. Keep them methodology-owned reusable agents with runtime-variable placeholders only.
  **Must NOT do**: Seed the whole BMAD agent catalog; add `_bmad/` path references; create provider-registry payloads as methodology seed truth.

  **Recommended Agent Profile**:
  - Category: `writing` — Reason: prompt/persona translation work.
  - Skills: [`superpowers/writing-plans`] — why: explicit role boundaries and prompt composition.
  - Omitted: [`hono`, `better-auth-best-practices`] — why not needed.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 7,8,9,10,11 | Blocked By: 1,2,3

  **References**:
  - `.sisyphus/drafts/bmad-to-chiron-seeding-translation.md`
  - `docs/architecture/methodology-pages/agents.md`
  - `packages/contracts/src/methodology/agent.ts`

  **Acceptance Criteria**:
  - [ ] Only the locked Slice-A agents are seeded: `bmad_analyst`, `bmad_brainstorming_coach`, and `bmad_tech_writer`.
  - [ ] Agent rows use corrected `description` / `guidance` ownership.
  - [ ] Prompts/personas contain no `_bmad/` source-file references.
  - [ ] Later seeded workflows reference only these canonical agent IDs.

  **QA Scenarios**:
  ```
  Scenario: Slice-A agents seed deterministically
    Tool: Bash
    Steps: Run a script that imports seeded agent rows and asserts exact IDs/keys plus absence of extra BMAD catalog rows.
    Expected: Script exits 0.
    Evidence: .sisyphus/evidence/task-5-slice-a-agents.txt

  Scenario: Agent rows are clean of lineage-path leakage
    Tool: Bash
    Steps: Run a script that fails if any agent prompt/persona field contains `_bmad/` or `.md` source-path instructions.
    Expected: Script exits 0.
    Evidence: .sisyphus/evidence/task-5-slice-a-agents-error.txt
  ```

  **Commit**: YES | Message: `feat(seed): add slice-a methodology agents` | Files: [`packages/scripts/src/seed/methodology/*`, `packages/scripts/src/seed/methodology/tables/methodology-agent-types.seed.ts`]

- [x] 6. Seed `WU.SETUP` L2 using the corrected shapes

  **What to do**: Seed the locked `WU.SETUP` L2 rows from the approved draft snapshot after applying the corrected description/guidance model. Seed only L2 entities: work-unit facts, state, transition, condition sets, bound/unbound workflows, transition bindings, artifact slot, and artifact template. Do not seed workflow steps or edges. Use the approved setup semantics including a single `done` state, a single activation-to-done transition, unbound `generate_project_context`, bound `setup_project`, and fact-based completion gating.
  **Must NOT do**: Reintroduce setup-step rows or workflow edges; add setup-specific agents; re-add description/guidance to condition sets or bindings.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: deterministic multi-table slice seeding.
  - Skills: [`test-driven-development`] — why: exact setup packet assertions before broader verification.
  - Omitted: [`dispatching-parallel-agents`] — why one coherent slice.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 9,10,11 | Blocked By: 1,2,3,4

  **References**:
  - `.sisyphus/drafts/bmad-to-chiron-seeding-translation.md`
  - `docs/architecture/methodology-bmad-setup-mapping.md`
  - `packages/scripts/src/seed/methodology/setup/setup-bmad-mapping.ts`

  **Acceptance Criteria**:
  - [ ] Setup L2 rows match the locked draft snapshot and corrected shapes.
  - [ ] Setup condition sets and transition bindings carry neither `description` nor `guidance`.
  - [ ] No setup workflow steps or edges are seeded.
  - [ ] Setup metadata is registered under `slice_a_setup`.
- [ ] The setup template treats `project_root_directory` as runtime-optional via conditional fact rendering rather than unconditional interpolation.

  **QA Scenarios**:
  ```
  Scenario: Setup L2 packet matches the locked draft snapshot
    Tool: Bash
    Steps: Run a script that compares seeded setup L2 rows against the approved draft snapshot for ids/keys/fields/shapes.
    Expected: Script exits 0.
    Evidence: .sisyphus/evidence/task-6-setup-l2.txt

  Scenario: Setup excludes out-of-scope step/edge rows
    Tool: Bash
    Steps: Run a script that fails if any setup workflow-step or workflow-edge rows are produced.
    Expected: Script exits 0.
    Evidence: .sisyphus/evidence/task-6-setup-l2-error.txt
  ```

  **Commit**: YES | Message: `feat(seed): add setup l2 packet` | Files: [`packages/scripts/src/seed/methodology/setup/*`, `packages/scripts/src/seed/methodology/tables/*`]

- [x] 7. Seed `WU.BRAINSTORMING` L2 using the corrected shapes

  **What to do**: Seed the locked `WU.BRAINSTORMING` L2 rows from the approved draft snapshot after applying the corrected description/guidance model. This includes the work-unit facts, including replacing singular `objective` with plural `objectives` as a goal-oriented JSON fact with `cardinality: many`, updating `selected_directions` so its JSON sub-schema fields are `string + many` categorized lists with no scalar defaults, and updating `constraints` so `must_have`, `must_avoid`, and `timebox_notes` are list-valued string subfields. Plain string facts and string JSON sub-schema entries may contain markdown-authored content without introducing a separate markdown type. Also seed the single `done` state, single transition, condition sets without description/guidance, one bound primary `brainstorming` workflow, ten unbound `advanced_elicitation` support workflows, one artifact slot, and one artifact template. Treat the ten elicitation workflows as in-scope brainstorming support rows within Slice A, not as additional transition-bound primary workflows. Do not seed workflow steps or edges.
  **Must NOT do**: Collapse the 10 support workflows back into one umbrella workflow; bind support workflows to the completion transition; seed workflow steps/edges now.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: slice-specific canonical row authoring with many workflows.
  - Skills: [`test-driven-development`] — why: exact packet parity with the approved draft.
  - Omitted: [`dispatching-parallel-agents`] — why shared slice files and invariants.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 9,10,11 | Blocked By: 1,2,3,4,5

  **References**:
  - `.sisyphus/drafts/bmad-to-chiron-seeding-translation.md`
  - `_bmad/core/workflows/brainstorming/`
  - `_bmad/core/workflows/advanced-elicitation/methods.csv`

  **Acceptance Criteria**:
- [ ] Brainstorming L2 rows match the locked draft snapshot and corrected shapes, including `objectives` as the many-valued goal fact, `selected_directions` nested list-valued subfields, and `constraints.must_have` / `constraints.must_avoid` / `constraints.timebox_notes` as list-valued string subfields.
  - [ ] Only `brainstorming` is transition-bound; the ten elicitation workflows remain unbound.
  - [ ] Condition sets and bindings carry neither `description` nor `guidance`.
  - [ ] No brainstorming workflow steps or edges are seeded.

  **QA Scenarios**:
  ```
  Scenario: Brainstorming L2 packet matches the locked draft snapshot
    Tool: Bash
Steps: Run a script that compares seeded brainstorming rows against the approved draft snapshot for exact workflows, facts, slot/template, binding structure, the `objectives` fact cardinality/schema, and the `selected_directions` nested list-field schema.
    Expected: Script exits 0.
    Evidence: .sisyphus/evidence/task-7-brainstorming-l2.txt

  Scenario: Brainstorming support workflows remain unbound and step-free
    Tool: Bash
    Steps: Run a script that fails if any of the ten elicitation workflows appear in transition bindings or if any brainstorming workflow-step/edge rows exist.
    Expected: Script exits 0.
    Evidence: .sisyphus/evidence/task-7-brainstorming-l2-error.txt
  ```

  **Commit**: YES | Message: `feat(seed): add brainstorming l2 packet` | Files: [`packages/scripts/src/seed/methodology/brainstorming/*`, `packages/scripts/src/seed/methodology/tables/*`]

- [x] 8. Seed shared `WU.RESEARCH` L2 foundations using the corrected shapes

**What to do**: Seed the locked shared `WU.RESEARCH` L2 foundations from the approved draft snapshot after applying the corrected description/guidance model. This includes the shared work-unit facts, including `research_goals` as a goal-oriented JSON fact with `cardinality: many`, one `done` state, one transition, condition sets without description/guidance, one shared `research_report` slot, and three slot templates (`market`, `domain`, `technical`). Do not seed workflow steps or edges. Leave the three research workflow rows themselves to Task 9.
  **Must NOT do**: Split research into three work-unit types; add step/edge rows; use artifact-presence gating.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: establishes the shared research semantics once.
  - Skills: [`test-driven-development`] — why: protect the shared invariant layer before the workflow rows land.
  - Omitted: [`dispatching-parallel-agents`] — why centralized shared slice work.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 9,10,11 | Blocked By: 1,2,3,4,5

  **References**:
  - `.sisyphus/drafts/bmad-to-chiron-seeding-translation.md`
  - `_bmad/bmm/1-analysis/research/`
  - `docs/architecture/methodology-pages/dependency-definitions.md`

  **Acceptance Criteria**:
- [ ] Shared research L2 rows match the locked draft snapshot and corrected shapes, including `research_goals` as the many-valued goal fact.
  - [ ] `research_report` exists once with exactly the three locked templates.
  - [ ] Condition sets and bindings carry neither `description` nor `guidance`.
  - [ ] No workflow-step or workflow-edge rows are seeded.

  **QA Scenarios**:
  ```
  Scenario: Shared research L2 foundations match the locked draft snapshot
    Tool: Bash
Steps: Run a script that compares seeded shared research rows against the approved draft snapshot for facts, state, transition, slot, templates, and the `research_goals` fact cardinality/schema.
    Expected: Script exits 0.
    Evidence: .sisyphus/evidence/task-8-research-foundation.txt

  Scenario: Research foundations remain L2-only
    Tool: Bash
    Steps: Run a script that fails if any research workflow-step/edge rows or link-definition rows are produced by this task.
    Expected: Script exits 0.
    Evidence: .sisyphus/evidence/task-8-research-foundation-error.txt
  ```

  **Commit**: YES | Message: `feat(seed): add shared research l2 foundations` | Files: [`packages/scripts/src/seed/methodology/research/*`, `packages/scripts/src/seed/methodology/tables/*`]

- [x] 9. Seed the three research workflow rows and bindings without steps/edges

  **What to do**: Seed the locked `market_research`, `domain_research`, and `technical_research` workflow rows plus their explicit transition bindings using the corrected description/guidance model and the approved draft snapshot. Keep all three on the shared `WU.RESEARCH` lifecycle and shared slot/template foundations from Task 8. Do not seed workflow steps or edges; this task ends at L2 workflow rows and bindings only.
  **Must NOT do**: Add workflow steps/edges; fork shared research semantics; add market/domain/technical-specific states, transitions, or slots.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: workflow-row authoring on top of shared research foundations.
  - Skills: [`test-driven-development`] — why: exact deterministic workflow row assertions.
  - Omitted: [`dispatching-parallel-agents`] — why shared files and invariants.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 10,11 | Blocked By: 1,2,3,4,5,6,8

  **References**:
  - `.sisyphus/drafts/bmad-to-chiron-seeding-translation.md`
  - `_bmad/_config/workflow-manifest.csv`
  - `_bmad/bmm/1-analysis/research/`

  **Acceptance Criteria**:
  - [ ] All three research workflows exist with corrected shapes and explicit bindings.
  - [ ] All three reuse the shared `WU.RESEARCH` foundations only.
  - [ ] No workflow-step or workflow-edge rows are seeded.
  - [ ] The workflow purposes match the locked market/domain/technical distinctions.

  **QA Scenarios**:
  ```
  Scenario: Research workflow rows match the locked draft snapshot
    Tool: Bash
    Steps: Run a script that compares the three seeded research workflow rows and bindings against the approved draft snapshot.
    Expected: Script exits 0.
    Evidence: .sisyphus/evidence/task-9-research-workflows.txt

  Scenario: Research workflows remain L2-only
    Tool: Bash
    Steps: Run a script that fails if any workflow-step or workflow-edge rows exist for `market_research`, `domain_research`, or `technical_research`.
    Expected: Script exits 0.
    Evidence: .sisyphus/evidence/task-9-research-workflows-error.txt
  ```

  **Commit**: YES | Message: `feat(seed): add research workflow rows` | Files: [`packages/scripts/src/seed/methodology/research/*`, `packages/scripts/src/seed/methodology/tables/*`]

- [x] 10. Replace empty-slice integrity assumptions with exact L1/L2 deterministic assertions

  **What to do**: Rewrite the seed integrity tests so they assert the fully populated L1/L2 Slice-A shape after the refactor-first rollout. The tests must assert the methodology definition, one draft version, one active version, exact slice metadata, deterministic IDs/counts for all populated L1/L2 canonical tables, corrected `description` / `guidance` ownership, first-class fact cardinality on methodology/work-unit facts, the exact workflow split of 5 primary workflows plus 10 brainstorming support workflows, and the absence of workflow steps/edges in this plan’s seed output. Define and assert one shared deterministic ID/key policy for Slice-A rows so implementers do not invent naming conventions ad hoc.
  **Must NOT do**: Leave empty-table assumptions for populated Slice-A tables; use broad snapshots that can hide field-shape regressions; accidentally re-allow description/guidance on condition sets or bindings.

  **Recommended Agent Profile**:
  - Category: `quick` — Reason: focused deterministic test updates.
  - Skills: [`test-driven-development`] — why: integrity assertions are the safety net for the whole plan.
  - Omitted: [`dispatching-parallel-agents`] — why not needed.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 11 | Blocked By: 4,5,6,7,8,9

  **References**:
  - `packages/scripts/src/tests/seeding/methodology-seed-integrity.test.ts`
  - `packages/scripts/src/tests/seeding/manual-seed-fixtures.test.ts`
  - `packages/scripts/src/seed/methodology/index.ts`
  - `.sisyphus/drafts/bmad-to-chiron-seeding-translation.md`

  **Acceptance Criteria**:
  - [ ] Integrity tests assert one methodology definition, one draft version, and one active version.
  - [ ] Integrity tests assert deterministic IDs/counts for all populated L1/L2 canonical tables.
  - [ ] Integrity tests assert corrected metadata ownership and absence on condition sets/bindings.
- [ ] Integrity tests assert first-class fact cardinality plus the `objectives` and `research_goals` many-valued fact redesigns, and nested JSON sub-schema cardinality on `selected_directions`.
  - [ ] Integrity tests assert the exact workflow inventory: 5 primary workflows plus 10 brainstorming support workflows.
  - [ ] Integrity tests assert absence of workflow-step and workflow-edge rows.

  **QA Scenarios**:
  ```
  Scenario: L1/L2 integrity assertions pass end-to-end
    Tool: Bash
    Steps: Run `bunx vitest run packages/scripts/src/tests/seeding/manual-seed-fixtures.test.ts packages/scripts/src/tests/seeding/methodology-seed-integrity.test.ts`.
    Expected: Both tests pass.
    Evidence: .sisyphus/evidence/task-10-integrity-tests.txt

  Scenario: Step/edge and ownership regressions are blocked
    Tool: Bash
    Steps: Run grep/script checks against the integrity test and seed registry to ensure workflow-step/edge absence and no description/guidance on condition sets/bindings.
    Expected: Script exits 0.
    Evidence: .sisyphus/evidence/task-10-integrity-tests-error.txt
  ```

  **Commit**: YES | Message: `test(seed): assert deterministic l1-l2 integrity` | Files: [`packages/scripts/src/tests/seeding/methodology-seed-integrity.test.ts`, `packages/scripts/src/tests/seeding/manual-seed-fixtures.test.ts`]

- [x] 11. Add integration coverage for the updated seeding procedure, dual versions, and reseed behavior

  **What to do**: Add or update integration-focused tests so the real seed pipeline proves the updated seeding procedure works with the corrected L1/L2 shapes, one methodology definition, one draft version, one active version, forbidden-extension compliance, FK-safe canonical table ordering, and intended reseed semantics. Explicitly verify that the existing seeding procedure now conforms to the approved data model instead of only the old baseline assumptions.
  **Must NOT do**: Add a second seed pipeline; treat `definitionExtensions` as fallback storage; silently relax ordering/version failures.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: integration-level seed pipeline verification.
  - Skills: [`test-driven-development`] — why: locks real pipeline behavior before later L3 work.
  - Omitted: [`systematic-debugging`] — why not needed unless these tests fail.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: F1-F4 | Blocked By: 10

  **References**:
  - `packages/scripts/src/tests/seeding/seed-error-handling.test.ts`
  - `packages/db/src/tests/repository/methodology-repository.integration.test.ts`
  - `packages/scripts/src/seed/methodology/index.ts`
  - `package.json`
  - `packages/scripts/package.json`

  **Acceptance Criteria**:
  - [ ] Integration tests prove the updated seeding procedure can seed the refined methodology definition plus draft/active versions.
  - [ ] Integration tests prove canonical Slice-A data does not rely on forbidden `definitionExtensions` keys.
  - [ ] Integration tests prove FK-safe canonical table ordering and intended reseed behavior.
  - [ ] Integration tests prove the pipeline remains L1/L2-only for this plan.

  **QA Scenarios**:
  ```
  Scenario: Real seed pipeline passes l1-l2 integration checks
    Tool: Bash
    Steps: Run `bunx vitest run packages/scripts/src/tests/seeding/seed-error-handling.test.ts packages/scripts/src/tests/seeding/methodology-seed-integration.test.ts && bun run db:seed:test:reset`.
    Expected: Tests pass and reset seeding succeeds.
    Evidence: .sisyphus/evidence/task-11-seed-integration.txt

  Scenario: Updated procedure conforms to approved model
    Tool: Bash
    Steps: Run a Bun script that inspects the seeded output and fails if old baseline-only assumptions, forbidden extension keys, or workflow-step/edge rows appear.
    Expected: Script exits 0.
    Evidence: .sisyphus/evidence/task-11-seed-integration-error.txt
  ```

  **Commit**: YES | Message: `test(seed): verify l1-l2 dual-version seeding` | Files: [`packages/scripts/src/tests/seeding/methodology-seed-integration.test.ts`, `packages/scripts/src/tests/seeding/seed-error-handling.test.ts`, `packages/db/src/tests/repository/methodology-repository.integration.test.ts`]

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [ ] F1. Plan Compliance Audit — oracle
- [ ] F2. Code Quality Review — unspecified-high
- [ ] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [ ] F4. Scope Fidelity Check — deep

## Commit Strategy
- Commit after Task 1 to freeze authority before refactoring data ownership
- Commit after Task 2 for the cross-surface description/guidance refactor
- Commit after Task 3 when the existing seeding procedure is aligned to the corrected model
- Commit after each deterministic seed packet group (L1 foundation, agents, setup, brainstorming, research)
- End with one verification-focused commit for integrity/integration hardening only

## Success Criteria
- L1/L2 descriptive metadata ownership is corrected across contracts, schema, frontend, serializers, and seeding
- One refined methodology definition plus one draft version and one active version are seeded from the same Slice-A canonical dataset
- Setup, brainstorming, and research are represented as canonical L1/L2 seed packets with deterministic IDs and no authority gaps
- All 5 primary workflows exist at L2 with explicit bindings/condition sets, and the 10 brainstorming support workflows exist as unbound in-scope support rows, while workflow steps/edges remain intentionally absent for the later plan
- Seed integrity/integration tests prove populated L1/L2 rows, corrected field shapes, dual-version seeding, forbidden-extension compliance, and reseed behavior
