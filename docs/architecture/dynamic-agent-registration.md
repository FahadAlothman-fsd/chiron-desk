# Dynamic Agent Registration Architecture

**Status:** Implemented  
**Date:** 2025-01-14  
**Story:** 1.6 - Workflow Initialization Step 3 (Chat Interface)

## Overview

Chiron implements a hybrid approach to Mastra agent management that combines the benefits of agent registration (automatic memory management) with database-driven configuration (runtime updates without server restarts).

## Architecture Decision

### The Problem

We faced a critical architectural decision:

**Option A: Dynamic Agent Creation (Original)**
- Create agents on-demand in step handlers
- Configuration loaded from database per-request
- ❌ Manual conversation history loading required
- ❌ Mastra memory features not automatically available
- ✅ Database updates take effect immediately

**Option B: Static Agent Registration (Mastra Standard)**
- Register agents at Mastra startup
- Configuration baked-in at initialization time
- ✅ Automatic conversation history via Mastra memory
- ✅ Full Mastra feature access (tracing, logging, telemetry)
- ❌ Requires server restart for configuration updates

**Option C: Dynamic Registration (Hybrid - CHOSEN)**
- Register agents at Mastra startup
- Configuration loaded dynamically via `runtimeContext` on EVERY call
- ✅ Automatic conversation history via Mastra memory
- ✅ Full Mastra feature access
- ✅ Database updates take effect immediately (no restart)
- ✅ User-specific API keys loaded per-request

### The Solution: RuntimeContext

Mastra supports dynamic agent behavior through `RuntimeContext`, a dependency injection mechanism that allows agent properties to be functions:

```typescript
export type DynamicArgument<T> = T | (({ runtimeContext, mastra }: {
    runtimeContext: RuntimeContext;
    mastra?: Mastra;
}) => Promise<T> | T);
```

This means:
- **Instructions** can be a function that loads from database
- **Model** can be a function that loads user's API key
- **Tools** can be a function that loads tool configurations

---

## Implementation

### 1. Agent Loader (`packages/api/src/services/mastra/agent-loader.ts`)

**Purpose:** Creates Mastra agents with database-driven dynamic configuration

**Key Functions:**

#### `createDynamicAgent(agentRecord)`
Creates a Mastra `Agent` instance with all properties as dynamic functions:

```typescript
return new Agent({
  name: agentRecord.name,
  
  // Dynamic instructions - loaded from DB with ACE playbooks
  instructions: async ({ runtimeContext }) => {
    const userId = runtimeContext.get("userId");
    const projectId = runtimeContext.get("projectId");
    
    // 1. Load base instructions from database
    const agent = await loadAgentFromDB(agentId);
    
    // 2. Load ACE playbooks (global, user-scoped, project-scoped)
    const playbooks = await loadACEPlaybooks(agentId, userId, projectId);
    
    // 3. Inject ACE into instructions
    return injectACEPlaybooks(agent.instructions, playbooks);
  },
  
  // Dynamic model - loads user's API key per-request
  model: async ({ runtimeContext }) => {
    const userId = runtimeContext.get("userId");
    
    // 1. Load agent model configuration from DB
    // 2. Load user's encrypted API key from app_config table
    // 3. Decrypt API key
    // 4. Create model instance with user's key
    return await loadModelWithUserKey(agentId, userId);
  },
  
  // Dynamic tools - loads from DB (placeholder for now)
  tools: async ({ runtimeContext }) => {
    return await loadTools(agentId);
  },
  
  // Memory - uses shared Mastra storage
  memory: new Memory({
    options: {
      lastMessages: 50,
      threads: { generateTitle: true }
    }
  })
});
```

#### `loadAllAgents()`
Queries the `agents` table for all active agents and creates dynamic `Agent` instances:

```typescript
const agentRecords = await db
  .select()
  .from(agents)
  .where(eq(agents.active, true));

const mastraAgents: Record<string, Agent> = {};

for (const record of agentRecords) {
  mastraAgents[record.name] = createDynamicAgent(record);
}

return mastraAgents;
```

---

### 2. Mastra Service (`packages/api/src/services/mastra/mastra-service.ts`)

**Purpose:** Singleton Mastra instance with registered agents

**Updated `getMastraInstance()`:**

```typescript
export async function getMastraInstance(): Promise<Mastra> {
  if (!mastraInstance) {
    // 1. Initialize PostgreSQL storage
    const storage = new PostgresStore({
      connectionString: process.env.DATABASE_URL,
      schemaName: "mastra",
    });
    
    // 2. Load all active agents from database
    const agents = await loadAllAgents();
    
    // 3. Create Mastra instance with storage AND agents
    mastraInstance = new Mastra({
      storage,
      agents,  // ← Agents are registered here!
    });
    
    await storage.init();
  }
  
  return mastraInstance;
}
```

**Key Points:**
- Called once at server startup
- Loads ALL active agents from database
- Registers them with Mastra
- Agents' configuration is still dynamic (loaded on each call)

---

### 3. Step Handler (`packages/api/src/services/workflow-engine/step-handlers/ask-user-chat-handler.ts`)

