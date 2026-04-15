import { brainstormingDemoFixtureSeedRowsAllVersions } from "../setup/brainstorming-demo-fixture";
import { setupInvokePhase1FixtureSeedRowsAllVersions } from "../setup/setup-invoke-phase-1-fixture";
import { slice1DemoFixtureSeedRowsAllVersions } from "../setup/slice-1-demo-fixture";

export const runtimeWorkflowFixtureBundles = [
  ...slice1DemoFixtureSeedRowsAllVersions,
  ...brainstormingDemoFixtureSeedRowsAllVersions,
  ...setupInvokePhase1FixtureSeedRowsAllVersions,
] as const;
