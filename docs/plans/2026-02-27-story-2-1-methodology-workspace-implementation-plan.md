# Story 2.1 Methodology Workspace Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the Story 2.1 methodology workspace UI so operators can author draft contracts, validate deterministically, and publish immutable versions with evidence while runtime execution remains blocked in Epic 2.

**Architecture:** Add a graph-first route in `apps/web` with React Flow as the central interaction surface, inspector-driven editors on the right, and diagnostics/evidence surfaces wired to existing ORPC/TanStack Query integrations. Reuse `orpc` + `queryClient` and existing API routers (`updateDraftLifecycle`, `updateDraftWorkflows`, `validateDraftVersion`, `publishDraftVersion`) without introducing new transport layers.

**Tech Stack:** React 19, TanStack Router, TanStack Query v5, `@xyflow/react`, TypeScript strict, ORPC client utilities in `apps/web/src/utils/orpc.ts`.

---

### Task 1: Create route shell and static layout scaffolding

**Files:**
- Create: `apps/web/src/routes/methodology.tsx`
- Create: `apps/web/src/components/methodology/methodology-workspace-shell.tsx`
- Create: `apps/web/src/components/methodology/draft-non-executable-banner.tsx`
- Modify: `apps/web/src/routes/dashboard.tsx`
- Test: `apps/web/src/components/methodology/methodology-workspace-shell.test.tsx`

**Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react"
import { MethodologyWorkspaceShell } from "./methodology-workspace-shell"

