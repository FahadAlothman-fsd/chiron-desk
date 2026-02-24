# Agent Type Schema Design — Story 1.2

## Context

Story 1.2 implements the **methodology building blocks layer**. The `MethodologyVersionDefinition` defines everything a methodology version contains:

```
Methodology Version Definition
├── variableDefinitions[]       ← Story 1.1 ✅ (methodology-level facts)
├── linkTypeDefinitions[]       ← Story 1.1 ✅ (dependency/relationship types)
├── workUnitTypes[]             ← Story 1.2 ✅ (with lifecycles, transitions, gates, facts)
└── agentTypes[]                ← Story 1.2 🆕 (THIS DOCUMENT)
```

Agent types are AI agent profiles defined at the methodology level. They describe **WHAT an agent IS** — identity, persona/soul, default model, and integrations. They do NOT describe HOW the agent runs (that's determined by the platform/agentKind at runtime in Epic 3+).

## Schema Definition

```typescript
// packages/contracts/src/methodology/agent.ts

export const ModelReference = Schema.Struct({
  provider: Schema.String,           // "anthropic", "openai", "google", "ollama"
  model: Schema.String,              // "claude-opus-4-20250514", "gpt-4o"
});
export type ModelReference = typeof ModelReference.Type;

export const AgentTypeDefinition = Schema.Struct({
  key: Schema.String,                        // Stable ID: "architect", "developer", "reviewer"
  displayName: Schema.optional(Schema.String), // "Prometheus", "Hephaestus", "Momus"
  description: Schema.optional(Schema.String), // What this agent does
  persona: Schema.String,                     // Template string — resolved by template-engine at runtime
  defaultModel: Schema.optional(ModelReference),
  mcpServers: Schema.optional(Schema.Array(Schema.String)),  // MCP server keys
  capabilities: Schema.optional(Schema.Array(Schema.String)), // Semantic tags (future routing/matching)
});
export type AgentTypeDefinition = typeof AgentTypeDefinition.Type;
```

## Field Descriptions

| Field | Required | Description |
|-------|----------|-------------|
| `key` | ✅ | Stable identifier within methodology version. Referenced by workflow steps in Story 1.3. Must be unique per methodology version. |
| `displayName` | ❌ | Human-readable name. Can be themed (mythological creatures, etc.). |
| `description` | ❌ | Brief purpose description for UI/documentation. |
| `persona` | ✅ | The agent's soul. A template string with `{{variables}}` resolved by the template-engine at runtime using methodology variables, project context, etc. |
| `defaultModel` | ❌ | Default LLM model as `{ provider, model }` pair. Maps to provider-registry (Epic 3). Platform can override. |
| `mcpServers` | ❌ | Keys of MCP servers this agent can connect to. Defines integration surface. |
| `capabilities` | ❌ | Semantic capability tags for future routing/matching. Not resolved in v1. |

## Design Decisions

### 1. Persona is a Template, Not Static Text
The `persona` field contains template syntax (e.g., `{{project.name}}`, `{{methodology.version}}`). At runtime, the template-engine resolves these against methodology variables and project context. This keeps agent definitions reusable across projects.

### 2. defaultModel is `{ provider, model }`, Not a Plain String
Model references are structured because the provider-registry (Epic 3) needs both the provider and model to resolve credentials, routing, and fallback policies. Storing them separately now means no migration later.

### 3. Runtime Config is NOT in the Schema
Fields like `temperature`, `maxTokens`, `timeout`, `tools` are determined by:
- The `agentKind` (opencode, chiron, etc.)
- Platform-level configuration
- Workflow step overrides (Story 1.3)

These are NOT methodology-level concerns.

### 4. Skills Are NOT in the Schema
Skills are a platform concept (OpenCode skills, BMAD skills). The methodology defines the agent's persona and capabilities; the platform maps those to concrete skill implementations.

### 5. MCP Servers are Keys, Not Full Definitions
`mcpServers` stores string keys that reference MCP server definitions managed elsewhere (platform or project config). The methodology says "this agent can use X", the platform resolves X to an actual MCP endpoint.

## DB Table

```sql
-- methodology_agent_types
CREATE TABLE methodology_agent_types (
  id TEXT PRIMARY KEY,
  methodology_version_id TEXT NOT NULL REFERENCES methodology_versions(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  display_name TEXT,
  description TEXT,
  persona TEXT NOT NULL,
  default_model_json TEXT,         -- JSON: { provider: string, model: string } | null
  mcp_servers_json TEXT,           -- JSON: string[] | null
  capabilities_json TEXT,          -- JSON: string[] | null
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(methodology_version_id, key)
);
```

## Validation Rules

| Rule | Error Code | Blocking |
|------|-----------|----------|
| Duplicate agent type keys | `DUPLICATE_AGENT_TYPE_KEY` | ✅ |
| Empty `key` | `EMPTY_AGENT_TYPE_KEY` | ✅ |
| Empty `persona` | `EMPTY_AGENT_PERSONA` | ✅ |
| Reserved key (starts with `_`) | `RESERVED_AGENT_TYPE_KEY` | ✅ |
| Invalid model reference (missing provider or model) | `INVALID_MODEL_REFERENCE` | ✅ |

## API Procedures

No new procedures needed — agent types are part of the `updateDraftLifecycle` input (same payload as work unit types). The existing procedure gets extended to also accept `agentTypes[]`.

**Alternative:** Rename `updateDraftLifecycle` to `updateDraftDefinitions` since it now handles both work unit types and agent types at the methodology layer.

## Relationship to MethodologyVersionDefinition

```typescript
// Updated — version.ts
export const MethodologyVersionDefinition = Schema.Struct({
  workUnitTypes: Schema.Array(Schema.Unknown),                    // → Story 1.2
  agentTypes: Schema.Array(Schema.Unknown),                       // → Story 1.2 🆕
  transitions: Schema.Array(Schema.Unknown),                      // → Story 1.3
  allowedWorkflowsByTransition: Schema.Record({
    key: Schema.String,
    value: Schema.Array(Schema.String),
  }),                                                              // → Story 1.3
});
```

## Relationship to definitionJson

The `definitionJson` column on `methodology_versions` stores the complete definition as a JSON document. When lifecycle data is saved:
1. Read existing `definitionJson`
2. Merge `workUnitTypes` and `agentTypes` into it (preserve other fields)
3. Write back the merged version

This keeps the JSON document in sync with the relational tables while not destroying data from other stories.
