# Testing Dynamic Agent Registration Architecture

**Purpose:** Verify that the new dynamic agent registration system works correctly before deploying to production.

**Prerequisites:**
- Database running with migrations applied
- At least one active agent in the `agents` table (e.g., "athena")
- User with API key configured in `app_config` table

---

## Test Plan Overview

We'll test in this order:
1. **Server Startup** - Verify agents load from database
2. **Agent Registration** - Confirm agents are accessible via Mastra
3. **Dynamic Instructions** - Test real-time instruction updates
4. **Dynamic Model** - Verify user API key loading
5. **Conversation History** - Test automatic memory management
6. **ACE Playbooks** - Verify playbook injection

---

## Test 1: Server Startup & Agent Loading

### Goal
Verify that agents are loaded from database and registered with Mastra at server startup.

### Steps

1. **Check database has active agents:**
   ```bash
   cd /home/gondilf/Desktop/projects/masters/chiron
   bun run db:studio
   # Navigate to "agents" table
   # Verify at least one agent exists with active=true
   # Note the agent's "name" field (e.g., "athena")
   ```

2. **Start the server with logging:**
   ```bash
   cd apps/server
   bun run dev
   ```

3. **Watch the console output for:**
   ```
   [Agent Loader] Registered agent: athena
   [Agent Loader] Loaded 1 agents from database
   [Mastra] Storage initialized successfully
   [Mastra] Initialized with 1 registered agents
   ```

### Expected Result
✅ Server starts successfully  
✅ Console shows agents being loaded and registered  
✅ No errors in console

### Troubleshooting
❌ **"Agent Loader" logs not appearing:**
- Check `packages/api/src/services/mastra/agent-loader.ts` exists
- Check `packages/api/src/services/mastra/mastra-service.ts` imports `loadAllAgents`

❌ **"TypeError: Cannot read property 'name' of undefined":**
- Check `agents` table has at least one record with `active = true`
- Check agent record has a valid `name` field

---

## Test 2: Agent Registration Check

### Goal
Verify that registered agents can be retrieved from Mastra.

### Steps

1. **Create a test script:**
   ```bash
   cd /home/gondilf/Desktop/projects/masters/chiron
   touch test-agent-registration.ts
   ```

2. **Add this code to `test-agent-registration.ts`:**
   ```typescript
   import { getMastraInstance } from "./packages/api/src/services/mastra/mastra-service";
   
   async function testAgentRegistration() {
     console.log("🧪 Testing Agent Registration...\n");
     
     try {
       // Get Mastra instance
       const mastra = await getMastraInstance();
       console.log("✅ Mastra instance created\n");
       
       // Try to get agent by name (replace "athena" with your agent's name)
       const agent = mastra.getAgent("athena");
       
       if (agent) {
         console.log("✅ Agent retrieved successfully!");
         console.log("   Agent name:", agent.name);
         console.log("   Has memory:", !!agent.memory);
         console.log("   Has instructions:", typeof agent.instructions);
         console.log("   Has model:", typeof agent.model);
       } else {
         console.log("❌ Agent not found!");
         console.log("   This means the agent wasn't registered at startup.");
       }
       
     } catch (error) {
       console.error("❌ Error:", error);
     }
   }
   
   testAgentRegistration();
   ```

3. **Run the test:**
   ```bash
   bun run test-agent-registration.ts
   ```

### Expected Result
```
🧪 Testing Agent Registration...

✅ Mastra instance created

✅ Agent retrieved successfully!
   Agent name: athena
   Has memory: true
   Has instructions: function
   Has model: function
```

### Troubleshooting
❌ **"Agent not found!":**
- Agent name doesn't match database
- Check `agents.name` in database matches exactly
- Agent might have `active = false`

---

## Test 3: Dynamic Instructions Loading

### Goal
Verify that instructions are loaded from database on EVERY agent call, allowing real-time updates.

### Steps

1. **Note current instructions:**
   ```bash
   bun run db:studio
   # Open "agents" table
   # Find your agent (e.g., "athena")
   # Note the current "instructions" value
   ```

2. **Create test script:**
   ```bash
   touch test-dynamic-instructions.ts
   ```

3. **Add this code:**
   ```typescript
   import { getMastraInstance } from "./packages/api/src/services/mastra/mastra-service";
   import { RuntimeContext } from "@mastra/core";
   
   async function testDynamicInstructions() {
     console.log("🧪 Testing Dynamic Instructions...\n");
     
     const mastra = await getMastraInstance();
     const agent = mastra.getAgent("athena");
     
     if (!agent) {
       console.error("❌ Agent not found!");
       return;
     }
     
     // Create RuntimeContext (required for dynamic loading)
     const ctx = new RuntimeContext();
     ctx.set("userId", "test-user-123");
     ctx.set("agentId", "your-agent-uuid-here"); // Replace with actual UUID from database
     
     try {
       // Get instructions - this should trigger database load
       const instructions = await agent.getInstructions({ runtimeContext: ctx });
       
       console.log("✅ Instructions loaded successfully!");
       console.log("📝 Instructions preview:");
       console.log(instructions.substring(0, 200) + "...\n");
       
       console.log("💡 Now try this:");
       console.log("   1. Update the instructions in the database (via db:studio)");
       console.log("   2. Run this script again");
       console.log("   3. Verify the new instructions appear (no server restart needed!)");
       
     } catch (error) {
       console.error("❌ Error loading instructions:", error);
     }
   }
   
   testDynamicInstructions();
   ```

