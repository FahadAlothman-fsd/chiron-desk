# Story CCF.1: Remove Tauri Surface From Active Code Paths

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a platform engineer,
I want to remove Tauri from active scripts, dependencies, and shell artifacts while keeping `apps/web` as the single renderer source and preserving the shared renderer/server architecture,
so that the obsolete Tauri host path is retired and the repository is ready for subsequent Electron cutover work.

## Acceptance Criteria

1. `apps/web/src-tauri/**` is removed from the active codebase, and Tauri-specific scripts and dependencies are removed from supported package surfaces.
2. After cleanup, no active root or package command path references Tauri, and the repository no longer advertises Tauri as a supported desktop host path.
3. Active runtime guidance for this cutover no longer presents Tauri instructions as valid current execution paths; replacement Electron-host instructions are introduced in later stories.
4. A temporary migration guard verifies the web package no longer exposes Tauri-era scripts during CC-Foundation implementation.

## Tasks / Subtasks

 - [x] Add a temporary contract test covering the web package script surface (AC: 1, 2, 4)
   - [x] Create `apps/web/scripts.contract.test.ts` asserting `tauri`, `desktop:dev`, `desktop:dev:attach`, and `desktop:build` are absent from `apps/web/package.json`.
   - [x] Treat this test as a cutover regression guard for CC-Foundation using existing repo test tooling, not as a permanent long-term interface contract or the start of `/bmad-tea-testarch-framework`.
   - [x] Run the targeted existing-Vitest command once before implementation to confirm the test fails against the current Tauri-exposed surface.
- [x] Remove active Tauri script and dependency surfaces (AC: 1, 2)
  - [x] Remove `tauri`, `desktop:dev`, `desktop:dev:attach`, and `desktop:build` from `apps/web/package.json`.
  - [x] Remove `@tauri-apps/cli` from `apps/web/package.json`.
  - [x] Remove `dev:native` and `dev:native:attach` from the root `package.json`.
  - [x] Remove `dev:native` and `dev:native:attach` task definitions from `turbo.json` so root orchestration no longer advertises Tauri-native flows.
- [x] Remove Tauri shell artifacts from the active codebase (AC: 1)
  - [x] Delete `apps/web/src-tauri/**`, including configuration, Rust sources, capabilities, and generated build artifacts still tracked under that tree.
- [x] Re-verify supported command surfaces and active runtime guidance after cleanup (AC: 2, 3, 4)
    - [x] Re-run the targeted Vitest contract test and confirm it passes after the Tauri surface is removed.
    - [x] Confirm active root and package command surfaces no longer advertise Tauri as a supported current execution path.
    - [x] Confirm active developer-facing runtime guidance updated by this story no longer presents Tauri as a supported current execution path, and do not treat archive or historical references as blockers unless they surface in active guidance.

## Dev Notes

- Keep this story scoped to removing the active Tauri runtime surface only. Do not start `apps/desktop` implementation, preload design, IPC wiring, or broader Electron bootstrapping work here; that begins in `CCF.2`.
- This story retires the obsolete Tauri execution surface but does not introduce the replacement Electron host implementation.
- Preserve the current shared renderer/server architecture: `apps/web` remains the single renderer source, `apps/server` remains the shared backend host, and this story must not move domain logic into desktop-specific layers.
- Treat active command surfaces and active runtime guidance as in scope. Archive material, historical notes, and planning references that mention Tauri are not blockers unless they are surfaced as current developer-facing instructions.
- Remove Tauri from the active package/task surface by updating `apps/web/package.json`, the root `package.json`, `turbo.json`, and deleting `apps/web/src-tauri/**`.
- Keep module boundaries intact while cleaning up runtime surfaces: `core` stays thin orchestration only, `contracts` remains the shared boundary, and no refactor should pull Electron, Hono, DB, or UI concerns into the wrong layer.
- Use a focused regression guard to verify the script surface cleanup. `apps/web/scripts.contract.test.ts` is temporary cutover protection for `CC-Foundation`, not a permanent interface contract or the beginning of the later formal test-architecture/framework work.
- Follow existing repo testing conventions: colocated or package-local tests, strict TypeScript/OXC expectations, and verification that the targeted contract test fails before cleanup and passes after cleanup.

### Technical Requirements

