# BMAD Methodology Snapshot

Date: 2026-02-14  
Primary sources in repo: `_bmad/bmm/`, `_bmad/core/`  
This doc is a temporary working snapshot. It mixes "From repo" facts with "Proposed" mappings into Chiron’s methodology/work-item/state-machine model.

## 1) BMAD overview (as implemented here)

From repo: `_bmad/bmm/module-help.csv` models BMAD as 4 phases plus "anytime" workflows.

- Phase 1: Analysis
  - Brainstorming + research + product brief
- Phase 2: Planning
  - PRD + UX (optional) + PRD validation/edit
- Phase 3: Solutioning
  - Architecture + epics/stories + readiness check
- Phase 4: Implementation
  - sprint planning/status + story cycle (create -> dev -> review -> QA) + retrospective

From repo: output locations are configured via `_bmad/bmm/config.yaml`:

- `planning_artifacts`: `_bmad-output/planning-artifacts`
- `implementation_artifacts`: `_bmad-output/implementation-artifacts`
- `project_knowledge`: `docs`

Anytime workflows (from repo):

- Document Project (brownfield onboarding)
- Generate Project Context (AI context file)
- Quick Spec / Quick Dev (quick-flow)
- Correct Course (sprint change/navigation)
- Tech-writer suite (agent-based, no slash command)

## 2) User journeys

### 2.1 Greenfield

From repo: canonical sequence implied by phase order.

1) Phase 1 (Analysis)
- BP Brainstorm Project (optional)
- MR/DR/TR research (optional)
- CB Create Brief

2) Phase 2 (Planning)
- CP Create PRD (required)
- VP Validate PRD (optional)
- EP Edit PRD (optional)
- CU Create UX Design (optional)

3) Phase 3 (Solutioning)
- CA Create Architecture (required)
- CE Create Epics & Stories (required)
- IR Implementation Readiness (required)

4) Phase 4 (Implementation)
- SP Sprint Planning (required)
- CS Create Story (required)
- DS Dev Story (required)
- CR Code Review (optional but recommended)
- QA QA Automate (optional)
- ER Retrospective (optional)
- SS Sprint Status (anytime)

### 2.2 Brownfield

From repo: brownfield preflight is captured as anytime workflows.

1) DP Document Project
- Generates project knowledge in `docs/`.

2) GPC Generate Project Context
- Generates a compact agent-oriented context file in `_bmad-output/`.

3) Choose track
- Full BMAD (phases 1-4) for substantial work.
- Quick Flow for small bounded changes:
  - QS Quick Spec -> QD Quick Dev

## 3) Workflow catalog (BMM)

This section is keyed by `_bmad/bmm/module-help.csv`.

Notation:

- Command names here are shown without leading `/`. In this environment, they are used as `/bmad-...`.
- "Outputs" are as described by the module help registry plus any obvious file artifacts.
- "Step sequence" is listed when the workflow is implemented as step files; otherwise it is described at a high level.

### Anytime workflows

#### DP Document Project

- Command: `bmad-bmm-document-project`
- Purpose: brownfield analysis and documentation.
- Outputs (from repo): `*` to `project_knowledge` (docs).
- Workflow file (from repo): `_bmad/bmm/workflows/document-project/workflow.yaml`
- Step sequence (from repo): workflow.yaml-driven; generates index/tree/deep-dive docs.
- Proposed work item mapping:
  - Type: `documentation.project`
  - Status: `draft -> published`

#### GPC Generate Project Context

- Command: `bmad-bmm-generate-project-context`
- Purpose: produce AI-optimized `project-context.md`.
- Outputs (from repo): `project context` to `output_folder`.
- Workflow file (from repo): `_bmad/bmm/workflows/generate-project-context/workflow.md`
- Step sequence (from repo): step-based (discover -> generate -> complete).
- Proposed mapping:
  - Type: `context.snapshot`
  - Status: `draft -> published`

#### QS Quick Spec

- Command: `bmad-bmm-quick-spec`
- Purpose: generate a tech spec for a bounded change.
- Outputs (from repo): `tech spec` to `planning_artifacts`.
- Workflow file (from repo): `_bmad/bmm/workflows/bmad-quick-flow/quick-spec/workflow.md`
- Step sequence (from repo): understand -> investigate -> generate -> review.
- Proposed mapping:
  - Type: `spec.quick`
  - Status: `draft -> approved`

#### QD Quick Dev

- Command: `bmad-bmm-quick-dev`
- Purpose: implement a quick spec or direct instructions.
- Outputs (from repo): implemented code (no explicit artifact list in registry).
- Workflow file (from repo): `_bmad/bmm/workflows/bmad-quick-flow/quick-dev/workflow.md`
- Step sequence (from repo): mode detection -> context gathering -> execute -> self-check -> adversarial review -> resolve.
- Proposed mapping:
  - Type: `task.quick`
  - Status: `in_progress -> done`

