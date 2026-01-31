import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

const server = new McpServer({
  name: "chiron-mcp",
  version: "0.1.0",
});

const alpha = server.registerTool(
  "alpha",
  {
    description: "Alpha tool for dynamic list updates.",
    inputSchema: z.object({ value: z.string() }),
  },
  async ({ value }) => ({
    content: [{ type: "text", text: `alpha:${value}` }],
  }),
);

const beta = server.registerTool(
  "beta",
  {
    description: "Beta tool for dynamic list updates.",
    inputSchema: z.object({ value: z.string() }),
  },
  async ({ value }) => ({
    content: [{ type: "text", text: `beta:${value}` }],
  }),
);

await server.connect(serverTransport);

const client = new Client({ name: "chiron-client", version: "0.1.0" });
await client.connect(clientTransport);

const listTools = async (label: string) => {
  const result = await client.listTools();
  console.log(
    label,
    result.tools.map((tool) => tool.name),
  );
};

await listTools("initial tools:");

alpha.disable();
await listTools("after alpha.disable:");

beta.update({ name: "beta_v2" });
await listTools("after beta.rename:");

beta.remove();
await listTools("after beta.remove:");

await client.close();
await server.close();
