import { schema } from "@chiron/db";

import { runtimeWorkflowFixtureBundles } from "./runtime-workflow-fixtures.shared";

export type RuntimeMethodologyWorkflowActionStepActionSeedRow =
  typeof schema.methodologyWorkflowActionStepActions.$inferInsert;

export const runtimeMethodologyWorkflowActionStepActionSeedRows: readonly RuntimeMethodologyWorkflowActionStepActionSeedRow[] =
  runtimeWorkflowFixtureBundles.flatMap((bundle) =>
    "methodologyWorkflowActionStepActions" in bundle
      ? bundle.methodologyWorkflowActionStepActions
      : [],
  );
