# Story 2.4 Typed Fact Authoring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement typed fact authoring across methodology- and work-unit-scopes with deterministic validations (path policy + JSON Schema compatibility), publish blocking, and published immutability without breaking Epic 2 workspace baselines.

**Architecture:** Keep contracts as the shared surface (`packages/contracts`), centralize all determinism and publish gating in `packages/methodology-engine`, keep `packages/api` as a thin transport layer, and implement UI authoring surfaces in `apps/web` that render type-aware inputs and consume structured diagnostics from the backend.

**Tech Stack:** TypeScript strict, Effect Schema, Effect services, Drizzle (SQLite/libsql), Bun, Vitest, React 19 + TanStack Query/Router.

---

### Task 0: Create an isolated worktree (recommended)

**Files:** none

**Step 1: Create worktree**

Run:
- `git worktree add ../chiron-story-2-4 -b story/2-4-typed-facts`

Expected: new directory `../chiron-story-2-4` with a clean checkout.

**Step 2: Install deps in worktree**

Run:
- `bun install`

Expected: install succeeds.

---

### Task 1: Contracts - unify fact definitions + add guidance/validation

**Files:**
- Modify: `packages/contracts/src/methodology/fact.ts`
- Modify: `packages/contracts/src/methodology/lifecycle.ts`
- Modify: `packages/contracts/src/methodology/version.ts`
- Modify: `packages/contracts/src/methodology/dto.ts`
- Test: `packages/contracts/src/methodology/version.test.ts`

**Step 1: Write failing contract tests**

In `packages/contracts/src/methodology/version.test.ts`, add tests that:
- decode a work unit type fact schema containing `guidance` and `validation`
- decode a methodology fact definition containing `factType` (not `valueType`), `guidance`, and discriminated `validation.kind`

Expected: FAIL because schemas do not accept these fields.

**Step 2: Run contract tests**

Run:
- `bun test packages/contracts/src/methodology/version.test.ts`

Expected: FAIL.

**Step 3: Implement contract shapes in `fact.ts`**

Modify `packages/contracts/src/methodology/fact.ts` to roughly:

```ts
import { Schema } from "effect";

export const FactType = Schema.Literal("string", "number", "boolean", "json");
export type FactType = typeof FactType.Type;

export const FactGuidance = Schema.Struct({
  human: Schema.optional(Schema.Unknown),
  agent: Schema.optional(Schema.Unknown),
});
export type FactGuidance = typeof FactGuidance.Type;

export const PathKind = Schema.Literal("file", "directory");
export type PathKind = typeof PathKind.Type;

export const PathSafetyPolicy = Schema.Struct({
  forbidTraversal: Schema.optionalWith(Schema.Boolean, { default: () => true }),
  forbidAbsolute: Schema.optionalWith(Schema.Boolean, { default: () => true }),
  forbidBackslash: Schema.optionalWith(Schema.Boolean, { default: () => true }),
});
export type PathSafetyPolicy = typeof PathSafetyPolicy.Type;

export const FactValidation = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("none") }),
  Schema.Struct({
    kind: Schema.Literal("path"),
    pathKind: PathKind,
    normalization: Schema.Literal("posix_relative_v1"),
    safety: PathSafetyPolicy,
  }),
  Schema.Struct({
    kind: Schema.Literal("json_schema"),
    schemaDialect: Schema.Literal("2020-12"),
    schema: Schema.Unknown,
  }),
);
export type FactValidation = typeof FactValidation.Type;

export const FactSchema = Schema.Struct({
  key: Schema.NonEmptyString,
  factType: FactType,
  required: Schema.optionalWith(Schema.Boolean, { default: () => true }),
  defaultValue: Schema.optional(Schema.Unknown),
  guidance: Schema.optional(FactGuidance),
  validation: Schema.optional(FactValidation),
});
export type FactSchema = typeof FactSchema.Type;

export const MethodologyFactDefinitionInput = Schema.Struct({
  key: Schema.NonEmptyString,
  factType: FactType,
  description: Schema.optional(Schema.String),
  guidance: Schema.optional(FactGuidance),
  defaultValue: Schema.optional(Schema.Unknown),
  validation: Schema.optional(FactValidation),
});
export type MethodologyFactDefinitionInput = typeof MethodologyFactDefinitionInput.Type;
```

Notes:
- Keep `validation` discriminated (`kind`) to preserve deterministic Effect decoding.
- Use defaults for `safety` booleans and enforce in engine validators.

**Step 4: Wire contracts to existing surfaces**

