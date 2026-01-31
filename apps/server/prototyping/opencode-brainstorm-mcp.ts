import path from "node:path";

import { Client as McpClient } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createOpencodeServer } from "@opencode-ai/sdk";
import { createOpencodeClient } from "@opencode-ai/sdk/v2";
import { z } from "zod";

const projectDir = process.env.PROJECT_DIR ?? "/home/gondilf/Desktop/projects/masters/chiron";
const port = Number(process.env.OPENCODE_PORT ?? "4096");
const actions = process.env.CHIRON_ACTIONS ?? "update_topic,update_goals,select_techniques";
const mcpServerPath = path.resolve(projectDir, "apps/server/prototyping/chiron-mcp-server.ts");

const config = {
  mcp: {
    chiron: {
      type: "local",
      command: ["bun", mcpServerPath],
      env: {
        CHIRON_ACTIONS: actions,
        CHIRON_PROJECT_ID: "proj_chiron",
        CHIRON_EXECUTION_ID: "exec_brainstorm",
        CHIRON_STEP_EXECUTION_ID: "step_brainstorm_1",
        CHIRON_WORKFLOW_ID: "workflow_brainstorm",
        CHIRON_SESSION_ID: "session_brainstorm",
        CHIRON_WORKTREE: "worktrees/brainstorm-1",
        PROJECT_DIR: projectDir,
      },
      enabled: true,
    },
  },
} as const;

const runDirectMcpDemo = async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const mcpServer = new McpServer({ name: "chiron-mcp", version: "0.2.0" });
  const actionsList = buildActions();

  mcpServer.registerTool(
    "chiron_context",
    {
      description: "Return Chiron session context metadata.",
      inputSchema: z.object({}),
    },
    async () => toContent({ context }),
  );

  mcpServer.registerTool(
    "chiron_actions",
    {
      description: "Return the available Chiron actions and schemas.",
      inputSchema: z.object({}),
    },
    async () => toContent({ actions: actionsList }),
  );

  mcpServer.registerTool(
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
        return toContent({ ok: false, error: `Action not allowed: ${action}` });
      }
      const parsed = entry.schema.safeParse(options ?? {});
      if (!parsed.success) {
        return toContent({ ok: false, error: "Invalid options", issues: parsed.error.issues });
      }
      return toContent({
        ok: true,
        action,
        options: parsed.data,
        note: "Direct MCP demo",
      });
    },
  );

  await mcpServer.connect(serverTransport);

  const mcpClient = new McpClient({ name: "chiron-client", version: "0.1.0" });
  await mcpClient.connect(clientTransport);

  const tools = await mcpClient.listTools();
  console.log(
    "direct mcp tools:",
    tools.tools.map((tool) => tool.name),
  );

  const actionsResult = await mcpClient.callTool({
    name: "chiron_actions",
    arguments: {},
  });
  console.log("direct chiron_actions:", actionsResult.content);

  const actionResult = await mcpClient.callTool({
    name: "chiron_action",
    arguments: { action: "update_topic", options: { topic: "Taskflow" } },
  });
  console.log("direct chiron_action:", actionResult.content);

  await mcpClient.close();
  await mcpServer.close();
};

const server = await createOpencodeServer({ port, config });
const client = createOpencodeClient({ baseUrl: server.url, directory: projectDir });

const redact = (value: unknown): unknown => {
  if (!value || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(redact);
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      key.toLowerCase().includes("key") || key.toLowerCase().includes("token")
        ? "[redacted]"
        : redact(entry),
    ]),
  );
};

const summarizeList = (items: string[]) => ({
  count: items.length,
  sample: items.slice(0, 12),
});

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

const allowedActions = actions
  .split(",")
  .map((action) => action.trim())
  .filter((action) => action.length > 0);

const buildActions = () =>
  allowedActions
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
  project_id: "proj_chiron",
  execution_id: "exec_brainstorm",
  step_execution_id: "step_brainstorm_1",
  workflow_id: "workflow_brainstorm",
  session_id: "session_brainstorm",
  worktree: "worktrees/brainstorm-1",
};

const toContent = (payload: unknown) => ({
  content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
});

try {
  await runDirectMcpDemo();

  const providers = (await client.config.providers()).data;
  console.log("providers:", redact(providers));

  const defaultProvider = providers?.default?.opencode ?? "openai/codex-5.2";

  const toolIdsBefore = (await client.tool.ids()).data ?? [];
  console.log("tool ids before:", summarizeList(toolIdsBefore));

  const skills = (await client.app.skills({ directory: projectDir })).data ?? [];
  console.log("skills:", {
    count: skills.length,
    names: skills.map((skill) => skill.name ?? skill.id).slice(0, 10),
  });

  const commands = (await client.command.list({ directory: projectDir })).data ?? [];
  console.log("commands:", {
    count: commands.length,
    names: commands.map((command) => command.name ?? command.id).slice(0, 10),
  });

  const mcpStatusBefore = (await client.mcp.status({ directory: projectDir })).data;
  console.log("mcp status before:", mcpStatusBefore);

  await client.mcp.connect({ name: "chiron", directory: projectDir });

  const mcpStatusAfter = (await client.mcp.status({ directory: projectDir })).data;
  console.log("mcp status after:", mcpStatusAfter);

  const toolIdsAfter = (await client.tool.ids()).data ?? [];
  const addedTools = toolIdsAfter.filter((tool) => !toolIdsBefore.includes(tool));
  console.log("tool ids after:", summarizeList(toolIdsAfter));
  console.log("added tools:", addedTools);

  const toolListRes = await client.tool.list({
    provider: "opencode",
    model: defaultProvider,
  });
  const toolList = toolListRes.data?.tools ?? toolListRes.data ?? [];
  const toolNames = Array.isArray(toolList)
    ? toolList.map((tool) => tool.name ?? tool.id).filter(Boolean)
    : [];
  console.log("opencode tool list sample:", toolNames.slice(0, 20));
  console.log("chiron tools present:", {
    chiron_context: toolNames.includes("chiron_context"),
    chiron_actions: toolNames.includes("chiron_actions"),
    chiron_action: toolNames.includes("chiron_action"),
  });

  const session = await client.session.create({
    directory: projectDir,
    title: "Brainstorming Step 1 MCP test",
  });
  const sessionId = session.data?.id ?? session.id ?? session;
  console.log("session:", sessionId);

  await client.session.prompt({
    path: { sessionID: sessionId },
    query: { directory: projectDir },
    body: {
      parts: [
        {
          type: "text",
          text: "Call the chiron_actions tool, then call chiron_action update_topic with topic=Taskflow.",
        },
      ],
    },
  });

  await new Promise((resolve) => setTimeout(resolve, 1500));
  const messages = (
    await client.session.messages({
      path: { sessionID: sessionId },
      query: { directory: projectDir, limit: 5 },
    })
  ).data;
  const preview = (messages ?? []).map((message) => ({
    id: message.id,
    role: message.role,
    content:
      typeof message.content === "string"
        ? message.content
        : message.parts?.map((part) => part.text ?? part.type),
  }));
  console.log("recent messages:", preview);
} finally {
  await server.close();
}
