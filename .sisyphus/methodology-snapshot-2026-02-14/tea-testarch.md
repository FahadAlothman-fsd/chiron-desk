# TEA (Test Architecture) — Methodology Snapshot

Snapshot date: 2026-02-14  
Source-of-truth for this snapshot: `_bmad/tea/`.

This is a temporary working document describing TEA as a methodology module and how it maps into Chiron’s methodology/work-item/state-machine layer.

## What TEA is

TEA is a test-architecture methodology module that produces deterministic testing artifacts (framework scaffolds, test plans, ATDD cases, automation suites, review reports, NFR assessments, trace matrices). It is designed to be executed sequentially in small “step files” to keep context tight and to support create/edit/validate modes.

From repo: `_bmad/tea/module-help.csv` defines these workflows (commands are used as slash commands in this environment):

- Teach Me Testing (`bmad_tea_teach-me-testing`) (learning track)
- Test Framework (`bmad_tea_framework`)
- CI Setup (`bmad_tea_ci`)
- Test Design (`bmad_tea_test-design`)
- ATDD (`bmad_tea_atdd`)
- Test Automation (`bmad_tea_automate`)
- Test Review (`bmad_tea_test-review`)
- NFR Assess (`bmad_tea_nfr-assess`)
- Trace (`bmad_tea_trace`)

Outputs are written under `test_artifacts` (per `_bmad/tea/config.yaml`, resolved into `_bmad-output/test-artifacts` in this repo).

## Shared execution conventions (from repo)

From `_bmad/tea/workflows/testarch/README.md`:

- TEA workflows use a step-file architecture:
  - `workflow.md` acts as a mode router (create/edit/validate)
  - `workflow.yaml` contains the workflow definition
  - `instructions.md`, `checklist.md` define rules and acceptance checks
  - `steps-c/`, `steps-e/`, `steps-v/` contain the actual sequential steps
- Hard rule: load and execute one step file at a time; do not skip or reorder.
- Validation is strict: validate mode aims for 100% compliance and produces validation reports.

## User journey: where TEA fits

Typical placements:

1) Early in implementation (before heavy coding):
  - Framework + CI + Test Design
2) During story development:
  - ATDD + Automate
3) Before shipping / after changes:
  - Test Review + Traceability + NFR Assess

TEA can run standalone, but it is most valuable when linked to work items (e.g. a story, bug, refactor) so its artifacts can satisfy deterministic transition requirements (e.g. “review -> done requires report/test”).

## Workflow reference (granular)

The table below is “from repo” for commands + outputs; the work-item mapping is “proposed”.

### Teach Me Testing (learning)

- Command: `bmad_tea_teach-me-testing`
- Purpose: structured multi-session learning with persistent progress.
- Outputs (from repo): progress file, session notes, certificate.
- Proposed work item mapping: `tea.learning` work item type; does not gate delivery transitions.

### Test Framework

- Command: `bmad_tea_framework`
- Purpose: scaffold a Playwright-based test framework and conventions.
- Outputs (from repo): framework scaffold.
- Proposed output types for methodology gating:
  - `artifact_ref` (framework scaffold manifest)
  - `file_ref` (changed files list)

### CI Setup

- Command: `bmad_tea_ci`
- Purpose: CI pipeline for running tests, collecting artifacts.
- Outputs (from repo): CI config.
- Proposed output types:
  - `artifact_ref` (ci config)
  - `file_ref`

### Test Design

- Command: `bmad_tea_test-design`
- Purpose: produce a test design document aligned to requirements.
- Outputs (from repo): test design document.
- Proposed output types:
  - `artifact_ref` (test design)

### ATDD

- Command: `bmad_tea_atdd`
- Purpose: acceptance tests defined before implementation; designed to fail-first.
- Outputs (from repo): ATDD tests.
- Proposed output types:
  - `artifact_ref` (ATDD plan)
  - `file_ref` (ATDD spec/test files)

### Test Automation

- Command: `bmad_tea_automate`
- Purpose: generate or expand automated tests using the project’s test framework.
- Outputs (from repo): test suite.
- Proposed output types:
  - `file_ref` (test files)
  - `test_report` (run results)

### Test Review

- Command: `bmad_tea_test-review`
- Purpose: review test quality and coverage; identify gaps.
- Outputs (from repo): review report.
- Proposed output types:
  - `artifact_ref` (review report)

### NFR Assessment

- Command: `bmad_tea_nfr-assess`
- Purpose: assess non-functional requirements (perf/security/reliability/etc).
- Outputs (from repo): NFR report.
- Proposed output types:
  - `artifact_ref` (NFR report)

### Traceability

- Command: `bmad_tea_trace`
- Purpose: requirements-to-tests traceability matrix and quality gate decision.
- Outputs (from repo): traceability matrix, gate decision.
- Proposed output types:
  - `artifact_ref` (trace matrix)
  - `artifact_ref` (gate decision)

## Proposed work-item types (TEA in Chiron methodology layer)

This is not in repo; it’s a suggested mapping for the methodology definition system.

- `test.framework`
- `test.ci`
- `test.design`
- `test.atdd`
- `test.automation`
- `test.review`
- `test.nfr`
- `test.traceability`

Suggested statuses:

- `draft` -> `in_progress` -> `review` -> `done`

Suggested link patterns:

- TEA work items typically `depends_on(soft)` the primary delivery work item (story/bug/refactor).
- Delivery work items can require `informed_by(soft)` links to TEA artifacts at transition time.

## Locked modules: TEA-specific expectations (high level)

- workflow-engine: executes TEA’s strict step-file sequence (create/edit/validate).
- agent-runtime: runs the TEA agent and enforces “one step file at a time” discipline.
- sandbox-engine + tooling-engine: any repository edits and test runs occur via approved, logged tools in a git worktree.
- template-engine: renders TEA documents and validation reports (prompt receipts, hashes).
- variable-service: stores per-step state and promotes only explicit outputs.
- provider-registry: resolves model/provider for generation steps; no silent fallback.
- event-bus: ephemeral transport; not authoritative.
- observability: stores validation events + test run outcomes; export consent-gated.
