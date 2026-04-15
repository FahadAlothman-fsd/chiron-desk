import { schema } from "@chiron/db";

import { methodologyVersionIds } from "./setup-bmad-mapping";

export type MethodologyWorkflowStepSeedRow = typeof schema.methodologyWorkflowSteps.$inferInsert;
export type MethodologyWorkflowEdgeSeedRow = typeof schema.methodologyWorkflowEdges.$inferInsert;
export type MethodologyWorkflowFormFieldSeedRow =
  typeof schema.methodologyWorkflowFormFields.$inferInsert;
export type MethodologyWorkflowContextFactDefinitionSeedRow =
  typeof schema.methodologyWorkflowContextFactDefinitions.$inferInsert;
export type MethodologyWorkflowContextFactPlainValueSeedRow =
  typeof schema.methodologyWorkflowContextFactPlainValues.$inferInsert;
export type MethodologyWorkflowContextFactExternalBindingSeedRow =
  typeof schema.methodologyWorkflowContextFactExternalBindings.$inferInsert;
export type MethodologyWorkflowContextFactWorkflowReferenceSeedRow =
  typeof schema.methodologyWorkflowContextFactWorkflowReferences.$inferInsert;
export type MethodologyWorkflowContextFactArtifactReferenceSeedRow =
  typeof schema.methodologyWorkflowContextFactArtifactReferences.$inferInsert;
export type MethodologyWorkflowContextFactDraftSpecSeedRow =
  typeof schema.methodologyWorkflowContextFactDraftSpecs.$inferInsert;
export type MethodologyWorkflowContextFactDraftSpecSelectionSeedRow =
  typeof schema.methodologyWorkflowContextFactDraftSpecSelections.$inferInsert;
export type MethodologyWorkflowContextFactDraftSpecFactSeedRow =
  typeof schema.methodologyWorkflowContextFactDraftSpecFields.$inferInsert;
export type MethodologyWorkflowAgentStepSeedRow =
  typeof schema.methodologyWorkflowAgentSteps.$inferInsert;
export type MethodologyWorkflowAgentStepExplicitReadGrantSeedRow =
  typeof schema.methodologyWorkflowAgentStepExplicitReadGrants.$inferInsert;
export type MethodologyWorkflowAgentStepWriteItemSeedRow =
  typeof schema.methodologyWorkflowAgentStepWriteItems.$inferInsert;
export type MethodologyWorkflowAgentStepWriteItemRequirementSeedRow =
  typeof schema.methodologyWorkflowAgentStepWriteItemRequirements.$inferInsert;
export type MethodologyWorkflowInvokeStepSeedRow =
  typeof schema.methodologyWorkflowInvokeSteps.$inferInsert;
export type MethodologyWorkflowInvokeBindingSeedRow =
  typeof schema.methodologyWorkflowInvokeBindings.$inferInsert;
export type MethodologyWorkflowInvokeTransitionSeedRow =
  typeof schema.methodologyWorkflowInvokeTransitions.$inferInsert;

export type SetupInvokePhase1FixtureSeedRows = {
  readonly methodologyVersionId: string;
  readonly workflowIds: readonly string[];
  readonly workflowMetadataPatches: readonly {
    readonly workflowId: string;
    readonly metadataJson: { readonly entryStepId: string };
  }[];
  readonly methodologyWorkflowContextFactDefinitions: readonly MethodologyWorkflowContextFactDefinitionSeedRow[];
  readonly methodologyWorkflowContextFactPlainValues: readonly MethodologyWorkflowContextFactPlainValueSeedRow[];
  readonly methodologyWorkflowContextFactExternalBindings: readonly MethodologyWorkflowContextFactExternalBindingSeedRow[];
  readonly methodologyWorkflowContextFactWorkflowReferences: readonly MethodologyWorkflowContextFactWorkflowReferenceSeedRow[];
  readonly methodologyWorkflowContextFactArtifactReferences: readonly MethodologyWorkflowContextFactArtifactReferenceSeedRow[];
  readonly methodologyWorkflowContextFactDraftSpecs: readonly MethodologyWorkflowContextFactDraftSpecSeedRow[];
  readonly methodologyWorkflowContextFactDraftSpecSelections: readonly MethodologyWorkflowContextFactDraftSpecSelectionSeedRow[];
  readonly methodologyWorkflowContextFactDraftSpecFacts: readonly MethodologyWorkflowContextFactDraftSpecFactSeedRow[];
  readonly methodology_workflow_steps: readonly MethodologyWorkflowStepSeedRow[];
  readonly methodology_workflow_edges: readonly MethodologyWorkflowEdgeSeedRow[];
  readonly methodologyWorkflowFormFields: readonly MethodologyWorkflowFormFieldSeedRow[];
  readonly methodologyWorkflowAgentSteps: readonly MethodologyWorkflowAgentStepSeedRow[];
  readonly methodologyWorkflowAgentStepExplicitReadGrants: readonly MethodologyWorkflowAgentStepExplicitReadGrantSeedRow[];
  readonly methodologyWorkflowAgentStepWriteItems: readonly MethodologyWorkflowAgentStepWriteItemSeedRow[];
  readonly methodologyWorkflowAgentStepWriteItemRequirements: readonly MethodologyWorkflowAgentStepWriteItemRequirementSeedRow[];
  readonly methodologyWorkflowInvokeSteps: readonly MethodologyWorkflowInvokeStepSeedRow[];
  readonly methodologyWorkflowInvokeBindings: readonly MethodologyWorkflowInvokeBindingSeedRow[];
  readonly methodologyWorkflowInvokeTransitions: readonly MethodologyWorkflowInvokeTransitionSeedRow[];
};

function guidanceJson(human: string, agent = human) {
  return {
    human: { markdown: human },
    agent: { markdown: agent },
  };
}

