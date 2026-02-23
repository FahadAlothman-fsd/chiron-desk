# BMAD -> Chiron Step Config Stubs v1 (All Workflows)

Date: 2026-02-18
Status: Draft, implementation-ready mapping scaffold
Source list: `_bmad/_config/workflow-manifest.csv`

## Global defaults

- Start gate checks: transition exists, required context refs present, policy/facts satisfied.
- Completion gate checks: required typed outputs exist (+ required links/approvals if configured).
- IDs: `phase.verb.noun`.
- Variable prefixes: `inputs.*`, `draft.*`, `review.*`, `fanout.*`, `artifact.*`.
- Agent defaults: planning/analysis via `chiron`; code/test/file mutation via `opencode`.
- Step-level rule: every step config implicitly carries `context.workUnitRef` from workflow-level `workUnitRef` (used by gates, auditing, and invoke binding).

## Canonical Work Unit References

Use these IDs consistently in workflow and step configs.

- `WU.SETUP` -> project setup/bootstrap
- `WU.BRAINSTORMING` -> brainstorming sessions and idea capture
- `WU.FACILITATION_SESSION` -> party-mode/group facilitation
- `WU.PRODUCT_BRIEF` -> product brief artifacts
- `WU.RESEARCH` -> domain/market/technical research artifacts
- `WU.PRD` -> PRD lifecycle
- `WU.UX_DESIGN` -> UX/design artifacts
- `WU.IMPLEMENTATION_READINESS` -> readiness validation artifacts
- `WU.ARCHITECTURE` -> architecture artifacts
- `WU.BACKLOG` -> epics/stories planning artifacts
- `WU.STORY` -> implementation unit for dev/review/merge
- `WU.CHANGE_PROPOSAL` -> correct-course proposals
- `WU.RETROSPECTIVE` -> retrospective artifacts
- `WU.SPRINT_PLAN` -> sprint planning/status artifacts
- `WU.TECH_SPEC` -> quick-spec artifacts
- `WU.PROJECT_CONTEXT` -> project context/docs artifacts
- `WU.TEST_AUTOMATION` -> automation/test generation artifacts
- `WU.TEST_ARCHITECTURE` -> ATDD/test architecture artifacts
- `WU.CI_QUALITY` -> CI quality pipeline artifacts
- `WU.TEST_FRAMEWORK` -> test framework setup artifacts
- `WU.NFR_ASSESSMENT` -> NFR assessment artifacts
- `WU.LEARNING_TRACK` -> multi-session testing education artifacts
- `WU.TEST_DESIGN` -> test design plans
- `WU.TEST_REVIEW` -> test quality review artifacts
- `WU.TEST_TRACEABILITY` -> traceability matrix artifacts
- `WU.DESIGN_FACILITATION` -> CIS design-thinking artifacts
- `WU.STRATEGY_FACILITATION` -> CIS innovation strategy artifacts
- `WU.PROBLEM_SOLVING` -> CIS problem-solving artifacts
- `WU.STORYTELLING` -> CIS storytelling artifacts

## Blueprint macros used

- `F_INTAKE`: `form` gather context/goals/refs.
- `A_DISCOVER`: `action` load/discover files/artifacts/project context.
- `G_ANALYZE`: `agent` analysis/synthesis.
- `G_GENERATE`: `agent` artifact generation.
- `G_VALIDATE`: `agent` adversarial validation/review.
- `B_ROUTE`: `branch` deterministic route by mode/decision.
- `I_FANOUT_SAME`: `invoke` same work unit fan-out.
- `I_FANOUT_CHILD`: `invoke` child work units fan-out.
- `A_PERSIST`: `action` snapshot/artifact persistence.
- `D_SUMMARY`: `display` outcomes/next actions.

---

## CHIRON SETUP (Pre-BMAD, but required)

### setup-project

```yaml
workUnitType: setup
workUnitRef: WU.SETUP
transition: __absent__->done
steps:
  - id: setup.init
    type: action
    actions: [project.create, config.load, methodology.pin]
    outputVariables: [setup.project_ref, setup.methodology_version]
  - id: setup.discover
    type: action
    actions: [repo.scan, docs.discover]
    outputVariables: [setup.repo_context]
  - id: setup.confirm
    type: display
```

---

## CORE

### brainstorming

