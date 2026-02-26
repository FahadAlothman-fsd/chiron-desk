# Story 1.4: Publish Validated Methodology Draft as Immutable Version

Status: done

## Story

As an operator,
I want to publish a validated methodology draft as an immutable version,
so that projects can pin to a deterministic execution contract.

## Acceptance Criteria

1. **Given** a methodology draft with required contract elements completed (work unit types, transitions, work-unit fact schemas, transition workflow bindings, and workflow step-type validity)
   **When** I publish the draft as version `Vn`
   **Then** the system creates an immutable snapshot of the full methodology contract
   **And** the snapshot is queryable by `methodologyVersion + workUnitType`.

2. **Given** publish validation executes for a methodology draft
   **When** work-unit fact schemas are evaluated
   **Then** Facts v1 constraints are enforced (static typed fields, unique keys, valid defaults, no refs/derived expressions)
   **And** publish is blocked with deterministic diagnostics if any fact schema fails validation.

3. **Given** a draft with publish-blocking validation failures
   **When** I attempt publish
   **Then** publish is rejected deterministically
   **And** actionable diagnostics identify blocking fields and rules
   **And** no partial version state is committed.

4. **Given** a published version `Vn`
   **When** I attempt to modify contract-defining fields for `Vn`
   **Then** the system rejects mutation attempts
   **And** reports immutable-version constraints with structured diagnostics.

5. **Given** a successful publish event
   **When** I request publication evidence
   **Then** append-only evidence includes actor, timestamp, sourceDraftRef, publishedVersion, and validation summary
   **And** evidence remains queryable for audit and traceability.

6. **Given** equivalent publish input and validation context
   **When** publish validation is executed repeatedly
   **Then** outcomes are deterministic
   **And** diagnostic payload structure is stable for equivalent failures.

## Tasks / Subtasks

- [x] Implement publish orchestration in methodology engine with immutable snapshot semantics (AC: 1, 3, 4, 6)
  - [x] Add/extend publish service flow in `packages/methodology-engine/src/version-service.ts` (or equivalent publish coordinator) for draft -> published transition.
  - [x] Build canonical snapshot from normalized draft sources/tables only, not ad hoc payload fragments.
  - [x] Treat `definitionExtensions` as non-authoritative for canonical workflow/binding/guidance content during publish snapshot construction.
  - [x] Enforce deterministic duplicate-version handling (`publishedVersion` collision) with structured blocking diagnostics and zero additional writes.
  - [x] Enforce deterministic concurrent-publish handling (same draft/version race) with atomic transaction boundaries and stable diagnostics.
  - [x] Enforce stable ordering and deterministic serialization before persistence/diagnostics.

- [x] Enforce Facts v1 publish-time validation (AC: 2, 3, 6)
  - [x] Validate static typed fields, unique keys, valid defaults, and no refs/derived expressions.
  - [x] Return deterministic, actionable diagnostics for all blocking violations.
  - [x] Reject publish with zero partial commit on any blocking validation.

- [x] Enforce immutable published contract fields (AC: 4, 6)
  - [x] Add guardrails in write/update paths to reject mutation attempts on published versions.
  - [x] Validate immutable guards across both split API authoring routes and repository-level write entry points.
  - [x] Return structured immutable-version diagnostics with stable payload shape.

- [x] Persist and expose publish evidence (AC: 5, 6)
  - [x] Append publication evidence containing actor, timestamp, `sourceDraftRef`, `publishedVersion`, and validation summary.
  - [x] Ensure evidence remains append-only and queryable via existing lineage/evidence APIs.

- [x] Expose query path by `methodologyVersion + workUnitType` (AC: 1, 6)
  - [x] Ensure resolution and retrieval logic reads from immutable published snapshot for pinned consumers.
  - [x] Verify deterministic query outputs for equivalent inputs.

- [x] Wire API procedures for publish and diagnostics retrieval (AC: 1-6)
  - [x] Extend `packages/api/src/routers/methodology.ts` contracts for publish command and evidence query.
  - [x] Preserve authenticated write semantics and key-oriented transport contracts.

- [x] Add deterministic automated tests for publish behavior (AC: 1-6)
  - [x] Add engine tests for success path, each blocking validation path, and immutable mutation rejection.
  - [x] Add engine tests for duplicate-version publish collision and concurrent publish attempts.
  - [x] Add API tests for deterministic diagnostics and stable payload structure.
  - [x] Add regression tests proving canonical published snapshots are sourced from normalized tables, not `definitionExtensions` payload fragments.
  - [x] Add repository/integration tests proving atomic publish and append-only evidence writes.

