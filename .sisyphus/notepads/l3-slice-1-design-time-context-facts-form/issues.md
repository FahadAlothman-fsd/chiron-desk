## 2026-04-05 verification notes

- `apps/web` build passes with `bun run build`.
- `apps/web` typecheck does **not** currently pass because of pre-existing unrelated errors in workflow-canvas, desktop API test mocks, runtime repository/service exact-optional typing, and workflow-editor integration tests. These failures were not introduced by the fact-picker changes.
- Targeted verification for this task passed with `bunx turbo -F web build` and `bunx vitest run apps/web/src/tests/routes/workflow-editor-form-slice.integration.test.tsx`.
- `bunx turbo -F web check-types` still fails on unrelated pre-existing errors outside the changed fact-picker files, so typecheck could not be used as the final acceptance gate for this patch.

## 2026-04-05 context fact cardinality binding verification

- `bunx turbo build --filter=web` passes after the cardinality-binding change in `apps/web/src/features/workflow-editor/dialogs.tsx`.
- `bunx vitest run apps/web/src/tests/routes/workflow-editor-form-slice.integration.test.tsx` passes after the change.
- `bunx turbo check-types --filter=web` still fails on unrelated pre-existing errors in `workflow-canvas`, desktop API mocks, runtime repository/service typing, and transition execution services; no diagnostics were reported in the changed dialog file itself.

## 2026-04-05 workflow edge cleanup verification

- `bun run build` passes after removing edge `conditionJson`/`guidanceJson` usage and introducing `description_markdown` on `methodology_workflow_edges`.
- `bun test packages/db/src/tests/repository/l3-slice-1-repositories.test.ts packages/db/src/tests/repository/l3-slice-1-runtime-repositories.test.ts packages/contracts/src/tests/l3-slice-1-contracts.test.ts packages/methodology-engine/src/tests/l3/l3-slice-1-workflow-editor-services.test.ts packages/methodology-engine/src/tests/validation/validation.test.ts packages/api/src/tests/routers/l3-slice-1-methodology-router.test.ts` passes.
- `bun test packages/db/src/tests/repository/methodology-repository.integration.test.ts` passes after refreshing that file's ad-hoc SQL schema to match current repository dependencies (`description_json`/`project_root_path`/runtime pin-history tables) and aligning two stale expectations with current snapshot output.
