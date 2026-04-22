import { ORPCError } from "@orpc/server";
import { StreamableHTTPTransport } from "@hono/mcp";
import { AgentStepMcpService } from "@chiron/workflow-engine";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Cause, Effect, Layer, Option } from "effect";
import { Hono } from "hono";
import { z } from "zod";

import type {
  AgentStepMcpV2RequestEnvelope,
  AgentStepMcpV2ResponseEnvelope,
} from "@chiron/contracts/mcp";

const readStepExecutionSnapshotInputSchema = z.object({});
const readStepExecutionSnapshotOutputSchema = z.object({
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
  completion: z.object({
    total: z.number(),
    withInstances: z.number(),
    withoutInstances: z.number(),
    isComplete: z.boolean(),
  }),
  readSet: z.array(
    z.object({
      factKey: z.string().min(1),
      contextFactKind: z.string().min(1),
      label: z.string().optional(),
      description: z.unknown().optional(),
      guidance: z.unknown().optional(),
      access: z.object({
        canReadSchema: z.boolean(),
        canReadInstances: z.boolean(),
        canReadAttachableTargets: z.boolean(),
      }),
    }),
  ),
  writeSet: z.array(
    z.object({
      factKey: z.string().min(1),
      contextFactKind: z.string().min(1),
      label: z.string().optional(),
      description: z.unknown().optional(),
      guidance: z.unknown().optional(),
      instanceCount: z.number(),
      hasInstances: z.boolean(),
      requiredForCompletion: z.boolean(),
      readAccess: z.object({
        canReadSchema: z.boolean(),
        canReadInstances: z.boolean(),
        canReadAttachableTargets: z.boolean(),
      }),
      writeAccess: z.object({
        canCreate: z.boolean(),
        canUpdate: z.boolean(),
        canRemove: z.boolean(),
        canDelete: z.boolean(),
      }),
    }),
  ),
});

const factKeyInputSchema = z.object({
  factKey: z.string().min(1),
});

const readContextFactInstancesInputSchema = z.object({
  factKey: z.string().min(1),
  instanceIds: z.array(z.string().min(1)).optional(),
  limit: z.number().optional(),
});

const readAttachableTargetsInputSchema = z.object({
  factKey: z.string().min(1),
  targetIds: z.array(z.string().min(1)).optional(),
  targetFieldKey: z.string().min(1).optional(),
  limit: z.number().optional(),
});

const writeInputSchema = z.object({
  factKey: z.string().min(1),
  instanceId: z.string().min(1).optional(),
  value: z.unknown().optional(),
});

const readContextFactSchemaOutputSchema = z
  .object({
    factKey: z.string().min(1),
    contextFactKind: z.string().min(1),
    label: z.string().optional(),
    description: z.unknown().optional(),
    guidance: z.unknown().optional(),
    cardinality: z.enum(["one", "many"]),
    actions: z.array(z.enum(["create", "update", "remove", "delete"])),
  })
  .passthrough();

const readContextFactInstancesOutputSchema = z.object({
  factKey: z.string().min(1),
  contextFactKind: z.string().min(1),
  instances: z.array(
    z
      .object({
        instanceId: z.string().min(1),
        recordedAt: z.string().optional(),
        value: z.unknown(),
      })
      .passthrough(),
  ),
});

const readAttachableTargetsOutputSchema = z
  .object({
    factKey: z.string().min(1),
    contextFactKind: z.string().min(1),
  })
  .passthrough();

const writeOutputSchema = z.object({
  status: z.literal("applied"),
  operation: z.enum(["create", "update", "remove", "delete"]),
  factKey: z.string().min(1),
  instanceId: z.string().min(1),
  value: z.unknown().optional(),
  changedContext: z.boolean(),
});

type StepExecutionBinding = {
  readonly server: McpServer;
  readonly transport: StreamableHTTPTransport;
};

