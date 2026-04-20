import type { ReadContextValueInput, ReadContextValueOutput } from "@chiron/contracts/mcp/tools";
import { McpToolValidationError } from "@chiron/contracts/agent-step/errors";
import { LifecycleRepository, MethodologyRepository } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";
import { Context, Effect, Layer } from "effect";

import { RepositoryError } from "../../errors";
import { AgentStepExecutionHarnessBindingRepository } from "../../repositories/agent-step-execution-harness-binding-repository";
import { AgentStepExecutionStateRepository } from "../../repositories/agent-step-execution-state-repository";
import { ExecutionReadRepository } from "../../repositories/execution-read-repository";
import { ProjectWorkUnitRepository } from "../../repositories/project-work-unit-repository";
import { StepExecutionRepository } from "../../repositories/step-execution-repository";
import { RuntimeWorkUnitService } from "../runtime-work-unit-service";
import { StepContextQueryService } from "../step-context-query-service";
import { ensureAgentStepRuntimeContext, toIso } from "./agent-step-runtime-support";

type AgentStepContextReadServiceError = RepositoryError | McpToolValidationError;

export class AgentStepContextReadService extends Context.Tag(
  "@chiron/workflow-engine/services/runtime/AgentStepContextReadService",
)<
  AgentStepContextReadService,
  {
    readonly readContextValue: (
      input: ReadContextValueInput,
    ) => Effect.Effect<ReadContextValueOutput, AgentStepContextReadServiceError>;
  }
>() {}

