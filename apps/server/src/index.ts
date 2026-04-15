import { createContext } from "@chiron/api/context";
import { createAppRouter } from "@chiron/api/routers/index";
import { auth } from "@chiron/auth";
import type { AgentStepSseEnvelope } from "@chiron/contracts/sse/envelope";
import { env } from "@chiron/env/server";
import { OpencodeHarnessServiceLive } from "@chiron/agent-runtime";
import {
  AgentStepEventStreamService,
  WorkflowEngineRuntimeStepServicesLive,
} from "@chiron/workflow-engine";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { streamSSE } from "hono/streaming";
import {
  db,
  createArtifactRepoLayer,
  createExecutionReadRepoLayer,
  createProjectFactRepoLayer,
  createMethodologyRepoLayer,
  createLifecycleRepoLayer,
  createProjectWorkUnitRepoLayer,
  createProjectContextRepoLayer,
  createTransitionExecutionRepoLayer,
  createWorkflowExecutionRepoLayer,
  createWorkUnitFactRepoLayer,
  createStepExecutionRepoLayer,
  createInvokeExecutionRepoLayer,
  createAgentStepExecutionStateRepoLayer,
  createAgentStepExecutionHarnessBindingRepoLayer,
  createAgentStepExecutionAppliedWriteRepoLayer,
} from "@chiron/db";
import { Cause, Effect, Layer, Option, Stream } from "effect";

import { createMcpRoute } from "./mcp/route";

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }

  return String(error);
}

const methodologyRepoLayer = createMethodologyRepoLayer(db);
const lifecycleRepoLayer = createLifecycleRepoLayer(db);
const projectContextRepoLayer = createProjectContextRepoLayer(db);
const runtimeRepoLayer = Layer.mergeAll(
  createProjectWorkUnitRepoLayer(db),
  createExecutionReadRepoLayer(db),
  createTransitionExecutionRepoLayer(db),
  createWorkflowExecutionRepoLayer(db),
  createProjectFactRepoLayer(db),
  createWorkUnitFactRepoLayer(db),
  createArtifactRepoLayer(db),
  createStepExecutionRepoLayer(db),
  createInvokeExecutionRepoLayer(db),
  createAgentStepExecutionStateRepoLayer(db),
  createAgentStepExecutionHarnessBindingRepoLayer(db),
  createAgentStepExecutionAppliedWriteRepoLayer(db),
);

const mcpServiceLayer = Layer.provide(
  WorkflowEngineRuntimeStepServicesLive,
  Layer.mergeAll(
    runtimeRepoLayer,
    methodologyRepoLayer,
    lifecycleRepoLayer,
    projectContextRepoLayer,
    OpencodeHarnessServiceLive,
  ),
) as Layer.Layer<any>;

const appRouter = createAppRouter(
  methodologyRepoLayer,
  lifecycleRepoLayer,
  projectContextRepoLayer,
  runtimeRepoLayer,
);

const app = new Hono();

app.use(logger());
app.use(
  "/*",
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.route("/mcp", createMcpRoute(mcpServiceLayer));

export const apiHandler = new OpenAPIHandler(appRouter, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
    }),
  ],
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

export const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

app.use("/*", async (c, next) => {
  const context = await createContext({ context: c });

  const rpcResult = await rpcHandler.handle(c.req.raw, {
    prefix: "/rpc",
    context: context,
  });

  if (rpcResult.matched) {
    return c.newResponse(rpcResult.response.body, rpcResult.response);
  }

  const apiResult = await apiHandler.handle(c.req.raw, {
    prefix: "/api-reference",
    context: context,
  });

  if (apiResult.matched) {
    return c.newResponse(apiResult.response.body, apiResult.response);
  }

  await next();
});

app.get("/", (c) => {
  return c.text("OK");
});

app.get("/sse/smoke", (c) => {
  return streamSSE(c, async (stream) => {
    for (let i = 0; i < 5; i++) {
      await stream.writeSSE({
        data: JSON.stringify({ tick: i, ts: Date.now() }),
        event: "tick",
        id: String(i),
      });
      if (i < 4) {
        await stream.sleep(1000);
      }
    }
  });
});

app.get("/sse/agent-step-session-events", (c) => {
  const projectId = c.req.query("projectId")?.trim();
  const stepExecutionId = c.req.query("stepExecutionId")?.trim();

  if (!projectId || !stepExecutionId) {
    return c.json({ error: "Missing required query params: projectId and stepExecutionId" }, 400);
  }

  return streamSSE(c, async (stream) => {
    let runtimeStream: Stream.Stream<AgentStepSseEnvelope, unknown>;

    try {
      runtimeStream = await Effect.runPromise(
        Effect.gen(function* () {
          const service = yield* AgentStepEventStreamService;
          return service.streamSessionEvents({ projectId, stepExecutionId });
        }).pipe(Effect.provide(mcpServiceLayer)),
      );
    } catch (error) {
      await stream.writeSSE({
        event: "error",
        data: JSON.stringify({
          version: "v1",
          stream: "agent_step_session_events",
          eventType: "error",
          stepExecutionId,
          data: {
            error: {
              _tag: "HarnessExecutionError",
              operation: "stream_events",
              message: toErrorMessage(error),
            },
          },
        } satisfies AgentStepSseEnvelope),
      });
      return;
    }

    const exit = await Effect.runPromiseExit(
      Stream.runForEach(runtimeStream, (event) =>
        Effect.promise(() =>
          stream.writeSSE({
            event: event.eventType,
            data: JSON.stringify(event),
            id: `${event.stepExecutionId}:${event.eventType}:${Date.now()}`,
          }),
        ),
      ).pipe(Effect.provide(mcpServiceLayer)),
    );

    if (exit._tag === "Failure") {
      const failure = Cause.failureOption(exit.cause);
      const error = Option.isSome(failure) ? failure.value : Cause.squash(exit.cause);

      await stream.writeSSE({
        event: "error",
        data: JSON.stringify({
          version: "v1",
          stream: "agent_step_session_events",
          eventType: "error",
          stepExecutionId,
          data: {
            error: {
              _tag: "HarnessExecutionError",
              operation: "stream_events",
              message: toErrorMessage(error),
            },
          },
        } satisfies AgentStepSseEnvelope),
      });
    }
  });
});

export default app;
