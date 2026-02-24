# Epic 1 Scope Boundaries and Carry-Forward Rules (Stories 1.1-1.5)

Date: 2026-02-24
Status: Proposed (intended to be treated as strict process/contract guidance for Epic 1)

## Purpose

Prevent re-litigating foundational modeling decisions across Epic 1 Stories 1.1-1.5 by:

- Defining strict story scope boundaries (allowed vs forbidden changes)
- Freezing a small set of "locked surfaces" at the end of each story
- Establishing carry-forward rules so later stories are incremental and additive
- Requiring decision-log entries (and explicit AC updates) for any changes to locked surfaces
- Defining source-of-truth precedence to resolve conflicts deterministically

## Scope

This document governs Epic 1 Stories 1.1-1.5 as defined in `_bmad-output/planning-artifacts/epics.md`.

This is NOT a schema/API design document for the stories themselves (those should live in story-specific design docs, for example `docs/plans/2026-02-24-story-1-1-methodology-version-draft-design.md`).

## Non-Goals

- Redefining or expanding the platform's locked step capabilities or gate classes
- Introducing new epics, reordering Epic 1, or changing Epic 3+ sequencing policy
- Providing implementation details for endpoints, tables, or UI (except as needed to state boundaries)

## Key Terms

- Locked surface: a modeling or contract decision that is frozen and must not change without governance (decision log + AC update).
- Carry-forward: an explicit list of locked surfaces and outputs that are treated as inputs/constraints for subsequent stories.
- Additive-only: later stories can add new capabilities but cannot rename/repurpose earlier public contracts or relax earlier invariants.

## Source-of-Truth Precedence

Use this precedence order to resolve conflicts and stop re-litigating decisions:

1) Architecture constraints and locked invariants
   - `_bmad-output/planning-artifacts/architecture.md`
   - `docs/architecture/chiron-module-structure.md`

2) Epic/story intent and acceptance criteria
   - `_bmad-output/planning-artifacts/epics.md`

3) Decision log (why + lock status + change protocol)
   - `docs/design/design-decisions.md` (existing)
   - Optional recommended addition: `docs/decisions/` (new ADR-style records)

4) Implementation truth
   - Code under `packages/*` and `apps/*`
   - DB schema under `packages/db/*`

5) Agent and workflow process rules
   - `_bmad-output/project-context.md`

6) Historical archive (never authoritative)
   - `docs/archive/**`

Rule: code cannot silently overrule architecture/story/decision-log. If code conflicts with higher precedence, file a decision-log entry + update affected acceptance criteria (or treat code as a bug).

## Global Locked Surfaces (Epic 1)

These are frozen for Epic 1 and must not be changed by any Epic 1 story:

- Step capability set is locked to: `form`, `agent`, `action`, `invoke`, `branch`, `display`
- Gate class set is locked to: `start_gate`, `completion_gate`
- Deterministic diagnostics posture: equivalent inputs produce equivalent diagnostic content and stable ordering
- Append-only evidence posture: lineage/evidence must be persisted as append-only records and remain queryable in deterministic order

If any of these need to change, the change belongs outside Epic 1 scope and must follow a larger governance pass.

## Decision-Log Requirements

### When a decision-log entry is REQUIRED

Create a new decision record whenever a change would:

- Modify a locked surface (global or story-level)
- Rename/repurpose a previously published external contract (table/field/type/event/endpoint semantics)
- Relax or tighten determinism/evidence guarantees
- Change the meaning of a previously accepted acceptance criterion

### Decision-log entry format (minimum)

Each entry must include:

- Context/problem statement
- Decision (one sentence)
- Options considered (at least 2)
- Consequences/tradeoffs
- Locked surfaces affected (explicit list)
- Migration/compat plan (or explicit statement that this is a breaking change)
- Effective-from story (for example: "effective from Story 1.3")
- Supersedes (list of prior decision IDs, if any)

### Superseding rule

Never silently edit history.

- If changing an earlier decision, create a new record that explicitly supersedes the old one.
- Only fix typos/formatting in old records; do not change their semantic content.

## Carry-Forward Rules (Epic 1)

### Default rule: additive-only

For Stories 1.2-1.5, the default is additive-only changes over Story 1.1 outputs.

Allowed (additive):
- Add new fields to draft payloads (with deterministic validation)
- Add new tables/records for new concepts introduced in later stories
- Add new endpoints for new story capabilities

Forbidden (non-additive without governance):
- Rename or repurpose previously defined contract elements
- Change invariants (for example: allow partial commit on validation failure)
- Change canonical enums/allowlists that are already locked

### Change protocol (required to break additive-only)

Any story that wants to change a locked surface must:

1) Create decision-log entry (see requirements above)
2) List impacted artifacts (ACs, docs, tests, code, schema)
3) Update affected acceptance criteria in `_bmad-output/planning-artifacts/epics.md`
4) Provide migration/compat plan (or explicitly declare breaking change)
5) Add/adjust tests demonstrating the intended new behavior
6) Record evidence that the change is applied and conflicts resolved

## Story-by-Story Scope Boundaries and Locked Surfaces

The story definitions below mirror Epic 1 Stories 1.1-1.5 in `_bmad-output/planning-artifacts/epics.md`.

### Story 1.1: Create Methodology Draft Baseline

Allowed:
- Define draft persistence model for methodology contract authoring
- Deterministic draft validation with structured diagnostics
- Append-only draft lineage/evidence for draft changes

Forbidden:
- Publishing/immutability
- Project pinning/repin policy
- Runtime execution semantics

Locked surfaces introduced by Story 1.1 (carry forward into 1.2-1.5):
- Draft is a lifecycle state on methodology versions (avoid separate "draft entity" model)
- Diagnostics schema and ordering guarantees (stable ordering for equivalent inputs)
- No partial commit on validation failure (transactional mutation)
- Append-only draft evidence contract (queryable lineage ordered deterministically)

### Story 1.2: Define Work Unit Types and Transition Lifecycle Rules in Methodology Draft

Allowed:
- Extend the draft contract with:
  - Work unit types with lifecycle states and transitions
  - Cardinality policy: `one_per_project` or `many_per_project`
  - Facts v1 schema: static typed fields (`string`, `number`, `boolean`, `json`), `required`, optional `default`
  - Dependency/link policies and selectors as described in acceptance criteria
  - Gate class validation for transitions

Forbidden:
- Facts v1 derived expressions or references (explicitly disallowed)
- New gate classes beyond `start_gate` and `completion_gate`
- Any change to Story 1.1 draft persistence model, evidence model, or determinism constraints

Locked surfaces introduced by Story 1.2 (carry forward into 1.3-1.5):
- Facts v1 constraints (static typed fields only; no references/derived expressions)
- Gate class allowlist enforcement
- Reserved `__absent__` pseudo-state constraints and activation edge rules

### Story 1.3: Define Workflows Under Work Unit Scope and Bind Executable Subset to Transitions

Allowed:
- Define workflows under a work unit type within the draft methodology
- Validate workflow step types against locked set: `form`, `agent`, `action`, `invoke`, `branch`, `display`
- Bind only a selected subset of workflows to transitions as "transition-eligible"

Forbidden:
- Introducing new step capability types
- Runtime execution semantics (execution unlocks in Epic 3+)
- Weakening deterministic rejection/diagnostics behaviors

Locked surfaces introduced by Story 1.3 (carry forward into 1.4-1.5):
- Step-type allowlist and deterministic diagnostics for invalid step types
- Binding semantics: "only bound workflows are executable options" and "no bindings blocks deterministically"

### Story 1.4: Publish Validated Methodology Draft as Immutable Version

Allowed:
- Publish operation creates an immutable snapshot of full methodology contract
- Publish validation enforces Facts v1 and other previously locked constraints
- Append-only publish evidence records actor/timestamp/source draft/version/validation summary

Forbidden:
- Modifying contract-defining fields for a published version
- Partial publish/partial snapshot commits

Locked surfaces introduced by Story 1.4 (carry forward into 1.5):
- Immutability constraints for published versions
- Deterministic publish validation outcomes and stable diagnostics shape
- Append-only publish evidence contract

### Story 1.5: Pin Project to Published Methodology Version and Preserve Pin Lineage

Allowed:
- Project pinning to a published methodology version
- Pin lineage queries with append-only pin events
- Explicit repin policy enforcement

Forbidden:
- Implicit repin when new versions publish
- Repin when project has persisted executions (must block deterministically with diagnostics; migration workflow deferred)

Locked surfaces introduced by Story 1.5 (post Epic 1):
- Repin blocking rule when execution history exists
- Pin lineage event ordering and append-only contract

## Optional Enforcement Plan (Repo Workflow)

This section outlines low-cost enforcement so these rules remain real.

1) Add a lightweight "Scope and Locks" section to every Epic 1 story file
   - "Locked surfaces consumed" (list)
   - "New locked surfaces introduced" (list)
   - "Decision records" (links)

2) Add a story-level checklist item for "Foundational modeling change?"
   - If yes: require decision-log entry + explicit update to `_bmad-output/planning-artifacts/epics.md`

3) Add a PR review checklist (human process)
   - Confirm source-of-truth precedence respected
   - Confirm no silent rename/repurpose of locked surfaces
   - Confirm evidence/determinism constraints remain intact

4) (Optional) Extend the create-story template
   - File: `_bmad/bmm/workflows/4-implementation/create-story/template.md`
   - Add sections for locked surfaces + decision-log links
   - Keep it process-only (no new tools/dependencies)

