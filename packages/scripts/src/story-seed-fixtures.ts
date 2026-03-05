import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Data, Effect } from "effect";

export type StorySeedId = "2-1" | "2-2" | "2-5" | "2-6";

export type StorySeedUser = {
  readonly name: string;
  readonly email: string;
  readonly password: string;
};

export type StorySeedMethodologyDefinition = {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly descriptionJson: Record<string, unknown>;
};

export type StorySeedMethodologyVersion = {
  readonly id: string;
  readonly methodologyId: string;
  readonly version: string;
  readonly status: "draft" | "active" | "retired";
  readonly displayName: string;
  readonly definitionExtensions: Record<string, unknown>;
  readonly retiredAt: Date | null;
};

export type StorySeedPlan = {
  readonly storyId: StorySeedId;
  readonly users: readonly StorySeedUser[];
  readonly methodologyDefinitions: readonly StorySeedMethodologyDefinition[];
  readonly methodologyVersions: readonly StorySeedMethodologyVersion[];
};

type WorkflowSeedDefinition = {
  readonly key: string;
  readonly displayName?: string;
  readonly ownerWorkUnitRef?: string;
  readonly definitionJson?: {
    readonly steps?: ReadonlyArray<{
      readonly id: string;
      readonly type: string;
      readonly templateRef?: string;
      readonly overrides?: Record<string, unknown>;
    }>;
  };
};

type WorkflowDefinitionsSeedFile = {
  readonly methodologyVersionKey: string;
  readonly workflows: readonly WorkflowSeedDefinition[];
};

type TransitionAllowedBinding = {
  readonly workUnitRef: string;
  readonly fromState: string;
  readonly toState: string;
  readonly allowed: ReadonlyArray<{
    readonly workflowKey: string;
  }>;
};

type TransitionAllowedSeedFile = {
  readonly bindings: readonly TransitionAllowedBinding[];
};

const CARDINALITY_BY_WORK_UNIT: Record<string, "one_per_project" | "many_per_project"> = {
  "WU.SETUP": "one_per_project",
  "WU.PRODUCT_BRIEF": "one_per_project",
  "WU.PRD": "one_per_project",
  "WU.UX_DESIGN": "one_per_project",
  "WU.ARCHITECTURE": "one_per_project",
  "WU.BACKLOG": "one_per_project",
  "WU.IMPLEMENTATION_READINESS": "one_per_project",
  "WU.PROJECT_CONTEXT": "one_per_project",
  "WU.TEST_FRAMEWORK": "one_per_project",
  "WU.TEST_ARCHITECTURE": "one_per_project",
  "WU.CI_QUALITY": "one_per_project",
  "WU.BRAINSTORMING": "many_per_project",
  "WU.FACILITATION_SESSION": "many_per_project",
  "WU.RESEARCH": "many_per_project",
  "WU.STORY": "many_per_project",
  "WU.CHANGE_PROPOSAL": "many_per_project",
  "WU.RETROSPECTIVE": "many_per_project",
  "WU.SPRINT_PLAN": "many_per_project",
  "WU.TECH_SPEC": "many_per_project",
  "WU.TEST_AUTOMATION": "many_per_project",
  "WU.TEST_DESIGN": "many_per_project",
  "WU.TEST_REVIEW": "many_per_project",
  "WU.TEST_TRACEABILITY": "many_per_project",
  "WU.NFR_ASSESSMENT": "many_per_project",
  "WU.DESIGN_FACILITATION": "many_per_project",
  "WU.STRATEGY_FACILITATION": "many_per_project",
  "WU.PROBLEM_SOLVING": "many_per_project",
  "WU.STORYTELLING": "many_per_project",
  "WU.LEARNING_TRACK": "many_per_project",
};

const moduleDir = dirname(fileURLToPath(import.meta.url));
const planningArtifactsDir = resolve(moduleDir, "../../../_bmad-output/planning-artifacts");

const workflowDefinitionsSeed = JSON.parse(
  readFileSync(resolve(planningArtifactsDir, "chiron-seed-workflow-definitions-v1.json"), "utf8"),
) as WorkflowDefinitionsSeedFile;

