import { schema } from "@chiron/db";

import { runtimeWorkflowFixtureBundles } from "./runtime-workflow-fixtures.shared";

export type RuntimeMethodologyWorkflowAgentStepWriteItemSeedRow =
  typeof schema.methodologyWorkflowAgentStepWriteItems.$inferInsert;

export const runtimeMethodologyWorkflowAgentStepWriteItemSeedRows: readonly RuntimeMethodologyWorkflowAgentStepWriteItemSeedRow[] =
  runtimeWorkflowFixtureBundles.flatMap((bundle) => bundle.methodologyWorkflowAgentStepWriteItems);
