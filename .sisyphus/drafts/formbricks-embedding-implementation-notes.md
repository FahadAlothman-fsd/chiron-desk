# Formbricks Embedding and Quota-Safe Testing Notes

## Purpose

These notes capture the concrete implementation decisions needed to embed or hand off to Formbricks from the hosted Astro docs site without burning the monthly response quota during normal development and automated testing.

## Core architectural rule

- **Chiron/Electron does not receive webhooks.**
- **For the simplified MVP, completion is reconciled by querying Formbricks from the server, not by requiring a webhook.**
- Chiron only launches the hosted survey flow and reads hosted survey state.

## Hosting boundary

Hosted repo/worktree:
- `/home/gondilf/.local/share/opencode/worktree/e8cd5ce0af4b06d1493ee2b664244e58197cbfe9/crisp-eagle`

Relevant files already present:
- `apps/docs/src/pages/survey.astro`
- `apps/docs/src/pages/api/survey/launch.ts`
- `apps/docs/src/pages/api/survey/webhook.ts` (can remain unused in the simpler MVP)

## Recommended provider abstraction

Add a hosted server module:
- `apps/docs/src/lib/server/survey-provider.ts`

This module should expose a mode-driven interface:
- `SURVEY_MODE=test`
- `SURVEY_MODE=prod`
- optional `SURVEY_MODE=disabled`

### Test mode behavior

Use this as the default for local development, CI, preview validation, and most automated tests.

In `test` mode:
- `POST /api/survey/launch` returns mock launch data
- reconciliation returns stub completion data
- no real Formbricks submission is created
- no monthly response quota is consumed
- the app can still validate:
  - identity flow
  - email hashing
  - launch token issuance
  - dialog/open behavior
  - snooze/dismiss/completed state transitions

### Prod mode behavior

Use only for explicit manual/staging verification and deployed study use.

In `prod` mode:
- `launch.ts` generates the real provider handoff/embedding config
- reconciliation queries the real Formbricks Management API using test or production environment credentials
- Formbricks is allowed to receive real survey traffic

## Why not test against real Formbricks by default

The user explicitly wants to avoid consuming the monthly 250-response limit during development.

Therefore the implementation should assume:
- local dev = stubbed
- automated tests = stubbed
- preview deploy validation = stubbed unless explicitly overridden
- only intentional staging/production verification = real Formbricks

## Embedding strategy

The hosted `/survey` page can:
- embed Formbricks in the page, or
- render a controlled launch CTA and then redirect to Formbricks

For quota-safe local testing, the embedded/launch surface should instead render a **test provider state** that mimics the expected flow without generating a real response.

## Reconciliation strategy

The hosted docs app (or Chiron server, if you later choose that boundary) can query Formbricks via the Management API and match responses using hidden fields such as `participantRef`, `surveyVersion`, and launch context metadata.

This removes the need for ngrok/public webhook setup during MVP development.

## Minimal environment contract

Hosted Astro app:
- `SURVEY_MODE`
- `SURVEY_TOKEN_SECRET`
- `FORMBRICKS_API_KEY_TEST`
- `FORMBRICKS_ENVIRONMENT_ID_TEST`
- `FORMBRICKS_SURVEY_ID_TEST`
- `FORMBRICKS_API_KEY_PROD`
- `FORMBRICKS_ENVIRONMENT_ID_PROD`
- `FORMBRICKS_SURVEY_ID_PROD`
- hosted database connection (for example Vercel Postgres)

Chiron side:
- survey gateway base URL
- no raw Formbricks secret material

## Verification philosophy

The implementation should prove the survey flow without spending quota by default.

That means tests should validate:
- the dialog appears at the right time
- launch calls return the expected payload in test mode
- stub reconciliation marks completion in test mode
- duplicate completed email identities are rejected
- the hosted survey route builds and remains routable

Only explicit prod-mode checks should exercise the real provider.
