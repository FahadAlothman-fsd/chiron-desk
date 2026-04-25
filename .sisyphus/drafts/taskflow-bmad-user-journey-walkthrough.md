# TaskFlow BMAD User Journey Walkthrough

## Purpose
- Walk through the seeded BMAD MVP journey using TaskFlow as the example project.
- Capture each workflow's user decisions, agent-step dialogue, facts written, artifact outputs, and downstream effects.
- Keep this as the conversational walkthrough source before generating the implementation plan.

## Example Project
- Name: TaskFlow
- Type: Greenfield task management web application for small development teams.
- Initial prompt source: user-provided TaskFlow description in chat.

## Step 1: Setup

### Work unit
- Work unit: `Setup`
- State path: activation → `done`
- Transition: `activation_to_done`
- Workflow: `setup_project`

### Step 1.1 — `setup_intake_form`
- Type: `form`
- User-facing purpose: ask only the minimum needed to route setup.
- User decision:
  - `initiative_name_ctx = "TaskFlow"`
  - `project_kind_ctx = "greenfield"`

### Step 1.2 — `setup_project_kind_branch`
- Type: `branch`
- Branch decision:
  - `project_kind_ctx == "greenfield"` → route to `greenfield_discovery_agent`
  - Brownfield path is not used for TaskFlow.

### Step 1.3 — `greenfield_discovery_agent`
- Type: `agent`
- User gives the full TaskFlow prompt.
- Agent objective:
  - Understand the intended product.
  - Extract durable setup facts.
  - Produce `PROJECT_OVERVIEW` and `PROJECT_CONTEXT`.
  - Recommend next BMAD path.

#### Expected agent conversation decisions
- Confirm product category: developer-focused task management / collaboration SaaS.
- Confirm target users: small dev teams, indie hackers, early startups, remote-first teams.
- Confirm initial delivery target: MVP in 3–4 months with one full-stack dev and part-time designer.
- Flag scope risk: requested feature set is too broad for one developer in 3–4 months.
- Recommend downstream path:
  1. Brainstorming to sharpen the MVP wedge, differentiation, and scope tradeoffs.
  2. Market/competitive research because competition is explicit and crowded.
  3. Product Brief to turn the sharpened direction into an executive product brief.
  4. UX Design because simplicity/differentiation depends heavily on UX.
  5. PRD after Brainstorming/Research/Product Brief.
  6. Architecture after PRD/UX.

#### Facts written
- `initiative_name = "TaskFlow"`
- `project_kind = "greenfield"`
- `repository_type = "greenfield_app"`
- `project_parts = ["web_app", "api", "database", "realtime_sync", "integrations"]`
- `technology_stack_by_part` includes:
  - web app: React + TypeScript
  - realtime: WebSockets
  - API: REST API
  - database: PostgreSQL
  - deployment: Vercel/Railway
- `integration_points` includes:
  - GitHub
  - Slack
  - Google Calendar
  - Zapier/webhooks
- `planning_artifacts_directory` remains user/project configured, no default assumption.
- `implementation_artifacts_directory` remains user/project configured, no default assumption.

#### Artifact outputs
- `PROJECT_OVERVIEW`
- `PROJECT_CONTEXT`

### Step 1.4 — optional downstream invoke: Brainstorming
- Recommended MVP behavior: Setup offers a branch-before-invoke choice after greenfield discovery.
- For TaskFlow, Setup recommends invoking Brainstorming immediately.
- User decision:
  - Invoke `Brainstorming`: yes
- Setup does **not** preselect Brainstorming supporting workflows because Setup does not have access to another work unit's workflow catalog in the current model.
- Setup passes broad context only; Brainstorming determines topic, goals, and technique workflow refs internally.

#### Invoke behavior
- Setup uses an `invoke` step targeting a new `Brainstorming` work unit.
- Setup binds context into Brainstorming:
  - `brainstorming_focus_ctx = "TaskFlow MVP wedge and scope reduction"`
  - `desired_outcome_ctx = "Decide the narrow MVP wedge, what to defer, and what differentiates TaskFlow for small dev teams."`
  - optional `objectives_ctx` items derived from the user's initial idea
- It does not bind `selected_technique_workflow_refs`.
- It does not bind `PROJECT_CONTEXT` or any other Setup artifact because Brainstorming cannot currently dereference another work unit's artifacts.
- Brainstorming runs as a child/downstream work unit.
- When Brainstorming completes, its outputs are referenced back from Setup or become available to Product Brief/Research as source work units.

### Setup result after Brainstorming invoke
- Setup can still reach `done` after invoking Brainstorming and recording the downstream reference.
- In the preferred MVP journey, Setup invokes Brainstorming only. Research/Product Brief/PRD are not run inside Setup.
- Setup then runs final propagation and ends.
- TaskFlow now has:
  - a Brainstorming work-unit reference
  - a recommended path into Research and Product Brief

### Step 1.5 — `propagate_setup_outputs`
- Type: `action`
- Action kind: `propagation`
- Purpose: persist final Setup facts/artifacts and recommendations.
- Writes:
  - Setup facts
  - `PROJECT_OVERVIEW`
  - `PROJECT_CONTEXT`
  - recommended next work-unit guidance

### Setup ends
- Setup reaches `done`.
- User returns to project guidance / work-unit guidance view.

## Guidance after Setup

### What the user sees
Because Setup invoked Brainstorming, and Brainstorming completed, guidance shows:

```txt
Completed:
- Setup
- Brainstorming

Recommended next:
1. Research — validate market and technical assumptions
2. Product Brief — synthesize the product direction
3. PRD — available after Product Brief, or directly if user skips brief
```

### Guidance logic
- If Brainstorming is done and Research is not done:
  - recommend Research.
- If Brainstorming/Research are done and Product Brief is not done:
  - recommend Product Brief.
- If Product Brief is done:
  - PRD becomes the primary open next work unit.

### TaskFlow path decision
- User follows guidance:
  1. runs Market Research
  2. runs Technical Research
  3. runs Product Brief
  4. then guidance opens/recommends PRD

## Step 2: Brainstorming

### Work unit
- Work unit: `Brainstorming`
- State path: activation → `done`
- Transition: `activation_to_done`
- Workflow: `run_brainstorming`

### How it starts
- It starts through Setup's optional `invoke` step.
- It receives plain prefilled goals/topic from Setup, not Setup artifacts.
- Brainstorming can also be started independently without Setup.
- The user can refine the topic/goals at Brainstorming start.

### Step 2.1 — `brainstorming_goal_and_technique_agent`
- Type: `agent`
- Purpose: determine/refine the Brainstorming topic, goals, and supporting technique workflow choices from Brainstorming's own input facts.
- Reads:
  - prefilled `brainstorming_focus_ctx`, if invoked from Setup
  - prefilled `desired_outcome_ctx`, if invoked from Setup
  - prefilled `objectives_ctx`, if invoked from Setup
- Writes:
  - `brainstorming_topic`
  - `brainstorming_goals`
  - `selected_technique_workflow_refs`

#### Why this is an agent step, not Setup data
- Setup only knows the project context and that Brainstorming is recommended.
- Brainstorming owns its own supporting workflow catalog.
- Therefore Brainstorming itself must decide which technique workflows are valid and useful.
- Setup may prefill topic/goals, but not technique workflow refs or Setup artifacts.

#### Expected TaskFlow topic/goals
- Topic:
  - `TaskFlow MVP wedge and scope reduction`
- Goals:
  - identify the narrow product wedge
  - reduce MVP scope for a 3–4 month solo-dev build
  - clarify differentiation from Jira/Linear/Todoist
  - identify which constraints need Research or Architecture validation

#### Expected technique recommendation
- `first_principles_analysis`
- `five_whys_deep_dive`
- `stakeholder_round_table`
- `critique_and_refine`

### Step 2.2 — `brainstorming_technique_confirmation_form`
- Type: `form`
- Purpose: let the user confirm or adjust the agent-recommended topic/goals/techniques.
- Writes:
  - confirmed `brainstorming_topic`
  - confirmed `brainstorming_goals`
  - confirmed `selected_technique_workflow_refs`

#### Expected agent conversation before the confirmation form
- Agent says the current TaskFlow scope is broad for 3–4 months.
- Agent recommends using Brainstorming to answer:
  - What is TaskFlow's narrow wedge?
  - Which feature set creates immediate value for 2–5 person dev teams?
  - Which features are MVP vs post-MVP?
  - What differentiates TaskFlow from Linear/Jira/Todoist?

#### Decisions made
- Keep the Brainstorming topic focused on MVP wedge/scope, not general ideation.
- Keep selected techniques as four workflows.
- Do not brainstorm every feature equally; prioritize scope reduction.

### Step 2.3 — `has_selected_techniques_branch`
- Type: `branch`
- Logic:
  - If selected technique refs exist → invoke selected techniques.
  - Else → go directly to synthesis agent.
- For TaskFlow:
  - Route: invoke selected techniques.

### Step 2.4 — `invoke_selected_techniques`
- Type: `invoke`
- Target kind: workflow
- Source mode: fact-backed from `selected_technique_workflow_refs`

#### Invoked technique workflows
1. `first_principles_analysis`
   - Breaks TaskFlow down to the irreducible user need.
   - Likely output: teams need shared clarity on who is doing what, what is blocked, and what matters this week.

