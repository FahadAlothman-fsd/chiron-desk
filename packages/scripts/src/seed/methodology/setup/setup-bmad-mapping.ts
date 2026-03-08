import { Schema } from "effect";

import { schema } from "@chiron/db";

const SetupStepSchema = Schema.Struct({
  id: Schema.String,
  type: Schema.Literal("action", "display"),
  templateRef: Schema.String,
});

const SetupMappingSchema = Schema.Struct({
  methodologyVersionId: Schema.String,
  workUnit: Schema.Struct({
    key: Schema.Literal("WU.SETUP"),
    displayName: Schema.String,
    cardinality: Schema.Literal("one_per_project"),
  }),
  transition: Schema.Struct({
    fromState: Schema.Literal("__absent__"),
    toState: Schema.Literal("done"),
    gateClass: Schema.Literal("start_gate"),
    workflowKey: Schema.Literal("setup-project"),
  }),
  workflows: Schema.Array(
    Schema.Struct({
      key: Schema.Literal("setup-project"),
      displayName: Schema.String,
      steps: Schema.Array(SetupStepSchema),
    }),
  ),
  workUnitFactSchemas: Schema.Array(
    Schema.Struct({
      key: Schema.String,
      name: Schema.String,
      factType: Schema.Literal("string", "number", "boolean", "json"),
      required: Schema.Boolean,
      defaultValue: Schema.Unknown,
      description: Schema.String,
      guidance: Schema.String,
      validation: Schema.Unknown,
    }),
  ),
});

const rawSetupMapping = {
  methodologyVersionId: "mver_seed_bmad_v1_setup_draft",
  workUnit: {
    key: "WU.SETUP",
    displayName: "Setup",
    cardinality: "one_per_project",
  },
  transition: {
    fromState: "__absent__",
    toState: "done",
    gateClass: "start_gate",
    workflowKey: "setup-project",
  },
  workflows: [
    {
      key: "setup-project",
      displayName: "Setup Project",
      steps: [
        { id: "setup.init", type: "action", templateRef: "CFG.ACTION.DISCOVER" },
        { id: "setup.discover", type: "action", templateRef: "CFG.ACTION.DISCOVER" },
        { id: "setup.confirm", type: "display", templateRef: "CFG.DISPLAY.SUMMARY" },
      ],
    },
  ],
  workUnitFactSchemas: [
    {
      key: "projectType",
      name: "Project Type",
      factType: "string",
      required: true,
      defaultValue: "greenfield",
      description: "Project classification used to choose setup guidance and workflow path.",
      guidance: "Set to greenfield, migration, or maintenance for deterministic setup behavior.",
      validation: { kind: "none" },
    },
    {
      key: "deliveryMode",
      name: "Delivery Mode",
      factType: "string",
      required: true,
      defaultValue: "iterative",
      description: "Delivery cadence used by setup and handoff workflows in project context.",
      guidance: "Use iterative by default; switch to fixed when milestones are contract-bound.",
      validation: { kind: "none" },
    },
  ],
} as const;

const setupMapping = Schema.decodeUnknownSync(SetupMappingSchema)(rawSetupMapping);

const workUnitTypeId = "seed:wut:wu.setup";
const doneStateId = "seed:state:wu.setup:done";
const setupTransitionId = "seed:transition:wu.setup:absent_done";
const setupWorkflowId = "seed:wf:setup-project";

export type MethodologyWorkUnitTypeSeedRow = typeof schema.methodologyWorkUnitTypes.$inferInsert;
export type MethodologyLifecycleStateSeedRow =
  typeof schema.methodologyLifecycleStates.$inferInsert;
export type MethodologyLifecycleTransitionSeedRow =
  typeof schema.methodologyLifecycleTransitions.$inferInsert;
export type MethodologyFactSchemaSeedRow = typeof schema.methodologyFactSchemas.$inferInsert;
export type MethodologyWorkflowSeedRow = typeof schema.methodologyWorkflows.$inferInsert;
export type MethodologyWorkflowStepSeedRow = typeof schema.methodologyWorkflowSteps.$inferInsert;
export type MethodologyWorkflowEdgeSeedRow = typeof schema.methodologyWorkflowEdges.$inferInsert;
export type MethodologyTransitionWorkflowBindingSeedRow =
  typeof schema.methodologyTransitionWorkflowBindings.$inferInsert;

