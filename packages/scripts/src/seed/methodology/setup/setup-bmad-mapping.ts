import { Schema } from "effect";

import { schema } from "@chiron/db";

const SetupStepSchema = Schema.Struct({
  id: Schema.String,
  type: Schema.Literal("form", "branch", "agent", "invoke", "action", "display"),
  displayName: Schema.String,
  configJson: Schema.Unknown,
  guidanceJson: Schema.NullOr(Schema.Unknown),
});

const SetupMappingSchema = Schema.Struct({
  methodologyVersionId: Schema.String,
  workUnit: Schema.Struct({
    key: Schema.Literal("WU.PROJECT_CONTEXT"),
    displayName: Schema.String,
    cardinality: Schema.Literal("one_per_project"),
  }),
  transition: Schema.Struct({
    fromState: Schema.Literal("__absent__"),
    toState: Schema.Literal("done"),
    gateClass: Schema.Literal("start_gate"),
  }),
  workflows: Schema.Array(
    Schema.Struct({
      key: Schema.Literal("document-project", "generate-project-context"),
      displayName: Schema.String,
      metadataJson: Schema.Unknown,
      guidanceJson: Schema.NullOr(Schema.Unknown),
      inputContractJson: Schema.Unknown,
      outputContractJson: Schema.Unknown,
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

function toGuidanceJson(value: unknown, fallbackAgentMarkdown?: string) {
  if (value && typeof value === "object") {
    return value;
  }

  const markdown = typeof value === "string" ? value : "";
  return {
    human: { markdown },
    agent: { markdown: fallbackAgentMarkdown ?? markdown },
  };
}

const rawSetupMapping = {
  methodologyVersionId: "mver_bmad_project_context_only_draft",
  workUnit: {
    key: "WU.PROJECT_CONTEXT",
    displayName: "Project Context",
    cardinality: "one_per_project",
  },
  transition: {
    fromState: "__absent__",
    toState: "done",
    gateClass: "start_gate",
  },
  workflows: [
    {
      key: "document-project",
      displayName: "Document Project",
      metadataJson: {
        module: "bmm",
        category: "project-context",
        workflowFamily: "discovery",
      },
      guidanceJson:
        "Discovery workflow for establishing project context baseline. Greenfield and brownfield flows are both represented in the canonical seed.",
      inputContractJson: {
        kind: "workflow-io.v1",
        inputs: [],
      },
      outputContractJson: {
        kind: "workflow-io.v1",
        outputs: [
          {
            factKey: "projectType",
            displayName: "Selected Project Type",
            validation: { rules: [] },
          },
          {
            factKey: "projectRootPath",
            displayName: "Selected Project Root Path",
            validation: { rules: [] },
          },
          {
            factKey: "projectKnowledgePath",
            displayName: "Selected Project Knowledge Path",
            validation: { rules: [] },
          },
          {
            factKey: "needsContextGeneration",
            displayName: "Needs Context Generation",
            validation: { rules: [] },
          },
          {
            factKey: "summaryStatus",
            displayName: "Summary Status",
            validation: { rules: [] },
          },
        ],
      },
      steps: [
        {
          id: "intake.capture",
          type: "form",
          displayName: "Capture Project Context Intake",
          configJson: {
            stepConfigVersion: 1,
            contract: "form.v1",
            mode: "edit",
            autosave: true,
            fields: [
              {
                id: "projectType",
                type: "select",
                label: "Project Type",
                required: true,
                options: [
                  { value: "greenfield", label: "Greenfield" },
                  { value: "brownfield", label: "Brownfield" },
                ],
              },
            ],
            outputVariables: ["facts.projectType"],
          },
          guidanceJson:
            "First-step intake for both greenfield and brownfield flows. Captures routing intent only.",
        },
        {
          id: "projectType.route",
          type: "branch",
          displayName: "Route by Project Type",
          configJson: {
            stepConfigVersion: 1,
            contract: "branch.v1",
            routeVariable: "facts.projectType",
            branches: [
              {
                when: { op: "equals", var: "facts.projectType", value: "greenfield" },
                next: { stepId: "greenfield.discovery.agent" },
              },
              {
                when: { op: "equals", var: "facts.projectType", value: "brownfield" },
                next: { stepId: "brownfield.paths.capture" },
              },
            ],
            defaultNext: { stepId: "intake.capture" },
          },
          guidanceJson: "Deterministic branch into greenfield or brownfield step chain.",
        },
        {
          id: "greenfield.discovery.agent",
          type: "agent",
          displayName: "Greenfield Discovery",
          configJson: {
            stepConfigVersion: 1,
            contract: "agent.v1",
            agentKind: "chiron",
            agentId: "project-context-analyst",
            tools: [
              {
                name: "set_project_description",
                toolType: "update-variable",
                targetVariable: "facts.projectDescription",
              },
              {
                name: "set_delivery_mode",
                toolType: "ax-generate",
                targetVariable: "facts.deliveryMode",
                requiredVariables: ["facts.projectDescription"],
              },
              {
                name: "set_discovery_summary",
                toolType: "update-variable",
                targetVariable: "context.discoverySummary",
                requiredVariables: ["facts.projectDescription", "facts.deliveryMode"],
              },
            ],
            completionConditions: [
              {
                type: "all-variables-set",
                requiredVariables: ["facts.projectDescription", "facts.deliveryMode"],
              },
            ],
          },
          guidanceJson: "Collect greenfield discovery facts and bootstrap strategy signals.",
        },
        {
          id: "greenfield.paths.capture",
          type: "form",
          displayName: "Capture Greenfield Paths",
          configJson: {
            stepConfigVersion: 1,
            contract: "form.v1",
            fields: [
              {
                id: "projectRootPath",
                required: true,
                validationJson: {
                  rules: [
                    {
                      kind: "path",
                      path: {
                        pathKind: "directory",
                        normalization: { mode: "posix", trimWhitespace: true },
                        safety: { disallowAbsolute: false, preventTraversal: true },
                      },
                    },
                  ],
                },
              },
              {
                id: "projectKnowledgePath",
                required: true,
                validationJson: {
                  rules: [
                    {
                      kind: "path",
                      path: {
                        pathKind: "directory",
                        normalization: { mode: "posix", trimWhitespace: true },
                        safety: { disallowAbsolute: true, preventTraversal: true },
                      },
                    },
                    { kind: "under-root", underRoot: { rootFactKey: "projectRootPath" } },
                  ],
                },
              },
            ],
            outputVariables: ["facts.projectRootPath", "facts.projectKnowledgePath"],
          },
          guidanceJson: "Capture/validate root and knowledge paths for greenfield bootstrap.",
        },
        {
          id: "greenfield.bootstrap.action",
          type: "action",
          displayName: "Persist Greenfield Bootstrap",
          configJson: {
            stepConfigVersion: 1,
            contract: "action.v1",
            executionMode: "sequential",
            actions: [
              {
                id: "git.ensure.init",
                kind: "git",
                operation: "init-if-missing",
                outputVariable: "context.gitInitStatus",
              },
              {
                id: "bootstrap.render",
                kind: "variable",
                operation: "set",
                outputVariable: "context.bootstrapPayload",
              },
              {
                id: "bootstrap.snapshot.upsert",
                kind: "artifact",
                operation: "snapshot-upsert",
                params: {
                  artifactSlotKey: "project-context-bootstrap",
                  artifactFileName: "project-context-bootstrap.json",
                  contentVariable: "context.bootstrapPayload",
                },
                outputVariable: "context.bootstrapSnapshot",
              },
              {
                id: "bootstrap.commit",
                kind: "git",
                operation: "commit",
                params: {
                  message: "chore(project-context): add bootstrap snapshot artifact",
                  includePaths: ["{{projectKnowledgePath}}/project-context-bootstrap.json"],
                },
                outputVariable: "context.bootstrapCommit",
              },
            ],
          },
          guidanceJson:
            "Initialize git when needed, persist bootstrap snapshot, and commit evidence.",
        },
        {
          id: "greenfield.summary.show",
          type: "display",
          displayName: "Greenfield Bootstrap Summary",
          configJson: {
            stepConfigVersion: 1,
            contract: "display.v1",
            title: "Greenfield Bootstrap Summary",
            tabs: [
              { key: "facts", title: "Facts", content: "<PlateDocument>" },
              { key: "artifact", title: "Bootstrap Artifact", content: "<PlateDocument>" },
            ],
          },
          guidanceJson: "Present captured facts and bootstrap artifact evidence for review.",
        },
        {
          id: "brownfield.paths.capture",
          type: "form",
          displayName: "Capture Brownfield Paths",
          configJson: {
            stepConfigVersion: 1,
            contract: "form.v1",
            fields: [
              {
                id: "projectRootPath",
                validationJson: {
                  rules: [
                    {
                      kind: "path",
                      path: {
                        pathKind: "directory",
                        normalization: { mode: "posix", trimWhitespace: true },
                        safety: { disallowAbsolute: false, preventTraversal: true },
                      },
                    },
                  ],
                },
              },
              {
                id: "projectKnowledgePath",
                validationJson: {
                  rules: [
                    {
                      kind: "path",
                      path: {
                        pathKind: "directory",
                        normalization: { mode: "posix", trimWhitespace: true },
                        safety: { disallowAbsolute: true, preventTraversal: true },
                      },
                    },
                    { kind: "under-root", underRoot: { rootFactKey: "projectRootPath" } },
                  ],
                },
              },
              {
                id: "existingIndexPath",
                required: false,
                validationJson: {
                  rules: [
                    {
                      kind: "path",
                      path: {
                        pathKind: "file",
                        normalization: { mode: "posix", trimWhitespace: true },
                        safety: { disallowAbsolute: true, preventTraversal: true },
                      },
                    },
                    { kind: "under-root", underRoot: { rootFactKey: "projectRootPath" } },
                  ],
                },
              },
            ],
            outputVariables: [
              "facts.projectRootPath",
              "facts.projectKnowledgePath",
              "facts.existingIndexPath",
            ],
          },
          guidanceJson: "Capture and validate path facts needed for existing-project discovery.",
        },
        {
          id: "brownfield.discovery.agent",
          type: "agent",
          displayName: "Brownfield Discovery",
          configJson: {
            stepConfigVersion: 1,
            contract: "agent.v1",
            agentKind: "opencode",
            agentId: "project-context-analyst",
            tools: [
              {
                name: "set_discovery_summary",
                toolType: "update-variable",
                targetVariable: "context.discoverySummary",
                requiredVariables: ["facts.projectRootPath", "facts.projectKnowledgePath"],
              },
              {
                name: "set_needs_context_generation",
                toolType: "ax-generate",
                targetVariable: "runtime.needsContextGeneration",
                requiredVariables: ["context.discoverySummary"],
              },
              {
                name: "set_brownfield_findings",
                toolType: "update-variable",
                targetVariable: "context.brownfieldFindings",
                requiredVariables: ["runtime.needsContextGeneration"],
              },
            ],
            completionConditions: [
              {
                type: "all-variables-set",
                requiredVariables: ["context.discoverySummary", "runtime.needsContextGeneration"],
              },
            ],
          },
          guidanceJson:
            "Discover brownfield context and decide whether context generation must run.",
        },
        {
          id: "brownfield.context.route",
          type: "branch",
          displayName: "Route Brownfield Context Decision",
          configJson: {
            stepConfigVersion: 1,
            contract: "branch.v1",
            routeVariable: "runtime.needsContextGeneration",
            branches: [
              {
                when: { op: "equals", var: "runtime.needsContextGeneration", value: true },
                next: { stepId: "brownfield.context.invoke" },
              },
              {
                when: { op: "equals", var: "runtime.needsContextGeneration", value: false },
                next: { stepId: "brownfield.summary.show" },
              },
            ],
            defaultNext: { stepId: "brownfield.summary.show" },
          },
          guidanceJson:
            "Route to invoke or direct summary using deterministic needs-context-generation flag.",
        },
        {
          id: "brownfield.context.invoke",
          type: "invoke",
          displayName: "Invoke Generate Project Context",
          configJson: {
            stepConfigVersion: 1,
            contract: "invoke.v1",
            bindingMode: "same_work_unit",
            executionMode: "single",
            workflowRef: "generate-project-context",
            waitForCompletion: true,
            onChildError: "fail",
            inputMapping: {
              projectType: "facts.projectType",
              projectRootPath: "facts.projectRootPath",
              projectKnowledgePath: "facts.projectKnowledgePath",
              existingIndexPath: "facts.existingIndexPath",
              discoverySummary: "context.discoverySummary",
            },
            output: { mode: "variables", target: "context.contextGeneration" },
          },
          guidanceJson:
            "Invoke context generation only when brownfield discovery marks it as required.",
        },
        {
          id: "brownfield.summary.show",
          type: "display",
          displayName: "Brownfield Context Summary",
          configJson: {
            stepConfigVersion: 1,
            contract: "display.v1",
            title: "Brownfield Context Summary",
            tabs: [
              { key: "intake", title: "Intake Facts", content: "<PlateDocument>" },
              { key: "discovery", title: "Discovery Findings", content: "<PlateDocument>" },
              { key: "generation", title: "Context Generation Result", content: "<PlateDocument>" },
              { key: "evidence", title: "Artifacts and Evidence", content: "<PlateDocument>" },
            ],
          },
          guidanceJson: "Present brownfield findings, generation decision, and artifact evidence.",
        },
      ],
    },
    {
      key: "generate-project-context",
      displayName: "Generate Project Context",
      metadataJson: {
        module: "bmm",
        category: "project-context",
        workflowFamily: "context-generation",
      },
      guidanceJson:
        "Context-authoring workflow that transforms validated discovery outputs into a deterministic project-context.md artifact.",
      inputContractJson: {
        kind: "workflow-io.v1",
        inputs: [
          {
            factKey: "projectType",
            displayName: "Project Type",
            required: true,
            validation: {
              rules: [{ kind: "allowed-values", values: ["greenfield", "brownfield"] }],
            },
          },
          {
            factKey: "projectRootPath",
            displayName: "Project Root Path",
            required: true,
            validation: {
              rules: [
                {
                  kind: "path",
                  path: {
                    pathKind: "directory",
                    normalization: { mode: "posix", trimWhitespace: true },
                    safety: { disallowAbsolute: false, preventTraversal: true },
                  },
                },
              ],
            },
          },
          {
            factKey: "projectKnowledgePath",
            displayName: "Project Knowledge Path",
            required: true,
            validation: {
              rules: [
                {
                  kind: "path",
                  path: {
                    pathKind: "directory",
                    normalization: { mode: "posix", trimWhitespace: true },
                    safety: { disallowAbsolute: true, preventTraversal: true },
                  },
                },
                { kind: "under-root", underRoot: { rootFactKey: "projectRootPath" } },
              ],
            },
          },
          {
            factKey: "existingIndexPath",
            displayName: "Existing Index Path",
            required: false,
            validation: {
              rules: [
                {
                  kind: "path",
                  path: {
                    pathKind: "file",
                    normalization: { mode: "posix", trimWhitespace: true },
                    safety: { disallowAbsolute: true, preventTraversal: true },
                  },
                },
                { kind: "under-root", underRoot: { rootFactKey: "projectRootPath" } },
              ],
            },
          },
          {
            factKey: "discoverySummary",
            displayName: "Discovery Summary",
            required: true,
            validation: { rules: [] },
          },
        ],
      },
      outputContractJson: {
        kind: "workflow-io.v1",
        outputs: [
          {
            factKey: "outputArtifactPath",
            displayName: "Output Artifact Path",
            validation: { rules: [] },
          },
          {
            factKey: "artifactSnapshotId",
            displayName: "Artifact Snapshot Id",
            validation: { rules: [] },
          },
          {
            factKey: "contextGenerationStatus",
            displayName: "Context Generation Status",
            validation: { rules: [] },
          },
          {
            factKey: "validationResult",
            displayName: "Validation Result",
            validation: { rules: [] },
          },
          {
            factKey: "traceabilityMap",
            displayName: "Traceability Map",
            validation: { rules: [] },
          },
        ],
      },
      steps: [
        {
          id: "inputs.confirm",
          type: "form",
          displayName: "Confirm Generation Inputs",
          configJson: {
            stepConfigVersion: 1,
            contract: "form.v1",
            fields: [
              { id: "projectType", required: true },
              { id: "projectRootPath", required: true },
              { id: "projectKnowledgePath", required: true },
              { id: "existingIndexPath", required: false },
              { id: "discoverySummary", required: true },
            ],
            outputVariables: [
              "facts.projectType",
              "facts.projectRootPath",
              "facts.projectKnowledgePath",
              "facts.existingIndexPath",
              "context.discoverySummary",
            ],
          },
          guidanceJson: "Confirm normalized invoke inputs before generation begins.",
        },
        {
          id: "context.generate",
          type: "agent",
          displayName: "Generate Project Context Content",
          configJson: {
            stepConfigVersion: 1,
            contract: "agent.v1",
            agentKind: "chiron",
            agentId: "project-context-writer",
            tools: [
              {
                name: "write_generated_context",
                toolType: "update-variable",
                targetVariable: "draft.generatedContext",
              },
              {
                name: "write_traceability_map",
                toolType: "update-variable",
                targetVariable: "draft.traceabilityMap",
              },
            ],
            completionConditions: [
              {
                type: "all-variables-set",
                requiredVariables: ["draft.generatedContext", "draft.traceabilityMap"],
              },
            ],
          },
          guidanceJson: "Generate deterministic context content and traceability mapping.",
        },
        {
          id: "artifact.snapshot.save",
          type: "action",
          displayName: "Save Project Context Snapshot",
          configJson: {
            stepConfigVersion: 1,
            contract: "action.v1",
            executionMode: "sequential",
            actions: [
              {
                id: "context.artifact.upsert",
                kind: "artifact",
                operation: "snapshot-upsert",
                params: {
                  artifactSlotKey: "project-context",
                  artifactFileName: "project-context.md",
                  contentVariable: "draft.generatedContext",
                },
                outputVariable: "context.projectContextSnapshot",
              },
              {
                id: "traceability.store",
                kind: "variable",
                operation: "set",
                outputVariable: "context.traceabilityMap",
              },
            ],
          },
          guidanceJson: "Persist generated context artifact and traceability outputs.",
        },
        {
          id: "result.show",
          type: "display",
          displayName: "Show Generation Result",
          configJson: {
            stepConfigVersion: 1,
            contract: "display.v1",
            title: "Finalize Project Context",
            tabs: [
              { key: "artifact", title: "Project Context Artifact", content: "<PlateDocument>" },
              { key: "validation", title: "Validation Result", content: "<PlateDocument>" },
              { key: "traceability", title: "Traceability", content: "<PlateDocument>" },
            ],
          },
          guidanceJson: "Present generated artifact, validation status, and traceability mapping.",
        },
      ],
    },
  ],
  workUnitFactSchemas: [
    {
      key: "projectType",
      name: "Project Type",
      factType: "string",
      required: false,
      defaultValue: "greenfield",
      description: "Project onboarding mode used for context strategy.",
      guidance: "Allowed values: greenfield, brownfield.",
      validation: { rules: [{ kind: "allowed-values", values: ["greenfield", "brownfield"] }] },
    },
    {
      key: "projectRootPath",
      name: "Project Root Path",
      factType: "string",
      required: false,
      defaultValue: ".",
      description: "Root directory of the project being documented.",
      guidance: "Must resolve to a safe directory path.",
      validation: {
        rules: [
          {
            kind: "path",
            path: {
              pathKind: "directory",
              normalization: { mode: "posix", trimWhitespace: true },
              safety: { disallowAbsolute: false, preventTraversal: true },
            },
          },
        ],
      },
    },
    {
      key: "projectKnowledgePath",
      name: "Project Knowledge Path",
      factType: "string",
      required: false,
      defaultValue: "{{project_knowledge_path}}",
      description: "Output folder for generated docs/state files.",
      guidance: "Must resolve under projectRootPath.",
      validation: {
        rules: [
          {
            kind: "path",
            path: {
              pathKind: "directory",
              normalization: { mode: "posix", trimWhitespace: true },
              safety: { disallowAbsolute: true, preventTraversal: true },
            },
          },
          { kind: "under-root", underRoot: { rootFactKey: "projectRootPath" } },
        ],
      },
    },
    {
      key: "existingIndexPath",
      name: "Existing Index Path",
      factType: "string",
      required: false,
      defaultValue: "{{project_knowledge_path}}/index.md",
      description: "Existing index location for deep-dive mode.",
      guidance: "Must resolve under projectRootPath.",
      validation: {
        rules: [
          {
            kind: "path",
            path: {
              pathKind: "file",
              normalization: { mode: "posix", trimWhitespace: true },
              safety: { disallowAbsolute: true, preventTraversal: true },
            },
          },
          { kind: "under-root", underRoot: { rootFactKey: "projectRootPath" } },
        ],
      },
    },
  ],
} as const;

const setupMapping = Schema.decodeUnknownSync(SetupMappingSchema)(rawSetupMapping);

const workUnitTypeId = "seed:wut:wu.project_context";
const doneStateId = "seed:state:wu.project_context:done";
const setupTransitionId = "seed:transition:wu.project_context:absent_done";
const workflowIdFor = (workflowKey: string) => `seed:wf:${workflowKey}`;
const workflowStepIdFor = (workflowKey: string, stepId: string) =>
  `seed:wf-step:${workflowKey}:${stepId}`;

export type MethodologyWorkUnitTypeSeedRow = typeof schema.methodologyWorkUnitTypes.$inferInsert;
export type MethodologyAgentTypeSeedRow = typeof schema.methodologyAgentTypes.$inferInsert;
export type MethodologyLifecycleStateSeedRow =
  typeof schema.methodologyLifecycleStates.$inferInsert;
export type MethodologyLifecycleTransitionSeedRow =
  typeof schema.methodologyLifecycleTransitions.$inferInsert;
export type MethodologyTransitionConditionSetSeedRow =
  typeof schema.methodologyTransitionConditionSets.$inferInsert;
export type MethodologyFactSchemaSeedRow = typeof schema.methodologyFactSchemas.$inferInsert;
export type MethodologyFactDefinitionSeedRow =
  typeof schema.methodologyFactDefinitions.$inferInsert;
export type MethodologyWorkflowSeedRow = typeof schema.methodologyWorkflows.$inferInsert;
export type MethodologyWorkflowStepSeedRow = typeof schema.methodologyWorkflowSteps.$inferInsert;
export type MethodologyWorkflowEdgeSeedRow = typeof schema.methodologyWorkflowEdges.$inferInsert;
export type MethodologyTransitionWorkflowBindingSeedRow =
  typeof schema.methodologyTransitionWorkflowBindings.$inferInsert;

function toDescriptionJson(markdown: string, fallbackAgentMarkdown?: string) {
  return {
    human: { markdown },
    agent: { markdown: fallbackAgentMarkdown ?? markdown },
  };
}

export const setupWorkUnitTypeSeedRows: readonly MethodologyWorkUnitTypeSeedRow[] = [
  {
    id: workUnitTypeId,
    methodologyVersionId: setupMapping.methodologyVersionId,
    key: setupMapping.workUnit.key,
    displayName: setupMapping.workUnit.displayName,
    cardinality: setupMapping.workUnit.cardinality,
    guidanceJson: toGuidanceJson(
      "## Purpose\nPrimary onboarding and context-curation work unit for project-context flows.",
      "Use WU.PROJECT_CONTEXT as the canonical work unit boundary for onboarding context collection and generation.",
    ),
    descriptionJson: null,
  },
];

export const setupAgentTypeSeedRows: readonly MethodologyAgentTypeSeedRow[] = [
  {
    id: "seed:agent:project-context-analyst",
    methodologyVersionId: setupMapping.methodologyVersionId,
    key: "project-context-analyst",
    displayName: "Mimir",
    description: "Business Analyst",
    persona: "Strategic Business Analyst + Requirements Expert",
    defaultModelJson: null,
    mcpServersJson: null,
    capabilitiesJson: ["requirements elicitation", "domain expertise", "discovery facilitation"],
    promptTemplateJson: {
      content: "You are Mimir, the Project Context Analyst for Chiron.",
      variables: ["workflow_key", "step_key", "work_unit_key", "transition_key"],
    },
    promptTemplateVersion: 1,
    guidanceJson: toGuidanceJson(
      "## Purpose\nAnalyze project context and discovery inputs for WU.PROJECT_CONTEXT.",
      "Focus on discovery findings, project facts, and transition constraints for project-context onboarding.",
    ),
  },
  {
    id: "seed:agent:project-context-writer",
    methodologyVersionId: setupMapping.methodologyVersionId,
    key: "project-context-writer",
    displayName: "Thoth",
    description: "Technical Writer",
    persona: "Technical Documentation Specialist + Knowledge Curator",
    defaultModelJson: null,
    mcpServersJson: null,
    capabilitiesJson: ["documentation", "standards compliance", "concept explanation"],
    promptTemplateJson: {
      content: "You are Thoth, the Project Context Documentation Specialist for Chiron.",
      variables: ["workflow_key", "step_key", "work_unit_key", "transition_key"],
    },
    promptTemplateVersion: 1,
    guidanceJson: toGuidanceJson(
      "## Purpose\nProduce deterministic project-context artifacts and documentation.",
      "Convert validated findings into durable project-context outputs and traceability notes.",
    ),
  },
];

export const setupLifecycleStateSeedRows: readonly MethodologyLifecycleStateSeedRow[] = [
  {
    id: doneStateId,
    methodologyVersionId: setupMapping.methodologyVersionId,
    workUnitTypeId,
    key: setupMapping.transition.toState,
    displayName: "Done",
    descriptionJson: toDescriptionJson(
      "Context artifacts generated, validated, and ready for downstream use.",
      "Treat this state as the terminal project-context readiness marker for the onboarding slice.",
    ),
    guidanceJson: toGuidanceJson(
      "## Purpose\nRepresents a completed and validated project-context work unit.",
      "Use this state once the required facts, workflow outcomes, and project-context artifact are all present.",
    ),
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
    guidanceJson: toGuidanceJson(
      "## Purpose\nSingle canonical onboarding transition for WU.PROJECT_CONTEXT.",
      "Treat __absent__->done as the only lifecycle transition for this slice and evaluate completion through condition sets.",
    ),
  },
];

export const setupTransitionConditionSetSeedRows: readonly MethodologyTransitionConditionSetSeedRow[] =
  [
    {
      id: "seed:condition-set:wu.project_context:absent_done:start",
      methodologyVersionId: setupMapping.methodologyVersionId,
      transitionId: setupTransitionId,
      key: "gate.activate.wu.project_context",
      phase: "start",
      mode: "all",
      groupsJson: [
        {
          key: "transition-routing",
          mode: "all",
          conditions: [
            {
              kind: "transition.workflowBinding.present",
              required: true,
              config: {
                workUnitTypeKey: "WU.PROJECT_CONTEXT",
                transitionKey: "__absent__->done",
              },
            },
          ],
        },
      ],
      guidanceJson: toGuidanceJson(
        "## Purpose\nActivation gate for project-context onboarding.",
        "Require at least one workflow binding for the canonical __absent__->done transition before execution starts.",
      ),
    },
    {
      id: "seed:condition-set:wu.project_context:absent_done:completion",
      methodologyVersionId: setupMapping.methodologyVersionId,
      transitionId: setupTransitionId,
      key: "gate.complete.wu.project_context",
      phase: "completion",
      mode: "all",
      groupsJson: [
        {
          key: "workflow-completion",
          mode: "all",
          conditions: [
            {
              kind: "workflow.run.succeeded",
              required: true,
              config: { workflowKey: "document-project" },
            },
          ],
        },
        {
          key: "required-facts",
          mode: "all",
          conditions: [
            {
              kind: "facts.present",
              required: true,
              config: {
                keys: ["projectType", "projectRootPath", "projectKnowledgePath"],
              },
            },
          ],
        },
        {
          key: "required-artifacts",
          mode: "all",
          conditions: [
            {
              kind: "artifact.present",
              required: true,
              config: { artifactKey: "project-context.md" },
            },
          ],
        },
      ],
      guidanceJson: toGuidanceJson(
        "## Purpose\nCompletion gate for project-context onboarding.",
        "Require successful document-project execution plus required facts and the project-context artifact before transition completion.",
      ),
    },
  ];

export const setupFactSchemaSeedRows: readonly MethodologyFactSchemaSeedRow[] =
  setupMapping.workUnitFactSchemas.map((fact) => ({
    id: `seed:fact-schema:wu.project_context:${fact.key}`,
    methodologyVersionId: setupMapping.methodologyVersionId,
    workUnitTypeId,
    name: fact.name,
    key: fact.key,
    factType: fact.factType,
    required: fact.required,
    description: fact.description,
    defaultValueJson: fact.defaultValue,
    guidanceJson: toGuidanceJson(fact.guidance),
    validationJson: fact.validation,
  }));

export const setupFactDefinitionSeedRows: readonly MethodologyFactDefinitionSeedRow[] = [
  {
    id: "seed:fact-def:communicationLanguage",
    methodologyVersionId: setupMapping.methodologyVersionId,
    name: "Communication Language",
    key: "communicationLanguage",
    valueType: "string",
    required: false,
    descriptionJson: toDescriptionJson("Language used for agent responses."),
    guidanceJson: toGuidanceJson(
      "Loaded from runtime communication context.",
      "Use the active communication-language runtime context when materializing this methodology-level default.",
    ),
    defaultValueJson: "{{communication_language}}",
    validationJson: { rules: [] },
  },
  {
    id: "seed:fact-def:documentOutputLanguage",
    methodologyVersionId: setupMapping.methodologyVersionId,
    name: "Document Output Language",
    key: "documentOutputLanguage",
    valueType: "string",
    required: false,
    descriptionJson: toDescriptionJson("Language used for generated documentation."),
    guidanceJson: toGuidanceJson(
      "Pulled from document output policy before workflow execution.",
      "Use the current document-output policy when materializing this methodology-level default.",
    ),
    defaultValueJson: "{{document_output_language}}",
    validationJson: { rules: [] },
  },
  {
    id: "seed:fact-def:outputFile",
    methodologyVersionId: setupMapping.methodologyVersionId,
    name: "Output File",
    key: "outputFile",
    valueType: "string",
    required: false,
    descriptionJson: toDescriptionJson("Primary project context output path."),
    guidanceJson: toGuidanceJson(
      "Derived from output folder and project-context filename.",
      "Default the output artifact path to the project knowledge folder plus project-context.md.",
    ),
    defaultValueJson: "{{project_knowledge_path}}/project-context.md",
    validationJson: {
      rules: [
        {
          kind: "path",
          path: {
            pathKind: "file",
            normalization: { mode: "posix", trimWhitespace: true },
            safety: { disallowAbsolute: true, preventTraversal: true },
          },
        },
        { kind: "under-root", underRoot: { rootFactKey: "projectRootPath" } },
      ],
    },
  },
];

export const setupWorkflowSeedRows: readonly MethodologyWorkflowSeedRow[] =
  setupMapping.workflows.map((workflow) => ({
    id: workflowIdFor(workflow.key),
    methodologyVersionId: setupMapping.methodologyVersionId,
    workUnitTypeId,
    key: workflow.key,
    displayName: workflow.displayName,
    metadataJson: workflow.metadataJson,
    guidanceJson: toGuidanceJson(workflow.guidanceJson),
    inputContractJson: workflow.inputContractJson,
    outputContractJson: workflow.outputContractJson,
  }));

export const setupWorkflowStepSeedRows: readonly MethodologyWorkflowStepSeedRow[] =
  setupMapping.workflows.flatMap((workflow) =>
    workflow.steps.map((step) => ({
      id: workflowStepIdFor(workflow.key, step.id),
      methodologyVersionId: setupMapping.methodologyVersionId,
      workflowId: workflowIdFor(workflow.key),
      key: step.id,
      type: step.type,
      displayName: step.displayName,
      configJson: step.configJson,
      guidanceJson: toGuidanceJson(step.guidanceJson),
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
        workflowId: workflowIdFor(workflow.key),
        fromStepId: workflowStepIdFor(workflow.key, from.id),
        toStepId: workflowStepIdFor(workflow.key, to.id),
        edgeKey: `${from.id}->${to.id}`,
        conditionJson: null,
        guidanceJson: toGuidanceJson(
          `## Purpose\nTraverse from ${from.id} to ${to.id} within ${workflow.key}.`,
          `Follow the seeded workflow edge from ${from.id} to ${to.id} when the step sequence advances.`,
        ),
      });
    }
    return edges;
  });

export const setupTransitionWorkflowBindingSeedRows: readonly MethodologyTransitionWorkflowBindingSeedRow[] =
  setupMapping.workflows.map((workflow) => ({
    id: `seed:binding:wu.project_context:absent_done:${workflow.key}`,
    methodologyVersionId: setupMapping.methodologyVersionId,
    transitionId: setupTransitionId,
    workflowId: workflowIdFor(workflow.key),
    guidanceJson: toGuidanceJson(
      `## Purpose\nAllow workflow ${workflow.key} for the canonical project-context transition.`,
      `Bind workflow ${workflow.key} to the __absent__->done transition for WU.PROJECT_CONTEXT.`,
    ),
  }));

export const setupSeedMetadata = {
  methodologyVersionId: setupMapping.methodologyVersionId,
  workUnitKey: setupMapping.workUnit.key,
  workflowKeys: setupMapping.workflows.map((workflow) => workflow.key),
  sourceRefs: [
    "_bmad/_config/workflow-manifest.csv",
    "_bmad/_config/agent-manifest.csv",
    "docs/architecture/project-context-only-bmad-mapping-draft.md",
  ],
} as const;
