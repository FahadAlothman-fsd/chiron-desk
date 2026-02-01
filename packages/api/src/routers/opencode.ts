import { db, projects, stepExecutions, workflowExecutions, workflowSteps } from "@chiron/db";
import { and, desc, eq } from "drizzle-orm";
import { Effect } from "effect";
import { z } from "zod";
import { publicProcedure, router } from "../index";
import { getSession } from "@chiron/agent-runtime/opencode/session-registry";
import { executeToolCall } from "../services/workflow-engine/effect/tooling-engine";
import { MainLayer } from "../services/workflow-engine/effect";
import { VariableService } from "../services/workflow-engine/effect/variable-service";
import { WorkflowEventBus } from "../services/workflow-engine/effect/event-bus";

const SessionInput = z.object({
  sessionId: z.string(),
  messageId: z.string(),
});

const ActionInput = SessionInput.extend({
  action: z.string(),
  args: z.unknown().optional(),
});

async function resolveSession(sessionId: string) {
  const record = getSession(sessionId);
  if (!record) {
    throw new Error(`Unknown OpenCode session: ${sessionId}`);
  }
  return record;
}

async function resolveExecutionContext(sessionId: string) {
  const record = await resolveSession(sessionId);

  const [execution] = await db
    .select()
    .from(workflowExecutions)
    .where(eq(workflowExecutions.id, record.executionId))
    .limit(1);

  if (!execution) {
    throw new Error(`Execution not found: ${record.executionId}`);
  }

  const [stepExecution] = await db
    .select()
    .from(stepExecutions)
    .where(
      and(
        eq(stepExecutions.executionId, record.executionId),
        eq(stepExecutions.stepId, record.stepId),
      ),
    )
    .orderBy(desc(stepExecutions.createdAt))
    .limit(1);

  const [step] = await db
    .select()
    .from(workflowSteps)
    .where(eq(workflowSteps.id, record.stepId))
    .limit(1);

  const [project] = execution.projectId
    ? await db.select().from(projects).where(eq(projects.id, execution.projectId)).limit(1)
    : [null];

  return {
    record,
    execution,
    stepExecution,
    step,
    project,
  };
}

export const opencodeRouter = router({
  chironContext: publicProcedure.input(SessionInput).mutation(async ({ input }) => {
    const { execution, stepExecution, step, project } = await resolveExecutionContext(
      input.sessionId,
    );

    return {
      context: {
        execution,
        stepExecution,
        step,
        project,
        variables: execution.variables ?? {},
      },
    };
  }),

  chironActions: publicProcedure.input(SessionInput).mutation(async ({ input }) => {
    const { step } = await resolveExecutionContext(input.sessionId);
    const stepConfig = (step?.config ?? {}) as Record<string, unknown>;
    const tools = Array.isArray(stepConfig.tools) ? stepConfig.tools : [];

    const actions = tools.map((tool) => {
      const toolConfig = tool as Record<string, unknown>;
      return {
        name: String(toolConfig.name ?? ""),
        description: String(toolConfig.description ?? ""),
        inputSchema: toolConfig,
      };
    });

    return { actions };
  }),

  chironAction: publicProcedure.input(ActionInput).mutation(async ({ input }) => {
    const { step, record } = await resolveExecutionContext(input.sessionId);
    const stepConfig = (step?.config ?? {}) as Record<string, unknown>;
    const tools = Array.isArray(stepConfig.tools) ? stepConfig.tools : [];
    const toolConfig = tools.find((tool) => (tool as { name?: string }).name === input.action) as
      | Record<string, unknown>
      | undefined;

    if (!toolConfig) {
      throw new Error(`Tool not found: ${input.action}`);
    }

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const variableService = yield* VariableService;
        const eventBus = yield* WorkflowEventBus;

        return yield* executeToolCall({
          toolConfig: toolConfig as any,
          args: (input.args ?? {}) as Record<string, unknown>,
          context: {
            executionId: record.executionId,
            stepId: record.stepId,
            variableService,
            eventBus,
          },
        });
      }).pipe(Effect.provide(MainLayer)),
    );

    return { result };
  }),
});
