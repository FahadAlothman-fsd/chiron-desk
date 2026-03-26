import { schema } from "@chiron/db";

import {
  brainstormingLifecycleStateSeedRows,
  researchLifecycleStateSeedRows,
  setupLifecycleStateSeedRows,
} from "../setup/setup-bmad-mapping";

export type MethodologyLifecycleStateSeedRow = typeof schema.workUnitLifecycleStates.$inferInsert;

export const methodologyLifecycleStateSeedRows: readonly MethodologyLifecycleStateSeedRow[] = [
  ...setupLifecycleStateSeedRows,
  ...brainstormingLifecycleStateSeedRows,
  ...researchLifecycleStateSeedRows,
];
