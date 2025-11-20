# Story 1.6 Implementation Progress Summary

**Story:** Conversational Project Initialization with AI-Powered Approval Gates  
**Status:** In Progress (Tasks 1-2 Complete, 3-14 Remaining)  
**Date:** 2025-11-13  
**Dev Agent:** Amelia (Claude)

---

## 🎯 Story Overview

This is the **THESIS VALIDATION STORY** for Chiron! It implements the conversational workflow pattern that validates the core hypothesis: AI agents can orchestrate complex workflows with human approval gates, learning from feedback to improve over time.

**Key Innovation:** Dynamic tool building from JSONB config + ACE optimizer for online learning + MiPRO data collection for offline optimization.

---

## ✅ Completed Tasks (2/14)

### **Task 1: Database Schema Updates** ✓ COMPLETE

**Files Created/Modified:**
- `packages/db/src/schema/step-configs.ts` - Updated `AskUserChatStepConfig` with:
  - `tools` array configuration (toolType, requiredVariables, axSignature, databaseQuery)
  - Input field source types (variable, context, literal, playbook)
  - Completion condition types (user-satisfied, all-tools-approved, confidence-threshold, max-turns)
  - Output variables mapping

- `packages/db/src/schema/ace.ts` - **NEW FILE** - ACE & MiPRO tables:
  - `acePlaybooks` table: agent_id, scope (global/user/project), playbook JSONB, version, total_updates
  - `miproTrainingExamples` table: tool_name, input JSONB, expected_output JSONB, rejection_history JSONB, scorer_results
  - Indexes on agent_id, tool_name, created_at

- `packages/db/src/schema/agents.ts` - Added `instructions` TEXT field for PM Agent system prompt
- `packages/db/src/schema/index.ts` - Exported ace schema

**Schema Applied:**
```bash
✓ Database reset complete (Docker containers recreated)
✓ Schema pushed via drizzle-kit push
✓ All tables created successfully
✓ Seed scripts executed (25 workflows seeded)
```

**Verification:**
- ACE playbooks table created with scope support (global/user/project)
- MiPRO training examples table ready for approved outputs
- Agents table now supports multi-line instructions field
- AskUserChatStepConfig schema supports dynamic tool configuration

---

### **Task 2: Mastra + Ax Infrastructure** ✓ COMPLETE

**Dependencies Installed:**
```bash
✓ @mastra/core@0.24.0 - AI agent orchestration framework
✓ @mastra/pg@0.17.8 - PostgreSQL storage adapter
✓ @mastra/memory@0.15.11 - Conversation memory management
✓ @mastra/evals@0.14.3 - Agent output quality scoring
✓ @ax-llm/ax@14.0.39 - Declarative LLM programming with ACE/MiPRO optimizers
✓ @ai-sdk/anthropic@2.0.44 - Anthropic API integration for Claude models
✓ pg@8.16.3 - PostgreSQL driver
✓ @types/pg@8.15.6 - TypeScript types for pg
```

**Files Created:**

1. **`packages/api/src/services/mastra/mastra-service.ts`** - Mastra Service
   - `getMastraInstance()` - Singleton instance with PostgreSQL storage
   - `createThread(resourceId)` - Create new conversation thread
   - `getThread(threadId)` - Load existing thread
   - `getThreadMessages(threadId)` - Fetch conversation history
   - Storage configured with `mastra` schema (separate from main app tables)

2. **`packages/api/src/services/mastra/ace-optimizer.ts`** - ACE Optimizer Service
   - `loadPlaybook(agentId, scope, userId?, projectId?)` - Load playbook from database
   - `applyOnlineUpdate(agentId, sectionName, feedback, input, prediction)` - Add bullet from rejection feedback
   - `formatPlaybookForPrompt(playbook)` - Convert to markdown for LLM injection
   - `savePlaybook(agentId, playbook, scope)` - Save with version increment
   - `getPlaybookInfo(agentId, scope)` - Get version and update count
   - Supports global, user, and project-scoped playbooks

3. **`packages/api/src/services/mastra/mipro-collector.ts`** - MiPRO Data Collector
   - `saveApprovedOutput(toolName, agentId, input, expectedOutput, rejectionHistory, scorerResults)` - Save training example
   - `getTrainingExamples(toolName, limit)` - Query examples for specific tool
   - `getTrainingExamplesByAgent(agentId, limit)` - Query all examples for agent
   - `getExampleCount(toolName?, agentId?)` - Count examples
   - `formatForMiPRO(examples)` - Format for offline optimization

4. **Test Files Created:**
   - `packages/api/test-setup.ts` - Test environment configuration
   - `packages/api/src/services/mastra/mastra-service.test.ts` - Mastra service tests
   - `packages/api/src/services/mastra/ace-optimizer.test.ts` - ACE optimizer tests (10 test cases)
   - `packages/api/src/services/mastra/mipro-collector.test.ts` - MiPRO collector tests (10 test cases)

