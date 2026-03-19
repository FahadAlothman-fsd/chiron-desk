# Work Unit Guidance Parity Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Work Unit authoring match the artifact/fact pattern with a shared create/edit modal, `Contract` / `Guidance` tabs, and persisted guidance JSON `{ human, agent }` end to end.

**Architecture:** Reuse the existing facts guidance shape instead of inventing a new Work Unit-specific format. Extend the shared lifecycle contract to include Work Unit guidance, carry that field through repository/service/API projections, and replace the current shallow Work Units route dialog with one shared artifact-style editor used by create, edit, and intent-driven entry points.

**Tech Stack:** React, TanStack Router, TanStack Query, ORPC, Effect Schema, Drizzle ORM, SQLite, Vitest, Testing Library, Bun

---

### Task 1: Add Work Unit Guidance To The Shared Contract

**Files:**
- Modify: `packages/contracts/src/methodology/lifecycle.ts`
- Reuse: `packages/contracts/src/methodology/fact.ts`
- Test: `packages/contracts/src/tests/methodology/version.test.ts`

**Step 1: Write the failing test**

Extend `packages/contracts/src/tests/methodology/version.test.ts` or add a focused lifecycle contract test proving Work Unit definitions accept the same guidance shape used by facts:

```ts
const guidance = {
  human: { markdown: "Human guidance" },
  agent: { markdown: "Agent guidance" },
};

expect(() =>
  Schema.decodeUnknownSync(WorkUnitTypeDefinition)({
    key: "task",
    cardinality: "many_per_project",
    guidance,
    lifecycleStates: [],
    lifecycleTransitions: [],
    factSchemas: [],
  }),
).not.toThrow();
```

**Step 2: Run test to verify it fails**

Run: `bun run --cwd packages/contracts test -- src/tests/methodology/version.test.ts`

Expected: FAIL because `WorkUnitTypeDefinition` in `packages/contracts/src/methodology/lifecycle.ts` does not yet include `guidance`.

**Step 3: Write minimal implementation**

Update `packages/contracts/src/methodology/lifecycle.ts` to:
- import and reuse the shared audience guidance shape from `packages/contracts/src/methodology/fact.ts`
- add `guidance: Schema.optional(FactGuidance)` (or the same shared alias) to `WorkUnitTypeDefinition`

Do not invent a second guidance structure.

**Step 4: Run test to verify it passes**

Run: `bun run --cwd packages/contracts test -- src/tests/methodology/version.test.ts`

Expected: PASS with Work Unit guidance shape accepted.

**Step 5: Commit**

```bash
git add "packages/contracts/src/methodology/lifecycle.ts" "packages/contracts/src/tests/methodology/version.test.ts"
git commit -m "feat(contracts): add work unit guidance contract"
```

### Task 2: Persist Work Unit Guidance Through Repository And Lifecycle Service

**Files:**
- Modify: `packages/db/src/lifecycle-repository.ts`
- Modify: `packages/methodology-engine/src/lifecycle-service.ts`
- Test: `packages/db/src/tests/repository/methodology-repository.integration.test.ts`
- Test: `packages/methodology-engine/src/tests/validation/lifecycle-validation.test.ts`

**Step 1: Write the failing test**

Add repository/service coverage proving Work Unit guidance round-trips:

```ts
expect(snapshot.workUnitTypes).toEqual(
  expect.arrayContaining([
    expect.objectContaining({
      key: "task",
      guidance: {
        human: { markdown: "Human guidance" },
        agent: { markdown: "Agent guidance" },
      },
    }),
  ]),
);
```

Also add a legacy compatibility case where `guidanceJson` is `null` and the result remains valid.

**Step 2: Run test to verify it fails**

Run: `bun run --cwd packages/db test -- src/tests/repository/methodology-repository.integration.test.ts`

Expected: FAIL because `toWorkUnitTypeRow` in `packages/db/src/lifecycle-repository.ts` drops `guidanceJson`, and `packages/methodology-engine/src/lifecycle-service.ts` does not project guidance onto `WorkUnitTypeDefinition`.

**Step 3: Write minimal implementation**

Update:
- `packages/db/src/lifecycle-repository.ts`
  - include `guidanceJson` in `toWorkUnitTypeRow`
- `packages/methodology-engine/src/lifecycle-service.ts`
  - map `workUnitTypeRow.guidanceJson` to `guidance` on `WorkUnitTypeDefinition`
  - normalize `null`/missing guidance to `undefined`

