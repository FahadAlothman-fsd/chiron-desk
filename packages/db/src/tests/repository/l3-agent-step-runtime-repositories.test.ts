import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";

import { createClient, type Client } from "@libsql/client";
import { Effect, Layer } from "effect";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";

import {
  AgentStepExecutionAppliedWriteRepository,
  AgentStepExecutionHarnessBindingRepository,
  AgentStepExecutionStateRepository,
} from "@chiron/workflow-engine";

import * as schema from "../../schema";
import { createAgentStepExecutionAppliedWriteRepoLayer } from "../../runtime-repositories/agent-step-execution-applied-write-repository";
import { createAgentStepExecutionHarnessBindingRepoLayer } from "../../runtime-repositories/agent-step-execution-harness-binding-repository";
import { createAgentStepExecutionStateRepoLayer } from "../../runtime-repositories/agent-step-execution-state-repository";

const SCHEMA_SQL = [
  `CREATE TABLE step_executions (id TEXT PRIMARY KEY)`,
  `CREATE TABLE agent_step_execution_state (
    id TEXT PRIMARY KEY,
    step_execution_id TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'not_started',
    bootstrap_applied_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    FOREIGN KEY(step_execution_id) REFERENCES step_executions(id) ON DELETE CASCADE,
    UNIQUE(step_execution_id)
  )`,
  `CREATE TABLE agent_step_execution_harness_binding (
    id TEXT PRIMARY KEY,
    step_execution_id TEXT NOT NULL,
    harness_id TEXT NOT NULL DEFAULT 'opencode',
    binding_state TEXT NOT NULL DEFAULT 'unbound',
    session_id TEXT,
    server_instance_id TEXT,
    server_base_url TEXT,
    selected_agent_key TEXT,
    selected_model_json TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    FOREIGN KEY(step_execution_id) REFERENCES step_executions(id) ON DELETE CASCADE,
    UNIQUE(step_execution_id)
  )`,
  `CREATE TABLE agent_step_execution_applied_writes (
    id TEXT PRIMARY KEY,
    step_execution_id TEXT NOT NULL,
    write_item_id TEXT NOT NULL,
    context_fact_definition_id TEXT NOT NULL,
    context_fact_kind TEXT NOT NULL,
    instance_order INTEGER NOT NULL,
    applied_value_json TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    FOREIGN KEY(step_execution_id) REFERENCES step_executions(id) ON DELETE CASCADE
  )`,
];

