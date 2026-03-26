import { schema } from "@chiron/db";

import {
  brainstormingTransitionWorkflowBindingSeedRows,
  researchTransitionWorkflowBindingSeedRows,
  setupTransitionWorkflowBindingSeedRows,
} from "../setup/setup-bmad-mapping";

export type MethodologyTransitionWorkflowBindingSeedRow =
  typeof schema.methodologyTransitionWorkflowBindings.$inferInsert;

export const methodologyTransitionWorkflowBindingSeedRows: readonly MethodologyTransitionWorkflowBindingSeedRow[] =
  [
    ...setupTransitionWorkflowBindingSeedRows,
    ...brainstormingTransitionWorkflowBindingSeedRows,
    ...researchTransitionWorkflowBindingSeedRows,
  ];
