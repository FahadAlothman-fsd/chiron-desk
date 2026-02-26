# Story 1.4 Design: Publish Validated Methodology Draft as Immutable Version

Date: 2026-02-25
Story: 1.4 (publish validated methodology draft as immutable version)

## Goal
Publish a validated draft into an immutable methodology version that is queryable by `methodologyVersion + workUnitType`, with deterministic publish diagnostics, Facts v1 enforcement, concurrency-safe versioning, immutable mutation guardrails, and append-only publication evidence.

## Chosen Publish Semantics (Copy-on-Publish)
- Draft remains editable (`methodology_versions.status='draft'`).
- Publish creates a NEW `methodology_versions` row for the requested `publishedVersion` in `active` status.
- Canonical contract snapshot for the published version is persisted by COPYING normalized rows from the source draft version to the new published version.
- Publication evidence is appended exactly once for successful publishes.

Rationale:
- Supports repeated publishes from an evolving draft without mutating already-published versions.
- Makes `sourceDraftRef` meaningful for audit.
- Enables deterministic duplicate-version errors via unique constraints.

## Deterministic Publish Validation
Publish validation compiles the canonical contract from normalized tables only (not from `definitionExtensions`) and produces deterministic diagnostics.

Validation inputs (canonical sources):
- Lifecycle + facts + agents: derived from normalized rows (same semantics as lifecycle service reconstruction).
- Workflows + bindings + guidance overlays: derived from normalized rows via workflow snapshot.
- Definition extensions: treated as non-authoritative metadata only.

Validation steps (ordered):
1) Required contract completeness gate:
   - must have work unit types, transitions, workflows, and transition-workflow bindings.
2) Facts v1 publish validation (blocking):
   - static typed fields: factType in {string, number, boolean, json}
   - unique keys per work unit type
   - valid defaults compatible with factType
   - forbid refs/derived expressions in defaults (reject objects containing keys like $ref/ref/derived/expr)
3) Workflow graph + binding validation (blocking):
   - reuse deterministic validator semantics (step types, reachability, entry/terminal constraints, unresolved bindings)

Diagnostics determinism requirements:
- Equivalent inputs produce identical diagnostic `code`, `scope`, `required`, `observed`, `remediation` content and ordering.
- Stable sort order: `scope`, then `code`, then stable path/index.
- Timestamp must be injected (no implicit clock dependency inside pure validators).

## Duplicate Version + Concurrent Publish Handling
- Duplicate version:
  - if `(methodologyId, publishedVersion)` already exists, publish fails with `PUBLISH_VERSION_ALREADY_EXISTS` and performs zero additional writes.
- Concurrent publish race:
  - publish uses a single transaction, inserting the published version row first.
  - unique constraint collisions or SQLite write-lock errors map to `PUBLISH_CONCURRENT_WRITE_CONFLICT`.

## Immutability Guardrails (Defense-in-Depth)
API/service guard:
- any authoring mutation path must enforce `status==='draft'` prior to write.

Repository guard:
- every repository write transaction must re-check status inside the transaction and fail if not draft.
- this blocks mutation even if a service forgets to enforce draft-only rules.

Immutable mutation diagnostics:
- published mutation attempts return `PUBLISHED_CONTRACT_IMMUTABLE` with stable payload shape.

## Append-Only Publication Evidence
- Evidence is recorded in `methodology_version_events` as an append-only event stream.
- Add event type: `published`.
- For successful publish, append exactly one `published` event referencing the published version id.

Required evidence payload fields (stored in `changedFieldsJson` or `diagnosticsJson`):
- actorId
- timestamp (from event created_at)
- sourceDraftRef (draft version id)
- publishedVersion
- validation summary (valid, blockingCount, codes)

Constraints:
- No publish evidence is written if publish validation fails (blocking).
- Evidence must remain queryable via existing lineage APIs.

## Query: methodologyVersion + workUnitType
Add a read path that resolves:
- methodologyKey -> methodologyId
- methodologyId + methodologyVersion -> published version row (must be active)
- (published version id + workUnitTypeKey) -> work unit contract projection

Projection should come from normalized tables and include:
- work unit type definition, lifecycle states, transitions, required links, fact schemas
- workflows tied to the work unit type (steps + edges)
- transition-workflow bindings filtered to transitions in the work unit type

## Transaction + Error Mapping Patterns
- Use a single DB transaction for publish: insert published version row -> copy normalized rows -> append published evidence.
- No partial publish state on any failure.
- Map DB unique constraint / lock errors to deterministic engine errors, then to API transport errors:
  - version exists -> CONFLICT
  - concurrent write conflict -> CONFLICT (retryable)
  - publish validation failures -> BAD_REQUEST with deterministic diagnostics payload
  - immutable mutation -> PRECONDITION_FAILED

## Test Matrix (Minimum)
Engine tests:
- publish success creates immutable version + evidence and is queryable by version+workUnitType
- Facts v1 failures (duplicate keys, invalid type, reserved key, invalid default, forbidden ref/derived token)
- required contract incomplete fails with deterministic diagnostics
- duplicate version publish fails with zero writes
- concurrent publish yields single winner and deterministic loser diagnostics

DB/integration tests:
- atomicity: forced failure mid-copy leaves no published row and no evidence
- append-only: evidence only inserts, lineage ordering stable
- copy correctness: published normalized rows match draft at publish time

API tests:
- error mapping for publish validation, duplicate version, concurrent conflict, immutable mutation
- deterministic diagnostics payload structure across repeat calls
