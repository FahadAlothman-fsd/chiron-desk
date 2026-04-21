import assert from "node:assert/strict";
import { test } from "vitest";

import {
  createDraftFromProjection,
  mapValidationDiagnosticsToWorkspaceDiagnostics,
  parseWorkspaceDraftForPersistence,
  toDeterministicJson,
  type DraftProjectionShape,
  type MethodologyVersionWorkspaceDraft,
} from "../../../features/methodologies/version-workspace";

test("toDeterministicJson canonicalizes object keys recursively", () => {
  const rendered = toDeterministicJson({
    z: 1,
    a: {
      d: 4,
      c: 3,
    },
    b: [{ y: 2, x: 1 }],
  });

  assert.equal(
    rendered,
    [
      "{",
      '  "a": {',
      '    "c": 3,',
      '    "d": 4',
      "  },",
      '  "b": [',
      "    {",
      '      "x": 1,',
      '      "y": 2',
      "    }",
      "  ],",
      '  "z": 1',
      "}",
    ].join("\n"),
  );
});

test("createDraftFromProjection derives fact-schema and workflow-step editors", () => {
  const projection: DraftProjectionShape = {
    displayName: "BMAD Draft",
    workUnitTypes: [
      {
        key: "WU.PRD",
        cardinality: "one_per_project",
        lifecycleStates: [{ key: "draft" }],
        lifecycleTransitions: [],
        factSchemas: [{ key: "goal", valueType: "string", required: true }],
      },
    ],
    agentTypes: [],
    transitions: [{ key: "start" }],
    workflows: [
      {
        key: "wf.prd.form",
        workUnitTypeKey: "WU.PRD",
        steps: [{ key: "s1", type: "form" }],
        edges: [{ fromStepKey: null, toStepKey: "s1", edgeKey: "entry" }],
      },
    ],
    transitionWorkflowBindings: { start: ["wf.prd.form"] },
    guidance: {},
  };

  const draft = createDraftFromProjection("bmad.v1", projection);
  assert.equal(draft.methodologyKey, "bmad.v1");
  assert.equal(draft.displayName, "BMAD Draft");
  assert.equal(
    draft.factSchemasJson,
    toDeterministicJson({
      "WU.PRD": [{ key: "goal", valueType: "string", required: true }],
    }),
  );
  assert.equal(
    draft.workflowStepsJson,
    toDeterministicJson({
      "wf.prd.form": [{ key: "s1", type: "form" }],
    }),
  );
  assert.match(draft.workUnitTypesJson, /"workflows"/);
});

test("parseWorkspaceDraftForPersistence merges fact schemas and workflow steps", () => {
  const draft: MethodologyVersionWorkspaceDraft = {
    methodologyKey: "bmad.v1",
    displayName: "BMAD Draft",
    factDefinitionsJson: toDeterministicJson([]),
    workUnitTypesJson: toDeterministicJson([
      {
        key: "WU.PRD",
        cardinality: "one_per_project",
        lifecycleStates: [{ key: "draft" }],
        lifecycleTransitions: [],
        factSchemas: [],
      },
    ]),
    factSchemasJson: toDeterministicJson({
      "WU.PRD": [{ key: "goal", valueType: "string", required: true }],
    }),
    transitionsJson: toDeterministicJson([{ key: "start" }]),
    workflowsJson: toDeterministicJson([
      {
        key: "wf.prd.form",
        workUnitTypeKey: "WU.PRD",
        steps: [],
        edges: [{ fromStepKey: null, toStepKey: "s1", edgeKey: "entry" }],
      },
    ]),
    workflowStepsJson: toDeterministicJson({
      "wf.prd.form": [{ key: "s1", type: "form" }],
    }),
    transitionWorkflowBindingsJson: toDeterministicJson({ start: ["wf.prd.form"] }),
    agentTypesJson: toDeterministicJson([]),
    guidanceJson: toDeterministicJson({}),
  };

  const parsed = parseWorkspaceDraftForPersistence(draft);
  const workUnit = parsed.lifecycle.workUnitTypes[0] as { factSchemas?: unknown[] } | undefined;
  const workflow = parsed.workflows.workflows[0] as { steps?: unknown[] } | undefined;

  assert.equal(parsed.diagnostics.length, 0);
  assert.equal(workUnit?.factSchemas?.length, 1);
  assert.equal(workflow?.steps?.length, 1);
});

