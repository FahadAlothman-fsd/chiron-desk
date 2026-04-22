import { brainstormingDemoFixtureSeedRowsAllVersions } from "../setup/brainstorming-demo-fixture";
import { setupInvokePhase1FixtureSeedRowsAllVersions } from "../setup/setup-invoke-phase-1-fixture";

export const runtimeWorkflowFixtureBundles = [
  ...brainstormingDemoFixtureSeedRowsAllVersions,
  ...setupInvokePhase1FixtureSeedRowsAllVersions,
] as const;
