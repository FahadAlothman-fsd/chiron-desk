# Story CCF.5: Lock Thin Core Boundaries Before Epic 3

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an architect,
I want the thin-core boundaries explicitly locked before Epic 3 starts,
so that runtime and delivery work cannot drift into a monolithic orchestration layer.

## Story Metadata

- `intentTag`: `Foundation Prerequisite`
- `frRefs`: `FR2`, `FR5`, `FR7`
- `nfrRefs`: `NFR1`, `NFR2`, `NFR5`
- `adrRefs`: `ADR-EF-B01`, `ADR-EF-02`, `ADR-EF-03`
- `gateRefs`: `G2.5`
- `evidenceRefs`: `core-boundary-decision-log`, `package-responsibility-map`, `epic3-prerequisite-architecture-log`
- `diagnosticRefs`: `boundary-violation-diagnostics`, `package-ownership-diagnostics`

## Acceptance Criteria

1. `core` is explicitly defined as thin orchestration/use-case coordination only; domain rules remain in domain packages and shared contracts remain in `packages/contracts`.
2. Architecture boundaries are documented such that `core` is allowed only orchestration, ports/interfaces, and app-level policy composition, and explicitly forbidden from DB/filesystem/process adapters, Electron host code, Hono transport handlers, and React/TanStack UI code.
3. Epic 3 cannot start unless thin-core boundaries are explicitly locked and referenced in planning artifacts.

## Tasks / Subtasks

- [x] Create and ratify a thin-core boundary decision record for Epic 3 gating (AC: 1, 3)
  - [x] Add/update architecture decision notes that define `core` scope as orchestration/use-case coordination only in:
    - `docs/architecture/chiron-module-structure.md`
    - `_bmad-output/planning-artifacts/architecture.md`
  - [x] Explicitly list allowed `core` responsibilities and forbidden responsibilities.
  - [x] Reference FR/NFR/ADR gate links in the decision record.
- [x] Produce/update package responsibility mapping with ownership boundaries (AC: 1, 2)
  - [x] Map `core`, `workflow-engine`, `methodology-engine`, `project-context`, `contracts`, API transport, and app shells to concrete responsibilities.
  - [x] Record dependency direction and anti-coupling rules (contracts-centered dependency rule).
  - [x] Add boundary diagnostics expectations for ownership violations in:
    - `docs/architecture/modules/README.md`
    - `_bmad-output/planning-artifacts/epics.md` (evidence/gate reference consistency only)
- [x] Lock Epic 3 prerequisite references in canonical planning artifacts (AC: 3)
  - [x] Ensure epics/architecture/planning references clearly state Epic 3 start is blocked until CCF.5 boundary lock is complete.
  - [x] Update traceability/evidence pointers so later stories can prove compliance without reinterpretation.
  - [x] Confirm CCF.6 re-baseline story sequencing remains intact after boundary lock.
- [x] Add verification guardrails for developers implementing Epic 3 work (AC: 2, 3)
  - [x] Define checks that reject transport/runtime/UI leakage into `core`.
  - [x] Define checks that reject adapter/infrastructure implementation inside `core`.
  - [x] Define a short review checklist for boundary compliance in dev-story and code-review workflows.
- [x] Bootstrap concrete thin-core package seam for Epic 3 consumers (scope extension)
  - [x] Add `packages/core` with minimal scaffold (`package.json`, `tsconfig.json`, `src/index.ts`, `README.md`).
  - [x] Update architecture guardrail tests to require concrete `@chiron/core` package presence.
  - [x] Update canonical architecture docs to reference `packages/core` / `@chiron/core` while preserving thin-core constraints.

## Dev Notes

### Developer Context Section

- This story is a **planning + architecture lock** prerequisite for Epic 3; treat it as boundary governance, not feature delivery.
- The objective is to remove ambiguity about package ownership and prevent monolithic drift into `core`.
- Keep the existing architecture intent stable: this story clarifies and enforces boundaries rather than introducing new modules or capabilities.

