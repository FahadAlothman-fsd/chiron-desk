- 2026-04-03: Kept persistence schema unchanged in this task (DB `opencode_*` columns) and enforced boundary at service/repository contract level by renaming workflow-engine fields to harness-generic binding names.
- 2026-04-03: Moved harness selection behind `@chiron/agent-runtime` by changing `HarnessInstanceService.createInstance` to infer adapter internally, preventing workflow-engine from hard-coding OpenCode harness type.
- 2026-04-03: Standardized API boundary imports in `packages/api/src/routers/l3-runtime-router.ts` and tests to use the package entrypoint `@chiron/workflow-engine` rather than reaching into `workflow-engine/src/index`.
- 2026-04-03: Removed router type bypass by changing branch route input to typed condition snapshots and routing mutation to `persistChosenRoute` instead of casting transport payload to `chooseRoute`'s evaluator-shaped API.
- 2026-04-03: MCP HTTP boundary is now locked to `/mcp/chiron` with SDK-native transport (`@hono/mcp` + `@modelcontextprotocol/sdk`) and query-scoped execution binding via `executionToken`, removing custom header-based execution routing.
- 2026-04-03: Kept runtime semantics unchanged while satisfying strict typing by normalizing nullable state/read-model fields at service/repository boundaries and mapping adapter-specific errors into declared harness/domain error channels instead of broad `Error` failures.
- 2026-04-03: Replaced fake OpenCode adapter stubs with real SDK calls: server lifecycle via `createOpencode(...)`, client/session operations via `createOpencodeClient(...).session.create/prompt/abort/delete`, and per-session SSE subscription for activity mapping.
## 2026-04-03 FINAL WAVE
- Final-wave verification verdicts set to REJECT for F1/F2/F3/F4 due to objective blockers (2 failing mandatory tests + deferred placeholder still present).
- Evidence was consolidated in .sisyphus/evidence/final-wave-tests.log and reviewer files updated in .sisyphus/evidence/f1-plan-compliance.md, f2-code-quality.md, f3-real-qa.md, f4-scope-fidelity.md.

