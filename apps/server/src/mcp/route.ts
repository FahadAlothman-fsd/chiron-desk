import { ORPCError } from "@orpc/server";
import { StreamableHTTPTransport } from "@hono/mcp";
import { AgentStepMcpService } from "@chiron/workflow-engine";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Cause, Effect, Layer, Option } from "effect";
import { Hono } from "hono";
import { z } from "zod";

import type {
  AgentStepMcpRequestEnvelope,
  AgentStepMcpResponseEnvelope,
} from "@chiron/contracts/mcp";

const readStepSnapshotInputSchema = z.object({});

const readContextValueInputSchema = z.object({
  contextFactDefinitionId: z.string().min(1),
});

const writeContextValueInputSchema = z.object({
  writeItemId: z.string().min(1),
  valueJson: z.unknown(),
  appliedByTimelineItemId: z.string().min(1).optional(),
});

const readStepSnapshotOutputSchema = z.object({
  stepExecutionId: z.string().min(1),
  workflowExecutionId: z.string().min(1),
  state: z.enum([
    "not_started",
    "starting_session",
    "active_streaming",
    "active_idle",
    "disconnected_or_error",
    "completed",
  ]),
  objective: z.string().min(1),
  instructionsMarkdown: z.string().min(1),
  contractVersion: z.literal("v1"),
});

const readContextValueOutputSchema = z.object({
  stepExecutionId: z.string().min(1),
  contextFactDefinitionId: z.string().min(1),
  contextFactKind: z.enum(["project", "work_unit", "workflow"]),
  values: z.array(
    z.object({
      contextFactInstanceId: z.string().min(1).optional(),
      valueJson: z.unknown(),
      recordedAt: z.string().optional(),
    }),
  ),
});

const writeContextValueOutputSchema = z.object({
  status: z.literal("applied"),
  stepExecutionId: z.string().min(1),
  writeItemId: z.string().min(1),
  appliedWrite: z.object({
    appliedWriteId: z.string().min(1),
    contextFactDefinitionId: z.string().min(1),
    appliedAt: z.string(),
    valueJson: z.unknown(),
  }),
});

type StepExecutionBinding = {
  readonly server: McpServer;
  readonly transport: StreamableHTTPTransport;
};

function mapEffectError(error: unknown): never {
  const tag =
    error && typeof error === "object" && "_tag" in error
      ? (error as { _tag: string })._tag
      : undefined;
  const message =
    error instanceof Error
      ? error.message
      : error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message)
        : String(error);

  switch (tag) {
    case "RepositoryError":
      throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Repository operation failed." });
    case "AgentStepStateTransitionError":
    case "McpToolValidationError":
      throw new ORPCError("BAD_REQUEST", { message });
    case "McpWriteRequirementError":
    case "SingleLiveStreamContractError":
      throw new ORPCError("CONFLICT", { message });
    case "HarnessExecutionError":
    case "OpenCodeExecutionError":
      throw new ORPCError("INTERNAL_SERVER_ERROR", { message });
    default:
      throw new ORPCError("INTERNAL_SERVER_ERROR", { message });
  }
}

async function executeMcpRequest(
  serviceLayer: Layer.Layer<any>,
  request: AgentStepMcpRequestEnvelope,
): Promise<AgentStepMcpResponseEnvelope> {
  const exit = await Effect.runPromiseExit(
    Effect.gen(function* () {
      const service = yield* AgentStepMcpService;
      const result = yield* service.execute(request);
      return result.response;
    }).pipe(Effect.provide(serviceLayer)),
  );

  if (exit._tag === "Success") {
    return exit.value;
  }

  const failure = Cause.failureOption(exit.cause);
  if (Option.isSome(failure)) {
    mapEffectError(failure.value);
  }

  throw Cause.squash(exit.cause);
}

function toToolResult(output: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(output, null, 2) }],
    structuredContent: output,
  };
}

function toToolError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return {
    isError: true,
    content: [{ type: "text" as const, text: message }],
  };
}

function createBinding(
  stepExecutionId: string,
  serviceLayer: Layer.Layer<any>,
): StepExecutionBinding {
  const server = new McpServer(
    {
      name: "chiron-agent-step-runtime",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {
          listChanged: false,
        },
      },
    },
  );

  server.registerTool(
    "read_step_snapshot",
    {
      title: "Read step snapshot",
      description: "Read the current Chiron Agent-step snapshot for the bound step execution.",
      annotations: { readOnlyHint: true, idempotentHint: true },
      inputSchema: readStepSnapshotInputSchema,
      outputSchema: readStepSnapshotOutputSchema,
    },
    async () => {
      try {
        const response = await executeMcpRequest(serviceLayer, {
          version: "v1",
          toolName: "read_step_snapshot",
          input: { stepExecutionId },
        });
        return toToolResult(response.output);
      } catch (error) {
        return toToolError(error);
      }
    },
  );

  server.registerTool(
    "read_context_value",
    {
      title: "Read context value",
      description: "Read one context value that is inside the Agent-step read scope.",
      annotations: { readOnlyHint: true, idempotentHint: true },
      inputSchema: readContextValueInputSchema,
      outputSchema: readContextValueOutputSchema,
    },
    async ({ contextFactDefinitionId }) => {
      try {
        const response = await executeMcpRequest(serviceLayer, {
          version: "v1",
          toolName: "read_context_value",
          input: { stepExecutionId, contextFactDefinitionId },
        });
        return toToolResult(response.output);
      } catch (error) {
        return toToolError(error);
      }
    },
  );

  server.registerTool(
    "write_context_value",
    {
      title: "Write context value",
      description:
        "Write one permitted Agent-step context value. Only applied writes are persisted in v1.",
      annotations: { destructiveHint: true, idempotentHint: false },
      inputSchema: writeContextValueInputSchema,
      outputSchema: writeContextValueOutputSchema,
    },
    async ({ writeItemId, valueJson, appliedByTimelineItemId }) => {
      try {
        const response = await executeMcpRequest(serviceLayer, {
          version: "v1",
          toolName: "write_context_value",
          input: { stepExecutionId, writeItemId, valueJson, appliedByTimelineItemId },
        });
        return toToolResult(response.output);
      } catch (error) {
        return toToolError(error);
      }
    },
  );

  return {
    server,
    transport: new StreamableHTTPTransport(),
  };
}

export function createMcpRoute(serviceLayer: Layer.Layer<any>) {
  const app = new Hono();
  const bindings = new Map<string, StepExecutionBinding>();

  app.all("/", async (c) => {
    const stepExecutionId = c.req.query("stepExecutionId")?.trim();

    if (!stepExecutionId) {
      return c.json({ error: "Missing required query param: stepExecutionId" }, 400);
    }

    const binding =
      bindings.get(stepExecutionId) ??
      (() => {
        const created = createBinding(stepExecutionId, serviceLayer);
        bindings.set(stepExecutionId, created);
        return created;
      })();

    if (!binding.server.isConnected()) {
      await binding.server.connect(binding.transport);
    }

    return binding.transport.handleRequest(c);
  });

  return app;
}
