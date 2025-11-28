# Story 2.1: Project Dashboard & Schema Foundation

Status: ready-for-dev

## Story

As a User,
I want a dashboard that shows my project's current phase and next recommended workflow, supported by a flexible database schema,
so that I can start the right workflow with the right context.

## Acceptance Criteria

1. **Schema Refactor:** Update `workflows` table to support flexible metadata:
   - ADD: `tags` (JSONB) for filtering (e.g., `type: "technique"`, `phase: "discovery"`)
   - ADD: `metadata` (JSONB) for UI configuration
   - REMOVE: `module`, `agentId`, `initializerType`, `isStandalone`, `requiresProjectContext` (move these to `metadata` or `tags` if still needed, or remove if obsolete)
2. **Seed Workflow (Shell):** Seed the `brainstorming` workflow entry with correct `tags` and `artifactTemplate` (steps array can be empty shell for now).
3. **Dashboard UI:** Implement the Project Dashboard showing Phase 0 (Discovery + Analysis) status.
4. **Routing Logic:** "Start Brainstorming" button uses `workflow_paths` (or direct workflow lookup via tags) to determine availability.
5. **Context Passing:** Clicking Start initiates the workflow engine with the project name/description context.

## Tasks / Subtasks

- [ ] Task 1: Schema Refactor (AC: 1)
  - [ ] Modify `packages/db/src/schema/workflows.ts` to add `tags`, `metadata`
  - [ ] Remove obsolete columns from `workflows.ts`
  - [ ] Update types/interfaces in `packages/db` and `packages/api`
  - [ ] Run migration/push to update local DB
- [ ] Task 2: Seed Data (AC: 2)
  - [ ] Create/Update seed file `packages/scripts/src/seeds/workflows.ts` (or similar)
  - [ ] Add `brainstorming` workflow with `tags: { phase: "0", type: "method" }`
  - [ ] Ensure `artifactTemplate` reference is set
- [ ] Task 3: Dashboard UI Implementation (AC: 3, 4, 5)
  - [ ] Create `apps/web/src/routes/dashboard.tsx` (or update existing)
  - [ ] Implement Phase 0 visualization (Active/Pending state)
  - [ ] Add "Start Brainstorming" button
  - [ ] Connect button to `useWorkflow` hook or API to start execution
  - [ ] Verify context (project details) is passed to reference

## UI Wireframe

```text
┌───────────────────────────────────────────────────────────────────────────────────┐
│ Chiron    🎯 Projects    👥 Team    ⚙️ Settings         [🔍 Search]   [@fahad ▾]  │
├───────────────────────────────────────────────────────────────────────────────────┤
│                                                                                   │
│  📊 TaskFlow (Project)                                    Phase: 0-Discovery ●    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │ 🚀 Next Recommended Action                                                  │  │
│  ├─────────────────────────────────────────────────────────────────────────────┤  │
│  │                                                                             │  │
│  │   🧠 Brainstorming Session                                                  │  │
│  │   Kick off your project by defining the core topic, goals, and scope        │  │
│  │   with the AI assistance.                                                   │  │
│  │                                                                             │  │
│  │   [ ▶ Start Brainstorming ]                                                 │  │
│  │                                                                             │  │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                   │
│  ┌─────────────────────────┐  ┌─────────────────────────┐                         │
│  │ 📋 Current State        │  │ 🤖 Active Agents        │                         │
│  ├─────────────────────────┤  ├─────────────────────────┤                         │
│  │                         │  │                         │                         │
│  │ Phase 0: Discovery      │  │ ⚪ Analyst (Idle)       │                         │
│  │ └─ Ready to start       │  │                         │                         │
│  │                         │  │ ⚪ PM (Idle)            │                         │
│  │                         │  │                         │                         │
│  │                         │  │                         │                         │
│  └─────────────────────────┘  └─────────────────────────┘                         │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │ 📊 Phase Progress                                                           │  │
│  ├─────────────────────────────────────────────────────────────────────────────┤  │
│  │                                                                             │  │
│  │  👉 Phase 0: Discovery         ░░░░░░░░░░░░░░░░░░░░ 0%                      │  │
│  │     • Brainstorming ⚪ (Ready)                                              │  │
│  │                                                                             │  │
│  │  ⚪ Phase 1: Analysis          ░░░░░░░░░░░░░░░░░░░░ 0%                      │  │
│  │  ⚪ Phase 2: Planning          ░░░░░░░░░░░░░░░░░░░░ 0%                      │  │
│  │  ⚪ Phase 3: Solutioning       ░░░░░░░░░░░░░░░░░░░░ 0%                      │  │
│  │  ⚪ Phase 4: Implementation    ░░░░░░░░░░░░░░░░░░░░ 0%                      │  │
│  │                                                                             │  │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────┘
```

## Dev Notes

- **Architecture:** This story bridges the gap between the rigid schema of Epic 1 and the flexible, tag-driven requirement of the Artifact Workbench.
- **Schema Strategy:** Moving to `tags` and `metadata` JSONB fields allows for more dynamic workflow definitions without constant schema migrations (Decision #7 alignment for flexible configuration).
- **Dashboard Logic:** The dashboard should query `projects.executedVsPath` (or similar status tracking) to determine if Phase 0 is active.

### Project Structure Notes

- `packages/db/src/schema/workflows.ts` - Schema definition
- `packages/scripts/src/seeds/` - Seed data
- `apps/web/src/routes/` - Dashboard page
- `apps/web/src/components/dashboard/` - Dashboard components

### Learnings from Previous Story

**From Story 1.8 (Status: done)**

- **Integration**: The `execute-action` handler was enhanced for git/db ops. While not directly used here for the UI, the Dashboard will trigger workflows that use it.
- **Data Model**: `initializedByExecutionId` was removed from the `projects` table. Ensure the Dashboard query does not try to access this field.
- **Project Context**: Story 1.8 standardized how projects are initialized. The Dashboard relies on the `projects` table having valid `path` and `name` set by Story 1.8.

### References

- [Source: docs/epics/epic-2-artifact-workbench.md] - Epic requirements
- [Source: docs/architecture/database-schema-architecture.md] - Original schema baseline (note deviation)
- [Source: docs/sprint-artifacts/1-8-project-creation-and-confirmation.md] - Previous story context

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/2-1-project-dashboard.context.xml

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

## Change Log

- **2025-11-28**: Initial Draft created by SM Agent (Story 2.1)
