# Methodology Workflow Lock Strategy (Sections 3.9 + 3.10)

**Status:** Proposed (Lock Candidate)
**Last Updated:** 2026-03-08

## Bottom line

Lock `methodology_workflow_steps` (3.9) and `methodology_workflow_edges` (3.10) around a single routing model: edges are the authoritative control-flow graph, and conditional routing is expressed only as `conditionJson` on outgoing edges from `type: branch` steps.

This matches the existing design-time validator behavior in `packages/methodology-engine/src/validation.ts` (branch edges require conditions) and keeps execution deterministic by requiring branch conditions to be mutually exclusive and collectively exhaustive (exactly one match at runtime).

## Decision

1) **Edge graph is authoritative**
- `methodology_workflow_edges` is the canonical control-flow graph for execution and diagramming.
- Step configs do not contain routing logic (no embedded "branches" arrays that duplicate edge conditions).

2) **Where conditions live**
- `methodology_workflow_edges.conditionJson` is:
  - required for all outgoing edges from `type: branch` steps
  - forbidden/ignored for outgoing edges from non-branch steps (must be `null`)

3) **Deterministic branch semantics**
At runtime, a `branch` step evaluates conditions for all its outgoing edges and must select exactly one:
- 0 matches => blocking runtime error (`NO_BRANCH_MATCH`)
- 2+ matches => blocking runtime error (`AMBIGUOUS_BRANCH_MATCH`)

Rationale: this removes reliance on edge ordering (the DB schema has no ordering field), making behavior deterministic even when edge iteration order changes.

4) **Early user interaction before effectful execution**
For `document-project`, require at least one user-confirmation step before any `invoke` step runs.
- Intake form is mandatory first.
- Resume/mode confirmation form is shown when a resumable candidate exists.

5) **Greenfield vs brownfield handling**
- `facts.projectType` is a durable fact captured once in intake.
- Brownfield-only modes (e.g., `deep_dive`) are gated by edge conditions (and optionally reinforced by action-step validation).

6) **Minimal pre-execution required step set**
Before implementing the full execution layer, lock the minimum set of step types and routing rules needed to run `WU.PROJECT_CONTEXT`:
- Step types: `form`, `action`, `branch`, `invoke`, `display`, `agent`
- Graph invariants: single entry edge, >=1 terminal edge, reachability, branch edge condition presence
- Routing invariants: conditionality only on edges from branch steps; exactly-one-match runtime rule

## Context: issues in the current draft

The current draft in `docs/architecture/project-context-only-bmad-mapping-draft.md` mixes multiple partially-specified routing mechanisms:

- Edge conditions exist but are informal objects (e.g. `{ resume_candidate_exists: true }`) instead of a typed condition ADT.
- `form` configs include `showWhen`, but reachability/routing should be graph-driven (edges), not UI visibility.
- `branch` configs include `routeVariable` and inline `params` passing, but branch steps should not mutate and the system has no stable param-passing contract.
- `invoke` config in the draft includes non-contract fields (`workflowRefByStrategy`, etc.).
- Entry/terminal edges are missing from 3.10 even though the definition validator requires them (and the DB schema supports them).

This lock strategy resolves the ambiguity by choosing one routing authority (edges) and specifying deterministic selection rules.

## Locked condition model (edge.conditionJson)

Use the condition ADT shape documented in `docs/architecture/workflow-engine/branch-step-contract.md`, but store it on `methodology_workflow_edges.conditionJson`.

```ts
// Stored in methodology_workflow_edges.conditionJson
export type Condition =
  | { op: "exists"; var: string }
  | { op: "equals"; var: string; value: string | number | boolean }
  | { op: "contains"; var: string; value: string }
  | { op: "gt" | "gte" | "lt" | "lte"; var: string; value: number }
  | { op: "and"; all: Condition[] }
  | { op: "or"; any: Condition[] }
  | { op: "not"; cond: Condition }
```

Resolution rules:
- Variables referenced by `var` must be resolvable from the runtime context/facts at evaluation time.
- Unknown variable => condition evaluates to false (and must produce a deterministic diagnostic message).

## Locked step sequence (3.9) + edge graph (3.10)

This section locks the final step and edge structure for the `WU.PROJECT_CONTEXT` slice described by the draft.

### Workflow: `document-project`

#### Steps (methodology_workflow_steps)

Required keys and types:

1) `intake.capture` (type: `form`)
- Purpose: capture durable project facts.
- Outputs: `facts.projectType`, `facts.projectRootPath`, `facts.projectKnowledgePath`, `facts.existingIndexPath?`

2) `preflight.paths` (type: `action`)
- Purpose: normalize + validate paths before any state lookup.
- Outputs: `context.normalizedProjectRootPath`, `context.normalizedKnowledgePath`, `context.pathValidation`

3) `state.lookup` (type: `action`)
- Purpose: discover resumable state and compute recommended defaults.
- Outputs: `context.resumeCandidate`, `runtime.scanMode` (default recommendation)