### Technical Requirements

- `core` must remain thin and orchestration-oriented; no direct ownership of infrastructure adapters, transport handlers, host-shell logic, or UI components.
- Domain behavior stays in domain-oriented packages (`workflow-engine`, `methodology-engine`, `project-context`, etc.).
- Cross-module coupling should flow through contracts/interfaces rather than internal type imports.
- Epic 3 promotion language must include explicit dependency on this boundary lock completion and evidence references.

### Allowed vs Forbidden Core Ownership

| Area | Allowed in `core` | Forbidden in `core` |
| --- | --- | --- |
| Orchestration | Use-case coordination, policy composition, orchestration flow | Transport request handling, UI event handling |
| Contracts | Define/use ports/interfaces, compose contract-facing use-cases | Re-define transport DTOs as domain contracts |
| Infrastructure | Reference abstractions only | DB/filesystem/process adapters, persistence implementations |
| Runtime hosts | Call host ports via contracts | Electron main/preload/runtime ownership |
| Transport | Be called by transport adapters | Hono/oRPC route handlers, protocol wiring |
| UI | Expose deterministic outputs/contracts | React/TanStack rendering or component logic |

### Dependency Direction (Locked)

`packages/contracts` (shared seam) ← domain packages (`workflow-engine`, `methodology-engine`, `project-context`) ← `core` orchestration/policy ← app/transport adapters (`apps/server`, `apps/desktop`, `apps/web`)

Notes:
- Cross-module sharing flows through `packages/contracts`.
- `core` consumes domain/contracts; adapters call into `core`.
- No reverse ownership leak from transport/runtime/UI into `core`.

### Architecture Compliance

- Respect canonical module responsibilities and dependency direction; `contracts` is the shared boundary contract center.
- Preserve API/server transport role (Hono SSE/oRPC edge) as composition + transport, not domain/core behavior.
- Preserve workflow-engine effectful boundaries (Tag/Layer contracts, explicit error channels, no direct internals crossing).
- Preserve locked capability taxonomy and gate semantics from planning architecture; do not extend scope in this story.

### Library / Framework Requirements

- Electron security boundary guidance remains mandatory for host/runtime edge concerns: narrow preload/contextBridge surface, validate IPC sender, keep context isolation/sandbox expectations explicit.
- Hono best-practice guidance remains mandatory for transport layer composition: route-local/factory handlers and modular `app.route()` composition.
- This story should codify where these concerns live (**outside `core`**) and prevent them from being pulled into core orchestration.

### File Structure Requirements

- Keep responsibility statements aligned with canonical architecture docs under `docs/architecture/**` and planning artifacts under `_bmad-output/planning-artifacts/**`.
- Do not relocate or redefine package/module boundaries in ad hoc story notes; document through canonical artifacts and explicit references.
- Ensure evidence/diagnostic identifiers in this story are consistent with epics metadata naming.

### Testing Requirements

- Include lightweight boundary-verification criteria suitable for dev-story/code-review phases:
  - reject forbidden code categories in `core` (adapters/transport/host/UI)
  - assert contracts-centered dependency direction
  - verify Epic 3 gating references remain present after related story edits
- Prefer deterministic, repeatable checks and explicit evidence IDs over informal narrative confirmation.

### Verification Commands / Checks

- Forbidden import surface checks (repo-agnostic; run from repository root):
  - `git grep -nE "from ['\"](apps/desktop|apps/web)" -- 'packages/**'`
  - `git grep -nE "from ['\"]hono|@hono" -- 'packages/**'`
  - `git grep -nE "from ['\"]react|@tanstack" -- 'packages/**'`
  - Optional targeted pass when a concrete core package exists: `git grep -nE "from ['\"](apps/desktop|apps/web|hono|react)|@tanstack|@hono" -- 'packages/core/**'`
- Ownership leak checks:
  - Confirm `core` files declare/consume ports/interfaces only for persistence/runtime/transport concerns.
  - Confirm adapter implementations live in transport/runtime/infra modules, not in `core`.
