# Methodology Version Workspace Direction Design (Story 2.3)

Date: 2026-03-01
Owner: Scrum Master + Product/UX alignment
Scope: Epic 2, Story 2.3 frontend direction reset

## Problem Statement

The current methodology version experience is functionally progressing but visually weak, hard to read, and under-specified at the field/form/validation level. This causes churn, unclear implementation outcomes, and low confidence in publish readiness.

## Goals

1. Make Story 2.3 implementation concrete (fields, forms, validation, states, and outcomes).
2. Improve readability and decision speed for operators.
3. Keep deterministic behavior and auditability requirements intact.
4. Avoid large layout replatforming during Epic 2.

## Non-Goals

- Full visual redesign system overhaul across the entire app in Story 2.3.
- Enabling runtime execution controls (remains Epic 3+).

## Clarifications Captured

- Primary mode: diagnostics-first (`yes` from user)
- Editing mode: sectioned forms with explicit required fields + live validation (default selected)

## Candidate Approaches

### Approach A (Recommended): Diagnostics-First Cockpit on Existing Workspace

Keep current list/graph workspace baseline from Story 2.2, but add a strict interaction contract:
- scoped diagnostics panel,
- sectioned editor forms,
- explicit publish preflight,
- immutable publish result + evidence panel.

Trade-offs:
- Pros: fastest path, minimal churn, highest Story 2.3 delivery confidence.
- Cons: layout skeleton remains familiar (not a full aesthetic reinvention).

### Approach B: Full Form-Centric Redesign (No Graph Priority)

Rebuild screen IA around forms first, moving graph to secondary/optional.

Trade-offs:
- Pros: maximum readability potential.
- Cons: high scope risk, larger regression surface, weak fit with Story 2.2 investments.

### Approach C: Split-Pages for Authoring vs Publish/Evidence

Separate pages: authoring/validation page + publish/evidence page.

Trade-offs:
- Pros: clear mental separation.
- Cons: context-switch overhead, routing complexity, likely overshoots Story 2.3 timeline.

Decision: Choose Approach A for Story 2.3.

## UX Direction (Concrete)

### Information Architecture

Use a 3-region workspace:
1. Left rail: scope navigator (Workflow, Work Units, Transitions).
2. Main canvas: sectioned editor surface (forms + graph context).
3. Right rail: diagnostics and publish/evidence context.

### Visual Readability Contract

- Typography hierarchy:
  - Page title 28/32 semibold
  - Section headers 18/24 semibold
  - Body 14/20 regular
  - Meta labels 12/16 medium
- State tokens (not color-only):
  - Success: teal + check icon + "Valid"
  - Warning: amber + alert icon + "Needs attention"
  - Error: red + x icon + "Blocking"
  - Neutral/info: slate + dot icon + explicit label
- Background structure:
  - Soft vertical gradient base with elevated panels/cards for readable depth
  - High-contrast text minimum AA
- Interaction affordances:
  - Visible focus rings, keyboard navigable diagnostics list and form fields

### Runtime Boundary Contract

Runtime controls stay visible but disabled with exact text:
`Workflow runtime execution unlocks in Epic 3+`

## Field and Form Specification

### Form A: Version Metadata

Fields:
- Methodology Name (read-only)
- Version Label (read-only for published, editable for draft if allowed by contract)
- Draft Title (required, 3-80 chars)
- Summary (required, 10-300 chars)
- Change Note (optional, max 280)
- Last Saved At (read-only)
- Publish State (read-only badge: Draft/Published)

Validation:
- title_required, title_length_invalid
- summary_required, summary_length_invalid

### Form B: Workflow Contract

Fields:
- Workflow Key (required, kebab-case, unique in methodology scope)
- Display Name (required, 3-80)
- Description (optional, max 500)
- Start Gate Type (required; fixed options per architecture)
- Completion Gate Type (required; fixed options per architecture)
- Runtime Execution (disabled toggle + rationale text)

Validation:
- workflow_key_required, workflow_key_invalid_format, workflow_key_not_unique
- start_gate_required, completion_gate_required

### Form C: Work Unit Editor

Fields:
- Work Unit ID (required, immutable after publish)
- Name (required)
- Type (required enum)
- Description (optional)
- Input Contract Ref (required)
- Output Contract Ref (optional)
- Bound Workflow Keys (derived/display)
- Allowed Transition Count (derived/display)

Validation:
- work_unit_id_required, work_unit_id_not_unique
- work_unit_name_required
- work_unit_type_invalid
- work_unit_input_contract_required

### Form D: Transition Editor

Fields:
- Transition ID (required, immutable after publish)
- From Work Unit (required)
- To Work Unit (required)
- Condition Expression (optional, bounded length)
- Gate Scope (required: start/completion)
- Priority/Order (optional integer)

Validation:
- transition_id_required, transition_id_not_unique
- transition_from_required, transition_to_required
- transition_self_loop_disallowed (if contract disallows)
- transition_gate_scope_invalid

## Diagnostics Contract (UI + Behavior)

### Grouping

Diagnostics grouped strictly by scope:
- field
- work unit
- transition
- workflow

### Row Shape

Each diagnostic row renders:
- code
- scope
- blocking (true/false)
- required
- observed
- remediation
- timestamp
- link target (focus anchor to relevant form/graph context)

### Behavior

- Blocking diagnostics disable publish button.
- Clicking diagnostic jumps to field/section and sets visible focus.
- Diagnostics preserve deterministic ordering: blocking desc, scope asc, timestamp asc.

## Publish Flow Contract

### Preflight

- Publish button enabled only when no blocking diagnostics.
- On click: show modal summary:
  - total diagnostics,
  - blocking count,
  - target version label,
  - immutable warning copy.

### Success Result

Render immutable result card:
- publishedVersion
- publishedAt timestamp
- actor
- sourceDraftRef
- validation summary snapshot

### Failure Result

- Keep local edits safe.
- Show deterministic failure diagnostics and remediation.

## Evidence View Contract

Columns (append-only):
- timestamp
- actor
- sourceDraftRef
- publishedVersion
- validationOutcome

Rules:
- Deterministic default sort: timestamp desc, tie-break by publishedVersion asc.
- Filter by actor/version/outcome without mutating source evidence records.

## Immutable Rejection Contract

When editing immutable published fields:
- API rejects deterministically.
- UI displays immutable diagnostic at field and global levels.
- No local-state corruption: untouched editable state remains intact.

## Testing Strategy

### Unit

- Diagnostics grouping/mapping and focus anchors
- Field-level validation and immutable state guards
- Evidence ordering/filter determinism

### Integration

- Blocked publish path with actionable diagnostics
- Successful publish with immutable result rendering
- Immutable edit rejection without local-state corruption
- Runtime controls disabled while publish/evidence remain usable

### Verification Commands

- `bun check`
- `bun check-types`
- targeted `bun run test`

## Implementation Mapping (Story 2.3)

- Keep Story 2.2 feature surfaces and add deterministic contracts.
- Primary files:
  - `apps/web/src/features/methodologies/version-workspace.tsx`
  - `apps/web/src/features/methodologies/version-workspace-graph.tsx`
  - `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.tsx`
  - `packages/api/src/routers/methodology.ts`
  - `packages/methodology-engine/src/validation.ts`
  - `packages/methodology-engine/src/version-service.ts`

## Approval Note

This document is the concrete frontend contract baseline for Story 2.3 and resolves prior ambiguity around fields, forms, validation behavior, publish outcomes, and evidence UX.
