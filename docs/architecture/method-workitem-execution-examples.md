# Method-WorkItem-Execution Examples (Phase 1)

**Last Updated:** 2026-02-14  
**Status:** Locked (examples)

This document provides three rigorous end-to-end examples for the phase-1 planning/execution bridge.

Assumptions used consistently across all examples:

- Execution plane is stable (workflow-engine, step types, variable-service, template-engine, agent-runtime, tooling-engine, sandbox-engine, provider-registry, event-bus, observability).
- Planning/method plane provides:
  - work item types and status legend
  - type-level transition requirements (required link patterns + required output variable types)
  - workflow path sequences (optional/required nodes)
  - workflow capability declarations (what a workflow can produce/update)
- Instance plane provides:
  - concrete work item instances
  - concrete work item links (depends_on/informed_by/references/parent_of with hard/soft/context)
  - executions bound to work items (optional for standalone workflows)
- Transition checks are deterministic:
  - validate required output variable types against typed outputs recorded for linked executions
  - validate required link patterns against instance-level work item links
  - apply dependency strength policy (hard blocks, soft warns, context informational)

See also: `docs/architecture/method-workitem-execution-contract.md`.

---

## Common Vocabulary

- **Work item type**: a method-defined type key (for example `prd`, `architecture`, `story`, `research`).
- **Work item instance**: a project instance of a type (for example `WI-PRD-001`).
- **Artifact**: blueprint/spec entity.
- **Artifact snapshot**: versioned rendered instance using concrete variables.
- **Typed output**: execution output recorded with `varKey`, `varType`, and a reference payload.

---

## Example 1 - BMAD Greenfield (TaskFlow) to First Story Done

### Goal

Start from no codebase and complete the first implementation story with code + verification.

### Method Setup (BMAD v1) - minimal assumptions

Status legend (method-wide): `draft`, `ready`, `in_progress`, `review`, `done`, `blocked`.

Work item types:

- `research` (many)
- `brainstorm` (many)
- `product_brief` (one_per_project)
- `prd` (one_per_project)
- `architecture` (one_per_project)
- `story` (many)

Transition requirements (illustrative, deterministic):

- `prd: draft -> ready` requires:
  - required links: at least one `informed_by` link to (`brainstorm` OR `research`) (soft)
  - required output types: `artifact_ref` (PRD snapshot)

- `architecture: draft -> ready` requires:
  - required links: `depends_on(hard)` link to `prd` (hard)
  - required output types: `artifact_ref` (architecture snapshot)

- `story: ready -> in_progress` requires:
  - required links: `depends_on(hard)` link to `prd` and `architecture`
  - required output types: none (starting work)

- `story: in_progress -> review` requires:
  - required output types: `artifact_ref` (code change artifact) OR `file_ref` (changed file set)

- `story: review -> done` requires:
  - required output types: `artifact_ref` (verification report) OR `artifact_ref` (test results report)

Workflow path (greenfield) - high-level node order:

1. `brainstorm-project` (required)
2. `research` (optional group: market/domain/technical; at least one recommended)
3. `create-product-brief` (required)
4. `create-prd` (required)
5. `create-architecture` (required)
6. `create-epics-and-stories` (required)
7. `create-story` (required for first story)
8. `dev-story` (required for first story)
9. `verify-story` (required; may be a TEA test workflow or a BMAD verification workflow)

### Project Init (user-facing)

1. User selects method `BMAD` and chooses mode `greenfield`.
2. System creates project `taskflow` and seeds singleton work items:
   - `WI-PRD-001` (type `prd`, status `draft`)
   - `WI-ARCH-001` (type `architecture`, status `draft`)
   - optionally `WI-PB-001` (product brief)

### Discovery Outputs (brainstorm + research)

1. User runs `brainstorm-project`.
2. Workflow produces artifact snapshot:
   - `ArtifactSnapshot: brainstorm_notes_v1`
3. System creates or updates a discovery work item instance:
   - `WI-BRAIN-001` (type `brainstorm`)
4. Link discovery to PRD as soft context:
   - `WI-PRD-001 informed_by(soft) WI-BRAIN-001`

Optional research:

1. User runs `market-research`.
2. System creates:
   - `WI-RES-001` (type `research`)
   - `WI-PRD-001 informed_by(soft) WI-RES-001`

### PRD Creation

1. User runs `create-prd` bound to `WI-PRD-001`.
2. Execution produces typed outputs (examples):

   - `prd.snapshot.v1` as `artifact_ref` (points to `project_artifacts` row or artifact snapshot ref)
   - `prd.summary` as `string`

