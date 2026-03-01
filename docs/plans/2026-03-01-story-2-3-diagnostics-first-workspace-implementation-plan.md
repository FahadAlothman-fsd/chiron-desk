# Story 2.3 Diagnostics-First Workspace Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a concrete, readable, diagnostics-first methodology version workspace that blocks unsafe publish, supports immutable publish results, and provides deterministic evidence inspection.

**Architecture:** Extend the Story 2.2 workspace baseline in-place across `apps/web` + `packages/api` + `packages/methodology-engine` using existing contracts and deterministic state patterns. Add scoped diagnostics mapping, publish preflight/result handling, immutable edit rejection UX, and append-only evidence view while preserving Epic 2 runtime-disable boundary.

**Tech Stack:** React 19, TanStack Query v5, `@xyflow/react` v12, TypeScript strict, Hono/oRPC, methodology-engine services, Vitest/Testing Library.

---

### Task 1: Diagnostics Model and Focus Anchors

**Files:**
- Modify: `apps/web/src/features/methodologies/version-workspace.tsx`
- Modify: `apps/web/src/features/methodologies/version-workspace-graph.tsx`
- Create: `apps/web/src/features/methodologies/version-diagnostics.ts`
- Test: `apps/web/src/features/methodologies/version-workspace.integration.test.tsx`

**Step 1: Write the failing tests**

Add tests that expect diagnostics to be grouped by scope (`field`, `work unit`, `transition`, `workflow`) and mapped to focus targets.

**Step 2: Run test to verify it fails**

Run: `bun run vitest apps/web/src/features/methodologies/version-workspace.integration.test.tsx -t "groups diagnostics by scope"`

Expected: FAIL because grouping/focus mapper does not exist.

**Step 3: Write minimal implementation**

Create `version-diagnostics.ts` with:
- `groupDiagnosticsByScope(...)`
- `diagnosticToFocusTarget(...)`
- deterministic sorter (`blocking desc`, `scope asc`, `timestamp asc`).

Wire these helpers into workspace rendering.

**Step 4: Run test to verify it passes**

Run: `bun run vitest apps/web/src/features/methodologies/version-workspace.integration.test.tsx -t "groups diagnostics by scope"`

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src/features/methodologies/version-diagnostics.ts apps/web/src/features/methodologies/version-workspace.tsx apps/web/src/features/methodologies/version-workspace-graph.tsx apps/web/src/features/methodologies/version-workspace.integration.test.tsx
git commit -m "feat(methodologies): add scoped diagnostics mapping and focus anchors"
```

### Task 2: Sectioned Forms with Explicit Validation States

**Files:**
- Modify: `apps/web/src/features/methodologies/version-workspace.tsx`
- Modify: `apps/web/src/features/methodologies/foundation.ts`
- Test: `apps/web/src/features/methodologies/foundation.test.ts`
- Test: `apps/web/src/features/methodologies/version-workspace.integration.test.tsx`

**Step 1: Write the failing tests**

Add tests for explicit field validation states in sections:
- Version Metadata
- Workflow Contract
- Work Unit Editor
- Transition Editor

Include assertions for state triples (`icon + label + color`) and remediation copy visibility.

**Step 2: Run test to verify it fails**

Run: `bun run vitest apps/web/src/features/methodologies/foundation.test.ts apps/web/src/features/methodologies/version-workspace.integration.test.tsx`

Expected: FAIL on missing section schema/state rendering.

**Step 3: Write minimal implementation**

Implement sectioned form schema + validation mapping in workspace; keep controls deterministic and keyboard-accessible.

**Step 4: Run test to verify it passes**

Run: `bun run vitest apps/web/src/features/methodologies/foundation.test.ts apps/web/src/features/methodologies/version-workspace.integration.test.tsx`

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src/features/methodologies/version-workspace.tsx apps/web/src/features/methodologies/foundation.ts apps/web/src/features/methodologies/foundation.test.ts apps/web/src/features/methodologies/version-workspace.integration.test.tsx
git commit -m "feat(methodologies): add sectioned forms and explicit validation states"
```

