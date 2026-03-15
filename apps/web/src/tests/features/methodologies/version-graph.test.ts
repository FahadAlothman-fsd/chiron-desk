import assert from "node:assert/strict";
import { test } from "vitest";

import {
  breadcrumbScopes,
  cardinalityBadge,
  filterTransitionEligibleWorkflows,
  projectMethodologyGraph,
  reduceTopologyScope,
  type GraphProjectionInput,
  type GraphScope,
} from "../../../features/methodologies/version-graph";

const GRAPH_INPUT: GraphProjectionInput = {
  workUnitTypes: [
    {
      key: "WU.BRAINSTORMING",
      cardinality: "many_per_project",
      lifecycleStates: [{ key: "draft" }, { key: "active" }, { key: "done" }],
      lifecycleTransitions: [{ transitionKey: "start" }, { transitionKey: "approve" }],
    },
    {
      key: "WU.PRD",
      cardinality: "one_per_project",
      lifecycleStates: [{ key: "draft" }, { key: "approved" }, { key: "done" }],
      lifecycleTransitions: [{ transitionKey: "start" }],
    },
  ],
  workflows: [
    {
      key: "wf.prd.form",
      workUnitTypeKey: "WU.PRD",
      steps: [{ key: "s1", type: "form" }],
      edges: [{ fromStepKey: null, toStepKey: "s1", edgeKey: "entry" }],
    },
    {
      key: "wf.prd.agent",
      workUnitTypeKey: "WU.PRD",
      steps: [{ key: "s1", type: "agent" }],
      edges: [{ fromStepKey: null, toStepKey: "s1", edgeKey: "entry" }],
    },
    {
      key: "wf.brainstorm",
      workUnitTypeKey: "WU.BRAINSTORMING",
      steps: [{ key: "s1", type: "display" }],
      edges: [{ fromStepKey: null, toStepKey: "s1", edgeKey: "entry" }],
    },
  ],
  transitionWorkflowBindings: {
    start: ["wf.prd.form"],
    approve: ["wf.prd.agent"],
  },
};

test("projectMethodologyGraph returns deterministic graph for equal inputs", () => {
  const first = projectMethodologyGraph(GRAPH_INPUT, { level: "L1" });
  const second = projectMethodologyGraph(GRAPH_INPUT, { level: "L1" });

  assert.deepEqual(first.nodes, second.nodes);
  assert.deepEqual(first.edges, second.edges);
});

test("reduceTopologyScope follows deterministic L1 -> L2 -> L3 -> L2 -> L1 flow", () => {
  let scope: GraphScope = { level: "L1" };
  scope = reduceTopologyScope(scope, {
    type: "drill-in-work-unit",
    workUnitTypeKey: "WU.PRD",
  });
  assert.deepEqual(scope, { level: "L2", workUnitTypeKey: "WU.PRD" });

  scope = reduceTopologyScope(scope, {
    type: "drill-in-workflow",
    workflowKey: "wf.prd.form",
  });
  assert.deepEqual(scope, {
    level: "L3",
    workUnitTypeKey: "WU.PRD",
    workflowKey: "wf.prd.form",
  });

  scope = reduceTopologyScope(scope, { type: "drill-up" });
  assert.deepEqual(scope, { level: "L2", workUnitTypeKey: "WU.PRD" });

  scope = reduceTopologyScope(scope, { type: "drill-up" });
  assert.deepEqual(scope, { level: "L1" });

  const breadcrumbs = breadcrumbScopes({
    level: "L3",
    workUnitTypeKey: "WU.PRD",
    workflowKey: "wf.prd.form",
  });
  assert.equal(breadcrumbs.length, 3);
});

test("filterTransitionEligibleWorkflows keeps catalog visibility and transition eligibility separate", () => {
  const eligible = filterTransitionEligibleWorkflows({
    transitionKey: "start",
    workUnitTypeKey: "WU.PRD",
    workflows: GRAPH_INPUT.workflows,
    transitionWorkflowBindings: GRAPH_INPUT.transitionWorkflowBindings,
  });

  assert.deepEqual(
    eligible.map((workflow) => workflow.key),
    ["wf.prd.form"],
  );
});

test("cardinality badge reflects one-per-project and many-per-project policies", () => {
  assert.equal(cardinalityBadge("one_per_project"), "ONE");
  assert.equal(cardinalityBadge("many_per_project"), "MANY");
});

test("seeded-style data appears in L1/L2/L3 scopes without scope leakage", () => {
  const l1 = projectMethodologyGraph(GRAPH_INPUT, { level: "L1" });
  assert.equal(
    l1.nodes.some((node) => node.id.startsWith("wu:")),
    true,
  );
  assert.equal(
    l1.nodes.some((node) => node.id.startsWith("wf:")),
    false,
  );

  const l2 = projectMethodologyGraph(GRAPH_INPUT, {
    level: "L2",
    workUnitTypeKey: "WU.PRD",
  });
  const l2WorkflowNodes = l2.nodes.filter((node) => node.id.startsWith("wf:"));
  assert.equal(
    l2WorkflowNodes.some((node) => node.id === "wf:wf.prd.form"),
    true,
  );
  assert.equal(
    l2WorkflowNodes.some((node) => node.id === "wf:wf.brainstorm"),
    false,
  );

  const l3 = projectMethodologyGraph(GRAPH_INPUT, {
    level: "L3",
    workUnitTypeKey: "WU.PRD",
    workflowKey: "wf.prd.form",
  });
  assert.equal(
    l3.nodes.some((node) => node.id.startsWith("step:")),
    true,
  );
  assert.equal(
    l3.nodes.some((node) => node.id.startsWith("wu:")),
    false,
  );
});

test("L1 work units expose lifecycle states for node state cues", () => {
  const l1 = projectMethodologyGraph(GRAPH_INPUT, { level: "L1" });
  const workUnitNode = l1.nodes.find((node) => node.id === "wu:WU.BRAINSTORMING");

  assert.equal(Boolean(workUnitNode), true);
  assert.deepEqual((workUnitNode?.data as { states?: string[] } | undefined)?.states, [
    "draft",
    "active",
    "done",
  ]);
});

test("L1 transition labels present readable from-state to-state flow", () => {
  const graphWithStateTransition: GraphProjectionInput = {
    ...GRAPH_INPUT,
    workUnitTypes: [
      {
        key: "WU.TEST",
        cardinality: "many_per_project",
        lifecycleStates: [{ key: "draft" }, { key: "ready" }],
        lifecycleTransitions: [
          {
            transitionKey: "draft__to__ready",
            toState: "ready",
          },
        ],
      },
    ],
    workflows: [],
    transitionWorkflowBindings: {},
  };

  const l1 = projectMethodologyGraph(graphWithStateTransition, { level: "L1" });
  const transitionNode = l1.nodes.find((node) => node.id === "transition:WU.TEST:draft__to__ready");

  assert.equal(Boolean(transitionNode), true);
  assert.equal((transitionNode?.data as { label?: string } | undefined)?.label, "draft -> ready");
});
