import { schema } from "@chiron/db";

import { runtimeWorkflowFixtureBundles } from "./runtime-workflow-fixtures.shared";

export type RuntimeMethodologyWorkflowFormFieldSeedRow =
  typeof schema.methodologyWorkflowFormFields.$inferInsert;

export const runtimeMethodologyWorkflowFormFieldSeedRows: readonly RuntimeMethodologyWorkflowFormFieldSeedRow[] =
  runtimeWorkflowFixtureBundles.flatMap((bundle) => bundle.methodologyWorkflowFormFields);