### Task 3: Publish Preflight + Immutable Publish Result

**Files:**
- Modify: `apps/web/src/features/methodologies/version-workspace.tsx`
- Modify: `packages/api/src/routers/methodology.ts`
- Modify: `packages/methodology-engine/src/version-service.ts`
- Test: `packages/api/src/routers/methodology.test.ts`
- Test: `packages/methodology-engine/src/version-service.test.ts`
- Test: `apps/web/src/features/methodologies/version-workspace.integration.test.tsx`

**Step 1: Write the failing tests**

Add tests for:
- publish blocked when blocking diagnostics exist,
- publish success returns immutable result shape (`actor`, `timestamp`, `sourceDraftRef`, `publishedVersion`, validation summary),
- workspace reflects published immutable state.

**Step 2: Run test to verify it fails**

Run: `bun run vitest packages/api/src/routers/methodology.test.ts packages/methodology-engine/src/version-service.test.ts apps/web/src/features/methodologies/version-workspace.integration.test.tsx`

Expected: FAIL because route/service/UI do not fully expose/consume contract.

**Step 3: Write minimal implementation**

Implement/extend publish route + service contract, then wire query invalidation and immutable result card rendering in workspace.

**Step 4: Run test to verify it passes**

Run: `bun run vitest packages/api/src/routers/methodology.test.ts packages/methodology-engine/src/version-service.test.ts apps/web/src/features/methodologies/version-workspace.integration.test.tsx`

Expected: PASS.

**Step 5: Commit**

```bash
git add packages/api/src/routers/methodology.ts packages/api/src/routers/methodology.test.ts packages/methodology-engine/src/version-service.ts packages/methodology-engine/src/version-service.test.ts apps/web/src/features/methodologies/version-workspace.tsx apps/web/src/features/methodologies/version-workspace.integration.test.tsx
git commit -m "feat(methodologies): harden publish preflight and immutable publish results"
```

### Task 4: Evidence Panel with Deterministic Query Behavior

**Files:**
- Modify: `apps/web/src/features/methodologies/version-workspace.tsx`
- Create: `apps/web/src/features/methodologies/version-evidence.ts`
- Modify: `packages/api/src/routers/methodology.ts`
- Test: `apps/web/src/features/methodologies/version-workspace.integration.test.tsx`
- Test: `packages/api/src/routers/methodology.test.ts`

**Step 1: Write the failing tests**

Add tests for evidence view columns (`timestamp`, `actor`, `sourceDraftRef`, `publishedVersion`, `validationOutcome`) and deterministic sort/filter behavior.

**Step 2: Run test to verify it fails**

Run: `bun run vitest apps/web/src/features/methodologies/version-workspace.integration.test.tsx packages/api/src/routers/methodology.test.ts -t "evidence"`

Expected: FAIL due missing evidence panel/query adapter.

**Step 3: Write minimal implementation**

Add evidence adapter helper and UI table section; wire typed query endpoint and deterministic ordering.

**Step 4: Run test to verify it passes**

