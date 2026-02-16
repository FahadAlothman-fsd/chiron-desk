# Observability Module Design

**Package:** `@chiron/observability`  
**Status:** Planned (new module, package not yet extracted)

## Purpose

Provide a durable, queryable observability layer for Chiron that supports both runtime transparency and thesis-grade SDLC evaluation.

## Scope (Phase 1)

- Persist operational telemetry in Chiron DB as an immutable event ledger.
- Persist qualitative user feedback (surveys/questionnaires and bug reports).
- Expose user-visible telemetry/query surfaces for transparency (`My Telemetry`).
- Correlate telemetry with workflow context (`executionId`, `stepId`, `toolCallId`, `approvalId`, `userId`, `projectId`).
- Enforce redaction, minimization, and retention policy before persistence/export.

## Non-Goals (Phase 1)

- Full support-ticket workflow automation.
- Replacing event-bus transport semantics.
- Mandatory external vendor dependency for baseline operation.

## Ingestion Sources (Phase 1)

- `@chiron/workflow-engine` lifecycle, step, agent, approval, and control events.
- `@chiron/tooling-engine` action execution and permission outcomes.
- `@chiron/provider-registry` resolution/failure/selection-required outcomes.
- `@chiron/ax-engine` optimization run and promotion outcomes.
- `@chiron/variable-service` variable mutation and propagation outcomes.
- `@chiron/template-engine` render and boundary/decode outcomes.
- `@chiron/sandbox-engine` git/worktree execution outcomes.
- `@chiron/event-bus` stream for real-time fan-out (transport only; not durability source-of-truth).

## User Transparency And Evaluation Features (Phase 1)

- Per-user execution timeline with what happened, when, and why.
- Policy/approval transparency (requested, auto-approved, rejected, edited, interrupted).
- Model/provider transparency (selected model/provider, override source, failure context).
- SDLC evaluation aggregates (speed, reliability, rework, approval friction, interruption rate, cost/token usage signals).
- Qualitative feedback capture and retrieval linked to runtime context.

## Minimum Survey Schema (Locked)

`survey_response`

- `id`, `userId`, `projectId?`, `executionId?`, `stepId?`, `surveyType`, `schemaVersion`, `consentVersion`, `submittedAt`
- Core Likert (1-5, required):
  - `sdlcSpeedImproved`
  - `outputQuality`
  - `transparencyClarity`
  - `controlSatisfaction`
  - `overallUsefulness`
- Qualitative (optional):
  - `whatHelped`
  - `biggestPainPoint`
  - `suggestedImprovement`
- Auto-filled context snapshot:
  - `workflowKind`, `agentKind`, `provider`, `model`, `durationMs`, `toolCalls`, `approvalCount`, `interruptCount`, `errorCount`

`bug_report`

- `id`, `userId`, `projectId?`, `executionId?`, `stepId?`, `submittedAt`
- `issueCategory`, `severity`, `reproducible`, `expected`, `actual`, `stepsToReproduce`, `notes?`

## Effect Service Shape (Target)

- `recordEvent(event) -> Effect<void, ObservabilityError>`
- `recordFeedback(feedback) -> Effect<void, ObservabilityError>`
- `queryUserTimeline(userId, filters) -> Effect<ObservabilityTimeline>`
- `queryUserMetrics(userId, window) -> Effect<UserTelemetrySummary>`
- `queryProjectMetrics(projectId, window) -> Effect<ProjectTelemetrySummary>`
- `exportBatch(target, cursor) -> Effect<ExportResult, ObservabilityError>`

## Module Relationships

### Depends On

- `@chiron/contracts` for telemetry/feedback schemas
- `@chiron/db` for durable storage and query views
- `@chiron/event-bus` for stream ingestion (real-time)
- `effect` observability primitives and `@effect/opentelemetry` wiring at app/server composition

### Used By

- `@chiron/api` for telemetry/feedback query endpoints
- `apps/web` for user transparency dashboards and feedback forms
- Future external analytics/observability exporters

## Retention And Export Policy (Phase 1)

- Telemetry events: 90-day hot retention, with aggregate rollups retained longer.
- Survey and bug-report feedback: 1-year retention by default (thesis evaluation window).
- Feedback export is automatic when user consent is opt-in, and disabled when user consent is opt-out.
- Telemetry export follows the same consent-gated model in a later phase.
- Export behavior is DB-first with asynchronous delivery (outbox/worker), retry/backoff, and idempotent sends.
- Local Chiron DB remains the authoritative source-of-truth.

## Decision Lock (2026-02-12)

- Observability is a first-class module and owns durable telemetry + qualitative feedback.
- Event-bus remains ephemeral transport; observability owns persistence/replay/query.
- Chiron runs DB-first observability for local transparency before external exporters.
- User-facing transparency views are required (`My Telemetry`) and expose recorded telemetry for that user.
- Feedback collection includes structured surveys/questionnaires and bug reports.
- Export pipelines are consent-gated (opt-in/opt-out), automatic when enabled, and must preserve redaction/minimization guarantees.

## Open Decisions

- None for phase 1.
