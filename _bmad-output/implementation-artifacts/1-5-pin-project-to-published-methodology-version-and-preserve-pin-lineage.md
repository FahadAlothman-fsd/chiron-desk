# Story 1.5: Pin Project to Published Methodology Version and Preserve Pin Lineage

Status: done

## Story

As an operator,
I want to pin a project to a published methodology version,
so that project execution remains stable until I explicitly repin.

## Acceptance Criteria

1. **Given** published methodology versions exist (`V1`, `V2`, ...)
   **When** I pin a project to version `V1`
   **Then** project execution contract resolution uses `V1`
   **And** transition/workflow eligibility checks resolve only against the pinned version.

2. **Given** a project pinned to `V1`
   **When** version `V2` is published
   **Then** the project remains pinned to `V1`
   **And** no implicit repin occurs.

3. **Given** a project pinned to `V1` and no project executions exist
   **When** I explicitly repin to `V2`
   **Then** subsequent execution uses `V2` contract resolution
   **And** repin evidence is appended with actor, timestamp, previousVersion, and newVersion.

4. **Given** a project has one or more persisted executions
   **When** I attempt to repin methodology version
   **Then** repin is blocked deterministically to preserve execution/version consistency
   **And** diagnostics explain that migration workflow support is provided in later epic scope.

5. **Given** a repin request to a non-existent or incompatible version
   **When** the request is processed
   **Then** the system rejects the request deterministically
   **And** returns actionable diagnostics without partial pin-state mutation.

6. **Given** a project with pin history
   **When** I query pin lineage
   **Then** I receive append-only pin events in chronological order
   **And** each event is traceable for audit.

## Tasks / Subtasks

- [x] Implement project pin and explicit repin orchestration in methodology engine (AC: 1, 2, 3, 4, 5)
  - [x] Add typed service entry points for `pinProjectMethodologyVersion`, `repinProjectMethodologyVersion`, and `getProjectPinLineage`.
  - [x] Enforce explicit-repin-only semantics: no automatic repin on publish of newer versions.
  - [x] Ensure contract resolution for transition/workflow eligibility uses the pinned version only.
- [x] Add persistence model for project methodology pin state and append-only pin lineage events (AC: 1, 2, 3, 6)
  - [x] Create `packages/db/src/schema/project.ts` and export it via `packages/db/src/schema/index.ts`.
  - [x] Add `projects` table (minimal identity), `project_methodology_pins` table (current pointer), and `project_methodology_pin_events` table (append-only lineage).
  - [x] Guarantee deterministic chronological ordering (`createdAt`, stable tiebreaker id).
  - [x] Keep pin and event writes transactional with no partial mutation.
- [x] Enforce repin guardrail for execution-bearing projects (AC: 4)
  - [x] Add deterministic precondition check for persisted execution existence before repin.
  - [x] Return typed blocking diagnostics referencing deferred migration workflow scope.
- [x] Enforce invalid-target protections and deterministic diagnostics (AC: 5)
  - [x] Reject non-existent target version and incompatible methodology/version combinations.
  - [x] Return structured diagnostics payload with stable keys and actionable remediation.
- [x] Expose API procedures for pin, repin, and lineage query (AC: 1-6)
  - [x] Extend methodology router contracts and procedure handlers with actor propagation.
  - [x] Preserve key-oriented transport semantics and stable failure mapping.
- [x] Add deterministic tests across engine, repository, and API layers (AC: 1-6)
  - [x] Cover success pin, explicit repin success, repin blocked by execution history, invalid target rejection, no implicit repin, and lineage ordering.
  - [x] Add rollback/atomicity checks proving no partial pin-state mutation on blocked or invalid repin.

## Dev Notes

### Implementation Blueprint (Schemas, Services, API, Tests)

- `packages/contracts`
  - Add pin/repin input/output schemas and lineage event projection schemas.
  - Reuse deterministic diagnostics shape (`code`, `scope`, `blocking`, `required`, `observed`, `remediation`, `timestamp`, `evidenceRef`).
- `packages/methodology-engine`
  - Extend service/repository contracts with pin pointer mutation + append-only lineage event recording.
  - Keep Effect-first boundaries (`Context.Tag`, `Layer`, typed domain errors).
- `packages/db`
  - Add new schema module `packages/db/src/schema/project.ts`.
  - Provisional direction: model current pin as dedicated table (`project_methodology_pins`) instead of a `projects.pinnedMethodologyVersionId` column.
  - Add append-only lineage table (`project_methodology_pin_events`) with deterministic ordering index (`projectId`, `createdAt`, `id`).
  - Add persistence primitives for project->pinnedVersion resolution and append-only pin lineage queries.
  - Keep transactionality and deterministic event ordering.
- `packages/api`
  - Add procedures for pin, repin, and lineage retrieval with deterministic error mapping and actor attribution.
- Tests
  - Engine tests for behavior and diagnostics determinism.
  - Repository integration tests for atomicity and append-only lineage.
  - API tests for transport shape and deterministic failure payloads.

### Developer Context Section