```yaml
workUnitType: brainstorming
workUnitRef: WU.BRAINSTORMING
transition: draft->done
steps:
  - id: session.intake
    type: agent
    agentKind: chiron
    agentId: cis-brainstorming-coach
    initialPrompt: Collect session objective, constraints, and desired depth from user.
    tools:
      - name: capture_intake
        toolType: update-variable
        targetVariable: inputs.intake
      - name: select_techniques
        toolType: ax-generation
        targetVariable: fanout.selected_workflow_ids
    completionConditions:
      - type: all-variables-set
        requiredVariables: [inputs.intake, fanout.selected_workflow_ids]
  - id: techniques.run
    type: invoke
    bindingMode: same_work_unit
    forEach: { itemsVar: fanout.selected_workflow_ids, itemVar: fanout.item }
    workflowRef: { key: "{{fanout.item}}" }
    executionMode: parallel
    concurrency: 3
    output: { mode: namespace, target: fanout.children }
    onChildError: continue
  - id: ideas.converge
    type: agent
    agentKind: chiron
    agentId: cis-brainstorming-coach
    initialPrompt: consolidate fanout outputs
    tools:
      - name: update_idea_summary
        toolType: update-variable
        targetVariable: draft.markdown
  - id: persist.artifact
    type: action
    actions: [snapshot.capture, artifact.record]
    outputVariables: [artifact.ref, artifact.snapshot]
  - id: done.show
    type: display
```

### party-mode

```yaml
workUnitType: facilitation-session
workUnitRef: WU.FACILITATION_SESSION
transition: draft->done
steps:
  - id: inputs.collect
    type: form
    fields: [topic, invited_agents]
  - id: run.panel
    type: agent
    agentKind: chiron
    agentId: bmad-master
    tools: [panel_discussion]
    outputVariables: [draft.summary, draft.decisions]
  - id: route.followup
    type: branch
    branches: [continue, conclude]
  - id: done.show
    type: display
```

---

## BMM

### create-product-brief

```yaml
workUnitType: product-brief
workUnitRef: WU.PRODUCT_BRIEF
transition: draft->done
steps: [F_INTAKE, G_ANALYZE, G_GENERATE, A_PERSIST, D_SUMMARY]
requiredOutputs: [artifact_ref]
```

### domain-research

```yaml
workUnitType: research
workUnitRef: WU.RESEARCH
transition: draft->done
steps: [F_INTAKE, G_ANALYZE, G_GENERATE, A_PERSIST, D_SUMMARY]
requiredOutputs: [artifact_ref]
```

### market-research

```yaml
workUnitType: research
workUnitRef: WU.RESEARCH
transition: draft->done
steps: [F_INTAKE, G_ANALYZE, G_GENERATE, A_PERSIST, D_SUMMARY]
requiredOutputs: [artifact_ref]
```

### technical-research

```yaml
workUnitType: research
workUnitRef: WU.RESEARCH
transition: draft->done
steps: [F_INTAKE, G_ANALYZE, G_GENERATE, A_PERSIST, D_SUMMARY]
requiredOutputs: [artifact_ref]
```

### create-prd

```yaml
workUnitType: prd
workUnitRef: WU.PRD
transition: draft->done
steps: [F_INTAKE, A_DISCOVER, G_ANALYZE, G_GENERATE, A_PERSIST, D_SUMMARY]
requiredOutputs: [artifact_ref]
```

### edit-prd

```yaml
workUnitType: prd
workUnitRef: WU.PRD
transition: done->review
steps: [F_INTAKE, A_DISCOVER, G_ANALYZE, G_GENERATE, A_PERSIST, D_SUMMARY]
requiredOutputs: [artifact_ref, review_report_ref]
```

### validate-prd

```yaml
workUnitType: prd
workUnitRef: WU.PRD
transition: done->review
steps: [F_INTAKE, A_DISCOVER, G_VALIDATE, A_PERSIST, D_SUMMARY]
requiredOutputs: [review_report_ref]
```

### create-ux-design

```yaml
workUnitType: ux-design
workUnitRef: WU.UX_DESIGN
transition: draft->done
steps: [F_INTAKE, A_DISCOVER, G_ANALYZE, G_GENERATE, A_PERSIST, D_SUMMARY]
requiredOutputs: [artifact_ref]
```

### check-implementation-readiness

```yaml
workUnitType: implementation-readiness
workUnitRef: WU.IMPLEMENTATION_READINESS
transition: draft->done
steps: [A_DISCOVER, G_VALIDATE, B_ROUTE, A_PERSIST, D_SUMMARY]
requiredOutputs: [review_report_ref]
```

### create-architecture

```yaml
workUnitType: architecture
workUnitRef: WU.ARCHITECTURE
transition: draft->done
steps: [F_INTAKE, A_DISCOVER, G_ANALYZE, G_GENERATE, A_PERSIST, D_SUMMARY]
requiredOutputs: [artifact_ref]
```

