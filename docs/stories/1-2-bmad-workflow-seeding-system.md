# Story 1.2: BMAD Workflow Seeding System

**Epic:** 1 - Core Infrastructure & Database Foundation
**Priority:** P0 (Critical)
**Estimate:** 2 days
**Dependencies:** Story 1.1
**Status:** ready-for-dev

## Story

As a Chiron developer,
I want to seed BMAD workflows, agents, and configurations from YAML/Markdown files into the database,
so that the workflow engine has all necessary metadata to execute BMAD workflows on initial setup.

## Acceptance Criteria

- [ ] Seed script reads BMAD files from `bmad/` directory
- [ ] All BMM workflows seeded into `workflows` table
- [ ] All CIS workflows seeded into `workflows` table
- [ ] 6 core agents seeded into `agents` table (Analyst, PM, Architect, DEV, SM, UX Designer)
- [ ] Agent capabilities seeded (already in agents table as JSONB)
- [ ] Workflow paths seeded (greenfield-level-0 through greenfield-level-4, brownfield variants)
- [ ] Test user seeded into `user` table (one user for local development)
- [ ] Seed script is idempotent (can run multiple times safely)
- [ ] `bun db:seed` populates database successfully

## Tasks / Subtasks

### Implementation
- [ ] Create workflows seed file (AC: 2, 3)
  - [ ] Parse workflow.yaml files from BMM and CIS directories
  - [ ] Read instructions.md for each workflow
  - [ ] Determine agent assignment (workflow name → agent mapping)
  - [ ] Determine chat pattern (sequential, parallel, structured, focused)
  - [ ] Seed into `workflows` table with idempotency
- [ ] Update seed.ts main script (AC: 8)
  - [ ] Import workflows seed function
  - [ ] Call workflows seed after agents/paths
  - [ ] Add error handling
- [ ] Test seeding (AC: 7, 8)
  - [ ] Run `npm run db:seed` successfully
  - [ ] Verify all agents seeded (6 core agents)
  - [ ] Verify all workflow paths seeded (10 paths, game-design excluded)
  - [ ] Verify workflows seeded (count validation)
  - [ ] Run seed twice to verify idempotency

### Testing
- [ ] Test: Seed script runs without errors
- [ ] Test: All 6 agents seeded correctly
- [ ] Test: Workflow paths seeded (10 paths expected)
- [ ] Test: BMM workflows seeded (count validation)
- [ ] Test: CIS workflows seeded (count validation)
- [ ] Test: Running seed twice doesn't create duplicates

## Dev Notes

**Technical Approach:**
- Use `js-yaml` to parse YAML files (already in dependencies)
- Use Drizzle ORM `.onConflictDoNothing()` for idempotency
- Recursively scan bmad/ directories for workflow.yaml files
- Map workflow names to agents using naming conventions

**Agent-Workflow Mapping Strategy:**
- product-brief, brainstorm, research → analyst
- prd, validate-prd → pm
- architecture, tech-spec, solutioning-gate-check → architect
- dev-story, code-review → dev
- sprint-planning, create-story, story-ready, story-done → sm
- create-ux-design, design-thinking → ux-designer

**Pattern Detection Heuristics:**
- brainstorm, design-thinking → structured (Pattern C)
- review, validate → focused (Pattern D)
- planning, sprint → parallel (Pattern B)
- default → sequential (Pattern A)

**Seeding Infrastructure Already in Place (from Story 1.1):**
- ✅ `packages/scripts/` package exists
- ✅ `seed.ts` main script exists
- ✅ `seeds/agents.ts` - already implemented
- ✅ `seeds/workflow-paths.ts` - already implemented
- 🔜 `seeds/workflows.ts` - to be created in this story

### Learnings from Previous Story

**From Story 1.1 (Status: done)**

- **Schema Structure Available**: All tables ready for seeding
  - `agents` table (5 core + workflow definition tables)
  - `workflows` table (name, agent_id, pattern, instructions, yamlConfig)
  - `workflow_paths` table (already being seeded)

- **Seeding Infrastructure**:
  - Script location: `packages/scripts/src/seed.ts`
  - Agent seeding pattern: Use `.onConflictDoNothing()` for idempotency
  - Dependencies installed: `js-yaml`, `drizzle-seed`

- **Database Patterns to Follow**:
  - Drizzle ORM query API: `db.query.agents.findFirst()`
  - JSONB storage for flexible metadata (tools, mcp_servers → capabilitiesJson)
  - Foreign key lookups before inserting (get agent.id before workflow insert)

[Source: stories/1-1-database-schema-design-and-migration-system.md#Completion-Notes-List]

### Project Structure Notes

- Seed scripts: `packages/scripts/src/seeds/`
- BMAD workflows: `bmad/bmm/workflows/**` and `bmad/cis/workflows/**`
- Workflow paths: `bmad/bmm/workflows/workflow-status/paths/`
- Main seed entry: `packages/scripts/src/seed.ts`

### References

- [Source: docs/epics.md#Story-1.2]
- [Source: stories/1-1-database-schema-design-and-migration-system.md]
- [Source: packages/scripts/src/seeds/agents.ts] (pattern reference)
- [Source: packages/scripts/src/seeds/workflow-paths.ts] (pattern reference)

## Dev Agent Record

### Context Reference

- [Story Context XML](./1-2-bmad-workflow-seeding-system.context.xml)

### Agent Model Used

claude-sonnet-4-20250514

### Debug Log References

<!-- To be filled during implementation -->

### Completion Notes List

<!-- To be filled upon completion -->

### File List

<!-- To be updated as files are created/modified -->

## Change Log

- 2025-11-05: Story created via create-story workflow, marked as drafted
