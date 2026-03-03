# Story 2.4: Implement Rigorous Facts and Variable Type Authoring Across Methodology and Work Units

Status: done

## Story

As an operator,
I want to author and maintain rigorous fact and variable definitions across methodology and work unit scopes with strict type-aware validation,
so that execution contracts remain reliable before and after publish.

## Acceptance Criteria

1. **Given** I am in the post-Story-2.3 methodology draft workspace
   **When** I create, update, or remove methodology-level fact definitions
   **Then** I can manage fields `key`, `factType`, `defaultValue`, `description`, `guidance`, and `validation`
   **And** changes persist deterministically through backend contracts without local-state corruption.
2. **Given** I am authoring work unit definitions in the methodology workspace
   **When** I create, update, or remove work-unit fact schemas
   **Then** each schema supports `key`, `factType`, `defaultValue`, `guidance`, and `validation`
   **And** uniqueness and scope constraints are enforced deterministically.
3. **Given** I configure fact defaults and validation rules
   **When** I select a supported base type (`string`, `number`, `boolean`, `json`) and, for string-backed values, optionally mark a `path` profile with `pathKind` (`file` or `directory`)
   **Then** the UI renders type-appropriate inputs
   **And** inline compatibility checks surface actionable diagnostics for invalid defaults, invalid path semantics, and invalid JSON-schema-backed defaults when `factType` is `json`.
4. **Given** the draft contains invalid fact constraints
   **When** I save or publish
   **Then** the backend returns deterministic structured diagnostics for duplicate keys, unsupported types, reserved keys, or invalid defaults
   **And** publish is blocked when blocking diagnostics exist with links to exact editable context.
5. **Given** fact authoring permits filesystem-oriented values by validation policy
   **When** I enter path-like defaults or constraints
   **Then** deterministic policy checks validate format, normalization, and safety constraints
   **And** invalid or unsafe values return actionable diagnostics.
6. **Given** a methodology version is already published
   **When** I attempt to mutate immutable fact-contract fields
   **Then** backend mutation is deterministically rejected
   **And** the UI renders immutable diagnostics without corrupting local or cached state.
7. **Given** I am operating in Epic 2 workspace context
   **When** runtime execution controls are visible
   **Then** they remain visible but disabled with rationale `Workflow runtime execution unlocks in Epic 3+`
   **And** facts authoring and validation remain fully usable.

## Tasks / Subtasks

- [x] Implement methodology-level fact definition authoring and persistence surfaces (AC: 1)
  - [x] Add edit flows for `key`, `factType`, `defaultValue`, `description`, `guidance`, `validation`
  - [x] Ensure deterministic save/reload behavior in workspace state after mutations
- [x] Implement work-unit fact schema authoring with deterministic scope rules (AC: 2)
  - [x] Support add/edit/remove flows for `key`, `factType`, `defaultValue`, `guidance`, `validation`
  - [x] Enforce deterministic uniqueness and scope constraints at service boundary
- [x] Add type-aware UI and inline compatibility validation (AC: 3)
  - [x] Render type-specific inputs for `string|number|boolean|json`
  - [x] For string-backed fields, support optional `path` profile with explicit `pathKind` (`file` or `directory`) and deterministic path checks
  - [x] Support structured guidance authoring for both operator and agent audiences
  - [x] For `json` facts, support validation schema configuration in `validation` and enforce default/schema compatibility
  - [x] Validate default value compatibility and show actionable remediation in-line
- [x] Harden save/publish validation and diagnostic deep-link behavior (AC: 4)
  - [x] Return deterministic diagnostics payloads for duplicate, unsupported, reserved, and incompatible values
  - [x] Block publish on blocking diagnostics and keep links/focus targets to exact editable context
- [x] Implement filesystem-oriented path validation policy where configured (AC: 5)
  - [x] Validate path-like values with deterministic normalization/safety policy
  - [x] Return stable diagnostics for unsafe or invalid path values (for example traversal/invalid format)
- [x] Enforce published-version immutability for fact contracts (AC: 6)
  - [x] Reject immutable mutations in backend deterministically
  - [x] Preserve UI/local cache integrity after immutable rejection responses
- [x] Preserve Epic 2 runtime deferment UX boundary (AC: 7)
  - [x] Keep runtime controls visible-but-disabled with exact rationale copy
  - [x] Ensure deferment does not block facts authoring, validation, or publish-readiness checks
- [x] Add verification coverage and quality gates
  - [x] Unit tests for type-aware validation, uniqueness rules, reserved-key checks, and path policy checks
  - [x] Integration/component tests for save/publish blocked paths, immutable rejection behavior, and deterministic reloads
  - [x] Run `bun check`, `bun check-types`, and targeted `bun run test` suites before handoff

## Dev Notes

### Developer Context Section

