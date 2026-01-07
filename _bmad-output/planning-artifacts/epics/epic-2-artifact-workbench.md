# Epic 2: Artifact Workbench (Brainstorming Focus)

**Goal:** Implement Artifact Workbench with Phase 0 workflows to validate thesis: visual UX + artifact-driven workflows > CLI approach

**Duration:** 2 weeks (Phase 0 only)  
**Dependencies:** Epic 1 (Foundation + Workflow-Init Engine) ✅  
**Owner:** DEV + UX Designer agents  
**BMAD Phase:** Phase 0 (Discovery + Analysis)

---

## Key Deliverables

### Artifact Workbench UI
- **Split-pane layout:** Chat interface (left) + Artifact preview (right)
- **Real-time collaboration:** Live artifact updates as chat generates content
- **Template rendering:** Markdown with syntax highlighting
- **Version control:** Track artifact changes with diff visualization
- **Export functionality:** Download artifacts in various formats

### Brainstorming Workflow (End-to-End)
- **Project Dashboard:** Entry point with intelligent routing
- **Setup Phase:** Topic selection, goal setting
- **Execution Loop:** Technique execution (SCAMPER, etc.) via Action Lists
- **Convergence Phase:** Kanban-style prioritization of ideas
- **Planning Phase:** Editable forms for action plan refinement
- **Output:** Final committed artifact

---

## Story Breakdown

### Story 2.1: Project Dashboard & Schema Foundation (2 days)
**As a User,**
I want a dashboard that shows my project's current phase and next recommended workflow, supported by a flexible database schema, so that I can start the right workflow with the right context.

**Acceptance Criteria:**
- [ ] **Schema Refactor:** Update `workflows` table:
    - ADD: `tags` (JSONB), `metadata` (JSONB)
    - REMOVE: `module`, `agentId`, `initializerType`, `isStandalone`, `requiresProjectContext`
- [ ] **Seed Workflow (Shell):** Seed the `brainstorming` workflow entry with correct `tags` and `artifactTemplate` (steps array empty for now).
- [ ] **Dashboard UI:** Implement the Project Dashboard showing Phase 0 status.
- [ ] **Routing Logic:** "Start Brainstorming" button uses `workflow_paths` to determine availability.
- [ ] **Context Passing:** Clicking Start passes project name/desc to the workflow engine.

### Story 2.2: Workbench Shell & Setup (Step 1) (3 days)
**As a User,**
I want a split-pane interface where I can chat with the Brainstorming agent to define the topic and goals, so that the session is properly scoped.

**Acceptance Criteria:**
- [ ] **Seed Step 1:** Configure `brainstorming` workflow Step 1 with `set_session_topic`, `set_stated_goals`, `select_techniques` tools.
- [ ] **Workbench Layout:** Implement resizable Split-Pane (Chat Left, Preview Right).
- [ ] **Chat Interface:** Render the chat timeline.
- [ ] **Blocking Tools:** Implement UI for blocking inputs (Topic/Goal).
- [ ] **Validation:** Verify Step 1 configuration against `brainstorming-chiron-configuration.md`.

### Story 2.3: Execution Loop & Child Workflows (Step 2) (3 days)
**As a User,**
I want to execute specific brainstorming techniques (like SCAMPER) via the chat, so that I can generate structured ideas.

**Acceptance Criteria:**
- [ ] **Seed Techniques:** Insert 5 technique workflows (SCAMPER, Six Thinking Hats, Five Whys, Mind Mapping, What If Scenarios) into `workflows` table (tagged `type: technique`). TypeScript seed configs in `docs/sprint-artifacts/story-2-3-technique-workflows/`.
- [ ] **Seed Step 2:** Configure `brainstorming` workflow Step 2 with `invoke-workflow` logic.
- [ ] **Action List UI:** Render the list of selected techniques in the chat.
- [ ] **Child Workflow UI:** Implement Modal/Dialog for running technique workflows.
- [ ] **Data Aggregation:** Collect outputs into `captured_ideas` variable.

