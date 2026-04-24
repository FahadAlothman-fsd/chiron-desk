import { ORPCError } from "@orpc/server";
import { Cause, Effect, Layer, Option, Stream } from "effect";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type {
  ChoosePrimaryWorkflowForTransitionExecutionInput,
  CompleteWorkflowExecutionInput,
  CompleteTransitionExecutionInput,
  GetTransitionExecutionDetailInput,
  SkipActionStepActionItemsInput,
  SkipActionStepActionsInput,
  GetWorkflowExecutionDetailInput,
  RetryActionStepActionsInput,
  RunActionStepActionsInput,
  SaveInvokeWorkUnitTargetDraftInput,
  SaveBranchStepSelectionInput,
  RetrySameWorkflowExecutionInput,
  StartActionStepExecutionInput,
  StartInvokeWorkUnitTargetInput,
  StartInvokeWorkflowTargetInput,
  SubmitFormStepExecutionInput,
  StartTransitionExecutionInput,
  SwitchActiveTransitionExecutionInput,
} from "@chiron/contracts/runtime/executions";
import type {
  CompleteAgentStepExecutionInput,
  GetAgentStepExecutionDetailInput,
  GetAgentStepTimelinePageInput,
  ReconnectAgentStepSessionInput,
  SendAgentStepMessageInput,
  StartAgentStepSessionInput,
  UpdateAgentStepTurnSelectionInput,
} from "@chiron/contracts/agent-step/runtime";

import {
  ActionStepEventStreamService,
  AgentStepEventStreamService,
  AgentStepExecutionDetailService,
  AgentStepSessionCommandService,
  AgentStepTimelineService,
  ActionStepRuntimeService,
  RuntimeArtifactService,
  RuntimeFactService,
  RuntimeGuidanceService,
  RuntimeManualFactCrudService,
  RuntimeOverviewService,
  RuntimeWorkflowIndexService,
  RuntimeWorkUnitService,
  InvokeWorkUnitExecutionService,
  StepExecutionDetailService,
  TransitionExecutionCommandService,
  TransitionExecutionDetailService,
  InvokeWorkflowExecutionService,
  WorkflowExecutionStepCommandService,
  WorkflowExecutionCommandService,
  WorkflowExecutionDetailService,
} from "@chiron/workflow-engine";
import { ProjectContextRepository } from "@chiron/project-context";
import { SandboxGitService } from "@chiron/sandbox-engine";
import { protectedProcedure, publicProcedure } from "../index";

const projectIdInput = z.object({ projectId: z.string().min(1) });

const getRuntimeWorkUnitsInput = z.object({
  projectId: z.string().min(1),
  filters: z
    .object({
      cardinalities: z.array(z.enum(["one", "many"])).optional(),
      workUnitTypeIds: z.array(z.string().min(1)).optional(),
      workUnitTypeKeys: z.array(z.string().min(1)).optional(),
      hasActiveTransition: z.boolean().optional(),
    })
    .optional(),
});

const projectWorkUnitIdInput = z.object({
  projectId: z.string().min(1),
  projectWorkUnitId: z.string().min(1),
});

const getRuntimeProjectFactsInput = z.object({
  projectId: z.string().min(1),
  filters: z
    .object({
      existence: z.enum(["exists", "not_exists"]).optional(),
      factTypes: z.array(z.enum(["string", "number", "boolean", "json"])).optional(),
    })
    .optional(),
});

const getRuntimeProjectFactDetailInput = z.object({
  projectId: z.string().min(1),
  factDefinitionId: z.string().min(1),
});

const getRuntimeWorkUnitFactsInput = z.object({
  projectId: z.string().min(1),
  projectWorkUnitId: z.string().min(1),
  tab: z.enum(["primitive", "work_units"]),
  filters: z
    .object({
      existence: z.enum(["exists", "not_exists"]).optional(),
      primitiveFactTypes: z.array(z.enum(["string", "number", "boolean", "json"])).optional(),
    })
    .optional(),
});

const getRuntimeWorkUnitFactDetailInput = z.object({
  projectId: z.string().min(1),
  projectWorkUnitId: z.string().min(1),
  factDefinitionId: z.string().min(1),
});

const getRuntimeArtifactSlotDetailInput = z.object({
  projectId: z.string().min(1),
  projectWorkUnitId: z.string().min(1),
  slotDefinitionId: z.string().min(1),
});

const getRuntimeArtifactInstanceDialogInput = z.object({
  projectId: z.string().min(1),
  projectWorkUnitId: z.string().min(1),
  slotDefinitionId: z.string().min(1),
  artifactInstanceId: z.string().min(1),
});

const streamRuntimeGuidanceCandidatesInput = z.object({
  projectId: z.string().min(1),
  filters: z
    .object({
      workUnitTypeKeys: z.array(z.string()).optional(),
      transitionKeys: z.array(z.string()).optional(),
      fromStateKeys: z.array(z.string()).optional(),
      toStateKeys: z.array(z.string()).optional(),
    })
    .optional(),
});

const getRuntimeStartGateDetailInput = z.object({
  projectId: z.string().min(1),
  transitionId: z.string().min(1),
  transitionKey: z.string().min(1).optional(),
  projectWorkUnitId: z.string().min(1).optional(),
  futureCandidate: z
    .object({
      workUnitTypeId: z.string().min(1),
      workUnitTypeKey: z.string().min(1).optional(),
      source: z.literal("future"),
    })
    .optional(),
});

const startTransitionExecutionInput: z.ZodType<StartTransitionExecutionInput> = z.object({
  projectId: z.string().min(1),
  transitionId: z.string().min(1),
  workflowId: z.string().min(1),
  workUnit: z.discriminatedUnion("mode", [
    z.object({
      mode: z.literal("existing"),
      projectWorkUnitId: z.string().min(1),
    }),
    z.object({
      mode: z.literal("new"),
      workUnitTypeId: z.string().min(1),
    }),
  ]),
});

const switchActiveTransitionExecutionInput: z.ZodType<SwitchActiveTransitionExecutionInput> =
  z.object({
    projectId: z.string().min(1),
    projectWorkUnitId: z.string().min(1),
    supersededTransitionExecutionId: z.string().min(1),
    transitionId: z.string().min(1),
    transitionKey: z.string().min(1).optional(),
    workflowId: z.string().min(1),
    workflowKey: z.string().min(1).optional(),
  });

const completeTransitionExecutionInput: z.ZodType<CompleteTransitionExecutionInput> = z.object({
  projectId: z.string().min(1),
  projectWorkUnitId: z.string().min(1),
  transitionExecutionId: z.string().min(1),
});

