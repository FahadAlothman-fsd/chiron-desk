import { schema } from "@chiron/db";

export type MethodologyWorkUnitTypeSeedRow = typeof schema.methodologyWorkUnitTypes.$inferInsert;
export type MethodologyAgentTypeSeedRow = typeof schema.methodologyAgentTypes.$inferInsert;
export type MethodologyLifecycleStateSeedRow = typeof schema.workUnitLifecycleStates.$inferInsert;
export type MethodologyLifecycleTransitionSeedRow =
  typeof schema.workUnitLifecycleTransitions.$inferInsert;
export type MethodologyTransitionConditionSetSeedRow =
  typeof schema.transitionConditionSets.$inferInsert;
export type MethodologyFactSchemaSeedRow = typeof schema.workUnitFactDefinitions.$inferInsert;
export type MethodologyFactDefinitionSeedRow =
  typeof schema.methodologyFactDefinitions.$inferInsert;
export type MethodologyLinkTypeDefinitionSeedRow =
  typeof schema.methodologyLinkTypeDefinitions.$inferInsert;
export type MethodologyWorkflowSeedRow = typeof schema.methodologyWorkflows.$inferInsert;
export type MethodologyWorkflowStepSeedRow = typeof schema.methodologyWorkflowSteps.$inferInsert;
export type MethodologyWorkflowEdgeSeedRow = typeof schema.methodologyWorkflowEdges.$inferInsert;
export type MethodologyWorkflowContextFactDefinitionSeedRow =
  typeof schema.methodologyWorkflowContextFactDefinitions.$inferInsert;
export type MethodologyWorkflowContextFactPlainValueSeedRow =
  typeof schema.methodologyWorkflowContextFactPlainValues.$inferInsert;
export type MethodologyWorkflowContextFactExternalBindingSeedRow =
  typeof schema.methodologyWorkflowContextFactExternalBindings.$inferInsert;
export type MethodologyWorkflowContextFactArtifactReferenceSeedRow =
  typeof schema.methodologyWorkflowContextFactArtifactReferences.$inferInsert;
export type MethodologyWorkflowFormFieldSeedRow =
  typeof schema.methodologyWorkflowFormFields.$inferInsert;
export type MethodologyTransitionWorkflowBindingSeedRow =
  typeof schema.methodologyTransitionWorkflowBindings.$inferInsert;
export type MethodologyArtifactSlotDefinitionSeedRow =
  typeof schema.methodologyArtifactSlotDefinitions.$inferInsert;
export type MethodologyArtifactSlotTemplateSeedRow =
  typeof schema.methodologyArtifactSlotTemplates.$inferInsert;
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
export type MethodologyWorkflowBranchStepSeedRow =
  typeof schema.methodologyWorkflowBranchSteps.$inferInsert;
export type MethodologyWorkflowBranchRouteSeedRow =
  typeof schema.methodologyWorkflowBranchRoutes.$inferInsert;
export type MethodologyWorkflowBranchRouteGroupSeedRow =
  typeof schema.methodologyWorkflowBranchRouteGroups.$inferInsert;
export type MethodologyWorkflowBranchRouteConditionSeedRow =
  typeof schema.methodologyWorkflowBranchRouteConditions.$inferInsert;
export type MethodologyWorkflowInvokeStepSeedRow =
  typeof schema.methodologyWorkflowInvokeSteps.$inferInsert;
export type MethodologyWorkflowInvokeBindingSeedRow =
  typeof schema.methodologyWorkflowInvokeBindings.$inferInsert;
export type MethodologyWorkflowInvokeTransitionSeedRow =
  typeof schema.methodologyWorkflowInvokeTransitions.$inferInsert;
export type MethodologyWorkflowContextFactDraftSpecSeedRow =
  typeof schema.methodologyWorkflowContextFactDraftSpecs.$inferInsert;
export type MethodologyWorkflowContextFactDraftSpecSelectionSeedRow =
  typeof schema.methodologyWorkflowContextFactDraftSpecSelections.$inferInsert;
export type MethodologyWorkflowContextFactDraftSpecFactSeedRow =
  typeof schema.methodologyWorkflowContextFactDraftSpecFields.$inferInsert;

export const LOCKED_BMAD_SETUP_WORK_UNIT_FACT_KEYS = [
  "workflow_mode",
  "scan_level",
  "requires_brainstorming",
  "requires_research",
  "branch_note",
  "requires_product_brief",
  "deep_dive_target",
] as const;

export const LOCKED_BMAD_METHODOLOGY_FACT_KEYS = [
  "project_knowledge_directory",
  "planning_artifacts_directory",
  "implementation_artifacts_directory",
  "repository_type",
  "project_parts",
  "technology_stack_by_part",
  "existing_documentation_inventory",
  "integration_points",
] as const;

export const LOCKED_BMAD_DESIGN_TIME_FACT_KEYS = [
  ...LOCKED_BMAD_SETUP_WORK_UNIT_FACT_KEYS,
  ...LOCKED_BMAD_METHODOLOGY_FACT_KEYS,
] as const;

export const methodologyDefinitionId = "mdef_bmad_v1";
export const methodologyVersionIds = {
  draft: "mver_bmad_v1_draft",
  active: "mver_bmad_v1_active",
} as const;

const canonicalMethodologyVersionIds = [
  methodologyVersionIds.draft,
  methodologyVersionIds.active,
] as const;

type CanonicalMethodologyVersionId = (typeof canonicalMethodologyVersionIds)[number];
type WorkUnitKey =
  | "setup"
  | "brainstorming"
  | "research"
  | "product_brief"
  | "prd"
  | "ux_design"
  | "architecture";

function buildRowsForAllCanonicalVersions<Row>(
  buildRows: (methodologyVersionId: CanonicalMethodologyVersionId) => readonly Row[],
): readonly Row[] {
  return canonicalMethodologyVersionIds.flatMap((methodologyVersionId) =>
    buildRows(methodologyVersionId),
  );
}

function toDescriptionJson(markdown: string) {
  return {
    markdown,
  };
}

function toGuidanceJson(humanMarkdown: string, agentMarkdown = humanMarkdown) {
  return {
    human: { markdown: humanMarkdown },
    agent: { markdown: agentMarkdown },
  };
}

function toAllowedValuesValidation(values: readonly string[]) {
  return {
    kind: "allowed-values" as const,
    values: [...values],
  };
}

function workUnitTypeId(
  workUnitKey: WorkUnitKey,
  methodologyVersionId: CanonicalMethodologyVersionId,
) {
  return `seed:wut:${workUnitKey}:${methodologyVersionId}`;
}

function stateId(
  workUnitKey: WorkUnitKey,
  stateSuffix: string,
  methodologyVersionId: CanonicalMethodologyVersionId,
) {
  return `seed:state:${workUnitKey}:${stateSuffix}:${methodologyVersionId}`;
}

function transitionId(
  workUnitKey: WorkUnitKey,
  transitionSuffix: string,
  methodologyVersionId: CanonicalMethodologyVersionId,
) {
  return `seed:transition:${workUnitKey}:${transitionSuffix}:${methodologyVersionId}`;
}

function workflowId(
  workUnitKey: WorkUnitKey,
  workflowSuffix: string,
  methodologyVersionId: CanonicalMethodologyVersionId,
) {
  return `seed:workflow:${workUnitKey}:${workflowSuffix}:${methodologyVersionId}`;
}

function bindingId(
  workUnitKey: WorkUnitKey,
  bindingSuffix: string,
  methodologyVersionId: CanonicalMethodologyVersionId,
) {
  return `seed:binding:${workUnitKey}:${bindingSuffix}:${methodologyVersionId}`;
}

function slotDefinitionId(
  workUnitKey: WorkUnitKey,
  slotSuffix: string,
  methodologyVersionId: CanonicalMethodologyVersionId,
) {
  return `seed:artifact-slot:${workUnitKey}:${slotSuffix}:${methodologyVersionId}`;
}

function slotTemplateId(
  workUnitKey: WorkUnitKey,
  templateSuffix: string,
  methodologyVersionId: CanonicalMethodologyVersionId,
) {
  return `seed:artifact-template:${workUnitKey}:${templateSuffix}:${methodologyVersionId}`;
}

function workUnitFactDefinitionId(
  workUnitKey: WorkUnitKey,
  idSuffix: string,
  methodologyVersionId: CanonicalMethodologyVersionId,
) {
  if (workUnitKey === "setup") {
    return `seed:work-unit-fact:${idSuffix}:${methodologyVersionId}`;
  }

  return `seed:work-unit-fact:${workUnitKey}:${idSuffix}:${methodologyVersionId}`;
}

const canonicalAgentDefinitions = [
  {
    idSuffix: "bmad-analyst",
    key: "bmad_analyst",
    displayName: "BMAD Analyst",
    descriptionJson: toDescriptionJson(
      "Strategic business analyst for setup discovery and research-oriented analysis.",
    ),
    guidanceJson: toGuidanceJson(
      "Use this agent for setup discovery and research work that requires structured analysis, evidence gathering, and requirements framing.",
      "Act as the canonical analysis-oriented methodology agent for setup, research, product briefing, and planning synthesis. Reduce ambiguity through evidence-backed structure rather than speculative invention.",
    ),
    persona:
      "Senior analyst with strong capability in market research, competitive analysis, domain framing, and requirements discovery. Works from evidence and turns ambiguity into structured understanding.",
    promptTemplateJson: {
      markdown:
        "You are the BMAD Analyst operating inside Chiron. Analyze the current work unit objective, use available facts and artifacts, and produce structured findings that reduce ambiguity and support downstream planning.",
    },
    mcpServersJson: [] as string[],
    capabilitiesJson: [
      "setup-discovery",
      "market_research",
      "domain_research",
      "technical_research",
      "requirements-elicitation",
    ] as string[],
  },
  {
    idSuffix: "bmad-brainstorming-coach",
    key: "bmad_brainstorming_coach",
    displayName: "BMAD Brainstorming Coach",
    descriptionJson: toDescriptionJson(
      "Facilitates structured ideation sessions and helps teams expand and organize solution space.",
    ),
    guidanceJson: toGuidanceJson(
      "Use this agent when the goal is to widen option space, test multiple directions, and organize emerging ideas before commitment.",
      "Guide structured ideation productively. Encourage divergence first, then help converge on promising directions without collapsing the space too early.",
    ),
    persona:
      "Energetic brainstorming facilitator who encourages exploration, structured ideation, and creative divergence before convergence.",
    promptTemplateJson: {
      markdown:
        "You are the BMAD Brainstorming Coach operating inside Chiron. Your job is to guide ideation productively, broaden the option space, surface tradeoffs, and help organize emerging ideas into useful directions.",
    },
    mcpServersJson: [] as string[],
    capabilitiesJson: [
      "brainstorm-facilitation",
      "creative-divergence",
      "idea-clustering",
      "idea-convergence",
      "elicitation-support",
    ] as string[],
  },
  {
    idSuffix: "bmad-tech-writer",
    key: "bmad_tech_writer",
    displayName: "BMAD Technical Writer",
    descriptionJson: toDescriptionJson(
      "Produces clear durable documentation artifacts from setup, research, and planning outputs.",
    ),
    guidanceJson: toGuidanceJson(
      "Use this agent when durable BMAD artifacts need to be written clearly and without unsupported embellishment.",
      "Convert validated facts and findings into clear durable artifacts. Do not invent unsupported detail and do not replace analysis or facilitation agents when those workflows still need their core roles.",
    ),
    persona:
      "Technical documentation specialist focused on clarity, structure, and usable written artifacts for both humans and AI systems.",
    promptTemplateJson: {
      markdown:
        "You are the BMAD Technical Writer operating inside Chiron. Convert validated facts and findings into clear, structured, durable artifacts without inventing unsupported detail.",
    },
    mcpServersJson: [] as string[],
    capabilitiesJson: [
      "artifact-authoring",
      "project-context-writing",
      "research-synthesis-writing",
      "planning-document-writing",
    ] as string[],
  },
] as const;

function buildAgentTypeSeedRows(
  methodologyVersionId: CanonicalMethodologyVersionId,
): readonly MethodologyAgentTypeSeedRow[] {
  return canonicalAgentDefinitions.map((definition) => ({
    id: `seed:agent:${definition.idSuffix}:${methodologyVersionId}`,
    methodologyVersionId,
    key: definition.key,
    displayName: definition.displayName,
    descriptionJson: definition.descriptionJson,
    guidanceJson: definition.guidanceJson,
    persona: definition.persona,
    promptTemplateJson: definition.promptTemplateJson,
    mcpServersJson: definition.mcpServersJson,
    capabilitiesJson: definition.capabilitiesJson,
  }));
}

export const setupAgentTypeSeedRows: readonly MethodologyAgentTypeSeedRow[] =
  buildRowsForAllCanonicalVersions(buildAgentTypeSeedRows);

const canonicalWorkUnitDefinitions = [
  {
    key: "setup",
    displayName: "Setup",
    descriptionJson: toDescriptionJson(
      "Initializes a BMAD project, captures durable setup context, and routes the next planning work.",
    ),
    guidanceJson: toGuidanceJson(
      "Use Setup to establish the baseline project context and select the next BMAD path.",
      "Setup is the canonical source of baseline project context. Downstream work should consume setup-owned facts and artifacts instead of re-deriving foundational assumptions.",
    ),
    cardinality: "one_per_project" as const,
  },
  {
    key: "brainstorming",
    displayName: "Brainstorming",
    descriptionJson: toDescriptionJson(
      "Facilitates structured ideation, convergence, and follow-up recommendations for fuzzy or exploratory work.",
    ),
    guidanceJson: toGuidanceJson(
      "Use Brainstorming when the problem or solution space is still exploratory and multiple directions should be surfaced before commitment.",
      "Brainstorming expands option space, captures technique outputs, and converges on selected directions plus optional research recommendations.",
    ),
    cardinality: "many_per_project" as const,
  },
  {
    key: "research",
    displayName: "Research",
    descriptionJson: toDescriptionJson(
      "Produces sourced market, domain, or technical analysis and preserves both structured synthesis and a canonical report artifact.",
    ),
    guidanceJson: toGuidanceJson(
      "Use Research when decisions need evidence, comparative analysis, or verification.",
      "Research should stay source-aware, carry explicit confidence, and synthesize implications for downstream planning work.",
    ),
    cardinality: "many_per_project" as const,
  },
  {
    key: "product_brief",
    displayName: "Product Brief",
    descriptionJson: toDescriptionJson(
      "Creates a concise executive brief from setup, brainstorming, research, and direct context.",
    ),
    guidanceJson: toGuidanceJson(
      "Use Product Brief to convert fuzzy context into a concise executive brief suitable for PRD creation.",
      "Product Brief is the bridge between exploratory discovery and formal planning. It should bind explicit Brainstorming and Research references when they exist.",
    ),
    cardinality: "many_per_project" as const,
  },
  {
    key: "prd",
    displayName: "PRD",
    descriptionJson: toDescriptionJson(
      "Creates a Product Requirements Document that defines journeys, scope, functional requirements, and non-functional requirements.",
    ),
    guidanceJson: toGuidanceJson(
      "Use PRD to turn a Product Brief or direct context into the downstream capability contract.",
      "PRD is the main planning contract for UX Design, Architecture, and later decomposition work.",
    ),
    cardinality: "many_per_project" as const,
  },
  {
    key: "ux_design",
    displayName: "UX Design",
    descriptionJson: toDescriptionJson(
      "Creates a UX design specification from PRD requirements, user journeys, and supporting research.",
    ),
    guidanceJson: toGuidanceJson(
      "Use UX Design when user interaction, visual UI, or experience design matters for the product.",
      "UX Design should stay traceable to a chosen PRD and produce actionable UX requirements for downstream work.",
    ),
    cardinality: "many_per_project" as const,
  },
  {
    key: "architecture",
    displayName: "Architecture",
    descriptionJson: toDescriptionJson(
      "Creates validated technical decisions, structure, and implementation guidance from PRD and optional UX/Research inputs.",
    ),
    guidanceJson: toGuidanceJson(
      "Use Architecture to turn the PRD and related context into durable technical decisions and implementation guardrails.",
      "Architecture requires PRD-level requirement context and may incorporate UX Design and Research when available.",
    ),
    cardinality: "many_per_project" as const,
  },
] as const;

function buildWorkUnitTypeSeedRows(
  methodologyVersionId: CanonicalMethodologyVersionId,
): readonly MethodologyWorkUnitTypeSeedRow[] {
  return canonicalWorkUnitDefinitions.map((definition) => ({
    id: workUnitTypeId(definition.key, methodologyVersionId),
    methodologyVersionId,
    key: definition.key,
    displayName: definition.displayName,
    descriptionJson: definition.descriptionJson,
    guidanceJson: definition.guidanceJson,
    cardinality: definition.cardinality,
  }));
}

export const sectionAWorkUnitTypeSeedRows: readonly MethodologyWorkUnitTypeSeedRow[] =
  buildRowsForAllCanonicalVersions(buildWorkUnitTypeSeedRows);

const workUnitStateDefinitions = {
  setup: {
    descriptionJson: toDescriptionJson(
      "Setup has produced the durable project setup record and the project is ready to continue through the selected BMAD path.",
    ),
    guidanceJson: toGuidanceJson(
      "Treat Setup as done only when the durable setup summary, next recommendation, and canonical overview artifact are available.",
    ),
  },
  brainstorming: {
    descriptionJson: toDescriptionJson(
      "Brainstorming has produced a session artifact plus converged directions and follow-up recommendations.",
    ),
    guidanceJson: toGuidanceJson(
      "Treat Brainstorming as done only when the session artifact and selected directions are durable.",
    ),
  },
  research: {
    descriptionJson: toDescriptionJson(
      "Research has completed source analysis, produced a structured synthesis, and attached the canonical report artifact.",
    ),
    guidanceJson: toGuidanceJson(
      "Treat Research as done only when the durable synthesis and report artifact are available.",
    ),
  },
  product_brief: {
    descriptionJson: toDescriptionJson(
      "The Product Brief artifact and downstream summary are complete enough for PRD creation.",
    ),
    guidanceJson: toGuidanceJson(
      "Treat Product Brief as done only when the canonical brief artifact, brief synthesis, and next recommendation are durable.",
    ),
  },
  prd: {
    descriptionJson: toDescriptionJson(
      "The PRD artifact is complete and ready to feed UX Design, Architecture, and later planning work.",
    ),
    guidanceJson: toGuidanceJson(
      "Treat PRD as done only when its requirement contract and next recommended work units are durable.",
    ),
  },
  ux_design: {
    descriptionJson: toDescriptionJson(
      "The UX design specification is complete and ready to inform Architecture and downstream execution planning.",
    ),
    guidanceJson: toGuidanceJson(
      "Treat UX Design as done only when the UX spec, UX requirement stream, and next recommendations are durable.",
    ),
  },
  architecture: {
    descriptionJson: toDescriptionJson(
      "The Architecture document and structured decisions are complete and ready to inform decomposition and implementation.",
    ),
    guidanceJson: toGuidanceJson(
      "Treat Architecture as done only when the document, decision set, validation results, and next recommendations are durable.",
    ),
  },
} as const;

function buildLifecycleStateSeedRowsFor(
  workUnitKey: WorkUnitKey,
  methodologyVersionId: CanonicalMethodologyVersionId,
): readonly MethodologyLifecycleStateSeedRow[] {
  const definition = workUnitStateDefinitions[workUnitKey];
  return [
    {
      id: stateId(workUnitKey, "done", methodologyVersionId),
      methodologyVersionId,
      workUnitTypeId: workUnitTypeId(workUnitKey, methodologyVersionId),
      key: "done",
      displayName: "Done",
      descriptionJson: definition.descriptionJson,
      guidanceJson: definition.guidanceJson,
    },
  ];
}

export const setupLifecycleStateSeedRows: readonly MethodologyLifecycleStateSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildLifecycleStateSeedRowsFor("setup", versionId),
  );
export const brainstormingLifecycleStateSeedRows: readonly MethodologyLifecycleStateSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildLifecycleStateSeedRowsFor("brainstorming", versionId),
  );
export const researchLifecycleStateSeedRows: readonly MethodologyLifecycleStateSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildLifecycleStateSeedRowsFor("research", versionId),
  );
export const productBriefLifecycleStateSeedRows: readonly MethodologyLifecycleStateSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildLifecycleStateSeedRowsFor("product_brief", versionId),
  );
export const prdLifecycleStateSeedRows: readonly MethodologyLifecycleStateSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) => buildLifecycleStateSeedRowsFor("prd", versionId));
export const uxDesignLifecycleStateSeedRows: readonly MethodologyLifecycleStateSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildLifecycleStateSeedRowsFor("ux_design", versionId),
  );
export const architectureLifecycleStateSeedRows: readonly MethodologyLifecycleStateSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildLifecycleStateSeedRowsFor("architecture", versionId),
  );

const workUnitTransitionDefinitions = {
  setup: toGuidanceJson(
    "Use this transition to complete setup once the durable setup record and next recommendation have been propagated.",
  ),
  brainstorming: toGuidanceJson(
    "Use this transition for the primary brainstorming workflow once the converged session outputs are durable.",
  ),
  research: toGuidanceJson(
    "Use this transition for the three concrete research workflows once the structured synthesis and report are durable.",
  ),
  product_brief: toGuidanceJson(
    "Use this transition once Product Brief has produced its executive brief, synthesis, and next recommendation.",
  ),
  prd: toGuidanceJson(
    "Use this transition once the PRD requirement contract and downstream recommendation set are durable.",
  ),
  ux_design: toGuidanceJson(
    "Use this transition once the UX specification and UX requirement stream are durable.",
  ),
  architecture: toGuidanceJson(
    "Use this transition once the Architecture document, decision set, and validation outputs are durable.",
  ),
} as const;

function buildLifecycleTransitionSeedRowsFor(
  workUnitKey: WorkUnitKey,
  methodologyVersionId: CanonicalMethodologyVersionId,
): readonly MethodologyLifecycleTransitionSeedRow[] {
  return [
    {
      id: transitionId(workUnitKey, "activation-to-done", methodologyVersionId),
      methodologyVersionId,
      workUnitTypeId: workUnitTypeId(workUnitKey, methodologyVersionId),
      fromStateId: null,
      toStateId: stateId(workUnitKey, "done", methodologyVersionId),
      transitionKey: "activation_to_done",
      descriptionJson: toDescriptionJson(
        `Completes the ${workUnitKey.replaceAll("_", " ")} work unit from activation into the done state.`,
      ),
      guidanceJson: workUnitTransitionDefinitions[workUnitKey],
    },
  ];
}

export const setupLifecycleTransitionSeedRows: readonly MethodologyLifecycleTransitionSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildLifecycleTransitionSeedRowsFor("setup", versionId),
  );
export const brainstormingLifecycleTransitionSeedRows: readonly MethodologyLifecycleTransitionSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildLifecycleTransitionSeedRowsFor("brainstorming", versionId),
  );
export const researchLifecycleTransitionSeedRows: readonly MethodologyLifecycleTransitionSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildLifecycleTransitionSeedRowsFor("research", versionId),
  );
export const productBriefLifecycleTransitionSeedRows: readonly MethodologyLifecycleTransitionSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildLifecycleTransitionSeedRowsFor("product_brief", versionId),
  );
export const prdLifecycleTransitionSeedRows: readonly MethodologyLifecycleTransitionSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildLifecycleTransitionSeedRowsFor("prd", versionId),
  );
