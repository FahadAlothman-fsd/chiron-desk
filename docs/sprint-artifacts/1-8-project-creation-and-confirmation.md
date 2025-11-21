# Story 1.8: Project Initialization & Confirmation

Status: drafted

## Story

As a User,
I want the system to initialize the selected directory as a Chiron project (Git + Database),
so that I can start working immediately without the system trying to overwrite or delete my existing folders.

## Acceptance Criteria

1. A new Step 3 "Project Initialization" (`execute-action`) is implemented.
2. **Pre-flight Check:** The system verifies that `git` is installed and accessible in the system environment before attempting operations.
3. The initialization step performs:
    - **Git Initialization**: Runs `git init` (idempotent).
    - **Database Update**: Updates the **existing** project record with the finalized details (path, name, etc.).
4. **Configurable Mapping**: The `database` action configuration must explicitly map:
    - **Values to Set**: Workflow Variables to Database Columns (e.g., `name: "{{project_name}}"`, `path: "{{project_path}}"`).
    - **Where Clause**: Match the record using the system variable (e.g., `id: "{{project_id}}"`).
5. **Safety First**: The system **must not** delete the project directory on failure.
6. A new Step 4 "Success Display" (`display-output`) shows a celebratory message.
7. The `initializedByExecutionId` field is **NOT** required/used.

## Tasks / Subtasks

- [x] Implement Step 3: Project Initialization (AC: 1, 3, 4, 5, 7)
  - [x] Seed `execute-action` step
  - [x] Implement `git` action (`git init`)
  - [x] Implement `database` action with **generic update logic**:
    - Read `action.payload.operation = "update"`.
    - Read `action.payload.columns` (fields to set).
    - Read `action.payload.where` (e.g., `{ id: "{{project_id}}" }`).
    - Resolve `{{variables}}` in both columns and where clause.
    - Perform UPDATE on `projects` table.
  - [x] Remove `initializedByExecutionId` logic.
- [x] Implement Git Availability Check (AC: 2)
  - [x] Create `isGitInstalled()` helper.
  - [x] Fail gracefully if missing.
- [x] Implement Step 4: Success Display (AC: 6)
  - [x] Seed `display-output` step.
- [x] End-to-End Validation
  - [x] Verify Git init.
  - [x] Verify DB record is UPDATED (not inserted) correctly.

## Dev Notes

- **Architecture:** This is the "Act" phase. It consumes `project_path` and `project_name`.
- **Safety:** Treat the file system as "User Land". Do not perform destructive deletes on the project folder.
- **Git:** Use `simple-git`. `git.init()` is safe to run on existing repos.
- **API Key Configuration:** Step 1 (ask-user-chat) uses `ax-generation` tools which require OpenRouter API key. The key is loaded from:
  1. User's encrypted config in database (`appConfig.openrouterApiKey`)
  2. Fallback to environment variable: `OPENROUTER_API_KEY` (defined in `apps/server/.env`)

### Project Structure Notes

- `packages/scripts/src/seeds/workflow-init-new.ts`
- `packages/api/src/services/workflow-engine/step-handlers/execute-action-handler.ts`

### References

- [Source: packages/scripts/src/seeds/workflow-init-new.ts]
- [Source: docs/epics/epic-1-foundation.md]

## Dev Agent Record

### Context Reference

[Context File](1-8-project-creation-and-confirmation.context.xml)

### Agent Model Used

Claude-3-5-Sonnet

### Debug Log References

### Completion Notes List

- ✅ Implemented `execute-action` handler enhancements for `git` and `database` operations.
- ✅ Added `simple-git` dependency to `@chiron/api`.
- ✅ Implemented automatic `git init` and database record update in Step 3 of `workflow-init-new`.
- ✅ Added Step 4 "Success Display" to `workflow-init-new`.
- ✅ Removed legacy `initializedByExecutionId` logic from project creation endpoints.
- ✅ Verified implementation with new unit tests in `execute-action-handler.test.ts` covering git initialization and database updates.
- ✅ Fixed missing `OPENROUTER_API_KEY` in `apps/server/.env.example` for ax-generation tool API calls.

### File List

- packages/api/package.json
- packages/api/src/services/workflow-engine/step-handlers/execute-action-handler.ts
- packages/api/src/services/workflow-engine/step-handlers/execute-action-handler.test.ts
- packages/api/src/routers/projects.ts
- packages/scripts/src/seeds/workflow-init-new.ts
- packages/db/src/schema/step-configs.ts
