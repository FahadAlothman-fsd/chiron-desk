# BMAD E2E Rigorous Example (Target-State)

**Last Updated:** 2026-02-09  
**Status:** Historical working reference (not final implementation spec)

Use this file only as contextual lineage, not as current Epic 3 contract authority.

Some examples here intentionally preserve pre-lock invoke/output patterns such as `inputMapping` and namespace-based child output capture. Current canonical invoke behavior is defined instead by:
- `docs/architecture/methodology-pages/workflow-editor/invoke-step.md`
- `docs/plans/2026-03-12-invoke-facts-artifact-slots-design.md`
- `docs/architecture/epic-3-authority.md`

This document provides a concrete, contract-aligned walkthrough from project initialization through first-story implementation, using BMAD workflows as source inspiration and Chiron step contracts as execution model.

It intentionally reflects session corrections captured in `bmad-e2e-workflow-notes.md`.

## Scope

Path covered:

1. Project initialization
2. Brainstorming document generation
3. Product brief generation
4. PRD
5. Architecture
6. Epics and stories
7. First story implementation + commit

## Canonical BMAD Workflow Sources

- `create-product-brief` (`_bmad/bmm/workflows/1-analysis/create-product-brief/workflow.md`)
- `brainstorming` (`_bmad/core/workflows/brainstorming/workflow.md`)
- `create-prd` (`_bmad/bmm/workflows/2-plan-workflows/create-prd/workflow-create-prd.md`)
- `create-architecture` (`_bmad/bmm/workflows/3-solutioning/create-architecture/workflow.md`)
- `create-epics-and-stories` (`_bmad/bmm/workflows/3-solutioning/create-epics-and-stories/workflow.md`)
- `create-story` / `dev-story` (`_bmad/bmm/workflows/4-implementation/*/workflow.yaml`)

## Conventions

- `workflow_path` is a guidance route, not hard policy lock-in.
- Forms are used primarily for references/complex structured input; conversational capture is primarily agent+tools.
- Artifacts are concrete files in workspace + DB artifact records.
- Variable retrieval is step/execute context driven (`step -> execution -> project -> global` read fallback).

---

## Workflow 1: Initialize Project (`workflow-init-project`)

### Step sequence

1. `agent` - collect project basics conversationally
2. `agent` - classify complexity and recommend path (AX tools)
3. `form` - set only complex refs (for example explicit local path override)
4. `action` - create project entity + repo init + README template + artifact
5. `branch` - optional brief generation route
6. `display`

### Example config (condensed)

```yaml
id: workflow-init-project
steps:
  - id: capture-project-intent
    type: agent
    config:
      agentKind: chiron
      agentId: analyst
      initialPrompt: "Capture project name, description, and target outcome."
      tools:
        - name: set_project_name
          type: update-variable
          config: { targetVariable: project.name }
        - name: set_project_description
          type: update-variable
          config: { targetVariable: project.description }

  - id: classify-and-select-path
    type: agent
    config:
      agentKind: chiron
      agentId: analyst
      tools:
        - name: classify_complexity
          type: ax-generation
          config: { signature: project_complexity_v1, optimizer: mipro }
        - name: select_workflow_path
          type: ax-generation
          config: { signature: workflow_path_selection_v1, optimizer: mipro }
        - name: set_requires_brief
          type: update-variable
          config: { targetVariable: project.requiresBrief }

  - id: optional-path-override
    type: form
    config:
      fields:
        - key: project_path
          ref: path
          validation: { required: true }
          outputVariable: project.path

  - id: initialize-project
    type: action
    config:
      actions:
        - id: create_or_update_project
          kind: variable
          operation: set
          outputVariable: project.id
        - id: ensure_directory
          kind: directory
          operation: join
          outputVariable: project.path.normalized
        - id: git_init
          kind: git
          operation: init
        - id: git_checkout_main
          kind: git
          operation: checkout
          dependsOn: [git_init]
          outputVariable: git.currentBranch
        - id: write_readme
          kind: file
          operation: template
          args:
            templateRef: templates/readme-init
            filePath: "{{project.path.normalized}}/README.md"
          outputVariable: file.readme.path
        - id: record_init_artifact
          kind: artifact
          operation: record
          args:
            artifactType: project-initialization
            filePath: "{{file.readme.path}}"
          outputVariable: artifact.init

  - id: needs-brief
    type: branch
    config:
      if: "{{project.requiresBrief}} == true"
      then: generate-brief-now
      else: finalize-init
```

### Module activity

- Agent steps: workflow-engine, template-engine, variable-service, agent-runtime, provider-registry, tooling-engine (tool approvals), event-bus
- Action step: workflow-engine -> tooling-engine -> sandbox-engine (+ db writes for project/artifact)
- Branch step: workflow-engine branch resolver

