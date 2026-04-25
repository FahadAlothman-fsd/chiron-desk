# Chiron BMAD Seeded Track Master Plan

## TL;DR
> **Summary**: Replace the stale docs/survey planning with one truth-first master plan that implements the active BMad Method seeded path in Chiron through Architecture, keeps Taskflow as the concrete pre-implementation example, and explicitly defers post-architecture seed work for a later extension.
> **Deliverables**:
> - BMAD-native → Chiron mapping matrix and canonical seeded path contract
> - Extended methodology seed covering analysis, planning, and solutioning through Architecture
> - In-app methodology seed trigger with idempotent project seeding behavior
> - Explicit defer-later contract for post-architecture seed work
> - Supersession map for stale plans and docs assumptions
> **Effort**: XL
> **Parallel**: YES - 2 active waves
> **Critical Path**: 1 → 2/3/4 → 5/6/7

## Context
### Original Request
- Consolidate the current plan situation into a replacement planning approach.
- The target is the **BMad Method** track specifically, not a generic Chiron walkthrough.
- Preserve BMAD semantics first, then map them into Chiron work units, workflows, transitions, and docs.
- The seeded methodology for this branch must cover the BMAD path only through Architecture using Taskflow as the concrete example.
- Add an in-app action so a user can seed that methodology into their project.
- The current docs-site plan is mostly implemented structurally but inaccurate in content.

### Interview Summary
- The desired BMAD path for this branch is: analysis (`brainstorming`, `research`, `product-brief`) → planning (`PRD`, optional `UX`) → solutioning (`architecture`).
- Plan 1 intent from the interview became: implement the seeded BMAD track plus the in-app seed trigger.
- The active scope is now intentionally cut short at Architecture; later BMAD seed work will be added in a follow-on extension.
- Taskflow should be the concrete narrative for the seeded BMAD path, not a generic placeholder example.
- Existing docs/site and survey work are preserved as later follow-on scope, not part of this branch's completion target.

### Repo Truth
- Current methodology seed lives under `packages/scripts/src/seed/methodology/**`, centered on `setup-bmad-mapping.ts`.
- Current seeded BMAD coverage reaches `setup`, `brainstorming`, and `research` only.
- Current end-to-end tested evidence in this branch only covers the `setup` work unit; anything beyond setup remains planned or partially modeled rather than proven.
- Runtime proof surfaces already exist in `packages/db/src/runtime-repositories/*` for agent execution state, harness bindings, and applied writes.
- Docs app reality is **Astro + Starlight** under `apps/docs`, not VitePress.
- Current public Taskflow docs exist, but they describe a broader/generic path than the actual seeded BMAD implementation supports today.
- Survey scaffolding already exists in `apps/docs/src/pages/survey.astro` and related docs-site API routes.

### Metis Review (gaps addressed)
- Added a mandatory **BMAD-native → Chiron mapping matrix** so public docs and seed implementation do not drift apart.
- Added a **defer-later boundary** so post-architecture BMAD stages are preserved without being implied complete in this branch.
- Added a **seed contract split** between required design-time seeding and optional deterministic runtime/demo fixtures.
- Added a **supersession map** so old VitePress-era plan assumptions and stale docs content stop misleading future agents.
- Added a **scope freeze** so docs/survey/runtime follow-ons cannot overclaim beyond the Architecture boundary.

### Oracle Review (gaps addressed)
- Locked the active completion boundary to: analysis artifacts complete → planning artifacts complete → Architecture completed once in Chiron.
- Kept UX as an explicit optional branch with a named rejoin point instead of letting it silently become mandatory.
- Required docs truth tagging: `seeded and demonstrated`, `manually supported`, or `planned/not yet implemented`.
- Added non-goals so the work does not expand into Quick Flow, Enterprise, or generalized methodology import.

### Supersession Map
- **Supersedes**: `.sisyphus/plans/chiron-documentation-site.md`
- **Supersedes**: `.sisyphus/plans/chiron-thesis-survey-experiment.md` where it depends on a generic/stale onboarding/docs/methodology path
- **Keeps as historical seed context only**: `.sisyphus/plans/bmad-to-chiron-seeding-slice-a.md`
- **Keeps as historical runtime-seed context only**: `.sisyphus/plans/setup-invoke-phase-1-seed-spec.md`

## Work Objectives
### Core Objective
Implement a truthful BMad Method seeded track in Chiron that preserves BMAD semantics, can be seeded from the app into a project, and reaches Architecture as the active completion boundary for this branch while explicitly deferring post-architecture seed work.

### Deliverables
- Canonical BMAD happy-path contract and Chiron mapping matrix
- Extended methodology seed for all required active BMAD stages through Architecture
- Explicit optional UX branch with rejoin rules
- Deterministic IDs/rows across methodology seed tables and registries
- Required seed contract for the active pre-implementation path
- In-app project-level methodology seed action
- Taskflow verification path through Architecture
- Deferred follow-on contract for Backlog, Story, runtime-proof, docs rewrite, and survey work
- Stale plan/docs supersession notes and README/docs alignment

### Definition of Done (verifiable conditions with commands)
- The repository contains a single authoritative BMAD-native → Chiron mapping matrix covering all required active stages from analysis through Architecture.
- The methodology seed includes first-class BMAD-stage coverage for product brief, PRD, optional UX, and architecture, while preserving current setup/brainstorming/research coverage.
- The seeded flow supports one canonical happy path plus an explicit optional UX branch with a documented rejoin point.
- A user can seed the BMAD methodology into a project from the app without CLI-only dependency and without duplicate/ambiguous reseeding behavior.
- Taskflow verification proves the active seeded path through Architecture.
- Post-architecture BMAD stages are explicitly recorded as deferred, not silently removed.
- Verification commands pass:
  - `bun run check-types`
  - `bun run build`
  - `bun run test`

