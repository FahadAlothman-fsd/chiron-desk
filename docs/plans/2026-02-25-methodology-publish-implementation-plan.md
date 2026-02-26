# Methodology Publish (Story 1.4) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Publish a validated methodology draft as an immutable version with deterministic diagnostics, Facts v1 publish validation, concurrency-safe duplicate-version handling, append-only publication evidence, and a query path by `methodologyVersion + workUnitType`.

**Architecture:** Keep the existing layered flow (`contracts -> db -> methodology-engine -> api`). Implement publish as copy-on-publish: create a new `methodology_versions` row for the requested published version and copy normalized contract rows from the source draft version inside a single DB transaction; on blocking validation, perform zero writes.

**Tech Stack:** TypeScript, Effect, Drizzle ORM (SQLite/libsql), Bun/Vitest tests, oRPC router.

---

### Task 1: Contracts - publish inputs + evidence + event type

**Files:**
- Modify: `packages/contracts/src/methodology/version.ts`
- Test: `packages/contracts/src/methodology/version.test.ts`

**Step 1: Run contract tests to see current failure**

Run: `bun test packages/contracts/src/methodology/version.test.ts`
Expected: FAIL (missing publish schemas and/or `published` event type).

**Step 2: Implement publish/evidence schemas in contracts**

In `packages/contracts/src/methodology/version.ts`, add:
- `"published"` to `VersionEventType`.
- `PublishDraftVersionInput = Schema.Struct({ versionId: NonEmptyString, publishedVersion: NonEmptyString })`.
- `GetPublicationEvidenceInput = Schema.Struct({ methodologyVersionId: NonEmptyString })`.
- `PublicationEvidence = Schema.Struct({
    actorId: Schema.NullOr(Schema.String),
    timestamp: Schema.String,
    sourceDraftRef: Schema.NonEmptyString,
    publishedVersion: Schema.NonEmptyString,
    validationSummary: ValidationResult,
    evidenceRef: Schema.NonEmptyString
  })`.

Notes:
- Keep schemas key-oriented and stable.
- Use existing `ValidationResult` for validationSummary to avoid new shapes.

**Step 3: Re-run contract tests**

Run: `bun test packages/contracts/src/methodology/version.test.ts`
Expected: PASS.

**Step 4: Commit**

```bash
git add packages/contracts/src/methodology/version.ts packages/contracts/src/methodology/version.test.ts
git commit -m "feat(contracts): add publish and publication evidence contracts"
```

---

### Task 2: Engine errors - publish-specific tagged errors for API mapping

**Files:**
- Modify: `packages/methodology-engine/src/errors.ts`
- Test: `packages/methodology-engine/src/errors.test.ts` (create if missing)

**Step 1: Write failing test (or extend existing) for error tags**

Create `packages/methodology-engine/src/errors.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { PublishBlockedError, PublishVersionExistsError } from "./errors";

describe("publish errors", () => {
  it("have stable _tag values", () => {
    expect(new PublishBlockedError({ diagnostics: { valid: false, diagnostics: [] } })._tag).toBe(
      "PublishBlockedError",
    );
    expect(new PublishVersionExistsError({ methodologyId: "m", publishedVersion: "1.0.0" })._tag).toBe(
      "PublishVersionExistsError",
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test packages/methodology-engine/src/errors.test.ts`
Expected: FAIL (missing exports).

**Step 3: Implement publish errors**

In `packages/methodology-engine/src/errors.ts` add:
- `PublishBlockedError` (contains deterministic diagnostics payload)
- `PublishVersionExistsError` (duplicate published version)
- `PublishConcurrentWriteConflictError` (db lock / unique collision after check)
- `PublishedContractImmutableError` (mutation attempted on non-draft)

Also extend the `MethodologyError` union to include them.

**Step 4: Re-run test**

Run: `bun test packages/methodology-engine/src/errors.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add packages/methodology-engine/src/errors.ts packages/methodology-engine/src/errors.test.ts
git commit -m "feat(engine): add publish-specific tagged errors"
```

---

### Task 3: DB repository interface - publish + evidence + published snapshot query

**Files:**
- Modify: `packages/methodology-engine/src/repository.ts`

**Step 1: Extend the repository interface**

In `packages/methodology-engine/src/repository.ts`, extend `MethodologyRepository` with:
- `publishDraftVersion(params: { versionId: string; publishedVersion: string; actorId: string | null; validationSummary: ValidationResult }): Effect< { version: MethodologyVersionRow; event: MethodologyVersionEventRow }, RepositoryError | PublishVersionExistsError | PublishConcurrentWriteConflictError | PublishedContractImmutableError >`
- `getPublicationEvidence(params: { methodologyVersionId: string }): Effect<readonly PublicationEvidence[], RepositoryError>`

