# Project Context Only Mapping Draft (BMAD Source Only)

Status: Contextual draft only (non-canonical)
Date: 2026-03-07
Scope: `WU.PROJECT_CONTEXT` only (no `WU.SETUP` rows)

Do not use this file as current Epic 3 implementation authority.

This draft is preserved as BMAD-source lineage only. It contains pre-promotion step shapes and invoke/output examples that conflict with the promoted workflow-engine and methodology-page canonicals.

Use `docs/architecture/epic-3-authority.md` to route to the current canonical docs, especially:
- `docs/architecture/methodology-pages/workflow-editor/form-step.md`
- `docs/architecture/methodology-pages/workflow-editor/agent-step.md`
- `docs/architecture/methodology-pages/workflow-editor/invoke-step.md`
- `docs/architecture/methodology-pages/workflow-editor/action-step.md`
- `docs/architecture/methodology-pages/workflow-editor/branch-step.md`
- `docs/architecture/methodology-pages/workflow-editor/display-step.md`
- promoted methodology-page docs under `docs/architecture/methodology-pages/`

## 1) Source of Truth Used

This draft is derived only from `_bmad/` files, not `_bmad-output`.

- Workflow registry: `_bmad/_config/workflow-manifest.csv:24`, `_bmad/_config/workflow-manifest.csv:25`
- Agent registry: `_bmad/_config/agent-manifest.csv:2`, `_bmad/_config/agent-manifest.csv:3`, `_bmad/_config/agent-manifest.csv:10`
- Document Project workflow config: `_bmad/bmm/workflows/document-project/workflow.yaml:2`
- Document Project router semantics: `_bmad/bmm/workflows/document-project/instructions.md:11`
- Full scan runtime inputs/modes: `_bmad/bmm/workflows/document-project/workflows/full-scan.yaml:24`
- Full scan execution semantics: `_bmad/bmm/workflows/document-project/workflows/full-scan-instructions.md:45`
- Deep dive semantics: `_bmad/bmm/workflows/document-project/workflows/deep-dive-instructions.md:9`
- Document Project quality criteria: `_bmad/bmm/workflows/document-project/checklist.md:3`
- Generate Project Context workflow: `_bmad/bmm/workflows/generate-project-context/workflow.md:2`
- Generate Project Context step rules: `_bmad/bmm/workflows/generate-project-context/steps/step-01-discover.md:33`, `_bmad/bmm/workflows/generate-project-context/steps/step-02-generate.md:50`, `_bmad/bmm/workflows/generate-project-context/steps/step-03-complete.md:33`
- Project context output template: `_bmad/bmm/workflows/generate-project-context/project-context-template.md:1`
- Core workflow engine constraints: `_bmad/core/tasks/workflow.xml:4`, `_bmad/core/tasks/workflow.xml:12`

## 2) Design Decisions for This Remap

1. Single work unit: `WU.PROJECT_CONTEXT`.
2. Two workflows mapped under it: `document-project`, `generate-project-context`.
3. Transition model for Chiron execution:
   - single transition lifecycle `__absent__ -> done` for this slice.
   - start/completion gate semantics are expressed via phase-specific condition sets.
4. Step configs use source references and mode semantics from `_bmad`, not `CFG.*` ids.
5. `definition_extensions_json` is disabled for this flow: no read authority, no write authority, no fallback.
6. Project ownership for this flow is in `project-context` module boundary (project CRUD, pin lineage, project facts, and `WU.PROJECT_CONTEXT` instance state).
7. Transition gating target is canonical transition condition sets; `transition_required_links` is legacy migration debt and not authority.
8. Slice scope lock (A/B): execute greenfield path only; brownfield path remains documented as deferred for later slices.
9. Agent tools use one shared contract and two tool categories: `context.read` and `action.perform`.
10. `action.perform` is CUD-only for this flow (create/update/delete). Reads come only from `context.read`.

## 3) Canonical Table Payload (Proposed)

`methodologyVersionId`: `mver_bmad_project_context_only_draft`

### 3.1 methodology_work_unit_types

```yaml
- id: seed:wut:wu.project_context
  methodologyVersionId: mver_bmad_project_context_only_draft
  key: WU.PROJECT_CONTEXT
  displayName: Project Context
  cardinality: one_per_project
  descriptionJson: |
    # Project Context

    Primary onboarding and context-curation work unit for both:
    - **New projects**: establish initial context, conventions, and execution baseline.
    - **Existing projects**: document current architecture/codebase and generate a usable `project-context.md`.

    ## How to use
    1. Run `document-project` to discover/project-scan and structure documentation.
    2. Run `generate-project-context` to produce concise implementation rules for AI and human operators.
  source_refs:
    - _bmad/_config/workflow-manifest.csv:24
    - _bmad/_config/workflow-manifest.csv:25
```

### 3.2 methodology_agent_types

```yaml
- id: seed:agent:project-context-analyst
  methodologyVersionId: mver_bmad_project_context_only_draft
  key: project-context-analyst
  displayName: Mimir
  description: Business Analyst
  persona: Strategic Business Analyst + Requirements Expert
  defaultModelJson: null
  mcpServersJson: null
  capabilitiesJson:
    - requirements elicitation
    - domain expertise
    - discovery facilitation
  promptTemplateJson:
    content: |
      You are Mimir, the Project Context Analyst for Chiron.

      Mission:
      - Build accurate, decision-ready project understanding for `WU.PROJECT_CONTEXT`.
      - Convert ambiguous project signals into explicit, testable facts and constraints.

      Operating Rules:
      - Use runtime context variables only; do not require file-path loading instructions at execution time.
      - Treat canonical methodology/project tables as authoritative.
      - Do not invent missing facts; mark uncertainty explicitly.
      - If blocked, ask one targeted question and include a recommended default.
      - Keep outputs deterministic and schema-safe for downstream steps.

      Required Context:
      - workflow: {{workflow_key}}
      - step: {{step_key}}
      - work unit: {{work_unit_key}}
      - transition: {{transition_key}}
      - objective: {{step_objectives}}
      - project summary: {{project_summary}}
      - known project facts: {{project_facts_json}}
      - methodology constraints: {{methodology_constraints_json}}
      - required outputs: {{required_outputs_json}}
      - quality gates: {{quality_gates_json}}

      Output Contract:
      1. Findings: concise facts discovered from current context.
      2. Fact Updates: new/updated facts with confidence and rationale.
      3. Risks and Unknowns: blockers, assumptions, missing inputs.
      4. Next Action: deterministic recommendation aligned to current step objective.

      Response Rules:
      - Respond in {{communication_language}}.
      - Prefer structured bullets and stable key names.
      - Keep narrative short; prioritize actionable precision.
    variables:
      - step_objectives
      - workflow_key
      - step_key
      - work_unit_key
      - transition_key
      - project_summary
      - project_facts_json
      - methodology_constraints_json
      - required_outputs_json
      - quality_gates_json
      - communication_language
  promptTemplateVersion: 1

- id: seed:agent:project-context-writer
  methodologyVersionId: mver_bmad_project_context_only_draft
  key: project-context-writer
  displayName: Thoth
  description: Technical Writer
  persona: Technical Documentation Specialist + Knowledge Curator
  defaultModelJson: null
  mcpServersJson: null
  capabilitiesJson:
    - documentation
    - standards compliance
    - concept explanation
  promptTemplateJson:
    content: |
      You are Thoth, the Project Context Documentation Specialist for Chiron.

      Mission:
      - Produce precise, implementation-ready project context artifacts.
      - Convert validated findings into durable, low-ambiguity guidance.

      Operating Rules:
      - Use runtime context variables only; no runtime dependency on external agent-file paths.
      - Preserve canonical naming and stable identifiers from methodology/project context.
      - Resolve contradictions explicitly; do not silently merge conflicting inputs.
      - If required inputs are missing, ask one targeted question and propose a default.
      - Keep outputs concise, structured, and directly consumable by downstream operators/agents.

      Required Context:
      - workflow: {{workflow_key}}
      - step: {{step_key}}
      - work unit: {{work_unit_key}}
      - transition: {{transition_key}}
      - objective: {{step_objectives}}
      - project summary: {{project_summary}}
      - known project facts: {{project_facts_json}}
      - artifact contract: {{artifact_contract_json}}
      - output schema: {{output_schema_json}}
      - quality gates: {{quality_gates_json}}

      Output Contract:
      1. Context Draft: final structured output aligned to output schema.
      2. Traceability Notes: key fact-to-guidance mappings.
      3. Validation Checklist: explicit pass/fail against quality gates.
      4. Open Questions: only unresolved items that block reliable execution.

      Response Rules:
      - Respond in {{communication_language}}.
      - Use stable section names and deterministic ordering.
      - Favor exact language over broad prose.
    variables:
      - step_objectives
      - workflow_key
      - step_key
      - work_unit_key
      - transition_key
      - project_summary
      - project_facts_json
      - artifact_contract_json
      - output_schema_json
      - quality_gates_json
      - communication_language
  promptTemplateVersion: 1
```

