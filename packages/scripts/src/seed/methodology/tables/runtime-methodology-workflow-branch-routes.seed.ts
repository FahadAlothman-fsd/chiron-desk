import { schema } from "@chiron/db";

import { runtimeWorkflowFixtureBundles } from "./runtime-workflow-fixtures.shared";

export type RuntimeMethodologyWorkflowBranchRouteSeedRow =
  typeof schema.methodologyWorkflowBranchRoutes.$inferInsert;

export const runtimeMethodologyWorkflowBranchRouteSeedRows: readonly RuntimeMethodologyWorkflowBranchRouteSeedRow[] =
  runtimeWorkflowFixtureBundles.flatMap((bundle) =>
    "methodologyWorkflowBranchRoutes" in bundle ? bundle.methodologyWorkflowBranchRoutes : [],
  );
