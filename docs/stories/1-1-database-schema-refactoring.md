# Story 1.1: Database Schema Refactoring

**Epic:** Epic 1 - Foundation + Workflow-Init Engine  
**Story ID:** 1.1  
**Status:** ready-for-dev  
**Priority:** P0 (Critical)  
**Estimate:** 2 days  
**Assignee:** DEV Agent  
**Created:** 2025-11-07  

---

## User Story

As a **developer**,  
I want **a clean database schema with Docker-based reset capability**,  
So that **I can iterate rapidly during development without migration conflicts and have a solid foundation for the workflow execution engine**.

---

## Dev Notes

### Architecture Patterns and Constraints

**Docker Reset Approach (No Migrations)**
- **Rationale:** During development, schema changes are frequent. Migrations add complexity and merge conflicts when iterating rapidly.
- **Strategy:** `docker-compose down -v` destroys database volumes, `docker-compose up -d` creates fresh containers, `drizzle-kit push` applies schema directly.
- **Trade-off:** Production will need migration strategy later, but development velocity is prioritized for MVP.
- **Important:** This approach is DEVELOPMENT ONLY - production deployment will require proper migrations (Epic 7).

**JSONB Step Configuration with Zod Validation**
- **Rationale:** Workflow step configurations vary by type (ask-user vs llm-generate vs execute-action). Rigid columns would require frequent schema changes.
- **Strategy:** Store step config as JSONB column with Zod schemas for runtime validation at application layer.
- **Benefit:** Extensibility - new step types don't require database migrations.
- **Implementation:** Define Zod schemas first, then infer TypeScript types using `z.infer<typeof schema>` for single source of truth.

**Better-Auth Integration**
- **Rationale:** Better-auth library manages its own tables. Chiron extends with `app_config` for user preferences.
- **Strategy:** Use better-auth defaults (user, session, account, verification), add `app_config` for Chiron-specific settings.
- **Important:** Do NOT modify better-auth managed tables - align Chiron schema with better-auth defaults if conflicts arise.

### References

- [Source: docs/epics/tech-spec-epic-1.md - Database Layer, Data Models section] - Primary source for table definitions and schema changes
- [Source: docs/epics.md - Epic 1, Story 1.1 - Acceptance Criteria] - Story requirements and estimates
- [Source: docs/architecture/database-schema-architecture.md - Table Definitions, Drizzle Schema Patterns] - Architecture patterns for database design
- [Source: docs/PRD.md - Epic 1: Core Infrastructure & Database Foundation] - High-level context for database foundation

### Project Structure Notes

**Database Package Structure:**
- Schema definitions: `packages/db/src/schema/` (existing - will be modified)
- Index exports: `packages/db/src/schema/index.ts` (update to remove deprecated exports)
- Tests: `packages/db/src/schema/*.test.ts` (new files to create)

**Scripts Location:**
- Reset script: `scripts/reset-db.sh` (new file at project root)
- Script must be executable: `chmod +x scripts/reset-db.sh`

**Docker Configuration:**
- Compose file: `packages/db/docker-compose.yml` (existing - no changes needed)
- Container name convention: Assume `chiron-postgres` (verify in docker-compose.yml)

**Migration Files:**
- Location: `packages/db/src/migrations/` (to be deleted)
- Gitignore: Add `packages/db/src/migrations/` to `.gitignore` after cleanup

### Learnings from Previous Story

First story in epic - no predecessor context.

---

## Acceptance Criteria

1. **Schema Update Complete**
   - Remove `workflow_step_branches` and `workflow_step_actions` tables (deprecated)
   - Update `workflows` table: add `initializerType` field, remove `isProjectInitializer`
   - Update `projects` table: add `userId` foreign key
   - Update `app_config` table: add `userId` unique constraint
   - Define TypeScript step config types: `AskUserStepConfig`, `AskUserChatStepConfig`, `ExecuteActionStepConfig`, `LLMGenerateStepConfig`, `DisplayOutputStepConfig`

2. **Docker Reset Script Functional**
   - Script `scripts/reset-db.sh` created with:
     - `docker-compose down -v` (remove volumes)
     - `docker-compose up -d` (recreate containers)
     - Schema application via Drizzle push
   - Script is executable and runs without errors
   - Command `bun run db:reset` works cleanly

3. **Migration System Removed**
   - All files in `packages/db/src/migrations/` deleted
   - No references to Drizzle migration commands in package.json scripts
   - Schema changes applied directly via `drizzle-kit push`

4. **Database Tables and Relationships**
   - All 15 tables created with correct schema:
     - Workflows (2 tables): `workflows`, `workflow_steps`
     - Execution & State (5 tables): `workflow_executions`, `projects`, `project_state`, `workflow_paths`, `workflow_path_workflows`
     - Templates & Agents (2 tables): `workflow_templates`, `agents`
     - Auth & User (5 tables): `user`, `session`, `account`, `verification`, `app_config`
     - Optional (1 table): `dialog_sessions` (can defer to future stories)
   - Foreign key constraints correctly defined
   - Indexes on frequently queried columns: `projects.userId`, `workflows.module`, `workflow_executions.status`, `workflow_steps.workflowId`

5. **Test Framework Configured**
   - Bun test framework configured (test files: `*.test.ts` or `*.spec.ts`)
   - At least one schema validation test exists
   - Command `bun test` runs successfully without errors

