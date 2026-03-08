import { schema } from "@chiron/db";

import { setupWorkflowStepSeedRows } from "../setup/setup-bmad-mapping";

export type MethodologyWorkflowStepSeedRow = typeof schema.methodologyWorkflowSteps.$inferInsert;

export const methodologyWorkflowStepSeedRows: readonly MethodologyWorkflowStepSeedRow[] =
  setupWorkflowStepSeedRows;
