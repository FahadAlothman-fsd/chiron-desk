import { schema } from "@chiron/db";

import { runtimeWorkflowFixtureBundles } from "./runtime-workflow-fixtures.shared";

export type RuntimeMethodologyWorkflowInvokeBindingSeedRow =
  typeof schema.methodologyWorkflowInvokeBindings.$inferInsert;

export const runtimeMethodologyWorkflowInvokeBindingSeedRows: readonly RuntimeMethodologyWorkflowInvokeBindingSeedRow[] =
  runtimeWorkflowFixtureBundles.flatMap((bundle) => bundle.methodologyWorkflowInvokeBindings);
