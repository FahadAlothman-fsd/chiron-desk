# OpenCode + Chiron Integration Research

## Overview

This document outlines the integration strategy between **Chiron** (workflow orchestration, UI, database) and **OpenCode** (code implementation, file operations, agent execution).

---

## BMAD Epic/Story Workflow Patterns

Based on BMAD methodology, here are the key workflow patterns for epic and story creation:

### Epic Creation Workflow

| Step | Action | Validation |
|------|--------|------------|
| 1 | Provide context (PRD, project brief, discussions) | - |
| 2 | Validate epic completeness | Score ≥ 80% required |
| 3 | Generate story list from epic | AI-assisted breakdown |
| 4 | Review and finalize | Human approval |

### Story Creation Workflow

| Step | Action | Output |
|------|--------|--------|
| 1 | Provide context (epic, related stories) | Story scaffold |
| 2 | Generate detailed content | User story, acceptance criteria |
| 3 | Generate testing strategy | Gherkin scenarios |
| 4 | Review and finalize | Complete story document |

### Key BMAD Principles for Chiron

1. **Validation Gates**: Each major artifact (epic, story) requires completeness validation before proceeding
2. **Context Accumulation**: Later steps build on earlier artifacts (PRD → Epic → Story)
3. **Human-in-the-Loop**: Critical decisions require explicit user approval
4. **Structured Output**: Stories follow templates with user story format, acceptance criteria, and Gherkin scenarios

### Division of Responsibilities

| Chiron | OpenCode |
|--------|----------|
| Workflow orchestration | Code implementation |
| `ask-user-chat` for user interaction | File reading/writing |
| Database operations (epics, stories) | Codebase exploration |
| Approval workflows | Agent execution |
| UI/UX | Bash commands |
| Step-based execution | Multi-agent coordination |

---

## OpenCode SDK Overview

**Package**: `@opencode-ai/sdk`

### Installation
```bash
npm install @opencode-ai/sdk
```

### Client Creation

**Start server + client:**
```typescript
import { createOpencode } from "@opencode-ai/sdk"
const { client } = await createOpencode({
  hostname: "127.0.0.1",
  port: 4096,
  config: {
    model: "anthropic/claude-3-5-sonnet-20241022",
  },
})
```

**Client only (connect to existing server):**
```typescript
import { createOpencodeClient } from "@opencode-ai/sdk"
const client = createOpencodeClient({
  baseUrl: "http://localhost:4096",
})
```

---

## Key SDK APIs for Chiron Integration

### Session Management
```typescript
// Create session
const session = await client.session.create({
  body: { title: "Epic Implementation" },
})

// Send prompt and get AI response
const result = await client.session.prompt({
  path: { id: session.id },
  body: {
    model: { providerID: "anthropic", modelID: "claude-3-5-sonnet-20241022" },
    parts: [{ type: "text", text: "Implement the user authentication feature" }],
  },
})

// Inject context without triggering AI response (useful for setup)
await client.session.prompt({
  path: { id: session.id },
  body: {
    noReply: true,
    parts: [{ type: "text", text: "Here is the story context: ..." }],
  },
})

// Get messages from session
const messages = await client.session.messages({ path: { id: session.id } })

// Abort running session
await client.session.abort({ path: { id: session.id } })
```

### File Operations
```typescript
// Search for text in files
const textResults = await client.find.text({
  query: { pattern: "function.*authenticate" },
})

// Find files by name
const files = await client.find.files({
  query: { query: "*.ts" },
})

// Find workspace symbols
const symbols = await client.find.symbols({
  query: { query: "UserService" },
})

// Read a file
const content = await client.file.read({
  query: { path: "src/auth/service.ts" },
})

// Get status for tracked files
const status = await client.file.status()
```

### Agent Management
```typescript
// List available agents
const agents = await client.app.agents()

// Agents can be invoked via @ mention in prompts
await client.session.prompt({
  path: { id: session.id },
  body: {
    parts: [{ type: "text", text: "@explore find all authentication related files" }],
  },
})
```

### Event Streaming
```typescript
// Listen to real-time events
const events = await client.event.subscribe()
for await (const event of events.stream) {
  console.log("Event:", event.type, event.properties)
}
```

---

## OpenCode Agent Types

### Primary Agents (Tab to switch)
- **Build**: Default agent with all tools enabled (write, edit, bash)
- **Plan**: Restricted agent for analysis (no writes, asks for permission)

