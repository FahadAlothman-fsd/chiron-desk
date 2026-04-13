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
export type MethodologyTransitionWorkflowBindingSeedRow =
  typeof schema.methodologyTransitionWorkflowBindings.$inferInsert;
export type MethodologyArtifactSlotDefinitionSeedRow =
  typeof schema.methodologyArtifactSlotDefinitions.$inferInsert;
export type MethodologyArtifactSlotTemplateSeedRow =
  typeof schema.methodologyArtifactSlotTemplates.$inferInsert;

export const LOCKED_BMAD_SETUP_WORK_UNIT_FACT_KEYS = [
  "workflow_mode",
  "scan_level",
  "requires_brainstorming",
  "requires_product_brief",
  "deep_dive_target",
] as const;

export const LOCKED_BMAD_METHODOLOGY_FACT_KEYS = [
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
      "Act as the canonical analysis-oriented methodology agent for setup, market research, domain research, and technical research. Reduce ambiguity through evidence-backed structure rather than speculative invention.",
    ),
    persona:
      "Senior analyst with strong capability in market research, competitive analysis, domain framing, and requirements discovery. Works from evidence and turns ambiguity into structured understanding.",
    promptTemplateJson: {
      markdown:
        "You are the BMAD Analyst operating inside Chiron. Your job is to analyze the current work unit objective, use available facts and artifacts, and produce structured findings that reduce ambiguity and support downstream planning.",
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
      "Produces clear durable documentation artifacts from setup and research outputs when documentation needs to be persisted.",
    ),
    guidanceJson: toGuidanceJson(
      "Use this agent when durable setup or research artifacts need to be written clearly and without unsupported embellishment.",
      "Convert validated facts and findings into clear durable artifacts. Do not invent unsupported detail and do not replace the analysis or brainstorming agents when those workflows still need their core facilitation roles.",
    ),
    persona:
      "Technical documentation specialist focused on clarity, structure, and usable written artifacts for both humans and AI systems.",
    promptTemplateJson: {
      markdown:
        "You are the BMAD Technical Writer operating inside Chiron. Your job is to convert validated facts and findings into clear, structured, durable artifacts without inventing unsupported detail.",
    },
    mcpServersJson: [] as string[],
    capabilitiesJson: [
      "artifact-authoring",
      "project-context-writing",
      "setup-summary-writing",
      "research-synthesis-writing",
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
    idSuffix: "setup",
    key: "setup",
    displayName: "Setup",
    descriptionJson: toDescriptionJson(
      "Establishes the foundational project context needed before deeper ideation or analysis work begins.",
    ),
    guidanceJson: toGuidanceJson(
      "Use Setup to establish the project baseline. In greenfield work, this means defining the initial project shape. In brownfield work, this means understanding the existing project well enough to support downstream work.",
      "Setup is the canonical source of baseline project context. Downstream work units should depend on setup-owned facts rather than re-deriving foundational project assumptions.",
    ),
    cardinality: "one_per_project" as const,
  },
  {
    idSuffix: "brainstorming",
    key: "brainstorming",
    displayName: "Brainstorming",
    descriptionJson: toDescriptionJson(
      "Explores options, perspectives, and possible solution directions before detailed commitment.",
    ),
    guidanceJson: toGuidanceJson(
      "Use Brainstorming when you need to open the design space, compare alternatives, and shape promising directions before committing to detailed execution.",
      "Brainstorming produces exploratory output, not final implementation truth. Preserve option space, surface tradeoffs, and connect ideas back to setup context.",
    ),
    cardinality: "many_per_project" as const,
  },
  {
    idSuffix: "research",
    key: "research",
    displayName: "Research",
    descriptionJson: toDescriptionJson(
      "Collects evidence and structured analysis to support decisions made during planning and implementation.",
    ),
    guidanceJson: toGuidanceJson(
      "Use Research to gather market, domain, and technical evidence that informs design and execution decisions.",
      "Research should be evidence-oriented and decision-supportive. Preserve traceability to the setup context and, when relevant, to brainstorming outputs that shaped the research question.",
    ),
    cardinality: "many_per_project" as const,
  },
] as const;

function buildWorkUnitTypeSeedRows(
  methodologyVersionId: CanonicalMethodologyVersionId,
): readonly MethodologyWorkUnitTypeSeedRow[] {
  return canonicalWorkUnitDefinitions.map((definition) => ({
    id: `seed:wut:${definition.idSuffix}:${methodologyVersionId}`,
    methodologyVersionId,
    key: definition.key,
    displayName: definition.displayName,
    descriptionJson: definition.descriptionJson,
    guidanceJson: definition.guidanceJson,
    cardinality: definition.cardinality,
  }));
}

export const setupWorkUnitTypeSeedRows: readonly MethodologyWorkUnitTypeSeedRow[] =
  buildRowsForAllCanonicalVersions(buildWorkUnitTypeSeedRows);

function setupWorkUnitTypeId(methodologyVersionId: CanonicalMethodologyVersionId): string {
  return `seed:wut:setup:${methodologyVersionId}`;
}

const canonicalSetupLifecycleStates = [
  {
    idSuffix: "done",
    key: "done",
    displayName: "Done",
    descriptionJson: toDescriptionJson(
      "Setup is complete and downstream work can rely on its established baseline.",
    ),
    guidanceJson: toGuidanceJson(
      "This state means setup has produced the baseline context needed by later work units.",
      "Only treat setup as done when the required baseline setup facts have been captured.",
    ),
  },
] as const;

function buildSetupLifecycleStateSeedRows(
  methodologyVersionId: CanonicalMethodologyVersionId,
): readonly MethodologyLifecycleStateSeedRow[] {
  const workUnitTypeId = setupWorkUnitTypeId(methodologyVersionId);
  return canonicalSetupLifecycleStates.map((state) => ({
    id: `seed:state:setup:${state.idSuffix}:${methodologyVersionId}`,
    methodologyVersionId,
    workUnitTypeId,
    key: state.key,
    displayName: state.displayName,
    descriptionJson: state.descriptionJson,
    guidanceJson: state.guidanceJson,
  }));
}

const canonicalSetupLifecycleTransitions = [
  {
    idSuffix: "activation-to-done",
    transitionKey: "activation_to_done",
    fromStateId: null,
    toStateSuffix: "done",
    descriptionJson: toDescriptionJson(
      "Completes the setup work unit from initial activation into the done state.",
    ),
    guidanceJson: toGuidanceJson(
      "This transition represents the full setup lifecycle from initial project activation to a ready baseline.",
      "Use this transition to enforce the shared setup completion requirements before downstream work begins.",
    ),
  },
] as const;

function buildSetupLifecycleTransitionSeedRows(
  methodologyVersionId: CanonicalMethodologyVersionId,
): readonly MethodologyLifecycleTransitionSeedRow[] {
  const workUnitTypeId = setupWorkUnitTypeId(methodologyVersionId);
  return canonicalSetupLifecycleTransitions.map((transition) => ({
    id: `seed:transition:setup:${transition.idSuffix}:${methodologyVersionId}`,
    methodologyVersionId,
    workUnitTypeId,
    fromStateId: transition.fromStateId,
    toStateId: `seed:state:setup:${transition.toStateSuffix}:${methodologyVersionId}`,
    transitionKey: transition.transitionKey,
    descriptionJson: transition.descriptionJson,
    guidanceJson: transition.guidanceJson,
  }));
}

const canonicalSetupConditionSets = [
  {
    idSuffix: "activation-to-done:start",
    key: "wu.setup.activation_to_done.start",
    phase: "start" as const,
    mode: "all" as const,
    groupsJson: [],
  },
  {
    idSuffix: "activation-to-done:completion",
    key: "wu.setup.activation_to_done.completion",
    phase: "completion" as const,
    mode: "all" as const,
    groupsJson: [
      {
        key: "required_setup_facts",
        mode: "all",
        conditions: [
          {
            kind: "fact",
            required: true,
            config: {
              factKey: "initiative_name",
              operator: "exists",
            },
            rationale: "Setup needs a canonical initiative name.",
          },
          {
            kind: "fact",
            required: true,
            config: {
              factKey: "project_kind",
              operator: "exists",
            },
            rationale: "Setup needs the greenfield/brownfield routing decision.",
          },
          {
            kind: "fact",
            required: true,
            config: {
              factKey: "project_knowledge_directory",
              operator: "exists",
            },
            rationale: "Setup needs a durable knowledge output directory.",
          },
        ],
      },
    ],
  },
] as const;

function buildSetupTransitionConditionSetSeedRows(
  methodologyVersionId: CanonicalMethodologyVersionId,
): readonly MethodologyTransitionConditionSetSeedRow[] {
  const transitionId = `seed:transition:setup:activation-to-done:${methodologyVersionId}`;
  return canonicalSetupConditionSets.map((conditionSet) => ({
    id: `seed:condition-set:setup:${conditionSet.idSuffix}:${methodologyVersionId}`,
    methodologyVersionId,
    transitionId,
    key: conditionSet.key,
    phase: conditionSet.phase,
    mode: conditionSet.mode,
    groupsJson: conditionSet.groupsJson,
  }));
}

