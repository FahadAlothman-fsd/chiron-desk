# Chiron Thesis Survey Experiment

## TL;DR
> **Summary**: Add a one-time, thesis-oriented external survey flow to Chiron that prompts authenticated users after a completed transition, shows a confirmation dialog, then opens an Astro/Vercel-hosted survey gateway page that embeds or redirects to Formbricks Cloud and records true completion via server-side Formbricks response reconciliation keyed by hidden fields and server-side hashed signup email.
> **Deliverables**:
> - thesis-grade survey instrument and rationale
> - Astro/Vercel survey gateway and Formbricks Cloud configuration contract
> - Chiron survey-state persistence, onboarding flow, and hosted completion tracking
> - low-friction prompt UX after transition completion
> - automated backend, frontend, and Playwright verification
> **Effort**: Large
> **Parallel**: YES - 3 waves
> **Critical Path**: 1 → 2/3 → 4 → 5/6/7 → 8/9/10

## Context
### Original Request
Create a plan for a survey experiment that measures whether Chiron provides a novel benefit in current agentic development workflows. The survey should be external rather than built natively into Chiron, surfaced inside Chiron after users finish milestones, and designed with thesis-grade data collection in mind. The plan must cover survey contents and rationale, survey service choice, completion tracking, and low-friction UX.

### Interview Summary
- This is a thesis experiment, not generic product feedback.
- The survey should be extensive enough to be analytically useful, but not so long that completion collapses.
- The first rollout trigger is **transition completion**.
- The survey service is **Formbricks Cloud**.
- Do **not** self-host Formbricks in v1.
- Treat this as a **one-time** survey for the experiment.
- Track completion **once ever per user** for this experiment.
- Invitation dialog actions are **Take survey**, **Not now**, and **Don't ask again**.
- **Not now** suppresses re-prompting for the current session only; the user may be asked again in a later session after another eligible transition.
- Use **tests-after** rather than TDD.
- Prompting should feel lightweight and low-friction.
- Prompting should require explicit user confirmation before opening the external survey page; no automatic redirect.
- Use the **Chiron signup email** as the practical participant identity for the experiment.
- The **hosted backend is the source of truth** for survey eligibility, completion, and duplicate rejection.
- The hosted backend must **hash normalized email server-side** and reject duplicate completed email identities.
- `installId` is a **secondary signal only**, not the authoritative participant identity.
- First-run onboarding should include an in-app **Seed initial methodology** action so users create a local account first, then seed BMAD from the UI before entering the study flow.
- The seeded BMAD flow should be extended so participants can realistically reach **story creation and agent-driven implementation/tracking**, not stop too early in the methodology.
- The hosted survey gateway should live on an **Astro docs site deployed to Vercel** so the same site can own the survey page, secure launch endpoint, and optional reconciliation endpoints.
- Immediate action in the current worktree is **plan only**; survey implementation should begin only after the docs-site work in `crisp-eagle` is finished and merged into `feat/effect-migration`.
- Formbricks quota protection is required: local development and most automated tests should **not** create real provider responses.

### Metis Review (gaps addressed)
- Resolved the biggest gap by choosing **true completion tracking** rather than equating “clicked survey link” with “completed survey”.
- Narrowed scope to **authenticated web users only**, one trigger, one external survey, and no generalized feedback platform.
- Added explicit respondent-quality protections: non-public survey link, screening question, and light attention/consistency check.
- Locked privacy stance: Formbricks never receives raw email; the hosted backend stores only normalized email hash plus experiment metadata, and survey answers do not need to be copied into Chiron.
- Added required failure cases: duplicate prompts, repeated reconciliation runs, multi-tab behavior, clicked-but-abandoned survey, and survey-state API failure.
- Simplified completion tracking boundary: Electron/Chiron launches the hosted survey flow, while completion is reconciled server-side from Formbricks response data rather than pushed by webhook.

### Implementation Boundary
- **Chiron app repo/worktree**: `/home/gondilf/.local/share/opencode/worktree/e8cd5ce0af4b06d1493ee2b664244e58197cbfe9/stellar-cactus`
- **Hosted Astro docs/gateway repo/worktree**: `/home/gondilf/.local/share/opencode/worktree/e8cd5ce0af4b06d1493ee2b664244e58197cbfe9/crisp-eagle`
- **Current hosted Astro survey files already present**:
  - `apps/docs/src/pages/survey.astro`
  - `apps/docs/src/pages/api/survey/launch.ts`
  - `apps/docs/src/pages/api/survey/webhook.ts` (may remain unused for MVP if reconciliation replaces webhook flow)
- **Hosted docs commands**:
  - Dev: `bun run dev:docs`
  - Build: `bun run build:docs`
  - Docs test/build validation: `bun run --filter docs test`
  - Docs smoke tests: `bun run test:docs`
- **Hosted source of truth**:
  - The authoritative survey state lives in the **Astro/Vercel app**, not in Chiron local SQLite.
  - Use a durable hosted store with relational uniqueness semantics; default choice: **Vercel Postgres**.
  - Add a hosted server module such as `apps/docs/src/lib/server/survey-store.ts` to own persistence and uniqueness rules.
  - Add/extend these hosted endpoints:
    - `POST /api/survey/state` → return eligibility for the current normalized email identity
    - `POST /api/survey/launch` → mint launch token, create/update participantRef, record clicked state when appropriate
    - `POST /api/survey/not-now` → record session-scoped snooze keyed by participantRef + sessionId
    - `POST /api/survey/dismiss` → record permanent opt-out
    - `POST /api/survey/reconcile` → query Formbricks responses and record verified completion for matching hidden-field metadata
  - Add a hosted provider abstraction, e.g. `apps/docs/src/lib/server/survey-provider.ts`, with explicit `test`, `prod`, and optional `disabled` modes.
  - Default local/dev behavior should be `SURVEY_MODE=test` so launch/reconciliation flows can be exercised without creating real Formbricks responses.
- **Vercel deployment shape**:
  - project root directory: `apps/docs`
  - config file: `apps/docs/vercel.json`
- **Sequencing rule**:
  - Commit this plan now in `stellar-cactus`.
  - Finish and commit the docs-site Astro work in `crisp-eagle`.
  - Merge `crisp-eagle` docs work into `feat/effect-migration`.
  - Only then start the survey implementation work defined in Tasks 2-10.

## Work Objectives
### Core Objective
Implement a one-time thesis survey experiment in Chiron that can defensibly measure perceived benefit and novelty relative to participants’ existing agentic development workflows, while keeping response friction low and avoiding native survey implementation.

