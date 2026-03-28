## 2026-03-29 - Unresolved

- Workspace-wide `check-types` currently fails at server/api composition boundary (`@chiron/workflow-engine` module resolution from `packages/api/src/routers/index.ts`).
- Follow-up needed outside this focused seam fix to restore monorepo-wide typecheck green.

## 2026-03-29 - Status update

- Previously logged server/api `@chiron/workflow-engine` module-resolution issue is now resolved in this branch; `bun run check-types` passes.

## 2026-03-29 - Current unresolved problems

- None from this runtime wiring fix after verification (`lsp_diagnostics` clean on changed files, `bun run check-types` pass, `bun run build` pass).
