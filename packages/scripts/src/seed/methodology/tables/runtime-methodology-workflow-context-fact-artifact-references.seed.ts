import { schema } from "@chiron/db";

import { runtimeWorkflowFixtureBundles } from "./runtime-workflow-fixtures.shared";

export type RuntimeMethodologyWorkflowContextFactArtifactReferenceSeedRow =
  typeof schema.methodologyWorkflowContextFactArtifactReferences.$inferInsert;

export const runtimeMethodologyWorkflowContextFactArtifactReferenceSeedRows: readonly RuntimeMethodologyWorkflowContextFactArtifactReferenceSeedRow[] =
  runtimeWorkflowFixtureBundles.flatMap(
    (bundle) => bundle.methodologyWorkflowContextFactArtifactReferences,
  );
