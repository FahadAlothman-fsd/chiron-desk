import { ORPCError } from "@orpc/server";
import {
  MethodologyRepository,
  MethodologyVersionBoundaryService,
  WorkflowService,
  type MethodologyVersionRow,
  type MethodologyVersionEventRow,
  type MethodologyError,
} from "@chiron/methodology-engine";

import { EligibilityService, type LifecycleError } from "@chiron/methodology-engine";
import { ProjectContextService } from "@chiron/project-context";
import type {
  CreateMethodologyWorkUnitInput,
  ReplaceWorkUnitTransitionBindingsInput,
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
  FactSchema,
  UpdateMethodologyFactInput,
} from "@chiron/contracts/methodology/fact";
import type {
  CreateWorkUnitArtifactSlotInput,
  DeleteWorkUnitArtifactSlotInput,
  GetWorkUnitArtifactSlotsInput,
  UpdateWorkUnitArtifactSlotInput,
} from "@chiron/contracts/methodology/artifact-slot";
import type {
  CreateWorkUnitWorkflowInput,
  DeleteWorkUnitWorkflowInput,
  UpdateWorkUnitWorkflowInput,
} from "@chiron/contracts/methodology/workflow";
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

const workflowMetadataValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
]);

const workflowMetadataSchema = z
  .object({
    key: z.string().min(1),
    displayName: z.string().optional(),
    workUnitTypeKey: z.string().min(1).optional(),
    metadata: z.record(z.string(), workflowMetadataValueSchema).optional(),
    guidance: z
      .object({
        human: z.object({ markdown: z.string() }),
        agent: z.object({ markdown: z.string() }),
      })
      .optional(),
  })
  .strict();

const guidanceMarkdownSchema = z.object({ markdown: z.string() });

const audienceGuidanceSchema = z.object({
  human: guidanceMarkdownSchema,
  agent: guidanceMarkdownSchema,
});
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
  description: z.string().optional(),
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
  workUnitTypes: z.array(z.unknown()).optional().default([]),
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

const listWorkUnitWorkflowsInput = z.object({
  versionId: z.string().min(1),
  workUnitTypeKey: z.string().min(1),
});

const createWorkUnitWorkflowInput = z.object({
  versionId: z.string().min(1),
  workUnitTypeKey: z.string().min(1),
  workflow: workflowMetadataSchema,
});

const updateWorkUnitWorkflowInput = z.object({
  versionId: z.string().min(1),
  workUnitTypeKey: z.string().min(1),
  workflowKey: z.string().min(1),
  workflow: workflowMetadataSchema,
});

const deleteWorkUnitWorkflowInput = z.object({
  versionId: z.string().min(1),
  workUnitTypeKey: z.string().min(1),
  workflowKey: z.string().min(1),
});

const replaceTransitionBindingsInput = z.object({
  versionId: z.string().min(1),
  workUnitTypeKey: z.string().min(1),
  transitionKey: z.string().min(1),
  workflowKeys: z.array(z.string().min(1)),
});

const createTransitionBindingInput = z.object({
  versionId: z.string().min(1),
  workUnitTypeKey: z.string().min(1),
  transitionKey: z.string().min(1),
  workflowKey: z.string().min(1),
});