## Dev Notes

### Implementation Blueprint (Schemas, Services, API, Tests)

- `packages/contracts`
  - Keep publish/evidence contract payloads deterministic and key-oriented.
  - Reuse existing diagnostics structures used by lifecycle and eligibility flows.
  - If new DTOs are needed, add them under `packages/contracts/src/methodology/` and export through package index.

- `packages/methodology-engine`
  - Primary implementation focus for this story.
  - Extend publish orchestration (`version-service`, related validators/repositories) to:
    - validate full draft contract at publish boundary,
    - create immutable published snapshot,
    - emit deterministic diagnostics,
    - append publication evidence.
  - Keep Effect-first boundary patterns (`Context.Tag`, `Layer`, typed errors).

- `packages/db`
  - Ensure persistence layer supports immutable publication state and append-only publication evidence.
  - Use transactional writes only; no partial publish state allowed on failure.
  - Preserve normalized-source authority and deterministic read ordering.

- `packages/api` and server composition
  - Add/extend publish procedures and publication-evidence query paths.
  - Keep auth/actor propagation intact for evidence attribution.
  - Keep payload shape stable and deterministic for equivalent failures.

- Tests
  - Add deterministic publish validation coverage and immutable constraint coverage.
  - Add integration coverage for atomicity and evidence append-only guarantees.
  - Add regression checks protecting Story 1.1-1.3 guarantees.

### Developer Context Section

- This story is the publish boundary for Epic 1 foundations. Scope is publish, immutability, and publication evidence.
- Story 1.3 already established draft workflow-definition and transition-binding model; reuse those patterns rather than reworking them.
- Story 1.5 owns project pinning behavior; do not implement pin/repin workflow in Story 1.4.

### Implementation Sequence (LLM-Optimized)

1. Finalize contracts for publish request/response, deterministic diagnostics, and publication evidence payload shape.
2. Implement DB/repository publish primitives for immutable snapshot write + append-only evidence in one transaction.
3. Implement methodology-engine publish orchestration (Facts v1 validation, deterministic diagnostics, collision/concurrency guards).
4. Wire API publish/evidence procedures with actor propagation and key-oriented payloads.
5. Add deterministic test matrix (engine + API + repository/integration) including regression tests for normalized-source authority.

### Technical Requirements

- Publish must succeed only when all required draft contract elements are valid.
- Publish snapshot must be immutable and queryable by `methodologyVersion + workUnitType`.
- Facts v1 checks are mandatory and publish-blocking.
- Publish rejection must be deterministic with actionable diagnostics and zero partial state.
- Immutable-version mutation attempts must be rejected with structured diagnostics.
- Publication evidence must be append-only and include actor/time/source/version/validation summary.
- Equivalent publish inputs and validation context must yield stable outcomes and diagnostic structures.
- Published snapshot authority must come from normalized tables/repository projections, not legacy monolithic `definitionJson`-style payload sources.
- Do not reintroduce compatibility aliases or dual-write paths removed in Story 1.3.
- Duplicate published-version attempts must fail deterministically with structured diagnostics and no additional evidence/snapshot mutation.
- Concurrent publish attempts against the same draft/version must preserve single-writer atomicity and deterministic loser-path diagnostics.
- Immutable guardrails must be enforced at both API and repository boundaries (defense-in-depth).

### Diagnostic Code Matrix (Deterministic Contract)

| code | scope | blocking | Trigger condition | Required remediation |
| --- | --- | --- | --- | --- |
| `PUBLISH_FACTS_V1_SCHEMA_INVALID` | `publish.validation.facts` | `true` | Facts v1 schema violates typed/static field rules, unique keys, or valid default constraints | Fix schema shape/defaults and republish |
| `PUBLISH_FACTS_V1_REFS_DERIVED_FORBIDDEN` | `publish.validation.facts` | `true` | Fact schema contains refs or derived expressions forbidden at publish boundary | Replace with static field definitions only |
| `PUBLISH_REQUIRED_CONTRACT_INCOMPLETE` | `publish.validation.contract` | `true` | Required draft elements missing (work unit types, transitions, fact schemas, transition workflow bindings, step-type validity) | Complete missing contract elements and republish |
| `PUBLISH_VERSION_ALREADY_EXISTS` | `publish.versioning` | `true` | Requested `publishedVersion` already exists | Choose next valid version and retry |
| `PUBLISH_CONCURRENT_WRITE_CONFLICT` | `publish.versioning` | `true` | Concurrent publish race loses deterministic single-writer transaction | Re-fetch current state and retry with fresh context |
| `PUBLISHED_CONTRACT_IMMUTABLE` | `publish.immutability` | `true` | Mutation attempted on immutable contract-defining fields for published version | Edit draft and publish new version instead |
| `PUBLISH_ATOMICITY_GUARD_ABORTED` | `publish.persistence` | `true` | Transaction guard detects potential partial-write state during publish | Investigate failure cause; retry only after guard condition is resolved |

