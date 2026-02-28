import { ORPCError } from "@orpc/server";
import {
  MethodologyVersionService,
  type MethodologyVersionRow,
  type MethodologyVersionEventRow,
  type MethodologyError,
} from "@chiron/methodology-engine";

import {
  LifecycleService,
  EligibilityService,
  type LifecycleError,
} from "@chiron/methodology-engine";
import type { UpdateDraftLifecycleInput } from "@chiron/contracts/methodology/lifecycle";

import type {
  CreateDraftVersionInput,
  GetProjectPinLineageInput,
  GetPublicationEvidenceInput,
  PinProjectMethodologyVersionInput,
  PublishDraftVersionInput,
  RepinProjectMethodologyVersionInput,
  ValidationResult,
} from "@chiron/contracts/methodology/version";
import type { UpdateDraftWorkflowsInputDto } from "@chiron/contracts/methodology/dto";
import { Effect, type Layer } from "effect";
import { z } from "zod";
import { protectedProcedure, publicProcedure } from "../index";

const workflowStepSchema = z.object({
  key: z.string().min(1),
  type: z.enum(["form", "agent", "action", "invoke", "branch", "display"]),
  displayName: z.string().optional(),
  config: z.unknown().optional(),
});

const workflowEdgeSchema = z.object({
  fromStepKey: z.string().min(1).nullable().optional().default(null),
  toStepKey: z.string().min(1).nullable().optional().default(null),
  edgeKey: z.string().min(1).optional(),
  condition: z.unknown().optional(),
});

const workflowSchema = z.object({
  key: z.string().min(1),
  displayName: z.string().optional(),
  workUnitTypeKey: z.string().min(1).optional(),
  steps: z.array(workflowStepSchema),
  edges: z.array(workflowEdgeSchema),
});

const guidanceSchema = z
  .object({
    global: z.unknown().optional(),
    byWorkUnitType: z.record(z.string(), z.unknown()).default({}),
    byAgentType: z.record(z.string(), z.unknown()).default({}),
    byTransition: z.record(z.string(), z.unknown()).default({}),
  })
  .optional();

const variableDefinitionSchema = z.object({
  key: z.string().min(1),
  valueType: z.enum(["string", "number", "boolean", "json"]),
  description: z.string().optional(),
  required: z.boolean(),
  defaultValue: z.unknown().optional(),
  validation: z.unknown().optional(),
});

const linkTypeDefinitionSchema = z.object({
  key: z.string().min(1),
  description: z.string().optional(),
  allowedStrengths: z.array(z.enum(["hard", "soft", "context"])).min(1),
  policyMetadata: z.unknown().optional(),
});

const createDraftInput = z.object({
  methodologyKey: z.string().min(1),
  displayName: z.string().min(1),
  version: z.string().min(1),
  workUnitTypes: z.array(z.unknown()),
  agentTypes: z.array(z.unknown()).optional().default([]),
  transitions: z.array(z.unknown()),
  factDefinitions: z.array(variableDefinitionSchema).optional(),
  linkTypeDefinitions: z.array(linkTypeDefinitionSchema).optional(),
});

const updateDraftWorkflowsInput = z.object({
  versionId: z.string().min(1),
  workflows: z.array(workflowSchema),
  transitionWorkflowBindings: z.record(z.string(), z.array(z.string())),
  guidance: guidanceSchema,
});

const validateDraftInput = z.object({
  versionId: z.string().min(1),
});

const draftProjectionInput = z.object({
  versionId: z.string().min(1),
});

const lineageInput = z.object({
  methodologyVersionId: z.string().min(1),
});

const publishDraftInput = z.object({
  versionId: z.string().min(1),
  publishedVersion: z.string().min(1),
});

const publicationEvidenceInput = z.object({
  methodologyVersionId: z.string().min(1),
});

const projectPinInput = z.object({
  projectId: z.string().min(1),
  methodologyKey: z.string().min(1),
  publishedVersion: z.string().min(1),
});

const projectPinLineageInput = z.object({
  projectId: z.string().min(1),
});

const publishedContractQueryInput = z.object({
  methodologyKey: z.string().min(1),
  publishedVersion: z.string().min(1),
  workUnitTypeKey: z.string().min(1),
});

// Lifecycle definition schemas
const lifecycleStateSchema = z.object({
  key: z.string().min(1),
  displayName: z.string().optional(),
  description: z.string().optional(),
});

const transitionRequiredLinkSchema = z.object({
  linkTypeKey: z.string().min(1),
  strength: z.enum(["hard", "soft", "context"]).optional(),
  required: z.boolean().optional(),
});

