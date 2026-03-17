# Story 3.1 Design-Time Shell Baseline Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete Story 3.1 version-scoped methodology routing, page shells, command parity, and regression coverage without introducing a second client-side data model.

**Architecture:** Keep version-owned surfaces under `/methodologies/:methodologyId/versions/:versionId/...`, use route params plus search params as the durable state contract, and derive page slices from the existing `getDraftProjection(versionId)` query. Reuse the current workspace shell, facts inventory, and graph primitives by extraction, then route all create/navigation actions through one shared resolver so visible controls and command palette behavior stay identical.

**Tech Stack:** TanStack Router file-routes, React 19, TanStack Query v5, Vitest, Testing Library, Playwright, Bun.

---

### Task 1: Lock sidebar IA and route inventory in tests

**Files:**
- Modify: `apps/web/src/tests/components/app-shell.sidebar-sections.integration.test.tsx`
- Modify: `apps/web/src/tests/components/app-sidebar.integration.test.tsx`
- Modify: `apps/web/src/components/sidebar-sections.tsx`
- Modify: `apps/web/src/components/app-sidebar.tsx`

**Step 1: Write the failing test**

Update the sidebar tests to expect the selected-version section to contain real links for:

- `Workspace`
- `Facts`
- `Work Units`
- `Agents`
- `Dependency Definitions`

Also assert that disabled placeholders for Story 3.1 destinations are gone.

**Step 2: Run test to verify it fails**

Run: `bun run --cwd apps/web test -- 'src/tests/components/app-shell.sidebar-sections.integration.test.tsx' 'src/tests/components/app-sidebar.integration.test.tsx'`
Expected: FAIL because sidebar items are still disabled placeholders or missing.

**Step 3: Write minimal implementation**

Update `buildSidebarSections(...)` and the sidebar rendering path so the selected-version section emits concrete links:

- `/methodologies/$methodologyId/versions/$versionId`
- `/methodologies/$methodologyId/versions/$versionId/facts`
- `/methodologies/$methodologyId/versions/$versionId/work-units`
- `/methodologies/$methodologyId/versions/$versionId/agents`
- `/methodologies/$methodologyId/versions/$versionId/dependency-definitions`

Do not add new sidebar state beyond existing scope/methodology/version switcher inputs.

**Step 4: Run test to verify it passes**

Run the same command.
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src/tests/components/app-shell.sidebar-sections.integration.test.tsx apps/web/src/tests/components/app-sidebar.integration.test.tsx apps/web/src/components/sidebar-sections.tsx apps/web/src/components/app-sidebar.tsx
git commit -m "test: lock Story 3.1 version navigation"
```

### Task 2: Add route shells and deterministic state helpers

**Files:**
- Create: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.tsx`
- Create: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx`
- Create: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.agents.tsx`
- Create: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.dependency-definitions.tsx`
- Create: `apps/web/src/features/methodologies/version-page-state.tsx`
- Create: `apps/web/src/features/methodologies/version-page-selectors.ts`
- Modify: `apps/web/src/features/methodologies/workspace-shell.tsx`
- Test: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx`
- Test: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.integration.test.tsx`
- Test: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.agents.integration.test.tsx`
- Test: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.dependency-definitions.integration.test.tsx`

**Step 1: Write the failing tests**

Create route tests that assert each new page:

- renders under the selected methodology/version scope
- shows stable breadcrumbs/title state
- distinguishes `loading`, `blocked`, `failed`, and `empty`
- preserves version context in every state

For Work Unit L2, also assert missing/invalid selected work unit renders `blocked` instead of generic error.

**Step 2: Run test to verify it fails**

Run: `bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.agents.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.dependency-definitions.integration.test.tsx'`
Expected: FAIL because the route files/helpers do not exist yet.

**Step 3: Write minimal implementation**

Add route files using `createFileRoute(...)` and fetch route-scoped data from:

- `orpc.methodology.getMethodologyDetails.queryOptions({ input: { methodologyKey: methodologyId } })`
- `orpc.methodology.getDraftProjection.queryOptions({ input: { versionId } })`

Create `version-page-selectors.ts` with pure helpers such as:

- `selectVersionMetadata(...)`
- `selectWorkUnitsPageData(...)`
- `selectWorkUnitDetailData(...)`
- `selectAgentsPageData(...)`
- `selectDependencyDefinitionsPageData(...)`

Create `version-page-state.tsx` with deterministic state rendering helpers and operator-first copy order.

**Step 4: Run test to verify it passes**

Run the same command.
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.tsx apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.agents.tsx apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.dependency-definitions.tsx apps/web/src/features/methodologies/version-page-state.tsx apps/web/src/features/methodologies/version-page-selectors.ts apps/web/src/features/methodologies/workspace-shell.tsx apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.integration.test.tsx apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.agents.integration.test.tsx apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.dependency-definitions.integration.test.tsx
git commit -m "feat: add Story 3.1 route shells"
```

### Task 3: Extract Work Units L1/L2 shell primitives from the existing workspace graph

**Files:**
- Modify: `apps/web/src/features/methodologies/version-workspace-graph.tsx`
- Create: `apps/web/src/features/methodologies/work-units-page.tsx`
- Create: `apps/web/src/features/methodologies/work-unit-detail-page.tsx`
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.tsx`
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx`
- Test: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx`
- Test: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.integration.test.tsx`

**Step 1: Write the failing tests**

Extend the route tests to assert:

- Work Units L1 has the locked `Graph`, `Contracts`, `Diagnostics` tabs
- list selection and graph selection stay synchronized through one selected key
- Work Unit L2 preserves the selected work-unit anchor while switching tabs
- L2 tab order is `Overview`, `Facts`, `Workflows`, `State Machine`, `Artifact Slots`

**Step 2: Run test to verify it fails**

Run: `bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.integration.test.tsx'`
Expected: FAIL because the shells are placeholders and the extracted primitives do not exist.

