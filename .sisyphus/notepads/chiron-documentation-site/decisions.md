# Chiron Documentation Site - Decisions

## Architectural Decisions

### Framework Choice: VitePress

- Rationale: Vue-based static site generator, excellent for technical docs
- Alternative considered: Docusaurus (React-based, heavier)
- Decision: VitePress for lighter weight and VuePress ecosystem alignment

### Hosting Choice: Vercel

- Rationale: Native Git integration, monorepo support, automatic preview deployments
- Alternative considered: Netlify, GitHub Pages
- Decision: Vercel for seamless Git-based workflow

### Public/Internal Separation Strategy

- Public docs: `apps/docs` - usage-focused, VitePress site
- Internal docs: `docs/**` - architecture, canonical references, implementation details
- Boundary: Public docs link to internal docs as "advanced resources"
- Rationale: Keep public docs focused on usage while preserving deep technical context internally

### Layer Naming Strategy

- Public: Methodology Layer, Work Unit Layer, Workflow Layer, Step Layer
- Internal/Legacy: L1, L2, L3 (glossary-only in public)
- Rationale: Clear, descriptive names for public audience; legacy labels for internal consistency

### Taskflow Example Strategy

- Single consistent example used throughout public docs
- Three scenario slices: setup/onboarding, fan-out/delegation, review/rework
- Rationale: Concrete, relatable example that demonstrates concepts in practice

## Notepad Updates

### Format

```markdown
## [TIMESTAMP] Task: {task-id}

{decision and rationale}
```

### Append-only

- Never overwrite existing entries
- Always append new decisions to the end

## [2026-04-23] Task: internal-docs-boundary

- Decision: keep `docs/**` as the internal canonical tree and use `docs/README.md` as the active router for canon, contextual support, and archive-only material.
- Rationale: contributors still need one in-repo authority chain, while public docs stay focused and avoid mirroring architecture docs wholesale.

- Decision: treat `docs/architecture/epic-3-authority.md`, `docs/architecture/chiron-module-structure.md`, `docs/architecture/methodology-canonical-authority.md`, `docs/architecture/methodology-pages/**`, and `docs/architecture/modules/README.md` as the primary advanced resources that public docs or the root `README.md` may link to.
- Rationale: these files give the strongest routing and architecture context without turning the public site into a duplicate of the internal tree.

- Decision: keep historical and superseded files discoverable, but classify them as archive-only or contextual lineage rather than current truth.
- Rationale: the repo keeps thesis and implementation history, but authors need a plain rule that archive material must not drive public or implementation-facing claims.

## [2026-04-23] Task: docs-turbo-and-verification-plumbing

- Decision: model the docs site as its own workspace package (`apps/docs`) with package-local `build`, `dev`, `preview`, and `test` scripts, then let root verification flow through Turbo filters.
- Rationale: this keeps the docs app inside the same task graph as the other apps instead of relying on ad hoc root-only commands.

- Decision: track VitePress output explicitly as `.vitepress/dist/**` and override docs package build/test inputs in `apps/docs/turbo.json` to include Markdown content, VitePress config, and root docs smoke tests.
- Rationale: docs caching must invalidate on content/config/test changes, and Vercel/local preview both need a predictable static output directory.

- Decision: isolate docs browser verification in `playwright.docs.config.ts` with `DOCS_BASE_URL` defaulting to `http://127.0.0.1:4173`, plus a docs preview task that builds before serving.
- Rationale: docs smoke tests must never inherit the web app `BASE_URL` or port `3001`, and previewing the built artifact is the closest local check to deployment behavior.

## [2026-04-24] Task: docs-app-scaffold

- Decision: scaffold `apps/docs` as a standalone VitePress workspace package with package-local `dev`, `build`, `preview`, and `test` scripts instead of treating public docs as a root-only script target.
- Rationale: the docs site now participates in Bun workspaces and the Turbo task graph like the other apps, which makes local development and deployment behavior predictable.

- Decision: keep public docs source files directly under `apps/docs` with `.vitepress` for configuration/theme and Markdown pages for the public information architecture.
- Rationale: public docs content now lives where public docs belong and stays independent from `apps/web`, `apps/server`, and runtime data dependencies.

