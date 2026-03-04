# Frontend Better Result Guidelines

## Purpose

Use `better-result` in `apps/web` to keep error handling explicit, deterministic, and testable without pervasive language-level `try/catch` blocks.

## Current Direction

- Frontend uses `better-result` as the primary error-handling pattern.
- Frontend does not currently use `Effect` runtime APIs.
- Error handling should preserve deterministic diagnostics contracts required by methodology and project workflows.

## Canonical Rules

- Use `Result.try(...)` for synchronous throw-prone boundaries (for example `JSON.parse`, storage parsing, unsafe object access).
- Use `Result.tryPromise(...)` for async boundaries (for example API calls, mutation pipelines, async decoding).
- Convert unknown transport errors to deterministic diagnostics via shared mappers before rendering.
- Prefer `isErr()` and explicit branches or `match(...)`; avoid hidden implicit fallthrough.
- Treat `unwrap()` as exceptional for UI flows; prefer `unwrapOr(...)` or explicit `Err` handling.
- Keep error codes/scopes stable and machine-readable (`code`, `scope`, `blocking`, `required`, `observed`, `remediation`, `timestamp`, `evidenceRef`).

## Where To Use It

- Route mutation flows that need deterministic user-facing failures.
- Parsing and rehydration of persisted editor/workspace state.
- Mapping backend validation/publish/pinning outcomes to UI states.

## Where Not To Overuse It

- Pure UI transforms that cannot fail should remain plain functions.
- Do not wrap trivial computations just to return `Result`.
- Keep `Result` at risk boundaries, not everywhere in render code.

## Project-Specific Semantics

- Methodology version status is canonical as `draft | active | deprecated | retired`.
- `published` is an event type, not a version status.
- Project pinning targets publish-eligible versions represented by `status === "active"`.

## Existing Examples In This Repository

- Sync parsing: `apps/web/src/features/methodologies/version-workspace.tsx`
- Async mutation flow: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.tsx`
- Deterministic transport mapping: `apps/web/src/features/projects/deterministic-diagnostics.ts`

## Minimal Patterns

```ts
import { Result } from "better-result";

const parsed = Result.try(() => JSON.parse(raw));
if (parsed.isErr()) return fallback;
return parsed.value;
```

```ts
const result = await Result.tryPromise({
  try: async () => client.project.createAndPinProject(payload),
  catch: (error) => error,
});

if (result.isErr()) {
  setDiagnostics(mapTransportError(result.error));
  return;
}

handleSuccess(result.value);
```

## Review Checklist

- Are throw-prone boundaries wrapped with `Result.try/tryPromise`?
- Are `Err` branches mapped to deterministic diagnostics where required?
- Is UI avoiding raw unknown error dumps when deterministic diagnostics are expected?
- Are status semantics consistent with domain contracts (`active` vs event `published`)?