2. `five_whys_deep_dive`
   - Explores why existing tools fail small dev teams.
   - Likely output: complexity, setup overhead, poor GitHub/task connection, and too much process ceremony.

3. `stakeholder_round_table`
   - Simulates viewpoints:
     - solo founder
     - full-stack developer
     - part-time designer
     - remote contractor
     - future paying team admin
   - Likely output: conflicting needs around simplicity, visibility, async collaboration, and reporting.

4. `critique_and_refine`
   - Challenges the initial feature list.
   - Likely output: reporting, advanced custom fields, and broad integrations are too much for MVP.

### Step 2.5 — `brainstorming_synthesis_agent`
- Type: `agent`
- Reads all technique outputs.
- Produces final synthesis.

#### Expected TaskFlow synthesis
- Recommended wedge:
  - `developer-native lightweight task management for tiny teams with excellent GitHub-linked dependencies/blockers`
- MVP should focus on:
  1. workspace/project/task basics
  2. assignment, priority, due date
  3. dependencies/blockers
  4. comments/activity feed
  5. GitHub issue/link integration
  6. simple Kanban/list views
  7. responsive accessible UI
- Defer:
  - full analytics suite
  - burndown charts
  - time estimates vs actuals
  - Google Calendar sync
  - Zapier/webhook support
  - custom fields beyond labels/priority
  - robust offline-first sync if too costly for MVP; keep as architectural concern or limited read/offline cache

#### Decisions made
- Differentiation becomes GitHub-linked blockers/dependencies for small dev teams.
- MVP becomes narrower than the original prompt.
- Reporting moves to post-MVP except basic project/task counts.
- Offline support becomes a risk requiring Research/Architecture validation.

### Step 2.6 — `propagate_brainstorming_outputs`
- Type: `action`
- Action kind: `propagation`
- Persists:
  - `brainstorming_topic`
  - `selected_technique_workflow_refs`
  - `technique_outputs`
  - `brainstorming_synthesis`
  - `BRAINSTORMING_OUTPUT`

### Brainstorming result
- Brainstorming reaches `done`.
- It produces a completed Brainstorming work unit and artifact.
- In the current MVP, downstream Product Brief/Research do not automatically dereference Brainstorming artifacts; the user or invoking flow can pass plain synthesized outputs/goals forward as input facts.

### What happens back in Setup?
- Setup does not resume with more complex logic unless the invocation model needs continuation.
- Practically, Setup records/retains the Brainstorming reference and completes.
- The user is routed to the next recommended work unit:
  - Research, if validating market/technical assumptions first.
  - Product Brief, if turning the Brainstorming synthesis into product direction first.
- For TaskFlow, recommended next step after Brainstorming: targeted Research.

## Step 3: Research

### Work unit
- Work unit: `Research`
- State path: activation → `done`
- Transition: `activation_to_done`
- Workflow variants:
  - `market_research`
  - `technical_research`
  - `domain_research`

### How it starts
- Research can be started independently.
- In the TaskFlow journey, Brainstorming recommends Research topics.
- The user starts targeted Research after Brainstorming.
- The workflow receives plain research inputs, not Brainstorming artifacts.

### Recommended TaskFlow research split
For TaskFlow, use two Research work units:

1. `market_research`
   - Goal: validate positioning and MVP wedge against Jira, Linear, Todoist, Asana, ClickUp, Monday.

2. `technical_research`
   - Goal: validate feasibility and scope of offline support, realtime collaboration, GitHub integration, and accessible responsive UI for a 3–4 month MVP.

### Step 3A: Market Research

#### Work unit instance
- Work unit: `Research`
- Workflow: `market_research`

#### Input facts
- `research_variant = "market"`
- `research_questions`:
  - How do small dev teams choose between Jira, Linear, Todoist, Asana, ClickUp, and Monday?
  - What pain points exist around GitHub-linked task workflows for tiny teams?
  - What features are table-stakes vs differentiators for small teams?
  - Is `developer-native lightweight task management for tiny teams` a credible wedge?

#### Agent-step conversation
- Agent says the market is crowded and the research should not try to prove TaskFlow is universally better.
- It frames the question as: where do tiny dev teams feel underserved by both heavyweight issue trackers and simple todo apps?
- It asks whether to focus on developer teams only or broader small teams.

#### Decision
- Focus market research on developer teams only.
- Treat non-developer project management as out-of-scope for MVP positioning.

#### Expected findings
- Jira/ClickUp/Monday are powerful but heavy.
- Linear is developer-friendly but may still be too workflow/process-oriented for tiny informal teams.
- Todoist/Reminders are too individual and weak on blockers/GitHub context.
- TaskFlow differentiation should be:
  - dependency/blocker clarity
  - GitHub-linked work
  - async team visibility
  - minimal setup

#### Facts written
- `research_variant = "market"`
- `research_questions`
- `research_findings`
- `research_synthesis`

#### Artifact
- `RESEARCH_REPORT`

### Step 3B: Technical Research

#### Work unit instance
- Work unit: `Research`
- Workflow: `technical_research`

#### Input facts
- `research_variant = "technical"`
- `research_questions`:
  - What is the simplest viable realtime collaboration architecture for TaskFlow?
  - What level of offline support is feasible for a 3–4 month MVP?
  - How should GitHub issue linking be scoped for MVP?
  - What performance approach supports 100+ tasks per project?
  - What accessibility constraints should influence architecture and UI design?

#### Agent-step conversation
- Agent flags that full offline-first sync plus realtime collaboration is a major complexity multiplier.
- It asks whether MVP can scope offline to cached read access / draft-safe local edits rather than full conflict-resolving offline sync.

#### Decision
- MVP should not promise full offline-first sync.
- MVP target becomes:
  - resilient UI
  - local draft preservation where feasible
  - clear reconnect behavior
  - full conflict-resolving offline sync deferred unless Product Brief/PRD re-prioritizes it.

#### Expected findings
- WebSockets or hosted realtime service can support small-team updates.
- PostgreSQL is appropriate.
- GitHub MVP should start with issue URL linking and optional import/sync later.
- 100+ tasks/project is modest but list virtualization/filtering should be considered.
- WCAG 2.1 AA should influence component system from the start.

#### Facts written
- `research_variant = "technical"`
- `research_questions`
- `research_findings`
- `research_synthesis`

#### Artifact
- `RESEARCH_REPORT`

### Research result
- Both Research work units reach `done`.
- Their reports give Product Brief concrete evidence and tradeoffs.
- The next recommended work unit is `Product Brief`.

## Step 4: Product Brief

### Work unit
- Work unit: `Product Brief`
- State path: activation → `done`
- Transition: `activation_to_done`
- Workflow: `create_product_brief`

### How it starts
- Product Brief is started after Brainstorming + Market Research + Technical Research.
- Product Brief can attach source work-unit references:
  - Brainstorming work unit: `TaskFlow MVP wedge and scope reduction`
  - Market Research work unit
  - Technical Research work unit
- In the MVP, those references are not merely traceability links: the Product Brief agent MCP should expose a safe read package for each referenced Brainstorming/Research work unit.
- The read package includes work-unit metadata, current state, active fact instances, and artifact slot instances as file paths, so the agent can read `BRAINSTORMING_OUTPUT` and `RESEARCH_REPORT`.
- Product Brief may also receive plain synthesized input facts, but those are helper summaries, not substitutes for reading source artifacts.

### Input facts
- `source_brainstorming_work_units = [brainstorming_taskflow_mvp_wedge]`
- `source_research_work_units = [market_research_taskflow, technical_research_taskflow]`
- `product_idea_summary = "TaskFlow is lightweight developer-native task management for tiny teams."`
- `positioning_synthesis = "Tiny dev teams want GitHub-connected task clarity without Jira/Linear process overhead."`
- `technical_scope_synthesis = "Realtime-lite collaboration, limited offline resilience, GitHub issue linking, accessible responsive UI."`
- `mvp_constraints = "One full-stack developer, part-time designer, 3–4 month MVP timeline."`

### Step 4.1 — `brief_intent_agent`
- Type: `agent`
- Purpose: understand product intent and sharpen the executive framing.
- Reads:
  - plain synthesized inputs
  - source Brainstorming/Research work-unit refs
  - MCP-exposed facts/artifact file paths for referenced Brainstorming/Research work units
- Writes:
  - `product_idea_summary_ctx`
  - `target_users_ctx`
  - `value_proposition_ctx`

#### Agent conversation
- Agent says TaskFlow should not position as a general task manager.
- Agent recommends narrowing to tiny software teams that need task clarity directly connected to code work.
- Agent asks whether the primary buyer/user is:
  1. solo founder managing contractors
  2. tiny dev team lead
  3. early-stage startup founder

#### Decision
- Primary initial persona: tiny dev team lead / founder-engineer managing 2–5 people.
- Secondary persona: solo founder managing contractors.

### Step 4.2 — `brief_context_discovery_agent`
- Type: `agent`
- Purpose: synthesize Brainstorming and Research into product direction.
- Reads:
  - `positioning_synthesis`
  - `technical_scope_synthesis`
  - `mvp_constraints`
  - `BRAINSTORMING_OUTPUT` file path from referenced Brainstorming work unit
  - `RESEARCH_REPORT` file paths from referenced Research work units