Diagnostic payload contract for all publish failures:
- Required keys: `code`, `scope`, `blocking`, `required`, `observed`, `remediation`, `timestamp`, `evidenceRef`.
- Equivalent failing inputs must return the same `code` and `scope` values and stable key ordering in payload serialization.
- No successful publish evidence append may occur for any `blocking: true` result.

### Architecture Compliance

- Respect module ownership boundaries:
  - `packages/contracts`: schemas/contracts only.
  - `packages/methodology-engine`: publish validation/orchestration semantics.
  - `packages/db`: persistence + evidence append-only guarantees.
  - `packages/api`: transport/procedure composition.
- Do not introduce new gate classes or workflow step capabilities.
- Maintain Effect-first service composition and deterministic diagnostics behavior.
- Preserve normalized-source authority and avoid legacy payload authority fallback.

### Library/Framework Requirements

- Use repository-pinned Bun workspace dependencies for implementation.
- Latest registry versions checked via Bun (`bun pm view`) for awareness:
  - `effect`: `3.19.19`
  - `@effect/platform`: `0.94.5`
  - `hono`: `4.12.2`
  - `drizzle-orm`: `0.45.1`
  - `better-auth`: `1.4.19`
- Do not perform dependency upgrades in this story unless explicitly required by a blocking defect.

### File Structure Requirements

- Expected touchpoints:
  - `packages/methodology-engine/src/version-service.ts`
  - `packages/methodology-engine/src/validation.ts`
  - `packages/methodology-engine/src/lifecycle-service.ts`
  - `packages/methodology-engine/src/*test.ts`
  - `packages/api/src/routers/methodology.ts`
  - `packages/api/src/routers/methodology.test.ts`
  - `packages/db/src/lifecycle-repository.ts`
  - `packages/db/src/methodology-repository.ts`
  - `packages/db/src/schema/methodology.ts`
  - `packages/contracts/src/methodology/*`
- Follow existing package-layered change flow (`contracts -> db -> methodology-engine -> api -> tests`).

### Testing Requirements

- Add deterministic tests for:
  - publish success path with immutable snapshot creation,
  - each publish-blocking Facts v1 validation violation,
  - duplicate-version collision rejection,
  - concurrent publish race handling,
  - no-partial-state guarantees on rejected publish,
  - immutable published-field mutation rejection,
  - append-only publication evidence content and ordering,
  - stable diagnostic payload structure for equivalent failure inputs,
  - normalized-source-authority regression checks (no canonical snapshot authority from `definitionExtensions`).

#### Test-to-Code Mapping (Implementation Starter)

| Diagnostic code | Minimum required automated test case |
| --- | --- |
| `PUBLISH_FACTS_V1_SCHEMA_INVALID` | `publish_rejects_invalid_facts_v1_schema_with_deterministic_diagnostic` |
| `PUBLISH_FACTS_V1_REFS_DERIVED_FORBIDDEN` | `publish_rejects_refs_or_derived_expressions_in_facts_v1` |
| `PUBLISH_REQUIRED_CONTRACT_INCOMPLETE` | `publish_rejects_incomplete_required_contract_elements` |
| `PUBLISH_VERSION_ALREADY_EXISTS` | `publish_rejects_duplicate_published_version_without_writes` |
| `PUBLISH_CONCURRENT_WRITE_CONFLICT` | `publish_handles_concurrent_publish_with_single_winner_and_stable_loser_diagnostic` |
| `PUBLISHED_CONTRACT_IMMUTABLE` | `published_contract_mutation_is_rejected_at_api_and_repository_boundaries` |
| `PUBLISH_ATOMICITY_GUARD_ABORTED` | `publish_atomicity_guard_aborts_without_partial_snapshot_or_evidence` |

