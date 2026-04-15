import { schema } from "@chiron/db";

import { runtimeWorkflowFixtureBundles } from "./runtime-workflow-fixtures.shared";

export type RuntimeMethodologyWorkflowAgentStepWriteItemRequirementSeedRow =
  typeof schema.methodologyWorkflowAgentStepWriteItemRequirements.$inferInsert;

export const runtimeMethodologyWorkflowAgentStepWriteItemRequirementSeedRows: readonly RuntimeMethodologyWorkflowAgentStepWriteItemRequirementSeedRow[] =
  runtimeWorkflowFixtureBundles.flatMap(
    (bundle) => bundle.methodologyWorkflowAgentStepWriteItemRequirements,
  );