**Step 3: Write minimal implementation**

Refactor `version-workspace-graph.tsx` to extract reusable view helpers/components instead of copying graph logic. Build:

- `work-units-page.tsx` for the L1 three-region shell
- `work-unit-detail-page.tsx` for L2 selected-work-unit shell

Use URL search params for local tab/selection state and route params for durable work-unit identity.

**Step 4: Run test to verify it passes**

Run the same command.
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src/features/methodologies/version-workspace-graph.tsx apps/web/src/features/methodologies/work-units-page.tsx apps/web/src/features/methodologies/work-unit-detail-page.tsx apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.tsx apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.integration.test.tsx
git commit -m "feat: add Story 3.1 work unit shells"
```

### Task 4: Implement shared action resolver and command palette parity

**Files:**
- Create: `apps/web/src/features/methodologies/version-actions.ts`
- Modify: `apps/web/src/features/methodologies/commands.ts`
- Modify: `apps/web/src/features/methodologies/command-palette.tsx`
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.facts.tsx`
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.tsx`
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.agents.tsx`
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.dependency-definitions.tsx`
- Test: `apps/web/src/tests/features/methodologies/commands.test.ts`
- Test: `apps/web/src/tests/features/methodologies/command-palette.integration.test.tsx`
- Test: `apps/web/src/tests/features/methodologies/command-palette-navigation.test.ts`

**Step 1: Write the failing tests**

Extend command tests to cover these version-scoped actions:

- `Add Fact`
- `Add Work Unit`
- `Add Agent`
- `Add Link Type`
- Work Units breadcrumb drill-down entries when a selected work unit exists

Assert disabled reasons are human-readable and match page blocking behavior.

**Step 2: Run test to verify it fails**

Run: `bun run --cwd apps/web test -- 'src/tests/features/methodologies/commands.test.ts' 'src/tests/features/methodologies/command-palette.integration.test.tsx' 'src/tests/features/methodologies/command-palette-navigation.test.ts'`
Expected: FAIL because the new command IDs/resolver behavior do not exist.

**Step 3: Write minimal implementation**

Create `version-actions.ts` with a single resolver API, for example:

```ts
export type VersionActionIntent =
  | "add-fact"
  | "add-work-unit"
  | "add-agent"
  | "add-link-type";
```

That resolver should decide:

- owner route
- whether the user is already on-page
- whether to navigate with `intent=...`
- whether to open the page-local action immediately

Update palette commands to call the same resolver used by page buttons.

**Step 4: Run test to verify it passes**

Run the same command.
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src/features/methodologies/version-actions.ts apps/web/src/features/methodologies/commands.ts apps/web/src/features/methodologies/command-palette.tsx apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.facts.tsx apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.tsx apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.agents.tsx apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.dependency-definitions.tsx apps/web/src/tests/features/methodologies/commands.test.ts apps/web/src/tests/features/methodologies/command-palette.integration.test.tsx apps/web/src/tests/features/methodologies/command-palette-navigation.test.ts
git commit -m "feat: add Story 3.1 command parity"
```

### Task 5: Finish shell-specific content, facts alignment, and full verification

**Files:**
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.integration.test.tsx`
- Modify: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.facts.integration.test.tsx`
- Modify: `apps/web/src/features/methodologies/methodology-facts.tsx`
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.facts.tsx`
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.agents.tsx`
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.dependency-definitions.tsx`
- Test: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.integration.test.tsx`
- Test: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.facts.integration.test.tsx`
- Browser verify: Playwright scenario for Story 3.1 navigation path

**Step 1: Write the failing tests**

Add assertions that:

- the parent version route still renders nested child routes correctly
- facts remain dialog-first and align with the shared Story 3.1 deterministic state contract
- agents page stays card-first, not table-first
- dependency definitions stay semantic-only and list/detail-driven

**Step 2: Run test to verify it fails**

Run: `bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.facts.integration.test.tsx'`
Expected: FAIL because Story 3.1 consistency details are not fully wired.

**Step 3: Write minimal implementation**

Align facts, agents, and dependency-definitions shells to the shared state helpers and operator-first messaging. Keep facts dialog-first, agents card-first, and dependency definitions semantic-only.

**Step 4: Run focused tests to verify they pass**

Run the same command.
Expected: PASS.

**Step 5: Run broader verification**

Run:

- `bun run check`
- `bun run check-types`
- `bun run --cwd apps/web test -- 'src/tests/components/app-shell.sidebar-sections.integration.test.tsx' 'src/tests/components/app-sidebar.integration.test.tsx'`
- `bun run --cwd apps/web test -- 'src/tests/features/methodologies/commands.test.ts' 'src/tests/features/methodologies/command-palette.integration.test.tsx' 'src/tests/features/methodologies/command-palette-navigation.test.ts'`
- `bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.facts.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.agents.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.dependency-definitions.integration.test.tsx'`
- `bunx playwright test`

Expected: PASS.

**Step 6: Commit**

```bash
git add apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.integration.test.tsx apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.facts.integration.test.tsx apps/web/src/features/methodologies/methodology-facts.tsx apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.facts.tsx apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.agents.tsx apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.dependency-definitions.tsx
git commit -m "feat: finish Story 3.1 shell verification"
```
