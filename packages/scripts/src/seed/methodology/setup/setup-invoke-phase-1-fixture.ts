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
export type MethodologyWorkflowActionStepSeedRow =
  typeof schema.methodologyWorkflowActionSteps.$inferInsert;
export type MethodologyWorkflowActionStepActionSeedRow =
  typeof schema.methodologyWorkflowActionStepActions.$inferInsert;
export type MethodologyWorkflowActionStepActionItemSeedRow =
  typeof schema.methodologyWorkflowActionStepActionItems.$inferInsert;
export type MethodologyWorkflowInvokeStepSeedRow =
  typeof schema.methodologyWorkflowInvokeSteps.$inferInsert;
export type MethodologyWorkflowInvokeBindingSeedRow =
  typeof schema.methodologyWorkflowInvokeBindings.$inferInsert;
export type MethodologyWorkflowInvokeTransitionSeedRow =
  typeof schema.methodologyWorkflowInvokeTransitions.$inferInsert;
export type MethodologyWorkflowBranchStepSeedRow =
  typeof schema.methodologyWorkflowBranchSteps.$inferInsert;
export type MethodologyWorkflowBranchRouteSeedRow =
  typeof schema.methodologyWorkflowBranchRoutes.$inferInsert;
export type MethodologyWorkflowBranchRouteGroupSeedRow =
  typeof schema.methodologyWorkflowBranchRouteGroups.$inferInsert;
