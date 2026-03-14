# CC-Foundation Electron Cutover Design

**Goal:** Establish a prerequisite CC-Foundation epic that removes Tauri immediately and introduces a thin Electron shell so Epic 3 can continue without architecture drift or deadline risk.

**Primary constraint:** Deliver migration-critical path only. Do not add package restructuring, broad docs cleanup, or optional desktop features before Epic 3 resumes.

---

## Architecture

- Keep `apps/web` as the single renderer source for both web and desktop.
- Add `apps/desktop` as a thin Electron shell containing only main/preload/IPC boundary code.
- Keep `apps/server` as the shared backend for both web and desktop runtime modes.
- Remove Tauri surface (`apps/web/src-tauri/**`, Tauri scripts, Tauri dependencies) in this cutover because current usage is web-first.
- Treat desktop as a second shell for the same product, not a second product.

This keeps TanStack Router/Query and existing renderer behavior intact while isolating runtime concerns to desktop host boundaries.

---

## Scope And Epic Structure

### Recommended structure

- Add a prerequisite epic: `CC-Foundation: Electron Cutover and Runtime Parity`.
- Keep existing Epic 3 intent and stories intact.
- Add an explicit dependency: Epic 3 starts only after CC-Foundation exit gates pass.

### Explicit non-goals

- No core-package consolidation or monolithic `core` refactor.
- No UI extraction to `packages/ui` during cutover.
- No broad planning-doc reorganization before runtime parity is complete.

### Core package boundary decision (locked)

- `core` is allowed only as a thin orchestration layer.
- `core` may contain:
  - use-case orchestration for workflow/methodology transitions
  - ports/interfaces for infrastructure dependencies
  - policy composition and app-level coordination logic
- `core` must not contain:
  - DB adapters, SQL, filesystem/process runtime code
  - Electron main/preload/IPC implementation
  - Hono transport handlers
  - React/TanStack UI concerns
- `packages/contracts` remains source of shared API/domain contracts.
- Domain engines remain in domain packages; `core` orchestrates, not owns domain rules.
- Dependency direction: `domain + contracts -> core -> apps`, with infra adapters implementing `core` ports.

---

## CC-Foundation Stories

### CCF-1 Remove Tauri

- Delete `apps/web/src-tauri/**`.
- Remove Tauri scripts from `apps/web/package.json`.
- Remove root script delegation that depends on Tauri-native flows.
- Remove `@tauri-apps/cli` and any remaining Tauri dependency references.

### CCF-2 Add Electron Shell

- Create `apps/desktop` with Electron `main` and `preload` entrypoints.
- Apply secure defaults:
  - `contextIsolation: true`
  - `nodeIntegration: false`
- Expose only narrow, explicit APIs from preload to renderer.

### CCF-3 Dev Runtime Parity

- Desktop dev mode targets web dev URL (HMR path) and boots backend deterministically.
- Preserve existing web dev flow as independent and unchanged.

### CCF-4 Production Packaging

- Packaged desktop loads built renderer assets correctly.
- Packaged desktop starts or attaches backend in a deterministic order.
- Ensure runtime does not require Bun installation on end-user machines.

### CCF-5 Validation Gate

- Initialize and run `/bmad-tea-testarch-framework` smoke checks.
- Execute Playwright MCP smoke that performs real renderer interactions through desktop runtime (not script-only claims).

---

## Data Flow And Runtime Boundaries

- Renderer (`apps/web`) remains browser-context code only.
- Machine/system operations are performed in Electron main process.
- Preload provides minimal bridge for approved operations.
- App/business workflows continue to communicate with `apps/server` over existing app APIs.
- Avoid importing server/db/auth runtime modules directly into renderer.

---

## Error Handling And Reliability

- Startup failures are explicit and actionable:
  - Renderer asset load failure -> clear desktop error state with recovery hint.
  - Backend startup timeout/failure -> clear status and retry guidance.
- IPC handlers validate payload shape and reject unknown channels.
- Desktop shutdown handles backend child-process cleanup safely.

---

## Testing Strategy

1. **Web baseline:** existing web dev still starts and routes normally.
2. **Desktop dev smoke:** Electron launches against dev URL and executes a basic interaction.
3. **Packaged desktop smoke:** packaged app launches, renderer loads, backend reachable, basic action succeeds.
4. **Playwright MCP interaction smoke:** MCP-driven click/assert flow against desktop runtime path.
5. **Framework gate:** `/bmad-tea-testarch-framework` initialized and green at smoke level.

---

## Exit Criteria Before Epic 3

- Tauri artifacts and scripts are removed from active code path.
- Web dev workflow remains functional.
- Desktop dev workflow is functional.
- Packaged desktop smoke passes.
- Playwright MCP desktop interaction smoke passes.
- `/bmad-tea-testarch-framework` smoke gate passes.

When all criteria pass, Epic 3 continues with no additional architecture detour.
