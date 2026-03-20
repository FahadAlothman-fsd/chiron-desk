# Project Switcher + Project Dashboard Lists Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a searchable project switcher in the sidebar, show project-scoped sidebar sections, and ship project list pages (facts/work units/transitions/agents) under `/projects/$projectId/*` with URL-backed filters.

**Architecture:** Keep project context route-scoped (`/projects/$projectId/*`). Sidebar remains a lightweight scope selector + navigation surface (no heavy project detail fetch). Dashboard/list pages own all filtering and render from `orpc.project.getProjectDetails`, extending it with a small server-derived `projectionSummary` for work units + agents.

**Tech Stack:** React 19, TanStack Router (file routes), TanStack Query, shadcn/ui (Sidebar, Command, Popover), oRPC, Vitest + Testing Library, TypeScript.

---

### Task 0: Lock The Remaining IA Decisions In The Design Doc

**Files:**
- Modify: `docs/plans/2026-03-04-project-switcher-project-dashboard-lists-design.md`

**Step 1: Update Open Questions with decisions**
- Decide: lists as subroutes (recommended) vs tabs.
- Decide: `/dashboard` meaning (global vs redirect).
- Decide: preserve subpage when switching projects (recommended: preserve).

**Step 2: Verify no other design docs conflict**
- Re-skim: `docs/plans/2026-03-03-sidebar-navigation-overhaul-design.md`
- Re-skim: `docs/plans/2026-03-04-story-2-6-dashboard-first-baseline-visibility-design.md`

**Step 3: Commit (optional)**
```bash
git add docs/plans/2026-03-04-project-switcher-project-dashboard-lists-design.md
git commit -m "docs(plans): lock IA decisions for project switcher and project list routes"
```

---

### Task 1: Add A Reusable Project Switcher Component (UI-Only)

**Files:**
- Create: `apps/web/src/components/project-switcher.tsx`
- Test: `apps/web/src/components/project-switcher.integration.test.tsx`

**Step 1: Write the failing test**
Test behaviors:
- Renders trigger label (e.g. "Select project" when none).
- Typing in search filters items by display name and id.
- Selecting an item calls `onSelect(projectId)` and closes the popover.

**Step 2: Run test to verify it fails**
Run: `bun run test apps/web/src/components/project-switcher.integration.test.tsx`
Expected: FAIL (component missing).

**Step 3: Write minimal implementation**
- Implement `ProjectSwitcher` with shadcn `Popover` + `Command`.
- Props (keep it UI-only):
  - `projects: Array<{ id: string; displayName: string }>`
  - `value: string | null`
  - `onSelect: (projectId: string) => void`
  - `placeholder?: string`

**Step 4: Run test to verify it passes**
Run: `bun run test apps/web/src/components/project-switcher.integration.test.tsx`
Expected: PASS.

**Step 5: Commit (optional)**
```bash
git add apps/web/src/components/project-switcher.tsx apps/web/src/components/project-switcher.integration.test.tsx
git commit -m "feat(web): add sidebar project switcher component"
```

---

### Task 2: Allow AppSidebar To Render A Switcher Slot

**Files:**
- Modify: `apps/web/src/components/app-sidebar.tsx`
- Test: `apps/web/src/components/app-sidebar.integration.test.tsx`

**Step 1: Write the failing test**
- Render `<AppSidebar ... projectSwitcher={<div>Project Switcher</div>} />`.
- Assert the switcher content appears in the sidebar.

**Step 2: Run test to verify it fails**
Run: `bun run test apps/web/src/components/app-sidebar.integration.test.tsx`
Expected: FAIL (prop not supported / not rendered).

**Step 3: Write minimal implementation**
- Add optional prop: `projectSwitcher?: React.ReactNode`.
- Render it in `SidebarHeader` under the existing brand/commands menu.
- Keep header/footer behavior unchanged.

**Step 4: Run test to verify it passes**
Run: `bun run test apps/web/src/components/app-sidebar.integration.test.tsx`
Expected: PASS.

**Step 5: Commit (optional)**
```bash
git add apps/web/src/components/app-sidebar.tsx apps/web/src/components/app-sidebar.integration.test.tsx
git commit -m "feat(sidebar): support project switcher slot"
```

---

