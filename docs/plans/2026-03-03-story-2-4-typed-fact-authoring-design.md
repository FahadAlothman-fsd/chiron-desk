# Story 2.4 Design: Typed Fact Authoring With Deterministic Validation

Date: 2026-03-03
Story: 2.4 (typed fact + variable definitions across methodology + work units)

## Goal
Enable operators to author rigorous fact definitions (methodology-level and work-unit-scoped) with type-aware defaults and deterministic validations (including filesystem-path policy checks and JSON Schema compatibility), so that publish is safely blocked on invalid contracts and published versions remain immutable.

## Non-Goals
- Enable workflow runtime execution controls (must remain visible-but-disabled in Epic 2).
- Introduce repository/workdir/git execution-context modeling (explicitly deferred to runtime/workflow slices).
- Validate filesystem existence or perform IO (path checks are purely semantic/safety checks).
- Support unbounded JSON Schema dialects (start with one dialect; extend later).

## Baseline (Already Implemented)
- Deterministic diagnostics shape and sorting patterns exist in `packages/contracts/src/methodology/version.ts` and are used by validators in `packages/methodology-engine/src/validation.ts` and `packages/methodology-engine/src/lifecycle-validation.ts`.
- Publish is copy-on-publish and blocked on blocking diagnostics (Story 1.4) with immutability guardrails (Story 2.3). See `packages/methodology-engine/src/version-service.ts`.

## Module Boundaries (Hard)
- `apps/web`: authoring UI, optimistic edits, inline rendering, diagnostic deep-link navigation.
- `packages/api`: transport only (decode/encode, routing, error mapping). No domain logic.
- `packages/methodology-engine`: all domain validation, publish gating, immutability enforcement, deterministic diagnostics.
- `packages/contracts`: the only shared cross-package surface; schemas defined with Effect Schema.

## Primary Design (Recommended)
### 1) One Authoritative Validator
Create a single facts-validation module in `packages/methodology-engine` that:
- Validates both scopes:
  - methodology-level fact definitions (`methodology_fact_definitions`)
  - work-unit fact schemas (`methodology_fact_schemas`)
- Is pure/deterministic: no clock reads, no random, no DB calls; accept `timestamp` as explicit input.
- Returns `ValidationResult` with stable diagnostics used by:
  - draft save responses (inline UX)
  - publish gating (blocking)

### 2) Typed Fact Model (Contracts)
Unify the fact base type across both scopes:
- `factType`: `string | number | boolean | json`
- `defaultValue`: `unknown` (validated against `factType` and optional `validation`)

Add story-required metadata:
- `description`: optional string
- `guidance`: structured JSON for dual audiences
- `validation`: discriminated union (for deterministic decoding and diagnostics)

Recommended shapes (names illustrative):
- `FactGuidance = { human?: {...}; agent?: {...} }`
- `FactValidation =
  | { kind: "none" }
  | { kind: "path"; pathKind: "file"|"directory"; normalization: "posix_relative_v1"; safety: { forbidTraversal: true; forbidAbsolute: true; forbidBackslash: true } }
  | { kind: "json_schema"; schemaDialect: "2020-12"; schema: unknown }`

Note: "path" is a semantic profile over string-backed facts (base `factType` remains `string`).

### 3) Deterministic Diagnostics
Diagnostics must be stable for equivalent inputs:
- Stable sort: `scope` asc, `code` asc, then stable key/index.
- Avoid embedding raw library error dumps as the primary message.
- Use `scope` strings that map directly to editable UI targets (deep-links), for example:
  - `factDefinitions[<key>].defaultValue`
  - `workUnitTypes[<wutKey>].factSchemas[<factKey>].validation`

### 4) Path Policy (Deterministic, No IO)
Assumption (risk-reducing default): paths are POSIX-style, repo/workspace-relative, and use `/` separators.
- Reject absolute paths (leading `/`).
- Reject traversal segments (`..`).
- Reject backslashes (`\`).
- Normalize redundant segments (`./`, repeated `/`) and require the stored default to already be normalized.
- `pathKind` semantics (minimal, deterministic):
  - `file`: normalized path must not end with `/`.
  - `directory`: normalized path must end with `/`.

### 5) JSON Schema Compatibility (Deterministic)
For `factType === "json"`:
- If `validation.kind === "json_schema"` is present:
  - validate the schema is a valid JSON Schema for the declared dialect
  - validate `defaultValue` against the schema

Implementation approach: use Ajv in `packages/methodology-engine` only. Ajv supports multiple drafts; start with dialect `2020-12` (matches current JSON Schema "current version") and add more only when required.

### 6) Publish Blocking and Published Immutability
- Draft writes remain atomic (transactional). They may persist even if invalid, but must return deterministic diagnostics on save.
- Publish must be blocked if any blocking fact diagnostics exist.
- Published versions are immutable:
  - Service guards: reject any mutation call when `status != "draft"`.
  - Repository guards: re-check `status == "draft"` inside the write transaction and fail with deterministic `PUBLISHED_CONTRACT_IMMUTABLE` mapping.

## Persistence Changes (DB)
Required to support Story 2.4 fields:
- `methodology_fact_definitions`: add `guidance_json` (JSON).
- `methodology_fact_schemas`: add `validation_json` (JSON).

Also update repository projections used for publish validation to include:
- `validationJson` for work-unit fact schemas
- `validationJson` + `guidanceJson` for methodology-level fact definitions (parity)

## API / UI Surfaces
- API should add focused mutation(s) for facts authoring to reduce overwrite risk:
  - `updateDraftFacts` (methodology-level factDefinitions only)
  - work-unit fact schemas continue to be authored through lifecycle update payloads
- UI should reuse Story 2.3 diagnostics grouping + deep-link model; facts validators must emit scopes that the UI can map to exact editable context.

## Sequencing (Risk-Reducing)
1) Contracts and engine validators (pure, unit-tested, deterministic) before UI.
2) DB persistence changes and repository shape updates next.
3) Wire validators into save/publish paths and API error mapping.
4) Implement UI authoring surfaces last.

## Escalation Triggers (When to Revisit)
- Need Windows/absolute path support: introduce explicit `pathDialect` and expand validation without changing base typing.
- Need multiple JSON Schema drafts: add dialect-specific Ajv instances and normalize diagnostics per dialect.