export const setupWorkUnitTypeSeedRows: readonly MethodologyWorkUnitTypeSeedRow[] = [
  {
    id: workUnitTypeId,
    methodologyVersionId: setupMapping.methodologyVersionId,
    key: setupMapping.workUnit.key,
    displayName: setupMapping.workUnit.displayName,
    cardinality: setupMapping.workUnit.cardinality,
    descriptionJson: null,
  },
];

export const setupLifecycleStateSeedRows: readonly MethodologyLifecycleStateSeedRow[] = [
  {
    id: doneStateId,
    methodologyVersionId: setupMapping.methodologyVersionId,
    workUnitTypeId,
    key: setupMapping.transition.toState,
    displayName: "Done",
    descriptionJson: null,
  },
];

export const setupLifecycleTransitionSeedRows: readonly MethodologyLifecycleTransitionSeedRow[] = [
  {
    id: setupTransitionId,
    methodologyVersionId: setupMapping.methodologyVersionId,
    workUnitTypeId,
    fromStateId: null,
    toStateId: doneStateId,
    transitionKey: `${setupMapping.transition.fromState}->${setupMapping.transition.toState}`,
    gateClass: setupMapping.transition.gateClass,
  },
];

export const setupFactSchemaSeedRows: readonly MethodologyFactSchemaSeedRow[] =
  setupMapping.workUnitFactSchemas.map((fact) => ({
    id: `seed:fact-schema:wu.setup:${fact.key}`,
    methodologyVersionId: setupMapping.methodologyVersionId,
    workUnitTypeId,
    name: fact.name,
    key: fact.key,
    factType: fact.factType,
    required: fact.required,
    description: fact.description,
    defaultValueJson: fact.defaultValue,
    guidanceJson: fact.guidance,
    validationJson: fact.validation,
  }));

export const setupWorkflowSeedRows: readonly MethodologyWorkflowSeedRow[] =
  setupMapping.workflows.map((workflow) => ({
    id: setupWorkflowId,
    methodologyVersionId: setupMapping.methodologyVersionId,
    workUnitTypeId,
    key: workflow.key,
    displayName: workflow.displayName,
    guidanceJson: null,
  }));

export const setupWorkflowStepSeedRows: readonly MethodologyWorkflowStepSeedRow[] =
  setupMapping.workflows.flatMap((workflow) =>
    workflow.steps.map((step) => ({
      id: `seed:wf-step:${workflow.key}:${step.id}`,
      methodologyVersionId: setupMapping.methodologyVersionId,
      workflowId: setupWorkflowId,
      key: step.id,
      type: step.type,
      displayName: step.id,
      configJson: {
        templateRef: step.templateRef,
      },
      guidanceJson: null,
    })),
  );

export const setupWorkflowEdgeSeedRows: readonly MethodologyWorkflowEdgeSeedRow[] =
  setupMapping.workflows.flatMap((workflow) => {
    const edges = [] as MethodologyWorkflowEdgeSeedRow[];
    for (let i = 0; i < workflow.steps.length - 1; i++) {
      const from = workflow.steps[i]!;
      const to = workflow.steps[i + 1]!;
      edges.push({
        id: `seed:wf-edge:${workflow.key}:${from.id}->${to.id}`,
        methodologyVersionId: setupMapping.methodologyVersionId,
        workflowId: setupWorkflowId,
        fromStepId: `seed:wf-step:${workflow.key}:${from.id}`,
        toStepId: `seed:wf-step:${workflow.key}:${to.id}`,
        edgeKey: `${from.id}->${to.id}`,
        conditionJson: null,
        guidanceJson: null,
      });
    }
    return edges;
  });

export const setupTransitionWorkflowBindingSeedRows: readonly MethodologyTransitionWorkflowBindingSeedRow[] =
  [
    {
      id: "seed:binding:wu.setup:absent_done:setup-project",
      methodologyVersionId: setupMapping.methodologyVersionId,
      transitionId: setupTransitionId,
      workflowId: setupWorkflowId,
      guidanceJson: null,
    },
  ];

export const setupSeedMetadata = {
  methodologyVersionId: setupMapping.methodologyVersionId,
  workUnitKey: setupMapping.workUnit.key,
  workflowKeys: setupMapping.workflows.map((workflow) => workflow.key),
  sourceRefs: [
    "_bmad-output/planning-artifacts/chiron-seed-workflow-definitions-v1.json",
    "_bmad-output/planning-artifacts/chiron-seed-transition-allowed-workflows-v1.json",
    "packages/scripts/src/story-seed-fixtures.ts",
  ],
} as const;
