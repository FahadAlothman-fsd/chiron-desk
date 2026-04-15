import { schema } from "@chiron/db";

import { runtimeWorkflowFixtureBundles } from "./runtime-workflow-fixtures.shared";

export type RuntimeMethodologyWorkflowContextFactPlainValueSeedRow =
  typeof schema.methodologyWorkflowContextFactPlainValues.$inferInsert;

export const runtimeMethodologyWorkflowContextFactPlainValueSeedRows: readonly RuntimeMethodologyWorkflowContextFactPlainValueSeedRow[] =
  runtimeWorkflowFixtureBundles.flatMap(
    (bundle) => bundle.methodologyWorkflowContextFactPlainValues,
  );
