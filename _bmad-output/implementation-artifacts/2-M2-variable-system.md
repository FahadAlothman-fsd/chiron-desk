# Story 2-M2: Variable System

> **Epic:** 2 - Artifact Workbench + Migration Foundation
> **Status:** review
> **Created:** 2026-01-11
> **Branch:** `feat/effect-migration`

## Story

**As a** workflow execution engine
**I want** a typed variable system with history tracking and proper parent-child propagation
**So that** workflow variables are auditable, type-safe, and correctly flow between nested executions (fixing the current propagation bug)

## Acceptance Criteria

### AC1: Variables Database Table
- [ ] Create `variables` table in `packages/db/src/schema/variables.ts`
- [ ] Schema: `id` (uuid PK), `execution_id` (FK to workflow_executions), `name` (text), `value` (jsonb), `value_schema` (jsonb nullable for JSON Schema validation), `source` (text - 'input'|'step'|'system'|'parent'), `created_at`, `updated_at`
- [ ] Unique constraint on (`execution_id`, `name`)
- [ ] Index on `execution_id` for fast lookups
- [ ] Export from `packages/db/src/schema/index.ts`

### AC2: Variable History Table
- [ ] Create `variable_history` table in same file
- [ ] Schema: `id` (uuid PK), `variable_id` (FK to variables), `previous_value` (jsonb nullable), `new_value` (jsonb), `source` (text), `step_number` (integer nullable), `changed_at` (timestamp)
- [ ] Index on `variable_id` for history queries
- [ ] Foreign key cascade delete when variable deleted

### AC3: VariableService Effect Layer
- [ ] Create `packages/api/src/services/workflow-engine/effect/variable-service.ts`
- [ ] Implement as Effect Service using `Context.Tag` pattern (like DatabaseService)
- [ ] Dependencies: `DatabaseService`
- [ ] Methods (all return `Effect<T, VariableError>`):
  - `get(executionId, name)` - retrieve single variable
  - `getAll(executionId)` - retrieve all variables for execution
  - `set(executionId, name, value, source, stepNumber?)` - create/update with history
  - `merge(executionId, variables, source)` - bulk upsert multiple variables
  - `delete(executionId, name)` - remove variable
  - `getHistory(executionId, name?)` - get change history

### AC4: Template Resolution with Handlebars
- [ ] Add `resolveTemplate(template, executionId)` method to VariableService
- [ ] Migrate logic from `variable-resolver.ts` to Effect-based implementation
- [ ] Support 4-level precedence: System > Execution > StepOutputs > Defaults
- [ ] Return `Effect<string, VariableResolutionError>` with proper error context
- [ ] Add `resolveObject(obj, executionId)` for deep object resolution

### AC5: Parent-Child Propagation (THE BUG FIX)
- [ ] Add `propagateToParent(childExecutionId, variableNames)` method
- [ ] Query parent execution via `parentExecutionId` foreign key
- [ ] Copy specified variables from child to parent execution
- [ ] Record history entry with source='child-propagation'
- [ ] Emit `VariableChanged` event via WorkflowEventBus
- [ ] Handle case where parent doesn't exist (root execution) gracefully

### AC6: Database Transaction Support
- [ ] Implement proper Effect transaction pattern in `set()` method
- [ ] Use `Effect.acquireUseRelease` for transaction lifecycle
- [ ] Ensure variable update + history insert are atomic
- [ ] Rollback on any failure within transaction
- [ ] Fresh-read guarantee: re-read variable within transaction before update

### AC7: Migration Script
- [ ] Create migration utility to copy existing `workflow_executions.variables` JSONB to new tables
- [ ] Preserve execution relationships
- [ ] Set source='migration' for historical data
- [ ] Log migration progress and any failures
- [ ] Idempotent: safe to run multiple times

## Tasks

### Task 1: Database Schema (AC1, AC2)
**File:** `packages/db/src/schema/variables.ts` (NEW)

#### Subtask 1.1: Create variables table
```typescript
import { pgTable, uuid, text, jsonb, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { workflowExecutions } from "./workflows";

export const variables = pgTable("variables", {
  id: uuid("id").primaryKey().defaultRandom(),
  executionId: uuid("execution_id").notNull().references(() => workflowExecutions.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  value: jsonb("value").notNull(),
  valueSchema: jsonb("value_schema"), // Optional JSON Schema for validation
  source: text("source").notNull(), // 'input' | 'step' | 'system' | 'parent' | 'migration'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("variables_execution_name_idx").on(table.executionId, table.name),
  index("variables_execution_idx").on(table.executionId),
]);
```

