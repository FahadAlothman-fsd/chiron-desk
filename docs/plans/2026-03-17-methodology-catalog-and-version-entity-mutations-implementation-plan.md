# Methodology Catalog and Version Entity Mutations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add methodology aggregate update/archive plus nested version-owned CRUD for facts, agents, and dependency definitions, and migrate Story 3.1 edit paths to those new procedures.

**Architecture:** Keep `methodology` as the top-level router, move methodology aggregate CRUD under `catalog`, and make nested Story 3.1 authoring mutations explicit under `methodology.version.<entity>.*`. Preserve the single-draft rule and keep Work Unit deeper internals deferred to Story 3.2.

**Tech Stack:** ORPC routers, Effect services, methodology-engine repository/services, DB repository implementation, Zod/Schema contracts, Bun tests, TypeScript monorepo.

---

### Task 1: Add failing API tests for methodology catalog update/archive and nested entity CRUD

**Files:**
- Modify: `packages/api/src/tests/routers/methodology.test.ts`

**Step 1: Write the failing test**

Add router tests that assert the new surface exists:

```ts
expect(router.catalog.update).toBeDefined();
expect(router.catalog.delete).toBeDefined();
expect(router.version.fact.create).toBeDefined();
expect(router.version.fact.update).toBeDefined();
expect(router.version.fact.delete).toBeDefined();
expect(router.version.agent.create).toBeDefined();
expect(router.version.agent.update).toBeDefined();
expect(router.version.agent.delete).toBeDefined();
expect(router.version.dependencyDefinition.create).toBeDefined();
expect(router.version.dependencyDefinition.update).toBeDefined();
expect(router.version.dependencyDefinition.delete).toBeDefined();
```

Add one behavioral test for soft delete/archive semantics.

**Step 2: Run test to verify it fails**

Run: `bun run --cwd packages/api test -- src/tests/routers/methodology.test.ts`

Expected: FAIL because those procedures do not exist yet.

**Step 3: Write minimal implementation**

Only add enough surface and behavior to make the new tests meaningful and failing for the right reasons across service/repository boundaries.

**Step 4: Run test to verify it passes**

Run: `bun run --cwd packages/api test -- src/tests/routers/methodology.test.ts`

Expected: PASS for the new namespace presence + archive behavior tests.

**Step 5: Commit**

```bash
git add packages/api/src/tests/routers/methodology.test.ts
git commit -m "test(api): add catalog and entity mutation coverage"
```

### Task 2: Add methodology catalog update and soft delete/archive backend support

**Files:**
- Modify: `packages/contracts/src/methodology/index.ts`
- Modify: `packages/api/src/routers/methodology.ts`
- Modify: `packages/methodology-engine/src/repository.ts`
- Modify: `packages/methodology-engine/src/version-service.ts`
- Modify: `packages/methodology-engine/src/errors.ts`
- Modify: `packages/db/src/methodology-repository.ts`
- Test: `packages/api/src/tests/routers/methodology.test.ts`

**Step 1: Write the failing test**

Add or refine tests proving:
- `methodology.catalog.update` updates methodology-level metadata
- `methodology.catalog.delete` archives instead of hard-deleting
- archived methodologies disappear from default list responses but remain recoverable for direct reads if intended by the chosen rule

**Step 2: Run test to verify it fails**

Run: `bun run --cwd packages/api test -- src/tests/routers/methodology.test.ts`

Expected: FAIL because update/delete are still missing.

**Step 3: Write minimal implementation**

Implement:
- catalog-level contract inputs/outputs
- repository support for methodology update + archive state
- service/router procedures under `methodology.catalog.update` and `methodology.catalog.delete`
- compatibility aliases only if needed to avoid breaking current screens during rollout

**Step 4: Run test to verify it passes**

Run: `bun run --cwd packages/api test -- src/tests/routers/methodology.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add packages/contracts/src/methodology/index.ts packages/api/src/routers/methodology.ts packages/methodology-engine/src/repository.ts packages/methodology-engine/src/version-service.ts packages/methodology-engine/src/errors.ts packages/db/src/methodology-repository.ts packages/api/src/tests/routers/methodology.test.ts
git commit -m "feat(api): add methodology catalog update and archive"
```

