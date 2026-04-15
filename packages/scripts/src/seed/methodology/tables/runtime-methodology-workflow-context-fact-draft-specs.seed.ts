import { schema } from "@chiron/db";

import { runtimeWorkflowFixtureBundles } from "./runtime-workflow-fixtures.shared";

export type RuntimeMethodologyWorkflowContextFactDraftSpecSeedRow =
  typeof schema.methodologyWorkflowContextFactDraftSpecs.$inferInsert;

export const runtimeMethodologyWorkflowContextFactDraftSpecSeedRows: readonly RuntimeMethodologyWorkflowContextFactDraftSpecSeedRow[] =
  runtimeWorkflowFixtureBundles.flatMap(
    (bundle) => bundle.methodologyWorkflowContextFactDraftSpecs,
  );