### create-epics-and-stories

```yaml
workUnitType: backlog
workUnitRef: WU.BACKLOG
transition: draft->done
steps:
  - F_INTAKE
  - A_DISCOVER
  - G_GENERATE # produces draft.epics + draft.story_items
  - I_FANOUT_CHILD # optional for direct story materialization
  - A_PERSIST
  - D_SUMMARY
fanout:
  bindingMode: child_work_units
  childWorkUnitTypeKey: story
  activationTransitionKey: activate
requiredOutputs: [artifact_ref]
```

### code-review

```yaml
workUnitType: story
workUnitRef: WU.STORY
transition: review->review
steps: [F_INTAKE, A_DISCOVER, G_VALIDATE, B_ROUTE, A_PERSIST, D_SUMMARY]
requiredOutputs: [review_report_ref]
```

### correct-course

```yaml
workUnitType: change-proposal
workUnitRef: WU.CHANGE_PROPOSAL
transition: draft->done
steps: [F_INTAKE, A_DISCOVER, G_VALIDATE, B_ROUTE, A_PERSIST, D_SUMMARY]
requiredOutputs: [artifact_ref, review_report_ref]
```

### create-story

```yaml
workUnitType: story
workUnitRef: WU.STORY
transition: __absent__->draft
steps: [A_DISCOVER, G_ANALYZE, G_GENERATE, A_PERSIST, D_SUMMARY]
requiredOutputs: [artifact_ref]
```

### dev-story

```yaml
workUnitType: story
workUnitRef: WU.STORY
transition: ready->review
steps:
  - id: context.load
    type: action
  - id: implement.run
    type: agent
    agentKind: opencode
    agentId: bmm-dev
    outputVariables: [review.diff_summary, review.code_refs]
  - id: tests.run
    type: action
    outputVariables: [review.tests_passing, review.test_report]
  - id: validate.story
    type: agent
    agentKind: chiron
    agentId: bmm-qa
    outputVariables: [review.readiness]
  - id: persist.result
    type: action
  - id: done.show
    type: display
requiredOutputs: [code_change_ref, test_report_ref]
```

### retrospective

```yaml
workUnitType: retrospective
workUnitRef: WU.RETROSPECTIVE
transition: draft->done
steps: [F_INTAKE, A_DISCOVER, G_ANALYZE, G_GENERATE, A_PERSIST, D_SUMMARY]
requiredOutputs: [artifact_ref]
```

### sprint-planning

```yaml
workUnitType: sprint-plan
workUnitRef: WU.SPRINT_PLAN
transition: draft->done
steps: [A_DISCOVER, G_ANALYZE, A_PERSIST, D_SUMMARY]
requiredOutputs: [artifact_ref]
```

### sprint-status

```yaml
workUnitType: sprint-plan
workUnitRef: WU.SPRINT_PLAN
transition: done->done
steps: [A_DISCOVER, G_ANALYZE, B_ROUTE, D_SUMMARY]
requiredOutputs: [analysis_ref]
```

### quick-dev

```yaml
workUnitType: story
workUnitRef: WU.STORY
transition: ready->review
steps: [F_INTAKE, A_DISCOVER, B_ROUTE, G_GENERATE, G_VALIDATE, A_PERSIST, D_SUMMARY]
requiredOutputs: [code_change_ref, test_report_ref]
```

### quick-spec

```yaml
workUnitType: tech-spec
workUnitRef: WU.TECH_SPEC
transition: draft->done
steps: [F_INTAKE, A_DISCOVER, G_ANALYZE, G_GENERATE, A_PERSIST, D_SUMMARY]
requiredOutputs: [artifact_ref]
```

### document-project

```yaml
workUnitType: project-context
workUnitRef: WU.PROJECT_CONTEXT
transition: draft->done
steps: [F_INTAKE, A_DISCOVER, B_ROUTE, I_FANOUT_SAME, A_PERSIST, D_SUMMARY]
requiredOutputs: [artifact_ref]
```

### generate-project-context

```yaml
workUnitType: project-context
workUnitRef: WU.PROJECT_CONTEXT
transition: draft->done
steps: [A_DISCOVER, G_ANALYZE, G_GENERATE, A_PERSIST, D_SUMMARY]
requiredOutputs: [artifact_ref]
```

### qa-automate

```yaml
workUnitType: test-automation
workUnitRef: WU.TEST_AUTOMATION
transition: draft->done
steps: [F_INTAKE, A_DISCOVER, G_ANALYZE, G_GENERATE, A_PERSIST, D_SUMMARY]
requiredOutputs: [test_report_ref]
```

