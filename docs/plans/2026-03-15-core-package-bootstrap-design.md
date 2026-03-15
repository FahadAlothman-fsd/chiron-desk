# Core Package Bootstrap Design (CCF.5 Scope Extension)

## Context

CCF.5 already locked thin-core boundaries at documentation/governance level. To make Epic 3 design-time methodology stories executable without ad hoc package creation, we add a minimal, real `packages/core` package now.

User decisions captured:
- Extend CCF.5 instead of creating a separate prerequisite story.
- Implement scaffold-only baseline (no runtime behavior yet).
- Wire package into monorepo now (not deferred).

## Problem Statement

Epic 3 stories need a stable thin-core import seam. Without a concrete `@chiron/core` package, story implementation may drift into inconsistent patterns or recreate package bootstrap logic repeatedly.

## Goals

1. Create a minimal `packages/core` package that exists and can be imported.
2. Keep `core` constrained to thin orchestration boundary expectations.
3. Wire package into workspace/turbo pipelines so it participates in normal dev flows.
4. Preserve CCF.5 gate intent (no transport/runtime/UI/infra leakage into `core`).

## Non-Goals

- No Epic 3 page or feature logic.
- No Hono/Electron/React/TanStack bindings in `core`.
- No adapter implementations (DB/filesystem/process/runtime host).
- No broad architectural expansion beyond scaffold + wiring.

## Architecture

`packages/core` is introduced as a leaf orchestration boundary package with exported entrypoint only.

- Source of truth: `packages/core/src/index.ts`
- Public import seam: `@chiron/core`
- Dependency posture: zero or minimal dependencies (only what is needed for compile/test conventions)
- Responsibility posture: no direct infra/transport/UI/runtime code

The package is intentionally empty of business behavior so Epic 3 can add use-cases incrementally while preserving the thin-core lock.

## Component & File Layout

New package files:
- `packages/core/package.json`
- `packages/core/tsconfig.json`
- `packages/core/src/index.ts`
- `packages/core/README.md`

Guardrail/test updates:
- `packages/project-context/src/tests/architecture/core-boundary-lock.test.ts` (extend)
- Optional new architecture test file under `packages/project-context/src/tests/architecture/` if separation improves clarity.

Documentation touchpoints:
- `docs/architecture/modules/README.md` (explicitly reference concrete `packages/core` package)
- `_bmad-output/implementation-artifacts/ccf-5-lock-thin-core-boundaries-before-epic-3.md` (task/status/file list update after implementation)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (status flow managed by workflow)

## Data Flow / Dependency Direction

No runtime data flow is introduced in this change.

Dependency direction remains locked:

`packages/contracts` (shared seam) ← domain packages ← `packages/core` (orchestration shell) ← app/transport adapters

`packages/core` must not import app-layer frameworks or adapter implementations.

## Error Handling

At this stage, error handling is limited to build/test validation failures:
- Missing package wiring should fail turbo task discovery or import resolution in downstream usage.
- Boundary violations should fail architecture guardrail tests.

No production runtime error paths are added.

## Testing Strategy

TDD for scaffold and guardrails:

1. Add/extend failing architecture tests that assert:
   - `packages/core` directory and required files exist
   - package manifest exposes `@chiron/core`
   - boundary docs map `core` to thin orchestration ownership
2. Run targeted failing test (`RED`).
3. Add minimal package files/wiring to satisfy test (`GREEN`).
4. Re-run targeted test.
5. Run full regression suite and quality checks (`bun run test`, `bun run check`).

## Risks and Mitigations

- **Risk:** accidental over-scaffolding introduces behavior outside scope.
  - **Mitigation:** scaffold-only file set; no orchestrator implementation.
- **Risk:** package exists but is not effectively wired.
  - **Mitigation:** include scripts/tsconfig consistent with workspace package conventions and verify via turbo/test.
- **Risk:** boundary drift post-bootstrap.
  - **Mitigation:** extend CCF.5 guardrail tests to include concrete package presence and ownership constraints.

## Acceptance Criteria (Design-Level)

1. `@chiron/core` package exists with minimal scaffold and compiles/tests within monorepo conventions.
2. Core remains behavior-thin and free of transport/UI/infra/runtime ownership.
3. Guardrail tests enforce both governance text and concrete package bootstrap presence.
4. CCF.5 story artifacts can be updated to reflect this scope extension cleanly.

## Rollout

Single PR/change set under CCF.5 scope extension:
- Add package scaffold
- Add/extend tests and docs
- Run full verification
- Update story/sprint artifacts per workflow status transition
