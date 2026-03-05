# Epic 2 Preview Setup Transition + Empty Facts + Populated Agents Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** In Epic 2 preview surfaces, show setup transition as eligible, keep project facts empty, and populate agents list deterministically.

**Architecture:** Keep `orpc.project.getProjectDetails` and the `baselinePreview` DTO unchanged. Seed deterministic `agentTypes` in the story seed definition extensions and add an EligibilityService fallback that derives transition/workflow eligibility from `version.definitionExtensions` only when normalized lifecycle rows are absent.

**Tech Stack:** TypeScript, Effect, Vitest, Bun, Drizzle (SQLite), oRPC.

---

### Task 1: Add failing engine test for seed-only eligibility fallback

**Files:**
- Modify: `packages/methodology-engine/src/eligibility-service.test.ts`

**Step 1: Write the failing test**

Add a new test that uses an empty `LifecycleRepository` (no normalized lifecycle rows) and expects eligibility to be derived from `version.definitionExtensions`.

```ts
it("falls back to definitionExtensions when lifecycle rows are missing", async () => {
  const definitionExtensions = {
    workUnitTypes: [
      {
        key: "WU.SETUP",
        lifecycleStates: [{ key: "done" }],
        lifecycleTransitions: [
          {
            transitionKey: "WU.SETUP:__absent____to__done",
            fromState: "__absent__",
            toState: "done",
            gateClass: "start_gate",
            requiredLinks: [],
          },
        ],
        factSchemas: [],
      },
    ],
    workflows: [
      { key: "setup-project", steps: [{ key: "s1", type: "form" }], edges: [] },
    ],
    transitionWorkflowBindings: {
      "WU.SETUP:__absent____to__done": ["setup-project"],
    },
  };

  // Provide LifecycleRepository that returns [] for findWorkUnitTypes.
  // Call EligibilityService.getTransitionEligibility({ versionId, workUnitTypeKey: "WU.SETUP", currentState: "__absent__" })
  // Assert eligibleTransitions contains the setup transition and workflow keys.
});
```

**Step 2: Run test to verify it fails**

Run: `bun test packages/methodology-engine/src/eligibility-service.test.ts`
Expected: FAIL because EligibilityService currently returns empty eligibility when no work unit types are found.

**Step 3: Commit**

```bash
git add packages/methodology-engine/src/eligibility-service.test.ts
git commit -m "test(eligibility): cover seed-only fallback when lifecycle rows missing"
```

### Task 2: Implement EligibilityService fallback (minimal, deterministic)

**Files:**
- Modify: `packages/methodology-engine/src/eligibility-service.ts`

**Step 1: Implement the minimal fallback**

Add a seed-only fallback that activates only when `lifecycleRepo.findWorkUnitTypes(versionId)` returns an empty list.

Implementation sketch:

```ts
const workUnitTypes = yield* lifecycleRepo.findWorkUnitTypes(input.versionId);
if (workUnitTypes.length === 0) {
  return yield* getTransitionEligibilityFromDefinitionExtensions(version.definitionExtensions, input);
}
```

Where `getTransitionEligibilityFromDefinitionExtensions(...)`:
- Extracts `workUnitTypes[]`, finds matching `input.workUnitTypeKey`.
- Filters `lifecycleTransitions[]` by `currentState` (`__absent__` default) with absent semantics.
- Emits only `start_gate` and `completion_gate` transitions.
- Computes workflow eligibility using `transitionWorkflowBindings[transitionKey]` + `workflows[].key`.
- Sorts `eligibleTransitions` by `transitionKey`.
- Sorts diagnostics by `code` then `observed`.

**Step 2: Run tests to verify they pass**

Run: `bun test packages/methodology-engine/src/eligibility-service.test.ts`
Expected: PASS.

**Step 3: Commit**

```bash
git add packages/methodology-engine/src/eligibility-service.ts
git commit -m "feat(eligibility): derive seed-only eligibility from definitionExtensions"
```

### Task 3: Add failing seed fixture tests for agents + setup binding

**Files:**
- Modify: `packages/scripts/src/__tests__/story-seed-fixtures.test.ts`

**Step 1: Write the failing assertions**

Update the Story 2.2 seed test to assert:
- `agentTypes` is non-empty and deterministic (keys present).
- setup binding exists in `transitionWorkflowBindings`.

```ts
it("returns canonical Story 2.2 BMAD seed data", () => {
  const plan = Effect.runSync(getStorySeedPlan("2-2"));
  const draft = plan.methodologyVersions[0];
  const extensions = draft?.definitionExtensions as any;

  expect(Array.isArray(extensions.agentTypes)).toBe(true);
  expect(extensions.agentTypes.length).toBeGreaterThan(0);
  expect(extensions.agentTypes[0]).toHaveProperty("key");
  expect(extensions.agentTypes[0]).toHaveProperty("persona");

  const setupKey = "WU.SETUP:__absent____to__done";
  expect(Array.isArray(extensions.transitionWorkflowBindings?.[setupKey])).toBe(true);
  expect(extensions.transitionWorkflowBindings[setupKey]).toContain("setup-project");
});
```

**Step 2: Run test to verify it fails**

Run: `bun test packages/scripts/src/__tests__/story-seed-fixtures.test.ts`
Expected: FAIL (agentTypes currently empty / missing).

**Step 3: Commit**

```bash
git add packages/scripts/src/__tests__/story-seed-fixtures.test.ts
git commit -m "test(seed): require deterministic agentTypes and setup binding in story fixtures"
```

### Task 4: Seed deterministic agentTypes in story seed fixtures

**Files:**
- Modify: `packages/scripts/src/story-seed-fixtures.ts`

**Step 1: Implement minimal seed change**

In `buildStory22DefinitionExtensions()`, set `agentTypes` to a deterministic list (example keys; keep stable):

```ts
agentTypes: [
  { key: "agent.operator", persona: "operator" },
  { key: "agent.analyst", persona: "analysis" },
  { key: "agent.architect", persona: "architecture" },
].sort((a, b) => a.key.localeCompare(b.key)),
```

Keep `factSchemas: []` unchanged so project facts remain empty in preview.

**Step 2: Run seed fixture tests to verify they pass**

Run: `bun test packages/scripts/src/__tests__/story-seed-fixtures.test.ts`
Expected: PASS.

**Step 3: Commit**

```bash
git add packages/scripts/src/story-seed-fixtures.ts
git commit -m "feat(seed): populate deterministic agentTypes for Epic 2 preview"
```

### Task 5: Quick validation (manual + deterministic)

**Files:**
- None

**Step 1: Re-seed (reset) and check UI surfaces**

Run: `bun run story-seed -- --reset --story=2-5`
Expected: exits 0 and prints deterministic seed login.

**Step 2: Verify project baseline preview**

In web app:
- Create/pin project to seeded BMAD active version.
- Confirm:
  - `/projects/$projectId/transitions` shows `WU.SETUP:__absent____to__done` with status `eligible`.
  - `/projects/$projectId/facts` shows empty list.
  - `/projects/$projectId/agents` shows non-empty deterministic agent keys.

**Step 3: Full test run (optional but recommended before merge)**

Run: `bun test`
Expected: PASS.

---

Plan complete and saved to `docs/plans/2026-03-05-epic-2-preview-setup-transition-facts-agents-implementation-plan.md`. Two execution options:

1. Subagent-Driven (this session) - I dispatch a fresh subagent per task, review between tasks
2. Parallel Session (separate) - Open new session and run superpowers:executing-plans in a dedicated worktree

Which approach?