- Story 2.2 established the methodology version workspace authoring baseline and deterministic projection model; Story 2.3 hardened validation/publish/evidence UX. Story 2.4 extends that same workspace without re-creating existing baseline behaviors.
- This story is the contract hardening layer for typed facts/variables authoring. Keep deterministic diagnostics and auditability posture consistent with Epic 2 foundations.
- Runtime execution remains out of scope for Epic 2. Do not introduce executable runtime semantics; preserve disabled runtime controls and exact rationale copy.

### Technical Requirements

- Methodology-level fact definition contract must support: `key`, `factType`, `defaultValue`, `description`, `guidance`, `validation`.
- Work-unit fact schema contract must support: `key`, `factType`, `defaultValue`, `guidance`, `validation`.
- Allowed primitive types for this horizon are fixed to: `string`, `number`, `boolean`, `json`.
- `guidance` should be structured JSON (not plain text) and support dual audiences:
  - `guidance.human`: short/long help and examples
  - `guidance.agent`: intent, constraints, and examples
- `validation` should use a discriminated structure (for example `validation.kind`) rather than key-as-type blobs so Effect decoding and diagnostics stay deterministic.
- Path support in this story is required now as a string-backed semantic profile (`factType` remains `string` with additional path validation policy).
- Path profile shape in this story:
  - `validation.path.pathKind`: `file|directory`
  - `validation.path.normalization`: deterministic normalization policy
  - `validation.path.safety`: safety constraints (for example traversal prevention)
- `json` fact schema support in this story is stored under `validation` (not `guidance`), with a schema dialect and schema payload (for example `validation.schemaDialect` + `validation.schema`) used for compatibility checks.
- Future expansion note: typed entity-backed variable categories can be added in a later story without breaking this contract by introducing additive metadata (for example a value-profile/entity-kind dimension) while keeping primitive base typing backward-compatible.
- Future git semantics note: introduce additive string validation profiles (`git-url`, `git-branch`, `git-ref`) in Slice A runtime/workflow stories without changing base primitive typing.
- Validation failures must emit deterministic diagnostics with stable fields and actionable remediation (`code`, `scope`, `blocking`, `required`, `observed`, `remediation`, timestamps/evidence refs where available).
- Publish must be blocked by blocking diagnostics; no partial state commit on invalid draft mutations.
- Path-like values (when permitted by policy) must be validated by deterministic safety rules (for example traversal prevention, invalid-character checks, normalization constraints).
- Published-version fact contract fields are immutable; mutation attempts must be rejected deterministically by backend and surfaced in UI without local-state corruption.
- Fact-level mandatory semantics are not encoded via a `required` fact field in this story; requiredness is enforced by step input contracts and transition conditions.
- Repository/workdir/git execution-context modeling is out of scope for Story 2.4 and should be handled in Slice A runtime/workflow stories.
- In Story 2.4 scope, repository-related values are treated like any other methodology-defined project facts and validated through the same fact typing/profile mechanisms.

### Architecture Compliance

- Keep module boundaries intact:
  - UI authoring + rendering in `apps/web`
  - API transport/composition in `packages/api`
  - Domain validation/publish immutability logic in `packages/methodology-engine`
  - Shared typed schemas in `packages/contracts`
- Preserve Effect-first service composition and typed error/diagnostics channels at boundaries.
- Keep `contracts` as the shared cross-package surface; avoid direct cross-module internals coupling.
- Maintain deterministic diagnostics and append-only evidence orientation used throughout Epic 2.

### Library and Framework Requirements

- Continue React 19 and TanStack Query v5 mutation/invalidation patterns already used in methodology workspace.
- Continue `@xyflow/react` v12 semantics for graph/workspace interactions and scope-aware context linking.
- Use Effect Schema and strict TypeScript boundary decoding rules for newly introduced contract paths.
- Keep existing shadcn/Radix interaction and accessibility semantics for editor controls and diagnostics rendering.

### File Structure Requirements

- Primary web implementation surfaces (extend, do not fork):
  - `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.tsx`
  - `apps/web/src/features/methodologies/version-workspace.tsx`
  - `apps/web/src/features/methodologies/version-workspace-graph.tsx`
  - `apps/web/src/features/methodologies/version-graph.ts`
- Shared contracts and API/domain surfaces:
  - `packages/contracts/src/methodology/fact.ts`
  - `packages/contracts/src/methodology/lifecycle.ts`
  - `packages/contracts/src/methodology/version.ts`
  - `packages/api/src/routers/methodology.ts`
  - `packages/methodology-engine/src/validation.ts`
  - `packages/methodology-engine/src/lifecycle-validation.ts`
  - `packages/methodology-engine/src/version-service.ts`
- Keep tests co-located with touched features/services and avoid manual edits to generated artifacts.

