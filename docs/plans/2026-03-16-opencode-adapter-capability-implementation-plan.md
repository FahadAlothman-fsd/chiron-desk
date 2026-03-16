# OpenCode Adapter Capability Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the Epic 3 foundation for OpenCode-backed agent-step execution with capability-driven discovery, selective fallback, harness resolution, and deterministic prompt layering.

**Architecture:** Add a single OpenCode adapter boundary that Chiron uses for discovery and execution. The first slice should prove the capability matrix and adapter contract before deeper UI or runtime coupling, then expose that state through API and system-owned Harnesses surfaces.

**Tech Stack:** TypeScript, Hono, oRPC, Effect, React, TanStack Router, TanStack Query, Vitest

---

### Task 1: Define the adapter contract and capability model

**Files:**
- Create: `packages/contracts/src/opencode-adapter.ts`
- Modify: `packages/contracts/src/index.ts`
- Test: `packages/contracts/src/tests/opencode-adapter.test.ts`
- Reference: `docs/plans/2026-03-16-opencode-adapter-capability-design.md`
- Reference: `docs/plans/2026-03-11-agent-step-config-design.md`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { OpenCodeSurfaceSchema } from "../opencode-adapter";

describe("OpenCodeSurfaceSchema", () => {
  it("accepts required surfaces with explicit source mode", () => {
    const result = OpenCodeSurfaceSchema.parse({
      surface: "agents",
      priority: "required",
      sourceMode: "native",
    });

    expect(result.surface).toBe("agents");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test packages/contracts/src/tests/opencode-adapter.test.ts`
Expected: FAIL because `opencode-adapter.ts` does not exist yet.

**Step 3: Write minimal implementation**

Create a contract that defines:
- metadata surfaces: `agents | mcps | providers | plugins | skills`
- priority: `required | optional`
- source mode: `native | fallback | unsupported`
- capability report DTOs for discovery and execution
- prompt-layering capability flags

**Step 4: Run test to verify it passes**

Run: `bun test packages/contracts/src/tests/opencode-adapter.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add packages/contracts/src/opencode-adapter.ts packages/contracts/src/index.ts packages/contracts/src/tests/opencode-adapter.test.ts
git commit -m "feat(contracts): add opencode adapter capability contract"
```

### Task 2: Add a server-side capability service with native-plus-fallback policy

**Files:**
- Create: `packages/api/src/services/opencode-capability-service.ts`
- Create: `packages/api/src/tests/services/opencode-capability-service.test.ts`
- Modify: `packages/api/src/context.ts`
- Reference: `opencode.json`
- Reference: `docs/architecture/system-pages/harnesses/index.md`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { resolveSurfacePolicy } from "../../services/opencode-capability-service";

describe("resolveSurfacePolicy", () => {
  it("allows fallback for required agent discovery", () => {
    expect(resolveSurfacePolicy("agents", false).sourceMode).toBe("fallback");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test packages/api/src/tests/services/opencode-capability-service.test.ts`
Expected: FAIL because the service does not exist.

**Step 3: Write minimal implementation**

Implement a service that:
- evaluates each surface independently
- prefers native SDK or API exposure
- only allows filesystem fallback for required surfaces
- marks optional unexposed surfaces as `unsupported`
- returns diagnostics describing why a surface is unavailable or deferred

**Step 4: Run test to verify it passes**

Run: `bun test packages/api/src/tests/services/opencode-capability-service.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add packages/api/src/services/opencode-capability-service.ts packages/api/src/tests/services/opencode-capability-service.test.ts packages/api/src/context.ts
git commit -m "feat(api): add opencode capability policy service"
```

### Task 3: Expose capability reports through an API router

**Files:**
- Create: `packages/api/src/routers/opencode.ts`
- Create: `packages/api/src/tests/routers/opencode.test.ts`
- Modify: `packages/api/src/routers/index.ts`
- Reference: `packages/api/src/routers/project.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { createAppRouter } from "../../routers";

describe("opencode router", () => {
  it("exposes capability reports", () => {
    const router = createAppRouter({} as never, {} as never, {} as never);
    expect(router.opencode).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test packages/api/src/tests/routers/opencode.test.ts`
Expected: FAIL because `router.opencode` does not exist.

**Step 3: Write minimal implementation**

Expose read-only procedures for:
- capability matrix summary
- per-surface diagnostics
- harness readiness for `opencode`
- prompt-layering support metadata

**Step 4: Run test to verify it passes**

Run: `bun test packages/api/src/tests/routers/opencode.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add packages/api/src/routers/opencode.ts packages/api/src/tests/routers/opencode.test.ts packages/api/src/routers/index.ts
git commit -m "feat(api): expose opencode capability router"
```

### Task 4: Add the system Harnesses UI for capability visibility

**Files:**
- Create: `apps/web/src/routes/harnesses.tsx`
- Create: `apps/web/src/features/harnesses/opencode-capability-panel.tsx`
- Create: `apps/web/src/tests/routes/harnesses.integration.test.tsx`
- Modify: `apps/web/src/components/sidebar-sections.tsx`
- Modify: `apps/web/src/components/app-shell.tsx`
- Reference: `docs/architecture/system-pages/harnesses/index.md`

**Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RouteComponent } from "../../routes/harnesses";

describe("Harnesses route", () => {
  it("renders the OpenCode capability summary", () => {
    render(<RouteComponent />);
    expect(screen.getByText(/OpenCode/i)).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test apps/web/src/tests/routes/harnesses.integration.test.tsx`
Expected: FAIL because the route and panel do not exist.

**Step 3: Write minimal implementation**

Render:
- harness overview card
- per-surface capability rows
- readiness badges
- diagnostics for unsupported or fallback-backed surfaces

Keep the page system-owned and read-only.

**Step 4: Run test to verify it passes**

Run: `bun test apps/web/src/tests/routes/harnesses.integration.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src/routes/harnesses.tsx apps/web/src/features/harnesses/opencode-capability-panel.tsx apps/web/src/tests/routes/harnesses.integration.test.tsx apps/web/src/components/sidebar-sections.tsx apps/web/src/components/app-shell.tsx
git commit -m "feat(web): add harness capability visibility page"
```

### Task 5: Wire agent-step harness resolution and prompt-layering receipts

**Files:**
- Modify: `docs/architecture/methodology-pages/workflow-editor/agent-step.md`
- Create: `packages/api/src/services/opencode-execution-service.ts`
- Create: `packages/api/src/tests/services/opencode-execution-service.test.ts`
- Reference: `docs/plans/2026-03-11-agent-step-config-design.md`
- Reference: `docs/architecture/modules/provider-registry.md`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { composePromptLayers } from "../../services/opencode-execution-service";

describe("composePromptLayers", () => {
  it("keeps system layers ahead of user prompt", () => {
    const result = composePromptLayers({
      baseSystem: "base",
      policySystem: "policy",
      stepSystem: "step",
      userPrompt: "task",
    });

    expect(result.system).toContain("policy");
    expect(result.user).toBe("task");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test packages/api/src/tests/services/opencode-execution-service.test.ts`
Expected: FAIL because the execution service does not exist.

**Step 3: Write minimal implementation**

Implement adapter-side execution helpers that:
- resolve selected harness capabilities
- compose prompt layers deterministically
- reject execution when required harness capabilities are unsupported
- emit receipt-friendly metadata for later audit

**Step 4: Run test to verify it passes**

Run: `bun test packages/api/src/tests/services/opencode-execution-service.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add docs/architecture/methodology-pages/workflow-editor/agent-step.md packages/api/src/services/opencode-execution-service.ts packages/api/src/tests/services/opencode-execution-service.test.ts
git commit -m "feat(api): add opencode execution capability checks"
```

### Task 6: Verify the full slice and record readiness

**Files:**
- Modify: `docs/plans/2026-03-16-opencode-adapter-capability-design.md`
- Modify: `docs/architecture/system-pages/harnesses/index.md`
- Create: `docs/plans/2026-03-16-opencode-adapter-readiness-notes.md`

**Step 1: Run focused package tests**

Run:
```bash
bun test packages/contracts/src/tests/opencode-adapter.test.ts
bun test packages/api/src/tests/services/opencode-capability-service.test.ts
bun test packages/api/src/tests/routers/opencode.test.ts
bun test packages/api/src/tests/services/opencode-execution-service.test.ts
bun test apps/web/src/tests/routes/harnesses.integration.test.tsx
```

Expected: all PASS.

**Step 2: Run one broader confidence pass**

Run: `bun test`
Expected: PASS or known unrelated failures documented explicitly.

**Step 3: Record readiness notes**

Document:
- which surfaces resolved natively
- which required surfaces used fallback
- which optional surfaces were deferred
- whether prompt layering is fully supported or only partially supported

**Step 4: Commit**

```bash
git add docs/plans/2026-03-16-opencode-adapter-capability-design.md docs/architecture/system-pages/harnesses/index.md docs/plans/2026-03-16-opencode-adapter-readiness-notes.md
git commit -m "docs(plans): record opencode adapter readiness evidence"
```