const transitionAllowedSeed = JSON.parse(
  readFileSync(
    resolve(planningArtifactsDir, "chiron-seed-transition-allowed-workflows-v1.json"),
    "utf8",
  ),
) as TransitionAllowedSeedFile;

const transitionKeyForBinding = (binding: TransitionAllowedBinding): string =>
  `${binding.workUnitRef}:${binding.fromState}__to__${binding.toState}`;

const buildStory22DefinitionExtensions = (): Record<string, unknown> => {
  const toReadableLabel = (value: string): string =>
    value
      .replace(/^WU\./, "")
      .replace(/__+/g, " ")
      .replace(/[._:]+/g, " ")
      .toLowerCase()
      .split(" ")
      .filter(Boolean)
      .join(" ");

  const workflows = workflowDefinitionsSeed.workflows.map((workflow) => {
    const steps = (workflow.definitionJson?.steps ?? []).map((step) => ({
      key: step.id,
      type: step.type,
      displayName: step.id,
      config: {
        templateRef: step.templateRef ?? null,
        overrides: step.overrides ?? null,
      },
    }));

    const edges = steps.map((step, index) => ({
      fromStepKey: index === 0 ? null : (steps[index - 1]?.key ?? null),
      toStepKey: step.key,
      edgeKey:
        index === 0 ? `entry-${step.key}` : `${steps[index - 1]?.key ?? "prev"}__${step.key}`,
    }));

    return {
      key: workflow.key,
      displayName: workflow.displayName ?? workflow.key,
      workUnitTypeKey: workflow.ownerWorkUnitRef ?? null,
      steps,
      edges,
    };
  });

  const transitionWorkflowBindings = Object.fromEntries(
    transitionAllowedSeed.bindings.map((binding) => [
      transitionKeyForBinding(binding),
      binding.allowed.map((allowed) => allowed.workflowKey).sort(),
    ]),
  );

  const agentTypeKeys = [
    ...new Set(
      workflowDefinitionsSeed.workflows.flatMap((workflow) =>
        (workflow.definitionJson?.steps ?? [])
          .map((step) => step.overrides?.agentId)
          .filter(
            (agentId): agentId is string => typeof agentId === "string" && agentId.length > 0,
          ),
      ),
    ),
  ].sort((a, b) => a.localeCompare(b));

  const workUnitTypes = Object.entries(CARDINALITY_BY_WORK_UNIT)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([workUnitRef, cardinality]) => {
      const bindings = transitionAllowedSeed.bindings.filter(
        (binding) => binding.workUnitRef === workUnitRef,
      );

      const lifecycleStates = new Set<string>();
      for (const binding of bindings) {
        if (binding.fromState !== "__absent__") {
          lifecycleStates.add(binding.fromState);
        }
        lifecycleStates.add(binding.toState);
      }

      return {
        key: workUnitRef,
        displayName: workUnitRef,
        cardinality,
        lifecycleStates: [...lifecycleStates].sort().map((state) => ({ key: state })),
        lifecycleTransitions: bindings.map((binding) => ({
          transitionKey: transitionKeyForBinding(binding),
          toState: binding.toState,
          gateClass:
            binding.fromState === "__absent__"
              ? "start_gate"
              : binding.toState === "done"
                ? "completion_gate"
                : "state_gate",
          requiredLinks: [],
        })),
        factSchemas:
          workUnitRef === "WU.SETUP"
            ? [
                {
                  key: "projectType",
                  factType: "string",
                  required: true,
                  defaultValue: "greenfield",
                  description:
                    "Project classification used to choose setup guidance and workflow path.",
                  guidance:
                    "Set to greenfield, migration, or maintenance so setup behavior is deterministic.",
                },
                {
                  key: "deliveryMode",
                  factType: "string",
                  required: true,
                  defaultValue: "iterative",
                  description:
                    "Delivery cadence used by setup and handoff workflows in project context.",
                  guidance:
                    "Use iterative for staged rollout; use fixed for a single locked delivery pass.",
                },
              ]
            : [],
      };
    });

  const transitions = transitionAllowedSeed.bindings.map((binding) => ({
    key: transitionKeyForBinding(binding),
    workUnitTypeKey: binding.workUnitRef,
    fromState: binding.fromState,
    toState: binding.toState,
    gateClass:
      binding.fromState === "__absent__"
        ? "start_gate"
        : binding.toState === "done"
          ? "completion_gate"
          : "state_gate",
    requiredLinks: [],
    displayName: `${binding.workUnitRef} ${binding.fromState} -> ${binding.toState}`,
  }));

  const guidanceByWorkUnitType = Object.fromEntries(
    workUnitTypes.map((workUnitType) => {
      const bindings = transitionAllowedSeed.bindings.filter(
        (binding) => binding.workUnitRef === workUnitType.key,
      );
      const startTargets = bindings
        .filter((binding) => binding.fromState === "__absent__")
        .map((binding) => binding.toState)
        .sort();
      const completionTargets = [...new Set(bindings.map((binding) => binding.toState))].sort();
      const relatedWorkflows = workflows
        .filter((workflow) => workflow.workUnitTypeKey === workUnitType.key)
        .map((workflow) => workflow.key)
        .sort();

      const guidance = [
        `Scope: ${toReadableLabel(workUnitType.key)}.`,
        startTargets.length > 0
          ? `Entry path: move from absent to ${startTargets.join(", ")} when this track starts.`
          : "Entry path: no start transition is currently defined.",
        `Observed target states: ${completionTargets.join(", ") || "none"}.`,
        relatedWorkflows.length > 0
          ? `Primary workflows: ${relatedWorkflows.join(", ")}.`
          : "Primary workflows: none currently bound.",
      ].join(" ");

      return [workUnitType.key, guidance];
    }),
  );

  const guidanceByTransition = Object.fromEntries(
    transitionAllowedSeed.bindings.map((binding) => {
      const transitionKey = transitionKeyForBinding(binding);
      const allowedWorkflowKeys = binding.allowed.map((allowed) => allowed.workflowKey).sort();
      const fromDescription =
        binding.fromState === "__absent__"
          ? "when no instance state exists yet"
          : `when current state is ${binding.fromState}`;

      return [
        transitionKey,
        [
          `Use this transition ${fromDescription}.`,
          `Outcome: ${binding.workUnitRef} moves to ${binding.toState}.`,
          allowedWorkflowKeys.length > 0
            ? `Preferred workflows: ${allowedWorkflowKeys.join(", ")}.`
            : "Preferred workflows: none currently bound.",
        ].join(" "),
      ];
    }),
  );

  const guidanceByWorkflow = Object.fromEntries(
    workflowDefinitionsSeed.workflows.map((workflow) => {
      const owner = workflow.ownerWorkUnitRef ?? "unscoped";
      const usedByTransitions = transitionAllowedSeed.bindings
        .filter((binding) =>
          binding.allowed.some((allowed) => allowed.workflowKey === workflow.key),
        )
        .map((binding) => transitionKeyForBinding(binding))
        .sort();

      return [
        workflow.key,
        [
          `Workflow scope: ${toReadableLabel(owner)}.`,
          usedByTransitions.length > 0
            ? `Used by transitions: ${usedByTransitions.join(", ")}.`
            : "Used by transitions: none currently declared.",
          "Use this workflow to capture deterministic evidence before state progression.",
        ].join(" "),
      ];
    }),
  );

  const guidanceByAgentType = Object.fromEntries(
    agentTypeKeys.map((agentTypeKey) => {
      const workflowUsage = workflowDefinitionsSeed.workflows
        .map((workflow) => {
          const matchingSteps = (workflow.definitionJson?.steps ?? []).filter(
            (step) => step.overrides?.agentId === agentTypeKey,
          );

          if (matchingSteps.length === 0) {
            return null;
          }

          return {
            workflowKey: workflow.key,
            workUnitTypeKey: workflow.ownerWorkUnitRef ?? "unscoped",
            stepTypes: [...new Set(matchingSteps.map((step) => step.type))],
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

      const workflowKeys = workflowUsage.map((entry) => entry.workflowKey).sort();
      const workUnitKeys = [...new Set(workflowUsage.map((entry) => entry.workUnitTypeKey))].sort();
      const stepTypes = [...new Set(workflowUsage.flatMap((entry) => entry.stepTypes))].sort();

      const tags = [
        ...workUnitKeys.map((key) => toReadableLabel(key).replaceAll(" ", "-")),
        ...stepTypes,
      ].slice(0, 6);

      return [
        agentTypeKey,
        {
          role: agentTypeKey,
          purpose:
            workUnitKeys.length > 0
              ? `Primary scope: ${workUnitKeys.map((key) => toReadableLabel(key)).join(", ")}.`
              : "Primary scope: unscoped methodology support.",
          whenToUse:
            workflowKeys.length > 0
              ? `Use when executing ${workflowKeys.slice(0, 4).join(", ")} with deterministic evidence capture.`
              : "Use for methodology guidance where no explicit workflow binding exists.",
          tags,
          workflows: workflowKeys,
        },
      ];
    }),
  );

  return {
    workUnitTypes,
    agentTypes: agentTypeKeys.map((key) => ({ key, displayName: key })),
    transitions,
    workflows,
    transitionWorkflowBindings,
    guidance: {
      global: `Canonical ${workflowDefinitionsSeed.methodologyVersionKey} seed for Story 2.2`,
      byWorkUnitType: guidanceByWorkUnitType,
      byAgentType: guidanceByAgentType,
      byTransition: guidanceByTransition,
      byWorkflow: guidanceByWorkflow,
    },
    factDefinitions: [
      {
        key: "projectRepo",
        factType: "string",
        required: true,
        defaultValue: "github.com/chiron/sample-repo",
        description: "Primary repository path used by agent prompts and tool invocations.",
        guidance:
          "Set to the canonical repository identifier for this project so templates and execution prompts resolve correctly.",
      },
    ],
  };
};

const STORY_2_1_PLAN: StorySeedPlan = {
  storyId: "2-1",
  users: [
    {
      name: "Chiron Operator",
      email: "operator@chiron.local",
      password: "chiron-operator-123",
    },
  ],
  methodologyDefinitions: [
    {
      id: "mdef_story_2_1_alpha",
      key: "story-2-1-alpha",
      name: "Story 2.1 Alpha",
      descriptionJson: {
        summary: "Seeded methodology for Story 2.1 deterministic catalog coverage.",
      },
    },
    {
      id: "mdef_story_2_1_beta",
      key: "story-2-1-beta",
      name: "Story 2.1 Beta",
      descriptionJson: {
        summary: "Seeded methodology with draft flow for details and versions route testing.",
      },
    },
    {
      id: "mdef_story_2_1_gamma",
      key: "story-2-1-gamma",
      name: "Story 2.1 Gamma",
      descriptionJson: {
        summary: "Seeded methodology with no versions to verify empty-version semantics.",
      },
    },
  ],
  methodologyVersions: [
    {
      id: "mver_story_2_1_alpha_v1",
      methodologyId: "mdef_story_2_1_alpha",
      version: "v1",
      status: "active",
      displayName: "Story 2.1 Alpha v1",
      definitionExtensions: {},
      retiredAt: null,
    },
    {
      id: "mver_story_2_1_alpha_v2",
      methodologyId: "mdef_story_2_1_alpha",
      version: "v2",
      status: "draft",
      displayName: "Story 2.1 Alpha v2 Draft",
      definitionExtensions: {},
      retiredAt: null,
    },
    {
      id: "mver_story_2_1_beta_v1",
      methodologyId: "mdef_story_2_1_beta",
      version: "v1",
      status: "active",
      displayName: "Story 2.1 Beta v1",
      definitionExtensions: {},
      retiredAt: null,
    },
  ],
};

const STORY_2_2_PLAN: StorySeedPlan = {
  storyId: "2-2",
  users: [
    {
      name: "Chiron Operator",
      email: "operator@chiron.local",
      password: "chiron-operator-123",
    },
  ],
  methodologyDefinitions: [
    {
      id: "mdef_story_2_2_bmad_v1",
      key: "bmad.v1",
      name: "BMAD v1",
      descriptionJson: {
        summary: "Canonical BMAD methodology seed for Story 2.2 React Flow authoring scenarios.",
      },
    },
  ],
  methodologyVersions: [
    {
      id: "mver_story_2_2_bmad_v1_draft",
      methodologyId: "mdef_story_2_2_bmad_v1",
      version: "v1-draft",
      status: "draft",
      displayName: "BMAD v1 Draft",
      definitionExtensions: buildStory22DefinitionExtensions(),
      retiredAt: null,
    },
  ],
};

const STORY_2_5_PLAN: StorySeedPlan = {
  storyId: "2-5",
  users: [
    {
      name: "Chiron Operator",
      email: "operator@chiron.local",
      password: "chiron-operator-123",
    },
  ],
  methodologyDefinitions: [
    {
      id: "mdef_story_2_5_bmad_v1",
      key: "bmad.v1",
      name: "BMAD v1",
      descriptionJson: {
        summary: "Seeded canonical operator methodology for Story 2.5 project creation UX.",
      },
    },
    {
      id: "mdef_story_2_5_spiral_v1",
      key: "spiral.v1",
      name: "Spiral v1",
      descriptionJson: {
        summary:
          "Alternative methodology with multiple published versions for pin selection testing.",
      },
    },
    {
      id: "mdef_story_2_5_lean_v1",
      key: "lean.v1",
      name: "Lean Canvas",
      descriptionJson: {
        summary:
          "Methodology with no published versions to validate blocked create and guidance UX.",
      },
    },
  ],
  methodologyVersions: [
    {
      id: "mver_story_2_5_bmad_v100",
      methodologyId: "mdef_story_2_5_bmad_v1",
      version: "1.0.0",
      status: "active",
      displayName: "BMAD v1.0.0",
      definitionExtensions: buildStory22DefinitionExtensions(),
      retiredAt: null,
    },
    {
      id: "mver_story_2_5_bmad_v110",
      methodologyId: "mdef_story_2_5_bmad_v1",
      version: "1.1.0",
      status: "active",
      displayName: "BMAD v1.1.0",
      definitionExtensions: buildStory22DefinitionExtensions(),
      retiredAt: null,
    },
    {
      id: "mver_story_2_5_spiral_v090",
      methodologyId: "mdef_story_2_5_spiral_v1",
      version: "0.9.0",
      status: "active",
      displayName: "Spiral v0.9.0",
      definitionExtensions: {},
      retiredAt: null,
    },
    {
      id: "mver_story_2_5_spiral_v100",
      methodologyId: "mdef_story_2_5_spiral_v1",
      version: "1.0.0",
      status: "active",
      displayName: "Spiral v1.0.0",
      definitionExtensions: {},
      retiredAt: null,
    },
    {
      id: "mver_story_2_5_bmad_v200_draft",
      methodologyId: "mdef_story_2_5_bmad_v1",
      version: "2.0.0-draft",
      status: "draft",
      displayName: "BMAD v2.0.0 Draft",
      definitionExtensions: buildStory22DefinitionExtensions(),
      retiredAt: null,
    },
  ],
};

const STORY_2_6_PLAN: StorySeedPlan = {
  ...STORY_2_5_PLAN,
  storyId: "2-6",
};

const storySeedPlans: Record<StorySeedId, StorySeedPlan> = {
  "2-1": STORY_2_1_PLAN,
  "2-2": STORY_2_2_PLAN,
  "2-5": STORY_2_5_PLAN,
  "2-6": STORY_2_6_PLAN,
};

export const availableStorySeedIds = Object.keys(storySeedPlans) as StorySeedId[];

export class StorySeedNotFoundError extends Data.TaggedError("StorySeedNotFoundError")<{
  readonly storyId: string;
  readonly availableStorySeedIds: readonly StorySeedId[];
}> {}

export const formatStorySeedNotFoundError = (error: StorySeedNotFoundError): string =>
  `Unknown story seed '${error.storyId}'. Available story seeds: ${error.availableStorySeedIds.join(", ")}`;

export const getStorySeedPlan = (
  storyId: string,
): Effect.Effect<StorySeedPlan, StorySeedNotFoundError> => {
  if (storyId in storySeedPlans) {
    return Effect.succeed(storySeedPlans[storyId as StorySeedId]);
  }

  return Effect.fail(
    new StorySeedNotFoundError({
      storyId,
      availableStorySeedIds,
    }),
  );
};
