# Graph-first Methodology Editor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace JSON-authoritative methodology draft editing with a canonical client-side graph store across L1/L2/L3 scopes, keeping JSON as import/export fallback only.

**Architecture:** Hydrate a normalized graph store from `orpc.methodology.version.workspace.get`, project L1/L2/L3 views via the existing `projectMethodologyGraph` shape (`apps/web/src/features/methodologies/version-graph.ts`), compile the graph into the existing two persistence DTOs (`updateDraftLifecycle`, `updateDraftWorkflows`), and enforce deterministic reload semantics by refetching and rehydrating after successful saves.

**Tech Stack:** React 19, TanStack Router, TanStack Query v5, TypeScript, `@xyflow/react`, Vitest, Testing Library.

---

### Task 1: Introduce canonical graph types + store skeleton

**Files:**
- Create: `apps/web/src/features/methodologies/graph-types.ts`
- Create: `apps/web/src/features/methodologies/graph-patches.ts`
- Create: `apps/web/src/features/methodologies/graph-store.tsx`
- Test: `apps/web/src/features/methodologies/graph-store.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import { createGraphStore } from "./graph-store";

describe("methodology graph store", () => {
  it("applies patches optimistically and marks dirty domains", () => {
    const store = createGraphStore({
      baseProjection: null,
      graph: {
        displayName: "Draft",
        workUnitTypesByKey: new Map(),
        agentTypesByKey: new Map(),
        workflowsByKey: new Map(),
        transitionWorkflowBindings: new Map(),
        guidance: {},
      },
    });

    store.dispatch({
      type: "set-display-name",
      displayName: "Draft Updated",
      domain: "lifecycle",
    });

    expect(store.getState().graph.displayName).toBe("Draft Updated");
    expect(store.getState().dirty.domains.lifecycle).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun --filter @chiron/web test apps/web/src/features/methodologies/graph-store.test.ts`
Expected: FAIL (missing store/types).

**Step 3: Write minimal implementation**

```ts
// graph-types.ts
export type PersistenceDomain = "lifecycle" | "workflows";

export type MethodologyGraph = {
  displayName: string;
  workUnitTypesByKey: Map<string, unknown>;
  agentTypesByKey: Map<string, unknown>;
  workflowsByKey: Map<string, unknown>;
  transitionWorkflowBindings: Map<string, Set<string>>;
  guidance: {
    global?: unknown;
    byWorkUnitType?: Record<string, unknown>;
    byAgentType?: Record<string, unknown>;
    byTransition?: Record<string, unknown>;
  };
};

export type GraphDirtyState = {
  domains: Record<PersistenceDomain, boolean>;
};

// graph-patches.ts
import type { PersistenceDomain } from "./graph-types";

export type GraphPatch =
  | {
      type: "set-display-name";
      displayName: string;
      domain: PersistenceDomain;
    };

// graph-store.tsx
import { useSyncExternalStore } from "react";

import type { GraphDirtyState, MethodologyGraph, PersistenceDomain } from "./graph-types";
import type { GraphPatch } from "./graph-patches";

export type GraphStoreState = {
  baseProjection: unknown | null;
  graph: MethodologyGraph;
  dirty: GraphDirtyState;
};

export type GraphStore = {
  getState: () => GraphStoreState;
  subscribe: (listener: () => void) => () => void;
  dispatch: (patch: GraphPatch) => void;
};

export function createGraphStore(initial: Pick<GraphStoreState, "baseProjection" | "graph">): GraphStore {
  let state: GraphStoreState = {
    baseProjection: initial.baseProjection,
    graph: initial.graph,
    dirty: { domains: { lifecycle: false, workflows: false } },
  };

  const listeners = new Set<() => void>();
  const emit = () => {
    for (const listener of listeners) listener();
  };

  const markDirty = (domain: PersistenceDomain) => {
    state = {
      ...state,
      dirty: {
        domains: {
          ...state.dirty.domains,
          [domain]: true,
        } as Record<PersistenceDomain, boolean>,
      },
    };
  };

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispatch: (patch) => {
      if (patch.type === "set-display-name") {
        state = { ...state, graph: { ...state.graph, displayName: patch.displayName } };
        markDirty(patch.domain);
        emit();
      }
    },
  };
}

export function useGraphStore(store: GraphStore): GraphStoreState {
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}
```