**Purpose:** Uses registered agents with `RuntimeContext` for dynamic behavior

**Updated Flow:**

```typescript
// 1. Get registered agent from Mastra
const mastra = await getMastraInstance();
const [agentRecord] = await db
  .select()
  .from(agents)
  .where(eq(agents.id, config.agentId));

const agent = mastra.getAgent(agentRecord.name);

// 2. Create RuntimeContext with required data
const runtimeContext = new RuntimeContext();
runtimeContext.set("userId", context.systemVariables.current_user_id);
runtimeContext.set("agentId", config.agentId);
runtimeContext.set("projectId", context.variables.project_id);
runtimeContext.set("variables", context.variables);

// 3. Call agent with RuntimeContext
const result = await agent.generate(String(userInput), {
  memory: {
    thread: threadId,
    resource: `user-${userId}`,
  },
  runtimeContext,  // ← Triggers dynamic loading!
  maxSteps: 5,
});

// 4. Mastra automatically saves messages (no manual saving!)
```

**What Changed:**
- ❌ **Removed:** Dynamic agent creation in `initializeAgent()`
- ❌ **Removed:** Manual API key loading
- ❌ **Removed:** Manual ACE playbook injection
- ❌ **Removed:** Manual memory configuration
- ❌ **Removed:** Manual message saving to storage
- ✅ **Added:** `mastra.getAgent()` to retrieve registered agent
- ✅ **Added:** `RuntimeContext` for dynamic configuration
- ✅ **Simplified:** Thread management only (agent creation handled at startup)

---

## Data Flow

### At Server Startup:

```
1. Server starts
   ↓
2. getMastraInstance() called
   ↓
3. loadAllAgents() queries agents table
   ↓
4. createDynamicAgent() for each active agent
   ↓
5. Agents registered with Mastra instance
   ↓
6. Server ready
```

### On Each Agent Call:

```
1. User sends message to workflow
   ↓
2. ask-user-chat-handler.executeStep()
   ↓
3. mastra.getAgent(agentName) retrieves registered agent
   ↓
4. Create RuntimeContext with userId, projectId, variables
   ↓
5. agent.generate(message, { memory, runtimeContext })
   ↓
6. Mastra calls agent.instructions function
   ├─> Loads agent from DB
   ├─> Loads ACE playbooks (global/user/project scope)
   └─> Returns interpolated instructions
   ↓
7. Mastra calls agent.model function
   ├─> Loads agent model config from DB
   ├─> Loads user's API key from app_config
   ├─> Decrypts API key
   └─> Returns model instance
   ↓
8. Mastra calls agent.tools function
   └─> Returns tools (placeholder - empty for now)
   ↓
9. Mastra automatically loads conversation history
   ├─> Uses memory: { thread, resource } parameter
   ├─> Queries mastra.messages table
   └─> Includes last 50 messages in context
   ↓
10. LLM generates response
   ↓
11. Mastra automatically saves messages
    ├─> User message saved to mastra.messages
    └─> Assistant response saved to mastra.messages
   ↓
12. Response returned to frontend
```

---

## Benefits

### 1. **Real-time Configuration Updates**

**Scenario:** User updates Athena's instructions in the UI

**Before (Static Registration):**
```
User updates instructions in DB
  ↓
❌ Agent still uses old instructions
  ↓
Server restart required
```

**After (Dynamic Registration):**
```
User updates instructions in DB
  ↓
Next agent.generate() call
  ↓
instructions function queries DB
  ↓
✅ New instructions loaded immediately
```

### 2. **ACE Playbook Scoping**

**Scenario:** Project-specific ACE playbooks

```
agent.generate() called with runtimeContext
  ↓
instructions function receives:
  - userId: "user-123"
  - projectId: "project-456"
  ↓
loadACEPlaybooks() queries with scope:
  - global: applies to all
  - user: applies only to user-123
  - project: applies only to project-456
  ↓
All applicable playbooks injected
```

### 3. **Per-User API Keys**

**Scenario:** Multi-tenant with user-owned API keys

```
agent.generate() called with runtimeContext
  ↓
model function receives:
  - userId: "user-123"
  ↓
loadModelWithUserKey() queries app_config:
  - WHERE userId = "user-123"
  ↓
Decrypts user's OpenRouter API key
  ↓
Creates model instance with user's key
  ↓
✅ User is billed, not Chiron
```

### 4. **Automatic Conversation History**

**Before (Manual Loading):**
```typescript
// Load messages manually
const messages = await storage.getMessages({ threadId });

// Convert to agent format
const formattedMessages = messages.map(m => ({
  role: m.role,
  content: m.content[0]?.text
}));

// Pass to agent
const result = await agent.generate(formattedMessages);

// Save response manually
await storage.saveMessages({
  messages: [{ role: "assistant", content: result.text, ...}]
});
```

**After (Automatic):**
```typescript
// Just pass memory params - Mastra handles everything!
const result = await agent.generate(userInput, {
  memory: {
    thread: threadId,
    resource: `user-${userId}`
  },
  runtimeContext
});
```

