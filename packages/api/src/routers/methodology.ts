import { ORPCError } from "@orpc/server";
import {
  MethodologyRepository,
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
import { ProjectContextService } from "@chiron/project-context";
import type {
  CreateMethodologyWorkUnitInput,
  UpdateMethodologyWorkUnitInput,
  UpdateDraftLifecycleInput,
} from "@chiron/contracts/methodology/lifecycle";
import type {
  CreateMethodologyAgentInput,
  DeleteMethodologyAgentInput,
  UpdateMethodologyAgentInput,
} from "@chiron/contracts/methodology/agent";
import type {
  CreateMethodologyDependencyDefinitionInput,
  DeleteMethodologyDependencyDefinitionInput,
  UpdateMethodologyDependencyDefinitionInput,
} from "@chiron/contracts/methodology/dependency";

import type {
  CreateVersionInput,
  GetVersionLineageInput,
  GetVersionPublicationEvidenceInput,
  GetProjectPinLineageInput,
  PinProjectMethodologyVersionInput,
  PublishVersionInput,
  RepinProjectMethodologyVersionInput,
  UpdateVersionInput,
  ValidationResult,
  ValidateVersionInput,
  ProjectMethodologyPinEvent,
} from "@chiron/contracts/methodology/version";
import type {
  CreateMethodologyFactInput,
  DeleteMethodologyFactInput,
  UpdateMethodologyFactInput,
} from "@chiron/contracts/methodology/fact";
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

const guidanceMarkdownSchema = z.object({ markdown: z.string() });

const audienceGuidanceSchema = z.object({
  human: guidanceMarkdownSchema,
  agent: guidanceMarkdownSchema,
});

const audienceMarkdownJsonSchema = audienceGuidanceSchema.optional();
const factGuidanceSchema = audienceGuidanceSchema.optional();

const guidanceOverlayMapSchema = z.record(z.string(), z.unknown()).default({});

const guidanceSchema = z
  .object({
    global: z.unknown().optional(),
    byWorkUnitType: guidanceOverlayMapSchema,
    byAgentType: guidanceOverlayMapSchema,
    byTransition: guidanceOverlayMapSchema,
    byWorkflow: guidanceOverlayMapSchema,
  })
  .optional();

const factValidationSchema = z
  .union([
    z.object({ kind: z.literal("none") }),
    z.object({
      kind: z.literal("path"),
      path: z.object({
        pathKind: z.enum(["file", "directory"]),
        normalization: z
          .object({
            mode: z.literal("posix").default("posix"),
            trimWhitespace: z.boolean().default(true),
          })
          .default({ mode: "posix", trimWhitespace: true }),
        safety: z
          .object({
            disallowAbsolute: z.boolean().default(true),
            preventTraversal: z.boolean().default(true),
          })
          .default({ disallowAbsolute: true, preventTraversal: true }),
      }),
    }),
    z.object({
      kind: z.literal("json-schema"),
      schemaDialect: z.string().min(1),
      schema: z.unknown(),
    }),
  ])
  .default({ kind: "none" });

const variableDefinitionSchema = z.object({
  name: z.string().optional(),
  key: z.string().min(1),
  factType: z.enum(["string", "number", "boolean", "json"]),
  defaultValue: z.unknown().optional(),
  description: audienceMarkdownJsonSchema,
  guidance: factGuidanceSchema,
  validation: factValidationSchema,
});

const linkTypeDefinitionSchema = z
  .object({
    key: z.string().min(1),
    name: z.string().optional(),
    description: z.string().optional(),
    guidance: factGuidanceSchema,
  })
  .strict();

const createDraftInput = z.object({
  methodologyKey: z.string().min(1),
  displayName: z.string().min(1),
  version: z.string().min(1),
  workUnitTypes: z.array(z.unknown()),
  agentTypes: z.array(z.unknown()).optional().default([]),
  transitions: z.array(z.unknown()).optional().default([]),
  factDefinitions: z.array(variableDefinitionSchema).optional(),
  linkTypeDefinitions: z.array(linkTypeDefinitionSchema).optional(),
});

const updateVersionInput = createDraftInput.extend({
  versionId: z.string().min(1),
});

const updateDraftWorkflowsInput = z.object({
  versionId: z.string().min(1),
  workflows: z.array(workflowSchema),
  transitionWorkflowBindings: z.record(z.string(), z.array(z.string())),
  guidance: guidanceSchema,
  factDefinitions: z.array(variableDefinitionSchema).optional(),
});

const createFactInput = z.object({
  versionId: z.string().min(1),
  fact: variableDefinitionSchema,
});

const updateFactInput = z.object({
  versionId: z.string().min(1),
  factKey: z.string().min(1),
  fact: variableDefinitionSchema,
});

const deleteFactInput = z.object({
  versionId: z.string().min(1),
  factKey: z.string().min(1),
});

const validateDraftInput = z.object({
  versionId: z.string().min(1),
});

const versionInput = z.object({
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

const transitionConditionSchema = z.object({
  kind: z.string().min(1),
  required: z.boolean().optional(),
  config: z.unknown(),
  rationale: z.string().optional(),
});

const transitionConditionGroupSchema = z.object({
  key: z.string().min(1),
  mode: z.enum(["all", "any"]),
  conditions: z.array(transitionConditionSchema),
});

const transitionConditionSetSchema = z.object({
  key: z.string().min(1),
  phase: z.enum(["start", "completion"]),
  mode: z.enum(["all", "any"]),
  groups: z.array(transitionConditionGroupSchema),
  guidance: z.string().optional(),
});

const lifecycleTransitionSchema = z.object({
  transitionKey: z.string().min(1),
  fromState: z.string().optional(), // undefined/null = __absent__
  toState: z.string().min(1),
  gateClass: z.enum(["start_gate", "completion_gate"]),
  conditionSets: z.array(transitionConditionSetSchema),
});

const factSchemaDefinition = z.object({
  name: z.string().optional(),
  key: z.string().min(1),
  factType: z.enum(["string", "number", "boolean", "json"]),
  defaultValue: z.unknown().optional(),
  description: z.string().optional(),
  guidance: factGuidanceSchema,
  validation: factValidationSchema,
});

const workUnitTypeSchema = z.object({
  key: z.string().min(1),
  displayName: z.string().optional(),
  description: z.string().optional(),
  guidance: factGuidanceSchema.optional(),
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

const createAgentInput = z.object({
  versionId: z.string().min(1),
  agent: agentTypeSchema,
});

const createWorkUnitInput = z.object({
  versionId: z.string().min(1),
  workUnitType: z.object({
    key: z.string().min(1),
    displayName: z.string().optional(),
    description: z.string().optional(),
    guidance: factGuidanceSchema.optional(),
    cardinality: z.enum(["one_per_project", "many_per_project"]).optional(),
  }),
});

const updateWorkUnitInput = z.object({
  versionId: z.string().min(1),
  workUnitKey: z.string().min(1),
  workUnitType: z.object({
    key: z.string().min(1),
    displayName: z.string().optional(),
    description: z.string().optional(),
    guidance: audienceGuidanceSchema.optional(),
    cardinality: z.enum(["one_per_project", "many_per_project"]).optional(),
  }),
});

const updateAgentInput = z.object({
  versionId: z.string().min(1),
  agentKey: z.string().min(1),
  agent: agentTypeSchema,
});

const deleteAgentInput = z.object({
  versionId: z.string().min(1),
  agentKey: z.string().min(1),
});

const createDependencyDefinitionInput = z.object({
  versionId: z.string().min(1),
  dependencyDefinition: linkTypeDefinitionSchema,
});

const updateDependencyDefinitionInput = z.object({
  versionId: z.string().min(1),
  dependencyKey: z.string().min(1),
  dependencyDefinition: linkTypeDefinitionSchema,
});

const deleteDependencyDefinitionInput = z.object({
  versionId: z.string().min(1),
  dependencyKey: z.string().min(1),
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

const updateMethodologyInput = createMethodologyInput;

function serializeVersion(v: MethodologyVersionRow) {
  return {
    id: v.id,
    methodologyId: v.methodologyId,
    version: v.version,
    status: v.status,
    displayName: v.displayName,
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

type MethodologyVersionSummaryLike = {
  id: string;
  status: string;
};

function addVersionEditabilityMetadata<T extends MethodologyVersionSummaryLike>(
  versions: readonly T[],
  pinnedCountByVersionId: ReadonlyMap<string, number>,
) {
  return versions.map((version) => {
    const pinnedProjectCount = pinnedCountByVersionId.get(version.id) ?? 0;
    const isArchived = version.status === "archived";
    const isEditable = !isArchived && pinnedProjectCount === 0;

    return {
      ...version,
      pinnedProjectCount,
      isEditable,
      editabilityReason: isArchived ? "archived" : pinnedProjectCount > 0 ? "pinned" : "editable",
    } as const;
  });
}

function mapEffectError(err: MethodologyError | LifecycleError | unknown): never {
  const tag =
    err && typeof err === "object" && "_tag" in err ? (err as { _tag: string })._tag : undefined;
  switch (tag) {
    case "VersionNotFoundError":
    case "MethodologyNotFoundError":
      throw new ORPCError("NOT_FOUND", { message: String(err) });
    case "DuplicateVersionError":
    case "DraftVersionAlreadyExistsError":
    case "DuplicateDependencyDefinitionError":
      throw new ORPCError("CONFLICT", { message: String(err) });
    case "VersionNotDraftError":
      throw new ORPCError("PRECONDITION_FAILED", { message: String(err) });
    case "DependencyDefinitionNotFoundError":
      throw new ORPCError("NOT_FOUND", { message: String(err) });
    case "ValidationDecodeError":
      throw new ORPCError("BAD_REQUEST", { message: String(err) });
    case "RepositoryError":
      throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Repository operation failed" });
    default:
      throw new ORPCError("INTERNAL_SERVER_ERROR", { message: String(err) });
  }
}

function runEffect<A>(
  serviceLayer: Layer.Layer<any>,
  effect: Effect.Effect<A, MethodologyError | LifecycleError | unknown, any>,
): Promise<A> {
  return Effect.runPromise(
    effect.pipe(
      Effect.provide(serviceLayer as Layer.Layer<any>),
      Effect.catchAll((err) => Effect.sync(() => mapEffectError(err))),
    ) as Effect.Effect<A, never, never>,
  );
}

export function createMethodologyRouter(serviceLayer: Layer.Layer<any>) {
  const router = {
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

      const pinnedCounts = await runEffect(
        serviceLayer,
        Effect.gen(function* () {
          const projectSvc = yield* ProjectContextService;
          const projects = yield* projectSvc.listProjects();
          const counts = new Map<string, number>();

          for (const project of projects) {
            const pin = yield* projectSvc.getProjectMethodologyPin(project.id);
            if (!pin || pin.methodologyKey !== input.methodologyKey) {
              continue;
            }

            counts.set(pin.methodologyVersionId, (counts.get(pin.methodologyVersionId) ?? 0) + 1);
          }

          return counts;
        }),
      );

      return {
        ...details,
        versions: addVersionEditabilityMetadata(details.versions, pinnedCounts),
      };
    }),

    updateMethodology: protectedProcedure
      .input(updateMethodologyInput)
      .handler(async ({ input }) => {
        return runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* MethodologyVersionService;
            return yield* svc.updateMethodology(input.methodologyKey, input.displayName);
          }),
        );
      }),

    archiveMethodology: protectedProcedure.input(methodologyKeyInput).handler(async ({ input }) => {
      return runEffect(
        serviceLayer,
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionService;
          return yield* svc.archiveMethodology(input.methodologyKey);
        }),
      );
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

        const pinnedCounts = await runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const projectSvc = yield* ProjectContextService;
            const projects = yield* projectSvc.listProjects();
            const counts = new Map<string, number>();

            for (const project of projects) {
              const pin = yield* projectSvc.getProjectMethodologyPin(project.id);
              if (!pin || pin.methodologyKey !== input.methodologyKey) {
                continue;
              }

              counts.set(pin.methodologyVersionId, (counts.get(pin.methodologyVersionId) ?? 0) + 1);
            }

            return counts;
          }),
        );

        return addVersionEditabilityMetadata(details.versions, pinnedCounts);
      }),

    createDraftVersion: protectedProcedure
      .input(createDraftInput)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;
        const createDraftPayload: CreateVersionInput = {
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
            input.linkTypeDefinitions as CreateVersionInput["linkTypeDefinitions"],
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

    getVersion: publicProcedure.input(versionInput).handler(async ({ input }) => {
      const result = await runEffect(
        serviceLayer,
        Effect.gen(function* () {
          const repo = yield* MethodologyRepository;
          return yield* repo.findVersionById(input.versionId);
        }),
      );

      if (!result) {
        throw new ORPCError("NOT_FOUND", {
          message: `Version '${input.versionId}' not found`,
        });
      }

      return serializeVersion(result);
    }),

    updateVersion: protectedProcedure
      .input(updateVersionInput)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;
        const updatePayload: UpdateVersionInput = {
          versionId: input.versionId,
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
            input.linkTypeDefinitions as UpdateVersionInput["linkTypeDefinitions"],
        };

        const result = await runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* MethodologyVersionService;
            return yield* svc.updateDraftVersion(updatePayload, actorId);
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
        const validatePayload: ValidateVersionInput = { versionId: input.versionId };
        return runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* MethodologyVersionService;
            return yield* svc.validateDraftVersion(validatePayload, actorId);
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
          const lineagePayload: GetVersionLineageInput = {
            methodologyVersionId: input.methodologyVersionId,
          };

          return yield* svc.getDraftLineage(lineagePayload);
        }),
      );
      return events.map(serializeEvent);
    }),

    publishDraftVersion: protectedProcedure
      .input(publishDraftInput)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;
        const publishPayload: PublishVersionInput = {
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
            const publicationEvidencePayload: GetVersionPublicationEvidenceInput = {
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
            const svc = yield* ProjectContextService;
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
            const svc = yield* ProjectContextService;
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
            const svc = yield* ProjectContextService;
            const projectLineagePayload: GetProjectPinLineageInput = {
              projectId: input.projectId,
            };

            return yield* svc.getProjectPinLineage(projectLineagePayload);
          }),
        );

        return events.map((event: ProjectMethodologyPinEvent) => serializeProjectPinEvent(event));
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
          factDefinitions: input.factDefinitions,
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

    createFact: protectedProcedure.input(createFactInput).handler(async ({ input, context }) => {
      const actorId = context.session.user.id;
      const factPayload: CreateMethodologyFactInput = {
        versionId: input.versionId,
        fact: input.fact,
      };

      const result = await runEffect(
        serviceLayer,
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionService;
          return yield* svc.createFact(factPayload, actorId);
        }),
      );

      return {
        version: serializeVersion(result.version),
        diagnostics: result.diagnostics,
      };
    }),

    updateFact: protectedProcedure.input(updateFactInput).handler(async ({ input, context }) => {
      const actorId = context.session.user.id;
      const factPayload: UpdateMethodologyFactInput = {
        versionId: input.versionId,
        factKey: input.factKey,
        fact: input.fact,
      };

      const result = await runEffect(
        serviceLayer,
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionService;
          return yield* svc.updateFact(factPayload, actorId);
        }),
      );

      return {
        version: serializeVersion(result.version),
        diagnostics: result.diagnostics,
      };
    }),

    deleteFact: protectedProcedure.input(deleteFactInput).handler(async ({ input, context }) => {
      const actorId = context.session.user.id;
      const factPayload: DeleteMethodologyFactInput = {
        versionId: input.versionId,
        factKey: input.factKey,
      };

      const result = await runEffect(
        serviceLayer,
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionService;
          return yield* svc.deleteFact(factPayload, actorId);
        }),
      );

      return {
        version: serializeVersion(result.version),
        diagnostics: result.diagnostics,
      };
    }),

    createAgent: protectedProcedure.input(createAgentInput).handler(async ({ input, context }) => {
      const actorId = context.session.user.id;
      const agentPayload: CreateMethodologyAgentInput = {
        versionId: input.versionId,
        agent: input.agent,
      };

      const result = await runEffect(
        serviceLayer,
        Effect.gen(function* () {
          const svc = yield* LifecycleService;
          return yield* svc.createAgent(agentPayload, actorId);
        }),
      );

      return {
        version: serializeVersion(result.version),
        diagnostics: result.validation,
      };
    }),

    createWorkUnit: protectedProcedure
      .input(createWorkUnitInput)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;
        const workUnitPayload: CreateMethodologyWorkUnitInput = {
          versionId: input.versionId,
          workUnitType: {
            key: input.workUnitType.key,
            displayName: input.workUnitType.displayName,
            description: input.workUnitType.description,
            guidance: input.workUnitType.guidance,
            cardinality: input.workUnitType.cardinality,
          },
        };

        const result = await runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* LifecycleService;
            return yield* svc.createWorkUnit(workUnitPayload, actorId);
          }),
        );

        return {
          version: serializeVersion(result.version),
          diagnostics: result.validation,
        };
      }),

    updateWorkUnit: protectedProcedure
      .input(updateWorkUnitInput)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;
        const workUnitPayload: UpdateMethodologyWorkUnitInput = {
          versionId: input.versionId,
          workUnitKey: input.workUnitKey,
          workUnitType: {
            key: input.workUnitType.key,
            displayName: input.workUnitType.displayName,
            description: input.workUnitType.description,
            guidance: input.workUnitType.guidance,
            cardinality: input.workUnitType.cardinality,
          },
        };

        const result = await runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* LifecycleService;
            return yield* svc.updateWorkUnit(workUnitPayload, actorId);
          }),
        );

        return {
          version: serializeVersion(result.version),
          diagnostics: result.validation,
        };
      }),

    updateAgent: protectedProcedure.input(updateAgentInput).handler(async ({ input, context }) => {
      const actorId = context.session.user.id;
      const agentPayload: UpdateMethodologyAgentInput = {
        versionId: input.versionId,
        agentKey: input.agentKey,
        agent: input.agent,
      };

      const result = await runEffect(
        serviceLayer,
        Effect.gen(function* () {
          const svc = yield* LifecycleService;
          return yield* svc.updateAgent(agentPayload, actorId);
        }),
      );

      return {
        version: serializeVersion(result.version),
        diagnostics: result.validation,
      };
    }),

    deleteAgent: protectedProcedure.input(deleteAgentInput).handler(async ({ input, context }) => {
      const actorId = context.session.user.id;
      const agentPayload: DeleteMethodologyAgentInput = {
        versionId: input.versionId,
        agentKey: input.agentKey,
      };

      const result = await runEffect(
        serviceLayer,
        Effect.gen(function* () {
          const svc = yield* LifecycleService;
          return yield* svc.deleteAgent(agentPayload, actorId);
        }),
      );

      return {
        version: serializeVersion(result.version),
        diagnostics: result.validation,
      };
    }),

    createDependencyDefinition: protectedProcedure
      .input(createDependencyDefinitionInput)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;
        const dependencyPayload: CreateMethodologyDependencyDefinitionInput = {
          versionId: input.versionId,
          dependencyDefinition: input.dependencyDefinition,
        };

        const result = await runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* MethodologyVersionService;
            return yield* svc.createDependencyDefinition(dependencyPayload, actorId);
          }),
        );

        return {
          version: serializeVersion(result.version),
          diagnostics: result.diagnostics,
        };
      }),

    updateDependencyDefinition: protectedProcedure
      .input(updateDependencyDefinitionInput)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;
        const dependencyPayload: UpdateMethodologyDependencyDefinitionInput = {
          versionId: input.versionId,
          dependencyKey: input.dependencyKey,
          dependencyDefinition: input.dependencyDefinition,
        };

        const result = await runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* MethodologyVersionService;
            return yield* svc.updateDependencyDefinition(dependencyPayload, actorId);
          }),
        );

        return {
          version: serializeVersion(result.version),
          diagnostics: result.diagnostics,
        };
      }),

    deleteDependencyDefinition: protectedProcedure
      .input(deleteDependencyDefinitionInput)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;
        const dependencyPayload: DeleteMethodologyDependencyDefinitionInput = {
          versionId: input.versionId,
          dependencyKey: input.dependencyKey,
        };

        const result = await runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* MethodologyVersionService;
            return yield* svc.deleteDependencyDefinition(dependencyPayload, actorId);
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
            const svc = yield* ProjectContextService;
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

  return {
    ...router,
    catalog: {
      list: router.listMethodologies,
      create: router.createMethodology,
      get: router.getMethodologyDetails,
      update: router.updateMethodology,
      delete: router.archiveMethodology,
    },
    version: {
      list: router.listMethodologyVersions,
      create: router.createDraftVersion,
      get: router.getVersion,
      update: router.updateVersion,
      validate: router.validateDraftVersion,
      workspace: {
        get: router.getDraftProjection,
      },
      fact: {
        list: router.getDraftProjection,
        create: router.createFact,
        update: router.updateFact,
        delete: router.deleteFact,
      },
      agent: {
        list: router.getDraftProjection,
        create: router.createAgent,
        update: router.updateAgent,
        delete: router.deleteAgent,
      },
      dependencyDefinition: {
        list: router.getDraftProjection,
        create: router.createDependencyDefinition,
        update: router.updateDependencyDefinition,
        delete: router.deleteDependencyDefinition,
      },
      workUnit: {
        list: router.getDraftProjection,
        create: router.createWorkUnit,
        get: router.getDraftProjection,
        updateMeta: router.updateWorkUnit,
        delete: router.updateDraftLifecycle,
      },
      getLineage: router.getDraftLineage,
      publish: router.publishDraftVersion,
      getPublicationEvidence: router.getPublicationEvidence,
    },
  };
}