- Decision: standardize docs local ports at `4303` for `dev` and `4304` for `preview`, both with `--strictPort`.
- Rationale: this avoids collisions with the existing web/app ports and preserves a stable, explicit docs URL instead of silently drifting to a fallback port.

- Decision: override docs build/test inputs in `apps/docs/turbo.json` so Markdown content and `.vitepress` changes invalidate the docs package correctly.
- Rationale: VitePress output and content changes need package-aware caching rather than generic `src/**` assumptions.

## [2026-04-24] Task: methodology-and-work-unit-public-docs

- Decision: keep the Methodology Layer page strictly global, centered on methodology-wide facts, dependency definitions, and the work-unit catalog, with only a short note on versioning and publishing.
- Rationale: this preserves the public layer boundary from the authority matrix and stops version mechanics from taking over the page.

- Decision: teach the Work Unit Layer as one overview page plus four deep dives for facts, artifact slots, workflows, and transitions/state machine.
- Rationale: the work-unit contract is easier to grasp when each durable concern gets its own page, while the overview page still shows how the pieces connect.

- Decision: explain workflows and transitions as separate concepts, then connect them through explicit workflow bindings in both the overview page and the transitions deep dive.
- Rationale: this matches the internal canonical docs and avoids collapsing lifecycle policy into a generic workflow concept.

- Decision: use Taskflow as the running example and simple screenshot placeholders on the new design-time pages.
- Rationale: the public docs plan calls for one consistent example, and placeholders preserve future visual slots without inventing screenshots that do not exist yet.

## [2026-04-24] Task: shared-intro-and-taskflow-spine

- Decision: make Taskflow the public docs spine by centering the homepage, mental model page, and three scenario slices on setup/onboarding, fan-out/delegation, and review/rework.
- Rationale: one stable example keeps the orientation story readable and lets branching, artifact production, and supervision show up without teaching internal architecture in the intro pages.

- Decision: keep public layer language to Methodology Layer, Work Unit Layer, Workflow Layer, and Step Layer, then isolate legacy `L1/L2/L3` references to the glossary bridge page.
- Rationale: new readers get clearer labels, while existing contributors still have an explicit translation path from older internal shorthand.

- Decision: expand VitePress navigation with a dedicated Taskflow section and a Reference section that exposes the glossary and legacy bridge.
- Rationale: the new orientation content only helps if readers can move through the scenario spine and terminology pages from primary navigation.

## [2026-04-24] Task: workflow-and-step-layer-public-docs

- Decision: split the new design-time content into a Workflow Layer overview, a dedicated workflow context facts page, a Step Layer overview, and one page per step type.
- Rationale: workflow ownership and step semantics are easier to understand when the shared layer pages stay readable and each step family gets its own capabilities, constraints, and maturity framing.

- Decision: keep workflow context facts as a first-class subsection and deep-dive page, then describe them as execution-scoped workflow data rather than durable methodology or work-unit definition data.
- Rationale: this matches the runtime grouping contracts and avoids flattening workflow-local handoff data into the wrong fact scope.

- Decision: label `agent` and `display` as not yet fully implemented in runtime depth, and describe `action` as partially implemented with explicit deferred areas.
- Rationale: public docs need to teach the fixed six-step taxonomy without overclaiming unfinished end-to-end execution behavior.
## [2026-04-24] Task: taskflow-consistency-checks-and-placeholders
- Kept Taskflow as the only running example across shared intro, Design Time, Project Runtime, and reference pages instead of inventing per-page mini examples.
- Distributed the three scenario slices explicitly across overview pages so setup, delegation, and review stay connected instead of appearing as isolated chapters.
- Added screenshot placeholder callouts on pages that discuss concrete UI surfaces, step configuration, or runtime/operator views, so no visual need is left implicit.
- Added a public Taskflow consistency check page to make the scenario, branching, artifact, and placeholder rules auditable.

## [2026-04-24] Task: project-runtime-public-docs