3. Transition evaluator checks `prd: draft -> ready`:
   - has `artifact_ref` output -> PASS
   - has at least one informed_by link -> WARN/OK (depending on method config)
4. `WI-PRD-001.status = ready`.

### Architecture

1. User runs `create-architecture` bound to `WI-ARCH-001`.
2. System ensures link:
   - `WI-ARCH-001 depends_on(hard) WI-PRD-001`
3. Execution outputs:
   - `architecture.snapshot.v1` as `artifact_ref`
4. Transition evaluator checks `architecture: draft -> ready`:
   - hard dep satisfied (`prd` exists and not blocked)
   - output type present -> PASS
5. `WI-ARCH-001.status = ready`.

### Epics and Stories Fanout

1. User runs `create-epics-and-stories` (primary context: project; may bind to an epic/planning item).
2. Step creates multiple story work items (fanout):
   - `WI-STORY-001` ("Task dependencies")
   - `WI-STORY-002` ("Task comments")
3. Links are created:
   - `WI-STORY-001 depends_on(hard) WI-PRD-001`
   - `WI-STORY-001 depends_on(hard) WI-ARCH-001`
4. Stories start at `ready`.

### First Story Development

1. User opens `WI-STORY-001` and runs `create-story` (refinement) bound to it.
2. Then runs `dev-story` bound to it.
3. Execution outputs:
   - `story.001.code_change` as `artifact_ref` (code patch or PR diff artifact)
   - `story.001.changed_files` as `file_ref` (paths)
4. Transition evaluator checks `story: in_progress -> review`:
   - output types present -> PASS
5. Work item moves to `review`.

### Verification

1. User runs `verify-story` (or TEA test workflow) bound to `WI-STORY-001`.
2. Execution outputs:
   - `story.001.test_report` as `artifact_ref`
3. Transition evaluator checks `story: review -> done`:
   - verification output present -> PASS
4. `WI-STORY-001.status = done`.

---

## Example 2 - BMAD Brownfield (Existing Codebase) to First Story Done

### Goal

Start from an existing repository and complete the first improvement story.

### Project Init

1. User selects method `BMAD` and chooses mode `brownfield`.
2. System creates project and seeds singleton items:
   - `WI-PRD-001` (optional; may remain draft)
   - `WI-ARCH-001` (draft)
3. User runs `document-project`.

### Document Project

1. `document-project` indexes the repo and creates artifacts:
   - `artifact_ref`: project summary
   - `artifact_ref`: module/architecture notes
2. Workflow may create/update work items:
   - `WI-ARCH-001` updated with derived architecture overview
   - optional `WI-RES-001` research note based on repo discovery
3. Links are created as context:
   - `WI-ARCH-001 informed_by(context) WI-RES-001`

### Architecture Delta

1. User runs `create-architecture` or an "architecture delta" workflow bound to `WI-ARCH-001`.
2. Execution outputs:
   - `architecture.snapshot.v2` as `artifact_ref`
3. Transition to `ready` occurs once output types present.

### Story Creation

1. User runs `create-epics-and-stories`.
2. Fanout creates stories based on gaps:
   - `WI-STORY-001` (first chosen improvement)
3. Links:
   - `WI-STORY-001 depends_on(hard) WI-ARCH-001`

### Development + Verify

Same as example 1:

1. `dev-story` produces code outputs (`artifact_ref` + `file_ref`).
2. `verify-story` produces test/verification output (`artifact_ref`).
3. Transitions move story to `done` deterministically.

---

## Example 3 - Standalone CIS Design Thinking (Optional Work Item Binding)

### Goal

Run a discovery workflow without requiring a work item at start, then optionally link outputs into the project method structure.

### Standalone Run

1. User runs `design-thinking`.
2. Execution has no `workItemRef` required.
3. Workflow produces artifact snapshot:
   - `artifact_ref`: design thinking synthesis

### Optional Link/Create Post-run

1. User chooses "Attach to project".
2. System creates a new work item:
   - `WI-DISC-001` (type `brainstorm` or `research`, depending on method taxonomy)
3. System links it to PRD if PRD exists:
   - `WI-PRD-001 informed_by(soft) WI-DISC-001`
4. Future PRD/architecture/story workflows can query and reuse this work item/artifact via retrieval tools.

---

## Open Questions

- None for phase 1 examples.
