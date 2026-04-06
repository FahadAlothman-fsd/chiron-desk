import { ORPCError } from "@orpc/server";
import { Cause, Effect, Layer, Option } from "effect";
import { z } from "zod";
import type {
  ChoosePrimaryWorkflowForTransitionExecutionInput,
  CompleteWorkflowExecutionInput,
  CompleteTransitionExecutionInput,
  GetTransitionExecutionDetailInput,
  GetWorkflowExecutionDetailInput,
  RetrySameWorkflowExecutionInput,
  SubmitFormStepExecutionInput,
  StartTransitionExecutionInput,
  SwitchActiveTransitionExecutionInput,
} from "@chiron/contracts/runtime/executions";

import {
  RuntimeArtifactService,
  RuntimeFactService,
  RuntimeGuidanceService,
  RuntimeOverviewService,
  RuntimeWorkflowIndexService,
  RuntimeWorkUnitService,
  StepExecutionDetailService,
  TransitionExecutionCommandService,
  TransitionExecutionDetailService,
  WorkflowExecutionStepCommandService,
  WorkflowExecutionCommandService,
  WorkflowExecutionDetailService,
} from "../../../workflow-engine/src/index";
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

const getRuntimeArtifactSnapshotDialogInput = z.object({
  projectId: z.string().min(1),
  projectWorkUnitId: z.string().min(1),
  slotDefinitionId: z.string().min(1),
  projectArtifactSnapshotId: z.string().min(1),
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

const completeStepExecutionInput = z.object({
  projectId: z.string().min(1),
  workflowExecutionId: z.string().min(1),
  stepExecutionId: z.string().min(1),
});

const checkArtifactSlotCurrentStateInput = z.object({
  projectId: z.string().min(1),
  projectWorkUnitId: z.string().min(1),
  slotDefinitionId: z.string().min(1),
});

const addRuntimeProjectFactValueInput = z.object({
  projectId: z.string().min(1),
  factDefinitionId: z.string().min(1),
  value: z.unknown(),
});

const setRuntimeProjectFactValueInput = z.object({
  projectId: z.string().min(1),
  factDefinitionId: z.string().min(1),
  projectFactInstanceId: z.string().min(1),
  value: z.unknown(),
});

const replaceRuntimeProjectFactValueInput = setRuntimeProjectFactValueInput;

const addRuntimeWorkUnitFactValueInput = z.object({
  projectId: z.string().min(1),
  projectWorkUnitId: z.string().min(1),
  factDefinitionId: z.string().min(1),
  value: z.unknown().optional(),
  referencedProjectWorkUnitId: z.string().min(1).optional(),
});

const setRuntimeWorkUnitFactValueInput = z.object({
  projectId: z.string().min(1),
  projectWorkUnitId: z.string().min(1),
  factDefinitionId: z.string().min(1),
  workUnitFactInstanceId: z.string().min(1),
  value: z.unknown().optional(),
  referencedProjectWorkUnitId: z.string().min(1).optional(),
});

const replaceRuntimeWorkUnitFactValueInput = setRuntimeWorkUnitFactValueInput;

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

  switch (tag) {
    case "RepositoryError":
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: `Repository operation failed: ${message}`,
      });
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

export function createProjectRuntimeRouter(serviceLayer: Layer.Layer<any>) {
  return {
    getRuntimeOverview: publicProcedure.input(projectIdInput).handler(async ({ input }) =>
      runEffect(
        serviceLayer,
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

    getRuntimeArtifactSnapshotDialog: publicProcedure
      .input(getRuntimeArtifactSnapshotDialogInput)
      .handler(async ({ input }) =>
        runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const runtimeArtifactService = yield* RuntimeArtifactService;
            return yield* runtimeArtifactService.getArtifactSnapshotDialog(input);
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
          serviceLayer,
          Effect.gen(function* () {
            const runtimeGuidanceService = yield* RuntimeGuidanceService;
            return yield* runtimeGuidanceService.streamCandidates(input);
          }),
        ),
      ),

    getRuntimeGuidanceActive: publicProcedure.input(projectIdInput).handler(async ({ input }) =>
      runEffect(
        serviceLayer,
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
          serviceLayer,
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
          serviceLayer,
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
          serviceLayer,
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
          serviceLayer,
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

    saveFormStepDraft: protectedProcedure.input(saveFormStepDraftInput).handler(async ({ input }) =>
      runEffect(
        serviceLayer,
        Effect.gen(function* () {
          const workflowExecutionStepCommandService = yield* WorkflowExecutionStepCommandService;
          return yield* workflowExecutionStepCommandService.saveFormStepDraft(input);
        }),
      ),
    ),

    submitFormStep: protectedProcedure.input(submitFormStepInput).handler(async ({ input }) =>
      runEffect(
        serviceLayer,
        Effect.gen(function* () {
          const workflowExecutionStepCommandService = yield* WorkflowExecutionStepCommandService;
          return yield* workflowExecutionStepCommandService.submitFormStep(input);
        }),
      ),
    ),

    completeStepExecution: protectedProcedure
      .input(completeStepExecutionInput)
      .handler(async ({ input }) =>
        runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const workflowExecutionStepCommandService = yield* WorkflowExecutionStepCommandService;
            return yield* workflowExecutionStepCommandService.completeStepExecution(input);
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

    addRuntimeProjectFactValue: protectedProcedure
      .input(addRuntimeProjectFactValueInput)
      .handler(async ({ input }) =>
        runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const runtimeFactService = (yield* RuntimeFactService) as RuntimeFactService["Type"] & {
              readonly addRuntimeProjectFactValue: (
                request: typeof input,
              ) => Effect.Effect<unknown>;
            };
            return yield* runtimeFactService.addRuntimeProjectFactValue(input);
          }),
        ),
      ),

    setRuntimeProjectFactValue: protectedProcedure
      .input(setRuntimeProjectFactValueInput)
      .handler(async ({ input }) =>
        runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const runtimeFactService = (yield* RuntimeFactService) as RuntimeFactService["Type"] & {
              readonly setRuntimeProjectFactValue: (
                request: typeof input,
              ) => Effect.Effect<unknown>;
            };
            return yield* runtimeFactService.setRuntimeProjectFactValue(input);
          }),
        ),
      ),

    replaceRuntimeProjectFactValue: protectedProcedure
      .input(replaceRuntimeProjectFactValueInput)
      .handler(async ({ input }) =>
        runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const runtimeFactService = (yield* RuntimeFactService) as RuntimeFactService["Type"] & {
              readonly replaceRuntimeProjectFactValue: (
                request: typeof input,
              ) => Effect.Effect<unknown>;
            };
            return yield* runtimeFactService.replaceRuntimeProjectFactValue(input);
          }),
        ),
      ),

    addRuntimeWorkUnitFactValue: protectedProcedure
      .input(addRuntimeWorkUnitFactValueInput)
      .handler(async ({ input }) =>
        runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const runtimeFactService = (yield* RuntimeFactService) as RuntimeFactService["Type"] & {
              readonly addRuntimeWorkUnitFactValue: (
                request: typeof input,
              ) => Effect.Effect<unknown>;
            };
            return yield* runtimeFactService.addRuntimeWorkUnitFactValue(input);
          }),
        ),
      ),

    setRuntimeWorkUnitFactValue: protectedProcedure
      .input(setRuntimeWorkUnitFactValueInput)
      .handler(async ({ input }) =>
        runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const runtimeFactService = (yield* RuntimeFactService) as RuntimeFactService["Type"] & {
              readonly setRuntimeWorkUnitFactValue: (
                request: typeof input,
              ) => Effect.Effect<unknown>;
            };
            return yield* runtimeFactService.setRuntimeWorkUnitFactValue(input);
          }),
        ),
      ),

    replaceRuntimeWorkUnitFactValue: protectedProcedure
      .input(replaceRuntimeWorkUnitFactValueInput)
      .handler(async ({ input }) =>
        runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const runtimeFactService = (yield* RuntimeFactService) as RuntimeFactService["Type"] & {
              readonly replaceRuntimeWorkUnitFactValue: (
                request: typeof input,
              ) => Effect.Effect<unknown>;
            };
            return yield* runtimeFactService.replaceRuntimeWorkUnitFactValue(input);
          }),
        ),
      ),
  };
}
