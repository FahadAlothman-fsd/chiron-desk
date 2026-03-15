# Test Layout Standardization Migration Map

Date: 2026-03-15
Source plan: `docs/plans/2026-03-15-test-layout-standardization-implementation-plan.md`

## Scope

This map documents exact `old -> new` test paths for:

- `apps/desktop/src/*.test.ts`
- `apps/web/src/**/*.{test.ts,test.tsx,integration.test.tsx}`
- `packages/*/src/*.test.ts`
- `packages/*/src/**/__tests__/*.test.ts`

Target convention: colocated tests under `src/tests/**`.

---

## apps/desktop (`apps/desktop/src/*.test.ts`)

### runtime

- `apps/desktop/src/runtime-orchestration.test.ts` -> `apps/desktop/src/tests/runtime/runtime-orchestration.test.ts`
- `apps/desktop/src/runtime-config.test.ts` -> `apps/desktop/src/tests/runtime/runtime-config.test.ts`
- `apps/desktop/src/runtime-secrets.test.ts` -> `apps/desktop/src/tests/runtime/runtime-secrets.test.ts`
- `apps/desktop/src/runtime-env.test.ts` -> `apps/desktop/src/tests/runtime/runtime-env.test.ts`
- `apps/desktop/src/runtime-paths.test.ts` -> `apps/desktop/src/tests/runtime/runtime-paths.test.ts`
- `apps/desktop/src/runtime-cleanup.test.ts` -> `apps/desktop/src/tests/runtime/runtime-cleanup.test.ts`

### bootstrap

- `apps/desktop/src/runtime-bootstrap.test.ts` -> `apps/desktop/src/tests/bootstrap/runtime-bootstrap.test.ts`
- `apps/desktop/src/preload-contract.test.ts` -> `apps/desktop/src/tests/bootstrap/preload-contract.test.ts`
- `apps/desktop/src/bootstrap-shell.test.ts` -> `apps/desktop/src/tests/bootstrap/bootstrap-shell.test.ts`
- `apps/desktop/src/main-config.test.ts` -> `apps/desktop/src/tests/bootstrap/main-config.test.ts`
- `apps/desktop/src/renderer-readiness.test.ts` -> `apps/desktop/src/tests/bootstrap/renderer-readiness.test.ts`
- `apps/desktop/src/window-creation.test.ts` -> `apps/desktop/src/tests/bootstrap/window-creation.test.ts`
- `apps/desktop/src/renderer-load.test.ts` -> `apps/desktop/src/tests/bootstrap/renderer-load.test.ts`
- `apps/desktop/src/dev-load.test.ts` -> `apps/desktop/src/tests/bootstrap/dev-load.test.ts`

### ipc

- `apps/desktop/src/ipc-contract.test.ts` -> `apps/desktop/src/tests/ipc/ipc-contract.test.ts`
- `apps/desktop/src/workspace-contract.test.ts` -> `apps/desktop/src/tests/ipc/workspace-contract.test.ts`
- `apps/desktop/src/backend-url.test.ts` -> `apps/desktop/src/tests/ipc/backend-url.test.ts`

### packaging

- `apps/desktop/src/server-build-config.test.ts` -> `apps/desktop/src/tests/packaging/server-build-config.test.ts`
- `apps/desktop/src/package-config.test.ts` -> `apps/desktop/src/tests/packaging/package-config.test.ts`
- `apps/desktop/src/packaged-runtime-paths.test.ts` -> `apps/desktop/src/tests/packaging/packaged-runtime-paths.test.ts`
- `apps/desktop/src/package-entrypoint.test.ts` -> `apps/desktop/src/tests/packaging/package-entrypoint.test.ts`
- `apps/desktop/src/packaged-bootstrap-smoke.test.ts` -> `apps/desktop/src/tests/packaging/packaged-bootstrap-smoke.test.ts`
- `apps/desktop/src/packaged-load.test.ts` -> `apps/desktop/src/tests/packaging/packaged-load.test.ts`
- `apps/desktop/src/app-lifecycle.test.ts` -> `apps/desktop/src/tests/packaging/app-lifecycle.test.ts`

---

## apps/web (`apps/web/src/**/*.{test.ts,test.tsx,integration.test.tsx}`)

### routes

- `apps/web/src/routes/dashboard-runtime-backend.integration.test.tsx` -> `apps/web/src/tests/routes/dashboard-runtime-backend.integration.test.tsx`
- `apps/web/src/routes/-methodologies.$methodologyId.versions.$versionId.integration.test.tsx` -> `apps/web/src/tests/routes/-methodologies.$methodologyId.versions.$versionId.integration.test.tsx`
- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.facts.integration.test.tsx` -> `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.facts.integration.test.tsx`
- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.integration.test.tsx` -> `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.integration.test.tsx`
- `apps/web/src/routes/methodologies.$methodologyId.integration.test.tsx` -> `apps/web/src/tests/routes/methodologies.$methodologyId.integration.test.tsx`
- `apps/web/src/routes/methodologies.$methodologyId.versions.integration.test.tsx` -> `apps/web/src/tests/routes/methodologies.$methodologyId.versions.integration.test.tsx`
- `apps/web/src/routes/-projects.pinning-routing.integration.test.tsx` -> `apps/web/src/tests/routes/-projects.pinning-routing.integration.test.tsx`
- `apps/web/src/routes/-projects.integration.test.tsx` -> `apps/web/src/tests/routes/-projects.integration.test.tsx`
- `apps/web/src/routes/-projects.$projectId.pinning.integration.test.tsx` -> `apps/web/src/tests/routes/-projects.$projectId.pinning.integration.test.tsx`
- `apps/web/src/routes/-projects.new.integration.test.tsx` -> `apps/web/src/tests/routes/-projects.new.integration.test.tsx`
- `apps/web/src/routes/-projects.$projectId.integration.test.tsx` -> `apps/web/src/tests/routes/-projects.$projectId.integration.test.tsx`

