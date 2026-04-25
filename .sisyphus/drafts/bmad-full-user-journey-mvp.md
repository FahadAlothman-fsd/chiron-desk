# BMAD Seeded User Journey — 12-Hour MVP Contract

## Status
- Agreement state: **draft for structural review**
- Scope: full seeded BMAD user journey for the immediate 12-hour implementation proof
- Purpose: collapse the prior isolated work-unit specs into one explicit user journey showing states, transitions, workflows, steps, facts, artifacts, and cross-work-unit correction/refinement behavior

## Current MVP Modeling Decisions

### Locked for the 12-hour proof
- Backlog and Sprint Planning are one work unit: `backlog`.
- `backlog` owns:
  - requirements inventory
  - epic design as structured data
  - story inventory as structured data
  - requirements coverage map
  - sprint/status tracking
  - active working-set selection
  - selected Story invocation
- Story work units are created only for selected story keys from Backlog.
- Epic is not a work unit in the MVP. Epic remains structured data in Backlog.
- Course Correction is included and demonstrates cross-work-unit impact.
- Refinement is modeled primarily as same-state transitions, especially `done → done`, not as a separate `refinement` state.
- Docs + survey are downstream of the seed proof and not part of this MVP implementation plan.

### Deferred future enhancements
- Materialized Epic work units.
- Materialized Story work units for every backlog story in initial `backlog` state.
- State-aware living-instance draft specs.
- Dereferencing `work_unit_reference_fact` into selected fact/artifact instances from referenced work units.
- Standalone Sprint Plan work unit, if future product use demands independent sprint objects.

## End-to-End User Journey

### Journey overview
1. User creates/selects a project.
2. User seeds BMAD methodology into the database via in-app seed button.
3. User starts `Setup`.
4. Setup branches greenfield/brownfield and produces project context.
5. User may run Brainstorming and/or Research.
6. User creates Product Brief.
7. User creates PRD.
8. User optionally creates UX Design.
9. User creates Architecture.
10. User creates combined Backlog, which also performs sprint planning/status setup.
11. User runs Implementation Readiness against PRD + Architecture + Backlog (+ UX if present).
12. If ready, user selects active story working set in Backlog.
13. Backlog invokes Story work units for selected story keys.
14. Each Story moves through authoring, development, review, and done.
15. Backlog status tracks selected stories and can close a working set.
16. User runs Retrospective after meaningful epic/story completion.
17. Course Correction can be triggered by implementation discoveries, review findings, retrospective discoveries, or user change requests.
18. Course Correction creates a Sprint Change Proposal and opens `done → done` refinement transitions on affected PRD/UX/Architecture/Backlog/Story units.

---

# Work Unit Contracts

## 1. Setup

### User purpose
Establish project context and the initial BMAD route with minimal friction.

### States
| State | Meaning |
|---|---|
| `done` | Project context and setup facts/artifacts are available. |

### Transitions
| Transition | From | To | Workflow |
|---|---|---|---|
| `activation_to_done` | activation | `done` | `setup_project` |
| `done_to_done_refine_setup` | `done` | `done` | `refine_setup_context` |

### Primary workflow: `setup_project`
| Step | Type | Purpose | Writes |
|---|---|---|---|
| `setup_intake_form` | `form` | Capture minimal project identity and greenfield/brownfield choice. | `initiative_name_ctx`, `project_kind_ctx` |
| `setup_project_kind_branch` | `branch` | Route greenfield vs brownfield path. | route selection |
| `greenfield_discovery_agent` | `agent` | Understand what user wants to build. | project overview/context facts |
| `brownfield_scan_options_form` | `form` | Optional scan/workflow mode. | `scan_level_ctx`, `workflow_mode_ctx` |
| `brownfield_discovery_agent` | `agent` | Inspect repo/docs and produce context. | repo/project facts |
| `optional_downstream_invokes` | `branch` + `invoke` | Optionally start Brainstorming/Research/Product Brief. | downstream refs |
| `propagate_setup_outputs` | `action` | Persist setup facts/artifacts. | durable facts/artifacts |

### Facts
| Fact | Type | Cardinality | Notes |
|---|---|---:|---|
| `initiative_name` | string | one | Project/initiative name. |
| `project_kind` | string | one | `greenfield` or `brownfield`. |
| `repository_type` | string | one | Repo classification. |
| `project_parts` | json | many | Apps/packages/services. |
| `technology_stack_by_part` | json | many | Stack inventory. |
| `existing_documentation_inventory` | json | many | Brownfield docs inventory. |
| `integration_points` | json | many | External/internal integrations. |
| `project_knowledge_directory` | string | one | Directory path fact, no defaults. |
| `planning_artifacts_directory` | string | one | Directory path fact, no defaults. |
| `implementation_artifacts_directory` | string | one | Directory path fact, no defaults. |

