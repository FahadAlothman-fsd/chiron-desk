---
name: opencode-sdk
description: Use when integrating with OpenCode SDK, creating sessions, managing messages, or building harnesses
---

# OpenCode SDK Integration Guide

**Always consult the OpenCode SDK documentation at [opencode.ai/docs/sdk](https://opencode.ai/docs/sdk)**

The OpenCode SDK (`@opencode-ai/sdk`) provides a type-safe client for interacting with OpenCode programmatically.

---

## Installation

```bash
npm install @opencode-ai/sdk
# or
bun install @opencode-ai/sdk
```

---

## Client Creation

### Full Server + Client

```typescript
import { createOpencode } from "@opencode-ai/sdk"

const { client, server } = await createOpencode({
  hostname: "127.0.0.1",
  port: 4096,
  config: {
    model: "anthropic/claude-3-5-sonnet-20241022",
  },
})

// Server is now running
console.log(`Server at ${server.url}`)

// Close when done
await server.close()
```

### Client Only (Connect to Existing Server)

```typescript
import { createOpencodeClient } from "@opencode-ai/sdk"

const client = createOpencodeClient({
  baseUrl: "http://localhost:4096",
  directory: "/path/to/project",  // Optional
  fetch: customFetch,            // Optional
  signal: abortSignal,          // Optional
})
```

---

## Core APIs

### Session Management

```typescript
// Create session
const session = await client.session.create({
  body: {
    name: "My Session",
    model: { providerID: "anthropic", modelID: "claude-3-5-sonnet-20241022" },
  },
})

// List sessions
const sessions = await client.session.list()

// Get session
const session = await client.session.get({
  path: { id: sessionId },
})

// Send message
const response = await client.session.chat({
  path: { id: sessionId },
  body: { content: "Hello, world!" },
})

// Abort session
await client.session.abort({ path: { id: sessionId } })

// Fork session
const forked = await client.session.fork({ path: { id: sessionId } })
```

### Message Management

```typescript
// List messages
const messages = await client.message.list({
  path: { sessionID: sessionId },
})

// Get specific message
const message = await client.message.get({
  path: { sessionID: sessionId, messageID: messageId },
})
```

### File Operations

```typescript
// Read file
const content = await client.file.read({
  query: { path: "src/index.ts" },
})

// Search files
const results = await client.find.text({
  query: { pattern: "function.*opencode" },
})
```

### Health Check

```typescript
const health = await client.global.health()
console.log(health.data.version)
```

---

## Types

```typescript
import type { 
  Session, 
  Message, 
  Part,
  SessionCreateInput,
  MessageCreateInput,
} from "@opencode-ai/sdk"
```

All types are generated from the server's OpenAPI specification.

---

## Error Handling

```typescript
import { OpencodeSDKError } from "@opencode-ai/sdk"

try {
  await client.session.get({ path: { id: "invalid-id" } })
} catch (error) {
  if (error instanceof OpencodeSDKError) {
    console.error("SDK Error:", error.message)
    console.error("Status:", error.status)
  }
}
```

---

## Structured Output (JSON Schema)

```typescript
const result = await client.session.prompt({
  path: { id: sessionId },
  body: {
    content: "Extract company info",
    format: {
      type: "json_schema",
      schema: {
        type: "object",
        properties: {
          company: { type: "string", description: "Company name" },
          founded: { type: "number", description: "Year founded" },
        },
        required: ["company"],
      },
    },
  },
})
```

---

## MCP (Model Context Protocol)

```typescript
// List MCP servers
const mcps = await client.mcp.list()

// Use MCP in session
const response = await client.session.chat({
  path: { id: sessionId },
  body: {
    content: "Use the filesystem tool",
    mcp: [{ server: "filesystem", tool: "read_file" }],
  },
})
```

---

## Event Subscription

```typescript
const subscription = await client.event.subscribe({
  body: { events: ["session.created", "session.completed"] },
})

// Handle events
for await (const event of subscription) {
  console.log("Event:", event.type)
}
```

---

## Common Patterns

### Session with Harness

```typescript
// Create harness session
const harness = await client.session.create({
  body: {
    name: "Test Harness",
    harness: {
      type: "test",
      config: { /* harness config */ },
    },
  },
})
```

### Streaming Responses

```typescript
const stream = await client.session.chat({
  path: { id: sessionId },
  body: { content: "Generate code" },
  query: { stream: true },
})

for await (const chunk of stream) {
  process.stdout.write(chunk.content)
}
```

---

## Configuration

The SDK respects `opencode.json` configuration. Key options:

| Option | Description |
|--------|-------------|
| `model` | Default model for sessions |
| `plugins` | Array of plugin names |
| `mcp` | MCP server configurations |
| `permissions` | Permission settings |

---

## Resources

- **SDK Docs**: https://opencode.ai/docs/sdk
- **Plugin Docs**: https://opencode.ai/docs/plugins
- **OpenCode Book**: https://www.opencodebook.xyz
- **NPM Package**: `@opencode-ai/sdk`

---

## Integration with Effect

When using OpenCode SDK within Effect services:

```typescript
import { Context, Effect, Layer } from "effect"
import { createOpencodeClient } from "@opencode-ai/sdk"

class OpenCodeSdk extends Context.Tag("OpenCodeSdk")<
  OpenCodeSdk,
  { readonly client: ReturnType<typeof createOpencodeClient> }
>() {
  static readonly Live = Layer.succeed(
    this,
    { client: createOpencodeClient({ baseUrl: "http://localhost:4096" }) }
  )
}

// Usage in Effect
const useSdk = Effect.gen(function* () {
  const { client } = yield* OpenCodeSdk
  const sessions = yield* Effect.tryPromise(() => client.session.list())
  return sessions
})
```
