import type {
  AxResolveContext,
  AxSignatureRecord,
  AxSignatureInput,
  AxInputSource,
} from "./ax-types";

export interface AxDbQueryRequest {
  table: string;
  where?: Record<string, unknown>;
  select: string[];
  limit?: number;
  orderBy?: { field: string; direction: "asc" | "desc" };
}

export interface AxResolverDeps {
  resolveTemplate?: (template: string, data: Record<string, unknown>) => string;
  dbQuery?: (request: AxDbQueryRequest) => Promise<unknown[]>;
}

export async function resolveAxInputs(
  signature: AxSignatureRecord,
  ctx: AxResolveContext,
  deps: AxResolverDeps = {},
): Promise<Record<string, unknown>> {
  const resolved: Record<string, unknown> = {};

  for (const input of signature.inputs) {
    resolved[input.name] = await resolveAxInput(input, ctx, deps);
  }

  return resolved;
}

async function resolveAxInput(
  input: AxSignatureInput,
  ctx: AxResolveContext,
  deps: AxResolverDeps,
): Promise<unknown> {
  const source = input.source;

  switch (source.type) {
    case "variable":
      return ctx.variables[source.variableName];
    case "context":
      return resolveContextValue(source, ctx);
    case "system":
      return resolveSystemValue(source, ctx);
    case "db":
      if (!deps.dbQuery) {
        throw new Error("AX resolver requires dbQuery for db sources");
      }
      return deps.dbQuery(source);
    case "literal":
      return source.value;
    case "template":
      if (!deps.resolveTemplate) {
        throw new Error("AX resolver requires resolveTemplate for template sources");
      }
      return deps.resolveTemplate(source.template, {
        variables: ctx.variables,
        context: {
          conversationHistory: ctx.conversationHistory,
          stepNumber: ctx.stepNumber,
          stepType: ctx.stepType,
        },
        system: {
          userId: ctx.userId,
          executionId: ctx.executionId,
          stepExecutionId: ctx.stepExecutionId,
        },
      });
    default:
      return assertUnreachable(source);
  }
}

function resolveContextValue(source: AxInputSource, ctx: AxResolveContext) {
  if (source.type !== "context") return undefined;
  if (source.contextKey === "conversation_history") {
    return ctx.conversationHistory;
  }
  if (source.contextKey === "step_metadata") {
    return {
      stepNumber: ctx.stepNumber,
      stepType: ctx.stepType,
      executionId: ctx.executionId,
      stepExecutionId: ctx.stepExecutionId,
    };
  }
  return undefined;
}

function resolveSystemValue(source: AxInputSource, ctx: AxResolveContext) {
  if (source.type !== "system") return undefined;
  switch (source.key) {
    case "userId":
      return ctx.userId;
    case "executionId":
      return ctx.executionId;
    case "stepExecutionId":
      return ctx.stepExecutionId;
    case "timestamp":
      return new Date().toISOString();
    default:
      return ctx.system?.[source.key];
  }
}

function assertUnreachable(value: never): never {
  throw new Error(`Unhandled AX input source: ${JSON.stringify(value)}`);
}
