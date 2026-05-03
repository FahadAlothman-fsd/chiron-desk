# Chiron Project Poster

## Poster Frame

This poster should be built around one central claim:

> **Chiron is a methodology-first system that abstracts the software development lifecycle into durable structures that keep specification, execution, and evidence aligned under lifecycle churn.**

The poster should use only the following sections and in this order:

1. Motivation
2. Project Overview
3. Core Methodology Model
4. Chiron's 4-Layer Approach
5. Analysis
6. Findings
7. Conclusion

The poster is **A0 landscape**, conceptually dense, and visually structured. It should read as an academic systems poster, not as a slide deck and not as a compressed thesis chapter.

---

## 1. Motivation

### Suggested poster text

As software delivery accelerates, specifications, plans, code, and documentation drift out of sync. Under agentic development, this lifecycle churn becomes even harder to govern.

### Recommended visual
- `academic_reports/figures/chiron-poster-motivation-drift.png`

### Caption direction
The diagram should show that faster lifecycle change produces documentation drift and stale specifications.

---

## 2. Project Overview

### Core framing
Recent spec-driven and agent-guided systems commonly revolve around three recurring elements: a **specification artifact**, an **implementation artifact**, and a **workflow layer** that guides agent behavior between them.

Chiron begins from this same landscape, but separates the system into **methodology authoring** and **project execution** so that lifecycle progression itself becomes explicit and inspectable.

### Transition sentence into the next section
The natural next question is therefore:

> If Chiron abstracts the software lifecycle into an authored method, what are the core entities that make that abstraction possible?

### Recommended visual
- `academic_reports/figures/chiron-poster-overview-elements.png`
- the diagram should foreground the three recurring elements

---

## 3. Core Methodology Model

### Purpose of this section
This is the first conceptual anchor of the poster. It should explain the durable entities that make Chiron’s lifecycle abstraction possible.

### Required model points

- **Methodology** defines the reusable operating model.
- **Work units** are durable, state-bearing work objects.
- **Facts** store durable information about work and context.
- **Transitions** govern movement between authored states.
- **Workflows** are execution paths bound to transitions.
- **Artifacts** preserve durable output evidence.

### Suggested explanatory text

Chiron treats software delivery as a methodology-defined system rather than a loose chain of prompts and tool calls. A methodology defines the reusable operating model. Work units define durable categories of work. Facts preserve context in structured form. Transitions and their condition sets govern lifecycle movement. Workflows are bound to transitions rather than floating independently. Artifacts preserve the outputs and evidence produced along the way.

This model matters because it gives the lifecycle a durable grammar: work is not only performed, but located, governed, and inspected through explicit structures.

### Important semantic distinctions

- facts are **not** the same thing as state,
- workflows are **bound to transitions**, not free-floating,
- and transition movement is governed by condition/gate logic rather than informal judgment.

### Recommended visual
- `academic_reports/figures/chiron-methodology-entities.png`

---

## 4. Chiron's 4-Layer Approach

The four-layer model shows **where lifecycle behavior lives** in Chiron.

- **Project** contains the live project context.
- **Work Unit** contains lifecycle-governed work.
- **Workflow** contains operational progression.
- **Step** contains executable behavior.

This section should be shown through **three focused visuals** plus one short step-type bullet panel.

### Copy-paste layer text

#### Project Layer
- live project context
- methodology version
- project facts
- runtime evidence

**Solves:** keeps all work inside one governed project context.

#### Work Unit Layer
- work-unit facts
- state machine
- transitions
- transition gates
- bound workflows
- artifact expectations

**Solves:** turns work into a durable lifecycle contract.

#### Workflow Layer
- workflow steps
- workflow routes
- workflow context facts
- transition-scoped execution

**Solves:** replaces loose prompt chaining with explicit progression.

#### Step Layer
Use a compact bullet list only.

- **agent** — the productive core of Chiron; the surrounding system exists to provide the agent with the right context and guardrails over what it can affect.
- **form** — captures workflow facts into the workflow, either through manual input or prefilled values.
- **branch** — supports complex workflows by routing execution through different paths based on conditions over workflow facts.
- **action** — currently propagates selected workflow facts into project context to show that workflows are isolated and only affect project state at explicit checkpoints.
- **invoke** — allows nested and chained execution so one workflow can trigger additional workflows or child work without flattening everything into one path.

**Solves:** gives execution a typed and inspectable behavior model.

### Minimal notes to place around the visual

- **Project facts** live at project scope.
- **Work-unit facts, states, and transitions** live at work-unit scope.
- **Workflow context facts** live at workflow scope.
- **Transition gates** are powered by condition sets.
- **Steps** are the executable core, but they always run inside workflows.

### Recommended visuals

#### Project visual
Show the **Project Layer** as the outer context that contains the other layers.