**Step 4: Run test to verify it passes**

Run: `bun --filter @chiron/web test apps/web/src/features/methodologies/graph-store.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src/features/methodologies/graph-types.ts apps/web/src/features/methodologies/graph-patches.ts apps/web/src/features/methodologies/graph-store.tsx apps/web/src/features/methodologies/graph-store.test.ts
git commit -m "feat(web): add methodology graph store skeleton"
```

---

### Task 2: Add deterministic hydrator from authoring snapshot

**Files:**
- Create: `apps/web/src/features/methodologies/graph-hydrate.ts`
- Test: `apps/web/src/features/methodologies/graph-hydrate.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import { hydrateGraphFromProjection } from "./graph-hydrate";

describe("hydrateGraphFromProjection", () => {
  it("normalizes ordering deterministically", () => {
    const projection = {
      displayName: "Draft",
      workUnitTypes: [{ key: "B" }, { key: "A" }],
      agentTypes: [],
      workflows: [{ key: "wf.b" }, { key: "wf.a" }],
      transitionWorkflowBindings: { t2: ["wf.b", "wf.a"], t1: ["wf.a"] },
      guidance: {},
    };

    const graph = hydrateGraphFromProjection(projection);
    expect([...graph.workUnitTypesByKey.keys()]).toEqual(["A", "B"]);
    expect([...graph.workflowsByKey.keys()]).toEqual(["wf.a", "wf.b"]);

    const t2 = graph.transitionWorkflowBindings.get("t2");
    expect(t2 ? [...t2] : []).toEqual(["wf.a", "wf.b"]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun --filter @chiron/web test apps/web/src/features/methodologies/graph-hydrate.test.ts`
Expected: FAIL (missing hydrator).

**Step 3: Write minimal implementation**

```ts
import type { MethodologyGraph } from "./graph-types";

function asKeyedArray(input: unknown): Array<{ key: string } & Record<string, unknown>> {
  return Array.isArray(input)
    ? input.filter(
        (entry): entry is { key: string } & Record<string, unknown> =>
          typeof entry === "object" && entry !== null && "key" in entry && typeof (entry as any).key === "string",
      )
    : [];
}

export function hydrateGraphFromProjection(projection: any): MethodologyGraph {
  const workUnitTypes = asKeyedArray(projection?.workUnitTypes).sort((a, b) => a.key.localeCompare(b.key));
  const workflows = asKeyedArray(projection?.workflows).sort((a, b) => a.key.localeCompare(b.key));
  const agentTypes = asKeyedArray(projection?.agentTypes).sort((a, b) => a.key.localeCompare(b.key));

  const bindingsRaw: Record<string, unknown> =
    projection?.transitionWorkflowBindings && typeof projection.transitionWorkflowBindings === "object"
      ? projection.transitionWorkflowBindings
      : {};

  const transitionWorkflowBindings = new Map<string, Set<string>>();
  for (const transitionKey of Object.keys(bindingsRaw).sort()) {
    const values = bindingsRaw[transitionKey];
    const keys = Array.isArray(values) ? values.filter((v): v is string => typeof v === "string") : [];
    transitionWorkflowBindings.set(transitionKey, new Set(keys.sort()));
  }

  return {
    displayName: String(projection?.displayName ?? ""),
    workUnitTypesByKey: new Map(workUnitTypes.map((w) => [w.key, w] as const)),
    agentTypesByKey: new Map(agentTypes.map((a) => [a.key, a] as const)),
    workflowsByKey: new Map(workflows.map((w) => [w.key, w] as const)),
    transitionWorkflowBindings,
    guidance: projection?.guidance && typeof projection.guidance === "object" ? projection.guidance : {},
  };
}
```

