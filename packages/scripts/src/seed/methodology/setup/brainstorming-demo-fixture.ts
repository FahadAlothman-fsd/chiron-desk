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

export type BrainstormingDemoFixtureSeedRows = {
  readonly methodologyVersionId: string;
  readonly workflowId: string;
  readonly workflowMetadataPatch: {
    readonly workflowId: string;
    readonly metadataJson: { readonly entryStepId: string };
  };
  readonly methodologyWorkflowContextFactDefinitions: readonly MethodologyWorkflowContextFactDefinitionSeedRow[];
  readonly methodologyWorkflowContextFactPlainValues: readonly MethodologyWorkflowContextFactPlainValueSeedRow[];
  readonly methodologyWorkflowContextFactExternalBindings: readonly MethodologyWorkflowContextFactExternalBindingSeedRow[];
  readonly methodologyWorkflowContextFactWorkflowReferences: readonly MethodologyWorkflowContextFactWorkflowReferenceSeedRow[];
  readonly methodologyWorkflowContextFactArtifactReferences: readonly MethodologyWorkflowContextFactArtifactReferenceSeedRow[];
  readonly methodologyWorkflowContextFactDraftSpecs: readonly MethodologyWorkflowContextFactDraftSpecSeedRow[];
  readonly methodologyWorkflowContextFactDraftSpecSelections: readonly MethodologyWorkflowContextFactDraftSpecSelectionSeedRow[];
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

function allowedValues(values: readonly string[]) {
  return { kind: "allowed-values", values: [...values] };
}

function buildBrainstormingDemoFixtureSeedRows(
  methodologyVersionId: string,
): BrainstormingDemoFixtureSeedRows {
  const baseId = `seed:l3-brainstorming:primary:${methodologyVersionId}`;
  const workflowId = `seed:workflow:brainstorming:brainstorming:${methodologyVersionId}`;
  const formStepId = `${baseId}:step:session-setup`;
  const agentStepId = `${baseId}:step:facilitate-session`;
  const invokeWorkflowStepId = `${baseId}:step:invoke-techniques`;
  const invokeResearchStepId = `${baseId}:step:create-research-work-units`;
  const contextFactId = (suffix: string) => `${baseId}:ctx:${suffix}`;

  const methodologyFactId = (suffix: string) => `seed:fact-def:${suffix}:${methodologyVersionId}`;
  const brainstormingFactId = (suffix: string) =>
    `seed:work-unit-fact:brainstorming:${suffix}:${methodologyVersionId}`;
  const setupFactId = (suffix: string) => `seed:work-unit-fact:${suffix}:${methodologyVersionId}`;
  const researchFactId = (suffix: string) =>
    `seed:work-unit-fact:research:${suffix}:${methodologyVersionId}`;
  const researchWorkflowId = (suffix: string) =>
    `seed:workflow:research:${suffix}:${methodologyVersionId}`;

  const workflowReferenceSingleId = contextFactId("reference-workflow-single");
  const workflowReferenceManyId = contextFactId("reference-workflow-many");
  const artifactReferenceId = contextFactId("brainstorming-session-artifact");
  const draftSpecMinimalId = contextFactId("research-draft-spec-minimal");
  const draftSpecWithArtifactsId = contextFactId("research-draft-spec-with-artifacts");

  return {
    methodologyVersionId,
    workflowId,
    workflowMetadataPatch: {
      workflowId,
      metadataJson: {
        entryStepId: formStepId,
      },
    },
    methodologyWorkflowContextFactDefinitions: [
      {
        id: contextFactId("plain-string"),
        workflowId,
        factKey: "brainstorming_topic",
        factKind: "plain_fact",
        label: "Brainstorming Topic",
        descriptionJson: { markdown: "Primary brainstorming topic or challenge." },
        cardinality: "one",
        guidanceJson: guidanceJson("Capture the topic that the session should explore."),
      },
      {
        id: contextFactId("plain-string-allowed-values"),
        workflowId,
        factKey: "brainstorming_mode",
        factKind: "plain_fact",
        label: "Brainstorming Mode",
        descriptionJson: { markdown: "High-level facilitation mode for the session." },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "Use this to test allowed-values conditions on local workflow context.",
        ),
      },
      {
        id: contextFactId("plain-string-path-file"),
        workflowId,
        factKey: "brainstorming_notes_file",
        factKind: "plain_fact",
        label: "Brainstorming Notes File",
        descriptionJson: { markdown: "Path to a working notes file for the session." },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "Use this to test file path validations on plain workflow facts.",
        ),
      },
      {
        id: contextFactId("plain-string-path-directory"),
        workflowId,
        factKey: "brainstorming_workspace_dir",
        factKind: "plain_fact",
        label: "Brainstorming Workspace Directory",
        descriptionJson: {
          markdown: "Directory used for brainstorming scratch work and artifacts.",
        },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "Use this to test directory path validations on plain workflow facts.",
        ),
      },
      {
        id: contextFactId("plain-number"),
        workflowId,
        factKey: "brainstorming_effort_score",
        factKind: "plain_fact",
        label: "Brainstorming Effort Score",
        descriptionJson: { markdown: "Numeric effort or intensity score for the session." },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "Use this to test numeric branch conditions on local workflow context.",
        ),
      },
      {
        id: contextFactId("plain-boolean"),
        workflowId,
        factKey: "brainstorming_ready_for_synthesis",
        factKind: "plain_fact",
        label: "Ready For Synthesis",
        descriptionJson: { markdown: "Whether the session is ready to move into synthesis." },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "Use this to test boolean branch conditions on local workflow context.",
        ),
      },
      {
        id: contextFactId("plain-json"),
        workflowId,
        factKey: "brainstorming_summary_json",
        factKind: "plain_fact",
        label: "Brainstorming Summary JSON",
        descriptionJson: { markdown: "Structured summary of the current brainstorming session." },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "Use this to test normalized JSON subfield targeting for local workflow context.",
        ),
      },

      {
        id: contextFactId("defext-method-repository-type"),
        workflowId,
        factKey: "method_repository_type",
        factKind: "bound_fact",
        label: "Methodology Repository Type",
        descriptionJson: { markdown: "Definition-backed external methodology string fact." },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "Uses the methodology repository_type fact for external string coverage.",
        ),
      },
      {
        id: contextFactId("defext-method-project-parts"),
        workflowId,
        factKey: "method_project_parts",
        factKind: "bound_fact",
        label: "Methodology Project Parts",
        descriptionJson: { markdown: "Definition-backed external methodology JSON fact." },
        cardinality: "many",
        guidanceJson: guidanceJson(
          "Uses methodology project_parts for external JSON-many coverage.",
        ),
      },
      {
        id: contextFactId("defext-method-technology-stack"),
        workflowId,
        factKey: "method_technology_stack_by_part",
        factKind: "bound_fact",
        label: "Methodology Technology Stack By Part",
        descriptionJson: { markdown: "Definition-backed external methodology JSON fact." },
        cardinality: "many",
        guidanceJson: guidanceJson(
          "Uses methodology technology_stack_by_part for external JSON-many coverage.",
        ),
      },
      {
        id: contextFactId("defext-method-doc-inventory"),
        workflowId,
        factKey: "method_existing_documentation_inventory",
        factKind: "bound_fact",
        label: "Methodology Existing Documentation Inventory",
        descriptionJson: { markdown: "Definition-backed external methodology JSON fact." },
        cardinality: "many",
        guidanceJson: guidanceJson(
          "Uses methodology existing_documentation_inventory for external JSON subfield coverage.",
        ),
      },
      {
        id: contextFactId("defext-method-integration-points"),
        workflowId,
        factKey: "method_integration_points",
        factKind: "bound_fact",
        label: "Methodology Integration Points",
        descriptionJson: { markdown: "Definition-backed external methodology JSON fact." },
        cardinality: "many",
        guidanceJson: guidanceJson(
          "Uses methodology integration_points for external JSON-many coverage.",
        ),
      },
      {
        id: contextFactId("defext-wu-desired-outcome"),
        workflowId,
        factKey: "wu_desired_outcome",
        factKind: "bound_fact",
        label: "Brainstorming Desired Outcome",
        descriptionJson: { markdown: "Definition-backed external work-unit string fact." },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "Uses brainstorming desired_outcome for work-unit-backed string coverage.",
        ),
      },
      {
        id: contextFactId("defext-wu-project-kind"),
        workflowId,
        factKey: "wu_project_kind",
        factKind: "bound_fact",
        label: "Setup Project Kind",
        descriptionJson: {
          markdown: "Definition-backed external work-unit allowed-values string fact.",
        },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "Uses setup project_kind for work-unit-backed allowed-values coverage.",
        ),
      },
      {
        id: contextFactId("defext-wu-project-knowledge-directory"),
        workflowId,
        factKey: "wu_project_knowledge_directory",
        factKind: "bound_fact",
        label: "Setup Project Knowledge Directory",
        descriptionJson: { markdown: "Definition-backed external work-unit path directory fact." },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "Uses setup project_knowledge_directory for work-unit-backed directory path coverage.",
        ),
      },
      {
        id: contextFactId("defext-wu-session-notes-file"),
        workflowId,
        factKey: "wu_session_notes_file",
        factKind: "bound_fact",
        label: "Brainstorming Session Notes File",
        descriptionJson: { markdown: "Definition-backed external work-unit path file fact." },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "Uses the brainstorming session_notes_file fact for work-unit-backed file path coverage.",
        ),
      },
      {
        id: contextFactId("defext-wu-estimated-research-effort"),
        workflowId,
        factKey: "wu_estimated_research_effort",
        factKind: "bound_fact",
        label: "Estimated Research Effort",
        descriptionJson: { markdown: "Definition-backed external work-unit numeric fact." },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "Uses the brainstorming estimated_research_effort fact for work-unit-backed numeric coverage.",
        ),
      },
      {
        id: contextFactId("defext-wu-constraints"),
        workflowId,
        factKey: "wu_constraints",
        factKind: "bound_fact",
        label: "Brainstorming Constraints",
        descriptionJson: { markdown: "Definition-backed external work-unit JSON fact." },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "Uses brainstorming constraints for work-unit-backed JSON coverage.",
        ),
      },
      {
        id: contextFactId("defext-wu-objectives"),
        workflowId,
        factKey: "wu_objectives",
        factKind: "bound_fact",
        label: "Brainstorming Objectives",
        descriptionJson: { markdown: "Definition-backed external work-unit JSON-many fact." },
        cardinality: "many",
        guidanceJson: guidanceJson(
          "Uses brainstorming objectives for work-unit-backed JSON-many coverage.",
        ),
      },
      {
        id: contextFactId("defext-wu-selected-directions"),
        workflowId,
        factKey: "wu_selected_directions",
        factKind: "bound_fact",
        label: "Brainstorming Selected Directions",
        descriptionJson: { markdown: "Definition-backed external work-unit JSON fact." },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "Uses brainstorming selected_directions for work-unit-backed JSON coverage.",
        ),
      },
      {
        id: contextFactId("defext-wu-work-unit"),
        workflowId,
        factKey: "wu_setup_work_unit",
        factKind: "bound_fact",
        label: "Setup Work Unit Reference",
        descriptionJson: { markdown: "Definition-backed external work-unit reference fact." },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "Uses brainstorming setup_work_unit for work-unit-valued external coverage.",
        ),
      },
      {
        id: contextFactId("defext-wu-requires-brainstorming"),
        workflowId,
        factKey: "wu_requires_brainstorming",
        factKind: "bound_fact",
        label: "Requires Brainstorming",
        descriptionJson: { markdown: "Definition-backed external work-unit boolean fact." },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "Uses setup requires_brainstorming for work-unit-backed boolean coverage.",
        ),
      },

      {
        id: contextFactId("bound-method-repository-type"),
        workflowId,
        factKey: "bound_repository_type",
        factKind: "bound_fact",
        label: "Bound Methodology Repository Type",
        descriptionJson: { markdown: "Bound external methodology string fact." },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "Bound methodology repository_type fact for external string coverage.",
        ),
      },
      {
        id: contextFactId("bound-method-project-parts"),
        workflowId,
        factKey: "bound_project_parts",
        factKind: "bound_fact",
        label: "Bound Methodology Project Parts",
        descriptionJson: { markdown: "Bound external methodology JSON fact." },
        cardinality: "many",
        guidanceJson: guidanceJson(
          "Bound methodology project_parts fact for external JSON-many coverage.",
        ),
      },
      {
        id: contextFactId("bound-method-technology-stack"),
        workflowId,
        factKey: "bound_technology_stack_by_part",
        factKind: "bound_fact",
        label: "Bound Methodology Technology Stack By Part",
        descriptionJson: { markdown: "Bound external methodology JSON fact." },
        cardinality: "many",
        guidanceJson: guidanceJson(
          "Bound methodology technology_stack_by_part fact for external JSON-many coverage.",
        ),
      },
      {
        id: contextFactId("bound-method-doc-inventory"),
        workflowId,
        factKey: "bound_existing_documentation_inventory",
        factKind: "bound_fact",
        label: "Bound Methodology Existing Documentation Inventory",
        descriptionJson: { markdown: "Bound external methodology JSON fact." },
        cardinality: "many",
        guidanceJson: guidanceJson(
          "Bound methodology existing_documentation_inventory fact for JSON subfield coverage.",
        ),
      },
      {
        id: contextFactId("bound-method-integration-points"),
        workflowId,
        factKey: "bound_integration_points",
        factKind: "bound_fact",
        label: "Bound Methodology Integration Points",
        descriptionJson: { markdown: "Bound external methodology JSON fact." },
        cardinality: "many",
        guidanceJson: guidanceJson(
          "Bound methodology integration_points fact for external JSON-many coverage.",
        ),
      },
      {
        id: contextFactId("bound-wu-desired-outcome"),
        workflowId,
        factKey: "bound_wu_desired_outcome",
        factKind: "bound_fact",
        label: "Bound Brainstorming Desired Outcome",
        descriptionJson: { markdown: "Bound external work-unit string fact." },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "Bound brainstorming desired_outcome for work-unit-backed string coverage.",
        ),
      },
      {
        id: contextFactId("bound-wu-project-kind"),
        workflowId,
        factKey: "bound_wu_project_kind",
        factKind: "bound_fact",
        label: "Bound Setup Project Kind",
        descriptionJson: { markdown: "Bound external work-unit allowed-values string fact." },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "Bound setup project_kind for work-unit-backed allowed-values coverage.",
        ),
      },
      {
        id: contextFactId("bound-wu-project-knowledge-directory"),
        workflowId,
        factKey: "bound_wu_project_knowledge_directory",
        factKind: "bound_fact",
        label: "Bound Setup Project Knowledge Directory",
        descriptionJson: { markdown: "Bound external work-unit path directory fact." },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "Bound setup project_knowledge_directory for work-unit-backed directory path coverage.",
        ),
      },
      {
        id: contextFactId("bound-wu-session-notes-file"),
        workflowId,
        factKey: "bound_wu_session_notes_file",
        factKind: "bound_fact",
        label: "Bound Brainstorming Session Notes File",
        descriptionJson: { markdown: "Bound external work-unit path file fact." },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "Bound brainstorming session_notes_file for work-unit-backed file path coverage.",
        ),
      },
      {
        id: contextFactId("bound-wu-estimated-research-effort"),
        workflowId,
        factKey: "bound_wu_estimated_research_effort",
        factKind: "bound_fact",
        label: "Bound Estimated Research Effort",
        descriptionJson: { markdown: "Bound external work-unit numeric fact." },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "Bound brainstorming estimated_research_effort for work-unit-backed numeric coverage.",
        ),
      },
      {
        id: contextFactId("bound-wu-constraints"),
        workflowId,
        factKey: "bound_wu_constraints",
        factKind: "bound_fact",
        label: "Bound Brainstorming Constraints",
        descriptionJson: { markdown: "Bound external work-unit JSON fact." },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "Bound brainstorming constraints for work-unit-backed JSON coverage.",
        ),
      },
      {
        id: contextFactId("bound-wu-objectives"),
        workflowId,
        factKey: "bound_wu_objectives",
        factKind: "bound_fact",
        label: "Bound Brainstorming Objectives",
        descriptionJson: { markdown: "Bound external work-unit JSON-many fact." },
        cardinality: "many",
        guidanceJson: guidanceJson(
          "Bound brainstorming objectives for work-unit-backed JSON-many coverage.",
        ),
      },
      {
        id: contextFactId("bound-wu-selected-directions"),
        workflowId,
        factKey: "bound_wu_selected_directions",
        factKind: "bound_fact",
        label: "Bound Brainstorming Selected Directions",
        descriptionJson: { markdown: "Bound external work-unit JSON fact." },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "Bound brainstorming selected_directions for work-unit-backed JSON coverage.",
        ),
      },
      {
        id: contextFactId("bound-wu-work-units"),
        workflowId,
        factKey: "bound_research_work_units",
        factKind: "bound_fact",
        label: "Bound Research Work Units",
        descriptionJson: {
          markdown: "Bound external work-unit-many fact linked to research work units.",
        },
        cardinality: "many",
        guidanceJson: guidanceJson(
          "Bound brainstorming research_work_units for work-unit-many external coverage.",
        ),
      },
      {
        id: contextFactId("bound-wu-requires-brainstorming"),
        workflowId,
        factKey: "bound_wu_requires_brainstorming",
        factKind: "bound_fact",
        label: "Bound Requires Brainstorming",
        descriptionJson: { markdown: "Bound external work-unit boolean fact." },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "Bound setup requires_brainstorming for work-unit-backed boolean coverage.",
        ),
      },

      {
        id: workflowReferenceSingleId,
        workflowId,
        factKey: "reference_workflow_single",
        factKind: "workflow_ref_fact",
        label: "Reference Workflow Single",
        descriptionJson: { markdown: "Single workflow reference for technique invocation." },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "Use this to test single workflow reference conditions and form selection.",
        ),
      },
      {
        id: workflowReferenceManyId,
        workflowId,
        factKey: "reference_workflow_many",
        factKind: "workflow_ref_fact",
        label: "Reference Workflow Many",
        descriptionJson: {
          markdown: "Many workflow reference set for invoking selected techniques.",
        },
        cardinality: "many",
        guidanceJson: guidanceJson(
          "Use this to test many-valued workflow references and workflow invoke inputs.",
        ),
      },
      {
        id: artifactReferenceId,
        workflowId,
        factKey: "brainstorming_session_artifact_ref",
        factKind: "artifact_slot_reference_fact",
        label: "Brainstorming Session Artifact",
        descriptionJson: { markdown: "Reference to the brainstorming session artifact slot." },
        cardinality: "one",
        guidanceJson: guidanceJson(
          "Use this to test artifact freshness checks and artifact references.",
        ),
      },
      {
        id: draftSpecMinimalId,
        workflowId,
        factKey: "research_draft_spec_minimal",
        factKind: "work_unit_draft_spec_fact",
        label: "Research Draft Spec Minimal",
        descriptionJson: {
          markdown: "Draft-spec context fact for minimal research work-unit creation.",
        },
        cardinality: "many",
        guidanceJson: guidanceJson(
          "Use this to test minimal draft-spec workflow context for work-unit creation.",
        ),
      },
      {
        id: draftSpecWithArtifactsId,
        workflowId,
        factKey: "research_draft_spec_with_artifacts",
        factKind: "work_unit_draft_spec_fact",
        label: "Research Draft Spec With Artifacts",
        descriptionJson: {
          markdown:
            "Draft-spec context fact for research work-unit creation with artifact coverage.",
        },
        cardinality: "many",
        guidanceJson: guidanceJson(
          "Use this to test draft-spec facts plus artifact selections when invoking research work units.",
        ),
      },
    ],
    methodologyWorkflowContextFactPlainValues: [
      {
        id: `${baseId}:plain:topic`,
        contextFactDefinitionId: contextFactId("plain-string"),
        type: "string",
      },
      {
        id: `${baseId}:plain:mode`,
        contextFactDefinitionId: contextFactId("plain-string-allowed-values"),
        type: "string",
        validationJson: allowedValues(["divergent", "convergent", "balanced"]),
      },
      {
        id: `${baseId}:plain:notes-file`,
        contextFactDefinitionId: contextFactId("plain-string-path-file"),
        type: "string",
        validationJson: {
          kind: "path",
          path: {
            pathKind: "file",
            normalization: { trimWhitespace: true },
            safety: { disallowAbsolute: true, preventTraversal: true },
          },
        },
      },
      {
        id: `${baseId}:plain:workspace-dir`,
        contextFactDefinitionId: contextFactId("plain-string-path-directory"),
        type: "string",
        validationJson: {
          kind: "path",
          path: {
            pathKind: "directory",
            normalization: { trimWhitespace: true },
            safety: { disallowAbsolute: true, preventTraversal: true },
          },
        },
      },
      {
        id: `${baseId}:plain:effort-score`,
        contextFactDefinitionId: contextFactId("plain-number"),
        type: "number",
      },
      {
        id: `${baseId}:plain:ready`,
        contextFactDefinitionId: contextFactId("plain-boolean"),
        type: "boolean",
      },
      {
        id: `${baseId}:plain:summary-json`,
        contextFactDefinitionId: contextFactId("plain-json"),
        type: "json",
        validationJson: {
          kind: "json-schema",
          schemaDialect: "draft-2020-12",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              summary: { type: "string", title: "Summary" },
              recommendation: { type: "string", title: "Recommendation" },
              urgency: { type: "number", title: "Urgency" },
              should_research: { type: "boolean", title: "Should Research" },
            },
          },
          subSchema: {
            type: "object",
            fields: [
              { key: "summary", type: "string", cardinality: "one" },
              { key: "recommendation", type: "string", cardinality: "one" },
              { key: "urgency", type: "number", cardinality: "one" },
              { key: "should_research", type: "boolean", cardinality: "one" },
            ],
          },
        },
      },
    ],
    methodologyWorkflowContextFactExternalBindings: [
      {
        id: `${baseId}:external:method-repository-type`,
        contextFactDefinitionId: contextFactId("defext-method-repository-type"),
        provider: "bound_fact",
        bindingKey: methodologyFactId("repository-type"),
      },
      {
        id: `${baseId}:external:method-project-parts`,
        contextFactDefinitionId: contextFactId("defext-method-project-parts"),
        provider: "bound_fact",
        bindingKey: methodologyFactId("project-parts"),
      },
      {
        id: `${baseId}:external:method-tech-stack`,
        contextFactDefinitionId: contextFactId("defext-method-technology-stack"),
        provider: "bound_fact",
        bindingKey: methodologyFactId("technology-stack-by-part"),
      },
      {
        id: `${baseId}:external:method-docs`,
        contextFactDefinitionId: contextFactId("defext-method-doc-inventory"),
        provider: "bound_fact",
        bindingKey: methodologyFactId("existing-documentation-inventory"),
      },
      {
        id: `${baseId}:external:method-integrations`,
        contextFactDefinitionId: contextFactId("defext-method-integration-points"),
        provider: "bound_fact",
        bindingKey: methodologyFactId("integration-points"),
      },
      {
        id: `${baseId}:external:wu-desired-outcome`,
        contextFactDefinitionId: contextFactId("defext-wu-desired-outcome"),
        provider: "bound_fact",
        bindingKey: brainstormingFactId("desired-outcome"),
      },
      {
        id: `${baseId}:external:wu-project-kind`,
        contextFactDefinitionId: contextFactId("defext-wu-project-kind"),
        provider: "bound_fact",
        bindingKey: setupFactId("project-kind"),
      },
      {
        id: `${baseId}:external:wu-project-knowledge-dir`,
        contextFactDefinitionId: contextFactId("defext-wu-project-knowledge-directory"),
        provider: "bound_fact",
        bindingKey: setupFactId("project-knowledge-directory"),
      },
      {
        id: `${baseId}:external:wu-session-notes-file`,
        contextFactDefinitionId: contextFactId("defext-wu-session-notes-file"),
        provider: "bound_fact",
        bindingKey: brainstormingFactId("session-notes-file"),
      },
      {
        id: `${baseId}:external:wu-estimated-research-effort`,
        contextFactDefinitionId: contextFactId("defext-wu-estimated-research-effort"),
        provider: "bound_fact",
        bindingKey: brainstormingFactId("estimated-research-effort"),
      },
      {
        id: `${baseId}:external:wu-constraints`,
        contextFactDefinitionId: contextFactId("defext-wu-constraints"),
        provider: "bound_fact",
        bindingKey: brainstormingFactId("constraints"),
      },
      {
        id: `${baseId}:external:wu-objectives`,
        contextFactDefinitionId: contextFactId("defext-wu-objectives"),
        provider: "bound_fact",
        bindingKey: brainstormingFactId("objectives"),
      },
      {
        id: `${baseId}:external:wu-selected-directions`,
        contextFactDefinitionId: contextFactId("defext-wu-selected-directions"),
        provider: "bound_fact",
        bindingKey: brainstormingFactId("selected-directions"),
      },
      {
        id: `${baseId}:external:wu-work-unit`,
        contextFactDefinitionId: contextFactId("defext-wu-work-unit"),
        provider: "bound_fact",
        bindingKey: brainstormingFactId("setup-work-unit"),
      },
      {
        id: `${baseId}:external:wu-requires-brainstorming`,
        contextFactDefinitionId: contextFactId("defext-wu-requires-brainstorming"),
        provider: "bound_fact",
        bindingKey: setupFactId("requires-brainstorming"),
      },
      {
        id: `${baseId}:external:bound-method-repository-type`,
        contextFactDefinitionId: contextFactId("bound-method-repository-type"),
        provider: "bound_fact",
        bindingKey: methodologyFactId("repository-type"),
      },
      {
        id: `${baseId}:external:bound-method-project-parts`,
        contextFactDefinitionId: contextFactId("bound-method-project-parts"),
        provider: "bound_fact",
        bindingKey: methodologyFactId("project-parts"),
      },
      {
        id: `${baseId}:external:bound-method-tech-stack`,
        contextFactDefinitionId: contextFactId("bound-method-technology-stack"),
        provider: "bound_fact",
        bindingKey: methodologyFactId("technology-stack-by-part"),
      },
      {
        id: `${baseId}:external:bound-method-docs`,
        contextFactDefinitionId: contextFactId("bound-method-doc-inventory"),
        provider: "bound_fact",
        bindingKey: methodologyFactId("existing-documentation-inventory"),
      },
      {
        id: `${baseId}:external:bound-method-integrations`,
        contextFactDefinitionId: contextFactId("bound-method-integration-points"),
        provider: "bound_fact",
        bindingKey: methodologyFactId("integration-points"),
      },
      {
        id: `${baseId}:external:bound-wu-desired-outcome`,
        contextFactDefinitionId: contextFactId("bound-wu-desired-outcome"),
        provider: "bound_fact",
        bindingKey: brainstormingFactId("desired-outcome"),
      },
      {
        id: `${baseId}:external:bound-wu-project-kind`,
        contextFactDefinitionId: contextFactId("bound-wu-project-kind"),
        provider: "bound_fact",
        bindingKey: setupFactId("project-kind"),
      },
      {
        id: `${baseId}:external:bound-wu-project-knowledge-dir`,
        contextFactDefinitionId: contextFactId("bound-wu-project-knowledge-directory"),
        provider: "bound_fact",
        bindingKey: setupFactId("project-knowledge-directory"),
      },
      {
        id: `${baseId}:external:bound-wu-session-notes-file`,
        contextFactDefinitionId: contextFactId("bound-wu-session-notes-file"),
        provider: "bound_fact",
        bindingKey: brainstormingFactId("session-notes-file"),
      },
      {
        id: `${baseId}:external:bound-wu-estimated-research-effort`,
        contextFactDefinitionId: contextFactId("bound-wu-estimated-research-effort"),
        provider: "bound_fact",
        bindingKey: brainstormingFactId("estimated-research-effort"),
      },
      {
        id: `${baseId}:external:bound-wu-constraints`,
        contextFactDefinitionId: contextFactId("bound-wu-constraints"),
        provider: "bound_fact",
        bindingKey: brainstormingFactId("constraints"),
      },
      {
        id: `${baseId}:external:bound-wu-objectives`,
        contextFactDefinitionId: contextFactId("bound-wu-objectives"),
        provider: "bound_fact",
        bindingKey: brainstormingFactId("objectives"),
      },
      {
        id: `${baseId}:external:bound-wu-selected-directions`,
        contextFactDefinitionId: contextFactId("bound-wu-selected-directions"),
        provider: "bound_fact",
        bindingKey: brainstormingFactId("selected-directions"),
      },
      {
        id: `${baseId}:external:bound-wu-work-units`,
        contextFactDefinitionId: contextFactId("bound-wu-work-units"),
        provider: "bound_fact",
        bindingKey: brainstormingFactId("research-work-units"),
      },
      {
        id: `${baseId}:external:bound-wu-requires-brainstorming`,
        contextFactDefinitionId: contextFactId("bound-wu-requires-brainstorming"),
        provider: "bound_fact",
        bindingKey: setupFactId("requires-brainstorming"),
      },
    ],
    methodologyWorkflowContextFactWorkflowReferences: [
      {
        id: `${baseId}:workflow-ref:single`,
        contextFactDefinitionId: workflowReferenceSingleId,
        workflowDefinitionId: `seed:workflow:brainstorming:five-whys-deep-dive:${methodologyVersionId}`,
      },
      {
        id: `${baseId}:workflow-ref:many:five-whys`,
        contextFactDefinitionId: workflowReferenceManyId,
        workflowDefinitionId: `seed:workflow:brainstorming:five-whys-deep-dive:${methodologyVersionId}`,
      },
      {
        id: `${baseId}:workflow-ref:many:first-principles`,
        contextFactDefinitionId: workflowReferenceManyId,
        workflowDefinitionId: `seed:workflow:brainstorming:first-principles-analysis:${methodologyVersionId}`,
      },
      {
        id: `${baseId}:workflow-ref:many:graph-of-thoughts`,
        contextFactDefinitionId: workflowReferenceManyId,
        workflowDefinitionId: `seed:workflow:brainstorming:graph-of-thoughts:${methodologyVersionId}`,
      },
    ],
    methodologyWorkflowContextFactArtifactReferences: [
      {
        id: `${baseId}:artifact-ref:brainstorming-session`,
        contextFactDefinitionId: artifactReferenceId,
        slotDefinitionId: "brainstorming_session",
      },
    ],
    methodologyWorkflowContextFactDraftSpecs: [
      {
        id: `${baseId}:draft-spec:minimal`,
        contextFactDefinitionId: draftSpecMinimalId,
        workUnitDefinitionId: `seed:wut:research:${methodologyVersionId}`,
      },
      {
        id: `${baseId}:draft-spec:with-artifacts`,
        contextFactDefinitionId: draftSpecWithArtifactsId,
        workUnitDefinitionId: `seed:wut:research:${methodologyVersionId}`,
      },
    ],
    methodologyWorkflowContextFactDraftSpecSelections: [
      {
        id: `${baseId}:draft-selection:minimal:setup-work-unit`,
        draftSpecId: `${baseId}:draft-spec:minimal`,
        selectionType: "fact",
        definitionId: researchFactId("setup-work-unit"),
        sortOrder: 0,
      },
      {
        id: `${baseId}:draft-selection:minimal:research-topic`,
        draftSpecId: `${baseId}:draft-spec:minimal`,
        selectionType: "fact",
        definitionId: researchFactId("research-topic"),
        sortOrder: 1,
      },
      {
        id: `${baseId}:draft-selection:full:setup-work-unit`,
        draftSpecId: `${baseId}:draft-spec:with-artifacts`,
        selectionType: "fact",
        definitionId: researchFactId("setup-work-unit"),
        sortOrder: 0,
      },
      {
        id: `${baseId}:draft-selection:full:brainstorming-work-unit`,
        draftSpecId: `${baseId}:draft-spec:with-artifacts`,
        selectionType: "fact",
        definitionId: researchFactId("brainstorming-work-unit"),
        sortOrder: 1,
      },
      {
        id: `${baseId}:draft-selection:full:research-topic`,
        draftSpecId: `${baseId}:draft-spec:with-artifacts`,
        selectionType: "fact",
        definitionId: researchFactId("research-topic"),
        sortOrder: 2,
      },
      {
        id: `${baseId}:draft-selection:full:research-goals`,
        draftSpecId: `${baseId}:draft-spec:with-artifacts`,
        selectionType: "fact",
        definitionId: researchFactId("research-goals"),
        sortOrder: 3,
      },
      {
        id: `${baseId}:draft-selection:full:research-report`,
        draftSpecId: `${baseId}:draft-spec:with-artifacts`,
        selectionType: "artifact",
        definitionId: `seed:artifact-slot:research:research-report:${methodologyVersionId}`,
        sortOrder: 4,
      },
    ],
    methodology_workflow_steps: [
      {
        id: formStepId,
        methodologyVersionId,
        workflowId,
        key: "setup_brainstorming_session",
        type: "form",
        displayName: "Setup Brainstorming Session",
        configJson: null,
        guidanceJson: guidanceJson(
          "Capture the topic, mode, and session setup inputs before facilitation begins.",
          "Use this step to establish the session target, runtime paths, and initial technique reference.",
        ),
      },
      {
        id: agentStepId,
        methodologyVersionId,
        workflowId,
        key: "facilitate_brainstorming_session",
        type: "agent",
        displayName: "Facilitate Brainstorming Session",
        configJson: {
          descriptionJson: {
            markdown:
              "Facilitates brainstorming, captures structured summary output, and prepares downstream research handoff.",
          },
        },
        guidanceJson: guidanceJson(
          "Guide an interactive brainstorming session that explores the topic, honors constraints, and produces a durable summary.",
          "Use the topic, mode, and selected workflow references to facilitate a realistic BMAD-style ideation session and prepare research handoff data.",
        ),
      },
      {
        id: invokeWorkflowStepId,
        methodologyVersionId,
        workflowId,
        key: "invoke_selected_technique_workflows",
        type: "invoke",
        displayName: "Invoke Selected Technique Workflows",
        configJson: null,
        guidanceJson: guidanceJson(
          "Invoke one or more selected support workflows to explore specific brainstorming techniques.",
          "Use the many-valued workflow reference context fact to drive workflow invocations for selected brainstorming techniques.",
        ),
      },
      {
        id: invokeResearchStepId,
        methodologyVersionId,
        workflowId,
        key: "create_research_work_units",
        type: "invoke",
        displayName: "Create Research Work Units",
        configJson: null,
        guidanceJson: guidanceJson(
          "Materialize one or more research work units from the selected brainstorming directions.",
          "Use the research draft-spec context fact to create downstream research work units with the required upstream references and artifact coverage.",
        ),
      },
    ],
    methodology_workflow_edges: [
      {
        id: `${baseId}:edge:form->agent`,
        methodologyVersionId,
        workflowId,
        fromStepId: formStepId,
        toStepId: agentStepId,
        edgeKey: "setup_to_facilitation",
        descriptionJson: {
          markdown: "Begin facilitation after the session setup form is complete.",
        },
      },
      {
        id: `${baseId}:edge:agent->invoke-techniques`,
        methodologyVersionId,
        workflowId,
        fromStepId: agentStepId,
        toStepId: invokeWorkflowStepId,
        edgeKey: "facilitation_to_workflow_invoke",
        descriptionJson: {
          markdown: "Optionally invoke selected support workflows after facilitation.",
        },
      },
      {
        id: `${baseId}:edge:invoke-techniques->invoke-research`,
        methodologyVersionId,
        workflowId,
        fromStepId: invokeWorkflowStepId,
        toStepId: invokeResearchStepId,
        edgeKey: "workflow_invoke_to_research_invoke",
        descriptionJson: {
          markdown: "Create research work units after the technique workflow fan-out is complete.",
        },
      },
    ],
    methodologyWorkflowFormFields: [
      {
        id: `${baseId}:field:topic`,
        formStepId,
        key: "brainstormingTopic",
        label: "Brainstorming Topic",
        valueType: "string",
        required: true,
        inputJson: { contextFactDefinitionId: contextFactId("plain-string") },
        descriptionJson: {
          markdown: "The topic or challenge this brainstorming session should explore.",
        },
        sortOrder: 0,
      },
      {
        id: `${baseId}:field:mode`,
        formStepId,
        key: "brainstormingMode",
        label: "Brainstorming Mode",
        valueType: "string",
        required: true,
        inputJson: { contextFactDefinitionId: contextFactId("plain-string-allowed-values") },
        descriptionJson: {
          markdown: "Select whether the session should stay divergent, converge, or balance both.",
        },
        sortOrder: 1,
      },
      {
        id: `${baseId}:field:notes-file`,
        formStepId,
        key: "sessionNotesFile",
        label: "Session Notes File",
        valueType: "string",
        required: false,
        inputJson: { contextFactDefinitionId: contextFactId("plain-string-path-file") },
        descriptionJson: { markdown: "Optional relative file path for working session notes." },
        sortOrder: 2,
      },
      {
        id: `${baseId}:field:workspace-dir`,
        formStepId,
        key: "workspaceDirectory",
        label: "Workspace Directory",
        valueType: "string",
        required: false,
        inputJson: { contextFactDefinitionId: contextFactId("plain-string-path-directory") },
        descriptionJson: {
          markdown: "Optional working directory for brainstorming scratch outputs.",
        },
        sortOrder: 3,
      },
      {
        id: `${baseId}:field:reference-workflow`,
        formStepId,
        key: "referenceWorkflow",
        label: "Reference Workflow",
        valueType: "string",
        required: false,
        inputJson: { contextFactDefinitionId: workflowReferenceSingleId },
        descriptionJson: { markdown: "Optional single technique workflow to prioritize first." },
        sortOrder: 4,
      },
    ],
    methodologyWorkflowAgentSteps: [
      {
        stepId: agentStepId,
        objective:
          "Facilitate a brainstorming session, synthesize selected directions, and prepare the downstream research handoff artifacts and draft specs.",
        instructionsMarkdown:
          "Use the captured brainstorming topic, mode, and constraints to facilitate ideation. Read the selected workflow references, methodology-backed JSON context, and upstream setup/research references as needed. Write the structured brainstorming summary JSON, the ready-for-synthesis flag, the brainstorming session artifact reference, and the research draft spec with artifacts when the session has converged.",
        harness: "opencode",
        agentKey: "Carson (Brainstorming Specialist)",
        modelJson: null,
        completionRequirementsJson: [
          { contextFactDefinitionId: contextFactId("plain-json") },
          { contextFactDefinitionId: contextFactId("plain-boolean") },
          { contextFactDefinitionId: artifactReferenceId },
          { contextFactDefinitionId: draftSpecWithArtifactsId },
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
        id: `${baseId}:read:topic`,
        agentStepId,
        contextFactDefinitionId: contextFactId("plain-string"),
      },
      {
        id: `${baseId}:read:mode`,
        agentStepId,
        contextFactDefinitionId: contextFactId("plain-string-allowed-values"),
      },
      {
        id: `${baseId}:read:repository-type`,
        agentStepId,
        contextFactDefinitionId: contextFactId("defext-method-repository-type"),
      },
      {
        id: `${baseId}:read:project-parts`,
        agentStepId,
        contextFactDefinitionId: contextFactId("bound-method-project-parts"),
      },
      {
        id: `${baseId}:read:existing-docs`,
        agentStepId,
        contextFactDefinitionId: contextFactId("bound-method-doc-inventory"),
      },
      {
        id: `${baseId}:read:setup-work-unit`,
        agentStepId,
        contextFactDefinitionId: contextFactId("defext-wu-work-unit"),
      },
      {
        id: `${baseId}:read:workflow-many`,
        agentStepId,
        contextFactDefinitionId: workflowReferenceManyId,
      },
    ],
    methodologyWorkflowAgentStepWriteItems: [
      {
        id: `${baseId}:write:summary-json`,
        agentStepId,
        writeItemId: "brainstorming_summary_json",
        contextFactDefinitionId: contextFactId("plain-json"),
        contextFactKind: "plain_fact",
        label: "Brainstorming Summary JSON",
        sortOrder: 100,
      },
      {
        id: `${baseId}:write:ready`,
        agentStepId,
        writeItemId: "brainstorming_ready_for_synthesis",
        contextFactDefinitionId: contextFactId("plain-boolean"),
        contextFactKind: "plain_fact",
        label: "Ready For Synthesis",
        sortOrder: 200,
      },
      {
        id: `${baseId}:write:artifact`,
        agentStepId,
        writeItemId: "brainstorming_session_artifact_ref",
        contextFactDefinitionId: artifactReferenceId,
        contextFactKind: "artifact_slot_reference_fact",
        label: "Brainstorming Session Artifact",
        sortOrder: 300,
      },
      {
        id: `${baseId}:write:draft-spec`,
        agentStepId,
        writeItemId: "research_draft_spec_with_artifacts",
        contextFactDefinitionId: draftSpecWithArtifactsId,
        contextFactKind: "work_unit_draft_spec_fact",
        label: "Research Draft Spec With Artifacts",
        sortOrder: 400,
      },
    ],
    methodologyWorkflowAgentStepWriteItemRequirements: [
      {
        id: `${baseId}:write-req:summary-topic`,
        writeItemRowId: `${baseId}:write:summary-json`,
        contextFactDefinitionId: contextFactId("plain-string"),
      },
      {
        id: `${baseId}:write-req:ready-summary`,
        writeItemRowId: `${baseId}:write:ready`,
        contextFactDefinitionId: contextFactId("plain-json"),
      },
      {
        id: `${baseId}:write-req:artifact-summary`,
        writeItemRowId: `${baseId}:write:artifact`,
        contextFactDefinitionId: contextFactId("plain-json"),
      },
      {
        id: `${baseId}:write-req:draft-spec-summary`,
        writeItemRowId: `${baseId}:write:draft-spec`,
        contextFactDefinitionId: contextFactId("plain-json"),
      },
    ],
    methodologyWorkflowInvokeSteps: [
      {
        stepId: invokeWorkflowStepId,
        targetKind: "workflow",
        sourceMode: "context_fact_backed",
        workflowDefinitionIds: null,
        workUnitDefinitionId: null,
        contextFactDefinitionId: workflowReferenceManyId,
        configJson: {
          descriptionJson: { markdown: "Invoke selected brainstorming support workflows." },
        },
      },
      {
        stepId: invokeResearchStepId,
        targetKind: "work_unit",
        sourceMode: "context_fact_backed",
        workflowDefinitionIds: null,
        workUnitDefinitionId: null,
        contextFactDefinitionId: draftSpecWithArtifactsId,
        configJson: {
          descriptionJson: {
            markdown: "Create downstream research work units from the draft spec.",
          },
        },
      },
    ],
    methodologyWorkflowInvokeBindings: [
      {
        id: `${baseId}:invoke-binding:setup-work-unit`,
        invokeStepId: invokeResearchStepId,
        destinationKind: "work_unit_fact",
        destinationKey: "setup_work_unit",
        workUnitFactDefinitionId: researchFactId("setup-work-unit"),
        artifactSlotDefinitionId: null,
        sourceKind: "context_fact",
        contextFactDefinitionId: contextFactId("defext-wu-work-unit"),
        literalValueJson: null,
        sortOrder: 0,
      },
      {
        id: `${baseId}:invoke-binding:brainstorming-work-unit`,
        invokeStepId: invokeResearchStepId,
        destinationKind: "work_unit_fact",
        destinationKey: "brainstorming_work_unit",
        workUnitFactDefinitionId: researchFactId("brainstorming-work-unit"),
        artifactSlotDefinitionId: null,
        sourceKind: "runtime",
        contextFactDefinitionId: null,
        literalValueJson: null,
        sortOrder: 1,
      },
      {
        id: `${baseId}:invoke-binding:research-topic`,
        invokeStepId: invokeResearchStepId,
        destinationKind: "work_unit_fact",
        destinationKey: "research_topic",
        workUnitFactDefinitionId: researchFactId("research-topic"),
        artifactSlotDefinitionId: null,
        sourceKind: "context_fact",
        contextFactDefinitionId: contextFactId("plain-string"),
        literalValueJson: null,
        sortOrder: 2,
      },
      {
        id: `${baseId}:invoke-binding:research-report-artifact`,
        invokeStepId: invokeResearchStepId,
        destinationKind: "artifact_slot",
        destinationKey: "research_report",
        workUnitFactDefinitionId: null,
        artifactSlotDefinitionId: `seed:artifact-slot:research:research-report:${methodologyVersionId}`,
        sourceKind: "context_fact",
        contextFactDefinitionId: artifactReferenceId,
        literalValueJson: null,
        sortOrder: 3,
      },
    ],
    methodologyWorkflowInvokeTransitions: [
      {
        id: `${baseId}:invoke-transition:research-ready`,
        invokeStepId: invokeResearchStepId,
        transitionId: `seed:transition:research:activation-to-done:${methodologyVersionId}`,
        workflowDefinitionIds: [
          researchWorkflowId("market-research"),
          researchWorkflowId("domain-research"),
          researchWorkflowId("technical-research"),
        ],
        sortOrder: 0,
      },
    ],
  } as const;
}

export const brainstormingDemoFixtureSeedRows = buildBrainstormingDemoFixtureSeedRows(
  methodologyVersionIds.active,
);

export const brainstormingDemoFixtureSeedRowsAllVersions = [
  buildBrainstormingDemoFixtureSeedRows(methodologyVersionIds.draft),
  buildBrainstormingDemoFixtureSeedRows(methodologyVersionIds.active),
] as const;
