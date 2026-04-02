# Chiron

Chiron is a methodology-first system for **modeling and supervising** agentic software delivery in a structured, inspectable way.

Instead of treating software work as a loose sequence of prompts, Chiron models it as:

- versioned methodologies
- typed work units
- explicit states and transitions
- bound workflows
- durable facts and artifact slots
- human-in-the-loop runtime and review surfaces

The core idea is simple: if teams already think in terms like “brainstorming,” “PRD,” “architecture,” “epic,” “story,” “review,” and “verification,” then those concepts should be first-class system objects rather than informal chat conventions.

Chiron is designed for **agentic-driven SDLCs** where humans, agents, workflows, and durable project state all need to cooperate without becoming opaque.

## Current status

Chiron already has real methodology and runtime surfaces in the repo:

- methodology versions
- work-unit authoring
- methodology facts
- dependency definitions
- project/runtime views
- transition execution detail
- workflow execution detail

The **L3 workflow-step layer is not fully implemented yet**.

That means Chiron already has the shape of the system, the design-time boundaries, the runtime/project model, and the core taxonomy, but the deepest workflow-step authoring and execution layer is still being finished. The current detailed L3 planning work lives in:

- `.sisyphus/drafts/l3-step-definition-execution-followup.md`

## Why Chiron exists

Most AI-assisted development workflows break down in one of these ways:

- the process lives only in people’s minds
- the agent sees too much or too little context
- approvals are ad hoc rather than modeled
- artifacts exist, but their lifecycle is unclear (easily drift as you continue implementation)
- progress is visible only as chat history
- planning and execution drift apart

Chiron exists to make those concerns explicit.

It tries to answer questions like:

- What kind of work is this?
- What state is it in?
- What facts must exist before it can move?
- Which workflow is allowed to run here?
- What artifacts should be produced?
- What can an agent read?
- What can an agent propose to change?
- Which actions require human review?
- What exactly happened during execution?

## The three-layer model: L1, L2, L3

Chiron separates methodology authoring into three layers.

### L1 — Work-unit topology

L1 is the **big picture methodology graph**.

This is where you define the major kinds of work in a methodology.

Examples:

- Brainstorming
- Research
- PRD
- Architecture
- Epic
- Story
- QA

At L1, you are answering questions like:

- What work-unit types exist?
- How do they relate?
- Which units depend on which others?
- What is the high-level methodology topology?

Think of L1 as the **map of the method**.

### L2 — Work-unit contract detail

L2 is the **inside of a selected work unit**.

Once you open a work unit, you define its durable structure:

- facts
- workflows
- state machine
- artifact slots

At L2, you are answering questions like:

- What facts belong to this work unit?
- What states can it move through?
- Which transitions are allowed?
- Which workflows can run during which transitions?
- What artifacts should it produce?

Think of L2 as the **contract of a work unit**.

### L3 — Workflow step definition and execution semantics

L3 is the **inside of a workflow**.

This is where workflows become step-based execution graphs made of explicit step types.

The canonical step taxonomy is:

- `form`
- `agent`
- `action`
- `invoke`
- `display`
- `branch`

At L3, you are answering questions like:

- What exact steps make up this workflow?
- What data becomes available at each step?
- Which step collects input?
- Which step runs an agent?
- Which step performs deterministic external effects?
- Which step invokes another workflow?
- Which step branches?
- Which step only presents information?

Think of L3 as the **execution grammar of the method**.

### Why the separation matters

This separation is one of the main ideas behind Chiron.

- **L1** defines the methodology landscape.
- **L2** defines the contract of each kind of work.
- **L3** defines how a workflow actually runs.

That separation matters because it prevents everything from collapsing into one giant undifferentiated “workflow builder.”

For agentic SDLCs, that is important. A system needs to distinguish:

- planning structure
- durable domain contracts
- runtime execution mechanics

without mixing them into one vague object.

## Core taxonomy

This is the vocabulary Chiron uses.

### Methodology

A **methodology** is the reusable operating model for how a team works.

Examples:

- BMAD-style product development
- research-heavy discovery flows
- architecture-first delivery
- implementation and verification flows

A methodology is the top-level thing you version, publish, and pin projects to.

### Methodology version

A **methodology version** is an immutable or publishable snapshot of a methodology.

This matters because teams need stable definitions over time.

Example:

- `BMAD v1.0`
- `BMAD v1.1-draft`

Projects should be able to pin to a version rather than silently inheriting evolving rules.

### Methodology facts

**Methodology facts** are methodology-wide facts that are not owned by one specific work unit.

They define reusable global inputs or defaults the methodology cares about.

Examples:

- `project_type`
- `story_intent`
- `output_language`

These are distinct from work-unit facts.

### Work unit

A **work unit** is a methodology-defined unit of work.

This is the primary planning and execution anchor in Chiron.

Examples:

- Brainstorming
- PRD
- Architecture
- Epic
- Story
- QA review

In practice, a project creates instances of these work units and moves them through transitions.

### Work-unit facts

