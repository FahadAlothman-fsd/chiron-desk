# Chiron Methodology Layer Diagram Pack v1 (Week 6)

Date: 2026-02-19
Purpose: explain pre-methodology architecture issues, why methodology layer was introduced, and why this increases probability of delivery by 2026-03-31.

## 1) Storyline (for presentation)

1. Before: Chiron operated with workflows and execution, but project mental model lived in user heads and scattered docs.
2. Problem: weak state visibility, ambiguous next action, drift between planning and execution, hard traceability.
3. Intervention: introduce Methodology Layer (versioned work-unit model + transitions + gates + workflow bindings).
4. After: deterministic "what can I do now?", explicit dependencies, auditable evidence, lower cognitive load.
5. Result: implementation focus shifts from inventing process every run to executing known contracts.

---

## 2) Diagram A - Before vs After Architecture

```mermaid
flowchart LR
  subgraph BEFORE[Before Methodology Layer]
    U1[User]
    W1[Workflow Files + Ad-hoc Rules]
    E1[Execution Engine]
    D1[Artifacts + Notes + Status Files]
    U1 --> W1 --> E1 --> D1
    D1 -. mental reconstruction .-> U1
  end

  subgraph AFTER[After Methodology Layer]
    U2[User]
    M2[Methodology Layer\nversioned definitions]
    P2[Project Layer\nwork units + links + state]
    X2[Execution Layer\nworkflow runs + step outputs]
    G2[Transition Gates\nstart/completion checks]
    U2 --> P2
    M2 --> P2
    P2 --> G2 --> X2
    X2 --> P2
  end
```

Talk track:
- Before: execution existed, but project state machine was implicit.
- After: methodology defines allowed moves; project and execution stay synchronized.

---

## 3) Diagram B - Core Pain Points Before

```mermaid
flowchart TD
  A[Scattered planning artifacts] --> B[Unclear current project state]
  B --> C[Ambiguous next action]
  C --> D[Manual coordination overhead]
  D --> E[Execution drift from plan]
  E --> F[Low confidence in readiness]
```

Evidence themes to narrate:
- Coupling/drift concerns in architecture/design docs.
- Legacy migration docs showing state/traceability fragility and heavy cognitive overhead.

---

## 4) Diagram C - What Methodology Layer Adds

```mermaid
flowchart TD
  M[Methodology Version Pin]
  WU[Work Unit Types]
  T[Transitions]
  G[Gate Rules]
  WB[Workflow Bindings]
  EO[Execution Outputs Ledger]

  M --> WU --> T --> G
  T --> WB
  WB --> EO
  EO --> G
```

Key message:
- Next action is no longer guessed; it is computed from open transitions and gate satisfaction.

---

## 5) Diagram D - "Where Am I / What Next" Decision Loop

```mermaid
sequenceDiagram
  participant U as User
  participant P as Project State
  participant TG as Transition Gate Service
  participant WB as Workflow Binding Service
  participant EX as Execution

  U->>P: Open project
  P->>TG: Evaluate transitions from current state
  TG-->>P: Open transitions + blocked reasons
  P->>WB: Resolve allowed workflows for open transition
  WB-->>P: Candidate workflows (ranked)
  P-->>U: Available next actions + recommended action
  U->>EX: Start selected workflow
  EX-->>P: Persist outputs/evidence
  P->>TG: Re-evaluate completion gate
  TG-->>P: Commit or block with diagnostics
```

This directly supports your point:
- Multiple next actions can be valid.
- Recommendation is transition/gate-driven, not arbitrary.

---

## 6) Diagram E - BMAD Mapping Before vs Now

```mermaid
flowchart LR
  subgraph OLD[Old BMAD Mapping]
    O1[Workflow file semantics]
    O2[Artifact files and status docs]
    O3[Implicit state transitions]
    O1 --> O2 --> O3
  end

  subgraph NEW[New BMAD Mapping in Chiron]
    N1[WU.BACKLOG / WU.STORY / etc]
    N2[Transition definitions\nfrom_status -> to_status]
    N3[Allowed workflows per transition]
    N4[Step config stubs\nform agent action invoke branch display]
    N5[Gate diagnostics + evidence ledger]
    N1 --> N2 --> N3 --> N4 --> N5
  end
```

Concrete examples:
- `create-epics-and-stories` now maps to `WU.BACKLOG` transition `draft -> done`.
- `dev-story` maps to `WU.STORY` transition `ready -> review` with explicit outputs.

---

## 7) Diagram F - Why "No Big Build Yet" Is Rational

```mermaid
flowchart LR
  A[Foundation lock\nPRD + architecture + schemas + mappings] -->
  B[Epics/stories from tightened requirements] -->
  C[Backend vertical slices\nmethodology + transitions + gates] -->
  D[Frontend integration\nproject + execution views] -->
  E[Stabilize + validate]
```

Narrative:
- The team is reducing downstream rework by locking contracts first.
- "Not doing everything yet" is deliberate risk compression.

---

## 8) March 31 Feasibility Argument (Slide-ready)

```mermaid
gantt
  title Chiron Delivery Plan to 2026-03-31
  dateFormat  YYYY-MM-DD
  section Planning Closure
  Canonical epics/stories + traceability       :a1, 2026-02-19, 5d
  section Backend Core
  Methodology tables + services + gate eval    :a2, after a1, 10d
  Transition binding + execution output ledger :a3, after a2, 6d
  section Frontend
  Project cockpit (state + next actions)       :a4, after a2, 8d
  Execution views + diagnostics                :a5, after a3, 6d
  section Hardening
  Integration validation + bugfix              :a6, after a4, 6d
```

Argument points:
- Scope is constrained by locked step system and fixed methodology contracts.
- Progress can be measured by deterministic gates and traceability completion.
- The methodology layer removes ambiguity overhead, increasing delivery predictability.

---

## 9) Optional v0 Explainer Microsite Prompt

Use this prompt in v0 to generate a narrative mock site:

```text
Create a single-page technical explainer website for "Chiron: Why We Introduced the Methodology Layer".

Audience: technical PMs and engineers.
Tone: precise, confident, evidence-based.

Sections:
1) Hero: "Before vs After" with one-sentence thesis.
2) Problem section: 5 pain cards (unclear state, next-action ambiguity, drift, coordination overhead, weak traceability).
3) Architecture comparison: side-by-side diagram panels (Before/After).
4) How it works now: step-by-step loop showing transitions, gate evaluation, workflow selection, execution outputs.
5) BMAD mapping examples: table with old mapping vs new mapping for at least 4 workflows (create-prd, create-epics-and-stories, dev-story, check-implementation-readiness).
6) Why this helps users: "Where am I now?" and "What should I do next?" with UI mock cards.
7) Delivery confidence timeline: now -> March 31 with milestones.
8) Closing: "Why no large feature build yet" as intentional foundation-first strategy.

Visual style:
- Dense, premium technical dashboard (Bloomberg-inspired but modern).
- Fonts: Commit Mono for primary text, Geist Pixel for accents.
- Colors: muted terminal neutrals + restrained status colors.
- Include subtle grid background and clear section anchors.
- Responsive for desktop and mobile.

Output as React + Tailwind components with reusable sections.
```
