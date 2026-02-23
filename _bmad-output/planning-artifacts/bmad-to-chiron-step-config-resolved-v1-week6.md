# BMAD -> Chiron Step Config Resolved v1

Date: 2026-02-18
Status: Ready for seed implementation
Scope: All workflows in `_bmad/_config/workflow-manifest.csv`

## 1) Reusable Step Config Library (Concrete)

These are concrete base configs. Every workflow below references these with overrides.

### Prompt Packs (Verbose Guidance)

Use these reusable prompt packs in `systemPromptBlock` to keep BMAD-level guidance detail.

- `PROMPT.INTAKE_VERBOSE`
  - "You are running an intake and scoping pass. Ask focused questions to capture objective, constraints, target outputs, available artifacts, risk level, and success criteria. If information is missing, ask for it explicitly. Normalize answers into structured variables. Do not generate final artifacts in this step. End only when all required intake variables are set and ambiguity list is empty."
- `PROMPT.ANALYZE_VERBOSE`
  - "You are an analysis specialist. Read all provided context before concluding. Identify assumptions, gaps, conflicts, and dependencies. Produce a structured analysis with: (1) current state, (2) constraints, (3) options, (4) recommendation with rationale, (5) risks and mitigations, (6) evidence references. Avoid generic advice."
- `PROMPT.GENERATE_VERBOSE`
  - "You are generating a deliverable artifact. Follow required format and acceptance criteria strictly. Keep output actionable, concrete, and implementation-ready. Include explicit decisions, trade-offs, and next steps where relevant. If constraints conflict, state the conflict and choose the best bounded option with rationale."
- `PROMPT.VALIDATE_VERBOSE`
  - "You are performing adversarial validation. Challenge assumptions, detect missing requirements, quality risks, and inconsistencies. Return findings with severity (critical/high/medium/low), impacted sections, and exact remediation actions. Do not approve by default."
- `PROMPT.CONVERGE_VERBOSE`
  - "You are synthesizing multiple child workflow outputs. Deduplicate ideas, cluster themes, identify strongest candidates, and produce a concise ranked synthesis with rationale and unresolved questions. Preserve traceability to child outputs."
- `PROMPT.IMPLEMENT_VERBOSE`
  - "You are implementing code changes. Produce minimal, correct, testable edits aligned with acceptance criteria. Record changed files, why each change exists, and test evidence. Stop when tests and validation requirements are satisfied or when blocked with explicit blocker details."

### Output Variable Contracts

- Analysis steps should set `draft.analysis` plus optional `review.risks`.
- Generation steps should set primary artifact variable (`draft.*`) and optional `draft.decisions`.
- Validation steps should set `review.report` with severity-tagged findings.
- Convergence steps should set `draft.synthesis` and `draft.rankings`.

### CFG.FORM.INTAKE

```yaml
type: form
title: Capture Inputs
validationMode: onSubmit
fields:
  - key: objective
    type: text
    validation: { required: true, minLength: 10 }
    outputVariable: inputs.objective
  - key: constraints
    type: markdown
    validation: { required: false }
    outputVariable: inputs.constraints
  - key: mode
    type: string
    dataSource:
      kind: static
      options:
        - { label: Standard, value: standard }
        - { label: Deep, value: deep }
        - { label: Fast, value: fast }
    validation: { required: true }
    outputVariable: inputs.mode
```

### CFG.ACTION.DISCOVER

```yaml
type: action
stopOnError: true
actions:
  - id: discover.inputs
    kind: variable
    operation: set
    outputVariable: context.inputs
  - id: discover.artifacts
    kind: artifact
    operation: list
    outputVariable: context.artifacts
  - id: discover.docs
    kind: variable
    operation: set
    outputVariable: context.docs
outputVariables: [context.inputs, context.artifacts, context.docs]
```

### CFG.AGENT.INTAKE