Test naming and placement guidance:
- Engine validation/versioning tests: `packages/methodology-engine/src/*test.ts`
- API transport/diagnostics-shape tests: `packages/api/src/routers/methodology.test.ts`
- Repository atomicity/evidence tests: `packages/db/src/*test.ts`
- Use deterministic fixture ordering and assert stable key ordering for diagnostic payload serialization.

- Run at minimum:
  - `bun check`
  - targeted package tests for methodology-engine/api/db touched by publish changes.

### Previous Story Intelligence

- Continue Story 1.3 patterns: normalized-source persistence, key-oriented API contracts, deterministic diagnostics, append-only evidence, transactional writes.
- Reuse split authoring route conventions and avoid reintroducing compatibility-path drift.
- Keep validation fail-fast for unsupported/unknown constructs; avoid coercive fallbacks.
- Keep `definitionExtensions` as non-authoritative metadata envelope; canonical workflow/binding/guidance state is normalized-table driven.
- Preserve Story 1.3 legacy-removal decisions (no `definitionJson` authority, no legacy fact-table dual-write fallback).

### Git Intelligence Summary

- Recent change pattern is package-first vertical slices followed by artifact/sprint-status sync.
- Keep this story implementation similarly layered to reduce regression and review churn.

### Latest Tech Information

- Registry check completed using Bun package metadata commands (no npm tooling in implementation flow).
- No story-scope requirement to upgrade dependencies surfaced from this check; proceed with pinned workspace versions.

### Project Structure Notes

- This story finalizes publish contract immutability semantics for Epic 1 and prepares Story 1.5 pinning work.
- If implementation requires boundary-breaking changes, capture rationale explicitly in dev notes before merging.

### References

- Story source: [Source: `_bmad-output/planning-artifacts/epics.md#Story 1.4`]
- Product constraints: [Source: `_bmad-output/planning-artifacts/prd.md`]
- Architecture guardrails: [Source: `_bmad-output/planning-artifacts/architecture.md`]
- UX deterministic diagnostics contract: [Source: `_bmad-output/planning-artifacts/ux-design-specification.md`]
- Project rules: [Source: `_bmad-output/project-context.md`]
- Previous story intelligence: [Source: `_bmad-output/implementation-artifacts/1-3-define-workflows-under-work-unit-scope-and-bind-executable-subset-to-transitions.md`]

### Project Context Reference

- Enforce strict TypeScript boundaries and schema-first decoding at package boundaries.
- Preserve deterministic behavior for validation and publish diagnostics.
- Keep package boundaries explicit and avoid cross-layer internal imports.

### Story Completion Status

- Story prepared via create-story workflow.
- Story context validated and tightened for deterministic publish, immutability, and normalized-source authority.

## Dev Agent Record

### Agent Model Used

openai/gpt-5.3-codex

### Debug Log References

- Workflow: `_bmad/bmm/workflows/4-implementation/create-story/workflow.yaml`
- Instructions: `_bmad/bmm/workflows/4-implementation/create-story/instructions.xml`

### Senior Developer Review (AI)

- Reviewer: Gondilf
- Date: 2026-02-25
- Outcome: Resolved

#### Findings

1. **[CRITICAL] Published-contract query passes methodology key where repository requires methodology ID**
   - Evidence: service lookup passes `input.methodologyKey` to `findVersionByMethodologyAndVersion` in `packages/methodology-engine/src/version-service.ts:821`.
   - Repository contract expects `methodologyId` at `packages/methodology-engine/src/repository.ts:112`, and DB implementation filters on `methodologyVersions.methodologyId` in `packages/db/src/methodology-repository.ts:317` and `packages/db/src/methodology-repository.ts:324`.
   - Impact: AC1 query path by `methodologyVersion + workUnitType` can fail in DB-backed execution.

2. **[HIGH] Required `evidenceRef` diagnostic key is not guaranteed in serialized publish failures**
   - Story contract marks `evidenceRef` required for publish failure payloads at `_bmad-output/implementation-artifacts/1-4-publish-validated-methodology-draft-as-immutable-version.md:158`.
   - Schema allows omission (`Schema.optional`) in `packages/contracts/src/methodology/version.ts:86`.
   - Runtime diagnostic builder sets `evidenceRef: undefined` in `packages/methodology-engine/src/version-service.ts:148`, which is typically dropped during JSON serialization.
   - Impact: Violates deterministic payload shape requirement for equivalent failures.

