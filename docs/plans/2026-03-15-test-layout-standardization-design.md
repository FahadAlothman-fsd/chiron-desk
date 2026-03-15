# Test Layout Standardization Design

Date: 2026-03-15
Owner: TEA (Murat)
Status: Approved for planning (continuation-mode)

## Context

Current tests are inconsistent in placement across apps and packages, with desktop tests heavily cluttering `apps/desktop/src/` and mixed patterns across package modules.

Observed state:

- `apps/desktop/src/` contains many `*.test.ts` files at root level.
- `apps/desktop/vitest.config.ts` includes `src/**/*.test.ts`.
- `apps/web` has mixed test placement under feature/route folders and uses `include: ["src/**/*.integration.test.tsx"]`.
- `apps/server` currently has no established `src/tests` convention.
- `packages/*` currently mix root `src/*.test.ts`, `src/**/__tests__`, and implicit discovery with no single colocated folder convention.

Goal: reduce repository clutter, preserve deterministic discovery, and standardize colocated test placement across all apps and packages.

## Decision

Adopt a consistent per-module convention (apps + packages):

- `apps/desktop/src/tests/**`
- `apps/web/src/tests/**`
- `apps/server/src/tests/**` (convention established now; populated as tests are added)
- `packages/*/src/tests/**`

This keeps tests module-local, avoids monorepo-level scattering, and provides predictable organization without introducing new tooling complexity.

## Alternatives Considered

### Option A (Selected): `src/tests/**` per module (apps + packages)

Pros:

- Declutters app `src` roots immediately.
- Keeps tests close to module code and runtime boundaries.
- Minimal config risk (existing include globs generally remain valid).

Cons:

- Requires import path updates for moved files.

### Option B: top-level `apps/*/tests/**`

Pros:

- Very clean source directories.
- Easy to reason about test-only trees.

Cons:

- More frequent path alias/import friction.
- Weaker proximity to implementation modules.

### Option C: hybrid (`__tests__` + app-level integration/e2e)

Pros:

- Flexible for large teams and mature testing taxonomies.

Cons:

- More policy complexity than currently needed.

## Target Structure

### Desktop

Move all root-level desktop tests from:

- `apps/desktop/src/*.test.ts`

to:

- `apps/desktop/src/tests/runtime/**`
- `apps/desktop/src/tests/ipc/**`
- `apps/desktop/src/tests/packaging/**`
- `apps/desktop/src/tests/bootstrap/**`

Exact subgrouping will mirror current test intent to preserve readability.

### Web

Gradually normalize to:

- `apps/web/src/tests/features/**`
- `apps/web/src/tests/routes/**`
- `apps/web/src/tests/lib/**`
- `apps/web/src/tests/utils/**`

Maintain suffix patterns (`.test.ts`, `.integration.test.tsx`) to preserve discovery semantics.

### Server

Establish convention now:

- `apps/server/src/tests/{unit,integration,contract}/**`

No forced migration required immediately if there are no current tests.

### Packages

Normalize package tests into:

- `packages/<name>/src/tests/**`

including migrations from:

- `packages/<name>/src/*.test.ts`
- `packages/<name>/src/**/__tests__/*.test.ts`

Representative examples already found and included in migration scope:

- `packages/contracts/src/*.test.ts`
- `packages/methodology-engine/src/*.test.ts`
- `packages/api/src/__tests__/*.test.ts` and `packages/api/src/routers/*.test.ts`
- `packages/scripts/src/__tests__/*.test.ts`
- `packages/project-context/src/service.test.ts`
- `packages/db/src/*.integration.test.ts`

## Configuration Impact

### Desktop

`apps/desktop/vitest.config.ts` currently uses:

```ts
include: ["src/**/*.test.ts"]
```

This already covers `src/tests/**`, so no mandatory change is required.

### Web

`apps/web/vitest.config.ts` currently uses:

```ts
include: ["src/**/*.integration.test.tsx"]
```

If `.test.ts` files are also moved/standardized, broaden include to cover both unit and integration patterns.

## Migration Strategy

1. **Desktop first (high clutter area)**
   - Move files into `src/tests/**` by domain.
   - Fix relative imports.
   - Run desktop tests.

2. **Web second**
   - Move tests into `src/tests/**` with mirrored structure.
   - Update imports and, if needed, include globs.
   - Run web tests.

3. **Server convention third**
   - Create folders and docs/README note if needed.
   - No-op if no tests yet.

4. **Packages fourth**
   - Move all `packages/*` tests to `src/tests/**` while preserving naming suffixes.
   - Replace `__tests__` pattern with `src/tests/**` for consistency.
   - Run tests for affected packages via workspace Vitest.

## Failure/Recovery Plan

- If import breakage occurs after move, patch imports module-by-module and re-run tests.
- If test discovery regresses, update Vitest include globs minimally.
- Keep migration atomic per app to avoid cross-app debugging ambiguity.

## Verification Plan

- Desktop: `bun --filter desktop test`
- Web: `bun --filter web test`
- Affected packages: `bun --filter <package-name> test`
- Repo-level sanity: `bun run test` (optional final pass)

Success criteria:

- No root-level `src/*.test.ts` in desktop.
- Tests discover and execute successfully under new folders.
- Standardized convention documented and ready for enforcement across apps and packages.

## Follow-up (Planning)

Next step is to generate an implementation plan that executes this migration safely in batches with verification after each app.

## Execution Notes (2026-03-15)

- Desktop migration completed to `apps/desktop/src/tests/{runtime,bootstrap,ipc,packaging}/**`.
- Web migration completed to `apps/web/src/tests/{routes,features,components,lib,utils}/**`.
- Package migration completed for scoped files:
  - `packages/contracts/src/tests/**`
  - `packages/project-context/src/tests/**`
  - `packages/db/src/tests/**`
  - `packages/methodology-engine/src/tests/**`
  - `packages/scripts/src/tests/**` (and removed `src/__tests__` in migrated scope)
  - `packages/api/src/tests/**` (and removed `src/__tests__` in migrated scope)
- Web Vitest include updated to explicitly scan `src/tests/**/*.test.ts`, `src/tests/**/*.test.tsx`, and `src/tests/**/*.integration.test.tsx`.
- Guardrail added:
  - script: `bun run test:layout:guardrail`
  - implementation: `scripts/test-layout-guardrail.mjs`
  - conventions doc: `docs/architecture/testing-layout-conventions.md`

Verification snapshots:

- `bun --filter desktop test` ✅
- `bun --filter web test` ✅
- `bun --filter @chiron/api test` ✅
- `bun --filter @chiron/contracts test` ✅
- `bun --filter @chiron/methodology-engine test` ✅
- `bun --filter @chiron/project-context test` ✅
- `bun --filter @chiron/scripts test` ✅
- `bunx vitest run packages/db/src/tests/repository/methodology-repository.integration.test.ts` ✅
- `bun run test` ✅ (workspace pass)