Why this split:
- `document-project` is discovery/routing heavy (analyst fit).
- `generate-project-context` is writing/refinement heavy (tech-writer fit).

### 3.2.a Agent Prompt Composition (Epic 3 Contract Draft)

Four prompt layers are required and must be composed at runtime:

1. **agent system prompt** (editable in Chiron, variable-aware)
2. **runtime context capsule** (workflow/step/work-unit/transition + facts + constraints)
3. **step objectives** (step-scoped objective block)
4. **output contract** (artifact schema + quality gates)

Proposed composition pattern:

```md
{{agent_system_prompt}}
<runtime-context>
workflow_key: {{workflow_key}}
step_key: {{step_key}}
work_unit_key: {{work_unit_key}}
transition_key: {{transition_key}}
project_summary: {{project_summary}}
project_facts_json: {{project_facts_json}}
methodology_constraints_json: {{methodology_constraints_json}}
</runtime-context>
<step-objectives>
{{step_objectives}}
</step-objectives>
<output-contract>
required_outputs_json: {{required_outputs_json}}
output_schema_json: {{output_schema_json}}
quality_gates_json: {{quality_gates_json}}
</output-contract>
```

Example editable agent prompt template (user-authored in Chiron):

```md
AGENT_ROLE
AGENT_PERSONA
OPERATING_RULES
<context-usage>
Use only injected runtime variables and canonical table semantics.
</context-usage>
<output-standards>
Prefer deterministic sections and stable keys.
</output-standards>
{{step_objectives}}
```

Prompt composition metadata (content-first, no file-path dependency at runtime):

```yaml
promptPolicy:
  runtimeAdapter: ai-sdk
  mergeMode: append_runtime_context_then_objectives_then_output_contract
  sessionOverlayEnabled: true
  persistComposedPromptSnapshot: true
  composedPromptSnapshotScope: step_run
  sourceSync:
    enabled: false
    sourceType: external-agent-registry
    conflictPolicy: keep_user_edited
```

Notes:
- Store editable prompt content in Chiron as the runtime source of truth.
- Source-sync import from external registries is optional and offline; runtime execution does not depend on external files.
- Compose final system prompt at execution time with injected variables, `step_objectives`, and output contract blocks.
- Expand variable coverage beyond `step_objectives` so prompts stay deterministic without hardcoded path-loading instructions.

### 3.3 work_unit_lifecycle_states

```yaml
- id: seed:state:wu.project_context:done
  methodologyVersionId: mver_bmad_project_context_only_draft
  workUnitTypeId: seed:wut:wu.project_context
  key: done
  displayName: Done
  descriptionJson: Context artifacts generated, validated, and ready for downstream use.
```

### 3.4 work_unit_lifecycle_transitions

```yaml
- id: seed:transition:wu.project_context:absent_done
  methodologyVersionId: mver_bmad_project_context_only_draft
  workUnitTypeId: seed:wut:wu.project_context
  fromStateId: null
  toStateId: seed:state:wu.project_context:done
  transitionKey: __absent__->done
  rationale: Single transition lifecycle for project-context in this slice.
  source_refs:
    - _bmad/bmm/workflows/document-project/instructions.md:122
    - _bmad/bmm/workflows/generate-project-context/steps/step-03-complete.md:29
```

### 3.5 transition_condition_sets

```yaml
- id: seed:condition-set:wu.project_context:absent_done:start
  methodologyVersionId: mver_bmad_project_context_only_draft
  transitionId: seed:transition:wu.project_context:absent_done
  key: gate.activate.wu.project_context
  phase: start
  mode: all
  groupsJson:
    - key: transition-routing
      mode: all
      conditions:
        - kind: transition.workflowBinding.present
          required: true
          config:
            workUnitTypeKey: WU.PROJECT_CONTEXT
            transitionKey: __absent__->done
          rationale: Activation is allowed only when at least one workflow is bound for this transition.

- id: seed:condition-set:wu.project_context:absent_done:completion
  methodologyVersionId: mver_bmad_project_context_only_draft
  transitionId: seed:transition:wu.project_context:absent_done
  key: gate.complete.wu.project_context
  phase: completion
  mode: all
  groupsJson:
    - key: workflow-completion
      mode: all
      conditions:
        - kind: workflow.run.succeeded
          required: true
          config:
            workflowKey: document-project
          rationale: Discovery/document workflow must finish successfully.
    - key: required-facts
      mode: all
      conditions:
        - kind: facts.present
          required: true
          config:
            keys: [projectType, projectRootPath, projectKnowledgePath]
          rationale: Core project facts are mandatory before completion.
    - key: required-artifacts
      mode: all
      conditions:
        - kind: artifact.present
          required: true
          config:
            artifactKey: project-context.md
          rationale: Completion requires a generated project context artifact.
```

Field semantics (condition sets):
- `mode` at set level combines group results (`all` = every group passes, `any` = one group passes).
- `groupsJson[].mode` combines conditions inside that group.
- `required: true` means failing that condition blocks transition.
- `rationale` is diagnostic/explanatory text; evaluator logic comes from `kind + config`.

Reason: `_bmad` does not provide explicit condition-set rows, so Chiron formalizes deterministic transition gates as canonical condition sets with nested group semantics. Project and pin existence are treated as platform invariants (enforced before transition evaluation), not transition conditions. `transition_required_links` remains migration debt and is not authority for this mapping.

### 3.6 methodology_fact_schemas (durable project-context facts)

Interpretation note:
- Rows in `methodology_fact_schemas` define canonical fact contracts (keys/types/validation rules).
- Actual fact values for `projectType`, `projectRootPath`, `projectKnowledgePath`, and `existingIndexPath` are project-level values owned by `project-context` persistence, not methodology-level defaults.

