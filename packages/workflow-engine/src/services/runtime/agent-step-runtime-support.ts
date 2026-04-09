import type {
  AgentStepContractBoundary,
  AgentStepReadableContextFact,
  AgentStepRuntimeState,
  AgentStepRuntimeWriteItem,
} from "@chiron/contracts/agent-step/runtime";
import type { AgentStepDesignTimePayload } from "@chiron/contracts/agent-step/design-time";
import { AGENT_STEP_ALLOWED_STATE_TRANSITIONS } from "@chiron/contracts/agent-step/runtime";
import { AgentStepStateTransitionError } from "@chiron/contracts/agent-step/errors";
import type {
  WorkflowContextFactDto,
  WorkflowContextFactKind,
} from "@chiron/contracts/methodology/workflow";
import type {
  WorkUnitTypeRow,
  WorkflowAgentStepDefinitionReadModel,
  WorkflowEditorDefinitionReadModel,
} from "@chiron/methodology-engine";
import { Effect } from "effect";

import { RepositoryError } from "../../errors";
import type { AgentStepExecutionHarnessBindingRow } from "../../repositories/agent-step-execution-harness-binding-repository";
import type { AgentStepExecutionStateRow } from "../../repositories/agent-step-execution-state-repository";
import type { WorkflowExecutionDetailReadModel } from "../../repositories/execution-read-repository";
import type {
  RuntimeStepExecutionRow,
  RuntimeWorkflowExecutionContextFactRow,
} from "../../repositories/step-execution-repository";

export const AGENT_STEP_CONTRACT_BOUNDARY: AgentStepContractBoundary = {
  version: "v1",
  supportedMcpTools: ["read_step_snapshot", "read_context_value", "write_context_value"],
  requestContextAccess: false,
  continuationMode: "bootstrap_only",
  nativeMessageLog: false,
  persistedWritePolicy: "applied_only",
  streamContract: {
    streamName: "agent_step_session_events",
    streamCount: 1,
    transport: "sse",
    source: "step_execution_scoped",
    purpose: "timeline_and_tool_activity",
  },
};

export interface AgentStepRuntimeResolvedContext {
  readonly stepExecution: RuntimeStepExecutionRow;
  readonly workflowDetail: WorkflowExecutionDetailReadModel;
  readonly projectPin: {
    readonly projectId: string;
    readonly methodologyVersionId: string;
  };
  readonly workUnitType: WorkUnitTypeRow;
  readonly workflowEditor: WorkflowEditorDefinitionReadModel;
  readonly agentPayload: AgentStepDesignTimePayload;
  readonly runtimeState: AgentStepRuntimeState;
  readonly stateRow: AgentStepExecutionStateRow | null;
  readonly bindingRow: AgentStepExecutionHarnessBindingRow | null;
  readonly contextFacts: readonly RuntimeWorkflowExecutionContextFactRow[];
  readonly readableContextFacts: readonly AgentStepReadableContextFact[];
  readonly writeItems: readonly AgentStepRuntimeWriteItem[];
  readonly contextFactById: ReadonlyMap<string, WorkflowContextFactDto>;
}