```yaml
type: agent
agentKind: chiron
agentId: bmad-master
systemPromptBlock: "{{PROMPT.INTAKE_VERBOSE}}"
completionConditions:
  - type: all-variables-set
    requiredVariables: [inputs.objective, inputs.constraints, inputs.mode]
tools:
  - name: capture_objective
    toolType: update-variable
    targetVariable: inputs.objective
  - name: capture_constraints
    toolType: update-variable
    targetVariable: inputs.constraints
  - name: capture_mode
    toolType: update-variable
    targetVariable: inputs.mode
```

### CFG.AGENT.ANALYZE

```yaml
type: agent
agentKind: chiron
agentId: bmad-master
systemPromptBlock: "{{PROMPT.ANALYZE_VERBOSE}}"
completionConditions:
  - type: agent-done
tools:
  - name: write_analysis
    toolType: update-variable
    targetVariable: draft.analysis
```

### CFG.AGENT.GENERATE

```yaml
type: agent
agentKind: chiron
agentId: bmad-master
systemPromptBlock: "{{PROMPT.GENERATE_VERBOSE}}"
completionConditions:
  - type: agent-done
tools:
  - name: write_artifact
    toolType: update-variable
    targetVariable: draft.artifact
```

### CFG.AGENT.VALIDATE

```yaml
type: agent
agentKind: chiron
agentId: bmm-qa
systemPromptBlock: "{{PROMPT.VALIDATE_VERBOSE}}"
completionConditions:
  - type: agent-done
tools:
  - name: write_review
    toolType: update-variable
    targetVariable: review.report
```

### CFG.BRANCH.ROUTE

```yaml
type: branch
branches:
  - when: { op: equals, var: inputs.mode, value: fast }
    next: { stepId: persist.artifact }
  - when: { op: equals, var: inputs.mode, value: deep }
    next: { stepId: validate.quality }
defaultNext: { stepId: generate.draft }
```

### CFG.INVOKE.SAME

```yaml
type: invoke
bindingMode: same_work_unit
executionMode: parallel
concurrency: 3
forEach: { itemsVar: fanout.items, itemVar: fanout.item }
workflowRef: { key: "{{fanout.item}}" }
output: { mode: namespace, target: fanout.outputs }
waitForCompletion: true
onChildError: continue
```

### CFG.INVOKE.CHILD

```yaml
type: invoke
bindingMode: child_work_units
executionMode: parallel
concurrency: 3
forEach: { itemsVar: fanout.items, itemVar: fanout.item }
workflowRef: { key: "{{fanout.item.workflow}}" }
childWorkUnitTypeKey: story
activationTransitionKey: activate
output: { mode: variables, target: fanout.child_outcomes }
waitForCompletion: true
onChildError: continue
```

### CFG.ACTION.PERSIST

```yaml
type: action
stopOnError: true
actions:
  - id: snapshot.capture
    kind: snapshot
    operation: create
    outputVariable: artifact.snapshot
  - id: artifact.write
    kind: artifact
    operation: create
    outputVariable: artifact.ref
outputVariables: [artifact.ref, artifact.snapshot]
```

### CFG.DISPLAY.SUMMARY

```yaml
type: display
title: Execution Summary
content:
  blocks:
    - kind: summary
      source: draft.artifact
    - kind: findings
      source: review.report
```

## 2) Workflow Step Configs (Per Workflow)

Format: `stepId -> templateRef (+ overrides)`

### core

- brainstorming
  - `session.intake -> CFG.AGENT.INTAKE` + `agentId=cis-brainstorming-coach`, `systemPromptBlock={{PROMPT.INTAKE_VERBOSE}}`
  - `techniques.select -> CFG.AGENT.ANALYZE` + `agentId=cis-brainstorming-coach`, `tools=[select_techniques(ax-generation,target=fanout.items)]`, `completionConditions=[all-variables-set(fanout.items)]`
  - `techniques.run -> CFG.INVOKE.SAME`
  - `ideas.converge -> CFG.AGENT.GENERATE` + `agentId=cis-brainstorming-coach`, `systemPromptBlock={{PROMPT.CONVERGE_VERBOSE}}`, `targetVariable=draft.markdown`
  - `persist.artifact -> CFG.ACTION.PERSIST`
  - `done.show -> CFG.DISPLAY.SUMMARY`

