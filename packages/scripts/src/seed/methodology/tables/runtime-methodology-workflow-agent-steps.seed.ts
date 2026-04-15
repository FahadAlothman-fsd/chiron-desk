import { schema } from "@chiron/db";

import { runtimeWorkflowFixtureBundles } from "./runtime-workflow-fixtures.shared";

export type RuntimeMethodologyWorkflowAgentStepSeedRow =
  typeof schema.methodologyWorkflowAgentSteps.$inferInsert;

export const runtimeMethodologyWorkflowAgentStepSeedRows: readonly RuntimeMethodologyWorkflowAgentStepSeedRow[] =
  runtimeWorkflowFixtureBundles.flatMap((bundle) => bundle.methodologyWorkflowAgentSteps);
