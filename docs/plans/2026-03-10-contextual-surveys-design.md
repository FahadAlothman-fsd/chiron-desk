# Contextual In-App Surveys Design (Desktop Thesis Validation)

**Goal:** Add in-app contextual surveys to a desktop-only app with trigger rules and participant segmentation, producing exportable data that supports defensible thesis outcomes.

**Primary constraint:** Research defensibility depends on measuring *exposure denominators* (offers/shows) separately from *responses* to quantify nonresponse and timing bias.

---

## Recommended Architecture (DB-First Survey Engine)

### Modules / responsibilities

- **Observability event ledger (source of truth)**
  - Durable, append-only storage of runtime events that surveys can reference (execution complete, approval decision, tool error, etc.).
  - In Chiron, this aligns with the planned observability direction in `docs/architecture/modules/observability.md`.

- **Survey definition registry (versioned)**
  - Survey question schemas and interpretation notes are stored as versioned definitions.
  - Trigger rules are stored separately and versioned so study “waves” can be frozen.

- **Survey scheduler (main-process / backend)**
  - Consumes events, evaluates trigger rules + segmentation filters, enforces quotas/cooldowns, then creates `survey_exposure` records.
  - Must be outside the UI so eligibility is deterministic and testable.

- **UI prompt surface (renderer)**
  - Reads pending exposures and displays them (modal/drawer/toast), recording `shownAt` and user outcomes (dismiss/snooze/answer).
  - Writes `survey_response` linked to `survey_exposure`.

- **Export pipeline (consent-gated)**
  - Exports a minimal dataset needed for analysis (responses + exposures + versions + coarse context) under explicit consent scopes.

### Data flow (high level)

1. Runtime event occurs; it is persisted to the event ledger.
2. Scheduler evaluates enabled rules against the event + participant segment + suppression state.
3. If eligible, scheduler writes a `survey_exposure` row with contextual foreign keys and an optional `showAfter` time.
4. UI picks up the exposure, displays it, and records the outcome.
5. If answered, UI writes `survey_response` with `exposureId` and a small auto-filled context snapshot.

---

## Data Model (Minimum Fields)

This design assumes you will capture both *offers* and *answers*.

### Participant + consent

**`participant`**
- `id` (pseudonymous UUID)
- `studyId`
- `installId` (random UUID; helps detect reinstalls)
- `createdAt`
- `appVersion`, `os`, `timezone`
- Optional fixed segmentation fields (captured once): `experienceLevel`, `role`, `domain`

**`participant_consent`**
- `id`, `participantId`
- `consentVersion`
- `scope` (e.g., `surveys`, `telemetry`, `export`, `freeTextExport`)
- `consentedAt`, `withdrawnAt?`

**`cohort_assignment`**
- `id`, `participantId`, `studyId`
- `cohortKey` (e.g., `control`, `treatmentA`)
- `assignmentVersion`
- `assignedAt`
- Optional: `strataKey` (e.g., `experience=junior`) for stratified randomization

### Survey definitions + trigger rules

**`survey_definition`**
- `id`
- `surveyType` (stable string identifier)
- `schemaVersion`
- `title`
- `questionsJson` (or normalized question rows)
- `intendedConstruct` (short label)
- `analysisNotes` (frozen notes for interpretation)
- `activeFrom`, `activeTo?`, `isEnabled`

**`survey_trigger_rule`**
- `id`, `surveyDefinitionId`
- `ruleVersion`, `priority`, `isEnabled`
- `eventType` (what the rule listens to)
- `predicateJson` (filters / thresholds)
- `segmentFilterJson` (cohort/role/experience gates)
- `delayMs` + `jitterMs`
- `sampleRate` (0..1)
- `cooldownMs`, `maxPerDay`, `maxPerStudy`
- `stopOnResponse` (bool)

### Exposure + response

**`survey_exposure`** (research-critical denominator table)
- `id`, `participantId`, `surveyDefinitionId`, `ruleId`
- Context links: `projectId?`, `executionId?`, `stepId?`, `toolCallId?`
- `triggerEventId` (event ledger row ID)
- `offeredAt`, `showAfter?`, `shownAt?`, `expiresAt?`
- `uiSurface` (e.g., `modal`, `toast`, `sidebar`)
- `status` (`offered|shown|dismissed|snoozed|answered|expired|suppressed`)
- `suppressionReason?` (`cooldown|quota|no-consent|segment-mismatch|busy|unfocused`)
- `responseId?`

**`survey_response`**
- Must include `id`, `participantId` (or `userId`), `projectId?`, `executionId?`, `stepId?`, `surveyType`, `schemaVersion`, `consentVersion`, `submittedAt`
- Link to exposure: `exposureId`
- Timing: `startedAt?`, `durationMs?`
- Required Likert (example set): `sdlcSpeedImproved`, `outputQuality`, `transparencyClarity`, `controlSatisfaction`, `overallUsefulness`
- Optional text: `whatHelped`, `biggestPainPoint`, `suggestedImprovement`
- Auto-filled context snapshot (example set): `workflowKind`, `agentKind`, `provider`, `model`, `durationMs`, `toolCalls`, `approvalCount`, `interruptCount`, `errorCount`

---

## Trigger Rules (Minimum Expressiveness)

- **Breakpoint triggers:** after execution completes, after approval decision, after error recovery.
- **Cadence triggers:** once per day/session, once per N executions.
- **Budget controls:** quotas + cooldowns enforced first; record suppressions.
- **Busy/unfocused gating:** never prompt mid-approval or while app is unfocused.
- **Delay + jitter:** default 60s delay + 0-30s jitter to reduce valence peaks.
- **Counterbalancing:** if sampling error contexts, also sample non-error contexts.

---

## Participant Segmentation

- **Primary:** between-subject cohort assignment fixed at enrollment; optionally stratify by `experienceLevel`.
- **Secondary (optional):** derived usage tiers computed from *prior* windows (e.g., last 7 days) and stored as snapshots to avoid outcome-dependent segmentation.

---

## Anti-Bias Timing Guidance (Operational)

- Prefer “natural stops” (task/execution end) over in-flow prompts.
- Avoid immediate post-success/failure prompts; delay + jitter.
- Enforce strict daily budgets; log suppressions to measure selection effects.
- Freeze survey schema + rule versions per study wave.

---

## Minimum Analytics Required (Defensible)

You must be able to compute, per cohort/segment/time window:

- **Exposure funnel:** offered -> shown -> answered, plus suppression reasons.
- **Response behavior:** response rate, dismissal/snooze rate, time-to-respond.
- **Outcome distributions:** per Likert item (median/IQR), plus optional-question completion rates.
- **Objective correlates:** execution duration, tool calls, approvals, interrupts, error counts.
- **Versioning controls:** app version, consent version, survey schemaVersion, ruleVersion.

---

## Privacy / Ethics Defaults

- Pseudonymous identifiers; minimize linkage to real identity.
- Default export excludes verbatim free-text unless `freeTextExport` consent scope is explicitly granted.
- Provide a user-facing “My Telemetry / My Feedback” view when feasible for transparency.