export interface AgentStepRuntimeResolutionDeps {
  readonly stepRepo: {
    readonly getStepExecutionById: (
      stepExecutionId: string,
    ) => Effect.Effect<RuntimeStepExecutionRow | null, RepositoryError>;
  };
  readonly readRepo: {
    readonly getWorkflowExecutionDetail: (
      workflowExecutionId: string,
    ) => Effect.Effect<WorkflowExecutionDetailReadModel | null, RepositoryError>;
  };
  readonly projectContextRepo: {
    readonly findProjectPin: (
      projectId: string,
    ) => Effect.Effect<AgentStepRuntimeResolvedContext["projectPin"] | null, RepositoryError>;
  };
  readonly lifecycleRepo: {
    readonly findWorkUnitTypes: (
      versionId: string,
    ) => Effect.Effect<readonly WorkUnitTypeRow[], RepositoryError>;
  };
  readonly methodologyRepo: {
    readonly getWorkflowEditorDefinition: (params: {
      versionId: string;
      workUnitTypeKey: string;
      workflowDefinitionId: string;
    }) => Effect.Effect<WorkflowEditorDefinitionReadModel, RepositoryError>;
    readonly listAgentStepDefinitions: (params: {
      versionId: string;
      workflowDefinitionId: string;
    }) => Effect.Effect<readonly WorkflowAgentStepDefinitionReadModel[], RepositoryError>;
    readonly getAgentStepDefinition?: (params: {
      versionId: string;
      workflowDefinitionId: string;
      stepId: string;
    }) => Effect.Effect<WorkflowAgentStepDefinitionReadModel, RepositoryError>;
  };
  readonly stateRepo: {
    readonly getStateByStepExecutionId: (
      stepExecutionId: string,
    ) => Effect.Effect<AgentStepExecutionStateRow | null, RepositoryError>;
    readonly updateState: (params: {
      stepExecutionId: string;
      state?: AgentStepRuntimeState;
      bootstrapAppliedAt?: Date | null;
    }) => Effect.Effect<AgentStepExecutionStateRow | null, RepositoryError>;
    readonly createState: (params: {
      stepExecutionId: string;
      state?: AgentStepRuntimeState;
      bootstrapAppliedAt?: Date | null;
    }) => Effect.Effect<AgentStepExecutionStateRow, RepositoryError>;
  };
  readonly bindingRepo: {
    readonly getBindingByStepExecutionId: (
      stepExecutionId: string,
    ) => Effect.Effect<AgentStepExecutionHarnessBindingRow | null, RepositoryError>;
  };
  readonly contextQuery: {
    readonly listContextFacts: (
      workflowExecutionId: string,
    ) => Effect.Effect<readonly RuntimeWorkflowExecutionContextFactRow[], RepositoryError>;
  };
}

const DEFAULT_HARNESS_ID = "opencode" as const;

const getFactIdentifier = (fact: WorkflowContextFactDto) =>
  fact.contextFactDefinitionId ?? fact.key;

export const toIso = (value: Date | null | undefined): string | undefined =>
  value ? value.toISOString() : undefined;

export const makeAgentRuntimeRepositoryError = (
  operation: string,
  cause: unknown,
): RepositoryError => new RepositoryError({ operation, cause });

export function deriveReadableContextFacts(params: {
  payload: AgentStepDesignTimePayload;
  contextFacts: readonly WorkflowContextFactDto[];
}): readonly AgentStepReadableContextFact[] {
  const factById = new Map(params.contextFacts.map((fact) => [getFactIdentifier(fact), fact]));
  const readable = new Map<string, AgentStepReadableContextFact>();

  for (const grant of params.payload.explicitReadGrants) {
    const fact = factById.get(grant.contextFactDefinitionId);
    if (!fact) {
      continue;
    }

    readable.set(grant.contextFactDefinitionId, {
      contextFactDefinitionId: grant.contextFactDefinitionId,
      contextFactKind: fact.kind,
      source: "explicit",
    });
  }

  for (const writeItem of params.payload.writeItems) {
    if (readable.has(writeItem.contextFactDefinitionId)) {
      continue;
    }

    const fact = factById.get(writeItem.contextFactDefinitionId);
    if (!fact) {
      continue;
    }

    readable.set(writeItem.contextFactDefinitionId, {
      contextFactDefinitionId: writeItem.contextFactDefinitionId,
      contextFactKind: fact.kind,
      source: "inferred_from_write",
    });
  }

  return [...readable.values()];
}

export function deriveRuntimeWriteItems(
  payload: AgentStepDesignTimePayload,
): readonly AgentStepRuntimeWriteItem[] {
  return [...payload.writeItems]
    .sort(
      (left, right) =>
        left.order - right.order || left.writeItemId.localeCompare(right.writeItemId),
    )
    .map((item) => ({
      writeItemId: item.writeItemId,
      contextFactDefinitionId: item.contextFactDefinitionId,
      contextFactKind: item.contextFactKind,
      order: item.order,
      requirementContextFactDefinitionIds: [...item.requirementContextFactDefinitionIds],
      exposureMode: "requirements_only",
    }));
}