const choosePrimaryWorkflowInput: z.ZodType<ChoosePrimaryWorkflowForTransitionExecutionInput> =
  z.object({
    projectId: z.string().min(1),
    projectWorkUnitId: z.string().min(1),
    transitionExecutionId: z.string().min(1),
    workflowId: z.string().min(1),
    workflowKey: z.string().min(1).optional(),
  });

const getRuntimeTransitionExecutionDetailInput: z.ZodType<GetTransitionExecutionDetailInput> =
  z.object({
    projectId: z.string().min(1),
    projectWorkUnitId: z.string().min(1),
    transitionExecutionId: z.string().min(1),
  });

const getRuntimeWorkflowExecutionDetailInput: z.ZodType<GetWorkflowExecutionDetailInput> = z.object(
  {
    projectId: z.string().min(1),
    workflowExecutionId: z.string().min(1),
  },
);

const retrySameWorkflowExecutionInput: z.ZodType<RetrySameWorkflowExecutionInput> = z.object({
  projectId: z.string().min(1),
  workflowExecutionId: z.string().min(1),
});

const completeWorkflowExecutionInput: z.ZodType<CompleteWorkflowExecutionInput> = z.object({
  projectId: z.string().min(1),
  workflowExecutionId: z.string().min(1),
});

const activateWorkflowStepExecutionInput = z.object({
  projectId: z.string().min(1),
  workflowExecutionId: z.string().min(1),
});

const getRuntimeStepExecutionDetailInput = z.object({
  projectId: z.string().min(1),
  stepExecutionId: z.string().min(1),
});

const getAgentStepExecutionDetailInput: z.ZodType<GetAgentStepExecutionDetailInput> = z.object({
  projectId: z.string().min(1),
  stepExecutionId: z.string().min(1),
});

const getAgentStepTimelinePageInput: z.ZodType<GetAgentStepTimelinePageInput> = z.object({
  projectId: z.string().min(1),
  stepExecutionId: z.string().min(1),
  cursor: z
    .object({
      before: z.string().min(1).optional(),
      after: z.string().min(1).optional(),
    })
    .optional(),
  limit: z.number().int().nonnegative().optional(),
});

const startAgentStepSessionInput: z.ZodType<StartAgentStepSessionInput> = z.object({
  projectId: z.string().min(1),
  stepExecutionId: z.string().min(1),
});

const reconnectAgentStepSessionInput: z.ZodType<ReconnectAgentStepSessionInput> = z.object({
  projectId: z.string().min(1),
  stepExecutionId: z.string().min(1),
});

const sendAgentStepMessageInput: z.ZodType<SendAgentStepMessageInput> = z.object({
  projectId: z.string().min(1),
  stepExecutionId: z.string().min(1),
  message: z.string().trim().min(1),
});

const modelReferenceInput = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
});

const updateAgentStepTurnSelectionInput: z.ZodType<UpdateAgentStepTurnSelectionInput> = z
  .object({
    projectId: z.string().min(1),
    stepExecutionId: z.string().min(1),
    model: modelReferenceInput.optional(),
    agent: z.string().min(1).optional(),
  })
  .refine((value) => value.model !== undefined || value.agent !== undefined, {
    message: "Provide at least one turn selection override.",
  });

const completeAgentStepExecutionInput: z.ZodType<CompleteAgentStepExecutionInput> = z.object({
  projectId: z.string().min(1),
  stepExecutionId: z.string().min(1),
});

const startActionStepExecutionInput: z.ZodType<StartActionStepExecutionInput> = z.object({
  projectId: z.string().min(1),
  stepExecutionId: z.string().min(1),
});

const runActionStepActionsInput: z.ZodType<RunActionStepActionsInput> = z
  .object({
    projectId: z.string().min(1),
    stepExecutionId: z.string().min(1),
    actionIds: z.array(z.string().min(1)).min(1),
  })
  .refine((value) => new Set(value.actionIds).size === value.actionIds.length, {
    message: "Action ids must be unique.",
    path: ["actionIds"],
  });

const retryActionStepActionsInput: z.ZodType<RetryActionStepActionsInput> = z
  .object({
    projectId: z.string().min(1),
    stepExecutionId: z.string().min(1),
    actionIds: z.array(z.string().min(1)).min(1),
  })
  .refine((value) => new Set(value.actionIds).size === value.actionIds.length, {
    message: "Action ids must be unique.",
    path: ["actionIds"],
  });

const skipActionStepActionsInput: z.ZodType<SkipActionStepActionsInput> = z
  .object({
    projectId: z.string().min(1),
    stepExecutionId: z.string().min(1),
    actionIds: z.array(z.string().min(1)).min(1),
  })
  .refine((value) => new Set(value.actionIds).size === value.actionIds.length, {
    message: "Action ids must be unique.",
    path: ["actionIds"],
  });

const skipActionStepActionItemsInput: z.ZodType<SkipActionStepActionItemsInput> = z
  .object({
    projectId: z.string().min(1),
    stepExecutionId: z.string().min(1),
    actionId: z.string().min(1),
    itemIds: z.array(z.string().min(1)).min(1),
  })
  .refine((value) => new Set(value.itemIds).size === value.itemIds.length, {
    message: "Item ids must be unique.",
    path: ["itemIds"],
  });

const completeActionStepExecutionInput = z.object({
  projectId: z.string().min(1),
  stepExecutionId: z.string().min(1),
});

const saveFormStepDraftInput = z.object({
  projectId: z.string().min(1),
  workflowExecutionId: z.string().min(1),
  stepExecutionId: z.string().min(1),
  values: z.record(z.string(), z.unknown()),
});

const submitFormStepInput: z.ZodType<SubmitFormStepExecutionInput> = z.object({
  projectId: z.string().min(1),
  workflowExecutionId: z.string().min(1),
  stepExecutionId: z.string().min(1),
  values: z.record(z.string(), z.unknown()),
});

const saveBranchStepSelectionInput: z.ZodType<SaveBranchStepSelectionInput> = z.object({
  projectId: z.string().min(1),
  stepExecutionId: z.string().min(1),
  selectedTargetStepId: z.string().min(1).nullable(),
});

const completeStepExecutionInput = z.object({
  projectId: z.string().min(1),
  workflowExecutionId: z.string().min(1),
  stepExecutionId: z.string().min(1),
});

const startInvokeWorkflowTargetInput: z.ZodType<StartInvokeWorkflowTargetInput> = z.object({
  projectId: z.string().min(1),
  stepExecutionId: z.string().min(1),
  invokeWorkflowTargetExecutionId: z.string().min(1),
});

