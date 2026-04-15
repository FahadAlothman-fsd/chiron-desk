import { schema } from "@chiron/db";

import { runtimeWorkflowFixtureBundles } from "./runtime-workflow-fixtures.shared";

export type RuntimeMethodologyWorkflowContextFactDefinitionSeedRow =
  typeof schema.methodologyWorkflowContextFactDefinitions.$inferInsert;

export const runtimeMethodologyWorkflowContextFactDefinitionSeedRows: readonly RuntimeMethodologyWorkflowContextFactDefinitionSeedRow[] =
  runtimeWorkflowFixtureBundles.flatMap(
    (bundle) => bundle.methodologyWorkflowContextFactDefinitions,
  );