### Artifact slots
| Artifact | Required | Purpose |
|---|---:|---|
| `PROJECT_OVERVIEW` | yes | Setup summary. |
| `BROWNFIELD_DOCS_INDEX` | no | Brownfield inventory. |
| `PROJECT_CONTEXT` | yes | Implementation-agent context handoff. |

---

## 2. Brainstorming

### User purpose
Generate, explore, critique, and refine ideas using selected BMAD techniques.

### States
| State | Meaning |
|---|---|
| `done` | Brainstorming outputs and synthesis are complete. |

### Transitions
| Transition | From | To | Workflow |
|---|---|---|---|
| `activation_to_done` | activation | `done` | `run_brainstorming` |
| `done_to_done_refine_brainstorming` | `done` | `done` | `refine_brainstorming` |

### Primary workflow: `run_brainstorming`
| Step | Type | Purpose | Writes |
|---|---|---|---|
| `brainstorming_intake_form` | `form` | Capture topic and selected techniques. | topic/context facts |
| `technique_selection_agent` | `agent` | Recommend/confirm techniques. | `selected_technique_workflow_refs_ctx` |
| `has_selected_techniques_branch` | `branch` | Decide whether to invoke technique workflows. | route selection |
| `invoke_selected_techniques` | `invoke` | Invoke selected technique workflows. | technique outputs |
| `brainstorming_synthesis_agent` | `agent` | Synthesize ideas and next actions. | synthesis facts/artifact |
| `propagate_brainstorming_outputs` | `action` | Persist outputs. | durable facts/artifacts |

### Facts
| Fact | Type | Cardinality | Notes |
|---|---|---:|---|
| `brainstorming_topic` | string | one | Topic or problem. |
| `selected_technique_workflow_refs` | workflow_ref | many | First-principles, Five Whys, Socratic, stakeholder round table, critique/refine. |
| `technique_outputs` | json | many | Outputs from invoked techniques. |
| `brainstorming_synthesis` | json | one | Final synthesis. |

### Artifact slots
| Artifact | Required | Purpose |
|---|---:|---|
| `BRAINSTORMING_OUTPUT` | yes | Human-readable idea/synthesis artifact. |

---

## 3. Research

### User purpose
Produce market/domain/technical research that informs Product Brief, PRD, Architecture, and Backlog.

### States
| State | Meaning |
|---|---|
| `done` | Research synthesis and report are complete. |

### Transitions
| Transition | From | To | Workflow |
|---|---|---|---|
| `activation_to_done` | activation | `done` | `market_research` / `domain_research` / `technical_research` |
| `done_to_done_refine_research` | `done` | `done` | `refine_research` |

### Workflows
| Workflow | Purpose | Main steps |
|---|---|---|
| `market_research` | Competitors/customers/market forces. | intake → research agent → synthesis → report → propagation |
| `domain_research` | Domain concepts/rules/risks. | intake → research agent → synthesis → report → propagation |
| `technical_research` | Technical stack/options/tradeoffs. | intake → research agent → synthesis → report → propagation |

### Facts
| Fact | Type | Cardinality | Notes |
|---|---|---:|---|
| `research_variant` | string | one | market/domain/technical. |
| `research_questions` | json | many | Questions to answer. |
| `research_findings` | json | many | Findings with sources. |
| `research_synthesis` | json | one | Required completion fact. |

### Artifact slots
| Artifact | Required | Purpose |
|---|---:|---|
| `RESEARCH_REPORT` | yes | Canonical report. |

---

## 4. Product Brief

### User purpose
Turn idea/context/research into an executive product brief for PRD creation.

### States
| State | Meaning |
|---|---|
| `done` | Product brief artifact and structured product facts exist. |

### Transitions
| Transition | From | To | Workflow |
|---|---|---|---|
| `activation_to_done` | activation | `done` | `create_product_brief` |
| `done_to_done_refine_product_brief` | `done` | `done` | `refine_product_brief` |

### Workflow: `create_product_brief`
| Step | Type | Purpose |
|---|---|---|
| `brief_intent_agent` | `agent` | Understand idea and success intent. |
| `brief_context_discovery_agent` | `agent` | Consume Setup/Brainstorming/Research context. |
| `brief_elicitation_agent` | `agent` | Guided elicitation. |
| `brief_draft_agent` | `agent` | Draft/review brief. |
| `propagate_product_brief_outputs` | `action` | Persist facts/artifacts. |

