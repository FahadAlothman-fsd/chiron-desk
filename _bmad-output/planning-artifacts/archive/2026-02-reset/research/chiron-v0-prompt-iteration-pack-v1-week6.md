# Chiron v0 Prompt Iteration Pack v1 (Week 6)

Date: 2026-02-19
Goal: Generate a high-quality explainer microsite that justifies the methodology layer and delivery plan to 2026-03-31.

## How to Use

1. Run Prompt v1 in v0.
2. Review output for structure and factual fidelity.
3. Run Prompt v2 to improve technical depth and diagrams.
4. Run Prompt v3 for final polish, interaction, and presentation quality.

---

## Prompt v1 - Structure and Narrative First

```text
Build a single-page technical explainer site titled:
"Chiron: Why We Introduced the Methodology Layer"

Audience:
- technical PMs
- senior engineers
- stakeholders reviewing delivery confidence

Primary argument:
- Before methodology layer: project state and next action were cognitively expensive to reconstruct.
- After methodology layer: state, transitions, gates, and allowed workflows are explicit and auditable.
- This reduces mental load and makes delivery by March 31 more predictable.

Use this stack:
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui components
- @xyflow/react for one interactive graph section
- framer-motion for subtle transitions only

Visual direction:
- Premium technical dashboard (Bloomberg-inspired, modern)
- Fonts: Commit Mono for primary UI, Geist Pixel for accent headings
- Use neutral terminal palette with restrained status colors (green, amber, red, blue)
- No flashy gradients or heavy animations

Required sections (in this exact order):
1) Hero
   - headline, one-sentence thesis, two CTAs ("See Before/After" and "View Delivery Plan")

2) Before vs After (side-by-side)
   - Before card: workflow files + ad-hoc rules + user mental reconstruction
   - After card: Methodology Plane + Project Plane + Execution Plane with deterministic gates

3) Pain Points Before Methodology Layer
   - 5 cards: unclear current state, ambiguous next action, drift from plan, coordination overhead, weak traceability

4) What the Methodology Layer Added
   - Explain these entities:
     - methodology versions
     - work unit types
     - transition definitions
     - start/completion gates
     - transition allowed workflows
     - execution outputs + gate diagnostics

5) "Where Am I / What Next?" Decision Loop
   - Explain that multiple next actions can be valid
   - Show recommendation logic as gate-driven ranking, not arbitrary

6) BMAD Mapping: Before vs Now
   - Include table with these examples:
     - create-prd -> WU.PRD, draft -> done
     - create-epics-and-stories -> WU.BACKLOG, draft -> done
     - dev-story -> WU.STORY, ready -> review
     - check-implementation-readiness -> WU.IMPLEMENTATION_READINESS, draft -> done

7) Why We Did Foundation Work First
   - Explain "why we have not built everything yet"
   - Position this as contract/risk reduction, not delay

8) Delivery Confidence to March 31
   - Show milestone timeline:
     - epics + traceability
     - methodology + transition + gate backend slice
     - project cockpit + execution UX integration
     - validation and stabilization

9) Conclusion
   - concise defense: methodology layer reduces cognitive load and improves execution predictability

Implementation requirements:
- Fully responsive (mobile and desktop)
- Accessibility baseline (keyboard focus states, semantic headings, contrast-safe text)
- Keep copy concise and technical
- Use reusable section components
```

---

## Prompt v2 - Technical Fidelity and Diagram Upgrades

```text
Refine the existing explainer site with higher technical fidelity.

Keep all sections and style, but apply these upgrades:

1) Add architecture diagrams using Mermaid code blocks for:
   - Before vs After architecture
   - Decision loop (project state -> gate evaluation -> allowed workflow -> execution -> evidence)
   - BMAD mapping model transition

2) Add an interactive React Flow panel under "What the Methodology Layer Added" with nodes:
   - MethodologyVersion
   - WorkUnitType
   - TransitionDefinition
   - StartGate
   - CompletionGate
   - TransitionAllowedWorkflows
   - WorkflowExecution
   - ExecutionOutputs
   - GateDiagnostics
   and directional edges showing evaluation/execution/evidence flow.

3) Add a "What changed concretely" diff section:
   - Left: old model (implicit state, ad-hoc transitions)
   - Right: new model (explicit transitions + gates + workflow binding)

4) Add recommendation policy card:
   - Multiple next actions may be valid.
   - Recommended action ranking:
     1. mandatory compliance/safety transition
     2. transition that unblocks most work units
     3. nearest due-date risk
     4. user-pinned focus

5) Add evidence-driven language:
   - "deterministic gates"
   - "traceable transition attempts"
   - "auditable outputs and diagnostics"

6) Tighten readability:
   - each section starts with one sentence summary
   - then 3-5 concise bullets
   - avoid long paragraphs

7) Keep performance clean:
   - avoid large animation libraries beyond framer-motion already in use
   - no unnecessary heavy charts
```

---

## Prompt v3 - Final Polish, Presentation Readiness, and Exportability

```text
Finalize this explainer as a stakeholder-ready artifact.

Keep current content and structure, then add:

1) Presentation mode toggle:
   - standard page mode
   - slide mode (full-height sections with left/right keyboard navigation)

2) Add "Key Claims and Proof" section:
   - Claim: Methodology layer improves clarity of current state
   - Proof: explicit work unit state + transition model
   - Claim: Methodology layer improves next-action guidance
   - Proof: gate-evaluated open transitions + allowed workflow resolution
   - Claim: Methodology layer improves delivery predictability
   - Proof: contract-first sequencing and milestone plan to March 31

3) Add "Risk Register" mini-section:
   - risk
   - mitigation
   - owner
   - current status

4) Add export-friendly blocks:
   - one click "copy narrative summary"
   - one click "copy timeline"
   - one click "copy BMAD mapping examples"

5) Add quality checks:
   - all headings hierarchical and semantic
   - no low-contrast text
   - keyboard focus visible everywhere
   - no layout break at 390px width

6) Final copy tone:
   - precise and confident
   - avoid hype language
   - keep each section tightly scoped to one argument
```

---

## Optional Follow-up Prompt (if output is too generic)

```text
Increase information density and reduce generic UI feel.
Use tighter spacing, stronger typographic hierarchy, and explicit system-language labels.
Show concrete entity names (WorkUnitType, TransitionDefinition, StartGate, CompletionGate, TransitionAllowedWorkflows, ExecutionOutputs).
Avoid generic startup website patterns. This is a technical architecture explainer.
```