- party-mode
  - `inputs.collect -> CFG.FORM.INTAKE` + `fields=[topic, invited_agents]`
  - `run.panel -> CFG.AGENT.ANALYZE` + `agentId=bmad-master`, `targetVariable=draft.decisions`
  - `route.followup -> CFG.BRANCH.ROUTE` + `branches=[continue, conclude]`
  - `done.show -> CFG.DISPLAY.SUMMARY`

### bmm.analysis

- create-product-brief
  - `inputs.collect -> CFG.FORM.INTAKE`
  - `analyze.context -> CFG.AGENT.ANALYZE`
  - `generate.brief -> CFG.AGENT.GENERATE` + `targetVariable=draft.brief`
  - `persist.artifact -> CFG.ACTION.PERSIST`
  - `done.show -> CFG.DISPLAY.SUMMARY`

- domain-research / market-research / technical-research
  - `inputs.collect -> CFG.FORM.INTAKE`
  - `analyze.context -> CFG.AGENT.ANALYZE`
  - `generate.research -> CFG.AGENT.GENERATE` + `targetVariable=draft.research`
  - `persist.artifact -> CFG.ACTION.PERSIST`
  - `done.show -> CFG.DISPLAY.SUMMARY`

### bmm.planning

- create-prd
  - `inputs.collect -> CFG.FORM.INTAKE`
  - `context.load -> CFG.ACTION.DISCOVER`
  - `analyze.requirements -> CFG.AGENT.ANALYZE`
  - `generate.prd -> CFG.AGENT.GENERATE` + `targetVariable=draft.prd`
  - `persist.artifact -> CFG.ACTION.PERSIST`
  - `done.show -> CFG.DISPLAY.SUMMARY`

- edit-prd
  - `inputs.collect -> CFG.FORM.INTAKE` + `fields include section_targets`
  - `context.load -> CFG.ACTION.DISCOVER`
  - `analyze.delta -> CFG.AGENT.ANALYZE`
  - `generate.patch -> CFG.AGENT.GENERATE` + `targetVariable=draft.prd_patch`
  - `persist.artifact -> CFG.ACTION.PERSIST`
  - `done.show -> CFG.DISPLAY.SUMMARY`

- validate-prd
  - `inputs.collect -> CFG.FORM.INTAKE`
  - `context.load -> CFG.ACTION.DISCOVER`
  - `validate.prd -> CFG.AGENT.VALIDATE` + `targetVariable=review.prd_report`
  - `persist.review -> CFG.ACTION.PERSIST`
  - `done.show -> CFG.DISPLAY.SUMMARY`

- create-ux-design
  - `inputs.collect -> CFG.FORM.INTAKE`
  - `context.load -> CFG.ACTION.DISCOVER`
  - `analyze.personas -> CFG.AGENT.ANALYZE`
  - `generate.ux -> CFG.AGENT.GENERATE` + `targetVariable=draft.ux`
  - `persist.artifact -> CFG.ACTION.PERSIST`
  - `done.show -> CFG.DISPLAY.SUMMARY`

### bmm.solutioning

- check-implementation-readiness
  - `context.load -> CFG.ACTION.DISCOVER`
  - `validate.readiness -> CFG.AGENT.VALIDATE` + `targetVariable=review.readiness`
  - `route.result -> CFG.BRANCH.ROUTE` + `branches=[ready, concerns, fail]`
  - `persist.report -> CFG.ACTION.PERSIST`
  - `done.show -> CFG.DISPLAY.SUMMARY`

