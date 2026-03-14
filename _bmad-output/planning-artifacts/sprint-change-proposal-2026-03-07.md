# Sprint Change Proposal - Desktop Shell Migration (Tauri -> Electron)

Date: 2026-03-07  
Requested by: Gondilf  
Mode used: Batch (ULW)

## 1) Issue Summary

### Trigger
Current implementation ships desktop via Tauri. Concern raised: desktop delivery should remain low-friction, and future desktop iteration velocity should not become tedious.

### Problem Statement
We need to replace Tauri with Electron in a way that preserves the existing renderer/server architecture, keeps Epic 3 intact, and establishes a stable desktop-first foundation before further implementation work resumes.

### Evidence Collected
- Current native code is minimal (`apps/web/src-tauri/src/lib.rs`, `apps/web/src-tauri/src/main.rs`) with no custom command surface.
- Renderer appears not coupled to Tauri APIs (`@tauri-apps/api` usage not found in app source).
- Tauri coupling is concentrated in build/dev scripts and packaging config.
- Playwright MCP desktop interaction was validated through Electron remote debugging/CDP attach, so agent-driven desktop smoke testing remains viable after the cutover.

## 2) Impact Analysis

### Epic Impact
- Existing product epics remain valid functionally (orchestration, runtime behavior, UX semantics).
- Change primarily affects platform-delivery stories under desktop packaging/dev workflow.
- Epic sequencing impact: insert a prerequisite `CC-Foundation` epic before Epic 3 execution; keep Epic 3 design intact and only add dependency gates.

### Story Impact
- New migration-focused stories required for:
  - immediate Tauri removal,
  - Electron shell scaffold and process model,
  - dev/build/release script migration,
  - security baseline (`contextIsolation`, preload, IPC boundaries, CSP policy alignment),
  - web + desktop + server smoke parity,
  - `/bmad-tea-testarch-framework` initialization after migration parity is achieved,
  - final re-baseline of canonical planning artifacts once the real Electron structure is proven.

### Artifact Conflicts
- PRD: desktop target wording should become desktop-shell-neutral or explicitly Electron if decision approved.
- Architecture: add Electron process model and server-process orchestration notes.
- UX: no interaction model rewrite required; ensure parity and hotkey/state behavior unchanged.
- Tooling docs/CI: update native build and release docs currently assuming Tauri toolchain.

### Technical Impact
- High: packaging/release pipeline replacement and native shell bootstrap.
- Medium: dev scripts, local attach workflow, security/preload boundary design.
- Low: renderer React app and server business logic.

## 3) Recommended Approach

Selected path: **Option 1 - Direct Adjustment (with short migration spike)**

Finalized path: **Option 1 - Direct Adjustment via prerequisite `CC-Foundation` epic**

Rationale:
- Current Tauri-native surface is small, so shell migration can be isolated.
- Product behavior contracts live mostly above shell layer.
- Epic 3 can remain intact if migration is treated as a short prerequisite rather than folded into product-story execution.
- Test architecture should target the real post-migration repo structure, not a speculative one.

Estimated effort:
- Spike + design decision: 1-2 days
- Electron shell + script/pipeline replacement: 3-5 days
- Hardening, packaging checks, docs/tests: 3-5 days
- Total: ~8-12 working days

Risk assessment:
- Medium overall
- Key risks: packaging/signing process differences, local server lifecycle management, desktop security defaults, installer/update behavior drift.

Timeline impact:
- Short-term: concentrated prerequisite lane before Epic 3 execution.
- Long-term: improved desktop iteration ergonomics and clearer runtime boundaries once Electron becomes the single desktop shell.

## 4) Detailed Change Proposals

### A. Stories

Story: `[NEW] CCF-1 Remove Tauri Surface`  
Section: New story

OLD:
- Tauri remains active in scripts, config, and `apps/web/src-tauri/**`.

NEW:
- Remove `apps/web/src-tauri/**`.
- Remove Tauri scripts/dependencies from active paths.
- Remove Tauri root/turbo delegation.

Rationale: hard cutover avoids dual-maintenance overhead because active usage is web-first.

Story: `[NEW] CCF-2 Add Electron Shell`  
Section: New story

OLD:
- Tauri desktop shell stories only.

NEW:
- Add Electron main/preload structure.
- Keep renderer app unchanged except minimal bridge wiring if required.
- Enforce secure defaults (`contextIsolation`, no renderer Node exposure, typed preload bridge).

Rationale: isolates framework swap to shell layer.

Story: `[NEW] CCF-3 Establish Runtime Parity`  
Section: New story

OLD:
- `desktop:dev`, `desktop:dev:attach`, `desktop:build` run through Tauri.

NEW:
- Desktop dev attaches to running web/server flow.
- Packaged Electron app starts/attaches backend deterministically.
- Web, desktop, and server smoke path all pass on the new structure.

Rationale: parity must exist before product implementation resumes.

Story: `[NEW] CCF-4 Initialize Test Foundation After Cutover`  
Section: New story

OLD:
- No validated post-migration test architecture baseline.

