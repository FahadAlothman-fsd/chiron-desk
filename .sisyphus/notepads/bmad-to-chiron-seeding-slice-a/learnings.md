# Slice-A Seeding Learnings

## Conventions
- Record patterns and decisions here for subagent reference

## Metadata Ownership Rules (Locked)
- Entities WITH description + guidance: methodology facts, dependency definitions, agents, work-unit types, work-unit facts, work-unit states, work-unit workflows, work-unit artifact slots, work-unit artifact slot templates, transitions
- Entities WITHOUT description + guidance: condition sets, transition bindings
- Description shape: `{ markdown: string }`
- Guidance shape: `{ human: { markdown: string }, agent: { markdown: string } }`

## Fact Cardinality (Locked)
- methodology facts and work-unit facts have first-class `cardinality` field with values `one | many`
- JSON fact sub-schema fields also support `type` + `cardinality`
- List-valued subfields do NOT carry scalar defaults

## Versioning (Locked)
- One refined methodology definition
- Two methodology versions: `draft` and `active`
- Both versions share the same underlying Slice-A canonical data

## Scope Boundaries (Locked)
- This plan ends at L1/L2
- Workflow steps/edges are DEFERRED to later plan
- No canonical payload in `definition_extensions_json`

## Slice-A Taxonomy (Locked)
- Work Unit Types: `WU.SETUP`, `WU.BRAINSTORMING`, `WU.RESEARCH`
- Primary Workflows: `setup_project`, `brainstorming`, `market_research`, `domain_research`, `technical_research`
- Brainstorming Support Workflows: 10 unbound `advanced_elicitation` workflows

## Brainstorming Fact Redesign (Locked)
- Replace singular `objective` with plural `objectives`
- `objectives` is a goal-oriented JSON fact with `cardinality: many`
- `selected_directions` has nested list-valued subfields (string + many)
- `constraints` has list-valued string subfields: `must_have`, `must_avoid`, `timebox_notes`

## Research Fact Design (Locked)
- `research_goals` is a goal-oriented JSON fact with `cardinality: many`
- One shared `research_report` slot with three templates: `market`, `domain`, `technical`

## 2026-03-26 Authority Doc Freeze
- `docs/architecture/methodology-bmad-setup-mapping.md` now states frozen Slice-A authority, refactor-first sequencing, and L1/L2-only scope
- Created `docs/architecture/methodology-bmad-brainstorming-mapping.md` and `docs/architecture/methodology-bmad-research-mapping.md` using the setup mapping pattern
- `docs/architecture/methodology-progressive-seeding.md` now treats Slice A as `WU.SETUP`, `WU.BRAINSTORMING`, and `WU.RESEARCH`, with one refined methodology definition plus `draft` and `active` versions sharing the same canonical data
- `docs/architecture/methodology-canonical-authority.md` is the lock point for metadata ownership, including explicit exclusion of `description` and `guidance` from condition sets and transition bindings

## 2026-03-26 Task 3 Seeding Procedure Refactor
- Replaced baseline-only seeding assumptions with explicit dual-version scaffolding (`mver_bmad_v1_draft`, `mver_bmad_v1_active`) driven by one shared canonical row builder helper.
- Normalized seeded methodology fact `descriptionJson` to `{ markdown }` and kept `guidanceJson` as audience-scoped markdown objects to match the locked ownership model from Task 2.
- Updated slice metadata exports to deterministic Slice-A registrations: `slice_a_setup`, `slice_a_brainstorming`, `slice_a_research`.
- Renamed table module `methodology-fact-schemas.seed.ts` to `work-unit-fact-definitions.seed.ts` and wired imports/exports accordingly.
- Added real artifact slot table modules (`methodology-artifact-slot-definitions.seed.ts`, `methodology-artifact-slot-templates.seed.ts`) and registered both canonical tables in seed order/map and manual seeding table bindings.