#### CC Correct Course

- Command: `bmad-bmm-correct-course`
- Purpose: manage significant scope/plan changes during execution.
- Outputs (from repo): `change proposal` to `planning_artifacts`.
- Workflow file (from repo): `_bmad/bmm/workflows/4-implementation/correct-course/workflow.yaml`
- Proposed mapping:
  - Type: `change.request`
  - Status: `proposed -> approved|rejected`

#### Tech-writer suite (agent-based)

From repo: these entries are agent-based (no `command` in module-help) and run via `_bmad/bmm/agents/tech-writer/tech-writer.agent.yaml`.

- WD Write Document
- US Update Standards
- MG Mermaid Generate
- VD Validate Document
- EC Explain Concept

Proposed mapping:

- Type: `documentation`
- Status: `draft -> reviewed -> published`

### Phase 1 — Analysis

#### BP Brainstorm Project

- Command: `bmad-brainstorming`
- Purpose: structured brainstorm; in BMM this uses a project context template.
- Outputs (from repo): `brainstorming session` to `planning_artifacts`.
- Workflow file (from repo): `_bmad/core/workflows/brainstorming/workflow.md`
- Proposed mapping: `research.brainstorm`.

#### MR Market Research

- Command: `bmad-bmm-market-research`
- Purpose: market discovery.
- Outputs (from repo): `research documents` to `planning_artifacts|project-knowledge`.
- Workflow file (from repo): `_bmad/bmm/workflows/1-analysis/research/market-research/workflow.yaml`

#### DR Domain Research

- Command: `bmad-bmm-domain-research`
- Purpose: domain discovery.
- Outputs (from repo): `research documents` to `planning_artifacts|project-knowledge`.
- Workflow file (from repo): `_bmad/bmm/workflows/1-analysis/research/domain-research/workflow.yaml`

#### TR Technical Research

- Command: `bmad-bmm-technical-research`
- Purpose: technical feasibility exploration.
- Outputs (from repo): `research documents` to `planning_artifacts|project-knowledge`.
- Workflow file (from repo): `_bmad/bmm/workflows/1-analysis/research/technical-research/workflow.yaml`

#### CB Create Brief

- Command: `bmad-bmm-create-product-brief`
- Purpose: convert analysis into a structured product brief.
- Outputs (from repo): `product brief` to `planning_artifacts`.
- Workflow file (from repo): `_bmad/bmm/workflows/1-analysis/create-product-brief/workflow.md`
- Step sequence (from repo): step-file sequence `steps/step-01-init.md` .. `steps/step-06-complete.md`.
- Proposed mapping:
  - Type: `artifact.product_brief`
  - Status: `draft -> published`

### Phase 2 — Planning

#### CP Create PRD (required)

- Command: `bmad-bmm-create-prd`
- Purpose: produce the PRD.
- Outputs (from repo): `prd` to `planning_artifacts`.
- Workflow file (from repo): `_bmad/bmm/workflows/2-plan-workflows/create-prd/workflow-create-prd.md`
- Proposed mapping:
  - Type: `artifact.prd`
  - Status: `draft -> published`

#### VP Validate PRD

- Command: `bmad-bmm-validate-prd`
- Purpose: validate PRD completeness.
- Outputs (from repo): `prd validation report` to `planning_artifacts`.
- Workflow file (from repo): `_bmad/bmm/workflows/2-plan-workflows/validate-prd/workflow.md`

#### EP Edit PRD

- Command: `bmad-bmm-edit-prd`
- Purpose: revise an existing PRD.
- Outputs (from repo): `updated prd` to `planning_artifacts`.
- Workflow file (from repo): `_bmad/bmm/workflows/2-plan-workflows/edit-prd/workflow.md`

#### CU Create UX Design

- Command: `bmad-bmm-create-ux-design`
- Purpose: produce a UX design spec.
- Outputs (from repo): `ux design` to `planning_artifacts`.
- Workflow file (from repo): `_bmad/bmm/workflows/2-plan-workflows/create-ux-design/workflow.md`
- Step sequence (from repo): step-file sequence `steps/step-01-init.md` .. `steps/step-14-complete.md`.

### Phase 3 — Solutioning

#### CA Create Architecture (required)

- Command: `bmad-bmm-create-architecture`
- Purpose: create architecture decisions designed to reduce agent conflict.
- Outputs (from repo): `architecture` to `planning_artifacts`.
- Workflow file (from repo): `_bmad/bmm/workflows/3-solutioning/create-architecture/workflow.md`
- Step sequence (from repo): step-file sequence `steps/step-01-init.md` .. `steps/step-08-complete.md`.

#### CE Create Epics and Stories (required)

- Command: `bmad-bmm-create-epics-and-stories`
- Purpose: turn PRD + architecture into epics and story backlog.
- Outputs (from repo): `epics and stories` to `planning_artifacts`.
- Workflow file (from repo): `_bmad/bmm/workflows/3-solutioning/create-epics-and-stories/workflow.md`

