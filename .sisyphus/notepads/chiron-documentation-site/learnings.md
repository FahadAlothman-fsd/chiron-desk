# Chiron Documentation Site - Learnings

## Conventions and Patterns

### Public vs Internal Docs Boundary
- Public docs live in `apps/docs` (VitePress site)
- Internal docs stay in `docs/**` (in-repo, not published)
- Public docs can LINK to internal docs as "advanced resources"
- Internal docs are NOT mirrored into public site navigation

### Layer Naming (Public vs Legacy)
- Public docs use: `Methodology Layer`, `Work Unit Layer`, `Workflow Layer`, `Step Layer`
- Legacy `L1/L2/L3` labels are internal-only, appear only in glossary
- Never use `L1/L2/L3` as primary nav or page headings in public docs

### Taskflow Example
- Single running example used site-wide
- Three scenario slices: setup/onboarding, fan-out/delegation, review/rework
- Branching and artifact production embedded in these narratives

### Documentation Authority
- Code/contracts are implementation authority
- Public docs explain usage, not implementation internals
- Internal docs (`docs/**`) contain architecture and canonical references

## Build and Verification

### VitePress Integration
- Docs app is first-class monorepo package at `apps/docs`
- Own package.json with scripts for dev, build, preview
- Turbo task integration for caching and pipeline
- Separate Playwright config for docs smoke tests

### Vercel Deployment
- Native Git integration (not GitHub Actions)
- Monorepo deployment support
- Preview deployments on PRs
- Production deployment on main branch

## Notepad Updates

### Format
```markdown
## [TIMESTAMP] Task: {task-id}
{content}
```

### Append-only
- Never overwrite existing entries
- Always append new findings to the end

## [2026-04-23] Task: authority-matrix-and-page-inventory
- The governance baseline should treat `apps/docs` as the public teaching surface, root `README.md` as the GitHub gateway, `docs/**` as internal canonical architecture/planning, and code/contracts as implementation authority.
- Public page claim policies need an explicit split between `conceptual`, `current behavior`, and `planned/not fully implemented` to avoid overclaiming unfinished Step Layer/runtime depth.
- Runtime public page naming should stay aligned to contract terminology such as `project overview`, `work unit`, `transition execution`, `workflow execution`, and `step execution`.
- Public docs should include a dedicated legacy terminology bridge page so existing contributors can map `L1/L2/L3` to `Methodology Layer`, `Work Unit Layer`, `Workflow Layer`, and `Step Layer` without leaking legacy labels into primary navigation.

## [2026-04-24] Task: f4-scope-fidelity-review
- The implemented public IA largely matches the intended structure: `apps/docs` exists, Taskflow is the running example, Design Time and Project Runtime are split, runtime pages include design-time backlinks, and internal docs stay link-only rather than mirrored into nav.
- Scope fidelity still depends on verification gates actually passing; previous screenshots or stale `dist` output are not enough if current build/test commands fail in the workspace.
- The plan's `Must NOT Have` list should be checked against config, not just content pages; `themeConfig.search.provider = "local"` still counts as an out-of-scope search extra.

## [2026-04-24] Task: f1-plan-compliance-audit
- Governance artifacts need a final reconciliation pass against shipped docs pages; a page inventory with exact slugs is only useful if `apps/docs/**` actually matches it.
- Manual execution of `bunx playwright test -c playwright.docs.config.ts` can pass while plan compliance still fails if the repo does not expose that smoke test as a normal scripted verification command.
- For this docs plan, later-wave evidence gaps (`task-10` through `task-12`) are meaningful review signals because the plan explicitly expects evidence artifacts under `.sisyphus/evidence/`.

## [2026-04-24] Task: final-verification-wave-f2-code-quality-review
- For docs monorepo integration, a passing `bun run test:docs` is not enough unless that pipeline actually invokes the docs smoke suite; otherwise Turbo only proves the site can build.
- `reuseExistingServer` in Playwright is convenient for local iteration but weak for review gates because it can validate a stale/manual server instead of the configured build-and-preview flow.
- Generated VitePress cache content under `apps/docs/.vitepress/cache/**` should be excluded from repo-wide lint/format checks or cleaned before verification, otherwise docs tooling creates false-negative quality gates.

