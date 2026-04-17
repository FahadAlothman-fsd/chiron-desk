import { schema } from "@chiron/db";

import { runtimeWorkflowFixtureBundles } from "./runtime-workflow-fixtures.shared";

export type RuntimeMethodologyWorkflowBranchRouteGroupSeedRow =
  typeof schema.methodologyWorkflowBranchRouteGroups.$inferInsert;

export const runtimeMethodologyWorkflowBranchRouteGroupSeedRows: readonly RuntimeMethodologyWorkflowBranchRouteGroupSeedRow[] =
  runtimeWorkflowFixtureBundles.flatMap((bundle) =>
    "methodologyWorkflowBranchRouteGroups" in bundle
      ? bundle.methodologyWorkflowBranchRouteGroups
      : [],
  );