function buildSetupInvokePhase1FixtureSeedRows(
  methodologyVersionId: string,
): SetupInvokePhase1FixtureSeedRows {
  const workflowId = {
    setup: `seed:workflow:setup:setup-project:${methodologyVersionId}`,
    brainstormingPrimary: `seed:workflow:brainstorming:brainstorming-primary:${methodologyVersionId}`,
    researchPrimary: `seed:workflow:research:research-primary:${methodologyVersionId}`,
    brainstormingSupport: `seed:workflow:brainstorming:brainstorming-support:${methodologyVersionId}`,
  } as const;

  const workUnitTypeId = {
    brainstorming: `seed:wut:brainstorming:${methodologyVersionId}`,
    research: `seed:wut:research:${methodologyVersionId}`,
  } as const;

  const workUnitFactId = {
    setup: {
      initiativeName: `seed:work-unit-fact:initiative-name:${methodologyVersionId}`,
      projectKind: `seed:work-unit-fact:project-kind:${methodologyVersionId}`,
      workflowMode: `seed:work-unit-fact:workflow-mode:${methodologyVersionId}`,
      requiresBrainstorming: `seed:work-unit-fact:requires-brainstorming:${methodologyVersionId}`,
      requiresResearch: `seed:work-unit-fact:requires-research:${methodologyVersionId}`,
    },
    brainstorming: {
      setupWorkUnit: `seed:work-unit-fact:brainstorming:setup-work-unit:${methodologyVersionId}`,
      desiredOutcome: `seed:work-unit-fact:brainstorming:desired-outcome:${methodologyVersionId}`,
      selectedDirection: `seed:work-unit-fact:brainstorming:selected-direction:${methodologyVersionId}`,
    },
    research: {
      setupWorkUnit: `seed:work-unit-fact:research:setup-work-unit:${methodologyVersionId}`,
      brainstormingWorkUnit: `seed:work-unit-fact:research:brainstorming-work-unit:${methodologyVersionId}`,
      researchTopic: `seed:work-unit-fact:research:research-topic:${methodologyVersionId}`,
    },
  } as const;

  const artifactSlotId = {
    setupProjectOverview: `seed:artifact-slot:setup:project-overview:${methodologyVersionId}`,
    brainstormingSession: `seed:artifact-slot:brainstorming:brainstorming-session:${methodologyVersionId}`,
    researchReport: `seed:artifact-slot:research:research-report:${methodologyVersionId}`,
  } as const;

  const stepId = {
    setup: {
      collect: `seed:l3-setup-invoke:setup:${methodologyVersionId}:step:collect-setup-baseline`,
      synthesize: `seed:l3-setup-invoke:setup:${methodologyVersionId}:step:synthesize-setup-for-invoke`,
      invokeBrainstorming: `seed:l3-setup-invoke:setup:${methodologyVersionId}:step:invoke-brainstorming-fixed`,
      invokeResearch: `seed:l3-setup-invoke:setup:${methodologyVersionId}:step:invoke-research-from-draft-spec`,
    },
    brainstormingPrimary: {
      confirm: `seed:l3-setup-invoke:brainstorming:${methodologyVersionId}:step:confirm-brainstorming-seed`,
      invokeSupportFixed: `seed:l3-setup-invoke:brainstorming:${methodologyVersionId}:step:invoke-support-fixed`,
      invokeSupportFromRefs: `seed:l3-setup-invoke:brainstorming:${methodologyVersionId}:step:invoke-support-from-refs`,
    },
    researchPrimary: {
      capture: `seed:l3-setup-invoke:research:${methodologyVersionId}:step:capture-research-topic`,
    },
    brainstormingSupport: {
      capture: `seed:l3-setup-invoke:brainstorming-support:${methodologyVersionId}:step:capture-support-note`,
    },
  } as const;

  const contextFactId = {
    setup: {
      projectKind: `seed:l3-setup-invoke:setup:${methodologyVersionId}:ctx:cf-setup-project-kind`,
      initiativeName: `seed:l3-setup-invoke:setup:${methodologyVersionId}:ctx:cf-setup-initiative-name`,
      workflowMode: `seed:l3-setup-invoke:setup:${methodologyVersionId}:ctx:cf-setup-workflow-mode`,
      projectKnowledgeDirectory: `seed:l3-setup-invoke:setup:${methodologyVersionId}:ctx:cf-method-project-knowledge-directory`,
      planningArtifactsDirectory: `seed:l3-setup-invoke:setup:${methodologyVersionId}:ctx:cf-method-planning-artifacts-directory`,
      communicationLanguage: `seed:l3-setup-invoke:setup:${methodologyVersionId}:ctx:cf-method-communication-language`,
      documentOutputLanguage: `seed:l3-setup-invoke:setup:${methodologyVersionId}:ctx:cf-method-document-output-language`,
      requiresBrainstorming: `seed:l3-setup-invoke:setup:${methodologyVersionId}:ctx:cf-setup-requires-brainstorming`,
      requiresResearch: `seed:l3-setup-invoke:setup:${methodologyVersionId}:ctx:cf-setup-requires-research`,
      projectOverviewArtifact: `seed:l3-setup-invoke:setup:${methodologyVersionId}:ctx:cf-project-overview-artifact`,
      brainstormingDraftSpec: `seed:l3-setup-invoke:setup:${methodologyVersionId}:ctx:cf-setup-brainstorming-draft-spec`,
      researchDraftSpec: `seed:l3-setup-invoke:setup:${methodologyVersionId}:ctx:cf-setup-research-draft-spec`,
    },
    brainstormingPrimary: {
      desiredOutcome: `seed:l3-setup-invoke:brainstorming:${methodologyVersionId}:ctx:cf-brainstorming-desired-outcome`,
      selectedDirection: `seed:l3-setup-invoke:brainstorming:${methodologyVersionId}:ctx:cf-brainstorming-selected-direction`,
      supportWorkflows: `seed:l3-setup-invoke:brainstorming:${methodologyVersionId}:ctx:cf-brainstorming-support-workflows`,
    },
    researchPrimary: {
      researchTopic: `seed:l3-setup-invoke:research:${methodologyVersionId}:ctx:cf-research-topic`,
    },
    brainstormingSupport: {
      supportNote: `seed:l3-setup-invoke:brainstorming-support:${methodologyVersionId}:ctx:cf-support-note`,
    },
  } as const;

  const draftSpecId = {
    brainstorming: `seed:l3-setup-invoke:setup:${methodologyVersionId}:draft-spec:brainstorming`,
    research: `seed:l3-setup-invoke:setup:${methodologyVersionId}:draft-spec:research`,
  } as const;

  const writeItemId = {
    projectOverviewArtifact: `seed:l3-setup-invoke:setup:${methodologyVersionId}:write-item:project-overview-artifact`,
    requiresBrainstorming: `seed:l3-setup-invoke:setup:${methodologyVersionId}:write-item:requires-brainstorming`,
    requiresResearch: `seed:l3-setup-invoke:setup:${methodologyVersionId}:write-item:requires-research`,
    brainstormingDraftSpec: `seed:l3-setup-invoke:setup:${methodologyVersionId}:write-item:brainstorming-draft-spec`,
    researchDraftSpec: `seed:l3-setup-invoke:setup:${methodologyVersionId}:write-item:research-draft-spec`,
  } as const;

  return {
    methodologyVersionId,
    workflowIds: Object.values(workflowId),
    workflowMetadataPatches: [
      { workflowId: workflowId.setup, metadataJson: { entryStepId: stepId.setup.collect } },
      {
        workflowId: workflowId.brainstormingPrimary,
        metadataJson: { entryStepId: stepId.brainstormingPrimary.confirm },
      },
      {
        workflowId: workflowId.researchPrimary,
        metadataJson: { entryStepId: stepId.researchPrimary.capture },
      },
      {
        workflowId: workflowId.brainstormingSupport,
        metadataJson: { entryStepId: stepId.brainstormingSupport.capture },
      },
    ],
    methodologyWorkflowContextFactDefinitions: [
      {
        id: contextFactId.setup.projectKind,
        workflowId: workflowId.setup,
        factKey: "cf_setup_project_kind",
        factKind: "definition_backed_external_fact",
        label: "Setup Project Kind",
        descriptionJson: {
          markdown: "Required setup project-kind input for the phase-1 invoke flow.",
        },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "Capture the minimum required project-kind input.",
          "Use this as the only required setup form field.",
        ),
      },
      {
        id: contextFactId.setup.initiativeName,
        workflowId: workflowId.setup,
        factKey: "cf_setup_initiative_name",
        factKind: "definition_backed_external_fact",
        label: "Setup Initiative Name",
        descriptionJson: { markdown: "Optional initiative name for lightweight setup." },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "Collect an initiative name when helpful.",
          "Optional setup context only.",
        ),
      },
      {
        id: contextFactId.setup.workflowMode,
        workflowId: workflowId.setup,
        factKey: "cf_setup_workflow_mode",
        factKind: "definition_backed_external_fact",
        label: "Setup Workflow Mode",
        descriptionJson: { markdown: "Optional workflow mode for the phase-1 invoke setup flow." },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "Use this only when the operator wants to record the lightweight mode explicitly.",
        ),
      },
      {
        id: contextFactId.setup.projectKnowledgeDirectory,
        workflowId: workflowId.setup,
        factKey: "cf_method_project_knowledge_directory",
        factKind: "bound_external_fact",
        label: "Project Knowledge Directory",
        descriptionJson: { markdown: "Optional methodology-level knowledge directory binding." },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "Use this when setup should explicitly bind the knowledge directory.",
        ),
      },
      {
        id: contextFactId.setup.planningArtifactsDirectory,
        workflowId: workflowId.setup,
        factKey: "cf_method_planning_artifacts_directory",
        factKind: "bound_external_fact",
        label: "Planning Artifacts Directory",
        descriptionJson: {
          markdown: "Optional methodology-level planning artifacts directory binding.",
        },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "Use this when setup should explicitly bind the planning artifacts directory.",
        ),
      },
      {
        id: contextFactId.setup.communicationLanguage,
        workflowId: workflowId.setup,
        factKey: "cf_method_communication_language",
        factKind: "bound_external_fact",
        label: "Communication Language",
        descriptionJson: { markdown: "Optional methodology-level communication language binding." },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "Use this when setup should explicitly bind the communication language.",
        ),
      },
      {
        id: contextFactId.setup.documentOutputLanguage,
        workflowId: workflowId.setup,
        factKey: "cf_method_document_output_language",
        factKind: "bound_external_fact",
        label: "Document Output Language",
        descriptionJson: {
          markdown: "Optional methodology-level document output language binding.",
        },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "Use this when setup should explicitly bind the document output language.",
        ),
      },
      {
        id: contextFactId.setup.requiresBrainstorming,
        workflowId: workflowId.setup,
        factKey: "cf_setup_requires_brainstorming",
        factKind: "definition_backed_external_fact",
        label: "Requires Brainstorming",
        descriptionJson: {
          markdown:
            "Setup-owned signal that the invoke flow should create a brainstorming work unit.",
        },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "Have the setup agent record whether brainstorming follow-up should be created.",
        ),
      },
      {
        id: contextFactId.setup.requiresResearch,
        workflowId: workflowId.setup,
        factKey: "cf_setup_requires_research",
        factKind: "definition_backed_external_fact",
        label: "Requires Research",
        descriptionJson: {
          markdown: "Setup-owned signal that the invoke flow should create research work units.",
        },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "Have the setup agent record whether research follow-up should be created.",
        ),
      },
      {
        id: contextFactId.setup.projectOverviewArtifact,
        workflowId: workflowId.setup,
        factKey: "cf_project_overview_artifact",
        factKind: "artifact_reference_fact",
        label: "Project Overview Artifact",
        descriptionJson: {
          markdown: "Artifact reference for the durable PROJECT_OVERVIEW output.",
        },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "The setup agent must write the durable project overview artifact reference here.",
        ),
      },
      {
        id: contextFactId.setup.brainstormingDraftSpec,
        workflowId: workflowId.setup,
        factKey: "cf_setup_brainstorming_draft_spec",
        factKind: "work_unit_draft_spec_fact",
        label: "Brainstorming Draft Spec",
        descriptionJson: {
          markdown: "Draft-spec payload used to create invoke-seeded brainstorming work units.",
        },
        cardinality: "many",
        guidanceJson: guidanceJson(
          "Have the setup agent author at least one brainstorming draft-spec item with invoke-prefilled values.",
        ),
      },
      {
        id: contextFactId.setup.researchDraftSpec,
        workflowId: workflowId.setup,
        factKey: "cf_setup_research_draft_spec",
        factKind: "work_unit_draft_spec_fact",
        label: "Research Draft Spec",
        descriptionJson: {
          markdown: "Draft-spec payload used to create invoke-seeded research work units.",
        },
        cardinality: "many",
        guidanceJson: guidanceJson(
          "Have the setup agent author at least one research draft-spec item with a research topic.",
        ),
      },
      {
        id: contextFactId.brainstormingPrimary.desiredOutcome,
        workflowId: workflowId.brainstormingPrimary,
        factKey: "cf_brainstorming_desired_outcome",
        factKind: "definition_backed_external_fact",
        label: "Brainstorming Desired Outcome",
        descriptionJson: {
          markdown: "Invoke-prefilled desired outcome for the lightweight brainstorming workflow.",
        },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "This should be prefilled from the setup-created brainstorming work unit.",
        ),
      },
      {
        id: contextFactId.brainstormingPrimary.selectedDirection,
        workflowId: workflowId.brainstormingPrimary,
        factKey: "cf_brainstorming_selected_direction",
        factKind: "definition_backed_external_fact",
        label: "Brainstorming Selected Direction",
        descriptionJson: {
          markdown:
            "Invoke-prefilled selected direction for the lightweight brainstorming workflow.",
        },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "This should be prefilled from the setup-created brainstorming work unit.",
        ),
      },
      {
        id: contextFactId.brainstormingPrimary.supportWorkflows,
        workflowId: workflowId.brainstormingPrimary,
        factKey: "cf_brainstorming_support_workflows",
        factKind: "workflow_reference_fact",
        label: "Brainstorming Support Workflows",
        descriptionJson: {
          markdown: "Workflow references used by the context-fact-backed support invoke.",
        },
        cardinality: "many",
        guidanceJson: guidanceJson(
          "Seed at least one support workflow reference so the context-fact-backed workflow invoke has a non-zero target set.",
        ),
      },
      {
        id: contextFactId.researchPrimary.researchTopic,
        workflowId: workflowId.researchPrimary,
        factKey: "cf_research_topic",
        factKind: "definition_backed_external_fact",
        label: "Research Topic",
        descriptionJson: {
          markdown: "Lightweight research topic input for the invoke-created research workflow.",
        },
        cardinality: "one",
        guidanceJson: guidanceJson("Keep research trivial to complete in the phase-1 fixture."),
      },
      {
        id: contextFactId.brainstormingSupport.supportNote,
        workflowId: workflowId.brainstormingSupport,
        factKey: "cf_support_note",
        factKind: "plain_value_fact",
        label: "Support Note",
        descriptionJson: {
          markdown: "Tiny local support note for the deterministic supporting workflow.",
        },
        cardinality: "one",
        guidanceJson: guidanceJson("Keep the support workflow tiny and trivially completable."),
      },
    ],
    methodologyWorkflowContextFactPlainValues: [
      {
        id: `seed:l3-setup-invoke:brainstorming-support:${methodologyVersionId}:ctx-payload:cf-support-note`,
        contextFactDefinitionId: contextFactId.brainstormingSupport.supportNote,
        valueType: "string",
      },
    ],
    methodologyWorkflowContextFactExternalBindings: [
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:binding:cf-setup-project-kind`,
        contextFactDefinitionId: contextFactId.setup.projectKind,
        provider: "definition_backed_external_fact",
        bindingKey: "project_kind",
      },
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:binding:cf-setup-initiative-name`,
        contextFactDefinitionId: contextFactId.setup.initiativeName,
        provider: "definition_backed_external_fact",
        bindingKey: "initiative_name",
      },
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:binding:cf-setup-workflow-mode`,
        contextFactDefinitionId: contextFactId.setup.workflowMode,
        provider: "definition_backed_external_fact",
        bindingKey: "workflow_mode",
      },
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:binding:cf-method-project-knowledge-directory`,
        contextFactDefinitionId: contextFactId.setup.projectKnowledgeDirectory,
        provider: "bound_external_fact",
        bindingKey: "project_knowledge_directory",
      },
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:binding:cf-method-planning-artifacts-directory`,
        contextFactDefinitionId: contextFactId.setup.planningArtifactsDirectory,
        provider: "bound_external_fact",
        bindingKey: "planning_artifacts_directory",
      },
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:binding:cf-method-communication-language`,
        contextFactDefinitionId: contextFactId.setup.communicationLanguage,
        provider: "bound_external_fact",
        bindingKey: "communication_language",
      },
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:binding:cf-method-document-output-language`,
        contextFactDefinitionId: contextFactId.setup.documentOutputLanguage,
        provider: "bound_external_fact",
        bindingKey: "document_output_language",
      },
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:binding:cf-setup-requires-brainstorming`,
        contextFactDefinitionId: contextFactId.setup.requiresBrainstorming,
        provider: "definition_backed_external_fact",
        bindingKey: "requires_brainstorming",
      },
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:binding:cf-setup-requires-research`,
        contextFactDefinitionId: contextFactId.setup.requiresResearch,
        provider: "definition_backed_external_fact",
        bindingKey: "requires_research",
      },
      {
        id: `seed:l3-setup-invoke:brainstorming:${methodologyVersionId}:binding:cf-brainstorming-desired-outcome`,
        contextFactDefinitionId: contextFactId.brainstormingPrimary.desiredOutcome,
        provider: "definition_backed_external_fact",
        bindingKey: "desired_outcome",
      },
      {
        id: `seed:l3-setup-invoke:brainstorming:${methodologyVersionId}:binding:cf-brainstorming-selected-direction`,
        contextFactDefinitionId: contextFactId.brainstormingPrimary.selectedDirection,
        provider: "definition_backed_external_fact",
        bindingKey: "selected_direction",
      },
      {
        id: `seed:l3-setup-invoke:research:${methodologyVersionId}:binding:cf-research-topic`,
        contextFactDefinitionId: contextFactId.researchPrimary.researchTopic,
        provider: "definition_backed_external_fact",
        bindingKey: "research_topic",
      },
    ],
    methodologyWorkflowContextFactWorkflowReferences: [
      {
        id: `seed:l3-setup-invoke:brainstorming:${methodologyVersionId}:workflow-ref:brainstorming-support`,
        contextFactDefinitionId: contextFactId.brainstormingPrimary.supportWorkflows,
        workflowDefinitionId: workflowId.brainstormingSupport,
      },
    ],
    methodologyWorkflowContextFactArtifactReferences: [
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:artifact-ref:project-overview`,
        contextFactDefinitionId: contextFactId.setup.projectOverviewArtifact,
        artifactSlotKey: "PROJECT_OVERVIEW",
      },
    ],
    methodologyWorkflowContextFactDraftSpecs: [
      {
        id: draftSpecId.brainstorming,
        contextFactDefinitionId: contextFactId.setup.brainstormingDraftSpec,
        workUnitDefinitionId: workUnitTypeId.brainstorming,
      },
      {
        id: draftSpecId.research,
        contextFactDefinitionId: contextFactId.setup.researchDraftSpec,
        workUnitDefinitionId: workUnitTypeId.research,
      },
    ],
    methodologyWorkflowContextFactDraftSpecSelections: [
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:draft-spec-selection:brainstorming:setup-work-unit`,
        draftSpecId: draftSpecId.brainstorming,
        selectionType: "fact",
        definitionId: workUnitFactId.brainstorming.setupWorkUnit,
        sortOrder: 0,
      },
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:draft-spec-selection:brainstorming:desired-outcome`,
        draftSpecId: draftSpecId.brainstorming,
        selectionType: "fact",
        definitionId: workUnitFactId.brainstorming.desiredOutcome,
        sortOrder: 1,
      },
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:draft-spec-selection:brainstorming:selected-direction`,
        draftSpecId: draftSpecId.brainstorming,
        selectionType: "fact",
        definitionId: workUnitFactId.brainstorming.selectedDirection,
        sortOrder: 2,
      },
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:draft-spec-selection:brainstorming:artifact`,
        draftSpecId: draftSpecId.brainstorming,
        selectionType: "artifact",
        definitionId: artifactSlotId.brainstormingSession,
        sortOrder: 3,
      },
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:draft-spec-selection:research:setup-work-unit`,
        draftSpecId: draftSpecId.research,
        selectionType: "fact",
        definitionId: workUnitFactId.research.setupWorkUnit,
        sortOrder: 0,
      },
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:draft-spec-selection:research:research-topic`,
        draftSpecId: draftSpecId.research,
        selectionType: "fact",
        definitionId: workUnitFactId.research.researchTopic,
        sortOrder: 1,
      },
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:draft-spec-selection:research:artifact`,
        draftSpecId: draftSpecId.research,
        selectionType: "artifact",
        definitionId: artifactSlotId.researchReport,
        sortOrder: 2,
      },
    ],
    methodologyWorkflowContextFactDraftSpecFacts: [],
    methodology_workflow_steps: [
      {
        id: stepId.setup.collect,
        methodologyVersionId,
        workflowId: workflowId.setup,
        key: "collect_setup_baseline",
        type: "form",
        displayName: "Collect Setup Baseline",
        configJson: null,
        guidanceJson: guidanceJson(
          "Capture the minimum setup baseline needed to start the invoke journey.",
        ),
      },
      {
        id: stepId.setup.synthesize,
        methodologyVersionId,
        workflowId: workflowId.setup,
        key: "synthesize_setup_for_invoke",
        type: "agent",
        displayName: "Synthesize Setup For Invoke",
        configJson: {
          descriptionJson: {
            markdown:
              "Write the minimum setup-owned outputs required by the invoke-only phase-1 seed.",
          },
        },
        guidanceJson: guidanceJson(
          "Write the project overview artifact and draft specs that the invoke steps depend on.",
        ),
      },
      {
        id: stepId.setup.invokeBrainstorming,
        methodologyVersionId,
        workflowId: workflowId.setup,
        key: "invoke_brainstorming_fixed",
        type: "invoke",
        displayName: "Invoke Brainstorming Fixed",
        configJson: null,
        guidanceJson: guidanceJson(
          "Create one deterministic downstream brainstorming work unit with prefilled values.",
        ),
      },
      {
        id: stepId.setup.invokeResearch,
        methodologyVersionId,
        workflowId: workflowId.setup,
        key: "invoke_research_from_draft_spec",
        type: "invoke",
        displayName: "Invoke Research From Draft Spec",
        configJson: null,
        guidanceJson: guidanceJson(
          "Create downstream research work units from the authored draft spec.",
        ),
      },
      {
        id: stepId.brainstormingPrimary.confirm,
        methodologyVersionId,
        workflowId: workflowId.brainstormingPrimary,
        key: "confirm_brainstorming_seed",
        type: "form",
        displayName: "Confirm Brainstorming Seed",
        configJson: null,
        guidanceJson: guidanceJson("Confirm or refine the invoke-prefilled brainstorming values."),
      },
      {
        id: stepId.brainstormingPrimary.invokeSupportFixed,
        methodologyVersionId,
        workflowId: workflowId.brainstormingPrimary,
        key: "invoke_support_fixed",
        type: "invoke",
        displayName: "Invoke Support Fixed",
        configJson: null,
        guidanceJson: guidanceJson("Exercise the workflow + fixed-set invoke path."),
      },
      {
        id: stepId.brainstormingPrimary.invokeSupportFromRefs,
        methodologyVersionId,
        workflowId: workflowId.brainstormingPrimary,
        key: "invoke_support_from_refs",
        type: "invoke",
        displayName: "Invoke Support From Refs",
        configJson: null,
        guidanceJson: guidanceJson("Exercise the workflow + context-fact-backed invoke path."),
      },
      {
        id: stepId.researchPrimary.capture,
        methodologyVersionId,
        workflowId: workflowId.researchPrimary,
        key: "capture_research_topic",
        type: "form",
        displayName: "Capture Research Topic",
        configJson: null,
        guidanceJson: guidanceJson("Keep the research workflow trivially completable."),
      },
      {
        id: stepId.brainstormingSupport.capture,
        methodologyVersionId,
        workflowId: workflowId.brainstormingSupport,
        key: "capture_support_note",
        type: "form",
        displayName: "Capture Support Note",
        configJson: null,
        guidanceJson: guidanceJson("Keep the support workflow tiny and trivially completable."),
      },
    ],
    methodology_workflow_edges: [
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:edge:collect-to-synthesize`,
        methodologyVersionId,
        workflowId: workflowId.setup,
        fromStepId: stepId.setup.collect,
        toStepId: stepId.setup.synthesize,
        edgeKey: "collect_setup_baseline_to_synthesize_setup_for_invoke",
        descriptionJson: {
          markdown: "Proceed from setup baseline collection to the setup synthesis agent.",
        },
      },
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:edge:synthesize-to-invoke-brainstorming`,
        methodologyVersionId,
        workflowId: workflowId.setup,
        fromStepId: stepId.setup.synthesize,
        toStepId: stepId.setup.invokeBrainstorming,
        edgeKey: "synthesize_setup_for_invoke_to_invoke_brainstorming_fixed",
        descriptionJson: {
          markdown: "Proceed from synthesis to the fixed-set brainstorming invoke.",
        },
      },
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:edge:invoke-brainstorming-to-invoke-research`,
        methodologyVersionId,
        workflowId: workflowId.setup,
        fromStepId: stepId.setup.invokeBrainstorming,
        toStepId: stepId.setup.invokeResearch,
        edgeKey: "invoke_brainstorming_fixed_to_invoke_research_from_draft_spec",
        descriptionJson: {
          markdown:
            "Proceed from the fixed-set brainstorming invoke to the draft-spec-backed research invoke.",
        },
      },
      {
        id: `seed:l3-setup-invoke:brainstorming:${methodologyVersionId}:edge:confirm-to-support-fixed`,
        methodologyVersionId,
        workflowId: workflowId.brainstormingPrimary,
        fromStepId: stepId.brainstormingPrimary.confirm,
        toStepId: stepId.brainstormingPrimary.invokeSupportFixed,
        edgeKey: "confirm_brainstorming_seed_to_invoke_support_fixed",
        descriptionJson: { markdown: "Proceed from confirmation to the fixed-set support invoke." },
      },
      {
        id: `seed:l3-setup-invoke:brainstorming:${methodologyVersionId}:edge:support-fixed-to-support-refs`,
        methodologyVersionId,
        workflowId: workflowId.brainstormingPrimary,
        fromStepId: stepId.brainstormingPrimary.invokeSupportFixed,
        toStepId: stepId.brainstormingPrimary.invokeSupportFromRefs,
        edgeKey: "invoke_support_fixed_to_invoke_support_from_refs",
        descriptionJson: {
          markdown:
            "Proceed from the fixed-set support invoke to the context-fact-backed support invoke.",
        },
      },
    ],
    methodologyWorkflowFormFields: [
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:field:project-kind`,
        formStepId: stepId.setup.collect,
        key: "projectKind",
        label: "Project Kind",
        valueType: "string",
        required: true,
        inputJson: { contextFactDefinitionId: contextFactId.setup.projectKind },
        descriptionJson: { markdown: "Select whether the project is greenfield or brownfield." },
        sortOrder: 0,
      },
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:field:initiative-name`,
        formStepId: stepId.setup.collect,
        key: "initiativeName",
        label: "Initiative Name",
        valueType: "string",
        required: false,
        inputJson: { contextFactDefinitionId: contextFactId.setup.initiativeName },
        descriptionJson: { markdown: "Optional initiative name." },
        sortOrder: 1,
      },
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:field:workflow-mode`,
        formStepId: stepId.setup.collect,
        key: "workflowMode",
        label: "Workflow Mode",
        valueType: "string",
        required: false,
        inputJson: { contextFactDefinitionId: contextFactId.setup.workflowMode },
        descriptionJson: { markdown: "Optional setup workflow mode." },
        sortOrder: 2,
      },
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:field:project-knowledge-directory`,
        formStepId: stepId.setup.collect,
        key: "projectKnowledgeDirectory",
        label: "Project Knowledge Directory",
        valueType: "string",
        required: false,
        inputJson: { contextFactDefinitionId: contextFactId.setup.projectKnowledgeDirectory },
        descriptionJson: { markdown: "Optional project knowledge directory." },
        sortOrder: 3,
      },
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:field:planning-artifacts-directory`,
        formStepId: stepId.setup.collect,
        key: "planningArtifactsDirectory",
        label: "Planning Artifacts Directory",
        valueType: "string",
        required: false,
        inputJson: { contextFactDefinitionId: contextFactId.setup.planningArtifactsDirectory },
        descriptionJson: { markdown: "Optional planning artifacts directory." },
        sortOrder: 4,
      },
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:field:communication-language`,
        formStepId: stepId.setup.collect,
        key: "communicationLanguage",
        label: "Communication Language",
        valueType: "string",
        required: false,
        inputJson: { contextFactDefinitionId: contextFactId.setup.communicationLanguage },
        descriptionJson: { markdown: "Optional communication language." },
        sortOrder: 5,
      },
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:field:document-output-language`,
        formStepId: stepId.setup.collect,
        key: "documentOutputLanguage",
        label: "Document Output Language",
        valueType: "string",
        required: false,
        inputJson: { contextFactDefinitionId: contextFactId.setup.documentOutputLanguage },
        descriptionJson: { markdown: "Optional document output language." },
        sortOrder: 6,
      },
      {
        id: `seed:l3-setup-invoke:brainstorming:${methodologyVersionId}:field:desired-outcome`,
        formStepId: stepId.brainstormingPrimary.confirm,
        key: "desiredOutcome",
        label: "Desired Outcome",
        valueType: "string",
        required: false,
        inputJson: { contextFactDefinitionId: contextFactId.brainstormingPrimary.desiredOutcome },
        descriptionJson: {
          markdown: "Optional refinement of the invoke-prefilled desired outcome.",
        },
        sortOrder: 0,
      },
      {
        id: `seed:l3-setup-invoke:brainstorming:${methodologyVersionId}:field:selected-direction`,
        formStepId: stepId.brainstormingPrimary.confirm,
        key: "selectedDirection",
        label: "Selected Direction",
        valueType: "string",
        required: false,
        inputJson: {
          contextFactDefinitionId: contextFactId.brainstormingPrimary.selectedDirection,
        },
        descriptionJson: {
          markdown: "Optional refinement of the invoke-prefilled selected direction.",
        },
        sortOrder: 1,
      },
      {
        id: `seed:l3-setup-invoke:research:${methodologyVersionId}:field:research-topic`,
        formStepId: stepId.researchPrimary.capture,
        key: "researchTopic",
        label: "Research Topic",
        valueType: "string",
        required: false,
        inputJson: { contextFactDefinitionId: contextFactId.researchPrimary.researchTopic },
        descriptionJson: {
          markdown: "Optional research topic for the invoke-created research work unit.",
        },
        sortOrder: 0,
      },
      {
        id: `seed:l3-setup-invoke:brainstorming-support:${methodologyVersionId}:field:support-note`,
        formStepId: stepId.brainstormingSupport.capture,
        key: "supportNote",
        label: "Support Note",
        valueType: "string",
        required: false,
        inputJson: { contextFactDefinitionId: contextFactId.brainstormingSupport.supportNote },
        descriptionJson: { markdown: "Optional note for the tiny support workflow." },
        sortOrder: 0,
      },
    ],
    methodologyWorkflowAgentSteps: [
      {
        stepId: stepId.setup.synthesize,
        objective:
          "Write the minimum setup-owned outputs needed by the phase-1 invoke runtime seed: a project overview artifact reference, both setup follow-up booleans, at least one brainstorming draft spec, and at least one research draft spec.",
        instructionsMarkdown:
          "Create a lightweight PROJECT_OVERVIEW artifact reference in `cf_project_overview_artifact`. Write `cf_setup_requires_brainstorming` and `cf_setup_requires_research`. Author at least one brainstorming draft-spec item in `cf_setup_brainstorming_draft_spec` with prefilled `desired_outcome` and `selected_direction`. Author at least one research draft-spec item in `cf_setup_research_draft_spec` with a prefilled `research_topic`. Keep the flow lightweight and do not assume propagation, branch logic, or transition gates.",
        harness: "opencode",
        agentKey: "Atlas (Plan Executor)",
        modelJson: { provider: "opencode", model: "kimi-2.5" },
        completionRequirementsJson: [
          { contextFactDefinitionId: contextFactId.setup.projectOverviewArtifact },
          { contextFactDefinitionId: contextFactId.setup.brainstormingDraftSpec },
          { contextFactDefinitionId: contextFactId.setup.researchDraftSpec },
        ],
        sessionStart: "explicit",
        continuationMode: "bootstrap_only",
        liveStreamCount: 1,
        nativeMessageLog: false,
        persistedWritePolicy: "applied_only",
      },
    ],
    methodologyWorkflowAgentStepExplicitReadGrants: [
      {
        agentStepId: stepId.setup.synthesize,
        contextFactDefinitionId: contextFactId.setup.projectKind,
      },
      {
        agentStepId: stepId.setup.synthesize,
        contextFactDefinitionId: contextFactId.setup.initiativeName,
      },
      {
        agentStepId: stepId.setup.synthesize,
        contextFactDefinitionId: contextFactId.setup.workflowMode,
      },
      {
        agentStepId: stepId.setup.synthesize,
        contextFactDefinitionId: contextFactId.setup.projectKnowledgeDirectory,
      },
      {
        agentStepId: stepId.setup.synthesize,
        contextFactDefinitionId: contextFactId.setup.planningArtifactsDirectory,
      },
      {
        agentStepId: stepId.setup.synthesize,
        contextFactDefinitionId: contextFactId.setup.communicationLanguage,
      },
      {
        agentStepId: stepId.setup.synthesize,
        contextFactDefinitionId: contextFactId.setup.documentOutputLanguage,
      },
    ],
    methodologyWorkflowAgentStepWriteItems: [
      {
        id: writeItemId.projectOverviewArtifact,
        agentStepId: stepId.setup.synthesize,
        writeItemId: "cf_project_overview_artifact",
        contextFactDefinitionId: contextFactId.setup.projectOverviewArtifact,
        contextFactKind: "artifact_reference_fact",
        label: "Project Overview Artifact",
        sortOrder: 100,
      },
      {
        id: writeItemId.requiresBrainstorming,
        agentStepId: stepId.setup.synthesize,
        writeItemId: "cf_setup_requires_brainstorming",
        contextFactDefinitionId: contextFactId.setup.requiresBrainstorming,
        contextFactKind: "definition_backed_external_fact",
        label: "Requires Brainstorming",
        sortOrder: 200,
      },
      {
        id: writeItemId.requiresResearch,
        agentStepId: stepId.setup.synthesize,
        writeItemId: "cf_setup_requires_research",
        contextFactDefinitionId: contextFactId.setup.requiresResearch,
        contextFactKind: "definition_backed_external_fact",
        label: "Requires Research",
        sortOrder: 300,
      },
      {
        id: writeItemId.brainstormingDraftSpec,
        agentStepId: stepId.setup.synthesize,
        writeItemId: "cf_setup_brainstorming_draft_spec",
        contextFactDefinitionId: contextFactId.setup.brainstormingDraftSpec,
        contextFactKind: "work_unit_draft_spec_fact",
        label: "Brainstorming Draft Spec",
        sortOrder: 400,
      },
      {
        id: writeItemId.researchDraftSpec,
        agentStepId: stepId.setup.synthesize,
        writeItemId: "cf_setup_research_draft_spec",
        contextFactDefinitionId: contextFactId.setup.researchDraftSpec,
        contextFactKind: "work_unit_draft_spec_fact",
        label: "Research Draft Spec",
        sortOrder: 500,
      },
    ],
    methodologyWorkflowAgentStepWriteItemRequirements: [
      {
        writeItemRowId: writeItemId.projectOverviewArtifact,
        contextFactDefinitionId: contextFactId.setup.projectKind,
      },
      {
        writeItemRowId: writeItemId.requiresBrainstorming,
        contextFactDefinitionId: contextFactId.setup.projectKind,
      },
      {
        writeItemRowId: writeItemId.requiresResearch,
        contextFactDefinitionId: contextFactId.setup.projectKind,
      },
      {
        writeItemRowId: writeItemId.brainstormingDraftSpec,
        contextFactDefinitionId: contextFactId.setup.projectKind,
      },
      {
        writeItemRowId: writeItemId.researchDraftSpec,
        contextFactDefinitionId: contextFactId.setup.projectKind,
      },
    ],
    methodologyWorkflowInvokeSteps: [
      {
        stepId: stepId.setup.invokeBrainstorming,
        targetKind: "work_unit",
        sourceMode: "fixed_set",
        workflowDefinitionIds: null,
        workUnitDefinitionId: workUnitTypeId.brainstorming,
        contextFactDefinitionId: null,
        configJson: {
          descriptionJson: {
            markdown: "Create one deterministic downstream brainstorming work unit.",
          },
        },
      },
      {
        stepId: stepId.setup.invokeResearch,
        targetKind: "work_unit",
        sourceMode: "context_fact_backed",
        workflowDefinitionIds: null,
        workUnitDefinitionId: null,
        contextFactDefinitionId: contextFactId.setup.researchDraftSpec,
        configJson: {
          descriptionJson: {
            markdown: "Create downstream research work units from the setup-authored draft spec.",
          },
        },
      },
      {
        stepId: stepId.brainstormingPrimary.invokeSupportFixed,
        targetKind: "workflow",
        sourceMode: "fixed_set",
        workflowDefinitionIds: [workflowId.brainstormingSupport],
        workUnitDefinitionId: null,
        contextFactDefinitionId: null,
        configJson: {
          descriptionJson: {
            markdown: "Invoke the deterministic support workflow through the fixed-set path.",
          },
        },
      },
      {
        stepId: stepId.brainstormingPrimary.invokeSupportFromRefs,
        targetKind: "workflow",
        sourceMode: "context_fact_backed",
        workflowDefinitionIds: null,
        workUnitDefinitionId: null,
        contextFactDefinitionId: contextFactId.brainstormingPrimary.supportWorkflows,
        configJson: {
          descriptionJson: {
            markdown: "Invoke support workflows from the seeded workflow-reference context fact.",
          },
        },
      },
    ],
    methodologyWorkflowInvokeBindings: [
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:invoke-binding:brainstorming:setup-work-unit`,
        invokeStepId: stepId.setup.invokeBrainstorming,
        destinationKind: "work_unit_fact",
        destinationKey: "setup_work_unit",
        workUnitFactDefinitionId: workUnitFactId.brainstorming.setupWorkUnit,
        artifactSlotDefinitionId: null,
        sourceKind: "runtime",
        contextFactDefinitionId: null,
        literalValueJson: null,
        sortOrder: 0,
      },
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:invoke-binding:brainstorming:desired-outcome`,
        invokeStepId: stepId.setup.invokeBrainstorming,
        destinationKind: "work_unit_fact",
        destinationKey: "desired_outcome",
        workUnitFactDefinitionId: workUnitFactId.brainstorming.desiredOutcome,
        artifactSlotDefinitionId: null,
        sourceKind: "literal",
        contextFactDefinitionId: null,
        literalValueJson:
          "Confirm the seeded brainstorm direction and keep the invoke path moving.",
        sortOrder: 1,
      },
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:invoke-binding:brainstorming:selected-direction`,
        invokeStepId: stepId.setup.invokeBrainstorming,
        destinationKind: "work_unit_fact",
        destinationKey: "selected_direction",
        workUnitFactDefinitionId: workUnitFactId.brainstorming.selectedDirection,
        artifactSlotDefinitionId: null,
        sourceKind: "literal",
        contextFactDefinitionId: null,
        literalValueJson: "Pursue the lightweight invoke-only validation direction.",
        sortOrder: 2,
      },
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:invoke-binding:research:setup-work-unit`,
        invokeStepId: stepId.setup.invokeResearch,
        destinationKind: "work_unit_fact",
        destinationKey: "setup_work_unit",
        workUnitFactDefinitionId: workUnitFactId.research.setupWorkUnit,
        artifactSlotDefinitionId: null,
        sourceKind: "runtime",
        contextFactDefinitionId: null,
        literalValueJson: null,
        sortOrder: 0,
      },
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:invoke-binding:research:research-topic`,
        invokeStepId: stepId.setup.invokeResearch,
        destinationKind: "work_unit_fact",
        destinationKey: "research_topic",
        workUnitFactDefinitionId: workUnitFactId.research.researchTopic,
        artifactSlotDefinitionId: null,
        sourceKind: "context_fact",
        contextFactDefinitionId: contextFactId.setup.researchDraftSpec,
        literalValueJson: null,
        sortOrder: 1,
      },
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:invoke-binding:research:research-report`,
        invokeStepId: stepId.setup.invokeResearch,
        destinationKind: "artifact_slot",
        destinationKey: "research_report",
        workUnitFactDefinitionId: null,
        artifactSlotDefinitionId: artifactSlotId.researchReport,
        sourceKind: "context_fact",
        contextFactDefinitionId: contextFactId.setup.researchDraftSpec,
        literalValueJson: null,
        sortOrder: 2,
      },
    ],
    methodologyWorkflowInvokeTransitions: [
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:invoke-transition:brainstorming`,
        invokeStepId: stepId.setup.invokeBrainstorming,
        transitionId: `seed:transition:brainstorming:activation-to-done:${methodologyVersionId}`,
        workflowDefinitionIds: [workflowId.brainstormingPrimary],
        sortOrder: 0,
      },
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:invoke-transition:research`,
        invokeStepId: stepId.setup.invokeResearch,
        transitionId: `seed:transition:research:activation-to-done:${methodologyVersionId}`,
        workflowDefinitionIds: [workflowId.researchPrimary],
        sortOrder: 0,
      },
    ],
  } as const;
}

export const setupInvokePhase1FixtureSeedRows = buildSetupInvokePhase1FixtureSeedRows(
  methodologyVersionIds.active,
);

export const setupInvokePhase1FixtureSeedRowsAllVersions = [
  buildSetupInvokePhase1FixtureSeedRows(methodologyVersionIds.draft),
  buildSetupInvokePhase1FixtureSeedRows(methodologyVersionIds.active),
] as const;