- Writes:
  - `market_context_ctx`
  - `scope_context_ctx`
  - `risk_context_ctx`

#### Decisions made
- Keep TaskFlow developer-focused.
- Keep GitHub-linked blockers/dependencies as the wedge.
- Treat full offline-first sync as post-MVP or architecture-risk item.
- Treat analytics as post-MVP except basic status counts.
- Preserve accessibility as a must-have, not a later enhancement.

### Step 4.3 — `brief_elicitation_agent`
- Type: `agent`
- Purpose: ask focused product brief questions and resolve positioning tradeoffs.

#### Agent questions
1. What is the one-sentence promise?
2. What is the MVP boundary?
3. What must be explicitly out of scope?
4. What makes TaskFlow developer-native?

#### TaskFlow decisions
- One-sentence promise:
  - `TaskFlow helps tiny development teams see ownership, blockers, and GitHub-linked work without adopting heavyweight project-management process.`
- MVP boundary:
  - workspace/project/task basics
  - assignees, priority, due dates
  - blockers/dependencies
  - comments/activity feed
  - GitHub issue linking
  - Kanban/list views
  - accessible responsive UI
  - basic export
- Explicitly out of MVP:
  - burndown charts
  - individual contributor analytics
  - full time tracking
  - Google Calendar sync
  - Zapier/webhooks
  - full bidirectional GitHub sync
  - full offline-first conflict resolution

### Step 4.4 — `brief_draft_agent`
- Type: `agent`
- Purpose: draft and review the Product Brief artifact.
- Writes:
  - `PRODUCT_BRIEF`
  - optional `PRODUCT_BRIEF_DISTILLATE`
  - structured Product Brief facts

#### Expected Product Brief sections
- Product summary
- Problem statement
- Target users
- Value proposition
- Differentiation
- MVP scope
- Explicit non-goals
- Success outcomes
- Key risks / validation needs
- Recommended next work units

### Step 4.5 — `propagate_product_brief_outputs`
- Type: `action`
- Action kind: `propagation`
- Persists:
  - `source_brainstorming_work_units`
  - `source_research_work_units`
  - `product_idea_summary`
  - `target_users`
  - `value_proposition`
  - `success_outcomes`
  - `mvp_scope_summary`
  - `explicit_non_goals`
  - `PRODUCT_BRIEF`
  - optional `PRODUCT_BRIEF_DISTILLATE`

### Product Brief result
- Product Brief reaches `done`.
- It becomes the main source for PRD creation.
- It keeps traceability to Brainstorming and Research through work-unit reference facts.

### Recommended next work unit
- `PRD`
- UX Design can wait until after PRD, because PRD needs to define the product requirements contract first.

## Guidance after Product Brief

### What the user sees
```txt
Completed:
- Setup
- Brainstorming
- Market Research
- Technical Research
- Product Brief

Recommended next:
- PRD
```

### Why PRD is open now
- Product Brief exists and is done.
- Product Brief has enough synthesis to become a PRD source.
- PRD can attach:
  - source Product Brief work-unit reference
  - optional Brainstorming/Research references via Product Brief traceability
  - plain inputs copied from Product Brief synthesis if needed

## Step 5: PRD

### Work unit
- Work unit: `PRD`
- State path: activation → `done`
- Transition: `activation_to_done`
- Workflow: `create_prd`

### How it starts
- User clicks/runs PRD from guidance.
- PRD binds to one source Product Brief.
- The PRD agent should be able to inspect Product Brief facts/artifact through an explicit source Product Brief work-unit reference read package, following the same MCP enhancement pattern used for Product Brief reading Brainstorming/Research.

### Input facts / references
- `source_product_brief = Product Brief(TaskFlow)`
- `product_brief_artifact_ref = PRODUCT_BRIEF`
- Optional helper inputs from Product Brief synthesis:
  - product promise
  - target users
  - MVP scope in/out
  - success outcomes
  - risks/open questions

### Step 5.1 — `prd_source_selection_agent`
- Type: `agent`
- Purpose: confirm the source Product Brief and PRD focus.
- Reads:
  - `source_product_brief`
  - MCP-exposed Product Brief facts/artifact file path
- Writes:
  - `source_product_brief_ctx`
  - `prd_source_summary_ctx`

#### Agent conversation
- Agent says:
  - Product Brief is available and focused enough for PRD creation.
  - PRD should turn TaskFlow's brief into explicit requirements and MVP boundaries.
- Agent asks:
  - Should PRD preserve the narrowed MVP from Product Brief, or re-expand original requested features?

#### Decision
- Preserve narrowed MVP.
- Original broad feature list remains a future roadmap source, not MVP scope.

### Step 5.2 — `prd_product_discovery_agent`
- Type: `agent`
- Purpose: translate brief into product context, users, goals, and success criteria.
- Writes:
  - `product_vision_ctx`
  - `target_users_ctx`
  - `success_criteria_ctx`
  - `scope_boundaries_ctx`

#### Decisions made
- Primary user:
  - tiny dev team lead / founder-engineer managing 2–5 people
- Secondary user:
  - solo founder managing contractors
- Core job-to-be-done:
  - know what work matters, who owns it, and what is blocked without heavyweight process
- MVP success criteria:
  - team can create project/tasks
  - team can assign and prioritize work
  - team can model blockers/dependencies
  - team can discuss work asynchronously
  - team can connect tasks to GitHub issues/links
  - team can view work in Kanban/list views
  - app is responsive and WCAG-conscious
  - user can export task data

### Step 5.3 — `prd_user_journeys_agent`
- Type: `agent`
- Purpose: define core user journeys for requirements.
- Writes:
  - `user_journeys_ctx`

#### TaskFlow journeys
1. Founder creates a workspace and project.
2. Team lead creates and prioritizes tasks.
3. Developer sees assigned tasks and blockers.
4. Developer links a task to a GitHub issue.
5. Team discusses a task asynchronously via comments/activity.
6. Team lead switches between Kanban/list views to understand status.
7. User exports project/task data.

### Step 5.4 — `prd_requirements_agent`
- Type: `agent`
- Purpose: create FR/NFR streams and requirement IDs.
- Writes:
  - `functional_requirements_ctx`
  - `non_functional_requirements_ctx`
  - `scope_boundaries_ctx`

#### Functional requirements draft
- `FR1`: Users can create and manage a workspace.
- `FR2`: Users can create and manage projects within a workspace.
- `FR3`: Users can create, edit, assign, prioritize, and set due dates on tasks.
- `FR4`: Users can define task dependencies: blocked by / blocks.
- `FR5`: Users can create subtasks or checklists within a task.
- `FR6`: Users can comment on tasks and see task activity history.
- `FR7`: Users can link tasks to GitHub issues or pull requests by URL.
- `FR8`: Users can view project tasks in Kanban view.
- `FR9`: Users can view project tasks in list view.
- `FR10`: Users can label or categorize tasks with a small fixed label system.
- `FR11`: Users can export project/task data.
- `FR12`: Users can receive basic realtime updates for task changes while online.

#### Non-functional requirements draft
- `NFR1`: The UI must be responsive for desktop and mobile web.
- `NFR2`: The UI must target WCAG 2.1 AA accessibility.
- `NFR3`: A project with 100+ tasks must remain performant for filtering and view switching.
- `NFR4`: The system must preserve unsent user input during transient network failures where feasible.
- `NFR5`: The system must clearly show reconnect/sync state for realtime updates.
- `NFR6`: The system must support data export for GDPR/data portability.
- `NFR7`: The MVP must avoid full offline-first conflict resolution unless re-prioritized.

### Step 5.5 — `prd_scope_and_roadmap_agent`
- Type: `agent`
- Purpose: separate MVP, post-MVP, and explicit non-goals.
- Writes:
  - `mvp_scope_ctx`
  - `post_mvp_scope_ctx`
  - `explicit_non_goals_ctx`

#### MVP in
- workspace/project/task basics
- assignment, priority, due date
- dependencies/blockers
- subtasks/checklists
- comments/activity feed
- GitHub issue/PR URL linking
- Kanban/list views
- labels/basic categorization
- responsive accessible UI
- basic export
- realtime-lite updates

#### MVP out
- full analytics suite
- burndown charts
- individual contributor metrics
- time estimates vs actuals
- Google Calendar sync
- Zapier/webhooks
- full bidirectional GitHub sync
- full offline-first sync/conflict resolution
- arbitrary custom fields

### Step 5.6 — `prd_validation_and_polish_agent`
- Type: `agent`
- Purpose: validate PRD consistency, remove ambiguity, and produce final PRD artifact.
- Writes:
  - `prd_validation_ctx`
  - `prd_artifact_ctx`
  - `next_work_unit_ref`

#### Agent checks
- Every MVP feature has at least one FR.
- Every major constraint appears as an NFR or explicit non-goal.
- Scope does not re-expand beyond Product Brief.
- Offline and analytics risks are explicitly constrained.
- PRD is ready to feed UX Design and Architecture.

### Step 5.7 — `propagate_prd_outputs`
- Type: `action`
- Action kind: `propagation`
- Persists:
  - `source_product_brief`
  - `product_vision`
  - `target_users`
  - `user_journeys`
  - `functional_requirements`
  - `non_functional_requirements`
  - `scope_boundaries`
  - `success_criteria`
  - `prd_validation`
  - `PRD`
  - next recommended work units