```yaml
- id: seed:fact-schema:wu.project_context:projectType
  methodologyVersionId: mver_bmad_project_context_only_draft
  workUnitTypeId: seed:wut:wu.project_context
  name: Project Type
  key: projectType
  factType: string
  description: Project onboarding mode used for context strategy.
  guidanceJson: Allowed values: greenfield, brownfield.
  validationJson:
    rules:
      - kind: allowed-values
        values: [greenfield, brownfield]
  source_refs:
    - _bmad/bmm/workflows/document-project/workflow.yaml:5
    - _bmad/bmm/workflows/generate-project-context/workflow.md:8

- id: seed:fact-schema:wu.project_context:projectRootPath
  methodologyVersionId: mver_bmad_project_context_only_draft
  workUnitTypeId: seed:wut:wu.project_context
  name: Project Root Path
  key: projectRootPath
  factType: string
  description: Root directory of project being documented.
  defaultValueJson: .
  guidanceJson: >
    Required before classification/scan starts. Must resolve to a safe directory path
    with normalization and traversal protection.
  validationJson:
    rules:
      - kind: path
        path:
          pathKind: directory
          normalization:
            mode: posix
            trimWhitespace: true
          safety:
            disallowAbsolute: false
            preventTraversal: true
  source_refs:
    - _bmad/bmm/workflows/document-project/workflows/full-scan.yaml:28
    - _bmad/bmm/workflows/document-project/workflows/full-scan-instructions.md:152
    - packages/contracts/src/methodology/fact.ts:27

- id: seed:fact-schema:wu.project_context:projectKnowledgePath
  methodologyVersionId: mver_bmad_project_context_only_draft
  workUnitTypeId: seed:wut:wu.project_context
  name: Project Knowledge Path
  key: projectKnowledgePath
  factType: string
  description: Output folder for generated docs/state files.
  defaultValueJson: "{{project_knowledge_path}}"
  guidanceJson: >
    Used for state file, index, deep-dive artifacts. Must be a safe directory path
    and must resolve under `projectRootPath`.
  validationJson:
    rules:
      - kind: path
        path:
          pathKind: directory
          normalization:
            mode: posix
            trimWhitespace: true
          safety:
            disallowAbsolute: true
            preventTraversal: true
      - kind: under-root
        underRoot:
          rootFactKey: projectRootPath
  source_refs:
    - _bmad/bmm/workflows/document-project/workflow.yaml:9
    - _bmad/bmm/workflows/document-project/instructions.md:12
    - packages/contracts/src/methodology/fact.ts:27

- id: seed:fact-schema:wu.project_context:existingIndexPath
  methodologyVersionId: mver_bmad_project_context_only_draft
  workUnitTypeId: seed:wut:wu.project_context
  name: Existing Index Path
  key: existingIndexPath
  factType: string
  description: Existing index location for deep-dive mode.
  defaultValueJson: "{{project_knowledge_path}}/index.md"
  guidanceJson: Used in deep-dive mode bootstrap and must resolve under `projectRootPath`.
  validationJson:
    rules:
      - kind: path
        path:
          pathKind: file
          normalization:
            mode: posix
            trimWhitespace: true
          safety:
            disallowAbsolute: true
            preventTraversal: true
      - kind: under-root
        underRoot:
          rootFactKey: projectRootPath
  source_refs:
    - _bmad/bmm/workflows/document-project/workflows/deep-dive.yaml:28
    - packages/contracts/src/methodology/fact.ts:27
```

Fact-scope rule:
- Keep only durable project-context declarations in `methodology_fact_schemas`.
- Runtime workflow-control inputs (`workflowMode`, `scanLevel`, `resumeMode`) are execution parameters, not persisted project facts.
- Transition requirements are enforced by condition sets and step-required facts, not by fact-schema requiredness.
- Fact-schema `required` is treated as deprecated legacy column behavior for this flow; seed adapter should write `false` for all `WU.PROJECT_CONTEXT` fact-schema rows until schema migration removes the field.
- Enum-like restrictions are modeled as `validationJson.rules` with `kind: allowed-values`.
- Root-relative constraints are modeled as `validationJson.rules` with `kind: under-root` and `rootFactKey: projectRootPath`.
- Path key naming note: current contract uses `safety.disallowAbsolute`; keep as canonical key for now (rename to `allowAbsolute` can be a later contract migration).
- `projectType` is a project-level fact value (same ownership as project paths), validated against methodology fact contract rules.

### 3.7 methodology_fact_definitions (methodology-level defaults)

```yaml
- id: seed:fact-def:communicationLanguage
  methodologyVersionId: mver_bmad_project_context_only_draft
  name: Communication Language
  key: communicationLanguage
  valueType: string
  descriptionJson: Language used for agent responses.
  guidanceJson: Loaded from Chiron runtime context and project-level defaults.
  defaultValueJson: "{{communication_language}}"
  validationJson:
    rules: []
  source_refs:
    - _bmad/bmm/workflows/document-project/workflow.yaml:11
    - _bmad/bmm/workflows/generate-project-context/workflow.md:33

- id: seed:fact-def:documentOutputLanguage
  methodologyVersionId: mver_bmad_project_context_only_draft
  name: Document Output Language
  key: documentOutputLanguage
  valueType: string
  descriptionJson: Language used for generated documentation.
  guidanceJson: Pulled from Chiron document-output policy before workflow execution.
  defaultValueJson: "{{document_output_language}}"
  validationJson:
    rules: []
  source_refs:
    - _bmad/bmm/workflows/document-project/workflow.yaml:12

- id: seed:fact-def:outputFile
  methodologyVersionId: mver_bmad_project_context_only_draft
  name: Output File
  key: outputFile
  valueType: string
  descriptionJson: Primary project context output path.
  guidanceJson: Derived from output folder + project-context filename.
  defaultValueJson: "{{project_knowledge_path}}/project-context.md"
  validationJson:
    rules:
      - kind: path
        path:
          pathKind: file
          normalization:
            mode: posix
            trimWhitespace: true
          safety:
            disallowAbsolute: true
            preventTraversal: true
      - kind: under-root
        underRoot:
          rootFactKey: projectRootPath
  source_refs:
    - _bmad/bmm/workflows/generate-project-context/workflow.md:41
```

Definition-scope rule:
- `methodology_fact_definitions` hold defaults/policies, not transition gating requiredness.
- Defaults may include validation rules when needed, but requiredness enforcement remains in condition sets and step-required facts.

### 3.8 methodology_workflows

```yaml
- id: seed:wf:document-project
  methodologyVersionId: mver_bmad_project_context_only_draft
  workUnitTypeId: seed:wut:wu.project_context
  key: document-project
  displayName: Document Project
  guidanceJson: >
    Discovery workflow for establishing project context baseline.
    Slice A/B active path is greenfield-first intake/discovery.
    Brownfield scan/resume path remains deferred and is not active in Slice A/B execution.
  source_refs:
    - _bmad/bmm/workflows/document-project/workflow.yaml:4
    - _bmad/bmm/workflows/document-project/instructions.md:9

- id: seed:wf:generate-project-context
  methodologyVersionId: mver_bmad_project_context_only_draft
  workUnitTypeId: seed:wut:wu.project_context
  key: generate-project-context
  displayName: Generate Project Context
  guidanceJson: >
    Context-authoring workflow that transforms validated discovery outputs into
    a deterministic `project-context.md` artifact with stable structure, policy
    defaults, and operator/agent-ready implementation guidance.
  source_refs:
    - _bmad/bmm/workflows/generate-project-context/workflow.md:8
    - _bmad/bmm/workflows/generate-project-context/workflow.md:16
```

### 3.9 methodology_workflow_steps

Proposed step keys are inferred from workflow goals/step blocks in `_bmad`.
Config payloads below are intentionally typed by step contract (`form.v1`, `action.v1`, `branch.v1`, `invoke.v1`, `agent.v1`, `display.v1`) so `workflow_steps.config_json` is not treated as opaque catchall JSON.

Slice A/B active sequence lock (`document-project`):
1) `intake.capture` (`form.v1`): capture only `projectType`.
2) `projectType.route` (`branch.v1`): deterministic route to greenfield or brownfield path.
3) `greenfield.discovery.agent` (`agent.v1`): early user-agent interaction.
4) `greenfield.paths.capture` (`form.v1`): capture `projectRootPath`, `projectKnowledgePath`.
5) `greenfield.bootstrap.action` (`action.v1`): bootstrap artifact snapshot + git init/commit evidence.
6) `greenfield.summary.show` (`display.v1`).
7) `brownfield.paths.capture` (`form.v1`): capture/validate path set for existing-project analysis.
8) `brownfield.discovery.agent` (`agent.v1`): produce discovery summary and generation decision.
9) `brownfield.context.route` (`branch.v1`): branch on `needsContextGeneration`.
10) `brownfield.context.invoke` (`invoke.v1`): invoke `generate-project-context` when required.
11) `brownfield.summary.show` (`display.v1`).

