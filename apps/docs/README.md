# Chiron Public Docs App

This app is the public Astro documentation site for Chiron.

It also hosts the thesis survey landing page and the survey API routes used by the main app.

## Local development

From the repo root:

```bash
bun run dev:docs
```

If you want the docs app to run against the same major Node version Vercel will use:

```bash
cd apps/docs
nvm use
cd ../..
bun run dev:docs
```

To build the production docs bundle locally:

```bash
bun run build:docs
```

To preview the built site locally:

```bash
bun run preview:docs
```

Docs + survey endpoints in local dev:

- Docs site: `http://localhost:4303`
- Survey landing page: `http://localhost:4303/survey`
- Survey API routes: `http://localhost:4303/api/survey/*`
- Test completion helper in `SURVEY_MODE=test`: `http://localhost:4303/api/survey/complete-test`

## Starlight structure

- Public docs content lives in `src/content/docs/`.
- Starlight configuration lives in `astro.config.mjs`.
- Theme overrides live in `src/styles/starlight-custom.css`.
- Survey flow lives in `src/pages/survey.astro` and `src/pages/api/survey/*`.

## Survey environment

For plain docs development, no extra environment variables are required.

For the survey flow, configure:

- `DATABASE_URL` or `POSTGRES_URL` for survey persistence
- `SURVEY_MODE` (`test` by default)
- `SURVEY_TOKEN_SECRET` or `PUBLIC_SURVEY_TEST_SECRET`

Optional production reconciliation variables:

- `FORMBRICKS_SURVEY_URL`
- `FORMBRICKS_API_BASE_URL`
- `FORMBRICKS_SURVEY_ID`
- `FORMBRICKS_API_KEY`

If the main app is calling this gateway, configure `VITE_SURVEY_GATEWAY_URL` in the web app to point at this docs origin.

## Local end-to-end survey test loop

This repo now supports a full local survey journey without webhooks.

### 1. Start the docs gateway in test mode

Set:

- `SURVEY_MODE=test`
- `DATABASE_URL` or `POSTGRES_URL`
- `PUBLIC_SURVEY_TEST_SECRET` or `SURVEY_TOKEN_SECRET`

Then run:

```bash
bun run dev:docs
```

### 2. Start the main app against the local gateway

Set in the web app environment:

```bash
VITE_SURVEY_GATEWAY_URL=http://localhost:4303
```

Then run the main app and log in with the email you want to test.

### 3. Trigger the prompt from Chiron

Complete the first transition that should open the thesis survey dialog.

### 4. Take the survey

Click **Take survey**. Chiron should call `/api/survey/launch`, open the local `/survey` gateway, and then forward you to the external Formbricks survey URL with the signed hidden fields.

### 5. Simulate completion locally

After you reach the external survey page, mark the participant as completed locally:

```bash
curl -X POST http://localhost:4303/api/survey/complete-test \
  -H 'content-type: application/json' \
  -d '{"email":"you@example.com"}'
```

You can also use `participantRef` directly instead of `email`.

### 6. Verify state

```bash
curl -X POST http://localhost:4303/api/survey/state \
  -H 'content-type: application/json' \
  -d '{"email":"you@example.com"}'
```

Expected result: `status` should be `completed`.

### 7. Verify Chiron respects completion

Complete another eligible transition in Chiron with the same user. The survey dialog should not reopen because the gateway now returns `completed` for that participant.

## Vercel deployment

The docs site is intended to deploy through **Vercel native Git integration** as its own monorepo project.

- **Root Directory:** `apps/docs`
- **Checked-in project config:** `apps/docs/vercel.json`
- **Install Command:** `bun install`
- **Build Command:** `bun run build:docs`
- **Framework:** `astro`
- **Target Node runtime:** `22.x` (via `apps/docs/package.json`)

For local shell alignment, `apps/docs/.nvmrc` is set to `22`.

This single Vercel deployment serves both:

- the public docs site
- the survey landing page and `api/survey/*` endpoints

Behavior expectations:

- Preview deployments are created for pull requests and other non-`main` branch pushes.
- Production deploys come from merges/pushes to `main`.
- Plain docs pages do not require extra environment variables, but the survey flow does.

For the fuller maintainer setup, see `docs/deployment.md` in the repository.
