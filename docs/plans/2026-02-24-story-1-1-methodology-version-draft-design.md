# Story 1.1 Design: Methodology Version Draft Baseline

Date: 2026-02-24
Story: 1.1 (`1-1-create-methodology-draft-baseline`)
Scope: design refinement before implementation

## Purpose

Story 1.1 establishes the methodology authoring baseline in Chiron by creating and validating a methodology version in `draft` state with deterministic diagnostics and append-only lineage.

Story 1.1 also includes methodology-scoped registries for variable/fact definitions and dependency type definitions, without normalizing work-unit/transition/slot/workflow tables yet.

This is not telemetry work. This is domain-state and evidence work.

## Domain Alignment (Chiron)

Draft is a lifecycle state on methodology versions, not a separate top-level entity.

- Stable identity: `methodology_definitions`
- Versioned payload and lifecycle: `methodology_versions` with `status` (`draft|active|deprecated|retired`)
- Project pinning (later stories): `project_methodology_pins`

This follows existing migration-era schema language and Chiron methodology-first architecture.

## Chosen Approach

Use definition + version model now (recommended), with append-only version lineage table.

Why:
- Matches existing Chiron domain naming and lifecycle semantics
- Keeps Story 1.1 minimal and deterministic
- Avoids introducing conflicting `methodology_drafts` entity model

## Data Model for Story 1.1

### Existing or Reintroduced Core Tables

1. `methodology_definitions`
   - `id` (pk)
   - `key` (unique)
   - `name`
   - `description_json`
   - `created_at`, `updated_at`

2. `methodology_versions`
   - `id` (pk)
   - `methodology_id` (fk -> `methodology_definitions.id`)
   - `version` (text)
   - `status` (`draft|active|deprecated|retired`)
   - `upgrade_policy`
   - `min_supported_from_version`
   - `definition_json`
   - `created_at`, `retired_at`
   - unique: (`methodology_id`, `version`)

### New Append-Only Lineage Table (Story 1.1)

`methodology_version_events` (preferred default)

- `id` (pk)
- `methodology_version_id` (fk -> `methodology_versions.id`)
- `event_type` (`created|updated|validated`)
- `actor_id` (nullable for local/dev fallback)
- `changed_fields_json` (json list)
- `diagnostics_json` (json diagnostics payload)
- `created_at`

Indexes:
- (`methodology_version_id`, `created_at`, `id`) for deterministic lineage queries

Note: name can be switched to `methodology_version_history` if strict `*_history` naming consistency is preferred.

### Additional Methodology Registries Included in Story 1.1

3. `methodology_variable_definitions`
   - methodology-scoped fact/variable definition registry
   - key/type/scope/default/validation metadata
   - deterministic validation at draft update boundaries

4. `methodology_link_type_definitions`
   - methodology-scoped dependency type semantics
   - includes at least `hard|soft|context` plus policy metadata
   - definition-level semantics only (no runtime work-unit link edges in 1.1)

## API Contract (Story 1.1)

1. `methodology.createDraftVersion`
   - Input: `{ methodologyKey, displayName, version, definition }`
   - Effect:
     - find/create `methodology_definitions`
     - create `methodology_versions` row with `status='draft'`
     - persist optional methodology-scoped `variableDefinitions` and `dependencyTypes` registries when provided
     - validate deterministically
     - append `created` event row

2. `methodology.updateDraftVersion`
   - Input: `{ methodologyKey, version, patch }`
   - Effect:
     - only update if `status='draft'`
     - merge patch into `definition_json`
     - upsert optional methodology-scoped `variableDefinitions` and `dependencyTypes` registries when present in patch
     - validate deterministically
     - append `updated` event row with changed fields

3. `methodology.validateDraftVersion`
   - Input: `{ methodologyKey, version }`
   - Effect:
     - deterministic validation output
     - append `validated` event row

4. `methodology.getDraftLineage`
   - Input: `{ methodologyKey, version }`
   - Output:
     - ordered lineage from `methodology_version_events`
     - sort: (`created_at`, `id`) ascending

## Validation and Determinism Rules

Required contract fields:
- `methodologyKey`
- `displayName`
- `workUnitTypes[]`
- `transitions[]`
- `allowedWorkflowsByTransition`

Deterministic diagnostics shape:
- `code`
- `scope`
- `blocking`
- `required`
- `observed`
- `remediation`
- `timestamp`
- optional `evidenceRef`

Determinism requirements:
- Equivalent input produces equivalent diagnostics content and ordering
- Stable sort order: `scope`, then `code`, then stable path/index key
- No partial DB commit on validation failure
- All mutating operations are transactional

## Package and File Map

### `packages/contracts`
- `src/methodology/version.ts`
  - definition schema
  - status schema
  - diagnostics schema
  - event schema
- update `src/index.ts` exports

### `packages/db`
- `src/schema/methodology.ts`
  - table definitions for `methodology_definitions`, `methodology_versions`, `methodology_version_events`
- update `src/schema/index.ts` exports

### `packages/methodology-engine`
- `src/version-service.ts`
  - `createDraftVersion`
  - `updateDraftVersion`
  - `validateDraftVersion`
  - `getDraftLineage`
- update `src/index.ts` exports

### `packages/api`
- `src/routers/methodology.ts`
  - oRPC procedures for create/update/validate/lineage
- update `src/routers/index.ts` to include methodology router

### Tests
- `packages/methodology-engine/src/version-service.test.ts`
- `packages/api/src/routers/methodology.test.ts`
- `packages/db/src/schema/methodology.test.ts` (schema/index/constraint smoke)

## Non-Goals for Story 1.1

- Publishing immutable methodology versions (Story 1.4)
- Project pinning and pin lineage behavior (Story 1.5)
- Frontend implementation for methodology authoring UI
- Runtime transition execution semantics beyond draft contract validation
- Normalization of work-unit types, transition definitions, slot definitions, workflow definitions, and transition-workflow bindings (these belong to Stories 1.2/1.3)

## Epic 1 Scope Guardrails

1. Story 1.1: methodology identity/version baseline + version evidence + methodology variable/dependency type registries.
2. Story 1.2: work-unit type lifecycle, transition definitions, dependency requirement semantics, and gate-class constraints.
3. Story 1.3: workflow definitions and transition allowed-workflow bindings.
4. Story 1.4: publish validated draft into immutable version.
5. Story 1.5: project pinning and pin lineage.
6. Promotion rule: once a concept gets its own table, that table is the source of truth.

## Defaults Locked for Implementation Plan

1. Treat draft as `methodology_versions.status = 'draft'`.
2. Use append-only `methodology_version_events` table for lineage evidence.
3. Allow nullable `actor_id` with `system` fallback in local/dev context for Story 1.1.
4. Keep implementation backend-first (contracts/db/engine/api/tests), no frontend dependency.

## Open Rename Toggle (No Scope Change)

If preferred, only rename `methodology_version_events` -> `methodology_version_history` for naming consistency.

## Ready for Next Step

This design is ready to convert into an implementation task plan (step-by-step sequencing and test-first execution tasks).
