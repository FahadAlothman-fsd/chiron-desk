import { schema } from "@chiron/db";

import { setupTransitionConditionSetSeedRows } from "../setup/setup-bmad-mapping";

export type MethodologyTransitionConditionSetSeedRow =
  typeof schema.transitionConditionSets.$inferInsert;

export const methodologyTransitionConditionSetSeedRows: readonly MethodologyTransitionConditionSetSeedRow[] =
  setupTransitionConditionSetSeedRows;