export function deriveRuntimeState(params: {
  stepExecution: RuntimeStepExecutionRow;
  stateRow: AgentStepExecutionStateRow | null;
}): AgentStepRuntimeState {
  if (params.stateRow) {
    return params.stateRow.state;
  }

  return params.stepExecution.status === "completed" ? "completed" : "not_started";
}

export function isAllowedAgentStepStateTransition(
  from: AgentStepRuntimeState,
  to: AgentStepRuntimeState,
): boolean {
  if (from === to) {
    return true;
  }

  return AGENT_STEP_ALLOWED_STATE_TRANSITIONS[from].includes(to as never);
}

export function buildComposerState(state: AgentStepRuntimeState) {
  switch (state) {
    case "not_started":
      return {
        enabled: false,
        startSessionVisible: true,
        reasonIfDisabled: "Start the session first.",
      } as const;
    case "starting_session":
      return {
        enabled: false,
        startSessionVisible: false,
        reasonIfDisabled: "Session startup is in progress.",
      } as const;
    case "active_streaming":
    case "active_idle":
      return {
        enabled: true,
        startSessionVisible: false,
      } as const;
    case "disconnected_or_error":
      return {
        enabled: false,
        startSessionVisible: true,
        reasonIfDisabled: "The session disconnected. Start again to recover.",
      } as const;
    case "completed":
      return {
        enabled: false,
        startSessionVisible: false,
        reasonIfDisabled: "This Agent step execution is completed.",
      } as const;
  }
}

export function normalizeHarnessBinding(params: {
  payload: AgentStepDesignTimePayload;
  bindingRow: AgentStepExecutionHarnessBindingRow | null;
}) {
  if (params.bindingRow) {
    return {
      harnessId: params.bindingRow.harnessId as "opencode",
      bindingState: params.bindingRow.bindingState,
      ...(params.bindingRow.sessionId ? { sessionId: params.bindingRow.sessionId } : {}),
      ...(params.bindingRow.serverInstanceId
        ? { serverInstanceId: params.bindingRow.serverInstanceId }
        : {}),
      ...(params.bindingRow.serverBaseUrl
        ? { serverBaseUrl: params.bindingRow.serverBaseUrl }
        : {}),
      ...(params.bindingRow.selectedAgentKey
        ? { selectedAgent: params.bindingRow.selectedAgentKey }
        : {}),
      ...(params.bindingRow.selectedModelJson
        ? { selectedModel: params.bindingRow.selectedModelJson }
        : {}),
    } as const;
  }

  return {
    harnessId: (params.payload.harnessSelection.harness ?? DEFAULT_HARNESS_ID) as "opencode",
    bindingState: "unbound" as const,
    ...(params.payload.harnessSelection.agent
      ? { selectedAgent: params.payload.harnessSelection.agent }
      : {}),
    ...(params.payload.harnessSelection.model
      ? { selectedModel: params.payload.harnessSelection.model }
      : {}),
  };
}

export function buildTimelineCursor(
  items: readonly import("@chiron/contracts/agent-step/runtime").AgentStepTimelineItem[],
) {
  if (items.length === 0) {
    return {};
  }

  return {
    before: items[0]?.timelineItemId,
    after: items[items.length - 1]?.timelineItemId,
  };
}

export function listUnsatisfiedRequirementIds(params: {
  writeItem: AgentStepRuntimeWriteItem;
  contextFacts: readonly import("../../repositories/step-execution-repository").RuntimeWorkflowExecutionContextFactRow[];
}): readonly string[] {
  const satisfied = new Set(params.contextFacts.map((fact) => fact.contextFactDefinitionId));
  return params.writeItem.requirementContextFactDefinitionIds.filter(
    (requirementId) => !satisfied.has(requirementId),
  );
}

export function listExposedWriteItemIds(params: {
  writeItems: readonly AgentStepRuntimeWriteItem[];
  contextFacts: readonly import("../../repositories/step-execution-repository").RuntimeWorkflowExecutionContextFactRow[];
}): readonly string[] {
  return params.writeItems
    .filter((writeItem) => listUnsatisfiedRequirementIds({ ...params, writeItem }).length === 0)
    .map((writeItem) => writeItem.writeItemId);
}