### Story 2.4: Convergence & Kanban (Step 3 & 4) (3 days)
**As a User,**
I want to organize my raw ideas into prioritized categories using a visual board, so that I can focus on the best ones.

**Acceptance Criteria:**
- [ ] **Seed Step 3:** Configure `brainstorming` workflow Step 3 with `organize_ideas` tool.
- [ ] **Seed Step 4:** Configure Step 4 (Analysis Loop) placeholder.
- [ ] **Kanban UI:** Implement Drag & Drop board for `ax-generator` pattern.
- [ ] **State Sync:** Moving cards updates the backend variable immediately.
- [ ] **Validation:** Ensure ideas flow from Step 2 to Step 3 correctly.

### Story 2.5: Planning & Forms (Step 5) (3 days)
**As a User,**
I want to turn my top ideas into an action plan using an editable form, so that I can refine the AI's suggestions.

**Acceptance Criteria:**
- [ ] **Seed Step 5:** Configure `brainstorming` workflow Step 5 with `create_action_plan` tool.
- [ ] **Form UI:** Implement Editable Form component for `ax-generator` pattern.
- [ ] **AI Drafting:** Agent generates initial plan based on Step 3 priorities.
- [ ] **Finalize:** Locking the form saves the plan to variables.

### Story 2.6: Artifact Rendering & Persistence (Output) (2 days)
**As a User,**
I want to see my brainstorming results as a live document and save them to my repository, so that I have a permanent record.

**Acceptance Criteria:**
- [ ] **Seed Step 6 & 7:** Configure Step 6 (Reflection) and Step 7 (Completion/Commit).
- [ ] **Live Preview:** Right pane renders Markdown from `template.md` + `session_variables`.
- [ ] **Git Commit:** Step 7 triggers `execute-action` to save file to Git.
- [ ] **Session Cleanup:** End of workflow handles state cleanup.

---

## Epic 2 Success Criteria

### Thesis Validation
- [ ] Users prefer Artifact Workbench + visual UX over CLI approach
- [ ] Artifact-driven workflows demonstrate clear value proposition
- [ ] Multi-agent collaboration patterns enhance user experience
- [ ] Real-time artifact generation improves workflow efficiency

### Technical Excellence
- [ ] All Phase 0 workflows functional with proper error handling
- [ ] Artifact Workbench performs well with large artifacts
- [ ] Multi-agent chat patterns implemented effectively
- [ ] Integration between workflows seamless and intuitive

### User Experience
- [ ] Split-pane interface provides superior workflow visibility
- [ ] Real-time collaboration enables better team coordination
- [ ] Artifact versioning and change tracking implemented
- [ ] Chat patterns follow established UX best practices

---

## Risk Assessment

### High Risk
- **Scope Creep:** 2-week timeline aggressive for 6 stories
- **Technical Complexity:** Multi-agent patterns and real-time synchronization

### Medium Risk  
- **User Adoption:** Users may prefer familiar CLI patterns initially
- **Performance:** Real-time artifact rendering with large documents

### Mitigation Strategies
- **Focused Scope:** Phase 0 only, defer advanced features
- **Parallel Development:** UI components and workflows developed simultaneously
- **Incremental Delivery:** Each story delivers working functionality

---

## Dependencies

### Required from Epic 1
- [x] Database foundation with 15 tables
- [x] Workflow execution engine with 5 step types
- [x] Web UI foundation with authentication
- [x] Mastra + Ax integration with approval gates
- [x] Generic project creation workflow

### New Requirements for Epic 2
- [ ] Multi-agent chat patterns and agent networks
- [ ] Artifact Workbench split-pane UI
- [ ] Real-time artifact synchronization
- [ ] Template-based artifact generation
- [ ] Advanced workflow routing and context management

---

## Next Epic Readiness

Epic 3 will build on Epic 2's Artifact Workbench foundation, implementing the remaining Phase 0 workflows (Research, Product Brief).

---

**Status:** 🟢 Ready for Implementation  
**Document Version:** 2.1 (Explicit Seeding Specs)  
**Last Updated:** 2025-11-23