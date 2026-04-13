import { ORPCError } from "@orpc/server";
import {
  MethodologyRepository,
  MethodologyVersionBoundaryService,
  WorkflowService,
  WorkflowEditorDefinitionService,
  WorkflowTopologyMutationService,
  FormStepDefinitionService,
  InvokeStepDefinitionService,
  BranchStepDefinitionService,
  WorkflowContextFactDefinitionService,
  type MethodologyVersionRow,
  type MethodologyVersionEventRow,
  type MethodologyError,
  RepositoryError,
  ValidationDecodeError,
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
  BranchStepPayload as BranchStepPayloadContract,
  DeleteWorkUnitWorkflowInput,
  FormStepPayload as FormStepPayloadContract,
  InvokeStepPayload as InvokeStepPayloadContract,
  WorkflowContextFactDto as WorkflowContextFactDtoContract,
  WorkflowEditorRouteIdentity as WorkflowEditorRouteIdentityContract,
  WorkflowMetadataDialogInput as WorkflowMetadataDialogInputContract,
  UpdateWorkUnitWorkflowInput,
} from "@chiron/contracts/methodology/workflow";
import type { UpdateDraftWorkflowsInputDto } from "@chiron/contracts/methodology/dto";
import { Effect, Layer } from "effect";
import { z } from "zod";
import {
  AgentStepDefinitionService,
  AgentStepDefinitionServiceLive,
} from "../../../methodology-engine/src/services/agent-step-definition-service";
import {
  AgentStepEditorDefinitionService,
  AgentStepEditorDefinitionServiceLive,
} from "../../../methodology-engine/src/services/agent-step-editor-definition-service";
import { BranchStepDefinitionServiceLive } from "../../../methodology-engine/src/services/branch-step-definition-service";
import { InvokeStepDefinitionServiceLive } from "../../../methodology-engine/src/services/invoke-step-definition-service";
import { HarnessService } from "../../../agent-runtime/src/index";
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
    workflowDefinitionId: z.string().min(1).optional(),
    key: z.string().min(1),
    displayName: z.string().optional(),
    descriptionJson: z.object({ markdown: z.string() }).optional(),
    entryStepId: z.string().min(1).nullable().optional(),
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

const workflowEditorRouteIdentitySchema = z.object({
  methodologyId: z.string().min(1),
  versionId: z.string().min(1),
  workUnitTypeKey: z.string().min(1),
  workflowDefinitionId: z.string().min(1),
});

const workflowContextFactSchema: z.ZodType<WorkflowContextFactDtoContract> = z.discriminatedUnion(
  "kind",
  [
    z.object({
      kind: z.literal("plain_value_fact"),
      contextFactDefinitionId: z.string().min(1).optional(),
      key: z.string().min(1),
      label: z.string().optional(),
      descriptionJson: z.object({ markdown: z.string() }).optional(),
      guidance: workflowMetadataSchema.shape.guidance,
      validationJson: z.unknown().optional(),
      cardinality: z.enum(["one", "many"]),
      valueType: z.enum(["string", "number", "boolean", "json"]),
    }),
    z.object({
      kind: z.literal("definition_backed_external_fact"),
      contextFactDefinitionId: z.string().min(1).optional(),
      key: z.string().min(1),
      label: z.string().optional(),
      descriptionJson: z.object({ markdown: z.string() }).optional(),
      guidance: workflowMetadataSchema.shape.guidance,
      validationJson: z.unknown().optional(),
      cardinality: z.enum(["one", "many"]),
      externalFactDefinitionId: z.string().min(1),
      valueType: z.enum(["string", "number", "boolean", "json"]).optional(),
    }),
    z.object({
      kind: z.literal("bound_external_fact"),
      contextFactDefinitionId: z.string().min(1).optional(),
      key: z.string().min(1),
      label: z.string().optional(),
      descriptionJson: z.object({ markdown: z.string() }).optional(),
      guidance: workflowMetadataSchema.shape.guidance,
      validationJson: z.unknown().optional(),
      cardinality: z.enum(["one", "many"]),
      externalFactDefinitionId: z.string().min(1),
      valueType: z.enum(["string", "number", "boolean", "json"]).optional(),
    }),
    z.object({
      kind: z.literal("workflow_reference_fact"),
      contextFactDefinitionId: z.string().min(1).optional(),
      key: z.string().min(1),
      label: z.string().optional(),
      descriptionJson: z.object({ markdown: z.string() }).optional(),
      guidance: workflowMetadataSchema.shape.guidance,
      validationJson: z.unknown().optional(),
      cardinality: z.enum(["one", "many"]),
      allowedWorkflowDefinitionIds: z.array(z.string().min(1)),
    }),
    z.object({
      kind: z.literal("artifact_reference_fact"),
      contextFactDefinitionId: z.string().min(1).optional(),
      key: z.string().min(1),
      label: z.string().optional(),
      descriptionJson: z.object({ markdown: z.string() }).optional(),
      guidance: workflowMetadataSchema.shape.guidance,
      validationJson: z.unknown().optional(),
      cardinality: z.enum(["one", "many"]),
      artifactSlotDefinitionId: z.string().min(1),
    }),
    z.object({
      kind: z.literal("work_unit_draft_spec_fact"),
      contextFactDefinitionId: z.string().min(1).optional(),
      key: z.string().min(1),
      label: z.string().optional(),
      descriptionJson: z.object({ markdown: z.string() }).optional(),
      guidance: workflowMetadataSchema.shape.guidance,
      validationJson: z.unknown().optional(),
      cardinality: z.enum(["one", "many"]),
      workUnitDefinitionId: z.string().min(1),
      selectedWorkUnitFactDefinitionIds: z.array(z.string().min(1)),
      selectedArtifactSlotDefinitionIds: z.array(z.string().min(1)),
    }),
  ],
);

const workflowContextFactKindValueSchema = z.enum([
  "plain_value_fact",
  "definition_backed_external_fact",
  "bound_external_fact",
  "workflow_reference_fact",
  "artifact_reference_fact",
  "work_unit_draft_spec_fact",
]);

