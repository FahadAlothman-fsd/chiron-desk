# Chiron Canvas Excalidraw Script (Paste-Ready)

Date: 2026-03-03
Use: Fast setup of a living collaboration canvas in Excalidraw

## 0) Board Setup

- Create a new Excalidraw board.
- Turn on grid.
- Create 10 frames in this order:
  - A Product Gist
  - B Two Contexts
  - C Entity Map
  - D State + Diagnostics Legend
  - E Journey: Publish Methodology
  - F Journey: Deterministic Transition Control
  - G Journey: Step Execution + Recovery
  - H Feature Maturity + Open Questions + Decisions
  - I Story Progression + Screenshot Wall
  - J Resolved / History

## 1) Paste Block - Read Me Sticky

Paste this as one sticky in the top-left corner:

```text
READ ME FIRST
Goal: Explain Chiron quickly and evolve this board as stories ship.
How to contribute:
- Yellow = idea
- Blue = question
- Red = risk
- Green = approved
Review cadence: update after each completed story.
Definition of done for updates:
1) Update story timeline card
2) Add >= 2 screenshots
3) Update one impacted journey lane
```

## 2) Paste Block - Frame A (Product Gist)

```text
CHIRON IN ONE LINE
Mission-control workspace for deterministic, inspectable AI-assisted software delivery.

CORE PROMISE
- Explicit next actions
- Evidence-linked decisions
- Recoverable execution

WHY IT MATTERS
- Confidence under pressure
- Traceable outcomes
- Controlled progression through lifecycle gates
```

## 3) Paste Block - Frame B (Two Contexts)

```text
EXECUTION ORCHESTRATION CONTEXT
- Default operating mode
- Run transitions/workflows
- Monitor, recover, continue

METHODOLOGY REFINEMENT CONTEXT
- Episodic authoring mode
- Define/publish immutable contracts

CONNECTOR RULE
Both contexts must preserve deterministic rules and evidence linkage.
```

## 4) Paste Block - Frame C (Entity Map)

```text
ENTITY CHAIN
Methodology -> Methodology Version -> Work Unit -> Transition -> Workflow -> Step

TERMINOLOGY GUARDS
- Fact Definition != Fact Value
- Workflow Definition != Workflow Execution (Run)
- Transition Attempt != Step Attempt
- Branch Resolution != Lifecycle Transition Resolution
- blocked != failed
```

## 5) Paste Block - Frame D (Legend)

```text
STATE LEGEND
normal | loading | blocked | failed | success

DIAGNOSTIC FIELDS
code
scope
blocking
required
observed
remediation
timestamp
evidence refs

ACTION CHIPS
retry | resume | continue | remediate | cancel
```

## 6) Paste Block - Frame E (Journey 1)

```text
PUBLISH METHODOLOGY JOURNEY
Edit definitions -> Validate -> Remediate diagnostics -> Publish immutable version -> Capture audit evidence

KEY RULES
- Blocking diagnostics stop publish
- Draft may be invalid
- Active version must be valid + immutable
```

## 7) Paste Block - Frame F (Journey 2)

```text
DETERMINISTIC TRANSITION CONTROL JOURNEY
Select transition -> Evaluate start gate -> (blocked remediation | run workflow/direct transition) -> Evaluate completion gate -> Persist evidence -> Expose next actions

KEY RULES
- Eligibility must be explicit
- Equivalent conditions => equivalent visible outcomes
```

## 8) Paste Block - Frame G (Journey 3)

```text
STEP EXECUTION + RECOVERY JOURNEY
Dispatch ready step -> Execute step type (form|agent|action|invoke|branch|display) -> Capture evidence -> Handle blocked/failed with diagnostics -> Retry/Resume/Remediate -> Continue

KEY RULES
- Attempt lineage is visible
- Recovery is explicit, not hidden
```

## 9) Paste Block - Frame H (Maturity + Questions + Decisions)

```text
MATURITY KEY
Built | In Progress | Pending | Deferred

CURRENT STATUS
- 2.1 done: methodology foundation flow
- 2.2 done: graph/list authoring workspace
- 2.3 done: diagnostics + publish/evidence hardening
- 2.4 near-done: typed fact authoring + deterministic validation

OPEN QUESTIONS (template)
Q:
Owner:
Due:
Status:

DECISION LOG (template)
Date:
Decision:
Alternatives considered:
Rationale:
```

## 10) Paste Block - Frame I (Story + Screenshots)

```text
STORY PROGRESSION RAIL
2.1 -> 2.2 -> 2.3 -> 2.4 -> next

PER STORY CARD TEMPLATE
Story:
Status:
What changed (max 3 bullets):
UX implication:
Screenshot 1: hero state
Screenshot 2: blocked/diagnostic state
Screenshot 3: evidence/outcome state
```

## 11) Screenshot Queue (Now)

- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.tsx` route shell/header with state label.
- `apps/web/src/features/methodologies/version-workspace-graph.tsx` L1/L2/L3 graph + list view + quick create.
- `apps/web/src/features/methodologies/version-workspace.tsx` typed fact editor with validation mode switch.
- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.tsx` publish panel + last publish result + evidence table.
- `apps/web/src/routes/-methodologies.$methodologyId.versions.$versionId.integration.test.tsx` blocking diagnostics evidence for storyline proof.