#### IR Check Implementation Readiness (required)

- Command: `bmad-bmm-check-implementation-readiness`
- Purpose: validate that PRD + arch + epics are complete enough to implement.
- Outputs (from repo): `implementation readiness report` to `planning_artifacts`.
- Workflow file (from repo): `_bmad/bmm/workflows/3-solutioning/check-implementation-readiness/workflow.md`

### Phase 4 — Implementation

#### SP Sprint Planning (required)

- Command: `bmad-bmm-sprint-planning`
- Purpose: generate sprint tracking status file from epics/stories.
- Outputs (from repo): `sprint status` to `implementation_artifacts` (typically `sprint-status.yaml`).
- Workflow file (from repo): `_bmad/bmm/workflows/4-implementation/sprint-planning/workflow.yaml`

#### SS Sprint Status

- Command: `bmad-bmm-sprint-status`
- Purpose: summarize sprint status and route to next workflow.
- Outputs (from repo): summary/routing (no explicit artifact).
- Workflow file (from repo): `_bmad/bmm/workflows/4-implementation/sprint-status/workflow.yaml`

#### CS Create Story (required)

- Command: `bmad-bmm-create-story`
- Purpose: generate the next story file in the cycle.
- Outputs (from repo): `story` to `implementation_artifacts`.
- Workflow file (from repo): `_bmad/bmm/workflows/4-implementation/create-story/workflow.yaml`

#### VS Validate Story (optional)

- Command: `bmad-bmm-create-story` (validate mode)
- Purpose: validate story readiness and completeness.
- Outputs (from repo): validation report to `implementation_artifacts`.

#### DS Dev Story (required)

- Command: `bmad-bmm-dev-story`
- Purpose: implement the story, write tests, validate.
- Outputs (from repo): implemented code + updated story file.
- Workflow file (from repo): `_bmad/bmm/workflows/4-implementation/dev-story/workflow.yaml`
- Proposed mapping:
  - Type: `work.story`
  - Status: `ready_for_dev -> in_progress -> review`

#### CR Code Review

- Command: `bmad-bmm-code-review`
- Purpose: adversarial review; if issues exist, bounce back to dev.
- Outputs (from repo): review findings + story updates.
- Workflow file (from repo): `_bmad/bmm/workflows/4-implementation/code-review/workflow.yaml`

#### QA QA Automate

- Command: `bmad-bmm-qa-automate`
- Purpose: generate test suite to improve coverage.
- Outputs (from repo): `test suite` to `implementation_artifacts`.
- Workflow file (from repo): `_bmad/bmm/workflows/qa/automate/workflow.yaml`

#### ER Retrospective

- Command: `bmad-bmm-retrospective`
- Purpose: reflect after epic completion; produce lessons learned.
- Outputs (from repo): `retrospective` to `implementation_artifacts`.
- Workflow file (from repo): `_bmad/bmm/workflows/4-implementation/retrospective/workflow.yaml`

## 4) Proposed mapping into Chiron methodology/work-items

This is proposed: BMAD becomes one Methodology Definition (versioned).

Work item types:

- `bmad.brainstorm`
- `bmad.research`
- `bmad.product_brief`
- `bmad.prd`
- `bmad.ux_design`
- `bmad.architecture`
- `bmad.epic`
- `bmad.story`
- `bmad.change_proposal`
- `bmad.review`
- `bmad.qa`
- `bmad.retrospective`

Status model (example; teams can redefine):

- Documents: `draft -> review -> published`
- Stories: `backlog -> ready_for_dev -> in_progress -> review -> done -> shipped`

Transition requirements (deterministic):

- Documents publish requires output type `artifact_ref`.
- Story `ready_for_dev -> in_progress` requires hard links to PRD and architecture work items.
- Story `review -> done` requires `test_report` output type.

## 5) How locked modules contribute (BMAD-specific)

This is a high-level mapping aligned to the locked module behaviors.

- `workflow-engine`: orchestrates the YAML/MD workflows; executes step types; manages pause/resume/interrupt.
- `agent-runtime`: runs PM/Architect/Dev/QA roles; streams; tool calls; uses compact snapshot + ctx tools.
- `template-engine`: composes prompts and renders artifact markdown; emits prompt receipts (hashes/refs).
- `variable-service`: stores step/execution/project variables; enforces scope; promotes explicit outputs.
- `tooling-engine`: approval-gated side effects (file writes, test runs, git actions).
- `sandbox-engine`: per-execution git worktrees; structured git primitives.
- `provider-registry`: resolves provider/model/credentialRef with no silent fallback.
- `event-bus`: ephemeral transport of lifecycle + stream events.
- `observability`: DB-first ledger of execution events, approvals, ctx retrievals; consent-gated export.
- `ax-engine`: optional optimizer runs for recurring steps (MiPRO+GEPA only); never auto-applies changes.