const formStepPayloadSchema: z.ZodType<FormStepPayloadContract> = z.object({
  key: z.string().min(1),
  label: z.string().optional(),
  descriptionJson: z.object({ markdown: z.string() }).optional(),
  guidance: workflowMetadataSchema.shape.guidance,
  fields: z.array(
    z
      .object({
        contextFactDefinitionId: z.string().min(1),
        fieldLabel: z.string().min(1),
        fieldKey: z.string().min(1),
        helpText: z.string().nullable().default(null),
        required: z.boolean().default(false),
        uiMultiplicityMode: z.enum(["one", "many"]).optional(),
      })
      .strict(),
  ),
});

const invokeBindingSchema = z
  .object({
    destination: z.discriminatedUnion("kind", [
      z
        .object({
          kind: z.literal("work_unit_fact"),
          workUnitFactDefinitionId: z.string().min(1),
        })
        .strict(),
      z
        .object({
          kind: z.literal("artifact_slot"),
          artifactSlotDefinitionId: z.string().min(1),
        })
        .strict(),
    ]),
    source: z.discriminatedUnion("kind", [
      z
        .object({
          kind: z.literal("context_fact"),
          contextFactDefinitionId: z.string().min(1),
        })
        .strict(),
      z
        .object({
          kind: z.literal("literal"),
          value: z.union([z.string(), z.number(), z.boolean()]),
        })
        .strict(),
      z.object({ kind: z.literal("runtime") }).strict(),
    ]),
  })
  .strict();

const invokeActivationTransitionSchema = z
  .object({
    transitionId: z.string().min(1),
    workflowDefinitionIds: z.array(z.string().min(1)),
  })
  .strict();

const invokePayloadMetadataSchema = z.object({
  key: z.string().min(1),
  label: z.string().optional(),
  descriptionJson: z.object({ markdown: z.string() }).optional(),
  guidance: workflowMetadataSchema.shape.guidance,
});

const invokeStepPayloadSchema: z.ZodType<InvokeStepPayloadContract> = z.union([
  invokePayloadMetadataSchema
    .extend({
      targetKind: z.literal("workflow"),
      sourceMode: z.literal("fixed_set"),
      workflowDefinitionIds: z.array(z.string().min(1)),
    })
    .strict(),
  invokePayloadMetadataSchema
    .extend({
      targetKind: z.literal("workflow"),
      sourceMode: z.literal("context_fact_backed"),
      contextFactDefinitionId: z.string().min(1),
    })
    .strict(),
  invokePayloadMetadataSchema
    .extend({
      targetKind: z.literal("work_unit"),
      sourceMode: z.literal("fixed_set"),
      workUnitDefinitionId: z.string().min(1),
      bindings: z.array(invokeBindingSchema),
      activationTransitions: z.array(invokeActivationTransitionSchema),
    })
    .strict(),
  invokePayloadMetadataSchema
    .extend({
      targetKind: z.literal("work_unit"),
      sourceMode: z.literal("context_fact_backed"),
      contextFactDefinitionId: z.string().min(1),
      bindings: z.array(invokeBindingSchema),
      activationTransitions: z.array(invokeActivationTransitionSchema),
    })
    .strict(),
]);

const branchRouteConditionSchema = z
  .object({
    conditionId: z.string().min(1),
    contextFactDefinitionId: z.string().min(1),
    subFieldKey: z.string().min(1).nullable().optional().default(null),
    operator: z.string().min(1),
    isNegated: z.boolean().optional().default(false),
    comparisonJson: z.unknown(),
  })
  .strict();

const branchRouteGroupSchema = z
  .object({
    groupId: z.string().min(1),
    mode: z.enum(["all", "any"]),
    conditions: z.array(branchRouteConditionSchema),
  })
  .strict();

const branchRouteSchema = z
  .object({
    routeId: z.string().min(1),
    targetStepId: z.string().min(1),
    conditionMode: z.enum(["all", "any"]),
    groups: z.array(branchRouteGroupSchema),
  })
  .strict();

const branchStepPayloadSchema: z.ZodType<BranchStepPayloadContract> = invokePayloadMetadataSchema
  .extend({
    defaultTargetStepId: z.string().min(1).nullable().optional().default(null),
    routes: z.array(branchRouteSchema),
  })
  .strict();

const agentStepModelReferenceSchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
});

const agentStepRuntimePolicySchema = z.object({
  sessionStart: z.literal("explicit").default("explicit"),
  continuationMode: z.literal("bootstrap_only").default("bootstrap_only"),
  liveStreamCount: z.literal(1).default(1),
  nativeMessageLog: z.literal(false).default(false),
  persistedWritePolicy: z.literal("applied_only").default("applied_only"),
});

const agentStepPayloadSchema = z.object({
  key: z.string().min(1),
  label: z.string().optional(),
  descriptionJson: z.object({ markdown: z.string() }).optional(),
  objective: z.string().min(1),
  instructionsMarkdown: z.string().min(1),
  harnessSelection: z
    .object({
      harness: z.literal("opencode").default("opencode"),
      agent: z.string().min(1).optional(),
      model: agentStepModelReferenceSchema.optional(),
    })
    .default({ harness: "opencode" }),
  explicitReadGrants: z.array(
    z.object({
      contextFactDefinitionId: z.string().min(1),
    }),
  ),
  writeItems: z.array(
    z.object({
      writeItemId: z.string().min(1),
      contextFactDefinitionId: z.string().min(1),
      contextFactKind: workflowContextFactKindValueSchema,
      label: z.string().optional(),
      order: z.number(),
      requirementContextFactDefinitionIds: z.array(z.string().min(1)),
    }),
  ),
  completionRequirements: z.array(
    z.object({
      contextFactDefinitionId: z.string().min(1),
    }),
  ),
  runtimePolicy: agentStepRuntimePolicySchema.default({
    sessionStart: "explicit",
    continuationMode: "bootstrap_only",
    liveStreamCount: 1,
    nativeMessageLog: false,
    persistedWritePolicy: "applied_only",
  }),
  guidance: workflowMetadataSchema.shape.guidance,
});

