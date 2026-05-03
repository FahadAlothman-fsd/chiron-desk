import { schema } from "@chiron/db";

import {
  architectureLifecycleTransitionSeedRows,
  brainstormingLifecycleTransitionSeedRows,
  implementationLifecycleTransitionSeedRows,
  prdLifecycleTransitionSeedRows,
  productBriefLifecycleTransitionSeedRows,
  researchLifecycleTransitionSeedRows,
  setupLifecycleTransitionSeedRows,
  uxDesignLifecycleTransitionSeedRows,
} from "../setup/setup-bmad-mapping";

export type MethodologyLifecycleTransitionSeedRow =
  typeof schema.workUnitLifecycleTransitions.$inferInsert;

export const methodologyLifecycleTransitionSeedRows: readonly MethodologyLifecycleTransitionSeedRow[] =
  [
    ...setupLifecycleTransitionSeedRows,
    ...brainstormingLifecycleTransitionSeedRows,
    ...researchLifecycleTransitionSeedRows,
    ...productBriefLifecycleTransitionSeedRows,
    ...prdLifecycleTransitionSeedRows,
    ...implementationLifecycleTransitionSeedRows,
    ...uxDesignLifecycleTransitionSeedRows,
    ...architectureLifecycleTransitionSeedRows,
  ];