const canonicalSetupFactDefinitions = [
  {
    idSuffix: "initiative-name",
    key: "initiative_name",
    name: "Initiative Name",
    factType: "string",
    cardinality: "one" as const,
    defaultValueJson: null,
    descriptionJson: toDescriptionJson(
      "Human-readable name of the project or initiative being set up.",
    ),
    guidanceJson: toGuidanceJson(
      "Use the name that should appear in setup-owned artifacts.",
      "Treat this as the canonical display name for setup outputs.",
    ),
    validationJson: { kind: "none" as const },
  },
  {
    idSuffix: "project-kind",
    key: "project_kind",
    name: "Project Kind",
    factType: "string",
    cardinality: "one" as const,
    defaultValueJson: null,
    descriptionJson: toDescriptionJson("Routing mode for setup."),
    guidanceJson: toGuidanceJson(
      "Allowed values: `greenfield`, `brownfield`.",
      "Use this fact to choose the setup path.",
    ),
    validationJson: toAllowedValuesValidation(["greenfield", "brownfield"]),
  },
  {
    idSuffix: "project-knowledge-directory",
    key: "project_knowledge_directory",
    name: "Project Knowledge Directory",
    factType: "string",
    cardinality: "one" as const,
    defaultValueJson: "docs",
    descriptionJson: toDescriptionJson(
      "Directory where durable setup knowledge artifacts are stored.",
    ),
    guidanceJson: toGuidanceJson(
      "Folder for setup-created knowledge artifacts.",
      "Use as the default output root for setup documentation.",
    ),
    validationJson: {
      kind: "path" as const,
      path: {
        pathKind: "directory" as const,
        normalization: {
          trimWhitespace: true,
        },
        safety: {
          disallowAbsolute: true,
          preventTraversal: true,
        },
      },
    },
  },
  {
    idSuffix: "planning-artifacts-directory",
    key: "planning_artifacts_directory",
    name: "Planning Artifacts Directory",
    factType: "string",
    cardinality: "one" as const,
    defaultValueJson: ".sisyphus",
    descriptionJson: toDescriptionJson(
      "Directory for planning artifacts established during setup.",
    ),
    guidanceJson: toGuidanceJson(
      "Use for setup-created planning artifacts.",
      "Prefer this for planning-oriented setup outputs unless a slot says otherwise.",
    ),
    validationJson: {
      kind: "path" as const,
      path: {
        pathKind: "directory" as const,
        normalization: {
          trimWhitespace: true,
        },
        safety: {
          disallowAbsolute: true,
          preventTraversal: true,
        },
      },
    },
  },
  {
    idSuffix: "workflow-mode",
    key: "workflow_mode",
    name: "Workflow Mode",
    factType: "string",
    cardinality: "one" as const,
    defaultValueJson: null,
    descriptionJson: toDescriptionJson(
      "Setup run mode that determines whether the workflow performs an initial scan, a full rescan, or a deep-dive pass.",
    ),
    guidanceJson: toGuidanceJson(
      "Use this to declare the intended setup scan mode before discovery begins.",
      "Treat this as the authoritative design-time setup contract for scan-mode selection.",
    ),
    validationJson: toAllowedValuesValidation(["initial_scan", "full_rescan", "deep_dive"]),
  },
  {
    idSuffix: "scan-level",
    key: "scan_level",
    name: "Scan Level",
    factType: "string",
    cardinality: "one" as const,
    defaultValueJson: null,
    descriptionJson: toDescriptionJson(
      "Expected scan depth for setup discovery and project analysis.",
    ),
    guidanceJson: toGuidanceJson(
      "Select the discovery depth required for this setup run.",
      "Use this to tune setup breadth and effort while keeping the workflow contract explicit.",
    ),
    validationJson: toAllowedValuesValidation(["quick", "deep", "exhaustive"]),
  },
  {
    idSuffix: "requires-brainstorming",
    key: "requires_brainstorming",
    name: "Requires Brainstorming",
    factType: "boolean",
    cardinality: "one" as const,
    defaultValueJson: null,
    descriptionJson: toDescriptionJson(
      "Whether setup should hand off into a brainstorming follow-up before downstream planning continues.",
    ),
    guidanceJson: toGuidanceJson(
      "Turn this on when setup reveals ambiguity or option space that should be widened before commitment.",
      "Treat this as a durable setup decision signal for downstream workflow routing.",
    ),
    validationJson: { kind: "none" as const },
  },
  {
    idSuffix: "deep-dive-target",
    key: "deep_dive_target",
    name: "Deep Dive Target",
    factType: "json",
    cardinality: "one" as const,
    defaultValueJson: null,
    descriptionJson: toDescriptionJson(
      "Structured target descriptor for a focused deep-dive scan within the project root.",
    ),
    guidanceJson: toGuidanceJson(
      "Capture the relative project target that a deep-dive setup run should inspect.",
      "Store target paths relative to the project root; do not model project_root_path as a separate fact definition.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["target_type", "target_path", "target_name", "target_scope"],
        properties: {
          target_type: { type: "string", cardinality: "one" },
          target_path: { type: "string", cardinality: "one" },
          target_name: { type: "string", cardinality: "one" },
          target_scope: { type: "string", cardinality: "one" },
        },
      },
    },
  },
] as const;

