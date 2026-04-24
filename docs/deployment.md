# Deployment

## Docs site (`apps/docs`) on Vercel

The public docs site deploys with **Vercel native Git integration** as a dedicated monorepo project.

This setup is intentionally separate from the main web app and does **not** rely on GitHub Actions.

## Recommended Vercel project settings

Create/import a Vercel project for the repository and point it at the docs app.

- **Root Directory:** `apps/docs`
- **Framework Preset:** `VitePress`
- **Install Command:** `bun install`
- **Build Command:** `bun run build:docs`
- **Output Directory:** `.vitepress/dist`

The checked-in app-local configuration lives in `apps/docs/vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vitepress",
  "installCommand": "bun install",
  "buildCommand": "bun run build:docs",
  "outputDirectory": ".vitepress/dist"
}
```

## Why the build command is `bun run build:docs`

Maintainers already use the repo-level docs build entrypoint:

```bash
bun run build:docs
```

That command is the safest operational contract to document because it is also the command contributors can run locally from the repository root before merging docs changes.

Inside `apps/docs/package.json`, `build:docs` is a local alias for the VitePress production build so the same command name works when Vercel runs from the docs app root.

## Output expectations

- VitePress emits the static site into `apps/docs/.vitepress/dist`.
- Because the Vercel project root is `apps/docs`, the configured output directory is `.vitepress/dist`.
- Turbo already treats `.vitepress/dist/**` as a build artifact in both the root `turbo.json` and `apps/docs/turbo.json`.

## Environment assumptions

- The repository pins Bun via the root `packageManager` field (`bun@1.3.9`).
- The docs app currently builds as a static VitePress site and does not require docs-specific environment variables.
- The current docs build uses files under `apps/docs` and VitePress itself; if the docs app later imports workspace packages or other files outside `apps/docs`, revisit the Vercel project setting for including source files outside the root directory.

## Preview and production behavior

- **Preview deployments:** every pull request and other non-`main` Git update should get a preview deployment for the docs project.
- **Production deployment:** the docs site promotes from the `main` branch.
- For monorepo hygiene, enable Vercel's unaffected-project skipping for the docs project so unrelated repository changes do not rebuild the docs site.

## Maintainer checklist

Before relying on auto-deploys, verify the Vercel project matches this contract:

1. Root Directory is `apps/docs`.
2. `apps/docs/vercel.json` is detected.
3. Install command is `bun install`.
4. Build command is `bun run build:docs`.
5. Output directory is `.vitepress/dist`.
6. Preview deploys are enabled.
7. Production branch is `main`.

Local verification command:

```bash
bun run build:docs
```