### Must Have
- BMAD-native terminology and workflow order preserved before Chiron mapping
- One canonical BMAD Method happy path through Architecture
- UX represented as optional, not silently mandatory
- Required seed separated from optional demo/runtime fixtures
- In-app project seed trigger with deterministic/idempotent behavior
- Post-architecture stages explicitly deferred rather than implied complete
- Taskflow verification through Architecture
- Explicit supersession handling for stale plans and framework assumptions

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- No Quick Flow, Enterprise, or generalized “support all BMAD variants” scope
- No generic Taskflow storytelling disconnected from the actual seeded BMAD path
- No VitePress assumptions in docs planning or verification
- No survey rollout or docs truth rewrite bundled into this branch's active completion target
- No conflation of design-time seed completion with post-architecture runtime completeness
- No requirement that UX be completed for the canonical happy path to remain valid
- No hidden/manual CLI-only path for normal seeded-methodology onboarding
- No vague “post-architecture is seeded” claims without a later follow-on plan and verification

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: **tests-after** using existing Bun/Vitest/Playwright/docs test commands
- QA policy: Every task includes agent-executed verification and evidence
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`
- Verification gates:
  - **Seed gate**: seeded stages/workflows/artifacts exist and are discoverable by automated inspection/tests
  - **Architecture gate**: the seeded path reaches Architecture with deterministic design-time and Taskflow verification
  - **Deferral gate**: any post-architecture BMAD stage is tagged deferred for later seed work and cannot be claimed as complete in this branch

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.

Wave 1: BMAD truth foundation and seed contract (Tasks 1-5)
Wave 2: Seed/app implementation through Architecture (Tasks 6-7)

### Dependency Matrix (full, all tasks)
- 1 blocks 2, 3, 4, 6, 7
- 2 blocks 4, 6, 7
- 3 blocks 6, 7
- 4 blocks 6, 7
- 5 blocks 6, 7
- 6 blocks 7

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 5 tasks → deep, writing, unspecified-high
- Wave 2 → 2 tasks → unspecified-high, visual-engineering

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [ ] 1. Freeze the canonical BMAD happy path, mapping matrix, and supersession contract

  **What to do**: Create the single authoritative contract for this milestone before touching any seed rows or docs. Define the canonical BMAD Method happy path in BMAD-native terms first: `brainstorming` / `research` / `product-brief` → `create-prd` → optional `create-ux-design` branch → `create-architecture`. Then add a separate BMAD-native → Chiron mapping matrix covering stage, work unit type, workflow(s), primary artifacts, key transitions, and the explicit defer-later boundary after Architecture. Include a supersession matrix that marks the old docs plan and generic survey assumptions as historical, not authoritative.
  **Must NOT do**: Do not start from Chiron entity names and retrofit BMAD semantics afterward. Do not leave old plans with ambiguous authority. Do not add Quick Flow, Enterprise, or non-main-track branches.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: this is the authority contract that every downstream implementation and docs change depends on.
  - Skills: `[]` - Repo exploration and synthesis are sufficient.
  - Omitted: [`bmad-create-epics-and-stories`] - This is planning the track, not executing a BMAD workflow.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [2, 3, 4, 6, 7] | Blocked By: []

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `packages/scripts/src/seed/methodology/setup/setup-bmad-mapping.ts` - Current seeded BMAD scope baseline (setup, brainstorming, research).
  - Pattern: `packages/scripts/src/seed/methodology/index.ts` - Seed registry and slice export surface.
  - Pattern: `.sisyphus/plans/chiron-documentation-site.md` - Historical plan to supersede.
  - Pattern: `.sisyphus/plans/chiron-thesis-survey-experiment.md` - Historical survey plan to realign behind seeded-flow gates.
  - External: `https://docs.bmad-method.org/reference/workflow-map/` - Canonical BMAD phase/workflow order.
  - External: `https://docs.bmad-method.org/tutorials/getting-started/` - Canonical BMAD Method track framing and outputs.

  **Acceptance Criteria** (agent-executable only):
  - [ ] One authoritative artifact exists that enumerates the canonical BMAD happy path through `create-architecture` and marks UX as optional.
  - [ ] The artifact contains a BMAD-native → Chiron mapping matrix for every required stage.
  - [ ] The artifact contains an explicit supersession section naming the stale plans/files it replaces or demotes.
  - [ ] The artifact excludes Quick Flow, Enterprise, and generic “all of BMAD” expansion.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Mapping matrix and supersession contract exist
    Tool: Bash
    Steps: Run `grep -R "BMAD-native" -n .sisyphus docs apps/docs README.md && grep -R "Supersedes" -n .sisyphus docs apps/docs README.md`.
    Expected: A single authoritative artifact contains both the mapping matrix and the supersession section.
    Evidence: .sisyphus/evidence/task-1-bmad-mapping-matrix.txt

  Scenario: Out-of-scope tracks are excluded
    Tool: Bash
    Steps: Run `grep -R "Quick Flow\|Enterprise" -n .sisyphus docs apps/docs README.md` and verify any matches are explicitly marked out-of-scope or historical.
    Expected: No active implementation contract includes Quick Flow or Enterprise in the canonical seeded path.
    Evidence: .sisyphus/evidence/task-1-bmad-mapping-matrix-error.txt
  ```

  **Commit**: YES | Message: `docs(plan): freeze bmad seeded track authority` | Files: `.sisyphus/plans/*`, supporting authority docs/notes if needed

- [ ] 2. Define the missing BMAD-stage work unit taxonomy, artifacts, and non-goals

  **What to do**: Extend the methodology design contract so the missing active BMAD stages become first-class, named, non-ambiguous Chiron entities. Add the work unit/workflow/artifact taxonomy for `product-brief`, `create-prd`, optional `create-ux-design`, and `create-architecture`. For each, define: work unit type key, primary workflow key(s), core artifact outputs, required inputs, dependency relationships, and whether the stage is required or optional. Add explicit defer-later notes for `create-epics-and-stories`, `check-implementation-readiness`, `sprint-planning`, `create-story`, `dev-story`, and `code-review`.
  **Must NOT do**: Do not collapse multiple BMAD stages into one generic “planning” or “implementation” work unit. Do not make optional UX silently required. Do not leave artifact outputs underspecified.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: this is cross-cutting design-time modeling with many downstream dependencies.
  - Skills: `[]` - Existing methodology schema patterns are enough.
  - Omitted: [`effect-best-practices`] - This is schema/model planning, not Effect service design.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: [4, 6, 7] | Blocked By: [1]

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `packages/db/src/schema/methodology.ts` - Canonical methodology storage surfaces to mirror.
  - Pattern: `packages/contracts/src/methodology/*.ts` - Methodology contract shapes and naming conventions.
  - Pattern: `packages/scripts/src/seed/methodology/setup/setup-bmad-mapping.ts` - Existing work unit / workflow / artifact naming approach.
  - Pattern: `docs/architecture/methodology-bmad-setup-mapping.md`
  - Pattern: `docs/architecture/methodology-bmad-brainstorming-mapping.md`
  - Pattern: `docs/architecture/methodology-bmad-research-mapping.md`
  - External: `https://docs.bmad-method.org/reference/workflow-map/` - BMAD stage/workflow inventory.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Every active BMAD stage through `create-architecture` has an explicit work unit/workflow/artifact contract.
  - [ ] UX is marked optional with a documented rejoin point into the canonical happy path.
  - [ ] Non-goals are explicitly recorded and exclude extra BMAD tracks/features.
  - [ ] The design contract distinguishes required inputs from produced outputs for every stage.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Missing BMAD stages are fully enumerated
    Tool: Bash
    Steps: Run `grep -R "product-brief\|create-prd\|create-ux-design\|create-architecture" -n packages docs .sisyphus`.
    Expected: Each active BMAD stage appears in the authoritative design contract with no placeholders, and later stages are explicitly marked deferred.
    Evidence: .sisyphus/evidence/task-2-bmad-taxonomy.txt

  Scenario: Optional UX branch stays optional
    Tool: Read
    Steps: Inspect the design contract and verify UX has an explicit optional branch marker and named rejoin point.
    Expected: The canonical happy path remains valid if UX is skipped.
    Evidence: .sisyphus/evidence/task-2-bmad-taxonomy-error.md
  ```

  **Commit**: YES | Message: `feat(methodology): define bmad stage taxonomy` | Files: `packages/contracts/src/methodology/*`, `packages/db/src/schema/methodology.ts`, seed design docs

- [ ] 3. Define lifecycle states, transitions, and completion gates through Architecture

  **What to do**: Define the state/transition model for the active BMAD path, including the exact Architecture completion boundary. The canonical required completion rule is: analysis artifacts complete → planning artifacts complete → Architecture completed once in Chiron. Add lifecycle states, transition keys, prerequisites, and gating rules for required vs optional stages. Create a defer-later gate table that names the post-architecture BMAD stages that will be added in a later seed extension.
  **Must NOT do**: Do not leave “architecture complete” ambiguous. Do not imply post-architecture runtime support in this branch. Do not merge design-time completion with later runtime-proof scope.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: transition and gating semantics determine whether the whole plan is truthful.
  - Skills: `[]` - Repo runtime surfaces provide enough authority.
  - Omitted: [`hono`] - This is not route/framework-specific planning.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: [6, 7] | Blocked By: [1]

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `packages/db/src/schema/runtime.ts` - Runtime execution/state surfaces that must support the story cycle.
  - Pattern: `packages/db/src/runtime-repositories/step-execution-repository.ts` - Step execution and workflow context state ownership.
  - Pattern: `packages/db/src/runtime-repositories/agent-step-execution-state-repository.ts`
  - Pattern: `packages/db/src/runtime-repositories/agent-step-execution-harness-binding-repository.ts`
  - Pattern: `packages/db/src/runtime-repositories/agent-step-execution-applied-write-repository.ts`
  - Pattern: `packages/scripts/src/seed/methodology/setup/setup-invoke-phase-1-fixture.ts` - Current seeded runtime-step precedent.
  - Pattern: `README.md` and `apps/docs/src/content/docs/**` - Existing claim policy / not-fully-implemented caveats to reconcile.

  **Acceptance Criteria** (agent-executable only):
  - [ ] The Architecture completion rule is explicitly defined and unambiguous.
  - [ ] Each required stage/transition has named prerequisites and completion outcomes.
  - [ ] A defer-later gate table exists for each post-architecture BMAD stage being postponed.
  - [ ] Any post-architecture requirement is explicitly converted into named deferred follow-on scope.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Architecture boundary is explicit
    Tool: Read
    Steps: Inspect the lifecycle contract and verify that active completion ends at Architecture rather than any Story/Backlog runtime loop.
    Expected: No alternate interpretation of the active branch boundary remains.
    Evidence: .sisyphus/evidence/task-3-architecture-gate.md

  Scenario: Deferred post-architecture scope is surfaced, not hidden
    Tool: Bash
    Steps: Run `grep -R "deferred\|follow-on\|post-architecture" -n .sisyphus docs README.md packages`.
    Expected: The implementation contract explicitly names later scope instead of silently assuming support.
    Evidence: .sisyphus/evidence/task-3-architecture-gate-error.txt
  ```

  **Commit**: YES | Message: `feat(methodology): define bmad architecture boundary` | Files: methodology contracts, runtime design docs, seed mapping docs

- [ ] 4. Register deterministic seed rows and IDs across the methodology tables for the full BMAD path

  **What to do**: Implement the design-time seed expansion for the new BMAD stages. Add deterministic IDs/keys and table rows across the canonical methodology seed modules so the new work units, workflows, transitions, facts, condition sets, artifact slots, templates, and bindings are seeded reproducibly. Update the seed registry/export surfaces so the full BMAD path becomes part of canonical methodology seeding rather than ad hoc fixture logic.
  **Must NOT do**: Do not tuck core BMAD stages into runtime-only demo fixtures. Do not introduce nondeterministic IDs. Do not split canonical seed ownership across multiple disconnected registries.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: this is broad canonical seed-table work touching many related modules.
  - Skills: `[]` - Existing seed table patterns are sufficient.
  - Omitted: [`turborepo`] - Package/task orchestration is not the main problem here.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: [6, 7, 8, 9, 10, 11, 12] | Blocked By: [1, 2]

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `packages/scripts/src/seed/methodology/tables/index.ts` - Canonical seed-table export surface.
  - Pattern: `packages/scripts/src/seed/methodology/index.ts` - Seed registry wiring.
  - Pattern: `packages/scripts/src/seed/methodology/setup/setup-bmad-mapping.ts` - Deterministic ID/key precedent.
  - Pattern: `packages/scripts/src/seed/methodology/tables/*.ts` - Canonical table row module patterns.
  - Pattern: `packages/db/src/schema/methodology.ts` - Table ownership and expected entities.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Canonical seed rows exist for every active BMAD stage through `create-architecture`.
  - [ ] IDs/keys are deterministic and follow existing seed conventions.
  - [ ] The seed registry includes the expanded BMAD path without requiring runtime/demo fixtures.
  - [ ] Seeding the methodology produces a reproducible design-time graph.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Expanded BMAD seed is discoverable in canonical tables
    Tool: Bash
    Steps: Run `grep -R "productBrief\|prd\|ux\|architecture" -n packages/scripts/src/seed/methodology`.
    Expected: Canonical seed modules contain rows for all active BMAD stages, and later stages remain absent or clearly deferred.
    Evidence: .sisyphus/evidence/task-4-seed-rows.txt

  Scenario: Seed registry is canonical, not fixture-dependent
    Tool: Bash
    Steps: Run `grep -R "methodologyCanonicalTableSeedRows\|methodologySeedSlices" -n packages/scripts/src/seed/methodology` and inspect references.
    Expected: The expanded path is reachable from the canonical registry rather than only demo fixtures.
    Evidence: .sisyphus/evidence/task-4-seed-rows-error.txt
  ```

  **Commit**: YES | Message: `feat(methodology): seed canonical bmad path` | Files: `packages/scripts/src/seed/methodology/**`

- [ ] 5. Split required seed from optional runtime/demo fixture pack

  **What to do**: Create a clear contract separating the required design-time methodology seed for the active pre-implementation path from later optional follow-on seed/runtime additions. The required seed must be enough to install the BMAD path into a project through Architecture. Document exactly which artifacts are seeded now, which later BMAD stages are deferred, and how reseeding behaves.
  **Must NOT do**: Do not make future Story/Backlog work a hidden prerequisite for the current branch. Do not leave reseed behavior ambiguous.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: this is a critical scope boundary between core product behavior and demo/runtime proof support.
  - Skills: `[]` - Existing runtime and seed patterns provide enough authority.
  - Omitted: [`review-work`] - This is execution planning, not post-implementation review.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: [8, 9, 10, 11, 12, 14] | Blocked By: [1, 4]

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `packages/scripts/src/seed/methodology/setup/setup-invoke-phase-1-fixture.ts` - Existing deterministic runtime fixture precedent.
  - Pattern: `packages/scripts/src/seed/methodology/setup/brainstorming-demo-fixture.ts`
  - Pattern: `packages/scripts/src/seed/methodology/setup/slice-1-demo-fixture.ts`
  - Pattern: `packages/db/src/runtime-repositories/*` - Runtime evidence surfaces that fixture data may target.
  - Pattern: `apps/docs/src/content/docs/taskflow/**` - Public docs/screenshots that need deterministic proof inputs.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Required methodology seed and optional fixture pack are explicitly separated.
  - [ ] The contract lists the exact post-architecture seed/runtime additions that are deferred and why.
  - [ ] Reseeding/idempotence behavior is documented for both the required seed and the optional fixture pack.
  - [ ] Later seed work can extend the plan without redefining the current architecture-terminal semantics.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Seed and fixture responsibilities are separated
    Tool: Read
    Steps: Inspect the seed contract and verify required current seed vs deferred later seed are distinct sections with separate responsibilities.
    Expected: No core methodology dependency relies on post-architecture work.
    Evidence: .sisyphus/evidence/task-5-seed-fixture-split.md

  Scenario: Reseed behavior is explicit
    Tool: Bash
    Steps: Run `grep -R "idempotent\|reseed\|deferred\|required seed" -n .sisyphus docs packages/scripts`.
    Expected: The contract explicitly defines how duplicate seeding and later follow-on work are handled.
    Evidence: .sisyphus/evidence/task-5-seed-fixture-split-error.txt
  ```

  **Commit**: YES | Message: `feat(methodology): split active seed from deferred follow-on` | Files: seed docs/specs, seed orchestration notes

- [ ] 6. Add the in-app BMAD methodology seed trigger with project-scoped idempotence

  **What to do**: Implement the primary in-app entrypoint for seeding the BMAD methodology into a project in `apps/web/src/routes/projects.new.tsx`, immediately after project creation and before the user is dropped into an unseeded workflow. Add no second primary entrypoint in this milestone. If a secondary recovery link is needed later, it may appear in `apps/web/src/routes/projects.tsx` as a clearly-labeled fallback only after the primary path is stable. The seed action must be project-scoped, deterministic, and idempotent: it should install the BMAD seeded methodology once, report current status clearly, and avoid duplicate partial installs. Document how it behaves on a brand-new project, an already-seeded project, and a partially-seeded/error-retry state.
  **Must NOT do**: Do not make normal user onboarding depend on CLI-only seeding. Do not add multiple equally-primary entrypoints. Do not let reseeding create duplicate methodology versions or ambiguous runtime state.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: the seed action is a user-facing workflow entrypoint with stateful UX implications.
  - Skills: `[]` - Existing app UI patterns should be reused.
  - Omitted: [`create-auth-skill`] - Authentication is not the concern here.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [7] | Blocked By: [1, 3, 4]

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `apps/web/src/routes/projects.tsx` - Candidate project-level entry surface.
  - Pattern: `apps/web/src/routes/projects.new.tsx` - Candidate creation-time entry surface.
  - Pattern: `packages/scripts/src/seed/methodology/index.ts` - Seed orchestration/export surface.
  - Pattern: `packages/scripts/src/seed/methodology/setup/setup-bmad-mapping.ts` - Methodology being installed.
  - Pattern: `packages/db/src/schema/methodology.ts` - Persistence surfaces that must not duplicate.

  **Acceptance Criteria** (agent-executable only):
  - [ ] One primary in-app entrypoint exists for BMAD methodology seeding.
  - [ ] Seeding is project-scoped and idempotent.
  - [ ] Already-seeded and retry/error states produce deterministic user-visible outcomes.
  - [ ] CLI-only setup is no longer required for the normal seeded-methodology path.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: New project can seed BMAD from the app
    Tool: Playwright
    Steps: Create/open a project, invoke the primary BMAD seed trigger, and observe the resulting project state.
    Expected: The project becomes BMAD-seeded exactly once with clear success status.
    Evidence: .sisyphus/evidence/task-6-in-app-seed.png

  Scenario: Re-triggering does not duplicate or corrupt the seed
    Tool: Playwright
    Steps: Revisit the same project and activate the seed trigger again or reload during/after completion.
    Expected: The app reports already seeded or safe retry behavior without duplicate methodology installation.
    Evidence: .sisyphus/evidence/task-6-in-app-seed-error.png
  ```

  **Commit**: YES | Message: `feat(app): add in-app bmad methodology seeding` | Files: `apps/web/src/routes/*`, seed integration modules, project onboarding surfaces

- [ ] 7. Implement the missing analysis/planning/solutioning BMAD path inside the seeded methodology

  **What to do**: Extend the actual seeded path so the methodology can move from the currently implemented early slice into the missing BMAD stages through Architecture. This includes the design-time and flow-level coverage for `product-brief`, `create-prd`, optional `create-ux-design`, and `create-architecture`, with correct artifacts, prerequisites, transitions, and rejoin behavior. Ensure the outputs of analysis feed planning and planning feeds solutioning, then stop the active branch scope at Architecture.
  **Must NOT do**: Do not add these stages as disconnected catalog items with no flow continuity. Do not let UX become mandatory. Do not imply Backlog/Story/runtime-proof coverage in this branch.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: this is the core methodology expansion that determines whether the seeded BMAD track is complete.
  - Skills: `[]` - The seed and methodology patterns are already in-repo.
  - Omitted: [`bmad-create-prd`] - This task is about modeling the workflow path, not running the workflow.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [] | Blocked By: [2, 3, 4, 6]

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `packages/scripts/src/seed/methodology/setup/setup-bmad-mapping.ts` - Existing early-stage BMAD path conventions.
  - Pattern: `packages/db/src/schema/methodology.ts` - Work unit / workflow / transition schema surfaces.
  - Pattern: `packages/contracts/src/methodology/*.ts` - Contract naming and shape authority.
  - External: `https://docs.bmad-method.org/explanation/analysis-phase/` - Analysis phase semantics and outputs.
  - External: `https://docs.bmad-method.org/reference/workflow-map/` - Planning/solutioning stage order and outputs.

  **Acceptance Criteria** (agent-executable only):
  - [ ] The seeded methodology includes every required active BMAD stage from analysis through `create-architecture`.
  - [ ] Stage outputs feed the correct downstream stages.
  - [ ] UX remains optional with an explicit rejoin point.
  - [ ] The active branch stops at Architecture and records later BMAD stages as deferred follow-on work.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: BMAD path reaches Architecture gate
    Tool: Bash
    Steps: Run `grep -R "product-brief\|create-prd\|create-ux-design\|create-architecture" -n packages/scripts/src/seed/methodology packages/contracts packages/db`.
    Expected: The seeded methodology graph includes all required active BMAD stages through Architecture.
    Evidence: .sisyphus/evidence/task-7-architecture-path.txt

  Scenario: Post-architecture scope stays deferred
    Tool: Read
    Steps: Inspect the seeded flow contract and verify that Backlog/Story stages are explicitly deferred after Architecture.
    Expected: The canonical path cannot silently continue beyond Architecture in this branch.
    Evidence: .sisyphus/evidence/task-7-architecture-path-error.md
  ```

  **Commit**: YES | Message: `feat(methodology): extend bmad path through architecture` | Files: methodology seed modules, contracts, docs/spec helpers

- [ ] 8. Deferred follow-on: add post-architecture BMAD stages in a later seed extension

  > Historical follow-on task body retained below as planning context only. It is not active for this branch.

  **What to do**: Keep `create-epics-and-stories`, `check-implementation-readiness`, `sprint-planning`, `create-story`, `dev-story`, `code-review`, docs truth rewrites, and survey rebasing out of the active branch scope. Preserve them only as explicitly deferred follow-on work for a later seed extension.
  **Must NOT do**: Do not delete the downstream intent. Do not imply these stages are already seeded or verified. Do not let later scope leak back into the active completion target.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: this is a scope-boundary and defer-later documentation task.
  - Skills: `[]`
  - Omitted: [`opencode-sdk`] - No runtime implementation belongs in this branch.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: [] | Blocked By: [7]

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `packages/db/src/schema/runtime.ts` - Runtime execution entities that must reflect the story cycle.
  - Pattern: `packages/db/src/runtime-repositories/agent-step-execution-state-repository.ts`
  - Pattern: `packages/db/src/runtime-repositories/agent-step-execution-harness-binding-repository.ts`
  - Pattern: `packages/db/src/runtime-repositories/agent-step-execution-applied-write-repository.ts`
  - Pattern: `packages/scripts/src/seed/methodology/setup/setup-invoke-phase-1-fixture.ts` - Existing runtime invoke-step pattern.
  - External: `https://docs.bmad-method.org/reference/workflow-map/` - Implementation stage workflow order.

  **Acceptance Criteria** (agent-executable only):
  - [ ] The active plan explicitly records post-architecture stages as deferred follow-on work.
  - [ ] No active branch milestone or success criteria claim seeded support beyond Architecture.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Deferred stages are called out explicitly
    Tool: Bash
    Steps: Run `grep -R "create-epics-and-stories\|check-implementation-readiness\|sprint-planning\|create-story\|dev-story\|code-review\|deferred" -n .sisyphus/plans/chiron-bmad-seeded-track-master.md`.
    Expected: All post-architecture stages are present only as deferred follow-on scope.
    Evidence: .sisyphus/evidence/task-8-deferred-follow-on.txt
  ```

  **Commit**: YES | Message: `docs(plan): defer post-architecture bmad scope` | Files: `.sisyphus/plans/chiron-bmad-seeded-track-master.md`

- [ ] 9. Deferred to later seed extension

  > Historical follow-on task body retained below as planning context only. It is not active for this branch.

  **What to do**: Use the runtime repositories already present in Chiron to produce a deterministic proof package for the first story cycle. The proof must show execution state transitions, harness binding/session evidence, and applied writes/artifact evidence for the canonical story path. If deterministic fixture data is needed for repeatability, use the fixture-pack contract from Task 5 rather than ad hoc manual setup. Produce evidence that docs and survey gating can rely on.
  **Must NOT do**: Do not use manual screenshots or unrepeatable local state as the only proof. Do not rely solely on design-time presence of stages without runtime evidence.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: once the runtime path exists, this is a bounded proof/evidence integration task.
  - Skills: `[]` - Existing runtime repositories are already available.
  - Omitted: [`playwright`] - Browser skill loading is unnecessary for repository/runtime evidence generation.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [10, 11, 12, 14, 15] | Blocked By: [5, 6, 7, 8]

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `packages/db/src/runtime-repositories/agent-step-execution-state-repository.ts`
  - Pattern: `packages/db/src/runtime-repositories/agent-step-execution-harness-binding-repository.ts`
  - Pattern: `packages/db/src/runtime-repositories/agent-step-execution-applied-write-repository.ts`
  - Pattern: `.sisyphus/evidence/` - Evidence destination conventions.
  - Pattern: `tests/e2e/runtime-work-units.spec.ts` - Existing runtime E2E verification style.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Evidence exists for execution state, harness binding, and applied writes from the canonical story cycle.
  - [ ] The evidence can be reproduced without manual setup.
  - [ ] The evidence is sufficient to gate docs claims and survey eligibility.
  - [ ] The proof remains scoped to one story cycle.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Runtime evidence surfaces are populated for the story cycle
    Tool: Bash
    Steps: Run `bunx vitest --run packages/db/src/tests/bmad-story-cycle-runtime-proof.test.ts packages/api/src/tests/bmad-methodology-runtime-proof.test.ts && bunx playwright test tests/e2e/runtime-work-units.spec.ts --grep "BMAD story cycle proof"`, then collect evidence files under `.sisyphus/evidence/`.
    Expected: Evidence captures execution state, harness binding, and applied writes for the canonical story path.
    Evidence: .sisyphus/evidence/task-9-runtime-proof.txt

  Scenario: Proof is deterministic and repeatable
    Tool: Bash
    Steps: Run `bun run db:push && bun run db:seed && bunx vitest --run packages/db/src/tests/bmad-story-cycle-runtime-proof.test.ts packages/api/src/tests/bmad-methodology-runtime-proof.test.ts && bunx playwright test tests/e2e/runtime-work-units.spec.ts --grep "BMAD story cycle proof"`, then repeat the same command sequence a second time against the same deterministic fixture strategy.
    Expected: Equivalent evidence is regenerated without manual intervention.
    Evidence: .sisyphus/evidence/task-9-runtime-proof-error.txt
  ```

  **Commit**: YES | Message: `test(methodology): prove first bmad story cycle` | Files: runtime tests, deterministic fixtures, evidence helpers

- [ ] 10. Deferred to later seed extension

  > Historical follow-on task body retained below as planning context only. It is not active for this branch.

  **What to do**: Add or update the automated verification commands/tests so the expanded BMAD seed, the in-app seed trigger, and the first story cycle can be validated as a coherent product flow. Cover: canonical seed rows present, in-app seed action idempotence, readiness gate behavior, first story cycle execution, and fixture-pack repeatability. Ensure these checks participate in the repository test/build flow and produce stable evidence.
  **Must NOT do**: Do not leave the BMAD seeded path dependent on manual QA alone. Do not scatter flow verification across undocumented ad hoc commands.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: this is cross-layer QA plumbing and contract enforcement.
  - Skills: `[]` - Existing repo test/build conventions are enough.
  - Omitted: [`review-work`] - This is implementation verification, not the final review wave.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [11, 12, 14, 15] | Blocked By: [2, 3, 4, 5, 6, 7, 8, 9]

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `package.json` - Root verification commands.
  - Pattern: `tests/e2e/runtime-work-units.spec.ts` - Existing runtime E2E pattern.
  - Pattern: `apps/web/vitest.config.ts` - Web-side test entrypoint.
  - Pattern: `packages/api/src/tests/**` - Backend test patterns.
  - Pattern: `packages/db/src/tests/**` - Repository/idempotence test patterns.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Automated checks exist for seed coverage, in-app seeding, readiness gating, and first story cycle proof.
  - [ ] The checks run under documented repository commands rather than ad hoc local steps.
  - [ ] The checks generate evidence suitable for docs/survey gates.
  - [ ] Build/test flows fail if the canonical seeded path regresses.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: BMAD seeded-path verification runs in the repo suite
    Tool: Bash
    Steps: Run `bun run check-types && bun run build && bun run test`.
    Expected: The suite includes the seeded BMAD path checks and passes.
    Evidence: .sisyphus/evidence/task-10-seeded-path-suite.txt

  Scenario: Seed-flow regressions fail automatically
    Tool: Bash
    Steps: Run `grep -R "product-brief\|create-prd\|create-ux-design\|create-architecture\|create-epics-and-stories\|check-implementation-readiness\|sprint-planning\|create-story\|dev-story\|code-review" -n packages/scripts/src/seed/methodology packages/contracts packages/db && bunx vitest --run apps/web/src/tests/routes/bmad-methodology-seed.test.tsx packages/api/src/tests/bmad-seeded-path-gates.test.ts packages/db/src/tests/bmad-seeded-path-repository.test.ts`.
    Expected: Missing stage coverage or in-app seed regressions would fail the contract checks.
    Evidence: .sisyphus/evidence/task-10-seeded-path-suite-error.txt
  ```

  **Commit**: YES | Message: `test(app): verify seeded bmad path end-to-end` | Files: tests, verification helpers, package scripts if needed

- [ ] 11. Deferred to later seed extension

  > Historical follow-on task body retained below as planning context only. It is not active for this branch.

  **What to do**: Before rewriting docs content, create a truth matrix that tags every BMAD/Taskflow/docs claim as `seeded and demonstrated`, `manually supported`, or `planned/not yet implemented`. Use the output of Tasks 1-10 as the source of truth. Apply the same matrix to orientation pages, Taskflow pages, Design Time pages, Project Runtime pages, README claims, and survey-facing wording. The docs rewrite may only teach the seeded BMAD path as shipped where the matrix says `seeded and demonstrated`; everything else must be clearly labeled or excluded.
  **Must NOT do**: Do not rewrite docs first and rationalize truth later. Do not leave generic Taskflow claims that outrun runtime proof. Do not keep stale VitePress-era assumptions alive.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: this is a documentation authority and claim-audit task.
  - Skills: `[]` - Existing docs and proof artifacts are enough.
  - Omitted: [`web-design-guidelines`] - The issue is truthfulness and structure, not UI polish.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: [12, 13, 14, 15] | Blocked By: [1, 2, 3, 5, 8, 9, 10]

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `apps/docs/astro.config.mjs` - Actual docs framework and IA.
  - Pattern: `apps/docs/src/content/docs/reference/claim-policy.md` - Existing claim-policy concept.
  - Pattern: `apps/docs/src/content/docs/taskflow/**` - Public Taskflow pages to reclassify.
  - Pattern: `apps/docs/src/content/docs/design-time/**`
  - Pattern: `apps/docs/src/content/docs/project-runtime/**`
  - Pattern: `README.md` - Root product/docs claims that must align.
  - Pattern: `.sisyphus/evidence/task-9-runtime-proof.txt` - Runtime proof gate for docs claims.

  **Acceptance Criteria** (agent-executable only):
  - [ ] A docs truth matrix exists and covers public docs, README, and survey-facing seeded-flow claims.
  - [ ] Every seeded-path claim is tagged with one of the three approved truth levels.
  - [ ] Public docs rewrites are blocked from using unsupported runtime claims.
  - [ ] VitePress-era assumptions are explicitly removed or demoted from active authority.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Docs truth matrix covers all public surfaces
    Tool: Bash
    Steps: Run `grep -R "seeded and demonstrated\|manually supported\|planned/not yet implemented" -n apps/docs README.md .sisyphus docs`.
    Expected: The truth matrix or linked artifacts classify every public-surface claim set.
    Evidence: .sisyphus/evidence/task-11-docs-truth-matrix.txt

  Scenario: Unsupported claims are not left unlabeled
    Tool: Read
    Steps: Inspect the truth matrix and spot-check Taskflow + runtime docs claims.
    Expected: Any claim beyond proven seeded/runtime support is explicitly labeled or removed.
    Evidence: .sisyphus/evidence/task-11-docs-truth-matrix-error.md
  ```

  **Commit**: YES | Message: `docs(bmad): add truth matrix and claim audit` | Files: `apps/docs/**`, `README.md`, supporting docs authority notes

- [ ] 12. Deferred to later seed extension

  > Historical follow-on task body retained below as planning context only. It is not active for this branch.

  **What to do**: Rewrite the docs entry surfaces so they teach the actual seeded BMAD path rather than the current generic narrative. Update the homepage, getting-started, mental-model, and all Taskflow pages so they follow the canonical BMAD happy path using Taskflow as the single concrete example. The walkthrough must explicitly cover: analysis, planning, solutioning, the optional UX branch, readiness, and one story cycle. Taskflow pages must now explain why Chiron’s value shows up across those stages instead of stopping at the current generic slices.
  **Must NOT do**: Do not keep Taskflow as a generic placeholder detached from BMAD semantics. Do not describe VitePress-specific behavior or stale docs architecture. Do not imply unsupported runtime depth.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: this is the main public narrative rewrite.
  - Skills: `[]` - The seeded-track truth matrix is the primary guide.
  - Omitted: [`bmad-cis-storytelling`] - The docs must stay technical and truthful, not marketing-heavy.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: [13, 14, 15] | Blocked By: [1, 6, 7, 8, 9, 10, 11]

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `apps/docs/src/content/docs/index.md`
  - Pattern: `apps/docs/src/content/docs/getting-started.md`
  - Pattern: `apps/docs/src/content/docs/mental-model.md`
  - Pattern: `apps/docs/src/content/docs/taskflow/index.md`
  - Pattern: `apps/docs/src/content/docs/taskflow/setup-onboarding.md`
  - Pattern: `apps/docs/src/content/docs/taskflow/fan-out-delegation.md`
  - Pattern: `apps/docs/src/content/docs/taskflow/review-rework.md`
  - Pattern: `.sisyphus/evidence/task-9-runtime-proof.txt` - Truth source for the demonstrated path.
  - External: `https://docs.bmad-method.org/tutorials/getting-started/` - BMAD Method track framing.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Orientation and Taskflow pages teach the canonical seeded BMAD path through one story cycle.
  - [ ] The optional UX branch is represented accurately without becoming mandatory.
  - [ ] Taskflow remains the single concrete example across the rewritten docs.
  - [ ] The rewritten pages only claim what the truth matrix allows.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Taskflow docs now follow the seeded BMAD path
    Tool: Playwright
    Steps: Open the docs homepage, navigate through Taskflow pages, and verify visible references to analysis, planning, solutioning, readiness, and one story cycle.
    Expected: The public docs teach the seeded BMAD path rather than a generic setup/fan-out/review story.
    Evidence: .sisyphus/evidence/task-12-taskflow-rewrite.png

  Scenario: Unsupported runtime depth is not overclaimed
    Tool: Bash
    Steps: Run `grep -R "not fully implemented\|planned/not yet implemented\|seeded and demonstrated" -n apps/docs/src/content/docs` and inspect rewritten Taskflow pages.
    Expected: Any non-demonstrated capability is clearly labeled or omitted.
    Evidence: .sisyphus/evidence/task-12-taskflow-rewrite-error.txt
  ```

  **Commit**: YES | Message: `docs(bmad): rewrite orientation and taskflow path` | Files: `apps/docs/src/content/docs/{index,getting-started,mental-model,taskflow/**}`

- [ ] 13. Deferred to later seed extension

  > Historical follow-on task body retained below as planning context only. It is not active for this branch.

  **What to do**: Update the rest of the docs corpus so it supports the rewritten Taskflow path. Design Time pages must explain how BMAD stages map into Chiron methodology entities. Project Runtime pages must explain how the first story cycle shows up in runtime state and evidence surfaces. Reference/claim-policy docs must reflect the new truth matrix. README must stop acting like a stale high-level handbook and instead point to the truthful Astro/Starlight docs and seeded BMAD path. Also add explicit supersession notes wherever old plan/docs assumptions would confuse future agents.
  **Must NOT do**: Do not leave Taskflow updated while Design Time/Runtime docs still describe the old generic or partial reality. Do not keep README as a parallel, conflicting conceptual source.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: this is a corpus-wide documentation alignment pass.
  - Skills: `[]` - Existing docs structure and truth matrix suffice.
  - Omitted: [`bmad-agent-tech-writer`] - The work is bounded and repo-specific.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: [14, 15] | Blocked By: [1, 3, 8, 9, 10, 11, 12]

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `apps/docs/src/content/docs/design-time/**`
  - Pattern: `apps/docs/src/content/docs/project-runtime/**`
  - Pattern: `apps/docs/src/content/docs/reference/**`
  - Pattern: `README.md`
  - Pattern: `docs/README.md` - Repo-internal docs boundary.
  - Pattern: `packages/db/src/schema/runtime.ts` - Runtime state surfaces to teach truthfully.
  - Pattern: `packages/db/src/runtime-repositories/*` - Runtime evidence surfaces.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Design Time docs teach the seeded BMAD → Chiron mapping rather than generic methodology prose.
  - [ ] Project Runtime docs explain the first story cycle using actual runtime evidence surfaces.
  - [ ] Reference/claim-policy docs and README align with the new truth matrix.
  - [ ] Old conflicting docs/README assumptions are removed or marked historical.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Design Time and Project Runtime docs align with the seeded track
    Tool: Playwright
    Steps: Navigate from Taskflow to Design Time and Project Runtime pages and inspect for visible BMAD-stage mapping plus runtime evidence references.
    Expected: Both tracks reinforce the same seeded BMAD truth.
    Evidence: .sisyphus/evidence/task-13-docs-corpus-alignment.png

  Scenario: README and reference docs no longer conflict
    Tool: Bash
    Steps: Run `grep -R "VitePress\|generic Taskflow\|L1/L2/L3" -n README.md apps/docs/src/content/docs/reference apps/docs/src/content/docs/design-time apps/docs/src/content/docs/project-runtime`.
    Expected: Stale/conflicting claims are removed or clearly historical.
    Evidence: .sisyphus/evidence/task-13-docs-corpus-alignment-error.txt
  ```

  **Commit**: YES | Message: `docs(bmad): align design-time runtime and readme` | Files: `apps/docs/src/content/docs/**`, `README.md`, optional internal docs notes

- [ ] 14. Deferred to later seed extension

  > Historical follow-on task body retained below as planning context only. It is not active for this branch.

  **What to do**: Rework the survey assumptions so the experiment measures perception after the completed seeded BMAD flow, not the previous generic onboarding/docs path. Update the survey trigger contract, participant eligibility, questionnaire context wording, and any docs-site survey notes to reference the completed seeded BMAD track and first story cycle. The survey must remain blocked until the seeded-flow, runtime-proof, and docs-truth gates have passed. Ensure the questionnaire language reflects the actual BMAD path participants experienced.
  **Must NOT do**: Do not start survey work against the old generic Taskflow/onboarding model. Do not let the survey depend on unstable terminology or incomplete docs/runtime claims.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: this work crosses product flow, docs, and research validity.
  - Skills: `[]` - The prior survey plan and new seeded-track truth provide sufficient context.
  - Omitted: [`bmad-product-brief`] - This is research instrumentation alignment, not a product discovery workflow.

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: [15] | Blocked By: [1, 2, 3, 6, 8, 9, 10, 11, 12, 13]

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `.sisyphus/plans/chiron-thesis-survey-experiment.md` - Historical survey requirements and infrastructure assumptions.
  - Pattern: `apps/docs/src/pages/survey.astro`
  - Pattern: `apps/docs/src/pages/api/survey/launch.ts`
  - Pattern: `apps/docs/src/pages/api/survey/webhook.ts`
  - Pattern: `.sisyphus/evidence/task-9-runtime-proof.txt` - Required proof gate for survey eligibility.
  - Pattern: `apps/docs/src/content/docs/taskflow/**` - The participant-facing methodology story the survey now measures.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Survey eligibility references the completed seeded BMAD path and first story cycle.
  - [ ] Survey wording/docs no longer assume the old generic onboarding path.
  - [ ] Survey work is gated behind seeded-flow, runtime-proof, and docs-truth completion.
  - [ ] The questionnaire/context wording reflects the actual participant journey.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Survey gating depends on seeded BMAD completion
    Tool: Read
    Steps: Inspect the updated survey contract and verify that eligibility requires the completed seeded BMAD flow and docs/runtime freeze.
    Expected: Survey eligibility cannot trigger on the earlier generic path.
    Evidence: .sisyphus/evidence/task-14-survey-rebase.md

  Scenario: Survey wording matches the seeded journey
    Tool: Bash
    Steps: Run `grep -R "Taskflow\|BMAD\|story cycle\|generic onboarding" -n .sisyphus apps/docs/src/pages apps/docs/src/content/docs` and inspect survey-related wording.
    Expected: Survey-facing wording references the new seeded BMAD journey and removes stale generic framing.
    Evidence: .sisyphus/evidence/task-14-survey-rebase-error.txt
  ```

  **Commit**: YES | Message: `feat(experiment): rebase survey onto seeded bmad flow` | Files: survey docs/specs, docs-site survey scaffolding, experiment contract notes

- [ ] 15. Deferred to later seed extension

  > Historical follow-on task body retained below as planning context only. It is not active for this branch.

  **What to do**: Execute the final integrated verification for the seeded BMAD track, docs rewrite, survey rebasing, and stale-plan cleanup. Confirm docs build/test on Astro/Starlight, seeded-path repository verification, survey gate assertions, and explicit supersession notes across the repository. Produce the final evidence package that proves the old docs/survey assumptions have been replaced by one truthful seeded BMAD track.
  **Must NOT do**: Do not leave stale plan references or contradictory framework assumptions behind. Do not rely on manual reading alone.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: final integrated QA across methodology, app, docs, and survey boundaries.
  - Skills: `[]` - Existing repo/test/docs tooling should be used directly.
  - Omitted: [`deploy-to-vercel`] - Deployment is not the verification objective here.

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: [F1, F2, F3, F4] | Blocked By: [9, 10, 11, 12, 13, 14]

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `package.json` - Root verification commands.
  - Pattern: `apps/docs/package.json` - Docs-specific build/test commands.
  - Pattern: `.sisyphus/plans/chiron-documentation-site.md` - Stale plan to supersede.
  - Pattern: `.sisyphus/plans/chiron-thesis-survey-experiment.md` - Historical survey plan to realign.
  - Pattern: `.sisyphus/evidence/task-9-runtime-proof.txt`
  - Pattern: `.sisyphus/evidence/task-11-docs-truth-matrix.txt`
  - Pattern: `.sisyphus/evidence/task-14-survey-rebase.md`

  **Acceptance Criteria** (agent-executable only):
  - [ ] Repository verification passes for the seeded BMAD path.
  - [ ] Docs build/test passes for Astro/Starlight and the rewritten BMAD path.
  - [ ] Survey gate verification passes against the rebased seeded-flow contract.
  - [ ] Supersession cleanup removes or demotes stale conflicting assumptions.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Full integrated suite passes
    Tool: Bash
    Steps: Run `bun run check-types && bun run build && bun run test && bun run build:docs && bun run test:docs`.
    Expected: All seeded-path, docs, and survey-gate verification passes in one integrated run.
    Evidence: .sisyphus/evidence/task-15-integrated-suite.txt

  Scenario: Stale plan/framework references are gone or historical
    Tool: Bash
    Steps: Run `grep -R "VitePress\|generic onboarding survey path\|current docs plan is authoritative" -n .sisyphus README.md apps/docs docs`.
    Expected: Any remaining references are clearly marked historical/superseded rather than active truth.
    Evidence: .sisyphus/evidence/task-15-integrated-suite-error.txt
  ```

  **Commit**: YES | Message: `test(bmad): verify master seeded track and cleanup` | Files: verification outputs, docs/spec cleanup, stale-reference removals

## Final Verification Wave (MANDATORY — after ALL active implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [ ] F1. Plan Compliance Audit — oracle

  **Tool**: `task(subagent_type="oracle")`
  **Steps**: Review `.sisyphus/plans/chiron-bmad-seeded-track-master.md`, the final implementation diff, and `.sisyphus/evidence/task-*.{txt,md,png}`. Verify every completed task, dependency gate, and acceptance criterion was satisfied exactly as planned.
  **Expected**: Explicit PASS with no plan deviations, or a concrete list of violated tasks/criteria.

- [ ] F2. Code Quality Review — unspecified-high

  **Tool**: `task(category="unspecified-high")`
  **Steps**: Review the final implementation diff plus generated tests/docs for code quality, seed/schema consistency, docs truth consistency, and maintainability. Cross-check seeded BMAD path files, docs pages, and survey-gate changes against the plan.
  **Expected**: Explicit PASS with no critical quality defects, or a concrete defect list.

- [ ] F3. Real Manual QA — unspecified-high (+ playwright if UI)

  **Tool**: `task(category="unspecified-high")` + `Playwright`
  **Steps**: Run `bun run check-types && bun run build && bun run test && bun run build:docs && bun run test:docs && bunx playwright test tests/e2e/runtime-work-units.spec.ts --grep "BMAD"`. Then manually inspect the Playwright evidence for the in-app seed flow, Taskflow docs path, and survey gating flow.
  **Expected**: All commands pass and the UI flows behave exactly as the plan specifies.

- [ ] F4. Scope Fidelity Check — deep

  **Tool**: `task(category="deep")`
  **Steps**: Compare the final implementation/diff/evidence against the plan’s non-goals and scope boundaries. Verify the work stayed within the BMad Method happy path, one story cycle, Astro/Starlight docs rewrite, and survey rebasing, without leaking into Quick Flow, Enterprise, generalized methodology import, or multi-story expansion.
  **Expected**: Explicit PASS with no scope creep, or a concrete list of out-of-scope changes to remove.

## Commit Strategy
- Commit at workstream boundaries:
  1. `feat(methodology): extend bmad seeded track through architecture`
  2. `feat(app): add in-app bmad methodology seeding`
  3. `docs(plan): freeze post-architecture scope as deferred`

## Success Criteria
- A user can seed the BMad Method track from the app into a project and progress through a truthful seeded path that ends at Architecture in this branch.
- Chiron preserves BMAD semantics while still mapping them cleanly into Chiron entities through the Architecture work unit.
- Post-architecture BMAD stages are preserved as explicit deferred follow-on scope rather than implied complete.