- Story 1.4 already hardened publish immutability and publication evidence; Story 1.5 must consume that published-version foundation without reworking publish semantics.
- Current codebase has no explicit project pin module yet, so this story introduces project-level pin state and pin lineage as first-class backend capabilities.
- Working decision under active review: prefer separate pointer table now (`project_methodology_pins`) to minimize future migration churn when controlled migration and compatibility assessments are introduced in later epics.
- Keep boundaries strict: contracts -> db -> methodology-engine -> api -> tests.

### Implementation Sequence (LLM-Optimized)

1. Add contract schemas/types for pin command, repin command, and lineage query payloads.
2. Extend DB schema/repository for project pin pointer and append-only pin events with transactional write path.
3. Implement methodology-engine orchestration with typed errors and deterministic diagnostics.
4. Wire API procedures with actor propagation and code-driven error mapping.
5. Add deterministic test matrix and regression checks (no implicit repin, no partial writes).

### Technical Requirements

- Pinned version is authoritative for execution contract resolution and transition/workflow eligibility checks.
- Current implementation target (pending final ADR confirmation) is `project_methodology_pins` as source of truth (one active row per project), not an inline field on `projects`.
- Publishing new methodology versions must never change existing project pin pointers implicitly.
- Explicit repin is allowed only when project has no persisted executions.
- Repin for execution-bearing projects is deterministically blocked with actionable diagnostics.
- Invalid target version requests are deterministically rejected with no partial pin-state mutation.
- Pin lineage is append-only, chronologically queryable, and traceable for audit.
- Diagnostic payload structure is stable for equivalent failure inputs.

### Diagnostic Code Matrix (Deterministic Contract)

| code | scope | blocking | Trigger condition | Required remediation |
| --- | --- | --- | --- | --- |
| `PROJECT_PIN_TARGET_VERSION_NOT_FOUND` | `project.pin.target` | `true` | Target methodology version does not exist | Select an existing published version and retry |
| `PROJECT_PIN_TARGET_VERSION_INCOMPATIBLE` | `project.pin.target` | `true` | Target version is outside allowed methodology scope for project | Select a compatible version for the selected methodology |
| `PROJECT_REPIN_BLOCKED_EXECUTION_HISTORY` | `project.repin.policy` | `true` | Project has persisted executions and repin is attempted | Use migration workflow when available in later epic scope |
| `PROJECT_PIN_ATOMICITY_GUARD_ABORTED` | `project.pin.persistence` | `true` | Transaction guard detects risk of partial pin/event write | Investigate persistence failure and retry after guard condition resolves |

Required diagnostic keys for blocked/failed pin operations:
- `code`, `scope`, `blocking`, `required`, `observed`, `remediation`, `timestamp`, `evidenceRef`

### Architecture Compliance

- Keep `api` as transport boundary only; orchestration logic belongs in methodology-engine service layer.
- Keep persistence logic in db repository layer with transactional semantics.
- Keep shared contracts in `packages/contracts` and avoid ad hoc payload contracts in router/service files.
- Preserve append-only evidence posture and deterministic ordering used by current methodology event flows.

### Library/Framework Requirements

- Keep workspace-pinned dependencies unless a blocking defect requires update.
- Latest registry checks (for awareness only):
  - `effect`: `3.19.19`
  - `@effect/platform`: `0.94.5`
  - `hono`: `4.12.3`
  - `drizzle-orm`: `0.45.1`
  - `better-auth`: `1.4.19`

### File Structure Requirements

- Existing touchpoints likely to be extended:
  - `packages/contracts/src/methodology/version.ts`
  - `packages/methodology-engine/src/repository.ts`
  - `packages/methodology-engine/src/errors.ts`
  - `packages/methodology-engine/src/version-service.ts`
  - `packages/db/src/schema/project.ts`
  - `packages/db/src/schema/index.ts`
  - `packages/db/src/methodology-repository.ts`
  - `packages/api/src/routers/methodology.ts`
- Expected new or expanded tests:
  - `packages/methodology-engine/src/version-service.test.ts`
  - `packages/db/src/methodology-repository.integration.test.ts`
  - `packages/api/src/routers/methodology.test.ts`
- If a new dedicated project-pin file/module is introduced, keep it within the same package boundary and preserve existing naming conventions.

### Testing Requirements

- Add deterministic tests for:
  - initial project pin success,
  - no implicit repin after newer version publish,
  - explicit repin success when no execution history exists,
  - deterministic block when execution history exists,
  - non-existent/incompatible target version rejection,
  - append-only lineage query ordering and traceability,
  - transaction rollback/no partial writes on blocked or invalid repin.
- Run at minimum:
  - `bun check`
  - targeted tests for touched packages (`contracts`, `db`, `methodology-engine`, `api`).

### Previous Story Intelligence

- Keep typed, code-driven error mapping end-to-end; avoid string-message classification.
- Preserve required diagnostic key presence (`evidenceRef` included, nullable when needed).
- Protect against key/id mismatches at service/repository boundaries (resolve canonical identifiers before querying).
- Keep atomicity guard logic specific; do not remap unrelated failures into guard-specific codes.