4. **Get your agent's UUID:**
   ```bash
   bun run db:studio
   # Find agent in "agents" table
   # Copy the "id" value (UUID)
   # Replace "your-agent-uuid-here" in script
   ```

5. **Run the test:**
   ```bash
   bun run test-dynamic-instructions.ts
   ```

6. **Test real-time updates:**
   - In Drizzle Studio, update the agent's instructions
   - Run the script again (without restarting server)
   - Verify new instructions appear

### Expected Result
```
🧪 Testing Dynamic Instructions...

✅ Instructions loaded successfully!
📝 Instructions preview:
You are Athena, a helpful project management assistant...

💡 Now try this:
   1. Update the instructions in the database
   2. Run this script again
   3. Verify the new instructions appear
```

After updating in DB:
```
✅ Instructions loaded successfully!
📝 Instructions preview:
You are Athena, an UPDATED project management assistant... ← NEW TEXT APPEARS
```

---

## Test 4: Dynamic Model with User API Key

### Goal
Verify that the model function loads the user's API key from the database.

### Steps

1. **Verify user has API key:**
   ```bash
   bun run db:studio
   # Open "app_config" table
   # Find a user record
   # Verify they have an encrypted API key (e.g., openrouterApiKey)
   # Note the userId
   ```

2. **Create test script:**
   ```bash
   touch test-dynamic-model.ts
   ```

3. **Add this code:**
   ```typescript
   import { getMastraInstance } from "./packages/api/src/services/mastra/mastra-service";
   import { RuntimeContext } from "@mastra/core";
   
   async function testDynamicModel() {
     console.log("🧪 Testing Dynamic Model Loading...\n");
     
     const mastra = await getMastraInstance();
     const agent = mastra.getAgent("athena");
     
     if (!agent) {
       console.error("❌ Agent not found!");
       return;
     }
     
     // Create RuntimeContext with REAL userId from database
     const ctx = new RuntimeContext();
     ctx.set("userId", "YOUR_USER_ID_HERE"); // Replace with actual user ID from app_config
     ctx.set("agentId", "YOUR_AGENT_UUID_HERE"); // Replace with agent UUID
     
     try {
       console.log("📡 Attempting to load model with user's API key...\n");
       
       // This should trigger:
       // 1. Load agent from DB
       // 2. Load user's encrypted API key from app_config
       // 3. Decrypt API key
       // 4. Create model instance
       
       const model = await agent.model({ runtimeContext: ctx });
       
       console.log("✅ Model loaded successfully!");
       console.log("   Model type:", typeof model);
       console.log("   This means user's API key was loaded and decrypted!\n");
       
     } catch (error: any) {
       console.error("❌ Error loading model:", error.message);
       console.error("\n🔍 Troubleshooting:");
       
       if (error.message.includes("User config not found")) {
         console.error("   → User doesn't exist in app_config table");
         console.error("   → Check userId in RuntimeContext matches database");
       } else if (error.message.includes("No API key found")) {
         console.error("   → User exists but has no API key for this provider");
         console.error("   → Check agent's llmProvider matches user's available keys");
       } else {
         console.error("   → Unexpected error:", error);
       }
     }
   }
   
   testDynamicModel();
   ```

4. **Replace placeholders:**
   - Get userId from `app_config` table
   - Get agentId from `agents` table
   - Update the script

5. **Run the test:**
   ```bash
   bun run test-dynamic-model.ts
   ```

### Expected Result
```
🧪 Testing Dynamic Model Loading...

📡 Attempting to load model with user's API key...

✅ Model loaded successfully!
   Model type: object
   This means user's API key was loaded and decrypted!
```

### Troubleshooting
❌ **"User config not found":**
- userId doesn't exist in `app_config` table
- Check the userId value is correct

❌ **"No API key found for provider: openrouter":**
- User exists but doesn't have API key for that provider
- Agent uses `llmProvider: openrouter` but user only has `anthropicApiKey`
- Add API key for user or change agent's provider

---

## Test 5: Conversation History (Full Integration)

### Goal
Verify that Mastra automatically manages conversation history when using registered agents.

### Steps

1. **Ensure prerequisites:**
   - Server running (`bun run dev` in apps/server)
   - User logged in with API key configured
   - Agent exists and is active

2. **Start a workflow with chat step:**
   - Open Chiron UI in browser
   - Navigate to project initialization workflow
   - Reach the chat step (Step 3)