### Task 3: Add Project-Scoped Sidebar Sections

**Files:**
- Modify: `apps/web/src/components/sidebar-sections.tsx`
- Test: `apps/web/src/components/app-shell.sidebar-sections.integration.test.tsx`

**Step 1: Write the failing test**
Add a new case:
- Input pathname: `/projects/project-1/transitions`
- Expect:
  - a new section (title: "Project") exists
  - it includes items with `to` paths:
    - `/projects/project-1`
    - `/projects/project-1/facts`
    - `/projects/project-1/work-units`
    - `/projects/project-1/transitions` (active)
    - `/projects/project-1/agents`
    - `/projects/project-1/pinning`

**Step 2: Run test to verify it fails**
Run: `bun run test apps/web/src/components/app-shell.sidebar-sections.integration.test.tsx`
Expected: FAIL (no project section).

**Step 3: Write minimal implementation**
- Parse `projectId` from pathname with a conservative matcher:
  - match `^/projects/([^/]+)`.
- When present, insert a "Project" section between "Project Operations" and "Planned".
- Mark item active based on `pathname` prefix.

**Step 4: Run test to verify it passes**
Run: `bun run test apps/web/src/components/app-shell.sidebar-sections.integration.test.tsx`
Expected: PASS.

**Step 5: Commit (optional)**
```bash
git add apps/web/src/components/sidebar-sections.tsx apps/web/src/components/app-shell.sidebar-sections.integration.test.tsx
git commit -m "feat(sidebar): add project-scoped navigation section"
```

---

### Task 4: Wire Project Switcher Data + Navigation In AppShell

**Files:**
- Modify: `apps/web/src/components/app-shell.tsx`

**Step 1: Add listProjects query and current project detection**
- Import `useQuery` and `orpc`.
- Fetch: `useQuery(orpc.project.listProjects.queryOptions())`.
- Detect `currentProjectId` from pathname.

**Step 2: Add navigation handler**
- Use TanStack Router navigation (e.g. `useNavigate`) to go to `/projects/${projectId}` on select.

**Step 3: Render switcher into sidebar**
- Create `<ProjectSwitcher ... />` using query data.
- Pass it to `<AppSidebar projectSwitcher={...} />`.

**Step 4: Smoke-test manually**
Run: `bun run dev:web`
Expected:
- Sidebar shows project switcher.
- Selecting a project routes to its dashboard.

**Step 5: Commit (optional)**
```bash
git add apps/web/src/components/app-shell.tsx
git commit -m "feat(app-shell): wire sidebar project switcher"
```

---

### Task 5: Add Project List Routes (Facts/Work Units/Transitions/Agents)

**Files:**
- Create: `apps/web/src/routes/projects.$projectId.facts.tsx`
- Create: `apps/web/src/routes/projects.$projectId.work-units.tsx`
- Create: `apps/web/src/routes/projects.$projectId.transitions.tsx`
- Create: `apps/web/src/routes/projects.$projectId.agents.tsx`
- Test: `apps/web/src/routes/-projects.$projectId.lists-routing.integration.test.tsx`

**Step 1: Write the failing route-wiring test**
- Create a memory router with initial entries for each new path.
- Mock `orpc.project.getProjectDetails.queryOptions()` to return a payload including:
  - `project`
  - `pin` (optional)
  - `baselinePreview` with at least one fact + one transition
  - `projectionSummary` with at least one work unit type + one agent type (can be stubbed initially)
- Assert each page renders a unique heading ("Facts", "Work Units", "Transitions", "Agents").

**Step 2: Run test to verify it fails**
Run: `bun run test apps/web/src/routes/-projects.$projectId.lists-routing.integration.test.tsx`
Expected: FAIL (routes missing).

**Step 3: Implement minimal route components**
- Each route:
  - read `projectId` param
  - query `orpc.project.getProjectDetails({ projectId })`
  - render a `MethodologyWorkspaceShell` with correct segments
  - render list body:
    - facts: from `baselinePreview.facts`
    - transitions: from `baselinePreview.transitionPreview.transitions`
    - work units + agents: render placeholder until API provides real `projectionSummary` (next task)

**Step 4: Run test to verify it passes**
Run: `bun run test apps/web/src/routes/-projects.$projectId.lists-routing.integration.test.tsx`
Expected: PASS.