export const uxDesignLifecycleTransitionSeedRows: readonly MethodologyLifecycleTransitionSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildLifecycleTransitionSeedRowsFor("ux_design", versionId),
  );
export const architectureLifecycleTransitionSeedRows: readonly MethodologyLifecycleTransitionSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildLifecycleTransitionSeedRowsFor("architecture", versionId),
  );

function factCondition(
  workUnitKey: WorkUnitKey,
  factKey: string,
  idSuffix: string,
  methodologyVersionId: CanonicalMethodologyVersionId,
) {
  return {
    kind: "work_unit_fact",
    required: true,
    config: {
      factKey,
      factDefinitionId: workUnitFactDefinitionId(workUnitKey, idSuffix, methodologyVersionId),
      operator: "exists",
    },
  } as const;
}

function artifactCondition(
  workUnitKey: WorkUnitKey,
  slotKey: string,
  slotSuffix: string,
  methodologyVersionId: CanonicalMethodologyVersionId,
) {
  return {
    kind: "artifact",
    required: true,
    config: {
      slotKey,
      slotDefinitionId: slotDefinitionId(workUnitKey, slotSuffix, methodologyVersionId),
      operator: "exists",
    },
  } as const;
}

function buildTransitionConditionSetSeedRowsFor(
  workUnitKey: WorkUnitKey,
  methodologyVersionId: CanonicalMethodologyVersionId,
): readonly MethodologyTransitionConditionSetSeedRow[] {
  const transition = transitionId(workUnitKey, "activation-to-done", methodologyVersionId);

  const definitions: Record<
    WorkUnitKey,
    {
      startGroupsJson: readonly { mode: "all" | "any"; conditions: readonly unknown[] }[];
      completionGroupsJson: readonly { mode: "all" | "any"; conditions: readonly unknown[] }[];
    }
  > = {
    setup: {
      startGroupsJson: [],
      completionGroupsJson: [
        {
          mode: "all",
          conditions: [
            factCondition("setup", "initiative_name", "initiative-name", methodologyVersionId),
            factCondition("setup", "project_kind", "project-kind", methodologyVersionId),
            factCondition(
              "setup",
              "setup_path_summary",
              "setup-path-summary",
              methodologyVersionId,
            ),
            factCondition(
              "setup",
              "next_recommended_work_unit",
              "next-recommended-work-unit",
              methodologyVersionId,
            ),
            artifactCondition(
              "setup",
              "PROJECT_OVERVIEW",
              "project-overview",
              methodologyVersionId,
            ),
          ],
        },
      ],
    },
    brainstorming: {
      startGroupsJson: [],
      completionGroupsJson: [
        {
          mode: "all",
          conditions: [
            factCondition(
              "brainstorming",
              "desired_outcome",
              "desired-outcome",
              methodologyVersionId,
            ),
            factCondition(
              "brainstorming",
              "selected_directions",
              "selected-directions",
              methodologyVersionId,
            ),
            artifactCondition(
              "brainstorming",
              "brainstorming_session",
              "brainstorming-session",
              methodologyVersionId,
            ),
          ],
        },
      ],
    },
    research: {
      startGroupsJson: [
        {
          mode: "all",
          conditions: [
            factCondition("research", "research_type", "research-type", methodologyVersionId),
            factCondition("research", "research_topic", "research-topic", methodologyVersionId),
          ],
        },
        {
          mode: "any",
          conditions: [
            factCondition("research", "setup_work_unit", "setup-work-unit", methodologyVersionId),
            factCondition(
              "research",
              "brainstorming_work_unit",
              "brainstorming-work-unit",
              methodologyVersionId,
            ),
            factCondition("research", "research_goals", "research-goals", methodologyVersionId),
          ],
        },
      ],
      completionGroupsJson: [
        {
          mode: "all",
          conditions: [
            factCondition("research", "research_type", "research-type", methodologyVersionId),
            factCondition("research", "research_topic", "research-topic", methodologyVersionId),
            factCondition("research", "research_goals", "research-goals", methodologyVersionId),
            factCondition(
              "research",
              "research_synthesis",
              "research-synthesis",
              methodologyVersionId,
            ),
            artifactCondition(
              "research",
              "RESEARCH_REPORT",
              "research-report",
              methodologyVersionId,
            ),
          ],
        },
      ],
    },
    product_brief: {
      startGroupsJson: [],
      completionGroupsJson: [
        {
          mode: "all",
          conditions: [
            factCondition("product_brief", "product_name", "product-name", methodologyVersionId),
            factCondition(
              "product_brief",
              "product_intent_summary",
              "product-intent-summary",
              methodologyVersionId,
            ),
            factCondition(
              "product_brief",
              "brief_synthesis",
              "brief-synthesis",
              methodologyVersionId,
            ),
            factCondition(
              "product_brief",
              "next_recommended_work_unit",
              "next-recommended-work-unit",
              methodologyVersionId,
            ),
            artifactCondition(
              "product_brief",
              "PRODUCT_BRIEF",
              "product-brief",
              methodologyVersionId,
            ),
          ],
        },
      ],
    },
    prd: {
      startGroupsJson: [],
      completionGroupsJson: [
        {
          mode: "all",
          conditions: [
            factCondition("prd", "project_name", "project-name", methodologyVersionId),
            factCondition(
              "prd",
              "project_classification",
              "project-classification",
              methodologyVersionId,
            ),
            factCondition("prd", "product_vision", "product-vision", methodologyVersionId),
            factCondition("prd", "success_criteria", "success-criteria", methodologyVersionId),
            factCondition("prd", "user_journeys", "user-journeys", methodologyVersionId),
            factCondition("prd", "scope_plan", "scope-plan", methodologyVersionId),
            factCondition(
              "prd",
              "functional_requirements",
              "functional-requirements",
              methodologyVersionId,
            ),
            factCondition(
              "prd",
              "non_functional_requirements",
              "non-functional-requirements",
              methodologyVersionId,
            ),
            factCondition("prd", "prd_synthesis", "prd-synthesis", methodologyVersionId),
            factCondition(
              "prd",
              "next_recommended_work_units",
              "next-recommended-work-units",
              methodologyVersionId,
            ),
            artifactCondition("prd", "PRD", "prd", methodologyVersionId),
          ],
        },
      ],
    },
    ux_design: {
      startGroupsJson: [
        {
          mode: "all",
          conditions: [
            factCondition("ux_design", "prd_work_unit", "prd-work-unit", methodologyVersionId),
          ],
        },
      ],
      completionGroupsJson: [
        {
          mode: "all",
          conditions: [
            factCondition(
              "ux_design",
              "project_understanding",
              "project-understanding",
              methodologyVersionId,
            ),
            factCondition("ux_design", "core_experience", "core-experience", methodologyVersionId),
            factCondition(
              "ux_design",
              "design_system_strategy",
              "design-system-strategy",
              methodologyVersionId,
            ),
            factCondition(
              "ux_design",
              "visual_foundation",
              "visual-foundation",
              methodologyVersionId,
            ),
            factCondition("ux_design", "user_flow_specs", "user-flow-specs", methodologyVersionId),
            factCondition(
              "ux_design",
              "component_strategy",
              "component-strategy",
              methodologyVersionId,
            ),
            factCondition(
              "ux_design",
              "responsive_accessibility_strategy",
              "responsive-accessibility-strategy",
              methodologyVersionId,
            ),
            factCondition(
              "ux_design",
              "ux_design_requirements",
              "ux-design-requirements",
              methodologyVersionId,
            ),
            factCondition(
              "ux_design",
              "ux_design_synthesis",
              "ux-design-synthesis",
              methodologyVersionId,
            ),
            factCondition(
              "ux_design",
              "next_recommended_work_units",
              "next-recommended-work-units",
              methodologyVersionId,
            ),
            artifactCondition(
              "ux_design",
              "UX_DESIGN_SPECIFICATION",
              "ux-design-specification",
              methodologyVersionId,
            ),
          ],
        },
      ],
    },
    architecture: {
      startGroupsJson: [
        {
          mode: "all",
          conditions: [
            factCondition("architecture", "prd_work_unit", "prd-work-unit", methodologyVersionId),
          ],
        },
      ],
      completionGroupsJson: [
        {
          mode: "all",
          conditions: [
            factCondition(
              "architecture",
              "project_context_analysis",
              "project-context-analysis",
              methodologyVersionId,
            ),
            factCondition(
              "architecture",
              "architecture_decisions",
              "architecture-decisions",
              methodologyVersionId,
            ),
            factCondition(
              "architecture",
              "implementation_patterns",
              "implementation-patterns",
              methodologyVersionId,
            ),
            factCondition(
              "architecture",
              "project_structure",
              "project-structure",
              methodologyVersionId,
            ),
            factCondition(
              "architecture",
              "requirements_coverage",
              "requirements-coverage",
              methodologyVersionId,
            ),
            factCondition(
              "architecture",
              "validation_results",
              "validation-results",
              methodologyVersionId,
            ),
            factCondition(
              "architecture",
              "architecture_synthesis",
              "architecture-synthesis",
              methodologyVersionId,
            ),
            factCondition(
              "architecture",
              "next_recommended_work_units",
              "next-recommended-work-units",
              methodologyVersionId,
            ),
            artifactCondition(
              "architecture",
              "ARCHITECTURE_DOCUMENT",
              "architecture-document",
              methodologyVersionId,
            ),
          ],
        },
      ],
    },
  };

  const definition = definitions[workUnitKey];
  return [
    {
      id: `seed:condition-set:${workUnitKey}:activation-to-done:start:${methodologyVersionId}`,
      methodologyVersionId,
      transitionId: transition,
      key: `wu.${workUnitKey}.activation_to_done.start`,
      phase: "start",
      mode: "all",
      groupsJson: definition.startGroupsJson,
    },
    {
      id: `seed:condition-set:${workUnitKey}:activation-to-done:completion:${methodologyVersionId}`,
      methodologyVersionId,
      transitionId: transition,
      key: `wu.${workUnitKey}.activation_to_done.completion`,
      phase: "completion",
      mode: "all",
      groupsJson: definition.completionGroupsJson,
    },
  ];
}

export const setupTransitionConditionSetSeedRows: readonly MethodologyTransitionConditionSetSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildTransitionConditionSetSeedRowsFor("setup", versionId),
  );
export const brainstormingTransitionConditionSetSeedRows: readonly MethodologyTransitionConditionSetSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildTransitionConditionSetSeedRowsFor("brainstorming", versionId),
  );
export const researchTransitionConditionSetSeedRows: readonly MethodologyTransitionConditionSetSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildTransitionConditionSetSeedRowsFor("research", versionId),
  );
export const productBriefTransitionConditionSetSeedRows: readonly MethodologyTransitionConditionSetSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildTransitionConditionSetSeedRowsFor("product_brief", versionId),
  );
export const prdTransitionConditionSetSeedRows: readonly MethodologyTransitionConditionSetSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildTransitionConditionSetSeedRowsFor("prd", versionId),
  );
export const uxDesignTransitionConditionSetSeedRows: readonly MethodologyTransitionConditionSetSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildTransitionConditionSetSeedRowsFor("ux_design", versionId),
  );
export const architectureTransitionConditionSetSeedRows: readonly MethodologyTransitionConditionSetSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildTransitionConditionSetSeedRowsFor("architecture", versionId),
  );

type FactDefinitionConfig = {
  readonly idSuffix: string;
  readonly key: string;
  readonly name: string;
  readonly factType: string;
  readonly cardinality: "one" | "many";
  readonly descriptionJson: ReturnType<typeof toDescriptionJson>;
  readonly guidanceJson: ReturnType<typeof toGuidanceJson>;
  readonly validationJson: Record<string, unknown>;
  readonly defaultValueJson: unknown;
};

const setupFactDefinitions = [
  {
    idSuffix: "initiative-name",
    key: "initiative_name",
    name: "Initiative Name",
    factType: "string",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "Durable project or initiative label captured during setup intake.",
    ),
    guidanceJson: toGuidanceJson(
      "Use the human-readable name that should appear in setup-owned artifacts.",
    ),
    validationJson: { kind: "none" as const },
    defaultValueJson: null,
  },
  {
    idSuffix: "project-kind",
    key: "project_kind",
    name: "Project Kind",
    factType: "string",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "Durable greenfield/brownfield split selected during setup.",
    ),
    guidanceJson: toGuidanceJson("Allowed values: `greenfield`, `brownfield`."),
    validationJson: toAllowedValuesValidation(["greenfield", "brownfield"]),
    defaultValueJson: null,
  },
  {
    idSuffix: "setup-path-summary",
    key: "setup_path_summary",
    name: "Setup Path Summary",
    factType: "json",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "Structured record of the setup path selected, what was invoked, what was deferred, and what should happen next.",
    ),
    guidanceJson: toGuidanceJson(
      "Persist the durable summary of setup decisions, propagation outputs, deferred items, and the next recommended work unit type.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: {
        type: "object",
        additionalProperties: false,
        required: [
          "project_kind",
          "selected_path",
          "next_recommended_work_unit_type_key",
          "rationale",
        ],
        properties: {
          project_kind: { type: "string", cardinality: "one" },
          selected_path: { type: "string", cardinality: "one" },
          invoked_work_units: { type: "object", cardinality: "many" },
          propagated_project_facts: { type: "object", cardinality: "many" },
          deferred_items: { type: "object", cardinality: "many" },
          next_recommended_work_unit_type_key: { type: "string", cardinality: "one" },
          rationale: { type: "string", cardinality: "one" },
        },
      },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "next-recommended-work-unit",
    key: "next_recommended_work_unit",
    name: "Next Recommended Work Unit",
    factType: "work_unit",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "Durable pointer to the next recommended work unit after setup.",
    ),
    guidanceJson: toGuidanceJson(
      "Usually points to Brainstorming, Research, or Product Brief depending on the selected setup path.",
    ),
    validationJson: { kind: "none" as const },
    defaultValueJson: null,
  },
] as const satisfies readonly FactDefinitionConfig[];

const brainstormingFactDefinitions = [
  {
    idSuffix: "setup-work-unit",
    key: "setup_work_unit",
    name: "Setup Work Unit",
    factType: "work_unit",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "Optional reference to the Setup work unit that launched or contextualized this session.",
    ),
    guidanceJson: toGuidanceJson(
      "Store a Setup reference only when Brainstorming was launched from Setup or depends on Setup context.",
    ),
    validationJson: {
      kind: "none" as const,
      dependencyType: "requires_setup_context",
      workUnitKey: "setup",
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "brainstorming-focus",
    key: "brainstorming_focus",
    name: "Brainstorming Focus",
    factType: "string",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "The topic, problem, or opportunity the brainstorming session explores.",
    ),
    guidanceJson: toGuidanceJson("Capture the single focus statement that frames the session."),
    validationJson: { kind: "none" as const },
    defaultValueJson: null,
  },
  {
    idSuffix: "desired-outcome",
    key: "desired_outcome",
    name: "Desired Outcome",
    factType: "string",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "What the user wants to get out of the brainstorming session.",
    ),
    guidanceJson: toGuidanceJson(
      "Use this as the convergence target when deciding whether the session is complete.",
    ),
    validationJson: { kind: "none" as const },
    defaultValueJson: null,
  },
  {
    idSuffix: "objectives",
    key: "objectives",
    name: "Objectives",
    factType: "json",
    cardinality: "many",
    descriptionJson: toDescriptionJson(
      "Specific brainstorming objectives or questions the session should explore.",
    ),
    guidanceJson: toGuidanceJson(
      "Capture one or more explicit brainstorming objectives with priority and success signal.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["title", "priority"],
        properties: {
          title: { type: "string", cardinality: "one" },
          motivation: { type: "string", cardinality: "one" },
          success_signal: { type: "string", cardinality: "one" },
          priority: { type: "string", cardinality: "one" },
          notes: { type: "string", cardinality: "one" },
        },
      },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "constraints",
    key: "constraints",
    name: "Constraints",
    factType: "json",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "Constraints, must-haves, must-avoid items, and timebox notes that shape the session.",
    ),
    guidanceJson: toGuidanceJson(
      "Persist constraints that should continue shaping the selected directions.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          must_have: { type: "string", cardinality: "many" },
          must_avoid: { type: "string", cardinality: "many" },
          timebox_notes: { type: "string", cardinality: "many" },
          known_constraints: { type: "string", cardinality: "many" },
        },
      },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "technique-plan",
    key: "technique_plan",
    name: "Technique Plan",
    factType: "json",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "Selected technique workflows and why they were chosen for this session.",
    ),
    guidanceJson: toGuidanceJson(
      "Persist which support techniques were used, skipped, or deferred and why.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: { type: "object" },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "selected-technique-workflows",
    key: "selected_technique_workflows",
    name: "Selected Technique Workflows",
    factType: "json",
    cardinality: "many",
    descriptionJson: toDescriptionJson(
      "Selected support workflow keys used during this brainstorming session.",
    ),
    guidanceJson: toGuidanceJson(
      "Persist the chosen support workflow keys so later review can understand how the session was run.",
    ),
    validationJson: { kind: "none" as const },
    defaultValueJson: null,
  },
  {
    idSuffix: "technique-outputs",
    key: "technique_outputs",
    name: "Technique Outputs",
    factType: "json",
    cardinality: "many",
    descriptionJson: toDescriptionJson("Outputs captured from support brainstorming techniques."),
    guidanceJson: toGuidanceJson(
      "Store technique outputs in a durable structured form so convergence and downstream work can consume them.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: { type: "object" },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "selected-directions",
    key: "selected_directions",
    name: "Selected Directions",
    factType: "json",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "Converged directions after idea generation, organization, and review.",
    ),
    guidanceJson: toGuidanceJson(
      "Persist primary directions, quick wins, breakthrough concepts, and rejected/deferred ideas when they matter.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: { type: "object" },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "follow-up-research-topics",
    key: "follow_up_research_topics",
    name: "Follow-up Research Topics",
    factType: "json",
    cardinality: "many",
    descriptionJson: toDescriptionJson(
      "Optional research topics recommended by the brainstorming session.",
    ),
    guidanceJson: toGuidanceJson(
      "Use this when the session identifies open questions that should become Research work units.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: { type: "object" },
    },
    defaultValueJson: null,
  },
] as const satisfies readonly FactDefinitionConfig[];

const researchFactDefinitions = [
  {
    idSuffix: "setup-work-unit",
    key: "setup_work_unit",
    name: "Setup Work Unit",
    factType: "work_unit",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "Optional reference to the Setup work unit that contextualized this research effort.",
    ),
    guidanceJson: toGuidanceJson(
      "Use when Setup spawned or materially framed this Research work unit.",
    ),
    validationJson: {
      kind: "none" as const,
      dependencyType: "requires_setup_context",
      workUnitKey: "setup",
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "brainstorming-work-unit",
    key: "brainstorming_work_unit",
    name: "Brainstorming Work Unit",
    factType: "work_unit",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "Optional reference to the Brainstorming work unit that produced the research topic or questions.",
    ),
    guidanceJson: toGuidanceJson("Use when Brainstorming materially shaped this Research effort."),
    validationJson: {
      kind: "none" as const,
      dependencyType: "informed_by_brainstorming",
      workUnitKey: "brainstorming",
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "research-type",
    key: "research_type",
    name: "Research Type",
    factType: "string",
    cardinality: "one",
    descriptionJson: toDescriptionJson("Selects the BMAD research variant for this work unit."),
    guidanceJson: toGuidanceJson("Allowed values: `market`, `domain`, `technical`."),
    validationJson: toAllowedValuesValidation(["market", "domain", "technical"]),
    defaultValueJson: null,
  },
  {
    idSuffix: "research-topic",
    key: "research_topic",
    name: "Research Topic",
    factType: "string",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "The concrete topic, question area, or decision area being researched.",
    ),
    guidanceJson: toGuidanceJson("State the core topic this research should answer."),
    validationJson: { kind: "none" as const },
    defaultValueJson: null,
  },
  {
    idSuffix: "research-goals",
    key: "research_goals",
    name: "Research Goals",
    factType: "json",
    cardinality: "many",
    descriptionJson: toDescriptionJson(
      "Specific research goals or questions the workflow must answer.",
    ),
    guidanceJson: toGuidanceJson(
      "Capture one or more explicit research questions with priority and success signal.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: { type: "object" },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "scope-notes",
    key: "scope_notes",
    name: "Scope Notes",
    factType: "string",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "Optional scope boundaries, exclusions, or assumptions for this research effort.",
    ),
    guidanceJson: toGuidanceJson(
      "Use for explicit inclusions, exclusions, or evidence constraints.",
    ),
    validationJson: { kind: "none" as const },
    defaultValueJson: null,
  },
  {
    idSuffix: "research-synthesis",
    key: "research_synthesis",
    name: "Research Synthesis",
    factType: "json",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "Structured downstream-consumable summary of research findings, implications, and recommendations.",
    ),
    guidanceJson: toGuidanceJson(
      "Persist a durable synthesis with findings, risks, downstream implications, and verification notes.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: { type: "object" },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "source-inventory",
    key: "source_inventory",
    name: "Source Inventory",
    factType: "json",
    cardinality: "many",
    descriptionJson: toDescriptionJson(
      "Inventory of sources used or considered during the research effort.",
    ),
    guidanceJson: toGuidanceJson(
      "Store credibility, relevance, and source type metadata for the research inputs used.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: { type: "object" },
    },
    defaultValueJson: null,
  },
] as const satisfies readonly FactDefinitionConfig[];

