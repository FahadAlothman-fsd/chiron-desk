# Chiron v0 Prompt Iteration Pack v2 (Specific + Evidence-Driven)

Date: 2026-02-19
Use this version when v0 output feels vague.

## What Changed From v1

- Adds explicit "before" evidence: users inferred next action from artifact snapshots + workflow execution logs.
- Adds concrete BMAD->Chiron mapping examples with work-unit + transition vocabulary.
- Adds market framing: agent-centric optimization vs Chiron's shared mental-model orchestration.
- Forces section contracts so v0 cannot hand-wave the key argument.

---

## Prompt v2.1 - Hard Constraints + Concrete Content

```text
Build a single-page technical explainer website titled:
"Chiron: From Agent-Centric Execution to Shared Project Intelligence"

Audience:
- technical PMs
- senior engineers
- architecture reviewers

Absolute content constraints:
1) Do NOT describe "before" generically.
2) Explicitly state this BEFORE model:
   - project context was reconstructed from artifact snapshots and workflow execution history
   - users inferred current state and next action manually
   - this caused ambiguity, drift, and cognitive overhead
3) Explicitly state this AFTER model:
   - methodology version + work units + transitions + gates + transition-allowed workflows
   - available next actions are computed from open transitions and gate outcomes
   - one recommended action is ranked by policy, while multiple valid actions may coexist

Technical stack:
- Next.js + TypeScript + Tailwind + shadcn/ui
- @xyflow/react for one interactive model graph
- Mermaid blocks for architecture and flow diagrams

Visual direction:
- dense technical product page (not startup-marketing style)
- typography: Commit Mono + Geist Pixel
- restrained neutral palette, status accents only
- subtle motion, no decorative effects

Section contract (exact order):

1) Hero
   - thesis: "Chiron does not just orchestrate agents; it externalizes project state as a shared human+agent mental model."

2) The Old Mode (Before Methodology Layer)
   - include a "What users relied on" list with exactly:
     - artifact snapshots
     - workflow execution logs
     - manual inference
   - include "What failed" list with exactly:
     - unclear current state
     - unclear next action
     - planning/execution drift
     - high coordination overhead

3) The New Mode (With Methodology Layer)
   - introduce these entities explicitly:
     - MethodologyVersion
     - WorkUnitType
     - TransitionDefinition
     - StartGate / CompletionGate
     - TransitionAllowedWorkflows
     - ExecutionOutputs + GateDiagnostics
   - add one Mermaid diagram showing these relationships

4) Before/After Comparison Table (required)
   Columns:
   - Concern
   - Before
   - After
   Rows:
   - Source of truth for state
   - How next actions are determined
   - Why transitions fail/succeed
   - Traceability
   - Cognitive load

5) BMAD -> Chiron Mapping (required, concrete)
   Include this exact table schema:
   - Legacy BMAD Workflow Name
   - Chiron WorkUnitType
   - Transition
   - Selection Authority
   - Evidence Produced

   Include at least these example rows:
   - create-prd | WU.PRD | draft->done | transition_allowed_workflows | PRD artifact + gate diagnostics
   - create-epics-and-stories | WU.BACKLOG | draft->done | transition_allowed_workflows | epics/stories outputs + traceability links
   - dev-story | WU.STORY | ready->review | transition_allowed_workflows | implementation outputs + validation evidence
   - check-implementation-readiness | WU.IMPLEMENTATION_READINESS | draft->done | transition_allowed_workflows | readiness report + missing coverage diagnostics

6) Elicitation Cross-Work-Unit Pattern (required)
   - show parent Epic/Story invoking child Brainstorming work unit
   - show parent->child inputs: topic, goals, constraints, scope
   - show child->parent outputs: elicitation_summary, technique_results, recommendations, evidenceRefs
   - explicitly note dependency semantics are methodology-defined (not hardcoded engine enums)

7) Market Framing: Where Chiron Sits
   - left card: current industry focus = agent-centric optimization (better agents, RLMs/subagents, sandboxing, agent orchestration)
   - right card: Chiron focus = shared project-state intelligence (human+agent alignment on where we are, what is valid now, and what to do next)
   - include one-sentence non-hype contrast
   - explicitly state that current agent-centric work is both good and necessary foundational work
   - explicitly state that current primitives (for example OpenCode-style agents, AI SDK-style runtime tooling) are already strong enough for Chiron to be built as a higher-order layer

8) AX Optimization Layer (required)
   - explain AX as a planned optimization layer that improves prompt/program quality and decision consistency over time
   - show AX as an amplifier on top of methodology + execution loops, not a replacement for core workflow/gate architecture
   - include practical value bullets:
     - improves reliability of generated outputs
     - reduces rework via measurable feedback loops
     - improves convergence speed for planning and implementation decisions

9) Why "Not Built Yet" Is Rational
   - explain foundation-first sequencing as risk compression:
     - lock contracts
     - generate complete epics/stories
     - implement runtime slices
     - integrate UI state guidance
   - include timeline to 2026-03-31

10) Conclusion
   - final message: methodology layer turns implicit process memory into explicit computable project intelligence

Quality constraints:
- no generic filler paragraphs
- each section starts with one sentence, then 3-5 bullets max
- mobile + desktop responsive
- semantic headings + keyboard-focus visible
```

---

## Prompt v2.2 - If v0 Still Feels Vague

```text
Refine the current output by replacing abstract statements with concrete examples and named entities.

Apply these edits:
- Wherever you say "process" or "workflow management", replace with concrete terms:
  MethodologyVersion, WorkUnitType, TransitionDefinition, StartGate, CompletionGate, TransitionAllowedWorkflows, ExecutionOutputs, GateDiagnostics.
- Add one evidence callout per section: "Before signal" and "After signal".
- Add one explicit sentence in the Before section:
  "Users inferred project state from artifact snapshots and execution traces, then manually decided next actions."
- Add one explicit sentence in the After section:
  "The system computes valid next actions from open transitions and gate evaluation."
- Ensure BMAD mapping table is visible above the fold on desktop in a summary card.
```

---

## Optional Narration Overlay (for demo recording)

Use this as your spoken one-liner per section:

- Before: "We had outputs, but not a computable project state model."
- After: "We now model state transitions explicitly, so next actions are derived, not guessed."
- Mapping: "BMAD steps are now bound to work-unit transitions with explicit selection authority."
- Advantage: "Others optimize the agent; Chiron optimizes shared project cognition between humans and agents."
