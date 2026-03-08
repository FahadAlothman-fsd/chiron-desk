# Workflow Engine Execution Layer (WU.PROJECT_CONTEXT) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the minimum workflow execution layer needed to run the locked `document-project` and `generate-project-context` workflows, with deterministic edge-based routing and branch edge-condition evaluation.

**Architecture:** Implement a small execution core in `packages/workflow-engine/` that can execute a workflow snapshot (steps + edges) in a single run. Routing uses the edge graph; only `branch` steps consult `edge.condition` and must select exactly one matching outgoing edge.

**Tech Stack:** TypeScript, Effect, existing methodology contracts (`packages/contracts/src/methodology/version.ts`) and design-time validator patterns (`packages/methodology-engine/src/validation.ts`).

---

### Task 1: Introduce workflow-engine public API + core types

**Files:**
- Modify: `packages/workflow-engine/src/index.ts`
- Create: `packages/workflow-engine/src/types.ts`

**Step 1: Write the failing test**

Create: `packages/workflow-engine/src/engine.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { executeWorkflow } from "./index";

describe("workflow-engine", () => {
  it("exports executeWorkflow", async () => {
    expect(typeof executeWorkflow).toBe("function");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test packages/workflow-engine/src/engine.test.ts`
Expected: FAIL (module/function missing)

**Step 3: Write minimal implementation**

In `packages/workflow-engine/src/index.ts`:

```ts
export { executeWorkflow } from "./engine";
export * from "./types";
```

Create `packages/workflow-engine/src/types.ts`:

```ts
export type WorkflowStepType = "form" | "agent" | "action" | "invoke" | "branch" | "display";

export type WorkflowStep = {
  key: string;
  type: WorkflowStepType;
  displayName?: string;
  config?: unknown;
};

export type WorkflowEdge = {
  fromStepKey: string | null;
  toStepKey: string | null;
  edgeKey?: string;
  condition?: unknown;
};

export type WorkflowDefinition = {
  key: string;
  displayName?: string;
  workUnitTypeKey?: string;
  steps: readonly WorkflowStep[];
  edges: readonly WorkflowEdge[];
};

export type ExecutionErrorCode =
  | "INVALID_ENTRY_COUNT"
  | "MISSING_TERMINAL"
  | "UNRESOLVED_EDGE_ENDPOINT"
  | "UNREACHABLE_STEP"
  | "BRANCH_MISSING_CONDITION"
  | "NO_BRANCH_MATCH"
  | "AMBIGUOUS_BRANCH_MATCH";

export type ExecutionError = {
  code: ExecutionErrorCode;
  message: string;
  scope?: string;
};
```

Create: `packages/workflow-engine/src/engine.ts` with stub `executeWorkflow` that throws a not-implemented error.

**Step 4: Run test to verify it passes**

Run: `bun run test packages/workflow-engine/src/engine.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/workflow-engine/src/index.ts packages/workflow-engine/src/types.ts packages/workflow-engine/src/engine.test.ts packages/workflow-engine/src/engine.ts
git commit -m "feat(workflow-engine): scaffold execution entrypoint" \
  -m "Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-opencode)" \
  -m "Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>"
```

---

### Task 2: Implement graph snapshot validation (entry/terminal/reachability)

**Files:**
- Modify: `packages/workflow-engine/src/engine.ts`
- Create: `packages/workflow-engine/src/graph.ts`
- Test: `packages/workflow-engine/src/graph.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { validateWorkflowGraph } from "./graph";

it("requires exactly one entry edge", () => {
  const res = validateWorkflowGraph({
    key: "wf",
    steps: [{ key: "a", type: "display" }],
    edges: [],
  });
  expect(res.ok).toBe(false);
  expect(res.error.code).toBe("INVALID_ENTRY_COUNT");
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test packages/workflow-engine/src/graph.test.ts`
Expected: FAIL (missing function)

**Step 3: Write minimal implementation**