### Facts
| Fact | Type | Cardinality | Notes |
|---|---|---:|---|
| `source_research_work_units` | work_unit_reference | many | Optional. |
| `product_idea_summary` | string | one | Core idea. |
| `target_users` | json | many | User/customer segments. |
| `value_proposition` | string | one | Why it matters. |
| `success_outcomes` | json | many | Desired outcomes. |

### Artifact slots
| Artifact | Required | Purpose |
|---|---:|---|
| `PRODUCT_BRIEF` | yes | Canonical brief. |
| `PRODUCT_BRIEF_DISTILLATE` | no | Optional LLM-context distillate. |

---

## 5. PRD

### User purpose
Create the capability contract: requirements, scope, journeys, FRs/NFRs, and acceptance shape.

### States
| State | Meaning |
|---|---|
| `done` | PRD is complete and downstream units can trace to it. |

### Transitions
| Transition | From | To | Workflow |
|---|---|---|---|
| `activation_to_done` | activation | `done` | `create_prd` |
| `done_to_done_refine_prd` | `done` | `done` | `refine_prd_from_change_proposal` |

### Workflow: `create_prd`
| Step | Type | Purpose |
|---|---|---|
| `prd_source_selection_agent` | `agent` | Bind Product Brief or direct source context. |
| `prd_discovery_agent` | `agent` | Discover/classify product and scope. |
| `prd_requirements_agent` | `agent` | Produce FR/NFR/user journeys/scope. |
| `prd_polish_agent` | `agent` | Polish and validate completeness. |
| `propagate_prd_outputs` | `action` | Persist PRD facts/artifact. |

### Refinement workflow: `refine_prd_from_change_proposal`
| Step | Type | Purpose |
|---|---|---|
| `load_change_proposal_agent` | `agent` | Read Course Correction proposal. |
| `prd_patch_agent` | `agent` | Apply approved PRD before/after edits. |
| `prd_revalidation_agent` | `agent` | Revalidate FR/NFR/scope consistency. |
| `propagate_refined_prd` | `action` | Supersede updated facts/artifact. |

### Facts
| Fact | Type | Cardinality | Notes |
|---|---|---:|---|
| `source_product_brief` | work_unit_reference | one | Optional but preferred. |
| `product_vision` | string | one | Vision statement. |
| `functional_requirements` | json | many | FR stream. |
| `non_functional_requirements` | json | many | NFR stream. |
| `user_journeys` | json | many | User flows. |
| `scope_boundaries` | json | one | Includes out-of-scope. |
| `success_criteria` | json | many | Verifiable outcomes. |

### Artifact slots
| Artifact | Required | Purpose |
|---|---:|---|
| `PRD` | yes | Canonical PRD. |

---

## 6. UX Design

### User purpose
Define interaction, UI, design-system, accessibility, and responsive requirements when UI matters.

### States
| State | Meaning |
|---|---|
| `done` | UX design spec and UX-DR stream are complete. |

### Transitions
| Transition | From | To | Workflow |
|---|---|---|---|
| `activation_to_done` | activation | `done` | `create_ux_design` |
| `done_to_done_refine_ux_design` | `done` | `done` | `refine_ux_design_from_change_proposal` |

### Workflow: `create_ux_design`
| Step | Type | Purpose |
|---|---|---|
| `ux_project_understanding_agent` | `agent` | Understand PRD and user context. |
| `ux_experience_agent` | `agent` | Define core/emotional experience and flows. |
| `ux_visual_system_agent` | `agent` | Define tokens, components, visual direction. |
| `ux_accessibility_responsive_agent` | `agent` | Accessibility/responsive strategy. |
| `propagate_ux_outputs` | `action` | Persist UX facts/artifacts. |

### Facts
| Fact | Type | Cardinality | Notes |
|---|---|---:|---|
| `source_prd` | work_unit_reference | one | Required. |
| `ux_design_requirements` | json | many | `UX-DR#` stream for Backlog. |
| `user_flows` | json | many | Flow definitions. |
| `component_strategy` | json | one | Components/patterns. |
| `accessibility_requirements` | json | many | A11y requirements. |

### Artifact slots
| Artifact | Required | Purpose |
|---|---:|---|
| `UX_DESIGN_SPECIFICATION` | yes | Canonical UX spec. |
| `UX_COLOR_THEMES` | no | Optional visual support. |
| `UX_DESIGN_DIRECTIONS` | no | Optional visual concepts. |

---

## 7. Architecture

### User purpose
Turn PRD (+ UX/Research/Context) into implementation decisions, patterns, boundaries, and technical requirements.

### States
| State | Meaning |
|---|---|
| `done` | Architecture document and structured decisions are complete. |

### Transitions
| Transition | From | To | Workflow |
|---|---|---|---|
| `activation_to_done` | activation | `done` | `create_architecture` |
| `done_to_done_refine_architecture` | `done` | `done` | `refine_architecture_from_change_proposal` |

