import { schema } from "@chiron/db";

import { runtimeWorkflowFixtureBundles } from "./runtime-workflow-fixtures.shared";

export type RuntimeMethodologyWorkflowBranchStepSeedRow =
  typeof schema.methodologyWorkflowBranchSteps.$inferInsert;

export const runtimeMethodologyWorkflowBranchStepSeedRows: readonly RuntimeMethodologyWorkflowBranchStepSeedRow[] =
  runtimeWorkflowFixtureBundles.flatMap((bundle) =>
    "methodologyWorkflowBranchSteps" in bundle ? bundle.methodologyWorkflowBranchSteps : [],
  );
