import path from "node:path";

import { createOpencodeServer } from "@opencode-ai/sdk";
import { createOpencodeClient } from "@opencode-ai/sdk/v2";

const projectDir = process.env.PROJECT_DIR ?? "/home/gondilf/Desktop/projects/masters/chiron";
const mcpServerPath = path.resolve(projectDir, "apps/server/prototyping/chiron-mcp-server.ts");
const toolset =
  process.env.CHIRON_TOOLSET ?? "update_summary,update_complexity,select_workflow_path";

const config = {
  mcp: {
    chiron: {
      type: "local",
      command: ["bun", mcpServerPath],
      env: {
        CHIRON_TOOLSET: toolset,
        PROJECT_DIR: projectDir,
      },
      enabled: true,
    },
  },
} as const;

const server = await createOpencodeServer({ port: 4096, config });
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

try {
  const providers = (await client.config.providers()).data;
  console.log("providers:", redact(providers));

  const toolIdsBefore = (await client.tool.ids()).data ?? [];
  console.log("tool ids before:", {
    count: toolIdsBefore.length,
    sample: toolIdsBefore.slice(0, 12),
  });

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
  console.log("tool ids after:", {
    count: toolIdsAfter.length,
    added: addedTools,
  });

  const session = await client.session.create({
    directory: projectDir,
    title: "Chiron MCP test",
  });
  const sessionId = session.data?.id ?? session.id ?? session;
  console.log("session:", sessionId);
} finally {
  await server.close();
}
