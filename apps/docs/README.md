# Chiron Public Docs App

This app is the public Astro documentation site for Chiron.

## Local development

From the repo root:

```bash
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

## Starlight structure

- Public docs content lives in `src/content/docs/`.
- Starlight configuration lives in `astro.config.mjs`.
- Theme overrides live in `src/styles/starlight-custom.css`.
- Survey scaffolding remains in `src/pages/survey.astro` and `src/pages/api/survey/*`.

## Vercel deployment

The docs site is intended to deploy through **Vercel native Git integration** as its own monorepo project.

- **Root Directory:** `apps/docs`
- **Checked-in project config:** `apps/docs/vercel.json`
- **Install Command:** `bun install`
- **Build Command:** `bun run build:docs`
- **Framework:** `astro`

Behavior expectations:

- Preview deployments are created for pull requests and other non-`main` branch pushes.
- Production deploys come from merges/pushes to `main`.
- No docs-specific environment variables are currently required.

For the fuller maintainer setup, see `docs/deployment.md` in the repository.
