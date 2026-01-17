# Story 2-M9: Effect Executor Wiring & Cleanup

Status: backlog

## Story

As a **developer**,
I want **the Effect-based workflow engine to actually run in production**,
so that **2 weeks of architecture work (M1-M4) isn't dead code sitting unused**.

## Background

### The Problem

Code review of Story 2-M7 revealed a **critical architectural failure**: the Effect-based workflow engine built in stories M1-M4 was **NEVER wired up**. The application still runs entirely on the OLD architecture:

| Component | Expected (Effect) | Actual (Running) |
|-----------|------------------|------------------|
| Executor | `effect/executor.ts` | `executor.ts` (OLD) |
| Step Registry | `effect/step-registry.ts` | `step-registry.ts` (OLD) |
| User Input Handler | `user-form-handler.ts` | `ask-user-handler.ts` (OLD) |
| Chat Handler | `sandboxed-agent-handler.ts` | `ask-user-chat-handler.ts` (OLD) |
| DB Step Types | `user-form, sandboxed-agent, system-agent` | `ask-user, ask-user-chat, llm-generate, question-set` |

### Evidence

1. **Router imports OLD executor:**
   ```typescript
   // workflows.ts line 7 - THIS IS WHAT RUNS
   import { executeWorkflow } from "../services/workflow-engine/executor";
   
   // NEVER imported anywhere
   import { executeWorkflow } from "../services/workflow-engine/effect/executor";
   ```

2. **USE_EFFECT_EXECUTOR flag exists but never checked** - config-service.ts line 26

3. **Old handlers still exist and run:**
   - `ask-user-handler.ts` (240 lines) - should be deleted
   - `ask-user-chat-handler.ts` - referenced but missing!
   - Seeds use old step type names

4. **DB schema never updated:**
   ```typescript
   // workflows.ts - CURRENT (wrong)
   export const stepTypeEnum = pgEnum("step_type", [
     "ask-user",           // Should be: user-form
     "ask-user-chat",      // Should be: sandboxed-agent
     "llm-generate",       // Should be: DELETED
     "approval-checkpoint",// Should be: DELETED
     "question-set",       // Should be: DELETED
   ]);
   ```

### Scope

This story completes what M1-M4 were supposed to do:
- Delete ALL old code
- Wire Effect executor to routers
- Update DB schema to final step types
- Migrate seeds and frontend to new names

## Deliverables

1. **Effect executor wired to production** - Router uses `effect/executor.ts`
2. **Old code deleted** - ~1,570 lines removed
3. **DB schema updated** - Final 7 step types only
4. **Seeds migrated** - All use new step type names
5. **Frontend renamed** - `ask-user-step.tsx` → `user-form-step.tsx`

## Acceptance Criteria

1. **Effect Executor Integration**
   - [ ] Router imports from `effect/executor.ts`
   - [ ] Effect runtime properly configured with all required services
   - [ ] Remove `USE_EFFECT_EXECUTOR` feature flag (no longer needed)

2. **Old Code Deletion (Backend)**
   - [ ] Delete `packages/api/.../workflow-engine/executor.ts`
   - [ ] Delete `packages/api/.../workflow-engine/step-registry.ts`
   - [ ] Delete `packages/api/.../workflow-engine/step-types.ts`
   - [ ] Delete `packages/api/.../workflow-engine/step-handler.ts`
   - [ ] Delete `packages/api/.../step-handlers/ask-user-handler.ts` + tests
   - [ ] Delete `packages/api/.../step-handlers/display-output-handler.ts`
   - [ ] Delete `packages/api/.../step-handlers/invoke-workflow-handler.ts` + tests
   - [ ] Delete `packages/api/.../step-handlers/execute-action-handler.ts` + tests
   - [ ] Keep Effect wrappers (`*-effect-handler.ts`) that delegate to new handlers

3. **DB Schema Update**
   - [ ] Update `stepTypeEnum` to final values:
     ```typescript
     export const stepTypeEnum = pgEnum("step_type", [
       "user-form",        // Renamed from ask-user
       "sandboxed-agent",  // Renamed from ask-user-chat
       "system-agent",     // NEW - reserved for future
       "execute-action",   // Keep
       "invoke-workflow",  // Keep
       "display-output",   // Keep
       "branch",           // Keep
     ]);
     ```
   - [ ] Run `bun db:push` to apply schema change

4. **Seed Data Migration**
   - [ ] Update `workflow-init-new.ts`: `ask-user` → `user-form`
   - [ ] Update `brainstorming.ts`: `ask-user-chat` → `sandboxed-agent`
   - [ ] Update all technique seeds: `ask-user-chat` → `sandboxed-agent`
   - [ ] Re-run seeds: `bun db:seed`

