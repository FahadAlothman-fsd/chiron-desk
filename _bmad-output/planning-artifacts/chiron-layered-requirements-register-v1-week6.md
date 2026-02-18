# Chiron Layered Requirements Register v1 (Week 6)

Date: 2026-02-18
Owner: PM workflow session
Status: Draft for epics generation

## Intent

This register consolidates requirements across 3 levels:

- L0: system umbrella requirements
- L1: plane-specific requirements (Methodology, Project, Execution)
- L2: step-system requirements (runtime + per-step capabilities)

BMAD is the default seeded methodology profile. Chiron must remain methodology-capable and not require external BMAD download.

---

## L0 - System Umbrella Requirements

### Functional

- `L0-FR-01` The system shall create and manage work units and transitions.
- `L0-FR-02` The system shall execute workflows mapped to work units.
- `L0-FR-03` The system shall enforce deterministic start/completion gates with actionable diagnostics.
- `L0-FR-04` The system shall support invoke modes: `same_work_unit` and `child_work_units`.
- `L0-FR-05` The system shall support dual agent runtime execution and streaming responses.
- `L0-FR-06` The system shall persist outputs, artifacts, and transition evidence for auditability.
- `L0-FR-07` The system shall provide operator-facing state views for execution, transitions, artifacts, and graph lineage.

### Non-Functional

- `L0-NFR-01` Transition outcomes shall be deterministic and reproducible for identical inputs and configuration.
- `L0-NFR-02` The system shall maintain append-only audit history where policy requires immutability.
- `L0-NFR-03` The runtime shall support at least 50 concurrent active workflow executions per workspace with less than 1% execution failure rate attributable to scheduler/contention faults in a 24-hour soak run.
- `L0-NFR-04` Every failure surfaced to operators shall include a structured diagnostic payload: `errorCode`, `failingRequirementId`, `failingCriterion`, `remediationSteps[]`, `evidenceRef`, and `timestamp`.
- `L0-NFR-05` Local development reset and rebuild operations shall be supported with low friction.

---

## L1 - Plane Requirements

## Methodology Plane

### Functional

- `M-FR-01` Methodology builders shall create, clone, import, and manage methodology profiles.
- `M-FR-02` Methodology definitions shall support versioning, publishing, and deprecation.
- `M-FR-03` Builders shall define work-unit types and transition graphs per methodology version.
- `M-FR-04` Builders shall define start/completion gates for workflows and transitions.
- `M-FR-05` Builders shall bind workflows to `methodologyVersion + workUnitType` with optional transition context.
- `M-FR-06` Builders shall author workflows using only supported step types: `form`, `agent`, `action`, `invoke`, `branch`, `display`.
- `M-FR-07` Builders shall configure agent role contracts, prompt references, and step capabilities.
- `M-FR-08` Builders shall define variable schemas and template resolution rules.
- `M-FR-09` Non-builder users shall be able to inspect methodology details in read-only mode.
- `M-FR-10` Projects shall pin to methodology versions and preserve pinned behavior until explicitly changed.

### Non-Functional

- `M-NFR-01` Published methodology versions shall be immutable.
- `M-NFR-02` Invalid methodology configurations shall be rejected before publish.
- `M-NFR-03` Methodology changes shall be fully auditable (who, when, what, why).
- `M-NFR-04` Methodology compatibility policy shall be enforced as: non-breaking changes may be minor/patch; breaking changes require a new major version, explicit project repin, and recorded migration decision.

## Project Plane

### Functional

- `P-FR-01` Users shall create and manage projects with a default methodology profile preselected.
- `P-FR-02` Projects shall store pinned methodology version and explicit pin-change history.
- `P-FR-03` Project initialization shall create baseline planning artifacts and status tracking.
- `P-FR-04` Projects shall maintain runtime configuration (providers, models, policies, execution settings).
- `P-FR-05` Project owners shall manage work-unit lifecycle and transitions within project scope.
- `P-FR-06` Project cockpit shall display all currently available next transitions opened by gate evaluation, plus one recommended next action computed by transition-priority policy.
- `P-FR-07` Project views shall provide FR/NFR traceability to epics and stories.
- `P-FR-08` Project readiness checks shall block implementation start unless required artifacts are present: canonical PRD, canonical architecture, canonical epics/stories, FR traceability map, completed UX specification sections, and architecture-to-UX contract notes.
- `P-FR-09` Decisions, approvals, and rationale shall be persisted as project evidence.
- `P-FR-10` Project reset/new-iteration flows shall preserve historical evidence and lineage.

### Non-Functional

- `P-NFR-01` First-run onboarding shall achieve time-to-first-runnable-workflow <= 20 minutes for guided setup and onboarding completion rate >= 80% in internal dogfood cohorts.
- `P-NFR-02` Planning decisions shall remain explainable and traceable.
- `P-NFR-03` Project state shall remain consistent under concurrent updates.
- `P-NFR-04` UX language and navigation shall remain consistent across planes.
- `P-NFR-05` Artifact lineage and readiness signals shall be integrity-protected.

