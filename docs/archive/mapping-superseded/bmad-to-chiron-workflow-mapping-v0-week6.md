# BMAD -> Chiron Workflow Mapping v0 (All Manifest Workflows)

Date: 2026-02-18
Status: Superseded baseline (kept for lineage)
Scope: All workflows from `_bmad/_config/workflow-manifest.csv`

> Superseded by:
> - `_bmad-output/planning-artifacts/bmad-to-chiron-step-config-stubs-v1-week6.md`
> - `_bmad-output/planning-artifacts/bmad-to-chiron-step-config-resolved-v1-week6.md`
> - `_bmad-output/planning-artifacts/bmad-work-unit-catalog-v1-week6.md`

## 1) Mapping Rules Used

- Workflow ownership scope: `methodologyVersion + workUnitType`.
- Transition authority: `transition_allowed_workflows`.
- Gate model: two gates only (`start_gate`, `completion_gate`).
- Step system: only `form`, `agent`, `action`, `invoke`, `branch`, `display`.
- Invoke defaults:
  - techniques/subroutines: `same_work_unit`
  - fan-out entities (stories/tests by item): `child_work_units`

## 2) Reusable Step-Config Blueprints

These blueprint IDs are referenced by every workflow mapping below.

### B01 Intake Form

- `type: form`
- Required fields:
  - `target_ref` (string/path/artifact)
  - `goal` (text)
  - `mode` (enum)
  - `constraints` (text, optional)
- Outputs:
  - `input_context` (`var_type: input_context_ref`)

### B02 Context Discovery Action

- `type: action`
- Actions:
  - discover/load artifacts
  - set runtime vars
  - initialize output file if needed
- Outputs:
  - `context_bundle` (`var_type: context_bundle_ref`)

### B03 Analysis Agent

- `type: agent`
- `agentKind: chiron`
- Typical tools: read/search/ax-generation selection tools
- Outputs:
  - `analysis_summary` (`var_type: analysis_ref`)

### B04 Generation Agent

- `type: agent`
- `agentKind: chiron|opencode` (per workflow)
- Produces core artifact content/spec/code/test plan
- Outputs:
  - `generated_output` (`var_type: artifact_ref`)

### B05 Validation Agent

- `type: agent`
- adversarial/quality checks
- Outputs:
  - `validation_report` (`var_type: review_report_ref`)

### B06 Routing Branch

- `type: branch`
- routes by mode/phase/risk/readiness

### B07 Invoke Fan-Out

- `type: invoke`
- `bindingMode: same_work_unit|child_work_units`
- child execution output capture in namespace/variables mode

### B08 Persist Action

- `type: action`
- write/update artifact(s), update state/status file, record outputs
- Outputs:
  - `persisted_artifact` (`var_type: artifact_ref`)

### B09 Summary Display

- `type: display`
- present outcomes, pending actions, recommended next workflow

## 3) Core Module Mappings

| workflow | workUnitType | transition edge | step chain | invoke mode | expected gate evidence |
|---|---|---|---|---|---|
| brainstorming | brainstorming | `draft -> done` | B01 -> B03 -> B07 -> B03 -> B08 -> B09 | `same_work_unit` | `analysis_ref`, `artifact_ref` |
| party-mode | facilitation-session | `draft -> done` | B02 -> B01 -> B03 -> B09 | none | `analysis_ref` |

## 4) BMM Module Mappings

### 4.1 Analysis

| workflow | workUnitType | transition edge | step chain | invoke mode | expected gate evidence |
|---|---|---|---|---|---|
| create-product-brief | product-brief | `draft -> done` | B01 -> B03 -> B04 -> B08 -> B09 | none | `artifact_ref` |
| domain-research | research | `draft -> done` | B01 -> B03 -> B04 -> B08 -> B09 | none | `artifact_ref` |
| market-research | research | `draft -> done` | B01 -> B03 -> B04 -> B08 -> B09 | none | `artifact_ref` |
| technical-research | research | `draft -> done` | B01 -> B03 -> B04 -> B08 -> B09 | none | `artifact_ref` |

### 4.2 Planning

| workflow | workUnitType | transition edge | step chain | invoke mode | expected gate evidence |
|---|---|---|---|---|---|
| create-prd | prd | `draft -> done` | B01 -> B02 -> B03 -> B04 -> B08 -> B09 | none | `artifact_ref` |
| edit-prd | prd | `done -> review` | B01 -> B02 -> B03 -> B04 -> B08 -> B09 | none | `artifact_ref`, `review_report_ref` |
| validate-prd | prd | `done -> review` | B01 -> B02 -> B05 -> B08 -> B09 | none | `review_report_ref` |
| create-ux-design | ux-design | `draft -> done` | B01 -> B02 -> B03 -> B04 -> B08 -> B09 | none | `artifact_ref` |

### 4.3 Solutioning

| workflow | workUnitType | transition edge | step chain | invoke mode | expected gate evidence |
|---|---|---|---|---|---|
| check-implementation-readiness | implementation-readiness | `draft -> done` | B02 -> B05 -> B06 -> B08 -> B09 | none | `review_report_ref` |
| create-architecture | architecture | `draft -> done` | B01 -> B02 -> B03 -> B04 -> B08 -> B09 | none | `artifact_ref` |
| create-epics-and-stories | epic-planning | `draft -> done` | B02 -> B03 -> B07 -> B08 -> B09 | `child_work_units` (story creation fan-out optional) | `artifact_ref` |

### 4.4 Implementation