3. **[HIGH] `PUBLISH_ATOMICITY_GUARD_ABORTED` is declared but not implemented or tested**
   - Code matrix requires this diagnostic and dedicated test case in story at `_bmad-output/implementation-artifacts/1-4-publish-validated-methodology-draft-as-immutable-version.md:155` and `_bmad-output/implementation-artifacts/1-4-publish-validated-methodology-draft-as-immutable-version.md:222`.
   - Service only declares the code in union type (`packages/methodology-engine/src/version-service.ts:128`) with no observed emission path.
   - No matching assertions found in `packages/methodology-engine/src/version-service.test.ts` or `packages/api/src/routers/methodology.test.ts`.

4. **[HIGH] Concurrent publish loser-path diagnostic coverage is missing while task is marked complete**
   - Story task claims concurrent publish tests complete at `_bmad-output/implementation-artifacts/1-4-publish-validated-methodology-draft-as-immutable-version.md:78` and mapping requires `PUBLISH_CONCURRENT_WRITE_CONFLICT` at `_bmad-output/implementation-artifacts/1-4-publish-validated-methodology-draft-as-immutable-version.md:220`.
   - Current tests only assert duplicate-version diagnostics (`PUBLISH_VERSION_ALREADY_EXISTS`) in `packages/methodology-engine/src/version-service.test.ts:714` and `packages/api/src/routers/methodology.test.ts:651`.
   - Impact: deterministic loser-path behavior for concurrent publish is unproven.

5. **[MEDIUM] Fact type contract drift (`date`) across layers causes inconsistent validation behavior**
   - Shared contracts include `date` in `VariableValueType` at `packages/contracts/src/methodology/version.ts:17`.
   - Publish/lifecycle validators only allow `string|number|boolean|json` in `packages/methodology-engine/src/version-service.ts:107` and `packages/methodology-engine/src/lifecycle-validation.ts:18`.
   - Impact: inconsistent acceptance of fact types between contracts and runtime validation.

6. **[MEDIUM] Story File List does not fully reflect current working-tree changes**
   - Story file list is limited to 1.4 scope files (`_bmad-output/implementation-artifacts/1-4-publish-validated-methodology-draft-as-immutable-version.md:301` onward).
   - Additional changed/untracked files exist outside this list (for example: `_bmad-output/implementation-artifacts/1-3-define-workflows-under-work-unit-scope-and-bind-executable-subset-to-transitions.md`, `docs/plans/2026-02-25-methodology-publish-design.md`, `docs/plans/2026-02-25-methodology-publish-implementation-plan.md`, `_bmad-output/planning-artifacts/research/`).
   - Impact: review traceability is reduced unless scope exclusions are documented.

#### Resolution Notes (2026-02-25)

- Fixed CRITICAL key/id mismatch by resolving definition from `methodologyKey` first, then querying version by `definition.id` in `packages/methodology-engine/src/version-service.ts`.
- Ensured stable publish-failure payload shape includes `evidenceRef` key by setting `evidenceRef: null` in publish diagnostics and allowing nullable optional schema in `packages/contracts/src/methodology/version.ts`.
- Implemented deterministic `PUBLISH_ATOMICITY_GUARD_ABORTED` mapping path and added explicit engine/API tests for the diagnostic code.
- Added deterministic concurrent publish conflict tests in engine/API covering `PUBLISH_CONCURRENT_WRITE_CONFLICT` loser-path diagnostics.
- Removed `date` from `VariableValueType` in `packages/contracts/src/methodology/version.ts` to align facts type contract with publish/lifecycle validators.
- Clarified review scope by keeping Story 1.4 file list limited to story-owned files and documenting unrelated workspace changes as out-of-scope.

### Senior Developer Review (AI) - Pass 2

- Reviewer: Gondilf
- Date: 2026-02-25
- Outcome: Resolved

#### Findings

1. **[HIGH] Publish diagnostics contract still permits omitting required `evidenceRef` key**
   - Story contract requires `evidenceRef` as a required publish-failure payload key at `_bmad-output/implementation-artifacts/1-4-publish-validated-methodology-draft-as-immutable-version.md:158`.
   - Runtime contract schema still declares `evidenceRef` optional in `packages/contracts/src/methodology/version.ts:86`.
   - Impact: payload shape can diverge from required deterministic key contract.