### Workflow: `create_architecture`
| Step | Type | Purpose |
|---|---|---|
| `architecture_input_validation_agent` | `agent` | Validate PRD/context inputs. |
| `architecture_context_analysis_agent` | `agent` | Analyze stack, constraints, starter/template options. |
| `architecture_decision_agent` | `agent` | Produce decisions, patterns, boundaries. |
| `architecture_validation_agent` | `agent` | Validate coverage and handoff quality. |
| `propagate_architecture_outputs` | `action` | Persist facts/artifacts. |

### Facts
| Fact | Type | Cardinality | Notes |
|---|---|---:|---|
| `source_prd` | work_unit_reference | one | Required. |
| `source_ux_design` | work_unit_reference | one | Optional. |
| `architecture_decisions` | json | many | ADR-like decisions. |
| `implementation_patterns` | json | many | Required patterns. |
| `project_structure` | json | one | Source tree/module boundaries. |
| `architecture_requirements` | json | many | Inputs to Backlog. |
| `requirements_coverage` | json | one | PRD coverage. |

### Artifact slots
| Artifact | Required | Purpose |
|---|---:|---|
| `ARCHITECTURE_DOCUMENT` | yes | Canonical architecture. |
| `ARCHITECTURE_DECISION_RECORDS` | no | Optional individual ADRs. |

---

## 8. Backlog (Combined Epics/Stories + Sprint Planning MVP)

### User purpose
Create the implementation inventory, validate coverage/dependencies, generate sprint/status tracking, select the current working set, and invoke selected Story work units.

### States
| State | Meaning |
|---|---|
| `done` | Backlog inventory and sprint/status setup exist. No active working set is currently running. |
| `active` | A selected working set of Story work units is running or awaiting review. |

### Transitions
| Transition | From | To | Workflow |
|---|---|---|---|
| `activation_to_done` | activation | `done` | `create_backlog` |
| `done_to_active` | `done` | `active` | `select_story_working_set` |
| `active_to_done` | `active` | `done` | `complete_story_working_set` |
| `done_to_done_refine_backlog` | `done` | `done` | `refine_backlog_from_change_proposal` |
| `active_to_active_refine_backlog` | `active` | `active` | `refine_active_backlog_from_change_proposal` |

### Workflow: `create_backlog`
| Step | Type | Purpose | Writes |
|---|---|---|---|
| `backlog_requirements_extraction_agent` | `agent` | Extract PRD FR/NFR, Architecture requirements, UX-DRs. | `requirements_inventory_ctx` |
| `backlog_epic_design_agent` | `agent` | Design user-value epics; no technical-layer epics. | `epic_design_ctx` |
| `backlog_story_generation_agent` | `agent` | Generate stories with ACs and requirement refs. | `story_inventory_ctx` |
| `backlog_dependency_planning_agent` | `agent` | Build JSON dependency graph and parallel waves. | `story_dependency_graph_ctx` |
| `backlog_final_validation_agent` | `agent` | Validate coverage, dependencies, JIT entity creation. | `backlog_validation_ctx` |
| `backlog_sprint_status_agent` | `agent` | Generate BMAD-compatible sprint status entries. | `sprint_status_entries_ctx`, `sprint_status_artifact_ctx` |
| `propagate_backlog_outputs` | `action` | Persist facts/artifacts. | durable facts/artifacts |

### Workflow: `select_story_working_set`
| Step | Type | Purpose | Writes |
|---|---|---|---|
| `working_set_selection_agent_or_form` | `agent` or `form` | Present single story, dependency-safe wave, or custom selection. | `selected_story_keys_ctx` |
| `working_set_validation_agent` | `agent` | Validate prerequisites and unsafe parallel pairs. | `selected_story_working_set_ctx` |
| `invoke_selected_story_units` | `invoke` | Create Story work units for selected keys. | `selected_story_work_unit_refs` |
| `sync_working_set_status` | `action` | Update Backlog/Sprint status. | status facts/artifact |

### Workflow: `complete_story_working_set`
| Step | Type | Purpose |
|---|---|---|
| `working_set_completion_agent` | `agent` | Verify selected Story work units terminal. |
| `working_set_status_agent` | `agent` | Update `SPRINT_STATUS`, recommend Retrospective or next working set. |
| `propagate_working_set_completion` | `action` | Persist completion summary. |

