# Story 3.1 Review Remediation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Clear the Story 3.1 blocking review findings by restoring deterministic create flows, human-readable failure handling, route-valid selection behavior, and honest shell/command-palette affordances.

**Architecture:** Keep the existing Story 3.1 routes and shell primitives, but tighten the contracts around them. Fix command-palette parity through explicit route intent wiring, make route pages honor those intents, harden the Work Units L1 create path so hidden draft state cannot silently break it, and ensure L2/detail routes validate selected identity instead of rendering optimistic shells for arbitrary URL keys. Resolve the remaining Work Units L1 spec drift last, after confirming the canonical authority document.

**Tech Stack:** React, TanStack Router, TanStack Query, ORPC, Zod, Effect, Vitest, Testing Library, Bun

---

### Recommended Approach

1. **Surgical remediation (recommended)**
   - Keep the current Story 3.1 route structure.
   - Fix parity, error handling, and hidden payload normalization in place.
   - Reconcile the Work Units L1 tab drift only after reading the canonical authority docs.

2. **Contract surgery**
   - Introduce a narrower dedicated server-side Work Unit create contract so the UI never resubmits unrelated draft state.
   - Stronger long-term boundary, but larger API/service change.

3. **Scope trim**
   - Remove unsupported affordances and reduce command-palette scope until the rest is implemented.
   - Fastest, but least aligned with Story 3.1 and likely to require story re-scoping.

This plan assumes **Approach 1** first. If Task 3 still reveals unacceptable hidden coupling after the focused fix, switch only that task to Approach 2.

### Task 1: Restore Command-Palette Create Intent Parity

**Files:**
- Modify: `apps/web/src/features/methodologies/command-palette.tsx`
- Modify: `apps/web/src/tests/features/methodologies/command-palette.integration.test.tsx`

**Step 1: Write the failing test**

Extend `apps/web/src/tests/features/methodologies/command-palette.integration.test.tsx` so the methodology-context create actions prove route parity instead of weak destination-only navigation:

```ts
it("routes Add Work Unit with intent parity", async () => {
  // open palette in methodology context
  // trigger Add Work Unit
  // expect navigate called with search: { intent: "add-work-unit" }
});

it("routes Add Agent and Add Link Type with create intents", async () => {
  // trigger Add Agent and Add Link Type
  // expect add-agent / add-link-type intents in navigation
});
```

**Step 2: Run test to verify it fails**

Run: `bun run --cwd apps/web test -- 'src/tests/features/methodologies/command-palette.integration.test.tsx'`

Expected: FAIL because the current tests and implementation only assert destination-page navigation.

**Step 3: Write minimal implementation**

Update `apps/web/src/features/methodologies/command-palette.tsx` so these create actions navigate with deterministic search intents:
- `Add Fact` -> `intent=add-fact`
- `Add Work Unit` -> `intent=add-work-unit`
- `Add Agent` -> `intent=add-agent`
- `Add Link Type` -> `intent=add-link-type`

Keep the route destination the same. Do not redesign the palette UI.

**Step 4: Run test to verify it passes**

Run: `bun run --cwd apps/web test -- 'src/tests/features/methodologies/command-palette.integration.test.tsx'`

Expected: PASS with create-command parity assertions green.

**Step 5: Commit**

```bash
git add "apps/web/src/features/methodologies/command-palette.tsx" "apps/web/src/tests/features/methodologies/command-palette.integration.test.tsx"
git commit -m "fix(web): restore Story 3.1 create intent parity"
```

### Task 2: Make Agents And Dependency Definitions Honor Create Intents

**Files:**
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.agents.tsx`
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.dependency-definitions.tsx`
- Modify: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx`

**Step 1: Write the failing test**

Add route-level tests that prove intent-driven create parity:

```ts
it("opens the Agents create dialog from search intent", async () => {
  // render with search intent=add-agent
  // expect dialog content visible
  // close dialog
  // expect search intent cleared
});