- These requirements remove the obsolete Tauri-supported execution surface; they do not introduce Electron host files, runtime wiring, or preload APIs in this story.
- Remove Tauri from the supported web package execution surface in `apps/web/package.json`: delete `tauri`, `desktop:dev`, `desktop:dev:attach`, and `desktop:build`, and remove `@tauri-apps/cli` from devDependencies.
- Remove Tauri from the supported root orchestration surface in `package.json` and `turbo.json`: delete `dev:native` and `dev:native:attach` so root orchestration no longer exposes Tauri-native flows.
- Remove `apps/web/src-tauri/**` from the tracked active codebase, including Rust entrypoints, Tauri config, capabilities, and tracked generated artifacts under that tree.
- Add `apps/web/scripts.contract.test.ts` as a temporary migration guard that asserts the removed Tauri-era scripts are absent from the supported web package surface.
- Verify the guard fails against the pre-removal state and passes after cleanup so the cutover evidence proves the active script surface changed as intended.
- Only update active, developer-facing runtime instructions that currently expose Tauri as a valid execution path.
- Ignore archived, planning, or historical Tauri references unless they leak into supported execution surfaces or active guidance.

### Architecture Compliance

- Enforce the planned migration sequence: `CCF.1` removes the obsolete Tauri host surface, while the replacement Electron host is introduced later in `CCF.2`.
- Preserve the existing runtime topology during cleanup: `apps/web` remains the single renderer, `apps/server` remains the shared backend host, and this story must not change renderer/server responsibilities or package ownership.
- Preserve package and layer boundaries while removing Tauri assets: `core` remains thin orchestration only, `contracts` remains the shared boundary, and no Electron, transport, database, UI, or domain concerns should be moved across layers in this story.
- Keep the change surface closed to removal work only: delete obsolete Tauri package/task/shell assets, stop advertising retired native flows, and do not add `apps/desktop`, preload APIs, IPC contracts, or Electron bootstrap code here.
- Treat success as architectural non-regression during cleanup: obsolete Tauri assets are removed, supported execution surfaces no longer expose Tauri, and domain composition remains unchanged.
- Maintain Turborepo alignment: package-level task surfaces remain authoritative, root orchestration only removes retired Tauri-native entry points, and no new root-only runtime logic is introduced.
- Defer broader runtime re-baselining to later story work: archived, planning, or historical Tauri references are only relevant in `CCF.1` if they leak into supported execution surfaces or active developer-facing guidance; canonical artifact re-baselining belongs in `CCF.6`.

### Library / Framework Requirements

- Follow the planned migration sequence without widening this story's scope: `CCF.1` removes the obsolete Tauri-supported package and workspace surfaces, and `CCF.2` introduces the replacement Electron framework surface.
- This story establishes a clean removal baseline only; it must not introduce replacement desktop framework wiring as part of creating that handoff.
- Use the existing repo toolchain exactly as the cutover baseline for this story: Bun executes workspace commands, Turborepo governs package/task orchestration, TypeScript strict mode remains in force, OXC remains the check/format gate, and existing Vitest usage provides the temporary migration guard evidence.
- Remove Tauri from the supported web package surface only: delete `tauri`, `desktop:dev`, `desktop:dev:attach`, and `desktop:build` from `apps/web/package.json`, and remove `@tauri-apps/cli` so the web workspace no longer advertises or depends on the retired Tauri host flow.
- Remove Tauri from the supported root orchestration surface only: delete `dev:native` and `dev:native:attach` from the root `package.json` and `turbo.json`, while preserving the existing package-task model rather than replacing it with new root runtime behavior.
- Do not add Electron packages, preload helpers, IPC libraries, replacement desktop-host dependencies, or broader framework upgrades in this story; the replacement desktop framework surface is introduced in `CCF.2`.
- Treat the existing React/TanStack/Vite renderer stack and Hono/oRPC/Effect backend stack as unchanged by this cleanup; this story removes obsolete host wiring and does not rework renderer, server, or shared contract frameworks.
- Keep `apps/web/scripts.contract.test.ts` narrowly scoped to the migration risk: it should deterministically prove the retired Tauri-era scripts are absent from the supported web package surface and should not be treated as a permanent long-term interface contract or as a substitute for the later test-architecture/framework work.

### File Structure Requirements

- Treat `CCF.1` as structural retirement of the obsolete Tauri-supported execution surface, not as a transition to the replacement desktop-host file layout.
- Prefer edits to existing workspace files that currently expose supported runtime surfaces, together with removal of the obsolete `apps/web/src-tauri/**` tree.
- Do not create new Electron host directories, preload files, IPC bridges, or replacement desktop runtime structure in this story; replacement host structure is introduced later in `CCF.2`.
- If implementation uncovers additional files that are part of the active Tauri-supported runtime surface or active developer-facing guidance, they may be updated or removed when required to satisfy the acceptance criteria, but this story must not change renderer/server responsibilities, package ownership, or overall repo topology.
- Do not widen the change set into canonical planning-artifact re-baselining, archive cleanup, or general documentation migration unless stale Tauri references leak into supported execution surfaces or active developer-facing guidance.
- Treat success as structural non-regression during cleanup: obsolete Tauri assets are retired, active supported execution surfaces no longer expose or depend on them, and no replacement desktop-host structure is introduced prematurely.