### features

- `apps/web/src/features/methodologies/version-label.test.ts` -> `apps/web/src/tests/features/methodologies/version-label.test.ts`
- `apps/web/src/features/methodologies/version-workspace.persistence.test.ts` -> `apps/web/src/tests/features/methodologies/version-workspace.persistence.test.ts`
- `apps/web/src/features/methodologies/version-graph.test.ts` -> `apps/web/src/tests/features/methodologies/version-graph.test.ts`
- `apps/web/src/features/methodologies/foundation.test.ts` -> `apps/web/src/tests/features/methodologies/foundation.test.ts`
- `apps/web/src/features/methodologies/command-palette-navigation.test.ts` -> `apps/web/src/tests/features/methodologies/command-palette-navigation.test.ts`
- `apps/web/src/features/methodologies/commands.test.ts` -> `apps/web/src/tests/features/methodologies/commands.test.ts`
- `apps/web/src/features/methodologies/version-workspace.integration.test.tsx` -> `apps/web/src/tests/features/methodologies/version-workspace.integration.test.tsx`
- `apps/web/src/features/methodologies/command-palette.integration.test.tsx` -> `apps/web/src/tests/features/methodologies/command-palette.integration.test.tsx`
- `apps/web/src/features/projects/card-avatar-map.integration.test.tsx` -> `apps/web/src/tests/features/projects/card-avatar-map.integration.test.tsx`

### components

- `apps/web/src/components/app-sidebar.integration.test.tsx` -> `apps/web/src/tests/components/app-sidebar.integration.test.tsx`
- `apps/web/src/components/app-shell.sidebar-sections.integration.test.tsx` -> `apps/web/src/tests/components/app-shell.sidebar-sections.integration.test.tsx`

### lib

- `apps/web/src/lib/auth-client.integration.test.tsx` -> `apps/web/src/tests/lib/auth-client.integration.test.tsx`

### utils

- `apps/web/src/utils/orpc.integration.test.tsx` -> `apps/web/src/tests/utils/orpc.integration.test.tsx`

---

## packages (`packages/*/src/*.test.ts` and `packages/*/src/**/__tests__/*.test.ts`)

### packages/contracts

- `packages/contracts/src/desktop-runtime.test.ts` -> `packages/contracts/src/tests/runtime/desktop-runtime.test.ts`
- `packages/contracts/src/package-entrypoint.test.ts` -> `packages/contracts/src/tests/packaging/package-entrypoint.test.ts`

### packages/project-context

- `packages/project-context/src/service.test.ts` -> `packages/project-context/src/tests/service/service.test.ts`

### packages/db

- `packages/db/src/methodology-repository.integration.test.ts` -> `packages/db/src/tests/repository/methodology-repository.integration.test.ts`

### packages/methodology-engine

- `packages/methodology-engine/src/version-service.test.ts` -> `packages/methodology-engine/src/tests/versioning/version-service.test.ts`
- `packages/methodology-engine/src/lifecycle-validation.test.ts` -> `packages/methodology-engine/src/tests/validation/lifecycle-validation.test.ts`
- `packages/methodology-engine/src/validation.test.ts` -> `packages/methodology-engine/src/tests/validation/validation.test.ts`
- `packages/methodology-engine/src/eligibility-service.test.ts` -> `packages/methodology-engine/src/tests/eligibility/eligibility-service.test.ts`

### packages/scripts (`src/__tests__` -> `src/tests`)

- `packages/scripts/src/__tests__/methodology-seed-integrity.test.ts` -> `packages/scripts/src/tests/seeding/methodology-seed-integrity.test.ts`
- `packages/scripts/src/__tests__/seed-error-handling.test.ts` -> `packages/scripts/src/tests/seeding/seed-error-handling.test.ts`
- `packages/scripts/src/__tests__/story-seed-fixtures.test.ts` -> `packages/scripts/src/tests/seeding/story-seed-fixtures.test.ts`

### packages/api (`src/__tests__` -> `src/tests`)

- `packages/api/src/__tests__/smoke.test.ts` -> `packages/api/src/tests/smoke/smoke.test.ts`

---

## Inventory summary

- Desktop root tests found: **24**
- Web tests in scope found: **24**
  - `.test.ts`: 6
  - `.integration.test.tsx`: 18
  - `.test.tsx` (non-integration): 0
- Package root tests found: **8**
- Package `__tests__` tests found: **4**
- Total mapped: **60**