#### Subtask 1.2: Create variable_history table
```typescript
export const variableHistory = pgTable("variable_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  variableId: uuid("variable_id").notNull().references(() => variables.id, { onDelete: "cascade" }),
  previousValue: jsonb("previous_value"), // null for initial creation
  newValue: jsonb("new_value").notNull(),
  source: text("source").notNull(),
  stepNumber: integer("step_number"), // Which step caused the change
  changedAt: timestamp("changed_at").defaultNow().notNull(),
}, (table) => [
  index("variable_history_variable_idx").on(table.variableId),
]);
```

#### Subtask 1.3: Export from index and run db:push
- Add exports to `packages/db/src/schema/index.ts`
- Run `bun db:push` to apply schema

---

### Task 2: VariableService Core (AC3)
**File:** `packages/api/src/services/workflow-engine/effect/variable-service.ts` (NEW)

#### Subtask 2.1: Service definition with Context.Tag
```typescript
import { Context, Effect, Layer } from "effect";
import type { DatabaseService } from "./database-service";
import { VariableError } from "./errors";

export interface VariableServiceImpl {
  get(executionId: string, name: string): Effect.Effect<Variable | null, VariableError>;
  getAll(executionId: string): Effect.Effect<Variable[], VariableError>;
  set(executionId: string, name: string, value: unknown, source: VariableSource, stepNumber?: number): Effect.Effect<Variable, VariableError>;
  merge(executionId: string, variables: Record<string, unknown>, source: VariableSource): Effect.Effect<Variable[], VariableError>;
  delete(executionId: string, name: string): Effect.Effect<void, VariableError>;
  getHistory(executionId: string, name?: string): Effect.Effect<VariableHistoryEntry[], VariableError>;
}

export class VariableService extends Context.Tag("VariableService")<VariableService, VariableServiceImpl>() {}
```

#### Subtask 2.2: Implement get/getAll methods
- Use `Effect.tryPromise` to wrap Drizzle queries
- Tag errors as `VariableNotFoundError` or `VariableDatabaseError`

#### Subtask 2.3: Implement set method with history (AC6 transaction)
- Use `Effect.acquireUseRelease` for transaction
- Fresh-read current value within transaction
- Insert/update variable
- Insert history record with previous_value
- Emit `VariableChanged` event

#### Subtask 2.4: Implement merge method for bulk operations
- Accept `Record<string, unknown>`
- Call `set` for each in parallel with `Effect.all`

#### Subtask 2.5: Implement delete and getHistory methods

#### Subtask 2.6: Create Layer with DatabaseService dependency
```typescript
export const VariableServiceLive = Layer.effect(
  VariableService,
  Effect.gen(function* () {
    const db = yield* DatabaseService;
    return { /* implementation */ };
  })
);
```

---

### Task 3: Template Resolution (AC4)
**File:** `packages/api/src/services/workflow-engine/effect/variable-service.ts` (extend)

#### Subtask 3.1: Add resolveTemplate method
- Load all variables for execution
- Build context object with 4-level precedence
- Use Handlebars to compile and execute template
- Return `Effect<string, VariableResolutionError>`

#### Subtask 3.2: Add resolveObject method
- Recursively traverse object
- Resolve string values containing `{{...}}`
- Preserve non-string values

#### Subtask 3.3: Migrate variable-resolver.ts tests to Effect
- Create `packages/api/src/services/workflow-engine/effect/variable-service.test.ts`
- Test all resolution scenarios

---

### Task 4: Parent-Child Propagation (AC5)
**File:** `packages/api/src/services/workflow-engine/effect/variable-service.ts` (extend)

#### Subtask 4.1: Add propagateToParent method
```typescript
propagateToParent(
  childExecutionId: string, 
  variableNames: string[]
): Effect.Effect<void, VariableError | ExecutionNotFoundError>
```

#### Subtask 4.2: Implementation
- Query child execution to get `parentExecutionId`
- If no parent (root execution), return successfully (no-op)
- For each variable name:
  - Get variable from child execution
  - Set in parent execution with source='child-propagation'