- Update `packages/contracts/src/methodology/lifecycle.ts` to use the new `FactSchema` (already imports it).
- Update `packages/contracts/src/methodology/version.ts` to:
  - remove/replace the existing `MethodologyFactDefinitionInput` and import it from `./fact.js`.
  - keep `VariableValueType` only if still needed elsewhere; prefer using `FactType` for facts.
- Update `packages/contracts/src/methodology/dto.ts` to import `MethodologyFactDefinitionInput` from `./fact.js` (this fixes the current mismatch).

**Step 5: Run contract tests**

Run:
- `bun test packages/contracts/src/methodology/version.test.ts`

Expected: PASS.

---

### Task 2: DB schema - add guidance/validation persistence columns

**Files:**
- Modify: `packages/db/src/schema/methodology.ts`

**Step 1: Add missing columns**

In `packages/db/src/schema/methodology.ts`:
- Add `guidanceJson` to `methodologyFactDefinitions`.
- Add `validationJson` to `methodologyFactSchemas`.

Expected: TypeScript compiles.

**Step 2: Apply schema locally**

Run:
- `bun run db:push`

Expected: push succeeds.

---

### Task 3: Repository projections - include fact scope + validation fields

**Files:**
- Modify: `packages/methodology-engine/src/repository.ts`
- Modify: `packages/db/src/methodology-repository.ts`
- Test: `packages/db/src/methodology-repository.integration.test.ts`

**Step 1: Write failing integration test**

In `packages/db/src/methodology-repository.integration.test.ts`, add a test that:
- seeds two work unit types that both define fact key `"repoPath"`
- ensures publish fact schema projection does NOT treat this as a duplicate across work unit types
- ensures `validationJson` is round-tripped for fact schemas

Expected: FAIL with current `findFactSchemasByVersionId` output shape and publish uniqueness behavior.

**Step 2: Expand repository types**

In `packages/methodology-engine/src/repository.ts`:
- Replace `PublishFactSchemaRow` with a shape that includes `workUnitTypeKey` and `validationJson`.
- Add a new projection type for methodology-level fact definitions (for validation/publish parity).

Example:

```ts
export interface PublishFactSchemaRow {
  workUnitTypeKey: string;
  key: string;
  factType: string;
  required: boolean;
  defaultValueJson: unknown;
  guidanceJson: unknown;
  validationJson: unknown;
}

export interface PublishFactDefinitionRow {
  key: string;
  factType: string;
  descriptionJson: unknown;
  guidanceJson: unknown;
  defaultValueJson: unknown;
  validationJson: unknown;
}
```

Add methods:
- `findFactSchemasByVersionId(versionId)` -> returns `PublishFactSchemaRow[]`
- `findFactDefinitionsByVersionId(versionId)` -> returns `PublishFactDefinitionRow[]`

**Step 3: Implement DB queries**

In `packages/db/src/methodology-repository.ts`:
- update the existing query for `findFactSchemasByVersionId` to join `methodology_fact_schemas` with `methodology_work_unit_types` to populate `workUnitTypeKey`.
- include `validationJson`.
- add `findFactDefinitionsByVersionId` that reads `methodology_fact_definitions` including `guidanceJson`.

**Step 4: Re-run integration tests**

Run:
- `bun test packages/db/src/methodology-repository.integration.test.ts`

Expected: PASS.

---

### Task 4: Methodology-engine - implement deterministic facts validation module

**Files:**
- Add: `packages/methodology-engine/src/fact-validation.ts`
- Add: `packages/methodology-engine/src/fact-validation.test.ts`
- Modify: `packages/methodology-engine/package.json` (add Ajv)

**Step 1: Add failing unit tests**

In `packages/methodology-engine/src/fact-validation.test.ts`, cover:
- reserved key (`_prefix`) for both scopes
- default type compatibility for `string|number|boolean|json`
- path normalization + safety (`..`, absolute, backslash)
- directory vs file `pathKind` end-slash semantics
- JSON schema invalid schema -> blocking diagnostic
- JSON schema default not matching schema -> blocking diagnostic
- stable diagnostic ordering

Run:
- `bun test packages/methodology-engine/src/fact-validation.test.ts`

Expected: FAIL.

**Step 2: Add Ajv dependency**

In `packages/methodology-engine/package.json`, add:
- `ajv` (and only what is required)

Then run:
- `bun install`

**Step 3: Implement minimal validator**

Create `packages/methodology-engine/src/fact-validation.ts` with:
- a `makeDiagnostic(fields, timestamp)` helper matching existing patterns
- `validateFactDefaultCompatibility(factType, defaultValue)`
- `validatePathDefault(path, pathKind)` using the deterministic policy from the design doc
- `validateJsonSchemaDefault(schemaDialect, schema, defaultValue)` using Ajv
- `validateMethodologyFactDefinitions(defs, timestamp)`
- `validateWorkUnitFactSchemas(rows, timestamp)` that scopes uniqueness by `workUnitTypeKey`