function serializeForTrace(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function logMcpTrace(
  phase: string,
  payload: Record<string, unknown>,
  level: "info" | "error" = "info",
) {
  const effect = Effect.annotateLogs({
    mcpPhase: phase,
    mcpPayload: serializeForTrace(payload),
  })(level === "error" ? Effect.logError("mcp trace") : Effect.logInfo("mcp trace"));

  Effect.runFork(effect);
}

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
  request: AgentStepMcpV2RequestEnvelope,
): Promise<AgentStepMcpV2ResponseEnvelope> {
  logMcpTrace("execute.request", request);
  const exit = await Effect.runPromiseExit(
    Effect.gen(function* () {
      const service = yield* AgentStepMcpService;
      const result = yield* service.execute(request);
      return result.response;
    }).pipe(Effect.provide(serviceLayer)),
  );

  if (exit._tag === "Success") {
    logMcpTrace("execute.response", exit.value);
    return exit.value;
  }

  const failure = Cause.failureOption(exit.cause);
  if (Option.isSome(failure)) {
    logMcpTrace(
      "execute.failure",
      {
        request,
        error:
          failure.value instanceof Error
            ? {
                name: failure.value.name,
                message: failure.value.message,
                stack: failure.value.stack,
              }
            : failure.value,
      },
      "error",
    );
    mapEffectError(failure.value);
  }

  logMcpTrace("execute.defect", { request, cause: Cause.pretty(exit.cause) }, "error");
  throw Cause.squash(exit.cause);
}

function toToolResult<T extends Record<string, unknown>>(output: T) {
  logMcpTrace("tool.result", output);
  return {
    content: [{ type: "text" as const, text: JSON.stringify(output, null, 2) }],
    ...(output && typeof output === "object" && !Array.isArray(output)
      ? { structuredContent: output as Record<string, unknown> }
      : {}),
  };
}