Brownfield-specific steps are now active in the canonical lock and represented below.

```yaml
# document-project
- id: seed:wf-step:document-project:intake.capture
  methodologyVersionId: mver_bmad_project_context_only_draft
  workflowId: seed:wf:document-project
  key: intake.capture
  type: form
  displayName: Capture Project Context Intake
  configJson:
    stepConfigVersion: 1
    contract: form.v1
    mode: edit
    autosave: true
    fields:
      - id: projectType
        type: select
        label: Project Type
        required: true
        options:
          - value: greenfield
            label: Greenfield
          - value: brownfield
            label: Brownfield
    outputVariables:
      - facts.projectType
  guidanceJson: >
    First-step intake for both greenfield and brownfield flows. Captures routing
    intent only; path capture occurs in path-specific form steps.
  source_refs:
    - _bmad/bmm/workflows/document-project/instructions.md:11
    - docs/architecture/methodology-pages/workflow-editor/form-step.md:1

- id: seed:wf-step:document-project:projectType.route
  methodologyVersionId: mver_bmad_project_context_only_draft
  workflowId: seed:wf:document-project
  key: projectType.route
  type: branch
  displayName: Route by Project Type
  configJson:
    stepConfigVersion: 1
    contract: branch.v1
    routeVariable: facts.projectType
    branches:
      - when: { op: equals, var: facts.projectType, value: greenfield }
        next: { stepId: greenfield.discovery.agent }
      - when: { op: equals, var: facts.projectType, value: brownfield }
        next: { stepId: brownfield.paths.capture }
    defaultNext: { stepId: intake.capture }
  guidanceJson: >
    Deterministic branch into greenfield or brownfield step chain.
  source_refs:
    - _bmad/bmm/workflows/document-project/workflow.yaml:5

- id: seed:wf-step:document-project:greenfield.discovery.agent
  methodologyVersionId: mver_bmad_project_context_only_draft
  workflowId: seed:wf:document-project
  key: greenfield.discovery.agent
  type: agent
  displayName: Greenfield Discovery
  configJson:
    stepConfigVersion: 1
    contract: agent.v1
    agentKind: chiron
    agentId: project-context-analyst
    tools:
      - name: set_project_description
        toolType: update-variable
        targetVariable: facts.projectDescription
      - name: set_delivery_mode
        toolType: ax-generate
        targetVariable: facts.deliveryMode
        requiredVariables: [facts.projectDescription]
      - name: set_discovery_summary
        toolType: update-variable
        targetVariable: context.discoverySummary
        requiredVariables: [facts.projectDescription, facts.deliveryMode]
    completionConditions:
      - type: all-variables-set
        requiredVariables: [facts.projectDescription, facts.deliveryMode]
  guidanceJson: >
    Collect greenfield discovery facts and bootstrap strategy signals.
  source_refs:
    - _bmad/bmm/workflows/document-project/workflow.yaml:4

- id: seed:wf-step:document-project:greenfield.paths.capture
  methodologyVersionId: mver_bmad_project_context_only_draft
  workflowId: seed:wf:document-project
  key: greenfield.paths.capture
  type: form
  displayName: Capture Greenfield Paths
  configJson:
    stepConfigVersion: 1
    contract: form.v1
    fields:
      - id: projectRootPath
        required: true
        validationJson:
          rules:
            - kind: path
              path:
                pathKind: directory
                normalization: { mode: posix, trimWhitespace: true }
                safety: { disallowAbsolute: false, preventTraversal: true }
      - id: projectKnowledgePath
        required: true
        validationJson:
          rules:
            - kind: path
              path:
                pathKind: directory
                normalization: { mode: posix, trimWhitespace: true }
                safety: { disallowAbsolute: true, preventTraversal: true }
            - kind: under-root
              underRoot: { rootFactKey: projectRootPath }
    outputVariables:
      - facts.projectRootPath
      - facts.projectKnowledgePath
  guidanceJson: >
    Capture/validate root and knowledge paths for greenfield bootstrap.
  source_refs:
    - _bmad/bmm/workflows/document-project/workflow.yaml:9

- id: seed:wf-step:document-project:greenfield.bootstrap.action
  methodologyVersionId: mver_bmad_project_context_only_draft
  workflowId: seed:wf:document-project
  key: greenfield.bootstrap.action
  type: action
  displayName: Persist Greenfield Bootstrap
  configJson:
    stepConfigVersion: 1
    contract: action.v1
    executionMode: sequential
    actions:
      - id: git.ensure.init
        kind: git
        operation: init-if-missing
        outputVariable: context.gitInitStatus
      - id: bootstrap.render
        kind: variable
        operation: set
        outputVariable: context.bootstrapPayload
      - id: bootstrap.snapshot.upsert
        kind: artifact
        operation: snapshot-upsert
        params:
          artifactSlotKey: project-context-bootstrap
          artifactFileName: project-context-bootstrap.json
          contentVariable: context.bootstrapPayload
        outputVariable: context.bootstrapSnapshot
      - id: bootstrap.commit
        kind: git
        operation: commit
        params:
          message: "chore(project-context): add bootstrap snapshot artifact"
          includePaths: ["{{projectKnowledgePath}}/project-context-bootstrap.json"]
        outputVariable: context.bootstrapCommit
  guidanceJson: >
    Initialize git when needed, persist bootstrap snapshot, and commit evidence.
  source_refs:
    - _bmad/bmm/workflows/document-project/workflow.yaml:4

- id: seed:wf-step:document-project:greenfield.summary.show
  methodologyVersionId: mver_bmad_project_context_only_draft
  workflowId: seed:wf:document-project
  key: greenfield.summary.show
  type: display
  displayName: Greenfield Bootstrap Summary
  configJson:
    stepConfigVersion: 1
    contract: display.v1
    title: Greenfield Bootstrap Summary
    tabs:
      - key: facts
        title: Facts
        content: <PlateDocument>
      - key: artifact
        title: Bootstrap Artifact
        content: <PlateDocument>
  guidanceJson: >
    Present captured facts and bootstrap artifact evidence for review.
  source_refs:
    - docs/architecture/methodology-pages/workflow-editor/display-step.md:1

- id: seed:wf-step:document-project:brownfield.paths.capture
  methodologyVersionId: mver_bmad_project_context_only_draft
  workflowId: seed:wf:document-project
  key: brownfield.paths.capture
  type: form
  displayName: Capture Brownfield Paths
  configJson:
    stepConfigVersion: 1
    contract: form.v1
    fields:
      - id: projectRootPath
        validationJson:
          rules:
            - kind: path
              path:
                pathKind: directory
                normalization: { mode: posix, trimWhitespace: true }
                safety: { disallowAbsolute: false, preventTraversal: true }
      - id: projectKnowledgePath
        validationJson:
          rules:
            - kind: path
              path:
                pathKind: directory
                normalization: { mode: posix, trimWhitespace: true }
                safety: { disallowAbsolute: true, preventTraversal: true }
            - kind: under-root
              underRoot: { rootFactKey: projectRootPath }
      - id: existingIndexPath
        required: false
        validationJson:
          rules:
            - kind: path
              path:
                pathKind: file
                normalization: { mode: posix, trimWhitespace: true }
                safety: { disallowAbsolute: true, preventTraversal: true }
            - kind: under-root
              underRoot: { rootFactKey: projectRootPath }
    outputVariables: [facts.projectRootPath, facts.projectKnowledgePath, facts.existingIndexPath]
  guidanceJson: >
    Capture and validate path facts needed for existing-project discovery.
  source_refs:
    - _bmad/bmm/workflows/document-project/instructions.md:11

- id: seed:wf-step:document-project:brownfield.discovery.agent
  methodologyVersionId: mver_bmad_project_context_only_draft
  workflowId: seed:wf:document-project
  key: brownfield.discovery.agent
  type: agent
  displayName: Brownfield Discovery
  configJson:
    stepConfigVersion: 1
    contract: agent.v1
    agentKind: opencode
    agentId: project-context-analyst
    tools:
      - name: set_discovery_summary
        toolType: update-variable
        targetVariable: context.discoverySummary
        requiredVariables: [facts.projectRootPath, facts.projectKnowledgePath]
      - name: set_needs_context_generation
        toolType: ax-generate
        targetVariable: runtime.needsContextGeneration
        requiredVariables: [context.discoverySummary]
      - name: set_brownfield_findings
        toolType: update-variable
        targetVariable: context.brownfieldFindings
        requiredVariables: [runtime.needsContextGeneration]
    completionConditions:
      - type: all-variables-set
        requiredVariables: [context.discoverySummary, runtime.needsContextGeneration]
  guidanceJson: >
    Discover brownfield context and decide whether context generation must run.
  source_refs:
    - _bmad/bmm/workflows/document-project/instructions.md:12
    - _bmad/bmm/workflows/generate-project-context/steps/step-01-discover.md:33

- id: seed:wf-step:document-project:brownfield.context.route
  methodologyVersionId: mver_bmad_project_context_only_draft
  workflowId: seed:wf:document-project
  key: brownfield.context.route
  type: branch
  displayName: Route Brownfield Context Decision
  configJson:
    stepConfigVersion: 1
    contract: branch.v1
    routeVariable: runtime.needsContextGeneration
    branches:
      - when: { op: equals, var: runtime.needsContextGeneration, value: true }
        next: { stepId: brownfield.context.invoke }
      - when: { op: equals, var: runtime.needsContextGeneration, value: false }
        next: { stepId: brownfield.summary.show }
    defaultNext: { stepId: brownfield.summary.show }
  guidanceJson: >
    Route to invoke or direct summary using deterministic needs-context-generation flag.
  source_refs:
    - _bmad/bmm/workflows/document-project/instructions.md:82

- id: seed:wf-step:document-project:brownfield.context.invoke
  methodologyVersionId: mver_bmad_project_context_only_draft
  workflowId: seed:wf:document-project
  key: brownfield.context.invoke
  type: invoke
  displayName: Invoke Generate Project Context
  configJson:
    stepConfigVersion: 1
    contract: invoke.v1
    bindingMode: same_work_unit
    executionMode: single
    workflowRef: generate-project-context
    waitForCompletion: true
    onChildError: fail
    inputMapping:
      projectType: facts.projectType
      projectRootPath: facts.projectRootPath
      projectKnowledgePath: facts.projectKnowledgePath
      existingIndexPath: facts.existingIndexPath
      discoverySummary: context.discoverySummary
    output:
      mode: variables
      target: context.contextGeneration
  guidanceJson: >
    Invoke context generation only when brownfield discovery marks it as required.
  source_refs:
    - _bmad/bmm/workflows/generate-project-context/workflow.md:8

- id: seed:wf-step:document-project:brownfield.summary.show
  methodologyVersionId: mver_bmad_project_context_only_draft
  workflowId: seed:wf:document-project
  key: brownfield.summary.show
  type: display
  displayName: Brownfield Context Summary
  configJson:
    stepConfigVersion: 1
    contract: display.v1
    title: Brownfield Context Summary
    tabs:
      - key: intake
        title: Intake Facts
        content: <PlateDocument>
      - key: discovery
        title: Discovery Findings
        content: <PlateDocument>
      - key: generation
        title: Context Generation Result
        content: <PlateDocument>
      - key: evidence
        title: Artifacts and Evidence
        content: <PlateDocument>
  guidanceJson: >
    Present brownfield findings, generation decision, and artifact evidence.
  source_refs:
    - docs/architecture/methodology-pages/workflow-editor/display-step.md:1

# generate-project-context
- id: seed:wf-step:generate-project-context:inputs.confirm
  methodologyVersionId: mver_bmad_project_context_only_draft
  workflowId: seed:wf:generate-project-context
  key: inputs.confirm
  type: form
  displayName: Confirm Generation Inputs
  configJson:
    stepConfigVersion: 1
    contract: form.v1
    fields:
      - id: projectType
        required: true
      - id: projectRootPath
        required: true
      - id: projectKnowledgePath
        required: true
      - id: existingIndexPath
        required: false
      - id: discoverySummary
        required: true
    outputVariables:
      - facts.projectType
      - facts.projectRootPath
      - facts.projectKnowledgePath
      - facts.existingIndexPath
      - context.discoverySummary
  guidanceJson: >
    Confirm normalized invoke inputs before generation begins.
  source_refs:
    - _bmad/bmm/workflows/generate-project-context/workflow.md:8

- id: seed:wf-step:generate-project-context:context.generate
  methodologyVersionId: mver_bmad_project_context_only_draft
  workflowId: seed:wf:generate-project-context
  key: context.generate
  type: agent
  displayName: Generate Project Context Content
  configJson:
    stepConfigVersion: 1
    contract: agent.v1
    agentKind: chiron
    agentId: project-context-writer
    tools:
      - name: write_generated_context
        toolType: update-variable
        targetVariable: draft.generatedContext
      - name: write_traceability_map
        toolType: update-variable
        targetVariable: draft.traceabilityMap
    completionConditions:
      - type: all-variables-set
        requiredVariables: [draft.generatedContext, draft.traceabilityMap]
  guidanceJson: >
    Generate deterministic context content and traceability mapping.
  source_refs:
    - _bmad/bmm/workflows/generate-project-context/steps/step-02-generate.md:50

- id: seed:wf-step:generate-project-context:artifact.snapshot.save
  methodologyVersionId: mver_bmad_project_context_only_draft
  workflowId: seed:wf:generate-project-context
  key: artifact.snapshot.save
  type: action
  displayName: Save Project Context Snapshot
  configJson:
    stepConfigVersion: 1
    contract: action.v1
    executionMode: sequential
    actions:
      - id: context.artifact.upsert
        kind: artifact
        operation: snapshot-upsert
        params:
          artifactSlotKey: project-context
          artifactFileName: project-context.md
          contentVariable: draft.generatedContext
        outputVariable: context.projectContextSnapshot
      - id: traceability.store
        kind: variable
        operation: set
        outputVariable: context.traceabilityMap
  guidanceJson: >
    Persist generated context artifact and traceability outputs.
  source_refs:
    - _bmad/bmm/workflows/generate-project-context/steps/step-03-complete.md:33

- id: seed:wf-step:generate-project-context:result.show
  methodologyVersionId: mver_bmad_project_context_only_draft
  workflowId: seed:wf:generate-project-context
  key: result.show
  type: display
  displayName: Show Generation Result
  configJson:
    stepConfigVersion: 1
    contract: display.v1
    title: Finalize Project Context
    tabs:
      - key: artifact
        title: Project Context Artifact
        content: <PlateDocument>
      - key: validation
        title: Validation Result
        content: <PlateDocument>
      - key: traceability
        title: Traceability
        content: <PlateDocument>
  guidanceJson: >
    Present generated artifact, validation status, and traceability mapping.
  source_refs:
    - _bmad/bmm/workflows/generate-project-context/steps/step-03-complete.md:51
```