### Subagents (invoke via @mention)
- **General**: Multi-step research and task execution
- **Explore**: Fast codebase exploration (find files, search code)

### Custom Agent Configuration
```json
// opencode.json
{
  "agent": {
    "story-implementer": {
      "description": "Implements user stories following Gherkin scenarios",
      "mode": "primary",
      "model": "anthropic/claude-sonnet-4-20250514",
      "prompt": "{file:./prompts/story-implementation.txt}",
      "tools": {
        "write": true,
        "edit": true,
        "bash": true
      },
      "permission": {
        "edit": "ask",
        "bash": {
          "git push": "deny",
          "*": "allow"
        }
      }
    }
  }
}
```

---

## Chiron + OpenCode Integration Patterns

### Pattern 1: Epic/Story Creation (Chiron-led)

```
┌─────────────────────────────────────────────────────────────┐
│                      CHIRON WORKFLOW                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Step 1: ask-user-chat                                      │
│  ├── Gather business requirements from user                 │
│  ├── Chiron agent asks clarifying questions                 │
│  └── User approves requirements analysis                    │
│                                                             │
│  Step 2: ask-user-chat + OpenCode                          │
│  ├── Chiron invokes OpenCode SDK                           │
│  │   └── client.find.files() - find related code           │
│  │   └── client.file.read() - understand existing patterns │
│  ├── Generate epic/story structure                          │
│  └── User approves epic/story                               │
│                                                             │
│  Step 3: execute-action                                     │
│  └── Save to Chiron database                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Pattern 2: Story Implementation (OpenCode-led)

```
┌─────────────────────────────────────────────────────────────┐
│                      CHIRON WORKFLOW                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Step 1: ask-user-chat                                      │
│  ├── Load story from database                               │
│  ├── Present implementation plan to user                    │
│  └── User approves plan                                     │
│                                                             │
│  Step 2: execute-action (OpenCode orchestration)            │
│  ├── Create OpenCode session                                │
│  │   const session = await client.session.create()          │
│  │                                                          │
│  ├── Inject story context (noReply: true)                   │
│  │   await client.session.prompt({                          │
│  │     body: {                                              │
│  │       noReply: true,                                     │
│  │       parts: [{ text: storyContext }]                    │
│  │     }                                                    │
│  │   })                                                     │
│  │                                                          │
│  ├── Execute implementation                                 │
│  │   const result = await client.session.prompt({           │
│  │     body: {                                              │
│  │       parts: [{                                          │
│  │         text: "Implement this story following the        │
│  │                Gherkin scenarios..."                     │
│  │       }]                                                 │
│  │     }                                                    │
│  │   })                                                     │
│  │                                                          │
│  └── Stream events for progress                             │
│      const events = await client.event.subscribe()          │
│                                                             │
│  Step 3: ask-user-chat                                      │
│  ├── Present implementation results                         │
│  ├── Show test results                                      │
│  └── User approves or requests changes                      │
│                                                             │
│  Step 4: execute-action                                     │
│  └── Update story status in database                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Pattern 3: Hybrid Exploration (Both)

```typescript
// Chiron workflow step using OpenCode for codebase exploration
async function exploreCodebaseForStory(storyId: string) {
  const story = await db.query.stories.findFirst({ where: eq(stories.id, storyId) });
  
  // Create OpenCode session for exploration
  const { client } = await createOpencode();
  const session = await client.session.create({ body: { title: `Explore: ${story.title}` } });
  
  // Use @explore subagent for fast codebase analysis
  const exploration = await client.session.prompt({
    path: { id: session.id },
    body: {
      parts: [{
        type: "text",
        text: `@explore Find all files related to: ${story.user_story}
               Look for:
               - Existing similar implementations
               - Related database schemas
               - API endpoints that might be affected
               - Test files that need updates`
      }]
    }
  });
  
  return exploration;
}
```

---

## Implementation Recommendations

### 1. Create OpenCode Service in Chiron