Add a read method for query-by-version+workUnitType (either here or in lifecycle repo):
- `findPublishedWorkUnitContract(params: { methodologyId: string; methodologyVersion: string; workUnitTypeKey: string }): Effect<PublishedWorkUnitContractProjection, RepositoryError>`

Keep projection type minimal and contract-shaped; do not use `definitionExtensions` as authority.

**Step 2: Commit (interface-only change)**

```bash
git add packages/methodology-engine/src/repository.ts
git commit -m "refactor(engine): extend methodology repository for publish and evidence"
```

---

### Task 4: DB implementation - transactional publish (copy normalized rows) + evidence + evidence query

**Files:**
- Modify: `packages/db/src/methodology-repository.ts`
- Modify (if needed): `packages/db/src/schema/methodology.ts`
- Test: `packages/db/src/methodology-repository.integration.test.ts`

**Step 1: Run the repository integration tests**

Run: `bun test packages/db/src/methodology-repository.integration.test.ts`
Expected: FAIL (missing publish methods and/or evidence query).

**Step 2: Implement repo.publishDraftVersion (single transaction)**

In `packages/db/src/methodology-repository.ts` implement:
- Status guard: load `methodology_versions.status` for `params.versionId` inside the transaction; if not `draft`, fail deterministically.
- Duplicate guard: check `(methodologyId, publishedVersion)`; if exists, fail (no writes).
- Insert published version row (new UUID) with `status='active'`, `displayName` copied from draft.
- Copy normalized tables from draft version id to published version id.

Copy algorithm requirements:
- Preserve referential integrity by building ID maps:
  - work unit types: old->new
  - lifecycle states: old->new
  - transitions: old->new
  - workflows: old->new
  - workflow steps: old->new
- Re-write FK columns using the maps when inserting copied rows.
- Use stable ordering on reads (orderBy key/id) so evidence/debugging is deterministic.

**Step 3: Append evidence event (append-only)**

Still inside the transaction, insert exactly one row in `methodology_version_events` with:
- `methodology_version_id = source draft versionId` (so evidence is queryable by draft id)
- `event_type = 'published'`
- `actor_id = params.actorId`
- `changed_fields_json = { sourceDraftRef: 'draft:<draftId>', publishedVersion: params.publishedVersion }`
- `diagnostics_json = params.validationSummary`

Return `{ version: publishedVersionRow, event: publishedEventRow }`.

**Step 4: Implement getPublicationEvidence**

- Query `methodology_version_events` for `methodologyVersionId` and `event_type='published'`.
- Convert rows into `PublicationEvidence[]` using the contract:
  - `evidenceRef = event.id`
  - `timestamp = event.createdAt.toISOString()`
  - `actorId = event.actorId`
  - `publishedVersion` and `sourceDraftRef` from `changedFieldsJson`
  - `validationSummary` from `diagnosticsJson` (must be stable)

**Step 5: Re-run repository integration tests**

Run: `bun test packages/db/src/methodology-repository.integration.test.ts`
Expected: PASS.

**Step 6: Commit**

```bash
git add packages/db/src/methodology-repository.ts packages/db/src/methodology-repository.integration.test.ts
git commit -m "feat(db): publish draft by copying normalized snapshot and appending evidence"
```

---

### Task 5: Engine publish orchestration - deterministic validation + error mapping + immutable guards

**Files:**
- Modify: `packages/methodology-engine/src/version-service.ts`
- Modify: `packages/methodology-engine/src/validation.ts`
- Modify: `packages/methodology-engine/src/lifecycle-validation.ts`
- Test: `packages/methodology-engine/src/version-service.test.ts`
- Test: `packages/methodology-engine/src/lifecycle-validation.test.ts` (extend)

**Step 1: Write failing engine publish tests**

Extend `packages/methodology-engine/src/version-service.test.ts` with:

```ts
it("publishes a draft and returns deterministic publish diagnostics", async () => {
  // create draft, then publish; assert published version status/version and evidence event type
});

it("rejects publish when Facts v1 validation fails with deterministic diagnostics", async () => {
  // seed lifecycle facts with invalid default type or reserved key
  // expect PublishBlockedError with code PUBLISH_FACTS_V1_SCHEMA_INVALID
});

it("rejects publish duplicate publishedVersion deterministically", async () => {
  // publish once, publish again with same publishedVersion
  // expect PublishVersionExistsError
});
```

