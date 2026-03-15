# CCF.5 Core Package Bootstrap Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend Story CCF.5 by creating and wiring a minimal `@chiron/core` package so Epic 3 stories can import a real thin-core seam.

**Architecture:** Add a scaffold-only `packages/core` package (manifest, tsconfig, entrypoint, README) with no runtime behavior, then enforce and document the boundary using existing CCF.5 architecture guardrail tests and docs. Keep `core` orchestration-only and free of transport/UI/infra ownership.

**Tech Stack:** Bun workspaces, Turborepo, TypeScript, Vitest, Markdown architecture artifacts.

---

### Task 1: Add failing guardrail assertions for concrete `@chiron/core` bootstrap (TDD RED)

**Files:**
- Modify: `packages/project-context/src/tests/architecture/core-boundary-lock.test.ts`
- Test: `packages/project-context/src/tests/architecture/core-boundary-lock.test.ts`

**Step 1: Write the failing test assertions**

Add a new test case to assert concrete package bootstrap existence and naming:

```ts
it("requires a concrete @chiron/core package bootstrap for Epic 3", () => {
  const corePackageJson = readRepoFile("packages/core/package.json");
  const coreTsconfig = readRepoFile("packages/core/tsconfig.json");
  const coreEntrypoint = readRepoFile("packages/core/src/index.ts");

  expect(corePackageJson).toContain('"name": "@chiron/core"');
  expect(corePackageJson).toContain('"test"');
  expect(coreTsconfig).toContain('"extends"');
  expect(coreEntrypoint).toContain("core boundary");
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
bunx turbo -F @chiron/project-context test -- core-boundary-lock.test.ts
```

Expected: **FAIL** (missing `packages/core/**` files).

**Step 3: Commit checkpoint (tests-only RED)**

```bash
git add packages/project-context/src/tests/architecture/core-boundary-lock.test.ts
git commit -m "test: require concrete @chiron/core bootstrap guardrail"
```

---

### Task 2: Scaffold minimal `packages/core` and satisfy RED test (TDD GREEN)

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/src/index.ts`
- Create: `packages/core/README.md`
- Test: `packages/project-context/src/tests/architecture/core-boundary-lock.test.ts`

**Step 1: Create package manifest**

```json
{
  "name": "@chiron/core",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "check-types": "tsc --noEmit",
    "test": "vitest run --passWithNoTests"
  },
  "dependencies": {
    "@chiron/contracts": "workspace:*"
  },
  "devDependencies": {
    "typescript": "catalog:",
    "vitest": "catalog:"
  }
}
```

**Step 2: Create package tsconfig**

```json
{
  "extends": "../config/tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "composite": true,
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"]
}
```

**Step 3: Create entrypoint and README**

`packages/core/src/index.ts`:

```ts
/**
 * @chiron/core
 * Thin core boundary package (CCF.5).
 *
 * This package is intentionally scaffold-only.
 * Do not add transport/runtime/UI/infra ownership here.
 */

export const CORE_BOUNDARY_LOCK = "core boundary lock active" as const;
```

`packages/core/README.md`:

```md
# @chiron/core

Thin orchestration boundary package for Chiron.

## Scope

- Allowed: orchestration/use-case coordination, policy composition, ports/interfaces.
- Forbidden: transport handlers, UI components, host/runtime adapters, DB/filesystem/process implementations.
```

**Step 4: Re-run targeted test to verify it passes**

Run:

```bash
bunx turbo -F @chiron/project-context test -- core-boundary-lock.test.ts
```

Expected: **PASS**.

**Step 5: Commit checkpoint (GREEN scaffold)**

```bash
git add packages/core packages/project-context/src/tests/architecture/core-boundary-lock.test.ts
git commit -m "feat: scaffold minimal @chiron/core package"
```

---

### Task 3: Update architecture docs to reference concrete `packages/core`

**Files:**
- Modify: `docs/architecture/modules/README.md`
- Modify: `docs/architecture/chiron-module-structure.md`
- Test: `packages/project-context/src/tests/architecture/core-boundary-lock.test.ts`

**Step 1: Update module responsibility map language**

In `docs/architecture/modules/README.md`, ensure the table references concrete package naming (`packages/core`, `@chiron/core`) while preserving thin-core constraints.

**Step 2: Update thin-core lock section wording**

In `docs/architecture/chiron-module-structure.md`, add explicit note that boundary lock now maps to concrete `packages/core` scaffold and remains governance-constrained.

**Step 3: Extend/add assertions in guardrail test for updated wording**

Add assertions for `packages/core` / `@chiron/core` references in the relevant docs.

```ts
expect(moduleStructure).toContain("packages/core");
expect(modulesReadme).toContain("@chiron/core");
```

**Step 4: Run targeted architecture test**

Run:

```bash
bunx turbo -F @chiron/project-context test -- core-boundary-lock.test.ts
```

Expected: **PASS**.

**Step 5: Commit checkpoint (docs alignment)**

```bash
git add docs/architecture/chiron-module-structure.md docs/architecture/modules/README.md packages/project-context/src/tests/architecture/core-boundary-lock.test.ts
git commit -m "docs: align CCF.5 thin-core lock with concrete @chiron/core package"
```

---

### Task 4: Full verification and CCF.5 artifact status updates

**Files:**
- Modify: `_bmad-output/implementation-artifacts/ccf-5-lock-thin-core-boundaries-before-epic-3.md`
- Modify: `_bmad-output/implementation-artifacts/sprint-status.yaml`

**Step 1: Run full test suite**

Run:

```bash
bun run test
```

Expected: all suites pass.

**Step 2: Run quality checks**

Run:

```bash
bun run check
```

Expected: `oxlint` and `oxfmt --check` pass.

If formatting fails:

```bash
bun run format
bun run check
```

**Step 3: Update story record for extended scope completion**

In `_bmad-output/implementation-artifacts/ccf-5-lock-thin-core-boundaries-before-epic-3.md`:
- ensure tasks/DoD reflect added concrete package bootstrap work
- update completion notes and file list
- set status to `ready-for-review`

**Step 4: Update sprint status**

In `_bmad-output/implementation-artifacts/sprint-status.yaml`:
- set `ccf-5-lock-thin-core-boundaries-before-epic-3: review`

**Step 5: Commit checkpoint (verification + workflow artifacts)**

```bash
git add _bmad-output/implementation-artifacts/ccf-5-lock-thin-core-boundaries-before-epic-3.md _bmad-output/implementation-artifacts/sprint-status.yaml
git commit -m "chore: record CCF.5 core bootstrap completion and review status"
```

---

## Final Verification Checklist

- [ ] `packages/core` scaffold exists with scripts and entrypoint
- [ ] Targeted CCF.5 architecture test fails before scaffold and passes after scaffold
- [ ] Architecture docs explicitly reference concrete `@chiron/core` ownership
- [ ] `bun run test` passes
- [ ] `bun run check` passes
- [ ] Story artifact and sprint status updated to `review`

## Skill References for Execution

- `@superpowers/test-driven-development` (required while implementing)
- `@superpowers/executing-plans` (required to execute this plan)
- `@superpowers/verification-before-completion` (required before completion claim)
