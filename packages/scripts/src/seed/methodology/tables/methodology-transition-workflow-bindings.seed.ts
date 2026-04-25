import { schema } from "@chiron/db";

import {
  architectureTransitionWorkflowBindingSeedRows,
  brainstormingTransitionWorkflowBindingSeedRows,
  prdTransitionWorkflowBindingSeedRows,
  productBriefTransitionWorkflowBindingSeedRows,
  researchTransitionWorkflowBindingSeedRows,
  setupTransitionWorkflowBindingSeedRows,
  uxDesignTransitionWorkflowBindingSeedRows,
} from "../setup/setup-bmad-mapping";

export type MethodologyTransitionWorkflowBindingSeedRow =
  typeof schema.methodologyTransitionWorkflowBindings.$inferInsert;

export const methodologyTransitionWorkflowBindingSeedRows: readonly MethodologyTransitionWorkflowBindingSeedRow[] =
  [
    ...setupTransitionWorkflowBindingSeedRows,
    ...brainstormingTransitionWorkflowBindingSeedRows,
    ...researchTransitionWorkflowBindingSeedRows,
    ...productBriefTransitionWorkflowBindingSeedRows,
    ...prdTransitionWorkflowBindingSeedRows,
    ...uxDesignTransitionWorkflowBindingSeedRows,
    ...architectureTransitionWorkflowBindingSeedRows,
  ];
