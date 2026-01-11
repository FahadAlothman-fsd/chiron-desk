# Story 2.M1: Effect Foundation

Status: ready-for-dev

## Story

As a **Developer**,
I want **the workflow engine to use Effect as its core runtime shell**,
so that **we have proper error handling, resource management, and composable services that fix the parent-child variable propagation bug blocking Story 2-3**.

## Acceptance Criteria

### AC1: Effect Runtime + Core Dependencies
- [ ] Effect packages installed: `effect`, `@effect/platform`, `@effect/schema`
- [ ] Effect runtime configured in server entry point (`apps/server/src/index.ts`)
- [ ] Runtime layer composition pattern established for services

### AC2: DatabaseService Layer
- [ ] Create `DatabaseService` Effect Service wrapping Drizzle
- [ ] Transaction support via `Effect.acquireRelease` pattern
- [ ] Proper cleanup on scope close
- [ ] Located at: `packages/api/src/services/workflow-engine/effect/database-service.ts`

### AC3: ConfigService Layer
- [ ] Create `ConfigService` Effect Service for environment configuration
- [ ] Type-safe config access (API keys, database URLs, feature flags)
- [ ] Located at: `packages/api/src/services/workflow-engine/effect/config-service.ts`

### AC4: Tagged Error Types
- [ ] Define `WorkflowError` variants: `WorkflowNotFoundError`, `ExecutionNotFoundError`, `MaxStepsExceededError`
- [ ] Define `StepError` variants: `StepTimeoutError`, `StepValidationError`, `UnknownStepTypeError`
- [ ] Define `VariableError` variants: `VariableNotFoundError`, `VariableValidationError`
- [ ] Define `AgentError` variants: `AgentStreamError`, `ToolExecutionError`, `ApprovalRejectedError`
- [ ] Use `Data.TaggedError` pattern from Effect
- [ ] Located at: `packages/api/src/services/workflow-engine/effect/errors.ts`

### AC5: Error Recovery Utilities
- [ ] Implement `withRetry` using `Effect.retry` + `Schedule.exponential`
- [ ] Implement `withTimeout` using `Effect.timeout` with custom error mapping
- [ ] Located at: `packages/api/src/services/workflow-engine/effect/error-utils.ts`

### AC6: ExecutionContext Service
- [ ] Create `ExecutionContext` Effect Service (scoped per workflow execution)
- [ ] Properties: `executionId`, `workflowId`, `projectId`, `parentExecutionId`, `variables`, `currentStepNumber`
- [ ] **Fresh-read guarantee**: Child workflow variable reads MUST query DB after parent write commits (no stale cache)
- [ ] Located at: `packages/api/src/services/workflow-engine/effect/execution-context.ts`