### Facts
| Fact | Type | Cardinality | Notes |
|---|---|---:|---|
| `prd_work_unit` | work_unit_reference | one | Required source. |
| `architecture_work_unit` | work_unit_reference | one | Required source. |
| `ux_design_work_unit` | work_unit_reference | one | Optional. |
| `input_documents` | json | one | Source inventory. |
| `requirements_inventory` | json | one | FR/NFR/ARCH/UX-DR streams. |
| `requirements_coverage_map` | json | one | Requirement → epic/story coverage. |
| `epic_design` | json | one | User-value epic list. |
| `story_inventory` | json | one | All stories as structured data. |
| `story_dependency_graph` | json | one | Dependencies and parallel waves. |
| `sprint_status_entries` | json | one | BMAD statuses. |
| `selected_story_working_set` | json | one | Current selected working set. |
| `selected_story_work_units` | work_unit_reference | many | Story WUs created for selected keys. |
| `working_set_completion_summary` | json | one | Completion summary. |
| `backlog_validation` | json | one | Final validation. |
| `backlog_findings` | json | many | Issues/warnings. |

### Artifact slots
| Artifact | Required | Purpose |
|---|---:|---|
| `EPICS_AND_STORIES` | yes | Canonical BMAD backlog artifact. |
| `SPRINT_STATUS` | yes | BMAD-compatible sprint-status artifact. |

---

## 9. Backlog Readiness Gate

### User purpose
Validate that PRD, Architecture, Backlog, and optional UX are aligned before implementation continues.

### MVP modeling decision
- Implementation Readiness is not a standalone work unit in the 12-hour MVP.
- It is Backlog behavior: Backlog runs `check_implementation_readiness` and owns `READINESS_REPORT`.
- The transition is fixed: `draft_to_readiness_review` always ends at `readiness_review`.
- Separate follow-up transitions accept the ready result or return Backlog to draft remediation.

### States
| State | Meaning |
|---|---|
| `readiness_review` | Backlog readiness assessment/report exist and await accept/remediation transition. |
| `ready_for_sprint_planning` | Backlog readiness result was accepted and active working-set planning can run. |
| `draft` | Backlog needs remediation after failed readiness. |

### Transitions
| Transition | From | To | Workflow |
|---|---|---|---|
| `draft_to_readiness_review` | `draft` | `readiness_review` | `check_implementation_readiness` |
| `readiness_review_to_ready_for_sprint_planning` | `readiness_review` | `ready_for_sprint_planning` | `accept_readiness_result` |
| `readiness_review_to_draft` | `readiness_review` | `draft` | `return_to_draft_after_readiness` |

### Workflow: `check_implementation_readiness`
| Step | Type | Purpose |
|---|---|---|
| `readiness_document_discovery_agent` | `agent` | Inventory PRD/Architecture/Backlog/UX. |
| `readiness_prd_analysis_agent` | `agent` | Extract requirements. |
| `readiness_coverage_and_ux_agent` | `agent` | Validate Backlog coverage and UX alignment. |
| `readiness_epic_quality_agent` | `agent` | Validate epic/story quality. |
| `readiness_final_assessment_agent` | `agent` | ready / needs_work / not_ready. |
| `propagate_readiness_report` | `action` | Persist Backlog-owned readiness result/report. |

### Facts
| Fact | Type | Cardinality | Notes |
|---|---|---:|---|
| `prd_work_unit` | work_unit_reference | one | Existing Backlog source fact. |
| `architecture_work_unit` | work_unit_reference | one | Existing Backlog source fact. |
| `document_inventory` | json | one | Required. |
| `prd_analysis` | json | one | Required. |
| `epic_coverage_validation` | json | one | Required. |
| `ux_alignment_assessment` | json | one | Required, may say not_needed. |
| `epic_quality_review` | json | one | Required. |
| `implementation_readiness_result` | json | one | Required. |
| `next_recommended_work_units` | work_unit_reference | many | Backlog if ready, remediation if not. |

### Artifact slots
| Artifact | Required | Purpose |
|---|---:|---|
| `READINESS_REPORT` | yes | Backlog-owned canonical readiness report. |

---

## 10. Story

### User purpose
Turn one selected Backlog story key into a story spec, implement it, review it, and sync Backlog status.

### MVP states
| State | Meaning |
|---|---|
| `ready_for_dev` | Story spec exists and is validated. |
| `in_progress` | Dev workflow is implementing or addressing review follow-ups. |
| `review` | Implementation is complete and waiting for code review. |
| `done` | Code review is complete and status synced. |

### MVP transitions
| Transition | From | To | Workflow |
|---|---|---|---|
| `activation_to_ready_for_dev` | activation | `ready_for_dev` | `create_story` |
| `ready_for_dev_to_in_progress` | `ready_for_dev` | `in_progress` | `start_dev_story` |
| `in_progress_to_review` | `in_progress` | `review` | `dev_story` |
| `review_to_done` | `review` | `done` | `code_review` |
| `review_to_in_progress` | `review` | `in_progress` | `code_review` |
| `done_to_done_refine_story` | `done` | `done` | `refine_story_from_change_proposal` |