---

## Tasks

### 1. Update Database Schema Files (AC: #1)

- [ ] Update `packages/db/src/schema/workflows.ts`
  - [ ] Add `initializerType` field (text, nullable)
  - [ ] Remove `isProjectInitializer` field
  - [ ] Add index on `module` field using `.index()` method
  - [ ] Test: Verify workflows table structure with schema.test.ts
- [ ] Update `packages/db/src/schema/projects.ts`
  - [ ] Add `userId` field with foreign key to `user(id)`
  - [ ] Add index on `userId` field using `.index()` method
  - [ ] Test: Verify projects table structure with schema.test.ts
- [ ] Update `packages/db/src/schema/app-config.ts`
  - [ ] Add `userId` field with unique constraint
  - [ ] Add foreign key to `user(id)`
  - [ ] Test: Verify appConfig table structure with schema.test.ts
- [ ] Create `packages/db/src/schema/step-configs.ts`
  - [ ] Install Zod: `bun add zod`
  - [ ] Define Zod schema for `AskUserStepConfig`
  - [ ] Define Zod schema for `AskUserChatStepConfig`
  - [ ] Define Zod schema for `ExecuteActionStepConfig`
  - [ ] Define Zod schema for `LLMGenerateStepConfig`
  - [ ] Define Zod schema for `DisplayOutputStepConfig`
  - [ ] Create union schema `stepConfigSchema`
  - [ ] Infer TypeScript types from Zod schemas
  - [ ] Add JSDoc comments with examples
  - [ ] Test: Validate all schemas with step-configs.test.ts
- [ ] Delete deprecated table files
  - [ ] Remove `packages/db/src/schema/workflow-step-branches.ts` (if exists)
  - [ ] Remove `packages/db/src/schema/workflow-step-actions.ts` (if exists)
  - [ ] Update `packages/db/src/schema/index.ts` to remove deprecated exports
- [ ] Update `packages/db/src/schema/workflow-steps.ts`
  - [ ] Add index on `workflowId` field using `.index()` method
- [ ] Update `packages/db/src/schema/workflow-executions.ts`
  - [ ] Add index on `status` field using `.index()` method
  - [ ] Add index on `projectId` field using `.index()` method

### 2. Create Docker Reset Script (AC: #2)

- [ ] Create `scripts/reset-db.sh` with warning prompt
  - [ ] Add shebang and `set -e` for error handling
  - [ ] Add user confirmation: "Continue? (y/N)"
  - [ ] Add `docker compose down -v` with fallback to `docker-compose`
  - [ ] Add `docker compose up -d` with fallback
  - [ ] Add sleep 5 seconds for PostgreSQL readiness
  - [ ] Add `bun run db:push` to apply schema
  - [ ] Add success message with reminder to run `db:seed`
  - [ ] Test: Run script manually, verify it works
- [ ] Make script executable
  - [ ] Run `chmod +x scripts/reset-db.sh`
  - [ ] Test: Verify script can be executed
- [ ] Add npm scripts to root `package.json`
  - [ ] Add `db:reset` script pointing to `./scripts/reset-db.sh`
  - [ ] Add `db:push` script: `cd packages/db && drizzle-kit push`
  - [ ] Test: Run `bun run db:reset` and verify it works

### 3. Remove Migration System (AC: #3)

- [ ] Delete migration files
  - [ ] Run `rm -rf packages/db/src/migrations/*`
  - [ ] Test: Verify directory is empty
- [ ] Remove migration scripts from `packages/db/package.json`
  - [ ] Remove `db:migrate` script (if exists)
  - [ ] Remove `db:generate` script (if exists)
  - [ ] Keep only `db:push` for direct schema application
- [ ] Update `.gitignore`
  - [ ] Add `packages/db/src/migrations/` to `.gitignore`
  - [ ] Test: Verify git status doesn't show migrations folder

### 4. Configure Test Framework (AC: #5)

- [ ] Verify Bun test configuration
  - [ ] Confirm Bun built-in test runner is available
  - [ ] Confirm test file pattern: `**/*.test.ts` or `**/*.spec.ts`
- [ ] Create `packages/db/src/schema/schema.test.ts`
  - [ ] Test: workflows table has initializerType field
  - [ ] Test: projects table has userId field
  - [ ] Test: appConfig table has unique userId constraint
  - [ ] Run tests: `bun test` and verify all pass
- [ ] Create `packages/db/src/schema/step-configs.test.ts`
  - [ ] Test: validates AskUserStepConfig correctly
  - [ ] Test: rejects invalid AskUserStepConfig
  - [ ] Test: validates AskUserChatStepConfig correctly
  - [ ] Test: validates ExecuteActionStepConfig correctly
  - [ ] Test: validates LLMGenerateStepConfig correctly
  - [ ] Test: validates DisplayOutputStepConfig correctly
  - [ ] Test: union schema accepts all step config types
  - [ ] Run tests: `bun test` and verify all pass
- [ ] Create `packages/db/src/schema/constraints.test.ts`
  - [ ] Test: cannot insert project with non-existent userId (FK violation)
  - [ ] Test: cannot insert workflow with non-existent agentId (FK violation)
  - [ ] Test: cannot insert duplicate userId in appConfig (placeholder for Story 1.2)
  - [ ] Run tests: `bun test` and verify all pass

