# BMAD Full Prototype Config (Captured)

Date: 2026-02-17  
Status: Prototype/Wireframe (not final v1 schema)  
Intent: Preserve the full methodology + workflow-step configuration example for comparison against locked workflow-engine contracts in `docs/architecture/workflow-engine/`.

## 1) Methodology Definition Prototype

```yaml
methodology:
  key: "bmad"
  version: "1.0.0"
  name: "BMAD"
  description: "Brainstorm -> Plan -> Solution -> Implement with optional tracks"
  guidance:
    user_long: >
      BMAD starts by establishing project context, then builds planning artifacts,
      then executes stories in controlled cycles with review and QA.
    agent_long: >
      Prefer deterministic transitions. Use optional analysis only when it materially
      improves downstream artifacts. Minimize user interruption after setup.

  status_ledger:
    - { key: "draft", meaning_short: "Not finalized", meaning_long: "Work exists but incomplete", category: "active" }
    - { key: "ready", meaning_short: "Ready to start", meaning_long: "Gates satisfied for execution", category: "active" }
    - { key: "in_progress", meaning_short: "Under execution", meaning_long: "Implementation or drafting in flight", category: "active" }
    - { key: "review", meaning_short: "Under review", meaning_long: "Awaiting review/test validation", category: "active" }
    - { key: "ready_to_merge", meaning_short: "Approved, pending merge", meaning_long: "All quality gates met; merge/deploy step remains", category: "active" }
    - { key: "done", meaning_short: "Completed", meaning_long: "Workflow complete and accepted", category: "terminal" }
    - { key: "blocked", meaning_short: "Blocked", meaning_long: "Cannot continue due to unsatisfied hard dependency", category: "active" }
    - { key: "archived", meaning_short: "Archived", meaning_long: "No longer active", category: "terminal" }

  link_type_ledger:
    - { key: "parent", allowed_strengths: ["hard"] }
    - { key: "depends_on", allowed_strengths: ["hard", "soft", "context"] }
    - { key: "informed_by", allowed_strengths: ["soft", "context"] }
    - { key: "blocks", allowed_strengths: ["hard", "soft"] }
    - { key: "relates_to", allowed_strengths: ["context"] }

  artifact_type_ledger:
    - { key: "artifact_ref", description: "File or bundle artifact pointer" }
    - { key: "code_change_ref", description: "Git-backed changed-files + commit/worktree pointer" }
    - { key: "test_report_ref", description: "Test/report artifact pointer" }
    - { key: "review_report_ref", description: "Review findings artifact pointer" }

  project_facts:
    reserved_fields:
      - "project.id"
      - "project.name"
      - "project.repoRef"
      - "project.createdAt"
      - "project.ownerUserId"
    method_facts:
      - { key: "projectKind", type: "enum", values: ["unknown", "greenfield", "brownfield"] }
      - { key: "track", type: "enum", values: ["default", "quick_flow"] }
      - { key: "riskMode", type: "enum", values: ["normal", "strict"] }

  dependency_policy_defaults:
    hard_blocks: true
    soft_warns: true
    context_ignored_for_blocking: true

  impact_policy:
    unchanged_digest: "no_propagation"
    changed_digest:
      strong_link: "stale_overlay"
      weak_link: "suspect_overlay"
    overlay_to_transition_mapping:
      - if_overlay: "stale_overlay"
        if_state_in: ["review", "ready_to_merge"]
        suggested_transition: "rebase_or_revalidate"
    auto_status_change: false

  work_unit_types:
    - key: "bmad.setup"
      cardinality: "one_per_project"
      guidance:
        unit_long: "Initial project setup and track selection."
      states: ["draft", "done"]
      activation:
        from: "__absent__"
        to: "draft"
        guard: { kind: "always" }
        workflows: ["bmad.setup-project"]
        guidance_long: "Always create setup first."
      slots:
        - key: "setup.snapshot"
          value_type: "artifact_ref"
          head_mode: "single_head"
          history_mode: "append_only"
          attachments_policy: "allow"
          template_binding: null
          guidance_long: "Stores setup decisions and initialized facts."
      transitions:
        - key: "complete_setup"
          from: "draft"
          to: "done"
          workflows: ["bmad.setup-project"]
          guidance_long: "Finish setup once project facts are established."
          gates:
            requires_slots: ["setup.snapshot"]
            requires_project_facts:
              - { key: "projectKind", op: "in", values: ["greenfield", "brownfield"] }

    - key: "bmad.project_context"
      cardinality: "one_per_project"
      guidance:
        unit_long: "Captured understanding of existing project context (brownfield)."
      states: ["draft", "done"]
      activation:
        from: "__absent__"
        to: "draft"
        guard:
          kind: "expr"
          expr: "project.projectKind == 'brownfield' && project.repoRef != null"
        workflows: ["bmad.document-project"]
      slots:
        - key: "context.snapshot"
          value_type: "artifact_ref"
          head_mode: "single_head"
          history_mode: "append_only"
          attachments_policy: "allow"
      transitions:
        - key: "publish_context"
          from: "draft"
          to: "done"
          workflows: ["bmad.document-project"]
          gates:
            requires_slots: ["context.snapshot"]

    - key: "bmad.research"
      cardinality: "many"
      guidance:
        unit_long: "Optional research units for market/domain/technical research."
      states: ["draft", "done", "archived"]
      activation:
        from: "__absent__"
        to: "draft"
        guard: { kind: "always" }
        workflows: ["bmad.market-research", "bmad.domain-research", "bmad.technical-research"]
      metadata_schema:
        required_fields:
          - key: "researchKind"
            type: "enum"
            values: ["market", "domain", "technical"]
      slots:
        - key: "research.snapshot"
          value_type: "artifact_ref"
          head_mode: "single_head"
          history_mode: "append_only"
          attachments_policy: "allow"
      transitions:
        - key: "publish_research"
          from: "draft"
          to: "done"
          workflows: ["bmad.market-research", "bmad.domain-research", "bmad.technical-research"]
          gates:
            requires_slots: ["research.snapshot"]

    - key: "bmad.product_brief"
      cardinality: "one_per_project"
      states: ["draft", "review", "done"]
      activation:
        from: "__absent__"
        to: "draft"
        guard: { kind: "always" }
        workflows: ["bmad.create-product-brief"]
      slots:
        - key: "brief.snapshot"
          value_type: "artifact_ref"
          head_mode: "single_head"
          history_mode: "append_only"
          attachments_policy: "allow"
      transitions:
        - key: "submit_brief_review"
          from: "draft"
          to: "review"
          workflows: ["bmad.create-product-brief"]
          gates: { requires_slots: ["brief.snapshot"] }
        - key: "publish_brief"
          from: "review"
          to: "done"
          workflows: ["bmad.create-product-brief"]
          gates: { requires_slots: ["brief.snapshot"] }

    - key: "bmad.prd"
      cardinality: "one_per_project"
      guidance:
        unit_long: "Canonical product requirements baseline."
      states: ["draft", "review", "done", "blocked"]
      activation:
        from: "__absent__"
        to: "draft"
        guard: { kind: "always" }
        workflows: ["bmad.create-prd"]
      slots:
        - key: "prd.snapshot"
          value_type: "artifact_ref"
          head_mode: "single_head"
          history_mode: "append_only"
          attachments_policy: "allow"
          template_binding:
            templateKey: "bmad/prd"
            templateVersion: "v1"
            mode: "primary"
        - key: "prd.validation_report"
          value_type: "review_report_ref"
          head_mode: "single_head"
          history_mode: "append_only"
          attachments_policy: "allow"
      link_constraints:
        incoming:
          - { link: "informed_by", source_types: ["bmad.research", "bmad.product_brief", "bmad.project_context"], strengths: ["soft", "context"] }
      transitions:
        - key: "submit_prd_review"
          from: "draft"
          to: "review"
          workflows: ["bmad.create-prd", "bmad.edit-prd"]
          guidance_long: "Move to review when PRD snapshot is ready."
          gates:
            requires_slots: ["prd.snapshot"]
        - key: "publish_prd"
          from: "review"
          to: "done"
          workflows: ["bmad.validate-prd", "bmad.edit-prd"]
          guidance_long: "Publish after validation report is acceptable."
          gates:
            requires_slots: ["prd.snapshot", "prd.validation_report"]
            requires_links:
              - { relation: "informed_by", min_count: 0, strength: "soft" }
            dependency_policy:
              hard_blocks: true
              soft_warns: true
        - key: "reopen_prd"
          from: "done"
          to: "draft"
          workflows: ["bmad.correct-course", "bmad.edit-prd"]
          gates: {}

    - key: "bmad.architecture"
      cardinality: "one_per_project"
      states: ["draft", "review", "done", "blocked"]
      activation:
        from: "__absent__"
        to: "draft"
        guard:
          kind: "expr"
          expr: "exists('bmad.prd', status='done')"
        workflows: ["bmad.create-architecture"]
      slots:
        - key: "architecture.snapshot"
          value_type: "artifact_ref"
          head_mode: "single_head"
          history_mode: "append_only"
          attachments_policy: "allow"
          template_binding:
            templateKey: "bmad/architecture"
            templateVersion: "v1"
            mode: "primary"
        - key: "architecture.supporting"
          value_type: "artifact_ref"
          head_mode: "multi_head"
          history_mode: "append_only"
          attachments_policy: "allow"
      transitions:
        - key: "submit_arch_review"
          from: "draft"
          to: "review"
          workflows: ["bmad.create-architecture"]
          gates:
            requires_slots: ["architecture.snapshot"]
        - key: "publish_architecture"
          from: "review"
          to: "done"
          workflows: ["bmad.create-architecture", "bmad.correct-course"]
          gates:
            requires_slots: ["architecture.snapshot"]
        - key: "reopen_architecture"
          from: "done"
          to: "draft"
          workflows: ["bmad.correct-course"]
          gates: {}

    - key: "bmad.epic"
      cardinality: "many"
      states: ["draft", "ready", "in_progress", "done", "blocked", "archived"]
      activation:
        from: "__absent__"
        to: "draft"
        guard:
          kind: "expr"
          expr: "exists('bmad.prd', status='done') && exists('bmad.architecture', status='done')"
        workflows: ["bmad.create-epics-and-stories", "bmad.correct-course"]
      slots:
        - key: "epic.spec"
          value_type: "artifact_ref"
          head_mode: "single_head"
          history_mode: "append_only"
      transitions:
        - key: "ready_epic"
          from: "draft"
          to: "ready"
          workflows: ["bmad.create-epics-and-stories", "bmad.correct-course"]
          gates: { requires_slots: ["epic.spec"] }
        - key: "start_epic"
          from: "ready"
          to: "in_progress"
          workflows: ["bmad.sprint-planning", "bmad.create-story"]
          gates:
            requires_links:
              - { relation: "parent", min_count: 0, strength: "hard" }
        - key: "complete_epic"
          from: "in_progress"
          to: "done"
          workflows: ["bmad.sprint-status", "bmad.retrospective"]
          gates:
            requires_project_predicate:
              expr: "all_children('bmad.story', parent=this.id, status='done')"

    - key: "bmad.story"
      cardinality: "many"
      states: ["draft", "ready", "in_progress", "review", "ready_to_merge", "done", "blocked", "archived"]
      activation:
        from: "__absent__"
        to: "draft"
        guard:
          kind: "expr"
          expr: "exists('bmad.epic')"
        workflows: ["bmad.create-story", "bmad.correct-course"]
      slots:
        - key: "story.spec"
          value_type: "artifact_ref"
          head_mode: "single_head"
          history_mode: "append_only"
          template_binding:
            templateKey: "bmad/story"
            templateVersion: "v1"
            mode: "primary"
        - key: "story.code_change"
          value_type: "code_change_ref"
          head_mode: "single_head"
          history_mode: "append_only"
        - key: "story.review_report"
          value_type: "review_report_ref"
          head_mode: "single_head"
          history_mode: "append_only"
        - key: "story.test_report"
          value_type: "test_report_ref"
          head_mode: "single_head"
          history_mode: "append_only"
        - key: "story.supporting"
          value_type: "artifact_ref"
          head_mode: "multi_head"
          history_mode: "append_only"
      link_constraints:
        incoming:
          - { link: "parent", source_types: ["bmad.epic"], strengths: ["hard"] }
          - { link: "depends_on", source_types: ["bmad.architecture", "bmad.prd"], strengths: ["hard", "soft"] }
      transitions:
        - key: "ready_story"
          from: "draft"
          to: "ready"
          workflows: ["bmad.create-story"]
          gates:
            requires_slots: ["story.spec"]
            requires_links:
              - { relation: "parent", min_count: 1, strength: "hard", target_type: "bmad.epic" }
        - key: "start_dev"
          from: "ready"
          to: "in_progress"
          workflows: ["bmad.dev-story"]
          gates:
            requires_dependency_policy:
              hard_blocks: true
              soft_warns: true
        - key: "submit_review"
          from: "in_progress"
          to: "review"
          workflows: ["bmad.dev-story"]
          gates:
            requires_slots: ["story.code_change"]
        - key: "approve_review"
          from: "review"
          to: "ready_to_merge"
          workflows: ["bmad.code-review", "bmad.qa-automate"]
          gates:
            requires_slots: ["story.review_report", "story.test_report"]
        - key: "merge_story"
          from: "ready_to_merge"
          to: "done"
          workflows: ["bmad.merge-story"]
          gates:
            requires_slots: ["story.code_change", "story.test_report"]
            requires_project_facts:
              - { key: "project.repoRef", op: "not_null" }

    - key: "bmad.change_proposal"
      cardinality: "many"
      states: ["draft", "review", "done", "archived"]
      activation:
        from: "__absent__"
        to: "draft"
        guard: { kind: "always" }
        workflows: ["bmad.correct-course"]
      slots:
        - key: "change_proposal.snapshot"
          value_type: "artifact_ref"
          head_mode: "single_head"
          history_mode: "append_only"
      transitions:
        - key: "submit_change_review"
          from: "draft"
          to: "review"
          workflows: ["bmad.correct-course"]
          gates: { requires_slots: ["change_proposal.snapshot"] }
        - key: "accept_change"
          from: "review"
          to: "done"
          workflows: ["bmad.correct-course", "bmad.apply-change-plan"]
          gates: { requires_slots: ["change_proposal.snapshot"] }
```

