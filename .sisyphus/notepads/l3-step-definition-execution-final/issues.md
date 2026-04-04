- `bun run check-types` remains blocked by pre-existing repo-wide type errors outside Task 10 scope, including unresolved `@chiron/agent-runtime` imports in `server/src/index.ts`, multiple `packages/agent-runtime/src/opencode/*` error-channel/type mismatches, existing `packages/api/src/routers/project.ts` workspace-snapshot typing, and several nullability contract mismatches in `packages/db` / `packages/workflow-engine`.

- 2026-04-03 F1 audit (`l3-step-definition-execution-final`): REJECTED. Blocking variances: `apps/server/src/mcp/chiron-mcp-router.ts` implements a custom Hono JSON route instead of the locked `@hono/mcp` + `@modelcontextprotocol/sdk` transport, and `packages/workflow-engine` still persists/leaks `opencode*` adapter details (`l3-step-execution-repository.ts`, `agent-step-runtime-service.ts`) instead of keeping them confined to `packages/agent-runtime`.
- 2026-04-03 OpenCode SDK rollout issue: targeted OpenCode tests are intermittently failing in this environment because OpenCode server startup exits immediately (`Server exited with code 1`, log under `~/.local/share/opencode/log/...`) even when launched by SDK on allocated ports.
## 2026-04-03 FINAL WAVE
- Blocking issue: required opencode adapter tests fail in this environment with server process exit code 1.
- Blocking issue: deferred placeholder is still present in workflow-execution-detail-service (mode: "deferred").
- Potential architecture concern persists: MCP router read_context_value path orchestrates multiple services directly in transport layer.

- 2026-04-03 slice-1 shared foundation audit: runtime step persistence is still form-coupled (`step_executions.step_definition_id -> methodology_workflow_form_steps.id`), shared step detail/submit services rely on the `project.<factDefinitionId>` naming convention, and production server wiring does not provide the step-execution/form/context-fact repository capabilities those services need.
- 2026-04-03 slice-1 shared foundation audit: `WorkflowAuthoringTransactionService` and `StepExecutionTransactionService` are orchestration-only, not atomic transaction boundaries; later slices will inherit partial-write risk unless a real cross-repository transaction seam is introduced.

- 2026-04-03 scope-fidelity blocker: `projectRootPath` create-project support is partial (contracts + web route/tests present) but API boundary is not updated in `packages/api/src/routers/project.ts` (`createAndPinProjectInput` omits `projectRootPath`, and `createProject(...)` does not forward it).

- 2026-04-04 triage: current working tree contains coordinated drift around stale Form ownership of `contextFacts` (`FormStepPayload.contextFacts` + UI `Context Facts` tab), `SetupTags` coupling, and `work_unit_reference` context-fact scope usage across contracts/router/repository and lock-tests; these files should be isolated from immediate commit until model-boundary direction is finalized.
