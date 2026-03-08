import { schema } from "@chiron/db";

import { setupTransitionWorkflowBindingSeedRows } from "../setup/setup-bmad-mapping";

export type MethodologyTransitionWorkflowBindingSeedRow =
  typeof schema.methodologyTransitionWorkflowBindings.$inferInsert;

export const methodologyTransitionWorkflowBindingSeedRows: readonly MethodologyTransitionWorkflowBindingSeedRow[] =
  setupTransitionWorkflowBindingSeedRows;