### PRD result
- PRD reaches `done`.
- It becomes the requirements contract for:
  - UX Design
  - Architecture
  - Backlog
  - Implementation Readiness

### Recommended next work units
- UX Design, because TaskFlow differentiation depends heavily on simplicity and accessibility.
- Architecture, after or alongside UX, because realtime/offline/GitHub scope needs technical decisions.

## Step 6: UX Design

### Work unit
- Work unit: `UX Design`
- State path: activation → `done`
- Transition: `activation_to_done`
- Workflow: `create_ux_design`

### How it starts
- User clicks/runs UX Design from guidance after PRD is done.
- UX Design binds to one source PRD.
- UX Design should inspect PRD facts/artifact through explicit source PRD work-unit reference read package:
  - PRD metadata/state
  - active PRD fact instances
  - `PRD` artifact file path

### Input facts / references
- `source_prd = PRD(TaskFlow)`
- `prd_artifact_ref = PRD`
- Optional helper inputs copied from PRD synthesis:
  - target users
  - user journeys
  - MVP scope
  - FR/NFR summary
  - accessibility constraints

### Step 6.1 — `ux_project_understanding_agent`
- Type: `agent`
- Purpose: understand PRD context and define UX design focus.
- Reads:
  - `source_prd`
  - MCP-exposed PRD facts/artifact file path
- Writes:
  - `ux_project_summary_ctx`
  - `ux_design_focus_ctx`

#### Agent conversation
- Agent says TaskFlow's UX differentiation is low-friction clarity for tiny dev teams.
- Agent identifies the UX challenge:
  - model tasks, dependencies, comments, views, and GitHub context without making the product feel like Jira.
- Agent asks:
  - Should the primary UX optimize for first-time setup speed or power-user task triage?

#### Decision
- Optimize first for first-time setup speed and daily clarity.
- Power-user triage can be supported through filters/views but not dominate MVP.

### Step 6.2 — `ux_core_experience_agent`
- Type: `agent`
- Purpose: define core experience, information architecture, and emotional target.
- Writes:
  - `core_experience_ctx`
  - `information_architecture_ctx`
  - `emotional_experience_ctx`

#### Decisions made
- UX principle:
  - `Clarity before configurability.`
- Primary navigation:
  - workspace switcher
  - projects
  - project board/list
  - task detail panel/page
- Core emotional target:
  - lightweight, calm, developer-native, not enterprise-heavy.
- Avoid:
  - dense configuration screens
  - too many statuses
  - analytics dashboards in MVP

### Step 6.3 — `ux_user_flows_agent`
- Type: `agent`
- Purpose: turn PRD user journeys into UX flows.
- Writes:
  - `user_flows_ctx`
  - `interaction_requirements_ctx`

#### TaskFlow UX flows
1. Create workspace and first project.
2. Create first task from empty project state.
3. Assign task and add priority/due date.
4. Add dependency/blocker relationship.
5. Link GitHub issue/PR URL to a task.
6. Comment on a task and view activity.
7. Switch between Kanban and list views.
8. Export project data.

#### Decisions made
- First-run UX should guide the user into creating a project and first task quickly.
- Dependencies should be visible directly on task cards/detail, not hidden in advanced settings.
- GitHub linking should start as a simple URL/link field with recognizable GitHub metadata if feasible.

### Step 6.4 — `ux_component_strategy_agent`
- Type: `agent`
- Purpose: define reusable UX components and design-system requirements.
- Writes:
  - `component_strategy_ctx`
  - `design_token_requirements_ctx`
  - `ux_design_requirements_ctx`

#### Component strategy
- `WorkspaceSwitcher`
- `ProjectSidebar`
- `TaskCard`
- `TaskDetailPanel`
- `DependencyBadge`
- `BlockedByList`
- `GitHubLinkPreview`
- `CommentThread`
- `ActivityFeed`
- `ViewToggle` for Kanban/List
- `EmptyState`
- `StatusMessage`
- `ExportDialog`

#### UX Design Requirements generated
- `UX-DR1`: First-run flow must let a new user create a workspace, project, and first task with minimal steps.
- `UX-DR2`: Task cards must show assignee, priority, due date, dependency/blocker state, and GitHub link status without visual overload.
- `UX-DR3`: Task detail view must support comments, activity, subtasks/checklists, dependencies, and GitHub links in a clear hierarchy.
- `UX-DR4`: Dependency/blocker relationships must be visible in both Kanban/list context and task detail context.
- `UX-DR5`: Empty states must explain what to do next and reduce setup anxiety.
- `UX-DR6`: The UI must include accessible focus states, keyboard navigability, semantic labels, and sufficient contrast.
- `UX-DR7`: Layout must work on mobile-width screens with no loss of core task management ability.

### Step 6.5 — `ux_responsive_accessibility_agent`
- Type: `agent`
- Purpose: define responsive and accessibility strategy.
- Writes:
  - `responsive_strategy_ctx`
  - `accessibility_requirements_ctx`

#### Decisions made
- WCAG 2.1 AA remains a must-have.
- Keyboard navigation must support task list/board traversal and task detail actions.
- Kanban should degrade gracefully on mobile into stacked columns or list-first layout.
- Realtime state changes must be announced non-disruptively, not steal focus.
- Error/reconnect states must be visible and understandable.

### Step 6.6 — `ux_specification_agent`
- Type: `agent`
- Purpose: produce the UX design specification artifact.
- Writes:
  - `UX_DESIGN_SPECIFICATION`
  - optional `UX_COLOR_THEMES`
  - optional `UX_DESIGN_DIRECTIONS`
  - structured UX facts

#### Expected UX spec sections
- UX goals and principles
- Information architecture
- Core user flows
- Component strategy
- View behavior: Kanban/list/task detail
- Dependency/blocker interaction design
- GitHub link interaction design
- Responsive strategy
- Accessibility strategy
- UX Design Requirements (`UX-DR#`)
- Risks/open UX questions

### Step 6.7 — `propagate_ux_outputs`
- Type: `action`
- Action kind: `propagation`
- Persists:
  - `source_prd`
  - `ux_design_requirements`
  - `user_flows`
  - `component_strategy`
  - `accessibility_requirements`
  - `responsive_strategy`
  - `UX_DESIGN_SPECIFICATION`
  - optional visual artifacts

### UX Design result
- UX Design reaches `done`.
- It produces first-class `UX-DR#` requirements for Backlog.
- Architecture should consume UX constraints for layout, realtime behavior, accessibility, and frontend component architecture.

### Recommended next work unit
- `Architecture`

## Step 7: Architecture

### Work unit
- Work unit: `Architecture`
- State path: activation → `done`
- Transition: `activation_to_done`
- Workflow: `create_architecture`

### How it starts
- User clicks/runs Architecture from guidance after PRD and UX Design are done.
- Architecture binds to:
  - source PRD
  - optional source UX Design
  - optional Product Brief / Research references if the user wants deeper context
- Architecture agent should inspect referenced PRD/UX facts/artifact file paths through the MCP read package pattern.

### Input facts / references
- `source_prd = PRD(TaskFlow)`
- `source_ux_design = UX Design(TaskFlow)`
- optional `source_product_brief = Product Brief(TaskFlow)`
- optional `source_research_work_units = [Technical Research(TaskFlow)]`

### Step 7.1 — `architecture_input_validation_agent`
- Type: `agent`
- Purpose: confirm PRD/UX inputs and identify architectural risk areas.
- Reads:
  - source PRD facts/artifact
  - source UX facts/artifact
  - optional technical research facts/report
- Writes:
  - `architecture_input_inventory_ctx`
  - `architecture_risk_areas_ctx`

#### Agent conversation
- Agent says TaskFlow has several architecture-sensitive requirements:
  - realtime-lite updates
  - task dependencies
  - GitHub linking
  - accessible responsive UI
  - export/GDPR support
  - limited offline resilience
- Agent asks whether to prioritize build simplicity or future scalability.

#### Decision
- Prioritize build simplicity for 3–4 month MVP while leaving clear extension seams.
- Do not overbuild full offline-first/realtime infrastructure.

### Step 7.2 — `architecture_context_analysis_agent`
- Type: `agent`
- Purpose: analyze stack, deployment, data, and integration constraints.
- Writes:
  - `technology_stack_ctx`
  - `deployment_model_ctx`
  - `data_model_candidates_ctx`

#### Decisions made
- Frontend:
  - React + TypeScript
- API:
  - REST API for MVP integrations and app operations
- Database:
  - PostgreSQL
- Realtime:
  - WebSocket channel or managed realtime layer for online task updates
- Deployment:
  - Vercel for web app
  - Railway or similar for API/database if not using integrated platform
- Offline:
  - limited resilience, not full conflict-resolution sync

### Step 7.3 — `architecture_core_decisions_agent`
- Type: `agent`
- Purpose: produce core architecture decisions and ADR-like facts.
- Writes:
  - `architecture_decisions_ctx`
  - `architecture_requirements_ctx`

