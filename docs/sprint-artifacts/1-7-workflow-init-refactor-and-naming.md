# Story 1.7: Workflow-Init Refactor & Project Naming

Status: ready-for-dev

## Story

As a User,
I want to be guided through project naming within the conversational flow and have a seamless initialization experience,
so that I don't have to switch contexts between "chatting" and "form filling" and can efficiently set up my project.

## Acceptance Criteria

1. Workflow structure is refactored to remove the redundant "field type" step (old Step 1).
2. Steps are reordered to prioritize the conversation: **Step 1 = Chat (Athena)**, **Step 2 = Directory Selection**.
3. Existing tools (`update_complexity`, `select_workflow_path`) use hardcoded "greenfield" filter instead of a variable.
4. A new `update_project_name` tool is implemented within the Chat Step (Step 1).
5. The project naming tool enforces kebab-case validation (`^[a-z0-9-]+$`).
6. The Chat Step completion condition requires the project name to be approved.
7. Step 2 (Directory Selection) prompts the user *after* the project details are finalized.
8. The entire flow (Chat [Summary -> Complexity -> Path -> Name] -> Directory) works end-to-end.

## Tasks / Subtasks

- [ ] Refactor Workflow Steps (AC: 1, 2, 7)
  - [ ] Remove existing Step 1 (Set field type) from `workflow-init-new` seed
  - [ ] Seed **Step 1** as the Chat/Athena step (was Step 3)
  - [ ] Seed **Step 2** as the Directory Selection step (was Step 2)
- [ ] Update Tool Configurations (AC: 3)
  - [ ] Update `update_complexity` tool to use hardcoded "greenfield" literal
  - [ ] Update `select_workflow_path` tool to use hardcoded "greenfield" literal
- [ ] Implement `update_project_name` Tool (AC: 4, 5)
  - [ ] Add `update_project_name` to `AskUserChatStepConfig` in Step 1
  - [ ] Configure tool trigger (post-path selection)
  - [ ] Configure generic OptionCard/approval UI for name suggestion
  - [ ] Implement validation logic (`^[a-z0-9-]+$`)
- [ ] Update Chat Completion (AC: 6)
  - [ ] Add `update_project_name` to `requiredTools`
  - [ ] Verify completion logic requires all approvals
- [ ] Testing (AC: 8)
  - [ ] Verify `bun db:seed` runs cleanly with new order
  - [ ] Verify end-to-end conversational flow followed by directory selection

## Dev Notes

- **Architecture:** This story leverages the "Generic Tool Engine" established in Story 1.6. No new UI components should be needed for the tool itself, just configuration in the seed file.
- **Refactoring:** Be careful when removing Step 1. Ensure that the `workflow_steps` table is cleaned up properly during the seed run (idempotency).
- **Tool Configuration:** The `update_project_name` tool should use the `ax-generation` type and likely share the same `approval-card` UI pattern as the other tools, or a simplified version if supported.
- **Validation:** The regex `^[a-z0-9-]+$` must be strictly enforced to ensure the directory name is valid.

### Project Structure Notes

- `packages/scripts/src/seeds/workflow-init-new.ts` is the primary file to modify.
- `packages/api/src/services/workflow-engine/step-handlers/ask-user-chat-handler.ts` might need minor tweaks if the validation logic isn't fully generic yet, but it should be.

### References

- [Source: packages/scripts/src/seeds/workflow-init-new.ts]
- [Source: docs/epics/epic-1-foundation.md]

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/1-7-workflow-init-refactor-and-naming.context.xml

### Agent Model Used

Claude-3-5-Sonnet

### Debug Log References

### Completion Notes List

### File List