### Deliverables
- External Formbricks Cloud survey with a locked questionnaire structure
- Astro/Vercel survey gateway page plus secure launch and reconciliation endpoints (implemented in the external docs-site worktree)
- Hosted survey persistence layer and endpoint contract (implemented in the external docs-site worktree)
- Quota-safe provider testing strategy and environment contract for launch/reconciliation simulation
- Experiment metadata contract (survey ID/version, participantRef, emailHash identity, installId, sessionId, trigger context)
- Persistent Chiron-side survey state for prompt suppression, per-session snooze behavior, onboarding readiness, and completion confirmation
- Extended BMAD seed/onboarding path that reaches story creation and agent-tracked implementation flow
- Prompt UI shown after eligible transition completion
- Completion reconciliation path from Formbricks to Chiron
- Automated tests and evidence for prompting, suppression, and failure handling

### Definition of Done (verifiable conditions with commands)
- The survey appears only for eligible authenticated web users after a completed transition and not before.
- The survey CTA opens the Astro/Vercel gateway URL with the expected pseudonymous metadata.
- Snoozed, dismissed, and completed users are suppressed according to the experiment policy.
- Completion is only marked after server-side reconciliation against Formbricks response data, not on click.
- Duplicate completed email identities are rejected by the hosted backend even after local DB reset/reseed.
- Chiron first-run onboarding supports create user → seed initial BMAD methodology before survey eligibility is considered complete.
- The seeded BMAD path reaches a story-level flow with agent execution/harness/write tracking visible in runtime state.
- Local dev and automated tests exercise launch/reconciliation behavior in a quota-safe mode without consuming real Formbricks responses.
- Duplicate client events or repeated reconciliation runs do not create duplicate prompts or inconsistent state.
- `bunx vitest --config apps/server/vitest.config.ts --run`
- `bunx vitest --config apps/web/vitest.config.ts --run`
- `bunx playwright test tests/e2e/runtime-work-units.spec.ts --grep "survey"`