## 2026-03-26 Task 4 L1 Seeding Foundation
- Refined baseline manual methodology identity to Slice-A specific values (`bmad.slice-a.v1`, `BMAD v1 — Slice A`) while keeping one definition and exactly two versions (`draft`, `active`).
- Seeded L1 canonical rows for work-unit definitions (`setup`, `brainstorming`, `research`) and dependency definitions (`requires_setup_context`, `informed_by_brainstorming`) for both versions using shared per-version builders to avoid drift.
- Expanded methodology facts to locked Slice-A set (`communication_language`, `document_output_language`, `project_root_directory`) with first-class `cardinality` and corrected description/guidance JSON shapes.
- Added deterministic integrity checks proving draft/active canonical L1 equivalence by comparing normalized row payloads across methodology facts, dependency definitions, and work-unit definitions.

## 2026-03-26 Task 5 Slice-A Methodology Agents
- Seeded exactly three canonical methodology agent keys (`bmad_analyst`, `bmad_brainstorming_coach`, `bmad_tech_writer`) and emitted them for both canonical methodology versions using deterministic IDs (`seed:agent:{agent-suffix}:{methodology-version-id}`).
- Implemented agent rows as methodology-owned reusable definitions with locked metadata ownership shapes: `descriptionJson` is `{ markdown }` and `guidanceJson` is `{ human: { markdown }, agent: { markdown } }`.
- Added integrity assertions that fail on agent-catalog drift: exact key-set checks, dual-version parity checks, shape checks, and guardrails preventing `_bmad/` and `.md` lineage references in `persona` and `promptTemplateJson.markdown`.

## 2026-03-26 Task 6 WU.SETUP L2 Seeding Packet
- Seeded locked `WU.SETUP` L2 canonical rows for both `draft` and `active` methodology versions in `setup-bmad-mapping.ts`: work-unit facts, one `done` state, one `activation_to_done` transition, start/completion condition sets, setup workflows, one transition-workflow binding, one artifact slot, and one artifact template.
- Preserved deterministic ID and table-first seeding conventions using version-scoped IDs for all setup L2 rows (`seed:state:*`, `seed:transition:*`, `seed:condition-set:*`, `seed:work-unit-fact:*`, `seed:workflow:*`, `seed:binding:*`, `seed:artifact-slot:*`, `seed:artifact-template:*`).
- Enforced locked setup semantics in integrity tests: `setup_project` is the only bound workflow, `generate_project_context` remains setup-owned but unbound, completion gating uses fact existence conditions only, and workflow steps/edges remain unseeded.
- Confirmed metadata ownership rules hold for seeded setup entities: description uses `{ markdown }`, guidance uses audience-scoped markdown objects, and condition sets/bindings remain free of description/guidance payload fields.

## 2026-03-26 Task 7 WU.BRAINSTORMING L2 Seeding Packet
- Seeded locked `WU.BRAINSTORMING` L2 canonical rows for both `draft` and `active` versions in `setup-bmad-mapping.ts`: 5 work-unit facts, 1 done state, 1 activation→done transition, start/completion condition sets, 11 brainstorming workflows (1 primary bound + 10 advanced-elicitation support unbound), 1 transition-workflow binding, 1 artifact slot, and 1 artifact template.
- Implemented deterministic brainstorming ID conventions aligned with setup packet patterns: `seed:state:brainstorming:*`, `seed:transition:brainstorming:*`, `seed:condition-set:brainstorming:*`, `seed:work-unit-fact:brainstorming:*`, `seed:workflow:brainstorming:*`, `seed:binding:brainstorming:*`, `seed:artifact-slot:brainstorming:*`, `seed:artifact-template:brainstorming:*`.
- Applied locked brainstorming fact redesign: removed singular `objective`, added plural `objectives` as `factType: json` with `cardinality: many`, and encoded `selected_directions` + `constraints` nested subfields as `type + cardinality` with list-valued string entries and no scalar defaults.
- Kept metadata ownership boundary intact: condition sets and transition bindings continue without `description` / `guidance` fields; descriptions/guidance remain only on approved L2 entities.
- Preserved L1/L2-only scope by keeping `methodology_workflow_steps` and `methodology_workflow_edges` empty while expanding deterministic integrity tests to assert brainstorming bound/unbound workflow semantics and nested schema cardinality invariants.

