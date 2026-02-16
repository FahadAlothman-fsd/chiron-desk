# Agile/Scrum Methodology Definition (Chiron Methodology Layer)

Snapshot: 2026-02-14  
Audience: senior engineers implementing deterministic workflow/state transitions.

## Scope and Design Goals

This defines a minimal Agile/Scrum model that is:

- Deterministic: transitions are gated only by (1) required output types, (2) required link patterns, and (3) dependency strength policy.
- Toolable: every workflow produces typed artifacts (outputs) that can be generated or executed by Chiron modules.
- Auditable without “evidence kinds”: no transition depends on screenshots, logs, subjective checklists, or “proof”; only on presence of typed outputs and correct link graph.

## Terminology

- Work item: a tracked unit of work (epic/feature/story/bug/spike/chore) with type + status + link graph.
- Output (artifact): a typed record produced by a workflow step (docs, plans, code changes, reports, notes).
- Link: a typed relationship between entities (work items <-> work items, outputs <-> work items).
- Dependency strength: `hard` or `soft` policy controlling when dependencies must be satisfied.

## Identifiers and Link Patterns (Normative)

### Work Item Key Pattern

All work items MUST have a key matching:

- Pattern: `^CH-(E|F|S|B|P|C)-[0-9]{4,}$`
- Examples: `CH-E-0007` (epic), `CH-S-0142` (story)

Type codes:

- `E` epic
- `F` feature
- `S` story
- `B` bug
- `P` spike
- `C` chore

### Output ID Pattern

All outputs MUST have an ID matching:

- Pattern: `^out_[0-9A-HJKMNP-TV-Z]{26}$` (ULID)
- Example: `out_01J8Z6C9K2H4W9J0G4GQZ8W2QF`

### Required Link Fields (Schema-Level)

All entities use a common link envelope:

- Work item links:
  - `links.parent` (0..1)
  - `links.children` (0..n)
  - `links.blocks` (0..n)
  - `links.dependsOn` (0..n)
  - `links.relatedTo` (0..n)

- Output links:
  - `links.workItems` (1..n) MUST include at least one work item key
  - `links.outputs` (0..n) for cross-output chaining if needed

All link targets MUST be either a work item key (matching the pattern above) or an output id (matching the output id pattern).

## Dependency Strength Policy (Normative)

### Dependency Edge

A dependency edge is expressed via a work item’s `links.dependsOn[]` (or `links.blocks[]`) with a strength:

- `hard`: must be satisfied before certain transitions.
- `soft`: can be outstanding but must remain explicitly linked.

### Satisfaction Rule (Deterministic)

A dependency is satisfied if the target work item is in a “terminal done” state:

- Terminal done states: `Done` or `Released`
- Terminal not-done states: `Draft`, `Ready`, `In Progress`, `In Review`, `Blocked`, `Canceled`

### Enforcement Rules

- `hard` dependencies MUST be satisfied before:
  - starting execution work (`Ready` -> `In Progress`)
  - closing work (`In Review`/`In Progress` -> `Done`)
  - releasing (`Done` -> `Released` where used)
- `soft` dependencies NEVER block transitions, but MUST remain linked (no silent removal).

## Work Item Types

### Epic (`CH-E-...`)

Purpose: multi-sprint initiative delivering a meaningful outcome.

Required links:

- MAY have `links.children` to features (preferred) or directly to stories.

Typical outputs:

- `doc/epic-brief`, `plan/roadmap-slice`, `notes/review`, `notes/retro`

### Feature (`CH-F-...`)

Purpose: cohesive capability under an epic; spans multiple stories.

Required links:

- SHOULD have `links.parent` to an epic.
- SHOULD have `links.children` to stories/bugs/spikes/chores.

Typical outputs:

- `doc/feature-brief`, `plan/scope-split`, `notes/review`

### Story (`CH-S-...`)

Purpose: user-valuable increment deliverable within a sprint.

Required links:

- SHOULD have `links.parent` to a feature (or epic if featureless).