const productBriefFactDefinitions = [
  {
    idSuffix: "setup-work-unit",
    key: "setup_work_unit",
    name: "Setup Work Unit",
    factType: "work_unit",
    cardinality: "one",
    descriptionJson: toDescriptionJson("Optional Setup source reference for the Product Brief."),
    guidanceJson: toGuidanceJson(
      "Use when Setup directly spawned or materially framed this brief.",
    ),
    validationJson: {
      kind: "none" as const,
      dependencyType: "requires_setup_context",
      workUnitKey: "setup",
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "brainstorming-work-unit",
    key: "brainstorming_work_unit",
    name: "Brainstorming Work Unit",
    factType: "work_unit",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "Optional Brainstorming reference whose outputs fed this Product Brief.",
    ),
    guidanceJson: toGuidanceJson(
      "Bind this explicitly when brainstorming outputs are an input to the brief.",
    ),
    validationJson: {
      kind: "none" as const,
      dependencyType: "informed_by_brainstorming",
      workUnitKey: "brainstorming",
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "research-work-units",
    key: "research_work_units",
    name: "Research Work Units",
    factType: "work_unit",
    cardinality: "many",
    descriptionJson: toDescriptionJson(
      "Optional Research work units used as explicit input to the Product Brief.",
    ),
    guidanceJson: toGuidanceJson(
      "Bind relevant research inputs explicitly instead of leaving them implicit inside the artifact only.",
    ),
    validationJson: {
      kind: "none" as const,
      dependencyType: "informed_by_research",
      workUnitKey: "research",
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "product-name",
    key: "product_name",
    name: "Product Name",
    factType: "string",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "Product or initiative name used in the Product Brief artifact.",
    ),
    guidanceJson: toGuidanceJson("Use the durable executive-facing product or initiative name."),
    validationJson: { kind: "none" as const },
    defaultValueJson: null,
  },
  {
    idSuffix: "product-intent-summary",
    key: "product_intent_summary",
    name: "Product Intent Summary",
    factType: "json",
    cardinality: "one",
    descriptionJson: toDescriptionJson("Structured summary of what is being briefed and why."),
    guidanceJson: toGuidanceJson(
      "Capture the core idea, target users, problem, desired outcome, constraints, and source mode.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: { type: "object" },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "source-context-summary",
    key: "source_context_summary",
    name: "Source Context Summary",
    factType: "json",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "Structured summary of the source context considered while authoring the brief.",
    ),
    guidanceJson: toGuidanceJson(
      "Summarize which inputs mattered, what contradictions were found, and which gaps remained.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: { type: "object" },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "brief-synthesis",
    key: "brief_synthesis",
    name: "Brief Synthesis",
    factType: "json",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "Machine-readable summary of the final Product Brief for PRD and downstream workflows.",
    ),
    guidanceJson: toGuidanceJson(
      "Persist the executive summary, problem, solution, differentiators, scope, and PRD-readiness notes.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: { type: "object" },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "review-findings",
    key: "review_findings",
    name: "Review Findings",
    factType: "json",
    cardinality: "many",
    descriptionJson: toDescriptionJson(
      "Findings from skeptic, opportunity, or contextual review passes.",
    ),
    guidanceJson: toGuidanceJson(
      "Store findings that shaped the final brief or still need a later decision.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: { type: "object" },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "open-questions",
    key: "open_questions",
    name: "Open Questions",
    factType: "json",
    cardinality: "many",
    descriptionJson: toDescriptionJson("Open questions surfaced during brief creation."),
    guidanceJson: toGuidanceJson(
      "Use for unresolved issues, especially when they influence PRD readiness.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: { type: "object" },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "next-recommended-work-unit",
    key: "next_recommended_work_unit",
    name: "Next Recommended Work Unit",
    factType: "work_unit",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "Durable pointer to the next recommended work unit, normally PRD.",
    ),
    guidanceJson: toGuidanceJson(
      "Usually points to the chosen PRD work unit created from this brief.",
    ),
    validationJson: { kind: "none" as const },
    defaultValueJson: null,
  },
] as const satisfies readonly FactDefinitionConfig[];

const prdFactDefinitions = [
  {
    idSuffix: "setup-work-unit",
    key: "setup_work_unit",
    name: "Setup Work Unit",
    factType: "work_unit",
    cardinality: "one",
    descriptionJson: toDescriptionJson("Optional Setup source reference for the PRD."),
    guidanceJson: toGuidanceJson(
      "Use when Setup still provides meaningful planning context for the PRD.",
    ),
    validationJson: {
      kind: "none" as const,
      dependencyType: "requires_setup_context",
      workUnitKey: "setup",
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "product-brief-work-unit",
    key: "product_brief_work_unit",
    name: "Product Brief Work Unit",
    factType: "work_unit",
    cardinality: "one",
    descriptionJson: toDescriptionJson("Preferred Product Brief source reference for this PRD."),
    guidanceJson: toGuidanceJson(
      "Bind exactly one chosen Product Brief when the PRD originates from a brief instead of direct context.",
    ),
    validationJson: {
      kind: "none" as const,
      dependencyType: "informed_by_product_brief",
      workUnitKey: "product_brief",
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "research-work-units",
    key: "research_work_units",
    name: "Research Work Units",
    factType: "work_unit",
    cardinality: "many",
    descriptionJson: toDescriptionJson("Research inputs used by the PRD."),
    guidanceJson: toGuidanceJson(
      "Bind relevant Research work units explicitly when they shaped requirements or scope.",
    ),
    validationJson: {
      kind: "none" as const,
      dependencyType: "informed_by_research",
      workUnitKey: "research",
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "brainstorming-work-unit",
    key: "brainstorming_work_unit",
    name: "Brainstorming Work Unit",
    factType: "work_unit",
    cardinality: "one",
    descriptionJson: toDescriptionJson("Optional Brainstorming input used by the PRD."),
    guidanceJson: toGuidanceJson(
      "Bind a Brainstorming work unit only when it directly shaped requirement framing or scope.",
    ),
    validationJson: {
      kind: "none" as const,
      dependencyType: "informed_by_brainstorming",
      workUnitKey: "brainstorming",
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "project-name",
    key: "project_name",
    name: "Project Name",
    factType: "string",
    cardinality: "one",
    descriptionJson: toDescriptionJson("Project or product name used in the PRD."),
    guidanceJson: toGuidanceJson(
      "Use the name that should anchor the requirement contract and artifact title.",
    ),
    validationJson: { kind: "none" as const },
    defaultValueJson: null,
  },
  {
    idSuffix: "input-context-inventory",
    key: "input_context_inventory",
    name: "Input Context Inventory",
    factType: "json",
    cardinality: "many",
    descriptionJson: toDescriptionJson(
      "Inventory of source inputs discovered or supplied for the PRD.",
    ),
    guidanceJson: toGuidanceJson(
      "Track source provenance across briefs, research, docs, and direct inputs.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: { type: "object" },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "project-classification",
    key: "project_classification",
    name: "Project Classification",
    factType: "json",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "Project type, domain, complexity, and greenfield/brownfield context.",
    ),
    guidanceJson: toGuidanceJson(
      "Capture the classification signals that shape PRD structure and downstream work.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: { type: "object" },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "product-vision",
    key: "product_vision",
    name: "Product Vision",
    factType: "json",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "Vision, differentiator, core insight, and target user framing.",
    ),
    guidanceJson: toGuidanceJson(
      "Persist the vision that explains what the product is, for whom, and why it matters.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: { type: "object" },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "success-criteria",
    key: "success_criteria",
    name: "Success Criteria",
    factType: "json",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "User, business, and technical success criteria for the PRD.",
    ),
    guidanceJson: toGuidanceJson("Persist the measurable outcomes the product should satisfy."),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: { type: "object" },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "user-journeys",
    key: "user_journeys",
    name: "User Journeys",
    factType: "json",
    cardinality: "many",
    descriptionJson: toDescriptionJson(
      "Narrative user journeys and their capability implications.",
    ),
    guidanceJson: toGuidanceJson(
      "Persist primary, edge, and supporting journeys in a downstream-readable format.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: { type: "object" },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "scope-plan",
    key: "scope_plan",
    name: "Scope Plan",
    factType: "json",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "MVP, phased development, scope boundaries, and risk mitigation strategy.",
    ),
    guidanceJson: toGuidanceJson(
      "Persist the phased scope contract used by downstream planning work.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: { type: "object" },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "functional-requirements",
    key: "functional_requirements",
    name: "Functional Requirements",
    factType: "json",
    cardinality: "many",
    descriptionJson: toDescriptionJson(
      "Implementation-agnostic capability requirements derived from the PRD.",
    ),
    guidanceJson: toGuidanceJson(
      "Persist numbered, traceable WHAT-statements rather than implementation HOW-statements.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: { type: "object" },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "non-functional-requirements",
    key: "non_functional_requirements",
    name: "Non-Functional Requirements",
    factType: "json",
    cardinality: "many",
    descriptionJson: toDescriptionJson(
      "Quality-attribute requirements, including explicit no-special-NFR records when applicable.",
    ),
    guidanceJson: toGuidanceJson(
      "Persist only relevant NFR categories with specific rationale or measurable criteria.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: { type: "object" },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "prd-synthesis",
    key: "prd_synthesis",
    name: "PRD Synthesis",
    factType: "json",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "Machine-readable downstream summary and traceability metadata for the PRD.",
    ),
    guidanceJson: toGuidanceJson(
      "Persist the downstream summary that UX, Architecture, and later work can consume quickly.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: { type: "object" },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "next-recommended-work-units",
    key: "next_recommended_work_units",
    name: "Next Recommended Work Units",
    factType: "work_unit",
    cardinality: "many",
    descriptionJson: toDescriptionJson(
      "Recommended next work units after PRD, typically UX Design and Architecture.",
    ),
    guidanceJson: toGuidanceJson(
      "Persist downstream planning recommendations explicitly instead of leaving them only in the artifact text.",
    ),
    validationJson: { kind: "none" as const },
    defaultValueJson: null,
  },
] as const satisfies readonly FactDefinitionConfig[];

const uxDesignFactDefinitions = [
  {
    idSuffix: "prd-work-unit",
    key: "prd_work_unit",
    name: "PRD Work Unit",
    factType: "work_unit",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "Preferred PRD source reference for this UX Design work unit.",
    ),
    guidanceJson: toGuidanceJson("UX Design should bind exactly one chosen PRD."),
    validationJson: {
      kind: "none" as const,
      dependencyType: "informed_by_prd",
      workUnitKey: "prd",
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "product-brief-work-unit",
    key: "product_brief_work_unit",
    name: "Product Brief Work Unit",
    factType: "work_unit",
    cardinality: "one",
    descriptionJson: toDescriptionJson("Optional Product Brief source reference for UX Design."),
    guidanceJson: toGuidanceJson(
      "Use when the brief still contributes meaningful product framing to UX decisions.",
    ),
    validationJson: {
      kind: "none" as const,
      dependencyType: "informed_by_product_brief",
      workUnitKey: "product_brief",
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "research-work-units",
    key: "research_work_units",
    name: "Research Work Units",
    factType: "work_unit",
    cardinality: "many",
    descriptionJson: toDescriptionJson("Optional Research references that inform UX decisions."),
    guidanceJson: toGuidanceJson(
      "Bind research explicitly when it shapes flows, users, content, or accessibility choices.",
    ),
    validationJson: {
      kind: "none" as const,
      dependencyType: "informed_by_research",
      workUnitKey: "research",
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "project-understanding",
    key: "project_understanding",
    name: "Project Understanding",
    factType: "json",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "UX-focused synthesis of project vision, target users, challenges, and opportunities.",
    ),
    guidanceJson: toGuidanceJson("Persist the UX lens on the selected PRD and related context."),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: { type: "object" },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "core-experience",
    key: "core_experience",
    name: "Core Experience",
    factType: "json",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "Core action, platform strategy, effortless interactions, and experience principles.",
    ),
    guidanceJson: toGuidanceJson(
      "Persist the central user experience contract that anchors the rest of the UX spec.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: { type: "object" },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "emotional-response",
    key: "emotional_response",
    name: "Emotional Response",
    factType: "json",
    cardinality: "one",
    descriptionJson: toDescriptionJson("Desired emotional states and design implications."),
    guidanceJson: toGuidanceJson("Use when emotional framing materially shapes the experience."),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: { type: "object" },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "ux-inspiration",
    key: "ux_inspiration",
    name: "UX Inspiration",
    factType: "json",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "Inspiring products, transferable patterns, and anti-patterns.",
    ),
    guidanceJson: toGuidanceJson(
      "Persist only the inspiration that genuinely informs the UX direction.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: { type: "object" },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "design-system-strategy",
    key: "design_system_strategy",
    name: "Design System Strategy",
    factType: "json",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "Design system choice, rationale, implementation approach, and customization strategy.",
    ),
    guidanceJson: toGuidanceJson(
      "Persist the design-system foundation Architecture and implementation should respect.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: { type: "object" },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "visual-foundation",
    key: "visual_foundation",
    name: "Visual Foundation",
    factType: "json",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "Color, typography, spacing/layout, and accessibility foundation.",
    ),
    guidanceJson: toGuidanceJson(
      "Persist the visual contract that underpins the UX design system.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: { type: "object" },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "design-direction-decision",
    key: "design_direction_decision",
    name: "Design Direction Decision",
    factType: "json",
    cardinality: "one",
    descriptionJson: toDescriptionJson("Chosen visual direction and rationale."),
    guidanceJson: toGuidanceJson(
      "Use when a specific direction was chosen from multiple explored options.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: { type: "object" },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "user-flow-specs",
    key: "user_flow_specs",
    name: "User Flow Specs",
    factType: "json",
    cardinality: "many",
    descriptionJson: toDescriptionJson(
      "Detailed user flows with steps, branches, recovery paths, and optimization principles.",
    ),
    guidanceJson: toGuidanceJson(
      "Persist downstream-usable flow specs instead of leaving flows only in artifact prose.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: { type: "object" },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "component-strategy",
    key: "component_strategy",
    name: "Component Strategy",
    factType: "json",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "Design-system coverage, custom component specs, and implementation roadmap.",
    ),
    guidanceJson: toGuidanceJson(
      "Persist component and state expectations for Architecture and implementation planning.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: { type: "object" },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "responsive-accessibility-strategy",
    key: "responsive_accessibility_strategy",
    name: "Responsive Accessibility Strategy",
    factType: "json",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "Responsive strategy, breakpoints, accessibility targets, testing, and implementation guidance.",
    ),
    guidanceJson: toGuidanceJson(
      "Persist the responsive and accessibility contract that should constrain downstream implementation.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: { type: "object" },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "ux-design-requirements",
    key: "ux_design_requirements",
    name: "UX Design Requirements",
    factType: "json",
    cardinality: "many",
    descriptionJson: toDescriptionJson(
      "Actionable UX requirements for downstream planning and implementation.",
    ),
    guidanceJson: toGuidanceJson(
      "Persist traceable UX-DR-style requirements as a first-class stream.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: { type: "object" },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "ux-design-synthesis",
    key: "ux_design_synthesis",
    name: "UX Design Synthesis",
    factType: "json",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "Machine-readable downstream summary of UX decisions and traceability.",
    ),
    guidanceJson: toGuidanceJson(
      "Persist a concise downstream summary for Architecture and later decomposition work.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: { type: "object" },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "next-recommended-work-units",
    key: "next_recommended_work_units",
    name: "Next Recommended Work Units",
    factType: "work_unit",
    cardinality: "many",
    descriptionJson: toDescriptionJson(
      "Recommended next work units after UX Design, typically Architecture and/or backlog work.",
    ),
    guidanceJson: toGuidanceJson("Persist downstream recommendations explicitly."),
    validationJson: { kind: "none" as const },
    defaultValueJson: null,
  },
] as const satisfies readonly FactDefinitionConfig[];

const architectureFactDefinitions = [
  {
    idSuffix: "prd-work-unit",
    key: "prd_work_unit",
    name: "PRD Work Unit",
    factType: "work_unit",
    cardinality: "one",
    descriptionJson: toDescriptionJson("Required PRD source reference for Architecture."),
    guidanceJson: toGuidanceJson("Architecture requires a chosen PRD source."),
    validationJson: {
      kind: "none" as const,
      dependencyType: "informed_by_prd",
      workUnitKey: "prd",
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "ux-design-work-unit",
    key: "ux_design_work_unit",
    name: "UX Design Work Unit",
    factType: "work_unit",
    cardinality: "one",
    descriptionJson: toDescriptionJson("Optional UX Design source reference for Architecture."),
    guidanceJson: toGuidanceJson(
      "Use when UX Design exists and should constrain architecture decisions.",
    ),
    validationJson: {
      kind: "none" as const,
      dependencyType: "informed_by_ux_design",
      workUnitKey: "ux_design",
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "research-work-units",
    key: "research_work_units",
    name: "Research Work Units",
    factType: "work_unit",
    cardinality: "many",
    descriptionJson: toDescriptionJson(
      "Optional Research references that inform Architecture decisions.",
    ),
    guidanceJson: toGuidanceJson("Bind relevant technical or domain research explicitly."),
    validationJson: {
      kind: "none" as const,
      dependencyType: "informed_by_research",
      workUnitKey: "research",
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "project-context-artifact",
    key: "project_context_artifact",
    name: "Project Context Artifact",
    factType: "work_unit_reference",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "Optional Setup work-unit reference that provides the project-context artifact used during Architecture work.",
    ),
    guidanceJson: toGuidanceJson(
      "Use when setup-owned project context materially informs Architecture.",
    ),
    validationJson: {
      kind: "none" as const,
      dependencyType: "requires_setup_context",
      workUnitKey: "setup",
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "project-context-analysis",
    key: "project_context_analysis",
    name: "Project Context Analysis",
    factType: "json",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "Architectural analysis of requirements, NFRs, UX implications, constraints, and scale.",
    ),
    guidanceJson: toGuidanceJson(
      "Persist the analysis that turns PRD and UX inputs into architecture-relevant framing.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: { type: "object" },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "architecture-decisions",
    key: "architecture_decisions",
    name: "Architecture Decisions",
    factType: "json",
    cardinality: "many",
    descriptionJson: toDescriptionJson(
      "Core architecture decisions with rationale, alternatives, and impacts.",
    ),
    guidanceJson: toGuidanceJson(
      "Persist durable decision records the rest of the delivery system can trace back to.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: { type: "object" },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "implementation-patterns",
    key: "implementation_patterns",
    name: "Implementation Patterns",
    factType: "json",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "Naming, structure, communication, and consistency patterns for implementation.",
    ),
    guidanceJson: toGuidanceJson(
      "Persist implementation guardrails that reduce inconsistent downstream coding choices.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: { type: "object" },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "project-structure",
    key: "project_structure",
    name: "Project Structure",
    factType: "json",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "Concrete project tree, boundaries, mappings, and integration points.",
    ),
    guidanceJson: toGuidanceJson(
      "Persist the structure Architecture expects downstream work to respect.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: { type: "object" },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "requirements-coverage",
    key: "requirements_coverage",
    name: "Requirements Coverage",
    factType: "json",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "Mapping of PRD and UX requirements to architecture support and uncovered gaps.",
    ),
    guidanceJson: toGuidanceJson(
      "Persist explicit coverage and gap analysis rather than leaving it implicit in prose.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: { type: "object" },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "validation-results",
    key: "validation_results",
    name: "Validation Results",
    factType: "json",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "Coherence, coverage, readiness, and confidence results for the architecture.",
    ),
    guidanceJson: toGuidanceJson(
      "Persist the architecture validation outcome and remaining important gaps.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: { type: "object" },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "architecture-synthesis",
    key: "architecture_synthesis",
    name: "Architecture Synthesis",
    factType: "json",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "Machine-readable downstream summary and implementation handoff guidance.",
    ),
    guidanceJson: toGuidanceJson(
      "Persist a concise synthesis that backlog and implementation planning can consume quickly.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: { type: "object" },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "next-recommended-work-units",
    key: "next_recommended_work_units",
    name: "Next Recommended Work Units",
    factType: "work_unit",
    cardinality: "many",
    descriptionJson: toDescriptionJson(
      "Recommended next work units after Architecture, typically backlog work and/or readiness validation.",
    ),
    guidanceJson: toGuidanceJson("Persist downstream recommendations explicitly."),
    validationJson: { kind: "none" as const },
    defaultValueJson: null,
  },
] as const satisfies readonly FactDefinitionConfig[];

function buildWorkUnitFactDefinitionSeedRowsFor(
  workUnitKey: WorkUnitKey,
  methodologyVersionId: CanonicalMethodologyVersionId,
): readonly MethodologyFactSchemaSeedRow[] {
  const definitionsByWorkUnit: Record<WorkUnitKey, readonly FactDefinitionConfig[]> = {
    setup: setupFactDefinitions,
    brainstorming: brainstormingFactDefinitions,
    research: researchFactDefinitions,
    product_brief: productBriefFactDefinitions,
    prd: prdFactDefinitions,
    ux_design: uxDesignFactDefinitions,
    architecture: architectureFactDefinitions,
  };

  return definitionsByWorkUnit[workUnitKey].map((definition) => ({
    id: workUnitFactDefinitionId(workUnitKey, definition.idSuffix, methodologyVersionId),
    methodologyVersionId,
    workUnitTypeId: workUnitTypeId(workUnitKey, methodologyVersionId),
    name: definition.name,
    key: definition.key,
    factType: definition.factType,
    cardinality: definition.cardinality,
    descriptionJson: definition.descriptionJson,
    defaultValueJson: definition.defaultValueJson,
    guidanceJson: definition.guidanceJson,
    validationJson: definition.validationJson,
  }));
}

export const setupFactSchemaSeedRows: readonly MethodologyFactSchemaSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildWorkUnitFactDefinitionSeedRowsFor("setup", versionId),
  );
export const brainstormingFactSchemaSeedRows: readonly MethodologyFactSchemaSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildWorkUnitFactDefinitionSeedRowsFor("brainstorming", versionId),
  );
export const researchFactSchemaSeedRows: readonly MethodologyFactSchemaSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildWorkUnitFactDefinitionSeedRowsFor("research", versionId),
  );
export const productBriefFactSchemaSeedRows: readonly MethodologyFactSchemaSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildWorkUnitFactDefinitionSeedRowsFor("product_brief", versionId),
  );
export const prdFactSchemaSeedRows: readonly MethodologyFactSchemaSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildWorkUnitFactDefinitionSeedRowsFor("prd", versionId),
  );
export const uxDesignFactSchemaSeedRows: readonly MethodologyFactSchemaSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildWorkUnitFactDefinitionSeedRowsFor("ux_design", versionId),
  );
export const architectureFactSchemaSeedRows: readonly MethodologyFactSchemaSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildWorkUnitFactDefinitionSeedRowsFor("architecture", versionId),
  );

type ArtifactSlotConfig = {
  readonly idSuffix: string;
  readonly key: string;
  readonly displayName: string;
  readonly descriptionJson: ReturnType<typeof toDescriptionJson>;
  readonly guidanceJson: ReturnType<typeof toGuidanceJson>;
  readonly cardinality: "single" | "many";
  readonly rulesJson: Record<string, unknown>;
};

const artifactSlotDefinitionsByWorkUnit: Record<WorkUnitKey, readonly ArtifactSlotConfig[]> = {
  setup: [
    {
      idSuffix: "project-overview",
      key: "PROJECT_OVERVIEW",
      displayName: "Project Overview",
      descriptionJson: toDescriptionJson("Canonical setup summary and handoff artifact."),
      guidanceJson: toGuidanceJson("Use this as the durable setup overview and handoff artifact."),
      cardinality: "single",
      rulesJson: {
        pathStrategy: "project-knowledge",
        suggestedPath: "project-overview.md",
        templateEngine: "handlebars",
        maxFiles: 1,
      },
    },
    {
      idSuffix: "brownfield-docs-index",
      key: "BROWNFIELD_DOCS_INDEX",
      displayName: "Brownfield Docs Index",
      descriptionJson: toDescriptionJson(
        "Optional reference/index artifact created by brownfield documentation work.",
      ),
      guidanceJson: toGuidanceJson(
        "Use when brownfield setup created or accepted a durable documentation index.",
      ),
      cardinality: "single",
      rulesJson: {
        pathStrategy: "project-knowledge",
        suggestedPath: "brownfield/docs-index.md",
        templateEngine: "handlebars",
        maxFiles: 1,
      },
    },
    {
      idSuffix: "project-context",
      key: "PROJECT_CONTEXT",
      displayName: "Project Context",
      descriptionJson: toDescriptionJson(
        "Optional project-context artifact for downstream implementation agents.",
      ),
      guidanceJson: toGuidanceJson(
        "Use when setup generated or accepted a project-context artifact.",
      ),
      cardinality: "single",
      rulesJson: {
        pathStrategy: "project-knowledge",
        suggestedPath: "project-context.md",
        templateEngine: "handlebars",
        maxFiles: 1,
      },
    },
  ],
  brainstorming: [
    {
      idSuffix: "brainstorming-session",
      key: "brainstorming_session",
      displayName: "Brainstorming Session",
      descriptionJson: toDescriptionJson(
        "Canonical brainstorming report artifact containing framing, techniques, ideas, and selected directions.",
      ),
      guidanceJson: toGuidanceJson(
        "Use this artifact to persist the full brainstorming session outcome.",
      ),
      cardinality: "single",
      rulesJson: {
        pathStrategy: "project-knowledge",
        suggestedPath: "brainstorming/brainstorming-session.md",
        templateEngine: "handlebars",
        maxFiles: 1,
      },
    },
  ],
  research: [
    {
      idSuffix: "research-report",
      key: "RESEARCH_REPORT",
      displayName: "Research Report",
      descriptionJson: toDescriptionJson("Canonical human-readable research report artifact."),
      guidanceJson: toGuidanceJson(
        "Each research workflow should produce a single durable report artifact.",
      ),
      cardinality: "single",
      rulesJson: {
        pathStrategy: "planning-artifacts",
        suggestedPath: "research/research-report.md",
        templateEngine: "handlebars",
        maxFiles: 1,
      },
    },
  ],
  product_brief: [
    {
      idSuffix: "product-brief",
      key: "PRODUCT_BRIEF",
      displayName: "Product Brief",
      descriptionJson: toDescriptionJson("Canonical 1-2 page executive Product Brief artifact."),
      guidanceJson: toGuidanceJson(
        "Use this as the concise executive brief that feeds PRD creation.",
      ),
      cardinality: "single",
      rulesJson: {
        pathStrategy: "planning-artifacts",
        suggestedPath: "product-brief/product-brief.md",
        templateEngine: "handlebars",
        maxFiles: 1,
      },
    },
    {
      idSuffix: "product-brief-distillate",
      key: "PRODUCT_BRIEF_DISTILLATE",
      displayName: "Product Brief Detail Pack",
      descriptionJson: toDescriptionJson(
        "Optional overflow context artifact that helps PRD creation when extra detail matters.",
      ),
      guidanceJson: toGuidanceJson(
        "Use when detail should be preserved separately from the concise executive brief.",
      ),
      cardinality: "single",
      rulesJson: {
        pathStrategy: "planning-artifacts",
        suggestedPath: "product-brief/product-brief-detail-pack.md",
        templateEngine: "handlebars",
        maxFiles: 1,
      },
    },
  ],
  prd: [
    {
      idSuffix: "prd",
      key: "PRD",
      displayName: "Product Requirements Document",
      descriptionJson: toDescriptionJson("Canonical polished PRD artifact."),
      guidanceJson: toGuidanceJson("Use this as the main capability contract for downstream work."),
      cardinality: "single",
      rulesJson: {
        pathStrategy: "planning-artifacts",
        suggestedPath: "prd/prd.md",
        templateEngine: "handlebars",
        maxFiles: 1,
      },
    },
  ],
  ux_design: [
    {
      idSuffix: "ux-design-specification",
      key: "UX_DESIGN_SPECIFICATION",
      displayName: "UX Design Specification",
      descriptionJson: toDescriptionJson("Canonical UX design specification artifact."),
      guidanceJson: toGuidanceJson("Use this as the main UX design contract for downstream work."),
      cardinality: "single",
      rulesJson: {
        pathStrategy: "planning-artifacts",
        suggestedPath: "ux-design/ux-design-specification.md",
        templateEngine: "handlebars",
        maxFiles: 1,
      },
    },
    {
      idSuffix: "ux-color-themes",
      key: "UX_COLOR_THEMES",
      displayName: "UX Color Themes Visualizer",
      descriptionJson: toDescriptionJson("Optional color theme exploration artifact."),
      guidanceJson: toGuidanceJson(
        "Use when UX Design creates a dedicated color-theme exploration deliverable.",
      ),
      cardinality: "single",
      rulesJson: {
        pathStrategy: "planning-artifacts",
        suggestedPath: "ux-design/ux-color-themes.html",
        templateEngine: "handlebars",
        maxFiles: 1,
      },
    },
    {
      idSuffix: "ux-design-directions",
      key: "UX_DESIGN_DIRECTIONS",
      displayName: "UX Design Directions",
      descriptionJson: toDescriptionJson("Optional design direction comparison artifact."),
      guidanceJson: toGuidanceJson(
        "Use when UX Design creates mockups or comparison views for design directions.",
      ),
      cardinality: "single",
      rulesJson: {
        pathStrategy: "planning-artifacts",
        suggestedPath: "ux-design/ux-design-directions.html",
        templateEngine: "handlebars",
        maxFiles: 1,
      },
    },
  ],
  architecture: [
    {
      idSuffix: "architecture-document",
      key: "ARCHITECTURE_DOCUMENT",
      displayName: "Architecture Decision Document",
      descriptionJson: toDescriptionJson("Canonical architecture decision document artifact."),
      guidanceJson: toGuidanceJson("Use this as the main Architecture handoff artifact."),
      cardinality: "single",
      rulesJson: {
        pathStrategy: "planning-artifacts",
        suggestedPath: "architecture/architecture-document.md",
        templateEngine: "handlebars",
        maxFiles: 1,
      },
    },
    {
      idSuffix: "architecture-decision-records",
      key: "ARCHITECTURE_DECISION_RECORDS",
      displayName: "Architecture Decision Records",
      descriptionJson: toDescriptionJson(
        "Optional individual ADR artifacts for deeper decision capture.",
      ),
      guidanceJson: toGuidanceJson(
        "Use when Architecture emits separate ADR files for important decisions.",
      ),
      cardinality: "many",
      rulesJson: {
        pathStrategy: "planning-artifacts",
        suggestedPath: "architecture/adrs/adr-{{index}}.md",
        templateEngine: "handlebars",
        maxFiles: 25,
      },
    },
  ],
};

function buildArtifactSlotDefinitionSeedRowsFor(
  workUnitKey: WorkUnitKey,
  methodologyVersionId: CanonicalMethodologyVersionId,
): readonly MethodologyArtifactSlotDefinitionSeedRow[] {
  return artifactSlotDefinitionsByWorkUnit[workUnitKey].map((slot) => ({
    id: slotDefinitionId(workUnitKey, slot.idSuffix, methodologyVersionId),
    methodologyVersionId,
    workUnitTypeId: workUnitTypeId(workUnitKey, methodologyVersionId),
    key: slot.key,
    displayName: slot.displayName,
    descriptionJson: slot.descriptionJson,
    guidanceJson: slot.guidanceJson,
    cardinality: slot.cardinality,
    rulesJson: slot.rulesJson,
  }));
}

export const setupArtifactSlotDefinitionSeedRows: readonly MethodologyArtifactSlotDefinitionSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildArtifactSlotDefinitionSeedRowsFor("setup", versionId),
  );
export const brainstormingArtifactSlotDefinitionSeedRows: readonly MethodologyArtifactSlotDefinitionSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildArtifactSlotDefinitionSeedRowsFor("brainstorming", versionId),
  );
export const researchArtifactSlotDefinitionSeedRows: readonly MethodologyArtifactSlotDefinitionSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildArtifactSlotDefinitionSeedRowsFor("research", versionId),
  );
export const productBriefArtifactSlotDefinitionSeedRows: readonly MethodologyArtifactSlotDefinitionSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildArtifactSlotDefinitionSeedRowsFor("product_brief", versionId),
  );
export const prdArtifactSlotDefinitionSeedRows: readonly MethodologyArtifactSlotDefinitionSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildArtifactSlotDefinitionSeedRowsFor("prd", versionId),
  );
export const uxDesignArtifactSlotDefinitionSeedRows: readonly MethodologyArtifactSlotDefinitionSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildArtifactSlotDefinitionSeedRowsFor("ux_design", versionId),
  );
export const architectureArtifactSlotDefinitionSeedRows: readonly MethodologyArtifactSlotDefinitionSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildArtifactSlotDefinitionSeedRowsFor("architecture", versionId),
  );

type ArtifactTemplateConfig = {
  readonly idSuffix: string;
  readonly slotSuffix: string;
  readonly key: string;
  readonly displayName: string;
  readonly descriptionJson: ReturnType<typeof toDescriptionJson>;
  readonly guidanceJson: ReturnType<typeof toGuidanceJson>;
  readonly content: string;
};

const artifactTemplateDefinitionsByWorkUnit: Record<
  WorkUnitKey,
  readonly ArtifactTemplateConfig[]
> = {
  setup: [
    {
      idSuffix: "default",
      slotSuffix: "project-overview",
      key: "default",
      displayName: "Default Setup Template",
      descriptionJson: toDescriptionJson(
        "Default template for the setup project overview artifact.",
      ),
      guidanceJson: toGuidanceJson("Keep this concise and durable."),
      content:
        "# {{workUnit.facts.initiative_name}}\n\n- Project kind: {{workUnit.facts.project_kind}}\n{{#if methodology.facts.project_knowledge_directory}}- Knowledge directory: {{methodology.facts.project_knowledge_directory}}\n{{/if}}{{#if methodology.facts.planning_artifacts_directory}}- Planning artifacts: {{methodology.facts.planning_artifacts_directory}}\n{{/if}}",
    },
    {
      idSuffix: "project-context",
      slotSuffix: "project-context",
      key: "project_context",
      displayName: "Project Context Template",
      descriptionJson: toDescriptionJson(
        "Default template for an optional setup project-context artifact.",
      ),
      guidanceJson: toGuidanceJson(
        "Use only when setup chooses to persist project-context guidance.",
      ),
      content:
        "# Project Context\n\n## Initiative\n{{workUnit.facts.initiative_name}}\n\n## Setup Summary\n{{#if workUnit.facts.setup_path_summary}}{{workUnit.facts.setup_path_summary.rationale}}{{/if}}",
    },
    {
      idSuffix: "brownfield-docs-index",
      slotSuffix: "brownfield-docs-index",
      key: "brownfield_docs_index",
      displayName: "Brownfield Docs Index Template",
      descriptionJson: toDescriptionJson(
        "Default template for the optional brownfield docs index artifact.",
      ),
      guidanceJson: toGuidanceJson(
        "Use when setup surfaces a stable brownfield documentation index.",
      ),
      content:
        "# Brownfield Documentation Index\n\n{{#if methodology.facts.existing_documentation_inventory}}{{#each methodology.facts.existing_documentation_inventory}}- {{path}}\n{{/each}}{{/if}}",
    },
  ],
  brainstorming: [
    {
      idSuffix: "default",
      slotSuffix: "brainstorming-session",
      key: "default",
      displayName: "Default Brainstorming Session Template",
      descriptionJson: toDescriptionJson(
        "Default template for the brainstorming session artifact.",
      ),
      guidanceJson: toGuidanceJson("Persist framing, techniques, and selected directions clearly."),
      content:
        "# Brainstorming Session\n\n## Focus\n{{workUnit.facts.brainstorming_focus}}\n\n## Desired Outcome\n{{workUnit.facts.desired_outcome}}\n\n{{#if workUnit.facts.selected_directions}}## Selected Directions\n{{workUnit.facts.selected_directions}}\n{{/if}}",
    },
  ],
  research: [
    {
      idSuffix: "market",
      slotSuffix: "research-report",
      key: "market",
      displayName: "Market Research Report",
      descriptionJson: toDescriptionJson("Template for market research output."),
      guidanceJson: toGuidanceJson("Use when research_type is market."),
      content:
        "# Market Research\n\n## Topic\n{{workUnit.facts.research_topic}}\n\n{{#if workUnit.facts.research_synthesis}}## Synthesis\n{{workUnit.facts.research_synthesis}}\n{{/if}}",
    },
    {
      idSuffix: "domain",
      slotSuffix: "research-report",
      key: "domain",
      displayName: "Domain Research Report",
      descriptionJson: toDescriptionJson("Template for domain research output."),
      guidanceJson: toGuidanceJson("Use when research_type is domain."),
      content:
        "# Domain Research\n\n## Topic\n{{workUnit.facts.research_topic}}\n\n{{#if workUnit.facts.research_synthesis}}## Synthesis\n{{workUnit.facts.research_synthesis}}\n{{/if}}",
    },
    {
      idSuffix: "technical",
      slotSuffix: "research-report",
      key: "technical",
      displayName: "Technical Research Report",
      descriptionJson: toDescriptionJson("Template for technical research output."),
      guidanceJson: toGuidanceJson("Use when research_type is technical."),
      content:
        "# Technical Research\n\n## Topic\n{{workUnit.facts.research_topic}}\n\n{{#if workUnit.facts.research_synthesis}}## Synthesis\n{{workUnit.facts.research_synthesis}}\n{{/if}}",
    },
  ],
  product_brief: [
    {
      idSuffix: "default",
      slotSuffix: "product-brief",
      key: "default",
      displayName: "Product Brief Template",
      descriptionJson: toDescriptionJson(
        "Default template for the executive Product Brief artifact.",
      ),
      guidanceJson: toGuidanceJson("Keep this concise and executive-facing."),
      content:
        "# {{workUnit.facts.product_name}}\n\n## Executive Summary\n{{#if workUnit.facts.brief_synthesis.executive_summary}}{{workUnit.facts.brief_synthesis.executive_summary}}{{/if}}\n\n## Problem\n{{#if workUnit.facts.brief_synthesis.problem}}{{workUnit.facts.brief_synthesis.problem}}{{/if}}\n\n## Solution\n{{#if workUnit.facts.brief_synthesis.solution}}{{workUnit.facts.brief_synthesis.solution}}{{/if}}",
    },
    {
      idSuffix: "distillate",
      slotSuffix: "product-brief-distillate",
      key: "distillate",
      displayName: "Product Brief Detail Pack Template",
      descriptionJson: toDescriptionJson(
        "Default template for the optional Product Brief detail pack.",
      ),
      guidanceJson: toGuidanceJson(
        "Use when the brief has overflow detail worth preserving for PRD creation.",
      ),
      content:
        "# Product Brief Detail Pack\n\n{{#if workUnit.facts.source_context_summary}}## Source Context\n{{workUnit.facts.source_context_summary}}\n{{/if}}{{#if workUnit.facts.open_questions}}\n## Open Questions\n{{workUnit.facts.open_questions}}\n{{/if}}",
    },
  ],
  prd: [
    {
      idSuffix: "default",
      slotSuffix: "prd",
      key: "default",
      displayName: "PRD Template",
      descriptionJson: toDescriptionJson("Default template for the PRD artifact."),
      guidanceJson: toGuidanceJson(
        "Cover the core PRD sections and preserve requirement traceability.",
      ),
      content:
        "# {{workUnit.facts.project_name}} PRD\n\n## Vision\n{{workUnit.facts.product_vision}}\n\n## Success Criteria\n{{workUnit.facts.success_criteria}}\n\n## Functional Requirements\n{{workUnit.facts.functional_requirements}}\n\n## Non-Functional Requirements\n{{workUnit.facts.non_functional_requirements}}",
    },
  ],
  ux_design: [
    {
      idSuffix: "default",
      slotSuffix: "ux-design-specification",
      key: "default",
      displayName: "UX Design Specification Template",
      descriptionJson: toDescriptionJson(
        "Default template for the UX design specification artifact.",
      ),
      guidanceJson: toGuidanceJson(
        "Keep the UX spec structured around understanding, flows, components, and accessibility.",
      ),
      content:
        "# UX Design Specification\n\n## Project Understanding\n{{workUnit.facts.project_understanding}}\n\n## Core Experience\n{{workUnit.facts.core_experience}}\n\n## User Flows\n{{workUnit.facts.user_flow_specs}}\n\n## UX Requirements\n{{workUnit.facts.ux_design_requirements}}",
    },
    {
      idSuffix: "color-themes",
      slotSuffix: "ux-color-themes",
      key: "color_themes",
      displayName: "UX Color Themes Template",
      descriptionJson: toDescriptionJson(
        "Default template for the optional UX color themes artifact.",
      ),
      guidanceJson: toGuidanceJson(
        "Use when UX Design creates a dedicated color theme visualizer.",
      ),
      content:
        "<html><body><h1>UX Color Themes</h1><pre>{{workUnit.facts.visual_foundation}}</pre></body></html>",
    },
    {
      idSuffix: "design-directions",
      slotSuffix: "ux-design-directions",
      key: "design_directions",
      displayName: "UX Design Directions Template",
      descriptionJson: toDescriptionJson(
        "Default template for the optional UX design directions artifact.",
      ),
      guidanceJson: toGuidanceJson("Use when UX Design compares multiple visual directions."),
      content:
        "<html><body><h1>UX Design Directions</h1><pre>{{workUnit.facts.design_direction_decision}}</pre></body></html>",
    },
  ],
  architecture: [
    {
      idSuffix: "default",
      slotSuffix: "architecture-document",
      key: "default",
      displayName: "Architecture Document Template",
      descriptionJson: toDescriptionJson(
        "Default template for the Architecture decision document.",
      ),
      guidanceJson: toGuidanceJson(
        "Keep the architecture artifact structured around context, decisions, patterns, structure, and validation.",
      ),
      content:
        "# Architecture Decision Document\n\n## Project Context Analysis\n{{workUnit.facts.project_context_analysis}}\n\n## Architecture Decisions\n{{workUnit.facts.architecture_decisions}}\n\n## Implementation Patterns\n{{workUnit.facts.implementation_patterns}}\n\n## Validation Results\n{{workUnit.facts.validation_results}}",
    },
    {
      idSuffix: "adr",
      slotSuffix: "architecture-decision-records",
      key: "adr",
      displayName: "Architecture Decision Record Template",
      descriptionJson: toDescriptionJson(
        "Default template for an optional Architecture Decision Record artifact.",
      ),
      guidanceJson: toGuidanceJson("Use when Architecture emits a separate ADR artifact."),
      content: "# ADR\n\n{{workUnit.facts.architecture_decisions}}",
    },
  ],
};

function buildArtifactSlotTemplateSeedRowsFor(
  workUnitKey: WorkUnitKey,
  methodologyVersionId: CanonicalMethodologyVersionId,
): readonly MethodologyArtifactSlotTemplateSeedRow[] {
  return artifactTemplateDefinitionsByWorkUnit[workUnitKey].map((template) => ({
    id: slotTemplateId(workUnitKey, template.idSuffix, methodologyVersionId),
    methodologyVersionId,
    slotDefinitionId: slotDefinitionId(workUnitKey, template.slotSuffix, methodologyVersionId),
    key: template.key,
    displayName: template.displayName,
    descriptionJson: template.descriptionJson,
    guidanceJson: template.guidanceJson,
    content: template.content,
  }));
}

export const setupArtifactSlotTemplateSeedRows: readonly MethodologyArtifactSlotTemplateSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildArtifactSlotTemplateSeedRowsFor("setup", versionId),
  );
export const brainstormingArtifactSlotTemplateSeedRows: readonly MethodologyArtifactSlotTemplateSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildArtifactSlotTemplateSeedRowsFor("brainstorming", versionId),
  );
export const researchArtifactSlotTemplateSeedRows: readonly MethodologyArtifactSlotTemplateSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildArtifactSlotTemplateSeedRowsFor("research", versionId),
  );
export const productBriefArtifactSlotTemplateSeedRows: readonly MethodologyArtifactSlotTemplateSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildArtifactSlotTemplateSeedRowsFor("product_brief", versionId),
  );