## 2026-03-26 Task 8 WU.RESEARCH Shared L2 Foundations
- Seeded shared `WU.RESEARCH` foundations for both `draft` and `active` in `setup-bmad-mapping.ts`: 1 done lifecycle state, 1 activation→done lifecycle transition, 2 transition condition sets (start + completion), 6 research fact definitions (including `research_goals` as `factType: json` with `cardinality: many`), 1 shared `research_report` artifact slot, and 3 artifact templates (`market`, `domain`, `technical`).
- Preserved deterministic ID patterns aligned with existing Slice-A conventions: `seed:state:research:*`, `seed:transition:research:*`, `seed:condition-set:research:*`, `seed:work-unit-fact:research:*`, `seed:artifact-slot:research:*`, `seed:artifact-template:research:*`.
- Kept Task 8/Task 9 boundary strict: no research workflow rows, no transition-workflow bindings for research, and no workflow step/edge rows were added.
- Extended table-first table modules to include research rows only for states/transitions/condition-sets/facts/artifact-slot-definitions/artifact-slot-templates, preserving existing registry wiring.
- Expanded deterministic integrity assertions to lock Task 8 semantics: research fact schema/cardinality checks, condition-gate content checks, exactly one research slot with exactly three templates, and explicit absence of research workflow/binding rows.

## 2026-03-26 Task 9 WU.RESEARCH Workflow + Binding Seeding
- Seeded exactly three locked research workflows for each canonical version (`market_research`, `domain_research`, `technical_research`) on shared `seed:wut:research:{methodologyVersionId}` work-unit types.
- Added deterministic workflow IDs with required pattern `seed:workflow:research:{suffix}:{methodologyVersionId}` and deterministic binding IDs with required pattern `seed:binding:research:{suffix}:{methodologyVersionId}`.
- Bound all three research workflows explicitly to the shared research transition `seed:transition:research:activation-to-done:{methodologyVersionId}` while keeping transition binding rows metadata-free (no `descriptionJson` / `guidanceJson`).
- Preserved L1/L2 boundary: research workflow steps/edges remain unseeded (`methodology_workflow_steps` and `methodology_workflow_edges` stay empty).
- Updated deterministic integrity assertions to flip Task 8 absence checks into Task 9 exact-presence checks for research workflows and research transition-workflow bindings across both versions.

## 2026-03-26T06:24:45+03:00 Task 10 Deterministic Integrity Assertion Hardening
- Locked canonical seed table order to exact equality in integrity tests so accidental insertion/reordering across populated L1/L2 tables is caught immediately.
- Added explicit deterministic table cardinality assertion across all canonical seed tables (`wut/agents/states/transitions/condition-sets/facts/workflows/slots/templates/bindings`) including enforced `0` counts for workflow steps/edges.
- Added ownership guardrails that assert `transition_condition_sets` and **all** transition-workflow bindings (setup/brainstorming/research) never expose `descriptionJson` or `guidanceJson`.
- Strengthened workflow inventory semantics per methodology version: exactly 16 workflows each, exactly 5 `bound_by_default=true` primary workflows, exactly 10 brainstorming advanced-elicitation support workflows, and bindings limited to the 5 primary workflows only.
- Added deterministic work-unit type ID policy assertion `seed:wut:{key}:{methodologyVersionId}` for all seeded work-unit type rows.