- create-architecture
  - `inputs.collect -> CFG.FORM.INTAKE`
  - `context.load -> CFG.ACTION.DISCOVER`
  - `analyze.constraints -> CFG.AGENT.ANALYZE`
  - `generate.architecture -> CFG.AGENT.GENERATE` + `targetVariable=draft.architecture`
  - `persist.artifact -> CFG.ACTION.PERSIST`
  - `done.show -> CFG.DISPLAY.SUMMARY`

- create-epics-and-stories
  - `inputs.collect -> CFG.FORM.INTAKE`
  - `context.load -> CFG.ACTION.DISCOVER`
  - `generate.backlog -> CFG.AGENT.GENERATE` + `targetVariable=draft.backlog`
  - `fanout.stories -> CFG.INVOKE.CHILD` + `fanout.items=draft.story_items`
  - `persist.artifact -> CFG.ACTION.PERSIST`
  - `done.show -> CFG.DISPLAY.SUMMARY`

### bmm.implementation

- code-review
  - `inputs.collect -> CFG.FORM.INTAKE`
  - `context.load -> CFG.ACTION.DISCOVER`
  - `validate.code -> CFG.AGENT.VALIDATE` + `targetVariable=review.code_review`
  - `route.recommendation -> CFG.BRANCH.ROUTE`
  - `persist.review -> CFG.ACTION.PERSIST`
  - `done.show -> CFG.DISPLAY.SUMMARY`

- correct-course
  - `inputs.collect -> CFG.FORM.INTAKE`
  - `context.load -> CFG.ACTION.DISCOVER`
  - `validate.impact -> CFG.AGENT.VALIDATE` + `targetVariable=review.impact`
  - `route.option -> CFG.BRANCH.ROUTE` + `branches=[adjust, rollback, mvp_review]`
  - `persist.proposal -> CFG.ACTION.PERSIST`
  - `done.show -> CFG.DISPLAY.SUMMARY`

- create-story
  - `context.load -> CFG.ACTION.DISCOVER`
  - `analyze.story_context -> CFG.AGENT.ANALYZE`
  - `generate.story -> CFG.AGENT.GENERATE` + `targetVariable=draft.story`
  - `persist.artifact -> CFG.ACTION.PERSIST`
  - `done.show -> CFG.DISPLAY.SUMMARY`

- dev-story
  - `context.load -> CFG.ACTION.DISCOVER`
  - `implement.run -> CFG.AGENT.GENERATE` + `agentKind=opencode`, `agentId=bmm-dev`, `targetVariable=review.code_change`
  - `tests.run -> CFG.ACTION.PERSIST` + `actions=[run.tests, capture.test_report]`, `outputVariables=[review.test_report]`
  - `validate.story -> CFG.AGENT.VALIDATE` + `targetVariable=review.readiness`
  - `persist.result -> CFG.ACTION.PERSIST`
  - `done.show -> CFG.DISPLAY.SUMMARY`

- retrospective
  - `inputs.collect -> CFG.FORM.INTAKE`
  - `context.load -> CFG.ACTION.DISCOVER`
  - `analyze.sprint -> CFG.AGENT.ANALYZE`
  - `generate.retro -> CFG.AGENT.GENERATE` + `targetVariable=draft.retro`
  - `persist.artifact -> CFG.ACTION.PERSIST`
  - `done.show -> CFG.DISPLAY.SUMMARY`

- sprint-planning
  - `context.load -> CFG.ACTION.DISCOVER`
  - `analyze.capacity -> CFG.AGENT.ANALYZE`
  - `persist.plan -> CFG.ACTION.PERSIST`
  - `done.show -> CFG.DISPLAY.SUMMARY`

- sprint-status
  - `context.load -> CFG.ACTION.DISCOVER`
  - `analyze.status -> CFG.AGENT.ANALYZE` + `targetVariable=review.sprint_status`
  - `route.actions -> CFG.BRANCH.ROUTE`
  - `done.show -> CFG.DISPLAY.SUMMARY`