function toToolError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  logMcpTrace(
    "tool.error",
    {
      error:
        error instanceof Error
          ? { name: error.name, message: error.message, stack: error.stack }
          : error,
      message,
    },
    "error",
  );

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
    "read_step_execution_snapshot",
    {
      title: "Read step execution snapshot",
      description:
        "Read the current Agent-step objective, completion summary, and readable/writable context-fact scope for the bound step execution.",
      annotations: { readOnlyHint: true, idempotentHint: true },
      inputSchema: readStepExecutionSnapshotInputSchema,
      outputSchema: readStepExecutionSnapshotOutputSchema,
    },
    async () => {
      try {
        logMcpTrace("tool.call", {
          stepExecutionId,
          toolName: "read_step_execution_snapshot",
          input: {},
        });
        const response = await executeMcpRequest(serviceLayer, {
          version: "v2",
          toolName: "read_step_execution_snapshot",
          input: { stepExecutionId } as never,
        });
        return "output" in response ? toToolResult(response.output) : toToolError(response.error);
      } catch (error) {
        return toToolError(error);
      }
    },
  );

  server.registerTool(
    "read_context_fact_schema",
    {
      title: "Read context fact schema",
      description:
        "Read the schema, validation, cardinality, and allowed CRUD actions for one context fact in MCP scope.",
      annotations: { readOnlyHint: true, idempotentHint: true },
      inputSchema: factKeyInputSchema,
      outputSchema: readContextFactSchemaOutputSchema,
    },
    async (input) => {
      try {
        logMcpTrace("tool.call", {
          stepExecutionId,
          toolName: "read_context_fact_schema",
          input,
        });
        const response = await executeMcpRequest(serviceLayer, {
          version: "v2",
          toolName: "read_context_fact_schema",
          input: { ...input, stepExecutionId } as never,
        });
        return "output" in response ? toToolResult(response.output) : toToolError(response.error);
      } catch (error) {
        return toToolError(error);
      }
    },
  );

  server.registerTool(
    "read_context_fact_instances",
    {
      title: "Read context fact instances",
      description:
        "Read current workflow-context instances for one fact key, optionally filtered by instance ids or limit.",
      annotations: { readOnlyHint: true, idempotentHint: true },
      inputSchema: readContextFactInstancesInputSchema,
      outputSchema: readContextFactInstancesOutputSchema,
    },
    async (input) => {
      try {
        logMcpTrace("tool.call", {
          stepExecutionId,
          toolName: "read_context_fact_instances",
          input,
        });
        const response = await executeMcpRequest(serviceLayer, {
          version: "v2",
          toolName: "read_context_fact_instances",
          input: { ...input, stepExecutionId } as never,
        });
        return "output" in response ? toToolResult(response.output) : toToolError(response.error);
      } catch (error) {
        return toToolError(error);
      }
    },
  );

  server.registerTool(
    "read_attachable_targets",
    {
      title: "Read attachable targets",
      description:
        "Read eligible external targets for a bound, workflow-ref, work-unit-reference, or draft-spec context fact.",
      annotations: { readOnlyHint: true, idempotentHint: true },
      inputSchema: readAttachableTargetsInputSchema,
      outputSchema: readAttachableTargetsOutputSchema,
    },
    async (input) => {
      try {
        logMcpTrace("tool.call", {
          stepExecutionId,
          toolName: "read_attachable_targets",
          input,
        });
        const response = await executeMcpRequest(serviceLayer, {
          version: "v2",
          toolName: "read_attachable_targets",
          input: { ...input, stepExecutionId } as never,
        });
        return "output" in response ? toToolResult(response.output) : toToolError(response.error);
      } catch (error) {
        return toToolError(error);
      }
    },
  );

  server.registerTool(
    "create_context_fact_instance",
    {
      title: "Create context fact instance",
      description:
        "Create a new workflow-context fact instance for the bound step execution scope.",
      annotations: { destructiveHint: true, idempotentHint: false },
      inputSchema: writeInputSchema,
      outputSchema: writeOutputSchema,
    },
    async (input) => {
      try {
        logMcpTrace("tool.call", {
          stepExecutionId,
          toolName: "create_context_fact_instance",
          input,
        });
        const response = await executeMcpRequest(serviceLayer, {
          version: "v2",
          toolName: "create_context_fact_instance",
          input: { ...input, stepExecutionId } as never,
        });
        return "output" in response ? toToolResult(response.output) : toToolError(response.error);
      } catch (error) {
        return toToolError(error);
      }
    },
  );

  server.registerTool(
    "update_context_fact_instance",
    {
      title: "Update context fact instance",
      description: "Update one existing workflow-context fact instance identified by instanceId.",
      annotations: { destructiveHint: true, idempotentHint: false },
      inputSchema: writeInputSchema,
      outputSchema: writeOutputSchema,
    },
    async (input) => {
      try {
        logMcpTrace("tool.call", {
          stepExecutionId,
          toolName: "update_context_fact_instance",
          input,
        });
        const response = await executeMcpRequest(serviceLayer, {
          version: "v2",
          toolName: "update_context_fact_instance",
          input: { ...input, stepExecutionId } as never,
        });
        return "output" in response ? toToolResult(response.output) : toToolError(response.error);
      } catch (error) {
        return toToolError(error);
      }
    },
  );

  server.registerTool(
    "remove_context_fact_instance",
    {
      title: "Remove context fact instance",
      description:
        "Remove workflow-context state only. For artifact facts, remove only context-local files that are not already part of the external artifact slot instance.",
      annotations: { destructiveHint: true, idempotentHint: false },
      inputSchema: writeInputSchema,
      outputSchema: writeOutputSchema,
    },
    async (input) => {
      try {
        logMcpTrace("tool.call", {
          stepExecutionId,
          toolName: "remove_context_fact_instance",
          input,
        });
        const response = await executeMcpRequest(serviceLayer, {
          version: "v2",
          toolName: "remove_context_fact_instance",
          input: { ...input, stepExecutionId } as never,
        });
        return "output" in response ? toToolResult(response.output) : toToolError(response.error);
      } catch (error) {
        return toToolError(error);
      }
    },
  );

  server.registerTool(
    "delete_context_fact_instance",
    {
      title: "Delete context fact instance",
      description:
        "Apply external deletion intent. For artifact facts, delete only files that already exist in the external artifact slot instance; this does not remove context-local-only files.",
      annotations: { destructiveHint: true, idempotentHint: false },
      inputSchema: writeInputSchema,
      outputSchema: writeOutputSchema,
    },
    async (input) => {
      try {
        logMcpTrace("tool.call", {
          stepExecutionId,
          toolName: "delete_context_fact_instance",
          input,
        });
        const response = await executeMcpRequest(serviceLayer, {
          version: "v2",
          toolName: "delete_context_fact_instance",
          input: { ...input, stepExecutionId } as never,
        });
        return "output" in response ? toToolResult(response.output) : toToolError(response.error);
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

    logMcpTrace("http.request", {
      method: c.req.method,
      url: c.req.url,
      stepExecutionId: stepExecutionId ?? null,
    });

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