Expected: tests pass.

---

### Task 5: Lifecycle validation - enforce new fact schema fields deterministically

**Files:**
- Modify: `packages/methodology-engine/src/lifecycle-validation.ts`
- Test: `packages/methodology-engine/src/lifecycle-validation.test.ts`

**Step 1: Add failing tests**

Extend `packages/methodology-engine/src/lifecycle-validation.test.ts` to include:
- path validation failures inside `workUnitTypes[*].factSchemas[*]`
- json schema validation failures inside `workUnitTypes[*].factSchemas[*]`

**Step 2: Implement integration**

In `packages/methodology-engine/src/lifecycle-validation.ts`:
- keep existing base checks
- call into `fact-validation.ts` for path/json-schema validation
- ensure deterministic diagnostic scopes match the UI deep-link conventions

**Step 3: Run tests**

Run:
- `bun test packages/methodology-engine/src/lifecycle-validation.test.ts`

Expected: PASS.

---

### Task 6: Publish validation - block publish on fact diagnostics (both scopes)

**Files:**
- Modify: `packages/methodology-engine/src/version-service.ts`
- Modify: `packages/methodology-engine/src/repository.ts`
- Test: `packages/methodology-engine/src/version-service.test.ts`

**Step 1: Add failing tests**

In `packages/methodology-engine/src/version-service.test.ts`, add tests for:
- publish blocked by invalid path default
- publish blocked by invalid json schema
- publish allowed when two work unit types reuse the same fact key (uniqueness is per work unit type)

**Step 2: Implement**

In `packages/methodology-engine/src/version-service.ts` publish path:
- fetch work-unit fact schemas with `workUnitTypeKey` + `validationJson`
- fetch methodology-level fact definitions + `validationJson`
- run the shared facts validators
- map any blocking diagnostics into publish diagnostics (either reuse existing `PUBLISH_FACTS_V1_SCHEMA_INVALID` or add new publish codes)

**Step 3: Run tests**

Run:
- `bun test packages/methodology-engine/src/version-service.test.ts`

Expected: PASS.

---

### Task 7: API transport - expose draft facts authoring endpoints

**Files:**
- Modify: `packages/api/src/routers/methodology.ts`
- Test: `packages/api/src/routers/methodology.test.ts`

**Step 1: Add new endpoint**

Add a focused procedure (example):
- `methodology.updateDraftFacts` accepting `{ versionId, factDefinitions }`

Wire it to a new engine service method (or reuse an existing update path) without requiring workflow/lifecycle payloads.

**Step 2: Update existing zod schemas**

- Update methodology-level fact schema to accept `factType`, `guidance`, `validation`.
- Update work-unit fact schema (lifecycle input) to accept `guidance`, `validation`.

**Step 3: Run tests**

Run:
- `bun test packages/api/src/routers/methodology.test.ts`

Expected: PASS.

---

### Task 8: Web UI - typed fact authoring surfaces with deterministic diagnostics

**Files:**
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.tsx`
- Modify: `apps/web/src/features/methodologies/version-workspace.tsx`
- Add: `apps/web/src/features/methodologies/facts-editor.tsx`
- Add: `apps/web/src/features/methodologies/fact-inputs.tsx`
- Test: `apps/web/src/features/methodologies/version-workspace.integration.test.tsx`

**Step 1: Add failing component/integration tests**

Cover:
- create/update/remove methodology-level fact definitions
- create/update/remove work-unit fact schemas
- type-appropriate default editors
- inline diagnostics for invalid defaults (path/json)
- immutable rejection does not corrupt local state (reuse Story 2.3 patterns)

**Step 2: Implement editor UI**

- Add a Facts panel to the existing workspace (do not fork the route).
- Use TanStack Query mutations to call:
  - `updateDraftFacts` (methodology-level)
  - `updateDraftLifecycle` (work-unit scoped)
- After success: refetch and rehydrate workspace projection (deterministic reload discipline).
- Render diagnostics grouped and deep-linked using existing Story 2.3 utilities.

**Step 3: Run web tests**

Run:
- `bun run vitest apps/web/src/features/methodologies/version-workspace.integration.test.tsx`

Expected: PASS.

---

### Task 9: Verification

Run:
- `bun run check`
- `bun run check-types`
- `bun run test --filter=@chiron/methodology-engine`
- `bun run test --filter=@chiron/api`
- `bun run test --filter=web`

Expected: all PASS.
