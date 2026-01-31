import "dotenv/config";
import type { Serve } from "bun";
import { createContext } from "@chiron/api/context";
import { appRouter } from "@chiron/api/routers/index";
import { auth } from "@chiron/auth";
import { effectWorkflowEventBus } from "@chiron/api/services/workflow-engine/effect/event-bus";
import { eventBusToAsyncGenerator } from "@chiron/api/services/workflow-engine/effect/streaming-adapter";
import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { streamSSE } from "hono/streaming";

const app = new Hono();

const envOrigins = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set([
  ...envOrigins,
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:3003",
  "tauri://localhost",
]);

app.use(logger());
app.use(
  "/*",
  cors({
    origin: (origin) => {
      if (origin && allowedOrigins.has(origin)) {
        return origin;
      }

      return undefined;
    },
    allowMethods: ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    exposeHeaders: ["Set-Cookie"],
  }),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: (_opts, context) => {
      return createContext({ context });
    },
  }),
);

app.get("/api/agent-stream", (c) => {
  const executionId = c.req.query("executionId");
  const stepId = c.req.query("stepId");
  const origin = c.req.header("Origin");

  if (!executionId || !stepId) {
    return c.json({ error: "executionId and stepId are required" }, 400);
  }

  if (origin && !allowedOrigins.has(origin)) {
    return c.json({ error: "Origin not allowed" }, 403);
  }

  if (origin) {
    c.header("Access-Control-Allow-Origin", origin);
    c.header("Access-Control-Allow-Credentials", "true");
    c.header("Vary", "Origin");
  }

  return streamSSE(c, async (stream) => {
    const generator = eventBusToAsyncGenerator(
      effectWorkflowEventBus,
      executionId,
      (event) => event.stepId === stepId,
    );

    for await (const event of generator) {
      if (c.req.raw.signal.aborted) break;
      await stream.writeSSE({
        event: "message",
        data: JSON.stringify(event),
      });
    }
  });
});

app.get("/", (c) => {
  return c.text("OK");
});

export { app };

export default {
  port: Number(process.env.PORT ?? 3000),
  fetch: app.fetch,
  idleTimeout: 255,
} satisfies Serve.Options<undefined>;
