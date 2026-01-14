# Story 1.3: Project CRUD Operations

**Epic:** 1 - Core Infrastructure & Database Foundation
**Priority:** P0 (Critical)
**Estimate:** 2 days
**Dependencies:** Story 1.1
**Status:** ready-for-dev

## Story

As a Chiron developer,
I want to implement API endpoints and services for creating, reading, updating, and deleting projects,
so that the application can manage project lifecycle operations through tRPC procedures.

## Acceptance Criteria

- [ ] `projects.create` tRPC procedure creates new project entry
- [ ] `projects.list` tRPC procedure lists all projects
- [ ] `projects.get` tRPC procedure gets single project with details
- [ ] `projects.delete` tRPC procedure removes project (with confirmation)
- [ ] Project creation validates:
  - Directory path exists or can be created
  - Directory is empty or has valid git repository
  - Project name is unique
- [ ] Project deletion:
  - Removes database entries (cascade delete for related records)
  - Does NOT delete files on disk (safety measure)
  - Warns user about active agents
- [ ] All operations return proper tRPC error codes and error messages

## Tasks / Subtasks

### Implementation

- [ ] Create projects router file (AC: 1, 2, 3, 4)
  - [ ] Define input/output schemas with Zod for type safety
  - [ ] Implement `projects.create` procedure with validation
  - [ ] Implement `projects.list` procedure
  - [ ] Implement `projects.get` procedure with parameter validation
  - [ ] Implement `projects.delete` procedure with cascade handling
- [ ] Integrate projects router into appRouter (AC: All)
  - [ ] Import projects router into main router
  - [ ] Export TypeScript types for frontend use
- [ ] Add validation logic (AC: 5, 6)
  - [ ] Directory path validation (exists or can be created)
  - [ ] Git repository validation (empty or has valid .git)
  - [ ] Project name uniqueness check
  - [ ] Active agents warning for deletion

### Testing

- [ ] Test: Create project with valid data succeeds
- [ ] Test: Create project with duplicate name fails
- [ ] Test: Create project with invalid path fails
- [ ] Test: List projects returns all projects
- [ ] Test: Get project by valid ID returns project
- [ ] Test: Get project by invalid ID returns error
- [ ] Test: Delete project removes database entries
- [ ] Test: Delete project does not delete files on disk

## Dev Notes

**Technical Approach:**

- Use tRPC (not plain Hono endpoints) - project uses tRPC for type-safe API layer
- Project already has `@chiron/api` package with tRPC setup
- Create new router file: `packages/api/src/routers/projects.ts`
- Use Zod schemas for input/output validation
- Use Drizzle ORM for database operations

**Database Schema Reference (from Story 1.1):**

- Table: `projects` (packages/db/src/schema/core.ts:34-49)
- Columns: id (uuid), name (text, unique), path (text), level (enum), type (enum), fieldType (enum), createdAt, updatedAt
- Related table: `project_state` with cascade delete on projects.id

**Validation Requirements:**

1. **Project Name:** Must be unique (database constraint exists)
2. **Directory Path:**
   - Must be absolute path
   - Either empty directory OR existing git repository
   - Can create if doesn't exist
3. **Git Repository:**
   - Check for `.git` directory existence
   - Validate git status returns successfully

**Cascade Delete Behavior:**

- `project_state` table has `onDelete: "cascade"` for `projectId` foreign key
- Database will automatically remove related records
- No manual cleanup needed

**Testing Strategy:**

- Story context states: "No formal test framework configured yet for Epic 1. Use manual verification"
- Use manual API testing with tools like curl, Postman, or Thunder Client
- Consider creating simple test script for validation

### Learnings from Previous Story

**From Story 1.2 - BMAD Workflow Seeding System (Status: done)**

- **Database Patterns to Reuse**:
  - Drizzle ORM query API: `db.query.projects.findFirst({ where: eq(projects.name, name) })`
  - Use `.onConflictDoNothing()` or `.onConflictDoUpdate()` for upsert operations
  - Foreign key lookups before inserting (verify relationships exist)

- **Project Structure**:
  - API package location: `packages/api/src/`
  - Router pattern: Create dedicated router file, export from `routers/index.ts`
  - Existing example: `packages/api/src/routers/index.ts` has healthCheck + privateData

- **Error Handling Pattern**:
  - Use try-catch in procedures
  - Throw TRPCError with appropriate codes (BAD_REQUEST, NOT_FOUND, INTERNAL_SERVER_ERROR)
  - Log errors with console.error before throwing

- **TypeScript Patterns**:
  - Use Zod for schema validation (already in catalog)
  - Explicit return types on procedures
  - Type-safe database queries with Drizzle

- **Development Environment**:
  - Bun runtime (package.json:58)
  - Turborepo monorepo structure
  - Scripts: `dev:server` for API development

[Source: stories/1-2-bmad-workflow-seeding-system.md#Dev-Agent-Record]

### Project Structure Notes

**API Package Structure:**

```
packages/api/
├── src/
│   ├── index.ts          # tRPC initialization and middleware
│   ├── context.ts        # Request context with auth session
│   └── routers/
│       ├── index.ts      # Main app router
│       └── projects.ts   # NEW - Projects CRUD router
```

**Database Package Reference:**

- Schema location: `packages/db/src/schema/core.ts`
- Import: `import { projects, projectState } from "@chiron/db/schema/core"`
- Database client: Import from `@chiron/db`

### References

- [Source: docs/epics.md#Story-1.3 (lines 135-163)]
- [Source: packages/db/src/schema/core.ts:34-49] (projects table schema)
- [Source: packages/db/src/schema/core.ts:98-121] (project_state table with cascade)
- [Source: packages/api/src/routers/index.ts] (existing router pattern)
- [Source: packages/api/src/index.ts] (tRPC initialization)
- [Source: stories/1-2-bmad-workflow-seeding-system.md] (database patterns)

## Dev Agent Record

### Context Reference

- [Story Context XML](./1-3-project-crud-operations.context.xml)

### Agent Model Used

<!-- Will be filled by dev agent -->

### Debug Log References

### Completion Notes List

### File List