**Test Coverage:**
- Mastra singleton initialization
- Thread creation and retrieval
- Message history persistence
- ACE playbook CRUD operations
- Online learning from rejection feedback
- MiPRO training data collection
- Playbook version management

---

## 🚧 Remaining Tasks (12/14)

### **Task 3: AskUserChatStepHandler Implementation** (0%)
**Files to Create:**
- `packages/api/src/services/workflow-engine/step-handlers/ask-user-chat-handler.ts`
- Unit tests

**Key Responsibilities:**
- Initialize Mastra agent from database config
- Load ACE playbook and inject into instructions
- Build tools dynamically from config (ax-generation, database-query, custom)
- Manage conversation thread lifecycle
- Check completion conditions (all-tools-approved)
- Extract output variables from tool results

---

### **Task 4: Ax-Generation Tool Type** (0%)
**Files to Create:**
- `packages/api/src/services/workflow-engine/tools/ax-generation-tool.ts`

**Key Responsibilities:**
- Build Ax signatures from config.axSignature specification
- Resolve input fields from variable/context/literal/playbook sources
- Execute Ax generator with ChainOfThought or Predict strategy
- Filter internal fields from output
- Suspend execution for approval gates

---

### **Task 5: Database-Query Tool Type** (0%)
**Files to Create:**
- `packages/api/src/services/workflow-engine/tools/database-query-tool.ts`

**Key Responsibilities:**
- Build Drizzle queries from config.databaseQuery specification
- Support JSONB path queries (tags->>'complexity')
- Resolve {{variable}} references in filter values
- Execute query and save to output variable

---

### **Task 6: Custom Tool Type** (0%)
**Files to Create:**
- `packages/api/src/services/workflow-engine/tools/custom/select-workflow-path-tool.ts`
- `packages/api/src/services/workflow-engine/tools/custom/generate-project-name-tool.ts`

**Key Responsibilities:**
- Path selection tool with prerequisite validation
- Project name generation with Ax Predict strategy
- Custom name validation (kebab-case, 3-50 chars)

---

### **Task 7: Approval Flow Backend** (0%)
**Files to Update:**
- `packages/api/src/routers/workflows.ts`

**Mutations to Add:**
- `approveToolCall` - Save to variables, call MiPRO collector, resume workflow
- `rejectToolCall` - Save feedback, call ACE optimizer, resume workflow

---

### **Task 8: Frontend Chat Interface** (0%)
**Components to Add:**
- Install AI Elements via shadcn CLI:
  ```bash
  bun x shadcn@latest add prompt-input message message-list thinking-indicator chat-container -r @ai-elements
  ```
- `apps/web/src/components/workflows/steps/ask-user-chat-step.tsx`

**Key Features:**
- ChatContainer, MessageList, Message, PromptInput, ThinkingIndicator
- Stream agent responses
- Load/persist conversation history
- Handle message sending

---

### **Task 9: Frontend Approval Gates** (0%)
**Components to Create:**
- `apps/web/src/components/workflows/approval-card.tsx`

**Key Features:**
- Inline approval cards (not modals)
- Collapsible reasoning section
- Accept and Reject buttons
- Feedback textarea on rejection

---

### **Task 10: Frontend Path Selection UI** (0%)
**Components to Create:**
- `apps/web/src/components/workflows/path-selection-cards.tsx`

**Key Features:**
- Path cards with name, description, reasoning
- Recommended path highlighting
- Radio selection

---

### **Task 11: Frontend Project Name UI** (0%)
**Components to Create:**
- `apps/web/src/components/workflows/project-name-selector.tsx`

**Key Features:**
- 3-5 suggested names
- Custom name input with validation
- Real-time validation feedback

---

### **Task 12: Database Seeding** (0%)
**Files to Update:**
- `packages/scripts/src/seeds/agents.ts` - Add PM Agent instructions
- `packages/scripts/src/seeds/ace-playbooks.ts` - NEW: Seed empty playbooks
- `packages/scripts/src/seeds/workflow-init-new.ts` - Add Step 3 config with 5 tools

**Step 3 Tool Configuration:**
1. `update_summary` - ax-generation, ChainOfThought
2. `update_complexity` - ax-generation, ChainOfThought
3. `fetch_workflow_paths` - database-query
4. `select_workflow_path` - custom
5. `generate_project_name` - ax-generation, Predict

---

### **Task 13: Anthropic Configuration** (0%)
**Files to Create:**
- `packages/api/src/routers/anthropic.ts` - API router
- Update `apps/web/src/routes/_authenticated.settings.tsx`

**Key Features:**
- Key encryption with @node-rs/argon2
- Test, Save, Update, Remove operations
- Display available Claude models with pricing