---

## Workflow 2: Brainstorm Document (`brainstorm-project`)

### Required pattern

`agent (objective)` -> `invoke (techniques)` -> `agent (converge via continuation)` -> `action (artifact/snapshot)`

### Example config (condensed)

```yaml
id: brainstorm-project
steps:
  - id: set-objective
    type: agent
    config:
      agentKind: chiron
      continuityKey: brainstorm-main
      continuityMode: new
      initialPrompt: "Define objective, constraints, and selected techniques."
      tools:
        - { name: set_objective, type: update-variable, config: { targetVariable: brainstorm.objective } }
        - { name: set_constraints, type: update-variable, config: { targetVariable: brainstorm.constraints } }
        - { name: set_techniques, type: update-variable, config: { targetVariable: brainstorm.selectedTechniques } }

  - id: run-techniques
    type: invoke
    config:
      forEach: { itemsVar: brainstorm.selectedTechniques, itemVar: technique }
      workflowRef: { key: "{{technique.workflowKey}}" }
      inputMapping:
        objective: "{{brainstorm.objective}}"
        constraints: "{{brainstorm.constraints}}"
      executionMode: parallel
      concurrency: 3
      output:
        mode: namespace
        target: "brainstorm.children.{{technique.id}}"
      onChildError: continue

  - id: converge
    type: agent
    config:
      agentKind: chiron
      continuityKey: brainstorm-main
      continuityMode: continue
      contextAttachments:
        - variable: brainstorm.children
          role: system
          format: json
      initialPrompt: "Converge child outputs into final recommendations."
      tools:
        - { name: set_options, type: update-variable, config: { targetVariable: brainstorm.options } }
        - { name: set_recommendation, type: update-variable, config: { targetVariable: brainstorm.recommendation } }

  - id: save-brainstorm
    type: action
    config:
      actions:
        - id: write_doc
          kind: file
          operation: template
          args:
            templateRef: templates/brainstorm-doc
            filePath: "{{project.path.normalized}}/docs/brainstorm.md"
          outputVariable: file.brainstorm.path
        - id: snapshot
          kind: snapshot
          operation: capture
          outputVariable: snapshot.brainstorm
        - id: artifact
          kind: artifact
          operation: record
          args:
            artifactType: foundation.brainstorm
            filePath: "{{file.brainstorm.path}}"
          outputVariable: artifact.brainstorm
```

### Variable lineage notes

- Inputs come from prior execution vars and tool writes.
- `invoke.inputMapping` injects parent vars into child execution context explicitly.
- Child outputs captured by `namespace` mode prevent collisions.

---

## Workflow 3: Product Brief (`create-product-brief`)

### Pattern

Agent-driven conversational capture + iterative refinement + artifact write.

```yaml
id: create-product-brief
steps:
  - id: draft-brief
    type: agent
    config:
      agentKind: chiron
      initialPrompt: "Draft product brief from brainstorm recommendation."
      tools:
        - { name: set_brief_sections, type: update-variable, config: { targetVariable: brief.sections } }

  - id: refine-brief
    type: agent
    config:
      agentKind: chiron
      initialPrompt: "Refine for clarity/measurability."
      tools:
        - { name: set_brief_markdown, type: update-variable, config: { targetVariable: brief.markdown } }

  - id: save-brief
    type: action
    config:
      actions:
        - id: write_brief
          kind: file
          operation: template
          args:
            templateRef: templates/product-brief
            filePath: "{{project.path.normalized}}/docs/product-brief.md"
          outputVariable: file.productBrief.path
        - id: record_brief
          kind: artifact
          operation: record
          args:
            artifactType: foundation.product-brief
            filePath: "{{file.productBrief.path}}"
          outputVariable: artifact.productBrief
```

---

## Workflow 4-7 (Abbreviated Path to First Story Commit)

- `create-prd`: staged agent-driven sections, then file+artifact record (`foundation.prd`)
- `create-architecture`: staged agent + branch validation loops, then file+artifact (`foundation.architecture`)
- `create-epics-and-stories`: iterative persistent tool usage (create/update one epic/story set at a time), then planning artifacts
- `dev-story`: implementation agent + test/verify actions + git add/commit via tooling -> sandbox, then implementation artifact (`implementation.story-report`)

## Non-Chiron Agent Restriction

- Non-Chiron agent kinds should be blocked until project workspace initialization is complete (`directory exists` + `git initialized`).

## PM Bridge Reminder

This example uses artifact-first traceability. PM entity integration remains under active consideration (`pm-workflow-artifact-bridge-consideration.md`).
