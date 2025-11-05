# Workflow Engine Design Brief

**Date**: 2025-11-04
**Agent**: Architect
**Task**: Design the Workflow Engine architecture for Chiron

---

## Context

We attempted to implement Epic 1 Story 1.1 (Database Schema Design) but discovered a critical architectural gap: **we haven't defined how BMAD's workflow engine translates to Chiron's architecture**.

BMAD's workflow engine is LLM-driven (Claude reads `workflow.xml` and executes workflows from YAML/Markdown files directly). Chiron needs a visual UI with multi-agent coordination, so we need to carefully design how this translation works.

---

## Critical Questions to Answer

### 1. Workflow Execution Model
**BMAD**: CLI-based, LLM reads workflow.xml → executes workflows from YAML/MD files
**Question**: Should Chiron's workflow engine be:
- **Option A**: LLM-driven (Claude reads workflow specs from DB, executes steps)
- **Option B**: Code-driven (TypeScript engine interprets workflow specs, calls LLM only for content generation)
- **Option C**: Hybrid (Engine handles control flow, LLM handles content/decisions)

**Implications**: Affects database schema, execution model, error handling, resumability

---

### 2. Workflow Storage Strategy
**BMAD**: Workflows are YAML + Markdown files in `bmad/` directory
**Question**: How should Chiron store workflows?
- **Option A**: Keep as files, reference in DB (file path only)
- **Option B**: Seed into DB from files on startup (Story 1.2 approach)
- **Option C**: Store in DB but maintain sync with files (hybrid)

**Implications**: Affects workflow versioning, extensibility, seeding strategy

---

### 3. Step Execution & UI Mapping
**BMAD**: Claude directly interprets `<step>`, `<action>`, `<ask>` tags in instructions.md
**Chiron**: Visual UI with chat patterns (Sequential Dependencies, Structured Exploration, etc.)

**Questions**:
- How do workflow steps map to UI components?
- How do chat patterns relate to workflow steps?
- Should workflow YAML/instructions explicitly define UI components?
- Example: Does `<ask>` become a chat message, a form, or a Pattern A sequential step?

**Implications**: Affects workflow schema (yaml_config structure), UI component architecture

---

### 4. Variable Resolution Architecture
**BMAD**: 4-level precedence documented in architecture-foundations.md:
1. `config_source` references (read from config.yaml)
2. System-generated (`{{date}}` → current date)
3. User input (prompt if variable unknown)
4. Default values (from workflow YAML)

**Questions**:
- Where does this resolution happen? In the engine or in the LLM prompt?
- If code-driven: TypeScript resolves and passes to LLM as context?
- If LLM-driven: LLM reads precedence rules and resolves?
- How are resolved variables stored? (workflow_state.context_json?)

**Implications**: Affects workflow_state schema, execution engine design

---

### 5. Multi-Agent Coordination
**BMAD**: Single-agent (Claude executes workflow sequentially)
**Chiron**: Multiple agents working in parallel on isolated git worktrees

**Questions**:
- How does the workflow engine coordinate agents?
- Does each agent have its own workflow engine instance?
- How do workflows trigger agent handoffs? (Example: Analyst completes product-brief → triggers PM)
- How do workflows handle parallel agent execution? (Example: Epic 6 - multiple DEV agents on different stories)

**Implications**: Affects workflow_state schema, agent coordination patterns, event system

---

## Key Constraints from PRD

- **FR001**: System shall store workflow definitions in PostgreSQL database (seeded from BMAD YAML/Markdown)
- **FR002**: System shall execute workflows following BMAD's workflow.xml engine rules
- **FR004**: System shall resolve variables using 4-level precedence
- **FR005**: System shall maintain workflow state and enable resume/restart
- **FR006**: System shall coordinate 2+ AI coding agents executing workflows in parallel

---

## Deliverable

Create `docs/workflow-engine-architecture.md` that includes:

1. **Execution Model Decision** (LLM-driven vs Code-driven vs Hybrid)
2. **Storage Strategy** (Files vs DB vs Hybrid)
3. **Step-to-UI Mapping** (How workflow steps become UI components)
4. **Variable Resolution** (Architecture diagram showing precedence flow)
5. **Multi-Agent Coordination** (Patterns for parallel execution and handoffs)
6. **Database Schema Implications** (Required tables/columns for chosen architecture)
7. **Workflow YAML Structure** (Extended format to support UI mapping)
8. **Event System** (How engine communicates with UI and agents)

---

## Success Criteria

After this design document is complete, we should be able to:
1. ✅ Resume Epic 1 Story 1.1 with confidence about database schemas
2. ✅ Implement Story 1.2 (BMAD Workflow Seeding) knowing exactly what to seed
3. ✅ Implement Story 1.5 (Workflow Execution Engine) with clear architecture
4. ✅ Implement Epic 2 stories knowing how workflow steps map to UI patterns

---

## References

- **PRD**: `/home/gondilf/Desktop/projects/masters/chiron/docs/PRD.md` (FR001-FR045)
- **Architecture Foundations**: `/home/gondilf/Desktop/projects/masters/chiron/docs/architecture-foundations.md` (Variable precedence, Q1-Q10 insights)
- **Epic 1 Stories**: `/home/gondilf/Desktop/projects/masters/chiron/docs/epics.md` (Lines 39-251)
- **BMAD Workflow Engine**: `/home/gondilf/Desktop/projects/masters/chiron/bmad/core/tasks/workflow.xml`
- **Example Workflow**: `/home/gondilf/Desktop/projects/masters/chiron/bmad/bmm/workflows/workflow-status/workflow.yaml`

---

**Next Step**: Load Architect agent in new session and run architecture workflow focused on workflow engine design.
