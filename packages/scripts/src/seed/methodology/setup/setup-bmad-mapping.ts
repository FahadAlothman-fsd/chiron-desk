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
export type MethodologyWorkflowContextFactWorkflowReferenceSeedRow =
  typeof schema.methodologyWorkflowContextFactWorkflowReferences.$inferInsert;
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

export const LOCKED_BMAD_SETUP_WORK_UNIT_FACT_KEYS = ["setup_path_summary"] as const;

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
  | "implementation"
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
      "Use Setup to establish the baseline project frame and select the next BMAD path.",
      "Setup is the canonical source of baseline project framing. Downstream work should consume setup-owned facts and artifacts instead of re-deriving foundational assumptions.",
    ),
    cardinality: "one_per_project" as const,
  },
  {
    key: "brainstorming",
    displayName: "Brainstorming",
    descriptionJson: toDescriptionJson(
      "Facilitates structured ideation and convergence for fuzzy or exploratory work.",
    ),
    guidanceJson: toGuidanceJson(
      "Use Brainstorming when the problem or solution space is still exploratory and multiple directions should be surfaced before commitment.",
      "Brainstorming expands option space, captures technique outputs when needed, and converges on selected directions and priority directions.",
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
    key: "implementation",
    displayName: "Implementation",
    descriptionJson: toDescriptionJson(
      "Executes bounded implementation work from approved implementation drafts and preserves planning, code-change, and validation outputs.",
    ),
    guidanceJson: toGuidanceJson(
      "Use Implementation when requirements have been decomposed into execution-sized work that should now change code in the repository.",
      "Implementation turns approved implementation drafts into a concrete plan, applied code changes, and durable validation outputs.",
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
      "Treat Setup as done only when the durable setup summary and canonical overview artifact are available, and any required downstream work units have been created through the workflow.",
    ),
  },
  brainstorming: {
    descriptionJson: toDescriptionJson(
      "Brainstorming has produced a session artifact plus converged directions that are ready for downstream planning.",
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
      "Treat PRD as done only when its requirement contract and canonical PRD artifact are durable.",
    ),
  },
  implementation: {
    descriptionJson: toDescriptionJson(
      "Implementation has produced a bounded execution plan, applied code changes, and recorded validation results for the selected implementation drafts.",
    ),
    guidanceJson: toGuidanceJson(
      "Treat Implementation as done only when the execution plan, implemented code changes, validation results, and implementation artifacts are durable.",
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
export const implementationLifecycleStateSeedRows: readonly MethodologyLifecycleStateSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildLifecycleStateSeedRowsFor("implementation", versionId),
  );
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
    "Use this transition to complete setup once the durable setup record and project overview artifact have been propagated.",
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
    "Use this transition once the PRD requirement contract and canonical artifact are durable.",
  ),
  implementation: toGuidanceJson(
    "Use this transition once Implementation has produced its execution plan, code-change record, validation outputs, and canonical implementation artifacts.",
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
export const implementationLifecycleTransitionSeedRows: readonly MethodologyLifecycleTransitionSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildLifecycleTransitionSeedRowsFor("implementation", versionId),
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

function factEqualsCondition(
  workUnitKey: WorkUnitKey,
  factKey: string,
  idSuffix: string,
  value: unknown,
  methodologyVersionId: CanonicalMethodologyVersionId,
) {
  return {
    kind: "work_unit_fact",
    required: true,
    config: {
      factKey,
      factDefinitionId: workUnitFactDefinitionId(workUnitKey, idSuffix, methodologyVersionId),
      operator: "equals",
      comparisonJson: { value },
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
      completionMode?: "all" | "any";
      completionGroupsJson: readonly { mode: "all" | "any"; conditions: readonly unknown[] }[];
    }
  > = {
    setup: {
      startGroupsJson: [],
      completionGroupsJson: [
        {
          mode: "all",
          conditions: [
            factCondition(
              "setup",
              "setup_path_summary",
              "setup-path-summary",
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
              "brainstorming_focus",
              "brainstorming-focus",
              methodologyVersionId,
            ),
            factCondition(
              "brainstorming",
              "desired_outcome",
              "desired-outcome",
              methodologyVersionId,
            ),
            factCondition("brainstorming", "objectives", "objectives", methodologyVersionId),
            factCondition(
              "brainstorming",
              "selected_directions",
              "selected-directions",
              methodologyVersionId,
            ),
            factCondition(
              "brainstorming",
              "priority_directions",
              "priority-directions",
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
      startGroupsJson: [],
      completionMode: "any",
      completionGroupsJson: [
        {
          mode: "all",
          conditions: [
            factEqualsCondition(
              "research",
              "research_type",
              "research-type",
              "market",
              methodologyVersionId,
            ),
            factCondition("research", "research_topic", "research-topic", methodologyVersionId),
            factCondition("research", "research_goals", "research-goals", methodologyVersionId),
            factCondition(
              "research",
              "market_source_inventory",
              "market-source-inventory",
              methodologyVersionId,
            ),
            factCondition(
              "research",
              "market_research_synthesis",
              "market-research-synthesis",
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
        {
          mode: "all",
          conditions: [
            factEqualsCondition(
              "research",
              "research_type",
              "research-type",
              "domain",
              methodologyVersionId,
            ),
            factCondition("research", "research_topic", "research-topic", methodologyVersionId),
            factCondition("research", "research_goals", "research-goals", methodologyVersionId),
            factCondition(
              "research",
              "domain_source_inventory",
              "domain-source-inventory",
              methodologyVersionId,
            ),
            factCondition(
              "research",
              "domain_research_synthesis",
              "domain-research-synthesis",
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
        {
          mode: "all",
          conditions: [
            factEqualsCondition(
              "research",
              "research_type",
              "research-type",
              "technical",
              methodologyVersionId,
            ),
            factCondition("research", "research_topic", "research-topic", methodologyVersionId),
            factCondition("research", "research_goals", "research-goals", methodologyVersionId),
            factCondition(
              "research",
              "technical_source_inventory",
              "technical-source-inventory",
              methodologyVersionId,
            ),
            factCondition(
              "research",
              "technical_research_synthesis",
              "technical-research-synthesis",
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
            artifactCondition("prd", "PRD", "prd", methodologyVersionId),
          ],
        },
      ],
    },
    implementation: {
      startGroupsJson: [
        {
          mode: "all",
          conditions: [
            factCondition("implementation", "prd_work_unit", "prd-work-unit", methodologyVersionId),
          ],
        },
      ],
      completionGroupsJson: [
        {
          mode: "all",
          conditions: [
            factCondition(
              "implementation",
              "implementation_scope",
              "implementation-scope",
              methodologyVersionId,
            ),
            factCondition(
              "implementation",
              "implementation_plan",
              "implementation-plan",
              methodologyVersionId,
            ),
            factCondition(
              "implementation",
              "code_change_summary",
              "code-change-summary",
              methodologyVersionId,
            ),
            factCondition(
              "implementation",
              "validation_summary",
              "validation-summary",
              methodologyVersionId,
            ),
            factCondition("implementation", "test_results", "test-results", methodologyVersionId),
            factCondition(
              "implementation",
              "implementation_status_summary",
              "implementation-status-summary",
              methodologyVersionId,
            ),
            artifactCondition(
              "implementation",
              "IMPLEMENTATION_PLAN",
              "implementation-plan",
              methodologyVersionId,
            ),
            artifactCondition(
              "implementation",
              "IMPLEMENTED_CODE_CHANGES",
              "implemented-code-changes",
              methodologyVersionId,
            ),
            artifactCondition(
              "implementation",
              "IMPLEMENTATION_TEST_REPORT",
              "implementation-test-report",
              methodologyVersionId,
            ),
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
      mode: definition.completionMode ?? "all",
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
export const implementationTransitionConditionSetSeedRows: readonly MethodologyTransitionConditionSetSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildTransitionConditionSetSeedRowsFor("implementation", versionId),
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
    idSuffix: "setup-path-summary",
    key: "setup_path_summary",
    name: "Setup Path Summary",
    factType: "json",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "Structured record of the setup path selected, what was invoked, what was deferred, and what should happen next.",
    ),
    guidanceJson: toGuidanceJson(
      "Persist the durable summary of the setup path that was chosen, why it was chosen, and which work unit should come next.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["selected_path", "rationale"],
        properties: {
          selected_path: { type: "string", cardinality: "one" },
          rationale: { type: "string", cardinality: "one" },
        },
      },
    },
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
      "The core topic, problem, opportunity, or decision area the brainstorming session should explore.",
    ),
    guidanceJson: toGuidanceJson(
      "Write this as a single clear focus statement so the session stays centered on one thing.",
    ),
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
      "What the user wants to leave the brainstorming session with.",
    ),
    guidanceJson: toGuidanceJson(
      "Capture the concrete outcome the session should produce, such as clearer options, a shortlist of directions, a decision, or a refined concept.",
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
      "The specific questions, goals, or angles the brainstorming session should explore in service of the desired outcome.",
    ),
    guidanceJson: toGuidanceJson(
      "Capture the main things the session must investigate, compare, clarify, or generate.",
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
      subSchema: {
        type: "object",
        fields: [
          { key: "title", type: "string", cardinality: "one" },
          { key: "motivation", type: "string", cardinality: "one" },
          { key: "success_signal", type: "string", cardinality: "one" },
          { key: "priority", type: "string", cardinality: "one" },
          { key: "notes", type: "string", cardinality: "one" },
        ],
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
      subSchema: {
        type: "object",
        fields: [
          { key: "must_have", type: "string", cardinality: "many" },
          { key: "must_avoid", type: "string", cardinality: "many" },
          { key: "timebox_notes", type: "string", cardinality: "many" },
          { key: "known_constraints", type: "string", cardinality: "many" },
        ],
      },
    },
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
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["workflow_key", "summary"],
        properties: {
          workflow_key: { type: "string", cardinality: "one" },
          summary: { type: "string", cardinality: "one" },
          ideas: { type: "string", cardinality: "many" },
          tensions: { type: "string", cardinality: "many" },
          refinements: { type: "string", cardinality: "many" },
        },
      },
      subSchema: {
        type: "object",
        fields: [
          { key: "workflow_key", type: "string", cardinality: "one" },
          { key: "summary", type: "string", cardinality: "one" },
          { key: "ideas", type: "string", cardinality: "many" },
          { key: "tensions", type: "string", cardinality: "many" },
          { key: "refinements", type: "string", cardinality: "many" },
        ],
      },
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
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["primary_directions"],
        properties: {
          primary_directions: { type: "string", cardinality: "many" },
          quick_wins: { type: "string", cardinality: "many" },
          breakthrough_concepts: { type: "string", cardinality: "many" },
          deferred_directions: { type: "string", cardinality: "many" },
        },
      },
      subSchema: {
        type: "object",
        fields: [
          { key: "primary_directions", type: "string", cardinality: "many" },
          { key: "quick_wins", type: "string", cardinality: "many" },
          { key: "breakthrough_concepts", type: "string", cardinality: "many" },
          { key: "deferred_directions", type: "string", cardinality: "many" },
        ],
      },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "priority-directions",
    key: "priority_directions",
    name: "Priority Directions",
    factType: "json",
    cardinality: "many",
    descriptionJson: toDescriptionJson(
      "Prioritized directions selected for downstream planning or architecture work.",
    ),
    guidanceJson: toGuidanceJson(
      "Persist the ranked directions that should anchor downstream planning and tradeoff decisions.",
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
          priority: { type: "string", cardinality: "one" },
          rationale: { type: "string", cardinality: "one" },
          next_step: { type: "string", cardinality: "one" },
        },
      },
      subSchema: {
        type: "object",
        fields: [
          { key: "title", type: "string", cardinality: "one" },
          { key: "priority", type: "string", cardinality: "one" },
          { key: "rationale", type: "string", cardinality: "one" },
          { key: "next_step", type: "string", cardinality: "one" },
        ],
      },
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
    idSuffix: "market-source-inventory",
    key: "market_source_inventory",
    name: "Market Source Inventory",
    factType: "json",
    cardinality: "many",
    descriptionJson: toDescriptionJson(
      "Inventory of sources used or considered during the market research effort.",
    ),
    guidanceJson: toGuidanceJson(
      "Store credibility, relevance, and source type metadata for the market research inputs used.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: { type: "object" },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "market-research-synthesis",
    key: "market_research_synthesis",
    name: "Market Research Synthesis",
    factType: "json",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "Structured downstream-consumable summary of market research findings, implications, and recommendations.",
    ),
    guidanceJson: toGuidanceJson(
      "Persist a durable market synthesis with findings, risks, downstream implications, and verification notes.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: { type: "object" },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "domain-source-inventory",
    key: "domain_source_inventory",
    name: "Domain Source Inventory",
    factType: "json",
    cardinality: "many",
    descriptionJson: toDescriptionJson(
      "Inventory of sources used or considered during the domain research effort.",
    ),
    guidanceJson: toGuidanceJson(
      "Store credibility, relevance, and source type metadata for the domain research inputs used.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: { type: "object" },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "domain-research-synthesis",
    key: "domain_research_synthesis",
    name: "Domain Research Synthesis",
    factType: "json",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "Structured downstream-consumable summary of domain research findings, implications, and recommendations.",
    ),
    guidanceJson: toGuidanceJson(
      "Persist a durable domain synthesis with findings, risks, downstream implications, and verification notes.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: { type: "object" },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "technical-source-inventory",
    key: "technical_source_inventory",
    name: "Technical Source Inventory",
    factType: "json",
    cardinality: "many",
    descriptionJson: toDescriptionJson(
      "Inventory of sources used or considered during the technical research effort.",
    ),
    guidanceJson: toGuidanceJson(
      "Store credibility, relevance, and source type metadata for the technical research inputs used.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: { type: "object" },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "technical-research-synthesis",
    key: "technical_research_synthesis",
    name: "Technical Research Synthesis",
    factType: "json",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "Structured downstream-consumable summary of technical research findings, implications, and recommendations.",
    ),
    guidanceJson: toGuidanceJson(
      "Persist a durable technical synthesis with findings, risks, downstream implications, and verification notes.",
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
    cardinality: "many",
    descriptionJson: toDescriptionJson(
      "Optional Brainstorming references whose outputs fed this Product Brief.",
    ),
    guidanceJson: toGuidanceJson(
      "Bind relevant brainstorming inputs explicitly when they materially shaped the brief.",
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
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["core_idea", "target_users", "problem", "desired_outcome", "source_mode"],
        properties: {
          core_idea: { type: "string", cardinality: "one" },
          target_users: { type: "string", cardinality: "many" },
          problem: { type: "string", cardinality: "one" },
          desired_outcome: { type: "string", cardinality: "one" },
          constraints: { type: "string", cardinality: "many" },
          source_mode: { type: "string", cardinality: "one" },
        },
      },
      subSchema: {
        type: "object",
        fields: [
          { key: "core_idea", type: "string", cardinality: "one" },
          { key: "target_users", type: "string", cardinality: "many" },
          { key: "problem", type: "string", cardinality: "one" },
          { key: "desired_outcome", type: "string", cardinality: "one" },
          { key: "constraints", type: "string", cardinality: "many" },
          { key: "source_mode", type: "string", cardinality: "one" },
        ],
      },
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
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["key_inputs", "contradictions", "remaining_gaps"],
        properties: {
          key_inputs: { type: "string", cardinality: "many" },
          contradictions: { type: "string", cardinality: "many" },
          remaining_gaps: { type: "string", cardinality: "many" },
          ignored_inputs: { type: "string", cardinality: "many" },
        },
      },
      subSchema: {
        type: "object",
        fields: [
          { key: "key_inputs", type: "string", cardinality: "many" },
          { key: "contradictions", type: "string", cardinality: "many" },
          { key: "remaining_gaps", type: "string", cardinality: "many" },
          { key: "ignored_inputs", type: "string", cardinality: "many" },
        ],
      },
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
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["executive_summary", "problem", "solution", "scope", "prd_readiness"],
        properties: {
          executive_summary: { type: "string", cardinality: "one" },
          problem: { type: "string", cardinality: "one" },
          solution: { type: "string", cardinality: "one" },
          differentiators: { type: "string", cardinality: "many" },
          scope: { type: "string", cardinality: "many" },
          prd_readiness: { type: "string", cardinality: "one" },
        },
      },
      subSchema: {
        type: "object",
        fields: [
          { key: "executive_summary", type: "string", cardinality: "one" },
          { key: "problem", type: "string", cardinality: "one" },
          { key: "solution", type: "string", cardinality: "one" },
          { key: "differentiators", type: "string", cardinality: "many" },
          { key: "scope", type: "string", cardinality: "many" },
          { key: "prd_readiness", type: "string", cardinality: "one" },
        ],
      },
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
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["reviewer_type", "finding", "impact"],
        properties: {
          reviewer_type: { type: "string", cardinality: "one" },
          finding: { type: "string", cardinality: "one" },
          impact: { type: "string", cardinality: "one" },
          recommendation: { type: "string", cardinality: "one" },
          disposition: { type: "string", cardinality: "one" },
        },
      },
      subSchema: {
        type: "object",
        fields: [
          { key: "reviewer_type", type: "string", cardinality: "one" },
          { key: "finding", type: "string", cardinality: "one" },
          { key: "impact", type: "string", cardinality: "one" },
          { key: "recommendation", type: "string", cardinality: "one" },
          { key: "disposition", type: "string", cardinality: "one" },
        ],
      },
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
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["question", "reason"],
        properties: {
          question: { type: "string", cardinality: "one" },
          reason: { type: "string", cardinality: "one" },
          blocking: { type: "boolean", cardinality: "one" },
          owner_hint: { type: "string", cardinality: "one" },
        },
      },
      subSchema: {
        type: "object",
        fields: [
          { key: "question", type: "string", cardinality: "one" },
          { key: "reason", type: "string", cardinality: "one" },
          { key: "blocking", type: "boolean", cardinality: "one" },
          { key: "owner_hint", type: "string", cardinality: "one" },
        ],
      },
    },
    defaultValueJson: null,
  },
] as const satisfies readonly FactDefinitionConfig[];

const prdFactDefinitions = [
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
    cardinality: "many",
    descriptionJson: toDescriptionJson("Optional Brainstorming input used by the PRD."),
    guidanceJson: toGuidanceJson(
      "Bind Brainstorming work units only when they directly shaped requirement framing or scope.",
    ),
    validationJson: {
      kind: "none" as const,
      dependencyType: "informed_by_brainstorming",
      workUnitKey: "brainstorming",
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
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["core_idea", "target_users", "problem", "desired_outcome"],
        properties: {
          core_idea: { type: "string", cardinality: "one" },
          target_users: { type: "string", cardinality: "many" },
          problem: { type: "string", cardinality: "one" },
          desired_outcome: { type: "string", cardinality: "one" },
          differentiators: { type: "string", cardinality: "many" },
          constraints: { type: "string", cardinality: "many" },
        },
      },
      subSchema: {
        type: "object",
        fields: [
          { key: "core_idea", type: "string", cardinality: "one" },
          { key: "target_users", type: "string", cardinality: "many" },
          { key: "problem", type: "string", cardinality: "one" },
          { key: "desired_outcome", type: "string", cardinality: "one" },
          { key: "differentiators", type: "string", cardinality: "many" },
          { key: "constraints", type: "string", cardinality: "many" },
        ],
      },
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
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["user_outcomes", "business_outcomes"],
        properties: {
          user_outcomes: { type: "string", cardinality: "many" },
          business_outcomes: { type: "string", cardinality: "many" },
          technical_outcomes: { type: "string", cardinality: "many" },
          guardrails: { type: "string", cardinality: "many" },
        },
      },
      subSchema: {
        type: "object",
        fields: [
          { key: "user_outcomes", type: "string", cardinality: "many" },
          { key: "business_outcomes", type: "string", cardinality: "many" },
          { key: "technical_outcomes", type: "string", cardinality: "many" },
          { key: "guardrails", type: "string", cardinality: "many" },
        ],
      },
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
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["journey_name", "actor", "goal"],
        properties: {
          journey_name: { type: "string", cardinality: "one" },
          actor: { type: "string", cardinality: "one" },
          goal: { type: "string", cardinality: "one" },
          narrative: { type: "string", cardinality: "one" },
          key_steps: { type: "string", cardinality: "many" },
          edge_cases: { type: "string", cardinality: "many" },
        },
      },
      subSchema: {
        type: "object",
        fields: [
          { key: "journey_name", type: "string", cardinality: "one" },
          { key: "actor", type: "string", cardinality: "one" },
          { key: "goal", type: "string", cardinality: "one" },
          { key: "narrative", type: "string", cardinality: "one" },
          { key: "key_steps", type: "string", cardinality: "many" },
          { key: "edge_cases", type: "string", cardinality: "many" },
        ],
      },
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
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["mvp_in_scope"],
        properties: {
          mvp_in_scope: { type: "string", cardinality: "many" },
          explicitly_out_of_scope: { type: "string", cardinality: "many" },
          phased_follow_ups: { type: "string", cardinality: "many" },
          risk_notes: { type: "string", cardinality: "many" },
        },
      },
      subSchema: {
        type: "object",
        fields: [
          { key: "mvp_in_scope", type: "string", cardinality: "many" },
          { key: "explicitly_out_of_scope", type: "string", cardinality: "many" },
          { key: "phased_follow_ups", type: "string", cardinality: "many" },
          { key: "risk_notes", type: "string", cardinality: "many" },
        ],
      },
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
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["requirement_id", "statement"],
        properties: {
          requirement_id: { type: "string", cardinality: "one" },
          statement: { type: "string", cardinality: "one" },
          rationale: { type: "string", cardinality: "one" },
          related_journeys: { type: "string", cardinality: "many" },
        },
      },
      subSchema: {
        type: "object",
        fields: [
          { key: "requirement_id", type: "string", cardinality: "one" },
          { key: "statement", type: "string", cardinality: "one" },
          { key: "rationale", type: "string", cardinality: "one" },
          { key: "related_journeys", type: "string", cardinality: "many" },
        ],
      },
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
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["category", "statement"],
        properties: {
          category: { type: "string", cardinality: "one" },
          statement: { type: "string", cardinality: "one" },
          rationale: { type: "string", cardinality: "one" },
          measurable_criteria: { type: "string", cardinality: "many" },
        },
      },
      subSchema: {
        type: "object",
        fields: [
          { key: "category", type: "string", cardinality: "one" },
          { key: "statement", type: "string", cardinality: "one" },
          { key: "rationale", type: "string", cardinality: "one" },
          { key: "measurable_criteria", type: "string", cardinality: "many" },
        ],
      },
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
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["summary", "implementation_readiness"],
        properties: {
          summary: { type: "string", cardinality: "one" },
          key_decisions: { type: "string", cardinality: "many" },
          implementation_readiness: { type: "string", cardinality: "one" },
          major_open_questions: { type: "string", cardinality: "many" },
        },
      },
      subSchema: {
        type: "object",
        fields: [
          { key: "summary", type: "string", cardinality: "one" },
          { key: "key_decisions", type: "string", cardinality: "many" },
          { key: "implementation_readiness", type: "string", cardinality: "one" },
          { key: "major_open_questions", type: "string", cardinality: "many" },
        ],
      },
    },
    defaultValueJson: null,
  },
] as const satisfies readonly FactDefinitionConfig[];

const implementationFactDefinitions = [
  {
    idSuffix: "prd-work-unit",
    key: "prd_work_unit",
    name: "PRD Work Unit",
    factType: "work_unit",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "Preferred PRD source reference for this Implementation work unit.",
    ),
    guidanceJson: toGuidanceJson(
      "Implementation should bind exactly one chosen PRD that defined the approved execution boundary.",
    ),
    validationJson: {
      kind: "none" as const,
      dependencyType: "informed_by_prd",
      workUnitKey: "prd",
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "research-work-units",
    key: "research_work_units",
    name: "Research Work Units",
    factType: "work_unit",
    cardinality: "many",
    descriptionJson: toDescriptionJson("Optional Research references that shaped implementation."),
    guidanceJson: toGuidanceJson(
      "Bind research explicitly when it affects implementation constraints, validation, or technical tradeoffs.",
    ),
    validationJson: {
      kind: "none" as const,
      dependencyType: "informed_by_research",
      workUnitKey: "research",
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "brainstorming-work-units",
    key: "brainstorming_work_units",
    name: "Brainstorming Work Units",
    factType: "work_unit",
    cardinality: "many",
    descriptionJson: toDescriptionJson(
      "Optional Brainstorming references that shaped implementation slicing or constraints.",
    ),
    guidanceJson: toGuidanceJson(
      "Bind brainstorming explicitly when implementation execution depends on those explored directions.",
    ),
    validationJson: {
      kind: "none" as const,
      dependencyType: "informed_by_brainstorming",
      workUnitKey: "brainstorming",
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "implementation-mode",
    key: "implementation_mode",
    name: "Implementation Mode",
    factType: "string",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "Execution mode for this implementation run, used to distinguish small safe runs from fuller paths.",
    ),
    guidanceJson: toGuidanceJson(
      "Use one_shot for small safe changes and full_path for larger or more guarded implementation runs.",
    ),
    validationJson: toAllowedValuesValidation(["one_shot", "full_path"]),
    defaultValueJson: null,
  },
  {
    idSuffix: "implementation-constraints",
    key: "implementation_constraints",
    name: "Implementation Constraints",
    factType: "json",
    cardinality: "many",
    descriptionJson: toDescriptionJson(
      "Implementation-specific constraints that should shape execution choices and validation.",
    ),
    guidanceJson: toGuidanceJson(
      "Capture constraints only when they materially narrow or shape how implementation should proceed.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["constraint", "reason"],
        properties: {
          constraint: { type: "string", cardinality: "one" },
          reason: { type: "string", cardinality: "one" },
          severity: {
            type: "string",
            cardinality: "one",
            enum: ["low", "medium", "high", "blocker"],
          },
        },
      },
      subSchema: {
        type: "object",
        fields: [
          { key: "constraint", type: "string", cardinality: "one" },
          { key: "reason", type: "string", cardinality: "one" },
          { key: "severity", type: "string", cardinality: "one" },
        ],
      },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "implementation-scope",
    key: "implementation_scope",
    name: "Implementation Scope",
    factType: "json",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "Bounded scope definition for the implementation run created from one or more implementation drafts.",
    ),
    guidanceJson: toGuidanceJson(
      "Persist the minimal execution scope that safely describes what this run will implement and what it will not.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["title", "summary"],
        properties: {
          title: { type: "string", cardinality: "one" },
          summary: { type: "string", cardinality: "one" },
          included_changes: { type: "string", cardinality: "many" },
          excluded_changes: { type: "string", cardinality: "many" },
          acceptance_focus: { type: "string", cardinality: "many" },
        },
      },
      subSchema: {
        type: "object",
        fields: [
          { key: "title", type: "string", cardinality: "one" },
          { key: "summary", type: "string", cardinality: "one" },
          { key: "included_changes", type: "string", cardinality: "many" },
          { key: "excluded_changes", type: "string", cardinality: "many" },
          { key: "acceptance_focus", type: "string", cardinality: "many" },
        ],
      },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "implementation-plan",
    key: "implementation_plan",
    name: "Implementation Plan",
    factType: "json",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "Concrete execution plan for implementing the selected scope safely and efficiently.",
    ),
    guidanceJson: toGuidanceJson(
      "Persist the execution plan in a way that downstream review can compare against the actual code changes.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["execution_summary", "ordered_steps"],
        properties: {
          execution_summary: { type: "string", cardinality: "one" },
          ordered_steps: { type: "string", cardinality: "many" },
          risk_areas: { type: "string", cardinality: "many" },
          validation_approach: { type: "string", cardinality: "many" },
        },
      },
      subSchema: {
        type: "object",
        fields: [
          { key: "execution_summary", type: "string", cardinality: "one" },
          { key: "ordered_steps", type: "string", cardinality: "many" },
          { key: "risk_areas", type: "string", cardinality: "many" },
          { key: "validation_approach", type: "string", cardinality: "many" },
        ],
      },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "files-to-change",
    key: "files_to_change",
    name: "Files to Change",
    factType: "json",
    cardinality: "many",
    descriptionJson: toDescriptionJson(
      "Likely file or module touch points identified during implementation planning.",
    ),
    guidanceJson: toGuidanceJson(
      "Record likely touch points only when they are reasonably inferable from the codebase and approved implementation scope.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["path", "reason"],
        properties: {
          path: { type: "string", cardinality: "one" },
          reason: { type: "string", cardinality: "one" },
          confidence: {
            type: "string",
            cardinality: "one",
            enum: ["low", "medium", "high"],
          },
        },
      },
      subSchema: {
        type: "object",
        fields: [
          { key: "path", type: "string", cardinality: "one" },
          { key: "reason", type: "string", cardinality: "one" },
          { key: "confidence", type: "string", cardinality: "one" },
        ],
      },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "code-change-summary",
    key: "code_change_summary",
    name: "Code Change Summary",
    factType: "json",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "Durable summary of what code changes were actually implemented in this run.",
    ),
    guidanceJson: toGuidanceJson(
      "Persist the final implementation summary so review can compare what was planned versus what changed.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["summary"],
        properties: {
          summary: { type: "string", cardinality: "one" },
          changed_areas: { type: "string", cardinality: "many" },
          notable_decisions: { type: "string", cardinality: "many" },
          deviations_from_plan: { type: "string", cardinality: "many" },
        },
      },
      subSchema: {
        type: "object",
        fields: [
          { key: "summary", type: "string", cardinality: "one" },
          { key: "changed_areas", type: "string", cardinality: "many" },
          { key: "notable_decisions", type: "string", cardinality: "many" },
          { key: "deviations_from_plan", type: "string", cardinality: "many" },
        ],
      },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "validation-summary",
    key: "validation_summary",
    name: "Validation Summary",
    factType: "json",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "Durable summary of the validation outcome for the implemented changes.",
    ),
    guidanceJson: toGuidanceJson(
      "Capture the overall validation result, what passed, what failed, and what remains unresolved.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["overall_result", "summary"],
        properties: {
          overall_result: {
            type: "string",
            cardinality: "one",
            enum: ["passed", "passed_with_follow_ups", "failed", "blocked"],
          },
          summary: { type: "string", cardinality: "one" },
          passed_checks: { type: "string", cardinality: "many" },
          failed_checks: { type: "string", cardinality: "many" },
          unresolved_issues: { type: "string", cardinality: "many" },
        },
      },
      subSchema: {
        type: "object",
        fields: [
          { key: "overall_result", type: "string", cardinality: "one" },
          { key: "summary", type: "string", cardinality: "one" },
          { key: "passed_checks", type: "string", cardinality: "many" },
          { key: "failed_checks", type: "string", cardinality: "many" },
          { key: "unresolved_issues", type: "string", cardinality: "many" },
        ],
      },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "test-results",
    key: "test_results",
    name: "Test Results",
    factType: "json",
    cardinality: "many",
    descriptionJson: toDescriptionJson(
      "Structured record of tests, checks, or validation commands run during implementation verification.",
    ),
    guidanceJson: toGuidanceJson(
      "Persist enough detail for downstream review to understand what was verified and what the result was.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["check_type", "result"],
        properties: {
          check_type: {
            type: "string",
            cardinality: "one",
            enum: ["test", "typecheck", "build", "lint", "manual_verification", "other"],
          },
          command_or_method: { type: "string", cardinality: "one" },
          result: {
            type: "string",
            cardinality: "one",
            enum: ["passed", "failed", "skipped", "blocked"],
          },
          notes: { type: "string", cardinality: "one" },
        },
      },
      subSchema: {
        type: "object",
        fields: [
          { key: "check_type", type: "string", cardinality: "one" },
          { key: "command_or_method", type: "string", cardinality: "one" },
          { key: "result", type: "string", cardinality: "one" },
          { key: "notes", type: "string", cardinality: "one" },
        ],
      },
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
      "Findings captured during implementation review or validation triage.",
    ),
    guidanceJson: toGuidanceJson(
      "Store findings that shaped acceptance, patching, deferral, or follow-up work.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["reviewer_type", "finding", "impact"],
        properties: {
          reviewer_type: {
            type: "string",
            cardinality: "one",
            enum: ["self_review", "automated_check", "qa", "security", "architecture", "product"],
          },
          finding: { type: "string", cardinality: "one" },
          impact: {
            type: "string",
            cardinality: "one",
            enum: ["low", "medium", "high"],
          },
          recommendation: { type: "string", cardinality: "one" },
          disposition: {
            type: "string",
            cardinality: "one",
            enum: ["patch_now", "defer", "reject", "follow_up"],
          },
        },
      },
      subSchema: {
        type: "object",
        fields: [
          { key: "reviewer_type", type: "string", cardinality: "one" },
          { key: "finding", type: "string", cardinality: "one" },
          { key: "impact", type: "string", cardinality: "one" },
          { key: "recommendation", type: "string", cardinality: "one" },
          { key: "disposition", type: "string", cardinality: "one" },
        ],
      },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "open-implementation-questions",
    key: "open_implementation_questions",
    name: "Open Implementation Questions",
    factType: "json",
    cardinality: "many",
    descriptionJson: toDescriptionJson(
      "Unresolved implementation-specific questions that remain after planning, execution, or validation.",
    ),
    guidanceJson: toGuidanceJson(
      "Use for unresolved implementation issues that matter for acceptance, follow-up work, or later decomposition.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["question", "reason"],
        properties: {
          question: { type: "string", cardinality: "one" },
          reason: { type: "string", cardinality: "one" },
          blocking: { type: "boolean", cardinality: "one" },
          owner_hint: { type: "string", cardinality: "one" },
        },
      },
      subSchema: {
        type: "object",
        fields: [
          { key: "question", type: "string", cardinality: "one" },
          { key: "reason", type: "string", cardinality: "one" },
          { key: "blocking", type: "boolean", cardinality: "one" },
          { key: "owner_hint", type: "string", cardinality: "one" },
        ],
      },
    },
    defaultValueJson: null,
  },
  {
    idSuffix: "implementation-status-summary",
    key: "implementation_status_summary",
    name: "Implementation Status Summary",
    factType: "json",
    cardinality: "one",
    descriptionJson: toDescriptionJson(
      "Durable summary of the final status of this implementation run.",
    ),
    guidanceJson: toGuidanceJson(
      "Persist the final status, summary, blockers, and follow-up need in one compact downstream-readable record.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["status", "summary"],
        properties: {
          status: {
            type: "string",
            cardinality: "one",
            enum: ["completed", "completed_with_follow_ups", "blocked", "incomplete"],
          },
          summary: { type: "string", cardinality: "one" },
          blockers: { type: "string", cardinality: "many" },
          follow_up_needed: { type: "string", cardinality: "many" },
        },
      },
      subSchema: {
        type: "object",
        fields: [
          { key: "status", type: "string", cardinality: "one" },
          { key: "summary", type: "string", cardinality: "one" },
          { key: "blockers", type: "string", cardinality: "many" },
          { key: "follow_up_needed", type: "string", cardinality: "many" },
        ],
      },
    },
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
    implementation: implementationFactDefinitions,
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
export const implementationFactSchemaSeedRows: readonly MethodologyFactSchemaSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildWorkUnitFactDefinitionSeedRowsFor("implementation", versionId),
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
  implementation: [
    {
      idSuffix: "implementation-plan",
      key: "IMPLEMENTATION_PLAN",
      displayName: "Implementation Plan",
      descriptionJson: toDescriptionJson(
        "Canonical execution plan artifact for the implementation run.",
      ),
      guidanceJson: toGuidanceJson(
        "Use this as the durable implementation plan that defines scope, order, and validation intent.",
      ),
      cardinality: "single",
      rulesJson: {
        pathStrategy: "implementation-artifacts",
        suggestedPath: "implementation/implementation-plan.md",
        templateEngine: "handlebars",
        maxFiles: 1,
      },
    },
    {
      idSuffix: "implemented-code-changes",
      key: "IMPLEMENTED_CODE_CHANGES",
      displayName: "Implemented Code Changes",
      descriptionJson: toDescriptionJson(
        "Canonical durable record of the code changes applied for this implementation run.",
      ),
      guidanceJson: toGuidanceJson(
        "Use this as the durable implementation record of what changed and why.",
      ),
      cardinality: "single",
      rulesJson: {
        pathStrategy: "implementation-artifacts",
        suggestedPath: "implementation/implemented-code-changes.md",
        templateEngine: "handlebars",
        maxFiles: 1,
      },
    },
    {
      idSuffix: "implementation-test-report",
      key: "IMPLEMENTATION_TEST_REPORT",
      displayName: "Implementation Test Report",
      descriptionJson: toDescriptionJson(
        "Canonical validation and testing artifact for the implementation run.",
      ),
      guidanceJson: toGuidanceJson(
        "Use this as the durable validation report for the implemented changes.",
      ),
      cardinality: "single",
      rulesJson: {
        pathStrategy: "implementation-artifacts",
        suggestedPath: "implementation/implementation-test-report.md",
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
export const implementationArtifactSlotDefinitionSeedRows: readonly MethodologyArtifactSlotDefinitionSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildArtifactSlotDefinitionSeedRowsFor("implementation", versionId),
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
        "# Project Overview\n\n{{#if workUnit.facts.setup_path_summary}}## Setup Summary\n{{workUnit.facts.setup_path_summary.rationale}}\n\n- Selected path: {{workUnit.facts.setup_path_summary.selected_path}}\n{{/if}}{{#if methodology.facts.project_knowledge_directory}}- Knowledge directory: {{methodology.facts.project_knowledge_directory}}\n{{/if}}{{#if methodology.facts.planning_artifacts_directory}}- Planning artifacts: {{methodology.facts.planning_artifacts_directory}}\n{{/if}}",
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
        "# Brainstorming Session\n\n## Focus\n{{workUnit.facts.brainstorming_focus}}\n\n## Desired Outcome\n{{workUnit.facts.desired_outcome}}\n\n{{#if workUnit.facts.objectives}}## Objectives\n{{workUnit.facts.objectives}}\n{{/if}}\n\n{{#if workUnit.facts.constraints}}## Constraints\n{{workUnit.facts.constraints}}\n{{/if}}\n\n{{#if workUnit.facts.technique_outputs}}## Technique Outputs\n{{workUnit.facts.technique_outputs}}\n{{/if}}\n\n{{#if workUnit.facts.selected_directions}}## Selected Directions\n{{workUnit.facts.selected_directions}}\n{{/if}}\n\n{{#if workUnit.facts.priority_directions}}## Priority Directions\n{{workUnit.facts.priority_directions}}\n{{/if}}",
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
  product_brief: [],
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
        "# Product Requirements Document\n\n## Vision\n{{workUnit.facts.product_vision}}\n\n## Success Criteria\n{{workUnit.facts.success_criteria}}\n\n## Functional Requirements\n{{workUnit.facts.functional_requirements}}\n\n## Non-Functional Requirements\n{{workUnit.facts.non_functional_requirements}}",
    },
  ],
  implementation: [
    {
      idSuffix: "default-plan",
      slotSuffix: "implementation-plan",
      key: "default_plan",
      displayName: "Implementation Plan Template",
      descriptionJson: toDescriptionJson("Default template for the implementation plan artifact."),
      guidanceJson: toGuidanceJson(
        "Keep the implementation plan artifact structured around scope, plan, and likely touch points.",
      ),
      content:
        "# Implementation Plan\n\n## Scope\n{{workUnit.facts.implementation_scope}}\n\n## Plan\n{{workUnit.facts.implementation_plan}}\n\n## Likely Files to Change\n{{workUnit.facts.files_to_change}}",
    },
    {
      idSuffix: "default-code-changes",
      slotSuffix: "implemented-code-changes",
      key: "default_code_changes",
      displayName: "Implemented Code Changes Template",
      descriptionJson: toDescriptionJson(
        "Default template for the implemented code changes artifact.",
      ),
      guidanceJson: toGuidanceJson(
        "Keep the implementation record focused on the actual code changes and noteworthy execution outcomes.",
      ),
      content:
        "# Implemented Code Changes\n\n## Summary\n{{workUnit.facts.code_change_summary}}\n\n## Final Status\n{{workUnit.facts.implementation_status_summary}}",
    },
    {
      idSuffix: "default-test-report",
      slotSuffix: "implementation-test-report",
      key: "default_test_report",
      displayName: "Implementation Test Report Template",
      descriptionJson: toDescriptionJson(
        "Default template for the implementation test report artifact.",
      ),
      guidanceJson: toGuidanceJson(
        "Keep the implementation validation record structured around validation summary, tests, and findings.",
      ),
      content:
        "# Implementation Test Report\n\n## Validation Summary\n{{workUnit.facts.validation_summary}}\n\n## Test Results\n{{workUnit.facts.test_results}}\n\n## Review Findings\n{{workUnit.facts.review_findings}}",
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
export const implementationArtifactSlotTemplateSeedRows: readonly MethodologyArtifactSlotTemplateSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildArtifactSlotTemplateSeedRowsFor("implementation", versionId),
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
        "Use this workflow to understand the project, author the minimum setup baseline, invoke early units when needed, and propagate durable setup outputs.",
      ),
      metadataJson: {
        family: "setup",
        intent: "primary_setup_orchestration",
        supports_modes: ["greenfield"],
        bound_by_default: true,
        primary_transition_key: "activation_to_done",
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
      idSuffix: "research",
      key: "research",
      displayName: "Research",
      descriptionJson: toDescriptionJson(
        "Primary workflow for running market, domain, or technical research through a branched path.",
      ),
      guidanceJson: toGuidanceJson(
        "Use this workflow to confirm the research scope, branch into the correct research path, run the path-specific research agent, and propagate durable outputs.",
      ),
      metadataJson: {
        family: "research",
        intent: "branched_research_execution",
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
  implementation: [
    {
      idSuffix: "implementation",
      key: "implementation",
      displayName: "Implementation",
      descriptionJson: toDescriptionJson(
        "Primary workflow for planning, executing, and validating bounded implementation work.",
      ),
      guidanceJson: toGuidanceJson(
        "Use this workflow to turn approved implementation drafts into a concrete plan, code changes, validation results, and durable implementation artifacts.",
      ),
      metadataJson: {
        family: "implementation",
        intent: "bounded_code_implementation_execution",
        supports_modes: ["autonomous"],
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
    "setup-project": "greenfield_setup_agent",
  },
  brainstorming: {
    brainstorming: "session_setup",
    "first-principles-analysis": "frame_foundations",
    "five-whys-deep-dive": "define_problem_signal",
    "socratic-questioning": "frame_claims_to_probe",
    "stakeholder-round-table": "select_stakeholder_lenses",
    "critique-and-refine": "select_ideas_for_critique",
  },
  research: {
    research: "research_scope_confirmation",
  },
  product_brief: {
    "create-product-brief": "brief_intent_agent",
  },
  prd: {
    "create-prd": "prd_input_selection",
  },
  implementation: {
    implementation: "implementation_planning_agent",
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
export const implementationWorkflowSeedRows: readonly MethodologyWorkflowSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildWorkflowSeedRowsFor("implementation", versionId),
  );
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
      readonly validation?: unknown;
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
      readonly kind: "workflow_ref_fact";
      readonly cardinality: "one" | "many";
      readonly workflowWorkUnitKey: WorkUnitKey;
      readonly workflowSuffixes: readonly string[];
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
  readonly valueType: "string" | "number" | "boolean" | "json" | "work_unit";
  readonly required?: boolean;
  readonly descriptionMarkdown?: string;
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
  readonly methodologyWorkflowContextFactWorkflowReferences: readonly MethodologyWorkflowContextFactWorkflowReferenceSeedRow[];
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
        key: "requires_brainstorming_ctx",
        label: "Requires Brainstorming",
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
        selectedFactKeys: ["brainstorming_focus", "desired_outcome", "objectives"],
        selectedArtifactSlotSuffixes: ["brainstorming-session"],
      },
      {
        key: "research_draft_spec_ctx",
        label: "Research Draft Spec",
        kind: "work_unit_draft_spec_fact",
        cardinality: "many",
        targetWorkUnitKey: "research",
        selectedFactKeys: ["research_type", "research_topic", "research_goals"],
      },
    ],
    steps: [
      {
        key: "greenfield_setup_agent",
        type: "agent",
        displayName: "Greenfield Setup Agent",
        agentConfig: {
          objective:
            "Understand the project the user wants to build, coherently define the initial setup baseline, and author any Brainstorming and Research work-unit drafts needed for the next planning steps.",
          instructionsMarkdown:
            "You are operating in Chiron with access to MCP tools. Available tools:\n- chiron_read_step_snapshot: read the current step execution context, including objective, instructions, and runtime state\n- chiron_read_context_value: read the current value of a context fact before deciding whether to create or update it\n- chiron_write_context_value: create or update a setup-owned context fact or artifact reference by write item id\n\nStart by calling `chiron_read_step_snapshot`, then ask the user to explain the project they want to build. Critically engage with the user until the project is defined coherently enough for setup to proceed.\n\nUse the MCP tools deliberately:\n- read a context fact before updating it when you need to check whether a value already exists\n- create a value when the context fact is still empty\n- update a value when later user clarification makes the earlier draft incomplete or wrong\n- only write setup-owned workflow context and artifact references that this step is responsible for\n\nThese setup-owned context facts are writable in this step and each has a specific purpose:\n- `requires_brainstorming_ctx`: boolean routing signal; set it only when the project needs ideation, feature shaping, or decision exploration\n- `requires_research_ctx`: boolean routing signal; set it only when the project has open questions, feasibility uncertainty, or knowledge gaps that need evidence\n- `setup_path_summary_ctx`: durable summary of what setup learned, which path setup selected, and why\n- `project_overview_artifact_ctx`: artifact reference for the canonical setup overview document created from the conversation\n- `brainstorming_draft_spec_ctx`: draft spec used by invoke to create Brainstorming work units; write it only when `requires_brainstorming_ctx` is true\n- `research_draft_spec_ctx`: draft spec used by invoke to create Research work units; write it only when `requires_research_ctx` is true\n\nWhen you write `brainstorming_draft_spec_ctx`, shape it around the minimum framing the Brainstorming workflow now expects: `brainstorming_focus`, `desired_outcome`, and `objectives`. Write those only when they are supported by the conversation, but make them clear enough that Brainstorming can start with a coherent frame even if it later refines them further.\n\nWhen you write `research_draft_spec_ctx`, shape it around the minimum framing the Research workflow now expects: `research_type`, `research_topic`, and `research_goals`. Use `research_type` to choose whether the follow-up research should run as market, domain, or technical research. Make `research_topic` concrete and make `research_goals` specific enough that the downstream research path can execute against them without re-deriving the whole purpose from scratch.\n\nYour job is to understand the project at a high level, create the project overview artifact, capture the setup summary, and decide whether Brainstorming and/or Research work units should be authored for follow-up through invoke.\n\nDo not invent detailed requirements, implementation structure, or technical decisions that the user has not actually described. Do not treat temporary workflow context as durable project truth unless it is explicitly being promoted into setup-owned outputs.",
          readContextFactKeys: [],
          writeContextFactKeys: [
            "requires_brainstorming_ctx",
            "requires_research_ctx",
            "setup_path_summary_ctx",
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
            "requires_research_ctx",
            "setup_path_summary_ctx",
            "project_overview_artifact_ctx",
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
              contextFactKey: "setup_path_summary_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "setup_path_summary",
                  itemKey: "setup.setup_path_summary",
                  label: "Setup Path Summary",
                  targetContextFactKey: "setup_path_summary_ctx",
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
          defaultTargetStepKey: null,
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
              workflowSuffixes: ["research"],
            },
          ],
        },
      },
    ],
    explicitEdges: [
      { fromStepKey: "greenfield_setup_agent", toStepKey: "propagate_setup_outputs" },
      { fromStepKey: "propagate_setup_outputs", toStepKey: "branch_need_brainstorming" },
      { fromStepKey: "invoke_brainstorming_work", toStepKey: "branch_need_research" },
    ],
  },
  {
    workUnitKey: "brainstorming",
    workflowSuffix: "brainstorming",
    contextFacts: [
      {
        key: "brainstorming_focus_ctx",
        label: "Brainstorming Focus",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "brainstorming_focus",
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
        kind: "bound_fact",
        cardinality: "many",
        bindingKey: "objectives",
      },
      {
        key: "constraints_ctx",
        label: "Constraints",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "constraints",
      },
      {
        key: "need_specialist_techniques_ctx",
        label: "Need Specialist Techniques",
        kind: "plain_fact",
        cardinality: "one",
        valueType: "boolean",
      },
      {
        key: "selected_technique_workflow_refs_ctx",
        label: "Selected Technique Workflow Refs",
        kind: "workflow_ref_fact",
        cardinality: "many",
        workflowWorkUnitKey: "brainstorming",
        workflowSuffixes: [
          "first-principles-analysis",
          "five-whys-deep-dive",
          "socratic-questioning",
          "stakeholder-round-table",
          "critique-and-refine",
        ],
      },
      {
        key: "technique_outputs_ctx",
        label: "Technique Outputs",
        kind: "bound_fact",
        cardinality: "many",
        bindingKey: "technique_outputs",
      },
      {
        key: "idea_clusters_ctx",
        label: "Idea Clusters",
        kind: "plain_fact",
        cardinality: "many",
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
        key: "priority_directions_ctx",
        label: "Priority Directions",
        kind: "bound_fact",
        cardinality: "many",
        bindingKey: "priority_directions",
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
        key: "session_setup",
        type: "form",
        displayName: "Session Setup",
        formFields: [
          {
            key: "brainstorming_focus",
            label: "Brainstorming Focus",
            contextFactKey: "brainstorming_focus_ctx",
            valueType: "string",
            descriptionMarkdown:
              "The core topic, problem, opportunity, or decision area the brainstorming session should explore. Write this as a single clear focus statement so the session stays centered on one thing.",
          },
          {
            key: "desired_outcome",
            label: "Desired Outcome",
            contextFactKey: "desired_outcome_ctx",
            valueType: "string",
            descriptionMarkdown:
              "What the user wants to leave the brainstorming session with. Capture the concrete outcome the session should produce, such as clearer options, a shortlist of directions, a decision, or a refined concept.",
          },
          {
            key: "objectives",
            label: "Objectives",
            contextFactKey: "objectives_ctx",
            valueType: "json",
            descriptionMarkdown:
              "The specific questions, goals, or angles the brainstorming session should explore in service of the desired outcome. Capture the main things the session must investigate, compare, clarify, or generate.",
          },
          {
            key: "constraints",
            label: "Constraints",
            contextFactKey: "constraints_ctx",
            valueType: "json",
          },
        ],
      },
      {
        key: "facilitate_brainstorming_session",
        type: "agent",
        displayName: "Facilitate Brainstorming Session",
        agentConfig: {
          objective:
            "Facilitate the brainstorming session, decide whether specialist techniques are needed, and write the canonical brainstorming session artifact.",
          instructionsMarkdown:
            "Use any existing brainstorming focus, desired outcome, objectives, and constraints as the starting frame for the main brainstorming facilitation. If any of those framing facts are missing, unclear, or incomplete, clarify them through the conversation and create or update them before moving deeper into ideation. Help the user explore options, compare directions, and sharpen unclear ideas without converging too early. Decide whether specialist technique workflows are needed only when deeper structured probing would materially improve the session before synthesis, and write or update the canonical brainstorming session artifact as the session develops.",
          readContextFactKeys: [
            "brainstorming_focus_ctx",
            "desired_outcome_ctx",
            "objectives_ctx",
            "constraints_ctx",
          ],
          writeContextFactKeys: [
            "brainstorming_focus_ctx",
            "desired_outcome_ctx",
            "objectives_ctx",
            "constraints_ctx",
            "need_specialist_techniques_ctx",
            "selected_technique_workflow_refs_ctx",
            "brainstorming_session_artifact_ctx",
          ],
          writeItemRequirementContextFactKeysByWriteKey: {
            selected_technique_workflow_refs_ctx: ["need_specialist_techniques_ctx"],
          },
          completionRequirementContextFactKeys: [
            "brainstorming_focus_ctx",
            "desired_outcome_ctx",
            "objectives_ctx",
            "need_specialist_techniques_ctx",
            "brainstorming_session_artifact_ctx",
          ],
        },
      },
      {
        key: "branch_need_specialist_techniques",
        type: "branch",
        displayName: "Need Specialist Techniques?",
        branchConfig: {
          defaultTargetStepKey: "synthesize_session_outputs",
          routes: [
            {
              routeId: "needs_specialist_techniques",
              targetStepKey: "propagate_facilitation_outputs",
              conditionMode: "all",
              groups: [
                {
                  groupId: "needs_specialist_techniques_group",
                  mode: "all",
                  conditions: [
                    {
                      conditionId: "need_specialist_techniques_true",
                      contextFactKey: "need_specialist_techniques_ctx",
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
        key: "propagate_facilitation_outputs",
        type: "action",
        displayName: "Propagate Facilitation Outputs",
        actionConfig: {
          actions: [
            {
              actionId: "propagate_brainstorming_focus",
              actionKey: "propagate_brainstorming_focus",
              label: "Propagate Brainstorming Focus",
              contextFactKey: "brainstorming_focus_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "brainstorming_focus",
                  itemKey: "brainstorming.brainstorming_focus",
                  label: "Brainstorming Focus",
                  targetContextFactKey: "brainstorming_focus_ctx",
                },
              ],
            },
            {
              actionId: "propagate_desired_outcome",
              actionKey: "propagate_desired_outcome",
              label: "Propagate Desired Outcome",
              contextFactKey: "desired_outcome_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "desired_outcome",
                  itemKey: "brainstorming.desired_outcome",
                  label: "Desired Outcome",
                  targetContextFactKey: "desired_outcome_ctx",
                },
              ],
            },
            {
              actionId: "propagate_objectives",
              actionKey: "propagate_objectives",
              label: "Propagate Objectives",
              contextFactKey: "objectives_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "objectives",
                  itemKey: "brainstorming.objectives",
                  label: "Objectives",
                  targetContextFactKey: "objectives_ctx",
                },
              ],
            },
            {
              actionId: "propagate_constraints",
              actionKey: "propagate_constraints",
              label: "Propagate Constraints",
              contextFactKey: "constraints_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "constraints",
                  itemKey: "brainstorming.constraints",
                  label: "Constraints",
                  targetContextFactKey: "constraints_ctx",
                },
              ],
            },
            {
              actionId: "propagate_brainstorming_session_artifact_before_invoke",
              actionKey: "propagate_brainstorming_session_artifact_before_invoke",
              label: "Propagate Brainstorming Session Artifact",
              contextFactKey: "brainstorming_session_artifact_ctx",
              contextFactKind: "artifact_slot_reference_fact",
              items: [
                {
                  itemId: "brainstorming_session_artifact_before_invoke",
                  itemKey: "brainstorming.brainstorming_session",
                  label: "Brainstorming Session Artifact",
                  targetContextFactKey: "brainstorming_session_artifact_ctx",
                },
              ],
            },
          ],
        },
      },
      {
        key: "invoke_specialist_techniques",
        type: "invoke",
        displayName: "Invoke Specialist Techniques",
        invokeConfig: {
          targetKind: "workflow",
          sourceMode: "context_fact_backed",
          contextFactKey: "selected_technique_workflow_refs_ctx",
          bindings: [
            {
              destinationKind: "work_unit_fact",
              destinationWorkUnitKey: "brainstorming",
              destinationFactKey: "brainstorming_focus",
              sourceKind: "context_fact",
              contextFactKey: "brainstorming_focus_ctx",
            },
            {
              destinationKind: "work_unit_fact",
              destinationWorkUnitKey: "brainstorming",
              destinationFactKey: "desired_outcome",
              sourceKind: "context_fact",
              contextFactKey: "desired_outcome_ctx",
            },
            {
              destinationKind: "work_unit_fact",
              destinationWorkUnitKey: "brainstorming",
              destinationFactKey: "constraints",
              sourceKind: "context_fact",
              contextFactKey: "constraints_ctx",
            },
            {
              destinationKind: "artifact_slot",
              destinationSlotWorkUnitKey: "brainstorming",
              destinationSlotSuffix: "brainstorming-session",
              sourceKind: "context_fact",
              contextFactKey: "brainstorming_session_artifact_ctx",
            },
          ],
        },
      },
      {
        key: "synthesize_session_outputs",
        type: "agent",
        displayName: "Synthesize Session Outputs",
        agentConfig: {
          objective:
            "Synthesize the brainstorming session and any specialist-technique outputs into durable selected directions and priority directions, and update the canonical brainstorming session artifact to reflect the converged outcome.",
          instructionsMarkdown:
            "You are operating in Chiron with access to MCP tools. Start by reading the provided brainstorming context and treat it as the full working frame for this step. Use the brainstorming session artifact as the main record of the session so far. Also read any available specialist-technique outputs and the framing facts that define what the session was trying to achieve: the brainstorming focus, desired outcome, objectives, and any constraints.\n\nYour job in this step is convergence, not exploration. Evaluate the ideas captured so far against the brainstorming focus, desired outcome, objectives, and constraints. Be judgmental: reject weak, repetitive, unfocused, or low-value ideas instead of preserving them just because they were mentioned. Group the meaningful ideas into clear clusters when clustering helps explain the landscape, identify the strongest directions that actually deserve to survive, and prioritize the directions that should carry forward into downstream planning.\n\nWrite durable selected directions and priority directions that reflect the best converged outcome of the session rather than raw brainstorming noise. Then update the canonical brainstorming session artifact so it reflects the converged state of the session, including the main clusters when useful, the selected directions, and the priority directions. The artifact and the structured facts must agree with each other. Do not reopen broad ideation, do not invent new framing that the session does not support, and do not leave the artifact in a pre-convergence state after the structured outputs are written.",
          readContextFactKeys: [
            "brainstorming_session_artifact_ctx",
            "technique_outputs_ctx",
            "brainstorming_focus_ctx",
            "desired_outcome_ctx",
            "objectives_ctx",
            "constraints_ctx",
          ],
          writeContextFactKeys: [
            "idea_clusters_ctx",
            "selected_directions_ctx",
            "priority_directions_ctx",
            "brainstorming_session_artifact_ctx",
          ],
          writeItemRequirementContextFactKeysByWriteKey: {
            brainstorming_session_artifact_ctx: [
              "selected_directions_ctx",
              "priority_directions_ctx",
            ],
          },
          completionRequirementContextFactKeys: [
            "selected_directions_ctx",
            "priority_directions_ctx",
            "brainstorming_session_artifact_ctx",
          ],
        },
      },
      {
        key: "propagate_brainstorming_outputs",
        type: "action",
        displayName: "Propagate Brainstorming Outputs",
        actionConfig: {
          actions: [
            {
              actionId: "propagate_brainstorming_focus_final",
              actionKey: "propagate_brainstorming_focus_final",
              label: "Propagate Brainstorming Focus",
              contextFactKey: "brainstorming_focus_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "brainstorming_focus_final",
                  itemKey: "brainstorming.brainstorming_focus",
                  label: "Brainstorming Focus",
                  targetContextFactKey: "brainstorming_focus_ctx",
                },
              ],
            },
            {
              actionId: "propagate_desired_outcome_final",
              actionKey: "propagate_desired_outcome_final",
              label: "Propagate Desired Outcome",
              contextFactKey: "desired_outcome_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "desired_outcome_final",
                  itemKey: "brainstorming.desired_outcome",
                  label: "Desired Outcome",
                  targetContextFactKey: "desired_outcome_ctx",
                },
              ],
            },
            {
              actionId: "propagate_objectives_final",
              actionKey: "propagate_objectives_final",
              label: "Propagate Objectives",
              contextFactKey: "objectives_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "objectives_final",
                  itemKey: "brainstorming.objectives",
                  label: "Objectives",
                  targetContextFactKey: "objectives_ctx",
                },
              ],
            },
            {
              actionId: "propagate_constraints_final",
              actionKey: "propagate_constraints_final",
              label: "Propagate Constraints",
              contextFactKey: "constraints_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "constraints_final",
                  itemKey: "brainstorming.constraints",
                  label: "Constraints",
                  targetContextFactKey: "constraints_ctx",
                },
              ],
            },
            {
              actionId: "propagate_selected_directions",
              actionKey: "propagate_selected_directions",
              label: "Propagate Selected Directions",
              contextFactKey: "selected_directions_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "selected_directions",
                  itemKey: "brainstorming.selected_directions",
                  label: "Selected Directions",
                  targetContextFactKey: "selected_directions_ctx",
                },
              ],
            },
            {
              actionId: "propagate_priority_directions",
              actionKey: "propagate_priority_directions",
              label: "Propagate Priority Directions",
              contextFactKey: "priority_directions_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "priority_directions",
                  itemKey: "brainstorming.priority_directions",
                  label: "Priority Directions",
                  targetContextFactKey: "priority_directions_ctx",
                },
              ],
            },
            {
              actionId: "propagate_brainstorming_session_artifact",
              actionKey: "propagate_brainstorming_session_artifact",
              label: "Propagate Brainstorming Session Artifact",
              contextFactKey: "brainstorming_session_artifact_ctx",
              contextFactKind: "artifact_slot_reference_fact",
              items: [
                {
                  itemId: "brainstorming_session_artifact",
                  itemKey: "brainstorming.brainstorming_session",
                  label: "Brainstorming Session Artifact",
                  targetContextFactKey: "brainstorming_session_artifact_ctx",
                },
              ],
            },
          ],
        },
      },
    ],
    explicitEdges: [
      { fromStepKey: "session_setup", toStepKey: "facilitate_brainstorming_session" },
      {
        fromStepKey: "facilitate_brainstorming_session",
        toStepKey: "branch_need_specialist_techniques",
      },
      {
        fromStepKey: "propagate_facilitation_outputs",
        toStepKey: "invoke_specialist_techniques",
      },
      { fromStepKey: "invoke_specialist_techniques", toStepKey: "synthesize_session_outputs" },
      { fromStepKey: "synthesize_session_outputs", toStepKey: "propagate_brainstorming_outputs" },
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
        key: "brainstorming_focus_ctx",
        label: "Brainstorming Focus",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "brainstorming_focus",
      },
      {
        key: "desired_outcome_ctx",
        label: "Desired Outcome",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "desired_outcome",
      },
      {
        key: "constraints_ctx",
        label: "Constraints",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "constraints",
      },
      {
        key: "brainstorming_session_artifact_ctx",
        label: "Brainstorming Session Artifact",
        kind: "artifact_slot_reference_fact",
        cardinality: "one",
        slotWorkUnitKey: "brainstorming",
        slotSuffix: "brainstorming-session",
      },
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
        kind: "bound_fact",
        cardinality: "many",
        bindingKey: "technique_outputs",
      },
    ],
    steps: [
      {
        key:
          workflowSuffix === "first-principles-analysis"
            ? "frame_foundations"
            : workflowSuffix === "five-whys-deep-dive"
              ? "define_problem_signal"
              : workflowSuffix === "socratic-questioning"
                ? "frame_claims_to_probe"
                : workflowSuffix === "stakeholder-round-table"
                  ? "select_stakeholder_lenses"
                  : "select_ideas_for_critique",
        type: "form" as const,
        displayName:
          workflowSuffix === "first-principles-analysis"
            ? "Frame Foundations"
            : workflowSuffix === "five-whys-deep-dive"
              ? "Define Problem Signal"
              : workflowSuffix === "socratic-questioning"
                ? "Frame Claims to Probe"
                : workflowSuffix === "stakeholder-round-table"
                  ? "Select Stakeholder Lenses"
                  : "Select Ideas for Critique",
        formFields: [
          {
            key: "technique_focus",
            label: "Technique Focus",
            contextFactKey: "technique_focus_ctx",
            valueType: "string",
            required: true,
          },
        ],
      },
      {
        key: `run_${workflowSuffix.replaceAll("-", "_")}`,
        type: "agent" as const,
        displayName: "Run Technique",
        agentConfig: {
          objective: `Run the ${workflowSuffix} technique against the current brainstorming focus and record a durable technique output.`,
          instructionsMarkdown:
            "Use the brainstorming focus, desired outcome, constraints, and existing brainstorming session artifact to execute the technique. Produce a structured technique output that can be consumed during synthesis.",
          readContextFactKeys: [
            "brainstorming_focus_ctx",
            "desired_outcome_ctx",
            "constraints_ctx",
            "brainstorming_session_artifact_ctx",
            "technique_focus_ctx",
          ],
          writeContextFactKeys: ["technique_output_ctx"],
          completionRequirementContextFactKeys: ["technique_output_ctx"],
        },
      },
      {
        key:
          workflowSuffix === "first-principles-analysis"
            ? "capture_first_principles_output"
            : workflowSuffix === "five-whys-deep-dive"
              ? "capture_five_whys_output"
              : workflowSuffix === "socratic-questioning"
                ? "capture_socratic_output"
                : workflowSuffix === "stakeholder-round-table"
                  ? "capture_stakeholder_output"
                  : "capture_refinement_output",
        type: "action" as const,
        displayName: "Capture Technique Output",
        actionConfig: {
          actions: [
            {
              actionId: `propagate_${workflowSuffix.replaceAll("-", "_")}_output`,
              actionKey: `propagate_${workflowSuffix.replaceAll("-", "_")}_output`,
              label: "Propagate Technique Output",
              contextFactKey: "technique_output_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "technique_output",
                  itemKey: `brainstorming.${workflowSuffix}.technique_output`,
                  label: "Technique Output",
                  targetContextFactKey: "technique_output_ctx",
                },
              ],
            },
          ],
        },
      },
    ],
  })),
  {
    workUnitKey: "research",
    workflowSuffix: "research",
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
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "scope_notes",
      },
      {
        key: "market_source_inventory_ctx",
        label: "Market Source Inventory",
        kind: "bound_fact",
        cardinality: "many",
        bindingKey: "market_source_inventory",
      },
      {
        key: "market_research_synthesis_ctx",
        label: "Market Research Synthesis",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "market_research_synthesis",
      },
      {
        key: "domain_source_inventory_ctx",
        label: "Domain Source Inventory",
        kind: "bound_fact",
        cardinality: "many",
        bindingKey: "domain_source_inventory",
      },
      {
        key: "domain_research_synthesis_ctx",
        label: "Domain Research Synthesis",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "domain_research_synthesis",
      },
      {
        key: "technical_source_inventory_ctx",
        label: "Technical Source Inventory",
        kind: "bound_fact",
        cardinality: "many",
        bindingKey: "technical_source_inventory",
      },
      {
        key: "technical_research_synthesis_ctx",
        label: "Technical Research Synthesis",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "technical_research_synthesis",
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
          {
            key: "research_goals",
            label: "Research Goals",
            contextFactKey: "research_goals_ctx",
            valueType: "json",
            required: true,
          },
        ],
      },
      {
        key: "propagate_research_scope_inputs",
        type: "action",
        displayName: "Propagate Research Scope Inputs",
        actionConfig: {
          actions: [
            {
              actionId: "propagate_research_type",
              actionKey: "propagate_research_type",
              label: "Propagate Research Type",
              contextFactKey: "research_type_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "research_type",
                  itemKey: "research.research_type",
                  label: "Research Type",
                  targetContextFactKey: "research_type_ctx",
                },
              ],
            },
            {
              actionId: "propagate_research_topic",
              actionKey: "propagate_research_topic",
              label: "Propagate Research Topic",
              contextFactKey: "research_topic_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "research_topic",
                  itemKey: "research.research_topic",
                  label: "Research Topic",
                  targetContextFactKey: "research_topic_ctx",
                },
              ],
            },
            {
              actionId: "propagate_research_goals_initial",
              actionKey: "propagate_research_goals_initial",
              label: "Propagate Research Goals",
              contextFactKey: "research_goals_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "research_goals_initial",
                  itemKey: "research.research_goals",
                  label: "Research Goals",
                  targetContextFactKey: "research_goals_ctx",
                },
              ],
            },
          ],
        },
      },
      {
        key: "branch_research_kind",
        type: "branch",
        displayName: "Branch Research Kind",
        branchConfig: {
          defaultTargetStepKey: null,
          routes: [
            {
              routeId: "market_research_path",
              targetStepKey: "market_research_agent",
              conditionMode: "all",
              groups: [
                {
                  groupId: "market_research_group",
                  mode: "all",
                  conditions: [
                    {
                      conditionId: "research_type_market",
                      contextFactKey: "research_type_ctx",
                      operator: "equals",
                      comparisonJson: { value: "market" },
                    },
                  ],
                },
              ],
            },
            {
              routeId: "domain_research_path",
              targetStepKey: "domain_research_agent",
              conditionMode: "all",
              groups: [
                {
                  groupId: "domain_research_group",
                  mode: "all",
                  conditions: [
                    {
                      conditionId: "research_type_domain",
                      contextFactKey: "research_type_ctx",
                      operator: "equals",
                      comparisonJson: { value: "domain" },
                    },
                  ],
                },
              ],
            },
            {
              routeId: "technical_research_path",
              targetStepKey: "technical_research_agent",
              conditionMode: "all",
              groups: [
                {
                  groupId: "technical_research_group",
                  mode: "all",
                  conditions: [
                    {
                      conditionId: "research_type_technical",
                      contextFactKey: "research_type_ctx",
                      operator: "equals",
                      comparisonJson: { value: "technical" },
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
      {
        key: "market_research_agent",
        type: "agent",
        displayName: "Market Research Agent",
        agentConfig: {
          objective:
            "Conduct market research on the approved topic, produce a durable market source inventory and market research synthesis, and update the canonical research report artifact with the market-focused findings.",
          instructionsMarkdown:
            "You are operating in Chiron with access to MCP tools. Start by reading the provided research context and treat it as the full working frame for this step. Use the current research type, research topic, research goals, and any scope notes as the governing frame for the work. If the topic or goals are ambiguous, refine them through the research process and update them so the work unit ends with a clearer research frame than it started with.\n\nThis path is specifically for market research. Conduct the work with a market-analysis lens: identify customer or user demand signals, competing or adjacent alternatives, market expectations, positioning opportunities, adoption barriers, and any meaningful evidence about the problem space or opportunity space. Favor evidence that helps downstream planning understand whether the idea is attractive, differentiated, crowded, underserved, urgent, or commercially unclear.\n\nUse sources that are appropriate for market analysis and record them carefully. Build a durable market source inventory that captures what sources were used, why they matter, and how trustworthy or relevant they are. Then produce a durable market research synthesis that explains the most important findings, the implications for product and planning decisions, the strongest opportunities, the biggest risks or unknowns, and the recommendations that should carry forward.\n\nWrite or update the canonical research report artifact so it reflects the final market findings, not just raw notes. The artifact and the structured facts must agree with each other. Do not drift into generic product ideation, domain theory, or implementation design unless those are directly necessary to explain a market conclusion.",
          readContextFactKeys: [
            "research_type_ctx",
            "research_topic_ctx",
            "research_goals_ctx",
            "scope_notes_ctx",
          ],
          writeContextFactKeys: [
            "research_topic_ctx",
            "research_goals_ctx",
            "scope_notes_ctx",
            "market_source_inventory_ctx",
            "market_research_synthesis_ctx",
            "research_report_artifact_ctx",
          ],
          completionRequirementContextFactKeys: [
            "research_topic_ctx",
            "research_goals_ctx",
            "market_source_inventory_ctx",
            "market_research_synthesis_ctx",
            "research_report_artifact_ctx",
          ],
        },
      },
      {
        key: "propagate_market_research_outputs",
        type: "action",
        displayName: "Propagate Market Research Outputs",
        actionConfig: {
          actions: [
            {
              actionId: "propagate_market_research_topic",
              actionKey: "propagate_market_research_topic",
              label: "Propagate Research Topic",
              contextFactKey: "research_topic_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "market_research_topic",
                  itemKey: "research.research_topic",
                  label: "Research Topic",
                  targetContextFactKey: "research_topic_ctx",
                },
              ],
            },
            {
              actionId: "propagate_market_research_goals",
              actionKey: "propagate_market_research_goals",
              label: "Propagate Research Goals",
              contextFactKey: "research_goals_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "market_research_goals",
                  itemKey: "research.research_goals",
                  label: "Research Goals",
                  targetContextFactKey: "research_goals_ctx",
                },
              ],
            },
            {
              actionId: "propagate_market_scope_notes",
              actionKey: "propagate_market_scope_notes",
              label: "Propagate Scope Notes",
              contextFactKey: "scope_notes_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "market_scope_notes",
                  itemKey: "research.scope_notes",
                  label: "Scope Notes",
                  targetContextFactKey: "scope_notes_ctx",
                },
              ],
            },
            {
              actionId: "propagate_market_source_inventory",
              actionKey: "propagate_market_source_inventory",
              label: "Propagate Source Inventory",
              contextFactKey: "market_source_inventory_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "market_source_inventory",
                  itemKey: "research.market_source_inventory",
                  label: "Market Source Inventory",
                  targetContextFactKey: "market_source_inventory_ctx",
                },
              ],
            },
            {
              actionId: "propagate_market_research_synthesis",
              actionKey: "propagate_market_research_synthesis",
              label: "Propagate Research Synthesis",
              contextFactKey: "market_research_synthesis_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "market_research_synthesis",
                  itemKey: "research.market_research_synthesis",
                  label: "Market Research Synthesis",
                  targetContextFactKey: "market_research_synthesis_ctx",
                },
              ],
            },
            {
              actionId: "propagate_market_research_report_artifact",
              actionKey: "propagate_market_research_report_artifact",
              label: "Propagate Research Report Artifact",
              contextFactKey: "research_report_artifact_ctx",
              contextFactKind: "artifact_slot_reference_fact",
              items: [
                {
                  itemId: "market_research_report_artifact",
                  itemKey: "research.research_report",
                  label: "Research Report Artifact",
                  targetContextFactKey: "research_report_artifact_ctx",
                },
              ],
            },
          ],
        },
      },
      {
        key: "domain_research_agent",
        type: "agent",
        displayName: "Domain Research Agent",
        agentConfig: {
          objective:
            "Conduct domain research on the approved topic, produce a durable domain source inventory and domain research synthesis, and update the canonical research report artifact with the domain-focused findings.",
          instructionsMarkdown:
            "You are operating in Chiron with access to MCP tools. Start by reading the provided research context and treat it as the full working frame for this step. Use the current research type, research topic, research goals, and any scope notes as the governing frame for the work. If the topic or goals are ambiguous, refine them through the research process and update them so the work unit ends with a clearer research frame than it started with.\n\nThis path is specifically for domain research. Conduct the work with a domain-analysis lens: identify the important actors, workflows, concepts, constraints, norms, rules, regulations, dependencies, and structural realities that define this space. Focus on understanding how the domain actually works, what assumptions are safe or unsafe, what language or concepts matter, and what downstream planning must respect in order to stay grounded in reality.\n\nUse sources that are appropriate for domain understanding and record them carefully. Build a durable domain source inventory that captures what sources were used, why they matter, and how trustworthy or relevant they are. Then produce a durable domain research synthesis that explains the most important findings, the domain constraints and truths that downstream work must respect, the implications for product and planning decisions, the major unknowns, and the recommendations that should carry forward.\n\nWrite or update the canonical research report artifact so it reflects the final domain findings, not just raw notes. The artifact and the structured facts must agree with each other. Do not drift into speculative market positioning or technical architecture unless those are directly necessary to explain a domain conclusion.",
          readContextFactKeys: [
            "research_type_ctx",
            "research_topic_ctx",
            "research_goals_ctx",
            "scope_notes_ctx",
          ],
          writeContextFactKeys: [
            "research_topic_ctx",
            "research_goals_ctx",
            "scope_notes_ctx",
            "domain_source_inventory_ctx",
            "domain_research_synthesis_ctx",
            "research_report_artifact_ctx",
          ],
          completionRequirementContextFactKeys: [
            "research_topic_ctx",
            "research_goals_ctx",
            "domain_source_inventory_ctx",
            "domain_research_synthesis_ctx",
            "research_report_artifact_ctx",
          ],
        },
      },
      {
        key: "propagate_domain_research_outputs",
        type: "action",
        displayName: "Propagate Domain Research Outputs",
        actionConfig: {
          actions: [
            {
              actionId: "propagate_domain_research_topic",
              actionKey: "propagate_domain_research_topic",
              label: "Propagate Research Topic",
              contextFactKey: "research_topic_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "domain_research_topic",
                  itemKey: "research.research_topic",
                  label: "Research Topic",
                  targetContextFactKey: "research_topic_ctx",
                },
              ],
            },
            {
              actionId: "propagate_domain_research_goals",
              actionKey: "propagate_domain_research_goals",
              label: "Propagate Research Goals",
              contextFactKey: "research_goals_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "domain_research_goals",
                  itemKey: "research.research_goals",
                  label: "Research Goals",
                  targetContextFactKey: "research_goals_ctx",
                },
              ],
            },
            {
              actionId: "propagate_domain_scope_notes",
              actionKey: "propagate_domain_scope_notes",
              label: "Propagate Scope Notes",
              contextFactKey: "scope_notes_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "domain_scope_notes",
                  itemKey: "research.scope_notes",
                  label: "Scope Notes",
                  targetContextFactKey: "scope_notes_ctx",
                },
              ],
            },
            {
              actionId: "propagate_domain_source_inventory",
              actionKey: "propagate_domain_source_inventory",
              label: "Propagate Source Inventory",
              contextFactKey: "domain_source_inventory_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "domain_source_inventory",
                  itemKey: "research.domain_source_inventory",
                  label: "Domain Source Inventory",
                  targetContextFactKey: "domain_source_inventory_ctx",
                },
              ],
            },
            {
              actionId: "propagate_domain_research_synthesis",
              actionKey: "propagate_domain_research_synthesis",
              label: "Propagate Research Synthesis",
              contextFactKey: "domain_research_synthesis_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "domain_research_synthesis",
                  itemKey: "research.domain_research_synthesis",
                  label: "Domain Research Synthesis",
                  targetContextFactKey: "domain_research_synthesis_ctx",
                },
              ],
            },
            {
              actionId: "propagate_domain_research_report_artifact",
              actionKey: "propagate_domain_research_report_artifact",
              label: "Propagate Research Report Artifact",
              contextFactKey: "research_report_artifact_ctx",
              contextFactKind: "artifact_slot_reference_fact",
              items: [
                {
                  itemId: "domain_research_report_artifact",
                  itemKey: "research.research_report",
                  label: "Research Report Artifact",
                  targetContextFactKey: "research_report_artifact_ctx",
                },
              ],
            },
          ],
        },
      },
      {
        key: "technical_research_agent",
        type: "agent",
        displayName: "Technical Research Agent",
        agentConfig: {
          objective:
            "Conduct technical research on the approved topic, produce a durable technical source inventory and technical research synthesis, and update the canonical research report artifact with the technical findings.",
          instructionsMarkdown:
            "You are operating in Chiron with access to MCP tools. Start by reading the provided research context and treat it as the full working frame for this step. Use the current research type, research topic, research goals, and any scope notes as the governing frame for the work. If the topic or goals are ambiguous, refine them through the research process and update them so the work unit ends with a clearer research frame than it started with.\n\nThis path is specifically for technical research. Conduct the work with a technical-analysis lens: evaluate feasibility, architecture options, implementation constraints, integration points, tooling choices, operational implications, complexity drivers, and technical risks. Focus on what is realistically buildable, what tradeoffs matter, what approaches are stronger or weaker, and what engineering constraints downstream planning must take seriously.\n\nUse sources that are appropriate for technical research and record them carefully. Build a durable technical source inventory that captures what sources were used, why they matter, and how trustworthy or relevant they are. Then produce a durable technical research synthesis that explains the most important findings, the strongest feasible approaches, the key tradeoffs, the major risks or unknowns, the downstream implementation implications, and the recommendations that should carry forward.\n\nWrite or update the canonical research report artifact so it reflects the final technical findings, not just raw notes. The artifact and the structured facts must agree with each other. Do not drift into generic market analysis or broad domain theory unless those are directly necessary to explain a technical conclusion.",
          readContextFactKeys: [
            "research_type_ctx",
            "research_topic_ctx",
            "research_goals_ctx",
            "scope_notes_ctx",
          ],
          writeContextFactKeys: [
            "research_topic_ctx",
            "research_goals_ctx",
            "scope_notes_ctx",
            "technical_source_inventory_ctx",
            "technical_research_synthesis_ctx",
            "research_report_artifact_ctx",
          ],
          completionRequirementContextFactKeys: [
            "research_topic_ctx",
            "research_goals_ctx",
            "technical_source_inventory_ctx",
            "technical_research_synthesis_ctx",
            "research_report_artifact_ctx",
          ],
        },
      },
      {
        key: "propagate_technical_research_outputs",
        type: "action",
        displayName: "Propagate Technical Research Outputs",
        actionConfig: {
          actions: [
            {
              actionId: "propagate_technical_research_topic",
              actionKey: "propagate_technical_research_topic",
              label: "Propagate Research Topic",
              contextFactKey: "research_topic_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "technical_research_topic",
                  itemKey: "research.research_topic",
                  label: "Research Topic",
                  targetContextFactKey: "research_topic_ctx",
                },
              ],
            },
            {
              actionId: "propagate_technical_research_goals",
              actionKey: "propagate_technical_research_goals",
              label: "Propagate Research Goals",
              contextFactKey: "research_goals_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "technical_research_goals",
                  itemKey: "research.research_goals",
                  label: "Research Goals",
                  targetContextFactKey: "research_goals_ctx",
                },
              ],
            },
            {
              actionId: "propagate_technical_scope_notes",
              actionKey: "propagate_technical_scope_notes",
              label: "Propagate Scope Notes",
              contextFactKey: "scope_notes_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "technical_scope_notes",
                  itemKey: "research.scope_notes",
                  label: "Scope Notes",
                  targetContextFactKey: "scope_notes_ctx",
                },
              ],
            },
            {
              actionId: "propagate_technical_source_inventory",
              actionKey: "propagate_technical_source_inventory",
              label: "Propagate Source Inventory",
              contextFactKey: "technical_source_inventory_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "technical_source_inventory",
                  itemKey: "research.technical_source_inventory",
                  label: "Technical Source Inventory",
                  targetContextFactKey: "technical_source_inventory_ctx",
                },
              ],
            },
            {
              actionId: "propagate_technical_research_synthesis",
              actionKey: "propagate_technical_research_synthesis",
              label: "Propagate Research Synthesis",
              contextFactKey: "technical_research_synthesis_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "technical_research_synthesis",
                  itemKey: "research.technical_research_synthesis",
                  label: "Technical Research Synthesis",
                  targetContextFactKey: "technical_research_synthesis_ctx",
                },
              ],
            },
            {
              actionId: "propagate_technical_research_report_artifact",
              actionKey: "propagate_technical_research_report_artifact",
              label: "Propagate Research Report Artifact",
              contextFactKey: "research_report_artifact_ctx",
              contextFactKind: "artifact_slot_reference_fact",
              items: [
                {
                  itemId: "technical_research_report_artifact",
                  itemKey: "research.research_report",
                  label: "Research Report Artifact",
                  targetContextFactKey: "research_report_artifact_ctx",
                },
              ],
            },
          ],
        },
      },
    ],
    explicitEdges: [
      { fromStepKey: "research_scope_confirmation", toStepKey: "propagate_research_scope_inputs" },
      { fromStepKey: "propagate_research_scope_inputs", toStepKey: "branch_research_kind" },
      { fromStepKey: "market_research_agent", toStepKey: "propagate_market_research_outputs" },
      { fromStepKey: "domain_research_agent", toStepKey: "propagate_domain_research_outputs" },
      {
        fromStepKey: "technical_research_agent",
        toStepKey: "propagate_technical_research_outputs",
      },
    ],
  },
  {
    workUnitKey: "product_brief",
    workflowSuffix: "create-product-brief",
    contextFacts: [
      {
        key: "setup_work_unit_ctx",
        label: "Setup Work Unit",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "setup_work_unit",
      },
      {
        key: "brainstorming_work_unit_ctx",
        label: "Brainstorming Work Units",
        kind: "bound_fact",
        cardinality: "many",
        bindingKey: "brainstorming_work_unit",
      },
      {
        key: "research_work_units_ctx",
        label: "Research Work Units",
        kind: "bound_fact",
        cardinality: "many",
        bindingKey: "research_work_units",
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
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "source_context_summary",
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
        kind: "bound_fact",
        cardinality: "many",
        bindingKey: "open_questions",
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
      {
        key: "brief_input_selection",
        type: "form",
        displayName: "Brief Input Selection",
        formFields: [
          {
            key: "setup_work_unit",
            label: "Setup Work Unit",
            contextFactKey: "setup_work_unit_ctx",
            valueType: "work_unit",
            required: true,
            descriptionMarkdown:
              "Select the Setup work unit that provides the baseline project framing for this Product Brief.",
          },
          {
            key: "brainstorming_work_unit",
            label: "Brainstorming Work Units",
            contextFactKey: "brainstorming_work_unit_ctx",
            valueType: "work_unit",
            descriptionMarkdown:
              "Select any Brainstorming work units whose converged directions should influence this Product Brief.",
          },
          {
            key: "research_work_units",
            label: "Research Work Units",
            contextFactKey: "research_work_units_ctx",
            valueType: "work_unit",
            descriptionMarkdown:
              "Select any Research work units whose findings should inform this Product Brief.",
          },
        ],
      },
      {
        key: "product_brief_authoring_agent",
        type: "agent",
        displayName: "Product Brief Authoring Agent",
        agentConfig: {
          objective:
            "Use the selected setup, brainstorming, and research inputs to produce the durable Product Brief outputs and update the canonical Product Brief artifact.",
          instructionsMarkdown:
            "You are operating in Chiron with access to MCP tools. Start by reading the selected upstream work-unit references and treat them as the approved input set for this Product Brief. Setup is required and provides the baseline project framing. Brainstorming and Research inputs are optional, but when they are present you should use them explicitly rather than ignoring them or collapsing them into vague summaries.\n\nYour job is to synthesize the selected inputs into a concise Product Brief that is useful for downstream planning. Write a structured product intent summary, a structured source context summary, a durable brief synthesis, any meaningful review findings, and any open questions that still matter. Then write or update the canonical Product Brief artifact so it reflects the same final conclusions as the structured facts. Use the distillate artifact only when overflow detail is genuinely worth preserving separately.\n\nDo not invent unsupported detail, do not duplicate entire upstream work units into the brief, and do not treat optional Brainstorming or Research inputs as required if they were not selected.",
          readContextFactKeys: [
            "setup_work_unit_ctx",
            "brainstorming_work_unit_ctx",
            "research_work_units_ctx",
          ],
          writeContextFactKeys: [
            "setup_work_unit_ctx",
            "brainstorming_work_unit_ctx",
            "research_work_units_ctx",
            "product_intent_summary_ctx",
            "source_context_summary_ctx",
            "brief_synthesis_ctx",
            "review_findings_ctx",
            "open_questions_ctx",
            "product_brief_artifact_ctx",
            "product_brief_distillate_artifact_ctx",
          ],
          completionRequirementContextFactKeys: [
            "setup_work_unit_ctx",
            "product_intent_summary_ctx",
            "brief_synthesis_ctx",
            "product_brief_artifact_ctx",
          ],
        },
      },
      {
        key: "propagate_product_brief_outputs",
        type: "action",
        displayName: "Propagate Product Brief Outputs",
        actionConfig: {
          actions: [
            {
              actionId: "propagate_product_brief_setup_work_unit",
              actionKey: "propagate_product_brief_setup_work_unit",
              label: "Propagate Setup Work Unit",
              contextFactKey: "setup_work_unit_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "product_brief_setup_work_unit",
                  itemKey: "product_brief.setup_work_unit",
                  label: "Setup Work Unit",
                  targetContextFactKey: "setup_work_unit_ctx",
                },
              ],
            },
            {
              actionId: "propagate_product_brief_brainstorming_work_units",
              actionKey: "propagate_product_brief_brainstorming_work_units",
              label: "Propagate Brainstorming Work Units",
              contextFactKey: "brainstorming_work_unit_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "product_brief_brainstorming_work_units",
                  itemKey: "product_brief.brainstorming_work_unit",
                  label: "Brainstorming Work Units",
                  targetContextFactKey: "brainstorming_work_unit_ctx",
                },
              ],
            },
            {
              actionId: "propagate_product_brief_research_work_units",
              actionKey: "propagate_product_brief_research_work_units",
              label: "Propagate Research Work Units",
              contextFactKey: "research_work_units_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "product_brief_research_work_units",
                  itemKey: "product_brief.research_work_units",
                  label: "Research Work Units",
                  targetContextFactKey: "research_work_units_ctx",
                },
              ],
            },
            {
              actionId: "propagate_product_intent_summary",
              actionKey: "propagate_product_intent_summary",
              label: "Propagate Product Intent Summary",
              contextFactKey: "product_intent_summary_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "product_intent_summary",
                  itemKey: "product_brief.product_intent_summary",
                  label: "Product Intent Summary",
                  targetContextFactKey: "product_intent_summary_ctx",
                },
              ],
            },
            {
              actionId: "propagate_source_context_summary",
              actionKey: "propagate_source_context_summary",
              label: "Propagate Source Context Summary",
              contextFactKey: "source_context_summary_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "source_context_summary",
                  itemKey: "product_brief.source_context_summary",
                  label: "Source Context Summary",
                  targetContextFactKey: "source_context_summary_ctx",
                },
              ],
            },
            {
              actionId: "propagate_brief_synthesis",
              actionKey: "propagate_brief_synthesis",
              label: "Propagate Brief Synthesis",
              contextFactKey: "brief_synthesis_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "brief_synthesis",
                  itemKey: "product_brief.brief_synthesis",
                  label: "Brief Synthesis",
                  targetContextFactKey: "brief_synthesis_ctx",
                },
              ],
            },
            {
              actionId: "propagate_review_findings",
              actionKey: "propagate_review_findings",
              label: "Propagate Review Findings",
              contextFactKey: "review_findings_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "review_findings",
                  itemKey: "product_brief.review_findings",
                  label: "Review Findings",
                  targetContextFactKey: "review_findings_ctx",
                },
              ],
            },
            {
              actionId: "propagate_open_questions",
              actionKey: "propagate_open_questions",
              label: "Propagate Open Questions",
              contextFactKey: "open_questions_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "open_questions",
                  itemKey: "product_brief.open_questions",
                  label: "Open Questions",
                  targetContextFactKey: "open_questions_ctx",
                },
              ],
            },
            {
              actionId: "propagate_product_brief_artifact",
              actionKey: "propagate_product_brief_artifact",
              label: "Propagate Product Brief Artifact",
              contextFactKey: "product_brief_artifact_ctx",
              contextFactKind: "artifact_slot_reference_fact",
              items: [
                {
                  itemId: "product_brief_artifact",
                  itemKey: "product_brief.product_brief",
                  label: "Product Brief Artifact",
                  targetContextFactKey: "product_brief_artifact_ctx",
                },
              ],
            },
            {
              actionId: "propagate_product_brief_distillate_artifact",
              actionKey: "propagate_product_brief_distillate_artifact",
              label: "Propagate Product Brief Distillate Artifact",
              contextFactKey: "product_brief_distillate_artifact_ctx",
              contextFactKind: "artifact_slot_reference_fact",
              items: [
                {
                  itemId: "product_brief_distillate_artifact",
                  itemKey: "product_brief.product_brief_distillate",
                  label: "Product Brief Distillate Artifact",
                  targetContextFactKey: "product_brief_distillate_artifact_ctx",
                },
              ],
            },
          ],
        },
      },
    ],
    explicitEdges: [
      { fromStepKey: "brief_input_selection", toStepKey: "product_brief_authoring_agent" },
      {
        fromStepKey: "product_brief_authoring_agent",
        toStepKey: "propagate_product_brief_outputs",
      },
    ],
  },
  {
    workUnitKey: "prd",
    workflowSuffix: "create-prd",
    contextFacts: [
      {
        key: "product_brief_work_unit_ctx",
        label: "Product Brief Work Unit",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "product_brief_work_unit",
      },
      {
        key: "research_work_units_ctx",
        label: "Research Work Units",
        kind: "bound_fact",
        cardinality: "many",
        bindingKey: "research_work_units",
      },
      {
        key: "brainstorming_work_unit_ctx",
        label: "Brainstorming Work Units",
        kind: "bound_fact",
        cardinality: "many",
        bindingKey: "brainstorming_work_unit",
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
        key: "start_implementation_ctx",
        label: "Start Implementation",
        kind: "plain_fact",
        cardinality: "one",
        valueType: "boolean",
      },
      {
        key: "implementation_draft_specs_ctx",
        label: "Implementation Draft Specs",
        kind: "work_unit_draft_spec_fact",
        cardinality: "many",
        targetWorkUnitKey: "implementation",
        selectedFactKeys: [
          "implementation_mode",
          "implementation_constraints",
          "implementation_scope",
          "files_to_change",
        ],
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
        key: "prd_input_selection",
        type: "form",
        displayName: "PRD Input Selection",
        formFields: [
          {
            key: "product_brief_work_unit",
            label: "Product Brief Work Unit",
            contextFactKey: "product_brief_work_unit_ctx",
            valueType: "work_unit",
            required: true,
            descriptionMarkdown:
              "Select the Product Brief work unit that provides the authoritative framing for this PRD.",
          },
          {
            key: "brainstorming_work_unit",
            label: "Brainstorming Work Units",
            contextFactKey: "brainstorming_work_unit_ctx",
            valueType: "work_unit",
            descriptionMarkdown:
              "Select any Brainstorming work units whose converged directions should shape this PRD.",
          },
          {
            key: "research_work_units",
            label: "Research Work Units",
            contextFactKey: "research_work_units_ctx",
            valueType: "work_unit",
            descriptionMarkdown:
              "Select any Research work units whose findings should inform this PRD.",
          },
        ],
      },
      {
        key: "prd_requirements_authoring_agent",
        type: "agent",
        displayName: "PRD Requirements Authoring Agent",
        agentConfig: {
          objective:
            "Use the selected upstream planning work units to author the durable PRD requirement contract facts.",
          instructionsMarkdown:
            "You are operating in Chiron with access to MCP tools. Start by reading the selected upstream work-unit references and treat them as the approved source context for this PRD. The Product Brief is required and provides the primary product framing. Research and Brainstorming inputs are optional, but when they are present you should use them explicitly rather than collapsing them into vague assumptions.\n\nYour job is to author the durable requirement contract for this PRD. Write a structured product vision, structured success criteria, durable user journeys, a scoped plan, functional requirements, and non-functional requirements that are implementation-agnostic but specific enough to guide downstream planning. Favor clarity, boundedness, and traceability over volume.\n\nDo not invent unsupported detail, do not duplicate entire upstream work units into the PRD, and do not drift into implementation planning yet. This step is for authoring the requirement contract itself.",
          readContextFactKeys: [
            "product_brief_work_unit_ctx",
            "brainstorming_work_unit_ctx",
            "research_work_units_ctx",
          ],
          writeContextFactKeys: [
            "product_vision_ctx",
            "success_criteria_ctx",
            "user_journeys_ctx",
            "scope_plan_ctx",
            "functional_requirements_ctx",
            "non_functional_requirements_ctx",
          ],
          completionRequirementContextFactKeys: [
            "product_vision_ctx",
            "success_criteria_ctx",
            "user_journeys_ctx",
            "scope_plan_ctx",
            "functional_requirements_ctx",
            "non_functional_requirements_ctx",
          ],
        },
      },
      {
        key: "prd_finalize_agent",
        type: "agent",
        displayName: "PRD Finalize Agent",
        agentConfig: {
          objective:
            "Finalize the PRD by writing a durable PRD synthesis and updating the canonical PRD artifact so it matches the structured requirement facts.",
          instructionsMarkdown:
            "You are operating in Chiron with access to MCP tools. Start by reading the authored PRD requirement facts and treat them as the authoritative requirement contract for this step.\n\nYour job is to finalize the PRD into a concise durable synthesis and the canonical PRD artifact. Write a PRD synthesis that captures the most important downstream planning signal, then write or update the PRD artifact so it reflects the same final conclusions as the structured facts. The artifact and the structured facts must agree.\n\nDo not reopen upstream discovery unless the current PRD facts are internally inconsistent. Do not start implementation planning in this step. Keep the final PRD useful for downstream decomposition rather than verbose for its own sake.",
          readContextFactKeys: [
            "product_vision_ctx",
            "success_criteria_ctx",
            "user_journeys_ctx",
            "scope_plan_ctx",
            "functional_requirements_ctx",
            "non_functional_requirements_ctx",
          ],
          writeContextFactKeys: ["prd_synthesis_ctx", "prd_artifact_ctx"],
          completionRequirementContextFactKeys: ["prd_synthesis_ctx", "prd_artifact_ctx"],
        },
      },
      {
        key: "prd_implementation_spec_authoring_agent",
        type: "agent",
        displayName: "PRD Implementation Spec Authoring Agent",
        agentConfig: {
          objective:
            "Use the finalized PRD outputs to decide whether implementation work units should be created now, and if so, author one or more bounded implementation draft specs that are ready for downstream execution.",
          instructionsMarkdown:
            "You are operating in Chiron with access to MCP tools. Start by reading the finalized PRD context and treat it as the authoritative downstream implementation frame for this step.\n\nYour job is not to re-author the PRD. Your job is to decide whether the current PRD is mature enough to create downstream Implementation work units now. If the answer is no, write a durable false decision and do not create draft specs. If the answer is yes, decompose the approved PRD into one or more implementation-sized units that are coherent, bounded, and independently actionable.\n\nFor each implementation draft, define only what the downstream Implementation work unit needs in order to execute safely: the scope of the change, the intended outcome, key constraints, likely files or system areas affected when that is reasonably inferable, and the recommended implementation mode when that matters. Prefer smaller, clearer implementation slices over large ambiguous ones.\n\nDo not duplicate the entire PRD into each draft spec. Do not invent implementation details that are not supported by the PRD or selected upstream context. Do not create implementation drafts when the PRD still has blocking ambiguity that would make execution unsafe. The implementation draft specs should be compact, explicit, and ready to become downstream work units.",
          readContextFactKeys: [
            "product_brief_work_unit_ctx",
            "brainstorming_work_unit_ctx",
            "research_work_units_ctx",
            "product_vision_ctx",
            "success_criteria_ctx",
            "user_journeys_ctx",
            "scope_plan_ctx",
            "functional_requirements_ctx",
            "non_functional_requirements_ctx",
            "prd_synthesis_ctx",
          ],
          writeContextFactKeys: ["start_implementation_ctx", "implementation_draft_specs_ctx"],
          completionRequirementContextFactKeys: ["start_implementation_ctx"],
        },
      },
      {
        key: "branch_need_implementation",
        type: "branch",
        displayName: "Branch Need Implementation",
        branchConfig: {
          defaultTargetStepKey: "propagate_prd_outputs",
          routes: [
            {
              routeId: "start_implementation",
              targetStepKey: "invoke_implementation_work",
              conditionMode: "all",
              groups: [
                {
                  groupId: "start_implementation_group",
                  mode: "all",
                  conditions: [
                    {
                      conditionId: "start_implementation_true",
                      contextFactKey: "start_implementation_ctx",
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
        key: "invoke_implementation_work",
        type: "invoke",
        displayName: "Invoke Implementation Work",
        invokeConfig: {
          targetKind: "work_unit",
          sourceMode: "context_fact_backed",
          contextFactKey: "implementation_draft_specs_ctx",
          bindings: [
            {
              destinationKind: "work_unit_fact",
              destinationWorkUnitKey: "implementation",
              destinationFactKey: "prd_work_unit",
              sourceKind: "runtime",
            },
            {
              destinationKind: "work_unit_fact",
              destinationWorkUnitKey: "implementation",
              destinationFactKey: "research_work_units",
              sourceKind: "context_fact",
              contextFactKey: "research_work_units_ctx",
            },
            {
              destinationKind: "work_unit_fact",
              destinationWorkUnitKey: "implementation",
              destinationFactKey: "brainstorming_work_units",
              sourceKind: "context_fact",
              contextFactKey: "brainstorming_work_unit_ctx",
            },
          ],
          activationTransitions: [
            {
              workUnitKey: "implementation",
              transitionSuffix: "activation-to-done",
              workflowSuffixes: ["implementation"],
            },
          ],
        },
      },
      {
        key: "propagate_prd_outputs",
        type: "action",
        displayName: "Propagate PRD Outputs",
        actionConfig: {
          actions: [
            {
              actionId: "propagate_prd_product_brief_work_unit",
              actionKey: "propagate_prd_product_brief_work_unit",
              label: "Propagate Product Brief Work Unit",
              contextFactKey: "product_brief_work_unit_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "prd_product_brief_work_unit",
                  itemKey: "prd.product_brief_work_unit",
                  label: "Product Brief Work Unit",
                  targetContextFactKey: "product_brief_work_unit_ctx",
                },
              ],
            },
            {
              actionId: "propagate_prd_research_work_units",
              actionKey: "propagate_prd_research_work_units",
              label: "Propagate Research Work Units",
              contextFactKey: "research_work_units_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "prd_research_work_units",
                  itemKey: "prd.research_work_units",
                  label: "Research Work Units",
                  targetContextFactKey: "research_work_units_ctx",
                },
              ],
            },
            {
              actionId: "propagate_prd_brainstorming_work_units",
              actionKey: "propagate_prd_brainstorming_work_units",
              label: "Propagate Brainstorming Work Units",
              contextFactKey: "brainstorming_work_unit_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "prd_brainstorming_work_units",
                  itemKey: "prd.brainstorming_work_unit",
                  label: "Brainstorming Work Units",
                  targetContextFactKey: "brainstorming_work_unit_ctx",
                },
              ],
            },
            {
              actionId: "propagate_prd_product_vision",
              actionKey: "propagate_prd_product_vision",
              label: "Propagate Product Vision",
              contextFactKey: "product_vision_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "prd_product_vision",
                  itemKey: "prd.product_vision",
                  label: "Product Vision",
                  targetContextFactKey: "product_vision_ctx",
                },
              ],
            },
            {
              actionId: "propagate_prd_success_criteria",
              actionKey: "propagate_prd_success_criteria",
              label: "Propagate Success Criteria",
              contextFactKey: "success_criteria_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "prd_success_criteria",
                  itemKey: "prd.success_criteria",
                  label: "Success Criteria",
                  targetContextFactKey: "success_criteria_ctx",
                },
              ],
            },
            {
              actionId: "propagate_prd_user_journeys",
              actionKey: "propagate_prd_user_journeys",
              label: "Propagate User Journeys",
              contextFactKey: "user_journeys_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "prd_user_journeys",
                  itemKey: "prd.user_journeys",
                  label: "User Journeys",
                  targetContextFactKey: "user_journeys_ctx",
                },
              ],
            },
            {
              actionId: "propagate_prd_scope_plan",
              actionKey: "propagate_prd_scope_plan",
              label: "Propagate Scope Plan",
              contextFactKey: "scope_plan_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "prd_scope_plan",
                  itemKey: "prd.scope_plan",
                  label: "Scope Plan",
                  targetContextFactKey: "scope_plan_ctx",
                },
              ],
            },
            {
              actionId: "propagate_prd_functional_requirements",
              actionKey: "propagate_prd_functional_requirements",
              label: "Propagate Functional Requirements",
              contextFactKey: "functional_requirements_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "prd_functional_requirements",
                  itemKey: "prd.functional_requirements",
                  label: "Functional Requirements",
                  targetContextFactKey: "functional_requirements_ctx",
                },
              ],
            },
            {
              actionId: "propagate_prd_non_functional_requirements",
              actionKey: "propagate_prd_non_functional_requirements",
              label: "Propagate Non-Functional Requirements",
              contextFactKey: "non_functional_requirements_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "prd_non_functional_requirements",
                  itemKey: "prd.non_functional_requirements",
                  label: "Non-Functional Requirements",
                  targetContextFactKey: "non_functional_requirements_ctx",
                },
              ],
            },
            {
              actionId: "propagate_prd_synthesis",
              actionKey: "propagate_prd_synthesis",
              label: "Propagate PRD Synthesis",
              contextFactKey: "prd_synthesis_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "prd_synthesis",
                  itemKey: "prd.prd_synthesis",
                  label: "PRD Synthesis",
                  targetContextFactKey: "prd_synthesis_ctx",
                },
              ],
            },
            {
              actionId: "propagate_prd_artifact",
              actionKey: "propagate_prd_artifact",
              label: "Propagate PRD Artifact",
              contextFactKey: "prd_artifact_ctx",
              contextFactKind: "artifact_slot_reference_fact",
              items: [
                {
                  itemId: "prd_artifact",
                  itemKey: "prd.prd",
                  label: "PRD Artifact",
                  targetContextFactKey: "prd_artifact_ctx",
                },
              ],
            },
          ],
        },
      },
    ],
    explicitEdges: [
      { fromStepKey: "prd_input_selection", toStepKey: "prd_requirements_authoring_agent" },
      { fromStepKey: "prd_requirements_authoring_agent", toStepKey: "prd_finalize_agent" },
      { fromStepKey: "prd_finalize_agent", toStepKey: "prd_implementation_spec_authoring_agent" },
      {
        fromStepKey: "prd_implementation_spec_authoring_agent",
        toStepKey: "branch_need_implementation",
      },
      { fromStepKey: "invoke_implementation_work", toStepKey: "propagate_prd_outputs" },
    ],
  },
  {
    workUnitKey: "implementation",
    workflowSuffix: "implementation",
    contextFacts: [
      {
        key: "prd_work_unit_ctx",
        label: "PRD Work Unit",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "prd_work_unit",
      },
      {
        key: "research_work_units_ctx",
        label: "Research Work Units",
        kind: "bound_fact",
        cardinality: "many",
        bindingKey: "research_work_units",
      },
      {
        key: "brainstorming_work_units_ctx",
        label: "Brainstorming Work Units",
        kind: "bound_fact",
        cardinality: "many",
        bindingKey: "brainstorming_work_units",
      },
      {
        key: "implementation_mode_ctx",
        label: "Implementation Mode",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "implementation_mode",
      },
      {
        key: "implementation_constraints_ctx",
        label: "Implementation Constraints",
        kind: "bound_fact",
        cardinality: "many",
        bindingKey: "implementation_constraints",
      },
      {
        key: "implementation_scope_ctx",
        label: "Implementation Scope",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "implementation_scope",
      },
      {
        key: "implementation_plan_ctx",
        label: "Implementation Plan",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "implementation_plan",
      },
      {
        key: "files_to_change_ctx",
        label: "Files to Change",
        kind: "bound_fact",
        cardinality: "many",
        bindingKey: "files_to_change",
      },
      {
        key: "code_change_summary_ctx",
        label: "Code Change Summary",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "code_change_summary",
      },
      {
        key: "validation_summary_ctx",
        label: "Validation Summary",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "validation_summary",
      },
      {
        key: "test_results_ctx",
        label: "Test Results",
        kind: "bound_fact",
        cardinality: "many",
        bindingKey: "test_results",
      },
      {
        key: "review_findings_ctx",
        label: "Review Findings",
        kind: "bound_fact",
        cardinality: "many",
        bindingKey: "review_findings",
      },
      {
        key: "open_implementation_questions_ctx",
        label: "Open Implementation Questions",
        kind: "bound_fact",
        cardinality: "many",
        bindingKey: "open_implementation_questions",
      },
      {
        key: "implementation_status_summary_ctx",
        label: "Implementation Status Summary",
        kind: "bound_fact",
        cardinality: "one",
        bindingKey: "implementation_status_summary",
      },
      {
        key: "implementation_plan_artifact_ctx",
        label: "Implementation Plan Artifact",
        kind: "artifact_slot_reference_fact",
        cardinality: "one",
        slotWorkUnitKey: "implementation",
        slotSuffix: "implementation-plan",
      },
      {
        key: "implemented_code_changes_artifact_ctx",
        label: "Implemented Code Changes Artifact",
        kind: "artifact_slot_reference_fact",
        cardinality: "one",
        slotWorkUnitKey: "implementation",
        slotSuffix: "implemented-code-changes",
      },
      {
        key: "implementation_test_report_artifact_ctx",
        label: "Implementation Test Report Artifact",
        kind: "artifact_slot_reference_fact",
        cardinality: "one",
        slotWorkUnitKey: "implementation",
        slotSuffix: "implementation-test-report",
      },
    ],
    steps: [
      {
        key: "implementation_planning_agent",
        type: "agent",
        displayName: "Implementation Planning Agent",
        agentConfig: {
          objective:
            "Use the selected implementation drafts and upstream planning context to produce a bounded implementation scope, a concrete execution plan, and the canonical implementation plan artifact for this Implementation work unit.",
          instructionsMarkdown:
            "You are operating in Chiron with access to MCP tools. Start by reading the selected implementation draft outputs already bound into this Implementation work unit and any selected upstream context references, and treat them as the approved execution boundary for this run.\n\nYour first responsibility is to turn those inputs into a concrete implementation plan that is safe to execute. Clarify the scope of this implementation run, identify the main code areas likely to change, capture important constraints, and define the validation approach that should be used after implementation. If the bound implementation data contains multiple slices, unify them into one coherent execution plan only when they belong together operationally; otherwise preserve their boundaries clearly inside the plan.\n\nWrite a durable implementation scope, a durable implementation plan, and a durable files-to-change summary when the likely touch points are inferable from the codebase. Then write or update the canonical implementation plan artifact so it reflects the same plan as the structured facts.\n\nDo not start implementation in this step. Do not drift into code changes or testing execution yet. Do not expand scope beyond the approved implementation inputs. Keep the plan concrete, minimal, and executable.",
          readContextFactKeys: [
            "prd_work_unit_ctx",
            "research_work_units_ctx",
            "brainstorming_work_units_ctx",
            "implementation_mode_ctx",
            "implementation_constraints_ctx",
            "implementation_scope_ctx",
            "files_to_change_ctx",
          ],
          writeContextFactKeys: [
            "implementation_scope_ctx",
            "implementation_plan_ctx",
            "files_to_change_ctx",
            "implementation_plan_artifact_ctx",
          ],
          completionRequirementContextFactKeys: [
            "implementation_scope_ctx",
            "implementation_plan_ctx",
            "implementation_plan_artifact_ctx",
          ],
        },
      },
      {
        key: "implementation_execution_agent",
        type: "agent",
        displayName: "Implementation Execution Agent",
        agentConfig: {
          objective:
            "Execute the approved implementation plan by making the required repository changes, then write a durable summary of the implemented code changes and update the implemented code changes artifact.",
          instructionsMarkdown:
            "You are operating in Chiron with access to MCP tools. Start by reading the approved implementation scope, implementation plan, files-to-change summary, and any bound implementation constraints. Treat them as the execution boundary for this step.\n\nYour job is to implement the required changes in the repository. Inspect the existing codebase before changing anything. Match existing patterns and conventions. Keep the diff scoped to the approved implementation plan. If the plan identifies multiple implementation slices, execute them in a coherent order while preserving bounded scope.\n\nAfter making code changes, write a durable code change summary that explains what was implemented, what code areas changed, and any meaningful deviations from the original plan. Then write or update the implemented code changes artifact so it records the final implementation outcome in a durable, reviewable way.\n\nDo not invent work that was not requested by the approved implementation inputs. Do not treat unresolved ambiguity as permission to expand scope. If a blocking ambiguity is discovered, reflect it in the implementation status summary rather than improvising a large unsupported solution.",
          readContextFactKeys: [
            "prd_work_unit_ctx",
            "implementation_mode_ctx",
            "implementation_constraints_ctx",
            "implementation_scope_ctx",
            "implementation_plan_ctx",
            "files_to_change_ctx",
            "implementation_plan_artifact_ctx",
          ],
          writeContextFactKeys: [
            "code_change_summary_ctx",
            "implementation_status_summary_ctx",
            "implemented_code_changes_artifact_ctx",
          ],
          completionRequirementContextFactKeys: [
            "code_change_summary_ctx",
            "implemented_code_changes_artifact_ctx",
          ],
        },
      },
      {
        key: "implementation_validation_agent",
        type: "agent",
        displayName: "Implementation Validation Agent",
        agentConfig: {
          objective:
            "Validate the implemented changes, record durable test and review outcomes, and update the canonical implementation test report artifact.",
          instructionsMarkdown:
            "You are operating in Chiron with access to MCP tools. Start by reading the implementation scope, implementation plan, code change summary, and implemented code changes artifact. Treat them as the implementation result that must now be validated.\n\nYour job is to validate the implementation thoroughly enough for downstream review. Run the most relevant available checks for the affected code: targeted tests, type checks, builds, or other directly relevant validation steps. Record the results in a durable validation summary and a durable test results structure. Capture any meaningful review findings that should influence acceptance, patching, or follow-up work.\n\nThen write or update the canonical implementation test report artifact so it reflects the real validation outcome of this implementation run. The structured facts and artifact must agree.\n\nDo not silently ignore failures. Do not broaden scope into new implementation work during validation. If the implementation is incomplete or blocked, record that clearly in the implementation status summary and review findings.",
          readContextFactKeys: [
            "implementation_scope_ctx",
            "implementation_plan_ctx",
            "code_change_summary_ctx",
            "implemented_code_changes_artifact_ctx",
          ],
          writeContextFactKeys: [
            "validation_summary_ctx",
            "test_results_ctx",
            "review_findings_ctx",
            "open_implementation_questions_ctx",
            "implementation_status_summary_ctx",
            "implementation_test_report_artifact_ctx",
          ],
          completionRequirementContextFactKeys: [
            "validation_summary_ctx",
            "test_results_ctx",
            "implementation_test_report_artifact_ctx",
          ],
        },
      },
      {
        key: "propagate_implementation_outputs",
        type: "action",
        displayName: "Propagate Implementation Outputs",
        actionConfig: {
          actions: [
            {
              actionId: "propagate_implementation_scope",
              actionKey: "propagate_implementation_scope",
              label: "Propagate Implementation Scope",
              contextFactKey: "implementation_scope_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "implementation_scope",
                  itemKey: "implementation.implementation_scope",
                  label: "Implementation Scope",
                  targetContextFactKey: "implementation_scope_ctx",
                },
              ],
            },
            {
              actionId: "propagate_implementation_plan",
              actionKey: "propagate_implementation_plan",
              label: "Propagate Implementation Plan",
              contextFactKey: "implementation_plan_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "implementation_plan",
                  itemKey: "implementation.implementation_plan",
                  label: "Implementation Plan",
                  targetContextFactKey: "implementation_plan_ctx",
                },
              ],
            },
            {
              actionId: "propagate_files_to_change",
              actionKey: "propagate_files_to_change",
              label: "Propagate Files to Change",
              contextFactKey: "files_to_change_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "files_to_change",
                  itemKey: "implementation.files_to_change",
                  label: "Files to Change",
                  targetContextFactKey: "files_to_change_ctx",
                },
              ],
            },
            {
              actionId: "propagate_code_change_summary",
              actionKey: "propagate_code_change_summary",
              label: "Propagate Code Change Summary",
              contextFactKey: "code_change_summary_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "code_change_summary",
                  itemKey: "implementation.code_change_summary",
                  label: "Code Change Summary",
                  targetContextFactKey: "code_change_summary_ctx",
                },
              ],
            },
            {
              actionId: "propagate_validation_summary",
              actionKey: "propagate_validation_summary",
              label: "Propagate Validation Summary",
              contextFactKey: "validation_summary_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "validation_summary",
                  itemKey: "implementation.validation_summary",
                  label: "Validation Summary",
                  targetContextFactKey: "validation_summary_ctx",
                },
              ],
            },
            {
              actionId: "propagate_test_results",
              actionKey: "propagate_test_results",
              label: "Propagate Test Results",
              contextFactKey: "test_results_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "test_results",
                  itemKey: "implementation.test_results",
                  label: "Test Results",
                  targetContextFactKey: "test_results_ctx",
                },
              ],
            },
            {
              actionId: "propagate_implementation_review_findings",
              actionKey: "propagate_implementation_review_findings",
              label: "Propagate Review Findings",
              contextFactKey: "review_findings_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "implementation_review_findings",
                  itemKey: "implementation.review_findings",
                  label: "Review Findings",
                  targetContextFactKey: "review_findings_ctx",
                },
              ],
            },
            {
              actionId: "propagate_open_implementation_questions",
              actionKey: "propagate_open_implementation_questions",
              label: "Propagate Open Implementation Questions",
              contextFactKey: "open_implementation_questions_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "open_implementation_questions",
                  itemKey: "implementation.open_implementation_questions",
                  label: "Open Implementation Questions",
                  targetContextFactKey: "open_implementation_questions_ctx",
                },
              ],
            },
            {
              actionId: "propagate_implementation_status_summary",
              actionKey: "propagate_implementation_status_summary",
              label: "Propagate Implementation Status Summary",
              contextFactKey: "implementation_status_summary_ctx",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "implementation_status_summary",
                  itemKey: "implementation.implementation_status_summary",
                  label: "Implementation Status Summary",
                  targetContextFactKey: "implementation_status_summary_ctx",
                },
              ],
            },
            {
              actionId: "propagate_implementation_plan_artifact",
              actionKey: "propagate_implementation_plan_artifact",
              label: "Propagate Implementation Plan Artifact",
              contextFactKey: "implementation_plan_artifact_ctx",
              contextFactKind: "artifact_slot_reference_fact",
              items: [
                {
                  itemId: "implementation_plan_artifact",
                  itemKey: "implementation.implementation_plan",
                  label: "Implementation Plan Artifact",
                  targetContextFactKey: "implementation_plan_artifact_ctx",
                },
              ],
            },
            {
              actionId: "propagate_implemented_code_changes_artifact",
              actionKey: "propagate_implemented_code_changes_artifact",
              label: "Propagate Implemented Code Changes Artifact",
              contextFactKey: "implemented_code_changes_artifact_ctx",
              contextFactKind: "artifact_slot_reference_fact",
              items: [
                {
                  itemId: "implemented_code_changes_artifact",
                  itemKey: "implementation.implemented_code_changes",
                  label: "Implemented Code Changes Artifact",
                  targetContextFactKey: "implemented_code_changes_artifact_ctx",
                },
              ],
            },
            {
              actionId: "propagate_implementation_test_report_artifact",
              actionKey: "propagate_implementation_test_report_artifact",
              label: "Propagate Implementation Test Report Artifact",
              contextFactKey: "implementation_test_report_artifact_ctx",
              contextFactKind: "artifact_slot_reference_fact",
              items: [
                {
                  itemId: "implementation_test_report_artifact",
                  itemKey: "implementation.implementation_test_report",
                  label: "Implementation Test Report Artifact",
                  targetContextFactKey: "implementation_test_report_artifact_ctx",
                },
              ],
            },
          ],
        },
      },
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
  const methodologyWorkflowContextFactWorkflowReferences: MethodologyWorkflowContextFactWorkflowReferenceSeedRow[] =
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
          validationJson: contextFact.validation ?? { kind: "none" },
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

      if (contextFact.kind === "workflow_ref_fact") {
        contextFact.workflowSuffixes.forEach((workflowSuffix) => {
          methodologyWorkflowContextFactWorkflowReferences.push({
            id: `${contextFactDefinitionId}:workflow:${workflowSuffix}`,
            contextFactDefinitionId,
            workflowDefinitionId: workflowId(
              contextFact.workflowWorkUnitKey,
              workflowSuffix,
              methodologyVersionId,
            ),
          });
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
          descriptionJson: toDescriptionJson(
            field.descriptionMarkdown ?? `${field.label} field for ${step.displayName}.`,
          ),
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
    methodologyWorkflowContextFactWorkflowReferences,
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
  research: [{ idSuffix: "activation-to-done", workflowSuffix: "research" }],
  product_brief: [{ idSuffix: "activation-to-done", workflowSuffix: "create-product-brief" }],
  prd: [{ idSuffix: "activation-to-done", workflowSuffix: "create-prd" }],
  implementation: [{ idSuffix: "activation-to-done", workflowSuffix: "implementation" }],
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
export const implementationTransitionWorkflowBindingSeedRows: readonly MethodologyTransitionWorkflowBindingSeedRow[] =
  buildRowsForAllCanonicalVersions((versionId) =>
    buildTransitionWorkflowBindingSeedRowsFor("implementation", versionId),
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
  workflowKeys: ["setup_project"] as const,
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
  workflowKeys: ["research"] as const,
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

export const implementationSeedMetadata = {
  methodologyDefinitionId,
  methodologyVersionIds,
  slice: "slice_a_implementation",
  workUnitKeys: ["implementation"] as const,
  workflowKeys: ["implementation"] as const,
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
