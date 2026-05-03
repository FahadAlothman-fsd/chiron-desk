import { schema } from "@chiron/db";

import {
  architectureLifecycleStateSeedRows,
  brainstormingLifecycleStateSeedRows,
  implementationLifecycleStateSeedRows,
  prdLifecycleStateSeedRows,
  productBriefLifecycleStateSeedRows,
  researchLifecycleStateSeedRows,
  setupLifecycleStateSeedRows,
  uxDesignLifecycleStateSeedRows,
} from "../setup/setup-bmad-mapping";

export type MethodologyLifecycleStateSeedRow = typeof schema.workUnitLifecycleStates.$inferInsert;

export const methodologyLifecycleStateSeedRows: readonly MethodologyLifecycleStateSeedRow[] = [
  ...setupLifecycleStateSeedRows,
  ...brainstormingLifecycleStateSeedRows,
  ...researchLifecycleStateSeedRows,
  ...productBriefLifecycleStateSeedRows,
  ...prdLifecycleStateSeedRows,
  ...implementationLifecycleStateSeedRows,
  ...uxDesignLifecycleStateSeedRows,
  ...architectureLifecycleStateSeedRows,
];