**Step 4: Run test to verify it passes**

Run: `bun --filter @chiron/web test apps/web/src/features/methodologies/graph-hydrate.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src/features/methodologies/graph-hydrate.ts apps/web/src/features/methodologies/graph-hydrate.test.ts
git commit -m "feat(web): add deterministic hydrator for methodology graph"
```

---

### Task 3: Compile graph to existing persistence DTO inputs

**Files:**
- Create: `apps/web/src/features/methodologies/graph-compile.ts`
- Test: `apps/web/src/features/methodologies/graph-compile.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import { compileLifecycleInput, compileWorkflowsInput } from "./graph-compile";

describe("graph compilation", () => {
  it("compiles deterministic lifecycle + workflow payloads", () => {
    const graph: any = {
      displayName: "Draft",
      workUnitTypesByKey: new Map([
        ["WU.A", { key: "WU.A", cardinality: "one_per_project", lifecycleStates: [], lifecycleTransitions: [], factSchemas: [] }],
      ]),
      agentTypesByKey: new Map(),
      workflowsByKey: new Map([
        ["wf.a", { key: "wf.a", steps: [], edges: [], workUnitTypeKey: "WU.A" }],
      ]),
      transitionWorkflowBindings: new Map([["t1", new Set(["wf.a"])]]),
      guidance: {},
    };

    const lifecycle = compileLifecycleInput({ versionId: "v1", graph });
    const workflows = compileWorkflowsInput({ versionId: "v1", graph });

    expect(lifecycle.versionId).toBe("v1");
    expect(Array.isArray(lifecycle.workUnitTypes)).toBe(true);
    expect(workflows.transitionWorkflowBindings.t1).toEqual(["wf.a"]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun --filter @chiron/web test apps/web/src/features/methodologies/graph-compile.test.ts`
Expected: FAIL (missing compiler).

**Step 3: Write minimal implementation**

```ts
import type { MethodologyGraph } from "./graph-types";

export function compileLifecycleInput(input: { versionId: string; graph: MethodologyGraph }) {
  const workUnitTypes = [...input.graph.workUnitTypesByKey.values()].slice();
  workUnitTypes.sort((a: any, b: any) => String(a.key).localeCompare(String(b.key)));

  const agentTypes = [...input.graph.agentTypesByKey.values()].slice();
  agentTypes.sort((a: any, b: any) => String(a.key).localeCompare(String(b.key)));

  return {
    versionId: input.versionId,
    workUnitTypes,
    agentTypes,
  };
}

export function compileWorkflowsInput(input: { versionId: string; graph: MethodologyGraph }) {
  const workflows = [...input.graph.workflowsByKey.values()].slice();
  workflows.sort((a: any, b: any) => String(a.key).localeCompare(String(b.key)));

  const transitionWorkflowBindings: Record<string, string[]> = {};
  const transitionKeys = [...input.graph.transitionWorkflowBindings.keys()].sort();
  for (const transitionKey of transitionKeys) {
    const set = input.graph.transitionWorkflowBindings.get(transitionKey);
    transitionWorkflowBindings[transitionKey] = set ? [...set].slice().sort() : [];
  }

  return {
    versionId: input.versionId,
    workflows,
    transitionWorkflowBindings,
    guidance: input.graph.guidance,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `bun --filter @chiron/web test apps/web/src/features/methodologies/graph-compile.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src/features/methodologies/graph-compile.ts apps/web/src/features/methodologies/graph-compile.test.ts
git commit -m "feat(web): compile methodology graph into persistence DTO payloads"
```

---

### Task 4: Wire route + Save to graph store (deterministic refetch)

**Files:**
- Modify: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.tsx`
- Modify: `apps/web/src/features/methodologies/version-workspace.tsx`
- Modify: `apps/web/src/features/methodologies/version-workspace-graph.tsx`
- Test: `apps/web/src/features/methodologies/version-workspace.persistence.test.ts`