### AC7: WorkflowEventBus (PubSub)
- [ ] Create `WorkflowEventBus` Effect Service using `PubSub.bounded`
- [ ] Event types: `WorkflowStarted`, `StepStarted`, `StepCompleted`, `ToolCallStarted`, `ToolCallCompleted`, `TextChunk`, `ApprovalRequested`, `WorkflowCompleted`, `WorkflowError`
- [ ] `publish` and `subscribe` methods returning `Effect.Effect` / `Stream.Stream`
- [ ] **Publish timeout (100ms)** - prevents slow consumers from blocking executor
- [ ] **Sliding strategy** - drop oldest events when buffer full (don't block)
- [ ] Proper shutdown via `Effect.acquireRelease`
- [ ] Located at: `packages/api/src/services/workflow-engine/effect/event-bus.ts`

### AC8: StepHandlerRegistry Service
- [ ] Create `StepHandlerRegistry` Effect Service
- [ ] `getHandler(stepType)` returns `Effect.Effect<StepHandler, UnknownStepTypeError>`
- [ ] Register existing handlers (wrapped in Effect)
- [ ] Located at: `packages/api/src/services/workflow-engine/effect/step-registry.ts`

### AC9: Executor Loop as Effect.gen
- [ ] Refactor `workflow-executor.ts` to use `Effect.gen` pattern
- [ ] Step loop with `Effect.scoped` for lifecycle management
- [ ] MAX_STEPS guard (100) with `MaxStepsExceededError`
- [ ] Timeout per step (5 minutes) with retry schedule
- [ ] Emit events via `WorkflowEventBus` at each lifecycle point

### AC10: Main Layer Composition
- [ ] Create `MainLayer` combining all services
- [ ] Export from `packages/api/src/services/workflow-engine/effect/index.ts`
- [ ] Runnable via `Effect.runPromise(program.pipe(Effect.provide(MainLayer)))`

### AC11: Feature Flag for Executor Selection
- [ ] Add `USE_EFFECT_EXECUTOR` environment variable (default: `false`)
- [ ] Workflow start endpoint checks flag and routes to appropriate executor
- [ ] Both executors can run in parallel during migration period
- [ ] Located in: `ConfigService` and workflow router

## Success Metrics

- [ ] All 11 services compile with zero type errors
- [ ] Event bus can handle 100 events/second without dropping (load test)
- [ ] Executor completes test workflow in <5s (baseline: current Mastra ~3s)
- [ ] Zero memory leaks after 100 workflow executions (manual verification)
- [ ] Variable propagation works in parent-child workflow (the original bug)

## Tasks / Subtasks

### Task 0: Branch Setup (FIRST - before any code changes) [~15 min]
- [ ] 0.1 Create branch: `git checkout -b feat/effect-migration`
- [ ] 0.2 Push branch: `git push -u origin feat/effect-migration`
- [ ] 0.3 All migration work (2-M1 through 2-M5) happens on this branch

### Task 0.5: Effect Learning Spike [~2-3 hours]
- [ ] 0.5.1 Complete Effect basics tutorial: https://effect.website/docs/getting-started
- [ ] 0.5.2 Build tiny spike: Effect service that wraps a simple DB query
- [ ] 0.5.3 Experiment with `Effect.gen`, `Data.TaggedError`, `PubSub` in isolation
- [ ] 0.5.4 Delete spike code after learning (don't commit to branch)

### Task 1: Install Effect Dependencies (AC: 1) [~30 min]
- [ ] 1.1 Add `effect`, `@effect/platform`, `@effect/schema` to `packages/api/package.json`
- [ ] 1.2 Run `bun install` from root
- [ ] 1.3 Verify TypeScript picks up Effect types

### Task 2: Create Effect Services Directory Structure (AC: 2-8) [~15 min]
- [ ] 2.1 Create directory: `packages/api/src/services/workflow-engine/effect/`
- [ ] 2.2 Create index.ts barrel export

### Task 3: Implement DatabaseService (AC: 2) [~2 hours]
- [ ] 3.1 Create `database-service.ts`
- [ ] 3.2 Wrap existing Drizzle `db` instance
- [ ] 3.3 Implement `transaction` method with acquireRelease
- [ ] 3.4 Write unit test: `database-service.test.ts`

### Task 4: Implement ConfigService (AC: 3) [~1-2 hours]
- [ ] 4.1 Create `config-service.ts`
- [ ] 4.2 Read from `process.env` with defaults
- [ ] 4.3 Type-safe config schema using Effect Schema or Zod
- [ ] 4.4 Write unit test: `config-service.test.ts`

### Task 5: Define Tagged Error Types (AC: 4) [~1 hour]
- [ ] 5.1 Create `errors.ts`
- [ ] 5.2 Define all error classes using `Data.TaggedError`
- [ ] 5.3 Export union types: `WorkflowError`, `StepError`, `VariableError`, `AgentError`

### Task 6: Implement Error Utilities (AC: 5) [~2 hours]
- [ ] 6.1 Create `error-utils.ts`
- [ ] 6.2 Implement `withRetry` with exponential backoff + jitter
- [ ] 6.3 Implement `withTimeout` with error mapping
- [ ] 6.4 Write unit test: `error-utils.test.ts`

### Task 7: Implement ExecutionContext (AC: 6) [~2 hours]
- [ ] 7.1 Create `execution-context.ts`
- [ ] 7.2 Define service interface
- [ ] 7.3 Implement scoped context creation

### Task 8: Implement WorkflowEventBus (AC: 7) [~3-4 hours]
- [ ] 8.1 Create `event-bus.ts`
- [ ] 8.2 Define `WorkflowEvent` discriminated union
- [ ] 8.3 Implement PubSub with bounded capacity (256) + sliding strategy
- [ ] 8.4 Implement subscribe returning Effect Stream
- [ ] 8.5 Add publish timeout (100ms)
- [ ] 8.6 Write unit test: `event-bus.test.ts`

### Task 9: Implement StepHandlerRegistry (AC: 8) [~2-3 hours]
- [ ] 9.1 Create `step-registry.ts`
- [ ] 9.2 Define `StepHandler` interface for Effect
- [ ] 9.3 Wrap existing handlers (ask-user, ask-user-chat, execute-action, invoke-workflow, display-output)
- [ ] 9.4 Return `UnknownStepTypeError` for unregistered types

### Task 10a: Create Executor Shell (AC: 9) [~2-3 hours]
- [ ] 10a.1 Create `executor.ts` (new Effect-based executor)
- [ ] 10a.2 Implement basic step loop with `Effect.gen`
- [ ] 10a.3 Add `Effect.scoped` for workflow lifecycle
- [ ] 10a.4 Add MAX_STEPS guard (100) with `MaxStepsExceededError`

### Task 10b: Integrate EventBus Lifecycle (AC: 9) [~2 hours]
- [ ] 10b.1 Emit `WorkflowStarted` on execution begin
- [ ] 10b.2 Emit `StepStarted` / `StepCompleted` per step
- [ ] 10b.3 Emit `WorkflowCompleted` or `WorkflowError` on finish
- [ ] 10b.4 Ensure events emit in correct order

### Task 10c: Add Timeout and Retry (AC: 9) [~1-2 hours]
- [ ] 10c.1 Add per-step timeout (5 minutes) via `Effect.timeout`
- [ ] 10c.2 Map timeout to `StepTimeoutError`
- [ ] 10c.3 Add retry with `Schedule.exponential` (30s max)
- [ ] 10c.4 Add jitter to prevent thundering herd

### Task 10d: Executor Unit Tests (AC: 9) [~2-3 hours]
- [ ] 10d.1 Write unit test: `executor.test.ts`
- [ ] 10d.2 Test: step loop executes in order
- [ ] 10d.3 Test: MAX_STEPS triggers error
- [ ] 10d.4 Test: timeout triggers retry then error

### Task 11: Create MainLayer (AC: 10) [~1-2 hours]
- [ ] 11.1 Compose all services into `MainLayer`
- [ ] 11.2 Export from `effect/index.ts`
- [ ] 11.3 Update server entry to use Effect runtime

### Task 12: Verification & Cleanup [~1 hour]
- [ ] 12.1 Run `bun check` - all lint/format passes
- [ ] 12.2 Run `bun test` - all tests pass
- [ ] 12.3 Manual test: Start workflow, verify events emit
- [ ] 12.4 Update AGENTS.md if patterns changed

### Task 12.5: Integration Test with Real Workflow (Critical - validates the bug fix) [~3-4 hours]
- [ ] 12.5.1 Create or identify parent-child test workflow (if none exists in seeds)
- [ ] 12.5.2 Execute via Effect executor with `USE_EFFECT_EXECUTOR=true`
- [ ] 12.5.3 Assert: all events emitted in correct order
- [ ] 12.5.4 **Concrete variable propagation test:**
  - Parent sets `testVar = "parent-value"`
  - Parent invokes child workflow
  - Child reads `testVar` → assert equals "parent-value"
  - Child sets `childResult = "child-output"`
  - Parent reads `childResult` after child completes → assert equals "child-output"
- [ ] 12.5.5 Compare output with Mastra executor - should be identical

### Task 13: Feature Flag Implementation (AC: 11) [~1 hour]
- [ ] 13.1 Add `USE_EFFECT_EXECUTOR` to ConfigService schema (default: `false`)
- [ ] 13.2 Update workflow start router to check flag
- [ ] 13.3 Route to Effect executor when flag is `true`, Mastra executor when `false`
- [ ] 13.4 Document flag in `.env.example`

### Task 14: Create Pull Request (LAST - after all verification passes) [~30 min]
- [ ] 14.1 Ensure all tests pass on `feat/effect-migration` branch
- [ ] 14.2 Ensure `bun check` passes (lint + format)
- [ ] 14.3 Create PR: `feat/effect-migration` → `main`
- [ ] 14.4 PR description references Story 2-M1 and includes test evidence
- [ ] 14.5 Request review (if applicable)
- [ ] 14.6 Merge only after verification with `USE_EFFECT_EXECUTOR=true`

## Dev Notes

### Architecture Decision Records

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **ADR-M1.1: Core Runtime** | Effect | Typed errors, resource safety, composable layers fix root cause of variable propagation bug |
| **ADR-M1.2: Event Bus** | Effect PubSub | Backpressure (bounded 256), Stream integration for SSE, no memory leaks |
| **ADR-M1.3: Error Types** | Tagged Errors | Compile-time exhaustive handling via `Effect.catchTags`, prevents silent failures |
| **ADR-M1.4: Handler Migration** | Wrap first, migrate in 2-M4 | De-risks migration, each story independently shippable |
| **ADR-M1.5: Transition Strategy** | Feature flag | Parallel execution allows safe rollback during migration |

### Transition Strategy

The new Effect executor runs **alongside** the old Mastra executor during the migration period:

```
USE_EFFECT_EXECUTOR=false  →  Mastra executor (current behavior)
USE_EFFECT_EXECUTOR=true   →  Effect executor (new)
```

**Timeline:**
- Story 2-M1: Effect foundation created, flag defaults to `false`
- Story 2-M4: All handlers migrated, flip flag to `true` for testing
- Story 2-M5: Mastra removal, flag removed, Effect is the only path

### Rollback Procedure

If Effect executor causes issues in testing:

1. Set `USE_EFFECT_EXECUTOR=false` in environment
2. Restart server → immediately routes to Mastra executor
3. No data migration needed → both executors use same DB schema
4. Investigate issue on branch, fix, re-test

**Note:** All work happens on `feat/effect-migration` branch. Main is never at risk.

### Why This Migration?

The current Mastra-based workflow engine has a **critical bug**: parent-child variable propagation doesn't work correctly. When a child workflow completes, its output variables don't reliably propagate back to the parent execution. This blocks Story 2-3 (Execution Loop & Child Workflows).

**Root Cause:** The current async/await + try/catch + JSONB blob approach doesn't have proper scoping or transactional guarantees.

**Solution:** Effect provides:
- `Effect.scoped` for proper lifecycle management
- Transactional variable updates
- Typed errors that can't be swallowed
- PubSub for event-driven architecture

### Streaming Architecture (AI-SDK + Effect)

The streaming system uses **two layers** that bridge together:

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (SSE)                           │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ SSE: WorkflowEvent stream
                              │
┌─────────────────────────────────────────────────────────────────┐
│              EFFECT LAYER (WorkflowEventBus)                    │
│  PubSub.bounded(256) → Stream.Stream<WorkflowEvent>             │
│  Events: TextChunk | ToolCallStarted | StepCompleted | ...      │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ publish(TextChunk)
                              │
┌─────────────────────────────────────────────────────────────────┐
│              AI-SDK LAYER (streamText)                          │
│  for await (const chunk of stream.textStream) {                 │
│    yield* eventBus.publish({ _tag: "TextChunk", chunk })        │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ HTTP streaming from LLM
```

**AI-SDK** handles LLM communication (`streamText`, tool calls, structured output)
**Effect PubSub** unifies all events into one typed stream for the frontend

The bridge code (implemented in Story 2-M3) adapts AI-SDK's async iterables into Effect's PubSub events. This gives us:
- Backpressure protection (bounded queue)
- Unified event types for all workflow lifecycle events
- Clean SSE endpoint that just subscribes to the Stream

### Effect Patterns to Follow

```typescript
// Service definition pattern
const MyService = Effect.Service<{
  readonly method: (arg: string) => Effect.Effect<Result, MyError>
}>()("MyService", {
  effect: Effect.gen(function* () {
    const dep = yield* OtherService
    return {
      method: (arg) => Effect.gen(function* () {
        // implementation
      })
    }
  }),
  dependencies: [OtherService.Default]
})

// Tagged error pattern
class MyError extends Data.TaggedError("MyError")<{
  message: string
  cause?: unknown
}> {}

// Retry pattern
effect.pipe(
  Effect.retry(
    Schedule.exponential("1 second").pipe(
      Schedule.jittered,
      Schedule.upTo("30 seconds")
    )
  )
)
```

### Project Structure Notes

**New directory:** `packages/api/src/services/workflow-engine/effect/`
```
effect/
├── index.ts              # Barrel export + MainLayer
├── database-service.ts   # Drizzle wrapper
├── config-service.ts     # Environment config
├── errors.ts             # Tagged error types
├── error-utils.ts        # withRetry, withTimeout
├── execution-context.ts  # Scoped context
├── event-bus.ts          # PubSub events
├── step-registry.ts      # Handler registry
└── executor.ts           # Effect.gen loop
```

**Keep existing handlers** in `step-handlers/` - they'll be wrapped by the registry, then migrated to Effect in Story 2-M4.

### Critical Conventions

- **Biome**: TAB indent, double quotes - run `bun check` before committing
- **No as any**: Strict types enforced - use proper Effect types
- **Co-located tests**: Put `*.test.ts` next to implementation files
- **Drizzle push**: Use `bun db:push` for schema changes (NOT migrations)

### References

- [Source: _bmad-output/planning-artifacts/tech-spec-effect-workflow-engine.md#4-effect-service-architecture]
- [Source: _bmad-output/planning-artifacts/tech-spec-effect-workflow-engine.md#8-error-handling]
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-01-10.md#migration-stories]
- [Source: _bmad-output/planning-artifacts/epics/epic-2-artifact-workbench.md#story-2-m1]
- [Source: AGENTS.md#conventions]

### Dependencies on Other Stories

- **Blocks:** Story 2-M2 (Variable System) - needs Effect foundation
- **Blocks:** Story 2-M3 (AI-SDK Integration) - needs Effect services
- **Blocks:** Story 2-M4 (Step Handler Migration) - needs Effect registry
- **Unblocks:** Story 2-3 (Execution Loop) - fixes variable propagation bug

### Test Strategy

1. **Unit tests** for each service in isolation (mock dependencies)
2. **Integration test** for executor + event bus + registry
3. **Manual verification**: Start a workflow via API, check events emit correctly

### Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Effect learning curve | Tech spec has extensive code examples |
| Breaking existing functionality | Keep old executor until 2-M4, new executor is additive |
| Performance overhead | Effect is optimized; PubSub bounded to 256 |

### Observability (Deferred to later story)

Effect has built-in tracing via `Effect.withSpan`. Consider adding in a future story:
- Span per workflow execution
- Span per step execution
- Span per tool call
- Trace ID propagation to frontend for debugging

**Not in scope for 2-M1** - foundation first, observability later.

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

