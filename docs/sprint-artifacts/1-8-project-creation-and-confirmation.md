# Story 1.8: Project Creation & Confirmation

Status: drafted

## Story

As a User,
I want the system to physically create the project files and database records based on my approved choices,
so that I can start working on my new project immediately.

## Acceptance Criteria

1. A new Step 3 "Project Creation" (`execute-action`) is implemented.
2. The creation step performs filesystem operations (mkdir), git initialization, and database insertion.
3. A rollback mechanism cleans up the directory if any part of the creation process fails.
4. A new Step 4 "Success Display" (`display-output`) shows a celebratory message.
5. A project creation API (or internal service method) handles the heavy lifting.
6. The full workflow from "Select Directory" to "Success" works end-to-end.

## Tasks / Subtasks

- [ ] Implement Step 3: Project Creation (AC: 1, 2, 3)
  - [ ] Seed `execute-action` step
  - [ ] Implement `file` action (mkdir recursive)
  - [ ] Implement `git` action (`git init`)
  - [ ] Implement `database` action (insert `projects` record)
  - [ ] Ensure rollback logic is robust
- [ ] Implement Step 4: Success Display (AC: 4)
  - [ ] Seed `display-output` step with celebratory markdown template
  - [ ] Add "Go to Project" navigation button configuration
- [ ] Project Creation Logic (AC: 5)
  - [ ] Implement backend logic for project creation (ensure `node:fs` and `simple-git` are used correctly)
  - [ ] Ensure `userId` and `workflowPathId` are correctly passed from execution variables
- [ ] End-to-End Validation (AC: 6)
  - [ ] Verify directory creation
  - [ ] Verify git repo existence
  - [ ] Verify database record
  - [ ] Verify success screen display

## Dev Notes

- **Architecture:** This is the "Act" phase of the workflow. It consumes the variables set in Steps 1 and 2 (`project_path`, `project_name`, `selected_workflow_path_id`).
- **Security:** Ensure that the `project_path` + `project_name` doesn't overwrite existing important system directories (though the `mkdir` check should handle this).
- **Variables:** Access variables using the Handlebars syntax `{{variable_name}}`.
- **API:** You may need to create a new internal service method `createProject` in `packages/api/src/services/project.ts` if it doesn't exist, or handle it directly in the `ExecuteAction` handler extensions.

### Project Structure Notes

- `packages/scripts/src/seeds/workflow-init-new.ts`
- `packages/api/src/services/workflow-engine/step-handlers/execute-action-handler.ts` (may need extension for `git` and `file` actions if not fully implemented in Story 1.8 scope previously).

### References

- [Source: packages/scripts/src/seeds/workflow-init-new.ts]
- [Source: docs/epics/epic-1-foundation.md]

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

Claude-3-5-Sonnet

### Debug Log References

### Completion Notes List

### File List