### Testing Requirements

- Use a two-layer verification strategy for `CCF.1`: a narrow automated check built with the repo's existing Vitest tooling proves the supported web package surface no longer exposes retired Tauri scripts, while manual acceptance verification confirms active root/package command surfaces and active developer-facing runtime guidance no longer present Tauri as current.
- Create `apps/web/scripts.contract.test.ts` as a package-local Vitest guard that deterministically asserts `tauri`, `desktop:dev`, `desktop:dev:attach`, and `desktop:build` are absent from the supported `apps/web/package.json` script surface.
- Use the migration-proof sequence defined in the implementation plan: run the targeted test before cleanup to prove it fails against the current Tauri-exposed state, then rerun it after cleanup to prove the supported script surface changed as intended.
- Keep the test narrowly scoped to this story's removal evidence: verify absence of those retired Tauri script entries and avoid expanding it into Electron-host behavior, preload contracts, IPC coverage, or broader renderer/server integration testing.
- Follow repo testing rules from project context: keep the test in `*.test.ts` form, favor deterministic assertions over incidental fixture setup, and validate behavior at the package boundary being changed.
- After cleanup, verify active root and package command surfaces no longer expose Tauri as supported current execution paths.
- After cleanup, separately verify any active developer-facing runtime guidance updated by this story no longer presents Tauri as a valid current execution path.
- Treat archived, planning, or historical Tauri references as manual scope filters rather than automated test cases; they matter in `CCF.1` only if they leak into active supported execution surfaces or active developer-facing guidance.
- Treat `apps/web/scripts.contract.test.ts` as a temporary cutover guard that remains in place for the `CC-Foundation` migration window and can later be migrated, absorbed, or removed once replacement desktop-host coverage, broader desktop surface verification, or `/bmad-tea-testarch-framework` work makes it redundant.
- Keep replacement-host testing out of this story: `CCF.1` verifies retirement of the obsolete Tauri surface, while Electron-host behavior, preload, IPC, and desktop runtime validation begin in later stories once those surfaces exist.

### Project Structure Notes

- Expected touch points for this story are limited to `apps/web/package.json`, `apps/web/scripts.contract.test.ts`, `apps/web/src-tauri/**`, `package.json`, and `turbo.json`.
- `apps/web` stays the renderer package; there is no `apps/desktop` implementation in this story, and no new runtime host package should be introduced as part of Tauri removal.
- Deleting `apps/web/src-tauri/**` includes tracked Rust/config/capability files and any tracked generated artifacts under that tree because they currently represent the active Tauri shell surface being retired.
- Root task orchestration must remain aligned with Turborepo conventions: package-level task surfaces stay authoritative, and root-level scripts should not continue advertising removed native/Tauri flows.
- Allowed change surface in this story is closed: remove obsolete Tauri shell/package/task assets, preserve renderer/server architecture unchanged, and defer new desktop-host construction to `CCF.2`.
- If current runtime guidance must be adjusted to satisfy acceptance criteria, keep the update narrowly focused on active instructions tied to the cutover surface; broader canonical artifact re-baselining belongs later in `CCF.6`.

### References

- `_bmad-output/planning-artifacts/epics.md` - `CC-Foundation: Electron Cutover and Runtime Parity`, story `CCF.1`; primary story-definition source for intent, acceptance criteria, and epic sequencing.
- `docs/plans/2026-03-13-cc-foundation-electron-cutover-implementation-plan.md` - `Task 1: Remove Tauri Wiring`; primary execution source for the implementation sequence, removal touch points, and fail-before/pass-after proof steps.
- `docs/plans/2026-03-13-cc-foundation-electron-cutover-design.md` - supporting design rationale for keeping `apps/web` as the single renderer and deferring replacement desktop-host structure to later story work.
- `_bmad-output/planning-artifacts/architecture.md` - architectural guardrail source for module boundaries, runtime-topology preservation, and the pending note that desktop-host/runtime wording will be re-baselined after `CC-Foundation`.
- `_bmad-output/project-context.md` - repo-rule guardrail source for Bun, Turborepo, strict TypeScript, OXC, package-local `*.test.ts`, and boundary preservation; follow its repo rules, but do not treat its older Tauri-era stack wording as the current cutover baseline when it conflicts with `CCF.1` planning artifacts.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - validation source for desktop-first parity and active developer-facing guidance expectations when checking that obsolete host instructions are no longer presented as current.

