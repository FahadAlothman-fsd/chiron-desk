import { schema } from "@chiron/db";

import { runtimeWorkflowFixtureBundles } from "./runtime-workflow-fixtures.shared";

export type RuntimeMethodologyWorkflowContextFactDraftSpecSelectionSeedRow =
  typeof schema.methodologyWorkflowContextFactDraftSpecSelections.$inferInsert;

export const runtimeMethodologyWorkflowContextFactDraftSpecSelectionSeedRows: readonly RuntimeMethodologyWorkflowContextFactDraftSpecSelectionSeedRow[] =
  runtimeWorkflowFixtureBundles.flatMap(
    (bundle) => bundle.methodologyWorkflowContextFactDraftSpecSelections,
  );