it("opens the Dependency Definitions create dialog from search intent", async () => {
  // render with search intent=add-link-type
  // expect dialog content visible
});
```

**Step 2: Run test to verify it fails**

Run: `bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx'`

Expected: FAIL because the routes currently render only banner copy for those intents.

**Step 3: Write minimal implementation**

Update both route files to:
- derive dialog open state from `search.intent`
- preserve the existing visible button flows
- clear the search intent on cancel/success
- avoid duplicate dialog state between button-driven and intent-driven open paths

Do not add new page structure or tabs.

**Step 4: Run test to verify it passes**

Run: `bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx'`

Expected: PASS with create-intent parity verified for both routes.

**Step 5: Commit**

```bash
git add "apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.agents.tsx" "apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.dependency-definitions.tsx" "apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx"
git commit -m "fix(web): honor route create intents for L1 shells"
```

### Task 3: Make The Work Units L1 Create Flow Self-Sufficient

**Files:**
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.tsx`
- Modify: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx`

**Step 1: Write the failing test**

Extend `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx` with a regression for hidden draft-agent state:

```ts
it("normalizes existing agent persona data before work-unit create", async () => {
  // seed route query data with an agent whose persona is ""
  // open + Add Work Unit
  // enter a new key
  // submit
  // expect the mutation payload agent persona to be coerced to a valid default
});
```

Add a second assertion proving the route also honors `intent=add-work-unit` if Task 1 already wires it.

**Step 2: Run test to verify it fails**

Run: `bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx'`

Expected: FAIL because the current route passes through blank persona strings and only opens from the button path.

**Step 3: Write minimal implementation**

Update `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.tsx` to:
- derive create-dialog open state from both button click and `search.intent=add-work-unit`
- extract a small helper that normalizes existing `agentTypes` before submit
- treat `""` / whitespace-only `persona` as invalid input and coerce it to a deterministic fallback (for example `"draft"`)
- keep the L1 modal minimal (`Work Unit Key` only) unless the authority docs explicitly require more fields

If the focused normalization still leaves hidden cross-draft failures, stop and switch this task to a dedicated contract change instead of piling on more frontend patches.

**Step 4: Run test to verify it passes**

Run: `bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx'`

Expected: PASS with the blank-persona regression and create-intent coverage green.

**Step 5: Commit**

```bash
git add "apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.tsx" "apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx"
git commit -m "fix(web): harden L1 work-unit create payloads"
```

### Task 4: Surface Human-Readable Work Units L1 Create Failures

**Files:**
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.tsx`
- Modify: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx`

**Step 1: Write the failing test**

Add a mutation-failure test:

```ts
it("shows a human-readable error when work-unit create fails", async () => {
  // make workUnit.create reject with BAD_REQUEST
  // submit the dialog
  // expect the dialog to stay open
  // expect visible failed-state copy explaining what happened and that current scope is preserved
});
```

If the route already uses `toast` elsewhere in this package, also assert `toast.error` is called. Do not require toast alone; keep inline copy too.

**Step 2: Run test to verify it fails**

Run: `bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx'`

Expected: FAIL because the route currently has no mutation failure UI and no `try/catch` around `mutateAsync`.

**Step 3: Write minimal implementation**

Update `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.tsx` to:
- wrap `mutateAsync` in `try/catch`
- keep the dialog open on server failure
- show human-readable inline error copy in the dialog
- optionally call `toast.error(...)` if the route already uses the shared Sonner pattern safely
- clear the mutation error when the user edits the field or retries

Use operator-first wording: what happened, what is safe, and what to do next.

**Step 4: Run test to verify it passes**

Run: `bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx'`

Expected: PASS with visible failure handling covered.

**Step 5: Commit**

```bash
git add "apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.tsx" "apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx"
git commit -m "fix(web): surface work-unit create failures"
```

### Task 5: Validate Work Unit L2 Route Identity Deterministically

**Files:**
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx`
- Modify: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx`

**Step 1: Write the failing test**

Add L2 route identity coverage:

```ts
it("renders a failed or not-found shell for an unknown workUnitKey", async () => {
  // render route with params.workUnitKey that is missing from the current version projection
  // expect no success shell
  // expect explicit preserved-context failure copy
});
```

Add a second assertion proving a known key still renders the L2 shell.

**Step 2: Run test to verify it fails**

Run: `bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx'`

Expected: FAIL because the route currently renders a success shell for arbitrary keys.

**Step 3: Write minimal implementation**

Update `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx` to:
- fetch or derive the current work-unit list for the version
- validate `workUnitKey` against that list before rendering the success shell
- preserve the current methodology/version context in the failure UI
- keep the existing L2 tab shell once the key is valid

**Step 4: Run test to verify it passes**

Run: `bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx'`

Expected: PASS with both invalid-key and valid-key behavior covered.

**Step 5: Commit**

```bash
git add "apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx" "apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx"
git commit -m "fix(web): validate L2 work-unit route identity"
```

### Task 6: Replace The Dead `Open Relationship View` Control With Real Behavior

**Files:**
- Modify: `apps/web/src/features/methodologies/work-units-right-rail.tsx`
- Modify: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx`

**Step 1: Write the failing test**

Add a right-rail action test:

```ts
it("navigates Open Relationship View into a deterministic graph-focused state", async () => {
  // render with a selected work unit while list view is active
  // click Open Relationship View
  // expect search state updated to graph + selected work unit
});
```

**Step 2: Run test to verify it fails**

Run: `bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx'`

Expected: FAIL because the current control is an inert button.

**Step 3: Write minimal implementation**

Update `apps/web/src/features/methodologies/work-units-right-rail.tsx` so `Open Relationship View` performs a deterministic navigation action instead of doing nothing. Recommended behavior:
- force `view=graph`
- preserve `selected=<activeWorkUnitKey>`
- optionally move focus to the graph region if a stable region ref already exists

Do not invent a new L2 route or unsupported tab for this fix.

**Step 4: Run test to verify it passes**

Run: `bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx'`

Expected: PASS with the right-rail relationship action now doing something real and testable.

**Step 5: Commit**

```bash
git add "apps/web/src/features/methodologies/work-units-right-rail.tsx" "apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx"
git commit -m "fix(web): wire work-unit relationship view action"
```

### Task 7: Make Project Context In The Command Palette Honest

**Files:**
- Modify: `apps/web/src/features/methodologies/commands.ts`
- Modify: `apps/web/src/features/methodologies/command-palette.tsx`
- Modify: `apps/web/src/components/app-shell.tsx`
- Modify: `apps/web/src/tests/features/methodologies/command-palette.integration.test.tsx`

**Step 1: Write the failing test**

Choose one of these explicit behaviors and codify it in tests before editing code:

```ts
it("shows real project-scoped commands when project context exists", async () => {
  // preferred path
});

// OR

it("does not advertise project context when no project-scoped commands exist", async () => {
  // honesty-first fallback
});
```

**Step 2: Run test to verify it fails**

Run: `bun run --cwd apps/web test -- 'src/tests/features/methodologies/command-palette.integration.test.tsx'`

Expected: FAIL because project context is currently header-only cosmetics.

**Step 3: Write minimal implementation**

Preferred fix:
- add at least one real project-scoped command group to `apps/web/src/features/methodologies/commands.ts`
- make `apps/web/src/features/methodologies/command-palette.tsx` execute those commands only when project context is present

Fallback fix if no real project commands are ready:
- stop advertising `Project` as an active context in `apps/web/src/components/app-shell.tsx` / palette UI until the command model exists

Choose one path and keep the UX honest.

**Step 4: Run test to verify it passes**

Run: `bun run --cwd apps/web test -- 'src/tests/features/methodologies/command-palette.integration.test.tsx'`

Expected: PASS with project-context behavior now either functional or explicitly unavailable.

**Step 5: Commit**

```bash
git add "apps/web/src/features/methodologies/commands.ts" "apps/web/src/features/methodologies/command-palette.tsx" "apps/web/src/components/app-shell.tsx" "apps/web/src/tests/features/methodologies/command-palette.integration.test.tsx"
git commit -m "fix(web): make project command context honest"
```