export const AgentStepContextReadServiceLive = Layer.effect(
  AgentStepContextReadService,
  Effect.gen(function* () {
    const stepRepo = yield* StepExecutionRepository;
    const readRepo = yield* ExecutionReadRepository;
    const projectWorkUnitRepo = yield* ProjectWorkUnitRepository;
    const projectContextRepo = yield* ProjectContextRepository;
    const lifecycleRepo = yield* LifecycleRepository;
    const methodologyRepo = yield* MethodologyRepository;
    const stateRepo = yield* AgentStepExecutionStateRepository;
    const bindingRepo = yield* AgentStepExecutionHarnessBindingRepository;
    const contextQuery = yield* StepContextQueryService;
    const runtimeWorkUnitService = yield* RuntimeWorkUnitService;

    type ParsedReadQuery = {
      readonly instanceId: string | undefined;
      readonly limit: number | undefined;
      readonly disclosure: {
        readonly facts: boolean;
        readonly artifacts: boolean;
      };
    };

    const resolveHiddenStepExecutionId = (input: unknown) => {
      const stepExecutionId = (input as { stepExecutionId?: unknown }).stepExecutionId;
      return typeof stepExecutionId === "string" ? stepExecutionId : null;
    };

    const invalidQueryError = (message: string) =>
      new McpToolValidationError({
        toolName: "read_context_value",
        message,
      });

    const parseReadQuery = (args: {
      readonly queryParam: string;
      readonly readableFact: {
        readonly readItemId: string;
        readonly contextFactKind: ReadContextValueOutput["contextFactKind"];
      };
    }): Effect.Effect<ParsedReadQuery, AgentStepContextReadServiceError> =>
      Effect.gen(function* () {
        const params = new URLSearchParams(args.queryParam);
        const allowedKeys = new Set(["instanceId", "expand", "limit"]);

        for (const key of params.keys()) {
          if (!allowedKeys.has(key)) {
            return yield* invalidQueryError(
              `Unsupported queryParam key '${key}' for readItemId '${args.readableFact.readItemId}'.`,
            );
          }
        }

        const expand = new Set(
          params
            .getAll("expand")
            .flatMap((value) => value.split(","))
            .map((value) => value.trim())
            .filter((value) => value.length > 0),
        );
        const invalidExpandValue = [...expand].find(
          (value) => value !== "facts" && value !== "artifacts",
        );
        if (invalidExpandValue) {
          return yield* invalidQueryError(
            `Unsupported expand value '${invalidExpandValue}' for readItemId '${args.readableFact.readItemId}'.`,
          );
        }

        if (expand.size > 0 && args.readableFact.contextFactKind !== "work_unit_draft_spec_fact") {
          return yield* invalidQueryError(
            `Expand directives are only supported for work_unit_draft_spec_fact reads.`,
          );
        }

        const rawLimit = params.get("limit");
        const limit =
          rawLimit == null
            ? undefined
            : yield* Effect.try({
                try: () => {
                  const parsed = Number.parseInt(rawLimit, 10);
                  if (!Number.isInteger(parsed) || parsed <= 0) {
                    throw new Error();
                  }
                  return parsed;
                },
                catch: () =>
                  invalidQueryError(
                    `Query param 'limit' must be a positive integer for readItemId '${args.readableFact.readItemId}'.`,
                  ),
              });

        return {
          instanceId: params.get("instanceId") ?? undefined,
          limit,
          disclosure: {
            facts: expand.has("facts"),
            artifacts: expand.has("artifacts"),
          },
        } satisfies ParsedReadQuery;
      });

    const isStoredWorkUnitDraftValue = (
      value: unknown,
    ): value is {
      readonly projectWorkUnitId: string;
      readonly workUnitFactInstanceIds?: readonly string[];
      readonly artifactSnapshotIds?: readonly string[];
    } => {
      if (typeof value !== "object" || value === null) {
        return false;
      }

      const candidate = value as {
        readonly projectWorkUnitId?: unknown;
        readonly workUnitFactInstanceIds?: unknown;
        readonly artifactSnapshotIds?: unknown;
      };

      return typeof candidate.projectWorkUnitId === "string";
    };

    const discloseValue = (args: {
      readonly projectId: string;
      readonly contextFactKind: ReadContextValueOutput["contextFactKind"];
      readonly instanceId: string;
      readonly value: unknown;
      readonly disclosure?: ParsedReadQuery["disclosure"];
    }): Effect.Effect<unknown, AgentStepContextReadServiceError> =>
      Effect.gen(function* () {
        if (args.contextFactKind !== "work_unit_draft_spec_fact") {
          return args.value;
        }

        if (!isStoredWorkUnitDraftValue(args.value)) {
          return args.value;
        }

        const disclosure = args.disclosure ?? { facts: false, artifacts: false };

        const directWorkUnit = yield* projectWorkUnitRepo.getProjectWorkUnitById(
          args.value.projectWorkUnitId,
        );
        if (!directWorkUnit || directWorkUnit.projectId !== args.projectId) {
          return args.value;
        }

        return yield* runtimeWorkUnitService
          .readWorkUnitReference({
            projectId: args.projectId,
            projectWorkUnitId: args.value.projectWorkUnitId,
            ...(args.value.workUnitFactInstanceIds
              ? { workUnitFactInstanceIds: args.value.workUnitFactInstanceIds }
              : {}),
            ...(args.value.artifactSnapshotIds
              ? { artifactSnapshotIds: args.value.artifactSnapshotIds }
              : {}),
            disclosure,
          })
          .pipe(Effect.map((reference) => reference ?? args.value));
      });

    const readContextValue = (input: ReadContextValueInput) =>
      Effect.gen(function* () {
        const hiddenStepExecutionId = resolveHiddenStepExecutionId(input);

        if (!hiddenStepExecutionId) {
          return yield* new McpToolValidationError({
            toolName: "read_context_value",
            message: "read_context_value requires an internal step execution scope.",
          });
        }

        const context = yield* ensureAgentStepRuntimeContext(
          {
            stepRepo,
            readRepo,
            projectContextRepo,
            lifecycleRepo,
            methodologyRepo,
            stateRepo,
            bindingRepo,
            contextQuery,
          },
          { stepExecutionId: hiddenStepExecutionId },
        );

        const readableFact = context.readableContextFacts.find(
          (fact) => fact.readItemId === input.readItemId,
        );
        if (!readableFact) {
          return yield* new McpToolValidationError({
            toolName: "read_context_value",
            message: `Context fact '${input.readItemId}' is outside the Agent step read scope.`,
          });
        }

        if (!readableFact.supportedReadModes.includes(input.mode)) {
          return yield* new McpToolValidationError({
            toolName: "read_context_value",
            message: `Read mode '${input.mode}' is not supported for readItemId '${input.readItemId}'.`,
          });
        }

        const query =
          input.mode === "query"
            ? yield* parseReadQuery({ queryParam: input.queryParam, readableFact })
            : null;

        const filteredValues = context.contextFacts
          .filter((fact) => fact.contextFactDefinitionId === readableFact.contextFactDefinitionId)
          .filter((fact) =>
            query?.instanceId ? (fact.instanceId ?? fact.id) === query.instanceId : true,
          )
          .sort((left, right) => left.instanceOrder - right.instanceOrder);

        const matchingValues = (
          input.mode === "latest"
            ? filteredValues.length > 0
              ? [filteredValues[filteredValues.length - 1]!]
              : []
            : filteredValues
        ).slice(0, query?.limit);

        const values = yield* Effect.forEach(matchingValues, (fact) =>
          Effect.gen(function* () {
            const value = yield* discloseValue({
              projectId: context.workflowDetail.projectId,
              contextFactKind: readableFact.contextFactKind,
              instanceId: fact.instanceId ?? fact.id,
              value: fact.valueJson,
              ...(query ? { disclosure: query.disclosure } : {}),
            });

            return {
              instanceId: fact.instanceId ?? fact.id,
              value,
              recordedAt: toIso(fact.createdAt),
            };
          }),
        );

        return {
          readItemId: input.readItemId,
          mode: input.mode,
          ...(input.mode === "query" ? { queryParam: input.queryParam } : {}),
          contextFactDefinitionId: readableFact.contextFactDefinitionId,
          contextFactKind: readableFact.contextFactKind,
          values,
        } satisfies ReadContextValueOutput;
      });

    return AgentStepContextReadService.of({ readContextValue });
  }),
);