```typescript
// packages/api/src/services/opencode.service.ts
import { createOpencode, createOpencodeClient } from "@opencode-ai/sdk";

export class OpenCodeService {
  private client: ReturnType<typeof createOpencodeClient>;
  
  async initialize() {
    const { client } = await createOpencode({
      port: 4096,
      config: {
        model: "anthropic/claude-sonnet-4-20250514",
      }
    });
    this.client = client;
  }
  
  async createImplementationSession(story: Story) {
    const session = await this.client.session.create({
      body: { title: `Implement: ${story.title}` }
    });
    
    // Inject story context
    await this.client.session.prompt({
      path: { id: session.id },
      body: {
        noReply: true,
        parts: [{
          type: "text",
          text: this.buildStoryContext(story)
        }]
      }
    });
    
    return session;
  }
  
  async executeImplementation(sessionId: string, instructions: string) {
    return this.client.session.prompt({
      path: { id: sessionId },
      body: {
        parts: [{ type: "text", text: instructions }]
      }
    });
  }
  
  async exploreCodebase(query: string) {
    return this.client.find.text({ query: { pattern: query } });
  }
  
  async readFile(path: string) {
    return this.client.file.read({ query: { path } });
  }
}
```

### 2. Custom OpenCode Agent for Chiron

```markdown
---
description: Implements user stories from Chiron workflow system
mode: primary
model: anthropic/claude-sonnet-4-20250514
temperature: 0.2
tools:
  write: true
  edit: true
  bash: true
permission:
  edit: ask
  bash:
    "npm test": allow
    "npm run build": allow
    "git add": allow
    "git commit": allow
    "git push": deny
    "*": ask
---

You are a story implementation agent working within the Chiron workflow system.

## Your Role
- Implement user stories following the provided Gherkin scenarios
- Write clean, tested code that follows project conventions
- Create appropriate tests for each acceptance criterion

## Implementation Process
1. Analyze the story and Gherkin scenarios
2. Use @explore to understand the existing codebase
3. Plan the implementation approach
4. Implement the feature incrementally
5. Write tests for each scenario
6. Run tests and fix any issues

## Quality Standards
- Follow existing code patterns in the project
- Ensure all Gherkin scenarios are covered by tests
- Write clear commit messages
- Document any architectural decisions
```

### 3. Workflow Step Type for OpenCode

```typescript
// New step type in Chiron schema
export const OpenCodeStepConfigSchema = z.object({
  sessionConfig: z.object({
    title: z.string(),
    agent: z.string().optional(), // e.g., "story-implementer"
    model: z.string().optional(),
  }),
  contextInjection: z.object({
    variables: z.array(z.string()), // Variables to inject as context
    noReply: z.boolean().default(true),
  }),
  prompt: z.string(), // The implementation prompt
  streamEvents: z.boolean().default(true),
  outputVariables: z.record(z.string()),
});
```

---

## Next Steps

1. **Add OpenCode SDK** to Chiron dependencies
2. **Create OpenCodeService** in packages/api
3. **Define custom agents** for story implementation
4. **Implement workflow steps** that orchestrate OpenCode
5. **Build event streaming** for real-time progress in UI
6. **Test integration** with simple story implementation

---

---

## Complete SDK API Reference (from source)

### Core Classes

| Class | Purpose | Key Methods |
|-------|---------|-------------|
| `Session` | Manage AI conversations | `create()`, `prompt()`, `promptAsync()`, `abort()`, `messages()`, `fork()`, `revert()` |
| `File` | File operations | `read()`, `list()`, `status()` |
| `Find` | Search codebase | `text()`, `files()`, `symbols()` |
| `App` | System info | `agents()`, `log()` |
| `Permission` | Handle tool permissions | `respond()` |
| `Vcs` | Git integration | `get()` |
| `Pty` | Terminal emulation | `create()`, `connect()`, `list()` |
| `Config` | Settings | `get()`, `update()`, `providers()` |
| `Project` | Project management | `list()`, `current()`, `update()` |

### Session.prompt() - The Core API

```typescript
client.session.prompt({
  sessionID: string,           // Required: Session ID
  directory?: string,          // Working directory
  messageID?: string,          // Optional: Reply to specific message
  model?: {
    providerID: string,        // e.g., "anthropic"
    modelID: string            // e.g., "claude-sonnet-4-20250514"
  },
  agent?: string,              // Agent to use (e.g., "build", "plan")
  noReply?: boolean,           // TRUE = inject context without AI response
  tools?: {                    // Enable/disable specific tools
    [key: string]: boolean
  },
  system?: string,             // System prompt override
  parts?: Array<               // Message content
    | TextPartInput            // { type: "text", text: string }
    | FilePartInput            // { type: "file", path: string }
    | AgentPartInput           // { type: "agent", agent: string }
    | SubtaskPartInput         // { type: "subtask", ... }
  >
})
```

