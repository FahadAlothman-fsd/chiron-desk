import { schema } from "@chiron/db";

import { runtimeWorkflowFixtureBundles } from "./runtime-workflow-fixtures.shared";

export type RuntimeMethodologyWorkflowBranchRouteConditionSeedRow =
  typeof schema.methodologyWorkflowBranchRouteConditions.$inferInsert;

export const runtimeMethodologyWorkflowBranchRouteConditionSeedRows: readonly RuntimeMethodologyWorkflowBranchRouteConditionSeedRow[] =
  runtimeWorkflowFixtureBundles.flatMap((bundle) =>
    "methodologyWorkflowBranchRouteConditions" in bundle
      ? bundle.methodologyWorkflowBranchRouteConditions
      : [],
  );