- Gate integrity checks:
  - Confirm CCF.5 references remain in `_bmad-output/planning-artifacts/epics.md` and sprint progression artifacts.
  - Confirm Epic 3 stories reference CCF.5 boundary lock as prerequisite.

### Boundary Examples

Valid examples:
- `core` composes a `RunWorkflowUseCase` that depends on `PersistExecutionPort` and `EmitEventPort` abstractions.
- `core` defines retry/idempotency/approval policies applied to domain orchestration.

Invalid examples:
- `core` directly importing Hono route context and parsing HTTP request payloads.
- `core` directly implementing sqlite/filesystem writes or Electron preload APIs.

### Previous Story Intelligence (CCF.4)

- CCF.4 established a reusable post-Electron test foundation and confirmed no Tauri-era assumptions should remain.
- Continue using that baseline and do not re-open runtime-cutover debates here; this story is boundary lock for architecture governance.
- Maintain sequencing discipline: CCF.5 locks boundaries; CCF.6 then re-baselines planning artifacts; Epic 3 starts only after these prerequisites are satisfied.

### Git Intelligence Summary

- Recent commits show explicit documentation-first governance and architecture/testing boundary reinforcement (story updates + sprint status transitions).
- Recent test-layout migrations to package-local `src/tests` reinforce ownership boundaries; mirror this clarity in boundary mapping artifacts.
- Keep story language and evidence references explicit so downstream dev/code-review automation can enforce constraints with minimal ambiguity.

### Latest Technical Information

- Electron official security guidance emphasizes strict boundary surfaces (context isolation, sandboxing, narrow preload APIs, validated IPC sender). Treat these as host/runtime concerns and keep them out of `core` ownership.
- Hono official best-practice guidance emphasizes transport-layer composition patterns and type-safe route design; these belong to API/transport modules, not core orchestration.
- No new framework migration is required in this story; the requirement is to lock and document existing architectural placement correctly.

### Project Structure Notes

- Alignment confirmed with canonical structure and module ownership guidance:
  - `packages/contracts` remains the shared contract seam.
  - Domain modules keep domain logic.
  - Transport/host/UI remain outside `core`.
- Known variance to acknowledge in planning language: some legacy wording still references pre-cutover desktop terminology; this story should preserve authoritative module boundaries while documenting current Electron reality.

### References