### Must Have
- Formbricks Cloud only; no self-hosting in v1
- Astro docs site on Vercel hosting the survey gateway and secure endpoints
- Authenticated-user-only experiment scope
- Email-based participant identity using normalized **server-side hashed email** as the authoritative dedupe key
- Questionnaire sections that support thesis analysis rather than only product sentiment
- One low-friction confirmation dialog after transition completion with take-survey, not-now, and don't-ask-again actions
- True completion tracking via server-side Formbricks reconciliation
- Server-side source of truth for survey state across sessions/devices
- Session-aware re-prompt control for the `Not now` action
- In-app BMAD seed action as part of first-run study onboarding
- Seeded BMAD methodology extended to story/implementation flow suitable for survey participants
- `installId` retained only as a secondary signal for convenience and anomaly review
- Hosted survey state persisted in the Astro/Vercel app using a durable server-side store with a unique constraint on `emailHash + experimentId`
- Hosted survey provider abstraction with default local/test stub mode
- Hidden fields and/or participantRef metadata embedded into the survey launch so Formbricks responses can be reconciled back to Chiron identities

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- No native survey UI inside Chiron beyond the invitation/confirmation dialog
- No generalized survey platform, feedback hub, or admin dashboard
- No raw email/name/internal user ID sent to Formbricks
- No local DB user ID or browser session ID treated as the authoritative participant identity
- No ambiguity about system of record: hosted Astro persistence must own eligibility, snooze, dismiss, click, and completion state
- No requirement that Electron/local Chiron receive public webhooks
- No routine local testing path that burns the real Formbricks monthly response quota
- No storage of full survey answers inside Chiron unless thesis requirements later force it
- No extra milestone triggers in v1 beyond transition completion
- No permanent dependence on browser-only session state as the source of truth
- No vague “survey works” acceptance criteria; every behavior must be binary and testable

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: **tests-after** using existing Vitest + Playwright infrastructure
- QA policy: Every task has agent-executed scenarios
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`
- Backend verification focus: email-hash identity reconciliation, launch token validation, Formbricks response reconciliation, suppression rules, and session snooze behavior
- Frontend verification focus: onboarding readiness, BMAD seed reachability, prompt eligibility, dialog rendering, CTA metadata, not-now behavior, permanent opt-out behavior, multi-trigger dedupe
- E2E verification focus: create user → seed BMAD → reach story-capable path → completed transition → dialog → hosted gateway launch → state suppression across reload/session boundaries

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Preflight Gate: finish docs-site Astro work in `crisp-eagle` and merge it into `feat/effect-migration` before starting implementation tasks beyond planning/survey design.

Wave 1: experiment design and contracts (Tasks 1-3)
Wave 2: onboarding and server/client implementation (Tasks 4-7)
Wave 3: verification implementation (Tasks 8-10)

### Dependency Matrix (full, all tasks)
- 1 blocks 2, 3, 6, 9, 10
- 2 blocks 5, 6, 9, 10
- 3 blocks 5, 6, 7, 8, 9, 10
- 4 blocks 6, 8, 10
- 5 blocks 8, 10
- 6 blocks 9, 10
- 7 blocks 9, 10
- 8 depends on 3, 5
- 9 depends on 1, 2, 3, 6, 7
- 10 depends on 2, 4, 5, 6, 7, 8, 9

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 3 tasks → writing, unspecified-high
- Wave 2 → 4 tasks → unspecified-high, visual-engineering, quick
- Wave 3 → 3 tasks → unspecified-high, visual-engineering, quick

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [ ] 1. Lock the thesis survey instrument and analysis contract

  **What to do**: Define the exact questionnaire that Formbricks will host. Keep the target length at ~10-16 items / ≤5 minutes with branching. Use these sections and exact measurement intents: (a) eligibility/background: current use of AI/agentic tools, role, hours per week actively using AI tools in software development, and duration of regular AI-tool use; (b) baseline workflow context: multi-select workflow styles and multi-select named tools/workflows, including the structured comparators the user identified (Cursor, Claude Code, Codex, Cline/Roo Code, Aider, OpenCode/OhMyOpenCode, t3code, BMAD, Ralph Loop, Qoder, Speckit, Kiro, Factory/Droid, custom internal workflow, other); (c) Chiron exposure context: whether the session gave enough exposure for comparison plus a textarea explaining why it felt substantial or not; (d) comparative benefit vs baseline: Likert items on structural clarity, next-step clarity, traceability/visibility, and process confidence compared with the participant’s usual AI-assisted workflow; (e) friction/costs: perceived extra overhead or friction; (f) novelty separated from benefit: one item for “meaningfully different” and one item for “that difference was beneficial”; (g) value localization: multi-select on which parts of Chiron felt most valuable; (h) adoption intent; (i) one attention check; (j) one optional short free-text benefit/drawback question. Include a short-path branch for respondents who say the Chiron session was not substantial enough.
  **Must NOT do**: Do not create a long generic product feedback form, request PII, or rely on multiple open-text prompts.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: survey instrument quality and research rationale matter more than code changes here.
  - Skills: `[]` - No special skill required.
  - Omitted: [`bmad-create-prd`] - This is not a PRD-writing task.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: [2, 3, 5, 7, 8, 9] | Blocked By: []

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `README.md` - Use Chiron’s stated value proposition and terminology to keep survey wording aligned to the product’s actual claims.
  - Pattern: `.sisyphus/plans/chiron-thesis-survey-experiment.md` - Contains the confirmed experiment framing, scope boundaries, and acceptance rules this task must honor.
  - External: `https://formbricks.com/docs` - Survey setup constraints and hidden-field capabilities must be reflected in the final wording/metadata contract.

  **Acceptance Criteria** (agent-executable only):
  - [ ] The plan or supporting notes specify a complete ordered question list with response format for every item.
  - [ ] Each survey section explicitly maps to a thesis insight (background/control, benefit, novelty, friction, adoption, qualitative explanation).
  - [ ] The final survey contains no raw identity fields and no more than one optional free-text response.
  - [ ] The total estimated completion time is documented as ≤5 minutes.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Survey instrument completeness
    Tool: Read
    Steps: Inspect the updated plan/supporting survey spec and verify every required section and question type is present.
    Expected: A complete ordered survey exists with rationale per section and no unresolved placeholders.
    Evidence: .sisyphus/evidence/task-1-survey-instrument.md

  Scenario: Overlong or biased instrument rejected
    Tool: Read
    Steps: Check for more than one optional free-text question, any PII collection fields, or language that presumes Chiron is beneficial.
    Expected: None of those issues appear; wording is neutral and bounded.
    Evidence: .sisyphus/evidence/task-1-survey-instrument-error.md
  ```

  **Commit**: NO | Message: `n/a` | Files: `n/a`

- [ ] 2. Configure the Astro/Vercel survey gateway and Formbricks Cloud contract

  **What to do**: Define the hosted survey delivery contract for an Astro docs site deployed on Vercel. The Astro site must own: a `/survey` gateway page, a secure launch endpoint (for example `/api/survey/launch`), and a reconciliation endpoint (for example `/api/survey/reconcile`) that queries Formbricks Management API responses when needed. Create the Formbricks Cloud survey using the locked questionnaire from Task 1 and configure it as a non-public survey intended to be launched only through the Astro gateway. Define the hidden-field contract: `experimentId`, `surveyVersion`, `participantRef`, `projectId`, `projectWorkUnitId`, `transitionExecutionId`, `triggeredAt`, and optional `installId`. The launch endpoint, not local Chiron, must mint the short-lived token or signed launch payload using a server-side secret such as `SURVEY_TOKEN_SECRET`. Formbricks must never receive raw email; only participantRef and pseudonymous metadata via hidden fields. Add a provider abstraction in the hosted docs app (for example `apps/docs/src/lib/server/survey-provider.ts`) with explicit `test`, `prod`, and optional `disabled` modes. In `test` mode, `launch.ts` returns mock launch data and reconciliation returns stubbed completion state without creating real Formbricks submissions; in `prod` mode, those routes use the real Formbricks test or production environment credentials from `.env` / Vercel env. Record the exact gateway URL shape, required env vars, Formbricks environment separation, and quota-safe testing rules in the plan.
  **Must NOT do**: Do not self-host Formbricks for the main plan, do not expose a broadly indexed public survey entry point, do not rely on redirect-only or click-only completion semantics, and do not make routine local dev depend on repeated real Formbricks submissions.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: this mixes vendor configuration, metadata contract design, and security-sensitive decisions.
  - Skills: `[]` - No extra skill is required.
  - Omitted: [`deploy-to-vercel`] - Deployment tooling is unrelated.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: [4, 5, 7, 8, 9] | Blocked By: [1]

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `.sisyphus/plans/chiron-thesis-survey-experiment.md` - Confirmed service choice is Formbricks Cloud, Astro/Vercel is the hosted gateway, and server-side reconciliation is authoritative.
  - Pattern: `/home/gondilf/.local/share/opencode/worktree/e8cd5ce0af4b06d1493ee2b664244e58197cbfe9/crisp-eagle/apps/docs/src/pages/survey.astro` - Existing hosted survey gateway scaffold.
  - Pattern: `/home/gondilf/.local/share/opencode/worktree/e8cd5ce0af4b06d1493ee2b664244e58197cbfe9/crisp-eagle/apps/docs/src/pages/api/survey/launch.ts` - Existing hosted launch endpoint scaffold to upgrade.
  - Pattern: `/home/gondilf/.local/share/opencode/worktree/e8cd5ce0af4b06d1493ee2b664244e58197cbfe9/crisp-eagle/apps/docs/src/pages/api/survey/webhook.ts` - Existing hosted webhook scaffold to upgrade.
  - Pattern: `/home/gondilf/.local/share/opencode/worktree/e8cd5ce0af4b06d1493ee2b664244e58197cbfe9/crisp-eagle/apps/docs/package.json` - Canonical hosted docs commands.
  - Pattern: `apps/web/src/features/projects/singleton-auto-attach-warning-toast.ts` - CTA shape should match a lightweight launch action instead of a heavy modal flow.
  - External: `https://formbricks.com/docs/api-reference/rest-api` - Management API overview.
  - External: `https://formbricks.com/docs/api-reference/management-api--response/get-survey-responses` - Server-side response reconciliation API.
  - External: `https://formbricks.com/docs/xm-and-surveys/surveys/general-features/hidden-fields` - Hidden field matching strategy.
  - External: `https://formbricks.com/docs/xm-and-surveys/core-features/test-environment` - Test vs production environment separation.

  **Acceptance Criteria** (agent-executable only):
  - [ ] The plan specifies the exact responsibilities of the Astro gateway page, launch endpoint, and reconciliation endpoint.
  - [ ] The plan specifies the exact hidden fields passed from the hosted gateway to Formbricks.
  - [ ] The plan states that server-side Formbricks response reconciliation, not link-click, is the authoritative completion rule.
  - [ ] The plan includes required environment/config values for the Astro/Vercel + Formbricks integration.
  - [ ] The Formbricks survey contract excludes raw email/name/internal IDs.
  - [ ] The plan defines a quota-safe `SURVEY_MODE=test` local/default path that avoids consuming real Formbricks responses.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Astro gateway and Formbricks contract is explicit
    Tool: Read
    Steps: Inspect the plan/config notes and verify all gateway routes, hidden fields, env vars, and completion rules are enumerated.
    Expected: No missing metadata or ambiguous completion semantics remain.
    Evidence: .sisyphus/evidence/task-2-formbricks-contract.md

  Scenario: Privacy regression prevented
    Tool: Read
    Steps: Check the documented field list for raw name, email, userId, or internal session token transmission.
    Expected: Only pseudonymous experiment metadata is allowed.
    Evidence: .sisyphus/evidence/task-2-formbricks-contract-error.md
  ```

  **Commit**: NO | Message: `n/a` | Files: `n/a`

- [ ] 3. Add an experiment-specific Chiron survey identity and state contract

  **What to do**: Introduce a narrow experiment-specific persistence model split across local Chiron state and the hosted Astro backend. The **hosted Astro backend is the only system of record** and must persist survey identity/state in a durable store (default: Vercel Postgres) via a dedicated server module at `apps/docs/src/lib/server/survey-store.ts` or equivalent. The hosted schema must store at minimum: `experimentId`, `surveyVersion`, `emailHash`, `participantRef`, `status` (`eligible`, `snoozed`, `dismissed`, `clicked`, `completed`), `firstPromptedAt`, `lastPromptedAt`, `clickedAt`, `snoozedAt`, `dismissedAt`, `completedAt`, `lastEligibleTransitionExecutionId`, optional `installId`, and `lastSnoozedSessionId`. Add or extend these exact hosted endpoints: `POST /api/survey/state`, `POST /api/survey/launch`, `POST /api/survey/not-now`, `POST /api/survey/dismiss`, and `POST /api/survey/webhook`. Chiron may use the raw signup email only to call the hosted endpoints; the hosted backend must normalize and hash the email server-side before persistence and must reject duplicate completed email identities. Chiron local state should only cache convenience fields such as `participantRef`, `lastKnownSurveyState`, `currentSessionId`, current-session snooze marker, and `installId`. Define launch-token minting/validation rules so the hosted backend issues a signed opaque launch token without exposing raw identity to Formbricks.
  **Must NOT do**: Do not create a generic preferences framework, do not use local DB user ID or browser session as the authority, and do not store survey answers in this model.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: this is a cross-layer contract task touching schema, state model, and API boundaries.
  - Skills: `[]` - No extra skill required.
  - Omitted: [`better-auth-best-practices`] - Authentication already exists; this task is experiment-state design, not auth setup.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: [4, 5, 6, 7, 8, 9] | Blocked By: [1]

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `/home/gondilf/.local/share/opencode/worktree/e8cd5ce0af4b06d1493ee2b664244e58197cbfe9/crisp-eagle/apps/docs/src/pages/api/survey/launch.ts` - Hosted launch route scaffold.
  - Pattern: `/home/gondilf/.local/share/opencode/worktree/e8cd5ce0af4b06d1493ee2b664244e58197cbfe9/crisp-eagle/apps/docs/src/pages/api/survey/webhook.ts` - Hosted webhook route scaffold.
  - Pattern: `/home/gondilf/.local/share/opencode/worktree/e8cd5ce0af4b06d1493ee2b664244e58197cbfe9/crisp-eagle/apps/docs/astro.config.mjs` - Hosted Astro server deployment mode.
  - Pattern: `packages/db/src/schema/auth.ts` - Chiron-side email/auth context only; not the hosted system of record.
  - Pattern: `packages/db/src/schema/runtime.ts` - Use transition/workflow context concepts when storing eligibility/completion metadata.

  **Acceptance Criteria** (agent-executable only):
  - [ ] The state model and API contract support eligibility lookup, not-now snooze tracking, permanent dismiss tracking, click tracking, and completion tracking.
  - [ ] The hosted backend uses normalized email hash as the authoritative dedupe key and rejects duplicate completed identities.
  - [ ] The design uses hosted persistence and survives local DB reset, new sessions, and multiple devices when the same email is reused.
  - [ ] The launch-token design is pseudonymous and does not expose raw identity to Formbricks.
  - [ ] The plan clearly states that this is an experiment-specific contract, not a reusable survey platform.
  - [ ] The plan names the exact hosted endpoints and hosted persistence module that own the authoritative survey state.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: State model supports the full experiment lifecycle
    Tool: Read
    Steps: Inspect the schema/API plan and verify eligible, snoozed, dismissed, clicked, and completed states plus timestamps, email-hash identity, installId secondary signal, and session behavior are all present.
    Expected: The model can support suppression, reconciliation, and auditability without extra assumptions.
    Evidence: .sisyphus/evidence/task-3-survey-state-model.md

  Scenario: Scope creep rejected
    Tool: Read
    Steps: Verify the proposed server contract does not include answer storage, analytics dashboards, or generic preferences abstractions.
    Expected: The contract remains narrowly scoped to the thesis experiment.
    Evidence: .sisyphus/evidence/task-3-survey-state-model-error.md
  ```

  **Commit**: YES | Message: `feat(experiment): add survey instrument and state contracts` | Files: `packages/db/src/schema/*`, `packages/api/src/routers/*`, experiment config notes

