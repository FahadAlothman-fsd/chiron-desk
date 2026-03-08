# AX Signature Registry + Phase-1 Persistence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add phase-1 AX persistence (signatures, bindings, runs, variants, selections) connected to versioned templates, methodology workflow steps, projects, and project executions, without changing runtime behavior.

**Architecture:** Introduce new Drizzle schema modules (`template.ts`, `ax.ts`) under `@chiron/db`; add a minimal `@chiron/ax-engine` repository contract (Effect Tag) and a DB-backed Layer; keep execution and optimizer drivers stubbed/manual-first.

**Tech Stack:** Bun, TypeScript, Drizzle ORM (SQLite/Turso), Effect-TS (Tags/Layers/TaggedError), Turbo.

---

## Task 1: Add Template Registry Tables (DB Schema)

**Files:**
- Create: `packages/db/src/schema/template.ts`
- Modify: `packages/db/src/schema/index.ts`

**Step 1: Write a failing integration test (imports should fail initially)**

Create: `packages/db/src/template-repository.integration.test.ts`

```ts
import { beforeEach, afterEach, describe, expect, it } from "bun:test";
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";

import * as schema from "./schema";
import { templateDefinitions, templateVersions } from "./schema/template";

const SCHEMA_SQL = [
  `CREATE TABLE template_definitions (
    id TEXT PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    kind TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE template_versions (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL,
    version TEXT NOT NULL,
    body TEXT NOT NULL,
    body_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE(template_id, version)
  )`,
];

describe("template registry integration", () => {
  let client: Client;
  let db: LibSQLDatabase<typeof schema>;
  let dbPath: string;

  beforeEach(async () => {
    dbPath = `/tmp/chiron-template-${randomUUID()}.db`;
    client = createClient({ url: `file:${dbPath}` });
    db = drizzle(client, { schema });

    for (const stmt of SCHEMA_SQL) {
      await client.execute(stmt);
    }
  });

  afterEach(async () => {
    if (client) client.close();
    if (dbPath) rmSync(dbPath, { force: true });
  });

  it("creates a template definition and version", async () => {
    await db.insert(templateDefinitions).values({
      id: "tpl-1",
      key: "project.scan.system",
      kind: "system",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.insert(templateVersions).values({
      id: "tplv-1",
      templateId: "tpl-1",
      version: "1",
      body: "hello",
      bodyHash: "hash-1",
      createdAt: new Date(),
    });

    const rows = await db.select().from(templateVersions);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.templateId).toBe("tpl-1");
  });
});
```

**Step 2: Run the test to verify it fails**

Run: `bun test packages/db/src/template-repository.integration.test.ts`
Expected: FAIL due to missing `./schema/template` exports.

**Step 3: Implement minimal Drizzle schema**

Create `packages/db/src/schema/template.ts` implementing:

- `templateDefinitions` table (`template_definitions`)
- `templateVersions` table (`template_versions`)
- Include indexes/uniques to match test SQL

**Step 4: Export schema**

Modify `packages/db/src/schema/index.ts` to export from `./template`.

**Step 5: Re-run the test**

Run: `bun test packages/db/src/template-repository.integration.test.ts`
Expected: PASS.

**Step 6: Commit (optional, only if desired)**

```bash
git add packages/db/src/schema/template.ts packages/db/src/schema/index.ts packages/db/src/template-repository.integration.test.ts
git commit -m "feat(db): add template registry tables"
```

---

## Task 2: Add AX Persistence Tables (DB Schema)

**Files:**
- Create: `packages/db/src/schema/ax.ts`
- Modify: `packages/db/src/schema/index.ts`

**Step 1: Write failing integration test**

Create: `packages/db/src/ax-repository.integration.test.ts`

```ts
import { beforeEach, afterEach, describe, expect, it } from "bun:test";
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";

import * as schema from "./schema";
import {
  axSignatures,
  axSignatureBindings,
  axOptimizationRuns,
  axPromptVariants,
  axRunVariants,
  axProjectSignatureSelections,
} from "./schema/ax";

// Minimal referenced tables for tests (no FKs required in test SQL).
const SCHEMA_SQL = [
  `CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE project_executions (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    methodology_version_id TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE methodology_versions (
    id TEXT PRIMARY KEY,
    methodology_id TEXT NOT NULL,
    version TEXT NOT NULL,
    status TEXT NOT NULL,
    display_name TEXT NOT NULL,
    definition_extensions_json TEXT,
    created_at INTEGER NOT NULL,
    retired_at INTEGER
  )`,
  `CREATE TABLE methodology_workflows (
    id TEXT PRIMARY KEY,
    methodology_version_id TEXT NOT NULL,
    work_unit_type_id TEXT,
    key TEXT NOT NULL,
    display_name TEXT,
    guidance_json TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE methodology_workflow_steps (
    id TEXT PRIMARY KEY,
    methodology_version_id TEXT NOT NULL,
    workflow_id TEXT NOT NULL,
    key TEXT NOT NULL,
    type TEXT NOT NULL,
    display_name TEXT,
    config_json TEXT,
    guidance_json TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE template_definitions (
    id TEXT PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    kind TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE template_versions (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL,
    version TEXT NOT NULL,
    body TEXT NOT NULL,
    body_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE(template_id, version)
  )`,

  // AX tables
  `CREATE TABLE ax_signatures (
    id TEXT PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    display_name TEXT,
    status TEXT NOT NULL,
    signature_class TEXT NOT NULL,
    signature_json TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE ax_signature_bindings (
    id TEXT PRIMARY KEY,
    signature_id TEXT NOT NULL,
    methodology_version_id TEXT NOT NULL,
    workflow_id TEXT NOT NULL,
    workflow_step_id TEXT NOT NULL,
    base_template_version_id TEXT,
    binding_status TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(workflow_step_id, signature_id)
  )`,
  `CREATE TABLE ax_optimization_runs (
    id TEXT PRIMARY KEY,
    signature_binding_id TEXT NOT NULL,
    project_id TEXT,
    project_execution_id TEXT,
    optimizer_type TEXT NOT NULL,
    objective_profile_json TEXT,
    status TEXT NOT NULL,
    metrics_json TEXT,
    artifact_ref TEXT,
    created_at INTEGER NOT NULL,
    started_at INTEGER,
    completed_at INTEGER
  )`,
  `CREATE TABLE ax_prompt_variants (
    id TEXT PRIMARY KEY,
    signature_binding_id TEXT NOT NULL,
    base_template_version_id TEXT NOT NULL,
    patch_json TEXT,
    variant_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE ax_run_variants (
    run_id TEXT NOT NULL,
    variant_id TEXT NOT NULL,
    score_json TEXT,
    rank INTEGER,
    selected INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY(run_id, variant_id)
  )`,
  `CREATE TABLE ax_project_signature_selections (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    signature_binding_id TEXT NOT NULL,
    active_variant_id TEXT NOT NULL,
    rollout_state TEXT NOT NULL,
    actor_id TEXT,
    evidence_ref TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(project_id, signature_binding_id)
  )`,
];

describe("ax persistence integration", () => {
  let client: Client;
  let db: LibSQLDatabase<typeof schema>;
  let dbPath: string;

  beforeEach(async () => {
    dbPath = `/tmp/chiron-ax-${randomUUID()}.db`;
    client = createClient({ url: `file:${dbPath}` });
    db = drizzle(client, { schema });

    for (const stmt of SCHEMA_SQL) {
      await client.execute(stmt);
    }
  });

  afterEach(async () => {
    if (client) client.close();
    if (dbPath) rmSync(dbPath, { force: true });
  });

  it("stores signatures, bindings, runs, variants, and project selection", async () => {
    await db.insert(axSignatures).values({
      id: "sig-1",
      key: "methodology.step.foundation.s1",
      displayName: "Foundation Step S1",
      status: "draft",
      signatureClass: "structured",
      signatureJson: { kind: "extract" },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.insert(axSignatureBindings).values({
      id: "bind-1",
      signatureId: "sig-1",
      methodologyVersionId: "mv-1",
      workflowId: "wf-1",
      workflowStepId: "step-1",
      baseTemplateVersionId: null,
      bindingStatus: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.insert(axOptimizationRuns).values({
      id: "run-1",
      signatureBindingId: "bind-1",
      projectId: null,
      projectExecutionId: null,
      optimizerType: "mipro",
      objectiveProfileJson: { budget: { tokens: 1000 } },
      status: "completed",
      metricsJson: { quality: 0.8 },
      artifactRef: null,
      createdAt: new Date(),
      startedAt: null,
      completedAt: new Date(),
    });

    await db.insert(axPromptVariants).values({
      id: "var-1",
      signatureBindingId: "bind-1",
      baseTemplateVersionId: "tplv-1",
      patchJson: { op: "replace" },
      variantHash: "vh-1",
      createdAt: new Date(),
    });

    await db.insert(axRunVariants).values({
      runId: "run-1",
      variantId: "var-1",
      scoreJson: { quality: 0.81 },
      rank: 1,
      selected: true,
    });

    await db.insert(axProjectSignatureSelections).values({
      id: "sel-1",
      projectId: "proj-1",
      signatureBindingId: "bind-1",
      activeVariantId: "var-1",
      rolloutState: "canary",
      actorId: "user-1",
      evidenceRef: "ax-promo:sel-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const selections = await db.select().from(axProjectSignatureSelections);
    expect(selections).toHaveLength(1);
    expect(selections[0]?.activeVariantId).toBe("var-1");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test packages/db/src/ax-repository.integration.test.ts`
Expected: FAIL due to missing `./schema/ax` exports.

**Step 3: Implement Drizzle schema**

Create `packages/db/src/schema/ax.ts` defining:

- `axSignatures`
- `axSignatureBindings`
- `axOptimizationRuns`
- `axPromptVariants`
- `axRunVariants`
- `axProjectSignatureSelections`

Use the same timestamp default strategy as existing schema (`packages/db/src/schema/project.ts`).

**Step 4: Export schema**

Modify `packages/db/src/schema/index.ts` to export from `./ax`.

**Step 5: Run test to verify it passes**

Run: `bun test packages/db/src/ax-repository.integration.test.ts`
Expected: PASS.

**Step 6: Commit (optional)**

```bash
git add packages/db/src/schema/ax.ts packages/db/src/schema/index.ts packages/db/src/ax-repository.integration.test.ts
git commit -m "feat(db): add ax signature registry and run tables"
```

---

## Task 3: Generate And Apply Drizzle Migration (Additive)

**Files:**
- Generate: `packages/db/src/migrations/*` (drizzle-kit output)

**Step 1: Generate migration**

Run: `bun run db:generate`
Expected: New migration files appear under `packages/db/src/migrations/`.

**Step 2: Apply schema**

Run: `bun run db:migrate`
Expected: Migration applies without errors.

**Step 3: Verify no runtime breakage**

Run: `bun run check-types`
Expected: PASS.

**Step 4: Commit migration (optional)**

```bash
git add packages/db/src/migrations
git commit -m "chore(db): add ax/template registry migrations"
```

---

## Task 4: Add Minimal AxEngine Repository Contract (Effect Tag)

**Files:**
- Create: `packages/ax-engine/src/repository.ts`
- Create: `packages/ax-engine/src/errors.ts`
- Modify: `packages/ax-engine/src/index.ts`

**Step 1: Write failing unit test (contract exports)**

Create: `packages/ax-engine/src/repository.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { AxRepository } from "./repository";

describe("AxRepository contract", () => {
  it("exports an Effect Tag", () => {
    expect(AxRepository).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -F @chiron/ax-engine`
Expected: FAIL until `packages/ax-engine` has a `test` script and the file exists.

**Step 3: Add `test` script to ax-engine (if missing)**

Modify: `packages/ax-engine/package.json`

Add:

```json
"scripts": { "test": "vitest run" }
```

**Step 4: Implement minimal contract**

Create `packages/ax-engine/src/errors.ts`:
- `AxRepositoryError` (Effect `Data.TaggedError`), fields: `operation`, `cause`.

Create `packages/ax-engine/src/repository.ts`:
- `AxRepository` Tag with minimal methods needed for phase 1:
  - `createSignature(...)`
  - `createBinding(...)`
  - `createRun(...)`
  - `recordVariant(...)`
  - `selectProjectVariant(...)`
  - `getActiveSelection(projectId, workflowStepId)` (returns selection or null)

Keep method params and return types simple (string ids + JSON payloads) to avoid over-designing contracts before runtime wiring exists.

**Step 5: Export from ax-engine**

Modify `packages/ax-engine/src/index.ts` to export repository + errors.

**Step 6: Re-run tests**

Run: `bun run test -F @chiron/ax-engine`
Expected: PASS.

**Step 7: Commit (optional)**

```bash
git add packages/ax-engine/src packages/ax-engine/package.json
git commit -m "feat(ax-engine): add repository contract"
```

---

## Task 5: Implement DB-backed AxRepository Layer

**Files:**
- Create: `packages/db/src/ax-repository.ts`
- Modify: `packages/db/src/index.ts`
- Modify: `packages/db/package.json`

**Step 1: Write failing integration test for layer wiring**

Create: `packages/db/src/ax-repository.layer.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { Effect } from "effect";
import { AxRepository } from "@chiron/ax-engine/repository";

import { createAxRepoLayer } from "./ax-repository";

// This is a smoke test: layer should provide AxRepository.
// DB methods can be no-op stubs initially, then filled in.

describe("createAxRepoLayer", () => {
  it("provides AxRepository", async () => {
    const fakeDb = {} as any;

    const program = Effect.gen(function* () {
      const repo = yield* AxRepository;
      return repo;
    }).pipe(Effect.provide(createAxRepoLayer(fakeDb)));

    const repo = await Effect.runPromise(program);
    expect(repo).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -F @chiron/db`
Expected: FAIL until `@chiron/db` has a test script and `createAxRepoLayer` exists.

**Step 3: Ensure db package can run tests**

Modify `packages/db/package.json` add:

```json
"scripts": { "test": "vitest run", ... }
```

(Keep existing db scripts intact; only add `test`.)

**Step 4: Add dependency on ax-engine**

Modify `packages/db/package.json` dependencies:
- Add `"@chiron/ax-engine": "workspace:*"`

**Step 5: Implement createAxRepoLayer**

Create `packages/db/src/ax-repository.ts`:

- Follow `packages/db/src/methodology-repository.ts` pattern:
  - `dbEffect(operation, fn)` using `Effect.tryPromise`
  - Map thrown errors into `AxRepositoryError` (or `RepositoryError` if you prefer unification later)
- Implement the minimal repository methods using Drizzle inserts/selects against the new tables.

**Step 6: Export layer from db index**

Modify `packages/db/src/index.ts` to export `createAxRepoLayer`.

**Step 7: Run db tests**

Run: `bun run test -F @chiron/db`
Expected: PASS.

**Step 8: Commit (optional)**

```bash
git add packages/db/src/ax-repository.ts packages/db/src/index.ts packages/db/package.json packages/db/src/ax-repository.layer.test.ts
git commit -m "feat(db): add AxRepository layer"
```

---

## Task 6: Wire AxEngine Facade Stubs (Manual-first)

**Files:**
- Create: `packages/ax-engine/src/engine.ts`
- Modify: `packages/ax-engine/src/index.ts`

**Step 1: Write failing unit test for facade API shape**

Create: `packages/ax-engine/src/engine.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { AxEngine } from "./engine";

describe("AxEngine facade", () => {
  it("exports optimize/recommend/promote APIs", () => {
    expect(AxEngine).toBeDefined();
    expect(typeof AxEngine.optimize).toBe("function");
    expect(typeof AxEngine.promote).toBe("function");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun run test -F @chiron/ax-engine`
Expected: FAIL.

**Step 3: Implement minimal facade**

Create `packages/ax-engine/src/engine.ts` implementing a thin wrapper that:

- Accepts explicit tool-driven calls (no automation)
- Persists run records and variants via `AxRepository`
- Returns a recommended variant id (single selection default)

No optimizer drivers required yet; phase-1 "optimizer" can be a stub that records inputs and returns a placeholder variant entry.

**Step 4: Re-run tests**

Run: `bun run test -F @chiron/ax-engine`
Expected: PASS.

**Step 5: Commit (optional)**

```bash
git add packages/ax-engine/src/engine.ts packages/ax-engine/src/engine.test.ts packages/ax-engine/src/index.ts
git commit -m "feat(ax-engine): add manual-first facade"
```

---

## Task 7: (Optional) Add Tooling-Engine Entry Point Stub For ax-generation

This repo's `packages/tooling-engine` is currently scaffold-only. To keep phase 1 low risk, only add a minimal entry point that later runtime code can call.

**Files:**
- Create: `packages/tooling-engine/src/ax-generation.ts`
- Modify: `packages/tooling-engine/src/index.ts`

**Step 1: Add minimal function export**

```ts
export async function axGenerationToolHandler() {
  // Intentionally stubbed: will call AxEngine.optimize once tooling-engine registry exists.
}
```

**Step 2: Smoke verify module wiring**

Run: `bun run --cwd packages/scripts src/module-wiring-smoke.ts`
Expected: Modules still resolve (no runtime behavior changes).

---

## Verification Checklist (End)

- DB schema compiles: `bun run check-types`
- New tests pass:
  - `bun test packages/db/src/template-repository.integration.test.ts`
  - `bun test packages/db/src/ax-repository.integration.test.ts`
  - `bun run test -F @chiron/db`
  - `bun run test -F @chiron/ax-engine`
- Drizzle migration generates and applies cleanly:
  - `bun run db:generate`
  - `bun run db:migrate`