2. **[HIGH] Repository catch remaps all unknown persistence failures to atomicity-guard code**
   - In `packages/db/src/methodology-repository.ts:848` onward, unknown failures are converted to `PUBLISH_ATOMICITY_GUARD_ABORTED` at `packages/db/src/methodology-repository.ts:862`.
   - Impact: unrelated DB/runtime failures can be mislabeled as atomicity-guard violations, reducing diagnostic accuracy and making remediation misleading.

3. **[MEDIUM] Publish error classification remains string-message based instead of typed-tag matching**
   - Service mapping depends on message text extraction (`causeText`) in `packages/methodology-engine/src/version-service.ts:731` and literal comparisons at `packages/methodology-engine/src/version-service.ts:733`, `packages/methodology-engine/src/version-service.ts:752`, `packages/methodology-engine/src/version-service.ts:771`, `packages/methodology-engine/src/version-service.ts:790`.
   - Impact: fragile coupling between repository error message strings and deterministic diagnostics mapping.

4. **[MEDIUM] DB integration tests still do not cover concurrent loser path or atomicity-guard failure path**
   - Story test matrix explicitly includes atomicity-guard failure coverage at `_bmad-output/implementation-artifacts/1-4-publish-validated-methodology-draft-as-immutable-version.md:222` and includes concurrent publish behavior as required coverage.
   - `packages/db/src/methodology-repository.integration.test.ts` has no assertions for `PUBLISH_CONCURRENT_WRITE_CONFLICT` or `PUBLISH_ATOMICITY_GUARD_ABORTED` paths.
   - Impact: DB-level deterministic behavior for these failure modes is not proven by integration tests.

#### Resolution Notes (Pass 2 - 2026-02-25)

- `ValidationDiagnostic.evidenceRef` is now required-nullable in contracts (`Schema.NullOr(Schema.String)`) and publish diagnostics continue emitting `evidenceRef: null` for stable payload keys.
- Repository publish errors now carry typed `code` via `RepositoryError.code`, and service publish mapping is code-driven (`error.code`) instead of string-message parsing.
- DB publish catch no longer blanket-remaps unknown failures to atomicity guard; atomicity code is only assigned for explicit guard cases/`methodology_version_events` write failures.
- Added DB integration coverage for repeat publish conflict and atomicity-guard event-write failure with rollback assertions.

### Completion Notes List

- Created story file for Story 1.4 and set status to `ready-for-dev`.
- Incorporated Epic 1.4 acceptance criteria exactly from epics artifact.
- Added implementation guardrails from architecture, UX diagnostics contract, project context, prior story learnings, and recent git patterns.
- Recorded Bun-based package-version awareness check for latest technical context.
- Implemented publish contracts and schema tests (publish command input, publication evidence payload, published event type).
- Added DB publish transaction + append-only evidence query, plus draft-status immutability guard in repository update paths.
- Implemented methodology-engine publish orchestration with deterministic publish diagnostics and Facts v1 validation checks.
- Added API procedures for publish and publication evidence retrieval with authenticated publish semantics.
- Added deterministic engine/API/DB tests for publish success, duplicate-version rejection, refs/derived facts rejection, and evidence append-only behavior.
- Enforced repository-level immutability guardrails in lifecycle persistence path for defense in depth.

### Change Log

- 2026-02-25: Senior Developer Review added; status moved to `in-progress` due unresolved CRITICAL/HIGH findings.
- 2026-02-25: Resolved all review findings; added deterministic conflict/atomicity coverage; restored status to `review`.
- 2026-02-25: Second review pass found additional HIGH/MEDIUM issues; status moved back to `in-progress`.
- 2026-02-25: Implemented pass-2 fixes for diagnostics contract, typed repository codes, code-driven publish mapping, and DB integration coverage; restored status to `review`.

### File List

- `_bmad-output/implementation-artifacts/1-4-publish-validated-methodology-draft-as-immutable-version.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `packages/contracts/src/methodology/version.ts`
- `packages/contracts/src/methodology/version.test.ts`
- `packages/methodology-engine/src/repository.ts`
- `packages/methodology-engine/src/version-service.ts`
- `packages/methodology-engine/src/version-service.test.ts`
- `packages/methodology-engine/src/lifecycle-validation.ts`
- `packages/db/src/methodology-repository.ts`
- `packages/db/src/methodology-repository.integration.test.ts`
- `packages/db/src/lifecycle-repository.ts`
- `packages/api/src/routers/methodology.ts`
- `packages/api/src/routers/methodology.test.ts`