### bmm.quick-flow

- quick-dev
  - `inputs.collect -> CFG.FORM.INTAKE`
  - `context.load -> CFG.ACTION.DISCOVER`
  - `route.strategy -> CFG.BRANCH.ROUTE`
  - `generate.implementation -> CFG.AGENT.GENERATE` + `agentKind=opencode`
  - `validate.implementation -> CFG.AGENT.VALIDATE`
  - `persist.result -> CFG.ACTION.PERSIST`
  - `done.show -> CFG.DISPLAY.SUMMARY`

- quick-spec
  - `inputs.collect -> CFG.FORM.INTAKE`
  - `context.load -> CFG.ACTION.DISCOVER`
  - `analyze.scope -> CFG.AGENT.ANALYZE`
  - `generate.spec -> CFG.AGENT.GENERATE`
  - `persist.spec -> CFG.ACTION.PERSIST`
  - `done.show -> CFG.DISPLAY.SUMMARY`

### bmm.brownfield+qa

- document-project
  - `inputs.collect -> CFG.FORM.INTAKE`
  - `context.load -> CFG.ACTION.DISCOVER`
  - `route.depth -> CFG.BRANCH.ROUTE`
  - `scan.modules -> CFG.INVOKE.SAME` + `fanout.items=context.module_scan_workflows`
  - `persist.context -> CFG.ACTION.PERSIST`
  - `done.show -> CFG.DISPLAY.SUMMARY`

- generate-project-context
  - `context.load -> CFG.ACTION.DISCOVER`
  - `analyze.project -> CFG.AGENT.ANALYZE`
  - `generate.context -> CFG.AGENT.GENERATE`
  - `persist.context -> CFG.ACTION.PERSIST`
  - `done.show -> CFG.DISPLAY.SUMMARY`

- qa-automate
  - `inputs.collect -> CFG.FORM.INTAKE`
  - `context.load -> CFG.ACTION.DISCOVER`
  - `analyze.coverage -> CFG.AGENT.ANALYZE`
  - `generate.tests -> CFG.AGENT.GENERATE` + `agentKind=opencode`
  - `persist.results -> CFG.ACTION.PERSIST`
  - `done.show -> CFG.DISPLAY.SUMMARY`

### tea

- testarch-atdd
  - `inputs.collect -> CFG.FORM.INTAKE`
  - `context.load -> CFG.ACTION.DISCOVER`
  - `analyze.requirements -> CFG.AGENT.ANALYZE`
  - `generate.acceptance_tests -> CFG.AGENT.GENERATE`
  - `persist.tests -> CFG.ACTION.PERSIST`
  - `done.show -> CFG.DISPLAY.SUMMARY`

- testarch-automate
  - `context.load -> CFG.ACTION.DISCOVER`
  - `analyze.targets -> CFG.AGENT.ANALYZE`
  - `generate.automation -> CFG.AGENT.GENERATE`
  - `persist.automation -> CFG.ACTION.PERSIST`
  - `done.show -> CFG.DISPLAY.SUMMARY`

- testarch-ci
  - `inputs.collect -> CFG.FORM.INTAKE`
  - `context.load -> CFG.ACTION.DISCOVER`
  - `analyze.pipeline -> CFG.AGENT.ANALYZE`
  - `generate.pipeline -> CFG.AGENT.GENERATE`
  - `persist.pipeline -> CFG.ACTION.PERSIST`
  - `done.show -> CFG.DISPLAY.SUMMARY`

- testarch-framework
  - `inputs.collect -> CFG.FORM.INTAKE`
  - `context.load -> CFG.ACTION.DISCOVER`
  - `route.framework -> CFG.BRANCH.ROUTE`
  - `generate.framework -> CFG.AGENT.GENERATE`
  - `persist.framework -> CFG.ACTION.PERSIST`
  - `done.show -> CFG.DISPLAY.SUMMARY`

