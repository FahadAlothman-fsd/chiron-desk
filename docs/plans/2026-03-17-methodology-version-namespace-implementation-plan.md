# Methodology Version Namespace Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate the Story 3.1 methodology API surface to the approved `methodology.version.*` namespace, enforce the single-draft version rule, and expose the baseline version-owned entity surfaces for facts, agents, dependency definitions, and baseline work units.

**Architecture:** Keep `methodology` as the top-level router and make `version` the aggregate root for all mutable authoring behavior. Treat `draft` as a version status, not a router noun, and replace persistence-bucket naming with version-owned, entity/action-oriented procedure names that match the Story 3.1 route model.

**Tech Stack:** ORPC routers, Effect services, Zod/Schema contracts, Bun test runner, TypeScript monorepo

---

### Task 1: Rename Version Lifecycle Contracts and Router Surface

**Files:**
- Modify: `packages/contracts/src/methodology/version.ts`
- Modify: `packages/contracts/src/methodology/index.ts`
- Modify: `packages/api/src/routers/methodology.ts`
- Test: `packages/api/src/tests/routers/methodology.test.ts`

**Step 1: Write the failing test**

Add or update router tests in `packages/api/src/tests/routers/methodology.test.ts` to assert the new version-centric API names are exposed and draft-centric aliases are deprecated/removed according to the migration decision.

Example assertions to add:

```ts
expect(methodologyRouter.version.create).toBeDefined();
expect(methodologyRouter.version.update).toBeDefined();
expect(methodologyRouter.version.publish).toBeDefined();
```

**Step 2: Run test to verify it fails**

Run: `bun run --cwd packages/api test -- src/tests/routers/methodology.test.ts`

Expected: FAIL because the router still exposes draft-centric procedure names.

**Step 3: Write minimal implementation**

Update contracts and router naming so the public surface reads as:

```ts
methodology.version.list
methodology.version.create
methodology.version.get
methodology.version.update
methodology.version.validate
methodology.version.publish
methodology.version.getLineage
methodology.version.getPublicationEvidence
```

Preserve behavior first; rename surface second.

**Step 4: Run test to verify it passes**

Run: `bun run --cwd packages/api test -- src/tests/routers/methodology.test.ts`

Expected: PASS with the version-centric surface visible.

**Step 5: Commit**

```bash
git add packages/contracts/src/methodology/version.ts packages/contracts/src/methodology/index.ts packages/api/src/routers/methodology.ts packages/api/src/tests/routers/methodology.test.ts
git commit -m "refactor(api): rename methodology version procedures"
```

### Task 2: Enforce the Single-Draft Version Rule

**Files:**
- Modify: `packages/methodology-engine/src/version-service.ts`
- Modify: `packages/api/src/routers/methodology.ts`
- Test: `packages/api/src/tests/routers/methodology.test.ts`

**Step 1: Write the failing test**

Add a test that creates one draft version for a methodology, then attempts `methodology.version.create` again and expects a deterministic failure.

Example shape:

```ts
await methodology.version.create({ methodologyKey: "foo" });

await expect(
  methodology.version.create({ methodologyKey: "foo" }),
).rejects.toThrow(/draft/i);
```

**Step 2: Run test to verify it fails**

Run: `bun run --cwd packages/api test -- src/tests/routers/methodology.test.ts`

Expected: FAIL because multiple draft versions are still allowed.

**Step 3: Write minimal implementation**

In `packages/methodology-engine/src/version-service.ts`, enforce:
- only one `draft` status version per methodology
- `version.create` fails when an existing draft is present
- error message is deterministic enough for UI to convert into `Open Draft` / `Continue Draft`

Keep this rule in the service layer so all callers get the same invariant.

**Step 4: Run test to verify it passes**

Run: `bun run --cwd packages/api test -- src/tests/routers/methodology.test.ts`

Expected: PASS with explicit single-draft enforcement.

**Step 5: Commit**

```bash
git add packages/methodology-engine/src/version-service.ts packages/api/src/routers/methodology.ts packages/api/src/tests/routers/methodology.test.ts
git commit -m "feat(api): enforce single draft version rule"
```

### Task 3: Expose Version Workspace Bootstrap Read

**Files:**
- Modify: `packages/contracts/src/methodology/projection.ts`
- Modify: `packages/contracts/src/methodology/index.ts`
- Modify: `packages/api/src/routers/methodology.ts`
- Test: `packages/api/src/tests/routers/methodology.test.ts`

**Step 1: Write the failing test**

Add a test for the approved Story 3.1 bootstrap read:

```ts
const result = await methodology.version.workspace.get({ versionId });

expect(result.version.id).toBe(versionId);
expect(result).toHaveProperty("facts");
expect(result).toHaveProperty("agents");
expect(result).toHaveProperty("workUnits");
```

**Step 2: Run test to verify it fails**

Run: `bun run --cwd packages/api test -- src/tests/routers/methodology.test.ts`

Expected: FAIL because `methodology.version.workspace.get` is not yet exposed.

**Step 3: Write minimal implementation**

Add `methodology.version.workspace.get` as the approved Story 3.1 workspace bootstrap read. It may initially wrap existing projection logic, but its public name should be version-owned and workspace-oriented rather than `version.workspace.get`.

**Step 4: Run test to verify it passes**

Run: `bun run --cwd packages/api test -- src/tests/routers/methodology.test.ts`

Expected: PASS with a version-owned workspace bootstrap read.

**Step 5: Commit**