Typical outputs:

- `doc/story-kickoff`, `code/change-set`, `report/test`

### Bug (`CH-B-...`)

Purpose: defect fix; may be sprint work or expedited.

Required links:

- MAY link to a story/feature via `links.relatedTo`.

Typical outputs:

- `doc/bug-triage`, `code/change-set`, `report/test`, `notes/release`

### Spike (`CH-P-...`)

Purpose: timeboxed exploration reducing uncertainty; outcome is knowledge, not production change (though code prototypes may exist).

Required links:

- SHOULD have `links.parent` to feature/epic.

Typical outputs:

- `doc/spike-report`, optional `code/change-set` (prototype), optional `doc/decision-record`

### Chore (`CH-C-...`)

Purpose: maintenance (deps, build, refactors, CI, tooling) not directly user-visible.

Required links:

- MAY have `links.parent` to feature/epic.

Typical outputs:

- `doc/chore-kickoff` (optional), `code/change-set`, `report/test`

## Shared Status Model (Default)

All work item types share the same base statuses:

- `Draft`: incomplete definition; not ready to schedule.
- `Ready`: well-formed and can be pulled into a sprint or started.
- `In Progress`: actively being worked.
- `In Review`: awaiting peer review (code and/or doc review).
- `Blocked`: cannot proceed due to an explicit blocker link.
- `Done`: completed work; not necessarily released/deployed.
- `Released`: shipped to users (optional).
- `Canceled`: intentionally stopped; kept for traceability.

## State Machines and Transitions (Normative)

### Common Allowed Transitions

- `Draft` -> `Ready`
- `Ready` -> `In Progress`
- `In Progress` -> `In Review`
- `In Review` -> `In Progress` (rework)
- `In Progress` -> `Blocked`
- `Blocked` -> `In Progress`
- `In Review` -> `Done`
- `Done` -> `Released` (optional)
- Any non-terminal -> `Canceled` (except `Released`)

### Discouraged/Forbidden

- `Draft` -> `In Progress` is NOT allowed (must pass `Ready`).
- `Ready` -> `Done` is NOT allowed (must pass through execution states).
- `Blocked` -> `In Review` is NOT allowed (must unblock first).

## Deterministic Transition Requirements (Normative)

Transition gating MUST use ONLY:

1) required output types present
2) required link patterns satisfied
3) dependency strength policy satisfied

### Output Type Catalog (Used in Gating)

Docs:

- `doc/epic-brief`
- `doc/feature-brief`
- `doc/story-kickoff`
- `doc/bug-triage`
- `doc/spike-report`
- `doc/decision-record`
- `doc/sprint-goal`
- `doc/release-notes`
- `doc/retro-notes`

Plans:

- `plan/product-backlog-slice`
- `plan/sprint-backlog`
- `plan/refinement-notes`

Engineering:

- `code/change-set`
- `review/code-review`
- `report/test`
- `report/increment`

Meetings:

- `notes/sprint-review`
- `notes/story-kickoff`
- `notes/backlog-refinement`

Release:

- `release/candidate`
- `release/record`

### Transition Table (Execution Items: Story/Bug/Chore/Spike)

| From -> To | Required Output Types | Required Link Patterns | Dependency Policy |
|---|---|---|---|
| Draft -> Ready | one of: `doc/story-kickoff` (story), `doc/bug-triage` (bug), `doc/spike-report` (spike), optional `doc/chore-kickoff` (chore) | Output -> WorkItem; if parent exists: Child -> Parent | N/A |
| Ready -> In Progress | `plan/sprint-backlog` AND `notes/story-kickoff` | Output -> WorkItem; `plan/sprint-backlog` links.workItems includes item key | all `hard` deps satisfied |
| In Progress -> In Review | `code/change-set` (or for spikes: `doc/spike-report` acceptable) | Output -> WorkItem | all `hard` deps satisfied |
| In Review -> In Progress | `review/code-review` | Output -> WorkItem | N/A |
| In Review -> Done | `review/code-review` AND `report/test` | both outputs Output -> WorkItem | all `hard` deps satisfied |
| In Progress -> Blocked | `plan/refinement-notes` (or `notes/story-kickoff`) | Output -> WorkItem; workItem.links.blocks includes blocker key(s) | N/A |
| Blocked -> In Progress | `plan/refinement-notes` | Output -> WorkItem; workItem.links.blocks updated to remove resolved blockers | all `hard` deps satisfied |
| Done -> Released | `doc/release-notes` AND `release/record` | both outputs Output -> WorkItem | all `hard` deps satisfied |