export type MethodologyWorkflowBranchRouteConditionSeedRow =
  typeof schema.methodologyWorkflowBranchRouteConditions.$inferInsert;

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
  readonly methodologyWorkflowActionSteps: readonly MethodologyWorkflowActionStepSeedRow[];
  readonly methodologyWorkflowActionStepActions: readonly MethodologyWorkflowActionStepActionSeedRow[];
  readonly methodologyWorkflowActionStepActionItems: readonly MethodologyWorkflowActionStepActionItemSeedRow[];
  readonly methodologyWorkflowInvokeSteps: readonly MethodologyWorkflowInvokeStepSeedRow[];
  readonly methodologyWorkflowInvokeBindings: readonly MethodologyWorkflowInvokeBindingSeedRow[];
  readonly methodologyWorkflowInvokeTransitions: readonly MethodologyWorkflowInvokeTransitionSeedRow[];
  readonly methodologyWorkflowBranchSteps: readonly MethodologyWorkflowBranchStepSeedRow[];
  readonly methodologyWorkflowBranchRoutes: readonly MethodologyWorkflowBranchRouteSeedRow[];
  readonly methodologyWorkflowBranchRouteGroups: readonly MethodologyWorkflowBranchRouteGroupSeedRow[];
  readonly methodologyWorkflowBranchRouteConditions: readonly MethodologyWorkflowBranchRouteConditionSeedRow[];
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
      propagate: `seed:l3-setup-invoke:setup:${methodologyVersionId}:step:propagate-setup-context`,
      route: `seed:l3-setup-invoke:setup:${methodologyVersionId}:step:route-setup-followups`,
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
      branchNote: `seed:l3-setup-invoke:setup:${methodologyVersionId}:ctx:cf-setup-branch-note`,
      followupWorkflows: `seed:l3-setup-invoke:setup:${methodologyVersionId}:ctx:cf-setup-followup-workflows`,
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
    branchNote: `seed:l3-setup-invoke:setup:${methodologyVersionId}:write-item:branch-note`,
    followupWorkflows: `seed:l3-setup-invoke:setup:${methodologyVersionId}:write-item:followup-workflows`,
  } as const;

  const actionId = {
    setup: {
      decisionFacts: `seed:l3-setup-invoke:setup:${methodologyVersionId}:action:decision-facts`,
      environmentBindings: `seed:l3-setup-invoke:setup:${methodologyVersionId}:action:environment-bindings`,
      projectOverviewArtifact: `seed:l3-setup-invoke:setup:${methodologyVersionId}:action:project-overview-artifact`,
    },
  } as const;

  const actionRowId = {
    setup: {
      decisionFacts: `seed:l3-setup-invoke:setup:${methodologyVersionId}:action-row:decision-facts`,
      environmentBindings: `seed:l3-setup-invoke:setup:${methodologyVersionId}:action-row:environment-bindings`,
      projectOverviewArtifact: `seed:l3-setup-invoke:setup:${methodologyVersionId}:action-row:project-overview-artifact`,
    },
  } as const;

  const branchRouteId = {
    setup: {
      brainstormingThenResearch: "branch_to_brainstorming_then_research",
      researchOnly: "branch_to_research_only",
    },
  } as const;

  const branchRouteRowId = {
    setup: {
      brainstormingThenResearch: `seed:l3-setup-invoke:setup:${methodologyVersionId}:branch-route:brainstorming-then-research`,
      researchOnly: `seed:l3-setup-invoke:setup:${methodologyVersionId}:branch-route:research-only`,
    },
  } as const;

  const branchGroupId = {
    setup: {
      brainstormingDecisions: `seed:l3-setup-invoke:setup:${methodologyVersionId}:branch-group:brainstorming-decisions`,
      brainstormingSignals: `seed:l3-setup-invoke:setup:${methodologyVersionId}:branch-group:brainstorming-signals`,
      researchOnlyDecisions: `seed:l3-setup-invoke:setup:${methodologyVersionId}:branch-group:research-only-decisions`,
      researchOnlyNote: `seed:l3-setup-invoke:setup:${methodologyVersionId}:branch-group:research-only-note`,
    },
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
        id: contextFactId.setup.branchNote,
        workflowId: workflowId.setup,
        factKey: "cf_setup_branch_note",
        factKind: "definition_backed_external_fact",
        label: "Setup Branch Note",
        descriptionJson: {
          markdown:
            "Lightweight routing note authored by the setup synthesis agent for the seeded branch step.",
        },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "Write a short branch note describing whether the setup flow should go to brainstorming first or straight to research.",
        ),
      },
      {
        id: contextFactId.setup.followupWorkflows,
        workflowId: workflowId.setup,
        factKey: "cf_setup_followup_workflows",
        factKind: "workflow_reference_fact",
        label: "Setup Follow-up Workflows",
        descriptionJson: {
          markdown:
            "Workflow references surfaced by the setup synthesis agent so follow-up routing stays explicit.",
        },
        cardinality: "many",
        guidanceJson: guidanceJson(
          "Write the follow-up workflow references that the seeded branch step should treat as eligible next moves.",
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
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:binding:cf-setup-branch-note`,
        contextFactDefinitionId: contextFactId.setup.branchNote,
        provider: "definition_backed_external_fact",
        bindingKey: "branch_note",
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
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:workflow-ref:brainstorming-primary`,
        contextFactDefinitionId: contextFactId.setup.followupWorkflows,
        workflowDefinitionId: workflowId.brainstormingPrimary,
      },
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:workflow-ref:research-primary`,
        contextFactDefinitionId: contextFactId.setup.followupWorkflows,
        workflowDefinitionId: workflowId.researchPrimary,
      },
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
        id: stepId.setup.propagate,
        methodologyVersionId,
        workflowId: workflowId.setup,
        key: "propagate_setup_context",
        type: "action",
        displayName: "Propagate Setup Context",
        configJson: null,
        guidanceJson: guidanceJson(
          "Propagate the locked setup decision, environment, and artifact context before follow-up routing.",
        ),
      },
      {
        id: stepId.setup.route,
        methodologyVersionId,
        workflowId: workflowId.setup,
        key: "route_setup_followups",
        type: "branch",
        displayName: "Route Setup Follow-ups",
        configJson: null,
        guidanceJson: guidanceJson(
          "Route to brainstorming-first or research-only follow-up workflows using the seeded setup signals.",
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
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:edge:synthesize-to-propagate`,
        methodologyVersionId,
        workflowId: workflowId.setup,
        fromStepId: stepId.setup.synthesize,
        toStepId: stepId.setup.propagate,
        edgeKey: "synthesize_setup_for_invoke_to_propagate_setup_context",
        descriptionJson: {
          markdown: "Proceed from synthesis to the locked setup-context propagation step.",
        },
      },
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:edge:propagate-to-route`,
        methodologyVersionId,
        workflowId: workflowId.setup,
        fromStepId: stepId.setup.propagate,
        toStepId: stepId.setup.route,
        edgeKey: "propagate_setup_context_to_route_setup_followups",
        descriptionJson: {
          markdown: "Proceed from propagation to the seeded follow-up branch step.",
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
          "Write the minimum setup-owned outputs needed by the phase-1 invoke runtime seed: a project overview artifact reference, both setup follow-up booleans, a branch note, follow-up workflow references, at least one brainstorming draft spec, and at least one research draft spec.",
        instructionsMarkdown:
          "Create a lightweight PROJECT_OVERVIEW artifact reference in `cf_project_overview_artifact`. Write `cf_setup_requires_brainstorming`, `cf_setup_requires_research`, `cf_setup_branch_note`, and the explicit workflow references in `cf_setup_followup_workflows`. Author at least one brainstorming draft-spec item in `cf_setup_brainstorming_draft_spec` with prefilled `desired_outcome` and `selected_direction`. Author at least one research draft-spec item in `cf_setup_research_draft_spec` with a prefilled `research_topic`. Keep the flow lightweight and do not assume richer Plan-B-only payloads.",
        harness: "opencode",
        agentKey: "Atlas (Plan Executor)",
        modelJson: { provider: "opencode", model: "kimi-2.5" },
        completionRequirementsJson: [
          { contextFactDefinitionId: contextFactId.setup.projectOverviewArtifact },
          { contextFactDefinitionId: contextFactId.setup.branchNote },
          { contextFactDefinitionId: contextFactId.setup.followupWorkflows },
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
        id: writeItemId.branchNote,
        agentStepId: stepId.setup.synthesize,
        writeItemId: "cf_setup_branch_note",
        contextFactDefinitionId: contextFactId.setup.branchNote,
        contextFactKind: "definition_backed_external_fact",
        label: "Setup Branch Note",
        sortOrder: 350,
      },
      {
        id: writeItemId.followupWorkflows,
        agentStepId: stepId.setup.synthesize,
        writeItemId: "cf_setup_followup_workflows",
        contextFactDefinitionId: contextFactId.setup.followupWorkflows,
        contextFactKind: "workflow_reference_fact",
        label: "Setup Follow-up Workflows",
        sortOrder: 375,
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
        writeItemRowId: writeItemId.branchNote,
        contextFactDefinitionId: contextFactId.setup.projectKind,
      },
      {
        writeItemRowId: writeItemId.followupWorkflows,
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
    methodologyWorkflowActionSteps: [
      {
        stepId: stepId.setup.propagate,
        executionMode: "sequential",
      },
    ],
    methodologyWorkflowActionStepActions: [
      {
        id: actionRowId.setup.decisionFacts,
        actionStepId: stepId.setup.propagate,
        actionId: actionId.setup.decisionFacts,
        actionKey: "propagate_setup_decision_facts",
        label: "Propagate Setup Decision Facts",
        enabled: true,
        sortOrder: 10,
        actionKind: "propagation",
        contextFactDefinitionId: contextFactId.setup.requiresBrainstorming,
        contextFactKind: "definition_backed_external_fact",
      },
      {
        id: actionRowId.setup.environmentBindings,
        actionStepId: stepId.setup.propagate,
        actionId: actionId.setup.environmentBindings,
        actionKey: "propagate_setup_environment_bindings",
        label: "Propagate Setup Environment Bindings",
        enabled: true,
        sortOrder: 20,
        actionKind: "propagation",
        contextFactDefinitionId: contextFactId.setup.projectKnowledgeDirectory,
        contextFactKind: "bound_external_fact",
      },
      {
        id: actionRowId.setup.projectOverviewArtifact,
        actionStepId: stepId.setup.propagate,
        actionId: actionId.setup.projectOverviewArtifact,
        actionKey: "propagate_project_overview_artifact_reference",
        label: "Propagate Project Overview Artifact Reference",
        enabled: true,
        sortOrder: 30,
        actionKind: "propagation",
        contextFactDefinitionId: contextFactId.setup.projectOverviewArtifact,
        contextFactKind: "artifact_reference_fact",
      },
    ],
    methodologyWorkflowActionStepActionItems: [
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:action-item:requires-brainstorming`,
        actionRowId: actionRowId.setup.decisionFacts,
        itemId: `seed:l3-setup-invoke:setup:${methodologyVersionId}:action-item-id:requires-brainstorming`,
        itemKey: "setup_decision.requires_brainstorming",
        label: "Requires Brainstorming",
        sortOrder: 10,
      },
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:action-item:requires-research`,
        actionRowId: actionRowId.setup.decisionFacts,
        itemId: `seed:l3-setup-invoke:setup:${methodologyVersionId}:action-item-id:requires-research`,
        itemKey: "setup_decision.requires_research",
        label: "Requires Research",
        sortOrder: 20,
        targetContextFactDefinitionId: contextFactId.setup.requiresResearch,
      },
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:action-item:branch-note`,
        actionRowId: actionRowId.setup.decisionFacts,
        itemId: `seed:l3-setup-invoke:setup:${methodologyVersionId}:action-item-id:branch-note`,
        itemKey: "setup_decision.branch_note",
        label: "Setup Branch Note",
        sortOrder: 30,
        targetContextFactDefinitionId: contextFactId.setup.branchNote,
      },
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:action-item:project-knowledge-directory`,
        actionRowId: actionRowId.setup.environmentBindings,
        itemId: `seed:l3-setup-invoke:setup:${methodologyVersionId}:action-item-id:project-knowledge-directory`,
        itemKey: "setup_environment.project_knowledge_directory",
        label: "Project Knowledge Directory",
        sortOrder: 10,
      },
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:action-item:planning-artifacts-directory`,
        actionRowId: actionRowId.setup.environmentBindings,
        itemId: `seed:l3-setup-invoke:setup:${methodologyVersionId}:action-item-id:planning-artifacts-directory`,
        itemKey: "setup_environment.planning_artifacts_directory",
        label: "Planning Artifacts Directory",
        sortOrder: 20,
      },
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:action-item:communication-language`,
        actionRowId: actionRowId.setup.environmentBindings,
        itemId: `seed:l3-setup-invoke:setup:${methodologyVersionId}:action-item-id:communication-language`,
        itemKey: "setup_environment.communication_language",
        label: "Communication Language",
        sortOrder: 30,
      },
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:action-item:document-output-language`,
        actionRowId: actionRowId.setup.environmentBindings,
        itemId: `seed:l3-setup-invoke:setup:${methodologyVersionId}:action-item-id:document-output-language`,
        itemKey: "setup_environment.document_output_language",
        label: "Document Output Language",
        sortOrder: 40,
      },
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:action-item:followup-workflows`,
        actionRowId: actionRowId.setup.environmentBindings,
        itemId: `seed:l3-setup-invoke:setup:${methodologyVersionId}:action-item-id:followup-workflows`,
        itemKey: "setup_environment.followup_workflows",
        label: "Setup Follow-up Workflows",
        sortOrder: 50,
      },
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:action-item:project-overview-artifact`,
        actionRowId: actionRowId.setup.projectOverviewArtifact,
        itemId: `seed:l3-setup-invoke:setup:${methodologyVersionId}:action-item-id:project-overview-artifact`,
        itemKey: "setup_artifact.project_overview",
        label: "Project Overview Artifact",
        sortOrder: 10,
      },
    ],
    methodologyWorkflowBranchSteps: [
      {
        stepId: stepId.setup.route,
        defaultTargetStepId: null,
        configJson: null,
      },
    ],
    methodologyWorkflowBranchRoutes: [
      {
        id: branchRouteRowId.setup.brainstormingThenResearch,
        branchStepId: stepId.setup.route,
        routeId: branchRouteId.setup.brainstormingThenResearch,
        targetStepId: stepId.setup.invokeBrainstorming,
        conditionMode: "all",
        sortOrder: 10,
      },
      {
        id: branchRouteRowId.setup.researchOnly,
        branchStepId: stepId.setup.route,
        routeId: branchRouteId.setup.researchOnly,
        targetStepId: stepId.setup.invokeResearch,
        conditionMode: "any",
        sortOrder: 20,
      },
    ],
    methodologyWorkflowBranchRouteGroups: [
      {
        id: branchGroupId.setup.brainstormingDecisions,
        routeId: branchRouteRowId.setup.brainstormingThenResearch,
        groupId: "brainstorming_then_research_decisions",
        mode: "all",
        sortOrder: 10,
      },
      {
        id: branchGroupId.setup.brainstormingSignals,
        routeId: branchRouteRowId.setup.brainstormingThenResearch,
        groupId: "brainstorming_then_research_signals",
        mode: "any",
        sortOrder: 20,
      },
      {
        id: branchGroupId.setup.researchOnlyDecisions,
        routeId: branchRouteRowId.setup.researchOnly,
        groupId: "research_only_decisions",
        mode: "all",
        sortOrder: 10,
      },
      {
        id: branchGroupId.setup.researchOnlyNote,
        routeId: branchRouteRowId.setup.researchOnly,
        groupId: "research_only_note",
        mode: "all",
        sortOrder: 20,
      },
    ],
    methodologyWorkflowBranchRouteConditions: [
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:branch-condition:brainstorming-required`,
        groupId: branchGroupId.setup.brainstormingDecisions,
        conditionId: "brainstorming_required",
        contextFactDefinitionId: contextFactId.setup.requiresBrainstorming,
        subFieldKey: null,
        operator: "equals",
        isNegated: false,
        comparisonJson: { value: true },
        sortOrder: 10,
      },
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:branch-condition:research-required`,
        groupId: branchGroupId.setup.brainstormingDecisions,
        conditionId: "research_required",
        contextFactDefinitionId: contextFactId.setup.requiresResearch,
        subFieldKey: null,
        operator: "equals",
        isNegated: false,
        comparisonJson: { value: true },
        sortOrder: 20,
      },
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:branch-condition:followup-workflows-exist`,
        groupId: branchGroupId.setup.brainstormingSignals,
        conditionId: "followup_workflows_exist",
        contextFactDefinitionId: contextFactId.setup.followupWorkflows,
        subFieldKey: null,
        operator: "exists",
        isNegated: false,
        comparisonJson: null,
        sortOrder: 10,
      },
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:branch-condition:branch-note-brainstorming`,
        groupId: branchGroupId.setup.brainstormingSignals,
        conditionId: "branch_note_brainstorming_then_research",
        contextFactDefinitionId: contextFactId.setup.branchNote,
        subFieldKey: "value",
        operator: "equals",
        isNegated: false,
        comparisonJson: { value: "brainstorm_then_research" },
        sortOrder: 20,
      },
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:branch-condition:research-required-only`,
        groupId: branchGroupId.setup.researchOnlyDecisions,
        conditionId: "research_required_only",
        contextFactDefinitionId: contextFactId.setup.requiresResearch,
        subFieldKey: null,
        operator: "equals",
        isNegated: false,
        comparisonJson: { value: true },
        sortOrder: 10,
      },
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:branch-condition:brainstorming-not-required`,
        groupId: branchGroupId.setup.researchOnlyDecisions,
        conditionId: "brainstorming_not_required",
        contextFactDefinitionId: contextFactId.setup.requiresBrainstorming,
        subFieldKey: null,
        operator: "equals",
        isNegated: true,
        comparisonJson: { value: true },
        sortOrder: 20,
      },
      {
        id: `seed:l3-setup-invoke:setup:${methodologyVersionId}:branch-condition:branch-note-research`,
        groupId: branchGroupId.setup.researchOnlyNote,
        conditionId: "branch_note_research_only",
        contextFactDefinitionId: contextFactId.setup.branchNote,
        subFieldKey: "value",
        operator: "equals",
        isNegated: false,
        comparisonJson: { value: "research_only" },
        sortOrder: 10,
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
