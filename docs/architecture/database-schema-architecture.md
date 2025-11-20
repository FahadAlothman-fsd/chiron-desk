# Database Schema Architecture

**Date:** 2025-11-07  
**Author:** Architect (Winston) + Fahad  
**Status:** Ready for Validation

---

## Executive Summary

Chiron uses a 15-table PostgreSQL schema with Drizzle ORM, storing all workflow step configuration in JSONB fields to enable runtime extensibility without schema migrations. The schema supports multi-user projects, dynamic workflow paths with tag-based filtering, and dual-level progress tracking (step-level and workflow-level) for complete execution visibility.

---

## Decision Summary

| Category | Decision | Version | Rationale |
|----------|----------|---------|-----------|
| **Database** | PostgreSQL | 17 (latest via Docker) | JSONB support, advanced indexing, verified 2025-11-07 |
| **ORM** | Drizzle | 0.44.2 | Type-safe, lightweight, excellent migration support, verified 2025-11-07 |
| **Schema Pattern** | JSONB for step configs | - | No new tables needed for new step patterns, supports runtime extensibility |
| **Progress Tracking** | Dual tracking (step + workflow) | - | `executedSteps` + `executedVsPath` JSONB fields provide complete visibility |
| **User Model** | Multi-user from day 1 | - | `userId` references on projects and app_config, supports future multi-tenancy |
| **Workflow Paths** | Tag-based filtering (no enums) | - | Dynamic filtering using JSONB tags, no schema migrations to add tracks |
| **Initializers** | Multiple initializer workflows | - | `initializerType` field supports different entry points (new vs existing projects) |

---

## Schema Structure (15 Tables)

### Category 1: Workflow Definition (2 tables)

**workflows**
- Container for workflow definitions
- Fields: `id`, `name`, `displayName`, `module`, `agentId`, `initializerType`, `isStandalone`, `requiresProjectContext`, `outputArtifactType`, `outputTemplateId`
- Key: `initializerType` supports multiple initializers (`"new-project"`, `"existing-project"`, or null)

**workflow_steps**
- Individual steps within workflows
- Fields: `id`, `workflowId`, `stepNumber`, `goal`, `stepType`, `config` (JSONB), `nextStepNumber`
- Key: ALL step configuration stored in `config` JSONB (branches, actions, validation, everything)

### Category 2: Execution & State (5 tables)

**workflow_executions**
- Runtime workflow execution state
- Fields: `id`, `workflowId`, `projectId`, `agentId`, `status`, `currentStep`, `variables` (JSONB), `executedSteps` (JSONB), `startedAt`, `completedAt`, `error`
- Key: `executedSteps` JSONB tracks step-by-step execution history with timestamps, outputs, branches taken

**projects**
- Project records with ownership
- Fields: `id`, `name`, `path`, `userId`, `workflowPathId`, `initializedByExecutionId`, `executedVsPath` (JSONB)
- Key: `userId` for multi-user support, `executedVsPath` for workflow-level progress tracking

**project_state**
- Current position in workflow path
- Fields: `id`, `projectId`, `workflowPathId`, `currentPhase`, `currentWorkflowId`, `completedWorkflows` (JSONB)
- Key: Tracks phase progression (1=Analysis, 2=Planning, 3=Solutioning, 4=Implementation)

**workflow_paths**
- Workflow sequences with free-form metadata
- Fields: `id`, `name`, `displayName`, `description`, `educationText`, `tags` (JSONB), `recommendedFor` (JSONB), `estimatedTime`, `agentSupport`, `sequenceOrder`
- Key: `tags` JSONB enables dynamic filtering (track, fieldType, complexity, custom tags)

**workflow_path_workflows**
- Junction table mapping workflows to paths by phase
- Fields: `id`, `workflowPathId`, `workflowId`, `phase`, `sequenceOrder`, `isOptional`, `isRecommended`
- Key: Defines which workflows belong to which path at which phase

### Category 3: Templates & Agents (2 tables)

**workflow_templates**
- Handlebars templates for artifact generation
- Fields: `id`, `name`, `displayName`, `artifactType`, `template`, `templateVariables` (JSONB)
- Key: Templates used by llm-generate steps to produce PRDs, architecture docs, etc.

**agents**
- Agent definitions with LLM configuration
- Fields: `id`, `name`, `displayName`, `description`, `role`, `llmProvider`, `llmModel`, `llmTemperature`, `tools` (JSONB), `mcpServers` (JSONB), `color`, `avatar`, `active`
- Key: First-class agent entities with capabilities defined in JSONB

### Category 4: Auth & User (5 tables)

**user**
- User accounts
- Fields: `id`, `name`, `email`, `emailVerified`, `image`, `createdAt`, `updatedAt`
- Uses Better-Auth standard schema

**session**
- Session management
- Fields: `id`, `userId`, `token`, `expiresAt`, `ipAddress`, `userAgent`, `createdAt`, `updatedAt`
- Uses Better-Auth standard schema

