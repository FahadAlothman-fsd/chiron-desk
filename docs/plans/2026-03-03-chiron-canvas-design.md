# Chiron UX Collaboration Canvas Design

Date: 2026-03-03
Status: Draft for collaboration with UX designer
Author: Tech Writer Agent

## Objective

Create a shared visual canvas (Excalidraw-first, FigJam/Figma-portable) that explains Chiron's product gist, feature model, and key journeys in a way that supports async collaboration and fast UX alignment.

## Assumed Framing

- Primary mode: balanced mix of big-picture storytelling and UX flow detail.
- Audience: UX designer collaborator who needs fast conceptual onboarding.
- Output: one working canvas with clear sections, legend, open questions, and decision log.

## Three Canvas Approaches

### 1) Story-First Narrative Canvas (recommended)

Structure:

- Hero frame (what Chiron is, why it exists)
- Dual-context model (Execution Orchestration vs Methodology Refinement)
- Journey lanes (publish, transition execution, failure recovery)
- Feature clusters and maturity map
- Glossary + state/evidence legend
- Open questions + decision log

Pros:

- Easy for non-domain collaborators to follow.
- Preserves product narrative and interaction intent.
- Supports progressive depth without overwhelming first pass.

Cons:

- Slightly less precise for immediate wireframing.

Best when:

- Goal is shared understanding and aligned problem framing.

### 2) System-First Architecture Canvas

Structure:

- Entities/contracts first (methodology, work unit, transition, workflow, step)
- Runtime containment layers
- Data/evidence flows
- Then journeys and UX implications

Pros:

- Very accurate for technical discussions.
- Strong for dependency/risk mapping.

Cons:

- Harder for first-time UX audiences to parse quickly.

Best when:

- Stakeholders are mostly technical and implementation-focused.

### 3) Journey-First Service Blueprint Canvas

Structure:

- Actor lanes + timeline + touchpoints
- States and diagnostics on each stage
- Backstage systems mapped under each touchpoint

Pros:

- Excellent UX flow clarity.
- Good for identifying friction and handoff gaps.

Cons:

- Risks hiding high-level product architecture.

Best when:

- Team is already aligned on product model and needs flow tuning.

## Recommendation

Use Approach 1 (Story-First Narrative Canvas).

Reason:

- Chiron has dense concepts and strict terminology.
- A story-first structure keeps designer onboarding smooth while still allowing precise journey and system overlays.
- It adapts well from Excalidraw to FigJam/Figma as fidelity grows.

## Canvas Blueprint (Section-by-Section)

## Section A: Product Gist Frame

Purpose:

- Explain Chiron in one screen.

Content:

- One-liner: "Chiron is a mission-control workspace for deterministic, inspectable AI-assisted software delivery."
- Core promise: explicit next actions, evidence-linked decisions, recoverable execution.
- Three value bullets: confidence, traceability, controlled progression.

## Section B: Two Interaction Contexts

Purpose:

- Prevent role confusion and anchor mental model.

Content:

- Execution Orchestration Context (default cadence): run, monitor, recover work.
- Methodology Refinement Context (episodic cadence): define/publish immutable contracts.
- Connector note: both contexts share deterministic rules and evidence posture.

## Section C: Core Entity Map

Purpose:

- Show "what exists" in Chiron.

Content:

- Methodology -> Methodology Version -> Work Unit/Transition/Workflow/Step
- Fact Definition vs Fact Value callout
- Workflow Definition vs Workflow Execution (Run) callout

## Section D: State + Diagnostics Legend

Purpose:

- Standardize interpretation across journeys.

Content:

- States: `normal`, `loading`, `blocked`, `failed`, `success`
- Diagnostic fields: `code`, `scope`, `blocking`, `required`, `observed`, `remediation`, `timestamp`, evidence refs
- Action chips: retry, resume, continue, remediate, cancel

## Section E: Journey Lane 1 - Publish Methodology

Flow:

- Edit definitions -> validate -> diagnostic remediation -> publish immutable version -> capture audit evidence.

Focus callouts:

- Publish blocked on blocking diagnostics.
- Draft may contain invalid definitions; active version must be valid and immutable.

