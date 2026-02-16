# SCHEMA KNOWLEDGE BASE

Drizzle ORM PostgreSQL schema definitions. All tables exported via index.ts barrel.

## SCHEMA MAP

| File                         | Tables                                                                            | Purpose                                      |
| ---------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------- |
| `ace.ts`                     | `acePlaybooks`, `miproTrainingExamples`                                           | ACE/MiPRO optimization learning              |
| `agents.ts`                  | `agents`                                                                          | LLM agent configs (model, tools, prompts)    |
| `approval-audit.ts`          | `approvalAudit` + enums: `trustLevelEnum`, `riskLevelEnum`                        | Approval flow audit trail, trust/risk matrix |
| `artifacts.ts`               | `projectArtifacts`                                                                | Generated file tracking                      |
| `auth.ts`                    | `user`, `session`, `account`, `verification`                                      | Better-Auth tables                           |
| `chat-messages.ts`           | `chatMessages` + enum: `messageRoleEnum`                                          | Individual chat messages within sessions     |
| `chat-sessions.ts`           | `chatSessions` + enum: `chatSessionStatusEnum`                                    | Chat session lifecycle                       |
| `core.ts`                    | `projects`, `workflowPaths`, `workflowPathWorkflows`, `projectState`, `appConfig` | Core domain + config                         |
| `optimization.ts`            | `trainingExamples`, `optimizationRuns`                                            | @ax-llm/ax GEPA data                        |
| `project-management.ts`      | `epicState`, `storyState`                                                         | Epic/story progress tracking                 |
| `step-configs.ts`            | (none - Zod schemas only)                                                         | Step config validation types (legacy Zod)    |
| `stream-checkpoints.ts`      | `streamCheckpoints` + enum: `streamCheckpointStatusEnum`                          | AI stream recovery/resume points             |
| `user-approval-settings.ts`  | `userApprovalSettings`                                                            | Per-user approval trust level preferences    |
| `variables.ts`               | `variables`, `variableHistory`                                                    | Workflow variable state + change history     |
| `workflow-templates.ts`      | `workflowTemplates`                                                               | Handlebars artifact templates                |
| `workflows.ts`               | `workflows`, `workflowSteps`, `workflowExecutions`, `stepExecutions` + enums: `workflowPatternEnum`, `stepTypeEnum`, `actionExecutionEnum`, `workflowStatusEnum`, `stepExecutionStatusEnum` | Workflow engine state |

## WHERE TO LOOK

| Task                         | File                                     | Notes                                                           |
| ---------------------------- | ---------------------------------------- | --------------------------------------------------------------- |
| Add table to existing domain | Find domain file above                   | Add pgTable + export                                            |
| Add new domain               | Create `<domain>.ts`                     | Export from index.ts                                            |
| Add step config type         | `step-configs.ts`                        | Zod schemas (legacy - will migrate to Effect Schema)            |
| Modify workflow execution    | `workflows.ts`                           | Also check workflow-engine package handlers                     |
| Add approval-related table   | `approval-audit.ts`                      | Trust/risk enums defined here, reused by user-approval-settings |
| Add chat-related table       | `chat-messages.ts` or `chat-sessions.ts` | Sessions own messages (one-to-many)                             |
| Add variable tracking        | `variables.ts`                           | variables + variableHistory with relations                      |
| Add JSONB column type        | Same file as table                       | Use `.$type<T>()` for type safety                               |

## PATTERNS

**IDs**: `uuid("id").primaryKey().defaultRandom()` - always UUID v4

**Timestamps**: `timestamp("created_at").notNull().defaultNow()` + optional `updatedAt`

**Relations**: Import target table, use `.references(() => table.id, { onDelete: "cascade" })`

**Drizzle Relations**: Use `relations()` from `drizzle-orm` for query-level joins (see chat-messages, variables, approval-audit)

**JSONB typed**: `jsonb("col").$type<TypeInterface>().default({})` - define interface inline or import

**Enums**: `pgEnum("name", [...])` - declared in same file as using table, can be imported by other files (e.g. `trustLevelEnum`)

**Indexes**: Third arg to `pgTable()` - use `index()` or `.using("gin", col)` for JSONB

**Add new table**:

```typescript
export const newTable = pgTable("new_table", {
	id: uuid("id").primaryKey().defaultRandom(),
	// columns...
	createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

## ANTI-PATTERNS

- **text IDs**: Only `auth.ts` uses text IDs (Better-Auth requirement) - use UUID everywhere else
- **Missing .$type()**: Raw `jsonb()` loses type safety - always add `.$type<T>()`
- **Inline relation refs**: Use arrow function `() => table.id` to avoid circular import issues
- **Forgetting index.ts**: New files must be exported from index.ts or invisible to app
- **step-configs.ts uses Zod**: This is legacy - new config schemas should use Effect Schema in `@chiron/workflow-engine/src/schema/`