- [ ] 4. Add first-run onboarding with local account creation and in-app BMAD seeding

  **What to do**: Add the onboarding requirements and implementation steps for a first-run study flow that begins inside Chiron itself. The canonical sequence should be: create local user account → seed initial BMAD methodology from an in-app button → use Chiron normally → become eligible for the survey prompt after a completed transition. The BMAD seeding action must replace dependence on CLI seeding for study participants and must be explicit in the UI so researchers can instruct participants consistently. Extend the seeded BMAD path beyond the current early slices so a participant can realistically progress to story creation and agent-driven implementation. The plan must identify the concrete seed files to extend, the story-level workflow/state targets to reach, and the runtime tracking evidence that proves agent execution happened (execution state, harness binding, applied writes).
  **Must NOT do**: Do not require participants to run CLI seed commands manually, do not make survey eligibility depend on undocumented setup steps outside the app, and do not leave the seeded methodology stopping before story/implementation flow.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: this is an onboarding/user-flow task touching user-facing setup UX.
  - Skills: `[]` - Existing app UI patterns are sufficient.
  - Omitted: [`create-auth-skill`] - Authentication already exists.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [6, 8, 10] | Blocked By: []

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `packages/auth` and `packages/db/src/schema/auth.ts` - Existing account creation/auth context.
  - Pattern: `.sisyphus/plans/chiron-thesis-survey-experiment.md` - First-run study flow is part of this plan's confirmed scope.
  - External: `.sisyphus/drafts/docs-site-vitepress-to-astro-agent-prompt.md` - Astro pivot context for the hosted side of the study.
  - Pattern: `packages/scripts/src/seed/methodology/index.ts` - Seed registry and methodology seed composition.
  - Pattern: `packages/scripts/src/seed/methodology/setup/setup-bmad-mapping.ts` - Existing BMAD-to-Chiron mapping and deterministic IDs.
  - Pattern: `packages/scripts/src/seed/methodology/tables/` - Seed table modules for workflows, facts, states, transitions, agents, artifacts, and related methodology definitions.
  - Pattern: `packages/db/src/runtime-repositories/agent-step-execution-state-repository.ts` - Runtime execution-state tracking.
  - Pattern: `packages/db/src/runtime-repositories/agent-step-execution-harness-binding-repository.ts` - Agent harness/session tracking.
  - Pattern: `packages/db/src/runtime-repositories/agent-step-execution-applied-write-repository.ts` - Applied write persistence for agent output.

  **Acceptance Criteria** (agent-executable only):
  - [ ] The plan defines an in-app BMAD seed action as part of first-run study onboarding.
  - [ ] Survey eligibility is documented as unavailable until account creation and initial methodology seeding are complete.
  - [ ] The onboarding flow no longer assumes participants use CLI seed commands.
  - [ ] The seeded BMAD path is documented as reaching story-capable workflow progression and agent-tracked implementation evidence.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: First-run onboarding path is explicit
    Tool: Read
    Steps: Inspect the plan and verify the sequence create user → seed BMAD → use Chiron → survey eligibility is clearly documented.
    Expected: No hidden/manual setup dependency remains for study participants.
    Evidence: .sisyphus/evidence/task-4-onboarding-seed.md

  Scenario: Missing seed step blocks survey eligibility
    Tool: Read
    Steps: Inspect the eligibility rules and verify participants who skip in-app methodology seeding are not treated as survey-ready.
    Expected: The plan prevents incomplete onboarding from polluting study results.
    Evidence: .sisyphus/evidence/task-4-onboarding-seed-error.md

  Scenario: Seeded BMAD reaches story and agent tracking
    Tool: Read
    Steps: Inspect the plan and verify it names the BMAD seed files to extend, the story-level progression target, and the runtime repositories used to verify agent execution/harness/write tracking.
    Expected: There is a concrete path from first-run seeding to story-capable, agent-tracked execution rather than an abstract promise.
    Evidence: .sisyphus/evidence/task-4-onboarding-story-agent.md
  ```

  **Commit**: NO | Message: `n/a` | Files: `n/a`

- [ ] 5. Implement server-side Formbricks completion reconciliation with idempotent response matching

  **What to do**: Add the hosted endpoint or route that reconciles completion by querying Formbricks Management API responses for the configured survey/environment and matching them back to the authoritative participant identity via hidden fields (`participantRef`, `surveyVersion`, `projectId`, `transitionExecutionId`) plus stored `emailHash`, not raw email in Formbricks. The reconciliation path may run on demand after survey open, on explicit check, or on scheduled/manual sync, but it must be idempotent so repeated reconciliation runs do not create inconsistent state. If Formbricks response metadata is needed for auditability, retain only the minimal reconciliation metadata necessary for the experiment (for example response ID, finished flag, updatedAt/completedAt, surveyVersion, and participantRef), not the answer payload itself.
  **Must NOT do**: Do not mark completion on CTA click, do not require a public webhook receiver for MVP, and do not store the full response body unless a thesis retention requirement is later added explicitly.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: response matching, provider API querying, and idempotent state transitions are the most failure-sensitive part of the implementation.
  - Skills: `[]` - No extra skill required.
  - Omitted: [`hono`] - The app uses Hono, but this task is narrower than a full framework guidance load.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [8, 10] | Blocked By: [2, 3]

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `.sisyphus/plans/chiron-thesis-survey-experiment.md` - Hosted reconciliation belongs to the Astro/Vercel side of the architecture.
  - Pattern: `/home/gondilf/.local/share/opencode/worktree/e8cd5ce0af4b06d1493ee2b664244e58197cbfe9/crisp-eagle/apps/docs/src/pages/api/survey/launch.ts` - Launch contract counterpart supplying hidden-field metadata.
  - Pattern: `/home/gondilf/.local/share/opencode/worktree/e8cd5ce0af4b06d1493ee2b664244e58197cbfe9/crisp-eagle/apps/docs/package.json` - Hosted docs commands.
  - External: `https://formbricks.com/docs/api-reference/rest-api` - Management API overview.
  - External: `https://formbricks.com/docs/api-reference/management-api--response/get-survey-responses` - Response lookup API.
  - External: `https://formbricks.com/docs/api-reference/management-api--response/get-response-by-id` - Response detail lookup.
  - External: `https://formbricks.com/docs/xm-and-surveys/surveys/general-features/hidden-fields` - Hidden-field matching model.

  **Acceptance Criteria** (agent-executable only):
  - [ ] A reconciled Formbricks finished response transitions the matching experiment record to `completed`.
  - [ ] Responses that do not match the expected hidden-field metadata do not change experiment state.
  - [ ] Repeated reconciliation runs leave the final state correct and do not create duplicate completion records.
  - [ ] Normal Chiron runtime flow is unaffected if reconciliation is temporarily unavailable.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Valid reconciled response marks survey completed
    Tool: Bash
    Steps: In the hosted docs worktree `/home/gondilf/.local/share/opencode/worktree/e8cd5ce0af4b06d1493ee2b664244e58197cbfe9/crisp-eagle`, run `bun test apps/docs/src/pages/api/survey/launch.test.ts apps/docs/src/pages/api/survey/reconcile.test.ts` and `bun run --filter docs test`.
    Expected: State changes to completed exactly once and stores minimal reconciliation metadata.
    Evidence: .sisyphus/evidence/task-5-reconcile-completion.txt

  Scenario: Invalid or duplicate reconciliation input is harmless
    Tool: Bash
    Steps: In the hosted docs worktree, run `bun test apps/docs/src/pages/api/survey/reconcile.test.ts` covering mismatched hidden fields, duplicate finished responses, and repeated reconciliation runs, plus `bun run --filter docs test` as the baseline contract/build check.
    Expected: Non-matching responses are ignored; duplicate reconciliation is idempotent and does not corrupt state.
    Evidence: .sisyphus/evidence/task-5-reconcile-completion-error.txt
  ```

  **Commit**: NO | Message: `n/a` | Files: `n/a`

- [ ] 6. Add low-friction survey invitation dialog after transition completion

  **What to do**: Surface the survey invitation in the web app after an eligible transition completes using a confirmation dialog rather than an automatic redirect. The dialog should appear only for authenticated users whose survey state is `eligible`, should include concise thesis-oriented copy (“help evaluate Chiron’s effect on your current workflow”), and should expose three explicit actions: take survey, not now, and don't ask again. Only after the user clicks the take-survey action should the app request the launch URL and open the hosted survey page in a new tab/window. If the user clicks not-now, close the dialog and suppress re-prompting for the rest of the current session only. If the user clicks don't-ask-again, close the dialog and apply the one-time permanent experiment opt-out. Ensure only one invitation dialog appears for a given eligible transition completion even across rerenders in the same session.
  **Must NOT do**: Do not automatically redirect the user to the survey, do not display the prompt before transition completion, and do not open duplicate dialogs from repeated query invalidations/rerenders.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: this is a user-facing UX task that must feel lightweight and non-intrusive.
  - Skills: `[]` - Existing UI patterns are sufficient.
  - Omitted: [`web-design-guidelines`] - Helpful but not required for this bounded reuse of an existing dialog/invitation pattern.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [9, 10] | Blocked By: [1, 2, 3, 4]

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `apps/web/src/components/ui/dialog.tsx` - Use the established dialog primitive for explicit confirmation before leaving the current flow.
  - Pattern: `apps/web/src/features/projects/singleton-auto-attach-warning-toast.ts` - Reuse the concise CTA copy and action phrasing style, but not the automatic toast launch behavior.
  - Pattern: `apps/web/src/routes/projects.$projectId.work-units.$projectWorkUnitId.tsx` - This route already refreshes runtime work unit state after transition actions and is the selected insertion point.
  - Pattern: `apps/web/src/components/ui/sonner.tsx`
  - Pattern: `tests/e2e/runtime-work-units.spec.ts` - Existing runtime-work-unit flow for E2E coverage.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Completing an eligible transition shows exactly one survey invitation dialog.
  - [ ] The dialog contains take-survey, not-now, and don't-ask-again actions.
  - [ ] The survey page opens only after the user clicks the take-survey action.
  - [ ] The take-survey action opens the expected Astro gateway URL with non-PII metadata only.
  - [ ] The not-now action suppresses re-prompting for the rest of the current session only.
  - [ ] The don't-ask-again action triggers permanent experiment opt-out behavior.
  - [ ] Users not in `eligible` state do not see the dialog.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Eligible transition shows one dialog with valid CTA
    Tool: Playwright
    Steps: Complete a seeded eligible runtime transition, inspect the resulting dialog, click the take-survey action, and capture the launched survey URL parameters.
    Expected: Exactly one dialog appears and the CTA URL includes experimentId, surveyVersion, participantRef or launchToken, and optional installId but no raw identity values.
    Evidence: .sisyphus/evidence/task-6-survey-dialog.png

  Scenario: Re-render or duplicate transition signal does not spam user
    Tool: Playwright
    Steps: Revisit the page / trigger query invalidation / simulate duplicate success handling after the same eligible transition.
    Expected: No duplicate dialog appears for the same eligibility event.
    Evidence: .sisyphus/evidence/task-6-survey-dialog-error.png
  ```

  **Commit**: NO | Message: `n/a` | Files: `n/a`