function buildSetupWorkUnitFactDefinitionSeedRows(
  methodologyVersionId: CanonicalMethodologyVersionId,
): readonly MethodologyFactSchemaSeedRow[] {
  const workUnitTypeId = setupWorkUnitTypeId(methodologyVersionId);
  return canonicalSetupFactDefinitions.map((definition) => ({
    id: `seed:work-unit-fact:${definition.idSuffix}:${methodologyVersionId}`,
    methodologyVersionId,
    workUnitTypeId,
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

const canonicalSetupWorkflows = [
  {
    idSuffix: "generate-project-context",
    key: "generate_project_context",
    displayName: "Generate Project Context",
    descriptionJson: toDescriptionJson(
      "Support workflow for generating or refreshing durable project context during setup.",
    ),
    metadataJson: {
      family: "setup",
      intent: "supporting_context_generation",
      supports_modes: ["greenfield", "brownfield"],
      bound_by_default: false,
    },
    guidanceJson: toGuidanceJson(
      "Use when setup needs to generate or refresh project context.",
      "Setup-owned support workflow; not transition-bound by default.",
    ),
  },
  {
    idSuffix: "setup-project",
    key: "setup_project",
    displayName: "Setup Project",
    descriptionJson: toDescriptionJson(
      "Primary setup workflow that establishes the baseline project context for downstream work.",
    ),
    metadataJson: {
      family: "setup",
      intent: "primary_setup_completion",
      supports_modes: ["greenfield", "brownfield"],
      bound_by_default: true,
      primary_transition_key: "activation_to_done",
    },
    guidanceJson: toGuidanceJson(
      "Primary workflow for establishing the setup baseline.",
      "This is the completion-driving setup workflow.",
    ),
  },
] as const;

function buildSetupWorkflowSeedRows(
  methodologyVersionId: CanonicalMethodologyVersionId,
): readonly MethodologyWorkflowSeedRow[] {
  const workUnitTypeId = setupWorkUnitTypeId(methodologyVersionId);
  return canonicalSetupWorkflows.map((workflow) => ({
    id: `seed:workflow:setup:${workflow.idSuffix}:${methodologyVersionId}`,
    methodologyVersionId,
    workUnitTypeId,
    key: workflow.key,
    displayName: workflow.displayName,
    descriptionJson: workflow.descriptionJson,
    metadataJson: workflow.metadataJson,
    guidanceJson: workflow.guidanceJson,
  }));
}

const canonicalSetupArtifactSlots = [
  {
    idSuffix: "project-overview",
    key: "PROJECT_OVERVIEW",
    displayName: "Project Overview",
    descriptionJson: toDescriptionJson(
      "Durable setup artifact capturing the project vision, goals, requirements, and key decisions.",
    ),
    guidanceJson: toGuidanceJson(
      "Use this artifact to summarize the project discovery outcomes.",
      "Populate from supported template variables only.",
    ),
    cardinality: "single",
    rulesJson: {
      pathStrategy: "project-knowledge",
      suggestedPath: "project-overview.md",
      templateEngine: "handlebars",
      maxFiles: 1,
    },
  },
] as const;

function buildSetupArtifactSlotDefinitionSeedRows(
  methodologyVersionId: CanonicalMethodologyVersionId,
): readonly MethodologyArtifactSlotDefinitionSeedRow[] {
  const workUnitTypeId = setupWorkUnitTypeId(methodologyVersionId);
  return canonicalSetupArtifactSlots.map((slot) => ({
    id: `seed:artifact-slot:setup:${slot.idSuffix}:${methodologyVersionId}`,
    methodologyVersionId,
    workUnitTypeId,
    key: slot.key,
    displayName: slot.displayName,
    descriptionJson: slot.descriptionJson,
    guidanceJson: slot.guidanceJson,
    cardinality: slot.cardinality,
    rulesJson: slot.rulesJson,
  }));
}

const canonicalSetupArtifactSlotTemplates = [
  {
    idSuffix: "default",
    slotIdSuffix: "project-overview",
    key: "default",
    displayName: "Default Setup README",
    descriptionJson: toDescriptionJson(
      "Default README template for setup-created project baselines.",
    ),
    guidanceJson: toGuidanceJson(
      "Keep this concise and durable.",
      "Use only supported template variable namespaces.",
    ),
    content:
      "# {{workUnit.facts.initiative_name}}\n\n## Project Setup\n- Kind: {{workUnit.facts.project_kind}}\n{{#if methodology.facts.project_root_directory}}- Project root: {{methodology.facts.project_root_directory}}\n{{/if}}{{#if workUnit.facts.project_knowledge_directory}}- Knowledge directory: {{workUnit.facts.project_knowledge_directory}}\n{{/if}}{{#if workUnit.facts.planning_artifacts_directory}}- Planning artifacts: {{workUnit.facts.planning_artifacts_directory}}\n{{/if}}",
  },
] as const;

function buildSetupArtifactSlotTemplateSeedRows(
  methodologyVersionId: CanonicalMethodologyVersionId,
): readonly MethodologyArtifactSlotTemplateSeedRow[] {
  return canonicalSetupArtifactSlotTemplates.map((template) => ({
    id: `seed:artifact-template:setup:${template.idSuffix}:${methodologyVersionId}`,
    methodologyVersionId,
    slotDefinitionId: `seed:artifact-slot:setup:${template.slotIdSuffix}:${methodologyVersionId}`,
    key: template.key,
    displayName: template.displayName,
    descriptionJson: template.descriptionJson,
    guidanceJson: template.guidanceJson,
    content: template.content,
  }));
}

function buildSetupTransitionWorkflowBindingSeedRows(
  methodologyVersionId: CanonicalMethodologyVersionId,
): readonly MethodologyTransitionWorkflowBindingSeedRow[] {
  return [
    {
      id: `seed:binding:setup:activation-to-done:${methodologyVersionId}`,
      methodologyVersionId,
      transitionId: `seed:transition:setup:activation-to-done:${methodologyVersionId}`,
      workflowId: `seed:workflow:setup:setup-project:${methodologyVersionId}`,
    },
  ];
}

function brainstormingWorkUnitTypeId(methodologyVersionId: CanonicalMethodologyVersionId): string {
  return `seed:wut:brainstorming:${methodologyVersionId}`;
}

const canonicalBrainstormingLifecycleStates = [
  {
    idSuffix: "done",
    key: "done",
    displayName: "Done",
    descriptionJson: toDescriptionJson(
      "Brainstorming is complete and its converged directions can inform downstream research and planning.",
    ),
    guidanceJson: toGuidanceJson(
      "This state means the brainstorming session has produced durable converged directions suitable for downstream use.",
      "Only treat brainstorming as done when the session objective, desired outcome, and selected directions have been recorded.",
    ),
  },
] as const;

function buildBrainstormingLifecycleStateSeedRows(
  methodologyVersionId: CanonicalMethodologyVersionId,
): readonly MethodologyLifecycleStateSeedRow[] {
  const workUnitTypeId = brainstormingWorkUnitTypeId(methodologyVersionId);
  return canonicalBrainstormingLifecycleStates.map((state) => ({
    id: `seed:state:brainstorming:${state.idSuffix}:${methodologyVersionId}`,
    methodologyVersionId,
    workUnitTypeId,
    key: state.key,
    displayName: state.displayName,
    descriptionJson: state.descriptionJson,
    guidanceJson: state.guidanceJson,
  }));
}

const canonicalBrainstormingLifecycleTransitions = [
  {
    idSuffix: "activation-to-done",
    transitionKey: "activation_to_done",
    fromStateId: null,
    toStateSuffix: "done",
    descriptionJson: toDescriptionJson(
      "Completes a brainstorming work unit from initial activation into the done state.",
    ),
    guidanceJson: toGuidanceJson(
      "This transition covers the full lifecycle of a brainstorming effort from initial context linkage through convergence.",
      "Use this transition only for the primary brainstorming workflow; support elicitation workflows remain work-unit-owned but unbound.",
    ),
  },
] as const;

function buildBrainstormingLifecycleTransitionSeedRows(
  methodologyVersionId: CanonicalMethodologyVersionId,
): readonly MethodologyLifecycleTransitionSeedRow[] {
  const workUnitTypeId = brainstormingWorkUnitTypeId(methodologyVersionId);
  return canonicalBrainstormingLifecycleTransitions.map((transition) => ({
    id: `seed:transition:brainstorming:${transition.idSuffix}:${methodologyVersionId}`,
    methodologyVersionId,
    workUnitTypeId,
    fromStateId: transition.fromStateId,
    toStateId: `seed:state:brainstorming:${transition.toStateSuffix}:${methodologyVersionId}`,
    transitionKey: transition.transitionKey,
    descriptionJson: transition.descriptionJson,
    guidanceJson: transition.guidanceJson,
  }));
}

const canonicalBrainstormingConditionSets = [
  {
    idSuffix: "activation-to-done:start",
    key: "wu.brainstorming.activation_to_done.start",
    phase: "start" as const,
    mode: "all" as const,
    groupsJson: [
      {
        key: "requires_setup_reference",
        mode: "all",
        conditions: [
          {
            kind: "fact",
            required: true,
            config: {
              factKey: "setup_work_unit",
              operator: "exists",
            },
            rationale:
              "Brainstorming must reference the setup work unit that established baseline context.",
          },
        ],
      },
    ],
  },
  {
    idSuffix: "activation-to-done:completion",
    key: "wu.brainstorming.activation_to_done.completion",
    phase: "completion" as const,
    mode: "all" as const,
    groupsJson: [
      {
        key: "required_brainstorming_facts",
        mode: "all",
        conditions: [
          {
            kind: "fact",
            required: true,
            config: {
              factKey: "objectives",
              operator: "exists",
            },
            rationale: "Brainstorming needs at least one recorded objective.",
          },
          {
            kind: "fact",
            required: true,
            config: {
              factKey: "desired_outcome",
              operator: "exists",
            },
            rationale: "Brainstorming needs an explicit notion of success.",
          },
          {
            kind: "fact",
            required: true,
            config: {
              factKey: "selected_directions",
              operator: "exists",
            },
            rationale:
              "Brainstorming should converge on durable selected directions before completion.",
          },
        ],
      },
    ],
  },
] as const;

function buildBrainstormingTransitionConditionSetSeedRows(
  methodologyVersionId: CanonicalMethodologyVersionId,
): readonly MethodologyTransitionConditionSetSeedRow[] {
  const transitionId = `seed:transition:brainstorming:activation-to-done:${methodologyVersionId}`;
  return canonicalBrainstormingConditionSets.map((conditionSet) => ({
    id: `seed:condition-set:brainstorming:${conditionSet.idSuffix}:${methodologyVersionId}`,
    methodologyVersionId,
    transitionId,
    key: conditionSet.key,
    phase: conditionSet.phase,
    mode: conditionSet.mode,
    groupsJson: conditionSet.groupsJson,
  }));
}

const canonicalBrainstormingFactDefinitions = [
  {
    idSuffix: "setup-work-unit",
    key: "setup_work_unit",
    name: "Setup Work Unit",
    factType: "work_unit",
    cardinality: "one" as const,
    defaultValueJson: null,
    descriptionJson: toDescriptionJson(
      "Reference to the setup work unit that established the baseline project context for this brainstorming effort.",
    ),
    guidanceJson: toGuidanceJson(
      "Select the setup work unit that provides the baseline project context.",
      "Use this reference to retrieve setup-established context before facilitating brainstorming.",
    ),
    validationJson: {
      kind: "none" as const,
      dependencyType: "requires_setup_context",
      workUnitKey: "setup",
    },
  },
  {
    idSuffix: "objectives",
    key: "objectives",
    name: "Objectives",
    factType: "json",
    cardinality: "many" as const,
    defaultValueJson: null,
    descriptionJson: toDescriptionJson(
      "Structured set of goal-oriented objectives the brainstorming session is meant to explore.",
    ),
    guidanceJson: toGuidanceJson(
      "Capture one or more explicit brainstorming objectives. Each objective should describe what the session is trying to explore or produce.",
      "Treat this as the canonical many-valued objective set that keeps divergence focused. Preserve insertion order by default; if stronger prioritization matters, store it explicitly inside each objective item.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12" as const,
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["title", "motivation", "success_signal"],
        properties: {
          title: { type: "string", cardinality: "one", title: "Title" },
          motivation: { type: "string", cardinality: "one", title: "Motivation" },
          success_signal: { type: "string", cardinality: "one", title: "Success Signal" },
          priority: { type: "number", cardinality: "one", title: "Priority" },
          notes: { type: "string", cardinality: "one", title: "Notes" },
        },
      },
    },
  },
  {
    idSuffix: "desired-outcome",
    key: "desired_outcome",
    name: "Desired Outcome",
    factType: "string",
    cardinality: "one" as const,
    defaultValueJson: null,
    descriptionJson: toDescriptionJson("What the session should produce when it has succeeded."),
    guidanceJson: toGuidanceJson(
      "Describe the outcome the brainstorming session should deliver.",
      "Use this as the convergence target when deciding whether brainstorming is complete.",
    ),
    validationJson: { kind: "none" as const },
  },
  {
    idSuffix: "constraints",
    key: "constraints",
    name: "Constraints",
    factType: "json",
    cardinality: "one" as const,
    defaultValueJson: null,
    descriptionJson: toDescriptionJson(
      "Structured constraints that should shape the brainstorming session.",
    ),
    guidanceJson: toGuidanceJson(
      "Capture any must-have constraints, must-avoid constraints, and timebox notes. String entries may contain markdown when richer authored text is useful.",
      "Honor these constraints while exploring options and converging on directions.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12" as const,
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          must_have: {
            type: "string",
            cardinality: "many",
            title: "Must Have",
          },
          must_avoid: {
            type: "string",
            cardinality: "many",
            title: "Must Avoid",
          },
          timebox_notes: {
            type: "string",
            cardinality: "many",
            title: "Timebox Notes",
          },
        },
      },
    },
  },
  {
    idSuffix: "selected-directions",
    key: "selected_directions",
    name: "Selected Directions",
    factType: "json",
    cardinality: "one" as const,
    defaultValueJson: null,
    descriptionJson: toDescriptionJson(
      "Durable convergence checkpoint capturing the directions selected at the end of brainstorming.",
    ),
    guidanceJson: toGuidanceJson(
      "Capture the selected directions as categorized lists: primary directions, quick wins, and breakthrough concepts.",
      "Persist the converged outputs here as categorized lists so downstream work can depend on them without parsing the full artifact.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12" as const,
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          primary_directions: {
            type: "string",
            cardinality: "many",
            title: "Primary Directions",
          },
          quick_wins: {
            type: "string",
            cardinality: "many",
            title: "Quick Wins",
          },
          breakthrough_concepts: {
            type: "string",
            cardinality: "many",
            title: "Breakthrough Concepts",
          },
        },
      },
    },
  },
] as const;