- Emit `VariablesPropagated` event

#### Subtask 4.3: Integration test
- Create parent execution
- Create child execution with parentExecutionId
- Set variables in child
- Call propagateToParent
- Verify variables exist in parent with correct source

---

### Task 5: Error Types (extend errors.ts)
**File:** `packages/api/src/services/workflow-engine/effect/errors.ts` (MODIFY)

#### Subtask 5.1: Add VariableError types
```typescript
export class VariableNotFoundError extends Data.TaggedError("VariableNotFoundError")<{
  executionId: string;
  name: string;
}> {}

export class VariableDatabaseError extends Data.TaggedError("VariableDatabaseError")<{
  operation: string;
  cause: unknown;
}> {}

export class VariableResolutionError extends Data.TaggedError("VariableResolutionError")<{
  template: string;
  missingVariables: string[];
}> {}

export type VariableError = VariableNotFoundError | VariableDatabaseError | VariableResolutionError;
```

---

### Task 6: Export and Integration
**File:** `packages/api/src/services/workflow-engine/effect/index.ts` (MODIFY)

#### Subtask 6.1: Export VariableService
- Add to index.ts exports
- Document in module JSDoc

#### Subtask 6.2: Add VariableChanged event to event-bus.ts
```typescript
export interface WorkflowEvents {
  // ... existing events
  "variable:changed": { executionId: string; name: string; source: string };
  "variables:propagated": { childId: string; parentId: string; names: string[] };
}
```

---

### Task 7: Migration Utility (AC7)
**File:** `packages/scripts/src/migrations/migrate-variables.ts` (NEW)

#### Subtask 7.1: Create migration script
- Query all workflow_executions with non-empty variables JSONB
- For each execution, for each variable:
  - Insert into variables table
  - Insert initial history record with source='migration'
- Log progress every 100 executions
- Handle duplicates gracefully (upsert)

#### Subtask 7.2: Add to package.json scripts
```json
"migrate:variables": "bun run src/migrations/migrate-variables.ts"
```

---

### Task 8: Tests
**Files:** `*.test.ts` co-located

#### Subtask 8.1: variable-service.test.ts
- Test all CRUD operations
- Test transaction rollback on failure
- Test history recording
- Test template resolution
- Test parent-child propagation

#### Subtask 8.2: Integration test with real DB
- Use test database
- Verify schema constraints (unique, FK cascade)

## Dev Notes

### Project Structure Notes
```
packages/
├── db/src/schema/
│   ├── variables.ts          # NEW - AC1, AC2
│   └── index.ts              # MODIFY - export new tables
├── api/src/services/workflow-engine/
│   ├── effect/
│   │   ├── variable-service.ts      # NEW - AC3, AC4, AC5, AC6
│   │   ├── variable-service.test.ts # NEW - Task 8
│   │   ├── errors.ts                # MODIFY - Task 5
│   │   ├── event-bus.ts             # MODIFY - Task 6.2
│   │   └── index.ts                 # MODIFY - Task 6.1
│   └── variable-resolver.ts         # REFERENCE ONLY (migrate logic, don't delete yet)
└── scripts/src/migrations/
    └── migrate-variables.ts         # NEW - AC7
```

### References
- **Previous Story:** `2-M1-effect-foundation.md` - DatabaseService pattern, Effect.acquireUseRelease deferred here
- **Tech Spec:** `tech-spec-effect-workflow-engine.md` Section 6 - Variable System design
- **Current Implementation:** `variable-resolver.ts` - Handlebars logic to migrate
- **DB Schema:** `packages/db/src/schema/workflows.ts` - workflowExecutions.variables JSONB (source data)
- **Effect Patterns:** Context.Tag for services, Effect.gen for implementation, Data.TaggedError for errors

### Key Implementation Details