### Workflow: `create_story`
| Step | Type | Purpose |
|---|---|---|
| `create_story_source_analysis_agent` | `agent` | Load Backlog story, PRD/Architecture/UX trace, previous learnings. |
| `create_story_research_and_context_agent` | `agent` | Add current technical context. |
| `create_story_spec_agent` | `agent` | Produce `STORY_DOCUMENT`. |
| `create_story_validation_agent` | `agent` | Validate readiness. |
| `propagate_create_story_outputs` | `action` | Persist facts/artifact. |
| `sync_story_ready_status` | `action` | Update Backlog `SPRINT_STATUS` to `ready-for-dev`. |

### Workflow: `dev_story`
| Step | Type | Purpose |
|---|---|---|
| `dev_story_implementation_agent` | `agent` | Implement mapped tasks/subtasks only. |
| `dev_story_validation_agent` | `agent` | Run tests/lint/build/QA and verify ACs. |
| `propagate_dev_story_outputs` | `action` | Persist implementation evidence. |
| `sync_story_review_status` | `action` | Update Backlog `SPRINT_STATUS` to `review`. |

### Workflow: `code_review`
| Step | Type | Purpose |
|---|---|---|
| `code_review_context_agent` | `agent` | Construct diff and context. |
| `code_review_parallel_review_agent` | `agent` | Blind Hunter, Edge Case Hunter, Acceptance Auditor. |
| `code_review_triage_agent` | `agent` | Classify findings. |
| `code_review_finalization_agent` | `agent` | Write findings; decide done vs in_progress. |
| `propagate_code_review_outputs` | `action` | Persist review evidence. |
| `sync_story_final_review_status` | `action` | Update Backlog status to `done` or `in-progress`. |

### Facts
| Fact | Type | Cardinality | Notes |
|---|---|---:|---|
| `backlog_work_unit` | work_unit_reference | one | Source Backlog. |
| `target_story_key` | string | one | Selected story key. |
| `epic_key` | string | one | Structured Backlog epic key. |
| `sprint_status_artifact` | artifact_reference | one | Backlog status artifact. |
| `story_source_trace` | json | one | Trace to PRD/Architecture/UX/Backlog. |
| `story_requirements` | json | one | Story/AC/tasks. |
| `story_authoring_context` | json | one | Dev notes. |
| `story_spec_validation` | json | one | Readiness validation. |
| `implementation_task_status` | json | one | Dev task status. |
| `implementation_summary` | json | one | Required for review. |
| `validation_results` | json | one | Required for review. |
| `review_summary` | json | one | Required for done. |
| `review_findings` | json | many | Review issues. |

### Artifact slots
| Artifact | Required | Purpose |
|---|---:|---|
| `STORY_DOCUMENT` | yes | Canonical story narrative/spec document. |
| `CODE_CHANGE_FILESET` | yes for review/done | Durable implementation fileset/diff artifact. |
| `TEST_DOCUMENT` | yes for review/done | Durable test/QA evidence artifact. |
| `DEFERRED_WORK` | no | Deferred review/follow-up items. |

---

## 11. Retrospective

### User purpose
Extract lessons after an epic/story set completes and detect changes that should trigger Course Correction.

### MVP modeling decision
- Retrospective is a standalone work unit because its scope is cross-cutting analysis, not Backlog mutation.
- It normally runs after a meaningful completed Backlog working set or epic slice, not necessarily after every small story.
- It may be manually triggered from Backlog `in_progress`, Backlog `done`, or a completed working-set history entry.
- Retrospective start availability should not require pre-attached Story refs; Chiron needs a work-unit condition operator that checks whether instances of a work-unit type exist in the project generally.
- The first Retrospective step is an agent/user selection step that binds the actual Story set using a many-cardinality `work_unit_reference_fact`.
- Retrospective may recommend Course Correction, but does not mutate PRD/UX/Architecture/Backlog/Story artifacts directly.

### States
| State | Meaning |
|---|---|
| `done` | Retrospective report and action items exist. |

### Transitions
| Transition | From | To | Workflow |
|---|---|---|---|
| `activation_to_done` | activation | `done` | `run_retrospective` |
| `done_to_done_followup_retrospective` | `done` | `done` | `update_retrospective_followups` |