## Dev Agent Record

### Agent Model Used

openai/gpt-5.4

### Debug Log References

- `bun test apps/web/scripts.contract.test.ts` (expected RED failure before implementation)
- `bun test apps/web/scripts.contract.test.ts` (GREEN pass after implementation)
- `bun run test`
- `bun run check`
- `bun run check-types`
- `bunx oxfmt --write "apps/web/scripts.contract.test.ts"`
- `bunx vitest run './src/routes/-methodologies.$methodologyId.versions.$versionId.integration.test.tsx'`
- `bunx vitest run './src/routes/methodologies.$methodologyId.versions.$versionId.facts.integration.test.tsx'`
- `bunx oxfmt --write 'apps/web/src/routes/-methodologies.$methodologyId.versions.$versionId.integration.test.tsx'`

### Completion Notes List

- Story preparation is complete: the execution-driving removal scope, proof sequence, and non-regression guardrails are now defined for `CCF.1` implementation.
- Use `_bmad-output/planning-artifacts/epics.md` and `docs/plans/2026-03-13-cc-foundation-electron-cutover-implementation-plan.md` as the primary execution sources; treat `_bmad-output/project-context.md` and `_bmad-output/planning-artifacts/architecture.md` as repo-rule and architecture guardrails.
- This story intentionally stops at Tauri-surface retirement; replacement Electron host work begins in `CCF.2`.
- Temporary migration guard `apps/web/scripts.contract.test.ts` should be re-evaluated once broader desktop-host verification or later `/bmad-tea-testarch-framework` work makes it redundant.
- Added the temporary package-surface contract test at `apps/web/scripts.contract.test.ts`, confirmed it failed before implementation, then passed after removing the retired Tauri-era script surface.
- Removed active Tauri package/task surfaces from `apps/web/package.json`, `package.json`, `turbo.json`, and active runtime guidance in `README.md`; deleted the tracked `apps/web/src-tauri/**` tree.
- Unrelated route integration-test maintenance was split into separate follow-up work so this story remains focused on Tauri-surface retirement.
- Final validation status: `bun run test`, `bun run check`, and `bun run check-types` now pass, so the story is ready for review.

### File List

- `_bmad-output/implementation-artifacts/ccf-1-remove-tauri-surface-from-active-code-paths.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `README.md`
- `apps/web/package.json`
- `apps/web/scripts.contract.test.ts`
- `apps/web/src-tauri/**` (deleted)
- `bts.jsonc`
- `bun.lock`
- `package.json`
- `turbo.json`

## Senior Developer Review (AI)

### Review Date

- 2026-03-14

### Reviewer

- OpenCode (openai/gpt-5.4)

### Findings Summary

- Resolved HIGH finding: `bts.jsonc` no longer advertises `tauri` in the Better-T-Stack reproducible scaffold command or addon list, so active repository metadata now aligns with AC2.
- Resolved MEDIUM finding: `bun.lock` was regenerated with `bun install`, which removed stale `@tauri-apps/cli` residue after the manifest cleanup.
- Confirmed LOW note is non-blocking: `apps/web/scripts.contract.test.ts` is intentionally narrow and temporary for the migration window, which matches the story intent.
- Resolved MEDIUM finding: the route integration-test repairs remain technically valid maintenance, but they are being handled as separate follow-up work rather than as unresolved scope inside `CCF.1`.

### Verification

- `bun install`
- `bun run check`
- `bun run check-types`
- `bun run test`

### Outcome

- Approved. `CCF.1` is complete because the Tauri-removal acceptance criteria are satisfied, and the unrelated route-test maintenance is being handled separately from this story.

## Change Log

- 2026-03-14: Added a temporary script-surface contract test, removed active Tauri package/root task surfaces, deleted `apps/web/src-tauri/**`, updated active runtime guidance, and advanced the story to review after full validation passed.
- 2026-03-14: Senior review fixed remaining active Tauri metadata in `bts.jsonc`, regenerated `bun.lock` to remove stale `@tauri-apps/cli` entries, and returned the story to `in-progress` pending scope cleanup for unrelated route-test repairs.
- 2026-03-14: Reclassified the unrelated route integration-test repairs as separate maintenance work, cleared the review blocker for `CCF.1`, and marked the story done.