#### Architecture decisions
- `ADR1`: Use PostgreSQL as system of record for workspaces, projects, tasks, dependencies, comments, activity, and GitHub links.
- `ADR2`: Use REST API as the primary integration/API surface for MVP.
- `ADR3`: Use realtime events only for online task/activity updates; do not build full offline conflict-resolution sync in MVP.
- `ADR4`: Model task dependencies as explicit relational edges between tasks.
- `ADR5`: Model GitHub integration initially as task-linked external references, not full bidirectional sync.
- `ADR6`: Build accessibility into the component system from the start.
- `ADR7`: Keep analytics minimal in MVP; expose basic counts/status summaries only.

#### Architecture-derived requirements
- `ARCH-REQ1`: Task dependency model must support `blocked_by` and `blocks` relationships.
- `ARCH-REQ2`: Activity feed must record task creation, assignment, comments, dependency changes, and GitHub link changes.
- `ARCH-REQ3`: Realtime update channel must broadcast task/activity changes to active workspace/project clients.
- `ARCH-REQ4`: Export service must support project/task data export.
- `ARCH-REQ5`: GitHub link model must store URL, provider metadata where available, and relation type.
- `ARCH-REQ6`: UI architecture must support keyboard navigation and accessible status announcements.
- `ARCH-REQ7`: Offline resilience must preserve unsent user input where feasible and expose reconnect state.

### Step 7.4 — `architecture_data_and_api_agent`
- Type: `agent`
- Purpose: define data model and API boundaries for downstream stories.
- Writes:
  - `data_model_ctx`
  - `api_contracts_ctx`
  - `integration_points_ctx`

#### Data model candidates
- `Workspace`
- `WorkspaceMember`
- `Project`
- `Task`
- `TaskDependency`
- `Subtask` or `ChecklistItem`
- `TaskComment`
- `TaskActivityEvent`
- `TaskExternalLink`
- `Label`
- `ExportJob`

#### API boundaries
- Workspace/project endpoints
- Task CRUD endpoints
- Dependency endpoints
- Comment/activity endpoints
- GitHub link endpoints
- Export endpoints
- Realtime subscription/event endpoints

#### Decisions made
- Do not create all data model tables in a single first story.
- Backlog stories must introduce entities just-in-time.
- Architecture documents the full candidate model, but story sequencing decides when each table is introduced.

### Step 7.5 — `architecture_frontend_patterns_agent`
- Type: `agent`
- Purpose: define frontend/component patterns based on UX Design.
- Writes:
  - `frontend_patterns_ctx`
  - `accessibility_patterns_ctx`

#### Frontend patterns
- Shared task query/cache boundary.
- Task board/list views consume same task collection model.
- Task detail panel/page owns comments, dependencies, GitHub links, and activity feed.
- Form components must preserve unsent input during transient failures where feasible.
- Realtime events update visible task/activity state without stealing focus.

#### Accessibility patterns
- Semantic controls for task actions.
- Keyboard-accessible task navigation.
- Visible focus states.
- Live regions or non-disruptive announcements for realtime/reconnect status.
- Color cannot be the only indicator for priority/blocker state.

### Step 7.6 — `architecture_validation_agent`
- Type: `agent`
- Purpose: validate PRD/UX coverage and produce implementation handoff.
- Writes:
  - `requirements_coverage_ctx`
  - `architecture_validation_ctx`
  - `architecture_document_artifact_ctx`
  - optional `architecture_decision_records_artifact_ctx`

#### Validation checks
- Every PRD NFR has an architecture response.
- UX-DR accessibility/responsive requirements have implementation guidance.
- Offline scope is explicitly limited.
- Realtime scope is implementable for MVP.
- GitHub integration is scoped to link/reference model for MVP.
- Data export is represented.
- Story sequencing guardrail is clear: no giant upfront schema story.

### Step 7.7 — `propagate_architecture_outputs`
- Type: `action`
- Action kind: `propagation`
- Persists:
  - `source_prd`
  - `source_ux_design`
  - `architecture_decisions`
  - `implementation_patterns`
  - `project_structure`
  - `architecture_requirements`
  - `requirements_coverage`
  - `data_model`
  - `api_contracts`
  - `integration_points`
  - `ARCHITECTURE_DOCUMENT`
  - optional `ARCHITECTURE_DECISION_RECORDS`

### Architecture result
- Architecture reaches `done`.
- It produces architecture-derived requirements (`ARCH-REQ#`) that Backlog must extract alongside PRD FR/NFR and UX-DR requirements.
- It provides story guardrails:
  - introduce tables/entities just-in-time
  - keep realtime limited
  - keep GitHub integration scoped
  - preserve accessibility patterns
  - do not reintroduce full offline sync unless Course Correction changes scope

### Recommended next work unit
- `Backlog` — combined Epics/Stories + sprint/status MVP work unit.

## Step 8: Backlog

### Work unit
- Work unit: `Backlog`
- Workflow family: combined BMAD `create_epics_and_stories` + MVP sprint planning/status behavior
- Cardinality: `many_per_project`
- MVP role: the most stateful seeded work unit

### Why Backlog has multiple transitions
- Backlog is not just an artifact generator in the MVP seed.
- It owns the bridge from planning to implementation:
  - draft epics/stories
  - validate backlog quality
  - route to Implementation Readiness
  - consume readiness result
  - select active working set
  - initialize sprint/status tracking
  - create only selected Story work units
  - track progress and closure
- Therefore Backlog should have more states/transitions than Setup, PRD, UX, or Architecture.

### Backlog lifecycle for TaskFlow
1. activation → `draft`
   - Transition: `activation_to_draft`
   - Workflow: `create_epics_and_stories`
2. `draft` → `readiness_review`
   - Transition: `draft_to_readiness_review`
   - Workflow: `check_implementation_readiness`
3. `readiness_review` → `ready_for_sprint_planning`
   - Transition: `readiness_review_to_ready_for_sprint_planning`
   - Workflow: `accept_readiness_result`
4. `readiness_review` → `draft`, if readiness fails
   - Transition: `readiness_review_to_draft`
   - Workflow: `return_to_draft_after_readiness`
5. `ready_for_sprint_planning` → `sprint_planned`
   - Transition: `ready_for_sprint_planning_to_sprint_planned`
   - Workflow: `plan_active_working_set`
6. `sprint_planned` → `in_progress`
   - Transition: `sprint_planned_to_in_progress`
   - Workflow: `start_selected_stories`
7. `in_progress` → `in_progress`
   - Transition: `in_progress_to_in_progress`
   - Workflow: `update_sprint_status`
8. `in_progress` → `ready_for_sprint_planning`, when selected working set is done but more stories remain
   - Transition: `in_progress_to_ready_for_sprint_planning`
   - Workflow: `close_working_set_and_select_next`
9. `in_progress` → `done`, when entire Backlog scope is complete or intentionally closed
   - Transition: `in_progress_to_done`
   - Workflow: `complete_backlog_scope`
10. `done` → `done`
   - Transition: `done_to_done`
   - Workflow: `record_retrospective_or_course_correction`

### Input facts / references
- `source_prd = PRD(TaskFlow)`
- `source_ux_design = UX Design(TaskFlow)`
- `source_architecture = Architecture(TaskFlow)`
- optional `source_product_brief = Product Brief(TaskFlow)`
- optional `source_research_work_units = [Market Research(TaskFlow), Technical Research(TaskFlow)]`

### Step 8.1 — `backlog_requirements_extraction_agent`
- Type: `agent`
- Purpose: extract the complete requirement inventory from PRD, UX, and Architecture.
- Reads:
  - PRD facts/artifact
  - UX Design facts/artifact
  - Architecture facts/artifact
  - optional Product Brief and Research facts/artifacts
- Writes:
  - `input_documents_ctx`
  - `requirements_inventory_ctx`
  - initial `backlog_findings_ctx`

#### TaskFlow requirement streams extracted
- PRD FRs:
  - workspace/project/task basics
  - assignment
  - priority and due dates
  - dependencies/blockers
  - subtasks/checklists
  - comments/activity
  - GitHub issue/PR URL linking
  - Kanban/list views
  - labels/basic categorization
  - export
  - realtime-lite updates
- PRD NFRs:
  - responsive UI
  - WCAG 2.1 AA
  - performance for 100+ tasks/project
  - data export/GDPR-conscious behavior
  - limited offline resilience
- UX-DRs:
  - `UX-DR1` through `UX-DR7`
- ARCH-REQs:
  - `ARCH-REQ1` through `ARCH-REQ7`

### Step 8.2 — `backlog_epic_design_agent`
- Type: `agent`
- Purpose: group requirements into user-value epics, not technical layers.
- Writes:
  - `epic_design_ctx`
  - initial `requirements_coverage_map_ctx`
  - `epic_review_notes_ctx`

#### Agent conversation
- Agent proposes user-value epics and explicitly rejects technical-layer epics like “Database Setup” or “API Layer”.
- Agent asks whether the first epic should optimize for onboarding/demo value or data-foundation completeness.

#### Decision
- First epic optimizes onboarding/demo value while introducing only the data/API foundation needed for that value.

#### Draft TaskFlow epic design
1. `EPIC-1`: First Workspace, Project, and Task
   - User can create a workspace/project and manage first useful tasks.
   - Covers first-run UX, base data model, task CRUD, empty states.
2. `EPIC-2`: Team Task Clarity
   - User can assign ownership, priority, due dates, labels, and task views.
   - Covers Kanban/list, accessible task cards, mobile behavior.