const createAgentStepSchema = z.object({
  versionId: z.string().min(1),
  workUnitTypeKey: z.string().min(1),
  workflowDefinitionId: z.string().min(1),
  afterStepKey: z.string().min(1).nullable().optional().default(null),
  payload: agentStepPayloadSchema,
});

const updateAgentStepSchema = z.object({
  versionId: z.string().min(1),
  workUnitTypeKey: z.string().min(1),
  workflowDefinitionId: z.string().min(1),
  stepId: z.string().min(1),
  payload: agentStepPayloadSchema,
});

const deleteAgentStepSchema = z.object({
  versionId: z.string().min(1),
  workUnitTypeKey: z.string().min(1),
  workflowDefinitionId: z.string().min(1),
  stepId: z.string().min(1),
});

const getAgentStepDefinitionSchema = workflowEditorRouteIdentitySchema.extend({
  stepId: z.string().min(1),
});

const harnessDiscoveredModelSchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  label: z.string().min(1),
  isDefault: z.boolean(),
  supportsReasoning: z.boolean(),
  supportsTools: z.boolean(),
  supportsAttachments: z.boolean(),
});

const harnessDiscoveredProviderSchema = z.object({
  provider: z.string().min(1),
  label: z.string().min(1),
  defaultModel: z.string().min(1).optional(),
  models: z.array(harnessDiscoveredModelSchema),
});

const harnessDiscoveredAgentSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
  mode: z.enum(["subagent", "primary", "all"]),
  defaultModel: agentStepModelReferenceSchema.optional(),
});

const harnessDiscoveryMetadataSchema = z.object({
  harness: z.literal("opencode"),
  discoveredAt: z.string().min(1),
  agents: z.array(harnessDiscoveredAgentSchema),
  providers: z.array(harnessDiscoveredProviderSchema),
  models: z.array(harnessDiscoveredModelSchema),
});

const createFormStepSchema = z.object({
  versionId: z.string().min(1),
  workUnitTypeKey: z.string().min(1),
  workflowDefinitionId: z.string().min(1),
  afterStepKey: z.string().min(1).nullable().optional().default(null),
  payload: formStepPayloadSchema,
});

const updateFormStepSchema = z.object({
  versionId: z.string().min(1),
  workUnitTypeKey: z.string().min(1),
  workflowDefinitionId: z.string().min(1),
  stepId: z.string().min(1),
  payload: formStepPayloadSchema,
});

const deleteFormStepSchema = z.object({
  versionId: z.string().min(1),
  workUnitTypeKey: z.string().min(1),
  workflowDefinitionId: z.string().min(1),
  stepId: z.string().min(1),
});

const createInvokeStepSchema = z.object({
  versionId: z.string().min(1),
  workUnitTypeKey: z.string().min(1),
  workflowDefinitionId: z.string().min(1),
  payload: invokeStepPayloadSchema,
});

const updateInvokeStepSchema = z.object({
  versionId: z.string().min(1),
  workUnitTypeKey: z.string().min(1),
  workflowDefinitionId: z.string().min(1),
  stepId: z.string().min(1),
  payload: invokeStepPayloadSchema,
});

const deleteInvokeStepSchema = z.object({
  versionId: z.string().min(1),
  workUnitTypeKey: z.string().min(1),
  workflowDefinitionId: z.string().min(1),
  stepId: z.string().min(1),
});

const createBranchStepSchema = z.object({
  versionId: z.string().min(1),
  workUnitTypeKey: z.string().min(1),
  workflowDefinitionId: z.string().min(1),
  payload: branchStepPayloadSchema,
});

const updateBranchStepSchema = z.object({
  versionId: z.string().min(1),
  workUnitTypeKey: z.string().min(1),
  workflowDefinitionId: z.string().min(1),
  stepId: z.string().min(1),
  payload: branchStepPayloadSchema,
});

const deleteBranchStepSchema = z.object({
  versionId: z.string().min(1),
  workUnitTypeKey: z.string().min(1),
  workflowDefinitionId: z.string().min(1),
  stepId: z.string().min(1),
});

const createEdgeSchema = z.object({
  versionId: z.string().min(1),
  workUnitTypeKey: z.string().min(1),
  workflowDefinitionId: z.string().min(1),
  fromStepKey: z.string().min(1).nullable().optional().default(null),
  toStepKey: z.string().min(1).nullable().optional().default(null),
  descriptionJson: z.object({ markdown: z.string() }).optional(),
});

const updateEdgeSchema = z.object({
  versionId: z.string().min(1),
  workUnitTypeKey: z.string().min(1),
  workflowDefinitionId: z.string().min(1),
  edgeId: z.string().min(1),
  fromStepKey: z.string().min(1).nullable().optional().default(null),
  toStepKey: z.string().min(1).nullable().optional().default(null),
  descriptionJson: z.object({ markdown: z.string() }).optional(),
});

const deleteEdgeSchema = z.object({
  versionId: z.string().min(1),
  workUnitTypeKey: z.string().min(1),
  workflowDefinitionId: z.string().min(1),
  edgeId: z.string().min(1),
});

const listWorkflowContextFactSchema = z.object({
  versionId: z.string().min(1),
  workflowDefinitionId: z.string().min(1),
});

const createWorkflowContextFactSchema = z.object({
  versionId: z.string().min(1),
  workUnitTypeKey: z.string().min(1),
  workflowDefinitionId: z.string().min(1),
  fact: workflowContextFactSchema,
});

const updateWorkflowContextFactSchema = z.object({
  versionId: z.string().min(1),
  workUnitTypeKey: z.string().min(1),
  workflowDefinitionId: z.string().min(1),
  contextFactDefinitionId: z.string().min(1),
  fact: workflowContextFactSchema,
});

const deleteWorkflowContextFactSchema = z.object({
  versionId: z.string().min(1),
  workUnitTypeKey: z.string().min(1),
  workflowDefinitionId: z.string().min(1),
  contextFactDefinitionId: z.string().min(1),
});

