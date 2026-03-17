# Version Workspace Author Hub and Reusable Surface Card Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert the top layer of the methodology version workspace into a two-tab author hub built on a reusable surface-card primitive with status cards, surface-entry cards, and visible hotkey-backed quick actions.

**Architecture:** Keep deeper authoring on first-class routed pages, but refactor `/methodologies/$methodologyId/versions/$versionId` so its `Author` tab becomes a shell-level dashboard. First introduce a reusable surface-card primitive that matches the approved near-exact reference structure using the app's existing palette, then migrate the Author hub cards onto that primitive. Reuse existing methodology command IDs, shortcut strings, and router destinations so visible controls, quick actions, and keyboard hotkeys all execute the same actions.

**Tech Stack:** React, TanStack Router, TanStack Query, `@tanstack/react-hotkeys`, shadcn/ui, Vitest, Bun.

---

### Task 1: Add failing tests for the reusable surface-card primitive

**Files:**
- Create: `apps/web/src/tests/components/surface-card.test.tsx`
- Test command target: new test file above

**Step 1: Write the failing tests**

Add focused component tests that prove the reusable card primitive renders the approved contract:

- square shell with footer separator
- decorative corner blocks
- compact side-by-side footer actions
- visible shortcut hints inside the footer actions
- support for disabled actions and disabled rationale text
- support for primary value and secondary values

Example assertion shape:

```tsx
expect(screen.getByText("2 work units")).toBeVisible();
expect(screen.getByRole("button", { name: "Open Work Units" })).toBeVisible();
expect(screen.getByText("G W")).toBeVisible();
expect(screen.getByText("Open a methodology version context first")).toBeVisible();
```

**Step 2: Run tests to verify they fail**

Run:

```bash
bun run --cwd apps/web test -- 'src/tests/components/surface-card.test.tsx'
```

Expected: FAIL because the reusable primitive does not exist yet.

**Step 3: Write minimal implementation**

Create the shared primitive first.

Recommended file shape:

- Create: `apps/web/src/components/surface-card.tsx`

Implementation rules:

- match the approved near-exact reference structure
- keep colors sourced from existing app tokens/palette
- keep the component generic enough for later reuse outside the Author hub
- keep decorative treatment optional via props if needed

**Step 4: Run tests to verify they pass**

Run the same command and confirm PASS.

**Step 5: Commit**

```bash
git add apps/web/src/components/surface-card.tsx apps/web/src/tests/components/surface-card.test.tsx
git commit -m "feat(web): add reusable surface card"
```

### Task 2: Migrate the Author hub shell onto the reusable cards

**Files:**
- Modify: `apps/web/src/components/surface-card.tsx`
- Modify: `apps/web/src/features/methodologies/version-workspace-author-hub.tsx`
- Modify: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.integration.test.tsx`
- Modify: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx`
- Test command target: both files above

**Step 1: Write the failing tests**

Add focused route tests that assert the workspace top layer now renders on the new reusable cards:

- only two tabs: `Author` and `Review & Publish`
- four status cards (`DRAFT`, `SAVE STATE`, `RUNTIME`, `READINESS`)
- surface cards for `Work Units`, `Facts`, `Agents`, and `Link Types / Dependency Definitions`
- visible shortcut hints using the existing command grammar (`g w`, `c w`, `g f`, `c f`, `g a`, `c a`, `g l`, `c l`)
- compact horizontal footer actions instead of stacked full-width buttons
- decorative reusable-card treatment (separator + corners) via stable test hooks or text-level expectations

Example assertion shape:

```tsx
expect(screen.getByRole("tab", { name: "Author" })).toBeVisible();
expect(screen.getByRole("tab", { name: "Review & Publish" })).toBeVisible();
expect(screen.getByText("DRAFT")).toBeVisible();
expect(screen.getByText("Shortcut: [ G W ] Open Work Units")).toBeVisible();
```

**Step 2: Run tests to verify they fail**

Run:

```bash
bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx'
```

Expected: FAIL because the route still lacks the reusable-card treatment.

**Step 3: Write minimal implementation**

Implement only enough structure to render the new top-layer shell contract using the shared card primitive.

Recommended file shape:

- Modify: `apps/web/src/features/methodologies/version-workspace-author-hub.tsx`
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.tsx`

The hub should consume the shared card primitive rather than carrying its own one-off shell markup.

**Step 4: Run tests to verify they pass**

Run the same command and confirm PASS.

**Step 5: Commit**

```bash
git add apps/web/src/components/surface-card.tsx apps/web/src/features/methodologies/version-workspace-author-hub.tsx apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.tsx apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.integration.test.tsx apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx
git commit -m "feat(web): move author hub onto reusable cards"
```

### Task 3: Add failing quick-action and hotkey parity tests

**Files:**
- Create: `apps/web/src/tests/features/methodologies/version-workspace-author-hub.test.tsx`
- Modify if needed: `apps/web/src/tests/features/methodologies/commands.test.ts`
- Test command target: new author-hub test file and commands test file

**Step 1: Write the failing tests**

Add tests that prove:

- clicking `Open`/`Add` actions triggers the correct route/intention handler
- visible shortcut hints match the existing command model
- shell-level hotkeys invoke the same action as the visible controls
- blocked actions remain visible and disabled with rationale instead of disappearing

At minimum, cover:

- `g w` -> open work units page
- `c w` -> add work unit action
- `g f` / `c f`
- `g a` / `c a`
- `g l` / `c l`

If existing command tests need updating, assert that the workspace-author-hub hints use the same strings already defined in `apps/web/src/features/methodologies/commands.ts`.

**Step 2: Run tests to verify they fail**

Run:

```bash
bun run --cwd apps/web test -- 'src/tests/features/methodologies/version-workspace-author-hub.test.tsx' 'src/tests/features/methodologies/commands.test.ts'
```

Expected: FAIL because the author hub hotkey layer and parity wiring do not exist yet.

**Step 3: Write minimal implementation**

Implement a small, testable hotkey/action layer.

Recommended file shape:

- Create: `apps/web/src/features/methodologies/version-workspace-author-hub-actions.ts`
- Modify: `apps/web/src/features/methodologies/version-workspace-author-hub.tsx`
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.tsx`

Implementation rules:

- Reuse existing shortcut strings from `apps/web/src/features/methodologies/commands.ts`
- Use `@tanstack/react-hotkeys` at the shell level
- Do not create a second shortcut grammar
- Do not hide blocked actions; disable them and show rationale
- Do not fire hotkeys while a text input or textarea is actively editing

**Step 4: Run tests to verify they pass**

Run the same command and confirm PASS.

**Step 5: Commit**

```bash
git add apps/web/src/features/methodologies/version-workspace-author-hub-actions.ts apps/web/src/features/methodologies/version-workspace-author-hub.tsx apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.tsx apps/web/src/tests/features/methodologies/version-workspace-author-hub.test.tsx apps/web/src/tests/features/methodologies/commands.test.ts
git commit -m "feat(web): add workspace quick action hotkeys"
```

### Task 4: Replace the old top-level workspace tabs with the new two-tab model

**Files:**
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.tsx`
- Modify: `apps/web/src/features/methodologies/version-workspace.tsx`
- Test: route tests from Task 1 and feature tests from Task 2

**Step 1: Write the failing expectation**

Extend route coverage so the old top-level `Publish`, `Evidence`, and `Context` tabs are no longer rendered as separate peers. The route should only expose `Author` and `Review & Publish`.

**Step 2: Run tests to verify they fail**

Run the same targeted route tests and confirm failing expectations.

**Step 3: Write minimal implementation**

In `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.tsx`:

- replace the current search enum with the new top-level page states
- keep deterministic loading/blocked/failed precedence
- mount the new `Author` hub for the author state
- consolidate the current publish/evidence/context responsibilities under `Review & Publish`

In `apps/web/src/features/methodologies/version-workspace.tsx`:

- stop treating this top-layer route as the place for the full graph editor
- keep reusable draft/diagnostic helpers that the deeper pages still need

**Step 4: Run tests to verify they pass**

Run:

```bash
bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx' 'src/tests/features/methodologies/version-workspace-author-hub.test.tsx'
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.tsx apps/web/src/features/methodologies/version-workspace.tsx apps/web/src/features/methodologies/version-workspace-author-hub.tsx apps/web/src/features/methodologies/version-workspace-author-hub-actions.ts apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.integration.test.tsx apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx apps/web/src/tests/features/methodologies/version-workspace-author-hub.test.tsx
git commit -m "refactor(web): simplify version workspace top layer"
```

### Task 5: Verify integration and update Story 3.1 evidence

**Files:**
- Modify: `_bmad-output/implementation-artifacts/3-1-complete-design-time-ia-and-page-shell-baseline.md`
- Verify existing files changed in Tasks 1-3
- Verify reusable card changes from Tasks 1-2

**Step 1: Run targeted app tests**

```bash
bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx' 'src/tests/features/methodologies/version-workspace-author-hub.test.tsx' 'src/tests/features/methodologies/commands.test.ts' 'src/tests/features/methodologies/command-palette.integration.test.tsx'
```

Expected: PASS.

**Step 2: Run type checks**

```bash
bun run --cwd apps/web check-types
bun run check-types
```

Expected: PASS.

**Step 3: Run repository checks**

```bash
bun run check
```

Expected: PASS. If formatting fails, run `bunx oxfmt --write <changed-files>` and rerun.

**Step 4: Run end-to-end verification**

```bash
bunx playwright test tests/e2e/story-3-1-design-shell-navigation.spec.ts
```

Expected: PASS, or update the scenario so it verifies the new two-tab first-layer shell plus quick-action affordances.

**Step 5: Update artifact evidence**

Append a short addendum to the Story 3.1 artifact describing:

- the new two-tab first-layer workspace shell
- the reusable surface-card primitive and its approved visual contract
- the author-hub card composition
- hotkey parity with visible quick actions
- verification commands and outcomes

**Step 6: Commit**

```bash
git add _bmad-output/implementation-artifacts/3-1-complete-design-time-ia-and-page-shell-baseline.md
git commit -m "docs(story-3-1): record author hub redesign evidence"
```
