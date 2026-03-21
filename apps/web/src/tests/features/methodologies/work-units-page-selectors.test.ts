import assert from "node:assert/strict";
import { test } from "vitest";

import {
  deriveActiveWorkUnit,
  deriveWorkUnitsPageRows,
} from "../../../features/methodologies/work-units-page-selectors";

const DRAFT_PROJECTION = {
  workUnitTypes: [
    {
      key: "WU.INTAKE",
      displayName: "Intake",
      lifecycleTransitions: [{ transitionKey: "submit" }, { transitionKey: "clarify" }],
      factSchemas: [{ key: "fact.owner" }, { key: "fact.link" }],
      relationships: [{ targetWorkUnitTypeKey: "WU.VALIDATION", linkTypeKey: "depends_on" }],
    },
    {
      key: "WU.VALIDATION",
      displayName: "Validation",
      lifecycleTransitions: [{ transitionKey: "approve" }],
      factSchemas: [{ key: "fact.result" }],
      relationships: [],
    },
  ],
  workflows: [
    { key: "wf.intake.review", workUnitTypeKey: "WU.INTAKE" },
    { key: "wf.validation.qa", workUnitTypeKey: "WU.VALIDATION" },
    { key: "wf.validation.publish", workUnitTypeKey: "WU.VALIDATION" },
  ],
} as const;

test("deriveWorkUnitsPageRows returns deterministic L1 work-unit summaries", () => {
  const rows = deriveWorkUnitsPageRows(DRAFT_PROJECTION);

  assert.deepEqual(rows, [
    {
      key: "WU.INTAKE",
      displayName: "Intake",
      description: "",
      cardinality: "many_per_project",
      humanGuidance: "",
      agentGuidance: "",
      transitionCount: 2,
      workflowCount: 1,
      factCount: 2,
      relationshipCount: 1,
    },
    {
      key: "WU.VALIDATION",
      displayName: "Validation",
      description: "",
      cardinality: "many_per_project",
      humanGuidance: "",
      agentGuidance: "",
      transitionCount: 1,
      workflowCount: 2,
      factCount: 1,
      relationshipCount: 0,
    },
  ]);
});

test("deriveActiveWorkUnit picks explicit selection or falls back to first row", () => {
  const rows = deriveWorkUnitsPageRows(DRAFT_PROJECTION);

  assert.equal(deriveActiveWorkUnit(rows, "WU.VALIDATION")?.key, "WU.VALIDATION");
  assert.equal(deriveActiveWorkUnit(rows, "WU.MISSING")?.key, "WU.INTAKE");
  assert.equal(deriveActiveWorkUnit([], undefined), null);
});
