import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const rawActions = process.env.CHIRON_ACTIONS ?? "update_topic,update_goals,select_techniques";
const allowedActions = rawActions
  .split(",")
  .map((action) => action.trim())
  .filter((action) => action.length > 0);

const actionRegistry = {
  update_topic: {
    description: "Update the brainstorming topic.",
    schema: z.object({ topic: z.string() }),
    jsonSchema: {
      type: "object",
      properties: { topic: { type: "string" } },
      required: ["topic"],
      additionalProperties: false,
    },
  },
  update_goals: {
    description: "Update the brainstorming goals.",
    schema: z.object({ goals: z.string() }),
    jsonSchema: {
      type: "object",
      properties: { goals: { type: "string" } },
      required: ["goals"],
      additionalProperties: false,
    },
  },
  select_techniques: {
    description: "Select brainstorming techniques.",
    schema: z.object({ techniques: z.array(z.string()) }),
    jsonSchema: {
      type: "object",
      properties: { techniques: { type: "array", items: { type: "string" } } },
      required: ["techniques"],
      additionalProperties: false,
    },
  },
} as const;

const actions = allowedActions
  .map((name) => {
    const entry = actionRegistry[name as keyof typeof actionRegistry];
    if (!entry) {
      return null;
    }
    return {
      name,
      description: entry.description,
      schema: entry.jsonSchema,
    };
  })
  .filter((action): action is NonNullable<typeof action> => Boolean(action));

const context = {
  project_id: process.env.CHIRON_PROJECT_ID ?? null,
  execution_id: process.env.CHIRON_EXECUTION_ID ?? null,
  step_execution_id: process.env.CHIRON_STEP_EXECUTION_ID ?? null,
  workflow_id: process.env.CHIRON_WORKFLOW_ID ?? null,
  session_id: process.env.CHIRON_SESSION_ID ?? null,
  worktree: process.env.CHIRON_WORKTREE ?? null,
  actions: actions.map((action) => action.name),
};

const server = new McpServer({
  name: "chiron-mcp",
  version: "0.2.0",
});

const toContent = (payload: unknown) => ({
  content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
});

server.registerTool(
  "chiron_context",
  {
    description: "Return Chiron session context metadata.",
    inputSchema: z.object({}),
  },
  async () => toContent({ context }),
);

server.registerTool(
  "chiron_actions",
  {
    description: "Return the available Chiron actions and schemas.",
    inputSchema: z.object({}),
  },
  async () => toContent({ actions }),
);

server.registerTool(
  "chiron_action",
  {
    description: "Execute a Chiron action with options.",
    inputSchema: z.object({
      action: z.string(),
      options: z.unknown().optional(),
    }),
  },
  async ({ action, options }) => {
    const entry = actionRegistry[action as keyof typeof actionRegistry];
    if (!entry || !allowedActions.includes(action)) {
      return toContent({
        ok: false,
        error: `Action not allowed: ${action}`,
      });
    }
    const parsed = entry.schema.safeParse(options ?? {});
    if (!parsed.success) {
      return toContent({
        ok: false,
        error: "Invalid options",
        issues: parsed.error.issues,
      });
    }
    return toContent({
      ok: true,
      action,
      options: parsed.data,
      note: "Prototype response (wire to Tooling Engine in Chiron)",
    });
  },
);

await server.connect(new StdioServerTransport());