- testarch-nfr
  - `context.load -> CFG.ACTION.DISCOVER`
  - `analyze.nfr -> CFG.AGENT.ANALYZE`
  - `validate.nfr -> CFG.AGENT.VALIDATE`
  - `persist.report -> CFG.ACTION.PERSIST`
  - `done.show -> CFG.DISPLAY.SUMMARY`

- teach-me-testing
  - `inputs.collect -> CFG.FORM.INTAKE`
  - `analyze.level -> CFG.AGENT.ANALYZE`
  - `route.session -> CFG.BRANCH.ROUTE`
  - `invoke.lesson -> CFG.INVOKE.SAME` + `fanout.items=inputs.selected_lessons`
  - `done.show -> CFG.DISPLAY.SUMMARY`

- testarch-test-design
  - `inputs.collect -> CFG.FORM.INTAKE`
  - `context.load -> CFG.ACTION.DISCOVER`
  - `route.mode -> CFG.BRANCH.ROUTE`
  - `generate.design -> CFG.AGENT.GENERATE`
  - `persist.design -> CFG.ACTION.PERSIST`
  - `done.show -> CFG.DISPLAY.SUMMARY`

- testarch-test-review
  - `context.load -> CFG.ACTION.DISCOVER`
  - `validate.tests -> CFG.AGENT.VALIDATE`
  - `persist.review -> CFG.ACTION.PERSIST`
  - `done.show -> CFG.DISPLAY.SUMMARY`

- testarch-trace
  - `context.load -> CFG.ACTION.DISCOVER`
  - `analyze.trace -> CFG.AGENT.ANALYZE`
  - `validate.trace -> CFG.AGENT.VALIDATE`
  - `route.decision -> CFG.BRANCH.ROUTE`
  - `persist.trace -> CFG.ACTION.PERSIST`
  - `done.show -> CFG.DISPLAY.SUMMARY`

### cis

- design-thinking
  - `inputs.collect -> CFG.FORM.INTAKE`
  - `analyze.phase -> CFG.AGENT.ANALYZE`
  - `invoke.methods -> CFG.INVOKE.SAME` + `fanout.items=inputs.methods`
  - `generate.output -> CFG.AGENT.GENERATE`
  - `persist.output -> CFG.ACTION.PERSIST`
  - `done.show -> CFG.DISPLAY.SUMMARY`

- innovation-strategy
  - `inputs.collect -> CFG.FORM.INTAKE`
  - `analyze.market -> CFG.AGENT.ANALYZE`
  - `invoke.methods -> CFG.INVOKE.SAME`
  - `generate.strategy -> CFG.AGENT.GENERATE`
  - `persist.strategy -> CFG.ACTION.PERSIST`
  - `done.show -> CFG.DISPLAY.SUMMARY`

- problem-solving
  - `inputs.collect -> CFG.FORM.INTAKE`
  - `analyze.problem -> CFG.AGENT.ANALYZE`
  - `invoke.methods -> CFG.INVOKE.SAME`
  - `generate.solution -> CFG.AGENT.GENERATE`
  - `persist.solution -> CFG.ACTION.PERSIST`
  - `done.show -> CFG.DISPLAY.SUMMARY`

- storytelling
  - `inputs.collect -> CFG.FORM.INTAKE`
  - `analyze.audience -> CFG.AGENT.ANALYZE`
  - `route.framework -> CFG.BRANCH.ROUTE`
  - `generate.story -> CFG.AGENT.GENERATE`
  - `persist.story -> CFG.ACTION.PERSIST`
  - `done.show -> CFG.DISPLAY.SUMMARY`

## 3) Completion Evidence Defaults

- planning/research/docs workflows: `artifact_ref`
- review workflows: `review_report_ref`
- implementation workflows: `code_change_ref` + `test_report_ref`
- facilitation/brainstorming: `artifact_ref` + optional `analysis_ref`
