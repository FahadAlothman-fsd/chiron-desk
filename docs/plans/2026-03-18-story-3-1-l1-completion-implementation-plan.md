# Story 3.1 L1 Completion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Finish the remaining L1 product surface by adding full agent and dependency-definition CRUD UI plus shallow work-unit update/delete UI, without pulling in any L2 artifact/state-machine work.

**Architecture:** Reuse the already-shipped mutation surface (`methodology.version.agent.*`, `methodology.version.dependencyDefinition.*`, `methodology.version.workUnit.updateMeta/delete`) and close the missing UI affordances in the existing Story 3.1 routes. Drive each slice from focused route-integration tests first, then add the smallest event-driven dialogs/actions needed in the current pages.

**Tech Stack:** React, TanStack Router, TanStack Query, Vitest, Testing Library, Base UI Dialog, ORPC, Bun

---

### Task 1: Finish Agent CRUD UI

**Files:**
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.agents.tsx`
- Modify: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx`

**Step 1: Write the failing test**

Extend `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx` so the Agents route proves all three user flows, not just create:

```ts
it("updates an agent through version.agent.update", async () => {
  // render route with updateAgentMock
  // click Edit on an existing agent
  // change Display Name or Persona
  // click Save Changes
  // expect updateAgentMock called once
});

it("deletes an agent through version.agent.delete", async () => {
  // render route with deleteAgentMock
  // click Delete on an existing agent
  // confirm delete
  // expect deleteAgentMock called once
});
```

**Step 2: Run test to verify it fails**

Run: `bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx'`

Expected: FAIL because the Agents page only exposes create flow and has no edit/delete UI or mutation mocks yet.

**Step 3: Write minimal implementation**

Update `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.agents.tsx` to add:
- nested mutation hooks for:
  - `orpc.methodology.version.agent.update`
  - `orpc.methodology.version.agent.delete`
- per-agent action buttons (`Edit`, `Delete`)
- one edit dialog reusing the existing create fields (`Agent Key`, `Display Name`, `Description`, `Persona`)
- one delete-confirm dialog
- query invalidation against `version.agent.list`

Keep the UI shallow and event-driven:
- no new `useEffect`
- no layout redesign
- no extra tabs or L2 concepts

**Step 4: Run test to verify it passes**

Run: `bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx'`

Expected: PASS with the new agent update/delete assertions green.

**Step 5: Commit**

```bash
git add "apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.agents.tsx" "apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx"
git commit -m "feat(web): finish L1 agent CRUD UI"
```

### Task 2: Finish Dependency Definition CRUD UI

**Files:**
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.dependency-definitions.tsx`
- Modify: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx`

**Step 1: Write the failing test**

Extend the existing shell-routes test file with two more dependency-definition assertions:

```ts
it("updates a dependency definition through version.dependencyDefinition.update", async () => {
  // render with updateDependencyDefinitionMock
  // click Edit on an existing link type
  // change Description or allowed strengths
  // click Save Changes
  // expect updateDependencyDefinitionMock called once
});

it("deletes a dependency definition through version.dependencyDefinition.delete", async () => {
  // render with deleteDependencyDefinitionMock
  // click Delete on an existing link type
  // confirm delete
  // expect deleteDependencyDefinitionMock called once
});
```

**Step 2: Run test to verify it fails**

Run: `bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx'`

Expected: FAIL because the dependency-definitions page only exposes create flow and has no edit/delete actions.

**Step 3: Write minimal implementation**

Update `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.dependency-definitions.tsx` to add:
- nested mutation hooks for:
  - `orpc.methodology.version.dependencyDefinition.update`
  - `orpc.methodology.version.dependencyDefinition.delete`
- per-link-type action buttons (`Edit`, `Delete`)
- edit dialog reusing the existing create fields:
  - `Link Type Key`
  - `Description`
  - `Hard` / `Soft`
- delete-confirm dialog
- query invalidation against `version.dependencyDefinition.list`

Prefer explicit `linkTypeDefinitions` from the query result for rendering/edit targets. Only keep the `transitionWorkflowBindings` key fallback for passive display fallback.

**Step 4: Run test to verify it passes**

Run: `bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx'`

Expected: PASS with dependency-definition create/update/delete coverage all green.

**Step 5: Commit**

```bash
git add "apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.dependency-definitions.tsx" "apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx"
git commit -m "feat(web): finish L1 dependency definition CRUD UI"
```

### Task 3: Finish Shallow Work Unit Update/Delete UI

**Files:**
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.tsx`
- Modify: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx`

**Step 1: Write the failing test**

Extend `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx` with shallow metadata/edit coverage:

```ts
it("updates work-unit metadata through version.workUnit.updateMeta", async () => {
  // render selected work unit
  // click Edit Metadata
  // change Display Name
  // click Save Changes
  // expect updateMetaMock called once
});

it("deletes a work unit through version.workUnit.delete", async () => {
  // render selected work unit
  // click Delete Work Unit
  // confirm delete
  // expect deleteWorkUnitMock called once
});
```

Keep this shallow: metadata only, no state-machine/artifact/workflow internals.

**Step 2: Run test to verify it fails**

Run: `bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx'`

Expected: FAIL because the Work Units route currently has create flow only and no update/delete actions.

**Step 3: Write minimal implementation**

Update `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.tsx` to add:
- mutation hooks for:
  - `orpc.methodology.version.workUnit.updateMeta`
  - `orpc.methodology.version.workUnit.delete`
- selected-work-unit action buttons in the right rail:
  - `Edit Metadata`
  - `Delete Work Unit`
- one edit dialog for shallow metadata only
- one delete-confirm dialog
- query invalidation against `version.workUnit.list`
- selection reset if the active work unit is deleted

Do not change L2 route structure and do not add any L2 internals.

**Step 4: Run test to verify it passes**

Run: `bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx'`

Expected: PASS with create + updateMeta + delete all green.

**Step 5: Commit**

```bash
git add "apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.tsx" "apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx"
git commit -m "feat(web): finish L1 work unit CRUD UI"
```

### Task 4: Verify L1 Completion And Document It

**Files:**
- Modify: `docs/plans/2026-03-18-story-3-1-l1-completion-design.md`
- Modify: `_bmad-output/implementation-artifacts/3-1-complete-design-time-ia-and-page-shell-baseline.md`

**Step 1: Write the failing test / checklist**

Create a simple checklist in your notes before running commands:
- Agents page supports create/update/delete
- Dependency Definitions page supports create/update/delete
- Work Units page supports shallow create/updateMeta/delete
- Facts page and dashboard still pass after no regressions

**Step 2: Run verification to prove completion**

Run:

```bash
bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.facts.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx' && bun run check-types && bun run check
```

Expected: PASS on all route suites and repo checks.

**Step 3: Write minimal documentation updates**

Update `docs/plans/2026-03-18-story-3-1-l1-completion-design.md`:
- switch status to implemented
- add implementation notes summarizing what shipped

Update `_bmad-output/implementation-artifacts/3-1-complete-design-time-ia-and-page-shell-baseline.md`:
- append an addendum documenting the final L1 completion slice
- explicitly note that L2 artifact/state-machine work remains out of scope

**Step 4: Re-run verification after docs if needed**

Run: `bun run check`

Expected: PASS and no formatting drift.

**Step 5: Commit**

```bash
git add 'docs/plans/2026-03-18-story-3-1-l1-completion-design.md' '_bmad-output/implementation-artifacts/3-1-complete-design-time-ia-and-page-shell-baseline.md'
git commit -m "docs(methodology): record Story 3.1 L1 completion"
```
