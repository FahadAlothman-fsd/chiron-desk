# Chiron Documentation Site - Issues

## Known Issues and Gotchas

### Notepad Updates

### Format
```markdown
## [TIMESTAMP] Task: {task-id}
{issue description and workaround}
```

### Append-only
- Never overwrite existing entries
- Always append new issues to the end

## [2026-04-24] Task: f4-scope-fidelity-review
- Scope review found the public docs site does not meet Definition of Done verification gates in the current workspace.
- `bun run build` fails because the docs app cannot resolve `vue` from `apps/docs/.vitepress/.temp/app.js` during VitePress build.
- `bun run test:docs` fails with multiple missing generated `.vitepress/.temp/*.md.js` modules during page rendering.
- Root-level `bun run check-types` and `bun run test` also fail, so the plan's verification command requirements are not currently satisfied.
- Public docs config enables local search (`themeConfig.search.provider = "local"`), which violates the plan's `Must NOT Have` ban on search extras.

## [2026-04-24] Task: docs-smoke-tests-and-full-verification

- Docs smoke coverage, docs build, README link checks, and targeted contracts/db fixes now pass locally.
- Full repository verification is still blocked by unrelated repo-wide failures outside the docs scope:
  - `bun run check-types` fails in `packages/workflow-engine/src/services/runtime/agent-step-mcp-service.ts`, `packages/workflow-engine/src/services/runtime/agent-step-runtime-support.ts`, `packages/workflow-engine/src/services/transition-execution-command-service.ts`, `packages/workflow-engine/src/services/workflow-context-external-prefill-service.ts`, and `packages/workflow-engine/src/services/workflow-execution-detail-service.ts`.
  - `bun run test` still fails in non-doc packages, including missing service wiring in workflow-engine runtime tests, a workflow-context prefill expectation mismatch, a web route timeout, missing `VITE_SERVER_URL` in some web tests, and a seeding timeout in `packages/scripts`.

## [2026-04-24] Task: f1-plan-compliance-audit

- Current F1 audit result is rejectable because the governance artifacts and shipped public corpus have drifted apart.
- `.sisyphus/notepads/chiron-documentation-site/page-inventory.md` still declares public slugs such as `/reference/claim-policy`, `/reference/internal-docs`, `/project-runtime/project-overview`, `/project-runtime/work-unit-instance`, `/project-runtime/transition-executions`, `/project-runtime/artifact-slots`, and `/project-runtime/runtime-guidance`, but matching pages are absent from `apps/docs/**`.
- `package.json` does not expose a normal headless docs-smoke command; only `test:docs:headed` and `test:docs:ui` point at `playwright.docs.config.ts`, so the plan requirement for a dedicated docs Playwright command is not fully met even though `bunx playwright test -c playwright.docs.config.ts` passes manually.
- Planned evidence artifacts for later docs tasks are missing from `.sisyphus/evidence/`, including `task-10-*`, `task-11-*`, and `task-12-*` records.
- `bun run check-types` currently fails in repo code outside `apps/docs`, so Task 12's required full verification suite is not satisfied in the current workspace.

## [2026-04-24] Task: final-verification-wave-f2-code-quality-review
- `bun run test:docs` currently exercises VitePress build twice (`build` dependency plus the docs package `test` script) but does not execute `tests/docs/smoke.spec.ts`, so the monorepo docs test pipeline does not cover the actual smoke suite.
- `bunx playwright test -c playwright.docs.config.ts` passed locally while `playwright.docs.config.ts` was allowed to reuse an existing server (`reuseExistingServer: !process.env.CI`), which weakens determinism and can hide build/startup regressions during local review.
- Root `bun run check` is not clean for the docs app because generated `apps/docs/.vitepress/cache/**` files are included in lint/format checks, producing warnings and `oxfmt --check` failures.
- Root `bun run check-types` remains red in non-doc workspace packages, so the repository-wide TypeScript quality gate required for approval is not currently satisfied.

## [2026-04-24] Task: final-verification-remediation
- Final Verification Wave still does not fully approve because F1 remains blocked on plan-level evidence gaps and repo-wide `bun run check-types` failures outside the docs scope.
- The docs-plan evidence set is still incomplete for earlier tasks (`task-1-*`, `task-3-*`, `task-4-*`, `task-5-*`), so final plan compliance cannot be claimed yet even though the docs fixes themselves now build and test cleanly.

## [2026-04-24] Task: starlight-migration
- Astro 5 + workspace root `zod@4` caused Starlight content parsing to fail during prerender; adding a docs-local `zod@^3.24.2` resolved the `_zod` build error.
- The `output: "hybrid"` instruction is not supported by the pinned Astro/Starlight-compatible stack used here, so the docs app now uses `output: "static"`, which still builds static docs pages while keeping survey routes available through the adapter/runtime split.
