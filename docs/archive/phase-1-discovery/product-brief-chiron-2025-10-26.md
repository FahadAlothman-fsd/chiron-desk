# Product Brief: chiron

**Date:** 2025-10-26
**Completed:** 2025-11-01
**Author:** fahad
**Status:** Complete - Ready for PRD Phase

---

## Executive Summary

Chiron is a visual orchestration platform that coordinates multiple AI coding agents across structured development workflows, transforming BMAD's proven CLI methodology into a PM-grade multi-agent system.

**The Problem:** Software teams using AI coding agents (Claude Code, Cursor, Copilot) with structured methodologies like BMAD face a critical gap: no orchestration layer exists to coordinate multiple agents in parallel, provide PM-grade visibility into project state, or manage the complexity of multi-workflow projects. Engineers spend 30-40% of their time on tool-switching, manual context management, and status tracking instead of building.

**The Solution:** Chiron builds on BMAD's 4-phase methodology (Analysis → Planning → Solutioning → Implementation) and adds three transformative capabilities:

1. **Multi-Agent Orchestration:** Coordinate agents in parallel with isolated workspaces (DEV on Story 1 while Architect designs Epic 2)
2. **Pattern-Driven Visual UX:** Specialized interfaces for common workflows (Agent Dashboard, Story Kanban, Artifact Workbench) replace context-polluting CLI interactions
3. **Clean Artifact Separation:** Database stores methodology, repository stores only project deliverables (no more bmad/ directory pollution)

**Core Innovation:** While BMAD executes workflows sequentially with manual agent handoffs (*analyst → *pm → *architect), Chiron enables parallel multi-agent execution with automated handoffs and real-time visibility—all while preserving BMAD's "guided not automated" philosophy where human expertise remains at the center of every decision.

**Target Users:** Intermediate/expert software engineers and technical PMs building Level 2-4 complexity projects who value structured methodologies but need visual orchestration and multi-agent coordination.

**MVP Scope:** BMM + CIS modules, 6 core agents (Analyst, PM, Architect, DEV, SM, UX), software projects only (greenfield + brownfield), single-user desktop/web application. Estimated productivity gain: 2x throughput through parallel agent coordination while maintaining quality and control.

**Strategic Value:** Chiron fills the orchestration gap between individual AI coding agents and PM tools—it's the conductor that makes multi-agent AI-driven development practical, visible, and manageable for complex software projects.

---

## Problem Statement

**Current State:**

Software development teams using AI coding agents (Claude Code, Cursor, Copilot, etc.) to build complex projects face a fundamental orchestration gap:

**1. No Multi-Agent Coordination**
- Engineers can't run multiple agents in parallel with isolated workspaces (e.g., Claude Code on Feature A while Cursor refactors Module B)
- No conductor exists to coordinate agent workflows - engineers manually juggle multiple CLI windows/chat interfaces
- Structured methodologies like BMAD (4-phase Analysis→Planning→Solutioning→Implementation) require coordinating dozens of interconnected workflows, but there's no orchestration layer to manage this complexity