const startInvokeWorkUnitTargetInput: z.ZodType<StartInvokeWorkUnitTargetInput> = z.object({
  projectId: z.string().min(1),
  stepExecutionId: z.string().min(1),
  invokeWorkUnitTargetExecutionId: z.string().min(1),
  workflowDefinitionId: z.string().min(1),
  runtimeFactValues: z
    .array(
      z.object({
        workUnitFactDefinitionId: z.string().min(1),
        valueJson: z.unknown(),
      }),
    )
    .optional(),
  runtimeArtifactValues: z
    .array(
      z.object({
        artifactSlotDefinitionId: z.string().min(1),
        relativePath: z.string().min(1).optional(),
        sourceContextFactDefinitionId: z.string().min(1).optional(),
        clear: z.boolean().optional(),
        files: z
          .array(
            z.object({
              relativePath: z.string().min(1).optional(),
              sourceContextFactDefinitionId: z.string().min(1).optional(),
              clear: z.boolean().optional(),
            }),
          )
          .optional(),
      }),
    )
    .optional(),
});

const saveInvokeWorkUnitTargetDraftInput: z.ZodType<SaveInvokeWorkUnitTargetDraftInput> = z.object({
  projectId: z.string().min(1),
  stepExecutionId: z.string().min(1),
  invokeWorkUnitTargetExecutionId: z.string().min(1),
  runtimeFactValues: z
    .array(
      z.object({
        workUnitFactDefinitionId: z.string().min(1),
        valueJson: z.unknown(),
      }),
    )
    .optional(),
  runtimeArtifactValues: z
    .array(
      z.object({
        artifactSlotDefinitionId: z.string().min(1),
        relativePath: z.string().min(1).optional(),
        sourceContextFactDefinitionId: z.string().min(1).optional(),
        clear: z.boolean().optional(),
        files: z
          .array(
            z.object({
              relativePath: z.string().min(1).optional(),
              sourceContextFactDefinitionId: z.string().min(1).optional(),
              clear: z.boolean().optional(),
            }),
          )
          .optional(),
      }),
    )
    .optional(),
});

const listProjectRepoFilesInput = z.object({
  projectId: z.string().min(1),
  query: z.string().trim().optional(),
  limit: z.number().int().positive().max(500).optional(),
});

const getProjectRepoFileStatusesInput = z.object({
  projectId: z.string().min(1),
  relativePaths: z.array(z.string().min(1)).max(500),
});

const projectRepoFileEntrySchema = z.object({
  relativePath: z.string().min(1),
  status: z.enum(["committed", "not_committed", "missing", "not_a_repo", "git_not_installed"]),
  tracked: z.boolean().optional(),
  untracked: z.boolean().optional(),
  staged: z.boolean().optional(),
  modified: z.boolean().optional(),
  deleted: z.boolean().optional(),
  gitCommitHash: z.string().nullable().optional(),
  gitBlobHash: z.string().nullable().optional(),
  gitCommitSubject: z.string().nullable().optional(),
  gitCommitBody: z.string().nullable().optional(),
  message: z.string().optional(),
});

async function listRepoFiles(rootPath: string): Promise<string[]> {
  const results: string[] = [];
  const ignored = new Set([".git", "node_modules", ".turbo", ".next", "dist", "build"]);

  async function walk(current: string) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (ignored.has(entry.name)) {
        continue;
      }
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      if (entry.isFile()) {
        results.push(fullPath);
      }
    }
  }

  await walk(rootPath);
  return results;
}

const checkArtifactSlotCurrentStateInput = z.object({
  projectId: z.string().min(1),
  projectWorkUnitId: z.string().min(1),
  slotDefinitionId: z.string().min(1),
});

const createRuntimeProjectFactValueInput = z.object({
  projectId: z.string().min(1),
  factDefinitionId: z.string().min(1),
  value: z.unknown(),
});

const updateRuntimeProjectFactValueInput = z.object({
  projectId: z.string().min(1),
  factDefinitionId: z.string().min(1),
  projectFactInstanceId: z.string().min(1),
  value: z.unknown(),
});

const deleteRuntimeProjectFactValueInput = z.object({
  projectId: z.string().min(1),
  factDefinitionId: z.string().min(1),
});

const createRuntimeWorkUnitFactValueInput = z
  .object({
    projectId: z.string().min(1),
    projectWorkUnitId: z.string().min(1),
    factDefinitionId: z.string().min(1),
    value: z.unknown().optional(),
    referencedProjectWorkUnitId: z.string().min(1).optional(),
  })
  .refine((value) => value.value !== undefined || value.referencedProjectWorkUnitId !== undefined, {
    message: "Provide a fact value or referenced project work unit id.",
  });

const updateRuntimeWorkUnitFactValueInput = z
  .object({
    projectId: z.string().min(1),
    projectWorkUnitId: z.string().min(1),
    factDefinitionId: z.string().min(1),
    workUnitFactInstanceId: z.string().min(1),
    value: z.unknown().optional(),
    referencedProjectWorkUnitId: z.string().min(1).optional(),
  })
  .refine((value) => value.value !== undefined || value.referencedProjectWorkUnitId !== undefined, {
    message: "Provide a fact value or referenced project work unit id.",
  });

const deleteRuntimeWorkUnitFactValueInput = z.object({
  projectId: z.string().min(1),
  projectWorkUnitId: z.string().min(1),
  factDefinitionId: z.string().min(1),
});

const createRuntimeWorkflowContextFactValueInput = z.object({
  projectId: z.string().min(1),
  workflowExecutionId: z.string().min(1),
  contextFactDefinitionId: z.string().min(1),
  value: z.unknown(),
  sourceStepExecutionId: z.string().min(1).optional(),
});

const updateRuntimeWorkflowContextFactValueInput = z.object({
  projectId: z.string().min(1),
  workflowExecutionId: z.string().min(1),
  contextFactDefinitionId: z.string().min(1),
  instanceId: z.string().min(1),
  value: z.unknown(),
  sourceStepExecutionId: z.string().min(1).optional(),
});

const removeRuntimeWorkflowContextFactValueInput = z.object({
  projectId: z.string().min(1),
  workflowExecutionId: z.string().min(1),
  contextFactDefinitionId: z.string().min(1),
  instanceId: z.string().min(1),
  sourceStepExecutionId: z.string().min(1).optional(),
});

const deleteRuntimeWorkflowContextFactValueInput = z.object({
  projectId: z.string().min(1),
  workflowExecutionId: z.string().min(1),
  contextFactDefinitionId: z.string().min(1),
  sourceStepExecutionId: z.string().min(1).optional(),
});

const toWorkUnitCrudValue = (input: {
  readonly value?: unknown | undefined;
  readonly referencedProjectWorkUnitId?: string | undefined;
}) =>
  input.referencedProjectWorkUnitId !== undefined
    ? { projectWorkUnitId: input.referencedProjectWorkUnitId }
    : input.value;