3. `EPIC-3`: Blockers, Dependencies, and Work Breakdown
   - User can model blockers, dependencies, subtasks/checklists.
   - Covers dependency edges and blocker visibility.
4. `EPIC-4`: Collaboration Context
   - User can comment, view activity, and link GitHub issue/PR URLs.
   - Covers activity feed and external links without bidirectional sync.
5. `EPIC-5`: Operational Confidence
   - User gets realtime-lite updates, reconnect/draft preservation, and export.
   - Covers limited realtime/offline/export requirements.

### Step 8.3 — `backlog_story_generation_agent`
- Type: `agent`
- Purpose: create complete story inventory, each single-agent completable with acceptance criteria.
- Writes:
  - `story_inventory_ctx`
  - updated `requirements_coverage_map_ctx`
  - draft `EPICS_AND_STORIES`
  - `story_review_notes_ctx`

#### Example story inventory shape
- `STORY-1.1`: Create workspace and first project
- `STORY-1.2`: Create and edit first task
- `STORY-1.3`: First-run empty states and onboarding guidance
- `STORY-2.1`: Assign task ownership, priority, and due date
- `STORY-2.2`: Kanban/list view toggle over shared task collection
- `STORY-2.3`: Accessible responsive task cards
- `STORY-3.1`: Add task dependencies/blockers
- `STORY-3.2`: Show blockers in cards and task detail
- `STORY-3.3`: Add subtasks/checklists
- `STORY-4.1`: Add comments and activity events
- `STORY-4.2`: Link GitHub issue/PR URL to task
- `STORY-5.1`: Realtime-lite task/activity updates
- `STORY-5.2`: Reconnect state and draft preservation
- `STORY-5.3`: Export project/task data

#### Story guardrails
- Each story must reference FR/NFR/UX-DR/ARCH-REQ IDs.
- Each story must include Given/When/Then acceptance criteria.
- No story may require a future story to function.
- Database/entities are introduced just-in-time.
- Full offline sync, bidirectional GitHub sync, custom fields, and analytics remain out of scope.

### Step 8.4 — `backlog_final_validation_agent`
- Type: `agent`
- Purpose: validate coverage, quality, dependencies, and architecture/UX alignment.
- Writes:
  - `backlog_validation_ctx`
  - final `requirements_coverage_map_ctx`
  - final `EPICS_AND_STORIES`
  - `backlog_findings_ctx`

#### Validation outcome
- Expected status: `ready_for_implementation_readiness`
- Required checks:
  - all PRD FRs covered
  - all UX-DRs covered or explicitly deferred
  - all ARCH-REQs covered or explicitly mapped to implementation guardrails
  - no technical-layer epics
  - no forward dependencies
  - all stories are single-agent completable

### Step 8.5 — `backlog_dependency_graph_agent`
- Type: `agent`
- Purpose: create story-key dependency graph without materializing every Story as a work unit.
- Writes:
  - `story_dependency_graph_ctx`

#### Decision
- Do not create Story work units for every story at Backlog draft time.
- Backlog stores the story inventory and dependency graph as structured data.
- Story work units are created only for the active working set after readiness passes.

### Step 8.6 — `propagate_backlog_draft_outputs`
- Type: `action`
- Action kind: `propagation`
- Persists:
  - source PRD / UX / Architecture references
  - `requirements_inventory`
  - `requirements_coverage_map`
  - `epic_design`
  - `story_inventory`
  - `story_dependency_graph`
  - `backlog_validation`
  - `EPICS_AND_STORIES`
  - next recommendation: run Backlog readiness gate

### Backlog state after draft workflow
- State: `draft`
- It is not “done” yet.
- Next transition is `draft_to_readiness_review`.

### Step 8.7 — `check_implementation_readiness`
- Transition: `draft_to_readiness_review`
- Type: `agent` sequence + propagation
- Runs the readiness gate inside Backlog, using:
  - PRD reference/artifact
  - Architecture reference/artifact
  - UX Design reference/artifact
  - Backlog draft facts
  - `EPICS_AND_STORIES`
- Produces Backlog-owned `READINESS_REPORT` and `implementation_readiness_result`.

### Backlog state during readiness
- State: `readiness_review`
- Readiness is not a separate work unit in the MVP.
- Backlog has already written the readiness result/report, but requires a separate fixed transition to accept or reject that result.

### Step 8.8A — `accept_readiness_result`
- Transition: `readiness_review_to_ready_for_sprint_planning`
- Runs only when `implementation_readiness_result.overallStatus = "ready"`.
- Purpose: unlock active working-set planning.

### Step 8.8B — `return_to_draft_after_readiness`
- Transition: `readiness_review_to_draft`
- Runs when `implementation_readiness_result.overallStatus = "needs_work" | "not_ready"`.
- Purpose: route readiness findings back into Backlog refinement.

### Step 8.9 — `plan_active_working_set`
- Transition: `ready_for_sprint_planning_to_sprint_planned`
- Purpose: merged MVP Sprint Planning behavior on Backlog.
- Writes:
  - `active_working_set_ctx`
  - `sprint_status_ctx`
  - `SPRINT_STATUS`

#### Recommended first TaskFlow working set
- `STORY-1.1`: Create workspace and first project
- `STORY-1.2`: Create and edit first task
- `STORY-1.3`: First-run empty states and onboarding guidance

#### Reason
- This gives the fastest visible TaskFlow value.
- It exercises workspace/project/task foundations without prematurely building all schema/API surfaces.
- It persists enough selected-story payload for `start_selected_stories` to prepare Story draft specs in its own workflow, because draft specs are workflow-local invoke inputs.

### Step 8.10 — `start_selected_stories`
- Transition: `sprint_planned_to_in_progress`
- Type: `invoke`
- Creates Story work units only for selected working-set stories:
  - `STORY-1.1`
  - `STORY-1.2`
  - `STORY-1.3`
- Each selected Story starts its own Story lifecycle.
- Invoke constraint:
  - Backlog invokes Story only via activation transition `activation_to_ready_for_dev` / workflow `create_story`.
  - `start_selected_stories` first creates `selected_story_draft_specs_ctx` from durable `active_working_set`, then invokes Story in the same workflow.
  - Backlog does not invoke Story `start_dev_story`, `dev_story`, or `code_review`.
  - Those later workflows run on each Story work unit after it exists.

### Step 8.11 — `update_sprint_status`
- Transition: `in_progress_to_in_progress`
- Purpose: keep Backlog-level `SPRINT_STATUS` synced with selected Story work-unit states.

### Step 8.12 — `close_backlog_working_set`
- Superseded naming: this split into two explicit transitions.

### Step 8.12A — `close_working_set_and_select_next`
- Transition: `in_progress_to_ready_for_sprint_planning`
- Purpose: close the current selected working set after selected Story work units reach done, then return to working-set selection because more stories remain.

### Step 8.12B — `complete_backlog_scope`
- Transition: `in_progress_to_done`
- Purpose: close the Backlog only when all relevant stories in this planning baseline are complete or intentionally closed/deferred.

### Backlog result
- Backlog can eventually reach `done`, but only after the entire selected Backlog scope is complete or intentionally closed.
- Backlog draft generation alone is not final completion.
- Normal repeated story sets loop on the same Backlog:
  - `ready_for_sprint_planning` → `sprint_planned` → `in_progress` → `ready_for_sprint_planning`
  - Repeat until no more stories should be selected.
- This makes Backlog the methodology seed's densest MVP lifecycle.

### Recommended next transition
- Backlog `draft_to_readiness_review` via `check_implementation_readiness`.

## Step 9: Backlog Readiness Gate

### Work unit / transition
- Work unit: `Backlog`
- Transition: `draft_to_readiness_review`
- Workflow: `check_implementation_readiness`
- To state: `readiness_review`
- Output artifact: Backlog-owned `READINESS_REPORT`

### Role in the TaskFlow journey
- The readiness gate is the adversarial checkpoint after Backlog draft creation.
- It validates that PRD, UX Design, Architecture, and Backlog agree before any Story work units are created.
- It does not select sprint scope.
- It does not invoke Story implementation.
- It is not a separate Implementation Readiness work unit in the MVP.
- It is not a mid-transition conditional state change.
- The transition always lands in `readiness_review`.
- After that, Backlog runs a separate transition based on the stored readiness result:
  - ready path: `readiness_review_to_ready_for_sprint_planning`
  - remediation path: `readiness_review_to_draft`

### Input facts / references
- `prd_work_unit_ref = PRD(TaskFlow)`
- `architecture_work_unit_ref = Architecture(TaskFlow)`
- `backlog_work_unit_ref = Backlog(TaskFlow)`
- `ux_design_work_unit_ref = UX Design(TaskFlow)`
- `input_artifact_refs`:
  - `PRD`
  - `UX_DESIGN_SPECIFICATION`
  - `ARCHITECTURE_DOCUMENT`
  - `EPICS_AND_STORIES`

### Step 9.1 — `readiness_document_discovery_agent`
- Type: `agent`
- Purpose: confirm all required planning artifacts exist and resolve duplicate/missing sources.
- Reads:
  - PRD work-unit read package
  - UX Design work-unit read package
  - Architecture work-unit read package
  - Backlog work-unit read package
  - source artifact refs