### Task 3: Add fact CRUD contracts, repository methods, service methods, and router procedures

**Files:**
- Modify: `packages/contracts/src/methodology/fact.ts`
- Modify: `packages/contracts/src/methodology/index.ts`
- Modify: `packages/methodology-engine/src/repository.ts`
- Modify: `packages/methodology-engine/src/version-service.ts`
- Modify: `packages/db/src/methodology-repository.ts`
- Modify: `packages/api/src/routers/methodology.ts`
- Test: `packages/api/src/tests/routers/methodology.test.ts`

**Step 1: Write the failing test**

Add tests for:
- `methodology.version.fact.create`
- `methodology.version.fact.update`
- `methodology.version.fact.delete`

Use one real create/update/delete cycle against a draft version.

**Step 2: Run test to verify it fails**

Run: `bun run --cwd packages/api test -- src/tests/routers/methodology.test.ts`

Expected: FAIL because only `fact.list` exists today.

**Step 3: Write minimal implementation**

Add dedicated fact mutation contracts and version-service/repository support. Do not route fact mutations through `updateDraftWorkflows` as the public API anymore.

**Step 4: Run test to verify it passes**

Run: `bun run --cwd packages/api test -- src/tests/routers/methodology.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add packages/contracts/src/methodology/fact.ts packages/contracts/src/methodology/index.ts packages/methodology-engine/src/repository.ts packages/methodology-engine/src/version-service.ts packages/db/src/methodology-repository.ts packages/api/src/routers/methodology.ts packages/api/src/tests/routers/methodology.test.ts
git commit -m "feat(api): add version fact mutations"
```

### Task 4: Add agent CRUD backend support

**Files:**
- Modify: `packages/contracts/src/methodology/agent.ts`
- Modify: `packages/contracts/src/methodology/index.ts`
- Modify: `packages/methodology-engine/src/repository.ts`
- Modify: `packages/methodology-engine/src/version-service.ts`
- Modify: `packages/db/src/methodology-repository.ts`
- Modify: `packages/api/src/routers/methodology.ts`
- Test: `packages/api/src/tests/routers/methodology.test.ts`

**Step 1: Write the failing test**

Add tests for:
- `methodology.version.agent.create`
- `methodology.version.agent.update`
- `methodology.version.agent.delete`

**Step 2: Run test to verify it fails**

Run: `bun run --cwd packages/api test -- src/tests/routers/methodology.test.ts`

Expected: FAIL because only `agent.list` exists today.

**Step 3: Write minimal implementation**

Add dedicated agent mutation contracts and backend seams. Reuse lifecycle data carefully, but expose a true agent-specific API surface.

**Step 4: Run test to verify it passes**

Run: `bun run --cwd packages/api test -- src/tests/routers/methodology.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add packages/contracts/src/methodology/agent.ts packages/contracts/src/methodology/index.ts packages/methodology-engine/src/repository.ts packages/methodology-engine/src/version-service.ts packages/db/src/methodology-repository.ts packages/api/src/routers/methodology.ts packages/api/src/tests/routers/methodology.test.ts
git commit -m "feat(api): add version agent mutations"
```

### Task 5: Add dependency definition CRUD backend support

**Files:**
- Modify: `packages/contracts/src/methodology/dependency.ts`
- Modify: `packages/contracts/src/methodology/version.ts`
- Modify: `packages/contracts/src/methodology/index.ts`
- Modify: `packages/methodology-engine/src/repository.ts`
- Modify: `packages/methodology-engine/src/version-service.ts`
- Modify: `packages/db/src/methodology-repository.ts`
- Modify: `packages/api/src/routers/methodology.ts`
- Test: `packages/api/src/tests/routers/methodology.test.ts`

**Step 1: Write the failing test**

Add tests for:
- `methodology.version.dependencyDefinition.create`
- `methodology.version.dependencyDefinition.update`
- `methodology.version.dependencyDefinition.delete`

**Step 2: Run test to verify it fails**

Run: `bun run --cwd packages/api test -- src/tests/routers/methodology.test.ts`

Expected: FAIL because only `dependencyDefinition.list` exists today.

**Step 3: Write minimal implementation**

Expose real dependency-definition CRUD instead of only deriving link-type keys from projection/bindings. Extend repository + DB support if full link-type definitions are not yet persisted/read directly enough.