**account**
- OAuth provider accounts
- Fields: `id`, `userId`, `accountId`, `providerId`, `accessToken`, `refreshToken`, `idToken`, `scope`, `password`, `createdAt`, `updatedAt`
- Uses Better-Auth standard schema

**verification**
- Email verification tokens
- Fields: `id`, `identifier`, `value`, `expiresAt`, `createdAt`, `updatedAt`
- Uses Better-Auth standard schema

**app_config**
- Per-user API keys and settings
- Fields: `id`, `userId`, `openrouterApiKey`, `anthropicApiKey`, `openaiApiKey`, `defaultLlmProvider`, `createdAt`, `updatedAt`
- Key: `userId` unique constraint ensures one config per user

### Category 5: Optional (1 table)

**dialog_sessions**
- Dialog tracking for clarification steps
- Fields: `id`, `executionId`, `questionId`, `messages` (JSONB), `extractedAnswer`, `status`, `createdAt`, `closedAt`
- Note: Can be deferred to MVP+1, dialog state can live in `workflow_executions.variables`

---

## Implementation Patterns

### Pattern 1: JSONB Step Configuration

**Problem:** How do we add new step types or patterns without schema migrations?

**Solution:** All step-specific configuration lives in `workflow_steps.config` JSONB field.

**Example:**
```typescript
// Branch step with inline branches (no separate table)
{
  stepType: "branch",
  config: {
    type: "branch",
    evaluator: { type: "concrete", variable: "field_type" },
    branches: [
      {
        matchValue: "greenfield",
        label: "New Project",
        steps: [/* inline step definitions */]
      },
      {
        matchValue: "brownfield",
        label: "Existing Project",
        steps: [/* inline step definitions */]
      }
    ]
  }
}
```

**Benefits:**
- No new tables for new patterns
- Workflow authors can experiment without migrations
- Config evolution doesn't break existing workflows

---

### Pattern 2: Tag-Based Workflow Path Filtering

**Problem:** How do we filter workflow paths without hardcoded enums?

**Solution:** `workflow_paths.tags` JSONB field with free-form key-value pairs.

**Example:**
```typescript
// workflow_paths record
{
  name: "method-greenfield",
  tags: {
    track: "method",
    fieldType: "greenfield",
    complexity: "moderate",
    customTag: "value" // Can add any tags!
  }
}

// Query in workflow-init
SELECT * FROM workflow_paths 
WHERE tags->>'fieldType' = 'greenfield'
  AND tags->>'track' = 'method';
```

**Benefits:**
- Add new tracks/tags without schema changes
- Dynamic filtering in workflow-init
- No enum migrations

---

### Pattern 3: Dual Progress Tracking

**Problem:** How do we show both step-level and workflow-level progress?

**Solution:** Two JSONB fields tracking different granularities.

**Step-Level:** `workflow_executions.executedSteps`
```typescript
{
  "1": { 
    status: "completed", 
    startedAt: "2025-11-07T10:00:00Z",
    completedAt: "2025-11-07T10:00:15Z",
    output: { project_name: "task-manager" }
  },
  "2": { 
    status: "completed",
    startedAt: "2025-11-07T10:00:16Z",
    completedAt: "2025-11-07T10:00:45Z",
    branchTaken: "greenfield"
  }
}
```

**Workflow-Level:** `projects.executedVsPath`
```typescript
{
  "1": { // Phase 1
    "product-brief": { 
      status: "completed", 
      executionId: "exec-123",
      artifactPath: "docs/product-brief.md" 
    }
  },
  "2": { // Phase 2
    "create-prd": { 
      status: "in-progress",
      executionId: "exec-456"
    }
  }
}
```

**Benefits:**
- Debugging: See exactly what happened at each step
- Resumability: Can resume from last completed step
- Progress UI: Show phase-by-phase completion
- Audit trail: Complete execution history

---

### Pattern 4: Multi-User Isolation

**Problem:** How do we support multiple users with separate projects and configs?

**Solution:** `userId` foreign keys on `projects` and `app_config`.

**Constraints:**
- `projects.userId` → Ensures projects belong to users
- `app_config.userId` UNIQUE → One config per user
- All queries filtered by `current_user_id` from session

**Benefits:**
- Ready for multi-tenancy
- Clean data isolation
- Per-user API key management

---

## Novel Pattern: Workflow Engine

### Concept

Chiron's workflow engine is a **general-purpose, AI-powered workflow execution system** that handles:
- Project initialization (workflow-init)
- Artifact generation (PRD, Architecture, Stories)
- Progress tracking (executedVsPath, executedSteps)
- Multi-agent collaboration (agent-specific workflows)

### Key Innovations

1. **Workflows → Steps → Config (JSONB)** are the final primitives
   - No new tables needed for new step types
   - Branches and actions embedded in step config
   - Signatures only at step level (llm-generate steps)