export const prdArtifactSlotTemplateSeedRows: readonly MethodologyArtifactSlotTemplateSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildArtifactSlotTemplateSeedRowsFor("prd", versionId),
  );
export const uxDesignArtifactSlotTemplateSeedRows: readonly MethodologyArtifactSlotTemplateSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildArtifactSlotTemplateSeedRowsFor("ux_design", versionId),
  );
export const architectureArtifactSlotTemplateSeedRows: readonly MethodologyArtifactSlotTemplateSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildArtifactSlotTemplateSeedRowsFor("architecture", versionId),
  );

type WorkflowConfig = {
  readonly idSuffix: string;
  readonly key: string;
  readonly displayName: string;
  readonly descriptionJson: ReturnType<typeof toDescriptionJson>;
  readonly guidanceJson: ReturnType<typeof toGuidanceJson>;
  readonly metadataJson: Record<string, unknown>;
};

const workflowsByWorkUnit: Record<WorkUnitKey, readonly WorkflowConfig[]> = {
  setup: [
    {
      idSuffix: "setup-project",
      key: "setup_project",
      displayName: "Setup Project",
      descriptionJson: toDescriptionJson("Primary setup orchestration workflow."),
      guidanceJson: toGuidanceJson(
        "Use this workflow to capture setup intake, select the path, invoke early units when needed, and propagate durable setup outputs.",
      ),
      metadataJson: {
        family: "setup",
        intent: "primary_setup_orchestration",
        supports_modes: ["greenfield", "brownfield"],
        bound_by_default: true,
        primary_transition_key: "activation_to_done",
      },
    },
    {
      idSuffix: "document-project",
      key: "document_project",
      displayName: "Document Project",
      descriptionJson: toDescriptionJson(
        "Support workflow for brownfield project documentation and baseline discovery.",
      ),
      guidanceJson: toGuidanceJson(
        "Use only on the brownfield setup path to scan and document the existing project baseline.",
      ),
      metadataJson: {
        family: "setup",
        intent: "supporting_brownfield_documentation",
        supports_modes: ["brownfield"],
        bound_by_default: false,
      },
    },
    {
      idSuffix: "generate-project-context",
      key: "generate_project_context",
      displayName: "Generate Project Context",
      descriptionJson: toDescriptionJson(
        "Support workflow for generating or refreshing project-context artifacts during setup.",
      ),
      guidanceJson: toGuidanceJson(
        "Use only as a supporting setup workflow when project-context generation is needed.",
      ),
      metadataJson: {
        family: "setup",
        intent: "supporting_context_generation",
        supports_modes: ["greenfield", "brownfield"],
        bound_by_default: false,
      },
    },
  ],
  brainstorming: [
    {
      idSuffix: "brainstorming",
      key: "brainstorming",
      displayName: "Brainstorming",
      descriptionJson: toDescriptionJson(
        "Primary brainstorming workflow for structured ideation followed by convergence.",
      ),
      guidanceJson: toGuidanceJson(
        "Use this as the main Brainstorming workflow that frames the session, optionally runs techniques, then converges and propagates durable outputs.",
      ),
      metadataJson: {
        family: "brainstorming",
        intent: "primary_brainstorming_session",
        supports_modes: ["new", "continue"],
        bound_by_default: true,
        primary_transition_key: "activation_to_done",
      },
    },
    {
      idSuffix: "first-principles-analysis",
      key: "first_principles_analysis",
      displayName: "First Principles Analysis",
      descriptionJson: toDescriptionJson(
        "Support workflow for stripping assumptions and rebuilding a problem from fundamentals.",
      ),
      guidanceJson: toGuidanceJson(
        "Use as a Brainstorming support workflow when assumptions need to be challenged at the fundamentals level.",
      ),
      metadataJson: {
        family: "brainstorming",
        intent: "supporting_technique",
        supports_modes: ["support"],
        bound_by_default: false,
        source_workflow: "brainstorming",
        source_method_key: "first_principles_analysis",
      },
    },
    {
      idSuffix: "five-whys-deep-dive",
      key: "five_whys_deep_dive",
      displayName: "5 Whys Deep Dive",
      descriptionJson: toDescriptionJson("Support workflow for layered root-cause exploration."),
      guidanceJson: toGuidanceJson(
        "Use as a Brainstorming support workflow when repeated why-analysis is needed.",
      ),
      metadataJson: {
        family: "brainstorming",
        intent: "supporting_technique",
        supports_modes: ["support"],
        bound_by_default: false,
        source_workflow: "brainstorming",
        source_method_key: "five_whys_deep_dive",
      },
    },
    {
      idSuffix: "socratic-questioning",
      key: "socratic_questioning",
      displayName: "Socratic Questioning",
      descriptionJson: toDescriptionJson(
        "Support workflow for uncovering hidden assumptions through structured questioning.",
      ),
      guidanceJson: toGuidanceJson(
        "Use as a Brainstorming support workflow when assumptions and reasoning should be probed deliberately.",
      ),
      metadataJson: {
        family: "brainstorming",
        intent: "supporting_technique",
        supports_modes: ["support"],
        bound_by_default: false,
        source_workflow: "brainstorming",
        source_method_key: "socratic_questioning",
      },
    },
    {
      idSuffix: "stakeholder-round-table",
      key: "stakeholder_round_table",
      displayName: "Stakeholder Round Table",
      descriptionJson: toDescriptionJson(
        "Support workflow for comparing multiple stakeholder viewpoints.",
      ),
      guidanceJson: toGuidanceJson(
        "Use as a Brainstorming support workflow when explicit multi-perspective comparison is valuable.",
      ),
      metadataJson: {
        family: "brainstorming",
        intent: "supporting_technique",
        supports_modes: ["support"],
        bound_by_default: false,
        source_workflow: "brainstorming",
        source_method_key: "stakeholder_round_table",
      },
    },
    {
      idSuffix: "critique-and-refine",
      key: "critique_and_refine",
      displayName: "Critique and Refine",
      descriptionJson: toDescriptionJson(
        "Support workflow for challenging and improving candidate directions before convergence.",
      ),
      guidanceJson: toGuidanceJson(
        "Use as a Brainstorming support workflow when promising directions need structured critique.",
      ),
      metadataJson: {
        family: "brainstorming",
        intent: "supporting_technique",
        supports_modes: ["support"],
        bound_by_default: false,
        source_workflow: "brainstorming",
        source_method_key: "critique_and_refine",
      },
    },
  ],
  research: [
    {
      idSuffix: "market-research",
      key: "market_research",
      displayName: "Market Research",
      descriptionJson: toDescriptionJson("Primary workflow for market analysis."),
      guidanceJson: toGuidanceJson(
        "Use for market-focused research on customers, alternatives, competition, and opportunity framing.",
      ),
      metadataJson: {
        family: "research",
        intent: "market_analysis",
        supports_modes: ["new", "continue"],
        bound_by_default: true,
        primary_transition_key: "activation_to_done",
      },
    },
    {
      idSuffix: "domain-research",
      key: "domain_research",
      displayName: "Domain Research",
      descriptionJson: toDescriptionJson("Primary workflow for domain analysis."),
      guidanceJson: toGuidanceJson(
        "Use for domain-focused research on industry structure, actors, compliance, and trends.",
      ),
      metadataJson: {
        family: "research",
        intent: "domain_analysis",
        supports_modes: ["new", "continue"],
        bound_by_default: true,
        primary_transition_key: "activation_to_done",
      },
    },
    {
      idSuffix: "technical-research",
      key: "technical_research",
      displayName: "Technical Research",
      descriptionJson: toDescriptionJson("Primary workflow for technical analysis."),
      guidanceJson: toGuidanceJson(
        "Use for technical research on feasibility, architecture tradeoffs, tooling, and implementation constraints.",
      ),
      metadataJson: {
        family: "research",
        intent: "technical_analysis",
        supports_modes: ["new", "continue"],
        bound_by_default: true,
        primary_transition_key: "activation_to_done",
      },
    },
  ],
  product_brief: [
    {
      idSuffix: "create-product-brief",
      key: "create_product_brief",
      displayName: "Create Product Brief",
      descriptionJson: toDescriptionJson(
        "Primary workflow for creating or updating an executive Product Brief.",
      ),
      guidanceJson: toGuidanceJson(
        "Use this workflow to understand product intent, absorb source context, author the brief, review it, and propagate durable outputs.",
      ),
      metadataJson: {
        family: "product_brief",
        intent: "create_or_update_executive_product_brief",
        supports_modes: ["guided", "yolo", "autonomous"],
        bound_by_default: true,
        primary_transition_key: "activation_to_done",
      },
    },
  ],
  prd: [
    {
      idSuffix: "create-prd",
      key: "create_prd",
      displayName: "Create PRD",
      descriptionJson: toDescriptionJson(
        "Primary workflow for creating a Product Requirements Document.",
      ),
      guidanceJson: toGuidanceJson(
        "Use this workflow to convert a Product Brief or direct context into the PRD requirement contract.",
      ),
      metadataJson: {
        family: "prd",
        intent: "create_product_requirements_document",
        supports_modes: ["guided", "autonomous"],
        bound_by_default: true,
        primary_transition_key: "activation_to_done",
      },
    },
  ],
  ux_design: [
    {
      idSuffix: "create-ux-design",
      key: "create_ux_design",
      displayName: "Create UX Design",
      descriptionJson: toDescriptionJson(
        "Primary workflow for creating a UX design specification.",
      ),
      guidanceJson: toGuidanceJson(
        "Use this workflow to turn PRD journeys and requirements into a durable UX design contract.",
      ),
      metadataJson: {
        family: "ux_design",
        intent: "create_ux_design_specification",
        supports_modes: ["guided", "autonomous"],
        bound_by_default: true,
        primary_transition_key: "activation_to_done",
      },
    },
  ],
  architecture: [
    {
      idSuffix: "create-architecture",
      key: "create_architecture",
      displayName: "Create Architecture",
      descriptionJson: toDescriptionJson(
        "Primary workflow for creating the Architecture decision document and structured architecture facts.",
      ),
      guidanceJson: toGuidanceJson(
        "Use this workflow to turn PRD and optional UX/Research context into architecture decisions, patterns, validation, and handoff guidance.",
      ),
      metadataJson: {
        family: "architecture",
        intent: "create_architecture_decision_document",
        supports_modes: ["guided", "autonomous"],
        bound_by_default: true,
        primary_transition_key: "activation_to_done",
      },
    },
    {
      idSuffix: "record-architecture-decision",
      key: "record_architecture_decision",
      displayName: "Record Architecture Decision",
      descriptionJson: toDescriptionJson(
        "Support workflow for capturing or refining an individual architecture decision record.",
      ),
      guidanceJson: toGuidanceJson(
        "Use as an unbound support workflow when one architecture decision needs deeper capture.",
      ),
      metadataJson: {
        family: "architecture",
        intent: "capture_individual_architecture_decision_record",
        supports_modes: ["support"],
        bound_by_default: false,
      },
    },
  ],
};