**Step 4: Run test to verify it passes**

Run: `bun run --cwd packages/api test -- src/tests/routers/methodology.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add packages/contracts/src/methodology/dependency.ts packages/contracts/src/methodology/version.ts packages/contracts/src/methodology/index.ts packages/methodology-engine/src/repository.ts packages/methodology-engine/src/version-service.ts packages/db/src/methodology-repository.ts packages/api/src/routers/methodology.ts packages/api/src/tests/routers/methodology.test.ts
git commit -m "feat(api): add version dependency definition mutations"
```

### Task 6: Migrate Story 3.1 frontend edit paths to the new mutation surface

**Files:**
- Modify: `apps/web/src/routes/methodologies.tsx`
- Modify: `apps/web/src/routes/methodologies.$methodologyId.tsx`
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.tsx`
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.facts.tsx`
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.agents.tsx`
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.dependency-definitions.tsx`
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.tsx`
- Modify: `apps/web/src/components/app-shell.tsx`
- Modify: `apps/web/src/features/methodologies/command-palette.tsx`
- Test: `apps/web/src/tests/routes/methodologies.$methodologyId.integration.test.tsx`
- Test: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.integration.test.tsx`
- Test: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx`
- Test: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.facts.integration.test.tsx`
- Test: `apps/web/src/tests/features/methodologies/command-palette.integration.test.tsx`

**Step 1: Write the failing test**

Update the focused web tests to require:
- dashboard methodology edit/archive actions call `methodology.catalog.update/delete`
- facts page saves through `methodology.version.fact.*`
- agents page uses `methodology.version.agent.*`
- dependency definitions page uses `methodology.version.dependencyDefinition.*`
- old compatibility seams are no longer required for those edited flows

**Step 2: Run test to verify it fails**

Run: `bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.facts.integration.test.tsx' 'src/tests/features/methodologies/command-palette.integration.test.tsx'`

Expected: FAIL because routes still depend on compatibility mutation seams.

**Step 3: Write minimal implementation**

Migrate Story 3.1 UI/UX edit paths to the new mutation surface while preserving existing UX behavior.

**Step 4: Run test to verify it passes**

Run the same command again.

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src/routes/methodologies.tsx apps/web/src/routes/methodologies.$methodologyId.tsx apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.tsx apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.facts.tsx apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.agents.tsx apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.dependency-definitions.tsx apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.tsx apps/web/src/components/app-shell.tsx apps/web/src/features/methodologies/command-palette.tsx apps/web/src/tests/routes/methodologies.$methodologyId.integration.test.tsx apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.integration.test.tsx apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.facts.integration.test.tsx apps/web/src/tests/features/methodologies/command-palette.integration.test.tsx
git commit -m "refactor(web): adopt catalog and entity mutations"
```

### Task 7: Verify, document, and record the mutation-surface decision

**Files:**
- Modify: `docs/plans/2026-03-17-methodology-catalog-and-version-entity-mutations-design.md`
- Modify: `_bmad-output/implementation-artifacts/3-1-complete-design-time-ia-and-page-shell-baseline.md`

**Step 1: Write the failing test**

No new automated test here. Reuse the prior task suites as the verification gate.

**Step 2: Run verification to confirm current state**

Run:

```bash
bun run --cwd packages/api test -- src/tests/routers/methodology.test.ts && bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.facts.integration.test.tsx' 'src/tests/features/methodologies/command-palette.integration.test.tsx'
```

Expected: PASS.

**Step 3: Write minimal implementation**

Document the final mutation surface, archive semantics, and Story 3.1 vs Story 3.2 boundary in the design doc and Story 3.1 artifact.

**Step 4: Run full project verification**

Run:

```bash
bun run check-types && bun run check
```

Expected: PASS.

**Step 5: Commit**

```bash
git add docs/plans/2026-03-17-methodology-catalog-and-version-entity-mutations-design.md docs/plans/2026-03-17-methodology-catalog-and-version-entity-mutations-implementation-plan.md _bmad-output/implementation-artifacts/3-1-complete-design-time-ia-and-page-shell-baseline.md
git commit -m "docs(api): record catalog and entity mutation design"
```