| workflow | workUnitType | transition edge | step chain | invoke mode | expected gate evidence |
|---|---|---|---|---|---|
| code-review | story | `review -> review` | B02 -> B05 -> B06 -> B08 -> B09 | none | `review_report_ref` |
| correct-course | change-proposal | `draft -> done` | B01 -> B02 -> B05 -> B06 -> B08 -> B09 | none | `artifact_ref`, `review_report_ref` |
| create-story | story | `__absent__ -> draft` | B02 -> B03 -> B04 -> B08 -> B09 | none | `artifact_ref` |
| dev-story | story | `ready -> review` | B02 -> B03 -> B04 -> B05 -> B08 -> B09 | none | `code_change_ref`, `test_report_ref` |
| retrospective | retrospective | `draft -> done` | B01 -> B02 -> B03 -> B04 -> B08 -> B09 | none | `artifact_ref` |
| sprint-planning | sprint-plan | `draft -> done` | B02 -> B03 -> B08 -> B09 | none | `artifact_ref` |
| sprint-status | sprint-plan | `done -> done` | B02 -> B03 -> B06 -> B09 | none | `analysis_ref` |

### 4.5 Quick Flow + Utility

| workflow | workUnitType | transition edge | step chain | invoke mode | expected gate evidence |
|---|---|---|---|---|---|
| quick-dev | story | `ready -> review` | B01 -> B02 -> B06 -> B04 -> B05 -> B08 -> B09 | none | `code_change_ref`, `test_report_ref` |
| quick-spec | tech-spec | `draft -> done` | B01 -> B02 -> B03 -> B04 -> B08 -> B09 | none | `artifact_ref` |
| document-project | project-context | `draft -> done` | B01 -> B02 -> B06 -> B07 -> B08 -> B09 | `same_work_unit` | `artifact_ref` |
| generate-project-context | project-context | `draft -> done` | B02 -> B03 -> B04 -> B08 -> B09 | none | `artifact_ref` |
| qa-automate | test-automation | `draft -> done` | B01 -> B02 -> B03 -> B04 -> B08 -> B09 | none | `test_report_ref` |

## 5) TEA Module Mappings

| workflow | workUnitType | transition edge | step chain | invoke mode | expected gate evidence |
|---|---|---|---|---|---|
| testarch-atdd | test-architecture | `draft -> done` | B01 -> B02 -> B03 -> B04 -> B08 -> B09 | none | `test_report_ref` |
| testarch-automate | test-automation | `draft -> done` | B01 -> B02 -> B06 -> B04 -> B08 -> B09 | optional `child_work_units` by target | `test_report_ref` |
| testarch-ci | ci-quality | `draft -> done` | B01 -> B02 -> B03 -> B04 -> B08 -> B09 | none | `artifact_ref` |
| testarch-framework | test-framework | `draft -> done` | B01 -> B02 -> B06 -> B04 -> B08 -> B09 | none | `artifact_ref` |
| testarch-nfr | nfr-assessment | `draft -> done` | B01 -> B02 -> B07 -> B05 -> B08 -> B09 | `same_work_unit` (category loops) | `review_report_ref` |
| teach-me-testing | learning-track | `draft -> done` | B01 -> B03 -> B06 -> B07 -> B09 | `same_work_unit` | `artifact_ref` |
| testarch-test-design | test-design | `draft -> done` | B01 -> B02 -> B06 -> B07 -> B08 -> B09 | `same_work_unit` | `artifact_ref` |
| testarch-test-review | test-review | `draft -> done` | B01 -> B02 -> B06 -> B05 -> B08 -> B09 | none | `review_report_ref` |
| testarch-trace | test-traceability | `draft -> done` | B01 -> B02 -> B03 -> B05 -> B08 -> B09 | none | `review_report_ref`, `artifact_ref` |

## 6) CIS Module Mappings

| workflow | workUnitType | transition edge | step chain | invoke mode | expected gate evidence |
|---|---|---|---|---|---|
| design-thinking | design-facilitation | `draft -> done` | B01 -> B03 -> B07 -> B04 -> B08 -> B09 | `same_work_unit` (phase/method loops) | `artifact_ref` |
| innovation-strategy | strategy-facilitation | `draft -> done` | B01 -> B03 -> B07 -> B04 -> B08 -> B09 | `same_work_unit` | `artifact_ref` |
| problem-solving | problem-solving | `draft -> done` | B01 -> B03 -> B07 -> B04 -> B08 -> B09 | `same_work_unit` | `artifact_ref` |
| storytelling | storytelling | `draft -> done` | B01 -> B03 -> B06 -> B04 -> B08 -> B09 | none | `artifact_ref` |

## 7) Transition-Workflow Binding Notes

### Brainstorming techniques

- Define technique workflows under `workUnitType=brainstorming` in `workflow_definitions`.
- Bind them through `transition_allowed_workflows` for `brainstorming:draft->done`.
- Selection step uses `ax-generation` against transition-allowed options.
- Invoke uses `bindingMode=same_work_unit`.

### Story fan-out

- In `create-epics-and-stories`, if story materialization is automated:
  - invoke uses `bindingMode=child_work_units`
  - each item triggers story activation transition (`__absent__->draft`)

## 8) Immediate Next Artifacts

1. `workflow_definitions` seed map for all 38 workflows.
2. `transition_allowed_workflows` seed map by workUnitType + transition edge.
3. Step-config JSON skeletons for each workflow using B01-B09 blueprint IDs.
4. Completion-gate requirement presets by workUnitType (artifact/test/review evidence).
