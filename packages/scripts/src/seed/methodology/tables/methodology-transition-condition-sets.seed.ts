import { schema } from "@chiron/db";

import {
  architectureTransitionConditionSetSeedRows,
  brainstormingTransitionConditionSetSeedRows,
  implementationTransitionConditionSetSeedRows,
  prdTransitionConditionSetSeedRows,
  productBriefTransitionConditionSetSeedRows,
  researchTransitionConditionSetSeedRows,
  setupTransitionConditionSetSeedRows,
  uxDesignTransitionConditionSetSeedRows,
} from "../setup/setup-bmad-mapping";

export type MethodologyTransitionConditionSetSeedRow =
  typeof schema.transitionConditionSets.$inferInsert;

export const methodologyTransitionConditionSetSeedRows: readonly MethodologyTransitionConditionSetSeedRow[] =
  [
    ...setupTransitionConditionSetSeedRows,
    ...brainstormingTransitionConditionSetSeedRows,
    ...researchTransitionConditionSetSeedRows,
    ...productBriefTransitionConditionSetSeedRows,
    ...prdTransitionConditionSetSeedRows,
    ...implementationTransitionConditionSetSeedRows,
    ...uxDesignTransitionConditionSetSeedRows,
    ...architectureTransitionConditionSetSeedRows,
  ];