**Step 1: Write the failing test update**

In `apps/web/src/features/methodologies/version-workspace.persistence.test.ts`, add a new test that:

- hydrates a graph from a projection
- compiles payloads
- rehydrates from the compiled-and-reloaded projection
- asserts deterministic equality on a derived JSON view (or stable ordering of keys)

**Step 2: Run test to verify it fails**

Run: `bun --filter @chiron/web test apps/web/src/features/methodologies/version-workspace.persistence.test.ts`
Expected: FAIL until graph hydration/compile/save wiring exists.

**Step 3: Minimal implementation wiring**

- In `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.tsx`:
  - replace `useState<MethodologyVersionWorkspaceDraft>` with a graph store instance hydrated from `draftQuery.data` using `hydrateGraphFromProjection()`
  - update `handleSave()` to use `compileLifecycleInput()` + `compileWorkflowsInput()` instead of `parseWorkspaceDraftForPersistence()`
  - keep the existing two-phase mutation order and deterministic invalidate+refetch
  - on successful refetch: replace graph store state (rehydrate) only when local state is not dirty, or as part of the post-save replace-on-success rule

- In `apps/web/src/features/methodologies/version-workspace-graph.tsx`:
  - replace JSON-string binding updates with store patches against `transitionWorkflowBindings`
  - keep layout persistence separate (localStorage)

- In `apps/web/src/features/methodologies/version-workspace.tsx`:
  - remove JSON editors from being the primary edit surface; keep only a derived JSON panel placeholder for Task 5

**Step 4: Run tests to verify they pass**

Run:
- `bun --filter @chiron/web test apps/web/src/features/methodologies/version-workspace.persistence.test.ts`
- `bun --filter @chiron/web test`

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.tsx apps/web/src/features/methodologies/version-workspace.tsx apps/web/src/features/methodologies/version-workspace-graph.tsx apps/web/src/features/methodologies/version-workspace.persistence.test.ts
git commit -m "refactor(web): make methodology workspace graph-first with deterministic save/rehydrate"
```

---

### Task 5: Add JSON fallback panel (export + apply-import)

**Files:**
- Create: `apps/web/src/features/methodologies/raw-json-panel.tsx`
- Test: `apps/web/src/features/methodologies/raw-json-panel.test.tsx`
- Modify: `apps/web/src/features/methodologies/version-workspace.tsx`

**Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RawJsonPanel } from "./raw-json-panel";

describe("RawJsonPanel", () => {
  it("does not mutate canonical state when JSON is invalid", async () => {
    render(
      <RawJsonPanel
        json={"{}"}
        onApply={(next) => {
          throw new Error("should not apply");
        }}
      />,
    );

    expect(screen.getByText(/raw json/i)).toBeTruthy();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun --filter @chiron/web test apps/web/src/features/methodologies/raw-json-panel.test.tsx`
Expected: FAIL (component missing).

**Step 3: Write minimal implementation**

- `RawJsonPanel` renders:
  - a read-only textarea with deterministic JSON
  - an optional editable textarea (advanced) + "Apply JSON" button
  - parse errors shown inline
- The only way to affect canonical state is calling `onApply(parsedValue)` after successful parse/shape checks.

**Step 4: Run test to verify it passes**

Run: `bun --filter @chiron/web test apps/web/src/features/methodologies/raw-json-panel.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src/features/methodologies/raw-json-panel.tsx apps/web/src/features/methodologies/raw-json-panel.test.tsx apps/web/src/features/methodologies/version-workspace.tsx
git commit -m "feat(web): add raw JSON fallback panel for methodology graph import/export"
```

---

### Task 6: Quality gates

**Step 1: Typecheck**

Run: `bun check-types`
Expected: PASS.

**Step 2: Lint/format**

Run: `bun check`
Expected: PASS.

**Step 3: Full test suite**

Run: `bun test`
Expected: PASS.

