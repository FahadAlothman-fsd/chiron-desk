# Story CCF.4: Initialize Test Foundation After Electron Cutover

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a test architect,
I want the test architecture framework initialized only after Electron cutover parity is real,
so that automation targets the actual repo structure instead of a speculative one.

## Story Metadata

- `intentTag`: `Foundation Prerequisite`
- `frRefs`: `FR5`, `FR7`
- `nfrRefs`: `NFR1`, `NFR2`, `NFR5`
- `adrRefs`: `ADR-EF-04`, `ADR-EF-06`
- `gateRefs`: `G2.5`
- `evidenceRefs`: `post-cutover-testarch-init-log`, `desktop-smoke-framework-log`, `playwright-mcp-desktop-proof-log`
- `diagnosticRefs`: `testarch-bootstrap-diagnostics`, `desktop-smoke-failure-diagnostics`, `playwright-mcp-diagnostics`

## Acceptance Criteria

1. `/bmad-tea-testarch-framework` is initialized against the real post-cutover repository structure, with no Tauri-era assumptions remaining.
2. The framework proves it can exercise the Electron-hosted application path and record reusable evidence for downstream Epic 3 work.
3. The resulting baseline is reusable for web, desktop, and server verification in later stories rather than being a one-off migration check.

## Tasks / Subtasks

- [x] Initialize `/bmad-tea-testarch-framework` against the current Electron-first repo layout (AC: 1)
  - [x] Use the real `apps/web`, `apps/desktop`, `apps/server`, and shared package boundaries.
  - [x] Remove or avoid any remaining Tauri-specific assumptions in setup/config.
- [x] Prove desktop automation against the real Electron runtime (AC: 2)
  - [x] Capture at least one Playwright MCP / desktop-interaction proof against the Electron-hosted app.
  - [x] Persist evidence and diagnostics references for downstream work.
- [x] Establish reusable baseline verification surfaces (AC: 3)
  - [x] Document the baseline checks that later Epic 3 stories should reuse.
  - [x] Keep the framework focused on real repo/runtime structure instead of speculative future architecture.

## Dev Notes

- This is the next active foundation story after the `CCF.3` evidence checkpoint.
- Assume Electron cutover, runtime bridge, self-bootstrap, and packaged parity evidence already exist.
- Focus on building the reusable test/verification foundation needed for actual application work, not on more packaging polish.

## Definition of Done

- [x] Test foundation is initialized against the current repo structure.
- [x] Desktop automation proof is captured.
- [x] Reusable baseline verification notes/evidence are recorded.