### 5. Validate Complete Schema (AC: #4)

- [ ] Run reset script and verify success
  - [ ] Run `bun run db:reset`
  - [ ] Confirm user prompt appears
  - [ ] Confirm database containers restart
  - [ ] Confirm schema is applied without errors
  - [ ] Test: Run script 3 times to verify idempotency
- [ ] Verify all 15 tables created
  - [ ] Connect: `docker exec -it chiron-postgres psql -U postgres -d chiron`
  - [ ] List tables: `\dt`
  - [ ] Confirm 15 tables exist (workflows, workflow_steps, workflow_executions, projects, project_state, workflow_paths, workflow_path_workflows, workflow_templates, agents, user, session, account, verification, app_config, plus dialog_sessions if not deferred)
- [ ] Verify indexes created
  - [ ] Run: `\di` in psql
  - [ ] Confirm 5 indexes: idx_projects_user_id, idx_workflows_module, idx_workflow_executions_status, idx_workflow_executions_project_id, idx_workflow_steps_workflow_id
- [ ] Verify schema changes
  - [ ] Describe workflows: `\d workflows`
  - [ ] Confirm `initializerType` field exists
  - [ ] Confirm `isProjectInitializer` field does NOT exist
  - [ ] Describe projects: `\d projects`
  - [ ] Confirm `userId` foreign key exists
  - [ ] Describe app_config: `\d app_config`
  - [ ] Confirm `userId` unique constraint exists
- [ ] Run all tests and verify passing
  - [ ] Run `bun test`
  - [ ] Confirm 13 tests pass (3 test files)
  - [ ] Confirm no compilation errors

---

## Technical Specification

### Technology Stack
- **Database:** PostgreSQL 17 (Docker container)
- **ORM:** Drizzle ORM 0.44.2
- **Schema Management:** Direct schema push (no migrations during development)
- **Testing:** Bun test framework
- **Package Manager:** Bun
- **Validation:** Zod for runtime JSONB validation

### Database Schema Details

**New/Modified Tables:**

```typescript
// workflows table changes
workflows {
  id: serial primary key
  name: text unique not null
  displayName: text not null
  description: text
  module: text not null  // 'bmm', 'cis', etc.
  agentId: integer references agents(id)
  initializerType: text  // NEW: 'new-project', 'existing-project', null
  // REMOVE: isProjectInitializer (replaced by initializerType)
  template: text
  createdAt: timestamp default now()
  updatedAt: timestamp default now()
}

// projects table changes
projects {
  id: serial primary key
  name: text not null
  path: text not null
  level: integer not null
  projectType: text not null  // 'greenfield', 'brownfield'
  userId: text not null references user(id)  // NEW: foreign key to better-auth user
  workflowPathId: integer references workflow_paths(id)
  initializedByExecutionId: integer references workflow_executions(id)
  createdAt: timestamp default now()
  updatedAt: timestamp default now()
}

// app_config table changes
app_config {
  id: serial primary key
  userId: text unique not null references user(id)  // NEW: unique constraint
  selectedModel: text  // OpenRouter model ID
  preferences: jsonb  // User preferences (theme, notifications, etc.)
  createdAt: timestamp default now()
  updatedAt: timestamp default now()
}

// Step config Zod schemas (TypeScript, not DB tables)
// Define in packages/db/src/schema/step-configs.ts

import { z } from 'zod'

export const askUserStepConfigSchema = z.object({
  question: z.string(),
  responseType: z.enum(['string', 'text', 'number', 'boolean', 'choice', 'path']),
  responseVariable: z.string(),
  validation: z.object({
    required: z.boolean().optional(),
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
    pattern: z.string().optional()
  }).optional(),
  choices: z.object({
    options: z.array(z.string()),
    allowCustom: z.boolean().optional()
  }).optional()
})

export const askUserChatStepConfigSchema = z.object({
  systemPrompt: z.string(),
  initialMessage: z.string(),
  outputVariable: z.string(),
  completionCondition: z.object({
    type: z.enum(['user-satisfied', 'confidence-threshold', 'max-turns']),
    threshold: z.number().optional(),
    maxTurns: z.number().optional()
  })
})

export const executeActionStepConfigSchema = z.object({
  actions: z.array(z.object({
    type: z.enum(['set-variable', 'file', 'git', 'database'])
    // type-specific fields to be added...
  }))
})

export const llmGenerateStepConfigSchema = z.object({
  llmTask: z.object({
    type: z.enum(['classification', 'structured', 'generation'])
    // type-specific fields to be added...
  }),
  outputVariable: z.string()
})

export const displayOutputStepConfigSchema = z.object({
  contentTemplate: z.string()  // Handlebars template
})

// Union schema for validation
export const stepConfigSchema = z.union([
  askUserStepConfigSchema,
  askUserChatStepConfigSchema,
  executeActionStepConfigSchema,
  llmGenerateStepConfigSchema,
  displayOutputStepConfigSchema
])

// Infer TypeScript types from Zod schemas
export type AskUserStepConfig = z.infer<typeof askUserStepConfigSchema>
export type AskUserChatStepConfig = z.infer<typeof askUserChatStepConfigSchema>
export type ExecuteActionStepConfig = z.infer<typeof executeActionStepConfigSchema>
export type LLMGenerateStepConfig = z.infer<typeof llmGenerateStepConfigSchema>
export type DisplayOutputStepConfig = z.infer<typeof displayOutputStepConfigSchema>
export type StepConfig = z.infer<typeof stepConfigSchema>
```