- Decision: structure the public Project Runtime track as one operator-facing overview plus deep dives for project facts, work-unit instances, workflow executions, and step executions.
- Rationale: operators need to move from broad project context into finer execution detail without starting from schema language.

- Decision: make each runtime page start with observable Taskflow actions, then explain the runtime object behind the page, then end with explicit back-links to the design-time layer or contract that defines it.
- Rationale: this keeps runtime docs grounded in what a person can inspect in the product while still teaching where the behavior comes from.

- Decision: label step-execution depth unevenly, calling out that `form`, `branch`, `invoke`, and `action` have concrete runtime detail today, while broader Step Layer depth is still partial.
- Rationale: public docs need to stay honest about what operators can inspect now without overclaiming unfinished runtime depth.

## [2026-04-24] Task: github-readme-gateway-refresh

- Decision: rewrite the root `README.md` as a short GitHub gateway with a concise product overview, local setup steps, local run commands, and a small internal-docs link set.
- Rationale: the authority matrix says the README should route readers into the public docs and internal canon, not duplicate the full conceptual handbook.

- Decision: replace primary `L1/L2/L3` framing in the README with the public layer names `Methodology Layer`, `Work Unit Layer`, `Workflow Layer`, and `Step Layer`, while keeping legacy shorthand as a bridge-only note.
- Rationale: the public docs refresh established the newer layer language as the public teaching surface, so the README should match it.

## [2026-04-24] Task: docs-vercel-native-deployment

- Decision: treat `apps/docs` as its own Vercel monorepo project with Root Directory set to `apps/docs`, instead of routing docs deployment through the main web app or a separate CI workflow.
- Rationale: Vercel's native monorepo Git integration is the intended deployment path, and isolating the docs app keeps preview/production behavior specific to the public docs surface.

- Decision: check in a minimal `apps/docs/vercel.json` plus an app-local `build:docs` alias so the deployment contract stays `bun install` + `bun run build:docs` + `.vitepress/dist`.
- Rationale: maintainers now have one explicit, repo-visible deployment contract that matches local verification naming without adding broader Vercel plumbing to unrelated apps.

- Decision: document preview-on-PR / production-on-`main` behavior and call out that no docs-specific environment variables are currently required.
- Rationale: future maintainers need the operational expectations in-repo, not only in the Vercel dashboard.

## [2026-04-24] Task: docs-smoke-tests-and-full-verification

- Decision: expand docs smoke coverage around user-visible guarantees instead of single-page rendering only, covering homepage hierarchy, Taskflow continuity, Design Time and Project Runtime navigation, public layer labels, legacy-label suppression, public/internal boundary rules, and runtime-to-design-time backlinks.
- Rationale: the final docs gate needs to prove the public information architecture and language rules hold across the site, not just that VitePress boots.

- Decision: make Playwright docs verification preview the built `apps/docs` artifact directly on `127.0.0.1:4173` inside `playwright.docs.config.ts` rather than relying on the package preview script's separate port.
- Rationale: smoke tests should validate the deployment-shaped build output on the dedicated docs base URL without drifting onto the main app port or a mismatched preview port.

## [2026-04-24] Task: final-verification-remediation
- Decision: keep `/reference/internal-docs` as a public page but remove it from first-class sidebar navigation so the public site can explain the boundary without mirroring internal docs as a nav destination.
- Decision: add git-ignore coverage for `apps/docs/.vitepress/cache/`, `apps/docs/.vitepress/.temp/`, and `apps/docs/.turbo/` in addition to OX ignore coverage so docs verification does not leave noisy generated artifacts in the workspace.

## [2026-04-24] Task: docs-brand-and-step-icons

- Decision: copy the Chiron brand mark and step-type SVGs from `apps/web/public/visuals/**` into `apps/docs/public/**` instead of referencing the web app asset paths directly.
- Rationale: the docs site keeps its own deployable static asset set, so branding and step imagery remain stable even when the web app asset pipeline changes.

- Decision: render step-type icons as shared page-hero badges in the six Step Layer markdown pages and style them through the existing tokenized `custom.css` theme.
- Rationale: one consistent badge pattern reinforces the six-type grammar visually without introducing one-off inline styling or breaking the docs site's carbon/fluo design system.