const workflowEntryStepKeys: Partial<Record<WorkUnitKey, Record<string, string>>> = {
  setup: {
    "setup-project": "collect_setup_baseline",
    "document-project": "document_project_agent",
    "generate-project-context": "scan_project_context_sources",
  },
  brainstorming: {
    brainstorming: "setup_brainstorming_session",
    "first-principles-analysis": "run_first_principles_analysis",
    "five-whys-deep-dive": "run_five_whys_deep_dive",
    "socratic-questioning": "run_socratic_questioning",
    "stakeholder-round-table": "run_stakeholder_round_table",
    "critique-and-refine": "run_critique_and_refine",
  },
  research: {
    "market-research": "research_scope_confirmation",
    "domain-research": "research_scope_confirmation",
    "technical-research": "research_scope_confirmation",
  },
  product_brief: {
    "create-product-brief": "brief_intent_agent",
  },
  prd: {
    "create-prd": "prd_input_initialization_agent",
  },
  ux_design: {
    "create-ux-design": "ux_input_initialization_agent",
  },
  architecture: {
    "create-architecture": "architecture_input_initialization_agent",
    "record-architecture-decision": "record_architecture_decision",
  },
};

function buildWorkflowSeedRowsFor(
  workUnitKey: WorkUnitKey,
  methodologyVersionId: CanonicalMethodologyVersionId,
): readonly MethodologyWorkflowSeedRow[] {
  return workflowsByWorkUnit[workUnitKey].map((workflow) => ({
    id: workflowId(workUnitKey, workflow.idSuffix, methodologyVersionId),
    methodologyVersionId,
    workUnitTypeId: workUnitTypeId(workUnitKey, methodologyVersionId),
    key: workflow.key,
    displayName: workflow.displayName,
    descriptionJson: workflow.descriptionJson,
    metadataJson: {
      ...workflow.metadataJson,
      entryStepId: workflowEntryStepIdFor(workUnitKey, workflow.idSuffix, methodologyVersionId),
    },
    guidanceJson: workflow.guidanceJson,
  }));
}

export const setupWorkflowSeedRows: readonly MethodologyWorkflowSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) => buildWorkflowSeedRowsFor("setup", versionId));
export const brainstormingWorkflowSeedRows: readonly MethodologyWorkflowSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildWorkflowSeedRowsFor("brainstorming", versionId),
  );
export const researchWorkflowSeedRows: readonly MethodologyWorkflowSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) => buildWorkflowSeedRowsFor("research", versionId));
export const productBriefWorkflowSeedRows: readonly MethodologyWorkflowSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildWorkflowSeedRowsFor("product_brief", versionId),
  );
export const prdWorkflowSeedRows: readonly MethodologyWorkflowSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) => buildWorkflowSeedRowsFor("prd", versionId));
export const uxDesignWorkflowSeedRows: readonly MethodologyWorkflowSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) => buildWorkflowSeedRowsFor("ux_design", versionId));
export const architectureWorkflowSeedRows: readonly MethodologyWorkflowSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildWorkflowSeedRowsFor("architecture", versionId),
  );

type SectionAContextFactSpec =
  | {
      readonly key: string;
      readonly label: string;
      readonly kind: "plain_fact";
      readonly cardinality: "one" | "many";
      readonly valueType: "string" | "number" | "boolean" | "json";
    }
  | {
      readonly key: string;
      readonly label: string;
      readonly kind: "bound_fact";
      readonly cardinality: "one" | "many";
      readonly bindingKey: string;
    }
  | {
      readonly key: string;
      readonly label: string;
      readonly kind: "artifact_slot_reference_fact";
      readonly cardinality: "one" | "many";
      readonly slotWorkUnitKey: WorkUnitKey;
      readonly slotSuffix: string;
    }
  | {
      readonly key: string;
      readonly label: string;
      readonly kind: "work_unit_draft_spec_fact";
      readonly cardinality: "one" | "many";
      readonly targetWorkUnitKey: WorkUnitKey;
      readonly selectedFactKeys: readonly string[];
      readonly selectedArtifactSlotSuffixes?: readonly string[];
    };

type SectionAFormFieldSpec = {
  readonly key: string;
  readonly label: string;
  readonly contextFactKey: string;
  readonly valueType: "string" | "number" | "boolean" | "json";
  readonly required?: boolean;
};

type SectionAStepSpec = {
  readonly key: string;
  readonly type: "form" | "agent" | "action" | "invoke" | "branch";
  readonly displayName: string;
  readonly formFields?: readonly SectionAFormFieldSpec[];
  readonly agentConfig?: {
    readonly objective: string;
    readonly instructionsMarkdown: string;
    readonly readContextFactKeys?: readonly string[];
    readonly writeContextFactKeys?: readonly string[];
    readonly writeItemRequirementContextFactKeysByWriteKey?: Readonly<
      Record<string, readonly string[]>
    >;
    readonly completionRequirementContextFactKeys?: readonly string[];
  };
  readonly actionConfig?: {
    readonly actions: readonly {
      readonly actionId: string;
      readonly actionKey: string;
      readonly label: string;
      readonly contextFactKey: string;
      readonly contextFactKind: "bound_fact" | "artifact_slot_reference_fact";
      readonly items: readonly {
        readonly itemId: string;
        readonly itemKey: string;
        readonly label: string;
        readonly targetContextFactKey: string;
      }[];
    }[];
  };
  readonly branchConfig?: {
    readonly defaultTargetStepKey: string | null;
    readonly routes: readonly {
      readonly routeId: string;
      readonly targetStepKey: string;
      readonly conditionMode: "all" | "any";
      readonly groups: readonly {
        readonly groupId: string;
        readonly mode: "all" | "any";
        readonly conditions: readonly {
          readonly conditionId: string;
          readonly contextFactKey: string;
          readonly operator:
            | "exists"
            | "equals"
            | "work_unit_instance_exists"
            | "work_unit_instance_exists_in_state";
          readonly isNegated?: boolean;
          readonly comparisonJson?: unknown;
          readonly subFieldKey?: string | null;
          readonly workUnitTypeKey?: string;
          readonly stateKeys?: readonly string[];
          readonly minCount?: number;
        }[];
      }[];
    }[];
  };
  readonly invokeConfig?: {
    readonly targetKind: "workflow" | "work_unit";
    readonly sourceMode: "fixed_set" | "context_fact_backed";
    readonly workflowSuffixes?: readonly string[];
    readonly workUnitKey?: WorkUnitKey;
    readonly contextFactKey?: string;
    readonly bindings?: readonly {
      readonly destinationKind: "work_unit_fact" | "artifact_slot";
      readonly destinationWorkUnitKey?: WorkUnitKey;
      readonly destinationFactKey?: string;
      readonly destinationSlotWorkUnitKey?: WorkUnitKey;
      readonly destinationSlotSuffix?: string;
      readonly sourceKind: "context_fact" | "literal" | "runtime";
      readonly contextFactKey?: string;
      readonly literalValue?: string | number | boolean;
    }[];
    readonly activationTransitions?: readonly {
      readonly workUnitKey: WorkUnitKey;
      readonly transitionSuffix: string;
      readonly workflowSuffixes: readonly string[];
    }[];
  };
};

type SectionAWorkflowAuthoringSpec = {
  readonly workUnitKey: WorkUnitKey;
  readonly workflowSuffix: string;
  readonly contextFacts: readonly SectionAContextFactSpec[];
  readonly steps: readonly SectionAStepSpec[];
  readonly explicitEdges?: readonly {
    readonly fromStepKey: string;
    readonly toStepKey: string;
  }[];
};

