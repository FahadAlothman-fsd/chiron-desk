# Chiron North Star + Non-Negotiables (Week 6, Tuesday)

Date: 2026-02-17
Status: Active working brief
Database posture: SQLite-only (current horizon)

## 1) Clarification Memo: What Is Locked vs Still Open

This memo corrects an important nuance.

### Locked now (architecture boundary contracts)

- Execution step capability contract is locked to six step types:
  - `form`
  - `agent`
  - `action`
  - `invoke`
  - `branch`
  - `display`
- Module responsibility boundaries in `docs/architecture/modules/*.md` are the reference constraints.
- Method/work-item execution bridge principles are locked at abstraction level:
  - deterministic transition checks
  - typed output evidence
  - link/dependency policy
  - auditable execution trace

### Still open (must be finalized now)

- Methodology workflow configurations (exact state graphs, transition rules per type, gate detail).
- Artifact slot catalog and final naming/typing conventions.
- Template definitions and prompt composition details.
- Final mapping between legacy taxonomy and current sample BMAD mapping into one unified definition set.
- Practical activation policies, automation defaults, and operator UX constraints.

### Legacy taxonomy status (correct interpretation)

- Legacy taxonomy is not discarded.
- It remains a key input for final definitions.
- Current sample BMAD mapping and legacy taxonomy are merged intentionally to produce final canonical model.

## 2) North Star

Chiron delivers a methodology-first execution system where planning intent and runtime behavior stay synchronized through deterministic, auditable transitions, while preserving high operator velocity with minimal required intervention.

## 3) Non-Negotiables

1. Methodology layer is first-class: work units, transitions, slots, snapshots, and gates are primary runtime concepts.
2. Locked six-step execution contract is honored at runtime boundaries.
3. Transition decisions are deterministic and evidence-based (typed outputs + links + dependency policy).
4. SQLite is the exclusive DB for this horizon; hot JSON access paths must be indexed or materialized.
5. User interruption is minimized; prompts occur only for required inputs, explicit approvals, or hard gate failures.
6. Architecture documents are living sources of truth and will be heavily edited to match final model.
7. Legacy lessons are explicitly carried forward and mapped into the new architecture; no knowledge regression.
8. Deletions are parity-gated: remove legacy code only after equivalent behavior is proven.

## 4) Legacy Lessons to Carry Forward

1. Parent/child invoke output mismatches must be prevented by explicit output contracts and normalization.
2. Variable/path ambiguity creates fragility; prefer typed outputs and clear promotion rules.
3. Over-flexible extraction rules increase hidden coupling; keep evaluator inputs explicit and bounded.
4. Runtime transparency matters: gate failures must be explainable in product UI, not only logs.
5. Migration quality depends on controlled fallbacks, feature flags, and rollback checkpoints.
6. Execution and planning cannot drift: status transitions must be mechanically checkable.
7. Historical taxonomy contains useful semantics and should be mapped, not erased.

## 5) Documentation Finish Plan (Today, Week 6 Tuesday)

### Deliverables by end of day

1. Finalized canonical definitions draft:
   - unified work-unit taxonomy
   - transition model per key unit types
   - slot/snapshot catalog v1
2. Locked/open matrix doc:
   - what is fixed now
   - what remains configurable
   - decision owners for each open item
3. Updated architecture set:
   - module docs revised to match selected runtime behavior
   - workflow-step contracts cross-linked to methodology decisions
4. SQLite runtime note:
   - JSON key index plan
   - hot-path query constraints
   - performance guardrails
5. Legacy-to-new mapping appendix:
   - legacy term -> canonical term
   - retained semantics
   - deprecated semantics with rationale

### Owner model

- PM/Architect owner: canonical definition sign-off and lock/open matrix.
- Dev owner: SQLite constraints, evaluator constraints, and runtime integration notes.
- SM/PO owner: cut lines, sequencing, and acceptance traceability.

### Exit criteria for today

- No unresolved ambiguity on locked vs open boundaries.
- Canonical term map exists and is approved.
- Architecture docs and method docs are mutually consistent.
- Team can begin implementation without reinterpretation risk.

## 6) Recommended Wording Replacements

Replace this type of wording:

- "migration-era docs/specs mix older step naming/taxonomy"

With this wording:

- "migration-era docs and legacy taxonomy remain valuable inputs; we are now consolidating them with current BMAD mapping into one canonical definition set under locked execution-step capability contracts."

Replace this type of wording:

- "today's locked 6-step contracts ..."

With this wording:

- "the execution-step capability boundary is currently locked to six step contracts; methodology configurations, artifact/template definitions, and taxonomy mappings remain open and are being finalized now."

Replace this type of wording:

- "new posture: keep architecture/docs/design as source-of-truth"

With this wording:

- "new posture: architecture/docs/design remain source-of-truth and will be actively revised to encode final canonical definitions while preserving validated legacy lessons."
