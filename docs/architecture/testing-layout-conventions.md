# Testing Layout Conventions

Date: 2026-03-15

## Rule

For app and package source trees, tests must be colocated under:

- `src/tests/**`

Applies to:

- `apps/*/src/**`
- `packages/*/src/**`

## Allowed examples

- `apps/web/src/tests/routes/my-route.integration.test.tsx`
- `apps/desktop/src/tests/runtime/runtime-config.test.ts`
- `packages/contracts/src/tests/runtime/desktop-runtime.test.ts`

## Disallowed examples

- `apps/desktop/src/runtime-config.test.ts`
- `packages/scripts/src/__tests__/seed-error-handling.test.ts`
- `packages/project-context/src/service.test.ts`

## Guardrail

Use the workspace guardrail script:

```bash
bun run test:layout:guardrail
```

This fails if any `*.test.ts` / `*.test.tsx` under app/package `src/` is outside `src/tests/**`.