## 2026-03-26T06:34:47+03:00 Task 11 Seed Integration Coverage
- Added `packages/scripts/src/tests/seeding/methodology-seed-integration.test.ts` to lock integration-level invariants for the canonical seed pipeline without brittle snapshots.
- Integration assertions now cover one methodology definition + dual versions (`draft`/`active`), forbidden `definitionExtensions` keys absence, FK dependency ordering validity, and explicit L1/L2-only guardrails (`methodology_workflow_steps`/`methodology_workflow_edges` remain empty).
- Added deterministic reseed simulation mirroring canonical table reset semantics (reverse clear + ordered reinsert scoped by version IDs) to verify drift is removed and repeated reseed remains idempotent.

## 2026-03-26T14:45:07+03:00 Task 11 Verification-Fix Learnings
- `db:seed:test:reset` failed non-interactively because `apps/server/.env` points to persistent `file:../../local.db` that can retain stale pre-refactor columns (for example `methodology_agent_types.description` instead of `description_json`).
- Drizzle `push` prompt ambiguity (`create vs rename`) is triggered by stale persisted schema drift; deleting only `local.db` before `db:push` yields clean schema application and avoids interactive rename questions in this workspace flow.
- Minimal safe scope fix: pre-clean persistent test DB file only in `db:seed:test:reset` command path, leaving regular `db:push`/`db:seed` behavior unchanged.

## 2026-03-26T16:46:43+03:00 Final-Wave Frontend Metadata Leak Remediation
- Removed transition condition-set `guidance`/`description` ownership from L2 authoring UI state and serializers by deleting gate text editing paths and removing these fields from `TransitionConditionSet`/`GateDraft` shapes in `StateMachineTab.tsx`.
- Updated transition fingerprint + mutation payload builders in `methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx` so condition sets now serialize only structural fields (`key`, `phase`, `mode`, `groups`) plus condition-level payloads.
- Hardened project baseline preview ingestion to ignore condition-set and transition-binding guidance by removing condition-set guidance parsing and workflow guidance projection from `projects.$projectId.index.tsx` and corresponding consumer types/views (`baseline-visibility.tsx`, `projects.$projectId.transitions.tsx`).

## 2026-03-26T16:51:59+03:00 Final-Wave Brainstorming Template Iteration Guardrails
- Locked brainstorming artifact rendering semantics for list-valued nested fields by using `#each` blocks (with `{{this}}`) under existing `#if` guards for: `constraints.must_have`, `constraints.must_avoid`, `constraints.timebox_notes`, `selected_directions.primary_directions`, `selected_directions.quick_wins`, and `selected_directions.breakthrough_concepts`.
- Added deterministic integrity guardrails to fail on regression if any of those six list-valued paths reintroduce scalar interpolation (`{{workUnit.facts...}}`) in the template content.
- Verified RED→GREEN flow: integrity test failed before template fix (missing `#each`), then targeted seeding suite passed after fix.

## 2026-03-26T16:59:19+03:00 Final-Wave DoD Formatting Unblock
- Reproduced DoD blocker with fresh `bun run check`: oxlint passed but `oxfmt --check` reported 10 formatting-only violations in scripts/db migration metadata and seeding test files.
- Cleared formatter drift using `bun run format` (`oxfmt --write`) without changing APIs, logic, schemas, or runtime behavior.
- Verified clean state with fresh `bun run check` (pass) and `bun run check-types` (pass) to unblock final-wave DoD gate.

## 2026-03-26T18:53:05+03:00 work_unit canonicalization implementation learnings
- Canonical `work_unit` support must be widened across **all** schema gates (Effect contract literals, API zod enums, engine allowlists/type normalizers) or `create -> list` round-trips silently downcast to `string`.
- Read-path compatibility is safest when explicit normalization is added at mapper boundaries: legacy stored `"work unit"` now normalizes to canonical `"work_unit"` in engine/frontend adapters, while UI still renders friendly `"work unit"` labels.
- Frontend L2 fact editor can preserve UX wording while persisting canonical values by mapping only at API payload boundaries (`work unit` UI option -> `work_unit` transport value).
- Seed integrity for brainstorming `setup_work_unit` is now explicitly locked with dedicated assertions for both canonical fact type and dependency metadata (`requires_setup_context`, `workUnitKey: setup`).
- Verification surfaced one compile-time propagation miss (`StateMachineTab` fact type union), confirming full-workspace `bun run check-types` is necessary even after targeted tests pass.