## [2026-04-24] Task: final-verification-remediation
- Docs-specific verification is now stable with `bun run test:docs` executing the Playwright smoke suite headlessly against a fresh VitePress build and preview server.
- Publishing a public `/reference/internal-docs` page while also placing it in the sidebar weakens the public/internal boundary signal; keeping it linkable in content without first-class sidebar placement better matches the plan boundary rule.
- Adding both `favicon.svg` and `favicon.ico` under `apps/docs/public/` removes preview-console favicon noise and makes browser/manual QA evidence cleaner.

## [2026-04-24] Task: docs-brand-and-step-icons
- VitePress can use the same copied SVG for both `themeConfig.logo` and the site favicon by pointing `head` at a public asset like `/chiron-icon.svg`, which keeps the docs brand surface independent from the web app bundle.
- Reusable HTML snippets inside Markdown pages work cleanly for visual callouts in VitePress when the styling stays in `.vitepress/theme/custom.css`; this is a good pattern for step-type badges and other docs-local UI affordances.
- The existing docs design language is already tokenized enough for small visual additions: use `--chiron-space-*`, `--vp-c-border`, and the carbon/alert/fluo palette instead of ad hoc sizes or colors.

## [2026-04-24] Task: astro-docs-migration
- Astro can preserve the existing `apps/docs/**/*.md` corpus without relocating files by using a catch-all route plus `import.meta.glob()` over the current markdown tree, which keeps public slugs stable while moving the app shell out of VitePress.
- `astro preview` does not work against the Vercel adapter, so local smoke verification needs a separate Node-based preview build path; gating that behind `ASTRO_LOCAL_PREVIEW=1` keeps production builds Vercel-compatible while restoring local preview/test ergonomics.
- Migrating framework-coupled smoke tests is easier if the new shell exposes stable semantic landmarks (`data-docs-nav`, `data-docs-sidebar`, `data-docs-content`) instead of relying on VitePress-specific DOM classes.

## [2026-04-24] Task: astro-tailwind-mdx-integration
- Tailwind can be added to the Astro docs app without disrupting the existing design system by loading only Tailwind `theme` and `utilities` layers, which keeps the current handcrafted base styles and tokens in control instead of letting preflight reset the docs shell.
- Astro MDX support is additive as long as the catch-all content loader globs both `.md` and `.mdx` and the route extension stripping handles `.mdx` too; the existing markdown corpus can stay untouched.
- A small Astro component imported from MDX is enough to prove the richer authoring path while keeping `.md` as the default format for ordinary docs pages.

## [2026-04-24] Task: astro-tailwind-mdx-integration-remediation
- The Astro docs app can keep its existing global shell intact by importing Tailwind into `src/styles/docs.css` and exposing existing Chiron CSS variables through `@theme inline` token aliases.
- A single catch-all markdown loader can support both `.md` and `.mdx` content without moving the existing corpus, as long as the glob list explicitly includes both extensions.
- A reusable Astro component plus one reference MDX page is enough to prove the authoring path end-to-end and gives smoke tests a stable build artifact to validate.

## [2026-04-24] Task: docs-smoke-preview-entrypoint-fix
- For Astro server output, Playwright is more reliable when the webServer uses an app-local preview script instead of an inline `bunx astro ...` chain.
- A dedicated `preview:test` script keeps the smoke-test boot path aligned with the docs package itself and still preserves the Vercel adapter build path for normal production builds.

## [2026-04-24] Task: starlight-migration
- Starlight on Astro 5 works cleanly when the docs app pins a local `zod@^3.24.x`; otherwise the workspace root `zod@4` can break content-schema parsing during prerender.
- A Starlight splash homepage does not render the sidebar, so smoke tests should assert sidebar groups on a doc page like `/mental-model/` instead of `/`.
- Local preview for Playwright is more reliable through the Node adapter gated by `ASTRO_LOCAL_PREVIEW=1`, while production builds can stay on the Vercel adapter.