const lifecycleTransitionSchema = z.object({
  transitionKey: z.string().min(1),
  fromState: z.string().optional(), // undefined/null = __absent__
  toState: z.string().min(1),
  gateClass: z.enum(["start_gate", "completion_gate"]),
  requiredLinks: z.array(transitionRequiredLinkSchema),
});

const factSchemaDefinition = z.object({
  key: z.string().min(1),
  factType: z.enum(["string", "number", "boolean", "json"]),
  required: z.boolean().optional(),
  defaultValue: z.unknown().optional(),
});

const workUnitTypeSchema = z.object({
  key: z.string().min(1),
  displayName: z.string().optional(),
  description: z.string().optional(),
  cardinality: z.enum(["one_per_project", "many_per_project"]),
  lifecycleStates: z.array(lifecycleStateSchema),
  lifecycleTransitions: z.array(lifecycleTransitionSchema),
  factSchemas: z.array(factSchemaDefinition),
});

const modelReferenceSchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
});

const agentTypeSchema = z.object({
  key: z.string().min(1),
  displayName: z.string().optional(),
  description: z.string().optional(),
  persona: z.string().min(1),
  defaultModel: modelReferenceSchema.optional(),
  mcpServers: z.array(z.string().min(1)).optional(),
  capabilities: z.array(z.string().min(1)).optional(),
});

const updateDraftLifecycleInput = z.object({
  versionId: z.string().min(1),
  workUnitTypes: z.array(workUnitTypeSchema),
  agentTypes: z.array(agentTypeSchema).optional().default([]),
});

const getTransitionEligibilityInput = z.object({
  projectId: z.string().min(1),
  workUnitTypeKey: z.string().min(1),
  currentState: z.string().optional(),
});

const methodologyKeyInput = z.object({
  methodologyKey: z.string().min(1),
});

const createMethodologyInput = z.object({
  methodologyKey: z.string().min(1),
  displayName: z.string().min(1),
});

function serializeVersion(v: MethodologyVersionRow) {
  return {
    id: v.id,
    methodologyId: v.methodologyId,
    version: v.version,
    status: v.status,
    displayName: v.displayName,
    definitionExtensions: v.definitionExtensions,
    createdAt: v.createdAt.toISOString(),
    retiredAt: v.retiredAt?.toISOString() ?? null,
  };
}

function serializeEvent(e: MethodologyVersionEventRow) {
  return {
    id: e.id,
    methodologyVersionId: e.methodologyVersionId,
    eventType: e.eventType,
    actorId: e.actorId,
    changedFieldsJson: e.changedFieldsJson,
    diagnosticsJson: e.diagnosticsJson,
    createdAt: e.createdAt.toISOString(),
  };
}

function serializePublicationEvidence(evidence: {
  actorId: string | null;
  timestamp: string;
  sourceDraftRef: string;
  publishedVersion: string;
  validationSummary: ValidationResult;
  evidenceRef: string;
}) {
  return {
    actorId: evidence.actorId,
    timestamp: evidence.timestamp,
    sourceDraftRef: evidence.sourceDraftRef,
    publishedVersion: evidence.publishedVersion,
    validationSummary: evidence.validationSummary,
    evidenceRef: evidence.evidenceRef,
  };
}

function serializeProjectPinEvent(event: {
  id: string;
  projectId: string;
  eventType: "pinned" | "repinned";
  actorId: string | null;
  previousVersion: string | null;
  newVersion: string;
  timestamp: string;
  evidenceRef: string;
}) {
  return {
    id: event.id,
    projectId: event.projectId,
    eventType: event.eventType,
    actorId: event.actorId,
    previousVersion: event.previousVersion,
    newVersion: event.newVersion,
    timestamp: event.timestamp,
    evidenceRef: event.evidenceRef,
  };
}

function mapEffectError(err: MethodologyError | LifecycleError | unknown): never {
  const tag =
    err && typeof err === "object" && "_tag" in err ? (err as { _tag: string })._tag : undefined;
  switch (tag) {
    case "VersionNotFoundError":
    case "MethodologyNotFoundError":
      throw new ORPCError("NOT_FOUND", { message: String(err) });
    case "DuplicateVersionError":
      throw new ORPCError("CONFLICT", { message: String(err) });
    case "VersionNotDraftError":
      throw new ORPCError("PRECONDITION_FAILED", { message: String(err) });
    case "ValidationDecodeError":
      throw new ORPCError("BAD_REQUEST", { message: String(err) });
    case "RepositoryError":
      throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Repository operation failed" });
    default:
      throw new ORPCError("INTERNAL_SERVER_ERROR", { message: String(err) });
  }
}

