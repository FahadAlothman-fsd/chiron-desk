# Story 2.3 Scrollable Workspace and Diagnostics UX Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver a hybrid scroll layout and operator-friendly diagnostics UX for Story 2.3 while preserving deterministic publish/evidence behavior and Epic 2 runtime deferment rules.

**Architecture:** Keep route orchestration in the version route and presentation logic in `version-workspace.tsx`. Add explicit diagnostics presentation helpers (severity, title/body mapping, filters) in the workspace layer, and keep deep-link focus integration with `version-workspace-graph.tsx`. Maintain current contracts and deterministic ordering semantics.

**Tech Stack:** React 19, TanStack Query v5, TanStack Router, TypeScript, shadcn/Radix patterns, Vitest + Testing Library.

---

### Task 1: Add failing tests for hybrid scroll layout and diagnostics presentation

**Files:**
- Modify: `apps/web/src/features/methodologies/version-workspace.integration.test.tsx`
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.integration.test.tsx`

**Step 1: Write the failing test (workspace diagnostics UX)**

```tsx
it("renders diagnostics as operator cards with severity and action copy", async () => {
  render(<MethodologyVersionWorkspace ... />);
  expect(screen.getByText("Blocking")).toBeInTheDocument();
  expect(screen.getByText("Why this matters")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Go to field/i })).toBeInTheDocument();
});
```

**Step 2: Write the failing test (route panel containment)**

```tsx
it("uses desktop split-panel containment for diagnostics/publish/evidence", async () => {
  renderRoute(context);
  expect(screen.getByTestId("workspace-main-scroll")).toBeInTheDocument();
  expect(screen.getByTestId("workspace-rail-scroll")).toBeInTheDocument();
});
```

**Step 3: Run tests to verify fail**

Run: `bun run test -- 'src/features/methodologies/version-workspace.integration.test.tsx'`
Expected: FAIL with missing diagnostics card/severity UI.

Run: `bun run test -- 'src/routes/methodologies.$methodologyId.versions.$versionId.integration.test.tsx'`
Expected: FAIL with missing split-panel test ids/containers.

**Step 4: Commit test-only red state**

```bash
git add "apps/web/src/features/methodologies/version-workspace.integration.test.tsx" "apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.integration.test.tsx"
git commit -m "test(methodologies): add failing coverage for workspace scroll and diagnostics UX"
```

### Task 2: Implement desktop split-panel and mobile fallback scroll behavior

**Files:**
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.tsx`
- Modify: `apps/web/src/features/methodologies/version-workspace.tsx`

**Step 1: Add route-level responsive container structure**

```tsx
<section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem] lg:h-[calc(100vh-12rem)]">
  <div data-testid="workspace-main-scroll" className="min-h-0 overflow-y-auto">
    <MethodologyVersionWorkspace ... />
  </div>
  <aside data-testid="workspace-rail-scroll" className="min-h-0 overflow-y-auto lg:sticky lg:top-4">
    {/* diagnostics summary, publish, evidence */}
  </aside>
</section>
```

**Step 2: Add mobile fallback behavior**

```tsx
<section className="space-y-4 lg:space-y-0">
  {/* keep natural page flow below lg; split only at lg+ */}
</section>
```

**Step 3: Add diagnostics internal max-height containment**

```tsx
<div className="max-h-80 overflow-y-auto pr-1" data-testid="diagnostics-scroll-list">
  {renderedDiagnostics}
</div>
```

**Step 4: Run tests and verify pass**

Run: `bun run test -- 'src/routes/methodologies.$methodologyId.versions.$versionId.integration.test.tsx'`
Expected: PASS.

**Step 5: Commit layout behavior**

```bash
git add "apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.tsx" "apps/web/src/features/methodologies/version-workspace.tsx"
git commit -m "feat(methodologies): add hybrid scroll containment for workspace and utility rail"
```

### Task 3: Implement diagnostics cards, severity semantics, and filters

**Files:**
- Modify: `apps/web/src/features/methodologies/version-workspace.tsx`
- Modify: `apps/web/src/features/methodologies/version-workspace.persistence.test.ts`

**Step 1: Add diagnostics presentation mapper and severity model**

