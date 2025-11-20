# Story 1.7: Workflow-Init Refactor & Project Naming

Status: review

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

- [x] Refactor Workflow Steps (AC: 1, 2, 7)
  - [x] Remove existing Step 1 (Set field type) from `workflow-init-new` seed
  - [x] Seed **Step 1** as the Chat/Athena step (was Step 3)
  - [x] Seed **Step 2** as the Directory Selection step (was Step 2)
- [x] Update Tool Configurations (AC: 3)
  - [x] Update `update_complexity` tool to use hardcoded "greenfield" literal
  - [x] Update `select_workflow_path` tool to use hardcoded "greenfield" literal
- [x] Implement `update_project_name` Tool (AC: 4, 5)
  - [x] Add `update_project_name` to `AskUserChatStepConfig` in Step 1
  - [x] Configure tool trigger (post-path selection)
  - [x] Configure generic OptionCard/approval UI for name suggestion
  - [x] Implement validation logic (`^[a-z0-9-]+$`)
- [x] Update Chat Completion (AC: 6)
  - [x] Add `update_project_name` to `requiredTools`
  - [x] Verify completion logic requires all approvals
- [x] UX Enhancements (Bonus)
  - [x] Fix read-only mode for chat steps to show full history
  - [x] Add "Instructions" tab to sidebar
  - [x] Implement dynamic agent instruction preview (backend endpoint)
  - [x] Implement dynamic tool list filtering in agent context
- [x] Testing (AC: 8)
  - [x] Verify `bun db:seed` runs cleanly with new order
  - [x] Verify end-to-end conversational flow followed by directory selection
  - [x] Verify dynamic instruction updates during chat

## Review Follow-ups (AI)

- [x] [AI-Review][High] Fix tool name check in `apps/web/src/components/workflows/steps/ask-user-chat-step-new.tsx` to match `"update_project_name"` (or update seed to match `"generate_project_name"`). (AC #5) [file: apps/web/src/components/workflows/steps/ask-user-chat-step-new.tsx:515]
- [x] [AI-Review][Med] Verify that `ProjectNameSelectorCard` triggers correctly and enforces the regex `^[a-z0-9-]+$`. (AC #5)

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


## Senior Developer Review (AI) - Follow-up

### Reviewer: fahad
### Date: 2025-11-20
### Outcome: Approved

**Justification:**
All previous findings have been resolved. The critical integration bug preventing the custom project naming UI from loading has been fixed, and the dependency chain for the workflow path selection tool has been corrected. The end-to-end flow is now fully functional and robust.

### Key Fixes Verified

- **Tool Name Mismatch Fixed:** `AskUserChatStepNew.tsx` now correctly checks for `"update_project_name"`, successfully loading the `ProjectNameSelectorCard`.
- **Validation Logic Verified:** The `ProjectNameSelectorCard` was manually tested and confirmed to enforce the kebab-case regex (`^[a-z0-9-]+$`) correctly.
- **Dependency Chain Restored:** The `select_workflow_path` tool now correctly triggers after complexity approval, unblocking the full workflow.
- **Robust Tool Output Handling:** Added a fallback in the UI to construct the suggestions array from individual `project_name` and `reasoning` fields if the array is missing, preventing UI crashes from malformed LLM responses.

### Final Code Polish (Refactoring)

- **File Renaming:** `ask-user-chat-step-new.tsx` has been renamed to `ask-user-chat-step.tsx` to remove the temporary suffix.
- **Imports Updated:** All references in `initialize.tsx` have been updated to point to the new file name.
- **Verification:** Playwright tests confirmed the renamed component functions identically, with chat history, user input, and tool approval cards rendering correctly.

### Acceptance Criteria Coverage

| AC# | Description | Status | Evidence |
|:---:|:---|:---:|:---|
| 5 | Enforce kebab-case validation | **VERIFIED** | UI component now loads and prevents invalid inputs. |
| 8 | End-to-end flow works | **VERIFIED** | Completed full flow: Summary -> Complexity -> Path -> Name -> Directory. |

### Closing Notes
The implementation is now complete and verified against all acceptance criteria. The code changes are targeted and effectively resolve the integration issues discovered in the initial review.


