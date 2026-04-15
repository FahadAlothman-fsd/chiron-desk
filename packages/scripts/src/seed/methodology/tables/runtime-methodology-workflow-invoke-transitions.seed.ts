import { schema } from "@chiron/db";

import { runtimeWorkflowFixtureBundles } from "./runtime-workflow-fixtures.shared";

export type RuntimeMethodologyWorkflowInvokeTransitionSeedRow =
  typeof schema.methodologyWorkflowInvokeTransitions.$inferInsert;

export const runtimeMethodologyWorkflowInvokeTransitionSeedRows: readonly RuntimeMethodologyWorkflowInvokeTransitionSeedRow[] =
  runtimeWorkflowFixtureBundles.flatMap((bundle) => bundle.methodologyWorkflowInvokeTransitions);