- Writes:
  - `document_inventory_ctx`
  - initial `backlog_findings_ctx`

#### Expected TaskFlow result
- Required sources found:
  - PRD: yes
  - Architecture: yes
  - Backlog/EPICS_AND_STORIES: yes
- Optional but expected source found:
  - UX Design: yes
- No duplicate artifact conflict expected.

### Step 9.2 — `readiness_prd_analysis_agent`
- Type: `agent`
- Purpose: extract PRD requirements and verify PRD completeness for implementation.
- Writes:
  - `prd_analysis_ctx`
  - `backlog_findings_ctx`

#### TaskFlow PRD analysis focus
- Ensure narrowed MVP scope is explicit.
- Ensure future-roadmap items remain out of implementation scope.
- Confirm FRs and NFRs are sufficiently testable.
- Preserve requirement IDs for traceability.

#### Expected findings
- No critical PRD gaps if PRD includes clear exclusions for:
  - full analytics
  - calendar sync
  - Zapier/webhooks
  - full GitHub bidirectional sync
  - full offline conflict-resolution sync
  - arbitrary custom fields

### Step 9.3 — `readiness_coverage_and_ux_agent`
- Type: `agent`
- Purpose: validate PRD requirement coverage and UX alignment.
- Reads:
  - `prd_analysis_ctx`
  - Backlog `requirements_coverage_map`
  - Backlog `story_inventory`
  - UX Design facts/artifact
  - Architecture facts/artifact
- Writes:
  - `epic_coverage_validation_ctx`
  - `ux_alignment_assessment_ctx`
  - `backlog_findings_ctx`

#### Coverage checks
- Every PRD FR has at least one mapped story.
- Every UX-DR has either story coverage or a justified deferral.
- Architecture constraints are reflected in story notes/acceptance criteria where relevant.

#### UX alignment checks
- Task cards and task detail stories cover `UX-DR2` / `UX-DR3`.
- Dependency stories cover `UX-DR4`.
- First-run stories cover `UX-DR1` / `UX-DR5`.
- Responsive/accessibility coverage appears across feature stories, not as an afterthought-only story.

### Step 9.4 — `readiness_epic_quality_agent`
- Type: `agent`
- Purpose: enforce BMAD epic/story quality rules.
- Writes:
  - `epic_quality_review_ctx`
  - `backlog_findings_ctx`

#### Quality checks
- Epics are user-value focused, not technical layers.
- Story `STORY-1.1` starts with usable workspace/project value, not generic schema setup.
- Stories are single-agent completable.
- Acceptance criteria are specific enough for implementation agents.
- No story depends on a future story.
- Data model is introduced just-in-time.

#### Possible warning to catch
- If `STORY-5.1` realtime-lite updates depends on activity feed from `STORY-4.1`, the dependency graph must express that ordering.

### Step 9.5 — `readiness_final_assessment_agent`
- Type: `agent`
- Purpose: issue final readiness status and recommendation.
- Writes:
  - `implementation_readiness_result_ctx`
  - final `backlog_findings_ctx`
  - `READINESS_REPORT`
  - `next_work_unit_refs`

#### Possible outcomes
- `overallStatus = ready`
  - Backlog may record readiness and proceed to active working-set planning.
- `overallStatus = needs_work`
  - Backlog returns to `draft` via `refine_backlog`.
- `overallStatus = not_ready`
  - Specific upstream work unit should be remediated: PRD, UX Design, Architecture, Backlog, or Course Correction.

#### Expected TaskFlow outcome
- Recommended expected outcome: `ready`, assuming Backlog covered all FR/NFR/UX-DR/ARCH-REQ streams and no technical-layer epics were introduced.
- Next recommendation should be the existing Backlog work unit, not standalone Sprint Plan:
  - Backlog transition: `readiness_review_to_ready_for_sprint_planning`
  - Then Backlog transition: `ready_for_sprint_planning_to_sprint_planned`

### Step 9.6 — `propagate_readiness_outputs`
- Type: `action`
- Action kind: `propagation`
- Persists:
  - source PRD reference
  - source UX Design reference
  - source Architecture reference
  - source Backlog reference
  - `document_inventory`
  - `prd_analysis`
  - `epic_coverage_validation`
  - `ux_alignment_assessment`
  - `epic_quality_review`
  - `readiness_assessment`
  - `readiness_findings`
  - `READINESS_REPORT`
  - next recommended work-unit reference back to Backlog

### Readiness gate result
- Backlog reaches `readiness_review`.
- Backlog owns `READINESS_REPORT` and `implementation_readiness_result`.
- If readiness is `ready`, Backlog proceeds to:
  - `ready_for_sprint_planning`
  - then `sprint_planned`
- If readiness is not ready, Backlog or the relevant upstream work unit is refined first.

### Recommended next step
- Run one fixed Backlog transition:
  - `accept_readiness_result`, if ready
  - `return_to_draft_after_readiness`, if not ready

## Step 10: Story Work Units for Selected Backlog Stories

### Work unit
- Work unit: `Story`
- Cardinality: `many_per_project`
- MVP creation rule: created only by Backlog `start_selected_stories` for selected active-working-set story keys.
- No MVP `backlog` state on Story.
- No required Epic work-unit reference; Story stores `epic_key` from Backlog structured data.

### How Story work units start
- Backlog is in `sprint_planned`.
- Backlog active working set contains selected story keys, e.g.:
  - `STORY-1.1`
  - `STORY-1.2`
  - `STORY-1.3`
- Backlog has durable `active_working_set` data for the selected keys.
- User runs Backlog transition:
  - `sprint_planned_to_in_progress`
  - workflow: `start_selected_stories`
- `start_selected_stories` first prepares `selected_story_draft_specs_ctx`, then invokes one Story work unit per selected key.
- Each invocation uses Story activation transition:
  - `activation_to_ready_for_dev`
  - `create_story`

### Story lifecycle
1. activation → `ready_for_dev`
   - Transition: `activation_to_ready_for_dev`
   - Workflow: `create_story`
2. `ready_for_dev` → `in_progress`
   - Transition: `ready_for_dev_to_in_progress`
   - Workflow: `start_dev_story`
3. `in_progress` → `review`
   - Transition: `in_progress_to_review`
   - Workflow: `dev_story`
4. `review` → `done`
   - Transition: `review_to_done`
   - Workflow: `code_review`
5. `review` → `in_progress`, if review requires fixes
   - Transition: `review_to_in_progress`
   - Workflow: `code_review`

### Example selected story: `STORY-1.1`
- Story title: Create workspace and first project
- Source Backlog: `Backlog(TaskFlow MVP)`
- Epic key: `EPIC-1`
- Source requirements:
  - PRD FR: workspace/project basics
  - UX-DR1: first-run flow creates workspace/project/task with minimal steps
  - UX-DR5: empty states explain what to do next
  - ARCH-REQs: introduce only just-in-time data/API needed for workspace/project creation

### Story artifacts
- `STORY_DOCUMENT` — canonical story narrative/spec document.
- `CODE_CHANGE_FILESET` — durable implementation fileset/diff artifact created during `dev_story` and reviewed during `code_review`.
- `TEST_DOCUMENT` — durable test/QA evidence artifact created during `dev_story` and reviewed during `code_review`.
- `DEFERRED_WORK` — optional artifact for intentionally deferred review/follow-up work.

### Step 10.1 — `create_story`
- Transition: activation → `ready_for_dev`
- Purpose: author implementation-ready `STORY_DOCUMENT` from Backlog story data and source context.

#### Step 10.1.1 — `create_story_source_analysis_agent`
- Type: `agent`
- Reads:
  - Backlog work-unit read package
  - target story key
  - epic key
  - Backlog `EPICS_AND_STORIES`
  - Backlog `SPRINT_STATUS`
  - PRD / UX / Architecture trace through Backlog
- Writes:
  - `story_source_trace_ctx`
  - initial `story_authoring_context_ctx`
- Checks:
  - selected story key is in Backlog active working set
  - dependency stories are done or not required
  - source requirements are traceable

#### Step 10.1.2 — `create_story_research_and_context_agent`
- Type: `agent`
- Purpose: add implementation-relevant technical context only.
- Writes:
  - updated `story_authoring_context_ctx`
- Guardrail:
  - Do not expand beyond the selected story.

#### Step 10.1.3 — `create_story_spec_agent`
- Type: `agent`
- Writes:
  - `story_requirements_ctx`
  - `STORY_DOCUMENT`
- Produces:
  - story text
  - acceptance criteria
  - tasks/subtasks
  - dev notes
  - source requirement references
  - project structure/file guidance
  - empty Dev Agent Record sections

#### Step 10.1.4 — `create_story_validation_agent`
- Type: `agent`
- Writes:
  - `story_spec_validation_ctx`
- Gate:
  - `finalStatus = ready_for_dev`
  - no unresolved questions for the dev agent

#### Step 10.1.5 — `propagate_create_story_outputs`
- Type: `action`
- Action kind: `propagation`
- Persists:
  - Backlog reference
  - target story key
  - epic key
  - source trace
  - story requirements
  - authoring context
  - validation result
  - `STORY_DOCUMENT`

#### Step 10.1.6 — `sync_story_ready_status`
- Type: `action`
- Action kind: `propagation`
- Updates Backlog `SPRINT_STATUS`:
  - `STORY-1.1 = ready-for-dev`