5. **Frontend Migration**
   - [ ] Rename `ask-user-step.tsx` → `user-form-step.tsx`
   - [ ] Rename `ask-user-step.test.tsx` → `user-form-step.test.tsx`
   - [ ] Update `step-renderer.tsx`: `case "ask-user"` → `case "user-form"`
   - [ ] Update route files referencing `ask-user` step type
   - [ ] Verify `two-part-directory-input.tsx` integration still works

6. **Test Updates**
   - [ ] Delete old handler tests (ask-user-handler.test.ts, etc.)
   - [ ] Update executor.test.ts to use Effect executor
   - [ ] Update integration.test.ts
   - [ ] All tests pass: `bun test`

7. **Verification**
   - [ ] App starts: `bun dev`
   - [ ] Workflow execution works end-to-end
   - [ ] User form steps render and submit correctly
   - [ ] Sandboxed agent chat works

## Tasks / Subtasks

- [ ] **Task 1: Wire Effect Executor**
  - [ ] 1.1 Update `workflows.ts` router to import from `effect/executor.ts`
  - [ ] 1.2 Configure Effect runtime with required services (DatabaseService, ConfigService, etc.)
  - [ ] 1.3 Update `continueExecution` to use Effect-based execution
  - [ ] 1.4 Remove USE_EFFECT_EXECUTOR flag from config

- [ ] **Task 2: Delete Old Backend Code**
  - [ ] 2.1 Delete `executor.ts` (466 lines)
  - [ ] 2.2 Delete `step-registry.ts` (66 lines)
  - [ ] 2.3 Delete `step-types.ts` (62 lines)
  - [ ] 2.4 Delete `step-handler.ts` (45 lines)
  - [ ] 2.5 Delete `ask-user-handler.ts` + `ask-user-handler.test.ts` (638 lines)
  - [ ] 2.6 Delete `display-output-handler.ts` (33 lines)
  - [ ] 2.7 Delete `invoke-workflow-handler.ts` + tests (586 lines)
  - [ ] 2.8 Delete `execute-action-handler.ts` + tests (816 lines)
  - [ ] 2.9 Keep and verify Effect handlers work standalone

- [ ] **Task 2B: Remove Legacy Adapters from Effect Handlers** (Added from M7 review)
  - [ ] 2B.1 Remove `createLegacyBranchHandler` export from `branch-effect-handler.ts`
  - [ ] 2B.2 Remove `createLegacyBranchHandler` usage from `step-types.ts`
  - [ ] 2B.3 Remove `createLegacyDisplayOutputHandler` from `display-output-effect-handler.ts`
  - [ ] 2B.4 Remove `createLegacyExecuteActionHandler` from `execute-action-effect-handler.ts`
  - [ ] 2B.5 Remove `createLegacyInvokeWorkflowHandler` from `invoke-workflow-effect-handler.ts`
  - [ ] 2B.6 Remove backward compat aliases from `execution-context.ts` (lines 20, 69)
  - [ ] 2B.7 Remove legacy `mastra_thread_id` refs from `workflows.ts` router (lines 749, 759, 770)
  - [ ] 2B.8 Remove backward compat aliases from `workflow-paths.ts` seeds (lines 57, 70)

- [ ] **Task 3: Update DB Schema**
  - [ ] 3.1 Modify `stepTypeEnum` in `workflows.ts`
  - [ ] 3.2 Run `bun db:push`
  - [ ] 3.3 Verify schema applied correctly

- [ ] **Task 4: Migrate Seeds**
  - [ ] 4.1 Update `workflow-init-new.ts`
  - [ ] 4.2 Update `brainstorming.ts`
  - [ ] 4.3 Update `techniques/mind-mapping.ts`
  - [ ] 4.4 Update `techniques/what-if-scenarios.ts`
  - [ ] 4.5 Update `techniques/scamper.ts`
  - [ ] 4.6 Update `techniques/five-whys.ts`
  - [ ] 4.7 Update `techniques/six-thinking-hats.ts`
  - [ ] 4.8 Run `bun db:seed` and verify

- [ ] **Task 5: Migrate Frontend**
  - [ ] 5.1 Rename `ask-user-step.tsx` → `user-form-step.tsx`
  - [ ] 5.2 Rename `ask-user-step.test.tsx` → `user-form-step.test.tsx`
  - [ ] 5.3 Update component internals (type references)
  - [ ] 5.4 Update `step-renderer.tsx` switch case
  - [ ] 5.5 Update `initialize.tsx` route references
  - [ ] 5.6 Verify two-part-directory-input integration

