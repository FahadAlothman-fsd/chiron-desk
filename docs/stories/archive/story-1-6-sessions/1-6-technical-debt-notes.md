# Story 1.6 - Technical Debt & Design Concerns

**Date:** 2025-11-13  
**Status:** Noted for review during implementation

---

## ⚠️ Known Design Concerns

### 1. Database-Query Tool: Workflow Path Fetching

**Concern:** The JSONB filter approach for workflow paths feels sketchy and error-prone.

**Current Design:**
```typescript
{
  name: "fetch_workflow_paths",
  toolType: "database-query",
  databaseQuery: {
    table: "workflow_paths",
    filters: [
      { field: "tags->>'fieldType'", operator: "eq", value: "{{detected_field_type}}" },
      { field: "tags->>'complexity'", operator: "eq", value: "{{complexity_classification}}" }
    ]
  }
}
```

**Why it's sketchy:**
- JSONB path queries (`tags->>'fieldType'`) are fragile
- String template substitution (`{{variable}}`) can break easily
- No type safety or validation
- Complex error handling if filters don't match expected structure
- Unclear what happens if workflow_paths schema changes

**Alternatives to consider during implementation:**
1. **Direct method call:** Skip database-query tool type, just call a service method
2. **Stored procedure:** Move logic to database function
3. **Dedicated API endpoint:** POST /api/workflow-paths/search with typed request
4. **GraphQL-style query builder:** Type-safe query construction

**Decision:** Will revisit during Task 5 (Database-Query Tool Implementation)

---

### 2. Custom Tool Type: Unclear Purpose

**Concern:** Not sure what the "custom" tool type actually does or why we need it.

**Current Design:**
```typescript
{
  name: "select_workflow_path",
  toolType: "custom",
  customToolHandler: "select-workflow-path-tool"
}
```

**Questions:**
- Why not just use `ax-generation` to have the agent recommend a path?
- Why not use `database-query` if it's just selecting from results?
- What makes this "custom" vs the other tool types?
- Is this just a UI interaction (click a card)?

**AC6 says:**
> "Tool renders path cards in chat interface"
> "User clicks card to select path"

**This sounds like it's NOT a tool at all** - it's just:
1. Agent says: "I found these paths for you: [path1, path2, path3]"
2. Frontend renders cards
3. User clicks card
4. Selection saved to variable

**No LLM call needed, no database query needed - just UI interaction!**

**Alternatives to consider:**
1. **Remove "custom" tool type entirely** - make it a frontend interaction step
2. **Use existing ask-user step type** - "Which path do you want?"
3. **Just have agent present options** - user responds in chat "I want path 2"

**Decision:** Will revisit during Task 6 (Custom Tool Implementation)

---

## 🎯 Recommendation for Implementation

### Approach: "Implement, Learn, Refactor"

1. **Task 5 (Database-Query Tool):**
   - Implement as designed initially
   - **Test with real data**
   - Document pain points as we encounter them
   - **Pause and redesign** if it feels too fragile
   - Likely outcome: Replace with typed service method

2. **Task 6 (Custom Tools):**
   - **Start by questioning if we need it at all**
   - Review AC6 again: Is this actually a tool, or just UI?
   - If it's just "user clicks a card" → Make it a form input, not a tool
   - If it needs LLM reasoning → Use ax-generation instead
   - If it needs data fetching → Use database-query instead

3. **General Philosophy:**
   - ✅ Get something working first (validate the pattern)
   - ✅ Document friction points as they arise
   - ✅ Refactor when we understand the problem better
   - ❌ Don't over-engineer before we have working code

---

## 💡 Architectural Principles to Remember

### "Custom" Tool Type Red Flags:
If a tool can be implemented with `ax-generation` or `database-query`, it probably should be.

**Custom tools should only exist for:**
- Complex business logic that doesn't fit into "generate text" or "query database"
- Integration with external systems (APIs, file system, etc.)
- Multi-step operations that need custom orchestration

**If it's just "user picks an option from a list":**
- That's a **form input**, not a tool
- Use existing `ask-user` step type with `responseType: "choice"`

---

## 📝 Action Items for Continuation Session

**Before implementing Task 5:**
- [ ] Review workflow_paths table schema
- [ ] Sketch out alternative query approaches
- [ ] Prototype typed service method as alternative
- [ ] Choose best approach based on code clarity

**Before implementing Task 6:**
- [ ] Re-read AC6 acceptance criteria
- [ ] Determine if this is actually a tool or just UI
- [ ] If it's UI: Remove from tools array, make it a user input step
- [ ] If it's a tool: Identify what makes it "custom" vs ax-generation

**General:**
- [ ] Keep notes on pain points as they arise
- [ ] Don't be afraid to deviate from initial design if better approach emerges
- [ ] Prioritize code clarity and maintainability over "following the plan"

---

## ✅ Acceptance

**User Feedback:** "Let's go with it for now, but expect to change during implementation"

**Agreed!** This is exactly the right approach:
1. Implement as designed to validate the pattern
2. Learn where it breaks or feels awkward
3. Refactor based on real experience
4. Document learnings for future stories

**The schema foundation is solid** - the tool configuration approach might need refinement, and that's totally fine. We'll discover the right abstractions as we build.

---

**Documented By:** Amelia (Dev Agent)  
**Date:** 2025-11-13  
**Status:** ✅ Acknowledged - Will refine during implementation  
**Confidence:** We'll figure out the right design as we code! 🚀
