import { schema } from "@chiron/db";

import { runtimeWorkflowFixtureBundles } from "./runtime-workflow-fixtures.shared";

export type RuntimeMethodologyWorkflowContextFactDraftSpecFactSeedRow =
  typeof schema.methodologyWorkflowContextFactDraftSpecFields.$inferInsert;

export const runtimeMethodologyWorkflowContextFactDraftSpecFactSeedRows: readonly RuntimeMethodologyWorkflowContextFactDraftSpecFactSeedRow[] =
  runtimeWorkflowFixtureBundles.flatMap(
    (bundle) => bundle.methodologyWorkflowContextFactDraftSpecFacts ?? [],
  );
