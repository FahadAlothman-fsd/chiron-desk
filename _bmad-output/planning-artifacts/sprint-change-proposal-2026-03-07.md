# Sprint Change Proposal - Desktop Shell Migration (Tauri -> Electron)

Date: 2026-03-07  
Requested by: Gondilf  
Mode used: Batch (ULW)

## 1) Issue Summary

### Trigger
Current implementation ships desktop via Tauri. Concern raised: desktop delivery should remain low-friction, and future desktop iteration velocity should not become tedious.

### Problem Statement
We need to decide whether replacing Tauri with Electron reduces long-term execution friction without violating existing PRD/architecture/UX commitments.

### Evidence Collected
- Current native code is minimal (`apps/web/src-tauri/src/lib.rs`, `apps/web/src-tauri/src/main.rs`) with no custom command surface.
- Renderer appears not coupled to Tauri APIs (`@tauri-apps/api` usage not found in app source).
- Tauri coupling is concentrated in build/dev scripts and packaging config.
- Automation tangent: first-party Playwright MCP is browser-first; Electron automation through MCP is feasible mainly via third-party Electron-capable MCP servers or direct Playwright Electron APIs.

## 2) Impact Analysis

### Epic Impact
- Existing product epics remain valid functionally (orchestration, runtime behavior, UX semantics).
- Change primarily affects platform-delivery stories under desktop packaging/dev workflow.
- Epic sequencing impact: introduce migration spike and shell swap stories before additional desktop polish stories.

### Story Impact
- New migration-focused stories required for:
  - Electron shell scaffold and process model.
  - Dev/build/release script migration.
  - Security baseline (`contextIsolation`, preload, IPC boundaries, CSP policy alignment).
  - Regression validation for desktop behaviors and update/install paths.

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

Rationale:
- Current Tauri-native surface is small, so shell migration can be isolated.
- Product behavior contracts live mostly above shell layer.
- Keeps roadmap momentum while reducing uncertainty via timeboxed spike.

Estimated effort:
- Spike + design decision: 1-2 days
- Electron shell + script/pipeline replacement: 3-5 days
- Hardening, packaging checks, docs/tests: 3-5 days
- Total: ~8-12 working days

Risk assessment:
- Medium overall
- Key risks: packaging/signing process differences, local server lifecycle management, desktop security defaults, installer/update behavior drift.

Timeline impact:
- Short-term: moderate shift of one sprint lane.
- Long-term: potentially improved desktop iteration ergonomics if Electron tooling aligns better with team workflows.

## 4) Detailed Change Proposals

### A. Stories

Story: `[NEW] DESKTOP-MIG-1 Electron Feasibility Spike`  
Section: New story

OLD:
- No dedicated migration decision story.

NEW:
- Produce decision record comparing Tauri vs Electron for this repo.
- Validate Electron can launch/coordinate existing backend runtime in dev and prod modes.
- Document security baseline and packaging plan.

Rationale: de-risks implementation before broad changes.

Story: `[NEW] DESKTOP-MIG-2 Replace Native Shell with Electron`  
Section: New story

OLD:
- Tauri desktop shell stories only.

NEW:
- Add Electron main/preload structure.
- Keep renderer app unchanged except minimal bridge wiring if required.
- Remove Tauri runtime dependency from active path.

Rationale: isolates framework swap to shell layer.

Story: `[NEW] DESKTOP-MIG-3 Native Dev/Build Pipeline Migration`  
Section: New story

OLD:
- `desktop:dev`, `desktop:dev:attach`, `desktop:build` run through Tauri.

NEW:
- Equivalent Electron scripts and packaging flow.
- CI/release docs updated for Electron artifacts.

Rationale: makes desktop delivery operationally complete.

Story: `[NEW] DESKTOP-MIG-4 Desktop Regression + Automation`  
Section: New story

OLD:
- No explicit Electron automation plan.

NEW:
- Define test strategy: direct Playwright Electron automation for core flows.
- Optional MCP path via third-party Electron-capable MCP server for agent-driven sessions.

Rationale: ensures confidence and supports agent workflows.

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
  - Main process boots and supervises local backend process.
  - Preload provides minimal, typed bridge surface.
  - Renderer keeps existing API usage pattern.
  - Security controls: no Node exposure in renderer, strict IPC contracts.

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

### E. MCP/Agent Access Proposal (Research Tangent)

Current state:
- First-party Playwright MCP is browser-centric.
- Electron control via MCP is feasible primarily with third-party Electron-capable MCP servers.

Recommended path:
1. Primary: automate Electron via direct Playwright Electron APIs for stable CI checks.
2. Secondary: add optional third-party Electron MCP server for interactive agent sessions.

Caveats:
- Remote debugging endpoints must be secured.
- Third-party MCP maintenance risk should be tracked.

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
- Documentation and CI pathways updated to Electron-native flow.

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