Create `packages/workflow-engine/src/graph.ts` implementing:
- `validateWorkflowGraph(def): { ok: true; entryStepKey: string } | { ok: false; error: ExecutionError }`
- Invariants (mirror `packages/methodology-engine/src/validation.ts` but as runtime preflight):
  - exactly one entry edge (`fromStepKey === null` and `toStepKey !== null`)
  - at least one terminal edge (`toStepKey === null` and `fromStepKey !== null`)
  - every non-null edge endpoint references an existing step key
  - all steps are reachable from the entry step
  - (optional but recommended) branch steps have >=2 outgoing edges with edgeKey present

**Step 4: Run test to verify it passes**

Run: `bun run test packages/workflow-engine/src/graph.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/workflow-engine/src/graph.ts packages/workflow-engine/src/graph.test.ts packages/workflow-engine/src/engine.ts
git commit -m "feat(workflow-engine): validate workflow graph snapshot" \
  -m "Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-opencode)" \
  -m "Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>"
```

---

### Task 3: Add condition ADT + evaluator for branch edge conditions

**Files:**
- Create: `packages/workflow-engine/src/condition.ts`
- Test: `packages/workflow-engine/src/condition.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { evalCondition } from "./condition";

it("evaluates equals", () => {
  expect(evalCondition({ op: "equals", var: "x", value: 1 }, { x: 1 })).toBe(true);
  expect(evalCondition({ op: "equals", var: "x", value: 1 }, { x: 2 })).toBe(false);
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test packages/workflow-engine/src/condition.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

Implement the ADT from `docs/plans/2026-03-08-methodology-workflow-lock-strategy-design.md` and an evaluator:

```ts
export type Condition =
  | { op: "exists"; var: string }
  | { op: "equals"; var: string; value: string | number | boolean }
  | { op: "contains"; var: string; value: string }
  | { op: "gt" | "gte" | "lt" | "lte"; var: string; value: number }
  | { op: "and"; all: Condition[] }
  | { op: "or"; any: Condition[] }
  | { op: "not"; cond: Condition };

export function evalCondition(cond: Condition, vars: Record<string, unknown>): boolean {
  // keep deterministic: no IO, no dates, no randomness
  // unknown var => false
  // type mismatches => false
  return false; // replace with real logic
}
```

(Replace `return false` with actual evaluation.)

**Step 4: Run test to verify it passes**

Run: `bun run test packages/workflow-engine/src/condition.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/workflow-engine/src/condition.ts packages/workflow-engine/src/condition.test.ts
git commit -m "feat(workflow-engine): add deterministic condition evaluator" \
  -m "Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-opencode)" \
  -m "Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>"
```

---

### Task 4: Implement branch step routing (exactly-one-match)

**Files:**
- Modify: `packages/workflow-engine/src/engine.ts`
- Test: `packages/workflow-engine/src/engine.branch.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { executeWorkflow } from "./index";

