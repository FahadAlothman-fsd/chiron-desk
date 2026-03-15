# Story CCF.3: Reconcile Runtime Parity Evidence And Defer Packaging Polish

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a release owner,
I want runtime parity evidence reconciled into one explicit checkpoint,
so that Epic 3 starts from confirmed parity while distro and release polish stay deferred.

## Story Metadata

- `intentTag`: `Foundation Prerequisite`
- `frRefs`: `FR2`, `FR5`, `FR7`
- `nfrRefs`: `NFR1`, `NFR5`
- `adrRefs`: `ADR-EF-B01`, `ADR-EF-03`, `ADR-EF-06`
- `gateRefs`: `G2.5`
- `evidenceRefs`: `desktop-dev-parity-log`, `desktop-packaged-parity-log`, `web-desktop-server-smoke-log`, `runtime-bridge-proof-log`, `desktop-self-bootstrap-proof-log`
- `diagnosticRefs`: `desktop-startup-diagnostics`, `server-bootstrap-diagnostics`, `renderer-parity-diagnostics`, `deferred-packaging-polish-log`

## Acceptance Criteria

1. Existing approved implementation evidence is reconciled into one story-local checkpoint proving the following are already true:
   - desktop development can attach to the running renderer/server development environment deterministically
   - packaged desktop loads renderer assets deterministically and starts or attaches the backend in deterministic order
   - packaged desktop execution does not require end users to install Bun manually
   - the same core product flow is reachable from web and desktop modes through the current runtime bridge/bootstrap design.
2. Remaining packaging/distribution polish is explicitly documented as deferred work, including distro polish, installer UX, macOS polish, sandbox/signing polish, and release-hardening concerns.
3. `CCF.4` is left unblocked with a clear statement that test architecture work can begin on the current parity foundation without waiting for later packaging polish.

## Tasks / Subtasks

- [x] Consolidate parity evidence references (AC: 1)
  - [x] Record the concrete command/test/build evidence already produced for dev parity, packaged startup, runtime bridge behavior, and packaged smoke startup.
  - [x] Link the relevant story/artifact/test evidence instead of recreating the implementation.
- [x] Record deferred packaging polish explicitly (AC: 2)
  - [x] List the packaging/distribution concerns intentionally deferred out of the Epic 3 critical path.
  - [x] Distinguish functional parity from release polish so downstream stories do not reopen this scope accidentally.
- [x] Unblock test architecture sequencing (AC: 3)
  - [x] State explicitly that `CCF.4` is the next active foundation story.
  - [x] Ensure sprint tracking and story wording match the new sequencing.

## Dev Notes

- This is now an evidence/reconciliation story, not another implementation story.
- Do not add more runtime-parity engineering unless the evidence pass reveals a concrete blocker for `CCF.4`.
- Treat distro/install/release polish as deferred work for a later cleanup or hardening/release epic after the core Chiron feature epics are complete.
- Reuse existing evidence from the completed Electron shell, runtime bridge, self-bootstrap, packaging, and smoke-verification work instead of repeating large implementation efforts.

## Evidence Checkpoint

- `desktop-dev-parity-log`
  - Desktop shell/runtime tests and dev attach flow were already verified during the Electron shell and runtime bootstrap work.
  - Representative evidence includes the earlier passing desktop test slices covering lifecycle, runtime orchestration, preload/runtime bridge, and packaged runtime contracts.
- `desktop-packaged-parity-log`
  - `bun --filter desktop package:linux` produced `apps/desktop/dist-electron/linux-unpacked/` and `apps/desktop/dist-electron/desktop-0.0.0.AppImage` successfully.
  - Diagnostic smoke launch under `ELECTRON_DISABLE_SANDBOX=1 xvfb-run -a apps/desktop/dist-electron/linux-unpacked/desktop` reached `Started development server: http://localhost:3000`, proving packaged startup, bootstrap, and bundled server launch work on the current Linux target.
- `web-desktop-server-smoke-log`
  - `bun run test` and focused desktop/web bridge tests already proved the same core runtime path is reachable from web and desktop using the current runtime bridge/bootstrap design.
- `runtime-bridge-proof-log`
  - Desktop preload/main/web clients were wired so packaged renderer consumers prefer `window.desktop.runtime.backendUrl` and browser/web mode still falls back to `VITE_SERVER_URL`.
  - Focused web integration tests for auth client, oRPC, and dashboard SSE already passed against that contract.
- `desktop-self-bootstrap-proof-log`
  - Runtime paths, config, secrets, env derivation, bootstrap state management, packaged startup wiring, corrupt-config recovery, and preferred-port fallback were all implemented, verified, and committed in the current foundation stack.

## Deferred Packaging And Release Work

- The remaining desktop + headless server packaging/releasing work is explicitly deferred until after the core Chiron feature epics are finished.
- Deferred scope includes:
  - distro-specific polish and installer UX
  - macOS packaging/release polish
  - sandbox/signing hardening and release-hardening concerns
  - broader desktop/headless-server packaging ergonomics expected from the current OpenCode-style architecture, beyond the parity baseline already achieved here.
- This deferred scope is not a blocker for `CCF.4` or the start of core Chiron implementation work.

## Sequencing Note

- `CCF.3` is now the evidence checkpoint confirming the current parity baseline is good enough to move forward.
- `CCF.4` is the next active foundation story and should start immediately from this baseline.

## Definition of Done

- [x] Existing parity evidence is linked and summarized clearly.
- [x] Deferred packaging/release polish is explicitly recorded.
- [x] Sprint/story sequencing clearly leaves `CCF.4` next.
