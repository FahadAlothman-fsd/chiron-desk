import { schema } from "@chiron/db";

import { runtimeWorkflowFixtureBundles } from "./runtime-workflow-fixtures.shared";

export type RuntimeMethodologyWorkflowEdgeSeedRow =
  typeof schema.methodologyWorkflowEdges.$inferInsert;

export const runtimeMethodologyWorkflowEdgeSeedRows: readonly RuntimeMethodologyWorkflowEdgeSeedRow[] =
  runtimeWorkflowFixtureBundles.flatMap((bundle) => bundle.methodology_workflow_edges);