**Step 2: Run tests to verify they fail**

Run: `bun test packages/methodology-engine/src/version-service.test.ts`
Expected: FAIL (publish methods not implemented).

**Step 3: Implement deterministic publish validation**

Add a publish validation function (pure) that:
- Compiles canonical draft contract from normalized sources:
  - Use lifecycle repo reconstruction semantics already used in lifecycle service (work unit types + facts + agents)
  - Use `repo.findWorkflowSnapshot(draftVersionId)` for workflows/bindings/guidance
- Runs:
  - `validateLifecycleDefinition(...)`
  - `validateDraftDefinition(...)`
  - publish-only Facts v1 forbiddance checks for ref/derived tokens in defaults
- Produces stable publish diagnostics by:
  - mapping underlying diagnostics into publish codes (PUBLISH_*)
  - stable sorting by `scope` then `code`

Return `ValidationResult`.

**Step 4: Implement MethodologyVersionService.publishDraftVersion + getPublicationEvidence**

In `packages/methodology-engine/src/version-service.ts`:
- Add methods to the service tag:
  - `publishDraftVersion(input, actorId)`
  - `getPublicationEvidence(input)`
- `publishDraftVersion` flow:
  1) load version by id; fail if not found
  2) ensure draft status
  3) compute deterministic publish validation result
  4) if blocking errors -> fail with `PublishBlockedError` containing diagnostics
  5) call `repo.publishDraftVersion({ versionId, publishedVersion, actorId, validationSummary })`
- `getPublicationEvidence` delegates to repo.

**Step 5: Implement immutable guardrails at repository boundary (if not already)**

- Ensure all write paths in both method repo and lifecycle repo check `status==='draft'` inside their transactions.

**Step 6: Re-run engine tests**

Run: `bun test packages/methodology-engine/src/version-service.test.ts`
Expected: PASS.

**Step 7: Commit**

```bash
git add packages/methodology-engine/src/version-service.ts packages/methodology-engine/src/validation.ts packages/methodology-engine/src/lifecycle-validation.ts packages/methodology-engine/src/version-service.test.ts
git commit -m "feat(engine): publish draft with deterministic validation and immutable versioning"
```

---

### Task 6: API - publish + evidence + query-by-version+workUnitType procedures and error mapping

**Files:**
- Modify: `packages/api/src/routers/methodology.ts`
- Test: `packages/api/src/routers/methodology.test.ts`

**Step 1: Write failing API tests**

In `packages/api/src/routers/methodology.test.ts` add tests:
- `publishDraftVersion` success returns published version + evidence
- publish blocked returns `BAD_REQUEST` with deterministic diagnostics payload
- duplicate published version returns `CONFLICT`

**Step 2: Run tests to verify failure**

Run: `bun test packages/api/src/routers/methodology.test.ts`
Expected: FAIL (route missing).

**Step 3: Implement router procedures**

In `packages/api/src/routers/methodology.ts`:
- Add input schemas:
  - publish: `{ versionId: string, publishedVersion: string }`
  - evidence: `{ methodologyVersionId: string }`
- Add procedures:
  - `publishDraftVersion` (protected)
  - `getPublicationEvidence` (public or protected per existing policy)
- Extend `mapEffectError` to map:
  - `PublishBlockedError` -> `BAD_REQUEST`
  - `PublishVersionExistsError` -> `CONFLICT`
  - `PublishConcurrentWriteConflictError` -> `CONFLICT`
  - `PublishedContractImmutableError` -> `PRECONDITION_FAILED`

Ensure payload shape returned to client is stable and deterministic.

**Step 4: Re-run API tests**

Run: `bun test packages/api/src/routers/methodology.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add packages/api/src/routers/methodology.ts packages/api/src/routers/methodology.test.ts
git commit -m "feat(api): add publish and publication evidence endpoints"
```

---

### Task 7: End-to-end verification

**Step 1: Run checks**

Run: `bun check`
Expected: PASS.

**Step 2: Run full tests**

Run: `bun test`
Expected: PASS.

---

## Test Matrix (Traceability)
- Deterministic diagnostics: repeated publish validation yields identical codes/scopes ordering.
- Facts v1 publish validation: duplicate keys, invalid types, invalid defaults, forbidden ref/derived tokens.
- Duplicate published version: deterministic conflict, zero additional evidence writes.
- Concurrent publish: single winner, deterministic loser path.
- Immutability: attempts to mutate non-draft rejected at API and repository.
- Atomicity: no partial snapshot rows on publish failure.
- Query: published version + workUnitType returns canonical snapshot from normalized tables.