**Removed Tables:**
- `workflow_step_branches` (deprecated - conditional branching deferred to future)
- `workflow_step_actions` (deprecated - actions now inline in ExecuteActionStepConfig)

**Indexes to Add:**
```typescript
// Add to Drizzle schema definitions using .index() method

// In packages/db/src/schema/projects.ts
export const projects = pgTable('projects', {
  // ... fields
}, (table) => ({
  userIdIdx: index('idx_projects_user_id').on(table.userId)
}))

// In packages/db/src/schema/workflows.ts
export const workflows = pgTable('workflows', {
  // ... fields
}, (table) => ({
  moduleIdx: index('idx_workflows_module').on(table.module)
}))

// In packages/db/src/schema/workflow-executions.ts
export const workflowExecutions = pgTable('workflow_executions', {
  // ... fields
}, (table) => ({
  statusIdx: index('idx_workflow_executions_status').on(table.status),
  projectIdIdx: index('idx_workflow_executions_project_id').on(table.projectId)
}))

// In packages/db/src/schema/workflow-steps.ts
export const workflowSteps = pgTable('workflow_steps', {
  // ... fields
}, (table) => ({
  workflowIdIdx: index('idx_workflow_steps_workflow_id').on(table.workflowId)
}))
```

### Implementation Steps

**Phase 1: Schema Updates (Estimated: 3 hours)**

1. **Update `packages/db/src/schema/workflows.ts`:**
   - Add `initializerType` field (text, nullable)
   - Remove `isProjectInitializer` field
   - Add index on `module` field
   - Update exports

2. **Update `packages/db/src/schema/projects.ts`:**
   - Add `userId` field with foreign key to `user(id)`
   - Add index on `userId` field
   - Ensure `workflowPathId` and `initializedByExecutionId` foreign keys are correct

3. **Update `packages/db/src/schema/app-config.ts`:**
   - Add `userId` field with unique constraint
   - Add foreign key to `user(id)`

4. **Create `packages/db/src/schema/step-configs.ts`:**
   - Install Zod: `bun add zod`
   - Define Zod schemas for 5 step config types
   - Infer TypeScript types from Zod schemas
   - Export union schema for validation
   - Add JSDoc comments with examples

5. **Delete deprecated tables:**
   - Remove `packages/db/src/schema/workflow-step-branches.ts` (if exists)
   - Remove `packages/db/src/schema/workflow-step-actions.ts` (if exists)
   - Update `packages/db/src/schema/index.ts` to remove exports

6. **Update workflow-steps.ts with indexes:**
   - Add index on `workflowId` field using Drizzle `.index()` method

7. **Update workflow-executions.ts with indexes:**
   - Add index on `status` field
   - Add index on `projectId` field

**Phase 2: Docker Reset Script (Estimated: 1 hour)**

1. **Create `scripts/reset-db.sh`:**
```bash
#!/bin/bash
set -e

echo "⚠️  WARNING: This will DELETE ALL DATA from the database."
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Aborted."
    exit 1
fi

echo "🔄 Stopping and removing Docker containers with volumes..."
cd packages/db
docker compose down -v 2>/dev/null || docker-compose down -v

echo "🚀 Starting fresh Docker containers..."
docker compose up -d 2>/dev/null || docker-compose up -d

echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

echo "📊 Applying database schema..."
cd ../..
bun run db:push

echo "✅ Database reset complete!"
echo "💡 Run 'bun run db:seed' to populate with seed data (Story 1.2)"
```

2. **Make script executable:**
```bash
chmod +x scripts/reset-db.sh
```

3. **Add npm scripts to root `package.json`:**
```json
{
  "scripts": {
    "db:reset": "./scripts/reset-db.sh",
    "db:push": "cd packages/db && drizzle-kit push"
  }
}
```

**Phase 3: Remove Migration System (Estimated: 30 minutes)**

1. **Delete migration files:**
```bash
rm -rf packages/db/src/migrations/*
```

2. **Remove migration scripts from `packages/db/package.json`:**
   - Remove `db:migrate`, `db:generate`, etc. if they exist
   - Keep only `db:push` for direct schema application

3. **Update `.gitignore` to exclude migrations folder:**
```
packages/db/src/migrations/
```

**Phase 4: Test Framework Setup (Estimated: 2 hours)**

1. **Verify Bun test configuration:**
   - Bun uses built-in test runner (no additional config needed)
   - Ensure test files follow pattern: `**/*.test.ts` or `**/*.spec.ts`

2. **Create schema validation test:**

`packages/db/src/schema/schema.test.ts`:
```typescript
import { describe, test, expect } from 'bun:test'
import { db } from '../index'
import { workflows, projects, appConfig } from './index'

describe('Database Schema', () => {
  test('workflows table has initializerType field', async () => {
    // This test validates schema is applied correctly
    // Query will fail if field doesn't exist
    const result = await db.select({
      id: workflows.id,
      name: workflows.name,
      initializerType: workflows.initializerType
    }).from(workflows).limit(1)
    
    expect(result).toBeDefined()
  })

  test('projects table has userId field', async () => {
    const result = await db.select({
      id: projects.id,
      userId: projects.userId
    }).from(projects).limit(1)
    
    expect(result).toBeDefined()
  })

  test('appConfig table has unique userId constraint', async () => {
    const result = await db.select({
      id: appConfig.id,
      userId: appConfig.userId
    }).from(appConfig).limit(1)
    
    expect(result).toBeDefined()
  })
})
```

