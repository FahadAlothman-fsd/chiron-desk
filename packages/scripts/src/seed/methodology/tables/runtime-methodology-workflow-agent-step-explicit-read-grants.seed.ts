import { schema } from "@chiron/db";

import { runtimeWorkflowFixtureBundles } from "./runtime-workflow-fixtures.shared";

export type RuntimeMethodologyWorkflowAgentStepExplicitReadGrantSeedRow =
  typeof schema.methodologyWorkflowAgentStepExplicitReadGrants.$inferInsert;

export const runtimeMethodologyWorkflowAgentStepExplicitReadGrantSeedRows: readonly RuntimeMethodologyWorkflowAgentStepExplicitReadGrantSeedRow[] =
  runtimeWorkflowFixtureBundles.flatMap(
    (bundle) => bundle.methodologyWorkflowAgentStepExplicitReadGrants,
  );