## 2) Workflow Registry + Step Configs Prototype

```yaml
workflows:
  - key: "bmad.setup-project"
    binds_transition: { work_unit_type: "bmad.setup", transition: "complete_setup" }
    intervention_policy:
      mode: "minimal"
      ask_user_only_when: ["required_fact_missing", "approval_required_high_risk"]
    steps:
      - id: "collect_basics"
        type: "form"
        config:
          fields:
            - { key: "projectKind", type: "enum", values: ["greenfield", "brownfield"], required: true }
            - { key: "track", type: "enum", values: ["default", "quick_flow"], required: true }
            - { key: "repoRef", type: "string", required: false, hint: "Optional now; can set later" }
      - id: "persist_facts"
        type: "action"
        config:
          action: "project.fact.set_many"
          args: { projectKind: "{{form.projectKind}}", track: "{{form.track}}", project.repoRef: "{{form.repoRef}}" }
      - id: "write_setup_snapshot"
        type: "agent"
        config:
          agent_kind: "chiron"
          objective: "Generate setup summary artifact for project initialization"
          outputs:
            - { slot: "setup.snapshot", value_type: "artifact_ref", template: "bmad/setup-summary" }
      - id: "complete_transition"
        type: "action"
        config:
          action: "work_unit.transition.apply"
          args: { transition_key: "complete_setup" }

  - key: "bmad.document-project"
    binds_transition: { work_unit_type: "bmad.project_context", transition: "publish_context" }
    steps:
      - id: "check_repo"
        type: "branch"
        config: { when: "project.repoRef != null", then: "scan_repo", else: "request_repo_or_abort" }
      - id: "request_repo_or_abort"
        type: "form"
        config:
          fields:
            - { key: "repoRef", type: "string", required: true }
      - id: "set_repo"
        type: "action"
        config:
          action: "project.field.set"
          args: { key: "project.repoRef", value: "{{form.repoRef}}" }
      - id: "scan_repo"
        type: "agent"
        config:
          agent_kind: "opencode"
          objective: "Analyze repository and produce project documentation set"
          tool_profile: "read-heavy"
          outputs:
            - { slot: "context.snapshot", value_type: "artifact_ref", template: "bmad/document-project-index" }
      - id: "publish_context"
        type: "action"
        config:
          action: "work_unit.transition.apply"
          args: { transition_key: "publish_context" }

  - key: "bmad.create-prd"
    binds_transition: { work_unit_type: "bmad.prd", transition: "submit_prd_review" }
    steps:
      - id: "gather_inputs"
        type: "agent"
        config:
          agent_kind: "chiron"
          objective: "Synthesize PRD draft from setup/context/research/brief"
          context_pins:
            strong:
              - "bmad.setup.setup.snapshot:head"
              - "bmad.project_context.context.snapshot:head?"
              - "bmad.product_brief.brief.snapshot:head?"
              - "bmad.research.research.snapshot:related?"
          outputs:
            - { slot: "prd.snapshot", value_type: "artifact_ref", template: "bmad/prd" }
      - id: "move_to_review"
        type: "action"
        config: { action: "work_unit.transition.apply", args: { transition_key: "submit_prd_review" } }

  - key: "bmad.validate-prd"
    binds_transition: { work_unit_type: "bmad.prd", transition: "publish_prd" }
    steps:
      - id: "review_prd"
        type: "agent"
        config:
          agent_kind: "chiron"
          objective: "Validate PRD against methodology quality criteria"
          outputs:
            - { slot: "prd.validation_report", value_type: "review_report_ref", template: "bmad/prd-validation-report" }
      - id: "publish_prd"
        type: "action"
        config: { action: "work_unit.transition.apply", args: { transition_key: "publish_prd" } }

  - key: "bmad.create-architecture"
    binds_transition: { work_unit_type: "bmad.architecture", transition: "submit_arch_review" }
    steps:
      - id: "derive_architecture"
        type: "agent"
        config:
          agent_kind: "chiron"
          objective: "Create architecture baseline from PRD and context"
          context_pins:
            strong:
              - "bmad.prd.prd.snapshot:head"
              - "bmad.project_context.context.snapshot:head?"
          outputs:
            - { slot: "architecture.snapshot", value_type: "artifact_ref", template: "bmad/architecture" }
      - id: "submit_arch_review"
        type: "action"
        config: { action: "work_unit.transition.apply", args: { transition_key: "submit_arch_review" } }

  - key: "bmad.create-epics-and-stories"
    binds_transition: { work_unit_type: "bmad.epic", transition: "ready_epic" }
    steps:
      - id: "generate_backlog_artifact"
        type: "agent"
        config:
          agent_kind: "chiron"
          objective: "Generate epics-and-stories baseline artifact"
          context_pins:
            strong:
              - "bmad.prd.prd.snapshot:head"
              - "bmad.architecture.architecture.snapshot:head"
          outputs:
            - { temp_key: "backlog_artifact", value_type: "artifact_ref", template: "bmad/epics-stories" }
      - id: "bulk_create_units"
        type: "action"
        config:
          action: "graph.bulk_create_from_artifact"
          args:
            artifact_ref: "{{outputs.backlog_artifact}}"
            create:
              epic_type: "bmad.epic"
              story_type: "bmad.story"
              parent_link: { relation: "parent", strength: "hard" }
              default_story_status: "draft"
              default_epic_status: "draft"
      - id: "mark_epics_ready"
        type: "action"
        config:
          action: "graph.transition_many"
          args: { type: "bmad.epic", transition_key: "ready_epic" }

  - key: "bmad.create-story"
    binds_transition: { work_unit_type: "bmad.story", transition: "ready_story" }
    steps:
      - id: "select_story_target"
        type: "action"
        config: { action: "story.pick_next", args: { policy: "first_backlog_by_epic_order" } }
      - id: "generate_story_spec"
        type: "agent"
        config:
          agent_kind: "chiron"
          objective: "Generate story spec for selected story"
          context_pins:
            strong:
              - "bmad.prd.prd.snapshot:head"
              - "bmad.architecture.architecture.snapshot:head"
          outputs:
            - { slot: "story.spec", value_type: "artifact_ref", template: "bmad/story" }
      - id: "ready_story"
        type: "action"
        config: { action: "work_unit.transition.apply", args: { transition_key: "ready_story" } }

  - key: "bmad.dev-story"
    binds_transition:
      work_unit_type: "bmad.story"
      transitions_sequence: ["start_dev", "submit_review"]
    intervention_policy:
      mode: "minimal"
      ask_user_only_when: ["tooling_approval_high_risk", "merge_conflict_unresolved"]
    steps:
      - id: "start_dev"
        type: "action"
        config: { action: "work_unit.transition.apply", args: { transition_key: "start_dev" } }
      - id: "prepare_worktree"
        type: "action"
        config: { action: "sandbox.worktree.ensure", args: { strategy: "per_execution" } }
      - id: "implement"
        type: "agent"
        config:
          agent_kind: "opencode"
          objective: "Implement story from story.spec"
          context_pins:
            strong:
              - "bmad.story.story.spec:head"
              - "bmad.architecture.architecture.snapshot:head"
          tool_profile: "code-write"
      - id: "capture_code_change"
        type: "action"
        config:
          action: "git.capture_change_ref"
          args: { slot: "story.code_change", include_changed_files: true, require_digest: true }
      - id: "run_tests"
        type: "action"
        config:
          action: "tooling.run_tests"
          args: { scope: "affected", publish_slot: "story.test_report" }
      - id: "submit_review"
        type: "action"
        config: { action: "work_unit.transition.apply", args: { transition_key: "submit_review" } }

  - key: "bmad.code-review"
    binds_transition: { work_unit_type: "bmad.story", transition: "approve_review" }
    steps:
      - id: "review_changes"
        type: "agent"
        config:
          agent_kind: "opencode"
          objective: "Adversarial code review and fix if approved"
          context_pins:
            strong:
              - "bmad.story.story.code_change:head"
              - "bmad.story.story.spec:head"
              - "bmad.architecture.architecture.snapshot:head"
          outputs:
            - { slot: "story.review_report", value_type: "review_report_ref", template: "bmad/code-review-report" }
      - id: "optional_fix_loop"
        type: "branch"
        config: { when: "review_report.has_blockers == true", then: "fix_blockers", else: "approve_review" }
      - id: "fix_blockers"
        type: "agent"
        config:
          agent_kind: "opencode"
          objective: "Apply approved blocker fixes and refresh code_change/test_report"
      - id: "approve_review"
        type: "action"
        config: { action: "work_unit.transition.apply", args: { transition_key: "approve_review" } }

  - key: "bmad.merge-story"
    binds_transition: { work_unit_type: "bmad.story", transition: "merge_story" }
    steps:
      - id: "merge_to_target"
        type: "action"
        config:
          action: "sandbox.merge_worktree"
          args: { strategy: "safe", on_conflict: "pause_and_request_user" }
      - id: "finalize_done"
        type: "action"
        config: { action: "work_unit.transition.apply", args: { transition_key: "merge_story" } }

  - key: "bmad.correct-course"
    binds_transition: { work_unit_type: "bmad.change_proposal", transition: "submit_change_review" }
    steps:
      - id: "analyze_drift"
        type: "agent"
        config:
          agent_kind: "chiron"
          objective: "Analyze drift and propose scoped change set"
          context_pins:
            strong:
              - "bmad.prd.prd.snapshot:head?"
              - "bmad.architecture.architecture.snapshot:head?"
              - "bmad.story.story.spec:impacted?"
          outputs:
            - { slot: "change_proposal.snapshot", value_type: "artifact_ref", template: "bmad/change-proposal" }
      - id: "propose_graph_mutations"
        type: "action"
        config:
          action: "graph.derive_mutation_candidates"
          args: { from_slot: "change_proposal.snapshot", output: "mutation_candidates" }
      - id: "apply_selected_mutations"
        type: "action"
        config:
          action: "graph.apply_mutations"
          args: { source: "mutation_candidates", mode: "approved_only" }
      - id: "submit_change_review"
        type: "action"
        config: { action: "work_unit.transition.apply", args: { transition_key: "submit_change_review" } }

automation_profile:
  default:
    auto_continue_on: ["action_success", "branch_resolved", "invoke_completed"]
    ask_user_only_when:
      - "required_input_missing"
      - "high_risk_tool_approval"
      - "merge_conflict_unresolved"
      - "transition_gate_failed_with_no_auto_remedy"
    auto_remediation:
      enabled: true
      max_attempts: 2
      allowed_for: ["review_blocker_fixes", "test_failures_minor"]
```

## 3) Alignment Notes vs Locked Workflow-Engine Contracts

Use these notes when converting this prototype into implementable schema:

- `form` steps: convert field `required` to `validation.required` (per `form-step-contract.md`).
- `branch` steps: replace `when: "string expr"` with Condition ADT objects (per `branch-step-contract.md`).
- `action` steps: replace single `action` field with `actions: ActionConfig[]` DAG model (per `action-step-contract.md`).
- `agent` steps: normalize `agent_kind` to `agentKind`, add `agentId`, keep completion conditions explicit (per `agent-step-contract.md`).
- continuation: where needed, add `continuityKey`/`continuityMode`/attachments (per `agent-continuation-contract.md`).
- `invoke` usage: for child orchestration, use `workflowRef`, `inputMapping`, and output capture contract (per `invoke-step-contract.md`).
- `display` is read-only and non-mutating (per `display-step-contract.md`).
- workflow paths remain guidance, not hard constraints (per `workflow-paths.md`).

This document is intentionally a wireframe capture and a comparison baseline, not a final contract.