type SectionAWorkflowFixtureBundle = {
  readonly methodology_workflow_steps: readonly MethodologyWorkflowStepSeedRow[];
  readonly methodology_workflow_edges: readonly MethodologyWorkflowEdgeSeedRow[];
  readonly methodologyWorkflowContextFactDefinitions: readonly MethodologyWorkflowContextFactDefinitionSeedRow[];
  readonly methodologyWorkflowContextFactPlainValues: readonly MethodologyWorkflowContextFactPlainValueSeedRow[];
  readonly methodologyWorkflowContextFactExternalBindings: readonly MethodologyWorkflowContextFactExternalBindingSeedRow[];
  readonly methodologyWorkflowContextFactWorkflowReferences: readonly [];
  readonly methodologyWorkflowContextFactArtifactReferences: readonly MethodologyWorkflowContextFactArtifactReferenceSeedRow[];
  readonly methodologyWorkflowContextFactDraftSpecs: readonly MethodologyWorkflowContextFactDraftSpecSeedRow[];
  readonly methodologyWorkflowContextFactDraftSpecSelections: readonly MethodologyWorkflowContextFactDraftSpecSelectionSeedRow[];
  readonly methodologyWorkflowContextFactDraftSpecFacts: readonly MethodologyWorkflowContextFactDraftSpecFactSeedRow[];
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

const sectionAWorkflowAuthoringSpecs: readonly SectionAWorkflowAuthoringSpec[] = [
  {
    workUnitKey: "setup",
    workflowSuffix: "setup-project",
    contextFacts: [
      {
        key: "initiative_name_ctx",
        label: "Initiative Name",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "initiative_name",
      },
      {
        key: "project_kind_ctx",
        label: "Project Kind",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "project_kind",
      },
      {
        key: "project_knowledge_directory_ctx",
        label: "Project Knowledge Directory",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "project_knowledge_directory",
      },
      {
        key: "planning_artifacts_directory_ctx",
        label: "Planning Artifacts Directory",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "planning_artifacts_directory",
      },
      {
        key: "communication_language_ctx",
        label: "Communication Language",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "communication_language",
      },
      {
        key: "document_output_language_ctx",
        label: "Document Output Language",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "document_output_language",
      },
      {
        key: "workflow_mode_ctx",
        label: "Workflow Mode",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "workflow_mode",
      },
      {
        key: "scan_level_ctx",
        label: "Scan Level",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "scan_level",
      },
      {
        key: "deep_dive_target_ctx",
        label: "Deep Dive Target",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "deep_dive_target",
      },
      {
        key: "repository_type_ctx",
        label: "Repository Type",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "repository_type",
      },
      {
        key: "project_parts_ctx",
        label: "Project Parts",
        kind: "bound_fact",
        cardinality: "many",
        bindingKey: "project_parts",
      },
      {
        key: "technology_stack_by_part_ctx",
        label: "Technology Stack By Part",
        kind: "bound_fact",
        cardinality: "many",
        bindingKey: "technology_stack_by_part",
      },
      {
        key: "existing_documentation_inventory_ctx",
        label: "Existing Documentation Inventory",
        kind: "bound_fact",
        cardinality: "many",
        bindingKey: "existing_documentation_inventory",
      },
      {
        key: "integration_points_ctx",
        label: "Integration Points",
        kind: "bound_fact",
        cardinality: "many",
        bindingKey: "integration_points",
      },
      {
        key: "requires_brainstorming_ctx",
        label: "Requires Brainstorming",
        kind: "plain_fact",
        cardinality: "one",
        valueType: "boolean",
      },
      {
        key: "requires_product_brief_ctx",
        label: "Requires Product Brief",
        kind: "plain_fact",
        cardinality: "one",
        valueType: "boolean",
      },
      {
        key: "requires_research_ctx",
        label: "Requires Research",
        kind: "plain_fact",
        cardinality: "one",
        valueType: "boolean",
      },
      {
        key: "setup_path_summary_ctx",
        label: "Setup Path Summary",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "setup_path_summary",
      },
      {
        key: "next_recommended_work_unit_ctx",
        label: "Next Recommended Work Unit",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "next_recommended_work_unit",
      },
      {
        key: "project_overview_artifact_ctx",
        label: "Project Overview Artifact",
        kind: "artifact_slot_reference_fact",
        cardinality: "one",
        slotWorkUnitKey: "setup",
        slotSuffix: "project-overview",
      },
      {
        key: "brainstorming_draft_spec_ctx",
        label: "Brainstorming Draft Spec",
        kind: "work_unit_draft_spec_fact",
        cardinality: "many",
        targetWorkUnitKey: "brainstorming",
        selectedFactKeys: ["setup_work_unit", "desired_outcome", "objectives", "constraints"],
        selectedArtifactSlotSuffixes: ["brainstorming-session"],
      },
      {
        key: "research_draft_spec_ctx",
        label: "Research Draft Spec",
        kind: "work_unit_draft_spec_fact",
        cardinality: "many",
        targetWorkUnitKey: "research",
        selectedFactKeys: ["setup_work_unit", "research_topic", "research_goals"],
        selectedArtifactSlotSuffixes: ["research-report"],
      },
    ],
    steps: [
      {
        key: "collect_setup_baseline",
        type: "form",
        displayName: "Collect Setup Baseline",
        formFields: [
          {
            key: "initiative_name",
            label: "Initiative Name",
            contextFactKey: "initiative_name_ctx",
            valueType: "string",
            required: true,
          },
          {
            key: "project_kind",
            label: "Project Kind",
            contextFactKey: "project_kind_ctx",
            valueType: "string",
            required: true,
          },
          {
            key: "project_knowledge_directory",
            label: "Project Knowledge Directory",
            contextFactKey: "project_knowledge_directory_ctx",
            valueType: "string",
            required: false,
          },
          {
            key: "planning_artifacts_directory",
            label: "Planning Artifacts Directory",
            contextFactKey: "planning_artifacts_directory_ctx",
            valueType: "string",
            required: false,
          },
          {
            key: "communication_language",
            label: "Communication Language",
            contextFactKey: "communication_language_ctx",
            valueType: "string",
            required: false,
          },
          {
            key: "document_output_language",
            label: "Document Output Language",
            contextFactKey: "document_output_language_ctx",
            valueType: "string",
            required: false,
          },
        ],
      },
      {
        key: "branch_project_kind",
        type: "branch",
        displayName: "Branch Project Kind",
        branchConfig: {
          defaultTargetStepKey: null,
          routes: [
            {
              routeId: "greenfield_route",
              targetStepKey: "greenfield_setup_agent",
              conditionMode: "all",
              groups: [
                {
                  groupId: "greenfield_group",
                  mode: "all",
                  conditions: [
                    {
                      conditionId: "project_kind_greenfield",
                      contextFactKey: "project_kind_ctx",
                      operator: "equals",
                      comparisonJson: { value: "greenfield" },
                    },
                  ],
                },
              ],
            },
            {
              routeId: "brownfield_route",
              targetStepKey: "brownfield_scan_preferences",
              conditionMode: "all",
              groups: [
                {
                  groupId: "brownfield_group",
                  mode: "all",
                  conditions: [
                    {
                      conditionId: "project_kind_brownfield",
                      contextFactKey: "project_kind_ctx",
                      operator: "equals",
                      comparisonJson: { value: "brownfield" },
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
      {
        key: "greenfield_setup_agent",
        type: "agent",
        displayName: "Greenfield Setup Agent",
        agentConfig: {
          objective:
            "Discuss the project, clarify what is being built, and emit routing signals for greenfield downstream work.",
          instructionsMarkdown:
            "Use the setup baseline to understand the project at a high level. Decide whether brainstorming, research, and product brief work should be created. Produce the project overview artifact and setup routing outputs without inventing detailed requirements.",
          readContextFactKeys: [
            "initiative_name_ctx",
            "project_kind_ctx",
            "project_knowledge_directory_ctx",
            "planning_artifacts_directory_ctx",
            "communication_language_ctx",
            "document_output_language_ctx",
          ],
          writeContextFactKeys: [
            "project_knowledge_directory_ctx",
            "planning_artifacts_directory_ctx",
            "communication_language_ctx",
            "document_output_language_ctx",
            "repository_type_ctx",
            "project_parts_ctx",
            "technology_stack_by_part_ctx",
            "existing_documentation_inventory_ctx",
            "integration_points_ctx",
            "requires_brainstorming_ctx",
            "requires_product_brief_ctx",
            "requires_research_ctx",
            "setup_path_summary_ctx",
            "next_recommended_work_unit_ctx",
            "project_overview_artifact_ctx",
            "brainstorming_draft_spec_ctx",
            "research_draft_spec_ctx",
          ],
          writeItemRequirementContextFactKeysByWriteKey: {
            brainstorming_draft_spec_ctx: ["requires_brainstorming_ctx"],
            research_draft_spec_ctx: ["requires_research_ctx"],
          },
          completionRequirementContextFactKeys: [
            "requires_brainstorming_ctx",
            "requires_product_brief_ctx",
            "requires_research_ctx",
            "setup_path_summary_ctx",
            "next_recommended_work_unit_ctx",
            "project_overview_artifact_ctx",
          ],
        },
      },
      {
        key: "brownfield_scan_preferences",
        type: "form",
        displayName: "Brownfield Scan Preferences",
        formFields: [
          {
            key: "workflow_mode",
            label: "Workflow Mode",
            contextFactKey: "workflow_mode_ctx",
            valueType: "string",
            required: true,
          },
          {
            key: "scan_level",
            label: "Scan Level",
            contextFactKey: "scan_level_ctx",
            valueType: "string",
            required: true,
          },
          {
            key: "deep_dive_target",
            label: "Deep Dive Target",
            contextFactKey: "deep_dive_target_ctx",
            valueType: "json",
            required: false,
          },
        ],
      },
      {
        key: "invoke_document_project",
        type: "invoke",
        displayName: "Invoke Document Project",
        invokeConfig: {
          targetKind: "workflow",
          sourceMode: "fixed_set",
          workflowSuffixes: ["document-project"],
        },
      },
      {
        key: "branch_need_brainstorming",
        type: "branch",
        displayName: "Branch Need Brainstorming",
        branchConfig: {
          defaultTargetStepKey: "branch_need_research",
          routes: [
            {
              routeId: "needs_brainstorming",
              targetStepKey: "invoke_brainstorming_work",
              conditionMode: "all",
              groups: [
                {
                  groupId: "needs_brainstorming_group",
                  mode: "all",
                  conditions: [
                    {
                      conditionId: "requires_brainstorming_true",
                      contextFactKey: "requires_brainstorming_ctx",
                      operator: "equals",
                      comparisonJson: { value: true },
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
      {
        key: "invoke_brainstorming_work",
        type: "invoke",
        displayName: "Invoke Brainstorming Work",
        invokeConfig: {
          targetKind: "work_unit",
          sourceMode: "context_fact_backed",
          contextFactKey: "brainstorming_draft_spec_ctx",
          bindings: [
            {
              destinationKind: "work_unit_fact",
              destinationWorkUnitKey: "brainstorming",
              destinationFactKey: "setup_work_unit",
              sourceKind: "runtime",
            },
          ],
          activationTransitions: [
            {
              workUnitKey: "brainstorming",
              transitionSuffix: "activation-to-done",
              workflowSuffixes: ["brainstorming"],
            },
          ],
        },
      },
      {
        key: "branch_need_research",
        type: "branch",
        displayName: "Branch Need Research",
        branchConfig: {
          defaultTargetStepKey: "branch_need_product_brief",
          routes: [
            {
              routeId: "needs_research",
              targetStepKey: "invoke_research_work",
              conditionMode: "all",
              groups: [
                {
                  groupId: "needs_research_group",
                  mode: "all",
                  conditions: [
                    {
                      conditionId: "requires_research_true",
                      contextFactKey: "requires_research_ctx",
                      operator: "equals",
                      comparisonJson: { value: true },
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
      {
        key: "invoke_research_work",
        type: "invoke",
        displayName: "Invoke Research Work",
        invokeConfig: {
          targetKind: "work_unit",
          sourceMode: "context_fact_backed",
          contextFactKey: "research_draft_spec_ctx",
          bindings: [
            {
              destinationKind: "work_unit_fact",
              destinationWorkUnitKey: "research",
              destinationFactKey: "setup_work_unit",
              sourceKind: "runtime",
            },
          ],
          activationTransitions: [
            {
              workUnitKey: "research",
              transitionSuffix: "activation-to-done",
              workflowSuffixes: ["market-research", "domain-research", "technical-research"],
            },
          ],
        },
      },
      {
        key: "branch_need_product_brief",
        type: "branch",
        displayName: "Branch Need Product Brief",
        branchConfig: {
          defaultTargetStepKey: "propagate_setup_outputs",
          routes: [
            {
              routeId: "needs_product_brief",
              targetStepKey: "invoke_product_brief_work",
              conditionMode: "all",
              groups: [
                {
                  groupId: "needs_product_brief_group",
                  mode: "all",
                  conditions: [
                    {
                      conditionId: "requires_product_brief_true",
                      contextFactKey: "requires_product_brief_ctx",
                      operator: "equals",
                      comparisonJson: { value: true },
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
      {
        key: "invoke_product_brief_work",
        type: "invoke",
        displayName: "Invoke Product Brief Work",
        invokeConfig: {
          targetKind: "work_unit",
          sourceMode: "fixed_set",
          workUnitKey: "product_brief",
          bindings: [
            {
              destinationKind: "work_unit_fact",
              destinationWorkUnitKey: "product_brief",
              destinationFactKey: "setup_work_unit",
              sourceKind: "runtime",
            },
          ],
          activationTransitions: [
            {
              workUnitKey: "product_brief",
              transitionSuffix: "activation-to-done",
              workflowSuffixes: ["create-product-brief"],
            },
          ],
        },
      },
      {
        key: "propagate_setup_outputs",
        type: "action",
        displayName: "Propagate Setup Outputs",
        actionConfig: {
          actions: [
            {
              actionId: "propagate_setup_bound_facts",
              actionKey: "propagate_setup_bound_facts",
              label: "Propagate Setup Bound Facts",
              contextFactKey: "initiative_name_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "initiative_name",
                  itemKey: "setup.initiative_name",
                  label: "Initiative Name",
                  targetContextFactKey: "initiative_name_ctx",
                },
                {
                  itemId: "project_kind",
                  itemKey: "setup.project_kind",
                  label: "Project Kind",
                  targetContextFactKey: "project_kind_ctx",
                },
                {
                  itemId: "project_knowledge_directory",
                  itemKey: "setup.project_knowledge_directory",
                  label: "Project Knowledge Directory",
                  targetContextFactKey: "project_knowledge_directory_ctx",
                },
                {
                  itemId: "planning_artifacts_directory",
                  itemKey: "setup.planning_artifacts_directory",
                  label: "Planning Artifacts Directory",
                  targetContextFactKey: "planning_artifacts_directory_ctx",
                },
                {
                  itemId: "communication_language",
                  itemKey: "setup.communication_language",
                  label: "Communication Language",
                  targetContextFactKey: "communication_language_ctx",
                },
                {
                  itemId: "document_output_language",
                  itemKey: "setup.document_output_language",
                  label: "Document Output Language",
                  targetContextFactKey: "document_output_language_ctx",
                },
                {
                  itemId: "workflow_mode",
                  itemKey: "setup.workflow_mode",
                  label: "Workflow Mode",
                  targetContextFactKey: "workflow_mode_ctx",
                },
                {
                  itemId: "scan_level",
                  itemKey: "setup.scan_level",
                  label: "Scan Level",
                  targetContextFactKey: "scan_level_ctx",
                },
                {
                  itemId: "deep_dive_target",
                  itemKey: "setup.deep_dive_target",
                  label: "Deep Dive Target",
                  targetContextFactKey: "deep_dive_target_ctx",
                },
                {
                  itemId: "repository_type",
                  itemKey: "setup.repository_type",
                  label: "Repository Type",
                  targetContextFactKey: "repository_type_ctx",
                },
                {
                  itemId: "project_parts",
                  itemKey: "setup.project_parts",
                  label: "Project Parts",
                  targetContextFactKey: "project_parts_ctx",
                },
                {
                  itemId: "technology_stack_by_part",
                  itemKey: "setup.technology_stack_by_part",
                  label: "Technology Stack By Part",
                  targetContextFactKey: "technology_stack_by_part_ctx",
                },
                {
                  itemId: "existing_documentation_inventory",
                  itemKey: "setup.existing_documentation_inventory",
                  label: "Existing Documentation Inventory",
                  targetContextFactKey: "existing_documentation_inventory_ctx",
                },
                {
                  itemId: "integration_points",
                  itemKey: "setup.integration_points",
                  label: "Integration Points",
                  targetContextFactKey: "integration_points_ctx",
                },
                {
                  itemId: "setup_path_summary",
                  itemKey: "setup.setup_path_summary",
                  label: "Setup Path Summary",
                  targetContextFactKey: "setup_path_summary_ctx",
                },
                {
                  itemId: "next_recommended_work_unit",
                  itemKey: "setup.next_recommended_work_unit",
                  label: "Next Recommended Work Unit",
                  targetContextFactKey: "next_recommended_work_unit_ctx",
                },
              ],
            },
            {
              actionId: "propagate_project_overview",
              actionKey: "propagate_project_overview",
              label: "Propagate Project Overview",
              contextFactKey: "project_overview_artifact_ctx",
              contextFactKind: "artifact_slot_reference_fact",
              items: [
                {
                  itemId: "project_overview_artifact",
                  itemKey: "setup.project_overview",
                  label: "Project Overview Artifact",
                  targetContextFactKey: "project_overview_artifact_ctx",
                },
              ],
            },
          ],
        },
      },
    ],
    explicitEdges: [
      { fromStepKey: "collect_setup_baseline", toStepKey: "branch_project_kind" },
      { fromStepKey: "greenfield_setup_agent", toStepKey: "branch_need_brainstorming" },
      { fromStepKey: "brownfield_scan_preferences", toStepKey: "invoke_document_project" },
      { fromStepKey: "invoke_document_project", toStepKey: "propagate_setup_outputs" },
      { fromStepKey: "invoke_brainstorming_work", toStepKey: "branch_need_research" },
      { fromStepKey: "invoke_research_work", toStepKey: "branch_need_product_brief" },
      { fromStepKey: "invoke_product_brief_work", toStepKey: "propagate_setup_outputs" },
    ],
  },
  {
    workUnitKey: "setup",
    workflowSuffix: "document-project",
    contextFacts: [
      {
        key: "workflow_mode_ctx",
        label: "Workflow Mode",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "workflow_mode",
      },
      {
        key: "scan_level_ctx",
        label: "Scan Level",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "scan_level",
      },
      {
        key: "deep_dive_target_ctx",
        label: "Deep Dive Target",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "deep_dive_target",
      },
      {
        key: "repository_type_ctx",
        label: "Repository Type",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "repository_type",
      },
      {
        key: "project_parts_ctx",
        label: "Project Parts",
        kind: "bound_fact",
        cardinality: "many",
        bindingKey: "project_parts",
      },
      {
        key: "technology_stack_by_part_ctx",
        label: "Technology Stack By Part",
        kind: "bound_fact",
        cardinality: "many",
        bindingKey: "technology_stack_by_part",
      },
      {
        key: "existing_documentation_inventory_ctx",
        label: "Existing Documentation Inventory",
        kind: "bound_fact",
        cardinality: "many",
        bindingKey: "existing_documentation_inventory",
      },
      {
        key: "integration_points_ctx",
        label: "Integration Points",
        kind: "bound_fact",
        cardinality: "many",
        bindingKey: "integration_points",
      },
      {
        key: "brownfield_docs_index_artifact_ctx",
        label: "Brownfield Docs Index Artifact",
        kind: "artifact_slot_reference_fact",
        cardinality: "one",
        slotWorkUnitKey: "setup",
        slotSuffix: "brownfield-docs-index",
      },
    ],
    steps: [
      {
        key: "document_project_agent",
        type: "agent",
        displayName: "Document Project Agent",
        agentConfig: {
          objective:
            "Scan and document the brownfield project baseline based on the selected scan settings.",
          instructionsMarkdown:
            "Use the selected scan mode and level to inspect the existing project and write the brownfield docs index artifact along with repository baseline facts.",
          readContextFactKeys: ["workflow_mode_ctx", "scan_level_ctx", "deep_dive_target_ctx"],
          writeContextFactKeys: [
            "project_knowledge_directory_ctx",
            "planning_artifacts_directory_ctx",
            "communication_language_ctx",
            "document_output_language_ctx",
            "repository_type_ctx",
            "project_parts_ctx",
            "technology_stack_by_part_ctx",
            "existing_documentation_inventory_ctx",
            "integration_points_ctx",
            "brownfield_docs_index_artifact_ctx",
          ],
          completionRequirementContextFactKeys: ["brownfield_docs_index_artifact_ctx"],
        },
      },
    ],
  },
  {
    workUnitKey: "setup",
    workflowSuffix: "generate-project-context",
    contextFacts: [
      {
        key: "project_context_notes_ctx",
        label: "Project Context Notes",
        kind: "plain_fact",
        cardinality: "one",
        valueType: "json",
      },
      {
        key: "project_context_artifact_ctx",
        label: "Project Context Artifact",
        kind: "artifact_slot_reference_fact",
        cardinality: "one",
        slotWorkUnitKey: "setup",
        slotSuffix: "project-context",
      },
    ],
    steps: [
      {
        key: "scan_project_context_sources",
        type: "agent",
        displayName: "Scan Project Context Sources",
      },
      {
        key: "write_project_context_artifact",
        type: "agent",
        displayName: "Write Project Context Artifact",
      },
    ],
  },
  {
    workUnitKey: "brainstorming",
    workflowSuffix: "brainstorming",
    contextFacts: [
      {
        key: "brainstorming_focus_ctx",
        label: "Brainstorming Focus",
        kind: "plain_fact",
        cardinality: "one",
        valueType: "string",
      },
      {
        key: "desired_outcome_ctx",
        label: "Desired Outcome",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "desired_outcome",
      },
      {
        key: "objectives_ctx",
        label: "Objectives",
        kind: "plain_fact",
        cardinality: "many",
        valueType: "json",
      },
      {
        key: "constraints_ctx",
        label: "Constraints",
        kind: "plain_fact",
        cardinality: "one",
        valueType: "json",
      },
      {
        key: "selected_directions_ctx",
        label: "Selected Directions",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "selected_directions",
      },
      {
        key: "follow_up_research_topics_ctx",
        label: "Follow-up Research Topics",
        kind: "plain_fact",
        cardinality: "many",
        valueType: "json",
      },
      {
        key: "brainstorming_session_artifact_ctx",
        label: "Brainstorming Session Artifact",
        kind: "artifact_slot_reference_fact",
        cardinality: "one",
        slotWorkUnitKey: "brainstorming",
        slotSuffix: "brainstorming-session",
      },
    ],
    steps: [
      {
        key: "setup_brainstorming_session",
        type: "form",
        displayName: "Setup Brainstorming Session",
        formFields: [
          {
            key: "brainstorming_focus",
            label: "Brainstorming Focus",
            contextFactKey: "brainstorming_focus_ctx",
            valueType: "string",
            required: true,
          },
          {
            key: "desired_outcome",
            label: "Desired Outcome",
            contextFactKey: "desired_outcome_ctx",
            valueType: "string",
            required: true,
          },
        ],
      },
      {
        key: "facilitate_brainstorming_session",
        type: "agent",
        displayName: "Facilitate Brainstorming Session",
      },
      {
        key: "converge_brainstorming_session",
        type: "agent",
        displayName: "Converge Brainstorming Session",
      },
    ],
  },
  ...(
    [
      "first-principles-analysis",
      "five-whys-deep-dive",
      "socratic-questioning",
      "stakeholder-round-table",
      "critique-and-refine",
    ] as const
  ).map((workflowSuffix) => ({
    workUnitKey: "brainstorming" as const,
    workflowSuffix,
    contextFacts: [
      {
        key: "technique_focus_ctx",
        label: "Technique Focus",
        kind: "plain_fact",
        cardinality: "one",
        valueType: "string",
      },
      {
        key: "technique_output_ctx",
        label: "Technique Output",
        kind: "plain_fact",
        cardinality: "many",
        valueType: "json",
      },
    ],
    steps: [
      {
        key: `run_${workflowSuffix.replaceAll("-", "_")}`,
        type: "agent" as const,
        displayName: "Run Technique",
      },
    ],
  })),
  ...(["market-research", "domain-research", "technical-research"] as const).map(
    (workflowSuffix) => ({
      workUnitKey: "research" as const,
      workflowSuffix,
      contextFacts: [
        {
          key: "research_type_ctx",
          label: "Research Type",
          kind: "bound_fact",
          cardinality: "one",
          bindingKey: "research_type",
        },
        {
          key: "research_topic_ctx",
          label: "Research Topic",
          kind: "bound_fact",
          cardinality: "one",
          bindingKey: "research_topic",
        },
        {
          key: "research_goals_ctx",
          label: "Research Goals",
          kind: "bound_fact",
          cardinality: "many",
          bindingKey: "research_goals",
        },
        {
          key: "scope_notes_ctx",
          label: "Scope Notes",
          kind: "plain_fact",
          cardinality: "one",
          valueType: "string",
        },
        {
          key: "research_synthesis_ctx",
          label: "Research Synthesis",
          kind: "bound_fact",
          cardinality: "one",
          bindingKey: "research_synthesis",
        },
        {
          key: "research_report_artifact_ctx",
          label: "Research Report Artifact",
          kind: "artifact_slot_reference_fact",
          cardinality: "one",
          slotWorkUnitKey: "research",
          slotSuffix: "research-report",
        },
      ],
      steps: [
        {
          key: "research_scope_confirmation",
          type: "form",
          displayName: "Research Scope Confirmation",
          formFields: [
            {
              key: "research_type",
              label: "Research Type",
              contextFactKey: "research_type_ctx",
              valueType: "string",
              required: true,
            },
            {
              key: "research_topic",
              label: "Research Topic",
              contextFactKey: "research_topic_ctx",
              valueType: "string",
              required: true,
            },
          ],
        },
        { key: "research_execution_agent", type: "agent", displayName: "Research Execution Agent" },
      ],
    }),
  ),
  {
    workUnitKey: "product_brief",
    workflowSuffix: "create-product-brief",
    contextFacts: [
      {
        key: "brief_mode_ctx",
        label: "Brief Mode",
        kind: "plain_fact",
        cardinality: "one",
        valueType: "string",
      },
      {
        key: "setup_input_summary_ctx",
        label: "Setup Input Summary",
        kind: "plain_fact",
        cardinality: "one",
        valueType: "json",
      },
      {
        key: "brainstorming_input_summary_ctx",
        label: "Brainstorming Input Summary",
        kind: "plain_fact",
        cardinality: "one",
        valueType: "json",
      },
      {
        key: "research_input_summary_ctx",
        label: "Research Input Summary",
        kind: "plain_fact",
        cardinality: "many",
        valueType: "json",
      },
      {
        key: "product_name_ctx",
        label: "Product Name",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "product_name",
      },
      {
        key: "product_intent_summary_ctx",
        label: "Product Intent Summary",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "product_intent_summary",
      },
      {
        key: "source_context_summary_ctx",
        label: "Source Context Summary",
        kind: "plain_fact",
        cardinality: "one",
        valueType: "json",
      },
      {
        key: "brief_synthesis_ctx",
        label: "Brief Synthesis",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "brief_synthesis",
      },
      {
        key: "review_findings_ctx",
        label: "Review Findings",
        kind: "bound_fact",
        cardinality: "many",
        bindingKey: "review_findings",
      },
      {
        key: "open_questions_ctx",
        label: "Open Questions",
        kind: "plain_fact",
        cardinality: "many",
        valueType: "json",
      },
      {
        key: "next_work_unit_ref_ctx",
        label: "Next Recommended Work Unit",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "next_recommended_work_unit",
      },
      {
        key: "product_brief_artifact_ctx",
        label: "Product Brief Artifact",
        kind: "artifact_slot_reference_fact",
        cardinality: "one",
        slotWorkUnitKey: "product_brief",
        slotSuffix: "product-brief",
      },
      {
        key: "product_brief_distillate_artifact_ctx",
        label: "Product Brief Distillate Artifact",
        kind: "artifact_slot_reference_fact",
        cardinality: "one",
        slotWorkUnitKey: "product_brief",
        slotSuffix: "product-brief-distillate",
      },
    ],
    steps: [
      { key: "brief_intent_agent", type: "agent", displayName: "Brief Intent Agent" },
      {
        key: "product_brief_authoring_agent",
        type: "agent",
        displayName: "Product Brief Authoring Agent",
      },
      {
        key: "propagate_product_brief_outputs",
        type: "action",
        displayName: "Propagate Product Brief Outputs",
      },
    ],
  },
  {
    workUnitKey: "prd",
    workflowSuffix: "create-prd",
    contextFacts: [
      {
        key: "setup_input_summary_ctx",
        label: "Setup Input Summary",
        kind: "plain_fact",
        cardinality: "one",
        valueType: "json",
      },
      {
        key: "product_brief_input_summary_ctx",
        label: "Product Brief Input Summary",
        kind: "plain_fact",
        cardinality: "one",
        valueType: "json",
      },
      {
        key: "research_input_summary_ctx",
        label: "Research Input Summary",
        kind: "plain_fact",
        cardinality: "many",
        valueType: "json",
      },
      {
        key: "brainstorming_input_summary_ctx",
        label: "Brainstorming Input Summary",
        kind: "plain_fact",
        cardinality: "one",
        valueType: "json",
      },
      {
        key: "project_name_ctx",
        label: "Project Name",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "project_name",
      },
      {
        key: "input_context_inventory_ctx",
        label: "Input Context Inventory",
        kind: "plain_fact",
        cardinality: "many",
        valueType: "json",
      },
      {
        key: "project_classification_ctx",
        label: "Project Classification",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "project_classification",
      },
      {
        key: "product_vision_ctx",
        label: "Product Vision",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "product_vision",
      },
      {
        key: "success_criteria_ctx",
        label: "Success Criteria",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "success_criteria",
      },
      {
        key: "user_journeys_ctx",
        label: "User Journeys",
        kind: "bound_fact",
        cardinality: "many",
        bindingKey: "user_journeys",
      },
      {
        key: "domain_requirements_ctx",
        label: "Domain Requirements",
        kind: "plain_fact",
        cardinality: "one",
        valueType: "json",
      },
      {
        key: "innovation_analysis_ctx",
        label: "Innovation Analysis",
        kind: "plain_fact",
        cardinality: "one",
        valueType: "json",
      },
      {
        key: "project_type_requirements_ctx",
        label: "Project Type Requirements",
        kind: "plain_fact",
        cardinality: "one",
        valueType: "json",
      },
      {
        key: "scope_plan_ctx",
        label: "Scope Plan",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "scope_plan",
      },
      {
        key: "functional_requirements_ctx",
        label: "Functional Requirements",
        kind: "bound_fact",
        cardinality: "many",
        bindingKey: "functional_requirements",
      },
      {
        key: "non_functional_requirements_ctx",
        label: "Non-Functional Requirements",
        kind: "bound_fact",
        cardinality: "many",
        bindingKey: "non_functional_requirements",
      },
      {
        key: "prd_synthesis_ctx",
        label: "PRD Synthesis",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "prd_synthesis",
      },
      {
        key: "next_work_unit_refs_ctx",
        label: "Next Recommended Work Units",
        kind: "bound_fact",
        cardinality: "many",
        bindingKey: "next_recommended_work_units",
      },
      {
        key: "prd_artifact_ctx",
        label: "PRD Artifact",
        kind: "artifact_slot_reference_fact",
        cardinality: "one",
        slotWorkUnitKey: "prd",
        slotSuffix: "prd",
      },
    ],
    steps: [
      {
        key: "prd_input_initialization_agent",
        type: "agent",
        displayName: "PRD Input Initialization Agent",
      },
      {
        key: "prd_discovery_and_vision_agent",
        type: "agent",
        displayName: "PRD Discovery and Vision Agent",
      },
      {
        key: "prd_success_and_journeys_agent",
        type: "agent",
        displayName: "PRD Success and Journeys Agent",
      },
      {
        key: "prd_context_requirements_agent",
        type: "agent",
        displayName: "PRD Context Requirements Agent",
      },
      {
        key: "prd_capability_contract_agent",
        type: "agent",
        displayName: "PRD Capability Contract Agent",
      },
      {
        key: "prd_polish_and_completion_agent",
        type: "agent",
        displayName: "PRD Polish and Completion Agent",
      },
      { key: "propagate_prd_outputs", type: "action", displayName: "Propagate PRD Outputs" },
    ],
  },
  {
    workUnitKey: "ux_design",
    workflowSuffix: "create-ux-design",
    contextFacts: [
      {
        key: "prd_input_summary_ctx",
        label: "PRD Input Summary",
        kind: "plain_fact",
        cardinality: "one",
        valueType: "json",
      },
      {
        key: "product_brief_input_summary_ctx",
        label: "Product Brief Input Summary",
        kind: "plain_fact",
        cardinality: "one",
        valueType: "json",
      },
      {
        key: "research_input_summary_ctx",
        label: "Research Input Summary",
        kind: "plain_fact",
        cardinality: "many",
        valueType: "json",
      },
      {
        key: "project_understanding_ctx",
        label: "Project Understanding",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "project_understanding",
      },
      {
        key: "core_experience_ctx",
        label: "Core Experience",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "core_experience",
      },
      {
        key: "emotional_response_ctx",
        label: "Emotional Response",
        kind: "plain_fact",
        cardinality: "one",
        valueType: "json",
      },
      {
        key: "ux_inspiration_ctx",
        label: "UX Inspiration",
        kind: "plain_fact",
        cardinality: "one",
        valueType: "json",
      },
      {
        key: "design_system_strategy_ctx",
        label: "Design System Strategy",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "design_system_strategy",
      },
      {
        key: "visual_foundation_ctx",
        label: "Visual Foundation",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "visual_foundation",
      },
      {
        key: "design_direction_decision_ctx",
        label: "Design Direction Decision",
        kind: "plain_fact",
        cardinality: "one",
        valueType: "json",
      },
      {
        key: "user_flow_specs_ctx",
        label: "User Flow Specs",
        kind: "bound_fact",
        cardinality: "many",
        bindingKey: "user_flow_specs",
      },
      {
        key: "component_strategy_ctx",
        label: "Component Strategy",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "component_strategy",
      },
      {
        key: "ux_consistency_patterns_ctx",
        label: "UX Consistency Patterns",
        kind: "plain_fact",
        cardinality: "one",
        valueType: "json",
      },
      {
        key: "responsive_accessibility_strategy_ctx",
        label: "Responsive Accessibility Strategy",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "responsive_accessibility_strategy",
      },
      {
        key: "ux_design_requirements_ctx",
        label: "UX Design Requirements",
        kind: "bound_fact",
        cardinality: "many",
        bindingKey: "ux_design_requirements",
      },
      {
        key: "ux_design_synthesis_ctx",
        label: "UX Design Synthesis",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "ux_design_synthesis",
      },
      {
        key: "next_work_unit_refs_ctx",
        label: "Next Recommended Work Units",
        kind: "bound_fact",
        cardinality: "many",
        bindingKey: "next_recommended_work_units",
      },
      {
        key: "ux_design_spec_artifact_ctx",
        label: "UX Design Specification Artifact",
        kind: "artifact_slot_reference_fact",
        cardinality: "one",
        slotWorkUnitKey: "ux_design",
        slotSuffix: "ux-design-specification",
      },
      {
        key: "ux_color_themes_artifact_ctx",
        label: "UX Color Themes Artifact",
        kind: "artifact_slot_reference_fact",
        cardinality: "one",
        slotWorkUnitKey: "ux_design",
        slotSuffix: "ux-color-themes",
      },
      {
        key: "ux_design_directions_artifact_ctx",
        label: "UX Design Directions Artifact",
        kind: "artifact_slot_reference_fact",
        cardinality: "one",
        slotWorkUnitKey: "ux_design",
        slotSuffix: "ux-design-directions",
      },
    ],
    steps: [
      {
        key: "ux_input_initialization_agent",
        type: "agent",
        displayName: "UX Input Initialization Agent",
      },
      {
        key: "ux_project_and_experience_agent",
        type: "agent",
        displayName: "UX Project and Experience Agent",
      },
      {
        key: "ux_visual_foundation_agent",
        type: "agent",
        displayName: "UX Visual Foundation Agent",
      },
      {
        key: "ux_flows_components_patterns_agent",
        type: "agent",
        displayName: "UX Flows Components Patterns Agent",
      },
      {
        key: "ux_responsive_accessibility_completion_agent",
        type: "agent",
        displayName: "UX Responsive Accessibility Completion Agent",
      },
      {
        key: "propagate_ux_design_outputs",
        type: "action",
        displayName: "Propagate UX Design Outputs",
      },
    ],
  },
  {
    workUnitKey: "architecture",
    workflowSuffix: "create-architecture",
    contextFacts: [
      {
        key: "prd_input_summary_ctx",
        label: "PRD Input Summary",
        kind: "plain_fact",
        cardinality: "one",
        valueType: "json",
      },
      {
        key: "ux_design_input_summary_ctx",
        label: "UX Design Input Summary",
        kind: "plain_fact",
        cardinality: "one",
        valueType: "json",
      },
      {
        key: "research_input_summary_ctx",
        label: "Research Input Summary",
        kind: "plain_fact",
        cardinality: "many",
        valueType: "json",
      },
      {
        key: "project_context_analysis_ctx",
        label: "Project Context Analysis",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "project_context_analysis",
      },
      {
        key: "starter_template_decision_ctx",
        label: "Starter Template Decision",
        kind: "plain_fact",
        cardinality: "one",
        valueType: "json",
      },
      {
        key: "architecture_decisions_ctx",
        label: "Architecture Decisions",
        kind: "bound_fact",
        cardinality: "many",
        bindingKey: "architecture_decisions",
      },
      {
        key: "implementation_patterns_ctx",
        label: "Implementation Patterns",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "implementation_patterns",
      },
      {
        key: "project_structure_ctx",
        label: "Project Structure",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "project_structure",
      },
      {
        key: "technical_requirements_ctx",
        label: "Technical Requirements",
        kind: "plain_fact",
        cardinality: "many",
        valueType: "json",
      },
      {
        key: "requirements_coverage_ctx",
        label: "Requirements Coverage",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "requirements_coverage",
      },
      {
        key: "validation_results_ctx",
        label: "Validation Results",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "validation_results",
      },
      {
        key: "architecture_synthesis_ctx",
        label: "Architecture Synthesis",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "architecture_synthesis",
      },
      {
        key: "next_work_unit_refs_ctx",
        label: "Next Recommended Work Units",
        kind: "bound_fact",
        cardinality: "many",
        bindingKey: "next_recommended_work_units",
      },
      {
        key: "architecture_document_artifact_ctx",
        label: "Architecture Document Artifact",
        kind: "artifact_slot_reference_fact",
        cardinality: "one",
        slotWorkUnitKey: "architecture",
        slotSuffix: "architecture-document",
      },
      {
        key: "architecture_decision_record_artifact_ctx",
        label: "Architecture Decision Record Artifact",
        kind: "artifact_slot_reference_fact",
        cardinality: "one",
        slotWorkUnitKey: "architecture",
        slotSuffix: "architecture-decision-records",
      },
    ],
    steps: [
      {
        key: "architecture_input_initialization_agent",
        type: "agent",
        displayName: "Architecture Input Initialization Agent",
      },
      {
        key: "architecture_context_agent",
        type: "agent",
        displayName: "Architecture Context Agent",
      },
      {
        key: "architecture_starter_and_decisions_agent",
        type: "agent",
        displayName: "Architecture Starter and Decisions Agent",
      },
      {
        key: "architecture_patterns_structure_agent",
        type: "agent",
        displayName: "Architecture Patterns Structure Agent",
      },
      {
        key: "architecture_validation_completion_agent",
        type: "agent",
        displayName: "Architecture Validation Completion Agent",
      },
      {
        key: "propagate_architecture_outputs",
        type: "action",
        displayName: "Propagate Architecture Outputs",
      },
    ],
  },
  {
    workUnitKey: "architecture",
    workflowSuffix: "record-architecture-decision",
    contextFacts: [
      {
        key: "architecture_decision_note_ctx",
        label: "Architecture Decision Note",
        kind: "plain_fact",
        cardinality: "one",
        valueType: "string",
      },
      {
        key: "architecture_decisions_ctx",
        label: "Architecture Decisions",
        kind: "bound_fact",
        cardinality: "many",
        bindingKey: "architecture_decisions",
      },
    ],
    steps: [
      {
        key: "record_architecture_decision",
        type: "agent",
        displayName: "Record Architecture Decision",
      },
    ],
  },
] as const;

function sectionAWorkflowBaseId(
  workUnitKey: WorkUnitKey,
  workflowSuffix: string,
  methodologyVersionId: CanonicalMethodologyVersionId,
) {
  return `seed:section-a:${workUnitKey}:${workflowSuffix}:${methodologyVersionId}`;
}

function sectionAContextFactDefinitionId(
  workUnitKey: WorkUnitKey,
  workflowSuffix: string,
  contextFactKey: string,
  methodologyVersionId: CanonicalMethodologyVersionId,
) {
  return `${sectionAWorkflowBaseId(workUnitKey, workflowSuffix, methodologyVersionId)}:ctx:${contextFactKey}`;
}

function sectionAStepDefinitionId(
  workUnitKey: WorkUnitKey,
  workflowSuffix: string,
  stepKey: string,
  methodologyVersionId: CanonicalMethodologyVersionId,
) {
  return `${sectionAWorkflowBaseId(workUnitKey, workflowSuffix, methodologyVersionId)}:step:${stepKey}`;
}

function sectionAEdgeDefinitionId(
  workUnitKey: WorkUnitKey,
  workflowSuffix: string,
  fromStepKey: string,
  toStepKey: string,
  methodologyVersionId: CanonicalMethodologyVersionId,
) {
  return `${sectionAWorkflowBaseId(workUnitKey, workflowSuffix, methodologyVersionId)}:edge:${fromStepKey}->${toStepKey}`;
}

function workflowEntryStepIdFor(
  workUnitKey: WorkUnitKey,
  workflowSuffix: string,
  methodologyVersionId: CanonicalMethodologyVersionId,
) {
  const firstStep = workflowEntryStepKeys[workUnitKey]?.[workflowSuffix];
  return firstStep
    ? sectionAStepDefinitionId(workUnitKey, workflowSuffix, firstStep, methodologyVersionId)
    : null;
}

function buildSectionAWorkflowFixtureBundle(
  methodologyVersionId: CanonicalMethodologyVersionId,
): SectionAWorkflowFixtureBundle {
  const methodology_workflow_steps: MethodologyWorkflowStepSeedRow[] = [];
  const methodology_workflow_edges: MethodologyWorkflowEdgeSeedRow[] = [];
  const methodologyWorkflowContextFactDefinitions: MethodologyWorkflowContextFactDefinitionSeedRow[] =
    [];
  const methodologyWorkflowContextFactPlainValues: MethodologyWorkflowContextFactPlainValueSeedRow[] =
    [];
  const methodologyWorkflowContextFactExternalBindings: MethodologyWorkflowContextFactExternalBindingSeedRow[] =
    [];
  const methodologyWorkflowContextFactArtifactReferences: MethodologyWorkflowContextFactArtifactReferenceSeedRow[] =
    [];
  const methodologyWorkflowContextFactDraftSpecs: (typeof schema.methodologyWorkflowContextFactDraftSpecs.$inferInsert)[] =
    [];
  const methodologyWorkflowContextFactDraftSpecSelections: (typeof schema.methodologyWorkflowContextFactDraftSpecSelections.$inferInsert)[] =
    [];
  const methodologyWorkflowContextFactDraftSpecFacts: (typeof schema.methodologyWorkflowContextFactDraftSpecFields.$inferInsert)[] =
    [];
  const methodologyWorkflowFormFields: MethodologyWorkflowFormFieldSeedRow[] = [];
  const methodologyWorkflowAgentSteps: MethodologyWorkflowAgentStepSeedRow[] = [];
  const methodologyWorkflowAgentStepExplicitReadGrants: MethodologyWorkflowAgentStepExplicitReadGrantSeedRow[] =
    [];
  const methodologyWorkflowAgentStepWriteItems: MethodologyWorkflowAgentStepWriteItemSeedRow[] = [];
  const methodologyWorkflowAgentStepWriteItemRequirements: MethodologyWorkflowAgentStepWriteItemRequirementSeedRow[] =
    [];
  const methodologyWorkflowActionSteps: MethodologyWorkflowActionStepSeedRow[] = [];
  const methodologyWorkflowActionStepActions: MethodologyWorkflowActionStepActionSeedRow[] = [];
  const methodologyWorkflowActionStepActionItems: MethodologyWorkflowActionStepActionItemSeedRow[] =
    [];
  const methodologyWorkflowInvokeSteps: MethodologyWorkflowInvokeStepSeedRow[] = [];
  const methodologyWorkflowInvokeBindings: MethodologyWorkflowInvokeBindingSeedRow[] = [];
  const methodologyWorkflowInvokeTransitions: MethodologyWorkflowInvokeTransitionSeedRow[] = [];
  const methodologyWorkflowBranchSteps: MethodologyWorkflowBranchStepSeedRow[] = [];
  const methodologyWorkflowBranchRoutes: MethodologyWorkflowBranchRouteSeedRow[] = [];
  const methodologyWorkflowBranchRouteGroups: MethodologyWorkflowBranchRouteGroupSeedRow[] = [];
  const methodologyWorkflowBranchRouteConditions: MethodologyWorkflowBranchRouteConditionSeedRow[] =
    [];

  for (const spec of sectionAWorkflowAuthoringSpecs) {
    const currentWorkflowId = workflowId(
      spec.workUnitKey,
      spec.workflowSuffix,
      methodologyVersionId,
    );

    for (const contextFact of spec.contextFacts) {
      const contextFactDefinitionId = sectionAContextFactDefinitionId(
        spec.workUnitKey,
        spec.workflowSuffix,
        contextFact.key,
        methodologyVersionId,
      );

      methodologyWorkflowContextFactDefinitions.push({
        id: contextFactDefinitionId,
        workflowId: currentWorkflowId,
        factKey: contextFact.key,
        factKind: contextFact.kind,
        label: contextFact.label,
        descriptionJson: toDescriptionJson(
          `${contextFact.label} available during ${spec.workflowSuffix}.`,
        ),
        cardinality: contextFact.cardinality,
        guidanceJson: toGuidanceJson(
          `Use ${contextFact.label.toLowerCase()} within ${spec.workflowSuffix}.`,
        ),
      });

      if (contextFact.kind === "plain_fact") {
        methodologyWorkflowContextFactPlainValues.push({
          id: `${contextFactDefinitionId}:plain`,
          contextFactDefinitionId,
          type: contextFact.valueType,
          validationJson: { kind: "none" },
        });
      }

      if (contextFact.kind === "bound_fact") {
        methodologyWorkflowContextFactExternalBindings.push({
          id: `${contextFactDefinitionId}:binding`,
          contextFactDefinitionId,
          provider: "bound_fact",
          bindingKey: contextFact.bindingKey,
        });
      }

      if (contextFact.kind === "artifact_slot_reference_fact") {
        methodologyWorkflowContextFactArtifactReferences.push({
          id: `${contextFactDefinitionId}:artifact`,
          contextFactDefinitionId,
          slotDefinitionId: slotDefinitionId(
            contextFact.slotWorkUnitKey,
            contextFact.slotSuffix,
            methodologyVersionId,
          ),
        });
      }

      if (contextFact.kind === "work_unit_draft_spec_fact") {
        const draftSpecId = `${contextFactDefinitionId}:draft-spec`;
        methodologyWorkflowContextFactDraftSpecs.push({
          id: draftSpecId,
          contextFactDefinitionId,
          workUnitDefinitionId: workUnitTypeId(contextFact.targetWorkUnitKey, methodologyVersionId),
        });

        contextFact.selectedFactKeys.forEach((factKey, selectionIndex) => {
          methodologyWorkflowContextFactDraftSpecSelections.push({
            id: `${draftSpecId}:selection:fact:${factKey}`,
            draftSpecId,
            selectionType: "fact",
            definitionId: workUnitFactDefinitionId(
              contextFact.targetWorkUnitKey,
              factKey.replaceAll("_", "-"),
              methodologyVersionId,
            ),
            sortOrder: (selectionIndex + 1) * 10,
          });
        });

        (contextFact.selectedArtifactSlotSuffixes ?? []).forEach((slotSuffix, selectionIndex) => {
          methodologyWorkflowContextFactDraftSpecSelections.push({
            id: `${draftSpecId}:selection:artifact:${slotSuffix}`,
            draftSpecId,
            selectionType: "artifact",
            definitionId: slotDefinitionId(
              contextFact.targetWorkUnitKey,
              slotSuffix,
              methodologyVersionId,
            ),
            sortOrder: (contextFact.selectedFactKeys.length + selectionIndex + 1) * 10,
          });
        });
      }
    }

    for (const [index, step] of spec.steps.entries()) {
      const stepId = sectionAStepDefinitionId(
        spec.workUnitKey,
        spec.workflowSuffix,
        step.key,
        methodologyVersionId,
      );

      methodology_workflow_steps.push({
        id: stepId,
        methodologyVersionId,
        workflowId: currentWorkflowId,
        key: step.key,
        type: step.type,
        displayName: step.displayName,
        configJson: {
          descriptionJson: toDescriptionJson(`${step.displayName} for ${spec.workflowSuffix}.`),
        },
        guidanceJson: toGuidanceJson(
          `Run ${step.displayName.toLowerCase()} as part of ${spec.workflowSuffix}.`,
        ),
      });

      for (const [fieldIndex, field] of (step.formFields ?? []).entries()) {
        methodologyWorkflowFormFields.push({
          id: `${stepId}:field:${field.key}`,
          formStepId: stepId,
          key: field.key,
          label: field.label,
          valueType: field.valueType,
          required: field.required ?? false,
          inputJson: {
            contextFactDefinitionId: sectionAContextFactDefinitionId(
              spec.workUnitKey,
              spec.workflowSuffix,
              field.contextFactKey,
              methodologyVersionId,
            ),
          },
          descriptionJson: toDescriptionJson(`${field.label} field for ${step.displayName}.`),
          sortOrder: (fieldIndex + 1) * 10,
        });
      }

      if (step.type === "agent") {
        const readContextFactKeys = step.agentConfig?.readContextFactKeys ?? [];
        const writeContextFactKeys = step.agentConfig?.writeContextFactKeys ?? [];
        const completionRequirementContextFactKeys =
          step.agentConfig?.completionRequirementContextFactKeys ?? [];

        methodologyWorkflowAgentSteps.push({
          stepId,
          objective:
            step.agentConfig?.objective ??
            `${step.displayName} objective for ${spec.workflowSuffix}.`,
          instructionsMarkdown:
            step.agentConfig?.instructionsMarkdown ??
            `Execute ${step.displayName} for ${spec.workflowSuffix} using the seeded Section A workflow contract.`,
          harness: "opencode",
          agentKey: spec.workUnitKey === "setup" ? "Atlas - Plan Executor" : null,
          modelJson:
            spec.workUnitKey === "setup" ? { provider: "opencode", model: "kimi-2.5" } : null,
          completionRequirementsJson: completionRequirementContextFactKeys.map(
            (contextFactKey) => ({
              contextFactDefinitionId: sectionAContextFactDefinitionId(
                spec.workUnitKey,
                spec.workflowSuffix,
                contextFactKey,
                methodologyVersionId,
              ),
            }),
          ),
          sessionStart: "explicit",
          continuationMode: "bootstrap_only",
          liveStreamCount: 1,
          bootstrapPromptNoReply: false,
          nativeMessageLog: false,
          persistedWritePolicy: "applied_only",
        });

        readContextFactKeys.forEach((contextFactKey) => {
          methodologyWorkflowAgentStepExplicitReadGrants.push({
            id: `${stepId}:read:${contextFactKey}`,
            agentStepId: stepId,
            contextFactDefinitionId: sectionAContextFactDefinitionId(
              spec.workUnitKey,
              spec.workflowSuffix,
              contextFactKey,
              methodologyVersionId,
            ),
          });
        });

        writeContextFactKeys.forEach((contextFactKey, writeIndex) => {
          const contextFactDefinitionId = sectionAContextFactDefinitionId(
            spec.workUnitKey,
            spec.workflowSuffix,
            contextFactKey,
            methodologyVersionId,
          );
          const contextFact = spec.contextFacts.find(
            (candidate) => candidate.key === contextFactKey,
          );
          if (!contextFact) {
            return;
          }
          const writeItemRowId = `${stepId}:write:${contextFactKey}`;
          methodologyWorkflowAgentStepWriteItems.push({
            id: writeItemRowId,
            agentStepId: stepId,
            writeItemId: contextFactKey,
            contextFactDefinitionId,
            contextFactKind: contextFact.kind,
            label: contextFact.label,
            sortOrder: (writeIndex + 1) * 10,
          });
        });
      }

      if (step.type === "action") {
        const actions = step.actionConfig?.actions ?? [];
        if (actions.length > 0) {
          methodologyWorkflowActionSteps.push({
            stepId,
            executionMode: "sequential",
          });

          actions.forEach((action, actionIndex) => {
            const actionRowId = `${stepId}:action:${action.actionId}`;
            const sourceContextFactDefinitionId = sectionAContextFactDefinitionId(
              spec.workUnitKey,
              spec.workflowSuffix,
              action.contextFactKey,
              methodologyVersionId,
            );

            methodologyWorkflowActionStepActions.push({
              id: actionRowId,
              actionStepId: stepId,
              actionId: action.actionId,
              actionKey: action.actionKey,
              label: action.label,
              enabled: true,
              sortOrder: (actionIndex + 1) * 10,
              actionKind: "propagation",
              contextFactDefinitionId: sourceContextFactDefinitionId,
              contextFactKind: action.contextFactKind,
            });

            action.items.forEach((item, itemIndex) => {
              methodologyWorkflowActionStepActionItems.push({
                id: `${actionRowId}:item:${item.itemId}`,
                actionRowId,
                itemId: item.itemId,
                itemKey: item.itemKey,
                label: item.label,
                targetContextFactDefinitionId: sectionAContextFactDefinitionId(
                  spec.workUnitKey,
                  spec.workflowSuffix,
                  item.targetContextFactKey,
                  methodologyVersionId,
                ),
                sortOrder: (itemIndex + 1) * 10,
              });
            });
          });
        }
      }

      if (step.type === "branch") {
        if (step.branchConfig) {
          methodologyWorkflowBranchSteps.push({
            stepId,
            defaultTargetStepId: step.branchConfig.defaultTargetStepKey
              ? sectionAStepDefinitionId(
                  spec.workUnitKey,
                  spec.workflowSuffix,
                  step.branchConfig.defaultTargetStepKey,
                  methodologyVersionId,
                )
              : null,
            configJson: null,
          });

          step.branchConfig.routes.forEach((route, routeIndex) => {
            const routeRowId = `${stepId}:route:${route.routeId}`;
            methodologyWorkflowBranchRoutes.push({
              id: routeRowId,
              branchStepId: stepId,
              routeId: route.routeId,
              targetStepId: sectionAStepDefinitionId(
                spec.workUnitKey,
                spec.workflowSuffix,
                route.targetStepKey,
                methodologyVersionId,
              ),
              conditionMode: route.conditionMode,
              sortOrder: (routeIndex + 1) * 10,
            });

            route.groups.forEach((group, groupIndex) => {
              const groupRowId = `${routeRowId}:group:${group.groupId}`;
              methodologyWorkflowBranchRouteGroups.push({
                id: groupRowId,
                routeId: routeRowId,
                groupId: group.groupId,
                mode: group.mode,
                sortOrder: (groupIndex + 1) * 10,
              });

              group.conditions.forEach((condition, conditionIndex) => {
                methodologyWorkflowBranchRouteConditions.push({
                  id: `${groupRowId}:condition:${condition.conditionId}`,
                  groupId: groupRowId,
                  conditionId: condition.conditionId,
                  contextFactDefinitionId: sectionAContextFactDefinitionId(
                    spec.workUnitKey,
                    spec.workflowSuffix,
                    condition.contextFactKey,
                    methodologyVersionId,
                  ),
                  subFieldKey: condition.subFieldKey ?? null,
                  operator: condition.operator,
                  isNegated: condition.isNegated ?? false,
                  comparisonJson: condition.comparisonJson ?? null,
                  sortOrder: (conditionIndex + 1) * 10,
                });
              });
            });
          });
        }
      }

      if (step.type === "invoke" && step.invokeConfig) {
        const workUnitDefinitionId = step.invokeConfig.workUnitKey
          ? workUnitTypeId(step.invokeConfig.workUnitKey, methodologyVersionId)
          : null;
        const invokeContextFactDefinitionId = step.invokeConfig.contextFactKey
          ? sectionAContextFactDefinitionId(
              spec.workUnitKey,
              spec.workflowSuffix,
              step.invokeConfig.contextFactKey,
              methodologyVersionId,
            )
          : null;

        methodologyWorkflowInvokeSteps.push({
          stepId,
          targetKind: step.invokeConfig.targetKind,
          sourceMode:
            step.invokeConfig.sourceMode === "fixed_set" ? "fixed_set" : "context_fact_backed",
          workflowDefinitionIds:
            step.invokeConfig.targetKind === "workflow" && step.invokeConfig.workflowSuffixes
              ? step.invokeConfig.workflowSuffixes.map((workflowSuffix) =>
                  workflowId(spec.workUnitKey, workflowSuffix, methodologyVersionId),
                )
              : null,
          workUnitDefinitionId:
            step.invokeConfig.targetKind === "work_unit" ? workUnitDefinitionId : null,
          contextFactDefinitionId: invokeContextFactDefinitionId,
          configJson: {
            descriptionJson: toDescriptionJson(`${step.displayName} for ${spec.workflowSuffix}.`),
          },
        });

        (step.invokeConfig.bindings ?? []).forEach((binding, bindingIndex) => {
          methodologyWorkflowInvokeBindings.push({
            id: `${stepId}:binding:${bindingIndex + 1}`,
            invokeStepId: stepId,
            destinationKind: binding.destinationKind,
            destinationKey:
              binding.destinationKind === "work_unit_fact"
                ? (binding.destinationFactKey ?? "")
                : (binding.destinationSlotSuffix ?? ""),
            workUnitFactDefinitionId:
              binding.destinationKind === "work_unit_fact" &&
              binding.destinationWorkUnitKey &&
              binding.destinationFactKey
                ? workUnitFactDefinitionId(
                    binding.destinationWorkUnitKey,
                    binding.destinationFactKey.replaceAll("_", "-"),
                    methodologyVersionId,
                  )
                : null,
            artifactSlotDefinitionId:
              binding.destinationKind === "artifact_slot" &&
              binding.destinationSlotWorkUnitKey &&
              binding.destinationSlotSuffix
                ? slotDefinitionId(
                    binding.destinationSlotWorkUnitKey,
                    binding.destinationSlotSuffix,
                    methodologyVersionId,
                  )
                : null,
            sourceKind: binding.sourceKind,
            contextFactDefinitionId:
              binding.sourceKind === "context_fact" && binding.contextFactKey
                ? sectionAContextFactDefinitionId(
                    spec.workUnitKey,
                    spec.workflowSuffix,
                    binding.contextFactKey,
                    methodologyVersionId,
                  )
                : null,
            literalValueJson:
              binding.sourceKind === "literal" ? (binding.literalValue ?? null) : null,
            sortOrder: (bindingIndex + 1) * 10,
          });
        });

        (step.invokeConfig.activationTransitions ?? []).forEach(
          (activationTransition, transitionIndex) => {
            methodologyWorkflowInvokeTransitions.push({
              id: `${stepId}:transition:${transitionIndex + 1}`,
              invokeStepId: stepId,
              transitionId: transitionId(
                activationTransition.workUnitKey,
                activationTransition.transitionSuffix,
                methodologyVersionId,
              ),
              workflowDefinitionIds: activationTransition.workflowSuffixes.map((workflowSuffix) =>
                workflowId(activationTransition.workUnitKey, workflowSuffix, methodologyVersionId),
              ),
              sortOrder: (transitionIndex + 1) * 10,
            });
          },
        );
      }

      const nextStep = spec.steps[index + 1];
      if (!spec.explicitEdges && nextStep) {
        methodology_workflow_edges.push({
          id: sectionAEdgeDefinitionId(
            spec.workUnitKey,
            spec.workflowSuffix,
            step.key,
            nextStep.key,
            methodologyVersionId,
          ),
          methodologyVersionId,
          workflowId: currentWorkflowId,
          fromStepId: stepId,
          toStepId: sectionAStepDefinitionId(
            spec.workUnitKey,
            spec.workflowSuffix,
            nextStep.key,
            methodologyVersionId,
          ),
          edgeKey: `${step.key}_to_${nextStep.key}`,
          descriptionJson: toDescriptionJson(
            `${step.displayName} flows into ${nextStep.displayName}.`,
          ),
        });
      }
    }

    if (spec.explicitEdges) {
      spec.explicitEdges.forEach((edge) => {
        methodology_workflow_edges.push({
          id: sectionAEdgeDefinitionId(
            spec.workUnitKey,
            spec.workflowSuffix,
            edge.fromStepKey,
            edge.toStepKey,
            methodologyVersionId,
          ),
          methodologyVersionId,
          workflowId: currentWorkflowId,
          fromStepId: sectionAStepDefinitionId(
            spec.workUnitKey,
            spec.workflowSuffix,
            edge.fromStepKey,
            methodologyVersionId,
          ),
          toStepId: sectionAStepDefinitionId(
            spec.workUnitKey,
            spec.workflowSuffix,
            edge.toStepKey,
            methodologyVersionId,
          ),
          edgeKey: `${edge.fromStepKey}_to_${edge.toStepKey}`,
          descriptionJson: toDescriptionJson(`${edge.fromStepKey} flows into ${edge.toStepKey}.`),
        });
      });
    }
  }

  return {
    methodology_workflow_steps,
    methodology_workflow_edges,
    methodologyWorkflowContextFactDefinitions,
    methodologyWorkflowContextFactPlainValues,
    methodologyWorkflowContextFactExternalBindings,
    methodologyWorkflowContextFactWorkflowReferences: [],
    methodologyWorkflowContextFactArtifactReferences,
    methodologyWorkflowContextFactDraftSpecs,
    methodologyWorkflowContextFactDraftSpecSelections,
    methodologyWorkflowContextFactDraftSpecFacts,
    methodologyWorkflowFormFields,
    methodologyWorkflowAgentSteps,
    methodologyWorkflowAgentStepExplicitReadGrants,
    methodologyWorkflowAgentStepWriteItems,
    methodologyWorkflowAgentStepWriteItemRequirements,
    methodologyWorkflowActionSteps,
    methodologyWorkflowActionStepActions,
    methodologyWorkflowActionStepActionItems,
    methodologyWorkflowInvokeSteps,
    methodologyWorkflowInvokeBindings,
    methodologyWorkflowInvokeTransitions,
    methodologyWorkflowBranchSteps,
    methodologyWorkflowBranchRoutes,
    methodologyWorkflowBranchRouteGroups,
    methodologyWorkflowBranchRouteConditions,
  };
}

export const sectionAWorkflowFixtureBundles: readonly SectionAWorkflowFixtureBundle[] =
  canonicalMethodologyVersionIds.map((methodologyVersionId) =>
    buildSectionAWorkflowFixtureBundle(methodologyVersionId),
  );

export const methodologyWorkflowStepSeedRows: readonly MethodologyWorkflowStepSeedRow[] =
  sectionAWorkflowFixtureBundles.flatMap((bundle) => bundle.methodology_workflow_steps);
export const methodologyWorkflowEdgeSeedRows: readonly MethodologyWorkflowEdgeSeedRow[] =
  sectionAWorkflowFixtureBundles.flatMap((bundle) => bundle.methodology_workflow_edges);
export const setupWorkflowStepSeedRows = methodologyWorkflowStepSeedRows;
export const setupWorkflowEdgeSeedRows = methodologyWorkflowEdgeSeedRows;

const transitionBindingsByWorkUnit: Record<
  WorkUnitKey,
  readonly { idSuffix: string; workflowSuffix: string }[]
> = {
  setup: [{ idSuffix: "activation-to-done", workflowSuffix: "setup-project" }],
  brainstorming: [{ idSuffix: "activation-to-done", workflowSuffix: "brainstorming" }],
  research: [
    { idSuffix: "market-research", workflowSuffix: "market-research" },
    { idSuffix: "domain-research", workflowSuffix: "domain-research" },
    { idSuffix: "technical-research", workflowSuffix: "technical-research" },
  ],
  product_brief: [{ idSuffix: "activation-to-done", workflowSuffix: "create-product-brief" }],
  prd: [{ idSuffix: "activation-to-done", workflowSuffix: "create-prd" }],
  ux_design: [{ idSuffix: "activation-to-done", workflowSuffix: "create-ux-design" }],
  architecture: [{ idSuffix: "activation-to-done", workflowSuffix: "create-architecture" }],
};

function buildTransitionWorkflowBindingSeedRowsFor(
  workUnitKey: WorkUnitKey,
  methodologyVersionId: CanonicalMethodologyVersionId,
): readonly MethodologyTransitionWorkflowBindingSeedRow[] {
  return transitionBindingsByWorkUnit[workUnitKey].map((binding) => ({
    id: bindingId(workUnitKey, binding.idSuffix, methodologyVersionId),
    methodologyVersionId,
    transitionId: transitionId(workUnitKey, "activation-to-done", methodologyVersionId),
    workflowId: workflowId(workUnitKey, binding.workflowSuffix, methodologyVersionId),
  }));
}

export const setupTransitionWorkflowBindingSeedRows: readonly MethodologyTransitionWorkflowBindingSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildTransitionWorkflowBindingSeedRowsFor("setup", versionId),
  );
export const brainstormingTransitionWorkflowBindingSeedRows: readonly MethodologyTransitionWorkflowBindingSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildTransitionWorkflowBindingSeedRowsFor("brainstorming", versionId),
  );
export const researchTransitionWorkflowBindingSeedRows: readonly MethodologyTransitionWorkflowBindingSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildTransitionWorkflowBindingSeedRowsFor("research", versionId),
  );
export const productBriefTransitionWorkflowBindingSeedRows: readonly MethodologyTransitionWorkflowBindingSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildTransitionWorkflowBindingSeedRowsFor("product_brief", versionId),
  );
export const prdTransitionWorkflowBindingSeedRows: readonly MethodologyTransitionWorkflowBindingSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildTransitionWorkflowBindingSeedRowsFor("prd", versionId),
  );
export const uxDesignTransitionWorkflowBindingSeedRows: readonly MethodologyTransitionWorkflowBindingSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildTransitionWorkflowBindingSeedRowsFor("ux_design", versionId),
  );
export const architectureTransitionWorkflowBindingSeedRows: readonly MethodologyTransitionWorkflowBindingSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildTransitionWorkflowBindingSeedRowsFor("architecture", versionId),
  );

const canonicalDependencyDefinitions = [
  {
    idSuffix: "requires-setup-context",
    key: "requires_setup_context",
    name: "Requires Setup Context",
    descriptionJson: toDescriptionJson(
      "Indicates that downstream work depends on setup-established project context.",
    ),
    guidanceJson: toGuidanceJson(
      "Use when the upstream Setup work unit is the authoritative source of baseline context.",
    ),
  },
  {
    idSuffix: "informed-by-brainstorming",
    key: "informed_by_brainstorming",
    name: "Informed by Brainstorming",
    descriptionJson: toDescriptionJson(
      "Indicates that downstream work uses Brainstorming outputs as input.",
    ),
    guidanceJson: toGuidanceJson(
      "Use when Brainstorming shaped scope, direction, or evidence gathering.",
    ),
  },
  {
    idSuffix: "informed-by-research",
    key: "informed_by_research",
    name: "Informed by Research",
    descriptionJson: toDescriptionJson(
      "Indicates that downstream work uses Research findings as input.",
    ),
    guidanceJson: toGuidanceJson(
      "Use when research materially shapes downstream scope, tradeoffs, or outputs.",
    ),
  },
  {
    idSuffix: "informed-by-product-brief",
    key: "informed_by_product_brief",
    name: "Informed by Product Brief",
    descriptionJson: toDescriptionJson(
      "Indicates that downstream planning work uses a Product Brief as an input.",
    ),
    guidanceJson: toGuidanceJson(
      "Use when a Product Brief is the chosen upstream source for PRD or other planning work.",
    ),
  },
  {
    idSuffix: "informed-by-prd",
    key: "informed_by_prd",
    name: "Informed by PRD",
    descriptionJson: toDescriptionJson("Indicates that downstream work uses a PRD as an input."),
    guidanceJson: toGuidanceJson("Use when PRD is the authoritative upstream planning contract."),
  },
  {
    idSuffix: "informed-by-ux-design",
    key: "informed_by_ux_design",
    name: "Informed by UX Design",
    descriptionJson: toDescriptionJson(
      "Indicates that downstream work uses UX Design outputs as an input.",
    ),
    guidanceJson: toGuidanceJson(
      "Use when UX decisions materially shape downstream technical or planning work.",
    ),
  },
] as const;

function buildDependencyDefinitionSeedRows(
  methodologyVersionId: CanonicalMethodologyVersionId,
): readonly MethodologyLinkTypeDefinitionSeedRow[] {
  return canonicalDependencyDefinitions.map((definition) => ({
    id: `seed:dep:${definition.idSuffix}:${methodologyVersionId}`,
    methodologyVersionId,
    key: definition.key,
    name: definition.name,
    descriptionJson: definition.descriptionJson,
    guidanceJson: definition.guidanceJson,
  }));
}

export const setupDependencyDefinitionSeedRows: readonly MethodologyLinkTypeDefinitionSeedRow[] =
  buildRowsForAllCanonicalVersions(buildDependencyDefinitionSeedRows);

const canonicalMethodologyFactDefinitions = [
  {
    idSuffix: "communication-language",
    name: "Communication Language",
    key: "communication_language",
    valueType: "string",
    cardinality: "one" as const,
    descriptionJson: toDescriptionJson(
      "Default language used for conversational guidance across the methodology.",
    ),
    guidanceJson: toGuidanceJson(
      "Use this as the default response language unless runtime context overrides it.",
    ),
    defaultValueJson: "English",
    validationJson: { kind: "none" as const },
  },
  {
    idSuffix: "document-output-language",
    name: "Document Output Language",
    key: "document_output_language",
    valueType: "string",
    cardinality: "one" as const,
    descriptionJson: toDescriptionJson(
      "Default language used for persisted methodology artifacts.",
    ),
    guidanceJson: toGuidanceJson(
      "Use this as the default document language unless runtime context overrides it.",
    ),
    defaultValueJson: "English",
    validationJson: { kind: "none" as const },
  },
  {
    idSuffix: "project-knowledge-directory",
    name: "Project Knowledge Directory",
    key: "project_knowledge_directory",
    valueType: "string",
    cardinality: "one" as const,
    descriptionJson: toDescriptionJson(
      "Directory where durable setup knowledge artifacts are stored.",
    ),
    guidanceJson: toGuidanceJson("Set the default folder for setup-created knowledge artifacts."),
    defaultValueJson: "docs",
    validationJson: {
      kind: "path" as const,
      path: {
        pathKind: "directory" as const,
        normalization: { trimWhitespace: true },
        safety: { disallowAbsolute: true, preventTraversal: true },
      },
    },
  },
  {
    idSuffix: "planning-artifacts-directory",
    name: "Planning Artifacts Directory",
    key: "planning_artifacts_directory",
    valueType: "string",
    cardinality: "one" as const,
    descriptionJson: toDescriptionJson(
      "Directory for planning artifacts created during setup and downstream planning flows.",
    ),
    guidanceJson: toGuidanceJson("Set the default folder for planning-oriented artifacts."),
    defaultValueJson: ".sisyphus",
    validationJson: {
      kind: "path" as const,
      path: {
        pathKind: "directory" as const,
        normalization: { trimWhitespace: true },
        safety: { disallowAbsolute: true, preventTraversal: true },
      },
    },
  },
  {
    idSuffix: "implementation-artifacts-directory",
    name: "Implementation Artifacts Directory",
    key: "implementation_artifacts_directory",
    valueType: "string",
    cardinality: "one" as const,
    descriptionJson: toDescriptionJson(
      "Directory for implementation-facing artifacts such as stories, reviews, and execution notes.",
    ),
    guidanceJson: toGuidanceJson("Set the default folder for implementation-oriented artifacts."),
    defaultValueJson: ".sisyphus",
    validationJson: {
      kind: "path" as const,
      path: {
        pathKind: "directory" as const,
        normalization: { trimWhitespace: true },
        safety: { disallowAbsolute: true, preventTraversal: true },
      },
    },
  },
  {
    idSuffix: "repository-type",
    name: "Repository Type",
    key: "repository_type",
    valueType: "string",
    cardinality: "one" as const,
    descriptionJson: toDescriptionJson(
      "Detected repository structure classification for the current project.",
    ),
    guidanceJson: toGuidanceJson(
      "Capture whether discovery found a monolith, monorepo, or multi-part repository shape.",
    ),
    defaultValueJson: null,
    validationJson: toAllowedValuesValidation(["monolith", "monorepo", "multi_part"]),
  },
  {
    idSuffix: "project-parts",
    name: "Project Parts",
    key: "project_parts",
    valueType: "json",
    cardinality: "many" as const,
    descriptionJson: toDescriptionJson(
      "Structured inventory of repository parts discovered during setup.",
    ),
    guidanceJson: toGuidanceJson(
      "Record each discovered project part with a stable id and root path.",
    ),
    defaultValueJson: null,
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: { type: "object" },
      subSchema: {
        type: "object",
        fields: [
          { key: "part_id", type: "string", cardinality: "one" },
          { key: "root_path", type: "string", cardinality: "one" },
          { key: "project_type", type: "string", cardinality: "one" },
          { key: "confidence", type: "string", cardinality: "one" },
        ],
      },
    },
  },
  {
    idSuffix: "technology-stack-by-part",
    name: "Technology Stack by Part",
    key: "technology_stack_by_part",
    valueType: "json",
    cardinality: "many" as const,
    descriptionJson: toDescriptionJson(
      "Per-part technology inventory discovered across the repository.",
    ),
    guidanceJson: toGuidanceJson(
      "Capture language, framework, runtime, database, and dependency cues for each discovered part.",
    ),
    defaultValueJson: null,
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: { type: "object" },
      subSchema: {
        type: "object",
        fields: [
          { key: "part_id", type: "string", cardinality: "one" },
          { key: "language", type: "string", cardinality: "one" },
          { key: "framework", type: "string", cardinality: "one" },
          { key: "runtime", type: "string", cardinality: "one" },
          { key: "database", type: "string", cardinality: "one" },
          { key: "package_manager", type: "string", cardinality: "one" },
        ],
      },
    },
  },
  {
    idSuffix: "existing-documentation-inventory",
    name: "Existing Documentation Inventory",
    key: "existing_documentation_inventory",
    valueType: "json",
    cardinality: "many" as const,
    descriptionJson: toDescriptionJson(
      "Inventory of existing documentation discovered within the repository.",
    ),
    guidanceJson: toGuidanceJson(
      "Capture known documentation paths, types, and related project parts discovered during setup.",
    ),
    defaultValueJson: null,
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: { type: "object" },
      subSchema: {
        type: "object",
        fields: [
          { key: "path", type: "string", cardinality: "one" },
          { key: "doc_type", type: "string", cardinality: "one" },
          { key: "related_part_id", type: "string", cardinality: "one" },
          { key: "relevance", type: "string", cardinality: "one" },
        ],
      },
    },
  },
  {
    idSuffix: "integration-points",
    name: "Integration Points",
    key: "integration_points",
    valueType: "json",
    cardinality: "many" as const,
    descriptionJson: toDescriptionJson(
      "Structured inventory of integration points discovered between project parts.",
    ),
    guidanceJson: toGuidanceJson(
      "Capture directional connections between discovered project parts and their integration type.",
    ),
    defaultValueJson: null,
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: { type: "object" },
      subSchema: {
        type: "object",
        fields: [
          { key: "from_part_id", type: "string", cardinality: "one" },
          { key: "to_part_id", type: "string", cardinality: "one" },
          { key: "integration_type", type: "string", cardinality: "one" },
          { key: "details", type: "string", cardinality: "one" },
        ],
      },
    },
  },
] as const;

function buildMethodologyFactDefinitionSeedRows(
  methodologyVersionId: CanonicalMethodologyVersionId,
): readonly MethodologyFactDefinitionSeedRow[] {
  return canonicalMethodologyFactDefinitions.map((definition) => ({
    id: `seed:fact-def:${definition.idSuffix}:${methodologyVersionId}`,
    methodologyVersionId,
    name: definition.name,
    key: definition.key,
    valueType: definition.valueType,
    cardinality: definition.cardinality,
    descriptionJson: definition.descriptionJson,
    guidanceJson: definition.guidanceJson,
    defaultValueJson: definition.defaultValueJson,
    validationJson: definition.validationJson,
  }));
}

export const setupFactDefinitionSeedRows: readonly MethodologyFactDefinitionSeedRow[] =
  buildRowsForAllCanonicalVersions(buildMethodologyFactDefinitionSeedRows);

const sourceRefs = ["docs/plans/2026-03-20-story-3-2-l2-implementation-plan.md"] as const;

export const setupSeedMetadata = {
  methodologyDefinitionId,
  methodologyVersionIds,
  slice: "slice_a_setup",
  workUnitKeys: ["setup"] as const,
  workflowKeys: ["setup_project", "generate_project_context"] as const,
  lockedDesignTimeFactDefinitionKeys: LOCKED_BMAD_DESIGN_TIME_FACT_KEYS,
  sourceRefs,
} as const;

export const brainstormingSeedMetadata = {
  methodologyDefinitionId,
  methodologyVersionIds,
  slice: "slice_a_brainstorming",
  workUnitKeys: ["brainstorming"] as const,
  workflowKeys: [
    "brainstorming",
    "first_principles_analysis",
    "five_whys_deep_dive",
    "socratic_questioning",
    "stakeholder_round_table",
    "critique_and_refine",
  ] as const,
  sourceRefs,
} as const;

export const researchSeedMetadata = {
  methodologyDefinitionId,
  methodologyVersionIds,
  slice: "slice_a_research",
  workUnitKeys: ["research"] as const,
  workflowKeys: ["market_research", "domain_research", "technical_research"] as const,
  sourceRefs,
} as const;

export const productBriefSeedMetadata = {
  methodologyDefinitionId,
  methodologyVersionIds,
  slice: "slice_a_product_brief",
  workUnitKeys: ["product_brief"] as const,
  workflowKeys: ["create_product_brief"] as const,
  sourceRefs,
} as const;

export const prdSeedMetadata = {
  methodologyDefinitionId,
  methodologyVersionIds,
  slice: "slice_a_prd",
  workUnitKeys: ["prd"] as const,
  workflowKeys: ["create_prd"] as const,
  sourceRefs,
} as const;

export const uxDesignSeedMetadata = {
  methodologyDefinitionId,
  methodologyVersionIds,
  slice: "slice_a_ux_design",
  workUnitKeys: ["ux_design"] as const,
  workflowKeys: ["create_ux_design"] as const,
  sourceRefs,
} as const;

export const architectureSeedMetadata = {
  methodologyDefinitionId,
  methodologyVersionIds,
  slice: "slice_a_architecture",
  workUnitKeys: ["architecture"] as const,
  workflowKeys: ["create_architecture", "record_architecture_decision"] as const,
  sourceRefs,
} as const;