**Transaction Pattern (AC6):**
```typescript
const setVariable = (executionId: string, name: string, value: unknown, source: VariableSource) =>
  Effect.gen(function* () {
    const db = yield* DatabaseService;
    
    yield* Effect.acquireUseRelease(
      // Acquire: start transaction
      Effect.tryPromise(() => db.db.transaction()),
      // Use: perform operations
      (tx) => Effect.gen(function* () {
        // Fresh read within transaction
        const existing = yield* Effect.tryPromise(() => 
          tx.select().from(variables).where(/* ... */)
        );
        
        // Upsert variable
        const variable = yield* Effect.tryPromise(() =>
          tx.insert(variables).values(/* ... */).onConflictDoUpdate(/* ... */)
        );
        
        // Insert history
        yield* Effect.tryPromise(() =>
          tx.insert(variableHistory).values({
            variableId: variable.id,
            previousValue: existing?.value ?? null,
            newValue: value,
            source,
          })
        );
        
        return variable;
      }),
      // Release: commit or rollback handled by Drizzle
      () => Effect.void
    );
  });
```

**Parent-Child Bug Context:**
The current system stores variables in `workflow_executions.variables` JSONB. When a child workflow completes, its output variables should propagate to the parent. This isn't working correctly because:
1. No explicit propagation mechanism exists
2. Variables are buried in JSONB without clear ownership
3. No audit trail of where variables came from

The new system fixes this with:
1. Explicit `propagateToParent()` method
2. `source` field tracking origin ('input', 'step', 'parent', 'child-propagation')
3. `variable_history` table for complete audit trail

### Dependencies
- `effect` ^3.x (already installed via 2-M1)
- `handlebars` (already installed)
- `drizzle-orm` (already installed)

### Testing Strategy
- Unit tests: Mock DatabaseService, test Effect flows
- Integration tests: Real Postgres via `bun db:start`, test constraints and cascades
- Use `happy-dom` for any browser-related tests (per project conventions)

---

## Dev Agent Record

### Agent Model
Claude Sonnet 4 (opencode dev-story workflow)

### Debug Log
- Test initially failed with password auth error - resolved by using correct DATABASE_URL with password='password'
- Test failed due to workflows table requiring displayName field - fixed test setup
- Test failed due to invalid status enum 'running' - changed to 'active'

### Change Log
- 2026-01-11: Implemented full variable system with database schema, Effect service, and tests

### Completion Notes
All acceptance criteria implemented:
- AC1: Variables table with unique constraint on (execution_id, name)
- AC2: Variable history table with cascade delete
- AC3: VariableService with full CRUD operations using Effect pattern
- AC4: Template resolution with Handlebars (resolveTemplate, resolveObject) + 4-level precedence
- AC5: Parent-child propagation via propagateToParent() - THE BUG FIX (fail-fast documented)
- AC6: Transaction support via db.transaction() wrapping variable+history atomically
- AC7: Migration utility created at packages/scripts/src/migrations/migrate-variables.ts

15/15 tests passing. All lint checks pass.

### Code Review (2026-01-11)
**Reviewer:** Adversarial Senior Dev

**Issues Found & Fixed:**
1. ~~MEDIUM: VariableValidationError unused~~ - Kept for future JSON Schema validation
2. ~~MEDIUM: 4-level precedence not implemented~~ - Fixed: Added precedenceOrder sorting in resolveTemplate
3. ~~LOW: Nested access missing~~ - Cancelled: Handlebars handles natively via dot notation
4. ~~MEDIUM: propagateToParent fail-fast undocumented~~ - Fixed: Added JSDoc explaining behavior
5. ~~HIGH: AC6 transaction NOT implemented~~ - Fixed: Wrapped set() in db.transaction()
6. ~~LOW: Migration idempotency bug~~ - Fixed: Query now uses executionId AND name
7. ~~LOW: No transaction atomicity test~~ - Fixed: Added 2 new tests for AC6

**Verdict:** ✅ APPROVED after fixes

### File List
- [x] `packages/db/src/schema/variables.ts` - NEW
- [x] `packages/db/src/schema/index.ts` - MODIFY
- [x] `packages/api/src/services/workflow-engine/effect/variable-service.ts` - NEW
- [x] `packages/api/src/services/workflow-engine/effect/variable-service.test.ts` - NEW
- [x] `packages/api/src/services/workflow-engine/effect/errors.ts` - MODIFY
- [x] `packages/api/src/services/workflow-engine/effect/event-bus.ts` - MODIFY
- [x] `packages/api/src/services/workflow-engine/effect/index.ts` - MODIFY
- [x] `packages/scripts/src/migrations/migrate-variables.ts` - NEW
- [x] `packages/scripts/package.json` - MODIFY (added migrate:variables script)