### 3.9.a Step Config Validation Expectations (Contract Hardening)

- Every step config must declare `stepConfigVersion` and `contract` matching step `type`.
- `form.v1` intake steps must be used when required durable facts may be missing at run start.
- `agent.v1` steps must resolve `agentId` to `methodology_agent_types.key` and declare deterministic completion conditions.
- `invoke.v1` steps must resolve workflow references only from transition-bound workflows and declare error policy (`onChildError`).
- `branch.v1` steps must provide deterministic routing (`defaultNext`) and bounded branch conditions.
- `action.v1` and `display.v1` steps must declare explicit outputs/blocks; no implicit side effects.
- All variable references in config values (`{{...}}` or key refs) must resolve from runtime context/facts before execution.
- Config validation executes at publish time and again at run-start snapshot build.

### 3.9.b Agent Tool Interface and Availability Lock

Tool interface policy for both `chiron` and `opencode` agent kinds:

```yaml
toolPolicy:
  interface: shared-agent-tool-contract
  transportAdapters:
    - chiron-native-tools
    - mcp-open-adapter
  categories:
    context.read:
      scope:
        - runtime.variables
        - project-facts
        - work-unit-state
        - artifact-snapshots
      mutationAllowed: false
    action.perform:
      scope:
        - project-facts
        - runtime.variables
        - artifacts
      operationsAllowed: [create, update, delete]
      readAllowed: false
  availability:
    gatingSource: requiredVariables
    unlockWhen:
      - requiredVariables.allSet
    lockWhen:
      - targetVariable.isSet
    serverEnforced: true
    uiHints:
      showUnavailableReason: true
      hideWhenLocked: true
```