function mapEffectError(err: unknown): never {
  const tag =
    err && typeof err === "object" && "_tag" in err ? (err as { _tag: string })._tag : undefined;
  const message =
    err instanceof Error
      ? err.message
      : err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : String(err);

  console.error("[mapEffectError] Full error:", err);
  console.error("[mapEffectError] Tag:", tag, "Message:", message);

  if (tag?.endsWith("NotFoundError")) {
    throw new ORPCError("NOT_FOUND", { message });
  }

  const isMissingHarnessSession =
    (tag === "HarnessExecutionError" || tag === "OpenCodeExecutionError") &&
    message.includes("Harness session") &&
    message.includes("was not found");

  if (isMissingHarnessSession) {
    throw new ORPCError("CONFLICT", {
      message: "Agent session was lost. Start or retry the session to continue.",
    });
  }

  switch (tag) {
    case "RepositoryError":
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: `Repository operation failed: ${message}`,
      });
    case "RuntimeFactValidationError":
    case "RuntimeFactCrudError":
      throw new ORPCError("BAD_REQUEST", { message });
    case "AgentStepStateTransitionError":
      if (message.includes("session was lost") || message.includes("Start or retry the session")) {
        throw new ORPCError("CONFLICT", { message });
      }
      throw new ORPCError("BAD_REQUEST", { message });
    case "McpToolValidationError":
      throw new ORPCError("BAD_REQUEST", { message });
    case "McpWriteRequirementError":
    case "SingleLiveStreamContractError":
      throw new ORPCError("CONFLICT", { message });
    case "HarnessExecutionError":
    case "OpenCodeExecutionError":
      throw new ORPCError("INTERNAL_SERVER_ERROR", { message });
    case "UnsupportedConditionKindError":
      throw new ORPCError("BAD_REQUEST", { message: "Unsupported condition kind" });
    default:
      throw new ORPCError("INTERNAL_SERVER_ERROR", { message });
  }
}

function runEffect<A>(
  serviceLayer: Layer.Layer<any>,
  effect: Effect.Effect<A, unknown, any>,
): Promise<A> {
  return Effect.runPromiseExit(effect.pipe(Effect.provide(serviceLayer))).then((exit) => {
    if (exit._tag === "Success") {
      return exit.value;
    }

    const failure = Cause.failureOption(exit.cause);

    if (Option.isSome(failure)) {
      mapEffectError(failure.value);
    }

    throw Cause.squash(exit.cause);
  });
}

function runStreamEffect<A>(
  serviceLayer: Layer.Layer<any>,
  effect: Effect.Effect<Stream.Stream<A, unknown>, unknown, any>,
): Promise<AsyncIterable<A>> {
  return Effect.runPromiseExit(effect.pipe(Effect.provide(serviceLayer))).then((exit) => {
    if (exit._tag === "Success") {
      return Stream.toAsyncIterable(exit.value);
    }

    const failure = Cause.failureOption(exit.cause);

    if (Option.isSome(failure)) {
      mapEffectError(failure.value);
    }

    throw Cause.squash(exit.cause);
  });
}