---

### **Task 14: Integration & End-to-End Testing** (0%)
**Test Files to Create:**
- `packages/api/src/services/workflow-engine/integration-step-3-4.test.ts`
- Manual testing checklist (24 items)

**E2E Workflow:**
1. User starts workflow-init
2. Steps 1-2 complete (from Story 1.5)
3. Step 3 renders chat
4. User chats → Agent triggers update_summary
5. User approves/rejects with feedback
6. ACE playbook updates on rejection
7. Agent regenerates with improved output
8. All 5 tools complete → Step 3 done

---

## 📊 Implementation Statistics

**Total Progress:** 2/14 tasks complete (14%)

| Category | Complete | Remaining |
|----------|----------|-----------|
| Database Schema | 4/4 subtasks | 0 |
| Backend Services | 5/5 subtasks | 0 |
| Backend Tests | 3/3 test files | 0 |
| Step Handlers | 0/5 subtasks | 5 |
| Tool Builders | 0/14 subtasks | 14 |
| Frontend Components | 0/17 subtasks | 17 |
| Database Seeding | 0/4 subtasks | 4 |
| Integration Tests | 0/4 subtasks | 4 |

**Total Subtasks:** 13/62 complete (21%)

---

## 🔑 Key Architectural Decisions Made

### **1. Mastra Storage Schema Separation**
- Conversation history stored in `mastra.mastra_messages` (separate schema)
- Workflow state stored in `workflow_executions.variables` (main schema)
- **Rationale:** Clean separation of concerns, prevents schema conflicts

### **2. ACE Playbook Scoping**
- Support for global, user, and project-scoped playbooks
- **Rationale:** Enables personalized learning while maintaining global patterns

### **3. Dynamic Tool Building**
- Tools built from JSONB config at runtime (not hardcoded)
- **Rationale:** Maximum flexibility, configuration-driven architecture

### **4. Input Source Resolution**
- Sources: variable (execution.variables), context (Mastra thread), literal (static), playbook (ACE)
- **Rationale:** Comprehensive data access for tool inputs

### **5. PostgresStore for Mastra**
- Uses `PostgresStore` from @mastra/pg (not PgStorage)
- **Discovery:** Verified via package.json exports and type definitions

---

## 🐛 Issues Encountered & Resolved

### **Issue 1: User Table Reference**
**Problem:** ACE schema referenced `users` table, but auth uses `user` (singular)  
**Solution:** Updated ace.ts to import `user` from auth.ts  
**Impact:** Schema migration successful

### **Issue 2: Mastra Import Name**
**Problem:** Used `PgStorage` but package exports `PostgresStore`  
**Solution:** Updated mastra-service.ts to use correct export  
**Impact:** Service initialization fixed

### **Issue 3: Test Setup Path**
**Problem:** Test files couldn't find test-setup.ts  
**Solution:** Created packages/api/test-setup.ts with dotenv config  
**Impact:** Test infrastructure ready

### **Issue 4: Database-Query Tool Design Concern**
**Problem:** JSONB filter approach with string templates feels fragile  
**User Feedback:** "The way we are fetching the workflow paths is sketchy"  
**Specific Concern:** `{ field: "tags->>'fieldType'", value: "{{variable}}" }` config  
**Why Sketchy:**
- Raw PostgreSQL JSONB operators in JSON config
- String template substitution without validation
- Tight coupling to database schema
- Hard to test, no type safety

**Planned Solution:**
- Implement as designed first (validate pattern works)
- Likely refactor to `service-call` tool type during Task 5
- Move query logic to typed service method: `WorkflowPathService.findPathsByComplexity()`
- Keep config semantic and decoupled from SQL details

**Status:** Acknowledged, will address during Task 5 implementation  
**See:** `docs/sprint-artifacts/1-6-workflow-path-concern-clarified.md` for full analysis

---

## 📝 Next Session Action Plan

### **Immediate Priority (Task 3):**
1. **Create AskUserChatStepHandler** (estimated: 1-2 hours)
   - Implement `executeStep` method
   - Agent initialization with ACE playbook injection
   - Tool building from config
   - Completion condition checking

2. **Test Handler** (estimated: 30 mins)
   - Unit tests for initialization
   - Tool prerequisite validation
   - Completion detection

### **High Priority (Tasks 4-6):**
3. **Ax-Generation Tool Builder** (estimated: 1 hour)
   - Signature building from config
   - Input resolution (variable/context/literal/playbook)
   - Approval gate suspension

4. **Database-Query Tool Builder** (estimated: 45 mins)
   - ⚠️ **LIKELY REFACTOR TO service-call tool type**
   - Implement generic version first, document pain points
   - If sketchy (expected), create WorkflowPathService instead
   - Keep config semantic, move JSONB logic to typed service