- [Source: _bmad-output/planning-artifacts/epics.md (Story CCF.5, lines 260-292)]
- [Source: _bmad-output/planning-artifacts/architecture.md (module responsibilities, dependency direction, transport/runtime boundaries, progression gates)]
- [Source: _bmad-output/planning-artifacts/prd.md (FR/NFR anchors, scope and delivery strategy)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md (deterministic contract ownership and UX/backend boundary expectations)]
- [Source: docs/architecture/chiron-module-structure.md (canonical module ownership and contracts-centered dependency rule)]
- [Source: docs/architecture/workflow-engine/effectful-design.md (effect boundaries and error-channel contracts)]
- [Source: docs/architecture/workflow-engine/agent-step-contract.md (agent step boundaries and deterministic completion semantics)]
- [Source: docs/architecture/modules/README.md (module responsibility index)]
- [Source: https://www.electronjs.org/docs/latest/tutorial/security]
- [Source: https://hono.dev/docs/guides/best-practices]

## Evidence Mapping

| Evidence ID | Canonical Artifact | Proves | Reviewer Check |
| --- | --- | --- | --- |
| `core-boundary-decision-log` | `docs/architecture/chiron-module-structure.md` (+ planning snapshot mirror where required) | AC1, AC2 | Allowed/forbidden ownership is explicit and unchanged by transport/runtime concerns |
| `package-responsibility-map` | `docs/architecture/modules/README.md` | AC1, AC2 | Module ownership and dependency direction are explicit; no ambiguous `core` ownership |
| `epic3-prerequisite-architecture-log` | `_bmad-output/planning-artifacts/epics.md` + sprint artifacts | AC3 | Epic 3 gate is explicitly blocked until CCF.5 evidence is complete |

## Definition of Done

- [x] Thin-core boundary decision is explicitly documented and references evidence IDs.
- [x] Package responsibility map is updated with allowed/forbidden ownership boundaries.
- [x] Epic 3 prerequisite gating language is explicit and traceable in planning artifacts.
- [x] Boundary diagnostics/review checks are documented for downstream implementation and review workflows.
- [x] Gate proof is explicit: Epic 3 remains blocked unless all three evidence IDs (`core-boundary-decision-log`, `package-responsibility-map`, `epic3-prerequisite-architecture-log`) are present, current, and cross-referenced.
- [x] Concrete thin-core package seam exists as `packages/core` (`@chiron/core`) and remains scaffold-only.

### PR Boundary Review Checklist (Fail-Fast)

- [ ] Does this change keep `core` limited to orchestration/policy/ports only?
- [ ] Does this change avoid adding transport/runtime/UI/framework handler logic to `core`?
- [ ] Are persistence/process/filesystem/runtime host concerns implemented outside `core` behind ports?
- [ ] Are contracts/interfaces in `packages/contracts` still the cross-module seam?
- [ ] If Epic 3-related, does the PR preserve CCF.5 gate references and evidence links?

## Dev Agent Record

### Agent Model Used

opencode/gpt-5.3-codex

### Debug Log References

- Workflow: `_bmad/bmm/workflows/4-implementation/dev-story/instructions.xml`
- Validation checklist: `_bmad/bmm/workflows/4-implementation/dev-story/checklist.md`
- TDD verification:
  - RED (governance docs): `bunx turbo -F @chiron/project-context test -- core-boundary-lock.test.ts` (failed on missing boundary lock sections)
  - GREEN (governance docs): `bunx turbo -F @chiron/project-context test -- core-boundary-lock.test.ts` (4/4 passed)
  - RED (concrete package seam): `bunx turbo -F @chiron/project-context test -- core-boundary-lock.test.ts` (failed on missing `packages/core/package.json`)
  - GREEN (concrete package seam + docs): `bunx turbo -F @chiron/project-context test -- core-boundary-lock.test.ts` (5/5 passed)
  - Regression and quality: `bun run test` (all suites passed), `bun run check` (oxlint + oxfmt --check passed)

### Completion Notes List

- Added architecture thin-core boundary lock section with explicit allowed/forbidden `core` ownership, FR/NFR/ADR/G2.5 traceability, and dev-story/code-review boundary checklists in `docs/architecture/chiron-module-structure.md`.
- Added package responsibility map, contracts-centered dependency direction, and diagnostic expectations in `docs/architecture/modules/README.md`.
- Added explicit Epic 3 prerequisite lock section in `_bmad-output/planning-artifacts/architecture.md` and aligned gate/evidence language in `_bmad-output/planning-artifacts/epics.md`.
- Added deterministic architecture guardrail test `packages/project-context/src/tests/architecture/core-boundary-lock.test.ts` to verify lock sections and evidence references across canonical artifacts.
- Added concrete package seam scaffold at `packages/core` for thin-core ownership (`@chiron/core`) with no transport/runtime/UI/infra behavior.
- Updated architecture references to point to concrete `packages/core` / `@chiron/core` naming while preserving locked dependency direction.

### File List

- `packages/project-context/src/tests/architecture/core-boundary-lock.test.ts`
- `packages/core/package.json`
- `packages/core/tsconfig.json`
- `packages/core/src/index.ts`
- `packages/core/README.md`
- `docs/architecture/chiron-module-structure.md`
- `docs/architecture/modules/README.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/planning-artifacts/epics.md`
- `bun.lock`
- `_bmad-output/implementation-artifacts/ccf-5-lock-thin-core-boundaries-before-epic-3.md`