---

## Performance Considerations

### Database Query Impact

**Concern:** Every `agent.generate()` call now makes 3-4 database queries (instructions, model, ACE playbooks, user config).

**Mitigation Strategy (Future):**

1. **In-Memory Caching with TTL**
   ```typescript
   const agentCache = new Map<string, {
     instructions: string,
     model: ModelConfig,
     expiresAt: Date
   }>();
   
   async function loadInstructions({ agentId }) {
     const cached = agentCache.get(agentId);
     if (cached && cached.expiresAt > new Date()) {
       return cached.instructions;
     }
     
     // Load from DB
     const instructions = await loadFromDB(agentId);
     
     // Cache for 5 minutes
     agentCache.set(agentId, {
       instructions,
       expiresAt: new Date(Date.now() + 5 * 60 * 1000)
     });
     
     return instructions;
   }
   ```

2. **Cache Invalidation on Update**
   - When user updates agent config in UI
   - Broadcast cache invalidation event
   - All server instances clear cache for that agent

3. **Batch Loading**
   - Load agent config + ACE playbooks + user config in single transaction
   - Reduce round-trips

**Current State:** No caching implemented. Acceptable for MVP given low request volume. Monitor query performance in production.

---

## Testing

### Manual Test Checklist

- [ ] **Conversation History**
  - Start new workflow → send message → verify Athena responds
  - Send follow-up message → verify Athena remembers context
  - Refresh page → send another message → verify history persists

- [ ] **Instruction Updates**
  - Update agent instructions in database
  - Send message to agent
  - Verify new instructions are used (no restart)

- [ ] **ACE Playbooks**
  - Create global ACE playbook for agent
  - Send message → verify playbook is injected
  - Create user-scoped playbook
  - Send message → verify both global and user playbooks are injected

- [ ] **User API Keys**
  - Set user's OpenRouter API key in app_config
  - Send message → verify user's key is used
  - Check OpenRouter logs → confirm usage attributed to user's key

- [ ] **Multi-Agent**
  - Workflow with multiple agents
  - Verify each agent loads its own configuration
  - Verify separate conversation threads per agent

---

## Troubleshooting

### "Agent not registered with Mastra"

**Cause:** Agent not loaded from database at startup

**Fix:**
1. Check agent exists in `agents` table with `active = true`
2. Check agent name matches exactly
3. Restart server to reload agents
4. Check server logs for `[Agent Loader] Registered agent: {name}`

### "userId is required in runtimeContext"

**Cause:** `RuntimeContext` not populated with userId

**Fix:**
```typescript
const runtimeContext = new RuntimeContext();
runtimeContext.set("userId", context.systemVariables.current_user_id);
// Must set userId before calling agent.generate()
```

### "No API key found for provider"

**Cause:** User doesn't have API key configured for the agent's LLM provider

**Fix:**
1. Check `app_config` table for user's encrypted API key
2. Verify provider matches agent's `llm_provider` (openrouter, anthropic, openai)
3. User must configure API key in settings

### "Conversation history not working"

**Possible Causes:**
1. **Thread ID not persisting**
   - Check `workflow_executions.variables` has `mastra_thread_id`
   - Verify thread ID saved on first message

2. **Wrong resource ID**
   - Must use same resource ID for all calls
   - Format: `user-{userId}`

3. **Agent not registered**
   - Mastra only auto-loads history for registered agents
   - Verify agent loaded at startup

---

## Future Enhancements

1. **Dynamic Tool Loading**
   - Currently tools return empty object
   - Implement tool building from database tool configs
   - Load AX generation tools, database query tools, custom tools

2. **Hot Reload of Agent Registry**
   - Listen for database changes (pg_notify)
   - Reload specific agent when configuration changes
   - No full server restart required

3. **Caching Layer**
   - Implement in-memory cache with TTL
   - Cache invalidation on updates
   - Reduce database query load

4. **Performance Monitoring**
   - Track database query times
   - Monitor memory usage
   - Alert on slow agent calls

5. **Agent Versioning**
   - Track agent configuration versions
   - Allow rollback to previous configurations
   - A/B testing of different agent instructions

---

## Related Documentation

- [Story 1.6 Architecture Summary](./STORY-1-6-ARCHITECTURE-SUMMARY.md)
- [Mastra Documentation](https://mastra.ai/docs)
- [Mastra Memory Guide](https://mastra.ai/docs/memory/overview)
- [Mastra RuntimeContext Guide](https://mastra.ai/docs/server-db/runtime-context)

---

## Summary

Chiron implements a sophisticated hybrid approach to Mastra agent management:

- **Agents registered at startup** → Full Mastra features (automatic memory, tracing, logging)
- **Configuration loaded dynamically** → Real-time updates without restart
- **User-specific behavior** → Per-user API keys, scoped ACE playbooks
- **Database-driven** → All configuration in PostgreSQL, easy to update via UI

This architecture provides the best of both worlds: the power of Mastra's agent framework with the flexibility of database-driven configuration.