test("parseWorkspaceDraftForPersistence prefers canonical nested work-unit lifecycle data over split editors", () => {
  const draft: MethodologyVersionWorkspaceDraft = {
    methodologyKey: "bmad.v1",
    displayName: "BMAD Draft",
    factDefinitionsJson: toDeterministicJson([]),
    workUnitTypesJson: toDeterministicJson([
      {
        key: "WU.PRD",
        cardinality: "one_per_project",
        lifecycleStates: [{ key: "draft" }, { key: "done" }],
        lifecycleTransitions: [
          {
            transitionKey: "WU.PRD:draft__to__done",
            fromState: "draft",
            toState: "done",
            conditionSets: [{ key: "gate.complete", phase: "completion", mode: "all", groups: [] }],
          },
        ],
        factSchemas: [{ key: "goal", valueType: "string", required: true }],
      },
    ]),
    factSchemasJson: toDeterministicJson({
      "WU.PRD": [{ key: "wrong", valueType: "string", required: false }],
    }),
    transitionsJson: toDeterministicJson([
      {
        workUnitTypeKey: "WU.PRD",
        transitionKey: "WRONG",
        toState: "draft",
      },
    ]),
    workflowsJson: toDeterministicJson([]),
    workflowStepsJson: toDeterministicJson({}),
    transitionWorkflowBindingsJson: toDeterministicJson({}),
    agentTypesJson: toDeterministicJson([]),
    guidanceJson: toDeterministicJson({}),
  };

  const parsed = parseWorkspaceDraftForPersistence(draft);
  const workUnit = parsed.lifecycle.workUnitTypes[0] as
    | {
        factSchemas?: Array<{ key?: string }>;
        lifecycleTransitions?: Array<{ transitionKey?: string }>;
      }
    | undefined;

  assert.equal(parsed.diagnostics.length, 0);
  assert.equal(workUnit?.factSchemas?.[0]?.key, "goal");
  assert.equal(workUnit?.lifecycleTransitions?.[0]?.transitionKey, "WU.PRD:draft__to__done");
});

test("parseWorkspaceDraftForPersistence prefers canonical nested workflows and allowedWorkflowKeys over split mirrors", () => {
  const draft: MethodologyVersionWorkspaceDraft = {
    methodologyKey: "bmad.v1",
    displayName: "BMAD Draft",
    factDefinitionsJson: toDeterministicJson([]),
    workUnitTypesJson: toDeterministicJson([
      {
        key: "WU.PRD",
        cardinality: "one_per_project",
        lifecycleStates: [{ key: "draft" }, { key: "done" }],
        lifecycleTransitions: [
          {
            transitionKey: "WU.PRD:draft__to__done",
            fromState: "draft",
            toState: "done",
            conditionSets: [],
            allowedWorkflowKeys: ["wf.canonical"],
          },
        ],
        factSchemas: [],
        workflows: [
          {
            key: "wf.canonical",
            displayName: "Canonical Workflow",
            steps: [{ key: "s1", type: "form" }],
            edges: [{ fromStepKey: null, toStepKey: "s1", edgeKey: "entry" }],
          },
        ],
      },
    ]),
    factSchemasJson: toDeterministicJson({}),
    transitionsJson: toDeterministicJson([]),
    workflowsJson: toDeterministicJson([
      {
        key: "wf.wrong",
        workUnitTypeKey: "WU.PRD",
        steps: [],
        edges: [],
      },
    ]),
    workflowStepsJson: toDeterministicJson({
      "wf.wrong": [{ key: "wrong", type: "display" }],
    }),
    transitionWorkflowBindingsJson: toDeterministicJson({
      "WU.PRD:draft__to__done": ["wf.wrong"],
    }),
    agentTypesJson: toDeterministicJson([]),
    guidanceJson: toDeterministicJson({}),
  };

  const parsed = parseWorkspaceDraftForPersistence(draft);
  const workflow = parsed.workflows.workflows[0] as
    | { key?: string; steps?: Array<{ key?: string }> }
    | undefined;

  assert.equal(parsed.diagnostics.length, 0);
  assert.equal(workflow?.key, "wf.canonical");
  assert.equal(workflow?.steps?.[0]?.key, "s1");
  assert.deepEqual(parsed.workflows.transitionWorkflowBindings, {
    "WU.PRD:draft__to__done": ["wf.canonical"],
  });
});

test("parseWorkspaceDraftForPersistence reports field-level parse diagnostics", () => {
  const draft: MethodologyVersionWorkspaceDraft = {
    methodologyKey: "bmad.v1",
    displayName: "BMAD Draft",
    factDefinitionsJson: toDeterministicJson([]),
    workUnitTypesJson: "{",
    factSchemasJson: toDeterministicJson({}),
    transitionsJson: toDeterministicJson([]),
    workflowsJson: toDeterministicJson([]),
    workflowStepsJson: toDeterministicJson({}),
    transitionWorkflowBindingsJson: toDeterministicJson({}),
    agentTypesJson: toDeterministicJson([]),
    guidanceJson: toDeterministicJson({}),
  };

  const parsed = parseWorkspaceDraftForPersistence(draft);
  assert.equal(parsed.diagnostics.length > 0, true);
  assert.equal(parsed.diagnostics[0]?.field, "workUnitTypesJson");
});