it("fails when a branch has no matching edge", async () => {
  const wf = {
    key: "wf",
    steps: [
      { key: "b", type: "branch" },
      { key: "x", type: "display" },
    ],
    edges: [
      { fromStepKey: null, toStepKey: "b" },
      { fromStepKey: "b", toStepKey: "x", edgeKey: "to-x", condition: { op: "equals", var: "m", value: "y" } },
      { fromStepKey: "x", toStepKey: null, edgeKey: "complete" },
    ],
  };

  const res = await executeWorkflow({ workflow: wf, variables: { m: "z" } });
  expect(res.ok).toBe(false);
  expect(res.error.code).toBe("NO_BRANCH_MATCH");
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test packages/workflow-engine/src/engine.branch.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

In `executeWorkflow`:
- Run `validateWorkflowGraph` first.
- Maintain a `currentStepKey` pointer.
- For non-branch steps: require exactly one outgoing edge to a next step (or allow terminal).
- For branch steps:
  - collect outgoing edges
  - for each edge, require `condition` present
  - evaluate condition using `evalCondition`
  - enforce exactly one matching edge (else return errors above)

Return shape (suggested):

```ts
export type ExecuteWorkflowInput = {
  workflow: WorkflowDefinition;
  variables: Record<string, unknown>;
};

export type ExecuteWorkflowResult =
  | { ok: true; terminalEdgeKey: string; variables: Record<string, unknown> }
  | { ok: false; error: ExecutionError };
```

**Step 4: Run test to verify it passes**

Run: `bun run test packages/workflow-engine/src/engine.branch.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/workflow-engine/src/engine.ts packages/workflow-engine/src/engine.branch.test.ts
git commit -m "feat(workflow-engine): implement branch routing via edge conditions" \
  -m "Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-opencode)" \
  -m "Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>"
```

---

### Task 5: Stub step runners (form/action/invoke/display/agent) with deterministic scaffolding

**Files:**
- Create: `packages/workflow-engine/src/steps/`
  - `packages/workflow-engine/src/steps/form.ts`
  - `packages/workflow-engine/src/steps/action.ts`
  - `packages/workflow-engine/src/steps/invoke.ts`
  - `packages/workflow-engine/src/steps/display.ts`
  - `packages/workflow-engine/src/steps/agent.ts`
- Modify: `packages/workflow-engine/src/engine.ts`

**Step 1: Write the failing test**

Add a test asserting `display` steps auto-complete and that `form` steps fail if required output vars are missing (until a real UI/harness exists):

```ts
it("treats display step as no-op and continues", async () => {
  // small wf: entry->display->terminal
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test packages/workflow-engine/src/engine.steps.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

Implement a step-dispatcher:
- `display`: no mutation, continue
- `form`: in headless mode, require a pre-populated variable set (or return a structured error like `FORM_INPUT_REQUIRED`)
- `action`: initially no-op with a TODO; later implement action kinds
- `invoke`: initially return `INVOKE_NOT_IMPLEMENTED` (until child engine exists)
- `agent`: initially return `AGENT_NOT_IMPLEMENTED`

This keeps the engine testable while you build real adapters.

**Step 4: Run test to verify it passes**

Run: `bun run test packages/workflow-engine/src/engine.steps.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/workflow-engine/src/steps packages/workflow-engine/src/engine.ts packages/workflow-engine/src/engine.steps.test.ts
git commit -m "feat(workflow-engine): scaffold step runners for headless execution" \
  -m "Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-opencode)" \
  -m "Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>"
```

---

### Task 6: Wire the engine to the locked workflow snapshot (smoke test)

**Files:**
- Create: `packages/workflow-engine/src/fixtures/project-context-workflows.ts`
- Test: `packages/workflow-engine/src/fixtures/project-context-workflows.test.ts`

**Step 1: Write the failing test**

Add a workflow fixture mirroring the lock doc (`docs/plans/2026-03-08-methodology-workflow-lock-strategy-design.md`) and assert graph validation passes and branch routing chooses the correct edge for a few variable sets.

**Step 2: Run test to verify it fails**

Run: `bun run test packages/workflow-engine/src/fixtures/project-context-workflows.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

Implement the fixture as a plain `WorkflowDefinition` with:
- single entry edge
- terminal edge with `edgeKey: "complete"`
- branch edges with condition ADT

**Step 4: Run test to verify it passes**

Run: `bun run test packages/workflow-engine/src/fixtures/project-context-workflows.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/workflow-engine/src/fixtures packages/workflow-engine/src/fixtures/project-context-workflows.test.ts
git commit -m "test(workflow-engine): add WU.PROJECT_CONTEXT routing fixtures" \
  -m "Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-opencode)" \
  -m "Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>"
```

---

## End state

- `packages/workflow-engine` can validate a workflow graph snapshot and deterministically traverse it.
- Branch steps route via edge conditions with exactly-one-match semantics.
- Non-branch steps have deterministic single-next routing.
- Step runners exist as stubs so execution can be integrated incrementally.

Plan complete and saved to `docs/plans/2026-03-08-workflow-engine-execution-layer-implementation-plan.md`. Two execution options:

1. Subagent-Driven (this session) - I dispatch fresh subagent per task, review between tasks, fast iteration
2. Parallel Session (separate) - Open new session in worktree with executing-plans, batch execution with checkpoints