### Step 10.2 — `start_dev_story`
- Transition: `ready_for_dev_to_in_progress`
- Type: action/progression workflow
- Purpose:
  - initialize implementation task status
  - update Backlog `SPRINT_STATUS` to `in-progress`

### Step 10.3 — `dev_story`
- Transition: `in_progress_to_review`
- Purpose: implement only the selected story and prepare for review.

#### Step 10.3.1 — `dev_story_implementation_agent`
- Type: `agent`
- Reads:
  - `STORY_DOCUMENT`
  - Story facts
  - project context if available
- Writes:
  - `implementation_task_status_ctx`
  - `implementation_summary_ctx`
  - `dev_agent_record_ctx`
  - `file_list_ctx`
  - `change_log_ctx`
- Guardrails:
  - implement only tasks/subtasks in `STORY_DOCUMENT`
  - halt for new dependency or scope expansion
  - do not implement future stories

#### Step 10.3.2 — `dev_story_validation_agent`
- Type: `agent`
- Writes:
  - `validation_results_ctx`
  - final `implementation_task_status_ctx`
- Checks:
  - tests/lint/build/QA as applicable
  - all acceptance criteria satisfied
  - all story tasks complete

#### Step 10.3.3 — `propagate_dev_story_outputs`
- Type: `action`
- Persists:
  - implementation status
  - implementation summary
  - validation results
  - dev agent record
  - file list
  - change log
  - updated `STORY_DOCUMENT`
  - `CODE_CHANGE_FILESET`
  - `TEST_DOCUMENT`

#### Step 10.3.4 — `sync_story_review_status`
- Type: `action`
- Updates Backlog `SPRINT_STATUS`:
  - `STORY-1.1 = review`

### Step 10.4 — `code_review`
- Transition if approved: `review_to_done`
- Transition if fixes needed: `review_to_in_progress`
- Purpose: adversarially review the story implementation.

#### Step 10.4.1 — `code_review_context_agent`
- Type: `agent`
- Purpose: gather story context and construct diff evidence.

#### Step 10.4.2 — `code_review_parallel_review_agent`
- Type: `agent`
- Runs review layers:
  - Blind Hunter
  - Edge Case Hunter
  - Acceptance Auditor

#### Step 10.4.3 — `code_review_triage_agent`
- Type: `agent`
- Classifies findings:
  - required patch
  - decision needed
  - defer
  - dismiss

#### Step 10.4.4 — `code_review_finalization_agent`
- Type: `agent`
- Writes:
  - `review_summary_ctx`
  - `review_findings_ctx`
  - updated `STORY_DOCUMENT`
  - reviewed `CODE_CHANGE_FILESET`
  - reviewed `TEST_DOCUMENT`
  - optional `DEFERRED_WORK`
- Outcome:
  - move to `done` only when required fixes are resolved or explicitly deferred
  - otherwise return to `in_progress`

#### Step 10.4.5 — `sync_story_final_review_status`
- Type: `action`
- Updates Backlog `SPRINT_STATUS`:
  - `done`, if approved
  - `in-progress`, if fixes required

### After selected Story work units finish
- Backlog remains `in_progress` while selected stories run.
- User/agent runs Backlog `update_sprint_status`:
  - transition: `in_progress_to_in_progress`
  - computes `working_set_completion_status`
- If selected set is complete and more stories remain:
  - next available transition: `in_progress_to_ready_for_sprint_planning`
  - workflow: `close_working_set_and_select_next`
- If selected set is complete and no stories remain:
  - next available transition: `in_progress_to_done`
  - workflow: `complete_backlog_scope`

### Recommended next walkthrough step
- Continue with Backlog selecting the second working set, e.g. `STORY-2.1`, `STORY-2.2`, `STORY-2.3`.
- The second set repeats the same activation-only invoke pattern: Backlog selects durable story payload, `start_selected_stories` creates workflow-local selected Story draft specs, then invokes Story `create_story` for each selected key.

## Step 11: Retrospective

### Work unit
- Work unit: `Retrospective`
- Cardinality: `many_per_project`
- Trigger: manual or guidance-recommended after a meaningful Backlog working set / epic slice completes.
- Normal TaskFlow trigger: after `WS-1` (`STORY-1.1`, `STORY-1.2`, `STORY-1.3`) reaches closed status.

### Role
- Retrospective is a standalone cross-cutting analysis work unit.
- It does not mutate Backlog, Story, PRD, UX, or Architecture.
- It extracts lessons and decides whether Course Correction is needed.

### Input facts / references
- `source_backlog_work_unit = Backlog(TaskFlow MVP)`
- `source_working_set_id = WS-1`
- `source_story_work_units` is a many-cardinality work-unit-reference fact populated by the first Retrospective workflow step.
- Candidate stories come from project-level Story instances, not only pre-attached refs.
- Example selected set:
  - `Story(STORY-1.1)`
  - `Story(STORY-1.2)`
  - `Story(STORY-1.3)`
- Story artifacts:
  - `STORY_DOCUMENT`
  - `CODE_CHANGE_FILESET`
  - `TEST_DOCUMENT`
  - optional `DEFERRED_WORK`
- Backlog artifact:
  - `SPRINT_STATUS`

### Workflow: `run_retrospective`
0. Retrospective availability condition
   - Guidance can show Retrospective when the project has at least one done Story instance.
   - This requires a work-unit condition operator such as:
     - `work_unit_instance_exists_in_state(workUnitTypeKey = "story", stateKeys = ["done"], minCount = 1)`
   - This is different from checking whether a specific work-unit reference fact is already attached.
1. `retro_working_set_discovery_agent`
   - Determines completed working set / story slice.
2. `retro_story_set_selection_agent`
   - Agent and user select the actual story set to analyze.
   - Writes `source_story_work_units` as a many-cardinality work-unit-reference fact.
3. `retro_story_analysis_agent`
   - Reviews story documents, code filesets, test documents, review findings, deferred work.
4. `retro_previous_action_agent`
   - Checks prior retrospective action items, if any.
5. `retro_discussion_agent`
   - Captures wins, misses, friction, technical debt, process issues.
6. `retro_significant_discovery_agent`
   - Decides whether discoveries require Course Correction.
7. `propagate_retrospective_outputs`
   - Writes `RETROSPECTIVE_REPORT`, lessons, action items, significant discoveries, next recommendations.

### Possible TaskFlow retrospective findings
- `WS-1` validated first-run project/task flow quickly.
- Empty-state language reduced setup uncertainty.
- If workspace/project creation exposed missing auth/org assumptions, recommend Course Correction.
- If no significant planning change exists, recommend next Backlog working-set selection.

## Step 12: Course Correction

### Work unit
- Work unit: `Course Correction`
- Cardinality: `many_per_project`
- Trigger: significant discovery from Retrospective, Story implementation/review, or user request.

### Core decision
- Course Correction does not force affected work units through transitions.
- It determines affected work units/artifacts, produces and approves artifact updates, then relies on Chiron artifact freshness guards to expose affected refinement transitions.

### Artifact freshness model
- Course Correction identifies affected artifacts and work units.
- It writes `SPRINT_CHANGE_PROPOSAL`.
- It creates/commits approved artifact update versions.
- Chiron evaluates artifact dependencies with `is_fresh`.
- If an affected work unit depends on stale artifacts, its refinement/revalidation transition becomes available.

### Example trigger
- During `STORY-1.1`, implementation discovers TaskFlow needs organization membership roles earlier than planned.

### Workflow: `correct_course`
1. `course_correction_initialize_agent`
   - Confirms trigger and source.
   - Reads Backlog, relevant Stories, PRD, UX, Architecture, artifacts.
2. `change_analysis_checklist_agent`
   - Runs BMAD-style impact checklist.
   - Determines affected artifacts:
     - `PRD`
     - `ARCHITECTURE_DOCUMENT`
     - `EPICS_AND_STORIES`
     - maybe Story `STORY_DOCUMENT`
3. `specific_change_proposals_agent`
   - Drafts explicit artifact before/after updates.
4. `sprint_change_proposal_agent`
   - Produces `SPRINT_CHANGE_PROPOSAL`.
5. `artifact_update_commit_agent`
   - Applies/commits approved artifact updates as new artifact versions/references.
   - Records `artifact_update_set`.
6. `route_implementation_agent`
   - Records affected work units and expected stale-artifact refinement routes.
7. `propagate_course_correction_outputs`
   - Persists impact analysis, affected artifacts, update set, proposal, recommendations.

### After Course Correction
- Chiron evaluates freshness:
  - PRD may expose `done_to_done_refine_prd` if its source proposal/artifact dependency is stale.
  - Architecture may expose `done_to_done_refine_architecture`.
  - Backlog may expose `draft_to_draft` / active refinement if `EPICS_AND_STORIES` is stale relative to PRD/Architecture.
  - Backlog then reruns `check_implementation_readiness` after refinement.
  - Affected Story may expose `done_to_done_refine_story` or active-story correction depending on state.

### Key guardrail
- Course Correction produces artifact/version changes and routing evidence.
- Affected work units own their own refinement transitions.
- No transition dynamically changes target state mid-run; `is_fresh` only controls which fixed transitions are available next.
