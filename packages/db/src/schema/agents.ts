import { boolean, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// LLM Provider Enum
export const llmProviderEnum = pgEnum("llm_provider", ["anthropic", "openrouter", "openai"]);

// Agents table - first-class agent entities
export const agents = pgTable("agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  description: text("description").notNull(),
  role: text("role").notNull(),

  // LLM Configuration
  llmProvider: llmProviderEnum("llm_provider").notNull(),
  llmModel: text("llm_model").notNull(),
  llmTemperature: text("llm_temperature"), // Stored as text for precision

  // Agent instructions (system prompt)
  instructions: text("instructions"), // Multi-line agent instructions, ACE playbook injected at runtime

  // Agent capabilities
  tools: jsonb("tools").$type<AgentTool[]>(),
  mcpServers: jsonb("mcp_servers").$type<string[]>(),

  // UI styling
  color: text("color"),
  avatar: text("avatar"),

  active: boolean("active").notNull().default(true),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// TypeScript types for JSON columns
export type AgentTool = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};