## [2026-04-24] Task: astro-docs-migration

- Decision: replace the VitePress shell with an Astro server app that keeps the existing markdown files in place and re-renders them through an Astro catch-all route plus shared nav/sidebar data.
- Rationale: this preserves the published IA, slugs, and content authority while making room for colocated server routes.

- Decision: keep production builds on the Vercel adapter, but switch local preview/test flows to the Node adapter when `ASTRO_LOCAL_PREVIEW=1` is set.
- Rationale: the docs site needs Vercel-compatible server output for deployment, but Astro's local preview command only works with the Node adapter.

- Decision: add `/survey`, `POST /api/survey/launch`, and `POST /api/survey/webhook` as explicit scaffolds with JSON/content-type guards and TODO markers rather than partial business logic.
- Rationale: the migration goal is to establish server surface area for later integration without inventing provider behavior, secret handling, or ingestion rules.

## [2026-04-24] Task: astro-tailwind-mdx-integration

- Decision: integrate Tailwind through Astro's Vite plugin and a dedicated `src/styles/tailwind.css` file that imports Tailwind theme/utilities only, while continuing to load `src/styles/docs.css` as the primary brand/style layer.
- Rationale: the docs app needs utility classes for local composition, but the existing Chiron tokenized shell must remain visually authoritative and should not be reset by Tailwind preflight.

- Decision: expose the existing Chiron CSS variables to Tailwind through inline theme tokens instead of replacing the design system with a separate Tailwind color scale.
- Rationale: this keeps utility usage aligned with the same tokens already driving the public docs shell.

- Decision: add MDX support as an additive authoring option and document `/reference/authoring-with-mdx` as the example path, while leaving the current `.md` corpus unchanged.
- Rationale: most docs pages should stay simple markdown, but authors need an explicit pattern for the cases where imported Astro components or richer layout composition are justified.

## [2026-04-24] Task: astro-tailwind-mdx-integration-remediation

## [2026-04-24] Task: starlight-migration
- Decision: migrate `apps/docs` to Starlight 0.35 on Astro 5.7.9, move public docs content into `src/content/docs/`, and replace the custom catch-all docs shell with Starlight's content collection and manual sidebar.
- Rationale: this preserves the public IA and slugs while adding built-in docs features like search, collapsible sidebar groups, pagination, and table-of-contents handling.

- Decision: keep production builds on the Vercel adapter but switch local preview/test flows to the Node adapter when `ASTRO_LOCAL_PREVIEW=1` is set.
- Rationale: Vercel remains the deployment target, while Node preview avoids adapter-specific preview failures during Playwright smoke validation.

- Decision: keep `/survey` and `/api/survey/*` as standalone Astro routes outside the Starlight content collection.
- Rationale: the survey scaffolding needs to stay server-capable without dragging old custom docs layouts forward.

- Decision: keep Tailwind additive by importing it directly at the top of `apps/docs/src/styles/docs.css` and mapping the existing Chiron CSS variables into Tailwind utility tokens with `@theme inline`.
- Rationale: this preserves the current docs shell and token source of truth while making Tailwind utilities available everywhere the layout already imports `docs.css`.

- Decision: keep `/reference/authoring-with-mdx` as the end-to-end proof page and pair it with a reusable `src/components/DocsCallout.astro` component that can be imported from MDX.
- Rationale: one working MDX example plus one reusable Astro component is enough to demonstrate richer authoring without converting the broader docs corpus away from ordinary markdown.

## [2026-04-24] Task: docs-smoke-preview-entrypoint-fix

- Decision: add an app-local `apps/docs` script for the smoke-test preview flow and point `playwright.docs.config.ts` at that script.
- Rationale: this makes `bun run test:docs` boot the Astro preview server through the same package-local contract every time, avoiding fragile inline command chaining while leaving the production Vercel build untouched.

## [2026-04-24] Task: single-user-docs-language-alignment
- Public docs wording now uses single-user framing for current behavior, and the claim policy explicitly marks multi-user and team support as planned rather than shipped.
