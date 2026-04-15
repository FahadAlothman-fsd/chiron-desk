import { schema } from "@chiron/db";

import { runtimeWorkflowFixtureBundles } from "./runtime-workflow-fixtures.shared";

export type RuntimeMethodologyWorkflowContextFactWorkflowReferenceSeedRow =
  typeof schema.methodologyWorkflowContextFactWorkflowReferences.$inferInsert;

export const runtimeMethodologyWorkflowContextFactWorkflowReferenceSeedRows: readonly RuntimeMethodologyWorkflowContextFactWorkflowReferenceSeedRow[] =
  runtimeWorkflowFixtureBundles.flatMap(
    (bundle) => bundle.methodologyWorkflowContextFactWorkflowReferences,
  );
