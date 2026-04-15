import { schema } from "@chiron/db";

import { runtimeWorkflowFixtureBundles } from "./runtime-workflow-fixtures.shared";

export type RuntimeMethodologyWorkflowInvokeStepSeedRow =
  typeof schema.methodologyWorkflowInvokeSteps.$inferInsert;

export const runtimeMethodologyWorkflowInvokeStepSeedRows: readonly RuntimeMethodologyWorkflowInvokeStepSeedRow[] =
  runtimeWorkflowFixtureBundles.flatMap((bundle) => bundle.methodologyWorkflowInvokeSteps);