Notes:
- Tool gating is deterministic and enforced server-side at invocation.
- Progressive unlock pattern is required (Mastra-era behavior retained).
- For Slice A/B active path, `greenfield.discovery.agent` should expose only the minimum `context.read` + constrained `action.perform` tools needed to set downstream variables.

Greenfield tool contract lock (`greenfield.discovery.agent`):

```yaml
tools:
  - name: set_project_description
    toolType: update-variable
    targetVariable: facts.projectDescription
    inputSchema:
      type: object
      properties:
        projectDescription:
          type: string
          minLength: 24
          maxLength: 4000
      required: [projectDescription]
    outputValidation:
      rules:
        - kind: string-length
          min: 24
          max: 4000

  - name: set_delivery_mode
    toolType: ax-generate
    targetVariable: facts.deliveryMode
    requiredVariables: [facts.projectDescription]
    inputSchema:
      type: object
      properties:
        projectDescription:
          type: string
      required: [projectDescription]
    outputSchema:
      type: object
      properties:
        deliveryMode:
          type: string
          enum: [prototype, mvp, production]
        confidence:
          type: number
          minimum: 0
          maximum: 1
        rationale:
          type: string
      required: [deliveryMode, confidence]
    applyResult:
      valuePath: deliveryMode
      writeTo: facts.deliveryMode

  - name: set_discovery_summary
    toolType: update-variable
    targetVariable: context.discoverySummary
    requiredVariables: [facts.projectDescription, facts.deliveryMode]
    inputSchema:
      type: object
      properties:
        discoverySummary:
          type: string
          minLength: 16
          maxLength: 4000
      required: [discoverySummary]
```

### 3.9.c Locked Step Sequence (Pre-Config Freeze)

This subsection is the authoritative lock for step order before final step-type config details.

`document-project` (`WU.PROJECT_CONTEXT` primary transition workflow)

```yaml
steps:
  - intake.capture            # form
  - projectType.route         # branch

  # greenfield path
  - greenfield.discovery.agent   # agent
  - greenfield.paths.capture     # form
  - greenfield.bootstrap.action  # action (bootstrap artifact snapshot + git init/commit)
  - greenfield.summary.show      # display

  # brownfield path
  - brownfield.paths.capture     # form
  - brownfield.discovery.agent   # agent (opencode)
  - brownfield.context.route     # branch (uses needsContextGeneration)
  - brownfield.context.invoke    # invoke generate-project-context when true
  - brownfield.summary.show      # display
```

`generate-project-context` (invoked sub-workflow)

```yaml
ioContract:
  inputs:
    - projectType
    - projectRootPath
    - projectKnowledgePath
    - existingIndexPath?      # optional
    - discoverySummary
  outputs:
    - outputArtifactPath
    - artifactSnapshotId
    - contextGenerationStatus
    - validationResult
    - traceabilityMap

steps:
  - inputs.confirm           # form
  - context.generate         # agent
  - artifact.snapshot.save   # action
  - result.show              # display
```

Locked note:
- Shared prefix for both greenfield and brownfield paths is fixed: `intake.capture` then `projectType.route`.
- `project-context-bootstrap.json` is the greenfield bootstrap artifact snapshot for MVP multi-format template coverage.
- `greenfield.paths.capture` is the first path-capture step for greenfield (`projectRootPath`, `projectKnowledgePath`) and runs after `projectType.route` and `greenfield.discovery.agent`.
- `greenfield.bootstrap.action` must include: (a) ensure git repository is initialized if missing, (b) persist bootstrap snapshot artifact, (c) commit snapshot change and capture commit SHA as workflow evidence.

Greenfield path detailed config lock:

```yaml
- key: intake.capture
  type: form
  configJson:
    contract: form.v1
    fields:
      - id: projectType
        type: select
        required: true
        options:
          - value: greenfield
          - value: brownfield
    outputVariables: [facts.projectType]

- key: greenfield.paths.capture
  type: form
  configJson:
    contract: form.v1
    fields:
      - id: projectRootPath
        validationJson:
          rules:
            - kind: path
              path:
                pathKind: directory
                normalization: { mode: posix, trimWhitespace: true }
                safety: { disallowAbsolute: false, preventTraversal: true }
      - id: projectKnowledgePath
        validationJson:
          rules:
            - kind: path
              path:
                pathKind: directory
                normalization: { mode: posix, trimWhitespace: true }
                safety: { disallowAbsolute: true, preventTraversal: true }
            - kind: under-root
              underRoot: { rootFactKey: projectRootPath }
    outputVariables: [facts.projectRootPath, facts.projectKnowledgePath]

- key: greenfield.bootstrap.action
  type: action
  configJson:
    contract: action.v1
    executionMode: sequential
    actions:
      - id: git.ensure.init
        kind: git
        operation: init-if-missing
        outputVariable: context.gitInitStatus
      - id: bootstrap.render
        kind: variable
        operation: set
        outputVariable: context.bootstrapPayload
      - id: bootstrap.snapshot.upsert
        kind: artifact
        operation: snapshot-upsert
        params:
          artifactSlotKey: project-context-bootstrap
          artifactFileName: project-context-bootstrap.json
          contentVariable: context.bootstrapPayload
        outputVariable: context.bootstrapSnapshot
      - id: bootstrap.commit
        kind: git
        operation: commit
        params:
          message: "chore(project-context): add bootstrap snapshot artifact"
          includePaths: ["{{projectKnowledgePath}}/project-context-bootstrap.json"]
        outputVariable: context.bootstrapCommit
```

Display contract implementation note (`greenfield.summary.show`):
- `display.v1` content is rendered via Plate.
- Delivery must include Plate installation plus custom entity plugins for workflow entities referenced by summary tabs/blocks (at minimum: facts, artifact snapshot, commit evidence, traceability links).

Brownfield path detailed config lock:

```yaml
- key: projectType.route
  type: branch
  configJson:
    contract: branch.v1
    routeVariable: facts.projectType
    branches:
      - when: { op: equals, var: facts.projectType, value: greenfield }
        next: { stepId: greenfield.discovery.agent }
      - when: { op: equals, var: facts.projectType, value: brownfield }
        next: { stepId: brownfield.paths.capture }
    defaultNext: { stepId: intake.capture }

- key: brownfield.paths.capture
  type: form
  configJson:
    contract: form.v1
    fields:
      - id: projectRootPath
        validationJson:
          rules:
            - kind: path
              path:
                pathKind: directory
                normalization: { mode: posix, trimWhitespace: true }
                safety: { disallowAbsolute: false, preventTraversal: true }
      - id: projectKnowledgePath
        validationJson:
          rules:
            - kind: path
              path:
                pathKind: directory
                normalization: { mode: posix, trimWhitespace: true }
                safety: { disallowAbsolute: true, preventTraversal: true }
            - kind: under-root
              underRoot: { rootFactKey: projectRootPath }
      - id: existingIndexPath
        required: false
        validationJson:
          rules:
            - kind: path
              path:
                pathKind: file
                normalization: { mode: posix, trimWhitespace: true }
                safety: { disallowAbsolute: true, preventTraversal: true }
            - kind: under-root
              underRoot: { rootFactKey: projectRootPath }
    outputVariables: [facts.projectRootPath, facts.projectKnowledgePath, facts.existingIndexPath]

- key: brownfield.discovery.agent
  type: agent
  configJson:
    contract: agent.v1
    agentKind: opencode
    agentId: project-context-analyst
    contextAccess:
      context.read: [runtime.variables, project-facts, work-unit-state, artifact-snapshots]
      action.perform: [update-variable]
    tools:
      - name: set_discovery_summary
        toolType: update-variable
        targetVariable: context.discoverySummary
        requiredVariables: [facts.projectRootPath, facts.projectKnowledgePath]
      - name: set_needs_context_generation
        toolType: ax-generate
        targetVariable: runtime.needsContextGeneration
        requiredVariables: [context.discoverySummary]
        outputSchema:
          type: object
          properties:
            needsContextGeneration: { type: boolean }
            confidence: { type: number, minimum: 0, maximum: 1 }
            rationale: { type: string }
          required: [needsContextGeneration, confidence]
        applyResult:
          valuePath: needsContextGeneration
          writeTo: runtime.needsContextGeneration
      - name: set_brownfield_findings
        toolType: update-variable
        targetVariable: context.brownfieldFindings
        requiredVariables: [runtime.needsContextGeneration]
    completionConditions:
      - type: all-variables-set
        requiredVariables: [context.discoverySummary, runtime.needsContextGeneration]

- key: brownfield.context.route
  type: branch
  configJson:
    contract: branch.v1
    routeVariable: runtime.needsContextGeneration
    branches:
      - when: { op: equals, var: runtime.needsContextGeneration, value: true }
        next: { stepId: brownfield.context.invoke }
      - when: { op: equals, var: runtime.needsContextGeneration, value: false }
        next: { stepId: brownfield.summary.show }
    defaultNext: { stepId: brownfield.summary.show }

- key: brownfield.context.invoke
  type: invoke
  configJson:
    contract: invoke.v1
    bindingMode: same_work_unit
    executionMode: single
    workflowRef: generate-project-context
    waitForCompletion: true
    onChildError: fail
    inputMapping:
      projectType: facts.projectType
      projectRootPath: facts.projectRootPath
      projectKnowledgePath: facts.projectKnowledgePath
      existingIndexPath: facts.existingIndexPath
      discoverySummary: context.discoverySummary
    output:
      mode: variables
      target: context.contextGeneration

- key: brownfield.summary.show
  type: display
  configJson:
    contract: display.v1
    title: Brownfield Context Summary
    tabs:
      - key: intake
        title: Intake Facts
        content: <PlateDocument>
      - key: discovery
        title: Discovery Findings
        content: <PlateDocument>
      - key: generation
        title: Context Generation Result
        content: <PlateDocument>
      - key: evidence
        title: Artifacts and Evidence
        content: <PlateDocument>
```

### 3.10 methodology_workflow_edges

```yaml
- id: seed:wf-edge:document-project:intake.capture->projectType.route
  methodologyVersionId: mver_bmad_project_context_only_draft
  workflowId: seed:wf:document-project
  fromStepId: seed:wf-step:document-project:intake.capture
  toStepId: seed:wf-step:document-project:projectType.route
  edgeKey: intake.capture->projectType.route
  conditionJson: null
  guidanceJson: Intake must complete before deterministic project-type routing.

- id: seed:wf-edge:document-project:projectType.route->greenfield.discovery.agent
  methodologyVersionId: mver_bmad_project_context_only_draft
  workflowId: seed:wf:document-project
  fromStepId: seed:wf-step:document-project:projectType.route
  toStepId: seed:wf-step:document-project:greenfield.discovery.agent
  edgeKey: projectType.route->greenfield.discovery.agent
  conditionJson: { project_type: greenfield }
  guidanceJson: Route to greenfield discovery when project type is greenfield.

- id: seed:wf-edge:document-project:greenfield.discovery.agent->greenfield.paths.capture
  methodologyVersionId: mver_bmad_project_context_only_draft
  workflowId: seed:wf:document-project
  fromStepId: seed:wf-step:document-project:greenfield.discovery.agent
  toStepId: seed:wf-step:document-project:greenfield.paths.capture
  edgeKey: greenfield.discovery.agent->greenfield.paths.capture
  conditionJson: null
  guidanceJson: Capture project paths after greenfield discovery facts are set.

- id: seed:wf-edge:document-project:greenfield.paths.capture->greenfield.bootstrap.action
  methodologyVersionId: mver_bmad_project_context_only_draft
  workflowId: seed:wf:document-project
  fromStepId: seed:wf-step:document-project:greenfield.paths.capture
  toStepId: seed:wf-step:document-project:greenfield.bootstrap.action
  edgeKey: greenfield.paths.capture->greenfield.bootstrap.action
  conditionJson: null
  guidanceJson: Bootstrap runs after validated root/knowledge paths are captured.

- id: seed:wf-edge:document-project:greenfield.bootstrap.action->greenfield.summary.show
  methodologyVersionId: mver_bmad_project_context_only_draft
  workflowId: seed:wf:document-project
  fromStepId: seed:wf-step:document-project:greenfield.bootstrap.action
  toStepId: seed:wf-step:document-project:greenfield.summary.show
  edgeKey: greenfield.bootstrap.action->greenfield.summary.show
  conditionJson: null
  guidanceJson: Show greenfield summary only after bootstrap snapshot and git evidence are produced.

- id: seed:wf-edge:document-project:projectType.route->brownfield.paths.capture
  methodologyVersionId: mver_bmad_project_context_only_draft
  workflowId: seed:wf:document-project
  fromStepId: seed:wf-step:document-project:projectType.route
  toStepId: seed:wf-step:document-project:brownfield.paths.capture
  edgeKey: projectType.route->brownfield.paths.capture
  conditionJson: { project_type: brownfield }
  guidanceJson: Route to brownfield flow when project type is brownfield.

- id: seed:wf-edge:document-project:brownfield.paths.capture->brownfield.discovery.agent
  methodologyVersionId: mver_bmad_project_context_only_draft
  workflowId: seed:wf:document-project
  fromStepId: seed:wf-step:document-project:brownfield.paths.capture
  toStepId: seed:wf-step:document-project:brownfield.discovery.agent
  edgeKey: brownfield.paths.capture->brownfield.discovery.agent
  conditionJson: null
  guidanceJson: Run brownfield discovery after path capture.

- id: seed:wf-edge:document-project:brownfield.discovery.agent->brownfield.context.route
  methodologyVersionId: mver_bmad_project_context_only_draft
  workflowId: seed:wf:document-project
  fromStepId: seed:wf-step:document-project:brownfield.discovery.agent
  toStepId: seed:wf-step:document-project:brownfield.context.route
  edgeKey: brownfield.discovery.agent->brownfield.context.route
  conditionJson: null
  guidanceJson: Route brownfield completion behavior using needs-context-generation decision.

- id: seed:wf-edge:document-project:brownfield.context.route->brownfield.context.invoke
  methodologyVersionId: mver_bmad_project_context_only_draft
  workflowId: seed:wf:document-project
  fromStepId: seed:wf-step:document-project:brownfield.context.route
  toStepId: seed:wf-step:document-project:brownfield.context.invoke
  edgeKey: brownfield.context.route->brownfield.context.invoke
  conditionJson: { needs_context_generation: true }
  guidanceJson: Invoke generate-project-context when brownfield context generation is required.

- id: seed:wf-edge:document-project:brownfield.context.route->brownfield.summary.show
  methodologyVersionId: mver_bmad_project_context_only_draft
  workflowId: seed:wf:document-project
  fromStepId: seed:wf-step:document-project:brownfield.context.route
  toStepId: seed:wf-step:document-project:brownfield.summary.show
  edgeKey: brownfield.context.route->brownfield.summary.show
  conditionJson: { needs_context_generation: false }
  guidanceJson: Skip invocation when reusable context is sufficient.

- id: seed:wf-edge:document-project:brownfield.context.invoke->brownfield.summary.show
  methodologyVersionId: mver_bmad_project_context_only_draft
  workflowId: seed:wf:document-project
  fromStepId: seed:wf-step:document-project:brownfield.context.invoke
  toStepId: seed:wf-step:document-project:brownfield.summary.show
  edgeKey: brownfield.context.invoke->brownfield.summary.show
  conditionJson: null
  guidanceJson: Show brownfield summary after invoke completion.

- id: seed:wf-edge:generate-project-context:inputs.confirm->context.generate
  methodologyVersionId: mver_bmad_project_context_only_draft
  workflowId: seed:wf:generate-project-context
  fromStepId: seed:wf-step:generate-project-context:inputs.confirm
  toStepId: seed:wf-step:generate-project-context:context.generate
  edgeKey: inputs.confirm->context.generate
  conditionJson: null
  guidanceJson: Start generation after input confirmation.

- id: seed:wf-edge:generate-project-context:context.generate->artifact.snapshot.save
  methodologyVersionId: mver_bmad_project_context_only_draft
  workflowId: seed:wf:generate-project-context
  fromStepId: seed:wf-step:generate-project-context:context.generate
  toStepId: seed:wf-step:generate-project-context:artifact.snapshot.save
  edgeKey: context.generate->artifact.snapshot.save
  conditionJson: { context_generation_status: generated }
  guidanceJson: Persist generated artifact snapshot once generation succeeds.

- id: seed:wf-edge:generate-project-context:artifact.snapshot.save->result.show
  methodologyVersionId: mver_bmad_project_context_only_draft
  workflowId: seed:wf:generate-project-context
  fromStepId: seed:wf-step:generate-project-context:artifact.snapshot.save
  toStepId: seed:wf-step:generate-project-context:result.show
  edgeKey: artifact.snapshot.save->result.show
  conditionJson: null
  guidanceJson: Display result only after snapshot persistence completes.
```