test("workspace edits persist and rebuild deterministic draft state after reload", () => {
  const projection: DraftProjectionShape = {
    displayName: "BMAD Draft",
    workUnitTypes: [
      {
        key: "WU.PRD",
        cardinality: "one_per_project",
        lifecycleStates: [{ key: "draft" }, { key: "done" }],
        lifecycleTransitions: [
          {
            transitionKey: "WU.PRD:draft__to__done",
            toState: "done",
            requiredLinks: [],
          },
        ],
        factSchemas: [{ key: "goal", valueType: "string", required: true }],
      },
    ],
    agentTypes: [],
    transitions: [],
    workflows: [
      {
        key: "wf.prd.form",
        workUnitTypeKey: "WU.PRD",
        steps: [{ key: "s1", type: "form" }],
        edges: [{ fromStepKey: null, toStepKey: "s1", edgeKey: "entry" }],
      },
    ],
    transitionWorkflowBindings: { "WU.PRD:draft__to__done": ["wf.prd.form"] },
    guidance: {},
  };

  const editedDraft = {
    ...createDraftFromProjection("bmad.v1", projection),
    displayName: "BMAD Draft Updated",
  };

  const persisted = parseWorkspaceDraftForPersistence(editedDraft);
  assert.equal(persisted.diagnostics.length, 0);

  const reloadedDraft = createDraftFromProjection("bmad.v1", {
    displayName: editedDraft.displayName,
    workUnitTypes: persisted.lifecycle.workUnitTypes,
    agentTypes: persisted.lifecycle.agentTypes,
    transitions: [],
    workflows: persisted.workflows.workflows,
    transitionWorkflowBindings: persisted.workflows.transitionWorkflowBindings,
    guidance: persisted.workflows.guidance,
  });

  assert.equal(reloadedDraft.displayName, "BMAD Draft Updated");
  assert.equal(reloadedDraft.workflowsJson, editedDraft.workflowsJson);
  assert.equal(reloadedDraft.workflowStepsJson, editedDraft.workflowStepsJson);
  assert.equal(
    reloadedDraft.transitionWorkflowBindingsJson,
    editedDraft.transitionWorkflowBindingsJson,
  );
});

test("mapValidationDiagnosticsToWorkspaceDiagnostics groups and focuses diagnostics deterministically", () => {
  const mapped = mapValidationDiagnosticsToWorkspaceDiagnostics([
    {
      code: "WF_STEP_TYPE_INVALID",
      scope: "definition.workflows.wf.prd.form.steps.step_1.type",
      required: "form|agent|action|invoke|branch|display",
      observed: "custom",
      remediation: "Use one of the allowed step types.",
    },
    {
      code: "LIFECYCLE_TO_STATE_UNKNOWN",
      scope: "workUnitTypes[0].lifecycleTransitions[0].toState",
      required: "existing lifecycle state",
      observed: "done",
      remediation: "Add state or change transition target.",
    },
    {
      code: "BINDING_WORKFLOW_UNKNOWN",
      scope: "definition.transitionWorkflowBindings.WU.PRD:draft__to__done.wf.unknown",
      required: "existing workflow key",
      observed: "wf.unknown",
      remediation: "Bind to known workflow key.",
    },
  ]);

  assert.equal(mapped.length, 3);

  const bindingDiagnostic = mapped.find((diagnostic) =>
    diagnostic.message.startsWith("BINDING_WORKFLOW_UNKNOWN"),
  );
  const transitionDiagnostic = mapped.find((diagnostic) =>
    diagnostic.message.startsWith("LIFECYCLE_TO_STATE_UNKNOWN"),
  );
  const workflowDiagnostic = mapped.find((diagnostic) =>
    diagnostic.message.startsWith("WF_STEP_TYPE_INVALID"),
  );

  assert.equal(bindingDiagnostic?.group, "transition");
  assert.equal(bindingDiagnostic?.field, "transitionWorkflowBindingsJson");
  assert.equal(transitionDiagnostic?.group, "transition");
  assert.equal(transitionDiagnostic?.field, "transitionsJson");
  assert.equal(workflowDiagnostic?.group, "workflow");
  assert.equal(workflowDiagnostic?.field, "workflowStepsJson");
  assert.equal(workflowDiagnostic?.focusTarget?.level, "L3");
  assert.equal(workflowDiagnostic?.focusTarget?.nodeId, "wf:wf.prd.form");
});