const deleteTransitionBindingInput = z.object({
  versionId: z.string().min(1),
  workUnitTypeKey: z.string().min(1),
  transitionKey: z.string().min(1),
  workflowKey: z.string().min(1),
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

const createWorkUnitFactInput = z.object({
  versionId: z.string().min(1),
  workUnitTypeKey: z.string().min(1),
  fact: variableDefinitionSchema,
});

const updateWorkUnitFactInput = z.object({
  versionId: z.string().min(1),
  workUnitTypeKey: z.string().min(1),
  factKey: z.string().min(1),
  fact: variableDefinitionSchema,
});

const deleteWorkUnitFactInput = z.object({
  versionId: z.string().min(1),
  workUnitTypeKey: z.string().min(1),
  factKey: z.string().min(1),
});

const deleteWorkUnitInput = z.object({
  versionId: z.string().min(1),
  workUnitTypeKey: z.string().min(1),
});

const validateDraftInput = z.object({
  versionId: z.string().min(1),
});

const versionInput = z.object({
  versionId: z.string().min(1),
});

const updateVersionMetadataInput = z.object({
  versionId: z.string().min(1),
  displayName: z.string().min(1),
  version: z.string().min(1),
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
  guidance: audienceGuidanceSchema.optional(),
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
  conditionSets: z.array(transitionConditionSetSchema),
});

const lifecycleTransitionMetadataSchema = z.object({
  transitionKey: z.string().min(1),
  fromState: z.string().optional(), // undefined/null = __absent__
  toState: z.string().min(1),
});

const upsertWorkUnitLifecycleStateInput = z.object({
  versionId: z.string().min(1),
  workUnitTypeKey: z.string().min(1),
  state: lifecycleStateSchema,
});

const deleteWorkUnitLifecycleStateInput = z.object({
  versionId: z.string().min(1),
  workUnitTypeKey: z.string().min(1),
  stateKey: z.string().min(1),
  strategy: z.enum(["disconnect", "cleanup"]).optional(),
});

const upsertWorkUnitLifecycleTransitionInput = z.object({
  versionId: z.string().min(1),
  workUnitTypeKey: z.string().min(1),
  transition: lifecycleTransitionMetadataSchema,
});

const saveWorkUnitLifecycleTransitionDialogInput = z.object({
  versionId: z.string().min(1),
  workUnitTypeKey: z.string().min(1),
  transition: lifecycleTransitionMetadataSchema,
  conditionSets: z.array(transitionConditionSetSchema),
  workflowKeys: z.array(z.string().min(1)),
});

const deleteWorkUnitLifecycleTransitionInput = z.object({
  versionId: z.string().min(1),
  workUnitTypeKey: z.string().min(1),
  transitionKey: z.string().min(1),
});

const replaceWorkUnitTransitionConditionSetsInput = z.object({
  versionId: z.string().min(1),
  workUnitTypeKey: z.string().min(1),
  transitionKey: z.string().min(1),
  conditionSets: z.array(transitionConditionSetSchema),
});

const listWorkUnitStateMachineInput = z.object({
  versionId: z.string().min(1),
  workUnitTypeKey: z.string().min(1),
});

const listWorkUnitTransitionBindingsInput = z.object({
  versionId: z.string().min(1),
  workUnitTypeKey: z.string().min(1),
  transitionKey: z.string().min(1),
});

const listWorkUnitTransitionConditionSetsInput = z.object({
  versionId: z.string().min(1),
  workUnitTypeKey: z.string().min(1),
  transitionKey: z.string().min(1),
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

const promptTemplateSchema = z.object({
  markdown: z.string().min(1),
});

const lifecycleAgentTypeSchema = z.object({
  key: z.string().min(1),
  displayName: z.string().optional(),
  description: z.string().optional(),
  persona: z.string().min(1),
  promptTemplate: promptTemplateSchema.optional(),
  defaultModel: modelReferenceSchema.optional(),
  mcpServers: z.array(z.string().min(1)).optional(),
  capabilities: z.array(z.string().min(1)).optional(),
});

const agentMutationSchema = z
  .object({
    key: z.string().min(1),
    displayName: z.string().optional(),
    description: z.string().optional(),
    persona: z.string().min(1).optional(),
    promptTemplate: promptTemplateSchema.optional(),
    defaultModel: modelReferenceSchema.optional(),
    mcpServers: z.array(z.string().min(1)).optional(),
    capabilities: z.array(z.string().min(1)).optional(),
  })
  .superRefine((agent, context) => {
    const hasPromptTemplate = typeof agent.promptTemplate?.markdown === "string";
    const hasPersona = typeof agent.persona === "string";
    if (!hasPromptTemplate && !hasPersona) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["promptTemplate"],
        message: "Either promptTemplate.markdown or persona is required.",
      });
    }
  });

const createAgentInput = z.object({
  versionId: z.string().min(1),
  agent: agentMutationSchema,
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
  agent: agentMutationSchema,
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
  agentTypes: z.array(lifecycleAgentTypeSchema).optional().default([]),
});

const getTransitionEligibilityInput = z.object({
  projectId: z.string().min(1),
  workUnitTypeKey: z.string().min(1),
  currentState: z.string().optional(),
});

const artifactSlotTemplateInput = z.object({
  id: z.string().min(1).optional(),
  key: z.string().min(1),
  displayName: z.string().optional(),
  description: audienceGuidanceSchema.optional(),
  guidance: audienceGuidanceSchema.optional(),
  content: z.string().optional(),
});

const artifactSlotInput = z.object({
  id: z.string().min(1).optional(),
  key: z.string().min(1),
  displayName: z.string().optional(),
  description: audienceGuidanceSchema.optional(),
  guidance: audienceGuidanceSchema.optional(),
  cardinality: z.enum(["single", "fileset"]),
  rules: z.unknown().optional(),
  templates: z.array(artifactSlotTemplateInput).default([]),
});

const getWorkUnitArtifactSlotsInput = z.object({
  versionId: z.string().min(1),
  workUnitTypeKey: z.string().min(1),
});

const createWorkUnitArtifactSlotInput = z.object({
  versionId: z.string().min(1),
  workUnitTypeKey: z.string().min(1),
  slot: artifactSlotInput,
});

const updateWorkUnitArtifactSlotInput = z.object({
  versionId: z.string().min(1),
  workUnitTypeKey: z.string().min(1),
  slotId: z.string().min(1),
  slot: z.object({
    key: z.string().min(1),
    displayName: z.string().optional(),
    description: audienceGuidanceSchema.optional(),
    guidance: audienceGuidanceSchema.optional(),
    cardinality: z.enum(["single", "fileset"]),
    rules: z.unknown().optional(),
  }),
  templateOps: z
    .object({
      add: z.array(artifactSlotTemplateInput).default([]),
      remove: z.array(z.string().min(1)).default([]),
      update: z
        .array(
          z.object({
            templateId: z.string().min(1),
            template: z.object({
              key: z.string().min(1),
              displayName: z.string().optional(),
              description: audienceGuidanceSchema.optional(),
              guidance: audienceGuidanceSchema.optional(),
              content: z.string().optional(),
            }),
          }),
        )
        .default([]),
    })
    .default({ add: [], remove: [], update: [] }),
});

const deleteWorkUnitArtifactSlotInput = z.object({
  versionId: z.string().min(1),
  workUnitTypeKey: z.string().min(1),
  slotId: z.string().min(1),
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

function extractText(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null || !("human" in value)) {
    return undefined;
  }

  const human = (value as { human?: unknown }).human;
  if (typeof human !== "object" || human === null || !("markdown" in human)) {
    return undefined;
  }

  const markdown = (human as { markdown?: unknown }).markdown;
  return typeof markdown === "string" ? markdown : undefined;
}

export function createMethodologyRouter(serviceLayer: Layer.Layer<any>) {
  const router = {
    createMethodology: protectedProcedure
      .input(createMethodologyInput)
      .handler(async ({ input }) => {
        return runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* MethodologyVersionBoundaryService;
            return yield* svc.createMethodology(input.methodologyKey, input.displayName);
          }),
        );
      }),

    listMethodologies: publicProcedure.handler(async () => {
      return runEffect(
        serviceLayer,
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionBoundaryService;
          return yield* svc.listMethodologies();
        }),
      );
    }),

    getMethodologyDetails: publicProcedure.input(methodologyKeyInput).handler(async ({ input }) => {
      const details = await runEffect(
        serviceLayer,
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionBoundaryService;
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
            const svc = yield* MethodologyVersionBoundaryService;
            return yield* svc.updateMethodology(input.methodologyKey, input.displayName);
          }),
        );
      }),

    archiveMethodology: protectedProcedure.input(methodologyKeyInput).handler(async ({ input }) => {
      return runEffect(
        serviceLayer,
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionBoundaryService;
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
            const svc = yield* MethodologyVersionBoundaryService;
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
            const svc = yield* MethodologyVersionBoundaryService;
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
            const svc = yield* MethodologyVersionBoundaryService;
            return yield* svc.updateDraftVersion(updatePayload, actorId);
          }),
        );

        return {
          version: serializeVersion(result.version),
          diagnostics: result.diagnostics,
        };
      }),

    updateVersionMetadata: protectedProcedure
      .input(updateVersionMetadataInput)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;
        const result = await runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* MethodologyVersionBoundaryService;
            return yield* svc.updateVersionMetadata(
              {
                versionId: input.versionId,
                displayName: input.displayName,
                version: input.version,
              },
              actorId,
            );
          }),
        );

        return {
          version: serializeVersion(result.version),
          diagnostics: result.diagnostics,
        };
      }),

    archiveVersion: protectedProcedure.input(versionInput).handler(async ({ input, context }) => {
      const actorId = context.session.user.id;
      const version = await runEffect(
        serviceLayer,
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionBoundaryService;
          return yield* svc.archiveVersion({ versionId: input.versionId }, actorId);
        }),
      );

      return serializeVersion(version);
    }),

    validateDraftVersion: protectedProcedure
      .input(validateDraftInput)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;
        const validatePayload: ValidateVersionInput = { versionId: input.versionId };
        return runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* MethodologyVersionBoundaryService;
            return yield* svc.validateDraftVersion(validatePayload, actorId);
          }),
        );
      }),

    getDraftProjection: publicProcedure.input(draftProjectionInput).handler(async ({ input }) => {
      return runEffect(
        serviceLayer,
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionBoundaryService;
          const workspaceSnapshot = yield* svc.getVersionWorkspaceSnapshot(input.versionId);
          const snapshotRecord = workspaceSnapshot as unknown as Record<string, unknown>;
          const agentTypes = Array.isArray(snapshotRecord.agentTypes)
            ? snapshotRecord.agentTypes.map((value) => {
                const agent = value as Record<string, unknown>;
                const persona = typeof agent.persona === "string" ? agent.persona : undefined;
                const promptTemplate =
                  agent.promptTemplate && typeof agent.promptTemplate === "object"
                    ? agent.promptTemplate
                    : persona && persona.length > 0
                      ? { markdown: persona }
                      : undefined;
                return {
                  ...agent,
                  ...(promptTemplate ? { promptTemplate } : {}),
                };
              })
            : [];
          return {
            ...snapshotRecord,
            agentTypes,
          };
        }),
      );
    }),

    getVersionWorkspaceStats: publicProcedure.input(versionInput).handler(async ({ input }) => {
      return runEffect(
        serviceLayer,
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionBoundaryService;
          return yield* svc.getVersionWorkspaceStats(input.versionId);
        }),
      );
    }),

    getDraftLineage: publicProcedure.input(lineageInput).handler(async ({ input }) => {
      const events = await runEffect(
        serviceLayer,
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionBoundaryService;
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
            const svc = yield* MethodologyVersionBoundaryService;
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
            const svc = yield* MethodologyVersionBoundaryService;
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
            const svc = yield* MethodologyVersionBoundaryService;
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
            const svc = yield* MethodologyVersionBoundaryService;
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
            const svc = yield* MethodologyVersionBoundaryService;
            return yield* svc.replaceDraftWorkflowSnapshot(workflowPayload, actorId);
          }),
        );
        return {
          version: serializeVersion(result.version),
          diagnostics: result.diagnostics,
        };
      }),

    listWorkUnitWorkflows: publicProcedure
      .input(listWorkUnitWorkflowsInput)
      .handler(async ({ input }) =>
        runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* WorkflowService;
            const workflows = yield* svc.listWorkUnitWorkflows({
              versionId: input.versionId,
              workUnitTypeKey: input.workUnitTypeKey,
            });
            return workflows.map((workflow) => ({
              key: workflow.key,
              displayName: workflow.displayName,
              workUnitTypeKey: workflow.workUnitTypeKey,
              metadata: workflow.metadata,
              guidance: workflow.guidance,
            }));
          }),
        ),
      ),

    createWorkUnitWorkflow: protectedProcedure
      .input(createWorkUnitWorkflowInput)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;
        const payload: CreateWorkUnitWorkflowInput = {
          versionId: input.versionId,
          workUnitTypeKey: input.workUnitTypeKey,
          workflow: {
            ...input.workflow,
            workUnitTypeKey: input.workUnitTypeKey,
            steps: [],
            edges: [],
          },
        };

        const result = await runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* WorkflowService;
            return yield* svc.createWorkUnitWorkflow(payload, actorId);
          }),
        );

        return {
          version: serializeVersion(result.version),
          diagnostics: result.diagnostics,
        };
      }),

    updateWorkUnitWorkflow: protectedProcedure
      .input(updateWorkUnitWorkflowInput)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;
        const payload: UpdateWorkUnitWorkflowInput = {
          versionId: input.versionId,
          workUnitTypeKey: input.workUnitTypeKey,
          workflowKey: input.workflowKey,
          workflow: {
            ...input.workflow,
            workUnitTypeKey: input.workUnitTypeKey,
            steps: [],
            edges: [],
          },
        };

        const result = await runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* WorkflowService;
            return yield* svc.updateWorkUnitWorkflow(payload, actorId);
          }),
        );

        return {
          version: serializeVersion(result.version),
          diagnostics: result.diagnostics,
        };
      }),

    deleteWorkUnitWorkflow: protectedProcedure
      .input(deleteWorkUnitWorkflowInput)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;
        const payload: DeleteWorkUnitWorkflowInput = {
          versionId: input.versionId,
          workUnitTypeKey: input.workUnitTypeKey,
          workflowKey: input.workflowKey,
        };

        const result = await runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* WorkflowService;
            return yield* svc.deleteWorkUnitWorkflow(payload, actorId);
          }),
        );

        return {
          version: serializeVersion(result.version),
          diagnostics: result.diagnostics,
        };
      }),

    replaceTransitionBindings: protectedProcedure
      .input(replaceTransitionBindingsInput)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;
        const payload: ReplaceWorkUnitTransitionBindingsInput = {
          versionId: input.versionId,
          workUnitTypeKey: input.workUnitTypeKey,
          transitionKey: input.transitionKey,
          workflowKeys: input.workflowKeys,
        };

        const result = await runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* MethodologyVersionBoundaryService;
            return yield* svc.replaceTransitionBindings(payload, actorId);
          }),
        );

        return {
          version: serializeVersion(result.version),
          diagnostics: result.diagnostics,
        };
      }),

    listFactDefinitions: publicProcedure.input(versionInput).handler(async ({ input }) => {
      return runEffect(
        serviceLayer,
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionBoundaryService;
          const snapshot = yield* svc.getAuthoringSnapshot(input.versionId);
          return {
            factDefinitions: snapshot.factDefinitions,
          };
        }),
      );
    }),

    listAgentDefinitions: publicProcedure.input(versionInput).handler(async ({ input }) => {
      return runEffect(
        serviceLayer,
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionBoundaryService;
          const snapshot = yield* svc.getAuthoringSnapshot(input.versionId);
          return {
            agentTypes: snapshot.agentTypes,
          };
        }),
      );
    }),

    listDependencyDefinitions: publicProcedure.input(versionInput).handler(async ({ input }) => {
      return runEffect(
        serviceLayer,
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionBoundaryService;
          const snapshot = yield* svc.getAuthoringSnapshot(input.versionId);
          return {
            linkTypeDefinitions: snapshot.linkTypeDefinitions,
            transitionWorkflowBindings: snapshot.transitionWorkflowBindings,
          };
        }),
      );
    }),

    listWorkUnitDefinitions: publicProcedure.input(versionInput).handler(async ({ input }) => {
      return runEffect(
        serviceLayer,
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionBoundaryService;
          const snapshot = yield* svc.getAuthoringSnapshot(input.versionId);
          return {
            workUnitTypes: snapshot.workUnitTypes,
            workflows: snapshot.workflows,
          };
        }),
      );
    }),

    getWorkUnitDefinitions: publicProcedure.input(versionInput).handler(async ({ input }) => {
      return runEffect(
        serviceLayer,
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionBoundaryService;
          const snapshot = yield* svc.getAuthoringSnapshot(input.versionId);
          return {
            workUnitTypes: snapshot.workUnitTypes,
            workflows: snapshot.workflows,
            linkTypeDefinitions: snapshot.linkTypeDefinitions,
            transitionWorkflowBindings: snapshot.transitionWorkflowBindings,
            factDefinitions: snapshot.factDefinitions,
            agentTypes: snapshot.agentTypes,
          };
        }),
      );
    }),

    listWorkUnitFacts: publicProcedure.input(versionInput).handler(async ({ input }) => {
      return runEffect(
        serviceLayer,
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionBoundaryService;
          const snapshot = yield* svc.getAuthoringSnapshot(input.versionId);
          return {
            workUnitTypes: snapshot.workUnitTypes.map((workUnitType) => ({
              key: workUnitType.key,
              factSchemas: workUnitType.factSchemas,
            })),
            factDefinitions: snapshot.factDefinitions,
          };
        }),
      );
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
          const svc = yield* MethodologyVersionBoundaryService;
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
          const svc = yield* MethodologyVersionBoundaryService;
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
          const svc = yield* MethodologyVersionBoundaryService;
          return yield* svc.deleteFact(factPayload, actorId);
        }),
      );

      return {
        version: serializeVersion(result.version),
        diagnostics: result.diagnostics,
      };
    }),

    createWorkUnitFact: protectedProcedure
      .input(createWorkUnitFactInput)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;

        const snapshot = await runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* MethodologyVersionBoundaryService;
            return yield* svc.getAuthoringSnapshot(input.versionId);
          }),
        );

        const workUnit = snapshot.workUnitTypes.find(
          (entry) => entry.key === input.workUnitTypeKey,
        );
        if (!workUnit) {
          throw new ORPCError("NOT_FOUND", {
            message: `Work unit type '${input.workUnitTypeKey}' not found in draft '${input.versionId}'`,
          });
        }

        const currentFacts = workUnit.factSchemas;
        const duplicate = currentFacts.some((fact) => fact.key === input.fact.key);
        if (duplicate) {
          throw new ORPCError("CONFLICT", {
            message: `Fact '${input.fact.key}' already exists for work unit '${input.workUnitTypeKey}'`,
          });
        }

        const mappedFact: FactSchema = {
          key: input.fact.key,
          name: input.fact.name,
          factType: input.fact.factType,
          defaultValue: input.fact.defaultValue,
          description: extractText(input.fact.description),
          guidance: input.fact.guidance,
          validation: input.fact.validation,
        };

        const nextFacts: readonly FactSchema[] = [...currentFacts, mappedFact];

        const result = await runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* MethodologyVersionBoundaryService;
            return yield* svc.replaceWorkUnitFacts(
              {
                versionId: input.versionId,
                workUnitTypeKey: input.workUnitTypeKey,
                facts: nextFacts,
              },
              actorId,
            );
          }),
        );

        return {
          version: serializeVersion(result.version),
          diagnostics: result.diagnostics,
        };
      }),

    updateWorkUnitFact: protectedProcedure
      .input(updateWorkUnitFactInput)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;

        const snapshot = await runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* MethodologyVersionBoundaryService;
            return yield* svc.getAuthoringSnapshot(input.versionId);
          }),
        );

        const workUnit = snapshot.workUnitTypes.find(
          (entry) => entry.key === input.workUnitTypeKey,
        );
        if (!workUnit) {
          throw new ORPCError("NOT_FOUND", {
            message: `Work unit type '${input.workUnitTypeKey}' not found in draft '${input.versionId}'`,
          });
        }

        const currentFacts = workUnit.factSchemas;
        const found = currentFacts.some((fact) => fact.key === input.factKey);
        if (!found) {
          throw new ORPCError("NOT_FOUND", {
            message: `Fact '${input.factKey}' not found for work unit '${input.workUnitTypeKey}'`,
          });
        }

        const mappedFact: FactSchema = {
          key: input.fact.key,
          name: input.fact.name,
          factType: input.fact.factType,
          defaultValue: input.fact.defaultValue,
          description: extractText(input.fact.description),
          guidance: input.fact.guidance,
          validation: input.fact.validation,
        };

        const nextFacts: readonly FactSchema[] = currentFacts.map((fact) =>
          fact.key === input.factKey ? mappedFact : fact,
        );

        const result = await runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* MethodologyVersionBoundaryService;
            return yield* svc.replaceWorkUnitFacts(
              {
                versionId: input.versionId,
                workUnitTypeKey: input.workUnitTypeKey,
                facts: nextFacts,
              },
              actorId,
            );
          }),
        );

        return {
          version: serializeVersion(result.version),
          diagnostics: result.diagnostics,
        };
      }),

    deleteWorkUnitFact: protectedProcedure
      .input(deleteWorkUnitFactInput)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;

        const snapshot = await runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* MethodologyVersionBoundaryService;
            return yield* svc.getAuthoringSnapshot(input.versionId);
          }),
        );

        const workUnit = snapshot.workUnitTypes.find(
          (entry) => entry.key === input.workUnitTypeKey,
        );
        if (!workUnit) {
          throw new ORPCError("NOT_FOUND", {
            message: `Work unit type '${input.workUnitTypeKey}' not found in draft '${input.versionId}'`,
          });
        }

        const currentFacts = workUnit.factSchemas;
        const nextFacts: readonly FactSchema[] = currentFacts.filter(
          (fact) => fact.key !== input.factKey,
        );

        const result = await runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* MethodologyVersionBoundaryService;
            return yield* svc.replaceWorkUnitFacts(
              {
                versionId: input.versionId,
                workUnitTypeKey: input.workUnitTypeKey,
                facts: nextFacts,
              },
              actorId,
            );
          }),
        );

        return {
          version: serializeVersion(result.version),
          diagnostics: result.diagnostics,
        };
      }),

    createAgent: protectedProcedure.input(createAgentInput).handler(async ({ input, context }) => {
      const actorId = context.session.user.id;
      const persona = input.agent.promptTemplate?.markdown ?? input.agent.persona ?? "";
      const agentPayload: CreateMethodologyAgentInput = {
        versionId: input.versionId,
        agent: {
          key: input.agent.key,
          displayName: input.agent.displayName,
          description: input.agent.description,
          persona,
          promptTemplate: input.agent.promptTemplate,
          defaultModel: input.agent.defaultModel,
          mcpServers: input.agent.mcpServers,
          capabilities: input.agent.capabilities,
        },
      };

      const result = await runEffect(
        serviceLayer,
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionBoundaryService;
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
            const svc = yield* MethodologyVersionBoundaryService;
            return yield* svc.createWorkUnitMetadata(workUnitPayload, actorId);
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
            const svc = yield* MethodologyVersionBoundaryService;
            return yield* svc.updateWorkUnitMetadata(workUnitPayload, actorId);
          }),
        );

        return {
          version: serializeVersion(result.version),
          diagnostics: result.validation,
        };
      }),

    deleteWorkUnit: protectedProcedure
      .input(deleteWorkUnitInput)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;
        const result = await runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* MethodologyVersionBoundaryService;
            return yield* svc.deleteWorkUnit(
              {
                versionId: input.versionId,
                workUnitTypeKey: input.workUnitTypeKey,
              },
              actorId,
            );
          }),
        );

        return {
          version: serializeVersion(result.version),
          diagnostics: result.diagnostics,
        };
      }),

    upsertWorkUnitLifecycleState: protectedProcedure
      .input(upsertWorkUnitLifecycleStateInput)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;
        const result = await runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* MethodologyVersionBoundaryService;
            return yield* svc.upsertWorkUnitLifecycleState(
              {
                versionId: input.versionId,
                workUnitTypeKey: input.workUnitTypeKey,
                state: input.state,
              },
              actorId,
            );
          }),
        );

        return {
          version: serializeVersion(result.version),
          diagnostics: result.diagnostics,
        };
      }),

    deleteWorkUnitLifecycleState: protectedProcedure
      .input(deleteWorkUnitLifecycleStateInput)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;
        const result = await runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* MethodologyVersionBoundaryService;
            return yield* svc.deleteWorkUnitLifecycleState(
              {
                versionId: input.versionId,
                workUnitTypeKey: input.workUnitTypeKey,
                stateKey: input.stateKey,
                ...(input.strategy ? { strategy: input.strategy } : {}),
              },
              actorId,
            );
          }),
        );

        return {
          version: serializeVersion(result.version),
          diagnostics: result.diagnostics,
        };
      }),

    upsertWorkUnitLifecycleTransition: protectedProcedure
      .input(upsertWorkUnitLifecycleTransitionInput)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;
        const result = await runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* MethodologyVersionBoundaryService;
            return yield* svc.upsertWorkUnitLifecycleTransition(
              {
                versionId: input.versionId,
                workUnitTypeKey: input.workUnitTypeKey,
                transition: input.transition,
              },
              actorId,
            );
          }),
        );

        return {
          version: serializeVersion(result.version),
          diagnostics: result.diagnostics,
        };
      }),

    saveWorkUnitLifecycleTransitionDialog: protectedProcedure
      .input(saveWorkUnitLifecycleTransitionDialogInput)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;
        const result = await runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* MethodologyVersionBoundaryService;
            return yield* svc.saveWorkUnitLifecycleTransitionDialog(
              {
                versionId: input.versionId,
                workUnitTypeKey: input.workUnitTypeKey,
                transition: input.transition,
                conditionSets: input.conditionSets.map((conditionSet) => ({
                  ...conditionSet,
                  groups: conditionSet.groups.map((group) => ({
                    ...group,
                    conditions: group.conditions.map((condition) => ({
                      ...condition,
                      required: condition.required ?? true,
                    })),
                  })),
                })),
                workflowKeys: input.workflowKeys,
              },
              actorId,
            );
          }),
        );

        return {
          version: serializeVersion(result.version),
          diagnostics: result.diagnostics,
        };
      }),

    deleteWorkUnitLifecycleTransition: protectedProcedure
      .input(deleteWorkUnitLifecycleTransitionInput)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;
        const result = await runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* MethodologyVersionBoundaryService;
            return yield* svc.deleteWorkUnitLifecycleTransition(
              {
                versionId: input.versionId,
                workUnitTypeKey: input.workUnitTypeKey,
                transitionKey: input.transitionKey,
              },
              actorId,
            );
          }),
        );

        return {
          version: serializeVersion(result.version),
          diagnostics: result.diagnostics,
        };
      }),

    replaceWorkUnitTransitionConditionSets: protectedProcedure
      .input(replaceWorkUnitTransitionConditionSetsInput)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;
        const result = await runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* MethodologyVersionBoundaryService;
            return yield* svc.replaceWorkUnitTransitionConditionSets(
              {
                versionId: input.versionId,
                workUnitTypeKey: input.workUnitTypeKey,
                transitionKey: input.transitionKey,
                conditionSets: input.conditionSets.map((conditionSet) => ({
                  ...conditionSet,
                  groups: conditionSet.groups.map((group) => ({
                    ...group,
                    conditions: group.conditions.map((condition) => ({
                      ...condition,
                      required: condition.required ?? true,
                    })),
                  })),
                })),
              },
              actorId,
            );
          }),
        );

        return {
          version: serializeVersion(result.version),
          diagnostics: result.diagnostics,
        };
      }),

    listWorkUnitLifecycleStates: publicProcedure
      .input(listWorkUnitStateMachineInput)
      .handler(async ({ input }) => {
        return runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* MethodologyVersionBoundaryService;
            const snapshot = yield* svc.getAuthoringSnapshot(input.versionId);
            const workUnitTypes = Array.isArray(snapshot.workUnitTypes)
              ? snapshot.workUnitTypes.filter(
                  (entry): entry is Record<string, unknown> => !!entry && typeof entry === "object",
                )
              : [];
            const workUnit = workUnitTypes.find((entry) => entry.key === input.workUnitTypeKey);
            const lifecycleStates = Array.isArray(workUnit?.lifecycleStates)
              ? workUnit.lifecycleStates.filter(
                  (state): state is Record<string, unknown> => !!state && typeof state === "object",
                )
              : [];

            return lifecycleStates
              .filter((state) => typeof state.key === "string")
              .map((state) => ({
                key: state.key as string,
                ...(typeof state.displayName === "string"
                  ? { displayName: state.displayName }
                  : {}),
                ...(typeof state.description === "string"
                  ? { description: state.description }
                  : {}),
              }));
          }),
        );
      }),

    listWorkUnitLifecycleTransitions: publicProcedure
      .input(listWorkUnitStateMachineInput)
      .handler(async ({ input }) => {
        return runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* MethodologyVersionBoundaryService;
            const snapshot = yield* svc.getAuthoringSnapshot(input.versionId);
            const workUnitTypes = Array.isArray(snapshot.workUnitTypes)
              ? snapshot.workUnitTypes.filter(
                  (entry): entry is Record<string, unknown> => !!entry && typeof entry === "object",
                )
              : [];
            const workUnit = workUnitTypes.find((entry) => entry.key === input.workUnitTypeKey);
            const lifecycleTransitions = Array.isArray(workUnit?.lifecycleTransitions)
              ? workUnit.lifecycleTransitions.filter(
                  (transition): transition is Record<string, unknown> =>
                    !!transition && typeof transition === "object",
                )
              : [];

            return lifecycleTransitions
              .filter(
                (transition) =>
                  typeof transition.transitionKey === "string" &&
                  typeof transition.toState === "string",
              )
              .map((transition) => ({
                transitionKey: transition.transitionKey as string,
                ...(typeof transition.fromState === "string"
                  ? { fromState: transition.fromState }
                  : {}),
                toState: transition.toState as string,
                conditionSets: Array.isArray(transition.conditionSets)
                  ? transition.conditionSets
                  : [],
              }));
          }),
        );
      }),

    listWorkUnitTransitionConditionSets: publicProcedure
      .input(listWorkUnitTransitionConditionSetsInput)
      .handler(async ({ input }) => {
        return runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* MethodologyVersionBoundaryService;
            const snapshot = yield* svc.getAuthoringSnapshot(input.versionId);
            const workUnitTypes = Array.isArray(snapshot.workUnitTypes)
              ? snapshot.workUnitTypes.filter(
                  (entry): entry is Record<string, unknown> => !!entry && typeof entry === "object",
                )
              : [];
            const workUnit = workUnitTypes.find((entry) => entry.key === input.workUnitTypeKey);
            const transitions = Array.isArray(workUnit?.lifecycleTransitions)
              ? workUnit.lifecycleTransitions.filter(
                  (transition): transition is Record<string, unknown> =>
                    !!transition && typeof transition === "object",
                )
              : [];

            const matched = transitions.find(
              (transition) => transition.transitionKey === input.transitionKey,
            );
            return Array.isArray(matched?.conditionSets)
              ? matched.conditionSets.filter(
                  (conditionSet): conditionSet is Record<string, unknown> =>
                    !!conditionSet && typeof conditionSet === "object",
                )
              : [];
          }),
        );
      }),

    listWorkUnitTransitionBindings: publicProcedure
      .input(listWorkUnitTransitionBindingsInput)
      .handler(async ({ input }) => {
        return runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const versionService = yield* MethodologyVersionBoundaryService;
            const snapshot = yield* versionService.getAuthoringSnapshot(input.versionId);

            const workflowKeys = snapshot.transitionWorkflowBindings?.[input.transitionKey];
            return Array.isArray(workflowKeys)
              ? workflowKeys.filter(
                  (workflowKey): workflowKey is string => typeof workflowKey === "string",
                )
              : [];
          }),
        );
      }),

    createTransitionBinding: protectedProcedure
      .input(createTransitionBindingInput)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;

        const currentKeys = await runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* MethodologyVersionBoundaryService;
            const snapshot = yield* svc.getAuthoringSnapshot(input.versionId);
            const existing = snapshot.transitionWorkflowBindings[input.transitionKey];
            return Array.isArray(existing)
              ? existing.filter(
                  (workflowKey): workflowKey is string => typeof workflowKey === "string",
                )
              : [];
          }),
        );

        const nextWorkflowKeys = Array.from(new Set([...currentKeys, input.workflowKey]));

        const result = await runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* MethodologyVersionBoundaryService;
            return yield* svc.replaceTransitionBindings(
              {
                versionId: input.versionId,
                workUnitTypeKey: input.workUnitTypeKey,
                transitionKey: input.transitionKey,
                workflowKeys: nextWorkflowKeys,
              },
              actorId,
            );
          }),
        );

        return {
          version: serializeVersion(result.version),
          diagnostics: result.diagnostics,
        };
      }),

    deleteTransitionBinding: protectedProcedure
      .input(deleteTransitionBindingInput)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;

        const currentKeys = await runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* MethodologyVersionBoundaryService;
            const snapshot = yield* svc.getAuthoringSnapshot(input.versionId);
            const existing = snapshot.transitionWorkflowBindings[input.transitionKey];
            return Array.isArray(existing)
              ? existing.filter(
                  (workflowKey): workflowKey is string => typeof workflowKey === "string",
                )
              : [];
          }),
        );

        const nextWorkflowKeys = currentKeys.filter(
          (workflowKey) => workflowKey !== input.workflowKey,
        );

        const result = await runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* MethodologyVersionBoundaryService;
            return yield* svc.replaceTransitionBindings(
              {
                versionId: input.versionId,
                workUnitTypeKey: input.workUnitTypeKey,
                transitionKey: input.transitionKey,
                workflowKeys: nextWorkflowKeys,
              },
              actorId,
            );
          }),
        );

        return {
          version: serializeVersion(result.version),
          diagnostics: result.diagnostics,
        };
      }),

    getWorkUnitArtifactSlots: publicProcedure
      .input(getWorkUnitArtifactSlotsInput)
      .handler(async ({ input }) => {
        const payload: GetWorkUnitArtifactSlotsInput = {
          versionId: input.versionId,
          workUnitTypeKey: input.workUnitTypeKey,
        };

        return runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* MethodologyVersionBoundaryService;
            return yield* svc.getWorkUnitArtifactSlots(payload);
          }),
        );
      }),

    createWorkUnitArtifactSlot: protectedProcedure
      .input(createWorkUnitArtifactSlotInput)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;
        const payload: CreateWorkUnitArtifactSlotInput = {
          versionId: input.versionId,
          workUnitTypeKey: input.workUnitTypeKey,
          slot: input.slot,
        };

        const result = await runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* MethodologyVersionBoundaryService;
            return yield* svc.createWorkUnitArtifactSlot(payload, actorId);
          }),
        );

        return {
          version: serializeVersion(result.version),
          diagnostics: result.diagnostics,
        };
      }),

    updateWorkUnitArtifactSlot: protectedProcedure
      .input(updateWorkUnitArtifactSlotInput)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;
        const payload: UpdateWorkUnitArtifactSlotInput = {
          versionId: input.versionId,
          workUnitTypeKey: input.workUnitTypeKey,
          slotId: input.slotId,
          slot: input.slot,
          templateOps: input.templateOps,
        };

        const result = await runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* MethodologyVersionBoundaryService;
            return yield* svc.updateWorkUnitArtifactSlot(payload, actorId);
          }),
        );

        return {
          version: serializeVersion(result.version),
          diagnostics: result.diagnostics,
        };
      }),

    deleteWorkUnitArtifactSlot: protectedProcedure
      .input(deleteWorkUnitArtifactSlotInput)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;
        const payload: DeleteWorkUnitArtifactSlotInput = {
          versionId: input.versionId,
          workUnitTypeKey: input.workUnitTypeKey,
          slotId: input.slotId,
        };

        const result = await runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* MethodologyVersionBoundaryService;
            return yield* svc.deleteWorkUnitArtifactSlot(payload, actorId);
          }),
        );

        return {
          version: serializeVersion(result.version),
          diagnostics: result.diagnostics,
        };
      }),

    updateAgent: protectedProcedure.input(updateAgentInput).handler(async ({ input, context }) => {
      const actorId = context.session.user.id;
      const persona = input.agent.promptTemplate?.markdown ?? input.agent.persona ?? "";
      const agentPayload: UpdateMethodologyAgentInput = {
        versionId: input.versionId,
        agentKey: input.agentKey,
        agent: {
          key: input.agent.key,
          displayName: input.agent.displayName,
          description: input.agent.description,
          persona,
          promptTemplate: input.agent.promptTemplate,
          defaultModel: input.agent.defaultModel,
          mcpServers: input.agent.mcpServers,
          capabilities: input.agent.capabilities,
        },
      };

      const result = await runEffect(
        serviceLayer,
        Effect.gen(function* () {
          const svc = yield* MethodologyVersionBoundaryService;
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
          const svc = yield* MethodologyVersionBoundaryService;
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
            const svc = yield* MethodologyVersionBoundaryService;
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
            const svc = yield* MethodologyVersionBoundaryService;
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
            const svc = yield* MethodologyVersionBoundaryService;
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
      updateMeta: router.updateVersionMetadata,
      archive: router.archiveVersion,
      validate: router.validateDraftVersion,
      workspace: {
        get: router.getDraftProjection,
        stats: router.getVersionWorkspaceStats,
      },
      fact: {
        list: router.listFactDefinitions,
        create: router.createFact,
        update: router.updateFact,
        delete: router.deleteFact,
      },
      agent: {
        list: router.listAgentDefinitions,
        create: router.createAgent,
        update: router.updateAgent,
        delete: router.deleteAgent,
      },
      dependencyDefinition: {
        list: router.listDependencyDefinitions,
        create: router.createDependencyDefinition,
        update: router.updateDependencyDefinition,
        delete: router.deleteDependencyDefinition,
      },
      workUnit: {
        list: router.listWorkUnitDefinitions,
        create: router.createWorkUnit,
        get: router.getWorkUnitDefinitions,
        updateMeta: router.updateWorkUnit,
        delete: router.deleteWorkUnit,
        fact: {
          list: router.listWorkUnitFacts,
          create: router.createWorkUnitFact,
          update: router.updateWorkUnitFact,
          delete: router.deleteWorkUnitFact,
        },
        workflow: {
          list: router.listWorkUnitWorkflows,
          create: router.createWorkUnitWorkflow,
          update: router.updateWorkUnitWorkflow,
          delete: router.deleteWorkUnitWorkflow,
        },
        stateMachine: {
          state: {
            list: router.listWorkUnitLifecycleStates,
            upsert: router.upsertWorkUnitLifecycleState,
            delete: router.deleteWorkUnitLifecycleState,
          },
          transition: {
            list: router.listWorkUnitLifecycleTransitions,
            save: router.saveWorkUnitLifecycleTransitionDialog,
            upsert: router.upsertWorkUnitLifecycleTransition,
            delete: router.deleteWorkUnitLifecycleTransition,
            conditionSet: {
              list: router.listWorkUnitTransitionConditionSets,
              update: router.replaceWorkUnitTransitionConditionSets,
            },
            binding: {
              list: router.listWorkUnitTransitionBindings,
              create: router.createTransitionBinding,
              update: router.replaceTransitionBindings,
              delete: router.deleteTransitionBinding,
            },
          },
          conditionSet: {
            list: router.listWorkUnitTransitionConditionSets,
            update: router.replaceWorkUnitTransitionConditionSets,
          },
          binding: {
            list: router.listWorkUnitTransitionBindings,
            update: router.replaceTransitionBindings,
            create: router.createTransitionBinding,
            delete: router.deleteTransitionBinding,
          },
        },
        artifactSlot: {
          list: router.getWorkUnitArtifactSlots,
          create: router.createWorkUnitArtifactSlot,
          update: router.updateWorkUnitArtifactSlot,
          delete: router.deleteWorkUnitArtifactSlot,
          template: {
            list: router.getWorkUnitArtifactSlots,
            update: router.updateWorkUnitArtifactSlot,
          },
        },
      },
      getLineage: router.getDraftLineage,
      publish: router.publishDraftVersion,
      getPublicationEvidence: router.getPublicationEvidence,
    },
  };
}