### Task 8: Reconcile The Work Units L1 Authority Drift And Update The Story

**Files:**
- Read: `docs/architecture/epic-3-authority.md`
- Read: `docs/architecture/methodology-pages/work-units/overview.md`
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.tsx`
- Modify: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx`
- Modify: `_bmad-output/implementation-artifacts/3-1-complete-design-time-ia-and-page-shell-baseline.md`

**Step 1: Write the failing checklist**

Record the current mismatch before editing anything:
- story says `Graph` / `Contracts` / `Diagnostics`
- implementation says `Graph` / `List`
- tests currently assert `Contracts` / `Diagnostics` are absent

**Step 2: Confirm authority**

Read the authority docs and decide which surface is canonical.

Expected result: one of these is true, not both:
- the code/tests must be brought back to `Graph` / `Contracts` / `Diagnostics`, or
- the story artifact must be corrected because `Graph` / `List` became the approved contract elsewhere

**Step 3: Write minimal implementation/documentation changes**

If the authority docs still require `Contracts` / `Diagnostics`:
- restore those locked tabs in `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.tsx`
- update the route test file accordingly

If the authority docs now bless `Graph` / `List`:
- update `_bmad-output/implementation-artifacts/3-1-complete-design-time-ia-and-page-shell-baseline.md`
- remove the stale expectation from the review note after verifying no other canonical doc disagrees

Do not guess. Let the authority docs decide.

**Step 4: Run verification to prove the drift is resolved**

Run: `bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx'`

Expected: PASS with tests aligned to the final authoritative contract.

**Step 5: Commit**

```bash
git add "apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.tsx" "apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx" "_bmad-output/implementation-artifacts/3-1-complete-design-time-ia-and-page-shell-baseline.md"
git commit -m "fix(story-3.1): reconcile work-unit shell authority drift"
```

### Task 9: Re-Run Story 3.1 Verification And Refresh The Review Artifact

**Files:**
- Modify: `_bmad-output/implementation-artifacts/3-1-complete-design-time-ia-and-page-shell-baseline.md`
- Modify: `_bmad-output/implementation-artifacts/sprint-status.yaml`

**Step 1: Write the completion checklist**

Check all of these before changing story status:
- command-palette create actions open equivalent route flows
- agents and dependency definitions honor create intents
- work-unit create is deterministic and has visible failure handling
- invalid work-unit L2 routes no longer render false success
- `Open Relationship View` is no longer dead
- project command context is honest
- Work Units tab contract matches the authority doc

**Step 2: Run verification**

Run:

```bash
bun run --cwd apps/web test -- 'src/tests/features/methodologies/command-palette.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx' 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx' && bun run --cwd apps/web check-types && bun run check
```

Expected: PASS with the Story 3.1 review regressions covered.

**Step 3: Update story metadata**

If verification passes and all blocking review findings are resolved:
- move `_bmad-output/implementation-artifacts/3-1-complete-design-time-ia-and-page-shell-baseline.md` back to `Status: review`
- append a remediation note under `Senior Developer Review (AI)` or add a follow-up pass section
- update `_bmad-output/implementation-artifacts/sprint-status.yaml` from `in-progress` to `review`

**Step 4: Run a final smoke check**

Run: `git diff -- _bmad-output/implementation-artifacts/3-1-complete-design-time-ia-and-page-shell-baseline.md _bmad-output/implementation-artifacts/sprint-status.yaml apps/web/src/features/methodologies apps/web/src/routes packages/api/src/routers/methodology.ts`

Expected: only the intended Story 3.1 remediation files are present.

**Step 5: Commit**

```bash
git add "_bmad-output/implementation-artifacts/3-1-complete-design-time-ia-and-page-shell-baseline.md" "_bmad-output/implementation-artifacts/sprint-status.yaml" "apps/web/src/features/methodologies" "apps/web/src/routes"
git commit -m "fix(story-3.1): resolve review remediation findings"
```
