import assert from "node:assert/strict";
import test from "node:test";

import {
  createDraftFromProjection,
  mapValidationDiagnosticsToWorkspaceDiagnostics,
  parseWorkspaceDraftForPersistence,
  toDeterministicJson,
  type DraftProjectionShape,
  type MethodologyVersionWorkspaceDraft,
} from "./version-workspace";

test("createDraftFromProjection derives fact-schema and workflow-step editors", () => {
  const projection: DraftProjectionShape = {
    displayName: "BMAD Draft",
    workUnitTypes: [
      {
        key: "WU.PRD",
        cardinality: "one_per_project",
        lifecycleStates: [{ key: "draft" }],
        lifecycleTransitions: [],
        factSchemas: [{ key: "goal", factType: "string", required: true }],
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
      "WU.PRD": [{ key: "goal", factType: "string", required: true }],
    }),
  );
  assert.equal(
    draft.workflowStepsJson,
    toDeterministicJson({
      "wf.prd.form": [{ key: "s1", type: "form" }],
    }),
  );
});

test("parseWorkspaceDraftForPersistence merges fact schemas and workflow steps", () => {
  const draft: MethodologyVersionWorkspaceDraft = {
    methodologyKey: "bmad.v1",
    displayName: "BMAD Draft",
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
      "WU.PRD": [{ key: "goal", factType: "string", required: true }],
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

test("parseWorkspaceDraftForPersistence reports field-level parse diagnostics", () => {
  const draft: MethodologyVersionWorkspaceDraft = {
    methodologyKey: "bmad.v1",
    displayName: "BMAD Draft",
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
            gateClass: "completion_gate",
            requiredLinks: [],
          },
        ],
        factSchemas: [{ key: "goal", factType: "string", required: true }],
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
