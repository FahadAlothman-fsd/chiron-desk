# Methodology Primitives Wireframe (Week 6 Freeze)

Date: 2026-02-17
Status: Prototype/Wireframe (intentionally not final schema)
Purpose: Capture agreed methodology-layer primitives so implementation can start immediately.

---

## 1) What is locked enough to build now

1. Chiron has three planes:
   - Methodology definition (configurable)
   - Workflow/procedure definitions (configurable)
   - Execution engine semantics (locked module contracts)
2. Work is represented as work unit types + work unit instances.
3. Artifact slots are methodology-defined namespaced keys (not hardcoded in Chiron).
4. Snapshots are immutable and versioned; git-backed refs are first-class for code changes.
5. Transition checks are deterministic and only evaluate:
   - required slot outputs
   - required link patterns
   - dependency strength policy
   - allowed project facts
6. Staleness is represented as impact overlays (suspect/stale), with optional transition behavior.

---

## 2) Hierarchical definition propagation (critical design rule)

Definitions from upper levels propagate down.

- Methodology-level ledgers define reusable vocabulary:
  - status ledger
  - link type ledger
  - artifact type ledger
  - dependency strength semantics
- Work unit types should not re-declare meanings redundantly.
- Work unit types define:
  - transition graph (which status-to-status edges are valid)
  - gates and guidance for those transitions
  - slot definitions

Implementation note:
- Status nodes used by work unit state machines are resolved from the methodology ledger.
- Adding a new status should be done at methodology ledger level first, then referenced in transitions.

---

## 3) Transition semantics (clarified)

Transition behavior must separate three checks:

1. Start guard (pre-execution)
   - Can this workflow start for this work unit now?
   - Uses current state, links, project facts, and permissions.

2. Workflow execution (produces required evidence)
   - Steps can write slots, create links, mutate project facts (if allowed), run tools, produce reports.

3. Commit gate (pre-transition-apply)
   - Are transition requirements now satisfied?
   - If yes, apply status transition.
   - If no, workflow can end with no transition and return missing requirements.

Key consequence:
- A workflow can run before gate requirements are fulfilled, because producing those requirements is part of the workflow itself.

---

## 4) Work unit slots and snapshots (clarified)

Slot key examples (methodology-defined):
- `prd.snapshot`
- `architecture.snapshot`
- `story.spec`
- `story.code_change`
- `story.test_report`

Slot behavior:
- Snapshots are always versioned (append-only history).
- Slots have a head policy (`single_head` or `multi_head`).
- Transition evaluation usually targets head snapshot(s).

Recommended slot pattern:
- Primary slot output (gateable)
- Supporting attachments (non-gateable by default)

---

## 5) Links vs gates vs activation

- Link: persistent relation in work graph (`depends_on`, `informed_by`, `parent`, `blocks`, ...).
- Gate: evaluator rule checked at transition commit.
- Activation: pseudo-transition from `__absent__` to initial status (instance creation).

---

## 6) Staleness model (state-machine compatible)

Default representation:
- Detect impact when upstream snapshot digest changes.
- Mark downstream as `suspect` or `stale` overlay.

Methodology-configurable option:
- Overlay can open a transition path (example: `done -> review` or `done -> needs_rebase`) instead of silently forcing status changes.

Rule:
- No global forced status churn by default.
- Transition behavior from stale/suspect is methodology-defined.

---

## 7) Project facts and auditing

Project data split:
- Reserved system fields (provided by Chiron): `project.name`, `project.repoRef`, etc.
- Method-defined project facts (configured per methodology): `projectKind`, `track`, etc.

Audit rule:
- Any fact mutation must be traceable to workflow execution + step/action.
- No untracked direct mutation path.

---

## 8) Agent access model (tools vs MCP)

Current decision direction:
- Chiron-native agents: direct typed tools (Effect services exposed as tool calls).
- External runtimes (OpenCode/future integrations): MCP surface exposing approved subset.

Design principle:
- One capability model, two transports.
- Authorization/scope/audit semantics must be identical regardless of transport.

---

## 9) Automation rule scope

Configuration layering:

1. Methodology defaults (baseline behavior)
2. Project overrides (within allowed bounds)
3. Per-execution overrides (strictly bounded, auditable)

Example knobs:
- auto-continue on safe steps
- ask-user triggers (high-risk approvals, missing required input)
- auto-remediation retries for test/review loops

---

## 10) AX optimization scope (decision note)

Working model:
- Project-scoped optimization data is default.
- Methodology-scoped optimization is optional and should be explicit/opt-in.
- Keep policy simple in v1:
  - methodology variables act as static priors
  - project facts/examples drive project-level adaptation

---

## 11) Minimal implementation priorities (Week 6 to Week 10)

1. Implement methodology ledgers + work unit types + transitions + slots.
2. Implement transition evaluator (start guard + commit gate split).
3. Implement slot snapshot storage with digest and head pointers.
4. Implement project facts with audited mutation.
5. Implement impact overlays (suspect/stale) and optional transition mapping.
6. Implement workflow binding to transitions with minimal intervention defaults.

Out of scope for this phase:
- Perfect schema elegance
- Full optimization policy complexity
- Broad integration ecosystem

---

## 12) Known open points (accepted for later elaboration)

1. Exact slot policy enum names and defaults.
2. Final DSL for guard/gate expressions.
3. Multi-head slot evaluation semantics in gates.
4. Exact mapping from suspect/stale overlays to transition options per methodology.
5. External MCP capability partition details.