it("renders non-executable draft banner", () => {
  render(<MethodologyWorkspaceShell />)
  expect(screen.getByText(/runtime execution unlocks in epic 3\+/i)).toBeInTheDocument()
})
```

**Step 2: Run test to verify it fails**

Run: `bun --filter @chiron/web test apps/web/src/components/methodology/methodology-workspace-shell.test.tsx`
Expected: FAIL because `MethodologyWorkspaceShell` does not exist yet.

**Step 3: Write minimal implementation**

```tsx
export function MethodologyWorkspaceShell() {
  return (
    <section>
      <h1>Methodology Workspace</h1>
      <p>Draft authoring only. Runtime execution unlocks in Epic 3+.</p>
    </section>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `bun --filter @chiron/web test apps/web/src/components/methodology/methodology-workspace-shell.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src/routes/methodology.tsx apps/web/src/components/methodology/methodology-workspace-shell.tsx apps/web/src/components/methodology/draft-non-executable-banner.tsx apps/web/src/routes/dashboard.tsx apps/web/src/components/methodology/methodology-workspace-shell.test.tsx
git commit -m "feat(web): scaffold methodology workspace route and non-executable draft shell"
```

### Task 2: Add React Flow canvas and transition selection state

**Files:**
- Create: `apps/web/src/components/methodology/methodology-graph-canvas.tsx`
- Create: `apps/web/src/components/methodology/work-unit-node.tsx`
- Create: `apps/web/src/components/methodology/transition-edge.tsx`
- Modify: `apps/web/src/components/methodology/methodology-workspace-shell.tsx`
- Test: `apps/web/src/components/methodology/methodology-graph-canvas.test.tsx`

**Step 1: Write the failing test**

```tsx
it("calls onSelectTransition when an edge is selected", async () => {
  // render canvas with one edge and simulate selection
  // expect callback called with transition id
})
```

**Step 2: Run test to verify it fails**

Run: `bun --filter @chiron/web test apps/web/src/components/methodology/methodology-graph-canvas.test.tsx`
Expected: FAIL because graph component and callback wiring are missing.

**Step 3: Write minimal implementation**

```tsx
const [nodes, onNodesChange] = useNodesState(initialNodes)
const [edges, onEdgesChange] = useEdgesState(initialEdges)

<ReactFlow
  nodes={nodes}
  edges={edges}
  onNodesChange={onNodesChange}
  onEdgesChange={onEdgesChange}
  onEdgeClick={(_, edge) => onSelectTransition(edge.id)}
/>
```

**Step 4: Run test to verify it passes**

Run: `bun --filter @chiron/web test apps/web/src/components/methodology/methodology-graph-canvas.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src/components/methodology/methodology-graph-canvas.tsx apps/web/src/components/methodology/work-unit-node.tsx apps/web/src/components/methodology/transition-edge.tsx apps/web/src/components/methodology/methodology-workspace-shell.tsx apps/web/src/components/methodology/methodology-graph-canvas.test.tsx
git commit -m "feat(web): add controlled React Flow canvas for methodology transitions"
```

### Task 3: Build inspector panels and binding visibility semantics

**Files:**
- Create: `apps/web/src/components/methodology/methodology-inspector-panel.tsx`
- Create: `apps/web/src/components/methodology/workflow-binding-matrix-panel.tsx`
- Create: `apps/web/src/components/methodology/transition-rule-editor-panel.tsx`
- Modify: `apps/web/src/components/methodology/methodology-workspace-shell.tsx`
- Test: `apps/web/src/components/methodology/workflow-binding-matrix-panel.test.tsx`

**Step 1: Write the failing test**

```tsx
it("shows unbound workflows as catalog-visible but non-executable", () => {
  // render panel with bound + unbound workflows for selected transition
  // assert unbound item has non-executable badge/state text
})
```

**Step 2: Run test to verify it fails**

Run: `bun --filter @chiron/web test apps/web/src/components/methodology/workflow-binding-matrix-panel.test.tsx`
Expected: FAIL due missing panel behavior.

**Step 3: Write minimal implementation**

```tsx
const isBound = boundWorkflowIds.includes(workflow.key)
const status = isBound ? "executable for transition" : "catalog only (not executable)"
```

**Step 4: Run test to verify it passes**

Run: `bun --filter @chiron/web test apps/web/src/components/methodology/workflow-binding-matrix-panel.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src/components/methodology/methodology-inspector-panel.tsx apps/web/src/components/methodology/workflow-binding-matrix-panel.tsx apps/web/src/components/methodology/transition-rule-editor-panel.tsx apps/web/src/components/methodology/methodology-workspace-shell.tsx apps/web/src/components/methodology/workflow-binding-matrix-panel.test.tsx
git commit -m "feat(web): implement transition inspector and workflow binding matrix semantics"
```

### Task 4: Add fact schema editor with Facts v1 constraints

**Files:**
- Create: `apps/web/src/components/methodology/fact-schema-editor.tsx`
- Create: `apps/web/src/lib/fact-schema-validation.ts`
- Modify: `apps/web/src/components/methodology/methodology-inspector-panel.tsx`
- Test: `apps/web/src/lib/fact-schema-validation.test.ts`
- Test: `apps/web/src/components/methodology/fact-schema-editor.test.tsx`

**Step 1: Write the failing tests**

```ts
it("rejects duplicate fact keys", () => {
  const result = validateFactSchema([...])
  expect(result.blocking).toBe(true)
})

it("rejects unsupported fact types", () => {
  const result = validateFactSchema([...])
  expect(result.diagnostics[0].code).toContain("FACT_TYPE_INVALID")
})
```

**Step 2: Run tests to verify they fail**

Run: `bun --filter @chiron/web test apps/web/src/lib/fact-schema-validation.test.ts apps/web/src/components/methodology/fact-schema-editor.test.tsx`
Expected: FAIL because validator/editor do not exist.

**Step 3: Write minimal implementation**

```ts
const ALLOWED_TYPES = new Set(["string", "number", "boolean", "json"])
// validate non-empty unique keys, allowed types, and default compatibility
```

**Step 4: Run tests to verify they pass**

Run: `bun --filter @chiron/web test apps/web/src/lib/fact-schema-validation.test.ts apps/web/src/components/methodology/fact-schema-editor.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src/components/methodology/fact-schema-editor.tsx apps/web/src/lib/fact-schema-validation.ts apps/web/src/components/methodology/methodology-inspector-panel.tsx apps/web/src/lib/fact-schema-validation.test.ts apps/web/src/components/methodology/fact-schema-editor.test.tsx
git commit -m "feat(web): enforce Facts v1 constraints in methodology fact schema editor"
```

### Task 5: Wire ORPC query/mutation layer for draft edit/validate/publish

**Files:**
- Create: `apps/web/src/lib/methodology-queries.ts`
- Modify: `apps/web/src/components/methodology/methodology-workspace-shell.tsx`
- Modify: `apps/web/src/utils/orpc.ts`
- Test: `apps/web/src/lib/methodology-queries.test.ts`

**Step 1: Write the failing test**

```ts
it("invalidates methodology draft queries after updateDraftWorkflows mutation settles", async () => {
  // mock queryClient.invalidateQueries and assert called with methodology draft key
})
```

**Step 2: Run test to verify it fails**

Run: `bun --filter @chiron/web test apps/web/src/lib/methodology-queries.test.ts`
Expected: FAIL due missing query helpers/mutation wrappers.

**Step 3: Write minimal implementation**

```ts
export function useUpdateDraftWorkflows() {
  return useMutation({
    mutationFn: (input) => orpc.methodology.updateDraftWorkflows.mutate(input),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["methodology-draft"] })
    },
  })
}
```

**Step 4: Run test to verify it passes**

Run: `bun --filter @chiron/web test apps/web/src/lib/methodology-queries.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src/lib/methodology-queries.ts apps/web/src/components/methodology/methodology-workspace-shell.tsx apps/web/src/utils/orpc.ts apps/web/src/lib/methodology-queries.test.ts
git commit -m "feat(web): wire methodology draft edit and publish mutations with deterministic query invalidation"
```

### Task 6: Build validation and diagnostics surfaces with publish gating

**Files:**
- Create: `apps/web/src/components/methodology/methodology-validation-panel.tsx`
- Create: `apps/web/src/components/methodology/diagnostics-drawer.tsx`
- Create: `apps/web/src/components/methodology/publish-share-panel.tsx`
- Modify: `apps/web/src/components/methodology/methodology-workspace-shell.tsx`
- Test: `apps/web/src/components/methodology/methodology-validation-panel.test.tsx`
- Test: `apps/web/src/components/methodology/publish-share-panel.test.tsx`

**Step 1: Write the failing tests**

```tsx
it("disables publish action when blocking diagnostics exist", () => {
  // expect publish button disabled
})

it("renders immutable version and evidence summary after publish success", () => {
  // expect version + evidence refs on screen
})
```

**Step 2: Run tests to verify they fail**

Run: `bun --filter @chiron/web test apps/web/src/components/methodology/methodology-validation-panel.test.tsx apps/web/src/components/methodology/publish-share-panel.test.tsx`
Expected: FAIL because components and gate logic are missing.

**Step 3: Write minimal implementation**

```tsx
const publishBlocked = diagnostics.some((d) => d.blocking)
<button disabled={publishBlocked}>Publish Draft</button>
```

**Step 4: Run tests to verify they pass**

Run: `bun --filter @chiron/web test apps/web/src/components/methodology/methodology-validation-panel.test.tsx apps/web/src/components/methodology/publish-share-panel.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src/components/methodology/methodology-validation-panel.tsx apps/web/src/components/methodology/diagnostics-drawer.tsx apps/web/src/components/methodology/publish-share-panel.tsx apps/web/src/components/methodology/methodology-workspace-shell.tsx apps/web/src/components/methodology/methodology-validation-panel.test.tsx apps/web/src/components/methodology/publish-share-panel.test.tsx
git commit -m "feat(web): add validation diagnostics and publish gating with evidence results"
```

### Task 7: Add keyboard shortcuts and command parity

**Files:**
- Create: `apps/web/src/lib/use-methodology-hotkeys.ts`
- Modify: `apps/web/src/components/methodology/methodology-workspace-shell.tsx`
- Test: `apps/web/src/lib/use-methodology-hotkeys.test.tsx`

**Step 1: Write the failing test**

```tsx
it("triggers save on Ctrl/Cmd+S and validate on Ctrl/Cmd+Enter", async () => {
  // dispatch keyboard events and assert callbacks invoked
})
```

**Step 2: Run test to verify it fails**

Run: `bun --filter @chiron/web test apps/web/src/lib/use-methodology-hotkeys.test.tsx`
Expected: FAIL because hook is missing.

**Step 3: Write minimal implementation**

```ts
// map Ctrl/Cmd+S => onSave
// map Ctrl/Cmd+Enter => onValidate
// map / => focus catalog search
// map D => toggle diagnostics drawer
```

**Step 4: Run test to verify it passes**

Run: `bun --filter @chiron/web test apps/web/src/lib/use-methodology-hotkeys.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src/lib/use-methodology-hotkeys.ts apps/web/src/components/methodology/methodology-workspace-shell.tsx apps/web/src/lib/use-methodology-hotkeys.test.tsx
git commit -m "feat(web): add methodology workspace keyboard shortcuts with visible-command parity"
```

### Task 8: End-to-end integration checks and quality gates

**Files:**
- Modify: `apps/web/src/routes/methodology.tsx`
- Modify: `apps/web/src/routes/dashboard.tsx`
- Test: `apps/web/src/routes/methodology.integration.test.tsx`
- Modify (if needed): `docs/plans/2026-02-27-methodology-workspace-design.md`

**Step 1: Write the failing integration test**

```tsx
it("supports edit -> validate -> publish flow with deterministic refresh", async () => {
  // mock ORPC handlers and assert state transitions + publish evidence rendering
})
```

**Step 2: Run test to verify it fails**

Run: `bun --filter @chiron/web test apps/web/src/routes/methodology.integration.test.tsx`
Expected: FAIL because complete flow wiring not finalized.

**Step 3: Write minimal integration glue**

```tsx
// ensure route composes shell + query hooks + diagnostics + publish flow
```

**Step 4: Run all checks**

Run: `bun check && bun check-types && bun run test`
Expected: PASS across lint/type/tests.

**Step 5: Commit**

```bash
git add apps/web/src/routes/methodology.tsx apps/web/src/routes/dashboard.tsx apps/web/src/routes/methodology.integration.test.tsx docs/plans/2026-02-27-methodology-workspace-design.md
git commit -m "feat(web): deliver story 2.1 methodology workspace authoring and publish baseline"
```
