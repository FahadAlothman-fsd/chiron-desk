import { runtimeWorkflowFixtureBundles } from "./runtime-workflow-fixtures.shared";

export const runtimeMethodologyWorkflowMetadataPatches = runtimeWorkflowFixtureBundles.flatMap(
  (bundle) =>
    bundle.workflowMetadataPatches ??
    (bundle.workflowMetadataPatch ? [bundle.workflowMetadataPatch] : []),
);