---

## TEA

### testarch-atdd

```yaml
workUnitType: test-architecture
workUnitRef: WU.TEST_ARCHITECTURE
transition: draft->done
steps: [F_INTAKE, A_DISCOVER, G_ANALYZE, G_GENERATE, A_PERSIST, D_SUMMARY]
requiredOutputs: [test_report_ref]
```

### testarch-automate

```yaml
workUnitType: test-automation
workUnitRef: WU.TEST_AUTOMATION
transition: draft->done
steps: [A_DISCOVER, G_ANALYZE, G_GENERATE, A_PERSIST, D_SUMMARY]
requiredOutputs: [test_report_ref]
```

### testarch-ci

```yaml
workUnitType: ci-quality
workUnitRef: WU.CI_QUALITY
transition: draft->done
steps: [F_INTAKE, A_DISCOVER, G_ANALYZE, G_GENERATE, A_PERSIST, D_SUMMARY]
requiredOutputs: [artifact_ref]
```

### testarch-framework

```yaml
workUnitType: test-framework
workUnitRef: WU.TEST_FRAMEWORK
transition: draft->done
steps: [F_INTAKE, A_DISCOVER, B_ROUTE, G_GENERATE, A_PERSIST, D_SUMMARY]
requiredOutputs: [artifact_ref]
```

### testarch-nfr

```yaml
workUnitType: nfr-assessment
workUnitRef: WU.NFR_ASSESSMENT
transition: draft->done
steps: [A_DISCOVER, G_ANALYZE, G_VALIDATE, A_PERSIST, D_SUMMARY]
requiredOutputs: [review_report_ref]
```

### teach-me-testing

```yaml
workUnitType: learning-track
workUnitRef: WU.LEARNING_TRACK
transition: draft->done
steps: [F_INTAKE, G_ANALYZE, B_ROUTE, I_FANOUT_SAME, D_SUMMARY]
requiredOutputs: [artifact_ref]
```

### testarch-test-design

```yaml
workUnitType: test-design
workUnitRef: WU.TEST_DESIGN
transition: draft->done
steps: [F_INTAKE, A_DISCOVER, B_ROUTE, G_GENERATE, A_PERSIST, D_SUMMARY]
requiredOutputs: [artifact_ref]
```

### testarch-test-review

```yaml
workUnitType: test-review
workUnitRef: WU.TEST_REVIEW
transition: draft->done
steps: [A_DISCOVER, G_VALIDATE, A_PERSIST, D_SUMMARY]
requiredOutputs: [review_report_ref]
```

### testarch-trace

```yaml
workUnitType: test-traceability
workUnitRef: WU.TEST_TRACEABILITY
transition: draft->done
steps: [A_DISCOVER, G_ANALYZE, G_VALIDATE, B_ROUTE, A_PERSIST, D_SUMMARY]
requiredOutputs: [review_report_ref, artifact_ref]
```

---

## CIS

### design-thinking

```yaml
workUnitType: design-facilitation
workUnitRef: WU.DESIGN_FACILITATION
transition: draft->done
steps: [F_INTAKE, G_ANALYZE, I_FANOUT_SAME, G_GENERATE, A_PERSIST, D_SUMMARY]
requiredOutputs: [artifact_ref]
```

### innovation-strategy

```yaml
workUnitType: strategy-facilitation
workUnitRef: WU.STRATEGY_FACILITATION
transition: draft->done
steps: [F_INTAKE, G_ANALYZE, I_FANOUT_SAME, G_GENERATE, A_PERSIST, D_SUMMARY]
requiredOutputs: [artifact_ref]
```

### problem-solving

```yaml
workUnitType: problem-solving
workUnitRef: WU.PROBLEM_SOLVING
transition: draft->done
steps: [F_INTAKE, G_ANALYZE, I_FANOUT_SAME, G_GENERATE, A_PERSIST, D_SUMMARY]
requiredOutputs: [artifact_ref]
```

### storytelling

```yaml
workUnitType: storytelling
workUnitRef: WU.STORYTELLING
transition: draft->done
steps: [F_INTAKE, G_ANALYZE, B_ROUTE, G_GENERATE, A_PERSIST, D_SUMMARY]
requiredOutputs: [artifact_ref]
```

---

## Seed constraints to keep this tractable

- Max steps per workflow: 10 (exception only if justified).
- Max invoke depth: 2.
- Default invoke concurrency: 3.
- Completion gate required output keys: cap at 8 per transition.
- `transition_allowed_workflows` is the selection authority; no static workflow kind permissions.