2. **8 Step Types** cover all workflow patterns:
   - `ask-user` - User input with validation
   - `ask-user-chat` - Interactive chat with side effects
   - `llm-generate` - AI content generation with structured output
   - `branch` - N-way conditional routing (concrete or abstract)
   - `approval-checkpoint` - Human approval with artifact preview
   - `execute-action` - System operations (DB, file, git)
   - `invoke-workflow` - Workflow composition
   - `display-output` - Rich markdown output

3. **Dynamic Workflow Paths** enable methodology flexibility
   - No hardcoded tracks (quick-flow, method, enterprise)
   - Tag-based filtering for path selection
   - Recommendation engine based on project description

4. **Multiple Initializer Workflows** support different entry points
   - `workflow-init-new` for greenfield projects (no codebase scan)
   - `workflow-init-existing` for brownfield projects (with codebase scan)
   - `initializerType` field distinguishes them

### Example: workflow-init-new

**Flow:**
1. Ask project path (folder selector)
2. Ask project description (multi-line text)
3. Set field type = "greenfield"
4. LLM classifies complexity → recommends track
5. Query workflow_paths WHERE tags.fieldType = "greenfield"
6. Interactive chat to help user choose path
7. LLM generates 3 project name suggestions
8. User selects/inputs project name
9. Multi-action: Create directory + Git init + DB insert
10. Display success message

**Key Patterns Demonstrated:**
- Path selector (`responseType: "path"`)
- Message field (separate from question)
- LLM classification with reasoning
- Database query with JSONB filtering
- Interactive chat with side effects
- Structured LLM generation with schema
- Choice input with custom override (`allowCustom: true`)
- Multi-action execution (sequential file/git/database)
- Rich output with Handlebars templates

---

## Technology Compatibility

### Stack Coherence

✅ PostgreSQL 17 + Drizzle ORM 0.44.2 - Compatible, type-safe  
✅ JSONB fields + Drizzle `.$type<T>()` - Full TypeScript support  
✅ Better-Auth + PostgreSQL - Native support  
✅ Tauri + PostgreSQL - Local database works in desktop app  

### Integration Considerations

- **LLM Integration:** Workflow engine calls LLM providers via API (OpenRouter, Anthropic, OpenAI)
- **File System:** `execute-action` steps write artifacts to local file system
- **Git Operations:** `execute-action` supports git init, commit, branch operations
- **Database Queries:** `execute-action` can query workflow_paths, projects, etc.

---

## Scalability Considerations

### Expected Load (MVP)
- **Users:** 1-10 concurrent users (desktop app)
- **Projects:** 10-100 projects per user
- **Workflows:** 50-100 workflow definitions
- **Executions:** 1000s of executions over lifetime

### Performance Strategy
- **Indexes:** On foreign keys, status fields, JSONB paths
- **JSONB Queries:** Use GIN indexes for tag filtering
- **Execution Tracking:** Bounded JSONB size (max 100 steps per workflow)
- **Archival:** Completed executions can be archived after 90 days

### Future Scale Path
- **PostgreSQL handles:** 100k+ rows easily with proper indexing
- **JSONB performance:** Proven at scale with GIN indexes
- **Migration path:** Can shard by userId if multi-tenancy scales
- **Read replicas:** For analytics/reporting if needed

---

## Security Considerations

### API Key Storage
- `app_config` table stores LLM API keys
- **Must encrypt at rest** using application-level encryption
- Keys decrypted only when making LLM calls
- Never expose keys in logs or error messages

### User Isolation
- All queries filtered by `userId` from session
- Foreign key constraints enforce ownership
- No cross-user data leakage possible

### File System Access
- `execute-action` file operations limited to user's project directories
- Path validation prevents directory traversal
- Git operations only within project boundaries

---

## Common Issues Prevention

### Beginner Protection
✅ Standard schema patterns (Better-Auth, Drizzle conventions)  
✅ No complex transactions or stored procedures  
✅ Simple JSONB queries (no recursive CTEs)  
✅ Clear foreign key relationships  

### Expert Validation
✅ No obvious anti-patterns (JSONB used appropriately)  
✅ Indexes on query-heavy fields  
✅ JSONB bounded size (no unbounded arrays)  
✅ Migration path for scale (sharding possible)  
✅ Follows PostgreSQL best practices  

---

## Validation Checklist

- [x] All 15 tables defined with clear purpose
- [x] Foreign key relationships documented
- [x] JSONB fields have clear structure
- [x] Indexes planned for query performance
- [x] Multi-user isolation enforced
- [x] No hardcoded enums for methodology concepts
- [x] All step types can fit in config JSONB
- [x] Progress tracking strategy clear
- [x] Security considerations addressed
- [x] Scalability path defined

---

## Next Steps

1. **Validate this architecture** using the architecture validation workflow
2. **Run solutioning-gate-check** to ensure PRD → Architecture → Stories alignment
3. **Lock this document** after validation passes
4. **Proceed to Epic 1 Implementation** using `/docs/epics/epic-1-database-implementation.md`

---

**Status:** ✅ VALIDATED  
**Last Updated:** 2025-11-07  
**Authors:** Architect (Winston) + Fahad  
**Versions Verified:** 2025-11-07
