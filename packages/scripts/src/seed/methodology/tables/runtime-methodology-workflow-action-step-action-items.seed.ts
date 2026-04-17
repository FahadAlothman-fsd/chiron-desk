import { schema } from "@chiron/db";

import { runtimeWorkflowFixtureBundles } from "./runtime-workflow-fixtures.shared";

export type RuntimeMethodologyWorkflowActionStepActionItemSeedRow =
  typeof schema.methodologyWorkflowActionStepActionItems.$inferInsert;

export const runtimeMethodologyWorkflowActionStepActionItemSeedRows: readonly RuntimeMethodologyWorkflowActionStepActionItemSeedRow[] =
  runtimeWorkflowFixtureBundles.flatMap((bundle) =>
    "methodologyWorkflowActionStepActionItems" in bundle
      ? bundle.methodologyWorkflowActionStepActionItems
      : [],
  );