- [ ] **Task 6: Fix Tests**
  - [ ] 6.1 Update/delete workflow-loader.test.ts references
  - [ ] 6.2 Update executor.test.ts to Effect patterns
  - [ ] 6.3 Update integration.test.ts
  - [ ] 6.4 Run full test suite: `bun test`

- [ ] **Task 7: End-to-End Verification**
  - [ ] 7.1 Start app: `bun dev`
  - [ ] 7.2 Create new project (tests workflow-init)
  - [ ] 7.3 Execute brainstorming workflow (tests sandboxed-agent)
  - [ ] 7.4 Verify user-form steps work with path validation

## Out of Scope

| Feature | Reason |
|---------|--------|
| New step type implementations | This is cleanup only |
| AI provider changes | Already done in M3 |
| Variable system migration | Already done in M2, just needs wiring |

## Dev Notes

### Files to DELETE

```
packages/api/src/services/workflow-engine/
├── executor.ts                    # DELETE (466 lines)
├── step-registry.ts               # DELETE (66 lines)
├── step-types.ts                  # DELETE (62 lines)
├── step-handler.ts                # DELETE (45 lines)
└── step-handlers/
    ├── ask-user-handler.ts        # DELETE (240 lines)
    ├── ask-user-handler.test.ts   # DELETE (398 lines)
    ├── display-output-handler.ts  # DELETE (33 lines)
    ├── invoke-workflow-handler.ts # DELETE (223 lines)
    ├── invoke-workflow-handler.test.ts # DELETE (363 lines)
    ├── execute-action-handler.ts  # DELETE (542 lines)
    ├── execute-action-handler.test.ts # DELETE (274 lines)
```

**Total: ~2,712 lines deleted**

### Files to KEEP (Effect)

```
packages/api/src/services/workflow-engine/effect/
├── executor.ts                    # KEEP - new executor
├── step-registry.ts               # KEEP - Effect registry
├── config-service.ts              # KEEP
├── database-service.ts            # KEEP
├── event-bus.ts                   # KEEP
├── ai-provider-service.ts         # KEEP
├── chat-service.ts                # KEEP
├── approval-service.ts            # KEEP
├── tool-builder.ts                # KEEP
├── variable-service.ts            # KEEP
└── ...
```

### Effect Runtime Setup

The router needs to provide Effect runtime with all required services:

```typescript
import { Effect, Layer, Runtime } from "effect";
import { DatabaseServiceLive } from "./effect/database-service";
import { ConfigServiceLive } from "./effect/config-service";
import { WorkflowEventBusLive } from "./effect/event-bus";
import { StepHandlerRegistryLive } from "./effect/step-registry";
import { executeWorkflow } from "./effect/executor";

const WorkflowLayer = Layer.mergeAll(
  DatabaseServiceLive,
  ConfigServiceLive,
  WorkflowEventBusLive,
  StepHandlerRegistryLive,
);

const runtime = Runtime.defaultRuntime.pipe(
  Runtime.provideLayer(WorkflowLayer)
);

// In router
export async function executeWorkflowEndpoint(workflowId: string) {
  return Effect.runPromise(
    executeWorkflow(workflow, initialState).pipe(
      Effect.provide(WorkflowLayer)
    )
  );
}
```

### DB Migration Note

Since this is development, use `bun db:push` NOT migrations. The enum change will:
1. Add new values
2. Keep existing (we'll clean orphan data separately if needed)

### Risk: Existing Executions

Any in-progress workflow executions with old step types may fail. Mitigation:
- Clear `workflow_executions` table before migration
- Or add backward-compat mapping temporarily

## Change Log

- 2026-01-17: Story created from code review findings on 2-M7
  - Discovered Effect architecture never wired to production
  - M1-M4 work sitting as dead code
  - Application running on old architecture entirely
- 2026-01-17: Added legacy adapter cleanup items from M7 code review deep dive
  - `createLegacyBranchHandler` in step-types.ts needs removal
  - `createLegacyDisplayOutputHandler` in display-output-effect-handler.ts
  - `createLegacyExecuteActionHandler` in execute-action-effect-handler.ts
  - `createLegacyInvokeWorkflowHandler` in invoke-workflow-effect-handler.ts
  - Backward compat aliases in execution-context.ts (lines 20, 69)
  - Legacy mastra_thread_id refs in workflows.ts router (lines 749, 759, 770)
  - Backward compat aliases in workflow-paths.ts seeds (lines 57, 70)

## File List

(To be populated after implementation)

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Completion Notes List

(To be populated after implementation)