Do not change unrelated workflow/fact guidance behavior.

**Step 4: Run test to verify it passes**

Run: `bun run --cwd packages/db test -- src/tests/repository/methodology-repository.integration.test.ts`

Expected: PASS with Work Unit guidance persisted and projected.

**Step 5: Commit**

```bash
git add "packages/db/src/lifecycle-repository.ts" "packages/methodology-engine/src/lifecycle-service.ts" "packages/db/src/tests/repository/methodology-repository.integration.test.ts" "packages/methodology-engine/src/tests/validation/lifecycle-validation.test.ts"
git commit -m "feat(methodology): persist work unit guidance in lifecycle snapshots"
```

### Task 3: Expose Work Unit Guidance Through API Draft Boundaries

**Files:**
- Modify: `packages/api/src/routers/methodology.ts`
- Modify: `packages/contracts/src/methodology/lifecycle.ts`
- Modify: `packages/contracts/src/methodology/dto.ts`
- Test: `packages/api/src/tests/routers/methodology.test.ts`

**Step 1: Write the failing test**

Add a router/API test proving Work Unit create/update accepts and returns guidance:

```ts
await expect(
  caller.version.workUnit.updateMeta({
    versionId,
    workUnitTypes: [
      {
        key: "task",
        cardinality: "many_per_project",
        guidance: {
          human: { markdown: "Human guidance" },
          agent: { markdown: "Agent guidance" },
        },
        lifecycleStates: [],
        lifecycleTransitions: [],
        factSchemas: [],
      },
    ],
  }),
).resolves.toBeDefined();
```

**Step 2: Run test to verify it fails**

Run: `bun run --cwd packages/api test -- src/tests/routers/methodology.test.ts`

Expected: FAIL until the Work Unit guidance field is accepted end to end.

**Step 3: Write minimal implementation**

Update the router/schema layer so Work Unit guidance is accepted and preserved through the draft lifecycle endpoints already used by `version.workUnit.create` / `updateMeta`.

Important:
- keep the current `updateDraftLifecycle` boundary unless evidence shows a dedicated endpoint is now required
- make sure guidance survives list/get projection calls used by the web route

**Step 4: Run test to verify it passes**

Run: `bun run --cwd packages/api test -- src/tests/routers/methodology.test.ts`

Expected: PASS with Work Unit guidance accepted by API tests.

**Step 5: Commit**

```bash
git add "packages/api/src/routers/methodology.ts" "packages/contracts/src/methodology/lifecycle.ts" "packages/contracts/src/methodology/dto.ts" "packages/api/src/tests/routers/methodology.test.ts"
git commit -m "feat(api): expose work unit guidance in draft routes"
```

### Task 4: Build The Shared Work Unit Contract/Guidance Editor

**Files:**
- Create: `apps/web/src/features/methodologies/work-unit-editor-dialog.tsx`
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.tsx`
- Test: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx`

**Step 1: Write the failing test**

Replace the current shallow dialog expectations with artifact-style create flow coverage:

```ts
it("creates a work unit through Contract and Guidance tabs", async () => {
  // open + Add Work Unit
  // assert Contract tab fields: key, display name, description, cardinality
  // click Next
  // assert Guidance tab fields: human guidance, agent guidance
  // submit
  // expect payload guidance JSON to match authored markdown
});

it("opens edit with the same tabbed editor prefilled from the selected work unit", async () => {
  // open edit affordance
  // assert existing contract + guidance values are prefilled
});
```

**Step 2: Run test to verify it fails**

Run: `bun run --cwd apps/web test -- "src/tests/routes/methodologies.\$methodologyId.versions.\$versionId.work-units.integration.test.tsx"`

Expected: FAIL because the current route still uses a shallow inline dialog and has no guidance tab/editor.

**Step 3: Write minimal implementation**

Create `apps/web/src/features/methodologies/work-unit-editor-dialog.tsx` with:
- shared create/edit dialog UI
- `Contract` and `Guidance` tabs
- local editor state for `key`, `displayName`, `description`, `cardinality`, `guidance.human.markdown`, `guidance.agent.markdown`
- `Next`, `Back`, `Cancel`, and `Create/Save` actions

Update `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.tsx` to:
- replace the current shallow dialog with the shared editor component
- keep existing visible failure handling
- preserve create-intent opening behavior
- pass authored guidance into the payload

**Step 4: Run test to verify it passes**