## Section F: Journey Lane 2 - Deterministic Transition Control

Flow:

- Select transition -> evaluate start gate -> if blocked, show deterministic remediation -> else run workflow or direct transition -> evaluate completion gate -> persist evidence -> expose next valid actions.

Focus callouts:

- Eligibility and required workflows are explicit.
- Equivalent conditions should produce equivalent visible outcomes.

## Section G: Journey Lane 3 - Step Execution and Recovery

Flow:

- Dispatch ready step -> run step type (`form|agent|action|invoke|branch|display`) -> capture evidence -> on blocked/failed show actionable diagnostics -> retry/resume or remediate -> continue.

Focus callouts:

- Attempt lineage and authoritative attempt behavior.
- Recovery is explicit, not hidden.

## Section H: Feature Maturity + Open Questions

Content:

- Maturity key: Built / In Progress / Pending / Deferred.
- Built emphasis: methodology authoring, graph workspace, step-type contracts, diagnostics model, validation foundations.
- Deferred emphasis: broader multi-repo targeting semantics.
- Open questions list with owner + target date.
- Decision log with date, decision, alternatives, rationale.

## Section I: Story Progression + Screenshot Wall (living section)

Purpose:

- Keep the canvas current as new stories ship.

Content:

- Story timeline rail: 2.1, 2.2, 2.3, 2.4, next.
- Per-story status chip: `done`, `near-done`, `in-progress`, `planned`.
- Screenshot slots per story:
  - Hero screen
  - State/diagnostic moment
  - Evidence or outcome moment
- "What changed in this story" sticky (3 bullets max).
- "UX implication" sticky (what a designer should notice/change).

Current snapshot (as of 2026-03-03):

- Story 2.1: done (methodology foundation flow).
- Story 2.2: done (graph/list authoring workspace foundation).
- Story 2.3: done (diagnostics-first publish/evidence workflow hardening).
- Story 2.4: near-done (typed fact authoring + deterministic typed validation).

Suggested screenshot targets now:

- Route shell state indicator and version workspace header.
- Graph view L1/L2/L3 plus quick create and list mode.
- Typed fact authoring editor with validation mode switch (`none|path|json-schema`).
- Publish flow panel with last publish result and publication evidence table.
- Blocking diagnostics example with remediation fields visible.

## Living Update Rules (for future stories)

- Add one new story card only after implementation behavior is visible in UI or tests.
- Attach at least 2 screenshots per completed story (before/after or normal/blocked).
- For each new story card, update exactly three places:
  - Feature maturity map
  - One affected journey lane
  - Story progression + screenshot wall
- Keep terminology locked to glossary terms; avoid ad-hoc renames.
- Archive replaced screenshots in a "Resolved/History" frame, do not delete.

## Suggested Excalidraw/FigJam Working Conventions

- Add a "Read me first" sticky with purpose, contribution rules, and review deadline.
- Use fixed section frames (A-H) and keep terms/legend in a locked frame.
- Use contribution tags on stickies: `idea`, `question`, `risk`, `approved`.
- Keep a "Resolved" frame instead of deleting discussion artifacts.
- Snapshot after each major revision.

## Starter Card Copy (ready to paste)

- Card: "What Chiron is"
  - Mission-control workspace for deterministic AI-assisted delivery.
  - Turns lifecycle ambiguity into explicit next actions with evidence.

- Card: "Two contexts"
  - Execution Orchestration: operate runs and transitions.
  - Methodology Refinement: author and publish immutable delivery contracts.

- Card: "Why designers should care"
  - UI must make progression constraints visible.
  - Error states must be actionable and confidence-preserving.
  - Evidence linkage is a product feature, not just telemetry.

## Acceptance Criteria for This Canvas

- A new collaborator can explain Chiron's two contexts in under 2 minutes.
- Each journey lane shows state changes and next actions clearly.
- Terminology collisions are prevented by glossary callouts.
- Open questions and decisions are captured in-canvas, not in chat history.

## Notes

- This canvas is intentionally medium fidelity and collaboration-first.
- If needed, this can be migrated into a higher-fidelity FigJam/Figma system map without changing structure.