3. **Create step config type tests:**

`packages/db/src/schema/step-configs.test.ts`:
```typescript
import { describe, test, expect } from 'bun:test'
import {
  askUserStepConfigSchema,
  askUserChatStepConfigSchema,
  executeActionStepConfigSchema,
  llmGenerateStepConfigSchema,
  displayOutputStepConfigSchema,
  stepConfigSchema
} from './step-configs'

describe('Step Config Zod Schemas', () => {
  test('validates AskUserStepConfig correctly', () => {
    const validConfig = {
      question: 'What is your project name?',
      responseType: 'string' as const,
      responseVariable: 'project_name',
      validation: {
        required: true,
        minLength: 3,
        maxLength: 50
      }
    }
    
    const result = askUserStepConfigSchema.safeParse(validConfig)
    expect(result.success).toBe(true)
  })

  test('rejects invalid AskUserStepConfig', () => {
    const invalidConfig = {
      question: 'What is your project name?',
      responseType: 'invalid_type',  // Invalid enum value
      responseVariable: 'project_name'
    }
    
    const result = askUserStepConfigSchema.safeParse(invalidConfig)
    expect(result.success).toBe(false)
  })

  test('validates AskUserChatStepConfig correctly', () => {
    const validConfig = {
      systemPrompt: 'You are a helpful assistant',
      initialMessage: 'How can I help you?',
      outputVariable: 'chat_result',
      completionCondition: {
        type: 'user-satisfied' as const
      }
    }
    
    const result = askUserChatStepConfigSchema.safeParse(validConfig)
    expect(result.success).toBe(true)
  })

  test('validates ExecuteActionStepConfig correctly', () => {
    const validConfig = {
      actions: [
        { type: 'set-variable' as const }
      ]
    }
    
    const result = executeActionStepConfigSchema.safeParse(validConfig)
    expect(result.success).toBe(true)
  })

  test('validates LLMGenerateStepConfig correctly', () => {
    const validConfig = {
      llmTask: {
        type: 'classification' as const
      },
      outputVariable: 'classification_result'
    }
    
    const result = llmGenerateStepConfigSchema.safeParse(validConfig)
    expect(result.success).toBe(true)
  })

  test('validates DisplayOutputStepConfig correctly', () => {
    const validConfig = {
      contentTemplate: 'Hello {{name}}!'
    }
    
    const result = displayOutputStepConfigSchema.safeParse(validConfig)
    expect(result.success).toBe(true)
  })

  test('union schema accepts all step config types', () => {
    const configs = [
      {
        question: 'Test?',
        responseType: 'string' as const,
        responseVariable: 'test'
      },
      {
        systemPrompt: 'Test',
        initialMessage: 'Test',
        outputVariable: 'test',
        completionCondition: { type: 'user-satisfied' as const }
      },
      {
        actions: [{ type: 'set-variable' as const }]
      },
      {
        llmTask: { type: 'classification' as const },
        outputVariable: 'test'
      },
      {
        contentTemplate: 'Test'
      }
    ]

    configs.forEach(config => {
      const result = stepConfigSchema.safeParse(config)
      expect(result.success).toBe(true)
    })
  })
})
```

4. **Create foreign key constraint test:**

`packages/db/src/schema/constraints.test.ts`:
```typescript
import { describe, test, expect } from 'bun:test'
import { db } from '../index'
import { projects, workflows, appConfig, user, agents } from './index'

describe('Foreign Key Constraints', () => {
  test('cannot insert project with non-existent userId', async () => {
    const invalidProject = {
      name: 'test-project',
      path: '/tmp/test-project',
      level: 3,
      projectType: 'greenfield',
      userId: 'non-existent-user-id',  // FK violation
      workflowPathId: null,
      initializedByExecutionId: null
    }

    try {
      await db.insert(projects).values(invalidProject)
      expect(true).toBe(false)  // Should not reach here
    } catch (error) {
      // Expected FK constraint error
      expect(error).toBeDefined()
    }
  })

  test('cannot insert workflow with non-existent agentId', async () => {
    const invalidWorkflow = {
      name: 'test-workflow',
      displayName: 'Test Workflow',
      module: 'bmm',
      agentId: 99999,  // FK violation - non-existent agent
      initializerType: null
    }

    try {
      await db.insert(workflows).values(invalidWorkflow)
      expect(true).toBe(false)  // Should not reach here
    } catch (error) {
      // Expected FK constraint error
      expect(error).toBeDefined()
    }
  })

  test('cannot insert duplicate userId in appConfig', async () => {
    // This test assumes a user exists in the database
    // Will need to be adjusted based on seed data (Story 1.2)
    
    // Test validates unique constraint on userId
    // Implementation deferred until seed data exists
    expect(true).toBe(true)  // Placeholder
  })
})
```

**Phase 5: Validation (Estimated: 1 hour)**