NEW:
- Initialize `/bmad-tea-testarch-framework` only after Electron migration and smoke parity complete.
- Add desktop interaction smoke using Playwright MCP against the real Electron runtime.

Rationale: test architecture should target the actual repo/runtime structure, not the Tauri-era or speculative interim state.

Story: `[NEW] CCF-5 Lock Thin Core Boundaries`  
Section: New story

OLD:
- `core` package role undefined and at risk of becoming a monolithic refactor bucket.

NEW:
- `core` is allowed only as a thin orchestration layer.
- `packages/contracts` remains the canonical shared contract layer.
- Domain logic remains in existing domain packages.
- `core` must not absorb DB adapters, Electron host code, Hono handlers, or UI code.

Rationale: preserves modularity and prevents the migration from expanding into a package-architecture rewrite.

Story: `[NEW] CCF-6 Re-Baseline Canonical Planning Artifacts`  
Section: New story

OLD:
- PRD and architecture still carry temporary pending course-correction notes and pre-cutover wording.

NEW:
- Re-baseline `/_bmad-output/planning-artifacts/prd.md` after cutover parity is real.
- Re-baseline `/_bmad-output/planning-artifacts/architecture.md` after the Electron structure is proven.
- Remove temporary pending course-correction notes.
- Update canonical docs to reflect final repo/runtime shape: `apps/web`, `apps/desktop`, `apps/server`, thin `core`, `packages/contracts`.

Rationale: canonical planning artifacts should be finalized only after the actual post-cutover structure is validated, not while it is still in transition.

### B. PRD Modifications

Section: Desktop platform implementation notes

OLD:
- Implicit/explicit references to Tauri desktop client in implementation description.

NEW:
- Replace with: "Desktop shell implementation is pluggable; Electron is the approved shell for current roadmap iteration. Product behavior contracts remain unchanged."

MVP impact:
- No change to product goals; implementation-layer swap only.

### C. Architecture Modifications

Section: Client runtime / desktop host

OLD:
- Tauri host assumptions.

NEW:
- Add Electron architecture slice:
  - `apps/web` remains the single renderer source.
  - `apps/desktop` becomes a thin shell only (main/preload/IPC).
  - Main process boots and supervises local backend process where required.
  - Preload provides minimal, typed bridge surface.
  - Renderer keeps existing API usage pattern.
  - Security controls: no Node exposure in renderer, strict IPC contracts.
  - `core` is thin orchestration only; contracts stay in `packages/contracts`, domain rules stay in domain packages.

Ripple effects:
- Update deployment/build diagram and native packaging steps.

### D. UI/UX Specification Updates

Section: Desktop behavior constraints

OLD:
- No framework-specific UX requirement.

NEW:
- Explicitly require parity across shell migration for:
  - command palette and hotkeys,
  - timeline/state labels,
  - deterministic diagnostics behavior,
  - accessibility support.

User impact:
- Migration should be behavior-preserving from user perspective.

### E. MCP/Agent Access Proposal

Current state:
- Playwright MCP is browser-first, but Electron interaction is feasible by attaching to Electron's debugging target and driving the real renderer path.

Recommended path:
1. Primary CI/runtime gate: post-cutover desktop smoke on the real Electron app.
2. Agent validation: Playwright MCP smoke against the real Electron runtime after migration parity.
3. Re-baseline canonical docs only after that parity/testing gate proves the real structure.
4. Optional later enhancement: specialized Electron-capable MCP tooling if interactive needs exceed the current attach model.

Caveats:
- Remote debugging endpoints must be secured.
- MCP validation is a post-migration gate, not a pre-migration blocker.

## 5) Implementation Handoff

Scope classification: **Moderate**

### Routing
- Product Owner / Scrum Master: backlog update and resequencing for migration stories.
- Development team: shell migration, pipeline updates, regression coverage.
- Architect (advisory): security review of preload/IPC and server lifecycle model.

### Responsibilities
- PO/SM: add/sequence DESKTOP-MIG stories and acceptance criteria.
- Dev: implement shell swap and maintain behavioral parity.
- Architect: validate Electron boundary/security posture.

### Success Criteria
- Desktop app runs in dev and packaged modes via Electron.
- Existing core workflows function with no UX regression.
- Security baseline enforced (isolated renderer + explicit IPC).
- Web + desktop + server smoke parity is established.
- `/bmad-tea-testarch-framework` is initialized only after parity is established.
- `core` boundaries are documented and migration work does not expand into monolithic package refactoring.
- PRD and architecture are re-baselined after parity through `CCF-6`, with temporary migration notes removed.

---

## Checklist Snapshot

- 1. Understand trigger/context: [x] Done
- 2. Epic impact assessment: [x] Done
- 3. Artifact conflict analysis: [x] Done
- 4. Path forward evaluation: [x] Done (Option 1 selected)
- 5. Proposal components: [x] Done
- 6. Final review/handoff definition: [x] Done

## Approval Request

Do you approve this Sprint Change Proposal for implementation? (yes/no/revise)