- [ ] 7. Implement not-now, permanent dismiss, click, and suppression behavior across sessions/devices

  **What to do**: Wire the dialog actions to the experiment state model. Clicking the take-survey action should record `clicked` with timestamp/context but should not suppress future prompts permanently unless and until completion is later confirmed by reconciliation. Clicking not-now should suppress the dialog for the current session only, with re-prompting allowed in a later session after another eligible transition. Clicking don't-ask-again should permanently opt the user out for the remainder of the one-time experiment. Eligibility checks must read from hosted state so permanent dismiss/reconciled-completion behavior is consistent across reloads, sessions, tabs, and devices, while same-session snooze behavior remains respected. Explicitly define clicked-but-abandoned behavior: because this is a one-time thesis survey, re-prompt only if the user never permanently dismissed and never completed, with same-session snooze still preventing immediate repetition.
  **Must NOT do**: Do not make permanent dismiss browser-local only, do not permanently suppress on click alone, and do not rely on client memory alone to decide whether the survey has already been seen.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: once the state contract exists, this is a bounded integration of prompt actions to server-backed eligibility rules.
  - Skills: `[]` - No extra skill required.
  - Omitted: [`opencode-sdk`] - Irrelevant.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [9, 10] | Blocked By: [3, 4]

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `packages/db/src/schema/auth.ts` - User-linked persistent state pattern.
  - Pattern: `packages/db/src/schema/runtime.ts` - Status/timestamp modeling conventions.
  - Pattern: `apps/web/src/routes/projects.$projectId.work-units.$projectWorkUnitId.tsx` - Mutation success points and query invalidation behavior.
  - Pattern: `apps/web/src/components/ui/dialog.tsx` - Action callbacks and visibility state should follow the app’s dialog conventions.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Not-now suppresses the dialog for the current session only and allows re-prompting in a later session.
  - [ ] Don't-ask-again updates server state and suppresses future dialogs for that user across reloads and devices.
  - [ ] Take-survey updates server state to `clicked` without incorrectly marking completion.
  - [ ] A completed user never sees the invitation dialog again for this one-time experiment.
  - [ ] Multi-tab usage does not produce contradictory prompt state.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Not-now suppresses only the current session
    Tool: Playwright
    Steps: Click not-now, trigger another eligible event in the same session, then start a fresh session fixture and revisit an eligible flow.
    Expected: The dialog does not reappear in the same session but can reappear in the later session.
    Evidence: .sisyphus/evidence/task-7-survey-suppression.png

  Scenario: Take-survey without completion does not falsely close experiment forever
    Tool: Playwright
    Steps: Click the take-survey action, close the external page before submission, then revisit eligibility flow without a reconciled finished response.
    Expected: User state is clicked-not-completed, and re-prompt behavior matches the documented one-time experiment policy.
    Evidence: .sisyphus/evidence/task-7-survey-suppression-error.png
  ```

  **Commit**: YES | Message: `feat(experiment): add survey prompt and completion reconciliation` | Files: `apps/web/src/routes/*`, `apps/web/src/features/projects/*`, server/router integration files

- [ ] 8. Add backend automated tests for survey state and Formbricks reconciliation

  **What to do**: Add or update server/package tests covering the experiment state lifecycle, email-hash identity matching, launch token validation, Formbricks reconciliation, duplicate completed email rejection, and idempotent repeated reconciliation. Include fixtures for an authenticated user, an eligible transition completion context, a normalized email identity, participantRef, hidden-field metadata, and Formbricks response payload variants. Keep the tests narrow to the experiment contract and repository/API behavior rather than generic survey engine abstractions.
  **Must NOT do**: Do not rely on manual database inspection or ad hoc console logging to prove correctness.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: backend correctness and idempotency are critical to thesis data integrity.
  - Skills: `[]` - Existing repo patterns are sufficient.
  - Omitted: [`effect-best-practices`] - Not needed unless the touched code introduces new Effect services.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: [10] | Blocked By: [1, 2, 3, 5]

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `.sisyphus/plans/chiron-thesis-survey-experiment.md` - Backend tests in this task apply to both the hosted Astro gateway routes and any Chiron-side identity/state adapters.
  - Pattern: `/home/gondilf/.local/share/opencode/worktree/e8cd5ce0af4b06d1493ee2b664244e58197cbfe9/crisp-eagle/apps/docs/package.json` - Hosted docs test/build commands.
  - Pattern: `/home/gondilf/.local/share/opencode/worktree/e8cd5ce0af4b06d1493ee2b664244e58197cbfe9/crisp-eagle/apps/docs/src/pages/api/survey/launch.ts`
  - Pattern: `/home/gondilf/.local/share/opencode/worktree/e8cd5ce0af4b06d1493ee2b664244e58197cbfe9/crisp-eagle/apps/docs/src/pages/api/survey/launch.ts`
  - Pattern: `/home/gondilf/.local/share/opencode/worktree/e8cd5ce0af4b06d1493ee2b664244e58197cbfe9/crisp-eagle/apps/docs/src/pages/api/survey/reconcile.ts` - Planned hosted reconciliation route.
  - Test: `packages/api/src/tests/routers/project-runtime-mutations.test.ts` - Existing Chiron-side router/service test style for local integration points.
  - Test: `packages/db/src/tests/repository/runtime-executions-repository.test.ts` - Repository/idempotency assertion style.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Tests cover valid completed-response reconciliation, mismatched hidden-field rejection, duplicate completed email rejection, repeated reconciliation idempotency, and click-vs-complete distinction.
  - [ ] Tests assert exact state transitions and timestamps rather than only status codes.
  - [ ] The server test suite passes with the new experiment coverage included.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Backend survey-state suite passes
    Tool: Bash
    Steps: In `/home/gondilf/.local/share/opencode/worktree/e8cd5ce0af4b06d1493ee2b664244e58197cbfe9/crisp-eagle`, run `bun test apps/docs/src/pages/api/survey/launch.test.ts apps/docs/src/pages/api/survey/reconcile.test.ts` and `bun run --filter docs test`; in the Chiron repo, run `bun test packages/api/src/tests/routers/survey-state.test.ts packages/db/src/tests/repository/survey-participant-repository.test.ts`.
    Expected: Exit code 0 with explicit passing coverage for completion, rejection, and idempotency.
    Evidence: .sisyphus/evidence/task-8-server-tests.txt

  Scenario: Regression catches false completion semantics
    Tool: Bash
    Steps: Run `bun test packages/api/src/tests/routers/survey-state.test.ts packages/db/src/tests/repository/survey-participant-repository.test.ts` and assert the named cases `click does not mark completion`, `completed email cannot launch twice`, and `reconciliation is idempotent` pass.
    Expected: Tests fail if click is treated as completion and pass once semantics are correct.
    Evidence: .sisyphus/evidence/task-8-server-tests-error.txt
  ```

  **Commit**: NO | Message: `n/a` | Files: `n/a`

- [ ] 9. Add frontend automated tests for onboarding readiness, eligibility, dialog rendering, and suppression

  **What to do**: Add or update web Vitest tests for the onboarding and prompt orchestration logic. Cover onboarding readiness (user created + BMAD seeded), eligible vs ineligible users, dialog appearance after transition completion, CTA metadata generation, dismiss/not-now behavior, and duplicate-render protection. Mock the survey state API and route mutations in the same style as the existing runtime work-unit route tests.
  **Must NOT do**: Do not depend solely on E2E tests for prompt logic that can be validated at component/route level.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: this is UI behavior verification tied to route/component state.
  - Skills: `[]` - Existing testing patterns are enough.
  - Omitted: [`vercel-react-best-practices`] - Performance guidance is not the main concern here.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: [10] | Blocked By: [1, 2, 3, 4, 6, 7]

  **References** (executor has NO interview context - be exhaustive):
  - Test: `apps/web/vitest.config.ts`
  - Test: `apps/web/src/tests/routes/runtime-work-units.test.tsx` - Route-level mocking/testing style.
  - Pattern: `apps/web/src/routes/projects.$projectId.work-units.$projectWorkUnitId.tsx`
  - Pattern: `apps/web/src/features/projects/singleton-auto-attach-warning-toast.ts`

  **Acceptance Criteria** (agent-executable only):
  - [ ] Frontend tests cover onboarding readiness, eligible display, ineligible suppression, dialog actions, and duplicate-dialog prevention.
  - [ ] Tests assert that CTA metadata excludes raw identity values.
  - [ ] The web test suite passes with the new survey coverage included.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Frontend survey prompt tests pass
    Tool: Bash
    Steps: Run `bunx vitest --config apps/web/vitest.config.ts --run apps/web/src/tests/routes/survey-prompt.test.tsx`.
    Expected: Exit code 0 with explicit passing assertions for eligible/ineligible prompt behavior.
    Evidence: .sisyphus/evidence/task-9-web-tests.txt

  Scenario: Duplicate dialog regression is caught
    Tool: Bash
    Steps: Run `bunx vitest --config apps/web/vitest.config.ts --run apps/web/src/tests/routes/survey-prompt.test.tsx` and assert the named case `renders one dialog for repeated success signals` passes.
    Expected: Exactly one dialog render is asserted; duplicate prompt behavior would fail the suite.
    Evidence: .sisyphus/evidence/task-9-web-tests-error.txt
  ```

  **Commit**: NO | Message: `n/a` | Files: `n/a`

- [ ] 10. Add Playwright coverage for end-to-end survey prompt and suppression flows

  **What to do**: Extend the existing runtime work-unit E2E coverage so an agent can validate the full survey experiment flow in browser automation. Cover: create local user, seed BMAD from the in-app onboarding path, reach an eligible transition completion, show the dialog, launch the Astro survey gateway with expected metadata, not-now suppresses only the current session, don't-ask-again suppresses future prompts, completed reconciliation suppresses future prompts, and failure of the survey-state API does not block normal work-unit interaction. Reuse existing page object / fixture infrastructure where possible.
  **Must NOT do**: Do not create a brittle E2E flow that depends on repeated real third-party submissions; use stub/test-mode launch and simulate reconciliation state changes within the test environment.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: this is focused end-to-end coverage building on existing Playwright infrastructure.
  - Skills: `[]` - Existing project patterns suffice.
  - Omitted: [`playwright`] - The repo already has Playwright configured; no extra skill load is required for the plan.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: [] | Blocked By: [2, 4, 5, 6, 7, 8, 9]

  **References** (executor has NO interview context - be exhaustive):
  - Test: `playwright.config.ts`
  - Test: `tests/e2e/runtime-work-units.spec.ts`
  - Test: `tests/support/fixtures/index.ts`
  - Test: `tests/support/page-objects/app.page.ts`
  - Pattern: `apps/web/src/routes/projects.$projectId.work-units.$projectWorkUnitId.tsx`
  - Pattern: `/home/gondilf/.local/share/opencode/worktree/e8cd5ce0af4b06d1493ee2b664244e58197cbfe9/crisp-eagle/apps/docs/src/pages/survey.astro`
  - Pattern: `/home/gondilf/.local/share/opencode/worktree/e8cd5ce0af4b06d1493ee2b664244e58197cbfe9/crisp-eagle/apps/docs/src/pages/api/survey/launch.ts`

  **Acceptance Criteria** (agent-executable only):
  - [ ] Playwright covers happy-path prompt display and both not-now and completed suppression cases.
  - [ ] Playwright asserts the CTA launch URL contains experiment metadata but no raw identity fields.
  - [ ] Playwright proves that survey-state failures do not block runtime work-unit use.
  - [ ] The targeted E2E survey suite passes.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: End-to-end survey prompt flow passes
    Tool: Bash
    Steps: In the Chiron repo, run `bunx playwright test tests/e2e/runtime-work-units.spec.ts --grep "survey"`; in the hosted docs repo, run `bun run test:docs` to verify the gateway page remains routable/buildable.
    Expected: Browser automation completes the onboarding and transition flow, sees the survey dialog, validates the hosted launch URL, and records evidence.
    Evidence: .sisyphus/evidence/task-10-e2e-survey.txt

  Scenario: Failure mode does not block work-unit usage
    Tool: Bash
    Steps: In the Chiron repo, run `bunx playwright test tests/e2e/runtime-work-units.spec.ts --grep "survey failure does not block work-unit usage"`.
    Expected: The work-unit transition flow still completes normally; only the survey prompt behavior degrades gracefully.
    Evidence: .sisyphus/evidence/task-10-e2e-survey-error.txt
  ```

  **Commit**: YES | Message: `test(experiment): cover survey prompt and suppression flows` | Files: `tests/e2e/*`, `apps/web/src/tests/*`, `apps/server/src/tests/*`, `packages/api/src/tests/*`, `packages/db/src/tests/*`

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [ ] F1. Plan Compliance Audit — oracle
- [ ] F2. Code Quality Review — unspecified-high
- [ ] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [ ] F4. Scope Fidelity Check — deep

  **Execution instructions for the final wave**:
  - Run the four review tasks in parallel only after Tasks 1-10 are complete.
  - Review inputs must include:
    - this plan file: `.sisyphus/plans/chiron-thesis-survey-experiment.md`
    - Chiron worktree changes in `/home/gondilf/.local/share/opencode/worktree/e8cd5ce0af4b06d1493ee2b664244e58197cbfe9/stellar-cactus`
    - hosted Astro/docs changes in `/home/gondilf/.local/share/opencode/worktree/e8cd5ce0af4b06d1493ee2b664244e58197cbfe9/crisp-eagle`
    - evidence files generated under `.sisyphus/evidence/`
  - All four must approve before presenting results to the user.

  **QA Scenarios**:
  ```
  Scenario: F1 Plan compliance audit
    Tool: Read + Grep
    Steps: Read `.sisyphus/plans/chiron-thesis-survey-experiment.md`, inspect generated evidence under `.sisyphus/evidence/`, and grep both worktrees to verify the implemented files/paths align with the planned ownership boundary, hosted endpoints, and acceptance criteria.
    Expected: The audit finds no missing mandatory deliverables, no mismatched ownership boundary, and no unimplemented acceptance criteria.
    Evidence: .sisyphus/evidence/f1-plan-compliance.md

  Scenario: F2 Code quality review
    Tool: skill
    Steps: Run `skill(name="review-work")` and review the completed implementation across both worktrees for code quality, maintainability, security-sensitive handling of launch/webhook logic, and test adequacy after the documented automated commands have passed.
    Expected: The review-work report returns no blocking defects, or all returned defects are fixed before approval.
    Evidence: .sisyphus/evidence/f2-code-quality.md

  Scenario: F3 Real manual QA
    Tool: Bash + Playwright
    Steps: Run `bun test apps/docs/src/pages/api/survey/launch.test.ts apps/docs/src/pages/api/survey/webhook.test.ts` and `bun run --filter docs test` in `crisp-eagle`; run `bun test packages/api/src/tests/routers/survey-state.test.ts packages/db/src/tests/repository/survey-participant-repository.test.ts`, `bunx vitest --config apps/web/vitest.config.ts --run apps/web/src/tests/routes/survey-prompt.test.tsx`, and `bunx playwright test tests/e2e/runtime-work-units.spec.ts --grep "survey"` in `stellar-cactus`.
    Expected: All commands exit 0 and the reviewer confirms the happy path plus failure-path evidence is present.
    Evidence: .sisyphus/evidence/f3-manual-qa.txt

  Scenario: F4 Scope fidelity check
    Tool: Read + Grep
    Steps: Read the final plan and grep both worktrees for scope-drift indicators: native survey UI inside Chiron, generalized feedback platform abstractions, raw email passed to Formbricks payloads, or extra milestone triggers beyond transition completion.
    Expected: No scope drift indicators are found; otherwise each violation is listed with the offending file path.
    Evidence: .sisyphus/evidence/f4-scope-fidelity.md
  ```

## Commit Strategy
- Pre-implementation commit in `stellar-cactus`:
  - commit this plan only
- Post-merge survey implementation on `feat/effect-migration` should use this future commit stack:
  1. `feat(survey): add thesis survey config artifact`
     - Scope: checked-in survey instrument/config under `apps/docs/src/lib/survey`
     - Contents: exact question text, branching rules, scale labels, metadata contract constants, advisor-facing mapping note if colocated
     - Must NOT include: launch/webhook logic, Chiron app dialog logic, unrelated docs changes
  2. `feat(survey): implement hosted launch and webhook flow`
     - Scope: Astro/Vercel survey gateway behavior in `crisp-eagle`
     - Contents: `apps/docs/src/pages/survey.astro`, `apps/docs/src/pages/api/survey/launch.ts`, `apps/docs/src/pages/api/survey/reconcile.ts`, `apps/docs/src/lib/server/survey-provider.ts`, hosted survey persistence layer, email-hash identity handling, launch-token/signing or signed launch payload generation, duplicate-completed-email rejection, and explicit `SURVEY_MODE=test|prod|disabled` behavior
     - Must NOT include: Chiron app dialog integration
  3. `feat(survey): add Chiron dialog and identity integration`
     - Scope: Chiron-side onboarding readiness, dialog UX, and calls into the hosted survey backend
     - Contents: create-user → seed-BMAD readiness gates, take-survey / not-now / don't-ask-again actions, hosted eligibility/state calls, local convenience cache fields only
     - Must NOT include: survey wording/config changes unless strictly required by integration wiring
  4. `test(survey): cover survey flow end to end`
     - Scope: hosted route tests, Chiron-side state tests, frontend route tests, Playwright/docs smoke coverage
     - Contents: exact test files and evidence generation for launch, reconciliation, duplicate suppression, onboarding readiness, and failure paths
- Validation rule after each future commit:
  - on the source branch, run the commit-scoped checks from this plan
  - cherry-pick onto `feat/effect-migration` with `git cherry-pick -x <commit>`
  - rerun docs/app checks immediately before proceeding to the next commit

## Success Criteria
- Chiron can ask the right experiment participants at the right moment with minimal friction.
- The survey instrument produces analyzable evidence about perceived novelty, benefit, and tradeoffs vs current workflows.
- Completion tracking is trustworthy enough for thesis reporting.
- Privacy posture is explicit and conservative.
- Executors can implement the feature without making unresolved product, data, or UX decisions.