4) `resume.route` (type: `branch`)
- Purpose: route to user confirmation if resume candidate exists, else skip to routing.

5) `scan.choice` (type: `form`)
- Purpose: user confirms resume decision and scan mode.
- Outputs: `runtime.resumeDecision`, `runtime.scanMode`
- Note: no `showWhen`; reachability is controlled by edges.

6) `mode.route` (type: `branch`)
- Purpose: route to one of the explicit invoke steps based on `runtime.scanMode` and gating facts.

7) `scan.execute.full-scan` (type: `invoke`)
- Purpose: run full scan child workflow.

8) `scan.execute.deep-dive` (type: `invoke`)
- Purpose: run deep dive child workflow.

9) `scan.execute.resume` (type: `invoke`)
- Purpose: run resume child workflow.

10) `summary.show` (type: `display`)
- Purpose: show required checks + artifact presence summary.

Rationale for explicit invoke steps (instead of passing params):
- Eliminates the need for a param-passing contract.
- Makes the graph self-describing and deterministic.

#### Edges (methodology_workflow_edges)

Include explicit entry and terminal edges.

1) Entry edge:
- `__entry__ -> intake.capture` (fromStepId: null, toStepId: intake.capture)

2) Linear edges:
- `intake.capture -> preflight.paths` (conditionJson: null)
- `preflight.paths -> state.lookup` (conditionJson: null)
- `state.lookup -> resume.route` (conditionJson: null)

3) Resume fanout (branch edges; both edges require conditions):
- `resume.route -> scan.choice` edgeKey: `resume.present`
  - conditionJson: `{ op: "equals", var: "context.resumeCandidate.exists", value: true }`
- `resume.route -> mode.route` edgeKey: `resume.absent`
  - conditionJson: `{ op: "equals", var: "context.resumeCandidate.exists", value: false }`

4) Apply user choice:
- `scan.choice -> mode.route` (conditionJson: null)

5) Mode fanout (branch edges; mutually exclusive):
- `mode.route -> scan.execute.resume` edgeKey: `mode.resume`
  - conditionJson: `{ op: "equals", var: "runtime.scanMode", value: "resume" }`
- `mode.route -> scan.execute.deep-dive` edgeKey: `mode.deep_dive`
  - conditionJson: {
      op: "and",
      all: [
        { op: "equals", var: "runtime.scanMode", value: "deep_dive" },
        { op: "equals", var: "facts.projectType", value: "brownfield" }
      ]
    }
- `mode.route -> scan.execute.full-scan` edgeKey: `mode.full_rescan`
  - conditionJson: `{ op: "equals", var: "runtime.scanMode", value: "full_rescan" }`
- `mode.route -> scan.execute.full-scan` edgeKey: `mode.initial_scan`
  - conditionJson: `{ op: "equals", var: "runtime.scanMode", value: "initial_scan" }`

6) Join + terminal:
- `scan.execute.full-scan -> summary.show` (conditionJson: null)
- `scan.execute.deep-dive -> summary.show` (conditionJson: null)
- `scan.execute.resume -> summary.show` (conditionJson: null)
- Terminal edge: `summary.show -> __terminal__` (fromStepId: summary.show, toStepId: null, edgeKey: `complete`)

### Workflow: `generate-project-context`

#### Steps (methodology_workflow_steps)

1) `discover` (type: `action`)
- Purpose: discover existing context, stack inventory, and rules.

2) `rules.generate` (type: `agent`)
- Purpose: generate rule categories with approvals.

3) `context.finalize` (type: `display`)
- Purpose: validate final structure + show output artifact.

#### Edges (methodology_workflow_edges)

- Entry: `__entry__ -> discover`
- `discover -> rules.generate`
- `rules.generate -> context.finalize`
- Terminal: `context.finalize -> __terminal__` (edgeKey: `complete`)

## Minimal required step set before execution-layer work

To begin execution-layer implementation without churn, the following are the minimum locked requirements:

1) **Graph snapshot model**
- Load steps/edges as a snapshot (single workflow execution reads one immutable snapshot).

2) **Routing**
- Implement edge traversal with the invariants above.
- Evaluate edge conditions only for branch steps.

3) **Step type contracts (minimum semantics)**
- `form`: blocks until required outputs exist.
- `action`: deterministic effectful actions with `stopOnError` semantics.
- `invoke`: run child workflow and capture outputs.
- `display`: read-only, no mutation.
- `agent`: supports approvals + variable outputs (can be stubbed initially if not executing LLMs yet).

## Acceptance criteria (lock is complete)

- 3.9 step keys/types are stable and match edge endpoints.
- 3.10 includes entry + terminal edges for each workflow.
- Branch fanouts have conditions on every outgoing edge.
- The condition ADT is defined and used consistently in `conditionJson`.
- Non-branch edges have `conditionJson: null`.
- The runtime rule "exactly one branch edge matches" is documented as the deterministic behavior.