export function createProjectRuntimeRouter(
  serviceLayer: Layer.Layer<any>,
  queryServiceLayer: Layer.Layer<any> = serviceLayer,
  stepServiceLayer: Layer.Layer<any> = serviceLayer,
  agentStepServiceLayer: Layer.Layer<any> = stepServiceLayer,
) {
  return {
    getRuntimeOverview: publicProcedure.input(projectIdInput).handler(async ({ input }) =>
      runEffect(
        queryServiceLayer,
        Effect.gen(function* () {
          const runtimeOverviewService = yield* RuntimeOverviewService;
          return yield* runtimeOverviewService.getOverviewRuntimeSummary(input);
        }),
      ),
    ),

    getRuntimeWorkUnits: publicProcedure
      .input(getRuntimeWorkUnitsInput)
      .handler(async ({ input }) =>
        runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const runtimeWorkUnitService = yield* RuntimeWorkUnitService;
            return yield* runtimeWorkUnitService.getWorkUnits(input);
          }),
        ),
      ),

    getRuntimeWorkUnitOverview: publicProcedure
      .input(projectWorkUnitIdInput)
      .handler(async ({ input }) =>
        runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const runtimeWorkUnitService = yield* RuntimeWorkUnitService;
            return yield* runtimeWorkUnitService.getWorkUnitOverview(input);
          }),
        ),
      ),

    getRuntimeWorkUnitStateMachine: publicProcedure
      .input(projectWorkUnitIdInput)
      .handler(async ({ input }) =>
        runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const runtimeWorkUnitService = yield* RuntimeWorkUnitService;
            return yield* runtimeWorkUnitService.getWorkUnitStateMachine(input);
          }),
        ),
      ),

    getRuntimeProjectFacts: publicProcedure
      .input(getRuntimeProjectFactsInput)
      .handler(async ({ input }) =>
        runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const runtimeFactService = yield* RuntimeFactService;
            return yield* runtimeFactService.getProjectFacts(input);
          }),
        ),
      ),

    getRuntimeProjectFactDetail: publicProcedure
      .input(getRuntimeProjectFactDetailInput)
      .handler(async ({ input }) =>
        runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const runtimeFactService = yield* RuntimeFactService;
            return yield* runtimeFactService.getProjectFactDetail(input);
          }),
        ),
      ),

    getRuntimeWorkUnitFacts: publicProcedure
      .input(getRuntimeWorkUnitFactsInput)
      .handler(async ({ input }) =>
        runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const runtimeFactService = yield* RuntimeFactService;
            return yield* runtimeFactService.getWorkUnitFacts(input);
          }),
        ),
      ),

    getRuntimeWorkUnitFactDetail: publicProcedure
      .input(getRuntimeWorkUnitFactDetailInput)
      .handler(async ({ input }) =>
        runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const runtimeFactService = yield* RuntimeFactService;
            return yield* runtimeFactService.getWorkUnitFactDetail(input);
          }),
        ),
      ),

    getRuntimeArtifactSlots: publicProcedure
      .input(projectWorkUnitIdInput)
      .handler(async ({ input }) =>
        runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const runtimeArtifactService = yield* RuntimeArtifactService;
            return yield* runtimeArtifactService.getArtifactSlots(input);
          }),
        ),
      ),

    getRuntimeArtifactSlotDetail: publicProcedure
      .input(getRuntimeArtifactSlotDetailInput)
      .handler(async ({ input }) =>
        runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const runtimeArtifactService = yield* RuntimeArtifactService;
            return yield* runtimeArtifactService.getArtifactSlotDetail(input);
          }),
        ),
      ),

    getRuntimeArtifactInstanceDialog: publicProcedure
      .input(getRuntimeArtifactInstanceDialogInput)
      .handler(async ({ input }) =>
        runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const runtimeArtifactService = yield* RuntimeArtifactService;
            return yield* runtimeArtifactService.getArtifactInstanceDialog(input);
          }),
        ),
      ),

    getRuntimeActiveWorkflows: publicProcedure.input(projectIdInput).handler(async ({ input }) =>
      runEffect(
        serviceLayer,
        Effect.gen(function* () {
          const runtimeWorkflowIndexService = yield* RuntimeWorkflowIndexService;
          return yield* runtimeWorkflowIndexService.getActiveWorkflows(input);
        }),
      ),
    ),

    streamRuntimeGuidanceCandidates: publicProcedure
      .input(streamRuntimeGuidanceCandidatesInput)
      .handler(async ({ input }) =>
        runEffect(
          queryServiceLayer,
          Effect.gen(function* () {
            const runtimeGuidanceService = yield* RuntimeGuidanceService;
            return yield* runtimeGuidanceService.streamCandidates(input);
          }),
        ),
      ),

    getRuntimeGuidanceActive: publicProcedure.input(projectIdInput).handler(async ({ input }) =>
      runEffect(
        queryServiceLayer,
        Effect.gen(function* () {
          const runtimeGuidanceService = yield* RuntimeGuidanceService;
          return yield* runtimeGuidanceService.getActive(input);
        }),
      ),
    ),

    getRuntimeStartGateDetail: publicProcedure
      .input(getRuntimeStartGateDetailInput)
      .handler(async ({ input }) =>
        runEffect(
          queryServiceLayer,
          Effect.gen(function* () {
            const runtimeGuidanceService =
              (yield* RuntimeGuidanceService) as RuntimeGuidanceService["Type"] & {
                readonly getRuntimeStartGateDetail: (
                  request: typeof input,
                ) => Effect.Effect<unknown>;
              };
            return yield* runtimeGuidanceService.getRuntimeStartGateDetail(input);
          }),
        ),
      ),

    startTransitionExecution: protectedProcedure
      .input(startTransitionExecutionInput)
      .handler(async ({ input }) =>
        runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const transitionExecutionCommandService = yield* TransitionExecutionCommandService;
            return yield* transitionExecutionCommandService.startTransitionExecution(input);
          }),
        ),
      ),

    switchActiveTransitionExecution: protectedProcedure
      .input(switchActiveTransitionExecutionInput)
      .handler(async ({ input }) =>
        runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const transitionExecutionCommandService = yield* TransitionExecutionCommandService;
            return yield* transitionExecutionCommandService.switchActiveTransitionExecution(input);
          }),
        ),
      ),

    completeTransitionExecution: protectedProcedure
      .input(completeTransitionExecutionInput)
      .handler(async ({ input }) =>
        runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const transitionExecutionCommandService = yield* TransitionExecutionCommandService;
            return yield* transitionExecutionCommandService.completeTransitionExecution(input);
          }),
        ),
      ),

    choosePrimaryWorkflowForTransitionExecution: protectedProcedure
      .input(choosePrimaryWorkflowInput)
      .handler(async ({ input }) =>
        runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const transitionExecutionCommandService = yield* TransitionExecutionCommandService;
            return yield* transitionExecutionCommandService.choosePrimaryWorkflowForTransitionExecution(
              input,
            );
          }),
        ),
      ),

    getRuntimeTransitionExecutionDetail: publicProcedure
      .input(getRuntimeTransitionExecutionDetailInput)
      .handler(async ({ input }) =>
        runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const transitionExecutionDetailService = yield* TransitionExecutionDetailService;
            const detail =
              yield* transitionExecutionDetailService.getTransitionExecutionDetail(input);

            if (!detail) {
              throw new ORPCError("NOT_FOUND", {
                message: `Transition execution not found: ${input.transitionExecutionId}`,
              });
            }

            return detail;
          }),
        ),
      ),

    getRuntimeWorkflowExecutionDetail: publicProcedure
      .input(getRuntimeWorkflowExecutionDetailInput)
      .handler(async ({ input }) =>
        runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const workflowExecutionDetailService = yield* WorkflowExecutionDetailService;
            const detail = yield* workflowExecutionDetailService.getWorkflowExecutionDetail(input);

            if (!detail) {
              throw new ORPCError("NOT_FOUND", {
                message: `Workflow execution not found: ${input.workflowExecutionId}`,
              });
            }

            return detail;
          }),
        ),
      ),

    retrySameWorkflowExecution: protectedProcedure
      .input(retrySameWorkflowExecutionInput)
      .handler(async ({ input }) =>
        runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const workflowExecutionCommandService = yield* WorkflowExecutionCommandService;
            return yield* workflowExecutionCommandService.retrySameWorkflowExecution(input);
          }),
        ),
      ),

    completeWorkflowExecution: protectedProcedure
      .input(completeWorkflowExecutionInput)
      .handler(async ({ input }) =>
        runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const workflowExecutionCommandService = yield* WorkflowExecutionCommandService;
            return yield* workflowExecutionCommandService.completeWorkflowExecution(input);
          }),
        ),
      ),

    activateWorkflowStepExecution: protectedProcedure
      .input(activateWorkflowStepExecutionInput)
      .handler(async ({ input }) =>
        runEffect(
          stepServiceLayer,
          Effect.gen(function* () {
            const workflowExecutionStepCommandService = yield* WorkflowExecutionStepCommandService;
            return yield* workflowExecutionStepCommandService.activateWorkflowStepExecution(input);
          }),
        ),
      ),

    activateFirstWorkflowStepExecution: protectedProcedure
      .input(activateWorkflowStepExecutionInput)
      .handler(async ({ input }) =>
        runEffect(
          stepServiceLayer,
          Effect.gen(function* () {
            const workflowExecutionStepCommandService = yield* WorkflowExecutionStepCommandService;
            return yield* workflowExecutionStepCommandService.activateFirstWorkflowStepExecution(
              input,
            );
          }),
        ),
      ),

    getRuntimeStepExecutionDetail: publicProcedure
      .input(getRuntimeStepExecutionDetailInput)
      .handler(async ({ input }) =>
        runEffect(
          stepServiceLayer,
          Effect.gen(function* () {
            const stepExecutionDetailService = yield* StepExecutionDetailService;
            const detail = yield* stepExecutionDetailService.getRuntimeStepExecutionDetail(input);

            if (!detail) {
              throw new ORPCError("NOT_FOUND", {
                message: `Step execution not found: ${input.stepExecutionId}`,
              });
            }

            return detail;
          }),
        ),
      ),

    getAgentStepExecutionDetail: publicProcedure
      .input(getAgentStepExecutionDetailInput)
      .handler(async ({ input }) =>
        runEffect(
          agentStepServiceLayer,
          Effect.gen(function* () {
            const agentStepExecutionDetailService = yield* AgentStepExecutionDetailService;
            const detail =
              yield* agentStepExecutionDetailService.getAgentStepExecutionDetail(input);

            if (!detail) {
              throw new ORPCError("NOT_FOUND", {
                message: `Agent step execution not found: ${input.stepExecutionId}`,
              });
            }

            return detail;
          }),
        ),
      ),

    getAgentStepTimelinePage: publicProcedure
      .input(getAgentStepTimelinePageInput)
      .handler(async ({ input }) =>
        runEffect(
          agentStepServiceLayer,
          Effect.gen(function* () {
            const agentStepTimelineService = yield* AgentStepTimelineService;
            return yield* agentStepTimelineService.getTimelinePage(input);
          }),
        ),
      ),

    startAgentStepSession: protectedProcedure
      .input(startAgentStepSessionInput)
      .handler(async ({ input }) =>
        runEffect(
          agentStepServiceLayer,
          Effect.gen(function* () {
            const agentStepSessionCommandService = yield* AgentStepSessionCommandService;
            return yield* agentStepSessionCommandService.startAgentStepSession(input);
          }),
        ),
      ),

    reconnectAgentStepSession: protectedProcedure
      .input(reconnectAgentStepSessionInput)
      .handler(async ({ input }) =>
        runEffect(
          agentStepServiceLayer,
          Effect.gen(function* () {
            const agentStepSessionCommandService = yield* AgentStepSessionCommandService;
            return yield* agentStepSessionCommandService.reconnectAgentStepSession(input);
          }),
        ),
      ),

    sendAgentStepMessage: protectedProcedure
      .input(sendAgentStepMessageInput)
      .handler(async ({ input }) =>
        runEffect(
          agentStepServiceLayer,
          Effect.gen(function* () {
            const agentStepSessionCommandService = yield* AgentStepSessionCommandService;
            return yield* agentStepSessionCommandService.sendAgentStepMessage(input);
          }),
        ),
      ),

    updateAgentStepTurnSelection: protectedProcedure
      .input(updateAgentStepTurnSelectionInput)
      .handler(async ({ input }) =>
        runEffect(
          agentStepServiceLayer,
          Effect.gen(function* () {
            const agentStepSessionCommandService = yield* AgentStepSessionCommandService;
            return yield* agentStepSessionCommandService.updateAgentStepTurnSelection(input);
          }),
        ),
      ),

    completeAgentStepExecution: protectedProcedure
      .input(completeAgentStepExecutionInput)
      .handler(async ({ input }) =>
        runEffect(
          agentStepServiceLayer,
          Effect.gen(function* () {
            const agentStepSessionCommandService = yield* AgentStepSessionCommandService;
            return yield* agentStepSessionCommandService.completeAgentStepExecution(input);
          }),
        ),
      ),

    startActionStepExecution: protectedProcedure
      .input(startActionStepExecutionInput)
      .handler(async ({ input }) =>
        runEffect(
          stepServiceLayer,
          Effect.gen(function* () {
            const actionStepRuntimeService = yield* ActionStepRuntimeService;
            return yield* actionStepRuntimeService.startExecution(input);
          }),
        ),
      ),

    runActionStepActions: protectedProcedure
      .input(runActionStepActionsInput)
      .handler(async ({ input }) =>
        runEffect(
          stepServiceLayer,
          Effect.gen(function* () {
            const actionStepRuntimeService = yield* ActionStepRuntimeService;
            return yield* actionStepRuntimeService.runActions(input);
          }),
        ),
      ),

    retryActionStepActions: protectedProcedure
      .input(retryActionStepActionsInput)
      .handler(async ({ input }) =>
        runEffect(
          stepServiceLayer,
          Effect.gen(function* () {
            const actionStepRuntimeService = yield* ActionStepRuntimeService;
            return yield* actionStepRuntimeService.retryActions(input);
          }),
        ),
      ),

    skipActionStepActions: protectedProcedure
      .input(skipActionStepActionsInput)
      .handler(async ({ input }) =>
        runEffect(
          stepServiceLayer,
          Effect.gen(function* () {
            const actionStepRuntimeService = yield* ActionStepRuntimeService;
            return yield* actionStepRuntimeService.skipActions(input);
          }),
        ),
      ),

    skipActionStepActionItems: protectedProcedure
      .input(skipActionStepActionItemsInput)
      .handler(async ({ input }) =>
        runEffect(
          stepServiceLayer,
          Effect.gen(function* () {
            const actionStepRuntimeService = yield* ActionStepRuntimeService;
            return yield* actionStepRuntimeService.skipActionItems(input);
          }),
        ),
      ),

    completeActionStepExecution: protectedProcedure
      .input(completeActionStepExecutionInput)
      .handler(async ({ input }) =>
        runEffect(
          stepServiceLayer,
          Effect.gen(function* () {
            const actionStepRuntimeService = yield* ActionStepRuntimeService;
            return yield* actionStepRuntimeService.completeStep(input);
          }),
        ),
      ),

    streamActionStepExecutionEvents: publicProcedure
      .input(getAgentStepExecutionDetailInput)
      .handler(async ({ input }) =>
        runStreamEffect(
          stepServiceLayer,
          Effect.gen(function* () {
            const actionStepEventStreamService = yield* ActionStepEventStreamService;
            return actionStepEventStreamService.streamExecutionEvents(input);
          }),
        ),
      ),

    streamAgentStepSessionEvents: publicProcedure
      .input(getAgentStepExecutionDetailInput)
      .handler(async ({ input }) =>
        runStreamEffect(
          agentStepServiceLayer,
          Effect.gen(function* () {
            const agentStepEventStreamService = yield* AgentStepEventStreamService;
            return agentStepEventStreamService.streamSessionEvents(input);
          }),
        ),
      ),

    saveFormStepDraft: protectedProcedure.input(saveFormStepDraftInput).handler(async ({ input }) =>
      runEffect(
        stepServiceLayer,
        Effect.gen(function* () {
          const workflowExecutionStepCommandService = yield* WorkflowExecutionStepCommandService;
          return yield* workflowExecutionStepCommandService.saveFormStepDraft(input);
        }),
      ),
    ),

    submitFormStep: protectedProcedure.input(submitFormStepInput).handler(async ({ input }) =>
      runEffect(
        stepServiceLayer,
        Effect.gen(function* () {
          const workflowExecutionStepCommandService = yield* WorkflowExecutionStepCommandService;
          return yield* workflowExecutionStepCommandService.submitFormStep(input);
        }),
      ),
    ),

    saveBranchStepSelection: protectedProcedure
      .input(saveBranchStepSelectionInput)
      .handler(async ({ input }) =>
        runEffect(
          stepServiceLayer,
          Effect.gen(function* () {
            const workflowExecutionStepCommandService = yield* WorkflowExecutionStepCommandService;
            return yield* workflowExecutionStepCommandService.saveBranchStepSelection(input);
          }),
        ),
      ),

    completeStepExecution: protectedProcedure
      .input(completeStepExecutionInput)
      .handler(async ({ input }) =>
        runEffect(
          stepServiceLayer,
          Effect.gen(function* () {
            const workflowExecutionStepCommandService = yield* WorkflowExecutionStepCommandService;
            return yield* workflowExecutionStepCommandService.completeStepExecution(input);
          }),
        ),
      ),

    startInvokeWorkflowTarget: protectedProcedure
      .input(startInvokeWorkflowTargetInput)
      .handler(async ({ input }) =>
        runEffect(
          stepServiceLayer,
          Effect.gen(function* () {
            const invokeWorkflowExecutionService = yield* InvokeWorkflowExecutionService;
            return yield* invokeWorkflowExecutionService.startInvokeWorkflowTarget(input);
          }),
        ),
      ),

    startInvokeWorkUnitTarget: protectedProcedure
      .input(startInvokeWorkUnitTargetInput)
      .handler(async ({ input }) =>
        runEffect(
          stepServiceLayer,
          Effect.gen(function* () {
            const invokeWorkUnitExecutionService = yield* InvokeWorkUnitExecutionService;
            return yield* invokeWorkUnitExecutionService.startInvokeWorkUnitTarget(input);
          }),
        ),
      ),

    saveInvokeWorkUnitTargetDraft: protectedProcedure
      .input(saveInvokeWorkUnitTargetDraftInput)
      .handler(async ({ input }) =>
        runEffect(
          stepServiceLayer,
          Effect.gen(function* () {
            const invokeWorkUnitExecutionService = yield* InvokeWorkUnitExecutionService;
            return yield* invokeWorkUnitExecutionService.saveInvokeWorkUnitTargetDraft(input);
          }),
        ),
      ),

    listProjectRepoFiles: protectedProcedure
      .input(listProjectRepoFilesInput)
      .output(z.array(projectRepoFileEntrySchema))
      .handler(async ({ input }) =>
        runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const projectContextRepo = yield* ProjectContextRepository;
            const sandboxGit = yield* SandboxGitService;
            const project = yield* projectContextRepo.getProjectById({
              projectId: input.projectId,
            });
            if (!project?.projectRootPath) {
              return [];
            }

            const allFiles = yield* Effect.tryPromise({
              try: () => listRepoFiles(project.projectRootPath!),
              catch: (error) => error,
            }).pipe(Effect.catchAll(() => Effect.succeed([] as string[])));

            const normalizedQuery = input.query?.trim().toLowerCase() ?? "";
            const filtered = allFiles.filter((filePath) =>
              normalizedQuery.length === 0
                ? true
                : filePath.toLowerCase().includes(normalizedQuery),
            );
            const limited = filtered.slice(0, input.limit ?? 200);

            return yield* Effect.forEach(limited, (filePath) =>
              sandboxGit.resolveArtifactReference({
                rootPath: project.projectRootPath!,
                filePath,
              }),
            ).pipe(
              Effect.map((entries) =>
                entries.map((entry) => ({
                  relativePath: entry.relativePath,
                  status: entry.status,
                  ...(entry.status === "not_committed"
                    ? {
                        tracked: entry.tracked,
                        untracked: entry.untracked,
                        staged: entry.staged,
                        modified: entry.modified,
                        deleted: entry.deleted,
                      }
                    : {}),
                  ...(entry.status === "committed"
                    ? {
                        gitCommitHash: entry.gitCommitHash,
                        gitBlobHash: entry.gitBlobHash,
                        gitCommitSubject: entry.gitCommitSubject,
                        gitCommitBody: entry.gitCommitBody,
                      }
                    : {}),
                  ...(entry.status === "not_a_repo" || entry.status === "git_not_installed"
                    ? { message: entry.message }
                    : {}),
                })),
              ),
            );
          }),
        ),
      ),

    getProjectRepoFileStatuses: protectedProcedure
      .input(getProjectRepoFileStatusesInput)
      .output(z.array(projectRepoFileEntrySchema))
      .handler(async ({ input }) =>
        runEffect(
          serviceLayer,
          Effect.gen(function* () {
            if (input.relativePaths.length === 0) {
              return [];
            }

            const projectContextRepo = yield* ProjectContextRepository;
            const sandboxGit = yield* SandboxGitService;
            const project = yield* projectContextRepo.getProjectById({
              projectId: input.projectId,
            });
            if (!project?.projectRootPath) {
              return [];
            }

            const uniqueRelativePaths = [
              ...new Set(input.relativePaths.map((value) => value.trim())),
            ].filter((value) => value.length > 0);

            return yield* Effect.forEach(uniqueRelativePaths, (filePath) =>
              sandboxGit.resolveArtifactReference({
                rootPath: project.projectRootPath!,
                filePath,
              }),
            ).pipe(
              Effect.map((entries) =>
                entries.flatMap((entry) => ({
                  relativePath: entry.relativePath,
                  status: entry.status,
                  ...(entry.status === "not_committed"
                    ? {
                        tracked: entry.tracked,
                        untracked: entry.untracked,
                        staged: entry.staged,
                        modified: entry.modified,
                        deleted: entry.deleted,
                      }
                    : {}),
                  ...(entry.status === "committed"
                    ? {
                        gitCommitHash: entry.gitCommitHash,
                        gitBlobHash: entry.gitBlobHash,
                        gitCommitSubject: entry.gitCommitSubject,
                        gitCommitBody: entry.gitCommitBody,
                      }
                    : {}),
                  ...(entry.status === "not_a_repo" || entry.status === "git_not_installed"
                    ? { message: entry.message }
                    : {}),
                })),
              ),
            );
          }),
        ),
      ),

    checkArtifactSlotCurrentState: publicProcedure
      .input(checkArtifactSlotCurrentStateInput)
      .handler(async ({ input }) =>
        runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const runtimeArtifactService = yield* RuntimeArtifactService;
            return yield* runtimeArtifactService.checkArtifactSlotCurrentState(input);
          }),
        ),
      ),

    createRuntimeProjectFactValue: protectedProcedure
      .input(createRuntimeProjectFactValueInput)
      .handler(async ({ input, context }) =>
        runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const runtimeManualFactCrudService = yield* RuntimeManualFactCrudService;
            return yield* runtimeManualFactCrudService.apply({
              scope: "project",
              projectId: input.projectId,
              factDefinitionId: input.factDefinitionId,
              payload: { verb: "create", value: input.value },
              authoredByUserId: context.session.user.id,
            });
          }),
        ),
      ),

    updateRuntimeProjectFactValue: protectedProcedure
      .input(updateRuntimeProjectFactValueInput)
      .handler(async ({ input, context }) =>
        runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const runtimeManualFactCrudService = yield* RuntimeManualFactCrudService;
            return yield* runtimeManualFactCrudService.apply({
              scope: "project",
              projectId: input.projectId,
              factDefinitionId: input.factDefinitionId,
              payload: {
                verb: "update",
                instanceId: input.projectFactInstanceId,
                value: input.value,
              },
              authoredByUserId: context.session.user.id,
            });
          }),
        ),
      ),

    deleteRuntimeProjectFactValue: protectedProcedure
      .input(deleteRuntimeProjectFactValueInput)
      .handler(async ({ input, context }) =>
        runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const runtimeManualFactCrudService = yield* RuntimeManualFactCrudService;
            return yield* runtimeManualFactCrudService.apply({
              scope: "project",
              projectId: input.projectId,
              factDefinitionId: input.factDefinitionId,
              payload: { verb: "delete" },
              authoredByUserId: context.session.user.id,
            });
          }),
        ),
      ),

    createRuntimeWorkUnitFactValue: protectedProcedure
      .input(createRuntimeWorkUnitFactValueInput)
      .handler(async ({ input, context }) =>
        runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const runtimeManualFactCrudService = yield* RuntimeManualFactCrudService;
            return yield* runtimeManualFactCrudService.apply({
              scope: "work_unit",
              projectWorkUnitId: input.projectWorkUnitId,
              factDefinitionId: input.factDefinitionId,
              payload: {
                verb: "create",
                value: toWorkUnitCrudValue({
                  ...(input.value !== undefined ? { value: input.value } : {}),
                  ...(input.referencedProjectWorkUnitId !== undefined
                    ? { referencedProjectWorkUnitId: input.referencedProjectWorkUnitId }
                    : {}),
                }),
              },
              authoredByUserId: context.session.user.id,
            });
          }),
        ),
      ),

    updateRuntimeWorkUnitFactValue: protectedProcedure
      .input(updateRuntimeWorkUnitFactValueInput)
      .handler(async ({ input, context }) =>
        runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const runtimeManualFactCrudService = yield* RuntimeManualFactCrudService;
            return yield* runtimeManualFactCrudService.apply({
              scope: "work_unit",
              projectWorkUnitId: input.projectWorkUnitId,
              factDefinitionId: input.factDefinitionId,
              payload: {
                verb: "update",
                instanceId: input.workUnitFactInstanceId,
                value: toWorkUnitCrudValue({
                  ...(input.value !== undefined ? { value: input.value } : {}),
                  ...(input.referencedProjectWorkUnitId !== undefined
                    ? { referencedProjectWorkUnitId: input.referencedProjectWorkUnitId }
                    : {}),
                }),
              },
              authoredByUserId: context.session.user.id,
            });
          }),
        ),
      ),

    deleteRuntimeWorkUnitFactValue: protectedProcedure
      .input(deleteRuntimeWorkUnitFactValueInput)
      .handler(async ({ input, context }) =>
        runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const runtimeManualFactCrudService = yield* RuntimeManualFactCrudService;
            return yield* runtimeManualFactCrudService.apply({
              scope: "work_unit",
              projectWorkUnitId: input.projectWorkUnitId,
              factDefinitionId: input.factDefinitionId,
              payload: { verb: "delete" },
              authoredByUserId: context.session.user.id,
            });
          }),
        ),
      ),

    createRuntimeWorkflowContextFactValue: protectedProcedure
      .input(createRuntimeWorkflowContextFactValueInput)
      .handler(async ({ input }) =>
        runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const runtimeManualFactCrudService = yield* RuntimeManualFactCrudService;
            return yield* runtimeManualFactCrudService.apply({
              scope: "workflow_context",
              projectId: input.projectId,
              workflowExecutionId: input.workflowExecutionId,
              contextFactDefinitionId: input.contextFactDefinitionId,
              payload: { verb: "create", value: input.value },
              ...(input.sourceStepExecutionId
                ? { sourceStepExecutionId: input.sourceStepExecutionId }
                : {}),
            });
          }),
        ),
      ),

    updateRuntimeWorkflowContextFactValue: protectedProcedure
      .input(updateRuntimeWorkflowContextFactValueInput)
      .handler(async ({ input }) =>
        runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const runtimeManualFactCrudService = yield* RuntimeManualFactCrudService;
            return yield* runtimeManualFactCrudService.apply({
              scope: "workflow_context",
              projectId: input.projectId,
              workflowExecutionId: input.workflowExecutionId,
              contextFactDefinitionId: input.contextFactDefinitionId,
              payload: {
                verb: "update",
                instanceId: input.instanceId,
                value: input.value,
              },
              ...(input.sourceStepExecutionId
                ? { sourceStepExecutionId: input.sourceStepExecutionId }
                : {}),
            });
          }),
        ),
      ),

    removeRuntimeWorkflowContextFactValue: protectedProcedure
      .input(removeRuntimeWorkflowContextFactValueInput)
      .handler(async ({ input }) =>
        runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const runtimeManualFactCrudService = yield* RuntimeManualFactCrudService;
            return yield* runtimeManualFactCrudService.apply({
              scope: "workflow_context",
              projectId: input.projectId,
              workflowExecutionId: input.workflowExecutionId,
              contextFactDefinitionId: input.contextFactDefinitionId,
              payload: {
                verb: "remove",
                instanceId: input.instanceId,
              },
              ...(input.sourceStepExecutionId
                ? { sourceStepExecutionId: input.sourceStepExecutionId }
                : {}),
            });
          }),
        ),
      ),

    deleteRuntimeWorkflowContextFactValue: protectedProcedure
      .input(deleteRuntimeWorkflowContextFactValueInput)
      .handler(async ({ input }) =>
        runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const runtimeManualFactCrudService = yield* RuntimeManualFactCrudService;
            return yield* runtimeManualFactCrudService.apply({
              scope: "workflow_context",
              projectId: input.projectId,
              workflowExecutionId: input.workflowExecutionId,
              contextFactDefinitionId: input.contextFactDefinitionId,
              payload: { verb: "delete" },
              ...(input.sourceStepExecutionId
                ? { sourceStepExecutionId: input.sourceStepExecutionId }
                : {}),
            });
          }),
        ),
      ),
  };
}
