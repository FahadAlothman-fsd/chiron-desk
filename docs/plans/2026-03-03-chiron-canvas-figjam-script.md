# Chiron Canvas FigJam Script (Structured Build)

Date: 2026-03-03
Use: Build a reusable FigJam canvas mirroring Excalidraw structure

## Board Structure

Create sections in this order:

1. Product Gist
2. Two Contexts
3. Entity Map + Terminology Guardrails
4. State + Diagnostics Legend
5. Journey 1 Publish Methodology
6. Journey 2 Deterministic Transition Control
7. Journey 3 Step Execution + Recovery
8. Feature Maturity + Decisions + Open Questions
9. Story Progression + Screenshot Wall
10. Resolved / History

## Sticky Color Convention

- Yellow: idea
- Blue: question
- Red: risk
- Green: approved
- Gray: factual evidence (tests, code, docs)

## Copy/Paste Blocks by Section

### 1) Product Gist

```text
Chiron is a mission-control workspace for deterministic, inspectable AI-assisted software delivery.
```

```text
Core Promise
- Explicit next actions
- Evidence-linked decisions
- Recoverable execution
```

### 2) Two Contexts

```text
Execution Orchestration Context
- Run transitions/workflows
- Monitor and recover execution
```

```text
Methodology Refinement Context
- Author and validate contracts
- Publish immutable versions
```

### 3) Entity Map + Terminology Guardrails

```text
Methodology -> Methodology Version -> Work Unit -> Transition -> Workflow -> Step
```

```text
Terminology guardrails
- Fact Definition != Fact Value
- Workflow Definition != Workflow Execution
- Transition Attempt != Step Attempt
- blocked != failed
```

### 4) State + Diagnostics Legend

```text
States: normal | loading | blocked | failed | success
```

```text
Diagnostics contract fields:
code, scope, blocking, required, observed, remediation, timestamp, evidence refs
```

### 5) Journey 1 - Publish Methodology

```text
Edit -> Validate -> Remediate -> Publish immutable version -> Capture evidence
```

```text
Rule: Blocking diagnostics stop publish.
```

### 6) Journey 2 - Deterministic Transition Control

```text
Select transition -> Start gate -> Blocked path or execute path -> Completion gate -> Evidence -> Next valid actions
```

### 7) Journey 3 - Step Execution + Recovery

```text
Dispatch step -> Execute (form/agent/action/invoke/branch/display) -> Evidence -> Blocked/failed remediation -> Retry/Resume/Continue
```

### 8) Maturity + Questions + Decisions

```text
Current story status
2.1 done
2.2 done
2.3 done
2.4 near-done
```

```text
Open question template
Question:
Owner:
Due date:
Decision needed by:
```

```text
Decision log template
Date:
Decision:
Alternatives:
Rationale:
```

### 9) Story Progression + Screenshot Wall

```text
Story rail: 2.1 -> 2.2 -> 2.3 -> 2.4 -> next
```

```text
Per-story card template
Story:
Status:
What changed:
UX implication:
Screenshot links:
```

## Screenshot Capture Plan (Current Implementation)

- Route shell + state label: `apps/web/src/features/methodologies/workspace-shell.tsx`
- Graph/List/L1-L3 + quick create + bindings: `apps/web/src/features/methodologies/version-workspace-graph.tsx`
- Typed facts + validation modes + guidance: `apps/web/src/features/methodologies/version-workspace.tsx`
- Publish panel + evidence table: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.tsx`
- Blocking diagnostics behavior proof: `apps/web/src/routes/-methodologies.$methodologyId.versions.$versionId.integration.test.tsx`

## Living Governance

- After each story completion, add one story card and two screenshots minimum.
- Update one impacted journey lane.
- Move superseded cards/screenshots to Resolved / History.
- Keep section 4 legend immutable unless terminology glossary changes.