const toWorkflowDescription = (
  workflow: Pick<WorkflowMetadataDialogInputContract, "descriptionJson">,
) => (workflow.descriptionJson ? { description: workflow.descriptionJson } : {});

const guidanceMarkdownSchema = z.object({ markdown: z.string() });
const workUnitDescriptionSchema = guidanceMarkdownSchema.strict();

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

const markdownContentSchema = z.object({ markdown: z.string() });
const factValueTypeSchema = z.enum(["string", "number", "boolean", "json", "work_unit"]);
const jsonSubSchemaFieldTypeSchema = z.enum(["string", "number", "boolean"]);
const factCardinalitySchema = z.enum(["one", "many"]);
const jsonSubSchemaFieldSchema = z.union([
  z.object({
    key: z.string().min(1),
    type: jsonSubSchemaFieldTypeSchema,
    cardinality: factCardinalitySchema,
    description: markdownContentSchema.optional(),
    guidance: factGuidanceSchema,
    validation: z.unknown().optional(),
  }),
  z.object({
    key: z.string().min(1),
    type: jsonSubSchemaFieldTypeSchema,
    cardinality: z.literal("one"),
    defaultValue: z.unknown().optional(),
    description: markdownContentSchema.optional(),
    guidance: factGuidanceSchema,
    validation: z.unknown().optional(),
  }),
]);
const jsonSubSchemaSchema = z.object({
  type: z.literal("object"),
  fields: z.array(jsonSubSchemaFieldSchema),
});

const factValidationSchema = z
  .union([
    z.object({
      kind: z.literal("none"),
      dependencyType: z.string().optional(),
      workUnitKey: z.string().optional(),
    }),
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
      kind: z.literal("allowed-values"),
      values: z.array(z.unknown()),
    }),
    z.object({
      kind: z.literal("json-schema"),
      schemaDialect: z.string().min(1),
      schema: z.unknown(),
      subSchema: jsonSubSchemaSchema.optional(),
    }),
  ])
  .default({ kind: "none" });

const variableDefinitionSchema = z.object({
  name: z.string().optional(),
  key: z.string().min(1),
  factType: factValueTypeSchema,
  cardinality: factCardinalitySchema.optional(),
  defaultValue: z.unknown().optional(),
  description: markdownContentSchema.optional(),
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
  methodologyId: z.string().min(1),
  versionId: z.string().min(1),
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
  factType: z.enum(["string", "number", "boolean", "json", "work_unit"]),
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
    description: z.unknown().optional(),
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
    description: z.unknown().optional(),
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
    case "RepositoryError": {
      const repositoryErr = err as {
        operation?: unknown;
        cause?: unknown;
      };
      const operation =
        typeof repositoryErr.operation === "string" ? repositoryErr.operation : "unknown";
      const cause = repositoryErr.cause;
      const causeMessage =
        cause instanceof Error
          ? cause.message
          : typeof cause === "string"
            ? cause
            : cause
              ? JSON.stringify(cause)
              : "unknown cause";
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: `Repository operation failed: ${operation} (${causeMessage})`,
      });
    }
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