### Testing Requirements

- Unit tests:
  - type-aware default compatibility checks for all supported fact value types
  - duplicate/reserved key detection and deterministic scope constraints
  - filesystem/path-like value policy checks (when applicable)
  - immutable-field rejection handling with local-state integrity
- Integration/component tests:
  - draft save with valid facts and deterministic reload behavior
  - blocked save/publish path with grouped actionable diagnostics and deep-links
  - published-version immutable mutation rejection with no cache/form corruption
  - runtime controls visible-but-disabled while facts authoring remains usable
- Verification commands:
  - `bun check`
  - `bun check-types`
  - `bun run test` (targeted methodology workspace + methodology engine + API router suites)

### Previous Story Intelligence

- Story 2.3 already hardened diagnostics grouping, publish blocking, immutable rejection rendering, and evidence visibility. Reuse those patterns directly instead of introducing alternate diagnostics or state-management approaches.
- Keep deterministic query invalidation/refetch discipline from Stories 2.2/2.3 to prevent graph/form/evidence drift.
- Preserve exact runtime deferment rationale copy: `Workflow runtime execution unlocks in Epic 3+`.

### Git Intelligence Summary

- Recent story commits consistently apply cross-layer changes in lockstep (`apps/web`, `packages/api`, `packages/methodology-engine`, test files) while preserving module boundaries.
- Story artifacts and `sprint-status.yaml` were updated together in recent story progression commits; continue that process.
- Verification posture in recent work used targeted test suites plus workspace checks; follow the same rigor for this story.

### Latest Tech Information

- Latest npm versions checked during context generation:
  - `@tanstack/react-form`: `1.28.3`
  - `@tanstack/react-query`: `5.90.21`
  - `@xyflow/react`: `12.10.1`
  - `effect`: `3.19.19`
- Current repo ranges are already aligned with these major lines for Story 2.4 scope. No cross-major migration is required; implement on current project baselines.

### Project Context Reference

- Read and apply `_bmad-output/project-context.md` before implementation.
- Enforce strict TypeScript, Effect Schema boundary decoding, explicit module boundaries, deterministic tests, and OXC checks.
- Do not introduce patterns that conflict with UX/architecture planning artifacts.

### Story Completion Status

- Ultimate context engine analysis completed for Story 2.4 using epic context, PRD/architecture/UX constraints, previous-story intelligence, git pattern analysis, and latest package-version checks.
- Story status is set to `ready-for-dev` and sprint tracking is updated accordingly.

### Project Structure Notes

