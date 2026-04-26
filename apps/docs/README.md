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