type BranchProjectedEdgeMetadata = {
  readonly edgeOwner: "branch_default" | "branch_conditional";
  readonly branchStepId: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const parseBranchProjectedEdgeMetadata = (value: unknown): BranchProjectedEdgeMetadata | null => {
  if (!isRecord(value)) {
    return null;
  }

  if (value.edgeOwner !== "branch_default" && value.edgeOwner !== "branch_conditional") {
    return null;
  }

  if (typeof value.branchStepId !== "string" || value.branchStepId.length === 0) {
    return null;
  }

  return {
    edgeOwner: value.edgeOwner,
    branchStepId: value.branchStepId,
  };
};

const readWorkflowStepKey = (step: Record<string, unknown>) => {
  if (
    "payload" in step &&
    typeof step.payload === "object" &&
    step.payload !== null &&
    "key" in step.payload &&
    typeof step.payload.key === "string" &&
    step.payload.key.length > 0
  ) {
    return step.payload.key;
  }

  if (typeof step.stepKey === "string" && step.stepKey.length > 0) {
    return step.stepKey;
  }

  return null;
};

const assertGenericEdgeCreateAllowed = (input: {
  readonly versionId: string;
  readonly workUnitTypeKey: string;
  readonly workflowDefinitionId: string;
  readonly fromStepKey: string | null;
}) =>
  Effect.gen(function* () {
    if (input.fromStepKey === null) {
      return;
    }

    const repo = yield* MethodologyRepository;
    const definition = yield* repo.getWorkflowEditorDefinition({
      versionId: input.versionId,
      workUnitTypeKey: input.workUnitTypeKey,
      workflowDefinitionId: input.workflowDefinitionId,
    });

    const sourceStep = definition.steps.find((step) => {
      if (step.stepType !== "branch") {
        return false;
      }

      return readWorkflowStepKey(step as Record<string, unknown>) === input.fromStepKey;
    });

    if (sourceStep) {
      return yield* new ValidationDecodeError({
        message: "Generic edge mutations cannot author outgoing topology for branch steps",
      });
    }
  });

const assertGenericEdgeMutationAllowed = (input: {
  readonly versionId: string;
  readonly workUnitTypeKey: string;
  readonly workflowDefinitionId: string;
  readonly edgeId: string;
  readonly fromStepKey?: string | null;
}) =>
  Effect.gen(function* () {
    const repo = yield* MethodologyRepository;
    if (!repo.listWorkflowEdgesByDefinitionId) {
      return yield* new RepositoryError({
        operation: "workflowTopology.edgeMutations",
        cause: new Error("Workflow topology repository capability is not configured"),
      });
    }

    const edges = yield* repo.listWorkflowEdgesByDefinitionId({
      versionId: input.versionId,
      workflowDefinitionId: input.workflowDefinitionId,
    });
    const edge = edges.find((candidate) => candidate.edgeId === input.edgeId);

    if (!edge) {
      return;
    }

    if (parseBranchProjectedEdgeMetadata(edge.descriptionJson)) {
      return yield* new ValidationDecodeError({
        message: "Generic edge mutations cannot modify projected branch-owned edges",
      });
    }

    if (input.fromStepKey === null || input.fromStepKey === undefined) {
      return;
    }

    yield* assertGenericEdgeCreateAllowed({
      versionId: input.versionId,
      workUnitTypeKey: input.workUnitTypeKey,
      workflowDefinitionId: input.workflowDefinitionId,
      fromStepKey: input.fromStepKey,
    });
  });

type ValidationEnvelope = {
  valid: boolean;
  diagnostics?: ReadonlyArray<{ code?: unknown }>;
};

type LifecycleValidationDiagnostic = {
  code?: string;
  message?: string;
  scope?: string;
  path?: string;
  severity?: string;
  blocking?: boolean;
  expected?: string;
  received?: string;
};

function parseLifecycleValidationDiagnostics(
  diagnostics: ReadonlyArray<unknown>,
): LifecycleValidationDiagnostic[] {
  return diagnostics
    .filter(
      (diagnostic): diagnostic is Record<string, unknown> =>
        typeof diagnostic === "object" && diagnostic !== null,
    )
    .map((diagnostic) => {
      const code = typeof diagnostic.code === "string" ? diagnostic.code : undefined;
      const scope = typeof diagnostic.scope === "string" ? diagnostic.scope : undefined;
      const blocking = typeof diagnostic.blocking === "boolean" ? diagnostic.blocking : undefined;
      // ValidationDiagnostic uses 'required' and 'observed', not 'expected'/'received'
      const required = typeof diagnostic.required === "string" ? diagnostic.required : undefined;
      const observed = typeof diagnostic.observed === "string" ? diagnostic.observed : undefined;
      const remediation =
        typeof diagnostic.remediation === "string" ? diagnostic.remediation : undefined;

      // Construct a human-readable message from the available fields
      const messageParts: string[] = [];
      if (code) messageParts.push(`[${code}]`);
      if (required && observed) {
        messageParts.push(`Expected: ${required}, but observed: ${observed}`);
      } else if (required) {
        messageParts.push(`Required: ${required}`);
      } else if (observed) {
        messageParts.push(`Observed: ${observed}`);
      }
      if (remediation) messageParts.push(`Remediation: ${remediation}`);
      const message = messageParts.length > 0 ? messageParts.join(" ") : undefined;

      return {
        ...(code ? { code } : {}),
        ...(message ? { message } : {}),
        ...(scope ? { scope } : {}),
        ...(blocking !== undefined ? { blocking } : {}),
        ...(required ? { required } : {}),
        ...(observed ? { observed } : {}),
        ...(remediation ? { remediation } : {}),
      };
    });
}

function zodPathToFieldPath(path: ReadonlyArray<PropertyKey>): string {
  if (path.length === 0) {
    return "markdown";
  }

  return path.reduce<string>((fieldPath, segment) => {
    if (typeof segment === "number") {
      return `${fieldPath}[${segment}]`;
    }

    if (typeof segment === "symbol") {
      return fieldPath;
    }

    return fieldPath.length > 0 ? `${fieldPath}.${segment}` : segment;
  }, "");
}

function parseWorkUnitDescriptionShape(
  description: unknown,
): z.infer<typeof workUnitDescriptionSchema> | undefined {
  if (description === undefined) {
    return undefined;
  }

  const parsedDescription = workUnitDescriptionSchema.safeParse(description);
  if (parsedDescription.success) {
    return parsedDescription.data;
  }

  const issue = parsedDescription.error.issues[0];
  const descriptionPath = `description.${zodPathToFieldPath(issue?.path ?? [])}`;
  const scope = `workUnitType.${descriptionPath}`;
  const actionableMessage =
    "Work-unit description must be an object with description.markdown as a string";

  const firstDiagnostic = {
    code: "INVALID_WORK_UNIT_DESCRIPTION_SHAPE",
    message: actionableMessage,
    scope,
    path: descriptionPath,
    severity: "error",
    blocking: true,
    expected: "{ markdown: string }",
    received:
      issue && typeof issue.input !== "undefined"
        ? Array.isArray(issue.input)
          ? "array"
          : issue.input === null
            ? "null"
            : typeof issue.input
        : "unknown",
  } as const;

  throw new ORPCError("BAD_REQUEST", {
    message: actionableMessage,
    data: {
      validation: {
        valid: false,
        diagnostics: [firstDiagnostic],
      },
      diagnostics: [firstDiagnostic],
      firstDiagnostic,
      actionableMessage,
    },
  });
}

function extractValidationEnvelope(result: unknown): ValidationEnvelope | undefined {
  if (typeof result !== "object" || result === null) {
    return undefined;
  }

  const record = result as Record<string, unknown>;
  const candidate = [record.validation, record.diagnostics].find(
    (value): value is ValidationEnvelope =>
      typeof value === "object" &&
      value !== null &&
      typeof (value as { valid?: unknown }).valid === "boolean",
  );

  return candidate;
}

function assertLifecycleMutationValidation(result: unknown): void {
  const validation = extractValidationEnvelope(result);
  if (!validation || validation.valid) {
    return;
  }

  const parsedDiagnostics = parseLifecycleValidationDiagnostics(
    Array.isArray(validation.diagnostics) ? validation.diagnostics : [],
  );

  const hasDuplicateKeyDiagnostic = parsedDiagnostics.some(
    (diagnostic) => diagnostic.code === "DUPLICATE_WORK_UNIT_KEY",
  );

  const firstBlockingDiagnostic =
    parsedDiagnostics.find((diagnostic) => diagnostic.blocking === true) ?? parsedDiagnostics[0];

  throw new ORPCError(hasDuplicateKeyDiagnostic ? "CONFLICT" : "BAD_REQUEST", {
    message: "Work-unit lifecycle validation failed",
    data: {
      validation: {
        valid: false,
        diagnostics: parsedDiagnostics,
      },
      diagnostics: parsedDiagnostics,
      firstDiagnostic: firstBlockingDiagnostic,
      actionableMessage:
        firstBlockingDiagnostic?.message ?? "Work-unit lifecycle validation failed",
    },
  });
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
          methodologyId: input.methodologyId,
          versionId: input.versionId,
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
          methodologyId: input.methodologyId,
          versionId: input.versionId,
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
              workflowDefinitionId: workflow.workflowDefinitionId,
              key: workflow.key,
              displayName: workflow.displayName,
              descriptionJson:
                typeof workflow.description === "object" && workflow.description !== null
                  ? workflow.description
                  : typeof workflow.description === "string"
                    ? { markdown: workflow.description }
                    : null,
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
            ...toWorkflowDescription(input.workflow),
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
            ...toWorkflowDescription(input.workflow),
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

    getEditorDefinition: publicProcedure
      .input(workflowEditorRouteIdentitySchema)
      .handler(async ({ input }) =>
        runEffect(
          Layer.mergeAll(
            serviceLayer,
            Layer.provide(AgentStepEditorDefinitionServiceLive, serviceLayer),
          ),
          Effect.gen(function* () {
            const svc = yield* WorkflowEditorDefinitionService;
            const agentStepSvc = yield* AgentStepEditorDefinitionService;
            const identity: WorkflowEditorRouteIdentityContract = {
              methodologyId: input.methodologyId,
              versionId: input.versionId,
              workUnitTypeKey: input.workUnitTypeKey,
              workflowDefinitionId: input.workflowDefinitionId,
            };
            const definition = yield* svc.getEditorDefinition(identity);
            const agentStepDefinitions = yield* Effect.all(
              definition.steps
                .filter((step) => step.stepType === "agent")
                .map((step) =>
                  agentStepSvc.getAgentStepDefinition({
                    ...identity,
                    stepId: step.stepId,
                  }),
                ),
            );

            return {
              ...definition,
              agentStepDefinitions,
            };
          }),
        ),
      ),

    getAgentStepDefinition: publicProcedure
      .input(getAgentStepDefinitionSchema)
      .handler(async ({ input }) =>
        runEffect(
          Layer.mergeAll(
            serviceLayer,
            Layer.provide(AgentStepEditorDefinitionServiceLive, serviceLayer),
          ),
          Effect.gen(function* () {
            const svc = yield* AgentStepEditorDefinitionService;
            return yield* svc.getAgentStepDefinition({
              methodologyId: input.methodologyId,
              versionId: input.versionId,
              workUnitTypeKey: input.workUnitTypeKey,
              workflowDefinitionId: input.workflowDefinitionId,
              stepId: input.stepId,
            });
          }),
        ),
      ),

    discoverAgentStepHarnessMetadata: publicProcedure
      .input(z.object({}).default({}))
      .handler(async () =>
        runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* HarnessService;
            const metadata = yield* svc.discoverMetadata();
            return harnessDiscoveryMetadataSchema.parse(metadata);
          }),
        ),
      ),

    updateWorkflowMetadata: protectedProcedure
      .input(
        z.object({
          versionId: z.string().min(1),
          workUnitTypeKey: z.string().min(1),
          workflowDefinitionId: z.string().min(1),
          payload: workflowMetadataSchema,
        }),
      )
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;

        return runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* WorkflowService;
            const payload: WorkflowMetadataDialogInputContract = {
              workflowDefinitionId:
                input.payload.workflowDefinitionId ?? input.workflowDefinitionId,
              key: input.payload.key,
              displayName: input.payload.displayName,
              descriptionJson: input.payload.descriptionJson,
              entryStepId: input.payload.entryStepId ?? null,
            };
            return yield* svc.updateWorkflowMetadata(
              {
                versionId: input.versionId,
                workUnitTypeKey: input.workUnitTypeKey,
                workflowDefinitionId: input.workflowDefinitionId,
                payload,
              },
              actorId,
            );
          }),
        );
      }),

    createFormStep: protectedProcedure
      .input(createFormStepSchema)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;
        return runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* FormStepDefinitionService;
            return yield* svc.createFormStep(
              {
                versionId: input.versionId,
                workUnitTypeKey: input.workUnitTypeKey,
                workflowDefinitionId: input.workflowDefinitionId,
                afterStepKey: input.afterStepKey,
                payload: input.payload,
              },
              actorId,
            );
          }),
        );
      }),

    updateFormStep: protectedProcedure
      .input(updateFormStepSchema)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;
        return runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* FormStepDefinitionService;
            return yield* svc.updateFormStep(
              {
                versionId: input.versionId,
                workUnitTypeKey: input.workUnitTypeKey,
                workflowDefinitionId: input.workflowDefinitionId,
                stepId: input.stepId,
                payload: input.payload,
              },
              actorId,
            );
          }),
        );
      }),

    deleteFormStep: protectedProcedure
      .input(deleteFormStepSchema)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;
        return runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* FormStepDefinitionService;
            return yield* svc.deleteFormStep(
              {
                versionId: input.versionId,
                workUnitTypeKey: input.workUnitTypeKey,
                workflowDefinitionId: input.workflowDefinitionId,
                stepId: input.stepId,
              },
              actorId,
            );
          }),
        );
      }),

    createInvokeStep: protectedProcedure
      .input(createInvokeStepSchema)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;
        return runEffect(
          Layer.mergeAll(
            serviceLayer,
            Layer.provide(InvokeStepDefinitionServiceLive, serviceLayer),
          ),
          Effect.gen(function* () {
            const svc = yield* InvokeStepDefinitionService;
            return yield* svc.createInvokeStep(
              {
                versionId: input.versionId,
                workUnitTypeKey: input.workUnitTypeKey,
                workflowDefinitionId: input.workflowDefinitionId,
                payload: input.payload,
              },
              actorId,
            );
          }),
        );
      }),

    updateInvokeStep: protectedProcedure
      .input(updateInvokeStepSchema)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;
        return runEffect(
          Layer.mergeAll(
            serviceLayer,
            Layer.provide(InvokeStepDefinitionServiceLive, serviceLayer),
          ),
          Effect.gen(function* () {
            const svc = yield* InvokeStepDefinitionService;
            return yield* svc.updateInvokeStep(
              {
                versionId: input.versionId,
                workUnitTypeKey: input.workUnitTypeKey,
                workflowDefinitionId: input.workflowDefinitionId,
                stepId: input.stepId,
                payload: input.payload,
              },
              actorId,
            );
          }),
        );
      }),

    deleteInvokeStep: protectedProcedure
      .input(deleteInvokeStepSchema)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;
        return runEffect(
          Layer.mergeAll(
            serviceLayer,
            Layer.provide(InvokeStepDefinitionServiceLive, serviceLayer),
          ),
          Effect.gen(function* () {
            const svc = yield* InvokeStepDefinitionService;
            return yield* svc.deleteInvokeStep(
              {
                versionId: input.versionId,
                workUnitTypeKey: input.workUnitTypeKey,
                workflowDefinitionId: input.workflowDefinitionId,
                stepId: input.stepId,
              },
              actorId,
            );
          }),
        );
      }),

    createBranchStep: protectedProcedure
      .input(createBranchStepSchema)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;
        return runEffect(
          Layer.mergeAll(
            serviceLayer,
            Layer.provide(BranchStepDefinitionServiceLive, serviceLayer),
          ),
          Effect.gen(function* () {
            const svc = yield* BranchStepDefinitionService;
            return yield* svc.createBranchStep(
              {
                versionId: input.versionId,
                workUnitTypeKey: input.workUnitTypeKey,
                workflowDefinitionId: input.workflowDefinitionId,
                payload: input.payload,
              },
              actorId,
            );
          }),
        );
      }),

    updateBranchStep: protectedProcedure
      .input(updateBranchStepSchema)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;
        return runEffect(
          Layer.mergeAll(
            serviceLayer,
            Layer.provide(BranchStepDefinitionServiceLive, serviceLayer),
          ),
          Effect.gen(function* () {
            const svc = yield* BranchStepDefinitionService;
            return yield* svc.updateBranchStep(
              {
                versionId: input.versionId,
                workUnitTypeKey: input.workUnitTypeKey,
                workflowDefinitionId: input.workflowDefinitionId,
                stepId: input.stepId,
                payload: input.payload,
              },
              actorId,
            );
          }),
        );
      }),

    deleteBranchStep: protectedProcedure
      .input(deleteBranchStepSchema)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;
        return runEffect(
          Layer.mergeAll(
            serviceLayer,
            Layer.provide(BranchStepDefinitionServiceLive, serviceLayer),
          ),
          Effect.gen(function* () {
            const svc = yield* BranchStepDefinitionService;
            return yield* svc.deleteBranchStep(
              {
                versionId: input.versionId,
                workUnitTypeKey: input.workUnitTypeKey,
                workflowDefinitionId: input.workflowDefinitionId,
                stepId: input.stepId,
              },
              actorId,
            );
          }),
        );
      }),

    createAgentStep: protectedProcedure
      .input(createAgentStepSchema)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;
        return runEffect(
          Layer.mergeAll(serviceLayer, Layer.provide(AgentStepDefinitionServiceLive, serviceLayer)),
          Effect.gen(function* () {
            const svc = yield* AgentStepDefinitionService;
            return yield* svc.createAgentStep(
              {
                versionId: input.versionId,
                workUnitTypeKey: input.workUnitTypeKey,
                workflowDefinitionId: input.workflowDefinitionId,
                afterStepKey: input.afterStepKey,
                payload: input.payload,
              },
              actorId,
            );
          }),
        );
      }),

    updateAgentStep: protectedProcedure
      .input(updateAgentStepSchema)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;
        return runEffect(
          Layer.mergeAll(serviceLayer, Layer.provide(AgentStepDefinitionServiceLive, serviceLayer)),
          Effect.gen(function* () {
            const svc = yield* AgentStepDefinitionService;
            return yield* svc.updateAgentStep(
              {
                versionId: input.versionId,
                workUnitTypeKey: input.workUnitTypeKey,
                workflowDefinitionId: input.workflowDefinitionId,
                stepId: input.stepId,
                payload: input.payload,
              },
              actorId,
            );
          }),
        );
      }),

    deleteAgentStep: protectedProcedure
      .input(deleteAgentStepSchema)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;
        return runEffect(
          Layer.mergeAll(serviceLayer, Layer.provide(AgentStepDefinitionServiceLive, serviceLayer)),
          Effect.gen(function* () {
            const svc = yield* AgentStepDefinitionService;
            return yield* svc.deleteAgentStep(
              {
                versionId: input.versionId,
                workUnitTypeKey: input.workUnitTypeKey,
                workflowDefinitionId: input.workflowDefinitionId,
                stepId: input.stepId,
              },
              actorId,
            );
          }),
        );
      }),

    createEdge: protectedProcedure.input(createEdgeSchema).handler(async ({ input, context }) => {
      const actorId = context.session.user.id;
      return runEffect(
        serviceLayer,
        Effect.gen(function* () {
          yield* assertGenericEdgeCreateAllowed({
            versionId: input.versionId,
            workUnitTypeKey: input.workUnitTypeKey,
            workflowDefinitionId: input.workflowDefinitionId,
            fromStepKey: input.fromStepKey,
          });
          const svc = yield* WorkflowTopologyMutationService;
          return yield* svc.createEdge(
            {
              versionId: input.versionId,
              workUnitTypeKey: input.workUnitTypeKey,
              workflowDefinitionId: input.workflowDefinitionId,
              fromStepKey: input.fromStepKey,
              toStepKey: input.toStepKey,
              ...(input.descriptionJson ? { descriptionJson: input.descriptionJson } : {}),
            },
            actorId,
          );
        }),
      );
    }),

    updateEdge: protectedProcedure.input(updateEdgeSchema).handler(async ({ input, context }) => {
      const actorId = context.session.user.id;
      return runEffect(
        serviceLayer,
        Effect.gen(function* () {
          yield* assertGenericEdgeMutationAllowed({
            versionId: input.versionId,
            workUnitTypeKey: input.workUnitTypeKey,
            workflowDefinitionId: input.workflowDefinitionId,
            edgeId: input.edgeId,
            fromStepKey: input.fromStepKey,
          });
          const svc = yield* WorkflowTopologyMutationService;
          return yield* svc.updateEdge(
            {
              versionId: input.versionId,
              workUnitTypeKey: input.workUnitTypeKey,
              workflowDefinitionId: input.workflowDefinitionId,
              edgeId: input.edgeId,
              fromStepKey: input.fromStepKey,
              toStepKey: input.toStepKey,
              ...(input.descriptionJson ? { descriptionJson: input.descriptionJson } : {}),
            },
            actorId,
          );
        }),
      );
    }),

    deleteEdge: protectedProcedure.input(deleteEdgeSchema).handler(async ({ input, context }) => {
      const actorId = context.session.user.id;
      return runEffect(
        serviceLayer,
        Effect.gen(function* () {
          yield* assertGenericEdgeMutationAllowed({
            versionId: input.versionId,
            workUnitTypeKey: input.workUnitTypeKey,
            workflowDefinitionId: input.workflowDefinitionId,
            edgeId: input.edgeId,
          });
          const svc = yield* WorkflowTopologyMutationService;
          return yield* svc.deleteEdge(
            {
              versionId: input.versionId,
              workUnitTypeKey: input.workUnitTypeKey,
              workflowDefinitionId: input.workflowDefinitionId,
              edgeId: input.edgeId,
            },
            actorId,
          );
        }),
      );
    }),

    listWorkflowContextFacts: publicProcedure
      .input(listWorkflowContextFactSchema)
      .handler(async ({ input }) =>
        runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* WorkflowContextFactDefinitionService;
            return yield* svc.list({
              versionId: input.versionId,
              workflowDefinitionId: input.workflowDefinitionId,
            });
          }),
        ),
      ),

    createWorkflowContextFact: protectedProcedure
      .input(createWorkflowContextFactSchema)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;
        return runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* WorkflowContextFactDefinitionService;
            return yield* svc.create(
              {
                versionId: input.versionId,
                workUnitTypeKey: input.workUnitTypeKey,
                workflowDefinitionId: input.workflowDefinitionId,
                fact: input.fact,
              },
              actorId,
            );
          }),
        );
      }),

    updateWorkflowContextFact: protectedProcedure
      .input(updateWorkflowContextFactSchema)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;
        return runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* WorkflowContextFactDefinitionService;
            return yield* svc.update(
              {
                versionId: input.versionId,
                workUnitTypeKey: input.workUnitTypeKey,
                workflowDefinitionId: input.workflowDefinitionId,
                contextFactDefinitionId: input.contextFactDefinitionId,
                fact: input.fact,
              },
              actorId,
            );
          }),
        );
      }),

    deleteWorkflowContextFact: protectedProcedure
      .input(deleteWorkflowContextFactSchema)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;
        return runEffect(
          serviceLayer,
          Effect.gen(function* () {
            const svc = yield* WorkflowContextFactDefinitionService;
            return yield* svc.delete(
              {
                versionId: input.versionId,
                workUnitTypeKey: input.workUnitTypeKey,
                workflowDefinitionId: input.workflowDefinitionId,
                contextFactDefinitionId: input.contextFactDefinitionId,
              },
              actorId,
            );
          }),
        );
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
              id: workUnitType.id,
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
          description: input.fact.description,
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
          description: input.fact.description,
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
        const description = parseWorkUnitDescriptionShape(input.workUnitType.description);
        const workUnitPayload: CreateMethodologyWorkUnitInput = {
          versionId: input.versionId,
          workUnitType: {
            key: input.workUnitType.key,
            displayName: input.workUnitType.displayName,
            description,
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

        assertLifecycleMutationValidation(result);

        return {
          version: serializeVersion(result.version),
          diagnostics: result.validation,
        };
      }),

    updateWorkUnit: protectedProcedure
      .input(updateWorkUnitInput)
      .handler(async ({ input, context }) => {
        const actorId = context.session.user.id;
        const description = parseWorkUnitDescriptionShape(input.workUnitType.description);
        const workUnitPayload: UpdateMethodologyWorkUnitInput = {
          versionId: input.versionId,
          workUnitKey: input.workUnitKey,
          workUnitType: {
            key: input.workUnitType.key,
            displayName: input.workUnitType.displayName,
            description,
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

        assertLifecycleMutationValidation(result);

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
                ...(typeof transition.transitionId === "string"
                  ? { transitionId: transition.transitionId as string }
                  : {}),
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

            const workflowKeys =
              snapshot.transitionWorkflowBindings?.[input.workUnitTypeKey]?.[input.transitionKey];
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
            const existing =
              snapshot.transitionWorkflowBindings[input.workUnitTypeKey]?.[input.transitionKey];
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
            const existing =
              snapshot.transitionWorkflowBindings[input.workUnitTypeKey]?.[input.transitionKey];
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
          getEditorDefinition: router.getEditorDefinition,
          getAgentStepDefinition: router.getAgentStepDefinition,
          discoverAgentStepHarnessMetadata: router.discoverAgentStepHarnessMetadata,
          updateWorkflowMetadata: router.updateWorkflowMetadata,
          createFormStep: router.createFormStep,
          updateFormStep: router.updateFormStep,
          deleteFormStep: router.deleteFormStep,
          createInvokeStep: router.createInvokeStep,
          updateInvokeStep: router.updateInvokeStep,
          deleteInvokeStep: router.deleteInvokeStep,
          createBranchStep: router.createBranchStep,
          updateBranchStep: router.updateBranchStep,
          deleteBranchStep: router.deleteBranchStep,
          createAgentStep: router.createAgentStep,
          updateAgentStep: router.updateAgentStep,
          deleteAgentStep: router.deleteAgentStep,
          createEdge: router.createEdge,
          updateEdge: router.updateEdge,
          deleteEdge: router.deleteEdge,
          contextFact: {
            list: router.listWorkflowContextFacts,
            create: router.createWorkflowContextFact,
            update: router.updateWorkflowContextFact,
            delete: router.deleteWorkflowContextFact,
          },
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