It should show:
- project context outside
- work units inside the project
- workflows inside work units
- steps inside workflows

#### Work Unit visual
Show the **Work Unit Layer** through a state-machine / transition-gate diagram.

It should show:
- authored states
- transitions
- transition gates / condition checks
- workflows bound to transitions

#### Workflow visual
Show the **Workflow Layer** as a step-type composition diagram.

It should show:
- workflow as the host structure
- supported step types inside it
- typed execution instead of one generic agent call

#### Step panel
Do not use a heavy standalone diagram here.

Use only the compact step-type bullet list:
- `agent`
- `form`
- `branch`
- `action`
- `invoke`
- `display`

---

## 5. Analysis

### Suggested poster text

BMAD was used as a concrete reference methodology to test whether Chiron could represent a real SDLC method rather than an invented toy flow. The current seed shows that this mapping is now concrete.

### Seeded BMAD progression in Chiron
- **Setup** — establishes baseline project framing and selects the next path.
- **Brainstorming** — supports structured exploration and convergence.
- **Research** — adds evidence through market, domain, or technical investigation.
- **Product Brief** — bridges discovery into planning.
- **PRD** — defines the planning contract for downstream work.
- **UX / Architecture** — refine design and technical guardrails from PRD context.
- **Implementation** — executes bounded code-change and validation work.

### Minimal takeaway
The seeded BMAD path demonstrates that Chiron can map a real methodology into durable work units, transitions, workflows, and evidence-bearing outputs.

### Recommended visual
- `academic_reports/figures/chiron-poster-bmad-progression.png`

---

## 6. Findings

The strongest finding is that Chiron can express the primary planning and execution path of a real methodology through durable work units rather than loose prompt phases.

### Four primary seeded work units

#### Setup
- captures durable setup context
- owns the setup summary and project overview artifact
- routes the next planning path

#### Product Brief
- bridges discovery into planning
- binds setup, brainstorming, and research context when relevant
- produces a concise brief plus downstream synthesis

#### PRD
- turns the brief into a formal planning contract
- captures vision, success criteria, journeys, scope, and requirements
- feeds downstream UX, architecture, and implementation work

#### Implementation
- turns approved planning context into bounded execution
- captures scope, plan, code-change summary, validation, and test results
- preserves execution outputs as durable reviewable evidence

### Main finding

These four work units show that Chiron does not only store artifacts. It structures progression through facts, transitions, workflows, and durable outputs. The result is a lifecycle model in which planning and execution can be represented explicitly rather than carried informally across prompts and documents.

### Current seams to state honestly
- Git/workspace integration is still not fully realized.
- Methodology versioning is meaningful but not yet fully mature.

---

## 7. Conclusion

### Suggested poster text

Chiron was constructed as a methodology-first response to a real weakness in contemporary AI-assisted software development: the tendency for lifecycle meaning, specification authority, and implementation evidence to drift apart under rapid change. By formalizing software delivery through durable methodological entities and nested lifecycle layers, Chiron provides a coherent way to align specification, execution, and review.

The project’s analysis and BMAD mapping suggest that Chiron has captured a broad and meaningful abstraction of SDLC structure. Its current limitations lie less in the validity of the abstraction than in the maturity of surrounding seams such as Git integration and methodology version evolution. Even so, the work demonstrates that agentic software development can be treated not only as a model-capability problem, but as a **methodology, lifecycle, and governance problem** — and that this problem can be structured explicitly.

### Closing takeaway line

> **Chiron reframes agentic software delivery as a governed lifecycle system rather than a loose chain of prompts, tools, and generated code.**

---

## Diagram Plan

Based on the current poster direction, the most useful visuals are:

1. **Motivation diagram**
   - lifecycle churn → divergence → stale docs/specs → engineering risk

2. **Project overview diagram**
   - spec-driven tools pattern
   - Chiron’s two aspects: methodology authoring and project execution

3. **Core methodology model diagram**
   - methodology, work units, facts, transitions, workflows, artifacts

4. **Four-layer poster visual**
   - custom side-by-side Photoshop-native panel layout
   - not just a generic Mermaid diagram

5. **Work-unit state machine / transition gate diagram**
   - should sit inside or beside the Work Unit Layer explanation
   - this is where condition sets / readiness / workflow binding become concrete

6. **BMAD mapping comparison panel**
   - small analysis support visual or compact table

---

## Poster Writing Constraint

Every section must do one job only:

- **Motivation** = why this problem matters
- **Project Overview** = where Chiron sits relative to spec-driven systems
- **Core Methodology Model** = the durable entities
- **4-Layer Approach** = where and how everything happens
- **Analysis** = how BMAD was mapped into Chiron
- **Findings** = what that mapping shows, plus honest seams
- **Conclusion** = what the audience should leave believing