Run: `bun run --cwd apps/web test -- "src/tests/routes/methodologies.\$methodologyId.versions.\$versionId.work-units.integration.test.tsx"`

Expected: PASS with tabbed create/edit flow covered.

**Step 5: Commit**

```bash
git add "apps/web/src/features/methodologies/work-unit-editor-dialog.tsx" "apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.tsx" "apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx"
git commit -m "feat(web): add tabbed Work Unit editor"
```

### Task 5: Unify Work Unit Authoring Entry Points

**Files:**
- Modify: `apps/web/src/features/methodologies/command-palette.tsx`
- Modify: `apps/web/src/features/methodologies/version-workspace-graph.tsx`
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.tsx`
- Test: `apps/web/src/tests/features/methodologies/command-palette.integration.test.tsx`
- Test: `apps/web/src/tests/features/methodologies/version-workspace.integration.test.tsx`

**Step 1: Write the failing test**

Add coverage proving each authoring entry point lands in the same full editor flow:

```ts
it("opens the full Work Unit editor from command palette intent", async () => {
  // trigger Add Work Unit from palette
  // assert Contract tab appears
});

it("quick-add routes into the full Work Unit editor when authoring continues", async () => {
  // seed graph/workspace quick-add state
  // assert it converges on the same editor state machine
});
```

**Step 2: Run test to verify it fails**

Run: `bun run --cwd apps/web test -- "src/tests/features/methodologies/command-palette.integration.test.tsx" "src/tests/features/methodologies/version-workspace.integration.test.tsx"`

Expected: FAIL until all authoring entry points converge on the same editor.

**Step 3: Write minimal implementation**

Update entry points so:
- page action opens the shared editor
- command palette create intent opens the shared editor
- graph/workspace quick-add either seeds the shared editor or cleanly escalates to it when richer authoring is needed

Do not keep a second weaker metadata-only flow if it diverges from the shared editor.

**Step 4: Run test to verify it passes**

Run: `bun run --cwd apps/web test -- "src/tests/features/methodologies/command-palette.integration.test.tsx" "src/tests/features/methodologies/version-workspace.integration.test.tsx"`

Expected: PASS with entry-point convergence verified.

**Step 5: Commit**

```bash
git add "apps/web/src/features/methodologies/command-palette.tsx" "apps/web/src/features/methodologies/version-workspace-graph.tsx" "apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.tsx" "apps/web/src/tests/features/methodologies/command-palette.integration.test.tsx" "apps/web/src/tests/features/methodologies/version-workspace.integration.test.tsx"
git commit -m "feat(web): unify Work Unit authoring entry points"
```

### Task 6: Run Full Verification And Refresh Story Artifacts

**Files:**
- Modify: `_bmad-output/implementation-artifacts/3-1-complete-design-time-ia-and-page-shell-baseline.md`
- Modify: `_bmad-output/implementation-artifacts/sprint-status.yaml` (only if status changes)

**Step 1: Run the verification suite**

Run:

```bash
bun run --cwd packages/contracts test -- src/tests/methodology/version.test.ts && \
bun run --cwd packages/db test -- src/tests/repository/methodology-repository.integration.test.ts && \
bun run --cwd packages/api test -- src/tests/routers/methodology.test.ts && \
bun run --cwd apps/web test -- "src/tests/features/methodologies/command-palette.integration.test.tsx" "src/tests/features/methodologies/version-workspace.integration.test.tsx" "src/tests/routes/methodologies.\$methodologyId.versions.\$versionId.shell-routes.integration.test.tsx" "src/tests/routes/methodologies.\$methodologyId.versions.\$versionId.work-units.integration.test.tsx" && \
bun run --cwd apps/web check-types && \
bun run check
```

Expected: all suites pass, typecheck passes, repo checks pass.

**Step 2: Refresh Story 3.1 review note**

Update `_bmad-output/implementation-artifacts/3-1-complete-design-time-ia-and-page-shell-baseline.md` to record:
- Work Unit guidance parity delivered
- create/edit now match artifact-style contract/guidance authoring
- fresh verification evidence

If status legitimately changes, update `_bmad-output/implementation-artifacts/sprint-status.yaml` in the same step.

**Step 3: Commit**

```bash
git add "_bmad-output/implementation-artifacts/3-1-complete-design-time-ia-and-page-shell-baseline.md" "_bmad-output/implementation-artifacts/sprint-status.yaml"
git commit -m "docs(story): record Work Unit guidance parity"
```