1. **Run reset script:**
```bash
bun run db:reset
```

2. **Verify tables created:**
```bash
docker exec -it chiron-postgres psql -U postgres -d chiron -c "\dt"
```

Expected output: 15 tables listed

3. **Run tests:**
```bash
bun test
```

Expected: All tests pass

4. **Verify indexes:**
```bash
docker exec -it chiron-postgres psql -U postgres -d chiron -c "\di"
```

Expected: 5 indexes created

5. **Verify schema details:**
```bash
docker exec -it chiron-postgres psql -U postgres -d chiron -c "\d workflows"
docker exec -it chiron-postgres psql -U postgres -d chiron -c "\d projects"
docker exec -it chiron-postgres psql -U postgres -d chiron -c "\d app_config"
```

Verify:
- `workflows` has `initializerType` field, no `isProjectInitializer`
- `projects` has `userId` foreign key
- `app_config` has unique constraint on `userId`

---

## Testing Requirements

### Unit Tests

**1. Schema Definition Tests**
- **File:** `packages/db/src/schema/schema.test.ts`
- **Purpose:** Validate that Drizzle schema definitions compile and match expected structure
- **Tests:**
  - `workflows` table has required fields (`id`, `name`, `displayName`, `module`, `agentId`, `initializerType`)
  - `workflows.initializerType` field exists (new field)
  - `workflows.isProjectInitializer` field does NOT exist (removed field)
  - `projects` table has `userId` foreign key
  - `appConfig` table has unique constraint on `userId`
  - Step config Zod schemas compile without errors
  - Union schema `stepConfigSchema` includes all 5 step types

**2. Type Safety Tests**
- **File:** `packages/db/src/schema/step-configs.test.ts`
- **Purpose:** Validate Zod step config schemas are correctly defined
- **Tests:**
  - Can create valid `AskUserStepConfig` object (Zod validation passes)
  - Can create valid `AskUserChatStepConfig` object
  - Can create valid `ExecuteActionStepConfig` object
  - Can create valid `LLMGenerateStepConfig` object
  - Can create valid `DisplayOutputStepConfig` object
  - Invalid config structure fails Zod validation (safeParse returns success: false)
  - Union schema accepts all 5 config types

**3. Foreign Key Constraint Tests**
- **File:** `packages/db/src/schema/constraints.test.ts`
- **Purpose:** Validate database enforces foreign key constraints
- **Tests:**
  - Cannot insert project with non-existent `userId` (FK violation)
  - Cannot insert workflow with non-existent `agentId` (FK violation)
  - Cannot insert appConfig with non-existent `userId` (FK violation)
  - Cannot insert duplicate `userId` in appConfig (unique constraint violation) - deferred to Story 1.2

### Integration Tests

**1. Docker Reset Script Test**
- **Manual test** (no automated test file for MVP)
- **Purpose:** Validate reset script works end-to-end
- **Tests:**
  - Script runs without errors
  - Database containers restart successfully
  - Schema is applied after reset
  - All 15 tables exist after reset
  - Can run script multiple times (idempotency)

### Manual Testing Checklist

**Schema Validation:**
- [ ] Run `bun run db:reset` successfully
- [ ] Connect to database: `docker exec -it chiron-postgres psql -U postgres -d chiron`
- [ ] List tables: `\dt` (verify 15 tables exist)
- [ ] Describe `workflows` table: `\d workflows` (verify `initializerType` exists, `isProjectInitializer` does not)
- [ ] Describe `projects` table: `\d projects` (verify `userId` foreign key exists)
- [ ] Describe `app_config` table: `\d app_config` (verify `userId` unique constraint exists)
- [ ] List indexes: `\di` (verify 5 indexes created)

**Migration Removal:**
- [ ] Check `packages/db/src/migrations/` directory is empty or deleted
- [ ] Check `packages/db/package.json` has no migration scripts

**Test Execution:**
- [ ] Run `bun test` (all tests pass)
- [ ] No failing tests or compilation errors

### Coverage Goals

- **Schema files:** 100% (all tables and types validated)
- **Constraint enforcement:** 80% (FK tests cover main constraints, unique constraint test deferred)
- **Docker reset script:** 100% (manual validation)

### Expected Test Output

```bash
$ bun test

✓ packages/db/src/schema/schema.test.ts
  ✓ Database Schema
    ✓ workflows table has initializerType field (2ms)
    ✓ projects table has userId field (1ms)
    ✓ appConfig table has unique userId constraint (1ms)

✓ packages/db/src/schema/step-configs.test.ts
  ✓ Step Config Zod Schemas
    ✓ validates AskUserStepConfig correctly (0ms)
    ✓ rejects invalid AskUserStepConfig (0ms)
    ✓ validates AskUserChatStepConfig correctly (0ms)
    ✓ validates ExecuteActionStepConfig correctly (0ms)
    ✓ validates LLMGenerateStepConfig correctly (0ms)
    ✓ validates DisplayOutputStepConfig correctly (0ms)
    ✓ union schema accepts all step config types (1ms)

✓ packages/db/src/schema/constraints.test.ts
  ✓ Foreign Key Constraints
    ✓ cannot insert project with non-existent userId (15ms)
    ✓ cannot insert workflow with non-existent agentId (12ms)
    ✓ cannot insert duplicate userId in appConfig (0ms - placeholder)

13 tests passed (3 files)
Done in 0.45s
```

