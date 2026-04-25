import { schema } from "@chiron/db";

import {
  architectureLifecycleStateSeedRows,
  brainstormingLifecycleStateSeedRows,
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
  ...uxDesignLifecycleStateSeedRows,
  ...architectureLifecycleStateSeedRows,
];
