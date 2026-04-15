import { schema } from "@chiron/db";

import { runtimeWorkflowFixtureBundles } from "./runtime-workflow-fixtures.shared";

export type RuntimeMethodologyWorkflowContextFactExternalBindingSeedRow =
  typeof schema.methodologyWorkflowContextFactExternalBindings.$inferInsert;

export const runtimeMethodologyWorkflowContextFactExternalBindingSeedRows: readonly RuntimeMethodologyWorkflowContextFactExternalBindingSeedRow[] =
  runtimeWorkflowFixtureBundles.flatMap(
    (bundle) => bundle.methodologyWorkflowContextFactExternalBindings,
  );