Run: `bun run vitest apps/web/src/features/methodologies/version-workspace.integration.test.tsx packages/api/src/routers/methodology.test.ts -t "evidence"`

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src/features/methodologies/version-evidence.ts apps/web/src/features/methodologies/version-workspace.tsx apps/web/src/features/methodologies/version-workspace.integration.test.tsx packages/api/src/routers/methodology.ts packages/api/src/routers/methodology.test.ts
git commit -m "feat(methodologies): add deterministic publish evidence panel"
```

### Task 5: Immutable Edit Rejection Without Local-State Corruption

**Files:**
- Modify: `apps/web/src/features/methodologies/version-workspace.tsx`
- Modify: `packages/methodology-engine/src/lifecycle-validation.ts`
- Modify: `packages/methodology-engine/src/validation.ts`
- Test: `apps/web/src/features/methodologies/version-workspace.persistence.test.ts`
- Test: `packages/methodology-engine/src/lifecycle-validation.test.ts`

**Step 1: Write the failing tests**

Add tests that simulate editing immutable fields on published versions and assert:
- deterministic rejection diagnostics,
- no local-state wipe/corruption.

**Step 2: Run test to verify it fails**

Run: `bun run vitest apps/web/src/features/methodologies/version-workspace.persistence.test.ts packages/methodology-engine/src/lifecycle-validation.test.ts -t "immutable"`

Expected: FAIL on missing guardrails.

**Step 3: Write minimal implementation**

Implement immutable-field guard handling in service/validation layer and non-destructive client error integration.

**Step 4: Run test to verify it passes**

Run: `bun run vitest apps/web/src/features/methodologies/version-workspace.persistence.test.ts packages/methodology-engine/src/lifecycle-validation.test.ts -t "immutable"`

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src/features/methodologies/version-workspace.tsx apps/web/src/features/methodologies/version-workspace.persistence.test.ts packages/methodology-engine/src/lifecycle-validation.ts packages/methodology-engine/src/lifecycle-validation.test.ts packages/methodology-engine/src/validation.ts
git commit -m "fix(methodologies): enforce immutable edit rejection without state corruption"
```

### Task 6: Runtime Deferment Messaging and Accessibility Parity

**Files:**
- Modify: `apps/web/src/features/methodologies/version-workspace.tsx`
- Modify: `apps/web/src/features/methodologies/workspace-shell.tsx`
- Test: `apps/web/src/features/methodologies/version-workspace.integration.test.tsx`

**Step 1: Write the failing tests**

Add tests asserting runtime controls remain visible but disabled with exact message:
`Workflow runtime execution unlocks in Epic 3+`

Also assert publish/evidence actions remain usable.

**Step 2: Run test to verify it fails**

Run: `bun run vitest apps/web/src/features/methodologies/version-workspace.integration.test.tsx -t "runtime controls"`

Expected: FAIL on copy/enablement mismatch.

**Step 3: Write minimal implementation**

Align disable state, rationale copy, and keyboard/focus behavior.

**Step 4: Run test to verify it passes**

Run: `bun run vitest apps/web/src/features/methodologies/version-workspace.integration.test.tsx -t "runtime controls"`

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src/features/methodologies/version-workspace.tsx apps/web/src/features/methodologies/workspace-shell.tsx apps/web/src/features/methodologies/version-workspace.integration.test.tsx
git commit -m "chore(methodologies): preserve epic-2 runtime deferment UX contract"
```

### Task 7: Final Verification and Story Artifact Sync

**Files:**
- Modify: `_bmad-output/implementation-artifacts/2-3-deliver-validation-publish-and-evidence-ux-for-methodology-contracts.md`
- Modify: `_bmad-output/implementation-artifacts/sprint-status.yaml`

**Step 1: Run full targeted verification**

Run:
- `bun check`
- `bun check-types`
- `bun run test --filter methodologies`

Expected: all pass.

**Step 2: Update story artifact checkboxes and notes**

Mark completed tasks, add evidence of tests, and set implementation-ready notes.

**Step 3: Commit final integration batch**

```bash
git add apps/web/src/features/methodologies packages/api/src/routers/methodology.ts packages/api/src/routers/methodology.test.ts packages/methodology-engine/src _bmad-output/implementation-artifacts/2-3-deliver-validation-publish-and-evidence-ux-for-methodology-contracts.md _bmad-output/implementation-artifacts/sprint-status.yaml
git commit -m "feat(methodologies): complete story 2.3 diagnostics-first publish and evidence UX"
```

## Notes for Executor

- Keep changes DRY/YAGNI: do not introduce new layout architecture in Story 2.3.
- Preserve strict module boundaries and deterministic behavior contracts.
- Do not enable runtime execution controls in Epic 2.
- If an API contract change is needed, update contracts/tests first, then UI integration.