## Execution Plane

### Functional

- `E-FR-01` Operators shall start, pause, resume, and cancel workflow executions.
- `E-FR-02` Steps shall execute sequentially with supported branch and invoke behavior.
- `E-FR-03` Agent steps shall run on selected runtime (`chiron` or `opencode`) and stream outputs.
- `E-FR-04` Action steps shall execute side effects through policy-controlled tooling paths.
- `E-FR-05` Parent/child executions shall be linked for invoke scenarios.
- `E-FR-06` Gates shall evaluate deterministically and emit actionable failure diagnostics.
- `E-FR-07` Execution events, artifacts, and transition evidence shall be persisted.
- `E-FR-08` Operator runtime views shall surface timeline, blockers, artifacts, and graph state.
- `E-FR-09` Retry and recovery shall be step-scoped with idempotency enforcement: up to 3 automatic retries for transient failures, manual retry for terminal failures, and no duplicate side effects when idempotency keys are present.
- `E-FR-10` Runtime event streams shall be exposed to UI/API consumers.
- `E-FR-11` Approval policy shall be enforced before irreversible operations.
- `E-FR-12` Execution cancellation shall cascade to child tasks/fibers.

### Non-Functional

- `E-NFR-01` Runtime behavior shall be deterministic for equivalent execution inputs.
- `E-NFR-02` Concurrency controls shall prevent shared-state corruption.
- `E-NFR-03` Streaming and event ordering shall be reliable and attributable.
- `E-NFR-04` Failure isolation shall preserve unaffected executions.
- `E-NFR-05` Runtime feedback shall meet responsiveness targets: p95 step-state update propagation <= 1000 ms from persisted event to UI render, and p99 <= 2500 ms under target concurrency.
- `E-NFR-06` Tool execution and credential access shall be policy-bounded and secure.

## Cross-Cutting Non-Functional

- `X-NFR-01` Full auditability shall be maintained across methodology, project, and execution planes.
- `X-NFR-02` Platform design shall support non-BMAD methodology profiles.
- `X-NFR-03` Platform operations shall support local-first development and reset cycles.

---

## L2 - Step-System Requirements

## Runtime + Validation

- `STP-FR-001` Workflows shall be defined as ordered step graphs using valid step types only.
- `STP-FR-002` Step configs shall be schema-validated at authoring time.
- `STP-FR-003` Publish shall fail if unresolved variables or invalid transitions exist.
- `STP-FR-004` Step instances shall be execution-addressable (`executionId`, `stepId`, `attempt`, status, timestamps).
- `STP-FR-005` Step execution state shall persist for pause/resume/recovery.

## Form Step

- `FORM-FR-001` Form fields shall be rendered from typed config schema.
- `FORM-FR-002` Form validation shall enforce required fields and constraints.
- `FORM-FR-003` Form steps shall support save-and-resume with partial state.
- `FORM-FR-004` Valid form submissions shall write values to workflow variable context.

## Agent Step

- `AGENT-FR-001` Agent runtime selection shall be configurable per step.
- `AGENT-FR-002` Agent output shall stream incrementally to operators.
- `AGENT-FR-003` Agent runs shall persist structured outputs and tool traces.
- `AGENT-FR-004` Agent tool usage shall respect step capability policy.
- `AGENT-FR-005` Agent steps shall support interruption and graceful shutdown.

## Action Step

- `ACTION-FR-001` Side effects shall run only through approved tooling interfaces.
- `ACTION-FR-002` Approval policy evaluation shall occur before high-risk actions.
- `ACTION-FR-003` Approval request, decision, and evidence shall be persisted.
- `ACTION-FR-004` Action retries shall support idempotency keys.

## Invoke Step

- `INVOKE-FR-001` Invoke shall support `same_work_unit` and `child_work_units`.
- `INVOKE-FR-002` Parent-child execution lineage shall be queryable.
- `INVOKE-FR-003` Invoke boundaries shall define explicit input/output variable mapping.
- `INVOKE-FR-004` Child failure behavior shall support configurable strategy.

## Branch Step

- `BRANCH-FR-001` Branch predicates shall evaluate deterministically against current context.
- `BRANCH-FR-002` Branch decisions shall persist evaluation traces.
- `BRANCH-FR-003` Branch shall support fallback/default path behavior.

## Display Step (Extended)