**Step 5: Commit (optional)**
```bash
git add apps/web/src/routes/projects.$projectId.facts.tsx apps/web/src/routes/projects.$projectId.work-units.tsx apps/web/src/routes/projects.$projectId.transitions.tsx apps/web/src/routes/projects.$projectId.agents.tsx apps/web/src/routes/-projects.$projectId.lists-routing.integration.test.tsx
git commit -m "feat(project): add project list routes for facts, work units, transitions, agents"
```

---

### Task 6: Extend getProjectDetails With projectionSummary (Work Units + Agents)

**Files:**
- Modify: `packages/api/src/routers/project.ts`

**Step 1: Add a failing web expectation test**
- Update `apps/web/src/routes/-projects.$projectId.lists-routing.integration.test.tsx` to assert:
  - Work Units page renders at least one work unit row from `projectionSummary.workUnitTypes`.
  - Agents page renders at least one agent row from `projectionSummary.agentTypes`.

**Step 2: Run test to verify it fails**
Run: `bun run test apps/web/src/routes/-projects.$projectId.lists-routing.integration.test.tsx`
Expected: FAIL (no real data; contract not present).

**Step 3: Implement server mapping**
In `packages/api/src/routers/project.ts`:
- When a pin exists, call `svc.version.workspace.get(pin.methodologyVersionId)`.
- Map `projection.workUnitTypes` and `projection.agentTypes` into `projectionSummary` with conservative type guards.
- If no pin or decode fails, return `projectionSummary: null`.

**Step 4: Update web routes to consume projectionSummary**
- Replace placeholders in work units + agents routes with rendering from `projectionSummary`.

**Step 5: Run test to verify it passes**
Run: `bun run test apps/web/src/routes/-projects.$projectId.lists-routing.integration.test.tsx`
Expected: PASS.

**Step 6: Commit (optional)**
```bash
git add packages/api/src/routers/project.ts apps/web/src/routes/projects.$projectId.work-units.tsx apps/web/src/routes/projects.$projectId.agents.tsx apps/web/src/routes/-projects.$projectId.lists-routing.integration.test.tsx
git commit -m "feat(api): add projectionSummary to project details for dashboard lists"
```

---

### Task 7: Add URL-Backed Filters (Client-Side)

**Files:**
- Modify: `apps/web/src/routes/projects.$projectId.facts.tsx`
- Modify: `apps/web/src/routes/projects.$projectId.work-units.tsx`
- Modify: `apps/web/src/routes/projects.$projectId.transitions.tsx`
- Modify: `apps/web/src/routes/projects.$projectId.agents.tsx`

**Step 1: Add minimal search param schemas**
- For each route, define a search schema (TanStack Router) for:
  - `q?: string`
  - one facet per page (e.g. `missing?: boolean` for facts, `status?: string` for transitions).

**Step 2: Implement UI controls**
- Add an input for `q`.
- Add 1-2 small facet controls (checkbox/select).
- On change, update search params via `Route.useNavigate()`.

**Step 3: Filter list data client-side**
- Apply filtering to the already-loaded `baselinePreview` / `projectionSummary` arrays.

**Step 4: Add at least one integration assertion**
- Extend `apps/web/src/routes/-projects.$projectId.lists-routing.integration.test.tsx` to set initialEntries with search params and assert filtered rows.

**Step 5: Run tests**
Run: `bun run test apps/web/src/routes/-projects.$projectId.lists-routing.integration.test.tsx`
Expected: PASS.

**Step 6: Commit (optional)**
```bash
git add apps/web/src/routes/projects.$projectId.facts.tsx apps/web/src/routes/projects.$projectId.work-units.tsx apps/web/src/routes/projects.$projectId.transitions.tsx apps/web/src/routes/projects.$projectId.agents.tsx apps/web/src/routes/-projects.$projectId.lists-routing.integration.test.tsx
git commit -m "feat(project): add URL-backed filters for project list pages"
```

---

### Task 8: Final Verification

**Step 1: Run web test suite**
Run: `bun run test`
Expected: PASS.

**Step 2: Run formatting/lint**
Run: `bun run check`
Expected: PASS.

**Step 3: Run typecheck**
Run: `bun run check-types`
Expected: PASS.