**2. Zero Visibility and Control**
- Engineers are blind to what each agent is doing in real-time
- Can't see what context/files agents are using during execution
- No way to monitor progress across multiple concurrent agent tasks
- Context visibility features (like Claude Code's context panel) exist in individual tools but not at the orchestration level
- **Lack of transparency undermines the guided methodology principle**: Engineers can't validate and refine AI outputs when they don't understand the inputs

**3. False Choice Between Automation and Agency**
- Current AI tools force a choice: full automation (AI decides everything) or manual everything (human figures out process alone)
- Over-automated tools remove human expertise from strategic decisions, leading to generic or misaligned outputs
- Under-structured approaches leave engineers to reinvent development processes without guidance
- **Missing middle path**: Structured guidance that amplifies human expertise while AI handles execution

**4. Workflow Metadata Pollution**
- AI methodologies generate extensive configuration files (e.g., BMAD's 100+ workflow files in bmad/ directory)
- Workflow infrastructure clutters project repositories alongside actual code artifacts
- No separation between "how we work" (methodology files) and "what we produce" (code, docs, designs)
- Version control tracks workflow templates that provide zero value in repo history

**5. Manual Context and State Management**
- Engineers manually feed context to each agent instead of centralized context management
- Project state (phases, epics, stories, artifacts) lives in external PM tools (Jira, Linear) disconnected from agent execution
- No unified view of "what's in progress, what's blocked, what's complete" across all agent workflows
- Constant tool-switching between PM tools, agent CLIs, and editors

**Impact:**

- **Cognitive overload**: Managing 3-5 agents across complex projects becomes mentally exhausting without orchestration
- **Underutilization**: Teams use agents for simple tasks only because multi-workflow complexity is unmanageable
- **Methodology abandonment**: Structured approaches like BMAD remain CLI-only, limiting adoption for teams that need visual orchestration
- **Loss of expertise value**: Over-automation removes human judgment from decisions; under-structure wastes expertise on reinventing process
- **Lost productivity**: Estimated 30-40% of time spent on tool-switching, manual context management, and tracking agent progress

**Why Existing Solutions Fail:**

- **AI coding agents** (Claude Code, Cursor, Copilot): Powerful individual agents but no cross-agent orchestration, no PM-grade state management, no guided methodology
- **Traditional PM tools** (Jira, Linear): Track human work, can't execute AI workflows or coordinate coding agents
- **Workflow engines** (n8n, Temporal): Backend automation focused on removing humans from the loop, not amplifying human expertise
- **Chat interfaces** (ChatGPT, BMAD CLI): Single-threaded conversations, no multi-agent coordination or visual project state

**The Gap:** No orchestration platform exists that coordinates multiple AI coding agents across structured workflows (like BMAD's methodology) while providing PM-grade visibility, context transparency, clean artifact separation, **and preserving human expertise and decision-making at the center of the process**.

---

## Proposed Solution

**Chiron is an orchestration platform that coordinates multiple AI coding agents across structured workflows while preserving human expertise at the center of decision-making.**

### Core Concept

Chiron transforms BMAD's proven methodology from CLI-based execution into a PM-grade visual orchestration platform. Think **conductor for AI coding agents** - like conductor.build but specifically designed for software development workflows.

### How It Works

**1. BMAD-Powered Workflow Engine**
- Leverages BMAD's workflow execution core (workflow.xml) for proven methodology execution
- Executes structured 4-phase methodology: Analysis → Planning → Solutioning → Implementation
- Default modules: BMM (software development lifecycle) + CIS (150+ creative/innovation techniques)
- **Architecture approach:** Ingest workflows from YAML/MD files into database, enabling dynamic updates as BMAD v6 evolves from alpha to stable
- **Extensibility:** Users can extend elicitation methods, techniques, and patterns (stored in DB alongside BMAD defaults)

**2. Multi-Agent Orchestration** (Chiron's Core Innovation)
- **The Gap:** BMAD supports 14+ specialized agents (Analyst, PM, Architect, DEV, SM, TEA, UX, Game roles, CIS coaches) but executes them sequentially with manual handoffs (*analyst → *pm → *architect)
- **Chiron's Solution:** Build orchestration layer enabling parallel agent execution with isolated contexts
- **Key Capabilities:**
  - Coordinate multiple agents simultaneously (DEV on Story 1 while Architect designs Epic 2)
  - Isolated workspaces prevent context pollution between concurrent agent tasks
  - Automated handoffs (Analyst completes product-brief → triggers PM with context)
  - Visual multi-agent dashboard shows active/queued/idle agents in real-time
- **Result:** Transform BMAD's single-agent CLI into multi-agent visual orchestration platform

**3. Pattern-Driven Visual UX**
- **Design philosophy:** Specialized interfaces for common workflow behaviors, not generic form builders
- **Pattern examples:**
  - **Structured Exploration Lists:** Visual selection of techniques/methods (replaces context-polluting CLI Q&A)
  - **Artifact Refinement Workbench:** Side-by-side editing with version tracking for complex documents
  - **Story State Kanban:** Drag-and-drop story management (BACKLOG → TODO → IN PROGRESS → DONE)
  - **Embedded Agent Panels:** In-app agent conversations with real-time context visibility
- **Dynamic content + opinionated presentation:** Workflow data is flexible; UX patterns are purposefully designed

**4. Clean Artifact Separation**
- **Database storage:** BMAD workflows, agents, state machines, project state, execution history, user customizations
- **Repository storage:** ONLY project artifacts (PRDs, architecture docs, tech specs, story files) as markdown with YAML frontmatter
- **Result:** Clean repos without methodology infrastructure pollution (no more `bmad/` directories in user projects)

**5. Guided Not Automated**
- Human makes strategic decisions at every workflow step
- Workflows provide structure and proven processes
- AI agents execute tasks but humans validate and refine outputs
- Context visibility enables informed judgment, not blind acceptance

### Key Differentiators

**vs. AI Coding Agents (Claude Code, Cursor):**
- Chiron doesn't replace them - it orchestrates them
- Adds cross-agent coordination, PM-grade state management, structured methodology

**vs. Traditional PM Tools (Jira, Linear):**
- Not just tracking human work - executing AI workflows
- Agents are first-class entities in the system
- Workflow engine generates the work (stories, docs), not just tracks it

**vs. Workflow Engines (n8n, Temporal):**
- Not removing humans from the loop - amplifying human expertise
- PM UX designed for software engineering, not generic automation
- Built-in context transparency and validation at every step

### Why This Will Succeed

**The Transformation:**

Current: Engineer managing 5 stories across 2 epics via BMAD CLI
- 30+ command invocations
- Manual context management for each story
- Serial execution only
- Constant status checking
- **Time: 4-5 days**

With Chiron:
- Visual dashboard shows all work at a glance
- Launch 2 agents in parallel (Dev on Epic 7, Architect on Epic 8)
- Drag stories through kanban as they complete
- Context auto-managed by SM agent
- Real-time progress monitoring
- **Time: 2-3 days**

**The Magic Moment:**
Engineer realizes they just coordinated 2 AI agents across 5 stories without typing a single command or switching windows. Everything happened in one visual interface while they maintained full control and visibility.

### Ideal User Experience

**Morning:** Engineer opens Chiron dashboard, sees exactly what needs doing today
**Action:** Clicks "Start" on story-8-1 → SM agent auto-generates context → Dev agent launches with full context loaded
**Monitoring:** Engineer watches agent progress in real-time, sees what files it's modifying
**Validation:** Agent completes, engineer reviews output with full context visibility
**Completion:** One click marks story done, next story automatically queued
**Parallel Work:** While Dev implements story 8-1, Architect designs tech spec for epic 9
**End of Day:** Dashboard shows clear progress, tomorrow's work is ready

**The Experience:** Structured guidance + human expertise + AI execution power + visual orchestration = 2x productivity with maintained quality and control.

---

## Target Users

### Primary User Segment

**Software Development Teams Using AI Coding Agents with Structured Methodologies**

**Profile:**
- **Role:** Software engineers, technical leads, and architects building complex systems (web, mobile, embedded applications)
- **Experience Level:** Intermediate to advanced developers comfortable with CLI tools, Node.js environments, and AI coding assistants
- **Current Tools:** Already using AI coding agents (Claude Code, Cursor, Copilot) for day-to-day development
- **Methodology Adoption:** Teams using or interested in structured development processes (BMAD, SDLC frameworks, Agile methodologies)
- **Project Scale:** Building Level 2-4 complexity projects requiring multi-phase planning, architecture design, and coordinated implementation

**Pain Points:**
- Managing multiple AI agents across concurrent tasks feels chaotic and mentally exhausting
- CLI-based workflow orchestration lacks visibility into agent progress and context usage
- Manual status tracking and context management across 3-5 agents wastes 30-40% of productivity
- Need visual coordination layer without losing the structured guidance BMAD provides
- Want multi-agent parallelization but current tools force serial, single-threaded execution

**Goals:**
- Maintain human agency and decision-making at the center of development
- Coordinate multiple AI agents visually without constant CLI context-switching
- Get PM-grade visibility into project state (phases, epics, stories) alongside agent execution
- Preserve BMAD's guided methodology while gaining orchestration superpowers
- 2x productivity through parallel agent coordination without sacrificing quality or control

**Why Chiron?**
- **Amplifies existing expertise:** These users already value BMAD's structured approach—Chiron makes it visual and multi-agent
- **Solves orchestration gap:** They have the methodology and agents, but no conductor
- **Preserves philosophy:** "Guided not automated" remains—Chiron adds visibility and coordination, not automation
- **Natural evolution:** From CLI workflows to visual orchestration without losing what works

---

### Secondary User Segment

**Product Managers and Analysts Coordinating AI-Driven Development**

**Profile:**
- **Role:** Product managers, business analysts, and technical project managers overseeing AI-assisted development teams
- **Experience Level:** Strong product/project management skills, may not be deeply technical but understand development workflows
- **Current Challenge:** Teams use BMAD CLI or similar methodologies, but PM has no visibility into agent execution or progress
- **Project Focus:** Managing complex software projects requiring structured planning (PRDs, architecture, epic/story management)

**Pain Points:**
- No visual dashboard to track what agents are doing or project progress across phases
- Constantly asking engineers "what's the status?" because BMAD state lives in terminal output
- Can't see workflow paths, phase completion, or epic/story queues without reading CLI logs or markdown files
- PM tools (Jira, Linear) track human work but don't integrate with AI agent execution
- Need to understand BMAD's 4-phase methodology but CLI interface creates friction

**Goals:**
- Visual project dashboard showing phase progress, current workflows, and next actions
- See agent activity and outputs without needing CLI access
- Drag-and-drop story management (Kanban-style) integrated with agent execution
- Maintain oversight and control while empowering engineering team with AI agents
- Bridge the gap between PM tools and AI-driven development workflows

**Why Chiron?**
- **PM-grade UX:** Designed for visual project management, not just CLI power users
- **Methodology visibility:** BMAD's structured approach becomes transparent and manageable
- **Agent coordination oversight:** See what each agent is doing, their progress, and context usage
- **Story management:** Kanban board integrated with workflow execution (not separate PM tool)
- **Facilitates collaboration:** PMs and engineers share the same project state view

---

## Goals and Success Metrics

### Business Objectives

**Primary Objective: Successful Master's Thesis Completion**
- Deliver working MVP demonstrating novel multi-agent orchestration architecture within 4-month timeline
- Validate hypothesis: Pattern-driven visual UX + structured workflows + parallel agents = 2x productivity gains
- Produce thesis-quality research outcomes (architecture patterns, DSPy/ax integration, multi-agent coordination strategies)
- Graduate with strong academic contribution to AI-assisted software development field

**Secondary Objective: Open Source Foundation**
- Build production-ready open source tool that solves real problem (not just academic prototype)
- Establish sustainable architecture for post-thesis community development
- Create foundation for future contributions (post-graduation, community-driven)

**Success Criteria:**
- ✅ MVP functional and demonstrable by Month 4 (thesis defense ready)
- ✅ At least 5 beta testers complete real projects using Chiron (validates practical utility beyond thesis)
- ✅ Architecture documented sufficiently for open source release post-graduation
- ✅ Thesis defense demonstrates both technical innovation (multi-agent orchestration) and practical value (productivity gains)

### User Success Metrics

**Productivity Gains:**
- **Time to complete 5-story project:** Reduce from 4-5 days (CLI) to 2-3 days (Chiron) - **40% faster**
- **Context switching:** Eliminate 30-40% of time spent on tool-switching and manual status management
- **Parallel execution:** 2+ agents working simultaneously vs serial execution
- **Agent setup time:** Reduce from 5-10 minutes per agent (manual context loading) to <1 minute (auto-context from previous workflow)

**Quality and Control:**
- **Approval satisfaction:** 90%+ of generated artifacts approved on first review (measured via Continue [c] vs Edit [e] ratio)
- **Context accuracy:** 95%+ of agent executions use correct context (no outdated files, no missing dependencies)
- **Workflow completion:** 100% of workflows reach completion without manual intervention or debugging

**User Experience:**
- **Dashboard clarity:** User understands project status in <10 seconds (phases, active workflows, next actions)
- **Agent visibility:** User can answer "what is this agent doing right now?" in <5 seconds
- **Onboarding:** New user completes first workflow (product-brief) in <30 minutes without documentation

**Adoption Indicators:**
- **Return usage:** 80%+ of users complete second project within 2 weeks of first
- **Feature utilization:** 70%+ of users leverage parallel agent execution by Week 2
- **Custom extensions:** 40%+ of users add custom elicitation methods by Month 1

### Key Performance Indicators (KPIs)

**Core Metrics (MVP Validation):**
1. **Agent Coordination Success Rate:** % of parallel agent executions completed without context pollution or conflicts
   - Target: 95%+ success rate by MVP launch

2. **Workflow Execution Time:** Average time to complete standard workflows
   - product-brief: <45 minutes (vs 90+ minutes CLI)
   - PRD generation (3 epics, 12 stories): <2 hours (vs 4+ hours CLI)
   - Story implementation (DEV agent): <30 minutes per story (vs 60+ minutes manual)

3. **Context Switching Reduction:** Number of window/tool switches during 5-story project
   - Current (CLI): 50-75 switches (terminals, editors, PM tools, browsers)
   - Target (Chiron): <10 switches (stay in Chiron 90%+ of time)

4. **Artifact Quality:** % of generated artifacts requiring human edits
   - Target: <15% requiring substantial edits (>20% content changes)
   - Measured via artifact version history in DB

5. **Multi-Agent Utilization:** % of projects using 2+ agents in parallel
   - Month 1: 30%+
   - Month 3: 60%+
   - Month 6: 80%+

**Engagement Metrics:**
6. **Weekly Active Users (WAU):** Users completing at least 1 workflow per week
   - Month 1: Baseline (# of beta testers)
   - Month 3: 2x baseline
   - Month 6: 5x baseline

7. **Project Completion Rate:** % of started projects that reach Phase 4 (Implementation)
   - Target: 70%+ (indicates workflows provide real value, not abandoned)

8. **Average Session Duration:** Time spent in Chiron per session
   - Target: 60-90 minutes (indicates sustained productivity, not quick checks)

**Technical Health:**
9. **BMAD Sync Success:** % of BMAD updates that sync without breaking user customizations
   - Target: 100% (critical for long-term viability)

10. **System Reliability:** Workflow execution success rate
    - Target: 99%+ (no crashes, hangs, or data loss during workflows)

---

## Strategic Alignment and Financial Impact

### Financial Impact

**Thesis-Focused (Non-Commercial MVP):**
Given Chiron is a self-funded master's thesis project with 4-month timeline, financial impact is measured in **productivity gains and research value** rather than revenue/ROI.

**Quantified Productivity Gains (Research Hypothesis):**
- **40% faster project completion:** 5-story project in 2-3 days vs 4-5 days (CLI baseline)
- **30-40% reduction in non-productive time:** Eliminate tool-switching, manual context management, status tracking overhead
- **2x throughput via parallelization:** 2 agents working simultaneously vs serial execution

**Research Value (Academic Contribution):**
- Novel architecture for multi-agent orchestration with structured workflows
- DSPy/ax integration patterns for reliable LLM-based workflow decisions
- Pattern-driven UX framework for AI-assisted development tools
- Validation of "guided not automated" philosophy in AI tooling

**Post-Thesis Open Source Value:**
- Foundation for community-driven development (no commercial pressure during thesis)
- Potential future monetization paths (managed service, enterprise features) after graduation
- Portfolio piece demonstrating full-stack architecture, AI integration, UX design

**Cost Structure (Self-Funded Constraints):**
- Zero external dependencies requiring payment (all open source stack)
- No cloud hosting costs (local-first Tauri app)
- No API costs (user provides their own AI provider keys)
- Total investment: Time (4 months solo development) + minimal compute (local machine)

### Company Objectives Alignment

**Academic Institution Alignment:**
- **Thesis Requirements:** Demonstrates original research contribution (multi-agent orchestration architecture)
- **Technical Depth:** Full-stack implementation showcasing advanced concepts (DSPy/ax, state machines, workflow engines)
- **Practical Application:** Solves real problem, not theoretical exercise
- **Reproducibility:** Open source release enables peer validation and future research

**Personal Career Objectives:**
- **Demonstrate expertise:** Full ownership of complex system (architecture, frontend, backend, AI integration)
- **Build portfolio:** Production-ready tool (not throwaway thesis prototype)
- **Establish credibility:** Open source contribution post-graduation
- **Solve personal pain point:** Creator is target user (BMAD + AI coding agents)

**Open Source Community Alignment:**
- **Addresses gap:** No existing solution for multi-agent AI orchestration with PM-grade UX
- **Sustainable architecture:** Designed for community contributions post-thesis
- **Documentation-first:** Thesis documentation serves as project docs
- **No vendor lock-in:** Open source, local-first, user-controlled

### Strategic Initiatives

**Month 1-2: Foundation (Analysis + Planning Phases)**
- Complete product-brief (current workflow)
- Generate comprehensive PRD with epic breakdown
- Design full architecture (database schema, API contracts, component structure)
- Validate technical feasibility (DSPy/ax integration, BMAD workflow ingestion, Tauri setup)
- **Milestone:** Architecture approved, ready for implementation

**Month 2-3: Core Implementation (MVP Solutioning + Development)**
- Build workflow engine (YAML ingestion, DSPy-based execution, state management)
- Implement database layer (PostgreSQL schema, migrations, queries)
- Build pattern-driven UX components (Agent Dashboard, Story Kanban, Artifact Workbench)
- Integrate OpenCode for DEV agent execution
- **Milestone:** Single-agent workflows functional end-to-end

**Month 3-4: Multi-Agent Orchestration + Polish**
- Implement parallel agent coordination with isolated contexts
- Build multi-agent dashboard with real-time status
- Add context-aware MCP injection per agent role
- Beta testing with 5 real projects
- **Milestone:** MVP complete, thesis-ready

**Month 4: Thesis Finalization**
- Document architecture decisions, research findings
- Capture productivity metrics from beta testing
- Prepare thesis defense (demo + research validation)
- Open source release preparation (README, contribution guide, license)
- **Deliverable:** Defended thesis + production-ready OSS tool

**Post-Graduation: Community Handoff**
- Public launch on GitHub with documentation
- Community engagement (Reddit, HackerNews, dev.to)
- Accept contributions, maintain roadmap
- Potential: Monetization exploration (managed service, consulting)

---

## MVP Scope

### Core Features (Must Have)

**1. BMAD Module Support**
- **BMM (Business Methodology Module):** Full 4-phase software development lifecycle support
  - Phase 1: Analysis (product-brief, research workflows)
  - Phase 2: Planning (prd, tech-spec workflows)
  - Phase 3: Solutioning (architecture, gate-check workflows)
  - Phase 4: Implementation (sprint-planning, story workflows)
- **CIS (Creative Intelligence System):** 150+ creative techniques across brainstorming, design thinking, problem-solving workflows
- **Workflow ingestion:** Read BMAD YAML/MD files → parse → store in database for dynamic execution

**2. Project Type & Level Support**
- **Project types:** Software projects only (greenfield + brownfield)
- **Complexity levels:** 0-4 (atomic change → enterprise scale)
- **Adaptive UI:** Dashboard hides/shows phases based on level (Level 0-1 skip Solutioning phase)
- **Smart initialization:** Keyword-based level detection with manual override

**3. Multi-Agent Orchestration**
- **Core agents (priority for MVP):** Analyst, PM, Architect, DEV, SM, UX Designer (6 essential roles)
- **AI Coding Agent Integration:** OpenCode integration for implementation workflows (DEV agent execution)
- **Context-aware MCP injection:** Role-specific MCP servers per agent to prevent context pollution
  - DEV agent: Codebase analysis MCPs (React DeepGraph, memory)
  - Analyst agent: Research MCPs (web search, Context7 for library docs)
  - Dynamic loading based on workflow context
- **Parallel execution:** Coordinate 2+ agents simultaneously with isolated workspaces
- **Automated handoffs:** Workflow completion triggers next agent with context
- **Agent dashboard:** Visual status of active/queued/idle agents

**4. Pattern-Driven UX**
- **Multi-Agent Dashboard:** Active agents panel with real-time progress
- **Artifact Refinement Workbench:** Side-by-side editing with version history for PRDs, architecture docs
- **Structured Exploration Lists:** Visual technique selection for brainstorming/elicitation methods
- **Story State Kanban:** Drag-and-drop story management with enforced state machine
  - Epic states: Backlog → Contexted
  - Story states: Backlog → Drafted → Ready for Dev → In Progress → Review → Done
  - No status downgrades (prevents accidental regression)
- **Phase Navigation:** Visual 4-phase progression with completion tracking and gate checks

**5. Clean Artifact Separation**
- **Database storage:** BMAD workflows, agents, project state, execution history
- **Repository storage:** Project artifacts only (markdown with YAML frontmatter)
- **No methodology pollution:** Clean repos without bmad/ directories

**6. User Extensibility**
- **Custom elicitation methods:** Users extend brainstorming techniques, problem-solving frameworks (stored in DB with is_custom flag)
- **BMAD update compatibility:** User customizations preserved when BMAD v6 syncs

### Out of Scope for MVP

**Excluded BMAD Modules:**
- ❌ **BMB (BMAD Method Builder):** Custom workflow creation, agent building - meta-module not needed for end users
- ❌ **Game workflows:** game-brief, GDD, game-design paths - focus on software development only

**Excluded Agent Roles:**
- ❌ **Game-specific agents:** Game Designer, Game Architect, Game Dev
- ❌ **TEA (Test Architect):** Comprehensive testing workflows deferred to Phase 2
- **MVP includes:** Analyst, PM, Architect, DEV, SM, UX Designer (core 6 roles)

**Excluded Project Features:**
- ❌ **Multi-user collaboration:** Single-user projects only for MVP
- ❌ **PM tool integrations:** No Jira/Linear/ClickUp sync (Chiron is the PM tool)
- ❌ **Additional AI coding agents:** OpenCode only for MVP (Claude Code, Cursor support in Phase 2)
- ❌ **Mobile applications:** Desktop/web only
- ❌ **Real-time co-editing:** One user per project

**Excluded Workflow Complexity:**
- ❌ **Custom workflow builder:** No UI for creating new workflows (uses BMAD defaults only)
- ❌ **Workflow branching logic:** Advanced conditionals, complex loops
- ❌ **Cross-project orchestration:** One project at a time

### MVP Success Criteria

**Technical Success:**
- ✅ Execute complete Level 2 greenfield project (Analysis → Planning → Implementation)
- ✅ Parallel agent execution: DEV on Story 1 while Architect works on Epic 2
- ✅ Generate artifacts: product-brief.md, PRD.md, epics.md, story files
- ✅ BMAD workflow updates sync without breaking user customizations

**User Success:**
- ✅ Engineer completes 5-story project in 2-3 days (vs 4-5 days CLI)
- ✅ Zero manual status checking (dashboard always shows current state)
- ✅ Zero context switching (all agent work visible in one interface)
- ✅ Clean repository (no bmad/ directory, only project artifacts)

**Validation Milestones:**
- ✅ User completes product-brief using Analyst agent + Exploration Lists
- ✅ User generates PRD with 3 epics, 12 stories via PM agent
- ✅ User runs 2 agents in parallel without context pollution
- ✅ User extends brainstorming techniques (adds custom method to DB)

---

## Post-MVP Vision

### Phase 2 Features

**Multi-Agent Expansion:**
- Additional AI coding agent support: Claude Code, Cursor integration (beyond OpenCode)
- TEA (Test Architect) agent for comprehensive testing workflows
- Game-specific agents: Game Designer, Game Architect, Game Dev

**Workflow Safety & Tracking:**
- Git commit hash tracking in project state (detect external repo changes)
- Sync-repo-state workflow (reconcile Chiron state with actual repo)
- Artifact generation tracking (which commit each artifact was generated from)
- Conflict detection (warn if repo changed during workflow execution)

**Enhanced Collaboration:**
- Multi-user projects (real-time co-editing, role-based permissions)
- Team dashboards (see who's working on what across projects)
- Shared elicitation method libraries (team-wide custom techniques)

**PM Tool Integrations:**
- Jira/Linear/ClickUp sync (two-way story synchronization)
- Import existing backlogs into Chiron
- Export Chiron stories to external PM tools

**Advanced UX Features:**
- Idea Capture System (parking lot for tangential ideas during workflows)
  - Lightweight capture during any workflow without breaking flow
  - Review captured ideas at phase transitions
  - Link ideas to artifacts and track resolution
- Workflow branching logic (advanced conditionals, complex loops)
- Custom workflow builder UI (extend BMAD with team-specific processes)

**Platform Expansion:**
- Mobile companion app (view dashboards, approve artifacts on mobile)
- VS Code extension (embedded Chiron panel in editor)
- CLI mode (for power users who prefer terminal)

### Long-term Vision

**Year 1: Establish Chiron as the Multi-Agent Orchestrator**
- Become the default platform for teams using BMAD + AI coding agents
- 1,000+ active projects coordinating 5,000+ agent executions per month
- Proven 2x productivity gains with maintained quality and control
- Strong community contributing custom elicitation methods and patterns

**Year 2: Expand Beyond BMAD**
- Support for additional methodologies (Agile, Scrum, Kanban, Shape Up)
- Methodology marketplace (teams share and monetize custom workflows)
- Enterprise features (SSO, audit logs, compliance tracking)
- Integration ecosystem (GitHub Actions, CI/CD pipelines, deployment platforms)

**Year 3: AI-Native Development Platform**
- Chiron becomes the interface layer between human expertise and AI execution
- Predictive orchestration (AI suggests optimal agent coordination patterns)
- Learning system (Chiron learns team preferences, optimizes workflows automatically)
- Cross-project intelligence (insights from similar projects guide recommendations)

**Ultimate Vision:**
Chiron transforms how software is built—from isolated human developers using AI tools occasionally, to **human-AI collaborative teams** where orchestrated agents handle execution while humans focus on strategic decisions, validation, and expertise application. The platform makes structured, methodology-driven development accessible and visual for teams of all sizes, turning complex multi-agent coordination into a seamless, productive experience.

### Expansion Opportunities

**Vertical Expansion (Domain-Specific):**
- **Game Development:** Full game workflows (GDD, level design, asset pipelines) with game-specific agents
- **Embedded Systems:** Hardware/firmware workflows with specialized agents (board design, RTOS development)
- **Data Science:** ML pipeline workflows (experimentation, model training, deployment orchestration)
- **DevOps:** Infrastructure-as-code workflows (Terraform, Kubernetes, CI/CD orchestration)

**Horizontal Expansion (Methodology Agnostic):**
- **Open Methodology SDK:** Teams build custom workflows without forking Chiron
- **Workflow Marketplace:** Community-contributed methodologies (revenue sharing model)
- **Consultant/Agency Mode:** Multi-client project management with isolated workspaces

**Platform Play:**
- **AI Agent Registry:** Chiron as the hub for discovering and coordinating specialized agents
- **Context Management Service:** Centralized context layer for all agent interactions (not just coding)
- **Orchestration API:** Third-party tools integrate Chiron's orchestration capabilities

**Enterprise:**
- **Team Edition:** Advanced collaboration, role-based access, admin controls
- **Enterprise Edition:** SSO, audit logs, compliance (SOC 2, GDPR), on-premise deployment
- **Managed Service:** Hosted Chiron with SLAs, support, training

**Ecosystem Partnerships:**
- **AI Coding Agent Vendors:** Official partnerships with Anthropic (Claude Code), Cursor, Copilot
- **PM Tool Vendors:** Deep integrations with Jira, Linear, ClickUp (two-way sync, embedded views)
- **Cloud Providers:** Optimized deployments on AWS, GCP, Azure with marketplace listings

---

## Technical Considerations

### Platform Requirements

**Development Environment:**
- **OS:** Cross-platform (macOS, Linux, Windows) via Tauri
- **Node.js:** v20+ (for TypeScript compilation, build tools)
- **Database:** PostgreSQL 15+ (local instance for development)
- **Package Manager:** pnpm (monorepo management)

**Runtime Requirements (User Machine):**
- **Tauri Desktop App:** No browser required, native application
- **PostgreSQL:** Local database instance (or remote connection)
- **AI Provider API Keys:** User-provided (Anthropic Claude, OpenAI, etc.)
- **Git:** For repository integration and artifact generation
- **Disk Space:** ~500MB for application + variable (project databases)
- **Memory:** 4GB+ recommended (AI agent orchestration + database)

**Development Stack Constraints:**
- **Language:** TypeScript only (frontend + backend for consistency)
- **No Rust:** Despite Tauri using Rust, keep application logic in TypeScript
- **Local-First:** All data stored locally, no cloud dependencies (self-funded constraint)

### Technology Preferences

**Frontend Stack:**
- **Framework:** React 18+ with TypeScript
- **UI Library:** TBD (shadcn/ui, Mantine, or custom components)
- **State Management:** Zustand (UI state) + TanStack Query (server state)
- **Routing:** TanStack Router (file-based routing for Tauri)
- **Styling:** Tailwind CSS (rapid prototyping, Tauri-friendly)
- **Desktop Wrapper:** Tauri 2.0 (Rust-based, smaller bundle than Electron)

**Backend Stack:**
- **Runtime:** Node.js with TypeScript
- **Web Framework:** Hono (lightweight, edge-compatible)
- **Database ORM:** Drizzle ORM (TypeScript-first, type-safe queries)
- **Database:** PostgreSQL 15+ (robust, supports JSONB for flexible schemas)
- **Migration Tool:** Drizzle Kit (schema migrations)

**AI Integration:**
- **LLM Orchestration:** DSPy TypeScript port (`ax`) for structured outputs
- **AI Providers:** Multi-provider support (Anthropic Claude, OpenAI) via unified interface
- **MCP Integration:** Model Context Protocol for agent context injection
- **Coding Agent:** OpenCode integration for DEV agent execution

**Development Tooling:**
- **Monorepo:** pnpm workspaces (apps/web, apps/server, packages/shared)
- **Type Safety:** Strict TypeScript config, no `any` types
- **Linting:** Biome (fast Rust-based linter/formatter)
- **Testing:** Vitest (unit), Playwright (E2E)
- **CI/CD:** GitHub Actions (for post-thesis OSS)

**Architectural Patterns:**
- **Effect Consideration:** Effect-TS (https://effect.website/) is ideal for this project's needs (workflow orchestration, error handling, dependency injection), but represents significant learning curve
  - **Decision:** Defer Effect to post-MVP unless critical need emerges (4-month timeline constraint)
  - **Alternative:** Traditional TypeScript patterns with strong typing + Result types for error handling
  - **Revisit:** Post-thesis refactor if community adoption warrants paradigm shift

**Data Flow:**
- **Frontend → Backend:** Tauri IPC commands (type-safe RPCs)
- **Backend → Database:** Drizzle ORM queries
- **Workflow Engine:** DSPy/ax for LLM decisions → validated execution → database state updates
- **File System:** Tauri filesystem API for artifact generation (write to user's repo)

**Key Technical Decisions:**
- ✅ **Full TypeScript:** Consistency, type safety, single language for frontend + backend
- ✅ **Local-first:** Tauri + local PostgreSQL (no cloud costs, user owns data)
- ✅ **PostgreSQL over SQLite:** Better support for JSONB (flexible workflow metadata), concurrent access
- ✅ **Drizzle over Prisma:** TypeScript-first ORM, better Tauri compatibility
- ✅ **Hono over Express:** Modern, lightweight, TypeScript-native
- ✅ **DSPy/ax for structured outputs:** Guaranteed schema validation, future optimization (GEPA/ACE)
- ⚠️ **Effect deferred:** Too high learning curve for 4-month solo project (revisit post-MVP)

### Architecture Considerations

**Foundational Decisions (recorded for PRD/Architecture phase):**

1. **Data Storage Strategy**
   - **Database:** BMAD metadata (workflows, agents, state machines), project state, execution history, user customizations
   - **Repository:** Project artifacts only (markdown with YAML frontmatter)
   - **Rationale:** Clean separation enables version control of deliverables without methodology pollution

2. **Module Architecture**
   - **Default modules:** BMM (Business Methodology Module) + CIS (Creative Intelligence System)
   - **Ingestion approach:** Workflows read from YAML/MD → parsed → stored in DB
   - **Extensibility:** Users extend elicitation methods, stored in DB with `is_custom` flag
   - **MVP scope:** BMB (BMAD Method Builder) out of scope - no custom workflow creation in MVP

3. **UX Philosophy**
   - **Pattern-driven interfaces** for common behaviors (Exploration Lists, Artifact Workbench, Story Kanban)
   - **NOT generic workflow renderers** - opinionated UX for proven workflows
   - **Dynamic content:** Workflow data adapts as BMAD evolves (alpha → stable)

4. **Workflow Execution**
   - Leverage BMAD's core workflow.xml engine
   - Support reserved tags (`<step>`, `<action>`, etc.) stored in DB
   - Enable BMAD updates to sync without breaking user customizations

_Full architecture design deferred to PRD/Architecture phase_

---

## Constraints and Assumptions

### Constraints

**Timeline Constraints:**
- **4-month MVP deadline:** Thesis defense scheduled, non-negotiable
- **Solo development:** No team to distribute work across
- **Parallel thesis writing:** Documentation must happen concurrently with implementation

**Technical Constraints:**
- **Local-first architecture:** No cloud infrastructure (self-funded, no ongoing costs)
- **TypeScript only:** No time to learn Rust deeply despite Tauri backend
- **Open source stack:** All dependencies must be free and OSS-licensed
- **User-provided AI keys:** Cannot bundle or subsidize AI provider costs

**Scope Constraints:**
- **Software projects only:** No game workflows in MVP (reduces complexity)
- **Single-user:** No multi-user collaboration (avoids distributed systems complexity)
- **6 core agents:** Analyst, PM, Architect, DEV, SM, UX (defers TEA, game agents to Phase 2)
- **OpenCode only:** No multi-agent integration complexity in MVP

**Resource Constraints:**
- **Zero budget:** Self-funded thesis project
- **Solo expertise:** Limited to creator's existing knowledge (TypeScript, React, databases)
- **Beta testing pool:** Limited to personal network (~5-10 users max)
- **No paid tools:** Cannot use commercial services (Vercel, AWS, monitoring tools)

**Academic Constraints:**
- **Thesis requirements:** Must demonstrate original research contribution
- **Reproducibility:** Architecture must be documented for academic review
- **Ethical approval:** User data handling must align with research ethics (local-only helps)

### Key Assumptions

**User Assumptions:**
- **Target users already use BMAD CLI:** Chiron is evolution, not introduction
- **Intermediate/expert developers:** Comfortable with CLI, Node.js, git, AI coding agents
- **Self-hosted database:** Users can run local PostgreSQL instance
- **AI API access:** Users have their own Anthropic/OpenAI keys

**Technical Assumptions:**
- **BMAD v6 reaches stable:** Alpha → stable within 6 months (Chiron can adapt if delayed)
- **DSPy TypeScript port (`ax`) is production-ready:** Structured outputs work reliably
- **Tauri 2.0 stability:** Desktop framework is mature enough for complex app
- **PostgreSQL performance:** Local database handles workflow execution without lag
- **LLM reliability:** Claude/GPT-4 provide consistent outputs for workflow decisions

**Workflow Assumptions:**
- **BMAD methodology remains compatible:** Core workflow.xml engine doesn't drastically change
- **Parallel agents don't require complex locking:** Isolated contexts sufficient for MVP
- **Artifact dependency chain is static:** PRD always requires product-brief, architecture requires PRD (no dynamic dependencies)

**Adoption Assumptions:**
- **5 beta testers available:** Personal network provides real-world validation
- **Post-thesis maintenance feasible:** Community contributions or minimal solo upkeep
- **Open source model viable:** No commercial pressure to monetize immediately

**Research Assumptions:**
- **2x productivity gains measurable:** Beta testing provides statistically significant data
- **Multi-agent orchestration is novel contribution:** Academia values this research direction
- **Pattern-driven UX is demonstrable:** Thesis defense can show tangible UX improvements over CLI

---

## Risks and Open Questions

### Key Risks

**Timeline Risks (HIGH):**
- **Risk:** 4-month solo development timeline too aggressive for full MVP
- **Impact:** Incomplete MVP for thesis defense, delayed graduation
- **Mitigation:** Ruthless scope management, defer non-critical features to Phase 2, focus on core thesis contribution (multi-agent orchestration)
- **Contingency:** Define minimum viable thesis (single-agent workflows + architecture design) as fallback

**Technical Complexity Risks (MEDIUM-HIGH):**
- **Risk:** DSPy/ax TypeScript port not mature enough for production use
- **Impact:** Unreliable workflow execution, frequent errors, poor user experience
- **Mitigation:** Early validation in Month 1, fallback to traditional LLM prompting with manual parsing if needed
- **Contingency:** Defer DSPy to post-MVP, use structured prompts + Zod validation instead

- **Risk:** Multi-agent context isolation harder than expected (race conditions, state conflicts)
- **Impact:** Context pollution between agents, unpredictable behavior, degraded productivity
- **Mitigation:** Start with single-agent implementation, add parallelization incrementally with extensive testing
- **Contingency:** MVP supports sequential execution only, parallel agents deferred to Phase 2

- **Risk:** BMAD workflow ingestion more complex than anticipated (edge cases, parsing errors)
- **Impact:** Incomplete workflow support, manual workarounds required
- **Mitigation:** Focus on core workflows first (product-brief, prd, architecture, dev-story), defer edge cases
- **Contingency:** Hardcode critical workflows instead of dynamic ingestion

**Dependency Risks (MEDIUM):**
- **Risk:** BMAD v6 alpha breaks frequently, API changes disrupt Chiron
- **Impact:** Constant rework, wasted time adapting to BMAD changes
- **Mitigation:** Lock to specific BMAD commit/tag, document version compatibility
- **Contingency:** Fork BMAD workflows if needed, maintain stable snapshot

- **Risk:** Tauri 2.0 stability issues (bugs, platform-specific problems)
- **Impact:** Development slowdowns, user-facing crashes
- **Mitigation:** Early prototyping in Month 1, fallback to web app (Vite + local server) if Tauri unreliable
- **Contingency:** Ship as local web app instead of desktop (same functionality, different wrapper)

**Adoption Risks (LOW-MEDIUM):**
- **Risk:** Beta testers don't have time or interest to validate Chiron
- **Impact:** No real-world validation data for thesis
- **Mitigation:** Dogfood Chiron for own projects, synthetic validation if needed
- **Contingency:** Thesis demonstrates architecture + prototype, defers user validation to post-graduation

- **Risk:** PostgreSQL setup barrier too high for target users
- **Impact:** Low adoption, users can't run Chiron easily
- **Mitigation:** Provide Docker Compose setup, detailed installation docs
- **Contingency:** Embed SQLite as alternative (simpler setup, reduced features)

**Research Risks (LOW):**
- **Risk:** Productivity gains not statistically significant or measurable
- **Impact:** Weaker thesis contribution, less compelling results
- **Mitigation:** Define clear metrics upfront, measure baseline CLI performance early
- **Contingency:** Shift thesis focus to architectural contribution (novel patterns) vs empirical gains

### Open Questions

**Architecture & Design:**
- **Q:** Should Chiron use Effect-TS for workflow orchestration, or defer to traditional TypeScript?
  - **Implication:** Learning curve vs code quality tradeoff
  - **Decision by:** End of Month 1 (after PRD/Architecture phase)

- **Q:** How to handle agent failures gracefully (LLM errors, timeout, rate limits)?
  - **Implication:** User experience during errors, retry logic complexity
  - **Defer to:** Architecture phase (error handling strategy)

- **Q:** Should workflows be resumable if interrupted mid-execution?
  - **Implication:** State persistence complexity, better UX
  - **Decision:** Yes for critical workflows (PRD, architecture), defer for optional workflows

- **Q:** Git commit strategy: Auto-commit, manual, or suggested?
  - **Implication:** User control vs convenience tradeoff
  - **Defer to:** PRD phase, potentially beta testing feedback

**Multi-Agent Coordination:**
- **Q:** How to prevent agent context pollution when running in parallel?
  - **Approach:** Isolated workspace directories per agent + separate DB transactions
  - **Validate:** Month 2-3 during multi-agent implementation

- **Q:** Should users explicitly approve agent handoffs, or automatic?
  - **Implication:** User control vs workflow velocity
  - **Decision:** Automatic handoffs with notification, user can pause/override

- **Q:** Maximum parallel agents supported in MVP?
  - **Decision:** 2 agents initially, expand to 3-4 if performance allows

**Integration & Extensibility:**
- **Q:** How tightly coupled should Chiron be to BMAD vs generic workflow engine?
  - **Implication:** BMAD-specific optimizations vs future flexibility
  - **Decision:** BMAD-first for MVP, generic abstractions where feasible

- **Q:** Should custom workflows be allowed in MVP, or BMAD-only?
  - **Decision:** BMAD-only for MVP (defer custom workflows to BMB integration post-MVP)

- **Q:** How to version workflow definitions if BMAD updates?
  - **Approach:** Workflow version field in DB, migration logic for breaking changes
  - **Implement:** Architecture phase

**User Experience:**
- **Q:** Should Chiron include onboarding tutorial for first-time users?
  - **Decision:** Defer to post-MVP (time constraint), rely on documentation

- **Q:** Offline mode support (no AI provider connection)?
  - **Decision:** No - Chiron requires LLM for workflow execution

### Areas Needing Further Research

**Competitive Analysis (Month 1):**
- **Conductor.build:** Deep dive into their multi-agent orchestration approach
  - What patterns do they use for parallel execution?
  - How do they handle context isolation?
  - What can Chiron learn or differentiate from?
- **Other multi-agent frameworks:** AutoGPT, LangGraph, CrewAI
  - Architecture patterns for agent coordination
  - State management strategies

**DSPy/ax Validation (Month 1):**
- **Production readiness:** Test TypeScript port (`ax`) with real workflows
- **Schema definition patterns:** How to define complex workflow step schemas
- **Error handling:** What happens when LLM violates schema?
- **Optimization:** Can GEPA/ACE optimizers work within 4-month timeline?

**BMAD Workflow Parsing (Month 1-2):**
- **Edge cases:** What happens with nested workflows, conditional steps, loops?
- **Variable resolution:** Handle all 4 precedence levels correctly
- **Tag interpretation:** Ensure all supported tags parse reliably

**Tauri + PostgreSQL Integration (Month 1):**
- **IPC performance:** How fast are Tauri commands for database queries?
- **Database lifecycle:** How to manage PostgreSQL connection in desktop app?
- **Platform differences:** Any macOS/Linux/Windows gotchas?

**Multi-Agent Context Isolation (Month 2-3):**
- **File system isolation:** Separate workspace directories per agent?
- **Database transactions:** How to prevent state conflicts?
- **MCP injection:** How to dynamically load/unload MCP servers per agent?

**Performance & Scalability (Month 3):**
- **Workflow execution speed:** Can complex workflows (PRD with 12 stories) complete in <2 hours?
- **Database query optimization:** Are JSONB queries performant enough?
- **UI responsiveness:** Does real-time agent status polling lag the interface?

---

## Appendices

### A. Research Summary

**BMAD Deep-Dive (Q1-Q10 Analysis):**

Comprehensive investigation conducted via OpenCode agent (BMAD repository access) covering 10 critical areas:

1. **BMAD Overview & Philosophy:** Guided-not-automated methodology, human expertise at center, 4-phase SDLC
2. **Module System:** BMM (software lifecycle), CIS (creative/innovation), BMB (method builder - out of scope)
3. **Workflow System:** workflow.xml engine, YAML configs, markdown instructions, 4-level variable precedence
4. **Agent System:** 14+ specialized agents (Analyst, PM, Architect, DEV, SM, TEA, UX, Game roles, CIS coaches)
5. **4-Phase Methodology:** Analysis → Planning → Solutioning → Implementation with adaptive levels (0-4)
6. **Project Types & Levels:** Greenfield/brownfield software, game development; 5 complexity levels
7. **Status & Tracking:** workflow-status.md (phase-level), sprint-status.yaml (story-level), state machine validation
8. **What's NEW in v6:** MCP injection, improved workflows, better state management
9. **User Journey:** Installation mechanics, file READ/WRITE patterns, artifact dependency chain, state transitions
10. **Technical Architecture:** Slash command integration, LLM role in execution, version control strategy, parsing mechanics

**Key Findings:**
- BMAD executes sequentially with manual agent handoffs (*analyst → *pm → *architect)
- Workflow execution relies on LLM interpreting freeform XML tags from instructions
- Artifacts flow through phases (product-brief → PRD → architecture → stories)
- Status managed via markdown files, no database
- CLI-only interface limits visibility and coordination

**Chiron's Architectural Response:**
- Multi-agent orchestration with isolated contexts (parallel execution)
- DSPy/ax structured outputs (LLM makes decisions, Chiron validates and executes)
- Database-first (workflows + state in DB, artifacts in repo)
- Pattern-driven visual UX (Agent Dashboard, Story Kanban, Artifact Workbench)
- Clean artifact separation (no bmad/ directory pollution)

**Full analysis documented in:** `docs/architecture-foundations.md`

### B. Stakeholder Input

**Primary Stakeholder: Thesis Advisor**
- **Requirements:** Original research contribution, technical depth, practical validation
- **Expectations:** Demonstrable MVP by Month 4, documented architecture decisions, measured productivity gains
- **Concerns:** 4-month timeline aggressive for multi-agent system, scope management critical
- **Input incorporated:** Ruthless MVP scoping, clear fallback plans, academic rigor in metrics

**Secondary Stakeholder: Open Source Community (Post-Thesis)**
- **Interests:** Sustainable architecture, extensibility, documentation quality
- **Needs:** Clear contribution guidelines, stable APIs, active maintenance
- **Input incorporated:** Design for community handoff, avoid technical debt, comprehensive docs

**Target Users (Beta Testers):**
- **Profile:** Intermediate/expert developers using BMAD CLI + AI coding agents
- **Pain Points:** CLI context-switching overhead, lack of multi-agent coordination, poor visibility
- **Desired Outcomes:** 2x productivity through parallel agents, visual project state, maintained control
- **Input incorporated:** Focus on orchestration gap (not replacing BMAD), preserve "guided not automated" philosophy

**Creator (Self - User 0):**
- **Personal pain point:** Managing complex projects with BMAD CLI is mentally exhausting without orchestration layer
- **Dogfooding commitment:** Will use Chiron for own projects during development (validates practical utility)
- **Thesis motivation:** Solve real problem while demonstrating novel architecture patterns

### C. References

**BMAD (Business Method and Architecture Design):**
- Repository: github.com/bmad-method/bmad (private alpha access)
- Version: 6.0.0-alpha.0 (accessed 2025-10-24 to 2025-11-01)
- Documentation: BMAD workflow files, agent definitions, CSV databases
- Analysis: 10-question deep-dive via OpenCode agent

**Competitive Tools:**
- **Conductor.build:** Multi-agent orchestration platform (https://conductor.build/)
- **Claude Code:** AI coding agent by Anthropic (https://claude.com/claude-code)
- **Cursor:** AI-powered code editor (https://cursor.sh/)
- **GitHub Copilot:** AI pair programmer (https://github.com/features/copilot)

**Technical Frameworks:**
- **DSPy:** Framework for algorithmically optimizing LLM prompts (https://dspy-docs.vercel.app/)
- **ax (DSPy TypeScript port):** https://github.com/dosco/llm-client (structured LLM outputs)
- **Effect-TS:** Functional effect system for TypeScript (https://effect.website/)
- **Tauri:** Desktop application framework (https://tauri.app/)
- **Drizzle ORM:** TypeScript-first database ORM (https://orm.drizzle.team/)
- **Hono:** Lightweight web framework (https://hono.dev/)

**Research Areas:**
- Multi-agent systems and orchestration patterns
- Human-AI collaboration frameworks
- Workflow automation with human-in-the-loop
- DSPy optimization techniques (GEPA, ACE)
- Pattern-driven UI design for developer tools

**Academic Context:**
- Master's Thesis Project (Computer Science / Software Engineering)
- Timeline: 4 months (2025-11 to 2026-03)
- Institution: [University name - defer to final thesis]
- Advisor: [Name - defer to final thesis]

**Project Resources:**
- Product Brief: `docs/product-brief-chiron-2025-10-26.md` (this document)
- Architecture Foundations: `docs/architecture-foundations.md`
- BMAD Questions: `bmad-questions.md`
- BMAD Expert Instructions: `bmad-expert.md`
- Workflow Status: `docs/bmm-workflow-status.md`

---

_This Product Brief serves as the foundational input for Product Requirements Document (PRD) creation._

_Next Steps: Handoff to Product Manager for PRD development using the `workflow prd` command._