### Workflow: `run_retrospective`
| Step | Type | Purpose |
|---|---|---|
| `retro_epic_discovery_agent` | `agent` | Determine completed epic/story set. |
| `retro_story_set_selection_agent` | `agent` | Agent/user select many Story work-unit refs from project candidates. |
| `retro_story_analysis_agent` | `agent` | Analyze story files, review findings, technical debt. |
| `retro_previous_action_agent` | `agent` | Check previous retrospective follow-through. |
| `retro_discussion_agent` | `agent` | Capture wins, issues, learnings. |
| `retro_significant_discovery_agent` | `agent` | Detect if Course Correction is needed. |
| `propagate_retrospective_outputs` | `action` | Persist report/action items. |

### Facts
| Fact | Type | Cardinality | Notes |
|---|---|---:|---|
| `source_backlog_work_unit` | work_unit_reference | one | Backlog context. |
| `source_story_work_units` | work_unit_reference | many | Completed stories selected for analysis through the first workflow step. |
| `source_working_set_id` | string | one | Backlog working-set id being analyzed, when applicable. |
| `lessons_learned` | json | many | Learnings. |
| `action_items` | json | many | Follow-ups. |
| `significant_discoveries` | json | many | Course Correction triggers. |
| `next_recommended_work_units` | work_unit_reference | many | Course Correction if needed. |

### Artifact slots
| Artifact | Required | Purpose |
|---|---:|---|
| `RETROSPECTIVE_REPORT` | yes | Canonical retrospective. |

---

## 12. Course Correction

### User purpose
Handle significant change during implementation, analyze cross-artifact impact, and produce approved change proposals that refine affected completed work units.

### MVP modeling decision
- Course Correction is a standalone work unit because it analyzes cross-work-unit impact and creates an auditable correction proposal.
- Course Correction does **not** directly force affected work units through transitions.
- Course Correction determines affected work units/artifacts, updates or commits affected artifact versions where approved, and writes artifact impact metadata.
- Chiron then evaluates artifact freshness through artifact dependency guards, especially the `is_fresh` condition operator.
- Affected work units expose their own refinement/revalidation transitions when required artifacts are stale.

### Artifact freshness mechanism
1. Course Correction identifies affected artifacts:
   - `PRD`
   - `UX_DESIGN_SPECIFICATION`
   - `ARCHITECTURE_DOCUMENT`
   - Backlog `EPICS_AND_STORIES`
   - Backlog `READINESS_REPORT`
   - Backlog `SPRINT_STATUS`
   - Story `STORY_DOCUMENT`
   - Story `CODE_CHANGE_FILESET`
   - Story `TEST_DOCUMENT`
2. Course Correction creates `SPRINT_CHANGE_PROPOSAL` and approved artifact update set.
3. Approved artifact changes are committed as new artifact versions/references.
4. Chiron evaluates work-unit transition guards using `is_fresh` against declared artifact dependencies.
5. If a work unit's source artifact is stale, Chiron exposes that work unit's local refinement transition.
6. The affected work unit owns its own update/revalidation workflow.

### States
| State | Meaning |
|---|---|
| `done` | Sprint Change Proposal exists and affected work units have recommended refinement routes. |

### Transitions
| Transition | From | To | Workflow |
|---|---|---|---|
| `activation_to_done` | activation | `done` | `correct_course` |
| `done_to_done_update_course_correction` | `done` | `done` | `update_course_correction` |

### Workflow: `correct_course`
| Step | Type | Purpose |
|---|---|---|
| `course_correction_initialize_agent` | `agent` | Confirm trigger and collect core docs. |
| `change_analysis_checklist_agent` | `agent` | Run 6-section BMAD checklist. |
| `specific_change_proposals_agent` | `agent` | Draft explicit old→new edits per artifact. |
| `sprint_change_proposal_agent` | `agent` | Produce proposal artifact. |
| `route_implementation_agent` | `agent` | Classify minor/moderate/major and route affected work units. |
| `propagate_course_correction_outputs` | `action` | Persist proposal and affected refs. |

### Facts
| Fact | Type | Cardinality | Notes |
|---|---|---:|---|
| `trigger_summary` | string | one | What changed. |
| `trigger_source_work_unit` | work_unit_reference | one | Story/Retrospective/User request source. |
| `affected_work_units` | work_unit_reference | many | PRD/UX/Architecture/Backlog/Story/etc. |
| `affected_artifacts` | json | many | Artifact slots/instances expected to change or become stale. |
| `artifact_update_set` | json | one | Approved artifact version updates/commit references. |
| `impact_analysis` | json | one | Epic/story/artifact/technical impact. |
| `recommended_path` | string | one | direct_adjustment / rollback / mvp_review / replan. |
| `change_proposals` | json | many | Before/after edit proposals. |
| `handoff_plan` | json | one | Recipients and success criteria. |
| `next_recommended_work_units` | work_unit_reference | many | Refinement targets exposed through stale-artifact guards. |