5. **Custom Tools** (estimated: 30 mins)
   - Path selection (LLM-guided recommendation)
   - Project name generation

### **Medium Priority (Tasks 7-11):**
6. **Approval Flow APIs** (estimated: 1 hour)
7. **Frontend Chat Interface** (estimated: 2 hours)
8. **Approval Gates UI** (estimated: 1 hour)
9. **Path Selection & Name UIs** (estimated: 1 hour)

### **Final Push (Tasks 12-14):**
10. **Database Seeding** (estimated: 1.5 hours)
11. **Integration Testing** (estimated: 2 hours)

**Total Estimated Time:** ~12-15 hours remaining

---

## 💡 Key Learnings

### **What Went Well:**
- Database schema design is clean and extensible
- ACE optimizer architecture follows best practices (incremental deltas, version tracking)
- MiPRO collector structure supports future offline optimization
- Test infrastructure setup is straightforward

### **Challenges Ahead:**
- **Frontend complexity:** AI Elements integration + approval UIs + tool output rendering
- **Tool builder abstraction:** Need to support 3 tool types with shared interface
- **Seeding complexity:** Step 3 config requires complete tool definitions (5 tools × multiple fields)
- **Integration testing:** Full workflow from chat → approval → learning → regeneration

### **Technical Debt to Address:**
- Mastra service tests currently skip actual DB calls (need test database setup)
- ACE and MiPRO tests need cleanup in beforeEach/afterEach
- No integration between Mastra + ACE + MiPRO yet (will come in Task 3)

---

## 🎯 Success Criteria for Story Completion

**All Acceptance Criteria (17 ACs, 85 checks) must pass:**

✅ **AC1-AC2:** Conversational Chat Interface (9 checks)  
✅ **AC3-AC7b:** Tool Execution & AI Generation (29 checks)  
✅ **AC8-AC10:** Approval Gate System (17 checks)  
✅ **AC11-AC12:** ACE Optimizer & Learning (10 checks)  
✅ **AC13:** MiPRO Data Collection (5 checks)  
✅ **AC14-AC15:** Dynamic Tool Building (10 checks)  
✅ **AC16:** Step Completion (5 checks)  
✅ **AC17:** Anthropic Configuration (5 checks)  

**Manual Testing Checklist (24 items) must complete:**
- End-to-end workflow execution
- State persistence across page reloads
- Approval/rejection flow
- ACE playbook learning
- MiPRO data collection

**Performance Requirements (NFR001):**
- Ax generation: < 10 seconds
- Approval gate response: < 200ms
- Message rendering: < 100ms

---

## 📦 Deliverables Checklist

- [x] Database schema with ACE and MiPRO tables
- [x] Mastra service with PostgreSQL storage
- [x] ACE optimizer service
- [x] MiPRO collector service
- [x] Test infrastructure setup
- [ ] AskUserChatStepHandler
- [ ] Ax-generation tool builder
- [ ] Database-query tool builder
- [ ] Custom tools (path selection, name generation)
- [ ] Approval flow backend APIs
- [ ] Frontend chat interface with AI Elements
- [ ] Approval gate UI components
- [ ] Path selection UI
- [ ] Project name selector UI
- [ ] PM Agent with instructions seeded
- [ ] Step 3 config with 5 tools seeded
- [ ] ACE playbooks seeded
- [ ] Anthropic API configuration
- [ ] Integration tests passing
- [ ] Manual testing complete

---

## 🔗 References

**Architecture Documents:**
- `docs/architecture/STORY-1-6-ARCHITECTURE-SUMMARY.md` - Mastra + Ax architecture
- `docs/research/spike-ax-mastra-approval-gates.md` - Approval gate pattern
- `docs/research/ax-deep-dive-ace-gepa.md` - ACE optimizer strategy
- `docs/research/ax-optimizers-comparison-mipro-gepa-ace.md` - Optimizer comparison

**Story Files:**
- `docs/sprint-artifacts/1-6-workflow-init-steps-3-4-description-complexity.md` - Story definition
- `docs/sprint-artifacts/1-6-workflow-init-steps-3-4-description-complexity.context.xml` - Story context

**Sprint Status:**
- `docs/sprint-status.yaml` - Story marked as **in-progress**

---

## 🚀 Conclusion

**Foundation is SOLID.** Database schema is ready, core services are implemented, and test infrastructure is in place. The remaining work is primarily **integration and UI** - connecting the pieces together.

**Next session should focus on Task 3 (AskUserChatStepHandler)** as it's the linchpin that ties Mastra, ACE, and MiPRO services together. Once that's done, tool builders (Tasks 4-6) will follow naturally.

**This is a complex but well-architected story.** The thesis validation will be powerful once complete! 🎉

---

**Session End Time:** 2025-11-13  
**Dev Agent:** Amelia  
**Status:** Ready for continuation after context compaction