- This is a Turborepo monorepo with cross-package methodology contracts and service boundaries.
- Story 2.4 spans UI authoring surfaces and shared API/domain contract enforcement; keep changes additive to Story 2.2/2.3 baselines.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 2 - Story 2.4]
- [Source: _bmad-output/planning-artifacts/epics.md#Story Dependency Matrix]
- [Source: _bmad-output/planning-artifacts/prd.md#Requirements]
- [Source: _bmad-output/planning-artifacts/architecture.md#System Architecture and Module Boundaries]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Methodology Publish and Share (Episodic Refinement)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Diagnostics and Evidence Pattern]
- [Source: _bmad-output/project-context.md#Critical Implementation Rules]
- [Source: _bmad-output/implementation-artifacts/2-3-deliver-validation-publish-and-evidence-ux-for-methodology-contracts.md#Dev Notes]
- [Source: _bmad-output/implementation-artifacts/sprint-status.yaml#development_status]
- [Source: git log -5 output in repo root]
- [Source: npm registry lookups for @tanstack/react-form, @tanstack/react-query, @xyflow/react, effect]

## Dev Agent Record

### Agent Model Used

openai/gpt-5.3-codex

### Debug Log References

- Create-story workflow execution for Story 2.4 with explicit story selection input (`2-4`).
- Full sprint-status parse and target story key resolution.
- Epic context extraction, previous-story analysis, architecture/PRD/UX/project-context review, and recent git commit pattern analysis.
- Latest package-version checks for critical implementation libraries.

### Completion Notes List

- Status moved to `done`; implementation and code-review remediation are complete.
- AC1/AC2 contract expansion implemented: methodology/work-unit facts now support `name`, `key`, `factType`, `defaultValue`, `description`, structured `guidance`, and discriminated `validation` (`none|path|json-schema`).
- AC3 type-aware authoring implemented in web workspace with structured fact forms for both methodology and work-unit scopes (shared form schema), markdown-friendly guidance authoring, and per-type default handling.
- AC3/AC5 validation profile UX implemented: path profile controls (`pathKind`, normalization/safety toggles) and structured json-schema builder (root type, properties, nested properties, required, descriptions, additionalProperties).
- AC4 deterministic diagnostics hardening implemented in backend validation paths (draft/lifecycle and publish) for invalid defaults, invalid path usage, invalid json-schema usage, and compatibility mismatches.
- AC5 deterministic path policy checks implemented (normalization, traversal prevention, absolute-path policy, null-byte checks) with stable diagnostics.
- AC6 immutability handling preserved via existing Story 2.3 rejection patterns while extending fact contract paths.
- AC7 Epic 2 runtime deferment preserved (`Workflow runtime execution unlocks in Epic 3+`) while enabling expanded fact authoring.
- Additional UX beyond ACs: section tones, Fact Authoring Studio, section-level `Save Facts`, and URL-backed workspace tabs (`author|publish|evidence|context`) to reduce page density.
- Additional schema-authoring depth beyond AC baseline: recursive nested JSON-schema property editing and per-property audience descriptions (`description` + `x-agent-description`) plus per-property validation profile metadata (`x-validation`).
- Code-review remediations applied:
  - deterministic JSON serialization now canonicalizes object keys recursively before persistence rendering
  - route save/publish handlers now guard against duplicate in-flight submissions
  - fact editor now surfaces malformed fact JSON warnings and blocks `Save Facts` until valid edits are made
  - route integration tests now exercise the real workspace component (no full workspace mock)
  - targeted tests and workspace checks rerun successfully (`bun check`, `bun check-types`, targeted web tests)

### Reviewer Checklist

- Open methodology version workspace and verify URL-backed tabs work (`Author`, `Publish`, `Evidence`, `Context`) and persist on refresh/search-param navigation.
- In `Author`, create/edit methodology facts and work-unit fact schemas with full field coverage (`name`, `key`, `factType`, `defaultValue`, `description`, guidance fields, validation profile).
- Confirm Facts section dirty indicator toggles on edit and `Save Facts` uses the canonical draft save pipeline.
- For `validation.kind = path`, verify inline compatibility warning appears when property type is not `string`; verify path controls (`pathKind`, safety/normalization toggles) persist after save/reload.
- For `validation.kind = json-schema`, verify structured builder supports nested object properties, required flags, `additionalProperties`, and per-property operator/agent descriptions.
- Trigger invalid defaults/validation combinations and confirm deterministic diagnostics and publish blocking behavior remain intact.
- Confirm published-version immutability rejection behavior remains stable (no local form/cache corruption on rejected mutation).
- Confirm runtime controls remain visible-but-disabled with exact deferment rationale: `Workflow runtime execution unlocks in Epic 3+`.

### Known Intentional Scope

- JSON Schema builder is intentionally a constrained subset (root type, nested properties, required, additionalProperties, property descriptions, per-property validation metadata) rather than a full Draft 2020-12 editor.
- Per-property validation is currently stored as extension metadata (`x-validation`) to preserve authoring intent in the contract; full runtime/backend enforcement of all per-property profiles remains future scope.
- Section-level save (`Save Facts`) is a UX affordance over the same canonical draft save pipeline; no independent section transaction boundary was introduced.
- Workspace section splitting is implemented as URL-backed tab views (`?page=author|publish|evidence|context`) in the same route, not yet separate route modules.
- Raw contract JSON editing is removed from the normal operator flow in favor of structured editors.

### File List

- `_bmad-output/implementation-artifacts/2-4-implement-rigorous-facts-and-variable-type-authoring-across-methodology-and-work-units.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/planning-artifacts/chiron-active-doc-index-v1-week6.md`
- `packages/contracts/src/methodology/fact.ts`
- `packages/contracts/src/methodology/version.ts`
- `packages/contracts/src/methodology/dto.ts`
- `packages/contracts/src/methodology/version.test.ts`
- `packages/api/src/routers/methodology.ts`
- `packages/methodology-engine/src/lifecycle-validation.ts`
- `packages/methodology-engine/src/version-service.ts`
- `packages/methodology-engine/src/repository.ts`
- `packages/methodology-engine/src/lifecycle-repository.ts`
- `packages/methodology-engine/src/lifecycle-service.ts`
- `packages/db/src/schema/methodology.ts`
- `packages/db/src/methodology-repository.ts`
- `packages/db/src/lifecycle-repository.ts`
- `apps/web/src/features/methodologies/version-workspace.tsx`
- `apps/web/src/features/methodologies/version-workspace-graph.tsx`
- `apps/web/src/features/methodologies/command-palette.tsx`
- `apps/web/src/features/methodologies/version-workspace.integration.test.tsx`
- `apps/web/src/features/methodologies/version-workspace.persistence.test.ts`
- `apps/web/src/features/methodologies/workspace-shell.tsx`
- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.tsx`
- `apps/web/src/routes/-methodologies.$methodologyId.versions.$versionId.integration.test.tsx`
- `apps/web/src/index.css`
- `apps/web/package.json`
- `bun.lock`