### 3.11 methodology_transition_workflow_bindings

```yaml
- id: seed:binding:wu.project_context:absent_done:document-project
  methodologyVersionId: mver_bmad_project_context_only_draft
  transitionId: seed:transition:wu.project_context:absent_done
  workflowId: seed:wf:document-project
  guidanceJson: Single transition workflow for project-context lifecycle in this slice.
```

### 3.12 methodology_link_type_definitions

```yaml
[]
```

## 4) Guidance Coverage Check

Guidance is now explicitly present for:
- `methodology_workflows.guidanceJson`
- `methodology_workflow_steps.guidanceJson`
- `methodology_workflow_edges.guidanceJson`
- `methodology_fact_schemas.guidanceJson`
- `methodology_fact_definitions.guidanceJson`

## 5) Step-by-Step Review Plan (Before Seeding)

1. Lock lifecycle for `WU.PROJECT_CONTEXT`: confirm single transition `__absent__ -> done`.
2. Lock fact schema semantics: confirm path validation policy for `projectRootPath`, `projectKnowledgePath`, `existingIndexPath`.
3. Review `document-project` steps one-by-one against `_bmad` instructions and checklist.
4. Review `generate-project-context` steps one-by-one against step docs and template.
5. Lock agent assignment per step (`analyst` for discovery-heavy flow, `tech-writer` for generation/refinement flow).
6. Lock transition-workflow binding for the single transition lifecycle.

## 6) Regression Guardrail: definitionExtensions Incident

This mapping is explicitly hardened against the Epic 2 authority drift incident.

1. Canonical table-backed fields are authoritative; `definition_extensions_json` is non-canonical.
2. `definition_extensions_json` is disabled for this mapping flow (no canonical read/write, no fallback usage).
3. No API/projection exposure of extension payload for this mapping flow.
4. Forbidden extension keys for canonical domains are documented and must stay blocked.

Source refs:
- `docs/architecture/methodology-canonical-authority.md:10`
- `docs/architecture/methodology-canonical-authority.md:35`
- `docs/architecture/methodology-canonical-authority.md:56`

## 7) Current Chiron Reality Check (Execution-Layer Constraints)

This section captures current implementation constraints so Epic 3 planning stays grounded.

1. Step types are locked, but step config contracts are not yet strongly typed.
   - `form|agent|action|invoke|branch|display` are enforced.
   - `workflow_steps.config_json` is currently opaque JSON.
   - Implication: this mapping doc is richer than current config validators; Epic 3 must add step-type-specific config schemas.

2. Branch routing conditions already exist on workflow edges.
   - Branch behavior today is validated through outgoing edge conditions.
   - Implication: richer branch semantics should evolve edge condition schema, not ad hoc keys.

3. Transition gating target is phase-specific `transition_condition_sets`.
   - Current implementation still uses `requiredLinks` in contracts/schema.
   - Implication: Story 2.7 is the migration gate to introduce canonical condition-set storage/evaluation and retire required-links authority.

4. Facts currently separate into work-unit and methodology scope.
    - Work-unit facts: `methodology_fact_schemas`.
    - Methodology defaults: `methodology_fact_definitions`.
    - Story 2.7 introduces canonical project-level fact storage in the `project-context` module; runtime values should not be read from methodology tables.

## 8) Epic 3 Hardening Proposals from This Mapping

1. Add typed step config schemas per step type (`form`, `agent`, `action`, `invoke`, `branch`, `display`) and validate at API boundary.
2. Move allowed-value constraints from prose into explicit `validationJson` entries where applicable.
3. Keep edge conditions as canonical branch-routing source and define deterministic evaluation order.
4. Implement transition condition sets as canonical model and define deterministic migration from required-links.
5. Define agent prompt strategy explicitly:
   - static source refs (`_bmad/...` + `.opencode/...` wrapper),
   - runtime session prompt overlay/chat object for evolving context during execution.

## 9) Locked Decisions (Mapping Complete for Seed Scope)

Locked decisions:

1. Keep single-work-unit model: `WU.PROJECT_CONTEXT` only for this mapping.
2. Keep single transition lifecycle: `__absent__ -> done`.
3. Disable `definition_extensions_json` for this flow (no read/write/fallback).
4. Use transition condition sets as target model; treat `transition_required_links` as migration debt.
5. Keep project ownership in `project-context` module boundary for this flow.

6. Keep final agent assignment for v1:
    - `document-project` discovery/orchestration with analyst profile,
    - `generate-project-context` rule-writing with tech-writer profile.
7. Add no extra project-context-specific methodology-level facts in v1 beyond language/output defaults.
8. Keep `document-project` as intake-first: `form` bootstrap before action/branch/invoke sequence.
