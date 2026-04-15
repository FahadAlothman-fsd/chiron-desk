import { schema } from "@chiron/db";

import { runtimeWorkflowFixtureBundles } from "./runtime-workflow-fixtures.shared";

export type RuntimeMethodologyWorkflowStepSeedRow =
  typeof schema.methodologyWorkflowSteps.$inferInsert;

export const runtimeMethodologyWorkflowStepSeedRows: readonly RuntimeMethodologyWorkflowStepSeedRow[] =
  runtimeWorkflowFixtureBundles.flatMap((bundle) => bundle.methodology_workflow_steps);