3. **Test conversation continuity:**
   
   **Message 1:**
   ```
   User: "My favorite color is blue"
   ```
   Expected: Athena acknowledges

   **Message 2:**
   ```
   User: "What's my favorite color?"
   ```
   Expected: Athena says "blue" ✅

   **Message 3:**
   ```
   User: "And I want to build a web app"
   ```
   Expected: Athena acknowledges

   **Message 4:**
   ```
   User: "What did I say I want to build?"
   ```
   Expected: Athena says "web app" ✅

4. **Verify in database:**
   ```bash
   bun run db:studio
   # Check "mastra"."messages" table
   # Should see all 4 messages with same threadId
   ```

5. **Test persistence across page refresh:**
   - Refresh the browser page
   - Send another message: "Summarize our conversation"
   - Athena should remember ALL previous messages ✅

### Expected Result
✅ Athena remembers conversation context  
✅ Can reference previous messages  
✅ History persists across page refreshes  
✅ Messages visible in mastra.messages table

### Troubleshooting
❌ **Athena doesn't remember previous messages:**

**Check 1: Thread ID persistence**
```sql
-- In db:studio or psql
SELECT variables FROM workflow_executions 
WHERE id = 'your-execution-id';

-- Should contain: { "mastra_thread_id": "thread-..." }
```

❌ **Messages not in database:**
```sql
-- Check mastra schema exists
SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'mastra';

-- Check messages table
SELECT * FROM mastra.messages ORDER BY "createdAt" DESC LIMIT 10;
```

❌ **Still not working:**
- Check server console for errors
- Look for `[AskUserChatHandler]` logs
- Verify agent.generate() is being called with `memory: { thread, resource }`

---

## Test 6: ACE Playbook Injection

### Goal
Verify that ACE playbooks are dynamically injected into agent instructions based on scope.

### Steps

1. **Create a test ACE playbook:**
   ```bash
   bun run db:studio
   # Open "ace_playbooks" table
   # Click "Add Row"
   # Fill in:
   #   - agentId: <your-agent-uuid>
   #   - scope: "global"
   #   - playbook: {
   #       "sections": {
   #         "Test Section": {
   #           "bullets": [
   #             "Always mention this is a TEST playbook",
   #             "Say 'ACE playbook is working!' in your response"
   #           ]
   #         }
   #       }
   #     }
   # Save
   ```

2. **Send a message to the agent:**
   - In Chiron UI, send any message
   - Check if Athena's response includes "ACE playbook is working!"

3. **Verify playbook was injected:**
   ```typescript
   // Create test-ace-playbooks.ts
   import { getMastraInstance } from "./packages/api/src/services/mastra/mastra-service";
   import { RuntimeContext } from "@mastra/core";
   
   async function testACEPlaybooks() {
     const mastra = await getMastraInstance();
     const agent = mastra.getAgent("athena");
     
     const ctx = new RuntimeContext();
     ctx.set("userId", "test-user");
     ctx.set("agentId", "your-agent-uuid");
     
     const instructions = await agent.getInstructions({ runtimeContext: ctx });
     
     if (instructions.includes("ACE Context")) {
       console.log("✅ ACE playbooks are being injected!");
       console.log("\nPlaybook section found in instructions:");
       const aceSection = instructions.split("ACE Context")[1]?.substring(0, 300);
       console.log(aceSection);
     } else {
       console.log("❌ ACE playbooks not found in instructions");
     }
   }
   
   testACEPlaybooks();
   ```

4. **Run the test:**
   ```bash
   bun run test-ace-playbooks.ts
   ```

### Expected Result
```
✅ ACE playbooks are being injected!

Playbook section found in instructions:
 (Learned Patterns)

### Global Scope

**Test Section:**
- Always mention this is a TEST playbook
- Say 'ACE playbook is working!' in your response
```

---

## Quick Integration Test

If you want to test everything at once:

```bash
# 1. Start server
cd apps/server && bun run dev

# 2. In another terminal, watch logs
tail -f <path-to-server-logs>

# 3. In Chiron UI:
#    - Start workflow
#    - Send message: "Hello!"
#    - Check response
#    - Send message: "What did I just say?"
#    - Check if it remembers "Hello!"

# If it remembers → ✅ Everything working!
# If it doesn't → Go through individual tests above
```

---

## Success Criteria

All tests passing means:

✅ Agents load from database at startup  
✅ Agents registered with Mastra and retrievable  
✅ Instructions load dynamically from DB (real-time updates)  
✅ User API keys load and decrypt correctly  
✅ Conversation history persists automatically  
✅ ACE playbooks inject into instructions  
✅ No server restart needed for config changes  

---

## Next Steps After Testing

If tests pass:
1. Remove test scripts (or move to `scripts/` folder)
2. Deploy to staging environment
3. Monitor production logs for errors
4. Implement caching layer (future optimization)

If tests fail:
1. Check troubleshooting sections above
2. Review server logs for errors
3. Verify database schema is up-to-date
4. Ask for help with specific error messages