- `DSP-FR-001` Builders shall configure display layout types (cards, table, timeline, graph, json, markdown, mixed).
- `DSP-FR-002` Builders shall bind display fields to variables by scope (`step`, `workflow`, `project`, `artifact`, `transition`).
- `DSP-FR-003` Builders shall filter/select bound variables by canonical type catalog: `string`, `number`, `boolean`, `enum`, `datetime`, `duration`, `json-object`, `json-array`, `artifact-ref`, `status`, `id`, and `null`; unsupported coercions shall fail validation.
- `DSP-FR-004` Display sections shall support conditional visibility rules.
- `DSP-FR-005` Display computed fields shall use an allowlisted function set: `count`, `sum`, `avg`, `min`, `max`, `concat`, `join`, `formatDate`, `formatDuration`, `coalesce`, `if`; execution depth is limited to 3 nested functions.
- `DSP-FR-006` Display formatting rules shall support sort, group, and type-aware presentation.
- `DSP-FR-007` Display shall support artifact preview and deep-linking to evidence.
- `DSP-FR-008` Display diff views shall support `before_after` (within run) and `run_to_run` modes using persisted baseline snapshots; diffs must include field path, old value, new value, and change type (`added`, `removed`, `modified`).
- `DSP-FR-009` Invalid display bindings shall fail validation before publish.
- `DSP-FR-010` Missing/null variable behavior shall be configurable.
- `DSP-FR-011` Sensitive fields shall support masking/redaction by policy.
- `DSP-FR-012` Display config shall be versioned with methodology and reproducible at runtime.
- `DSP-FR-013` Operators shall be able to drill down without losing execution context.
- `DSP-FR-014` Display output shall support human view and machine-readable payload export.

## Gate + Observability

- `GATE-FR-001` Start/completion gates shall be attachable at workflow and transition boundaries.
- `GATE-FR-002` Gate failures shall return criterion-level diagnostics.
- `GATE-FR-003` Gate pass/fail outcomes shall be auditable.
- `OBS-FR-001` Every step shall emit lifecycle events (`started`, `stream`, `awaiting_approval`, `completed`, `failed`, `cancelled`).
- `OBS-FR-002` Operators shall access runtime timeline, blockers, and artifact lineage during execution.

## Step-System Non-Functional

- `STP-NFR-001` Equivalent step inputs and config shall produce equivalent routing outcomes.
- `STP-NFR-002` Step persistence shall survive process restarts without data loss.
- `STP-NFR-003` Parallel executions shall not corrupt shared project state.
- `STP-NFR-004` Cancellation shall propagate to child executions within bounded time.
- `STP-NFR-005` Step traces shall provide end-to-end observability.
- `STP-NFR-006` Approval and transition evidence shall be immutable where policy requires it.
- `STP-NFR-007` Tool execution shall be sandboxed and permission-scoped.
- `STP-NFR-008` Runtime state updates shall remain responsive with p95 event-to-state-store update <= 500 ms and no unbounded event queue growth under target concurrency.
- `STP-NFR-009` Config validation shall catch invalid structures pre-run whenever possible.
- `STP-NFR-010` Runtime errors shall provide remediation guidance with minimum schema fields: `errorCode`, `humanSummary`, `failingStepId`, `failingCriterion`, `recommendedActions[]`, and `evidenceRef`.
- `STP-NFR-011` Step type extension shall be registry-driven and backward compatible.
- `STP-NFR-012` Methodology and step configs shall remain portable across project resets.

## Display Non-Functional

- `DSP-NFR-001` Display rendering shall remain responsive with payloads up to 10,000 bound values: initial render p95 <= 1200 ms and interaction updates p95 <= 500 ms on target desktop profile.
- `DSP-NFR-002` Display output shall be deterministic for identical config and data.
- `DSP-NFR-003` Display surfaces shall meet WCAG 2.2 AA, full keyboard navigation, visible focus indicators, semantic labeling for screen readers, and non-color-only status communication.
- `DSP-NFR-004` Display surfaces shall be responsive across desktop and compact layouts.
- `DSP-NFR-005` Untrusted content shall be safely rendered without script injection.
- `DSP-NFR-006` Display failures and slow paths shall be observable.
- `DSP-NFR-007` Unsupported display types shall degrade gracefully.

---

## Tightening Pass v2 (Applied)

The previously vague requirements were tightened into testable constraints in this document revision.

### Transition recommendation policy clarification

- Multiple next actions are valid and expected.
- Availability is determined by transition gates that are currently open.
- Recommendation is ranked by this precedence order:
  1. mandatory compliance/safety transition
  2. transition that unblocks the largest number of blocked work units
  3. transition with nearest due-date risk
  4. user-pinned focus transition

### Remaining decisions to confirm (non-blocking for epic drafting)

- Validate whether target concurrency should remain 50 per workspace for v1 launch or be environment-tier specific.
- Confirm target desktop hardware profile used for display performance benchmarks.

## Recommended Next Action

Use this register as the direct input to `/bmad-bmm-create-epics-and-stories`, then convert each requirement group into epic-scope story slices with Given/When/Then criteria.
