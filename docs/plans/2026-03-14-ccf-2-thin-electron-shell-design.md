# CCF.2 Thin Electron Shell Design

**Date:** 2026-03-14

**Story:** `ccf-2-add-thin-electron-shell-with-secure-runtime-boundaries`

**Goal:** Add a thin Electron shell that securely hosts the existing web renderer and orchestrates the existing server runtime without reshaping module boundaries.

## Architecture

- Add `apps/desktop` as a new app package that owns only Electron main-process lifecycle, preload boundary, and local backend orchestration.
- Keep `apps/web` as the single renderer source. Electron loads the dev server in development and built `apps/web/dist` assets in packaged mode.
- Keep `apps/server` as an external headless runtime boundary. Electron resolves, probes, attaches, or starts it through a published startup contract instead of importing server internals.

## Runtime Boundaries

- `apps/desktop/main.ts` owns window creation, renderer target resolution, backend resolution, health probing, attach/start decisions, readiness waiting, and blocking startup failures.
- `apps/desktop/preload.ts` exposes a narrow, typed `contextBridge` surface for runtime status and a minimal recovery action.
- `apps/web` consumes the preload contract through local typing only; it does not import Electron directly.
- `apps/server` remains a separate process boundary with an explicit `start:headless` contract.

## Security Model

- Electron window defaults remain secure: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, and preload-mediated access only.
- The preload surface stays narrow: runtime status plus a limited recovery affordance such as `restartLocalServices()`.
- No raw `ipcRenderer`, no generic IPC tunnel, and no Node globals are exposed to the renderer.

## Startup Flow

- Startup order is `resolve -> probe -> attach if healthy -> start if absent -> wait for readiness -> load renderer -> fail clearly`.
- Dev mode targets the existing web dev server and attaches to or starts a local backend using the same orchestration model.
- Packaged mode targets built renderer assets and starts a built headless server artifact when available.
- If packaged backend artifacts are missing or readiness times out, the shell shows a blocking startup error with recovery guidance instead of continuing with a broken renderer.

## Testing Strategy

- Follow strict fail-before/pass-after TDD with package-local Vitest tests under `apps/desktop/src/*.test.ts`.
- Test secure window configuration first, then renderer resolution, then backend URL/probe/orchestration behavior, then blocking startup failure behavior.
- Add one deterministic contract assertion for `apps/server/package.json` `start:headless`.
- Keep tests focused on the desktop host boundary; parity hardening and end-to-end desktop smoke remain later-story work.

## Scope Guardrails

- Do not move renderer, domain, transport, or `core` logic into `apps/desktop`.
- Do not extract a shared orchestration package in this story.
- Do not widen scope into packaged installer flow, parity hardening, remote attach, or desktop-only product behavior.

## Planned Files

- `apps/desktop/package.json`
- `apps/desktop/tsconfig.json`
- `apps/desktop/vitest.config.ts`
- `apps/desktop/main.ts`
- `apps/desktop/preload.ts`
- `apps/desktop/src/*.test.ts`
- `apps/web/src/types/desktop.d.ts`
- `apps/server/package.json`
- Minimal root script delegation only if needed