export function valueJsonToCurrentValues(params: {
  contextFactDefinitionId: string;
  valueJson: unknown;
}): readonly {
  contextFactDefinitionId: string;
  instanceOrder: number;
  valueJson: unknown;
}[] {
  if (params.valueJson === null || params.valueJson === undefined || params.valueJson === "") {
    return [];
  }

  if (Array.isArray(params.valueJson)) {
    return params.valueJson.flatMap((entry, instanceOrder) =>
      entry === null || entry === undefined || entry === ""
        ? []
        : [
            {
              contextFactDefinitionId: params.contextFactDefinitionId,
              instanceOrder,
              valueJson: entry,
            },
          ],
    );
  }

  return [
    {
      contextFactDefinitionId: params.contextFactDefinitionId,
      instanceOrder: 0,
      valueJson: params.valueJson,
    },
  ];
}

export function transitionAgentStepState(params: {
  stepExecutionId: string;
  from: AgentStepRuntimeState;
  to: AgentStepRuntimeState;
  stateRepo: AgentStepRuntimeResolutionDeps["stateRepo"];
}) {
  return Effect.gen(function* () {
    if (!isAllowedAgentStepStateTransition(params.from, params.to)) {
      return yield* new AgentStepStateTransitionError({
        fromState: params.from,
        toState: params.to,
        message: `Agent step transition '${params.from}' -> '${params.to}' is not allowed.`,
      });
    }

    if (params.from === params.to) {
      const existing = yield* params.stateRepo.getStateByStepExecutionId(params.stepExecutionId);
      return (
        existing ??
        (yield* params.stateRepo.createState({
          stepExecutionId: params.stepExecutionId,
          state: params.to,
        }))
      );
    }

    const updated = yield* params.stateRepo.updateState({
      stepExecutionId: params.stepExecutionId,
      state: params.to,
    });

    return (
      updated ??
      (yield* params.stateRepo.createState({
        stepExecutionId: params.stepExecutionId,
        state: params.to,
      }))
    );
  });
}