function buildBrainstormingWorkUnitFactDefinitionSeedRows(
  methodologyVersionId: CanonicalMethodologyVersionId,
): readonly MethodologyFactSchemaSeedRow[] {
  const workUnitTypeId = brainstormingWorkUnitTypeId(methodologyVersionId);
  return canonicalBrainstormingFactDefinitions.map((definition) => ({
    id: `seed:work-unit-fact:brainstorming:${definition.idSuffix}:${methodologyVersionId}`,
    methodologyVersionId,
    workUnitTypeId,
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

const canonicalBrainstormingPrimaryWorkflows = [
  {
    idSuffix: "brainstorming",
    key: "brainstorming",
    displayName: "Brainstorming",
    descriptionJson: toDescriptionJson(
      "Primary brainstorming workflow for divergent exploration followed by convergence.",
    ),
    metadataJson: {
      family: "brainstorming",
      intent: "primary_brainstorming_session",
      supports_modes: ["new", "continue"],
      bound_by_default: true,
      primary_transition_key: "activation_to_done",
      source_workflow: "brainstorming",
    },
    guidanceJson: toGuidanceJson(
      "Primary brainstorming workflow for divergent exploration followed by convergence.",
      "Use this workflow to run the main facilitated brainstorming session and drive completion of the work unit.",
    ),
  },
] as const;

const canonicalBrainstormingSupportWorkflows = [
  {
    idSuffix: "five-whys-deep-dive",
    key: "five_whys_deep_dive",
    displayName: "5 Whys Deep Dive",
    sourceMethodCategory: "core",
    descriptionJson: toDescriptionJson(
      "Support workflow for layered root-cause exploration during brainstorming.",
    ),
    guidanceJson: toGuidanceJson(
      "Use when the session needs layered root-cause exploration.",
      "Support workflow only; deepen causality analysis without serving as the completion workflow.",
    ),
  },
  {
    idSuffix: "architecture-decision-records",
    key: "architecture_decision_records",
    displayName: "Architecture Decision Records",
    sourceMethodCategory: "technical",
    descriptionJson: toDescriptionJson(
      "Support workflow for comparing and documenting architectural options during brainstorming.",
    ),
    guidanceJson: toGuidanceJson(
      "Use when brainstorming must compare and document architectural options.",
      "Support workflow only; use to structure architecture-option exploration and tradeoff capture.",
    ),
  },
  {
    idSuffix: "self-consistency-validation",
    key: "self_consistency_validation",
    displayName: "Self-Consistency Validation",
    sourceMethodCategory: "advanced",
    descriptionJson: toDescriptionJson(
      "Support workflow for checking whether emerging directions remain internally consistent.",
    ),
    guidanceJson: toGuidanceJson(
      "Use when the session needs to pressure-test whether emerging directions remain internally consistent.",
      "Support workflow only; use to compare multiple reasoning paths and check alignment.",
    ),
  },
  {
    idSuffix: "first-principles-analysis",
    key: "first_principles_analysis",
    displayName: "First Principles Analysis",
    sourceMethodCategory: "core",
    descriptionJson: toDescriptionJson(
      "Support workflow for stripping assumptions and rebuilding the problem from fundamentals.",
    ),
    guidanceJson: toGuidanceJson(
      "Use when the session should strip assumptions and rebuild the problem from fundamentals.",
      "Support workflow only; use to challenge default assumptions and reframe the problem from basics.",
    ),
  },
  {
    idSuffix: "socratic-questioning",
    key: "socratic_questioning",
    displayName: "Socratic Questioning",
    sourceMethodCategory: "core",
    descriptionJson: toDescriptionJson(
      "Support workflow for uncovering hidden assumptions through structured questioning.",
    ),
    guidanceJson: toGuidanceJson(
      "Use when the session should uncover hidden assumptions through structured questioning.",
      "Support workflow only; use targeted questioning to clarify intent, evidence, and tradeoffs.",
    ),
  },
  {
    idSuffix: "critique-and-refine",
    key: "critique_and_refine",
    displayName: "Critique and Refine",
    sourceMethodCategory: "core",
    descriptionJson: toDescriptionJson(
      "Support workflow for challenging and improving candidate directions before convergence.",
    ),
    guidanceJson: toGuidanceJson(
      "Use when promising ideas need structured critique before convergence.",
      "Support workflow only; iteratively challenge and improve candidate directions.",
    ),
  },
  {
    idSuffix: "tree-of-thoughts",
    key: "tree_of_thoughts",
    displayName: "Tree of Thoughts",
    sourceMethodCategory: "advanced",
    descriptionJson: toDescriptionJson(
      "Support workflow for exploring branching candidate paths before choosing one.",
    ),
    guidanceJson: toGuidanceJson(
      "Use when the session should branch through multiple candidate paths before choosing one.",
      "Support workflow only; explore a branching decision tree of possible approaches.",
    ),
  },
  {
    idSuffix: "graph-of-thoughts",
    key: "graph_of_thoughts",
    displayName: "Graph of Thoughts",
    sourceMethodCategory: "advanced",
    descriptionJson: toDescriptionJson(
      "Support workflow for mapping non-linear relationships across ideas and concepts.",
    ),
    guidanceJson: toGuidanceJson(
      "Use when ideas should be connected across multiple non-linear relationships.",
      "Support workflow only; map interconnected concepts rather than a single linear chain.",
    ),
  },
  {
    idSuffix: "meta-prompting-analysis",
    key: "meta_prompting_analysis",
    displayName: "Meta-Prompting Analysis",
    sourceMethodCategory: "advanced",
    descriptionJson: toDescriptionJson(
      "Support workflow for examining the framing and prompting strategy used during brainstorming.",
    ),
    guidanceJson: toGuidanceJson(
      "Use when the team wants to examine the framing and prompting strategy itself.",
      "Support workflow only; analyze whether the prompts, frames, or lenses used in brainstorming are helping or distorting exploration.",
    ),
  },
  {
    idSuffix: "stakeholder-round-table",
    key: "stakeholder_round_table",
    displayName: "Stakeholder Round Table",
    sourceMethodCategory: "collaboration",
    descriptionJson: toDescriptionJson(
      "Support workflow for comparing or simulating multiple stakeholder viewpoints during brainstorming.",
    ),
    guidanceJson: toGuidanceJson(
      "Use when the session should explicitly compare or simulate multiple stakeholder viewpoints.",
      "Support workflow only; structure the discussion as a multi-perspective round-table rather than a single-agent brainstorm.",
    ),
  },
] as const;

function buildBrainstormingWorkflowSeedRows(
  methodologyVersionId: CanonicalMethodologyVersionId,
): readonly MethodologyWorkflowSeedRow[] {
  const workUnitTypeId = brainstormingWorkUnitTypeId(methodologyVersionId);
  const primaryRows = canonicalBrainstormingPrimaryWorkflows.map((workflow) => ({
    id: `seed:workflow:brainstorming:${workflow.idSuffix}:${methodologyVersionId}`,
    methodologyVersionId,
    workUnitTypeId,
    key: workflow.key,
    displayName: workflow.displayName,
    descriptionJson: workflow.descriptionJson,
    metadataJson: workflow.metadataJson,
    guidanceJson: workflow.guidanceJson,
  }));

  const supportRows = canonicalBrainstormingSupportWorkflows.map((workflow) => ({
    id: `seed:workflow:brainstorming:${workflow.idSuffix}:${methodologyVersionId}`,
    methodologyVersionId,
    workUnitTypeId,
    key: workflow.key,
    displayName: workflow.displayName,
    descriptionJson: workflow.descriptionJson,
    metadataJson: {
      family: "brainstorming",
      intent: "supporting_elicitation_method",
      supports_modes: ["enhancement"],
      bound_by_default: false,
      source_workflow: "advanced_elicitation",
      source_method_key: workflow.key,
      source_method_category: workflow.sourceMethodCategory,
    },
    guidanceJson: workflow.guidanceJson,
  }));

  return [...primaryRows, ...supportRows];
}

const canonicalBrainstormingArtifactSlots = [
  {
    idSuffix: "brainstorming-session",
    key: "brainstorming_session",
    displayName: "Brainstorming Session",
    descriptionJson: toDescriptionJson(
      "Durable brainstorming artifact capturing the facilitated session, constraints, and converged directions.",
    ),
    guidanceJson: toGuidanceJson(
      "Use this artifact to persist the full brainstorming session outcome.",
      "Persist the durable session narrative here; downstream work may use `selected_directions` for fast gating and this artifact for fuller context.",
    ),
    cardinality: "single",
    rulesJson: {
      pathStrategy: "project-knowledge",
      suggestedPath: "brainstorming/brainstorming-session.md",
      templateEngine: "handlebars",
      maxFiles: 1,
    },
  },
] as const;

function buildBrainstormingArtifactSlotDefinitionSeedRows(
  methodologyVersionId: CanonicalMethodologyVersionId,
): readonly MethodologyArtifactSlotDefinitionSeedRow[] {
  const workUnitTypeId = brainstormingWorkUnitTypeId(methodologyVersionId);
  return canonicalBrainstormingArtifactSlots.map((slot) => ({
    id: `seed:artifact-slot:brainstorming:${slot.idSuffix}:${methodologyVersionId}`,
    methodologyVersionId,
    workUnitTypeId,
    key: slot.key,
    displayName: slot.displayName,
    descriptionJson: slot.descriptionJson,
    guidanceJson: slot.guidanceJson,
    cardinality: slot.cardinality,
    rulesJson: slot.rulesJson,
  }));
}

const canonicalBrainstormingArtifactTemplates = [
  {
    idSuffix: "default",
    slotIdSuffix: "brainstorming-session",
    key: "default",
    displayName: "Default Brainstorming Session Template",
    descriptionJson: toDescriptionJson(
      "Default template for the durable brainstorming session artifact.",
    ),
    guidanceJson: toGuidanceJson(
      "Summarize the setup context, objective, constraints, and selected directions.",
      "Use only supported template variable namespaces and keep the artifact durable rather than ephemeral.",
    ),
    content:
      "# Brainstorming Session\n\n## Context\n{{#if methodology.workUnits.setup.facts.initiative_name}}- Initiative: {{methodology.workUnits.setup.facts.initiative_name}}\n{{/if}}- Desired outcome: {{workUnit.facts.desired_outcome}}\n\n{{#if workUnit.facts.objectives}}## Objectives\n{{#each workUnit.facts.objectives}}- {{title}}: {{motivation}}\n  - Success signal: {{success_signal}}\n  {{#if priority}}- Priority: {{priority}}\n  {{/if}}{{#if notes}}- Notes: {{notes}}\n  {{/if}}\n{{/each}}{{/if}}{{#if workUnit.facts.constraints}}## Constraints\n{{#if workUnit.facts.constraints.must_have}}- Must have:\n{{#each workUnit.facts.constraints.must_have}}  - {{this}}\n{{/each}}{{/if}}{{#if workUnit.facts.constraints.must_avoid}}- Must avoid:\n{{#each workUnit.facts.constraints.must_avoid}}  - {{this}}\n{{/each}}{{/if}}{{#if workUnit.facts.constraints.timebox_notes}}- Timebox notes:\n{{#each workUnit.facts.constraints.timebox_notes}}  - {{this}}\n{{/each}}{{/if}}\n{{/if}}{{#if workUnit.facts.selected_directions}}## Selected Directions\n{{#if workUnit.facts.selected_directions.primary_directions}}- Primary directions:\n{{#each workUnit.facts.selected_directions.primary_directions}}  - {{this}}\n{{/each}}{{/if}}{{#if workUnit.facts.selected_directions.quick_wins}}- Quick wins:\n{{#each workUnit.facts.selected_directions.quick_wins}}  - {{this}}\n{{/each}}{{/if}}{{#if workUnit.facts.selected_directions.breakthrough_concepts}}- Breakthrough concepts:\n{{#each workUnit.facts.selected_directions.breakthrough_concepts}}  - {{this}}\n{{/each}}{{/if}}{{/if}}",
  },
] as const;

function buildBrainstormingArtifactSlotTemplateSeedRows(
  methodologyVersionId: CanonicalMethodologyVersionId,
): readonly MethodologyArtifactSlotTemplateSeedRow[] {
  return canonicalBrainstormingArtifactTemplates.map((template) => ({
    id: `seed:artifact-template:brainstorming:${template.idSuffix}:${methodologyVersionId}`,
    methodologyVersionId,
    slotDefinitionId: `seed:artifact-slot:brainstorming:${template.slotIdSuffix}:${methodologyVersionId}`,
    key: template.key,
    displayName: template.displayName,
    descriptionJson: template.descriptionJson,
    guidanceJson: template.guidanceJson,
    content: template.content,
  }));
}

function buildBrainstormingTransitionWorkflowBindingSeedRows(
  methodologyVersionId: CanonicalMethodologyVersionId,
): readonly MethodologyTransitionWorkflowBindingSeedRow[] {
  return [
    {
      id: `seed:binding:brainstorming:activation-to-done:${methodologyVersionId}`,
      methodologyVersionId,
      transitionId: `seed:transition:brainstorming:activation-to-done:${methodologyVersionId}`,
      workflowId: `seed:workflow:brainstorming:brainstorming:${methodologyVersionId}`,
    },
  ];
}

function researchWorkUnitTypeId(methodologyVersionId: CanonicalMethodologyVersionId): string {
  return `seed:wut:research:${methodologyVersionId}`;
}

const canonicalResearchLifecycleStates = [
  {
    idSuffix: "done",
    key: "done",
    displayName: "Done",
    descriptionJson: toDescriptionJson(
      "Research is complete and its synthesized conclusions are available for downstream work.",
    ),
    guidanceJson: toGuidanceJson(
      "This state means the research has been completed to a level suitable for later planning or implementation work.",
      "Only treat research as done when the durable synthesis has been captured and the workflow objective has been satisfied.",
    ),
  },
] as const;

function buildResearchLifecycleStateSeedRows(
  methodologyVersionId: CanonicalMethodologyVersionId,
): readonly MethodologyLifecycleStateSeedRow[] {
  const workUnitTypeId = researchWorkUnitTypeId(methodologyVersionId);
  return canonicalResearchLifecycleStates.map((state) => ({
    id: `seed:state:research:${state.idSuffix}:${methodologyVersionId}`,
    methodologyVersionId,
    workUnitTypeId,
    key: state.key,
    displayName: state.displayName,
    descriptionJson: state.descriptionJson,
    guidanceJson: state.guidanceJson,
  }));
}

const canonicalResearchLifecycleTransitions = [
  {
    idSuffix: "activation-to-done",
    transitionKey: "activation_to_done",
    fromStateId: null,
    toStateSuffix: "done",
    descriptionJson: toDescriptionJson(
      "Completes a research work unit from initial activation into the done state.",
    ),
    guidanceJson: toGuidanceJson(
      "This transition covers the full lifecycle of a single research effort from start through finalized synthesis.",
      "Use this transition for all three research workflows; the chosen workflow determines the research type while the transition enforces shared completion requirements.",
    ),
  },
] as const;

function buildResearchLifecycleTransitionSeedRows(
  methodologyVersionId: CanonicalMethodologyVersionId,
): readonly MethodologyLifecycleTransitionSeedRow[] {
  const workUnitTypeId = researchWorkUnitTypeId(methodologyVersionId);
  return canonicalResearchLifecycleTransitions.map((transition) => ({
    id: `seed:transition:research:${transition.idSuffix}:${methodologyVersionId}`,
    methodologyVersionId,
    workUnitTypeId,
    fromStateId: transition.fromStateId,
    toStateId: `seed:state:research:${transition.toStateSuffix}:${methodologyVersionId}`,
    transitionKey: transition.transitionKey,
    descriptionJson: transition.descriptionJson,
    guidanceJson: transition.guidanceJson,
  }));
}

const canonicalResearchConditionSets = [
  {
    idSuffix: "activation-to-done:start",
    key: "wu.research.activation_to_done.start",
    phase: "start" as const,
    mode: "all" as const,
    groupsJson: [
      {
        key: "required_upstream_context",
        mode: "all",
        conditions: [
          {
            kind: "fact",
            required: true,
            config: {
              factKey: "setup_work_unit",
              operator: "exists",
            },
            rationale: "Research requires a setup context reference.",
          },
          {
            kind: "fact",
            required: true,
            config: {
              factKey: "brainstorming_work_unit",
              operator: "exists",
            },
            rationale: "Research should be connected to an upstream brainstorming context.",
          },
        ],
      },
    ],
  },
  {
    idSuffix: "activation-to-done:completion",
    key: "wu.research.activation_to_done.completion",
    phase: "completion" as const,
    mode: "all" as const,
    groupsJson: [
      {
        key: "required_research_outputs",
        mode: "all",
        conditions: [
          {
            kind: "fact",
            required: true,
            config: {
              factKey: "research_topic",
              operator: "exists",
            },
            rationale: "The research topic must be recorded.",
          },
          {
            kind: "fact",
            required: true,
            config: {
              factKey: "research_goals",
              operator: "exists",
            },
            rationale: "The research goals set must include at least one recorded goal.",
          },
          {
            kind: "fact",
            required: true,
            config: {
              factKey: "research_synthesis",
              operator: "exists",
            },
            rationale: "A durable synthesis must exist before the research is complete.",
          },
        ],
      },
    ],
  },
] as const;

function buildResearchTransitionConditionSetSeedRows(
  methodologyVersionId: CanonicalMethodologyVersionId,
): readonly MethodologyTransitionConditionSetSeedRow[] {
  const transitionId = `seed:transition:research:activation-to-done:${methodologyVersionId}`;
  return canonicalResearchConditionSets.map((conditionSet) => ({
    id: `seed:condition-set:research:${conditionSet.idSuffix}:${methodologyVersionId}`,
    methodologyVersionId,
    transitionId,
    key: conditionSet.key,
    phase: conditionSet.phase,
    mode: conditionSet.mode,
    groupsJson: conditionSet.groupsJson,
  }));
}

const canonicalResearchFactDefinitions = [
  {
    idSuffix: "setup-work-unit",
    key: "setup_work_unit",
    name: "Setup Work Unit",
    factType: "string",
    cardinality: "one" as const,
    defaultValueJson: null,
    descriptionJson: toDescriptionJson(
      "Reference to the setup work unit that established baseline project context.",
    ),
    guidanceJson: toGuidanceJson(
      "Select the setup work unit whose baseline context should be used for this research effort.",
      "Use the referenced setup work unit as the authoritative source of baseline project context.",
    ),
    validationJson: {
      kind: "none" as const,
      dependencyType: "requires_setup_context",
      workUnitKey: "setup",
    },
  },
  {
    idSuffix: "brainstorming-work-unit",
    key: "brainstorming_work_unit",
    name: "Brainstorming Work Unit",
    factType: "string",
    cardinality: "one" as const,
    defaultValueJson: null,
    descriptionJson: toDescriptionJson(
      "Reference to the brainstorming work unit that shaped the research direction.",
    ),
    guidanceJson: toGuidanceJson(
      "Select the brainstorming work unit whose outcomes should inform this research.",
      "Use the referenced brainstorming work unit to recover the ideas or direction that motivated this research.",
    ),
    validationJson: {
      kind: "none" as const,
      dependencyType: "informed_by_brainstorming",
      workUnitKey: "brainstorming",
    },
  },
  {
    idSuffix: "research-topic",
    key: "research_topic",
    name: "Research Topic",
    factType: "string",
    cardinality: "one" as const,
    defaultValueJson: null,
    descriptionJson: toDescriptionJson("The core topic, question, or subject being researched."),
    guidanceJson: toGuidanceJson(
      "State the specific topic this research should investigate.",
      "Treat this as the primary anchor for research framing, source selection, and synthesis.",
    ),
    validationJson: { kind: "none" as const },
  },
  {
    idSuffix: "research-goals",
    key: "research_goals",
    name: "Research Goals",
    factType: "json",
    cardinality: "many" as const,
    defaultValueJson: null,
    descriptionJson: toDescriptionJson(
      "Structured set of concrete research goals the workflow must answer or produce.",
    ),
    guidanceJson: toGuidanceJson(
      "Capture one or more explicit research goals. Each goal should state what the research must clarify, compare, verify, or recommend.",
      "Use this many-valued goal set to bound scope and decide whether the research is complete. Preserve insertion order by default; if stronger prioritization matters, store it explicitly inside each goal item.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12" as const,
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["title", "question", "success_signal"],
        properties: {
          title: { type: "string", cardinality: "one", title: "Title" },
          question: { type: "string", cardinality: "one", title: "Question" },
          success_signal: { type: "string", cardinality: "one", title: "Success Signal" },
          priority: { type: "number", cardinality: "one", title: "Priority" },
          notes: { type: "string", cardinality: "one", title: "Notes" },
        },
      },
    },
  },
  {
    idSuffix: "scope-notes",
    key: "scope_notes",
    name: "Scope Notes",
    factType: "string",
    cardinality: "one" as const,
    defaultValueJson: null,
    descriptionJson: toDescriptionJson(
      "Optional notes that narrow, qualify, or constrain the research scope.",
    ),
    guidanceJson: toGuidanceJson(
      "Use this for exclusions, audience framing, or scope constraints.",
      "Honor these notes when selecting sources and synthesizing findings.",
    ),
    validationJson: { kind: "none" as const },
  },
  {
    idSuffix: "research-synthesis",
    key: "research_synthesis",
    name: "Research Synthesis",
    factType: "json",
    cardinality: "one" as const,
    defaultValueJson: null,
    descriptionJson: toDescriptionJson(
      "Compact durable summary of the completed research conclusions.",
    ),
    guidanceJson: toGuidanceJson(
      "Capture the most important conclusions in a compact structured form for downstream use.",
      "Persist the minimum durable synthesis needed to support downstream planning and implementation decisions.",
    ),
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12" as const,
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["executive_summary", "key_finding", "primary_recommendation"],
        properties: {
          executive_summary: {
            type: "string",
            cardinality: "one",
            title: "Executive Summary",
          },
          key_finding: { type: "string", cardinality: "one", title: "Key Finding" },
          primary_recommendation: {
            type: "string",
            cardinality: "one",
            title: "Primary Recommendation",
          },
          source_verification_summary: {
            type: "string",
            cardinality: "one",
            title: "Source Verification Summary",
          },
        },
      },
    },
  },
] as const;

function buildResearchWorkUnitFactDefinitionSeedRows(
  methodologyVersionId: CanonicalMethodologyVersionId,
): readonly MethodologyFactSchemaSeedRow[] {
  const workUnitTypeId = researchWorkUnitTypeId(methodologyVersionId);
  return canonicalResearchFactDefinitions.map((definition) => ({
    id: `seed:work-unit-fact:research:${definition.idSuffix}:${methodologyVersionId}`,
    methodologyVersionId,
    workUnitTypeId,
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

const canonicalResearchArtifactSlots = [
  {
    idSuffix: "research-report",
    key: "research_report",
    displayName: "Research Report",
    descriptionJson: toDescriptionJson("Durable report artifact produced by a research workflow."),
    guidanceJson: toGuidanceJson(
      "Each research run should produce one final report tailored to the selected research workflow.",
      "Write the final synthesized research document here using the template that matches the active workflow.",
    ),
    cardinality: "single",
    rulesJson: {
      pathStrategy: "planning-artifacts",
      suggestedPath: "research/research-report.md",
      templateEngine: "handlebars",
      maxFiles: 1,
    },
  },
] as const;

function buildResearchArtifactSlotDefinitionSeedRows(
  methodologyVersionId: CanonicalMethodologyVersionId,
): readonly MethodologyArtifactSlotDefinitionSeedRow[] {
  const workUnitTypeId = researchWorkUnitTypeId(methodologyVersionId);
  return canonicalResearchArtifactSlots.map((slot) => ({
    id: `seed:artifact-slot:research:${slot.idSuffix}:${methodologyVersionId}`,
    methodologyVersionId,
    workUnitTypeId,
    key: slot.key,
    displayName: slot.displayName,
    descriptionJson: slot.descriptionJson,
    guidanceJson: slot.guidanceJson,
    cardinality: slot.cardinality,
    rulesJson: slot.rulesJson,
  }));
}

const canonicalResearchArtifactTemplates = [
  {
    idSuffix: "market",
    key: "market",
    displayName: "Market Research Report",
    descriptionJson: toDescriptionJson("Template for durable market research output."),
    guidanceJson: toGuidanceJson(
      "Use this template when the research focuses on market context, competition, and positioning.",
      "Produce a market-oriented report using the shared research facts and synthesis.",
    ),
    content:
      "# Market Research\n\n## Topic\n{{workUnit.facts.research_topic}}\n\n{{#if workUnit.facts.research_goals}}## Goals\n{{#each workUnit.facts.research_goals}}- {{title}}: {{question}}\n  - Success signal: {{success_signal}}\n  {{#if priority}}- Priority: {{priority}}\n  {{/if}}{{#if notes}}- Notes: {{notes}}\n  {{/if}}\n{{/each}}\n{{/if}}{{#if workUnit.facts.research_synthesis.executive_summary}}## Executive Summary\n{{workUnit.facts.research_synthesis.executive_summary}}\n\n{{/if}}{{#if workUnit.facts.research_synthesis.key_finding}}## Key Finding\n{{workUnit.facts.research_synthesis.key_finding}}\n\n{{/if}}{{#if workUnit.facts.research_synthesis.primary_recommendation}}## Primary Recommendation\n{{workUnit.facts.research_synthesis.primary_recommendation}}\n\n{{/if}}{{#if workUnit.facts.research_synthesis.source_verification_summary}}## Source Verification\n{{workUnit.facts.research_synthesis.source_verification_summary}}\n{{/if}}",
  },
  {
    idSuffix: "domain",
    key: "domain",
    displayName: "Domain Research Report",
    descriptionJson: toDescriptionJson("Template for durable domain research output."),
    guidanceJson: toGuidanceJson(
      "Use this template when the research focuses on domain concepts, terminology, actors, and context.",
      "Produce a domain-oriented report using the shared research facts and synthesis.",
    ),
    content:
      "# Domain Research\n\n## Topic\n{{workUnit.facts.research_topic}}\n\n{{#if workUnit.facts.research_goals}}## Goals\n{{#each workUnit.facts.research_goals}}- {{title}}: {{question}}\n  - Success signal: {{success_signal}}\n  {{#if priority}}- Priority: {{priority}}\n  {{/if}}{{#if notes}}- Notes: {{notes}}\n  {{/if}}\n{{/each}}\n{{/if}}{{#if workUnit.facts.research_synthesis.executive_summary}}## Executive Summary\n{{workUnit.facts.research_synthesis.executive_summary}}\n\n{{/if}}{{#if workUnit.facts.research_synthesis.key_finding}}## Key Finding\n{{workUnit.facts.research_synthesis.key_finding}}\n\n{{/if}}{{#if workUnit.facts.research_synthesis.primary_recommendation}}## Primary Recommendation\n{{workUnit.facts.research_synthesis.primary_recommendation}}\n\n{{/if}}{{#if workUnit.facts.research_synthesis.source_verification_summary}}## Source Verification\n{{workUnit.facts.research_synthesis.source_verification_summary}}\n{{/if}}",
  },
  {
    idSuffix: "technical",
    key: "technical",
    displayName: "Technical Research Report",
    descriptionJson: toDescriptionJson("Template for durable technical research output."),
    guidanceJson: toGuidanceJson(
      "Use this template when the research focuses on technical options, architecture, tooling, or tradeoffs.",
      "Produce a technical report using the shared research facts and synthesis.",
    ),
    content:
      "# Technical Research\n\n## Topic\n{{workUnit.facts.research_topic}}\n\n{{#if workUnit.facts.research_goals}}## Goals\n{{#each workUnit.facts.research_goals}}- {{title}}: {{question}}\n  - Success signal: {{success_signal}}\n  {{#if priority}}- Priority: {{priority}}\n  {{/if}}{{#if notes}}- Notes: {{notes}}\n  {{/if}}\n{{/each}}\n{{/if}}{{#if workUnit.facts.research_synthesis.executive_summary}}## Executive Summary\n{{workUnit.facts.research_synthesis.executive_summary}}\n\n{{/if}}{{#if workUnit.facts.research_synthesis.key_finding}}## Key Finding\n{{workUnit.facts.research_synthesis.key_finding}}\n\n{{/if}}{{#if workUnit.facts.research_synthesis.primary_recommendation}}## Primary Recommendation\n{{workUnit.facts.research_synthesis.primary_recommendation}}\n\n{{/if}}{{#if workUnit.facts.research_synthesis.source_verification_summary}}## Source Verification\n{{workUnit.facts.research_synthesis.source_verification_summary}}\n{{/if}}",
  },
] as const;

function buildResearchArtifactSlotTemplateSeedRows(
  methodologyVersionId: CanonicalMethodologyVersionId,
): readonly MethodologyArtifactSlotTemplateSeedRow[] {
  return canonicalResearchArtifactTemplates.map((template) => ({
    id: `seed:artifact-template:research:${template.idSuffix}:${methodologyVersionId}`,
    methodologyVersionId,
    slotDefinitionId: `seed:artifact-slot:research:research-report:${methodologyVersionId}`,
    key: template.key,
    displayName: template.displayName,
    descriptionJson: template.descriptionJson,
    guidanceJson: template.guidanceJson,
    content: template.content,
  }));
}

const canonicalResearchWorkflows = [
  {
    idSuffix: "market-research",
    key: "market_research",
    displayName: "Market Research",
    descriptionJson: toDescriptionJson(
      "Primary research workflow for market landscape analysis, competitor positioning, and opportunity framing.",
    ),
    metadataJson: {
      family: "research",
      intent: "market_research",
      supports_modes: ["new", "continue"],
      bound_by_default: true,
      primary_transition_key: "activation_to_done",
      source_workflow: "market_research",
    },
    guidanceJson: toGuidanceJson(
      "Use for market-focused research on landscape, alternatives, and positioning.",
      "Drive evidence-backed market analysis and synthesize implications for downstream planning.",
    ),
  },
  {
    idSuffix: "domain-research",
    key: "domain_research",
    displayName: "Domain Research",
    descriptionJson: toDescriptionJson(
      "Primary research workflow for domain concepts, terminology, actors, and operational context.",
    ),
    metadataJson: {
      family: "research",
      intent: "domain_research",
      supports_modes: ["new", "continue"],
      bound_by_default: true,
      primary_transition_key: "activation_to_done",
      source_workflow: "domain_research",
    },
    guidanceJson: toGuidanceJson(
      "Use for domain-focused research on concepts, language, stakeholders, and workflows.",
      "Clarify domain understanding with durable, structured findings that downstream units can consume.",
    ),
  },
  {
    idSuffix: "technical-research",
    key: "technical_research",
    displayName: "Technical Research",
    descriptionJson: toDescriptionJson(
      "Primary research workflow for technical options, architecture tradeoffs, and implementation constraints.",
    ),
    metadataJson: {
      family: "research",
      intent: "technical_research",
      supports_modes: ["new", "continue"],
      bound_by_default: true,
      primary_transition_key: "activation_to_done",
      source_workflow: "technical_research",
    },
    guidanceJson: toGuidanceJson(
      "Use for technical research on architecture, tooling, and implementation decision tradeoffs.",
      "Produce technically actionable synthesis with explicit tradeoff awareness.",
    ),
  },
] as const;

function buildResearchWorkflowSeedRows(
  methodologyVersionId: CanonicalMethodologyVersionId,
): readonly MethodologyWorkflowSeedRow[] {
  const workUnitTypeId = researchWorkUnitTypeId(methodologyVersionId);
  return canonicalResearchWorkflows.map((workflow) => ({
    id: `seed:workflow:research:${workflow.idSuffix}:${methodologyVersionId}`,
    methodologyVersionId,
    workUnitTypeId,
    key: workflow.key,
    displayName: workflow.displayName,
    descriptionJson: workflow.descriptionJson,
    metadataJson: workflow.metadataJson,
    guidanceJson: workflow.guidanceJson,
  }));
}

function buildResearchTransitionWorkflowBindingSeedRows(
  methodologyVersionId: CanonicalMethodologyVersionId,
): readonly MethodologyTransitionWorkflowBindingSeedRow[] {
  return canonicalResearchWorkflows.map((workflow) => ({
    id: `seed:binding:research:${workflow.idSuffix}:${methodologyVersionId}`,
    methodologyVersionId,
    transitionId: `seed:transition:research:activation-to-done:${methodologyVersionId}`,
    workflowId: `seed:workflow:research:${workflow.idSuffix}:${methodologyVersionId}`,
  }));
}

export const setupLifecycleStateSeedRows: readonly MethodologyLifecycleStateSeedRow[] =
  buildRowsForAllCanonicalVersions(buildSetupLifecycleStateSeedRows);

export const brainstormingLifecycleStateSeedRows: readonly MethodologyLifecycleStateSeedRow[] =
  buildRowsForAllCanonicalVersions(buildBrainstormingLifecycleStateSeedRows);

export const researchLifecycleStateSeedRows: readonly MethodologyLifecycleStateSeedRow[] =
  buildRowsForAllCanonicalVersions(buildResearchLifecycleStateSeedRows);

export const setupLifecycleTransitionSeedRows: readonly MethodologyLifecycleTransitionSeedRow[] =
  buildRowsForAllCanonicalVersions(buildSetupLifecycleTransitionSeedRows);

export const brainstormingLifecycleTransitionSeedRows: readonly MethodologyLifecycleTransitionSeedRow[] =
  buildRowsForAllCanonicalVersions(buildBrainstormingLifecycleTransitionSeedRows);

export const researchLifecycleTransitionSeedRows: readonly MethodologyLifecycleTransitionSeedRow[] =
  buildRowsForAllCanonicalVersions(buildResearchLifecycleTransitionSeedRows);

export const setupTransitionConditionSetSeedRows: readonly MethodologyTransitionConditionSetSeedRow[] =
  buildRowsForAllCanonicalVersions(buildSetupTransitionConditionSetSeedRows);

export const brainstormingTransitionConditionSetSeedRows: readonly MethodologyTransitionConditionSetSeedRow[] =
  buildRowsForAllCanonicalVersions(buildBrainstormingTransitionConditionSetSeedRows);

export const researchTransitionConditionSetSeedRows: readonly MethodologyTransitionConditionSetSeedRow[] =
  buildRowsForAllCanonicalVersions(buildResearchTransitionConditionSetSeedRows);

export const setupFactSchemaSeedRows: readonly MethodologyFactSchemaSeedRow[] =
  buildRowsForAllCanonicalVersions(buildSetupWorkUnitFactDefinitionSeedRows);

export const brainstormingFactSchemaSeedRows: readonly MethodologyFactSchemaSeedRow[] =
  buildRowsForAllCanonicalVersions(buildBrainstormingWorkUnitFactDefinitionSeedRows);

export const researchFactSchemaSeedRows: readonly MethodologyFactSchemaSeedRow[] =
  buildRowsForAllCanonicalVersions(buildResearchWorkUnitFactDefinitionSeedRows);

export const setupArtifactSlotDefinitionSeedRows: readonly MethodologyArtifactSlotDefinitionSeedRow[] =
  buildRowsForAllCanonicalVersions(buildSetupArtifactSlotDefinitionSeedRows);

export const brainstormingArtifactSlotDefinitionSeedRows: readonly MethodologyArtifactSlotDefinitionSeedRow[] =
  buildRowsForAllCanonicalVersions(buildBrainstormingArtifactSlotDefinitionSeedRows);

export const researchArtifactSlotDefinitionSeedRows: readonly MethodologyArtifactSlotDefinitionSeedRow[] =
  buildRowsForAllCanonicalVersions(buildResearchArtifactSlotDefinitionSeedRows);

export const setupArtifactSlotTemplateSeedRows: readonly MethodologyArtifactSlotTemplateSeedRow[] =
  buildRowsForAllCanonicalVersions(buildSetupArtifactSlotTemplateSeedRows);

export const brainstormingArtifactSlotTemplateSeedRows: readonly MethodologyArtifactSlotTemplateSeedRow[] =
  buildRowsForAllCanonicalVersions(buildBrainstormingArtifactSlotTemplateSeedRows);

export const researchArtifactSlotTemplateSeedRows: readonly MethodologyArtifactSlotTemplateSeedRow[] =
  buildRowsForAllCanonicalVersions(buildResearchArtifactSlotTemplateSeedRows);

export const setupWorkflowSeedRows: readonly MethodologyWorkflowSeedRow[] =
  buildRowsForAllCanonicalVersions(buildSetupWorkflowSeedRows);

export const brainstormingWorkflowSeedRows: readonly MethodologyWorkflowSeedRow[] =
  buildRowsForAllCanonicalVersions(buildBrainstormingWorkflowSeedRows);

export const researchWorkflowSeedRows: readonly MethodologyWorkflowSeedRow[] =
  buildRowsForAllCanonicalVersions(buildResearchWorkflowSeedRows);

export const setupWorkflowStepSeedRows: readonly MethodologyWorkflowStepSeedRow[] = [];
export const setupWorkflowEdgeSeedRows: readonly MethodologyWorkflowEdgeSeedRow[] = [];

export const setupTransitionWorkflowBindingSeedRows: readonly MethodologyTransitionWorkflowBindingSeedRow[] =
  buildRowsForAllCanonicalVersions(buildSetupTransitionWorkflowBindingSeedRows);

export const brainstormingTransitionWorkflowBindingSeedRows: readonly MethodologyTransitionWorkflowBindingSeedRow[] =
  buildRowsForAllCanonicalVersions(buildBrainstormingTransitionWorkflowBindingSeedRows);

export const researchTransitionWorkflowBindingSeedRows: readonly MethodologyTransitionWorkflowBindingSeedRow[] =
  buildRowsForAllCanonicalVersions(buildResearchTransitionWorkflowBindingSeedRows);

const canonicalDependencyDefinitions = [
  {
    idSuffix: "requires-setup-context",
    key: "requires_setup_context",
    name: "Requires Setup Context",
    descriptionJson: toDescriptionJson(
      "Indicates that a downstream work unit depends on setup-established project context before it can proceed meaningfully.",
    ),
    guidanceJson: toGuidanceJson(
      "Use this dependency when work should only proceed after setup has established the foundational project context.",
      "This dependency signals that the upstream setup work unit is the authoritative source of baseline project facts needed by the dependent work unit.",
    ),
  },
  {
    idSuffix: "informed-by-brainstorming",
    key: "informed_by_brainstorming",
    name: "Informed by Brainstorming",
    descriptionJson: toDescriptionJson(
      "Indicates that a downstream work unit uses brainstorming output as an input to shape its scope, direction, or evidence gathering.",
    ),
    guidanceJson: toGuidanceJson(
      "Use this dependency when earlier brainstorming work meaningfully shapes what the downstream work should investigate or produce.",
      "Treat brainstorming as an upstream source of direction, framing, and candidate focus areas, not as final truth.",
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
      "Default language used for interactive guidance and conversational responses across the methodology.",
    ),
    guidanceJson: toGuidanceJson(
      "Sets the default language Chiron uses when guiding people through setup, brainstorming, and research.",
      "Use this as the default response language unless a more specific project or runtime override is present.",
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
      "Default language used for persisted methodology artifacts such as setup summaries, brainstorming outputs, and research deliverables.",
    ),
    guidanceJson: toGuidanceJson(
      "Controls the language of generated documents and saved artifacts.",
      "When producing durable artifacts, prefer this language unless the work unit or runtime context explicitly overrides it.",
    ),
    defaultValueJson: "English",
    validationJson: { kind: "none" as const },
  },
  {
    idSuffix: "project-root-directory",
    name: "Project Root Directory",
    key: "project_root_directory",
    valueType: "string",
    cardinality: "one" as const,
    descriptionJson: toDescriptionJson(
      "Canonical project working directory used by the OpenCode harness when executing agent-driven steps against the project.",
    ),
    guidanceJson: toGuidanceJson(
      "Set this to the repository root or other intended working directory for harness-driven work.",
      "Use this as the default working directory for OpenCode harness operations unless a step explicitly overrides it.",
    ),
    defaultValueJson: null,
    validationJson: {
      kind: "path" as const,
      path: {
        pathKind: "directory" as const,
        normalization: {
          mode: "posix" as const,
          trimWhitespace: true,
        },
        safety: {
          disallowAbsolute: false,
          preventTraversal: true,
        },
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
      "Use this to capture whether discovery found a monolith, monorepo, or multi-part repository shape.",
      "Treat this as a reusable design-time methodology fact definition that later bindings can point at without seeding runtime rows.",
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
      "Record each discovered project part with a stable id, root path, and project-type classification.",
      "Paths must stay relative to the canonical project root rather than duplicating project_root_path as a fact.",
    ),
    defaultValueJson: null,
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["part_id", "root_path", "project_type_id"],
        properties: {
          part_id: { type: "string", cardinality: "one" },
          root_path: {
            type: "string",
            cardinality: "one",
            title: "Root Path",
            "x-validation": {
              kind: "path",
              path: {
                pathKind: "directory",
                normalization: {
                  mode: "posix",
                  trimWhitespace: true,
                },
                safety: {
                  disallowAbsolute: true,
                  preventTraversal: true,
                },
              },
            },
          },
          project_type_id: { type: "string", cardinality: "one" },
        },
      },
      subSchema: {
        type: "object",
        fields: [
          { key: "part_id", type: "string", cardinality: "one" },
          {
            key: "root_path",
            type: "string",
            cardinality: "one",
            validation: {
              kind: "path",
              path: {
                pathKind: "directory",
                normalization: {
                  mode: "posix",
                  trimWhitespace: true,
                },
                safety: {
                  disallowAbsolute: true,
                  preventTraversal: true,
                },
              },
            },
          },
          { key: "project_type_id", type: "string", cardinality: "one" },
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
      "Capture the primary framework, language, version, database, and dependency cues for each discovered part.",
      "Keep this as a reusable design-time fact definition only; runtime stack rows are seeded later through project facts, not here.",
    ),
    defaultValueJson: null,
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["part_id", "framework", "language", "version", "database", "dependencies"],
        properties: {
          part_id: { type: "string", cardinality: "one" },
          framework: { type: "string", cardinality: "one" },
          language: { type: "string", cardinality: "one" },
          version: { type: "string", cardinality: "one" },
          database: { type: "string", cardinality: "one" },
          dependencies: { type: "string", cardinality: "one" },
        },
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
      "Keep documentation paths relative to the project root and store them as reusable design-time shape only.",
    ),
    defaultValueJson: null,
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["path", "doc_type", "related_part_id"],
        properties: {
          path: { type: "string", cardinality: "one" },
          doc_type: { type: "string", cardinality: "one" },
          related_part_id: { type: "string", cardinality: "one" },
        },
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
      "Capture the directional connections between discovered project parts and the type of each integration.",
      "Use this as reusable methodology fact-definition shape only; do not seed project-level integration instances here.",
    ),
    defaultValueJson: null,
    validationJson: {
      kind: "json-schema" as const,
      schemaDialect: "draft-2020-12",
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["from_part_id", "to_part_id", "integration_type", "details"],
        properties: {
          from_part_id: { type: "string", cardinality: "one" },
          to_part_id: { type: "string", cardinality: "one" },
          integration_type: { type: "string", cardinality: "one" },
          details: { type: "string", cardinality: "one" },
        },
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
    "five_whys_deep_dive",
    "architecture_decision_records",
    "self_consistency_validation",
    "first_principles_analysis",
    "socratic_questioning",
    "critique_and_refine",
    "tree_of_thoughts",
    "graph_of_thoughts",
    "meta_prompting_analysis",
    "stakeholder_round_table",
  ] as const,
  sourceRefs,
} as const;

export const researchSeedMetadata = {
  methodologyDefinitionId,
  methodologyVersionIds,
  slice: "slice_a_research",
  workUnitKeys: ["research"] as const,
  workflowKeys: ["market_research", "domain_research", "technical_research"] as const,
  sourceRefs: ["docs/plans/2026-03-20-story-3-2-l2-implementation-plan.md"],
} as const;