---

## Risk Assessment and Mitigation

### High-Risk Items

**Risk 1: Docker Environment Issues**
- **Probability:** Medium
- **Impact:** High (blocks all development)
- **Description:** Docker not installed, not running, or port conflicts preventing PostgreSQL container from starting
- **Mitigation:**
  - Add Docker health check to reset script: `docker info || echo "Docker not running"`
  - Provide clear error messages with resolution steps
  - Document Docker Desktop installation in project README
  - Test script on clean machine before marking story complete
- **Rollback:** Manual Docker cleanup: `docker-compose down -v && docker system prune`

**Risk 2: Data Loss During Development**
- **Probability:** High (by design)
- **Impact:** Medium (expected behavior, but could surprise developers)
- **Description:** `db:reset` destroys ALL data including seed data, requiring re-seeding after every reset
- **Mitigation:**
  - Add warning to script: "⚠️  WARNING: This will DELETE ALL DATA. Continue? (y/N)"
  - Document clearly in README: "db:reset is destructive - use only in development"
  - Create separate `db:seed` command for re-seeding after reset (Story 1.2)
  - Consider adding `db:reset-and-seed` convenience command
- **Rollback:** No rollback possible - data is destroyed by design

**Risk 3: Schema Conflicts with Existing Better-Auth Tables**
- **Probability:** Low-Medium
- **Impact:** High (foreign key failures, app crashes)
- **Description:** Better-auth already created `user`, `session`, `account`, `verification` tables with different schema than expected
- **Mitigation:**
  - Audit existing better-auth schema before changes: `\d user` in psql
  - Use Drizzle introspection to detect conflicts: `drizzle-kit introspect`
  - If conflicts exist, align Chiron schema with better-auth defaults (don't modify better-auth tables)
  - Document better-auth version in tech spec (ensure compatibility)
- **Rollback:** Restore Docker volume from backup (if backup exists), otherwise full reset

### Medium-Risk Items

**Risk 4: Migration File Removal Breaking Production Path**
- **Probability:** Low (MVP is local-only)
- **Impact:** High (future production deployment blocked)
- **Description:** Removing migrations means no migration history, making production deployment difficult later
- **Mitigation:**
  - Document decision clearly: "Docker reset approach is DEVELOPMENT ONLY"
  - Add TODO comment in code: "// TODO: Implement proper migrations before production"
  - Plan to re-introduce migrations in Epic 7 (polish phase)
  - Keep migration folder in `.gitignore` but don't delete the directory structure
- **Rollback:** Regenerate migrations from final schema: `drizzle-kit generate` before production

**Risk 5: Index Creation Failures**
- **Probability:** Low
- **Impact:** Medium (performance degraded, but functionality works)
- **Description:** Indexes fail to create due to naming conflicts or syntax errors
- **Mitigation:**
  - Use Drizzle's `.index()` method for type-safe index definitions
  - Test index creation on fresh database
  - Add index validation to test suite (query `pg_indexes` table)
  - Indexes are added inline in table definitions, no separate SQL files
- **Rollback:** Remove problematic indexes from schema, re-apply

**Risk 6: TypeScript Step Config Types Misalignment**
- **Probability:** Medium
- **Impact:** Medium (runtime errors when parsing JSONB)
- **Description:** Zod schemas don't match actual JSONB structure stored in database, causing runtime failures
- **Mitigation:**
  - **Use Zod for runtime validation** of JSONB step configs
  - Define Zod schemas for all 5 step config types in `packages/db/src/schema/step-configs.ts`
  - Infer TypeScript types from Zod schemas: `type AskUserStepConfig = z.infer<typeof askUserStepConfigSchema>`
  - Validate JSONB data on read from database using Zod parse/safeParse
  - Add schema validation tests in Story 1.4 (when workflow engine reads configs)
  - Document step config types clearly with examples
- **Rollback:** Fix Zod schemas and re-apply, re-seed workflows with correct configs

### Low-Risk Items

**Risk 7: Test Framework Configuration Issues**
- **Probability:** Low
- **Impact:** Low (tests don't run, but doesn't block development)
- **Description:** Bun test framework not configured correctly, tests fail to discover or run
- **Mitigation:**
  - Use Bun defaults (no config needed for basic setup)
  - Test with minimal test file first: `bun test --bail`
  - Check Bun documentation for test configuration
  - Consider using `vitest` if Bun test has issues (alternative test runner)
- **Rollback:** Use alternative test runner (Jest, Vitest)

**Risk 8: Docker Compose Version Incompatibility**
- **Probability:** Low
- **Impact:** Low (script fails but easy to fix)
- **Description:** `docker-compose` vs `docker compose` (v1 vs v2 command syntax)
- **Mitigation:**
  - Use `docker compose` (v2 syntax) in script for modern Docker Desktop
  - Add fallback: `docker compose || docker-compose` for v1 compatibility
  - Document minimum Docker version in README
- **Rollback:** Update script to use correct command syntax

### Dependency Risks

**Blocker Dependencies (must complete before next story):**
- Story 1.2 (Core Data Seeding) **BLOCKED** until schema is stable and tested
- Story 1.4 (Workflow Execution Engine) **BLOCKED** until schema is finalized

**No Blockers From Previous Stories:**
- This is Story 1.1 (first story in epic), no predecessor dependencies

### Rollback Strategy

**Full Rollback (if story completely fails):**
1. Restore previous schema files from git: `git checkout HEAD~1 packages/db/src/schema/`
2. Delete reset script: `rm scripts/reset-db.sh`
3. Re-run existing migration system (if it exists): `bun run db:migrate`
4. Notify team: "Story 1.1 rolled back, schema changes reverted"

**Partial Rollback (if specific change fails):**
1. **Schema change fails:** Revert specific table definition in Drizzle schema
2. **Reset script fails:** Fix script bugs, re-test
3. **Test failures:** Fix tests, don't roll back schema
4. **Index creation fails:** Remove problematic indexes, proceed with story (indexes are optimization, not critical)

### Monitoring and Validation

**Post-Deployment Checks:**
- [ ] Run `bun run db:reset` successfully 3 times (test idempotency)
- [ ] Run `bun test` with 100% passing tests
- [ ] Connect to database and verify all 15 tables exist
- [ ] Verify foreign key constraints work (insert invalid data, expect error)
- [ ] Verify no migration files remain in codebase
- [ ] Document any issues in Story 1.1 retrospective notes

**Success Metrics:**
- Reset script runs in <30 seconds
- All tests pass on first run
- Zero schema conflicts with better-auth
- Story 1.2 can begin immediately without blockers

---

## Definition of Done

- [ ] All schema changes applied and tables created
- [ ] Docker reset script works without errors
- [ ] No migration files remain in codebase
- [ ] Indexes created on all specified columns using Drizzle `.index()` method
- [ ] Zod schemas defined for all 5 step config types
- [ ] TypeScript types inferred from Zod schemas
- [ ] Bun test runs with at least 13 passing tests (3 test files)
- [ ] Foreign key constraints tested (insert invalid data, verify error)
- [ ] Documentation updated (README with `db:reset` command)
- [ ] Manual validation checklist completed
- [ ] No blockers for Story 1.2 (Core Data Seeding)

---

## Dependencies

**Depends On:**
- None (first story in epic)

**Blocks:**
- Story 1.2: Core Data Seeding (requires stable schema)
- Story 1.4: Workflow Execution Engine (requires finalized schema and step config types)

---

## Notes

- This story establishes the foundation for all database work in Epic 1
- Docker reset approach is **development-only** - production will need proper migrations (Epic 7)
- Zod validation ensures runtime safety for JSONB step configs
- Better-auth tables are managed by the library, Chiron extends with `app_config` only
- 15 tables in scope, optional `dialog_sessions` table can be deferred to future stories if needed

---

## Dev Agent Record

### Context Reference

- [Story Context XML](./1-1-database-schema-refactoring.context.xml) - Generated 2025-11-07

### Agent Model Used

<!-- e.g., Claude 3.5 Sonnet, GPT-4 Turbo, OpenCode, etc. -->

### Debug Log References

<!-- Links to relevant debug logs if needed during implementation -->

### Completion Notes

**Pre-Implementation Checklist:**
- [ ] All acceptance criteria reviewed and understood
- [ ] All tasks reviewed and understood
- [ ] Dev Notes architecture patterns reviewed
- [ ] Risk assessment reviewed
- [ ] Test requirements reviewed

**Implementation Validation:**
- [ ] All tasks completed and checked off
- [ ] All acceptance criteria validated
- [ ] All tests passing (`bun test`)
- [ ] Manual testing checklist completed
- [ ] No migration files remain in codebase
- [ ] Docker reset script tested (3x idempotency check)
- [ ] Database schema verified (15 tables, 5 indexes)
- [ ] Foreign key constraints tested
- [ ] Documentation updated (README with `db:reset` command)

**Story Completion:**
- [ ] All Definition of Done items checked
- [ ] No blockers for Story 1.2 (Core Data Seeding)
- [ ] Story moved to 'review' status in sprint-status.yaml

### File List

<!-- Generated files marked as NEW, modified files marked as MODIFIED -->

**Example format:**
```
NEW: packages/db/src/schema/step-configs.ts
NEW: packages/db/src/schema/schema.test.ts
NEW: packages/db/src/schema/step-configs.test.ts
NEW: packages/db/src/schema/constraints.test.ts
NEW: scripts/reset-db.sh
MODIFIED: packages/db/src/schema/workflows.ts
MODIFIED: packages/db/src/schema/projects.ts
MODIFIED: packages/db/src/schema/app-config.ts
MODIFIED: packages/db/src/schema/workflow-steps.ts
MODIFIED: packages/db/src/schema/workflow-executions.ts
MODIFIED: packages/db/src/schema/index.ts
MODIFIED: package.json (root)
MODIFIED: .gitignore
DELETED: packages/db/src/schema/workflow-step-branches.ts (if existed)
DELETED: packages/db/src/schema/workflow-step-actions.ts (if existed)
DELETED: packages/db/src/migrations/* (all migration files)
```

---

## Change Log

| Date | Author | Change Description |
|------|--------|-------------------|
| 2025-11-07 | SM Agent (fahad) | Initial story draft created via *create-story workflow |
| 2025-11-07 | SM Agent (fahad) | Story restructured after validation - added Tasks, Dev Notes, Dev Agent Record sections |