### Key Integration Patterns for Chiron

#### 1. Context Injection (noReply: true)
```typescript
// Inject story/epic context without triggering AI response
await client.session.prompt({
  sessionID,
  noReply: true,  // <-- Key: Don't generate response
  parts: [{ 
    type: "text", 
    text: `# Story Context\n${JSON.stringify(story, null, 2)}` 
  }]
});
```

#### 2. File Context via FilePartInput
```typescript
// Include files directly in the prompt
await client.session.prompt({
  sessionID,
  parts: [
    { type: "file", path: "src/schema/users.ts" },
    { type: "file", path: "src/api/routes/auth.ts" },
    { type: "text", text: "Implement the user registration endpoint" }
  ]
});
```

#### 3. Agent Selection
```typescript
// Use specific agent (build = can write, plan = read-only)
await client.session.prompt({
  sessionID,
  agent: "build",  // or "plan" for analysis-only
  parts: [{ type: "text", text: "Implement feature X" }]
});
```

#### 4. Async Execution for Long Tasks
```typescript
// Fire and forget - check status later
await client.session.promptAsync({
  sessionID,
  parts: [{ type: "text", text: "Refactor the entire auth module" }]
});

// Check status
const status = await client.session.status();
```

#### 5. Permission Handling
```typescript
// Respond to permission requests (edit, bash, etc.)
await client.permission.respond({
  sessionID,
  permissionID,
  response: "once" | "always" | "reject"
});
```

---

## Chiron Workflow Step Integration

### New Step Type: `opencode-session`

```typescript
// Proposed schema for OpenCode step type
export const OpenCodeStepConfigSchema = z.object({
  // Session configuration
  sessionTitle: z.string(),
  agent: z.enum(["build", "plan"]).default("build"),
  model: z.object({
    providerID: z.string().default("anthropic"),
    modelID: z.string().default("claude-sonnet-4-20250514")
  }).optional(),
  
  // Context injection (runs first with noReply: true)
  contextInjection: z.object({
    variables: z.array(z.string()),  // Variables to inject
    files: z.array(z.string()),       // Files to include
    template: z.string().optional()   // Template for context formatting
  }).optional(),
  
  // Main prompt
  prompt: z.string(),
  promptVariables: z.array(z.string()),  // Variables to interpolate
  
  // Tool configuration
  tools: z.record(z.boolean()).optional(),
  
  // Output handling
  outputVariables: z.record(z.string()),
  
  // Execution mode
  async: z.boolean().default(false),
  
  // Permission handling
  permissionPolicy: z.object({
    edit: z.enum(["allow", "ask", "deny"]).default("ask"),
    bash: z.enum(["allow", "ask", "deny"]).default("ask")
  }).optional()
});
```

### Example Workflow Step

```typescript
{
  step_number: 2,
  goal: "Implement the user story using OpenCode",
  step_type: "opencode-session",
  config: {
    sessionTitle: "Implement: {{story.title}}",
    agent: "build",
    
    contextInjection: {
      variables: ["story", "acceptance_criteria", "gherkin_scenarios"],
      files: ["src/schema/*.ts", "src/api/routes/*.ts"],
      template: `
# Story Implementation Context

## User Story
{{story.user_story}}

## Acceptance Criteria
{{#each acceptance_criteria}}
- {{this}}
{{/each}}

## Gherkin Scenarios
\`\`\`gherkin
{{gherkin_scenarios}}
\`\`\`
      `
    },
    
    prompt: `
Implement this user story following the Gherkin scenarios provided.

Requirements:
1. Follow existing code patterns in the project
2. Write tests for each scenario
3. Update any affected documentation

Start by exploring the codebase to understand the current structure.
    `,
    
    tools: {
      write: true,
      edit: true,
      bash: true
    },
    
    outputVariables: {
      implementation_result: "session.lastMessage",
      files_changed: "session.diff"
    },
    
    permissionPolicy: {
      edit: "ask",
      bash: "ask"
    }
  }
}
```

---

## Resources

- OpenCode SDK: https://opencode.ai/docs/sdk/
- OpenCode Agents: https://opencode.ai/docs/agents/
- OpenCode GitHub: https://github.com/sst/opencode
- OpenCode Discord: https://opencode.ai/discord
- **Local Source**: `external/opencode/packages/sdk/js/src/`