### Transition Table (Portfolio Items: Feature/Epic)

| From -> To | Required Output Types | Required Link Patterns | Dependency Policy |
|---|---|---|---|
| Draft -> Ready | `doc/feature-brief` (feature) or `doc/epic-brief` (epic) | Output -> WorkItem; for feature: Child -> Parent recommended | N/A |
| Ready -> In Progress | `plan/product-backlog-slice` | Output -> WorkItem; feature/epic has at least one child in `Ready` or later | N/A |
| In Progress -> In Review | `notes/sprint-review` | Output -> WorkItem; links.children non-empty | N/A |
| In Review -> Done | `notes/sprint-review` AND `report/increment` | outputs Output -> WorkItem; all children terminal | all `hard` deps satisfied |
| Done -> Released | `doc/release-notes` AND `release/record` | outputs Output -> WorkItem | all `hard` deps satisfied |

## Scrum Workflows (Chiron-Orchestratable)

Each workflow below specifies:

- Entry conditions
- Steps: minimal expected sequence (not a meeting script)
- Outputs: typed artifacts
- State transitions enabled

### Backlog Refinement

Outputs:

- `plan/refinement-notes`
- `plan/product-backlog-slice`
- `notes/backlog-refinement`

Transitions enabled:

- `Draft` -> `Ready` (when item-specific kickoff/brief outputs exist)
- Portfolio `Ready` -> `In Progress` (when backlog slice exists)

### Sprint Planning

Outputs:

- `doc/sprint-goal`
- `plan/sprint-backlog`

Transitions enabled:

- Execution items `Ready` -> `In Progress` (with kickoff notes)

### Story Kickoff

Outputs:

- `doc/story-kickoff` / `doc/bug-triage` / `doc/chore-kickoff`
- `notes/story-kickoff`

Transitions enabled:

- `Draft` -> `Ready`
- supports `Ready` -> `In Progress` (when paired with sprint backlog)

### Development

Outputs:

- `code/change-set`

Transitions enabled:

- `In Progress` -> `In Review`

### Code Review

Outputs:

- `review/code-review`

Transitions enabled:

- `In Review` -> `In Progress` (rework)
- (with tests) `In Review` -> `Done`

### Test / QA

Outputs:

- `report/test`

Transitions enabled:

- (with review output) `In Review` -> `Done`

### Release

Outputs:

- `doc/release-notes`
- `release/record` (+ optional `release/candidate`)

Transitions enabled:

- `Done` -> `Released`

### Sprint Review

Outputs:

- `notes/sprint-review`
- `report/increment`

Transitions enabled:

- Feature/Epic `In Progress` -> `In Review`
- Feature/Epic `In Review` -> `Done` (when children are terminal and increment exists)

### Sprint Retrospective

Outputs:

- `doc/retro-notes`
- (optional) new chores/spikes as new work items

## Mapping to Locked Modules (Execution)

This methodology expects:

- variable-service: system of record for work item status + link graph + output registry
- template-engine: generation of `doc/*` and `plan/*` outputs
- sandbox-engine + tooling-engine: all side effects for `code/change-set` and `report/test`
- workflow-engine: orchestration; enforces transition rules; produces step executions + output writes
- provider-registry: model resolution (no silent fallback)
- event-bus: ephemeral transport only
- observability: DB-first event ledger + consent-gated exports