```bash
git add packages/contracts/src/methodology/projection.ts packages/contracts/src/methodology/index.ts packages/api/src/routers/methodology.ts packages/api/src/tests/routers/methodology.test.ts
git commit -m "feat(api): add methodology version workspace read"
```

### Task 4: Add Story 3.1 Version-Owned Entity Surfaces

**Files:**
- Modify: `packages/contracts/src/methodology/fact.ts`
- Modify: `packages/contracts/src/methodology/agent.ts`
- Modify: `packages/contracts/src/methodology/dependency.ts`
- Modify: `packages/contracts/src/methodology/lifecycle.ts`
- Modify: `packages/contracts/src/methodology/index.ts`
- Modify: `packages/api/src/routers/methodology.ts`
- Test: `packages/api/src/tests/routers/methodology.test.ts`

**Step 1: Write the failing test**

Add tests for baseline Story 3.1 entity namespaces:

```ts
expect(methodology.version.fact.list).toBeDefined();
expect(methodology.version.agent.list).toBeDefined();
expect(methodology.version.dependencyDefinition.list).toBeDefined();
expect(methodology.version.workUnit.create).toBeDefined();
```

Also assert Work Unit scope is still shallow in Story 3.1 (no nested workflow/state-machine write surface yet).

**Step 2: Run test to verify it fails**

Run: `bun run --cwd packages/api test -- src/tests/routers/methodology.test.ts`

Expected: FAIL because these version-owned entity namespaces are not yet exposed.

**Step 3: Write minimal implementation**

Expose the approved Story 3.1 entity surfaces:
- `methodology.version.fact.*`
- `methodology.version.agent.*`
- `methodology.version.dependencyDefinition.*`
- `methodology.version.workUnit.*`

For Story 3.1, keep Work Unit limited to:
- `list`
- `create`
- `get`
- `updateMeta`
- `delete`

Do not expose deeper Story 3.2 nested Work Unit internals yet.

**Step 4: Run test to verify it passes**

Run: `bun run --cwd packages/api test -- src/tests/routers/methodology.test.ts`

Expected: PASS with the version-owned entity surface visible and bounded correctly.

**Step 5: Commit**

```bash
git add packages/contracts/src/methodology/fact.ts packages/contracts/src/methodology/agent.ts packages/contracts/src/methodology/dependency.ts packages/contracts/src/methodology/lifecycle.ts packages/contracts/src/methodology/index.ts packages/api/src/routers/methodology.ts packages/api/src/tests/routers/methodology.test.ts
git commit -m "feat(api): add story 3.1 version entity procedures"
```

### Task 5: Align Web Consumers to the New Namespace

**Files:**
- Modify: `apps/web/src/routes/methodologies.tsx`
- Modify: `apps/web/src/routes/methodologies.$methodologyId.tsx`
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.tsx`
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.facts.tsx`
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.agents.tsx`
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.dependency-definitions.tsx`
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.tsx`
- Test: `apps/web/src/tests/routes/methodologies.$methodologyId.integration.test.tsx`
- Test: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.integration.test.tsx`
- Test: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx`

**Step 1: Write the failing test**

Update web route tests to call the new ORPC namespace and prove the old draft-centric paths are no longer required.

Example expectation:

```ts
expect(orpc.methodology.version.workspace.get).toBeDefined();
expect(orpc.methodology.version.fact.list).toBeDefined();
```

**Step 2: Run test to verify it fails**

Run: `bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx'`

Expected: FAIL because the app still calls the old procedure names.

**Step 3: Write minimal implementation**

Switch Story 3.1 web consumers to the approved namespace:
- dashboard uses `methodology.version.list/create/get`
- workspace uses `methodology.version.workspace.get`
- facts/agents/dependency definitions/work units use `methodology.version.<entity>.*`

Keep UI behavior unchanged unless required by the namespace migration.

**Step 4: Run test to verify it passes**

Run: `bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx'`

Expected: PASS with Story 3.1 route consumers aligned.

**Step 5: Commit**

```bash
git add apps/web/src/routes/methodologies.tsx apps/web/src/routes/methodologies.$methodologyId.tsx apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.tsx apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.facts.tsx apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.agents.tsx apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.dependency-definitions.tsx apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.tsx apps/web/src/tests/routes/methodologies.$methodologyId.integration.test.tsx apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.integration.test.tsx apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx
git commit -m "refactor(web): adopt methodology version namespace"
```

### Task 6: Verify, Document, and Record the Namespace Decision

**Files:**
- Modify: `_bmad-output/implementation-artifacts/3-1-complete-design-time-ia-and-page-shell-baseline.md`
- Modify: `docs/plans/2026-03-17-methodology-version-namespace-design.md`

**Step 1: Write the failing test**

No new automated test in this step. Reuse the prior task suites as the verification gate.

**Step 2: Run verification to confirm current state**

Run:

```bash
bun run --cwd packages/api test -- src/tests/routers/methodology.test.ts && bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx'
```

Expected: PASS before documentation is finalized.

**Step 3: Write minimal implementation**

Record the implemented namespace change and single-draft rule in the Story 3.1 artifact addendum, with exact procedure names and Story 3.1 vs Story 3.2 boundary notes.

**Step 4: Run full project verification**

Run:

```bash
bun run check-types && bun run check
```

Expected: PASS.

**Step 5: Commit**

```bash
git add _bmad-output/implementation-artifacts/3-1-complete-design-time-ia-and-page-shell-baseline.md docs/plans/2026-03-17-methodology-version-namespace-design.md docs/plans/2026-03-17-methodology-version-namespace-implementation-plan.md
git commit -m "docs(api): record methodology version namespace decision"
```