describe("l3 agent-step runtime repositories", () => {
  let client: Client;
  let db: LibSQLDatabase<typeof schema>;
  let dbPath: string;

  beforeEach(async () => {
    dbPath = `/tmp/chiron-l3-agent-step-runtime-repo-${randomUUID()}.db`;
    client = createClient({ url: `file:${dbPath}` });
    db = drizzle(client, { schema });

    await client.execute("PRAGMA foreign_keys = ON");
    for (const statement of SCHEMA_SQL) {
      await client.execute(statement);
    }

    await client.execute(
      `INSERT INTO step_executions (id) VALUES ('step-exec-1'), ('step-exec-2')`,
    );
  });

  afterEach(async () => {
    client?.close();
    rmSync(dbPath, { force: true });
  });

  const testLayer = (dbClient: LibSQLDatabase<typeof schema>) =>
    Layer.mergeAll(
      createAgentStepExecutionStateRepoLayer(dbClient),
      createAgentStepExecutionHarnessBindingRepoLayer(dbClient),
      createAgentStepExecutionAppliedWriteRepoLayer(dbClient),
    );

  const run = <A>(
    program: Effect.Effect<
      A,
      unknown,
      | AgentStepExecutionStateRepository
      | AgentStepExecutionHarnessBindingRepository
      | AgentStepExecutionAppliedWriteRepository
    >,
  ): Promise<A> => Effect.runPromise(program.pipe(Effect.provide(testLayer(db))));

  it("supports CRUD for chiron-owned runtime state rows", async () => {
    const result = await run(
      Effect.gen(function* () {
        const repo = yield* AgentStepExecutionStateRepository;

        const created = yield* repo.createState({ stepExecutionId: "step-exec-1" });
        const loaded = yield* repo.getStateByStepExecutionId("step-exec-1");
        const updated = yield* repo.updateState({
          stepExecutionId: "step-exec-1",
          state: "active_idle",
          bootstrapAppliedAt: new Date("2026-04-09T12:00:00.000Z"),
        });
        yield* repo.deleteStateByStepExecutionId("step-exec-1");
        const deleted = yield* repo.getStateByStepExecutionId("step-exec-1");

        return { created, loaded, updated, deleted };
      }),
    );

    expect(result.created.state).toBe("not_started");
    expect(result.loaded?.id).toBe(result.created.id);
    expect(result.updated?.state).toBe("active_idle");
    expect(result.updated?.bootstrapAppliedAt?.toISOString()).toBe("2026-04-09T12:00:00.000Z");
    expect(result.deleted).toBeNull();
  });

  it("enforces one harness binding row per step execution and supports CRUD updates", async () => {
    const result = await run(
      Effect.gen(function* () {
        const repo = yield* AgentStepExecutionHarnessBindingRepository;

        const created = yield* repo.createBinding({
          stepExecutionId: "step-exec-1",
          bindingState: "binding",
        });

        const updated = yield* repo.updateBinding({
          stepExecutionId: "step-exec-1",
          bindingState: "bound",
          sessionId: "session-1",
          serverInstanceId: "server-1",
          serverBaseUrl: "http://127.0.0.1:4010",
          selectedAgentKey: "explore",
          selectedModelJson: { provider: "openai", model: "gpt-5.4" },
        });

        const duplicate = yield* Effect.either(
          repo.createBinding({
            stepExecutionId: "step-exec-1",
            bindingState: "binding",
          }),
        );

        yield* repo.deleteBindingByStepExecutionId("step-exec-1");
        const deleted = yield* repo.getBindingByStepExecutionId("step-exec-1");

        return { created, updated, duplicate, deleted };
      }),
    );

    expect(result.created.bindingState).toBe("binding");
    expect(result.updated).toMatchObject({
      bindingState: "bound",
      sessionId: "session-1",
      serverInstanceId: "server-1",
      serverBaseUrl: "http://127.0.0.1:4010",
      selectedAgentKey: "explore",
      selectedModelJson: { provider: "openai", model: "gpt-5.4" },
    });
    expect(result.duplicate._tag).toBe("Left");
    expect(result.deleted).toBeNull();
  });

  it("persists only explicit successful applied writes and lists them by step execution", async () => {
    const result = await run(
      Effect.gen(function* () {
        const stateRepo = yield* AgentStepExecutionStateRepository;
        const bindingRepo = yield* AgentStepExecutionHarnessBindingRepository;
        const writeRepo = yield* AgentStepExecutionAppliedWriteRepository;

        yield* stateRepo.createState({ stepExecutionId: "step-exec-1", state: "active_streaming" });
        yield* bindingRepo.createBinding({
          stepExecutionId: "step-exec-1",
          bindingState: "bound",
          sessionId: "session-1",
        });

        const beforeWrites = yield* writeRepo.listAppliedWritesByStepExecutionId("step-exec-1");

        const firstWrite = yield* writeRepo.createAppliedWrite({
          stepExecutionId: "step-exec-1",
          writeItemId: "write-project-summary",
          contextFactDefinitionId: "ctx-project-summary",
          contextFactKind: "plain_fact",
          instanceOrder: 0,
          appliedValueJson: { markdown: "Drafted summary" },
        });

        const secondWrite = yield* writeRepo.createAppliedWrite({
          stepExecutionId: "step-exec-1",
          writeItemId: "write-review-notes",
          contextFactDefinitionId: "ctx-review-notes",
          contextFactKind: "plain_fact",
          instanceOrder: 1,
          appliedValueJson: "Needs one more pass",
        });

        yield* writeRepo.createAppliedWrite({
          stepExecutionId: "step-exec-2",
          writeItemId: "write-other-step",
          contextFactDefinitionId: "ctx-other",
          contextFactKind: "plain_fact",
          instanceOrder: 0,
          appliedValueJson: "Other step value",
        });

        const listed = yield* writeRepo.listAppliedWritesByStepExecutionId("step-exec-1");

        return { beforeWrites, firstWrite, secondWrite, listed };
      }),
    );

    expect(result.beforeWrites).toEqual([]);
    expect(result.firstWrite.createdAt).toBeInstanceOf(Date);
    expect(result.secondWrite.createdAt).toBeInstanceOf(Date);
    expect(result.listed).toHaveLength(2);
    expect(result.listed).toEqual([
      expect.objectContaining({
        stepExecutionId: "step-exec-1",
        writeItemId: "write-project-summary",
        contextFactDefinitionId: "ctx-project-summary",
        instanceOrder: 0,
        appliedValueJson: { markdown: "Drafted summary" },
      }),
      expect.objectContaining({
        stepExecutionId: "step-exec-1",
        writeItemId: "write-review-notes",
        contextFactDefinitionId: "ctx-review-notes",
        instanceOrder: 1,
        appliedValueJson: "Needs one more pass",
      }),
    ]);
  });
});
