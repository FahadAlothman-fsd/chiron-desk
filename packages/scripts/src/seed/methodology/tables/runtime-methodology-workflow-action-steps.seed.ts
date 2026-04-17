import { schema } from "@chiron/db";

import { runtimeWorkflowFixtureBundles } from "./runtime-workflow-fixtures.shared";

export type RuntimeMethodologyWorkflowActionStepSeedRow =
  typeof schema.methodologyWorkflowActionSteps.$inferInsert;

export const runtimeMethodologyWorkflowActionStepSeedRows: readonly RuntimeMethodologyWorkflowActionStepSeedRow[] =
  runtimeWorkflowFixtureBundles.flatMap((bundle) =>
    "methodologyWorkflowActionSteps" in bundle ? bundle.methodologyWorkflowActionSteps : [],
  );