```ts
type DiagnosticSeverity = "blocking" | "warning";

function toSeverity(diagnostic: WorkspaceParseDiagnostic): DiagnosticSeverity {
  return diagnostic.blocking === false ? "warning" : "blocking";
}

function toOperatorTitle(diagnostic: WorkspaceParseDiagnostic): string {
  // map known codes to friendly titles, fallback generic
}
```

**Step 2: Render operator card UI instead of raw lines**

```tsx
<article className="rounded-md border bg-card p-3">
  <div className="flex items-center gap-2">
    <Badge>{severityLabel}</Badge>
    <p className="font-medium">{title}</p>
  </div>
  <p className="text-sm text-muted-foreground">Why this matters: {reason}</p>
  <p className="text-sm">How to fix: {remediation}</p>
  <Button size="sm" variant="outline" onClick={...}>Go to field</Button>
</article>
```

**Step 3: Add filters and summary strip**

```tsx
<div className="flex items-center gap-2">
  <Button>All</Button>
  <Button>Blocking</Button>
  <Button>Warnings</Button>
  <Input aria-label="Filter diagnostics" />
</div>
<p>{total} issues: {blocking} blocking, {warnings} warnings</p>
```

**Step 4: Add deterministic unit tests for severity/filter behavior**

```ts
test("diagnostic filtering keeps deterministic order within selected severity", () => {
  const result = filterDiagnostics(input, { severity: "warning", query: "workflow" });
  assert.deepStrictEqual(result.map((d) => d.message), [
    "...expected deterministic warning message...",
  ]);
});
```

**Step 5: Run tests and verify pass**

Run: `bun test 'src/features/methodologies/version-workspace.persistence.test.ts'`
Expected: PASS.

Run: `bun run test -- 'src/features/methodologies/version-workspace.integration.test.tsx'`
Expected: PASS.

**Step 6: Commit diagnostics UX**

```bash
git add "apps/web/src/features/methodologies/version-workspace.tsx" "apps/web/src/features/methodologies/version-workspace.persistence.test.ts" "apps/web/src/features/methodologies/version-workspace.integration.test.tsx"
git commit -m "feat(methodologies): redesign diagnostics as operator-focused triage cards"
```

### Task 4: Validate end-to-end behavior and update docs

**Files:**
- Modify: `_bmad-output/implementation-artifacts/2-3-deliver-validation-publish-and-evidence-ux-for-methodology-contracts.md`
- Modify: `docs/plans/2026-03-01-story-2-3-scrollable-workspace-and-diagnostics-ux-design.md`

**Step 1: Run route + workspace + type validation checks**

Run: `bun run test -- 'src/routes/methodologies.$methodologyId.versions.$versionId.integration.test.tsx'`
Expected: PASS.

Run: `bun run test -- 'src/features/methodologies/version-workspace.integration.test.tsx'`
Expected: PASS.

Run: `bun test 'src/features/methodologies/version-workspace.persistence.test.ts'`
Expected: PASS.

Run: `bun run check-types`
Expected: PASS (`tsc --noEmit`).

**Step 2: Run Playwright verification flow**

Run manual E2E with local servers on `:3001` and `:3000`:

- login as seeded operator,
- open BMAD versions,
- open draft workspace,
- verify runtime control disabled + rationale,
- verify diagnostics panel is internally scrollable,
- verify publish/evidence remain usable.

**Step 3: Update story artifact record and references**

```md
- Add file list entries for updated workspace route/features/tests.
- Add note confirming hybrid scroll + diagnostics card UX completion.
```

**Step 4: Commit verification + docs sync**

```bash
git add "_bmad-output/implementation-artifacts/2-3-deliver-validation-publish-and-evidence-ux-for-methodology-contracts.md" "docs/plans/2026-03-01-story-2-3-scrollable-workspace-and-diagnostics-ux-design.md"
git commit -m "docs(story-2.3): record scrollable workspace and diagnostics UX refinement"
```

## Notes for Execution

- Preserve deterministic diagnostics order before and after filtering.
- Do not remove technical diagnostic metadata; demote it visually.
- Keep exact runtime deferment copy unchanged.
- Keep publish/evidence behavior from Story 2.3 functional while improving presentation.