export function ensureAgentStepRuntimeContext(
  deps: AgentStepRuntimeResolutionDeps,
  params: {
    stepExecutionId: string;
    projectId?: string;
  },
): Effect.Effect<AgentStepRuntimeResolvedContext, RepositoryError> {
  return Effect.gen(function* () {
    const stepExecution = yield* deps.stepRepo.getStepExecutionById(params.stepExecutionId);
    if (!stepExecution) {
      return yield* Effect.fail(
        makeAgentRuntimeRepositoryError(
          "agent-step-runtime.resolve",
          `Step execution '${params.stepExecutionId}' was not found.`,
        ),
      );
    }

    if (stepExecution.stepType !== "agent") {
      return yield* Effect.fail(
        makeAgentRuntimeRepositoryError(
          "agent-step-runtime.resolve",
          `Step execution '${params.stepExecutionId}' is not an Agent step.`,
        ),
      );
    }

    const workflowDetail = yield* deps.readRepo.getWorkflowExecutionDetail(
      stepExecution.workflowExecutionId,
    );
    if (!workflowDetail) {
      return yield* Effect.fail(
        makeAgentRuntimeRepositoryError(
          "agent-step-runtime.resolve",
          `Workflow execution '${stepExecution.workflowExecutionId}' was not found.`,
        ),
      );
    }

    if (params.projectId && workflowDetail.projectId !== params.projectId) {
      return yield* Effect.fail(
        makeAgentRuntimeRepositoryError(
          "agent-step-runtime.resolve",
          "Agent step execution does not belong to the requested project.",
        ),
      );
    }

    const projectPin = yield* deps.projectContextRepo.findProjectPin(workflowDetail.projectId);
    if (!projectPin) {
      return yield* Effect.fail(
        makeAgentRuntimeRepositoryError(
          "agent-step-runtime.resolve",
          `Project '${workflowDetail.projectId}' is missing a methodology pin.`,
        ),
      );
    }

    const [workUnitTypes, workflowEditor, stateRow, bindingRow, contextFacts] = yield* Effect.all([
      deps.lifecycleRepo.findWorkUnitTypes(projectPin.methodologyVersionId),
      Effect.gen(function* () {
        const workUnitTypes = yield* deps.lifecycleRepo.findWorkUnitTypes(
          projectPin.methodologyVersionId,
        );
        const workUnitType = workUnitTypes.find(
          (candidate) => candidate.id === workflowDetail.workUnitTypeId,
        );
        if (!workUnitType) {
          return yield* Effect.fail(
            makeAgentRuntimeRepositoryError(
              "agent-step-runtime.resolve",
              `Work-unit type '${workflowDetail.workUnitTypeId}' was not found.`,
            ),
          );
        }

        return yield* deps.methodologyRepo.getWorkflowEditorDefinition({
          versionId: projectPin.methodologyVersionId,
          workUnitTypeKey: workUnitType.key,
          workflowDefinitionId: workflowDetail.workflowExecution.workflowId,
        });
      }),
      deps.stateRepo.getStateByStepExecutionId(stepExecution.id),
      deps.bindingRepo.getBindingByStepExecutionId(stepExecution.id),
      deps.contextQuery.listContextFacts(stepExecution.workflowExecutionId),
    ]);

    const workUnitType = workUnitTypes.find(
      (candidate) => candidate.id === workflowDetail.workUnitTypeId,
    );
    if (!workUnitType) {
      return yield* Effect.fail(
        makeAgentRuntimeRepositoryError(
          "agent-step-runtime.resolve",
          `Work-unit type '${workflowDetail.workUnitTypeId}' was not found.`,
        ),
      );
    }

    const agentStepDefinition =
      typeof deps.methodologyRepo.getAgentStepDefinition === "function"
        ? yield* deps.methodologyRepo.getAgentStepDefinition({
            versionId: projectPin.methodologyVersionId,
            workflowDefinitionId: workflowDetail.workflowExecution.workflowId,
            stepId: stepExecution.stepDefinitionId,
          })
        : yield* Effect.gen(function* () {
            const definitions = yield* deps.methodologyRepo.listAgentStepDefinitions({
              versionId: projectPin.methodologyVersionId,
              workflowDefinitionId: workflowDetail.workflowExecution.workflowId,
            });
            const definition = definitions.find(
              (candidate) => candidate.stepId === stepExecution.stepDefinitionId,
            );
            if (!definition) {
              return yield* Effect.fail(
                makeAgentRuntimeRepositoryError(
                  "agent-step-runtime.resolve",
                  `Agent step definition '${stepExecution.stepDefinitionId}' was not found.`,
                ),
              );
            }
            return definition;
          });

    const contextFactById = new Map(
      workflowEditor.contextFacts.map((fact) => [getFactIdentifier(fact), fact]),
    );

    return {
      stepExecution,
      workflowDetail,
      projectPin,
      workUnitType,
      workflowEditor,
      agentPayload: agentStepDefinition.payload,
      runtimeState: deriveRuntimeState({ stepExecution, stateRow }),
      stateRow,
      bindingRow,
      contextFacts,
      readableContextFacts: deriveReadableContextFacts({
        payload: agentStepDefinition.payload,
        contextFacts: workflowEditor.contextFacts,
      }),
      writeItems: deriveRuntimeWriteItems(agentStepDefinition.payload),
      contextFactById,
    } satisfies AgentStepRuntimeResolvedContext;
  });
}

export function getContextFactKindOrFail(params: {
  contextFactById: ReadonlyMap<string, WorkflowContextFactDto>;
  contextFactDefinitionId: string;
  operation: string;
}): Effect.Effect<WorkflowContextFactKind, RepositoryError> {
  return Effect.gen(function* () {
    const fact = params.contextFactById.get(params.contextFactDefinitionId);
    if (!fact) {
      return yield* Effect.fail(
        makeAgentRuntimeRepositoryError(
          params.operation,
          `Workflow context fact '${params.contextFactDefinitionId}' was not found.`,
        ),
      );
    }

    return fact.kind;
  });
}
