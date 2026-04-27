# Chiron

Chiron is a methodology-first system for modeling and supervising agentic software delivery in a structured, inspectable way.

It gives teams durable objects for methodology versions, work units, workflows, facts, artifact slots, states, transitions, and human review. The goal is simple: turn AI-assisted delivery from a loose chain of chats into a system you can inspect, guide, and verify.

## Start here

- [Public docs](./apps/docs/) for the product overview, mental model, Taskflow example, and public layer language
- [Internal docs index](./docs/README.md) for repo-only architecture and planning canon

Public docs use these layer names:

- Methodology Layer
- Work Unit Layer
- Workflow Layer
- Step Layer

If you know the older internal shorthand, use the public docs bridge pages instead of treating `L1`, `L2`, and `L3` as the main framing.

## Current status

Chiron already has meaningful design-time and project-runtime surfaces in the repo, including methodology definitions, work-unit authoring, facts, workflows, state and transition modeling, and runtime execution views.

The Step Layer and the deepest step-execution behavior are still not fully implemented. For the full teaching flow, use the public docs. For deeper implementation intent, use the internal docs.

## Current priority

The near-term delivery focus is the public docs site and the thesis survey flow hosted from `apps/docs`.

That means the most important operational path right now is:

- deploy `apps/docs` to Vercel
- keep the survey routes under `apps/docs/src/pages/api/survey/*` working
- make local repo setup obvious for docs-only work and for full app development

Desktop packaging work exists in the repo, but it is not the main shipping path for this phase.

The public docs story is intentionally narrower than the full product surface. The Taskflow example currently follows setup and onboarding until the project reaches the `Architecture` work unit, then stops instead of trying to teach the full downstream delivery lifecycle.

## Run locally

### Prerequisite

- [Bun](https://bun.sh)

### Install dependencies

```bash
bun install
```

That install step also sets up the repo's Git hooks through Lefthook, so staged TypeScript/JavaScript files get `oxlint --fix` and `oxfmt --write` before commit.

### Docs and survey only

If you only need the public docs site and survey gateway locally:

```bash
bun install
bun run dev:docs
```

Docs local URL:

- Public docs + survey gateway: `http://localhost:4303`

The docs app also hosts the survey landing page and survey API routes:

- `http://localhost:4303/survey`
- `http://localhost:4303/api/survey/launch`
- `http://localhost:4303/api/survey/state`
- `http://localhost:4303/api/survey/not-now`
- `http://localhost:4303/api/survey/dismiss`
- `http://localhost:4303/api/survey/complete-test` (test mode only)

For the survey flow, set these env vars in the Vercel project or your local environment:

- `DATABASE_URL` or `POSTGRES_URL` for survey persistence
- `SURVEY_MODE` (`test` by default, `prod` when ready)
- `SURVEY_TOKEN_SECRET` or `PUBLIC_SURVEY_TEST_SECRET`
- optional Formbricks settings for production reconciliation:
  - `FORMBRICKS_SURVEY_URL`
  - `FORMBRICKS_API_BASE_URL`
  - `FORMBRICKS_SURVEY_ID`
  - `FORMBRICKS_API_KEY`

If you are testing survey prompts from the main app, also set:

- `VITE_SURVEY_GATEWAY_URL` to your deployed or local docs origin

### Local end-to-end survey journey

You can test the whole Chiron-to-survey loop locally without webhooks.

1. Start the docs gateway in test mode with persistence configured.
2. Start the main app with `VITE_SURVEY_GATEWAY_URL=http://localhost:4303`.
3. In Chiron, complete the first transition that should trigger the survey prompt.
4. Click **Take survey** and confirm the browser opens `/survey` and then the external Formbricks URL.
5. Simulate survey completion locally:

```bash
curl -X POST http://localhost:4303/api/survey/complete-test \
  -H 'content-type: application/json' \
  -d '{"email":"you@example.com"}'
```

6. Confirm completion state:

```bash
curl -X POST http://localhost:4303/api/survey/state \
  -H 'content-type: application/json' \
  -d '{"email":"you@example.com"}'
```

Expected result: the returned survey `status` becomes `completed`.

7. Complete another transition in Chiron with the same signed-in user. The survey prompt should no longer appear for that participant.

### Full app development

Use this when you need the main web app and API, not just docs/survey.

#### Set up the local database

```bash
bun run db:push
```

Optional seed data:

```bash
bun run db:seed
```

### Start the app

```bash
bun run dev
```

Default local endpoints:

- Web app: `http://localhost:3001`
- API server: `http://localhost:3000`

### Start only the docs site

```bash
bun run dev:docs
```

Docs site:

- Public docs local dev server: `http://localhost:4303`

### Preview the built docs site locally

```bash
bun run preview:docs
```

Preview URL:

- Public docs preview: `http://localhost:4304`

## Deploy docs and survey

`apps/docs` is deployed as its own Vercel project with native Git integration.

- Root Directory: `apps/docs`
- Framework: `astro`
- Install Command: `bun install`
- Build Command: `bun run build:docs`

The checked-in Vercel config lives in `apps/docs/vercel.json`.

This deployment includes both:

- the public docs pages
- the thesis survey surface and survey API routes

## Useful commands

- `bun run dev` to start the main local development environment
- `bun run dev:docs` to run only the public docs site
- `bun run build` to build the repo
- `bun run build:docs` to build the public docs site
- `bun run preview:docs` to preview the built public docs site locally
- `bun run lint` to run `oxlint`
- `bun run lint:fix` to apply `oxlint --fix`
- `bun run format` to apply `oxfmt --write`
- `bun run format:check` to check formatting without writing
- `bun run check` to run the repo OXC gate used in CI (`oxlint` + `oxfmt --check`)
- `bun run check-types` to run TypeScript checks
- `bun run test` to run tests
- `bun run test:docs` to run the public docs smoke tests
- `bun run test:e2e` to run Playwright tests

## Install without cloning

This README will get a dedicated install-without-clone guide once that flow is documented and supported as a public onboarding path.

For now, clone the repo and use the local setup steps above.

## Repo-only internal documentation

Use the internal docs when you need the contributor-facing architecture view instead of the public product narrative.

- [Internal docs index](./docs/README.md)
- [Epic 3 authority routing](./docs/architecture/epic-3-authority.md)
- [Module structure](./docs/architecture/chiron-module-structure.md)
- [Methodology canonical authority](./docs/architecture/methodology-canonical-authority.md)
- [Module docs index](./docs/architecture/modules/README.md)