**Work-unit facts** are facts owned by a specific work-unit type.

Examples:

- a Story may own `acceptance_criteria`
- an Epic may own `story_draft_specs`
- a Research work unit may own `research_goals`

These facts are part of the durable contract of that work unit.

### Artifact slot

An **artifact slot** is a methodology-defined place where durable outputs can live.

Examples:

- `prd_doc`
- `architecture_doc`
- `story_doc`
- `research_report`
- `code_changes`

The point is that the methodology defines the slot contract, while runtime executions produce snapshots or file sets against that slot.

This is cleaner than treating every produced file as an untyped side effect.

### State

A **state** is a named lifecycle state for a work unit.

Examples:

- `draft`
- `ready`
- `in_progress`
- `review`
- `done`

States express where the work unit currently is in its lifecycle.

### Transition

A **transition** is a valid move from one state to another.

Examples:

- `draft -> ready`
- `ready -> in_progress`
- `review -> done`

Transitions are where methodology policy becomes operational.

They are also where workflows can be bound.

### Workflow

A **workflow** is a structured execution path attached to methodology behavior.

Examples:

- `brainstorming`
- `create-prd`
- `create-architecture`
- `dev-story`
- `verify-story`

In Chiron, workflows are not just labels. They are the executable layer that should eventually become step graphs at L3.

### Start gates and completion gates

A **gate** is a condition set that controls readiness or completion.

Usefully, Chiron treats these as explicit policy rather than informal expectations.

Examples:

- a transition should not start until required facts exist
- a transition should not complete until required artifacts are present
- a workflow should not proceed until certain context values are available

In other words, gates are how the methodology says:

> “This move is allowed only if these conditions are satisfied.”

### Workflow binding

A **workflow binding** connects a workflow to a transition.

This means the methodology can explicitly say:

- when a Story moves from `ready` to `in_progress`, `dev-story` is an allowed workflow
- when a PRD moves from `draft` to `ready`, `create-prd` is an allowed workflow

At runtime, Chiron also distinguishes between:

- **primary workflows**
- **supporting workflows**

That distinction is important because one workflow may be the main transition-driving execution while others provide supporting work.

### Step

A **step** is a node inside a workflow.

This is the L3 level.

Each workflow is composed of step types with different responsibilities.

### Step types

#### Form step

Collects or edits structured data.

Useful for:

- collecting project context
- selecting target work units
- filling in acceptance criteria
- entering structured facts before an agent runs

#### Agent step

Runs an agent session with explicit readable and writable boundaries.

Useful for:

- brainstorming
- drafting
- analysis
- proposing structured outputs

The key design point is that the agent should not get an undefined blob of context or uncontrolled write access.

#### Action step

Performs deterministic, bounded external effects.

Useful for:

- persisting bound updates outward
- creating or refreshing artifacts

This is intentionally different from an agent step. It is for explicit system actions, not open-ended conversation.

#### Invoke step

Invokes another workflow, either in the current context or through child work units.

Useful for:

- fan-out from an Epic into child Story workflows
- triggering a brainstorming subflow
- delegating specialized sub-work

#### Display step

Renders information in a read-only way.

Useful for:

- summaries
- diagnostics
- instructions
- review surfaces

#### Branch step

Chooses a route based on explicit conditions.

Useful for:

- different paths for greenfield vs brownfield
- different follow-up flows depending on current facts
- conditional methodology behavior

## A concrete agentic SDLC example

Here is a practical way to think about Chiron.

### Example: greenfield product delivery

Suppose a team wants to go from idea to shipped story in a structured AI-assisted flow.

At the methodology level, they may define work units like:

- Brainstorming
- Research
- PRD
- Architecture
- Epic
- Story
- Verification

Then they define:

- facts each unit owns
- states and transitions
- artifact slots such as `prd_doc`, `architecture_doc`, `story_doc`, `code_changes`, `verification_report`
- workflows bound to specific transitions

That gives them a methodology saying things like:

- Brainstorming can produce ideation outputs
- PRD cannot become ready until the required PRD artifact exists
- Stories cannot move into active implementation until they depend on PRD and Architecture
- Verification cannot complete until test or validation evidence exists

Then, at L3, a `create-prd` workflow might eventually look like this:

1. **Form** — capture project goals and constraints
2. **Agent** — draft the PRD structure
3. **Display** — show draft sections for review
4. **Action** — persist approved PRD artifact
5. **Branch** — decide whether more refinement is needed or completion is allowed

The usefulness is not just that an AI helps write the PRD.

The usefulness is that:

- the workflow is explicit
- the facts are typed
- the artifact has a known slot
- readiness is gated
- human review can be formal
- downstream work knows what exists and what does not

That is a much stronger SDLC primitive than “open a chat and ask the model what to do next.”

## Another example: epic to story fan-out

An Epic work unit might own:

- epic goal
- epic scope
- story draft specs
- parent/child references

When the Epic reaches the right transition, an `invoke` step can create or activate child Story work units.

That means Chiron can support patterns like:

- an Epic agent proposes several story drafts
- the human reviews them
- the methodology invokes Story creation in a structured way
- the current Epic becomes the parent reference during materialization
- each Story then runs its own delivery workflow

This is the kind of thing people often do manually with issue trackers, docs, and chat threads. Chiron is trying to make it a first-class, inspectable methodology behavior.

## What is already implemented vs still planned

### Implemented enough to be real

Today, the repo already contains substantial work for:

- methodology version authoring
- work-unit authoring
- methodology facts
- dependency definitions
- work-unit L2 tabs for facts, workflows, state machine, and artifact slots
- project runtime views
- transition execution detail
- workflow execution detail
- runtime/project facts and artifact surfaces
- methodology/runtime service boundaries around L1 and L2

### Still in progress

The biggest unfinished part is the full L3 workflow-step layer.

That includes the end-to-end authoring and execution story for:

- step CRUD at full fidelity
- step-specific runtime behavior
- full workflow editor deep-edit experience
- complete step-execution persistence model
- deeper harness and agent-step runtime integration

Several runtime-adjacent packages also still exist mainly as scaffolds today, including:

- `packages/agent-runtime`
- `packages/tooling-engine`
- `packages/provider-registry`
- `packages/ax-engine`

So the honest description is:

> Chiron already has a strong methodology model and meaningful runtime/operator surfaces, but the workflow-step execution layer is still being actively designed and implemented.

## Design principles behind Chiron

Chiron is built around a few strong principles.

### 1. Methodology should be explicit

If a team depends on a process, that process should be modeled, not implied.

### 2. Planning and execution should stay connected

The system should not separate “planning docs” from “runtime reality” so completely that they drift apart.

### 3. Agents need bounded context and bounded authority

An agent should not be dropped into a workflow with unlimited context and undefined write permissions.

### 4. Human review should be formal, not ad hoc

Approvals, rejections, edited approvals, and gated transitions should be modeled as first-class events.

### 5. Artifacts and facts should be durable

Outputs should not disappear into chat logs. They should land in typed slots and facts the rest of the system can reason about.

### 6. The system should be inspectable

Users should be able to answer:

- what happened
- why it happened
- what is blocked
- what is ready
- what changed
- what can run next

## How Chiron relates to familiar concepts

If you need quick external framing:

- it has some of the **durable orchestration** flavor people associate with workflow engines
- it has some of the **human-in-the-loop** structure people associate with approval-oriented agent systems
- it has some of the **epic/story hierarchy** familiarity people know from SDLC planning tools

But Chiron is not meant to be “just another workflow engine” or “just another chat agent.”

Its main bet is that **methodology itself** should be modeled as a durable, versioned, executable system.

## Repo structure

This is a monorepo built with Bun and Turborepo.

High-level structure:

```text
chiron/
├── apps/
│   ├── web/         # React + TanStack Router methodology/project UI
│   ├── server/      # Hono + oRPC API server
│   └── desktop/     # Electron shell
├── packages/
│   ├── methodology-engine
│   ├── workflow-engine
│   ├── contracts
│   ├── db
│   ├── core
│   └── other supporting packages
└── docs/
    └── architecture and planning canon
```

## Technology stack

- **TypeScript**
- **React**
- **TanStack Router**
- **Tailwind CSS**
- **shadcn/ui**
- **Hono**
- **oRPC**
- **Bun**
- **Drizzle ORM**
- **SQLite / Turso**
- **Better Auth**
- **Effect-TS**
- **Turborepo**

## Getting started

Install dependencies:

```bash
bun install
```

Apply the schema:

```bash
bun run db:push
```

Optionally seed the database:

```bash
bun run db:seed
```

Run the development environment:

```bash
bun run dev
```

Default local endpoints:

- Web: `http://localhost:3001`
- API: `http://localhost:3000`

## Useful scripts

- `bun run dev` — start all apps in development mode
- `bun run build` — build all apps
- `bun run check-types` — run TypeScript checks across the repo
- `bun run test` — run tests
- `bun run test:e2e` — run Playwright tests
- `bun run db:push` — apply schema to the database
- `bun run db:seed` — seed canonical development data
- `bun run check` — lint/format check

## Where to read next

If you want the current architectural source of truth:

- `docs/README.md`
- `docs/architecture/epic-3-authority.md`
- `docs/architecture/chiron-module-structure.md`
- `docs/architecture/methodology-canonical-authority.md`
- `docs/architecture/methodology-pages/`

If you want the current L3 planning context:

- `.sisyphus/drafts/l3-step-definition-execution-followup.md`

## Why this README is written this way

This README is intentionally more explicit than a normal project README because Chiron is not mainly a library or a simple app. It is a model of how agentic software delivery itself should be structured.

If you are reading this to give feedback, the most useful questions are:

- Is the L1 / L2 / L3 separation the right one?
- Is the taxonomy clear enough?
- Are workflows, gates, facts, and artifact slots the right primitives?
- Is the agent/human/action/invoke split sensible?
- Does this look like the right foundation for inspectable agentic SDLCs?
