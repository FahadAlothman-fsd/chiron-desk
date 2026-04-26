# Deployment

## Docs site and survey gateway (`apps/docs`) on Vercel

The public docs site deploys with **Vercel native Git integration** as a dedicated monorepo project.

This deployment is the current priority path. It serves both:

- the public Astro/Starlight docs site
- the thesis survey landing page and survey API routes

It is intentionally separate from the main web app and does **not** depend on the desktop packaging flow.

## Recommended Vercel project settings

Create or import a Vercel project for this repository and point it at the docs app.

- **Root Directory:** `apps/docs`
- **Framework Preset:** `astro`
- **Install Command:** `bun install`
- **Build Command:** `bun run build:docs`
- **Target Node runtime:** `22.x`

The checked-in app-local configuration lives in `apps/docs/vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "astro",
  "installCommand": "bun install",
  "buildCommand": "bun run build:docs"
}
```

The docs app itself also pins Node through `apps/docs/package.json`:

```json
"engines": {
  "node": "22.x"
}
```

For local shell alignment, the docs app also includes:

```text
apps/docs/.nvmrc
```

with the value:

```text
22
```

## Why the build command is `bun run build:docs`

Maintainers use the repo-level docs build entrypoint:

```bash
bun run build:docs
```

That command is the safest operational contract to document because it works from the repo root and matches what Vercel runs from the docs app root.

Script chain:

- Root `package.json`: `build:docs` -> `turbo run build --filter=docs`
- `apps/docs/package.json`: `build:docs` -> `bun run build`
- `apps/docs/package.json`: `build` -> `astro build`

## What deploys with `apps/docs`

This single app deployment includes:

- docs content under `apps/docs/src/content/docs/`
- public survey page at `/survey`
- survey API routes under `/api/survey/*`

Important survey entry points:

- `src/pages/survey.astro`
- `src/pages/api/survey/launch.ts`
- `src/pages/api/survey/state.ts`
- `src/pages/api/survey/not-now.ts`
- `src/pages/api/survey/dismiss.ts`
- `src/pages/api/survey/reconcile.ts`
- `src/pages/api/survey/webhook.ts`

## Environment variables

### Plain docs pages

No extra environment variables are required for a normal docs-only deploy.

### Survey flow

Required for persistence and token flow:

- `DATABASE_URL` or `POSTGRES_URL`
- `SURVEY_TOKEN_SECRET` or `PUBLIC_SURVEY_TEST_SECRET`

Operational mode:

- `SURVEY_MODE=disabled|test|prod`
  - defaults to `test` when unset

Optional gateway override:

- `SURVEY_GATEWAY_BASE_URL`

Optional Formbricks production settings:

- `FORMBRICKS_SURVEY_URL`
- `FORMBRICKS_API_BASE_URL`
- `FORMBRICKS_SURVEY_ID`
- `FORMBRICKS_API_KEY`

Optional test helper:

- `SURVEY_TEST_COMPLETED_PARTICIPANT_REF`

If the main Chiron web app should call this deployed survey gateway, configure the web app with:

- `VITE_SURVEY_GATEWAY_URL=<docs-origin>`

## Preview and production behavior

- **Preview deployments:** every pull request and other non-`main` Git update should get a preview deployment for the docs project.
- **Production deployment:** promote from the `main` branch.
- For monorepo hygiene, enable Vercel unaffected-project skipping so unrelated repo changes do not rebuild the docs app.

## Maintainer checklist

Before relying on auto-deploys, verify the Vercel project matches this contract:

1. Root Directory is `apps/docs`.
2. `apps/docs/vercel.json` is detected.
3. Install command is `bun install`.
4. Build command is `bun run build:docs`.
5. Framework preset is `astro`.
6. Preview deploys are enabled.
7. Production branch is `main`.
8. Survey environment variables are set if the survey flow is enabled.

## Local verification commands

From the repo root:

```bash
bun install
bun run dev:docs
bun run build:docs
bun run preview:docs
```

Local URLs:

- docs + survey dev server: `http://localhost:4303`
- docs preview server: `http://localhost:4304`