### Artifact slots
| Artifact | Required | Purpose |
|---|---:|---|
| `SPRINT_CHANGE_PROPOSAL` | yes | Canonical Course Correction proposal. |

---

# Same-State Refinement Model (`done → done`)

## Work-unit existence condition operators
- Existing reference checks answer: “is this workflow context fact/work-unit reference attached?”
- The seed also needs project-level existence condition operators that answer whether the project has work-unit instances independent of whether a specific reference fact is attached.
- These operators must be supported in both:
  - transition gate condition evaluation
  - branch condition evaluation

### Operator: `work_unit_instance_exists`
```ts
{
  operator: "work_unit_instance_exists";
  workUnitTypeKey: string;
  minCount?: number; // default 1
}
```

### Operator: `work_unit_instance_exists_in_state`
```ts
{
  operator: "work_unit_instance_exists_in_state";
  workUnitTypeKey: string;
  stateKeys: string[];
  minCount?: number; // default 1
}
```

### Retrospective use
- Guidance can show Retrospective when:
  - `work_unit_instance_exists_in_state({ workUnitTypeKey: "story", stateKeys: ["done"], minCount: 1 })`
- The Retrospective workflow still uses `source_story_work_units` as a `work_unit_reference_fact` with cardinality `many`.
- That many-ref fact is populated by `retro_story_set_selection_agent`, where agent and user select the actual story set.

## Why same-state transitions
Completed planning work units should remain completed objects. A correction does not necessarily mean “undone”; it means the completed artifact/facts are revised, superseded, and revalidated. Therefore refinement should generally be modeled as a transition from `done` to `done`.

## Refinement transition pattern
| Work unit | Transition | Workflow | Reads | Writes |
|---|---|---|---|---|
| PRD | `done_to_done_refine_prd` | `refine_prd_from_stale_artifacts` | stale `PRD` dependency / `SPRINT_CHANGE_PROPOSAL` | refreshed PRD facts/artifact |
| UX Design | `done_to_done_refine_ux_design` | `refine_ux_design_from_stale_artifacts` | stale UX dependency / proposal | refreshed UX facts/artifact |
| Architecture | `done_to_done_refine_architecture` | `refine_architecture_from_stale_artifacts` | stale Architecture dependency / proposal | refreshed architecture facts/artifact |
| Backlog | `draft_to_draft` or active refinement transition | `refine_backlog_from_stale_artifacts` | stale PRD/UX/Architecture/Backlog artifacts | regenerated inventory/status |
| Story | `done_to_done_refine_story` | `refine_story_from_stale_artifacts` | stale story/backlog/code/test artifacts | revised story facts/artifacts/status |
| Backlog | `draft_to_readiness_review` | `check_implementation_readiness` | refreshed upstream artifacts/current backlog draft | new Backlog-owned readiness report/facts |

## Active-state correction pattern
| Work unit | Transition | Workflow | Use case |
|---|---|---|---|
| Backlog | `active_to_active_refine_backlog` | `refine_active_backlog_from_change_proposal` | Working set changes while stories are running. |
| Story | `review_to_in_progress` | `code_review` | Review requires fixes. |
| Story | `in_progress_to_in_progress_correct_story` | `correct_active_story` | Implementation discovers scoped correction without full replanning. |

## Propagation rule
Course Correction itself does not silently force PRD/UX/Architecture/Backlog/Story states. It produces `SPRINT_CHANGE_PROPOSAL`, affected artifact metadata, and approved artifact update versions/commits. Chiron evaluates `is_fresh` guards on affected work units; each affected work unit then runs its own refinement/revalidation workflow, preserving local ownership and audit trail.

---

# MVP Implementation Notes

## Seed button scope
The in-app BMAD seed button should seed:
- work units listed above except deferred standalone Epic, standalone Sprint Plan, and standalone Implementation Readiness
- transitions including same-state refinement transitions
- workflows and step skeletons
- fact definitions and artifact slots
- initial BMAD methodology/project setup data

## Do not implement now
- Graph-native Epic work unit behavior.
- Global/arbitrary dereferenced referenced-work-unit graph traversal.
- Living draft specs for existing work-unit instances.
- Docs/survey rewrite.

## Must include now
- Combined Backlog + sprint planning/status flow.
- Story cycle through code review.
- Course Correction artifact and affected work-unit refinement routes.
- Backlog readiness gate / recheck after correction.
- Product Brief agent read access for explicitly referenced Brainstorming/Research work units: metadata, active facts, and artifact file paths.
- MCP/read-model refactor: expand `read_context_fact_instances` for `work_unit_reference_fact` and work-unit-reference bound facts so agents can inspect explicitly referenced work-unit facts/artifacts safely.