## 2026-03-26T20:02:13+03:00 MethodologyWorkflowAuthoringDto cleanup note
- Removed the unused `MethodologyWorkflowAuthoringDto` schema/type from `packages/contracts/src/methodology/dto.ts` while keeping `UpdateDraftWorkflowsInputDto` untouched.
- No other contracts or exports refer to the deleted DTO, affirming the compatibility path stays intact.

## 2026-03-26T20:51:27+03:00 Work-unit mutation diagnostics gating
- Work-unit create/update UI cannot assume mutation resolution implies persistence; backend can return HTTP 200 with invalid lifecycle diagnostics and no row write.
- Reliable client gate is to inspect both payload keys (`diagnostics` and legacy `validation`), treat `valid: false` (or diagnostics without a `valid` flag) as failure, and suppress success close/toast in that path.
- Diagnostic-to-copy mapping should be explicit for actionable outcomes (`DUPLICATE_WORK_UNIT_KEY` -> `Work Unit Key must be unique.`) with safe generic fallback for unknown codes.

## 2026-03-26T21:21:24+03:00 API hardening for lifecycle-invalid work-unit mutations
- Router-level guardrails are required on `version.workUnit.create` and `version.workUnit.updateMeta`: service-layer validation can return invalid diagnostics without throwing, so API must convert invalid envelopes into protocol errors.
- Defensive envelope parsing should support both `result.validation` (current) and `result.diagnostics` (legacy/alternate) before deciding whether to return a success body.
- Conflict semantics should be driven by diagnostic codes (`DUPLICATE_WORK_UNIT_KEY` -> `ORPCError("CONFLICT")`), while all other invalid lifecycle diagnostics should map to `ORPCError("BAD_REQUEST")`.

## 2026-03-26T21:37:00+03:00 Lifecycle diagnostic propagation (API -> UI)
- `assertLifecycleMutationValidation` now needs structured `ORPCError.data` (not just status/message) so client-side rejected-mutation paths can render actionable copy without guessing from status codes.
- Practical payload shape that unblocks UI error rendering: keep full parsed `diagnostics`, include `firstDiagnostic` (first blocking if present, otherwise first), and include `actionableMessage` fallback.
- Frontend rejected-mutation handling should prioritize server `data.firstDiagnostic.message` / `data.actionableMessage`; if absent, fall back to existing generic copy to avoid surfacing low-signal transport messages.

## 2026-03-26T22:04:00+03:00 Work-unit description shape hardening (create/update)
- `version.workUnit.create` and `version.workUnit.updateMeta` now enforce canonical description shape at router boundary: `description` must be `{ markdown: string }`, and legacy plain string transport is rejected instead of silently passing through.
- Router-level rejection payload now includes machine-readable field diagnostics for shape mismatch (`code`, `scope`, `path`, `expected`, `received`, `blocking`, `severity`) with explicit path detail (`workUnitType.description.markdown` / `description.markdown`) and actionable message fallback.
- Web create/edit mutation payloads now send canonical description object (`{ markdown }`) when textarea content exists, keeping UI text editing while matching locked metadata semantics.

## 2026-03-26T22:12:00+03:00 Root vitest discovery hardening for required command
- Root invocation of the required vitest command can accidentally traverse mirrored `.worktrees/*/apps/web/**` tests; those mirrors are not part of the primary workspace runtime and can fail alias resolution under root execution.
- Minimal deterministic fix: add `exclude: ["**/.worktrees/**"]` to `apps/web/vitest.config.ts` so root-driven web test discovery ignores mirrored worktree files while keeping primary `apps/web/src/tests/**` coverage unchanged.
- This keeps real workspace test coverage intact and removes environment-noise failures from local worktree mirrors.
