# SCHEMA KNOWLEDGE BASE

Drizzle ORM PostgreSQL schema definitions. All tables exported via index.ts barrel.

## SCHEMA MAP

| File | Tables | Purpose |
|------|--------|---------|
| `ace.ts` | `acePlaybooks`, `miproTrainingExamples` | ACE/MiPRO optimization learning |
| `agents.ts` | `agents` | LLM agent configs (model, tools, prompts) |
| `artifacts.ts` | `projectArtifacts` | Generated file tracking |
| `auth.ts` | `user`, `session`, `account`, `verification` | Better-Auth tables |
| `core.ts` | `projects`, `workflowPaths`, `workflowPathWorkflows`, `projectState`, `appConfig` | Core domain + config |
| `optimization.ts` | `trainingExamples`, `optimizationRuns` | @ax-llm/ax GEPA data |
| `project-management.ts` | `epicState`, `storyState` | Epic/story progress |
| `step-configs.ts` | (none - Zod schemas only) | Step config validation types |
| `workflow-templates.ts` | `workflowTemplates` | Handlebars artifact templates |
| `workflows.ts` | `workflows`, `workflowSteps`, `workflowExecutions` | Workflow engine state |

## WHERE TO LOOK

| Task | File | Notes |
|------|------|-------|
| Add table to existing domain | Find domain file above | Add pgTable + export |
| Add new domain | Create `<domain>.ts` | Export from index.ts |
| Add step config type | `step-configs.ts` | Add Zod schema + union member |
| Modify workflow execution | `workflows.ts` | Also check step-handlers in api package |
| Add JSONB column type | Same file as table | Use `.$type<T>()` for type safety |

## PATTERNS

**IDs**: `uuid("id").primaryKey().defaultRandom()` - always UUID v4

**Timestamps**: `timestamp("created_at").notNull().defaultNow()` + optional `updatedAt`

**Relations**: Import target table, use `.references(() => table.id, { onDelete: "cascade" })`

**JSONB typed**: `jsonb("col").$type<TypeInterface>().default({})` - define interface inline or import

**Enums**: `pgEnum("name", [...])` - declared in same file as using table

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