function runEffect<A>(
  serviceLayer: Layer.Layer<MethodologyVersionService | LifecycleService | EligibilityService>,
  effect: Effect.Effect<
    A,
    MethodologyError | LifecycleError,
    MethodologyVersionService | LifecycleService | EligibilityService
  >,
): Promise<A> {
  return Effect.runPromise(
    effect.pipe(
      Effect.provide(serviceLayer),
      Effect.catchAll((err) => Effect.sync(() => mapEffectError(err))),
    ),
  );
}

export function createMethodologyRouter(
  serviceLayer: Layer.Layer<MethodologyVersionService | LifecycleService | EligibilityService>,
) {
  return {
    createMethodology: protectedProcedure
      .input(createMethodologyInput)
      .handler(async ({ input }) => {
        return runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* MethodologyVersionService;
            return yield* svc.createMethodology(input.methodologyKey, input.displayName);
          }),
        );
      }),

    listMethodologies: publicProcedure.handler(async () => {
      return runEffect(
        serviceLayer,
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionService;
          return yield* svc.listMethodologies();
        }),
      );
    }),

    getMethodologyDetails: publicProcedure.input(methodologyKeyInput).handler(async ({ input }) => {
      const details = await runEffect(
        serviceLayer,
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionService;
          return yield* svc.getMethodologyDetails(input.methodologyKey);
        }),
      );

      if (!details) {
        throw new ORPCError("NOT_FOUND", {
          message: `Methodology '${input.methodologyKey}' not found`,
        });
      }

      return details;
    }),

    listMethodologyVersions: publicProcedure
      .input(methodologyKeyInput)
      .handler(async ({ input }) => {
        const details = await runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* MethodologyVersionService;
            return yield* svc.getMethodologyDetails(input.methodologyKey);
          }),
        );

        if (!details) {
          throw new ORPCError("NOT_FOUND", {
            message: `Methodology '${input.methodologyKey}' not found`,
          });
        }

        return details.versions;
      }),

    createDraftVersion: protectedProcedure
      .input(createDraftInput)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;
        const createDraftPayload: CreateDraftVersionInput = {
          methodologyKey: input.methodologyKey,
          displayName: input.displayName,
          version: input.version,
          definition: {
            workUnitTypes: input.workUnitTypes,
            agentTypes: input.agentTypes,
            transitions: input.transitions,
            workflows: [],
            transitionWorkflowBindings: {},
          },
          factDefinitions: input.factDefinitions,
          linkTypeDefinitions:
            input.linkTypeDefinitions as CreateDraftVersionInput["linkTypeDefinitions"],
        };

        const result = await runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* MethodologyVersionService;
            return yield* svc.createDraftVersion(createDraftPayload, actorId);
          }),
        );
        return {
          version: serializeVersion(result.version),
          diagnostics: result.diagnostics,
        };
      }),

    validateDraftVersion: protectedProcedure
      .input(validateDraftInput)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;
        return runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* MethodologyVersionService;
            return yield* svc.validateDraftVersion({ versionId: input.versionId }, actorId);
          }),
        );
      }),

    getDraftProjection: publicProcedure.input(draftProjectionInput).handler(async ({ input }) => {
      return runEffect(
        serviceLayer,
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionService;
          return yield* svc.getDraftProjection(input.versionId);
        }),
      );
    }),

    getDraftLineage: publicProcedure.input(lineageInput).handler(async ({ input }) => {
      const events = await runEffect(
        serviceLayer,
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionService;
          return yield* svc.getDraftLineage({
            methodologyVersionId: input.methodologyVersionId,
          });
        }),
      );
      return events.map(serializeEvent);
    }),

    publishDraftVersion: protectedProcedure
      .input(publishDraftInput)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;
        const publishPayload: PublishDraftVersionInput = {
          versionId: input.versionId,
          publishedVersion: input.publishedVersion,
        };

        const result = await runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* MethodologyVersionService;
            return yield* svc.publishDraftVersion(publishPayload, actorId);
          }),
        );

        return {
          published: result.published,
          version: result.version ? serializeVersion(result.version) : null,
          diagnostics: result.diagnostics,
          evidence: result.evidence ? serializePublicationEvidence(result.evidence) : null,
        };
      }),

    getPublicationEvidence: publicProcedure
      .input(publicationEvidenceInput)
      .handler(async ({ input }) => {
        const evidence = await runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* MethodologyVersionService;
            const publicationEvidencePayload: GetPublicationEvidenceInput = {
              methodologyVersionId: input.methodologyVersionId,
            };

            return yield* svc.getPublicationEvidence(publicationEvidencePayload);
          }),
        );

        return evidence.map((row) => serializePublicationEvidence(row));
      }),

    pinProjectMethodologyVersion: protectedProcedure
      .input(projectPinInput)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;
        const pinPayload: PinProjectMethodologyVersionInput = {
          projectId: input.projectId,
          methodologyKey: input.methodologyKey,
          publishedVersion: input.publishedVersion,
        };

        const result = await runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* MethodologyVersionService;
            return yield* svc.pinProjectMethodologyVersion(pinPayload, actorId);
          }),
        );

        return {
          pinned: result.pinned,
          diagnostics: result.diagnostics,
          pin: result.pin ?? null,
        };
      }),

    repinProjectMethodologyVersion: protectedProcedure
      .input(projectPinInput)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;
        const repinPayload: RepinProjectMethodologyVersionInput = {
          projectId: input.projectId,
          methodologyKey: input.methodologyKey,
          publishedVersion: input.publishedVersion,
        };

        const result = await runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* MethodologyVersionService;
            return yield* svc.repinProjectMethodologyVersion(repinPayload, actorId);
          }),
        );

        return {
          repinned: result.repinned,
          diagnostics: result.diagnostics,
          pin: result.pin ?? null,
        };
      }),

    getProjectPinLineage: publicProcedure
      .input(projectPinLineageInput)
      .handler(async ({ input }) => {
        const events = await runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* MethodologyVersionService;
            const projectLineagePayload: GetProjectPinLineageInput = {
              projectId: input.projectId,
            };

            return yield* svc.getProjectPinLineage(projectLineagePayload);
          }),
        );

        return events.map((event) => serializeProjectPinEvent(event));
      }),

    getPublishedContractByVersionAndWorkUnitType: publicProcedure
      .input(publishedContractQueryInput)
      .handler(async ({ input }) => {
        const result = await runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* MethodologyVersionService;
            return yield* svc.getPublishedContractByVersionAndWorkUnitType({
              methodologyKey: input.methodologyKey,
              publishedVersion: input.publishedVersion,
              workUnitTypeKey: input.workUnitTypeKey,
            });
          }),
        );

        return {
          version: serializeVersion(result.version),
          workflows: result.workflows,
          transitionWorkflowBindings: result.transitionWorkflowBindings,
        };
      }),

    updateDraftLifecycle: protectedProcedure
      .input(updateDraftLifecycleInput)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;
        const lifecyclePayload: UpdateDraftLifecycleInput = {
          versionId: input.versionId,
          workUnitTypes: input.workUnitTypes as UpdateDraftLifecycleInput["workUnitTypes"],
          agentTypes: input.agentTypes,
        };

        const result = await runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* LifecycleService;
            return yield* svc.updateDraftLifecycle(lifecyclePayload, actorId);
          }),
        );
        return {
          version: serializeVersion(result.version),
          validation: result.validation,
        };
      }),

    updateDraftWorkflows: protectedProcedure
      .input(updateDraftWorkflowsInput)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;
        const workflowPayload: UpdateDraftWorkflowsInputDto = {
          versionId: input.versionId,
          workflows: input.workflows,
          transitionWorkflowBindings: input.transitionWorkflowBindings,
          guidance: input.guidance,
        };

        const result = await runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* MethodologyVersionService;
            return yield* svc.updateDraftWorkflows(workflowPayload, actorId);
          }),
        );
        return {
          version: serializeVersion(result.version),
          diagnostics: result.diagnostics,
        };
      }),

    getTransitionEligibility: publicProcedure
      .input(getTransitionEligibilityInput)
      .handler(async ({ input }) => {
        const pin = await runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* MethodologyVersionService;
            return yield* svc.getProjectMethodologyPin(input.projectId);
          }),
        );
        if (!pin) {
          throw new ORPCError("NOT_FOUND", {
            message: `No methodology pin found for project '${input.projectId}'`,
          });
        }

        const result = await runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* EligibilityService;
            return yield* svc.getTransitionEligibility({
              versionId: pin.methodologyVersionId,
              workUnitTypeKey: input.workUnitTypeKey,
              currentState: input.currentState,
            });
          }),
        );
        return result;
      }),
  };
}