### Git Intelligence Summary

- Recent commits follow layered backend delivery (`contracts -> db -> methodology-engine -> api -> tests`) with deterministic diagnostics and evidence persistence emphasis.
- Keep Story 1.5 changes in the same layered pattern to reduce regression risk and preserve reviewability.

### Latest Tech Information

- Version awareness captured via registry lookups with Bun package metadata.
- No story-scoped dependency upgrade is required by current analysis.

### Project Structure Notes

- This story completes Epic 1 project-version pinning guarantees and prepares Epic 2 UI pin/lineage work.
- Keep this story backend-focused; do not pull Epic 2 UI behavior into Story 1.5 implementation scope.

### References

- Story source: [Source: `_bmad-output/planning-artifacts/epics.md#Story 1.5`]
- Product constraints: [Source: `_bmad-output/planning-artifacts/prd.md`]
- Architecture guardrails: [Source: `_bmad-output/planning-artifacts/architecture.md`]
- UX deterministic diagnostics contract: [Source: `_bmad-output/planning-artifacts/ux-design-specification.md`]
- Project rules: [Source: `_bmad-output/project-context.md`]
- Previous story intelligence: [Source: `_bmad-output/implementation-artifacts/1-4-publish-validated-methodology-draft-as-immutable-version.md`]

### Project Context Reference

- Keep TypeScript strictness and schema-first decoding at package boundaries.
- Preserve Effect service boundaries (`Tag` + `Layer`) and typed errors.
- Maintain append-only evidence persistence and deterministic diagnostics shape.

### Story Completion Status

- Story prepared via create-story workflow.
- Ultimate context engine analysis completed - comprehensive developer guide created.

## Dev Agent Record

### Agent Model Used

openai/gpt-5.3-codex

### Debug Log References

- Workflow: `_bmad/bmm/workflows/4-implementation/create-story/workflow.yaml`
- Instructions: `_bmad/bmm/workflows/4-implementation/create-story/instructions.xml`

### Completion Notes List

- Added project pin contracts and lineage projection schemas in `packages/contracts/src/methodology/version.ts` with schema coverage in `packages/contracts/src/methodology/version.test.ts`.
- Extended methodology engine repository/service and deterministic diagnostics for pin, repin, lineage, invalid target handling, execution-history guardrail, and atomicity guard code mapping.
- Added DB project pin persistence in `packages/db/src/schema/project.ts` and repository transactional pin/repin methods with append-only lineage ordering and execution-history precheck.
- Added API procedures `pinProjectMethodologyVersion`, `repinProjectMethodologyVersion`, and `getProjectPinLineage` with actor propagation.
- Added deterministic tests across engine, DB integration, and API router for pin success, repin success/blocking, invalid target rejection, append-only lineage ordering, and rollback/no partial mutation.
- Validation executed: `bun test packages/contracts/src/methodology/version.test.ts`, `bun test packages/methodology-engine/src/version-service.test.ts`, `bun test packages/db/src/methodology-repository.integration.test.ts`, `bun test packages/api/src/routers/methodology.test.ts`, `bun format`, and `bun check`.
- Code review remediation applied: transition eligibility now resolves via project pin (`projectId`) instead of caller-selected version id, satisfying pinned-version eligibility enforcement.
- Code review remediation applied: repin now requires an existing project pin and returns deterministic diagnostics (`PROJECT_REPIN_REQUIRES_EXISTING_PIN`) when the precondition is not met.
- Code review remediation applied: API/engine test doubles now align with repository repin event semantics and reject repin when no existing pin is present.
- Additional validation executed after remediation: `bun test packages/methodology-engine/src/version-service.test.ts packages/db/src/methodology-repository.integration.test.ts packages/api/src/routers/methodology.test.ts` and `bun check`.

### Senior Developer Review (AI)

- Reviewer: Gondilf
- Date: 2026-02-26
- Outcome: Approved after remediation
- Findings resolved: 2 critical and 2 medium issues addressed (pinned-version eligibility enforcement, repin-on-unpinned guardrail, test double parity, and story/file-list discrepancy coverage).

### Change Log

- 2026-02-26: Applied post-review fixes for AC1/AC3 compliance and deterministic repin guardrails; expanded integration/service/API tests for repin preconditions and pin-resolved eligibility.

### File List

- `packages/contracts/src/methodology/version.ts`
- `packages/contracts/src/methodology/version.test.ts`
- `packages/methodology-engine/src/errors.ts`
- `packages/methodology-engine/src/repository.ts`
- `packages/methodology-engine/src/version-service.ts`
- `packages/methodology-engine/src/version-service.test.ts`
- `packages/db/src/schema/project.ts`
- `packages/db/src/schema/index.ts`
- `packages/db/src/methodology-repository.ts`
- `packages/db/src/methodology-repository.integration.test.ts`
- `packages/api/src/routers/methodology.ts`
- `packages/api/src/routers/methodology.test.ts`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/implementation-artifacts/1-5-pin-project-to-published-methodology-version-and-preserve-pin-lineage.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
